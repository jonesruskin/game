# 🚀 How to upload Helioscend
**Plan: CrazyGames first, then Google Play and the App Store.** Helioscend is a come-back-daily space empire builder: its numbers are retention (day 1, 7, 30) and long average sessions, which CrazyGames rewards and its cloud save supports. The mobile build is the same game with its own platform adapter, kept separate so the store versions can grow (ads, purchases) without touching the web builds.

⚠️ Poki's standard deal is web-exclusive. Helioscend ships no Poki build; if you ever want Poki, pitch them before uploading anywhere else.

Everything you need is in this folder. You don't need to build anything.

## 📦 What to upload (file map)
| What the portal asks for | File | Spec |
|---|---|---|
| Game build (CrazyGames) | `starward3d/dist/helioscend-crazygames.zip` | ~450 KB, `index.html` at the zip root, CrazyGames SDK v3 |
| Game build (itch.io / own site) | `starward3d/dist/helioscend-web.zip` | No SDK, no ads |
| Mobile web assets | `starward3d/dist/mobile/` | Wrap with Capacitor, see `mobile/README.md` |
| Landscape cover | `starward3d/store/cover-landscape-1920x1080.png` | 1920×1080 |
| Portrait cover | `starward3d/store/cover-portrait-800x1200.png` | 800×1200 |
| Square cover | `starward3d/store/cover-square-800x800.png` | 800×800 |
| Landscape preview video | `starward3d/store/preview-landscape-1920x1080.mp4` | 18 s, silent, opens on the cover |
| Portrait preview video | `starward3d/store/preview-portrait-1080x1620.mp4` | 18 s, 2:3 |
| Square thumbnail (no text) | `starward3d/store/poki-thumbnail-1024x1024.png` | 1024×1024, full-bleed |
| Screenshots | `starward3d/store/screenshot-1..6.png` | 1920×1080: the spaceport, a terraformed Mars colony, the Life Ladder, an Orbital Trials assault, the Local Group, claiming land on the Moon |
| Title, descriptions, controls, tags | `starward3d/store/description.md` | Copy and paste |

---

## 1️⃣ CrazyGames, step by step
1. Sign up at **developer.crazygames.com** (free) → **Submit a game** → HTML5.
2. Upload `helioscend-crazygames.zip`.
3. Fill in the form from `store/description.md`:
   - **Category:** Strategy (alternatives: Simulation, Idle, Casual)
   - **Orientation:** both (portrait and landscape layouts are built in)
   - **Mobile:** yes · **Multiplayer:** no (Orbital Trials plays against stored player bases, never live) · **In-game purchases:** no
4. **Tick "Progress Save."** The build writes its save through the CrazyGames data module, so a programme follows the player across devices. It also keeps a local copy.
5. Upload the covers, both videos and the screenshots.
6. Submit. The build already sends `loadingStart`/`loadingStop`, `gameplayStart`/`gameplayStop` (stopped while menus are open) and `happytime` (milestones, first contact, discoveries, expeditions).

## 2️⃣ Google Play and the App Store
Follow `mobile/README.md`: `npm run build:mobile`, then wrap `dist/mobile/` with Capacitor and build in Android Studio / Xcode. When the app goes to the background it schedules local notifications for the next three finished timers, the next supply capsule and the daily reward at 7 pm (and cancels them when the player comes back). Store accounts, signing keys and payment details are yours to set up.

## 3️⃣ itch.io / your own site
Upload `helioscend-web.zip` as an HTML game (no SDK, no ads), set the viewport to fill the window and tick "mobile friendly".

## ⚔️ Orbital Trials online (optional, do it after launch)
The shipped builds play Orbital Trials offline against the **Academy**: adaptive AI commanders whose bases and difficulty grow with yours, so the mode works from day one with no server. To make players assault each other's real bases, deploy the server in `starward3d/server/` (a Cloudflare Worker with a D1 database):
1. Create a free Cloudflare account, then from `starward3d/server/`: `npm install -g wrangler`, `wrangler login`, `wrangler d1 create helioscend_trials` (copy the database id into `wrangler.toml`), `wrangler d1 execute helioscend_trials --remote --file schema.sql`, `wrangler deploy`. It prints your Worker's URL.
2. In `wrangler.toml` set `ALLOWED_ORIGIN` to the domain the game is served from, and `VERIFY`:
   - **Workers Free** (100,000 requests a day, 10 ms of CPU per request): set `VERIFY = "off"`. Re-running a battle to check it takes about 20 ms, over the limit; with verification off the server still enforces sortie limits, merit maths and matchmaking, but trusts the client's result.
   - **Workers Paid** ($5 a month): keep `VERIFY = "on"` and every result is re-simulated on the server before merit move. The D1 free tier (5 GB, 5 million reads and 100,000 writes a day) covers tens of thousands of daily players.
3. Rebuild the game with the URL: `VITE_WAR_SERVER=https://your-worker.workers.dev npm run build`, then upload the new zips. Players appear in each other's matchmaking with their real layouts, colours and merit; the Academy fills in whenever no real opponent is near your merit count.
Details and the full API are in `server/README.md`; `npm run test:server` runs the 25 server tests locally.

## 💰 Monetisation that's already built in
- **Rewarded ads (optional), CrazyGames build only:** **"▶ Ad: −30 min"** on any running construction or research timer (8 a day), and an extra daily core spin. They appear only when the portal reports ads are available.
- **No forced ads.** No midgame breaks are fired; the adapter supports them if you ever want one at a natural pause.
- **Dark matter** (finishes timers) is earned from goals, Kardashev milestones, the calendar, missions, new rungs of the Life Ladder and expeditions; nothing is sold. On mobile, AdMob and store billing slot into `src/platform/mobile.ts` without touching game code.

## 🔁 After launch
- Read day-1 and day-7 retention on the portal. The levers: the goal chapters and their rewards (`src/data/objectives.ts`), the calendar and daily missions (`src/core/daily.ts`), study costs and gifts on the Life Ladder (`src/data/life.ts`, `src/core/life.ts`), the Style Studio unlocks (`src/data/style.ts`), food yields and supply-run prices (`src/core/food.ts`), land prices, survey times, energy draw and storms (`src/core/land.ts`), landing sites and what deposits do (`src/data/sites.ts`) and Orbital Trials rewards and circles (`src/data/war.ts`).
- Rebuild with `npm install` (once) and `npm run build` inside `starward3d/`, then regenerate the store assets with `node starward3d/tools/store-assets.cjs` from the repo root (needs Playwright and ffmpeg).
