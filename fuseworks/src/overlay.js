// Crisp 2D overlay above the WebGL sky: reach previews, link lines, floating numbers, callouts, tutorial hand.
import { SHELLS, COLORS } from './content.js';
import { TAU } from './util.js';
const FONT = "'Lilita One', 'Arial Black', Impact, sans-serif";
const HAND = new Path2D('M20 34V14a4 4 0 0 1 8 0v14V8a4 4 0 0 1 8 0v20V12a4 4 0 0 1 8 0v18-8a4 4 0 0 1 8 0v18c0 12-8 20-20 20-8 0-14-4-18-12l-6-10a4 4 0 0 1 7-4z');
const COL = { s: '#5fe1ff', h: '#ffa63d', x: '#ff3d7f', $: '#ffd23f', say: '#ffffff', sync: '#bff6ff', streak: '#ffe08a', rainbow: '#ffffff', luck: '#7dff8a', bad: '#9fdcff', mute: '#b4a8d6', nova: '#ffd23f', finale: '#ffd23f' };

export class Overlay {
  constructor(cv) { this.cv = cv; this.g = cv.getContext('2d'); this.pops = []; this.t = 0; this.w = 1; this.h = 1; this.dpr = 1; this.ox = 0; this.oy = 0; this.s = 1; }
  resize(w, h, dpr) { this.w = w; this.h = h; this.dpr = dpr; this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr); this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px'; }
  view(ox, oy, s) { this.ox = ox; this.oy = oy; this.s = s; }
  X(x) { return this.ox + x * this.s; } Y(y) { return this.oy + y * this.s; }
  // floating number / word at a world position; stacks upward when several land on the same shell
  pop(x, y, text, cls = 'say', o = {}) {
    let stack = 0; for (const p of this.pops) if (p.t < 0.35 && Math.abs(p.x - x) < 30 && Math.abs(p.y - y) < 30) stack++;
    this.pops.push({ x, y, text, cls, t: 0, life: o.life || (cls === 'say' || o.word ? 1.15 : 0.9), dy: -stack * 22, size: o.size || (o.word ? 26 : cls === 'x' ? 25 : 20), rot: o.word ? (Math.random() - 0.5) * 0.16 : 0, word: o.word, color: o.color });
    if (this.pops.length > 160) this.pops.splice(0, this.pops.length - 160);
  }
  zonePath(sky, s, px, py, from) {
    const Z = SHELLS[s.type].zone; const k = sky.zoneK(s); const p = new Path2D(); const sc = this.s; const ox = this.X(px + (sky.ctx.boss === 'gale' ? 90 : 0)), oy = this.Y(py);
    const circ = (r) => { p.moveTo(ox + r, oy); p.arc(ox, oy, r, 0, TAU); };
    if (sky.ctx.mods.bigBang && s.starter) { p.rect(this.X(0), this.Y(0), sky.W * sc, sky.H * sc); return { p, even: false }; }
    switch (Z.k) {
      case 'circle': circ(Z.r * k * sc); break;
      case 'ring': circ(Z.r1 * k * sc); p.moveTo(ox + Z.r0 * k * sc, oy); p.arc(ox, oy, Z.r0 * k * sc, 0, TAU, true); return { p, even: true };
      case 'willow': circ(Z.r * k * sc); p.rect(ox - Z.w * k * sc, oy, Z.w * 2 * k * sc, Z.l * k * sc); break;
      case 'palm': circ(Z.r * k * sc); p.moveTo(ox, oy); p.arc(ox, oy, Z.l * k * sc, -Math.PI / 2 - Z.a, -Math.PI / 2 + Z.a); p.closePath(); break;
      case 'cross': circ(Z.r * k * sc); p.rect(ox - Z.l * k * sc, oy - Z.w * k * sc, Z.l * 2 * k * sc, Z.w * 2 * k * sc); p.rect(ox - Z.w * k * sc, oy - Z.l * k * sc, Z.w * 2 * k * sc, Z.l * 2 * k * sc); break;
      case 'comet': {
        circ(Z.r * k * sc);
        if (from) { const save = [s.x, s.y]; s.x = px; s.y = py; const P = sky.cometPath(s, from); s.x = save[0]; s.y = save[1]; const w = Z.w * k * sc; const a = Math.atan2(P.dy, P.dx); const ex = this.X(P.x1), ey = this.Y(P.y1); const nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
          p.moveTo(this.X(P.x0) + nx, this.Y(P.y0) + ny); p.lineTo(ex + nx, ey + ny); p.lineTo(ex - nx, ey - ny); p.lineTo(this.X(P.x0) - nx, this.Y(P.y0) - ny); p.closePath(); p.moveTo(ex + Z.r * k * sc, ey); p.arc(ex, ey, Z.r * k * sc, 0, TAU); }
        break;
      }
      case 'spider': circ(Z.r * k * sc); break;
    }
    return { p, even: false };
  }
  drawReach(sky, s, px, py, from, strength = 1) {
    const g = this.g; const c = COLORS[s.color].hex; const { p, even } = this.zonePath(sky, s, px, py, from);
    g.save(); g.globalAlpha = 0.12 * strength; g.fillStyle = c; g.fill(p, even ? 'evenodd' : 'nonzero');
    g.globalAlpha = 0.85 * strength; g.strokeStyle = c; g.lineWidth = 2; g.setLineDash([7, 6]); g.lineDashOffset = -this.t * 22; g.stroke(p); g.restore();
  }
  drawLinks(src, px, py, targets, color) {
    const g = this.g; g.save(); g.lineCap = 'round';
    for (const d of targets) { const x0 = this.X(px), y0 = this.Y(py), x1 = this.X(d.x), y1 = this.Y(d.y); const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, color + 'ee'); gr.addColorStop(1, color + '33'); g.strokeStyle = gr; g.lineWidth = 3; g.setLineDash([2, 9]); g.lineDashOffset = -this.t * 30; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
    g.restore();
  }
  drawHand(x, y, mode, x2, y2) {
    const g = this.g; const t = this.t; let hx = x, hy = y, press = 0;
    if (mode === 'tap') { const q = (t * 1.2) % 1; press = q < 0.25 ? q / 0.25 : q < 0.45 ? 1 - (q - 0.25) / 0.2 : 0; if (q < 0.6) { g.save(); g.globalAlpha = (1 - q / 0.6) * 0.8; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 14 + q * 60, 0, TAU); g.stroke(); g.restore(); } }
    else if (mode === 'drag') { const q = (t * 0.55) % 1; const e = q < 0.15 ? 0 : q > 0.85 ? 1 : (q - 0.15) / 0.7; const k = e * e * (3 - 2 * e); hx = x + (x2 - x) * k; hy = y + (y2 - y) * k; press = q > 0.1 && q < 0.9 ? 1 : 0; g.save(); g.globalAlpha = 0.5; g.strokeStyle = '#fff'; g.setLineDash([6, 8]); g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); g.restore(); }
    g.save(); g.translate(hx - 10, hy + 4 + press * 6 - 6); g.rotate(-0.35); g.scale(0.85, 0.85); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 12; g.fillStyle = '#fff'; g.fill(HAND); g.shadowBlur = 0; g.lineWidth = 3; g.strokeStyle = '#2a1846'; g.stroke(HAND); g.restore();
  }
  drawLabel(L) {
    const g = this.g; const x0 = this.X(L.x), y0 = this.Y(L.y) - 40 * this.s - 30; g.save();
    g.font = `16px ${FONT}`; const tw = g.measureText(L.title).width; g.font = `600 13px Rubik, sans-serif`; const parts = L.parts; const pw = parts.reduce((w, [t]) => w + g.measureText(t).width, 0);
    const w = Math.max(tw, pw) + 22, h = L.extra ? 62 : 46; const x = Math.max(6, Math.min(this.w - w - 6, x0 - w / 2)), y = Math.max(6, y0 - h);
    g.fillStyle = 'rgba(12,8,30,.93)'; g.strokeStyle = L.color; g.lineWidth = 2; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 10) : g.rect(x, y, w, h); g.fill(); g.stroke();
    g.textAlign = 'left'; g.textBaseline = 'top'; g.font = `16px ${FONT}`; g.fillStyle = '#fff'; g.fillText(L.title, x + 11, y + 6);
    g.font = `600 13px Rubik, sans-serif`; let xx = x + 11; for (const [t, c] of parts) { g.fillStyle = c; g.fillText(t, xx, y + 26); xx += g.measureText(t).width; }
    if (L.extra) { g.fillStyle = '#ffd23f'; g.fillText(L.extra, x + 11, y + 43); }
    g.restore();
  }
  draw(dt, st) {
    this.t += dt; const g = this.g; g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); g.clearRect(0, 0, this.w, this.h);
    if (st.sky) {
      for (const r of st.reaches || []) this.drawReach(st.sky, r.s, r.x, r.y, r.from, r.strength);
      if (st.links) this.drawLinks(st.links.s, st.links.x, st.links.y, st.links.targets, COLORS[st.links.s.color].hex);
      if (st.bad) { g.save(); g.strokeStyle = '#ff4d6d'; g.lineWidth = 3; const x = this.X(st.bad.x), y = this.Y(st.bad.y); g.beginPath(); g.arc(x, y, 34 * this.s + 6, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(x - 12, y - 12); g.lineTo(x + 12, y + 12); g.stroke(); g.restore(); }
    }
    // pops
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    for (const p of this.pops) {
      p.t += dt; if (p.t > p.life) continue; const q = p.t / p.life;
      const sc = p.t < 0.09 ? 0.5 + (p.t / 0.09) * 0.75 : p.t < 0.18 ? 1.25 - ((p.t - 0.09) / 0.09) * 0.25 : 1;
      const a = q > 0.7 ? 1 - (q - 0.7) / 0.3 : 1; const x = this.X(p.x), y = this.Y(p.y) - 34 * this.s - 18 + p.dy - q * (p.word ? 30 : 44);
      const size = Math.max(13, p.size * Math.min(1.25, 0.55 + this.s * 0.6)) * sc;
      g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(p.rot); g.font = `${size}px ${FONT}`;
      g.lineWidth = Math.max(3, size * 0.22); g.strokeStyle = 'rgba(14,6,30,.92)';
      if (Array.isArray(p.text)) { const gap = size * 0.28; const ws = p.text.map(([t]) => g.measureText(t).width); let xx = -(ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1)) / 2; g.textAlign = 'left'; p.text.forEach(([t, c], i) => { g.strokeText(t, xx, 0); g.fillStyle = c; g.fillText(t, xx, 0); xx += ws[i] + gap; }); g.textAlign = 'center'; g.restore(); continue; }
      g.strokeText(p.text, 0, 0);
      if (p.cls === 'rainbow') { const w = g.measureText(p.text).width; const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0); ['#ff3b5c', '#ffb21e', '#35f0a0', '#38b6ff', '#b388ff'].forEach((c, i) => gr.addColorStop(i / 4, c)); g.fillStyle = gr; }
      else g.fillStyle = p.color || COL[p.cls] || '#fff';
      g.fillText(p.text, 0, 0); g.restore();
    }
    this.pops = this.pops.filter((p) => p.t <= p.life);
    if (st.label) this.drawLabel(st.label);
    if (st.hand) this.drawHand(st.hand.x, st.hand.y, st.hand.mode, st.hand.x2, st.hand.y2);
  }
}
