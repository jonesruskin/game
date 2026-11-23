// STARWARD: the Star Map (Solar System view). Planets on their real orbits at their real periods (one game year =
// two real days), drawn as WebGL worlds lit from the Sun; moons circling their planets; the asteroid and Kuiper
// belts; transfer arcs, ships in flight, outposts, colonies and the state of each launch window.
import { WORLDS, spinTilt } from './planet.js';
import { BODIES, BODY_ORDER, SITES, SHIPS } from '../data/solar.js';
import { sol, angleOf, moonAngle, windowOf, terraStage } from '../core/solar.js';
import { clamp, rng } from '../util.js';

const ring = (c, x, y, r, col, w = 1.5, dash) => { c.strokeStyle = col; c.lineWidth = w; if (dash) c.setLineDash(dash); c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); c.setLineDash([]); };
export class SystemView {
  constructor(g, fx) { this.g = g; this.ok = g.ok; this.fx = fx; this.c = fx.getContext('2d'); this.t = 0; this.zoom = 1; this.pan = { x: 0, y: 0 }; this.picks = []; this.sel = null; this.hover = null; this.tilt = 0.55;
    const R = rng(77); this.belt = Array.from({ length: 520 }, () => ({ a: R() * Math.PI * 2, r: 2.1 + R() * 1.2, s: 0.6 + R() * 0.8 })); this.kuiper = Array.from({ length: 260 }, () => ({ a: R() * Math.PI * 2, r: 32 + R() * 18, s: 0.5 + R() * 0.8 })); }
  resize(w, h, dpr) { this.w = w; this.h = h; this.dpr = dpr; }
  get K() { return Math.min(this.w, this.h * 1.5) * 0.1 * this.zoom; }
  // distance from the Sun on screen: logarithmic, so the crowded inner system and the vast outer one both fit
  dist(a) { return Math.log(1 + 2 * a) * this.K; }
  center() { return [this.w * 0.5 + this.pan.x, this.h * 0.52 + this.pan.y]; }
  // screen position of a body; z (−1..1) is depth (positive = nearer the viewer)
  pos(id, now) {
    const b = BODIES[id]; const [cx, cy] = this.center();
    if (b.parent) { const P = this.pos(b.parent, now); const sib = BODY_ORDER.filter((k) => BODIES[k].parent === b.parent); const i = sib.indexOf(id); const d = P.r + 5 + (i + 1) * (5 + 2.5 * this.zoom); const a = moonAngle(id, now);
      return { x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d * this.tilt, z: Math.sin(a), r: this.size(id) * 0.75, parent: P }; }
    if (id === 'sun') return { x: cx, y: cy, z: 0, r: 14 * Math.pow(this.zoom, 0.3) };
    const a = angleOf(id, now); const rr = this.dist(b.a); return { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * this.tilt, z: Math.sin(a), r: this.size(id), orbit: rr, a };
  }
  size(id) { const r = BODIES[id].r; const big = r > 20000 ? 1.25 : 1; return clamp((2.6 + 3.1 * Math.log10(Math.max(1, r) / 50)) * big, 2.6, 17) * Math.pow(this.zoom, 0.35); }
  zoomAt(f, sx, sy) { const z0 = this.zoom; this.zoom = clamp(this.zoom * f, 0.55, 6); const k = this.zoom / z0; const [cx, cy] = this.center(); this.pan.x += (sx - cx) * (1 - k); this.pan.y += (sy - cy) * (1 - k); }
  panBy(dx, dy) { this.pan.x += dx; this.pan.y += dy; const m = this.K * 7; this.pan.x = clamp(this.pan.x, -m, m); this.pan.y = clamp(this.pan.y, -m * 0.6, m * 0.6); }
  focus(id) { const p = this.pos(id, Date.now()); this.panT = { x: this.pan.x + (this.w * (this.h > this.w ? 0.5 : 0.42) - p.x), y: this.pan.y + (this.h * (this.h > this.w ? 0.32 : 0.5) - p.y) }; }
  render(s, dt) {
    if (!this.ok) return; this.t += dt; const now = Date.now(), t = this.t, g = this.g, c = this.c, dpr = this.dpr; this.picks = [];
    if (this.panT) { const k = 1 - Math.exp(-dt * 5); this.pan.x += (this.panT.x - this.pan.x) * k; this.pan.y += (this.panT.y - this.pan.y) * k; if (Math.abs(this.panT.x - this.pan.x) + Math.abs(this.panT.y - this.pan.y) < 0.5) this.panT = null; }
    const S = sol(s); const [cx, cy] = this.center();
    const P = {}; for (const id of BODY_ORDER) P[id] = this.pos(id, now);
    // ---- 2D underlay pass: orbits, belts, sun (on the overlay canvas, erased where planets sit) ----
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, this.w, this.h);
    for (const id of BODY_ORDER) { const b = BODIES[id]; if (b.parent) continue; const rr = this.dist(b.a); const known = S.surveyed[id] || id === 'earth'; c.strokeStyle = id === this.sel ? 'rgba(110,231,255,0.55)' : known ? 'rgba(170,200,240,0.2)' : 'rgba(170,200,240,0.09)'; c.lineWidth = id === this.sel ? 1.4 : 1; c.beginPath(); c.ellipse(cx, cy, rr, rr * this.tilt, 0, 0, Math.PI * 2); c.stroke(); }
    const beltRot = t * 0.004; c.fillStyle = 'rgba(200,190,170,0.5)'; for (const a of this.belt) { const ang = a.a + beltRot / a.r; const d = this.dist(a.r); c.fillRect(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d * this.tilt, a.s, a.s); }
    c.fillStyle = 'rgba(170,190,220,0.35)'; for (const a of this.kuiper) { const ang = a.a + beltRot * 0.2; const d = this.dist(a.r); c.fillRect(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d * this.tilt, a.s, a.s); }
    // the Sun
    const sr = P.sun ? P.sun.r : 14 * Math.pow(this.zoom, 0.3); const sg = c.createRadialGradient(cx, cy, 0, cx, cy, sr * 5); sg.addColorStop(0, 'rgba(255,255,245,1)'); sg.addColorStop(0.16, 'rgba(255,236,170,0.95)'); sg.addColorStop(0.3, 'rgba(255,170,60,0.35)'); sg.addColorStop(1, 'rgba(255,120,30,0)'); c.fillStyle = sg; c.fillRect(cx - sr * 5, cy - sr * 5, sr * 10, sr * 10);
    this.picks.push({ id: 'sun', x: cx, y: cy, r: sr + 4 });
    // ---- planets (WebGL), back to front ----
    g.begin(t * 0.3, [0.1, 0.14, 0.32], [this.pan.x * 0.0004, this.pan.y * 0.0004]);
    const order = BODY_ORDER.slice().sort((a, b) => P[a].y - P[b].y);
    for (const id of order) { const p = P[id]; const W = WORLDS[BODIES[id].world] || WORLDS.moon; const sx = cx - p.x, sy = cy - p.y; const l = Math.hypot(sx, sy) || 1; const sun = [sx / l * 0.92, -sy / l * 0.92, 0.38];
      const extra = id === 'mars' ? this.marsLook(s) : id === 'earth' ? { p0: [0.02, 1.0, 0.16, 1.0] } : {};
      g.planet(W, p.x, p.y, p.r, spinTilt(t * (BODIES[id].type.includes('giant') ? 0.12 : 0.05) + id.length, 0.3), sun, t, extra); }
    // erase overlay lines where worlds sit, then draw rings, markers and labels
    c.save(); c.globalCompositeOperation = 'destination-out'; for (const id of BODY_ORDER) { const p = P[id]; c.beginPath(); c.arc(p.x, p.y, p.r * 1.02, 0, 7); c.fill(); } c.restore();
    // Saturn's rings (the far half hidden behind the planet)
    { const p = P.saturn; const rx = p.r * 2.3, ry = rx * 0.32; for (const [k, a] of [[1, 0.55], [0.82, 0.4], [0.68, 0.3]]) { c.strokeStyle = `rgba(230,210,170,${a})`; c.lineWidth = Math.max(1, p.r * 0.18); c.save(); c.beginPath(); c.rect(0, 0, this.w, this.h); c.arc(p.x, p.y, p.r, 0, 7, true); c.clip('evenodd'); c.beginPath(); c.ellipse(p.x, p.y, rx * k, ry * k, -0.25, Math.PI, Math.PI * 2); c.stroke(); c.restore(); c.beginPath(); c.ellipse(p.x, p.y, rx * k, ry * k, -0.25, 0, Math.PI); c.stroke(); } }
    // transfer arc to the selected world, coloured by the launch window
    if (this.sel && this.sel !== 'earth' && this.sel !== 'sun' && BODIES[this.sel].zone !== 'home') { const w = windowOf(this.sel, now); const a = P.earth, b = P[this.sel]; this.arc(c, a, b, w.open ? 'rgba(124,242,154,0.85)' : 'rgba(255,209,102,0.6)', [5, 6], 1.6); }
    // voyages and survey probes in flight
    for (const j of s.jobs) { const body = j.kind === 'voyage' ? j.payload.body : j.kind === 'mission' && j.payload.probe ? j.payload.probe : null; if (!body) continue; const p = clamp((now - j.start) / (j.end - j.start)); const a = P.earth, b = P[body]; const q = this.arc(c, a, b, 'rgba(255,255,255,0.18)', [2, 5], 1, p);
      const col = j.kind === 'voyage' ? SHIPS[j.ship].col : '#ffffff'; c.fillStyle = col; c.beginPath(); c.arc(q[0], q[1], 2.6, 0, 7); c.fill(); const gl = c.createRadialGradient(q[0], q[1], 0, q[0], q[1], 9); gl.addColorStop(0, col); gl.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = 0.5; c.fillStyle = gl; c.fillRect(q[0] - 9, q[1] - 9, 18, 18); c.globalAlpha = 1; }
    // markers + labels
    const labelAll = this.zoom > 1.6;
    for (const id of BODY_ORDER) { const p = P[id]; const b = BODIES[id]; const known = S.surveyed[id] || b.zone === 'home'; const site = S.sites[id]; const col = s.bases[id];
      if (col && id !== 'earth') ring(c, p.x, p.y, p.r + 4, 'rgba(255,209,102,0.9)', 1.6); else if (site) ring(c, p.x, p.y, p.r + 3.5, 'rgba(110,231,255,0.85)', 1.4);
      if (this.sel === id) { ring(c, p.x, p.y, p.r + 8 + Math.sin(t * 3) * 1.5, 'rgba(233,244,255,0.9)', 1.2, [3, 3]); }
      this.picks.push({ id, x: p.x, y: p.y, r: Math.max(10, p.r + 6) });
      const show = !b.parent || labelAll || this.sel === id || this.hover === id || (b.parent === this.sel);
      if (show) { c.font = `${b.parent ? 500 : 600} ${b.parent ? 10 : 11.5}px ${b.parent ? 'Barlow' : 'Oxanium'}, sans-serif`; c.textAlign = 'center'; c.fillStyle = known ? (col || site ? '#e9f4ff' : 'rgba(220,232,250,0.8)') : 'rgba(160,175,200,0.55)';
        const txt = (known ? b.name : b.name + ' ?') + (site ? ` · L${site}` : ''); if (b.parent) { c.textAlign = 'left'; c.fillText(txt, p.x + p.r + 4, p.y + 3); c.textAlign = 'center'; } else c.fillText(txt, p.x, p.y + p.r + 14); if (col && id !== 'earth' && col.pop !== undefined) { c.font = '500 10px Barlow, sans-serif'; c.fillStyle = '#ffd166'; if (b.parent) { c.textAlign = 'left'; c.fillText(`${Math.floor(col.pop)} colonists`, p.x + p.r + 4, p.y + 14); c.textAlign = 'center'; } else c.fillText(`${Math.floor(col.pop)} colonists`, p.x, p.y + p.r + 26); } } }
    if (this.hover && this.hover !== this.sel) { const p = P[this.hover] || { x: cx, y: cy, r: 14 }; ring(c, p.x, p.y, p.r + 6, 'rgba(255,255,255,0.4)', 1); }
  }
  // a Hohmann-style arc from a to b bulging away from the Sun; returns the point at fraction p
  arc(c, a, b, col, dash, w, p) { const [cx, cy] = this.center(); const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; let nx = mx - cx, ny = (my - cy) / this.tilt; const l = Math.hypot(nx, ny) || 1; const bulge = Math.hypot(b.x - a.x, b.y - a.y) * 0.35; nx = (nx / l) * bulge; ny = (ny / l) * bulge * this.tilt;
    const qx = mx + nx, qy = my + ny; c.strokeStyle = col; c.lineWidth = w; c.setLineDash(dash); c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo(qx, qy, b.x, b.y); c.stroke(); c.setLineDash([]);
    if (p === undefined) return null; const u = 1 - p; return [u * u * a.x + 2 * u * p * qx + p * p * b.x, u * u * a.y + 2 * u * p * qy + p * p * b.y]; }
  // Mars as terraforming leaves it: seas rise, green spreads, clouds and a bluer sky
  marsLook(s) { const n = terraStage(s, 'mars'), k = n / 7; const water = n >= 5 ? -0.12 + (n - 4) * 0.05 : n >= 3 ? -0.3 : -9; return { p0: [water, 1.0, Math.max(0.03, 0.09 - k * 0.06), 0.0], p1: [0.06 + k * 0.4, 0.35 + k * 0.6, 0.35 * (1 - k * 0.6), 0.0], p2: [n >= 6 ? 0.45 + (n - 6) * 0.4 : 0, 0.5, 0, 1.1] }; }
  pick(x, y) { let best = null, bd = 1e9; for (const p of this.picks) { const d = Math.hypot(p.x - x, p.y - y); if (d < p.r && d < bd) { best = p; bd = d; } } return best ? best.id : null; }
}
export { SITES };
