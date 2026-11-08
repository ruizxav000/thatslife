# thatslife

Portfolio v2 for Xavier Ruiz.

**Front page.** A network grows the name inside its own letterforms, reaches toward the cursor, and carries light back home. Projects are faint points; click one and the network grows to it.

**Project pages.** Clicking a found project turns the whole page into that project's own world. The front page breaks apart cell by cell into characters and becomes:

- the ray-traced black hole from Twin Paradox, drawn in ASCII, with each project seen from its own camera position;
- the rider from the photograph, galloping toward the cursor and leaving tracks in the snow;
- a lens around the cursor: finer characters and magnification.

Back turns the page into the front page again.

Open `index.html` in a browser. Project pages need WebGL.

## Make it yours

Everything personal is in `ME` at the top of `js/main.js`, including each project's camera `view`.

## Files

- `js/organism.js`: the growing network (front page)
- `js/ascii.js`: black hole ray tracer and the character renderer (project pages)
- `js/main.js`: content, the two views and the transition between them
- `js/palettes.js`, `js/colormaps.js`: colour
- `assets/rider.png`: the rider, cut out of the photograph
