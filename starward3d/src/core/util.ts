// Small shared helpers: formatting, maths, Starward's time ladder and cost curves, seeded randomness, DOM.
export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
export function fmt(n: number, dec = 1): string {
  if (n === Infinity) return '∞'; if (!isFinite(n)) return '–'; const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a < 1000) return s + (a < 10 && a % 1 ? a.toFixed(1).replace(/\.0$/, '') : Math.floor(a).toString());
  const e = Math.min(SUF.length - 1, Math.floor(Math.log10(a) / 3)); const v = a / Math.pow(1000, e);
  return s + (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(dec).replace(/\.0$/, '') : v.toFixed(dec + 1).replace(/\.?0+$/, '')) + SUF[e];
}
export const fmtInt = (n: number) => Math.floor(n).toLocaleString('en-US');
export function fmtTime(sec: number): string {
  sec = Math.max(0, Math.ceil(sec)); if (sec < 60) return sec + 's';
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (d) return `${d}d ${h}h`; if (h) return `${h}h ${m}m`; return s && m < 10 ? `${m}m ${s}s` : `${m}m`;
}
export const pct = (x: number, d = 0) => (x * 100).toFixed(d) + '%';
// value at level L of a geometric curve [base, growth]
export const curve = (base: number, growth: number, L: number) => base * Math.pow(growth, L - 1);
// Starward's time ladder (seconds); fractional steps interpolate geometrically. ~10 = 1 h, ~21 = 1 day, 36 = 14 days.
export const LADDER = [5, 15, 30, 60, 120, 300, 600, 1200, 1800, 2700, 3600, 5400, 7200, 10800, 14400, 21600, 28800, 36000, 43200, 57600, 72000, 86400, 108000, 129600, 172800, 216000, 259200, 302400, 345600, 432000, 518400, 604800, 691200, 777600, 864000, 1036800, 1209600];
export function ladder(x: number) { const n = LADDER.length - 1; if (x <= 0) return LADDER[0]; if (x >= n) return LADDER[n]; const i = Math.floor(x), f = x - i; return LADDER[i] * Math.pow(LADDER[i + 1] / LADDER[i], f); }
// building timer on the ladder: [offset, stride] with a gently flattening stride, or [a, b, 'ln'] for command buildings
export type TimeDef = [number, number] | [number, number, 'ln'];
export const timeCurve = (t: TimeDef, L: number) => ladder(t[2] === 'ln' ? t[0] + t[1] * Math.log(L) : t[0] + t[1] * Math.pow(L - 1, 0.85));
export const round2 = (n: number) => { if (n < 100) return Math.round(n); const p = Math.pow(10, Math.floor(Math.log10(n)) - 1); return Math.round(n / p) * p; };
export function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
export const $$ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll(sel)) as T[];
export const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
