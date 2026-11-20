// Small math + helper toolkit shared by every module.
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
export const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
export const angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;
export const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
export function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// Seeded RNG (mulberry32) for daily content.
export function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
export const dayNumber = (d = new Date()) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);

// Circle vs axis-aligned rect: returns push vector to resolve or null.
export function circleRect(cx, cy, r, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw), ny = clamp(cy, ry, ry + rh);
  let dx = cx - nx, dy = cy - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 === 0) { // center inside rect: push out along smallest axis
    const l = cx - rx, rr = rx + rw - cx, t = cy - ry, b = ry + rh - cy;
    const m = Math.min(l, rr, t, b);
    if (m === l) return { x: -(l + r), y: 0 };
    if (m === rr) return { x: rr + r, y: 0 };
    if (m === t) return { x: 0, y: -(t + r) };
    return { x: 0, y: b + r };
  }
  const d = Math.sqrt(d2);
  return { x: (dx / d) * (r - d), y: (dy / d) * (r - d) };
}

// Segment vs rect (Liang–Barsky). Returns t in [0,1] of first hit or -1.
export function segRect(x1, y1, x2, y2, rx, ry, rw, rh) {
  let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
  const p = [-dx, dx, -dy, dy], q = [x1 - rx, rx + rw - x1, y1 - ry, ry + rh - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return -1; }
    else { const t = q[i] / p[i]; if (p[i] < 0) { if (t > t1) return -1; if (t > t0) t0 = t; } else { if (t < t0) return -1; if (t < t1) t1 = t; } }
  }
  return t0;
}
// Segment vs circle. Returns t of first hit or -1.
export function segCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1, fx = x1 - cx, fy = y1 - cy;
  const a = dx * dx + dy * dy; if (a === 0) return fx * fx + fy * fy <= r * r ? 0 : -1;
  const b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - r * r;
  if (c <= 0) return 0;
  let disc = b * b - 4 * a * c; if (disc < 0) return -1;
  disc = Math.sqrt(disc); const t = (-b - disc) / (2 * a);
  return t >= 0 && t <= 1 ? t : -1;
}
export const fmtNum = (n) => (n >= 10000 ? (n / 1000).toFixed(1) + 'k' : String(Math.floor(n)));
export const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
