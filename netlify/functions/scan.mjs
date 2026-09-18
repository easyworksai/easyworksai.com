// The Scan. POST runs the checks + scoring and stores the result; GET ?r=<id> reads one back.
//
//   POST /.netlify/functions/scan   { name, url, city, industry, quiz:{missed,reply,posting,reviews,ads,hours}, job }
//   GET  /.netlify/functions/scan?r=<id>
//
// Checks run in parallel with hard timeouts so the whole thing answers in ~10 s even
// when a site hangs. PageSpeed is used when PSI_API_KEY is set (the keyless quota is
// shared and usually exhausted); otherwise we measure what we can ourselves. Places is
// used when GOOGLE_PLACES_KEY is set; otherwise the profile pillar leans on the quiz.
import { getStore } from '@netlify/blobs';
import { score as scoreModel, INDUSTRIES } from './scan-model.mjs';

const store = () => getStore({ name: 'scan', consistency: 'strong' });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });
const withTimeout = (p, ms, fallback) => Promise.race([p, new Promise((r) => setTimeout(() => r(fallback), ms))]).catch(() => fallback);

function normalizeUrl(raw) {
  let u = String(raw || '').trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { const x = new URL(u); if (!/\./.test(x.hostname)) return null; return x.origin + (x.pathname === '/' ? '' : x.pathname); } catch { return null; }
}

// --- website check --------------------------------------------------------------------
async function checkSite(url) {
  if (!url) return { reachable: false, error: 'no website given' };
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
  const t0 = Date.now();
  let res, html = '';
  try {
    res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (compatible; EasyworksScan/1.0; +https://easyworks.ai/scan/)', accept: 'text/html' } });
    html = await res.text();
  } catch (e) { clearTimeout(t); return { reachable: false, error: e.name === 'AbortError' ? 'timed out after 8 s' : (e.cause?.code || e.message || 'fetch failed') }; }
  clearTimeout(t);
  const ttfb = Date.now() - t0;
  if (!res.ok) return { reachable: false, error: `HTTP ${res.status}` };
  const finalUrl = res.url || url;
  const h = html.slice(0, 400_000);
  const pick = (re) => { const m = h.match(re); return m ? m[1].replace(/\s+/g, ' ').trim() : ''; };
  const has = (re) => re.test(h);
  const lower = h.toLowerCase();
  const year = new Date().getFullYear();
  const site = {
    reachable: true, finalUrl, https: finalUrl.startsWith('https://'), ttfbMs: ttfb, bytes: html.length,
    title: pick(/<title[^>]*>([^<]*)<\/title>/i),
    description: pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || pick(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i),
    h1: pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, ''),
    canonical: has(/<link[^>]+rel=["']canonical["']/i),
    viewport: has(/<meta[^>]+name=["']viewport["']/i),
    schemaAny: has(/application\/ld\+json/i),
    schemaLocal: /"@type"\s*:\s*"?(LocalBusiness|Dentist|Physiotherapy|MedicalBusiness|HealthAndBeautyBusiness|HomeAndConstructionBusiness|RealEstateAgent|Restaurant|BeautySalon|DaySpa|Plumber|Electrician|HVACBusiness|RoofingContractor|GeneralContractor|ProfessionalService|Store|AutoRepair)/i.test(h),
    telLink: has(/href=["']tel:/i),
    phoneText: /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/.test(h.replace(/<[^>]+>/g, ' ')),
    form: has(/<form[\s>]/i) || /typeform|jotform|hubspot|gohighlevel|leadconnector/.test(lower),
    booking: /calendly|acuity|jane\.app|janeapp|squareup|booksy|vagaro|mindbody|fresha|setmore|zocdoc|book(ing)?[\s-]?(now|online|an? appointment)|schedule[\s-]?(now|online)|leadconnectorhq\.com\/widget\/booking|api\.leadconnectorhq\.com\/widget/.test(lower),
    chat: /tawk\.to|intercom|drift\.com|crisp\.chat|tidio|livechat|leadconnectorhq\.com\/loader|widgets\.leadconnectorhq|podium|birdeye|messenger\.com\/plugin|wa\.me/.test(lower),
    proof: /testimonial|reviews?|rated|stars|google-review|trustpilot|clients? say|customers? say|★|what people/.test(lower),
    fresh: new RegExp(`(©|&copy;|copyright)[^\\d]{0,20}(${year}|${year - 1})`, 'i').test(h) || h.includes(String(year)) || /id=["']year["']|new Date\(\)\.getFullYear/.test(h),
    scripts: (h.match(/<script[^>]+src=/gi) || []).length,
    images: (h.match(/<img[\s>]/gi) || []).length,
    // v2: presence across channels (Voice) and the systems wired into the site (Connection preview).
    social: ['instagram.com', 'facebook.com', 'linkedin.com', 'tiktok.com', 'youtube.com'].filter((d) => lower.includes(d)),
    crm: /leadconnector|gohighlevel|hubspot|salesforce|zoho|pipedrive|activecampaign|keap|jobber|housecall/.test(lower),
    sitemap: null,
  };
  try {
    const origin = new URL(finalUrl).origin;
    const sm = await withTimeout(fetch(origin + '/sitemap.xml', { method: 'GET', headers: { 'user-agent': 'EasyworksScan/1.0' } }), 4000, null);
    site.sitemap = !!(sm && sm.ok && /<(urlset|sitemapindex)/i.test((await sm.text()).slice(0, 2000)));
  } catch { site.sitemap = false; }
  return site;
}

// --- speed -------------------------------------------------------------------------------
async function checkSpeed(url, site) {
  if (!url || !site?.reachable) return { score: null, source: 'none' };
  const key = process.env.PSI_API_KEY;
  if (key) {
    const r = await withTimeout(fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&key=${key}`), 25000, null);
    if (r && r.ok) {
      const d = await r.json(); const lr = d.lighthouseResult;
      if (lr) return { score: Math.round((lr.categories?.performance?.score ?? 0) * 100), lcp: lr.audits?.['largest-contentful-paint']?.displayValue, cls: lr.audits?.['cumulative-layout-shift']?.displayValue, source: 'pagespeed' };
    }
  }
  // Own estimate from what we already fetched: response time, page weight, script and image counts.
  let s = 100;
  if (site.ttfbMs > 800) s -= 15; if (site.ttfbMs > 1800) s -= 15;
  if (site.bytes > 150_000) s -= 10; if (site.bytes > 400_000) s -= 15;
  if (site.scripts > 10) s -= 10; if (site.scripts > 20) s -= 10;
  if (site.images > 30) s -= 10;
  if (!site.viewport) s -= 10;
  return { score: Math.max(5, s), source: 'estimate', ttfbMs: site.ttfbMs, bytes: site.bytes };
}

// --- Google profile (Places API New) -------------------------------------------------------
async function checkProfile(name, city) {
  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key || !name) return null;
  const r = await withTimeout(fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST', headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.websiteUri,places.regularOpeningHours,places.photos,places.types,places.formattedAddress,places.location,places.primaryType,places.reviews' },
    body: JSON.stringify({ textQuery: `${name} ${city || ''}`.trim(), maxResultCount: 1 }),
  }), 6000, null);
  // An API error (key not enabled, quota, timeout) is NOT "profile not found": return null so the
  // model falls back to the quiz instead of failing the business for our own setup problem.
  if (!r || !r.ok) { console.log('places unavailable:', r ? r.status : 'timeout'); return null; }
  const d = await r.json(); const p = d.places?.[0];
  if (!p) return { found: false };
  return {
    found: true, id: p.id, name: p.displayName?.text, rating: p.rating ?? null, reviews: p.userRatingCount ?? 0, website: p.websiteUri || null,
    hours: !!p.regularOpeningHours, photos: (p.photos || []).length, types: p.types || [], address: p.formattedAddress,
    // v2: what the background benchmark and the recency finding need.
    location: p.location ?? null, primaryType: p.primaryType ?? null,
    reviewTimes: (p.reviews || []).map((r) => r.publishTime).filter(Boolean),
  };
}

// --- handler ---------------------------------------------------------------------------------
export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST' } });
  const u = new URL(req.url);
  if (req.method === 'GET') {
    const id = u.searchParams.get('r');
    if (!id) return json({ error: 'missing r' }, 400);
    const rec = await store().get(id, { type: 'json' });
    if (!rec) return json({ error: 'not found' }, 404);
    const { lead, ...pub } = rec; // never echo captured contact details
    return json(pub);
  }
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  let body; try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  const name = String(body.name || '').trim().slice(0, 120);
  const city = String(body.city || '').trim().slice(0, 80);
  const industry = INDUSTRIES[body.industry] ? body.industry : 'other';
  const url = normalizeUrl(body.url);
  const quiz = body.quiz && typeof body.quiz === 'object' ? body.quiz : {};
  if (!name && !url) return json({ error: 'Give us a business name or a website.' }, 400);

  // Simple per-IP throttle: 20 scans a day.
  const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  const rlKey = `rl/${day}/${ip.replace(/[^0-9a-f.:]/gi, '')}`;
  const count = Number((await store().get(rlKey)) || 0);
  if (count >= 20) return json({ error: 'That is a lot of scans for one day. Try again tomorrow.' }, 429);
  await store().set(rlKey, String(count + 1));

  const site = await checkSite(url);
  const [speed, profile] = await Promise.all([checkSpeed(url, site), withTimeout(checkProfile(name, city), 7000, null)]);
  const checks = { site, speed, profile };
  const result = scoreModel({ industry, checks, quiz, job: body.job });
  const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  // The deep checks (measured PageSpeed, the local competitor benchmark) take longer than this
  // function may run. Flag what is pending ON the stored record, kick the background job, and let
  // the page poll the record; the job fills each piece in, re-scores, and clears its flag.
  const pending = {
    speed: !!(process.env.PSI_API_KEY && site.reachable),
    bench: !!(process.env.GOOGLE_PLACES_KEY && profile && profile.found && profile.location),
  };
  const rec = { id, at: new Date().toISOString(), input: { name, url, city, industry, quiz, job: body.job || null }, checks, result, pending };
  await store().setJSON(id, rec, { metadata: { name, industry, score: result.score } });
  if (pending.speed || pending.bench) {
    try { fetch(new URL('/api/scan-speed', u.origin).href, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {}); } catch {}
  }
  return json(rec);
};

export const config = { path: '/api/scan' };
