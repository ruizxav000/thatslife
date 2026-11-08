# thatslife

Portfolio v2 for Xavier Ruiz.

**Front page.** A network grows the name inside its own letterforms, reaches toward the cursor, and carries light back home. Projects are faint points; click one and the network grows to it.

**Project pages.** Clicking a found project turns the whole page into that project's own world. The front page breaks apart cell by cell into characters and becomes:

- the photograph of a rider crossing snow, redrawn in characters: ink on paper below the ridge, with edges (ridgelines, the horse, the tracks) drawn as `- | / \`;
- the rider at a gallop: he pitches and bounces in stride, kicks up snow, leaves hoofprints that fill back in, rides across and comes back around, and wheels to chase the cursor across the snow;
- a sky that is a ray-traced black hole, seen from close by: its shadow and lensed disk fill everything above the ridge;
- a lens around the cursor (finer characters, magnification) and the land drifting against the sky as the cursor moves.

Back turns the page into the front page again.

Open `index.html` in a browser. Project pages need WebGL.

## Make it yours

Everything personal is in `ME` at the top of `js/main.js`.

## Files

- `js/organism.js`: the growing network (front page)
- `js/ascii.js`: black hole ray tracer and the character renderer (project pages)
- `js/main.js`: content, the two views and the transition between them
- `js/palettes.js`, `js/colormaps.js`: colour
- `js/horse.js`: the jointed leg rig and gallop cycle
- `assets/scene.jpg`: the photograph with the rider lifted out; `assets/horse-body.png`: the rider and the horse without its legs; `assets/sky.png`: where the sky is
