// The War Games battle engine. A deterministic simulation on the base grid: fixed 0.1 s ticks, a seeded random
// generator, integer-free but trig-free arithmetic (only + − × ÷ and √), and a fixed iteration order. A battle is
// fully described by its input (the defender's layout, the attacking squad, the deployments and a seed), so a replay is
// a few hundred bytes and the server can re-run any battle to check the result instead of trusting the client.
// Robots fight by role (from their primary element), bring escort drones, path around buildings and break through
// walls when that is the cheaper way in; defences pick the nearest target they can hit; shields soak damage for the
// buildings inside them; EMP pulses freeze every robot nearby.
import { BUILDINGS, BATTLE_GRID as GRID } from '../data/buildings';
import { SPECIES } from '../data/species';
import { RARITY_ORDER } from '../data/rarities';
import { ROLE_OF, ROLES, Role, R_POWER, levelK, BOT_HP, BOT_DPS, escorts, DRONE, DEF, DefDef, DEF_K, buildingHp, TICK, MAX_TICKS } from '../data/war';
export interface LItem { id: string; b: string; lvl: number; x: number; z: number; r: number; boost?: number; }
export interface Layout { items: LItem[]; lo: number; hi: number; }
export interface Fighter { sp: string; lvl: number; }
export interface Deploy { t: number; i: number; x: number; z: number; }
export interface BattleInput { layout: Layout; army: Fighter[]; deploys: Deploy[]; seed: number; end?: number; }
export interface BUnit { id: number; bot: number; drone: boolean; sp: string; role: Role; x: number; z: number; hp: number; max: number; dps: number; speed: number; range: number; splash: number; air: boolean; heal: number; wallK: number;
  prefers: 'defence' | 'any'; target: number; wall: number; ally: number; stun: number; alive: boolean; fx: number; fz: number; atk: boolean; }
export interface BBld { i: number; id: string; b: string; lvl: number; x0: number; z0: number; w: number; d: number; cx: number; cz: number; hp: number; max: number; wall: boolean; def: DefDef | null; dk: number; cd: number; tgt: number; pool: number; poolMax: number; lastHit: number; alive: boolean; ax: number; az: number; }
export type BEvent = { k: 'shot'; b: number; u: number; x: number; z: number; splash?: number } | { k: 'pulse'; b: number } | { k: 'down'; b: number } | { k: 'die'; u: number } | { k: 'deploy'; i: number; x: number; z: number } | { k: 'hit'; u: number; b: number; x: number; z: number };
export interface Battle { input: BattleInput; tick: number; units: BUnit[]; blds: BBld[]; ev: BEvent[]; destroyed: number; total: number; hqDown: boolean; over: boolean; used: boolean[]; live: boolean;
  occ: Int16Array; fields: Map<number, Float32Array>; nextId: number; defAlive: number; }
export interface BattleResult { stars: number; pct: number; hq: boolean; ticks: number; used: number; }
const N = GRID, INF = 1e9, WALL_COST = 8;
const DRONE_OFF: [number, number][] = [[0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7], [0.5, 0.5], [-0.5, -0.5]];
const dimsOf = (b: string, r: number): [number, number] => { const [w, d] = BUILDINGS[b].fp; return r % 2 ? [d, w] : [w, d]; };
export const rIdxOf = (sp: string) => Math.max(0, RARITY_ORDER.indexOf(SPECIES[sp].rarity));
export const roleOf = (sp: string): Role => ROLE_OF[SPECIES[sp].el[0]] || 'striker';
// how strong a robot is in the War Games (for squad picking and matchmaking)
export const botPower = (f: Fighter) => R_POWER[rIdxOf(f.sp)] * levelK(f.lvl) * (1 + escorts(rIdxOf(f.sp)) * 0.3);
export function newBattle(input: BattleInput, live = false): Battle {
  const blds: BBld[] = []; const occ = new Int16Array(N * N).fill(-1); let total = 0;
  for (const it of input.layout.items) { if (!BUILDINGS[it.b] || it.lvl <= 0) continue; const [w, d] = dimsOf(it.b, it.r); const i = blds.length; const def = DEF[it.b] || null; const hp = buildingHp(it.b, w, d, it.lvl); const dk = Math.pow(DEF_K, it.lvl - 1) * (1 + (it.boost || 0));
    blds.push({ i, id: it.id, b: it.b, lvl: it.lvl, x0: it.x, z0: it.z, w, d, cx: it.x + w / 2, cz: it.z + d / 2, hp, max: hp, wall: it.b === 'wall', def, dk, cd: 0, tgt: -1, pool: def && def.shield ? def.shield * dk : 0, poolMax: def && def.shield ? def.shield * dk : 0, lastHit: -999, alive: true, ax: 0, az: 1 });
    for (let x = it.x; x < it.x + w; x++) for (let z = it.z; z < it.z + d; z++) if (x >= 0 && z >= 0 && x < N && z < N) occ[x * N + z] = i; if (it.b !== 'wall') total++; }
  return { input, tick: 0, units: [], blds, ev: [], destroyed: 0, total, hqDown: false, over: false, used: input.army.map(() => false), live, occ, fields: new Map(), nextId: 1, defAlive: blds.filter((b) => b.def).length };
}
// robots land anywhere outside the defender's buildable square
export const canDeployAt = (B: Battle, x: number, z: number) => { const L = B.input.layout; if (x < 0 || z < 0 || x >= N || z >= N) return false; return !(x >= L.lo - 0.5 && x < L.hi + 0.5 && z >= L.lo - 0.5 && z < L.hi + 0.5); };
function spawn(B: Battle, i: number, x: number, z: number) {
  const f = B.input.army[i]; if (!f || B.used[i] || !SPECIES[f.sp]) return; B.used[i] = true; const ri = rIdxOf(f.sp), P = R_POWER[ri] * levelK(f.lvl), role = roleOf(f.sp), R = ROLES[role];
  const mk = (drone: boolean, ox: number, oz: number): BUnit => ({ id: B.nextId++, bot: i, drone, sp: f.sp, role: drone ? 'striker' : role, x: x + ox, z: z + oz, hp: 0, max: 0, dps: 0, speed: 0, range: 0, splash: 0, air: false, heal: 0, wallK: 1, prefers: 'any', target: -1, wall: -1, ally: -1, stun: 0, alive: true, fx: 0, fz: 1, atk: false });
  const u = mk(false, 0, 0); u.max = u.hp = BOT_HP * P * R.hp; u.dps = BOT_DPS * P * R.dps; u.speed = R.speed; u.range = R.range; u.splash = R.splash || 0; u.air = !!R.air; u.heal = R.heal ? R.heal * BOT_DPS * P : 0; u.wallK = R.wallK || 1; u.prefers = R.prefers; B.units.push(u);
  for (let k = 0; k < escorts(ri); k++) { const [ox, oz] = DRONE_OFF[k % DRONE_OFF.length]; const d = mk(true, ox, oz); d.max = d.hp = DRONE.hp * P; d.dps = DRONE.dps * P; d.speed = DRONE.speed; d.range = DRONE.range; B.units.push(d); }
  B.ev.push({ k: 'deploy', i, x, z });
}
// distance from a point to a building's footprint
const rectDist = (b: BBld, x: number, z: number) => { const dx = Math.max(b.x0 - x, 0, x - (b.x0 + b.w)), dz = Math.max(b.z0 - z, 0, z - (b.z0 + b.d)); return Math.sqrt(dx * dx + dz * dz); };
// a cost field toward one building: Dijkstra over the grid; other buildings block, walls can be broken (at a cost)
function field(B: Battle, ti: number): Float32Array {
  let f = B.fields.get(ti); if (f) return f; f = new Float32Array(N * N).fill(INF); const t = B.blds[ti]; const heap: number[] = []; const hp = (c: number) => { heap.push(c); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (f![heap[p]] <= f![heap[i]]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && f![heap[l]] < f![heap[m]]) m = l; if (r < heap.length && f![heap[r]] < f![heap[m]]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  for (let x = t.x0; x < t.x0 + t.w; x++) for (let z = t.z0; z < t.z0 + t.d; z++) if (x >= 0 && z >= 0 && x < N && z < N) { f[x * N + z] = 0; hp(x * N + z); }
  const done = new Uint8Array(N * N);
  while (heap.length) { const c = pop(); if (done[c]) continue; done[c] = 1; const cx = (c / N) | 0, cz = c - cx * N;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { if (!dx && !dz) continue; const nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue; const n = nx * N + nz; if (done[n]) continue;
      const o = B.occ[n]; let cost = dx && dz ? 1.4142 : 1; if (o >= 0 && o !== ti) { const ob = B.blds[o]; if (!ob.alive) { /* rubble: passable */ } else if (ob.wall) cost += WALL_COST; else continue; }
      if (dx && dz) { const a = B.occ[cx * N + nz], b2 = B.occ[nx * N + cz]; if ((a >= 0 && a !== ti && B.blds[a].alive) || (b2 >= 0 && b2 !== ti && B.blds[b2].alive)) continue; }
      const v = f[c] + cost; if (v < f[n]) { f[n] = v; hp(n); } } }
  B.fields.set(ti, f); return f;
}
function pickTarget(B: Battle, u: BUnit) { let best = -1, bd = INF; const wantDef = u.prefers === 'defence' && B.defAlive > 0;
  for (const b of B.blds) { if (!b.alive || b.wall) continue; if (wantDef && !b.def) continue; const d = rectDist(b, u.x, u.z); if (d < bd - 1e-9) { bd = d; best = b.i; } } return best; }
function damage(B: Battle, b: BBld, dmg: number) {
  if (!b.alive) return; for (const s of B.blds) { if (!s.alive || !s.poolMax || s.pool <= 0) continue; const dx = s.cx - b.cx, dz = s.cz - b.cz; const r = s.def!.shieldR!; if (dx * dx + dz * dz > r * r) continue; const take = Math.min(s.pool, dmg); s.pool -= take; dmg -= take; s.lastHit = B.tick; if (dmg <= 0) return; }
  b.hp -= dmg; if (b.hp <= 0) { b.hp = 0; b.alive = false; B.fields.clear(); B.ev.push({ k: 'down', b: b.i }); if (!b.wall) B.destroyed++; if (b.def) B.defAlive--; if (b.b === 'hq') B.hqDown = true; } }
function hurt(B: Battle, u: BUnit, dmg: number) { if (!u.alive) return; u.hp -= dmg; if (u.hp <= 0) { u.alive = false; B.ev.push({ k: 'die', u: u.id }); } }
const moveToward = (u: BUnit, tx: number, tz: number) => { const dx = tx - u.x, dz = tz - u.z, d = Math.sqrt(dx * dx + dz * dz); if (d < 1e-6) return; const s = Math.min(d, u.speed * TICK); u.x += (dx / d) * s; u.z += (dz / d) * s; u.fx = dx / d; u.fz = dz / d; };
export function step(B: Battle) {
  if (B.over) return; B.ev = []; for (const d of B.input.deploys) if (d.t === B.tick) spawn(B, d.i, d.x, d.z);
  // defences
  for (const b of B.blds) { if (!b.alive || !b.def) continue; const D = b.def;
    if (D.shield) { if (B.tick - b.lastHit > 30) b.pool = Math.min(b.poolMax, b.pool + b.poolMax * 0.04 * TICK); continue; }
    b.cd -= TICK;
    if (D.pulse) { if (b.cd > 0) continue; let any = false; for (const u of B.units) { if (!u.alive) continue; const dx = u.x - b.cx, dz = u.z - b.cz; if (dx * dx + dz * dz <= D.pulseR! * D.pulseR!) { any = true; u.stun = Math.max(u.stun, Math.round(D.stun! / TICK)); hurt(B, u, D.dps! * b.dk); } } if (any) { b.cd = D.pulse; B.ev.push({ k: 'pulse', b: b.i }); } continue; }
    const ok = (u: BUnit) => { if (!u.alive || (u.air ? !D.air : !D.ground)) return false; const dx = u.x - b.cx, dz = u.z - b.cz, d2 = dx * dx + dz * dz; return d2 <= D.range! * D.range! && (!D.minRange || d2 >= D.minRange * D.minRange); };
    let t = b.tgt >= 0 ? B.units.find((u) => u.id === b.tgt) : undefined; if (!t || !ok(t)) { t = undefined; let bd = INF; for (const u of B.units) { if (!ok(u)) continue; const dx = u.x - b.cx, dz = u.z - b.cz, d2 = dx * dx + dz * dz; if (d2 < bd) { bd = d2; t = u; } } b.tgt = t ? t.id : -1; }
    if (t) { const dx = t.x - b.cx, dz = t.z - b.cz, d = Math.sqrt(dx * dx + dz * dz) || 1; b.ax = dx / d; b.az = dz / d; }
    if (b.cd <= 0 && t) { const dmg = D.dps! * b.dk * D.period!; b.cd = D.period!;
      if (D.splash) { const tx = t.x, tz = t.z; for (const u of B.units) { if (!u.alive || (u.air ? !D.air : !D.ground)) continue; const ex = u.x - tx, ez = u.z - tz; if (ex * ex + ez * ez <= D.splash * D.splash) hurt(B, u, dmg); } B.ev.push({ k: 'shot', b: b.i, u: t.id, x: tx, z: tz, splash: D.splash }); }
      else { hurt(B, t, dmg); B.ev.push({ k: 'shot', b: b.i, u: t.id, x: t.x, z: t.z }); } }
  }
  // robots and drones
  for (const u of B.units) { if (!u.alive) continue; u.atk = false; if (u.stun > 0) { u.stun--; continue; }
    if (u.heal) { // support: repair the most damaged ally nearby, otherwise stay with the nearest robot
      let best: BUnit | null = null, bv = 0; for (const a of B.units) { if (!a.alive || a === u || a.hp >= a.max) continue; const dx = a.x - u.x, dz = a.z - u.z, d2 = dx * dx + dz * dz; if (d2 > 64) continue; const v = (a.max - a.hp) / a.max; if (v > bv) { bv = v; best = a; } }
      if (best) { const dx = best.x - u.x, dz = best.z - u.z; if (dx * dx + dz * dz > u.range * u.range) moveToward(u, best.x, best.z); else { best.hp = Math.min(best.max, best.hp + u.heal * TICK); u.atk = true; } continue; }
      let near: BUnit | null = null, nd = INF; for (const a of B.units) { if (!a.alive || a === u || a.drone || a.heal) continue; const dx = a.x - u.x, dz = a.z - u.z, d2 = dx * dx + dz * dz; if (d2 < nd) { nd = d2; near = a; } }
      if (near && nd > 2.25) { moveToward(u, near.x, near.z); continue; } }
    if (u.wall >= 0 && !B.blds[u.wall].alive) u.wall = -1; if (u.target >= 0 && !B.blds[u.target].alive) u.target = -1; if (u.target < 0) u.target = pickTarget(B, u); if (u.target < 0) continue;
    const tb = u.wall >= 0 ? B.blds[u.wall] : B.blds[u.target]; const d = rectDist(tb, u.x, u.z);
    if (d <= u.range) { u.atk = true; const dmg = u.dps * TICK * (tb.wall ? u.wallK : 1); damage(B, tb, dmg); if (u.splash) for (const o of B.blds) { if (o === tb || !o.alive) continue; if (rectDist(o, tb.cx, tb.cz) <= u.splash) damage(B, o, dmg * 0.5); }
      const ex = Math.max(tb.x0, Math.min(u.x, tb.x0 + tb.w)), ez = Math.max(tb.z0, Math.min(u.z, tb.z0 + tb.d)); const dx = ex - u.x, dz = ez - u.z, dd = Math.sqrt(dx * dx + dz * dz); if (dd > 1e-6) { u.fx = dx / dd; u.fz = dz / dd; } if ((B.tick + u.id) % 5 === 0) B.ev.push({ k: 'hit', u: u.id, b: tb.i, x: ex, z: ez }); continue; }
    if (u.air || u.wall >= 0) { moveToward(u, tb.cx, tb.cz); continue; }
    // ground: follow the cost field downhill; a wall in the way becomes the target until it falls
    const f = field(B, u.target); const cx = Math.max(0, Math.min(N - 1, Math.floor(u.x))), cz = Math.max(0, Math.min(N - 1, Math.floor(u.z))); const cur = f[cx * N + cz];
    if (cur >= INF) { moveToward(u, tb.cx, tb.cz); continue; } let bn = -1, bv = cur;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { if (!dx && !dz) continue; const nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue; const v = f[nx * N + nz]; if (v < bv - 1e-6) { bv = v; bn = nx * N + nz; } }
    if (bn < 0) { moveToward(u, tb.cx, tb.cz); continue; } const o = B.occ[bn];
    if (o >= 0 && o !== u.target && B.blds[o].alive && B.blds[o].wall) { // a wall in the way: hit the weakest block within reach, so everyone breaks the same one
      let w = o, wh = B.blds[o].hp; for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue; const k = B.occ[nx * N + nz]; if (k >= 0 && B.blds[k].alive && B.blds[k].wall && B.blds[k].hp < wh && f[nx * N + nz] < cur) { w = k; wh = B.blds[k].hp; } } u.wall = w; continue; }
    const nx = (bn / N) | 0, nz = bn - nx * N; moveToward(u, nx + 0.5, nz + 0.5); }
  B.tick++;
  const pending = B.input.deploys.some((d) => d.t >= B.tick); const anyAlive = B.units.some((u) => u.alive);
  if (B.destroyed >= B.total || B.tick >= MAX_TICKS || (B.input.end !== undefined && B.tick >= B.input.end) || (!anyAlive && !pending && (!B.live || B.used.every(Boolean)))) B.over = true;
}
export const pctOf = (B: Battle) => (B.total ? Math.round((B.destroyed / B.total) * 100) : 100);
export const starsOf = (B: Battle) => { const p = pctOf(B); return (p >= 50 ? 1 : 0) + (B.hqDown ? 1 : 0) + (p >= 100 ? 1 : 0); };
export const resultOf = (B: Battle): BattleResult => ({ stars: starsOf(B), pct: pctOf(B), hq: B.hqDown, ticks: B.tick, used: B.used.filter(Boolean).length });
// the player taps to deploy: recorded as an input at the current tick, so the replay is identical
export function deployLive(B: Battle, i: number, x: number, z: number) { if (B.over || B.used[i] || !canDeployAt(B, x, z)) return false; const r = (v: number) => Math.round(v * 100) / 100; B.input.deploys.push({ t: B.tick, i, x: r(x), z: r(z) }); return true; }
export function surrender(B: Battle) { B.input.end = B.tick; B.over = true; }
// run a whole battle from its input (replays, server verification, AI vs AI)
export function run(input: BattleInput): BattleResult { const B = newBattle(input); while (!B.over) step(B); return resultOf(B); }
