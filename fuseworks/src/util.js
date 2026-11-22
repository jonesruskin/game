// Small shared helpers: math, easing, seeded RNG, number formatting.
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
export const ease = {
  out: (t) => 1 - (1 - t) * (1 - t),
  outCubic: (t) => 1 - (1 - t) ** 3,
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  outBack: (t) => { const c = 1.70158; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; },
  outExpo: (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};

// mulberry32 — fast, seedable, good enough for games. rng() -> [0,1)
export function makeRng(seed) {
  let a = seed >>> 0;
  const f = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.int = (n) => Math.floor(f() * n);
  f.range = (lo, hi) => lo + f() * (hi - lo);
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.chance = (p) => f() < p;
  f.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  f.weighted = (items, w) => { let s = 0; for (const it of items) s += w(it); let r = f() * s; for (const it of items) { r -= w(it); if (r <= 0) return it; } return items[items.length - 1]; };
  return f;
}
export function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export const mix = (...n) => { let h = 0x9e3779b9; for (const v of n) { h ^= (v >>> 0) + 0x7f4a7c15 + (h << 6) + (h >>> 2); h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0; } return h >>> 0; };

// Score formatting: full digits while readable, then suffixes, then scientific.
const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
export function fmt(n, full = 1e9) {
  if (!isFinite(n)) return n > 0 ? '∞' : '-∞';
  n = Math.floor(n);
  if (Math.abs(n) < full) return n.toLocaleString('en-US');
  const e = Math.floor(Math.log10(Math.abs(n)) / 3);
  if (e < SUF.length) { const v = n / 10 ** (e * 3); return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0)) + SUF[e]; }
  return n.toExponential(2).replace('+', '');
}
export const fmtShort = (n) => fmt(n, 1e5);
export function fmtHeat(h) { if (!isFinite(h)) return '∞'; if (h < 100 && Math.abs(h - Math.round(h)) > 1e-6) return h.toFixed(1); return fmt(h, 1e7); }
export const dayNumber = (t = Date.now()) => Math.floor((t - new Date().getTimezoneOffset() * 60000) / 86400000);
export function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
