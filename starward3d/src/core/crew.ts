// The crew: fusion, the Assembly Bay, the Botdex, helpers, storage and releasing bots. Pure rules over State.
import { State, BotRec, Core, Item } from './state';
import { uid } from './util';
import { SPECIES, SPECIES_ORDER } from '../data/species';
import { RARITIES, RARITY_ORDER } from '../data/rarities';
import { HELP_AFFINITY, helperSlots, assemblySlots, bayCapacity } from '../data/buildings';
import type { Check } from './game';
import { events, addXp, itemsOf, item, jobOf, botsIn, onMission } from './game';
const rIdx = (sp: string) => RARITY_ORDER.indexOf(SPECIES[sp].rarity);
// ---------------- the Botdex ----------------
export const DEX_REWARD = [2, 4, 8, 15, 30, 60, 120]; // dark matter for discovering a species, by rarity
export function discover(s: State, sp: string, now = Date.now()) { if (s.dex[sp]) return false; s.dex[sp] = now; const dm = DEX_REWARD[rIdx(sp)]; s.res.dm += dm; events.push({ kind: 'discover', sp, dm }); return true; }
export const dexCount = (s: State) => Object.keys(s.dex).filter((k) => SPECIES[k]).length;
// ---------------- combat strength (the Arena uses these in Part 4) ----------------
export function botPower(b: BotRec) { const d = SPECIES[b.sp], p = RARITIES[d.rarity].power, e = 1 + 0.1 * (d.el.length - 1);
  return { hp: Math.round((120 + 32 * (b.lvl - 1)) * p * e), atk: Math.round((20 + 5.5 * (b.lvl - 1)) * p * e) }; }
// ---------------- fusion ----------------
export const FUSE_LEVEL = 4;
// which species two parents can produce, with weights. A child must draw its elements from both parents; rarer
// tiers need rarer parents (Epic: one parent Advanced+, Legendary: both Elite+, Prototype: both Epic+, Singularity: both Legendary+)
export function fusionOutcomes(a: BotRec, b: BotRec) {
  const A = SPECIES[a.sp], B = SPECIES[b.sp]; const pool = new Set([...A.el, ...B.el]); const ra = rIdx(a.sp), rb = rIdx(b.sp); const lo = Math.min(ra, rb), hi = Math.max(ra, rb);
  const out: { sp: string; w: number }[] = [];
  for (const k of SPECIES_ORDER) { const d = SPECIES[k], r = RARITY_ORDER.indexOf(d.rarity); const parent = k === a.sp || k === b.sp; if (d.alien && !parent) continue;
    if (!parent) { if (!d.el.every((e) => pool.has(e))) continue; if (!d.el.some((e) => A.el.includes(e)) || !d.el.some((e) => B.el.includes(e))) continue; if (d.el.length < 2) continue;
      if (r < (lo >= 2 ? lo : lo - 1)) continue; // great parents do not make poor children
      if (r === 3 && hi < 1) continue; if (r === 4 && lo < 2) continue; if (r === 5 && lo < 3) continue; if (r === 6 && lo < 4) continue; if (r > hi + 2) continue; }
    out.push({ sp: k, w: RARITIES[d.rarity].fuseChance * (parent ? 1.3 : 1) }); }
  const tot = out.reduce((s2, o) => s2 + o.w, 0); return out.map((o) => ({ sp: o.sp, p: o.w / tot })).sort((x, y) => rIdx(y.sp) - rIdx(x.sp) || y.p - x.p);
}
export const fuseCost = (a: BotRec, b: BotRec) => { const ra = rIdx(a.sp), rb = rIdx(b.sp); return Math.round(120 * (1 + ra) * (1 + rb) * Math.pow(1.7, Math.max(ra, rb))); };
export function helperBonus(s: State, it: Item) { const aff = HELP_AFFINITY[it.t] || []; let b = 0;
  for (const bot of s.bots) { if (bot.post !== it.id) continue; const d = SPECIES[bot.sp]; const k = (0.04 + 0.006 * bot.lvl) * Math.sqrt(RARITIES[d.rarity].power) * (d.el.some((e) => aff.includes(e)) ? 1.5 : 1); b += k; }
  return Math.min(0.6, b); }
export const fuseTime = (s: State, lab: Item, sp: string) => Math.round(RARITIES[SPECIES[sp].rarity].assembly * (1 - 0.05 * (lab.lvl - 1)) * (1 - helperBonus(s, lab)));
export function canFuse(s: State, lab: Item, aId: string, bId: string): Check {
  if (lab.lvl < 1 || jobOf(s, lab.id, 'build')) return { ok: false, why: 'The Fusion Lab is under construction' }; if (jobOf(s, lab.id, 'fuse')) return { ok: false, why: 'Already fusing' };
  const a = s.bots.find((x) => x.id === aId), b = s.bots.find((x) => x.id === bId); if (!a || !b) return { ok: false, why: 'Pick two bots' }; if (a === b) return { ok: false, why: 'Pick two different bots' };
  if (a.lvl < FUSE_LEVEL || b.lvl < FUSE_LEVEL) return { ok: false, why: `Both bots need level ${FUSE_LEVEL}` }; if (onMission(s, a) || onMission(s, b)) return { ok: false, why: 'A parent is away on an expedition' };
  const cost = fuseCost(a, b); if (s.res.credits < cost) return { ok: false, why: 'Not enough credits', cost }; return { ok: true, cost };
}
export function fuse(s: State, lab: Item, aId: string, bId: string, now = Date.now(), rnd = Math.random): Check & { sp?: string } {
  const c = canFuse(s, lab, aId, bId); if (!c.ok) return c; const a = s.bots.find((x) => x.id === aId)!, b = s.bots.find((x) => x.id === bId)!; s.res.credits -= c.cost || 0;
  const outs = fusionOutcomes(a, b); let r = rnd(), sp = outs[0].sp; for (const o of outs) { if (r < o.p) { sp = o.sp; break; } r -= o.p; }
  const time = fuseTime(s, lab, sp); s.jobs.push({ id: uid('j'), kind: 'fuse', item: lab.id, start: now, end: now + time * 1000, sp, parents: [aId, bId] });
  s.stats.fusions = (s.stats.fusions || 0) + 1; addXp(s, 15 + 10 * rIdx(sp)); return { ...c, time, sp };
}
// ---------------- the Assembly Bay ----------------
export const bootTime = (s: State, asm: Item, sp: string) => Math.round(RARITIES[SPECIES[sp].rarity].assembly * 0.5 * (1 - 0.05 * (asm.lvl - 1)) * (1 - helperBonus(s, asm)));
export function addCore(s: State, sp: string, from: Core['from'], now = Date.now()) { const c: Core = { id: uid('c'), sp, from, state: 'waiting', at: now }; s.cores.push(c); pumpAssembly(s, now); events.push({ kind: 'core', core: c.id, sp }); return c; }
// start booting waiting cores while there are free slots (called on every change and as boots finish)
export function pumpAssembly(s: State, now = Date.now()) { const asm = itemsOf(s, 'assembly')[0]; if (!asm || asm.lvl < 1 || jobOf(s, asm.id, 'build')) return;
  let busy = s.jobs.filter((j) => j.kind === 'boot').length; for (const c of s.cores) { if (busy >= assemblySlots(asm.lvl)) break; if (c.state !== 'waiting') continue;
    c.state = 'booting'; s.jobs.push({ id: uid('j'), kind: 'boot', item: asm.id, start: now, end: now + bootTime(s, asm, c.sp) * 1000, core: c.id }); busy++; } }
export function activate(s: State, coreId: string, now = Date.now()): Check & { bot?: BotRec } {
  const c = s.cores.find((x) => x.id === coreId); if (!c || c.state !== 'ready') return { ok: false, why: 'Still booting' };
  const home = homeFor(s, c.sp); const b: BotRec = { id: uid('b'), sp: c.sp, lvl: 1, fed: 0, bay: home ? home.id : null, born: now, ...(home ? {} : { stored: true }) };
  s.bots.push(b); s.cores = s.cores.filter((x) => x !== c); discover(s, c.sp, now); s.stats.boots = (s.stats.boots || 0) + 1; addXp(s, 10 + 12 * rIdx(c.sp)); events.push({ kind: 'newBot', bot: b.id });
  return { ok: true, bot: b };
}
// a bay of one of the species' elements with room for one more
export function homeFor(s: State, sp: string, except?: string) { const els = SPECIES[sp].el;
  return itemsOf(s, 'bay').filter((b) => b.lvl > 0 && b.el && els.includes(b.el) && b.id !== except && botsIn(s, b.id).length < bayCapacity(b.lvl)).sort((a, b) => botsIn(s, a.id).length - botsIn(s, b.id).length)[0]; }
// ---------------- helpers, storage, release ----------------
export const helpersAt = (s: State, itemId: string) => s.bots.filter((b) => b.post === itemId);
export function canPost(s: State, b: BotRec, it: Item): Check { if (!HELP_AFFINITY[it.t]) return { ok: false, why: 'Bots cannot help here' }; if (it.lvl < 1) return { ok: false, why: 'Under construction' };
  if (b.stored) return { ok: false, why: 'Activate it from storage first' }; if (onMission(s, b)) return { ok: false, why: 'Away on an expedition' }; if (b.post === it.id) return { ok: false, why: 'Already helping here' };
  if (helpersAt(s, it.id).length >= helperSlots(it.lvl)) return { ok: false, why: `All ${helperSlots(it.lvl)} helper slots are taken` }; return { ok: true }; }
export function post(s: State, b: BotRec, it: Item) { const c = canPost(s, b, it); if (!c.ok) return c; b.post = it.id; s.stats.posts = (s.stats.posts || 0) + 1; return c; }
export function unpost(b: BotRec) { delete b.post; }
export function store(s: State, b: BotRec) { b.bay = null; b.stored = true; delete b.post; }
export function unstore(s: State, b: BotRec): Check { const home = homeFor(s, b.sp); if (!home) return { ok: false, why: `No room: build or upgrade a ${SPECIES[b.sp].el.map((e) => e[0].toUpperCase() + e.slice(1)).join('/')} Bay` }; b.bay = home.id; delete b.stored; return { ok: true }; }
export const releaseValue = (b: BotRec) => Math.round((SPECIES[b.sp].price || 2000 * Math.pow(3, rIdx(b.sp))) * 0.25 * (1 + 0.1 * (b.lvl - 1)));
export function release(s: State, b: BotRec): Check { if (s.bots.length <= 1) return { ok: false, why: 'You need at least one bot' }; s.bots = s.bots.filter((x) => x !== b); const v = releaseValue(b); s.res.credits += v; return { ok: true, cost: v }; }
export const coreOf = (s: State, id?: string) => s.cores.find((c) => c.id === id);
export { item };
