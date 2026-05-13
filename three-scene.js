// ════════════════════════════════════════════════════════════════════
// EASYWORKS AI — Three.js floating geometry scene
// Real WebGL 3D — toon-shaded crystals, cubes, icosahedra around the mascot
// ════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  function init() {
    const container = document.getElementById('three-scene');
    if (!container || typeof THREE === 'undefined') return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Scene setup
    const scene = new THREE.Scene();
    const w = () => container.clientWidth;
    const h = () => container.clientHeight;
    const camera = new THREE.PerspectiveCamera(50, w() / h(), 0.1, 100);
    camera.position.set(0, 0, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w(), h());
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Lighting — three-point toon-ish setup
    const ambient = new THREE.AmbientLight(0x4a2f88, 0.4);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xff2bd1, 1.2);
    keyLight.position.set(5, 6, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x22d3ee, 0.9);
    rimLight.position.set(-4, -2, 3);
    scene.add(rimLight);

    const fill = new THREE.PointLight(0xa855f7, 1.5, 20);
    fill.position.set(0, 0, 5);
    scene.add(fill);

    // Geometric objects
    const objects = [];

    function addObject(geom, color, x, y, z, scale, spin) {
      const mat = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.18,
        shininess: 80,
        specular: 0xa78bfa,
        transparent: true,
        opacity: 0.55,
        flatShading: true,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(scale);
      mesh.userData = { spin, baseY: y, basePos: { x, y, z }, phase: Math.random() * Math.PI * 2 };
      scene.add(mesh);

      // Subtle wireframe outline — softer, less attention-grabbing
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        wireframe: true,
        transparent: true,
        opacity: 0.22,
      });
      const wire = new THREE.Mesh(geom, wireMat);
      wire.scale.setScalar(1.015);
      mesh.add(wire);

      objects.push(mesh);
      return mesh;
    }

    // Cluster of floating crystals + cubes around where the mascot will be
    const icoGeom = new THREE.IcosahedronGeometry(1, 0);
    const octGeom = new THREE.OctahedronGeometry(1, 0);
    const cubeGeom = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const tetraGeom = new THREE.TetrahedronGeometry(1.1, 0);
    const dodecaGeom = new THREE.DodecahedronGeometry(0.9, 0);

    // Fewer crystals, pushed further back, smaller — atmospheric depth not competing focal points
    addObject(icoGeom,   0xa855f7, -7.5,  3.5, -8,  0.4, { x: 0.004, y: 0.006, z: 0.002 });
    addObject(octGeom,   0xff2bd1,  7.0,  3.5, -9,  0.45, { x: -0.005, y: 0.008, z: 0.003 });
    addObject(dodecaGeom,0x22d3ee, -6.5, -2.5, -10, 0.35, { x: 0.005, y: 0.004, z: 0.004 });
    addObject(tetraGeom, 0xf0abfc,  6.5, -3.0, -10, 0.4, { x: -0.006, y: 0.005, z: 0.003 });
    addObject(cubeGeom,  0x00f5ff, -2.0,  5.0, -12, 0.3, { x: 0.003, y: -0.007, z: 0.004 });

    // Particle field (lots of small dots for depth)
    const particleGeom = new THREE.BufferGeometry();
    const particleCount = reducedMotion ? 40 : 110;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const palette = [
      [0.13, 0.83, 0.93], // cyan
      [0.94, 0.67, 0.99], // magenta-light
      [0.66, 0.33, 0.97], // purple
      [1.0,  0.17, 0.82], // hot pink
      [1.0, 1.0, 1.0],   // white
    ];
    for (let i = 0; i < particleCount; i++) {
      positions[i*3]   = (Math.random() - 0.5) * 28;
      positions[i*3+1] = (Math.random() - 0.5) * 18;
      positions[i*3+2] = (Math.random() - 0.5) * 18 - 4;
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i*3]   = c[0];
      colors[i*3+1] = c[1];
      colors[i*3+2] = c[2];
    }
    particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeom.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeom, particleMat);
    scene.add(particles);

    // Mouse tracking
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener('mousemove', (e) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1;
    }, { passive: true });

    // Scroll-driven camera dolly — flies into the scene as you scroll
    let scrollProgress = 0;
    const heroEl = document.querySelector('.hero-v2');
    function onScrollDolly() {
      const heroH = heroEl ? heroEl.offsetHeight : window.innerHeight;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      // Local scroll within hero (0..1)
      const local = Math.min(1, Math.max(0, y / (heroH * 1.2)));
      // Global scroll for the whole page
      const global = docH > 0 ? Math.min(1, y / docH) : 0;
      scrollProgress = local * 0.7 + global * 0.3;
    }
    window.addEventListener('scroll', onScrollDolly, { passive: true });
    onScrollDolly();

    // Resize
    function onResize() {
      camera.aspect = w() / h();
      camera.updateProjectionMatrix();
      renderer.setSize(w(), h());
    }
    window.addEventListener('resize', onResize);

    // Animation loop
    const clock = new THREE.Clock();
    function animate() {
      const t = clock.getElapsedTime();
      const dt = clock.getDelta();

      // Smooth mouse-track easing for camera
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      // Camera dollies forward with scroll: z 10 → -6, then rolls
      const dollyZ = 10 - scrollProgress * 16;
      const rollY  = scrollProgress * 0.5;
      camera.position.x = mouse.x * 0.6 + Math.sin(t * 0.1) * 0.3;
      camera.position.y = mouse.y * 0.4 - scrollProgress * 2;
      camera.position.z = dollyZ;
      camera.rotation.z = rollY * Math.sin(t * 0.2) * 0.05;
      camera.lookAt(0, -scrollProgress * 1.5, 0);

      // Animate each object — rotate + float
      for (const o of objects) {
        o.rotation.x += o.userData.spin.x;
        o.rotation.y += o.userData.spin.y;
        o.rotation.z += o.userData.spin.z;
        o.position.y = o.userData.basePos.y + Math.sin(t * 0.6 + o.userData.phase) * 0.4;
        o.position.x = o.userData.basePos.x + Math.cos(t * 0.4 + o.userData.phase) * 0.25;
      }

      // Slow particle drift
      particles.rotation.y += 0.0008;
      particles.rotation.x += 0.0003;

      renderer.render(scene, camera);
      if (!reducedMotion) requestAnimationFrame(animate);
    }
    animate();
  }

  // Wait for Three.js to load
  function ready() {
    if (typeof THREE !== 'undefined') {
      init();
    } else {
      setTimeout(ready, 50);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
})();
