// The endgame (ported from Starward and rebuilt for v2). The Hollow relay network reaches across the Local Group;
// expeditions bring back permanent gifts; the Matrioshka Brain and the Ringworld join the megastructures; the
// Kardashev scale finally measures what the empire commands (a complete Dyson swarm is Type II, the Far Shore with the
// relay network complete is Type III); and Ascension begins again with permanent perks.
import { GALAXIES, GALAXY_ORDER, EXPEDITIONS, HRELAY, MEGA2, PERKS } from '../data/beyond';
import { MEGA } from '../data/stars';
import { give, hqLevel, modHooks, rateHooks, kHooks, baseHooks } from './econ';
import { completers, stepChecks, Note } from './game';
import { State, uid, fresh } from './state';
import { round2 } from './util';
import { ist, megaStage } from './stars';
import { sol, terraStage } from './solar';
import { war as conflict } from './conflict';
import * as F from './fund';
Object.assign(MEGA, MEGA2); // the endgame megaprojects appear on Sol's panel with the others
export interface Beyond { relay: number; visited: Record<string, number>; typeIII?: number; }
export interface Asc { points: number; spent: Record<string, number>; count: number; }
export const bey = (s: State): Beyond => { const a = s as any; return a.beyond || (a.beyond = { relay: 0, visited: {} }); };
export const ascOf = (s: State): Asc => { const a = s as any; return a.asc || (a.asc = { points: 0, spent: {}, count: 0 }); };
// ---------------- the Hollow relay network ----------------
export const relayCost = (n: number) => Object.fromEntries(Object.entries(HRELAY.cost).map(([r, v]) => [r, round2(v * Math.pow(HRELAY.growth, n))])) as Record<string, number>;
export function canRelay(s: State) { const n = bey(s).relay; if (n >= HRELAY.stages) return { ok: false, why: 'Complete', done: true }; if (!s.tech[HRELAY.req]) return { ok: false, why: 'Research the Relay Network', locked: true, tech: HRELAY.req };
  if (s.jobs.some((j) => j.kind === 'hrelay')) return { ok: false, why: 'Under construction', busy: true }; const cost = relayCost(n); if (!F.funded(s, 'relay', cost)) return { ok: false, why: 'Fund the next stage first', fund: true, cost }; return { ok: true, cost, time: Math.round(HRELAY.days * 86400 * (1 + n * 0.2)) }; }
export function startRelay(s: State, t = Date.now()) { const c = canRelay(s); if (!c.ok) return c; const n = bey(s).relay; F.settle(s, 'relay', c.cost!, n + 1 < HRELAY.stages ? { cost: relayCost(n + 1) } : null); s.jobs.push({ id: uid(s), kind: 'hrelay', stage: n, start: t, end: t + c.time! * 1000 }); return c; }
// ---------------- expeditions ----------------
export const expOpen = (s: State, id: string) => { const i = GALAXY_ORDER.indexOf(id); return i === 0 || !!bey(s).visited[GALAXY_ORDER[i - 1]]; };
export function canExpedition(s: State, id: string) { const E = EXPEDITIONS[id], B = bey(s); if (B.visited[id]) return { ok: false, why: 'Visited', done: true }; if (!s.tech.intergalacticDrive) return { ok: false, why: 'Research the Intergalactic Drive', locked: true, tech: 'intergalacticDrive' };
  if (!expOpen(s, id)) return { ok: false, why: 'Reach the previous galaxy first', locked: true }; if (B.relay < E.relay) return { ok: false, why: `Relay network stage ${E.relay} needed`, locked: true };
  if (s.jobs.some((j) => j.kind === 'expedition')) return { ok: false, why: 'An expedition is already out', busy: true }; if (!F.funded(s, 'exp:' + id, E.cost)) return { ok: false, why: 'Fund the expedition first', fund: true, cost: E.cost }; return { ok: true, time: E.days * 86400 }; }
export function startExpedition(s: State, id: string, t = Date.now()) { const c = canExpedition(s, id); if (!c.ok) return c; const nx = GALAXY_ORDER[GALAXY_ORDER.indexOf(id) + 1]; F.settle(s, 'exp:' + id, EXPEDITIONS[id].cost, nx ? { key: 'exp:' + nx, cost: EXPEDITIONS[nx].cost } : null); s.jobs.push({ id: uid(s), kind: 'expedition', gal: id, start: t, end: t + c.time! * 1000 }); return c; }
// ---------------- the Kardashev scale, measured honestly (watts) ----------------
const SUN = 3.8e26;
kHooks.push((s) => { const I = (s as any).stars; let w = 0; if (I) { w += (I.mega.dyson || 0) * SUN * 0.1; w += (I.mega.matrioshka || 0) * 2e26; w += (I.mega.ringworld || 0) * 1e27; for (const k in I.colonies) w += I.colonies[k].lvl * 2e24; }
  const B = (s as any).beyond as Beyond | undefined; if (B) { w += B.relay * 1.5e34; w += Object.keys(B.visited).length * 1.7e35; } return w; });
// gifts from visited galaxies, Ascension perks, the Ringworld and the Matrioshka Brain
modHooks.push((s, m) => { for (const id in ((s as any).beyond || {}).visited || {}) { const p = EXPEDITIONS[id].perk || {}; for (const r in p.mult || {}) m.mult[r] = (m.mult[r] || 0) + p.mult![r]; if (p.researchTime) m.researchTime += p.researchTime; if (p.flag) m.flags.add(p.flag); }
  const A = (s as any).asc as Asc | undefined; if (A) { const k = (id: string) => A.spent[id] || 0; for (const r of ['credits', 'metal', 'fuel', 'science', 'he3', 'rare', 'exotic', 'antimatter']) m.mult[r] = (m.mult[r] || 0) + 0.06 * k('prosperity'); m.buildTime += 0.04 * k('engineering'); m.researchTime += 0.04 * k('insight'); m.crews += k('crews'); }
  const rw = megaStage(s, 'ringworld'); if (rw) m.mult.credits = (m.mult.credits || 0) + 0.25 * rw; const mb = megaStage(s, 'matrioshka'); if (mb) m.researchTime += 0.15 * mb; });
rateHooks.push((s, R) => { const mb = megaStage(s, 'matrioshka'); if (mb) R.prod.science += 1e6 * mb * (1 + (R.m.mult.science || 0)); });
const h0 = baseHooks.house; baseHooks.house = (s, base) => h0(s, base) + 0.5 * megaStage(s, 'ringworld');
const g0 = baseHooks.grow; baseHooks.grow = (s, base) => g0(s, base) * (bey(s).visited.lmc ? 2 : 1);
// ---------------- Ascension ----------------
export function ascensionPoints(s: State) { const I = ist(s), W = conflict(s); return Math.floor(Object.keys(s.tech).length / 3 + hqLevel(s) * 2 + Object.keys(I.colonies).length * 3 + Object.keys(sol(s).sites).length + Object.keys(W.hives).filter((k) => k.endsWith('_done')).length * 10 + Object.keys(bey(s).visited).length * 15 + terraStage(s, 'mars') * 2 + terraStage(s, 'venus') * 2); }
export const canAscend = (s: State) => !!s.flags.ascendant;
export const perkFree = (s: State) => ascOf(s).points - Object.entries(ascOf(s).spent).reduce((a, [id, n]) => a + n * PERKS[id].cost, 0);
export function buyPerk(s: State, id: string) { const A = ascOf(s), P = PERKS[id]; if ((A.spent[id] || 0) >= P.max) return { ok: false, why: 'Maximum rank' }; if (perkFree(s) < P.cost) return { ok: false, why: 'Not enough Ascension points' }; A.spent[id] = (A.spent[id] || 0) + 1; return { ok: true }; }
// begin again: a fresh programme that keeps Ascension, the Botdex, cosmetics, the calendar, War Games trophies,
// dark matter and settings
export function ascend(s: State, t = Date.now()): State | null {
  if (!canAscend(s)) return null; const A = ascOf(s); const n: any = fresh(t); const o = s as any; const earned = ascensionPoints(s);
  n.asc = { points: A.points + earned, spent: { ...A.spent }, count: A.count + 1 }; n.settings = { ...s.settings }; n.tut = 1; n.name = s.name; n.bases.earth.name = s.bases.earth.name;
  if (o.robots) n.robots = { list: [], dex: { ...o.robots.dex }, cores: [], made: 0 }; if (o.style) n.style = JSON.parse(JSON.stringify(o.style)); if (o.daily) n.daily = JSON.parse(JSON.stringify(o.daily)); if (o.war) { n.war = JSON.parse(JSON.stringify(o.war)); n.war.opps = []; n.war.hist = []; n.war.log = []; }
  const head = A.spent.headstart || 0; for (const r in n.res) if (r !== 'dm') n.res[r] = Math.round(n.res[r] * (1 + head * 4)); n.res.dm = (s.res.dm || 0) + 100 * (A.spent.reserves || 0);
  n.stats.ascended = (s.stats.ascended || 0) + 1; n.stats.lifetimePlayS = (s.stats.lifetimePlayS || 0) + (s.stats.playS || 0); n.flags.ascendedOnce = 1; return n;
}
// ---------------- completing jobs ----------------
completers.hrelay = (s, j): Note => { bey(s).relay = Math.max(bey(s).relay, (j.stage || 0) + 1); return { kind: 'hrelay', stage: (j.stage || 0) + 1 }; };
completers.expedition = (s, j): Note => { const E = EXPEDITIONS[j.gal]; bey(s).visited[j.gal] = j.end; give(s, E.reward); const left = (s as any).fund && (s as any).fund.pools['exp:' + j.gal]; if (left) { give(s, left); delete (s as any).fund.pools['exp:' + j.gal]; } if (E.perk && E.perk.flag) s.flags[E.perk.flag] = 1; return { kind: 'expedition', gal: j.gal }; };
stepChecks.relay = (s, st) => bey(s).relay >= (st.n || 1);
stepChecks.galaxy = (s, st) => !!bey(s).visited[st.gal];
export { GALAXIES, GALAXY_ORDER, EXPEDITIONS, HRELAY, PERKS };
