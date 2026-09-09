// Background PageSpeed run for a Scan. A PageSpeed call takes 15 to 40 seconds and a
// synchronous Netlify function has to answer in 10, so scan.mjs answers with its own
// speed estimate and fires this job. It runs PageSpeed, replaces checks.speed on the
// stored record, re-scores, and the page picks the new numbers up by polling.
//
//   POST /api/scan-speed  { id }     (Netlify background function: returns 202 immediately)
import { getStore } from '@netlify/blobs';
import { score as scoreModel } from './scan-model.mjs';

const store = () => getStore({ name: 'scan', consistency: 'strong' });

export default async (req) => {
  let body; try { body = await req.json(); } catch { return new Response('bad json', { status: 400 }); }
  const id = String(body.id || '').slice(0, 40);
  const key = process.env.PSI_API_KEY;
  if (!id || !key) return new Response('', { status: 202 });
  const rec = await store().get(id, { type: 'json' });
  if (!rec || !rec.input?.url || !rec.checks?.site?.reachable) return new Response('', { status: 202 });
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 110_000);
    const r = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(rec.checks.site.finalUrl || rec.input.url)}&strategy=mobile&category=performance&key=${key}`, { signal: ctrl.signal });
    clearTimeout(t);
    const d = await r.json(); const lr = d.lighthouseResult;
    if (!r.ok || !lr) { console.log('psi failed', id, d.error?.message || r.status); return new Response('', { status: 202 }); }
    const fresh = await store().get(id, { type: 'json' }); // re-read: the gate may have written meanwhile
    if (!fresh) return new Response('', { status: 202 });
    fresh.checks.speed = { score: Math.round((lr.categories?.performance?.score ?? 0) * 100), lcp: lr.audits?.['largest-contentful-paint']?.displayValue, cls: lr.audits?.['cumulative-layout-shift']?.displayValue, tbt: lr.audits?.['total-blocking-time']?.displayValue, source: 'pagespeed', at: new Date().toISOString() };
    fresh.result = scoreModel({ industry: fresh.input.industry, checks: fresh.checks, quiz: fresh.input.quiz, job: fresh.input.job });
    await store().setJSON(id, fresh, { metadata: { name: fresh.input.name, industry: fresh.input.industry, score: fresh.result.score, lead: fresh.lead ? 1 : 0 } });
    console.log('psi ok', id, fresh.checks.speed.score);
  } catch (e) { console.log('psi error', id, e.message); }
  return new Response('', { status: 202 });
};

export const config = { path: '/api/scan-speed' };
