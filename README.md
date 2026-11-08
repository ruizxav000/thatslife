# that's life

Portfolio v2: a site whose visuals are grown, not drawn. Every pattern on the page is a live simulation of a published model of how living networks (fungi, slime moulds) branch, fuse and move resources.

Open `index.html` in a browser. No build step, no dependencies.

## What's running

| Section | Model | Source |
|---|---|---|
| Hero | Branching–annihilating random walk: tips wander, branch, and fuse on contact. The colony advances as a travelling wave. | Oyarte Gálvez et al., *Nature* 639 (2025); Hannezo et al., *Cell* 171 (2017) |
| Work | Adaptive tube network (the "slime mould Tokyo rail" model). Projects are food sources; Kirchhoff flow is solved each frame with preconditioned conjugate gradients. | Tero et al., *Science* 327 (2010) |
| Particles | Two-way streaming: particles ride the flux and reverse as sources change. | |
| Colour | Perceptually uniform colormaps (inferno, plasma, viridis). | matplotlib (2015) |

## Themes

Named after microscopy techniques:

- **Fluor**: fluorescence, fire colours on black (default in dark mode)
- **Stain**: brightfield histology, crimson on teal (default in light mode)
- **Wave**: age map, hyphae coloured by when they grew

## Files

- `index.html`: content and structure
- `css/style.css`: theme tokens and layout
- `js/hyphae.js`: travelling-wave mycelium (hero)
- `js/physarum.js`: adaptive transport network (work)
- `js/colormaps.js`: colormap lookup tables
- `js/main.js`: project data, themes, interaction, render loop

## Making it yours

- Projects live in the `PROJECTS` array at the top of `js/main.js`. Each `x`, `y` (0–1) places it in the network.
- Replace "Your Name", the bio, and the contact links in `index.html`.
