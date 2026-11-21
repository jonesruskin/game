# 🔥 EMBERKEEP: idle merge tower defense
**Keep the last ember alive through an endless night.** Summon wisps, merge identical twins into stronger random wisps, survive endless waves, and upgrade your Keep forever, even while you're away.

**📦 Upload-ready zips:** [`dist/emberkeep-crazygames.zip`](dist/emberkeep-crazygames.zip) · [`dist/emberkeep-poki.zip`](dist/emberkeep-poki.zip) · [`dist/emberkeep-web.zip`](dist/emberkeep-web.zip) (~45 KB each)
**📤 How to upload:** [UPLOAD.md](UPLOAD.md) · covers, videos and listing text in [`store/`](store/)

## Why this one is built for hours and days (first principles)
It fuses two proven retention formulas: **The Tower: Idle Tower Defense** (months-long retention) and **Random Dice / Rush Royale** (top-grossing merge defense).

| Retention loop | Timescale | In Emberkeep |
|---|---|---|
| Micro-decisions | seconds | Summon, then drag twins together. Every merge rolls a random wisp, so there's always a "should I merge now?" choice. |
| In-run growth | minutes | Embers buy summons or power-ups. Waves never end, and bosses every 10 waves drop chests. |
| Permanent power | per run | **Workshop:** 13 upgrade tracks with exponential costs, so there's always a next purchase. |
| Come-back hooks | hours | **Lab research** runs in real time while the game is closed, and **offline earnings** greet you on return. |
| Automation | hours to days | Research **Auto-Summon → Auto-Merge → Auto-Power → Time Warp**. The game rewards your time investment with convenience. |
| Long ladder | days to weeks | **8 tiers** (enemies ×3, coins ×2 each), 9 wisps × 20 collection levels, achievements, daily quests and login streak. |

Balance was tuned with progression simulations over 15+ hours of simulated play. Runs go wave ~25 → 50 → 70+ within the first hours, Tier 2 unlocks within about 20 minutes, Tier 3 within about 1.5 hours, then a long climb through wisp levels and tiers with no runaway economy.

## Fair monetization
- Only cosmetics are for sale (Ember skins and battlefield themes, bought with gems).
- All power comes from playing.
- Chests are earned only by playing, never sold.
- Rewarded ads are optional (double offline coins, a second daily chest).

## Run / build
```bash
python3 -m http.server 8080      # from the repo root → http://localhost:8080/emberkeep/
node tools/build.mjs             # (inside emberkeep/) rebuild dist/*.zip
```
Code: `src/sim.js` (battle simulation and autopilot), `src/data.js` (all economy curves), `src/stats.js`, `src/save.js` (offline and lab timers), `src/render.js`, `src/ui.js`, `src/main.js`.
