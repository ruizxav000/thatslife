/*
 * The organism.
 *
 * One continuous mycelium. It germinates inside the letters of a name,
 * grows toward whoever is looking at it, and carries light back home
 * along the exact threads it grew.
 *
 * Growth is a branching–annihilating random walk: tips wander, branch,
 * and fuse when they touch existing threads. Every segment remembers its
 * parent, so any point in the network can trace its way back to the name.
 */
(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const CAP = 260000;   // max segments
  const CELL = 3;       // fusion grid, px
  const COARSE = 18;    // nearest-thread lookup grid, px
  const BUCK = 32;      // light-field lookup grid, px

  function gauss() {
    let u = 0;
    while (u === 0) u = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random());
  }
  function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  function Organism(base, over, opts) {
    this.glow = document.createElement('canvas');
    this.base = base;
    this.over = over;
    this.b = base.getContext('2d');
    this.o = over.getContext('2d');
    this.opts = opts || {};
    this.setPalette(this.opts.palette || window.PALETTES.fluor);
    this.sx1 = new Float32Array(CAP);
    this.sy1 = new Float32Array(CAP);
    this.sx2 = new Float32Array(CAP);
    this.sy2 = new Float32Array(CAP);
    this.spar = new Int32Array(CAP);
    this.stip = new Int32Array(CAP);
    this.scol = new Int32Array(CAP);   // which colony each thread belongs to
    this.sborn = new Int32Array(CAP);
    this.skind = new Uint8Array(CAP);
    this.pointer = null;
    this.avoid = null;      // [x0, y0, x1, y1]: an area growth stays out of
    this.pointerFrame = -1e9;
    this.target = -1;
    this.queue = [];
    this.hover = -1;
  }
  const P = Organism.prototype;

  P.setPalette = function (pal) {
    this.pal = pal;
    window.Colormap.define('live', pal.live);
  };

  P.setup = function (lines, sporeLayout) {
    this.lines = lines;
    this.sporeLayout = sporeLayout;
    this.resize();
  };

  P.resize = function () {
    const r = this.base.getBoundingClientRect();
    const dpr = Math.min(this.opts.maxDpr || 2, window.devicePixelRatio || 1);
    this.w = Math.max(1, Math.round(r.width));
    this.h = Math.max(1, Math.round(r.height));
    [this.base, this.over].forEach(function (c) {
      c.width = Math.round(this.w * dpr);
      c.height = Math.round(this.h * dpr);
      c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }, this);
    if (this.glow) {
      this.glow.width = Math.round(this.w / 2);
      this.glow.height = Math.round(this.h / 2);
    }
    this.reset();
  };

  P.reset = function () {
    this.frame = 0;
    this.nSeg = 0;
    this.drawn = 0;
    this.recent = 0;
    this.tips = [];
    this.pending = [];
    this.pulses = [];
    this.nextId = 1;
    this.nameDone = false;
    this.nameFill = 0;
    this.target = -1;
    this.gw = Math.ceil(this.w / CELL) + 1;
    this.gh = Math.ceil(this.h / CELL) + 1;
    this.grid = new Int32Array(this.gw * this.gh);
    this.cw = Math.ceil(this.w / COARSE) + 1;
    this.ch = Math.ceil(this.h / COARSE) + 1;
    this.coarse = new Int32Array(this.cw * this.ch);
    this.bw = Math.ceil(this.w / BUCK) + 1;
    this.bh = Math.ceil(this.h / BUCK) + 1;
    this.buckets = new Array(this.bw * this.bh);
    if (this.pal.bg === 'transparent') this.b.clearRect(0, 0, this.w, this.h);
    else { this.b.fillStyle = this.pal.bg; this.b.fillRect(0, 0, this.w, this.h); }
    this.seeds = [];
    this.flashes = [];
    this.met = new Set();
    this.colonies = 0;
    this.feeding = false;
    if (this.lines && this.lines.length) {
      this.buildMask();
      this.seedName();
    } else {
      // No name to grow: an open field for colonies.
      this.nameBox = { x0: this.w / 2, x1: this.w / 2, y0: this.h / 2, y1: this.h / 2, size: 0 };
      this.maskCanvas = null;
      this.nameDone = true;
    }
    this.placeSpores();
  };

  // ---- The name as a growth medium -------------------------------------------

  P.buildMask = function () {
    const W = this.w, H = this.h, lines = this.lines;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    const narrow = W < 700;
    const fam = this.opts.family || 'sans-serif';
    const weight = this.opts.weight || 900, stretch = this.opts.stretch || 'expanded';
    function setFont(px) {
      x.font = weight + ' ' + px + 'px ' + fam;
      if ('fontStretch' in x) x.fontStretch = stretch;
    }
    setFont(100);
    let wMax = 0;
    lines.forEach(function (l) { wMax = Math.max(wMax, x.measureText(l).width); });
    const lh = 0.9;
    const size = Math.min(
      ((W * (narrow ? 0.9 : 0.84)) / wMax) * 100,
      (H * (narrow ? 0.3 : 0.3)) / (lines.length * lh)
    );
    setFont(size);
    x.textAlign = 'center';
    x.textBaseline = 'alphabetic';
    const cap = x.measureText('H').actualBoundingBoxAscent || size * 0.72;
    const blockH = cap + (lines.length - 1) * size * lh;
    const cy = H * (narrow ? 0.44 : 0.46);
    const top = cy - blockH / 2;
    x.fillStyle = '#fff';
    let x0 = W, x1 = 0;
    lines.forEach(function (l, i) {
      x.fillText(l, W / 2, top + cap + i * size * lh);
      const lw = x.measureText(l).width;
      x0 = Math.min(x0, W / 2 - lw / 2);
      x1 = Math.max(x1, W / 2 + lw / 2);
    });
    this.nameBox = { x0: x0, x1: x1, y0: top, y1: top + blockH, size: size };

    const data = x.getImageData(0, 0, W, H).data;
    const mask = new Uint8Array(W * H);
    let count = 0;
    for (let i = 0; i < W * H; i++) {
      if (data[i * 4 + 3] > 140) { mask[i] = 1; count++; }
    }
    this.mask = mask;
    this.maskArea = count;

    // Tinted copy used as the faint body of the letters once grown.
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = this.pal.body;
    x.fillRect(0, 0, W, H);
    this.maskCanvas = c;
  };

  P.inMask = function (x, y) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    return this.mask[y * this.w + x] === 1;
  };

  // Seeds are laid on a jittered grid so every letter gets some. They
  // germinate from the centre of the name outward.
  P.seedName = function () {
    const nb = this.nameBox;
    const g = Math.max(12, nb.size * 0.15);
    const cx = (nb.x0 + nb.x1) / 2, cy = (nb.y0 + nb.y1) / 2;
    const reach = Math.hypot(nb.x1 - cx, nb.y1 - cy) || 1;
    const pending = [];
    for (let y = nb.y0 - nb.size * 0.1; y < nb.y1 + nb.size * 0.3; y += g) {
      for (let x = nb.x0; x < nb.x1; x += g) {
        const px = x + Math.random() * g, py = y + Math.random() * g;
        if (!this.inMask(px, py)) continue;
        const d = Math.hypot(px - cx, py - cy) / reach;
        pending.push({ x: px, y: py, at: 6 + Math.round(Math.pow(d, 0.85) * 130 + Math.random() * 10) });
      }
    }
    this.pending = pending;
  };

  // ---- Projects: dormant spores in the dark ------------------------------------

  P.placeSpores = function () {
    const portrait = this.h > this.w;
    const layout = this.sporeLayout ? (portrait ? this.sporeLayout.portrait : this.sporeLayout.landscape) : [];
    const old = this.spores || [];
    this.spores = layout.map(function (p, i) {
      return {
        x: p[0] * this.w, y: p[1] * this.h,
        found: false, seg: -1, path: null, rpath: null, dir: 0,
        nextPulse: 0, phase: Math.random() * TAU, bloom: 0,
        wasFound: old[i] ? old[i].found : false
      };
    }, this);
  };

  // ---- Simulation ----------------------------------------------------------

  P.setPointer = function (x, y) {
    this.pointer = { x: x, y: y };
    this.pointerFrame = this.frame;
  };

  P.attractor = function () {
    if (this.target >= 0) {
      const s = this.spores[this.target];
      if (!s.found) return { x: s.x, y: s.y, spore: this.target };
      this.target = -1;
    }
    if (this.pointer && this.frame - this.pointerFrame < 170) {
      return { x: this.pointer.x, y: this.pointer.y, spore: -1 };
    }
    return null;
  };

  P.update = function () {
    const f = ++this.frame;

    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      if (f < p.at) continue;
      // Skip seeds that already have threads around them.
      if (this.grid[((p.y / CELL) | 0) * this.gw + ((p.x / CELL) | 0)]) { this.pending.splice(i, 1); continue; }
      for (let k = 0; k < 2; k++) {
        this.tips.push({ x: p.x, y: p.y, a: Math.random() * TAU, id: this.nextId++, age: 0, last: -1, kind: 0, life: 1e9, tro: 0, col: 0 });
      }
      this.pending.splice(i, 1);
    }

    if (this.nameDone && this.target < 0 && this.queue.length && f - this.pointerFrame > 120) {
      const q = this.queue.shift();
      if (this.spores[q] && !this.spores[q].found) this.target = q;
    }

    this.att = this.attractor();
    if (f > 50 && this.att && f % (this.feeding ? 2 : 5) === 0) this.reach(this.att);
    if (this.nameDone && !this.att && f % 140 === 0) this.wander();

    const sub = this.nameDone ? 2 : 3;
    for (let s = 0; s < sub; s++) this.grow();

    if (!this.nameDone && !this.pending.length && f > 30) {
      let nameTips = 0;
      for (let i = 0; i < this.tips.length; i++) if (this.tips[i].kind === 0) nameTips++;
      if (nameTips === 0 || f > 700) {
        this.tips = this.tips.filter(function (t) { return t.kind !== 0; });
        this.nameDone = true;
        this.emerge();
        if (this.opts.onNameDone) this.opts.onNameDone();
      }
    }

    this.schedulePulses();
  };

  P.addSeg = function (tp, nx, ny) {
    const i = this.nSeg++;
    this.sx1[i] = tp.x; this.sy1[i] = tp.y;
    this.sx2[i] = nx; this.sy2[i] = ny;
    this.spar[i] = tp.last;
    this.stip[i] = tp.id;
    this.sborn[i] = this.frame;
    this.skind[i] = tp.kind;
    this.scol[i] = tp.col || 0;
    tp.last = i; tp.x = nx; tp.y = ny; tp.age++;
    this.coarse[((ny / COARSE) | 0) * this.cw + ((nx / COARSE) | 0)] = i + 1;
    const bi = ((ny / BUCK) | 0) * this.bw + ((nx / BUCK) | 0);
    (this.buckets[bi] || (this.buckets[bi] = [])).push(i);
    return i;
  };

  P.grow = function () {
    const tips = this.tips, born = [], att = this.att;
    let free = 0, colony = 0;
    for (let i = 0; i < tips.length; i++) {
      if (tips[i].kind === 1) free++;
      else if (tips[i].kind === 2) colony++;
    }

    for (let i = 0; i < tips.length; i++) {
      const tp = tips[i];
      const name = tp.kind === 0;
      const step = name ? 1.25 : 1.5;
      let a = tp.a + gauss() * (name ? 0.16 : 0.09);
      if (!name && tp.tro > 0 && att) {
        a += tp.tro * wrap(Math.atan2(att.y - tp.y, att.x - tp.x) - a);
      }
      let nx = tp.x + Math.cos(a) * step, ny = tp.y + Math.sin(a) * step;

      if (name && !this.inMask(nx, ny)) {
        let ok = false;
        for (let k = 1; k <= 8; k++) {
          const b = a + (k & 1 ? 1 : -1) * Math.ceil(k / 2) * 0.4;
          const qx = tp.x + Math.cos(b) * step, qy = tp.y + Math.sin(b) * step;
          if (this.inMask(qx, qy)) { a = b; nx = qx; ny = qy; ok = true; break; }
        }
        if (!ok) { tp.dead = true; continue; }
      }
      tp.a = a;
      if (nx < 1 || ny < 1 || nx >= this.w - 1 || ny >= this.h - 1 || this.nSeg >= CAP) { tp.dead = true; continue; }
      // Leave the words readable: growth stops at the edge of the text.
      const av = this.avoid;
      if (!name && av && nx > av[0] && nx < av[2] && ny > av[1] && ny < av[3]) { tp.dead = true; continue; }

      const si = this.addSeg(tp, nx, ny);
      const ci = ((ny / CELL) | 0) * this.gw + ((nx / CELL) | 0);
      const owner = this.grid[ci];
      if (owner === 0) {
        this.grid[ci] = si + 1;
      } else if (this.stip[owner - 1] !== tp.id && tp.age > 8) {
        tp.dead = true; // fused into the network
        const other = this.scol[owner - 1];
        if (tp.col && other && other !== tp.col) this.meet(si, owner - 1);
        continue;
      }

      if (!name) {
        if (--tp.life <= 0) { tp.dead = true; continue; }
        // A project opens only when it was clicked and the network reaches it.
        if (this.target >= 0) {
          const s = this.spores[this.target];
          const dx = s.x - nx, dy = s.y - ny;
          if (!s.found && dx * dx + dy * dy < 15 * 15) {
            this.connect(this.target, si);
            tp.tro = 0;
            tp.life = Math.min(tp.life, 30);
          }
        }
        if (att && tp.tro > 0) {
          const dx = att.x - nx, dy = att.y - ny;
          if (dx * dx + dy * dy < 14 * 14) { tp.tro = 0; tp.life = Math.min(tp.life, 34); }
        }
      }

      const p = name ? 0.05 : tp.kind === 2 ? 0.02 : tp.tro > 0 ? 0.007 : 0.016;
      const room = name ? tips.length + born.length < 1400
        : tp.kind === 2 ? colony + born.length < (this.feeding ? 700 : 500)
        : free + born.length < (this.feeding ? 160 : 60);
      if (room && Math.random() < p) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const ba = 0.5 + Math.random() * 0.65;
        born.push({
          x: nx, y: ny, a: a + side * ba, id: this.nextId++, age: 0, last: si, kind: tp.kind, col: tp.col,
          life: name ? 1e9 : tp.kind === 2 ? tp.life * (0.7 + Math.random() * 0.3) : Math.min(tp.life, 40 + Math.random() * 80),
          tro: tp.tro * 0.25
        });
        tp.a -= side * ba * 0.2;
      }
    }
    this.tips = tips.filter(function (t) { return !t.dead; }).concat(born);
  };

  P.nearestSeg = function (x, y) {
    const cx = (x / COARSE) | 0, cy = (y / COARSE) | 0;
    const R = Math.max(this.cw, this.ch);
    for (let r = 0; r <= R; r++) {
      let best = -1, bd = Infinity;
      for (let j = cy - r; j <= cy + r; j++) {
        if (j < 0 || j >= this.ch) continue;
        const edge = j === cy - r || j === cy + r;
        for (let i = cx - r; i <= cx + r; i += edge ? 1 : 2 * r || 1) {
          if (i < 0 || i >= this.cw) continue;
          const v = this.coarse[j * this.cw + i];
          if (!v) continue;
          const s = v - 1, dx = this.sx2[s] - x, dy = this.sy2[s] - y, d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = s; }
        }
      }
      if (best >= 0) return best;
    }
    return -1;
  };

  // Extend the network toward a point by sprouting from its nearest thread.
  P.reach = function (att) {
    let homing = 0, free = 0;
    for (let i = 0; i < this.tips.length; i++) {
      if (this.tips[i].kind === 1) free++;
      if (this.tips[i].tro > 0.05) homing++;
    }
    if (homing >= (this.feeding ? 16 : 6) || free > (this.feeding ? 240 : 80)) return;
    const s = this.nearestSeg(att.x, att.y);
    if (s < 0) return;
    const x = this.sx2[s], y = this.sy2[s];
    const d = Math.hypot(att.x - x, att.y - y);
    if (d < 18) return;
    this.tips.push({
      x: x, y: y, a: Math.atan2(att.y - y, att.x - x) + gauss() * 0.35, id: this.nextId++, age: 0, last: s, kind: 1, col: this.scol[s],
      life: (d / 1.5) * 1.6 + 60, tro: (this.feeding ? 0.12 : 0.08) + Math.random() * 0.05
    });
  };

  // Slow, unprompted exploration when nobody is interacting.
  P.wander = function () {
    if (!this.nSeg || this.nSeg > CAP * 0.85 || this.tips.length > 20) return;
    const s = (Math.random() * this.nSeg) | 0;
    this.tips.push({ x: this.sx2[s], y: this.sy2[s], a: Math.random() * TAU, id: this.nextId++, age: 0, last: s, kind: 1, col: this.scol[s], life: 50 + Math.random() * 90, tro: 0 });
  };

  // A few threads leave the letters once the name is grown.
  P.emerge = function () {
    if (!this.nSeg) return;
    const nb = this.nameBox, cx = (nb.x0 + nb.x1) / 2, cy = (nb.y0 + nb.y1) / 2;
    for (let k = 0; k < 7; k++) {
      const s = (Math.random() * this.nSeg) | 0;
      const x = this.sx2[s], y = this.sy2[s];
      this.tips.push({ x: x, y: y, a: Math.atan2(y - cy, x - cx) + gauss() * 0.4, id: this.nextId++, age: 0, last: s, kind: 1, col: this.scol[s], life: 90 + Math.random() * 120, tro: 0 });
    }
  };

  // ---- Light travelling through the network -----------------------------------

  P.touch = function (x, y) {
    const s = this.nearestSeg(x, y);
    if (s < 0) return;
    this.pulses.push({ path: this.trace(s), t: 0, speed: 3.6, a: 1 });
    for (let k = 0; k < 4; k++) {
      this.tips.push({ x: this.sx2[s], y: this.sy2[s], a: Math.random() * TAU, id: this.nextId++, age: 0, last: s, kind: 1, col: this.scol[s], life: 40 + Math.random() * 60, tro: 0 });
    }
  };

  // Plant a spore: a new colony germinates and spreads out from it.
  P.plant = function (x, y) {
    const col = ++this.colonies;
    this.seeds.push({ x: x, y: y, col: col, born: this.frame });
    const n = 7, a0 = Math.random() * TAU;
    for (let k = 0; k < n; k++) {
      this.tips.push({ x: x, y: y, a: a0 + (k / n) * TAU + gauss() * 0.15, id: this.nextId++, age: 0, last: -1, kind: 2, col: col,
        life: 520 + Math.random() * 420, tro: 0 });
    }
  };

  // A click: on a thread, light runs home along it; on open ground, a spore is planted.
  P.click = function (x, y) {
    const s = this.nearestSeg(x, y);
    if (s >= 0 && Math.hypot(this.sx2[s] - x, this.sy2[s] - y) < 26) { this.touch(x, y); return 'light'; }
    this.plant(x, y);
    return 'plant';
  };

  // Two colonies fuse: light leaves the meeting point for both spores.
  P.meet = function (a, b) {
    const ca = this.scol[a], cb = this.scol[b];
    const key = Math.min(ca, cb) + ':' + Math.max(ca, cb);
    const first = !this.met.has(key);
    if (!first && Math.random() > 0.03) return;
    if (this.pulses.length > 34) return;
    this.met.add(key);
    this.pulses.push({ path: this.trace(a), t: 0, speed: 3.2, a: 1 });
    this.pulses.push({ path: this.trace(b), t: 0, speed: 3.2, a: 1 });
    if (first) this.flashes.push({ x: this.sx2[a], y: this.sy2[a], f: this.frame });
    if (this.opts.onMeet) this.opts.onMeet(ca, cb, first);
  };

  P.trace = function (i) {
    const out = [];
    while (i >= 0 && out.length < 8000) { out.push(i); i = this.spar[i]; }
    return out;
  };

  P.connect = function (k, si) {
    const s = this.spores[k];
    s.found = true;
    s.seg = si;
    s.path = this.trace(si);           // spore → name
    s.rpath = s.path.slice().reverse(); // name → spore
    s.nextPulse = this.frame + 200 + Math.random() * 100;
    this.pulses.push({ path: s.path, t: 0, speed: 3.2, a: 1 });
    if (this.target === k) this.target = -1;
    if (this.opts.onConnect) this.opts.onConnect(k, !s.wasFound);
  };

  P.schedulePulses = function () {
    const f = this.frame;
    for (let k = 0; k < this.spores.length; k++) {
      const s = this.spores[k];
      if (!s.found || f < s.nextPulse) continue;
      s.dir ^= 1; // traffic runs both ways
      this.pulses.push({ path: s.dir ? s.rpath : s.path, t: 0, speed: 3, a: 0.85 });
      s.nextPulse = f + 260 + Math.random() * 140;
    }
    if (this.nameDone && f % 55 === 0 && this.nSeg && this.pulses.length < 18) {
      const path = this.trace((Math.random() * this.nSeg) | 0).reverse();
      if (path.length > 40) this.pulses.push({ path: path, t: 0, speed: 2.4, a: 0.45 });
    }
  };

  // ---- Rendering ---------------------------------------------------------------

  P.render = function () {
    const b = this.b, o = this.o, W = this.w, H = this.h, f = this.frame;

    // Permanent layer: every thread, drawn once.
    if (this.drawn < this.nSeg) {
      const pn = new Path2D(), pf = new Path2D();
      for (let i = this.drawn; i < this.nSeg; i++) {
        const p = this.skind[i] === 0 ? pn : pf;
        p.moveTo(this.sx1[i], this.sy1[i]);
        p.lineTo(this.sx2[i], this.sy2[i]);
      }
      b.save();
      b.globalCompositeOperation = this.pal.dark ? 'lighter' : 'source-over';
      b.lineWidth = this.pal.lineWidth || 0.9;
      b.strokeStyle = this.pal.name;
      b.stroke(pn);
      b.strokeStyle = this.pal.free;
      b.stroke(pf);
      b.restore();
      this.drawn = this.nSeg;
    }
    if (this.nameDone && this.nameFill < 1 && this.maskCanvas) {
      this.nameFill += 1 / 60;
      b.save();
      b.globalAlpha = this.pal.bodyAlpha || 0.0009;
      b.drawImage(this.maskCanvas, 0, 0, W, H);
      b.restore();
    }

    // Fluorescent bloom: a half-size, blurred copy of the threads,
    // refreshed every few frames and laid back over everything.
    const pal = this.pal;
    if (pal.glow && f % 12 === 0) {
      const gx = this.glow.getContext('2d');
      gx.clearRect(0, 0, this.glow.width, this.glow.height);
      gx.filter = 'blur(2px)';
      gx.drawImage(this.base, 0, 0, this.glow.width, this.glow.height);
      gx.filter = 'none';
    }

    // Live layer.
    o.clearRect(0, 0, W, H);
    o.save();
    o.globalCompositeOperation = pal.dark ? 'lighter' : 'source-over';
    if (pal.glow) {
      o.globalAlpha = pal.glow;
      o.drawImage(this.glow, 0, 0, W, H);
      o.globalAlpha = 1;
    }

    // Fresh growth glows hot, then cools into the permanent violet.
    const AGE = 48;
    while (this.recent < this.nSeg && this.sborn[this.recent] < f - AGE) this.recent++;
    if (this.recent < this.nSeg) {
      const NB = 6, paths = [];
      for (let i = this.recent; i < this.nSeg; i++) {
        const k = Math.min(NB - 1, (((f - this.sborn[i]) / AGE) * NB) | 0);
        const p = paths[k] || (paths[k] = new Path2D());
        p.moveTo(this.sx1[i], this.sy1[i]);
        p.lineTo(this.sx2[i], this.sy2[i]);
      }
      o.lineWidth = 1.1;
      for (let k = 0; k < NB; k++) {
        if (!paths[k]) continue;
        const t = 1 - k / NB;
        o.strokeStyle = window.Colormap.css('live', t, 0.12 + 0.8 * t * t);
        o.stroke(paths[k]);
      }
    }

    // Pulses.
    for (let n = this.pulses.length - 1; n >= 0; n--) {
      const pu = this.pulses[n];
      pu.t += pu.speed;
      const k = pu.t | 0, path = pu.path;
      if (k >= path.length) { this.pulses.splice(n, 1); continue; }
      const tail = Math.max(0, k - 44);
      for (let c = 0; c < 4; c++) {
        const s0 = tail + (((k - tail) * c) / 4) | 0, s1 = tail + (((k - tail) * (c + 1)) / 4) | 0;
        if (s1 <= s0) continue;
        o.beginPath();
        o.moveTo(this.sx2[path[s0]], this.sy2[path[s0]]);
        for (let j = s0 + 1; j <= s1; j++) o.lineTo(this.sx2[path[j]], this.sy2[path[j]]);
        o.lineWidth = 0.8 + c * 0.55;
        o.strokeStyle = rgba(pal.trail, (0.12 + c * 0.24) * pu.a);
        o.stroke();
      }
      const hx = this.sx2[path[k]], hy = this.sy2[path[k]];
      const g = o.createRadialGradient(hx, hy, 0, hx, hy, 9);
      g.addColorStop(0, rgba(pal.head, pu.a));
      g.addColorStop(1, rgba(pal.trail, 0));
      o.fillStyle = g;
      o.beginPath(); o.arc(hx, hy, 9, 0, TAU); o.fill();
    }

    // Spores.
    for (let k = 0; k < this.spores.length; k++) {
      const s = this.spores[k];
      const breath = 0.5 + 0.5 * Math.sin(f * 0.028 + s.phase);
      const hot = k === this.hover;
      if (s.found) s.bloom = Math.min(1, s.bloom + 0.02);
      const r = s.found ? 20 + 10 * s.bloom + (hot ? 10 : 0) : 9 + 5 * breath + (hot ? 6 : 0);
      const a = s.found ? 0.32 + 0.12 * breath : 0.09 + 0.1 * breath + (hot ? 0.1 : 0);
      const g = o.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      g.addColorStop(0, rgba(pal.spore, a));
      g.addColorStop(1, rgba(pal.spore, 0));
      o.fillStyle = g;
      o.beginPath(); o.arc(s.x, s.y, r, 0, TAU); o.fill();
      o.fillStyle = s.found ? rgba(pal.head, 0.95) : rgba(pal.spore, 0.35 + 0.3 * breath);
      o.beginPath(); o.arc(s.x, s.y, s.found ? 2.6 + s.bloom : 1.4, 0, TAU); o.fill();
    }

    // Planted spores, and the moment two colonies meet.
    for (let k = 0; k < this.seeds.length; k++) {
      const sd = this.seeds[k];
      const age = f - sd.born, grow = Math.min(1, age / 40);
      const breath = 0.5 + 0.5 * Math.sin(f * 0.04 + sd.col);
      const g = o.createRadialGradient(sd.x, sd.y, 0, sd.x, sd.y, 16 * grow + 4);
      g.addColorStop(0, rgba(pal.spore, 0.22 + 0.12 * breath));
      g.addColorStop(1, rgba(pal.spore, 0));
      o.fillStyle = g;
      o.beginPath(); o.arc(sd.x, sd.y, 16 * grow + 4, 0, TAU); o.fill();
      o.fillStyle = rgba(pal.head, 0.9);
      o.beginPath(); o.arc(sd.x, sd.y, 2.2 * grow + 0.6, 0, TAU); o.fill();
      if (age < 60) {
        o.strokeStyle = rgba(pal.spore, 0.6 * (1 - age / 60));
        o.lineWidth = 1;
        o.beginPath(); o.arc(sd.x, sd.y, 6 + age * 0.9, 0, TAU); o.stroke();
      }
    }
    for (let k = this.flashes.length - 1; k >= 0; k--) {
      const fl = this.flashes[k], age = f - fl.f;
      if (age > 70) { this.flashes.splice(k, 1); continue; }
      const t = age / 70;
      o.strokeStyle = rgba(pal.spore, 0.75 * (1 - t));
      o.lineWidth = 1.5 * (1 - t) + 0.5;
      o.beginPath(); o.arc(fl.x, fl.y, 4 + t * 46, 0, TAU); o.stroke();
      const g = o.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, 14);
      g.addColorStop(0, rgba(pal.head, 0.8 * (1 - t)));
      g.addColorStop(1, rgba(pal.spore, 0));
      o.fillStyle = g;
      o.beginPath(); o.arc(fl.x, fl.y, 14, 0, TAU); o.fill();
    }

    // The visitor carries light: threads near the cursor glow as it passes.
    if (this.pointer && f - this.pointerFrame < 170) {
      const fade = 1 - (f - this.pointerFrame) / 170;
      const px = this.pointer.x, py = this.pointer.y, R = 120;
      const b0 = Math.max(0, ((px - R) / BUCK) | 0), b1 = Math.min(this.bw - 1, ((px + R) / BUCK) | 0);
      const c0 = Math.max(0, ((py - R) / BUCK) | 0), c1 = Math.min(this.bh - 1, ((py + R) / BUCK) | 0);
      const NB = 5, paths = [];
      for (let j = c0; j <= c1; j++) {
        for (let i = b0; i <= b1; i++) {
          const list = this.buckets[j * this.bw + i];
          if (!list) continue;
          for (let n = 0; n < list.length; n++) {
            const e = list[n];
            const mx = (this.sx1[e] + this.sx2[e]) / 2 - px, my = (this.sy1[e] + this.sy2[e]) / 2 - py;
            const d2 = mx * mx + my * my;
            if (d2 >= R * R) continue;
            const k = Math.min(NB - 1, ((Math.sqrt(d2) / R) * NB) | 0);
            const p = paths[k] || (paths[k] = new Path2D());
            p.moveTo(this.sx1[e], this.sy1[e]);
            p.lineTo(this.sx2[e], this.sy2[e]);
          }
        }
      }
      o.lineWidth = 1.1;
      for (let k = 0; k < NB; k++) {
        if (!paths[k]) continue;
        const t = 1 - k / NB;
        o.strokeStyle = window.Colormap.css('live', 0.1 + 0.9 * t, (0.08 + 0.75 * t * t) * fade);
        o.stroke(paths[k]);
      }
      const g = o.createRadialGradient(px, py, 0, px, py, 16);
      g.addColorStop(0, rgba(pal.head, 0.55 * fade));
      g.addColorStop(1, rgba(pal.trail, 0));
      o.fillStyle = g;
      o.beginPath(); o.arc(px, py, 16, 0, TAU); o.fill();
    }
    o.restore();
  };

  // For reduced motion: grow everything at once and hold still.
  P.settle = function (all) {
    let guard = 0;
    while (!this.nameDone && guard++ < 2000) this.update();
    const want = all ? this.spores.map(function (_, i) { return i; }) : this.queue.splice(0);
    want.forEach(function (k) {
      this.target = k;
      let g = 0;
      while (!this.spores[k].found && g++ < 3000) this.update();
    }, this);
    this.target = -1;
    this.tips = [];
    this.pulses = [];
    this.frame += 200;
    this.render();
  };

  window.Organism = Organism;
})();
