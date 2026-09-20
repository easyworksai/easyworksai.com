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

// The report email: sent once per scan, through the GHL conversation so replies land in the CRM.
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BAND_COLOR = { 'Built to last': '#22d3ee', Healthy: '#3b82f6', 'At risk': '#e8b25a', Critical: '#ef6b6b' };
function reportEmail({ person, biz, result, reportUrl, id }) {
  const first = (person || '').trim().split(/\s+/)[0];
  const leaks = (result.money?.leaks || []).slice(0, 3);
  const rows = leaks.length
    ? leaks.map((l) => `<tr><td style="padding:12px 0;border-top:1px solid #e3e8f2;font:15px/1.5 Arial,Helvetica,sans-serif;color:#1b2333"><strong>${esc(l.label)}</strong><br><span style="color:#55607a">${esc(l.line)}</span></td><td style="padding:12px 0 12px 16px;border-top:1px solid #e3e8f2;font:bold 15px Arial,Helvetica,sans-serif;color:#1b2333;white-space:nowrap;vertical-align:top" align="right">${money(l.amount)}/mo</td></tr>`).join('')
    : (result.worst || []).slice(0, 3).map((w) => `<tr><td style="padding:12px 0;border-top:1px solid #e3e8f2;font:15px/1.5 Arial,Helvetica,sans-serif;color:#1b2333"><strong>${esc(w.label)}</strong></td><td></td></tr>`).join('');
  const bpUrl = `https://easyworks.ai/blueprint/?r=${encodeURIComponent(id)}`;
  const subject = `Your Business Longevity Rating: ${result.score}/100 (${result.band})`;
  const html = `<div style="background:#f3f5fa;padding:24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#070b16;padding:22px 28px;font:bold 15px Arial,Helvetica,sans-serif;letter-spacing:4px;color:#ffffff">EASYWORKS</td></tr>
<tr><td style="padding:28px 28px 8px;font:16px/1.6 Arial,Helvetica,sans-serif;color:#1b2333">
<p style="margin:0 0 14px">${first ? 'Hi ' + esc(first) + ',' : 'Hi,'}</p>
<p style="margin:0 0 18px">Here is the Scan you ran for <strong>${esc(biz)}</strong>. Keep this email, the link below opens your full report any time.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070b16;border-radius:12px"><tr>
<td style="padding:20px 22px;font:13px Arial,Helvetica,sans-serif;color:#9fb0d0">BUSINESS LONGEVITY RATING<br><span style="font:bold 40px Arial,Helvetica,sans-serif;color:#ffffff">${result.score}</span><span style="font:16px Arial,Helvetica,sans-serif;color:#9fb0d0"> / 100</span><br><span style="font:bold 14px Arial,Helvetica,sans-serif;color:${BAND_COLOR[result.band] || '#22d3ee'}">${esc(result.band)}</span></td>
<td style="padding:20px 22px;font:13px Arial,Helvetica,sans-serif;color:#9fb0d0" align="right">ESTIMATED COST OF THE GAPS<br><span style="font:bold 26px Arial,Helvetica,sans-serif;color:#e8b25a">${money(result.money?.monthly)}</span><span style="font:14px Arial,Helvetica,sans-serif;color:#9fb0d0"> / month</span></td>
</tr></table>
<p style="margin:10px 0 0;font:12px/1.5 Arial,Helvetica,sans-serif;color:#7a859c">The monthly figure is a conservative estimate from your answers and industry averages. The report shows the working.</p>
${rows ? `<p style="margin:24px 0 4px;font:bold 13px Arial,Helvetica,sans-serif;letter-spacing:1px;color:#55607a">WHERE IT IS GOING</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>` : ''}
<p style="margin:26px 0 8px" align="center"><a href="${reportUrl}" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;font:bold 16px Arial,Helvetica,sans-serif;padding:14px 28px;border-radius:10px">Open your full report</a></p>
<p style="margin:22px 0 14px">The Scan reads four vitals from the outside. The next step is the <a href="${bpUrl}" style="color:#2563eb">Blueprint</a>: I read all six using your real numbers and give you a written plan in priority order. The fee is credited in full to your build, and the document is yours either way.</p>
<p style="margin:0 0 14px">If anything in the report looks off, just reply to this email and I will take a look.</p>
<p style="margin:0 0 4px">Brad Palmer</p><p style="margin:0;color:#55607a;font-size:14px">Founder, Easyworks · +1 604 265 7660</p>
</td></tr>
<tr><td style="padding:22px 28px 26px;font:12px/1.6 Arial,Helvetica,sans-serif;color:#8a94a8">You are getting this because you asked for your Scan report at easyworks.ai.<br>Easyworks AI Solutions Inc. · 37209 Hawkins Pickle Road, Dewdney, BC V2V 0M7, Canada</td></tr>
</table></div>`;
  return { subject, html };
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST' } });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  let b; try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  const id = String(b.id || '').slice(0, 40);
  const email = String(b.email || '').trim().toLowerCase();
  const phone = String(b.phone || '').replace(/[^\d+]/g, '').slice(0, 16);
  const person = String(b.name || '').trim().slice(0, 100);
  const smsOk = !!b.smsOk && !!phone;
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
        source: 'Easyworks Scan', tags: ['scan', bandTag, `industry-${input.industry}`, ...campTags, ...(smsOk ? ['sms-ok'] : [])],
        customFields: (() => {
          // Scan fields power the follow up sequences in GHL (created 2026-09-19).
          const top = (result.money?.leaks || [])[0] || null;
          const F = { score: 'ysyPcWyeilYWTcbGUKOX', band: 'bP5QDTffUl3QNwGgoHIQ', monthly: 'Iim2Ccq0jJhAxy05Txcl', gap: 'FctiL7hB1WwBR931htog', gapDetail: '6oFRXQGurQhXpmkxHv2q', report: 'xMOs0anLWsFtHWOK9gvd', blueprint: 'ooReQXKClxB5xIyrZb05', industry: 'ng3gjjPDriJcuNzMEYu0' };
          return [
            { id: F.score, field_value: result.score }, { id: F.band, field_value: result.band },
            { id: F.monthly, field_value: money(result.money?.monthly) },
            { id: F.gap, field_value: top ? top.label : (result.worst?.[0]?.label || '') },
            { id: F.gapDetail, field_value: top ? `${top.line} About ${money(top.amount)} a month.` : '' },
            { id: F.report, field_value: reportUrl }, { id: F.blueprint, field_value: `https://easyworks.ai/blueprint/?r=${id}` },
            { id: F.industry, field_value: INDUSTRIES[input.industry]?.label || input.industry },
          ];
        })(),
      });
      const contactId = up.contact?.id;
      out.ghl = !!contactId;
      if (contactId) {
        if (!rec.emailedAt) {
          try {
            const { subject, html } = reportEmail({ person, biz, result, reportUrl, id });
            await ghl('/conversations/messages', { type: 'Email', contactId, subject, html, emailFrom: 'Brad at Easyworks <team@easyworksai.com>' });
            rec.emailedAt = new Date().toISOString(); out.email = true;
          } catch (e) { out.emailError = e.message; }
        }
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
