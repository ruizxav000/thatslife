(function () {
  'use strict';

  const ME = {
    name: 'XAVIER RUIZ',
    role: 'Product Marketing @ ServiceNow',
    place: 'Boston, MA',
    links: [
      { label: 'LinkedIn', href: '#' },
      { label: 'Email', href: '#' }
    ],
    projects: [
      { title: 'Space Cowboy',  meta: 'ASCII, 2026',       summary: 'One or two sentences on what this was and why it mattered.' },
      { title: 'Project Two',   meta: 'Positioning, 2025', summary: 'One or two sentences on what this was and why it mattered.' },
      { title: 'Project Three', meta: 'Campaign, 2025',    summary: 'One or two sentences on what this was and why it mattered.' },
      { title: 'Project Four',  meta: 'Story, 2024',       summary: 'One or two sentences on what this was and why it mattered.' },
      { title: 'Project Five',  meta: 'Research, 2024',    summary: 'One or two sentences on what this was and why it mattered.' }
    ]
  };

  // Where each project waits in the dark (fractions of the screen).
  const LAYOUT = {
    landscape: [[0.13, 0.18], [0.5, 0.12], [0.86, 0.2], [0.8, 0.82], [0.22, 0.8]],
    portrait:  [[0.2, 0.13], [0.78, 0.12], [0.16, 0.8], [0.82, 0.76], [0.5, 0.92]]
  };

  // Front page colour: one of the palettes in js/palettes.js.
  const PALETTE = window.PALETTES[window.PALETTE_OVERRIDE || 'ink'];
  (function applyPalette(p) {
    const r = document.documentElement.style;
    r.setProperty('--bg', p.bg);
    r.setProperty('--fg', p.css.fg);
    r.setProperty('--dim', p.css.dim);
    r.setProperty('--gold', p.css.accent);
    r.colorScheme = p.dark ? 'dark' : 'light';
  })(PALETTE);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = function (s) { return document.querySelector(s); };
  const body = document.body;

  document.querySelectorAll('[data-role]').forEach(function (n) { n.textContent = ME.role; });
  document.querySelectorAll('[data-place]').forEach(function (n) { n.textContent = ME.place; });
  document.querySelectorAll('[data-name]').forEach(function (n) { n.textContent = 'Xavier Ruiz'; });

  // ====================================================================================
  // Front page: the network that grows the name.
  // ====================================================================================

  const role = $('#role');
  const base = $('#base'), over = $('#over');
  const org = new window.Organism(base, over, {
    family: '"Unbounded", sans-serif',
    palette: PALETTE,
    weight: 900,
    stretch: 'normal',
    onNameDone: function () { role.classList.add('is-in'); },
    onConnect: function (i) {
      sporeEls[i].classList.add('is-found');
      indexButtons[i].classList.add('is-found');
    }
  });

  function nameLines() {
    const words = ME.name.split(/\s+/);
    return window.innerWidth < 700 && words.length > 1 ? words : [ME.name];
  }

  // Projects: invisible until the network reaches them.
  const sporeWrap = $('#spores');
  const sporeEls = ME.projects.map(function (p, i) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'spore';
    b.setAttribute('aria-label', p.title);
    b.innerHTML = '<span class="spore__label">' + p.title + '</span>';
    b.addEventListener('mouseenter', function () { org.hover = i; });
    b.addEventListener('mouseleave', function () { org.hover = -1; });
    b.addEventListener('focus', function () { org.hover = i; });
    b.addEventListener('blur', function () { org.hover = -1; });
    b.addEventListener('click', function () {
      if (org.spores[i].found) enter(i);
      else { org.target = i; if (reduceMotion) { org.queue = [i]; org.settle(false); } }
    });
    sporeWrap.appendChild(b);
    return b;
  });

  function layoutDom() {
    const nb = org.nameBox;
    role.style.top = (nb.y1 + Math.max(18, nb.size * 0.22)) + 'px';
    org.spores.forEach(function (s, i) {
      const el = sporeEls[i];
      el.style.left = s.x + 'px';
      el.style.top = s.y + 'px';
      el.classList.toggle('spore--left', s.x > org.w * 0.6);
      el.classList.toggle('is-found', s.found);
    });
  }

  // ====================================================================================
  // Project pages: Space Cowboy. The photograph redrawn in characters, under a black hole.
  // ====================================================================================

  let ascii = null;
  try {
    ascii = new window.Ascii($('#ascii'), { mono: '"Martian Mono", ui-monospace, monospace', accent: [0.435, 0.753, 1] });
  } catch (e) {
    ascii = null;
  }

  const SCENE_SRC = 'assets/scene.jpg';
  const SKY_SRC = 'assets/sky.png';
  const RIDER_SRC = 'assets/rider.png';
  const scene = new Image(), skyMask = new Image(), riderImg = new Image();
  scene.onload = function () { if (ascii) ascii.setPhoto(scene); };
  skyMask.onload = function () { if (ascii) ascii.setSky(skyMask); };
  riderImg.onload = function () { if (ascii) ascii.setRider(riderImg); };
  scene.src = SCENE_SRC;
  skyMask.src = SKY_SRC;
  riderImg.src = RIDER_SRC;

  // ---- The rider at a gallop ---------------------------------------------------------
  // Everything here is in photo space: u across the photograph (0..1, beyond it mirrored),
  // v down it. Where he stands in the photograph, and where his hooves are on the sprite:
  const SPRITE = { u: 0.455, v: 0.503, w: 0.285, h: 0.1886, pivot: [0.57, 0.92], front: [0.12, 0.96], hind: [0.57, 0.92] };
  const GROUND = SPRITE.v + SPRITE.h;
  const START = SPRITE.u + SPRITE.w / 2;
  const CRUISE = 0.0042;               // photo widths per frame at a steady gallop

  // Tracks persist and slowly fill in; kicked-up snow is redrawn every frame.
  const FX_W = 750, FX_H = 338;
  const fx = document.createElement('canvas'), tracks = document.createElement('canvas');
  fx.width = tracks.width = FX_W; fx.height = tracks.height = FX_H;
  const fxc = fx.getContext('2d'), trc = tracks.getContext('2d');
  const toFx = function (u, v) { return [(u + 1) / 3 * FX_W, v * FX_H]; };

  const rider = { u: START, vel: 0, dir: -1, phase: 0, wait: 0, stride: 0, spray: [] };

  function riderReset() {
    rider.u = START; rider.vel = 0; rider.dir = -1; rider.phase = 0; rider.wait = 0;
    rider.stride = 0; rider.spray = [];
    trc.clearRect(0, 0, FX_W, FX_H);
  }

  function hoof(rect, at, flip) {
    return [rect[0] + (flip ? 1 - at[0] : at[0]) * rect[2], rect[1] + at[1] * rect[3]];
  }

  function riderStep(moving) {
    const L = ascii.layout(), W = window.innerWidth;
    const uL = -L.x / L.w, uR = (W - L.x) / L.w, half = SPRITE.w / 2;
    if (moving) {
      const ridgeY = L.y + L.h * 0.4;
      const chasing = pointer.on && performance.now() - pointer.moved < 2500 && pointer.y > ridgeY;
      let want;
      if (chasing) {
        const target = (pointer.x - L.x) / L.w;
        want = Math.max(-CRUISE * 1.6, Math.min(CRUISE * 1.6, (target - rider.u) * 0.03));
        if (Math.abs(target - rider.u) < 0.02) want = 0;
      } else {
        want = rider.dir * CRUISE;
        // Off one side of the screen: a pause, then he comes back in from the other.
        if ((rider.dir < 0 && rider.u < uL - half) || (rider.dir > 0 && rider.u > uR + half)) {
          if (++rider.wait > 70) { rider.u = rider.dir < 0 ? uR + half : uL - half; rider.wait = 0; }
          want = 0;
        }
      }
      rider.vel += (want - rider.vel) * 0.05;
      rider.u += rider.vel;
      if (Math.abs(rider.vel) > CRUISE * 0.1) rider.dir = rider.vel < 0 ? -1 : 1;
      rider.phase += Math.abs(rider.vel) * 52;
    }
    const pace = Math.min(1, Math.abs(rider.vel) / CRUISE);
    const flip = rider.dir > 0 ? 1 : 0;
    const bob = Math.abs(Math.sin(rider.phase)) * 0.012 * pace;
    const rect = [rider.u - half, GROUND - SPRITE.h - bob, SPRITE.w, SPRITE.h];
    const r = ascii.rider;
    r.rect = rect;
    r.pivot = [flip ? 1 - SPRITE.pivot[0] : SPRITE.pivot[0], SPRITE.pivot[1]];
    r.rot = Math.sin(rider.phase) * 0.075 * pace * (flip ? -1 : 1);
    r.flip = flip;
    r.shadow = [rider.u - 0.1, GROUND + 0.004, SPRITE.w * 0.55, 0.011 + 0.003 * pace];

    if (!moving) return;
    // Hoofprints: each time a stride lands, both pairs of hooves press into the snow.
    trc.globalCompositeOperation = 'destination-out';
    trc.fillStyle = 'rgba(0,0,0,0.0035)';
    trc.fillRect(0, 0, FX_W, FX_H);
    trc.globalCompositeOperation = 'source-over';
    const fh = hoof(rect, SPRITE.front, flip), hh = hoof(rect, SPRITE.hind, flip);
    const stride = Math.floor(rider.phase / Math.PI);
    if (pace > 0.2 && stride !== rider.stride) {
      trc.fillStyle = 'rgba(255,0,0,0.95)';
      [[fh[0], GROUND - 0.005], [hh[0], GROUND + 0.004]].forEach(function (h) {
        const at = toFx(h[0] + (Math.random() - 0.5) * 0.004, h[1]);
        trc.beginPath();
        trc.ellipse(at[0], at[1], 1.6, 0.9, 0, 0, Math.PI * 2);
        trc.fill();
      });
    }
    rider.stride = stride;

    // Snow kicked up behind him on every stride.
    if (pace > 0.3) {
      const n = 2 + (Math.random() * 2 | 0);
      for (let i = 0; i < n; i++) {
        const at = toFx(hh[0], GROUND);
        rider.spray.push({ x: at[0], y: at[1], vx: -rider.dir * (0.4 + Math.random() * 1.6) * pace, vy: -(0.6 + Math.random() * 1.6) * pace, life: 30 + Math.random() * 24 });
      }
    }
    fxc.clearRect(0, 0, FX_W, FX_H);
    fxc.globalCompositeOperation = 'lighter';
    fxc.drawImage(tracks, 0, 0);
    for (let i = rider.spray.length - 1; i >= 0; i--) {
      const s = rider.spray[i];
      s.x += s.vx; s.y += s.vy; s.vy += 0.07; s.life--;
      if (s.life <= 0 || s.y > toFx(0, GROUND + 0.01)[1]) { rider.spray.splice(i, 1); continue; }
      fxc.fillStyle = 'rgba(0,255,0,' + Math.min(1, s.life / 25).toFixed(2) + ')';
      fxc.fillRect(s.x - 0.8, s.y - 0.8, 1.6, 1.6);
    }
    fxc.globalCompositeOperation = 'source-over';
    ascii.setFx(fx);
  }

  // ---- Moving between the front page and a project ----------------------------------

  const view = { project: -1, t: 0, from: 0, to: 0, start: 0, dur: 1, done: null };
  const projectEl = $('#project');
  const snap = document.createElement('canvas');

  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }

  function animate(to, dur, done) {
    view.from = view.t; view.to = to;
    view.start = performance.now();
    view.dur = reduceMotion ? 1 : dur;
    view.done = done || null;
  }

  function tween(now) {
    if (!view.start) return;
    const k = Math.min(1, (now - view.start) / view.dur), e = ease(k);
    view.t = view.from + (view.to - view.from) * e;
    if (ascii) ascii.t = view.t;
    if (k >= 1) {
      view.start = 0;
      const d = view.done;
      view.done = null;
      if (d) d();
    }
  }

  // A still of the front page: the moment the page starts to turn.
  function snapshotHome() {
    snap.width = base.width;
    snap.height = base.height;
    const x = snap.getContext('2d');
    x.drawImage(base, 0, 0);
    x.drawImage(over, 0, 0);
    ascii.setHome(snap);
  }

  function placeCalm() {
    if (!ascii) return;
    const r = $('#p-text').getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
    ascii.calm = [(r.left - 30) / W, (r.top - 30) / H, (r.right + 30) / W, (r.bottom + 30) / H];
  }

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

  function fill(i, delay) {
    const p = ME.projects[i];
    decode($('#p-meta'), p.meta, delay);
    decode($('#p-title'), p.title, delay + 130);
    decode($('#p-summary'), p.summary, delay + 400);
    const link = $('#p-link');
    if (p.link) { link.hidden = false; link.href = p.link; } else link.hidden = true;
  }

  function enter(i) {
    hideSheet(true);
    const already = view.project >= 0;
    view.project = i;
    projectEl.hidden = false;
    body.classList.add('is-project');
    if (!ascii || already) { fill(i, already ? 0 : 0); requestAnimationFrame(placeCalm); return; }
    snapshotHome();
    riderReset();
    ascii.t = 0;
    body.classList.add('in-world');
    fill(i, 700);
    animate(1, 1700, function () { $('#p-back').focus({ preventScroll: true }); });
    requestAnimationFrame(placeCalm);
  }

  function leave() {
    if (view.project < 0) return;
    body.classList.remove('is-project');
    if (!ascii) { projectEl.hidden = true; view.project = -1; return; }
    animate(0, 1300, function () {
      projectEl.hidden = true;
      view.project = -1;
      body.classList.remove('in-world');
    });
  }

  $('#p-back').addEventListener('click', leave);
  $('#p-next').addEventListener('click', function () { enter((view.project + 1) % ME.projects.length); });

  // ---- Work and contact ---------------------------------------------------------------

  const list = $('#index-list');
  const indexButtons = ME.projects.map(function (p, i) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = p.title;
    b.addEventListener('click', function () {
      if (!org.spores[i].found) org.target = i;
      enter(i);
    });
    li.appendChild(b);
    list.appendChild(li);
    return b;
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

  // ---- The visitor ----------------------------------------------------------------------

  const pointer = { x: -999, y: -999, on: 0, lx: 0, ly: 0, moved: 0 };
  let touchTimer = 0;
  window.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = 1; pointer.moved = performance.now();
    if (!openSheet && view.project < 0) org.setPointer(e.clientX, e.clientY);
  });
  document.documentElement.addEventListener('pointerleave', function () { pointer.on = 0; });
  window.addEventListener('pointerdown', function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = 1; pointer.moved = performance.now();
    if (e.pointerType !== 'mouse') {
      clearTimeout(touchTimer);
      touchTimer = setTimeout(function () { pointer.on = 0; }, 1400);
    }
    if (openSheet || view.project >= 0 || e.target.closest('button, a')) return;
    org.setPointer(e.clientX, e.clientY);
    org.touch(e.clientX, e.clientY);
  });

  // ---- Loop -------------------------------------------------------------------------------

  let lens = 0;
  const drift = [0, 0];
  function loop(now) {
    tween(now);
    const inWorld = body.classList.contains('in-world');
    // The front page rests while a project or a sheet covers it.
    if (!inWorld && !reduceMotion && !document.hidden && !openSheet) {
      org.update();
      org.render();
    }
    if (inWorld && ascii && !document.hidden) {
      riderStep(!reduceMotion && !openSheet && view.t > 0.3);
      lens += ((openSheet ? 0 : pointer.on) - lens) * 0.15;
      const W = window.innerWidth, H = window.innerHeight;
      pointer.lx += ((pointer.on ? (0.5 - pointer.x / W) * 0.07 : 0) - pointer.lx) * 0.04;
      pointer.ly += ((pointer.on ? (0.5 - pointer.y / H) * 0.045 : 0) - pointer.ly) * 0.04;
      ascii.look = [pointer.lx, pointer.ly];
      drift[0] += ((pointer.on ? pointer.x / W - 0.5 : 0) - drift[0]) * 0.06;
      drift[1] += ((pointer.on ? pointer.y / H - 0.5 : 0) - drift[1]) * 0.06;
      ascii.drift = drift;
      ascii.mouse = [pointer.x, pointer.y, lens > 0.5 ? 1 : 0];
      ascii.draw(reduceMotion ? 3 : now / 1000);
    }
    requestAnimationFrame(loop);
  }

  function start() {
    org.setup(nameLines(), LAYOUT);
    layoutDom();
    if (ascii) ascii.resize(window.innerWidth, window.innerHeight);
    if (view.project >= 0) placeCalm();
    if (reduceMotion) {
      org.settle(false);
      role.classList.add('is-in');
    }
  }

  let lastW = 0, lastH = 0, rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (Math.abs(window.innerWidth - lastW) < 40 && Math.abs(window.innerHeight - lastH) < 120) return;
      lastW = window.innerWidth; lastH = window.innerHeight;
      start();
      if (view.project >= 0 && ascii) snapshotHome();
    }, 250);
  });

  // Wait for both typefaces: the name grows in Unbounded, the characters are Martian Mono.
  let started = false;
  function go() {
    if (started) return;
    started = true;
    lastW = window.innerWidth; lastH = window.innerHeight;
    start();
    requestAnimationFrame(loop);
  }
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('900 100px "Unbounded"'),
      document.fonts.load('500 20px "Martian Mono"')
    ]).then(go, go);
    setTimeout(go, 3000);
  } else {
    go();
  }
})();
