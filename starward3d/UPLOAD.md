# 🚀 How to upload Starward 3D
**Plan: CrazyGames first, then Google Play and the App Store.** Starward 3D is a come-back-daily collector: its numbers are retention (day 1, 7, 30) and long average sessions, which CrazyGames rewards and its cloud save supports. The mobile build is the same game with its own platform adapter, kept separate so the store versions can grow (ads, purchases, notifications) without touching the web builds.

⚠️ Poki's standard deal is web-exclusive. Starward 3D ships no Poki build; if you ever want Poki, pitch them before uploading anywhere else.

Everything you need is in this folder. You don't need to build anything.

## 📦 What to upload (file map)
| What the portal asks for | File | Spec |
|---|---|---|
| Game build (CrazyGames) | `starward3d/dist/starward3d-crazygames.zip` | ~320 KB, `index.html` at the zip root, CrazyGames SDK v3 |
| Game build (itch.io / own site) | `starward3d/dist/starward3d-web.zip` | No SDK, no ads |
| Mobile web assets | `starward3d/dist/mobile/` | Wrap with Capacitor, see `mobile/README.md` |
| Landscape cover | `starward3d/store/cover-landscape-1920x1080.png` | 1920×1080 |
| Portrait cover | `starward3d/store/cover-portrait-800x1200.png` | 800×1200 |
| Square cover | `starward3d/store/cover-square-800x800.png` | 800×800 |
| Landscape preview video | `starward3d/store/preview-landscape-1920x1080.mp4` | 18 s, silent, opens on the cover |
| Portrait preview video | `starward3d/store/preview-portrait-1080x1620.mp4` | 18 s, 2:3 |
| Square thumbnail (no text) | `starward3d/store/poki-thumbnail-1024x1024.png` | 1024×1024, full-bleed |
| Screenshots | `starward3d/store/screenshot-1..3.png` | 1920×1080: the colony, an Arena battle, the Solar System |
| Title, descriptions, controls, tags | `starward3d/store/description.md` | Copy and paste |

---

## 1️⃣ CrazyGames, step by step
1. Sign up at **developer.crazygames.com** (free) → **Submit a game** → HTML5.
2. Upload `starward3d-crazygames.zip`.
3. Fill in the form from `store/description.md`:
   - **Category:** Simulation (alternatives: Strategy, Idle, Casual)
   - **Orientation:** both (portrait and landscape layouts are built in)
   - **Mobile:** yes · **Multiplayer:** no · **In-game purchases:** no
4. **Tick "Progress Save."** The build writes its save through the CrazyGames data module, so a colony follows the player across devices. It also keeps a local copy.
5. Upload the covers, both videos and the screenshots.
6. Submit. The build already sends `loadingStart`/`loadingStop`, `gameplayStart`/`gameplayStop` (stopped while menus are open) and `happytime` (level-ups, evolving a Relic AI).

## 2️⃣ Google Play and the App Store
Follow `mobile/README.md`: `npm run build:mobile`, then wrap `dist/mobile/` with Capacitor and build in Android Studio / Xcode. Local notifications are already scheduled by the game (full bays, finished recipes, supply drops, the daily reward at 7 pm). Store accounts, signing keys and payment details are yours to set up.

## 3️⃣ itch.io / your own site
Upload `starward3d-web.zip` as an HTML game (no SDK, no ads), set the viewport to fill the window and tick "mobile friendly".

## 💰 Monetisation that's already built in
- **Rewarded ads (optional), CrazyGames build only:** double today's login reward, an extra daily core spin, and **"▶ Ad: −30 min"** on any running timer (construction, recipes, fusion, assembly, crystal digs). They appear only when the portal reports ads are available.
- **No forced ads.** No midgame breaks are fired; the adapter supports them if you ever want one at a natural pause.
- **Dark Matter** (finishes timers) is earned from missions, achievements, the calendar and events; nothing is sold. On mobile, AdMob and store billing slot into `src/platform/mobile.ts` without touching game code.

## 🔁 After launch
- Read day-1 and day-7 retention on the portal. The levers: mission rewards (`src/data/progress.ts`), the calendar and daily missions (`src/core/daily.ts`), event milestones (`src/core/events.ts`) and the Style Locker unlocks (`src/data/cosmetics.ts`).
- Rebuild with `npm install` (once) and `npm run build` inside `starward3d/`, then regenerate the store assets with `node starward3d/tools/store-assets.cjs` from the repo root (needs Playwright and ffmpeg).
