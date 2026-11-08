/*
 * The horse's legs, drawn fresh every frame.
 *
 * The rider and the horse's body come from the photograph; the legs are a
 * jointed rig (upper leg, knee or hock, cannon, fetlock, pastern, hoof) posed
 * through a gallop cycle after Muybridge's "The Horse in Motion" (1878).
 * Each leg has a stance phase (hoof planted, leg sweeping back, pushing off)
 * and a swing phase (front knees folding up, hind hocks driving the hoof
 * forward under the belly). The four legs strike in the order of a transverse
 * gallop. Keyframes are joined with Catmull-Rom curves so velocity never jumps.
 *
 * Angles are degrees from straight down; positive swings toward the head.
 * The sprite faces left, so "toward the head" is −x.
 */
(function () {
  'use strict';

  const W = 285, H = 255, S = 2;

  // Absolute segment angles through one stride: [time, upper leg, cannon, pastern].
  // Fore: reach and land, sweep under, push off, then the knee folds the hoof up behind.
  const FORE = [[0.00, 30, 28, 20], [0.20, 5, 5, 30], [0.40, -28, -24, -10], [0.55, -18, -80, -110], [0.70, 15, -95, -120], [0.85, 40, 10, -10]];
  // Hind: land under the belly, sink, drive back, then the hock flexes and swings the hoof forward.
  const HIND = [[0.00, -10, 20, 5], [0.20, -25, 0, 30], [0.40, -45, -30, -20], [0.55, -35, 10, -40], [0.70, -10, 55, 10], [0.85, 5, 45, 20]];

  // Where each leg joins the body (sprite pixels, hidden under the belly), its offset in the
  // stride (a transverse gallop: hind, hind, fore, fore), and which side it's on.
  const LEGS = [
    { hind: true,  at: [178, 160], off: 0.00, far: true },
    { hind: false, at: [76, 160],  off: 0.47, far: true },
    { hind: true,  at: [194, 163], off: 0.10, far: false },
    { hind: false, at: [94, 163],  off: 0.58, far: false }
  ];

  function sample(keys, t) {
    t = ((t % 1) + 1) % 1;
    const n = keys.length;
    let i = 0;
    for (let k = 0; k < n; k++) if (keys[k][0] <= t) i = k;
    const k0 = keys[(i - 1 + n) % n], k1 = keys[i], k2 = keys[(i + 1) % n], k3 = keys[(i + 2) % n];
    const t1 = k1[0], t2 = i + 1 < n ? k2[0] : 1;
    const u = (t - t1) / (t2 - t1), u2 = u * u, u3 = u2 * u;
    const out = [];
    for (let j = 1; j < 4; j++) {
      const p0 = k0[j], p1 = k1[j], p2 = k2[j], p3 = k3[j];
      out.push(0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3));
    }
    return out;
  }

  function step(p, deg, len) {
    const a = deg * Math.PI / 180;
    return [p[0] - Math.sin(a) * len, p[1] + Math.cos(a) * len];
  }

  // Joint positions for one leg at cycle time t.
  function pose(leg, t) {
    const k = sample(leg.hind ? HIND : FORE, t + leg.off);
    const L = leg.hind ? [42, 30, 9, 7] : [39, 26, 9, 7];
    const p0 = leg.at, p1 = step(p0, k[0], L[0]), p2 = step(p1, k[1], L[1]), p3 = step(p2, k[2], L[2]);
    const p4 = step(p3, k[2] * 0.5, L[3]);
    return { pts: [p0, p1, p2, p3, p4], phase: ((t + leg.off) % 1 + 1) % 1 };
  }

  function limb(ctx, a, b, wa, wb, fill) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(a[0] + nx * wa / 2, a[1] + ny * wa / 2);
    ctx.lineTo(b[0] + nx * wb / 2, b[1] + ny * wb / 2);
    ctx.lineTo(b[0] - nx * wb / 2, b[1] - ny * wb / 2);
    ctx.lineTo(a[0] - nx * wa / 2, a[1] - ny * wa / 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(b[0], b[1], wb / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawLeg(ctx, p, far, hind) {
    const k = far ? 0.68 : 1;
    const c = function (r, g, b) { return 'rgb(' + (r * k | 0) + ',' + (g * k | 0) + ',' + (b * k | 0) + ')'; };
    const q = p.pts;
    // Red roan: pale and muscled up top, darker and finer toward the hoof.
    limb(ctx, q[0], q[1], hind ? 30 : 24, 12, c(192, 140, 118));   // gaskin or forearm
    limb(ctx, q[1], q[2], 10, 8, c(160, 96, 72));                   // cannon
    limb(ctx, q[2], q[3], 8, 7.5, c(128, 76, 56));                  // pastern
    limb(ctx, q[3], q[4], 8, 10, c(52, 40, 35));                    // hoof
    ctx.strokeStyle = far ? 'rgba(230,190,170,0.15)' : 'rgba(245,210,190,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo((q[0][0] + q[1][0]) / 2 - 4, (q[0][1] + q[1][1]) / 2);
    ctx.lineTo(q[1][0] - 3, q[1][1]);
    ctx.stroke();
  }

  function Horse(body) {
    this.body = body;
    this.canvas = document.createElement('canvas');
    this.canvas.width = W * S;
    this.canvas.height = H * S;
    this.ctx = this.canvas.getContext('2d');
    this.legs = [];
  }

  // Draw the horse at stride phase t (0..1); returns the canvas.
  Horse.prototype.draw = function (t) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(S, 0, 0, S, 0, 0);
    this.legs = LEGS.map(function (leg) { return pose(leg, t); });
    // All four legs first, far side darker; the body goes over their tops so the belly line hides the join.
    for (let i = 0; i < 4; i++) drawLeg(ctx, this.legs[i], LEGS[i].far, LEGS[i].hind);
    if (this.body.complete && this.body.naturalWidth) ctx.drawImage(this.body, 0, 0, W, H);
    return this.canvas;
  };

  // Hooves in sprite fractions, with each leg's place in its stride.
  Horse.prototype.hooves = function () {
    return this.legs.map(function (l, i) {
      const h = l.pts[4];
      return { x: h[0] / W, y: h[1] / H, phase: l.phase, hind: LEGS[i].hind, far: LEGS[i].far };
    });
  };

  Horse.W = W; Horse.H = H;
  window.Horse = Horse;
})();
