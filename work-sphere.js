/* ────────────────────────────────────────────────────────────────────
   Client constellation — easyworks.ai
   Clients orbit the Easyworks core on a 3D globe (Fibonacci distribution),
   linked by glowing lines, with a "now viewing" detail card.

   Interaction (desktop + touch, identical model):
   • Auto-orbits gently when idle.
   • Drag to spin, with momentum/inertia on release (flick it).
   • Click/tap an orb  -> it eases to the FRONT and locks (card updates).
   • Click/tap the already-front orb (or the card's VISIT button) -> opens site.
   • Desktop also: hover an orb to freeze + preview without committing.
   • Auto-orbit resumes after a few seconds idle.

   Only prefers-reduced-motion keeps the calm pill-stack fallback.
   ──────────────────────────────────────────────────────────────────── */
(function () {
  function init() {
    var stage = document.getElementById('cs-stage');
    if (!stage) return;
    var items = Array.prototype.slice.call(stage.querySelectorAll('.ws-item'));
    if (!items.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var fine = window.matchMedia('(pointer: fine)').matches;

    var svg  = document.getElementById('cs-links');
    var dMono = document.getElementById('cs-dMono');
    var dCat  = document.getElementById('cs-dCat');
    var dName = document.getElementById('cs-dName');
    var dDesc = document.getElementById('cs-dDesc');
    var dCta  = document.getElementById('cs-dCta');

    stage.classList.add('is-sphere');
    var N = items.length;

    // Fibonacci sphere — evenly spreads N points over a unit sphere.
    var pts = [], off = 2 / N, inc = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) {
      var uy = i * off - 1 + off / 2;
      var ur = Math.sqrt(Math.max(0, 1 - uy * uy));
      var phi = i * inc;
      pts.push({ x: Math.cos(phi) * ur, y: uy, z: Math.sin(phi) * ur });
    }

    var lastDetail = -1;
    function setDetail(idx) {
      if (idx === lastDetail) return;
      lastDetail = idx;
      var el = items[idx], orb = el.querySelector('.ws-orb');
      dMono.textContent = orb.textContent;
      dMono.style.background = getComputedStyle(orb).backgroundImage;
      dCat.textContent  = el.getAttribute('data-cat');
      dName.textContent = el.getAttribute('data-name');
      dDesc.textContent = el.getAttribute('data-desc');
      dCta.setAttribute('href', el.getAttribute('href'));
      for (var j = 0; j < N; j++) items[j].classList.toggle('is-active', j === idx);
    }

    // constellation lines (all pairs)
    var lines = [];
    for (var a = 0; a < N; a++) for (var b = a + 1; b < N; b++) {
      var ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      svg.appendChild(ln);
      lines.push({ a: a, b: b, el: ln });
    }

    // ── interaction state ──
    var AUTO = fine ? 0.0016 : 0.0024;   // ambient spin per frame
    var SNAP = 0.12;                     // ease toward a selected orb's front position
    var DECAY = 0.94;                    // inertia falloff
    var TAP = 6;                         // px of movement that still counts as a tap
    var IDLE_RELEASE = 5000;             // ms before a locked selection releases to auto

    var yaw = 1.0, pitch = 0.2, pitchHome = 0.2;
    var yawVel = 0;
    var targetYaw = yaw, targetPitch = pitch;
    var selected = -1, hovered = -1;
    var dragging = false, didDrag = false, moved = 0, lastX = 0, lastY = 0;
    var lastInteract = nowMs();

    function nowMs() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

    // yaw/pitch that bring point i to the front (toward camera, centered)
    function selectOrb(idx) {
      selected = idx;
      var p = pts[idx];
      var r = Math.sqrt(p.x * p.x + p.z * p.z);
      var ty = Math.atan2(p.x, p.z);
      var tp = Math.atan2(p.y, r);
      // choose the nearest equivalent yaw so it takes the short way around
      targetYaw = ty + Math.PI * 2 * Math.round((yaw - ty) / (Math.PI * 2));
      targetPitch = tp;
      yawVel = 0;
      setDetail(idx);
      lastInteract = nowMs();
    }

    // ── per-orb click/tap: first selects + flies to front, second opens site ──
    items.forEach(function (el, idx) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        if (didDrag) { didDrag = false; return; }   // a drag, not a tap
        if (selected === idx) {
          window.open(el.href, '_blank', 'noopener');
        } else {
          selectOrb(idx);
        }
      });
      if (fine) {
        el.addEventListener('pointerenter', function () { hovered = idx; setDetail(idx); lastInteract = nowMs(); });
        el.addEventListener('pointerleave', function () { hovered = -1; });
        el.addEventListener('focus', function () { hovered = idx; setDetail(idx); });
        el.addEventListener('blur', function () { hovered = -1; });
      }
    });

    // ── drag to spin (mouse + touch) ──
    stage.addEventListener('pointerdown', function (e) {
      dragging = true; didDrag = false; moved = 0;
      lastX = e.clientX; lastY = e.clientY; yawVel = 0;
      lastInteract = nowMs();
      if (stage.setPointerCapture) { try { stage.setPointerCapture(e.pointerId); } catch (err) {} }
    });
    stage.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      var dYaw = dx * 0.009;
      yaw += dYaw;
      yawVel = dYaw;
      if (fine) pitch = clamp(pitch + dy * 0.007, -1.0, 1.0);
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > TAP) { didDrag = true; selected = -1; }
      lastX = e.clientX; lastY = e.clientY;
      lastInteract = nowMs();
    });
    function endDrag() { dragging = false; }
    window.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    function render() {
      var W = stage.clientWidth, H = stage.clientHeight, cx = W / 2, cy = H / 2;
      var mobile = window.innerWidth < 760;
      var R = mobile ? Math.min(window.innerWidth * 0.27, H * 0.40) : 176;
      var D = mobile ? R * 3.4 : 420;

      var cosY = Math.cos(yaw), sinY = Math.sin(yaw), cosX = Math.cos(pitch), sinX = Math.sin(pitch);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var proj = [], frontIdx = -1, frontZ = -1e9;

      for (var i = 0; i < N; i++) {
        var p = pts[i];
        var x1 = p.x * cosY - p.z * sinY, z1 = p.x * sinY + p.z * cosY;
        var y2 = p.y * cosX - z1 * sinX, z2 = p.y * sinX + z1 * cosX;
        var X = x1 * R, Y = y2 * R, Z = z2 * R, f = D / (D - Z), depth = (Z + R) / (2 * R);
        proj.push({ x: cx + X * f, y: cy + Y * f, depth: depth });

        var el = items[i];
        el.style.transform =
          'translate(-50%,-50%) translate(' + (X * f).toFixed(1) + 'px,' + (Y * f).toFixed(1) + 'px) scale(' + f.toFixed(3) + ')';
        el.style.opacity = (0.3 + depth * 0.7).toFixed(3);
        el.style.zIndex = String(1000 + Math.round(Z));
        el.style.filter = depth < 0.5 ? 'blur(' + ((0.5 - depth) * 2.6).toFixed(1) + 'px)' : 'none';
        if (Z > frontZ) { frontZ = Z; frontIdx = i; }
      }

      for (var k = 0; k < lines.length; k++) {
        var L = lines[k], pa = proj[L.a], pb = proj[L.b];
        L.el.setAttribute('x1', pa.x.toFixed(1)); L.el.setAttribute('y1', pa.y.toFixed(1));
        L.el.setAttribute('x2', pb.x.toFixed(1)); L.el.setAttribute('y2', pb.y.toFixed(1));
        L.el.setAttribute('stroke-opacity', (0.06 + Math.min(pa.depth, pb.depth) * 0.26).toFixed(3));
      }

      // detail follows the selection, else the hover, else the front-most orb
      if (selected >= 0) setDetail(selected);
      else if (hovered >= 0) setDetail(hovered);
      else if (frontIdx >= 0) setDetail(frontIdx);
    }

    function loop() {
      var t = nowMs();
      if (dragging) {
        // yaw/pitch driven by the move handler
      } else if (selected >= 0) {
        yaw += (targetYaw - yaw) * SNAP;
        pitch += (targetPitch - pitch) * SNAP;
        if (t - lastInteract > IDLE_RELEASE) selected = -1;   // release the lock, resume orbit
      } else if (hovered >= 0) {
        // frozen while previewing on hover; ease pitch gently home
        pitch += (pitchHome - pitch) * 0.05;
      } else {
        if (Math.abs(yawVel) > AUTO) { yaw += yawVel; yawVel *= DECAY; }  // inertia
        else { yawVel = 0; yaw += AUTO; }                                 // ambient orbit
        pitch += (pitchHome - pitch) * 0.04;
      }
      render();
      requestAnimationFrame(loop);
    }

    render();             // synchronous first frame so the composition shows immediately
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
