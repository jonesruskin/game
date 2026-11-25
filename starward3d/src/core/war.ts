// War Games: the Defence Council's daily simulations. Three sorties a day against commanders of similar strength (real
// players' base snapshots when the War Games server is configured, otherwise Academy commanders built under the same
// rules players build by, and clearly labelled). Stars pay grants in hours of real income and Power Cells for the
// robots, trophies climb the leagues, a weekly season pays out by league, and every day the Academy runs a drill
// against a snapshot of your own base: hold it and you earn a bounty. Nothing is ever destroyed for real.
import { State } from './state';
import { rng, hash, round2 } from './util';
import { give, lvlOf, hqLevel } from './econ';
import { BUILDINGS, GRID, allowedCount, allowedLevel, areaSide } from '../data/buildings';
import { SPECIES } from '../data/species';
import * as RB from './robots';
import { BattleInput, Layout, LItem, Fighter, Deploy, run, botPower, roleOf, rIdxOf, BattleResult } from './battle';
import { squadSize, SORTIES, SORTIE_EVERY, leagueOf, trophyGain, GRANT_H, FIRST_WIN_DM, LEAGUES, DEF } from '../data/war';
import { income, dateKey, weekOf } from './daily';
export interface Opp { id: string; name: string; trophies: number; hq: number; layout: Layout; academy: boolean; look: { primary: string; accent: string }; }
export interface WarHist { id: string; t: number; who: string; stars: number; pct: number; dT: number; input: BattleInput; look: Opp['look']; reward: Record<string, number>; academy: boolean; }
export interface WarLog { id: string; t: number; who: string; stars: number; pct: number; input: BattleInput; bounty: Record<string, number>; held: boolean; claimed: boolean; dT: number; academy: boolean; }
export interface War { trophies: number; best: number; sorties: number; sortieAt: number; firstWin: string; season: number; seasonPay: { league: string; dm: number; cells: number } | null; hist: WarHist[]; log: WarLog[]; drill: string; opps: Opp[]; set: number; n: number; net: { id: string; token: string } | null; snapAt: number; defSince?: number; }
export const war = (s: State): War => { const a = s as any; if (!a.war) a.war = { trophies: 0, best: 0, sorties: SORTIES, sortieAt: 0, firstWin: '', season: weekOf(), seasonPay: null, hist: [], log: [], drill: '', opps: [], set: 0, n: 0, net: null, snapAt: 0 }; return a.war; };
export const warroomLvl = (s: State) => lvlOf(s, 'earth', 'warroom');
export const unlocked = (s: State) => warroomLvl(s) > 0;
// the strike squad: your strongest robots, one per War Room slot
export function squad(s: State): Fighter[] { const n = squadSize(warroomLvl(s)); return [...RB.rb(s).list].map((r) => ({ sp: r.sp, lvl: r.lvl })).sort((a, b) => botPower(b) - botPower(a)).slice(0, n); }
export const squadPower = (army: Fighter[]) => army.reduce((a, f) => a + botPower(f), 0);
// a snapshot of your Earth base for others to attack (robot operators on defences make them stronger)
export function layoutOf(s: State): Layout { const A = areaOf(hqLevel(s));
  // the red square always covers every building (a base laid out before the area cap keeps its edge buildings protected)
  for (const i of s.bases.earth.items) { if (i.lvl <= 0 || (BUILDINGS[i.b] || {}).cat === 'decor') continue; const e = Math.max(...(BUILDINGS[i.b]?.fp || [1, 1])); A.lo = Math.max(1, Math.min(A.lo, i.x, i.z)); A.hi = Math.min(GRID - 1, Math.max(A.hi, i.x + e, i.z + e)); }
  return { lo: A.lo, hi: A.hi, items: s.bases.earth.items.filter((i) => i.lvl > 0 && (BUILDINGS[i.b] || {}).cat !== 'decor').map((i) => { const o: LItem = { id: i.id, b: i.b, lvl: i.lvl, x: i.x, z: i.z, r: i.r }; if (DEF[i.b]) { const k = RB.boostOf(s, 'earth', i.id); if (k) o.boost = Math.round(k * 100) / 100; } return o; }) }; }
const areaOf = (hq: number) => { const side = areaSide('earth', hq); const lo = Math.floor((GRID - side) / 2); return { lo, hi: lo + side }; };
// ---------------- sorties, seasons ----------------
export function tickWar(s: State, now = Date.now()) { const W = war(s);
  if (W.sorties < SORTIES) { if (!W.sortieAt) W.sortieAt = now + SORTIE_EVERY; while (W.sorties < SORTIES && now >= W.sortieAt) { W.sorties++; W.sortieAt += SORTIE_EVERY; } if (W.sorties >= SORTIES) W.sortieAt = 0; }
  const wk = weekOf(now); if (wk !== W.season) { if (W.trophies > 0 || W.hist.length) { const L = leagueOf(W.trophies); W.seasonPay = { league: L.name, dm: L.dm, cells: round2(income(s, L.cellsH).cells) }; } W.season = wk; if (W.trophies > 400) W.trophies = Math.round(400 + (W.trophies - 400) * 0.5); } }
export function claimSeason(s: State) { const W = war(s); const p = W.seasonPay; if (!p) return null; W.seasonPay = null; give(s, { dm: p.dm, cells: p.cells }); return p; }
// ---------------- Academy commanders (offline opponents, and the fallback when the server is down) ----------------
const RANKS = ['Cadet', 'Lt.', 'Captain', 'Major', 'Commander', 'Colonel', 'Admiral'];
const NAMES = ['Okafor', 'Lindqvist', 'Haruki', 'Moreau', 'Castellanos', 'Volkova', 'Adeyemi', 'Kowalski', 'Nakamura', 'Ferreira', 'Mbeki', 'Ivanova', 'Achebe', 'Delacroix', 'Sato', 'Reyes', 'Novak', 'Abara', 'Kim', 'Rahman', 'Oyelaran', 'Petrov', 'Haddad', 'Quispe'];
const BASES = ['Ridge', 'Harbor', 'Mesa', 'Delta', 'Point', 'Station', 'Field', 'Bay', 'Heights', 'Basin'];
const LOOKS = [['#2f6fd0', '#ffd36a'], ['#c0392b', '#f5f5f5'], ['#1f9d6b', '#f5c542'], ['#7b4bd6', '#7fe4ff'], ['#e67e22', '#2b3340'], ['#16a5c7', '#ff6b7a'], ['#4a5568', '#7cf29a']];
// a base built the way a player would: Mission Control in the middle, defences in a ring, a wall around the core,
// production and science outside it
// d (difficulty, about 0.4-1.1) rises with your trophies: win often and the Academy sends its better commanders
export function academyLayout(hq: number, seed: number, d = 0.75): Layout {
  const R = rng(seed); const A = areaOf(hq); const occ = new Uint8Array(GRID * GRID); const items: LItem[] = []; let n = 0;
  const fits = (b: string, x: number, z: number) => { const [w, d] = BUILDINGS[b].fp; if (x < A.lo || z < A.lo || x + w > A.hi || z + d > A.hi) return false; for (let i = x; i < x + w; i++) for (let j = z; j < z + d; j++) if (occ[i * GRID + j]) return false; return true; };
  const put = (b: string, x: number, z: number, lvl: number) => { if (!fits(b, x, z)) return false; const [w, d] = BUILDINGS[b].fp; for (let i = x; i < x + w; i++) for (let j = z; j < z + d; j++) occ[i * GRID + j] = 1; items.push({ id: 'a' + (n++).toString(36), b, lvl: Math.max(1, Math.min(BUILDINGS[b].max, lvl)), x, z, r: 0 }); return true; };
  const lvlFor = (b: string) => { const cap = allowedLevel(BUILDINGS[b], hq); return Math.max(1, Math.min(cap, Math.round(cap * (d * 0.62 + R() * 0.3)))); };
  const c = Math.floor(GRID / 2); put('hq', c - 2, c - 2, hq);
  // defences in a ring around Mission Control
  const defs: string[] = []; for (const b of ['turret', 'laser', 'missile', 'shield', 'emp', 'warroom']) { const k = b === 'warroom' ? (hq >= 3 ? 1 : 0) : allowedCount(BUILDINGS[b], hq); for (let i = 0; i < k; i++) defs.push(b); }
  const ringR = 5 + Math.min(4, Math.floor(hq / 3)); defs.forEach((b, i) => { const a = (i / Math.max(1, defs.length)) * Math.PI * 2 + R() * 0.3; for (let tr = 0; tr < 14; tr++) { const rr = ringR + (tr % 4); const x = Math.round(c + Math.cos(a + tr * 0.21) * rr) - 1, z = Math.round(c + Math.sin(a + tr * 0.21) * rr) - 1; if (put(b, x, z, lvlFor(b))) break; } });
  // a wall square around the core, as far as the allowance goes
  const walls = allowedCount(BUILDINGS.wall, hq); if (walls > 0) { const half = ringR + 4; let used = 0; const wl = lvlFor('wall'); for (let s2 = -half; s2 <= half && used < walls; s2++) for (const [x, z] of [[c + s2, c - half], [c + s2, c + half], [c - half, c + s2], [c + half, c + s2]] as [number, number][]) { if (used >= walls) break; if (put('wall', x, z, wl)) used++; } }
  // the rest of the spaceport
  for (const b of ['mine', 'refinery', 'office', 'solar', 'research', 'depot', 'fission', 'launch', 'vab', 'tracking', 'academy', 'university']) { const d = BUILDINGS[b]; if (!d || !d.bases.includes('earth')) continue; if (d.req && d.req.hq && hq < d.req.hq) continue; const k = Math.min(allowedCount(d, hq), b === 'launch' || b === 'vab' ? 1 : 6);
    for (let i = 0; i < k; i++) for (let tr = 0; tr < 40; tr++) { const x = A.lo + Math.floor(R() * (A.hi - A.lo)), z = A.lo + Math.floor(R() * (A.hi - A.lo)); if (put(b, x, z, lvlFor(b))) break; } }
  return { lo: A.lo, hi: A.hi, items };
}
export function academyOpp(s: State, slot: number, set: number): Opp { const W = war(s); const seed = hash(`${s.created}:${set}:${slot}`); const R = rng(seed); const hq = Math.max(3, Math.min(20, hqLevel(s) + (R() < 0.3 ? -1 : R() < 0.75 ? 0 : 1)));
  const name = `${RANKS[Math.min(RANKS.length - 1, Math.floor(hq / 3))]} ${NAMES[Math.floor(R() * NAMES.length)]}`; const lk = LOOKS[Math.floor(R() * LOOKS.length)];
  return { id: `academy-${set}-${slot}`, name, trophies: Math.max(0, W.trophies + Math.round((R() - 0.45) * 120)), hq, layout: academyLayout(hq, seed, difficulty(W.trophies) + (slot - 1) * 0.08), academy: true, look: { primary: lk[0], accent: lk[1] } }; }
export const difficulty = (trophies: number) => Math.max(0.4, Math.min(1.1, 0.45 + trophies / 2400));
export function refreshOpps(s: State, force = false) { const W = war(s); if (W.opps.length === 3 && !force) return W.opps; W.set++; W.opps = [0, 1, 2].map((i) => academyOpp(s, i, W.set)); return W.opps; }
export const baseName = (seed: number) => `${NAMES[seed % NAMES.length]} ${BASES[(seed >> 5) % BASES.length]}`;
// ---------------- an attack plan (Academy attackers, quick-deploy) ----------------
export function aiDeploys(L: Layout, army: Fighter[], seed: number): Deploy[] {
  const R = rng(seed); const defs = L.items.filter((i) => DEF[i.b]); const side = (k: number) => { const m = (L.lo + L.hi) / 2; return defs.filter((d) => (k === 0 ? d.z < m : k === 1 ? d.x > m : k === 2 ? d.z > m : d.x < m)).length; };
  const sides = [0, 1, 2, 3].sort((a, b) => side(a) - side(b)); const main = sides[0], alt = sides[1]; const span = L.hi - L.lo;
  const at = (k: number, f: number): [number, number] => { const p = L.lo + f * span, o = 1.5; return k === 0 ? [p, L.lo - o] : k === 1 ? [L.hi + o, p] : k === 2 ? [p, L.hi + o] : [L.lo - o, p]; };
  const order = army.map((f, i) => ({ i, role: roleOf(f.sp) })); const out: Deploy[] = []; const T: Record<string, number> = { breacher: 0, striker: 18, disruptor: 22, flyer: 30, support: 34 };
  const fm = 0.35 + R() * 0.3, fa = 0.35 + R() * 0.3; // one tight landing zone, so the squad breaks through in one place
  order.forEach((o, n) => { const k = o.role === 'flyer' ? alt : main; const [x, z] = at(k, (k === main ? fm : fa) + (R() - 0.5) * 0.08); out.push({ t: T[o.role] + n * 2, i: o.i, x: Math.round(Math.max(0.2, Math.min(GRID - 0.2, x)) * 100) / 100, z: Math.round(Math.max(0.2, Math.min(GRID - 0.2, z)) * 100) / 100 }); });
  return out.sort((a, b) => a.t - b.t);
}
// an Academy squad of a given strength (for the daily drill against your base)
export function academySquad(s: State, seed: number): Fighter[] { const mine = squad(s); const n = Math.max(4, mine.length || 4 + Math.floor(hqLevel(s) / 2)); const R = rng(seed);
  const ri = mine.length ? Math.round(mine.reduce((a, f) => a + rIdxOf(f.sp), 0) / mine.length) : Math.min(2, Math.floor(hqLevel(s) / 4)); const lvl = mine.length ? Math.round(mine.reduce((a, f) => a + f.lvl, 0) / mine.length) : 1 + hqLevel(s) * 2;
  const pool = RB.pool(Math.max(0, Math.min(4, ri))); return Array.from({ length: n }, () => ({ sp: pool[Math.floor(R() * pool.length)], lvl: Math.max(1, Math.min(30, lvl + Math.floor(R() * 3) - 1)) })); }
// ---------------- the result of an attack ----------------
export function canAttack(s: State) { if (!unlocked(s)) return { ok: false, why: 'Build the War Room (Mission Control level 3)' }; if (war(s).sorties <= 0) return { ok: false, why: 'No sorties left: one returns every 8 hours' }; if (!squad(s).length) return { ok: false, why: 'You need robots to form a strike squad' }; return { ok: true }; }
export function beginSortie(s: State, opp: Opp): BattleInput | null { if (!canAttack(s).ok) return null; const W = war(s); W.sorties--; if (!W.sortieAt) W.sortieAt = Date.now() + SORTIE_EVERY; W.n++; return { layout: JSON.parse(JSON.stringify(opp.layout)), army: squad(s), deploys: [], seed: hash(`${s.created}:${W.n}`) }; }
export function settle(s: State, opp: Opp, input: BattleInput, r: BattleResult, now = Date.now()) {
  const W = war(s); const dT = trophyGain(r.stars, W.trophies, opp.trophies); W.trophies = Math.max(0, W.trophies + dT); W.best = Math.max(W.best, W.trophies);
  const inc = income(s, GRANT_H[r.stars] * (0.6 + 0.4 * r.pct / 100)); const reward: Record<string, number> = { credits: inc.credits, metal: inc.metal, fuel: inc.fuel, cells: round2(inc.cells * (0.5 + r.used * 0.15)) }; if (r.stars >= 1) reward.science = inc.science;
  let first = false; if (r.stars >= 1 && W.firstWin !== dateKey(now)) { W.firstWin = dateKey(now); reward.dm = FIRST_WIN_DM; first = true; }
  give(s, reward); if (r.stars >= 1) s.stats.warWins = (s.stats.warWins || 0) + 1; s.stats.warStars = (s.stats.warStars || 0) + r.stars; s.stats.warBattles = (s.stats.warBattles || 0) + 1;
  W.hist.unshift({ id: 'h' + W.n, t: now, who: opp.name, stars: r.stars, pct: r.pct, dT, input, look: opp.look, reward, academy: opp.academy }); W.hist.length = Math.min(W.hist.length, 20);
  W.opps = W.opps.filter((o) => o.id !== opp.id); if (W.opps.length < 3) refreshOpps(s, true); return { dT, reward, first };
}
// ---------------- the daily Academy drill against your own base ----------------
export function drill(s: State, now = Date.now()) { const W = war(s); if (!unlocked(s) || W.drill === dateKey(now)) return null; W.drill = dateKey(now); const seed = hash(`${s.created}:drill:${dateKey(now)}`);
  const layout = layoutOf(s); const army = academySquad(s, seed); const input: BattleInput = { layout, army, deploys: aiDeploys(layout, army, seed), seed }; const r = run(input); const held = r.stars <= 1;
  const bounty: Record<string, number> = held ? (() => { const i = income(s, 1 + (1 - r.pct / 100)); return { credits: i.credits, metal: i.metal }; })() : {};
  const R = rng(seed); const who = `${RANKS[Math.min(RANKS.length - 1, 1 + Math.floor(R() * 5))]} ${NAMES[Math.floor(R() * NAMES.length)]} (Academy drill)`;
  const e: WarLog = { id: 'd' + dateKey(now), t: now, who, stars: r.stars, pct: r.pct, input, bounty, held, claimed: false, dT: 0, academy: true }; W.log.unshift(e); W.log.length = Math.min(W.log.length, 20); if (held) s.stats.defHeld = (s.stats.defHeld || 0) + 1; return e; }
export function claimBounty(s: State, id: string) { const e = war(s).log.find((x) => x.id === id); if (!e || e.claimed || !e.held) return null; e.claimed = true; give(s, e.bounty); return e; }
export const unclaimed = (s: State) => war(s).log.filter((e) => e.held && !e.claimed).length;
export { LEAGUES, leagueOf, SPECIES };
