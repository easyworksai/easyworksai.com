// Netlify auto-invokes this function on EVERY form submission.
// Forwards a summary to Brad's Telegram (@Theguapobot) so submissions
// can never be silently lost. Email notifications still fire as backup.

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8793569908:AAHh42Na4VUlcW3ktdjp5Luz4igoZbj92gU';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8271274624';

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const payload = body.payload || {};
    const formName = payload.form_name || 'unknown';
    const data = payload.data || {};

    const escape = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));

    let message;
    if (formName === 'blissful-touch-intake') {
      const lines = [
        '🌸 <b>NEW INTAKE: Blissful Touch</b>',
        '',
        `<b>Business:</b> ${escape(data.legal_business_name || data.brand_name || '?')}`,
        `<b>Owner:</b> ${escape(data.owner_name || '?')}`,
        `<b>Email:</b> ${escape(data.owner_email || '?')}`,
        `<b>Phone:</b> ${escape(data.owner_phone || '?')}`,
        `<b>Address:</b> ${escape(data.primary_address || '?')}`,
        `<b>Staff/Rooms:</b> ${escape(data.staff_count || '?')} / ${escape(data.rooms || '?')}`,
        `<b>New-client capacity:</b> ${escape(data.new_client_capacity || '?')}`,
        `<b>90-day goal:</b> ${escape(data.goal_90 || '?')}`,
        '',
        `Full submission in Netlify dashboard.`,
      ];
      message = lines.join('\n');
    } else {
      message = `📥 <b>New form submission: ${escape(formName)}</b>\n\nCheck Netlify dashboard.`;
    }

    const tgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const tgJson = await tgRes.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: tgJson.ok === true, telegram: tgJson.ok }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
