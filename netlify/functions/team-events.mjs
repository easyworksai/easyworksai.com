// The Wire: team activity feed + Telegram pings for the big moments.
// Events live in Blobs feed.json (capped). Other functions import logEvent().
import { getStore } from '@netlify/blobs';

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8793569908:AAHh42Na4VUlcW3ktdjp5Luz4igoZbj92gU';
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '8271274624';

export async function loadFeed() {
  const store = getStore({ name: 'sales-team', consistency: 'strong' });
  return (await store.get('feed.json', { type: 'json' })) || [];
}

// ev: { type, who, text } — text is the display line, already human.
export async function logEvent(ev) {
  const store = getStore({ name: 'sales-team', consistency: 'strong' });
  const feed = (await store.get('feed.json', { type: 'json' })) || [];
  feed.unshift({ ...ev, ts: Date.now() });
  await store.setJSON('feed.json', feed.slice(0, 120));
}

export async function tgPing(text) {
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
  } catch { /* best effort */ }
}

// Daily call activity per rep: activity-<slug>.json { "YYYY-MM-DD": count }
export async function bumpActivity(slug) {
  const store = getStore({ name: 'sales-team', consistency: 'strong' });
  const key = `activity-${slug}.json`;
  const a = (await store.get(key, { type: 'json' })) || {};
  const day = new Date().toISOString().slice(0, 10);
  a[day] = Math.min((a[day] || 0) + 1, 60);
  await store.setJSON(key, a);
  return a[day];
}

export async function loadActivity(slug) {
  const store = getStore({ name: 'sales-team', consistency: 'strong' });
  return (await store.get(`activity-${slug}.json`, { type: 'json' })) || {};
}
