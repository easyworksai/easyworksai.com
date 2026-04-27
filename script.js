// ═══════════════════════════════════════
// EASYWORKS AI — v3
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

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', scrollY > 40);
}, { passive: true });

// Scroll reveal
const ro = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('vis'); ro.unobserve(e.target); }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });

document.querySelectorAll('[data-r]').forEach(el => ro.observe(el));

// FAQ
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const open = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!open) item.classList.add('open');
  });
});

// Counter
const co = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting || e.target.dataset.done) return;
    e.target.dataset.done = '1';
    const t = +e.target.dataset.counter;
    const start = performance.now();
    const dur = 1600;
    (function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      e.target.textContent = Math.round(t * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(tick);
    })(start);
    co.unobserve(e.target);
  });
}, { threshold: 0.4 });

document.querySelectorAll('[data-counter]').forEach(el => co.observe(el));

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
      label.textContent = 'Sent — we\'ll be in touch';
      btn.style.background = 'var(--green)';
      form.reset();
    } else {
      label.textContent = 'Error — try again';
      btn.style.background = '#ef4444';
    }
    setTimeout(() => { label.textContent = 'Send it'; btn.style.background = ''; btn.disabled = false; }, 3500);
  })
  .catch(() => {
    btn.classList.remove('loading');
    btn.querySelector('.btn-label').textContent = 'Error — try again';
    btn.style.background = '#ef4444';
    setTimeout(() => { btn.querySelector('.btn-label').textContent = 'Send it'; btn.style.background = ''; btn.disabled = false; }, 3500);
  });
});
