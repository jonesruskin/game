# 🚀 STARWARD 3D: From Earth to the Stars
**From one launch pad on a coastal plain to a Type III civilisation spanning the galaxy, in 3D.**

The 3D evolution of [Starward](../starward/): Starward's economy, research tree and campaign (balanced by its year-long simulator), presented as real bases on real worlds, with people living in them, robots that make their lives easier (Dragon City's core ideas: collect, assign, fuse, events), Clash-of-Clans-style layouts where placement matters, and daily War Games against other players. Built with TypeScript, Three.js and Vite; CrazyGames first, then Google Play and the App Store.

> **Status: v2 in development, Parts 1-4 of 10 done.** v1 (a floating-island robot collector) was rebuilt as v2 on the owner's direction; v1 lives in git history (commit `0952b96`). The store assets and `UPLOAD.md` in this folder still describe v1 and will be regenerated in Part 10. See [DESIGN.md](DESIGN.md) for the vision and the 10-part plan.

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

## Part 2: Rockets & orbit (done)
- **Rocket designer:** research unlocks parts: five engines (solid, kerolox, hydrolox, methalox, nuclear thermal for upper stages), five tank sizes (S to XXL, gated by the Vehicle Assembly's level), up to three stages, 0/2/4 strap-on boosters, a probe nose, payload fairing, crew capsule or lunar lander, and reusable landing legs. Each design's lift rating sets its class and payload; parts set cost, build time and reliability. Seven templates reproduce Starward's original rockets (Kestrel to Leviathan) exactly by class; copy, edit and name your own.
- **Assembly:** sounding rockets are built at the pad, anything bigger in the Vehicle Assembly (a second assembly line at level 10). The next rocket in the hangar stands on the pad, rendered from its design.
- **Missions** from Starward (suborbital tests to the Lunar Outpost): crewed flights need a capsule in the design and the Moon landing a lander. Outcomes are rolled at liftoff; failures still teach the engineers something. Reusable rockets come home 85% of the time.
- **Liftoff in 3D:** ignition, a smoke column billowing from the pad, an accelerating climb with the camera following it up.
- **Satellites** in low orbit, geostationary orbit and at the Earth–Moon L1 point (comms, observation, weather, navigation, telescopes, solar power, deep-space relays), each upgradable by Mk, with orbital slots.
- **The space station** grows module by module (core, laboratory, solar wings, habitat, fuel depot, shipyard, docking hub).
- **The orbit view:** Earth from space (oceans, clouds, day/night with city lights, atmosphere), the Moon, the Sun and stars, every satellite on its orbit and your station; focus on the station to see it up close.

## Part 3: Robots (done)
Dragon City's core ideas, made ours: robots are collected, housed, levelled and bred, but they exist to make life easier for people.
- **The Robotics Workshop** (Industrial Automation) assembles cores: Standard, Advanced (level 5) and Elite (level 12), with an element focus; more assembly bays at levels 5, 10 and 15. Your first two robots arrive with it.
- **Activation** is a reveal: who is in the core? Every new species fills a Botdex page and pays dark matter.
- **Robot Docks** house robots (3 + level each); **Cell Plants** charge the Power Cells that level them up (to 30).
- **Operators:** every production, power, science and spaceflight building has robot stations (a 2nd at level 8, a 3rd at 16). A robot boosts its building by its rarity and level, three times as much when its element suits the job (Geo and Kinetic for mines, Neural and Chrono for research, Solar for solar farms, Gravity and Alloy for the Vehicle Assembly...).
- **The Fusion Lab** (Construction Robotics, Mission Control 4) fuses two level-4 robots into a hybrid core whose elements come from both parents, with the odds of every outcome shown; parents are not used up.
- **The Botdex:** 114 species across 22 elements and 7 rarities.
- **Life in the base:** people walk between the buildings, robots hover at the buildings they operate or mill about their docks; new building models for the Workshop (sawtooth roof, swinging arm), Dock (charging rings), Cell Plant (glowing cells) and Fusion Lab (pulsing core).
- A short robot tutorial joins Chapter 1.

## Part 4: Colonies (done)
People leave Earth. Every colony is a real base on the ground of its world, under its own sky, with its own traits.
- **Tranquility Base on the Moon** is founded by flying the Lunar Outpost mission: grey regolith full of small craters and rover tracks, a black sky with Earth hanging in it. Traits: one-sixth gravity (the Mass Driver), polar ice, Helium-3 in the regolith, no air.
- **Bradbury Landing on Mars** needs a survey probe, Mars Direct research and an Ares colony transport from the Orbital Shipyard: rust-red ground, dust ripples and dust-devil trails, a butterscotch sky with Phobos. Traits: iron-rich ground (+15% metal), sunlight at 43% (weaker solar), thin CO₂ air, terraformable in seven stages (Part 5).
- **People need life support.** Colonists live under a Habitat Dome or in an **Underground Habitat that your robots dig** (it needs a Geo or Kinetic robot). They need housing, water (Ice Mines) and air (the Colony Hub, Greenhouses, domes). Short on either and growth stops and work slows; the Colony Hub panel shows it all.
- **Colony buildings:** Colony Hub (raises the colony's area and level cap), Regolith Mine, Ice Mine, He-3 Extractor, Solar Array, Colony Reactor, Habitat Dome, Underground Habitat, Greenhouse, Colony Laboratory, Mass Driver; Atmosphere Processor, Mining Control and Hydrocarbon Refinery wait for Mars terraforming, Ceres and Titan.
- **The Solar System map:** the Sun, every planet and major moon on its real orbit (positions move with time), the asteroid belt and ships in flight along their routes. Tap a world for its facts, its **launch window** (a good window cuts fuel and flight time; they open every few days of play) and what you can do there: survey probes, colonies, outposts and mining claims.
- **Fleet & shipyard:** Hermes (nuclear-thermal), Ares (80 colonists), Daedalus (fusion torch) and Odyssey (antimatter-catalysed) are built at the Orbital Shipyard station module; voyages found colonies, build outposts and carry colonists.
- **Your worlds:** a world switcher in the HUD and a Worlds list to travel between Earth, the Moon and Mars; each base keeps its own layout, buildings and people.

## Code map
```
src/main.ts            app shell: boot, loop, taps, placement, feedback, save
src/platform/          one adapter per build target (types.ts is the contract)
src/core/              state.ts (save v2), econ.ts (rates, collectors, Kardashev, hooks), game.ts (rules, grid, objectives, offline time), space.ts (designs, assembly, missions, satellites, station), robots.ts (cores, docks, operators, fusion, Botdex), solar.ts (orbits, launch windows, colonies, life support, ships, voyages, outposts), util.ts
src/data/              resources, buildings (+ footprints, collectors), research (102 techs), objectives (14 chapters), rockets (parts, presets), space (orbits, satellites, modules, missions), robots (affinities, boosts, recipes), solar (bodies, outposts, ships, terraforming), species, elements, rarities
src/render/            world.ts (renderer, camera, picking, ghosts, drones, launches), env.ts (terrain per world, sea, sky, clouds, flora, close-up ground detail), models.ts (Earth and colony buildings), system.ts (the Solar System map), rocket.ts (rockets from designs), orbit.ts (the orbit view), planet.ts (baked planet shaders), walkers.ts (people and robots), botmodels.ts (robot models), kit.ts, studio.ts
src/ui/                ui.ts (HUD, panels, shop, research, goals, Kardashev, settings), launch.ts (Launch Control, designer), robots.ts (crew, Workshop, Fusion, Botdex, operators), solar.ts (map panels, fleet, colony panel, worlds), style.css, fonts
tools/build.mjs        type-check, build each target, zip the portal builds
```
