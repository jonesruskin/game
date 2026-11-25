// Food. Every colonist eats: a colony's farms (algae vats first, then greenhouses, then deep farms in the tunnels) feed
// it, and whatever they cannot cover comes up from Earth on supply runs, paid in credits and priced by distance (the Moon
// is next door; a star colony without a wormhole gate is years away). Food is the third line of life support next to
// water and air: a hungry colony stops growing and works slower. Terraformed and breathable worlds farm in the open;
// alien life and alien trade improve the harvest; Meridian, the programme's AI, can share surpluses between colonies.
import { State } from './state';
import { hash } from './util';
import { rateHooks } from './econ';
import { stepChecks } from './game';
import { terraState, breathable, foodHook } from './solar';
import { exoBreathable, gated } from './stars';
import { boostOf } from './robots';
import { LIFE, EXO_GIFTS } from '../data/life';
import { dealActive } from './aliens';
export interface FoodLine { prod: number; need: number; shared: number; imported: number; fed: number; }
export interface Food { noImport: Record<string, number>; hungry?: Record<string, number>; }
export const food = (s: State): Food => { const a = s as any; return a.food || (a.food = { noImport: {} }); };
// what each farm grows at level L (colonists fed)
const FARM: Record<string, [number, number]> = { algae: [35, 1.2], greenhouse: [70, 1.22], deepfarm: [120, 1.22] };
export const farmYield = (b: string, L: number) => (FARM[b] ? FARM[b][0] * Math.pow(FARM[b][1], L - 1) : 0);
// how far Earth's supply runs have to go
export function distance(base: string, s: State) { if (base.includes(':')) return gated(s, base.split(':')[0]) ? 4 : 25; return ({ moon: 1, venus: 2, mars: 3, ceres: 4, titan: 6 } as Record<string, number>)[base] || 3; }
// empire-wide harvest bonuses: fully studied life, alien trade
export function foodMult(s: State) { let m = 0; const L = (s as any).life; if (L) for (const id in L.st) { if (L.st[id] < 3) continue; const g = LIFE[id] ? LIFE[id].gift : id.startsWith('x:') ? EXO_GIFTS[(hashSeed(id)) % EXO_GIFTS.length].gift : null; if (g && g.food) m += g.food; }
  if ((s as any).aliens) { if (dealActive(s, 'mycelar', 'trade')) m += 0.3; if (dealActive(s, 'oshoru', 'trade')) m += 0.15; } return m; }
// the exo biosphere seed is the same one the Life Ladder uses (life.ts biospheres); recomputed here to avoid a cycle
const SEEDS: Record<string, number> = {}; const hashSeed = (id: string) => SEEDS[id] ?? (SEEDS[id] = hash(id.slice(2)) >>> 0);
// how much a colony grows itself: its farms (with their robot operators), farming in the open on living worlds, bonuses
export const outdoorHooks: ((s: State, base: string) => number)[] = [];
export function foodProd(s: State, base: string) { const B = s.bases[base]; if (!B) return 0; let f = 0;
  for (const it of B.items) if (it.lvl > 0 && FARM[it.b]) f += farmYield(it.b, it.lvl) * (1 + boostOf(s, base, it.id));
  const T = terraState(s, base); let open = 1; if (T) open += breathable(T) ? 1 : Math.min(0.8, (T.o2 || 0) / 14); if (base.includes(':') && exoBreathable(base)) open += 0.6; for (const h of outdoorHooks) open += h(s, base);
  return f * open * (1 + foodMult(s)); }
// Meridian's logistics level (set by core/meridian): surpluses are shared between colonies before Earth ships anything
export const logistics: { level: (s: State) => number } = { level: () => 0 };
export function foodState(s: State): Record<string, FoodLine> { const out: Record<string, FoodLine> = {};
  for (const bid in s.bases) { if (bid === 'earth') continue; const prod = foodProd(s, bid), need = s.bases[bid].pop || 0; out[bid] = { prod, need, shared: 0, imported: 0, fed: 1 }; }
  const lv = logistics.level(s); if (lv > 0) { const loss = lv >= 2 ? 0.05 : 0.15; let pool = 0, want = 0; for (const k in out) { const o = out[k]; if (o.prod > o.need) pool += (o.prod - o.need) * (1 - loss); else want += o.need - o.prod; }
    const share = want > 0 ? Math.min(1, pool / want) : 0; for (const k in out) { const o = out[k]; if (o.prod < o.need) o.shared = (o.need - o.prod) * share; } }
  const canPay = (s.res.credits || 0) > 0; for (const k in out) { const o = out[k]; const gap = o.need - o.prod - o.shared; if (gap > 0 && canPay && !food(s).noImport[k]) o.imported = gap; o.fed = o.need <= 0 ? 1 : Math.min(1, (o.prod + o.shared + o.imported) / o.need); }
  return out; }
// the bill for supply runs (credits an hour): 10 per colonist fed, times the distance. A colonist in a dome earns 65-90
// credits an hour, so living on Earth's food costs a colony a real share of what it makes, at every stage of the game.
export const unitPrice = (s: State) => 10 * (logistics.level(s) >= 3 ? 0.6 : 1);
export function importBill(s: State, st = foodState(s)) { const u = unitPrice(s); let c = 0; const by: Record<string, number> = {}; for (const k in st) { const v = st[k].imported * distance(k, s) * u; by[k] = v; c += v; } return { total: c, by }; }
export function setImports(s: State, base: string, on: boolean) { if (on) delete food(s).noImport[base]; else food(s).noImport[base] = 1; }
// wiring: life support asks how well fed a colony is; supply runs cost credits every hour
foodHook.fed = (s, base) => { const st = foodState(s)[base]; return st ? st.fed : 1; };
rateHooks.push((s, R) => { if (Object.keys(s.bases).length < 2) return; const b = importBill(s); if (b.total > 0) R.prod.credits -= b.total; });
// once every few seconds: tell the player when a colony starts going hungry, or is fed again
export function tickFood(s: State) { const out: { kind: string; base: string; ok: boolean }[] = []; if (Object.keys(s.bases).length < 2) return out; const F = food(s), H = F.hungry || (F.hungry = {}); const st = foodState(s);
  for (const k in st) { const hungry = st[k].fed < 0.98 && st[k].need > 0; if (hungry && !H[k]) { H[k] = 1; out.push({ kind: 'hunger', base: k, ok: false }); } else if (!hungry && H[k]) { delete H[k]; out.push({ kind: 'hunger', base: k, ok: true }); } } return out; }
// chapter step: a colony that feeds itself, no supply runs needed
stepChecks.fed = (s, st) => { const o = foodState(s)[st.base]; return !!o && o.need > 0 && o.prod + o.shared >= o.need; };
