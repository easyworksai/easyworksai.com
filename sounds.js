// ════════════════════════════════════════════════════════════════════
// EASYWORKS AI — Cosmic Foley (Pass 1)
// Web Audio API: ambient cosmic pad + 6 generative earcons
//
// 3-state cycle: ambient → full → muted → ambient
// Persisted to localStorage as easyworks_sound_mode
// First sound plays on first user interaction (browser autoplay policy)
// ════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const KEY = 'easyworks_sound_mode';
  const MODES = ['ambient', 'full', 'muted'];
  const DEFAULT_MODE = 'ambient';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Respect reduced motion as a proxy for reduced sound preference
  let mode = reducedMotion ? 'muted' : (localStorage.getItem(KEY) || DEFAULT_MODE);
  if (!MODES.includes(mode)) mode = DEFAULT_MODE;

  let ctx = null;
  let masterGain = null;
  let ambientGain = null;
  let ambientNodes = null;
  let ducker = null;
  let initialized = false;
  let lastEarcon = {};  // throttle map

  // Master volume ceilings (linear gain)
  const VOL = {
    master: 0.55,
    ambient: 0.45,   // plucks-only — need higher bus gain so individual events come through
    hover: 0.08,
    select: 0.16,
    slider: 0.06,
    counter: 0.05,
    submit: 0.22,
    warp: 0.18,
    mascot: 0.12,
  };

  // Init Audio Context on first user interaction (autoplay policy)
  function ensureCtx() {
    if (initialized) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { return null; }
    if (!ctx) return null;
    masterGain = ctx.createGain();
    masterGain.gain.value = VOL.master;
    masterGain.connect(ctx.destination);

    ambientGain = ctx.createGain();
    ambientGain.gain.value = 0; // fade in
    ambientGain.connect(masterGain);

    // Ducker for ambient when earcons play
    ducker = { current: VOL.ambient, target: VOL.ambient };

    initialized = true;
    return ctx;
  }

  // ─── Ambient v5: minimal sci-fi meditation bed + sparse plucks ───
  // A continuous, low, slowly-breathing pad (root + fifth + octave) with a
  // faint high airy shimmer, sitting UNDER occasional pentatonic plucks.
  // Deliberately minimal: no rhythm, very low level, gentle filter drift.
  function startAmbient() {
    if (!ctx || ambientNodes) return;

    const now = ctx.currentTime;
    ambientGain.gain.cancelScheduledValues(now);
    ambientGain.gain.setValueAtTime(0.0001, now);
    ambientGain.gain.linearRampToValueAtTime(VOL.ambient, now + 6); // slow 6s fade-in

    // Shared gentle lowpass for the whole pad
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 520;
    padFilter.Q.value = 0.6;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.16;             // pad sits well under plucks
    padFilter.connect(padGain).connect(ambientGain);

    // Slow filter "breathing" — ~40s cycle, meditative
    const fLfo = ctx.createOscillator();
    fLfo.type = 'sine';
    fLfo.frequency.value = 0.025;
    const fLfoAmt = ctx.createGain();
    fLfoAmt.gain.value = 240;              // 520 ±240 Hz
    fLfo.connect(fLfoAmt).connect(padFilter.frequency);
    fLfo.start();

    // Low drone: root A1, fifth E2, octave A2 — slightly detuned for warmth
    const drone = [55.0, 82.41, 110.0].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'triangle' : 'sine';
      o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.004);
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : (i === 1 ? 0.36 : 0.26);
      o.connect(g).connect(padFilter);
      o.start();
      return o;
    });

    // Faint high "sci-fi" shimmer (E5) with slow amplitude swell
    const shimmer = ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = 659.25;
    const shGain = ctx.createGain();
    shGain.gain.value = 0.0001;
    shimmer.connect(shGain).connect(ambientGain);
    const sLfo = ctx.createOscillator();
    sLfo.type = 'sine';
    sLfo.frequency.value = 0.06;           // ~16s swell
    const sLfoAmt = ctx.createGain();
    sLfoAmt.gain.value = 0.018;            // very faint
    const sLfoOffset = ctx.createConstantSource();
    sLfoOffset.offset.value = 0.02;
    sLfo.connect(sLfoAmt).connect(shGain.gain);
    sLfoOffset.connect(shGain.gain);
    shimmer.start(); sLfo.start(); sLfoOffset.start();

    // Sparse pentatonic plucks on top of the bed
    const pluckNotes = [
      523.25, 587.33, 659.25, 783.99, 880.00,        // C5 D5 E5 G5 A5
      1046.50, 1174.66, 1318.51, 1567.98, 1760.00,   // C6 D6 E6 G6 A6
    ];
    let pluckTimer = null;
    function schedulePluck() {
      const wait = 14000 + Math.random() * 18000;    // 14–32s
      pluckTimer = setTimeout(() => {
        if (!ambientNodes) return;
        playPluck(pluckNotes[Math.floor(Math.random() * pluckNotes.length)]);
        schedulePluck();
      }, wait);
    }
    pluckTimer = setTimeout(() => {
      if (ambientNodes) {
        playPluck(pluckNotes[Math.floor(Math.random() * 5)]);
        schedulePluck();
      }
    }, 4000 + Math.random() * 3000);

    ambientNodes = {
      pluckTimer,
      oscs: [...drone, shimmer, fLfo, sLfo, sLfoOffset],
    };
  }

  // Soft pluck — audible but gentle. Bumped from -35dBFS to ~ -18dBFS so it
  // actually comes through on speakers without forcing user to crank volume.
  function playPluck(freq) {
    if (!ctx || !ambientGain) return;
    const now = ctx.currentTime;

    // Fundamental
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.28, now + 0.02);     // quick attack — audible
    g.gain.exponentialRampToValueAtTime(0.0001, now + 3.5); // long decay
    o.connect(g).connect(ambientGain);
    o.start();
    o.stop(now + 3.6);

    // 2× harmonic shimmer (bell character)
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq * 2;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(0.08, now + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    o2.connect(g2).connect(ambientGain);
    o2.start();
    o2.stop(now + 1.9);
  }

  function stopAmbient(fadeMs = 600) {
    if (!ctx || !ambientNodes) return;
    const now = ctx.currentTime;
    ambientGain.gain.cancelScheduledValues(now);
    ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
    ambientGain.gain.linearRampToValueAtTime(0, now + fadeMs / 1000);
    const nodes = ambientNodes;
    ambientNodes = null;
    if (nodes.pluckTimer) clearTimeout(nodes.pluckTimer);
    // Stop the continuous pad/LFO nodes shortly after the fade completes
    if (nodes.oscs) {
      setTimeout(() => {
        nodes.oscs.forEach((o) => { try { o.stop(); } catch (e) {} });
      }, fadeMs + 80);
    }
  }

  // ─── Earcons: short generative pitched events ───

  function envelope(g, attack, decay, peak = 1) {
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peak, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
  }

  function duckAmbient(amount = 0.6, releaseMs = 400) {
    if (!ambientGain) return;
    const now = ctx.currentTime;
    const cur = ambientGain.gain.value;
    ambientGain.gain.cancelScheduledValues(now);
    ambientGain.gain.setValueAtTime(cur, now);
    ambientGain.gain.linearRampToValueAtTime(cur * (1 - amount), now + 0.04);
    ambientGain.gain.linearRampToValueAtTime(VOL.ambient, now + releaseMs / 1000);
  }

  function playHover() {
    if (!throttled('hover', 60)) return;
    if (mode !== 'full' || !ensureCtx()) return;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(1180, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.06);
    const g = ctx.createGain();
    envelope(g, 0.005, 0.08, VOL.hover);
    o.connect(g).connect(masterGain);
    o.start();
    o.stop(ctx.currentTime + 0.1);
  }

  function playSelect() {
    if (!throttled('select', 80)) return;
    if (mode !== 'full' || !ensureCtx()) return;
    duckAmbient(0.4, 220);
    // Two-osc "lock" with downward portamento
    const make = (freqStart, freqEnd, peak) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(freqStart, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + 0.12);
      const g = ctx.createGain();
      envelope(g, 0.003, 0.18, peak);
      o.connect(g).connect(masterGain);
      o.start();
      o.stop(ctx.currentTime + 0.2);
    };
    make(900, 540, VOL.select * 0.9);
    make(1800, 1080, VOL.select * 0.4);
  }

  function playSlider(value, min = 0, max = 1) {
    if (!throttled('slider', 40)) return;
    if (mode !== 'full' || !ensureCtx()) return;
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const freq = 600 + ratio * 900;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = ctx.createGain();
    envelope(g, 0.002, 0.04, VOL.slider);
    o.connect(g).connect(masterGain);
    o.start();
    o.stop(ctx.currentTime + 0.06);
  }

  function playCounter() {
    if (!throttled('counter', 30)) return;
    if (mode !== 'full' || !ensureCtx()) return;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 1800 + Math.random() * 200;
    const g = ctx.createGain();
    envelope(g, 0.001, 0.03, VOL.counter);
    o.connect(g).connect(masterGain);
    o.start();
    o.stop(ctx.currentTime + 0.04);
  }

  function playSubmit() {
    if (mode !== 'full' || !ensureCtx()) return;
    duckAmbient(0.75, 800);
    // C-E-G triad with attack
    const chord = [261.63, 329.63, 392.00, 523.25];
    chord.forEach((freq, i) => {
      const o = ctx.createOscillator();
      o.type = i === chord.length - 1 ? 'triangle' : 'sine';
      o.frequency.value = freq;
      const g = ctx.createGain();
      const now = ctx.currentTime;
      const delay = i * 0.03;
      g.gain.setValueAtTime(0, now + delay);
      g.gain.linearRampToValueAtTime(VOL.submit * (0.5 + 0.5 / (i + 1)), now + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.8);
      o.connect(g).connect(masterGain);
      o.start(now + delay);
      o.stop(now + delay + 0.9);
    });
  }

  function playWarp() {
    if (!throttled('warp', 200)) return;
    if (mode === 'muted' || !ensureCtx()) return;
    duckAmbient(0.6, 500);
    // Filtered noise sweep + sub thump
    const bufferSize = ctx.sampleRate * 0.4;
    const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + 0.4);
    filter.Q.value = 6;
    const ng = ctx.createGain();
    envelope(ng, 0.01, 0.4, VOL.warp);
    noise.connect(filter).connect(ng).connect(masterGain);
    noise.start();

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, ctx.currentTime);
    sub.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.25);
    const sg = ctx.createGain();
    envelope(sg, 0.005, 0.3, VOL.warp * 0.7);
    sub.connect(sg).connect(masterGain);
    sub.start();
    sub.stop(ctx.currentTime + 0.35);
  }

  function playMascot() {
    if (!throttled('mascot', 10000)) return; // max once per 10s
    if (mode !== 'full' || !ensureCtx()) return;
    duckAmbient(0.4, 1500);
    // Easy "wakes up" — soft cyan chord swell
    const chord = [392.00, 523.25, 659.25]; // G4 C5 E5
    chord.forEach((freq, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const g = ctx.createGain();
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(VOL.mascot * (0.5 + i * 0.15), now + 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      o.connect(g).connect(masterGain);
      o.start();
      o.stop(now + 1.7);
    });
  }

  function throttled(key, ms) {
    const now = performance.now();
    if (lastEarcon[key] && now - lastEarcon[key] < ms) return false;
    lastEarcon[key] = now;
    return true;
  }

  // ─── Mode management ───
  function applyMode() {
    if (mode === 'ambient' || mode === 'full') {
      if (!ambientNodes) {
        if (ensureCtx()) {
          // Resume context if suspended (browser autoplay)
          if (ctx.state === 'suspended') ctx.resume();
          startAmbient();
        }
      }
    } else {
      stopAmbient();
    }
  }

  function cycleMode() {
    const idx = MODES.indexOf(mode);
    mode = MODES[(idx + 1) % MODES.length];
    try { localStorage.setItem(KEY, mode); } catch {}
    applyMode();
    updateToggle();
    // Play a quick confirmation earcon for the new state
    if (mode === 'full') setTimeout(playSelect, 80);
  }

  // ─── Toggle button UI ───
  // Clean inline SVGs — single clear icon per state, no animated paths
  const ICONS = {
    ambient: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none"/>
        <path d="M15.5 8.5a5 5 0 0 1 0 7"/>
      </svg>`,
    full: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none"/>
        <path d="M15.5 8.5a5 5 0 0 1 0 7"/>
        <path d="M19 5a10 10 0 0 1 0 14"/>
      </svg>`,
    muted: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none"/>
        <line x1="23" y1="9" x2="17" y2="15"/>
        <line x1="17" y1="9" x2="23" y2="15"/>
      </svg>`,
  };

  function updateToggle() {
    const btn = document.getElementById('sound-toggle');
    if (!btn) return;
    btn.dataset.mode = mode;
    const titles = {
      ambient: 'Cosmic ambient on · click for full sound',
      full: 'Full sound on · click to mute',
      muted: 'Sound off · click for ambient',
    };
    btn.innerHTML = ICONS[mode];
    btn.setAttribute('aria-label', titles[mode]);
    btn.setAttribute('title', titles[mode]);
  }

  // ─── Auto-bind DOM listeners ───
  function attach() {
    // Sound toggle in nav
    const btn = document.getElementById('sound-toggle');
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); cycleMode(); });
    updateToggle();

    // First user interaction → start ambient if in ambient/full mode
    function firstTouch() {
      if (ensureCtx() && ctx.state === 'suspended') ctx.resume();
      applyMode();
      window.removeEventListener('pointerdown', firstTouch, true);
      window.removeEventListener('keydown', firstTouch, true);
      window.removeEventListener('scroll', firstTouch, true);
    }
    window.addEventListener('pointerdown', firstTouch, true);
    window.addEventListener('keydown', firstTouch, true);
    window.addEventListener('scroll', firstTouch, true);

    // Hover: engine cards, bundle picks, primary CTAs
    const hoverSelectors = '.engine-card, .sb-bundle, .btn-accent, .ind-card, .conv-card, .ef-node, .pc-card, .compare-us';
    document.querySelectorAll(hoverSelectors).forEach(el => {
      el.addEventListener('mouseenter', playHover);
    });

    // Select: stack builder engine checkboxes + bundle clicks
    document.querySelectorAll('.sb-engine input').forEach(el => {
      el.addEventListener('change', playSelect);
    });
    document.querySelectorAll('.sb-bundle').forEach(el => {
      el.addEventListener('click', playSelect);
    });

    // Slider drag (Revenue Scale calculator)
    const slider = document.getElementById('calc-slider');
    if (slider) {
      const sMin = +slider.min, sMax = +slider.max;
      slider.addEventListener('input', () => playSlider(+slider.value, sMin, sMax));
    }

    // Counter increments — hook into IntersectionObserver-driven animation
    const counters = document.querySelectorAll('.impact-num[data-count]');
    if (counters.length && window.IntersectionObserver) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          // Replay ticks during the 1.4s count-up window
          const target = +e.target.dataset.count;
          const ticks = Math.min(8, Math.max(3, Math.floor(target)));
          for (let i = 0; i < ticks; i++) setTimeout(playCounter, (i + 1) * (1400 / ticks));
        });
      }, { threshold: 0.4 });
      counters.forEach(c => io.observe(c));
    }

    // Form submit
    const form = document.getElementById('contactForm');
    if (form) form.addEventListener('submit', () => playSubmit());

    // Page loader warp
    const loader = document.getElementById('page-loader');
    if (loader) {
      const mo = new MutationObserver(() => {
        if (loader.classList.contains('active')) playWarp();
      });
      mo.observe(loader, { attributes: true, attributeFilter: ['class'] });
    }

    // Mascot easter egg
    const mascot = document.querySelector('.hero-mascot');
    if (mascot) mascot.addEventListener('mouseenter', playMascot);
  }

  // Public API for inspection / debugging
  window.EasyworksSound = { cycleMode, getMode: () => mode, play: { hover: playHover, select: playSelect, submit: playSubmit, warp: playWarp, mascot: playMascot } };

  // Bind on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
