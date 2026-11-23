// STARWARD: small shared helpers (formatting, math, RNG, DOM).
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
export function fmt(n, dec = 1) {
  if (n === Infinity) return '∞'; if (!isFinite(n)) return '–'; const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a < 1000) return s + (a < 10 && a % 1 ? a.toFixed(1) : Math.floor(a).toString());
  const e = Math.min(SUF.length - 1, Math.floor(Math.log10(a) / 3)); const v = a / Math.pow(1000, e);
  return s + (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(dec) : v.toFixed(dec + 1)) + SUF[e];
}
export const fmtInt = (n) => Math.floor(n).toLocaleString('en-US');
export function fmtTime(sec) {
  sec = Math.max(0, Math.ceil(sec)); if (sec < 60) return sec + 's';
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (d) return `${d}d ${h}h`; if (h) return `${h}h ${m}m`; return `${m}m ${s ? s + 's' : ''}`.trim();
}
export const pct = (x, d = 0) => (x * 100).toFixed(d) + '%';
// value at level L of a geometric curve
export const curve = (base, growth, L) => base * Math.pow(growth, L - 1);
export const round2 = (n) => { if (n < 100) return Math.round(n); const m = Math.pow(10, Math.floor(Math.log10(n)) - 1); return Math.round(n / m) * m; };
export function rng(seed) { let a = seed >>> 0; const f = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; f.range = (a, b) => a + f() * (b - a); f.int = (a, b) => Math.floor(a + f() * (b - a + 1)); f.pick = (arr) => arr[Math.floor(f() * arr.length)]; f.chance = (p) => f() < p; return f; }
export const hash = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const now = () => Date.now();
