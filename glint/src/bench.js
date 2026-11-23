// GLINT: the cutting bench, the heart of the game.
//   crack    tap a rock open (mystery / expedition roughs)
//   plan     place your cut inside the rough: size vs. inclusions vs. shape
//   cut      girdle preform → pavilion → crown → table. Set the angle on the dial (live ray-traced
//            value meter), then HOLD to grind and release on the meet
//   polish   rub the facets until they turn to glass
//   appraise the spin, the certificate, the money
import { rng, mMul, mRotX, mRotY, mRotZ, mApply, mT, mOrtho, clamp, lerp, DEG, dot } from './math.js';
import { buildPoly, rayHit, inside } from './poly.js';
import { CUTS, cutPlanes, outlineOf, STAGE } from './cuts.js';
import { SPECIES, variety, optics, RARITY, gemName } from './species.js';
import { roughGeom, refVerts, maxFit, ORIENT, toGemSpace, stonePlanes, grindStarts, clarityOf, caratOf, lightPerf, perfMax, bestAngles, appraise, cutGradeOf, CUT_GRADES, colorGrade, CLARITY_MULT, autoPlace, placeCarat } from './stone.js';
import { upVal, uid } from './economy.js';

const ST = { PAV: 'pav', CROWN: 'crown', TABLE: 'table' };
// natural crystal faces are glassy; broken faces and water-worn pebbles are frosted
export const roughFrost = (G, S) => G.planes.map((p, i) => (S.habit === 'pebble' ? 0.5 : p.tag % 100 === 1 ? 0.55 : 0.1 + ((i * 7) % 5) * 0.03));
export const STAGES = [
  { id: 'pav', name: 'Pavilion', key: 'pav', u: 'uP', range: [32, 56], hint: 'The pavilion is the mirror at the back. Its angle decides whether light bounces back to the eye or leaks out the bottom.' },
  { id: 'crown', name: 'Crown', key: 'crown', u: 'uC', range: [24, 44], hint: 'The crown splits light into colour (fire). Steeper crowns flash more rainbow.' },
  { id: 'table', name: 'Table', key: 'table', u: 'uT', range: [45, 72], hint: 'The table is the big window on top. Wide tables look bright; smaller tables give more fire.' },
];
// smooth cut multiplier (score → value multiplier)
const MPTS = [[0, 0.3], [0.5, 0.42], [0.62, 0.7], [0.76, 0.92], [0.86, 1.12], [0.93, 1.35], [0.975, 1.6], [1.0, 1.66], [1.2, 1.7]];
export const cutMult = (s) => { for (let i = 1; i < MPTS.length; i++) if (s <= MPTS[i][0]) { const a = MPTS[i - 1], b = MPTS[i]; return a[1] + (b[1] - a[1]) * ((s - a[0]) / (b[0] - a[0])); } return 1.7; };

export class Bench {
  constructor(app) {
    this.app = app; this.stage = 'empty'; this.r = null; this.view = mMul(mRotX(0.5), mRotY(0.4)); this.spin = 0; this.zoom = 1; this.rb = 12; this.rbT = 12;
    this.shards = []; this.dust = []; this.sparks = []; this.cracks = []; this.flash = 0; this.shake = 0; this.t = 0; this.curve = null; this.grinding = false; this.hold = 0; this.timers = [];
  }
  after(sec, fn) { this.timers.push({ t: sec, fn }); }
  get save() { return this.app.save; }
  // ---------------- loading ----------------
  load(r) {
    this.timers = []; this.cracking = false; this.polishDone = false; this.r = r; this.t = 0; this.shards = []; this.cracks = []; this.flash = 0; this.result = null; this.meetQ = {}; this.grade = null;
    this.geom = roughGeom(r); this.S = SPECIES[r.sp]; this.V = variety(r.sp, r.vid); this.opt = optics(r.sp, r.vid, r.tone, 0.25);
    this.cut = (this.save.recipes[r.sp] && this.app.cutsAvailable().includes(this.save.recipes[r.sp].cut)) ? this.save.recipes[r.sp].cut : 'round';
    if (!this.app.cutsAvailable().includes(this.cut)) this.cut = 'round';
    this.view = mMul(mRotX(0.42), mRotY(0.6)); this.rb = this.rbT = this.geom.r * 1.25;
    if (!r.known) this.toCrack(); else this.toPlan();
  }
  // ---------------- crack ----------------
  toCrack() {
    this.stage = 'crack'; const R = rng(this.r.seed ^ 0x5eed); this.hits = 0; this.hitsNeed = upVal(this.save, 'hammer');
    const n = 15, pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + R.range(-0.12, 0.12); const rr = R.range(0.82, 1.05); pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.86]); }
    this.rock = { pts, seed: this.r.seed, R, tone: R.pick([[120, 104, 92], [96, 90, 86], [134, 110, 84], [88, 80, 92]]) };
    this.rockTex = null; this.cracks = []; this.app.ui.bench(this);
  }
  hammer(px, py) {
    if (this.stage !== 'crack' || this.cracking) return;
    this.hits++; const A = this.app; A.audio.play('hammer', this.hits); this.shake = 0.35; A.vibrate(15);
    const L = this.L; const R = this.rock.R; const ix = (px - L.gx) / (L.gr * 1.05), iy = (py - L.gy) / (L.gr * 1.05);
    // grow a few crack branches from the impact point
    for (let k = 0; k < 2 + this.hits; k++) { let x = clamp(ix, -0.6, 0.6) + R.range(-0.1, 0.1), y = clamp(iy, -0.5, 0.5) + R.range(-0.1, 0.1); const path = [[x, y]]; let a = R.range(0, Math.PI * 2); for (let s = 0; s < 7; s++) { a += R.range(-0.7, 0.7); x += Math.cos(a) * 0.14; y += Math.sin(a) * 0.14; path.push([x, y]); } this.cracks.push(path); }
    for (let i = 0; i < 14; i++) this.dust.push({ x: px, y: py, vx: R.range(-160, 160), vy: R.range(-220, 40), life: R.range(0.4, 0.9), t: 0, s: R.range(1.5, 4) });
    if (this.hits >= this.hitsNeed) this.split();
  }
  split() {
    this.cracking = true; const A = this.app; A.audio.play('crack'); this.shake = 0.8; this.flash = 1; A.vibrate([20, 30, 40]);
    const L = this.L, R = this.rock.R, P = this.rock.pts; const s = L.gr * 1.05;
    for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; const cx = (a[0] + b[0]) / 3, cy = (a[1] + b[1]) / 3; const ang = Math.atan2(cy, cx);
      this.shards.push({ pts: [[0, 0], a, b], x: L.gx, y: L.gy, vx: Math.cos(ang) * R.range(260, 520), vy: Math.sin(ang) * R.range(260, 520) - 200, rot: 0, vr: R.range(-6, 6), life: 1.3, t: 0, s }); }
    this.r.known = true; this.save.stats.cracked++;
    const rare = this.V.rare || 0; this.after(0.26, () => { A.audio.play('reveal', rare); if (rare >= 3) A.platformHappy(); });
    this.reveal = { t: 0, rare };
    this.app.discover(this.r);
    this.after(1.5, () => { this.cracking = false; this.toPlan(true); });
  }
  // ---------------- plan ----------------
  toPlan(fromCrack) {
    this.stage = 'plan'; this.rbT = this.geom.r * 1.25; if (!fromCrack) this.rb = this.rbT;
    this.place = this.place && this.place.rid === this.r.id ? this.place : this.defaultPlace(); this.place.rid = this.r.id;
    this.refit(); this.app.ui.bench(this); this.app.ui.tutor('plan');
  }
  defaultPlace() {
    const G = this.geom; const c = G.verts.reduce((a, q) => [a[0] + q[0], a[1] + q[1], a[2] + q[2]], [0, 0, 0]).map((x) => x / G.verts.length);
    const m = ORIENT[0]; return { m, t: c, s: maxFit(G.planes, refVerts(this.cut).verts, m, c), o: 0, yaw: 0 };
  }
  refit() {
    const p = this.place; p.m = mMul(ORIENT[p.o % ORIENT.length], mRotY(p.yaw)); p.s = maxFit(this.geom.planes, refVerts(this.cut).verts, p.m, p.t);
    if (p.s <= 0.05) { // pushed outside: pull back toward the centre
      const G = this.geom; const c = G.verts.reduce((a, q) => [a[0] + q[0], a[1] + q[1], a[2] + q[2]], [0, 0, 0]).map((x) => x / G.verts.length);
      for (let k = 0; k < 20 && p.s <= 0.05; k++) { p.t = p.t.map((x, i) => lerp(x, c[i], 0.2)); p.s = maxFit(G.planes, refVerts(this.cut).verts, p.m, p.t); }
    }
    // clarity preview with reference proportions
    const C = CUTS[this.cut]; const gs = toGemSpace(this.r, p); const cp = cutPlanes(this.cut, { pav: C.pav, crown: C.crown, table: C.table, uG: 1, uP: 1, uC: 1, uT: 1 });
    this.planClar = clarityOf(gs.inc, cp); this.planCt = placeCarat(this.r, this.cut, p);
    this.planVal = this.estValue(this.planCt, 0.9, this.planClar.grade);
    this.gemInc = gs.inc;
  }
  estValue(ct, score, clar) { const V = this.V; const cm = CLARITY_MULT[clar] || 1; const clM = this.r.sp === 'emerald' ? 1 + (cm - 1) * 0.5 : cm; return V.ppc * Math.pow(Math.max(0.02, ct), 1.28) * cutMult(score) * clM * colorGrade(this.r.sp, this.r.vid, this.r.tone).mult; }
  setCut(id) { if (this.stage !== 'plan') return; this.cut = id; this.refit(); this.app.ui.bench(this); this.app.audio.play('tap'); }
  rotateGem(d) { this.place.yaw += d * (Math.PI / 8); this.refit(); this.app.ui.bench(this); this.app.audio.play('soft'); }
  tipGem() { this.place.o = (this.place.o + 1) % ORIENT.length; this.refit(); this.app.ui.bench(this); this.app.audio.play('soft'); }
  optimise() {
    const lvl = upVal(this.save, 'planner'); if (!lvl) return; const G = this.geom; const V = refVerts(this.cut).verts; let best = null; const R = rng(this.r.seed + 77);
    const c = G.verts.reduce((a, q) => [a[0] + q[0], a[1] + q[1], a[2] + q[2]], [0, 0, 0]).map((x) => x / G.verts.length);
    for (let o = 0; o < ORIENT.length; o++) for (let y = 0; y < 8; y++) for (let k = 0; k < (lvl > 1 ? 6 : 3); k++) {
      const t = k === 0 ? c : c.map((x) => x + R.range(-0.25, 0.25) * G.r); const m = mMul(ORIENT[o], mRotY((y * Math.PI) / 8)); const s = maxFit(G.planes, V, m, t); if (s <= 0) continue;
      const pl = { m, t, s, o, yaw: (y * Math.PI) / 8 }; const ct = placeCarat(this.r, this.cut, pl);
      let score = ct; if (lvl > 1) { const C = CUTS[this.cut]; const gs = toGemSpace(this.r, pl); const cl = clarityOf(gs.inc, cutPlanes(this.cut, { pav: C.pav, crown: C.crown, table: C.table, uG: 1, uP: 1, uC: 1, uT: 1 })); score = this.estValue(ct, 0.9, cl.grade); }
      if (!best || score > best.score) best = { pl, score };
    }
    if (best) { this.place = { ...best.pl, rid: this.r.id }; this.refit(); this.app.ui.bench(this); this.app.audio.play('ting'); }
  }
  // ---------------- cut ----------------
  startCut() {
    if (this.stage !== 'plan') return; if (this.planCt < 0.02) { this.app.ui.toast('No room for a gem there: move the outline into the crystal', 'bad'); this.app.audio.play('deny'); return; }
    const rec = this.save.recipes[this.r.sp + ':' + this.cut]; const C = CUTS[this.cut];
    this.P = { pav: rec ? rec.pav : C.pav, crown: rec ? rec.crown : C.crown, table: rec ? rec.table : C.table, uG: 0 };
    this.stage = 'cut'; this.sub = 'girdle'; this.starts = grindStarts(this.r, this.place, this.cut, this.P);
    this.frost = null; this.gemR = 1.25; this.rbT = this.roughRadiusGem() * 1.15; this.rb = this.rbT;
    this.viewT = mMul(mRotX(0.55), mRotY(0.3)); this.view = this.viewT;
    this.preformT = 0; this.app.audio.play('whoosh'); this.app.ui.bench(this); this.rebuild();
  }
  roughRadiusGem() { const gs = toGemSpace(this.r, this.place); const P = buildPoly(gs.planes, 50); let m = 0; for (const v of P.verts) m = Math.max(m, Math.hypot(v[0], v[1], v[2])); return Math.min(m, 3.2); }
  stageDef() { return STAGES.find((s) => s.id === this.sub); }
  enterStage(id) {
    this.sub = id; const sd = this.stageDef(); this.P[sd.u] = 0; this.uHold = 0; this.grinding = false; this.stageDone = false;
    this.starts = grindStarts(this.r, this.place, this.cut, this.P);
    if (id === 'pav') this.viewT = mMul(mRotX(-0.62), mRotY(0.35)); else this.viewT = mMul(mRotX(0.72), mRotY(0.35));
    this.curve = { stage: id, pts: [], i: 0, ready: false }; this.rebuild(); this.app.ui.bench(this); this.app.ui.tutor(id);
  }
  setAngle(v) { if (this.stage !== 'cut' || this.grinding || this.P[this.stageDef().u] > 0.02) return; const sd = this.stageDef(); v = clamp(v, sd.range[0], sd.range[1]); this.P[sd.key] = sd.key === 'table' ? v / 100 : v; this.app.ui.benchLive(this); }
  angleOf() { const sd = this.stageDef(); const v = this.P[sd.key]; return sd.key === 'table' ? v * 100 : v; }
  // live value estimate for an angle of the current stage (from the progressive curve)
  curveAt(a) { const c = this.curve; if (!c || !c.pts.length) return null; const pts = c.pts; let lo = null, hi = null; for (const p of pts) { if (p.a <= a && (!lo || p.a > lo.a)) lo = p; if (p.a >= a && (!hi || p.a < hi.a)) hi = p; } if (!lo) lo = hi; if (!hi) hi = lo; if (lo === hi) return lo; const f = (a - lo.a) / (hi.a - lo.a); return { a, v: lerp(lo.v, hi.v, f), ratio: lerp(lo.ratio, hi.ratio, f), ct: lerp(lo.ct, hi.ct, f), leak: lerp(lo.leak, hi.leak, f), ext: lerp(lo.ext, hi.ext, f) }; }
  stepCurve(budgetMs) {
    const c = this.curve; if (!c || c.ready || this.stage !== 'cut') return; const sd = this.stageDef(); const t0 = performance.now();
    const [a0, a1] = sd.range; const step = sd.key === 'table' ? 2 : 1; const n = Math.round((a1 - a0) / step) + 1;
    while (c.i < n && performance.now() - t0 < budgetMs) {
      const a = a0 + c.i * step; const P = { ...this.P, uG: 1, uP: 1, uC: 1, uT: 1 }; P[sd.key] = sd.key === 'table' ? a / 100 : a;
      const st = stonePlanes(this.r, this.place, this.cut, P); const lp = lightPerf(st.planes, null, this.r.sp, this.cut, 12);
      const vol = buildPoly(st.planes, 6).volume; const ct = caratOf(vol * this.place.s ** 3, this.r.sp); const cl = clarityOf(st.inc, st.cut).grade;
      c.pts.push({ a, ratio: lp.ratio, ct, v: this.estValue(ct, lp.ratio, cl), leak: lp.leak, ext: lp.ext }); c.i++;
    }
    if (c.i >= n) { c.ready = true; let best = c.pts[0]; for (const p of c.pts) if (p.v > best.v) best = p; c.best = best; let bb = c.pts[0]; for (const p of c.pts) if (p.ratio > bb.ratio) bb = p; c.bestB = bb; this.app.ui.benchLive(this); }
  }
  grindStart() { if (this.stage !== 'cut' || this.sub === 'girdle' || this.stageDone) return; this.grinding = true; this.hold = 0; this.app.ui.benchLive(this); }
  grindStop() {
    if (!this.grinding) return; this.grinding = false; this.app.audio.grindOn(false); this.rebuild(); const sd = this.stageDef(); const u = this.P[sd.u]; const win = upVal(this.save, 'machine');
    const err = u - 1;
    if (err >= -win) { // reached the meet
      const q = clamp(1 - Math.abs(err) / win, 0, 1); const perfect = Math.abs(err) <= win * 0.4; this.meetQ[sd.id] = err > win ? Math.max(0, 1 - err / (win * 4)) * 0.6 : q;
      this.stageDone = true; this.app.ui.meet(perfect ? 'PERFECT MEET' : err > win ? 'OVER-GROUND' : 'GOOD MEET', perfect ? 'gold' : err > win ? 'red' : 'ok');
      this.app.audio.play(perfect ? 'ting' : err > win ? 'over' : 'meet'); if (perfect) { this.flash = 0.4; this.app.vibrate(25); }
      this.after(0.65, () => this.nextStage());
    } else this.app.ui.meet('KEEP GRINDING', 'dim');
    this.app.ui.benchLive(this);
  }
  nextStage() {
    const order = ['girdle', 'pav', 'crown', 'table']; const i = order.indexOf(this.sub);
    if (i < order.length - 1) this.enterStage(order[i + 1]); else this.toPolish();
  }
  // planes of the stone right now (gem space)
  rebuild() {
    const P = this.P; const st = stonePlanes(this.r, this.place, this.cut, P, this.starts);
    // drop rough planes that no longer touch the solid (keeps the shader fast)
    const poly = buildPoly(st.planes, 8); const used = new Set(poly.faces.map((f) => f.pi)); const remap = {};
    const planes = [], frost = [], tags = []; st.planes.forEach((p, i) => { if (!used.has(i)) return; remap[i] = planes.length; planes.push(p); tags.push(p.stage); frost.push(p.stage === STAGE.ROUGH ? (p.tag % 100 === 1 || this.S.habit === 'pebble' ? 0.5 : 0.14) : this.facetFrost(p)); });
    for (const f of poly.faces) f.pi = remap[f.pi]; for (const e of poly.edges) e[2] = remap[e[2]]; this.poly = poly; this.stone = { planes, frost, inc: st.inc, ver: (this.stone ? this.stone.ver : 0) + 1 }; this.tags = tags; this.stInc = st.inc;
    let m = 0; for (const v of this.poly.verts) m = Math.max(m, Math.hypot(v[0], v[1], v[2])); this.gemR = m;
  }
  facetFrost(p) { if (this.stage === 'polish' || this.stage === 'appraise') { const k = this.polishMap && this.polishMap[p.idx]; return k === undefined ? 0.5 : k; } return 0.48; }
  // ---------------- polish ----------------
  toPolish() {
    this.stage = 'polish'; this.polishMap = {}; for (const p of this.stone.planes) if (p.idx !== undefined) this.polishMap[p.idx] = 0.5;
    this.viewT = mMul(mRotX(0.95), mRotY(0.2)); this.rbT = this.gemR * 1.12; this.rebuild(); this.polishPct = 0; this.app.ui.bench(this);
    if (upVal(this.save, 'polisher') >= 99) this.autoPolish = 1.2; this.app.ui.tutor('polish');
  }
  rub(px, py, dist) {
    if (this.stage !== 'polish') return; const lvl = upVal(this.save, 'polisher'); const L = this.L; const rate = 0.0011 * lvl * dist; const glob = 0.00024 * lvl * dist;
    for (const k in this.polishMap) this.polishMap[k] = Math.max(0, this.polishMap[k] - glob);
    const hits = new Set(); for (const [ox, oy] of [[0, 0], [12, 0], [-12, 0], [0, 12], [0, -12], [9, 9], [-9, -9]]) { const h = this.pick(px + ox, py + oy); if (h >= 0) hits.add(h); }
    for (const i of hits) { const p = this.stone.planes[i]; if (p.idx === undefined) continue; this.polishMap[p.idx] = Math.max(0, this.polishMap[p.idx] - rate * (1 + Math.random())); }
    if (hits.size) { this.app.audio.polishOn(dist / 8); if (Math.random() < 0.3) this.sparks.push({ x: px, y: py, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 80, life: 0.5, t: 0, c: '#fff6d8', s: 1.6 }); }
    this.updatePolish();
  }
  updatePolish() {
    const v = Object.values(this.polishMap); this.polishPct = 1 - v.reduce((a, b) => a + b, 0) / (v.length * 0.5);
    this.stone.frost = this.stone.planes.map((p) => (p.stage === STAGE.ROUGH ? 0.3 : this.polishMap[p.idx] ?? 0)); this.stone.ver++;
    this.app.ui.benchLive(this);
    if (this.polishPct >= 0.985 && !this.polishDone) { this.polishDone = true; this.app.audio.play('ting'); this.app.audio.polishOn(0); this.after(0.45, () => this.finish()); }
  }
  // screen → facet index (CPU ray cast through the same camera as the shader)
  pick(px, py) {
    const L = this.L; const q = [(px - L.gx) / L.gr, -(py - L.gy) / L.gr]; const rbv = this.rb; const cam = rbv * 7;
    const o = [0, 0, cam], d = [q[0] * rbv, q[1] * rbv, -cam]; const dl = Math.hypot(...d); d[0] /= dl; d[1] /= dl; d[2] /= dl;
    const iV = mT(this.view); const og = mApply(iV, o), dg = mApply(iV, d); const h = rayHit(this.stone.planes, og, dg); return h ? h.i0 : -1;
  }
  // ---------------- appraise ----------------
  finish() {
    if (this.stage !== 'polish') return; this.app.audio.polishOn(0);
    const polish = clamp(this.polishPct, 0, 1); this.stage = 'appraise'; this.rebuild();
    const final = this.stone; const vol = this.poly.volume; const ct = caratOf(vol * this.place.s ** 3, this.r.sp);
    const lp = lightPerf(final.planes, final.frost.map((f) => (f > 0.3 ? f : 0)), this.r.sp, this.cut, 22);
    const cl = clarityOf(this.stInc, final.planes.filter((p, i) => this.tags[i] !== STAGE.ROUGH));
    const mq = ['pav', 'crown', 'table'].map((k) => this.meetQ[k] ?? 0.5); const meetAvg = mq.reduce((a, b) => a + b, 0) / 3;
    let score = lp.ratio * (0.9 + 0.1 * meetAvg) * (0.92 + 0.08 * polish);
    let natA = 0, totA = 0; for (const f of this.poly.faces) { totA += f.area; if (this.tags[f.pi] === STAGE.ROUGH) natA += f.area; } const natF = totA ? natA / totA : 0; const naturals = natF > 0.004 ? Math.max(1, Math.round(natF * 100)) : 0; if (naturals) score *= clamp(1 - natF * 2.5, 0.7, 1);
    if (score >= 0.975 && Math.min(...mq) < 0.55) score = 0.974; // Ideal demands clean meets everywhere
    const g = { id: uid(), sp: this.r.sp, vid: this.r.vid, tone: this.r.tone, cut: this.cut, ct: +ct.toFixed(ct < 10 ? 2 : 1), clarity: cl.grade, score: +score.toFixed(3), polish, perfect: mq.filter((q) => q >= 0.999 || q > 0.6).length,
      brill: lp.ratio, fire: lp.fire, leak: lp.leak, ext: lp.ext, naturals,
      rough: { seed: this.r.seed, sp: this.r.sp, size: this.r.size, clarity: this.r.clarity }, place: { m: this.place.m, t: this.place.t, s: this.place.s }, P: { ...this.P }, made: Date.now(), src: this.r.src };
    const ap = appraise(g); g.value = Math.round(this.estValue(ct, score, cl.grade) * ({ Excellent: 1.08, 'Very Good': 1, Good: 0.92, Fair: 0.8 }[ap.polishG] || 1)); g.cutG = ap.cut; g.polishG = ap.polishG; g.colorG = ap.color;
    g.perfectMeets = ['pav', 'crown', 'table'].filter((k) => (this.meetQ[k] ?? 0) >= 0.6).length;
    this.result = g; this.viewT = mMul(mRotX(1.18), mRotY(0)); this.rbT = this.gemR * 1.08;
    if (g.cutG === 'Ideal' || g.cutG === 'Excellent') { const L = this.L; const n = g.cutG === 'Ideal' ? 70 : 30; this.flash = g.cutG === 'Ideal' ? 0.9 : 0.4; for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 180 + Math.random() * 420; this.sparks.push({ x: L.gx, y: L.gy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 0.7 + Math.random() * 0.7, t: 0, c: Math.random() < 0.6 ? '#ffd98a' : '#ffffff', s: 1.5 + Math.random() * 2 }); } }
    this.save.recipes[this.r.sp + ':' + this.cut] = { pav: this.P.pav, crown: this.P.crown, table: this.P.table };
    this.save.recipes[this.r.sp] = { cut: this.cut };
    this.app.gemFinished(g, this.r);
    this.app.ui.bench(this); this.app.ui.tutor(this.save.stats.cut <= 1 ? 'cert' : null);
  }
  clear() { this.stage = 'empty'; this.r = null; this.result = null; this.stone = null; this.app.ui.bench(this); }
  // ---------------- per frame ----------------
  update(dt) {
    this.t += dt; const A = this.app;
    if (this.timers.length) { const due = []; for (const tm of this.timers) { tm.t -= dt; if (tm.t <= 0) due.push(tm); } if (due.length) { this.timers = this.timers.filter((x) => !due.includes(x)); for (const tm of due) tm.fn(); } }
    this.shake = Math.max(0, this.shake - dt * 2.5); this.flash = Math.max(0, this.flash - dt * 1.6);
    if (this.reveal) { this.reveal.t += dt; if (this.reveal.t > 3) this.reveal = null; }
    for (const s of this.shards) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 900 * dt; s.rot += s.vr * dt; } this.shards = this.shards.filter((s) => s.t < s.life);
    for (const p of this.dust) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; } this.dust = this.dust.filter((p) => p.t < p.life);
    for (const p of this.sparks) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; } this.sparks = this.sparks.filter((p) => p.t < p.life);
    this.rb = lerp(this.rb, this.rbT, 1 - Math.exp(-dt * 4));
    if (this.viewT && !this.dragging) { const a = this.view, b = this.viewT; const k = 1 - Math.exp(-dt * 3.5); this.view = mOrtho(a.map((x, i) => lerp(x, b[i], k))); }
    if (this.stage === 'cut') {
      if (this.sub === 'girdle') { this.preformT += dt; this.P.uG = Math.min(1, this.preformT / 1.1); A.audio.grindOn(true, 0.8, this.P.uG * 0.4); this.emitSparks(0.0, 1.4); this.rebuild(); if (this.P.uG >= 1) { A.audio.grindOn(false); this.enterStage('pav'); } }
      else {
        this.stepCurve(this.grinding ? 2 : 7);
        if (this.grinding) {
          const sd = this.stageDef(); this.hold += dt; const u0 = this.P[sd.u] || 0;
          const vmax = 0.38 + Math.min(1, this.hold) * 0.42; const slow = 0.13 + 0.87 * clamp((1 - u0) / 0.3, 0, 1); // fast at first, feathering into the meet
          this.P[sd.u] = Math.min(1.35, u0 + vmax * slow * dt); const u = this.P[sd.u];
          A.audio.grindOn(true, 1, clamp((u - 0.6) / 0.45, 0, 1)); this.emitSparks(sd.id === 'pav' ? -1 : 1, 1); this.gf = (this.gf || 0) + 1; if (this.gf % 2 === 0) this.rebuild();
          if (u >= 1.34) this.grindStop(); A.ui.benchLive(this);
        }
      }
    }
    if (this.stage === 'polish' && this.autoPolish) { this.autoPolish -= dt; for (const k in this.polishMap) this.polishMap[k] = Math.max(0, this.polishMap[k] - dt * 0.6); this.updatePolish(); if (this.autoPolish <= 0) this.autoPolish = 0; }
    if (this.stage === 'polish' && !this.rubbing) A.audio.polishOn(0);
    // idle spin on the finished gem / plan view
    if ((this.stage === 'appraise' || this.stage === 'polish') && !this.dragging && this.viewT) this.viewT = mMul(this.viewT, mRotY(dt * (this.stage === 'appraise' ? 0.5 : 0.18)));
    if (this.stage === 'appraise' && Math.random() < dt * 3) A.audio.play('sparkle');
  }
  emitSparks(side, k) {
    const L = this.L; if (!L) return; if (Math.random() > 0.8 * k) return; const x = L.gx + (Math.random() - 0.5) * L.gr * 1.2, y = L.gy + side * L.gr * 0.45 + (Math.random() - 0.5) * 20;
    for (let i = 0; i < 3; i++) this.sparks.push({ x, y, vx: (Math.random() - 0.3) * 420, vy: -Math.random() * 260 - 40, life: 0.25 + Math.random() * 0.35, t: 0, c: Math.random() < 0.5 ? '#ffd58a' : '#fff4e0', s: 1.2 + Math.random() * 1.5 });
  }
  // ---------------- drawing ----------------
  showcase() {
    const L = this.L, s = this.save; const best = s.hall[0]; let stone, o;
    if (best) { stone = this.app.gemStone(best); o = optics(best.sp, best.vid, best.tone, 0.25); }
    else { if (!this._show) { const pl = cutPlanes('round', { pav: 41.5, crown: 34, table: 0.56, uG: 1, uP: 1, uC: 1, uT: 1 }); this._show = { planes: pl, frost: pl.map(() => 0), inc: [], ver: 1, rb: 1.3, bound: 1.25 }; } stone = this._show; o = optics('sapphire', 'cornflower', 1, 0.25); }
    return { stone, bound: stone.bound, glow: o.glow, x: L.gx, y: L.gy + L.gr * 0.12, r: L.gr * 0.78, rot: mMul(mRotX(1.02), mRotY(this.t * 0.35)), ri: o.ri, disp: o.disp, sig: o.sig, tint: o.tint, rb: stone.rb || 1.3, light: 1 };
  }
  gemDraw() {
    if (!this.r || this.stage === 'empty') return this.stage === 'empty' ? this.showcase() : null;
    if (this.stage === 'crack' && !this.cracking) return null;
    const L = this.L; const sh = this.shake * 8; const ox = (Math.random() - 0.5) * sh, oy = (Math.random() - 0.5) * sh;
    const o = this.opt; const plan = this.stage === 'plan' || this.stage === 'crack';
    const stone = plan ? (this.roughStone && this.roughStone.rid === this.r.id ? this.roughStone : (this.roughStone = { rid: this.r.id, planes: this.geom.planes, frost: roughFrost(this.geom, this.S), inc: this.geom.inc, ver: 1 })) : this.stone;
    if (!stone) return null;
    const sig = plan ? o.sig.map((x) => x / Math.max(1, this.geom.r * 0.35)) : o.sig;
    let alpha = 1; if (this.stage === 'crack') alpha = clamp((this.reveal ? this.reveal.t : 0) * 3, 0, 1);
    const bound = plan ? this.geom.r * 1.02 : (this.gemR || this.rb) * 1.02;
    return { stone, bound, glow: o.glow, x: L.gx + ox, y: L.gy + oy, r: L.gr, rot: this.view, ri: o.ri, disp: o.disp, sig, tint: o.tint, rb: this.rb, grain: plan ? 7 / Math.max(1, this.geom.r * 0.3) : 7, exposure: 1 + this.flash * 0.6, alpha, light: 1 };
  }
  project(p) { // world point → screen (same camera as the shader)
    const L = this.L; const w = mApply(this.view, p); const cam = this.rb * 7; const s = cam / (cam - w[2]); return [L.gx + (w[0] * s / this.rb) * L.gr, L.gy - (w[1] * s / this.rb) * L.gr, w[2]];
  }
  drawOverlay(c) {
    const L = this.L; if (!L || !this.r) return; const t = this.t;
    if (this.stage === 'crack' && !this.cracking) this.drawRock(c);
    // shards
    for (const s of this.shards) { c.save(); c.translate(s.x, s.y); c.rotate(s.rot); c.globalAlpha = clamp(1 - s.t / s.life); c.beginPath(); s.pts.forEach(([x, y], i) => (i ? c.lineTo(x * s.s, y * s.s) : c.moveTo(x * s.s, y * s.s))); c.closePath(); c.fillStyle = this.rockFill(c); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.stroke(); c.restore(); }
    // reveal ring
    if (this.reveal) { const k = this.reveal.t; const col = RARITY[Math.min(4, this.reveal.rare)].color; c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const rr = L.gr * (0.6 + k * 1.4 + i * 0.25); c.globalAlpha = clamp(0.5 - k * 0.18 - i * 0.12); c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.arc(L.gx, L.gy, rr, 0, 7); c.stroke(); }
      if (this.reveal.rare >= 2) for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + k * 0.4; c.globalAlpha = clamp(0.35 - k * 0.1); c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(L.gx + Math.cos(a) * L.gr * 0.9, L.gy + Math.sin(a) * L.gr * 0.9); c.lineTo(L.gx + Math.cos(a) * L.gr * (1.6 + k), L.gy + Math.sin(a) * L.gr * (1.6 + k)); c.stroke(); } c.restore(); }
    if (this.stage === 'plan') this.drawPlan(c);
    if (this.stage === 'cut' && this.poly) this.drawCutGuides(c);
    // particles
    c.save(); c.globalCompositeOperation = 'lighter'; for (const p of this.sparks) { const a = clamp(1 - p.t / p.life); c.strokeStyle = p.c; c.globalAlpha = a; c.lineWidth = p.s; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02); c.stroke(); } c.restore();
    for (const p of this.dust) { c.globalAlpha = clamp(1 - p.t / p.life) * 0.7; c.fillStyle = '#a89480'; c.fillRect(p.x, p.y, p.s, p.s); } c.globalAlpha = 1;
    if (this.flash > 0) { c.fillStyle = `rgba(255,240,210,${this.flash * 0.35})`; c.fillRect(0, 0, L.W, L.H); }
  }
  rockFill(c) {
    if (!this.rockTex) { const R = rng(this.r.seed), sz = 256; const cv = document.createElement('canvas'); cv.width = cv.height = sz; const g = cv.getContext('2d'); const [r0, g0, b0] = this.rock.tone;
      g.fillStyle = `rgb(${r0},${g0},${b0})`; g.fillRect(0, 0, sz, sz); for (let i = 0; i < 2600; i++) { const v = R.range(-40, 40); g.fillStyle = `rgba(${r0 + v},${g0 + v},${b0 + v},${R.range(0.2, 0.8)})`; const s = R.range(1, 5); g.fillRect(R() * sz, R() * sz, s, s); }
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${R.range(0.05, 0.2)})`; g.fillRect(R() * sz, R() * sz, 1.5, 1.5); }
      this.rockTex = c.createPattern(cv, 'repeat'); }
    return this.rockTex;
  }
  drawRock(c) {
    const L = this.L, s = L.gr * 1.05, sh = this.shake * 10; const x0 = L.gx + (Math.random() - 0.5) * sh, y0 = L.gy + (Math.random() - 0.5) * sh;
    c.save(); c.translate(x0, y0);
    // shadow
    c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.ellipse(0, s * 0.95, s * 0.95, s * 0.2, 0, 0, 7); c.fill();
    c.beginPath(); this.rock.pts.forEach(([x, y], i) => (i ? c.lineTo(x * s, y * s) : c.moveTo(x * s, y * s))); c.closePath(); c.save(); c.clip();
    c.fillStyle = this.rockFill(c); c.fillRect(-s * 1.2, -s * 1.2, s * 2.4, s * 2.4);
    const g = c.createRadialGradient(-s * 0.35, -s * 0.45, s * 0.1, 0, 0, s * 1.2); g.addColorStop(0, 'rgba(255,230,190,0.35)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.7)'); c.fillStyle = g; c.fillRect(-s * 1.2, -s * 1.2, s * 2.4, s * 2.4);
    // a glint of what's inside through the cracks
    const col = this.V.col; c.lineCap = 'round';
    for (const p of this.cracks) { c.strokeStyle = 'rgba(10,6,4,0.9)'; c.lineWidth = 3; c.beginPath(); p.forEach(([x, y], i) => (i ? c.lineTo(x * s, y * s) : c.moveTo(x * s, y * s))); c.stroke();
      c.strokeStyle = `rgba(${col.map((v) => Math.round(Math.pow(v, 0.45) * 255)).join(',')},${0.35 + Math.sin(this.t * 6) * 0.15})`; c.lineWidth = 1.2; c.stroke(); }
    c.restore(); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 2; c.beginPath(); this.rock.pts.forEach(([x, y], i) => (i ? c.lineTo(x * s, y * s) : c.moveTo(x * s, y * s))); c.closePath(); c.stroke();
    c.restore();
  }
  drawPlan(c) {
    const p = this.place; if (!p || p.s <= 0) return; const C = CUTS[this.cut];
    const pl = cutPlanes(this.cut, { pav: C.pav, crown: C.crown, table: C.table, uG: 1, uP: 1, uC: 1, uT: 1 }); const P = this.planPoly && this.planPoly.cut === this.cut ? this.planPoly.P : (this.planPoly = { cut: this.cut, P: buildPoly(pl, 4) }).P;
    const xf = (v) => { const q = mApply(p.m, v); return [q[0] * p.s + p.t[0], q[1] * p.s + p.t[1], q[2] * p.s + p.t[2]]; };
    const pts = P.verts.map((v) => this.project(xf(v)));
    const pulse = 0.65 + Math.sin(this.t * 3) * 0.25;
    c.save(); c.lineJoin = 'round';
    // face normals facing the camera → solid lines; back → dashed
    const vis = new Map(); for (const f of P.faces) { const n = mApply(this.view, mApply(p.m, pl[f.pi] ? pl[f.pi].n : [0, 1, 0])); vis.set(f.pi, n[2] > 0); }
    for (const [a, b, fi] of P.edges) { const A = pts[a], B = pts[b]; const front = vis.get(fi); c.strokeStyle = front ? `rgba(255,214,140,${0.9 * pulse})` : 'rgba(255,214,140,0.22)'; c.lineWidth = front ? 1.6 : 1; c.setLineDash(front ? [] : [3, 4]); c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); }
    c.setLineDash([]);
    // inclusions (visibility depends on your scope)
    const sc = upVal(this.save, 'loupe'); const G = this.geom;
    for (let i = 0; i < G.inc.length; i++) { const inc = G.inc[i]; const s = this.project(inc.p); const rr = Math.max(2.5, (inc.r / this.rb) * this.L.gr * 1.2); const inG = this.gemInc && this.gemInc[i] && this.insideRef(this.gemInc[i]);
      const a = sc < 0.5 ? 0.18 : sc < 0.9 ? 0.5 : 0.9; c.globalAlpha = a; c.strokeStyle = sc >= 1 && inG ? '#ff5a5a' : inc.kind === 'feather' ? '#e8f0ff' : '#ffb070'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(s[0], s[1], rr + (sc >= 1 ? 3 : 0), 0, 7); c.stroke(); if (sc >= 1.4) { c.fillStyle = c.strokeStyle; c.globalAlpha = 0.25; c.fill(); } }
    c.globalAlpha = 1; c.restore();
  }
  insideRef(inc) { const C = CUTS[this.cut]; const pl = this.refPl && this.refPl.cut === this.cut ? this.refPl.p : (this.refPl = { cut: this.cut, p: cutPlanes(this.cut, { pav: C.pav, crown: C.crown, table: C.table, uG: 1, uP: 1, uC: 1, uT: 1 }) }).p; let m = -1e9; for (const p of pl) m = Math.max(m, dot(p.n, inc.p) - p.d); return m < inc.r; }
  drawCutGuides(c) {
    // faint facet wireframe of the stone as it's being ground (front edges)
    const P = this.poly; const pts = P.verts.map((v) => this.project(v)); c.save();
    for (const [a, b, fi] of P.edges) { const pl = this.stone.planes[fi]; if (!pl) continue; const n = mApply(this.view, pl.n); if (n[2] <= 0) continue; const A = pts[a], B = pts[b]; const fresh = pl.stage && pl.stage !== STAGE.ROUGH && this.sub !== 'girdle' && pl.stage === { pav: 2, crown: 3, table: 4 }[this.sub];
      c.strokeStyle = fresh ? 'rgba(255,220,150,0.5)' : 'rgba(255,255,255,0.08)'; c.lineWidth = fresh ? 1.2 : 1; c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); }
    c.restore();
  }
  // ---------------- input ----------------
  down(x, y, e) {
    const L = this.L; this.px = x; this.py = y; this.dragging = false; this.downOn = Math.hypot(x - L.gx, y - L.gy) < L.gr * 1.1;
    if (this.stage === 'crack') { if (this.downOn) this.hammer(x, y); return; }
    if (this.stage === 'polish' && this.downOn) { this.rubbing = true; return; }
    if (this.stage === 'cut' && this.downOn && e.button !== 2 && this.sub !== 'girdle' && !this.stageDone) { this.grindStart(); this.grindByPress = true; return; }
    this.mode = this.stage === 'plan' && this.downOn && e.button !== 2 && !e.shiftKey ? 'move' : 'orbit';
  }
  move(x, y) {
    const dx = x - this.px, dy = y - this.py; this.px = x; this.py = y; if (Math.abs(dx) + Math.abs(dy) > 0.5) this.dragging = true;
    if (this.rubbing) { this.rub(x, y, Math.hypot(dx, dy)); return; }
    if (this.grindByPress) return;
    if (!this.mode) return;
    if (this.mode === 'orbit') { const r = mMul(mRotX(dy * 0.008), mMul(mRotY(dx * 0.008), this.view)); this.view = mOrtho(r); this.viewT = this.view; }
    else if (this.mode === 'move') { // move the planned gem in the view plane
      const k = (this.rb / this.L.gr) * 0.9; const wv = [dx * k, -dy * k, 0]; const d = mApply(mT(this.view), wv);
      const nt = this.place.t.map((v, i) => v + d[i]); if (inside(this.geom.planes, nt, -0.05)) { this.place.t = nt; this.refit(); this.app.ui.benchLive(this); }
    }
  }
  up() {
    if (this.grindByPress) { this.grindByPress = false; this.grindStop(); }
    if (this.rubbing) { this.rubbing = false; this.app.audio.polishOn(0); }
    if (this.mode === 'move') this.app.ui.bench(this);
    this.mode = null; this.dragging = false;
  }
}
