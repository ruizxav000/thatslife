/*
 * Adaptive transport network (Tero et al., Science 327, 439–442, 2010).
 * This is the model behind the slime mould that re-drew the Tokyo rail map.
 *
 * Start from a dense mesh of tubes. Each tube e = (i, j) has length L and
 * conductivity D. Every iteration, one food source pushes flux I₀ into the
 * network and another drains it. Pressures p follow Kirchhoff's law:
 *
 *   Σ_j (D_ij / L_ij)(p_i − p_j) = I_i
 *
 * Flux through each tube:  Q_ij = (D_ij / L_ij)(p_i − p_j)
 * Tubes adapt:             dD_ij/dt = f(|Q_ij|) − D_ij,   f(Q) = Q^γ / (1 + Q^γ)
 *
 * Tubes that carry flow thicken, idle tubes wither, and what remains is an
 * efficient yet fault-tolerant network linking the food sources (here: projects).
 * The pressure system is solved each step with Jacobi-preconditioned
 * conjugate gradients.
 */
(function () {
  'use strict';

  const TAU = Math.PI * 2;

  function Physarum(canvas, foods, theme, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.foods = foods;
    this.theme = theme;
    this.o = Object.assign({ gamma: 1.4, I0: 1.4, dt: 0.1, dMin: 1e-3, nParticles: 520 }, opts || {});
    this.hover = -1;
    this.focus = -1;
    this.onSelect = null;
    this.onHover = null;
    this.bindEvents();
    this.resize();
  }

  Physarum.prototype.resize = function () {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.build();
  };

  // Jittered hexagonal lattice of tubes: the plasmodium covering the dish.
  Physarum.prototype.build = function () {
    const W = this.w, H = this.h;
    const target = Math.max(300, Math.min(1400, (W * H) / 520));
    const s = Math.sqrt((W * H) / (target * 0.866));
    const rowH = s * 0.866, pad = s * 0.45;
    const cols = Math.max(2, Math.floor((W - 2 * pad - s / 2) / s) + 1);
    const rows = Math.max(2, Math.floor((H - 2 * pad) / rowH) + 1);
    const ox = (W - ((cols - 1) * s + s / 2)) / 2;
    const oy = (H - (rows - 1) * rowH) / 2;
    const n = rows * cols;
    const X = new Float64Array(n), Y = new Float64Array(n);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        X[i] = ox + c * s + (r & 1 ? s / 2 : 0) + (Math.random() - 0.5) * 0.36 * s;
        Y[i] = oy + r * rowH + (Math.random() - 0.5) * 0.36 * s;
      }
    }
    const A = [], B = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (c + 1 < cols) { A.push(i); B.push(i + 1); }
        if (r + 1 < rows) {
          const d0 = r & 1 ? c : c - 1, d1 = r & 1 ? c + 1 : c;
          if (d0 >= 0 && d0 < cols) { A.push(i); B.push((r + 1) * cols + d0); }
          if (d1 >= 0 && d1 < cols) { A.push(i); B.push((r + 1) * cols + d1); }
        }
      }
    }

    // Snap each food source (project) to its nearest lattice node.
    const fpad = Math.max(48, s * 1.2);
    const used = new Set();
    const portrait = H > W * 1.1;
    this.foodNode = this.foods.map(function (f) {
      const u = portrait ? f.y : f.x, v = portrait ? f.x : f.y;
      const fx = fpad + u * (W - 2 * fpad), fy = fpad + v * (H - 2 * fpad);
      let best = -1, bd = Infinity;
      for (let i = 0; i < n; i++) {
        if (used.has(i)) continue;
        const d = (X[i] - fx) * (X[i] - fx) + (Y[i] - fy) * (Y[i] - fy);
        if (d < bd) { bd = d; best = i; }
      }
      used.add(best);
      X[best] = fx; Y[best] = fy;
      return best;
    });

    const m = A.length;
    this.n = n; this.m = m; this.s = s;
    this.X = X; this.Y = Y;
    this.A = Int32Array.from(A); this.B = Int32Array.from(B);
    this.L = new Float64Array(m);
    for (let e = 0; e < m; e++) {
      this.L[e] = Math.hypot(X[this.A[e]] - X[this.B[e]], Y[this.A[e]] - Y[this.B[e]]) / s;
    }

    // Node → incident edges (CSR) for particle routing.
    const deg = new Int32Array(n + 1);
    for (let e = 0; e < m; e++) { deg[this.A[e] + 1]++; deg[this.B[e] + 1]++; }
    for (let i = 0; i < n; i++) deg[i + 1] += deg[i];
    const fill = deg.slice(0, n), adj = new Int32Array(2 * m);
    for (let e = 0; e < m; e++) { adj[fill[this.A[e]]++] = e; adj[fill[this.B[e]]++] = e; }
    this.adjStart = deg; this.adj = adj;

    this.G = new Float64Array(m);
    this.Q = new Float64Array(m);
    this.Qs = new Float64Array(m);
    this.p = new Float64Array(n);
    this.r = new Float64Array(n);
    this.z = new Float64Array(n);
    this.d = new Float64Array(n);
    this.q = new Float64Array(n);
    this.diag = new Float64Array(n);
    this.regrow();
  };

  Physarum.prototype.regrow = function () {
    this.D = new Float64Array(this.m);
    for (let e = 0; e < this.m; e++) this.D[e] = 0.16 + Math.random() * 0.08;
    this.Qs.fill(0);
    this.p.fill(0);
    this.dRef = 0.25;
    this.iter = 0;
    this.initParticles();
  };

  // y = K x, with K the weighted graph Laplacian.
  Physarum.prototype.mul = function (x, y) {
    const A = this.A, B = this.B, G = this.G;
    y.fill(0);
    for (let e = 0; e < this.m; e++) {
      const v = G[e] * (x[A[e]] - x[B[e]]);
      y[A[e]] += v;
      y[B[e]] -= v;
    }
  };

  function dot(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  // Solve Kirchhoff's equations with p_sink = 0, injecting I₀ at the source.
  Physarum.prototype.solve = function (src, sink) {
    const n = this.n, x = this.p, r = this.r, z = this.z, d = this.d, q = this.q, diag = this.diag;
    const A = this.A, B = this.B, G = this.G, I0 = this.o.I0;
    diag.fill(0);
    for (let e = 0; e < this.m; e++) { diag[A[e]] += G[e]; diag[B[e]] += G[e]; }
    x[sink] = 0;
    this.mul(x, q);
    for (let i = 0; i < n; i++) r[i] = (i === src ? I0 : 0) - q[i];
    r[sink] = 0;
    for (let i = 0; i < n; i++) { z[i] = r[i] / diag[i]; d[i] = z[i]; }
    let rz = dot(r, z);
    const tol = (1e-5 * I0) * (1e-5 * I0);
    for (let it = 0; it < 500; it++) {
      this.mul(d, q);
      q[sink] = 0;
      const alpha = rz / dot(d, q);
      for (let i = 0; i < n; i++) { x[i] += alpha * d[i]; r[i] -= alpha * q[i]; }
      if (dot(r, r) < tol) break;
      for (let i = 0; i < n; i++) z[i] = r[i] / diag[i];
      z[sink] = 0;
      const rzNew = dot(r, z);
      const beta = rzNew / rz;
      rz = rzNew;
      for (let i = 0; i < n; i++) d[i] = z[i] + beta * d[i];
    }
  };

  Physarum.prototype.step = function () {
    const F = this.foodNode, k = F.length;
    if (k < 2) return;
    const si = this.focus >= 0 && Math.random() < 0.55 ? this.focus : Math.floor(Math.random() * k);
    let ti = Math.floor(Math.random() * (k - 1));
    if (ti >= si) ti++;

    const D = this.D, G = this.G, L = this.L, A = this.A, B = this.B, p = this.p;
    for (let e = 0; e < this.m; e++) G[e] = D[e] / L[e];
    this.solve(F[si], F[ti]);

    const g = this.o.gamma, dt = this.o.dt, dMin = this.o.dMin;
    let maxD = 0;
    for (let e = 0; e < this.m; e++) {
      const Q = G[e] * (p[A[e]] - p[B[e]]);
      this.Q[e] = Q;
      this.Qs[e] = this.Qs[e] * 0.8 + Q * 0.2;
      const aq = Math.pow(Math.abs(Q), g);
      let De = D[e] + dt * (aq / (1 + aq) - D[e]);
      if (De < dMin) De = dMin;
      D[e] = De;
      if (De > maxD) maxD = De;
    }
    this.dRef += (Math.max(0.05, maxD) - this.dRef) * 0.08;
    this.iter++;
  };

  // ---- Cytoplasmic streaming: particles ride the flux --------------------

  Physarum.prototype.initParticles = function () {
    const N = this.o.nParticles;
    this.pe = new Int32Array(N);
    this.pu = new Float32Array(N);
    this.pl = new Int32Array(N);
    for (let i = 0; i < N; i++) this.spawn(i);
  };

  Physarum.prototype.spawn = function (i) {
    let e = 0;
    for (let t = 0; t < 40; t++) {
      e = Math.floor(Math.random() * this.m);
      if (this.D[e] > 0.35 * this.dRef) break;
    }
    this.pe[i] = e;
    this.pu[i] = Math.random();
    this.pl[i] = 0;
  };

  Physarum.prototype.moveParticles = function () {
    const A = this.A, B = this.B, Qs = this.Qs, L = this.L, s = this.s;
    for (let i = 0; i < this.pe.length; i++) {
      const e = this.pe[i];
      const v = Math.max(-2.6, Math.min(2.6, Qs[e] * 7));
      if (Math.abs(v) < 0.04 || this.D[e] < 0.08 * this.dRef) {
        if (++this.pl[i] > 80) this.spawn(i);
        continue;
      }
      this.pu[i] += v / (L[e] * s);
      if (this.pu[i] >= 1 || this.pu[i] <= 0) {
        const node = this.pu[i] >= 1 ? B[e] : A[e];
        let total = 0;
        for (let j = this.adjStart[node]; j < this.adjStart[node + 1]; j++) {
          const f = this.adj[j], out = A[f] === node ? Qs[f] : -Qs[f];
          if (out > 0) total += out;
        }
        if (total <= 1e-6) { this.spawn(i); continue; }
        let pick = Math.random() * total, next = -1;
        for (let j = this.adjStart[node]; j < this.adjStart[node + 1]; j++) {
          const f = this.adj[j], out = A[f] === node ? Qs[f] : -Qs[f];
          if (out > 0) { pick -= out; next = f; if (pick <= 0) break; }
        }
        this.pe[i] = next;
        this.pu[i] = A[next] === node ? 0 : 1;
      }
    }
  };

  // ---- Rendering ----------------------------------------------------------

  Physarum.prototype.draw = function (withParticles) {
    const ctx = this.ctx, th = this.theme, W = this.w, H = this.h;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = th.blend;
    ctx.lineCap = 'round';

    const NB = 20, paths = [];
    const X = this.X, Y = this.Y, A = this.A, B = this.B, D = this.D;
    for (let e = 0; e < this.m; e++) {
      const k = D[e] / this.dRef;
      if (k < 0.04) continue;
      const b = Math.min(NB - 1, Math.floor(Math.min(1, k) * NB));
      const p = paths[b] || (paths[b] = new Path2D());
      p.moveTo(X[A[e]], Y[A[e]]);
      p.lineTo(X[B[e]], Y[B[e]]);
    }
    const r0 = th.netRange[0], r1 = th.netRange[1];
    for (let b = 0; b < NB; b++) {
      if (!paths[b]) continue;
      const lvl = (b + 0.5) / NB;
      // Hagen–Poiseuille gives radius ∝ D^¼; we draw width ∝ √D so the hierarchy reads.
      ctx.lineWidth = 0.4 + 3.4 * Math.sqrt(lvl);
      ctx.strokeStyle = window.Colormap.css(th.net, r0 + (r1 - r0) * lvl, 0.12 + 0.88 * lvl);
      ctx.stroke(paths[b]);
    }

    if (withParticles) {
      ctx.fillStyle = th.particle;
      for (let i = 0; i < this.pe.length; i++) {
        const e = this.pe[i], u = this.pu[i];
        if (this.D[e] < 0.2 * this.dRef) continue;
        const x = X[A[e]] + (X[B[e]] - X[A[e]]) * u;
        const y = Y[A[e]] + (Y[B[e]] - Y[A[e]]) * u;
        ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    // Food sources = projects.
    ctx.font = '500 11px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle';
    for (let f = 0; f < this.foodNode.length; f++) {
      const i = this.foodNode[f], x = X[i], y = Y[i];
      const on = f === this.hover || f === this.focus;
      if (th.glow) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, on ? 34 : 24);
        g.addColorStop(0, th.glow);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, on ? 34 : 24, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = th.food;
      ctx.beginPath(); ctx.arc(x, y, on ? 6 : 4.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = th.food;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, on ? 14 : 10, 0, TAU); ctx.stroke();

      const label = this.foods[f].label;
      const tw = ctx.measureText(label).width;
      const right = x + 18 + tw < W - 8;
      const lx = right ? x + 18 : x - 18 - tw;
      ctx.fillStyle = th.labelBg;
      ctx.fillRect(lx - 4, y - 9, tw + 8, 18);
      ctx.fillStyle = on ? th.food : th.label;
      ctx.fillText(label, lx, y + 0.5);
    }
    ctx.restore();
  };

  Physarum.prototype.stats = function () {
    let active = 0, len = 0;
    for (let e = 0; e < this.m; e++) {
      if (this.D[e] / this.dRef > 0.25) { active++; len += this.L[e] * this.s; }
    }
    return { iter: this.iter, tubes: active, length: len };
  };

  Physarum.prototype.bindEvents = function () {
    const self = this, c = this.canvas;
    function local(ev) {
      const r = c.getBoundingClientRect();
      return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    }
    function pick(pt) {
      let best = -1, bd = 30 * 30;
      for (let f = 0; f < self.foodNode.length; f++) {
        const i = self.foodNode[f];
        const d = (self.X[i] - pt.x) * (self.X[i] - pt.x) + (self.Y[i] - pt.y) * (self.Y[i] - pt.y);
        if (d < bd) { bd = d; best = f; }
      }
      return best;
    }
    c.addEventListener('pointermove', function (ev) {
      const h = pick(local(ev));
      if (h !== self.hover) {
        self.hover = h;
        c.style.cursor = h >= 0 ? 'pointer' : 'default';
        if (self.onHover) self.onHover(h);
      }
    });
    c.addEventListener('pointerleave', function () {
      self.hover = -1;
      if (self.onHover) self.onHover(-1);
    });
    c.addEventListener('click', function (ev) {
      const h = pick(local(ev));
      if (h >= 0 && self.onSelect) self.onSelect(h);
    });
  };

  window.Physarum = Physarum;
})();
