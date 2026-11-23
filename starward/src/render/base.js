// STARWARD: the base view. A living isometric spaceport: cached ground and building sprites, animated
// effects, a day/night cycle synced to the player's local time, construction scaffolds, picking and camera.
import { P, TW, TH, poly, diamond, shade, rgba } from './iso.js';
import { ART, scaffold, tierOf } from './art.js';
import { LAYOUTS } from '../data/layouts.js';
import { BUILDINGS } from '../data/buildings.js';
import { rng, clamp, smooth, fmtTime } from '../util.js';

const HMAX = 210, PADX = 40;
const GAPS = [[3, 4], [6, 7], [10, 11], [13, 14]];
export class BaseView {
  constructor(canvas) {
    this.cv = canvas; this.c = canvas.getContext('2d'); this.base = 'earth'; this.zoom = 1; this.cam = { x: 0, y: 0 }; this.sprites = new Map(); this.ground = null; this.sel = null; this.hover = null; this.t = 0;
    this.particles = []; this.cars = []; this.dayLock = null;
  }
  setBase(id) { this.base = id; this.ground = null; this.sprites.clear(); this.fit(); }
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
    c.strokeStyle = 'rgba(240,220,140,0.6)'; c.lineWidth = 0.8; c.setLineDash([5, 6]);
    for (const [a] of GAPS) { let p = P(a + 0.5, 0.4), q = P(a + 0.5, N - 0.4); c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); p = P(0.4, a + 0.5); q = P(N - 0.4, a + 0.5); c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); }
    c.setLineDash([]);
    // trees, palms and rocks outside the grid
    for (let k = 0; k < 140; k++) { const a = R.range(0, Math.PI * 2), rr = R.range(N * 0.62, N / 2 + M * 0.62); const i = N / 2 + Math.cos(a) * rr, j = N / 2 + Math.sin(a) * rr; if (i > -0.5 && i < N + 0.5 && j > -0.5 && j < N + 0.5) continue; const [x, y] = P(i, j);
      if (R.chance(0.7)) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(x + 3, y + 1, 7, 3, 0, 0, 7); c.fill(); c.fillStyle = '#3f7d35'; c.beginPath(); c.arc(x, y - 6, 6 + R() * 3, 0, 7); c.fill(); c.fillStyle = '#56a046'; c.beginPath(); c.arc(x - 2, y - 8, 3.5, 0, 7); c.fill(); }
      else { c.fillStyle = '#8b8f94'; c.beginPath(); c.ellipse(x, y, 4 + R() * 3, 2.5, 0, Math.PI, 0); c.fill(); } }
    this.ground = { cv, x0, y0, sc, isl };
  }
  // empty / locked lots drawn live (they react to selection)
  drawLot(c, L, st, open, hq) {
    const sel = this.sel === L.id, hov = this.hover === L.id; const pts = diamond(L.i + 0.06, L.j + 0.06, L.size - 0.12, L.size - 0.12);
    if (!open) { const next = L.hq === hq + 1; poly(c, pts, next ? 'rgba(60,90,50,0.4)' : 'rgba(60,90,50,0.18)'); if (next) { c.setLineDash([3, 4]); poly(c, pts, null, 'rgba(255,255,255,0.4)', 1); c.setLineDash([]); const [x, y] = P(L.i + L.size / 2, L.j + L.size / 2); c.fillStyle = 'rgba(255,255,255,0.75)'; c.font = '600 8px Barlow, sans-serif'; c.textAlign = 'center'; c.fillText('OPENS AT LV ' + L.hq, x, y + 3); } return; }
    poly(c, pts, sel ? 'rgba(110,231,255,0.35)' : hov ? 'rgba(255,255,255,0.32)' : 'rgba(196,201,208,0.85)', sel ? '#6ee7ff' : 'rgba(0,0,0,0.25)', sel ? 2 : 0.8);
    const [x, y] = P(L.i + L.size / 2, L.j + L.size / 2); c.strokeStyle = 'rgba(80,90,105,0.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x + 8, y); c.moveTo(x, y - 4); c.lineTo(x, y + 4); c.stroke();
    if (L.special === 'pad') { c.fillStyle = 'rgba(60,70,85,0.8)'; c.font = '700 9px Oxanium, sans-serif'; c.textAlign = 'center'; c.fillText('LAUNCH SITE', x, y + 16); }
  }
  // ---------------- frame ----------------
  daylight() {
    if (this.dayLock !== null) return this.dayLock; const d = new Date(); const h = d.getHours() + d.getMinutes() / 60;
    return smooth(5.5, 7.5, h) * (1 - smooth(18.5, 20.5, h));
  }
  render(s, game, dt) {
    this.t += dt; const c = this.c, t = this.t, dpr = this.dpr; if (!this.ground) this.buildGround(s);
    if (this.camT) { const k = 1 - Math.exp(-dt * 6); this.cam.x += (this.camT.x - this.cam.x) * k; this.cam.y += (this.camT.y - this.cam.y) * k; if (Math.abs(this.camT.x - this.cam.x) + Math.abs(this.camT.y - this.cam.y) < 0.5) this.camT = null; }
    const day = this.daylight(); const night = 1 - day; const dusk = Math.max(0, 1 - Math.abs(day - 0.5) * 2.5);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // sky + sea
    const sky = c.createLinearGradient(0, 0, 0, this.h); const mix = (a, b, k) => { const pa = a.match(/\w\w/g).map((x) => parseInt(x, 16)), pb = b.match(/\w\w/g).map((x) => parseInt(x, 16)); return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',')})`; };
    sky.addColorStop(0, mix('#07122b', '#5aa7e6', day)); sky.addColorStop(0.55, mix('#16244a', dusk > 0.3 ? '#f6b37a' : '#a9d5f5', day)); sky.addColorStop(1, mix('#1b2c55', '#d9eefb', day));
    c.fillStyle = sky; c.fillRect(0, 0, this.w, this.h);
    if (night > 0.2) { const R = rng(3); c.fillStyle = `rgba(255,255,255,${(night - 0.2) * 0.9})`; for (let k = 0; k < 160; k++) { const x = R() * this.w, y = R() * this.h * 0.6; const tw = 0.5 + 0.5 * Math.sin(t * (1 + R() * 2) + k); c.globalAlpha = (night - 0.2) * tw; c.fillRect(x, y, R() < 0.1 ? 2 : 1, R() < 0.1 ? 2 : 1); } c.globalAlpha = 1; }
    c.setTransform(dpr * this.zoom, 0, 0, dpr * this.zoom, dpr * (this.vx() - this.cam.x * this.zoom), dpr * (this.h / 2 - this.cam.y * this.zoom));
    const N = this.lay.N; const hzY = P(-14, -14)[1];
    const sea = c.createLinearGradient(0, hzY, 0, P(N + 14, N + 14)[1]); sea.addColorStop(0, mix('#0b1f3a', '#5f9fd0', day)); sea.addColorStop(1, mix('#081a33', '#2f78b0', day));
    c.fillStyle = sea; c.fillRect(P(-30, N + 30)[0], hzY, P(N + 30, -30)[0] - P(-30, N + 30)[0], 4000);
    // glints on the water
    c.fillStyle = `rgba(255,255,255,${0.25 + day * 0.35})`; const R2 = rng(11); for (let k = 0; k < 90; k++) { const x = P(-20, N + 20)[0] + R2() * (P(N + 20, -20)[0] - P(-20, N + 20)[0]); const y = hzY + 20 + R2() * 900; const a = Math.sin(t * 1.5 + k * 1.7); if (a > 0.6) c.fillRect(x + Math.sin(t * 0.3 + k) * 6, y, 6 * (a - 0.6) * 4, 1); }
    const G = this.ground; c.drawImage(G.cv, G.x0, G.y0, G.cv.width / G.sc, G.cv.height / G.sc);
    // surf line
    c.strokeStyle = `rgba(255,255,255,${0.35 + 0.2 * Math.sin(t * 1.2)})`; c.lineWidth = 1.2; c.beginPath(); G.isl.forEach(([i, j], k) => { const p = P(N / 2 + (i - N / 2) * 1.015, N / 2 + (j - N / 2) * 1.015); k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.closePath(); c.stroke();
    // lots + buildings, back to front
    const hq = game.hqLevel(s, this.base); const B = s.bases[this.base]; const lots = this.lay.lots.slice().sort((a, b) => a.i + a.j + a.size - (b.i + b.j + b.size));
    const lightsAll = []; const fxAll = []; this.labels = [];
    // cars on roads (behind buildings is fine for a cozy look)
    this.drawCars(c, dt, day);
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
    // particles (smoke / steam)
    this.stepParticles(c, dt, day);
    // night: darken, then add lights
    if (night > 0.02) {
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'multiply'; c.fillStyle = `rgba(${Math.round(255 - 190 * night)},${Math.round(255 - 170 * night)},${Math.round(255 - 110 * night)},1)`; c.fillRect(0, 0, this.cv.width, this.cv.height); c.restore();
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
        case 'rocketSlot': this.drawPadRocket(c, x, y, f.T, s); break;
      } }
  }
  // a rocket waiting on the pad (size follows the pad tier); Part 2 replaces it with the real vehicle
  drawPadRocket(c, x, y, T, s) {
    const rk = this.padRocket; const h = rk ? rk.h : 40 + T * 16, w = rk ? rk.w : 7 + T * 1.5; if (this.launching) return;
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
