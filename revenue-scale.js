// AI Revenue Scale — page-specific: animated counters + budget calculator
(function() {
  'use strict';

  /* ─── Animated counters ─── */
  (function counters() {
    const stats = document.querySelectorAll('.impact-num[data-count]');
    if (!stats.length || !window.IntersectionObserver) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const animate = (el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      const dur = 1400;
      const start = performance.now();
      if (reducedMotion) { el.textContent = target.toFixed(decimals) + suffix; return; }
      function tick(t) {
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    stats.forEach(s => io.observe(s));
  })();

  /* ─── Budget calculator ─── */
  (function calculator() {
    const slider = document.getElementById('calc-slider');
    if (!slider) return;
    const spendDisp  = document.getElementById('calc-spend');
    const ctName     = document.getElementById('ct-name');
    const ctFee      = document.getElementById('ct-fee');
    const cpSpend    = document.getElementById('cp-spend');
    const cpFee      = document.getElementById('cp-fee');
    const cpTotal    = document.getElementById('cp-total');
    const cpRevenue  = document.getElementById('cp-revenue');
    const cpNet      = document.getElementById('cp-net');
    const tierWrap   = document.getElementById('calc-tier');

    const fmt = n => '$' + Math.round(n).toLocaleString();
    const ROAS = 2.4;

    function tierFor(spend) {
      if (spend <= 2000) return { name: 'Starter', fee: 497, klass: 'tier-starter' };
      if (spend <= 5000) return { name: 'Growth',  fee: 997, klass: 'tier-growth' };
      if (spend <= 10000) return { name: 'Scale',  fee: 1497, klass: 'tier-scale' };
      return { name: 'Enterprise', fee: 1997, klass: 'tier-ent' };
    }

    function recalc() {
      const spend = +slider.value;
      const tier = tierFor(spend);
      const revenue = spend * ROAS;
      const total = spend + tier.fee;
      const net = revenue - total;

      spendDisp.textContent = spend.toLocaleString();
      ctName.textContent = tier.name;
      ctFee.textContent  = '$' + tier.fee.toLocaleString() + '/mo';
      cpSpend.textContent = fmt(spend);
      cpFee.textContent   = fmt(tier.fee);
      cpTotal.textContent = fmt(total);
      cpRevenue.textContent = fmt(revenue);
      cpNet.textContent = (net >= 0 ? '+' : '') + fmt(net);
      cpNet.style.color = net >= 0 ? 'var(--electric-cyan)' : 'var(--electric-magenta)';

      tierWrap.className = 'calc-tier ' + tier.klass;

      // slider color fill
      const pct = ((spend - +slider.min) / (+slider.max - +slider.min)) * 100;
      slider.style.background = `linear-gradient(90deg, #22d3ee 0%, #a855f7 ${pct/2}%, #ff2bd1 ${pct}%, rgba(168,85,247,0.18) ${pct}%, rgba(168,85,247,0.18) 100%)`;
    }

    slider.addEventListener('input', recalc, { passive: true });
    recalc();
  })();

})();
