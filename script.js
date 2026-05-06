// ═══════════════════════════════════════
// EASYWORKS AI — v5
// ═══════════════════════════════════════

// Nav
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
const nav = document.getElementById('nav');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('active');
  hamburger.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    navLinks.classList.remove('active');
    hamburger.classList.remove('open');
  });
});

// Scroll progress bar
const progressBar = document.createElement('div');
progressBar.className = 'scroll-progress';
document.body.appendChild(progressBar);

// Hero photo + mesh parallax (data-only, runs every frame the user scrolls)
const heroPhoto = document.querySelector('.hero-photo');
const heroMesh = document.querySelector('.hero-mesh');

let scrollTicking = false;
function onScroll() {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 40);

    const docH = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = Math.min(100, (y / docH) * 100) + '%';

    if (heroPhoto) {
      const heroH = window.innerHeight;
      if (y < heroH) {
        const p = y / heroH;
        heroPhoto.style.transform = `scale(${1 + p * 0.1}) translateY(${y * 0.32}px)`;
        if (heroMesh) heroMesh.style.transform = `translateY(${y * 0.18}px)`;
      }
    }
    scrollTicking = false;
  });
}
window.addEventListener('scroll', onScroll, { passive: true });

// Scroll reveal — premium with stagger by index inside section
const ro = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('vis'); ro.unobserve(e.target); }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('[data-r]').forEach(el => ro.observe(el));

// ═════ STACK BUILDER ═════
(function stackBuilder(){
  const stack = document.getElementById('stack');
  if (!stack) return;
  const engines = stack.querySelectorAll('.sb-engine');
  const stdSetup = document.getElementById('sb-std-setup');
  const stdMo    = document.getElementById('sb-std-mo');
  const discount = document.getElementById('sb-discount');
  const totSetup = document.getElementById('sb-total-setup');
  const totMo    = document.getElementById('sb-total-mo');
  const customNote = document.getElementById('sb-custom-note');
  const tierSteps = stack.querySelectorAll('.sb-tier-step');

  const fmt = n => '$' + Math.round(n).toLocaleString();

  function recalc(){
    let setup = 0, mo = 0, count = 0, custom = false;
    engines.forEach(eng => {
      const cb = eng.querySelector('input');
      if (!cb.checked) return;
      count++;
      if (eng.dataset.custom) { custom = true; return; }
      setup += +eng.dataset.setup;
      mo    += +eng.dataset.mo;
    });
    // Tier discount: 1=0, 2=10%, 3=15%, 4=20%
    const tiers = { 1: 0, 2: 0.10, 3: 0.15, 4: 0.20 };
    const pct = tiers[count] || 0;
    const dSetup = setup * (1 - pct);
    const dMo    = mo    * (1 - pct);

    stdSetup.textContent = fmt(setup);
    stdMo.textContent    = fmt(mo);
    discount.textContent = pct ? `— ${(pct*100).toFixed(0)}% off` : '— pick 2+ to save';
    totSetup.textContent = fmt(dSetup);
    totMo.textContent    = fmt(dMo);
    customNote.hidden = !custom;

    tierSteps.forEach(step => {
      const min = +step.dataset.min;
      step.classList.toggle('active', count === min);
      step.classList.toggle('passed', count > min);
    });
  }

  engines.forEach(eng => eng.addEventListener('change', recalc));
  recalc();
})();

// Magnetic CTA — subtle pull toward cursor
document.querySelectorAll('.btn-accent.btn-lg, .bb-pricing .btn').forEach(btn => {
  btn.addEventListener('mousemove', e => {
    const r = btn.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    btn.style.transform = `translate(${x * 0.12}px, ${y * 0.18}px)`;
  });
  btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
});


// FAQ
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const open = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!open) item.classList.add('open');
  });
});

// Counter animation
const co = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting || e.target.dataset.done) return;
    e.target.dataset.done = '1';
    const t = +e.target.dataset.counter;
    const start = performance.now();
    const dur = 1800;
    (function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      e.target.textContent = Math.round(t * eased);
      if (p < 1) requestAnimationFrame(tick);
    })(start);
    co.unobserve(e.target);
  });
}, { threshold: 0.4 });

document.querySelectorAll('[data-counter]').forEach(el => co.observe(el));

// Stat ring animation
const ringObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.setProperty('--pct', e.target.style.getPropertyValue('--pct'));
      ringObs.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.stat-ring').forEach(el => ringObs.observe(el));

// Form
document.getElementById('contactForm').addEventListener('submit', e => {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('.btn-submit');
  btn.classList.add('loading');
  btn.disabled = true;

  fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(new FormData(form)).toString()
  })
  .then(res => {
    btn.classList.remove('loading');
    const label = btn.querySelector('.btn-label');
    if (res.ok) {
      label.textContent = "Sent — we'll be in touch";
      btn.style.background = 'var(--green)';
      btn.style.boxShadow = '0 2px 20px rgba(16,185,129,0.3)';
      form.reset();
    } else {
      label.textContent = 'Error — try again';
      btn.style.background = '#ef4444';
      btn.style.boxShadow = '0 2px 20px rgba(239,68,68,0.3)';
    }
    setTimeout(() => {
      label.textContent = 'Send it';
      btn.style.background = '';
      btn.style.boxShadow = '';
      btn.disabled = false;
    }, 4000);
  })
  .catch(() => {
    btn.classList.remove('loading');
    const label = btn.querySelector('.btn-label');
    label.textContent = 'Error — try again';
    btn.style.background = '#ef4444';
    setTimeout(() => {
      label.textContent = 'Send it';
      btn.style.background = '';
      btn.disabled = false;
    }, 4000);
  });
});

// Smooth anchor offset
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
