// Interstellar (ported from Starward and rebuilt for v2): light-sail surveys pushed by the Starshot array, sleeper arks,
// ramjets and warp ships, star colonies, megastructures (the laser array, the Dyson swarm, the Sol gate) and wormhole
// gates that turn voyages of days into minutes. In v2 every star colony is also a real base on its exoplanet that you
// can visit and build in, under its own star; the planet-wide economy grows with its development level and
// specialisation, and the base is where its people live.
import { STARS, STAR_IDS, DRIVES, DRIVE_ORDER, SPECS, COLONY_BASE, COLONY_MAX, MEGA, PTYPE, CLASS, Planet, EXO_TERRA, EXO_TERRA_TYPES } from '../data/stars';
import { fitMax, GRID } from '../data/buildings';
import { canPay, pay, give, hqLevel, rateHooks, baseHooks, lvlOf, Rates } from './econ';
import { completers, stepChecks, Check, Note } from './game';
import { State, uid, Item } from './state';
import { round2, ladder, curve } from './util';
import { yardLevel, airHooks } from './solar';
import * as F from './fund';
export interface StarColony { star: string; p: number; lvl: number; spec: string; t: number; }
export interface Interstellar { surveyed: Record<string, number>; colonies: Record<string, StarColony>; ships: Record<string, number>; mega: Record<string, number>; gates: Record<string, number>; story: Record<string, number>; }
export const ist = (s: State): Interstellar => { const a = s as any; return a.stars || (a.stars = { surveyed: {}, colonies: {}, ships: {}, mega: {}, gates: {}, story: {} }); };
export const dist = (a: string, b = 'sol') => { const p = STARS[a].pos, q = STARS[b].pos; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
export const megaStage = (s: State, id: string) => ist(s).mega[id] || 0;
const xt = (s: State, k: string) => !!((s as any).aliens && (s as any).aliens.xt && (s as any).aliens.xt[k]);
export const surveyRange = (s: State) => { const L = megaStage(s, 'laser'); return L ? 6 + L * 8 + (xt(s, 'photonicSails') ? 20 : 0) : 0; };
export const isExo = (base: string) => base.includes(':');
export const ckey = (star: string, p: number) => `${star}:${p}`;
export const planetOf = (key: string): { star: string; p: number; pl: Planet } | null => { const [star, ps] = key.split(':'); const st = STARS[star]; const p = +ps; return st && st.planets[p] ? { star, p, pl: st.planets[p] } : null; };
// ---------------- light-sail surveys ----------------
export const sailsOut = (s: State) => s.jobs.filter((j) => j.kind === 'sail').length;
export function sailSpec(s: State, id: string) { const d = dist(id); return { cost: fitMax({ credits: round2(400000 * d), rare: round2(40 * d) }), time: Math.round((d * 3 * 3600) / (1 + megaStage(s, 'laser') * 0.25)) }; }
export function canSail(s: State, id: string): Check & { ms: ReturnType<typeof sailSpec> } {
  const ms = sailSpec(s, id); if (ist(s).surveyed[id]) return { ok: false, why: 'Already surveyed', done: true, ms };
  if (!megaStage(s, 'laser')) return { ok: false, why: 'Build the Starshot Laser Array (select the Sun)', locked: true, ms };
  if (dist(id) > surveyRange(s)) return { ok: false, why: `Beyond the array's reach (${surveyRange(s)} ly): add a stage`, locked: true, ms };
  if (s.jobs.some((j) => j.kind === 'sail' && j.star === id)) return { ok: false, why: 'A sail is on its way', busy: true, ms };
  if (sailsOut(s) >= megaStage(s, 'laser')) return { ok: false, why: `The array can push ${megaStage(s, 'laser')} sail${megaStage(s, 'laser') > 1 ? 's' : ''} at a time`, busy: true, ms };
  if (!canPay(s, ms.cost)) return { ok: false, why: 'Not enough resources', cost: ms.cost, ms };
  return { ok: true, ms };
}
export function startSail(s: State, id: string, t = Date.now()) { const c = canSail(s, id); if (!c.ok) return c; pay(s, c.ms.cost); s.jobs.push({ id: uid(s), kind: 'sail', star: id, start: t, end: t + c.ms.time * 1000 }); return c; }
// ---------------- interstellar ships ----------------
export const driveBusy = (s: State) => s.jobs.find((j) => j.kind === 'drive');
export const drivesOut = (s: State, id: string) => s.jobs.filter((j) => j.kind === 'star' && j.ship === id).length;
export const drivesFree = (s: State, id: string) => (ist(s).ships[id] || 0) - drivesOut(s, id);
export const driveTime = (s: State, id: string) => Math.round(DRIVES[id].time / (1 + yardLevel(s) * 0.08));
export function canBuildDrive(s: State, id: string): Check { const d = DRIVES[id]; if (d.req.some((t) => !s.tech[t])) return { ok: false, why: 'Research required', locked: true, tech: d.req.find((t) => !s.tech[t]) };
  if (yardLevel(s) < d.yard) return { ok: false, why: `Orbital Shipyard level ${d.yard}`, locked: true }; if (driveBusy(s) || s.jobs.some((j) => j.kind === 'ship')) return { ok: false, why: 'The shipyard is busy', busy: true };
  if (!canPay(s, d.cost)) return { ok: false, why: 'Not enough resources', cost: d.cost }; return { ok: true, cost: d.cost, time: driveTime(s, id) }; }
export function startDrive(s: State, id: string, t = Date.now()) { const c = canBuildDrive(s, id); if (!c.ok) return c; pay(s, DRIVES[id].cost); s.jobs.push({ id: uid(s), kind: 'drive', ship: id, start: t, end: t + c.time! * 1000 }); return c; }
// ---------------- star colonies ----------------
export const capacity = (s: State) => (s.tech.starColonies ? 2 : 0) + (s.tech.domeWorlds ? 2 : 0) + (s.tech.interstellarTrade ? 2 : 0) + Math.max(0, hqLevel(s) - 15);
// open-air colonies need a habitability of 25%+; Dome Worlds allows domed, orbital and mining settlements anywhere
const livable = (s: State, pl: Planet) => pl.hab >= 0.25 || !!s.tech.domeWorlds;
export const gated = (s: State, star: string) => !!(megaStage(s, 'gate') && ist(s).gates[star]);
export function travel(s: State, star: string, ship: string) { const k = (ship === 'warp' && xt(s, 'photonicSails') ? 0.5 : 1) * (s.flags.drifterSails ? 0.8 : 1); return Math.max(300, Math.round(gated(s, star) ? 600 : dist(star) * DRIVES[ship].hpl * 3600 * k)); }
export function pickDrive(s: State) { for (const id of DRIVE_ORDER.slice().reverse()) if (drivesFree(s, id) > 0) return id; return null; }
export function foundCost(s: State) { const n = Object.keys(ist(s).colonies).length; return fitMax({ credits: round2(2e7 * Math.pow(1.3, n)), metal: round2(1.5e7 * Math.pow(1.3, n)), he3: round2(3000 * Math.pow(1.2, n)) }); }
export function canFound(s: State, star: string, p: number): Check {
  const st = STARS[star], pl = st.planets[p]; const I = ist(s); const cost = foundCost(s);
  if (!s.tech.starColonies) return { ok: false, why: 'Research Star Colonies', locked: true, tech: 'starColonies', cost };
  if (!I.surveyed[star]) return { ok: false, why: 'Survey the system first', locked: true, cost };
  if (I.colonies[ckey(star, p)]) return { ok: false, why: 'Already settled', done: true, cost };
  if (!livable(s, pl)) return { ok: false, why: pl.hab > 0 ? 'Too hostile: research Dome Worlds' : 'Needs Dome Worlds (domed and orbital settlements)', locked: true, tech: 'domeWorlds', cost };
  if (Object.keys(I.colonies).length + s.jobs.filter((j) => j.kind === 'star').length >= capacity(s)) return { ok: false, why: `Colonial capacity reached (${capacity(s)}): research more administration or raise Mission Control`, locked: true, cost };
  if (s.jobs.some((j) => j.kind === 'star' && j.payload.star === star && j.payload.p === p)) return { ok: false, why: 'Settlers are on their way', busy: true, cost };
  const ship = pickDrive(s); if (!ship) return { ok: false, why: I.ships.ark || I.ships.ramjet || I.ships.warp ? 'Every starship is out on a voyage' : 'Build an Exodus Ark at the Orbital Shipyard', noShip: true, cost };
  if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost };
  return { ok: true, cost, ship, time: travel(s, star, ship) };
}
export function startFound(s: State, star: string, p: number, t = Date.now()) { const c = canFound(s, star, p); if (!c.ok) return c; pay(s, c.cost!); s.jobs.push({ id: uid(s), kind: 'star', payload: { star, p, op: 'found' }, ship: c.ship, name: `Settle ${STARS[star].planets[p].name}`, start: t, end: t + c.time! * 1000 }); return c; }
// development: each level is a local build (no drones from Earth), one at a time per colony
export const devCost = (L: number) => fitMax({ credits: round2(4e6 * Math.pow(1.62, L - 1)), metal: round2(3e6 * Math.pow(1.62, L - 1)), rare: round2(1500 * Math.pow(1.5, L - 1)) });
export const devTime = (L: number) => Math.round(ladder(17 + 1.3 * (L - 1)));
export function canDevelop(s: State, key: string): Check { const C = ist(s).colonies[key]; if (!C) return { ok: false }; const L = C.lvl + 1; if (L > COLONY_MAX) return { ok: false, why: 'Fully developed', done: true };
  if (s.jobs.some((j) => j.kind === 'develop' && j.key === key)) return { ok: false, why: 'Already building', busy: true }; const cost = devCost(L); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost }; return { ok: true, cost, time: devTime(L) }; }
export function startDevelop(s: State, key: string, t = Date.now()) { const c = canDevelop(s, key); if (!c.ok) return c; pay(s, c.cost!); s.jobs.push({ id: uid(s), kind: 'develop', key, to: ist(s).colonies[key].lvl + 1, start: t, end: t + c.time! * 1000 }); return c; }
export function setSpec(s: State, key: string, spec: string) { const C = ist(s).colonies[key]; if (C && SPECS[spec]) C.spec = spec; }
// what a star colony's whole world produces per hour
export function colonyOut(s: State, key: string) {
  const C = ist(s).colonies[key]; if (!C) return {}; const pl = STARS[C.star].planets[C.p]; const T = PTYPE[pl.type]; const sp = SPECS[C.spec || 'balanced'];
  const k = curve(1, 1.25, C.lvl) * (0.45 + pl.hab) * (gated(s, C.star) ? 1.25 : 1) * (s.tech.interstellarTrade ? 1.15 : 1); const o: Record<string, number> = {};
  for (const r in T.out) { if (r === 'exotic' && !pl.res.exotic) continue; o[r] = COLONY_BASE[r] * T.out[r] * k * ((sp.out && sp.out[r]) || (sp.out ? 0.6 : 1)); }
  if (pl.res.exotic && !o.exotic) o.exotic = COLONY_BASE.exotic * k * ((sp.out && sp.out.exotic) || 0.5);
  for (const r in pl.res) if (!o[r] && r !== 'exotic') o[r] = COLONY_BASE[r] * 0.4 * k * ((sp.out && sp.out[r]) || 1);
  if (sp.out) for (const r in sp.out) if (!o[r] && r !== 'exotic' && r !== 'rare') o[r] = COLONY_BASE[r] * 0.5 * k * sp.out[r];
  return o;
}
// ---------------- the exoplanet base ----------------
// people can breathe outside on the kindest worlds; giants get a cloud-top deck
export const exoBreathable = (key: string) => { const P = planetOf(key); return !!P && P.pl.hab >= 0.6 && ['temperate', 'ocean'].includes(P.pl.type); };
export const exoDeck = (key: string) => { const P = planetOf(key); return !!P && !!(PTYPE[P.pl.type].giant); };
export function foundExoBase(s: State, key: string) { if (s.bases[key]) return; const P = planetOf(key); if (!P) return; const M = GRID / 2; const deck = exoDeck(key); const air = exoBreathable(key);
  const start: [string, number, number][] = [['hub', M - 2, M - 2], [deck ? 'skimmer' : 'ice', M - 7, M - 7], ['reactor', M + 4, M - 7], [air ? 'greenhouse' : 'dome', M - 8, M + 3]]; let n = 0;
  const items: Item[] = start.map(([b, x, z]) => ({ id: 'x' + key.length + key.charCodeAt(0).toString(36) + (n++).toString(36) + (s.seq++).toString(36), b, x, z, r: 0, lvl: 1, held: 0 })); s.bases[key] = { body: key, name: P.pl.name, items, pop: 40 }; }
// ---------------- megastructures and gates ----------------
export const megaCost = (id: string, stage: number) => { const d = MEGA[id]; const o: Record<string, number> = {}; for (const r in d.cost) o[r] = round2(d.cost[r] * Math.pow(d.growth, stage)); return d.fund ? o : fitMax(o); };
export const megaTime = (id: string, stage: number) => Math.round(MEGA[id].days * 86400 * (1 + stage * 0.12));
export function canMega(s: State, id: string): Check { const d = MEGA[id]; const n = megaStage(s, id); if (n >= d.stages) return { ok: false, why: 'Complete', done: true }; if (!s.tech[d.req]) return { ok: false, why: 'Research required', locked: true, tech: d.req };
  if (s.jobs.some((j) => j.kind === 'mega' && j.mega === id)) return { ok: false, why: 'A stage is under construction', busy: true }; const cost = megaCost(id, n); if (d.fund) { if (!F.funded(s, 'mega:' + id, cost)) return { ok: false, why: 'Fund this stage first', fund: true, cost }; } else if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost }; return { ok: true, cost, time: megaTime(id, n) }; }
export function startMega(s: State, id: string, t = Date.now()) { const c = canMega(s, id); if (!c.ok) return c; const n0 = megaStage(s, id); if (MEGA[id].fund) F.settle(s, 'mega:' + id, c.cost!, n0 + 1 < MEGA[id].stages ? { cost: megaCost(id, n0 + 1) } : null); else pay(s, c.cost!); s.jobs.push({ id: uid(s), kind: 'mega', mega: id, stage: megaStage(s, id), start: t, end: t + c.time! * 1000 }); return c; }
export const gateCost = () => ({ credits: 6e7, exotic: 500 });
export function canGate(s: State, star: string): Check { if (!megaStage(s, 'gate')) return { ok: false, why: 'Build the Sol Wormhole Gate first (select the Sun)', locked: true }; if (ist(s).gates[star]) return { ok: false, why: 'Gate open', done: true };
  if (!Object.values(ist(s).colonies).some((C) => C.star === star)) return { ok: false, why: 'Settle the system first' }; if (s.jobs.some((j) => j.kind === 'gatebuild' && j.star === star)) return { ok: false, why: 'Under construction', busy: true };
  const cost = gateCost(); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost }; return { ok: true, cost, time: 3 * 86400 }; }
export function startGate(s: State, star: string, t = Date.now()) { const c = canGate(s, star); if (!c.ok) return c; pay(s, c.cost!); s.jobs.push({ id: uid(s), kind: 'gatebuild', star, start: t, end: t + c.time! * 1000 }); return c; }
// ---------------- completing jobs ----------------
completers.sail = (s, j): Note => { const I = ist(s); I.surveyed[j.star] = 1; give(s, { science: Math.round(dist(j.star) * 120000) }); const out: Note = { kind: 'sail', star: j.star }; if (STARS[j.star].story && !I.story.relay) { I.story.relay = 1; s.flags.relayFound = 1; out.story = 'relay'; } return out; };
completers.drive = (s, j): Note => { const I = ist(s); I.ships[j.ship] = (I.ships[j.ship] || 0) + 1; return { kind: 'drive', ship: j.ship }; };
completers.mega = (s, j): Note => { const I = ist(s); I.mega[j.mega] = Math.max(I.mega[j.mega] || 0, j.stage + 1); return { kind: 'mega', mega: j.mega, stage: j.stage }; };
completers.gatebuild = (s, j): Note => { ist(s).gates[j.star] = 1; return { kind: 'gatebuild', star: j.star }; };
completers.develop = (s, j): Note => { const C = ist(s).colonies[j.key]; if (C) C.lvl = Math.max(C.lvl, j.to || 1); return { kind: "develop", key: j.key, lvl: j.to }; };
completers.star = (s, j): Note => { const I = ist(s); const P = j.payload; const key = ckey(P.star, P.p); if (!I.colonies[key]) I.colonies[key] = { star: P.star, p: P.p, lvl: 1, spec: 'balanced', t: j.end }; foundExoBase(s, key);
  const out: Note = { kind: 'starcolony', key, star: P.star, name: STARS[P.star].planets[P.p].name, first: Object.keys(I.colonies).length === 1 }; if (P.star === 'epseri' && !I.story.relayVisit) { I.story.relayVisit = 1; s.flags.relayVisit = 1; out.story = 'relayVisit'; } return out; };
// ---------------- the economy: colonies' worlds, the Dyson swarm ----------------
rateHooks.push((s: State, R: Rates) => { const I = (s as any).stars as Interstellar | undefined; if (!I) return; const m = R.m;
  for (const key in I.colonies) { const o = colonyOut(s, key); for (const r in o) { R.prod[r] += o[r] * (1 + (m.mult[r] || 0)); if (r === 'exotic' || r === 'rare' || r === 'he3') R.cap[r] += o[r] * 24; } }
  const dy = I.mega.dyson || 0; if (dy) { R.gen += (MEGA.dyson.gen || 0) * dy * (1 + m.gen); for (const r in MEGA.dyson.prod || {}) R.prod[r] += MEGA.dyson.prod![r] * dy * (1 + (m.mult[r] || 0)); } });
// the exoplanet bases: people grow with the colony's development
airHooks.push((s, base) => isExo(base) && exoBreathable(base));
const prevGrow = baseHooks.grow; baseHooks.grow = (s, base) => (isExo(base) ? 0.3 * Math.max(1, lvlOf(s, base, 'hub')) * (ist(s).colonies[base] ? 1 + ist(s).colonies[base].lvl * 0.1 : 1) : prevGrow(s, base));
stepChecks.starSurvey = (s, st) => (st.star ? !!ist(s).surveyed[st.star] : Object.keys(ist(s).surveyed).length >= (st.n || 1));
stepChecks.starCol = (s, st) => Object.keys(ist(s).colonies).length >= (st.n || 1);
stepChecks.starLvl = (s, st) => Object.values(ist(s).colonies).some((C) => C.lvl >= (st.lvl || 1));
stepChecks.drive = (s, st) => (ist(s).ships[st.ship] || 0) >= 1;
stepChecks.mega = (s, st) => megaStage(s, st.mega) >= (st.n || 1);
export { STARS, STAR_IDS, DRIVES, DRIVE_ORDER, SPECS, MEGA, PTYPE, CLASS, COLONY_MAX };
// ---------------- terraforming star colonies (Worldseeding) ----------------
export const exoTerraStage = (s: State, key: string) => ((ist(s) as any).terra || {})[key] || 0;
export const exoTerraformable = (key: string) => { const P = planetOf(key); return !!P && EXO_TERRA_TYPES.includes(P.pl.type) && !exoBreathable(key) && !exoDeck(key); };
const studiedLife = (s: State) => Object.values(((s as any).life || {}).st || {}).filter((v: any) => v >= 3).length;
export function canExoTerra(s: State, key: string): Check { const C = ist(s).colonies[key]; if (!C || !s.bases[key]) return { ok: false, why: 'Found a colony here first' }; if (!exoTerraformable(key)) return { ok: false, why: exoBreathable(key) ? 'Already breathable' : 'This world cannot be terraformed' };
  const n = exoTerraStage(s, key); if (n >= EXO_TERRA.length) return { ok: false, why: 'Terraformed', done: true } as Check; if (!s.tech.worldseeding) return { ok: false, why: 'Research Worldseeding', locked: true, tech: 'worldseeding' } as Check;
  if (s.jobs.some((j) => j.kind === 'exoterra' && j.key === key)) return { ok: false, why: 'Under way', busy: true } as Check; const st = EXO_TERRA[n];
  if (st.life && !studiedLife(s)) return { ok: false, why: 'Fully study a lifeform on the Life Ladder first', locked: true } as Check; if (st.dev && C.lvl < st.dev) return { ok: false, why: `Develop the colony to level ${st.dev} first`, locked: true } as Check;
  const cost = fitMax(st.cost); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost }; return { ok: true, cost, time: Math.round(st.days * 86400) }; }
export function startExoTerra(s: State, key: string, t = Date.now()) { const c = canExoTerra(s, key); if (!c.ok) return c; pay(s, c.cost!); s.jobs.push({ id: uid(s), kind: 'exoterra', key, stage: exoTerraStage(s, key), start: t, end: t + c.time! * 1000 }); return c; }
completers.exoterra = (s, j): Note => { const I = ist(s) as any; I.terra = I.terra || {}; I.terra[j.key] = Math.max(I.terra[j.key] || 0, j.stage + 1); return { kind: 'exoterra', key: j.key, stage: j.stage, last: I.terra[j.key] >= EXO_TERRA.length }; };
stepChecks.exoterra = (s, st) => Object.keys((ist(s) as any).terra || {}).some((k) => exoTerraStage(s, k) >= (st.n || 1));
export { EXO_TERRA as EXO_TERRA_LIST };
