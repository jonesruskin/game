# Helioscend Orbital Trials server

The Orbital Trials (daily battles between commanders) work without any server: the Defence Council's **Academy** fields
commanders built under the same rules players build by, and every day it drills your own base. This server adds the
real thing: other players' bases to attack, attacks on your base by other players (with replays), server-side merit
and a leaderboard. When the game is built without a server URL, or the server cannot be reached, it quietly falls back
to the Academy; the game never waits on the network.

It is a **Cloudflare Worker** with a **D1** (SQLite) database, about 60 KB once bundled.

## How it keeps battles honest
The battle engine (`src/core/battle.ts`) is deterministic: a battle is fully described by its input (the defender's
layout, the squad, where and when each robot landed). The server hands out matches with the defender's layout frozen at
that moment, checks the squad and the deployments are possible, then **re-runs the battle with the same engine file**
and records its own result. Replays are just that input, so every defence log entry can be watched exactly as it
happened. Layouts are validated too (buildable square, no overlaps, building counts and levels a real player could have).

## Limits and cost (Cloudflare's published limits, November 2026)
- **Workers Free:** 100,000 requests a day, but only **10 ms of CPU per request**. Re-running a battle takes about
  15-100 ms (20 ms measured on a mid-game base), so on the free plan set `VERIFY = "off"`: the server then accepts the
  client's result after sanity checks (still with match, squad, deployment and sortie checks).
- **Workers Paid ($5/month):** up to 5 minutes of CPU per request; keep `VERIFY = "on"` for full verification.
- **D1 Free:** 5 million rows read and 100,000 rows written a day, 5 GB. Every query here is bounded by an index
  (opponents read at most 40 rows), and a battle writes about 6 rows, so the free tier covers roughly 15,000 battles a day.

## Deploy (five steps)
```bash
npm install -g wrangler           # Cloudflare's CLI (log in with: wrangler login)
cd starward3d/server
wrangler d1 create helioscend_trials   # copy the database_id it prints into wrangler.toml
wrangler d1 execute helioscend_trials --remote --file schema.sql
wrangler deploy                   # prints your Worker's URL, e.g. https://helioscend-trials.<you>.workers.dev
```
Then build the game pointed at it:
```bash
cd ..   # starward3d/
VITE_WAR_SERVER=https://helioscend-trials.<you>.workers.dev npm run build
```
In production set `ALLOWED_ORIGIN` in `wrangler.toml` to the domain the game is served from (for portal builds, the
portal's game domain), and `VERIFY` to match your plan.

## API
| Method | Path | What it does |
|---|---|---|
| POST | `/v1/register` | `{name}` → `{id, token}`: a new commander (the token is stored only as a SHA-256 hash) |
| PUT | `/v1/snapshot` | your Earth base layout, banner colours and squad strength (validated) |
| GET | `/v1/opponents` | up to three commanders near your merit, each with a single-use match id |
| POST | `/v1/result` | `{match, army, deploys, end}` → `{stars, pct, dT, merit}` (re-run when `VERIFY = "on"`; three sorties per 8 hours) |
| GET | `/v1/defences?since=` | attacks on your base, newest first, each with its replay input |
| GET | `/v1/me` | your merit and sorties |
| GET | `/v1/leaderboard` | the top 50 commanders |
| GET | `/v1/health` | `{ok, verify}` |

Every call but register, leaderboard and health sends `Authorization: Bearer <id>:<token>`.

## Develop and test locally (no Cloudflare account needed)
```bash
npm run test:server   # 25 checks: the real worker on SQLite (node:sqlite), incl. "server result = client engine result"
npm run war:local     # a local server on http://localhost:8787 (add a file path argument to keep the database)
VITE_WAR_SERVER=http://localhost:8787 npm run dev
```
