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
// Optional: GHL Calendar to auto-book consultations. Leave unset to skip booking.
const GHL_CALENDAR_ID = process.env.GHL_EASYWORKS_CONSULT_CALENDAR_ID || '';

// Map "morning/afternoon/evening" to a default start hour (PT) in 24h.
const TIME_WINDOWS = {
  morning:   { hour: 10, label: 'Morning (9 AM – 12 PM PT)' },
  afternoon: { hour: 14, label: 'Afternoon (12 PM – 4 PM PT)' },
  evening:   { hour: 17, label: 'Evening (4 PM – 7 PM PT)' },
  flexible:  { hour: 10, label: "I'm flexible" },
};

// Build an ISO datetime for the requested slot, anchored to PT.
function buildSlotISO(dateStr, windowKey) {
  if (!dateStr) return null;
  const win = TIME_WINDOWS[windowKey] || TIME_WINDOWS.flexible;
  // PT = UTC-7 in PDT (May → Nov). Treat dateStr as YYYY-MM-DD local PT.
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  // Build UTC instant for `hour` PT (PDT = +7h to get UTC).
  const utcMs = Date.UTC(y, m - 1, d, win.hour + 7, 0, 0);
  return new Date(utcMs).toISOString();
}

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
  const win = TIME_WINDOWS[d.preferred_time] || null;
  const fmtFmt = {
    phone:  'Phone call',
    video:  'Video call',
    onsite: 'On-site visit (BC)',
    any:    "Whatever's easiest",
  }[d.consultation_format] || d.consultation_format || '—';
  const lines = [
    'New consultation request from easyworks.ai',
    '',
    `Business : ${d.business || '—'}`,
    `Industry : ${d.industry || '—'}`,
    (d.stack || d.selected_stack) ? `Interested in : ${d.stack || d.selected_stack}` : null,
    '',
    `Preferred date : ${d.preferred_date || '—'}`,
    `Preferred time : ${win ? win.label : (d.preferred_time || '—')}`,
    `Format         : ${fmtFmt}`,
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

// Best-effort: book a 30-min consultation appointment on the configured GHL calendar.
// Skipped entirely if GHL_EASYWORKS_CONSULT_CALENDAR_ID env is not set.
async function ghlBookAppointment(contactId, d) {
  if (!GHL_CALENDAR_ID) return { skipped: 'no calendar id configured' };
  const startISO = buildSlotISO(d.preferred_date, d.preferred_time);
  if (!startISO) return { skipped: 'no preferred date supplied' };
  const endISO = new Date(new Date(startISO).getTime() + 30 * 60 * 1000).toISOString();
  const body = {
    calendarId: GHL_CALENDAR_ID,
    locationId: GHL_LOC,
    contactId,
    startTime: startISO,
    endTime: endISO,
    title: `Consultation — ${d.business || d.name || 'Website lead'}`,
    appointmentStatus: 'new',
    notes: `Auto-booked from easyworks.ai website. Format requested: ${d.consultation_format || '—'}. We will confirm by phone before this slot.`,
  };
  const r = await fetch(`${GHL_BASE}/calendars/events/appointments`, {
    method: 'POST', headers: ghlHeaders(), body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`appointment ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.appointment || j;
}

async function pushToGHL(d) {
  if (!GHL_TOKEN) throw new Error('GHL_EASYWORKS_PIT_TOKEN not set in Netlify env');
  const contact = await ghlUpsertContact(d);
  const contactId = contact.id || contact.contactId;
  if (!contactId) throw new Error('no contact id returned from upsert');
  // Opportunity + note + appointment all best-effort — a missing one shouldn't lose the lead
  const results = await Promise.allSettled([
    ghlCreateOpportunity(contactId, d),
    ghlAddNote(contactId, d),
    ghlBookAppointment(contactId, d),
  ]);
  const oppErr  = results[0].status === 'rejected' ? results[0].reason.message : null;
  const noteErr = results[1].status === 'rejected' ? results[1].reason.message : null;
  const apptErr = results[2].status === 'rejected' ? results[2].reason.message : null;
  const apptOk  = results[2].status === 'fulfilled' && results[2].value && !results[2].value.skipped;
  return { contactId, oppErr, noteErr, apptErr, apptOk };
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
        const { contactId, oppErr, noteErr, apptErr, apptOk } = await pushToGHL(data);
        ghlSummary = `\n\n✅ <b>GHL:</b> contact <code>${esc(contactId)}</code> + opportunity in Website Leads`;
        if (apptOk)  ghlSummary += `\n📅 appointment booked on calendar`;
        if (oppErr)  ghlSummary += `\n⚠️ opp: ${esc(oppErr)}`;
        if (noteErr) ghlSummary += `\n⚠️ note: ${esc(noteErr)}`;
        if (apptErr) ghlSummary += `\n⚠️ appt: ${esc(apptErr)}`;
      } catch (e) {
        ghlSummary = `\n\n❌ <b>GHL push FAILED:</b> ${esc(e.message)}\n(lead saved in Netlify dashboard — add to GHL manually)`;
      }
    }

    let message;
    if (formName === 'intake') {
      const winLabel = (TIME_WINDOWS[data.preferred_time] || {}).label || data.preferred_time || '—';
      const fmtLabel = {
        phone: 'Phone call', video: 'Video call', onsite: 'On-site (BC)', any: "Whatever's easiest",
      }[data.consultation_format] || data.consultation_format || '—';
      message = [
        '📞 <b>NEW CONSULTATION — easyworks.ai</b>',
        '',
        `<b>Name:</b> ${esc(data.name || '?')}`,
        `<b>Business:</b> ${esc(data.business || '?')}`,
        `<b>Email:</b> ${esc(data.email || '?')}`,
        `<b>Phone:</b> ${esc(data.phone || '?')}`,
        `<b>Industry:</b> ${esc(data.industry || '?')}`,
        '',
        `<b>📅 Preferred date:</b> ${esc(data.preferred_date || '—')}`,
        `<b>⏰ Preferred time:</b> ${esc(winLabel)}`,
        `<b>📞 Format:</b> ${esc(fmtLabel)}`,
        (data.stack || data.selected_stack) ? `\n<b>Interested in:</b> ${esc(data.stack || data.selected_stack)}` : null,
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
