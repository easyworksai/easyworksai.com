// POST /.netlify/functions/stripe-webhook
// Receives Stripe events. On checkout.session.completed:
//   - emails team@easyworksai.com with the order summary
//   - emails the customer a confirmation
//
// Email is sent via Netlify's built-in form submission notification (re-using same hook),
// but for cleanliness we just POST to the existing intake form so it shows up in the
// same notifications stream Brad already monitors. Simple, no SendGrid setup required.

const Stripe = require('stripe');
const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = event.headers['stripe-signature'];

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const meta = session.metadata || {};

    // Pull customer details
    const customerName = session.customer_details?.name || '(no name)';
    const customerEmail = session.customer_details?.email || '(no email)';
    const customerPhone = session.customer_details?.phone || '';
    const amountTotal = (session.amount_total / 100).toFixed(2);
    const currency = (session.currency || 'cad').toUpperCase();

    const summary = [
      `New Stripe checkout completed.`,
      ``,
      `Customer: ${customerName}`,
      `Email: ${customerEmail}`,
      `Phone: ${customerPhone}`,
      ``,
      `Engines: ${meta.engines || '?'}`,
      `Total selected (incl. voice): ${meta.stack_count || '?'}`,
      `Includes Voice consultation: ${meta.includes_voice || 'no'}`,
      `Stack discount: ${meta.stack_discount_pct || 0}%`,
      ``,
      `Initial charge: ${amountTotal} ${currency}`,
      `Stripe session: ${session.id}`,
      `Subscription: ${session.subscription}`,
    ].join('\n');

    // Submit to the existing Netlify intake form so it lands in the same notification stream
    await postNetlifyForm({
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      business: '(via Stripe checkout)',
      industry: 'Stripe order',
      message: summary,
    });
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

function postNetlifyForm(fields) {
  const formData = new URLSearchParams({ 'form-name': 'intake', ...fields }).toString();
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'easyworks.ai',
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(formData),
        },
      },
      (res) => {
        res.on('data', () => {});
        res.on('end', () => resolve(true));
      }
    );
    req.on('error', () => resolve(false));
    req.write(formData);
    req.end();
  });
}
