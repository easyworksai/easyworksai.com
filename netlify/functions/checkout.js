// POST /.netlify/functions/checkout
// Body: { engines: ["content","seo","ai"] }  (subset of three paid engines)
// Returns: { url: "https://checkout.stripe.com/..." }
//
// Pricing source of truth — keep in sync with build_products.py and the homepage.
// Setup is one-time, monthly is recurring. Discounts via Stripe coupons created on the fly.

const Stripe = require('stripe');

const ENGINES = {
  content: { name: 'Content Engine',  setup: 127900, mo: 99700 },  // cents — matches live site
  seo:     { name: 'SEO Engine',      setup: 127900, mo: 99700 },
  ai:      { name: 'AI Suite',        setup:  99700, mo: 49700 },
};
// Tier % off, keyed by total selected engines (incl. voice — voice is "Custom" so contributes count but not line items)
const TIER_DISCOUNTS = { 1: 0, 2: 10, 3: 15, 4: 20 };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: 'Method not allowed' };

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { body = {}; }
  const allSelected = body.engines || [];                 // may include 'voice'
  const engines = allSelected.filter(k => ENGINES[k]);    // paid only — go to line items
  const includesVoice = allSelected.includes('voice');
  if (engines.length === 0) {
    return {
      statusCode: 400, headers: cors,
      body: JSON.stringify({
        error: 'Voice → Report Pipeline is custom-priced. Please book a call instead.',
        redirect: '/#start',
      }),
    };
  }

  // Build line items: setup (one-time) + monthly (recurring) for each engine
  const line_items = [];
  for (const k of engines) {
    const e = ENGINES[k];
    line_items.push({
      price_data: {
        currency: 'cad',
        unit_amount: e.setup,
        product_data: { name: `${e.name} — Setup (one-time)` },
      },
      quantity: 1,
    });
    line_items.push({
      price_data: {
        currency: 'cad',
        unit_amount: e.mo,
        recurring: { interval: 'month' },
        product_data: { name: `${e.name} — Monthly` },
      },
      quantity: 1,
    });
  }

  // Discount coupon — tier based on TOTAL selected (incl. voice) so UI math matches
  const pct = TIER_DISCOUNTS[allSelected.length] || 0;
  let discounts;
  if (pct > 0) {
    const coupon = await stripe.coupons.create({
      percent_off: pct,
      duration: 'forever',
      name: `Stack ${engines.length} — ${pct}% off`,
    });
    discounts = [{ coupon: coupon.id }];
  }

  const origin = event.headers.origin || 'https://easyworks.ai';
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items,
    discounts,
    allow_promotion_codes: !discounts,
    billing_address_collection: 'required',
    customer_creation: 'always',
    payment_method_types: ['card'],
    success_url: `${origin}/thanks/?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/#products`,
    metadata: {
      engines: engines.join(','),
      stack_count: String(allSelected.length),
      paid_engines: String(engines.length),
      stack_discount_pct: String(pct),
      includes_voice: includesVoice ? 'yes' : 'no',
    },
  });

  return { statusCode: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: session.url }) };
};
