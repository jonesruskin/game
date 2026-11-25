// The Life Ladder: finding, studying and living alongside alien life. Handcrafted lifeforms are found where real
// astrobiologists would look (a search from the colony or station there); exoplanet biospheres show up once a star is
// surveyed and Exoplanetology can read their atmospheres; the civilisations and the Ascendants join the ladder when
// they are met. Each lifeform is studied in three stages; a fully studied one gives the empire a permanent gift.
// Some life finds us first: lithophage reefs eat into mining claims and native spores get into the domes of new star
// colonies. Contain an outbreak, or study it and turn it into knowledge.
import { LIFE, LIFE_ORDER, RUNGS, EXO_GIFTS, ASCENDANTS, exoName, civRung, LifeDef, Gift } from '../data/life';
import { STARS } from '../data/stars';
import { canPay, pay, give, lvlOf, modHooks, baseHooks, Rates } from './econ';
import { completers, stepChecks, Note } from './game';
import { State, uid } from './state';
import { round2, ladder, hash, rng } from './util';
import { ist, megaStage } from './stars';
import { sol, siteHooks } from './solar';
import { al, allSpecies } from './aliens';
export interface Outbreak { id: string; life: string; where: string; name: string; kind: 'claim' | 'colony'; t: number; until: number; }
export interface LifeState { st: Record<string, number>; found: Record<string, number>; rungs: Record<string, number>; sig: Record<string, number>; voyages: number; outbreaks: Outbreak[]; nextOut: number; seen: number; }
export const life = (s: State): LifeState => { const a = s as any; return a.life || (a.life = { st: {}, found: {}, rungs: {}, sig: {}, voyages: 0, outbreaks: [], nextOut: 0, seen: 0 }); };
export interface Entry { id: string; kind: 'life' | 'exo' | 'civ' | 'asc'; name: string; rung: number; home: string; col: string; art: string; seed: number; state: 'unknown' | 'signal' | 'found'; lvl: number; def?: LifeDef; star?: string; p?: number; sp?: string; giftText?: string; hint?: string; lore?: string; science?: string; size?: string; }
// ---------------- exoplanet biospheres (deterministic, from each world's habitability) ----------------
export interface Bio { star: string; p: number; rung: number; seed: number; name: string; }
let BIO: Record<string, Bio> | null = null;
export function biospheres(): Record<string, Bio> {
  if (BIO) return BIO; BIO = {}; const people = Object.values(allSpecies());
  for (const id in STARS) { if (id === 'sol') continue; STARS[id].planets.forEach((pl, p) => { const seed = hash(id + ':' + p) >>> 0, R = rng(seed), h = pl.hab; let rung = -1;
    if (h >= 0.6 && R() < 0.8) rung = 2; else if (h >= 0.4 && R() < 0.85) rung = 1; else if (h >= 0.22 && R() < 0.6) rung = 0; else if ((pl.type === 'ice' || pl.type === 'ocean') && h >= 0.08 && R() < 0.5) rung = 0;
    if (people.some((c) => c.star === id && c.planet === p)) rung = 2; // a world with people on it has a whole biosphere
    if (rung >= 0) BIO!['x:' + id + ':' + p] = { star: id, p, rung, seed, name: exoName(seed, rung) }; }); }
  return BIO; }
export const bioAt = (star: string, p: number): Bio | undefined => biospheres()['x:' + star + ':' + p];
// ---------------- where each handcrafted lifeform can be looked for ----------------
const BELT = ['vesta', 'pallas', 'psyche', 'hygiea', 'eros'];
function findable(s: State, d: LifeDef) { const f = d.find; if (!s.tech[f.tech]) return false; if (f.colony && !s.bases[f.colony]) return false; if (f.site && !(sol(s).sites[f.site] > 0)) return false;
  if (f.dyson && megaStage(s, 'dyson') < f.dyson) return false; if (f.voyages && life(s).voyages < f.voyages) return false; if (f.outbreak) return life(s).outbreaks.some((o) => o.life === 'lithophages'); return true; }
// every entry the player can see on the ladder (unknown handcrafted ones show as silhouettes with a hint)
export function entries(s: State): Entry[] { const L = life(s), out: Entry[] = [];
  for (const id of LIFE_ORDER) { const d = LIFE[id]; const found = !!L.found[id]; out.push({ id, kind: 'life', name: found ? d.name : findable(s, d) ? `Biosignature: ${d.home.split(',')[0]}` : 'Unknown', rung: d.rung, home: d.home, col: d.col, art: d.art, seed: hash(id), state: found ? 'found' : findable(s, d) ? 'signal' : 'unknown', lvl: L.st[id] || 0, def: d, giftText: d.giftText, hint: d.hint, lore: d.lore, science: d.science, size: d.size }); }
  const I = ist(s); for (const [id, b] of Object.entries(biospheres())) { if (!L.found[id] && !(s.tech.exoplanetology && I.surveyed[b.star])) continue; const pl = STARS[b.star].planets[b.p]; const found = !!L.found[id]; const g = EXO_GIFTS[b.seed % EXO_GIFTS.length];
    out.push({ id, kind: 'exo', name: found ? b.name : `Biosignature on ${pl.name}`, rung: b.rung, home: `${pl.name}, ${STARS[b.star].name}`, col: ['#7cf29a', '#5fe0c8', '#6ec8ff'][b.rung], art: ['cells', 'mats', 'beast'][b.rung], seed: b.seed, state: found ? 'found' : 'signal', lvl: L.st[id] || 0, star: b.star, p: b.p, giftText: g.text, size: RUNGS[b.rung].scale,
      lore: exoLore(b, pl.type), science: `Read from ${pl.name}'s atmosphere in starlight: ${b.rung === 0 ? 'oxygen and methane together, which should destroy each other unless something keeps making them' : b.rung === 1 ? 'oxygen, methane and a seasonal colour shift across the dayside' : 'an oxygen sky and the red edge of light reflected by leaves, or something like them'}.` }); }
  const A = al(s); for (const id in A.known) { const c = allSpecies()[id]; if (!c) continue; out.push({ id: 'c:' + id, kind: 'civ', name: c.name, rung: civRung(c.tier), home: c.origin, col: c.col, art: c.art, seed: c.seed || hash(id), state: 'found', lvl: Math.min(3, Math.floor(A.known[id].und / 34) + (c.extinct ? 3 : 0)), sp: id, lore: c.lore }); }
  if (((s as any).beyond || {}).visited?.farshore) out.push({ id: 'asc', kind: 'asc', name: ASCENDANTS.name, rung: 7, home: ASCENDANTS.home, col: ASCENDANTS.col, art: 'ascendant', seed: 7, state: 'found', lvl: 3, lore: ASCENDANTS.lore, science: ASCENDANTS.science, size: '∞' });
  return out; }
export const entry = (s: State, id: string) => entries(s).find((e) => e.id === id);
function exoLore(b: Bio, type: string) { const R = rng(b.seed + 11); const where = type === 'ocean' ? 'in a world-wide ocean' : type === 'ice' ? 'in an ocean under the ice' : type === 'desert' ? 'in the shade of a desert\'s canyons' : 'across the continents';
  if (b.rung === 0) return `Single cells ${where}, ${['purple with a light-harvesting pigment we have never seen', 'living on hydrogen from the rocks', 'built from the same twenty amino acids as ours, which nobody can explain', 'with a genetic code in a molecule that is not DNA'][Math.floor(R() * 4)]}.`;
  if (b.rung === 1) return `Living mats and reefs ${where}, ${['layered like Earth\'s first stromatolites', 'that pulse with colour when the star flares', 'growing towers a hundred metres high', 'that move, very slowly, towards the light'][Math.floor(R() * 4)]}.`;
  return `A full biosphere ${where}: ${['grazing herds and the things that hunt them', 'forests of tall spiral fronds and creatures that sing at dawn', 'six-legged burrowers, gliding fliers and a reef that thinks in tides', 'flowers that track the star and the swarms that pollinate them'][Math.floor(R() * 4)]}.`; }
// ---------------- searching and studying (stage 0 is the search that finds it; 1..3 are studies) ----------------
export const MAX_BIO = (s: State) => 2 + (lvlOf(s, 'earth', 'xenolab') >= 10 ? 1 : 0);
const baseCost = (e: Entry) => (e.def ? e.def.cost : 3e7 * Math.pow(2.4, e.rung));
export const bioCost = (e: Entry, lvl: number) => { const b = baseCost(e) * Math.pow(2, lvl); return { science: round2(b * 0.6), credits: round2(b * 0.4) }; };
export const bioTime = (s: State, e: Entry, lvl: number) => Math.round(ladder(11.5 + lvl * 1.1 + e.rung * 0.4) / (1 + lvlOf(s, 'earth', 'xenolab') * 0.05));
export function canBio(s: State, id: string, known?: Entry) { const e = known || entry(s, id); if (!e || e.kind === 'civ' || e.kind === 'asc') return { ok: false, why: '' };
  if (e.state === 'unknown') return { ok: false, why: e.hint || 'Not found yet', locked: true }; if (e.lvl >= 3) return { ok: false, why: 'Fully studied', done: true };
  if (!s.tech.xenobiology) return { ok: false, why: 'Research Xenobiology', locked: true }; const lvl = e.state === 'found' ? e.lvl + 1 : 0;
  if (s.jobs.some((j) => j.kind === 'bio' && j.life === id)) return { ok: false, why: 'Under study', busy: true }; if (s.jobs.filter((j) => j.kind === 'bio').length >= MAX_BIO(s)) return { ok: false, why: 'The labs are full', busy: true };
  const cost = bioCost(e, lvl); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost, lvl }; return { ok: true, cost, lvl, time: bioTime(s, e, lvl) }; }
export function startBio(s: State, id: string, t = Date.now()) { const c = canBio(s, id); if (!c.ok) return c; pay(s, c.cost!); s.jobs.push({ id: uid(s), kind: 'bio', life: id, lvl: c.lvl!, start: t, end: t + c.time! * 1000 }); return c; }
// a rung reached for the first time pays dark matter
function reach(s: State, rung: number, t: number) { const L = life(s); if (L.rungs[rung]) return 0; L.rungs[rung] = t; const dm = 30 * (rung + 1); give(s, { dm }); return dm; }
function markFound(s: State, id: string, rung: number, t: number) { const L = life(s); const first = !Object.keys(L.found).some((k) => !k.startsWith('c:')); L.found[id] = t; L.st[id] = L.st[id] || 0; give(s, { xeno: 300 * (rung + 1) });
  L.outbreaks = L.outbreaks.filter((o) => !(o.life === id)); return { first, dm: reach(s, rung, t) }; }
completers.bio = (s, j): Note => { const L = life(s); const e = entry(s, j.life); const rung = e ? e.rung : 0;
  if (j.lvl === 0) { const r = markFound(s, j.life, rung, j.end); return { kind: 'lifeFound', life: j.life, first: r.first, dm: r.dm }; }
  L.st[j.life] = Math.max(L.st[j.life] || 0, j.lvl); give(s, { xeno: 250 * (rung + 1) * j.lvl }); const d = LIFE[j.life]; if (j.lvl >= 3 && d && d.gift.flag) s.flags[d.gift.flag] = 1;
  return { kind: 'lifeStudy', life: j.life, lvl: j.lvl }; };
// ---------------- outbreaks ----------------
export const containCost = (s: State, R: Rates) => ({ credits: round2(Math.max(2e6, R.prod.credits * 1.5)) });
export function contain(s: State, oid: string, R: Rates, t = Date.now()) { const L = life(s); const o = L.outbreaks.find((x) => x.id === oid); if (!o) return { ok: false, why: '' }; const cost = containCost(s, R); if (!canPay(s, cost)) return { ok: false, why: 'Not enough Aurivane', cost };
  pay(s, cost); L.outbreaks = L.outbreaks.filter((x) => x !== o); let found = null; if (!L.found[o.life]) found = markFound(s, o.life, entry(s, o.life)?.rung ?? 1, t); return { ok: true, found }; }
function startOutbreak(s: State, lifeId: string, where: string, name: string, kind: 'claim' | 'colony', t: number): Note { const L = life(s); L.outbreaks.push({ id: 'o' + t.toString(36), life: lifeId, where, name, kind, t, until: t + 12 * 3600e3 }); return { kind: 'outbreak', life: lifeId, where, name, okind: kind }; }
// once a second: outbreaks start and burn out, new signals are announced, civilisations take their rungs
export function tickLife(s: State, t = Date.now()): Note[] { const out: Note[] = []; const a = s as any; if (!a.life && !s.tech.xenobiology && !Object.keys(sol(s).sites).length) return out; const L = life(s);
  for (const o of L.outbreaks) if (t > o.until) out.push({ kind: 'outbreakEnd', name: o.name }); L.outbreaks = L.outbreaks.filter((o) => t <= o.until);
  // lithophages in the belt: first after a claim reaches level 3, then every day or so until the reefs are tamed
  const claims = BELT.filter((b) => (sol(s).sites[b] || 0) >= 3); if (claims.length && (L.st.lithophages || 0) < 3 && !L.outbreaks.some((o) => o.kind === 'claim')) { const R = rng((t / 1000) | 0);
    if (!L.nextOut) L.nextOut = t + (L.found.lithophages ? 24 + R() * 12 : 1.5 + R() * 2.5) * 3600e3; else if (t > L.nextOut) { const c = claims[Math.floor(R() * claims.length)]; L.nextOut = 0; out.push(startOutbreak(s, 'lithophages', c, `${c[0].toUpperCase() + c.slice(1)} Mining Claim`, 'claim', t)); } }
  // native spores in a new star colony on a living world (once per colony)
  for (const key in s.bases) { if (!key.includes(':') || L.sig['col:' + key]) continue; const [star, p] = key.split(':'); const b = bioAt(star, +p); if (!b || b.rung < 1) { L.sig['col:' + key] = t; continue; }
    const C = ist(s).colonies[key]; const since = C ? C.t || t : t; if (t > since + 2 * 3600e3) { L.sig['col:' + key] = t; if (!L.found['x:' + key]) out.push(startOutbreak(s, 'x:' + key, key, s.bases[key].name, 'colony', t)); } }
  // new signals for handcrafted life (once each)
  for (const id of LIFE_ORDER) if (!L.sig[id] && !L.found[id] && findable(s, LIFE[id])) { L.sig[id] = t; if (id !== 'lithophages') out.push({ kind: 'lifeSignal', life: id }); }
  // civilisations and the Ascendants take their rungs as they are met
  for (const id in al(s).known) { const c = allSpecies()[id]; if (!c) continue; const r = civRung(c.tier); if (!L.rungs[r]) { const dm = reach(s, r, t); out.push({ kind: 'rung', rung: r, dm }); } }
  if (a.beyond?.visited?.farshore && !L.rungs[7]) out.push({ kind: 'rung', rung: 7, dm: reach(s, 7, t) });
  return out; }
// voyages between the stars (survey sails and colony ships) draw the drifters
for (const k of ['sail', 'star']) { const c0 = completers[k]; if (c0) completers[k] = (s, j) => { life(s).voyages++; return c0(s, j); }; }
// ---------------- effects ----------------
const outAt = (s: State, kind: string, where: string) => !!((s as any).life && (s as any).life.outbreaks.some((o: Outbreak) => o.kind === kind && o.where === where));
siteHooks.push((s, id) => (outAt(s, 'claim', id) ? 0.5 : 1));
function gifts(s: State): Gift[] { const L = (s as any).life as LifeState | undefined; if (!L) return []; const g: Gift[] = [];
  for (const id in L.st) { if (L.st[id] < 3) continue; if (LIFE[id]) g.push(LIFE[id].gift); else if (id.startsWith('x:')) { const b = biospheres()[id]; if (b) g.push(EXO_GIFTS[b.seed % EXO_GIFTS.length].gift); } } return g; }
modHooks.push((s, m) => { for (const g of gifts(s)) { for (const r in g.mult || {}) m.mult[r] = (m.mult[r] || 0) + g.mult![r]; if (g.researchTime) m.researchTime += g.researchTime; if (g.buildTime) m.buildTime += g.buildTime; if (g.flag) m.flags.add(g.flag); } });
const g0 = baseHooks.grow; baseHooks.grow = (s, base) => { const k = 1 + gifts(s).reduce((a, g) => a + (g.grow || 0), 0); return outAt(s, 'colony', base) ? 0 : g0(s, base) * k; };
// ---------------- chapter steps ----------------
const lifeFound = (s: State) => Object.keys(life(s).found).length;
stepChecks.life = (s, st) => lifeFound(s) >= (st.n || 1);
stepChecks.rung = (s, st) => !!life(s).rungs[st.n || 0];
stepChecks.rungs = (s, st) => Object.keys(life(s).rungs).length >= (st.n || 1);
stepChecks.studied = (s, st) => Object.values(life(s).st).filter((v) => v >= 3).length >= (st.n || 1);
export { LIFE, LIFE_ORDER, RUNGS };
