# 🎆 FUSEWORKS
**One spark. A hundred explosions.**

A fireworks chain-reaction roguelike for web portals. Light one firework, chain the whole sky, multiply **Sparks × Heat** into the billions. Plan your chain, buy rule-bending Catalysts at the Bazaar, beat 8 nights of bosses, then go Endless.

- 🎮 **Play locally:** from the repo root run `python3 -m http.server 8080`, then open http://localhost:8080/fuseworks/
- 📦 **Build portal packages:** `node tools/build.mjs` (inside `fuseworks/`) creates `dist/fuseworks-{crazygames,poki,web}.zip`
- 📤 **Upload guide:** [UPLOAD.md](UPLOAD.md) · **Store assets:** [`store/`](store/) · **Why it works:** [DESIGN.md](DESIGN.md)
- ⚖️ **Size:** ~140 KB zipped including two OFL fonts. Every visual is procedural (WebGL 2 with HDR bloom and water reflections), and every sound is synthesized live (WebAudio: booms with city echo, crackle, rising chain melody, applause, generative music).

## How to play
1. **Tap a firework to light it.** It bursts and lights every firework inside its reach, which light theirs…
2. Every burst adds **Sparks** (blue) and **Heat** (red). Score = Sparks × Heat. Longer chains grow *quadratically*.
3. **Drag** fireworks into reach before lighting (3 Moves per act). Burst the entire sky in one launch for a **GRAND FINALE** (×2 Heat).
4. Beat the act's target within 4 launches. Spend your money at the **Bazaar**: Catalysts (perks), Formulas (level up a shell type), Rites (dye, gild, twin… your shells), Packs and Blueprints.
5. Each night ends with a **Finale boss** that twists the rules. Survive 8 nights to win, then keep going in Endless.

## Content
11 shell types · 52 catalysts (4 rarities) · 11 formulas · 17 rites · 11 blueprints · 14 bosses · 6 starting crates · 5 heat levels · 20 achievements · Collection · Daily Show · Endless · 14 cosmetics

## Code map
```
src/main.js        app orchestration: layout, input (tap / drag / charms), launch → chain → tally loop, run flow, tutorial, ads, saving
src/content.js     ALL game content: shells, catalysts (hook functions), charms, blueprints, bosses, crates, heat levels, achievements, cosmetics
src/sky.js         pure logic: placement (clustered islands), reach geometry, chain event queue, scoring engine (Sparks × Heat, catalyst hooks)
src/run.js         a run: nights/acts/targets, crate, shop, packs, charms, cash-out, save/restore (deterministic per seed → Daily Show)
src/gl.js          WebGL 2 renderer: instanced sprites, HDR bloom mip chain, water reflections, ACES tone map
src/atlas.js       procedural sprite atlas + painted city backdrops (5 themes)
src/particles.js   struct-of-arrays particle system (36k sparks, trails, crackle pops, crossette splits)
src/scene.js       firework recipes per shell type, tracers, rockets, smoke, crowd, camera shake and flash
src/audio.js       synthesized SFX and generative lo-fi festival music
src/ui.js          DOM HUD, holographic cards (tilt, jiggle, drag to reorder), Bazaar, packs, every menu
src/overlay.js     2D overlay: reach previews, link lines, floating numbers, tutorial hand
src/save.js        profile, achievements → unlocks, Stardust, cosmetics, Daily record
src/platform.js    CrazyGames SDK v3 / Poki SDK v2 / standalone
tools/sim.mjs      headless balance simulator (skilled and novice bots)
tools/build.mjs    per-portal zip builder
tools/covers.html  cover art rendered with the game's own renderer
```

## Balancing
`node tools/sim.mjs 80 [stake] [crate] [--novice]` plays 80 full runs with the real rules. Current results: skilled bot wins 40% on Warm and 3% on Inferno. The novice bot wins 4% and reaches Night 2+ every run.
