// GLINT: the stone pipeline. Turns a rough (species + seed) into geometry, fits a cut inside it, produces the
// planes of the stone at any moment of the grind, and appraises the finished gem (4Cs + light performance).
import { rng, mMul, mRotX, mRotY, mRotZ, mApply, mT, dot, clamp, DEG } from './math.js';
import { buildPoly, invXfPlanes, xfPoint, inside } from './poly.js';
import { CUTS, cutPlanes, outlineOf, STAGE } from './cuts.js';
import { makeRough } from './habits.js';
import { SPECIES, variety, optics } from './species.js';
import { analyze, perf } from './optics.js';
import { OPTABLE } from './optable.js';

const RC = new Map();
export function roughGeom(r) {
  const k = r.seed + ':' + r.sp; if (RC.has(k)) return RC.get(k);
  const S = SPECIES[r.sp]; const g = makeRough({ habit: S.habit, size: r.size, clarity: r.clarity }, rng(r.seed));
  RC.set(k, g); if (RC.size > 60) RC.delete(RC.keys().next().value); return g;
}
// carats from a volume in mm³
export const caratOf = (mm3, sp) => mm3 * 0.001 * SPECIES[sp].sg * 5;
export const roughCarat = (r) => caratOf(roughGeom(r).volume, r.sp);

const VCACHE = {};
// the reference gem at textbook proportions (for fitting)
export function refVerts(cutId) { if (VCACHE[cutId]) return VCACHE[cutId]; const C = CUTS[cutId]; const P = buildPoly(cutPlanes(cutId, { pav: C.pav + 1.5, crown: C.crown, table: C.table, uG: 1, uP: 1, uC: 1, uT: 1 }), 10); return (VCACHE[cutId] = { verts: P.verts, vol: P.volume }); }

// largest scale s such that  M·(s·v) + t  stays inside the rough for every reference vertex (closed form)
export function maxFit(roughPlanes, verts, M, t, margin = 0.04) {
  let s = 1e9;
  for (const p of roughPlanes) { const slack = p.d - dot(p.n, t) - margin; if (slack <= 0) return 0; const nm = [p.n[0] * M[0] + p.n[1] * M[3] + p.n[2] * M[6], p.n[0] * M[1] + p.n[1] * M[4] + p.n[2] * M[7], p.n[0] * M[2] + p.n[1] * M[5] + p.n[2] * M[8]];
    for (const v of verts) { const k = nm[0] * v[0] + nm[1] * v[1] + nm[2] * v[2]; if (k > 1e-9) s = Math.min(s, slack / k); } }
  return s;
}
export const ORIENT = [mRotX(0), mRotX(Math.PI / 2), mRotZ(Math.PI / 2), mMul(mRotX(Math.PI / 2), mRotY(Math.PI / 2)), mRotX(Math.PI), mRotZ(-Math.PI / 2)];

// clarity: which inclusions end up inside the finished stone, and how visible they are
const CLAR = [['FL', 0], ['IF', 0.06], ['VVS1', 0.16], ['VVS2', 0.32], ['VS1', 0.62], ['VS2', 1.1], ['SI1', 2], ['SI2', 3.4], ['I1', 6], ['I2', 10], ['I3', 1e9]];
export const CLARITY_MULT = { FL: 1.8, IF: 1.55, VVS1: 1.4, VVS2: 1.3, VS1: 1.18, VS2: 1.08, SI1: 0.92, SI2: 0.8, I1: 0.6, I2: 0.45, I3: 0.3 };
export function clarityOf(incG, gemPlanes) {
  let v = 0, any = false;
  for (const c of incG) {
    // signed distance to the gem; count inclusions that reach inside
    let m = -1e9; for (const p of gemPlanes) m = Math.max(m, dot(p.n, c.p) - p.d);
    if (m > c.r) continue; any = true;
    const frac = m < -c.r ? 1 : 0.5 - m / (2 * c.r);
    const under = Math.abs(c.p[0]) < 0.55 && Math.abs(c.p[2]) < 0.55 && c.p[1] > -0.5 ? 1.3 : 0.8;
    v += (c.r / 0.045) ** 2 * (c.kind === 'feather' ? 0.75 : 1) * under * (c.vis || 1) * frac;
  }
  if (!any) return { v: 0, grade: 'FL' };
  for (let i = 1; i < CLAR.length; i++) if (v < CLAR[i][1]) return { v, grade: CLAR[i][0] };
  return { v, grade: 'I3' };
}
export const CLARITY_ORDER = CLAR.map((c) => c[0]);

// placement: { m (3x3 rough←gem rotation), t (mm), s (mm per gem unit) }
export function autoPlace(r, cutId, tries = 6) {
  const G = roughGeom(r); const V = refVerts(cutId).verts; let best = null;
  const c = G.verts.reduce((a, q) => [a[0] + q[0], a[1] + q[1], a[2] + q[2]], [0, 0, 0]).map((x) => x / G.verts.length);
  for (let i = 0; i < tries; i++) for (const yaw of [0, 0.5, 1.0, 1.5]) {
    const m = mMul(ORIENT[i % ORIENT.length], mRotY(yaw)); const s = maxFit(G.planes, V, m, c);
    if (!best || s > best.s) best = { m, t: c.slice(), s };
  }
  return best;
}
// transform the rough + its inclusions into gem space for a placement
export function toGemSpace(r, place) {
  const G = roughGeom(r); const { m, s, t } = place;
  const planes = invXfPlanes(G.planes, m, s, t).map((p) => ({ ...p, stage: STAGE.ROUGH }));
  const mt = mT(m); const inc = G.inc.map((c) => { const q = [c.p[0] - t[0], c.p[1] - t[1], c.p[2] - t[2]]; return { ...c, p: mApply(mt, q).map((x) => x / s), r: c.r / s }; });
  return { planes, inc };
}
// expected ct for a placement (reference proportions)
export const placeCarat = (r, cutId, place) => caratOf(refVerts(cutId).vol * place.s ** 3, r.sp);

// the stone at a moment of the cut: rough planes (in gem space) + the cut planes ground so far
export function stonePlanes(r, place, cutId, P, starts) {
  const gs = toGemSpace(r, place); const cp = cutPlanes(cutId, P, starts);
  return { planes: gs.planes.concat(cp), roughN: gs.planes.length, inc: gs.inc, cut: cp };
}
// where each cut plane first touches the rough (so the grind animation starts at the stone's skin)
export function grindStarts(r, place, cutId, P) {
  const gs = toGemSpace(r, place); const all = cutPlanes(cutId, { ...P, uG: 1, uP: 1, uC: 1, uT: 1 });
  const poly = buildPoly(gs.planes, 50); const st = [];
  for (const p of all) { let mx = -1e9; for (const v of poly.verts) mx = Math.max(mx, dot(p.n, v)); st[p.idx] = mx; }
  return st;
}

// light performance ceiling for this cut at this refractive index (precomputed optimum)
export function perfMax(cutId, ri) { const T = OPTABLE[cutId]; if (!T) return 0.7; if (ri <= T[0][0]) return T[0][3]; for (let i = 1; i < T.length; i++) if (ri <= T[i][0]) { const a = T[i - 1], b = T[i]; const f = (ri - a[0]) / (b[0] - a[0]); return a[3] + (b[3] - a[3]) * f; } return T[T.length - 1][3]; }
export function bestAngles(cutId, ri) { const T = OPTABLE[cutId]; let a = T[0], b = T[0], f = 0; for (let i = 1; i < T.length; i++) if (ri <= T[i][0] || i === T.length - 1) { a = T[i - 1]; b = T[i]; f = clamp((ri - a[0]) / (b[0] - a[0])); break; } return { pav: a[1] + (b[1] - a[1]) * f, crown: a[2] + (b[2] - a[2]) * f }; }

export function lightPerf(planes, frost, sp, cutId, grid = 18) {
  const S = SPECIES[sp]; const o = outlineOf(cutId);
  const a = analyze(planes, frost, { ri: S.ri, disp: S.disp, grid, bx: 1.02, bz: o.halfW * 1.02 });
  return { ...a, perf: perf(a), ratio: perf(a) / perfMax(cutId, S.ri) };
}

export const CUT_GRADES = [['Ideal', 0.975, 1.6], ['Excellent', 0.93, 1.35], ['Very Good', 0.86, 1.12], ['Good', 0.76, 0.92], ['Fair', 0.62, 0.7], ['Poor', -1, 0.45]];
export const cutGradeOf = (score) => CUT_GRADES.find((g) => score >= g[1]);
export const POLISH_GRADES = [['Excellent', 0.97, 1.08], ['Very Good', 0.85, 1.0], ['Good', 0.65, 0.92], ['Fair', -1, 0.8]];
// colour grade: tone near 1 is ideal; white stones get diamond-style letters
export function colorGrade(sp, vid, tone) {
  const V = variety(sp, vid);
  if (V.col[0] > 0.95 && V.col[1] > 0.95 && V.col[2] > 0.95) { const L = 'DEFGHIJKLM'; const i = clamp(Math.floor((tone - 0.7) * 15), 0, 9); return { label: L[i] + ' colour', mult: [1.45, 1.35, 1.25, 1.15, 1.05, 0.95, 0.87, 0.8, 0.72, 0.65][i] }; }
  const dv = Math.abs(tone - 1); const mult = clamp(1.12 - dv * 1.6, 0.6, 1.12);
  const label = tone < 0.82 ? 'Light' : tone < 0.93 ? 'Medium-light' : tone < 1.08 ? 'Vivid' : tone < 1.2 ? 'Deep' : 'Dark';
  return { label, mult };
}
// final appraisal: value in game dollars
export function appraise(g) {
  const V = variety(g.sp, g.vid); const cg = cutGradeOf(g.score); const cl = CLARITY_MULT[g.clarity] || 1; const col = colorGrade(g.sp, g.vid, g.tone); const pg = POLISH_GRADES.find((p) => g.polish >= p[1]);
  const clMult = g.sp === 'emerald' ? 1 + (cl - 1) * 0.5 : cl; // emeralds are forgiven their garden
  const value = V.ppc * Math.pow(Math.max(0.02, g.ct), 1.28) * cg[2] * clMult * col.mult * pg[2];
  return { value: Math.max(1, Math.round(value)), cut: cg[0], polishG: pg[0], color: col.label };
}
