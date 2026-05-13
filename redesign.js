// ════════════════════════════════════════════════════════════════════
// EASYWORKS AI — REDESIGN V2 · Cosmic motion + 5-engine stack builder
// ════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  /* ─────── Cosmic canvas starfield ─────── */
  (function starfield() {
    const canvas = document.getElementById('cosmic-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stars = [];
    let DPR = Math.min(window.devicePixelRatio || 1, 2);
    let w, h;
    const STAR_COUNT = reducedMotion ? 60 : 180;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.scale(DPR, DPR);
      seed();
    }
    function seed() {
      stars = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        const layer = Math.random() < 0.7 ? 0 : (Math.random() < 0.7 ? 1 : 2);
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z: 0.4 + Math.random() * 0.6,
          r: 0.4 + Math.random() * (layer === 0 ? 0.9 : layer === 1 ? 1.6 : 2.4),
          s: (0.04 + Math.random() * 0.18) * (layer + 1),
          hue: layer === 0 ? null : (Math.random() < 0.5 ? 290 : 320),
          twinkle: Math.random() * Math.PI * 2,
          tspeed: 0.01 + Math.random() * 0.03
        });
      }
    }

    // Pause render when hero offscreen or tab hidden (saves CPU)
    let visible = true;
    const heroEl = document.querySelector('.hero-v2');
    if (heroEl && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
      }, { threshold: 0 });
      io.observe(heroEl);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) visible = false;
    });

    let lastTime = 0;
    function frame(t) {
      if (!visible) {
        if (!reducedMotion) requestAnimationFrame(frame);
        return;
      }
      const dt = Math.min(50, t - lastTime);
      lastTime = t;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.x -= s.s * dt * 0.06;
        if (s.x < -4) s.x = w + 4;
        s.twinkle += s.tspeed;
        const alpha = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.twinkle))) * s.z;
        ctx.beginPath();
        ctx.fillStyle = s.hue
          ? `hsla(${s.hue}, 90%, 72%, ${alpha})`
          : `rgba(255,255,255,${alpha})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reducedMotion) requestAnimationFrame(frame);
    }

    window.addEventListener('resize', () => { DPR = Math.min(window.devicePixelRatio || 1, 2); resize(); });
    resize();
    requestAnimationFrame(frame);
  })();

  /* ─────── Mouse parallax on hero mascot ─────── */
  (function heroParallax() {
    const mascotWrap = document.querySelector('.hero-mascot');
    if (!mascotWrap) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;
    const img = mascotWrap.querySelector('.mascot-img');
    const glow = mascotWrap.querySelector('.mascot-glow');

    document.addEventListener('mousemove', (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      if (img)  img.style.transform = `translate3d(${dx * 14}px, ${dy * 10}px, 0)`;
      if (glow) glow.style.transform = `translate3d(${dx * 24}px, ${dy * 18}px, 0)`;
    }, { passive: true });
  })();

  /* ─────── 5-engine stack builder (overrides legacy) ─────── */
  (function stackBuilderV2() {
    const stack = document.getElementById('stack');
    if (!stack) return;

    const engines = stack.querySelectorAll('.sb-engine');
    const stdSetup = document.getElementById('sb-std-setup');
    const stdMo    = document.getElementById('sb-std-mo');
    const discountEl = document.getElementById('sb-discount');
    const totSetup = document.getElementById('sb-total-setup');
    const totMo    = document.getElementById('sb-total-mo');
    const tierSteps = stack.querySelectorAll('.sb-tier-step');
    const bundles = stack.querySelectorAll('.sb-bundle');

    const TIERS = { 1: 0, 2: 0.10, 3: 0.15, 4: 0.18, 5: 0.20 };
    const fmt = n => '$' + Math.round(n).toLocaleString();

    function recalc() {
      let setup = 0, mo = 0, count = 0;
      const selectedSlugs = [];
      engines.forEach(eng => {
        const cb = eng.querySelector('input');
        if (!cb.checked) return;
        count++;
        selectedSlugs.push(cb.dataset.engine);
        setup += +eng.dataset.setup;
        mo    += +eng.dataset.mo;
      });
      const pct = TIERS[count] || 0;
      const dSetup = setup * (1 - pct);
      const dMo    = mo    * (1 - pct);

      if (stdSetup) stdSetup.textContent = fmt(setup);
      if (stdMo)    stdMo.textContent    = fmt(mo);
      if (discountEl) discountEl.textContent = pct
        ? `— ${(pct * 100).toFixed(0)}% off`
        : '— pick 2+ to save';
      if (totSetup) totSetup.textContent = fmt(dSetup);
      if (totMo)    totMo.textContent    = fmt(dMo);

      tierSteps.forEach(step => {
        const min = +step.dataset.min;
        step.classList.toggle('active', count === min);
        step.classList.toggle('passed', count > min);
      });

      // Update bundle highlight if selection matches a known bundle
      const sortedSel = [...selectedSlugs].sort().join(',');
      const BUNDLE_MAP = {
        'starter':       ['ai'],
        'local-growth':  ['ai','seo'],
        'brand-builder': ['ai','content'],
        'full-stack':    ['ai','content','revenue-scale','seo'],
      };
      bundles.forEach(b => {
        const want = (BUNDLE_MAP[b.dataset.bundle] || []).sort().join(',');
        b.classList.toggle('active', want === sortedSel);
      });
    }

    // Wire engine checkboxes (additive — legacy script.js also fires, but we run last)
    engines.forEach(eng => {
      const cb = eng.querySelector('input');
      cb.addEventListener('change', () => requestAnimationFrame(recalc));
      eng.addEventListener('click', () => requestAnimationFrame(recalc));
    });

    // Wire bundle quick-picks
    const BUNDLES = {
      'starter':       new Set(['ai']),
      'local-growth':  new Set(['ai','seo']),
      'brand-builder': new Set(['ai','content']),
      'full-stack':    new Set(['ai','content','seo','revenue-scale']),
    };
    bundles.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const key = btn.dataset.bundle;
        const want = BUNDLES[key];
        if (!want) return;
        engines.forEach(eng => {
          const cb = eng.querySelector('input');
          cb.checked = want.has(cb.dataset.engine);
        });
        recalc();
        // smooth scroll to totals
        const totals = stack.querySelector('.sb-totals');
        if (totals) totals.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });

    // Override the legacy CTA click — checkout still hits the same Netlify function
    // but ensure 'revenue-scale' is sent through if selected
    const cta = stack.querySelector('.sb-cta');
    if (cta) {
      cta.addEventListener('click', async (e) => {
        if (cta.dataset.busy === '1') return;
        e.preventDefault();
        e.stopImmediatePropagation();
        const selected = [];
        engines.forEach(eng => {
          const cb = eng.querySelector('input');
          if (cb.checked) selected.push(cb.dataset.engine);
        });
        if (!selected.length) return;
        const orig = cta.innerHTML;
        cta.dataset.busy = '1';
        cta.innerHTML = 'Loading checkout…';
        cta.style.pointerEvents = 'none';
        try {
          const r = await fetch('/.netlify/functions/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ engines: selected }),
          });
          const data = await r.json();
          if (data.url)       window.location.href = data.url;
          else if (data.redirect) window.location.href = data.redirect;
          else throw new Error(data.error || 'Checkout error');
        } catch (err) {
          alert('Checkout error. Please contact team@easyworksai.com.');
          cta.innerHTML = orig;
          cta.style.pointerEvents = '';
          cta.dataset.busy = '';
        }
      }, true); // capture phase so we beat legacy
    }

    recalc();
  })();

  /* ─────── Scroll reveal (additive, plays well with existing) ─────── */
  (function reveal() {
    const items = document.querySelectorAll('[data-r]');
    if (!items.length || !window.IntersectionObserver) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('vis');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    items.forEach(i => io.observe(i));
  })();

  /* ─────── Engine card tilt on mouseover ─────── */
  (function cardTilt() {
    const cards = document.querySelectorAll('.engine-card');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `translateY(-6px) scale(1.015) perspective(800px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  })();

})();

/* ─────── Cosmic page-transition loader ─────── */
(function pageLoader() {
  const loader = document.getElementById('page-loader');
  if (!loader) return;

  // On initial page load: briefly show then fade out for entrance polish
  // (only if URL has #__loaded or referrer was same-origin)
  if (document.referrer && new URL(document.referrer).host === location.host) {
    loader.classList.add('active');
    requestAnimationFrame(() => {
      setTimeout(() => loader.classList.remove('active'), 350);
    });
  }

  // Trigger loader on internal navigation
  function isInternalNav(a) {
    if (!a || !a.href) return false;
    try {
      const url = new URL(a.href);
      if (url.host !== location.host) return false;             // external
      if (a.target && a.target !== '_self') return false;       // new tab
      if (a.hasAttribute('download')) return false;
      // Anchor on same page — don't trigger
      if (url.pathname === location.pathname && url.hash) return false;
      // Same exact URL — don't trigger
      if (url.pathname === location.pathname && !url.hash) return false;
      // mailto / tel
      if (a.protocol === 'mailto:' || a.protocol === 'tel:') return false;
      return true;
    } catch { return false; }
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a || !isInternalNav(a)) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // modifier — let browser handle
    e.preventDefault();
    loader.classList.add('active');
    setTimeout(() => { window.location.href = a.href; }, 380);
  });

  // Handle bfcache restoration (Safari back button)
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) loader.classList.remove('active');
  });
})();

/* ─────── Sticky scroll-CTA: appears after hero, hides at form ─────── */
(function stickyCTA() {
  const cta = document.getElementById('sticky-cta');
  if (!cta) return;
  const hero = document.querySelector('.hero-v2');
  const form = document.getElementById('start');
  if (!hero) return;

  let ticking = false;
  function update() {
    const heroBottom = hero.offsetTop + hero.offsetHeight;
    const formTop = form ? form.offsetTop : Infinity;
    const y = window.scrollY + window.innerHeight * 0.5;
    const past = y > heroBottom;
    const nearForm = y > formTop - 100;
    cta.classList.toggle('visible', past && !nearForm);
    ticking = false;
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  update();
})();

/* ─────── Conveyor card click → scroll to form + prefill industry ─────── */
(function conveyorPrefill() {
  const cards = document.querySelectorAll('.conv-card');
  if (!cards.length) return;
  const form = document.getElementById('contactForm');
  const messageField = form ? form.querySelector('textarea[name="message"]') : null;
  const industrySelect = form ? form.querySelector('select[name="industry"]') : null;

  // Map specific industries to form select options
  const INDUSTRY_MAP = {
    'Dental Offices':     'Medical / Dental',
    'Physio / Chiro':     'Medical / Dental',
    'MedSpa':             'Medical / Dental',
    'Vet Clinic':         'Medical / Dental',
    'Nail Salons':        'Salon / Spa',
    'Salon / Barber':     'Salon / Spa',
    'Pool & Spa':         'Salon / Spa',
    'Restaurant':         'Restaurant / Food',
    'Real Estate':        'Real Estate',
    'Property Mgmt':      'Real Estate',
    'Law Firm':           'Legal',
    'Notaries':           'Legal',
    'General Contractor': 'Contractor / Trades',
    'HVAC':               'Contractor / Trades',
    'Plumbing':           'Contractor / Trades',
    'Electrical':         'Contractor / Trades',
    'Roofing':            'Contractor / Trades',
    'Painting':           'Contractor / Trades',
    'Landscaping':        'Contractor / Trades',
    'Cleaning':           'Cleaning / Maintenance',
    'Towing':             'Auto Services',
    'Mechanic Shop':      'Auto Services',
    'Auto Detailing':     'Auto Services',
    'Dealership':         'Auto Services',
    'Gym / Fitness':      'Fitness / Wellness',
  };

  cards.forEach(card => {
    // Skip duplicate cards (aria-hidden) to avoid double events; still let them respond visually
    const label = card.querySelector('.cv-label');
    if (!label) return;
    const industry = label.textContent.trim();
    card.style.cursor = 'pointer';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Tell us about your ${industry} business`);

    function go() {
      // Prefill message field
      if (messageField) {
        if (!messageField.value || messageField.value.indexOf('I run a') !== 0) {
          messageField.value = `I run a ${industry} business and I'd like to learn how Easyworks can help.`;
        }
      }
      // Set the industry dropdown
      const mapped = INDUSTRY_MAP[industry] || 'Other';
      if (industrySelect) {
        for (const opt of industrySelect.options) {
          if (opt.value === mapped || opt.textContent.trim() === mapped) {
            industrySelect.value = opt.value;
            industrySelect.dispatchEvent(new Event('change'));
            break;
          }
        }
      }
      // Scroll to form
      const target = document.getElementById('start');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // After scroll, focus the name field so user can type immediately
        setTimeout(() => {
          const nameField = form && form.querySelector('input[name="name"]');
          if (nameField) nameField.focus();
        }, 700);
      }
    }
    card.addEventListener('click', go);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
  });
})();

/* ─────── Save my stack: persist user selection to localStorage ─────── */
(function stackPersist() {
  const KEY = 'easyworks_stack_v1';
  const stack = document.getElementById('stack');
  if (!stack || !window.localStorage) return;
  const engines = stack.querySelectorAll('.sb-engine input');
  if (!engines.length) return;

  // Restore previous selection on load
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && Array.isArray(saved) && saved.length) {
      engines.forEach(cb => { cb.checked = saved.includes(cb.dataset.engine); });
      // Fire a change to recalc totals (stackBuilderV2 listens for change)
      engines[0].dispatchEvent(new Event('change'));
      // Small visual hint
      const hint = document.createElement('div');
      hint.className = 'sb-restore-hint';
      hint.innerHTML = '↻ Stack restored from your last visit';
      stack.prepend(hint);
      setTimeout(() => hint.classList.add('fade'), 4500);
      setTimeout(() => hint.remove(), 5400);
    }
  } catch { /* corrupted localStorage entry — ignore */ }

  // Save on any change
  function snap() {
    const picked = [];
    engines.forEach(cb => { if (cb.checked) picked.push(cb.dataset.engine); });
    try { localStorage.setItem(KEY, JSON.stringify(picked)); } catch {}
  }
  engines.forEach(cb => cb.addEventListener('change', snap));
  // Bundle quick-picks fire programmatic changes — also save on click
  stack.querySelectorAll('.sb-bundle').forEach(b => b.addEventListener('click', () => setTimeout(snap, 50)));
})();

/* ─────── Pause heavy animations when offscreen ─────── */
(function pauseOffscreen() {
  if (!('IntersectionObserver' in window)) return;
  // Conveyor — pause the marquee scroll when offscreen
  const conveyor = document.querySelector('.conveyor-stage');
  if (conveyor) {
    const tracks = conveyor.querySelectorAll('.conv-track');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        tracks.forEach(t => t.style.animationPlayState = e.isIntersecting ? 'running' : 'paused');
      });
    }, { threshold: 0 });
    io.observe(conveyor);
  }

  // Engine flow pulses
  const flow = document.querySelector('.engine-flow-v2');
  if (flow) {
    const pulses = flow.querySelectorAll('.ef-pulse');
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        pulses.forEach(p => p.style.animationPlayState = e.isIntersecting ? 'running' : 'paused');
      });
    }, { threshold: 0 });
    io2.observe(flow);
  }
})();
