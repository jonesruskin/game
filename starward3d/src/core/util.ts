// Small shared helpers: formatting, maths, seeded randomness, ids.
export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function fmt(n: number): string {
  if (!isFinite(n)) return '∞'; const a = Math.abs(n);
  if (a < 1000) return String(Math.floor(n));
  const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi']; let i = -1, v = a; while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; }
  return (n < 0 ? '-' : '') + (v >= 100 ? Math.floor(v) : v >= 10 ? v.toFixed(1).replace(/\.0$/, '') : v.toFixed(2).replace(/\.?0+$/, '')) + u[i];
}
export function fmtTime(sec: number): string {
  sec = Math.max(0, Math.ceil(sec)); if (sec < 60) return sec + 's';
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (d) return `${d}d ${h}h`; if (h) return `${h}h ${m}m`; return s && m < 10 ? `${m}m ${s}s` : `${m}m`;
}
export const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
export function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
let uidN = 0; export const uid = (p = 'x') => p + Date.now().toString(36) + (uidN++).toString(36) + Math.floor(Math.random() * 1296).toString(36);
export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
export const $$ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll(sel)) as T[];
export const round2 = (n: number) => { if (n < 100) return Math.round(n); const p = Math.pow(10, Math.floor(Math.log10(n)) - 1); return Math.round(n / p) * p; };
