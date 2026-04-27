// ═══════════════════════════════════════
// EASYWORKS AI — WEBSITE SCRIPTS
// ═══════════════════════════════════════

// Mobile nav toggle
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('active');
  hamburger.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
    hamburger.classList.remove('open');
  });
});

// FAQ accordion
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

// Scroll fade-in
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll(
  '.problem-card, .step, .feature-card, .price-card, .addons-panel, .result-card, .who-card, .faq-item'
).forEach(el => {
  el.classList.add('fade-in');
  observer.observe(el);
});

// Nav background on scroll
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.style.background = window.scrollY > 50
    ? 'rgba(5,10,18,0.95)'
    : 'rgba(5,10,18,0.85)';
});

// Contact form
document.getElementById('contactForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.textContent;

  btn.textContent = 'Sending...';
  btn.disabled = true;

  // Simulate submission — replace with actual endpoint when ready
  setTimeout(() => {
    btn.textContent = 'Request Sent!';
    btn.style.background = 'var(--accent)';
    form.reset();
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.disabled = false;
    }, 3000);
  }, 1000);
});
