// STARWARD: base layouts. Lots on an isometric tile grid: { id, i, j, size, hq (command level that opens it) }.
// Earth: a coastal spaceport. Mission Control sits in the middle, the launch complex on the seaward corner.
function ringLayout(N) {
  const lots = [{ id: 'hq', i: 7, j: 7, size: 3, hq: 1, special: 'hq' }, { id: 'pad', i: 14, j: 14, size: 3, hq: 1, special: 'pad' }];
  const P = [1, 4, 7.5, 11, 14]; const cells = [];
  for (const i of P) for (const j of P) { if (i === 7.5 && j === 7.5) continue; if (i === 14 && j === 14) continue; cells.push({ i, j, d: Math.hypot(i - 7.5, j - 7.5) + (i === 7.5 || j === 7.5 ? -0.5 : 0) }); }
  cells.sort((a, b) => a.d - b.d || a.i - b.i || a.j - b.j);
  // unlock schedule by command level
  const sched = [4, 2, 2, 3, 3, 3, 3, 3]; let k = 0;
  sched.forEach((n, lvl) => { for (let q = 0; q < n && k < cells.length; q++, k++) lots.push({ id: 'L' + k, i: cells[k].i, j: cells[k].j, size: 2, hq: lvl + 1 }); });
  // the outer ring beyond the perimeter road (Mission Control 9-14), two lots per level, joined by access roads
  const outer = [[-2.6, 7.5], [7.5, -2.6], [17.6, 7.5], [7.5, 17.6], [-2.6, 4], [4, -2.6], [17.6, 4], [4, 17.6], [-2.6, 11], [11, -2.6], [17.6, 11], [11, 17.6]];
  outer.forEach(([i, j], q) => lots.push({ id: 'X' + q, i, j, size: 2, hq: 9 + Math.floor(q / 2), outer: true }));
  return { N, lots };
}
// the Moon: a compact crater-rim outpost
function moonLayout() {
  const lots = [{ id: 'hq', i: 5, j: 5, size: 3, hq: 1, special: 'hq' }]; const P = [1, 4, 8, 11]; const cells = [];
  for (const i of [1, 5.5, 10]) for (const j of [1, 5.5, 10]) { if (i === 5.5 && j === 5.5) continue; cells.push({ i, j }); }
  for (const [i, j] of [[1, 3.25], [3.25, 1], [10, 3.25], [3.25, 10], [10, 7.75], [7.75, 10], [1, 7.75], [7.75, 1]]) cells.push({ i, j });
  cells.forEach((c) => (c.d = Math.hypot(c.i - 6.5, c.j - 6.5))); cells.sort((a, b) => a.d - b.d);
  const sched = [3, 2, 2, 2, 2, 2, 2, 1]; let k = 0; sched.forEach((n, lvl) => { for (let q = 0; q < n && k < cells.length; q++, k++) lots.push({ id: 'M' + k, i: cells[k].i, j: cells[k].j, size: 2, hq: lvl + 1 }); });
  void P; return { N: 13, lots };
}
// colonies reuse the compact crater-rim plan; each world dresses it differently (see render/base.js THEMES)
export const LAYOUTS = { earth: ringLayout(17), moon: moonLayout(), mars: moonLayout(), ceres: moonLayout(), titan: moonLayout() };
