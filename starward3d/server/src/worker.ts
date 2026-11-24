// Starward 3D War Games server: a Cloudflare Worker with a D1 database. Commanders register (a random id and a secret
// token, stored only as a hash), upload a snapshot of their Earth base, get three opponents of similar trophies, and
// submit attacks. With VERIFY = "on" the server re-runs every battle with the game's own deterministic engine (the same
// file the client runs) and records that result, so a tampered client cannot invent a win. Defenders get a log of the
// attacks on them with full replays. Every query is bounded by an index, so the D1 free tier's daily row limits go far.
import { run, canDeployAt, newBattle, BattleInput, Layout, Fighter, Deploy } from '../../src/core/battle';
import { BUILDINGS, GRID, allowedCount, areaSide } from '../../src/data/buildings';
import { SPECIES } from '../../src/data/species';
import { trophyGain, SORTIES, SORTIE_EVERY, MAX_TICKS, squadSize } from '../../src/data/war';
interface D1Stmt { bind(...v: unknown[]): D1Stmt; first<T = any>(): Promise<T | null>; all<T = any>(): Promise<{ results: T[] }>; run(): Promise<unknown>; }
export interface D1 { prepare(sql: string): D1Stmt; }
export interface Env { DB: D1; VERIFY?: string; ALLOWED_ORIGIN?: string; }
type Json = Record<string, any>;
const MAX_SQUAD = squadSize(15);
// ---------------- helpers ----------------
const cors = (env: Env) => ({ 'access-control-allow-origin': env.ALLOWED_ORIGIN || '*', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS', 'access-control-allow-headers': 'content-type,authorization', 'access-control-max-age': '86400' });
const json = (env: Env, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors(env) } });
const fail = (env: Env, status: number, error: string) => json(env, { error }, status);
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const randHex = (n: number) => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const hash32 = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const cleanName = (s: unknown) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24) || 'Commander';
const int = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) ? v : NaN);
async function auth(req: Request, env: Env) { const h = req.headers.get('authorization') || ''; const m = /^Bearer ([a-z0-9]+):([a-f0-9]{64})$/.exec(h); if (!m) return null;
  const p = await env.DB.prepare('SELECT * FROM players WHERE id = ?').bind(m[1]).first(); if (!p || p.token_hash !== (await sha(m[2]))) return null; return p; }
// three sorties, one back every 8 hours (the same rule as the client)
function sortiesNow(p: Json, now: number) { let n = p.sorties, at = p.sortie_at; if (n < SORTIES) { if (!at) at = now + SORTIE_EVERY; while (n < SORTIES && now >= at) { n++; at += SORTIE_EVERY; } if (n >= SORTIES) at = 0; } return { n, at }; }
// ---------------- validation: only layouts a real player could have built ----------------
export function validLayout(L: any): Layout | null {
  if (!L || !Array.isArray(L.items) || L.items.length > 400) return null; const hqIt = L.items.find((i: any) => i && i.b === 'hq'); const hq = hqIt ? int(hqIt.lvl) : 1; if (!(hq >= 1 && hq <= BUILDINGS.hq.max)) return null;
  const side = areaSide('earth', hq); const lo = Math.floor((GRID - side) / 2), hi = lo + side; const occ = new Uint8Array(GRID * GRID); const count: Record<string, number> = {}; const items = [];
  for (const it of L.items) { const d = it && BUILDINGS[it.b]; if (!d || !d.bases.includes('earth')) return null; const lvl = int(it.lvl), x = int(it.x), z = int(it.z), r = int(it.r); if (!(lvl >= 1 && lvl <= d.max) || !(r >= 0 && r <= 3)) return null;
    const [w0, d0] = d.fp; const [w, dd] = r % 2 ? [d0, w0] : [w0, d0]; if (!(x >= lo && z >= lo && x + w <= hi && z + dd <= hi)) return null; for (let a = x; a < x + w; a++) for (let b = z; b < z + dd; b++) { if (occ[a * GRID + b]) return null; occ[a * GRID + b] = 1; }
    count[it.b] = (count[it.b] || 0) + 1; if (count[it.b] > Math.max(1, allowedCount(d, hq))) return null; const boost = typeof it.boost === 'number' ? Math.max(0, Math.min(3, it.boost)) : 0;
    items.push({ id: String(it.id).slice(0, 16), b: it.b, lvl, x, z, r, ...(boost ? { boost } : {}) }); }
  return { lo, hi, items };
}
export function validArmy(A: any): Fighter[] | null { if (!Array.isArray(A) || !A.length || A.length > MAX_SQUAD) return null; const out: Fighter[] = []; for (const f of A) { const lvl = int(f && f.lvl); if (!f || !SPECIES[f.sp] || !(lvl >= 1 && lvl <= 30)) return null; out.push({ sp: f.sp, lvl }); } return out; }
export function validDeploys(D: any, army: Fighter[], layout: Layout): Deploy[] | null { if (!Array.isArray(D) || D.length > army.length) return null; const seen = new Set<number>(); const B = newBattle({ layout, army, deploys: [], seed: 0 }); const out: Deploy[] = [];
  for (const d of D) { const t = int(d && d.t), i = int(d && d.i); const x = Number(d && d.x), z = Number(d && d.z); if (!(t >= 0 && t < MAX_TICKS) || !(i >= 0 && i < army.length) || seen.has(i) || !Number.isFinite(x) || !Number.isFinite(z) || !canDeployAt(B, x, z)) return null; seen.add(i); out.push({ t, i, x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100 }); }
  return out; }
// ---------------- routes ----------------
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(env) });
    const url = new URL(req.url); const path = url.pathname.replace(/\/+$/, ''); const now = Date.now();
    try {
      if (path === '/v1/health') return json(env, { ok: true, verify: env.VERIFY !== 'off' });
      if (path === '/v1/register' && req.method === 'POST') { const body: Json = await req.json().catch(() => ({})); const id = randHex(8), token = randHex(32);
        await env.DB.prepare('INSERT INTO players (id, token_hash, name, created, updated) VALUES (?, ?, ?, ?, ?)').bind(id, await sha(token), cleanName(body.name), now, now).run(); return json(env, { id, token }); }
      if (path === '/v1/leaderboard') { const r = await env.DB.prepare('SELECT name, trophies, hq FROM players ORDER BY trophies DESC LIMIT 50').all(); return json(env, { top: r.results }); }
      const me = await auth(req, env); if (!me) return fail(env, 401, 'Unknown commander');
      if (path === '/v1/me') { const s = sortiesNow(me, now); return json(env, { id: me.id, name: me.name, trophies: me.trophies, sorties: s.n, sortieAt: s.at }); }
      if (path === '/v1/snapshot' && req.method === 'PUT') { const body: Json = await req.json().catch(() => ({})); const L = validLayout(body.layout); if (!L) return fail(env, 400, 'That layout is not possible');
        const hq = L.items.find((i) => i.b === 'hq')?.lvl || 1; const look = JSON.stringify({ primary: String(body.look?.primary || '#2f6fd0').slice(0, 9), accent: String(body.look?.accent || '#ffd36a').slice(0, 9) });
        await env.DB.prepare('UPDATE players SET name = ?, hq = ?, snapshot = ?, look = ?, power = ?, updated = ? WHERE id = ?').bind(cleanName(body.name || me.name), hq, JSON.stringify(L), look, Number(body.power) || 0, now, me.id).run(); return json(env, { ok: true }); }
      if (path === '/v1/opponents') { const since = now - 14 * 86400e3; let rows: Json[] = [];
        for (const w of [150, 400, 1200, 100000]) { const r = await env.DB.prepare('SELECT id, name, trophies, hq, snapshot, look FROM players WHERE trophies BETWEEN ? AND ? AND id != ? AND snapshot IS NOT NULL AND updated > ? LIMIT 40').bind(me.trophies - w, me.trophies + w, me.id, since).all(); rows = r.results; if (rows.length >= 3) break; }
        for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rows[i], rows[j]] = [rows[j], rows[i]]; } rows = rows.slice(0, 3);
        await env.DB.prepare('DELETE FROM matches WHERE attacker = ?').bind(me.id).run(); const out = [];
        for (const r of rows) { const mid = randHex(10); await env.DB.prepare('INSERT INTO matches (id, attacker, defender, layout, def_trophies, created) VALUES (?, ?, ?, ?, ?, ?)').bind(mid, me.id, r.id, r.snapshot, r.trophies, now).run();
          out.push({ match: mid, name: r.name, trophies: r.trophies, hq: r.hq, layout: JSON.parse(r.snapshot), look: JSON.parse(r.look || '{}') }); }
        return json(env, { opponents: out }); }
      if (path === '/v1/result' && req.method === 'POST') { const body: Json = await req.json().catch(() => ({}));
        const m = await env.DB.prepare('SELECT * FROM matches WHERE id = ? AND attacker = ?').bind(String(body.match || ''), me.id).first(); if (!m) return fail(env, 404, 'That match has expired');
        const S = sortiesNow(me, now); if (S.n <= 0) return fail(env, 429, 'No sorties left'); const layout: Layout = JSON.parse(m.layout); const army = validArmy(body.army); if (!army) return fail(env, 400, 'Invalid squad');
        const deploys = validDeploys(body.deploys, army, layout); if (!deploys) return fail(env, 400, 'Invalid deployment'); const end = int(body.end); const input: BattleInput = { layout, army, deploys, seed: hash32(m.id), ...(end >= 0 && end <= MAX_TICKS ? { end } : {}) };
        let stars: number, pct: number; if (env.VERIFY !== 'off') { const r = run(input); stars = r.stars; pct = r.pct; } else { stars = Math.max(0, Math.min(3, int(body.stars) || 0)); pct = Math.max(0, Math.min(100, int(body.pct) || 0)); if (stars >= 1 && pct < 50 && stars !== 1) stars = 1; if (!deploys.length) stars = pct = 0; }
        const dA = trophyGain(stars, me.trophies, m.def_trophies); const dD = stars > 0 ? -Math.round(Math.abs(dA) * 0.6) : Math.round(Math.abs(dA) * 0.5); const tA = Math.max(0, me.trophies + dA);
        await env.DB.prepare('UPDATE players SET trophies = ?, sorties = ?, sortie_at = ?, updated = ? WHERE id = ?').bind(tA, S.n - 1, S.at || now + SORTIE_EVERY, now, me.id).run();
        await env.DB.prepare('UPDATE players SET trophies = MAX(0, trophies + ?) WHERE id = ?').bind(dD, m.defender).run();
        await env.DB.prepare('INSERT INTO battles (attacker, defender, input, stars, pct, d_att, d_def, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(me.id, m.defender, JSON.stringify(input), stars, pct, dA, dD, now).run();
        await env.DB.prepare('DELETE FROM matches WHERE id = ?').bind(m.id).run(); return json(env, { stars, pct, dT: dA, trophies: tA, verified: env.VERIFY !== 'off' }); }
      if (path === '/v1/defences') { const since = Number(url.searchParams.get('since')) || 0;
        const r = await env.DB.prepare('SELECT b.id, b.input, b.stars, b.pct, b.d_def, b.at, p.name AS who FROM battles b JOIN players p ON p.id = b.attacker WHERE b.defender = ? AND b.at > ? ORDER BY b.at DESC LIMIT 20').bind(me.id, since).all();
        return json(env, { attacks: r.results.map((x: Json) => ({ id: x.id, who: x.who, stars: x.stars, pct: x.pct, dT: x.d_def, at: x.at, input: JSON.parse(x.input) })), trophies: me.trophies }); }
      return fail(env, 404, 'Not found');
    } catch (e) { return fail(env, 500, 'Server error'); }
  },
};
