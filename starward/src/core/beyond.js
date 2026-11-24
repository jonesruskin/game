// STARWARD: the endgame. The Hollow relay network reaches out across the Local Group; expeditions bring back
// permanent gifts; Matrioshka Brains and Ringworlds join the megastructures; achievements pay dark matter; and
// Ascension resets the empire for permanent perks, the loop that keeps a save going for years.
import { GALAXIES, GALAXY_ORDER, EXPEDITIONS, RELAY, MEGA2, PERKS } from '../data/beyond.js';
import { MEGA } from '../data/stars.js';
import { canPay, pay, give, hqLevel } from './econ.js';
import { uid, fresh } from './state.js';
import { round2, ladder } from '../util.js';
import { ist } from './stars.js';
import { sol, terraStage } from './solar.js';
import { al } from './aliens.js';
import { war } from './war.js';
import { TECH } from '../data/research.js';
import * as F from './fund.js';

Object.assign(MEGA, MEGA2); // the endgame megaprojects appear on the Sun's panel with the others
export const bey = (s) => s.beyond || (s.beyond = { relay: 0, visited: {} });
export const ascOf = (s) => s.asc || (s.asc = { points: 0, spent: {}, count: 0 });
// ---------------- the relay network ----------------
// what each funded project costs right now (for the funding UI and the bot)
export function projectCost(s, key) { if (key === 'relay') return bey(s).relay < RELAY.stages ? relayCost(bey(s).relay) : null; if (key.startsWith('exp:')) { const id = key.slice(4); return bey(s).visited[id] || s.jobs.some((j) => j.kind === 'expedition' && j.gal === id) ? null : EXPEDITIONS[id].cost; }
  if (key.startsWith('mega:')) { const id = key.slice(5), d = MEGA[id], n = ist(s).mega[id] || 0; return n < d.stages ? Object.fromEntries(Object.entries(d.cost).map(([r, v]) => [r, round2(v * Math.pow(d.growth, n))])) : null; } return null; }
export const relayCost = (n) => Object.fromEntries(Object.entries(RELAY.cost).map(([r, v]) => [r, round2(v * Math.pow(RELAY.growth, n))]));
export function canRelay(s) { const n = bey(s).relay; if (n >= RELAY.stages) return { ok: false, why: 'Complete', done: true }; if (!s.tech[RELAY.req]) return { ok: false, why: 'Research Relay Network', locked: true };
  if (s.jobs.some((j) => j.kind === 'relay')) return { ok: false, why: 'Under construction', busy: true }; const cost = relayCost(n); if (!F.funded(s, 'relay', cost)) return { ok: false, why: 'Fund the next stage first', fund: true, cost }; return { ok: true, cost, time: Math.round(RELAY.days * 86400 * (1 + n * 0.2)) }; }
export function startRelay(s, t = Date.now()) { const c = canRelay(s); if (!c.ok) return c; const n = bey(s).relay; F.settle(s, 'relay', c.cost, n + 1 < RELAY.stages ? { cost: relayCost(n + 1) } : null); s.jobs.push({ id: uid(s), kind: 'relay', stage: bey(s).relay, start: t, end: t + c.time * 1000 }); return c; }
// ---------------- expeditions ----------------
export const expOpen = (s, id) => { const i = GALAXY_ORDER.indexOf(id); return i === 0 || !!bey(s).visited[GALAXY_ORDER[i - 1]]; };
export function canExpedition(s, id) { const E = EXPEDITIONS[id], B = bey(s); if (B.visited[id]) return { ok: false, why: 'Visited', done: true }; if (!s.tech.intergalacticDrive) return { ok: false, why: 'Research Intergalactic Drive', locked: true };
  if (!expOpen(s, id)) return { ok: false, why: 'Reach the previous galaxy first', locked: true }; if (B.relay < E.relay) return { ok: false, why: `Relay network stage ${E.relay} needed`, locked: true };
  if (s.jobs.some((j) => j.kind === 'expedition')) return { ok: false, why: 'An expedition is already out', busy: true }; if (!F.funded(s, 'exp:' + id, E.cost)) return { ok: false, why: 'Fund the expedition first', fund: true, cost: E.cost }; return { ok: true, time: E.days * 86400 }; }
export function startExpedition(s, id, t = Date.now()) { const c = canExpedition(s, id); if (!c.ok) return c; const nx = GALAXY_ORDER[GALAXY_ORDER.indexOf(id) + 1]; F.settle(s, 'exp:' + id, EXPEDITIONS[id].cost, nx ? { key: 'exp:' + nx, cost: EXPEDITIONS[nx].cost } : null); s.jobs.push({ id: uid(s), kind: 'expedition', gal: id, start: t, end: t + c.time * 1000 }); return c; }
// permanent gifts from visited galaxies, and Ascension perks, feed the modifiers (called from econ.mods)
export function beyondMods(s, m) {
  for (const id in (s.beyond || {}).visited || {}) { const p = EXPEDITIONS[id].perk || {}; for (const r in p.mult || {}) m.mult[r] = (m.mult[r] || 0) + p.mult[r]; if (p.researchTime) m.researchTime += p.researchTime; if (p.flag) m.flags.add(p.flag); }
  const A = s.asc; if (A) { const k = (id) => A.spent[id] || 0; for (const r of ['credits', 'metal', 'fuel', 'science', 'he3', 'rare', 'exotic', 'antimatter']) m.mult[r] = (m.mult[r] || 0) + 0.06 * k('prosperity'); m.buildTime += 0.04 * k('engineering'); m.researchTime += 0.04 * k('insight'); m.crews += k('crews'); }
  const rw = (s.stars && s.stars.mega.ringworld) || 0; if (rw) m.mult.credits = (m.mult.credits || 0) + 0.25 * rw;
}
// ---------------- Ascension ----------------
export function ascensionPoints(s) { const I = ist(s), W = war(s); return Math.floor(Object.keys(s.tech).length / 3 + hqLevel(s) * 2 + Object.keys(I.colonies).length * 3 + Object.keys(sol(s).sites).length + Object.keys(W.hives).filter((k) => k.endsWith('_done')).length * 10 + Object.keys(bey(s).visited).length * 15 + terraStage(s, 'mars') * 2 + Object.keys(s.ach || {}).length); }
export const canAscend = (s) => !!s.flags.ascendant;
export const perkFree = (s) => ascOf(s).points - Object.entries(ascOf(s).spent).reduce((a, [id, n]) => a + n * PERKS[id].cost, 0);
export function buyPerk(s, id) { const A = ascOf(s), P = PERKS[id]; if ((A.spent[id] || 0) >= P.max) return { ok: false, why: 'Maximum rank' }; if (perkFree(s) < P.cost) return { ok: false, why: 'Not enough Ascension points' }; A.spent[id] = (A.spent[id] || 0) + 1; return { ok: true }; }
// begin again: a fresh programme that keeps Ascension, achievements, dark matter and settings
export function ascend(s, t = Date.now()) {
  if (!canAscend(s)) return null; const A = ascOf(s); const n = fresh(t); const earned = ascensionPoints(s);
  n.asc = { points: A.points + earned, spent: { ...A.spent }, count: A.count + 1 }; n.ach = { ...(s.ach || {}) }; n.settings = { ...s.settings }; n.tut = 1;
  const head = A.spent.headstart || 0; for (const r in n.res) if (r !== 'dm') n.res[r] = Math.round(n.res[r] * (1 + head * 4)); n.res.dm = (s.res.dm || 0) + 100 * (A.spent.reserves || 0);
  n.stats.ascended = (s.stats.ascended || 0) + 1; n.stats.lifetimePlayS = (s.stats.lifetimePlayS || 0) + (s.stats.playS || 0); return n;
}
// ---------------- achievements ----------------
const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
export const ACHIEVEMENTS = [
  ['liftoff', 'Liftoff', 'Fly your first rocket.', 10, (s) => s.flags.suborbital], ['orbit', 'Beep, beep', 'Put a satellite in orbit.', 15, (s) => s.flags.firstOrbit],
  ['moonwalk', 'One small step', 'Land astronauts on the Moon.', 25, (s) => s.flags.lunarLanding], ['moonbase', 'Tranquility', 'Found the lunar outpost.', 25, (s) => !!s.bases.moon],
  ['mc10', 'Space agency', 'Raise Mission Control to level 10.', 30, (s) => hqLevel(s) >= 10], ['mc20', 'The greatest agency', 'Raise Mission Control to level 20.', 120, (s) => hqLevel(s) >= 20],
  ['mars', 'Red planet', 'Found a colony on Mars.', 40, (s) => !!s.bases.mars], ['ceres', 'Belter', 'Found a colony on Ceres.', 40, (s) => !!s.bases.ceres], ['titan', 'Methane sea', 'Found a colony on Titan.', 40, (s) => !!s.bases.titan],
  ['outposts', 'Spread out', 'Run 10 outposts and claims.', 40, (s) => Object.keys((s.solar || {}).sites || {}).length >= 10], ['allsites', 'The whole system', 'Run all 21 outposts, claims and scoops.', 80, (s) => Object.keys((s.solar || {}).sites || {}).length >= 21],
  ['terra', 'A second Earth', 'Terraform Mars completely.', 120, (s) => terraStage(s, 'mars') >= 7], ['europa', 'Not alone', 'Find life under Europa\'s ice.', 50, (s) => s.flags.europaLife], ['edge', 'The edge', 'Reach Pluto.', 50, (s) => s.flags.plutoEdge],
  ['star1', 'Another sun', 'Found a star colony.', 60, (s) => Object.keys(ist(s).colonies).length >= 1], ['star8', 'Interstellar empire', 'Run 8 star colonies.', 100, (s) => Object.keys(ist(s).colonies).length >= 8],
  ['dyson', 'Kardashev II', 'Complete the Dyson Swarm.', 150, (s) => (ist(s).mega.dyson || 0) >= 10], ['gate', 'Shortcut', 'Open the Sol Wormhole Gate.', 80, (s) => (ist(s).mega.gate || 0) >= 1],
  ['contact', 'Hello', 'Make first contact.', 60, (s) => Object.keys(al(s).known).length >= 1], ['allies', 'Allies', 'Form an alliance.', 100, (s) => Object.values(al(s).known).some((k) => k.deals && k.deals.alliance)],
  ['uplift', 'Elder species', 'Uplift a young people.', 80, (s) => s.flags.uplifted], ['xeno5', 'Borrowed genius', 'Learn five pieces of alien knowledge.', 80, (s) => Object.keys(al(s).xt).length >= 5],
  ['victory', 'First blood', 'Win a battle.', 40, (s) => war(s).log.some((r) => r.win)], ['queen', 'Silence', 'Kill the Brood Queen.', 200, (s) => s.flags.queenDead], ['armada', 'Armada', 'Command 300 warships.', 80, (s) => sum(war(s).ships) >= 300],
  ['scholar', 'Scholar', 'Research every technology.', 150, (s) => Object.keys(TECH).every((k) => s.tech[k])], ['rockets', 'Rocket factory', 'Build 100 rockets.', 50, (s) => (s.stats.rocketsBuilt || 0) >= 100],
  ['lmc', 'Intergalactic', 'Reach the Large Magellanic Cloud.', 120, (s) => !!bey(s).visited.lmc], ['andromeda', 'The Great Spiral', 'Reach Andromeda.', 200, (s) => !!bey(s).visited.andromeda], ['ascend', 'Begin again', 'Ascend.', 300, (s) => (s.asc && s.asc.count) >= 1],
];
export function checkAchievements(s) { s.ach = s.ach || {}; const out = []; for (const [id, name, , dm, f] of ACHIEVEMENTS) { if (s.ach[id]) continue; let ok = false; try { ok = !!f(s); } catch (e) {} if (ok) { s.ach[id] = Date.now(); give(s, { dm }); out.push({ id, name, dm }); } } return out; }
// ---------------- completing jobs ----------------
export function completeBeyond(s, j) {
  if (j.kind === 'relay') { bey(s).relay = Math.max(bey(s).relay, j.stage + 1); return { kind: 'relay', stage: j.stage + 1 }; }
  if (j.kind === 'expedition') { const E = EXPEDITIONS[j.gal]; bey(s).visited[j.gal] = j.end; give(s, E.reward); const left = s.fund && s.fund.pools['exp:' + j.gal]; if (left) { give(s, left); delete s.fund.pools['exp:' + j.gal]; } if (E.perk && E.perk.flag) s.flags[E.perk.flag] = 1; return { kind: 'expedition', gal: j.gal }; }
  return null;
}
export { GALAXIES, GALAXY_ORDER, EXPEDITIONS, RELAY, PERKS };
