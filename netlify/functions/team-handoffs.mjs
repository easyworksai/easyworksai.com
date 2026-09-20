// Handoff 1: sales to tech. Nothing gets built before the paper is done.
// Every Blueprint sold opens one handoff with four checks:
//   scope   = scope sheet signed          (admin/head/ea tick it)
//   intake  = intake form complete        (admin/head/ea tick it)
//   payment = payment in                  (admin/head only: it is the money gate)
//   task    = build task on the Work board (ticks itself when the task is made from the handoff)
// A build task made from a handoff cannot be assigned or claimed until scope, intake and payment are
// ticked (see handoffGate, used by team-tasks and team-bot). Tasks with no handoff are not affected.
//
// GET  -> { handoffs:[...open, then closed in the last 14 days] }            (admin/head/ea)
// POST {action:'check', id, key, done}
// POST {action:'note', id, text}
// POST {action:'task', id, title?, detail?, priority?}  -> makes the linked build task (backlog, unassigned)
// POST {action:'close', id, reason}                     -> deal fell through (admin/head)
import { getStore } from '@netlify/blobs';
import { cookieSlug, loadRoster } from './team-auth.mjs';
import { isTechOnboarded } from './team-onboard.mjs';
import { isCompliant } from './team-compliance.mjs';
import { tgPing } from './team-events.mjs';

export const CHECKS = [
  { key: 'scope', label: 'Scope sheet signed' },
  { key: 'intake', label: 'Intake form complete' },
  { key: 'payment', label: 'Payment in' },
  { key: 'task', label: 'Build task on the board' },
];
const PAPER = ['scope', 'intake', 'payment'];
const store = () => getStore({ name: 'sales-team', consistency: 'strong' });
const load = async () => (await store().get('handoffs.json', { type: 'json' })) || { seq: 0, items: [] };
const save = (d) => store().setJSON('handoffs.json', d);

export const missingOf = (h) => CHECKS.filter((c) => !(h.checks[c.key] && h.checks[c.key].done)).map((c) => c.key);
export const loadHandoffs = load;

// Open a handoff for a sold lead. Idempotent per lead. Best effort: callers must never let this block a rep.
export async function ensureHandoff({ leadId, name, city, niche, slug }) {
  if (!leadId) return null;
  const d = await load();
  const existing = d.items.find((h) => h.leadId === leadId);
  if (existing) return existing;
  d.seq += 1;
  const h = { id: 'h' + d.seq, leadId, name: String(name || leadId).slice(0, 120), city: city || '', niche: niche || '',
    rep: slug || null, ts: Date.now(), up: Date.now(), checks: {}, taskId: null, notes: [], closed: null };
  d.items.push(h);
  await save(d);
  return h;
}

// Used by team-tasks and team-bot before a task gets an owner. Returns null when clear, else what is missing.
export async function handoffGate(task) {
  if (!task || !task.handoffId) return null;
  const h = (await load()).items.find((x) => x.id === task.handoffId);
  if (!h || h.closed) return null;
  const missing = PAPER.filter((k) => !(h.checks[k] && h.checks[k].done));
  if (!missing.length) return null;
  return 'Handoff not complete. Still missing: ' + missing.map((k) => CHECKS.find((c) => c.key === k).label.toLowerCase()).join(', ') + '.';
}

export default async (req) => {
  const slug = cookieSlug(req);
  if (!slug) return Response.json({ error: 'login required' }, { status: 401 });
  const roster = await loadRoster();
  const me = roster.find((r) => r.slug === slug && r.active);
  if (!me) return Response.json({ error: 'login required' }, { status: 401 });
  const canManage = ['admin', 'head'].includes(me.role);
  if (!canManage && me.role !== 'ea') return Response.json({ error: 'not allowed' }, { status: 403 });
  if (me.role === 'ea' && !(await isTechOnboarded(me))) {
    return Response.json({ error: 'Finish onboarding first.', needsOnboarding: true }, { status: 403 });
  }
  const nameOf = (s) => (roster.find((r) => r.slug === s) || {}).name || s;
  const d = await load();
  const shape = (h) => ({ ...h, repName: h.rep ? nameOf(h.rep) : null, missing: missingOf(h),
    days: Math.floor((Date.now() - h.ts) / 86400e3) });

  if (req.method === 'GET') {
    const recent = Date.now() - 14 * 86400e3;
    const items = d.items.filter((h) => !h.closed || h.closed.ts > recent)
      .sort((a, b) => (!!a.closed - !!b.closed) || (a.ts - b.ts)); // open first, oldest first
    return Response.json({ handoffs: items.map(shape), checks: CHECKS, canPayment: canManage });
  }

  if (req.method !== 'POST') return new Response('nope', { status: 405 });
  if (!(await isCompliant(me, roster))) {
    return Response.json({ error: 'Finish your onboarding documents first.', needsCompliance: true }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const h = d.items.find((x) => x.id === String(body.id || ''));
  if (!h) return Response.json({ error: 'handoff not found' }, { status: 404 });
  if (h.closed) return Response.json({ error: 'This handoff is closed.' }, { status: 400 });
  const wasReady = !missingOf(h).length;
  const finish = async () => {
    h.up = Date.now();
    const ready = !missingOf(h).length;
    if (ready && !wasReady) h.closed = { ts: Date.now(), by: me.name, reason: 'complete' };
    await save(d);
    if (ready && !wasReady) await tgPing(`\u{1F4CB} <b>Handoff complete</b>\n${h.name}: scope, intake and payment are in and the build task is on the board. Ready to assign.`);
    return Response.json({ ok: true, handoff: shape(h) });
  };

  if (body.action === 'check') {
    const key = String(body.key || '');
    if (!PAPER.includes(key)) return Response.json({ error: key === 'task' ? 'That one ticks itself when the build task is made.' : 'bad check' }, { status: 400 });
    if (key === 'payment' && !canManage) return Response.json({ error: 'Only Brad or Cash confirm payment.' }, { status: 403 });
    if (body.done) h.checks[key] = { done: true, by: me.name, ts: Date.now() };
    else delete h.checks[key];
    return finish();
  }

  if (body.action === 'note') {
    const text = String(body.text || '').trim().slice(0, 500);
    if (!text) return Response.json({ error: 'empty note' }, { status: 400 });
    h.notes.push({ by: me.name, text, ts: Date.now() });
    h.notes = h.notes.slice(-20);
    return finish();
  }

  if (body.action === 'task') {
    if (h.taskId) return Response.json({ error: 'The build task already exists.' }, { status: 409 });
    const tasks = (await store().get('tasks.json', { type: 'json' })) || { seq: 0, tasks: [] };
    tasks.seq += 1;
    const t = { id: 't' + tasks.seq, title: String(body.title || '').trim().slice(0, 120) || `Build: ${h.name}`,
      detail: String(body.detail || '').trim().slice(0, 2000), client: h.name.slice(0, 60),
      priority: ['p1', 'p2', 'p3'].includes(body.priority) ? body.priority : 'p2', due: '', status: 'backlog',
      assignee: null, createdBy: me.name, ts: Date.now(), up: Date.now(), notes: [], handoffId: h.id };
    tasks.tasks.push(t);
    await store().setJSON('tasks.json', tasks);
    h.taskId = t.id;
    h.checks.task = { done: true, by: me.name, ts: Date.now() };
    return finish();
  }

  if (body.action === 'close') {
    if (!canManage) return Response.json({ error: 'not allowed' }, { status: 403 });
    h.closed = { ts: Date.now(), by: me.name, reason: String(body.reason || 'closed').slice(0, 200) };
    h.up = Date.now();
    await save(d);
    return Response.json({ ok: true, handoff: shape(h) });
  }

  return Response.json({ error: 'unknown action' }, { status: 400 });
};
