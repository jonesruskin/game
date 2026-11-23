// GLINT: parametric gem cuts. A cut = an outline (girdle shape) + a faceting style. Given the player's
// pavilion angle, crown angle, table size and grind depths, we emit the exact list of facet planes.
// Geometry is in "gem units": the girdle's longest half-axis is 1, table up (+y), girdle centred at y = 0.
import { DEG, clamp } from './math.js';
import { plane } from './poly.js';

export const STAGE = { GIRDLE: 1, PAV: 2, CROWN: 3, TABLE: 4, ROUGH: 9 };
export const HG = 0.022; // girdle half thickness

// ---------- outlines (convex, CCW in the x/z plane) ----------
const ring = (n, f) => Array.from({ length: n }, (_, i) => f((i / n) * Math.PI * 2));
function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const OUTLINES = {
  circle: () => ({ pts: ring(96, (a) => [Math.cos(a), Math.sin(a)]), smooth: true }),
  ellipse: (b) => ({ pts: ring(96, (a) => [Math.cos(a), b * Math.sin(a)]), smooth: true }),
  squircle: (p, b) => ({ pts: ring(96, (a) => { const c = Math.cos(a), s = Math.sin(a); return [Math.sign(c) * Math.abs(c) ** (2 / p), b * Math.sign(s) * Math.abs(s) ** (2 / p)]; }), smooth: true }),
  pear: () => { const c = -0.36, r = 0.64; const pts = ring(80, (a) => [c + r * Math.cos(a), r * Math.sin(a)]); pts.push([1, 0]); return { pts: hull(pts), smooth: true }; },
  lens: (w) => { const k = (1 - w * w) / (2 * w), rr = w + k; const pts = []; for (let i = 0; i <= 48; i++) { const x = -1 + (2 * i) / 48; pts.push([x, -k + Math.sqrt(Math.max(0, rr * rr - x * x))]); } for (let i = 1; i < 48; i++) { const x = 1 - (2 * i) / 48; pts.push([x, k - Math.sqrt(Math.max(0, rr * rr - x * x))]); } return { pts: hull(pts), smooth: true }; },
  octa: (a, b, c) => ({ pts: hull([[a, b - c], [a - c, b], [-(a - c), b], [-a, b - c], [-a, -(b - c)], [-(a - c), -b], [a - c, -b], [a, -(b - c)]]), smooth: false }),
  rect: (a, b) => ({ pts: hull([[a, b], [-a, b], [-a, -b], [a, -b]]), smooth: false }),
  tri: (t) => { const v = [0, 1, 2].map((i) => [Math.cos((i * 2 * Math.PI) / 3), Math.sin((i * 2 * Math.PI) / 3)]); const pts = []; for (let i = 0; i < 3; i++) { const a = v[i], b = v[(i + 1) % 3], c = v[(i + 2) % 3]; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]); } return { pts: hull(pts), smooth: false }; },
};

function prepOutline(o) {
  // normalise so the max |x| = 1 and centre the bounding box on x
  let mx = -1e9, mn = 1e9; for (const q of o.pts) { mx = Math.max(mx, q[0]); mn = Math.min(mn, q[0]); }
  const cx = (mx + mn) / 2, s = 2 / (mx - mn); o.pts = o.pts.map((q) => [(q[0] - cx) * s, q[1] * s]);
  o.edges = o.pts.map((a, i) => { const b = o.pts[(i + 1) % o.pts.length]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); return { a, b, n: [dz / l, -dx / l], l }; });
  // make normals outward (CCW check)
  let area = 0; for (const e of o.edges) area += e.a[0] * e.b[1] - e.b[0] * e.a[1]; if (area < 0) for (const e of o.edges) e.n = [-e.n[0], -e.n[1]];
  let zmax = 0; for (const q of o.pts) zmax = Math.max(zmax, Math.abs(q[1])); o.halfW = zmax;
  // area centroid: facet azimuths are spread around this point (puts a pear's culet under its belly)
  let A = 0, cx2 = 0, cz2 = 0; for (const e of o.edges) { const c = e.a[0] * e.b[1] - e.b[0] * e.a[1]; A += c; cx2 += (e.a[0] + e.b[0]) * c; cz2 += (e.a[1] + e.b[1]) * c; }
  o.c = [cx2 / (3 * A), cz2 / (3 * A)]; o.per = o.edges.reduce((s, e) => s + e.l, 0);
  return o;
}
// ray from the origin at azimuth phi → outline point + outward normal
function probe(o, phi) {
  const dx = Math.cos(phi), dz = Math.sin(phi); let best = null; const ox = o.c[0], oz = o.c[1];
  for (let i = 0; i < o.edges.length; i++) {
    const e = o.edges[i]; const ax = e.a[0] - ox, az = e.a[1] - oz; const ex = e.b[0] - e.a[0], ez = e.b[1] - e.a[1]; const den = dx * ez - dz * ex; if (Math.abs(den) < 1e-12) continue;
    const t = (ax * ez - az * ex) / den, u = (ax * dz - az * dx) / den;
    if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9 && (!best || t < best.t)) best = { t, u, i };
  }
  const e = o.edges[best.i]; let n = e.n;
  if (!o.smooth) { // at a sharp corner use the bisector
    const near = Math.min(best.u * e.l, (1 - best.u) * e.l);
    if (near < 0.02) { const j = best.u < 0.5 ? (best.i - 1 + o.edges.length) % o.edges.length : (best.i + 1) % o.edges.length; const m = [n[0] + o.edges[j].n[0], n[1] + o.edges[j].n[1]]; const l = Math.hypot(m[0], m[1]); n = [m[0] / l, m[1] / l]; }
  } else { // smooth outline: average neighbouring edge normals
    const a = o.edges[(best.i - 1 + o.edges.length) % o.edges.length].n, b = o.edges[(best.i + 1) % o.edges.length].n; const m = [a[0] + 2 * n[0] + b[0], a[1] + 2 * n[1] + b[1]]; const l = Math.hypot(m[0], m[1]); n = [m[0] / l, m[1] / l];
  }
  return { p: [ox + dx * best.t, oz + dz * best.t], n, r: best.t };
}
// point at arc-length fraction f around the outline (+ its normal)
function along(o, f) {
  let L = (((f % 1) + 1) % 1) * o.per; for (let i = 0; i < o.edges.length; i++) { const e = o.edges[i]; if (L <= e.l || i === o.edges.length - 1) { const u = Math.min(1, L / e.l); const a = o.edges[(i - 1 + o.edges.length) % o.edges.length].n, b = o.edges[(i + 1) % o.edges.length].n; const m = [a[0] + 2 * e.n[0] + b[0], a[1] + 2 * e.n[1] + b[1]]; const l = Math.hypot(m[0], m[1]); return { p: [e.a[0] + (e.b[0] - e.a[0]) * u, e.a[1] + (e.b[1] - e.a[1]) * u], n: [m[0] / l, m[1] / l] }; } L -= e.l; }
}

// ---------- the cut catalogue ----------
// style 'brilliant': mains + halves + stars.  style 'step': rows of facets parallel to each girdle edge.
// pav/crown/table: sensible defaults; the real optimum depends on the stone's refractive index.
export const CUTS = {
  round: { name: 'Round Brilliant', style: 'brilliant', o: () => OUTLINES.circle(), mains: 8, girdle: 32, pav: 40.8, crown: 34.5, table: 0.56, tier: 1, blurb: 'The classic. 57 facets engineered for maximum sparkle.' },
  oval: { name: 'Oval', style: 'brilliant', o: () => OUTLINES.ellipse(0.7), mains: 8, girdle: 32, pav: 41, crown: 34, table: 0.56, tier: 1, blurb: 'Looks bigger than it weighs. Watch for the bow-tie.' },
  cushion: { name: 'Cushion', style: 'brilliant', o: () => OUTLINES.squircle(3.4, 0.94), mains: 8, girdle: 32, pav: 41.5, crown: 35, table: 0.58, tier: 1, blurb: 'Soft square pillow. Keeps weight from chunky rough.' },
  emerald: { name: 'Emerald', style: 'step', o: () => OUTLINES.octa(1, 0.72, 0.2), pav: 44, crown: 38, table: 0.62, tier: 2, blurb: 'Hall-of-mirrors steps. Shows off clarity (and flaws).' },
  pear: { name: 'Pear', style: 'brilliant', o: () => OUTLINES.pear(), mains: 8, girdle: 32, pav: 41, crown: 34, table: 0.55, tier: 2, blurb: 'A teardrop. Elegant on a pendant.' },
  marquise: { name: 'Marquise', style: 'brilliant', o: () => OUTLINES.lens(0.5), mains: 8, girdle: 32, pav: 41, crown: 34, table: 0.55, tier: 3, blurb: 'Royal boat shape. Maximum face-up size.' },
  princess: { name: 'Princess', style: 'chevron', o: () => OUTLINES.rect(1, 1), mains: 8, girdle: 4, pav: 41.5, crown: 34, table: 0.66, tier: 3, blurb: 'Sharp square brilliance. High yield from cubes.' },
  trillion: { name: 'Trillion', style: 'chevron', o: () => OUTLINES.tri(0.14), mains: 6, girdle: 6, pav: 42, crown: 33, table: 0.6, tier: 3, blurb: 'Bold triangle with a lively flash.' },
  asscher: { name: 'Asscher', style: 'step', o: () => OUTLINES.octa(1, 1, 0.3), pav: 44, crown: 36, table: 0.58, tier: 4, blurb: 'Art Deco icon. A square tunnel of light.' },
  radiant: { name: 'Radiant', style: 'chevron', o: () => OUTLINES.octa(1, 0.8, 0.15), mains: 8, girdle: 8, pav: 41.5, crown: 34, table: 0.62, tier: 4, blurb: 'Step-cut outline, brilliant fire. The best of both.' },
};
const OCACHE = {};
export const outlineOf = (id) => OCACHE[id] || (OCACHE[id] = prepOutline(CUTS[id].o()));

// Build the planes. P: { pav, crown, table (fraction), uG, uP, uC, uT } where u* is the grind depth
// (1 = perfect meet). A stage whose u is undefined is not cut yet. 'start' (optional) gives the d at
// which each stage's planes first touch the stone, so 0 < u < 1 interpolates the grind.
export function cutPlanes(id, P, start) {
  const C = CUTS[id], o = outlineOf(id); const out = [];
  const ap = P.pav * DEG, ac = P.crown * DEG; const T = clamp(P.table, 0.3, 0.9);
  const push = (n, d, stage, group) => out.push({ ...plane(n, d), tag: stage * 100 + group, stage });
  // girdle
  if (o.smooth) { const G = C.girdle; for (let i = 0; i < G; i++) { const q = along(o, i / G); push([q.n[0], 0, q.n[1]], q.p[0] * q.n[0] + q.p[1] * q.n[1], STAGE.GIRDLE, 0); } }
  else for (const e of o.edges) push([e.n[0], 0, e.n[1]], e.a[0] * e.n[0] + e.a[1] * e.n[1], STAGE.GIRDLE, 0);
  // crown height (table plane) from the narrowest main
  const pavPlane = (q, a, g) => push([q.n[0] * Math.sin(a), -Math.cos(a), q.n[1] * Math.sin(a)], (q.p[0] * q.n[0] + q.p[1] * q.n[1]) * Math.sin(a) + HG * Math.cos(a), STAGE.PAV, g);
  const crPlane = (q, a, g, y = HG, inset = 0) => { const px = q.p[0] - q.n[0] * inset, pz = q.p[1] - q.n[1] * inset; push([q.n[0] * Math.sin(a), Math.cos(a), q.n[1] * Math.sin(a)], (px * q.n[0] + pz * q.n[1]) * Math.sin(a) + y * Math.cos(a), STAGE.CROWN, g); };
  if (C.style === 'brilliant') {
    const M = C.mains; const az = Array.from({ length: M }, (_, k) => (k / M) * Math.PI * 2); const gap = (Math.PI * 2) / M;
    let rmin = 1e9; for (const a of az) { const q = probe(o, a); rmin = Math.min(rmin, q.p[0] * q.n[0] + q.p[1] * q.n[1]); }
    const yT = HG + rmin * (1 - T) * Math.tan(ac);
    for (const a of az) {
      const q = probe(o, a); pavPlane(q, ap, 1); crPlane(q, ac, 1);
      for (const s of [-1, 1]) { const qh = probe(o, a + gap / 2 + (s * gap) / 4); pavPlane(qh, ap + 1.6 * DEG, 2); crPlane(qh, Math.min(ac + 9 * DEG, 70 * DEG), 2); }
      const qs = probe(o, a + gap / 2); const inset = (yT - HG) / Math.tan(ac); crPlane(qs, ac * 0.58, 3, yT, inset);
    }
    push([0, 1, 0], yT, STAGE.TABLE, 0);
  } else { // 'step' (emerald, asscher) and 'chevron' (princess, radiant, trillion): chained rows per girdle edge
    let dmin = 1e9; for (const e of o.edges) dmin = Math.min(dmin, e.a[0] * e.n[0] + e.a[1] * e.n[1]);
    const chev = C.style === 'chevron';
    const rowsP = chev ? [[0, 9], [0.28, 1], [0.62, -6]] : [[0, 11], [0.3, 1], [0.64, -9]];
    const rowsC = chev ? [[0, 8], [0.42, -4]] : [[0, 9], [0.36, -1], [0.7, -12]];
    // walk the crown chain to find the table height for this table size
    const span = (1 - T) * dmin; let yT = HG, xc = 0; for (let r = 0; r < rowsC.length; r++) { const a = Math.max(8, P.crown + rowsC[r][1]) * DEG; const xn = r + 1 < rowsC.length ? Math.min(span, rowsC[r + 1][0] * span) : span; yT += (xn - xc) * Math.tan(a); xc = xn; }
    const rowPlane = (e, D, x, y, a, down, stage, g, rot) => { const c = Math.cos(rot), sn = Math.sin(rot); const nx = e.n[0] * c - e.n[1] * sn, nz = e.n[0] * sn + e.n[1] * c; const mx = (e.a[0] + e.b[0]) / 2, mz = (e.a[1] + e.b[1]) / 2; const px = mx - e.n[0] * x, pz = mz - e.n[1] * x; push([nx * Math.sin(a), down ? -Math.cos(a) : Math.cos(a), nz * Math.sin(a)], (px * nx + pz * nz) * Math.sin(a) + (down ? -y : y) * Math.cos(a), stage, g); };
    for (const e of o.edges) {
      const D = e.a[0] * e.n[0] + e.a[1] * e.n[1]; const keel = D; // rows advance in absolute units so steps are even on every side
      let x = 0, y = -HG; for (let r = 0; r < rowsP.length; r++) { const a = (P.pav + rowsP[r][1]) * DEG; const rots = chev && r > 0 ? [-0.24, 0.24] : [0]; for (const rot of rots) rowPlane(e, D, x, y, a, true, STAGE.PAV, 1 + r, rot); const xn = r + 1 < rowsP.length ? rowsP[r + 1][0] * keel : keel; y -= (xn - x) * Math.tan(a); x = xn; }
      x = 0; y = HG; for (let r = 0; r < rowsC.length; r++) { const a = Math.max(8, P.crown + rowsC[r][1]) * DEG; const rots = chev && r === 0 ? [-0.2, 0.2] : [0]; for (const rot of rots) rowPlane(e, D, x, y, a, false, STAGE.CROWN, 1 + r, rot); const xn = r + 1 < rowsC.length ? Math.min(span, rowsC[r + 1][0] * span) : span; y += (xn - x) * Math.tan(a); x = xn; }
    }
    push([0, 1, 0], yT, STAGE.TABLE, 0);
  }
  // apply grind depths
  const U = { [STAGE.GIRDLE]: P.uG, [STAGE.PAV]: P.uP, [STAGE.CROWN]: P.uC, [STAGE.TABLE]: P.uT };
  const res = [];
  for (let i = 0; i < out.length; i++) {
    const p = out[i]; const u = U[p.stage]; if (u === undefined || u === null) continue;
    const d0 = start && start[i] !== undefined ? Math.max(start[i], p.d) : p.d;
    const d = u <= 1 ? d0 + (p.d - d0) * u : p.d - (u - 1) * 0.35;
    res.push({ ...p, d, idx: i });
  }
  return res;
}
export const facetCount = (id) => cutPlanes(id, { ...CUTS[id], uG: 1, uP: 1, uC: 1, uT: 1 }).length;
