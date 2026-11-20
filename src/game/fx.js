// Particles, floating text, screen shake, lightning bolts, rings. All world-space.
import { rand, TAU } from '../util.js';

const MAX_PARTS = 600;
export class FX {
  constructor() { this.parts = []; this.texts = []; this.rings = []; this.bolts = []; this.shakeAmt = 0; this.flashA = 0; this.flashC = '#fff'; this.lowFx = false; }
  burst(x, y, color, n = 10, speed = 200, opts = {}) {
    if (this.lowFx) n = Math.ceil(n / 2);
    for (let i = 0; i < n && this.parts.length < MAX_PARTS; i++) {
      const a = opts.angle !== undefined ? opts.angle + rand(-(opts.spread || 0.5), opts.spread || 0.5) : rand(TAU);
      const s = rand(speed * 0.3, speed);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, opts.life || 0.7), max: 0, size: rand(2, opts.size || 5), color: color === 'rainbow' ? `hsl(${rand(360)},90%,65%)` : color, drag: opts.drag ?? 3, glyph: opts.glyph, grav: opts.grav || 0, shape: opts.shape });
      this.parts[this.parts.length - 1].max = this.parts[this.parts.length - 1].life;
    }
  }
  puff(x, y, color, size = 6, life = 0.5, glyph) {
    if (this.parts.length >= MAX_PARTS) return;
    this.parts.push({ x, y, vx: rand(-20, 20), vy: rand(-30, 0), life, max: life, size, color: color === 'rainbow' ? `hsl(${(performance.now() / 4) % 360},90%,65%)` : color, drag: 2, glyph, grav: 0 });
  }
  text(x, y, str, color = '#fff', size = 18, opts = {}) { this.texts.push({ x, y, str, color, size, life: opts.life || 0.9, max: opts.life || 0.9, vy: opts.vy ?? -70, crit: opts.crit }); }
  ring(x, y, r, color, life = 0.45) { this.rings.push({ x, y, r, color, life, max: life }); }
  bolt(x1, y1, x2, y2, color, life = 0.22) {
    const pts = [[x1, y1]]; const n = 7;
    for (let i = 1; i < n; i++) { const t = i / n; pts.push([x1 + (x2 - x1) * t + rand(-16, 16), y1 + (y2 - y1) * t + rand(-16, 16)]); }
    pts.push([x2, y2]); this.bolts.push({ pts, color, life, max: life });
  }
  shake(a) { this.shakeAmt = Math.min(28, Math.max(this.shakeAmt, a)); }
  flash(color = '#fff', a = 0.5) { this.flashC = color; this.flashA = Math.max(this.flashA, a); }
  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.life -= dt; if (p.life <= 0) { this.parts[i] = this.parts[this.parts.length - 1]; this.parts.pop(); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy = p.vy * d + p.grav * dt;
    }
    for (const arr of [this.texts, this.rings, this.bolts]) for (let i = arr.length - 1; i >= 0; i--) { arr[i].life -= dt; if (arr[i].life <= 0) arr.splice(i, 1); }
    for (const t of this.texts) t.y += t.vy * dt;
    this.shakeAmt *= Math.exp(-10 * dt); if (this.shakeAmt < 0.2) this.shakeAmt = 0;
    this.flashA *= Math.exp(-6 * dt);
  }
  draw(ctx) {
    for (const r of this.rings) { const t = 1 - r.life / r.max; ctx.globalAlpha = (1 - t) * 0.9; ctx.strokeStyle = r.color; ctx.lineWidth = 6 * (1 - t) + 1; ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (0.3 + 0.7 * t), 0, TAU); ctx.stroke(); }
    for (const p of this.parts) {
      ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.5);
      if (p.glyph) { ctx.fillStyle = p.color; ctx.font = `${Math.round(p.size * 2.4)}px sans-serif`; ctx.fillText(p.glyph, p.x, p.y); continue; }
      ctx.fillStyle = p.color;
      if (p.shape === 'sq') ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * p.life / p.max), 0, TAU); ctx.fill(); }
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const b of this.bolts) {
      ctx.globalAlpha = b.life / b.max;
      for (const [w, c] of [[9, b.color], [3, '#fff']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(b.pts[0][0], b.pts[0][1]); for (const p of b.pts) ctx.lineTo(p[0], p[1]); ctx.stroke(); }
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const k = t.life / t.max; ctx.globalAlpha = Math.min(1, k * 2);
      const s = t.size * (t.crit ? 1 + 0.4 * Math.max(0, k - 0.7) * 3 : 1);
      ctx.font = `900 ${Math.round(s)}px 'Trebuchet MS', system-ui, sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(t.str, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
