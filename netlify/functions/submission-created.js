// Netlify auto-invokes this on EVERY form submission.
//  1. Pushes consultation bookings (form "intake") into Easyworks GHL:
//       - upsert contact
//       - create opportunity in "EasyWorks AI Website Leads" pipeline
//       - attach a note with industry / selected stack / message
//       - tag the contact
//  2. Forwards a summary to Brad's Telegram so a lead can never be lost
//     (fires even if GHL push fails — triple redundancy with Netlify dashboard).

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8793569908:AAHh42Na4VUlcW3ktdjp5Luz4igoZbj92gU';
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID   || '8271274624';

// GHL — Easyworks AI sub-account
const GHL_BASE   = 'https://services.leadconnectorhq.com';
const GHL_VER    = '2021-07-28';
const GHL_TOKEN  = process.env.GHL_EASYWORKS_PIT_TOKEN || '';
const GHL_LOC    = process.env.GHL_EASYWORKS_LOCATION_ID || 'epCxi4CaxbM1sOwVjBTf';
// "EasyWorks AI Website Leads" pipeline → "New Website Lead" stage
const GHL_PIPELINE_ID = 'AvA0uLpy36h3FmauRM5J';
const GHL_STAGE_ID    = '0bb5b396-2c14-4c5d-acb6-c0e525c1271e';

const ghlHeaders = () => ({
  Authorization: `Bearer ${GHL_TOKEN}`,
  Version: GHL_VER,
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

async function ghlUpsertContact(d) {
  const fullName = (d.name || '').trim();
  const parts = fullName.split(/\s+/);
  const firstName = parts.shift() || fullName || 'Website';
  const lastName = parts.join(' ') || '';
  const body = {
    locationId: GHL_LOC,
    firstName,
    lastName,
    name: fullName || undefined,
    email: d.email || undefined,
    phone: d.phone || undefined,
    companyName: d.business || undefined,
    source: 'easyworks.ai consultation form',
    tags: ['website-consultation', 'consultation-requested', 'website-lead'],
  };
  const r = await fetch(`${GHL_BASE}/contacts/upsert`, {
    method: 'POST', headers: ghlHeaders(), body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`contact upsert ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.contact || j;
}

async function ghlCreateOpportunity(contactId, d) {
  const biz = d.business ? d.business : (d.name || 'Website lead');
  const body = {
    pipelineId: GHL_PIPELINE_ID,
    locationId: GHL_LOC,
    pipelineStageId: GHL_STAGE_ID,
    name: `${biz} — consultation`,
    status: 'open',
    contactId,
  };
  const r = await fetch(`${GHL_BASE}/opportunities/`, {
    method: 'POST', headers: ghlHeaders(), body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`opportunity ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.opportunity || j;
}

async function ghlAddNote(contactId, d) {
  const lines = [
    'New consultation request from easyworks.ai',
    '',
    `Business : ${d.business || '—'}`,
    `Industry : ${d.industry || '—'}`,
    (d.stack || d.selected_stack) ? `Interested in : ${d.stack || d.selected_stack}` : null,
    '',
    `Message  : ${d.message || '(none)'}`,
  ].filter(Boolean);
  const r = await fetch(`${GHL_BASE}/contacts/${contactId}/notes`, {
    method: 'POST', headers: ghlHeaders(),
    body: JSON.stringify({ body: lines.join('\n') }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(`note ${r.status}: ${JSON.stringify(j).slice(0, 150)}`);
  }
}

async function pushToGHL(d) {
  if (!GHL_TOKEN) throw new Error('GHL_EASYWORKS_PIT_TOKEN not set in Netlify env');
  const contact = await ghlUpsertContact(d);
  const contactId = contact.id || contact.contactId;
  if (!contactId) throw new Error('no contact id returned from upsert');
  // Opportunity + note are best-effort — a missing one shouldn't lose the lead
  const results = await Promise.allSettled([
    ghlCreateOpportunity(contactId, d),
    ghlAddNote(contactId, d),
  ]);
  const oppErr  = results[0].status === 'rejected' ? results[0].reason.message : null;
  const noteErr = results[1].status === 'rejected' ? results[1].reason.message : null;
  return { contactId, oppErr, noteErr };
}

async function tg(text) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    return (await r.json()).ok === true;
  } catch { return false; }
}

exports.handler = async (event) => {
  const esc = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  try {
    const body = JSON.parse(event.body || '{}');
    const payload = body.payload || {};
    const formName = payload.form_name || 'unknown';
    const data = payload.data || {};

    let ghlSummary = '';
    if (formName === 'intake') {
      try {
        const { contactId, oppErr, noteErr } = await pushToGHL(data);
        ghlSummary = `\n\n✅ <b>GHL:</b> contact <code>${esc(contactId)}</code> + opportunity in Website Leads`;
        if (oppErr)  ghlSummary += `\n⚠️ opp: ${esc(oppErr)}`;
        if (noteErr) ghlSummary += `\n⚠️ note: ${esc(noteErr)}`;
      } catch (e) {
        ghlSummary = `\n\n❌ <b>GHL push FAILED:</b> ${esc(e.message)}\n(lead saved in Netlify dashboard — add to GHL manually)`;
      }
    }

    let message;
    if (formName === 'intake') {
      message = [
        '🟣 <b>NEW CONSULTATION — easyworks.ai</b>',
        '',
        `<b>Name:</b> ${esc(data.name || '?')}`,
        `<b>Business:</b> ${esc(data.business || '?')}`,
        `<b>Email:</b> ${esc(data.email || '?')}`,
        `<b>Phone:</b> ${esc(data.phone || '?')}`,
        `<b>Industry:</b> ${esc(data.industry || '?')}`,
        (data.stack || data.selected_stack) ? `<b>Interested in:</b> ${esc(data.stack || data.selected_stack)}` : null,
        data.message ? `\n<b>Message:</b> ${esc(data.message)}` : null,
        ghlSummary,
      ].filter(Boolean).join('\n');
    } else if (formName === 'blissful-touch-intake') {
      message = [
        '🌸 <b>NEW INTAKE: Blissful Touch</b>', '',
        `<b>Business:</b> ${esc(data.legal_business_name || data.brand_name || '?')}`,
        `<b>Owner:</b> ${esc(data.owner_name || '?')}`,
        `<b>Email:</b> ${esc(data.owner_email || '?')}`,
        `<b>Phone:</b> ${esc(data.owner_phone || '?')}`,
        'Full submission in Netlify dashboard.',
      ].join('\n');
    } else {
      message = `📥 <b>New form submission: ${esc(formName)}</b>\n\nCheck Netlify dashboard.`;
    }

    const ok = await tg(message);
    return { statusCode: 200, body: JSON.stringify({ ok, ghl: !!ghlSummary }) };
  } catch (err) {
    await tg(`❌ <b>submission-created error:</b> ${esc(err.message)}`);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
