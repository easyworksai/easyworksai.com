// The Bench: task assignment + tracking for the tech team.
// Tasks live in Blobs tasks.json. Roles: admin/head manage, tech executes.
// Flow mirrors Brad's three gates: tech moves work to "review", only admin/head
// approve to "done". Blocked tasks and review-ready tasks ping Brad on Telegram.
//
// GET -> { tasks, team:[tech members], me }
// POST {action:'create', title, detail, client, priority, assignee, due}   (admin/head)
// POST {action:'assign', id, assignee}                                     (admin/head)
// POST {action:'claim', id}                                                (tech: unassigned backlog only)
// POST {action:'status', id, status, reason?}   in-progress|review|blocked by assignee; done by admin/head
// POST {action:'note', id, text}
// POST {action:'delete', id}                                               (admin/head)
import { getStore } from '@netlify/blobs';
import { cookieSlug, loadRoster } from './team-auth.mjs';
import { tgPing } from './team-events.mjs';
import { isCompliant } from './team-compliance.mjs';
import { isTechOnboarded } from './team-onboard.mjs';

const STATUSES = ['backlog', 'in-progress', 'review', 'blocked', 'done'];
const PRIORITIES = ['p1', 'p2', 'p3'];
const store = () => getStore({ name: 'sales-team', consistency: 'strong' });

const loadTasks = async () => (await store().get('tasks.json', { type: 'json' })) || { seq: 0, tasks: [] };
const saveTasks = (d) => store().setJSON('tasks.json', d);

export default async (req) => {
  const slug = cookieSlug(req);
  if (!slug) return Response.json({ error: 'login required' }, { status: 401 });
  const roster = await loadRoster();
  const me = roster.find((r) => r.slug === slug && r.active);
  if (!me) return Response.json({ error: 'login required' }, { status: 401 });
  const canManage = ['admin', 'head'].includes(me.role);
  if (!canManage && me.role !== 'tech') return Response.json({ error: 'not allowed' }, { status: 403 });

  const data = await loadTasks();
  const nameOf = (s) => (roster.find((r) => r.slug === s) || {}).name || s;

  if (req.method === 'GET') {
    const team = roster.filter((r) => r.active && r.role === 'tech').map((r) => ({ slug: r.slug, name: r.name }));
    const tasks = data.tasks
      .filter((t) => !t.deleted)
      .map((t) => ({ ...t, assigneeName: t.assignee ? nameOf(t.assignee) : null }))
      .sort((a, b) => (b.up || b.ts) - (a.up || a.ts));
    return Response.json({ tasks, team, me: { slug: me.slug, name: me.name, role: me.role } });
  }

  if (req.method !== 'POST') return new Response('nope', { status: 405 });
  if (me.role === 'tech' && !(await isTechOnboarded(me))) {
    return Response.json({ error: 'Finish onboarding to start working.', needsOnboarding: true }, { status: 403 });
  }
  if (!(await isCompliant(me, roster))) {
    return Response.json({ error: 'Finish your onboarding documents first.', needsCompliance: true }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));

  if (body.action === 'create') {
    if (!canManage) return Response.json({ error: 'not allowed' }, { status: 403 });
    const title = String(body.title || '').trim().slice(0, 120);
    if (!title) return Response.json({ error: 'title required' }, { status: 400 });
    const assignee = roster.some((r) => r.slug === body.assignee && r.active && r.role === 'tech') ? body.assignee : null;
    data.seq += 1;
    const t = {
      id: 't' + data.seq,
      title,
      detail: String(body.detail || '').trim().slice(0, 2000),
      client: String(body.client || '').trim().slice(0, 60),
      priority: PRIORITIES.includes(body.priority) ? body.priority : 'p2',
      due: String(body.due || '').trim().slice(0, 30),
      status: 'backlog',
      assignee,
      createdBy: me.name,
      ts: Date.now(),
      up: Date.now(),
      notes: [],
    };
    data.tasks.push(t);
    await saveTasks(data);
    if (assignee) tgPing(`\u{1F6E0} <b>Task assigned</b>\n${nameOf(assignee)} ← ${t.title}${t.client ? ` (${t.client})` : ''} [${t.priority.toUpperCase()}]`).catch(() => {});
    return Response.json({ ok: true, task: t });
  }

  const t = data.tasks.find((x) => x.id === String(body.id || '') && !x.deleted);
  if (!t) return Response.json({ error: 'task not found' }, { status: 404 });
  const isMine = t.assignee === me.slug;

  if (body.action === 'assign') {
    if (!canManage) return Response.json({ error: 'not allowed' }, { status: 403 });
    const a = String(body.assignee || '');
    t.assignee = roster.some((r) => r.slug === a && r.active && r.role === 'tech') ? a : null;
    t.up = Date.now();
    await saveTasks(data);
    return Response.json({ ok: true });
  }

  if (body.action === 'claim') {
    if (me.role !== 'tech') return Response.json({ error: 'not allowed' }, { status: 403 });
    if (t.assignee) return Response.json({ error: 'already assigned' }, { status: 409 });
    if (t.status !== 'backlog') return Response.json({ error: 'not claimable' }, { status: 400 });
    t.assignee = me.slug; t.up = Date.now();
    await saveTasks(data);
    return Response.json({ ok: true });
  }

  if (body.action === 'status') {
    const st = String(body.status || '');
    if (!STATUSES.includes(st)) return Response.json({ error: 'bad status' }, { status: 400 });
    if (st === 'done' && !canManage) return Response.json({ error: 'only Brad or Cash approve a task done — move it to review' }, { status: 403 });
    if (!canManage && !isMine) return Response.json({ error: 'not your task' }, { status: 403 });
    if (t.status === st) return Response.json({ ok: true });
    t.status = st; t.up = Date.now();
    const reason = String(body.reason || '').trim().slice(0, 300);
    if (st === 'blocked' && reason) t.notes.push({ by: me.name, text: 'BLOCKED: ' + reason, ts: Date.now() });
    if (st !== 'blocked') delete t.blockedWhy; else t.blockedWhy = reason;
    await saveTasks(data);
    const label = `${t.title}${t.client ? ` (${t.client})` : ''}`;
    // review + blocked reach Brad as Approve/Send back cards from the Easyworks Brain (floorwatch); no direct ping here.
    if (st === 'done' && t.assignee && t.assignee !== me.slug) tgPing(`✅ <b>Task approved</b>\n${label} — shipped by ${nameOf(t.assignee)}`).catch(() => {});
    return Response.json({ ok: true });
  }

  if (body.action === 'note') {
    if (!canManage && !isMine) return Response.json({ error: 'not your task' }, { status: 403 });
    const text = String(body.text || '').trim().slice(0, 500);
    if (!text) return Response.json({ error: 'empty note' }, { status: 400 });
    t.notes.push({ by: me.name, text, ts: Date.now() });
    t.notes = t.notes.slice(-20);
    t.up = Date.now();
    await saveTasks(data);
    return Response.json({ ok: true });
  }

  if (body.action === 'delete') {
    if (!canManage) return Response.json({ error: 'not allowed' }, { status: 403 });
    t.deleted = true; t.up = Date.now();
    await saveTasks(data);
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'unknown action' }, { status: 400 });
};
