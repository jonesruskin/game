// EMBERKEEP renderer: dark night, a living ember, glowing wisps, shadow creatures. Procedural, no assets.
import { TAU, clamp, rand, dist2 } from './util.js';
import { WISPS, MAX_LVL, ENEMIES } from './data.js';
import { SLOTS, CORE_R, SPAWN_R } from './sim.js';

const PIPS = [[], [[0, 0]], [[-1, 0], [1, 0]], [[-1, -0.8], [1, -0.8], [0, 0.9]], [[-1, -1], [1, -1], [-1, 1], [1, 1]], [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], [[-1, -1.1], [1, -1.1], [-1, 0], [1, 0], [-1, 1.1], [1, 1.1]], [[-1, -1.1], [1, -1.1], [-1, 0], [1, 0], [-1, 1.1], [1, 1.1], [0, 0]]];

export function drawWisp(ctx, type, lvl, x, y, t, o = {}) {
  const W = WISPS[type]; const R = (o.r || 30) * (1 + (lvl - 1) * 0.03); const bob = Math.sin(t * 2.5 + x * 0.05) * 3;
  y += o.noBob ? 0 : bob;
  const g = ctx.createRadialGradient(x, y, R * 0.2, x, y, R * (1.9 + lvl * 0.12)); g.addColorStop(0, W.glow + 'aa'); g.addColorStop(1, W.glow + '00');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R * (1.9 + lvl * 0.12), 0, TAU); ctx.fill();
  const g2 = ctx.createRadialGradient(x - R * 0.3, y - R * 0.35, R * 0.1, x, y, R); g2.addColorStop(0, '#ffffff'); g2.addColorStop(0.35, W.glow); g2.addColorStop(1, W.color);
  ctx.fillStyle = g2; ctx.strokeStyle = 'rgba(10,8,20,.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); ctx.stroke();
  if (lvl >= 5) { ctx.strokeStyle = lvl >= 7 ? '#ffffff' : lvl >= 6 ? '#ffd23f' : W.glow; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, R + 5 + Math.sin(t * 4) * 1.5, t * 2, t * 2 + TAU * 0.75); ctx.stroke(); }
  if (o.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${o.flash * 3})`; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); }
  // pips (Random-Dice style level read-out)
  ctx.fillStyle = 'rgba(15,10,30,.85)'; const pr = R * 0.12;
  for (const [px, py] of PIPS[lvl]) { ctx.beginPath(); ctx.arc(x + px * R * 0.38, y + py * R * 0.38, pr, 0, TAU); ctx.fill(); }
  ctx.font = `${Math.round(R * 0.62)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (!o.noIcon) { ctx.globalAlpha = 0.95; ctx.fillText(W.icon, x, y - R * 0.95); ctx.globalAlpha = 1; }
}
export function drawEmber(ctx, x, y, R, t, skin, hpK = 1, hit = 0) {
  const c = skin.c; const pulse = 1 + Math.sin(t * 3) * 0.04;
  let g = ctx.createRadialGradient(x, y, R * 0.3, x, y, R * 4.2); g.addColorStop(0, c[1] + '88'); g.addColorStop(1, c[0] + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R * 4.2, 0, TAU); ctx.fill();
  // brazier
  ctx.fillStyle = '#1a1424'; ctx.strokeStyle = '#3a2c4a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y + R * 0.55, R * 1.1, R * 0.42, 0, 0, TAU); ctx.fill(); ctx.stroke();
  // flames: layered teardrops
  for (let k = 0; k < 3; k++) {
    const s = (1 - k * 0.27) * R * pulse; ctx.fillStyle = hit > 0 && k === 0 ? '#ffffff' : c[k];
    ctx.beginPath(); const fl = Math.sin(t * (7 + k) + k) * s * 0.12;
    ctx.moveTo(x - s * 0.8, y + s * 0.35); ctx.quadraticCurveTo(x - s * 0.9, y - s * 0.6, x + fl, y - s * 1.55 - k * 2); ctx.quadraticCurveTo(x + s * 0.9, y - s * 0.6, x + s * 0.8, y + s * 0.35); ctx.quadraticCurveTo(x, y + s * 0.85, x - s * 0.8, y + s * 0.35); ctx.fill();
  }
  if (skin.crown) { ctx.fillStyle = '#ffd60a'; ctx.strokeStyle = '#3a2c00'; ctx.lineWidth = 2; ctx.beginPath(); const cy = y - R * 1.9; ctx.moveTo(x - 14, cy + 10); ctx.lineTo(x - 14, cy - 4); ctx.lineTo(x - 7, cy + 3); ctx.lineTo(x, cy - 9); ctx.lineTo(x + 7, cy + 3); ctx.lineTo(x + 14, cy - 4); ctx.lineTo(x + 14, cy + 10); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  if (hpK < 1) { ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, R * 1.45, 0, TAU); ctx.stroke(); ctx.strokeStyle = hpK > 0.35 ? '#7CFC9A' : '#ff4d6d'; ctx.beginPath(); ctx.arc(x, y, R * 1.45, -Math.PI / 2, -Math.PI / 2 + TAU * hpK); ctx.stroke(); }
}
export function drawShadow(ctx, e, t) {
  const E = e.E; const r = e.r; const wob = Math.sin(e.wob) * 0.08;
  ctx.save(); ctx.translate(e.x, e.y);
  if (e.phased) ctx.globalAlpha = 0.3;
  if (E.boss) { const g = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 2); g.addColorStop(0, 'rgba(255,45,85,.35)'); g.addColorStop(1, 'rgba(255,45,85,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2, 0, TAU); ctx.fill(); }
  ctx.fillStyle = e.hitT > 0 ? '#6a5a7a' : E.color; ctx.strokeStyle = '#05030a'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 14; i++) { const a = (i / 14) * TAU; const rr = r * (1 + Math.sin(a * 3 + e.wob) * 0.1 + wob); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.92); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  if (E.boss) { ctx.fillStyle = '#2a1430'; for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * r * 0.4, -r * 0.7); ctx.quadraticCurveTo(sg * r * 1.2, -r * 1.1, sg * r * 0.95, -r * 1.6); ctx.quadraticCurveTo(sg * r * 0.7, -r * 1.0, sg * r * 0.1, -r * 0.85); ctx.fill(); } }
  // eyes look toward the ember
  const a = Math.atan2(-e.y, -e.x); const ex = Math.cos(a) * r * 0.25, ey = Math.sin(a) * r * 0.2;
  ctx.fillStyle = E.eye; ctx.shadowColor = E.eye; ctx.shadowBlur = 8;
  for (const sg of [-1, 1]) { ctx.beginPath(); ctx.ellipse(ex + sg * r * 0.32, ey - r * 0.1, r * 0.16, r * (E.boss ? 0.12 : 0.2), 0, 0, TAU); ctx.fill(); }
  ctx.shadowBlur = 0;
  if (e.slowMag > 0) { ctx.strokeStyle = 'rgba(127,219,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, TAU); ctx.stroke(); }
  if (e.poison.length) { ctx.fillStyle = '#9ef01a'; for (let i = 0; i < e.poison.length; i++) { const pa = t * 3 + i * 1.3; ctx.beginPath(); ctx.arc(Math.cos(pa) * r * 0.9, Math.sin(pa) * r * 0.9 - 3, 2.5, 0, TAU); ctx.fill(); } }
  ctx.restore();
  if (e.hp < e.maxHp) { const w = r * 2; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(e.x - w / 2, e.y - r - 9, w, 4); ctx.fillStyle = E.boss ? '#ff2d55' : '#ff6b6b'; ctx.fillRect(e.x - w / 2, e.y - r - 9, w * clamp(e.hp / e.maxHp, 0, 1), 4); }
}

export class Renderer {
  constructor(canvas) { this.c = canvas; this.ctx = canvas.getContext('2d'); this.t = 0; this.stars = Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.6 + 0.4, p: Math.random() * TAU })); this.fog = Array.from({ length: 18 }, () => ({ a: rand(TAU), r: rand(300, 640), s: rand(0.02, 0.06) * (Math.random() < 0.5 ? -1 : 1), z: rand(90, 200) })); }
  resize(w, h, dpr) { this.w = w; this.h = h; this.dpr = dpr; this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr); }
  layout(top, bottom) { // fit the battlefield between HUD bars
    const availH = this.h - top - bottom; this.cx = this.w / 2; this.cy = top + availH / 2; this.s = Math.min(this.w / 640, availH / 540); }
  toWorld(sx, sy) { return { x: (sx - this.cx) / this.s, y: (sy - this.cy) / this.s }; }
  slotAt(sx, sy, pad = 1) { const p = this.toWorld(sx, sy); let best = -1, bd = (44 * pad) ** 2; SLOTS.forEach((s, i) => { const d = dist2(p.x, p.y, s.x, s.y); if (d < bd) { bd = d; best = i; } }); return best; }
  draw(run, dt, ui = {}) {
    const ctx = this.ctx, dpr = this.dpr; this.t += dt; const t = this.t; const theme = ui.theme;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, 0, this.h); bg.addColorStop(0, theme.bg[0]); bg.addColorStop(1, theme.bg[1]); ctx.fillStyle = bg; ctx.fillRect(0, 0, this.w, this.h);
    for (const st of this.stars) { ctx.globalAlpha = 0.25 + 0.35 * Math.sin(t * 1.5 + st.p) ** 2; ctx.fillStyle = '#fff'; ctx.fillRect(st.x * this.w, st.y * this.h, st.s, st.s); } ctx.globalAlpha = 1;
    const sh = run ? run.fx.shakeAmt : 0;
    ctx.setTransform(dpr * this.s, 0, 0, dpr * this.s, dpr * (this.cx + rand(-sh, sh)), dpr * (this.cy + rand(-sh, sh)));
    // drifting fog banks in the dark
    for (const f of this.fog) { f.a += f.s * dt; const fx = Math.cos(f.a) * f.r, fy = Math.sin(f.a) * f.r; const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, f.z * 1.6); fg.addColorStop(0, theme.fog + '66'); fg.addColorStop(1, theme.fog + '00'); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(fx, fy, f.z * 1.6, 0, TAU); ctx.fill(); }
    // light pool
    const lp = ctx.createRadialGradient(0, 0, 60, 0, 0, 330); lp.addColorStop(0, 'rgba(255,190,110,.22)'); lp.addColorStop(0.7, 'rgba(255,150,80,.07)'); lp.addColorStop(1, 'rgba(255,150,80,0)'); ctx.fillStyle = lp; ctx.beginPath(); ctx.arc(0, 0, 330, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,110,.12)'; ctx.lineWidth = 2; ctx.setLineDash([6, 12]); ctx.beginPath(); ctx.arc(0, 0, 108, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 200, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (!run) return;
    // slots
    const drag = ui.drag;
    SLOTS.forEach((p, i) => {
      const valid = drag && drag.from !== i && run.canMerge(drag.from, i); const hover = drag && ui.hover === i;
      ctx.fillStyle = valid ? 'rgba(124,252,154,.25)' : 'rgba(30,22,44,.75)'; ctx.strokeStyle = valid ? '#7CFC9A' : hover ? '#fff' : 'rgba(255,190,110,.28)'; ctx.lineWidth = valid ? 3 : 2;
      ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + Math.PI / 6; ctx.lineTo(p.x + Math.cos(a) * 38, p.y + Math.sin(a) * 38); } ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    // wisps
    run.slots.forEach((s, i) => { if (!s || (drag && drag.from === i)) return; const p = SLOTS[i]; const born = Math.min(1, (run.time - s.born) * 5);
      if (ui.selected === i) { ctx.strokeStyle = WISPS[s.type].glow + '66'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.arc(p.x, p.y, WISPS[s.type].range + s.lvl * 6, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(born, born); drawWisp(ctx, s.type, s.lvl, 0, 0, t + i, { flash: s.flash }); ctx.restore(); });
    // core
    drawEmber(ctx, 0, 0, CORE_R, t, ui.skin, run.hp / run.maxHp, run.hitT);
    // enemies
    for (const e of run.enemies) { if (Math.hypot(e.x, e.y) > SPAWN_R + 40) continue; drawShadow(ctx, e, t); }
    // projectiles
    for (const p of run.projs) {
      const z = p.z || 0; if (p.lob) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 8, 4, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(p.x, p.y - z, p.lob ? 9 : p.type === 'core' ? 6 : 5, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    }
    run.fx.draw(ctx);
    // dragged wisp on top
    if (drag && run.slots[drag.from]) { const s = run.slots[drag.from]; const w = this.toWorld(drag.x, drag.y); drawWisp(ctx, s.type, s.lvl, w.x, w.y, t, { noBob: true, r: 34 }); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (run.fx.flashA > 0.01) { ctx.globalAlpha = run.fx.flashA; ctx.fillStyle = run.fx.flashC; ctx.fillRect(0, 0, this.c.width, this.c.height); ctx.globalAlpha = 1; }
    if (run.hp / run.maxHp < 0.3 && !run.over) { const g = ctx.createRadialGradient(this.c.width / 2, this.c.height / 2, this.c.height * 0.35, this.c.width / 2, this.c.height / 2, this.c.width * 0.75); g.addColorStop(0, 'rgba(255,0,40,0)'); g.addColorStop(1, `rgba(255,0,40,${0.2 + 0.1 * Math.sin(t * 8)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, this.c.width, this.c.height); }
  }
}
