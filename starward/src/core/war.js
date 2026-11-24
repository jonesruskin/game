// STARWARD: conflict rules. A deterministic, round-based battle simulator over stacks of ships (so the same seed
// always replays the same fight), warship construction, planetary defences, Kr'thul raids with warning, fleet
// movements to intercept them, assaults on the Swarm's hives, plunder and blockades (never lost buildings).
import { WARSHIPS, WARSHIP_ORDER, DEFENCE, defCost, DEF_MAX, SWARM, HIVES, HIVE_ORDER, VS, SIZE_W } from '../data/war.js';
import { STARS } from '../data/stars.js';
import { canPay, pay, give } from './econ.js';
import { uid } from './state.js';
import { rng, round2, clamp } from '../util.js';
import { yardLevel } from './solar.js';
import { ist, dist } from './stars.js';
import { known } from './aliens.js';

export const war = (s) => s.war || (s.war = { ships: {}, def: {}, raids: [], log: [], hives: {}, next: 0, fleetAt: 'home', raidsSeen: 0, blockade: {} });
export const UNIT = (k) => WARSHIPS[k] || SWARM[k] || DEFENCE[k];
const stacks = (comp) => Object.entries(comp).filter(([, n]) => n > 0).map(([k, n]) => ({ k, n: Math.round(n), dmg: 0, pend: 0 }));
// ---------------- the battle simulator ----------------
// A attacks B; up to 6 rounds, both sides fire at once. Returns the rounds (for the replay) and the survivors.
export function battle(compA, compB, seed, opt = {}) {
  const R = rng(seed >>> 0); const A = stacks(compA), B = stacks(compB); const rounds = []; const mulA = opt.mulA || 1, mulB = opt.mulB || 1, shB = opt.shieldB || 1;
  const alive = (X) => X.filter((x) => x.n > 0);
  for (let r = 0; r < 6 && alive(A).length && alive(B).length; r++) {
    const shots = [];
    const fire = (X, Y, mul, shK, side) => { const tg = alive(Y); const W = tg.reduce((a, y) => a + SIZE_W[UNIT(y.k).size] * y.n, 0);
      for (const x of alive(X)) { const u = UNIT(x.k); const dmg = u.atk * x.n * (0.85 + R() * 0.3) * mul;
        for (const y of tg) { const v = UNIT(y.k); const share = dmg * (SIZE_W[v.size] * y.n) / W; const sh = v.sh * (u.wpn === 'rail' ? 0.5 : 1) * shK; const eff = share * VS[u.wpn][v.size] * (1 - sh / (sh + u.atk)); y.pend += eff; shots.push({ side, a: x.k, b: y.k, d: eff }); } } };
    fire(A, B, mulA, shB, 'A'); fire(B, A, mulB, 1, 'B');
    const kills = []; for (const y of [...A, ...B]) { if (!y.pend) continue; const hp = UNIT(y.k).hp; const tot = y.dmg + y.pend; const k = Math.min(y.n, Math.floor(tot / hp)); y.n -= k; y.dmg = y.n ? tot - k * hp : 0; y.pend = 0; if (k) kills.push({ k: y.k, n: k, side: A.includes(y) ? 'A' : 'B' }); }
    rounds.push({ shots, kills, A: A.map((x) => [x.k, x.n]), B: B.map((x) => [x.k, x.n]) });
  }
  const left = (X) => Object.fromEntries(X.filter((x) => x.n > 0).map((x) => [x.k, x.n])); const aw = alive(A).length > 0 && alive(B).length === 0;
  return { win: aw, rounds, leftA: left(A), leftB: left(B), startA: compA, startB: compB, seed };
}
// battle forecast: run the real simulator over a few seeds (the weapons triangle and shields matter more than raw numbers)
export function forecast(compA, compB, opt = {}, n = 6) { if (!Object.values(compA).some((x) => x > 0)) return 0; let w = 0; for (let k = 0; k < n; k++) if (battle(compA, compB, 9001 + k * 7919, opt).win) w++; return w / n; }
export const raidForecast = (s, raid, withFleet) => { const W = war(s); const defA = { ...defComp(s, raid.target), ...(withFleet ? W.ships : {}) }; return 1 - forecast(raid.comp, defA, { shieldB: shieldOf(s, raid.target), mulB: s.tech.swarmTactics ? 1.25 : 1 }); };
export const assaultForecast = (s, id) => forecast(war(s).ships, hiveLeft(s, id), { mulA: s.tech.swarmTactics ? 1.25 : 1 });
export const power = (comp) => Object.entries(comp).reduce((a, [k, n]) => a + Math.sqrt(UNIT(k).atk * UNIT(k).hp) * n, 0);
// ---------------- warships ----------------
export const fleet = (s) => ({ ...war(s).ships });
export const warBusy = (s) => s.jobs.find((j) => j.kind === 'warship');
export const warTime = (s, k, n) => Math.round(WARSHIPS[k].time * Math.pow(n, 0.8) / (1 + yardLevel(s) * 0.08));
export const warCost = (k, n) => Object.fromEntries(Object.entries(WARSHIPS[k].cost).map(([r, v]) => [r, round2(v * n)]));
export function canWarship(s, k, n) { const d = WARSHIPS[k]; if (!s.tech[d.req]) return { ok: false, why: 'Research required', locked: true, tech: d.req }; if (yardLevel(s) < d.yard) return { ok: false, why: `Orbital Shipyard level ${d.yard}`, locked: true };
  if (warBusy(s)) return { ok: false, why: 'The war docks are busy', busy: true }; const cost = warCost(k, n); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost }; return { ok: true, cost, time: warTime(s, k, n) }; }
export function startWarship(s, k, n, t = Date.now()) { const c = canWarship(s, k, n); if (!c.ok) return c; pay(s, c.cost); s.jobs.push({ id: uid(s), kind: 'warship', ship: k, n, start: t, end: t + c.time * 1000 }); return c; }
// ---------------- defences (Earth bases, colonies and star colonies) ----------------
export const defLevel = (s, key) => war(s).def[key] || 0;
export const defComp = (s, key) => { const L = defLevel(s, key); return L ? { battery: L * 2, silo: L * 2 } : {}; };
export const shieldOf = (s, key) => 1 + defLevel(s, key) * 0.08 + (s.tech.planetaryDefence ? 0.2 : 0);
export function canDefence(s, key) { if (!s.tech.planetaryDefence) return { ok: false, why: 'Research Planetary Defence', locked: true }; const L = defLevel(s, key) + 1; if (L > DEF_MAX) return { ok: false, why: 'Maximum level', done: true };
  if (s.jobs.some((j) => j.kind === 'defence' && j.key === key)) return { ok: false, why: 'Under construction', busy: true }; const cost = defCost(L); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost }; return { ok: true, cost, time: Math.round(43200 * Math.pow(1.25, L - 1)) }; }
export function startDefence(s, key, t = Date.now()) { const c = canDefence(s, key); if (!c.ok) return c; pay(s, c.cost); s.jobs.push({ id: uid(s), kind: 'defence', key, start: t, end: t + c.time * 1000 }); return c; }
// places that can be raided or defended: off-world bases and star colonies
export function targets(s) { const out = []; for (const id in s.bases) if (id !== 'earth') out.push({ key: id, name: s.bases[id].name }); for (const k in ist(s).colonies) { const C = ist(s).colonies[k]; out.push({ key: k, name: STARS[C.star].planets[C.p].name }); } return out; }
const where = (s, key) => (key === 'home' ? 0 : key.includes(':') ? dist(key.split(':')[0]) : 0);
// ---------------- fleet movements ----------------
export const fleetBusy = (s) => s.jobs.find((j) => j.kind === 'sortie');
export const moveTime = (s, to) => Math.max(1800, Math.round((Math.abs(where(s, to) - where(s, war(s).fleetAt)) * 0.5 + 1) * 3600));
export function canMove(s, to) { if (fleetBusy(s)) return { ok: false, why: 'The fleet is under way', busy: true }; if (war(s).fleetAt === to) return { ok: false, why: 'Already there', done: true }; if (!Object.values(war(s).ships).some((n) => n > 0)) return { ok: false, why: 'No warships' }; return { ok: true, time: moveTime(s, to) }; }
export function startMove(s, to, t = Date.now()) { const c = canMove(s, to); if (!c.ok) return c; s.jobs.push({ id: uid(s), kind: 'sortie', to, start: t, end: t + c.time * 1000 }); return c; }
// assault a hive (the fleet flies there, fights, and comes home)
export const hiveLeft = (s, id) => war(s).hives[id] || HIVES[id].comp;
export const hiveOpen = (s, id) => { const i = HIVE_ORDER.indexOf(id); return i === 0 || !!war(s).hives[HIVE_ORDER[i - 1] + '_done']; };
export function canAssault(s, id) { if (!s.tech.navalWarfare) return { ok: false, why: 'Research Naval Warfare', locked: true }; if (war(s).hives[id + '_done']) return { ok: false, why: 'Destroyed', done: true }; if (!hiveOpen(s, id)) return { ok: false, why: 'Destroy the previous hive first', locked: true };
  if (fleetBusy(s)) return { ok: false, why: 'The fleet is under way', busy: true }; if (!Object.values(war(s).ships).some((n) => n > 0)) return { ok: false, why: 'Build warships first' }; return { ok: true, time: Math.round((dist(HIVES[id].star) * 0.5 + 1) * 3600) }; }
export function startAssault(s, id, t = Date.now()) { const c = canAssault(s, id); if (!c.ok) return c; s.jobs.push({ id: uid(s), kind: 'sortie', hive: id, start: t, end: t + c.time * 1000 }); return c; }
// ---------------- raids ----------------
export const raidsOn = (s) => { const k = known(s, 'krthul'); return !!(k && !s.flags.queenDead && (s.flags.krthulAngered || (s.flags.krthulAnswered && !k.tribute) || s.flags.warDeclared)); };
export function makeRaid(s, t) { const W = war(s); const T = targets(s); if (!T.length) return null; const R = rng((t / 1000) >>> 0); const tg = T[Math.floor(R() * T.length)]; const S = 1 + Math.min(W.raidsSeen, 30) * 0.15;
  const raid = { id: uid(s), target: tg.key, name: tg.name, comp: { drone: Math.round(45 * S), warrior: Math.round(6 * S), brood: Math.round(0.6 * S) }, eta: t + 8 * 3600e3, seed: (t / 1000) >>> 0 }; W.raids.push(raid); W.raidsSeen++; return raid; }
function resolveRaid(s, raid) { const W = war(s); const here = W.fleetAt === raid.target && !fleetBusy(s); const defA = { ...defComp(s, raid.target), ...(here ? W.ships : {}) };
  const res = battle(raid.comp, defA, raid.seed, { shieldB: shieldOf(s, raid.target), mulB: s.tech.swarmTactics ? 1.25 : 1 }); // the Swarm attacks; we defend
  if (here) for (const k of Object.keys(W.ships)) W.ships[k] = res.leftB[k] || 0;
  const rep = { t: raid.eta, kind: 'raid', name: raid.name, win: !res.win, res: { ...res, rounds: res.rounds } };
  if (res.win) { const loot = { credits: Math.min(3e8, Math.floor((s.res.credits || 0) * 0.05)), metal: Math.min(3e8, Math.floor((s.res.metal || 0) * 0.05)) }; for (const r in loot) s.res[r] -= loot[r]; W.blockade[raid.target] = raid.eta + 12 * 3600e3; rep.loot = loot; }
  else { const sal = { metal: round2(power(raid.comp) * 2000), xeno: 300 + W.raidsSeen * 50 }; give(s, sal); rep.salvage = sal; }
  W.log.unshift(rep); W.log = W.log.slice(0, 12); return rep; }
// once a second (and on catch-up): resolve raids that arrived, launch new ones
export function tickWar(s, t = Date.now()) { const W = s.war; if (!W) return []; const out = [];
  for (const raid of W.raids.slice().sort((a, b) => a.eta - b.eta)) if (raid.eta <= t) { W.raids = W.raids.filter((x) => x !== raid); out.push({ kind: 'raidResult', rep: resolveRaid(s, raid) }); }
  if (raidsOn(s) && !W.raids.length && t > W.next) { const r = makeRaid(s, t); W.next = t + 2.5 * 86400e3; if (r) out.push({ kind: 'raidIncoming', raid: r }); }
  return out; }
export const blockaded = (s, key, t = Date.now()) => !!(s.war && s.war.blockade[key] && s.war.blockade[key] > t);
// ---------------- completing jobs ----------------
export function completeWar(s, j) { const W = war(s);
  if (j.kind === 'warship') { W.ships[j.ship] = (W.ships[j.ship] || 0) + j.n; return { kind: 'warship', ship: j.ship, n: j.n }; }
  if (j.kind === 'defence') { W.def[j.key] = (W.def[j.key] || 0) + 1; return { kind: 'defence', key: j.key, lvl: W.def[j.key] }; }
  if (j.kind === 'sortie' && j.to) { W.fleetAt = j.to; return { kind: 'fleetMoved', to: j.to }; }
  if (j.kind === 'sortie' && j.hive) { const H = HIVES[j.hive]; const res = battle(W.ships, hiveLeft(s, j.hive), (j.end / 1000) >>> 0, { mulA: s.tech.swarmTactics ? 1.25 : 1 });
    for (const k of Object.keys(W.ships)) W.ships[k] = res.leftA[k] || 0; W.fleetAt = 'home'; const rep = { t: j.end, kind: 'assault', name: H.name, win: res.win, res };
    if (res.win) { W.hives[j.hive + '_done'] = 1; delete W.hives[j.hive]; give(s, H.loot); ist(s).surveyed[H.star] = 1; rep.loot = H.loot; s.flags['hive_' + j.hive] = 1; if (H.queen) { s.flags.queenDead = 1; W.raids = []; } }
    else W.hives[j.hive] = res.leftB; s.flags.warDeclared = 1; W.log.unshift(rep); W.log = W.log.slice(0, 12); return { kind: 'assault', hive: j.hive, win: res.win, rep }; }
  return null; }
export { WARSHIPS, WARSHIP_ORDER, SWARM, HIVES, HIVE_ORDER, DEFENCE, DEF_MAX, defCost };
