# 🎆 How to upload Fuseworks
**Recommended: pitch to Poki first.** Poki's selection tests weigh first-session playtime and conversion to play above everything else. Fuseworks hands out its biggest reward in the first 8 seconds (the tutorial's first tap is a guaranteed Grand Finale), and a single run lasts 10–35 minutes. That profile scores very well on Poki. If Poki declines, upload to CrazyGames.

⚠️ Poki's standard deal is **web-exclusive for 5 years**, so don't upload this game anywhere else on the web until Poki answers.

Everything you need is in this folder. You don't need to build anything.

## 📦 What to upload (file map)
| What the portal asks for | File | Spec |
|---|---|---|
| Game build (CrazyGames) | `fuseworks/dist/fuseworks-crazygames.zip` | ~140 KB, `index.html` at the zip root, CrazyGames SDK v3 |
| Game build (Poki) | `fuseworks/dist/fuseworks-poki.zip` | ~140 KB, Poki SDK v2 |
| Game build (itch.io / own site) | `fuseworks/dist/fuseworks-web.zip` | No SDK, no ads |
| Landscape cover | `fuseworks/store/cover-landscape-1920x1080.png` | 1920×1080, title only, no borders |
| Portrait cover | `fuseworks/store/cover-portrait-800x1200.png` | 800×1200 |
| Square cover | `fuseworks/store/cover-square-800x800.png` | 800×800 |
| Landscape preview video | `fuseworks/store/preview-landscape-1920x1080.mp4` | 18 s, silent, opens on the cover |
| Portrait preview video | `fuseworks/store/preview-portrait-1080x1620.mp4` | 18 s, 1080p 2:3 |
| Poki static thumbnail | `fuseworks/store/poki-thumbnail-1024x1024.png` | Square, full-bleed, no text |
| Poki animated thumbnail (draft) | `fuseworks/store/poki-animated-thumbnail-628x628.mp4` | 6 s hover clip. Check it against Poki's spec at soft release. |
| Screenshots | `fuseworks/store/screenshot-1..3.png` | 1920×1080 |
| Title, descriptions, controls, tags | `fuseworks/store/description.md` | Copy and paste |

---

## 1️⃣ Poki, step by step (recommended first)
1. Sign up at **developers.poki.com** (free).
2. **Add your game:** upload `fuseworks-poki.zip`.
3. Run **Poki Inspector** from the dashboard. The build fires `gameLoadingFinished`, `gameplayStart`/`gameplayStop`, `commercialBreak` and `rewardedBreak`.
4. Upload `poki-thumbnail-1024x1024.png` as the static thumbnail. It is bright and colourful, which Poki says lifts conversion.
5. Run the free **playtests**, then the **player fit test** (aim for 3+ min average playtime), then the **web fit test** (aim for 65%+ conversion to play and 5+ min average playtime).
6. **Final review:** a decision usually comes in 1–2 weeks. If green-lit: **50/50** revenue on Poki traffic, and global release in about 2–3 months.
7. At soft release, add the animated thumbnail (start from `poki-animated-thumbnail-628x628.mp4`).

## 2️⃣ CrazyGames, step by step (if Poki declines, or for a non-exclusive plan)
1. Sign up at **developer.crazygames.com** (free) → **Submit a game** → HTML5.
2. Upload `fuseworks-crazygames.zip`.
3. Fill in the form from `store/description.md`:
   - Title, description and controls
   - **Category:** Puzzle (alternatives: Strategy or Casual)
   - **Orientation:** both (landscape and portrait work; the smallest 800×450 iframe was tested)
   - **Mobile:** yes · **Multiplayer:** no · **In-game purchases:** no
4. **Tick "Progress Save."** This syncs unlocks, the Collection and saved runs to the player's CrazyGames account.
5. Upload the 3 covers and 2 preview videos from `store/`.
6. Submit. You get **Basic Launch** first (small audience, ads off), then **Full Launch** if players love it (ads earning). Set up payouts (Tipalti, monthly from €100).

## 3️⃣ itch.io (optional, no ads)
Create an HTML project and upload `fuseworks-web.zip`. Tick "played in the browser" with a 1280×720 viewport, fullscreen button and mobile friendly.

---

## 📺 Ads setup (already integrated, nothing to configure)
The game auto-detects the portal: CrazyGames SDK → Poki SDK → none.

**Gameplay events**
- `gameplayStart`: an act starts, a launch begins, or a run continues
- `gameplayStop`: the act is cleared (cash-out/shop), the run ends, or the menu opens
- `happytime` (CrazyGames): Grand Finales and clearing an act at 3× the target or more
- `loadingStart`/`loadingStop` (CrazyGames) and `gameLoadingFinished` (Poki) during boot

**Midgame / commercial break**: only when pressing **Start** in the Bazaar (the natural pause between acts).
- **CrazyGames:** never before 3 acts have been cleared in the session, and at least 3 minutes apart.
- **Poki:** `commercialBreak()` before every act starts from the Bazaar. Poki controls frequency, and the game runs no timers of its own.

**Rewarded ads (all optional)**
| Where | Button | Limit |
|---|---|---|
| Losing a run on Night 3+ after reaching at least half the target | **Second Wind:** one extra launch | once per run, never in the Daily Show |
| Run summary | **×2 Stardust** (cosmetic currency) | once per run |
| Pyro Locker | **+25 Stardust** | 3 per day |

- Rewards are granted only when the ad completes.
- The game pauses and audio is suspended during every ad.
- Second Wind is deliberately not offered on every loss (CrazyGames rule).
- No "ad blocked" messages appear anywhere.

**In-game purchases:** **none.** Stardust buys cosmetics only (sky themes, rocket trails, firework shapes) and is earned by playing. The Daily Show and all scores are 100% skill: no ads or purchases can affect them.

## 🔁 Updating later
1. Edit the code, then run `node tools/build.mjs` in `fuseworks/` to rebuild the zips.
2. If visuals changed, run `node tools/store-assets.cjs fuseworks` from the repo root to regenerate covers and videos.
3. Rebalance safely with `node tools/sim.mjs 80` (a bot plays 80 full runs and reports win rates and score curves).
4. Upload the new zip as a new version in each portal.
