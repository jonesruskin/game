// STARWARD: project funding. The great works of the endgame (the relay network, intergalactic expeditions, the
// Matrioshka Brain, the Ringworld) cost more than any storage can hold, so they are paid into a funding pool over
// time. Invest what you have, or route surplus production (whatever would spill over full storage) into one chosen
// project, which keeps working while you are away. Pools persist per project; starting the work spends the pool.
import { canPay, pay } from './econ.js';
export const fund = (s) => s.fund || (s.fund = { pools: {}, route: null });
export const pool = (s, key) => (s.fund && s.fund.pools[key]) || {};
// a coarse signature of every pool, so panels can redraw as funding moves (not on every trickle)
export const fundSig = (s) => { const F = s.fund; if (!F) return ''; const rt = F.route; // the routed pool moves every frame: track it in whole percent
  return JSON.stringify([rt && rt.key, Object.entries(F.pools).map(([k, p]) => k + (rt && rt.key === k ? Math.floor(progress(s, k, rt.cost) * 100) : Object.values(p).map((v) => v.toPrecision(3)).join()))]); };
export const routed = (s, key) => !!(s.fund && s.fund.route && s.fund.route.key === key);
// what is still owed once the pool is counted
export function remaining(s, key, cost) { const p = pool(s, key), o = {}; for (const r in cost) o[r] = Math.max(0, Math.round((cost[r] - (p[r] || 0)) * 100) / 100); return o; }
// how far along the slowest resource is (the honest answer to how close the work is)
export function progress(s, key, cost) { const p = pool(s, key); let m = 1; for (const r in cost) m = Math.min(m, Math.min(1, (p[r] || 0) / cost[r])); return m; }
export const funded = (s, key, cost) => canPay(s, remaining(s, key, cost));
// move stock into the pool (optionally no more than max[r] of each resource)
export function invest(s, key, cost, max) { const F = fund(s), p = F.pools[key] || (F.pools[key] = {}); let moved = 0;
  for (const r in cost) { let n = Math.min(cost[r] - (p[r] || 0), s.res[r] || 0); if (max) n = Math.min(n, max[r] === undefined ? Infinity : max[r]); if (n > 0) { p[r] = (p[r] || 0) + n; s.res[r] -= n; moved += n; } }
  if (!moved && !Object.keys(p).length) delete F.pools[key]; return moved; }
export function setRoute(s, key, cost) { fund(s).route = key ? { key, cost: { ...cost } } : null; }
// production that would overflow full storage (called from econ.accrue)
export function spill(s, r, n) { const F = s.fund; if (!F || !F.route || !(n > 0)) return; const need = (F.route.cost[r] || 0) - ((F.pools[F.route.key] || {})[r] || 0); if (need <= 0) return;
  const p = F.pools[F.route.key] || (F.pools[F.route.key] = {}); p[r] = (p[r] || 0) + Math.min(need, n); }
// start the work: pay what the pool does not cover, empty the pool, and keep routing onto the next stage if there is one
export function settle(s, key, cost, next) { pay(s, remaining(s, key, cost)); const F = fund(s); delete F.pools[key];
  if (F.route && F.route.key === key) F.route = next ? { key: next.key || key, cost: { ...next.cost } } : null; }
