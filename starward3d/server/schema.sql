-- Starward 3D War Games: commanders, their base snapshots, matches handed out, and battles (replays).
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,            -- random public id
  token_hash TEXT NOT NULL,       -- SHA-256 of the secret token (the token itself is never stored)
  name TEXT NOT NULL,
  trophies INTEGER NOT NULL DEFAULT 0,
  hq INTEGER NOT NULL DEFAULT 1,
  snapshot TEXT,                  -- the Earth base layout (JSON) others attack
  look TEXT,                      -- banner colours (JSON)
  power REAL NOT NULL DEFAULT 0,
  sorties INTEGER NOT NULL DEFAULT 3,
  sortie_at INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS players_trophies ON players (trophies);
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,            -- handed to the attacker with the opponent list
  attacker TEXT NOT NULL,
  defender TEXT NOT NULL,
  layout TEXT NOT NULL,           -- the defender's layout at the moment of matching (authoritative)
  def_trophies INTEGER NOT NULL,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS matches_attacker ON matches (attacker);
CREATE TABLE IF NOT EXISTS battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attacker TEXT NOT NULL,
  defender TEXT NOT NULL,
  input TEXT NOT NULL,            -- the full battle input: a replay
  stars INTEGER NOT NULL,
  pct INTEGER NOT NULL,
  d_att INTEGER NOT NULL,
  d_def INTEGER NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS battles_defender ON battles (defender, at);
