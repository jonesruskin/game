# Repo instructions for Claude
- **Git workflow:** commit all work directly to `main` and push to `origin main`. No feature branches, no pull requests (owner's standing instruction).
- Repo layout: Stealstorm at the repo root, `hordemind/`, `driftline/`, `emberkeep/`, `fuseworks/` (flagship), `glint/` (ray-traced gem-cutting simulator). Each game has `dist/` (portal zips), `store/` (covers, videos, listing copy) and `UPLOAD.md`.
- After changing a game's code, rebuild its zips (`node tools/build.mjs` inside that game's folder, or at the root for Stealstorm) and commit the updated zips.
- After visual changes, regenerate store assets with `node tools/store-assets.cjs <game>` (needs Playwright + ffmpeg).
- Run locally: `python3 -m http.server 8080` from the repo root, then open `/`, `/hordemind/`, `/driftline/`, `/emberkeep/`, `/fuseworks/` or `/glint/`.
