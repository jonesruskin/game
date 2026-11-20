# 🐜 HORDEMIND — You are the horde
A **reverse survivors** game. In Vampire Survivors-style games you fight the swarm. Here **you are the swarm**: a bug Queen commanding 100+ minions against a giant hero boss.

**📦 Upload-ready zips:** [`dist/hordemind-crazygames.zip`](dist/hordemind-crazygames.zip) · [`dist/hordemind-poki.zip`](dist/hordemind-poki.zip) · [`dist/hordemind-web.zip`](dist/hordemind-web.zip) (~48 KB each)

**📤 How to upload:** see [UPLOAD.md](UPLOAD.md). Covers, videos, thumbnails and listing text are in [`store/`](store/).

## Core loop (3-minute hunts)
- **Hold to SWARM:** every minion charges the hero. **Release** to pull them back.
- The hero **telegraphs** each attack with a red zone. The core skill is pulling the swarm out just in time, then flooding back in.
- Fallen minions drop **biomass**. Your Queen must risk getting close to collect it and hatch more.
- **Evolution cards** appear every ~13% of hero HP: new species, mutations (acid blood, mitosis, neurotoxin…). Every run builds a different swarm.
- The hero **levels up every 28s** and eventually **enrages**, so there's always a clock.

## Why it's sticky
| Pillar | Hordemind |
|---|---|
| Clash-style progress | **The Hive**: 6 buildings upgraded with Ichor earned by hunting. Permanent, visible growth. |
| LoL-style variety | **5 Queens** × **6 species** × **18 evolutions** against **6 hero bosses**, each with unique telegraphed kits (Paladin, Pyromancer, Ranger, Frost giant, Engineer with turrets, Necromancer who raises *your* dead). |
| Competition | **3 difficulties per hero = 18 stars**, plus a **Daily Hunt** (same hero, queen and mutator for everyone) with a **copy-to-share result** (Wordle-style virality, no external links). |

## Monetization (never pay-to-win)
Swarm palettes, queen skins and splat effects only. Power comes only from the Hive, which is earned by playing. Rewarded ads are optional (double Ichor, daily gift ×3). Midgame ads only between hunts.

## Run / build
```bash
python3 -m http.server 8080      # open http://localhost:8080
node tools/build.mjs             # rebuild dist/*.zip
```
Code: `src/game.js` (simulation + renderer + autopilot), `src/data.js` (all tuning), `src/ui.js`, `src/save.js`, `src/main.js`.
