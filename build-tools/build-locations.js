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
<meta property="og:image" content="https://easyworks.ai/og-image.png?v=3">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Easyworks AI">
<meta property="og:locale" content="en_CA">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://easyworks.ai/og-image.png?v=3">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/png" href="../../favicon.png?v=4">
<link rel="apple-touch-icon" href="../../icon-192.png?v=4">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&amp;family=Inter:wght@400;500;600&amp;family=JetBrains+Mono:wght@500&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../style.min.css?v=v3blue6">
<link rel="stylesheet" href="../../redesign.css?v=54">`;

const navAndCanvas = () => `</head><body class="cosmic"><div id="page-loader" aria-hidden="true"><div class="pl-stage"><div class="pl-ring"></div><div class="pl-ring pl-ring-2"></div><div class="pl-ring pl-ring-3"></div><div class="pl-orb"></div><span class="pl-label">Loading</span></div></div>
<canvas id="cosmic-canvas" aria-hidden="true"></canvas><div class="cosmic-grid" aria-hidden="true"></div><div class="cosmic-blob cosmic-blob-1" aria-hidden="true"></div><div class="cosmic-blob cosmic-blob-2" aria-hidden="true"></div><div class="cosmic-blob cosmic-blob-3" aria-hidden="true"></div>
<nav class="nav" id="nav"><div class="nav-inner">
<a href="../../" class="logo"><img src="../../img/mark-96.png?v=1" srcset="../../img/mark-48.png?v=1 1x, ../../img/mark-96.png?v=1 2x, ../../img/mark-144.png?v=1 3x" width="32" height="32" alt="" class="logo-icon-img"><span class="logo-wordmark logo-tracked">EASYWORKS</span></a>
<div class="nav-links" id="navLinks"><a href="../../#capabilities">What we build</a><a href="../../#program">How it works</a><a href="../../#coverage">Where we work</a><a href="/scan/" class="nav-cta">Run the free Scan</a></div><button class="hamburger" id="hamburger" aria-label="Menu"><span></span><span></span></button>
</div></nav>`;

const footer = () => `<footer class="footer"><div class="container"><div class="footer-grid">
<div class="footer-brand"><a href="../../" class="logo"><img src="../../img/mark-96.png?v=1" srcset="../../img/mark-48.png?v=1 1x, ../../img/mark-96.png?v=1 2x, ../../img/mark-144.png?v=1 3x" width="32" height="32" alt="" class="logo-icon-img"><span class="logo-wordmark logo-tracked">EASYWORKS</span></a><p>Less doing.<br>More done.</p>
<div class="footer-contact"><a href="mailto:team@easyworksai.com">team@easyworksai.com</a><a href="tel:+16042657660">+1 (604) 265-7660</a><span>Founder led</span><span>Canada and the United States</span></div>
</div>
<div class="footer-col"><h4>Products</h4><a href="../../scribe/">Easyworks Scribe (BC clinicians)</a><a href="../../content-engine/">Content Engine</a><a href="../../seo-engine/">SEO Engine</a><a href="../../ai-suite/">AI Suite</a><a href="../../ai-revenue-scale/">AI Revenue Scale</a></div>
<div class="footer-col"><h4>Locations</h4><a href="/locations/vancouver/">Vancouver</a><a href="/locations/surrey/">Surrey</a><a href="/locations/burnaby/">Burnaby</a><a href="/locations/langley/">Langley</a><a href="/locations/abbotsford/">Abbotsford</a><a href="/locations/chilliwack/">Chilliwack</a><a href="/locations/squamish/">Squamish</a><a href="/locations/whistler/">Whistler</a><a href="/locations/coquitlam/">Coquitlam</a><a href="/locations/richmond/">Richmond</a><a href="/locations/delta/">Delta</a><a href="/locations/new-westminster/">New Westminster</a><a href="/locations/north-vancouver/">North Vancouver</a><a href="/locations/maple-ridge/">Maple Ridge</a><a href="/locations/">All BC cities →</a></div>
<div class="footer-col"><h4>Industries</h4><a href="/industries/home-services/">Home services and trades</a><a href="/industries/med-spas/">Med spas</a><a href="/industries/dental/">Dental practices</a><a href="/industries/">All industries →</a></div>
<div class="footer-col"><h4>Company</h4><a href="/scan/">The Scan (free)</a><a href="/blueprint/">The Blueprint</a>${process.env.EW_DRAFT_PAGES === '1' ? '<a href="/studio/">Studio</a><a href="/partners/">Partners</a>' : ''}<a href="../../#faq">FAQ</a><a href="../../#start">Contact</a><a href="mailto:team@easyworksai.com">team@easyworksai.com</a></div>
</div><div class="footer-bar"><span>&copy; 2026 Easyworks AI Solutions</span><span class="footer-links"><a href="../../">Home</a></span></div></div></footer>

<script src="../../script.min.js?v=73d7341d" defer></script>
<script src="../../redesign.js?v=7" defer></script>
</body></html>`;

const cityPage = (c) => {
  const url = `https://easyworks.ai/locations/${c.slug}/`;
  const title = c.title || `AI Services and AI Consulting in ${c.city}, ${c.region} | Easyworks AI`;
  const description = c.description || `AI services for ${c.city} businesses, founder led. Website, Google Business Profile, CRM, AI receptionist and local SEO, diagnosed, built and run for you.`;
  const og = `AI for ${c.city} Businesses — Easyworks AI`;

  const schemas = `
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"LocalBusiness","@id":"https://easyworks.ai/locations/${c.slug}/#business","name":"Easyworks AI Solutions — ${c.city}","url":"${url}","image":"https://easyworks.ai/og-image.png","telephone":"+1-604-265-7660","email":"team@easyworksai.com","areaServed":{"@type":"City","name":"${c.city}, ${c.region}"},"address":{"@type":"PostalAddress","addressLocality":"${c.city}","addressRegion":"${c.region}","addressCountry":"CA"},"geo":{"@type":"GeoCoordinates","latitude":${c.lat},"longitude":${c.lon}},"sameAs":["https://easyworks.ai/"]}
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
        <p class="psub-tagline">Working with ${c.city} businesses. Founder led. Real humans.</p>
        <p class="psub-pitch">${c.intro}</p>
        <div class="psub-meta">
          <div class="psub-price"><span class="psub-price-num">Scan</span><span>free · find the leaks</span></div>
          <div class="psub-divider"></div>
          <div class="psub-price"><span class="psub-price-num">Build</span><span>only what you need</span></div>
          <div class="psub-divider"></div>
          <div class="psub-price"><span class="psub-price-num">Maintain</span><span>we run it monthly</span></div>
        </div>
        <div class="psub-cta-row">
          <a href="/scan/" class="btn btn-accent btn-lg">Run the free Scan <span aria-hidden="true">→</span></a>
          <a href="../../#capabilities" class="btn btn-glass btn-lg">See what a build includes</a>
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

${c.consulting ? `<section class="section">
  <div class="container">
    <div class="section-header" data-r><p class="overline">${c.consulting.overline}</p><h2>${c.consulting.h2}</h2></div>
    <div class="rs-features">
      ${c.consulting.paras.map((p, i) => `<div class="rs-feat" data-r data-d="${i}"><div class="rs-feat-num">0${i+1}</div><p>${p}</p></div>`).join('\n      ')}
    </div>
    <p style="margin-top:22px" data-r><a href="/scan/" class="btn btn-accent btn-lg">Run the free Scan <span aria-hidden="true">→</span></a></p>
  </div>
</section>` : ''}
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
    <div class="section-header center" data-r><p class="overline">What's included</p><h2>What a ${c.city} build can include.</h2></div>
    <div class="rs-features">
      <div class="rs-feat" data-r data-d="0"><div class="rs-feat-num">01</div><h3>Premium website + management</h3><p>Built for your trade. Fast on mobile. We host, maintain, and update it for you.</p></div>
      <div class="rs-feat" data-r data-d="1"><div class="rs-feat-num">02</div><h3>Google Business Profile fully optimized</h3><p>Claimed, categorized, photographed, posting weekly. The single highest-ROI move for local search in ${c.city}.</p></div>
      <div class="rs-feat" data-r data-d="2"><div class="rs-feat-num">03</div><h3>CRM + lead capture</h3><p>Every inquiry from every channel lands in one inbox. Nothing falls through the cracks.</p></div>
      <div class="rs-feat" data-r data-d="3"><div class="rs-feat-num">04</div><h3>Basic AI receptionist</h3><p>Captures every missed call. Books the easy stuff. Routes the rest to you.</p></div>
      <div class="rs-feat" data-r data-d="4"><div class="rs-feat-num">05</div><h3>Local SEO + review engine</h3><p>Citations, schema, and a review-request system that finally moves your star count.</p></div>
      <div class="rs-feat" data-r data-d="5"><div class="rs-feat-num">06</div><h3>Branding kit</h3><p>Logo refresh if you need one, social templates, email signatures. The basics, done right.</p></div>
    </div>
    <p style="text-align:center;margin-top:32px;font-size:0.95rem;color:rgba(246,248,255,0.75);">Every engagement starts with a Blueprint. We build only what it finds, the Blueprint is credited to the build, and we run it for you every month.</p>
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
      <div class="cta-brand"><img src="../../img/mark-96.png?v=1" srcset="../../img/mark-48.png?v=1 1x, ../../img/mark-96.png?v=1 2x, ../../img/mark-144.png?v=1 3x" alt="" class="hero-icon-img" style="width:56px;height:56px"><span class="brand-name brand-tracked" style="font-size:1.4rem">EASYWORKS</span></div>
      <h2>Ready to install in ${c.city}?</h2>
      <p>Tell us about your ${c.city} business. You'll <strong>talk to the founder</strong>. Real humans, a real build.</p>
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
  const description = `${i.tagline} Growth systems for ${i.industry.toLowerCase()}, diagnosed, built and run for you. ${i.region}.`;
  const og = `${i.title} | Easyworks`;

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

  return `${head({title: `${i.title} | Easyworks`, description, url, og})}${schemas}
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
          <div class="psub-price"><span class="psub-price-num">Scan</span><span>free · find the leaks</span></div>
          <div class="psub-divider"></div>
          <div class="psub-price"><span class="psub-price-num">Build</span><span>only what you need</span></div>
          <div class="psub-divider"></div>
          <div class="psub-price"><span class="psub-price-num">Maintain</span><span>we run it monthly</span></div>
        </div>
        <div class="psub-cta-row">
          <a href="/scan/" class="btn btn-accent btn-lg">Run the free Scan <span aria-hidden="true">→</span></a>
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
      <div class="cta-brand"><img src="../../img/mark-96.png?v=1" srcset="../../img/mark-48.png?v=1 1x, ../../img/mark-96.png?v=1 2x, ../../img/mark-144.png?v=1 3x" alt="" class="hero-icon-img" style="width:56px;height:56px"><span class="brand-name brand-tracked" style="font-size:1.4rem">EASYWORKS</span></div>
      <h2>${i.ctaTitle || `Ready to see where your ${i.industry.toLowerCase().replace(/s$/,'')} is leaking leads?`}</h2>
      <p>${i.ctaText || 'Start with the free Scan. Then the Blueprint: a written plan, credited to your build.'}</p>
    </div>
    <div style="text-align:center; margin-top: 24px;">
      <a href="/scan/" class="btn btn-accent btn-lg">Run the free Scan <span aria-hidden="true">→</span></a>
    </div>
  </div>
</section>

${footer()}`;
};

// Ad landers (/for/<key>/): same page, noindex, no site nav, every CTA goes to the Scan with the industry preselected.
const landerPage = (i) => {
  const scan = `/scan/?i=${i.scanKey}`;
  return industryPage(i)
    .split(`https://easyworks.ai/industries/${i.slug}/`).join(`https://easyworks.ai/for/${i.lander}/`)
    .replace('<meta charset="UTF-8">', '<meta name="robots" content="noindex,follow"><meta charset="UTF-8">')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '')
    .replace(/<a href="\.\.\/" class="psub-back"[^>]*>[^<]*<\/a>/, '')
    .replace(/<a href="\.\.\/\.\.\/#capabilities">What we build<\/a><a href="\.\.\/\.\.\/#program">How it works<\/a><a href="\.\.\/\.\.\/#coverage">Where we work<\/a>/, '')
    .split('href="/scan/"').join(`href="${scan}"`)
    .replace('<body class="cosmic">', `<body class="cosmic is-lander" data-lander="${i.lander}">`);
};

// The Blueprint page (/blueprint/). One level deep, so the shared ../../ paths are rewritten to ../
const blueprintPage = () => {
  const url = 'https://easyworks.ai/blueprint/';
  const title = 'The Blueprint: a full diagnosis of your business | Easyworks';
  const description = 'The Blueprint reads all six vitals of your business with real numbers, then gives you a written diagnosis and a build plan in priority order. Founder led. The fee is credited in full to your build.';
  const vitals = [
    ['Connection', 'Are your phone, website, calendar, CRM and reviews one system, or separate tools that never talk? This is the one the free Scan cannot see from outside.'],
    ['Reflexes', 'How fast a new lead gets a real reply, and how many calls end in voicemail. Measured from your own call and message logs.'],
    ['Voice', 'How easily customers find you: your site, your Google profile, your listings and where you rank for what they actually search.'],
    ['Circulation', 'Repeat business, reviews and referrals. Whether past customers come back, and whether happy ones are ever asked to say so.'],
    ['Immunity', 'How ready you are for where your market is heading over the next few years. The other vital the Scan cannot read.'],
    ['Autonomy', 'How much of the business runs without the owner. We count the hours you spend on admin, follow up and scheduling.'],
  ];
  const gets = [
    ['A written diagnosis', 'Plain language, no jargon. What is weak, why, and the evidence behind every point.'],
    ['Your full Rating', 'Your Business Longevity Rating across all six vitals, based on your real numbers and not industry averages.'],
    ['What each gap costs', 'A monthly figure for each weakness, worked out from your own calls, leads and job values.'],
    ['The build plan', 'What to fix, in priority order, with a fixed scope and price for each piece. Nothing you do not need.'],
  ];
  const steps = [
    ['Book a 15 minute call', 'You talk to the founder. We confirm the Blueprint fits your business and quote the fee before you commit to anything.'],
    ['We gather the real numbers', 'About an hour of your time across one or two calls. We look at your call logs, follow up, Google profile, reviews, site and the tools you use.'],
    ['You get the Blueprint', 'A written document, walked through with you live. Usually inside three days of the first working call.'],
  ];
  const faq = [
    ['What does the Blueprint cost?', 'The fee is quoted on your first call, before you commit. It is credited in full to your build, so if you go ahead it costs you nothing extra.'],
    ['Do I have to build with Easyworks afterwards?', 'No. The Blueprint is yours to keep either way. You can hand it to your own team or another company.'],
    ['How is it different from the free Scan?', 'The Scan reads four vitals from public signals and six questions, in about a minute. The Blueprint reads all six vitals using your real numbers, and ends with a scoped build plan.'],
    ['How much of my time does it take?', 'About an hour in total, plus the walkthrough at the end.'],
    ['What access do you need?', 'Read access to what you already use: your phone or call log, your Google Business Profile, your booking or CRM tool and your website analytics if you have them. We never need passwords sent by email, and we tell you exactly what we looked at.'],
    ['What if I am not happy?', 'The Blueprint is yours to keep whatever you decide. If you go ahead with a build and are not happy in the first 30 days, we make it right or refund you.'],
  ];
  const schemas = `
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Service","name":"The Blueprint","description":${JSON.stringify(description)},"url":"${url}","provider":{"@type":"LocalBusiness","@id":"https://easyworks.ai/#business","name":"Easyworks AI Solutions"},"areaServed":["Canada","United States"]}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[${faq.map(f => `{"@type":"Question","name":${JSON.stringify(f[0])},"acceptedAnswer":{"@type":"Answer","text":${JSON.stringify(f[1])}}}`).join(',')}]}
</script>`;
  const html = `${head({ title, description, url, og: 'The Blueprint | Easyworks' })}${schemas}
${navAndCanvas()}

<section class="psub-hero bp-hero">
  <div class="psub-hero-mesh"></div>
  <div class="container">
    <div class="psub-hero-grid" data-r data-d="1">
      <div class="psub-hero-icon"><div class="eng-glyph" aria-hidden="true"><svg viewBox="0 0 200 200" class="gl-glow"><rect class="gl-stroke gl-stroke-2" x="46" y="34" width="108" height="132" rx="10"/><path class="gl-stroke" d="M66 70h68M66 96h68M66 122h40"/><circle class="gl-fill-gold" cx="134" cy="134" r="9"/></svg></div></div>
      <div class="psub-hero-copy">
        <p class="overline">Step two, after the free Scan</p>
        <h1>The Blueprint</h1>
        <p class="psub-tagline">The full physical for your business.</p>
        <p class="psub-pitch">The Scan reads what anyone can see from outside. The Blueprint goes inside. The founder reads all six vitals using your real numbers, then hands you a written diagnosis and a build plan in priority order. The fee is credited in full to your build, and the document is yours to keep either way.</p>
        <div class="psub-cta-row">
          <a href="../#start" class="btn btn-accent btn-lg" data-bp-book>Book your Blueprint <span aria-hidden="true">→</span></a>
          <a href="/scan/" class="btn btn-glass btn-lg" data-bp-scan>Run the free Scan first</a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section section-alt" id="vitals">
  <div class="container">
    <div class="section-header" data-r><p class="overline">What we read</p><h2>Six vitals. Your real numbers.</h2></div>
    <div class="rs-features">
      ${vitals.map((v, idx) => `<div class="rs-feat" data-r data-d="${idx % 3}"><div class="rs-feat-num">0${idx + 1}</div><h3>${v[0]}</h3><p>${v[1]}</p></div>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="section" id="deliverable">
  <div class="container container-mid">
    <div class="section-header" data-r><p class="overline">What you get</p><h2>A document you can act on.</h2></div>
    <dl class="bp-gets">
      ${gets.map((g, idx) => `<div class="bp-get" data-r data-d="${idx % 2}"><dt>${g[0]}</dt><dd>${g[1]}</dd></div>`).join('\n      ')}
    </dl>
  </div>
</section>

<section class="section section-alt" id="how">
  <div class="container container-mid">
    <div class="section-header" data-r><p class="overline">How it works</p><h2>Three steps. Founder led.</h2></div>
    <ol class="bp-steps">
      ${steps.map((st, idx) => `<li class="bp-step" data-r data-d="${idx}"><span class="bp-step-n">${idx + 1}</span><div><h3>${st[0]}</h3><p>${st[1]}</p></div></li>`).join('\n      ')}
    </ol>
  </div>
</section>

<section class="section" id="faq">
  <div class="container container-mid">
    <p class="overline" data-r>FAQ</p>
    <h2 data-r data-d="1">Blueprint questions, answered.</h2>
    <div class="faq-list">
      ${faq.map(f => `<div class="faq-item" data-r><button class="faq-q">${f[0]}</button><div class="faq-a"><p>${f[1]}</p></div></div>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section-cta" id="start">
  <div class="container container-mid">
    <div class="cta-header" data-r>
      <h2>Ready for the full picture?</h2>
      <p>Book a 15 minute call with the founder. If you have run the Scan, your results come with you.</p>
    </div>
    <div style="text-align:center; margin-top: 24px;">
      <a href="../#start" class="btn btn-accent btn-lg" data-bp-book>Book your Blueprint <span aria-hidden="true">→</span></a>
    </div>
  </div>
</section>
<script>
(function(){var r=new URLSearchParams(location.search).get('r');if(!r)return;
document.querySelectorAll('[data-bp-book]').forEach(function(a){a.href='../?scan='+encodeURIComponent(r)+'#start';});
document.querySelectorAll('[data-bp-scan]').forEach(function(a){a.href='/scan/?r='+encodeURIComponent(r);a.textContent='Back to your Scan report';});
document.querySelectorAll('[data-bp-book]').forEach(function(a){a.addEventListener('click',function(){try{gtag('event','blueprint_click',{from:'blueprint_page'});}catch(e){}});});})();
</script>

${footer()}`;
  return html.split('../../').join('../');
};

// ---- Studio (/studio/) and Partners (/partners/). For people with an app or platform idea, creators,
// visionaries, and for partners. Kept out of the top nav so the small business funnel stays simple. ----
const simplePage = ({ slug, title, description, og, overline, h1, tagline, pitch, ctas, sections, faq, ctaTitle, ctaText, ctaBtn }) => {
  const url = `https://easyworks.ai/${slug}/`;
  const schemas = faq && faq.length ? `
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[${faq.map(f => `{"@type":"Question","name":${JSON.stringify(f[0])},"acceptedAnswer":{"@type":"Answer","text":${JSON.stringify(f[1])}}}`).join(',')}]}
</script>` : '';
  const sec = (x, i) => {
    const alt = i % 2 === 0 ? ' section-alt' : '';
    if (x.kind === 'cards') return `<section class="section${alt}" id="${x.id}"><div class="container"><div class="section-header" data-r><p class="overline">${x.overline}</p><h2>${x.h2}</h2></div><div class="rs-features">${x.items.map((it, k) => `<div class="rs-feat" data-r data-d="${k % 3}"><div class="rs-feat-num">0${k + 1}</div><h3>${it[0]}</h3><p>${it[1]}</p></div>`).join('')}</div></div></section>`;
    if (x.kind === 'work') return `<section class="section${alt}" id="${x.id}"><div class="container container-mid"><div class="section-header" data-r><p class="overline">${x.overline}</p><h2>${x.h2}</h2></div><dl class="st-work">${x.items.map((it, k) => `<div class="st-item" data-r data-d="${k % 2}"><dt><span class="st-kind">${it[0]}</span>${it[1]}</dt><dd>${it[2]}${it[3] ? ` <a href="${it[3]}" target="_blank" rel="noopener">See it live ↗</a>` : ''}</dd></div>`).join('')}</dl>${x.note ? `<p class="st-note" data-r>${x.note}</p>` : ''}</div></section>`;
    if (x.kind === 'steps') return `<section class="section${alt}" id="${x.id}"><div class="container container-mid"><div class="section-header" data-r><p class="overline">${x.overline}</p><h2>${x.h2}</h2></div><ol class="bp-steps">${x.items.map((it, k) => `<li class="bp-step" data-r data-d="${k % 3}"><span class="bp-step-n">${k + 1}</span><div><h3>${it[0]}</h3><p>${it[1]}</p></div></li>`).join('')}</ol></div></section>`;
    return '';
  };
  const html = `${head({ title, description, url, og })}${schemas}
${navAndCanvas()}

<section class="psub-hero bp-hero">
  <div class="psub-hero-mesh"></div>
  <div class="container">
    <div class="psub-hero-grid" data-r data-d="1">
      <div class="psub-hero-icon"><img src="../../img/mark-hero.webp?v=3" alt="" width="260" height="260" style="width:min(260px,60vw);height:auto"></div>
      <div class="psub-hero-copy">
        <p class="overline">${overline}</p>
        <h1>${h1}</h1>
        <p class="psub-tagline">${tagline}</p>
        <p class="psub-pitch">${pitch}</p>
        <div class="psub-cta-row">${ctas.map((c, k) => `<a href="${c[1]}" class="btn ${k === 0 ? 'btn-accent' : 'btn-glass'} btn-lg">${c[0]}${k === 0 ? ' <span aria-hidden="true">→</span>' : ''}</a>`).join('')}</div>
      </div>
    </div>
  </div>
</section>

${sections.map(sec).join('\n\n')}

<section class="section" id="faq">
  <div class="container container-mid">
    <p class="overline" data-r>FAQ</p>
    <h2 data-r data-d="1">Straight answers.</h2>
    <div class="faq-list">${faq.map(f => `<div class="faq-item" data-r><button class="faq-q">${f[0]}</button><div class="faq-a"><p>${f[1]}</p></div></div>`).join('')}</div>
  </div>
</section>

<section class="section section-cta" id="start">
  <div class="container container-mid">
    <div class="cta-header" data-r><h2>${ctaTitle}</h2><p>${ctaText}</p></div>
    <div style="text-align:center; margin-top: 24px;"><a href="${ctaBtn[1]}" class="btn btn-accent btn-lg">${ctaBtn[0]} <span aria-hidden="true">→</span></a></div>
  </div>
</section>

${footer()}`;
  return html.split('../../').join('../');
};

// Reference stories, told without names (Brad 2026-09-19: use these as reference stories, not named case studies).
const BUILT = [
  ['Indoor navigation', 'A map for the inside of big buildings', 'Someone told us people get lost in large shopping centres. The first working version existed that night: type a store, follow a glowing path to the door. A dashboard for the building owner and a licensing console followed the next day.', ''],
  ['Data platform', 'Every government contract in one place', 'A founder wanted one search across the public bid portals his industry has to watch. The platform now gathers thousands of open contracts and reads them for him.', ''],
  ['Creator platform', 'An artist who owns his audience', 'A recording artist wanted a home that was his, not rented from a social network. Members, payments, a music player, an events list and an app for his street team.', ''],
  ['Private assistant', 'An assistant that never sleeps', 'A realtor wanted help that kept up with her. She texts it like a colleague, and it keeps track of every lead inside the tools she already uses.', ''],
];

const studioPage = () => simplePage({
  slug: 'studio',
  title: 'Easyworks Studio: custom apps, platforms and infrastructure | Easyworks',
  description: 'You have the idea. We build what it runs on. Custom apps, platforms and private infrastructure for founders, creators and private clients. Founder led, first working version in days.',
  og: 'Easyworks Studio',
  overline: 'Easyworks Studio',
  h1: 'You have the idea.<br>We build what it runs on.',
  tagline: 'Custom apps, platforms and infrastructure for people building something new.',
  pitch: 'Some ideas need software that does not exist yet. That is the work we like most. You bring the vision and the knowledge of your world. The founder designs and builds the machine underneath it, shows you a working version in days, and stays to run it.',
  ctas: [['Tell us about the idea', 'mailto:team@easyworksai.com?subject=Studio%3A%20an%20idea%20I%20want%20to%20build'], ['See what we have built', '#built']],
  sections: [
    { kind: 'cards', id: 'who', overline: 'Who this is for', h2: 'Three kinds of people.', items: [
      ['You have an app or platform idea', 'You know the problem better than anyone. You do not need a technical cofounder to find out if it works. You need a working first version and someone who can carry it all the way.'],
      ['You are a creator', 'Your audience lives on platforms you do not own. We build the place that is yours: membership, payments, content, events, and the data that comes with them.'],
      ['You are a private client', 'You want something built properly and quietly: a private assistant, an internal tool, a system nobody else has. One person accountable, from the first call to the day it runs.'],
    ] },
    { kind: 'work', id: 'built', overline: 'What we have built', h2: 'Four ideas that did not exist until someone asked.', items: BUILT, note: 'Every one started the same way. Someone had a vision, and we built the machine underneath it.' },
    { kind: 'steps', id: 'how', overline: 'How it works', h2: 'Working software first. Decks later.', items: [
      ['A conversation', 'You talk to the founder. We find out what the idea really needs, what already exists that we can stand on, and what has to be invented.'],
      ['A working first version, in days', 'Not a slideshow. Something you can open on your phone and put in front of the people it is for.'],
      ['The Blueprint for the build', 'A written plan: what we build, in what order, what it costs, who owns what. Agreed in writing before the real build starts.'],
      ['Build, launch and run', 'We build it, launch it with you and keep it running. You are never handed a pile of code and wished good luck.'],
    ] },
  ],
  faq: [
    ['Who owns what we build?', 'That is agreed in writing before the build starts, and it depends on how we work together. In a paid build, what is made for you is yours. In a partnership, it belongs to the venture. The general tools we bring stay ours, and you get a licence to use them.'],
    ['What does it cost?', 'It depends entirely on the idea, so we do not publish prices. After the first conversation you get a scoped plan with a fixed price for each stage.'],
    ['How fast is a first version?', 'Usually days, not months. It will not be finished, but it will be real enough to test with the people it is for.'],
    ['Will you sign a confidentiality agreement?', 'Yes. We are happy to sign one before you share the details.'],
    ['Do you ever build for a share instead of a fee?', 'Sometimes, for a small number of ventures where we believe in the idea and the person. See the <a href="/partners/">partnerships page</a>.'],
    ['I run a small business and just want more customers. Is this for me?', 'Probably not. Start with the <a href="/scan/">free Scan</a>. It shows where your business is losing customers in about a minute.'],
  ],
  ctaTitle: 'Bring the idea that needs something that does not exist yet.',
  ctaText: 'Write a few lines about what you want to build. The founder reads every one and replies himself.',
  ctaBtn: ['Tell us about the idea', 'mailto:team@easyworksai.com?subject=Studio%3A%20an%20idea%20I%20want%20to%20build'],
});

const partnersPage = () => simplePage({
  slug: 'partners',
  title: 'Partnerships: agencies, ventures and referrals | Easyworks',
  description: 'Three ways to work with Easyworks as a partner: white label delivery for agencies, technical partnership on new ventures, and paid referrals. Founder led.',
  og: 'Easyworks Partnerships',
  overline: 'Partnerships',
  h1: 'Build with us,<br>not just through us.',
  tagline: 'Three ways to partner with Easyworks.',
  pitch: 'Some of our best work happens with partners: agencies who need delivery they can trust, founders who need a technical partner, and people who simply know a business that needs us. Each works differently, and each is agreed in writing before anything starts.',
  ctas: [['Start a conversation', 'mailto:team@easyworksai.com?subject=Partnership%20inquiry'], ['See what we have built', '/studio/#built']],
  sections: [
    { kind: 'cards', id: 'ways', overline: 'Ways to partner', h2: 'Pick the one that fits.', items: [
      ['Agencies and resellers', 'You own the client relationship. We build and run the systems behind it under your brand or ours: call answering, follow up, reviews, websites, ads and custom tools. One accountable builder, no surprises for your client.'],
      ['Venture partners', 'You have the idea, the industry knowledge and the relationships. We come in as the technical partner and build the product with you. We take on a small number of these, where we believe in the idea and the person.'],
      ['Referral partners', 'You know a business that is losing customers, or someone with an idea worth building. Introduce us. Referral partners are paid, and the terms are simple and in writing.'],
    ] },
    { kind: 'steps', id: 'how', overline: 'How a partnership starts', h2: 'Paper first. Then we build.', items: [
      ['A conversation', 'We find out what you need and whether we are the right fit. If we are not, we will say so.'],
      ['Terms in writing', 'Who does what, who owns what, who gets paid what. Agreed before any work begins, so nobody is guessing later.'],
      ['A first project', 'We start with one client or one working version, prove it, and grow from there.'],
    ] },
    { kind: 'work', id: 'network', overline: 'The family', h2: 'Who stands behind us.', items: [
      ['Parent company', 'Ampcos Advisory Group', 'The advisory group Easyworks belongs to. Strategy, structure and technology for growing companies.', 'https://ampcos.com'],
      ['Sister company', 'Ampcos Robotics', 'Our sister lab working on safe, scoped robots for real workplaces. Early stage.', 'https://ampcoslabs.com/robotics/'],
    ] },
  ],
  faq: [
    ['Do you white label?', 'Yes. We can deliver under your brand, ours, or both. Your client relationship stays yours.'],
    ['How are referral partners paid?', 'A share of what the client pays, for a set period, agreed in writing. Ask us for the current terms.'],
    ['What do you look for in a venture partner?', 'Someone who knows their industry deeply, can reach the first customers, and wants a real partner, not a contractor. We bring the product and the technology.'],
    ['Where are you based?', 'We are founder led and remote first, working with partners across Canada and the United States.'],
  ],
  ctaTitle: 'Tell us what you are building.',
  ctaText: 'A few lines is enough. The founder reads every message and replies himself.',
  ctaBtn: ['Start a conversation', 'mailto:team@easyworksai.com?subject=Partnership%20inquiry'],
});

// Index pages
const locationsIndex = () => {
  const url = `https://easyworks.ai/locations/`;
  const description = `Easyworks builds and runs done for you customer systems for BC businesses, founder led. See your city.`;
  const links = cities.map(c => `<a class="rp-card" href="./${c.slug}/" data-r><span class="rp-icon rp-icon-dot"></span><div class="rp-body"><h4>${c.city}</h4><p>AI for ${c.city} businesses</p></div><span class="rp-arrow">→</span></a>`).join('\n      ');
  return `${head({title: 'Locations: AI Services Across BC | Easyworks AI', description, url, og: 'Easyworks AI Locations'})}
${navAndCanvas()}

<section class="psub-hero">
  <div class="psub-hero-mesh"></div>
  <div class="container">
    <a href="../" class="psub-back" data-r>← Home</a>
    <div class="psub-hero-grid" data-r data-d="1">
      <div class="psub-hero-copy" style="grid-column:1 / -1">
        <h1>Locations across BC.</h1>
        <p class="psub-tagline">Whistler to Chilliwack. Founder led.</p>
        <p class="psub-pitch">Every build is led by the founder, from the first call to the day you go live. Below is every BC city we have a dedicated page for. Anywhere else in Canada or the United States works the same way.</p>
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
  const description = `Growth systems built for your specific industry. Diagnosed, built and run for you. Canada, the US, the UK and worldwide.`;
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
        <p class="psub-pitch">Generic tools fail at industry specific work because they were never built for it. We are. These are the verticals where our builds are most repeatable, most measurable and most worth the investment. Every one starts with a Blueprint.</p>
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
for (const i of industries.filter(x => x.lander)) {
  const dir = path.join(ROOT, 'for', i.lander);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), landerPage(i));
  console.log('wrote for/' + i.lander + '/index.html');
}

// DRAFT pages: only built when EW_DRAFT_PAGES=1, so a routine production deploy (the SEO autopilot) cannot publish them.
// To launch: remove this gate, add both URLs to sitemap.xml, and add the footer links.
for (const [slug, fn] of (process.env.EW_DRAFT_PAGES === '1' ? [['studio', studioPage], ['partners', partnersPage]] : [])) {
  fs.mkdirSync(path.join(ROOT, slug), { recursive: true });
  fs.writeFileSync(path.join(ROOT, slug, 'index.html'), fn());
  console.log('wrote ' + slug + '/index.html');
}

fs.mkdirSync(path.join(ROOT, 'blueprint'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'blueprint', 'index.html'), blueprintPage());
console.log('wrote blueprint/index.html');

fs.mkdirSync(path.join(ROOT, 'industries'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'industries', 'index.html'), industriesIndex());
console.log('wrote industries/index.html');

console.log(`\nGenerated ${count} pages + 2 index pages.`);
