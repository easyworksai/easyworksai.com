// The Floor, for the Easyworks Brain. Token-auth (same EW_BRIEF_TOKEN as
// team-brief), acting as Brad (admin). Read-write: tasks, claims, roster, wire.
// team-brief stays the read-only snapshot; this is the hands.
//
// POST { action, ... }   header x-ew-token
//   tasks.list                         -> { tasks, team }
//   task.create  {title, detail, client, priority, assignee, due}
//   task.assign  {id, assignee}
//   task.status  {id, status, note?}   backlog|in-progress|review|blocked|done (done = Brad's QC approval)
//   task.note    {id, text}
//   claims.list                        -> every claimed lead with rep + status + lead details
//   lead.release {id}                  -> back to the pool (any status; admin override)
//   lead.reassign {id, slug}           -> hand a claimed lead to another rep
//   roster.list                        -> active roster (no codes)
//   wire.post    {text, type?}         -> a line on The Wire, from Brad
//   wire.list                          -> recent feed
import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';
import { loadRoster } from './team-auth.mjs';
import { logEvent, loadFeed } from './team-events.mjs';

const TOKEN = process.env.EW_BRIEF_TOKEN || '';
const store = () => getStore({ name: 'sales-team', consistency: 'strong' });
const STATUSES = ['backlog', 'in-progress', 'review', 'blocked', 'done'];
const PRIORITIES = ['p1', 'p2', 'p3'];
const ME = { slug: 'brad', name: 'Brad Palmer' };
const safeEq = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };

export default async (req) => {
  if (!TOKEN) return Response.json({ error: 'bot endpoint not configured' }, { status: 503 });
  const given = req.headers.get('x-ew-token') || '';
  if (!given || !safeEq(given, TOKEN)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '');
  const s = store();
  const roster = await loadRoster();
  const nameOf = (slug) => (roster.find((r) => r.slug === slug) || {}).name || slug;
  const loadTasks = async () => (await s.get('tasks.json', { type: 'json' })) || { seq: 0, tasks: [] };

  // ---- tasks --------------------------------------------------------------
  if (action === 'tasks.list') {
    const d = await loadTasks();
    const team = roster.filter((r) => r.active && r.role === 'tech').map((r) => ({ slug: r.slug, name: r.name }));
    const tasks = d.tasks.filter((t) => !t.deleted).map((t) => ({ ...t, assigneeName: t.assignee ? nameOf(t.assignee) : null })).sort((a, b) => (b.up || b.ts) - (a.up || a.ts));
    return Response.json({ tasks, team });
  }
  if (action === 'task.create') {
    const d = await loadTasks();
    const title = String(body.title || '').trim().slice(0, 120);
    if (!title) return Response.json({ error: 'title required' }, { status: 400 });
    const assignee = roster.some((r) => r.slug === body.assignee && r.active && r.role === 'tech') ? body.assignee : null;
    d.seq += 1;
    const t = { id: 't' + d.seq, title, detail: String(body.detail || '').trim().slice(0, 2000), client: String(body.client || '').trim().slice(0, 60), priority: PRIORITIES.includes(body.priority) ? body.priority : 'p2', due: String(body.due || '').trim().slice(0, 30), status: 'backlog', assignee, createdBy: ME.name, ts: Date.now(), up: Date.now(), notes: [] };
    d.tasks.push(t);
    await s.setJSON('tasks.json', d);
    if (assignee) logEvent({ type: 'task', who: ME.name, text: `${ME.name} assigned ${nameOf(assignee)}: ${title}` }).catch(() => {});
    return Response.json({ ok: true, task: t });
  }
  if (action.startsWith('task.')) {
    const d = await loadTasks();
    const t = d.tasks.find((x) => x.id === String(body.id || '') && !x.deleted);
    if (!t) return Response.json({ error: 'task not found' }, { status: 404 });
    if (action === 'task.assign') {
      const a = String(body.assignee || '');
      t.assignee = roster.some((r) => r.slug === a && r.active && r.role === 'tech') ? a : null;
      t.up = Date.now(); await s.setJSON('tasks.json', d);
      if (t.assignee) logEvent({ type: 'task', who: ME.name, text: `${ME.name} assigned ${nameOf(t.assignee)}: ${t.title}` }).catch(() => {});
      return Response.json({ ok: true, task: t });
    }
    if (action === 'task.status') {
      const st = String(body.status || '');
      if (!STATUSES.includes(st)) return Response.json({ error: 'bad status' }, { status: 400 });
      const note = String(body.note || '').trim().slice(0, 500);
      if (note) t.notes.push({ by: ME.name, text: note, ts: Date.now() });
      if (t.status !== st) { t.status = st; if (st !== 'blocked') delete t.blockedWhy; }
      t.up = Date.now(); t.notes = t.notes.slice(-20);
      await s.setJSON('tasks.json', d);
      const label = `${t.title}${t.client ? ` (${t.client})` : ''}`;
      if (st === 'done') logEvent({ type: 'task', who: ME.name, text: `${ME.name} approved: ${label}${t.assignee ? ' by ' + nameOf(t.assignee) : ''}` }).catch(() => {});
      return Response.json({ ok: true, task: t });
    }
    if (action === 'task.note') {
      const text = String(body.text || '').trim().slice(0, 500);
      if (!text) return Response.json({ error: 'empty note' }, { status: 400 });
      t.notes.push({ by: ME.name, text, ts: Date.now() }); t.notes = t.notes.slice(-20); t.up = Date.now();
      await s.setJSON('tasks.json', d);
      return Response.json({ ok: true, task: t });
    }
    if (action === 'task.delete') { t.deleted = true; t.up = Date.now(); await s.setJSON('tasks.json', d); return Response.json({ ok: true }); }
  }

  // ---- leads ----------------------------------------------------------------
  const loadPool = async () => (await s.get('leads-pool.json', { type: 'json' })) || { ts: 0, leads: [] };
  const loadClaims = async () => (await s.get('leads-claims.json', { type: 'json' })) || {};
  if (action === 'claims.list') {
    const pool = await loadPool(); const claims = await loadClaims();
    const byId = Object.fromEntries(pool.leads.map((l) => [l.id, l]));
    const now = Date.now();
    const list = Object.entries(claims).map(([id, c]) => ({ id, rep: nameOf(c.slug), slug: c.slug, status: c.status, claimedAt: new Date(c.ts).toISOString().slice(0, 10), lastTouch: new Date(c.up || c.ts).toISOString().slice(0, 10), daysSinceTouch: Math.floor((now - (c.up || c.ts)) / 86400000), buildAmount: c.buildAmount || 0, retainerMonthly: c.retainerMonthly || 0, lead: byId[id] ? { name: byId[id].name, city: byId[id].city, niche: byId[id].niche, phone: byId[id].phone } : null }))
      .sort((a, b) => b.lastTouch.localeCompare(a.lastTouch));
    return Response.json({ claims: list, poolSize: pool.leads.length, unclaimed: pool.leads.filter((l) => !claims[l.id]).length });
  }
  if (action === 'lead.release' || action === 'lead.reassign') {
    const claims = await loadClaims();
    const id = String(body.id || '');
    if (!claims[id]) return Response.json({ error: 'not claimed' }, { status: 404 });
    if (action === 'lead.release') { delete claims[id]; await s.setJSON('leads-claims.json', claims); return Response.json({ ok: true }); }
    const to = String(body.slug || '');
    if (!roster.some((r) => r.slug === to && r.active)) return Response.json({ error: 'unknown rep' }, { status: 400 });
    const from = claims[id].slug;
    claims[id] = { ...claims[id], slug: to, up: Date.now() };
    await s.setJSON('leads-claims.json', claims);
    logEvent({ type: 'claim', who: ME.name, text: `${ME.name} moved a lead from ${nameOf(from)} to ${nameOf(to)}` }).catch(() => {});
    return Response.json({ ok: true });
  }

  // ---- roster + wire --------------------------------------------------------
  if (action === 'roster.list') return Response.json({ roster: roster.filter((r) => r.active).map((r) => ({ slug: r.slug, name: r.name, role: r.role, recruiterSlug: r.recruiterSlug || null })) });
  if (action === 'wire.post') {
    const text = String(body.text || '').trim().slice(0, 300);
    if (!text) return Response.json({ error: 'empty' }, { status: 400 });
    await logEvent({ type: String(body.type || 'note').slice(0, 20), who: ME.name, text });
    return Response.json({ ok: true });
  }
  if (action === 'wire.list') return Response.json({ wire: (await loadFeed()).slice(0, 30) });

  return Response.json({ error: 'unknown action' }, { status: 400 });
};
