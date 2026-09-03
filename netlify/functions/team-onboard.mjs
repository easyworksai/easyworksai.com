// Tech contractor onboarding: profile details + demo-seen flag.
// A tech member can't work the board until they've (1) filled their profile,
// (2) signed the onboarding documents (team-compliance), and (3) seen the demo.
// GET  -> { role, name, profileComplete, profile, docsComplete, demoSeen }
// POST {action:'profile', ...fields} -> save contact/pay details
// POST {action:'demo-done'}          -> mark the walkthrough seen
import { getStore } from '@netlify/blobs';
import { cookieSlug, loadRoster } from './team-auth.mjs';
import { DOCS } from './legal-docs.mjs';

const store = () => getStore({ name: 'sales-team', consistency: 'strong' });
const pkey = (slug) => `tech-profile-${slug}.json`;

async function docsComplete(slug) {
  const rec = await store().get(`compliance-${slug}.json`, { type: 'json' });
  const sigs = (rec && rec.signatures) || {};
  return DOCS.every((d) => sigs[d.key] && sigs[d.key].version === d.version);
}

// Exported guard used by team-tasks: a tech may operate only when fully onboarded.
export async function isTechOnboarded(rep) {
  if (!rep) return false;
  if (rep.role !== 'tech') return true; // non-tech roles aren't gated by this flow
  const prof = await store().get(pkey(rep.slug), { type: 'json' });
  if (!prof || !prof.complete) return false;
  return docsComplete(rep.slug);
}

export default async (req) => {
  const slug = cookieSlug(req);
  if (!slug) return Response.json({ error: 'login required' }, { status: 401 });
  const roster = await loadRoster();
  const me = roster.find((r) => r.slug === slug && r.active);
  if (!me) return Response.json({ error: 'login required' }, { status: 401 });

  const statusFor = async (rep) => {
    const prof = (await store().get(pkey(rep.slug), { type: 'json' })) || {};
    return {
      role: rep.role, name: rep.name, slug: rep.slug,
      profileComplete: !!prof.complete,
      profile: { email: prof.email || '', contact: prof.contact || '', country: prof.country || '',
        timezone: prof.timezone || '', skill: prof.skill || '', payType: prof.payType || '', payDetail: prof.payDetail || '' },
      docsComplete: await docsComplete(rep.slug),
      demoSeen: !!prof.demoSeen,
      updated: prof.updated || null,
    };
  };

  if (req.method === 'GET') {
    // admin/head may look up any active member's onboarding + details (to administer + pay them)
    const target = new URL(req.url).searchParams.get('slug');
    if (target && target !== slug) {
      if (!['admin', 'head'].includes(me.role)) return Response.json({ error: 'not allowed' }, { status: 403 });
      const rep = roster.find((r) => r.slug === target && r.active);
      if (!rep) return Response.json({ error: 'not found' }, { status: 404 });
      return Response.json(await statusFor(rep));
    }
    return Response.json(await statusFor(me));
  }

  if (req.method !== 'POST') return new Response('nope', { status: 405 });
  const body = await req.json().catch(() => ({}));
  const clean = (v, n = 140) => String(v || '').trim().slice(0, n);

  if (body.action === 'profile') {
    const p = (await store().get(pkey(slug), { type: 'json' })) || {};
    p.email = clean(body.email); p.contact = clean(body.contact); p.country = clean(body.country);
    p.timezone = clean(body.timezone); p.skill = clean(body.skill);
    p.payType = clean(body.payType, 30); p.payDetail = clean(body.payDetail);
    p.complete = !!(p.email && p.contact && p.skill);
    p.updated = Date.now();
    await store().setJSON(pkey(slug), p);
    return Response.json({ ok: true, profileComplete: p.complete });
  }

  if (body.action === 'demo-done') {
    const p = (await store().get(pkey(slug), { type: 'json' })) || {};
    p.demoSeen = true; await store().setJSON(pkey(slug), p);
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'unknown action' }, { status: 400 });
};
