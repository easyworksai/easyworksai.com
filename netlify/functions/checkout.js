// POST /.netlify/functions/checkout
// Body (engines):  { engines: ["content","seo","ai"] }   (subset of five engines)
// Body (scribe):   { scribe: { tier: "solo"|"small"|"large", seats: 4 } }
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

// Easyworks Scribe — seat-based, separate from the 5 engines.
// mo = cents per seat per month. Solo includes a 30-day free trial.
const SCRIBE_TIERS = {
  solo:  { name: 'Easyworks Scribe — Solo',         mo: 14900, minSeats: 1,  maxSeats: 2,   trialDays: 30 },
  small: { name: 'Easyworks Scribe — Clinic (3-9)', mo:  9900, minSeats: 3,  maxSeats: 9,   trialDays: 14 },
  large: { name: 'Easyworks Scribe — Clinic (10+)', mo:  7900, minSeats: 10, maxSeats: 200, trialDays: 14 },
};

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
  const origin = event.headers.origin || 'https://easyworks.ai';

  // ---- Easyworks Scribe checkout (seat-based, trial-first) ----
  if (body.scribe && body.scribe.tier) {
    const tier = SCRIBE_TIERS[body.scribe.tier];
    if (!tier) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Unknown Scribe tier.' }) };
    }
    let seats = parseInt(body.scribe.seats, 10);
    if (!Number.isFinite(seats)) seats = tier.minSeats;
    seats = Math.min(tier.maxSeats, Math.max(tier.minSeats, seats));

    const scribeSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'cad',
          unit_amount: tier.mo,
          recurring: { interval: 'month' },
          product_data: { name: `${tier.name} — per seat / month` },
        },
        quantity: seats,
      }],
      billing_address_collection: 'required',
      payment_method_types: ['card'],
      subscription_data: { trial_period_days: tier.trialDays },
      allow_promotion_codes: true,
      success_url: `${origin}/thanks/?session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/scribe/`,
      metadata: {
        product: 'easyworks-scribe',
        scribe_tier: body.scribe.tier,
        seats: String(seats),
        trial_days: String(tier.trialDays),
      },
    });
    return { statusCode: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: scribeSession.url }) };
  }

  const engines = (body.engines || []).filter(k => ENGINES[k]);
  if (engines.length === 0) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'No engines or Scribe tier selected.' }) };
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
