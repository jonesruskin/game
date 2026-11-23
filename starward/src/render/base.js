// STARWARD: the base view. A living isometric spaceport: cached ground and building sprites, animated
// effects, a day/night cycle synced to the player's local time, construction scaffolds, picking and camera.
import { P, TW, TH, poly, diamond, shade, rgba } from './iso.js';
import { ART, scaffold, tierOf } from './art.js';
import { LAYOUTS } from '../data/layouts.js';
import { BUILDINGS } from '../data/buildings.js';
import { rng, clamp, smooth, fmtTime } from '../util.js';

const HMAX = 210, PADX = 40;
const mixHex = (a, b, k) => { const pa = a.match(/\w\w/g).map((x) => parseInt(x, 16)), pb = b.match(/\w\w/g).map((x) => parseInt(x, 16)); return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
// how each world dresses the colony plan. p = terraforming progress (Mars greens and blues as it advances)
const THEMES = {
  moon: () => ({ ground: ['#5b5955', '#7a7873', '#6a6864'], speck: ['rgba(30,30,32,0.16)', 'rgba(200,198,190,0.12)'], crater: ['rgba(25,25,28,0.35)', 'rgba(60,60,62,0.6)', 'rgba(220,218,210,0.35)'], craters: 46, track: 'rgba(190,188,180,0.35)', rock: '#4e4c49', rockHi: 'rgba(210,208,200,0.4)', lot: 'rgba(150,148,142,0.85)', locked: ['rgba(40,40,50,0.35)', 'rgba(40,40,50,0.14)'], sky: 'space', obj: 'earth', day: 0.7, tint: 'rgba(205,205,215,1)' }),
  mars: (p) => ({ ground: [mixHex('#8a3f22', '#5f6a3a', p), mixHex('#a8532f', '#6f7d44', p), mixHex('#93452a', '#647040', p)], speck: ['rgba(60,20,10,0.18)', 'rgba(230,170,120,0.12)'], crater: ['rgba(60,22,10,0.3)', 'rgba(120,50,25,0.5)', 'rgba(240,180,140,0.3)'], craters: 22, track: 'rgba(230,170,130,0.32)', rock: '#6b2f1a', rockHi: 'rgba(240,190,150,0.35)', lot: 'rgba(170,150,140,0.85)', locked: ['rgba(60,25,15,0.35)', 'rgba(60,25,15,0.14)'], sky: 'mars', obj: 'phobos', day: null, veg: p, water: p > 0.6 ? (p - 0.6) * 2.5 : 0 }),
  ceres: () => ({ ground: ['#3c3a37', '#4d4a46', '#43403c'], speck: ['rgba(20,20,20,0.2)', 'rgba(170,165,155,0.1)'], crater: ['rgba(15,15,15,0.4)', 'rgba(45,43,40,0.6)', 'rgba(200,195,185,0.28)'], craters: 60, track: 'rgba(150,145,135,0.3)', rock: '#2f2d2a', rockHi: 'rgba(190,185,175,0.35)', lot: 'rgba(130,128,124,0.85)', locked: ['rgba(20,20,26,0.4)', 'rgba(20,20,26,0.16)'], sky: 'space', obj: 'sun', salt: true, day: 0.58, tint: 'rgba(190,190,200,1)' }),
  titan: () => ({ ground: ['#7a5a36', '#8e6a40', '#7d5c37'], speck: ['rgba(40,22,8,0.2)', 'rgba(220,150,80,0.1)'], crater: ['rgba(40,25,10,0.3)', 'rgba(80,52,26,0.5)', 'rgba(220,160,100,0.2)'], craters: 6, track: 'rgba(200,140,80,0.3)', rock: '#4a3018', rockHi: 'rgba(230,170,110,0.3)', lot: 'rgba(150,128,105,0.85)', locked: ['rgba(50,30,12,0.35)', 'rgba(50,30,12,0.14)'], sky: 'titan', lakes: true, day: 0.62, tint: 'rgba(232,196,156,1)' }),
};
const GAPS = [[3, 4], [6, 7], [10, 11], [13, 14]];
export class BaseView {
  constructor(canvas) {
    this.cv = canvas; this.c = canvas.getContext('2d'); this.base = 'earth'; this.zoom = 1; this.cam = { x: 0, y: 0 }; this.sprites = new Map(); this.ground = null; this.sel = null; this.hover = null; this.t = 0;
    this.particles = []; this.cars = []; this.dayLock = null; this.theme = 'earth'; this.launching = null; this.padRocket = null;
  }
  setBase(id) { if (this.base === id && this.ground) return; this.base = id; this.theme = THEMES[id] ? id : 'earth'; this.ground = null; this.sprites.clear(); this.cars = []; this.particles = []; this.padXY = null; this.fit(); }
  resize(w, h, dpr) { this.w = w; this.h = h; this.dpr = dpr; this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr); this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px'; this.ground = null; this.sprites.clear(); if (!this.fitted) this.fit(); }
  get lay() { return LAYOUTS[this.base]; }
  fit() { const N = this.lay.N; const span = N * TW; const port = this.h > this.w; this.zoom = clamp(port ? this.w / (span * 0.6) : Math.min(this.w / (span * 0.78), (this.h - 110) / (N * TH * 0.95)), 0.35, 1.8); const c = P(N / 2, N / 2); this.cam = { x: c[0], y: c[1] + (port ? (this.h * 0.04) / this.zoom : -30) }; this.fitted = true; this.ground = null; }
  // world (iso units) ↔ screen (css px)
  toScreen(x, y) { return [(x - this.cam.x) * this.zoom + this.vx(), (y - this.cam.y) * this.zoom + this.h / 2]; }
  vx() { return (this.w - (this.padR || 0)) / 2 + (this.padL || 0) / 2; }
  toWorld(sx, sy) { return [(sx - this.vx()) / this.zoom + this.cam.x, (sy - this.h / 2) / this.zoom + this.cam.y]; }
  // smoothly bring a lot into view (portrait: above the bottom sheet)
  focusLot(id) { const L = this.lay.lots.find((l) => l.id === id); if (!L) return; const [x, y] = P(L.i + L.size / 2, L.j + L.size / 2); const port = this.h > this.w; this.camT = { x, y: y + (port ? (this.h * 0.2) / this.zoom : 0) }; }
  pan(dx, dy) { this.camT = null; this.cam.x -= dx / this.zoom; this.cam.y -= dy / this.zoom; this.clampCam(); }
  zoomAt(f, sx, sy) { const [wx, wy] = this.toWorld(sx, sy); const z0 = this.zoom; this.zoom = clamp(this.zoom * f, 0.3, 2.4); if (this.zoom === z0) return; const [wx2, wy2] = this.toWorld(sx, sy); this.cam.x += wx - wx2; this.cam.y += wy - wy2; this.clampCam(); if (Math.abs(Math.log(this.zoom / (this.gZoom || 1))) > 0.35) { this.ground = null; this.sprites.clear(); } }
  clampCam() { const N = this.lay.N; const c = P(N / 2, N / 2); const r = N * TW * 0.6; this.cam.x = clamp(this.cam.x, c[0] - r, c[0] + r); this.cam.y = clamp(this.cam.y, c[1] - r * 0.6, c[1] + r * 0.6); }
  // tile under a screen point
  tileAt(sx, sy) { const [x, y] = this.toWorld(sx, sy); return [(y / (TH / 2) + x / (TW / 2)) / 2, (y / (TH / 2) - x / (TW / 2)) / 2]; }
  // building lots front-to-back; picks the one whose footprint or body contains the point
  pick(sx, sy, s) {
    const lots = this.lay.lots.slice().sort((a, b) => b.i + b.j + b.size * 2 - (a.i + a.j + a.size * 2));
    const [wx, wy] = this.toWorld(sx, sy);
    for (const L of lots) { const st = s.bases[this.base].lots[L.id]; const h = st && st.b ? (this.hOf(st) || 40) : 0;
      const top = P(L.i, L.j), left = P(L.i, L.j + L.size), right = P(L.i + L.size, L.j), bot = P(L.i + L.size, L.j + L.size);
      if (wx < left[0] || wx > right[0]) continue; const cx = (left[0] + right[0]) / 2; const halfW = (right[0] - left[0]) / 2; const dx = Math.abs(wx - cx) / halfW;
      const yTop = top[1] + dx * (left[1] - top[1]) - h, yBot = bot[1] - dx * (bot[1] - left[1]);
      if (wy >= yTop && wy <= yBot) return L.id; }
    return null;
  }
  hOf(st) { const sp = this.sprites.get(this.key(st.b, st.lvl || 1)); return sp ? sp.h : 40; }
  key(b, L) { return b + ':' + L; }
  scale() { return Math.max(0.5, Math.round(this.zoom * this.dpr * 4) / 4); }
  sprite(b, L, size) {
    const k = this.key(b, L); let sp = this.sprites.get(k); if (sp) return sp;
    const sc = this.scale(); const w = size * TW + PADX * 2, h = size * TH + HMAX + 20; const cv = document.createElement('canvas'); cv.width = Math.ceil(w * sc); cv.height = Math.ceil(h * sc);
    const c = cv.getContext('2d'); c.scale(sc, sc); c.translate(size * TW / 2 + PADX, HMAX); const lights = [], fx = [];
    const hh = (ART[b] || ART.depot)(c, Math.max(1, L), size, lights, fx);
    sp = { cv, sc, ox: size * TW / 2 + PADX, oy: HMAX, w, hgt: h, lights, fx, h: hh }; this.sprites.set(k, sp); return sp;
  }
  // ---------------- ground ----------------
  buildGround(s) {
    if (this.theme !== 'earth') return this.buildColonyGround(s);
    const N = this.lay.N, M = 7; const sc = this.scale(); this.gZoom = this.zoom;
    const x0 = P(-M, N + M)[0] - 40, x1 = P(N + M, -M)[0] + 40, y0 = P(-M, -M)[1] - 40, y1 = P(N + M, N + M)[1] + 40;
    const cv = document.createElement('canvas'); cv.width = Math.ceil((x1 - x0) * sc); cv.height = Math.ceil((y1 - y0) * sc); const c = cv.getContext('2d'); c.scale(sc, sc); c.translate(-x0, -y0);
    const R = rng(7);
    // island outline: a jittered rounded diamond, beach band, then grass
    const isl = []; const steps = 72; for (let k = 0; k < steps; k++) { const a = (k / steps) * Math.PI * 2; const rr = (N / 2 + M * 0.78) * (1 + 0.06 * Math.sin(a * 3 + 1) + 0.04 * Math.sin(a * 7)) * (a > 0.2 && a < 1.4 ? 0.92 : 1); isl.push([N / 2 + Math.cos(a) * rr * 1.02, N / 2 + Math.sin(a) * rr]); }
    const sand = isl.map(([i, j]) => P(i, j)); poly(c, sand, '#e7d6a6');
    const grass = isl.map(([i, j]) => P(N / 2 + (i - N / 2) * 0.93, N / 2 + (j - N / 2) * 0.93)); const gg = c.createLinearGradient(0, y0, 0, y1); gg.addColorStop(0, '#6fae55'); gg.addColorStop(1, '#5a9647'); poly(c, grass, gg);
    // grass texture
    for (let k = 0; k < 2600; k++) { const i = R.range(-M * 0.6, N + M * 0.6), j = R.range(-M * 0.6, N + M * 0.6); const [x, y] = P(i, j); c.fillStyle = R.chance(0.5) ? 'rgba(40,90,30,0.18)' : 'rgba(150,200,110,0.16)'; c.fillRect(x, y, R.range(1, 3), 1); }
    // apron under the base grid
    poly(c, diamond(-0.3, -0.3, N + 0.6, N + 0.6), 'rgba(80,110,70,0.25)');
    // roads
    const road = (i0, j0, w, d) => poly(c, diamond(i0, j0, w, d), '#53585f');
    for (const [a] of GAPS) { road(a + 0.1, 0.3, 0.8, N - 0.6); road(0.3, a + 0.1, N - 0.6, 0.8); }
    road(0.1, 0.1, N - 0.2, 0.25); road(0.1, N - 0.35, N - 0.2, 0.25); road(0.1, 0.1, 0.25, N - 0.2); road(N - 0.35, 0.1, 0.25, N - 0.2);
    // access roads to the outer ring
    for (const L of this.lay.lots) { if (!L.outer) continue; poly(c, diamond(L.i - 0.15, L.j - 0.15, L.size + 0.3, L.size + 0.3), 'rgba(80,110,70,0.3)'); if (L.i < 0) road(L.i + L.size, L.j + 0.8, 0.75, 0.4); else if (L.i > N) road(N - 0.1, L.j + 0.8, L.i - N + 0.1, 0.4); else if (L.j < 0) road(L.i + 0.8, L.j + L.size, 0.4, 0.75); else road(L.i + 0.8, N - 0.1, 0.4, L.j - N + 0.1); }
    c.strokeStyle = 'rgba(240,220,140,0.6)'; c.lineWidth = 0.8; c.setLineDash([5, 6]);
    for (const [a] of GAPS) { let p = P(a + 0.5, 0.4), q = P(a + 0.5, N - 0.4); c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); p = P(0.4, a + 0.5); q = P(N - 0.4, a + 0.5); c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); }
    c.setLineDash([]);
    // trees, palms and rocks outside the grid
    for (let k = 0; k < 140; k++) { const a = R.range(0, Math.PI * 2), rr = R.range(N * 0.62, N / 2 + M * 0.62); const i = N / 2 + Math.cos(a) * rr, j = N / 2 + Math.sin(a) * rr; if (i > -0.5 && i < N + 0.5 && j > -0.5 && j < N + 0.5) continue; if (this.lay.lots.some((L) => L.outer && i > L.i - 0.6 && i < L.i + L.size + 0.6 && j > L.j - 0.6 && j < L.j + L.size + 0.6)) continue; const [x, y] = P(i, j);
      if (R.chance(0.7)) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(x + 3, y + 1, 7, 3, 0, 0, 7); c.fill(); c.fillStyle = '#3f7d35'; c.beginPath(); c.arc(x, y - 6, 6 + R() * 3, 0, 7); c.fill(); c.fillStyle = '#56a046'; c.beginPath(); c.arc(x - 2, y - 8, 3.5, 0, 7); c.fill(); }
      else { c.fillStyle = '#8b8f94'; c.beginPath(); c.ellipse(x, y, 4 + R() * 3, 2.5, 0, Math.PI, 0); c.fill(); } }
    this.ground = { cv, x0, y0, sc, isl };
  }
  themeOf(s) { const p = this.theme === 'mars' && s && s.solar ? (s.solar.terra.mars || 0) / 7 : 0; return THEMES[this.theme](p); }
  buildColonyGround(s) {
    const TH2 = this.themeOf(s); this.groundKey = this.theme + ':' + ((s && s.solar && s.solar.terra.mars) || 0);
    const N = this.lay.N, M = 10; const sc = this.scale(); this.gZoom = this.zoom;
    const x0 = P(-M, N + M)[0] - 40, x1 = P(N + M, -M)[0] + 40, y0 = P(-M, -M)[1] - 60, y1 = P(N + M, N + M)[1] + 40;
    const cv = document.createElement('canvas'); cv.width = Math.ceil((x1 - x0) * sc); cv.height = Math.ceil((y1 - y0) * sc); const c = cv.getContext('2d'); c.scale(sc, sc); c.translate(-x0, -y0);
    const R = rng(21); const isl = []; const steps = 64; for (let k = 0; k < steps; k++) { const a = (k / steps) * Math.PI * 2; const rr = (N / 2 + M * 0.85) * (1 + 0.05 * Math.sin(a * 5) + 0.03 * Math.sin(a * 11)); isl.push([N / 2 + Math.cos(a) * rr, N / 2 + Math.sin(a) * rr]); }
    const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, TH2.ground[0]); g.addColorStop(0.5, TH2.ground[1]); g.addColorStop(1, TH2.ground[2]); poly(c, isl.map(([i, j]) => P(i, j)), g);
    for (let k = 0; k < 4000; k++) { const i = R.range(-M * 0.8, N + M * 0.8), j = R.range(-M * 0.8, N + M * 0.8); const [x, y] = P(i, j); c.fillStyle = R.chance(0.5) ? TH2.speck[0] : TH2.speck[1]; c.fillRect(x, y, R.range(1, 2.5), 1); }
    const outside = (i, j) => !(i > -0.5 && i < N + 0.5 && j > -0.5 && j < N + 0.5);
    // Titan: methane lakes; terraformed Mars: seas in the lowlands
    if (TH2.lakes || TH2.water > 0) for (let k = 0; k < 9; k++) { const i = R.range(-M * 0.7, N + M * 0.7), j = R.range(-M * 0.7, N + M * 0.7); if (!outside(i, j)) continue; const [x, y] = P(i, j); const r = R.range(40, 120) * (TH2.lakes ? 1 : Math.min(1, TH2.water)); c.fillStyle = TH2.lakes ? 'rgba(28,24,26,0.85)' : 'rgba(40,90,140,0.85)'; c.beginPath(); c.ellipse(x, y, r, r * 0.5, 0, 0, 7); c.fill(); c.strokeStyle = TH2.lakes ? 'rgba(220,160,90,0.25)' : 'rgba(200,230,255,0.35)'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, r, r * 0.5, 0, Math.PI * 1.1, Math.PI * 1.7); c.stroke(); }
    // Ceres: the bright salt of Occator crater; terraformed Mars: lichen and forest patches
    if (TH2.salt) for (let k = 0; k < 14; k++) { const i = R.range(-M * 0.7, N + M * 0.7), j = R.range(-M * 0.7, N + M * 0.7); if (!outside(i, j)) continue; const [x, y] = P(i, j); const gr = c.createRadialGradient(x, y, 0, x, y, 26); gr.addColorStop(0, 'rgba(255,255,250,0.9)'); gr.addColorStop(1, 'rgba(255,255,250,0)'); c.fillStyle = gr; c.beginPath(); c.ellipse(x, y, 26, 13, 0, 0, 7); c.fill(); }
    if (TH2.veg > 0.4) for (let k = 0; k < Math.round(300 * (TH2.veg - 0.4)); k++) { const i = R.range(-M * 0.8, N + M * 0.8), j = R.range(-M * 0.8, N + M * 0.8); if (!outside(i, j)) continue; const [x, y] = P(i, j); c.fillStyle = TH2.veg > 0.85 ? (R.chance(0.5) ? '#2f5a2a' : '#3e7034') : 'rgba(90,110,70,0.6)'; c.beginPath(); c.arc(x, y - 3, 2 + R() * 4, 0, 7); c.fill(); }
    // craters (avoid the lots)
    for (let k = 0; k < TH2.craters; k++) { const i = R.range(-M * 0.7, N + M * 0.7), j = R.range(-M * 0.7, N + M * 0.7); const inGrid = i > -0.5 && i < N + 0.5 && j > -0.5 && j < N + 0.5; const r = inGrid ? R.range(0.15, 0.35) : R.range(0.3, 1.8); if (inGrid && R.chance(0.6)) continue; const [x, y] = P(i, j);
      c.fillStyle = TH2.crater[0]; c.beginPath(); c.ellipse(x, y, r * 45, r * 22, 0, 0, 7); c.fill(); c.fillStyle = TH2.crater[1]; c.beginPath(); c.ellipse(x + r * 4, y + r * 2, r * 40, r * 19, 0, 0, 7); c.fill();
      c.strokeStyle = TH2.crater[2]; c.lineWidth = 1 + r; c.beginPath(); c.ellipse(x, y, r * 45, r * 22, 0, Math.PI * 0.1, Math.PI * 0.95); c.stroke(); }
    // rover tracks from the hub to every lot
    const hub = this.lay.lots.find((l) => l.id === 'hq'); const [hx, hy] = P(hub.i + 1.5, hub.j + 1.5); c.strokeStyle = TH2.track; c.lineWidth = 5;
    for (const L of this.lay.lots) { if (L.id === 'hq') continue; const [lx, ly] = P(L.i + L.size / 2, L.j + L.size / 2); c.beginPath(); c.moveTo(hx, hy); c.quadraticCurveTo((hx + lx) / 2 + 8, (hy + ly) / 2 - 4, lx, ly); c.stroke(); }
    for (let k = 0; k < 120; k++) { const i = R.range(-M * 0.7, N + M * 0.7), j = R.range(-M * 0.7, N + M * 0.7); if (i > -0.5 && i < N + 0.5 && j > -0.5 && j < N + 0.5) continue; const [x, y] = P(i, j); c.fillStyle = TH2.rock; c.beginPath(); c.ellipse(x, y, 3 + R() * 4, 2, 0, Math.PI, 0); c.fill(); c.fillStyle = TH2.rockHi; c.fillRect(x - 2, y - 2, 2, 1); }
    this.ground = { cv, x0, y0, sc, isl, moon: true, key: this.groundKey };
  }
  // atmospheric colony skies: Mars (butterscotch by day, blue at sunset, bluer as it is terraformed) and Titan (orange haze)
  colonySky(c, TS, day, dusk, night) {
    const W = this.w, H = this.h; const g = c.createLinearGradient(0, 0, 0, H);
    if (TS.sky === 'titan') { g.addColorStop(0, '#a8641f'); g.addColorStop(0.45, '#d08a3a'); g.addColorStop(1, '#e8b066'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      const hz = c.createRadialGradient(W * 0.3, H * 0.15, 0, W * 0.3, H * 0.15, W * 0.4); hz.addColorStop(0, 'rgba(255,220,160,0.35)'); hz.addColorStop(1, 'rgba(255,220,160,0)'); c.fillStyle = hz; c.fillRect(0, 0, W, H); return; }
    const p = TS.veg || 0; const top = mixHex(mixHex('#0c0a12', '#c79a72', day), '#5f93d6', p * day), mid = mixHex(mixHex('#1a1420', dusk > 0.3 ? '#7f9cc6' : '#dcb489', day), '#a9cdf0', p * day), bot = mixHex(mixHex('#241a22', '#ecc9a0', day), '#d8ecfb', p * day);
    g.addColorStop(0, top); g.addColorStop(0.55, mid); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(0, 0, W, H);
    // the small, pale Martian sun, and Phobos racing across
    const sx = W * (0.2 + 0.6 * day), sy = H * (0.35 - 0.2 * day); if (day > 0.1) { const sg = c.createRadialGradient(sx, sy, 0, sx, sy, 34); sg.addColorStop(0, `rgba(255,252,235,${day})`); sg.addColorStop(0.2, `rgba(220,230,255,${0.5 * day})`); sg.addColorStop(1, 'rgba(200,220,255,0)'); c.fillStyle = sg; c.fillRect(sx - 34, sy - 34, 68, 68); }
    const px = ((this.t * 6) % (W + 80)) - 40, py = H * 0.12; c.fillStyle = `rgba(${night > 0.5 ? '200,190,180' : '120,100,90'},0.9)`; c.beginPath(); c.ellipse(px, py, 7, 5, 0.4, 0, 7); c.fill();
  }
  // empty / locked lots drawn live (they react to selection)
  drawLot(c, L, st, open, hq) {
    const sel = this.sel === L.id, hov = this.hover === L.id; const pts = diamond(L.i + 0.06, L.j + 0.06, L.size - 0.12, L.size - 0.12);
    if (!open) { const next = L.hq === hq + 1; const TL = this.theme !== 'earth' ? THEMES[this.theme](0).locked : ['rgba(60,90,50,0.4)', 'rgba(60,90,50,0.18)']; poly(c, pts, next ? TL[0] : TL[1]); if (next) { c.setLineDash([3, 4]); poly(c, pts, null, 'rgba(255,255,255,0.4)', 1); c.setLineDash([]); const [x, y] = P(L.i + L.size / 2, L.j + L.size / 2); c.fillStyle = 'rgba(255,255,255,0.75)'; c.font = '600 8px Barlow, sans-serif'; c.textAlign = 'center'; c.fillText('OPENS AT LV ' + L.hq, x, y + 3); } return; }
    poly(c, pts, sel ? 'rgba(110,231,255,0.35)' : hov ? 'rgba(255,255,255,0.32)' : this.theme !== 'earth' ? THEMES[this.theme](0).lot : 'rgba(196,201,208,0.85)', sel ? '#6ee7ff' : 'rgba(0,0,0,0.25)', sel ? 2 : 0.8);
    const [x, y] = P(L.i + L.size / 2, L.j + L.size / 2); c.strokeStyle = 'rgba(80,90,105,0.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x + 8, y); c.moveTo(x, y - 4); c.lineTo(x, y + 4); c.stroke();
    if (L.special === 'pad') { c.fillStyle = 'rgba(60,70,85,0.8)'; c.font = '700 9px Oxanium, sans-serif'; c.textAlign = 'center'; c.fillText('LAUNCH SITE', x, y + 16); }
  }
  // ---------------- frame ----------------
  daylight() {
    if (this.theme !== 'earth' && this.theme !== 'mars') return THEMES[this.theme](0).day;
    if (this.dayLock !== null) return this.dayLock; const d = new Date(); const h = d.getHours() + d.getMinutes() / 60;
    return smooth(5.5, 7.5, h) * (1 - smooth(18.5, 20.5, h));
  }
  render(s, game, dt) {
    this.t += dt; const c = this.c, t = this.t, dpr = this.dpr; if (this.ground && this.theme === 'mars' && this.ground.key !== 'mars:' + ((s.solar && s.solar.terra.mars) || 0)) this.ground = null; if (!this.ground) this.buildGround(s);
    if (this.camT) { const k = 1 - Math.exp(-dt * 6); this.cam.x += (this.camT.x - this.cam.x) * k; this.cam.y += (this.camT.y - this.cam.y) * k; if (Math.abs(this.camT.x - this.cam.x) + Math.abs(this.camT.y - this.cam.y) < 0.5) this.camT = null; }
    const day = this.daylight(); const night = 1 - day; const dusk = Math.max(0, 1 - Math.abs(day - 0.5) * 2.5);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // sky + sea
    const sky = c.createLinearGradient(0, 0, 0, this.h); const mix = (a, b, k) => { const pa = a.match(/\w\w/g).map((x) => parseInt(x, 16)), pb = b.match(/\w\w/g).map((x) => parseInt(x, 16)); return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',')})`; };
    sky.addColorStop(0, mix('#07122b', '#5aa7e6', day)); sky.addColorStop(0.55, mix('#16244a', dusk > 0.3 ? '#f6b37a' : '#a9d5f5', day)); sky.addColorStop(1, mix('#1b2c55', '#d9eefb', day));
    const TS = this.theme !== 'earth' ? this.themeOf(s) : null;
    if (TS && TS.sky !== 'space') this.colonySky(c, TS, day, dusk, night);
    else if (TS) { const sk = c.createLinearGradient(0, 0, 0, this.h); sk.addColorStop(0, '#010207'); sk.addColorStop(1, '#070a14'); c.fillStyle = sk; c.fillRect(0, 0, this.w, this.h); const R = rng(9); for (let k = 0; k < 260; k++) { c.fillStyle = `rgba(255,255,255,${0.3 + R() * 0.7})`; c.fillRect(R() * this.w, R() * this.h, R() < 0.08 ? 2 : 1, R() < 0.08 ? 2 : 1); }
      if (TS.obj === 'sun') { const sx = this.w * 0.8, sy = this.h * 0.18; const sg = c.createRadialGradient(sx, sy, 0, sx, sy, 40); sg.addColorStop(0, 'rgba(255,255,240,1)'); sg.addColorStop(0.12, 'rgba(255,250,220,0.9)'); sg.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = sg; c.fillRect(sx - 40, sy - 40, 80, 80); }
      if (TS.obj === 'earth') {
      // Earth hanging in the black sky
      const ex = this.w * 0.78, ey = this.h * 0.2, er = Math.min(this.w, this.h) * 0.07; const eg = c.createRadialGradient(ex - er * 0.4, ey - er * 0.3, er * 0.1, ex, ey, er); eg.addColorStop(0, '#9fd2ff'); eg.addColorStop(0.55, '#2e6db0'); eg.addColorStop(1, '#0b2346'); c.fillStyle = eg; c.beginPath(); c.arc(ex, ey, er, 0, 7); c.fill();
      c.save(); c.beginPath(); c.arc(ex, ey, er, 0, 7); c.clip(); c.fillStyle = 'rgba(80,140,70,0.75)'; for (const [a, b, r] of [[-0.3, -0.1, 0.35], [0.25, 0.2, 0.28], [0.1, -0.45, 0.2]]) { c.beginPath(); c.ellipse(ex + a * er + Math.sin(this.t * 0.02) * er * 0.3, ey + b * er, r * er, r * er * 0.7, 0.4, 0, 7); c.fill(); } c.fillStyle = 'rgba(255,255,255,0.7)'; for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(ex + Math.sin(k * 2.1 + this.t * 0.03) * er * 0.6, ey + Math.cos(k * 1.7) * er * 0.6, er * 0.3, er * 0.08, k, 0, 7); c.fill(); }
      const sh = c.createLinearGradient(ex - er, 0, ex + er, 0); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.62, 'rgba(0,0,0,0)'); sh.addColorStop(0.85, 'rgba(0,0,6,0.82)'); c.fillStyle = sh; c.fillRect(ex - er, ey - er, er * 2, er * 2); c.restore();
      const hz = c.createRadialGradient(ex, ey, er, ex, ey, er * 1.35); hz.addColorStop(0, 'rgba(110,170,255,0.35)'); hz.addColorStop(1, 'rgba(110,170,255,0)'); c.fillStyle = hz; c.fillRect(ex - er * 1.4, ey - er * 1.4, er * 2.8, er * 2.8); } }
    else c.fillStyle = sky, c.fillRect(0, 0, this.w, this.h);
    if (night > 0.2 && (this.theme === 'earth' || this.theme === 'mars')) { const R = rng(3); c.fillStyle = `rgba(255,255,255,${(night - 0.2) * 0.9})`; for (let k = 0; k < 160; k++) { const x = R() * this.w, y = R() * this.h * 0.6; const tw = 0.5 + 0.5 * Math.sin(t * (1 + R() * 2) + k); c.globalAlpha = (night - 0.2) * tw; c.fillRect(x, y, R() < 0.1 ? 2 : 1, R() < 0.1 ? 2 : 1); } c.globalAlpha = 1; }
    c.setTransform(dpr * this.zoom, 0, 0, dpr * this.zoom, dpr * (this.vx() - this.cam.x * this.zoom), dpr * (this.h / 2 - this.cam.y * this.zoom));
    const N = this.lay.N; const hzY = P(-14, -14)[1];
    if (this.theme === 'earth') { const sea = c.createLinearGradient(0, hzY, 0, P(N + 14, N + 14)[1]); sea.addColorStop(0, mix('#0b1f3a', '#5f9fd0', day)); sea.addColorStop(1, mix('#081a33', '#2f78b0', day));
    c.fillStyle = sea; c.fillRect(P(-30, N + 30)[0], hzY, P(N + 30, -30)[0] - P(-30, N + 30)[0], 4000);
    // glints on the water
    c.fillStyle = `rgba(255,255,255,${0.25 + day * 0.35})`; const R2 = rng(11); for (let k = 0; k < 90; k++) { const x = P(-20, N + 20)[0] + R2() * (P(N + 20, -20)[0] - P(-20, N + 20)[0]); const y = hzY + 20 + R2() * 900; const a = Math.sin(t * 1.5 + k * 1.7); if (a > 0.6) c.fillRect(x + Math.sin(t * 0.3 + k) * 6, y, 6 * (a - 0.6) * 4, 1); }
    }
    const G = this.ground; c.drawImage(G.cv, G.x0, G.y0, G.cv.width / G.sc, G.cv.height / G.sc);
    // surf line
    if (!G.moon) c.strokeStyle = `rgba(255,255,255,${0.35 + 0.2 * Math.sin(t * 1.2)})`; c.lineWidth = 1.2; c.beginPath(); if (!G.moon) { G.isl.forEach(([i, j], k) => { const p = P(N / 2 + (i - N / 2) * 1.015, N / 2 + (j - N / 2) * 1.015); k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.closePath(); c.stroke(); }
    // lots + buildings, back to front
    const hq = game.hqLevel(s, this.base); const B = s.bases[this.base]; const lots = this.lay.lots.slice().sort((a, b) => a.i + a.j + a.size - (b.i + b.j + b.size));
    const lightsAll = []; const fxAll = []; this.labels = [];
    // cars on roads (behind buildings is fine for a cozy look)
    if (this.theme === 'earth') this.drawCars(c, dt, day);
    for (const L of lots) {
      const st = B.lots[L.id]; const open = hq >= L.hq;
      if (!st || !st.b) { this.drawLot(c, L, st, open, hq); continue; }
      const job = s.jobs.find((j) => j.kind === 'build' && j.base === this.base && j.lot === L.id);
      const lvl = Math.max(1, st.lvl); const sp = this.sprite(st.b, st.lvl > 0 ? st.lvl : 1, L.size); const [ox, oy] = P(L.i, L.j);
      if (this.sel === L.id) poly(c, diamond(L.i - 0.04, L.j - 0.04, L.size + 0.08, L.size + 0.08), 'rgba(110,231,255,0.25)', '#6ee7ff', 2);
      c.globalAlpha = st.lvl === 0 ? 0.4 : 1; c.drawImage(sp.cv, ox - sp.ox, oy - sp.oy, sp.cv.width / sp.sc, sp.cv.height / sp.sc); c.globalAlpha = 1;
      for (const f of sp.fx) fxAll.push({ ...f, ox, oy, b: st.b, lvl });
      for (const l of sp.lights) lightsAll.push({ x: l.x + ox, y: l.y + oy, r: l.r, k: l.k, flood: l.flood });
      if (job) { c.save(); c.translate(ox, oy); scaffold(c, L.size, sp.h, t); c.restore(); const [lx, ly] = P(L.i + L.size / 2, L.j + L.size / 2, sp.h * 0.6 + 34); this.labels.push({ x: lx, y: ly, job, b: st.b }); }
      else if (this.sel === L.id || this.hover === L.id) { const [lx, ly] = P(L.i + L.size / 2, L.j + L.size / 2, sp.h + 6); this.labels.push({ x: lx, y: ly, name: BUILDINGS[st.b].name, lvl: st.lvl }); }
    }
    this.drawFx(c, fxAll, dt, day, s);
    this.drawLaunch(c, dt);
    // particles (smoke / steam)
    this.stepParticles(c, dt, day);
    // night: darken, then add lights
    if (night > 0.02) {
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'multiply'; c.fillStyle = this.theme !== 'earth' && this.theme !== 'mars' ? THEMES[this.theme](0).tint : `rgba(${Math.round(255 - 190 * night)},${Math.round(255 - 170 * night)},${Math.round(255 - 110 * night)},1)`; c.fillRect(0, 0, this.cv.width, this.cv.height); c.restore();
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const l of lightsAll) { if (l.flood) { const g = c.createRadialGradient(l.x, l.y, 1, l.x, l.y + 30, 60); g.addColorStop(0, `rgba(255,240,200,${0.55 * night})`); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(l.x, l.y); c.lineTo(l.x - 50, l.y + 70); c.lineTo(l.x + 50, l.y + 70); c.closePath(); c.fill(); continue; }
        const on = (l.k + Math.floor(t * 0.05)) % 5 !== 0; if (!on) continue; const r = Math.min(6, Math.max(2, l.r * 1.1)); const g = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, r); g.addColorStop(0, `rgba(255,222,150,${0.75 * night})`); g.addColorStop(0.45, `rgba(255,200,120,${0.35 * night})`); g.addColorStop(1, 'rgba(255,190,110,0)'); c.fillStyle = g; c.fillRect(l.x - r, l.y - r, r * 2, r * 2); }
      for (const f of fxAll) if (f.k === 'beacon') this.beacon(c, f, night, true);
      c.restore();
    }
    // labels (construction timers, names)
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const lb of this.labels) { const [sx, sy] = this.toScreen(lb.x, lb.y);
      if (lb.job) { const tot = lb.job.end - lb.job.start, left = Math.max(0, lb.job.end - Date.now()); const p = clamp(1 - left / tot); const w = 74; c.fillStyle = 'rgba(8,14,26,0.85)'; c.fillRect(sx - w / 2 - 2, sy - 18, w + 4, 22); c.fillStyle = '#26364d'; c.fillRect(sx - w / 2, sy - 2, w, 4); c.fillStyle = '#6ee7ff'; c.fillRect(sx - w / 2, sy - 2, w * p, 4); c.fillStyle = '#e9f4ff'; c.font = '600 11px Barlow, sans-serif'; c.textAlign = 'center'; c.fillText(left <= 0 ? 'Done!' : fmtTime(left / 1000), sx, sy - 6); }
      else { c.font = '700 11px Oxanium, sans-serif'; c.textAlign = 'center'; const txt = `${lb.name}  ·  L${lb.lvl}`; const w = c.measureText(txt).width + 14; c.fillStyle = 'rgba(8,14,26,0.82)'; c.fillRect(sx - w / 2, sy - 16, w, 18); c.fillStyle = '#e9f4ff'; c.fillText(txt, sx, sy - 3); } }
  }
  beacon(c, f, night, glow) { const on = Math.sin(this.t * 3 + f.x * 0.1) > 0.3; if (!on) return; const r = glow ? 7 : 2; const g = c.createRadialGradient(f.x + f.ox, f.y + f.oy, 0, f.x + f.ox, f.y + f.oy, r); g.addColorStop(0, f.col); g.addColorStop(1, 'rgba(255,0,0,0)'); c.fillStyle = g; c.fillRect(f.x + f.ox - r, f.y + f.oy - r, r * 2, r * 2); }
  drawFx(c, list, dt, day, s) {
    const t = this.t;
    for (const f of list) { const x = f.x + f.ox, y = f.y + f.oy;
      switch (f.k) {
        case 'beacon': this.beacon(c, f, 1 - day, false); break;
        case 'dish': { const a = t * f.sp + x * 0.01; import_dish(c, x, y, f.r, a); break; }
        case 'flag': { c.fillStyle = f.col; c.beginPath(); c.moveTo(x, y); for (let k = 0; k <= 6; k++) c.lineTo(x + k * 2, y + Math.sin(t * 4 + k * 0.8 + x) * 1.2); c.lineTo(x + 12, y + 7); for (let k = 6; k >= 0; k--) c.lineTo(x + k * 2, y + 7 + Math.sin(t * 4 + k * 0.8 + x) * 1.2); c.closePath(); c.fill(); break; }
        case 'wheel': { c.strokeStyle = '#3a3f47'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, f.r, 0, 7); c.stroke(); const a = t * 2; c.beginPath(); for (let k = 0; k < 3; k++) { c.moveTo(x, y); c.lineTo(x + Math.cos(a + k * 2.09) * f.r, y + Math.sin(a + k * 2.09) * f.r); } c.stroke(); break; }
        case 'smoke': if (Math.random() < dt * 6 * (f.s || 1)) this.particles.push({ x, y, vx: 4 + Math.random() * 3, vy: -10 - Math.random() * 6, life: 4, t: 0, r: 2, col: f.col, grow: 3.2 }); break;
        case 'steam': if (Math.random() < dt * 9) this.particles.push({ x: x + (Math.random() - 0.5) * 14, y, vx: 5 + Math.random() * 3, vy: -14 - Math.random() * 6, life: 5, t: 0, r: 5, col: 'rgba(245,248,252,', grow: 5 * (f.s || 1) }); break;
        case 'flare': { const fl = 0.7 + 0.3 * Math.sin(t * 13) * Math.sin(t * 7.3); const g = c.createRadialGradient(x, y - 5, 0, x, y - 5, 10 * fl); g.addColorStop(0, 'rgba(255,250,200,0.95)'); g.addColorStop(0.4, 'rgba(255,150,40,0.8)'); g.addColorStop(1, 'rgba(255,80,0,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(x, y - 6, 4 * fl, 9 * fl, Math.sin(t * 2) * 0.2, 0, 7); c.fill(); break; }
        case 'conveyor': { c.fillStyle = '#8a7b62'; for (let k = 0; k < 5; k++) { const p = ((t * 0.3 + k / 5) % 1); c.fillRect(f.ax + (f.bx - f.ax) * p + f.ox - 1.5, f.ay + (f.by - f.ay) * p + f.oy - 3, 3, 2); } break; }
        case 'truck': { const p = (Math.sin(t * 0.35 + x) + 1) / 2; const [tx, ty] = P(f.i0 + (f.i1 - f.i0) * p, f.j0 + (f.j1 - f.j0) * p); c.fillStyle = '#e8b04a'; c.fillRect(tx + f.ox - 4, ty + f.oy - 5, 8, 4); c.fillStyle = '#333'; c.fillRect(tx + f.ox - 4, ty + f.oy - 1, 8, 1.5); break; }
        case 'glint': { const p = (t * 0.15 + f.x0 * 0.01) % 1.6; if (p < 1) { const gx = f.x0 + (f.x1 - f.x0) * p, gy = f.y0 + (f.y1 - f.y0) * p; const g = c.createRadialGradient(gx + f.ox, gy + f.oy, 0, gx + f.ox, gy + f.oy, 10); g.addColorStop(0, `rgba(255,255,255,${0.6 * day})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(gx + f.ox - 10, gy + f.oy - 10, 20, 20); } break; }
        case 'slit': { c.fillStyle = '#20262e'; c.save(); c.translate(x, y); c.rotate(Math.sin(t * 0.1) * 0.6); c.fillRect(-1.5, -9, 3, 9); c.restore(); break; }
        case 'rocketSlot': this.padXY = [x, y]; this.drawPadRocket(c, x, y, f.T, s); break;
        case 'centrifuge': { const a = t * 3; c.strokeStyle = '#9aa2ad'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - Math.cos(a) * 14, y - Math.sin(a) * 4); c.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 4); c.stroke(); c.fillStyle = '#e8eef5'; c.beginPath(); c.arc(x + Math.cos(a) * 14, y + Math.sin(a) * 4, 3, 0, 7); c.fill(); break; }
        case 'dust': if (Math.random() < dt * 4) this.particles.push({ x, y, vx: (Math.random() - 0.5) * 10, vy: -4 - Math.random() * 4, life: 2.5, t: 0, r: 1.5, col: 'rgba(180,176,168,', grow: 2.5 }); break;
        case 'drill': { const b = Math.abs(Math.sin(t * 6)) * 3; c.fillStyle = '#e8b04a'; c.fillRect(x - 3, y - 14 + b, 6, 10); break; }
        case 'vent': if (Math.random() < dt * 5) this.particles.push({ x: x + (Math.random() - 0.5) * 4, y, vx: 6 + Math.random() * 4, vy: -12 - Math.random() * 6, life: 5, t: 0, r: 3, col: 'rgba(235,190,150,', grow: 5 }); break;
        case 'climber': { // the ribbon runs off the top of the screen; cargo climbers ride it up and down
          const top = this.toWorld(0, -20)[1]; c.strokeStyle = 'rgba(40,46,56,0.85)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x, top); c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x + 1, y); c.lineTo(x + 1, top); c.stroke();
          for (let k = 0; k < 2; k++) { const p = (t * 0.06 + k * 0.5) % 1; const cy = y + (top - y) * (k ? 1 - p : p); c.fillStyle = '#e8b04a'; c.fillRect(x - 4, cy - 5, 8, 7); c.fillStyle = 'rgba(255,240,180,0.8)'; c.fillRect(x - 2, cy - 3, 4, 2); } break; }
        case 'glow': { const a = 0.35 + 0.25 * Math.sin(t * 2.2); const g = c.createRadialGradient(x, y, 0, x, y, 22); g.addColorStop(0, `rgba(${f.col},${a})`); g.addColorStop(1, `rgba(${f.col},0)`); c.fillStyle = g; c.fillRect(x - 22, y - 22, 44, 44); break; }
        case 'pod': { const p = (t * 0.4) % 1; const px = f.ax + (f.bx - f.ax) * p + f.ox, py = f.ay + (f.by - f.ay) * p + f.oy; c.fillStyle = '#ffffff'; c.fillRect(px - 3, py - 3, 6, 4); const g = c.createRadialGradient(px, py, 0, px, py, 8); g.addColorStop(0, 'rgba(110,231,255,0.6)'); g.addColorStop(1, 'rgba(110,231,255,0)'); c.fillStyle = g; c.fillRect(px - 8, py - 8, 16, 16); break; }
      } }
  }
  // a rocket waiting on the pad (size follows the pad tier); Part 2 replaces it with the real vehicle
  // liftoff sequence: venting, ignition, smoke, rise with flame trail
  launch(rk) { this.launching = { t: 0, rk, base: this.base }; }
  // frame the pad in the lower third so the climb stays on screen
  focusLaunch() { const L = this.lay.lots.find((l) => l.id === 'pad'); if (!L) return; const [x, y] = P(L.i + L.size / 2, L.j + L.size / 2); this.camT = { x, y: y - (this.h * 0.2) / this.zoom }; }
  drawLaunch(c, dt) {
    const L = this.launching; if (!L || !this.padXY) return; if (L.base !== this.base) { this.launching = null; return; } L.t += dt; const [x0, y0] = this.padXY; const rk = L.rk; const t = L.t; const h = rk.h, w = rk.w;
    const rise = t < 3 ? 0 : 0.5 * 30 * (t - 3) * (t - 3) + 5 * (t - 3); const x = x0, y = y0 - rise;
    if (t < 3) { if (Math.random() < 0.6) this.particles.push({ x: x + (Math.random() - 0.5) * w, y: y0 - h * 0.5, vx: (Math.random() - 0.5) * 12, vy: 4, life: 1.5, t: 0, r: 2, col: 'rgba(255,255,255,', grow: 3 }); }
    else { for (let k = 0; k < (t < 6 ? 6 : 2); k++) this.particles.push({ x: x + (Math.random() - 0.5) * w, y: y + 4, vx: (Math.random() - 0.5) * (t < 5 ? 90 : 20), vy: t < 5 ? 10 + Math.random() * 20 : 30, life: t < 6 ? 3.5 : 2, t: 0, r: 4, col: 'rgba(235,235,240,', grow: 7 });
      const fl = 18 + Math.random() * 8 + Math.min(40, rise * 0.05); const g = c.createLinearGradient(0, y, 0, y + fl * 2.4); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.3, 'rgba(255,190,80,0.95)'); g.addColorStop(1, 'rgba(255,90,20,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(x - w * 0.45, y); c.lineTo(x + w * 0.45, y); c.lineTo(x, y + fl * 2.4); c.closePath(); c.fill();
      const gl = c.createRadialGradient(x, y + 6, 0, x, y + 6, 60); gl.addColorStop(0, 'rgba(255,200,120,0.45)'); gl.addColorStop(1, 'rgba(255,160,60,0)'); c.fillStyle = gl; c.fillRect(x - 60, y - 54, 120, 120); }
    const g2 = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g2.addColorStop(0, '#d9dee5'); g2.addColorStop(0.4, '#ffffff'); g2.addColorStop(1, '#8e97a3'); c.fillStyle = g2; c.fillRect(x - w / 2, y - h, w, h); c.fillStyle = rk.band || '#f08a24'; c.fillRect(x - w / 2, y - h * 0.3, w, 4); c.fillStyle = '#20252c'; c.fillRect(x - w / 2, y - h * 0.62, w, 3);
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(x - w / 2, y - h); c.quadraticCurveTo(x, y - h - w * 2.2, x + w / 2, y - h); c.fill();
    if (t > 12) this.launching = null;
  }
  drawPadRocket(c, x, y, T, s) {
    const rk = this.padRocket; if (!rk) return; const h = rk ? rk.h : 40 + T * 16, w = rk ? rk.w : 7 + T * 1.5; if (this.launching) return;
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(x + 6, y + 2, w * 1.4, w * 0.5, 0, 0, 7); c.fill();
    const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, '#d9dee5'); g.addColorStop(0.4, '#ffffff'); g.addColorStop(1, '#8e97a3');
    c.fillStyle = g; c.fillRect(x - w / 2, y - h, w, h); c.fillStyle = '#20252c'; c.fillRect(x - w / 2, y - h * 0.62, w, 3); c.fillStyle = (rk && rk.band) || '#f08a24'; c.fillRect(x - w / 2, y - h * 0.3, w, 4);
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(x - w / 2, y - h); c.quadraticCurveTo(x, y - h - w * 2.2, x + w / 2, y - h); c.fill();
    c.fillStyle = '#596270'; c.beginPath(); c.moveTo(x - w / 2, y - 6); c.lineTo(x - w / 2 - 4, y); c.lineTo(x - w / 2, y); c.fill(); c.beginPath(); c.moveTo(x + w / 2, y - 6); c.lineTo(x + w / 2 + 4, y); c.lineTo(x + w / 2, y); c.fill();
    if (Math.random() < 0.25) this.particles.push({ x: x + w / 2, y: y - h * 0.6, vx: 6 + Math.random() * 4, vy: 2, life: 1.6, t: 0, r: 2, col: 'rgba(255,255,255,', grow: 3 });
  }
  stepParticles(c, dt, day) {
    const ps = this.particles; for (const p of ps) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx += 2 * dt; }
    this.particles = ps.filter((p) => p.t < p.life); if (this.particles.length > 600) this.particles.splice(0, this.particles.length - 600);
    for (const p of this.particles) { const k = p.t / p.life; c.fillStyle = p.col + (0.55 * (1 - k) * (0.5 + day * 0.5)).toFixed(3) + ')'; c.beginPath(); c.arc(p.x, p.y, p.r + p.grow * k * 4, 0, 7); c.fill(); }
  }
  drawCars(c, dt, day) {
    const N = this.lay.N; if (!this.cars.length) { const R = rng(5); for (let k = 0; k < 9; k++) { const g = GAPS[k % 4][0] + 0.5; this.cars.push({ axis: k % 2, g, p: R() * N, v: (R() < 0.5 ? -1 : 1) * (0.5 + R() * 0.6), col: R.pick(['#e8eef5', '#d64545', '#3b6fd4', '#e8b04a', '#2f2f35']) }); } }
    for (const car of this.cars) { car.p += car.v * dt; if (car.p > N - 0.5) car.p = 0.5; if (car.p < 0.5) car.p = N - 0.5; const [x, y] = car.axis ? P(car.p, car.g + (car.v > 0 ? 0.2 : -0.2)) : P(car.g + (car.v > 0 ? -0.2 : 0.2), car.p);
      c.fillStyle = car.col; c.fillRect(x - 3, y - 3, 6, 3); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x - 3, y, 6, 1); if (day < 0.5) { c.fillStyle = `rgba(255,240,180,${(0.5 - day) * 1.6})`; c.fillRect(x + (car.v > 0 ? 3 : -5), y - 2, 2, 2); } }
  }
}
import { dish as isoDish } from './iso.js';
function import_dish(c, x, y, r, a) { isoDish(c, x, y, r, a, 0.75); }
