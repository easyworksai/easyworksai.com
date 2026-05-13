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
    ambient: 0.08,   // very soft — sparse + airy
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

  // ─── Ambient v3: "Music for Airports" approach ───
  // No sustained tones. Silence is the canvas. Two ingredients only:
  //   1. Ultra-soft filtered pink noise (texture, no pitch) — sounds like
  //      the hum of a quiet room or distant cosmic radiation
  //   2. Sparse pentatonic plucks every 9-22 seconds that emerge from
  //      silence, ring out for 3-4 seconds, and decay back into silence
  // No drone, no chord stack, no continuous filter sweep.
  function startAmbient() {
    if (!ctx || ambientNodes) return;

    const now = ctx.currentTime;

    // 1. Pink-ish noise texture — ~30 sec buffer, looped
    const noiseSec = 30;
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * noiseSec, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    // Simple pink-noise approximation (Paul Kellet method, simplified)
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.0990460;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.3;
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    noiseSrc.loop = true;

    // Heavy lowpass — makes noise feel distant, "shh" not "tss"
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 900;
    noiseFilter.Q.value = 0.5;

    // Very slow gain wander so the texture isn't perfectly static
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.6;
    const noiseLfo = ctx.createOscillator();
    noiseLfo.type = 'sine';
    noiseLfo.frequency.value = 0.05; // 20s cycle
    const noiseLfoDepth = ctx.createGain();
    noiseLfoDepth.gain.value = 0.25;
    noiseLfo.connect(noiseLfoDepth).connect(noiseGain.gain);
    noiseLfo.start();

    noiseSrc.connect(noiseFilter).connect(noiseGain).connect(ambientGain);
    noiseSrc.start();

    // Fade in the noise bed
    ambientGain.gain.cancelScheduledValues(now);
    ambientGain.gain.setValueAtTime(0, now);
    ambientGain.gain.linearRampToValueAtTime(VOL.ambient, now + 5.0);

    // 2. Schedule sparse plucks — pentatonic scale, no melody
    // Pentatonic C major: C D E G A (no semitones = always consonant)
    const pluckNotes = [
      523.25, 587.33, 659.25, 783.99, 880.00,   // C5 D5 E5 G5 A5
      1046.50, 1174.66, 1318.51, 1567.98, 1760.00, // C6 D6 E6 G6 A6
    ];
    let pluckTimer = null;
    function schedulePluck() {
      const wait = 9000 + Math.random() * 13000; // 9–22 seconds
      pluckTimer = setTimeout(() => {
        if (!ambientNodes) return;
        // 10% chance to drop a pair of harmonized plucks (octave or fifth) instead of one
        if (Math.random() < 0.10) {
          const idx = Math.floor(Math.random() * pluckNotes.length);
          playPluck(pluckNotes[idx]);
          // Second pluck slightly delayed
          setTimeout(() => ambientNodes && playPluck(pluckNotes[Math.min(pluckNotes.length - 1, idx + 3)]), 200);
        } else {
          playPluck(pluckNotes[Math.floor(Math.random() * pluckNotes.length)]);
        }
        schedulePluck();
      }, wait);
    }
    // First pluck after 4-9 seconds (small initial event so user knows ambient is on)
    pluckTimer = setTimeout(() => {
      if (ambientNodes) {
        playPluck(pluckNotes[Math.floor(Math.random() * 5)]); // lower register first pluck
        schedulePluck();
      }
    }, 4000 + Math.random() * 5000);

    ambientNodes = { noiseSrc, noiseLfo, noiseFilter, pluckTimer };
  }

  // Soft pluck — fast attack, slow decay into silence. Sine + tiny harmonic.
  function playPluck(freq) {
    if (!ctx || !ambientGain) return;
    const now = ctx.currentTime;

    // Fundamental
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.07, now + 0.02);     // quick attack
    g.gain.exponentialRampToValueAtTime(0.0001, now + 3.5); // long decay
    o.connect(g).connect(ambientGain);
    o.start();
    o.stop(now + 3.6);

    // 5th harmonic shimmer (subtle bell character)
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq * 2;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(0.018, now + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    o2.connect(g2).connect(ambientGain);
    o2.start();
    o2.stop(now + 1.9);
  }

  function stopAmbient(fadeMs = 800) {
    if (!ctx || !ambientNodes) return;
    const now = ctx.currentTime;
    ambientGain.gain.cancelScheduledValues(now);
    ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
    ambientGain.gain.linearRampToValueAtTime(0, now + fadeMs / 1000);
    const nodes = ambientNodes;
    ambientNodes = null;
    if (nodes.pluckTimer) clearTimeout(nodes.pluckTimer);
    setTimeout(() => {
      try {
        if (nodes.noiseSrc) nodes.noiseSrc.stop();
        if (nodes.noiseLfo) nodes.noiseLfo.stop();
      } catch {}
    }, fadeMs + 100);
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
  // Inline SVG icons with animated waves — cleaner than emoji
  const ICONS = {
    ambient: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>
        <path class="wave wave-1" d="M15.5 8.5a5 5 0 0 1 0 7" opacity="0.85"/>
      </svg>`,
    full: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>
        <path class="wave wave-1" d="M15.5 8.5a5 5 0 0 1 0 7"/>
        <path class="wave wave-2" d="M19 5a10 10 0 0 1 0 14" opacity="0.75"/>
      </svg>`,
    muted: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>
        <line x1="22" y1="9" x2="16" y2="15"/>
        <line x1="16" y1="9" x2="22" y2="15"/>
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
