// "Today" for the EA: what needs a push right now, read straight from GHL plus the Bench. READ ONLY.
// GHL stays the record: nothing here is stored except a 5 minute cache so we stay inside GHL's rate limits.
//
// GET            -> { refreshedAt, meetings, stuck, scanLeads, bench, errors }
// GET ?refresh=1 -> same, skipping the cache (at most once a minute)
//
// Roles: admin, head, ea (an EA must be onboarded). No dollar values and no phone numbers ever leave this
// function. Links into GHL are included for admin/head only: the EA has no GHL login.
import { getStore } from '@netlify/blobs';
import { cookieSlug, loadRoster } from './team-auth.mjs';
import { isTechOnboarded } from './team-onboard.mjs';
import { ghlFetch, ghlReady, GHL_LOC, PIPELINE_ID, STAGE } from './ghl.mjs';

const TZ = 'America/Vancouver';
const CACHE_MS = 5 * 60 * 1000;
// days a deal may sit in a stage before it counts as stuck
const STUCK_DAYS = { [STAGE.new]: 2, [STAGE.contacted]: 5, [STAGE.meeting]: 7, [STAGE.proposal]: 7 };
const STAGE_NAME = { [STAGE.new]: 'New Lead', [STAGE.contacted]: 'Contacted', [STAGE.meeting]: 'Demo Booked', [STAGE.proposal]: 'Proposal Sent' };
const store = () => getStore({ name: 'sales-team', consistency: 'strong' });

// Start and end of "today" in Vancouver, as UTC ms.
function todayRange(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(now).filter((p) => p.type !== 'literal').map((p) => [p.type, +p.value]));
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second);
  const offset = asUtc - Math.floor(now.getTime() / 1000) * 1000; // tz offset right now
  const start = Date.UTC(parts.year, parts.month - 1, parts.day) - offset;
  return { start, end: start + 86400e3, day: `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}` };
}

async function loadMeetings(errors) {
  const cals = await ghlFetch(`/calendars/?locationId=${GHL_LOC}`);
  if (!cals.ok) { errors.push('meetings'); return []; }
  const { start, end } = todayRange();
  const out = [];
  for (const cal of (cals.json.calendars || []).filter((c) => c.isActive !== false)) {
    const r = await ghlFetch(`/calendars/events?locationId=${GHL_LOC}&calendarId=${cal.id}&startTime=${start}&endTime=${end}`);
    if (!r.ok) { if (!errors.includes('meetings')) errors.push('meetings'); continue; }
    for (const e of r.json.events || []) {
      const status = e.appointmentStatus || e.appoinmentStatus || '';
      if (e.deleted || status === 'cancelled') continue;
      out.push({ start: e.startTime, end: e.endTime, title: String(e.title || 'Meeting').slice(0, 120),
        calendar: cal.name, status, contactId: e.contactId || null });
    }
  }
  return out.sort((a, b) => new Date(a.start) - new Date(b.start));
}

async function loadStuck(errors, claims, roster) {
  const r = await ghlFetch(`/opportunities/search?location_id=${GHL_LOC}&pipeline_id=${PIPELINE_ID}&status=open&limit=100`);
  if (!r.ok) { errors.push('stuck'); return []; }
  const repByOpp = Object.fromEntries(Object.values(claims).filter((c) => c.oppId).map((c) => [c.oppId, c.slug]));
  const nameOf = (slug) => (roster.find((x) => x.slug === slug) || {}).name || slug;
  const now = Date.now();
  return (r.json.opportunities || []).map((o) => {
    const limit = STUCK_DAYS[o.pipelineStageId];
    const since = new Date(o.lastStageChangeAt || o.createdAt || now).getTime();
    const days = Math.floor((now - since) / 86400e3);
    if (!limit || days < limit) return null;
    const tagRep = ((o.contact && o.contact.tags) || []).find((t) => t.startsWith('rep-'));
    const slug = repByOpp[o.id] || (tagRep ? tagRep.slice(4) : null);
    return { name: String(o.name || (o.contact && o.contact.name) || 'Deal').slice(0, 120), stage: STAGE_NAME[o.pipelineStageId],
      days, limit, rep: slug ? nameOf(slug) : null, oppId: o.id, contactId: o.contactId || (o.contact && o.contact.id) || null };
  }).filter(Boolean).sort((a, b) => b.days - a.days);
}

async function loadScanLeads(errors) {
  const r = await ghlFetch('/contacts/search', { method: 'POST', body: { locationId: GHL_LOC, pageLimit: 100,
    filters: [{ field: 'tags', operator: 'contains', value: 'scan' }] } });
  if (!r.ok) { errors.push('scanLeads'); return []; }
  const now = Date.now();
  return (r.json.contacts || []).filter((c) => {
    const tags = c.tags || [];
    const age = now - new Date(c.dateAdded || 0).getTime();
    return tags.includes('scan') && !c.assignedTo && !tags.some((t) => t.startsWith('rep-')) && age < 7 * 86400e3;
  }).map((c) => {
    const band = (c.tags || []).find((t) => t.startsWith('scan-'));
    return { name: String(c.businessName || c.companyName || c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'New lead').slice(0, 120),
      band: band ? band.slice(5).replace(/-/g, ' ') : null,
      days: Math.floor((now - new Date(c.dateAdded).getTime()) / 86400e3), contactId: c.id };
  }).sort((a, b) => a.days - b.days);
}

function loadBench(tasksData, roster) {
  const nameOf = (s) => (roster.find((r) => r.slug === s) || {}).name || s;
  const tasks = (tasksData.tasks || []).filter((t) => !t.deleted);
  const now = Date.now();
  const row = (t) => ({ id: t.id, title: t.title, client: t.client || null, priority: t.priority,
    assignee: t.assignee ? nameOf(t.assignee) : null, days: Math.floor((now - (t.up || t.ts)) / 86400e3) });
  return {
    blocked: tasks.filter((t) => t.status === 'blocked').map((t) => ({ ...row(t), why: t.blockedWhy || null })),
    review: tasks.filter((t) => t.status === 'review').map(row),
    nudged: tasks.filter((t) => t.nudgedAt && !['done', 'blocked', 'review'].includes(t.status)) // blocked/review already listed above.map((t) => ({ ...row(t), hours: Math.floor((now - t.nudgedAt) / 3600e3) })),
  };
}

export default async (req) => {
  const slug = cookieSlug(req);
  if (!slug) return Response.json({ error: 'login required' }, { status: 401 });
  const roster = await loadRoster();
  const me = roster.find((r) => r.slug === slug && r.active);
  if (!me) return Response.json({ error: 'login required' }, { status: 401 });
  if (!['admin', 'head', 'ea'].includes(me.role)) return Response.json({ error: 'not allowed' }, { status: 403 });
  if (req.method !== 'GET') return Response.json({ error: 'read only' }, { status: 405 });
  if (me.role === 'ea' && !(await isTechOnboarded(me))) {
    return Response.json({ error: 'Finish onboarding first.', needsOnboarding: true }, { status: 403 });
  }

  const s = store();
  const wantFresh = !!new URL(req.url).searchParams.get('refresh');
  let ghl = await s.get('today-cache.json', { type: 'json' });
  const age = ghl ? Date.now() - ghl.ts : Infinity;
  if (!ghl || age > CACHE_MS || (wantFresh && age > 60e3)) {
    const errors = [];
    if (!ghlReady()) errors.push('meetings', 'stuck', 'scanLeads');
    const claims = (await s.get('leads-claims.json', { type: 'json' })) || {};
    const [meetings, stuck, scanLeads] = ghlReady()
      ? await Promise.all([loadMeetings(errors), loadStuck(errors, claims, roster), loadScanLeads(errors)])
      : [[], [], []];
    ghl = { ts: Date.now(), day: todayRange().day, meetings, stuck, scanLeads, errors };
    // a fully failed read is not worth caching for 5 minutes: let the next open try again
    if (errors.length < 3) await s.setJSON('today-cache.json', ghl);
  }

  // Links into GHL only for people who have a GHL login.
  const canLink = ['admin', 'head'].includes(me.role);
  const link = (x) => {
    const { contactId, oppId, ...rest } = x;
    if (!canLink) return rest;
    const base = `https://app.gohighlevel.com/v2/location/${GHL_LOC}`;
    return { ...rest, link: contactId ? `${base}/contacts/detail/${contactId}` : oppId ? `${base}/opportunities/list` : `${base}/calendars/view` };
  };
  const tasksData = (await s.get('tasks.json', { type: 'json' })) || { tasks: [] };
  return Response.json({
    refreshedAt: ghl.ts, day: ghl.day, tz: TZ,
    meetings: ghl.meetings.map(link), stuck: ghl.stuck.map(link), scanLeads: ghl.scanLeads.map(link),
    bench: loadBench(tasksData, roster), // always live
    errors: ghl.errors,
  });
};
