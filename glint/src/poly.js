// GLINT: convex polyhedra as intersections of half-spaces  { n: unit normal, d: offset }  (inside: n·p <= d).
// Every stone in the game (rough crystal, preform, finished gem, the stone mid-grind) is just a list of planes,
// which is exactly what the GPU ray tracer consumes. This module builds the explicit mesh when we need
// vertices (wireframes, carat weight, fitting a cut inside a rough).
import { dot, sub, cross, norm, add, mul, len } from './math.js';

const EPS = 1e-7;
export const plane = (n, d, tag = 0) => { const l = Math.hypot(n[0], n[1], n[2]); return { n: [n[0] / l, n[1] / l, n[2] / l], d: d / l, tag }; };

function clipPoly(pts, p) {
  const out = [], cut = []; const n = pts.length; if (!n) return { out, cut };
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n]; const da = dot(p.n, a) - p.d, db = dot(p.n, b) - p.d;
    if (da <= EPS) out.push(a);
    if ((da < -EPS && db > EPS) || (da > EPS && db < -EPS)) { const t = da / (da - db); const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; out.push(q); cut.push(q); }
    else if (Math.abs(da) <= EPS) cut.push(a);
  }
  return { out, cut };
}

// Build the polyhedron mesh. Returns { faces:[{pi, pts, area, c}], verts, edges, volume, ok }
export function buildPoly(planes, B = 100) {
  const box = [
    [[-B, -B, -B], [-B, B, -B], [B, B, -B], [B, -B, -B]], [[-B, -B, B], [B, -B, B], [B, B, B], [-B, B, B]],
    [[-B, -B, -B], [B, -B, -B], [B, -B, B], [-B, -B, B]], [[-B, B, -B], [-B, B, B], [B, B, B], [B, B, -B]],
    [[-B, -B, -B], [-B, -B, B], [-B, B, B], [-B, B, -B]], [[B, -B, -B], [B, B, -B], [B, B, B], [B, -B, B]],
  ];
  let faces = box.map((pts) => ({ pi: -1, pts }));
  for (let k = 0; k < planes.length; k++) {
    const p = planes[k]; const nf = []; const capPts = [];
    let any = false; for (const f of faces) for (const q of f.pts) if (dot(p.n, q) - p.d > EPS) { any = true; break; }
    if (!any) continue; // plane doesn't touch the current solid
    for (const f of faces) { const { out, cut } = clipPoly(f.pts, p); if (out.length >= 3) nf.push({ pi: f.pi, pts: out }); for (const q of cut) capPts.push(q); }
    if (capPts.length >= 3) {
      // order cap points by angle in the plane
      const c = capPts.reduce((s, q) => add(s, q), [0, 0, 0]).map((v) => v / capPts.length);
      const u = norm(Math.abs(p.n[0]) < 0.9 ? cross(p.n, [1, 0, 0]) : cross(p.n, [0, 1, 0])); const w = cross(p.n, u);
      const uniq = []; for (const q of capPts) if (!uniq.some((r) => Math.abs(r[0] - q[0]) + Math.abs(r[1] - q[1]) + Math.abs(r[2] - q[2]) < 1e-6)) uniq.push(q);
      uniq.sort((a, b) => Math.atan2(dot(sub(a, c), w), dot(sub(a, c), u)) - Math.atan2(dot(sub(b, c), w), dot(sub(b, c), u)));
      if (uniq.length >= 3) nf.push({ pi: k, pts: uniq });
    }
    faces = nf; if (!faces.length) break;
  }
  let volume = 0; const vmap = new Map(); const verts = []; const edges = []; const ekeys = new Set();
  const key = (q) => `${Math.round(q[0] * 1e5)},${Math.round(q[1] * 1e5)},${Math.round(q[2] * 1e5)}`;
  let bounded = true;
  for (const f of faces) {
    if (f.pi < 0) bounded = false;
    let av = [0, 0, 0]; const p0 = f.pts[0];
    for (let i = 1; i + 1 < f.pts.length; i++) av = add(av, cross(sub(f.pts[i], p0), sub(f.pts[i + 1], p0)));
    f.area = len(av) / 2; f.c = f.pts.reduce((s, q) => add(s, q), [0, 0, 0]).map((v) => v / f.pts.length);
    const n = f.pi >= 0 ? planes[f.pi].n : norm(av); volume += (dot(p0, n) * f.area) / 3;
    const ids = f.pts.map((q) => { const k = key(q); if (!vmap.has(k)) { vmap.set(k, verts.length); verts.push(q); } return vmap.get(k); });
    f.ids = ids;
    for (let i = 0; i < ids.length; i++) { const a = ids[i], b = ids[(i + 1) % ids.length]; if (a === b) continue; const ek = a < b ? a + '_' + b : b + '_' + a; if (!ekeys.has(ek)) { ekeys.add(ek); edges.push([a, b, f.pi]); } }
  }
  return { faces, verts, edges, volume: Math.abs(volume), ok: bounded && faces.length >= 4 };
}

export const inside = (planes, q, eps = 1e-6) => { for (const p of planes) if (dot(p.n, q) > p.d + eps) return false; return true; };
// signed distance-ish: max over planes of (n·q - d)  (<= 0 inside)
export const sdist = (planes, q) => { let m = -1e9; for (const p of planes) { const s = dot(p.n, q) - p.d; if (s > m) m = s; } return m; };

// ray vs convex solid. returns { t0, t1, i0, i1 } or null
export function rayHit(planes, o, dir) {
  let t0 = -1e9, t1 = 1e9, i0 = -1, i1 = -1;
  for (let i = 0; i < planes.length; i++) {
    const p = planes[i]; const dn = dot(p.n, dir), dist = p.d - dot(p.n, o);
    if (Math.abs(dn) < 1e-12) { if (dist < 0) return null; continue; }
    const t = dist / dn;
    if (dn < 0) { if (t > t0) { t0 = t; i0 = i; } } else if (t < t1) { t1 = t; i1 = i; }
    if (t0 > t1) return null;
  }
  if (t1 < 0 || i0 < 0) return null; return { t0, t1, i0, i1 };
}

// transform planes by rotation m (3x3, row-major), scale s and translation t:  world = m * (s * local) + t
export function xfPlanes(planes, m, s, t) {
  return planes.map((p) => { const n = [m[0] * p.n[0] + m[1] * p.n[1] + m[2] * p.n[2], m[3] * p.n[0] + m[4] * p.n[1] + m[5] * p.n[2], m[6] * p.n[0] + m[7] * p.n[1] + m[8] * p.n[2]]; return { ...p, n, d: p.d * s + dot(n, t) }; });
}
// inverse: express world planes in a local frame where world = m*(s*local)+t
export function invXfPlanes(planes, m, s, t) {
  return planes.map((p) => { const nl = [m[0] * p.n[0] + m[3] * p.n[1] + m[6] * p.n[2], m[1] * p.n[0] + m[4] * p.n[1] + m[7] * p.n[2], m[2] * p.n[0] + m[5] * p.n[1] + m[8] * p.n[2]]; return { ...p, n: nl, d: (p.d - dot(p.n, t)) / s }; });
}
export const xfPoint = (m, s, t, q) => [m[0] * q[0] * s + m[1] * q[1] * s + m[2] * q[2] * s + t[0], m[3] * q[0] * s + m[4] * q[1] * s + m[5] * q[2] * s + t[1], m[6] * q[0] * s + m[7] * q[1] * s + m[8] * q[2] * s + t[2]];

export function bounds(verts) { const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (const q of verts) for (let k = 0; k < 3; k++) { if (q[k] < lo[k]) lo[k] = q[k]; if (q[k] > hi[k]) hi[k] = q[k]; } return { lo, hi, c: mul(add(lo, hi), 0.5), r: Math.max(...verts.map((q) => len(sub(q, mul(add(lo, hi), 0.5))))) }; }
