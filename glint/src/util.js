// GLINT: formatting + tiny helpers
export const fmt$ = (n) => { n = Math.round(n || 0); const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a < 10000) return s + '$' + a.toLocaleString('en-US');
  const u = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']]; for (const [v, l] of u) if (a >= v) { const x = a / v; return s + '$' + (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)) + l; } return s + '$' + a; };
export const fmtN = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : Math.round(n).toLocaleString('en-US'));
export const fmtCt = (ct) => (ct >= 100 ? ct.toFixed(0) : ct >= 10 ? ct.toFixed(1) : ct.toFixed(2)) + ' ct';
export const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); if (s < 60) return s + 's'; if (s < 3600) return Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's'; return Math.floor(s / 3600) + 'h ' + String(Math.floor((s % 3600) / 60)).padStart(2, '0') + 'm'; };
export const dayNumber = (t = Date.now()) => Math.floor((t - new Date().getTimezoneOffset() * 0) / 86400000);
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
