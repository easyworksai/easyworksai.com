// The Scan's email gate. Takes the contact, attaches the scan, and puts the lead where
// Cash works: an Easyworks GHL contact tagged by band, the three leaks in a note, an
// opportunity in the website leads pipeline, and a Telegram ping to Brad. Nothing is
// sent to the prospect automatically.
//
//   POST /api/scan-lead  { id, email, phone?, name? }
import { getStore } from '@netlify/blobs';
import { PIPELINE_ID as SALES_PIPELINE, STAGE } from './ghl.mjs';
import { INDUSTRIES } from './scan-model.mjs';

const store = () => getStore({ name: 'scan', consistency: 'strong' });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });

const GHL_BASE = 'https://services.leadconnectorhq.com', GHL_VER = '2021-07-28';
const GHL_TOKEN = process.env.GHL_EASYWORKS_PIT_TOKEN || '';
const GHL_LOC = process.env.GHL_EASYWORKS_LOCATION_ID || 'epCxi4CaxbM1sOwVjBTf';
// Opportunities go where the sales team actually works: Easyworks Sales Pipeline, New Lead.
const PIPELINE_ID = SALES_PIPELINE;
const STAGE_ID = STAGE.new;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '' // Easyworks bot (EW_BOT_TOKEN in Netlify env), no GuapBot fallback;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '8271274624';
const H = () => ({ Authorization: `Bearer ${GHL_TOKEN}`, Version: GHL_VER, 'Content-Type': 'application/json', Accept: 'application/json' });
const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-CA');

async function ghl(path, body) {
  const r = await fetch(GHL_BASE + path, { method: 'POST', headers: H(), body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`ghl ${path}: ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST' } });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  let b; try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  const id = String(b.id || '').slice(0, 40);
  const email = String(b.email || '').trim().toLowerCase();
  const phone = String(b.phone || '').replace(/[^\d+]/g, '').slice(0, 16);
  const person = String(b.name || '').trim().slice(0, 100);
  const camp = {}; for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid']) { const v = b.camp && b.camp[k]; if (v) camp[k] = String(v).slice(0, 120); }
  const slug = (v) => String(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const campTags = [camp.utm_source && `src-${slug(camp.utm_source)}`, camp.utm_campaign && `cell-${slug(camp.utm_campaign)}`, (camp.gclid || camp.fbclid) && 'paid-click'].filter(Boolean);
  const campLine = Object.keys(camp).length ? Object.entries(camp).filter(([k]) => k.startsWith('utm_')).map(([k, v]) => `${k.slice(4)}=${v}`).join(' · ') : '';
  if (!id || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'A real email is needed to open the report.' }, 400);
  const rec = await store().get(id, { type: 'json' });
  if (!rec) return json({ error: 'scan not found' }, 404);

  const { input, result } = rec;
  const biz = input.name || (input.url ? new URL(input.url).hostname : 'Unknown business');
  const bandTag = 'scan-' + result.band.toLowerCase().replace(/\s+/g, '-');
  const leaks = result.money.leaks.slice(0, 3).map((l) => `${l.label}: ${money(l.amount)}/mo. ${l.line}`).join('\n');
  const worst = result.worst.map((w) => `${w.label} (${w.status})`).join('; ');
  const reportUrl = `https://easyworks.ai/scan/?r=${id}`;

  const out = { ok: true, reportUrl, ghl: false, telegram: false };
  if (GHL_TOKEN) {
    try {
      const up = await ghl('/contacts/upsert', {
        locationId: GHL_LOC, email, ...(phone ? { phone } : {}), ...(person ? { name: person } : {}), companyName: biz, website: input.url || undefined, city: input.city || undefined,
        source: 'Easyworks Scan', tags: ['scan', bandTag, `industry-${input.industry}`, ...campTags],
        customFields: [],
      });
      const contactId = up.contact?.id;
      out.ghl = !!contactId;
      if (contactId) {
        await ghl('/contacts/' + contactId + '/notes', { body: `EASYWORKS SCAN ${result.score}/100 (${result.band})\n${campLine ? 'Campaign: ' + campLine + '\n' : ''}Business: ${biz}\nSite: ${input.url || 'none'}\nCity: ${input.city || '?'} · Industry: ${input.industry}\nEstimated leak: ${money(result.money.monthly)}/mo\n\nTop leaks:\n${leaks}\n\nWorst checks: ${worst}\n\nReport: ${reportUrl}\nNext step: Blueprint (internal: $500, credited to build).` }).catch(() => {});
        await ghl('/opportunities/', { locationId: GHL_LOC, pipelineId: PIPELINE_ID, pipelineStageId: STAGE_ID, contactId, name: `Scan: ${biz} (${result.score}/100)`, status: 'open', monetaryValue: 2000, source: 'Easyworks Scan' }).catch(() => {});
      }
    } catch (e) { out.ghlError = e.message; }
  }
  try {
    const text = `Scan lead: ${biz} scored ${result.score}/100 (${result.band}), leaking about ${money(result.money.monthly)}/mo.\n${person ? person + ' · ' : ''}${email}${phone ? ' · ' + phone : ''}\n${input.city || ''} ${input.industry}\nTop leak: ${result.money.leaks[0] ? result.money.leaks[0].label + ' ' + money(result.money.leaks[0].amount) : 'none'}\n${reportUrl}${out.ghl ? '' : '\n(GHL push failed: ' + (out.ghlError || 'no token') + ')'}`;
    const textOut = campLine ? text + '\nCampaign: ' + campLine : text;
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: TG_CHAT, text: textOut, disable_web_page_preview: true }) });
    out.telegram = r.ok;
  } catch {}
  // The Floor: drop the lead into the unclaimed pool, flagged hot, so Cash sees it without opening GHL.
  try {
    const pool = getStore({ name: 'sales-team', consistency: 'strong' });
    const data = (await pool.get('leads-pool.json', { type: 'json' })) || { ts: 0, leads: [] };
    const pid = 'scan-' + id;
    if (!data.leads.some((l) => l.id === pid)) {
      data.leads.unshift({ id: pid, name: biz, city: input.city || '', niche: INDUSTRIES[input.industry]?.label || input.industry, phone: phone || '', email, contact: person, addr: `Scan ${result.score}/100 · leaking ~${money(result.money.monthly)}/mo`, hot: true, source: 'Easyworks Scan', scanId: id, score: result.score, band: result.band, leak: result.money.monthly, reportUrl, ts: Date.now() });
      data.ts = Date.now();
      await pool.setJSON('leads-pool.json', data);
      out.floor = true;
    }
  } catch (e) { out.floorError = e.message; }
  rec.lead = { email, phone, name: person, at: new Date().toISOString(), ghl: out.ghl };
  rec.unlocked = true;
  await store().setJSON(id, rec, { metadata: { name: input.name, industry: input.industry, score: result.score, lead: 1 } });
  return json(out);
};

export const config = { path: '/api/scan-lead' };
