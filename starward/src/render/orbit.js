// STARWARD: the orbit view. Earth (WebGL), the Moon on its orbit, satellites in their slots, the space station
// built from its actual modules, rockets in flight and the lunar outpost, with picking for every object.
import { Space3D, WORLDS, spinTilt } from './planet.js';
import { SATS, MODULES, ORBITS } from '../data/space.js';
import { slotsFor, satsIn, sp } from '../core/space.js';
import { clamp } from '../util.js';

const SATCOL = { comms: '#ffd166', observe: '#7cf29a', weather: '#6ee7ff', nav: '#b892ff', telescope: '#ffffff', power: '#ff9f43', relay: '#ff6bd6' };
export class OrbitView {
  constructor(glCanvas, fxCanvas) { this.g = new Space3D(glCanvas); this.ok = this.g.ok; this.fx = fxCanvas; this.c = fxCanvas.getContext('2d'); this.t = 0; this.picks = []; this.hover = null; }
  resize(w, h, dpr) { this.w = w; this.h = h; this.dpr = dpr; if (this.ok) this.g.resize(w, h, dpr); this.fx.width = Math.round(w * dpr); this.fx.height = Math.round(h * dpr); this.fx.style.width = w + 'px'; this.fx.style.height = h + 'px'; }
  geo() { const port = this.h > this.w; const R = port ? Math.min(this.w * 0.25, this.h * 0.15) : Math.min(this.w * 0.15, this.h * 0.22); return { cx: this.w * (port ? 0.5 : 0.46), cy: this.h * (port ? 0.45 : 0.5), R, k: clamp(R / 160, 0.75, 1.3), tilt: 0.3, orb: { leo: R * 1.32, geo: R * 1.95, lagrange: R * 2.55 }, moonR: port ? this.w * 0.44 : Math.min(this.w * 0.4, R * 3.4) }; }
  ellipse(o, r, a) { return [o.cx + Math.cos(a) * r, o.cy + Math.sin(a) * r * o.tilt, Math.sin(a)]; }
  render(s, dt) {
    if (!this.ok) return; this.t += dt; const t = this.t, g = this.g, o = this.geo(), c = this.c, dpr = this.dpr; this.picks = [];
    const sun = (() => { const v = [-0.75, 0.25, 0.6]; const l = Math.hypot(...v); return v.map((x) => x / l); })();
    g.begin(t, [0.1, 0.16, 0.36]);
    // Moon position on its (big) orbit
    const ma = t * 0.02 + 1.2; const mry = Math.max(o.moonR * 0.3, o.R * 1.42); const mx = o.cx + Math.cos(ma) * o.moonR, my = o.cy + Math.sin(ma) * mry, mz = Math.sin(ma); this.moonPath = [o.moonR, mry]; const mr = o.R * 0.27 * (1 + mz * 0.08);
    const drawMoon = () => { g.planet(WORLDS.moon, mx, my, mr, spinTilt(ma + 0.5, 0.1), sun, t); this.picks.push({ kind: 'moon', x: mx, y: my, r: mr + 8 }); };
    if (mz < 0) drawMoon();
    g.planet(WORLDS.earth, o.cx, o.cy, o.R, spinTilt(t * 0.035, 0.41), sun, t, { p0: [0.02, 1.0, 0.16, s.bases.earth ? 1.0 : 0] });
    if (mz >= 0) drawMoon();
    // ---- overlay ----
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, this.w, this.h);
    const behind = (x, y, z) => z < 0 && Math.hypot(x - o.cx, y - o.cy) < o.R * 0.98;
    const SP = sp(s);
    c.strokeStyle = 'rgba(220,220,230,0.12)'; c.setLineDash([2, 7]); c.beginPath(); c.ellipse(o.cx, o.cy, o.moonR, mry, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    for (const orbit of ['leo', 'geo', 'lagrange']) {
      const n = slotsFor(s, orbit); if (!n && orbit === 'lagrange') continue; const r = o.orb[orbit];
      c.strokeStyle = orbit === 'leo' ? 'rgba(110,231,255,0.28)' : orbit === 'geo' ? 'rgba(255,209,102,0.22)' : 'rgba(255,107,214,0.2)'; c.lineWidth = 1; c.setLineDash([4, 6]);
      c.beginPath(); c.ellipse(o.cx, o.cy, r, r * o.tilt, 0, Math.PI, Math.PI * 2); c.stroke(); c.setLineDash([]); c.beginPath(); c.ellipse(o.cx, o.cy, r, r * o.tilt, 0, 0, Math.PI); c.stroke();
      const sats = satsIn(s, orbit); const speed = orbit === 'leo' ? 0.18 : orbit === 'geo' ? 0.05 : 0.02;
      for (let k = 0; k < n; k++) { const a = t * speed + (k / n) * Math.PI * 2 + (orbit === 'geo' ? 0.5 : 0); const [x, y, z] = this.ellipse(o, r, a); if (behind(x, y, z)) continue; const sat = sats[k];
        if (sat) { this.drawSat(c, x, y, sat.type, sat.lvl, z, o.k); this.picks.push({ kind: 'sat', idx: SP.sats.indexOf(sat), x, y, r: 12 }); }
        else { c.strokeStyle = 'rgba(255,255,255,0.45)'; c.setLineDash([2, 3]); c.beginPath(); c.arc(x, y, 7, 0, 7); c.stroke(); c.setLineDash([]); c.fillStyle = 'rgba(255,255,255,0.6)'; c.font = '600 10px Barlow, sans-serif'; c.textAlign = 'center'; c.fillText('+', x, y + 3.5); this.picks.push({ kind: 'slot', orbit, x, y, r: 12 }); } }
      c.fillStyle = 'rgba(200,220,255,0.55)'; c.font = '600 10px Oxanium, sans-serif'; c.textAlign = 'left'; const [lx, ly] = this.ellipse(o, r, -0.05); c.fillText(this.h > this.w ? { leo: 'LEO', geo: 'GEO', lagrange: 'L1/L2' }[orbit] : ORBITS[orbit].name.toUpperCase(), lx + 5, ly);
    }
    // station on its own low orbit
    if (SP.modules.core) { const a = t * 0.12 + 2.4; const [x, y, z] = this.ellipse(o, o.orb.leo * 1.12, a); if (!behind(x, y, z)) { this.drawStation(c, x, y, SP.modules, o.k * 0.8 * (1 + z * 0.12)); this.picks.push({ kind: 'station', x, y, r: 26 }); } }
    // flights
    for (const j of s.jobs) { if (j.kind !== 'mission') continue; const p = clamp((Date.now() - j.start) / (j.end - j.start)); let x, y;
      const lunar = j.payload.mission && /lunar/i.test(j.payload.mission); const orbit = j.payload.sat ? SATS[j.payload.sat].orbit : j.payload.module ? 'leo' : null;
      if (lunar) { const k = p; const sx = o.cx + o.R * 0.8, sy = o.cy - o.R * 0.3; const cx2 = (sx + mx) / 2, cy2 = Math.min(sy, my) - o.R * 1.2; x = (1 - k) * (1 - k) * sx + 2 * (1 - k) * k * cx2 + k * k * mx; y = (1 - k) * (1 - k) * sy + 2 * (1 - k) * k * cy2 + k * k * my;
        c.strokeStyle = 'rgba(255,209,102,0.25)'; c.setLineDash([3, 5]); c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(cx2, cy2, mx, my); c.stroke(); c.setLineDash([]); }
      else { const r = orbit ? o.orb[orbit] : o.R * 1.15; const a = -1.2 + p * 5; const rr = o.R + (r - o.R) * Math.min(1, p * 1.6); [x, y] = this.ellipse(o, rr, a); }
      this.drawRocket(c, x, y, t); c.fillStyle = '#ffd166'; c.font = '600 10px Barlow, sans-serif'; c.textAlign = 'left'; c.fillText(j.name, x + 10, y - 6); }
    // moon base lights + label
    if (s.bases.moon) { c.fillStyle = 'rgba(255,220,150,0.9)'; for (let k = 0; k < 5; k++) { const a = k * 1.3; c.fillRect(mx - mr * 0.2 + Math.cos(a) * mr * 0.12, my + Math.sin(a) * mr * 0.1, 1.6, 1.6); } c.fillStyle = 'rgba(233,244,255,0.85)'; c.font = '600 11px Oxanium, sans-serif'; c.textAlign = 'center'; c.fillText(s.bases.moon.name, mx, my + mr + 14); }
    else { c.fillStyle = 'rgba(233,244,255,0.5)'; c.font = '600 11px Oxanium, sans-serif'; c.textAlign = 'center'; c.fillText('THE MOON', mx, my + mr + 14); }
    // hover label
    if (this.hover) { const h = this.hover; let txt = ''; if (h.kind === 'sat') { const x = SP.sats[h.idx]; txt = `${SATS[x.type].name} · Mk ${x.lvl}`; } else if (h.kind === 'slot') txt = `Empty ${ORBITS[h.orbit].name} slot: launch a satellite`; else if (h.kind === 'station') txt = 'Space Station'; else if (h.kind === 'moon') txt = s.bases.moon ? 'Visit the lunar outpost' : 'The Moon'; c.font = '600 12px Barlow, sans-serif'; const w = c.measureText(txt).width + 16; c.fillStyle = 'rgba(8,16,32,0.9)'; c.fillRect(h.x - w / 2, h.y - 34, w, 20); c.fillStyle = '#e9f4ff'; c.textAlign = 'center'; c.fillText(txt, h.x, h.y - 20); }
  }
  pick(x, y) { let best = null, bd = 1e9; for (const p of this.picks) { const d = Math.hypot(p.x - x, p.y - y); if (d < p.r && d < bd) { best = p; bd = d; } } return best; }
  drawSat(c, x, y, type, lvl, z, k = 1) { const col = SATCOL[type] || '#fff'; const s = k * (1 + z * 0.15 + Math.min(0.5, lvl * 0.05)); c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#2f5ea3'; c.fillRect(-11, -2, 7, 4); c.fillRect(4, -2, 7, 4); c.strokeStyle = 'rgba(180,200,240,0.6)'; c.lineWidth = 0.5; c.strokeRect(-11, -2, 7, 4); c.strokeRect(4, -2, 7, 4);
    c.fillStyle = '#d9dee6'; c.fillRect(-3.5, -3.5, 7, 7); c.fillStyle = col; c.fillRect(-2, -2, 4, 4); if (type === 'telescope') { c.fillStyle = '#c9ced6'; c.fillRect(-2.5, -9, 5, 6); }
    c.restore(); const g = c.createRadialGradient(x, y, 0, x, y, 9); g.addColorStop(0, col + '55'); g.addColorStop(1, col + '00'); c.fillStyle = g; c.fillRect(x - 9, y - 9, 18, 18); }
  drawStation(c, x, y, M, k) { c.save(); c.translate(x, y); c.scale(k, k); c.rotate(-0.25);
    const mod = (dx, dy, w, h, col) => { const g = c.createLinearGradient(0, dy - h / 2, 0, dy + h / 2); g.addColorStop(0, '#ffffff'); g.addColorStop(1, col); c.fillStyle = g; c.fillRect(dx - w / 2, dy - h / 2, w, h); c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 0.5; c.strokeRect(dx - w / 2, dy - h / 2, w, h); };
    if (M.solar) { const n = Math.min(4, 1 + Math.floor(M.solar / 3)); for (let k2 = 0; k2 < n; k2++) for (const sd of [-1, 1]) { c.fillStyle = '#d9a440'; c.fillRect(sd * (14 + k2 * 9) - 4, -11, 8, 22); c.strokeStyle = 'rgba(80,50,10,0.5)'; c.strokeRect(sd * (14 + k2 * 9) - 4, -11, 8, 22); } c.fillStyle = '#9aa3ad'; c.fillRect(-14 - 9 * n, -1, 28 + 18 * n, 2); }
    mod(0, 0, 18, 7, '#aab3be'); if (M.lab) mod(-14, 0, 12, 6, '#b9c7d6'); if (M.habitat) mod(15, 0, 14, 9, '#c9b9a6'); if (M.dock) { c.strokeStyle = '#d9dee6'; c.lineWidth = 2; c.beginPath(); c.arc(0, -9, 4, 0, 7); c.stroke(); }
    if (M.depot) { for (const dx of [-5, 5]) { c.fillStyle = '#f1f3f6'; c.beginPath(); c.arc(dx, 8, 3.2, 0, 7); c.fill(); } }
    c.restore(); }
  drawRocket(c, x, y, t) { c.save(); c.translate(x, y); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -6); c.lineTo(2.5, 2); c.lineTo(-2.5, 2); c.closePath(); c.fill(); const fl = 4 + Math.sin(t * 30) * 1.5; const g = c.createLinearGradient(0, 2, 0, 2 + fl * 2); g.addColorStop(0, 'rgba(255,230,150,1)'); g.addColorStop(1, 'rgba(255,100,0,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(-2, 2); c.lineTo(2, 2); c.lineTo(0, 2 + fl * 2); c.closePath(); c.fill(); c.restore(); }
}
