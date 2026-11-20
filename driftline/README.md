# 🏎️ DRIFTLINE — One-thumb neon drift racing
**Hold a turn to drift. Let go to boost.** The longer the drift, the bigger the boost (blue → orange → purple). The car accelerates by itself, so it's perfect for mobile: hold the left or right half of the screen.

**📦 Upload-ready zips:** [`dist/driftline-crazygames.zip`](dist/driftline-crazygames.zip) · [`dist/driftline-poki.zip`](dist/driftline-poki.zip) · [`dist/driftline-web.zip`](dist/driftline-web.zip) (~41 KB each)

## Modes
- **Career:** 5 cups × 3 tracks against 5 named rivals. Finish 1st/2nd/3rd for ⭐⭐⭐/⭐⭐/⭐. 45 stars unlock cups and cars.
- **Quick Race:** a random procedural track. Trophies decide your league (Rookie → Drift King), and rivals get smarter as you climb.
- **Daily Track:** a brand-new track every day, the same for everyone. Gold/silver/bronze medal times come from a perfect AI lap, and a **copy-to-share** result card spreads the game.
- **Ghosts:** every track saves your best lap, and next time you race your own ghost.

## Why it's sticky
- An instantly understandable one-button skill with a high mastery ceiling (drift timing, racing lines, boost chaining).
- Progress: stars, leagues, car unlocks, achievements, daily quests and a login streak.
- **6 cars with an equal performance budget**: different feel, no "best" car. Skill decides.
- Cosmetics only: paints (including animated chrome), decals, underglow, tire smoke.

## Run / build
```bash
python3 -m http.server 8080      # open http://localhost:8080
node tools/build.mjs             # rebuild dist/*.zip
```
Code: `src/race.js` (track generator, physics, AI, renderer), `src/data.js`, `src/ui.js`, `src/save.js`, `src/main.js`.
