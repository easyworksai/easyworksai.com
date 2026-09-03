// Sales team portal stats: pulls contacts from GHL, aggregates per rep by tags,
// computes XP, ranks, badges, leaderboard. Caches the GHL pull for 5 minutes.
import { getStore } from '@netlify/blobs';
import { cookieSlug, loadRoster } from './team-auth.mjs';
import { MODULES, loadProgress, loadIncentive } from './team-progress.mjs';
import { loadFeed, loadActivity } from './team-events.mjs';

const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_VER = '2021-07-28';
const TOKEN = process.env.GHL_EASYWORKS_PIT_TOKEN || '';
const LOC = process.env.GHL_EASYWORKS_LOCATION_ID || 'epCxi4CaxbM1sOwVjBTf';

const XP = { audit: 100, build: 500, retainer: 250, training: 50, call: 5, streakDay: 20 };
const RANKS = [
  { at: 0, name: 'Rookie' },
  { at: 300, name: 'Grinder' },
  { at: 800, name: 'Closer' },
  { at: 2000, name: 'Rainmaker' },
  { at: 4500, name: 'Apex' },
];
const BADGES = [
  { id: 'student', name: 'The Student', desc: 'First training module done', test: (s) => s.training >= 1 },
  { id: 'dialer', name: 'The Dialer', desc: '100 calls logged', test: (s) => s.calls >= 100 },
  { id: 'on-fire', name: 'On Fire', desc: '5-day call streak', test: (s) => s.streak >= 5 },
  { id: 'certified', name: 'Certified', desc: 'All training complete', test: (s) => s.training >= MODULES.length },
  { id: 'first-blood', name: 'First Blood', desc: 'First audit sold', test: (s) => s.audits >= 1 },
  { id: 'hat-trick', name: 'Hat Trick', desc: '3 audits sold', test: (s) => s.audits >= 3 },
  { id: 'double-digits', name: 'Double Digits', desc: '10 audits sold', test: (s) => s.audits >= 10 },
  { id: 'builder', name: 'The Builder', desc: 'First build closed', test: (s) => s.builds >= 1 },
  { id: 'architect', name: 'The Architect', desc: '3 builds closed', test: (s) => s.builds >= 3 },
  { id: 'landlord', name: 'The Landlord', desc: 'First client on retainer', test: (s) => s.retainers >= 1 },
  { id: 'empire', name: 'Empire', desc: '5 clients on retainer', test: (s) => s.retainers >= 5 },
  { id: 'full-plate', name: 'Full Plate', desc: 'Audit + build + retainer, all three', test: (s) => s.audits >= 1 && s.builds >= 1 && s.retainers >= 1 },
];

async function fetchContacts() {
  const store = getStore({ name: 'sales-team', consistency: 'strong' });
  const cached = await store.get('contacts-cache.json', { type: 'json' });
  if (cached && Date.now() - cached.ts < 5 * 60 * 1000) return cached.contacts;

  const contacts = [];
  let url = `${GHL_BASE}/contacts/?locationId=${LOC}&limit=100`;
  for (let page = 0; page < 10; page++) {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}`, Version: GHL_VER, Accept: 'application/json' },
    });
    if (!r.ok) break;
    const j = await r.json();
    const batch = (j.contacts || []).map((c) => ({ tags: c.tags || [], added: c.dateAdded || null }));
    contacts.push(...batch);
    const next = j.meta && j.meta.nextPageUrl;
    if (!next || !(j.contacts || []).length) break;
    url = next;
  }
  await store.setJSON('contacts-cache.json', { ts: Date.now(), contacts });
  return contacts;
}

function statsFor(slug, contacts, name) {
  // clients type the rep's name on /start, which becomes rep-<full-name-slug>;
  // roster slugs can be shorter. Match either, plus first-name-only entries.
  const nameSlug = (name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const first = nameSlug.split('-')[0];
  const ok = new Set([`rep-${slug}`, `rep-${nameSlug}`, first ? `rep-${first}` : null].filter(Boolean));
  const mine = contacts.filter((c) => c.tags.some((t) => ok.has(t)));
  const audits = mine.filter((c) => c.tags.includes('audit-onboarding')).length;
  const builds = mine.filter((c) => c.tags.includes('build-closed')).length;
  const retainers = mine.filter((c) => c.tags.includes('retainer-active')).length;
  const xp = audits * XP.audit + builds * XP.build + retainers * XP.retainer;
  return { audits, builds, retainers, xp, clients: mine.length };
}

function addTraining(stats, doneCount) {
  const training = Math.min(doneCount, MODULES.length);
  return { ...stats, training, xp: stats.xp + training * XP.training };
}

const dayStr = (d) => d.toISOString().slice(0, 10);
function weekStartTs() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.getTime();
}

function activityStats(activity) {
  let calls = 0, callXP = 0, weekCalls = 0;
  const ws = weekStartTs();
  for (const [day, n] of Object.entries(activity)) {
    calls += n;
    callXP += Math.min(n, 30) * XP.call;
    if (new Date(day + 'T00:00:00Z').getTime() >= ws) weekCalls += n;
  }
  // streak: consecutive days ending today or yesterday with 3+ logged calls
  let streak = 0;
  const d = new Date();
  if ((activity[dayStr(d)] || 0) < 3) d.setUTCDate(d.getUTCDate() - 1);
  while ((activity[dayStr(d)] || 0) >= 3) { streak++; d.setUTCDate(d.getUTCDate() - 1); }
  const today = (activity[dayStr(new Date())] || 0);
  return { calls, callXP, weekCalls, streak, today, streakXP: streak * XP.streakDay };
}

function weeklyAudits(slug, name, contacts) {
  const ws = weekStartTs();
  const nameSlug = (name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const first = nameSlug.split('-')[0];
  const ok = new Set([`rep-${slug}`, `rep-${nameSlug}`, first ? `rep-${first}` : null].filter(Boolean));
  return contacts.filter((c) => c.tags.some((t) => ok.has(t)) && c.tags.includes('audit-onboarding')
    && c.added && new Date(c.added).getTime() >= ws).length;
}

function rankFor(xp) {
  let cur = RANKS[0], next = null;
  for (const r of RANKS) { if (xp >= r.at) cur = r; else { next = r; break; } }
  const pct = next ? Math.min(99, Math.round(((xp - cur.at) / (next.at - cur.at)) * 100)) : 100;
  return { name: cur.name, next: next ? next.name : null, nextAt: next ? next.at : null, pct };
}

export default async (req) => {
  const slug = cookieSlug(req);
  if (!slug) return Response.json({ error: 'login required' }, { status: 401 });
  const roster = await loadRoster();
  const me = roster.find((r) => r.slug === slug && r.active);
  if (!me) return Response.json({ error: 'login required' }, { status: 401 });
  if (!TOKEN) return Response.json({ error: 'stats not configured' }, { status: 500 });

  const contacts = await fetchContacts();
  const active = roster.filter((r) => r.active);
  const [progressPairs, activityPairs] = await Promise.all([
    Promise.all(active.map(async (r) => [r.slug, await loadProgress(r.slug)])),
    Promise.all(active.map(async (r) => [r.slug, await loadActivity(r.slug)])),
  ]);
  const progressAll = Object.fromEntries(progressPairs);
  const activityAll = Object.fromEntries(activityPairs);
  const ws = weekStartTs();

  const enrich = (r) => {
    const prog = progressAll[r.slug] || { done: [] };
    const act = activityStats(activityAll[r.slug] || {});
    const base = addTraining(statsFor(r.slug, contacts, r.name), prog.done.length);
    const xp = base.xp + act.callXP + act.streakXP;
    const weekModules = prog.done.filter((m) => (prog[m] || 0) >= ws).length;
    const wxp = weeklyAudits(r.slug, r.name, contacts) * XP.audit + act.weekCalls * XP.call + weekModules * XP.training;
    return { ...base, xp, wxp, calls: act.calls, streak: act.streak, today: act.today };
  };

  const board = roster
    .filter((r) => r.active && !['admin', 'tech'].includes(r.role))
    .map((r) => ({ slug: r.slug, name: r.name, ...enrich(r), rank: null }))
    .map((r) => ({ ...r, rank: rankFor(r.xp).name }))
    .sort((a, b) => b.xp - a.xp || b.audits - a.audits);

  const mine = enrich(me);
  const badges = BADGES.map((b) => ({ id: b.id, name: b.name, desc: b.desc, unlocked: b.test(mine) }));

  return Response.json({
    me: { slug, name: me.name, role: me.role, ...mine, rank: rankFor(mine.xp) },
    badges,
    leaderboard: board,
    xpGuide: XP,
    incentive: await loadIncentive(),
    feed: (await loadFeed()).slice(0, 30),
  });
};
