# 🤖 STARWARD 3D: Robot Colony
**Build a colony in orbit with a crew of robots and AIs, then carry it from Earth to the stars.**

The 3D evolution of [Starward](../starward/): a floating asteroid island in low Earth orbit that you lay out yourself, a crew of collectible bots that earn your credits, and a daily rhythm of things to collect. Built in TypeScript on Three.js, with every model procedural (no asset files, ~260 KB zipped).

> **Status: Part 1 of 8 (Foundation) is playable.** See [DESIGN.md](DESIGN.md) for the full plan: the crew (fusion, 22 elements, 7 rarities), the daily loop, the Arena, the road to the stars, events and the Precursor Vault, and the personal-touch pass.

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

Vite picks the adapter per target through the `@platform` alias, so each build contains only its own platform code. See [mobile/README.md](mobile/README.md) for wrapping the mobile build.

## Part 1: Foundation (done)
- **The 3D world:** a floating island of turf, soil and rock above a turning Earth (procedurally baked day, cloud, city-light and water maps, an atmosphere, the Moon, the Sun and a starfield). Near-isometric camera: drag to pan, wheel or pinch to zoom, right-drag, two-finger twist or Q/E to rotate.
- **Free placement:** build, move and rotate anything on the tile grid, with a live green/red placement ghost. Decorations keep placing while you can afford them (paths, trees).
- **Buildings that grow:** the Command Center (stacked hub, landing pad, radar and your flag), element-coloured Bot Bays (pylons, canopy ring, holo dome, a docking pad per bot) and Fabricators (stacks, a conveyor of cells, a tank that fills while printing). Nine decorations.
- **Bots:** 13 species across 8 elements and 2 rarities, with 7 procedural chassis (orb, drone, rover, walker, android, mech, crawler). They wander their bays, earn credits that wait in the bay until you tap it, and level up when fed Power Cells (4 feedings a level, up to level 40).
- **Fabricators:** six recipes from 30 seconds to 24 hours: pick the one that ends when you'll be back.
- **Progression:** Commander levels (XP from everything, with a level-up celebration and rewards), Command Center gating, land expansion (holographic plots for sale), and 15 missions that double as the tutorial.
- **Your colony, your look:** a colony name, eight paint schemes that recolour every building's trim, and a banner (colour, emblem colour, six emblems) flown over the Command Center and on Colony Flags.
- **Real time:** construction, recipes and bay earnings run while you're away (exact catch-up on return), with cloud saves on CrazyGames.

## Code map
```
src/main.ts            app shell: boot, loop, taps, placement, feedback
src/platform/          one adapter per build target (types.ts is the contract)
src/core/              state.ts (save format), game.ts (all rules, pure), util.ts
src/data/              elements, rarities, species, buildings + recipes, levels + missions
src/render/            world.ts (renderer, camera, picking, sync), sky.ts (Earth + space), island.ts,
                       models.ts (buildings), botmodels.ts (bots), kit.ts (merged procedural geometry), studio.ts (thumbnails)
src/ui/                ui.ts (HUD, panels, shop, crew, style, bubbles, modals), style.css, fonts
tools/build.mjs        type-check, build each target, zip the portal builds
```
