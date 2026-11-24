# 🚀 STARWARD 3D: From Earth to the Stars
**From one launch pad on a coastal plain to a Type III civilisation spanning the galaxy, in 3D.**

The 3D evolution of [Starward](../starward/): Starward's economy, research tree and campaign (balanced by its year-long simulator), presented as real bases on real worlds, with people living in them, robots that make their lives easier (Dragon City's core ideas: collect, assign, fuse, events), Clash-of-Clans-style layouts where placement matters, and daily War Games against other players. Built with TypeScript, Three.js and Vite; CrazyGames first, then Google Play and the App Store.

> **Status: v2 in development, Parts 1-8 of 10 done.** v1 (a floating-island robot collector) was rebuilt as v2 on the owner's direction; v1 lives in git history (commit `0952b96`). The store assets and `UPLOAD.md` in this folder still describe v1 and will be regenerated in Part 10. See [DESIGN.md](DESIGN.md) for the vision and the 10-part plan.

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

## Part 5: Terraforming & the Solar System (done)
Worlds change in front of you, and every world looks and plays like itself.
- **Terraforming Mars in seven stages** (Orbital Mirrors, Greenhouse Factories, Comet Bombardment, Magnetic Shield, Liquid Oceans, Lichen and Algae, Forests and Oxygen), each a multi-day project run from the **Atmosphere Processor** (each stage needs one more level of it; it runs stages 4% faster per level). The panel shows the stage track and the climate now and after the next stage (temperature, pressure, water, oxygen).
- **You can see it happen:** the ground darkens with damp and real ponds appear beyond the colony, a sea fills the lowlands on the horizon, the sky turns from butterscotch to blue and clouds form, lichen turns the plains olive, then grass and young forests spread. From space the Mars globe gains seas, green and weather.
- **People move outdoors:** colonists wear pressure suits on airless worlds; once the sky is breathable they walk around in everyday clothes, and air stops limiting the colony. Each stage also raises housing.
- **Cytherea, the cloud city of Venus** (Aerostat Habitats): a deck on strapped lifting envelopes 50 km up, a promenade of planters and lamps, distant aerostats and two layers of yellow cloud far below. Sunlight 190% (superb solar), +25% credits from tourism, **Cloud Skimmers** (fuel and water from the clouds) and the **Sky Resort**. **Six terraforming stages** (L1 Sunshade, Carbon Snow, Hydrogen Rain, Soletta Mirrors, Algal Skies, Gardens of Venus): the clouds pale, part over new blue oceans, then turn white.
- **Ceres (Occator Station)** with dark rock, bright salt, a horizon that drops away and the asteroid belt strung across a black sky; **Titan (Kraken Shore)** with orange haze, a methane shore, drainage channels and Saturn a ghost through the smog. New models for Mining Control, the Hydrocarbon Refinery, the Atmosphere Processor, Cloud Skimmer and Sky Resort.
- **Comms relays around every world** you settle or build on (Deep Space Navigation): each level adds 4% to everything produced there, colonies and outposts alike; the satellites circle the world on the map and cross the colony's sky (Cape Horizon's sky shows your Earth satellites).
- The map shows each terraformed world's current climate; Venus moved from an outpost to a colony; new chapter steps for Cytherea and relays.

## Part 6, phase 1: the daily loop and defences (done)
- **A side rail** (Daily, Spin, Event, Supply capsule) with red dots for anything waiting, so the bottom bar stays short on phones.
- **The 28-day calendar:** rewards grow every day (credits, metal and fuel, Power Cells; Dark Matter and Advanced, Elite and Epic cores on special days). A missed day pauses it; it never resets. Every reward is measured in hours of your real income, so it stays worth claiming all game long.
- **Daily missions:** three a day drawn from what you can actually do (collect, upgrade, research, launch, level robots, assemble cores, fuse, voyage, War Games), each with a reward, plus a **bonus chest** (Dark Matter, cells, a 40% chance of an Advanced or Elite core).
- **Supply capsules:** one every 4 hours (two can wait). It drops under a parachute onto a free spot of Cape Horizon with a blinking beacon; tap it to open.
- **The daily core spin:** a wheel of eight prizes; the prize is decided first and the wheel lands on it, with the real odds printed underneath. A second spin for a rewarded ad where ads exist.
- **The weekly event:** six themes in rotation (Solar Solstice, War Games Cup, Deep Space Week, Fusion Frenzy, Garden Gala, Forge Fest), each with its own action. Missions, the bonus chest and the theme action earn points toward three milestones; the last is that week's **exclusive legendary robot**.
- **Achievements:** fifteen, four tiers each, paying Dark Matter (Mission Control level, resources collected, technologies, launches, robots, Botdex, fusions, colonies, terraforming stages, voyages, login days, streaks, capsules, War Games stars, defences held).
- **Defences on Earth (from Mission Control 3):** the **War Room** (your seat on the Defence Council), **Point-Defence Turrets**, **Laser Batteries**, **Missile Silos**, **Shield Generators**, **EMP Towers** and **Walls**, each with its own 3D model. Walls go up instantly, can be laid in a continuous line (the ghost hops to the next cell after each one) and upgraded all at once per level. Robots can operate defences (Kinetic and Alloy for turrets, Photon and Plasma for lasers...).

## Part 6, phase 2: War Games (done)
Daily battles between commanders that feed the main game, framed so they make sense in it: the **Defence Council** runs holographic simulations. Your robots attack a copy of another commander's real base; nothing is destroyed, but the grants, Power Cells and trophies are real, and the same skills defend you when hostile aliens arrive in Era 5.
- **Three sorties a day** (one returns every 8 hours) from the **War Room**. Your strike squad is your strongest robots (4 + one slot every second War Room level), each with escort drones (more for rarer robots).
- **Robots fight by role** from their primary element: **Breachers** (Geo, Alloy, Kinetic) go for defences and smash walls three times as fast; **Strikers** (Solar, Plasma, Volt, Photon) shoot the nearest building; **Flyers** (Aero, Gravity) cross walls and only turrets and missiles can hit them; **Disruptors** (Void, Chrono, Cryo) deal splash damage; **Support** (Bio, Hydro, Neural) repairs robots in the field. Collecting and levelling robots now matters twice.
- **Defences behave like their names:** turrets swing fast and hit flyers, lasers burn one ground target from far away, missiles burst over clusters but cannot hit what is next to them, shield domes soak damage for everything inside and recharge, EMP towers freeze every robot nearby. Robots assigned as operators make your defences stronger. Ground robots path around buildings and break through walls when that is the cheaper way in, and they converge on the weakest block.
- **The battle:** a holographic arena with the real building models; pick a robot card and tap anywhere outside the red square to land it. Two minutes; one star at 50%, one for Mission Control, one at 100%.
- **Deterministic engine:** fixed 0.1 s ticks, no randomness that isn't seeded, no trigonometry. A battle is fully described by its input, so **replays** are a few hundred bytes and play back exactly; every attack you make and every attack on you can be watched again.
- **Rewards that feed the main game:** grants in hours of your real income (by stars and destruction), Power Cells for the robots that fought, Science for a win, **+15 Dark Matter for the first win of the day**; trophies climb seven leagues with a **weekly season reward**.
- **Fair fights:** offline (or without a server) the **Academy** fields commanders whose bases are built under the same rules as yours, and its difficulty rises with your trophies, so you settle where battles are close (tuned with headless simulations across Mission Control levels and trophy counts).
- **Defend daily:** each day the Academy drills a snapshot of your own base; hold it (one star or less) for a bounty. Real players' attacks land in the same log with replays.
- **Real multiplayer server (optional):** `server/` is a Cloudflare Worker + D1 that stores base snapshots, matches commanders by trophies, **re-runs every submitted battle with the same engine file** to verify it, keeps the defence logs and a leaderboard. Build with `VITE_WAR_SERVER=<url>` to enable it; without it the War Games run on the Academy. See [server/README.md](server/README.md) for deploying (five commands), limits and cost.

## Part 7: Interstellar (done)
Humanity leaves the Solar System, and every world it settles is still a place you can stand on.
- **The star map:** all 182 systems within 60 light-years at their real positions (the 32 real nearest stars with their known planets, such as Proxima b, TRAPPIST-1 and Teegarden's Star, plus a procedural Starward catalogue with a realistic mix of red dwarfs), coloured by spectral class, with the survey range as a bubble, colonies and gates ringed, sails and starships moving along their routes. Open it from the Solar System map.
- **Megastructures at Sol:** the **Starshot Laser Array** (pushes light sails; each stage widens the survey range and adds a sail), the **Dyson Swarm** (ten stages of collectors you can watch thicken around the Sun on the Solar System map; energy, credits and science) and the **Sol Wormhole Gate** (shown past Neptune).
- **Light-sail surveys** map a system and its planets: type, habitability, the resources each is rich in.
- **Starships** from the Orbital Shipyard: the **Exodus Ark** (sleeper colony ship), the **Pathfinder** ramjet and the **Herald** warp ship (each far faster than the last).
- **Star colonies are real bases on their exoplanets.** Settlers found a Colony Hub, an Ice Mine (or Cloud Skimmer), a reactor and a dome (or greenhouses where the air is breathable). Each world's look comes from its type and its star: temperate worlds with forests and seas, ocean worlds where the colony is an island, deserts, ice worlds, lava worlds under a red sky, cratered rock, gas giants with a cloud-top deck; red dwarfs tint the sky orange-pink and hang a big red sun. Colonists breathe outdoors on the kindest worlds.
- **The whole world develops** beyond your base: fifteen development levels and a **specialisation** (Balanced, Mining, Research, Industry, Trade), shown on the colony's Colony Hub. Rare elements, helium-3 and **exotic matter** come from the worlds that hold them; **wormhole gates** make a colony's voyages take minutes and its trade grow.
- **The Empire overview:** income, every world with its people, housing and output, one tap to travel.
- Fixed: the Colony Hub on Venus could not be upgraded (it asked for Regolith Mines, which a floating city cannot build).

## Part 8: Contact & conflict (done)
We are not alone. Some neighbours want to help, some want to trade, one wants to eat us.
- **Seven civilisations at real stars** (ported from Starward): the **Veyari** crystalline gardeners who test how we treat the weak, the mercantile **Lumen Concord** plasma beings, the machine **Synod of Iron**, the planet-wide fungal **Mycelar**, the young aquatic **Oshoru** of TRAPPIST-1 e, the extinct **Hollow** who built the relay, and the **Kr'thul Swarm**; plus procedural young species on a few worlds. Each has a procedurally painted portrait, a nature, likes and dislikes.
- **First contact is a choice** (prime numbers, music, a show of strength, silence) and each mind hears it differently. Then **decipher** their language step by step, send **gifts**, open **embassies** (influence), sign **trade agreements, research pacts and alliances** (trade caravans, exotic matter, faster research), answer their **requests**, and buy their **knowledge** with xenodata (all production +10%, faster construction, an extra research slot, photonic sails, faster colony growth...). Relations drift toward each species' nature.
- **Young species:** observe them, exploit their world (the Veyari will not forgive it) or **uplift** them. **The Hollow ruins** at Epsilon Eridani can be excavated level by level.
- **The Swarm** demands tribute. Refuse and the raids begin, with hours of warning:
  - **Landings on Earth** are fought by the War Games engine against your real base (turrets, lasers, missiles, shields, EMP towers, walls; orbital defences thin the landing). Because the engine is deterministic, **Defence Command shows exactly what would happen if they landed now**, and you can watch that forecast, then add walls or upgrade defences and see it change. Hold, and you salvage their wrecks; fall, and they loot your stores.
  - **Raids on colonies** are fleet battles: **warships** (corvettes, frigates, destroyers, cruisers, battleships, carriers) with a weapon triangle (lasers beat small hulls, missiles beat large ones, railguns punch through shields), **planetary defences** on every world, a fleet you station where it is needed, forecasts and one-line advice on why a fight is going badly. A lost raid blockades a star colony for twelve hours.
  - **The hives** at Ross 154, Luyten 726-8 and Lacaille 9352, and **the Brood Queen** at Kapteyn's Star, can be assaulted for great spoils.
- **Space battles in 3D:** the round-by-round simulator played back over the world being fought for: chitin Swarm drones, warriors and brood ships against your warships and orbital defence rings, laser beams, missile arcs, rail slugs, ships breaking apart. Every battle in the log can be watched again.

## Code map
```
src/main.ts            app shell: boot, loop, taps, placement, feedback, save
src/platform/          one adapter per build target (types.ts is the contract)
src/core/              aliens.ts (contact, diplomacy, xenotech, requests, young species, ruins), conflict.ts (warships, defences, raids and Earth landings, hives, the fleet battle simulator), stars.ts (surveys, starships, star colonies and their bases, megastructures, gates), battle.ts (the deterministic War Games engine, shared with the server), war.ts (sorties, Academy commanders and AI attacks, rewards, leagues, drills), net.ts (War Games server client), daily.ts (calendar, missions, capsules, spin, achievements, weekly event), state.ts (save v2), econ.ts (rates, collectors, Kardashev, hooks), game.ts (rules, grid, objectives, offline time), space.ts (designs, assembly, missions, satellites, station), robots.ts (cores, docks, operators, fusion, Botdex), solar.ts (orbits, launch windows, colonies, life support, ships, voyages, outposts, terraforming, relays), util.ts
src/data/              civs (the civilisations, openings, xenotech, requests), fleet (warships, defences, the Swarm, hives), stars (the real and procedural neighbourhood, planet types, drives, megastructures), war (roles, defences, leagues, rewards), resources, buildings (+ footprints, collectors), research (102 techs), objectives (14 chapters), rockets (parts, presets), space (orbits, satellites, modules, missions), robots (affinities, boosts, recipes), solar (bodies, outposts, ships, terraforming), species, elements, rarities
src/render/            spacebattle.ts (fleet battles), portraits.ts (painted alien portraits), stars.ts (the star map), battle.ts (the War Games arena), world.ts (renderer, camera, picking, ghosts, drones, launches, supply capsule), env.ts (terrain per world, exoplanet looks, Venus deck and cloud sea, terraforming looks, sea, ponds, sky, clouds, flora, satellites, close-up ground detail), models.ts (Earth and colony buildings), system.ts (the Solar System map), rocket.ts (rockets from designs), orbit.ts (the orbit view), planet.ts (baked planet shaders, terraforming globes), walkers.ts (people and robots), botmodels.ts (robot models), kit.ts, studio.ts
src/ui/                contact.ts (civilisations and diplomacy), fleet.ts (Defence Command, space battle HUD), stars.ts (star map panels, star colonies, Empire overview), war.ts (War Games overlay, battle HUD, results), ui.ts (HUD, panels, shop, research, goals, Kardashev, settings), daily.ts (rail, calendar, missions, wheel, event, achievements, reveals), launch.ts (Launch Control, designer), robots.ts (crew, Workshop, Fusion, Botdex, operators), solar.ts (map panels, fleet, colony panel, terraforming, relays, worlds), style.css, fonts
tools/build.mjs        type-check, build each target, zip the portal builds
server/                War Games server: Cloudflare Worker (src/worker.ts), D1 schema, local SQLite test harness (npm run test:server, npm run war:local)
```
