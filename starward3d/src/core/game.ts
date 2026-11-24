// The rules. Pure functions over State (no DOM, no rendering), so the balance bot can play them headless.
import { State, Item, BotRec, Job } from './state';
import { uid } from './util';
import { BUILDINGS, bayLimit, fabLimit, CC_REQ, bayCapacity, bayStore, RECIPES, fabOutput, PLOT, PLOTS, landCost, landLevel } from '../data/buildings';
import { SPECIES } from '../data/species';
import { RARITIES } from '../data/rarities';
import { xpNeed, levelReward, MAX_LEVEL, STEPS, Step } from '../data/progress';
import { addCore, pumpAssembly, discover, helperBonus, homeFor, dexCount, coreOf } from './crew';
export { homeFor };
export type Res = 'credits' | 'cells' | 'dm';
export interface Ev { kind: string; [k: string]: any; }
// events the UI reacts to (level-ups, completions); drained by the app each frame
export const events: Ev[] = [];
const emit = (e: Ev) => { events.push(e); };
// ---------------- resources ----------------
export const canPay = (s: State, c: Partial<Record<Res, number>>) => Object.entries(c).every(([r, n]) => (s.res as any)[r] >= (n || 0));
export const pay = (s: State, c: Partial<Record<Res, number>>) => { for (const [r, n] of Object.entries(c)) (s.res as any)[r] -= n || 0; };
export const give = (s: State, c: Record<string, number>) => { for (const [r, n] of Object.entries(c)) if (r in s.res) (s.res as any)[r] += n; };
const stat = (s: State, k: string, n = 1) => { s.stats[k] = (s.stats[k] || 0) + n; };
// ---------------- commander XP ----------------
export function addXp(s: State, n: number) {
  if (n <= 0) return; s.xp += n;
  while (s.lvl < MAX_LEVEL && s.xp >= xpNeed(s.lvl)) { s.xp -= xpNeed(s.lvl); s.lvl++; const r = levelReward(s.lvl); give(s, r); emit({ kind: 'levelup', lvl: s.lvl, reward: r }); }
}
// ---------------- the island ----------------
export const itemsOf = (s: State, t: string) => s.isl.items.filter((i) => i.t === t);
export const item = (s: State, id: string) => s.isl.items.find((i) => i.id === id);
export const ccLevel = (s: State) => (itemsOf(s, 'command')[0] || { lvl: 1 }).lvl;
export const dims = (it: { t: string; r: number }) => { const [w, d] = BUILDINGS[it.t].size; return it.r % 2 ? [d, w] : [w, d]; };
export const plotOf = (x: number, z: number) => `${Math.floor(x / PLOT)},${Math.floor(z / PLOT)}`;
export const tileOpen = (s: State, x: number, z: number) => x >= 0 && z >= 0 && x < PLOT * PLOTS && z < PLOT * PLOTS && s.isl.plots.includes(plotOf(x, z));
export function areaFree(s: State, x: number, z: number, w: number, d: number, ignore?: string) {
  for (let i = x; i < x + w; i++) for (let j = z; j < z + d; j++) if (!tileOpen(s, i, j)) return false;
  for (const it of s.isl.items) { if (it.id === ignore) continue; const [iw, id] = dims(it); if (x < it.x + iw && x + w > it.x && z < it.z + id && z + d > it.z) return false; }
  return true;
}
// ---------------- construction ----------------
export const buildersBusy = (s: State) => s.jobs.filter((j) => j.kind === 'build').length;
export const jobOf = (s: State, itemId: string, kind?: string) => s.jobs.find((j) => j.item === itemId && (!kind || j.kind === kind));
export interface Check { ok: boolean; why?: string; cost?: number; time?: number; }
export function canBuild(s: State, t: string, el?: string): Check {
  const d = BUILDINGS[t]; if (!d) return { ok: false, why: 'Unknown' }; if (s.lvl < d.unlock) return { ok: false, why: `Commander level ${d.unlock}`, cost: d.buildCost(itemsOf(s, t).length) };
  const owned = itemsOf(s, t).length, cc = ccLevel(s);
  if (d.unique && owned) return { ok: false, why: 'Already built' };
  if (t === 'bay' && owned >= bayLimit(cc)) return { ok: false, why: `Bay limit (${bayLimit(cc)}): upgrade the Command Center` };
  if (t === 'fab' && owned >= fabLimit(cc)) return { ok: false, why: `Fabricator limit (${fabLimit(cc)}): upgrade the Command Center` };
  const cost = t === 'bay' && el && !itemsOf(s, 'bay').some((b) => b.el === el) ? Math.round(d.buildCost(Math.max(0, owned - 1)) * 0.7) : d.buildCost(owned); const time = Math.round(d.time(1) * buildSpeed(s));
  if (time > 0 && buildersBusy(s) >= s.builders) return { ok: false, why: 'All builder drones are busy', cost, time };
  if (s.res.credits < cost) return { ok: false, why: 'Not enough credits', cost, time };
  return { ok: true, cost, time };
}
export function build(s: State, t: string, x: number, z: number, r: number, el?: string, now = Date.now()): Check & { item?: Item } {
  const c = canBuild(s, t, el); if (!c.ok) return c; const it: Item = { id: uid('i'), t, x, z, r, lvl: c.time ? 0 : 1, ...(el ? { el } : {}) };
  const [w, d] = dims(it); if (!areaFree(s, x, z, w, d)) return { ok: false, why: 'Something is in the way' };
  s.res.credits -= c.cost || 0; s.isl.items.push(it); stat(s, 'built');
  if (c.time) s.jobs.push({ id: uid('j'), kind: 'build', item: it.id, start: now, end: now + c.time * 1000, lvl: 1 });
  else { addXp(s, xpFor(c.cost || 0)); if (BUILDINGS[t].cat === 'decor') stat(s, 'decor'); }
  if (t === 'bay') s.bay[it.id] = 0; return { ...c, item: it };
}
export const maxLevelOf = (s: State, it: Item) => (it.t === 'command' ? BUILDINGS.command.max : Math.min(BUILDINGS[it.t].max, ccLevel(s)));
export function canUpgrade(s: State, it: Item): Check {
  const d = BUILDINGS[it.t]; if (d.cat === 'decor') return { ok: false, why: 'Decorations do not upgrade' };
  if (jobOf(s, it.id, 'build')) return { ok: false, why: 'Under construction' };
  if (it.lvl >= d.max) return { ok: false, why: 'Maximum level' };
  if (it.t !== 'command' && it.lvl >= ccLevel(s)) return { ok: false, why: `Upgrade the Command Center to level ${it.lvl + 1} first` };
  if (it.t === 'command' && s.lvl < CC_REQ[it.lvl + 1]) return { ok: false, why: `Commander level ${CC_REQ[it.lvl + 1]} needed` };
  if (it.t === 'fab' && jobOf(s, it.id, 'craft')) return { ok: false, why: 'Finish or harvest the recipe first' };
  const cost = d.upCost(it.lvl), time = Math.round(d.time(it.lvl + 1) * (it.t === 'command' ? 1 : buildSpeed(s)));
  if (buildersBusy(s) >= s.builders) return { ok: false, why: 'All builder drones are busy', cost, time };
  if (s.res.credits < cost) return { ok: false, why: 'Not enough credits', cost, time };
  return { ok: true, cost, time };
}
export function upgrade(s: State, it: Item, now = Date.now()): Check {
  const c = canUpgrade(s, it); if (!c.ok) return c; s.res.credits -= c.cost || 0;
  s.jobs.push({ id: uid('j'), kind: 'build', item: it.id, start: now, end: now + (c.time || 0) * 1000, lvl: it.lvl + 1 }); return c;
}
const xpFor = (cost: number) => Math.max(5, Math.round(cost / 15));
const buildSpeed = (s: State) => { const cc = itemsOf(s, 'command')[0]; return cc ? 1 - helperBonus(s, cc) : 1; };
export function moveItem(s: State, it: Item, x: number, z: number, r: number) { const [w, d] = dims({ t: it.t, r }); if (!areaFree(s, x, z, w, d, it.id)) return false; it.x = x; it.z = z; it.r = r; return true; }
export function sellDecor(s: State, it: Item) { if (BUILDINGS[it.t].cat !== 'decor') return false; s.isl.items = s.isl.items.filter((i) => i !== it); s.res.credits += Math.floor(BUILDINGS[it.t].buildCost(0) * 0.5); return true; }
// dark matter to finish a timer now (free under a minute)
export const dmCost = (sec: number) => (sec <= 60 ? 0 : Math.ceil(1.1 * Math.pow(sec / 60, 0.7)));
export function finishNow(s: State, j: Job, now = Date.now()) { const c = dmCost((j.end - now) / 1000); if (s.res.dm < c) return false; s.res.dm -= c; j.end = now; advance(s, now); return true; }
// ---------------- bots ----------------
export const botEarn = (b: BotRec) => { const sp = SPECIES[b.sp]; return RARITIES[sp.rarity].earn * (1 + 0.15 * (sp.el.length - 1)) * (1 + 0.35 * (b.lvl - 1)); }; // credits per minute
export const BOT_MAX = 40;
export const feedCost = (lvl: number) => Math.round(4 * Math.pow(1.33, lvl - 1));
export const botsIn = (s: State, bayId: string) => s.bots.filter((b) => b.bay === bayId);
export const bayRate = (s: State, bayId: string) => botsIn(s, bayId).filter((b) => !b.post).reduce((a, b) => a + botEarn(b), 0) / 60; // credits per second
export const bayCap = (it: Item) => bayStore(Math.max(1, it.lvl));
export function feed(s: State, b: BotRec): Check & { lvlUp?: boolean } {
  if (b.lvl >= BOT_MAX) return { ok: false, why: 'Maximum level' }; const c = feedCost(b.lvl); if (s.res.cells < c) return { ok: false, why: 'Not enough Power Cells', cost: c };
  s.res.cells -= c; b.fed++; stat(s, 'feeds'); addXp(s, 1 + Math.floor(b.lvl / 4)); let up = false;
  if (b.fed >= 4) { b.fed = 0; b.lvl++; up = true; emit({ kind: 'botLevel', bot: b.id, lvl: b.lvl }); }
  return { ok: true, cost: c, lvlUp: up };
}
export function canRecruit(s: State, sp: string): Check {
  const d = SPECIES[sp]; if (!d || !d.price) return { ok: false, why: 'Not for sale' }; const owned = s.bots.filter((b) => b.sp === sp).length; const cost = Math.round(d.price * (1 + 0.5 * owned));
  if (s.lvl < (d.unlock || 1)) return { ok: false, why: `Commander level ${d.unlock}`, cost };
  if (d.rarity !== 'standard') { const asm = itemsOf(s, 'assembly')[0]; if (!asm || asm.lvl < 1) return { ok: false, why: 'Build the Assembly Bay first: rarer bots boot there', cost }; }
  else if (!homeFor(s, sp)) { const els = d.el.map((e) => e[0].toUpperCase() + e.slice(1)); const has = itemsOf(s, 'bay').some((b) => b.el && d.el.includes(b.el));
    return { ok: false, why: has ? `No room: upgrade or add a ${els.join('/')} Bay` : `Build a ${els.join(' or ')} Bay first`, cost }; }
  if (s.res.credits < cost) return { ok: false, why: 'Not enough credits', cost };
  return { ok: true, cost };
}
export function recruit(s: State, sp: string, now = Date.now()): Check & { bot?: BotRec } {
  const c = canRecruit(s, sp); if (!c.ok) return c; s.res.credits -= c.cost || 0; stat(s, 'recruits'); addXp(s, 10 + Math.round((c.cost || 0) / 50));
  if (SPECIES[sp].rarity !== 'standard') { const core = addCore(s, sp, 'shop', now); return { ...c, core: core.id } as any; }
  const home = homeFor(s, sp)!; const b: BotRec = { id: uid('b'), sp, lvl: 1, fed: 0, bay: home.id, born: now }; s.bots.push(b); discover(s, sp, now); emit({ kind: 'newBot', bot: b.id });
  return { ...c, bot: b };
}
export function moveBot(s: State, b: BotRec, bayId: string) { const bay = item(s, bayId); if (!bay || !bay.el || !SPECIES[b.sp].el.includes(bay.el)) return false; if (b.bay === bayId) return false; if (botsIn(s, bayId).length >= bayCapacity(bay.lvl)) return false; b.bay = bayId; delete b.stored; return true; }
export function collectBay(s: State, it: Item) { const n = Math.floor(s.bay[it.id] || 0); if (n <= 0) return 0; s.bay[it.id] -= n; s.res.credits += n; stat(s, 'collects'); stat(s, 'collected', n);
  const xf = (s.stats.xpFrac || 0) + n / 50; const xi = Math.floor(xf); s.stats.xpFrac = xf - xi; addXp(s, xi); return n; }
// ---------------- fabricators ----------------
export const recipesFor = (it: Item) => RECIPES.map((r, i) => ({ ...r, i, open: Math.max(1, it.lvl) >= r.lvl, out: fabOutput(r, Math.max(1, it.lvl)) }));
export function canCraft(s: State, it: Item, ri: number): Check {
  const r = RECIPES[ri]; if (!r) return { ok: false }; if (it.lvl < 1 || jobOf(s, it.id, 'build')) return { ok: false, why: 'Under construction' };
  if (jobOf(s, it.id, 'craft')) return { ok: false, why: 'Already printing' }; if (s.ready[it.id]) return { ok: false, why: 'Harvest first' };
  if (it.lvl < r.lvl) return { ok: false, why: `Fabricator level ${r.lvl}` }; if (s.res.credits < r.cost) return { ok: false, why: 'Not enough credits', cost: r.cost };
  return { ok: true, cost: r.cost, time: r.sec };
}
export function craft(s: State, it: Item, ri: number, now = Date.now()) { const c = canCraft(s, it, ri); if (!c.ok) return c; s.res.credits -= c.cost || 0; stat(s, 'crafts');
  s.jobs.push({ id: uid('j'), kind: 'craft', item: it.id, start: now, end: now + RECIPES[ri].sec * 1000, recipe: ri }); return c; }
export function harvest(s: State, it: Item) { const r = s.ready[it.id]; if (!r) return 0; delete s.ready[it.id]; s.res.cells += r.cells; addXp(s, r.xp); stat(s, 'harvests'); return r.cells; }
// ---------------- land ----------------
export function plotState(s: State, key: string) { if (s.isl.plots.includes(key)) return 'open'; const [px, pz] = key.split(',').map(Number);
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => s.isl.plots.includes(`${px + dx},${pz + dz}`)) ? 'buyable' : 'far'; }
export function canBuyPlot(s: State, key: string): Check { if (plotState(s, key) !== 'buyable') return { ok: false, why: 'Expand next to your island' };
  const cost = landCost(s.landBought), need = landLevel(s.landBought); if (s.lvl < need) return { ok: false, why: `Commander level ${need}`, cost }; if (s.res.credits < cost) return { ok: false, why: 'Not enough credits', cost }; return { ok: true, cost }; }
export function buyPlot(s: State, key: string) { const c = canBuyPlot(s, key); if (!c.ok) return c; s.res.credits -= c.cost || 0; s.isl.plots.push(key); s.landBought++; stat(s, 'land'); addXp(s, 25 + s.landBought * 10); emit({ kind: 'land', key }); return c; }
// ---------------- time ----------------
function complete(s: State, j: Job) {
  s.jobs = s.jobs.filter((x) => x !== j); const it = item(s, j.item); if (!it) return;
  if (j.kind === 'build') { const first = it.lvl === 0; it.lvl = j.lvl || it.lvl + 1; const d = BUILDINGS[it.t]; addXp(s, xpFor(first ? d.buildCost(0) : d.upCost(it.lvl - 1))); emit({ kind: 'built', item: it.id, lvl: it.lvl, first }); if (it.t === 'assembly') pumpAssembly(s, j.end); }
  if (j.kind === 'craft') { const r = RECIPES[j.recipe || 0]; s.ready[it.id] = { cells: Math.round(fabOutput(r, Math.max(1, it.lvl)) * (1 + helperBonus(s, it))), xp: r.xp }; emit({ kind: 'crafted', item: it.id }); }
  if (j.kind === 'fuse' && j.sp) { const c = addCore(s, j.sp, 'fusion', j.end); emit({ kind: 'fused', item: it.id, core: c.id, sp: j.sp }); }
  if (j.kind === 'boot') { const c = coreOf(s, j.core); if (c) { c.state = 'ready'; emit({ kind: 'booted', core: c.id, sp: c.sp }); } pumpAssembly(s, j.end); }
}
// integrate everything up to `now`: bays fill (capped) piecewise between job completions
export function advance(s: State, now = Date.now()) {
  let t = s.last || now; if (now < t) { s.last = now; return; }
  for (;;) { const due = s.jobs.filter((j) => j.end <= now).sort((a, b) => a.end - b.end)[0]; const to = due ? Math.max(t, due.end) : now;
    accrue(s, (to - t) / 1000); t = to; if (!due) break; complete(s, due); }
  s.last = now;
}
function accrue(s: State, dt: number) { if (dt <= 0) return; for (const it of itemsOf(s, 'bay')) { if (it.lvl < 1) continue; const cap = bayCap(it), cur = s.bay[it.id] || 0; if (cur >= cap) continue; s.bay[it.id] = Math.min(cap, cur + bayRate(s, it.id) * dt); } }
// ---------------- objectives ----------------
export function stepDone(s: State, st: Step): boolean {
  switch (st.kind) {
    case 'collect': return (s.stats.collects || 0) >= (st.n || 1);
    case 'craft': return (s.stats.crafts || 0) >= (st.n || 1);
    case 'harvest': return (s.stats.harvests || 0) >= (st.n || 1);
    case 'botLevel': return s.bots.some((b) => b.lvl >= (st.n || 1));
    case 'ownSpecies': return s.bots.some((b) => b.sp === st.t);
    case 'bayEl': return itemsOf(s, 'bay').some((b) => b.el === st.t && b.lvl > 0);
    case 'cc': return ccLevel(s) >= (st.n || 1);
    case 'decor': return (s.stats.decor || 0) >= (st.n || 1);
    case 'bayLevel': return itemsOf(s, 'bay').some((b) => b.lvl >= (st.n || 1));
    case 'land': return s.landBought >= (st.n || 1);
    case 'bots': return s.bots.length >= (st.n || 1);
    case 'level': return s.lvl >= (st.n || 1);
    case 'rarity': return s.bots.some((b) => SPECIES[b.sp].rarity === st.t);
    case 'build': return itemsOf(s, st.t || '').some((i) => i.lvl > 0);
    case 'fusions': return (s.stats.fusions || 0) >= (st.n || 1);
    case 'boots': return (s.stats.boots || 0) >= (st.n || 1);
    case 'helper': return s.bots.some((b) => !!b.post);
    case 'dex': return dexCount(s) >= (st.n || 1);
  }
  return false;
}
export const currentStep = (s: State) => STEPS[s.obj.i] || null;
export function claimStep(s: State) { const st = currentStep(s); if (!st || !stepDone(s, st)) return null; give(s, st.reward); s.obj.claimed[st.id] = Date.now(); s.obj.i++; addXp(s, 10 + s.obj.i * 3); return st; }
export const xpNeedOf = (s: State) => xpNeed(s.lvl);
export const bayCapAt = (L: number) => bayStore(L);
