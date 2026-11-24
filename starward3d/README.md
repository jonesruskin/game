# 🤖 STARWARD 3D: Robot Colony
**Build a colony in orbit with a crew of robots and AIs, then carry it from Earth to the stars.**

The 3D evolution of [Starward](../starward/): a floating asteroid island in low Earth orbit that you lay out yourself, a crew of collectible bots that earn your credits, and a daily rhythm of things to collect. Built in TypeScript on Three.js, with every model procedural (no asset files, ~260 KB zipped).

> **Status: Parts 1-7 of 8 (Foundation, The Crew, The Daily Loop, The Arena, The Road to the Stars, New Worlds, Events and the Vault) are playable.** See [DESIGN.md](DESIGN.md) for the full plan: the crew (fusion, 22 elements, 7 rarities), the daily loop, the Arena, the road to the stars, events and the Precursor Vault, and the personal-touch pass.

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

## Part 2: The Crew (done)
- **82 bot species** across all **7 rarities** (Standard, Advanced, Elite, Epic, Legendary, Prototype, Singularity) and the **15 core elements**, each with a procedural 3D model. Standard bots arrive at once; rarer ones boot in the Assembly Bay.
- **The Fusion Lab:** fuse two bots of level 4+ into a new core. The child's elements must come from both parents; the panel forecasts every possible result and its chance (undiscovered species show as silhouettes). Rarer tiers need rarer parents, and great parents never make poor children. All 82 species are reachable.
- **The Assembly Bay:** cores from the shop, the Fusion Lab and (later) events boot in pods that glow in the core's rarity colour; activate a booted core for a reveal, with a "new species" flourish the first time.
- **The Botdex:** every species, with silhouettes and element hints for the ones you haven't found; each discovery pays Dark Matter (2 to 120 by rarity).
- **Bots help humans:** post a bot to the Command Center (construction speed), a Fabricator (cells per recipe), the Fusion Lab or the Assembly Bay (speed). Element matches help 50% more; helpers walk over and work on site, and stop earning while they do.
- **Bot panel:** feed or feed to the next level, rename, move between bays, store and release; combat stats ready for the Arena. All 15 element bays in the shop. 11 new missions.

## Part 3: The Daily Loop (done)
Rewards at every rhythm, so there is always a reason to come back:
- **A 28-day login calendar** whose rewards grow day by day, with jackpot days: Dark Matter, an Advanced core (day 7), an Elite core (day 14), the exclusive **Starlight Arch** decoration (day 21) and an Epic core (day 28). A missed day pauses the calendar; it never resets. Later cycles pay more and upgrade the jackpot cores. Streak counter with personal best; on CrazyGames a rewarded ad doubles the day's reward.
- **Three daily missions** (collect, harvest, feed, fuse, upgrade, open a drop...) with a **bonus chest** for finishing all three: Dark Matter, cells and a chance of an Advanced or Elite core.
- **Supply drops** every 4 hours (two can stack): a pod falls from orbit on a flame trail, lands beside the Command Center and blinks until you open it.
- **A free daily core** on a slot-machine reel that ticks past bots and slows onto your prize (a second spin from a rewarded ad on CrazyGames). Gifts lean towards species you haven't discovered yet.
- **13 achievements** with 4 tiers each, paying Dark Matter.
- **"While you were away"**: a report on return (credits waiting, recipes ready, constructions finished, cores booted, drops landed) with Collect everything.
- **Milestone levels:** every 5th Commander level pays a bonus core.
- **Mobile reminders:** the mobile build schedules local notifications for full bays, finished recipes, landed drops and the daily reward.

## Part 4: The Arena (done)
- **3v3 turn-based battles** on a holographic platform floating in orbit (the camera flies out from the island). Bots lunge, fire element-coloured projectiles or beams, flash on impact and topple when knocked out; damage numbers, "super effective" callouts, live HP bars and bench lights.
- **15 signature moves**, one per element, plus Strike: burns, freezes, stuns, shields, heals, drains, shield-piercing lasers, attack-weakening, always-first Cyclone, reckless Mass Driver, and Crush (stronger against healthy targets). Effectiveness follows the element chart (×1.35 / ×0.8): about a 77% edge for a good matchup, never a sure thing.
- **Leagues** from Bronze III to Singularity by trophies, **weekly seasons** with rewards by your best league (trophies soften by a quarter at each reset), **battle tickets** (5, one back every 90 minutes), a first-win-of-the-day Dark Matter bonus, auto-battle and 1-3× speed.
- **Rival colonies** with their own names, banners and crews, matched to your team's power at three difficulties (Easy / Even / Hard). They are simulated opponents: real asynchronous PvP needs a server, which can slot in later without changing the battle rules.
- The **Arena** building (each level +10% battle rewards), a team picker, new missions (build the Arena, first win, Silver and Gold leagues), an Arena daily mission and a Champion achievement.

## Part 5: The Road to the Stars (done)
- **The Launch Pad** with four rocket tiers (Kestrel, Meridian, Colossus, Leviathan) and up to three launch slots. Rockets lift off from the island on a flame with a smoke column.
- **Expeditions crewed by bots** to ten real worlds: the Moon, the near-Earth asteroids, Mars, Phobos, Ceres, Europa, Ganymede, Titan, Enceladus and Pluto (30 minutes to 12 hours). The haul scales with crew power against the destination and with element matches (+15% each): credits, cells, Dark Matter and a chance of Advanced, Elite or Epic cores. First visits pay a bonus and a story beat. Bots stay away for the whole trip: no earning, helping or fighting.
- **The Solar System in 3D:** the Sun, orbit rings, planets (Saturn's rings, moons circling Jupiter and Saturn), the asteroid belt, labels with status (new, locked, visits, outpost ready, time to return) and ships flying their arcs in real time. Drag to turn, pinch or wheel to zoom, tap a world.
- **Outposts** on any visited world earn credits, cells or Dark Matter by the hour (8 hours of storage), even while you're away; 10 levels.
- Six missions (Moon, outpost, Mars, Europa, Pluto), an expedition daily mission and an Explorer achievement.

## Part 6: New Islands, Stars and Aliens (done)
- **More islands:** found **Tranquility Base** on the Moon (grey regolith, the Moon below, Earth in the sky; bays hold 50% more credits) and **Bradbury Landing** on Mars (rust-red ground, Mars below, Phobos overhead; Fabricators print 30% more cells). Each has its own Colony Hub, land and buildings; every island keeps earning while you're elsewhere. Travel with the island button (a warp flash). Old saves migrate automatically.
- **Interstellar expeditions** on the Starship (Launch Pad level 10) to five real star systems: Proxima Centauri b, Barnard's Star, Tau Ceti e, TRAPPIST-1e and Epsilon Eridani, shown as glowing stars past Pluto on the map.
- **First contact:** each star is home to a civilisation (the Veyari gardeners, the machine Synod, the Mycelar fungal mind, the young Oshoru, the Lumen beings of light). Meeting one brings home a unique alien bot (Epic to Prototype) and an alliance that adds 5% to every bot's earnings.
- **The Kr'thul Swarm** (from Commander level 16): a raid is spotted every ~10 hours and arrives 2 hours later. Defend in the Arena with your team (no ticket needed) for Dark Matter, cells, credits and a chance to capture a reprogrammed Swarm bot (Drone, Warrior or Brood). Ignore it, and the Swarm carries off half the credits waiting in your bays.
- 90 species in all (5 alien, 3 Swarm, none fusable), new missions, and a Defender achievement.

## Part 7: Events and the Precursor Vault (done)
- **Weekly events:** a new themed event every Monday (Solar Solstice, Arena Cup, Deep Space Week, Fusion Frenzy, Garden Gala, Forge Fest), driven by a calendar so it works offline with no server. Everything you do earns event tokens and the week's two featured actions earn triple. An eight-step track pays supplies, Dark Matter, an Elite core, an Epic core and, at the top, the week's **exclusive bot** (six in all), which never comes back in the shop. The event chip in the HUD counts down and glows when a reward is waiting.
- **The Precursor Vault** (Commander level 27, after meeting the Epsilon Eridani civilisation): a violet island of Precursor ruins with its own shop tab.
  - **Crystal Mines** dig relic shards for credits (10 minutes, 2 hours or 8 hours) in six colours: Aurora, Arcana, Entropy, Joy, Reverie and Soul. Tap the mine when the dig is done.
  - **The Relic Forge** turns four of a tier plus Iridium into one of the next: Shard, Crystal, Gem, Prism.
  - **Relic Sanctums** (one per colour) wake **Relic AIs** from crystals: Minor (Epic), Major (Legendary) and Prime (Prototype), 18 in all. They never fight; they earn **Iridium**, the Vault's own currency, which fills the sanctum for you to tap and collect. Crystals also **evolve** them from one to five stars, each star adding 60% to their earnings.
- 114 species in all, new missions for the event and the Vault, and an Iridium counter in the HUD (tap it to see your crystals).

## Code map
```
src/main.ts            app shell: boot, loop, taps, placement, feedback
src/platform/          one adapter per build target (types.ts is the contract)
src/core/              state.ts (save format), game.ts (rules), crew.ts (fusion, assembly, Botdex, helpers), daily.ts (calendar, missions, drops, spin, achievements), arena.ts (battles, leagues, seasons, rivals, raids), space.ts (expeditions, outposts), events.ts (weekly events), vault.ts (mines, forge, Relic AIs), util.ts
src/data/              elements, rarities, species, buildings + recipes, levels + missions, islands, vault
src/render/            world.ts (renderer, camera, picking, sync), sky.ts (Earth + space), island.ts,
                       models.ts (buildings), botmodels.ts (bots), arena.ts (the holo-arena), system.ts (the Solar System map), kit.ts (merged procedural geometry), studio.ts (thumbnails)
src/ui/                ui.ts (HUD, panels, shop, style, bubbles, modals), crew.ts (bot panel, fusion, assembly, Botdex), daily.ts (daily screens and reveals), arena.ts (Arena and battle HUD), space.ts (map HUD, destinations, returns), vault.ts (event screen, mine, forge, sanctums), style.css, fonts
tools/build.mjs        type-check, build each target, zip the portal builds
```
