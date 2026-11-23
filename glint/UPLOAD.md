# 💎 How to upload Glint
**Recommended: pitch to Poki first, CrazyGames if declined.** Poki's tests weigh first-session playtime and conversion to play. Glint shows its best moment (a rock bursting open, then a ray-traced gem) in the first 10 seconds, and the loop runs for hours with an idle layer (offline sales, apprentices, expeditions). CrazyGames' simulation charts are led by Grow a Garden-likes and tycoon games, so Glint also fits there.

⚠️ Poki's standard deal is **web-exclusive for 5 years**, so don't upload Glint anywhere else on the web until Poki answers.

Everything you need is in this folder. You don't need to build anything.

## 📦 What to upload (file map)
| What the portal asks for | File | Spec |
|---|---|---|
| Game build (CrazyGames) | `glint/dist/glint-crazygames.zip` | ~175 KB, `index.html` at the zip root, CrazyGames SDK v3 |
| Game build (Poki) | `glint/dist/glint-poki.zip` | ~175 KB, Poki SDK v2 |
| Game build (itch.io / own site) | `glint/dist/glint-web.zip` | No SDK, no ads |
| Landscape cover | `glint/store/cover-landscape-1920x1080.png` | 1920×1080, title only, no borders |
| Portrait cover | `glint/store/cover-portrait-800x1200.png` | 800×1200 |
| Square cover | `glint/store/cover-square-800x800.png` | 800×800 |
| Landscape preview video | `glint/store/preview-landscape-1920x1080.mp4` | 18 s, silent, opens on the cover |
| Portrait preview video | `glint/store/preview-portrait-1080x1620.mp4` | 18 s, 1080p 2:3 |
| Poki static thumbnail | `glint/store/poki-thumbnail-1024x1024.png` | Square, full-bleed, no text |
| Screenshots | `glint/store/screenshot-1..3.png` | 1920×1080 |
| Title, descriptions, controls, tags | `glint/store/description.md` | Copy and paste |

---

## 1️⃣ Poki, step by step (recommended first)
1. Sign up at **developers.poki.com** (free).
2. **Add your game:** upload `glint-poki.zip`.
3. Run **Poki Inspector** from the dashboard. The build fires `gameLoadingFinished`, `gameplayStart`/`gameplayStop`, `commercialBreak` and `rewardedBreak`.
4. Upload `poki-thumbnail-1024x1024.png` as the static thumbnail. The sparkling diamond on black velvet reads instantly at small sizes.
5. Run the playtests, then the **player fit** and **web fit** tests (aim for 65%+ conversion to play and 5+ min average playtime).
6. If green-lit: **50/50** revenue on Poki traffic, and global release in about 2–3 months.

## 2️⃣ CrazyGames, step by step (if Poki declines)
1. Sign up at **developer.crazygames.com** (free) → **Submit a game** → HTML5.
2. Upload `glint-crazygames.zip`.
3. Fill in the form from `store/description.md`:
   - **Category:** Simulation (alternatives: Casual, Idle)
   - **Orientation:** both (landscape and portrait layouts are built in)
   - **Mobile:** yes · **Multiplayer:** no · **In-game purchases:** no
4. **Tick "Progress Save."** This syncs the shop, vault, codex and upgrades to the player's CrazyGames account.
5. Upload the 3 covers and 2 preview videos from `store/`.
6. Submit. Basic Launch comes first; if players love it, Full Launch follows with ads earning.

## 3️⃣ itch.io (optional, no ads)
Create an HTML project and upload `glint-web.zip`. Tick "played in the browser" with a 1280×720 viewport, fullscreen button and mobile friendly.

---

## 📺 Ads setup (already integrated, nothing to configure)
The game auto-detects the portal: CrazyGames SDK → Poki SDK → none.

**Gameplay events**
- `gameplayStart`: on the first interaction, and whenever a full-screen menu (Market, Vault, Workshop, Codex) closes
- `gameplayStop`: when one of those menus opens, and during every ad
- `happytime` (CrazyGames): Ideal cuts, record-value gems, legendary reveals, commissions delivered
- `loadingStart`/`loadingStop` (CrazyGames) and `gameLoadingFinished` (Poki) during boot

**Midgame / commercial break:** only at the natural pause after a finished gem leaves the bench (displayed, sold or put in the vault). Never during the first 3 gems, and at least 3 minutes apart.

**Rewarded ads (all optional)**
| Where | Button | Limit |
|---|---|---|
| Market → Mystery Rocks | Free mystery rock | 3 per day |
| Market → Expeditions | Halve the remaining expedition time | once per expedition |

Rewards are granted only when the ad completes. Audio is suspended and the simulation pauses during every ad.

**In-game purchases:** **none.** Everything is bought with money earned by cutting and selling gems.

## 🔁 Updating later
1. Edit the code, then run `node tools/build.mjs` in `glint/` to rebuild the zips.
2. If visuals changed, run `node tools/store-assets.cjs glint` from the repo root to regenerate covers, screenshots and videos.
3. Rebalance with `node tools/sim.mjs 8 12` (an economy bot plays 12 hours and reports when each premises tier is reached).
4. If you change cuts or the optics, regenerate the optical optimum table with `node tools/optics-table.mjs` (takes about 3 minutes).
5. Upload the new zip as a new version in each portal.
