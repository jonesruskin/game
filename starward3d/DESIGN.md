# STARWARD 3D: design bible
*Build a colony in orbit with a crew of robots and AIs, then carry it from Earth to the stars.*

Starward 3D takes Starward's long road (Earth → orbit → Moon → planets → stars → aliens → the edge of the universe) and rebuilds it around three things the 2D game lacked: a **3D world you shape yourself**, a **crew of robots and AIs to collect, raise and fuse**, and **a reason to come back every day**.

## 1. Pillars
1. **Your colony, your way.** Floating orbital islands with free placement (no fixed lots), decorations, paint schemes, a banner and a name. No two colonies look alike (Clash of Clans' "this base is mine").
2. **A crew worth collecting.** Robots and AIs ("bots") with elements, rarities, levels and fusion: the creature-collector core that drives Dragon City, rebuilt for a space colony. Bots help humans with everything: they earn the credits, crew the buildings, fly the missions and fight in the Arena.
3. **Something to collect on every visit.** Production waits in its building until you tap it. Cadences stack: 30 s to 24 h fabricator recipes, hourly bay collections, daily calendar and missions, weekly leagues, monthly events.
4. **The long road.** Starward's progression (rockets, the Moon, Mars, terraforming, star colonies, contact, the Swarm, the Beyond, Ascension) is the spine; each new world is a new island.

## 2. Platforms and builds
- **CrazyGames first** (web, SDK v3: loading events, gameplay start/stop, rewarded and midgame ads, cloud save through the data module). Budget: under 2 MB, far inside CrazyGames' 50 MB initial / 20 MB mobile-homepage limits.
- **Separate build targets from one TypeScript codebase.** Everything platform-specific lives behind `src/platform/` (one adapter per target, picked at build time by Vite alias, so a build contains only its own adapter):
  - `crazygames` → `dist/crazygames/` + zip (SDK script injected)
  - `web` → `dist/web/` + zip (itch.io / own site, no SDK)
  - `mobile` → `dist/mobile/` (web assets for a Capacitor shell for Google Play / App Store: local notifications for "your bots' bays are full", IAP and AdMob adapters slot in here later)
- Three.js, procedural geometry and textures only (no asset files), WebGL2.

## 3. The world
- **Islands.** Each world is a floating island made of 6×6-tile plots on a 5×5 plot map. You start with the centre 3×3 plots (18×18 tiles) of an asteroid platform in low Earth orbit, with Earth turning below. Buying a neighbouring plot grows the island: rock, regolith and all.
- **Free placement** on a tile grid: build, move, rotate, store. Footprints 1×1 (decor) to 4×4 (Command Center).
- **Camera:** near-isometric perspective. Drag to pan, wheel or pinch to zoom, right-drag or two-finger twist to rotate.
- Later islands: the Moon, Mars (terraforms over time), Ceres, Titan, star colonies, and the Precursor Vault.

## 4. Bots: the creature core (Dragon City, made ours)
| Dragon City | Starward 3D |
|---|---|
| Dragons | **Bots:** drones, rovers, walkers, androids, mechs, crawlers and AI cores |
| Habitats | **Bays**, one type per element; a bot can live in a bay of any of its elements. Bays have bot capacity and a credit store |
| Gold from dragons | **Credits** earned by bots in their bay; they wait until you tap the bay. Full bays stop earning: come back |
| Farms and food | **Fabricators** print **Power Cells** from recipes (30 s → 24 h); feed cells to bots to level them up |
| Hatchery | **Assembly Bay:** a new core boots up on a timer |
| Breeding (both ≥ L4) | **Fusion Lab:** fuse two bots at level 4+ into a new core. The child can take either parent's species or a hybrid with elements from both; rare fusions unlock rarer species |
| League battles | **Arena:** 3v3 turn-based battles with element moves; leagues and weekly seasons |
| Gems | **Dark Matter:** premium currency, earned by playing |
| Events | Limited-time events with exclusive bots and milestone tracks |
| Ancient World (level 27) | **The Precursor Vault** (Commander level 27): mine relic crystals with credits, refine crystal tiers with Iridium, summon and evolve Relic AIs, which earn Iridium and never fight |

- **22 elements.** 15 core: Solar, Plasma, Hydro, Cryo, Geo, Bio, Volt, Alloy, Void, Photon, Kinetic, Aero, Gravity, Chrono, Neural. 7 relic (Vault only): Relic, Aurora, Arcana, Entropy, Joy, Reverie, Soul. A bot has 1 to 4 elements and learns moves from each.
- **7 rarities:** Standard, Advanced, Elite, Epic, Legendary, Prototype, Singularity. Rarity sets earning rate, combat strength and how hard a bot is to fuse.
- **Levels 1-40.** Four feedings per level; the cost grows about 33% per level. Level raises earnings (+35% of base per level) and combat stats.
- **Helpers:** assign a bot to a building to boost it (construction, fabrication, research, launches). Bots help humans with everything.
- **The Botdex:** collect every species, with rewards per family and rarity.

## 5. Coming back: the dopamine schedule
| Cadence | Hook |
|---|---|
| Seconds to minutes | Tap to collect: credits burst from bays, cells pop from fabricators, XP ticks, level-up fanfare |
| 30 s to 24 h | Fabricator recipes: pick the one that matches when you'll be back |
| Hourly | Bays fill to their cap; a free supply drop every 4 hours |
| Daily | 28-day login calendar whose rewards grow with consecutive days (a missed day pauses the streak, never resets it), 3 daily missions plus a bonus chest for all three, a free daily core |
| Weekly | Arena league season with promotion rewards |
| Monthly | Limited-time events with exclusive bots |
| Long term | Commander levels 1-100 (each one pays out), the Botdex, the road to the stars, Ascension |

## 6. Personal touch
Free layout; decorations (holo-trees, lamps, statues, flags, fountains, paths) earned from levels, events and the calendar; **paint schemes** that recolour your buildings' accents; a **banner** (shape, colour, emblem) flown over the Command Center and shown in the Arena; colony name; bot nicknames and paint jobs; island themes as you expand.

## 7. Economy
- **Credits** (bots → buildings, upgrades, land, recipes), **Power Cells** (fabricators → feeding), **Dark Matter** (earned → speed-ups, premium cores, rerolls), **XP** (everything → Commander level). Space adds Alloy, Fuel and Data; the Vault adds Iridium and crystals.
- **Storage caps** (Credit Vaults, Cell Silos) keep check-ins regular; production waits in buildings instead of being lost.
- **Monetisation:** CrazyGames has rewarded ads only (double a collection, speed a timer by 30 minutes, an extra daily core) and nothing sold for real money. Mobile can add IAP later through the mobile adapter.

## 8. Build plan (each part committed when done)
1. **Foundation:** Vite + TypeScript + Three.js, platform adapters and separate builds; the 3D orbital island with Earth below; free placement; Command Center, bays, fabricators, storage, decorations; starter bots earning credits; feeding and levels; tap-to-collect; Commander XP and levels; save, cloud save and offline catch-up.
2. **The crew:** all 22 elements and 7 rarities, ~80 species with procedural 3D models, the Assembly Bay, the Fusion Lab, the Botdex, helpers, bots roaming the island.
3. **Daily loop:** login calendar, daily missions, supply drops, the free daily core with a reveal animation, achievements, offline report, level-up rewards.
4. **The Arena:** 3D turn-based battles, element moves and effectiveness, leagues and seasons, rival colonies.
5. **The road to the stars:** Launch Pad, rockets, the station, missions crewed by bots; Moon and Mars islands; research; the Solar System in 3D.
6. **Stars and aliens:** interstellar map, star colonies, alien civilisations and their bots, the Swarm.
7. **Events and the Precursor Vault.**
8. **Personal touch and ship:** paint, banners, more decor, themes; audio; store assets; CrazyGames packaging; Capacitor scaffold; review loop.
