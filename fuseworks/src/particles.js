// Struct-of-arrays particle system (no per-particle objects → no GC hitches with 30k+ sparks).
// Particles live in world units. Templates describe a family of sparks; emit() only varies position/velocity.
export const SPR = ['glow', 'dot', 'flare', 'ring', 'smoke0', 'smoke1', 'smoke2', 'disc', 'square', 'soft', 'sphere'];
export const S_GLOW = 0, S_DOT = 1, S_FLARE = 2, S_RING = 3, S_SMOKE = 4, S_DISC = 7, S_SQUARE = 8, S_SOFT = 9;
export const F_CRACKLE = 1, F_BLINK = 2, F_TWINKLE = 4, F_SPLIT = 8, F_SPIN = 16, F_WIND = 32;

export class Particles {
  constructor(cap = 36000) {
    this.cap = cap; this.n = 0; this.time = 0;
    const F = () => new Float32Array(cap);
    Object.assign(this, { x: F(), y: F(), vx: F(), vy: F(), life: F(), max: F(), s0: F(), s1: F(), r0: F(), g0: F(), b0: F(), r1: F(), g1: F(), b1: F(), a: F(), drag: F(), grav: F(), str: F(), add: F(), hot: F(), trail: F(), tacc: F(), seed: F(), fade: F(), rot: F() });
    this.spr = new Uint8Array(cap); this.flag = new Uint8Array(cap); this.tt = new Array(cap); // trail template refs
    this.onPop = null; this.onSplit = null; this.wind = 0;
    this.arrs = ['x', 'y', 'vx', 'vy', 'life', 'max', 's0', 's1', 'r0', 'g0', 'b0', 'r1', 'g1', 'b1', 'a', 'drag', 'grav', 'str', 'add', 'hot', 'trail', 'tacc', 'seed', 'fade', 'rot', 'spr', 'flag', 'tt'].map((k) => this[k]);
  }
  // t: { life:[a,b], size:[s0,s1], c0:[r,g,b], c1:[r,g,b], a, drag, grav, str, add, hot, spr, flag, trail, tt, fade }
  emit(t, x, y, vx, vy, lifeMul = 1) {
    if (this.n >= this.cap) return -1; const i = this.n++; const L = (t.life[0] + Math.random() * (t.life[1] - t.life[0])) * lifeMul;
    this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy; this.life[i] = L; this.max[i] = L;
    this.s0[i] = t.size[0]; this.s1[i] = t.size[1]; const c0 = t.c0, c1 = t.c1 || t.c0; this.r0[i] = c0[0]; this.g0[i] = c0[1]; this.b0[i] = c0[2]; this.r1[i] = c1[0]; this.g1[i] = c1[1]; this.b1[i] = c1[2];
    this.a[i] = t.a ?? 1; this.drag[i] = t.drag || 0; this.grav[i] = t.grav || 0; this.str[i] = t.str || 0; this.add[i] = t.add ?? 1; this.hot[i] = t.hot || 0; this.spr[i] = t.spr || 0; this.flag[i] = t.flag || 0;
    this.trail[i] = t.trail || 0; this.tacc[i] = Math.random() * (t.trail || 0); this.tt[i] = t.tt || null; this.seed[i] = Math.random() * 1000; this.fade[i] = t.fade || 1.6; this.rot[i] = Math.random() * 6.283;
    return i;
  }
  kill(i) { const j = --this.n; if (i === j) return; const A = this.arrs; for (let k = 0; k < A.length; k++) A[k][i] = A[k][j]; }
  update(dt) {
    this.time += dt; const wind = this.wind;
    for (let i = 0; i < this.n; i++) {
      let L = this.life[i] - dt;
      if (L <= 0) { const f = this.flag[i]; if (f & F_CRACKLE && this.onPop) this.onPop(this.x[i], this.y[i], this.r0[i], this.g0[i], this.b0[i]); if (f & F_SPLIT && this.onSplit) this.onSplit(this.x[i], this.y[i], this.vx[i], this.vy[i], this.r0[i], this.g0[i], this.b0[i]); this.kill(i); i--; continue; }
      this.life[i] = L; const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vx[i] *= d; this.vy[i] = this.vy[i] * d + this.grav[i] * dt;
      this.x[i] += this.vx[i] * dt + (this.flag[i] & F_WIND ? wind * dt : wind * 0.15 * dt); this.y[i] += this.vy[i] * dt;
      const tr = this.trail[i];
      if (tr > 0 && this.tt[i]) { this.tacc[i] += dt; while (this.tacc[i] >= tr) { this.tacc[i] -= tr; const k = this.emit(this.tt[i], this.x[i], this.y[i], this.vx[i] * 0.08, this.vy[i] * 0.08); if (k >= 0) { const q = 1 - L / this.max[i]; this.r0[k] = this.r0[i] * (1 - q * 0.3); this.g0[k] = this.g0[i] * (1 - q * 0.4); this.b0[k] = this.b0[i] * (1 - q * 0.5); } } }
    }
  }
  draw(R, uv) {
    const T = this.time; const U = SPR.map((n) => uv[n]);
    for (let i = 0; i < this.n; i++) {
      const t = 1 - this.life[i] / this.max[i]; const f = this.flag[i];
      let a = this.a[i] * Math.min(1, (1 - t) * this.fade[i]); if (a <= 0.003) continue;
      if (f & F_BLINK) a *= Math.sin(this.seed[i] + T * 52) > 0.1 ? 1.4 : 0.04;
      if (f & F_TWINKLE) { const h = Math.sin(this.seed[i] * 12.9898 + Math.floor(T * 24 + this.seed[i]) * 78.233) * 43758.5; a *= (h - Math.floor(h)) > 0.55 ? 1.5 : 0.25; }
      const hot = 1 + this.hot[i] * (1 - t) * (1 - t) * (1 - t);
      const r = (this.r0[i] + (this.r1[i] - this.r0[i]) * t) * hot, g = (this.g0[i] + (this.g1[i] - this.g0[i]) * t) * hot, b = (this.b0[i] + (this.b1[i] - this.b0[i]) * t) * hot;
      const s = this.s0[i] + (this.s1[i] - this.s0[i]) * t; const st = this.str[i];
      if (st > 0) { const vx = this.vx[i], vy = this.vy[i]; const sp = Math.sqrt(vx * vx + vy * vy); R.push(this.x[i], this.y[i], s + sp * st, s, Math.atan2(vy, vx), r, g, b, a, U[this.spr[i]], this.add[i]); }
      else R.push(this.x[i], this.y[i], s, s, f & F_SPIN ? this.rot[i] + T * (this.seed[i] % 7 - 3.5) : this.rot[i] * (this.spr[i] >= S_SMOKE && this.spr[i] <= 6 ? 1 : 0), r, g, b, a, U[this.spr[i]], this.add[i]);
    }
  }
  clear() { this.n = 0; }
}
