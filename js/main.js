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
    // field: 'blackhole' flies into the black hole; 'image' draws the project image in characters.
    projects: [
      { title: 'Twin Paradox', meta: 'Experience, 2026', field: 'blackhole', link: 'https://claude.ai/artifact/N3rya4kPj5kA7Ky8Pkypf4',
        summary: 'A first-person journey to a black hole, ray traced live in the browser. Hold at the edge of the horizon and seven years pass at home for every hour on board.' },
      { title: 'Project Two',   meta: 'Positioning, 2025', field: 'image', summary: 'One or two sentences on what this was and why it mattered.' },
      { title: 'Project Three', meta: 'Campaign, 2025',    field: 'image', summary: 'One or two sentences on what this was and why it mattered.' },
      { title: 'Project Four',  meta: 'Story, 2024',       field: 'image', summary: 'One or two sentences on what this was and why it mattered.' },
      { title: 'Project Five',  meta: 'Research, 2024',    field: 'image', summary: 'One or two sentences on what this was and why it mattered.' }
    ]
  };

  const LAYOUT = {
    landscape: [[0.13, 0.18], [0.5, 0.1], [0.86, 0.2], [0.8, 0.84], [0.2, 0.82]],
    portrait:  [[0.2, 0.13], [0.78, 0.12], [0.16, 0.8], [0.82, 0.76], [0.5, 0.92]]
  };

  const PHOTO_SRC = 'assets/ride.jpg';
  const PHOTO_AR = 360 / 487;

  const PALETTE = window.PALETTES.ascii;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = function (s) { return document.querySelector(s); };
  const body = document.body;

  document.querySelectorAll('[data-role]').forEach(function (n) { n.textContent = ME.role; });
  document.querySelectorAll('[data-place]').forEach(function (n) { n.textContent = ME.place; });
  document.querySelectorAll('[data-name]').forEach(function (n) { n.textContent = 'Xavier Ruiz'; });

  // ---- The network that grows the name ----------------------------------------
  const role = $('#role');
  const base = $('#base'), over = $('#over');
  const org = new window.Organism(base, over, {
    family: '"Unbounded", sans-serif', weight: 900, stretch: 'normal',
    palette: PALETTE, maxDpr: 1,
    onNameDone: function () { role.classList.add('is-in'); },
    onConnect: function (i) { sporeEls[i].classList.add('is-found'); }
  });

  // ---- Characters ------------------------------------------------------------------
  let ascii = null;
  try {
    ascii = new window.Ascii($('#ascii'), { mono: '"Martian Mono", ui-monospace, monospace', accent: [0.435, 0.753, 1] });
  } catch (e) {
    body.classList.add('no-gl');
  }
  const photo = new Image();
  photo.onload = function () { if (ascii) ascii.setImage(photo); };
  photo.src = PHOTO_SRC;

  function nameLines() {
    const words = ME.name.split(/\s+/);
    return window.innerWidth < 700 && words.length > 1 ? words : [ME.name];
  }

  // ---- Projects in the dark ------------------------------------------------------------
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

  function homeCalm() {
    const nb = org.nameBox, W = org.w, H = org.h;
    return [(nb.x0 - 24) / W, (nb.y0 - 24) / H, (nb.x1 + 24) / W, (nb.y1 + nb.size * 0.5 + 24) / H];
  }

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

  function start() {
    org.setup(nameLines(), LAYOUT);
    if (ascii) ascii.resize(window.innerWidth, window.innerHeight);
    layoutDom();
    if (view.project >= 0) placeProject(); else if (ascii) ascii.calm = homeCalm();
    if (reduceMotion) { org.settle(false); role.classList.add('is-in'); }
  }

  // ---- The page becomes the project ---------------------------------------------------
  const CAM_HOME = { dist: 17, incl: 6, phi: -0.5, lean: 0.05 };
  const CAM_NEAR = { dist: 9.5, incl: 2.4, phi: 0.85, lean: -0.02 };
  const view = { project: -1, t: 0, from: 0, to: 0, start: 0, dur: 1, done: null, camFrom: CAM_HOME, camTo: CAM_HOME };
  const projectEl = $('#project');

  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }

  function animate(to, cam, dur, done) {
    if (ascii) view.camFrom = Object.assign({}, ascii.cam);
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
      const a = view.camFrom, b = view.camTo, c = ascii.cam;
      c.dist = Math.exp(Math.log(a.dist) + (Math.log(b.dist) - Math.log(a.dist)) * e);
      c.incl = a.incl + (b.incl - a.incl) * e;
      c.phi = a.phi + (b.phi - a.phi) * e;
      c.lean = a.lean + (b.lean - a.lean) * e;
      ascii.t = view.t;
    }
    if (k >= 1) {
      view.start = 0;
      const d = view.done;
      view.done = null;
      if (d) d();
    }
  }

  function imageRect() {
    const W = window.innerWidth, H = window.innerHeight;
    let x0, y0, x1, y1;
    if (W < 700 || H > W) { x0 = 0.06 * W; y0 = 0.07 * H; x1 = 0.94 * W; y1 = 0.5 * H; }
    else { x0 = 0.48 * W; y0 = 0.09 * H; x1 = 0.95 * W; y1 = 0.91 * H; }
    let w = x1 - x0, h = y1 - y0;
    if (w / h > PHOTO_AR) { const nw = h * PHOTO_AR; x0 += (w - nw) / 2; w = nw; }
    else { const nh = w / PHOTO_AR; y0 += (h - nh) / 2; h = nh; }
    return [x0 / W, y0 / H, (x0 + w) / W, (y0 + h) / H];
  }

  function placeProject() {
    if (!ascii) return;
    const p = ME.projects[view.project];
    ascii.imgOn = p.field === 'image' ? 1 : 0;
    ascii.imgRect = imageRect();
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

  function fill(i) {
    const p = ME.projects[i];
    ['p-meta', 'p-title', 'p-summary'].forEach(function (id) { $('#' + id).dataset.text = ''; });
    decode($('#p-meta'), p.meta, 250);
    decode($('#p-title'), p.title, 380);
    decode($('#p-summary'), p.summary, 650);
    const link = $('#p-link');
    if (p.link) { link.hidden = false; link.href = p.link; } else link.hidden = true;
  }

  function enter(i) {
    hideSheet(true);
    const p = ME.projects[i];
    const go = function () {
      view.project = i;
      projectEl.hidden = false;
      body.classList.add('is-project');
      fill(i);
      placeProject();
      animate(1, p.field === 'blackhole' ? CAM_NEAR : CAM_HOME, 1500, function () { $('#p-back').focus({ preventScroll: true }); });
    };
    // From one project to another: scramble back to home first, then into the next.
    if (view.project >= 0 && view.project !== i) animate(0, CAM_HOME, 700, go);
    else go();
  }

  function leave() {
    if (view.project < 0) return;
    body.classList.remove('is-project');
    animate(0, CAM_HOME, 1300, function () {
      projectEl.hidden = true;
      view.project = -1;
      if (ascii) ascii.calm = homeCalm();
    });
  }

  $('#p-back').addEventListener('click', leave);
  $('#p-next').addEventListener('click', function () { enter((view.project + 1) % ME.projects.length); });

  // ---- Work and contact ----------------------------------------------------------------
  const list = $('#index-list');
  ME.projects.forEach(function (p, i) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = p.title;
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

  // ---- The visitor ------------------------------------------------------------------------
  const pointer = { x: -999, y: -999, on: 0, lx: 0, ly: 0 };
  let touchTimer = 0;
  window.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = 1;
    if (!openSheet && view.project < 0) org.setPointer(e.clientX, e.clientY);
  });
  document.documentElement.addEventListener('pointerleave', function () { pointer.on = 0; });
  window.addEventListener('pointerdown', function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = 1;
    if (e.pointerType !== 'mouse') {
      clearTimeout(touchTimer);
      touchTimer = setTimeout(function () { pointer.on = 0; }, 1400);
    }
    if (openSheet || view.project >= 0 || e.target.closest('button, a')) return;
    org.setPointer(e.clientX, e.clientY);
    org.touch(e.clientX, e.clientY);
  });

  // ---- Loop ---------------------------------------------------------------------------------
  let lens = 0;
  function loop(now) {
    tween(now);
    const home = view.t < 0.999 || view.project < 0;
    if (!reduceMotion && !document.hidden && home && !openSheet) {
      org.update();
      org.render();
    }
    if (ascii && !document.hidden) {
      lens += ((openSheet ? 0 : pointer.on) - lens) * 0.15;
      const W = window.innerWidth, H = window.innerHeight;
      pointer.lx += ((pointer.on ? (0.5 - pointer.x / W) * 0.07 : 0) - pointer.lx) * 0.04;
      pointer.ly += ((pointer.on ? (0.5 - pointer.y / H) * 0.045 : 0) - pointer.ly) * 0.04;
      ascii.look = [pointer.lx, pointer.ly];
      ascii.mouse = [pointer.x, pointer.y, lens > 0.5 ? 1 : 0];
      ascii.draw(reduceMotion ? 3 : now / 1000, [base, over]);
    } else if (!ascii && !reduceMotion && home && !openSheet) {
      // Without WebGL the network is shown as drawn.
    }
    requestAnimationFrame(loop);
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
