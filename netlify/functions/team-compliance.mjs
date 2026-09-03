// Compliance gate for The Floor. Every sales team member must sign the required
// documents (see legal-docs.mjs) before they can operate. Built-in click-to-sign:
// the signer types their full legal name and ticks each acknowledgement; we record
// name + timestamp + IP + user-agent + document version.
//
// GET                      -> my status: { enforced, exempt, complete, name, docs:[{key,title,version,order,signed,signedAt}] }
// GET ?doc=<key>           -> one document: { key, title, version, body, acks }
// GET ?team=1              -> (lead/head/admin) compliance summary for my downline (lead) or everyone (head/admin)
// GET ?config=1            -> (admin) { enforced }
// POST {action:'sign', doc, legalName, acks:[bool,...]} -> record a signature
// POST {action:'enforce', on:true|false}                -> (admin) turn the gate on/off
//
// Other functions import isCompliant() to hard-lock actions server-side.
import { getStore } from '@netlify/blobs';
import { cookieSlug, loadRoster } from './team-auth.mjs';
import { DOCS, docByKey, EXEMPT_ROLES } from './legal-docs.mjs';
import { logEvent, tgPing } from './team-events.mjs';

const store = () => getStore({ name: 'sales-team', consistency: 'strong' });

export async function loadConfig() {
  const c = await store().get('compliance-config.json', { type: 'json' });
  return { enforced: false, ...(c || {}) };   // ships OFF until Brad flips it on
}
const recKey = (slug) => `compliance-${slug}.json`;
const loadRecord = async (slug) => (await store().get(recKey(slug), { type: 'json' })) || { slug, signatures: {} };

// Signed at the CURRENT version of every required doc?
function isRecordComplete(rec) {
  return DOCS.every((d) => rec.signatures?.[d.key]?.version === d.version);
}

// The guard other functions call. Returns true when the member may operate.
export async function isCompliant(meOrSlug, roster) {
  const cfg = await loadConfig();
  if (!cfg.enforced) return true;
  const rep = typeof meOrSlug === 'string'
    ? (roster || await loadRoster()).find((r) => r.slug === meOrSlug)
    : meOrSlug;
  if (!rep) return false;
  if (EXEMPT_ROLES.includes(rep.role)) return true;
  return isRecordComplete(await loadRecord(rep.slug));
}

const clientIp = (req) =>
  req.headers.get('x-nf-client-connection-ip') ||
  (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
  '';

function myStatus(rep, cfg, rec) {
  return {
    enforced: cfg.enforced,
    exempt: EXEMPT_ROLES.includes(rep.role),
    complete: EXEMPT_ROLES.includes(rep.role) || isRecordComplete(rec),
    name: rep.name,
    role: rep.role,
    docs: DOCS.map((d) => {
      const s = rec.signatures?.[d.key];
      return {
        key: d.key, title: d.title, version: d.version, order: d.order,
        signed: !!s && s.version === d.version,
        signedAt: s?.signedAt || null,
        signedName: s?.legalName || null,
      };
    }).sort((a, b) => a.order - b.order),
  };
}

export default async (req) => {
  const slug = cookieSlug(req);
  if (!slug) return Response.json({ error: 'login required' }, { status: 401 });
  const roster = await loadRoster();
  const me = roster.find((r) => r.slug === slug && r.active);
  if (!me) return Response.json({ error: 'login required' }, { status: 401 });
  const cfg = await loadConfig();

  if (req.method === 'GET') {
    const url = new URL(req.url);

    const docKey = url.searchParams.get('doc');
    if (docKey) {
      const d = docByKey(docKey);
      if (!d) return Response.json({ error: 'no such document' }, { status: 404 });
      return Response.json({ key: d.key, title: d.title, version: d.version, body: d.body, acks: d.acks });
    }

    if (url.searchParams.get('config') && me.role === 'admin') {
      return Response.json({ enforced: cfg.enforced });
    }

    if (url.searchParams.get('team')) {
      if (!['admin', 'head', 'lead'].includes(me.role)) return Response.json({ error: 'not allowed' }, { status: 403 });
      // head/admin see everyone active; a lead sees only reps they recruited.
      const scope = ['admin', 'head'].includes(me.role)
        ? roster.filter((r) => r.active && r.slug !== me.slug)
        : roster.filter((r) => r.active && r.recruiterSlug === me.slug);
      const team = await Promise.all(scope.map(async (r) => {
        const rec = await loadRecord(r.slug);
        const signed = DOCS.filter((d) => rec.signatures?.[d.key]?.version === d.version).length;
        return {
          slug: r.slug, name: r.name, role: r.role, code: r.code,
          recruiterSlug: r.recruiterSlug || null,
          signed, total: DOCS.length,
          complete: EXEMPT_ROLES.includes(r.role) || signed === DOCS.length,
        };
      }));
      return Response.json({ enforced: cfg.enforced, team });
    }

    return Response.json(myStatus(me, cfg, await loadRecord(me.slug)));
  }

  if (req.method !== 'POST') return new Response('nope', { status: 405 });
  const body = await req.json().catch(() => ({}));

  if (body.action === 'enforce') {
    if (me.role !== 'admin') return Response.json({ error: 'not allowed' }, { status: 403 });
    const on = !!body.on;
    await store().setJSON('compliance-config.json', { enforced: on });
    return Response.json({ ok: true, enforced: on });
  }

  if (body.action === 'sign') {
    const d = docByKey(String(body.doc || ''));
    if (!d) return Response.json({ error: 'no such document' }, { status: 404 });
    const legalName = String(body.legalName || '').trim();
    if (legalName.length < 3 || !/[a-z]/i.test(legalName)) {
      return Response.json({ error: 'Type your full legal name to sign.' }, { status: 400 });
    }
    const acks = Array.isArray(body.acks) ? body.acks : [];
    if (acks.length !== d.acks.length || !acks.every(Boolean)) {
      return Response.json({ error: 'Please check every box to sign.' }, { status: 400 });
    }
    const rec = await loadRecord(me.slug);
    rec.slug = me.slug;
    rec.signatures = rec.signatures || {};
    const wasComplete = isRecordComplete(rec);
    rec.signatures[d.key] = {
      legalName,
      version: d.version,
      signedAt: new Date().toISOString(),
      ip: clientIp(req),
      ua: req.headers.get('user-agent') || '',
      acks: d.acks,                 // the exact statements agreed to, for the record
    };
    await store().setJSON(recKey(me.slug), rec);

    const nowComplete = isRecordComplete(rec);
    if (nowComplete && !wasComplete) {
      logEvent({ type: 'join', who: me.name, text: `${me.name} completed compliance and is cleared to sell ✅` }).catch(() => {});
      tgPing(`✅ <b>Compliance complete</b>\n${me.name} signed all onboarding documents and is cleared to operate on The Floor.`).catch(() => {});
    }
    return Response.json(myStatus(me, cfg, rec));
  }

  return Response.json({ error: 'unknown action' }, { status: 400 });
};
