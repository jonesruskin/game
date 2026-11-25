// Land and exploration. Every base sits in 96 × 96 cells of land. The core square around the command building comes
// with it; beyond that the player claims land plot by plot (6 × 6 cells): each claim costs credits and metal, takes a
// construction crew a while to survey the ground, lay roads and power, and draws energy for ever after. As much land as
// the player can pay and power for.
// The ground hides deposits, seeded by where the colony landed: ice, ore seams, rare minerals, helium-3 regolith,
// methane pools, geothermal vents, sunny ridges and natural shelter (crater walls, lava tubes). Rovers survey plots near
// owned land to reveal them; relay satellites over a world (Earth's satellites at home) show hints from orbit. A
// building standing on a deposit it can use produces more. Exposed sites get dust storms; shelter shrugs them off.
import { State, uid, Item } from './state';
import { GRID, CHUNK, BUILDINGS, capClamp } from '../data/buildings';
import { sitesFor, DEFAULT_SITE, DEPOSITS, Site } from '../data/sites';
import { canPay, pay, hqLevel, rateHooks, itemHooks } from './econ';
import { completers, stepChecks, area, chunkKey, crewsBusy, crewsTotal, Check, Note } from './game';
import { relayLevel, terraSpeed, COLONY } from './solar';
import { sp } from './space';
import { rng, hash, round2, ladder } from './util';
import { isExo, planetOf, ist } from './stars';
export const NCH = GRID / CHUNK; // plots per side
// ---------------- the landing site ----------------
export const siteList = (s: State, base: string): Site[] => { const B = s.bases[base]; if (!B) return []; return sitesFor(B.body, isExo(base) ? planetOf(base)?.pl.type : undefined); };
export function siteOf(s: State, base: string): Site { const L = siteList(s, base); const id = s.bases[base]?.site || DEFAULT_SITE[s.bases[base]?.body] || L[0]?.id; return L.find((x) => x.id === id) || L[0]; }
// the era a base belongs to (prices follow it): Mission Control on Earth, the colony hub plus its place in the story
export const era = (s: State, base: string) => Math.min(24, base === 'earth' ? hqLevel(s) : hqLevel(s, base) + (isExo(base) ? 11 : 7));
// The landing site can be moved until the colony starts building: nothing claimed, surveyed or built beyond the lander's
// starting kit. A colony whose site was never chosen asks on the first visit.
const START_N = (s: State, base: string) => (COLONY[base]?.start.length ?? 4);
export function canResite(s: State, base: string): Check { const B = s.bases[base]; if (!B || base === 'earth') return { ok: false, why: 'Mission Control stays where it is' }; if (siteList(s, base).length < 2) return { ok: false, why: 'Only one place to settle here' };
  if (Object.keys(B.claims || {}).length || Object.keys(B.surveyed || {}).length || B.items.length > START_N(s, base) || B.items.some((i) => i.lvl > 1) || s.jobs.some((j) => j.base === base)) return { ok: false, why: 'The colony is already building here', locked: true };
  return { ok: true }; }
export const siteChosen = (s: State, base: string) => base === 'earth' || !!s.bases[base]?.site || siteList(s, base).length < 2;
export const askSite = (s: State, base: string) => !siteChosen(s, base) && canResite(s, base).ok;
const defaultName = (s: State, base: string, site: Site | undefined) => { const B = s.bases[base]; if (!B || !site) return B?.name || ''; const L = siteList(s, base); const def = L.find((x) => x.id === DEFAULT_SITE[B.body]) || L[0];
  if (isExo(base)) return B.name; if (site.id === def.id) return COLONY[base]?.name || B.name; if (base === 'venus') return B.name; const w = site.name.split(/[ ,]/)[0]; return w + (base === 'moon' ? ' Base' : base === 'mars' ? ' Landing' : ' Station'); };
export function setSite(s: State, base: string, id: string): Check { const c = canResite(s, base); if (!c.ok) return c;
  const B = s.bases[base]; const site = siteList(s, base).find((x) => x.id === id); if (!site) return { ok: false, why: 'Unknown site' }; const old = siteOf(s, base); const wasDefault = B.name === defaultName(s, base, old); B.site = id; if (wasDefault) B.name = defaultName(s, base, site); return { ok: true }; }
terraSpeed.push((s, body) => (s.bases[body] ? 1 + (siteOf(s, body)?.terra || 0) : 1));
// ---------------- deposits ----------------
const TYPES: Record<string, string[]> = { earth: ['ore', 'rare', 'geo', 'sun'], moon: ['ore', 'rare', 'ice', 'he3', 'sun', 'shelter'], mars: ['ore', 'rare', 'ice', 'sun', 'shelter'], ceres: ['ore', 'rare', 'ice', 'shelter'], titan: ['ore', 'rare', 'ice', 'methane', 'shelter', 'geo'], venus: [] };
function typesFor(s: State, base: string) { if (isExo(base)) { const P = planetOf(base); return P && /gas|neptune/.test(P.pl.type) ? [] : ['ore', 'rare', 'ice', 'sun', 'shelter', 'geo']; } return TYPES[s.bases[base]?.body] || []; }
const richOf = (site: Site, t: string) => (t === 'sun' ? site.sun : t === 'shelter' ? site.shelter : (site as any)[t] || 0);
const DEP = new Map<string, Map<number, string>>();
export function deposits(s: State, base: string): Map<number, string> { const site = siteOf(s, base); const key = base + ':' + (site?.id || '-'); const hit = DEP.get(key); if (hit) return hit;
  const m = new Map<number, string>(); const R = rng(hash(key)); const c = GRID / 2;
  const fill = (t: string, cx: number, cz: number, rad: number) => { for (let z = Math.floor(cz - rad - 1); z <= cz + rad + 1; z++) for (let x = Math.floor(cx - rad - 1); x <= cx + rad + 1; x++) { if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue; const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz) + (R() - 0.5) * 0.8; if (d <= rad && !m.has(z * GRID + x)) m.set(z * GRID + x, t); } };
  // the site's two best finds lie in the plots just outside the core, on opposite sides, so the first surveys pay off
  if (site) { const top = typesFor(s, base).filter((t) => t !== 'sun' && t !== 'shelter' && richOf(site, t) > 0).sort((a, b) => richOf(site, b) - richOf(site, a)).slice(0, 2); const d0 = Math.floor(R() * 4);
    top.forEach((t, k) => { const d = (d0 + k * 2) % 4, ax = [1, 0, -1, 0][d], az = [0, 1, 0, -1][d], off = (R() - 0.5) * 10; fill(t, c + ax * 15.5 + az * off, c + az * 15.5 + ax * off, 2.1 + richOf(site, t) * 0.25); }); }
  for (const t of typesFor(s, base)) { const rich = site ? richOf(site, t) : 1; const n = rich * 3 + (R() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) { const cx = 6 + R() * (GRID - 12), cz = 6 + R() * (GRID - 12); if (Math.abs(cx - c) < 7 && Math.abs(cz - c) < 7) continue; const rad = 1.4 + R() * (1.2 + rich * 0.6); fill(t, cx, cz, rad); } }
  DEP.set(key, m); return m; }
// ---------------- what the player knows ----------------
// a plot wholly inside the core square is core land; one the core square only touches is known ground (surveyed) but
// still has to be claimed to build across all of it
const coreChunk = (s: State, base: string, cx: number, cz: number) => { const A = area(s, base); return cx * CHUNK >= A.lo && (cx + 1) * CHUNK <= A.hi && cz * CHUNK >= A.lo && (cz + 1) * CHUNK <= A.hi; };
const touchesCore = (s: State, base: string, cx: number, cz: number) => { const A = area(s, base); return (cx + 1) * CHUNK > A.lo && cx * CHUNK < A.hi && (cz + 1) * CHUNK > A.lo && cz * CHUNK < A.hi; };
// worlds with nothing in the ground (Venus's cloud city, gas giants) need no survey: a new plot there is a new deck module
export const noGround = (s: State, base: string) => !typesFor(s, base).length;
export const surveyed = (s: State, base: string, cx: number, cz: number) => noGround(s, base) || touchesCore(s, base, cx, cz) || !!s.bases[base]?.surveyed?.[cx + ',' + cz];
export const claimed = (s: State, base: string, cx: number, cz: number) => !!s.bases[base]?.claims?.[cx + ',' + cz];
export const ownedChunk = (s: State, base: string, cx: number, cz: number) => coreChunk(s, base, cx, cz) || claimed(s, base, cx, cz);
// orbital hints: 0 none, 1 ice and ore, 2 everything (Earth's satellites, a world's relays, a developed star colony)
export function hintLevel(s: State, base: string) { if (base === 'earth') return (sp(s).sats || []).length >= 3 ? 2 : (sp(s).sats || []).length ? 1 : 0; if (isExo(base)) { const C = ist(s).colonies[base]; return C ? (C.lvl >= 6 ? 2 : C.lvl >= 3 ? 1 : 0) : 0; } const r = relayLevel(s, base); return r >= 3 ? 2 : r >= 1 ? 1 : 0; }
// rovers reach this many plots beyond owned land
export const roverRange = (s: State, base: string) => 2 + hintLevel(s, base);
function distToOwned(s: State, base: string, cx: number, cz: number) { let best = 99; for (let z = 0; z < NCH; z++) for (let x = 0; x < NCH; x++) if (ownedChunk(s, base, x, z)) best = Math.min(best, Math.max(Math.abs(x - cx), Math.abs(z - cz))); return best; }
// deposits visible in a plot (surveyed), or hinted from orbit
export function plotInfo(s: State, base: string, cx: number, cz: number) { const D = deposits(s, base); const found: Record<string, number> = {};
  for (let z = cz * CHUNK; z < (cz + 1) * CHUNK; z++) for (let x = cx * CHUNK; x < (cx + 1) * CHUNK; x++) { const t = D.get(z * GRID + x); if (t) found[t] = (found[t] || 0) + 1; }
  const sv = surveyed(s, base, cx, cz), hl = hintLevel(s, base); const hints = sv ? [] : Object.keys(found).filter((t) => hl >= 2 || (hl >= 1 && (t === 'ice' || t === 'ore')));
  return { surveyed: sv, owned: ownedChunk(s, base, cx, cz), claimed: claimed(s, base, cx, cz), core: coreChunk(s, base, cx, cz), edge: touchesCore(s, base, cx, cz) && !coreChunk(s, base, cx, cz), found: sv ? found : {}, hints }; }
// ---------------- surveying (rovers) ----------------
const nSurveyed = (s: State, base: string) => Object.keys(s.bases[base]?.surveyed || {}).length;
export const surveyCost = (s: State, base: string) => { const e = era(s, base); return { credits: capClamp(round2(160 * Math.pow(1.45, e)), e, 'credits'), fuel: capClamp(round2(70 * Math.pow(1.45, e)), e, 'fuel') }; };
export const surveyTime = (s: State, base: string) => Math.round(ladder(3 + era(s, base) * 0.35 + Math.min(5, nSurveyed(s, base) * 0.06)));
export function canSurvey(s: State, base: string, cx: number, cz: number): Check { if (!s.bases[base] || cx < 0 || cz < 0 || cx >= NCH || cz >= NCH) return { ok: false, why: 'Off the map' };
  if (surveyed(s, base, cx, cz)) return { ok: false, why: 'Surveyed', done: true }; if (s.jobs.some((j) => j.kind === 'prospect' && j.base === base && j.key === cx + ',' + cz)) return { ok: false, why: 'Rover on its way', busy: true };
  if (s.jobs.filter((j) => j.kind === 'prospect').length >= 2) return { ok: false, why: 'Both rovers are out', busy: true }; if (distToOwned(s, base, cx, cz) > roverRange(s, base)) return { ok: false, why: 'Too far for the rovers: claim land closer first', locked: true };
  const cost = surveyCost(s, base); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost }; return { ok: true, cost, time: surveyTime(s, base) }; }
export function startSurvey(s: State, base: string, cx: number, cz: number, t = Date.now()) { const c = canSurvey(s, base, cx, cz); if (!c.ok) return c; pay(s, c.cost!); s.jobs.push({ id: uid(s), kind: 'prospect', base, key: cx + ',' + cz, start: t, end: t + c.time! * 1000 }); return c; }
// ---------------- claiming land ----------------
const nClaims = (s: State, base: string) => Object.keys(s.bases[base]?.claims || {}).length;
export const claimCost = (s: State, base: string) => { const e = era(s, base), k = 1 + nClaims(s, base) * 0.12; return { credits: capClamp(round2(520 * Math.pow(1.5, e) * k), e, 'credits'), metal: capClamp(round2(420 * Math.pow(1.5, e) * k), e, 'metal') }; };
export const claimTime = (s: State, base: string) => Math.round(ladder(4.5 + era(s, base) * 0.4 + Math.min(8, nClaims(s, base) * 0.2)));
export const claimDraw = (s: State, base: string) => Math.round(2 + era(s, base) * 0.6); // energy each claimed plot draws
export function canClaim(s: State, base: string, cx: number, cz: number): Check { if (!s.bases[base] || cx < 0 || cz < 0 || cx >= NCH || cz >= NCH) return { ok: false, why: 'Off the map' };
  if (ownedChunk(s, base, cx, cz)) return { ok: false, why: 'Yours', done: true };
  if (!surveyed(s, base, cx, cz)) return { ok: false, why: 'Survey it first', locked: true };
  const adj = touchesCore(s, base, cx, cz) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => ownedChunk(s, base, cx + dx, cz + dz)); if (!adj) return { ok: false, why: 'Claim land next to land you own', locked: true };
  if (s.jobs.some((j) => j.kind === 'claim' && j.base === base && j.key === cx + ',' + cz)) return { ok: false, why: 'Crews at work', busy: true }; if (crewsBusy(s) >= crewsTotal(s)) return { ok: false, why: 'All construction drones are busy', busy: true };
  const cost = claimCost(s, base); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost }; return { ok: true, cost, time: claimTime(s, base) }; }
export function startClaim(s: State, base: string, cx: number, cz: number, t = Date.now()) { const c = canClaim(s, base, cx, cz); if (!c.ok) return c; pay(s, c.cost!); s.jobs.push({ id: uid(s), kind: 'claim', base, key: cx + ',' + cz, start: t, end: t + c.time! * 1000 }); return c; }
completers.prospect = (s, j): Note => { const base = j.base || 'earth', B = s.bases[base]; if (!B) return { kind: 'none' }; (B.surveyed || (B.surveyed = {}))[j.key] = j.end; const [cx, cz] = String(j.key).split(',').map(Number); return { kind: 'prospect', base, key: j.key, found: Object.keys(plotInfo(s, base, cx, cz).found) }; };
completers.claim = (s, j): Note => { const base = j.base || 'earth', B = s.bases[base]; if (!B) return { kind: 'none' }; (B.claims || (B.claims = {}))[j.key] = j.end; return { kind: 'claim', base, key: j.key }; };
// ---------------- storms ----------------
export function stormAt(s: State, base: string, t = Date.now()) { const site = siteOf(s, base); if (!site || !site.storm) return null; const day = Math.floor(t / 86400e3);
  for (const d of [day - 1, day]) { const R = rng(hash(base + ':storm:' + d)); const start = d * 86400e3 + R() * 86400e3, dur = (1.5 + R() * 2.5 + site.storm) * 3600e3; if (R() < 0.25 + 0.2 * site.storm && t >= start && t < start + dur) return { start, end: start + dur, k: site.storm }; }
  return null; }
export const stormName = (s: State, base: string) => { const b = s.bases[base]?.body; return b === 'mars' ? 'Dust storm' : b === 'titan' ? (siteOf(s, base)?.id === 'belet' ? 'Dune storm' : 'Methane storm') : b === 'venus' ? 'Wind shear' : 'Storm'; };
export function stormSoon(s: State, base: string, t = Date.now()) { return !stormAt(s, base, t) && !!stormAt(s, base, t + 3600e3); }
// ---------------- effects ----------------
// sunlight against the world's first landing site (the one every colony had before sites existed), so old colonies keep their numbers
const sunF = (x: Site | undefined) => 0.8 + (x?.sun ?? 2) * 0.12;
export function sunK(s: State, base: string) { const L = siteList(s, base); if (L.length < 2) return 1; const def = L.find((x) => x.id === DEFAULT_SITE[s.bases[base]?.body]) || L[0]; return sunF(siteOf(s, base)) / sunF(def); }
function under(s: State, base: string, it: Item) { const D = deposits(s, base); if (!D.size) return null; const d = BUILDINGS[it.b]; if (!d) return null; const [w0, d0] = d.fp; const [w, dp] = it.r % 2 ? [d0, w0] : [w0, d0]; let out: Set<string> | null = null;
  for (let z = it.z; z < it.z + dp; z++) for (let x = it.x; x < it.x + w; x++) { const t = D.get(z * GRID + x); if (t && surveyed(s, base, Math.floor(x / CHUNK), Math.floor(z / CHUNK))) (out || (out = new Set())).add(t); } return out; }
export function bonusOf(s: State, base: string, it: Item) { const u = under(s, base, it); let prod = 1, gen = 1, house = 1, shelter = false; if (u) for (const t of u) { const D = DEPOSITS[t]; if (t === 'shelter') shelter = true; if (!D.boosts.includes(it.b)) continue; if (D.prod) prod = Math.max(prod, D.prod); if (D.gen) gen = Math.max(gen, D.gen); if (D.house) house = Math.max(house, D.house); }
  return { prod, gen, house, shelter, types: u ? [...u] : [] }; }
itemHooks.push((s, base, it) => { const b = bonusOf(s, base, it); const st = stormAt(s, base); let prod = b.prod, gen = b.gen; if (st && !b.shelter) { prod *= 1 - 0.04 * st.k; if (it.b === 'solar' || it.b === 'lsolar') gen *= 1 - 0.22 * st.k; }
  if (it.b === 'solar' || it.b === 'lsolar') gen *= sunK(s, base); return prod !== 1 || gen !== 1 || b.house !== 1 ? { prod, gen, house: b.house } : null; });
// every claimed plot draws energy (roads, lights, pumps, life support)
export const drawnClaims = (s: State, base: string) => Object.keys(s.bases[base]?.claims || {}).filter((k) => { const [x, z] = k.split(',').map(Number); return !coreChunk(s, base, x, z); }).length; // the core grown over a plot: it stops drawing
rateHooks.push((s, R) => { for (const k in s.bases) { const n = drawnClaims(s, k); if (n) R.draw += n * claimDraw(s, k); } });
// chapter steps
stepChecks.claims = (s, st) => Object.values(s.bases).reduce((a, B) => a + Object.keys(B.claims || {}).length, 0) >= (st.n || 1);
stepChecks.surveys = (s, st) => Object.values(s.bases).reduce((a, B) => a + Object.keys(B.surveyed || {}).length, 0) >= (st.n || 1);
export const plotKey = chunkKey;
