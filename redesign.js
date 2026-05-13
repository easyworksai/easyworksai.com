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

    let lastTime = 0;
    function frame(t) {
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
