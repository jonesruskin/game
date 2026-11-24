# 🚀 STARWARD: Build a Space Empire
**From one launch pad on Earth to the edge of the universe.**

A slow-and-steady space empire builder for web portals: Clash of Clans' tactile base building, OGame's patient asynchronous empire and a 4X's alien civilisations. Research, build and upgrade in real time (timers keep running while you're away). Launch rockets and satellites, settle the Moon and planets, terraform worlds, cross interstellar space, meet alien species (some friendly, some not) and spread across galaxies.

> **Status: in development.** It's built in 8 parts (see [DESIGN.md](DESIGN.md) §11). **Parts 1-5 (Foundation & Earth, Orbit & Moon, the Solar System, Interstellar, Contact) are playable.**

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

## Part 3: The Solar System (done)
- **Star Map:** all 26 major bodies with real data (radius, gravity, day, temperature, atmosphere, orbit, and a fact for each), drawn as WebGL worlds lit from the Sun on their real orbits. One game year = two real days, so the planets visibly move. Logarithmic distances fit Mercury to Pluto on one screen; pan, pinch and zoom.
- **Launch windows:** a Hohmann phase-angle model makes inner-system voyages up to 45% cheaper on fuel and 25% faster when a window is open. The panel says when the next one opens.
- **Survey probes** launched by rocket from Earth (with the liftoff on the pad), then **voyages** by a reusable **interplanetary fleet** built at the new Orbital Shipyard module: Hermes (nuclear thermal), Ares (colony transport), Daedalus (fusion torch) and Odyssey (antimatter-catalysed fusion).
- **Three new colonies with their own looks:** Mars (rust ground, butterscotch sky, blue sunsets, Phobos racing overhead), Ceres (dark regolith, Occator's bright salt, a distant Sun) and Titan (orange haze, methane lakes). The Moon becomes a colony too.
- **Colonists:** colony buildings need workers. Habitat domes house colonists, greenhouses grow them, Ares transports ship them from Earth, and production scales with the share of jobs filled.
- **About 21 outposts, mining claims and gas-giant scoops:** Helios Array on Mercury, the Cytherea aerostat over Venus, the Phobos Depot, six asteroid claims (Psyche, Vesta, Pallas, Hygiea, Eros, Bennu), He-3 scoops on all four giants, the Io Flux Tap, the Europa Deep Probe, bases on Ganymede, Callisto, Titania and Triton, and Tombaugh Station on Pluto. Each levels up to 15 with supply runs.
- **Terraforming Mars:** seven stages over weeks (orbital mirrors, greenhouse factories, comet bombardment, a magnetic shield at L1, liquid oceans, lichen, forests). Mars visibly changes on the Star Map (seas, green, clouds) and in the colony view (olive ground, bluer sky).
- **Story beats:** microbial life under Europa's ice, a signal picked up from Triton, and the edge of the Solar System at Pluto, setting up Parts 4 and 5.
- **Seven new buildings** (Greenhouse, Colony Reactor, Atmosphere Processor, Mining Control, Hydrocarbon Refinery, Fusion Plant, Space Elevator), an outer ring of 12 Earth lots (Mission Control 9-14), **24 new technologies** in a new Planetary branch and more, and Chapters 4-6 of the campaign.
- Bot playtests: an engaged player founds Mars around day 31, Ceres around day 68 and Titan around day 112, and finishes Part 3 around day 167. Full terraforming continues as a long-term goal.

## Part 4: Interstellar (done)
- **The Neighbourhood:** a 3D map of the stars around Sol. 32 real systems out to 41 light-years sit at their true positions (from RA, Dec and distance), with their real planets: Proxima b, Teegarden b, Ross 128 b, Tau Ceti e and f, GJ 1061 c and d, TRAPPIST-1 e/f/g/d, 55 Cancri e, Ægir and more. 150 procedural neighbours with a realistic spectral mix fill out the map. Drag to orbit, pinch to zoom, and zoom far out to see the Milky Way with a "You are here" marker in the Orion Spur.
- **Light-sail surveys** pushed by the Starshot Laser Array (a megastructure; each stage extends its range and adds a sail), revealing each system's worlds and their habitability.
- **Starships:** the Exodus Ark (sleepers), the Pathfinder (Bussard ramjet) and the Herald (Alcubierre warp, fuelled by exotic matter), built at the Orbital Shipyard.
- **Star colonies:** settle exoplanets (open-air at 25%+ habitability, anywhere with Dome Worlds), develop each colony to level 15 and choose its specialization (balanced, mining, research, industry or trade). Output scales with habitability. Colonial capacity grows with technology and Mission Control.
- **Megastructures** on the Sun's panel: the Starshot Laser Array, a 10-stage **Dyson Swarm** (energy, credits and science per stage) and the **Sol Wormhole Gate**. Gated colonies are minutes away and trade 25% more.
- **Exotic matter** from the new Casimir Foundry and from colonies on worlds that have it.
- **The story:** the Triton signal leads to Epsilon Eridani, where a light sail finds an ancient alien relay, setting up Part 5.
- **13 new technologies** (new Interstellar branch, 85 in all) and Chapters 7-8 of the campaign.
- Bot playtests: Part 4 runs from about day 175 to day 393 for an engaged player, and to about day 399 for a casual one.

## Part 5: Contact (done)
- **Seven civilisations, each anchored at a real star:** the **Veyari** (crystalline gardeners from the Large Magellanic Cloud, at Vega), the **Lumen Concord** (plasma traders at fast-spinning Altair), the **Synod of Iron** (machines in Fomalhaut's comet ring), the **Mycelar** (a fungal mind under Gliese 667 C's three suns), the **Oshoru** (a young ocean people on TRAPPIST-1 e), the **Kr'thul Swarm** (from the swallowed Gaia-Enceladus galaxy, at Kapteyn's Star) and **the Hollow** (extinct builders of the relay). Four procedural minor species live on other worlds.
- **First contact** is a choice (prime numbers, music, a show of strength or silence), and each species reacts according to its nature.
- **Xenolinguistics:** decipher each language in stages. Understanding unlocks trade (25%), research pacts (50%), alien knowledge (75%) and alliances (100%).
- **Diplomacy:** relations from −100 to +100 that drift towards each species' nature, plus gifts, five-level embassies (influence), agreements that cost influence, and time-limited **requests** (deliveries, surveys, colony milestones).
- **Xenotech:** eleven pieces of alien knowledge bought with xenodata, including +10% to all production, an extra research slot, photonic sails, doubled exotic matter, and star charts that reveal every system.
- **Moral choices:** observe, exploit or uplift the minor species, and the Veyari remember what you did. Pay the **Kr'thul** tribute or refuse them (Part 6 is coming). Excavate the **Hollow ruins**, and log alien life on settled worlds in a codex.
- **Procedural portraits** for every species, the Xenology Institute building, 4 new techs (89 in all) and Chapters 9-10.

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
src/ui/launch.js    Launch Control: missions, satellites, station, hangar, fleet, flights in progress
src/data/solar.js   the Solar System: real body data, outposts/claims/scoops, ships, Mars terraforming stages
src/core/solar.js   orbits + launch windows, the fleet, voyages, colonies + colonists, terraforming
src/render/system.js the Star Map (WebGL worlds + overlay)   src/ui/system.js  body panels, voyages, terraforming
src/data/stars.js   real nearby stars + planets, procedural neighbours, drives, specialisations, megastructures
src/core/stars.js   light sails, starships, star colonies, development, megastructures, wormhole gates
src/render/stars.js the 3D Neighbourhood (and the Milky Way zoom-out)   src/ui/stars.js  star panels, megastructures
src/data/aliens.js  the civilisations, first-contact openings, xenotech, requests, minor species, fauna
src/core/aliens.js  discovery, contact, deciphering, relations, deals, embassies, requests, uplift, ruins
src/render/portraits.js procedural alien portraits      src/ui/contact.js  the Contact screen
```
