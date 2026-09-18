// Deep checks for a Scan, run in the background. Measured PageSpeed (15 to 40 s) and the local
// competitor benchmark both take longer than a synchronous Netlify function may run, so scan.mjs
// answers fast with its own speed estimate, flags what is pending on the record, and fires this
// job. It runs both checks in parallel, fills each piece onto the stored record, re-scores, clears
// the pending flags (done or failed, either way, so the page stops polling), and the page picks
// the new numbers up by polling.
//
//   POST /api/scan-speed  { id }     (Netlify background function: returns 202 immediately)
import { getStore } from '@netlify/blobs';
import { score as scoreModel } from './scan-model.mjs';

const store = () => getStore({ name: 'scan', consistency: 'strong' });
const withTimeout = (p, ms, fallback) => Promise.race([p, new Promise((r) => setTimeout(() => r(fallback), ms))]).catch(() => fallback);

// --- measured mobile speed ------------------------------------------------------------------------
async function measureSpeed(rec) {
  const key = process.env.PSI_API_KEY;
  if (!key || !rec.input?.url || !rec.checks?.site?.reachable) return null;
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 110_000);
  try {
    const r = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(rec.checks.site.finalUrl || rec.input.url)}&strategy=mobile&category=performance&key=${key}`, { signal: ctrl.signal });
    const d = await r.json(); const lr = d.lighthouseResult;
    if (!r.ok || !lr) { console.log('psi failed', rec.id, d.error?.message || r.status); return null; }
    return { score: Math.round((lr.categories?.performance?.score ?? 0) * 100), lcp: lr.audits?.['largest-contentful-paint']?.displayValue, cls: lr.audits?.['cumulative-layout-shift']?.displayValue, tbt: lr.audits?.['total-blocking-time']?.displayValue, source: 'pagespeed', at: new Date().toISOString() };
  } catch (e) { console.log('psi error', rec.id, e.message); return null; }
  finally { clearTimeout(t); }
}

// --- local competitor benchmark ---------------------------------------------------------------------
// Where does this business sit against the places it actually competes with? Nearby search around
// its own location for its own primary type, ranked by review count then rating. The single most
// persuasive line on the result, and the thing that makes the Rating feel justified rather than
// arbitrary: "you are #4 of 9 nearby dentists on Google".
const PLURAL = { real_estate_agency: 'real estate agencies', hair_care: 'hair salons', car_dealer: 'dealerships', beauty_salon: 'beauty salons', physiotherapist: 'physiotherapists', dentist: 'dentists', spa: 'spas', restaurant: 'restaurants', plumber: 'plumbers', electrician: 'electricians', lawyer: 'law firms', roofing_contractor: 'roofers', general_contractor: 'contractors', veterinary_care: 'vets', chiropractor: 'chiropractors' };
const labelOf = (type) => PLURAL[type] || `${String(type).replace(/_/g, ' ')}s`;

async function benchmark(rec) {
  const key = process.env.GOOGLE_PLACES_KEY; const prof = rec.checks?.profile;
  if (!key || !prof?.found || !prof.location) return null;
  const type = prof.primaryType || (prof.types || [])[0];
  if (!type) return null;
  const r = await withTimeout(fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount' },
    body: JSON.stringify({ includedTypes: [type], maxResultCount: 12, locationRestriction: { circle: { center: { latitude: prof.location.latitude, longitude: prof.location.longitude }, radius: 4000 } } }),
  }), 15_000, null);
  if (!r || !r.ok) { console.log('nearby failed', rec.id, r ? r.status : 'timeout'); return null; }
  const d = await r.json();
  let places = (d.places || []).map((p) => ({ id: p.id, name: p.displayName?.text || '', rating: p.rating ?? 0, reviews: p.userRatingCount ?? 0 }));
  // Make sure the business itself is in the set even if the nearby search did not return it.
  if (!places.some((p) => p.id === prof.id)) places.push({ id: prof.id, name: prof.name || '', rating: prof.rating ?? 0, reviews: prof.reviews ?? 0 });
  places.sort((a, b) => (b.reviews - a.reviews) || (b.rating - a.rating));
  const rank = places.findIndex((p) => p.id === prof.id) + 1;
  const leader = places[0]; const you = places[rank - 1];
  return {
    rank, of: places.length, type, typeLabel: labelOf(type),
    leader: leader && leader.id !== prof.id ? { name: leader.name, rating: leader.rating, reviews: leader.reviews } : null,
    you: { rating: you.rating, reviews: you.reviews },
    peers: places.slice(0, 10).map(({ name, rating, reviews }) => ({ name, rating, reviews })),
    at: new Date().toISOString(),
  };
}

// --- handler --------------------------------------------------------------------------------------------
export default async (req) => {
  let body; try { body = await req.json(); } catch { return new Response('bad json', { status: 400 }); }
  const id = String(body.id || '').slice(0, 40);
  if (!id) return new Response('', { status: 202 });
  const rec = await store().get(id, { type: 'json' });
  if (!rec) return new Response('', { status: 202 });
  const pending = rec.pending || { speed: true, bench: true };   // records from before v2 carry no flags
  const [speed, bench] = await Promise.all([
    pending.speed ? measureSpeed(rec) : Promise.resolve(null),
    pending.bench ? benchmark(rec).catch((e) => { console.log('bench error', id, e.message); return null; }) : Promise.resolve(null),
  ]);
  const fresh = await store().get(id, { type: 'json' }); // re-read: the email gate may have written meanwhile
  if (!fresh) return new Response('', { status: 202 });
  if (speed) fresh.checks.speed = speed;
  if (bench) fresh.checks.benchmark = bench;
  fresh.pending = { speed: false, bench: false };
  fresh.result = scoreModel({ industry: fresh.input.industry, checks: fresh.checks, quiz: fresh.input.quiz, job: fresh.input.job });
  await store().setJSON(id, fresh, { metadata: { name: fresh.input.name, industry: fresh.input.industry, score: fresh.result.score, lead: fresh.lead ? 1 : 0 } });
  console.log('deep checks done', id, 'speed', speed?.score ?? 'n/a', 'rank', bench ? `${bench.rank}/${bench.of}` : 'n/a');
  return new Response('', { status: 202 });
};

export const config = { path: '/api/scan-speed' };
