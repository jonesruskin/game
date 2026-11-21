# 🚀 Upload Guide: all 4 games
| Game | Guide | Build zips | Store assets | Recommended first platform |
|---|---|---|---|---|
| ⛈️ Stealstorm | this file (below) | `dist/` | `store/` | CrazyGames |
| 🐜 Hordemind | [`hordemind/UPLOAD.md`](hordemind/UPLOAD.md) | `hordemind/dist/` | `hordemind/store/` | **Poki** (then CrazyGames if declined) |
| 🏎️ Driftline | [`driftline/UPLOAD.md`](driftline/UPLOAD.md) | `driftline/dist/` | `driftline/store/` | CrazyGames |
| 🔥 Emberkeep | [`emberkeep/UPLOAD.md`](emberkeep/UPLOAD.md) | `emberkeep/dist/` | `emberkeep/store/` | **Poki** (then CrazyGames if declined) |

**Before you start (one time, ~15 minutes):**
1. Create free developer accounts at **developer.crazygames.com** and **developers.poki.com**. Neither charges upload fees, and neither publishes a limit on how many games you can submit.
2. Decide which game goes to Poki *before* uploading it anywhere. Poki's revenue-share deal requires the game to be **web-exclusive** (Steam and app stores are fine).
3. Download the files: on GitHub, open each `.zip` / `.png` / `.mp4` and click **Download raw file**, or clone the repo.
4. Submit one game at a time and read the QA feedback. CrazyGames only accepts resubmissions with "clear improvements".

**To regenerate assets** (only needed after visual changes): `node tools/store-assets.cjs` creates covers, thumbnails, screenshots and videos for all three games. It needs Playwright and ffmpeg.

---

# ⛈️ How to upload Stealstorm
**Recommended:** CrazyGames first. Battle royales are a top category on CrazyGames, and CrazyGames allows in-game purchases later (invite-only through Xsolla). Poki never allows them.

Everything you need is in this folder. You don't need to build anything.

## 📦 What to upload (file map)
| What the portal asks for | File in this repo | Spec |
|---|---|---|
| Game build (CrazyGames) | `dist/stealstorm-crazygames.zip` | 74 KB, `index.html` at the zip root, CrazyGames SDK v3 included |
| Game build (Poki) | `dist/stealstorm-poki.zip` | 74 KB, Poki SDK v2 included |
| Game build (itch.io / own site) | `dist/stealstorm-web.zip` | 74 KB, no SDK, no ads |
| Landscape cover | `store/cover-landscape-1920x1080.png` | 1920×1080 (16:9), title only, no borders |
| Portrait cover | `store/cover-portrait-800x1200.png` | 800×1200 (2:3) |
| Square cover | `store/cover-square-800x800.png` | 800×800 (1:1) |
| Landscape preview video | `store/preview-landscape-1920x1080.mp4` | 18 s, silent, H.264, opens on the cover, under 50 MB |
| Portrait preview video | `store/preview-portrait-1080x1620.mp4` | 18 s, 1080p 2:3, silent |
| Poki static thumbnail | `store/poki-thumbnail-1024x1024.png` | Square, full-bleed, **no text** (Poki asks for at least 628×628) |
| Poki animated thumbnail (draft) | `store/poki-animated-thumbnail-628x628.mp4` | 6 s square hover clip. Check it against Poki's spec at soft release. |
| Screenshots | `store/screenshot-1.png` … `screenshot-3.png` | 1920×1080 in-game shots |
| Title, descriptions, controls, tags | `store/description.md` | Copy and paste |

---

## 1️⃣ CrazyGames, step by step
✅ **Recommended platform for this game.**

1. **Create a developer account (free):** go to **developer.crazygames.com** and sign up. There is no upload fee and no stated limit on games.
2. Click **Submit a game / Add game** and choose **HTML5**.
3. **Upload the build:** `dist/stealstorm-crazygames.zip`.
4. **Fill in the game details** from `store/description.md`:
   - **Title:** Stealstorm
   - **Description:** paste *Full description*
   - **Controls / instructions:** paste *Controls* (desktop and mobile)
   - **Category & tags:** Shooting → Battle Royale (or .io), plus the suggested tags
   - **Orientation:** Landscape · **Mobile:** yes (touch controls built in) · **Languages:** English
   - **Multiplayer:** No · **In-game purchases:** No (for now)
5. **Tick "Progress Save"** if the form offers it. This enables the CrazyGames data module, so logged-in players' progress syncs to the cloud. The game already uses it.
6. **Upload the covers:** landscape, portrait and square PNGs from `store/`.
7. **Upload both preview videos:** landscape and portrait MP4s from `store/`.
8. **Submit.** CrazyGames emails you the QA result:
   - **Basic Launch:** shown to a small group of players. Ads are **off** at this stage. That's normal.
   - **Full Launch:** if players like it, it gets a second QA review, then goes live everywhere and **ads start earning**.
9. **Set up payouts:** in the developer portal, complete the payout/tax details (Tipalti). Payouts are monthly once you reach €100.

### CrazyGames QA checklist (already handled in the code)
- [x] Gameplay starts in one click (first launch drops straight into an easy tutorial match)
- [x] No custom fullscreen button, no external links, no other ad networks
- [x] Audio is muted during ads and follows the CrazyGames "mute" setting
- [x] Pauses on tab switch · `user-select: none` · safe-area padding for the mobile app
- [x] Readable at 800×450 (mobile iframe) up to 1920×1080
- [x] English text · original art · no loot boxes

---

## 2️⃣ Poki, step by step
⚠️ Optional. Poki's standard deal is **web-exclusive for 5 years**. If this game is already live on CrazyGames, Poki will only offer a one-time flat fee (no revenue share). Decide *before* uploading anywhere.

1. **Apply:** go to **developers.poki.com** and create an account. The testing tools are free and there's no submission fee.
2. **Add your game:** upload `dist/stealstorm-poki.zip`. It passes an automatic content check.
3. **Run it through Poki Inspector** (linked in their dashboard) to confirm the SDK events fire. They do: the build calls `gameLoadingFinished`, `gameplayStart`/`gameplayStop`, `commercialBreak` and `rewardedBreak`.
4. **Add the static thumbnail:** `store/poki-thumbnail-1024x1024.png`. It has no text, as Poki requires, and its colours stay away from Poki's mint background (#83FFE7).
5. **Run playtests (free):** you get 10 recorded sessions per test. Watch where players get confused.
6. **Player fit test** (500 players): aim for **3+ minutes average playtime** and **25%+ of plays over 3 minutes**.
7. **Web fit test** (about 1 week): Poki's guide says aim for **65%+ of visitors starting to play** and **5+ minutes average playtime**.
8. **Final review:** a decision within 1–2 weeks. If green-lit, you sign a deal (**50/50** on Poki traffic, 100% on traffic you bring) and release takes about 2–3 months.
9. **At soft release**, Poki asks for an **animated thumbnail**. Start from `store/poki-animated-thumbnail-628x628.mp4`.

Poki-specific behaviour (already handled in the code): **no in-game purchases or purchase buttons** on Poki builds, **no ad timers** of our own (Poki decides frequency), ad breaks only when returning to gameplay, rewarded buttons are pink (never green) with a 📺 icon, and no "ad blocked" messages.

---

## 3️⃣ itch.io / your own website (optional, no ads)
1. Create a project at **itch.io** (free), set *Kind of project* to **HTML**, and upload `dist/stealstorm-web.zip`.
2. Tick **"This file will be played in the browser"**. Set the viewport to 1280×720, enable **fullscreen button** and **mobile friendly**.
3. Use the covers and `store/description.md` for the page. You can monetize with "name your price" donations.

---

## 📺 Ads setup (already integrated, nothing to configure)
The game detects which portal it's on automatically: CrazyGames SDK → Poki SDK → no ads.

**Gameplay events**
- `gameplayStart`: when a match starts or resumes from pause
- `gameplayStop`: when the match ends, or the game is paused / the tab is hidden
- `happytime` (CrazyGames): on winning a match (#1)
- `loadingStart` / `loadingStop` (CrazyGames), `gameLoadingFinished` (Poki): during boot

**Midgame / commercial break**
- **CrazyGames:** only after a match, when the player taps *Play again* or *Lobby*. Never in the player's first 2 matches, at most once every 3 minutes, and at least 2 matches apart. The SDK also enforces its own 3-minute cooldown.
- **Poki:** a `commercialBreak()` call each time the player taps *Play again* (back into gameplay). Poki decides whether an ad actually plays.

**Rewarded ads (always optional, always with a free alternative)**
| Where | Button | Limit |
|---|---|---|
| Results screen | 📺 +X Gold (doubles the match gold) | once per match |
| Shop | 📺 Claim 150 🪙 daily gift (free option: 50 🪙) | once per day |
| Quests | 📺 Reroll a quest | max 2 per day |

Rewards are granted **only** when the ad finishes (`adFinished` / `rewardedBreak` returns success), never on error.

**Audio:** muted when an ad starts and restored afterwards.

**Save data:** stored under the key `stealstorm_profile_v1`. On CrazyGames it uses the data module (cloud sync), elsewhere `localStorage`.

**In-game purchases:** currently **off** everywhere (`Platform.purchasesAvailable = false` in `src/platform.js`). On CrazyGames they're invite-only through Xsolla, so apply once the game has traction and wire up `Platform.purchase()`. Never enable them on Poki.

---

## 🔁 Updating the game later
1. Edit the code, then run `node tools/build.mjs` inside `the repo root` to rebuild the zips.
2. If visuals changed, regenerate covers and videos from the repo root: `node tools/store-assets.cjs stealstorm` (needs Playwright and ffmpeg).
3. Upload the new zip as a new version in each portal's dashboard.
