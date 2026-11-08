/*
 * Hyphae: a branching–annihilating random walk (BARW).
 *
 * Each growing tip is a persistent random walker:
 *   θ ← θ + σ·ξ,  ξ ~ N(0,1)
 *   x ← x + ℓ·(cos θ, sin θ)
 * With probability p per step a tip branches (new tip at ±0.55–1.15 rad).
 * When a tip runs into existing mycelium it fuses (anastomosis) and stops.
 *
 * Nothing else is programmed in, yet the colony advances as a travelling wave:
 * tips at the front keep branching into empty space, while tips behind the
 * front keep meeting hyphae and fusing, which holds the density steady.
 * That is the mechanism reported for arbuscular mycorrhizal fungi in
 * Oyarte Gálvez et al., Nature 639 (2025), and in branching tissues by
 * Hannezo et al., Cell 171 (2017).
 */
(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const SEG = 6; // x1, y1, x2, y2, normalized age, colormap index

  function gauss() {
    let u = 0;
    while (u === 0) u = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random());
  }

  function Hyphae(canvas, theme, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.theme = theme;
    this.o = Object.assign({
      step: 1.6,        // ℓ, px per substep
      substeps: 2,      // substeps per animation frame
      sigma: 0.085,     // σ, angular noise per step (persistence)
      branchP: 0.022,   // p, branching probability per step
      branchMin: 0.55,
      branchMax: 1.15,
      grace: 9,         // steps a new tip ignores collisions (to leave its parent)
      cell: 4,          // collision grid resolution, px
      sporeP: 0.0022,   // chance per step to drop a spore
      tropism: 0.06,    // κ, turning rate toward the pointer
      tropismR: 240     // R, pointer influence radius, px
    }, opts || {});
    this.pointer = null;
    this.resize();
  }

  Hyphae.prototype.resize = function () {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const area = this.w * this.h;
    this.maxTips = Math.round(Math.min(900, Math.max(220, area / 1400)));
    this.maxSegs = Math.round(Math.min(240000, Math.max(60000, area / 5)));
    // Time scale used to colour hyphae by age: roughly one crossing of the screen.
    this.T = (Math.hypot(this.w, this.h) / this.o.step) * 0.9;
    this.reset();
  };

  Hyphae.prototype.reset = function () {
    const c = this.o.cell;
    this.gw = Math.ceil(this.w / c) + 1;
    this.gh = Math.ceil(this.h / c) + 1;
    this.grid = new Int32Array(this.gw * this.gh).fill(-1);
    this.filled = 0;
    this.tips = [];
    this.nextId = 0;
    this.time = 0;
    this.segs = new Float32Array(this.maxSegs * SEG);
    this.nSeg = 0;
    this.marks = [];
    this.fusions = 0;
    this.colonies = 0;
    this.paint();
  };

  Hyphae.prototype.seed = function (x, y, n, dir, spread) {
    const col = { t0: this.time, map: this.colonies++ % 2 };
    for (let i = 0; i < n; i++) {
      const a = dir === undefined
        ? (i / n) * TAU + Math.random() * 0.4
        : dir + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread) + gauss() * 0.05;
      this.tips.push({ x: x, y: y, a: a, id: this.nextId++, age: 0, col: col });
    }
  };

  Hyphae.prototype.update = function () {
    const o = this.o;
    const seg = this.segs;
    for (let s = 0; s < o.substeps; s++) {
      const tips = this.tips;
      if (!tips.length) return;
      this.time++;
      const born = [];
      for (let i = 0; i < tips.length; i++) {
        const tp = tips[i];

        // Chemotropism: tips bend toward the pointer, like hyphae toward root signals.
        if (this.pointer) {
          const dx = this.pointer.x - tp.x, dy = this.pointer.y - tp.y;
          const d2 = dx * dx + dy * dy, R = o.tropismR;
          if (d2 < R * R && d2 > 4) {
            const d = Math.sqrt(d2);
            let da = Math.atan2(dy, dx) - tp.a;
            da = Math.atan2(Math.sin(da), Math.cos(da));
            tp.a += o.tropism * da * (1 - d / R);
          }
        }

        tp.a += gauss() * o.sigma;
        const nx = tp.x + Math.cos(tp.a) * o.step;
        const ny = tp.y + Math.sin(tp.a) * o.step;
        if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h || this.nSeg >= this.maxSegs) {
          tp.dead = true;
          continue;
        }

        const k = this.nSeg++ * SEG;
        seg[k] = tp.x; seg[k + 1] = tp.y; seg[k + 2] = nx; seg[k + 3] = ny;
        seg[k + 4] = Math.min(1, (this.time - tp.col.t0) / this.T);
        seg[k + 5] = tp.col.map;
        tp.x = nx; tp.y = ny; tp.age++;

        const ci = ((ny / o.cell) | 0) * this.gw + ((nx / o.cell) | 0);
        const owner = this.grid[ci];
        if (owner === -1) {
          this.grid[ci] = tp.id;
          this.filled++;
        } else if (owner !== tp.id && tp.age > o.grace) {
          // Anastomosis: the tip fuses into existing mycelium, closing a loop.
          tp.dead = true;
          this.fusions++;
          this.marks.push({ kind: 'fusion', x: nx, y: ny });
          continue;
        }

        if (Math.random() < o.sporeP) {
          this.marks.push({
            kind: 'spore', x: nx, y: ny,
            r: 1.6 + Math.random() * 3.6,
            rot: Math.random() * Math.PI,
            blur: Math.random() < 0.38
          });
        }

        if (tips.length + born.length < this.maxTips && Math.random() < o.branchP) {
          const side = Math.random() < 0.5 ? -1 : 1;
          const ba = o.branchMin + Math.random() * (o.branchMax - o.branchMin);
          born.push({ x: nx, y: ny, a: tp.a + side * ba, id: this.nextId++, age: 0, col: tp.col });
          tp.a -= side * ba * 0.2;
        }
      }
      this.tips = tips.filter(function (t) { return !t.dead; }).concat(born);
    }
  };

  // Full repaint (theme change): background plus every stored segment and mark.
  Hyphae.prototype.paint = function () {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.theme.bg;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.restore();
    this.drawn = 0;
    this.marksDrawn = 0;
    this.draw();
  };

  // Incremental draw: only what grew since the last frame.
  Hyphae.prototype.draw = function () {
    const ctx = this.ctx, th = this.theme;
    ctx.save();
    ctx.globalCompositeOperation = th.blend;
    ctx.lineWidth = th.lineWidth || 0.9;
    ctx.lineCap = 'butt';

    const B = 24;
    const paths = {};
    const seg = this.segs;
    for (let i = this.drawn; i < this.nSeg; i++) {
      const k = i * SEG;
      const key = seg[k + 5] * B + Math.min(B - 1, Math.floor(seg[k + 4] * B));
      let p = paths[key];
      if (!p) p = paths[key] = new Path2D();
      p.moveTo(seg[k], seg[k + 1]);
      p.lineTo(seg[k + 2], seg[k + 3]);
    }
    const r0 = th.range[0], r1 = th.range[1];
    Object.keys(paths).forEach(function (key) {
      const m = Math.floor(key / B), b = key % B;
      ctx.strokeStyle = window.Colormap.css(th.maps[m], r0 + (r1 - r0) * ((b + 0.5) / B), th.alpha);
      ctx.stroke(paths[key]);
    });
    this.drawn = this.nSeg;

    for (let i = this.marksDrawn; i < this.marks.length; i++) drawMark(ctx, th, this.marks[i]);
    this.marksDrawn = this.marks.length;
    ctx.restore();
  };

  // Paint a translucent veil of background colour (used to dissolve a finished colony).
  Hyphae.prototype.fade = function (a) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a;
    ctx.fillStyle = this.theme.bg;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.restore();
  };

  Hyphae.prototype.coverage = function () {
    return this.filled / (this.gw * this.gh);
  };

  function drawMark(ctx, th, m) {
    if (m.kind === 'fusion') {
      ctx.fillStyle = th.fusion;
      ctx.fillRect(m.x - 0.9, m.y - 0.9, 1.8, 1.8);
      return;
    }
    if (th.spore === 'glow') {
      // Fluorescence: sharp bright spores plus out-of-focus blobs.
      const r = m.blur ? m.r * 2.4 : m.r;
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
      if (m.blur) {
        g.addColorStop(0, 'rgba(150,60,255,0.55)');
        g.addColorStop(0.5, 'rgba(110,30,230,0.25)');
        g.addColorStop(1, 'rgba(80,10,200,0)');
      } else {
        g.addColorStop(0, 'rgba(255,252,210,1)');
        g.addColorStop(0.45, 'rgba(255,214,60,0.95)');
        g.addColorStop(1, 'rgba(255,90,40,0)');
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(m.x, m.y, r, 0, TAU);
      ctx.fill();
    } else if (th.spore === 'cell') {
      // Brightfield stain: dark ellipsoid spores and a faint diffuse halo.
      if (m.blur) {
        const r = m.r * 3.2;
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
        g.addColorStop(0, 'rgba(150,25,55,0.32)');
        g.addColorStop(1, 'rgba(150,25,55,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(m.x, m.y, r, 0, TAU);
        ctx.fill();
        return;
      }
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, m.r * 1.2, m.r * 0.9, m.rot, 0, TAU);
      ctx.fillStyle = 'rgba(38,6,16,0.92)';
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = 'rgba(120,20,50,0.7)';
      ctx.stroke();
    }
  }

  window.Hyphae = Hyphae;
})();
