// DRIFTLINE: procedural tracks, arcade drift physics, rival AI, ghosts, neon renderer.
import { TAU, clamp, lerp, dist, dist2, angTo, angDiff, rand, pick, seeded, shuffle } from './util.js';
import { CAR, CARS, RIVALS, PAINTS, DECALS, GLOWS, SMOKES } from './data.js';
import { FX } from './fx.js';

export const HALF_W = 78;      // half track width
const WALL = HALF_W + 95;      // hard boundary distance from centerline
const SPACING = 12;            // centerline sample spacing
const TIER_T = [0.5, 1.05, 1.75];                 // drift seconds for blue / orange / purple
const TIER_BOOST = [0, 0.7, 1.15, 1.7];          // boost seconds
const TIER_COL = ['#fff', '#4cc9f0', '#ff9f1c', '#c77dff'];

// ------------------------------------------------------------------ track
export function makeTrack(seed) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const r = seeded(seed * 7 + attempt * 101 + 13);
    const n = 8 + Math.floor(r() * 5); const R = 1450 + r() * 600;
    const ctrl = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + (r() - 0.5) * (TAU / n) * 0.6; const rr = R * (0.5 + r() * 0.65); ctrl.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr * (0.75 + r() * 0.35) }); }
    // closed Catmull-Rom → dense samples
    const raw = [];
    for (let i = 0; i < n; i++) {
      const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
      for (let t = 0; t < 1; t += 0.01) { const t2 = t * t, t3 = t2 * t; raw.push({ x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3), y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3) }); }
    }
    // resample at even spacing
    const pts = [raw[0]]; let acc = 0;
    for (let i = 1; i <= raw.length; i++) { const a = raw[i - 1], b = raw[i % raw.length]; const d = dist(a.x, a.y, b.x, b.y); acc += d; while (acc >= SPACING) { acc -= SPACING; const k = 1 - acc / d; pts.push({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) }); } }
    const N = pts.length;
    // tangents, normals, curvature
    for (let i = 0; i < N; i++) { const a = pts[(i - 1 + N) % N], b = pts[(i + 1) % N]; const ang = Math.atan2(b.y - a.y, b.x - a.x); pts[i].a = ang; pts[i].nx = -Math.sin(ang); pts[i].ny = Math.cos(ang); }
    let maxCurv = 0;
    for (let i = 0; i < N; i++) { const c = angDiff(pts[(i - 4 + N) % N].a, pts[(i + 4) % N].a); pts[i].curv = c; maxCurv = Math.max(maxCurv, Math.abs(c)); }
    if (maxCurv > 1.45) continue; // too-tight hairpin → retry
    // reject self-overlap (non-neighbours closer than track width)
    let bad = false; const minD = (HALF_W * 2 + 70) ** 2;
    for (let i = 0; i < N && !bad; i += 3) for (let j = i + 40; j < N; j += 3) { if (N - j + i < 40) continue; if (dist2(pts[i].x, pts[i].y, pts[j].x, pts[j].y) < minD) { bad = true; break; } }
    if (bad) continue;
    // start on the longest straight-ish part
    let best = 0, bestScore = -1;
    for (let i = 0; i < N; i++) { let s = 0; for (let k = -15; k < 25; k++) s += Math.abs(pts[(i + k + N) % N].curv); const sc = -s; if (sc > bestScore) { bestScore = sc; best = i; } }
    const P = pts.slice(best).concat(pts.slice(0, best));
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity; for (const p of P) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
    const track = { seed, pts: P, N, len: N * SPACING, bounds: { minX, minY, maxX, maxY } };
    buildPaths(track);
    return track;
  }
  return makeTrack(seed + 999);
}
function buildPaths(t) {
  if (typeof Path2D === 'undefined') return;
  const center = new Path2D(); t.pts.forEach((p, i) => (i ? center.lineTo(p.x, p.y) : center.moveTo(p.x, p.y))); center.closePath(); t.center = center;
  const curbs = new Path2D();
  for (let i = 0; i < t.N; i++) { const p = t.pts[i]; if (Math.abs(p.curv) < 0.35) continue; const side = p.curv > 0 ? -1 : 1; const q = t.pts[(i + 1) % t.N]; curbs.moveTo(p.x + p.nx * side * (HALF_W - 4), p.y + p.ny * side * (HALF_W - 4)); curbs.lineTo(q.x + q.nx * side * (HALF_W - 4), q.y + q.ny * side * (HALF_W - 4)); }
  t.curbs = curbs;
}
// local nearest-point search
function nearest(track, x, y, hint) {
  const N = track.N; let best = hint, bd = Infinity;
  for (let k = -25; k <= 45; k++) { const i = (hint + k + N) % N; const p = track.pts[i]; const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = i; } }
  return { i: best, d: Math.sqrt(bd) };
}

// ------------------------------------------------------------------ race
export class Race {
  constructor(o) {
    this.o = o; this.sfx = o.sfx || (() => {}); this.ev = o.events || (() => {});
    this.track = o.track || makeTrack(o.seed);
    this.laps = o.laps || 3; this.time = -3.2; this.over = false; this.fx = new FX(); this.fx.lowFx = !!o.lowFx; this.skids = []; this.finished = []; this.countT = 4;
    this.cars = [];
    const lineup = o.rivals === 0 ? [] : shuffle(RIVALS.slice()).slice(0, o.rivals ?? 5);
    const total = lineup.length + 1; const playerSlot = o.rivals === 0 ? 0 : total - 1; // player starts at the back → overtaking fun
    let ri = 0;
    for (let s = 0; s < total; s++) {
      const isP = s === playerSlot;
      const idx = (this.track.N - 6 - Math.floor(s / 2) * 5) % this.track.N; const p = this.track.pts[idx]; const side = s % 2 ? 1 : -1;
      const carDef = isP ? CAR[o.car] : pick(CARS);
      const c = { id: s, isPlayer: isP, name: isP ? (o.name || 'You') : lineup[ri++], def: carDef, x: p.x + p.nx * side * 30, y: p.y + p.ny * side * 30, a: p.a, vx: 0, vy: 0, av: 0,
        idx, prog: idx - this.track.N, lap: 0, lapStart: 0, bestLap: null, lapTimes: [], drift: 0, driftDir: 0, steerT: 0, charge: 0, tier: 0, boostT: 0, offroad: false, finished: false, place: 0,
        paint: isP ? o.paint : pick(PAINTS.slice(0, 11)), decal: isP ? o.decal : pick(DECALS), glow: isP ? o.glow : (Math.random() < 0.4 ? pick(GLOWS) : GLOWS[0]), smoke: isP ? o.smoke : SMOKES[0],
        skill: isP ? 1 : clamp((o.skill ?? 0.6) + rand(-0.08, 0.08), 0.2, 1.05), lineBias: rand(-0.25, 0.25), cleanLap: true, relT: 0, ghost: [] };
      this.cars.push(c);
    }
    this.player = this.cars.find((c) => c.isPlayer);
    this.stats = { driftTime: 0, boost3: 0, overtakes: 0, cleanLaps: 0, offroad: 0 };
    this.ghost = o.ghost || null; this.rec = []; this.recT = 0;
    this.lastPlace = total;
  }
  update(dt) {
    if (this.over) { this.fx.update(dt); return; }
    this.time += dt;
    if (this.time < 0) { const c = Math.ceil(-this.time); if (c !== this.countT && c <= 3) { this.countT = c; this.ev({ type: 'count', n: c }); this.sfx('count'); } this.fx.update(dt); return; }
    if (this.countT !== 0) { this.countT = 0; this.ev({ type: 'go' }); this.sfx('go'); for (const c of this.cars) c.lapStart = 0; }
    const I = this.o.intent ? this.o.intent(this) : { steer: 0, drift: false, brake: false };
    for (const c of this.cars) { if (c.finished && !c.isPlayer) { this.coast(c, dt); continue; } const inp = c.isPlayer ? (c.finished ? { steer: 0, brake: true } : I) : this.ai(c); this.physics(c, inp, dt); this.progress(c); }
    this.collide();
    // ghost recording (player)
    const p = this.player; this.recT += dt; if (this.recT >= 0.05) { this.recT = 0; this.rec.push(Math.round(p.x), Math.round(p.y), +p.a.toFixed(2)); }
    if (this.ghost && p.lap >= 1 && !p.finished) { const k = Math.floor((this.time - p.lapStart) / 0.05) * 3; const g = this.ghost; if (k + 2 < g.length) this.ghostPos = { x: g[k], y: g[k + 1], a: g[k + 2] }; else this.ghostPos = null; }
    // places
    const order = this.cars.slice().sort((a, b) => (b.finished - a.finished) || (a.finished && b.finished ? a.finishT - b.finishT : b.prog - a.prog));
    order.forEach((c, i) => (c.place = i + 1));
    if (!p.finished && p.place < this.lastPlace && this.time > 2) { this.stats.overtakes += this.lastPlace - p.place; this.ev({ type: 'overtake', place: p.place }); this.sfx('pass'); }
    this.lastPlace = p.place;
    for (let i = this.skids.length - 1; i >= 0 && this.skids.length > 1400; i--) this.skids.shift();
    this.fx.update(dt);
  }
  coast(c, dt) { const sp = Math.hypot(c.vx, c.vy); const k = Math.max(0, 1 - dt * 1.2); c.vx *= k; c.vy *= k; c.x += c.vx * dt; c.y += c.vy * dt; if (sp > 5) c.a = Math.atan2(c.vy, c.vx); }
  physics(c, inp, dt) {
    const D = c.def; const fx = Math.cos(c.a), fy = Math.sin(c.a), rx = -fy, ry = fx;
    let vF = c.vx * fx + c.vy * fy, vR = c.vx * rx + c.vy * ry;
    const speed = Math.hypot(c.vx, c.vy);
    const steer = clamp(inp.steer, -1, 1);
    // --- drift state machine (auto-drift on sustained hard steering, or handbrake)
    if (Math.abs(steer) > 0.45) c.steerT += dt; else c.steerT = 0;
    if (!c.drift && speed > 320 && Math.abs(steer) > 0.45 && (c.steerT > 0.2 || inp.drift)) { c.drift = 1; c.driftDir = Math.sign(steer); c.charge = 0; c.tier = 0; c.release = 0; if (c.isPlayer) this.sfx('tier'); }
    if (c.drift) {
      if (steer * c.driftDir <= 0.05) c.release += dt; else c.release = 0;
      const end = c.release > 0.12 || speed < 200 || c.offroad;
      if (end) { this.endDrift(c); }
      else {
        c.charge += dt * D.charge * (0.6 + 0.4 * clamp(Math.abs(vR) / 180, 0, 1));
        const nt = c.charge > TIER_T[2] ? 3 : c.charge > TIER_T[1] ? 2 : c.charge > TIER_T[0] ? 1 : 0;
        if (nt > c.tier) { c.tier = nt; if (c.isPlayer) { this.sfx('tier'); this.ev({ type: 'tier', tier: nt }); } }
        if (c.isPlayer) this.stats.driftTime += dt;
      }
    }
    // --- throttle / brake
    let maxS = D.maxSpeed * (c.boostT > 0 ? 1.3 : 1) * (c.offroad ? 0.5 : 1) * (c.isPlayer ? 1 : c.aiSpeed || 1);
    if (inp.brake) vF -= 900 * dt; else if (vF < maxS) vF += D.accel * (c.boostT > 0 ? 1.8 : 1) * dt * (1 - Math.max(0, vF) / (maxS * 1.15));
    if (vF > maxS) vF = lerp(vF, maxS, dt * (c.offroad ? 3 : 1.2));
    if (c.boostT > 0) { c.boostT -= dt; if (Math.random() < 0.7) this.fx.puff(c.x - fx * 26, c.y - fy * 26, c.boostCol || '#ff9f1c', 6, 0.25); }
    // --- steering
    const spK = clamp(speed / 260, 0, 1);
    let turn = steer * D.turn * spK * (vF < -20 ? -1 : 1);
    if (c.drift) turn = c.driftDir * D.turn * 1.18 * (0.55 + 0.6 * clamp(steer * c.driftDir, 0, 1)) * spK;
    c.av = lerp(c.av, turn, Math.min(1, dt * 12)); c.a += c.av * dt;
    // --- grip: kill lateral velocity (low when drifting)
    const grip = c.drift ? D.driftGrip : D.grip * (c.offroad ? 0.7 : 1);
    vR *= Math.exp(-grip * dt);
    if (c.drift) vF *= Math.exp(-0.12 * dt);
    const nfx = Math.cos(c.a), nfy = Math.sin(c.a);
    c.vx = nfx * vF + -nfy * vR; c.vy = nfy * vF + nfx * vR;
    c.x += c.vx * dt; c.y += c.vy * dt;
    // --- surface + walls
    const n = nearest(this.track, c.x, c.y, c.idx); c.idx = n.i; c.dist = n.d;
    const wasOff = c.offroad; c.offroad = n.d > HALF_W + 4;
    if (c.offroad && c.isPlayer) { c.cleanLap = false; if (!wasOff) this.sfx('grass'); if (Math.random() < 0.3) this.fx.puff(c.x, c.y, '#5a8f3a', 5, 0.4); }
    if (n.d > WALL) { const p = this.track.pts[n.i]; const ox = c.x - p.x, oy = c.y - p.y; const k = WALL / n.d; c.x = p.x + ox * k; c.y = p.y + oy * k; const nx = ox / n.d, ny = oy / n.d; const dot = c.vx * nx + c.vy * ny; if (dot > 0) { c.vx -= dot * nx * 1.6; c.vy -= dot * ny * 1.6; c.vx *= 0.6; c.vy *= 0.6; if (c.isPlayer) { this.sfx('bump'); this.fx.shake(6); } this.endDrift(c, true); } }
    // --- skids + smoke
    if ((c.drift || Math.abs(vR) > 140) && speed > 150) {
      const bx = c.x - nfx * 14, by = c.y - nfy * 14;
      if (c.lastSkid) this.skids.push([c.lastSkid[0], c.lastSkid[1], bx, by]);
      c.lastSkid = [bx, by];
      if (Math.random() < (this.fx.lowFx ? 0.25 : 0.6)) this.fx.puff(bx + rand(-6, 6), by + rand(-6, 6), c.smoke?.color || '#ddd', 9, 0.7);
      if (c.drift && c.tier > 0 && Math.random() < 0.5) this.fx.burst(bx, by, TIER_COL[c.tier], 1, 120, { life: 0.3 });
    } else c.lastSkid = null;
  }
  endDrift(c, crashed) {
    if (!c.drift) return;
    const t = crashed ? 0 : c.tier; c.drift = 0; c.steerT = 0;
    if (t > 0) { c.boostT = TIER_BOOST[t]; c.boostCol = TIER_COL[t]; if (c.isPlayer) { this.sfx('boost' + t); this.ev({ type: 'boost', tier: t }); if (t === 3) this.stats.boost3++; this.fx.ring(c.x, c.y, 40 + t * 15, TIER_COL[t]); this.fx.shake(2 + t * 2); } }
    c.charge = 0; c.tier = 0;
  }
  progress(c) {
    const N = this.track.N;
    // continuous progress, robust to wrap-around
    const base = Math.floor(c.prog / N) * N; let np = base + c.idx;
    if (np - c.prog > N / 2) np -= N; else if (c.prog - np > N / 2) np += N;
    if (np - c.prog > 60) np = c.prog; // ignore shortcuts / glitches
    c.prog = Math.max(c.prog - 5, np);
    const lap = Math.floor(c.prog / N) + 1; // lap 1 starts at line
    if (lap > c.lap && c.prog >= 0) {
      if (c.lap >= 1) { const lt = this.time - c.lapStart; c.lapTimes.push(lt); if (c.bestLap === null || lt < c.bestLap) c.bestLap = lt;
        if (c.isPlayer) { if (c.cleanLap) this.stats.cleanLaps++; this.ev({ type: 'lap', lap: c.lap, time: lt, clean: c.cleanLap, rec: this.rec }); if (this.onLap) this.onLap(lt, this.rec); }
      }
      c.lap = lap; c.lapStart = this.time; c.cleanLap = true; if (c.isPlayer) { this.rec = []; this.ghostT = 0; }
      if (c.lap > this.laps) { c.finished = true; c.finishT = this.time; this.finished.push(c); if (c.isPlayer) this.finish(); else if (!this.player.finished) this.ev({ type: 'rivalfinish', name: c.name }); }
      else if (c.isPlayer && c.lap === this.laps && this.laps > 1) { this.ev({ type: 'finallap' }); this.sfx('finallap'); }
      else if (c.isPlayer && c.lap > 1) this.sfx('lap');
    }
  }
  collide() {
    const cs = this.cars;
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
      const a = cs[i], b = cs[j]; const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy; const R = 30;
      if (d2 < R * R && d2 > 0.01) {
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = R - d; const ma = a.def.mass, mb = b.def.mass, tot = ma + mb;
        a.x -= nx * ov * (mb / tot); a.y -= ny * ov * (mb / tot); b.x += nx * ov * (ma / tot); b.y += ny * ov * (ma / tot);
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (rv < 0) { const imp = -1.3 * rv / tot; a.vx -= imp * mb * nx; a.vy -= imp * mb * ny; b.vx += imp * ma * nx; b.vy += imp * ma * ny; if ((a.isPlayer || b.isPlayer) && -rv > 60) { this.sfx('bump'); this.fx.burst(a.x + nx * 15, a.y + ny * 15, '#ffd166', 6, 160); } }
      }
    }
  }
  // Rival AI: follow a racing line with look-ahead, brake for corners. Skill = line quality + corner speed.
  ai(c) {
    const T = this.track, N = T.N; const sp = Math.hypot(c.vx, c.vy);
    const look = Math.round(6 + sp * 0.022);
    const ti = (c.idx + look) % N; const tp = T.pts[ti];
    // racing line: shift toward inside of upcoming curvature
    let curvAhead = 0; for (let k = 0; k < 30; k += 3) curvAhead += T.pts[(c.idx + look + k) % N].curv;
    const off = clamp(-curvAhead * 70, -HALF_W * 0.7, HALF_W * 0.7) * (0.5 + 0.5 * c.skill) + c.lineBias * HALF_W * 0.4;
    const tx = tp.x + tp.nx * off, ty = tp.y + tp.ny * off;
    const want = angTo(c.x, c.y, tx, ty); const steer = clamp(angDiff(c.a, want) * 2.6, -1, 1);
    let maxC = 0; for (let k = 4; k < 46; k += 3) maxC = Math.max(maxC, Math.abs(T.pts[(c.idx + k) % N].curv));
    const target = c.def.maxSpeed * clamp(1.12 - maxC * (0.9 - 0.25 * c.skill), 0.42, 1) * (0.86 + 0.14 * c.skill);
    // gentle rubber band so races stay close (never more than ±5%)
    const p = this.player; const gap = (c.prog - p.prog) / N; c.aiSpeed = clamp(1 - gap * 0.08, 0.95, 1.05) * (0.9 + 0.1 * c.skill);
    return { steer, brake: sp > target * 1.08, drift: false };
  }
  finish() {
    const p = this.player; this.over = false;
    // estimate rivals' finishing order from progress so results are immediate
    setTimeout(() => { this.over = true; }, 1600);
    this.ev({ type: 'finish', place: p.place });
    this.sfx(p.place === 1 ? 'win' : 'lose');
    p.place = this.finished.length;
    const res = { place: p.place, total: this.cars.length, time: p.finishT, bestLap: p.bestLap, laps: p.lapTimes, ...this.stats };
    setTimeout(() => this.o.onEnd && this.o.onEnd(res), 1800);
  }
}

// Reference lap: a perfect-skill AI drives one lap headless → medal times for time trials.
export function referenceLap(track, carId = 'sparrow') {
  const r = new Race({ track, rivals: 0, car: carId, laps: 2, intent: null });
  const c = r.player; c.isPlayer = false; c.skill = 1.05; r.player = { prog: 0 }; // AI drives itself
  let t = 0; const N = track.N;
  while (c.lap < 3 && t < 400) { r.time += 1 / 60; t += 1 / 60; if (r.time > 0) { r.physics(c, r.ai(c), 1 / 60); r.progress(c); r.player.prog = c.prog; } }
  return c.lapTimes[1] || c.lapTimes[0] || 40;
}

// ------------------------------------------------------------------ renderer
export function drawCar(ctx, c, t, o = {}) {
  const paint = c.paint || PAINTS[0]; const D = c.def; const c1 = paint.c1, c2 = paint.c2;
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  const glow = c.glow && c.glow.color; if (glow) { ctx.fillStyle = glow === 'rainbow' ? `hsl(${(t * 120) % 360},90%,60%)` : glow; ctx.globalAlpha = (o.alpha ?? 1) * 0.35; ctx.beginPath(); ctx.ellipse(0, 0, 34, 22, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = o.alpha ?? 1; }
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-20, -11, 44, 26);
  // wheels
  ctx.fillStyle = '#111'; const steerA = clamp(c.av || 0, -1, 1) * 0.35;
  for (const [wx, wy, st] of [[-12, -12, 0], [-12, 12, 0], [13, -12, 1], [13, 12, 1]]) { ctx.save(); ctx.translate(wx, wy); if (st) ctx.rotate(steerA); ctx.fillRect(-5, -3, 10, 6); ctx.restore(); }
  // body by shape
  ctx.strokeStyle = '#0b1320'; ctx.lineWidth = 2.5; ctx.fillStyle = c1;
  const sh = D.shape; ctx.beginPath();
  if (sh === 'wedge') { ctx.moveTo(24, 0); ctx.lineTo(10, -11); ctx.lineTo(-20, -11); ctx.lineTo(-20, 11); ctx.lineTo(10, 11); ctx.closePath(); }
  else if (sh === 'truck') { rr(ctx, -21, -12, 42, 24, 4); }
  else if (sh === 'bubble') { ctx.ellipse(0, 0, 21, 12, 0, 0, TAU); }
  else if (sh === 'muscle') { rr(ctx, -22, -12, 45, 24, 3); }
  else if (sh === 'coupe') { ctx.moveTo(23, -6); ctx.quadraticCurveTo(24, 0, 23, 6); ctx.lineTo(16, 11); ctx.lineTo(-21, 10); ctx.lineTo(-21, -10); ctx.lineTo(16, -11); ctx.closePath(); }
  else rr(ctx, -20, -11, 41, 22, 7);
  ctx.fill(); ctx.stroke();
  if (paint.fx === 'chrome') { const g = ctx.createLinearGradient(-20, -12, 20, 12); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop((t * 0.5) % 1, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fill(); }
  // decal
  const dc = c.decal?.id;
  ctx.save(); ctx.clip();
  if (dc === 'd_stripes') { ctx.fillStyle = c2; ctx.fillRect(-24, -5, 50, 3); ctx.fillRect(-24, 2, 50, 3); }
  else if (dc === 'd_checker') { ctx.fillStyle = c2; for (let i = -22; i < 24; i += 6) for (let j = -12; j < 12; j += 6) if (((i + j) / 6) % 2 === 0) ctx.fillRect(i, j, 3, 3); }
  else if (dc === 'd_flames') { ctx.fillStyle = '#ff9f1c'; ctx.beginPath(); ctx.moveTo(22, -10); for (let i = 0; i < 4; i++) { ctx.lineTo(10 - i * 8, -10 + (i % 2 ? 10 : 4)); ctx.lineTo(4 - i * 8, -10); } ctx.lineTo(22, -10); ctx.fill(); ctx.beginPath(); ctx.moveTo(22, 10); for (let i = 0; i < 4; i++) { ctx.lineTo(10 - i * 8, 10 - (i % 2 ? 10 : 4)); ctx.lineTo(4 - i * 8, 10); } ctx.fill(); }
  else if (dc === 'd_bolt') { ctx.fillStyle = '#f8f32b'; ctx.beginPath(); ctx.moveTo(-18, -3); ctx.lineTo(0, -6); ctx.lineTo(-3, 0); ctx.lineTo(18, -2); ctx.lineTo(0, 6); ctx.lineTo(3, 1); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  // cabin
  ctx.fillStyle = 'rgba(20,30,50,.9)'; ctx.beginPath(); rr(ctx, -9, -8, 15, 16, 4); ctx.fill();
  ctx.fillStyle = 'rgba(160,231,255,.5)'; ctx.fillRect(2, -7, 3, 14);
  if (dc === 'd_number') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-15, 0, 5, 0, TAU); ctx.fill(); ctx.fillStyle = '#000'; ctx.font = '900 7px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String((c.id % 9) + 1), -15, 0.5); }
  // spoiler
  ctx.fillStyle = c2; ctx.fillRect(-22, -11, 3, 22);
  // lights
  ctx.fillStyle = '#fff3b0'; ctx.fillRect(19, -9, 3, 4); ctx.fillRect(19, 5, 3, 4);
  ctx.fillStyle = '#ff2d55'; ctx.fillRect(-21, -9, 2, 4); ctx.fillRect(-21, 5, 2, 4);
  ctx.restore();
}
function rr(ctx, x, y, w, h, r) { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

export class RaceRenderer {
  constructor(canvas) { this.c = canvas; this.ctx = canvas.getContext('2d'); this.cam = { x: 0, y: 0, s: 1 }; this.t = 0; }
  resize(w, h, dpr) { this.w = w; this.h = h; this.dpr = dpr; this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr); }
  draw(r, dt) {
    const ctx = this.ctx; this.t += dt; const t = this.t; const W = this.w, H = this.h, dpr = this.dpr; const p = r.player; const T = r.track;
    const sp = Math.hypot(p.vx, p.vy);
    const fx = p.x + p.vx * 0.35, fy = p.y + p.vy * 0.35;
    if (!this.init) { this.cam.x = fx; this.cam.y = fy; this.init = true; this.zoom = 1; }
    this.cam.x += (fx - this.cam.x) * Math.min(1, dt * 5); this.cam.y += (fy - this.cam.y) * Math.min(1, dt * 5);
    const baseView = Math.max(W, H) < 900 ? 950 : 1150; this.zoom = lerp(this.zoom, 1 + clamp(sp / 650, 0, 1.3) * 0.22, dt * 2);
    const s = (Math.max(W, H) / (baseView * this.zoom)) * dpr; this.cam.s = s;
    const sh = r.fx.shakeAmt;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0a0618'; ctx.fillRect(0, 0, this.c.width, this.c.height);
    ctx.setTransform(s, 0, 0, s, (W * dpr) / 2 - this.cam.x * s + rand(-sh, sh) * dpr, (H * dpr) / 2 - this.cam.y * s + rand(-sh, sh) * dpr);
    const hw = (W * dpr) / 2 / s + 60, hh = (H * dpr) / 2 / s + 60; const x0 = this.cam.x - hw, x1 = this.cam.x + hw, y0 = this.cam.y - hh, y1 = this.cam.y + hh;
    // synthwave grid
    ctx.strokeStyle = 'rgba(199,125,255,.13)'; ctx.lineWidth = 2; ctx.beginPath(); const G = 120;
    for (let x = Math.floor(x0 / G) * G; x < x1; x += G) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
    for (let y = Math.floor(y0 / G) * G; y < y1; y += G) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
    ctx.stroke();
    // track layers
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(247,37,133,.18)'; ctx.lineWidth = HALF_W * 2 + 110; ctx.stroke(T.center);
    ctx.strokeStyle = '#1d3b2a'; ctx.lineWidth = HALF_W * 2 + 90; ctx.stroke(T.center);
    ctx.strokeStyle = '#f72585'; ctx.lineWidth = HALF_W * 2 + 14; ctx.stroke(T.center);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = HALF_W * 2 + 6; ctx.stroke(T.center);
    ctx.strokeStyle = '#26233a'; ctx.lineWidth = HALF_W * 2; ctx.stroke(T.center);
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 4; ctx.setLineDash([30, 40]); ctx.stroke(T.center); ctx.setLineDash([]);
    // curbs
    ctx.lineCap = 'butt'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.stroke(T.curbs); ctx.strokeStyle = '#ff2d55'; ctx.setLineDash([14, 14]); ctx.stroke(T.curbs); ctx.setLineDash([]); ctx.lineCap = 'round';
    // start line
    const s0 = T.pts[0]; ctx.save(); ctx.translate(s0.x, s0.y); ctx.rotate(s0.a);
    for (let i = -6; i < 6; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? '#fff' : '#111'; ctx.fillRect(j * 12 - 12, i * 13, 12, 13); }
    ctx.restore();
    // skids
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 7; ctx.beginPath();
    for (const k of r.skids) { if (k[0] < x0 || k[0] > x1 || k[1] < y0 || k[1] > y1) continue; ctx.moveTo(k[0], k[1]); ctx.lineTo(k[2], k[3]); }
    ctx.stroke();
    // ghost
    if (r.ghost && r.ghostPos) { drawCar(ctx, { ...r.ghostPos, def: p.def, paint: { c1: '#7ae7c7', c2: '#fff' }, decal: null, glow: null, av: 0, id: 0 }, t, { alpha: 0.35 }); }
    // cars
    for (const c of r.cars) { if (c.x < x0 || c.x > x1 || c.y < y0 || c.y > y1) continue; drawCar(ctx, c, t); }
    r.fx.draw(ctx);
    // names
    ctx.font = '800 13px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.8)';
    for (const c of r.cars) { if (c.isPlayer || c.x < x0 || c.x > x1 || c.y < y0 || c.y > y1) continue; ctx.strokeText(c.name, c.x, c.y - 30); ctx.fillStyle = '#fff'; ctx.fillText(c.name, c.x, c.y - 30); }
    // drift charge ring on player
    if (p.drift) { const k = p.charge; const tier = p.tier; const nextT = TIER_T[Math.min(2, tier)]; const prevT = tier ? TIER_T[tier - 1] : 0; const prog = tier >= 3 ? 1 : (k - prevT) / (nextT - prevT);
      ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(p.x, p.y, 36, 0, TAU); ctx.stroke();
      ctx.strokeStyle = TIER_COL[Math.min(3, tier + (tier >= 3 ? 0 : 1))]; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(p.x, p.y, 36, -Math.PI / 2, -Math.PI / 2 + TAU * prog); ctx.stroke(); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (p.boostT > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.08, p.boostT * 0.05)})`; ctx.fillRect(0, 0, this.c.width, this.c.height); }
    if (r.fx.flashA > 0.01) { ctx.globalAlpha = r.fx.flashA; ctx.fillStyle = r.fx.flashC; ctx.fillRect(0, 0, this.c.width, this.c.height); ctx.globalAlpha = 1; }
  }
}
export function drawMinimap(ctx, r, size) {
  const T = r.track, b = T.bounds; const w = b.maxX - b.minX, h = b.maxY - b.minY; const k = (size - 16) / Math.max(w, h);
  const ox = (size - w * k) / 2 - b.minX * k, oy = (size - h * k) / 2 - b.minY * k;
  ctx.clearRect(0, 0, size, size); ctx.fillStyle = 'rgba(10,6,24,.75)'; ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#f72585'; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.beginPath(); T.pts.forEach((p, i) => (i % 3 ? null : i ? ctx.lineTo(p.x * k + ox, p.y * k + oy) : ctx.moveTo(p.x * k + ox, p.y * k + oy))); ctx.closePath(); ctx.stroke();
  ctx.strokeStyle = '#26233a'; ctx.lineWidth = 3; ctx.stroke();
  for (const c of r.cars) { ctx.fillStyle = c.isPlayer ? '#7CFC9A' : '#ff4d6d'; ctx.beginPath(); ctx.arc(c.x * k + ox, c.y * k + oy, c.isPlayer ? 5 : 3.5, 0, TAU); ctx.fill(); }
}
export { TIER_COL };
