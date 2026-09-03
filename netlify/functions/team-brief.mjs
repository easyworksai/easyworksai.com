// Read-only metrics snapshot for the Easyworks bot (daily briefs, check-ins, monitoring).
// Auth: bearer token in `x-ew-token` header or `?token=` — NOT a user cookie. Set EW_BRIEF_TOKEN.
// GET -> a full snapshot of The Floor: per-rep activity, team totals, leaderboard, leads health,
//        tasks, compliance, and the recent wire. Everything a bot needs to report on, no writes.
import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';
import { loadRoster } from './team-auth.mjs';
import { loadFeed, loadActivity } from './team-events.mjs';
import { loadProgress, MODULES } from './team-progress.mjs';
import { fetchContacts, countTag, countTagSince, ghlReady } from './ghl.mjs';

const TOKEN = process.env.EW_BRIEF_TOKEN || '';
const store = () => getStore({ name: 'sales-team', consistency: 'strong' });
const dayStr = (d) => d.toISOString().slice(0, 10);

function weekStartTs() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.getTime();
}
function streakOf(activity) {
  let s = 0; const d = new Date();
  if ((activity[dayStr(d)] || 0) < 3) d.setUTCDate(d.getUTCDate() - 1);
  while ((activity[dayStr(d)] || 0) >= 3) { s++; d.setUTCDate(d.getUTCDate() - 1); }
  return s;
}
const safeEq = (a, b) => {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

export default async (req) => {
  if (!TOKEN) return Response.json({ error: 'brief endpoint not configured' }, { status: 503 });
  const url = new URL(req.url);
  const given = req.headers.get('x-ew-token') || url.searchParams.get('token') || '';
  if (!given || !safeEq(given, TOKEN)) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const s = store();
  const roster = await loadRoster();
  const active = roster.filter((r) => r.active);
  const sellers = active.filter((r) => !['admin', 'tech'].includes(r.role));
  const pool = (await s.get('leads-pool.json', { type: 'json' })) || { ts: 0, leads: [] };
  const claims = (await s.get('leads-claims.json', { type: 'json' })) || {};
  const tasksData = (await s.get('tasks.json', { type: 'json' })) || { tasks: [] };
  const feed = await loadFeed();
  const today = dayStr(new Date());
  const ws = weekStartTs();
  const now = Date.now();

  // per-rep activity (Blobs only, no GHL dependency)
  const reps = await Promise.all(sellers.map(async (r) => {
    const act = await loadActivity(r.slug);
    const prog = await loadProgress(r.slug);
    const my = Object.entries(claims).filter(([, c]) => c.slug === r.slug);
    const callsTotal = Object.values(act).reduce((a, n) => a + n, 0);
    const weekCalls = Object.entries(act).filter(([d]) => new Date(d + 'T00:00:00Z').getTime() >= ws).reduce((a, [, n]) => a + n, 0);
    const lastClaim = Math.max(0, ...my.map(([, c]) => c.up || c.ts || 0));
    const lastDay = Object.keys(act).sort().pop() || null;
    return {
      slug: r.slug, name: r.name, role: r.role,
      callsToday: act[today] || 0, callsTotal, weekCalls, streak: streakOf(act),
      training: `${prog.done.length}/${MODULES.length}`, certified: prog.done.length >= MODULES.length,
      openLeads: my.filter(([, c]) => ['new', 'called', 'no-answer'].includes(c.status)).length,
      meetings: my.filter(([, c]) => c.status === 'meeting').length,
      auditsSold: my.filter(([, c]) => c.status === 'audit-sold').length,
      dead: my.filter(([, c]) => c.status === 'dead').length,
      staleNew: my.filter(([, c]) => c.status === 'new' && now - c.ts > 5 * 86400e3).length,
      lastActive: lastClaim ? new Date(lastClaim).toISOString().slice(0, 10) : lastDay,
    };
  }));

  const sum = (f) => reps.reduce((a, r) => a + f(r), 0);
  const claimsArr = Object.values(claims);
  const claimedThisWeek = claimsArr.filter((c) => c.ts >= ws).length;
  const soldThisWeek = claimsArr.filter((c) => c.status === 'audit-sold' && (c.up || c.ts) >= ws).length;
  const meetThisWeek = claimsArr.filter((c) => c.status === 'meeting' && (c.up || c.ts) >= ws).length;

  const tasks = tasksData.tasks.filter((t) => !t.deleted);
  const byStatus = (st) => tasks.filter((t) => t.status === st).length;

  const leaderboard = [...reps].sort((a, b) => b.weekCalls - a.weekCalls || b.auditsSold - a.auditsSold)
    .slice(0, 10).map((r) => ({ name: r.name, weekCalls: r.weekCalls, auditsSold: r.auditsSold, streak: r.streak }));

  // Closed revenue from GHL (the system of record for paid deals). Best-effort.
  let revenue = { ghlConnected: false };
  if (ghlReady()) {
    try {
      const contacts = await fetchContacts();
      const auditsPaid = countTag(contacts, 'audit-onboarding');
      // Build + retainer dollars are now EXACT: the rep captures the real amount on The Floor.
      const buildClaims = claimsArr.filter((c) => c.buildAmount > 0);
      const retClaims = claimsArr.filter((c) => c.retainerMonthly > 0);
      const buildRevenue = buildClaims.reduce((a, c) => a + c.buildAmount, 0);
      const mrr = retClaims.reduce((a, c) => a + c.retainerMonthly, 0);
      const weekBuildRevenue = buildClaims.filter((c) => (c.buildTs || 0) >= ws).reduce((a, c) => a + c.buildAmount, 0);
      revenue = {
        ghlConnected: true,
        auditsPaid, auditRevenue: auditsPaid * 500,
        buildsClosed: buildClaims.length, buildRevenue,
        retainersActive: retClaims.length, mrr,
        closedToDate: auditsPaid * 500 + buildRevenue,
        weekAuditsPaid: countTagSince(contacts, 'audit-onboarding', ws),
        weekBuildRevenue,
        exact: true,
      };
    } catch { revenue = { ghlConnected: false, error: 'ghl fetch failed' }; }
  }

  return Response.json({
    revenue,
    generatedAt: new Date().toISOString(),
    team: { activeSellers: sellers.length, certified: reps.filter((r) => r.certified).length,
      techContractors: active.filter((r) => r.role === 'tech').length },
    today: { calls: sum((r) => r.callsToday) },
    week: { calls: sum((r) => r.weekCalls), leadsClaimed: claimedThisWeek, meetingsBooked: meetThisWeek, auditsSold: soldThisWeek },
    totals: { openLeads: sum((r) => r.openLeads), meetings: sum((r) => r.meetings),
      auditsSold: sum((r) => r.auditsSold), staleClaims: sum((r) => r.staleNew) },
    leads: { poolSize: pool.leads.length, unclaimed: pool.leads.filter((l) => !claims[l.id]).length,
      claimed: Object.keys(claims).length, refreshed: pool.ts ? new Date(pool.ts).toISOString().slice(0, 10) : null },
    tasks: { total: tasks.length, backlog: byStatus('backlog'), inProgress: byStatus('in-progress'),
      review: byStatus('review'), blocked: byStatus('blocked'), done: byStatus('done'),
      blockedList: tasks.filter((t) => t.status === 'blocked').map((t) => ({ title: t.title, client: t.client || null, why: t.blockedWhy || null })) },
    reps, leaderboard,
    wire: feed.slice(0, 15).map((e) => ({ type: e.type, text: e.text, ts: e.ts })),
  });
};
