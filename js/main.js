(function () {
  'use strict';

  const ME = {
    role: 'Product Marketing @ ServiceNow',
    place: 'Boston, MA',
    links: [
      { label: 'LinkedIn', href: '#' },
      { label: 'Email', href: '#' }
    ],
    // kind 'mycelium' opens the living network; anything else shows over Space Cowboy.
    projects: [
      { title: 'Mycelium', meta: 'Interactive, 2026', kind: 'mycelium',
        summary: 'A living network that grows the way fungi do: tips wander, branch and fuse when they meet. Click open ground to plant a spore. Hold to feed it. When two colonies touch, light runs home to both.' },
      { title: 'Project Two',   meta: 'Positioning, 2025', summary: 'One or two sentences on what this was and why it mattered.' },
      { title: 'Project Three', meta: 'Campaign, 2025',    summary: 'One or two sentences on what this was and why it mattered.' },
      { title: 'Project Four',  meta: 'Story, 2024',       summary: 'One or two sentences on what this was and why it mattered.' }
    ]
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = function (s) { return document.querySelector(s); };
  const body = document.body;

  document.querySelectorAll('[data-role]').forEach(function (n) { n.textContent = ME.role; });
  document.querySelectorAll('[data-place]').forEach(function (n) { n.textContent = ME.place; });

  // ====================================================================================
  // Front page: Space Cowboy. The photograph redrawn in characters, under a black hole.
  // ====================================================================================

  let ascii = null;
  try {
    ascii = new window.Ascii($('#ascii'), { mono: '"Martian Mono", ui-monospace, monospace', accent: [0.435, 0.753, 1] });
  } catch (e) {
    ascii = null;
  }
  const SCENE_SRC = 'assets/scene.jpg';
  const SKY_SRC = 'assets/sky.png';
  const scene = new Image(), skyMask = new Image();
  scene.onload = function () { if (ascii) ascii.setPhoto(scene); };
  skyMask.onload = function () { if (ascii) ascii.setSky(skyMask); };
  scene.src = SCENE_SRC;
  skyMask.src = SKY_SRC;

  // ====================================================================================
  // Mycelium: the living network, on pale stone.
  // ====================================================================================

  const base = $('#base'), over = $('#over');
  const org = new window.Organism(base, over, {
    family: '"Unbounded", sans-serif', weight: 900, stretch: 'normal',
    palette: window.PALETTES.ink
  });

  function freshField() {
    org.setup([], null);
    org.plant(org.w * (org.w < 700 ? 0.5 : 0.62), org.h * 0.56);
    if (reduceMotion) { for (let i = 0; i < 500; i++) org.update(); org.render(); }
  }

  // ---- Which world is showing, and the turn between them --------------------------------

  const view = { world: 'cowboy', project: -1, busy: false };
  const turn = { start: 0, dur: 1, from: 1, to: 1, done: null };
  const snap = document.createElement('canvas');
  const intro = $('#intro'), projectEl = $('#project');

  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }

  // ascii.t = 1 shows Space Cowboy; 0 shows a still of the network; between, cells scramble over.
  function animateTurn(from, to, dur, done) {
    turn.from = from; turn.to = to; turn.done = done;
    turn.start = performance.now();
    turn.dur = reduceMotion ? 1 : dur;
    if (ascii) ascii.t = from;
  }
  function tickTurn(now) {
    if (!turn.start) return;
    const k = Math.min(1, (now - turn.start) / turn.dur);
    if (ascii) ascii.t = turn.from + (turn.to - turn.from) * ease(k);
    if (k >= 1) { turn.start = 0; const d = turn.done; turn.done = null; if (d) d(); }
  }

  function snapshotNet() {
    snap.width = base.width; snap.height = base.height;
    const x = snap.getContext('2d');
    x.drawImage(base, 0, 0);
    x.drawImage(over, 0, 0);
    ascii.setHome(snap);
  }

  function toNet(done) {
    freshField();
    org.render();
    view.world = 'net';
    if (!ascii) { body.classList.add('in-net'); done(); return; }
    snapshotNet();
    body.classList.add('turning');
    animateTurn(1, 0, 1500, function () {
      body.classList.add('in-net');
      body.classList.remove('turning');
      done();
    });
  }

  function toCowboy(done) {
    view.world = 'cowboy';
    org.feeding = false;
    if (!ascii) { body.classList.remove('in-net'); done(); return; }
    snapshotNet();
    ascii.t = 0;
    body.classList.add('turning');
    body.classList.remove('in-net');
    animateTurn(0, 1, 1400, function () {
      body.classList.remove('turning');
      done();
    });
  }

  // ---- Text --------------------------------------------------------------------------------

  const SCRAMBLE = '01<>[]{}()?!$&~^/\\|';
  function decode(el, text, delay) {
    el.textContent = '';
    el.setAttribute('aria-label', text);
    el.dataset.text = text;
    if (reduceMotion) { el.textContent = text; return; }
    const t0 = performance.now() + delay, speed = Math.max(28, 900 / text.length);
    (function step(now) {
      if (el.dataset.text !== text) return;
      const n = Math.floor((now - t0) / speed * 1.6);
      if (n < 0) { requestAnimationFrame(step); return; }
      let s = '';
      for (let i = 0; i < text.length && i < n + 3; i++) {
        s += i < n || text[i] === ' ' ? text[i] : SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
      }
      el.textContent = s;
      if (n < text.length) requestAnimationFrame(step);
      else el.textContent = text;
    })(performance.now());
  }

  function fill(i) {
    const p = ME.projects[i];
    decode($('#p-meta'), p.meta, 0);
    decode($('#p-title'), p.title, 130);
    decode($('#p-summary'), p.summary, 400);
    const link = $('#p-link');
    if (p.link) { link.hidden = false; link.href = p.link; } else link.hidden = true;
    $('#p-restart').hidden = p.kind !== 'mycelium';
  }

  // Dim the characters behind whichever text is showing.
  function placeCalm() {
    // Measure the finished text, not the part that has decoded so far.
    const typing = [];
    document.querySelectorAll('#p-text [data-text]').forEach(function (el) {
      if (el.textContent !== el.dataset.text) { typing.push([el, el.textContent]); el.textContent = el.dataset.text; }
    });
    measureCalm();
    typing.forEach(function (t) { t[0].textContent = t[1]; });
  }
  function measureCalm() {
    const nodes = view.project >= 0 ? [$('#p-text')] : [intro.querySelector('.intro__name'), intro.querySelector('.intro__role')];
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    nodes.forEach(function (n) {
      const q = n.getBoundingClientRect();
      if (!q.width) return;
      l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom);
    });
    if (!isFinite(l)) return;
    const W = window.innerWidth, H = window.innerHeight;
    org.avoid = view.world === 'net' && view.project >= 0 ? [l - 24, t - 24, r + 24, b + 24] : null;
    if (ascii) ascii.calm = [(l - 30) / W, (t - 30) / H, (r + 30) / W, (b + 30) / H];
  }

  // ---- Opening and closing projects -------------------------------------------------------

  function show(i) {
    view.project = i;
    projectEl.hidden = false;
    body.classList.add('is-project');
    fill(i);
    requestAnimationFrame(placeCalm);
  }

  function enter(i) {
    if (view.busy) return;
    hideSheet(true);
    const p = ME.projects[i];
    const wantNet = p.kind === 'mycelium';
    if (wantNet && view.world !== 'net') {
      view.busy = true;
      body.classList.remove('is-project');
      fill(i);
      projectEl.hidden = false;
      view.project = i;
      view.world = 'net';
      placeCalm();
      toNet(function () { view.busy = false; show(i); $('#p-back').focus({ preventScroll: true }); });
    } else if (!wantNet && view.world === 'net') {
      view.busy = true;
      body.classList.remove('is-project');
      toCowboy(function () { view.busy = false; show(i); });
    } else {
      show(i);
    }
  }

  function leave() {
    if (view.project < 0 || view.busy) return;
    body.classList.remove('is-project');
    const done = function () {
      view.busy = false;
      projectEl.hidden = true;
      view.project = -1;
      requestAnimationFrame(placeCalm);
    };
    if (view.world === 'net') { view.busy = true; toCowboy(done); }
    else setTimeout(done, 350);
  }

  $('#p-back').addEventListener('click', leave);
  $('#p-next').addEventListener('click', function () { enter((view.project + 1) % ME.projects.length); });
  $('#p-restart').addEventListener('click', function () { freshField(); });

  // ---- Projects and contact --------------------------------------------------------------

  const list = $('#index-list');
  ME.projects.forEach(function (p, i) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = '<span class="t"></span><span class="k"></span>';
    b.querySelector('.t').textContent = p.title;
    b.querySelector('.k').textContent = p.meta;
    b.addEventListener('click', function () { enter(i); });
    li.appendChild(b);
    list.appendChild(li);
  });
  $('#links').innerHTML = ME.links.map(function (l) {
    return '<li><a href="' + l.href + '" target="_blank" rel="noopener">' + l.label + '</a></li>';
  }).join('');

  let openSheet = null, lastFocus = null;
  function showSheet(id) {
    if (openSheet) openSheet.hidden = true;
    else lastFocus = document.activeElement;
    openSheet = document.getElementById(id);
    openSheet.hidden = false;
    openSheet.scrollTop = 0;
    openSheet.querySelector('[data-close]').focus();
  }
  function hideSheet(quiet) {
    if (!openSheet) return;
    openSheet.hidden = true;
    openSheet = null;
    if (!quiet && lastFocus) lastFocus.focus();
  }
  document.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { hideSheet(); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (openSheet) hideSheet(); else leave();
  });
  $('#open-index').addEventListener('click', function () { showSheet('sheet-index'); });
  $('#open-contact').addEventListener('click', function () { showSheet('sheet-contact'); });

  // ---- The visitor ----------------------------------------------------------------------------

  const pointer = { x: -999, y: -999, on: 0, lx: 0, ly: 0, down: 0, downAt: 0 };
  let touchTimer = 0;
  const inNet = function () { return view.world === 'net' && !view.busy && !openSheet; };

  window.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = 1;
    if (inNet()) org.setPointer(e.clientX, e.clientY);
  });
  document.documentElement.addEventListener('pointerleave', function () { pointer.on = 0; });
  window.addEventListener('pointerdown', function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = 1;
    if (e.pointerType !== 'mouse') {
      clearTimeout(touchTimer);
      touchTimer = setTimeout(function () { pointer.on = 0; }, 1400);
    }
    if (!inNet() || e.target.closest('button, a, .project__text')) return;
    pointer.down = 1; pointer.downAt = performance.now();
    org.setPointer(e.clientX, e.clientY);
  });
  window.addEventListener('pointerup', function (e) {
    if (!pointer.down) return;
    pointer.down = 0;
    const held = performance.now() - pointer.downAt;
    org.feeding = false;
    // A tap plants or sends light; a hold has already fed the network.
    if (held < 260 && inNet()) {
      org.click(e.clientX, e.clientY);
      if (reduceMotion) { for (let i = 0; i < 400; i++) org.update(); org.render(); }
    }
  });
  window.addEventListener('pointercancel', function () { pointer.down = 0; org.feeding = false; });

  // ---- Loop ---------------------------------------------------------------------------------

  let lens = 0;
  const drift = [0, 0];
  function loop(now) {
    tickTurn(now);
    if (!document.hidden) {
      if (view.world === 'net' && !view.busy && !openSheet && !reduceMotion) {
        if (pointer.down && now - pointer.downAt > 260) {
          org.feeding = true;
          org.setPointer(pointer.x, pointer.y);
        }
        org.update();
        org.render();
      }
      const showAscii = ascii && (view.world === 'cowboy' || turn.start);
      if (showAscii) {
        lens += ((openSheet ? 0 : pointer.on) - lens) * 0.15;
        const W = window.innerWidth, H = window.innerHeight;
        pointer.lx += ((pointer.on ? (0.5 - pointer.x / W) * 0.07 : 0) - pointer.lx) * 0.04;
        pointer.ly += ((pointer.on ? (0.5 - pointer.y / H) * 0.045 : 0) - pointer.ly) * 0.04;
        drift[0] += ((pointer.on ? pointer.x / W - 0.5 : 0) - drift[0]) * 0.06;
        drift[1] += ((pointer.on ? pointer.y / H - 0.5 : 0) - drift[1]) * 0.06;
        ascii.look = [pointer.lx, pointer.ly];
        ascii.drift = drift;
        ascii.mouse = [pointer.x, pointer.y, lens > 0.5 ? 1 : 0];
        ascii.draw(reduceMotion ? 3 : now / 1000);
      }
    }
    requestAnimationFrame(loop);
  }

  function start() {
    if (ascii) { ascii.resize(window.innerWidth, window.innerHeight); ascii.t = 1; }
    if (view.world === 'net') freshField();
    if (reduceMotion && view.world === 'net') { for (let i = 0; i < 600; i++) org.update(); org.render(); }
    requestAnimationFrame(placeCalm);
  }

  let lastW = 0, lastH = 0, rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (Math.abs(window.innerWidth - lastW) < 40 && Math.abs(window.innerHeight - lastH) < 120) return;
      lastW = window.innerWidth; lastH = window.innerHeight;
      start();
    }, 250);
  });

  // Wait for both typefaces before drawing.
  let started = false;
  function go() {
    if (started) return;
    started = true;
    lastW = window.innerWidth; lastH = window.innerHeight;
    org.setup([], null);
    start();
    requestAnimationFrame(loop);
  }
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('700 100px "Unbounded"'),
      document.fonts.load('500 20px "Martian Mono"')
    ]).then(go, go);
    setTimeout(go, 3000);
  } else {
    go();
  }
})();
