# 🚀 STARWARD: Build a Space Empire
**From one launch pad on Earth to the edge of the universe.**

A slow-and-steady space empire builder for web portals: Clash of Clans' tactile base building, OGame's patient asynchronous empire and a 4X's alien civilisations. Research, build and upgrade in real time (timers keep running while you're away). Launch rockets and satellites, settle the Moon and planets, terraform worlds, cross interstellar space, meet alien species (some friendly, some not) and spread across galaxies.

> **Status: in development.** It's built in 8 parts (see [DESIGN.md](DESIGN.md) §11). **Part 1 (Foundation & Earth) is playable.**

- 🎮 **Play locally:** from the repo root run `python3 -m http.server 8080`, then open http://localhost:8080/starward/
- 📦 **Build portal packages:** `node tools/build.mjs` (inside `starward/`) creates `dist/starward-{crazygames,poki,web}.zip`
- 🧭 **Design bible:** [DESIGN.md](DESIGN.md)

## Part 1: Foundation & Earth (done)
- **Engine:** versioned saves, real-time timers, engineering crews, research slots, energy balance, storage caps, and *exact* offline catch-up (production is integrated piecewise between each timer completion).
- **Cape Horizon spaceport:** an isometric coastal base with 25 lots that open as Mission Control levels up, roads with traffic, a day/night cycle synced to your local time with lit windows and beacons, and construction scaffolds with cranes.
- **12 buildings** with up to 25 levels each, every one drawn procedurally and growing visually every 5 levels: Mission Control, Research Center, University, Metal Mine, Fuel Refinery, Agency Office, Solar Farm, Fission Plant, Logistics Depot, Launch Complex, Vehicle Assembly, Tracking Station.
- **34 technologies** in 7 branches (Rocketry, Engineering, Energy, Computing, Economy, Life Sciences, Astronomy).
- **Chapter 1 objectives** with rewards, dark-matter speed-ups (free in the last minute), optional rewarded-ad skips, and a "welcome back" report.

## Code map
```
src/main.js         app shell: boot, offline report, loop, input (pan/zoom/tap), views, saving, ads
src/core/state.js   save format + migrations       src/core/econ.js   modifiers, production, storage, energy
src/core/game.js    rules: build/upgrade/research timers, crews, speed-ups, objectives, exact offline advance
src/data/*.js       resources, buildings, research tree, layouts, objectives (all content is data)
src/render/iso.js   isometric drawing toolkit       src/render/art.js  procedural building art (level-aware)
src/render/base.js  the living base view (ground, sprites, effects, day/night, picking, camera)
src/ui/ui.js        HUD, building panel, build menu, research tree, objectives, modals
```
