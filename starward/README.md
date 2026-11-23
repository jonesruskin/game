# 🚀 STARWARD: Build a Space Empire
**From one launch pad on Earth to the edge of the universe.**

A slow-and-steady space empire builder for web portals: Clash of Clans' tactile base building, OGame's patient asynchronous empire and a 4X's alien civilisations. Research, build and upgrade in real time (timers keep running while you're away). Launch rockets and satellites, settle the Moon and planets, terraform worlds, cross interstellar space, meet alien species (some friendly, some not) and spread across galaxies.

> **Status: in development.** It's built in 8 parts (see [DESIGN.md](DESIGN.md) §11). **Parts 1-2 (Foundation & Earth, Orbit & Moon) are playable.**

- 🎮 **Play locally:** from the repo root run `python3 -m http.server 8080`, then open http://localhost:8080/starward/
- 📦 **Build portal packages:** `node tools/build.mjs` (inside `starward/`) creates `dist/starward-{crazygames,poki,web}.zip`
- 🧭 **Design bible:** [DESIGN.md](DESIGN.md)

## Part 1: Foundation & Earth (done)
- **Engine:** versioned saves, real-time timers, engineering crews, research slots, energy balance, storage caps, and *exact* offline catch-up (production is integrated piecewise between each timer completion).
- **Cape Horizon spaceport:** an isometric coastal base with 25 lots that open as Mission Control levels up, roads with traffic, a day/night cycle synced to your local time with lit windows and beacons, and construction scaffolds with cranes.
- **12 buildings** with up to 25 levels each, every one drawn procedurally and growing visually every 5 levels: Mission Control, Research Center, University, Metal Mine, Fuel Refinery, Agency Office, Solar Farm, Fission Plant, Logistics Depot, Launch Complex, Vehicle Assembly, Tracking Station.
- **34 technologies** in 7 branches (Rocketry, Engineering, Energy, Computing, Economy, Life Sciences, Astronomy).
- **Chapter 1 objectives** with rewards, dark-matter speed-ups (free in the last minute), optional rewarded-ad skips, and a "welcome back" report.

## Part 2: Orbit & Moon (done)
- **Launch Control:** five rockets (Kestrel → Leviathan, the last one reusable) assembled in the Vehicle Assembly building; seven missions from suborbital hops to the crewed lunar landing. Each outcome is rolled at liftoff, so reloading can't change it. Reliability rises with the Tracking Station, weather and navigation satellites, the Astronaut Academy and the station's Docking Hub. A lost mission still returns science.
- **Satellites:** seven types across Low Earth Orbit, Geostationary and the Earth–Moon Lagrange points (comms income, observation, weather, navigation, telescopes, solar power, deep-space relays). Each one can be upgraded Mk by Mk.
- **Space station:** six modules (core, laboratory, solar wings, habitat, fuel depot, docking hub), each grown by further launches.
- **The Moon:** found Tranquility Base with the Lunar Outpost mission, then build a second base with 8 lunar buildings (Colony Hub, regolith processor, ice mine, Helium-3 extractor, lunar solar, habitat dome, low-gravity lab, mass driver).
- **Orbit view:** a WebGL Earth (continents, clouds, oceans with sun glint, city lights at night) with the Moon on its orbit, your actual satellites in their slots, the station drawn from its real modules, and rockets flying their routes. Tap anything to manage it.
- **Liftoff:** every launch from Earth plays a countdown, ignition and smoke-plume climb on the pad.
- **Clash-style pacing:** every timer sits on a time ladder (seconds early, hours mid-game, days late, capped at two weeks). Mission Control and the Colony Hub need prerequisite buildings, and techs are gated by Mission Control level. Costs are clamped under the storage the player is guaranteed to have, so nothing can ever become unaffordable. Bot playtests: an engaged player lands on the Moon around day 8 and finishes Part 2 in about 3 weeks; a casual player takes about 6 weeks. The first rocket flies about 10 minutes into the first session.
- **14 new technologies** (48 total), Chapters 2-3 of the campaign and a Demolish action so a full base can always be rearranged.

## Balance
`node tools/sim.mjs` runs a bot through the campaign on the real rules (see the header for engaged, casual and first-session modes). Pacing rules are in DESIGN.md §10.1.

## Code map
```
src/main.js         app shell: boot, offline report, loop, input (pan/zoom/tap), views, saving, ads
src/core/state.js   save format + migrations       src/core/econ.js   modifiers, production, storage, energy
src/core/game.js    rules: build/upgrade/research timers, crews, speed-ups, objectives, exact offline advance
src/data/*.js       resources, buildings, research tree, layouts, objectives (all content is data)
src/render/iso.js   isometric drawing toolkit       src/render/art.js  procedural building art (level-aware)
src/render/base.js  the living base view (Earth + Moon themes, sprites, effects, day/night, liftoff, picking, camera)
src/core/space.js   spaceflight rules: rockets, missions, satellites, station modules, reliability, founding bases
src/data/space.js   rockets, orbits, satellites, station modules, missions
src/render/planet.js WebGL2 analytic planet + sky shaders    src/render/orbit.js  the orbit view (overlay + picking)
src/ui/ui.js        HUD, building panel, build menu, research tree, objectives, modals
src/ui/launch.js    Launch Control: missions, satellites, station, hangar, flights in progress
```
