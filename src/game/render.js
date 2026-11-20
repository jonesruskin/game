// Canvas renderer. Everything procedural — zero image assets, instant load.
import { TAU, clamp, rand, dist2 } from '../util.js';
import { ABILITIES, TIER_COLORS } from '../data/abilities.js';

const OUTLINE = '#0b1320';
const GROUND = '#1f3a3d', GROUND2 = '#22403f';

export function drawHero(ctx, hero, skin, x, y, aim, t, o = {}) {
  const r = o.r || 26; const c1 = skin?.c1 || hero.color, c2 = skin?.c2 || hero.color2;
  const bob = o.moving ? Math.abs(Math.sin(o.walkT || 0)) * 4 : Math.sin(t * 2.2) * 1.2;
  const sq = o.moving ? 1 + Math.sin((o.walkT || 0) * 2) * 0.04 : 1;
  ctx.save(); ctx.translate(x, y - bob - (o.z || 0));
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  // aura fx
  if (skin?.fx === 'aura') { ctx.fillStyle = c2; for (let i = 0; i < 6; i++) { const a = t * 2 + i; ctx.globalAlpha = (o.alpha ?? 1) * 0.25; ctx.beginPath(); ctx.arc(Math.cos(a) * 8, -Math.abs(Math.sin(a * 1.3)) * 14, r * 0.9, 0, TAU); ctx.fill(); } ctx.globalAlpha = o.alpha ?? 1; }
  if (skin?.fx === 'neon') { ctx.shadowColor = c2; ctx.shadowBlur = 18; }
  // weapon arm behind if aiming up
  const ax = Math.cos(aim), ay = Math.sin(aim);
  const drawWeapon = () => {
    ctx.save(); ctx.rotate(aim); const rec = (o.recoil || 0) * 6;
    ctx.fillStyle = OUTLINE; ctx.fillRect(r * 0.55 - rec, -6, r * 0.95, 12);
    ctx.fillStyle = c2; ctx.fillRect(r * 0.6 - rec, -4, r * 0.85, 8);
    ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(r * 0.6 - rec, 0, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(r * 0.6 - rec, 0, 6, 0, TAU); ctx.fill();
    ctx.restore();
  };
  if (ay < -0.2) drawWeapon();
  ctx.scale(1 / sq, sq);
  // body
  ctx.lineWidth = 3.5; ctx.strokeStyle = OUTLINE;
  ctx.fillStyle = o.flash ? '#fff' : c1;
  ctx.beginPath();
  if (hero.look === 'helm') { const s = r * 0.92; roundRect(ctx, -s, -s, s * 2, s * 2, 12); } else ctx.arc(0, 0, r, 0, TAU);
  ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  if (!o.flash) {
    // belly shade
    ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.arc(0, r * 0.9, r * 0.95, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.45, r * 0.35, 0, TAU); ctx.fill();
    if (skin?.fx === 'stars') { ctx.fillStyle = '#fff'; for (let i = 0; i < 7; i++) { const sx = Math.sin(i * 12.9 + t * 0.6) * r * 0.8, sy = Math.cos(i * 7.3 + t * 0.4) * r * 0.8; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4 + i); ctx.fillRect(sx, sy, 2.5, 2.5); } ctx.globalAlpha = o.alpha ?? 1; }
    ctx.restore();
  }
  // look accessories
  drawLook(ctx, hero.look, r, c1, c2, t);
  // eyes
  const ex = ax * 5, ey = ay * 4;
  if (hero.look === 'helm') { ctx.fillStyle = OUTLINE; roundRect(ctx, -r * 0.75, -r * 0.35, r * 1.5, r * 0.5, 6); ctx.fill(); ctx.fillStyle = c2; ctx.fillRect(-r * 0.6 + ex, -r * 0.22 + ey * 0.5, r * 1.2, r * 0.18); }
  else {
    const glow = hero.look === 'hood';
    for (const s of [-1, 1]) {
      ctx.fillStyle = glow ? c2 : '#fff'; ctx.beginPath(); ctx.ellipse(s * r * 0.32 + ex * 0.4, -r * 0.12 + ey * 0.4, r * 0.2, r * 0.26, 0, 0, TAU); ctx.fill();
      if (!glow) { ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(s * r * 0.32 + ex, -r * 0.1 + ey, r * 0.11, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * r * 0.32 + ex + 2, -r * 0.15 + ey, 2, 0, TAU); ctx.fill(); }
    }
    if (hero.look === 'mask') { ctx.fillStyle = c2; ctx.globalAlpha = (o.alpha ?? 1) * 0.85; ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.lineTo(r * 0.75, -r * 0.4); ctx.lineTo(r * 0.6, r * 0.15); ctx.lineTo(0, r * 0.05); ctx.fill(); ctx.globalAlpha = o.alpha ?? 1; }
    // mouth
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.beginPath();
    if (o.hurt) ctx.arc(0, r * 0.42, r * 0.14, Math.PI * 1.15, Math.PI * 1.85); else ctx.arc(0, r * 0.22, r * 0.16, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  drawExtra(ctx, skin?.extra, r, c1, c2, t);
  if (skin?.fx === 'shine') { const k = (t * 0.8) % 2; if (k < 1) { ctx.save(); ctx.globalAlpha = (o.alpha ?? 1) * (1 - Math.abs(k - 0.5) * 2) * 0.8; ctx.fillStyle = '#fff'; ctx.translate(r * 0.4, -r * 0.5); ctx.rotate(t); star(ctx, 0, 0, 7, 2.5); ctx.restore(); } }
  ctx.scale(sq, 1 / sq);
  if (ay >= -0.2) drawWeapon();
  ctx.restore();
}
function star(ctx, x, y, R, r) { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, rr = i % 2 ? r : R; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawLook(ctx, look, r, c1, c2, t) {
  ctx.lineWidth = 3; ctx.strokeStyle = OUTLINE;
  switch (look) {
    case 'flame': for (let i = -1; i <= 1; i++) { const h = r * (0.7 + 0.15 * Math.sin(t * 9 + i * 2)) * (i ? 0.75 : 1); ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(i * r * 0.4 - r * 0.25, -r * 0.8); ctx.quadraticCurveTo(i * r * 0.45, -r * 0.8 - h, i * r * 0.4 + r * 0.25 + Math.sin(t * 7 + i) * 3, -r * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke(); } break;
    case 'bolt': ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-2, -r * 0.9); ctx.lineTo(8, -r * 1.35); ctx.lineTo(1, -r * 1.35); ctx.lineTo(10, -r * 1.85); ctx.lineTo(-8, -r * 1.2); ctx.lineTo(-1, -r * 1.2); ctx.lineTo(-8, -r * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'helm': ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(0, -r * 0.92, 6, 0, TAU); ctx.fill(); ctx.stroke(); break;
    case 'leaf': for (const s of [-1, 1]) { ctx.fillStyle = s < 0 ? '#2d6a4f' : '#52b788'; ctx.beginPath(); ctx.ellipse(s * r * 0.35, -r * 1.0, r * 0.22, r * 0.45, s * 0.6 + Math.sin(t * 3) * 0.1, 0, TAU); ctx.fill(); ctx.stroke(); } ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(r * 0.55, -r * 0.6, 7, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffd60a'; ctx.beginPath(); ctx.arc(r * 0.55, -r * 0.6, 3, 0, TAU); ctx.fill(); break;
    case 'hood': ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.moveTo(-r * 0.95, -r * 0.1); ctx.quadraticCurveTo(-r, -r * 1.1, 0, -r * 1.45); ctx.quadraticCurveTo(r, -r * 1.1, r * 0.95, -r * 0.1); ctx.quadraticCurveTo(0, -r * 0.75, -r * 0.95, -r * 0.1); ctx.fill(); ctx.stroke(); break;
    case 'crown': ctx.fillStyle = c2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.3 - 6, -r * 0.82); ctx.lineTo(i * r * 0.3, -r * (1.25 + (i === 0 ? 0.3 : 0) - Math.abs(i) * 0.08)); ctx.lineTo(i * r * 0.3 + 6, -r * 0.82); ctx.closePath(); ctx.fill(); ctx.stroke(); } break;
    case 'mask': ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.85); ctx.lineTo(-r * 0.2, -r * 1.35); ctx.lineTo(0, -r * 0.9); ctx.lineTo(r * 0.2, -r * 1.35); ctx.lineTo(r * 0.5, -r * 0.85); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'hat': ctx.fillStyle = '#7f4f24'; ctx.beginPath(); ctx.ellipse(0, -r * 0.8, r * 1.15, r * 0.25, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); roundRect(ctx, -r * 0.55, -r * 1.45, r * 1.1, r * 0.7, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = c2; ctx.fillRect(-r * 0.55, -r * 0.98, r * 1.1, 6); break;
  }
}
function drawExtra(ctx, extra, r, c1, c2, t) {
  ctx.lineWidth = 3; ctx.strokeStyle = OUTLINE;
  switch (extra) {
    case 'crown': ctx.fillStyle = '#ffd60a'; ctx.beginPath(); ctx.moveTo(-14, -r - 2); ctx.lineTo(-14, -r - 18); ctx.lineTo(-7, -r - 10); ctx.lineTo(0, -r - 22); ctx.lineTo(7, -r - 10); ctx.lineTo(14, -r - 18); ctx.lineTo(14, -r - 2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(0, -r - 8, 3, 0, TAU); ctx.fill(); break;
    case 'bow': ctx.fillStyle = '#ff4d6d'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.75); ctx.lineTo(r * 0.5 + s * 14, -r * 0.75 - 9); ctx.lineTo(r * 0.5 + s * 14, -r * 0.75 + 9); ctx.closePath(); ctx.fill(); ctx.stroke(); } break;
    case 'visor': ctx.fillStyle = 'rgba(76,201,240,.75)'; roundRect(ctx, -r * 0.8, -r * 0.4, r * 1.6, r * 0.42, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-r * 0.6, -r * 0.33, r * 0.4, 4); break;
    case 'halo': ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 4; ctx.globalAlpha *= 0.9; ctx.beginPath(); ctx.ellipse(0, -r - 14 + Math.sin(t * 3) * 2, r * 0.6, 7, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha /= 0.9; break;
    case 'horns': ctx.fillStyle = '#e9ecef'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.45, -r * 0.75); ctx.quadraticCurveTo(s * r * 1.1, -r * 1.0, s * r * 0.95, -r * 1.55); ctx.quadraticCurveTo(s * r * 0.75, -r * 1.05, s * r * 0.2, -r * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke(); } break;
  }
}

export class Renderer {
  constructor(canvas) { this.c = canvas; this.ctx = canvas.getContext('2d'); this.cam = { x: 0, y: 0, s: 1 }; this.t = 0; }
  resize(w, h, dpr) { this.w = w; this.h = h; this.dpr = dpr; this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr); }
  draw(m, dt) {
    const { ctx } = this; this.t += dt; const t = this.t;
    const W = this.w, H = this.h, dpr = this.dpr;
    const p = m.player;
    const focus = p.alive ? p : (p.killer && p.killer.alive ? p.killer : p);
    const view = Math.max(W, H) < 900 ? 1050 : 1300;
    const s = (Math.max(W, H) / view) * dpr;
    this.cam.x += (focus.x - this.cam.x) * Math.min(1, dt * 10); this.cam.y += (focus.y - this.cam.y) * Math.min(1, dt * 10);
    if (!this.inited) { this.cam.x = focus.x; this.cam.y = focus.y; this.inited = true; }
    this.cam.s = s;
    const sh = m.fx.shakeAmt; const shx = rand(-sh, sh), shy = rand(-sh, sh);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0d1b1e'; ctx.fillRect(0, 0, this.c.width, this.c.height);
    ctx.setTransform(s, 0, 0, s, (W * dpr) / 2 - this.cam.x * s + shx * dpr, (H * dpr) / 2 - this.cam.y * s + shy * dpr);
    const vx0 = this.cam.x - (W * dpr) / 2 / s - 80, vy0 = this.cam.y - (H * dpr) / 2 / s - 80, vx1 = this.cam.x + (W * dpr) / 2 / s + 80, vy1 = this.cam.y + (H * dpr) / 2 / s + 80;
    const inV = (x, y, r = 0) => x + r > vx0 && x - r < vx1 && y + r > vy0 && y - r < vy1;
    const wd = m.world;
    // ground tiles
    ctx.fillStyle = GROUND; ctx.fillRect(0, 0, m.size, m.size);
    ctx.fillStyle = GROUND2; const T = 100;
    for (let x = Math.max(0, Math.floor(vx0 / T) * T); x < Math.min(m.size, vx1); x += T) for (let y = Math.max(0, Math.floor(vy0 / T) * T); y < Math.min(m.size, vy1); y += T) if (((x + y) / T) % 2 === 0) ctx.fillRect(x, y, T, T);
    // decor
    for (const d of wd.decor) { if (!inV(d.x, d.y)) continue; if (d.k === 0) { ctx.fillStyle = '#2c4f4c'; ctx.beginPath(); ctx.arc(d.x, d.y, 6 * d.s, 0, TAU); ctx.fill(); } else if (d.k === 1) { ctx.strokeStyle = '#3a6b5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 4, d.y - 10 * d.s); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 5, d.y - 9 * d.s); ctx.stroke(); } else { ctx.fillStyle = d.k === 2 ? '#ffd6a5' : '#cdb4db'; ctx.beginPath(); ctx.arc(d.x, d.y, 3 * d.s, 0, TAU); ctx.fill(); } }
    ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 8; ctx.strokeRect(0, 0, m.size, m.size);
    // zones (ground)
    for (const z of m.zones) { if (!inV(z.x, z.y, z.r)) continue; this.drawZone(z, t, m); }
    // pickups
    for (const pk of m.pickups) { if (!inV(pk.x, pk.y)) continue; this.drawPickup(pk, t, m); }
    // mines (owner only)
    for (const d of m.deployables) if (d.type === 'mine' && inV(d.x, d.y)) { ctx.globalAlpha = d.owner === p ? 0.9 : 0.16; ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill(); ctx.fillStyle = Math.sin(t * 10) > 0 ? '#fff' : '#e63946'; ctx.beginPath(); ctx.arc(d.x, d.y, 4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    // shadows
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    for (const f of m.fighters) if (f.alive && inV(f.x, f.y) && m.canSeeFromPlayer(f)) { ctx.beginPath(); ctx.ellipse(f.x, f.y + f.r * 0.85, f.r * 0.9, f.r * 0.32, 0, 0, TAU); ctx.fill(); }
    // walls side faces + rocks + crates (depth-sorted simple: walls first)
    for (const w of wd.walls) { if (!inV(w.x + w.w / 2, w.y + w.h / 2, Math.max(w.w, w.h))) continue; ctx.fillStyle = '#26303f'; ctx.fillRect(w.x, w.y + 14, w.w, w.h); }
    // entities sorted by y
    const ents = [];
    for (const f of m.fighters) if (f.alive && inV(f.x, f.y)) ents.push(f);
    for (const d of m.deployables) if (d.type !== 'mine' && !d.dead && inV(d.x, d.y)) ents.push(d);
    for (const o of wd.rocks) if (inV(o.x, o.y, o.r)) ents.push(o);
    for (const o of wd.crates) if (!o.dead && inV(o.x, o.y, o.r)) ents.push(o);
    for (const o of m.tempWalls) if (inV(o.x, o.y, o.r)) ents.push(o);
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) {
      if (e.isFighter) this.drawFighter(e, t, m);
      else if (e.crate) this.drawCrate(e);
      else if (e.type) this.drawDeployable(e, t, m);
      else if (e.life !== undefined) this.drawTempWall(e);
      else this.drawRock(e);
    }
    // wall tops (over entities behind them)
    for (const w of wd.walls) { if (!inV(w.x + w.w / 2, w.y + w.h / 2, Math.max(w.w, w.h))) continue; ctx.fillStyle = '#5b6b84'; ctx.fillRect(w.x, w.y, w.w, w.h); ctx.fillStyle = '#7d8fab'; ctx.fillRect(w.x, w.y, w.w, 6); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.strokeRect(w.x, w.y, w.w, w.h + 14); ctx.strokeStyle = 'rgba(11,19,32,.35)'; ctx.lineWidth = 2; for (let bx = w.x + 34; bx < w.x + w.w - 10; bx += 34) { ctx.beginPath(); ctx.moveTo(bx, w.y + 14); ctx.lineTo(bx, w.y + w.h + 14); ctx.stroke(); } }
    // projectiles
    for (const pr of m.projectiles) { if (!inV(pr.x, pr.y)) continue; this.drawProjectile(pr, t); }
    // lobs
    for (const l of m.lobs) { const k = l.t / l.dur; const x = l.sx + (l.tx - l.sx) * k, y = l.sy + (l.ty - l.sy) * k; const z = Math.sin(k * Math.PI) * 120; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y, 10, 5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = l.color; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - z, 10, 0, TAU); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 0.35; ctx.strokeStyle = l.color; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.arc(l.tx, l.ty, 40, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    // bushes
    const pb = p.alive ? p.bush : null;
    for (const b of wd.bushes) {
      if (!inV(b.x, b.y, b.r)) continue;
      const near = p.alive && dist2(p.x, p.y, b.x, b.y) < (b.r + 50) ** 2;
      ctx.globalAlpha = near || (pb && dist2(pb.x, pb.y, b.x, b.y) < 160 * 160) ? 0.5 : 1;
      ctx.fillStyle = '#1b4d3e'; ctx.beginPath(); ctx.arc(b.x, b.y + 6, b.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2f7d5b'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.95, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3fa074';
      for (let i = 0; i < 5; i++) { const a = b.seed + i * 1.3, rr = b.r * 0.45; ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr - 4 + Math.sin(t * 1.5 + i + b.seed) * 1.5, b.r * 0.35, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    // storm
    this.drawStorm(m, t, vx0, vy0, vx1, vy1);
    m.fx.draw(ctx);
    // overlays: names, hp bars, emotes
    for (const f of m.fighters) { if (!f.alive || !inV(f.x, f.y) || !m.canSeeFromPlayer(f)) continue; this.drawBars(f, m, t); }
    // aim guide for player
    if (p.alive && m.aimGuide) this.drawAimGuide(m, p);
    // offscreen bounty / threat arrows
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (m.fx.flashA > 0.01) { ctx.globalAlpha = m.fx.flashA; ctx.fillStyle = m.fx.flashC; ctx.fillRect(0, 0, this.c.width, this.c.height); ctx.globalAlpha = 1; }
    if (p.alive && m.outsideStorm(p.x, p.y)) { const g = ctx.createRadialGradient(this.c.width / 2, this.c.height / 2, this.c.height * 0.3, this.c.width / 2, this.c.height / 2, this.c.width * 0.7); g.addColorStop(0, 'rgba(155,93,229,0)'); g.addColorStop(1, `rgba(155,93,229,${0.45 + 0.15 * Math.sin(t * 6)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, this.c.width, this.c.height); }
    if (p.alive && p.hp / p.maxHp < 0.3) { const g = ctx.createRadialGradient(this.c.width / 2, this.c.height / 2, this.c.height * 0.35, this.c.width / 2, this.c.height / 2, this.c.width * 0.75); g.addColorStop(0, 'rgba(255,0,40,0)'); g.addColorStop(1, `rgba(255,0,40,${0.25 + 0.12 * Math.sin(t * 8)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, this.c.width, this.c.height); }
  }
  worldToScreen(x, y) { const s = this.cam.s / this.dpr; return { x: (x - this.cam.x) * s + this.w / 2, y: (y - this.cam.y) * s + this.h / 2 }; }
  screenToWorld(x, y) { const s = this.cam.s / this.dpr; return { x: (x - this.w / 2) / s + this.cam.x, y: (y - this.h / 2) / s + this.cam.y }; }

  drawFighter(f, t, m) {
    const ctx = this.ctx; const vis = m.canSeeFromPlayer(f);
    if (!vis) return;
    let alpha = 1;
    if (f.isPlayer && (f.inBush || f.st.invis)) alpha = 0.55;
    else if (f.inBush && f.revealT <= 0) alpha = 0.7;
    if (f.st.invis && !f.isPlayer) alpha = 0.3;
    if (f.st.spawn) alpha *= 0.6 + 0.4 * Math.sin(t * 20);
    f.recoil = Math.max(0, (f.recoil || 0) - 0.15);
    if (f.hitFlash > 0) f.hitFlash -= 1 / 60;
    if (f.isPlayer || f.bounty) { ctx.strokeStyle = f.isPlayer ? '#7CFC9A' : '#ffd60a'; ctx.lineWidth = 3; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.ellipse(f.x, f.y + f.r * 0.85, f.r * 1.15, f.r * 0.42, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    drawHero(ctx, f.hero, f.skin, f.x, f.y, f.aim, t + f.id, { moving: f.moving, walkT: f.walkT, flash: f.hitFlash > 0, alpha, recoil: f.recoil, z: f.z, hurt: m.time - f.lastHurt < 0.4 });
    const st = f.st;
    if (st.fortress) { ctx.strokeStyle = '#ffb703'; ctx.fillStyle = 'rgba(255,183,3,.12)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y, 135, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 8); ctx.stroke(); ctx.globalAlpha = 1; }
    if (st.reflect) { ctx.strokeStyle = '#cdb4db'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(f.x, f.y, f.r + 12, 0, TAU); ctx.stroke(); }
    if (f.shield > 1) { ctx.strokeStyle = 'rgba(160,231,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y, f.r + 6, -Math.PI / 2, -Math.PI / 2 + TAU * (f.shield / 30)); ctx.stroke(); }
    if (st.stun) { for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.fillStyle = '#ffd60a'; ctx.font = '16px sans-serif'; ctx.fillText('★', f.x + Math.cos(a) * 22, f.y - f.r - 14 + Math.sin(a) * 6); } }
    if (st.root) { ctx.strokeStyle = '#2d6a4f'; ctx.lineWidth = 5; for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * f.r * 1.2, f.y + f.r); ctx.quadraticCurveTo(f.x + Math.cos(a) * f.r * 0.4, f.y, f.x + Math.cos(a) * 6, f.y - 6); ctx.stroke(); } }
    if (st.slow) { ctx.fillStyle = 'rgba(160,231,255,.25)'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r + 3, 0, TAU); ctx.fill(); }
    if (st.burn && Math.random() < 0.4) m.fx.puff(f.x + rand(-12, 12), f.y - 10, '#ff9f1c', 5, 0.4);
    if (st.overcharge && Math.random() < 0.3) m.fx.bolt(f.x, f.y, f.x + rand(-40, 40), f.y + rand(-40, 40), '#f8f32b', 0.08);
  }
  drawBars(f, m, t) {
    const ctx = this.ctx; const y = f.y - f.r - 30 - (f.z || 0);
    const w = 64; const k = clamp(f.hp / f.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(11,19,32,.85)'; ctx.fillRect(f.x - w / 2 - 2, y - 2, w + 4, 12);
    ctx.fillStyle = f.isPlayer ? '#7CFC9A' : k > 0.5 ? '#ff6b6b' : '#ff3b3b'; ctx.fillRect(f.x - w / 2, y, w * k, 8);
    if (f.shield > 1) { ctx.fillStyle = '#a0e7ff'; ctx.fillRect(f.x - w / 2, y, w * clamp(f.shield / f.maxHp, 0, 1), 3); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = `800 15px 'Trebuchet MS', system-ui, sans-serif`;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.8)';
    const label = (f.bounty ? '👑 ' : '') + f.name;
    ctx.strokeText(label, f.x, y - 6); ctx.fillStyle = f.isPlayer ? '#7CFC9A' : '#fff'; ctx.fillText(label, f.x, y - 6);
    // ability level pips — shows who's carrying juicy loot
    const lv = f.abilities.reduce((a, b) => a + b.lvl, 0);
    if (lv > 2 && !f.isPlayer) { ctx.font = '800 12px system-ui'; ctx.fillStyle = '#ffd60a'; ctx.strokeText('◆'.repeat(lv - 2), f.x, y + 22); ctx.fillText('◆'.repeat(lv - 2), f.x, y + 22); }
    if (f.emote) { const k2 = Math.min(1, (2.2 - f.emote.t) * 6); ctx.save(); ctx.translate(f.x, y - 34); ctx.scale(k2, k2); ctx.font = `800 20px system-ui, sans-serif`; const tw = ctx.measureText(f.emote.text).width + 20; ctx.fillStyle = '#fff'; roundRect(ctx, -tw / 2, -16, tw, 30, 12); ctx.fill(); ctx.fillStyle = OUTLINE; ctx.textBaseline = 'middle'; ctx.fillText(f.emote.text, 0, 0); ctx.restore(); }
  }
  drawAimGuide(m, p) {
    const ctx = this.ctx; const g = m.aimGuide;
    ctx.globalAlpha = 0.35; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.setLineDash([10, 10]);
    const len = g.range || p.hero.weapon.range;
    if (g.type === 'circle') { ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, TAU); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(g.a) * len, p.y + Math.sin(g.a) * len); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  drawZone(z, t, m) {
    const ctx = this.ctx; const k = clamp(z.life / 0.4, 0, 1);
    switch (z.kind) {
      case 'fire': ctx.globalAlpha = 0.55 * k; ctx.fillStyle = '#ff6b35'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (0.9 + 0.1 * Math.sin(t * 12 + z.x)), 0, TAU); ctx.fill(); ctx.globalAlpha = 0.7 * k; ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 0.5, 0, TAU); ctx.fill(); break;
      case 'bloom': ctx.globalAlpha = 0.35 * k; ctx.fillStyle = '#ff7eb6'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill(); ctx.globalAlpha = k; ctx.font = '34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🌸', z.x, z.y); break;
      case 'smoke': ctx.fillStyle = '#b8b8d1'; for (let i = 0; i < 7; i++) { const a = i * 0.9 + t * 0.3; ctx.globalAlpha = 0.5 * k; ctx.beginPath(); ctx.arc(z.x + Math.cos(a) * z.r * 0.45, z.y + Math.sin(a) * z.r * 0.45, z.r * 0.55, 0, TAU); ctx.fill(); } break;
      case 'roots': ctx.globalAlpha = 0.6 * k; ctx.strokeStyle = '#2d6a4f'; ctx.lineWidth = 6; for (let i = 0; i < 10; i++) { const a = i * 0.63; ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.quadraticCurveTo(z.x + Math.cos(a + 0.5) * z.r * 0.5, z.y + Math.sin(a + 0.5) * z.r * 0.5, z.x + Math.cos(a) * z.r, z.y + Math.sin(a) * z.r); ctx.stroke(); } break;
      case 'jungle': ctx.globalAlpha = 0.4 * k; ctx.fillStyle = '#2d6a4f'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.8 * k; ctx.fillStyle = '#52b788'; for (let i = 0; i < 14; i++) { const a = i * 0.45 + t * 0.2, rr = (i % 3 + 1) * z.r * 0.28; ctx.beginPath(); ctx.ellipse(z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr, 16, 7, a, 0, TAU); ctx.fill(); } break;
      case 'blizzard': ctx.globalAlpha = 0.18 * k; ctx.fillStyle = '#a0e7ff'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.9 * k; ctx.fillStyle = '#fff'; for (let i = 0; i < 26; i++) { const a = i * 0.7 + t * 2.5, rr = ((i * 37) % 100) / 100 * z.r; ctx.fillRect(z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr, 4, 4); } break;
      case 'hole': { ctx.globalAlpha = 0.85 * k; const g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r); g.addColorStop(0, '#000'); g.addColorStop(0.35, '#3c096c'); g.addColorStop(1, 'rgba(123,44,191,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#c77dff'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (0.3 + 0.2 * i), t * (3 + i), t * (3 + i) + 2); ctx.stroke(); } break; }
      case 'telegraph': { const p = 1 - z.life / z.max; ctx.globalAlpha = 0.25 + 0.35 * p; ctx.fillStyle = z.color; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * p, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.9; ctx.strokeStyle = z.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
        const mz = (1 - p) * 700; ctx.fillStyle = '#ff6b35'; ctx.beginPath(); ctx.arc(z.x + mz * 0.4, z.y - mz, 30, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(z.x + mz * 0.4, z.y - mz, 18, 0, TAU); ctx.fill(); break; }
      case 'siphon': { const f = z.owner, tg = z.target; if (f.alive && tg.alive) { ctx.globalAlpha = 0.8; ctx.strokeStyle = '#d00000'; ctx.lineWidth = 6 + Math.sin(t * 20) * 2; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(tg.x, tg.y); ctx.stroke(); } break; }
    }
    ctx.globalAlpha = 1;
  }
  drawPickup(pk, t, m) {
    const ctx = this.ctx; const bob = Math.sin(t * 3 + pk.id) * 4;
    const fade = pk.t > 65 ? (Math.sin(t * 20) > 0 ? 0.4 : 1) : 1;
    ctx.globalAlpha = fade;
    if (pk.kind === 'health') {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(pk.x, pk.y + 14, 14, 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; roundRect(ctx, pk.x - 14, pk.y - 14 + bob, 28, 28, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff4d6d'; ctx.fillRect(pk.x - 4, pk.y - 9 + bob, 8, 18); ctx.fillRect(pk.x - 9, pk.y - 4 + bob, 18, 8);
    } else {
      const ab = ABILITIES[pk.ability]; const tc = TIER_COLORS[Math.min(4, ab.tier)] || '#fff';
      const R = 20 + pk.lvl * 2;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(pk.x, pk.y + 18, 16, 6, 0, 0, TAU); ctx.fill();
      // light beam
      ctx.globalAlpha = 0.18 * fade; ctx.fillStyle = ab.color; ctx.beginPath(); ctx.moveTo(pk.x - 14, pk.y + bob); ctx.lineTo(pk.x - 5, pk.y - 120); ctx.lineTo(pk.x + 5, pk.y - 120); ctx.lineTo(pk.x + 14, pk.y + bob); ctx.fill(); ctx.globalAlpha = fade;
      ctx.fillStyle = ab.color; ctx.strokeStyle = tc; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, R, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, R + 6 + Math.sin(t * 5) * 2, t * 2, t * 2 + 2); ctx.stroke();
      ctx.font = `${R}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ab.icon, pk.x, pk.y + bob + 1);
      if (pk.lvl > 1) { ctx.font = '900 13px system-ui'; ctx.fillStyle = '#ffd60a'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.strokeText('Lv' + pk.lvl, pk.x, pk.y + bob - R - 8); ctx.fillText('Lv' + pk.lvl, pk.x, pk.y + bob - R - 8); }
      const p = m.player; if (p.alive && dist2(p.x, p.y, pk.x, pk.y) < 260 * 260) { ctx.font = '800 13px system-ui'; ctx.fillStyle = '#fff'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.strokeText(ab.name, pk.x, pk.y + bob + R + 14); ctx.fillText(ab.name, pk.x, pk.y + bob + R + 14); }
    }
    ctx.globalAlpha = 1;
  }
  drawCrate(c) {
    const ctx = this.ctx; const s = c.r; const sh = c.hitFlash > 0 ? 2 : 0; if (c.hitFlash > 0) c.hitFlash -= 1 / 60;
    ctx.fillStyle = '#6b4226'; ctx.fillRect(c.x - s + sh, c.y - s + 10, s * 2, s * 2);
    ctx.fillStyle = c.hitFlash > 0 ? '#ffe0a3' : '#b07240'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
    ctx.fillRect(c.x - s + sh, c.y - s, s * 2, s * 2); ctx.strokeRect(c.x - s + sh, c.y - s, s * 2, s * 2 + 10);
    ctx.strokeStyle = '#7f4f24'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(c.x - s + 5 + sh, c.y - s + 5); ctx.lineTo(c.x + s - 5 + sh, c.y + s - 5); ctx.moveTo(c.x + s - 5 + sh, c.y - s + 5); ctx.lineTo(c.x - s + 5 + sh, c.y + s - 5); ctx.stroke();
    ctx.fillStyle = '#ffd60a'; ctx.font = '900 14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', c.x + sh, c.y);
    if (c.hp < c.maxHp) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(c.x - s, c.y - s - 12, s * 2, 5); ctx.fillStyle = '#ffd60a'; ctx.fillRect(c.x - s, c.y - s - 12, s * 2 * (c.hp / c.maxHp), 5); }
  }
  drawRock(o) {
    const ctx = this.ctx;
    ctx.fillStyle = '#3d4a5c'; ctx.beginPath(); ctx.arc(o.x, o.y + 8, o.r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6c7a91'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8796ad'; ctx.beginPath(); ctx.arc(o.x - o.r * 0.3, o.y - o.r * 0.3, o.r * 0.4, 0, TAU); ctx.fill();
  }
  drawTempWall(w) {
    const ctx = this.ctx; const k = clamp(w.life / 0.5, 0, 1);
    ctx.globalAlpha = 0.5 + 0.5 * k; ctx.fillStyle = w.color; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(w.x - w.r * 0.3, w.y - w.r * 0.35, w.r * 0.35, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  drawDeployable(d, t, m) {
    const ctx = this.ctx;
    if (d.type === 'decoy' || d.type === 'clone') {
      drawHero(ctx, d.hero, d.skin, d.x, d.y, d.angle, t + d.id, { moving: d.moving, walkT: d.walkT, alpha: d.type === 'clone' ? 0.75 : 1, flash: d.hitFlash > 0 });
      if (d.type === 'decoy') { const y = d.y - d.r - 30; ctx.fillStyle = 'rgba(11,19,32,.85)'; ctx.fillRect(d.x - 34, y - 2, 68, 12); ctx.fillStyle = d.owner.isPlayer ? '#7CFC9A' : '#ff6b6b'; ctx.fillRect(d.x - 32, y, 64 * clamp(d.owner.hp / d.owner.maxHp, 0, 1), 8); ctx.font = `800 15px 'Trebuchet MS', system-ui`; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.strokeText(d.owner.name, d.x, y - 6); ctx.fillStyle = d.owner.isPlayer ? '#7CFC9A' : '#fff'; ctx.fillText(d.owner.name, d.x, y - 6); }
    } else if (d.type === 'turret') {
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(d.x, d.y + 14, 20, 7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#495057'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.angle); ctx.fillStyle = '#ffbe0b'; ctx.fillRect(0, -5, 26, 10); ctx.strokeRect(0, -5, 26, 10); ctx.restore();
      ctx.fillStyle = d.owner.isPlayer ? '#7CFC9A' : '#ff4d6d'; ctx.beginPath(); ctx.arc(d.x, d.y, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(d.x - 20, d.y - 32, 40, 5); ctx.fillStyle = '#ffbe0b'; ctx.fillRect(d.x - 20, d.y - 32, 40 * (d.life / d.max), 5);
    }
  }
  drawProjectile(p, t) {
    const ctx = this.ctx; const a = Math.atan2(p.vy, p.vx);
    if (p.tether && p.owner.alive) { ctx.strokeStyle = '#f15bb5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.owner.x, p.owner.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
    const len = Math.min(48, p.speed / 30) * (p.glow ? 1.6 : 1);
    ctx.globalAlpha = 0.45; ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(0, -p.r * 0.8); ctx.lineTo(0, p.r * 0.8); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    if (p.kind === 'blade') { ctx.rotate(t * 20); ctx.fillStyle = p.color; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i < 3; i++) { const b = (i / 3) * TAU; ctx.lineTo(Math.cos(b) * p.r * 1.4, Math.sin(b) * p.r * 1.4); ctx.lineTo(Math.cos(b + 1) * p.r * 0.5, Math.sin(b + 1) * p.r * 0.5); } ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else { ctx.fillStyle = p.color; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.3, p.r, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(p.r * 0.3, -p.r * 0.2, p.r * 0.4, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  drawStorm(m, t, vx0, vy0, vx1, vy1) {
    const ctx = this.ctx; const s = m.storm;
    ctx.save();
    ctx.beginPath(); ctx.rect(vx0 - 200, vy0 - 200, vx1 - vx0 + 400, vy1 - vy0 + 400); ctx.arc(s.x, s.y, Math.max(1, s.r), 0, TAU, true);
    ctx.fillStyle = 'rgba(90,24,154,.42)'; ctx.fill('evenodd');
    ctx.restore();
    // edge
    ctx.strokeStyle = '#e0aaff'; ctx.lineWidth = 10; ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 4); ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(1, s.r), 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#c77dff'; ctx.lineWidth = 3; ctx.setLineDash([30, 22]); ctx.lineDashOffset = -t * 60; ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(1, s.r + 14), 0, TAU); ctx.stroke();
    // next zone
    if (s.state !== 'done') { ctx.strokeStyle = '#fff'; ctx.globalAlpha = 0.55; ctx.lineWidth = 4; ctx.setLineDash([16, 16]); ctx.lineDashOffset = 0; ctx.beginPath(); ctx.arc(s.next.x, s.next.y, Math.max(1, s.next.r), 0, TAU); ctx.stroke(); }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    // storm lightning sparks near edge
    if (Math.random() < 0.06) { const a = rand(TAU); const x = s.x + Math.cos(a) * (s.r + 60), y = s.y + Math.sin(a) * (s.r + 60); if (x > vx0 && x < vx1 && y > vy0 && y < vy1) m.fx.bolt(x, y - 260, x + rand(-30, 30), y, '#e0aaff', 0.18); }
  }
}

// Minimap (screen-space, own canvas)
export function drawMinimap(ctx, m, size) {
  const k = size / m.size; ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(15,35,38,.85)'; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(47,125,91,.6)'; for (const b of m.world.bushes) ctx.fillRect(b.x * k - 1.5, b.y * k - 1.5, 3, 3);
  ctx.fillStyle = 'rgba(125,143,171,.8)'; for (const w of m.world.walls) ctx.fillRect(w.x * k, w.y * k, Math.max(1, w.w * k), Math.max(1, w.h * k));
  const s = m.storm;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, size, size); ctx.arc(s.x * k, s.y * k, Math.max(0.5, s.r * k), 0, TAU, true); ctx.fillStyle = 'rgba(123,44,191,.55)'; ctx.fill('evenodd'); ctx.restore();
  ctx.strokeStyle = '#fff'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(s.next.x * k, s.next.y * k, Math.max(0.5, s.next.r * k), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  const p = m.player;
  for (const f of m.fighters) {
    if (!f.alive || f === p) continue;
    const show = f.bounty || (p.st && p.st.reveal) || (dist2(f.x, f.y, p.x, p.y) < 700 * 700 && m.canSeeFromPlayer(f));
    if (!show) continue;
    ctx.fillStyle = f.bounty ? '#ffd60a' : '#ff4d6d'; ctx.beginPath(); ctx.arc(f.x * k, f.y * k, f.bounty ? 4 : 3, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#7CFC9A'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x * k, p.y * k, 4.5, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
}
