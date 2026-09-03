// Training progress + team incentive.
// GET  -> { progress: [moduleIds], incentive }
// POST {module}                        -> mark a training module complete (one-time)
// POST {action:'incentive', title, detail, until} -> head/admin sets the incentive banner
import { getStore } from '@netlify/blobs';
import { cookieSlug, loadRoster } from './team-auth.mjs';
import { logEvent } from './team-events.mjs';

export const MODULES = ['kit', 'prospect', 'terminology', 'discovery', 'demo', 'closing', 'faq'];

export async function loadProgress(slug) {
  const store = getStore({ name: 'sales-team', consistency: 'strong' });
  return (await store.get(`progress-${slug}.json`, { type: 'json' })) || { done: [] };
}

export async function loadIncentive() {
  const store = getStore({ name: 'sales-team', consistency: 'strong' });
  return (await store.get('incentive.json', { type: 'json' })) || null;
}

export default async (req) => {
  const slug = cookieSlug(req);
  if (!slug) return Response.json({ error: 'login required' }, { status: 401 });
  const roster = await loadRoster();
  const me = roster.find((r) => r.slug === slug && r.active);
  if (!me) return Response.json({ error: 'login required' }, { status: 401 });
  const store = getStore({ name: 'sales-team', consistency: 'strong' });

  if (req.method === 'GET') {
    const p = await loadProgress(slug);
    return Response.json({ progress: p.done, incentive: await loadIncentive() });
  }
  if (req.method !== 'POST') return new Response('nope', { status: 405 });
  const body = await req.json().catch(() => ({}));

  if (body.action === 'incentive') {
    if (!['admin', 'head'].includes(me.role)) return Response.json({ error: 'not allowed' }, { status: 403 });
    const inc = {
      title: String(body.title || '').slice(0, 90),
      detail: String(body.detail || '').slice(0, 200),
      until: String(body.until || '').slice(0, 30),
      setBy: me.name,
      ts: Date.now(),
    };
    if (!inc.title) { await store.delete('incentive.json'); return Response.json({ ok: true, incentive: null }); }
    await store.setJSON('incentive.json', inc);
    logEvent({ type: 'incentive', who: me.name, text: `${me.name} set a new incentive: ${inc.title}` }).catch(() => {});
    return Response.json({ ok: true, incentive: inc });
  }

  const mod = String(body.module || '');
  if (!MODULES.includes(mod)) return Response.json({ error: 'unknown module' }, { status: 400 });
  const p = await loadProgress(slug);
  if (!p.done.includes(mod)) {
    p.done.push(mod);
    p[mod] = Date.now();
    await store.setJSON(`progress-${slug}.json`, p);
    const label = { kit: 'The Program', prospect: 'Find & Reach', terminology: 'Talk the Talk', discovery: 'The Discovery', demo: 'The Demo Call', closing: 'The Close', faq: 'Objections & FAQ' }[mod] || mod;
    logEvent({ type: 'training', who: me.name, text: `${me.name} completed training: ${label}${p.done.length >= MODULES.length ? ' \u2014 CERTIFIED \u2705' : ''}` }).catch(() => {});
  }
  return Response.json({ ok: true, progress: p.done });
};
