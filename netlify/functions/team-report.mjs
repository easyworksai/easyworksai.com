// Shift report. The EA's handbook asks for a report every shift: this drafts it from what she actually
// did today, she edits it, and one click sends it to Brad on Telegram.
//
// GET                          -> { draft, sentToday }     built from today's records (Vancouver day)
// POST {action:'send', text}   -> sends her edited text to Brad. At most 3 a day.
// Roles: ea (onboarded), admin, head. Reads only what the portal already recorded; nothing new is tracked.
import { getStore } from '@netlify/blobs';
import { cookieSlug, loadRoster } from './team-auth.mjs';
import { isTechOnboarded } from './team-onboard.mjs';
import { tgSend } from './team-events.mjs';
import { todayRange, loadBench, loadOpenHandoffs } from './team-today.mjs';
import { loadHandoffs, CHECKS } from './team-handoffs.mjs';

const MAX_PER_DAY = 3;
const store = () => getStore({ name: 'sales-team', consistency: 'strong' });
const escTg = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function buildDraft(me, roster) {
  const { start, end, day } = todayRange();
  const today = (ts) => ts >= start && ts < end;
  const tasks = ((await store().get('tasks.json', { type: 'json' })) || { tasks: [] }).tasks.filter((t) => !t.deleted);
  const mine = (t) => (t.notes || []).filter((n) => n.by === me.name && today(n.ts)).map((n) => ({ t, n }));
  const notes = tasks.flatMap(mine);
  const pick = (prefix) => notes.filter(({ n }) => n.text.startsWith(prefix));
  const plain = notes.filter(({ n }) => !/^(NUDGE|BLOCKED|UNBLOCKED):/.test(n.text));
  const created = tasks.filter((t) => t.createdBy === me.name && today(t.ts));
  const label = (k) => CHECKS.find((c) => c.key === k).label.toLowerCase();
  const handoffItems = (await loadHandoffs()).items;
  const ticks = handoffItems.flatMap((h) => Object.entries(h.checks || {}).filter(([, v]) => v.by === me.name && today(v.ts)).map(([k]) => `${h.name}: ${label(k)}`));

  const did = [];
  if (created.length) did.push(`Created ${created.length} task${created.length === 1 ? '' : 's'}: ${created.map((t) => t.title).join('; ')}`);
  if (pick('UNBLOCKED:').length) did.push(`Unblocked: ${pick('UNBLOCKED:').map(({ t }) => t.title).join('; ')}`);
  if (pick('BLOCKED:').length) did.push(`Marked blocked: ${pick('BLOCKED:').map(({ t, n }) => `${t.title} (${n.text.slice(9)})`).join('; ')}`);
  if (pick('NUDGE:').length) did.push(`Nudged: ${pick('NUDGE:').map(({ t }) => t.title).join('; ')}`);
  if (ticks.length) did.push(`Handoffs moved: ${ticks.join('; ')}`);
  if (plain.length) did.push(`Notes left on: ${[...new Set(plain.map(({ t }) => t.title))].join('; ')}`);

  const b = loadBench({ tasks }, roster);
  const open = await loadOpenHandoffs(roster);
  const needs = [];
  b.review.forEach((t) => needs.push(`QC: ${t.title}${t.assignee ? ' (' + t.assignee + ')' : ''}`));
  b.blocked.forEach((t) => needs.push(`Blocked ${t.days}d: ${t.title}${t.why ? ', ' + t.why : ''}`));
  open.filter((h) => h.missing.includes('Payment in')).forEach((h) => needs.push(`Confirm payment: ${h.name}`));

  const watch = [];
  b.stale.forEach((t) => watch.push(`Quiet ${t.days}d: ${t.title}${t.assignee ? ' (' + t.assignee + ')' : ''}`));
  b.overdue.forEach((t) => watch.push(`Overdue since ${t.due}: ${t.title}`));
  open.forEach((h) => watch.push(`Handoff ${h.days}d: ${h.name}, missing ${h.missing.join(', ').toLowerCase()}`));

  const sec = (title, rows, empty) => `${title}\n${rows.length ? rows.map((r) => '- ' + r).join('\n') : '- ' + empty}`;
  return [`Shift report, ${me.name}, ${day}`, '',
    sec('Done today', did, 'Nothing logged in the portal yet.'), '',
    sec('Needs you', needs, 'Nothing waiting on you.'), '',
    sec('Watching', watch, 'Nothing stale.'), '',
    'Anything else:', '- '].join('\n');
}

export default async (req) => {
  const slug = cookieSlug(req);
  if (!slug) return Response.json({ error: 'login required' }, { status: 401 });
  const roster = await loadRoster();
  const me = roster.find((r) => r.slug === slug && r.active);
  if (!me) return Response.json({ error: 'login required' }, { status: 401 });
  if (!['admin', 'head', 'ea'].includes(me.role)) return Response.json({ error: 'not allowed' }, { status: 403 });
  if (me.role === 'ea' && !(await isTechOnboarded(me))) {
    return Response.json({ error: 'Finish onboarding first.', needsOnboarding: true }, { status: 403 });
  }
  const key = `reports-${me.slug}.json`;
  const log = (await store().get(key, { type: 'json' })) || [];
  const { day } = todayRange();
  const sentToday = log.filter((r) => r.day === day).length;

  if (req.method === 'GET') return Response.json({ draft: await buildDraft(me, roster), sentToday, maxPerDay: MAX_PER_DAY });
  if (req.method !== 'POST') return new Response('nope', { status: 405 });

  const body = await req.json().catch(() => ({}));
  if (body.action !== 'send') return Response.json({ error: 'unknown action' }, { status: 400 });
  const text = String(body.text || '').trim().slice(0, 3500);
  if (text.length < 20) return Response.json({ error: 'The report is empty.' }, { status: 400 });
  if (sentToday >= MAX_PER_DAY) return Response.json({ error: `You already sent ${MAX_PER_DAY} reports today.` }, { status: 429 });
  const ok = await tgSend(`\u{1F4DD} <b>Shift report from ${escTg(me.name)}</b>\n\n${escTg(text)}`);
  if (!ok) return Response.json({ error: 'Could not send right now. Your text is still here, try again in a minute.' }, { status: 502 });
  log.unshift({ day, ts: Date.now(), text });
  await store().setJSON(key, log.slice(0, 30));
  return Response.json({ ok: true, sentToday: sentToday + 1 });
};
