// GHL -> The Floor. When a deal moves inside GoHighLevel, the rep's lead card follows. GHL wins on stage.
//
// Called by one GHL workflow (trigger: pipeline stage changed / opportunity status changed, action: webhook).
// POST ?k=<GHL_HOOK_SECRET>   body: whatever GHL sends. We only take the opportunity id from it.
//
// The payload is a doorbell, not data: we read the opportunity back from GHL with our own token and
// act on that. A forged call can only make us re-read a deal we already own.
//
// Changes that arrive from GHL are QUIET: no XP, no wire line, no call count. Nobody games the board
// by dragging cards in GHL. "Won" never writes a build amount (that feeds commission): it flags the
// claim and pings Brad once to log the amount on The Floor.
//
// ghl-stage-reconcile.mjs runs the same syncClaimFromOpp() nightly as the safety net.
import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';
import { getOpportunity, PIPELINE_ID, STAGE } from './ghl.mjs';
import { tgPing } from './team-events.mjs';
import { ensureHandoff } from './team-handoffs.mjs';

const SECRET = process.env.GHL_HOOK_SECRET || '';
const store = () => getStore({ name: 'sales-team', consistency: 'strong' });
const safeEq = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };

// What the portal status should be for a GHL opportunity. null = leave the status alone.
export function statusFor(opp, current) {
  if (opp.status === 'lost' || opp.status === 'abandoned' || opp.stageId === STAGE.lost) return 'dead';
  if (opp.status === 'won' || opp.stageId === STAGE.won) return null;
  if (opp.stageId === STAGE.new) return 'new';
  // the Floor splits "Contacted" into called / no-answer; either one already matches
  if (opp.stageId === STAGE.contacted) return ['called', 'no-answer'].includes(current) ? current : 'called';
  if (opp.stageId === STAGE.meeting) return 'meeting';
  if (opp.stageId === STAGE.proposal) return 'blueprint-sold';
  return null; // a stage we do not know: never guess
}

// Bring one claim in line with its GHL opportunity. Mutates the claim. Returns what happened.
export function syncClaimFromOpp(c, opp) {
  const out = { changed: false, won: false, from: c.status, to: c.status };
  const isWon = opp.status === 'won' || opp.stageId === STAGE.won;
  if (isWon && !c.buildAmount && !c.retainerMonthly && !c.ghlWon) { c.ghlWon = Date.now(); out.won = true; out.changed = true; }
  if (!isWon && c.ghlWon) { delete c.ghlWon; out.changed = true; }
  const cur = c.status === 'audit-sold' ? 'blueprint-sold' : c.status; // legacy name for the same status
  const want = statusFor(opp, cur);
  if (want && want !== cur) {
    c.status = want; c.up = Date.now(); c.src = 'ghl';
    out.to = want; out.changed = true;
  }
  return out;
}

// GHL's payload shape varies by trigger, so collect every id it might carry (opportunity or contact)
// and let our own claims decide which deal it is.
// A sale marked in GHL still needs its paperwork chased: open the same handoff a Floor sale opens.
export async function openHandoffFor(leadId, c, opp) {
  const pool = (await store().get('leads-pool.json', { type: 'json' })) || { leads: [] };
  const lead = pool.leads.find((l) => l.id === leadId) || {};
  return ensureHandoff({ leadId, name: lead.name || (opp && opp.name) || leadId, city: lead.city, niche: lead.niche, slug: c.slug });
}

const pickIds = (b) => [b.opportunity_id, b.opportunityId, b.opportunity && b.opportunity.id,
  b.customData && b.customData.opportunity_id, b.customData && b.customData.opportunityId,
  b.contact_id, b.contactId, b.id]
  .map((v) => String(v || '').trim()).filter((v) => v && v.length <= 64);
const findClaim = (claims, ids) => Object.entries(claims).find(([, c]) => c.oppId && (ids.includes(c.oppId) || ids.includes(c.ghlId)));

export default async (req) => {
  if (!SECRET) return Response.json({ error: 'hook not configured' }, { status: 503 });
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  const given = new URL(req.url).searchParams.get('k') || req.headers.get('x-ew-hook') || '';
  if (!given || !safeEq(given, SECRET)) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ids = pickIds(body);
  if (!ids.length) return Response.json({ ok: true, skipped: 'no id in payload' });

  // Cheap check first: is this one of ours at all? Scan leads and anything not claimed on the Floor stop here.
  let claims = (await store().get('leads-claims.json', { type: 'json' })) || {};
  const hit = findClaim(claims, ids);
  if (!hit) return Response.json({ ok: true, skipped: 'not a Floor lead' });
  const oppId = hit[1].oppId;

  const opp = await getOpportunity(oppId);
  if (!opp) return Response.json({ error: 'could not read the opportunity from GHL' }, { status: 502 }); // GHL retries
  if (opp.pipelineId && opp.pipelineId !== PIPELINE_ID) return Response.json({ ok: true, skipped: 'other pipeline' });

  // Re-read right before writing: the claims file is shared with reps working leads.
  claims = (await store().get('leads-claims.json', { type: 'json' })) || {};
  const entry = Object.entries(claims).find(([, c]) => c.oppId === oppId);
  if (!entry) return Response.json({ ok: true, skipped: 'not a Floor lead' });
  const [leadId, c] = entry;
  const res = syncClaimFromOpp(c, opp);
  if (res.changed) await store().setJSON('leads-claims.json', claims);
  if (res.from !== res.to && res.to === 'blueprint-sold') await openHandoffFor(leadId, c, opp).catch(() => {});
  if (res.won) {
    await tgPing(`\u{1F3C6} <b>Deal marked Won in GHL</b>\n${opp.name || leadId} (rep: ${c.slug}).\nNo build amount is logged on The Floor yet. Log it on the lead card so revenue and commission are right.`);
  }
  return Response.json({ ok: true, lead: leadId, ...res });
};
