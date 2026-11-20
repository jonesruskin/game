# 🚀 Launch & Money Plan

## 1. Submit to CrazyGames (first)
1. Run `node tools/build.mjs` and upload `dist/stealstorm-crazygames.zip` at https://developer.crazygames.com
2. Choose **Full Implementation**. Already done in code: gameplayStart/Stop, midgame and rewarded ads, `happytime` on wins, the data module for cloud saves, muting on `settings.muteAudio`, muting during ads, and pausing on tab switch.
3. At submission, tick **"Progress Save"** so the data module is enabled. Orientation: **landscape**, with mobile enabled.
4. Compliance already handled: no external links, no custom fullscreen button, one click to gameplay, English, PEGI-12 cartoon violence (no blood), `user-select:none`, safe-area padding, relative paths.
5. Cover art: take an in-game screenshot of a fight (fire walls, a Lv3 orb) plus the logo. Title: **"Stealstorm.io"**. Tags: battle royale, io, multiplayer-style, shooter, heroes.

## 2. Poki / other portals
- Poki: apply at https://developers.poki.com and upload `stealstorm-poki.zip`. Poki forbids in-app purchases, and the purchase UI is hidden automatically there (`Platform.purchasesAvailable = false`).
- itch.io / Newgrounds / your own site: `stealstorm-web.zip`. These platforms have no ads by default.

## 3. Turning on real-money purchases (needs your action: billing/accounts)
- **CrazyGames:** in-game purchases are *invite-only* through Xsolla. Once you have traction, apply in the developer portal. When approved, implement `Platform.purchase(sku)` in `src/platform.js`: get a token with `SDK.user.getXsollaUserToken()`, open Xsolla checkout, grant gems on success, and set `purchasesAvailable = true` only on CrazyGames (and never inside their mobile app store builds).
- **Own site:** wire `Platform.purchase` to Stripe Checkout plus a tiny serverless webhook. A "Storm Club" subscription fits best here (monthly gems, an animated name frame, an exclusive monthly skin, double daily gift). Keep it cosmetic only.
- Gem packs are already defined in `src/data/progression.js` (`GEM_PACKS`).

## 4. Growth levers (already built in)
- Same daily quests and shop for everyone, so players compare notes and talk about it.
- A Trophy Road goal is always visible (Bastion unlocks at 30 🏆, reachable in about 3 matches).
- First match drops new players straight into an easy 8-player game with tips, so they win quickly and see the steal moment early.
- Bots wear premium skins, which acts as free showcase advertising for the shop.

## 5. Next updates (keep players returning)
1. Season 2 pass with new themed skins: just add entries to `cosmetics.js` and `progression.js`.
2. New hero every 3–4 weeks (data-driven in `heroes.js` + `abilities.js`).
3. Weekly limited modes: "Lv3 Frenzy" (all orbs drop at Lv2) or "Duos" with bot teammates.
4. Real-time multiplayer later via CrazyGames' multiplayer room API once revenue covers servers.

## Balance notes
Tuned with 400+ simulated full matches (bots only). Median match length is about 1:30–2:00, and hero win rates sit within about 0.8–1.2× of fair (Whisper slightly high in bot play because bots aim well with snipers). Tune numbers in `src/data/heroes.js`.
