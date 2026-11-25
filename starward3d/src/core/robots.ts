// Robots: cores assembled in the Workshop (or fused in the Fusion Lab) boot into robots that live in Robot Docks,
// level up on Power Cells and work as operators in buildings, boosting them (far more when their element suits the
// job). The Botdex records every species. Registers job completers, objective checks and the economy boost hook.
import { SPECIES, SPECIES_ORDER } from '../data/species';
import { RARITIES, RARITY_ORDER } from '../data/rarities';
import { AFFINITY, RARITY_BOOST, MATCH_K, MISMATCH_K, BOOST_CAP, MAX_LVL, opSlots, dockCapacity, feedCost, CORE_RECIPES, DEX_REWARD, FUSE_LEVEL, STARTERS } from '../data/robots';
import { lvlOf, canPay, pay, boostHooks } from './econ';
import { completers, stepChecks, itemOf, jobOf, Check, Note, events, builtHooks, buildChecks } from './game';
import { State, uid } from './state';
import { rng, hash } from './util';
export interface Robot { id: string; sp: string; lvl: number; post: { base: string; item: string } | null; born: number; }
export interface Core { id: string; sp: string; from: string; }
export interface Robots { list: Robot[]; dex: Record<string, number>; cores: Core[]; made: number; }
export const rb = (s: State): Robots => (s.robots || (s.robots = { list: [], dex: {}, cores: [], made: 0 }));
export const rIdx = (sp: string) => RARITY_ORDER.indexOf(SPECIES[sp].rarity);
export const capacity = (s: State) => Object.values(s.bases).reduce((a, B) => a + B.items.filter((i) => i.b === 'dock').reduce((x, i) => x + dockCapacity(i.lvl), 0), 0);
export const workshopLvl = (s: State) => lvlOf(s, 'earth', 'workshop');
export const labLvl = (s: State) => lvlOf(s, 'earth', 'fusionlab');
export const assemblySlots = (s: State) => (workshopLvl(s) ? 1 + Math.floor(workshopLvl(s) / 5) : 0);
export const coresBusy = (s: State) => s.jobs.filter((j) => j.kind === 'core').length;
export const robotOf = (s: State, id: string) => rb(s).list.find((r) => r.id === id) || null;
export const dexCount = (s: State) => Object.keys(rb(s).dex).filter((k) => SPECIES[k]).length;
export const discoverable = () => SPECIES_ORDER.filter((k) => !SPECIES[k].alien || ['event', 'swarm', 'contact'].includes(String(SPECIES[k].alien)));
// ---------------- operators ----------------
export const matches = (sp: string, b: string) => SPECIES[sp].el.some((e) => (AFFINITY[b] || []).includes(e));
export const robotBoost = (r: Robot, b: string) => RARITY_BOOST[rIdx(r.sp)] * (1 + 0.035 * (r.lvl - 1)) * (matches(r.sp, b) ? MATCH_K : MISMATCH_K);
export const operatorsAt = (s: State, base: string, item: string) => rb(s).list.filter((r) => r.post && r.post.base === base && r.post.item === item);
export function boostOf(s: State, base: string, item: string) { const it = itemOf(s, base, item); if (!it) return 0; let k = 0; for (const r of operatorsAt(s, base, item)) k += robotBoost(r, it.b); return Math.min(BOOST_CAP, k); }
export function boostMap(s: State) { const m: Record<string, number> = {}; for (const r of rb(s).list) { if (!r.post) continue; const it = itemOf(s, r.post.base, r.post.item); if (!it) { r.post = null; continue; } m[it.id] = Math.min(BOOST_CAP, (m[it.id] || 0) + robotBoost(r, it.b)); } return m; }
export function canAssign(s: State, rid: string, base: string, item: string): Check {
  const r = robotOf(s, rid), it = itemOf(s, base, item); if (!r || !it) return { ok: false, why: 'Gone' }; if (it.lvl < 1) return { ok: false, why: 'Under construction' };
  const n = opSlots(it.b, it.lvl); if (!n) return { ok: false, why: 'No operator stations here' };
  if (r.post && r.post.item === item) return { ok: false, why: 'Already working here' };
  if (operatorsAt(s, base, item).length >= n) return { ok: false, why: `All ${n} operator station${n > 1 ? 's are' : ' is'} taken${it.lvl < 16 ? ' (more at levels 8 and 16)' : ''}` }; return { ok: true };
}
export function assign(s: State, rid: string, base: string, item: string) { const c = canAssign(s, rid, base, item); if (!c.ok) return c; robotOf(s, rid)!.post = { base, item }; return c; }
export function unassign(s: State, rid: string) { const r = robotOf(s, rid); if (r) r.post = null; }
// ---------------- cores ----------------
export const coreTime = (s: State, sp: string) => Math.max(10, Math.round((RARITIES[SPECIES[sp].rarity].assembly * (1 - 0.03 * (workshopLvl(s) - 1))) / (1 + boostOfType(s, 'workshop'))));
const boostOfType = (s: State, b: string) => { const it = s.bases.earth?.items.find((i) => i.b === b); return it ? boostOf(s, 'earth', it.id) : 0; };
export const pool = (rarity: number, focus?: string) => { const all = SPECIES_ORDER.filter((k) => !SPECIES[k].alien && rIdx(k) === rarity); const f = focus ? all.filter((k) => SPECIES[k].el.includes(focus)) : []; return f.length ? f : all; };
export function canCraft(s: State, ri: number): Check {
  const R = CORE_RECIPES[ri]; if (!R) return { ok: false }; if (!workshopLvl(s)) return { ok: false, why: 'Build the Robotics Workshop', locked: true };
  if (workshopLvl(s) < R.ws) return { ok: false, why: `Robotics Workshop level ${R.ws}`, locked: true }; if (coresBusy(s) >= assemblySlots(s)) return { ok: false, why: 'All assembly bays are busy', busy: true };
  if (!canPay(s, R.cost)) return { ok: false, why: 'Not enough resources', cost: R.cost }; return { ok: true, cost: R.cost };
}
export function craft(s: State, ri: number, focus?: string, t = Date.now()) { const c = canCraft(s, ri); if (!c.ok) return c; pay(s, c.cost!); const R = rng(hash(s.created + ':' + (rb(s).made++)));
  const list = pool(CORE_RECIPES[ri].rarity, focus); const sp = list[Math.floor(R() * list.length)]; const time = coreTime(s, sp);
  s.jobs.push({ id: uid(s), kind: 'core', sp, src: 'workshop', start: t, end: t + time * 1000 }); s.stats.crafts = (s.stats.crafts || 0) + 1; return { ...c, sp, time }; }
// a ready core boots into a robot when a dock has room; first of its kind fills a Botdex page
export function canActivate(s: State, coreId: string): Check { if (!rb(s).cores.some((c) => c.id === coreId)) return { ok: false }; if (rb(s).list.length >= capacity(s)) return { ok: false, why: capacity(s) ? 'Every dock is full: build or upgrade a Robot Dock' : 'Build a Robot Dock first', full: true }; return { ok: true }; }
export function activate(s: State, coreId: string, t = Date.now()) {
  const c = canActivate(s, coreId); if (!c.ok) return c; const R = rb(s); const core = R.cores.find((x) => x.id === coreId)!; R.cores = R.cores.filter((x) => x !== core);
  const r: Robot = { id: uid(s, 'r'), sp: core.sp, lvl: 1, post: null, born: t }; R.list.push(r); s.stats.robots = R.list.length;
  let dm = 0; if (!R.dex[core.sp]) { R.dex[core.sp] = t; dm = DEX_REWARD[rIdx(core.sp)]; s.res.dm = (s.res.dm || 0) + dm; }
  return { ok: true, robot: r, dm };
}
export const giveCore = (s: State, sp: string, from = 'gift') => { rb(s).cores.push({ id: uid(s, 'c'), sp, from }); };
// ---------------- levelling ----------------
export function canFeed(s: State, rid: string): Check { const r = robotOf(s, rid); if (!r) return { ok: false }; if (r.lvl >= MAX_LVL) return { ok: false, why: 'Maximum level', max: true }; const n = feedCost(r.lvl, rIdx(r.sp)); if ((s.res.cells || 0) < n) return { ok: false, why: 'Not enough Power Cells', cost: { cells: n } }; return { ok: true, cost: { cells: n } }; }
export function feed(s: State, rid: string) { const c = canFeed(s, rid); if (!c.ok) return c; pay(s, c.cost!); const r = robotOf(s, rid)!; r.lvl++; s.stats.feeds = (s.stats.feeds || 0) + 1; return { ...c, lvl: r.lvl }; }
export function recycle(s: State, rid: string) { const R = rb(s); const r = robotOf(s, rid); if (!r || R.list.length <= 1) return 0; R.list = R.list.filter((x) => x !== r); const back = Math.round(30 * (1 + rIdx(r.sp)) * (1 + r.lvl * 0.5)); s.res.cells = (s.res.cells || 0) + back; return back; }
// ---------------- fusion (rules from v1: a child takes its elements from both parents; rarer needs rarer parents) ----------------
export function fusionOutcomes(a: Robot, b: Robot) {
  const A = SPECIES[a.sp], B = SPECIES[b.sp]; const pl = new Set([...A.el, ...B.el]); const ra = rIdx(a.sp), rbb = rIdx(b.sp); const lo = Math.min(ra, rbb), hi = Math.max(ra, rbb); const out: { sp: string; w: number }[] = [];
  for (const k of SPECIES_ORDER) { const d = SPECIES[k], r = rIdx(k); const parent = k === a.sp || k === b.sp; if (d.alien && !parent) continue;
    if (!parent) { if (!d.el.every((e) => pl.has(e))) continue; if (!d.el.some((e) => A.el.includes(e)) || !d.el.some((e) => B.el.includes(e))) continue; if (d.el.length < 2) continue;
      if (r < (lo >= 2 ? lo : lo - 1)) continue; if (r === 3 && hi < 1) continue; if (r === 4 && lo < 2) continue; if (r === 5 && lo < 3) continue; if (r === 6 && lo < 4) continue; if (r > hi + 2) continue; }
    out.push({ sp: k, w: RARITIES[d.rarity].fuseChance * (parent ? 1.3 : 1) }); }
  const tot = out.reduce((x, o) => x + o.w, 0); return out.map((o) => ({ sp: o.sp, p: o.w / tot })).sort((x, y) => rIdx(y.sp) - rIdx(x.sp) || y.p - x.p);
}
export const fuseCost = (a: Robot, b: Robot) => { const ra = rIdx(a.sp), rbb = rIdx(b.sp); return { credits: Math.round(300 * (1 + ra) * (1 + rbb) * Math.pow(1.8, Math.max(ra, rbb))), cells: Math.round(40 * (1 + ra + rbb)) }; };
export const fuseTime = (s: State, sp: string) => Math.max(20, Math.round((RARITIES[SPECIES[sp].rarity].assembly * 1.2 * (1 - 0.05 * (labLvl(s) - 1))) / (1 + boostOfType(s, 'fusionlab'))));
export function canFuse(s: State, aId: string, bId: string): Check {
  if (!labLvl(s)) return { ok: false, why: 'Build the Fusion Lab', locked: true }; const lab = s.bases.earth.items.find((i) => i.b === 'fusionlab')!; if (jobOf(s, lab.id)) return { ok: false, why: 'The Fusion Lab is being upgraded' };
  if (s.jobs.some((j) => j.kind === 'fuse')) return { ok: false, why: 'Already fusing', busy: true }; const a = robotOf(s, aId), b = robotOf(s, bId); if (!a || !b) return { ok: false, why: 'Pick two robots' }; if (a === b) return { ok: false, why: 'Pick two different robots' };
  if (a.lvl < FUSE_LEVEL || b.lvl < FUSE_LEVEL) return { ok: false, why: `Both parents need level ${FUSE_LEVEL}` }; const cost = fuseCost(a, b); if (!canPay(s, cost)) return { ok: false, why: 'Not enough resources', cost }; return { ok: true, cost };
}
export function fuse(s: State, aId: string, bId: string, t = Date.now()) { const c = canFuse(s, aId, bId); if (!c.ok) return c; pay(s, c.cost!); const o = fusionOutcomes(robotOf(s, aId)!, robotOf(s, bId)!); let x = Math.random(), sp = o[o.length - 1].sp; for (const e of o) { x -= e.p; if (x <= 0) { sp = e.sp; break; } }
  const time = fuseTime(s, sp); s.jobs.push({ id: uid(s), kind: 'fuse', sp, start: t, end: t + time * 1000 }); s.stats.fusions = (s.stats.fusions || 0) + 1; return { ...c, sp, time }; }
// ---------------- hooks ----------------
completers.core = (s, j): Note => { giveCore(s, j.sp, j.src || 'workshop'); return { kind: 'core', sp: j.sp }; };
completers.fuse = (s, j): Note => { giveCore(s, j.sp, 'fusion'); return { kind: 'core', sp: j.sp, fused: true }; };
// the Workshop's first robots: two starter cores the moment it opens
export function onBuilt(s: State, b: string) { if (b === 'workshop' && !s.flags.starters) { s.flags.starters = 1; for (const sp of STARTERS) giveCore(s, sp, 'gift'); events.push({ kind: 'starters' }); } }
boostHooks.push((s) => boostMap(s));
builtHooks.push(onBuilt);
buildChecks.push((s, base, b) => ((b === 'burrow' || b === 'deepfarm') && !rb(s).list.some((r) => SPECIES[r.sp].el.some((e) => e === 'geo' || e === 'kinetic')) ? { ok: false, why: 'Your robots dig the tunnels: you need a Geo or Kinetic robot', locked: true } : null));
stepChecks.robots = (s, st) => rb(s).list.length >= st.n;
stepChecks.dex = (s, st) => dexCount(s) >= st.n;
stepChecks.operators = (s, st) => rb(s).list.filter((r) => r.post).length >= st.n;
export { SPECIES, RARITIES, RARITY_ORDER, opSlots, dockCapacity, feedCost, CORE_RECIPES, AFFINITY, MAX_LVL };
