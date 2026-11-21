# 🔥 How to upload Emberkeep
**Recommended: pitch to Poki first.** Poki's selection tests measure playtime, and idle merge games score very well on that (Poki's guide aims for 5+ minutes; an Emberkeep battle alone lasts 7–30 minutes, and players come back for offline earnings). If Poki declines, go to CrazyGames, where idle and merge are top categories and in-game purchases can be added later (invite-only through Xsolla).

⚠️ Poki's standard deal is **web-exclusive for 5 years**, so don't upload this game anywhere else on the web until Poki answers.

Everything you need is in this folder. You don't need to build anything.

## 📦 What to upload (file map)
| What the portal asks for | File | Spec |
|---|---|---|
| Game build (CrazyGames) | `emberkeep/dist/emberkeep-crazygames.zip` | 45 KB, `index.html` at the zip root, CrazyGames SDK v3 |
| Game build (Poki) | `emberkeep/dist/emberkeep-poki.zip` | 45 KB, Poki SDK v2 |
| Game build (itch.io / own site) | `emberkeep/dist/emberkeep-web.zip` | No SDK, no ads |
| Landscape cover | `emberkeep/store/cover-landscape-1920x1080.png` | 1920×1080, title only, no borders |
| Portrait cover | `emberkeep/store/cover-portrait-800x1200.png` | 800×1200 |
| Square cover | `emberkeep/store/cover-square-800x800.png` | 800×800 |
| Landscape preview video | `emberkeep/store/preview-landscape-1920x1080.mp4` | 18 s, silent, opens on the cover |
| Portrait preview video | `emberkeep/store/preview-portrait-1080x1620.mp4` | 18 s, 1080p 2:3 |
| Poki static thumbnail | `emberkeep/store/poki-thumbnail-1024x1024.png` | Square, no text |
| Poki animated thumbnail (draft) | `emberkeep/store/poki-animated-thumbnail-628x628.mp4` | 6 s hover clip. Check Poki's spec at soft release. |
| Screenshots | `emberkeep/store/screenshot-1..3.png` | 1920×1080 |
| Title, descriptions, controls, tags | `emberkeep/store/description.md` | Copy and paste |

---

## 1️⃣ Poki, step by step (recommended first)
1. Sign up at **developers.poki.com** (free).
2. **Add your game:** upload `emberkeep-poki.zip`.
3. Run **Poki Inspector** from the dashboard. The build fires `gameLoadingFinished`, `gameplayStart`/`gameplayStop`, `commercialBreak` and `rewardedBreak`.
4. Upload `poki-thumbnail-1024x1024.png` as the static thumbnail.
5. Run free **playtests**, then the **player fit test** (aim for 3+ min average playtime, 25%+ of plays over 3 min), then the **web fit test** (aim for 65%+ conversion to play and 5+ min average playtime).
6. **Final review:** a decision in 1–2 weeks. If green-lit: **50/50** revenue on Poki traffic, and global release in about 2–3 months.
7. At soft release, add the animated thumbnail, starting from `poki-animated-thumbnail-628x628.mp4`.

## 2️⃣ CrazyGames, step by step (if Poki declines, or for a non-exclusive plan)
1. Sign up at **developer.crazygames.com** (free) → **Submit a game** → HTML5.
2. Upload `emberkeep-crazygames.zip`.
3. Fill in the form from `store/description.md`:
   - Title, description and controls
   - **Category:** Idle (or Tower Defense / Merge)
   - **Orientation:** both (landscape and portrait work)
   - **Mobile:** yes · **Multiplayer:** no · **In-game purchases:** no (for now)
4. **Tick "Progress Save."** Important: this keeps players' workshop, lab and offline timers in the cloud.
5. Upload the 3 covers and 2 preview videos from `store/`.
6. Submit. You'll get **Basic Launch** first (small audience, ads off), then **Full Launch** if players love it (ads earning). Set up payouts (Tipalti, monthly from €100).

## 3️⃣ itch.io (optional, no ads)
Create an HTML project and upload `emberkeep-web.zip`. Tick "played in the browser" with a 1280×720 viewport, fullscreen button and mobile friendly.

---

## 📺 Ads setup (already integrated, nothing to configure)
The game auto-detects the portal: CrazyGames SDK → Poki SDK → none.

**Gameplay events**
- `gameplayStart`: a battle starts or resumes
- `gameplayStop`: a battle ends, pauses, or the tab is hidden
- `happytime` (CrazyGames): a new best wave of 20 or more
- Loading events fire during boot

**Midgame / commercial break**
- **CrazyGames:** only after a battle, when tapping *Defend again* or *Upgrade*. Never in the first 2 battles, at least 3 minutes and 2 battles apart.
- **Poki:** `commercialBreak()` on every *Defend again*. Poki controls frequency, and the game runs no timers of its own.

**Rewarded ads (optional, each with a free alternative)**
| Where | Button | Limit |
|---|---|---|
| Welcome-back popup | 📺 Collect ×2 offline coins (free option: Collect ×1) | each return |
| Wisps screen | 📺 Claim 2 daily chests (free option: Claim 1) | once per day |

- Rewards are granted only when the ad completes.
- Audio is muted during ads.
- No "ad blocked" messages appear on Poki.

**In-game purchases:** **off** (`Platform.purchasesAvailable = false` in `src/platform.js`). Gems (cosmetics only) are earned from quests, logins and achievements. Never enable purchases on Poki.

## 🔁 Updating later
1. Edit the code, then run `node tools/build.mjs` in `emberkeep/` to rebuild the zips.
2. If visuals changed, run `node tools/store-assets.cjs emberkeep` from the repo root to regenerate covers and videos.
3. Upload the new zip as a new version in each portal.
