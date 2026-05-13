// POST /.netlify/functions/checkout
// Body: { engines: ["content","seo","ai"] }  (subset of three paid engines)
// Returns: { url: "https://checkout.stripe.com/..." }
//
// Pricing source of truth — keep in sync with build_products.py and the homepage.
// Setup is one-time, monthly is recurring. Discounts via Stripe coupons created on the fly.

const Stripe = require('stripe');

const ENGINES = {
  ai:              { name: 'AI Suite',                setup:  99700, mo: 49700 },  // cents
  content:         { name: 'Content Engine',          setup: 129700, mo: 99700 },
  seo:             { name: 'SEO Engine',              setup:  99700, mo: 99700 },
  'revenue-scale': { name: 'AI Revenue Scale',        setup:  99700, mo: 49700 },  // Starter tier; client ad spend ≤ $2k/mo
  voice:           { name: 'Voice → Report Pipeline', setup:  99700, mo: 49700 },
};
const TIER_DISCOUNTS = { 1: 0, 2: 10, 3: 15, 4: 18, 5: 20 };

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
  const engines = (body.engines || []).filter(k => ENGINES[k]);
  if (engines.length === 0) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'No engines selected.' }) };
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

  const pct = TIER_DISCOUNTS[engines.length] || 0;
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
  const sessionParams = {
    mode: 'subscription',
    line_items,
    billing_address_collection: 'required',
    payment_method_types: ['card'],
    success_url: `${origin}/thanks/?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/#products`,
    metadata: {
      engines: engines.join(','),
      stack_count: String(engines.length),
      stack_discount_pct: String(pct),
    },
  };
  if (discounts) {
    sessionParams.discounts = discounts;
  } else {
    sessionParams.allow_promotion_codes = true;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return { statusCode: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: session.url }) };
};
