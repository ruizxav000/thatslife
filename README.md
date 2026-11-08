# thatslife

Portfolio v2 for Xavier Ruiz.

**Front page: Space Cowboy.** A photograph of a rider crossing snow, redrawn live in characters: ink on paper below the ridge, edges drawn as `- | / \`, and a sky that is a ray-traced black hole seen from close by. The name and job title sit in the sky. The cursor is a lens (finer characters, magnification) and the land drifts against the black hole as it moves.

**Projects.** Opening a project with its own world turns the page cell by cell into it; Back turns it back.

- **Mycelium**: a living network on pale stone. Tips wander, branch and fuse when they meet. Click open ground to plant a spore and a colony germinates; click a thread to send light home along it; hold to feed, and growth surges toward the cursor. When two colonies meet, light leaves the meeting point for both spores. Start over clears the field.
- Other projects (placeholders for now) show their text over Space Cowboy.

Open `index.html` in a browser. Space Cowboy needs WebGL.

## Make it yours

Everything personal is in `ME` at the top of `js/main.js`.

## Files

- `js/ascii.js`: black hole ray tracer and the character renderer (Space Cowboy)
- `js/organism.js`: the growing network (Mycelium)
- `js/main.js`: content, the two worlds and the turn between them
- `js/palettes.js`, `js/colormaps.js`: colour
- `assets/scene.jpg`: the photograph, with the land carried on past both edges for wide screens; `assets/sky.png`: where the sky is. Both are made by `tools/extend-scene.py` from the original photograph.
