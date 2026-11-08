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
    // Each project is its own world. `view` is where the camera sits around the black hole.
    projects: [
      { title: 'Twin Paradox', meta: 'Experience, 2026', link: 'https://claude.ai/artifact/N3rya4kPj5kA7Ky8Pkypf4',
        summary: 'A first-person journey to a black hole, ray traced live in the browser. Hold at the edge of the horizon and seven years pass at home for every hour on board.',
        view: { dist: 9.5, incl: 2.4, phi: 0.85, lean: -0.02 } },
      { title: 'Project Two',   meta: 'Positioning, 2025', summary: 'One or two sentences on what this was and why it mattered.',
        view: { dist: 17, incl: 6, phi: -0.5, lean: 0.05 } },
      { title: 'Project Three', meta: 'Campaign, 2025',    summary: 'One or two sentences on what this was and why it mattered.',
        view: { dist: 14, incl: 11, phi: 1.6, lean: 0.04 } },
      { title: 'Project Four',  meta: 'Story, 2024',       summary: 'One or two sentences on what this was and why it mattered.',
        view: { dist: 21, incl: 3.5, phi: 2.6, lean: 0.06 } },
      { title: 'Project Five',  meta: 'Research, 2024',    summary: 'One or two sentences on what this was and why it mattered.',
        view: { dist: 12, incl: 15, phi: -1.4, lean: 0.02 } }
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
  // Project pages: a world in characters. The black hole, and the rider from the photograph.
  // ====================================================================================

  let ascii = null;
  try {
    ascii = new window.Ascii($('#ascii'), { mono: '"Martian Mono", ui-monospace, monospace', accent: [0.435, 0.753, 1] });
  } catch (e) {
    ascii = null;
  }

  const RIDER_SRC = 'assets/rider.png';
  const RIDER_AR = 220 / 198;
  const riderImg = new Image();
  riderImg.onload = function () { if (ascii) ascii.setRider(riderImg); };
  riderImg.src = RIDER_SRC;

  // The rider gallops along the bottom toward the cursor, or wherever he likes when it's still,
  // leaving two lines of tracks in the snow that slowly fill back in.
  const trail = document.createElement('canvas');
  const tctx = trail.getContext('2d');
  const rider = { x: 0, v: 0, target: 0, phase: 0, flip: 0, hooves: null, idle: 0, bob: 0 };

  function riderReset() {
    trail.width = window.innerWidth;
    trail.height = window.innerHeight;
    rider.x = window.innerWidth * 0.8;
    rider.v = 0;
    rider.target = window.innerWidth * 0.3;
    rider.hooves = null;
  }

  function riderStep(moving) {
    const W = window.innerWidth, H = window.innerHeight;
    const rh = H * (W < 700 ? 0.16 : 0.27), rw = rh * RIDER_AR;
    const baseY = H - Math.max(72, H * 0.1);
    if (moving) {
      const chasing = pointer.on && performance.now() - pointer.moved < 2500;
      if (chasing) rider.target = Math.min(W - rw * 0.5, Math.max(rw * 0.5, pointer.x));
      else if (Math.abs(rider.target - rider.x) < 24 && ++rider.idle > 120) {
        rider.idle = 0;
        rider.target = W * (0.12 + Math.random() * 0.76);
      }
      const want = Math.max(-2.8, Math.min(2.8, (rider.target - rider.x) * 0.02));
      rider.v += (want - rider.v) * 0.04;
      rider.x += rider.v;
      if (rider.v < -0.15) rider.flip = 0; else if (rider.v > 0.15) rider.flip = 1;
      const pace = Math.min(1, Math.abs(rider.v) / 1.6);
      rider.phase += Math.abs(rider.v) * 0.09;
      rider.bob = Math.abs(Math.sin(rider.phase)) * rh * 0.05 * pace;

      tctx.globalCompositeOperation = 'destination-out';
      tctx.fillStyle = 'rgba(0,0,0,0.004)';
      tctx.fillRect(0, 0, W, H);
      tctx.globalCompositeOperation = 'source-over';
      const s = rider.flip ? -1 : 1; // 1 when facing left, as in the photograph
      const front = rider.x - s * rw * 0.36, back = rider.x + s * rw * 0.2;
      const w1 = Math.sin(rider.phase * 0.7) * 2, w2 = Math.sin(rider.phase * 0.7 + 1.7) * 2;
      if (pace > 0.15 && rider.hooves) {
        tctx.strokeStyle = 'rgba(230,238,248,0.85)';
        tctx.lineWidth = 1.5;
        tctx.beginPath();
        tctx.moveTo(rider.hooves[0], baseY + 2 + rider.hooves[2]); tctx.lineTo(front, baseY + 2 + w1);
        tctx.moveTo(rider.hooves[1], baseY + 8 + rider.hooves[3]); tctx.lineTo(back, baseY + 8 + w2);
        tctx.stroke();
      }
      rider.hooves = [front, back, w1, w2];
    }
    ascii.riderRect = [(rider.x - rw / 2) / W, (baseY - rh - rider.bob) / H, (rider.x + rw / 2) / W, (baseY - rider.bob) / H];
    ascii.riderFlip = rider.flip;
  }

  // ---- Moving between the front page and a project ----------------------------------

  const view = { project: -1, t: 0, from: 0, to: 0, start: 0, dur: 1, done: null, camFrom: null, camTo: null };
  const projectEl = $('#project');
  const snap = document.createElement('canvas');

  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }

  function animate(to, cam, dur, done) {
    view.camFrom = ascii ? Object.assign({}, ascii.cam) : null;
    view.camTo = cam;
    view.from = view.t; view.to = to;
    view.start = performance.now();
    view.dur = reduceMotion ? 1 : dur;
    view.done = done || null;
  }

  function tween(now) {
    if (!view.start) return;
    const k = Math.min(1, (now - view.start) / view.dur), e = ease(k);
    view.t = view.from + (view.to - view.from) * e;
    if (ascii) {
      ascii.t = view.t;
      const a = view.camFrom, b = view.camTo, c = ascii.cam;
      if (b) {
        c.dist = Math.exp(Math.log(a.dist) + (Math.log(b.dist) - Math.log(a.dist)) * e);
        c.incl = a.incl + (b.incl - a.incl) * e;
        c.phi = a.phi + (b.phi - a.phi) * e;
        c.lean = a.lean + (b.lean - a.lean) * e;
      }
    }
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
    const p = ME.projects[i];
    const already = view.project >= 0;
    view.project = i;
    projectEl.hidden = false;
    body.classList.add('is-project');
    if (!ascii) { fill(i, 0); return; }
    if (already) {
      // From one world to the next: the camera flies to the new view.
      fill(i, 200);
      animate(1, p.view, 1800);
    } else {
      snapshotHome();
      riderReset();
      ascii.cam = Object.assign({}, p.view, { dist: p.view.dist * 1.8 });
      ascii.t = 0;
      body.classList.add('in-world');
      fill(i, 700);
      animate(1, p.view, 1700, function () { $('#p-back').focus({ preventScroll: true }); });
    }
    requestAnimationFrame(placeCalm);
  }

  function leave() {
    if (view.project < 0) return;
    body.classList.remove('is-project');
    if (!ascii) { projectEl.hidden = true; view.project = -1; return; }
    const back = Object.assign({}, ascii.cam, { dist: ascii.cam.dist * 1.8 });
    animate(0, back, 1300, function () {
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
  function loop(now) {
    tween(now);
    const inWorld = body.classList.contains('in-world');
    // The front page rests while a project or a sheet covers it.
    if (!inWorld && !reduceMotion && !document.hidden && !openSheet) {
      org.update();
      org.render();
    }
    if (inWorld && ascii && !document.hidden) {
      riderStep(!reduceMotion && !openSheet);
      lens += ((openSheet ? 0 : pointer.on) - lens) * 0.15;
      const W = window.innerWidth, H = window.innerHeight;
      pointer.lx += ((pointer.on ? (0.5 - pointer.x / W) * 0.07 : 0) - pointer.lx) * 0.04;
      pointer.ly += ((pointer.on ? (0.5 - pointer.y / H) * 0.045 : 0) - pointer.ly) * 0.04;
      ascii.look = [pointer.lx, pointer.ly];
      ascii.mouse = [pointer.x, pointer.y, lens > 0.5 ? 1 : 0];
      ascii.draw(reduceMotion ? 3 : now / 1000, [trail]);
    }
    requestAnimationFrame(loop);
  }

  function start() {
    org.setup(nameLines(), LAYOUT);
    layoutDom();
    if (ascii) ascii.resize(window.innerWidth, window.innerHeight);
    riderReset();
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
