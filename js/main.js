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
      { title: 'Project One',   meta: 'Launch, 2026',      summary: 'One or two sentences on what this was and why it mattered.' },
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

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = function (s) { return document.querySelector(s); };

  document.querySelectorAll('[data-role]').forEach(function (n) { n.textContent = ME.role; });
  document.querySelectorAll('[data-place]').forEach(function (n) { n.textContent = ME.place; });
  document.querySelectorAll('[data-name]').forEach(function (n) { n.textContent = 'Xavier Ruiz'; });

  // Which projects this visitor has already reached.
  let found = [];
  try { found = JSON.parse(localStorage.getItem('xr-found') || '[]').filter(function (i) { return i < ME.projects.length; }); } catch (e) {}
  function remember() { try { localStorage.setItem('xr-found', JSON.stringify(found)); } catch (e) {} }

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

  // Sheets.
  const list = $('#index-list');
  const indexButtons = ME.projects.map(function (p, i) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = p.title;
    b.addEventListener('click', function () {
      if (!org.spores[i].found) org.target = i;
      openProject(i);
    });
    li.appendChild(b);
    list.appendChild(li);
    return b;
  });
  found.forEach(function (i) { indexButtons[i].classList.add('is-found'); });

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
    $('#p-meta').textContent = p.meta;
    $('#p-summary').textContent = p.summary;
    show('sheet-project');
  }
  $('#p-next').addEventListener('click', function () {
    const n = (current + 1) % ME.projects.length;
    if (!org.spores[n].found) org.target = n;
    openProject(n);
  });

  // The visitor.
  window.addEventListener('pointermove', function (e) {
    if (!openSheet) org.setPointer(e.clientX, e.clientY);
  });
  window.addEventListener('pointerdown', function (e) {
    if (openSheet || e.target.closest('button, a')) return;
    org.setPointer(e.clientX, e.clientY);
    org.touch(e.clientX, e.clientY);
  });

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
