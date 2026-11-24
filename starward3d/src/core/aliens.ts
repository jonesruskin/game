// Contact and diplomacy (ported from Starward). Species are discovered when their star is surveyed (or the relay gives them away),
// met through a first-contact choice, understood by deciphering their language in stages, and dealt with through
// gifts, embassies, agreements and requests. Relations drift towards each species' nature. Alien knowledge (xenotech)
// is bought with xenodata. Minor species can be observed, uplifted or exploited, and the Veyari are watching.
import { CIVS, OPENINGS, UNDERSTAND, XENOTECH, REQUESTS, minorsFor, fauna, Civ } from '../data/civs';
import { STARS } from '../data/stars';
import { canPay, pay, give, lvlOf, Rates } from './econ';
import { State, uid } from './state';
import { round2, ladder, clamp, hash } from './util';
import { ist, dist } from './stars';
import { fitMax } from '../data/buildings';
export interface Known { rel: number; und: number; met: number; embassy: number; deals: Record<string, number>; opening: string; req: any; next: number; gift: number; tribute?: boolean; }
export interface Aliens { known: Record<string, Known>; xt: Record<string, number>; ruins: number; minors: Record<string, string>; codex: { name: string; world: string }[]; seen: Record<string, number>; }

let ALL: Record<string, Civ> | null = null; export const allSpecies = (): Record<string, Civ> => ALL || (ALL = { ...CIVS, ...minorsFor(STARS) });
export const al = (s: State): Aliens => { const a = s as any; return a.aliens || (a.aliens = { known: {}, xt: {}, ruins: 0, minors: {}, codex: [], seen: {} }); };
export const known = (s: State, id: string): Known => al(s).known[id];
// ---------------- discovery and first contact ----------------
export function discovered(s: State, id: string) { const d = allSpecies()[id]; const I = ist(s);
  if (id === 'hollow') return !!s.flags.relayFound; if (id === 'krthul') return !!(s.flags.relayVisit || I.surveyed.kapteyn || Object.keys(al(s).known).length >= 4); // they find you once you are noticeable
  if ((id === 'veyari' || id === 'lumen') && s.flags.relayVisit) return true; return !!(I.surveyed[d.star]); }
export const pendingContacts = (s: State) => (s.tech.contactProtocols ? Object.keys(allSpecies()).filter((id) => !known(s, id) && discovered(s, id)) : []);
export function meet(s: State, id: string, opening: string, t = Date.now()) {
  const d = allSpecies()[id]; if (known(s, id)) return; const o = OPENINGS[opening] || OPENINGS.silence; const delta = o.d[id] !== undefined ? o.d[id] : d.minor ? (opening === 'strength' ? -30 : opening === 'silence' ? 10 : 15) : 0;
  al(s).known[id] = { rel: clamp(d.base + delta, -100, 100), und: d.extinct ? 100 : 0, met: t, embassy: 0, deals: {}, opening, req: null, next: t + 6 * 3600e3, gift: 0 };
  if (d.minor) al(s).minors[id] = 'observe';
}
// ---------------- understanding ----------------
export const decipherCost = (s: State, id: string) => { const u = known(s, id).und; return { science: round2(2e7 * (1 + u / 25)), credits: round2(1e7 * (1 + u / 25)) }; };
export const decipherTime = (s: State, id: string) => Math.round(ladder(19 + (known(s, id).und / 25) * 1.4) / (1 + lvlOf(s, 'earth', 'xenolab') * 0.05));
export function canDecipher(s: State, id: string) { const k = known(s, id); if (!k) return { ok: false }; if (k.und >= 100) return { ok: false, why: 'Fully understood', done: true }; if (!s.tech.xenolinguistics) return { ok: false, why: 'Research Xenolinguistics', locked: true };
  if (s.jobs.some((j) => j.kind === 'decipher' && j.sp === id)) return { ok: false, why: 'Linguists at work', busy: true }; const cost = decipherCost(s, id); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost }; return { ok: true, cost, time: decipherTime(s, id) }; }
export function startDecipher(s: State, id: string, t = Date.now()) { const c = canDecipher(s, id); if (!c.ok) return c; pay(s, c.cost!); s.jobs.push({ id: uid(s), kind: 'decipher', sp: id, start: t, end: t + c.time! * 1000 }); return c; }
// ---------------- relations ----------------
export function target(s: State, id: string) { const d = allSpecies()[id], k = known(s, id), A = al(s); let v = d.base + (k.embassy || 0) * 4 + (k.deals.alliance ? 15 : 0) + (k.deals.pact ? 6 : 0);
  if (id === 'krthul' && k.tribute) v += 45;
  if (id === 'veyari') for (const m in A.minors) { if (A.minors[m] === 'exploit') v -= 30; if (A.minors[m] === 'uplift') v += 15; }
  if (d.minor) v += A.minors[id] === 'exploit' ? -60 : A.minors[id] === 'uplift' ? 40 : 0; return clamp(v, -100, 100); }
// relations drift towards the target (τ = 3 days; half as fast with Machine Diplomacy)
export function drift(s: State, dt: number) { const A = (s as any).aliens as Aliens | undefined; if (!A) return; const tau = 3 * 86400 * (A.xt.machineDiplomacy ? 2 : 1); const k = 1 - Math.exp(-dt / tau); for (const id in A.known) { const K = A.known[id]; K.rel += (target(s, id) - K.rel) * k; } }
export const giftSpec = (s: State, id: string, R: Rates) => { const r = allSpecies()[id].gifts || 'credits'; const n = round2(Math.max(5000, (R.prod[r] || 0) * 3)); return { r, n }; };
export function gift(s: State, id: string, R: Rates, t = Date.now()) { const k = known(s, id); if (!k) return { ok: false }; if (t - (k.gift || 0) < 6 * 3600e3) return { ok: false, why: 'They are still digesting your last gift' }; const g = giftSpec(s, id, R); if ((s.res[g.r] || 0) < g.n) return { ok: false, why: 'Not enough ' + g.r };
  s.res[g.r] -= g.n; k.gift = t; k.rel = clamp(k.rel + (id === 'lumen' ? 12 : 8), -100, 100); return { ok: true }; }
// agreements: what each needs (understanding %, relation, influence to sign)
export const DEALS: Record<string, { name: string; und: number; rel: number; inf: number }> = { trade: { name: 'Trade agreement', und: UNDERSTAND.trade, rel: 0, inf: 300 }, pact: { name: 'Research pact', und: UNDERSTAND.pact, rel: 30, inf: 1200 }, alliance: { name: 'Alliance', und: UNDERSTAND.alliance, rel: 70, inf: 5000 } };
export function canDeal(s: State, id: string, kind: string) { const d = allSpecies()[id], k = known(s, id), D = DEALS[kind]; if (!k || d.extinct || d.hostile) return { ok: false, why: d.hostile ? 'They do not make deals' : '' }; if (k.deals[kind]) return { ok: false, why: 'Signed', done: true };
  if (!s.tech.xenodiplomacy) return { ok: false, why: 'Research Xenodiplomacy', locked: true }; if (k.und < D.und) return { ok: false, why: `Needs ${D.und}% understanding`, locked: true }; if (k.rel < D.rel) return { ok: false, why: `Needs relations of ${D.rel}+`, locked: true };
  if (kind === 'alliance' && !k.deals.pact) return { ok: false, why: 'Sign a research pact first', locked: true }; if ((s.res.influence || 0) < D.inf) return { ok: false, why: `Needs ${D.inf} influence`, cost: { influence: D.inf } }; return { ok: true }; }
export function deal(s: State, id: string, kind: string) { const c = canDeal(s, id, kind); if (!c.ok) return c; s.res.influence -= DEALS[kind].inf; known(s, id).deals[kind] = 1; return { ok: true }; }
export const dealActive = (s: State, id: string, kind: string) => { const k = known(s, id); return !!(k && k.deals[kind] && k.rel >= DEALS[kind].rel - 20); };
// embassies (levels 1-5): influence, warmer relations
export const embassyCost = (L: number) => fitMax({ credits: round2(4e7 * Math.pow(1.7, L - 1)), metal: round2(2e7 * Math.pow(1.7, L - 1)) });
export function canEmbassy(s: State, id: string) { const d = allSpecies()[id], k = known(s, id); if (!k || d.extinct || d.hostile) return { ok: false, why: 'Not possible' }; if (!s.tech.xenodiplomacy) return { ok: false, why: 'Research Xenodiplomacy', locked: true }; if (k.embassy >= 5) return { ok: false, why: 'Maximum level', done: true };
  if (s.jobs.some((j) => j.kind === 'embassy' && j.sp === id)) return { ok: false, why: 'Under construction', busy: true }; const cost = embassyCost(k.embassy + 1); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost }; return { ok: true, cost, time: Math.round(ladder(19 + k.embassy * 1.5)) }; }
export function startEmbassy(s: State, id: string, t = Date.now()) { const c = canEmbassy(s, id); if (!c.ok) return c; pay(s, c.cost!); s.jobs.push({ id: uid(s), kind: 'embassy', sp: id, start: t, end: t + c.time! * 1000 }); return c; }
// alien knowledge
export function canXeno(s: State, x: string) { const X = XENOTECH[x], k = known(s, X.sp); if (al(s).xt[x]) return { ok: false, why: 'Learned', done: true }; if (!k) return { ok: false, why: 'Not met', locked: true };
  if (X.sp === 'hollow') { const need = x === 'relicCores' ? 6 : 3; if (al(s).ruins < need) return { ok: false, why: `Excavate the ruins to level ${need}`, locked: true }; }
  else { if (k.und < UNDERSTAND.knowledge) return { ok: false, why: `Needs ${UNDERSTAND.knowledge}% understanding`, locked: true }; if (k.rel < X.rel) return { ok: false, why: `Needs relations of ${X.rel}+`, locked: true }; }
  if ((s.res.xeno || 0) < X.xeno) return { ok: false, why: `Needs ${X.xeno} xenodata`, cost: { xeno: X.xeno } }; return { ok: true }; }
export function learnXeno(s: State, x: string) { const c = canXeno(s, x); if (!c.ok) return c; s.res.xeno -= XENOTECH[x].xeno; al(s).xt[x] = 1; if (x === 'precursorMaps') for (const id in STARS) if (id !== 'sol') ist(s).surveyed[id] = 1; return { ok: true }; }
// minor species: observe (xenodata), uplift (a long project) or exploit (resources, at a moral price)
export function setMinor(s: State, id: string, mode: string) { s.flags.minorDecided = 1; if (!known(s, id) || !allSpecies()[id].minor) return; if (mode === 'uplift') return; al(s).minors[id] = mode; }
export const upliftCost = () => ({ credits: 1.2e8, science: 6e7, xeno: 4000 });
export function canUplift(s: State, id: string) { if (!s.tech.upliftEthics) return { ok: false, why: 'Research Uplift Ethics', locked: true }; if (al(s).minors[id] === 'uplift') return { ok: false, why: 'Uplifted', done: true }; if (s.jobs.some((j) => j.kind === 'uplift' && j.sp === id)) return { ok: false, why: 'Under way', busy: true };
  const cost = upliftCost(); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost }; return { ok: true, cost, time: 5 * 86400 }; }
export function startUplift(s: State, id: string, t = Date.now()) { const c = canUplift(s, id); if (!c.ok) return c; pay(s, c.cost!); s.jobs.push({ id: uid(s), kind: 'uplift', sp: id, start: t, end: t + c.time! * 1000 }); return c; }
// the Kr'thul: pay tribute (a share of credit income) to keep the Swarm calm
export const tributeRate = (R: Rates) => Math.round(Math.max(0, R.prod.credits) * 0.06);
export function setTribute(s: State, on: boolean) { const k = known(s, 'krthul'); if (k) { k.tribute = !!on; s.flags.krthulAnswered = 1; } }
// the Hollow ruins at Epsilon Eridani
export const digCost = (L: number) => fitMax({ credits: round2(5e7 * Math.pow(1.5, L - 1)), science: round2(3e7 * Math.pow(1.5, L - 1)) });
export function canDig(s: State) { if (!known(s, 'hollow')) return { ok: false, why: 'Find the ruins first' }; if (!s.tech.xenoarchaeology) return { ok: false, why: 'Research Xenoarchaeology', locked: true }; const L = al(s).ruins + 1; if (L > 10) return { ok: false, why: 'Fully excavated', done: true };
  if (s.jobs.some((j) => j.kind === 'dig')) return { ok: false, why: 'The dig is under way', busy: true }; const cost = digCost(L); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost }; return { ok: true, cost, time: Math.round(ladder(20 + L * 0.8)) }; }
export function startDig(s: State, t = Date.now()) { const c = canDig(s); if (!c.ok) return c; pay(s, c.cost!); s.jobs.push({ id: uid(s), kind: 'dig', lvl: al(s).ruins + 1, start: t, end: t + c.time! * 1000 }); return c; }
// ---------------- requests ----------------
export function makeRequest(s: State, id: string, R: Rates, t: number) {
  const d = allSpecies()[id], k = known(s, id); const n0 = (hash(id) + Object.keys(k).length + Math.floor(t / 86400e3)) >>> 0; let tpl = REQUESTS[n0 % REQUESTS.length];
  if (tpl.res === 'exotic' && !(R.prod.exotic > 0)) tpl = REQUESTS[0];
  const req: any = { k: tpl.k, until: t + 2 * 86400e3 };
  if (tpl.k === 'give') { req.res = id === 'krthul' ? 'metal' : tpl.res; req.n = round2(Math.max(id === 'krthul' ? 5e6 : 1e6, (R.prod[req.res] || 0) * (id === 'krthul' ? 6 : tpl.hours || 3))); req.text = `${d.name} ${id === 'krthul' ? 'demands' : tpl.text.split(' ')[0]} ${tpl.text.split(' ').slice(1).join(' ').replace('{n}', Math.round(req.n).toLocaleString('en-US'))}`; }
  else if (tpl.k === 'survey') { const I = ist(s); const star = Object.keys(STARS).filter((x) => x !== 'sol' && !I.surveyed[x]).sort((a, b) => dist(a) - dist(b))[0]; if (!star) return makeRequest(s, id, R, t + 86400e3); req.star = star; req.text = `${d.name} ${tpl.text.replace('{star}', STARS[star].name)}`; }
  else { const mx = Math.max(0, ...Object.values(ist(s).colonies).map((C) => C.lvl)); req.n = Math.min(15, mx + 1); req.text = `${d.name} ${tpl.text.replace('{n}', req.n)}`; }
  k.req = req; return req;
}
export function reqDone(s: State, req: any) { if (req.k === 'give') return (s.res[req.res] || 0) >= req.n; if (req.k === 'survey') return !!ist(s).surveyed[req.star]; return Object.values(ist(s).colonies).some((C) => C.lvl >= req.n); }
export function fulfil(s: State, id: string) { const k = known(s, id); const req = k && k.req; if (!req || !reqDone(s, req)) return { ok: false, why: 'Not yet' }; if (req.k === 'give') s.res[req.res] -= req.n;
  const d = allSpecies()[id]; k.rel = clamp(k.rel + 15, -100, 100); const xeno = 400 * Math.max(1, d.tier); give(s, { xeno, influence: 150 }); k.req = null; k.next = Date.now() + 18 * 3600e3; al(s).seen.requests = (al(s).seen.requests || 0) + 1; return { ok: true, xeno }; }
// once a second: issue and expire requests
export function tickAliens(s: State, R: Rates, t = Date.now()) { const A = (s as any).aliens as Aliens | undefined; if (!A) return []; const out: any[] = [];
  for (const id in A.known) { const k = A.known[id], d = allSpecies()[id]; if (d.extinct || (d.minor && A.minors[id] !== 'uplift' && d.tier < 3)) continue;
    if (k.req && t > k.req.until) { k.rel = clamp(k.rel - 8, -100, 100); out.push({ kind: 'reqExpired', sp: id }); k.req = null; k.next = t + 12 * 3600e3; if (id === 'krthul') s.flags.krthulAngered = 1; }
    if (!k.req && t > k.next && (id !== 'krthul' || !k.tribute)) { makeRequest(s, id, R, t); out.push({ kind: 'request', sp: id }); } }
  return out; }
// ---------------- completing jobs ----------------
export function completeAliens(s: State, j: any) {
  if (j.kind === 'decipher') { const k = known(s, j.sp); if (k) k.und = Math.min(100, k.und + 25); give(s, { xeno: 300 }); return { kind: 'decipher', sp: j.sp, und: k ? k.und : 0 }; }
  if (j.kind === 'embassy') { const k = known(s, j.sp); if (k) k.embassy = Math.min(5, k.embassy + 1); return { kind: 'embassy', sp: j.sp, lvl: k ? k.embassy : 0 }; }
  if (j.kind === 'uplift') { al(s).minors[j.sp] = 'uplift'; s.flags.uplifted = 1; give(s, { influence: 2000, xeno: 3000 }); return { kind: 'uplift', sp: j.sp }; }
  if (j.kind === 'dig') { al(s).ruins = Math.max(al(s).ruins, j.lvl); give(s, { xeno: 1500 * j.lvl }); return { kind: 'dig', lvl: j.lvl }; }
  return null;
}
// lower life on a newly settled world
export function discoverLife(s: State, star: string, p: number) { const pl = STARS[star].planets[p]; if (pl.hab < 0.4) return null; const name = fauna(hash(star) + p * 31); al(s).codex.push({ name, world: pl.name }); give(s, { xeno: 600 }); return name; }
export { CIVS, OPENINGS, XENOTECH, DEALS as DEAL_INFO };
// ---------------- v2 hooks: jobs, the economy, the chapter steps ----------------
import { completers, stepChecks } from './game';
import { modHooks, rateHooks, baseHooks } from './econ';
for (const k of ['decipher', 'embassy', 'uplift', 'dig']) completers[k] = (s, j) => completeAliens(s, j);
// alien knowledge and trade agreements change the empire's modifiers
modHooks.push((s, m) => { const A = (s as any).aliens as Aliens | undefined; if (!A) return;
  for (const x in A.xt) { const e = (XENOTECH[x] || ({} as any)).eff || {}; for (const r in e.mult || {}) m.mult[r] = (m.mult[r] || 0) + e.mult![r]; for (const k of ['buildTime', 'researchTime', 'slots'] as const) if (e[k]) m[k] += e[k]; if (e.flag) m.flags.add(e.flag); }
  for (const id in A.known) { const tr = (allSpecies()[id] || ({} as any)).trade; if (!tr || !dealActive(s, id, 'trade')) continue; const k2 = dealActive(s, id, 'alliance') ? 1.5 : 1; for (const r in tr.mult || {}) m.mult[r] = (m.mult[r] || 0) + tr.mult![r] * k2; if (tr.eff && tr.eff.researchTime) m.researchTime += tr.eff.researchTime * k2;
    if (dealActive(s, id, 'pact')) { m.researchTime += 0.04; m.mult.science = (m.mult.science || 0) + 0.04; } } });
// embassies make influence, caravans bring goods, young species are observed (or exploited), the Swarm takes tribute
rateHooks.push((s, R) => { const A = (s as any).aliens as Aliens | undefined; if (!A) return; const m = R.m;
  for (const id in A.known) { const K = A.known[id], d = allSpecies()[id]; if (!d) continue; if (K.embassy) { R.prod.influence += 25 * Math.pow(1.35, K.embassy - 1) * (m.flags.has('machineDiplo') ? 1.5 : 1); R.cap.influence += 2000 * K.embassy; }
    const tr = d.trade; if (tr && tr.prod && dealActive(s, id, 'trade')) for (const r in tr.prod) R.prod[r] += tr.prod[r] * (dealActive(s, id, 'alliance') ? 1.5 : 1);
    if (d.minor) { const mode = A.minors[id]; if (mode === 'observe') R.prod.xeno += 15 * d.tier; if (mode === 'uplift') { R.prod.xeno += 40 * (d.tier + 1); R.prod.influence += 30; } if (mode === 'exploit') { R.prod.metal += 2e5; R.prod.rare += 300; } } }
  const kt = A.known.krthul; if (kt && kt.tribute) R.prod.credits -= tributeRate(R); if (m.flags.has('relicCores') && R.prod.exotic > 0) R.prod.exotic *= 2; });
// Mycelar living soils and spore medicine: colonies grow faster and house more people
const g0 = baseHooks.grow; baseHooks.grow = (s, base) => g0(s, base) * (((s as any).aliens && (s as any).aliens.xt.mycelialTerra) ? 1.5 : 1) * (dealActive(s, 'mycelar', 'trade') ? 1.5 : 1);
const h0 = baseHooks.house; baseHooks.house = (s, base) => h0(s, base) + (((s as any).aliens && (s as any).aliens.xt.sporeMedicine) ? 0.2 : 0);
stepChecks.met = (s, st) => Object.keys(al(s).known).filter((id) => !allSpecies()[id]?.extinct).length >= (st.n || 1);
stepChecks.und = (s, st) => Object.values(al(s).known).some((k) => k.und >= (st.n || 25));
stepChecks.requests = (s, st) => (al(s).seen.requests || 0) >= (st.n || 1);
stepChecks.xenotech = (s, st) => Object.keys(al(s).xt).length >= (st.n || 1);
stepChecks.embassy = (s) => Object.values(al(s).known).some((k) => k.embassy > 0);
stepChecks.deal = (s, st) => Object.values(al(s).known).some((k) => !!k.deals[st.deal]);
stepChecks.ruins = (s, st) => al(s).ruins >= (st.n || 1);
stepChecks.minorChoice = (s) => !!s.flags.minorDecided || !!s.flags.uplifted;
