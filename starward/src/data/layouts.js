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
  return { N, lots };
}
export const LAYOUTS = { earth: ringLayout(17) };
