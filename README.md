# thatslife

Portfolio v2 for Xavier Ruiz.

Everything on screen is drawn in characters, live:

- The background is the ray-traced black hole from Twin Paradox, rendered at one ray per character.
- The name is grown by a branching, fusing network; each thread becomes `- | / \` by the direction it runs.
- Around the cursor the characters get finer and the view is magnified.
- Clicking a project doesn't open a page: every character scrambles and resolves into the project. Twin Paradox flies the camera in close; image projects draw their image in characters.

Open `index.html` in a browser (WebGL required for the ASCII view; without it the network is shown as drawn).

## Make it yours

Everything personal is in `ME` at the top of `js/main.js`. A project with `field: 'image'` currently uses `assets/ride.jpg`.

## Files

- `js/ascii.js`: black hole ray tracer and the character renderer (WebGL)
- `js/organism.js`: the growing network
- `js/main.js`: content, views, transitions, interaction
- `js/palettes.js`, `js/colormaps.js`: colour
