(function () {
  'use strict';

  // ---- Everything personal lives here ----------------------------------------
  const ME = {
    name: 'YOUR NAME',
    role: 'Job Title',
    place: 'City',
    timeZone: 'America/New_York',
    email: 'hello@yourname.com',
    links: [
      { label: 'LinkedIn', href: '#' },
      { label: 'Instagram', href: '#' },
      { label: 'Read.cv', href: '#' }
    ],
    projects: [
      { title: 'Project One',   type: 'Type', year: '2026', role: 'Role', summary: 'One or two sentences on what this was and why it mattered to you.' },
      { title: 'Project Two',   type: 'Type', year: '2026', role: 'Role', summary: 'One or two sentences on what this was and why it mattered to you.' },
      { title: 'Project Three', type: 'Type', year: '2025', role: 'Role', summary: 'One or two sentences on what this was and why it mattered to you.' },
      { title: 'Project Four',  type: 'Type', year: '2025', role: 'Role', summary: 'One or two sentences on what this was and why it mattered to you.' },
      { title: 'Project Five',  type: 'Type', year: '2024', role: 'Role', summary: 'One or two sentences on what this was and why it mattered to you.' },
      { title: 'Project Six',   type: 'Type', year: '2024', role: 'Role', summary: 'One or two sentences on what this was and why it mattered to you.' },
      { title: 'Project Seven', type: 'Type', year: '2023', role: 'Role', summary: 'One or two sentences on what this was and why it mattered to you.' }
    ]
  };

  // Where each project waits in the dark (fractions of the screen).
  const LAYOUT = {
    landscape: [[0.12, 0.17], [0.42, 0.11], [0.84, 0.15], [0.92, 0.66], [0.74, 0.85], [0.33, 0.86], [0.07, 0.6]],
    portrait:  [[0.18, 0.13], [0.72, 0.09], [0.88, 0.22], [0.14, 0.78], [0.84, 0.74], [0.3, 0.92], [0.72, 0.92]]
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = function (s) { return document.querySelector(s); };

  document.querySelectorAll('[data-name]').forEach(function (n) { n.textContent = ME.name; });
  document.querySelectorAll('[data-role]').forEach(function (n) { n.textContent = ME.role; });
  document.querySelectorAll('[data-place]').forEach(function (n) { n.textContent = ME.place; });
  document.title = ME.name + ' — ' + ME.role;

  // ---- Memory: which projects this visitor has already reached ------------------
  let found = [];
  try { found = JSON.parse(localStorage.getItem('tl-found') || '[]').filter(function (i) { return i < ME.projects.length; }); } catch (e) {}
  function remember() { try { localStorage.setItem('tl-found', JSON.stringify(found)); } catch (e) {} }

  // ---- Organism ----------------------------------------------------------------
  const role = $('#role');
  const org = new window.Organism($('#base'), $('#over'), {
    family: '"Archivo", sans-serif',
    onNameDone: function () {
      role.classList.add('is-in');
      org.queue = found.slice();
    },
    onConnect: function (i) {
      if (found.indexOf(i) < 0) { found.push(i); remember(); }
      sporeEls[i].classList.add('is-found');
      indexButtons[i].classList.add('is-found');
      updateCount();
    }
  });

  function nameLines() {
    const words = ME.name.split(/\s+/);
    return window.innerWidth < 700 && words.length > 1 ? words : [ME.name];
  }

  // ---- Spores (project hit areas + labels) ------------------------------------
  const sporeWrap = $('#spores');
  const sporeEls = ME.projects.map(function (p, i) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'spore';
    b.setAttribute('aria-label', p.title);
    b.innerHTML = '<span class="spore__label">' + p.title + '<small>' + p.type + ', ' + p.year + '</small></span>';
    b.addEventListener('mouseenter', function () { org.hover = i; });
    b.addEventListener('mouseleave', function () { org.hover = -1; });
    b.addEventListener('focus', function () { org.hover = i; });
    b.addEventListener('blur', function () { org.hover = -1; });
    b.addEventListener('click', function () {
      if (org.spores[i].found) openProject(i);
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

  function start() {
    org.setup(nameLines(), LAYOUT);
    layoutDom();
    if (reduceMotion) {
      org.queue = found.slice();
      org.settle(false);
      role.classList.add('is-in');
    }
  }

  // ---- Index, contact, project sheets ----------------------------------------
  const list = $('#index-list');
  const indexButtons = ME.projects.map(function (p, i) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = '<span class="t">' + p.title + '</span><span class="k">' + p.type + '</span><span class="y">' + p.year + '</span>';
    b.addEventListener('click', function () {
      if (!org.spores[i].found) org.target = i;
      openProject(i);
    });
    li.appendChild(b);
    list.appendChild(li);
    return b;
  });
  function updateCount() {
    $('#count').textContent = found.length + '/' + ME.projects.length;
  }
  updateCount();
  found.forEach(function (i) { indexButtons[i].classList.add('is-found'); });

  $('#mail').textContent = ME.email;
  $('#mail').href = 'mailto:' + ME.email;
  $('#links').innerHTML = ME.links.map(function (l) {
    return '<li><a href="' + l.href + '" target="_blank" rel="noopener">' + l.label + '</a></li>';
  }).join('');

  let openSheet = null, lastFocus = null;
  function show(id) {
    if (openSheet) openSheet.hidden = true;
    else lastFocus = document.activeElement;
    openSheet = document.getElementById(id);
    openSheet.hidden = false;
    openSheet.scrollTop = 0;
    openSheet.querySelector('[data-close]').focus();
  }
  function hide() {
    if (!openSheet) return;
    openSheet.hidden = true;
    openSheet = null;
    if (lastFocus) lastFocus.focus();
  }
  document.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', hide); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  $('#open-index').addEventListener('click', function () { show('sheet-index'); });
  $('#open-contact').addEventListener('click', function () { show('sheet-contact'); });

  let current = 0;
  function openProject(i) {
    current = i;
    const p = ME.projects[i];
    $('#p-title').textContent = p.title;
    $('#p-type').textContent = p.type;
    $('#p-year').textContent = p.year;
    $('#p-role').textContent = p.role;
    $('#p-summary').textContent = p.summary;
    $('#p-next').textContent = 'Next: ' + ME.projects[(i + 1) % ME.projects.length].title;
    show('sheet-project');
  }
  $('#p-next').addEventListener('click', function () {
    const n = (current + 1) % ME.projects.length;
    if (!org.spores[n].found) org.target = n;
    openProject(n);
  });

  // ---- The visitor -------------------------------------------------------------
  window.addEventListener('pointermove', function (e) {
    if (!openSheet) org.setPointer(e.clientX, e.clientY);
  });
  window.addEventListener('pointerdown', function (e) {
    if (!openSheet) org.setPointer(e.clientX, e.clientY);
  });

  // ---- Clock: the time where you are -----------------------------------------------
  const clock = $('#clock');
  let fmt;
  try { fmt = new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit', timeZone: ME.timeZone }); } catch (e) { fmt = null; }
  function tick() { if (fmt) clock.textContent = fmt.format(new Date()); }
  tick();
  setInterval(tick, 15000);

  // ---- Loop --------------------------------------------------------------------
  function loop() {
    if (!reduceMotion && !document.hidden) {
      org.update();
      org.render();
    }
    requestAnimationFrame(loop);
  }

  let lastW = 0, rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (Math.abs(window.innerWidth - lastW) < 40 && Math.abs(window.innerHeight - org.h) < 120) return;
      lastW = window.innerWidth;
      start();
    }, 250);
  });

  // Wait for the typeface so the name grows in the right letterforms.
  let started = false;
  function go() {
    if (started) return;
    started = true;
    lastW = window.innerWidth;
    start();
    requestAnimationFrame(loop);
  }
  if (document.fonts && document.fonts.load) {
    document.fonts.load('900 100px "Archivo"').then(go, go);
    setTimeout(go, 2500);
  } else {
    go();
  }
})();
