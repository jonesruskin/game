// Procedural art: a white sprite atlas (tinted on the GPU) and painted festival backdrops.
// Zero image files — everything is drawn with Canvas2D at load time.
import { makeRng, TAU } from './util.js';

export function buildAtlas() {
  const S = 1024; const cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d');
  const uv = {}; let x = 0, y = 0, rowH = 0; const pad = 3;
  const add = (name, w, h, draw) => {
    if (x + w + pad > S) { x = 0; y += rowH + pad; rowH = 0; }
    c.save(); c.translate(x, y); c.beginPath(); c.rect(0, 0, w, h); c.clip(); c.fillStyle = '#fff'; c.strokeStyle = '#fff'; draw(c, w, h); c.restore();
    uv[name] = [(x + 0.5) / S, (y + 0.5) / S, (x + w - 0.5) / S, (y + h - 0.5) / S]; x += w + pad; rowH = Math.max(rowH, h);
  };
  const radial = (stops) => (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); for (const [o, a] of stops) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); };
  add('glow', 128, 128, radial([[0, 1], [0.12, 0.62], [0.32, 0.22], [0.6, 0.06], [1, 0]]));
  add('soft', 128, 128, radial([[0, 0.55], [0.4, 0.25], [0.75, 0.06], [1, 0]]));
  add('dot', 48, 48, radial([[0, 1], [0.38, 1], [0.55, 0.45], [0.8, 0.08], [1, 0]]));
  add('flare', 128, 128, (g, w, h) => {
    radial([[0, 0.9], [0.1, 0.4], [0.3, 0.05], [1, 0]])(g, w, h);
    for (const horiz of [true, false]) { const gr = horiz ? g.createLinearGradient(0, 0, w, 0) : g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; if (horiz) g.fillRect(0, h / 2 - 2, w, 4); else g.fillRect(w / 2 - 2, 0, 4, h); }
  });
  add('ring', 128, 128, (g, w, h) => { for (let i = 0; i < 6; i++) { g.globalAlpha = [0.08, 0.2, 0.5, 1, 0.5, 0.15][i]; g.lineWidth = [12, 8, 5, 2.4, 1.2, 16][i]; g.beginPath(); g.arc(w / 2, h / 2, w * 0.42, 0, TAU); g.stroke(); } });
  const smoke = (seed) => (g, w, h) => { const r = makeRng(seed); for (let i = 0; i < 26; i++) { const a = r() * TAU, d = r() * w * 0.22, rr = w * (0.12 + r() * 0.2); const cx = w / 2 + Math.cos(a) * d, cy = h / 2 + Math.sin(a) * d; const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr); gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } };
  add('smoke0', 128, 128, smoke(3)); add('smoke1', 128, 128, smoke(17)); add('smoke2', 128, 128, smoke(41));
  add('sphere', 128, 128, (g, w, h) => { const gr = g.createRadialGradient(w * 0.38, h * 0.34, w * 0.02, w / 2, h / 2, w * 0.48); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, '#e9e9e9'); gr.addColorStop(0.8, '#a9a9a9'); gr.addColorStop(1, '#8c8c8c'); g.fillStyle = gr; g.beginPath(); g.arc(w / 2, h / 2, w * 0.47, 0, TAU); g.fill(); });
  add('disc', 64, 64, (g, w, h) => { g.beginPath(); g.arc(w / 2, h / 2, w * 0.46, 0, TAU); g.fill(); });
  add('rim', 128, 128, (g, w, h) => { g.lineWidth = 7; g.beginPath(); g.arc(w / 2, h / 2, w * 0.43, 0, TAU); g.stroke(); });
  add('square', 16, 16, (g, w, h) => g.fillRect(1, 1, w - 2, h - 2));
  add('person', 28, 56, (g, w, h) => { g.beginPath(); g.arc(w / 2, 9, 7.5, 0, TAU); g.fill(); g.beginPath(); g.moveTo(2, h); g.quadraticCurveTo(1, 19, w / 2, 18); g.quadraticCurveTo(w - 1, 19, w - 2, h); g.fill(); });
  add('person_up', 28, 56, (g, w, h) => { g.beginPath(); g.arc(w / 2, 13, 7.5, 0, TAU); g.fill(); g.beginPath(); g.moveTo(3, h); g.quadraticCurveTo(2, 23, w / 2, 22); g.quadraticCurveTo(w - 2, 23, w - 3, h); g.fill(); g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(6, 26); g.lineTo(2, 4); g.moveTo(w - 6, 26); g.lineTo(w - 2, 4); g.stroke(); });
  add('mortar', 64, 96, (g, w, h) => { g.beginPath(); g.moveTo(16, 8); g.lineTo(48, 8); g.lineTo(44, 80); g.lineTo(20, 80); g.closePath(); g.fill(); g.fillRect(8, 78, 48, 14); g.globalCompositeOperation = 'destination-out'; g.fillRect(19, 22, 26, 4); g.fillRect(20, 44, 24, 4); });
  // shell glyphs (white strokes, 96px)
  const G = (draw) => (g, w, h) => { g.translate(w / 2, h / 2); g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 7; draw(g); };
  add('g_peony', 96, 96, G((g) => { g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 17, Math.sin(a) * 17); g.lineTo(Math.cos(a) * 28, Math.sin(a) * 28); g.stroke(); g.beginPath(); g.arc(Math.cos(a) * 37, Math.sin(a) * 37, 4.5, 0, TAU); g.fill(); } }));
  add('g_willow', 96, 96, G((g) => { g.beginPath(); g.arc(0, -24, 7, 0, TAU); g.fill(); for (const dx of [-30, -15, 0, 15, 30]) { g.beginPath(); g.moveTo(0, -24); g.quadraticCurveTo(dx * 1.2, -26, dx, 8 + Math.abs(dx) * 0.2); g.lineTo(dx * 0.92, 34 - Math.abs(dx) * 0.25); g.stroke(); } }));
  add('g_palm', 96, 96, G((g) => { g.beginPath(); g.arc(0, 30, 7, 0, TAU); g.fill(); for (const a of [-0.95, -0.48, 0, 0.48, 0.95]) { const ex = Math.sin(a) * 36, ey = 30 - Math.cos(a) * 58; g.beginPath(); g.moveTo(0, 30); g.quadraticCurveTo(ex * 0.4, ey * 0.7, ex, ey); g.stroke(); } }));
  add('g_crossette', 96, 96, G((g) => { g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill(); for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 14, Math.sin(a) * 14); g.lineTo(Math.cos(a) * 32, Math.sin(a) * 32); g.stroke(); const ex = Math.cos(a) * 38, ey = Math.sin(a) * 38; g.lineWidth = 4; for (const b of [-0.6, 0.6]) { g.beginPath(); g.moveTo(ex - Math.cos(a) * 6, ey - Math.sin(a) * 6); g.lineTo(ex + Math.cos(a + b) * 7, ey + Math.sin(a + b) * 7); g.stroke(); } g.lineWidth = 7; } }));
  add('g_crackle', 96, 96, G((g) => { const star = (x, y, r) => { for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; g.beginPath(); g.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); } }; g.lineWidth = 6; star(-14, -12, 15); star(18, -4, 11); star(-4, 20, 12); }));
  add('g_ring', 96, 96, G((g) => { g.lineWidth = 7; g.beginPath(); g.arc(0, 0, 32, 0, TAU); g.stroke(); g.lineWidth = 4; g.setLineDash([3, 9]); g.beginPath(); g.arc(0, 0, 17, 0, TAU); g.stroke(); g.setLineDash([]); }));
  add('g_glitter', 96, 96, G((g) => { const sp = (x, y, r) => { g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill(); }; sp(-6, -4, 30); sp(24, -24, 12); sp(22, 22, 9); }));
  add('g_strobe', 96, 96, G((g) => { g.beginPath(); g.moveTo(8, -38); g.lineTo(-18, 6); g.lineTo(0, 6); g.lineTo(-8, 38); g.lineTo(20, -8); g.lineTo(2, -8); g.closePath(); g.fill(); }));
  add('g_comet', 96, 96, G((g) => { g.beginPath(); g.arc(16, -16, 12, 0, TAU); g.fill(); for (const [o, l] of [[-9, 40], [0, 50], [9, 40]]) { g.beginPath(); g.moveTo(16 - 9 + o * 0.7, -16 + 9 + o * 0.7); g.lineTo(16 - l * 0.7 + o * 0.7, -16 + l * 0.7 + o * 0.7); g.stroke(); } }));
  add('g_spider', 96, 96, G((g) => { g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill(); g.lineWidth = 4.5; for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.26; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 42, Math.sin(a) * 42); g.stroke(); } }));
  add('g_crown', 96, 96, G((g) => { g.beginPath(); g.moveTo(-34, 22); g.lineTo(-38, -18); g.lineTo(-18, 2); g.lineTo(0, -30); g.lineTo(18, 2); g.lineTo(38, -18); g.lineTo(34, 22); g.closePath(); g.fill(); g.fillRect(-34, 26, 68, 8); }));
  add('g_fog', 96, 96, G((g) => { g.lineWidth = 9; g.beginPath(); g.arc(0, -10, 16, Math.PI * 1.1, Math.PI * 2.25); g.quadraticCurveTo(0, 2, 0, 14); g.stroke(); g.beginPath(); g.arc(0, 30, 5, 0, TAU); g.fill(); }));
  return { canvas: cv, uv };
}

// ------------------------------------------------------------------------------------------------ backdrops
export const THEMES = {
  theme_harbor: { sky: ['#060821', '#14113f', '#3a1d5e', '#a2406a'], haze: '#3b2a63', city: ['#1c1838', '#0d0b1f'], water: ['#0b0a22', '#03030b'], win: ['#ffd27a', '#ffb257', '#9fd8ff'], moon: [0.78, 0.14], wheel: true, lights: ['#ff6f91', '#ffd166', '#6be3ff', '#9cff8a'], tint: [0.75, 0.8, 1.1], amb: [0.02, 0.01, 0.05] },
  theme_lantern: { sky: ['#0c0414', '#2c0b2e', '#6a1a35', '#d65a3a'], haze: '#5a2032', city: ['#2a0f22', '#140612'], water: ['#16071a', '#050207'], win: ['#ffb347', '#ff7a45', '#ffd27a'], moon: [0.2, 0.16], pagoda: true, lights: ['#ff4d4d', '#ff9f43', '#ffd166'], tint: [1.1, 0.75, 0.7], amb: [0.04, 0.01, 0.01] },
  theme_dunes: { sky: ['#07051c', '#1d1446', '#4b2a6b', '#e08a5f'], haze: '#5b3b6e', city: ['#2b1d3f', '#150d22'], water: ['#0e0b26', '#04030c'], win: ['#ffd27a', '#ffc46b', '#ffe6a8'], moon: [0.7, 0.18], big: true, dunes: true, lights: ['#ffd166', '#ff9f68', '#fff0b3'], tint: [1, 0.85, 0.8], amb: [0.03, 0.015, 0.03] },
  theme_aurora: { sky: ['#020b16', '#05253a', '#0c4a52', '#2c8a78'], haze: '#11424c', city: ['#0b1e2a', '#050d14'], water: ['#03121b', '#010508'], win: ['#ffe2a1', '#ffd27a', '#b8f1ff'], moon: [0.25, 0.12], aurora: true, mountains: true, lights: ['#7cffcb', '#8fd3ff', '#ffe08a'], tint: [0.7, 1.1, 1.05], amb: [0.0, 0.03, 0.03] },
  theme_neon: { sky: ['#07021a', '#1d0640', '#4c0a66', '#ff2d95'], haze: '#3a0f5c', city: ['#170a33', '#08031a'], water: ['#0a0420', '#020108'], win: ['#ff4fd8', '#41e8ff', '#fff36b'], moon: [0.85, 0.12], neon: true, lights: ['#ff3cac', '#2bd2ff', '#fff36b', '#7cff6b'], tint: [1.05, 0.7, 1.15], amb: [0.04, 0.0, 0.05] },
};
// Paints sky + skyline + water. waterY = css-px y of the water line. Returns {color, mask} canvases (mask: white = open sky).
export function paintBackdrop(themeId, w, h, waterY, scale = 1) {
  const T = THEMES[themeId] || THEMES.theme_harbor; const r = makeRng(1337);
  const cv = document.createElement('canvas'); cv.width = Math.max(2, Math.round(w * scale)); cv.height = Math.max(2, Math.round(h * scale)); const g = cv.getContext('2d');
  const mk = document.createElement('canvas'); mk.width = Math.max(2, Math.round(w * scale * 0.25)); mk.height = Math.max(2, Math.round(h * scale * 0.25)); const m = mk.getContext('2d');
  g.scale(scale, scale); m.scale(scale * 0.25, scale * 0.25);
  const wy = waterY; const U = Math.min(w, h) / 100; // layout unit
  // sky
  let gr = g.createLinearGradient(0, 0, 0, wy); gr.addColorStop(0, T.sky[0]); gr.addColorStop(0.45, T.sky[1]); gr.addColorStop(0.8, T.sky[2]); gr.addColorStop(1, T.sky[3]); g.fillStyle = gr; g.fillRect(0, 0, w, wy + 2);
  // horizon glow
  gr = g.createRadialGradient(w * 0.5, wy, 0, w * 0.5, wy, Math.max(w, h) * 0.55); gr.addColorStop(0, hexA(T.sky[3], 0.45)); gr.addColorStop(1, hexA(T.sky[3], 0)); g.fillStyle = gr; g.fillRect(0, 0, w, wy);
  // stars
  for (let i = 0; i < (w * h) / 2600; i++) { const sx = r() * w, sy = r() * wy * 0.85; const a = r() * r() * 0.85; g.fillStyle = `rgba(255,255,255,${a})`; const s = r() < 0.06 ? 1.8 : 1.1; g.fillRect(sx, sy, s, s); }
  // aurora ribbons
  if (T.aurora) for (let k = 0; k < 3; k++) { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 90; i++) { const t = i / 89; const ax = t * w, ay = wy * (0.18 + k * 0.1) + Math.sin(t * 5 + k * 2) * wy * 0.06; const gr2 = g.createLinearGradient(ax, ay, ax, ay + wy * 0.3); gr2.addColorStop(0, `rgba(80,255,190,0)`); gr2.addColorStop(0.3, `rgba(80,255,190,${0.05 + k * 0.012})`); gr2.addColorStop(1, `rgba(120,140,255,0)`); g.fillStyle = gr2; g.fillRect(ax, ay, w / 80, wy * 0.3); } g.restore(); }
  // moon
  { const mx = w * T.moon[0], my = wy * T.moon[1] + U * 6, mr = U * (T.big ? 9 : 5.5); gr = g.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 5); gr.addColorStop(0, 'rgba(255,240,220,0.22)'); gr.addColorStop(1, 'rgba(255,240,220,0)'); g.fillStyle = gr; g.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10); g.fillStyle = '#fff4e2'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill(); g.fillStyle = 'rgba(200,190,220,0.35)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(mx + (r() - 0.5) * mr, my + (r() - 0.5) * mr, mr * (0.12 + r() * 0.15), 0, TAU); g.fill(); } }
  // mask: sky = white
  m.fillStyle = '#fff'; m.fillRect(0, 0, w, h); m.fillStyle = '#000';
  const sil = (fill, path) => { g.fillStyle = fill; g.beginPath(); path(g); g.fill(); m.beginPath(); path(m); m.fill(); };
  const base = wy;
  if (T.mountains) { sil(T.haze, (c) => { c.moveTo(0, base); for (let i = 0; i <= 12; i++) c.lineTo((i / 12) * w, base - U * (10 + 12 * Math.abs(Math.sin(i * 1.7 + 1)))); c.lineTo(w, base); c.closePath(); }); g.fillStyle = 'rgba(230,245,255,0.5)'; }
  if (T.dunes) { sil(T.haze, (c) => { c.moveTo(0, base); for (let i = 0; i <= 40; i++) { const t = i / 40; c.lineTo(t * w, base - U * (5 + 4 * Math.sin(t * 7) + 3 * Math.sin(t * 17 + 1))); } c.lineTo(w, base); c.closePath(); }); }
  // far city layer
  const layer = (color, hMin, hMax, wMin, wMax, winA, detail) => {
    let bx = -r() * 20;
    while (bx < w) {
      const bw = U * (wMin + r() * (wMax - wMin)); let bh = U * (hMin + r() * (hMax - hMin)); if (r() < 0.12) bh *= 1.6;
      const top = base - bh; const kind = r();
      sil(color, (c) => { if (T.pagoda && kind < 0.35) { c.moveTo(bx, base); c.lineTo(bx, top + bh * 0.25); c.lineTo(bx - bw * 0.15, top + bh * 0.25); c.quadraticCurveTo(bx + bw / 2, top - bh * 0.05, bx + bw * 1.15, top + bh * 0.25); c.lineTo(bx + bw, top + bh * 0.25); c.lineTo(bx + bw, base); c.closePath(); } else if (kind < 0.12) { c.moveTo(bx, base); c.lineTo(bx, top + bw * 0.4); c.arc(bx + bw / 2, top + bw * 0.4, bw / 2, Math.PI, 0); c.lineTo(bx + bw, base); c.closePath(); } else { c.rect(bx, top, bw, bh + 1); if (detail && kind > 0.8) c.rect(bx + bw * 0.45, top - U * 3, Math.max(1, U * 0.3), U * 3); } });
      if (winA > 0) { const cols = Math.max(1, Math.floor(bw / (U * 1.3))), rows = Math.floor(bh / (U * 1.5)); for (let i = 0; i < cols; i++) for (let j = 1; j < rows; j++) { if (r() < 0.6) continue; g.fillStyle = hexA(T.neon ? r.pick(T.win) : T.win[r() < 0.85 ? (r() < 0.6 ? 0 : 1) : 2], winA * (0.5 + r() * 0.5)); g.fillRect(bx + (i + 0.3) * (bw / cols), top + j * U * 1.5, Math.max(1, bw / cols * 0.4), U * 0.55); } }
      if (T.neon && r() < 0.5) { g.strokeStyle = hexA(r.pick(T.lights), 0.7); g.lineWidth = Math.max(1, U * 0.18); g.strokeRect(bx + 1, top + 1, bw - 2, bh); }
      bx += bw + U * r() * 0.8;
    }
  };
  layer(T.haze, 6, 13, 3, 7, 0.25, false);
  layer(T.city[0], 4, 10, 3.5, 8, 0.7, true);
  // ferris wheel
  if (T.wheel) { const cx = w * 0.14, rad = U * 9, cy = base - rad - U * 1.5; g.strokeStyle = T.city[1]; g.lineWidth = U * 0.45; g.beginPath(); g.arc(cx, cy, rad, 0, TAU); g.stroke(); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); g.stroke(); g.fillStyle = T.lights[i % T.lights.length]; g.beginPath(); g.arc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, U * 0.55, 0, TAU); g.fill(); } g.fillStyle = T.city[1]; g.beginPath(); g.moveTo(cx - U * 4, base); g.lineTo(cx, cy); g.lineTo(cx + U * 4, base); g.closePath(); g.fill(); m.beginPath(); m.arc(cx, cy, rad, 0, TAU); m.fill(); }
  // promenade / near silhouettes
  layer(T.city[1], 1.5, 4, 4, 10, 0.9, false);
  // string lights along the promenade
  { const yy = base - U * 2.2; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1; for (let seg = 0; seg < 7; seg++) { const x0 = (seg / 7) * w, x1 = ((seg + 1) / 7) * w; g.beginPath(); g.moveTo(x0, yy); g.quadraticCurveTo((x0 + x1) / 2, yy + U * 1.4, x1, yy); g.stroke(); for (let i = 1; i < 9; i++) { const t = i / 9; const lx = x0 + (x1 - x0) * t, ly = yy + U * 1.4 * 2 * t * (1 - t) * 0.98; const col = T.lights[(seg * 9 + i) % T.lights.length]; gr = g.createRadialGradient(lx, ly, 0, lx, ly, U * 1.3); gr.addColorStop(0, hexA(col, 0.9)); gr.addColorStop(1, hexA(col, 0)); g.fillStyle = gr; g.fillRect(lx - U * 1.3, ly - U * 1.3, U * 2.6, U * 2.6); } } }
  // water
  gr = g.createLinearGradient(0, base, 0, h); gr.addColorStop(0, T.water[0]); gr.addColorStop(1, T.water[1]); g.fillStyle = gr; g.fillRect(0, base, w, h - base); m.fillRect(0, base, w, h - base);
  g.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 60; i++) { const yy = base + (h - base) * r() ** 1.5, xx = r() * w; g.fillRect(xx, yy, U * (2 + r() * 6), 1); }
  return { color: cv, mask: mk, theme: T };
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
