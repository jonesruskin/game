// GLINT: small vector / matrix / RNG toolkit shared by geometry, optics and the renderer.
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const DEG = Math.PI / 180;

// vec3 as plain arrays
export const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const madd = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];

// 3x3 rotation matrices, row-major flat arrays [m00 m01 m02 m10 ...]
export const mIdent = () => [1, 0, 0, 0, 1, 0, 0, 0, 1];
export const mMul = (a, b) => { const r = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]; return r; };
export const mApply = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
export const mT = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
export const mRotX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
export const mRotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
export const mRotZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
export const mAxis = (ax, a) => { const [x, y, z] = norm(ax), c = Math.cos(a), s = Math.sin(a), t = 1 - c; return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c]; };
// re-orthonormalise a rotation (prevents drift after many incremental drags)
export const mOrtho = (m) => { const x = norm([m[0], m[3], m[6]]); let y = [m[1], m[4], m[7]]; y = norm(sub(y, mul(x, dot(x, y)))); const z = cross(x, y); return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]]; };

// deterministic RNG (mulberry32) + string hash, so Daily Stones match on every device
export function rng(seed) { let a = seed >>> 0; const f = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; f.range = (a, b) => a + f() * (b - a); f.int = (a, b) => Math.floor(a + f() * (b - a + 1)); f.pick = (arr) => arr[Math.floor(f() * arr.length)]; f.chance = (p) => f() < p; f.gauss = () => { let u = 0, v = 0; while (u === 0) u = f(); v = f(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }; f.weighted = (items, w) => { let tot = 0; for (const it of items) tot += w(it); let r = f() * tot; for (const it of items) { r -= w(it); if (r <= 0) return it; } return items[items.length - 1]; }; return f; }
export const hashStr = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

// 2D value noise for procedural textures
export function noise2(seed = 1) {
  const p = new Uint8Array(512); const r = rng(seed); const base = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; } for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  const g = (h) => (p[h] / 255) * 2 - 1; const f = (t) => t * t * (3 - 2 * t);
  const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const a = g(p[(xi & 255) + p[yi & 255]]), b = g(p[((xi + 1) & 255) + p[yi & 255]]), c = g(p[(xi & 255) + p[(yi + 1) & 255]]), d = g(p[((xi + 1) & 255) + p[(yi + 1) & 255]]); const u = f(xf), v = f(yf); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  n.fbm = (x, y, oct = 4) => { let s = 0, a = 0.5, fr = 1; for (let i = 0; i < oct; i++) { s += a * n(x * fr, y * fr); fr *= 2; a *= 0.5; } return s; };
  return n;
}
