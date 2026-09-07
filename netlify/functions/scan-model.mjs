// The Scan's scoring model. One file, so the numbers get tuned in one place as
// Blueprint data comes in. Spec: Desktop/Easyworks AI Solutions/Internal/Scan-Blueprint/SPEC.md
//
// Pillars are customer words. Found / Answered / Trusted / Growing. Score is /100.
// The money number is deliberately conservative and always labelled an estimate.

export const INDUSTRIES = {
  dentist:     { label: 'Dental clinic',        close: 0.6,  job: 650,  leads: 40,  reviewMedian: 120 },
  physio:      { label: 'Physio / chiro',       close: 0.7,  job: 480,  leads: 35,  reviewMedian: 80 },
  spa:         { label: 'Spa / salon',          close: 0.65, job: 180,  leads: 60,  reviewMedian: 150 },
  trades:      { label: 'Trades / contractor',  close: 0.45, job: 2400, leads: 25,  reviewMedian: 60 },
  realestate:  { label: 'Real estate',          close: 0.08, job: 9000, leads: 30,  reviewMedian: 40 },
  restaurant:  { label: 'Restaurant / cafe',    close: 0.9,  job: 45,   leads: 200, reviewMedian: 300 },
  other:       { label: 'Other local business', close: 0.5,  job: 400,  leads: 30,  reviewMedian: 50 },
};

// Quiz answer keys -> numbers used by the model.
export const QUIZ = {
  missed:   { none: 0, few: 3, some: 10, many: 20 },                       // voicemail calls per week
  reply:    { min5: 0, hour: 0.10, day: 0.30, later: 0.55 },               // share of leads lost to slow reply
  posting:  { weekly: 1, monthly: 0.6, rarely: 0.25, nobody: 0 },          // cadence factor
  reviews:  { auto: 1, sometimes: 0.5, never: 0 },                         // ask factor
  ads:      { none: [0, true], u500t: [300, true], u500u: [300, false], o500t: [1200, true], o500u: [1200, false] }, // [spend, traced]
  hours:    { u3: 2, h3to8: 5, h8to15: 11, o15: 18 },                      // owner admin hours per week
};

export const BANDS = [
  [90, 'Dialed in'], [70, 'Working'], [40, 'Holding'], [0, 'Leaking'],
];
export const bandOf = (score) => BANDS.find(([min]) => score >= min)[1];

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const pts = (ok, max) => (ok === true ? max : ok === 'warn' ? Math.round(max / 2) : 0);

// checks: output of runChecks (site, speed, profile). quiz: raw answer keys. job: avg job value.
export function score({ industry = 'other', checks, quiz = {}, job }) {
  const ind = INDUSTRIES[industry] || INDUSTRIES.other;
  const site = checks.site || {}, speed = checks.speed || {}, prof = checks.profile || null;
  const jobValue = Number(job) > 0 ? Number(job) : ind.job;
  const findings = []; // { pillar, key, status: pass|warn|fail, label, fix, points, max }
  const add = (pillar, key, status, max, label, fix) => findings.push({ pillar, key, status, label, fix, points: pts(status === 'pass' ? true : status === 'warn' ? 'warn' : false, max), max });

  // ---- Found (30) --------------------------------------------------------------
  if (site.reachable) {
    add('found', 'title', site.title && site.title.length >= 20 && site.title.length <= 70 ? 'pass' : site.title ? 'warn' : 'fail', 4, 'Page title tells Google what you do and where', 'Write a title like "Service in City | Business name", 50 to 60 characters.');
    add('found', 'description', site.description ? (site.description.length >= 80 ? 'pass' : 'warn') : 'fail', 3, 'Meta description', 'Add a 140 to 160 character description that names the service and city.');
    add('found', 'h1', site.h1 ? 'pass' : 'fail', 2, 'One clear headline (H1)', 'Put your main service and city in the page headline.');
    add('found', 'schema', site.schemaLocal ? 'pass' : site.schemaAny ? 'warn' : 'fail', 5, 'Business details in a format Google reads (schema)', 'Add LocalBusiness schema with name, address, phone, hours and service area.');
    add('found', 'sitemap', site.sitemap ? 'pass' : 'fail', 2, 'Sitemap', 'Publish sitemap.xml and submit it in Search Console.');
    add('found', 'canonical', site.canonical ? 'pass' : 'warn', 1, 'Canonical URL', 'Add a canonical tag so Google indexes one version of each page.');
    add('found', 'viewport', site.viewport ? 'pass' : 'fail', 2, 'Mobile friendly', 'Add the viewport meta tag and test on a phone. Most local searches are mobile.');
  } else {
    add('found', 'site', 'fail', 19, 'Website reachable', site.error ? `We could not load the site (${site.error}). Google cannot either.` : 'No website found. A one page site with your services, city and a booking button is the floor.');
  }
  const perf = speed.score; // 0..100 or null
  add('found', 'speed', perf == null ? 'warn' : perf >= 70 ? 'pass' : perf >= 40 ? 'warn' : 'fail', 6, `Mobile speed${perf != null ? ` (${perf}/100)` : ''}`, 'Compress images, drop unused scripts, and get the first screen under 2.5 seconds on mobile.');
  if (prof) {
    add('found', 'profile', prof.found ? 'pass' : 'fail', 5, 'Google Business Profile found', 'Claim and verify the profile. It is the single biggest local ranking factor.');
  } else {
    const posting = QUIZ.posting[quiz.posting] ?? 0;
    add('found', 'profile-quiz', posting >= 0.6 ? 'pass' : posting > 0 ? 'warn' : 'fail', 5, 'Google Business Profile activity', 'Post to the profile weekly. Active profiles outrank complete-but-silent ones.');
  }

  // ---- Answered (30) -----------------------------------------------------------
  const missedPerWeek = QUIZ.missed[quiz.missed] ?? 5;
  add('answered', 'missed', missedPerWeek === 0 ? 'pass' : missedPerWeek <= 3 ? 'warn' : 'fail', 10, 'Calls answered', 'Every missed call needs an instant text back and a receptionist that books. Voicemail is where jobs die.');
  const replyLoss = QUIZ.reply[quiz.reply] ?? 0.3;
  add('answered', 'reply', replyLoss === 0 ? 'pass' : replyLoss <= 0.1 ? 'warn' : 'fail', 10, 'Speed to lead', 'Reply inside 5 minutes, automatically, on every channel. After 5 minutes the odds of reaching a lead drop 8 times.');
  if (site.reachable) {
    add('answered', 'tel', site.telLink ? 'pass' : site.phoneText ? 'warn' : 'fail', 4, 'Tap to call on the site', 'Make the phone number a tel: link and pin it in the header on mobile.');
    add('answered', 'booking', site.booking ? 'pass' : site.form ? 'warn' : 'fail', 4, 'Online booking or lead form', 'Add a booking button that opens a real calendar. A contact form is the minimum.');
    add('answered', 'afterhours', site.chat || site.booking ? 'pass' : 'warn', 2, 'After hours path', 'Chat or booking lets a 9pm visitor act now instead of forgetting by morning.');
  } else {
    add('answered', 'site-answer', 'fail', 10, 'A way to book online', 'Without a site there is no after hours path at all.');
  }

  // ---- Trusted (20) ------------------------------------------------------------
  const askFactor = QUIZ.reviews[quiz.reviews] ?? 0;
  if (prof && prof.found) {
    add('trusted', 'rating', prof.rating >= 4.7 ? 'pass' : prof.rating >= 4.3 ? 'warn' : 'fail', 4, `Rating ${prof.rating ?? 'n/a'}`, 'Reply to every review and ask happy customers the same day. Ratings climb when the ask is automatic.');
    add('trusted', 'reviewcount', prof.reviews >= ind.reviewMedian ? 'pass' : prof.reviews >= ind.reviewMedian / 3 ? 'warn' : 'fail', 6, `${prof.reviews ?? 0} reviews (typical for your industry: ${ind.reviewMedian})`, 'An automatic review request after every job is the only way to close a review gap.');
    add('trusted', 'photos', prof.photos >= 20 ? 'pass' : prof.photos >= 8 ? 'warn' : 'fail', 3, 'Profile photos', 'Twenty plus real photos: team, work, storefront. Profiles with photos get 42% more direction requests.');
  } else {
    add('trusted', 'review-ask', askFactor === 1 ? 'pass' : askFactor > 0 ? 'warn' : 'fail', 10, 'Review requests after every job', 'Automate the ask. Businesses that ask every customer average three times the reviews of those that ask sometimes.');
    add('trusted', 'photos-quiz', 'warn', 3, 'Profile photos', 'We will check photo count in the Blueprint. Twenty plus is the bar.');
  }
  if (site.reachable) {
    add('trusted', 'https', site.https ? 'pass' : 'fail', 3, 'Secure site (HTTPS)', 'Browsers label non-HTTPS sites "Not secure". Fix at the host, usually free.');
    add('trusted', 'fresh', site.fresh ? 'pass' : 'warn', 2, 'Site looks current', 'Update the copyright year and add something dated this quarter. Stale sites read as closed.');
    add('trusted', 'proof', site.proof ? 'pass' : 'warn', 2, 'Reviews or testimonials on the site', 'Pull your Google reviews onto the homepage.');
  } else {
    add('trusted', 'site-trust', 'fail', 7, 'Website trust signals', 'No site to carry proof.');
  }

  // ---- Growing (20) ------------------------------------------------------------
  const posting = QUIZ.posting[quiz.posting] ?? 0;
  add('growing', 'posting', posting >= 1 ? 'pass' : posting >= 0.6 ? 'warn' : 'fail', 7, 'Content going out', 'Weekly posts on the profile and socials keep you in front of people who already know you.');
  const [adSpend, traced] = QUIZ.ads[quiz.ads] ?? [0, true];
  add('growing', 'ads', adSpend === 0 ? 'warn' : traced ? 'pass' : 'fail', 6, adSpend ? `Ads ${traced ? 'tracked to jobs' : 'not tracked to jobs'}` : 'No paid acquisition yet', adSpend && !traced ? 'Track every ad to a booked job before spending another dollar.' : 'Once the phone is answered and reviews flow, small tracked campaigns scale.');
  const hours = QUIZ.hours[quiz.hours] ?? 5;
  add('growing', 'hours', hours <= 2 ? 'pass' : hours <= 5 ? 'warn' : 'fail', 7, `Owner admin time (${hours} h/week)`, 'Booking, follow-up and reminders should run without you. Every hour back is an hour on revenue.');

  // ---- totals ---------------------------------------------------------------------
  const pillars = {};
  for (const f of findings) { const p = pillars[f.pillar] ||= { points: 0, max: 0 }; p.points += f.points; p.max += f.max; }
  const WEIGHT = { found: 30, answered: 30, trusted: 20, growing: 20 };
  let total = 0;
  for (const [k, w] of Object.entries(WEIGHT)) { const p = pillars[k] || { points: 0, max: 1 }; p.score = Math.round((p.points / p.max) * w); p.weight = w; total += p.score; }
  total = clamp(total, 0, 100);

  // ---- money -----------------------------------------------------------------------
  const monthlyRevenueEst = ind.leads * ind.close * jobValue;
  const leaks = [];
  // Capped at 40% of the estimated monthly revenue so a big-ticket trade does not get an absurd number.
  const missedLoss = Math.min(missedPerWeek * 4.3 * 0.35 * ind.close * jobValue, monthlyRevenueEst * 0.4);
  if (missedLoss > 0) leaks.push({ key: 'missed', label: 'Missed calls', amount: missedLoss, line: `${missedPerWeek} calls a week to voicemail. About a third never call back.` });
  const replyLossAmt = ind.leads * replyLoss * ind.close * jobValue;
  if (replyLossAmt > 0) leaks.push({ key: 'reply', label: 'Slow follow-up', amount: replyLossAmt, line: 'Leads that wait pick whoever answered first.' });
  const reviewCount = prof?.found ? prof.reviews ?? 0 : null;
  const reviewShort = reviewCount == null ? askFactor === 0 : reviewCount < ind.reviewMedian;
  if (reviewShort) { const pct = (reviewCount != null && reviewCount < 10) || askFactor === 0 ? 0.10 : 0.05; leaks.push({ key: 'reviews', label: 'Review gap', amount: monthlyRevenueEst * pct, line: 'Fewer reviews than the businesses you compete with on the map.' }); }
  if (adSpend && !traced) leaks.push({ key: 'ads', label: 'Untracked ad spend', amount: adSpend * 0.25, line: 'A quarter of untracked spend is waste on average.' });
  if (hours > 3) leaks.push({ key: 'hours', label: 'Owner admin time', amount: (hours - 3) * 4.3 * 45, line: `${hours} hours a week on work a system should do.` });
  leaks.sort((a, b) => b.amount - a.amount);
  const leakTotal = Math.round(leaks.reduce((s, l) => s + l.amount, 0) / 50) * 50;

  // Top three leaks for the result page: worst findings weighted by points lost, cross-referenced with money.
  const worst = findings.filter((f) => f.status !== 'pass').sort((a, b) => (b.max - b.points) - (a.max - a.points)).slice(0, 3);

  return {
    score: total, band: bandOf(total), pillars, findings, worst,
    money: { monthly: leakTotal, leaks: leaks.map((l) => ({ ...l, amount: Math.round(l.amount / 10) * 10 })), assumptions: { industry: ind.label, closeRate: ind.close, jobValue, leadsPerMonth: ind.leads, reviewMedian: ind.reviewMedian } },
  };
}
