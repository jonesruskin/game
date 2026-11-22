// Scene director: turns sky events into fireworks, draws shells / launcher / crowd, owns camera juice.
import { Particles, S_GLOW, S_DOT, S_FLARE, S_RING, S_SMOKE, S_DISC, S_SQUARE, S_SOFT, F_CRACKLE, F_BLINK, F_TWINKLE, F_SPLIT, F_SPIN, F_WIND } from './particles.js';
import { COLORS, SHELLS, SHELL_R } from './content.js';
import { TAU, clamp } from './util.js';
import { IDLE, LIT } from './sky.js';

const sph = () => { const z = Math.random() * 2 - 1, a = Math.random() * TAU, q = Math.sqrt(1 - z * z); return [q * Math.cos(a), q * Math.sin(a), z]; };
const GOLD = [1, 0.72, 0.32], WHITE = [1, 0.95, 0.85], SILVER = [0.85, 0.9, 1];
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const TRAILS = { trail_classic: [1, 0.85, 0.55], trail_ice: [0.55, 0.85, 1], trail_ember: [1, 0.45, 0.2], trail_rainbow: null };

export class Scene {
  constructor(audio) {
    this.P = new Particles(36000); this.audio = audio; this.movers = []; this.time = 0;
    this.trauma = 0; this.shakeX = 0; this.shakeY = 0; this.zoom = 1; this.zoomV = 0; this.ab = 0; this.gflash = 0;
    this.flash = [0, 0, 0, 0]; this.flashPos = [0.5, 0.6]; this.excite = 0; this.lowFx = false; this.burstStyle = 'burst_classic'; this.trailStyle = 'trail_classic';
    this.P.onPop = (x, y) => { this.P.emit(this.T.pop, x, y, 0, 0); if (Math.random() < 0.3) this.P.emit(this.T.popGlow, x, y, 0, 0); };
    this.P.onSplit = (x, y, vx, vy, r, g, b) => { const c = [r, g, b]; for (let k = 0; k < 4; k++) { const a = Math.atan2(vy, vx) + (k / 4) * TAU + 0.785; const sp = 230; this.P.emit({ ...this.T.mini, c0: c, c1: mixc(c, [0.3, 0.1, 0.05], 0.7) }, x, y, Math.cos(a) * sp, Math.sin(a) * sp); } this.audio && this.audio.pop(0.25); };
    this.T = {
      pop: { life: [0.05, 0.09], size: [9, 3], c0: [3, 2.8, 2.4], spr: S_FLARE, add: 1 },
      popGlow: { life: [0.1, 0.16], size: [26, 10], c0: [1, 0.8, 0.5], a: 0.5, spr: S_GLOW, add: 1 },
      trailDot: { life: [0.35, 0.6], size: [2.6, 0.6], c0: GOLD, a: 0.8, drag: 2, grav: 28, spr: S_DOT, add: 1, fade: 1.2 },
      trailFine: { life: [0.2, 0.38], size: [2.2, 0.5], c0: GOLD, a: 0.7, drag: 2, grav: 10, spr: S_DOT, add: 1, fade: 1.2 },
      mini: { life: [0.4, 0.6], size: [3.2, 1.4], c0: WHITE, drag: 3.2, grav: 60, str: 0.02, spr: S_DOT, hot: 1.5 },
      smoke: { life: [4.5, 7.5], size: [55, 150], c0: [0.16, 0.13, 0.2], a: 0.2, drag: 0.6, grav: -4, spr: S_SMOKE, add: 0, flag: F_WIND, fade: 1.1 },
      flash: { life: [0.14, 0.2], size: [90, 150], c0: [2, 1.9, 1.8], a: 0.42, spr: S_GLOW, add: 1 },
      flare: { life: [0.1, 0.15], size: [50, 80], c0: [2.2, 2.2, 2.2], a: 0.7, spr: S_FLARE, add: 1 },
      shock: { life: [0.28, 0.34], size: [20, 210], c0: [1, 1, 1], a: 0.22, spr: S_RING, add: 1 },
      confetti: { life: [2.6, 3.6], size: [7, 7], c0: [1, 1, 1], drag: 1.4, grav: 140, spr: S_SQUARE, add: 0, flag: F_SPIN, fade: 3 },
      steam: { life: [1, 1.6], size: [20, 70], c0: [0.6, 0.65, 0.75], a: 0.25, drag: 1, grav: -30, spr: S_SMOKE, add: 0, fade: 1 },
    };
  }
  setLowFx(v) { this.lowFx = v; }
  n(k) { return Math.round(k * (this.lowFx ? 0.5 : 1)); }
  // ------------------------------------------------------------------ events from the sky
  consume(sky, hooks = {}) {
    for (const e of sky.events) {
      if (e.k === 'burst') { this.burst(e.s, e); if (hooks.burst) hooks.burst(e); }
      else if (e.k === 'tracer') this.tracer(e.a, e.b, e.dur, e.kind);
      else if (e.k === 'comet') this.comet(e.s, e.p, e.dur);
      else if (e.k === 'lit') { this.litFx(e.s); if (hooks.lit) hooks.lit(e); }
      else if (e.k === 'dry') { for (let i = 0; i < 6; i++) this.P.emit(this.T.steam, e.s.x + (Math.random() - 0.5) * 30, e.s.y, (Math.random() - 0.5) * 30, -20); this.audio && this.audio.hiss(); }
    }
    sky.events.length = 0;
  }
  addFlash(x, y, col, power) { // background light — blends towards the strongest recent flash
    const f = this.flash; const w = power / (f[3] + power + 1e-6); f[0] += (col[0] - f[0]) * w; f[1] += (col[1] - f[1]) * w; f[2] += (col[2] - f[2]) * w; f[3] = Math.min(1.1, f[3] + power * 0.6);
    if (this.toUV) { const [u, v] = this.toUV(x, y); this.flashPos[0] += (u - this.flashPos[0]) * w; this.flashPos[1] += (v - this.flashPos[1]) * w; }
  }
  shake(a) { this.trauma = Math.min(1, this.trauma + a); }
  kick(z) { this.zoomV += z; }
  litFx(s) { const c = COLORS[s.color].rgb; for (let i = 0; i < 6; i++) { const a = Math.random() * TAU; this.P.emit({ life: [0.15, 0.3], size: [3, 1], c0: [2, 1.8, 1.4], drag: 3, spr: S_DOT, str: 0.02 }, s.x, s.y - SHELL_R * 0.8, Math.cos(a) * 120, Math.sin(a) * 120 - 60); } this.P.emit({ life: [0.1, 0.12], size: [40, 70], c0: mixc(c, WHITE, 0.6), a: 0.6, spr: S_GLOW }, s.x, s.y, 0, 0); }
  // ------------------------------------------------------------------ the fireworks
  burst(s, e) {
    const C = COLORS[s.color]; const c = C.rgb, deep = C.deep; const x = s.x, y = s.y; const type = s.type; const P = this.P;
    const pulse = e.retrig ? 0.6 : 1; const Z = SHELLS[type].zone; const R = (Z.r1 ? (Z.r0 + Z.r1) / 2 : Z.r || 150) * (s.enh === 'titan' ? 1.3 : 1);
    // common: flash, flare, shockwave, smoke, light, shake, sound
    P.emit({ ...this.T.flash, c0: mixc(c, [2.2, 2.1, 2], 0.45), size: [R * 0.45 * pulse, R * 0.85 * pulse] }, x, y, 0, 0);
    P.emit(this.T.flare, x, y, 0, 0); if (!e.retrig) P.emit({ ...this.T.shock, c0: mixc(c, WHITE, 0.5), size: [20, R * 1.5] }, x, y, 0, 0);
    if (!e.retrig) for (let i = 0; i < this.n(4); i++) P.emit(this.T.smoke, x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10);
    this.addFlash(x, y, c, 0.45 * pulse); this.shake(0.11 * pulse); this.excite = Math.min(1, this.excite + 0.08);
    const spark = (n, radius, opt = {}) => {
      const drag = opt.drag || 2.6; const v0 = (radius * drag) / 0.93; const t = { life: opt.life || [1.1, 1.6], size: opt.size || [6.2, 2.2], c0: opt.c0 || c, c1: opt.c1 || deep, drag, grav: opt.grav ?? 55, str: opt.str ?? 0.024, spr: S_DOT, hot: opt.hot ?? 1.25, flag: opt.flag || 0, trail: opt.trail || 0, tt: opt.tt, fade: opt.fade || 1.7, a: opt.a ?? 1 };
      for (let i = 0; i < this.n(n); i++) { const d = opt.dir ? opt.dir(i, n) : sph(); const sp = v0 * (opt.spread ? 1 - Math.random() * opt.spread : 0.94 + Math.random() * 0.1); const k = P.emit(t, x, y, d[0] * sp, d[1] * sp, opt.lifeVar ? 0.75 + Math.random() * 0.5 : 1); if (k >= 0 && opt.twinkleFrac && Math.random() < opt.twinkleFrac) P.flag[k] |= F_TWINKLE; }
    };
    const shapeDir = (fn) => (i, n) => { const p = fn((i / n) * TAU); return [p[0] * (0.97 + Math.random() * 0.06), p[1] * (0.97 + Math.random() * 0.06)]; };
    switch (type) {
      case 'peony': {
        const st = this.burstStyle;
        if (st === 'burst_heart') spark(120, R, { dir: shapeDir((t) => [(16 * Math.sin(t) ** 3) / 17, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17]), grav: 20, str: 0.008 });
        else if (st === 'burst_star') spark(130, R, { dir: shapeDir((t) => { const k = Math.floor((t / TAU) * 10); const f = (t / TAU) * 10 - k; const a0 = (k / 10) * TAU - Math.PI / 2, a1 = ((k + 1) / 10) * TAU - Math.PI / 2; const r0 = k % 2 ? 0.45 : 1, r1 = k % 2 ? 1 : 0.45; return [Math.cos(a0) * r0 * (1 - f) + Math.cos(a1) * r1 * f, Math.sin(a0) * r0 * (1 - f) + Math.sin(a1) * r1 * f]; }), grav: 18, str: 0.008 });
        else if (st === 'burst_smile') { spark(80, R, { dir: shapeDir((t) => [Math.cos(t), Math.sin(t)]), grav: 15, str: 0.006 }); spark(30, R * 0.55, { dir: shapeDir((t) => [Math.cos(t * 0.5 + 0.35) * 0.9, Math.sin(t * 0.5 + 0.35) * 0.9]), grav: 15, str: 0.006, c0: GOLD }); for (const ex of [-0.38, 0.38]) spark(10, R * 0.12, { c0: GOLD, grav: 15, dir: () => { const a = Math.random() * TAU; return [Math.cos(a) + ex / 0.12 * 1, Math.sin(a) - 0.35 / 0.12]; }, spread: 0.2 }); }
        else if (st === 'burst_saturn') { spark(70, R * 0.6, { grav: 25 }); spark(70, R, { dir: shapeDir((t) => [Math.cos(t), Math.sin(t) * 0.32]), grav: 20, str: 0.008, c0: GOLD }); }
        else { spark(150, R, { twinkleFrac: 0.18, trail: this.lowFx ? 0 : 0.07, tt: { ...this.T.trailFine, c0: c, life: [0.25, 0.4] } }); spark(40, R * 0.5, { c0: mixc(c, WHITE, 0.55), size: [4.4, 1.6], life: [0.8, 1.1] }); }
        break;
      }
      case 'willow': spark(64, Z.r, { c0: mixc(GOLD, c, 0.3), c1: [0.5, 0.25, 0.05], life: [2.3, 3.1], drag: 3.1, grav: 92, str: 0.004, size: [3.6, 1.6], trail: this.lowFx ? 0.1 : 0.055, tt: { ...this.T.trailDot, c0: mixc(GOLD, c, 0.3) }, hot: 1.4, fade: 2, lifeVar: true }); break;
      case 'palm': {
        for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (i - 3.5) * 0.17 + (Math.random() - 0.5) * 0.08; const sp = (Z.l * 1.9) * (0.85 + Math.random() * 0.25); P.emit({ life: [0.95, 1.2], size: [6, 2.5], c0: mixc(GOLD, c, 0.5), c1: deep, drag: 1.9, grav: 85, str: 0.01, spr: S_DOT, hot: 2, trail: this.lowFx ? 0.03 : 0.014, tt: { ...this.T.trailFine, c0: mixc(GOLD, c, 0.5), life: [0.4, 0.7] } }, x, y, Math.cos(a) * sp, Math.sin(a) * sp); }
        spark(34, Z.r, { size: [3.6, 1.2] }); break;
      }
      case 'crossette': {
        for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; const sp = Z.l * 2.1; P.emit({ life: [0.5, 0.56], size: [6, 4], c0: mixc(c, WHITE, 0.4), c1: c, drag: 2.2, grav: 20, str: 0.012, spr: S_DOT, hot: 2.2, flag: F_SPLIT, trail: this.lowFx ? 0.03 : 0.012, tt: { ...this.T.trailFine, c0: c } }, x, y, Math.cos(a) * sp, Math.sin(a) * sp); }
        spark(26, Z.r, { size: [3.6, 1.2], life: [0.6, 0.8] }); break;
      }
      case 'crackle': spark(54, Z.r, { c0: [1, 0.92, 0.7], c1: c, life: [0.45, 0.8], flag: F_CRACKLE, grav: 70, hot: 1.6, lifeVar: true, size: [3.4, 1.6] }); this.audio && this.audio.crackle(0.9, 0.6); break;
      case 'ring': { const tilt = 0.3 + Math.random() * 0.7, rot = Math.random() * TAU; spark(96, R, { dir: (i, n) => { const t = (i / n) * TAU; const px = Math.cos(t), py = Math.sin(t) * tilt; return [px * Math.cos(rot) - py * Math.sin(rot), px * Math.sin(rot) + py * Math.cos(rot)]; }, grav: 25, str: 0.006 }); spark(18, 40, { c0: WHITE, life: [0.5, 0.7] }); break; }
      case 'glitter': spark(72, Z.r, { c0: [1, 0.85, 0.5], c1: [1, 0.6, 0.2], life: [1.6, 2.3], drag: 2.8, grav: 48, flag: F_TWINKLE, str: 0.004, hot: 1.6, lifeVar: true }); spark(24, Z.r * 0.7, { c0: c, size: [3.8, 1.4] }); break;
      case 'strobe': spark(e.retrig ? 30 : 46, Z.r * (e.retrig ? 0.8 : 1), { c0: [1.3, 1.3, 1.4], c1: SILVER, life: [1.2, 1.6], drag: 2.4, grav: 30, flag: F_BLINK, str: 0, size: [4.2, 3], hot: 1, lifeVar: true }); break;
      case 'comet': spark(80, Z.r, { twinkleFrac: 0.25 }); break;
      case 'spider': spark(54, Z.r * 1.3, { c0: [1.2, 1.2, 1.3], c1: SILVER, drag: 6, grav: 18, str: 0.05, life: [0.55, 0.75], size: [3.4, 1.6], hot: 1.4 }); break;
      case 'crown': spark(110, Z.r, { c0: [1, 0.78, 0.36], c1: [0.6, 0.3, 0.05], life: [2.4, 3.2], drag: 2.4, grav: 52, str: 0.003, size: [4.2, 2], trail: this.lowFx ? 0.12 : 0.06, tt: { ...this.T.trailDot, c0: [1, 0.75, 0.35] }, twinkleFrac: 0.35, hot: 2, lifeVar: true }); P.emit({ ...this.T.flash, c0: [3, 2.3, 1.2], size: [R, R * 2] }, x, y, 0, 0); this.shake(0.15); break;
    }
    if (s.enh === 'glass' && !e.retrig) for (let i = 0; i < 14; i++) { const a = Math.random() * TAU; P.emit({ life: [0.5, 0.8], size: [5, 2], c0: [0.8, 0.95, 1.2], drag: 2, grav: 260, spr: S_SQUARE, add: 0.6, flag: F_SPIN }, x, y, Math.cos(a) * 160, Math.sin(a) * 160 - 60); }
    if (this.audio) { const big = type === 'crown' ? 1.4 : type === 'crackle' ? 0.7 : type === 'willow' ? 1.1 : 1; this.audio.boom(big * pulse, this.pan(x), e.retrig); if (type === 'glitter' || s.enh === 'gilded') this.audio.glitter(); if (type === 'willow' || type === 'crown') this.audio.fizz(1.6); }
  }
  pan(x) { return this.W ? clamp((x / this.W) * 2 - 1, -0.8, 0.8) : 0; }
  trailColor(base) { const t = TRAILS[this.trailStyle]; if (t === null) { const h = (this.time * 0.7 + Math.random()) % 1; return hsv(h, 0.7, 1.2); } return t ? mixc(t, base, 0.35) : base; }
  tracer(a, b, dur, kind) { this.movers.push({ k: 'tracer', x0: a.x, y0: a.y, x1: b.x, y1: b.y, t: 0, dur, c: kind === 'willow' ? GOLD : COLORS[a.color].rgb, kind, acc: 0 }); }
  comet(s, p, dur) { this.movers.push({ k: 'comet', x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1, t: 0, dur, c: COLORS[s.color].rgb, s, acc: 0 }); this.audio && this.audio.whoosh(dur); }
  rocket(x0, y0, x1, y1, dur, onArrive) { this.movers.push({ k: 'rocket', x0, y0, x1, y1, t: 0, dur, c: [1, 0.8, 0.5], onArrive, acc: 0 }); this.audio && this.audio.whistle(dur); this.P.emit({ life: [0.25, 0.3], size: [60, 120], c0: [1.5, 0.9, 0.5], a: 0.7, spr: S_GLOW }, x0, y0, 0, 0); for (let i = 0; i < this.n(12); i++) this.P.emit(this.T.smoke, x0 + (Math.random() - 0.5) * 30, y0, (Math.random() - 0.5) * 60, -30 - Math.random() * 40); }
  updateMovers(dt) {
    const P = this.P;
    for (const m of this.movers) {
      m.t += dt; const q = Math.min(1, m.t / m.dur); let e = q;
      if (m.k === 'tracer') e = 1 - (1 - q) * (1 - q) * 0.6 - (1 - q) * 0.4; // fast start, slight ease
      const x = m.x0 + (m.x1 - m.x0) * e, y = m.y0 + (m.y1 - m.y0) * e - (m.k === 'rocket' ? Math.sin(q * Math.PI) * 30 : 0);
      m.x = x; m.y = y; m.acc += dt; const every = m.k === 'comet' ? 0.008 : 0.014;
      while (m.acc >= every) { m.acc -= every; const c = m.k === 'rocket' ? this.trailColor([1, 0.8, 0.5]) : m.c; P.emit({ life: m.k === 'comet' ? [0.5, 0.9] : [0.25, 0.45], size: m.k === 'comet' ? [5, 1] : [3.2, 0.8], c0: c, c1: mixc(c, [0.2, 0.05, 0], 0.7), drag: 1.5, grav: 40, spr: S_DOT, hot: 1.2, fade: 1.3 }, x + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40); }
      if (q >= 1 && !m.done) { m.done = true; if (m.k !== 'comet') P.emit({ life: [0.08, 0.12], size: [30, 50], c0: [2, 1.8, 1.5], a: 0.8, spr: S_GLOW }, m.x1, m.y1, 0, 0); if (m.onArrive) m.onArrive(); }
    }
    this.movers = this.movers.filter((m) => !m.done);
  }
  confetti(n = 160, W = this.W, H = this.H) { const cols = [[1, 0.25, 0.4], [1, 0.75, 0.15], [0.25, 0.7, 1], [0.2, 0.95, 0.6], [1, 1, 1], [0.8, 0.4, 1]]; for (let i = 0; i < this.n(n); i++) { const x = Math.random() * W; this.P.emit({ ...this.T.confetti, c0: cols[i % cols.length] }, x, -40 - Math.random() * H * 0.3, (Math.random() - 0.5) * 160, Math.random() * 120); } }
  celebrate(power = 1) { this.addFlash(this.W / 2, this.H / 2, [1, 0.9, 0.7], 0.7 * power); this.shake(0.35 * power); this.kick(0.035 * power); this.ab = Math.max(this.ab, 0.6 * power); this.gflash = Math.max(this.gflash, 0.5 * power); this.excite = 1; }
  // ambient fireworks for menus
  ambient(dt, rate = 0.8) { this.ambT = (this.ambT || 0) - dt; if (this.ambT > 0) return; this.ambT = (0.4 + Math.random() * 0.9) / rate; const types = ['peony', 'peony', 'willow', 'palm', 'crossette', 'ring', 'glitter', 'crackle', 'crown', 'strobe']; const cols = ['crimson', 'amber', 'azure', 'jade']; const s = { x: this.W * (0.15 + Math.random() * 0.7), y: this.H * (0.12 + Math.random() * 0.5), type: types[Math.floor(Math.random() * types.length)], color: cols[Math.floor(Math.random() * 4)], enh: null }; const from = { x: s.x + (Math.random() - 0.5) * 200, y: this.H + 120 }; this.rocket(from.x, from.y, s.x, s.y, 0.7 + Math.random() * 0.3, () => this.burst(s, { retrig: false })); }
  // ------------------------------------------------------------------ frame
  update(dt) {
    this.time += dt; this.P.update(dt); this.updateMovers(dt);
    this.trauma = Math.max(0, this.trauma - dt * 1.6); const sh = this.trauma * this.trauma * 16; this.shakeX = (Math.random() * 2 - 1) * sh; this.shakeY = (Math.random() * 2 - 1) * sh;
    this.zoomV += (1 - this.zoom) * 90 * dt - this.zoomV * 14 * dt; this.zoom += this.zoomV * dt * 10; this.zoom = clamp(this.zoom, 0.94, 1.08);
    this.ab = Math.max(0, this.ab - dt * 2.2); this.gflash = Math.max(0, this.gflash - dt * 2.5);
    const f = this.flash; f[3] *= Math.exp(-dt * 7); this.excite = Math.max(0, this.excite - dt * 0.18);
  }
  // shells & launcher (world group)
  drawShells(R, uv, sky, ui) {
    const t = this.time; const fog = sky.ctx.boss === 'fog';
    for (const s of sky.shells) {
      if (s.state !== IDLE && s.state !== LIT) continue; if (ui.drag && ui.drag.s === s) continue;
      const age = t - (s.bornT || -9); if (age < 0) continue; const k = age < 0.45 ? 1 + 2.7 * (age / 0.45 - 1) ** 3 + 1.7 * (age / 0.45 - 1) ** 2 : 1;
      if (age < 0.02 && !s.popped) { s.popped = true; this.P.emit({ life: [0.3, 0.4], size: [20, 90], c0: COLORS[s.color].rgb, a: 0.6, spr: S_RING }, s.x, s.y, 0, 0); }
      this.drawShell(R, uv, s, s.x, s.y + Math.sin(t * 1.7 + s.uid) * 3, ui, fog, 1, false, k);
    }
    if (ui.drag) { const s = ui.drag.s; this.drawShell(R, uv, s, ui.drag.x, ui.drag.y, ui, fog, ui.drag.ok ? 1 : 0.45, true); }
  }
  drawShell(R, uv, s, x, y, ui, fog, alpha, dragging, k = 1) {
    const t = this.time; const C = COLORS[s.color]; const c = C.rgb;
    const hov = ui.hover === s, sel = ui.selected === s, lit = s.state === LIT; const tgt = ui.targets && ui.targets.includes(s);
    let sc = 1 + (hov ? 0.1 : 0) + (sel ? 0.14 + Math.sin(t * 9) * 0.04 : 0) + (dragging ? 0.15 : 0) + (lit ? 0.2 : 0) + (s.enh === 'titan' ? 0.16 : 0);
    if (ui.preview && ui.preview.includes(s)) sc += 0.06 + Math.sin(t * 10) * 0.03;
    const r = SHELL_R * sc * Math.max(0.01, k); const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + s.uid * 1.7);
    if (lit) { x += (Math.random() - 0.5) * 4; y += (Math.random() - 0.5) * 4; }
    const damp = s.damp && !s.dry; const bodyC = damp ? mixc(mixc(C.deep, c, 0.5), [0.45, 0.5, 0.6], 0.6) : mixc(C.deep, c, 0.72);
    R.push(x, y, r * 3, r * 3, 0, c[0], c[1], c[2], (0.32 + pulse * 0.14 + (hov || sel ? 0.25 : 0) + (lit ? 0.6 : 0)) * alpha * (damp ? 0.4 : 1), uv.glow, 1);
    R.push(x, y + r * 0.1, r * 1.12, r * 1.12, 0, 0, 0, 0, 0.35 * alpha, uv.soft, 0);
    R.push(x, y, r, r, 0, bodyC[0], bodyC[1], bodyC[2], alpha, uv.sphere, 0);
    if (s.enh) { const E = s.enh; let rc = [1, 1, 1], ra = 0.9, rs = 1.08;
      if (E === 'gilded') rc = [1.3, 0.95, 0.35]; else if (E === 'glass') { rc = [0.8, 0.95, 1.3]; ra = 0.7; } else if (E === 'lucky') rc = [0.4, 1.3, 0.5]; else if (E === 'twin') { R.push(x, y, r * 1.32, r * 1.32, 0, 1, 1, 1, 0.6 * alpha, uv.rim, 0.3); } else if (E === 'prism') rc = hsv((t * 0.4) % 1, 0.8, 1.4); else if (E === 'titan') { rc = [1, 0.6, 0.4]; rs = 1.12; }
      R.push(x, y, r * rs, r * rs, 0, rc[0], rc[1], rc[2], ra * alpha, uv.rim, 0.25);
      if (E === 'glass') R.push(x - r * 0.35, y - r * 0.4, r * 0.5, r * 0.5, 0.6, 1, 1, 1, 0.6 * alpha, uv.flare, 1);
      if (E === 'lucky' && Math.sin(t * 3 + s.uid) > 0.7) R.push(x + r * 0.6, y - r * 0.6, 9, 9, t, 0.6, 1.4, 0.7, alpha, uv.flare, 1);
    }
    const gl = fog ? uv.g_fog : uv['g_' + s.type]; R.push(x, y, r * 0.66, r * 0.66, 0, 1, 1, 1, 0.95 * alpha, gl, 0);
    // fuse spark
    const fx = x + r * 0.52, fy = y - r * 0.84; const fl = 0.6 + Math.random() * 0.6;
    R.push(fx, fy, 7 * fl, 7 * fl, 0, 1.6, 1.1, 0.5, alpha, uv.glow, 1); R.push(fx, fy, 2.4, 2.4, 0, 2, 1.8, 1.4, alpha, uv.dot, 1);
    if (sel || tgt) R.push(x, y, r * 1.5, r * 1.5, t * 0.8, sel ? 1.4 : 0.6, sel ? 1.2 : 1, sel ? 0.6 : 1.4, 0.9 * alpha, uv.ring, 1);
  }
  drawLauncher(R, uv, x, y, scale = 1, heat = 0) {
    R.push(x, y - 40 * scale, 90 * scale, 60 * scale, 0, 1, 0.55, 0.25, 0.15 + heat * 0.5, uv.glow, 1);
    R.push(x, y, 22 * scale, 33 * scale, 0, 0.09, 0.07, 0.14, 1, uv.mortar, 0);
    R.push(x, y - 30 * scale, 10 * scale, 10 * scale, 0, 1.5, 0.9, 0.4, 0.4 + heat, uv.glow, 1);
  }
  drawParticles(R, uv) { this.P.draw(R, uv); for (const m of this.movers) { if (m.x === undefined) continue; const c = m.c; R.push(m.x, m.y, m.k === 'comet' ? 16 : 9, m.k === 'comet' ? 16 : 9, 0, c[0] * 2, c[1] * 2, c[2] * 2, 1, uv.glow, 1); R.push(m.x, m.y, 3.5, 3.5, 0, 3, 3, 3, 1, uv.dot, 1); } }
  // crowd & twinkles (screen group, css px)
  drawCrowd(R, uv, w, waterY, unit) {
    const n = Math.round(w / (unit * 3.2)); const ex = this.excite; const t = this.time;
    for (let i = 0; i < n; i++) { const h = Math.sin(i * 91.7) * 0.5 + 0.5; const px = (i + 0.5 + Math.sin(i * 13.1) * 0.3) * (w / n); const sz = unit * (1.05 + h * 0.35); const jump = ex > 0.25 ? Math.max(0, Math.sin(t * (7 + h * 3) + i * 2.3)) * ex * unit * 1.2 : 0; const up = ex > 0.55 && (i * 7) % 3 === 0;
      R.push(px, waterY - sz * 0.9 - jump, sz * 0.5, sz, 0, 0.02, 0.015, 0.05, 1, up ? uv.person_up : uv.person, 0); }
  }
  drawTwinkles(R, uv, w, h) { const t = this.time; for (let i = 0; i < 38; i++) { const x = ((Math.sin(i * 127.1) * 0.5 + 0.5) * w), y = (Math.sin(i * 311.7) * 0.5 + 0.5) * h; const a = Math.max(0, Math.sin(t * (0.6 + (i % 5) * 0.3) + i * 4.1)); if (a < 0.2) continue; const s = 3 + (i % 3) * 2; R.push(x, y, s * a, s * a, 0, 1, 1, 1.2, a * 0.8, uv.flare, 1); } }
}
export function hsv(h, s, v) { const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s); return [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6]; }
