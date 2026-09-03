// Ops view for admin/head only: per-rep oversight, all claims, data health.
import { getStore } from '@netlify/blobs';
import { cookieSlug, loadRoster } from './team-auth.mjs';
import { loadProgress } from './team-progress.mjs';
import { loadActivity, loadFeed } from './team-events.mjs';

const dayStr = (d) => d.toISOString().slice(0, 10);

export default async (req) => {
  const slug = cookieSlug(req);
  if (!slug) return Response.json({ error: 'login required' }, { status: 401 });
  const roster = await loadRoster();
  const me = roster.find((r) => r.slug === slug && r.active);
  if (!me || !['admin', 'head'].includes(me.role)) return Response.json({ error: 'not allowed' }, { status: 403 });

  const store = getStore({ name: 'sales-team', consistency: 'strong' });
  const pool = (await store.get('leads-pool.json', { type: 'json' })) || { ts: 0, leads: [] };
  const claims = (await store.get('leads-claims.json', { type: 'json' })) || {};
  const feed = await loadFeed();
  const byId = Object.fromEntries(pool.leads.map((l) => [l.id, l]));
  const today = dayStr(new Date());
  const now = Date.now();

  const active = roster.filter((r) => r.active);
  const reps = await Promise.all(active.map(async (r) => {
    const prog = await loadProgress(r.slug);
    const act = await loadActivity(r.slug);
    const myClaims = Object.entries(claims).filter(([, c]) => c.slug === r.slug);
    const calls = Object.values(act).reduce((a, n) => a + n, 0);
    const lastDay = Object.keys(act).sort().pop() || null;
    const lastClaimTs = Math.max(0, ...myClaims.map(([, c]) => c.up || c.ts || 0));
    const stale = myClaims.filter(([, c]) => c.status === 'new' && now - c.ts > 5 * 86400e3).length;
    return {
      slug: r.slug, name: r.name, role: r.role,
      training: prog.done.length,
      calls, callsToday: act[today] || 0,
      open: myClaims.filter(([, c]) => ['new', 'called', 'no-answer'].includes(c.status)).length,
      meetings: myClaims.filter(([, c]) => c.status === 'meeting').length,
      auditsSold: myClaims.filter(([, c]) => c.status === 'audit-sold').length,
      dead: myClaims.filter(([, c]) => c.status === 'dead').length,
      staleClaims: stale,
      lastActive: lastClaimTs ? new Date(lastClaimTs).toISOString().slice(0, 10) : lastDay,
    };
  }));

  const claimRows = Object.entries(claims).map(([id, c]) => {
    const l = byId[id] || {};
    const rep = roster.find((r) => r.slug === c.slug);
    return {
      lead: l.name || id, city: l.city || '?', niche: l.niche || '?', phone: l.phone || '',
      rep: rep ? rep.name : c.slug, status: c.status,
      claimed: new Date(c.ts).toISOString().slice(0, 10),
      updated: c.up ? new Date(c.up).toISOString().slice(0, 10) : null,
      staleNew: c.status === 'new' && now - c.ts > 5 * 86400e3,
    };
  }).sort((a, b) => (b.updated || b.claimed).localeCompare(a.updated || a.claimed));

  return Response.json({
    reps,
    claims: claimRows,
    health: {
      poolSize: pool.leads.length,
      poolUnclaimed: pool.leads.filter((l) => !claims[l.id]).length,
      poolRefreshed: pool.ts ? new Date(pool.ts).toISOString().slice(0, 10) : null,
      claimsCount: Object.keys(claims).length,
      feedEvents: feed.length,
      rosterActive: active.length,
    },
  });
};
