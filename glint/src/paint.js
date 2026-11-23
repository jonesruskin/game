// GLINT: procedural painting of the two rooms (the cutting bench and the shop) in an Art Deco palette.
// Everything is drawn with Canvas2D at load / resize; the renderer uses it as the background texture.
import { rng, noise2, clamp } from './math.js';

const N = noise2(7);
const lg = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const rg = (c, x, y, r0, r1, stops) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const GOLD = '#d6b06a', GOLD2 = '#8a6a34';

// deco fan wallpaper
function wallpaper(c, x, y, w, h, base, line, scale) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.fillStyle = base; c.fillRect(x, y, w, h);
  const s = scale; c.strokeStyle = line; c.lineWidth = Math.max(1, s * 0.035);
  for (let row = -1; row * s * 0.5 < h + s; row++) for (let col = -1; col * s < w + s; col++) {
    const cx = x + col * s + (row % 2 ? s / 2 : 0), cy = y + row * s * 0.5;
    c.beginPath(); c.arc(cx, cy + s * 0.5, s * 0.5, Math.PI, 0); c.stroke();
    c.beginPath(); c.arc(cx, cy + s * 0.5, s * 0.32, Math.PI, 0); c.stroke();
    for (let k = 1; k < 6; k++) { const a = Math.PI + (k / 6) * Math.PI; c.beginPath(); c.moveTo(cx + Math.cos(a) * s * 0.32, cy + s * 0.5 + Math.sin(a) * s * 0.32); c.lineTo(cx + Math.cos(a) * s * 0.5, cy + s * 0.5 + Math.sin(a) * s * 0.5); c.stroke(); }
  }
  c.restore();
}
function woodPlank(c, x, y, w, h, vpx, vpy, tone) {
  // perspective planks converging on a vanishing point
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = lg(c, 0, y, 0, y + h, [[0, tone[0]], [1, tone[1]]]); c.fillRect(x, y, w, h);
  const R = rng(3); const n = 28;
  for (let i = -n; i <= n * 2; i++) { const bx = x + (i / n) * w; c.strokeStyle = `rgba(0,0,0,${0.18 + R() * 0.12})`; c.lineWidth = 1.2; c.beginPath(); c.moveTo(bx, y + h); const t = (y - vpy) / (y + h - vpy); c.lineTo(vpx + (bx - vpx) * t, y); c.stroke(); }
  // grain
  for (let k = 0; k < 900; k++) { const gy = y + R() * h, gx = x + R() * w; const t = (gy - vpy) / (y + h - vpy); const len = 20 + R() * 120 * t; c.strokeStyle = `rgba(${R() < 0.5 ? '30,14,6' : '120,70,35'},${0.05 + R() * 0.08})`; c.lineWidth = 0.6 + R() * 1.2 * t; c.beginPath(); const dx = (gx - vpx) / (gy - vpy + 1e-3); c.moveTo(gx, gy); c.lineTo(gx + dx * len * 0.3, gy + len * 0.3 * Math.sign(dx || 1) * 0 + len * 0.02); c.stroke(); }
  c.restore();
}
function vignette(c, W, H, a = 0.55) { c.fillStyle = rg(c, W / 2, H * 0.48, Math.min(W, H) * 0.35, Math.max(W, H) * 0.8, [[0, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${a})`]]); c.fillRect(0, 0, W, H); }

// ---------------- the bench ----------------
// L: { W, H, gx, gy, gr } gem centre/radius (css px), port: portrait layout
export function paintBench(L, k = 1) {
  const W = Math.round(L.W * k), H = Math.round(L.H * k); const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'); c.scale(k, k);
  const w = L.W, h = L.H, gx = L.gx, gy = L.gy, gr = L.gr; const hz = Math.min(h * 0.66, gy + gr * 0.62);
  const ax0 = L.port ? 0 : L.side || 0, ax1 = L.port ? w : w - (L.panel || 0), aw = ax1 - ax0;
  // wall
  wallpaper(c, 0, 0, w, hz, '#10231f', 'rgba(214,176,106,0.10)', Math.max(46, w / 22));
  c.fillStyle = lg(c, 0, 0, 0, hz, [[0, 'rgba(0,0,0,0.55)'], [0.7, 'rgba(0,0,0,0.15)'], [1, 'rgba(0,0,0,0.35)']]); c.fillRect(0, 0, w, hz);
  // window with night rain, right side
  const ww = Math.min(aw * 0.17, 220), wx = ax1 - ww - aw * 0.05, wy = hz * 0.1, wh = hz * 0.66;
  if (!L.port) {
    c.save(); c.beginPath(); c.moveTo(wx, wy + wh); c.lineTo(wx, wy + ww / 2); c.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); c.lineTo(wx + ww, wy + wh); c.closePath(); c.clip();
    c.fillStyle = lg(c, 0, wy, 0, wy + wh, [[0, '#0d1a33'], [0.6, '#1c2c4c'], [1, '#3a3350']]); c.fillRect(wx, wy, ww, wh);
    const R = rng(11); for (let i = 0; i < 26; i++) { const bx = wx + R() * ww, bw = 6 + R() * 22, bh = wh * (0.15 + R() * 0.5); c.fillStyle = `rgba(10,12,24,0.9)`; c.fillRect(bx, wy + wh - bh, bw, bh); for (let j = 0; j < 6; j++) if (R() < 0.5) { c.fillStyle = `rgba(255,${190 + R() * 50},${110 + R() * 60},${0.4 + R() * 0.5})`; c.fillRect(bx + 2 + R() * (bw - 5), wy + wh - bh + 4 + R() * (bh - 8), 2, 3); } }
    c.fillStyle = 'rgba(160,190,255,0.06)'; c.fillRect(wx, wy, ww, wh); c.restore();
    c.strokeStyle = GOLD2; c.lineWidth = 5; c.beginPath(); c.moveTo(wx, wy + wh); c.lineTo(wx, wy + ww / 2); c.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); c.lineTo(wx + ww, wy + wh); c.stroke();
    c.lineWidth = 2.5; c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.moveTo(wx, wy + wh * 0.55); c.lineTo(wx + ww, wy + wh * 0.55); c.stroke();
    L.window = { x: wx, y: wy, w: ww, h: wh };
  }
  // shelf with jars + certificates on the left wall
  if (!L.port) {
    const sx = ax0 + aw * 0.04, sy = hz * 0.5, sw = Math.min(aw * 0.24, 300);
    c.fillStyle = '#2a1a10'; c.fillRect(sx, sy, sw, 9); c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(sx, sy + 9, sw, 6);
    const R = rng(4); let x = sx + 8; const jarCols = ['#6a2a6a', '#2a5a7a', '#7a5a1a', '#2a6a4a', '#7a2a2a'];
    while (x < sx + sw - 30) { const jw = 22 + R() * 18, jh = 30 + R() * 34; c.fillStyle = 'rgba(200,220,255,0.10)'; c.fillRect(x, sy - jh, jw, jh); c.fillStyle = jarCols[Math.floor(R() * jarCols.length)]; c.globalAlpha = 0.5; c.fillRect(x + 3, sy - jh * 0.55, jw - 6, jh * 0.55 - 2); c.globalAlpha = 1; c.fillStyle = '#3a2a1a'; c.fillRect(x - 1, sy - jh - 5, jw + 2, 6); c.strokeStyle = 'rgba(255,255,255,0.12)'; c.strokeRect(x, sy - jh, jw, jh); x += jw + 8 + R() * 10; }
    // framed certificate
    const fx = sx + sw * 0.22, fy = hz * 0.16, fw = sw * 0.5, fh = fw * 0.7; c.fillStyle = GOLD2; c.fillRect(fx - 6, fy - 6, fw + 12, fh + 12); c.fillStyle = '#e9dcc0'; c.fillRect(fx, fy, fw, fh); c.fillStyle = 'rgba(80,50,20,0.5)'; for (let i = 0; i < 6; i++) c.fillRect(fx + fw * 0.15, fy + fh * (0.25 + i * 0.1), fw * (0.7 - (i % 2) * 0.2), 2); c.fillStyle = '#9a2a2a'; c.beginPath(); c.arc(fx + fw * 0.8, fy + fh * 0.78, fw * 0.08, 0, 7); c.fill();
  }
  // bench top (walnut), perspective
  woodPlank(c, 0, hz, w, h - hz, w / 2, hz - h * 1.6, ['#3a2214', '#1a0d07']);
  c.fillStyle = lg(c, 0, hz, 0, hz + 18, [[0, 'rgba(255,220,170,0.18)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, hz, w, 18);
  c.fillStyle = '#120804'; c.fillRect(0, hz - 3, w, 4);
  // velvet pad under the stone
  const py = gy + gr * 0.86; c.save(); c.translate(gx, py); c.scale(1, 0.26);
  c.fillStyle = 'rgba(0,0,0,0.5)'; c.beginPath(); c.arc(0, 18, gr * 1.18, 0, 7); c.fill();
  c.fillStyle = rg(c, 0, 0, 0, gr * 1.12, [[0, '#4a1020'], [0.7, '#300812'], [1, '#1a040a']]); c.beginPath(); c.arc(0, 0, gr * 1.12, 0, 7); c.fill();
  c.strokeStyle = 'rgba(214,176,106,0.5)'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, gr * 1.04, 0, 7); c.stroke(); c.strokeStyle = 'rgba(214,176,106,0.18)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, gr * 0.96, 0, 7); c.stroke(); c.restore();
  // tools: hammer + tweezers + loupe on the bench (left), drawn as silhouettes with brass highlights
  if (!L.port) {
    const tx = ax0 + aw * 0.06, ty = hz + (h - hz) * 0.5;
    c.save(); c.translate(tx, ty); c.rotate(-0.35); c.fillStyle = '#2a1608'; c.fillRect(-10, -6, 150, 12); c.fillStyle = '#5a5a62'; c.fillRect(120, -24, 34, 48); c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(122, -22, 30, 6); c.restore();
    c.save(); c.translate(ax0 + aw * 0.08, hz + (h - hz) * 0.85); c.rotate(0.12); c.strokeStyle = '#9a9aa6'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(120, -6); c.moveTo(0, 0); c.lineTo(120, 6); c.stroke(); c.restore();
    c.save(); c.translate(ax1 - aw * 0.12, hz + (h - hz) * 0.62); c.strokeStyle = GOLD; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 26, 0, 7); c.stroke(); c.fillStyle = 'rgba(160,200,255,0.12)'; c.fill(); c.strokeStyle = '#2a1608'; c.lineWidth = 9; c.beginPath(); c.moveTo(18, 18); c.lineTo(70, 60); c.stroke(); c.restore();
  }
  // warm lamp pool on wall + bench
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = rg(c, gx, gy - gr * 0.2, gr * 0.2, Math.max(w, h) * 0.55, [[0, 'rgba(255,190,120,0.24)'], [0.45, 'rgba(255,160,90,0.08)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-over';
  // lamp (brass arm from top-left)
  const lx = gx - gr * 1.25, ly = Math.max((L.top || 64) + 30, gy - gr * 1.85);
  c.strokeStyle = GOLD2; c.lineWidth = 7; c.beginPath(); c.moveTo(ax0 - 10, ly - 90); c.lineTo(lx - gr * 0.55, ly - 50); c.lineTo(lx, ly); c.stroke(); c.fillStyle = GOLD2; c.beginPath(); c.arc(lx - gr * 0.55, ly - 50, 6, 0, 7); c.fill();
  c.fillStyle = lg(c, lx - 50, ly, lx + 50, ly, [[0, '#5a4220'], [0.5, '#c8a060'], [1, '#4a3418']]); c.beginPath(); c.moveTo(lx - 46, ly + 30); c.lineTo(lx - 18, ly - 8); c.lineTo(lx + 18, ly - 8); c.lineTo(lx + 46, ly + 30); c.closePath(); c.fill();
  c.fillStyle = rg(c, lx, ly + 30, 2, 50, [[0, 'rgba(255,240,200,1)'], [0.3, 'rgba(255,200,120,0.6)'], [1, 'rgba(255,180,90,0)']]); c.beginPath(); c.ellipse(lx, ly + 30, 46, 10, 0, 0, 7); c.fill();
  vignette(c, w, h, 0.6);
  L.hz = hz;
  return cv;
}

// ---------------- the shop ----------------
const SHOP_THEMES = [
  { wall: '#4a3a2a', line: 'rgba(255,230,190,0.07)', floor: ['#4b3420', '#22160b'], trim: '#8b6a34', light: 'rgba(255,200,130,0.24)', awning: true, bulbs: true },
  { wall: '#1b2a24', line: 'rgba(214,176,106,0.09)', floor: ['#3a2416', '#1b0f08'], trim: '#7a5a2a', light: 'rgba(255,200,140,0.2)' },
  { wall: '#13261f', line: 'rgba(214,176,106,0.14)', floor: ['#ddd2bd', '#6e6455'], trim: '#b08a46', light: 'rgba(255,220,170,0.18)', checker: true },
  { wall: '#1e1a2a', line: 'rgba(214,176,106,0.16)', floor: ['#e9e2d4', '#7c7466'], trim: '#c9a35a', light: 'rgba(255,230,190,0.2)', checker: true, chandelier: true },
  { wall: '#22101a', line: 'rgba(240,200,120,0.2)', floor: ['#f0e6d0', '#8a7a5a'], trim: '#e0b860', light: 'rgba(255,230,180,0.24)', checker: true, chandelier: true, mirrors: true },
];
// returns { canvas, cases:[{x,y,w,h,gx,gy,gr}], door, counter, floorY }
export function paintShop(L, tier, k = 1) {
  const W = Math.round(L.W * k), H = Math.round(L.H * k); const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'); c.scale(k, k);
  const w = L.W, h = L.H, T = SHOP_THEMES[tier]; const top = L.top || 0, bot = L.bot || 0; const fy = top + (h - top - bot) * (L.port ? 0.5 : 0.56);
  wallpaper(c, 0, 0, w, fy, T.wall, T.line, Math.max(40, w / 24));
  c.fillStyle = lg(c, 0, 0, 0, fy, [[0, 'rgba(0,0,0,0.5)'], [1, 'rgba(0,0,0,0.1)']]); c.fillRect(0, 0, w, fy);
  // wainscot
  c.fillStyle = T.trim; c.fillRect(0, fy - (h * 0.12), w, 4); c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, fy - h * 0.12 + 4, w, h * 0.12 - 4);
  for (let x = 20; x < w; x += 90) { c.strokeStyle = 'rgba(214,176,106,0.18)'; c.lineWidth = 1.5; c.strokeRect(x, fy - h * 0.1, 70, h * 0.08); }
  // floor
  if (T.checker) {
    c.save(); c.beginPath(); c.rect(0, fy, w, h - fy); c.clip(); c.fillStyle = T.floor[1]; c.fillRect(0, fy, w, h - fy);
    const vpx = w / 2, vpy = fy - h * 1.1; const rows = 12, cols = 18;
    for (let r = 0; r < rows; r++) { const y0 = fy + (h - fy) * Math.pow(r / rows, 1.6), y1 = fy + (h - fy) * Math.pow((r + 1) / rows, 1.6);
      for (let q = -cols; q < cols * 2; q++) { if ((q + r) % 2) continue; const x0 = (q / cols) * w, x1 = ((q + 1) / cols) * w; const t0 = (y0 - vpy) / (h - vpy), t1 = (y1 - vpy) / (h - vpy);
        c.fillStyle = T.floor[0]; c.globalAlpha = 0.85; c.beginPath(); c.moveTo(vpx + (x0 - vpx) * t0, y0); c.lineTo(vpx + (x1 - vpx) * t0, y0); c.lineTo(vpx + (x1 - vpx) * t1, y1); c.lineTo(vpx + (x0 - vpx) * t1, y1); c.fill(); } }
    c.globalAlpha = 1; c.fillStyle = lg(c, 0, fy, 0, h, [[0, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0.1)']]); c.fillRect(0, fy, w, h - fy); c.restore();
  } else woodPlank(c, 0, fy, w, h - fy, w / 2, fy - h * 1.4, T.floor);
  // door (left) & window (right)
  const dw = Math.min(w * 0.12, 150), dh = (fy - top) * 0.78, dx = w * 0.035, dy = fy - dh;
  if (!L.port) {
    c.fillStyle = '#1a0f08'; c.fillRect(dx - 8, dy - 8, dw + 16, dh + 8); c.fillStyle = lg(c, dx, dy, dx + dw, dy, [[0, '#2c1a0c'], [1, '#3e2612']]); c.fillRect(dx, dy, dw, dh);
    c.fillStyle = lg(c, 0, dy, 0, dy + dh * 0.55, [[0, '#24365a'], [1, '#5a5070']]); c.fillRect(dx + dw * 0.14, dy + dh * 0.08, dw * 0.72, dh * 0.5);
    c.fillStyle = 'rgba(255,220,150,0.08)'; c.fillRect(dx + dw * 0.14, dy + dh * 0.08, dw * 0.72, dh * 0.5);
    c.fillStyle = GOLD; c.beginPath(); c.arc(dx + dw * 0.82, dy + dh * 0.62, 5, 0, 7); c.fill();
    c.fillStyle = GOLD; c.beginPath(); c.arc(dx + dw / 2, dy - 22, 9, Math.PI, 0); c.fill(); c.fillRect(dx + dw / 2 - 1, dy - 34, 2, 12); // bell
    const wx = w * 0.74, wy = top + (fy - top) * 0.12, wwid = w * 0.22, wht = (fy - top) * 0.6;
    c.fillStyle = lg(c, 0, wy, 0, wy + wht, [[0, '#2a3d63'], [0.7, '#4a4a6a'], [1, '#6a5a6a']]); c.fillRect(wx, wy, wwid, wht);
    const R = rng(21); for (let i = 0; i < 14; i++) { const bx = wx + R() * wwid, bw = 14 + R() * 30, bh = wht * (0.3 + R() * 0.5); c.fillStyle = 'rgba(20,22,36,0.85)'; c.fillRect(bx, wy + wht - bh, bw, bh); }
    c.fillStyle = 'rgba(255,230,180,0.07)'; c.fillRect(wx, wy, wwid, wht);
    c.strokeStyle = T.trim; c.lineWidth = 6; c.strokeRect(wx, wy, wwid, wht); c.lineWidth = 3; c.beginPath(); c.moveTo(wx + wwid / 2, wy); c.lineTo(wx + wwid / 2, wy + wht); c.stroke();
    // gilt lettering on the window
    c.save(); c.font = `${Math.round(wwid * 0.11)}px Limelight, serif`; c.textAlign = 'center'; c.fillStyle = 'rgba(230,190,110,0.85)'; c.fillText('GLINT & CO.', wx + wwid / 2, wy + wht * 0.3); c.font = `${Math.round(wwid * 0.05)}px Jost, sans-serif`; c.fillText('LAPIDARY · JEWELLER', wx + wwid / 2, wy + wht * 0.4); c.restore();
    L.window = { x: wx, y: wy, w: wwid, h: wht }; L.door = { x: dx, y: dy, w: dw, h: dh };
  }
  if (T.awning) { const ah = Math.max(40, (fy - top) * 0.16); for (let i = 0; i * 60 < w; i++) { c.fillStyle = i % 2 ? '#7a1f2a' : '#e8d9b8'; c.beginPath(); c.moveTo(i * 60, top); c.lineTo(i * 60 + 60, top); c.lineTo(i * 60 + 60, top + ah); c.quadraticCurveTo(i * 60 + 30, top + ah + 16, i * 60, top + ah); c.fill(); } c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, top + ah, w, 8); }
  if (T.chandelier) { const cx = w / 2, cy = top + 10; c.strokeStyle = GOLD2; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, top); c.lineTo(cx, cy + 30); c.stroke(); for (let i = 0; i < 7; i++) { const a = (i / 6) * Math.PI; const x = cx + Math.cos(a) * 70, y = cy + 40 + Math.sin(a) * 18; c.fillStyle = 'rgba(255,240,210,0.9)'; c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); for (let j = 0; j < 3; j++) { c.fillStyle = 'rgba(220,235,255,0.35)'; c.beginPath(); c.arc(x, y + 8 + j * 7, 2.4, 0, 7); c.fill(); } } c.globalCompositeOperation = 'lighter'; c.fillStyle = rg(c, cx, cy + 40, 5, 260, [[0, 'rgba(255,230,180,0.35)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(cx - 300, top, 600, 400); c.globalCompositeOperation = 'source-over'; }
  if (T.mirrors) for (const mx of [w * 0.22, w * 0.62]) { c.fillStyle = lg(c, mx, 0, mx + w * 0.1, 0, [[0, 'rgba(255,255,255,0.05)'], [0.5, 'rgba(255,255,255,0.14)'], [1, 'rgba(255,255,255,0.04)']]); c.fillRect(mx, top + (fy - top) * 0.15, w * 0.1, (fy - top) * 0.55); c.strokeStyle = GOLD; c.lineWidth = 4; c.strokeRect(mx, top + (fy - top) * 0.15, w * 0.1, (fy - top) * 0.55); }
  // wall dressing: gilded name plaque, sconces, framed deco posters, a rug
  const vx0 = L.port ? 0 : (L.side || 0), vx1 = L.port ? w : w - (L.panelW || 0), vcx = (vx0 + vx1) / 2;
  { const pw = Math.min(360, (vx1 - vx0) * 0.42), ph = pw * 0.2, px = vcx - pw / 2, py = top + (fy - top) * (T.awning ? 0.3 : 0.14);
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(px + 4, py + 6, pw, ph); c.fillStyle = lg(c, 0, py, 0, py + ph, [[0, '#2a1a0e'], [1, '#140a05']]); c.fillRect(px, py, pw, ph);
    c.strokeStyle = GOLD; c.lineWidth = 2; c.strokeRect(px + 4, py + 4, pw - 8, ph - 8); c.font = `${Math.round(ph * 0.5)}px Limelight, serif`; c.textAlign = 'center'; c.fillStyle = lg(c, 0, py, 0, py + ph, [[0, '#fff1c8'], [0.5, '#d6b06a'], [1, '#8a6a34']]); c.fillText('GLINT & CO.', vcx, py + ph * 0.68);
    for (const sx of [px - 40, px + pw + 40]) { c.fillStyle = GOLD2; c.fillRect(sx - 3, py + ph * 0.3, 6, ph * 0.9); c.fillStyle = '#f6dca0'; c.beginPath(); c.moveTo(sx - 12, py + ph * 0.3); c.lineTo(sx + 12, py + ph * 0.3); c.lineTo(sx + 7, py - ph * 0.2); c.lineTo(sx - 7, py - ph * 0.2); c.fill();
      c.globalCompositeOperation = 'lighter'; c.fillStyle = rg(c, sx, py, 4, 160, [[0, 'rgba(255,210,140,0.45)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(sx - 170, py - 170, 340, 340); c.globalCompositeOperation = 'source-over'; } }
  if (!L.port) for (const [k, col] of [[0.16, '#6fb6ff'], [0.84, '#ff6f8a']]) { const fx2 = vx0 + (vx1 - vx0) * k - 34, fy2 = top + (fy - top) * 0.42, fw2 = 68, fh2 = 92; c.fillStyle = GOLD2; c.fillRect(fx2 - 5, fy2 - 5, fw2 + 10, fh2 + 10); c.fillStyle = '#efe2c4'; c.fillRect(fx2, fy2, fw2, fh2); c.fillStyle = col; c.beginPath(); const gx2 = fx2 + fw2 / 2, gy2 = fy2 + fh2 * 0.42; c.moveTo(gx2 - 18, gy2 - 8); c.lineTo(gx2 + 18, gy2 - 8); c.lineTo(gx2 + 24, gy2); c.lineTo(gx2, gy2 + 26); c.lineTo(gx2 - 24, gy2); c.closePath(); c.fill(); c.fillStyle = '#3a2410'; c.fillRect(fx2 + 12, fy2 + fh2 * 0.8, fw2 - 24, 3); c.fillRect(fx2 + 18, fy2 + fh2 * 0.87, fw2 - 36, 2); }
  if (T.bulbs) { c.strokeStyle = '#2a1a10'; c.lineWidth = 1.5; const by = top + Math.max(40, (fy - top) * 0.16) + 14; c.beginPath(); for (let x = 0; x <= w; x += 8) c.lineTo(x, by + Math.sin((x / w) * Math.PI * 6) * 8 + 8); c.stroke();
    for (let x = 20; x < w; x += 46) { const yy = by + Math.sin((x / w) * Math.PI * 6) * 8 + 12; c.globalCompositeOperation = 'lighter'; c.fillStyle = rg(c, x, yy, 1, 26, [[0, 'rgba(255,220,150,0.7)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(x - 26, yy - 26, 52, 52); c.globalCompositeOperation = 'source-over'; c.fillStyle = '#fff2c8'; c.beginPath(); c.arc(x, yy, 3.2, 0, 7); c.fill(); } }
  if (tier >= 1) { c.save(); c.translate(vcx, fy + (h - fy) * 0.45); c.scale(1, 0.22); const rr = (vx1 - vx0) * 0.36; c.fillStyle = tier >= 3 ? '#3a1a2a' : '#5a1a1a'; c.beginPath(); c.arc(0, 0, rr, 0, 7); c.fill(); c.strokeStyle = GOLD; c.lineWidth = 8; c.beginPath(); c.arc(0, 0, rr * 0.9, 0, 7); c.stroke(); c.lineWidth = 3; c.beginPath(); c.arc(0, 0, rr * 0.7, 0, 7); c.stroke(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(a) * rr * 0.2, Math.sin(a) * rr * 0.2); c.lineTo(Math.cos(a) * rr * 0.68, Math.sin(a) * rr * 0.68); c.stroke(); } c.restore(); }
  // display cases: one or two rows along the back of the floor
  const n = L.cases; const rows = n > 6 ? 2 : 1; const per = Math.ceil(n / rows); const areaX0 = L.port ? w * 0.04 : vx0 + (vx1 - vx0) * 0.08, areaX1 = L.port ? w * 0.96 : vx1 - (vx1 - vx0) * 0.08;
  const cw = Math.min(190, ((areaX1 - areaX0) / per) * 0.84), ch = cw * 0.86; const cases = [];
  for (let r = 0; r < rows; r++) { const cnt = r === rows - 1 ? n - per * (rows - 1) : per; const yy = fy - ch * 0.62 + r * (ch * 0.9); const sc = 1 + r * 0.12; const cwr = cw * sc, chr = ch * sc;
    for (let i = 0; i < cnt; i++) { const x = areaX0 + ((i + 0.5) / per) * (areaX1 - areaX0) - cwr / 2; const y = yy;
      // cabinet base
      c.fillStyle = lg(c, x, y + chr * 0.55, x, y + chr, [[0, '#3a2412'], [1, '#160b05']]); c.fillRect(x, y + chr * 0.55, cwr, chr * 0.45);
      c.strokeStyle = T.trim; c.lineWidth = 2; c.strokeRect(x + 4, y + chr * 0.6, cwr - 8, chr * 0.34);
      // glass box
      c.fillStyle = 'rgba(180,210,240,0.06)'; c.fillRect(x, y, cwr, chr * 0.55); c.strokeStyle = 'rgba(214,176,106,0.7)'; c.lineWidth = 2; c.strokeRect(x, y, cwr, chr * 0.55);
      // velvet cushion
      c.fillStyle = rg(c, x + cwr / 2, y + chr * 0.44, 2, cwr * 0.4, [[0, '#5a1424'], [1, '#2a0810']]); c.beginPath(); c.ellipse(x + cwr / 2, y + chr * 0.46, cwr * 0.34, chr * 0.08, 0, 0, 7); c.fill();
      c.globalCompositeOperation = 'lighter'; c.fillStyle = rg(c, x + cwr / 2, y + chr * 0.3, 2, cwr * 0.55, [[0, T.light], [1, 'rgba(0,0,0,0)']]); c.fillRect(x - cwr * 0.2, y - chr * 0.2, cwr * 1.4, chr); c.globalCompositeOperation = 'source-over';
      cases.push({ x, y, w: cwr, h: chr, gx: x + cwr / 2, gy: y + chr * 0.3, gr: cwr * 0.3 });
    } }
  // counter + till (right front)
  if (!L.port) { const kx = w * 0.76, ky = fy + (h - fy) * 0.18, kw = w * 0.2, kh = (h - fy) * 0.32; c.fillStyle = lg(c, 0, ky, 0, ky + kh, [[0, '#4a2c16'], [1, '#1d0f06']]); c.fillRect(kx, ky, kw, kh); c.fillStyle = T.trim; c.fillRect(kx - 6, ky - 8, kw + 12, 10);
    c.fillStyle = '#2a2a30'; c.fillRect(kx + kw * 0.55, ky - 48, kw * 0.32, 40); c.fillStyle = GOLD; c.fillRect(kx + kw * 0.55, ky - 52, kw * 0.32, 6); c.fillStyle = '#d9d0b0'; c.fillRect(kx + kw * 0.6, ky - 40, kw * 0.22, 12); L.counter = { x: kx, y: ky, w: kw, h: kh }; }
  vignette(c, w, h, 0.45);
  L.floorY = fy; L.caseRects = cases;
  return cv;
}
