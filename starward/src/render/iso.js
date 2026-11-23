// STARWARD: isometric drawing toolkit (Canvas2D). Tile = 64 × 32 world units. Heights in world units.
// Light comes from the upper left: top faces brightest, the left (+j) face mid, the right (+i) face darkest.
export const TW = 64, TH = 32;
export const P = (i, j, z = 0) => [(i - j) * (TW / 2), (i + j) * (TH / 2) - z];
const hex = (c) => { c = c.replace('#', ''); if (c.length === 3) c = c.split('').map((x) => x + x).join(''); const n = parseInt(c, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const shade = (c, k) => { const [r, g, b] = hex(c); const f = (v) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)))); return `rgb(${f(r)},${f(g)},${f(b)})`; };
export const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
export function poly(c, pts, fill, stroke, lw = 1) { c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); } }
// flat diamond footprint
export const diamond = (i, j, w, d, z = 0) => [P(i, j, z), P(i + w, j, z), P(i + w, j + d, z), P(i, j + d, z)];
// axis-aligned box: returns the face quads (for windows / lights)
export function box(c, i, j, w, d, h, col, z = 0, opt = {}) {
  const top = diamond(i, j, w, d, z + h);
  const right = [P(i + w, j, z), P(i + w, j + d, z), P(i + w, j + d, z + h), P(i + w, j, z + h)];
  const left = [P(i, j + d, z), P(i + w, j + d, z), P(i + w, j + d, z + h), P(i, j + d, z + h)];
  const edge = opt.edge === undefined ? 'rgba(0,0,0,0.18)' : opt.edge;
  poly(c, left, opt.left || shade(col, -0.08), edge, 0.6); poly(c, right, opt.right || shade(col, -0.3), edge, 0.6); poly(c, top, opt.top || shade(col, 0.12), edge, 0.6);
  return { top, left, right };
}
// windows on a face quad [p0 (bottom-left), p1 (bottom-right), p2 (top-right), p3 (top-left)]
export function grid(c, face, rows, cols, color, pad = 0.18, lights) {
  const [a, b, , d] = face; const ux = [(b[0] - a[0]) / cols, (b[1] - a[1]) / cols], uy = [(d[0] - a[0]) / rows, (d[1] - a[1]) / rows];
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const o = [a[0] + ux[0] * k + uy[0] * r, a[1] + ux[1] * k + uy[1] * r]; const q = (s, t) => [o[0] + ux[0] * s + uy[0] * t, o[1] + ux[1] * s + uy[1] * t];
    const pts = [q(pad, pad), q(1 - pad, pad), q(1 - pad, 1 - pad * 0.6), q(pad, 1 - pad * 0.6)]; poly(c, pts, color);
    if (lights) lights.push({ x: (pts[0][0] + pts[2][0]) / 2, y: (pts[0][1] + pts[2][1]) / 2, r: Math.hypot(ux[0], ux[1]) * 0.5, k: (r * 7 + k * 13) % 5 });
  }
}
// vertical cylinder centred on (ci, cj), radius r tiles
export function cyl(c, ci, cj, r, h, col, z = 0, opt = {}) {
  const [x, y] = P(ci, cj, z); const rx = r * TW * 0.7071, ry = r * TH * 0.7071;
  const g = c.createLinearGradient(x - rx, 0, x + rx, 0); g.addColorStop(0, shade(col, 0.05)); g.addColorStop(0.35, shade(col, 0.18)); g.addColorStop(1, shade(col, -0.38));
  c.beginPath(); c.moveTo(x - rx, y); c.lineTo(x - rx, y - h); c.ellipse(x, y - h, rx, ry, 0, Math.PI, 0, true); c.lineTo(x + rx, y); c.ellipse(x, y, rx, ry, 0, 0, Math.PI); c.closePath(); c.fillStyle = g; c.fill();
  if (opt.bands) { c.strokeStyle = opt.bands; c.lineWidth = 1; for (let k = 1; k < (opt.nb || 3); k++) { const yy = y - (h * k) / (opt.nb || 3); c.beginPath(); c.ellipse(x, yy, rx, ry, 0, 0, Math.PI); c.stroke(); } }
  c.beginPath(); c.ellipse(x, y - h, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = opt.top || shade(col, 0.22); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 0.6; c.stroke();
  return { x, y, rx, ry, top: y - h };
}
// cooling-tower style hyperboloid
export function tower(c, ci, cj, r, h, col, z = 0) {
  const [x, y] = P(ci, cj, z); const rx = r * TW * 0.7071, ry = r * TH * 0.7071, w = 0.68;
  const g = c.createLinearGradient(x - rx, 0, x + rx, 0); g.addColorStop(0, shade(col, 0.02)); g.addColorStop(0.35, shade(col, 0.15)); g.addColorStop(1, shade(col, -0.35));
  c.beginPath(); c.moveTo(x - rx, y); c.quadraticCurveTo(x - rx * w, y - h * 0.6, x - rx * 0.78, y - h); c.lineTo(x + rx * 0.78, y - h); c.quadraticCurveTo(x + rx * w, y - h * 0.6, x + rx, y); c.ellipse(x, y, rx, ry, 0, 0, Math.PI); c.closePath(); c.fillStyle = g; c.fill();
  c.beginPath(); c.ellipse(x, y - h, rx * 0.78, ry * 0.78, 0, 0, Math.PI * 2); c.fillStyle = shade(col, -0.45); c.fill();
  return { x, y: y - h };
}
// hemisphere / glass dome
export function dome(c, ci, cj, r, h, col, z = 0, glass = false) {
  const [x, y] = P(ci, cj, z); const rx = r * TW * 0.7071, ry = r * TH * 0.7071;
  const g = c.createRadialGradient(x - rx * 0.35, y - h * 0.7, rx * 0.05, x, y - h * 0.3, rx * 1.15);
  if (glass) { g.addColorStop(0, 'rgba(235,250,255,0.95)'); g.addColorStop(0.35, rgba(col, 0.75)); g.addColorStop(1, rgba(shade(col, -0.5).replace('rgb', '').length ? '#1a3550' : col, 0.9)); }
  else { g.addColorStop(0, shade(col, 0.35)); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, -0.45)); }
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI); c.ellipse(x, y, rx, h + ry * 0.1, 0, Math.PI, 0); c.closePath(); c.fillStyle = g; c.fill();
  if (glass) { c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.8; for (let k = 1; k < 4; k++) { c.beginPath(); c.ellipse(x, y, rx * (1 - k * 0.24), h * (1 - k * 0.1), 0, Math.PI, 0); c.stroke(); } c.beginPath(); c.moveTo(x - rx, y); c.lineTo(x + rx, y); c.stroke(); }
  return { x, y: y - h };
}
// satellite dish at screen point (x, y), facing azimuth a (radians), elevation e
export function dish(c, x, y, r, a, e = 0.7, col = '#e9eef5') {
  const cosA = Math.cos(a), sinA = Math.sin(a); const rx = r * (0.35 + 0.65 * Math.abs(sinA)), ry = r * (0.55 + 0.25 * e);
  c.save(); c.translate(x, y); c.rotate(cosA * 0.35);
  const g = c.createLinearGradient(-rx, 0, rx, 0); g.addColorStop(0, sinA > 0 ? shade(col, -0.35) : shade(col, 0.1)); g.addColorStop(1, sinA > 0 ? shade(col, 0.1) : shade(col, -0.35));
  c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 0.8; c.stroke();
  c.beginPath(); c.ellipse(0, 0, rx * 0.55, ry * 0.55, 0, 0, Math.PI * 2); c.strokeStyle = 'rgba(0,0,0,0.12)'; c.stroke();
  const fx = cosA * r * 0.55, fy = -r * 0.7 * e; c.strokeStyle = '#5a6270'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-rx * 0.7, 0); c.lineTo(fx, fy); c.lineTo(rx * 0.7, 0); c.stroke(); c.fillStyle = '#d64545'; c.beginPath(); c.arc(fx, fy, 1.8, 0, 7); c.fill();
  c.restore();
}
// lattice tower (launch umbilical / pylons) from screen point (x,y) up by h, width w
export function lattice(c, x, y, w, h, col = '#c4422b', segs = 8) {
  c.strokeStyle = col; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x - w / 2, y - h); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y - h); c.stroke();
  c.lineWidth = 0.8; c.beginPath(); for (let k = 0; k < segs; k++) { const y0 = y - (h * k) / segs, y1 = y - (h * (k + 1)) / segs; c.moveTo(x - w / 2, y0); c.lineTo(x + w / 2, y1); c.moveTo(x + w / 2, y0); c.lineTo(x - w / 2, y1); c.moveTo(x - w / 2, y1); c.lineTo(x + w / 2, y1); } c.stroke();
}
// tilted solar panel row on the ground plane
export function panel(c, i, j, w, d, z, tilt = 7) {
  const a = P(i, j, z), b = P(i + w, j, z), cc = P(i + w, j + d, z + tilt), dd = P(i, j + d, z + tilt);
  const g = c.createLinearGradient(a[0], a[1], cc[0], cc[1]); g.addColorStop(0, '#1d3a6b'); g.addColorStop(0.5, '#2f5ea3'); g.addColorStop(1, '#16305a');
  poly(c, [a, b, cc, dd], g, 'rgba(180,200,230,0.55)', 0.7);
  c.strokeStyle = 'rgba(160,190,230,0.35)'; c.lineWidth = 0.5; c.beginPath(); for (let k = 1; k < 4; k++) { const t = k / 4; c.moveTo(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); c.lineTo(dd[0] + (cc[0] - dd[0]) * t, dd[1] + (cc[1] - dd[1]) * t); } c.stroke();
  c.strokeStyle = '#58606c'; c.lineWidth = 1; c.beginPath(); c.moveTo(dd[0], dd[1]); c.lineTo(dd[0], dd[1] + tilt); c.moveTo(cc[0], cc[1]); c.lineTo(cc[0], cc[1] + tilt); c.stroke();
}
