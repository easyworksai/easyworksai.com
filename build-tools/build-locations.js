// Generates /locations/<slug>/index.html for every city in cities.config.js
// and /industries/<slug>/index.html for every industry lander.
// Run from repo root: node build-tools/build-locations.js

const fs = require('fs');
const path = require('path');
const cities = require('./cities.config');
const industries = require('./industries.config');

const ROOT = path.join(__dirname, '..');

const head = ({ title, description, url, og }) => `<!DOCTYPE html><html lang="en"><head>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-3FSRY25VRV"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-3FSRY25VRV');</script>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="theme-color" content="#070b16">
<meta property="og:title" content="${og}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="https://easyworks.ai/og-image.png?v=2">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Easyworks AI">
<meta property="og:locale" content="en_CA">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://easyworks.ai/og-image.png?v=2">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/png" href="../../favicon.svg?v=2">
<link rel="apple-touch-icon" href="../../icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&amp;family=Inter:wght@400;500;600&amp;family=JetBrains+Mono:wght@500&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../style.min.css?v=v3blue6">
<link rel="stylesheet" href="../../redesign.css?v=30">`;

const navAndCanvas = () => `</head><body class="cosmic"><div id="page-loader" aria-hidden="true"><div class="pl-stage"><div class="pl-ring"></div><div class="pl-ring pl-ring-2"></div><div class="pl-ring pl-ring-3"></div><div class="pl-orb"></div><span class="pl-label">Loading</span></div></div>
<canvas id="cosmic-canvas" aria-hidden="true"></canvas><div class="cosmic-grid" aria-hidden="true"></div><div class="cosmic-blob cosmic-blob-1" aria-hidden="true"></div><div class="cosmic-blob cosmic-blob-2" aria-hidden="true"></div><div class="cosmic-blob cosmic-blob-3" aria-hidden="true"></div>
<nav class="nav" id="nav"><div class="nav-inner">
<a href="../../" class="logo"><img src="../../img/icon.svg?v=2" alt="" class="logo-icon-img"><span class="logo-wordmark logo-tracked">EASYWORKS<span class="logo-ai">·AI</span></span></a>
<div class="nav-links" id="navLinks"><a href="../../#products">Products</a><a href="../../#onsite">On-site</a><a href="../../#how">Process</a><a href="../../#start" class="nav-cta">Start with an audit</a></div>
</div></nav>`;

const footer = () => `<footer class="footer"><div class="container"><div class="footer-grid">
<div class="footer-brand"><a href="../../" class="logo"><img src="../../img/icon.svg?v=2" alt="" class="logo-icon-img"><span class="logo-wordmark logo-tracked">EASYWORKS<span class="logo-ai">·AI</span></span></a><p>Less doing.<br>More done.</p>
<div class="footer-contact"><a href="mailto:team@easyworksai.com">team@easyworksai.com</a><a href="tel:+16042657660">+1 (604) 265-7660</a><span>🇨🇦 Built in BC</span><span>Whistler → Chilliwack · global remote</span></div>
</div>
<div class="footer-col"><h4>Products</h4><a href="../../scribe/">Easyworks Scribe (BC clinicians)</a><a href="../../content-engine/">Content Engine</a><a href="../../seo-engine/">SEO Engine</a><a href="../../ai-suite/">AI Suite</a><a href="../../ai-revenue-scale/">AI Revenue Scale</a><a href="../../voice-report/">Voice → Report</a><a href="../../#onsite">On-site install</a></div>
<div class="footer-col"><h4>Locations</h4><a href="/locations/vancouver/">Vancouver</a><a href="/locations/surrey/">Surrey</a><a href="/locations/burnaby/">Burnaby</a><a href="/locations/langley/">Langley</a><a href="/locations/abbotsford/">Abbotsford</a><a href="/locations/chilliwack/">Chilliwack</a><a href="/locations/squamish/">Squamish</a><a href="/locations/whistler/">Whistler</a><a href="/locations/coquitlam/">Coquitlam</a><a href="/locations/richmond/">Richmond</a><a href="/locations/delta/">Delta</a><a href="/locations/new-westminster/">New Westminster</a><a href="/locations/north-vancouver/">North Vancouver</a><a href="/locations/maple-ridge/">Maple Ridge</a><a href="/locations/">All BC cities →</a></div>
<div class="footer-col"><h4>Industries</h4><a href="/industries/ai-for-dentists-bc/">AI for Dentists (BC)</a><a href="/industries/ai-for-physio-bc/">AI for Physiotherapy (BC)</a><a href="/industries/ai-for-spas-bc/">AI for Spas + Med-Spas (BC)</a><a href="/industries/real-estate/">Real Estate Teams</a><a href="/industries/law/">Law Firms</a><a href="/industries/financial/">Mortgage, Insurance, Advisors</a><a href="/industries/home-services/">Home Services</a><a href="/industries/dealerships/">Auto Dealerships</a><a href="/industries/">All industries →</a></div>
<div class="footer-col"><h4>Company</h4><a href="../../#faq">FAQ</a><a href="../../#start">Contact</a><a href="mailto:team@easyworksai.com">team@easyworksai.com</a></div>
</div><div class="footer-bar"><span>&copy; 2026 Easyworks AI Solutions</span><span class="footer-links"><a href="../../">Home</a></span></div></div></footer>

<script src="../../script.min.js?v=73d7341d" defer></script>
<script src="../../redesign.js?v=7" defer></script>
</body></html>`;

const cityPage = (c) => {
  const url = `https://easyworks.ai/locations/${c.slug}/`;
  const title = `AI Services and AI Consulting in ${c.city}, ${c.region} | Easyworks AI`;
  const description = `AI services for ${c.city} businesses, installed on-site. AI receptionist, CRM, local SEO, Google Business Profile and website, from $599/mo with no setup fee. AI consulting from a BC team.`;
  const og = `AI for ${c.city} Businesses — Easyworks AI`;

  const schemas = `
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"LocalBusiness","@id":"https://easyworks.ai/locations/${c.slug}/#business","name":"Easyworks AI Solutions — ${c.city}","url":"${url}","image":"https://easyworks.ai/og-image.png","telephone":"+1-604-265-7660","email":"team@easyworksai.com","priceRange":"$599+","areaServed":{"@type":"City","name":"${c.city}, ${c.region}"},"address":{"@type":"PostalAddress","addressLocality":"${c.city}","addressRegion":"${c.region}","addressCountry":"CA"},"geo":{"@type":"GeoCoordinates","latitude":${c.lat},"longitude":${c.lon}},"sameAs":["https://easyworks.ai/"]}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://easyworks.ai/"},{"@type":"ListItem","position":2,"name":"Locations","item":"https://easyworks.ai/locations/"},{"@type":"ListItem","position":3,"name":"${c.city}","item":"${url}"}]}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[${c.faq.map(f => `{"@type":"Question","name":${JSON.stringify(f.q)},"acceptedAnswer":{"@type":"Answer","text":${JSON.stringify(f.a)}}}`).join(',')}]}
</script>`;

  const mapEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(c.city + ', ' + c.region)}&t=&z=11&ie=UTF8&iwloc=&output=embed`;

  const nearbyLinks = c.nearby.map(slug => {
    const n = cities.find(x => x.slug === slug);
    return n ? `<a class="rp-card" href="../${slug}/"><span class="rp-icon rp-icon-dot"></span><div class="rp-body"><h4>${n.city}</h4><p>AI for ${n.city} businesses</p></div><span class="rp-arrow">→</span></a>` : '';
  }).join('\n');

  return `${head({title, description, url, og})}${schemas}
${navAndCanvas()}

<section class="psub-hero">
  <div class="psub-hero-mesh"></div>
  <div class="container">
    <a href="../" class="psub-back" data-r>← All locations</a>
    <div class="psub-hero-grid" data-r data-d="1">
      <div class="psub-hero-icon"><div class="eng-glyph" aria-hidden="true"><svg viewBox="0 0 200 200" class="gl-glow"><circle class="gl-stroke gl-stroke-2" cx="100" cy="92" r="28"/><path class="gl-stroke gl-stroke-2" d="M62 162c0-23 17-42 38-42s38 19 38 42"/><circle class="gl-fill-gold" cx="100" cy="92" r="6"/></svg></div></div>
      <div class="psub-hero-copy">
        <h1>AI for ${c.city} businesses.</h1>
        <p class="psub-tagline">On-site across ${c.city}. Real install. Real humans.</p>
        <p class="psub-pitch">${c.intro}</p>
        <div class="psub-meta">
          <div class="psub-price"><span class="psub-price-num">$599</span><span>/mo</span></div>
          <div class="psub-divider"></div>
          <div class="psub-price"><span class="psub-price-num">$0</span><span>setup</span></div>
        </div>
        <div class="psub-cta-row">
          <a href="../../#start" class="btn btn-accent btn-lg">Book a ${c.city} consultation <span aria-hidden="true">→</span></a>
          <a href="../../#products" class="btn btn-glass btn-lg">See the Starter</a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-header" data-r><p class="overline">Why ${c.city}</p><h2>Why our work lands in ${c.city}.</h2></div>
    <div class="rs-features">
      ${c.why.map((p, i) => `<div class="rs-feat" data-r data-d="${i}"><div class="rs-feat-num">0${i+1}</div><p>${p}</p></div>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    <div class="section-header center" data-r><p class="overline">Where we work</p><h2>Neighborhoods we install in.</h2></div>
    <div class="ind-grid" data-r data-d="1">
      ${[...new Set(c.neighborhoods)].map(n => `<span class="ind-chip">${n}</span>`).join('\n      ')}
    </div>
    <p style="text-align:center; color:rgba(246,248,255,0.7); margin-top:24px;">Landmarks nearby: ${c.landmarks.join(', ')}.</p>
  </div>
</section>

<section class="section">
  <div class="container container-mid">
    <div style="border-radius:24px; overflow:hidden; aspect-ratio: 16/9; border:1px solid rgba(59,130,246,0.25);">
      <iframe src="${mapEmbed}" width="100%" height="100%" style="border:0;display:block;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Map of ${c.city}, ${c.region}"></iframe>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    <div class="section-header center" data-r><p class="overline">What's included</p><h2>Small Business Starter — what every ${c.city} client gets.</h2></div>
    <div class="rs-features">
      <div class="rs-feat" data-r data-d="0"><div class="rs-feat-num">01</div><h3>Premium website + management</h3><p>Built for your trade. Fast on mobile. We host, maintain, and update it for you.</p></div>
      <div class="rs-feat" data-r data-d="1"><div class="rs-feat-num">02</div><h3>Google Business Profile fully optimized</h3><p>Claimed, categorized, photographed, posting weekly. The single highest-ROI move for local search in ${c.city}.</p></div>
      <div class="rs-feat" data-r data-d="2"><div class="rs-feat-num">03</div><h3>CRM + lead capture</h3><p>Every inquiry from every channel lands in one inbox. Nothing falls through the cracks.</p></div>
      <div class="rs-feat" data-r data-d="3"><div class="rs-feat-num">04</div><h3>Basic AI receptionist</h3><p>Captures every missed call. Books the easy stuff. Routes the rest to you.</p></div>
      <div class="rs-feat" data-r data-d="4"><div class="rs-feat-num">05</div><h3>Local SEO + review engine</h3><p>Citations, schema, and a review-request system that finally moves your star count.</p></div>
      <div class="rs-feat" data-r data-d="5"><div class="rs-feat-num">06</div><h3>Branding kit</h3><p>Logo refresh if you need one, social templates, email signatures. The basics, done right.</p></div>
    </div>
    <p style="text-align:center;margin-top:32px;font-size:0.95rem;color:rgba(246,248,255,0.75);">All for <strong style="color:#f6f8ff">$599/month</strong>. No setup. Six-month commit. Add Content Engine, AI Suite, or AI Revenue Scale whenever you're ready.</p>
  </div>
</section>

<section class="section" id="faq">
  <div class="container container-mid">
    <p class="overline" data-r>FAQ</p>
    <h2 data-r data-d="1">${c.city} questions, answered.</h2>
    <div class="faq-list">
      ${c.faq.map(f => `<div class="faq-item" data-r><button class="faq-q">${f.q}</button><div class="faq-a"><p>${f.a}</p></div></div>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    <div class="section-header center" data-r><p class="overline">Nearby</p><h2>Other BC cities we install in.</h2></div>
    <div class="rp-grid">${nearbyLinks}
      <a class="rp-card" href="../"><span class="rp-icon rp-icon-dot"></span><div class="rp-body"><h4>All locations</h4><p>Whistler → Chilliwack</p></div><span class="rp-arrow">→</span></a>
    </div>
  </div>
</section>

<section class="section section-cta" id="start">
  <div class="container container-mid">
    <div class="cta-header" data-r>
      <div class="cta-brand"><img src="../../img/icon.svg?v=2" alt="" class="hero-icon-img" style="width:56px;height:56px"><span class="brand-name brand-tracked" style="font-size:1.4rem">EASYWORKS<span class="brand-ai">·AI</span></span></div>
      <h2>Ready to install in ${c.city}?</h2>
      <p>Tell us about your ${c.city} business. We'll <strong>come see you</strong> — real humans, real install, on-site.</p>
    </div>
    <div style="text-align:center; margin-top: 24px;">
      <a href="../../#start" class="btn btn-accent btn-lg">Book with a human <span aria-hidden="true">→</span></a>
    </div>
  </div>
</section>

${footer()}`;
};

const industryPage = (i) => {
  const url = `https://easyworks.ai/industries/${i.slug}/`;
  const description = `${i.tagline} Growth systems for ${i.industry.toLowerCase()}, audited, built and run for you. ${i.region}.`;
  const og = `${i.title} — Easyworks AI`;

  const schemas = `
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Service","name":"${i.title}","description":${JSON.stringify(i.intro.slice(0,250))},"url":"${url}","serviceType":"AI for ${i.industry}","provider":{"@type":"LocalBusiness","@id":"https://easyworks.ai/#business","name":"Easyworks AI Solutions"},"areaServed":${JSON.stringify(i.areaServed || "British Columbia, Canada")}}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://easyworks.ai/"},{"@type":"ListItem","position":2,"name":"Industries","item":"https://easyworks.ai/industries/"},{"@type":"ListItem","position":3,"name":"${i.industry}","item":"${url}"}]}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[${i.faq.map(f => `{"@type":"Question","name":${JSON.stringify(f.q)},"acceptedAnswer":{"@type":"Answer","text":${JSON.stringify(f.a)}}}`).join(',')}]}
</script>`;

  return `${head({title: `${i.title} — Easyworks AI`, description, url, og})}${schemas}
${navAndCanvas()}

<section class="psub-hero">
  <div class="psub-hero-mesh"></div>
  <div class="container">
    <a href="../" class="psub-back" data-r>← All industries</a>
    <div class="psub-hero-grid" data-r data-d="1">
      <div class="psub-hero-icon"><div class="eng-glyph" aria-hidden="true"><svg viewBox="0 0 200 200" class="gl-glow"><rect class="gl-stroke gl-stroke-2" x="50" y="50" width="100" height="100" rx="12"/><circle class="gl-fill-gold" cx="100" cy="100" r="8"/><path class="gl-stroke" d="M70 100h60M100 70v60"/></svg></div></div>
      <div class="psub-hero-copy">
        <h1>${i.title}</h1>
        <p class="psub-tagline">${i.tagline}</p>
        <p class="psub-pitch">${i.intro}</p>
        <div class="psub-meta">
          <div class="psub-price"><span class="psub-price-num">Audit</span><span>find the leaks</span></div>
          <div class="psub-divider"></div>
          <div class="psub-price"><span class="psub-price-num">Build</span><span>only what you need</span></div>
          <div class="psub-divider"></div>
          <div class="psub-price"><span class="psub-price-num">Maintain</span><span>we run it monthly</span></div>
        </div>
        <div class="psub-cta-row">
          <a href="../../#start" class="btn btn-accent btn-lg">Start with an audit <span aria-hidden="true">→</span></a>
          <a href="../../#capabilities" class="btn btn-glass btn-lg">See what a build includes</a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section section-alt" id="services">
  <div class="container">
    <div class="section-header" data-r><p class="overline">What we install</p><h2>The ${i.industry.toLowerCase()} stack.</h2></div>
    <div class="rs-features">
      ${i.services.map((s, idx) => `<div class="rs-feat" data-r data-d="${idx}"><div class="rs-feat-num">0${idx+1}</div><h3>${s.name}</h3><p>${s.desc}</p></div>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-header" data-r><p class="overline">Why us</p><h2>Why ${i.industry.toLowerCase()} pick Easyworks.</h2></div>
    <div class="rs-features">
      ${i.why.map((p, idx) => `<div class="rs-feat" data-r data-d="${idx}"><div class="rs-feat-num">0${idx+1}</div><p>${p}</p></div>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section-alt" id="faq">
  <div class="container container-mid">
    <p class="overline" data-r>FAQ</p>
    <h2 data-r data-d="1">${i.industry} questions, answered.</h2>
    <div class="faq-list">
      ${i.faq.map(f => `<div class="faq-item" data-r><button class="faq-q">${f.q}</button><div class="faq-a"><p>${f.a}</p></div></div>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section-cta" id="start">
  <div class="container container-mid">
    <div class="cta-header" data-r>
      <div class="cta-brand"><img src="../../img/icon.svg?v=2" alt="" class="hero-icon-img" style="width:56px;height:56px"><span class="brand-name brand-tracked" style="font-size:1.4rem">EASYWORKS<span class="brand-ai">·AI</span></span></div>
      <h2>${i.ctaTitle || `Ready to see where your ${i.industry.toLowerCase().replace(/s$/,'')} is leaking leads?`}</h2>
      <p>${i.ctaText || 'Start with an audit. You get a written report, and the audit is credited to your build.'}</p>
    </div>
    <div style="text-align:center; margin-top: 24px;">
      <a href="../../#start" class="btn btn-accent btn-lg">Start with an audit <span aria-hidden="true">→</span></a>
    </div>
  </div>
</section>

${footer()}`;
};

// Index pages
const locationsIndex = () => {
  const url = `https://easyworks.ai/locations/`;
  const description = `Easyworks AI installs done-for-you AI systems on-site across BC. Whistler → Chilliwack. See your city.`;
  const links = cities.map(c => `<a class="rp-card" href="./${c.slug}/" data-r><span class="rp-icon rp-icon-dot"></span><div class="rp-body"><h4>${c.city}</h4><p>AI for ${c.city} businesses</p></div><span class="rp-arrow">→</span></a>`).join('\n      ');
  return `${head({title: 'Locations — On-Site AI Install Across BC | Easyworks AI', description, url, og: 'Easyworks AI Locations'})}
${navAndCanvas()}

<section class="psub-hero">
  <div class="psub-hero-mesh"></div>
  <div class="container">
    <a href="../" class="psub-back" data-r>← Home</a>
    <div class="psub-hero-grid" data-r data-d="1">
      <div class="psub-hero-copy" style="grid-column:1 / -1">
        <h1>Locations across BC.</h1>
        <p class="psub-tagline">Whistler to Chilliwack. We come to you.</p>
        <p class="psub-pitch">Every install starts with us showing up at your location. We set the systems up at your shop, your studio, your clinic — not a Zoom call. Below is every BC city we currently install in.</p>
      </div>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    <div class="rp-grid">
      ${links}
    </div>
  </div>
</section>

${footer()}`;
};

const industriesIndex = () => {
  const url = `https://easyworks.ai/industries/`;
  const description = `Growth systems built for your specific industry. Audited, built and run for you. Canada, the US, the UK and worldwide.`;
  const links = industries.map(i => `<a class="rp-card" href="./${i.slug}/" data-r><span class="rp-icon rp-icon-dot"></span><div class="rp-body"><h4>${i.industry}</h4><p>${i.tagline}</p></div><span class="rp-arrow">→</span></a>`).join('\n      ');
  return `${head({title: 'Industries — AI Built for Your Trade | Easyworks AI', description, url, og: 'Easyworks AI Industries'})}
${navAndCanvas()}

<section class="psub-hero">
  <div class="psub-hero-mesh"></div>
  <div class="container">
    <a href="../" class="psub-back" data-r>← Home</a>
    <div class="psub-hero-grid" data-r data-d="1">
      <div class="psub-hero-copy" style="grid-column:1 / -1">
        <h1>Industries we know.</h1>
        <p class="psub-tagline">Built for your trade, not retrofitted to it.</p>
        <p class="psub-pitch">Generic tools fail at industry specific work because they were never built for it. We are. These are the verticals where our builds are most repeatable, most measurable and most worth the investment. Every one starts with an audit.</p>
      </div>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    <div class="rp-grid">
      ${links}
    </div>
  </div>
</section>

${footer()}`;
};

// Write everything. `--industries-only` skips the city pages.
let count = 0;
const INDUSTRIES_ONLY = process.argv.includes('--industries-only');

// City pages
for (const c of (INDUSTRIES_ONLY ? [] : cities)) {
  const dir = path.join(ROOT, 'locations', c.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), cityPage(c));
  console.log('wrote locations/' + c.slug + '/index.html');
  count++;
}
// Locations index
if (!INDUSTRIES_ONLY) {
  fs.mkdirSync(path.join(ROOT, 'locations'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'locations', 'index.html'), locationsIndex());
  console.log('wrote locations/index.html');
}

// Industry pages
for (const i of industries) {
  const dir = path.join(ROOT, 'industries', i.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), industryPage(i));
  console.log('wrote industries/' + i.slug + '/index.html');
  count++;
}
// Industries index
fs.mkdirSync(path.join(ROOT, 'industries'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'industries', 'index.html'), industriesIndex());
console.log('wrote industries/index.html');

console.log(`\nGenerated ${count} pages + 2 index pages.`);
