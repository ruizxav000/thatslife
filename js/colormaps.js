/*
 * Perceptually uniform colormaps (matplotlib: van der Walt & Smith, 2015),
 * the same family used in microscopy and in the Nature 2025 mycorrhiza figures.
 * Stops are interpolated into 256-entry lookup tables.
 */
(function () {
  'use strict';

  const STOPS = {
    inferno: ['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d13d', '#fcffa4'],
    plasma: ['#0d0887', '#46039f', '#7201a8', '#9c179e', '#bd3786', '#d8576b', '#ed7953', '#fb9f3a', '#fdca26', '#f0f921'],
    viridis: ['#440154', '#482878', '#3e4989', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725'],
    // Histology-style stain for the light theme: pale rose -> deep crimson.
    stain: ['#f3d6db', '#dc95a3', '#b9506a', '#931f40', '#6a0f2a', '#3a0616']
  };

  function hex(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }

  const LUT = {};
  Object.keys(STOPS).forEach(function (name) {
    const s = STOPS[name].map(hex);
    const lut = new Array(256);
    for (let i = 0; i < 256; i++) {
      const t = (i / 255) * (s.length - 1);
      const j = Math.min(s.length - 2, Math.floor(t));
      const f = t - j;
      lut[i] = [0, 1, 2].map(function (q) { return Math.round(s[j][q] + (s[j + 1][q] - s[j][q]) * f); });
    }
    LUT[name] = lut;
  });

  function rgb(name, t) {
    const i = Math.max(0, Math.min(255, Math.round(t * 255)));
    return LUT[name][i];
  }

  function css(name, t, a) {
    const c = rgb(name, t);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a === undefined ? 1 : a) + ')';
  }

  window.Colormap = { rgb: rgb, css: css };
})();
