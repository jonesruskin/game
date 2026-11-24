// STARWARD: procedural building art. Each function draws a building on its lot (local tile coords 0..S)
// at a given level; buildings visibly grow every 5 levels (tiers). Static parts are cached as sprites; the
// returned `fx` list describes animated bits (smoke, beacons, dishes, flames, vapour) drawn every frame,
// and `lights` collects window positions for the night pass.
import { P, box, grid, cyl, tower, dome, dish, lattice, panel, poly, shade, diamond } from './iso.js';

const WALL = '#e6eaf0', STEEL = '#59626f', GLASS = '#3f78b5', ORANGE = '#f08a24', RED = '#d64545', CONC = '#b9bec6', DARK = '#2c333d', GOLD = '#e8b04a';
export const tierOf = (L) => (L < 5 ? 1 : L < 10 ? 2 : L < 15 ? 3 : 4);
const pad = (c, S, col = CONC) => poly(c, diamond(0.08, 0.08, S - 0.16, S - 0.16), col, 'rgba(0,0,0,0.15)');
const trim = (T) => (T >= 4 ? GOLD : ORANGE);

export const ART = {
  hq(c, L, S, lights, fx) {
    const T = tierOf(L); pad(c, S, '#c7cbd2');
    // plaza stripes
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1; for (let k = 1; k < 3; k++) { const a = P(0.3, k, 0), b = P(S - 0.3, k, 0); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
    const h = 26 + T * 10;
    if (T >= 3) { const w2 = box(c, 0.25, 1.95, 1.3, 0.8, h * 0.6, WALL); grid(c, w2.left, 2, 4, GLASS, 0.2, lights); }
    const m = box(c, 0.5, 0.45, 2.0, 1.45, h, WALL); grid(c, m.left, 2 + T, 6, GLASS, 0.2, lights); grid(c, m.right, 2 + T, 4, shade(GLASS, -0.2), 0.2, lights);
    // orange band + roof plant
    poly(c, [P(0.5, 1.9, h - 4), P(2.5, 1.9, h - 4), P(2.5, 1.9, h - 1), P(0.5, 1.9, h - 1)], trim(T));
    box(c, 0.75, 0.6, 0.6, 0.5, 6, '#9aa3ae', h);
    // control tower
    const tw = box(c, 1.85, 0.6, 0.55, 0.55, h + 18 + T * 4, '#dfe4ea'); const th = h + 18 + T * 4;
    box(c, 1.75, 0.5, 0.75, 0.75, 8, '#2b4a6b', th, { top: '#4c6f93' }); grid(c, [P(1.75, 1.25, th), P(2.5, 1.25, th), P(2.5, 1.25, th + 8), P(1.75, 1.25, th + 8)], 1, 3, '#7fd3ff', 0.15, lights);
    const [ax, ay] = P(2.12, 0.87, th + 8); c.strokeStyle = '#8b939e'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax, ay - 16 - T * 3); c.stroke(); fx.push({ k: 'beacon', x: ax, y: ay - 16 - T * 3, col: '#ff3b3b' });
    if (T >= 2) fx.push({ k: 'dish', x: P(1.1, 0.9, h + 2)[0], y: P(1.1, 0.9, h + 2)[1] - 6, r: 9 + T, sp: 0.4 });
    if (T >= 4) { const d = dome(c, 1.0, 2.3, 0.45, 18, '#7fc4ff', h * 0.6, true); void d; }
    // flagpoles
    for (let k = 0; k < 3; k++) { const [fx0, fy0] = P(0.35 + k * 0.35, 2.75, 0); c.strokeStyle = '#a0a7b1'; c.lineWidth = 1; c.beginPath(); c.moveTo(fx0, fy0); c.lineTo(fx0, fy0 - 22); c.stroke(); fx.push({ k: 'flag', x: fx0, y: fy0 - 22, col: ['#3b6fd4', '#ffffff', ORANGE][k] }); }
    // insignia on the front
    const [lx, ly] = P(1.5, 1.9, h * 0.55); c.save(); c.translate(lx, ly); c.scale(1, 0.85); c.strokeStyle = '#1f3d66'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, 9, 4, -0.3, 0, 7); c.stroke(); c.fillStyle = trim(T); c.beginPath(); c.arc(0, 0, 3, 0, 7); c.fill(); c.restore();
    return h + 40;
  },
  research(c, L, S, lights, fx) {
    const T = tierOf(L); pad(c, S);
    const h = 18 + T * 7; const b = box(c, 0.25, 0.3, 1.2, 1.4, h, '#f1f4f8'); grid(c, b.left, 1 + T, 4, '#5fc8e8', 0.15, lights); grid(c, b.right, 1 + T, 5, '#3e9ec2', 0.15, lights);
    const g = box(c, 1.45, 0.5, 0.4, 0.9, h * 0.7, '#6fd0ee', 0, { top: '#bdeeff', left: '#55b7d8', right: '#3d93b3' }); void g;
    const d = dome(c, 0.85, 0.95, 0.42, 14 + T * 2, '#e8edf3', h); fx.push({ k: 'slit', x: d.x, y: d.y + 5 });
    if (T >= 2) { box(c, 1.2, 1.25, 0.55, 0.5, 10, '#cfd6df'); }
    if (T >= 3) { const [x, y] = P(1.65, 0.6, h * 0.7); fx.push({ k: 'dish', x, y: y - 4, r: 7, sp: 0.25 }); }
    const [ax, ay] = P(0.4, 0.4, h); c.strokeStyle = '#99a1ab'; c.lineWidth = 1; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax, ay - 14); c.stroke(); fx.push({ k: 'beacon', x: ax, y: ay - 14, col: '#4dd0ff' });
    return h + 30;
  },
  university(c, L, S, lights, fx) {
    const T = tierOf(L); poly(c, diamond(0.05, 0.05, S - 0.1, S - 0.1), '#78b45a', 'rgba(0,0,0,0.12)');
    const h = 16 + T * 5; const b = box(c, 0.3, 0.35, 1.4, 0.9, h, '#c98b5e'); grid(c, b.left, 2, 6, '#f5e6c8', 0.25, lights); grid(c, b.right, 2, 3, '#e0cba7', 0.25, lights);
    // portico with columns
    const [x0, y0] = P(0.55, 1.25, 0); for (let k = 0; k < 5; k++) { const [x, y] = P(0.55 + k * 0.22, 1.25, 0); c.fillStyle = '#efe7d8'; c.fillRect(x - 1.5, y - h * 0.8, 3, h * 0.8); }
    poly(c, [P(0.45, 1.3, h * 0.8), P(1.55, 1.3, h * 0.8), P(1.0, 1.3, h * 0.8 + 8)], '#efe7d8', 'rgba(0,0,0,0.2)'); void x0; void y0;
    // clock tower
    const t = box(c, 1.25, 0.45, 0.35, 0.35, h + 14 + T * 3, '#b97a4e'); void t; const [cx, cy] = P(1.42, 0.8, h + 6 + T * 3); c.fillStyle = '#fff6e0'; c.beginPath(); c.arc(cx - 2, cy, 3, 0, 7); c.fill(); lights.push({ x: cx - 2, y: cy, r: 3, k: 1 });
    poly(c, [P(1.22, 0.42, h + 14 + T * 3), P(1.63, 0.42, h + 14 + T * 3), P(1.63, 0.83, h + 14 + T * 3), P(1.22, 0.83, h + 14 + T * 3)], '#6e3e2a');
    const [px, py] = P(1.425, 0.625, h + 14 + T * 3); poly(c, [[px - 9, py], [px, py - 12], [px + 9, py], [px, py + 4]], '#5a6b7a');
    // trees
    for (const [i, j] of [[0.2, 1.7], [1.7, 1.6], [1.8, 1.25]]) { const [x, y] = P(i, j, 0); c.fillStyle = '#3d7a3a'; c.beginPath(); c.arc(x, y - 7, 6, 0, 7); c.fill(); c.fillStyle = '#4f9a49'; c.beginPath(); c.arc(x - 2, y - 9, 3.5, 0, 7); c.fill(); }
    return h + 34;
  },
  mine(c, L, S, lights, fx) {
    const T = tierOf(L); poly(c, diamond(0.05, 0.05, S - 0.1, S - 0.1), '#a8906e', 'rgba(0,0,0,0.15)');
    // terraced pit
    const cols = ['#8c7558', '#755f45', '#5e4b36', '#45372a']; for (let k = 0; k < 2 + Math.min(2, T - 1); k++) { const m = 0.18 + k * 0.17; poly(c, diamond(m, m + 0.05, 1.25 - k * 0.3, 1.2 - k * 0.3), cols[k], 'rgba(0,0,0,0.12)'); }
    // ore piles
    for (const [i, j, r] of [[1.55, 0.4, 0.22], [1.7, 0.85, 0.18]]) { const [x, y] = P(i, j, 0); c.fillStyle = '#7d828b'; c.beginPath(); c.ellipse(x, y, r * 40, r * 20, 0, Math.PI, 0); c.fill(); c.fillStyle = '#9aa0a9'; c.beginPath(); c.ellipse(x - 2, y - r * 8, r * 22, r * 9, 0, Math.PI, 0); c.fill(); }
    // headframe
    const [hx, hy] = P(1.55, 1.45, 0); lattice(c, hx, hy, 12, 30 + T * 6, '#5a6270', 6); const [wx, wy] = [hx, hy - 30 - T * 6]; fx.push({ k: 'wheel', x: wx, y: wy, r: 5 });
    box(c, 1.3, 1.55, 0.45, 0.35, 10, '#c9a14a');
    if (T >= 2) { const s = box(c, 1.25, 0.15, 0.6, 0.45, 14 + T * 3, '#9b5a3c'); grid(c, s.left, 1, 2, '#ffcc6a', 0.3, lights); const [sx, sy] = P(1.7, 0.25, 14 + T * 3); c.fillStyle = '#6b4a3a'; c.fillRect(sx - 2, sy - 16, 4, 16); fx.push({ k: 'smoke', x: sx, y: sy - 16, col: 'rgba(90,90,95,', s: 0.8 }); }
    if (T >= 3) { const [ax, ay] = P(0.5, 1.75, 0), [bx, by] = P(1.35, 1.55, 10); c.strokeStyle = '#3a3f47'; c.lineWidth = 3; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); fx.push({ k: 'conveyor', ax, ay, bx, by }); }
    fx.push({ k: 'truck', i0: 0.3, j0: 0.5, i1: 1.4, j1: 0.4 });
    return 50 + T * 6;
  },
  refinery(c, L, S, lights, fx) {
    const T = tierOf(L); pad(c, S, '#aeb3ba');
    const tanks = T >= 3 ? [[0.45, 0.45], [0.45, 1.05], [1.05, 0.45]] : T >= 2 ? [[0.45, 0.45], [0.45, 1.05]] : [[0.5, 0.6]];
    for (const [i, j] of tanks) { const t = cyl(c, i, j, 0.27, 16 + T * 3, '#f2f4f7', 0, { bands: ORANGE, nb: 2 }); void t; }
    // distillation column
    const col = cyl(c, 1.35, 1.0, 0.13, 40 + T * 9, '#c7ccd3', 0, { bands: '#7d8590', nb: 5 }); lights.push({ x: col.x, y: col.top + 6, r: 2, k: 3 }); fx.push({ k: 'beacon', x: col.x, y: col.top - 2, col: '#ff3b3b' });
    // pipes
    c.strokeStyle = '#8f969f'; c.lineWidth = 2; const a = P(0.7, 0.7, 6), b = P(1.35, 1.0, 6), d = P(1.6, 1.6, 4); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.stroke();
    // flare stack
    const [fx0, fy0] = P(1.7, 0.35, 0); c.fillStyle = '#6a717b'; c.fillRect(fx0 - 1.5, fy0 - 46 - T * 6, 3, 46 + T * 6); fx.push({ k: 'flare', x: fx0, y: fy0 - 46 - T * 6 });
    box(c, 1.25, 1.45, 0.5, 0.4, 9, '#d9dde3');
    return 60 + T * 9;
  },
  office(c, L, S, lights, fx) {
    const T = tierOf(L); pad(c, S, '#c3c8cf');
    const floors = 2 + Math.min(10, Math.floor(L / 2) + T); const h = floors * 7;
    const b = box(c, 0.45, 0.45, 1.1, 1.1, h, '#dfe7ef', 0, { left: '#4f86bf', right: '#2f5f93', top: '#cfd9e3' });
    c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 0.6; for (let k = 1; k < floors; k++) { const z = k * 7; for (const f of [[P(0.45, 1.55, z), P(1.55, 1.55, z)], [P(1.55, 0.45, z), P(1.55, 1.55, z)]]) { c.beginPath(); c.moveTo(f[0][0], f[0][1]); c.lineTo(f[1][0], f[1][1]); c.stroke(); } }
    grid(c, b.left, floors, 4, 'rgba(255,240,200,0.0)', 0.2, lights); grid(c, b.right, floors, 4, 'rgba(255,240,200,0.0)', 0.2, lights);
    if (T >= 3) { const [x, y] = P(1.0, 1.0, h); c.strokeStyle = '#ffd166'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y, 10, 5, 0, 0, 7); c.stroke(); c.fillStyle = '#ffd166'; c.font = 'bold 7px sans-serif'; c.textAlign = 'center'; c.fillText('H', x, y + 2.5); }
    // sign
    const sg = box(c, 0.2, 1.6, 0.6, 0.12, 9, '#1f2a36'); void sg; const [sx, sy] = P(0.5, 1.72, 5); c.fillStyle = '#ffd166'; c.font = 'bold 6px sans-serif'; c.textAlign = 'center'; c.fillText('AGENCY', sx, sy); lights.push({ x: sx, y: sy - 2, r: 6, k: 0 });
    fx.push({ k: 'beacon', x: P(1.0, 1.0, h)[0], y: P(1.0, 1.0, h)[1] - 10, col: '#ff3b3b' });
    return h + 20;
  },
  solar(c, L, S, lights, fx) {
    const T = tierOf(L); poly(c, diamond(0.05, 0.05, S - 0.1, S - 0.1), '#9cb36e', 'rgba(0,0,0,0.12)');
    const rows = 2 + Math.min(3, Math.floor((L - 1) / 3)); for (let r = 0; r < rows; r++) panel(c, 0.2, 0.15 + r * (1.6 / rows), 1.6, 1.6 / rows - 0.12, 2, 6);
    box(c, 1.6, 1.6, 0.3, 0.3, 6, '#d5d9de'); fx.push({ k: 'glint', x0: P(0.2, 0.2, 4)[0], y0: P(0.2, 0.2, 4)[1], x1: P(1.8, 1.8, 6)[0], y1: P(1.8, 1.8, 6)[1] });
    if (T >= 3) { const [x, y] = P(0.1, 1.85, 0); lattice(c, x, y, 5, 24, '#9aa2ad', 4); }
    return 20;
  },
  fission(c, L, S, lights, fx) {
    const T = tierOf(L); pad(c, S, '#b4b9c0');
    const ct = tower(c, 0.62, 0.62, 0.5, 40 + T * 8, '#d4d8dd'); fx.push({ k: 'steam', x: ct.x, y: ct.y, s: 1.4 + T * 0.2 });
    const r = cyl(c, 1.35, 1.25, 0.32, 20 + T * 3, '#e7eaee'); dome(c, 1.35, 1.25, 0.32, 10, '#e7eaee', 20 + T * 3); void r;
    const tb = box(c, 0.6, 1.35, 0.6, 0.45, 13, '#9ea7b2'); grid(c, tb.left, 1, 3, '#ffd88a', 0.25, lights);
    c.fillStyle = '#ffd166'; const [sx, sy] = P(1.35, 1.57, 8); c.beginPath(); c.moveTo(sx - 4, sy); c.lineTo(sx + 4, sy); c.lineTo(sx, sy - 6); c.closePath(); c.fill();
    return 60 + T * 8;
  },
  depot(c, L, S, lights, fx) {
    const T = tierOf(L); pad(c, S, '#b1b6bd');
    const w = box(c, 0.2, 0.25, 1.1, 0.6, 12 + T * 2, '#c8a46a'); c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 0.6; for (let k = 1; k < 6; k++) { const a = P(0.2 + k * 0.183, 0.85, 0), b = P(0.2 + k * 0.183, 0.85, 12 + T * 2); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); } void w;
    for (const [i, j] of [[1.55, 0.5], ...(T >= 2 ? [[1.55, 1.1]] : [])]) { const [x, y] = P(i, j, 0); c.fillStyle = shade('#f4f6f8', -0.25); c.fillRect(x - 1, y - 6, 2, 6); const g = c.createRadialGradient(x - 4, y - 16, 1, x, y - 12, 12); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#9aa3ad'); c.fillStyle = g; c.beginPath(); c.arc(x, y - 13, 9, 0, 7); c.fill(); }
    const cols = ['#d64545', '#3b6fd4', '#f08a24', '#2f9e6a', '#e8b04a']; let n = 0; for (let r = 0; r < 2; r++) for (let k = 0; k < 2 + T; k++) box(c, 0.25 + (k % 3) * 0.32, 1.15 + r * 0.32 + Math.floor(k / 3) * 0.0, 0.28, 0.26, 6, cols[n++ % cols.length], (Math.floor(k / 3)) * 6);
    return 30;
  },
  launch(c, L, S, lights, fx) {
    const T = tierOf(L); poly(c, diamond(0.0, 0.0, S, S), '#c3c7cd', 'rgba(0,0,0,0.2)');
    poly(c, diamond(0.9, 0.9, 1.2, 1.2), '#9da3ab', 'rgba(0,0,0,0.25)'); poly(c, diamond(1.25, 1.95, 0.5, 0.9), '#3a3f46'); // flame trench
    // water tower
    const wt = cyl(c, 0.35, 2.55, 0.18, 6, '#9aa3ad'); const [wx, wy] = P(0.35, 2.55, 0); lattice(c, wx, wy, 8, 22, '#7b838e', 4); cyl(c, 0.35, 2.55, 0.22, 10, '#e8ecf1', 22); void wt;
    // service tower
    const th = 46 + T * 16; const [tx, ty] = P(1.1, 1.0, 0); lattice(c, tx, ty, 10, th, '#c4422b', 10); box(c, 1.0, 0.9, 0.22, 0.22, 4, '#a73a26', th);
    c.strokeStyle = '#a73a26'; c.lineWidth = 2; for (let k = 1; k <= Math.min(4, T + 1); k++) { const y = ty - (th * k) / (T + 2); c.beginPath(); c.moveTo(tx + 5, y); c.lineTo(tx + 14, y + 3); c.stroke(); }
    // lightning masts
    for (const [i, j] of [[0.25, 0.25], [2.75, 0.25], [0.25, 2.75]]) { const [x, y] = P(i, j, 0); c.strokeStyle = '#8d949e'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 52 - T * 8); c.stroke(); fx.push({ k: 'beacon', x, y: y - 52 - T * 8, col: '#ff3b3b' }); }
    // floodlights
    for (const [i, j] of [[2.6, 1.0], [1.0, 2.6]]) { const [x, y] = P(i, j, 0); c.strokeStyle = '#7b838e'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 20); c.stroke(); c.fillStyle = '#fff3c4'; c.fillRect(x - 3, y - 23, 6, 3); lights.push({ x, y: y - 22, r: 10, k: 0, flood: true }); }
    fx.push({ k: 'rocketSlot', x: P(1.5, 1.5, 0)[0], y: P(1.5, 1.5, 0)[1] - 2, T });
    return th + 30;
  },
  vab(c, L, S, lights, fx) {
    const T = tierOf(L); pad(c, S, '#b9bec5');
    const h = 54 + T * 14; const b = box(c, 0.2, 0.25, 1.55, 1.3, h, '#eef1f4');
    // giant door
    const dpts = [P(0.55, 1.55, 0), P(1.25, 1.55, 0), P(1.25, 1.55, h * 0.88), P(0.55, 1.55, h * 0.88)]; poly(c, dpts, '#6c7480');
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 0.7; for (let k = 1; k < 8; k++) { const a = P(0.55, 1.55, (h * 0.88 * k) / 8), bb = P(1.25, 1.55, (h * 0.88 * k) / 8); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(bb[0], bb[1]); c.stroke(); }
    // flag + logo panel on the right face
    const f = [P(1.75, 0.45, h * 0.45), P(1.75, 0.95, h * 0.45), P(1.75, 0.95, h * 0.7), P(1.75, 0.45, h * 0.7)]; poly(c, f, '#2a4f9a'); poly(c, [P(1.75, 0.45, h * 0.57), P(1.75, 0.95, h * 0.57), P(1.75, 0.95, h * 0.6), P(1.75, 0.45, h * 0.6)], '#ffffff');
    grid(c, b.left, 1, 2, '#9fd2ff', 0.35, lights); fx.push({ k: 'beacon', x: P(0.98, 0.9, h)[0], y: P(0.98, 0.9, h)[1] - 4, col: '#ff3b3b' });
    return h + 16;
  },
  tracking(c, L, S, lights, fx) {
    const T = tierOf(L); poly(c, diamond(0.05, 0.05, S - 0.1, S - 0.1), '#8fb06a', 'rgba(0,0,0,0.12)');
    const hut = box(c, 1.3, 1.3, 0.5, 0.45, 9, '#e3e7ec'); grid(c, hut.left, 1, 2, '#9fd2ff', 0.3, lights);
    const [px, py] = P(0.85, 0.85, 0); c.fillStyle = '#c8cdd3'; c.beginPath(); c.moveTo(px - 7, py); c.lineTo(px - 3, py - 22 - T * 3); c.lineTo(px + 3, py - 22 - T * 3); c.lineTo(px + 7, py); c.closePath(); c.fill();
    fx.push({ k: 'dish', x: px, y: py - 26 - T * 3, r: 16 + T * 3, sp: 0.18, big: true });
    if (T >= 2) { const [x2, y2] = P(1.6, 0.4, 0); c.fillStyle = '#c8cdd3'; c.fillRect(x2 - 1.5, y2 - 12, 3, 12); fx.push({ k: 'dish', x: x2, y: y2 - 14, r: 8, sp: -0.3 }); }
    return 50 + T * 4;
  },
  academy(c, L, S, lights, fx) {
    const T = tierOf(L); pad(c, S, '#c3c8cf');
    const h = 16 + T * 6; const b = box(c, 0.25, 0.3, 1.0, 1.35, h, '#f2f4f7'); grid(c, b.left, 2, 4, '#5fc8e8', 0.2, lights); grid(c, b.right, 2, 3, '#3e9ec2', 0.2, lights);
    // centrifuge arm + pool
    poly(c, diamond(1.3, 1.2, 0.55, 0.55), '#3f9fd8', 'rgba(0,0,0,0.2)'); const [cx, cy] = P(1.55, 0.6, 0); c.strokeStyle = '#8b939e'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy - 12); c.stroke(); fx.push({ k: 'centrifuge', x: cx, y: cy - 12 });
    poly(c, [P(0.25, 1.65, h - 3), P(1.25, 1.65, h - 3), P(1.25, 1.65, h), P(0.25, 1.65, h)], trim(T));
    return h + 24;
  },
  // ---------------- Moon ----------------
  hub(c, L, S, lights, fx) {
    const T = tierOf(L); poly(c, diamond(0.05, 0.05, S - 0.1, S - 0.1), '#8d8b87', 'rgba(0,0,0,0.25)');
    const d = dome(c, 1.5, 1.5, 0.95 + T * 0.05, 30 + T * 6, '#dfe2e6'); fx.push({ k: 'beacon', x: d.x, y: d.y - 4, col: '#ff3b3b' });
    for (const [i, j] of [[0.45, 1.5], [2.55, 1.5], [1.5, 0.45], [1.5, 2.55]]) { const m = cyl(c, i, j, 0.28, 12, '#e8ebee', 0, { bands: '#f08a24', nb: 2 }); lights.push({ x: m.x, y: m.top + 8, r: 3, k: 2 }); }
    const r = box(c, 2.2, 0.35, 0.5, 0.4, 10 + T * 3, '#c9cdd2'); grid(c, r.left, 1, 2, '#9fd2ff', 0.3, lights);
    const [ax, ay] = P(0.6, 0.6, 0); lattice(c, ax, ay, 6, 34 + T * 6, '#9aa2ad', 5); fx.push({ k: 'beacon', x: ax, y: ay - 34 - T * 6, col: '#4dd0ff' });
    if (T >= 2) fx.push({ k: 'dish', x: P(2.45, 0.55, 10 + T * 3)[0], y: P(2.45, 0.55, 10 + T * 3)[1] - 6, r: 8, sp: 0.2 });
    return 40 + T * 6;
  },
  regolith(c, L, S, lights, fx) {
    const T = tierOf(L); poly(c, diamond(0.05, 0.05, S - 0.1, S - 0.1), '#7a7874', 'rgba(0,0,0,0.2)');
    for (let k = 0; k < 2 + Math.min(2, T - 1); k++) { const m = 0.2 + k * 0.17; poly(c, diamond(m, m, 1.2 - k * 0.3, 1.2 - k * 0.3), ['#6c6a66', '#5d5b57', '#4f4d4a', '#43413e'][k], 'rgba(0,0,0,0.12)'); }
    const fur = box(c, 1.25, 1.2, 0.55, 0.55, 14 + T * 3, '#b9bdc2'); grid(c, fur.left, 1, 2, '#ffb36a', 0.3, lights);
    const [x, y] = P(1.5, 0.45, 0); c.fillStyle = '#e8b04a'; c.fillRect(x - 6, y - 7, 12, 6); c.strokeStyle = '#555'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 5, y - 6); c.lineTo(x + 14, y - 14); c.lineTo(x + 18, y - 6); c.stroke(); fx.push({ k: 'dust', x: x + 18, y: y - 6 });
    return 30 + T * 4;
  },
  ice(c, L, S, lights, fx) {
    const T = tierOf(L); poly(c, diamond(0.05, 0.05, S - 0.1, S - 0.1), '#6f7680', 'rgba(0,0,0,0.2)');
    poly(c, diamond(0.25, 0.25, 0.9, 0.9), '#cfe6f5', 'rgba(255,255,255,0.4)');
    const [x, y] = P(0.7, 0.7, 0); lattice(c, x, y, 8, 30 + T * 6, '#9aa2ad', 5); fx.push({ k: 'drill', x, y: y - 4 });
    for (const [i, j] of [[1.45, 0.5], [1.45, 1.1], ...(T >= 2 ? [[1.0, 1.5]] : [])]) { const t2 = cyl(c, i, j, 0.22, 14 + T * 2, '#eaf4fb', 0, { bands: '#6ee7ff', nb: 2 }); void t2; }
    return 40 + T * 6;
  },
  he3x(c, L, S, lights, fx) {
    const T = tierOf(L); poly(c, diamond(0.05, 0.05, S - 0.1, S - 0.1), '#7c7a76', 'rgba(0,0,0,0.2)');
    // rotary kiln (long tilted cylinder) + collector sphere
    const k0 = P(0.3, 1.0, 10), k1 = P(1.5, 1.0, 18); const g = c.createLinearGradient(k0[0], k0[1] - 8, k0[0], k0[1] + 8); g.addColorStop(0, '#e9ecf0'); g.addColorStop(1, '#8e97a3'); c.strokeStyle = g; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(k0[0], k0[1]); c.lineTo(k1[0], k1[1]); c.stroke(); c.lineCap = 'butt';
    c.strokeStyle = 'rgba(184,146,255,0.8)'; c.lineWidth = 2; for (let k = 1; k < 4; k++) { const p = [k0[0] + (k1[0] - k0[0]) * k / 4, k0[1] + (k1[1] - k0[1]) * k / 4]; c.beginPath(); c.moveTo(p[0], p[1] - 6); c.lineTo(p[0], p[1] + 6); c.stroke(); }
    const [sx, sy] = P(1.6, 0.45, 0); const gr = c.createRadialGradient(sx - 4, sy - 18, 1, sx, sy - 14, 12); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#8f7cc4'); c.fillStyle = gr; c.beginPath(); c.arc(sx, sy - 14, 10 + T, 0, 7); c.fill(); fx.push({ k: 'glow', x: sx, y: sy - 14, col: '184,146,255' });
    box(c, 0.3, 1.5, 0.6, 0.35, 8, '#c9cdd2');
    return 40 + T * 4;
  },
  lsolar(c, L, S, lights, fx) {
    const T = tierOf(L); poly(c, diamond(0.05, 0.05, S - 0.1, S - 0.1), '#7d7b77', 'rgba(0,0,0,0.2)');
    const n = 2 + Math.min(3, Math.floor((L - 1) / 4));
    for (let k = 0; k < n; k++) { const i = 0.4 + (k % 2) * 0.9, j = 0.4 + Math.floor(k / 2) * 0.55 + (k % 2) * 0.25; const [x, y] = P(i, j, 0); const h = 30 + T * 6; c.fillStyle = '#9aa2ad'; c.fillRect(x - 1, y - h, 2, h);
      const a = [x - 10, y - h - 18], b = [x + 10, y - h - 12]; const gr = c.createLinearGradient(a[0], a[1], b[0], b[1]); gr.addColorStop(0, '#1d3a6b'); gr.addColorStop(0.5, '#3a6fbf'); gr.addColorStop(1, '#16305a'); c.fillStyle = gr; c.beginPath(); c.moveTo(x - 10, y - h - 20); c.lineTo(x + 10, y - h - 14); c.lineTo(x + 10, y - h + 2); c.lineTo(x - 10, y - h - 4); c.closePath(); c.fill(); c.strokeStyle = 'rgba(180,200,240,0.6)'; c.lineWidth = 0.6; c.stroke(); }
    return 60 + T * 6;
  },
  dome(c, L, S, lights, fx) {
    const T = tierOf(L); poly(c, diamond(0.05, 0.05, S - 0.1, S - 0.1), '#85837f', 'rgba(0,0,0,0.2)');
    poly(c, diamond(0.3, 0.3, 1.4, 1.4), '#4c8a3e'); for (let k = 0; k < 7; k++) { const [x, y] = P(0.5 + (k * 0.37) % 1.1, 0.6 + ((k * 0.61) % 1.0), 0); c.fillStyle = '#2f6a2a'; c.beginPath(); c.arc(x, y - 4, 4, 0, 7); c.fill(); }
    const d = dome(c, 1.0, 1.0, 0.72, 24 + T * 5, '#9fd8ff', 0, true); lights.push({ x: d.x, y: d.y + 12, r: 10, k: 0 });
    cyl(c, 1.75, 1.0, 0.16, 8, '#e3e6ea');
    return 40 + T * 5;
  },
  llab(c, L, S, lights, fx) {
    const T = tierOf(L); poly(c, diamond(0.05, 0.05, S - 0.1, S - 0.1), '#807e7a', 'rgba(0,0,0,0.2)');
    const m = cyl(c, 0.55, 1.35, 0.32, 14, '#eef1f4', 0, { bands: '#6ee7ff', nb: 2 }); lights.push({ x: m.x, y: m.top + 7, r: 4, k: 1 }); const m2 = box(c, 0.85, 1.15, 0.6, 0.4, 10, '#d9dde2'); void m2;
    const [px, py] = P(1.3, 0.6, 0); c.fillStyle = '#c8cdd3'; c.fillRect(px - 2, py - 18 - T * 3, 4, 18 + T * 3); fx.push({ k: 'dish', x: px, y: py - 22 - T * 3, r: 14 + T * 2, sp: 0.12, big: true });
    return 50 + T * 4;
  },
  massDriver(c, L, S, lights, fx) {
    const T = tierOf(L); poly(c, diamond(0.05, 0.05, S - 0.1, S - 0.1), '#7a7874', 'rgba(0,0,0,0.2)');
    // an inclined rail leaving the lot
    const a = P(0.2, 1.7, 2), b = P(1.85, 0.2, 40 + T * 10); c.strokeStyle = '#9aa2ad'; c.lineWidth = 2; for (let k = 0; k <= 6; k++) { const t2 = k / 6; const x = a[0] + (b[0] - a[0]) * t2, y = a[1] + (b[1] - a[1]) * t2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 6 + (1 - t2) * 30 * 0); c.stroke(); }
    c.strokeStyle = '#d9dee5'; c.lineWidth = 4; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.strokeStyle = '#6ee7ff'; c.lineWidth = 1; c.beginPath(); c.moveTo(a[0], a[1] - 2); c.lineTo(b[0], b[1] - 2); c.stroke();
    for (let k = 1; k < 6; k++) { const t2 = k / 6; const [x, y] = [a[0] + (b[0] - a[0]) * t2, a[1] + (b[1] - a[1]) * t2]; c.fillStyle = '#8e97a3'; c.fillRect(x - 1, y, 2, (1 - t2) * 2 + t2 * (40 + T * 10) * 0.9); }
    fx.push({ k: 'pod', ax: a[0], ay: a[1], bx: b[0], by: b[1] }); box(c, 0.2, 1.4, 0.5, 0.45, 10, '#c9cdd2');
    return 60 + T * 10;
  },
  // ---------------- Part 3 ----------------
  greenhouse(c, L, S, lights, fx) {
    const T = tierOf(L); pad(c, S, '#8f8c88'); const n = 2 + (T >= 3 ? 1 : 0);
    for (let k = 0; k < n; k++) { const j = 0.25 + k * (1.5 / n); const len = 1.5; const h = 9 + T * 2;
      const b = box(c, 0.25, j, len, 1.5 / n - 0.12, h, '#9fd8ff', 0, { top: 'rgba(200,240,255,0.55)', left: 'rgba(120,190,230,0.7)', right: 'rgba(80,150,200,0.75)', edge: 'rgba(255,255,255,0.45)' });
      for (let r = 0; r < 4; r++) { const [x1, y1] = P(0.35 + r * 0.35, j + 0.08, h - 1), [x2, y2] = P(0.35 + r * 0.35, j + 1.5 / n - 0.2, h - 1); c.strokeStyle = '#3f8a3a'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
      grid(c, b.left, 1, 3, 'rgba(255,120,220,0.35)', 0.2, lights); }
    const t = cyl(c, 1.75, 0.45, 0.2, 14 + T * 2, '#e6eaf0', 0, { bands: '#6ee7ff', nb: 2 }); void t;
    return 24 + T * 3;
  },
  reactor(c, L, S, lights, fx) {
    const T = tierOf(L); pad(c, S, '#8d8a86');
    for (let k = 0; k < 3 + T; k++) { const i = 0.25 + k * 0.28; const a = P(i, 1.65, 0), b = P(i, 1.65, 16 + T * 3); const a2 = P(i, 1.05, 0); c.fillStyle = '#c9ced6'; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(a2[0], a2[1]); c.lineTo(a2[0], a2[1] - 16 - T * 3); c.lineTo(b[0], b[1]); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 0.6; c.stroke(); }
    const r = cyl(c, 1.2, 0.75, 0.45, 12 + T * 3, '#b9bec6', 0, { bands: '#e8b04a', nb: 2 }); fx.push({ k: 'glow', x: r.x, y: r.top, col: '110,231,255' }); lights.push({ x: r.x, y: r.top + 6, r: 4, k: 1 });
    poly(c, diamond(1.0, 0.55, 0.4, 0.4, 12 + T * 3), '#e8b04a');
    return 30 + T * 4;
  },
  terraformer(c, L, S, lights, fx) {
    const T = tierOf(L); pad(c, S, '#8e8a84');
    const b = box(c, 0.2, 0.9, 1.2, 0.85, 16 + T * 3, '#c9cdd2'); grid(c, b.left, 2, 4, '#ffb36a', 0.25, lights); grid(c, b.right, 2, 3, '#ffb36a', 0.25, lights);
    for (const [i, j, h] of [[1.55, 0.55, 46 + T * 10], [1.1, 0.4, 36 + T * 8]]) { const st = cyl(c, i, j, 0.18, h, '#dfe3e8', 0, { bands: RED, nb: 3 }); fx.push({ k: 'vent', x: st.x, y: st.top }); }
    return 70 + T * 10;
  },
  beltControl(c, L, S, lights, fx) {
    const T = tierOf(L); pad(c, S, '#7f7c78');
    const [hx, hy] = P(1.35, 1.35, 0); c.strokeStyle = 'rgba(255,209,102,0.85)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(hx, hy, 18, 9, 0, 0, 7); c.stroke(); c.fillStyle = 'rgba(255,209,102,0.85)'; c.font = '700 9px Oxanium, sans-serif'; c.textAlign = 'center'; c.fillText('H', hx, hy + 3);
    const tw = cyl(c, 0.6, 0.6, 0.22, 30 + T * 6, '#e6eaf0', 0, { bands: '#6ee7ff', nb: 3 }); const cab = box(c, 0.32, 0.32, 0.56, 0.56, 8, '#3f78b5', 30 + T * 6); grid(c, cab.left, 1, 3, '#9fd2ff', 0.2, lights); void tw;
    fx.push({ k: 'dish', x: P(0.6, 0.6, 38 + T * 6)[0], y: P(0.6, 0.6, 38 + T * 6)[1] - 4, r: 12, sp: 0.5 }); fx.push({ k: 'beacon', x: P(1.35, 1.35, 0)[0], y: P(1.35, 1.35, 0)[1] - 1, col: '#ffd166' });
    return 50 + T * 6;
  },
  methane(c, L, S, lights, fx) {
    const T = tierOf(L); pad(c, S, '#7a6650');
    for (const [i, j] of [[0.55, 0.55], [1.35, 0.55], ...(T >= 2 ? [[0.55, 1.35]] : [])]) { const [x, y] = P(i, j, 0); const r = 13 + T; c.fillStyle = '#9aa2ad'; c.fillRect(x - r * 0.6, y - r, 2, r); c.fillRect(x + r * 0.6 - 2, y - r, 2, r); const g = c.createRadialGradient(x - r * 0.4, y - r * 1.6, 1, x, y - r * 1.2, r * 1.2); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#a7afb9'); c.fillStyle = g; c.beginPath(); c.arc(x, y - r * 1.2, r, 0, 7); c.fill(); }
    const fl = cyl(c, 1.6, 1.6, 0.08, 40 + T * 8, '#c9ced6'); fx.push({ k: 'flare', x: fl.x, y: fl.top });
    c.strokeStyle = '#e8b04a'; c.lineWidth = 2; const a = P(0.55, 0.9, 4), b = P(1.6, 1.6, 4); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    return 48 + T * 8;
  },
  fusion(c, L, S, lights, fx) {
    const T = tierOf(L); pad(c, S, CONC);
    const b = box(c, 0.2, 0.2, 1.6, 1.6, 12 + T * 2, '#dfe3e8'); grid(c, b.left, 1, 5, '#b892ff', 0.25, lights); grid(c, b.right, 1, 5, '#b892ff', 0.25, lights);
    const [x, y] = P(1.0, 1.0, 12 + T * 2); const rx = 28 + T * 3, ry = 14 + T * 1.5;
    c.lineWidth = 9; const g = c.createLinearGradient(x - rx, 0, x + rx, 0); g.addColorStop(0, '#9aa2ad'); g.addColorStop(0.4, '#eef1f5'); g.addColorStop(1, '#6b7380'); c.strokeStyle = g; c.beginPath(); c.ellipse(x, y - 8, rx, ry, 0, 0, 7); c.stroke();
    c.lineWidth = 2; c.strokeStyle = 'rgba(184,146,255,0.9)'; c.beginPath(); c.ellipse(x, y - 8, rx, ry, 0, 0, 7); c.stroke();
    fx.push({ k: 'glow', x, y: y - 8, col: '184,146,255' }); fx.push({ k: 'beacon', x: x + rx, y: y - 14, col: '#b892ff' });
    return 40 + T * 4;
  },
  elevator(c, L, S, lights, fx) {
    const T = tierOf(L); pad(c, S, '#a9aeb6');
    const b = box(c, 0.25, 0.25, 1.5, 1.5, 10 + T * 2, '#e6eaf0'); grid(c, b.left, 1, 4, GLASS, 0.25, lights); grid(c, b.right, 1, 4, GLASS, 0.25, lights);
    const [x, y] = P(1.0, 1.0, 10 + T * 2); for (const [dx, dy] of [[-16, -2], [16, -2], [0, 8]]) { c.strokeStyle = '#59626f'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + dx, y + dy); c.lineTo(x, y - 30); c.stroke(); }
    cyl(c, 1.0, 1.0, 0.3, 10, '#c9ced6', 10 + T * 2 + 14); fx.push({ k: 'climber', x, y: y - 30 });
    return 60 + T * 2;
  },
  antimatter(c, L, S, lights, fx) {
    const T = tierOf(L); pad(c, S, '#a9aeb6'); const [x, y] = P(1.0, 1.0, 6); const rx = 34 + T * 2, ry = 17 + T;
    c.lineWidth = 7; c.strokeStyle = '#c9ced6'; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.stroke(); c.lineWidth = 1.5; c.strokeStyle = '#ff4d6d'; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.stroke();
    const b = box(c, 0.75, 0.75, 0.5, 0.5, 18 + T * 3, '#e6eaf0'); grid(c, b.left, 2, 2, '#ff4d6d', 0.25, lights); fx.push({ k: 'glow', x, y: y - 22, col: '255,77,109' }); fx.push({ k: 'beacon', x: x + rx, y: y - 4, col: '#ff4d6d' });
    return 40 + T * 4;
  },
  xenolab(c, L, S, lights, fx) {
    const T = tierOf(L); pad(c, S, '#b9bec6');
    const b = box(c, 0.25, 0.9, 1.5, 0.9, 14 + T * 3, '#e6eaf0'); grid(c, b.left, 2, 5, '#9dff5c', 0.25, lights); grid(c, b.right, 2, 3, '#9dff5c', 0.25, lights);
    const d = dome(c, 0.75, 0.55, 0.42, 20 + T * 3, '#cfe9d6', 14 + T * 3, true); fx.push({ k: 'glow', x: d.x, y: d.y + 6, col: '157,255,92' });
    const [px, py] = P(1.5, 0.45, 0); c.fillStyle = '#c8cdd3'; c.fillRect(px - 2, py - 26 - T * 3, 4, 26 + T * 3); fx.push({ k: 'dish', x: px, y: py - 30 - T * 3, r: 14 + T * 2, sp: 0.08, big: true });
    return 52 + T * 4;
  },
  casimir(c, L, S, lights, fx) {
    const T = tierOf(L); pad(c, S, '#a9aeb6');
    const b = box(c, 0.2, 1.05, 1.6, 0.75, 12 + T * 2, '#d9dde2'); grid(c, b.left, 1, 5, '#ff6bd6', 0.25, lights);
    const ch = cyl(c, 1.0, 0.6, 0.42, 22 + T * 4, '#c9ced6', 0, { bands: '#ff6bd6', nb: 3 });
    for (let k = 0; k < 4 + T; k++) { const y = ch.top + 4 + k * 3; c.strokeStyle = 'rgba(255,107,214,0.85)'; c.lineWidth = 1; c.beginPath(); c.ellipse(ch.x, y, ch.rx * 0.6, ch.ry * 0.6, 0, 0, Math.PI); c.stroke(); }
    fx.push({ k: 'glow', x: ch.x, y: ch.top, col: '255,107,214' }); fx.push({ k: 'beacon', x: ch.x, y: ch.top - 4, col: '#ff6bd6' });
    return 40 + T * 4;
  },
};
// construction scaffold drawn over a building under construction
export function scaffold(c, S, h, t) {
  const H = Math.max(18, h * 0.6); c.strokeStyle = 'rgba(240,190,60,0.95)'; c.lineWidth = 1;
  const corners = [[0.2, 0.2], [S - 0.2, 0.2], [S - 0.2, S - 0.2], [0.2, S - 0.2]];
  for (const [i, j] of corners) { const a = P(i, j, 0), b = P(i, j, H); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
  for (let z = 6; z <= H; z += 6) { c.beginPath(); corners.forEach(([i, j], k) => { const p = P(i, j, z); k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.closePath(); c.stroke(); }
  // crane
  const [cx, cy] = P(S - 0.3, 0.3, 0); lattice(c, cx, cy, 5, H + 26, '#e8b04a', 6); const sw = Math.sin(t * 0.4) * 0.4; const arm = 40; const ex = cx - Math.cos(sw) * arm, ey = cy - H - 26 + Math.sin(sw) * 6;
  c.strokeStyle = '#e8b04a'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx + 12, cy - H - 26); c.lineTo(ex, ey); c.stroke(); c.strokeStyle = '#333'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(ex + 6, ey); c.lineTo(ex + 6, ey + 18 + Math.sin(t * 1.3) * 4); c.stroke();
}
