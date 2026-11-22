// The sky: shell placement, reach geometry, the chain-reaction event queue and the scoring engine.
// Pure logic (no DOM / WebGL) — the renderer listens to emitted events; the balance sim runs it instantly.
import { SHELLS, COLOR_IDS, SHELL_R, MIN_GAP, CAT } from './content.js';

export const IDLE = 0, LIT = 1, BURST = 2, FLYING = 3;
const FUSE = 0.085; // seconds between catching fire and bursting
const SPEED = { circle: 640, ring: 720, willow: 430, palm: 560, cross: 980, comet: 760, spider: 1150, bang: 1500 };
const WIND = 90;

let UID = 1;
export function makeShell(cs) { return { uid: UID++, cid: cs.id, type: cs.type, color: cs.color, enh: cs.enh || null, x: 0, y: 0, state: IDLE, damp: false, dry: false, pend: 0, starter: false, bornT: 0 }; }

export class Sky {
  constructor(W, H, ctx) {
    this.W = W; this.H = H; this.ctx = ctx; // ctx: { mods, boss, rng }
    this.shells = []; this.q = []; this.t = 0; this.launch = null; this.flying = []; this.lastBurst = null; this.lastHookDone = false;
    this.events = []; // emitted for the renderer: {k, ...}
    this.margin = 52;
  }
  get alive() { return this.shells.filter((s) => s.state === IDLE); }
  inside(x, y) { const m = this.margin; return x >= m && x <= this.W - m && y >= m && y <= this.H - m; }
  canPlace(x, y, ignore) { if (!this.inside(x, y)) return false; for (const s of this.shells) if (s !== ignore && s.state === IDLE && Math.hypot(s.x - x, s.y - y) < MIN_GAP) return false; return true; }
  // Mitchell's best-candidate placement: varied but never overlapping.
  place(shell, rng, k = 3) {
    let best = null, bd = -1; const m = this.margin;
    for (let tries = 0; tries < 60; tries++) {
      for (let i = 0; i < k; i++) {
        const x = m + rng() * (this.W - 2 * m), y = m + rng() * (this.H - 2 * m) * 0.97;
        let d = Infinity; for (const s of this.shells) if (s.state === IDLE) d = Math.min(d, Math.hypot(s.x - x, s.y - y));
        if (d >= MIN_GAP && d > bd) { bd = d; best = { x, y }; }
      }
      if (best) break;
    }
    if (!best) return false;
    shell.x = best.x; shell.y = best.y; this.shells.push(shell); return true;
  }
  // clustered placement: fireworks gather in 'islands' — chains run wild inside one, Moves bridge the gaps
  placeNear(shell, cx, cy, sigma, rng) {
    for (let tries = 0; tries < 26; tries++) {
      const u = Math.max(1e-6, rng()), v = rng(); const r = Math.sqrt(-2 * Math.log(u)) * sigma, a = v * Math.PI * 2;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (this.canPlace(x, y)) { shell.x = x; shell.y = y; this.shells.push(shell); return true; }
    }
    return false;
  }
  makeClusters(rng, n) {
    const out = []; const m = 150;
    for (let i = 0; i < n; i++) { let best = null, bd = -1; for (let k = 0; k < 12; k++) { const x = m + rng() * (this.W - 2 * m), y = m + rng() * (this.H - 2 * m) * 0.95; let d = Infinity; for (const c of out) d = Math.min(d, Math.hypot(c.x - x, c.y - y)); if (d > bd) { bd = d; best = { x, y }; } } out.push(best); }
    return out;
  }
  // ---------------------------------------------------------------- reach geometry
  zoneK(s) { const M = this.ctx.mods, B = this.ctx.boss; let k = M.zone; if (s.enh === 'titan') k *= 1.4; if (s.starter) k *= M.starterZone; if (B === 'short') k *= 0.75; if (B === 'eclipse') k *= 0.8; return k; }
  origin(s) { return this.ctx.boss === 'gale' ? [s.x + WIND, s.y] : [s.x, s.y]; }
  // returns effective distance (for delay) if `d` lies within `s`'s reach, else -1
  reach(s, d, k = this.zoneK(s)) {
    const Z = SHELLS[s.type].zone; const [ox, oy] = this.origin(s); const dx = d.x - ox, dy = d.y - oy; const r = Math.hypot(dx, dy);
    switch (Z.k) {
      case 'circle': return r <= Z.r * k ? r : -1;
      case 'ring': return r >= Z.r0 * k && r <= Z.r1 * k ? r : -1;
      case 'willow': if (r <= Z.r * k) return r; return Math.abs(dx) <= Z.w * k && dy > 0 && dy <= Z.l * k ? r : -1;
      case 'palm': if (r <= Z.r * k) return r; if (dy >= 0 || r > Z.l * k) return -1; return Math.acos(-dy / r) <= Z.a ? r : -1;
      case 'cross': if (r <= Z.r * k) return r; return (Math.abs(dy) <= Z.w * k && Math.abs(dx) <= Z.l * k) || (Math.abs(dx) <= Z.w * k && Math.abs(dy) <= Z.l * k) ? r : -1;
      case 'comet': case 'spider': return r <= Z.r * k ? r : -1;
    }
    return -1;
  }
  speed(s) { return SPEED[SHELLS[s.type].zone.k] || 640; }
  // Which shells would `s` light? (used for previews; comets assume they fly away from `from`)
  links(s, from) {
    const out = []; const Z = SHELLS[s.type].zone; const k = this.zoneK(s);
    if (this.ctx.mods.bigBang && s.starter) return this.shells.filter((d) => d !== s && d.state === IDLE);
    if (Z.k === 'comet' && from) { const p = this.cometPath(s, from); for (const d of this.shells) if (d !== s && d.state === IDLE && (segDist(p, d) <= Z.w * k || Math.hypot(d.x - p.x1, d.y - p.y1) <= Z.r * k)) out.push(d); return out; }
    for (const d of this.shells) if (d !== s && d.state === IDLE && this.reach(s, d, k) >= 0) out.push(d);
    if (Z.k === 'spider') for (const d of this.nearest(s, this.ctx.mods.spider)) if (!out.includes(d)) out.push(d);
    return out;
  }
  nearest(s, n) { return this.shells.filter((d) => d !== s && d.state === IDLE && d.pend === 0).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y)).slice(0, n); }
  cometPath(s, from) {
    let dx = s.x - from.x, dy = s.y - from.y; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    let len = SHELLS.comet.zone.l * this.zoneK(s) * this.ctx.mods.comet; const m = this.margin * 0.6;
    // clip to field
    const tx = dx > 0 ? (this.W - m - s.x) / dx : dx < 0 ? (m - s.x) / dx : Infinity, ty = dy > 0 ? (this.H - m - s.y) / dy : dy < 0 ? (m - s.y) / dy : Infinity;
    len = Math.max(40, Math.min(len, tx, ty));
    return { x0: s.x, y0: s.y, x1: s.x + dx * len, y1: s.y + dy * len, dx, dy, len };
  }
  // ---------------------------------------------------------------- chain
  push(e) { let i = this.q.length; while (i > 0 && this.q[i - 1].t > e.t) i--; this.q.splice(i, 0, e); }
  start(starter, launch, from) {
    this.launch = launch; this.t = 0; this.q.length = 0; this.flying.length = 0; this.lastBurst = null; this.lastHookDone = false;
    for (const s of this.shells) { s.pend = 0; s.starter = false; }
    starter.starter = true; launch.starter = starter; launch.skyCount = this.shells.filter((s) => s.state === IDLE).length;
    this.push({ t: 0, k: 'ignite', s: starter, src: null, rocket: true, from: from || { x: this.W / 2, y: this.H + 200 } });
  }
  get done() { return this.launch && this.q.length === 0 && this.flying.length === 0 && this.lastHookDone; }
  // advance chain time; returns nothing — renderer reads this.events
  advance(dt) {
    const end = this.t + dt;
    for (;;) {
      if (!this.q.length) {
        if (!this.lastHookDone && this.launch) { this.lastHookDone = true; if (this.lastBurst) this.launch.lastShell(this.lastBurst, this); if (this.q.length) continue; }
        break;
      }
      if (this.q[0].t > end) break;
      const e = this.q.shift(); this.t = Math.max(this.t, e.t); this.handle(e);
    }
    this.t = end; this.flying = this.flying.filter((f) => f.tEnd > this.t);
  }
  runToEnd() { let guard = 0; while (!this.done && guard++ < 100000) this.advance(0.05); }
  handle(e) {
    const s = e.s;
    if (e.k === 'ignite') {
      if (s.state !== IDLE) return;
      if (s.damp && !s.dry && !e.rocket) { s.dry = true; s.pend = Math.max(0, s.pend - 1); this.events.push({ k: 'dry', s }); return; }
      s.state = LIT; s.litT = e.t; this.events.push({ k: 'lit', s, rocket: !!e.rocket });
      this.push({ t: e.t + FUSE, k: 'burst', s, from: e.from || e.src });
      return;
    }
    if (e.k === 'burst') {
      const retrig = !!e.retrig;
      if (!retrig && s.type === 'comet' && !s.flown) { // comets fly first, burst at the end of the path
        s.flown = true; s.state = FLYING; const from = e.from || { x: s.x, y: s.y + 100 }; const p = this.cometPath(s, from); const v = SPEED.comet; const Z = SHELLS.comet.zone; const k = this.zoneK(s);
        for (const d of this.shells) { if (d === s || d.state !== IDLE) continue; const u = projT(p, d); if (u >= 0 && u <= p.len && segDist(p, d) <= Z.w * k && this.canPend(d)) { d.pend++; this.push({ t: e.t + u / v + 0.03, k: 'ignite', s: d, src: s }); } }
        const tEnd = e.t + p.len / v; this.flying.push({ s, tEnd }); this.events.push({ k: 'comet', s, p, dur: p.len / v });
        this.push({ t: tEnd, k: 'burst', s, cometEnd: p });
        return;
      }
      if (e.cometEnd) { s.x = e.cometEnd.x1; s.y = e.cometEnd.y1; }
      if (!retrig) s.state = BURST;
      this.lastBurst = s;
      const res = this.launch.burst(s, this, { retrig, t: e.t, pulse: e.pulse || 0 });
      this.events.push({ k: 'burst', s, retrig, pulse: e.pulse || 0, t: e.t, res });
      if (retrig) return;
      // spread the fire
      const M = this.ctx.mods; const sp = this.speed(s);
      if (M.bigBang && s.starter) { for (const d of this.shells) if (d.state === IDLE && this.canPend(d)) { const r = Math.hypot(d.x - s.x, d.y - s.y); d.pend++; this.push({ t: e.t + 0.05 + r / SPEED.bang, k: 'ignite', s: d, src: s }); this.events.push({ k: 'tracer', a: s, b: d, dur: 0.05 + r / SPEED.bang, kind: 'bang' }); } return; }
      const k = this.zoneK(s); const Z = SHELLS[s.type].zone;
      for (const d of this.shells) {
        if (d === s || d.state !== IDLE || !this.canPend(d)) continue;
        const r = this.reach(s, d, k); if (r < 0) continue;
        const dur = 0.04 + r / sp; d.pend++; this.push({ t: e.t + dur, k: 'ignite', s: d, src: s }); this.events.push({ k: 'tracer', a: s, b: d, dur, kind: Z.k });
      }
      if (Z.k === 'spider') for (const d of this.nearest(s, M.spider)) { if (!this.canPend(d)) continue; const r = Math.hypot(d.x - s.x, d.y - s.y); const dur = 0.05 + r / SPEED.spider; d.pend++; this.push({ t: e.t + dur, k: 'ignite', s: d, src: s }); this.events.push({ k: 'tracer', a: s, b: d, dur, kind: 'spider' }); }
    }
  }
  canPend(d) { return d.pend < (d.damp && !d.dry ? 2 : 1); }
  retrigger(s, n, gap, t0) { for (let i = 1; i <= n; i++) this.push({ t: t0 + gap * i, k: 'burst', s, retrig: true, pulse: i }); }
  // remove burst shells after a launch
  sweep() { const gone = this.shells.filter((s) => s.state !== IDLE); this.shells = this.shells.filter((s) => s.state === IDLE); for (const s of this.shells) { s.pend = 0; s.starter = false; } this.launch = null; return gone; }
}
function projT(p, d) { return (d.x - p.x0) * p.dx + (d.y - p.y0) * p.dy; }
function segDist(p, d) { const u = Math.max(0, Math.min(p.len, projT(p, d))); return Math.hypot(d.x - (p.x0 + p.dx * u), d.y - (p.y0 + p.dy * u)); }

// ------------------------------------------------------------------------------------------------ scoring engine
// One Launch = one chain. Sparks × Heat = score. Every change is logged so the renderer can replay it with juice.
export class Launch {
  constructor(run, opts = {}) {
    this.run = run; this.mods = run.mods; this.boss = run.act ? run.act.boss : null;
    this.sparks = 0; this.heat = 0; this.bursts = 0; this.chain = 0; this.colorCounts = Object.fromEntries(COLOR_IDS.map((c) => [c, 0])); this.typeCounts = {};
    this.lastColor = null; this.streak = 0; this.lastT = -1; this.rainbow = false; this.moneyEarned = 0; this.duration = 0; this.syncs = 0;
    this.log = []; this.endLog = []; this.cur = null; this.phase = 'chain'; this.t = 0;
    this.isFirst = opts.launchNo === 1; this.isLast = opts.isLast; this.launchesLeft = opts.launchesLeft || 0; this.movesUsed = opts.movesUsed || 0;
    this.cats = run.catalysts.filter((i) => !i.off);
    this.starter = null; this.skyCount = 0; this.grandFinale = false; this.score = 0;
  }
  // -------------- ctx API used by catalyst hooks
  rec(k, v, at) { const e = { k, v, src: this.cur, at: at ? at.uid : null, t: this.t, S: this.sparks, H: this.heat }; (this.phase === 'end' ? this.endLog : this.log).push(e); return e; }
  add(n, b) { if (!n) return false; this.sparks += n; this.rec('s', n, b && b.s); return true; }
  heatAdd(n, b) { if (!n) return false; this.heat += n; this.rec('h', n, b && b.s); return true; }
  heatMul(x, b) { if (x === 1) return false; this.heat *= x; this.rec('x', x, b && b.s); return true; }
  money(n, b) { if (!n) return; if (this.boss === 'miser') return; this.run.money += n; this.moneyEarned += n; this.rec('$', n, b && b.s); const keep = this.cur; this.cur = null; this.patterns({ k: 'money', n }, b); this.cur = keep; return true; }
  say(text, b, cls) { this.rec('say', text, b && b.s).cls = cls; }
  chance(p) { return this.run.luck() < p; }
  retrigger(s, n) { this._retrig.push([s, n]); return true; }
  // -------------- catalysts dispatch (left → right; Mirror copies its right neighbour)
  eachCat(fn) {
    const cats = this.cats;
    for (let i = 0; i < cats.length; i++) {
      const inst = cats[i]; const def = CAT[inst.id]; this.cur = inst.uid;
      if (def.mirror) { const r = cats[i + 1]; if (r && !CAT[r.id].mirror) fn(CAT[r.id], r, true); }
      else fn(def, inst, false);
    }
    this.cur = null;
  }
  patterns(p, b) { this.eachCat((d, inst, copy) => d.pattern && d.pattern(this, p, inst, copy)); }
  burst(s, sky, { retrig, t, pulse }) {
    this.t = t; this._retrig = []; const def = SHELLS[s.type]; const run = this.run; const lv = run.formulas[s.type] || 1;
    this.bursts++; if (!retrig) { this.chain++; this.colorCounts[s.color]++; this.typeCounts[s.type] = (this.typeCounts[s.type] || 0) + 1; }
    const b = { s, type: s.type, color: s.color, enh: s.enh, starter: s.starter, retrig, pulse };
    const muted = (this.boss === 'critic' && this.bursts <= 4) || (this.boss === 'jury' && this.bursts <= 6);
    if (muted) { this.say('HUSH', b, 'mute'); }
    else {
      // base value (+ formula levels)
      let sp = def.sparks + (lv - 1) * def.lv[0]; if (this.boss === 'purist' && s.color === run.act.purist) sp = 0;
      this.add(sp, b);
      if (def.xheat) { const x = (this.mods.crown >= 2 ? 2 : def.xheat) + (lv - 1) * def.lv[1]; this.heatMul(x, b); }
      else this.heatAdd(def.heat + (lv - 1) * def.lv[1], b);
      if (def.money && !retrig) this.money(def.money, b);
      if (s.enh === 'gilded' && !retrig) this.money(1, b);
      if (s.enh === 'glass') { this.heatMul(2, b); if (!retrig && this.chance(0.25)) { s.shatter = true; this.say('SHATTER', b, 'bad'); } }
      if (s.enh === 'lucky') { if (this.chance(0.25)) { this.heatAdd(15, b); this.say('LUCKY!', b, 'luck'); } if (!retrig && this.chance(1 / 12)) this.money(8, b); }
      if (s.enh === 'prism') this.heatMul(1.5, b);
      this.eachCat((d, inst, copy) => d.burst && d.burst(this, b, inst, copy));
      // patterns
      if (!retrig) {
        if (this.lastT >= 0 && t - this.lastT < 0.03) { this.syncs++; this.heatAdd(1, b); if (this.cats.some((i) => i.id === 'metronome')) this.say('SYNC', b, 'sync'); this.patterns({ k: 'sync' }, b); }
        if (s.color === this.lastColor) { this.streak++; if (this.streak >= 3) { this.heatAdd(2, b); this.say(`STREAK ×${this.streak}`, b, 'streak'); this.patterns({ k: 'streak', n: this.streak }, b); } } else this.streak = 1;
        this.lastColor = s.color; this.lastT = t;
        if (!this.rainbow && COLOR_IDS.every((c) => this.colorCounts[c] > 0)) { this.rainbow = true; this.heatAdd(10, b); this.say('RAINBOW!', b, 'rainbow'); this.patterns({ k: 'rainbow' }, b); }
      }
    }
    // extra bursts: strobe pulses, twin, infinite encore, catalyst retriggers
    if (!retrig) {
      if (s.type === 'strobe') sky.retrigger(s, this.mods.strobe - 1, 0.26, t);
      let tw = (s.enh === 'twin' ? 1 : 0) + (this.mods.twinAll ? 1 : 0); if (tw) sky.retrigger(s, tw, 0.3, t + (s.type === 'strobe' ? 0.26 * (this.mods.strobe - 1) : 0));
      for (const [rs, n] of this._retrig) sky.retrigger(rs, n, 0.32, t);
    }
    this.duration = t;
  }
  lastShell(s, sky) { this._retrig = []; this.eachCat((d, inst, copy) => d.last && d.last(this, s, inst, copy)); for (const [rs, n] of this._retrig) { this.say('SUPERNOVA', { s: rs }, 'nova'); sky.retrigger(rs, n, 0.34, sky.t); } }
  finish(sky) {
    this.phase = 'end'; this.t = sky ? sky.t : this.t;
    const remaining = sky ? sky.shells.filter((s) => s.state === IDLE).length : 1;
    if (this.skyCount >= 5 && remaining === 0) { this.grandFinale = true; this.say('GRAND FINALE', null, 'finale'); this.heatMul(this.mods.finale); }
    if (this.boss === 'hush' || this.boss === 'jury') { this.say('THE HUSH', null, 'mute'); this.heatMul(0.5); }
    this.eachCat((d, inst, copy) => d.end && d.end(this, inst, copy));
    this.score = Math.floor(this.sparks * this.heat);
    return this.score;
  }
}
