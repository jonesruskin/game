# 🚀 How to upload Starward
**Recommended: CrazyGames first, then Poki.** Starward is a long-session, come-back-daily strategy game. Its strength is retention (day 1, 7 and 30), which is what CrazyGames' save sync and its strategy audience reward. Poki's tests weigh the first ten minutes heavily. Starward does well there too (the first rocket flies about 10 minutes in), but its real hook comes later.

⚠️ Poki's standard deal is **web-exclusive for 5 years**. If you want Poki, pitch them **before** uploading anywhere else, and wait for their answer.

Everything you need is in this folder. You don't need to build anything.

## 📦 What to upload (file map)
| What the portal asks for | File | Spec |
|---|---|---|
| Game build (CrazyGames) | `starward/dist/starward-crazygames.zip` | ~270 KB, `index.html` at the zip root, CrazyGames SDK v3 |
| Game build (Poki) | `starward/dist/starward-poki.zip` | ~270 KB, Poki SDK v2 |
| Game build (itch.io / own site) | `starward/dist/starward-web.zip` | No SDK, no ads |
| Landscape cover | `starward/store/cover-landscape-1920x1080.png` | 1920×1080, title only |
| Portrait cover | `starward/store/cover-portrait-800x1200.png` | 800×1200 |
| Square cover | `starward/store/cover-square-800x800.png` | 800×800 |
| Landscape preview video | `starward/store/preview-landscape-1920x1080.mp4` | 18 s, silent, opens on the cover |
| Portrait preview video | `starward/store/preview-portrait-1080x1620.mp4` | 18 s, 2:3 |
| Poki static thumbnail | `starward/store/poki-thumbnail-1024x1024.png` | Square, full-bleed, no text |
| Screenshots | `starward/store/screenshot-1..3.png` | 1920×1080 |
| Title, descriptions, controls, tags | `starward/store/description.md` | Copy and paste |

---

## 1️⃣ CrazyGames, step by step (recommended first)
1. Sign up at **developer.crazygames.com** (free) → **Submit a game** → HTML5.
2. Upload `starward-crazygames.zip`.
3. Fill in the form from `store/description.md`:
   - **Category:** Strategy (alternatives: Simulation, Idle)
   - **Orientation:** both (landscape and portrait layouts are built in)
   - **Mobile:** yes · **Multiplayer:** no · **In-game purchases:** no
4. **Tick "Progress Save."** Starward is designed around a save that lasts months. The build writes its save through the CrazyGames data module, so it follows the player across devices.
5. Upload the covers, the landscape and portrait videos, and the screenshots.
6. Submit. Basic launch takes about a week; full launch depends on the first-week numbers (retention is Starward's strength).

## 2️⃣ Poki, step by step
1. Sign up at **developers.poki.com** (free).
2. **Add your game:** upload `starward-poki.zip`.
3. Run **Poki Inspector** from the dashboard. The build fires `gameLoadingFinished`, `gameplayStart`/`gameplayStop` (stopped while overlays like Research are open), `commercialBreak` and `rewardedBreak` (the optional "watch an ad: −30 minutes" buttons).
4. Upload `poki-thumbnail-1024x1024.png`. The city-lit Earth with a rocket climbing from the limb reads well at small sizes.
5. Run the playtests. Expect strong average playtime; the first liftoff lands about 10 minutes into the first session.

## 3️⃣ itch.io / your own site
Upload `starward-web.zip` as an HTML game (no SDK, no ads), set the viewport to fill the window, and tick "mobile friendly".

## 💰 Monetisation that's already built in
- **Rewarded ads (optional):** "watch an ad: skip 30 minutes" on any construction timer. They only appear when the portal reports ads are available.
- **No forced ads mid-play;** breaks fire only at natural pauses.
- **Dark matter** (finishes timers) is earned from objectives, missions and achievements; nothing is sold.

## 🔁 After launch
- Read the portal's day-1 and day-7 retention. If day-7 is soft, the levers are in `starward/src/data/objectives.js` (rewards) and `DESIGN.md` §10.1 (pacing rules). Re-run `node tools/sim.mjs` after any change: nothing may get stuck.
- Rebuild the zips with `node tools/build.mjs` inside `starward/`, and regenerate store assets with `node tools/store-assets.cjs starward` from the repo root.
