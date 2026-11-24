// STARWARD: battle replays. Plays back a battle() result round by round on a canvas: two battle lines of ship
// stacks drawn procedurally, lasers (cyan beams), missiles (arcing trails), railgun slugs (white streaks),
// explosions where ships die, and live counts. Deterministic: the result already holds every shot.
import { UNIT } from '../core/war.js';
import { WARSHIPS, SWARM, DEFENCE } from '../data/war.js';
const COL = { laser: '#6ee7ff', missile: '#ffb347', rail: '#ffffff' };
// a little silhouette for each kind of unit, facing right (player) or left (enemy)
export function drawUnit(c, k, x, y, s, dir) {
  c.save(); c.translate(x, y); c.scale(dir * s, s);
  const sw = !!SWARM[k];
  if (DEFENCE[k]) { c.fillStyle = '#9aa2ad'; c.fillRect(-6, -2, 12, 8); c.fillStyle = k === 'battery' ? '#6ee7ff' : '#ffb347'; c.beginPath(); c.arc(0, -2, 5, Math.PI, 0); c.fill(); c.restore(); return; }
  if (sw) { const g = c.createRadialGradient(-2, -2, 1, 0, 0, 10); g.addColorStop(0, '#ff9a8a'); g.addColorStop(1, '#6b1a12'); c.fillStyle = g;
    if (k === 'drone') { c.beginPath(); c.moveTo(7, 0); c.quadraticCurveTo(-2, -5, -6, 0); c.quadraticCurveTo(-2, 5, 7, 0); c.fill(); }
    else if (k === 'warrior') { c.beginPath(); for (let a = 0; a < 7; a++) { const r = a % 2 ? 5 : 10; c.lineTo(Math.cos(a * 0.9 - 2.7) * r, Math.sin(a * 0.9 - 2.7) * r); } c.closePath(); c.fill(); }
    else if (k === 'brood') { c.beginPath(); c.ellipse(0, 0, 13, 8, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,200,120,0.6)'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(i * 5, 2, 2, 0, 7); c.fill(); } }
    else { c.beginPath(); c.ellipse(0, 0, 26, 18, 0, 0, 7); c.fill(); c.fillStyle = '#ff3b3b'; c.beginPath(); c.arc(10, -3, 4, 0, 7); c.fill(); c.strokeStyle = '#4a0f08'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-10, -8 + i * 3); c.quadraticCurveTo(-28, -12 + i * 5, -34, -6 + i * 4); c.stroke(); } }
    c.restore(); return; }
  const L = { corvette: 7, frigate: 10, destroyer: 12, cruiser: 15, battleship: 19, carrier: 22 }[k] || 8; const g = c.createLinearGradient(0, -L / 2, 0, L / 2); g.addColorStop(0, '#f2f5f8'); g.addColorStop(1, '#7d8794'); c.fillStyle = g;
  c.beginPath(); c.moveTo(L, 0); c.lineTo(-L * 0.7, -L * 0.35); c.lineTo(-L * 0.5, 0); c.lineTo(-L * 0.7, L * 0.35); c.closePath(); c.fill();
  if (k === 'carrier') { c.fillStyle = '#596270'; c.fillRect(-L * 0.6, -L * 0.18, L * 1.2, L * 0.36); }
  c.fillStyle = '#6ee7ff'; c.fillRect(-L * 0.75, -1, 3, 2); c.restore();
}
export class BattleReplay {
  constructor(canvas, res, labels) { this.cv = canvas; this.c = canvas.getContext('2d'); this.res = res; this.labels = labels; this.t = 0; this.r = 0; this.done = false; this.fx = []; this.speed = 1; }
  layout(side, list) { const W = this.cv.width / this.dpr, H = this.cv.height / this.dpr; const x0 = side === 'A' ? W * 0.18 : W * 0.82; const n = list.length; return list.map(([k], i) => [k, x0 + (side === 'A' ? -1 : 1) * (UNIT(k).size === 'XL' ? 30 : UNIT(k).size === 'L' ? 15 : 0), H * 0.2 + (i + 0.5) * (H * 0.62 / Math.max(1, n))]); }
  frame(dt, dpr) {
    this.dpr = dpr; const c = this.c, W = this.cv.width / dpr, H = this.cv.height / dpr, R = this.res; const per = 1.6 / this.speed; this.t += dt;
    if (!this.done && this.t > per) { this.t = 0; this.r++; if (this.r >= R.rounds.length) this.done = true; else this.spawn(); }
    c.setTransform(dpr, 0, 0, dpr, 0, 0); const bg = c.createLinearGradient(0, 0, W, 0); bg.addColorStop(0, '#071224'); bg.addColorStop(0.5, '#050a16'); bg.addColorStop(1, '#1a0808'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
    for (let k = 0; k < 90; k++) { c.fillStyle = `rgba(255,255,255,${0.2 + ((k * 37) % 10) / 20})`; c.fillRect((k * 131) % W, (k * 71) % H, 1, 1); }
    const snap = this.r === 0 ? { A: Object.entries(R.startA), B: Object.entries(R.startB) } : { A: R.rounds[Math.min(this.r, R.rounds.length) - 1].A, B: R.rounds[Math.min(this.r, R.rounds.length) - 1].B };
    this.pos = { A: Object.fromEntries(this.layout('A', snap.A).map(([k, x, y]) => [k, [x, y]])), B: Object.fromEntries(this.layout('B', snap.B).map(([k, x, y]) => [k, [x, y]])) };
    for (const side of ['A', 'B']) for (const [k, n] of snap[side]) { const [x, y] = this.pos[side][k]; const m = Math.min(12, Math.ceil(Math.sqrt(n)));
      for (let i = 0; i < m; i++) drawUnit(c, k, x + (side === 'A' ? -1 : 1) * (i % 4) * 12 + Math.sin(this.t * 2 + i) * 1.5, y + (Math.floor(i / 4) - 1) * 9, UNIT(k).size === 'XL' ? 1.4 : 1, side === 'A' ? 1 : -1);
      c.globalAlpha = n ? 1 : 0.3; c.fillStyle = side === 'A' ? '#9fe8ff' : '#ff9a8a'; c.font = '600 11px Oxanium, sans-serif'; c.textAlign = side === 'A' ? 'right' : 'left'; c.fillText(`${n} ${UNIT(k).name}`, x + (side === 'A' ? -48 : 48), y + 4); c.globalAlpha = 1; }
    // shots and explosions
    for (const f of this.fx) { f.t += dt * this.speed; if (f.t < 0) continue; const p = Math.min(1, f.t / f.life); if (f.kind === 'shot') { const x = f.x0 + (f.x1 - f.x0) * p, y = f.y0 + (f.y1 - f.y0) * p - (f.w === 'missile' ? Math.sin(p * Math.PI) * 40 : 0);
        if (f.w === 'laser') { c.strokeStyle = `rgba(110,231,255,${1 - p})`; c.lineWidth = 1.5; c.beginPath(); c.moveTo(f.x0, f.y0); c.lineTo(f.x1, f.y1); c.stroke(); }
        else { c.fillStyle = COL[f.w]; c.beginPath(); c.arc(x, y, f.w === 'rail' ? 1.6 : 2.2, 0, 7); c.fill(); if (f.w === 'missile') { c.fillStyle = 'rgba(255,180,90,0.35)'; c.beginPath(); c.arc(x - (f.x1 - f.x0) * 0.02, y + 2, 3, 0, 7); c.fill(); } } }
      else { const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, 6 + p * 22); g.addColorStop(0, `rgba(255,240,200,${1 - p})`); g.addColorStop(0.4, `rgba(255,140,40,${0.8 * (1 - p)})`); g.addColorStop(1, 'rgba(255,60,20,0)'); c.fillStyle = g; c.fillRect(f.x - 30, f.y - 30, 60, 60); } }
    this.fx = this.fx.filter((f) => f.t < f.life);
    c.fillStyle = '#e9f4ff'; c.font = '600 13px Oxanium, sans-serif'; c.textAlign = 'center'; c.fillText(this.done ? '' : `ROUND ${Math.max(1, this.r)} / ${R.rounds.length}`, W / 2, 24);
    c.font = '600 12px Oxanium, sans-serif'; c.fillStyle = '#9fe8ff'; c.textAlign = 'left'; c.fillText(this.labels[0], 14, 24); c.fillStyle = '#ff9a8a'; c.textAlign = 'right'; c.fillText(this.labels[1], W - 14, 24);
    if (this.done) { c.fillStyle = 'rgba(5,10,22,0.75)'; c.fillRect(0, H / 2 - 30, W, 60); c.fillStyle = this.labels[2] ? '#7cf29a' : '#ff6b6b'; c.font = '700 26px Oxanium, sans-serif'; c.textAlign = 'center'; c.fillText(this.labels[2] ? 'VICTORY' : 'DEFEAT', W / 2, H / 2 + 9); }
  }
  spawn() { const rd = this.res.rounds[this.r - 1]; if (!rd) return; const best = {}; for (const sh of rd.shots) { const key = sh.side + sh.a + sh.b; if (!best[key] || best[key].d < sh.d) best[key] = sh; }
    for (const sh of Object.values(best)) { const from = this.pos[sh.side][sh.a], to = this.pos[sh.side === 'A' ? 'B' : 'A'][sh.b]; if (!from || !to) continue; const w = UNIT(sh.a).wpn; const n = Math.min(5, 1 + Math.floor(Math.log10(1 + sh.d / 500)));
      for (let i = 0; i < n; i++) this.fx.push({ kind: 'shot', w, x0: from[0], y0: from[1] + (i - n / 2) * 4, x1: to[0] + (Math.random() - 0.5) * 20, y1: to[1] + (Math.random() - 0.5) * 16, t: -i * 0.08 - Math.random() * 0.3, life: w === 'laser' ? 0.35 : 0.9 }); }
    for (const k of rd.kills) { const p = this.pos[k.side][k.k]; if (!p) continue; for (let i = 0; i < Math.min(6, k.n); i++) this.fx.push({ kind: 'boom', x: p[0] + (Math.random() - 0.5) * 40, y: p[1] + (Math.random() - 0.5) * 20, t: -0.6 - Math.random() * 0.5, life: 0.8 }); } }
}
