# 💎 GLINT: Gem Cutter Simulator
**Crack rocks. Cut gems. Get rich.**

A gem-cutting and jewellery-shop simulator for web portals. Every gem is **ray-traced in real time**: light refracts, bounces inside the stone and splits into rainbow fire exactly as it does in a real gem. The *price* of each stone comes from a physics analysis of the light it returns. Find each mineral's sweet-spot angles, grind perfect meets, polish to a mirror and sell to customers who haggle. Grow a market stall into a royal jewellery house.

- 🎮 **Play locally:** from the repo root run `python3 -m http.server 8080`, then open http://localhost:8080/glint/
- 📦 **Build portal packages:** `node tools/build.mjs` (inside `glint/`) creates `dist/glint-{crazygames,poki,web}.zip`
- 📤 **Upload guide:** [UPLOAD.md](UPLOAD.md) · **Store assets:** [`store/`](store/) · **Why it works:** [DESIGN.md](DESIGN.md)
- ⚖️ **Size:** ~175 KB zipped, including three OFL fonts. There are no image or audio files. Every visual is procedural (WebGL 2 per-pixel ray tracing, HDR bloom and star glints, Canvas2D Art Deco rooms) and every sound is synthesised live (WebAudio).

## How to play
1. **Crack** a mystery rock: tap it until it shatters and reveals the crystal inside.
2. **Plan:** a glowing outline shows your future gem inside the rough. Drag it, turn it and tip it. Bigger means more carats; keep inclusions outside it.
3. **Cut:** for the pavilion, crown and table, turn the dial and watch the **live ray-traced value meter**. Every stone has its own sweet spot. Then **hold to grind** and release when the ring hits the green zone for a *perfect meet*.
4. **Polish:** rub the stone until every facet turns to glass.
5. **Appraise:** get a laboratory certificate (cut, clarity, colour, polish, brilliance, fire, value). Then display it in a case, deliver it to a VIP or sell it to the dealer.
6. **Grow:** buy better tools (refractometer, precision mast, inclusion scope, planner), showcase lights, décor and advertising. Hire a clerk (offline sales) and apprentices (who cut with your recipe book). Move up five premises.

## Content
20 real mineral species and 55 varieties (from Rock Crystal to the Red Diamond) · 10 cuts (Round Brilliant, Oval, Cushion, Emerald, Pear, Marquise, Princess, Trillion, Asscher, Radiant) · 9 crystal habits · 5 premises · 11 upgrade lines · apprentices · 8 customer archetypes with haggling · VIP commissions · Mystery Rocks, Rough Dealer, Expeditions (9 world gem fields) and an Auction House with rival dealers · Codex with real mineral facts · Hall of Fame · 26 achievements · Stone of the Day · offline progress

## Code map
```
src/main.js      app orchestration: boot, layout, loop, input, economy actions, offline progress, apprentices, daily stone, ads
src/gl.js        WebGL 2 renderer: per-pixel gem ray tracer (refraction, TIR, Fresnel, dispersion, Beer–Lambert, inclusions), HDR bloom, Kawase streaks, ACES
src/poly.js      convex polyhedra from half-spaces: clipping, mesh, volume, ray casts, transforms
src/cuts.js      parametric cuts: outlines × faceting styles (brilliant / step / chevron) → facet planes for any angle and grind depth
src/habits.js    rough crystals in their real habits (hexagonal prism, octahedron, dodecahedron, barrel, trigonal, pebble…) with inclusions
src/optics.js    CPU light-performance analyser (light return, fire, scintillation, windowing, extinction)
src/optable.js   generated: the optical optimum for each cut × refractive index (tools/optics-table.mjs)
src/stone.js     the stone pipeline: placement & fitting, grind state, clarity, carat weight, appraisal
src/species.js   20 minerals with real optical constants, 55 varieties, colours, prices, facts
src/bench.js     the cutting bench: crack → plan → cut → polish → appraise
src/shop.js      the shop floor: customers, browsing, buying, haggling, commissions, offline sales
src/workshop.js  apprentices cutting with real physics
src/economy.js   premises, upgrades, market, customers, commissions, achievements
src/paint.js     procedural Art Deco rooms (bench + 5 shop interiors)
src/audio.js     synthesised SFX, rain ambience and a generative lounge trio
src/ui.js        DOM interface: HUD, dial, grind ring, certificate, haggle, market, vault, workshop, codex
src/save.js      profile + achievements · src/platform.js CrazyGames SDK v3 / Poki SDK v2 / standalone
tools/sim.mjs          headless economy simulator (time to each premises tier)
tools/optics-table.mjs precomputes optical optima
tools/covers.html      store covers rendered with the game's own ray tracer
tools/build.mjs        per-portal zip builder
```
