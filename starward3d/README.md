# 🚀 STARWARD 3D: From Earth to the Stars
**From one launch pad on a coastal plain to a Type III civilisation spanning the galaxy, in 3D.**

The 3D evolution of [Starward](../starward/): Starward's economy, research tree and campaign (balanced by its year-long simulator), presented as real bases on real worlds, with people living in them, robots that make their lives easier (Dragon City's core ideas: collect, assign, fuse, events), Clash-of-Clans-style layouts where placement matters, and daily War Games against other players. Built with TypeScript, Three.js and Vite; CrazyGames first, then Google Play and the App Store.

> **Status: v2 in development, Part 1 of 10 done.** v1 (a floating-island robot collector) was rebuilt as v2 on the owner's direction; v1 lives in git history (commit `0952b96`). The store assets and `UPLOAD.md` in this folder still describe v1 and will be regenerated in Part 10. See [DESIGN.md](DESIGN.md) for the vision and the 10-part plan.

## Run it
```bash
cd starward3d
npm install
npm run dev            # http://localhost:5173 (hot reload)
npm run build          # type-check + all three targets
```
Or open the prebuilt `dist/web/` through the repo's static server: `python3 -m http.server 8080` from the repo root, then http://localhost:8080/starward3d/dist/web/

## Separate builds, one codebase
| Target | Command | Output | Platform adapter |
|---|---|---|---|
| CrazyGames | `npm run build:crazygames` | `dist/starward3d-crazygames.zip` | `src/platform/crazygames.ts` (SDK v3: loading/gameplay events, ads, cloud save) |
| Web (itch.io, own site) | `npm run build:web` | `dist/starward3d-web.zip` | `src/platform/web.ts` |
| Mobile (Play Store / App Store) | `npm run build:mobile` | `dist/mobile/` | `src/platform/mobile.ts` (Capacitor: local notifications now, AdMob/IAP later) |

## Part 1: Foundation (done)
- **Starward's economy in TypeScript:** resources and storage caps, the energy balance (a shortage throttles output), Mission Control gating (buildings cap at twice its level; each level needs the base grown first), the time ladder and cost curves, 102 technologies in 9 branches with Mission Control gates, and the 14-chapter campaign of objectives. Offline time is integrated exactly between timer completions.
- **A real Earth spaceport:** Cape Horizon sits on a mown coastal field under a blue sky, with rolling forested hills, a sandy beach and the ocean on the horizon. The buildable square grows two cells with every Mission Control level.
- **Clash-style layout:** place, drag, rotate and move any building on the grid with a green/red ghost; tap anywhere to move the ghost there.
- **13 procedural buildings that grow with their level:** Mission Control (main block, glass control tower, rotating dish, your flag), Research Center, University, Metal Mine, Fuel Refinery (burning flare), Agency Office, Solar Farm, Fission Plant (cooling tower with steam), Logistics Depot, Launch Complex, Vehicle Assembly, Tracking Station (sweeping dish) and Astronaut Academy (spinning centrifuge).
- **Collectors:** metal, fuel and credits wait in their buildings (3 h at level 1, longer as they grow) until you tap the bubble; full collectors glow.
- **Construction drones** (the builders) fly to every site and hover there while they work, sparking.
- **Research screen** with branch tabs, availability, costs, times, unlocks and a live progress card; **goals** by chapter; **the Kardashev scale** (K 0.73 today → Type III) with milestone rewards.
- Collect, upgrade, finish with dark matter, cancel (half refund), demolish, settings, welcome-back report, phone layout.

## Code map
```
src/main.ts            app shell: boot, loop, taps, placement, feedback, save
src/platform/          one adapter per build target (types.ts is the contract)
src/core/              state.ts (save v2), econ.ts (rates, collectors, Kardashev, hooks), game.ts (rules, grid, objectives, offline time), util.ts
src/data/              resources, buildings (+ footprints, collectors), research (102 techs), objectives (14 chapters)
src/render/            world.ts (renderer, camera, picking, ghosts, drones), env.ts (terrain, sea, sky, clouds, flora), models.ts (buildings), kit.ts, studio.ts, botmodels.ts (robots, Part 3)
src/ui/                ui.ts (HUD, panels, shop, research, goals, Kardashev, settings), style.css, fonts
tools/build.mjs        type-check, build each target, zip the portal builds
```
