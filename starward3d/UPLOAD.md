# 🚀 How to upload Helioscend
**Plan: CrazyGames first, then Google Play and the App Store.** Helioscend is a come-back-daily space empire builder: its numbers are retention (day 1, 7, 30) and long average sessions, which CrazyGames rewards and its cloud save supports. The mobile build is the same game with its own platform adapter, kept separate so the store versions can grow (ads, purchases) without touching the web builds.

⚠️ Poki's standard deal is web-exclusive. Helioscend ships no Poki build; if you ever want Poki, pitch them before uploading anywhere else.

Everything you need is in this folder. You don't need to build anything.

## 📦 What to upload (file map)
| What the portal asks for | File | Spec |
|---|---|---|
| Game build (CrazyGames) | the files inside `starward3d/dist/crazygames/` (drag them in; CrazyGames refuses archives) | 9 files, ~1.4 MB, `index.html` at the top, CrazyGames SDK v3. The same files zipped: `starward3d/dist/helioscend-crazygames.zip` |
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
2. Upload the game files (CrazyGames does not accept archives): open `starward3d/dist/crazygames/`, select **everything inside it** (`index.html`, the `assets` folder and `LICENSES.txt`) and drag the selection into the upload zone. `index.html` must sit at the top level, so drag the contents, not the `crazygames` folder itself. (`helioscend-crazygames.zip` holds the same files, for portals that do take a zip.)
3. Fill in the form from `store/description.md`:
   - **Category:** Strategy (alternatives: Simulation, Idle, Casual)
   - **Orientation:** both (the site asks players to rotate if needed; portrait and landscape layouts are built in)
   - **Mobile:** yes · **Language:** English · **Multiplayer:** no (Orbital Trials plays against stored bases, never live) · **In-game purchases:** no
4. **Tick "Progress Save."** The build writes its save through the CrazyGames data module, so a programme follows the player across devices (it also keeps a local copy).
5. Upload the covers, both videos and the screenshots.
6. Before submitting, open the game in the Developer Portal's **QA tool / Preview** and play the first minute.
7. Submit.

### ✅ How the build meets CrazyGames' requirements
| Requirement | How Helioscend meets it |
|---|---|
| Loads and plays in desktop Chrome within 20 s, no errors | About 0.5 MB zipped, 9 files, relative paths only; playable in about 1 s on a desktop and under 1 s with the CPU slowed 4×; no console errors or warnings |
| Works on mobile | Tested on iPhone 13 and Pixel 7 emulation with touch, portrait and landscape (800 × 450), and every CrazyGames iframe size down to 821 × 462; safe-area padding for the CrazyGames app; audio starts on the first tap (iOS rule); device type comes from the SDK, never touch detection |
| Default language English | English throughout (`<html lang="en">`) |
| The first minute is clear, minimal reading | No pop-up on arrival: a one-line title card ("Build a space programme. Reach the stars."), then a bouncing hand points at what to tap with 2-4 word captions (collect → Mission Control → Upgrade → Build → Research Center → place), skippable; other pop-ups wait until it is done; then the goal card's "Show me →" takes over |
| Land directly in gameplay (Full Launch) | Zero clicks: the base is live behind the title card |
| SDK | v3: loading start/stop, gameplay start/stop (stopped while menus are open), happytime, data module saves, mute setting, the player's CrazyGames username as the programme name on a new game; init never holds the game up (5 s timeout) |
| Ads | **Off in the default build** (Basic Launch allows no ads). When CrazyGames selects the game for Full Launch, rebuild with `VITE_CG_ADS=on npm run build`: rewarded ads appear only on a player's tap, and the game works with ad blockers |
| No external links, no custom fullscreen, no app-store links, no other logins | None in the game |
| PEGI 12 | Sci-fi, no gore; robots fight holograms and alien drones |
| Original, own the rights | All code, 3D models, icons, music and sound are original (procedural models, synthesized audio). Third-party pieces are open source and credited: three.js (MIT), Barlow and Oxanium fonts (SIL OFL); `LICENSES.txt` ships in the zip and Settings → Credits says so |
| Tested by someone else | **Your part:** have a friend play through `TESTING.md` (about 15 minutes) before submitting |

## 2️⃣ Google Play and the App Store
Follow `mobile/README.md`: `npm run build:mobile`, then wrap `dist/mobile/` with Capacitor and build in Android Studio / Xcode. When the app goes to the background it schedules local notifications for the next three finished timers, the next supply capsule and the daily reward at 7 pm (and cancels them when the player comes back). Store accounts, signing keys and payment details are yours to set up.

## 3️⃣ itch.io / your own site
Upload `helioscend-web.zip` as an HTML game (no SDK, no ads), set the viewport to fill the window and tick "mobile friendly".

## ⚔️ Orbital Trials online (optional, do it after launch)
The shipped builds play Orbital Trials offline against the **Academy**: adaptive AI commanders whose bases and difficulty grow with yours, so the mode works from day one with no server. To make players assault each other's real bases, deploy the server in `starward3d/server/` (a Cloudflare Worker with a D1 database):
1. Create a free Cloudflare account, then from `starward3d/server/`: `npm install -g wrangler`, `wrangler login`, `wrangler d1 create helioscend_trials` (copy the database id into `wrangler.toml`), `wrangler d1 execute helioscend_trials --remote --file schema.sql`, `wrangler deploy`. It prints your Worker's URL.
2. In `wrangler.toml` set `ALLOWED_ORIGIN` to the domain the game is served from, and `VERIFY`:
   - **Workers Free** (100,000 requests a day, 10 ms of CPU per request): set `VERIFY = "off"`. Re-running a battle to check it takes about 20 ms for a compact base and up to about 100 ms for a sprawling one, over the limit; with verification off the server still enforces sortie limits, merit maths and matchmaking, but trusts the client's result.
   - **Workers Paid** ($5 a month): keep `VERIFY = "on"` and every result is re-simulated on the server before merit move. The D1 free tier (5 GB, 5 million reads and 100,000 writes a day) covers tens of thousands of daily players.
3. Rebuild the game with the URL: `VITE_WAR_SERVER=https://your-worker.workers.dev npm run build`, then upload the new zips. Players appear in each other's matchmaking with their real layouts, colours and merit; the Academy fills in whenever no real opponent is near your merit count.
Details and the full API are in `server/README.md`; `npm run test:server` runs the 25 server tests locally.

## 💰 Monetisation that's already built in
- **Rewarded ads (optional), CrazyGames build only, after Full Launch:** **"▶ Ad: −30 min"** on any running construction or research timer (8 a day), and an extra daily core spin. Off until you rebuild with `VITE_CG_ADS=on` (Basic Launch allows no ads); then they appear only when the portal reports ads are available.
- **No forced ads.** No midgame breaks are fired; the adapter supports them if you ever want one at a natural pause.
- **Dark matter** (finishes timers) is earned from goals, Kardashev milestones, the calendar, missions, new rungs of the Life Ladder and expeditions; nothing is sold. On mobile, AdMob and store billing slot into `src/platform/mobile.ts` without touching game code.

## 🔁 After launch
- Read day-1 and day-7 retention on the portal. The levers: the goal chapters and their rewards (`src/data/objectives.ts`), the calendar and daily missions (`src/core/daily.ts`), study costs and gifts on the Life Ladder (`src/data/life.ts`, `src/core/life.ts`), the Style Studio unlocks (`src/data/style.ts`), food yields and supply-run prices (`src/core/food.ts`), land prices, survey times, energy draw and storms (`src/core/land.ts`), landing sites and what deposits do (`src/data/sites.ts`) and Orbital Trials rewards and circles (`src/data/war.ts`).
- Rebuild with `npm install` (once) and `npm run build` inside `starward3d/`, then regenerate the store assets with `node starward3d/tools/store-assets.cjs` from the repo root (needs Playwright and ffmpeg).
