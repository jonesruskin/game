# STARWARD 3D: design bible (v2)
*From one launch pad on Earth to a Type III civilisation, in 3D.*

> v1 of Starward 3D was a floating-island collector. The owner wanted Starward's real journey kept and Dragon City / Clash of Clans **ideas** layered on top, so v2 rebuilds it: Starward's economy, research tree and campaign (balanced by its year-long simulator) ported to TypeScript, presented as real 3D bases on real worlds, with people, robots, CoC-style layouts and daily battles between players.

## 1. Pillars
1. **A civilisation, not a base.** People live, work and grow on every world you settle. Robots make their lives easier: they dig, build, mine, research and fight for them.
2. **Grounded, then wondrous.** Real rockets, real Solar System data, real nearby stars; then fusion, warp, wormholes, Dyson swarms and the galaxy.
3. **Visible progress.** Every upgrade changes the 3D base; satellites orbit every world you reach; terraformed Mars turns blue and green in front of you.
4. **Your own civilisation.** Clash-of-Clans freedom: grid layouts where placement matters for efficiency (synergy auras), defence (War Games) and looks (paint, banners, decor, statues of your robots).
5. **A reason to come back every day, and for years.** Daily micro-loops (collect, missions, calendar, supply capsules, robot core, War Games) inside a years-long macro arc measured on the **Kardashev scale**, from humanity today (K 0.73) to Type III (K 3.0).

## 2. The arc (eras)
| Era | Scope | Key systems |
|---|---|---|
| 1. Orbital & Launch | Earth, orbit | Spaceport base, research, **rocket designer** (parts → custom rockets), launches, satellites, the space station |
| 2. Planetary colonisation | the Moon, Mars | Rovers, landers, **robot construction drones**, colony bases, colonists in **domes or underground habitats**, life support |
| 3. Terraforming & the Solar System | Venus, Mercury, the belt, Jupiter and Saturn systems | **Visible terraforming** (atmosphere processors, water extractors, bio-domes), asteroid mining, satellites around every world, cloud cities and gas-giant scoops |
| 4. Interstellar | real nearby stars, then a procedural galaxy | FTL drives, procedural star systems, exoplanet bases, rare cosmic resources, megastructures (Dyson swarm), empire overview |
| 5. Contact & conflict | the Orion Arm | Friendly aliens: diplomacy, trade routes (technology, knowledge, food). Hostile empires: fleets, planetary defences, raids, space battles |
| 6. Beyond | other galaxies | Relays, intergalactic expeditions, Type III, Ascension |

## 3. Economy (ported from Starward)
One empire stockpile, storage caps from Mission Control, depots and vaults. Resources: **credits, metal, fuel, science**, energy (a live balance; a deficit slows output), **Helium-3** (Moon, gas giants), **rare elements** (asteroids), **exotic matter**, **antimatter**, **influence** and **xenodata** (aliens), **dark matter** (earned; finishes timers), **Power Cells** (new: robot upkeep and levelling, the Dragon City "food").
- **Collectors (CoC):** credits, metal and fuel accumulate inside their buildings (a few hours' worth) and are tapped to collect; science and the rest flow straight to the stockpile.
- **Construction drones** are the builder bottleneck (Starward's engineering crews, now visible robots flying to each site).
- **Command gating:** buildings cap at 2 × Mission Control; Mission Control levels need the base grown first (Starward's `cmdReqs`).
- **Time ladder** and cost curves from Starward (`ladder`, `curve`, `capClamp`), so the year-long pacing holds.

## 4. Bases on real worlds
Every base is a grid on that world's own ground, under its own sky; the buildable area grows with the command level. Off the grid the landscape runs to the horizon.
| World | Look | Traits |
|---|---|---|
| Earth (Cape Horizon) | Coastal plain, sea, blue sky, clouds, day/night | Home: funding (credits), full population, the launch complex |
| The Moon | Grey regolith, craters, black sky, Earth overhead | Low gravity (cheaper launches), polar ice, Helium-3; colonists live in domes or regolith-covered underground habitats |
| Mars | Rust dunes, butterscotch sky, dust devils | Dust storms (weaker solar), iron-rich metal bonus, **terraformable in 7 visible stages** |
| Venus | A cloud city floating 50 km up in yellow clouds | Aerostat: breathable air is a lifting gas; strong solar, acid hazards; terraform with a sunshade |
| Ceres | Dark rock, a short horizon, the belt in the sky | Capital of the belt: asteroid mining control, water ice |
| Titan | Orange haze, methane lakes, Saturn faint overhead | Hydrocarbon fuel, cryogenic habitats |
| Europa, Mercury, Io, Ganymede, Enceladus, gas giants | Ice and cracks / scorched rock and a huge Sun / aerostat skimmers | Unique buildings per world (geysers, Helios arrays, He-3 scoops) |
| Exoplanets | Procedural (ocean, desert, jungle, ice, lava, tidally locked) under their star's colour | Traits from the world type |

**People:** colonists arrive with the colony and grow toward the lowest of housing, air, water and food. They live in **glass domes** or **underground habitats** that robots dig, work the buildings (staffing scales output) and move outdoors as terraforming makes a world habitable.

## 5. Robots (Dragon City's core ideas, made ours)
- **Collect:** 114 robots and AIs, 22 elements, 7 rarities (Standard → Singularity), each with a 3D model.
- **Work:** robots are assigned to buildings as operators; their element suits certain jobs (Geo → mining, Hydro → ice and water, Bio → greenhouses and terraforming, Neural → research, Solar/Volt/Plasma → power, Alloy/Kinetic → construction and defence, Photon → comms, Gravity → launch and shipyards...). A match boosts the building far more than a mismatch.
- **Grow:** Power Cells level them up (the Dragon City food loop); Robot Docks house them (habitats).
- **Breed:** the Fusion Lab fuses two robots into a new hybrid core; rarer pairs make rarer robots; the Botdex records every species.
- **Events:** a weekly themed event with an exclusive robot; a daily robot core spin.

## 6. Spaceflight
- **Rocket designer:** research unlocks parts (engines, tanks, stages, boosters, fairings, capsules, landing legs). A design's stats (payload class, reliability, cost, build time) come from its parts; the Launch Complex caps its size; the Vehicle Assembly builds it; launches play out in 3D.
- **Satellites** orbit Earth and, later, every settled world: comms (credits, connectivity), observation (deposits), weather (storm forecasts), navigation, telescopes, power.
- **The space station** grows module by module in orbit.
- **Asteroid mining:** claims across the belt worked by mining ships; Ceres runs them.

## 7. Terraforming
Multi-stage projects that run for real days: atmosphere, warmth, water, magnetic shield, lichens, forests, breathable air. Each stage visibly changes the base (ground colour, sky, clouds, lakes and seas, plants) and the planet view, raises population caps and removes the need for domes.

## 8. War Games (daily battles between players)
**Why it fits:** the Defence Council runs daily war games between colony commanders. Strike squads of your robots attack a holographic copy of another commander's real base layout. Nothing is destroyed for real, so nobody loses anything, but the simulations pay out grants, data and robot experience, and they harden the defences you will need when hostile aliens arrive in Era 5.
- From Mission Control 3: defences (point-defence turrets, laser batteries, missile silos, shield generators, EMP towers, walls) placed on your Earth base.
- **Attack:** 3 sorties a day. Pick one of three commanders of similar strength, deploy robot squads at the edge, watch the real-time battle. Stars: 50% destruction, Mission Control down, 100%.
- **Rewards that feed the main game:** credits, metal, fuel and science scaled to your level and the stars won, robot XP, trophies (leagues, weekly season rewards), a daily first-win bonus.
- **Defence:** others attack your snapshot; you get a log with replays and a bounty for every defence you hold.
- **Server:** a Cloudflare Worker + D1 (`server/`): snapshots, matchmaking, results, replays, leaderboard. The engine is deterministic, so the server re-runs each battle to verify it (this needs Workers Paid: a battle costs ~20 ms of CPU and Workers Free allows 10 ms; on Free the server sanity-checks the client's result instead). Without it (or offline) the Academy fields AI commanders built from the same templates, clearly labelled, with a difficulty that rises with trophies so fights stay close.
- The same battle engine runs the Era 5 alien raids (PvE), so defences matter for the whole game.

## 9. Aliens (Era 5)
Starward's civilisations (Veyari, Lumen Concord, Synod of Iron, Mycelar, Oshoru, the Kr'thul Swarm, the Hollow, Ascendants) plus procedural minor species. Translation, relations (−100 to +100), gifts, **trade routes** (technology, knowledge, food), research pacts, alliances; hostile empires raid colonies and fight fleet battles.

## 10. The Kardashev scale
`K = (log10(W) − 6) / 10` (Sagan), with W the civilisation's power in watts: Earth's grid at the start (~2×10¹³ W, K 0.73), fusion and space solar towards Type I, Dyson swarm stages towards Type II, star colonies, galactic grids and the relays towards Type III. Every +0.05 is a milestone with rewards.

## 11. Rhythm and fair monetisation
Timers from seconds to days on Starward's ladder; offline time always counts (collectors fill up, timers finish). Dark matter is earned, never sold. Rewarded ads (optional): −30 min on a timer, double login reward, an extra robot spin, an extra War Games sortie.

## 12. Build plan (each part committed and pushed when done)
1. **Foundation v2:** TypeScript port of Starward's economy (resources, Earth buildings, research tree, time ladder, gating); the 3D Earth spaceport on a coastal landscape with sky; CoC grid placement with a growing buildable area; construction drones; build, upgrade, collect; research lab; objectives; energy; Kardashev meter; save v2.
2. **Rockets & orbit:** rocket parts and designer, Vehicle Assembly, launches in 3D, missions, satellites orbiting Earth, the space station.
3. **Robots:** workshop, docks, operators with element affinities, Power Cells, Fusion Lab, Botdex, helpers; people and robots walking around the bases.
4. **Colonies:** the Moon and Mars bases (terrain, sky, traits), landers and rovers, colony hubs, domes and underground habitats, colonists and life support, the 3D Solar System map.
5. **Terraforming & the Solar System:** Mars's seven stages (visible), Venus cloud city, Ceres and asteroid mining, Titan, Europa, Mercury, gas-giant scoops, satellites around every world.
6. **Daily loop & War Games:** calendar, missions, supply capsules, robot core, achievements, weekly events; defences and walls; the battle engine, replays, leagues; the server and the AI fallback.
7. **Interstellar:** galaxy map (real stars + procedural systems), FTL, exoplanet bases, cosmic resources, megastructures, empire overview.
8. **Contact & conflict:** alien civilisations, diplomacy, trade routes, hostile raids (PvE battles), fleets and space battles.
9. **Beyond & Type III:** other galaxies, the endgame, Ascension; Style Locker, decor and the colony card.
10. **Polish & ship:** tutorial, audio, balance simulation, performance, store assets, docs, review loop.
