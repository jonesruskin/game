// STARWARD: interstellar rules. Light-sail surveys pushed by the Starshot array, sleeper arks / ramjets / warp ships,
// star colonies (developed level by level, with a specialisation), megastructures (laser array, Dyson swarm, the
// Sol gate) and wormhole gates that turn voyages of days into minutes.
import { STARS, DRIVES, DRIVE_ORDER, SPECS, COLONY_BASE, COLONY_MAX, MEGA, PTYPE } from '../data/stars.js';
import { canPay, pay, give, lvlOf, hqLevel } from './econ.js';
import { uid } from './state.js';
import { round2, ladder, curve } from '../util.js';
import { yardLevel } from './solar.js';

export const ist = (s) => s.stars || (s.stars = { surveyed: {}, colonies: {}, ships: {}, mega: {}, gates: {}, story: {} });
export const dist = (a, b = 'sol') => { const p = STARS[a].pos, q = STARS[b].pos; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
export const megaStage = (s, id) => ist(s).mega[id] || 0;
export const surveyRange = (s) => { const L = megaStage(s, 'laser'); return L ? 6 + L * 8 + (s.aliens && s.aliens.xt.photonicSails ? 20 : 0) : 0; };
// ---------------- light-sail surveys ----------------
export const sailsOut = (s) => s.jobs.filter((j) => j.kind === 'sail').length;
export function sailSpec(s, id) { const d = dist(id); return { cost: { credits: round2(400000 * d), rare: round2(40 * d) }, time: Math.round(d * 3 * 3600 / (1 + megaStage(s, 'laser') * 0.25)) }; }
export function canSail(s, id) {
  const ms = sailSpec(s, id); if (ist(s).surveyed[id]) return { ok: false, why: 'Already surveyed', done: true, ms };
  if (!megaStage(s, 'laser')) return { ok: false, why: 'Build the Starshot Laser Array (tap the Sun)', locked: true, ms };
  if (dist(id) > surveyRange(s)) return { ok: false, why: `Beyond the array\'s reach (${surveyRange(s)} ly): add a stage`, locked: true, ms };
  if (s.jobs.some((j) => j.kind === 'sail' && j.star === id)) return { ok: false, why: 'A sail is on its way', busy: true, ms };
  if (sailsOut(s) >= megaStage(s, 'laser')) return { ok: false, why: `The array can push ${megaStage(s, 'laser')} sail${megaStage(s, 'laser') > 1 ? 's' : ''} at a time`, busy: true, ms };
  if (!canPay(s, ms.cost)) return { ok: false, why: 'Not enough resources', cost: ms.cost, ms };
  return { ok: true, ms };
}
export function startSail(s, id, t = Date.now()) { const c = canSail(s, id); if (!c.ok) return c; pay(s, c.ms.cost); s.jobs.push({ id: uid(s), kind: 'sail', star: id, start: t, end: t + c.ms.time * 1000 }); return c; }
// ---------------- interstellar ships ----------------
export const driveBusy = (s) => s.jobs.find((j) => j.kind === 'drive');
export const drivesOut = (s, id) => s.jobs.filter((j) => j.kind === 'star' && j.ship === id).length;
export const drivesFree = (s, id) => (ist(s).ships[id] || 0) - drivesOut(s, id);
export const driveTime = (s, id) => Math.round(DRIVES[id].time / (1 + yardLevel(s) * 0.08));
export function canBuildDrive(s, id) { const d = DRIVES[id]; const miss = d.req.filter((t) => !s.tech[t]); if (miss.length) return { ok: false, why: 'Research required', locked: true };
  if (yardLevel(s) < d.yard) return { ok: false, why: `Orbital Shipyard level ${d.yard}`, locked: true }; if (driveBusy(s) || s.jobs.some((j) => j.kind === 'ship')) return { ok: false, why: 'The shipyard is busy', busy: true };
  if (!canPay(s, d.cost)) return { ok: false, why: 'Not enough resources', cost: d.cost }; return { ok: true, time: driveTime(s, id) }; }
export function startDrive(s, id, t = Date.now()) { const c = canBuildDrive(s, id); if (!c.ok) return c; pay(s, DRIVES[id].cost); s.jobs.push({ id: uid(s), kind: 'drive', ship: id, start: t, end: t + c.time * 1000 }); return c; }
// ---------------- star colonies ----------------
export const ckey = (star, p) => `${star}:${p}`;
export const capacity = (s) => (s.tech.starColonies ? 2 : 0) + (s.tech.domeWorlds ? 2 : 0) + (s.tech.interstellarTrade ? 2 : 0) + Math.max(0, hqLevel(s) - 15);
// open-air colonies need a habitability of 25%+; Dome Worlds allows domed, orbital and mining settlements anywhere
const livable = (s, pl) => pl.hab >= 0.25 || !!s.tech.domeWorlds;
export const gated = (s, star) => !!(megaStage(s, 'gate') && ist(s).gates[star]);
export function travel(s, star, ship) { const k = ship === 'warp' && s.aliens && s.aliens.xt.photonicSails ? 0.5 : 1; return Math.max(300, Math.round(gated(s, star) ? 600 : dist(star) * DRIVES[ship].hpl * 3600 * k)); }
export function pickDrive(s) { for (const id of DRIVE_ORDER.slice().reverse()) if (drivesFree(s, id) > 0) return id; return null; }
export function foundCost(s) { const n = Object.keys(ist(s).colonies).length; return { credits: round2(2e7 * Math.pow(1.3, n)), metal: round2(1.5e7 * Math.pow(1.3, n)), he3: round2(3000 * Math.pow(1.2, n)) }; }
export function canFound(s, star, p) {
  const st = STARS[star], pl = st.planets[p]; const I = ist(s); const cost = foundCost(s);
  if (!s.tech.starColonies) return { ok: false, why: 'Research Star Colonies', locked: true, tech: 'starColonies', cost };
  if (!I.surveyed[star]) return { ok: false, why: 'Survey the system first', locked: true, cost };
  if (I.colonies[ckey(star, p)]) return { ok: false, why: 'Already settled', done: true, cost };
  if (!livable(s, pl)) return { ok: false, why: pl.hab > 0 ? 'Too hostile: research Dome Worlds' : 'Needs Dome Worlds (domed and orbital settlements)', locked: true, tech: 'domeWorlds', cost };
  if (Object.keys(I.colonies).length + s.jobs.filter((j) => j.kind === 'star').length >= capacity(s)) return { ok: false, why: `Colonial capacity reached (${capacity(s)}): research more administration or raise Mission Control`, locked: true, cost };
  if (s.jobs.some((j) => j.kind === 'star' && j.payload.star === star && j.payload.p === p)) return { ok: false, why: 'Settlers are on their way', busy: true, cost };
  const ship = pickDrive(s); if (!ship) return { ok: false, why: (I.ships.ark || I.ships.ramjet || I.ships.warp) ? 'Every starship is out on a voyage' : 'Build an Exodus Ark at the Orbital Shipyard', ship: true, cost };
  if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost };
  return { ok: true, cost, ship, time: travel(s, star, ship) };
}
export function startFound(s, star, p, t = Date.now()) { const c = canFound(s, star, p); if (!c.ok) return c; pay(s, c.cost); s.jobs.push({ id: uid(s), kind: 'star', payload: { star, p, op: 'found' }, ship: c.ship, name: `Settle ${STARS[star].planets[p].name}`, start: t, end: t + c.time * 1000 }); return c; }
// development: each level is a local build (no crews from Earth), one at a time per colony
export const devCost = (L) => ({ credits: round2(4e6 * Math.pow(1.62, L - 1)), metal: round2(3e6 * Math.pow(1.62, L - 1)), rare: round2(1500 * Math.pow(1.5, L - 1)) });
export const devTime = (L) => Math.round(ladder(17 + 1.3 * (L - 1)));
export function canDevelop(s, key) { const C = ist(s).colonies[key]; if (!C) return { ok: false }; const L = C.lvl + 1; if (L > COLONY_MAX) return { ok: false, why: 'Fully developed', done: true };
  if (s.jobs.some((j) => j.kind === 'develop' && j.key === key)) return { ok: false, why: 'Already building', busy: true }; const cost = devCost(L); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost }; return { ok: true, cost, time: devTime(L) }; }
export function startDevelop(s, key, t = Date.now()) { const c = canDevelop(s, key); if (!c.ok) return c; pay(s, c.cost); s.jobs.push({ id: uid(s), kind: 'develop', key, to: ist(s).colonies[key].lvl + 1, start: t, end: t + c.time * 1000 }); return c; }
export function setSpec(s, key, spec) { const C = ist(s).colonies[key]; if (C && SPECS[spec]) C.spec = spec; }
// what a star colony produces per hour
export function colonyOut(s, key) {
  const C = ist(s).colonies[key]; if (!C) return {}; const st = STARS[C.star], pl = st.planets[C.p]; const T = PTYPE[pl.type]; const sp = SPECS[C.spec || 'balanced'];
  const k = curve(1, 1.25, C.lvl) * (0.45 + pl.hab) * (gated(s, C.star) ? 1.25 : 1) * (s.tech.interstellarTrade ? 1.15 : 1); const o = {};
  for (const r in T.out) { if (r === 'exotic' && !pl.res.exotic) continue; o[r] = COLONY_BASE[r] * T.out[r] * k * ((sp.out && sp.out[r]) || (sp.out ? 0.6 : 1)); }
  if (pl.res.exotic && !o.exotic) o.exotic = COLONY_BASE.exotic * k * ((sp.out && sp.out.exotic) || 0.5);
  for (const r in pl.res) if (!o[r] && r !== 'exotic') o[r] = COLONY_BASE[r] * 0.4 * k * ((sp.out && sp.out[r]) || 1);
  if (sp.out) for (const r in sp.out) if (!o[r] && r !== 'exotic' && r !== 'rare') o[r] = COLONY_BASE[r] * 0.5 * k * sp.out[r];
  return o;
}
// ---------------- megastructures and gates ----------------
export const megaCost = (id, stage) => { const d = MEGA[id]; const o = {}; for (const r in d.cost) o[r] = round2(d.cost[r] * Math.pow(d.growth, stage)); return o; };
export const megaTime = (id, stage) => Math.round(MEGA[id].days * 86400 * (1 + stage * 0.12));
export function canMega(s, id) { const d = MEGA[id]; const n = megaStage(s, id); if (n >= d.stages) return { ok: false, why: 'Complete', done: true }; if (!s.tech[d.req]) return { ok: false, why: 'Research required', locked: true, tech: d.req };
  if (s.jobs.some((j) => j.kind === 'mega' && j.mega === id)) return { ok: false, why: 'A stage is under construction', busy: true }; const cost = megaCost(id, n); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost }; return { ok: true, cost, time: megaTime(id, n) }; }
export function startMega(s, id, t = Date.now()) { const c = canMega(s, id); if (!c.ok) return c; pay(s, c.cost); s.jobs.push({ id: uid(s), kind: 'mega', mega: id, stage: megaStage(s, id), start: t, end: t + c.time * 1000 }); return c; }
export const gateCost = () => ({ credits: 6e7, exotic: 500 });
export function canGate(s, star) { if (!megaStage(s, 'gate')) return { ok: false, why: 'Build the Sol Wormhole Gate first (tap the Sun)', locked: true }; if (ist(s).gates[star]) return { ok: false, why: 'Gate open', done: true };
  if (!Object.values(ist(s).colonies).some((C) => C.star === star)) return { ok: false, why: 'Settle the system first' }; if (s.jobs.some((j) => j.kind === 'gatebuild' && j.star === star)) return { ok: false, why: 'Under construction', busy: true };
  const cost = gateCost(); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost }; return { ok: true, cost, time: 3 * 86400 }; }
export function startGate(s, star, t = Date.now()) { const c = canGate(s, star); if (!c.ok) return c; pay(s, c.cost); s.jobs.push({ id: uid(s), kind: 'gatebuild', star, start: t, end: t + c.time * 1000 }); return c; }
// ---------------- completing jobs ----------------
export function completeStars(s, j) {
  const I = ist(s);
  if (j.kind === 'sail') { I.surveyed[j.star] = 1; give(s, { science: Math.round(dist(j.star) * 120000) }); const out = { kind: 'sail', star: j.star }; if (STARS[j.star].story && !I.story.relay) { I.story.relay = 1; s.flags.relayFound = 1; out.story = 'relay'; } return out; }
  if (j.kind === 'drive') { I.ships[j.ship] = (I.ships[j.ship] || 0) + 1; return { kind: 'drive', ship: j.ship }; }
  if (j.kind === 'mega') { I.mega[j.mega] = Math.max(I.mega[j.mega] || 0, j.stage + 1); return { kind: 'mega', mega: j.mega, stage: j.stage }; }
  if (j.kind === 'gatebuild') { I.gates[j.star] = 1; return { kind: 'gatebuild', star: j.star }; }
  if (j.kind === 'develop') { const C = I.colonies[j.key]; if (C) C.lvl = Math.max(C.lvl, j.to); return { kind: 'develop', key: j.key, lvl: j.to }; }
  if (j.kind === 'star') { const P = j.payload; const key = ckey(P.star, P.p); if (!I.colonies[key]) I.colonies[key] = { star: P.star, p: P.p, lvl: 1, spec: 'balanced', t: j.end }; const out = { kind: 'starcolony', key, star: P.star, name: STARS[P.star].planets[P.p].name, first: Object.keys(I.colonies).length === 1 };
    if (P.star === 'epseri' && !I.story.relayVisit) { I.story.relayVisit = 1; s.flags.relayVisit = 1; out.story = 'relayVisit'; } return out; }
  return null;
}
export { STARS, DRIVES, DRIVE_ORDER, SPECS, MEGA, PTYPE, COLONY_MAX };
