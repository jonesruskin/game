// STARWARD: game rules. Construction, upgrades and research on real-time timers, engineering crews,
// dark-matter speed-ups, objectives, and exact offline catch-up (production is integrated piecewise
// between each timer completion, so a reactor finishing at 3 a.m. powers the mines from 3 a.m.).
import { BUILDINGS, allowedLevel, allowedCount, crewsFromHq, cmdReqs, capClamp, unlockHq } from '../data/buildings.js';
import { TECH, techCost, techTime } from '../data/research.js';
import { LAYOUTS } from '../data/layouts.js';
import { allSteps } from '../data/objectives.js';
import { mods, rates, accrue, canPay, pay, give, hqLevel, bStats } from './econ.js';
import { uid } from './state.js';
import { completeSpace, sp } from './space.js';
import { completeSolar, sol, terraStage } from './solar.js';
import { completeStars, ist } from './stars.js';
import { completeAliens, al, discoverLife } from './aliens.js';
import { completeWar, war } from './war.js';
import { curve, round2, timeCurve } from '../util.js';

export const costOf = (id, L, m) => { const d = BUILDINGS[id]; const out = {}; const h = unlockHq(id, L); for (const r in d.cost) out[r] = capClamp(round2(curve(d.cost[r][0], d.cost[r][1], L) * (1 - m.costs)), h, r); return out; };
export const timeOf = (id, L, m) => { const d = BUILDINGS[id]; return Math.max(2, Math.round(timeCurve(d.time, L) * (1 - m.buildTime))); };
export const researchTimeOf = (t, R) => Math.max(5, Math.round(techTime(TECH[t]) * (1 - R.m.researchTime) / (1 + R.speed)));
export const crewsTotal = (s, m = mods(s)) => crewsFromHq(hqLevel(s)) + m.crews;
export const crewsBusy = (s) => s.jobs.filter((j) => j.kind === 'build').length;
export const slotsTotal = (s, m = mods(s)) => 1 + m.slots;
export const slotsBusy = (s) => s.jobs.filter((j) => j.kind === 'research').length;
export const jobAt = (s, base, lot) => s.jobs.find((j) => j.kind === 'build' && j.base === base && j.lot === lot);
export const lotOpen = (s, base, lotDef) => hqLevel(s, base) >= lotDef.hq;
export const countOf = (s, base, b) => Object.values(s.bases[base].lots).filter((l) => l.b === b).length + s.jobs.filter((j) => j.kind === 'build' && j.base === base && j.b === b && j.from === 0).length;

// can this building be placed on this lot? returns { ok, why }
export function canBuild(s, base, lotId, b) {
  const d = BUILDINGS[b]; const lay = LAYOUTS[base]; const lotDef = lay.lots.find((l) => l.id === lotId); const m = mods(s); const hq = hqLevel(s, base);
  if (!d || !lotDef) return { ok: false, why: 'Unknown' }; if (!d.bases.includes(base)) return { ok: false, why: 'Cannot be built here' };
  if (!lotOpen(s, base, lotDef)) return { ok: false, why: `Opens at command level ${lotDef.hq}` };
  if (s.bases[base].lots[lotId] && s.bases[base].lots[lotId].b) return { ok: false, why: 'Lot occupied' };
  if ((d.lot || null) !== (lotDef.special || null)) return { ok: false, why: d.lot ? 'Needs its special lot' : 'Reserved lot' };
  if (d.size > lotDef.size) return { ok: false, why: 'Too big for this lot' };
  if (d.req && d.req.tech && !s.tech[d.req.tech]) return { ok: false, why: `Research ${TECH[d.req.tech].name}`, tech: d.req.tech };
  if (d.req && d.req.hq && hq < d.req.hq) return { ok: false, why: `Command level ${d.req.hq}` };
  if (countOf(s, base, b) >= allowedCount(d, hq)) return { ok: false, why: allowedCount(d, hq) ? 'Limit reached for this command level' : `Command level ${d.count.findIndex((c) => c > 0) + 1}` };
  if (crewsBusy(s) >= crewsTotal(s, m)) return { ok: false, why: 'All crews busy', crews: true };
  const cost = costOf(b, 1, m); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost };
  return { ok: true, cost, time: timeOf(b, 1, m) };
}
// unmet command-level prerequisites for taking building b to level L on this base
export const reqsMissing = (s, base, b, L) => cmdReqs(b, L, base).filter(([rb, n]) => !Object.values(s.bases[base].lots).some((l) => l.b === rb && l.lvl >= n));
// highest level a building may reach right now (colony hubs follow Mission Control back on Earth)
export const levelCap = (s, base, b) => { const d = BUILDINGS[b]; if (d.lot === 'hq' && base !== 'earth') return Math.max(1, Math.min(d.max, hqLevel(s, 'earth') - 7)); return allowedLevel(d, hqLevel(s, base)); };
export function canUpgrade(s, base, lotId) {
  const lot = s.bases[base].lots[lotId]; if (!lot || !lot.b) return { ok: false, why: 'Empty' }; const d = BUILDINGS[lot.b]; const m = mods(s); const hq = hqLevel(s, base);
  if (jobAt(s, base, lotId)) return { ok: false, why: 'Under construction' };
  if (lot.lvl >= d.max) return { ok: false, why: 'Maximum level', max: true };
  if (d.lot === 'hq' && base !== 'earth' && lot.lvl >= levelCap(s, base, lot.b)) return { ok: false, why: `Mission Control level ${lot.lvl + 8} on Earth`, hq: true };
  const miss = reqsMissing(s, base, lot.b, lot.lvl + 1); if (miss.length) return { ok: false, why: `First upgrade ${miss.map(([b, n]) => BUILDINGS[b].name + ' to level ' + n).join(', ')}`, reqs: miss, hq: true };
  if (lot.lvl >= allowedLevel(d, hq)) return { ok: false, why: `Upgrade ${base === 'earth' ? 'Mission Control' : 'the Colony Hub'} first`, hq: true };
  if (crewsBusy(s) >= crewsTotal(s, m)) return { ok: false, why: 'All crews busy', crews: true };
  const cost = costOf(lot.b, lot.lvl + 1, m); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost };
  return { ok: true, cost, time: timeOf(lot.b, lot.lvl + 1, m) };
}
export function startBuild(s, base, lotId, b, t = Date.now()) {
  const c = canBuild(s, base, lotId, b); if (!c.ok) return c; pay(s, c.cost);
  s.bases[base].lots[lotId] = { b, lvl: 0 }; s.jobs.push({ id: uid(s), kind: 'build', base, lot: lotId, b, from: 0, to: 1, start: t, end: t + c.time * 1000 });
  return c;
}
export function startUpgrade(s, base, lotId, t = Date.now()) {
  const c = canUpgrade(s, base, lotId); if (!c.ok) return c; pay(s, c.cost); const lot = s.bases[base].lots[lotId];
  s.jobs.push({ id: uid(s), kind: 'build', base, lot: lotId, b: lot.b, from: lot.lvl, to: lot.lvl + 1, start: t, end: t + c.time * 1000 });
  return c;
}
export function canResearch(s, id) {
  const t = TECH[id]; if (!t) return { ok: false, why: 'Unknown' }; if (s.tech[id]) return { ok: false, why: 'Researched', done: true };
  if (s.jobs.some((j) => j.kind === 'research' && j.tech === id)) return { ok: false, why: 'In progress', busy: true };
  const miss = t.req.filter((r) => !s.tech[r]); if (miss.length) return { ok: false, why: 'Requires ' + miss.map((r) => TECH[r].name).join(', '), locked: true };
  if (t.hq && hqLevel(s) < t.hq) return { ok: false, why: `Mission Control ${t.hq}`, locked: true };
  if (!lvlOfAny(s, 'research')) return { ok: false, why: 'Build a Research Center', locked: true };
  const m = mods(s); if (slotsBusy(s) >= slotsTotal(s, m)) return { ok: false, why: 'Research slot busy', slots: true };
  const cost = techCost(t); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost };
  return { ok: true, cost, time: researchTimeOf(id, rates(s, m)) };
}
const lvlOfAny = (s, b) => Object.values(s.bases).some((B) => Object.values(B.lots).some((l) => l.b === b && l.lvl > 0));
export function startResearch(s, id, t = Date.now()) {
  const c = canResearch(s, id); if (!c.ok) return c; pay(s, c.cost); s.jobs.push({ id: uid(s), kind: 'research', tech: id, start: t, end: t + c.time * 1000 }); return c;
}
// apply a finished job; returns a notification
function complete(s, j) {
  s.jobs = s.jobs.filter((x) => x !== j);
  if (j.kind === 'build') { const lot = s.bases[j.base].lots[j.lot]; lot.lvl = j.to; if (j.from === 0) s.stats.built++; else s.stats.upgrades++; return { kind: 'build', b: j.b, lvl: j.to, base: j.base, lot: j.lot }; }
  if (j.kind === 'research') { s.tech[j.tech] = 1; s.stats.researched++; return { kind: 'research', tech: j.tech }; }
  if (j.kind === 'ship' || j.kind === 'voyage' || j.kind === 'terra') return completeSolar(s, j);
  if (['sail', 'drive', 'mega', 'gatebuild', 'develop', 'star'].includes(j.kind)) { const n = completeStars(s, j); if (n && n.kind === 'starcolony') n.life = discoverLife(s, n.star, +n.key.split(':')[1]); return n; }
  if (['decipher', 'embassy', 'uplift', 'dig'].includes(j.kind)) return completeAliens(s, j);
  if (['warship', 'defence', 'sortie'].includes(j.kind)) return completeWar(s, j);
  return completeSpace(s, j);
}
// advance the world to time t (handles offline gaps exactly). Returns notifications in order.
export function advance(s, t = Date.now()) {
  const out = []; let guard = 0;
  while (guard++ < 10000) {
    const next = s.jobs.reduce((a, j) => (j.end <= t && (!a || j.end < a.end) ? j : a), null);
    const R = rates(s); let upTo = next ? Math.max(s.last, next.end) : t;
    // growing colonies change production as they go: integrate them in steps of at most an hour
    const growing = Object.values(R.col).some((c) => c.pop < c.house && c.grow > 0); const partial = growing && upTo - s.last > 3600000; if (partial) upTo = s.last + 3600000;
    accrue(s, R, (upTo - s.last) / 1000); s.last = upTo;
    if (partial) continue; if (!next) break; const n = complete(s, next); if (n) { n.t = next.end; out.push(n); }
  }
  s.last = t; return out;
}
// dark-matter price of skipping the remaining time (finishing is free in the last minute)
export const dmCost = (sec) => (sec <= 60 ? 0 : Math.ceil(1.2 * Math.pow(sec / 60, 0.72)));
export function speedup(s, jobId, t = Date.now()) {
  const j = s.jobs.find((x) => x.id === jobId); if (!j) return { ok: false }; const c = dmCost((j.end - t) / 1000);
  if ((s.res.dm || 0) < c) return { ok: false, why: 'Not enough dark matter', need: c }; s.res.dm -= c; s.stats.dmSpent += c; j.end = t; return { ok: true, spent: c };
}
export function skip(s, jobId, sec, t = Date.now()) { const j = s.jobs.find((x) => x.id === jobId); if (!j) return false; j.end = Math.max(t, j.end - sec * 1000); return true; }
export function cancel(s, jobId) {
  const j = s.jobs.find((x) => x.id === jobId); if (!j) return false; const m = mods(s);
  if (j.kind === 'build') { const cost = costOf(j.b, j.to, m); give(s, Object.fromEntries(Object.entries(cost).map(([r, n]) => [r, Math.floor(n * 0.5)]))); if (j.from === 0) delete s.bases[j.base].lots[j.lot]; }
  if (j.kind === 'research') { const cost = techCost(TECH[j.tech]); give(s, Object.fromEntries(Object.entries(cost).map(([r, n]) => [r, Math.floor(n * 0.5)]))); }
  if (j.kind === 'mission') return false; // no aborts once a rocket has left the pad
  s.jobs = s.jobs.filter((x) => x !== j); return true;
}
// clear a lot (no refund). Command buildings and the launch complex stay; so does anything under construction.
export function canDemolish(s, base, lotId) { const lot = s.bases[base].lots[lotId]; const def = LAYOUTS[base].lots.find((l) => l.id === lotId); return !!(lot && lot.b && def && !def.special && !jobAt(s, base, lotId)); }
export function demolish(s, base, lotId) { if (!canDemolish(s, base, lotId)) return false; delete s.bases[base].lots[lotId]; return true; }
// ---------------- objectives ----------------
const STEPS = allSteps();
export const currentStep = (s) => STEPS[s.obj.i] || null;
export function stepDone(s, st, R = rates(s)) {
  if (!st) return false;
  switch (st.kind) {
    case 'hq': return hqLevel(s) >= st.lvl;
    case 'build': return Object.values(s.bases).some((B) => Object.values(B.lots).some((l) => l.b === st.b && l.lvl >= st.lvl));
    case 'tech': return !!s.tech[st.id2];
    case 'rate': return R.prod[st.res] >= st.n;
    case 'energy': return R.gen - R.draw >= st.n;
    case 'flag': return !!s.flags[st.flag];
    case 'rockets': return (s.stats.rocketsBuilt || 0) >= st.n;
    case 'sat': return sp(s).sats.some((x) => x.type === st.sat);
    case 'module': return (sp(s).modules[st.mod] || 0) >= st.lvl;
    case 'hubLvl': return !!s.bases[st.base || 'moon'] && hqLevel(s, st.base || 'moon') >= st.lvl;
    case 'survey': return !!sol(s).surveyed[st.body];
    case 'site': return (sol(s).sites[st.body] || 0) >= (st.lvl || 1);
    case 'sites': return Object.keys(sol(s).sites).length >= st.n;
    case 'colony': return !!s.bases[st.body];
    case 'pop': return !!s.bases[st.body] && (s.bases[st.body].pop || 0) >= st.n;
    case 'terra': return terraStage(s, st.body) >= st.n;
    case 'ship': return (sol(s).ships[st.ship] || 0) >= 1;
    case 'starSurvey': return st.star ? !!ist(s).surveyed[st.star] : Object.keys(ist(s).surveyed).length >= st.n;
    case 'starCol': return Object.keys(ist(s).colonies).length >= st.n;
    case 'starLvl': return Object.values(ist(s).colonies).some((C) => C.lvl >= st.lvl);
    case 'mega': return (ist(s).mega[st.mega] || 0) >= st.n;
    case 'drive': return (ist(s).ships[st.ship] || 0) >= 1;
    case 'gates': return Object.keys(ist(s).gates).length >= st.n;
    case 'met': return Object.keys(al(s).known).filter((k) => k !== 'hollow').length >= st.n;
    case 'und': return Object.values(al(s).known).some((K) => K.und >= st.n);
    case 'deal': return Object.values(al(s).known).some((K) => K.deals && K.deals[st.deal]);
    case 'embassy': return Object.values(al(s).known).some((K) => K.embassy >= 1);
    case 'xenotech': return Object.keys(al(s).xt).length >= st.n;
    case 'requests': return (al(s).seen.requests || 0) >= st.n;
    case 'ruins': return al(s).ruins >= st.n;
    case 'minorChoice': return Object.values(al(s).minors).some((m) => m === 'uplift') || !!s.flags.minorProtected;
    case 'warships': return Object.values(war(s).ships).reduce((a, b) => a + b, 0) >= st.n;
    case 'defence': return Object.values(war(s).def).some((L) => L >= (st.lvl || 1));
    case 'raidWon': return war(s).log.some((r) => r.kind === 'raid' && r.win) || !!s.flags.raidRepelled;
    case 'hive': return !!war(s).hives[st.hive + '_done'];
    case 'buildOn': return !!s.bases[st.base] && Object.values(s.bases[st.base].lots).some((l) => l.b === st.b && l.lvl >= (st.lvl || 1));
  }
  return false;
}
export function claimStep(s) { const st = currentStep(s); if (!st || !stepDone(s, st)) return null; give(s, st.reward); s.obj.claimed[st.id] = Date.now(); s.obj.i++; return st; }
export { rates, mods, hqLevel, bStats };
