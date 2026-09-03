// Lead pool for The Floor. Pool lives in Blobs (uploaded by the lead engine).
// GET -> { leads: unclaimed pool (trimmed), mine: my claimed leads with status }
// POST {action:'claim', id}            -> claim a lead (cap on active claims)
// POST {action:'status', id, status}   -> update a claimed lead: called | no-answer | meeting | audit-sold | dead
// POST {action:'release', id}          -> put an untouched lead back in the pool
import { getStore } from '@netlify/blobs';
import { cookieSlug, loadRoster } from './team-auth.mjs';
import { logEvent, tgPing, bumpActivity } from './team-events.mjs';
import { isCompliant } from './team-compliance.mjs';
import { upsertContact, addTags, addNote, createOpportunity, updateOpportunity, STAGE } from './ghl.mjs';

const STATUSES = ['new', 'called', 'no-answer', 'meeting', 'audit-sold', 'dead'];
const MAX_ACTIVE = 25;

const loadPool = async (store) => (await store.get('leads-pool.json', { type: 'json' })) || { ts: 0, leads: [] };
const loadClaims = async (store) => (await store.get('leads-claims.json', { type: 'json' })) || {};

export default async (req) => {
  const slug = cookieSlug(req);
  if (!slug) return Response.json({ error: 'login required' }, { status: 401 });
  const roster = await loadRoster();
  const me = roster.find((r) => r.slug === slug && r.active);
  if (!me) return Response.json({ error: 'login required' }, { status: 401 });
  const store = getStore({ name: 'sales-team', consistency: 'strong' });
  const pool = await loadPool(store);
  const claims = await loadClaims(store);

  if (req.method === 'GET') {
    const unclaimed = pool.leads.filter((l) => !claims[l.id]);
    const mine = pool.leads
      .filter((l) => claims[l.id] && claims[l.id].slug === slug && claims[l.id].status !== 'dead')
      .map((l) => ({ ...l, status: claims[l.id].status, claimedTs: claims[l.id].ts,
        buildAmount: claims[l.id].buildAmount || 0, retainerMonthly: claims[l.id].retainerMonthly || 0, retainerTier: claims[l.id].retainerTier || '' }))
      .sort((a, b) => b.claimedTs - a.claimedTs);
    return Response.json({
      updated: pool.ts,
      total: unclaimed.length,
      leads: unclaimed.slice(0, 120),
      mine,
      cities: [...new Set(pool.leads.map((l) => l.city))],
      niches: [...new Set(pool.leads.map((l) => l.niche))],
    });
  }

  if (req.method !== 'POST') return new Response('nope', { status: 405 });
  // Hard lock: no working leads until onboarding compliance is complete (no-op when the gate is off).
  if (!(await isCompliant(me, roster))) {
    return Response.json({ error: 'Finish your onboarding documents to start working leads.', needsCompliance: true }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const lead = pool.leads.find((l) => l.id === body.id);
  if (!lead) return Response.json({ error: 'lead not found' }, { status: 404 });

  if (body.action === 'claim') {
    if (claims[lead.id]) return Response.json({ error: 'already claimed' }, { status: 409 });
    const active = Object.values(claims).filter((c) => c.slug === slug && ['new', 'called', 'no-answer'].includes(c.status)).length;
    if (active >= MAX_ACTIVE) return Response.json({ error: `work your ${MAX_ACTIVE} open leads first` }, { status: 429 });
    claims[lead.id] = { slug, status: 'new', ts: Date.now() };
    await store.setJSON('leads-claims.json', claims);
    logEvent({ type: 'claim', who: me.name, text: `${me.name} claimed a ${lead.niche} lead in ${lead.city}` }).catch(() => {});
    // Sync into GHL: the lead becomes a real CRM contact the moment it's claimed,
    // owned by the rep, tagged by niche — no one has to open GoHighLevel.
    const cid = await upsertContact({
      name: lead.name, phone: lead.phone,
      tags: [`rep-${slug}`, 'floor-lead', lead.niche ? `niche-${lead.niche}` : null].filter(Boolean),
      source: `The Floor${lead.city ? ' · ' + lead.city : ''}`,
    });
    if (cid) {
      claims[lead.id].ghlId = cid;
      // Open a pipeline opportunity so the rep's whole pipeline shows in GHL, valued as it progresses.
      const oid = await createOpportunity({ name: lead.name, contactId: cid, stageId: STAGE.new, monetaryValue: 0 });
      if (oid) claims[lead.id].oppId = oid;
      await store.setJSON('leads-claims.json', claims);
    }
    return Response.json({ ok: true });
  }

  const c = claims[lead.id];
  if (!c || c.slug !== slug) return Response.json({ error: 'not your lead' }, { status: 403 });

  // Push a CRM event into GHL (best-effort, never blocks the rep). Shared by every action below.
  // opp = { stageId, monetaryValue?, status?, name? } moves the pipeline opportunity too.
  const ghlSync = async (tags, note, opp) => {
    let id = c.ghlId;
    if (!id) { id = await upsertContact({ name: lead.name, phone: lead.phone, tags: [`rep-${slug}`, 'floor-lead'], source: 'The Floor' });
      if (id) { c.ghlId = id; await store.setJSON('leads-claims.json', claims); } }
    if (!id) return;
    // Await every write: serverless tears the function down after the response, so
    // fire-and-forget CRM writes can silently never run. A little latency buys reliability.
    try {
      if (tags && tags.length) await addTags(id, tags);
      if (note) await addNote(id, note);
      if (opp) {
        if (!c.oppId) {
          const oid = await createOpportunity({ name: opp.name || lead.name, contactId: id,
            stageId: opp.stageId, monetaryValue: opp.monetaryValue || 0, status: opp.status || 'open' });
          if (oid) { c.oppId = oid; await store.setJSON('leads-claims.json', claims); }
        } else {
          await updateOpportunity(c.oppId, opp);
        }
      }
    } catch { /* best-effort, never block the rep */ }
  };

  if (body.action === 'release') {
    if (c.status !== 'new') return Response.json({ error: 'only untouched leads release' }, { status: 400 });
    delete claims[lead.id];
    await store.setJSON('leads-claims.json', claims);
    return Response.json({ ok: true });
  }
  if (body.action === 'status') {
    const st = String(body.status || '');
    if (!STATUSES.includes(st)) return Response.json({ error: 'bad status' }, { status: 400 });
    if (c.status === st) return Response.json({ ok: true }); // no-op: no double events or XP
    c.status = st; c.up = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const shouldBump = ['called', 'no-answer', 'meeting', 'audit-sold'].includes(st) && c.bumpDay !== today;
    if (shouldBump) c.bumpDay = today;
    await store.setJSON('leads-claims.json', claims);
    if (shouldBump) await bumpActivity(slug).catch(() => {});
    if (st === 'called' || st === 'no-answer') await ghlSync([], null, { stageId: STAGE.contacted });
    if (st === 'meeting') {
      logEvent({ type: 'meeting', who: me.name, text: `${me.name} booked a meeting with ${lead.name} (${lead.city})` }).catch(() => {});
      await ghlSync(['meeting-booked'], `Meeting booked by ${me.name} via The Floor.`, { stageId: STAGE.meeting });
    }
    if (st === 'audit-sold') {
      logEvent({ type: 'audit', who: me.name, text: `${me.name} SOLD AN AUDIT: ${lead.name} (${lead.city}) \u{1F525}` }).catch(() => {});
      tgPing(`\u{1F4B0} <b>AUDIT SOLD on The Floor</b>\n${me.name} closed ${lead.name} (${lead.niche}, ${lead.city}).\nMake sure payment + onboarding land.`).catch(() => {});
      await ghlSync(['audit-onboarding', `rep-${slug}`], `AUDIT SOLD by ${me.name} via The Floor. Payment + onboarding links to follow.`, { stageId: STAGE.proposal, monetaryValue: 500 });
    }
    if (st === 'dead') await ghlSync(['floor-dead'], `Marked dead by ${me.name} via The Floor.`, { stageId: STAGE.lost, status: 'lost' });
    return Response.json({ ok: true });
  }

  // Close a build: captures the real dollar amount, tags GHL, feeds exact revenue.
  if (body.action === 'build') {
    const amt = Math.round(+body.amount || 0);
    if (amt < 500 || amt > 100000) return Response.json({ error: 'Enter a build amount between 500 and 100000.' }, { status: 400 });
    c.buildAmount = amt; c.buildTs = Date.now();
    await store.setJSON('leads-claims.json', claims);
    logEvent({ type: 'audit', who: me.name, text: `${me.name} CLOSED A BUILD: ${lead.name} — $${amt.toLocaleString()} \u{1F6E0}` }).catch(() => {});
    tgPing(`\u{1F6E0} <b>BUILD CLOSED on The Floor</b>\n${me.name} closed ${lead.name} for <b>$${amt.toLocaleString()}</b>.`).catch(() => {});
    await ghlSync(['build-closed'], `BUILD CLOSED $${amt.toLocaleString()} by ${me.name} via The Floor.`,
      { stageId: STAGE.won, monetaryValue: amt, status: 'won', name: `${lead.name} — Build` });
    return Response.json({ ok: true, buildAmount: amt });
  }

  // Put on retainer: captures the monthly + tier, tags GHL, feeds exact MRR.
  if (body.action === 'retainer') {
    const mo = Math.round(+body.monthly || 0);
    const tier = String(body.tier || '').slice(0, 20);
    if (mo < 100 || mo > 20000) return Response.json({ error: 'Enter a monthly between 100 and 20000.' }, { status: 400 });
    c.retainerMonthly = mo; c.retainerTier = tier; c.retainerTs = Date.now();
    await store.setJSON('leads-claims.json', claims);
    logEvent({ type: 'audit', who: me.name, text: `${me.name} put ${lead.name} ON RETAINER — $${mo.toLocaleString()}/mo \u{1F4B0}` }).catch(() => {});
    tgPing(`\u{1F4B0} <b>ON RETAINER on The Floor</b>\n${me.name}: ${lead.name} at <b>$${mo.toLocaleString()}/mo</b>${tier ? ' (' + tier + ')' : ''}.`).catch(() => {});
    await ghlSync(['retainer-active'], `ON RETAINER $${mo.toLocaleString()}/mo${tier ? ' (' + tier + ')' : ''} by ${me.name} via The Floor.`,
      { stageId: STAGE.won, status: 'won', name: `${lead.name} — Build + $${mo.toLocaleString()}/mo${tier ? ' ' + tier : ''}` });
    return Response.json({ ok: true, retainerMonthly: mo });
  }

  return Response.json({ error: 'unknown action' }, { status: 400 });
};
