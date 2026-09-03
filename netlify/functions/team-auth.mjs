// Sales team portal auth. Rep logs in with an access code, gets a signed cookie.
// Admins (role head/admin) can add reps: POST {action:"add", name} while logged in.
import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';
import { logEvent } from './team-events.mjs';

const SECRET = process.env.TEAM_LINK_SECRET || '';
const COOKIE = 'ew_team';
const THIRTY_D = 30 * 24 * 3600;

const DEFAULT_ROSTER = [
  { slug: 'brad', name: 'Brad Palmer', code: 'EW-BRAD-4471', role: 'admin', active: true },
  { slug: 'cash', name: 'Seemore Cash', code: 'EW-CASH-2088', role: 'head', active: true },
];

function sign(payload) {
  const mac = crypto.createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 32);
  return `${Buffer.from(payload).toString('base64url')}.${mac}`;
}

export function verify(token) {
  try {
    const [b64, mac] = token.split('.');
    const payload = Buffer.from(b64, 'base64url').toString();
    const expect = crypto.createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 32);
    if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expect))) return null;
    const { slug, exp } = JSON.parse(payload);
    if (Date.now() / 1000 > exp) return null;
    return slug;
  } catch { return null; }
}

export function cookieSlug(req) {
  const raw = req.headers.get('cookie') || '';
  const m = raw.match(new RegExp(`${COOKIE}=([^;]+)`));
  return m ? verify(m[1]) : null;
}

export async function loadRoster() {
  const store = getStore({ name: 'sales-team', consistency: 'strong' });
  let roster = await store.get('roster.json', { type: 'json' });
  if (!roster || !roster.length) {
    roster = DEFAULT_ROSTER;
    await store.setJSON('roster.json', roster);
  }
  return roster;
}

const slugify = (n) => n.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const newCode = (slug) => `EW-${slug.slice(0, 6).toUpperCase().replace(/-/g, '')}-${crypto.randomInt(1000, 9999)}`;

export default async (req) => {
  if (!SECRET) return Response.json({ error: 'portal not configured' }, { status: 500 });
  const roster = await loadRoster();

  if (req.method === 'GET') {
    const slug = cookieSlug(req);
    const rep = roster.find((r) => r.slug === slug && r.active);
    if (!rep) return Response.json({ ok: false }, { status: 401 });
    const out = { ok: true, rep: { slug: rep.slug, name: rep.name, role: rep.role, recruiterSlug: rep.recruiterSlug || null } };
    if (new URL(req.url).searchParams.get('roster')) {
      if (['admin', 'head'].includes(rep.role)) {
        out.roster = roster.filter((r) => r.active).map((r) => ({ slug: r.slug, name: r.name, role: r.role, recruiterSlug: r.recruiterSlug || null }));
      } else if (rep.role === 'lead') {
        // a lead sees only the reps they recruited
        out.roster = roster.filter((r) => r.active && r.recruiterSlug === rep.slug).map((r) => ({ slug: r.slug, name: r.name, role: r.role }));
      }
    }
    return Response.json(out);
  }

  if (req.method !== 'POST') return new Response('nope', { status: 405 });
  const body = await req.json().catch(() => ({}));

  if (body.action === 'logout') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json',
        'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` },
    });
  }

  if (body.action === 'add') {
    const slug = cookieSlug(req);
    const me = roster.find((r) => r.slug === slug && r.active);
    // admin/head can add anyone; a lead can recruit reps into their own downline
    if (!me || !['admin', 'head', 'lead'].includes(me.role)) return Response.json({ error: 'not allowed' }, { status: 403 });
    const name = String(body.name || '').trim();
    if (!name || name.length > 60) return Response.json({ error: 'bad name' }, { status: 400 });
    const s = slugify(name);
    if (roster.some((r) => r.slug === s)) return Response.json({ error: 'rep exists' }, { status: 409 });
    // a lead's recruits sit under them; admin/head may target a lead via recruiterSlug, else top-level
    let recruiterSlug = null;
    if (me.role === 'lead') recruiterSlug = me.slug;
    else if (body.recruiterSlug) {
      const up = roster.find((r) => r.slug === String(body.recruiterSlug) && r.active);
      if (up) recruiterSlug = up.slug;
    }
    // admin/head can add sales reps or tech contractors; leads always add reps
    const role = (['admin', 'head'].includes(me.role) && ['rep', 'tech'].includes(body.role)) ? body.role : 'rep';
    const rep = { slug: s, name, code: newCode(s), role, recruiterSlug, active: true };
    roster.push(rep);
    await getStore({ name: 'sales-team', consistency: 'strong' }).setJSON('roster.json', roster);
    if (role !== 'tech') logEvent({ type: 'join', who: name, text: `${name} joined The Floor. Welcome to the team \u{1F44A}` }).catch(() => {});
    return Response.json({ ok: true, rep });
  }

  if (body.action === 'deactivate') {
    const meSlug = cookieSlug(req);
    const me = roster.find((r) => r.slug === meSlug && r.active);
    if (!me || !['admin', 'head', 'lead'].includes(me.role)) return Response.json({ error: 'not allowed' }, { status: 403 });
    const target = roster.find((r) => r.slug === String(body.slug || ''));
    if (!target) return Response.json({ error: 'not found' }, { status: 404 });
    if (['admin', 'head'].includes(target.role)) return Response.json({ error: 'cannot remove admins here' }, { status: 400 });
    // a lead can only remove reps in their own downline
    if (me.role === 'lead' && target.recruiterSlug !== me.slug) return Response.json({ error: 'not your rep' }, { status: 403 });
    target.active = false;
    await getStore({ name: 'sales-team', consistency: 'strong' }).setJSON('roster.json', roster);
    return Response.json({ ok: true });
  }

  // Promote a rep to Pod Lead (the "team version") or demote back. Admin/head only.
  if (body.action === 'setrole') {
    const meSlug = cookieSlug(req);
    const me = roster.find((r) => r.slug === meSlug && r.active);
    if (!me || !['admin', 'head'].includes(me.role)) return Response.json({ error: 'not allowed' }, { status: 403 });
    const target = roster.find((r) => r.slug === String(body.slug || '') && r.active);
    if (!target) return Response.json({ error: 'not found' }, { status: 404 });
    if (!['rep', 'lead'].includes(target.role)) return Response.json({ error: 'can only change rep or lead' }, { status: 400 });
    const nr = String(body.role || '');
    if (!['rep', 'lead'].includes(nr)) return Response.json({ error: 'bad role' }, { status: 400 });
    target.role = nr;
    await getStore({ name: 'sales-team', consistency: 'strong' }).setJSON('roster.json', roster);
    return Response.json({ ok: true, role: nr });
  }

  // login
  const code = String(body.code || '').trim().toUpperCase();
  const rep = roster.find((r) => r.code === code && r.active);
  if (!rep) return Response.json({ error: 'invalid code' }, { status: 401 });
  const exp = Math.floor(Date.now() / 1000) + THIRTY_D;
  const token = sign(JSON.stringify({ slug: rep.slug, exp }));
  return new Response(JSON.stringify({ ok: true, rep: { slug: rep.slug, name: rep.name, role: rep.role } }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `${COOKIE}=${token}; Path=/; Max-Age=${THIRTY_D}; HttpOnly; Secure; SameSite=Lax`,
    },
  });
};
