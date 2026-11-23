// GLINT: rough crystals. Each mineral grows in its real crystal habit (quartz: hexagonal prism with
// rhombohedral points; beryl: flat-ended hexagonal prism; corundum: barrel; diamond: octahedron; garnet:
// dodecahedron; tourmaline: striated trigonal prism; alluvial pebbles: water-worn polyhedra), with natural
// irregularity, broken faces and hidden inclusions. Units: millimetres.
import { plane, buildPoly, inside, bounds } from './poly.js';
import { norm, mApply, mMul, mRotX, mRotY, mRotZ, DEG } from './math.js';
import { STAGE } from './cuts.js';

const HABITS = {
  hexpoint(r, R) { const L = R.range(1.5, 2.6), out = []; const ph = R.range(0, 1); const b = 38 * DEG;
    for (let i = 0; i < 6; i++) { const a = ((i + ph) / 6) * Math.PI * 2; out.push([[Math.cos(a), 0, Math.sin(a)], 1]); out.push([[Math.cos(a) * Math.sin(b), Math.cos(b), Math.sin(a) * Math.sin(b)], Math.sin(b) + (L / 2) * Math.cos(b)]); }
    if (R.chance(0.45)) for (let i = 0; i < 6; i++) { const a = ((i + ph) / 6) * Math.PI * 2; out.push([[Math.cos(a) * Math.sin(b), -Math.cos(b), Math.sin(a) * Math.sin(b)], Math.sin(b) + (L / 2) * Math.cos(b)]); }
    else out.push([[R.range(-0.2, 0.2), -1, R.range(-0.2, 0.2)], L * 0.42]);
    return out; },
  hexflat(r, R) { const L = R.range(1.2, 2.4), out = []; const ph = R.range(0, 1);
    for (let i = 0; i < 6; i++) { const a = ((i + ph) / 6) * Math.PI * 2; out.push([[Math.cos(a), 0, Math.sin(a)], 1]); out.push([[Math.cos(a) * 0.7, 0.7, Math.sin(a) * 0.7], 0.7 + (L / 2) * 0.7 - 0.06]); }
    out.push([[0, 1, 0], L / 2], [[0, -1, 0], L / 2]); return out; },
  barrel(r, R) { const L = R.range(1.4, 2.2), out = []; const ph = R.range(0, 1); const b = 78 * DEG;
    for (let i = 0; i < 6; i++) { const a = ((i + ph) / 6) * Math.PI * 2; for (const s of [1, -1]) out.push([[Math.cos(a) * Math.sin(b), s * Math.cos(b), Math.sin(a) * Math.sin(b)], Math.sin(b)]); }
    out.push([[0, 1, 0], L / 2], [[0, -1, 0], L / 2]); return out; },
  octa(r, R) { const out = []; for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) out.push([[x, y, z], Math.sqrt(3) * 0.78]);
    for (const [a, b] of [[0, 1], [0, 2], [1, 2]]) for (const s of [-1, 1]) for (const t of [-1, 1]) { const n = [0, 0, 0]; n[a] = s; n[b] = t; out.push([n, Math.SQRT2 * 0.7]); } return out; },
  dodeca(r, R) { const out = []; for (const [a, b] of [[0, 1], [0, 2], [1, 2]]) for (const s of [-1, 1]) for (const t of [-1, 1]) { const n = [0, 0, 0]; n[a] = s; n[b] = t; out.push([n, Math.SQRT2 * 0.82]); }
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) out.push([[x, y, z], Math.sqrt(3) * 0.74]); return out; },
  ortho(r, R) { const a = R.range(0.8, 1), c = R.range(0.55, 0.8), L = R.range(1.3, 2.1), out = [];
    for (const s of [-1, 1]) { out.push([[s * 0.8, 0, 0.6], a * 0.8 + c * 0.6 - 0.15], [[s * 0.8, 0, -0.6], a * 0.8 + c * 0.6 - 0.15]); out.push([[s, 0, 0], a], [[0, 0, s], c]); }
    for (const s of [-1, 1]) for (const t of [-1, 1]) out.push([[s * 0.55, 0.75, t * 0.4], L / 2 * 0.75 + 0.4]);
    out.push([[0, -1, 0], L / 2]); return out; },
  trigonal(r, R) { const L = R.range(2.0, 3.2), out = []; const ph = R.range(0, 1);
    for (let i = 0; i < 9; i++) { const a = ((i + ph) / 9) * Math.PI * 2; out.push([[Math.cos(a), 0, Math.sin(a)], i % 3 === 0 ? 0.86 : 1]); }
    for (let i = 0; i < 3; i++) { const a = ((i + ph) / 3) * Math.PI * 2; out.push([[Math.cos(a) * 0.6, 0.8, Math.sin(a) * 0.6], 0.6 + (L / 2) * 0.8]); }
    out.push([[R.range(-0.25, 0.25), -1, R.range(-0.25, 0.25)], L / 2]); return out; },
  pebble(r, R) { const out = []; const n = 20; for (let i = 0; i < n; i++) { const y = 1 - (2 * (i + 0.5)) / n, rr = Math.sqrt(1 - y * y), a = i * 2.39996; out.push([[Math.cos(a) * rr, y * 0.85, Math.sin(a) * rr], R.range(0.86, 1)]); } return out; },
  tabular(r, R) { const out = []; const ph = R.range(0, 1); for (let i = 0; i < 8; i++) { const a = ((i + ph) / 8) * Math.PI * 2; out.push([[Math.cos(a), 0, Math.sin(a) * 1.3], R.range(0.92, 1.05)]); } out.push([[0, 1, 0], 0.66], [[0, -1, 0], 0.66]); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; out.push([[Math.cos(a), 1.1, Math.sin(a)], 1.25]); out.push([[Math.cos(a), -1.1, Math.sin(a)], 1.25]); } return out; },
};
export const HABIT_IDS = Object.keys(HABITS);

// spec: { habit, size (mm, nominal radius), clarity (0 clean .. 1 heavily included) }
export function makeRough(spec, R) {
  const raw = HABITS[spec.habit](1, R); const s = spec.size;
  // a slight random tilt so crystals rest naturally
  const rot = mMul(mRotY(R.range(0, Math.PI * 2)), mMul(mRotX(R.range(-0.25, 0.25)), mRotZ(R.range(-0.25, 0.25))));
  let planes = raw.map(([n, d]) => { let nn = norm(n); nn = norm([nn[0] + R.range(-0.06, 0.06), nn[1] + R.range(-0.06, 0.06), nn[2] + R.range(-0.06, 0.06)]); return { ...plane(mApply(rot, nn), d * s * R.range(0.9, 1.08)), tag: STAGE.ROUGH * 100, stage: STAGE.ROUGH }; });
  // a couple of broken (conchoidal) faces chop off random chunks
  const nb = R.int(1, 3); for (let i = 0; i < nb; i++) { const th = R.range(0, Math.PI * 2), ph = Math.acos(R.range(-1, 1)); const n = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)]; planes.push({ ...plane(n, s * R.range(0.8, 1.05)), tag: STAGE.ROUGH * 100 + 1, stage: STAGE.ROUGH }); }
  let P = buildPoly(planes, s * 6);
  // drop planes that don't touch the solid; recentre on the bounding box
  const used = new Set(P.faces.map((f) => f.pi)); planes = planes.filter((_, i) => used.has(i));
  P = buildPoly(planes, s * 6); const b = bounds(P.verts);
  planes = planes.map((p) => ({ ...p, d: p.d - (p.n[0] * b.c[0] + p.n[1] * b.c[1] + p.n[2] * b.c[2]) }));
  P = buildPoly(planes, s * 6);
  // inclusions
  const inc = []; const nInc = Math.round(spec.clarity * R.range(3, 9) + (R.chance(spec.clarity) ? 1 : 0)); const bb = bounds(P.verts);
  for (let i = 0, tries = 0; i < nInc && tries < 300; tries++) {
    const q = [R.range(bb.lo[0], bb.hi[0]), R.range(bb.lo[1], bb.hi[1]), R.range(bb.lo[2], bb.hi[2])];
    if (!inside(planes, q, -s * 0.08)) continue;
    const feather = R.chance(0.4); inc.push({ p: q, r: s * R.range(0.025, feather ? 0.09 : 0.06) * (0.6 + spec.clarity * 0.8), kind: feather ? 'feather' : 'crystal', vis: R.range(0.5, 1) }); i++;
  }
  return { planes, inc, volume: P.volume, verts: P.verts, edges: P.edges, r: b.r, habit: spec.habit, size: s };
}
