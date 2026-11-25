// Project funding (ported from Starward). The great works of the endgame (the Hollow relay network, intergalactic
// expeditions, the Matrioshka Brain, the Ringworld) cost more than any storage can hold, so they are paid into a
// funding pool over time: invest what you have, or route surplus production (whatever would spill over full storage)
// into one chosen project, which keeps working while you are away. Starting the work spends the pool.
import { State } from './state';
import { canPay, pay, spillHooks } from './econ';
export interface Fund { pools: Record<string, Record<string, number>>; route: { key: string; cost: Record<string, number> } | null; }
export const fund = (s: State): Fund => { const a = s as any; return a.fund || (a.fund = { pools: {}, route: null }); };
export const pool = (s: State, key: string): Record<string, number> => ((s as any).fund && (s as any).fund.pools[key]) || {};
export const routed = (s: State, key: string) => !!((s as any).fund && (s as any).fund.route && (s as any).fund.route.key === key);
// what is still owed once the pool is counted
export function remaining(s: State, key: string, cost: Record<string, number>) { const p = pool(s, key), o: Record<string, number> = {}; for (const r in cost) o[r] = Math.max(0, Math.round((cost[r] - (p[r] || 0)) * 100) / 100); return o; }
// how far along the slowest resource is (the honest answer to how close the work is)
export function progress(s: State, key: string, cost: Record<string, number>) { const p = pool(s, key); let m = 1; for (const r in cost) m = Math.min(m, Math.min(1, (p[r] || 0) / cost[r])); return m; }
export const funded = (s: State, key: string, cost: Record<string, number>) => canPay(s, remaining(s, key, cost));
// move stock into the pool
export function invest(s: State, key: string, cost: Record<string, number>) { const F = fund(s), p = F.pools[key] || (F.pools[key] = {}); let moved = 0;
  for (const r in cost) { const n = Math.min(cost[r] - (p[r] || 0), s.res[r] || 0); if (n > 0) { p[r] = (p[r] || 0) + n; s.res[r] -= n; moved += n; } }
  if (!moved && !Object.keys(p).length) delete F.pools[key]; return moved; }
export function setRoute(s: State, key: string | null, cost?: Record<string, number>) { fund(s).route = key && cost ? { key, cost: { ...cost } } : null; }
// production that would overflow full storage flows into the routed project
spillHooks.push((s: State, r: string, n: number) => { const F = (s as any).fund as Fund | undefined; if (!F || !F.route || !(n > 0)) return; const need = (F.route.cost[r] || 0) - ((F.pools[F.route.key] || {})[r] || 0); if (need <= 0) return;
  const p = F.pools[F.route.key] || (F.pools[F.route.key] = {}); p[r] = (p[r] || 0) + Math.min(need, n); });
// start the work: pay what the pool does not cover, empty the pool, keep routing onto the next stage if there is one
export function settle(s: State, key: string, cost: Record<string, number>, next: { key?: string; cost: Record<string, number> } | null) { pay(s, remaining(s, key, cost)); const F = fund(s); delete F.pools[key];
  if (F.route && F.route.key === key) F.route = next ? { key: next.key || key, cost: { ...next.cost } } : null; }
