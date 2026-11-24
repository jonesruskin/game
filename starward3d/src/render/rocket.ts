// Rockets in 3D, assembled from the player's design: stages stacked by tank size, engine bells, strap-on boosters,
// a nose / fairing / crew capsule / lander on top, landing legs; painted in the agency's colours.
import * as THREE from 'three';
import { Kit, shade } from './kit';
import { Design, TANKS, ENGINES, TOPS } from '../data/rockets';
import type { Look } from './models';
export interface RocketModel { group: THREE.Group; height: number; flame: THREE.Mesh; }
export function rocketModel(d: Design, look: Look): RocketModel {
  const k = new Kit(); const W = '#f2f4f7', A = look.accent, DK = '#2f343c'; let y = 0; const bells: { r: number; y: number }[] = [];
  const st0 = TANKS[d.stages[0]?.tank || 'S'];
  if (d.legs) for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; k.box(0.05, 0.7, 0.05, DK, Math.cos(a) * (st0.r + 0.12), -0.1, Math.sin(a) * (st0.r + 0.12), { rz: Math.cos(a) * 0.35, rx: -Math.sin(a) * 0.35 }); }
  d.stages.forEach((st, i) => { const t = TANKS[st.tank], e = ENGINES[st.eng]; const r = t.r * (i > 0 ? 0.92 : 1);
    if (i === 0) { const n = e.P >= 2 ? 7 : e.P >= 1.5 ? 3 : 1; for (let b = 0; b < n; b++) { const a = (b / Math.max(1, n - 1)) * Math.PI * 2, rr = n > 1 && b > 0 ? r * 0.55 : 0; k.add(new THREE.CylinderGeometry(r * (n > 1 ? 0.18 : 0.42), r * (n > 1 ? 0.3 : 0.62), 0.32, 10, 1, true), e.color, Math.cos(a) * rr, 0.0, Math.sin(a) * rr); } bells.push({ r: r * 0.8, y: -0.1 }); y = 0.16; }
    k.cyl(r, r, t.h, 16, W, 0, y, 0); k.cyl(r + 0.01, r + 0.01, t.h * 0.08, 16, i % 2 ? DK : A, 0, y + t.h * 0.7, 0); if (i === 0) k.cyl(r + 0.012, r + 0.012, t.h * 0.05, 16, DK, 0, y + t.h * 0.25, 0);
    if (e.req === 'nuclearThermal') k.cyl(r * 1.02, r * 1.02, t.h * 0.18, 16, '#d9c34a', 0, y + t.h * 0.05, 0);
    y += t.h; if (i < d.stages.length - 1) { const nr = TANKS[d.stages[i + 1].tank].r * 0.92; k.cyl(nr, r, 0.18, 16, DK, 0, y, 0); y += 0.18; } });
  const topR = TANKS[d.stages[d.stages.length - 1]?.tank || 'S'].r * 0.92; const top = TOPS[d.top] || TOPS.probe;
  if (d.top === 'fairing') { const R = Math.max(topR * 1.15, 0.34); k.cyl(R, topR, 0.2, 16, W, 0, y, 0); const pts: THREE.Vector2[] = []; for (let i = 0; i <= 10; i++) { const f = i / 10; pts.push(new THREE.Vector2(R * Math.cos(f * Math.PI / 2 * 0.95) ** 0.7, 0.2 + f * top.h)); } k.add(new THREE.LatheGeometry(pts, 16), W, 0, y, 0); k.cyl(R + 0.01, R + 0.01, 0.06, 16, A, 0, y + 0.3, 0); y += top.h + 0.2; }
  else if (d.top === 'capsule' || d.top === 'lander') { if (d.top === 'lander') { k.box(topR * 1.5, 0.5, topR * 1.5, '#d9a82e', 0, y, 0); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; k.box(0.04, 0.45, 0.04, '#9aa3ad', Math.cos(a) * topR * 0.95, y - 0.12, Math.sin(a) * topR * 0.95, { rz: Math.cos(a) * 0.5, rx: -Math.sin(a) * 0.5 }); } y += 0.5; }
    k.cyl(topR * 0.45, topR * 0.95, 0.55, 16, '#e6e9ee', 0, y, 0); k.cyl(topR * 0.96, topR * 0.96, 0.04, 16, A, 0, y, 0); k.box(0.12, 0.08, 0.02, '#4fb3ff', topR * 0.35, y + 0.28, topR * 0.66, { glass: true }); y += 0.55;
    k.cyl(0.03, 0.03, 0.55, 5, '#c0392b', 0, y, 0); k.cyl(0.0, 0.07, 0.18, 8, '#c0392b', 0, y + 0.55, 0); y += 0.75; }
  else { k.add(new THREE.ConeGeometry(topR, top.h, 16), W, 0, y + top.h / 2, 0); k.cyl(topR + 0.01, topR + 0.01, 0.05, 16, A, 0, y + 0.02, 0); y += top.h; }
  if (d.boost.n > 0) { const t = TANKS[d.boost.tank]; const br = t.r * 0.5, bh = t.h * 1.25; for (let i = 0; i < d.boost.n; i++) { const a = (i / d.boost.n) * Math.PI * 2 + (d.boost.n === 2 ? 0 : Math.PI / 4); const x = Math.cos(a) * (st0.r + br * 0.95), z = Math.sin(a) * (st0.r + br * 0.95);
      k.add(new THREE.CylinderGeometry(br * 0.5, br * 0.8, 0.22, 10, 1, true), DK, x, 0.0, z); k.cyl(br, br, bh, 12, W, x, 0.1, z); k.cyl(br + 0.01, br + 0.01, 0.1, 12, DK, x, 0.1 + bh * 0.3, z); k.cyl(br + 0.01, br + 0.01, 0.1, 12, DK, x, 0.1 + bh * 0.65, z);
      k.add(new THREE.ConeGeometry(br, br * 2.2, 12), W, x, 0.1 + bh + br * 1.1, z); bells.push({ r: br * 0.6, y: -0.1 }); } }
  const g = k.build('rocket'); g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
  // the exhaust: one flame per bell cluster (shown only in flight)
  const flame = new THREE.Mesh(new THREE.ConeGeometry(Math.max(0.18, st0.r * 0.9), 1.6 + st0.r * 2, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#ffcf6b', transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false })); flame.rotation.x = Math.PI; flame.position.y = -(0.8 + st0.r); flame.visible = false; g.add(flame);
  return { group: g, height: y, flame };
}
export { shade };
