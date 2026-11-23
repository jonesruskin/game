// STARWARD: the stellar neighbourhood in 3D. Real stars at their true positions (projected from RA/Dec/distance),
// procedural neighbours, drop-lines to Sol's equatorial plane for depth, distance rings, survey range, colonies,
// gates and ships in flight. Drag to orbit the camera, pinch / wheel to zoom; zoom far out to see the Milky Way.
import { STARS, STAR_IDS, CLASS, DRIVES } from '../data/stars.js';
import { ist, dist, surveyRange, megaStage } from '../core/stars.js';
import { clamp, rng } from '../util.js';

const SPR = {}; const sprite = (col) => { if (SPR[col]) return SPR[col]; const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'); const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#ffffff'); g.addColorStop(0.12, col); g.addColorStop(0.35, col + '55'); g.addColorStop(1, col + '00'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); return (SPR[col] = cv); };
export class StarsView {
  constructor(g, fx) { this.g = g; this.fx = fx; this.c = fx.getContext('2d'); this.t = 0; this.yaw = 0.6; this.pitch = 0.45; this.zoom = 2; this.sel = null; this.hover = null; this.picks = [];
    const R = rng(91); this.gal = Array.from({ length: 2600 }, (_, k) => { const arm = k % 4; const r = Math.pow(R(), 0.55); const a = arm * (Math.PI / 2) + r * 4.4 + (R() - 0.5) * 0.6; return { x: Math.cos(a) * r, y: Math.sin(a) * r, s: R() < 0.04 ? 1.8 : 0.9, c: r < 0.18 ? '#ffe0b0' : R() < 0.3 ? '#bcd0ff' : '#ffffff' }; }); }
  resize(w, h, dpr) { this.w = w; this.h = h; this.dpr = dpr; }
  scale() { return Math.min(this.w, this.h) / 95 * this.zoom; }
  // camera: yaw about the celestial pole, then pitch; returns screen x, y and depth
  proj(p) { const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const x1 = p[0] * cy - p[1] * sy, y1 = p[0] * sy + p[1] * cy; const y2 = y1 * cp - p[2] * sp, z2 = y1 * sp + p[2] * cp; const k = this.scale(); const persp = 1 / (1 + y2 * 0.004);
    return [this.w * 0.5 + x1 * k * persp, this.h * 0.52 - z2 * k * persp, y2]; }
  rotate(dx, dy) { this.yaw -= dx * 0.006; this.pitch = clamp(this.pitch + dy * 0.004, -1.3, 1.3); }
  zoomAt(f) { this.zoom = clamp(this.zoom * f, 0.08, 6); }
  render(s, dt) {
    this.t += dt; const c = this.c, dpr = this.dpr, I = ist(s), now = Date.now(); this.picks = []; if (!this.drag) this.yaw += dt * 0.012;
    if (this.g && this.g.ok) this.g.begin(this.t * 0.2, [0.16, 0.1, 0.3], [this.yaw * 0.05, this.pitch * 0.05]);
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, this.w, this.h);
    const galaxy = clamp((0.45 - this.zoom) / 0.3, 0, 1); // fade to the Milky Way when zoomed far out
    if (galaxy > 0) this.drawGalaxy(c, galaxy);
    if (galaxy >= 1) return;
    c.globalAlpha = 1 - galaxy;
    // distance rings in Sol's equatorial plane
    for (const r of [10, 20, 30, 40]) { c.strokeStyle = 'rgba(140,170,220,0.16)'; c.lineWidth = 1; c.beginPath(); for (let k = 0; k <= 72; k++) { const a = (k / 72) * Math.PI * 2; const p = this.proj([Math.cos(a) * r, Math.sin(a) * r, 0]); k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke(); const lp = this.proj([r, 0, 0]); c.fillStyle = 'rgba(160,185,230,0.45)'; c.font = '600 10px Oxanium, sans-serif'; c.textAlign = 'left'; c.fillText(r + ' ly', lp[0] + 4, lp[1]); }
    // survey range of the Starshot array
    const sr = surveyRange(s); if (sr) { c.strokeStyle = 'rgba(124,242,154,0.35)'; c.setLineDash([4, 6]); c.beginPath(); for (let k = 0; k <= 72; k++) { const a = (k / 72) * Math.PI * 2; const p = this.proj([Math.cos(a) * sr, Math.sin(a) * sr, 0]); k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke(); c.setLineDash([]); }
    // stars, far to near
    const list = ['sol', ...STAR_IDS].map((id) => { const st = STARS[id]; const p = this.proj(st.pos); return { id, st, p, base: this.proj([st.pos[0], st.pos[1], 0]) }; }).sort((a, b) => b.p[2] - a.p[2]);
    const colonized = new Set(Object.values(I.colonies).map((C) => C.star));
    for (const o of list) { const { id, st, p, base } = o; const real = !st.proc; const known = I.surveyed[id] || id === 'sol';
      c.strokeStyle = `rgba(150,180,230,${real ? 0.22 : 0.1})`; c.lineWidth = 1; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(base[0], base[1]); c.stroke(); c.fillStyle = 'rgba(150,180,230,0.3)'; c.fillRect(base[0] - 1, base[1] - 0.5, 2, 1);
      const cl = CLASS[st.cls]; const r = (id === 'sol' ? 9 : 5 + cl.lum * 4) * (real ? 1 : 0.7) * Math.pow(this.zoom, 0.25); const img = sprite(cl.col); c.globalAlpha = (1 - galaxy) * (real || known ? 1 : 0.6); c.drawImage(img, p[0] - r * 1.6, p[1] - r * 1.6, r * 3.2, r * 3.2); c.globalAlpha = 1 - galaxy;
      if (colonized.has(id)) { c.strokeStyle = 'rgba(255,209,102,0.95)'; c.lineWidth = 1.5; c.beginPath(); c.arc(p[0], p[1], r + 3, 0, 7); c.stroke(); }
      if (I.gates[id]) { c.strokeStyle = 'rgba(255,107,214,0.9)'; c.lineWidth = 1.2; c.beginPath(); c.arc(p[0], p[1], r + 6, 0, 7); c.stroke(); }
      if (this.sel === id) { c.strokeStyle = 'rgba(233,244,255,0.9)'; c.setLineDash([3, 3]); c.beginPath(); c.arc(p[0], p[1], r + 9 + Math.sin(this.t * 3), 0, 7); c.stroke(); c.setLineDash([]); }
      this.picks.push({ id, x: p[0], y: p[1], r: Math.max(9, r + 4) });
      if (real || known || this.sel === id || this.hover === id || colonized.has(id)) { c.font = `${real ? 600 : 500} ${real ? 11 : 10}px ${real ? 'Oxanium' : 'Barlow'}, sans-serif`; c.textAlign = 'left'; c.fillStyle = id === 'sol' ? '#ffd166' : known ? '#e9f4ff' : 'rgba(200,215,240,0.6)'; c.fillText(st.name, p[0] + r + 3, p[1] + 3); }
    }
    // ships in flight and sails
    for (const j of s.jobs) { if (j.kind !== 'star' && j.kind !== 'sail') continue; const id = j.kind === 'star' ? j.payload.star : j.star; const a = this.proj([0, 0, 0]), b = this.proj(STARS[id].pos); const k = clamp((now - j.start) / (j.end - j.start));
      c.strokeStyle = j.kind === 'sail' ? 'rgba(124,242,154,0.35)' : 'rgba(255,209,102,0.35)'; c.setLineDash([2, 5]); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.setLineDash([]);
      const x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k; c.fillStyle = j.kind === 'sail' ? '#7cf29a' : DRIVES[j.ship].col; c.beginPath(); c.arc(x, y, 2.5, 0, 7); c.fill(); }
    if (this.sel && this.sel !== 'sol') { const a = this.proj([0, 0, 0]), b = this.proj(STARS[this.sel].pos); c.strokeStyle = 'rgba(233,244,255,0.4)'; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); const d = dist(this.sel); c.fillStyle = '#e9f4ff'; c.font = '600 11px Oxanium, sans-serif'; c.textAlign = 'center'; c.fillText(`${d.toFixed(1)} ly`, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 6); }
    c.globalAlpha = 1;
  }
  drawGalaxy(c, a) { const R = Math.min(this.w, this.h) * 0.46; const cx = this.w / 2, cy = this.h * 0.5; const tilt = 0.55, rot = this.t * 0.01;
    const core = c.createRadialGradient(cx, cy, 0, cx, cy, R * 0.35); core.addColorStop(0, `rgba(255,230,190,${0.55 * a})`); core.addColorStop(1, 'rgba(255,220,180,0)'); c.fillStyle = core; c.fillRect(cx - R, cy - R, R * 2, R * 2);
    for (const p of this.gal) { const x = p.x * Math.cos(rot) - p.y * Math.sin(rot), y = p.x * Math.sin(rot) + p.y * Math.cos(rot); c.globalAlpha = a * 0.8; c.fillStyle = p.c; c.fillRect(cx + x * R, cy + y * R * tilt, p.s, p.s); }
    // the Sun sits in the Orion Spur, about 26,000 light-years from the centre
    const sx = cx + Math.cos(2.2 + rot) * R * 0.62, sy = cy + Math.sin(2.2 + rot) * R * 0.62 * tilt; c.globalAlpha = a; c.strokeStyle = '#ffd166'; c.lineWidth = 1.5; c.beginPath(); c.arc(sx, sy, 6 + Math.sin(this.t * 3), 0, 7); c.stroke(); c.fillStyle = '#ffd166'; c.font = '600 12px Oxanium, sans-serif'; c.textAlign = 'left'; c.fillText('You are here', sx + 10, sy + 4);
    c.fillStyle = 'rgba(233,244,255,0.7)'; c.font = '500 12px Barlow, sans-serif'; c.textAlign = 'center'; c.fillText('The Milky Way · 100,000 light-years across · 100-400 billion stars', cx, this.h - 120); c.globalAlpha = 1; }
  pick(x, y) { let best = null, bd = 1e9; for (const p of this.picks) { const d = Math.hypot(p.x - x, p.y - y); if (d < p.r && d < bd) { best = p; bd = d; } } return best ? best.id : null; }
}
