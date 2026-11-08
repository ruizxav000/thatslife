/*
 * Colour palettes. Each one sets the canvas colours and the page's text tokens.
 *   dark   additive light on a dark ground (true) or ink on a light ground (false)
 *   live   ramp for fresh growth and the light under the cursor, cool → hot
 */
(function () {
  'use strict';

  window.PALETTES = {
    fluor: {
      dark: true, bg: '#040208',
      name: 'rgba(156,78,255,0.9)', free: 'rgba(120,60,240,0.7)', body: 'rgb(118,52,236)', glow: 0.55,
      live: ['#9c179e', '#bd3786', '#d8576b', '#ed7953', '#fb9f3a', '#fdca26', '#f0f921'],
      head: [255, 244, 200], trail: [255, 170, 90], spore: [255, 214, 120],
      css: { fg: '#ece8f7', dim: '#8a83a1', accent: '#ffcf6e' }
    },
    mycelium: {
      dark: true, bg: '#0c0b09',
      name: 'rgba(232,224,210,0.5)', free: 'rgba(205,196,182,0.36)', body: 'rgb(230,220,200)', glow: 0.35,
      live: ['#5e574d', '#958a78', '#cdbfa6', '#efe3cc', '#fff8ea', '#ffffff'],
      head: [255, 252, 244], trail: [255, 238, 210], spore: [255, 242, 220],
      css: { fg: '#efe9de', dim: '#8f877a', accent: '#f3e3c3' }
    },
    foxfire: {
      dark: true, bg: '#02080a',
      name: 'rgba(80,240,180,0.55)', free: 'rgba(56,190,160,0.42)', body: 'rgb(60,220,170)', glow: 0.5,
      live: ['#0f5f5a', '#1a9e7e', '#3fe0a0', '#a8ffcf', '#eafff2'],
      head: [232, 255, 242], trail: [120, 255, 190], spore: [160, 255, 210],
      css: { fg: '#e4f4ee', dim: '#7c958d', accent: '#8dffc8' }
    },
    ember: {
      dark: true, bg: '#070303',
      name: 'rgba(225,72,42,0.62)', free: 'rgba(170,50,30,0.5)', body: 'rgb(200,60,30)', glow: 0.5,
      live: ['#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d13d', '#fcffa4'],
      head: [255, 246, 210], trail: [255, 170, 60], spore: [255, 190, 90],
      css: { fg: '#f3e9e4', dim: '#9a8580', accent: '#ffb347' }
    },
    cobalt: {
      dark: true, bg: '#02040c',
      name: 'rgba(84,134,255,0.68)', free: 'rgba(60,100,230,0.5)', body: 'rgb(60,100,255)', glow: 0.5,
      live: ['#1b2a8f', '#2f5bff', '#5f9bff', '#a9d4ff', '#f2fbff'],
      head: [240, 250, 255], trail: [140, 200, 255], spore: [180, 220, 255],
      css: { fg: '#e8eefc', dim: '#7e8aa6', accent: '#9fd0ff' }
    },
    stain: {
      dark: false, bg: '#6fcab9',
      name: 'rgba(110,14,44,0.72)', free: 'rgba(110,14,44,0.5)', body: 'rgb(110,14,44)', glow: 0,
      live: ['#c9566f', '#a8264a', '#7d0f30', '#4a0418', '#250009'],
      head: [40, 0, 12], trail: [120, 10, 40], spore: [80, 8, 28],
      css: { fg: '#1f060d', dim: '#264a44', accent: '#7d1230' }
    },
    ink: {
      dark: false, bg: '#e8e9e5',
      name: 'rgba(22,22,30,0.7)', free: 'rgba(22,22,30,0.45)', body: 'rgb(22,22,30)', glow: 0,
      live: ['#5d6070', '#33407e', '#2240c8', '#1440ff'],
      head: [20, 64, 255], trail: [20, 64, 255], spore: [20, 64, 255],
      css: { fg: '#141418', dim: '#6a6b72', accent: '#1440ff' }
    }
  };
})();
