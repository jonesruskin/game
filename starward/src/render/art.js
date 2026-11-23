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
