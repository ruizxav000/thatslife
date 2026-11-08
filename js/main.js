(function () {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Content: replace with real projects ---------------------------------
  // x, y place each project ("food source") in the network, 0–1 across the canvas.
  const PROJECTS = [
    { label: '01 Project One',   kind: 'Brand system',   year: '2026', x: 0.06, y: 0.18 },
    { label: '02 Project Two',   kind: 'Mobile app',     year: '2026', x: 0.36, y: 0.06 },
    { label: '03 Project Three', kind: 'Data viz',       year: '2025', x: 0.66, y: 0.26 },
    { label: '04 Project Four',  kind: 'Design system',  year: '2025', x: 0.92, y: 0.08 },
    { label: '05 Project Five',  kind: 'Installation',   year: '2025', x: 0.14, y: 0.86 },
    { label: '06 Project Six',   kind: 'Web platform',   year: '2024', x: 0.48, y: 0.62 },
    { label: '07 Project Seven', kind: 'Research',       year: '2024', x: 0.84, y: 0.9 }
  ];
  const BLURB = 'Replace with a short story about this project: the problem, the shape of the solution, and what changed because of it.';

  // ---- Themes (one per microscopy technique) -------------------------------
  const THEMES = {
    fluor: {
      bg: '#05030b', blend: 'lighter',
      maps: ['plasma', 'inferno'], range: [0.08, 0.6], alpha: 0.75, lineWidth: 0.9,
      spore: 'glow', fusion: 'rgba(255,214,90,0.85)',
      net: 'inferno', netRange: [0.2, 0.98], particle: 'rgba(255,246,190,0.95)',
      food: '#ffd34d', glow: 'rgba(255,190,60,0.35)', label: '#f1ecff', labelBg: 'rgba(5,3,11,0.7)'
    },
    stain: {
      bg: '#67c9b7', blend: 'source-over',
      maps: ['stain', 'stain'], range: [0.4, 0.95], alpha: 0.7, lineWidth: 1,
      spore: 'cell', fusion: 'rgba(58,6,22,0.85)',
      net: 'stain', netRange: [0.35, 1], particle: 'rgba(30,4,12,0.85)',
      food: '#3a0616', glow: null, label: '#1f060d', labelBg: 'rgba(103,201,183,0.85)'
    },
    wave: {
      bg: '#050607', blend: 'source-over',
      maps: ['viridis', 'plasma'], range: [0.15, 0.95], alpha: 0.85, lineWidth: 0.9,
      spore: 'none', fusion: 'rgba(240,249,33,0.55)',
      net: 'viridis', netRange: [0.12, 1], particle: 'rgba(240,249,33,0.9)',
      food: '#fde725', glow: 'rgba(181,222,43,0.25)', label: '#eef6f3', labelBg: 'rgba(5,6,7,0.7)'
    }
  };

  let themeName = THEMES[root.dataset.theme] ? root.dataset.theme : 'fluor';

  // ---- Hero: mycelium ------------------------------------------------------
  const heroCanvas = document.getElementById('hyphae');
  const hyphae = new window.Hyphae(heroCanvas, THEMES[themeName]);

  function seedInitial() {
    const w = hyphae.w, h = hyphae.h;
    if (w < h) hyphae.seed(w * 0.62, h * 0.04, 9, Math.PI / 2, 2.4);
    else hyphae.seed(w * 0.94, h * 0.3, 10, Math.PI, 2.6);
  }

  function growInstantly() {
    let guard = 0;
    while (hyphae.tips.length && guard++ < 20000) hyphae.update();
    hyphae.draw();
  }

  seedInitial();
  if (reduceMotion) growInstantly();

  heroCanvas.addEventListener('pointermove', function (e) {
    const r = heroCanvas.getBoundingClientRect();
    hyphae.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
  });
  heroCanvas.addEventListener('pointerleave', function () { hyphae.pointer = null; });
  document.querySelector('.hero').addEventListener('click', function (e) {
    if (e.target.closest('a, button')) return;
    const r = heroCanvas.getBoundingClientRect();
    hyphae.seed(e.clientX - r.left, e.clientY - r.top, 7);
    life.idle = 0;
    if (reduceMotion) growInstantly();
  });

  const rTips = document.getElementById('r-tips');
  const rFus = document.getElementById('r-fusions');
  const rCov = document.getElementById('r-cover');
  const rTime = document.getElementById('r-time');
  const fmt = new Intl.NumberFormat();
  function updateReadout() {
    rTips.textContent = fmt.format(hyphae.tips.length);
    rFus.textContent = fmt.format(hyphae.fusions);
    rCov.textContent = (hyphae.coverage() * 100).toFixed(1) + '%';
    rTime.textContent = fmt.format(hyphae.time);
  }

  // When a colony stops growing, let it rest, dissolve it, and start again.
  const life = { idle: 0, fade: 0 };
  function lifecycle() {
    if (hyphae.tips.length) { life.idle = 0; return; }
    if (++life.idle < 900) return;
    hyphae.fade(0.06);
    if (++life.fade > 70) {
      hyphae.reset();
      seedInitial();
      life.idle = 0;
      life.fade = 0;
    }
  }

  // ---- Work: adaptive network ------------------------------------------------
  const list = document.getElementById('project-list');
  PROJECTS.forEach(function (p, i) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.i = i;
    b.innerHTML = '<span class="num">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<span class="t">' + p.label.replace(/^\d+\s/, '') + '</span>' +
      '<span class="k">' + p.kind + '</span>';
    li.appendChild(b);
    list.appendChild(li);
  });
  const buttons = Array.prototype.slice.call(list.querySelectorAll('button'));

  const netCanvas = document.getElementById('network');
  const net = new window.Physarum(netCanvas, PROJECTS, THEMES[themeName]);

  function highlight(i) {
    net.focus = i;
    buttons.forEach(function (b, j) { b.classList.toggle('is-on', j === i); });
    if (reduceMotion) net.draw(false);
  }
  net.onHover = highlight;
  net.onSelect = openProject;
  buttons.forEach(function (b, i) {
    b.addEventListener('mouseenter', function () { highlight(i); });
    b.addEventListener('focus', function () { highlight(i); });
    b.addEventListener('mouseleave', function () { highlight(-1); });
    b.addEventListener('blur', function () { highlight(-1); });
    b.addEventListener('click', function () { openProject(i); });
  });

  function settle(n) {
    for (let i = 0; i < n; i++) net.step();
  }
  if (reduceMotion) { settle(500); net.draw(false); }

  const gamma = document.getElementById('gamma');
  const flux = document.getElementById('flux');
  gamma.addEventListener('input', function () {
    net.o.gamma = parseFloat(gamma.value);
    document.getElementById('v-gamma').textContent = net.o.gamma.toFixed(2);
    if (reduceMotion) { settle(200); net.draw(false); }
  });
  flux.addEventListener('input', function () {
    net.o.I0 = parseFloat(flux.value);
    document.getElementById('v-flux').textContent = net.o.I0.toFixed(2);
    if (reduceMotion) { settle(200); net.draw(false); }
  });
  document.getElementById('regrow').addEventListener('click', function () {
    net.regrow();
    if (reduceMotion) { settle(500); net.draw(false); }
  });

  const nIter = document.getElementById('n-iter');
  const nTubes = document.getElementById('n-tubes');
  const nLen = document.getElementById('n-len');
  function updateNetStats() {
    const s = net.stats();
    nIter.textContent = fmt.format(s.iter);
    nTubes.textContent = fmt.format(s.tubes);
    nLen.textContent = fmt.format(Math.round(s.length));
  }

  // ---- Project dialog ----------------------------------------------------
  const dialog = document.getElementById('project-dialog');
  function openProject(i) {
    const p = PROJECTS[i];
    document.getElementById('pd-meta').textContent = p.kind + ' · ' + p.year;
    document.getElementById('pd-title').textContent = p.label.replace(/^\d+\s/, '');
    document.getElementById('pd-blurb').textContent = p.blurb || BLURB;
    if (typeof dialog.showModal === 'function') dialog.showModal();
  }

  // ---- Theme switching -----------------------------------------------------
  const themeButtons = Array.prototype.slice.call(document.querySelectorAll('[data-set-theme]'));
  function setTheme(name) {
    themeName = name;
    root.dataset.theme = name;
    themeButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.setTheme === name)); });
    hyphae.theme = THEMES[name];
    hyphae.paint();
    net.theme = THEMES[name];
    net.draw(!reduceMotion);
    try { localStorage.setItem('tl-theme', name); } catch (e) {}
  }
  themeButtons.forEach(function (b) {
    b.addEventListener('click', function () { setTheme(b.dataset.setTheme); });
  });
  setTheme(themeName);

  // ---- Main loop: only animate what's on screen ------------------------------
  const visible = { hero: true, net: false };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.target === heroCanvas) visible.hero = en.isIntersecting;
        else visible.net = en.isIntersecting;
      });
    }).observe(heroCanvas);
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible.net = en.isIntersecting; });
    }, { threshold: 0.3 }).observe(netCanvas);
  } else {
    visible.net = true;
  }

  let frame = 0;
  function loop() {
    frame++;
    if (!reduceMotion) {
      if (visible.hero) {
        hyphae.update();
        hyphae.draw();
        lifecycle();
      }
      if (visible.net) {
        const steps = net.iter > 400 ? 2 : 1;
        for (let i = 0; i < steps; i++) net.step();
        net.moveParticles();
        net.draw(true);
      }
    }
    if (frame % 15 === 0) {
      if (visible.hero) updateReadout();
      if (visible.net) updateNetStats();
    }
    requestAnimationFrame(loop);
  }
  updateReadout();
  updateNetStats();
  requestAnimationFrame(loop);

  // ---- Resize --------------------------------------------------------------
  let rt = 0, lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      // Ignore mobile URL-bar height jitter; rebuild only on real width changes.
      if (Math.abs(window.innerWidth - lastW) < 40) return;
      lastW = window.innerWidth;
      hyphae.resize();
      seedInitial();
      if (reduceMotion) growInstantly();
      net.resize();
      if (reduceMotion) { settle(500); net.draw(false); }
    }, 220);
  });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
