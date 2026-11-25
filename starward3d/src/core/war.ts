// Orbital Trials: the Defence Council's drills. Earth has never been attacked and the Council is not waiting to find
// out how: commanders attack holographic copies of each other's whole bases (every building on the land they hold,
// walls and outposts included) to find the holes before something real does. When the Swarm comes, its landings hit the
// same layout. Three sorties a day against commanders of similar strength (real players' base snapshots when the
// server is configured, otherwise Academy commanders built under the same rules, and clearly labelled). Stars pay
// grants in hours of real income and Power Cells, merit climbs the circles, and every circle reached grants a
// permanent Council charter (cheaper land, more rovers, a weaker Swarm). Every day the Academy drills against your own
// base: hold it and you earn a bounty. Nothing is ever destroyed in a Trial.
import { State } from './state';
import { rng, hash, round2 } from './util';
import { give, lvlOf, hqLevel } from './econ';
import { BUILDINGS, GRID as MAP, allowedCount, allowedLevel, areaSide } from '../data/buildings';
import { SPECIES } from '../data/species';
import * as RB from './robots';
import { BattleInput, Layout, LItem, Fighter, Deploy, run, botPower, roleOf, rIdxOf, BattleResult, ownedBox, fieldSize, PLOT } from './battle';
import { squadSize, SORTIES, SORTIE_EVERY, leagueOf, trophyGain, GRANT_H, FIRST_WIN_DM, LEAGUES, DEF, CHARTERS } from '../data/war';
import { income, dateKey, weekOf } from './daily';
import { stepChecks } from './game';
export interface Opp { id: string; name: string; trophies: number; hq: number; layout: Layout; academy: boolean; look: { primary: string; accent: string }; }
export interface WarHist { id: string; t: number; who: string; stars: number; pct: number; dT: number; input: BattleInput; look: Opp['look']; reward: Record<string, number>; academy: boolean; }
export interface WarLog { id: string; t: number; who: string; stars: number; pct: number; input: BattleInput; bounty: Record<string, number>; held: boolean; claimed: boolean; dT: number; academy: boolean; }
export interface War { trophies: number; best: number; sorties: number; sortieAt: number; firstWin: string; season: number; seasonPay: { league: string; dm: number; cells: number } | null; hist: WarHist[]; log: WarLog[]; drill: string; opps: Opp[]; set: number; n: number; net: { id: string; token: string } | null; snapAt: number; defSince?: number; }
export const war = (s: State): War => { const a = s as any; if (!a.war) a.war = { trophies: 0, best: 0, sorties: SORTIES, sortieAt: 0, firstWin: '', season: weekOf(), seasonPay: null, hist: [], log: [], drill: '', opps: [], set: 0, n: 0, net: null, snapAt: 0 }; return a.war; };
export const warroomLvl = (s: State) => lvlOf(s, 'earth', 'warroom');
export const unlocked = (s: State) => warroomLvl(s) > 0;
// the strike squad: your strongest robots, one per Tactics Centre slot
export function squad(s: State): Fighter[] { const n = squadSize(warroomLvl(s)); return [...RB.rb(s).list].map((r) => ({ sp: r.sp, lvl: r.lvl })).sort((a, b) => botPower(b) - botPower(a)).slice(0, n); }
export const squadPower = (army: Fighter[]) => army.reduce((a, f) => a + botPower(f), 0);
// ---------------- the battlefield: your whole base ----------------
// map coordinates (the 96-cell land) → a square field around everything the base holds, with room to land around it
export const FIELD_M = 6, FIELD_MIN = 44;
export function toField(lo: number, hi: number, plots: number[][], items: LItem[]): Layout {
  let mn = lo, mx = hi; for (const [x, z] of plots) { mn = Math.min(mn, x, z); mx = Math.max(mx, x + PLOT, z + PLOT); }
  let o = mn - FIELD_M, n = mx + FIELD_M - o; if (n < FIELD_MIN) { o -= Math.floor((FIELD_MIN - n) / 2); n = FIELD_MIN; }
  return { lo: lo - o, hi: hi - o, n, land: plots.map(([x, z]) => [x - o, z - o]), items: items.map((i) => ({ ...i, x: i.x - o, z: i.z - o })) }; }
const coreOf = (hq: number) => { const side = areaSide('earth', hq); const lo = Math.floor((MAP - side) / 2); return { lo, hi: lo + side }; };
// a snapshot of your Earth base for others to attack: every building on the land you hold (robot operators on defences
// make them stronger)
export function layoutOf(s: State): Layout { const A = coreOf(hqLevel(s)); const plots = Object.keys(s.bases.earth.claims || {}).map((k) => k.split(',').map((v) => +v * PLOT));
  const items = s.bases.earth.items.filter((i) => i.lvl > 0 && BUILDINGS[i.b] && BUILDINGS[i.b].cat !== 'decor').map((i) => { const o: LItem = { id: i.id, b: i.b, lvl: i.lvl, x: i.x, z: i.z, r: i.r }; if (DEF[i.b]) { const k = RB.boostOf(s, 'earth', i.id); if (k) o.boost = Math.round(k * 100) / 100; } return o; });
  return toField(A.lo, A.hi, plots, items); }
// ---------------- the Council's charters (by the best circle ever reached: they are never lost) ----------------
export const circleIdx = (merit: number) => { let k = 0; LEAGUES.forEach((L, i) => { if (merit >= L.min) k = i; }); return k; };
export const charter = (s: State, id: string) => { const C = CHARTERS.find((c) => c.id === id); return !!C && circleIdx(war(s).best) >= C.circle; };
export const landDiscount = (s: State) => (charter(s, 'land3') ? 0.3 : charter(s, 'land2') ? 0.2 : charter(s, 'land1') ? 0.1 : 0);
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
  const R = rng(seed); const A = coreOf(hq); const occ = new Uint8Array(MAP * MAP); const own = new Uint8Array(MAP * MAP); const items: LItem[] = []; let n = 0;
  for (let x = A.lo; x < A.hi; x++) for (let z = A.lo; z < A.hi; z++) own[x * MAP + z] = 1;
  // land claimed beyond the core, plot by plot, the way a player grows (more as Mission Control rises)
  const plots: number[][] = []; const nPlots = hq < 4 ? 0 : Math.min(28, Math.round(hq * 0.75 * (0.5 + R()))); const has = (cx: number, cz: number) => plots.some(([x, z]) => x === cx * PLOT && z === cz * PLOT);
  const coreTouch = (cx: number, cz: number) => (cx + 1) * PLOT > A.lo && cx * PLOT < A.hi && (cz + 1) * PLOT > A.lo && cz * PLOT < A.hi;
  const inside = (cx: number, cz: number) => cx * PLOT >= A.lo && (cx + 1) * PLOT <= A.hi && cz * PLOT >= A.lo && (cz + 1) * PLOT <= A.hi; const NCH = MAP / PLOT;
  for (let k = 0; k < nPlots; k++) { const cand: number[][] = []; for (let cz = 1; cz < NCH - 1; cz++) for (let cx = 1; cx < NCH - 1; cx++) { if (inside(cx, cz) || has(cx, cz)) continue; if (coreTouch(cx, cz) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => has(cx + a, cz + b))) cand.push([cx, cz]); }
    if (!cand.length) break; const [cx, cz] = cand[Math.floor(R() * cand.length)]; plots.push([cx * PLOT, cz * PLOT]); for (let x = cx * PLOT; x < (cx + 1) * PLOT; x++) for (let z = cz * PLOT; z < (cz + 1) * PLOT; z++) own[x * MAP + z] = 1; }
  const fits = (b: string, x: number, z: number) => { const [w, d] = BUILDINGS[b].fp; for (let i = x; i < x + w; i++) for (let j = z; j < z + d; j++) { if (i < 0 || j < 0 || i >= MAP || j >= MAP || !own[i * MAP + j] || occ[i * MAP + j]) return false; } return true; };
  const put = (b: string, x: number, z: number, lvl: number) => { if (!fits(b, x, z)) return false; const [w, d] = BUILDINGS[b].fp; for (let i = x; i < x + w; i++) for (let j = z; j < z + d; j++) occ[i * MAP + j] = 1; items.push({ id: 'a' + (n++).toString(36), b, lvl: Math.max(1, Math.min(BUILDINGS[b].max, lvl)), x, z, r: 0 }); return true; };
  const lvlFor = (b: string) => { const cap = allowedLevel(BUILDINGS[b], hq); return Math.max(1, Math.min(cap, Math.round(cap * (d * 0.62 + R() * 0.3)))); };
  const used: Record<string, number> = {}; const left = (b: string) => allowedCount(BUILDINGS[b], hq) - (used[b] || 0); const putN = (b: string, x: number, z: number) => { if (left(b) <= 0) return false; const ok = put(b, x, z, lvlFor(b)); if (ok) used[b] = (used[b] || 0) + 1; return ok; };
  const c = Math.floor(MAP / 2); put('hq', c - 2, c - 2, hq); used.hq = 1;
  // defences: most in a ring around Mission Control, a share out on the claimed land as outposts
  const defs: string[] = []; for (const b of ['turret', 'laser', 'missile', 'shield', 'emp']) for (let i = 0; i < allowedCount(BUILDINGS[b], hq); i++) defs.push(b); if (hq >= 3) defs.push('warroom');
  const outN = plots.length ? Math.floor(defs.length * Math.min(0.35, plots.length * 0.04)) : 0; const ringR = 5 + Math.min(4, Math.floor(hq / 3));
  defs.forEach((b, i) => { if (i < outN) { for (let tr = 0; tr < 12; tr++) { const p = plots[Math.floor(R() * plots.length)]; if (putN(b, p[0] + 1 + Math.floor(R() * 3), p[1] + 1 + Math.floor(R() * 3))) return; } }
    const a = (i / Math.max(1, defs.length)) * Math.PI * 2 + R() * 0.3; for (let tr = 0; tr < 14; tr++) { const rr = ringR + (tr % 4); const x = Math.round(c + Math.cos(a + tr * 0.21) * rr) - 1, z = Math.round(c + Math.sin(a + tr * 0.21) * rr) - 1; if (b === 'warroom' ? put(b, x, z, lvlFor(b)) : putN(b, x, z)) break; } });
  // a wall square around the core, as far as the allowance goes (the rest rings the outer land)
  const walls = allowedCount(BUILDINGS.wall, hq); let wUsed = 0; const wl = lvlFor('wall'); if (walls > 0) { const half = ringR + 4; for (let s2 = -half; s2 <= half && wUsed < walls * (plots.length ? 0.7 : 1); s2++) for (const [x, z] of [[c + s2, c - half], [c + s2, c + half], [c - half, c + s2], [c + half, c + s2]] as [number, number][]) { if (wUsed >= walls) break; if (put('wall', x, z, wl)) wUsed++; } }
  if (plots.length && wUsed < walls) for (let i = 0; i < MAP * MAP && wUsed < walls; i++) { const x = (i / MAP) | 0, z = i % MAP; if (!own[x * MAP + z]) continue; const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !own[(x + a) * MAP + (z + b)]); if (edge && R() < 0.5 && put('wall', x, z, wl)) wUsed++; }
  // the rest of the spaceport: science and launch in the core, industry spreading over the claimed land
  for (const b of ['research', 'office', 'depot', 'launch', 'vab', 'tracking', 'academy', 'university', 'mine', 'refinery', 'solar', 'fission']) { const D = BUILDINGS[b]; if (!D || !D.bases.includes('earth')) continue; if (D.req && D.req.hq && hq < D.req.hq) continue; const k = Math.min(left(b), b === 'launch' || b === 'vab' ? 1 : 6); const outer = ['mine', 'refinery', 'solar', 'fission'].includes(b) && plots.length > 0;
    for (let i = 0; i < k; i++) for (let tr = 0; tr < 40; tr++) { let x: number, z: number; if (outer && R() < 0.75) { const p = plots[Math.floor(R() * plots.length)]; x = p[0] + Math.floor(R() * PLOT); z = p[1] + Math.floor(R() * PLOT); } else { x = A.lo + Math.floor(R() * (A.hi - A.lo)); z = A.lo + Math.floor(R() * (A.hi - A.lo)); } if (putN(b, x, z)) break; } }
  return toField(A.lo, A.hi, plots, items);
}
export function academyOpp(s: State, slot: number, set: number): Opp { const W = war(s); const seed = hash(`${s.created}:${set}:${slot}`); const R = rng(seed); const hq = Math.max(3, Math.min(20, hqLevel(s) + (R() < 0.3 ? -1 : R() < 0.75 ? 0 : 1)));
  const name = `${RANKS[Math.min(RANKS.length - 1, Math.floor(hq / 3))]} ${NAMES[Math.floor(R() * NAMES.length)]}`; const lk = LOOKS[Math.floor(R() * LOOKS.length)];
  return { id: `academy-${set}-${slot}`, name, trophies: Math.max(0, W.trophies + Math.round((R() - 0.45) * 120)), hq, layout: academyLayout(hq, seed, difficulty(W.trophies) + (slot - 1) * 0.08), academy: true, look: { primary: lk[0], accent: lk[1] } }; }
export const difficulty = (trophies: number) => Math.max(0.4, Math.min(1.1, 0.45 + trophies / 2400));
export function refreshOpps(s: State, force = false) { const W = war(s); if (W.opps.length === 3 && !force) return W.opps; W.set++; W.opps = [0, 1, 2].map((i) => academyOpp(s, i, W.set)); return W.opps; }
export const baseName = (seed: number) => `${NAMES[seed % NAMES.length]} ${BASES[(seed >> 5) % BASES.length]}`;
// ---------------- an attack plan (Academy attackers, quick-deploy) ----------------
export function aiDeploys(L: Layout, army: Fighter[], seed: number): Deploy[] {
  const R = rng(seed); const defs = L.items.filter((i) => DEF[i.b]); const B = ownedBox(L), N = fieldSize(L); const mx = (B.x0 + B.x1) / 2, mz = (B.z0 + B.z1) / 2; const side = (k: number) => defs.filter((d) => (k === 0 ? d.z < mz : k === 1 ? d.x > mx : k === 2 ? d.z > mz : d.x < mx)).length;
  const sides = [0, 1, 2, 3].sort((a, b) => side(a) - side(b)); const main = sides[0], alt = sides[1];
  const at = (k: number, f: number): [number, number] => { const px = B.x0 + f * (B.x1 - B.x0), pz = B.z0 + f * (B.z1 - B.z0), o = 1.5; return k === 0 ? [px, B.z0 - o] : k === 1 ? [B.x1 + o, pz] : k === 2 ? [px, B.z1 + o] : [B.x0 - o, pz]; };
  const order = army.map((f, i) => ({ i, role: roleOf(f.sp) })); const out: Deploy[] = []; const T: Record<string, number> = { breacher: 0, striker: 18, disruptor: 22, flyer: 30, support: 34 };
  const fm = 0.35 + R() * 0.3, fa = 0.35 + R() * 0.3; // one tight landing zone, so the squad breaks through in one place
  order.forEach((o, n) => { const k = o.role === 'flyer' ? alt : main; const [x, z] = at(k, (k === main ? fm : fa) + (R() - 0.5) * 0.08); out.push({ t: T[o.role] + n * 2, i: o.i, x: Math.round(Math.max(0.2, Math.min(N - 0.2, x)) * 100) / 100, z: Math.round(Math.max(0.2, Math.min(N - 0.2, z)) * 100) / 100 }); });
  return out.sort((a, b) => a.t - b.t);
}
// an Academy squad of a given strength (for the daily drill against your base)
export function academySquad(s: State, seed: number): Fighter[] { const mine = squad(s); const n = Math.max(4, mine.length || 4 + Math.floor(hqLevel(s) / 2)); const R = rng(seed);
  const ri = mine.length ? Math.round(mine.reduce((a, f) => a + rIdxOf(f.sp), 0) / mine.length) : Math.min(2, Math.floor(hqLevel(s) / 4)); const lvl = mine.length ? Math.round(mine.reduce((a, f) => a + f.lvl, 0) / mine.length) : 1 + hqLevel(s) * 2;
  const pool = RB.pool(Math.max(0, Math.min(4, ri))); return Array.from({ length: n }, () => ({ sp: pool[Math.floor(R() * pool.length)], lvl: Math.max(1, Math.min(30, lvl + Math.floor(R() * 3) - 1)) })); }
// ---------------- the result of an attack ----------------
export function canAttack(s: State) { if (!unlocked(s)) return { ok: false, why: 'Build the Tactics Centre (Mission Control level 3)' }; if (war(s).sorties <= 0) return { ok: false, why: 'No sorties left: one returns every 8 hours' }; if (!squad(s).length) return { ok: false, why: 'You need robots to form a strike squad' }; return { ok: true }; }
export function beginSortie(s: State, opp: Opp): BattleInput | null { if (!canAttack(s).ok) return null; const W = war(s); W.sorties--; if (!W.sortieAt) W.sortieAt = Date.now() + SORTIE_EVERY; W.n++; return { layout: JSON.parse(JSON.stringify(opp.layout)), army: squad(s), deploys: [], seed: hash(`${s.created}:${W.n}`) }; }
export function settle(s: State, opp: Opp, input: BattleInput, r: BattleResult, now = Date.now()) {
  const W = war(s); const dT = trophyGain(r.stars, W.trophies, opp.trophies); W.trophies = Math.max(0, W.trophies + dT); W.best = Math.max(W.best, W.trophies);
  const inc = income(s, GRANT_H[r.stars] * (0.6 + 0.4 * r.pct / 100) * (charter(s, 'seat') ? 1.25 : 1)); const reward: Record<string, number> = { credits: inc.credits, metal: inc.metal, fuel: inc.fuel, cells: round2(inc.cells * (0.5 + r.used * 0.15)) }; if (r.stars >= 1) reward.science = inc.science;
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
// chapter steps
stepChecks.trials = (s, st) => (s.stats.warWins || 0) >= (st.n || 1);
stepChecks.circle = (s, st) => circleIdx(war(s).best) >= (st.n || 1);
