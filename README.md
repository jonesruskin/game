# 🎮 Game Studio Repo: 6 browser games ready for CrazyGames / Poki

| Game | Genre | Folder | Upload-ready zips |
|---|---|---|---|
| ⛈️ **Stealstorm** | Battle royale where KOs steal abilities | `/` (repo root) | `dist/stealstorm-*.zip` |
| 🐜 **Hordemind** | Reverse survivors: you are the swarm | [`hordemind/`](hordemind/) | `hordemind/dist/hordemind-*.zip` |
| 🏎️ **Driftline** | One-thumb neon drift racer | [`driftline/`](driftline/) | `driftline/dist/driftline-*.zip` |
| 🔥 **Emberkeep** | Idle merge tower defense, built for long-term retention | [`emberkeep/`](emberkeep/) | `emberkeep/dist/emberkeep-*.zip` |
| 🎆 **Fuseworks** | **Flagship.** Fireworks chain-reaction roguelike: Sparks × Heat into the billions | [`fuseworks/`](fuseworks/) | `fuseworks/dist/fuseworks-*.zip` |
| 🚀 **Starward** | **Ready to upload.** Slow-burn space empire builder for months of play: rockets, the real Solar System, 32 real star systems, 7 alien civilisations, fleet battles, intergalactic expeditions and Ascension | [`starward/`](starward/) | `starward/dist/starward-*.zip` |
| 🚀 **Helioscend** | **v2 complete, ready to upload.** The 3D evolution of Starward: from one launch pad on a coastal plain to a Type III civilisation, with real bases on Earth, the Moon, Mars and beyond (colonies on the Moon, Mars, Ceres and Titan, a cloud city over Venus, a live Solar System map), people in domes and underground habitats, Mars and Venus terraformed stage by stage in front of you, a real star map with colonies you can visit on exoplanets under other suns and a Dyson swarm around the Sun, a Life Ladder of alien life from microbes under Mars's ice to leviathans in Jupiter's clouds, alien civilisations to meet, trade and ally with, expeditions to other galaxies and Ascension, and a Swarm to fight with fleets in space and the defences of your own base, robots that work for them (collect, assign, fuse), grid layouts with defences and walls, a daily loop (calendar, missions, capsules, spin, weekly events), and daily Orbital Trials against other players' bases: a deterministic battle engine with replays, an adaptive Academy offline, and an optional Cloudflare Worker + D1 server that verifies every battle. TypeScript + Three.js. | [`starward3d/`](starward3d/) | `starward3d/dist/helioscend-*.zip` |
| 💎 **Glint** | **Simulator.** Gem cutting + jewellery shop tycoon; every gem is ray-traced and priced by real light physics | [`glint/`](glint/) | `glint/dist/glint-*.zip` |

Each game ships three zips: **crazygames** (CrazyGames SDK v3), **poki** (Poki SDK v2) and **web** (itch.io / own site). All games are tiny (75–175 KB) with zero image or audio files, use cosmetic-only monetization, and need $0 to build or host. **📤 Uploading:** follow [UPLOAD.md](UPLOAD.md). Each game also has a `store/` folder with covers, a Poki thumbnail, preview videos, screenshots and copy-paste listing text (`store/description.md`). [LAUNCH.md](LAUNCH.md) covers the money plan.

---

# ⛈️ STEALSTORM
**KO rivals. Steal their powers. Survive the storm.**

A 3-minute browser battle royale where every knockout drops your victim's abilities as glowing orbs. Grab them to swap into your kit. Grab a duplicate to **upgrade** it (Lv1 → Lv3). Every match your build turns into something new.

- 🎮 **Play locally:** `python3 -m http.server 8080`, then open http://localhost:8080
- 📦 **Build portal packages:** `node tools/build.mjs` creates `dist/stealstorm-{crazygames,poki,web}.zip`
- ⚖️ **Size:** about 75 KB zipped. Zero image or audio files: all art is drawn in code and all sound is synthesized. It loads instantly.

## Why it hooks players (design pillars)
| Borrowed magic | How Stealstorm does it |
|---|---|
| **Clash of Clans:** steady progress | Trophy Road (heroes unlock by playing), ranks Bronze → Stormlord, account levels, hero mastery, 30-tier Storm Pass, daily quests, 7-day login streak, achievements |
| **League of Legends:** hero variety | 8 heroes, each with a unique weapon, passive and ultimate. Their Q/E kits (16 abilities + 6 rare "wild" abilities from crates) **mix across heroes mid-match**, giving hundreds of combinations |
| **PUBG:** competition + loot | 12-player last-one-standing, shrinking storm, crates, bushes for stealth, a bounty crown on the KO leader, kill feed, streak announcer ("TRIPLE HEIST!") |
| **New: the Steal** | Kills are *loot*. Abilities flow around the map, and a Lv3 power on an enemy (shown as ◆ pips) makes them a target |

## Fair monetization (skill decides, never money)
- **Cosmetics only:** 48 skins, 10 trails, 7 KO effects (show-off moments when you KO someone), emotes, titles.
- **Heroes can never be bought.** They unlock on the Trophy Road.
- **No loot boxes.** Everything is a direct purchase. This keeps it legal in Belgium and the Netherlands and fits portal rules.
- **Storm Pass premium** (450 gems): exclusive Galaxy skins and more. Free players earn gems too.
- **Ads (optional rewarded):** double match gold, a daily gift bonus, a quest reroll. Midgame ads only after a match, never in a player's first 2 matches, and at least 3 minutes apart.

## Code map
```
src/main.js            app state machine, game loop (fixed 60 Hz, consistent at 144/165 Hz)
src/platform.js        CrazyGames v3 / Poki v2 / standalone adapters (ads, cloud save, purchase hook)
src/save.js            profile, economy, quests, pass, trophy road, achievements
src/game/match.js      battle royale simulation (damage, KOs, orbs, storm, projectiles, zones)
src/game/bot.js        human-like bots (skill scales with trophies)
src/game/render.js     procedural canvas art for heroes, map and effects
src/data/*.js          heroes, abilities, cosmetics, progression (tune balance here)
src/ui/*.js            HUD + lobby/shop/pass/quests/locker screens
tools/build.mjs        per-portal zip builder
```
See **LAUNCH.md** for the submission checklist and money plan.
