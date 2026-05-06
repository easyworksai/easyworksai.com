#!/usr/bin/env python3
"""Generate 4 product subpages from a single source of truth.

Each product gets <slug>/index.html with consistent layout:
hero · demo video · features · how-it-works · industries ·
pricing · FAQ · on-site reminder · related products · testimonials · CTA.
"""
from pathlib import Path
from textwrap import dedent

ROOT = Path(__file__).parent

PRODUCTS = {
    "content-engine": {
        "icon": "product-social.png",
        "name": "Content Engine",
        "tagline": "AI-generated content that stops the scroll.",
        "pitch": "Posts, reels, photos & videos — your brand presence on autopilot. Trained on your voice. Posted on your schedule. Engaging your audience while you sleep.",
        "price_setup": "$1,279",
        "price_mo": "$997",
        "demo_caption": "Watch how Content Engine spins up a week of brand content in 5 minutes.",
        "features": [
            ("Daily AI-generated posts",
             "Instagram, Facebook, TikTok, LinkedIn — every platform, every day. Native formats, captions, hashtags, the whole package.",
             "feature-followup.png"),
            ("Photo + video generation",
             "Powered by Higgsfield. Cinematic visuals indistinguishable from a real production team. Stop using stock.",
             "hero.png"),
            ("Brand voice + visual identity training",
             "We sit with you, learn your voice, your tone, your visual style. The AI sounds like you — not like every other dealer/clinic/shop.",
             "step-discovery.png"),
            ("Auto-posting calendar",
             "Drag-drop schedule. Approve in batch. Post automatically. You get to focus on running the business.",
             "feature-calendar.png"),
            ("Engagement monitoring",
             "Comments, DMs, mentions — flagged in real time with reply suggestions. Never leave a customer hanging.",
             "feature-inbox.png"),
        ],
        "how": [
            ("01", "Brand intake", "We come on-site, capture your voice, photograph your space, study your existing content. (Yes — we actually show up.)"),
            ("02", "AI training", "Your visual + tonal identity is encoded into the engine. Every output sounds and looks like you."),
            ("03", "Content batched", "Weeks of posts, reels, and short videos generated. You approve in one batch."),
            ("04", "Auto-published", "Posts go out on optimal time slots. Engagement monitored. Performance reported weekly."),
        ],
        "industries": ["Auto Dealerships", "Real Estate", "Restaurants & Cafes", "Salons & Spas", "Trades & Contractors", "Fitness & Wellness", "Cleaning & Services", "Accounting"],
        "faq": [
            ("Will the content sound like me, or generic AI?",
             "It will sound like you. We do an on-site brand intake and train the engine on your voice, vocabulary, references, and visual style. After 2 weeks, most clients can't tell the AI posts from posts they wrote themselves."),
            ("Do I have to approve every post?",
             "Only if you want to. Most clients approve the first month in batches, then let it run on auto-publish once they trust the voice."),
            ("What platforms does it post to?",
             "Instagram, Facebook, TikTok, LinkedIn, X. We can add Pinterest, YouTube Shorts, and Threads on request."),
            ("Can I review and edit before posting?",
             "Always. Every post has a one-click reject/edit option. Your engagement, your brand."),
        ],
    },
    "seo-engine": {
        "icon": "product-seo.png",
        "name": "SEO Engine",
        "tagline": "Found on Google when it matters.",
        "pitch": "Ranking, technical SEO, Google Business Profile, local citations, and review collection — all managed. So when someone searches, they find you, not your competitor.",
        "price_setup": "$1,279",
        "price_mo": "$997",
        "demo_caption": "See how SEO Engine takes a local business from invisible to top 3 in 90 days.",
        "features": [
            ("Full SEO audit + technical fixes",
             "Site speed, mobile, schema, broken links, indexation, security — all audited and fixed. The boring stuff Google grades you on.",
             "feature-pipeline.png"),
            ("Google Business Profile claim & optimization",
             "We claim it, fully fill it, post weekly, respond to questions, monitor competitors. The single highest ROI move for local search.",
             "feature-call-answering.png"),
            ("Local citations build",
             "Yelp, BBB, Apple Maps, Bing, industry directories — consistent NAP everywhere Google checks for trust signals.",
             "feature-inbox.png"),
            ("2 monthly SEO articles",
             "Original, well-researched, locally-optimized content that ranks. Not AI slop — properly edited, brand-voiced articles.",
             "step-build.png"),
            ("Review request automation",
             "Every happy customer asked for a Google review at the right moment. Watch your star count and rank climb in tandem.",
             "feature-reviews.png"),
        ],
        "how": [
            ("01", "Audit + benchmark", "On-site visit. Full audit of your site, GBP, citations, and current rankings. We know exactly what's broken."),
            ("02", "Foundation fix", "Technical SEO + GBP optimization. The stuff that compounds for years."),
            ("03", "Content + citations", "Monthly articles published. Citation building running in the background."),
            ("04", "Monthly tracking", "Real ranking reports. You see exactly where you climb each month."),
        ],
        "industries": ["Trades & Contractors", "Dental & Medical", "Auto Services", "Real Estate", "Law Firms", "Restaurants", "Beauty & Wellness", "Local Services"],
        "faq": [
            ("How long until I rank?",
             "Foundational fixes show movement in 30 days. Page-one rankings for competitive local terms typically 60-120 days. Longer for very saturated cities."),
            ("Do you guarantee rankings?",
             "No reputable SEO does — Google's algorithm changes are out of our control. What we guarantee: every month you'll see exactly what we did, what changed, and where you rank."),
            ("Will I lose rankings if I cancel?",
             "Not immediately. The foundational work compounds. But ongoing content + GBP posting is what keeps you at the top — competitors will catch up if you stop."),
            ("What if I'm already ranking?",
             "Great. We'll focus on widening the moat — more keywords, more cities, more long-tail traffic, plus protecting your current spots."),
        ],
    },
    "ai-suite": {
        "icon": "product-ai.png",
        "name": "AI Suite",
        "tagline": "Never miss a call. Never lose a lead.",
        "pitch": "Full CRM with AI baked in. 24/7 receptionist, instant lead follow-up, online booking, unified inbox, revenue pipeline. Replaces 5+ tools or bolts onto the one you already have.",
        "price_setup": "$997",
        "price_mo": "$497",
        "demo_caption": "Watch the AI Suite handle a full day of calls, leads, and bookings — completely on its own.",
        "features": [
            ("24/7 AI receptionist",
             "Answers in under 3 seconds. Qualifies the lead. Books appointments. Handles FAQs. Routes urgent calls to you. Your customers won't even realize it's AI.",
             "feature-call-answering.png"),
            ("Instant SMS + email follow-up",
             "New lead hits your funnel? They get a personalized text and email within 60 seconds. You respond first, you win the job.",
             "feature-followup.png"),
            ("Online booking + reminders",
             "Customers self-schedule. Auto-confirmations. SMS reminders cut no-shows by 40%. Your calendar fills itself.",
             "feature-calendar.png"),
            ("Unified inbox",
             "SMS, email, Instagram DM, Facebook Messenger, Google Business chat — all in one place. One screen. One person can handle the whole front desk.",
             "feature-inbox.png"),
            ("Revenue pipeline",
             "Every lead, every stage, every dollar. Know what's closing this week, this month, this quarter. Plus a mobile app so you can check it from anywhere.",
             "feature-pipeline.png"),
        ],
        "how": [
            ("01", "On-site discovery", "We come to your shop. Map your real workflow. Understand how leads come in and where they fall through."),
            ("02", "Build & integrate", "We configure the AI receptionist, follow-up flows, calendar, pipeline — and connect to your tools (or replace them)."),
            ("03", "Train & test", "Live call testing with you in the room. Voice tuned to your brand. Edge cases handled."),
            ("04", "Go live + monitor", "You flip it on. We watch every interaction the first week and tune in real time."),
        ],
        "industries": ["Trades & Contractors", "Dental & Medical", "Real Estate", "Auto Services", "Law Firms", "Salons & Spas", "Cleaning Services", "Fitness & Wellness"],
        "faq": [
            ("Will my customers know it's AI?",
             "Most won't. The voice is natural, the context is yours, and we tune it to feel like a real receptionist who knows your business. We're transparent if asked, of course."),
            ("Can I keep my current CRM?",
             "Yes. The AI Suite has three modes: <strong>Replace</strong> (full new CRM), <strong>Integrate</strong> (bolt our AI onto HubSpot, Salesforce, Pipedrive, Zoho, Monday, or Keap), or <strong>Shadow</strong> (we run alongside and feed you the leads)."),
            ("What happens with complex calls?",
             "The AI escalates to you in real time — text alert, optional warm transfer. You only get pulled in when it matters."),
            ("How are call minutes priced?",
             "$497/mo covers ~500 inbound minutes. Above that, additional minutes billed at standard rate (see service agreement). Most local businesses stay well within base."),
        ],
    },
    "voice-report": {
        "icon": "product-voice.png",
        "name": "Voice → Report Pipeline",
        "tagline": "Your dictation, returned as a finished report.",
        "pitch": "Built for professionals who write reports for a living. Notaries, paralegals, agents, adjusters, doctors, dentists, therapists, court reporters. Record your voice. Get back a polished, formatted report — not a transcript.",
        "price_setup": "Custom",
        "price_mo": "talk to us",
        "demo_caption": "Watch a real estate agent record a property walkthrough and receive a finished listing report in 8 minutes.",
        "features": [
            ("Custom client submission app",
             "Branded mobile app for your business. Your team records, submits, and tracks reports — no email back-and-forth, no lost files.",
             "feature-followup.png"),
            ("Automated 24/7 transcription",
             "Submitted at 11pm? Returned by morning. Our pipeline runs nonstop, so urgent reports never wait on a turnaround team.",
             "feature-pipeline.png"),
            ("Higher-quality output than DIY tools",
             "Off-the-shelf transcribers give you a wall of text. We give you a structured, formatted, profession-specific document — ready to send.",
             "step-build.png"),
            ("Templates for medical, legal, real estate &amp; more",
             "Profession-specific templates: SOAP notes, property reports, claim summaries, patient charts, court transcripts — pre-built and customized.",
             "feature-calendar.png"),
            ("Unlimited submissions, flat rate",
             "No per-minute pricing. No surprise overage. Submit as much as you want for a single monthly fee scoped to your team size.",
             "feature-inbox.png"),
        ],
        "how": [
            ("01", "Workflow mapping", "We come on-site, study your existing report formats, identify what you reuse, and capture your voice patterns."),
            ("02", "Custom template build", "Your profession-specific templates are encoded. Section headers, formatting, terminology — all yours."),
            ("03", "Pipeline live", "Your team starts submitting from the app. Reports return in your format, ready to send."),
            ("04", "Refinement", "Weekly tuning based on edits you make. The pipeline gets sharper every week."),
        ],
        "industries": ["Notaries", "Paralegals", "Real Estate Agents", "Insurance Adjusters", "Doctors & Clinicians", "Dentists", "Therapists & Counselors", "Court Reporters"],
        "faq": [
            ("How is this different from Otter or Rev?",
             "They give you a transcript. We give you a finished report. Templates, formatting, and the deep cuts your profession needs — handled. You get a usable document, not raw text."),
            ("How accurate is the transcription?",
             "98%+ on clean audio. We pair AI transcription with profession-specific terminology models, so technical terms (medications, legal phrases, addresses) are correct."),
            ("What's the turnaround?",
             "Most reports return in 30 minutes. Complex/long submissions in under 4 hours. Available 24/7."),
            ("Why is pricing custom?",
             "Because team size and submission volume vary wildly. We scope it to your actual usage so you're not subsidizing other clients."),
        ],
    },
}

OTHERS = {  # for related-products section, what to show on each subpage
    "content-engine": ["seo-engine", "ai-suite", "voice-report"],
    "seo-engine": ["content-engine", "ai-suite", "voice-report"],
    "ai-suite": ["content-engine", "seo-engine", "voice-report"],
    "voice-report": ["content-engine", "seo-engine", "ai-suite"],
}


def render(slug, data):
    others = OTHERS[slug]
    feature_blocks = "\n".join([
        f'''<div class="pf-block" data-r data-d="{i % 4}">
  <div class="pf-img-wrap"><img src="../img/{img}" alt="{title}" loading="lazy"><div class="pf-img-overlay"></div></div>
  <div class="pf-text"><h3>{title}</h3><p>{desc}</p></div>
</div>'''
        for i, (title, desc, img) in enumerate(data["features"])
    ])

    how_blocks = "\n".join([
        f'<div class="ph-step" data-r data-d="{i}"><div class="ph-num">{n}</div><h4>{title}</h4><p>{desc}</p></div>'
        for i, (n, title, desc) in enumerate(data["how"])
    ])

    industry_chips = "\n".join([f'<span class="ind-chip">{i}</span>' for i in data["industries"]])

    faq_items = "\n".join([
        f'<div class="faq-item" data-r><button class="faq-q">{q}</button><div class="faq-a"><p>{a}</p></div></div>'
        for q, a in data["faq"]
    ])

    related = "\n".join([
        f'''<a href="../{o}/" class="rp-card" data-r data-d="{i}">
  <img src="../img/{PRODUCTS[o]["icon"]}" alt="" class="rp-icon">
  <div class="rp-body"><h4>{PRODUCTS[o]["name"]}</h4><p>{PRODUCTS[o]["tagline"]}</p></div>
  <span class="rp-arrow">→</span>
</a>'''
        for i, o in enumerate(others)
    ])

    return f'''<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{data["name"]} — Easyworks AI</title>
<meta name="description" content="{data["tagline"]} {data["pitch"][:120]}">
<meta name="theme-color" content="#0e0a1a">
<meta property="og:title" content="{data["name"]} — Easyworks AI">
<meta property="og:description" content="{data["tagline"]}">
<meta property="og:image" content="https://easyworks.ai/og-image.png">
<meta property="og:url" content="https://easyworks.ai/{slug}/">
<meta property="og:type" content="website">
<link rel="canonical" href="https://easyworks.ai/{slug}/">
<link rel="icon" type="image/png" href="../favicon.png">
<link rel="apple-touch-icon" href="../icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&amp;family=Inter:wght@400;500;600&amp;family=JetBrains+Mono:wght@500&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="../style.min.css">
</head><body>
<nav class="nav" id="nav"><div class="nav-inner">
<a href="../" class="logo"><img src="../img/icon.png" alt="" class="logo-icon-img"><span class="logo-wordmark logo-tracked">EASYWORKS<span class="logo-ai">·AI</span></span></a>
<div class="nav-links" id="navLinks"><a href="../#products">Products</a><a href="../#onsite">On-site</a><a href="../#how">Process</a><a href="../#start" class="nav-cta">Talk to a human</a></div>
<button class="hamburger" id="hamburger" aria-label="Menu"><span></span><span></span></button>
</div></nav>

<section class="psub-hero">
  <div class="psub-hero-mesh"></div>
  <div class="container">
    <a href="../#products" class="psub-back" data-r>← All products</a>
    <div class="psub-hero-grid" data-r data-d="1">
      <div class="psub-hero-icon"><img src="../img/{data["icon"]}" alt=""></div>
      <div class="psub-hero-copy">
        <h1>{data["name"]}</h1>
        <p class="psub-tagline">{data["tagline"]}</p>
        <p class="psub-pitch">{data["pitch"]}</p>
        <div class="psub-meta">
          <div class="psub-price"><span class="psub-price-num">{data["price_setup"]}</span><span>setup</span></div>
          <div class="psub-divider"></div>
          <div class="psub-price"><span class="psub-price-num">{data["price_mo"]}</span><span>{"/mo" if data["price_mo"].startswith("$") else ""}</span></div>
        </div>
        <div class="psub-cta-row">
          <a href="../#start" class="btn btn-accent btn-lg">Talk to a human <span aria-hidden="true">→</span></a>
          <a href="#video" class="btn btn-glass btn-lg">Watch the demo</a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section" id="video">
  <div class="container">
    <div class="section-header center" data-r><p class="overline">Demo</p><h2>See it run.</h2><p class="section-sub">{data["demo_caption"]}</p></div>
    <div class="psub-video" data-r data-d="1">
      <video class="psub-video-el" preload="none" poster="../img/video-preview.png" controls playsinline>
        <source src="../videos/{slug}-demo.mp4" type="video/mp4">
        Demo video coming soon.
      </video>
      <div class="psub-video-overlay" id="psub-video-overlay">
        <button class="psub-video-play" type="button" aria-label="Play demo">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="31" stroke="white" stroke-width="2" opacity="0.4"/>
            <circle cx="32" cy="32" r="28" fill="white" fill-opacity="0.18"/>
            <path d="M27 22l16 10-16 10V22z" fill="white"/>
          </svg>
        </button>
        <span class="psub-video-coming">Demo video coming soon. Want a live walkthrough? <a href="../#start">Book a call.</a></span>
      </div>
    </div>
  </div>
</section>

<section class="section section-alt" id="features">
  <div class="container">
    <div class="section-header" data-r><p class="overline">What it does</p><h2>Inside the engine.</h2></div>
    <div class="pf-stack">
      {feature_blocks}
    </div>
  </div>
</section>

<section class="section" id="how">
  <div class="container">
    <div class="section-header center" data-r><p class="overline">How it works</p><h2>Four steps. We come to you.</h2></div>
    <div class="ph-grid">
      {how_blocks}
    </div>
  </div>
</section>

<section class="section section-alt" id="industries">
  <div class="container container-mid">
    <div class="section-header center" data-r><p class="overline">Built for</p><h2>Where it shines.</h2></div>
    <div class="ind-grid" data-r data-d="1">
      {industry_chips}
    </div>
  </div>
</section>

<section class="section" id="onsite">
  <div class="container">
    <div class="onsite-band">
      <div class="onsite-photo"><img src="../img/onsite-install.png" alt="In-person install" loading="lazy"><div class="onsite-photo-overlay"></div></div>
      <div class="onsite-copy">
        <p class="overline">The difference</p>
        <h2>Other AI companies email you a login.<br><span class="h2-dim">We show up.</span></h2>
        <p class="onsite-body">We install <strong>{data["name"]}</strong> on-site, sit with you while you learn it, and stay on-call after.</p>
        <a href="../#start" class="btn btn-accent btn-lg">Book your on-site walkthrough <span aria-hidden="true">→</span></a>
      </div>
    </div>
  </div>
</section>

<section class="section section-alt" id="faq">
  <div class="container container-mid">
    <p class="overline" data-r>FAQ</p>
    <h2 data-r data-d="1">{data["name"]} — common questions.</h2>
    <div class="faq-list">
      {faq_items}
    </div>
  </div>
</section>

<section class="section" id="related">
  <div class="container">
    <div class="section-header center" data-r><p class="overline">Stack with</p><h2>Other engines that pair well.</h2></div>
    <div class="rp-grid">
      {related}
    </div>
  </div>
</section>

<section class="section section-cta" id="start">
  <div class="container container-mid">
    <div class="cta-header" data-r>
      <div class="cta-brand"><img src="../img/icon.png" alt="" class="hero-icon-img" style="width:56px;height:56px"><span class="brand-name brand-tracked" style="font-size:1.4rem">EASYWORKS<span class="brand-ai">·AI</span></span></div>
      <h2>Ready to roll {data["name"]}?</h2>
      <p>Tell us what you need. We'll <strong>come see you</strong> — real humans, real install, on-site training.</p>
    </div>
    <div style="text-align:center; margin-top: 24px;">
      <a href="../#start" class="btn btn-accent btn-lg">Book a call <span aria-hidden="true">→</span></a>
    </div>
  </div>
</section>

<footer class="footer"><div class="container"><div class="footer-grid">
<div class="footer-brand"><a href="../" class="logo"><img src="../img/icon.png" alt="" class="logo-icon-img"><span class="logo-wordmark logo-tracked">EASYWORKS<span class="logo-ai">·AI</span></span></a><p>Less doing.<br>More done.</p>
<div class="footer-contact"><a href="mailto:team@easyworksai.com">team@easyworksai.com</a><a href="tel:+16729668975">+1 (672) 966-8975</a><span>Surrey, BC</span></div>
</div>
<div class="footer-col"><h4>Products</h4><a href="../content-engine/">Content Engine</a><a href="../seo-engine/">SEO Engine</a><a href="../ai-suite/">AI Suite</a><a href="../voice-report/">Voice → Report</a><a href="../#onsite">On-site install</a></div>
<div class="footer-col"><h4>Company</h4><a href="../#faq">FAQ</a><a href="../#start">Contact</a><a href="mailto:team@easyworksai.com">team@easyworksai.com</a></div>
</div><div class="footer-bar"><span>&copy; 2026 Easyworks AI Solutions</span><span class="footer-links"><a href="../">Home</a></span></div></div></footer>

<script src="../script.min.js" defer></script>
</body></html>
'''


for slug, data in PRODUCTS.items():
    page_dir = ROOT / slug
    page_dir.mkdir(exist_ok=True)
    (page_dir / "index.html").write_text(render(slug, data))
    print(f"Built {slug}/index.html")

print("Done.")
