// Sales team portal auth. Rep logs in with an access code, gets a signed cookie.
// Admins (role head/admin) can add reps: POST {action:"add", name} while logged in.
import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';
import { logEvent } from './team-events.mjs';

const SECRET = process.env.TEAM_LINK_SECRET || '';
const COOKIE = 'ew_team';
const THIRTY_D = 30 * 24 * 3600;

// Access codes never live in source (this repo is public). The seed admin/head codes
// come from Netlify env vars; if they are missing the seed entries are INACTIVE and get
// an unguessable random code, so a published fallback can never grant access.
const randCode = () => `EW-SEED-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
const ADMIN_CODE = process.env.EW_ADMIN_CODE || '';
const HEAD_CODE = process.env.EW_HEAD_CODE || '';
const DEFAULT_ROSTER = [
  { slug: 'brad', name: 'Brad Palmer', code: ADMIN_CODE || randCode(), role: 'admin', active: !!ADMIN_CODE },
  { slug: 'cash', name: 'Seemore Cash', code: HEAD_CODE || randCode(), role: 'head', active: !!HEAD_CODE },
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
// 6 random base-32 chars (no confusable 0/O/1/I/L) ≈ 1 billion combos, not a guessable 4-digit tail.
const B32 = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const randTail = () => Array.from(crypto.randomBytes(6)).map((b) => B32[b % B32.length]).join('');
const newCode = (slug) => `EW-${slug.slice(0, 6).toUpperCase().replace(/-/g, '')}-${randTail()}`;

// Brute-force throttle: too many failed logins from one IP triggers a short lockout.
// Serverless-safe (state in Blobs). Successful login clears the counter.
const clientIp = (req) => req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
const THROTTLE_MAX = 10;            // failed attempts allowed
const THROTTLE_WINDOW = 10 * 60e3; // within 10 minutes
const THROTTLE_LOCK = 15 * 60e3;   // then locked for 15 minutes
async function throttleState(store, ip) {
  const all = (await store.get('auth-throttle.json', { type: 'json' })) || {};
  return { all, rec: all[ip] || { fails: 0, first: 0, until: 0 } };
}
async function noteFail(store, ip) {
  const { all, rec } = await throttleState(store, ip);
  const now = Date.now();
  if (now - rec.first > THROTTLE_WINDOW) { rec.fails = 0; rec.first = now; }
  rec.fails += 1;
  if (rec.fails >= THROTTLE_MAX) rec.until = now + THROTTLE_LOCK;
  all[ip] = rec;
  await store.setJSON('auth-throttle.json', all);
}
async function clearFail(store, ip) {
  const { all } = await throttleState(store, ip);
  if (all[ip]) { delete all[ip]; await store.setJSON('auth-throttle.json', all); }
}

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
    // admin/head can add sales reps, tech contractors or the executive assistant; leads always add reps
    const role = (['admin', 'head'].includes(me.role) && ['rep', 'tech', 'ea'].includes(body.role)) ? body.role : 'rep';
    if (role === 'ea') recruiterSlug = null; // the EA sits outside every sales downline
    const rep = { slug: s, name, code: newCode(s), role, recruiterSlug, active: true };
    roster.push(rep);
    await getStore({ name: 'sales-team', consistency: 'strong' }).setJSON('roster.json', roster);
    if (!['tech', 'ea'].includes(role)) logEvent({ type: 'join', who: name, text: `${name} joined The Floor. Welcome to the team \u{1F44A}` }).catch(() => {});
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

  // Rotate an access code. Admin only. Pass {slug} for a fresh random code, or {slug, code}
  // to set a specific one. Used to retire any code that may have been exposed.
  if (body.action === 'setcode') {
    const meSlug = cookieSlug(req);
    const me = roster.find((r) => r.slug === meSlug && r.active);
    if (!me || me.role !== 'admin') return Response.json({ error: 'not allowed' }, { status: 403 });
    const target = roster.find((r) => r.slug === String(body.slug || '') && r.active);
    if (!target) return Response.json({ error: 'not found' }, { status: 404 });
    const norm = (v) => String(v || '').toUpperCase().replace(/[‐-―−]/g, '-').replace(/[^A-Z0-9-]/g, '');
    let code = body.code ? norm(body.code) : newCode(target.slug);
    if (code.length < 8) return Response.json({ error: 'code too short' }, { status: 400 });
    if (roster.some((r) => r.slug !== target.slug && norm(r.code) === code)) return Response.json({ error: 'code in use' }, { status: 409 });
    target.code = code;
    await getStore({ name: 'sales-team', consistency: 'strong' }).setJSON('roster.json', roster);
    return Response.json({ ok: true, slug: target.slug, code });
  }

  // login — throttle brute force first, then normalize the code the same way the client
  // does, so a phone's curly dashes, stray spaces or lowercase still match.
  const store = getStore({ name: 'sales-team', consistency: 'strong' });
  const ip = clientIp(req);
  const { rec } = await throttleState(store, ip);
  if (rec.until && Date.now() < rec.until) {
    return Response.json({ error: 'Too many attempts. Wait a few minutes and try again.' }, { status: 429 });
  }
  const norm = (v) => String(v || '').toUpperCase().replace(/[‐-―−]/g, '-').replace(/[^A-Z0-9-]/g, '');
  const code = norm(body.code);
  const rep = roster.find((r) => norm(r.code) === code && r.active);
  if (!rep) { await noteFail(store, ip); return Response.json({ error: 'invalid code' }, { status: 401 }); }
  await clearFail(store, ip);
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
