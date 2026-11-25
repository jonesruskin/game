// Procedural building models for the spaceport. Every building grows with its level (a new tier every few levels)
// and wears the player's paint scheme; parts are merged by Kit into 2-3 draw calls per building.
import * as THREE from 'three';
import { Kit, shade } from './kit';
import { BUILDINGS } from '../data/buildings';
export interface Look { primary: string; accent: string; banner: { bg: string; fg: string; emblem: string }; }
export interface Model { group: THREE.Group; height: number; anim?: (t: number, k: AnimState) => void; head?: THREE.Object3D; }
export interface AnimState { working: boolean; full?: boolean; }
const CON = '#cfd3d8', DARK = '#3b4350', STEEL = '#aeb8c4', WIN = '#ffe7a8', GLASS = '#9fd3ff';
const tierOf = (L: number) => Math.min(6, 1 + Math.floor((Math.max(1, L) - 1) / 4));
// a concrete apron under every building, with painted kerbs
function pad(k: Kit, w: number, d: number, c = CON) { k.box(w - 0.08, 0.1, d - 0.08, c); k.box(w - 0.08, 0.03, 0.06, '#f2d36b', 0, 0.1, d / 2 - 0.1); }
// a window band: a glowing strip on each face of a block
function windows(k: Kit, w: number, d: number, y: number, h: number, x = 0, z = 0) { k.box(w + 0.05, h, d + 0.05, WIN, x, y, z, { glow: true }); for (let i = -w / 2 + 0.35; i < w / 2 - 0.2; i += 0.42) { k.box(0.07, h + 0.02, d + 0.07, '#5b6676', x + i, y - 0.01, z); } }
function hq(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, P = look.primary, A = look.accent; pad(k, 5, 5);
  // main block with a glass facade and a roof garden of equipment
  const bh = 0.95 + lf * 0.12; k.box(3.3, bh, 2.3, P, 0.55, 0.1, 0.55); windows(k, 3.3, 2.3, 0.4, 0.3, 0.55, 0.55); k.box(3.36, 0.1, 2.36, A, 0.55, 0.1 + bh, 0.55);
  k.box(3.0, bh - 0.15, 0.06, GLASS, 0.55, 0.15, -0.62, { glass: true }); for (let x = -0.8; x <= 1.9; x += 0.45) k.box(0.05, bh - 0.15, 0.08, shade(P, -0.3), x, 0.15, -0.62);
  for (let i = 1; i < Math.min(t, 4); i++) { const w = 3.0 - i * 0.5, d = 2.0 - i * 0.3, y0 = 0.2 + bh + (i - 1) * 0.62; k.box(w, 0.55, d, i % 2 ? shade(P, -0.05) : P, 0.85, y0, 0.75); windows(k, w, d, y0 + 0.18, 0.2, 0.85, 0.75); k.box(w + 0.05, 0.06, d + 0.05, A, 0.85, y0 + 0.55, 0.75); }
  k.box(0.5, 0.3, 0.4, '#9aa3ad', 1.6, 0.2 + bh, 1.2); k.box(0.4, 0.25, 0.4, '#9aa3ad', 1.1, 0.2 + bh, 1.4);
  // the control tower: an octagonal shaft and a glowing glass cab
  const th = 2.0 + lf * 0.45, tx = -1.35, tz = -1.15; k.cyl(0.42, 0.5, th, 8, shade(P, -0.04), tx, 0.1, tz); for (let y = 0.6; y < th - 0.3; y += 0.55) k.cyl(0.43, 0.43, 0.05, 8, A, tx, 0.1 + y, tz);
  k.cyl(0.8, 0.55, 0.22, 10, P, tx, 0.1 + th, tz); k.cyl(0.78, 0.78, 0.42, 10, GLASS, tx, 0.32 + th, tz, { glass: true }); k.cyl(0.7, 0.7, 0.36, 10, WIN, tx, 0.35 + th, tz, { glow: true });
  k.cyl(0.86, 0.86, 0.1, 10, A, tx, 0.74 + th, tz); k.cyl(0.55, 0.8, 0.14, 10, P, tx, 0.84 + th, tz); k.cyl(0.03, 0.03, 0.9, 5, STEEL, tx, 0.98 + th, tz); k.sphere(0.06, '#ff4f4f', tx, 1.9 + th, tz, { glow: true });
  const g = k.build('hq');
  // a tracking dish on the roof
  const dish = new THREE.Group(); { const dk = new Kit(); dk.add(new THREE.SphereGeometry(0.6 + lf * 0.05, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3.2), '#eef2f6', 0, 0, 0, { rx: Math.PI }); dk.cyl(0.02, 0.02, 0.5, 4, STEEL, 0, -0.55, 0); dk.sphere(0.05, A, 0, -0.8, 0); const dg = dk.build(); dg.rotation.x = -0.9; dish.add(dg); }
  const ped = new Kit(); ped.cyl(0.1, 0.16, 0.45, 8, STEEL, 0, 0, 0); const pg = ped.build(); pg.position.set(0.1, 0.2 + bh, 0.3); g.add(pg); dish.position.set(0.1, 0.75 + bh, 0.3); g.add(dish);
  const fk = new Kit(); fk.cyl(0.03, 0.035, 2.4, 5, STEEL, 2.15, 0.1, -2.05); g.add(fk.build()); const f = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.48), new THREE.MeshStandardMaterial({ map: bannerTexture(look.banner), side: THREE.DoubleSide, roughness: 0.8 })); f.position.set(2.53, 2.25, -2.05); g.add(f);
  return { group: g, height: th + 1.4, anim: (tt) => { dish.rotation.y = tt * 0.25; f.rotation.y = Math.sin(tt * 2) * 0.15; } };
}
function research(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, P = look.primary, A = look.accent; pad(k, 4, 4);
  const h = 0.9 + lf * 0.18; k.box(2.6, h, 2.0, P, -0.5, 0.1, 0.5); windows(k, 2.6, 2.0, 0.4, 0.26, -0.5, 0.5); k.box(2.65, 0.08, 2.05, A, -0.5, 0.1 + h, 0.5);
  for (let i = 0; i < Math.min(3, 1 + Math.floor(t / 2)); i++) { const x = 1.1, z = -1.0 + i * 1.0; k.cyl(0.42, 0.42, 0.45, 12, '#e9edf2', x, 0.1, z); k.sphere(0.42, '#f6f8fb', x, 0.55, z, { theta: Math.PI / 2, w: 14 }); k.box(0.12, 0.3, 0.5, DARK, x, 0.7, z, { ry: 0.6 }); }
  k.cyl(0.32, 0.32, 3.0, 10, STEEL, -0.6, 0.45, -1.35, { rz: Math.PI / 2 }); k.cyl(0.36, 0.36, 0.2, 10, A, -2.0, 0.45, -1.35, { rz: Math.PI / 2 }); // wind tunnel
  if (t >= 3) { k.box(1.2, 0.8, 1.0, shade(P, -0.08), -0.9, 0.1 + h, 0.6); windows(k, 1.2, 1.0, 0.25 + h, 0.2, -0.9, 0.6); }
  return { group: k.build('research'), height: h + 1.2 };
}
function university(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, P = '#e8dcc6', A = look.accent; pad(k, 4, 4, '#7fae5a');
  k.box(3.2, 0.9, 1.3, P, 0, 0.1, -1.1); k.box(3.3, 0.18, 1.4, '#a8452f', 0, 1.0, -1.1); for (let i = -3; i <= 3; i++) k.cyl(0.06, 0.06, 0.8, 6, '#f6f1e6', i * 0.45, 0.1, -0.4);
  k.box(3.4, 0.08, 0.3, '#f6f1e6', 0, 0.9, -0.42); k.box(1.0, 0.9, 2.2, P, -1.2, 0.1, 0.7); k.box(1.1, 0.16, 2.3, '#a8452f', -1.2, 1.0, 0.7); windows(k, 1.0, 2.2, 0.45, 0.2, -1.2, 0.7); windows(k, 3.2, 1.3, 0.45, 0.2, 0, -1.1);
  const th = 1.6 + lf * 0.25; k.box(0.6, th, 0.6, P, 1.2, 0.1, 0.9); k.box(0.7, 0.1, 0.7, A, 1.2, 0.1 + th, 0.9); k.cyl(0.0, 0.42, 0.6, 4, '#a8452f', 1.2, 0.2 + th, 0.9, { ry: Math.PI / 4 }); k.cyl(0.18, 0.18, 0.05, 12, '#fff8dc', 1.2, th - 0.35, 1.21, { rx: Math.PI / 2, glow: true });
  for (let i = 0; i < 3; i++) { k.cyl(0.05, 0.07, 0.35, 5, '#6b4a2e', 0.1 + i * 0.5, 0.1, 0.9); k.sphere(0.25, '#3f8a3a', 0.1 + i * 0.5, 0.6, 0.9); }
  // tiers: a library wing, an observatory dome, a lit quad
  if (t >= 2) { k.box(1.0, 0.7, 1.0, P, 0.2, 0.1, 1.45); k.box(1.1, 0.14, 1.1, '#a8452f', 0.2, 0.8, 1.45); }
  if (t >= 4) { k.cyl(0.38, 0.38, 0.35, 14, '#eef0f3', -1.2, 1.15, 0.7); k.sphere(0.38, '#c9ced5', -1.2, 1.5, 0.7, { theta: Math.PI / 2, w: 14 }); }
  if (t >= 5) for (let i = 0; i < 4; i++) k.sphere(0.06, '#fff2b0', 0.1 + i * 0.4, 0.4, 0.4, { glow: true });
  return { group: k.build('university'), height: th + 0.9 };
}
function mine(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, A = look.accent; pad(k, 3, 3, '#8e8170');
  for (let i = 0; i < 3; i++) { const s = 2.0 - i * 0.55; k.box(s, 0.06, s, i % 2 ? '#6e6152' : '#7d6f5e', -0.25, 0.1 - i * 0.05, -0.25); } // stepped pit
  k.box(0.7, 0.04, 0.7, '#4a4036', -0.25, -0.02, -0.25);
  const hh = 1.4 + lf * 0.2; for (const [x, z] of [[0.75, 0.55], [1.15, 0.55], [0.75, 0.95], [1.15, 0.95]]) k.box(0.07, hh, 0.07, '#c0392b', x, 0.1, z); // headframe
  k.box(0.55, 0.08, 0.55, '#c0392b', 0.95, 0.1 + hh, 0.75); k.cyl(0.16, 0.16, 0.06, 10, DARK, 0.95, 0.15 + hh, 0.75, { rx: Math.PI / 2 });
  k.box(0.18, 0.12, 1.5, DARK, 0.2, 0.45, 0.9, { rx: -0.35 }); // conveyor
  k.add(new THREE.ConeGeometry(0.45, 0.5, 7), '#9aa3ad', -0.9, 0.35, 0.95); k.box(0.6, 0.35, 0.4, A, -0.95, 0.1, -1.0); k.box(0.3, 0.25, 0.4, '#f5c542', -0.55, 0.1, -1.0); // ore pile and a truck
  if (t >= 3) { k.box(0.9, 0.7, 0.6, '#d8d2c6', 0.9, 0.1, -0.9); windows(k, 0.9, 0.6, 0.35, 0.16, 0.9, -0.9); }
  return { group: k.build('mine'), height: hh + 0.5 };
}
function refinery(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, A = look.accent; pad(k, 3, 3);
  const n = Math.min(4, 1 + Math.floor(t / 2)); for (let i = 0; i < n; i++) { const h = 1.6 + lf * 0.2 - i * 0.2, x = -0.9 + i * 0.55; k.cyl(0.18, 0.2, h, 10, '#e4e7eb', x, 0.1, -0.8); for (let j = 1; j < 4; j++) k.cyl(0.21, 0.21, 0.05, 10, A, x, 0.1 + (h * j) / 4, -0.8); }
  k.sphere(0.45, '#f1f3f5', 0.6, 0.6, 0.6, { w: 14, h: 9 }); k.cyl(0.05, 0.05, 0.4, 5, STEEL, 0.6, 0.1, 0.6); if (t >= 2) k.sphere(0.36, '#f1f3f5', -0.5, 0.5, 0.75, { w: 12, h: 8 });
  k.box(2.2, 0.08, 0.08, STEEL, 0, 0.45, 0.0); k.box(0.08, 0.08, 1.5, STEEL, 0.1, 0.35, 0);
  const fh = 1.9 + lf * 0.25; k.cyl(0.05, 0.07, fh, 6, DARK, 1.15, 0.1, -1.1); const g = k.build('refinery');
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 8), new THREE.MeshBasicMaterial({ color: '#ffb347', toneMapped: false })); flame.position.set(1.15, 0.1 + fh + 0.2, -1.1); g.add(flame);
  return { group: g, height: fh + 0.6, anim: (tt, s) => { flame.visible = s.working; flame.scale.set(1, 0.8 + Math.sin(tt * 13) * 0.25 + Math.sin(tt * 7.3) * 0.15, 1); } };
}
function office(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, P = look.primary, A = look.accent; pad(k, 3, 3);
  const h = 1.2 + lf * 0.55; k.box(1.7, h, 1.5, GLASS, -0.2, 0.1, -0.2, { glass: true }); k.box(1.6, h - 0.05, 1.4, '#5d7da0', -0.2, 0.1, -0.2);
  for (let y = 0.4; y < h; y += 0.42) k.box(1.72, 0.05, 1.52, A, -0.2, 0.1 + y, -0.2); k.box(1.8, 0.12, 1.6, P, -0.2, 0.1 + h, -0.2);
  windows(k, 1.62, 1.42, 0.3, h - 0.5, -0.2, -0.2); k.box(1.0, 0.6, 0.9, P, 0.6, 0.1, 0.8); windows(k, 1.0, 0.9, 0.25, 0.18, 0.6, 0.8); k.box(0.5, 0.05, 0.25, '#ffd166', 0.6, 0.72, 1.26, { glow: true });
  return { group: k.build('office'), height: h + 0.4 };
}
function solar(L: number): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4; pad(k, 3, 3, '#a5b07f');
  const rows = Math.min(4, 2 + Math.floor(t / 2)), cols = t >= 4 ? 3 : 2; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = -0.95 + c * (1.9 / Math.max(1, cols - 1)) * (cols > 1 ? 1 : 0), z = -1.0 + (r * 2.0) / Math.max(1, rows - 1);
    k.box(0.05, 0.3, 0.05, STEEL, x, 0.1, z); k.box(cols > 2 ? 0.8 : 1.1, 0.04, 0.45, '#1d3c78', x, 0.42, z, { rx: -0.5 }); k.box(cols > 2 ? 0.82 : 1.12, 0.02, 0.47, '#4f7fd6', x, 0.445, z + 0.01, { rx: -0.5 }); }
  k.box(0.35, 0.3, 0.3, '#e8eaee', 1.2, 0.1, 1.2);
  return { group: k.build('solar'), height: 0.9 };
}
function fission(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, A = look.accent; pad(k, 4, 4);
  const pts: THREE.Vector2[] = []; for (let i = 0; i <= 12; i++) { const y = i / 12; pts.push(new THREE.Vector2(0.95 - Math.sin(y * Math.PI * 0.85) * 0.38 + y * 0.05, y * (2.2 + lf * 0.2))); }
  k.add(new THREE.LatheGeometry(pts, 18), '#d9dde2', -0.6, 0.1, -0.5); k.cyl(0.62, 0.62, 0.05, 18, A, -0.6, 1.5 + lf * 0.15, -0.5);
  k.cyl(0.6, 0.6, 0.9, 16, '#eef0f3', 1.0, 0.1, 0.8); k.sphere(0.6, '#eef0f3', 1.0, 1.0, 0.8, { theta: Math.PI / 2, w: 16 }); k.box(1.2, 0.6, 0.8, '#c9cdd3', 0.9, 0.1, -0.6); windows(k, 1.2, 0.8, 0.3, 0.14, 0.9, -0.6);
  // tiers: a second cooling tower, a turbine hall, switchyard pylons, a third tower
  if (t >= 3) { const p2: THREE.Vector2[] = []; for (let i = 0; i <= 10; i++) { const y = i / 10; p2.push(new THREE.Vector2(0.6 - Math.sin(y * Math.PI * 0.85) * 0.24 + y * 0.03, y * (1.4 + lf * 0.12))); } k.add(new THREE.LatheGeometry(p2, 16), '#d9dde2', -1.3, 0.1, 1.25); }
  if (t >= 4) { k.box(1.0, 0.45, 0.6, '#c9cdd3', 0.9, 0.1, -1.45); windows(k, 1.0, 0.6, 0.22, 0.1, 0.9, -1.45); }
  if (t >= 5) for (const x of [1.55, 1.85]) { k.box(0.05, 1.1, 0.05, STEEL, x, 0.1, 1.7); k.box(0.4, 0.04, 0.04, STEEL, x, 1.1, 1.7); }
  if (t >= 6) { const p3: THREE.Vector2[] = []; for (let i = 0; i <= 10; i++) { const y = i / 10; p3.push(new THREE.Vector2(0.55 - Math.sin(y * Math.PI * 0.85) * 0.22, y * 1.5)); } k.add(new THREE.LatheGeometry(p3, 16), '#d9dde2', 0.2, 0.1, 1.6); }
  const g = k.build('fission'); const steam = new THREE.Group(); const sm = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), sm); p.userData.o = i / 5; steam.add(p); } steam.position.set(-0.6, 2.3 + lf * 0.2, -0.5); g.add(steam);
  return { group: g, height: 3 + lf * 0.2, anim: (tt, s) => { steam.visible = s.working; steam.children.forEach((p) => { const f = (tt * 0.25 + (p.userData.o as number)) % 1; p.position.set(Math.sin(f * 7) * 0.2, f * 2.2, f * 0.6); p.scale.setScalar(0.6 + f * 1.6); }); sm.opacity = 0.45; } };
}
function depot(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, P = look.primary, A = look.accent; pad(k, 3, 3);
  const nW = Math.min(2, 1 + Math.floor(t / 3)); for (let i = 0; i < nW; i++) { const z = -0.7 + i * 0.95; k.box(1.7, 0.55, 0.8, P, -0.4, 0.1, z); k.add(new THREE.CylinderGeometry(0.4, 0.4, 1.7, 12, 1, false, 0, Math.PI), shade(P, -0.12), -0.4, 0.65, z, { rz: Math.PI / 2, sz: 1 }); k.box(0.5, 0.4, 0.04, A, -1.26, 0.1, z); }
  const nT = Math.min(3, 1 + Math.floor(t / 2)); for (let i = 0; i < nT; i++) { const z = -0.9 + i * 0.8; k.cyl(0.32, 0.32, 0.8 + lf * 0.1, 12, '#eceff2', 1.05, 0.1, z); k.cyl(0.33, 0.33, 0.05, 12, A, 1.05, 0.5, z); }
  for (let i = 0; i < 3; i++) k.box(0.25, 0.25, 0.25, ['#c98b3a', '#5b8bd6', '#c94a4a'][i], -0.9 + i * 0.32, 0.1, 1.15);
  return { group: k.build('depot'), height: 1.3 };
}
function launch(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, A = look.accent; pad(k, 6, 6, '#bfc4ca');
  k.box(2.4, 0.3, 2.4, '#9aa1a9', 0, 0.1, 0); k.box(0.9, 0.05, 2.6, '#2b2f36', 0, 0.38, 0); k.box(0.95, 0.12, 0.6, '#2b2f36', 0, 0.05, 2.6); // pad, flame trench
  const th = 2.6 + lf * 0.6; for (const [x, z] of [[-1.7, -0.55], [-1.7, 0.55], [-2.5, -0.55], [-2.5, 0.55]]) k.box(0.08, th, 0.08, '#c0392b', x, 0.1, z);
  for (let y = 0.6; y < th; y += 0.55) { k.box(0.9, 0.05, 1.18, '#c0392b', -2.1, 0.1 + y, 0); } k.box(1.0, 0.12, 1.2, '#7d838c', -2.1, 0.1 + th, 0);
  k.box(0.7, 0.06, 0.1, STEEL, -1.4, 0.1 + th * 0.75, 0); // crew access arm
  for (const [x, z] of [[2.5, 2.5], [-2.5, 2.5], [2.5, -2.5]]) { k.cyl(0.04, 0.06, th + 1.2, 5, STEEL, x, 0.1, z); k.sphere(0.06, '#ff4f4f', x, th + 1.35, z, { glow: true }); } // lightning masts
  k.cyl(0.35, 0.35, 0.5, 10, '#e9edf2', 2.3, 1.6, -2.2); k.box(0.06, 1.5, 0.06, STEEL, 2.1, 0.1, -2.0); k.box(0.06, 1.5, 0.06, STEEL, 2.5, 0.1, -2.4); // water tower
  k.box(1.2, 0.5, 0.8, A, 2.0, 0.1, 0.4); windows(k, 1.2, 0.8, 0.25, 0.12, 2.0, 0.4);
  // tiers: fuel farm, hammerhead crane, mobile service structure, pad lights, clad tower with a glass elevator
  if (t >= 2) { for (const x of [-0.6, 0.4]) { k.sphere(0.34, '#eef1f4', x, 0.5, -2.35, { w: 12, h: 8 }); k.cyl(0.05, 0.05, 0.4, 6, STEEL, x, 0.1, -2.35); } k.box(0.08, 0.08, 1.8, STEEL, -0.1, 0.25, -1.45); }
  if (t >= 3) { k.box(1.7, 0.12, 0.18, '#c0392b', -1.35, 0.25 + th, 0); k.box(0.1, 0.5, 0.1, STEEL, -0.55, th - 0.25, 0); k.box(0.7, 0.06, 0.1, STEEL, -1.4, 0.1 + th * 0.5, 0); }
  if (t >= 4) { const sh = th * 0.8; k.box(0.75, sh, 0.95, A, 1.75, 0.1, -0.7); for (let y = 0.4; y < sh; y += 0.5) k.box(0.77, 0.04, 0.97, shade(A, -0.25), 1.75, 0.1 + y, -0.7); k.box(0.04, 0.04, 1.6, '#555b63', 1.45, 0.11, -0.7); k.box(0.04, 0.04, 1.6, '#555b63', 2.05, 0.11, -0.7); }
  if (t >= 5) for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; k.box(0.12, 0.05, 0.12, '#ffe7a8', Math.cos(a) * 1.35, 0.42, Math.sin(a) * 1.35, { glow: true }); }
  if (t >= 6) { k.box(0.42, th, 0.42, '#bfe6ff', -2.1, 0.1, -0.85, { glass: true }); k.box(0.2, 0.3, 0.2, '#ffe7a8', -2.1, 0.1 + th * 0.6, -0.85, { glow: true }); for (const z of [-0.6, 0.6]) k.box(0.04, th, 0.04, A, -1.68, 0.1, z, { glow: true }); }
  return { group: k.build('launch'), height: th + 1.6 };
}
function vab(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, P = '#e6e9ed', A = look.accent; pad(k, 4, 5);
  const h = 2.6 + lf * 0.55; k.box(3.4, h, 4.2, P, 0, 0.1, 0); k.box(3.45, 0.14, 4.25, shade(P, -0.15), 0, 0.1 + h, 0);
  k.box(1.3, h - 0.3, 0.04, '#9aa3ad', 0, 0.1, 2.11); for (let y = 0.5; y < h - 0.3; y += 0.45) k.box(1.32, 0.03, 0.05, '#7c858f', 0, 0.1 + y, 2.12); // the great door
  k.box(0.05, h * 0.7, 1.4, look.banner.bg, 1.71, 0.1 + h * 0.2, -0.6); k.box(0.06, h * 0.12, 1.4, A, 1.72, 0.1 + h * 0.5, -0.6);
  k.box(1.2, 0.7, 1.6, shade(P, -0.05), -2.25, 0.1, 1.2); windows(k, 1.2, 1.6, 0.3, 0.14, -2.25, 1.2);
  // tiers: a side wing, a crawler on its track, roof cranes, a lit mission banner
  if (t >= 2) { k.box(1.1, h * 0.55, 1.6, shade(P, -0.04), -2.25, 0.1, -1.0); windows(k, 1.1, 1.6, h * 0.3, 0.14, -2.25, -1.0); }
  if (t >= 3) { k.box(1.4, 0.04, 0.9, '#6b6f75', 0, 0.11, 2.95); k.box(1.0, 0.3, 0.7, '#9aa3ad', 0, 0.15, 2.95); k.box(0.8, 0.06, 0.6, A, 0, 0.45, 2.95); }
  if (t >= 4) for (const x of [-1.2, 1.2]) { k.box(0.08, 0.7, 0.08, '#c0392b', x, 0.1 + h, -1.6); k.box(0.08, 0.08, 1.2, '#c0392b', x, 0.8 + h, -1.1); }
  if (t >= 5) k.box(0.05, h * 0.12, 1.4, '#ffe7a8', 1.73, 0.1 + h * 0.35, -0.6, { glow: true });
  return { group: k.build('vab'), height: h + 0.4 };
}
function tracking(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4; pad(k, 4, 4); k.box(1.1, 0.6, 0.9, '#d9dde2', 1.2, 0.1, 1.3); windows(k, 1.1, 0.9, 0.3, 0.12, 1.2, 1.3);
  const s = 1.1 + lf * 0.15; k.cyl(0.25, 0.4, 1.0 + lf * 0.1, 8, '#c9ced5', -0.3, 0.1, -0.3); const g = k.build('tracking');
  const dish = new THREE.Group(); const dk = new Kit(); dk.add(new THREE.SphereGeometry(s, 20, 10, 0, Math.PI * 2, 0, Math.PI / 3.4), '#f3f5f8', 0, 0, 0, { rx: Math.PI }); dk.cyl(0.03, 0.03, s * 0.8, 4, STEEL, 0, -s * 0.85, 0); dk.sphere(0.08, look.accent, 0, -s * 1.25, 0);
  const dg = dk.build(); dg.rotation.x = -0.75; dish.add(dg); dish.position.set(-0.3, 1.3 + lf * 0.1 + s * 0.4, -0.3); g.add(dish);
  for (let i = 0; i < Math.min(3, t - 1); i++) { const sk = new Kit(); sk.cyl(0.04, 0.06, 0.5, 6, STEEL, 0, 0, 0); sk.add(new THREE.SphereGeometry(0.35, 12, 6, 0, Math.PI * 2, 0, Math.PI / 3.2), '#eef2f6', 0, 0.85, 0, { rx: Math.PI - 0.7 }); const sg = sk.build(); sg.position.set(1.3 - i * 0.7, 0.1, -1.4); g.add(sg); }
  return { group: g, height: 2.4 + lf * 0.3, anim: (tt) => { dish.rotation.y = Math.sin(tt * 0.12) * 1.2; } };
}
function academy(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, P = look.primary, A = look.accent; pad(k, 4, 4);
  k.box(2.4, 0.9 + lf * 0.12, 1.4, P, -0.6, 0.1, -1.1); windows(k, 2.4, 1.4, 0.4, 0.2, -0.6, -1.1); k.box(2.45, 0.08, 1.45, A, -0.6, 1.0 + lf * 0.12, -1.1);
  k.box(1.4, 0.06, 1.0, '#4fb3e8', 1.0, 0.1, 1.0, { glass: true }); k.box(1.5, 0.1, 1.1, '#e9edf2', 1.0, 0.08, 1.0); // training pool
  // tiers: a capsule on a stand, a second wing, a rocket replica, an observatory, glowing windows
  if (t >= 2) { k.box(0.12, 0.4, 0.12, STEEL, 1.35, 0.1, -1.25); k.cyl(0.18, 0.36, 0.42, 10, '#eef0f3', 1.35, 0.5, -1.25); }
  if (t >= 3) { k.box(1.2, 0.7 + lf * 0.1, 1.2, shade(P, -0.06), -1.3, 1.0 + lf * 0.12, -1.1); k.box(1.25, 0.06, 1.25, A, -1.3, 1.7 + lf * 0.22, -1.1); }
  if (t >= 4) { k.cyl(0.14, 0.16, 1.6, 10, '#eef0f3', 1.55, 0.1, -0.2); k.cyl(0.0, 0.14, 0.35, 10, A, 1.55, 1.7, -0.2); for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; k.box(0.04, 0.3, 0.18, A, 1.55 + Math.cos(a) * 0.15, 0.1, -0.2 + Math.sin(a) * 0.15, { ry: -a }); } }
  if (t >= 5) k.sphere(0.35, '#eef2f6', 0.0, 1.0 + lf * 0.12, -1.1, { theta: Math.PI / 2, w: 14 });
  k.cyl(0.35, 0.45, 0.5, 10, '#d9dde2', -0.6, 0.1, 0.8); const g = k.build('academy');
  const arm = new THREE.Group(); const ak = new Kit(); ak.box(2.2, 0.08, 0.12, STEEL, 0, 0, 0); ak.sphere(0.2, A, 1.1, 0, 0, { w: 10, h: 7 }); ak.box(0.25, 0.25, 0.25, '#eef0f3', -1.1, -0.1, 0); arm.add(ak.build()); arm.position.set(-0.6, 0.75, 0.8); g.add(arm);
  return { group: g, height: 1.6 + lf * 0.15, anim: (tt) => { arm.rotation.y = tt * 1.6; } };
}
function workshop(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, P = look.primary, A = look.accent; pad(k, 4, 4);
  const h = 1.0 + lf * 0.12; k.box(2.8, h, 2.2, P, -0.3, 0.1, -0.4); for (let i = 0; i < 4; i++) k.add(new THREE.CylinderGeometry(0.35, 0.35, 2.2, 3, 1, false, 0, Math.PI), shade(P, -0.1), -1.35 + i * 0.7, 0.1 + h, -0.4, { rx: Math.PI / 2, rz: Math.PI / 2 }); // sawtooth roof
  windows(k, 2.8, 2.2, 0.35, 0.22, -0.3, -0.4); k.box(1.0, h - 0.2, 0.05, '#2b3340', -0.3, 0.1, 0.72); k.box(1.04, 0.08, 0.08, A, -0.3, h - 0.12, 0.73);
  for (let i = 0; i < Math.min(3, 1 + Math.floor(t / 2)); i++) { k.cyl(0.18, 0.2, 0.32, 10, '#e9edf2', 1.45, 0.1, -1.2 + i * 0.6); k.sphere(0.13, A, 1.45, 0.52, -1.2 + i * 0.6, { glow: true, w: 10, h: 7 }); } // core pods
  k.box(1.6, 0.1, 0.4, DARK, 0.4, 0.15, 1.35); const g = k.build('workshop');
  const arm = new THREE.Group(); const ak = new Kit(); ak.cyl(0.12, 0.16, 0.25, 8, '#f5c542', 0, 0, 0); ak.box(0.1, 0.8, 0.1, '#f5c542', 0, 0.25, 0); const ag = ak.build(); arm.add(ag); const fore = new THREE.Group(); const fk = new Kit(); fk.box(0.08, 0.6, 0.08, '#f5c542', 0, 0, 0); fk.sphere(0.06, '#7ff5ff', 0, 0.62, 0, { glow: true }); fore.add(fk.build()); fore.position.y = 1.0; arm.add(fore); arm.position.set(1.0, 0.1, 1.15); g.add(arm);
  return { group: g, height: h + 0.8, anim: (tt, st) => { const w = st.working ? 1 : 0.2; arm.rotation.y = Math.sin(tt * 0.9) * 1.2 * w; fore.rotation.z = -0.6 + Math.sin(tt * 1.7) * 0.5 * w; } };
}
function dock(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, A = look.accent; pad(k, 3, 3, '#c3c8cf');
  const n = Math.min(4, 2 + Math.floor(t / 2)); const rings: THREE.Mesh[] = [];
  for (let i = 0; i < n; i++) { const x = -0.9 + (i % 2) * 1.8, z = -0.7 + Math.floor(i / 2) * 1.3; k.cyl(0.42, 0.46, 0.12, 14, '#8a939e', x, 0.1, z); k.box(0.08, 0.9, 0.08, '#9aa3ad', x - 0.35, 0.1, z); k.box(0.35, 0.06, 0.06, '#9aa3ad', x - 0.18, 0.95, z); }
  k.box(2.6, 0.06, 0.2, A, 0, 1.2, 0); k.box(0.1, 1.1, 0.1, '#9aa3ad', -1.25, 0.1, 0); k.box(0.1, 1.1, 0.1, '#9aa3ad', 1.25, 0.1, 0); const g = k.build('dock');
  for (let i = 0; i < n; i++) { const x = -0.9 + (i % 2) * 1.8, z = -0.7 + Math.floor(i / 2) * 1.3; const r = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 6, 24), new THREE.MeshBasicMaterial({ color: A, toneMapped: false, transparent: true, opacity: 0.8 })); r.rotation.x = Math.PI / 2; r.position.set(x, 0.3, z); g.add(r); rings.push(r); }
  return { group: g, height: 1.4, anim: (tt) => rings.forEach((r, i) => { r.position.y = 0.25 + ((tt * 0.6 + i * 0.3) % 1) * 0.6; (r.material as THREE.MeshBasicMaterial).opacity = 0.9 - ((tt * 0.6 + i * 0.3) % 1) * 0.8; }) };
}
function cellplant(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, A = look.accent; pad(k, 3, 3);
  const rows = Math.min(3, 1 + Math.floor(t / 2)); for (let r = 0; r < rows; r++) { const z = -0.9 + r * 0.8; k.box(2.0, 0.08, 0.5, '#5b6676', -0.3, 0.1, z); for (let i = 0; i < 6; i++) { k.cyl(0.11, 0.11, 0.42, 8, '#7cf29a', -1.1 + i * 0.32, 0.18, z, { glow: true }); k.cyl(0.08, 0.08, 0.05, 8, '#e9edf2', -1.1 + i * 0.32, 0.6, z); } }
  k.box(0.7, 0.8, 0.7, '#d9dde2', 1.05, 0.1, 0.8); k.box(0.72, 0.08, 0.72, A, 1.05, 0.9, 0.8); for (let i = 0; i < 3; i++) k.cyl(0.05, 0.05, 0.3, 6, '#9aa3ad', 0.85 + i * 0.2, 0.98, 0.8);
  return { group: k.build('cellplant'), height: 1.2 };
}
function fusionlab(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, P = look.primary, A = look.accent; pad(k, 4, 4);
  for (const x of [-1.15, 1.15]) { k.cyl(0.55, 0.6, 1.1 + lf * 0.1, 12, P, x, 0.1, -0.2); k.sphere(0.55, shade(P, -0.05), x, 1.2 + lf * 0.1, -0.2, { theta: Math.PI / 2, w: 14 }); k.cyl(0.57, 0.57, 0.08, 12, A, x, 0.6, -0.2); }
  k.cyl(0.22, 0.22, 1.6, 10, '#9aa3ad', 0, 0.75, -0.2, { rz: Math.PI / 2 }); k.box(2.6, 0.5, 0.9, shade(P, -0.08), 0, 0.1, 1.2); windows(k, 2.6, 0.9, 0.22, 0.14, 0, 1.2);
  // tiers: a third containment pod, a control gallery, energy conduits
  if (t >= 3) { k.cyl(0.4, 0.45, 0.9 + lf * 0.08, 12, P, 0, 0.1, -1.35); k.sphere(0.4, shade(P, -0.05), 0, 1.0 + lf * 0.08, -1.35, { theta: Math.PI / 2, w: 12 }); k.cyl(0.42, 0.42, 0.06, 12, A, 0, 0.5, -1.35); }
  if (t >= 4) k.box(2.6, 0.3, 0.5, shade(P, -0.12), 0, 0.6, 1.2);
  if (t >= 5) for (const x of [-1.15, 1.15]) k.box(0.06, 0.06, 1.2, '#ff9be8', x, 0.15, 0.5, { glow: true });
  const g = k.build('fusionlab'); const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), new THREE.MeshBasicMaterial({ color: '#c49bff', toneMapped: false })); core.position.set(0, 1.0, -0.2); g.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 6, 28), new THREE.MeshBasicMaterial({ color: '#ff9be8', toneMapped: false })); ring.position.copy(core.position); g.add(ring);
  return { group: g, height: 1.9 + lf * 0.1, anim: (tt, st) => { const w = st.working ? 1 : 0.3; core.rotation.y = tt * 1.5; core.scale.setScalar(0.85 + Math.sin(tt * 4) * 0.12 * w); ring.rotation.x = tt * 1.1; ring.rotation.y = tt * 0.7; } };
}
// ---------------- colony buildings ----------------
const REG = '#a8a9ad'; // regolith-dusted concrete
function hub(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, P = look.primary, A = look.accent; pad(k, 5, 5, REG);
  k.cyl(1.25, 1.35, 0.9 + lf * 0.12, 10, P, 0, 0.1, 0); k.sphere(1.25, shade(P, -0.04), 0, 1.0 + lf * 0.12, 0, { theta: Math.PI / 2, w: 16, h: 8 }); k.cyl(1.37, 1.37, 0.1, 10, A, 0, 0.55, 0); windows(k, 2.3, 2.3, 0.45, 0.2);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; k.cyl(0.32, 0.32, 1.1, 10, '#d9dde2', Math.cos(a) * 1.65, 0.12, Math.sin(a) * 1.65, { rz: Math.PI / 2, ry: -a }); k.box(0.7, 0.75, 0.7, P, Math.cos(a) * 2.05, 0.1, Math.sin(a) * 2.05, { ry: -a }); k.box(0.3, 0.4, 0.04, '#2b3340', Math.cos(a) * 2.42, 0.1, Math.sin(a) * 2.42, { ry: -a + Math.PI / 2 }); } // airlock tubes
  k.cyl(0.03, 0.03, 1.6, 5, STEEL, 0.3, 1.6 + lf * 0.12, 0.2); k.sphere(0.07, '#ff4f4f', 0.3, 3.25 + lf * 0.12, 0.2, { glow: true });
  // tiers: solar wings, a ring module, an observation deck, a landing pad, a comms spire
  if (t >= 2) for (const sd of [-1, 1]) { k.box(0.06, 0.06, 1.2, STEEL, 2.15, 0.9, sd * 0.75); k.box(0.7, 0.03, 1.0, '#2c4f8a', 2.15, 0.93, sd * 0.85, { rz: 0.35 }); }
  if (t >= 3) k.add(new THREE.TorusGeometry(1.55, 0.13, 8, 28), '#d9dde2', 0, 1.05 + lf * 0.06, 0, { rx: Math.PI / 2 });
  if (t >= 4) { k.cyl(0.55, 0.6, 0.35, 12, P, 0, 2.05 + lf * 0.12, 0); k.cyl(0.57, 0.57, 0.12, 12, '#ffe7a8', 0, 2.2 + lf * 0.12, 0, { glow: true }); }
  if (t >= 5) { k.cyl(0.75, 0.75, 0.05, 20, '#5a616b', 0, 0.1, -2.05); k.add(new THREE.TorusGeometry(0.6, 0.04, 4, 24), A, 0, 0.17, -2.05, { rx: Math.PI / 2, glow: true }); }
  if (t >= 6) { k.cyl(0.04, 0.08, 2.2, 6, STEEL, -0.9, 1.4, 0.9); k.sphere(0.1, A, -0.9, 3.65, 0.9, { glow: true }); }
  const g = k.build('hub'); const dish = new THREE.Group(); const dk = new Kit(); dk.add(new THREE.SphereGeometry(0.45, 14, 6, 0, Math.PI * 2, 0, Math.PI / 3.2), '#eef2f6', 0, 0, 0, { rx: Math.PI }); const dg = dk.build(); dg.rotation.x = -0.8; dish.add(dg); dish.position.set(-0.5, 2.2 + lf * 0.12, -0.3); g.add(dish);
  return { group: g, height: 2.6 + lf * 0.12, anim: (tt) => { dish.rotation.y = tt * 0.3; } };
}
function regolith(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4; pad(k, 3, 3, '#7c7d82');
  k.add(new THREE.ConeGeometry(0.75, 0.6 + lf * 0.06, 8), '#8c8d91', -0.6, 0.4, -0.5); k.box(1.1, 0.8, 0.9, '#d9dde2', 0.6, 0.1, 0.5); windows(k, 1.1, 0.9, 0.35, 0.14, 0.6, 0.5); k.cyl(0.18, 0.22, 1.3 + lf * 0.15, 8, '#9aa3ad', 0.95, 0.1, -0.7); k.cyl(0.24, 0.24, 0.06, 8, look.accent, 0.95, 0.9, -0.7);
  k.box(0.18, 0.1, 1.3, '#3b4350', 0.0, 0.5, 0.0, { rx: -0.3, ry: 0.8 }); const g = k.build('regolith');
  const rover = new THREE.Group(); const rk = new Kit(); rk.box(0.45, 0.18, 0.3, '#f5c542', 0, 0.12, 0); rk.box(0.2, 0.18, 0.28, '#e9edf2', 0.12, 0.3, 0); for (const [x, z] of [[-0.16, 0.17], [0.16, 0.17], [-0.16, -0.17], [0.16, -0.17]]) rk.cyl(0.08, 0.08, 0.06, 8, '#2b2f36', x, 0.08, z, { rx: Math.PI / 2 }); rk.box(0.06, 0.06, 0.45, '#f5c542', -0.3, 0.25, 0, { rz: 0.5 }); rover.add(rk.build()); g.add(rover);
  return { group: g, height: 1.6 + lf * 0.15, anim: (tt, st) => { const a = st.working ? tt * 0.5 : 0; rover.position.set(Math.cos(a) * 0.9 - 0.2, 0.05, Math.sin(a) * 0.9); rover.rotation.y = -a - Math.PI / 2; } };
}
function ice(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4; pad(k, 3, 3, REG);
  k.cyl(0.5, 0.55, 0.9 + lf * 0.12, 12, '#e9f4ff', -0.6, 0.1, -0.5); k.sphere(0.5, '#cfe8ff', -0.6, 1.0 + lf * 0.12, -0.5, { theta: Math.PI / 2, w: 12 }); k.cyl(0.52, 0.52, 0.06, 12, '#4fb3e8', -0.6, 0.6, -0.5);
  k.box(1.0, 0.6, 0.8, '#d9dde2', 0.6, 0.1, 0.6); windows(k, 1.0, 0.8, 0.28, 0.12, 0.6, 0.6); k.cyl(0.08, 0.08, 1.5, 6, '#9aa3ad', 0.2, 0.32, -0.6, { rz: Math.PI / 2 }); k.box(0.5, 0.05, 0.5, '#8fd6ff', -0.6, 0.1, 0.9, { glass: true });
  for (let i = 0; i < 2 + Math.floor(t / 2); i++) k.cyl(0.14, 0.14, 0.4, 8, '#bfe6ff', 1.05, 0.1, -0.9 + i * 0.35);
  return { group: k.build('ice'), height: 1.6 + lf * 0.12 };
}
function he3x(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4; pad(k, 3, 3, '#7c7d82'); k.cyl(0.75, 0.85, 0.5, 12, '#c9ced5', -0.3, 0.1, -0.3); k.cyl(0.55, 0.65, 0.7 + lf * 0.1, 12, '#e6e9ee', -0.3, 0.6, -0.3); k.cyl(0.57, 0.57, 0.06, 12, '#b892ff', -0.3, 1.0, -0.3, { glow: true });
  k.box(0.9, 0.5, 0.6, '#d9dde2', 0.8, 0.1, 0.8); for (let i = 0; i < 3; i++) k.sphere(0.2, '#b892ff', 0.95 - i * 0.45, 0.3, -1.05, { w: 10, h: 7 });
  // tiers: a regolith hopper, a conveyor, a second distillation column, glowing storage
  if (t >= 2) { k.box(0.7, 0.55, 0.7, '#9aa3ad', -0.95, 0.1, 0.95); k.cyl(0.0, 0.38, 0.4, 4, '#7c858f', -0.95, 0.65, 0.95, { ry: Math.PI / 4, rx: Math.PI }); }
  if (t >= 3) k.box(0.16, 0.08, 1.2, '#3b4350', -0.6, 0.55, 0.35, { rx: 0.5 });
  if (t >= 4) { k.cyl(0.25, 0.3, 1.5, 10, '#e6e9ee', 0.95, 0.1, -0.2); k.cyl(0.27, 0.27, 0.05, 10, '#b892ff', 0.95, 1.4, -0.2, { glow: true }); }
  if (t >= 5) for (let i = 0; i < 3; i++) k.sphere(0.12, '#e6d4ff', 0.95 - i * 0.45, 0.55, -1.05, { glow: true });
  return { group: k.build('he3x'), height: 1.6 + lf * 0.1 };
}
function lsolar(L: number): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4; pad(k, 3, 3, '#7c7d82'); const n = Math.min(4, 2 + Math.floor(t / 2));
  for (let i = 0; i < n; i++) { const x = -0.9 + (i % 2) * 1.8, z = -0.8 + Math.floor(i / 2) * 1.6; k.cyl(0.04, 0.05, 1.1, 5, STEEL, x, 0.1, z); k.box(1.4, 0.03, 0.7, '#1d3c78', x, 1.2, z, { rx: -0.4 }); k.box(1.42, 0.015, 0.72, '#4f7fd6', x, 1.22, z + 0.01, { rx: -0.4 }); }
  return { group: k.build('lsolar'), height: 1.5 };
}
// the iconic glass dome: gardens and homes under glass
function dome(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, A = look.accent; pad(k, 4, 4, REG); const R = 1.55 + lf * 0.06;
  k.cyl(R + 0.08, R + 0.12, 0.3, 24, '#d9dde2', 0, 0.1, 0); k.cyl(R + 0.1, R + 0.1, 0.06, 24, A, 0, 0.36, 0);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const x = Math.cos(a) * R * 0.55, z = Math.sin(a) * R * 0.55; if (i % 2) { k.cyl(0.04, 0.05, 0.35, 5, '#6b4a2e', x, 0.4, z); k.sphere(0.24, '#3f9a4a', x, 0.85, z, { w: 8, h: 6 }); } else { k.box(0.4, 0.38 + (i % 3) * 0.12, 0.4, '#f1f3f5', x, 0.4, z); k.box(0.42, 0.06, 0.42, A, x, 0.78 + (i % 3) * 0.12, z); } }
  k.cyl(0.25, 0.25, 0.08, 10, '#4fb3e8', 0, 0.4, 0, { glass: true }); k.sphere(R, '#bfe6ff', 0, 0.38, 0, { theta: Math.PI / 2, w: 22, h: 10, glass: true });
  for (let i = 0; i < 6; i++) k.add(new THREE.TorusGeometry(R, 0.018, 4, 24, Math.PI), '#e9edf2', 0, 0.38, 0, { ry: (i / 6) * Math.PI }); // glazing ribs
  k.box(0.5, 0.45, 0.6, '#d9dde2', 0, 0.1, R + 0.15); k.box(0.3, 0.36, 0.04, '#2b3340', 0, 0.1, R + 0.46);
  // tiers: annex domes at the corners, glowing glazing, a spire on top
  const annex = (x: number, z: number) => { k.cyl(0.5, 0.52, 0.16, 14, '#d9dde2', x, 0.1, z); k.sphere(0.46, '#bfe6ff', x, 0.26, z, { theta: Math.PI / 2, w: 12, h: 6, glass: true }); k.sphere(0.18, '#3f9a4a', x, 0.36, z, { w: 8, h: 6 }); };
  if (t >= 2) annex(1.45, -1.45); if (t >= 3) annex(-1.45, -1.45); if (t >= 4) annex(-1.45, 1.45);
  if (t >= 5) k.add(new THREE.TorusGeometry(R + 0.12, 0.035, 4, 32), A, 0, 0.4, 0, { rx: Math.PI / 2, glow: true });
  if (t >= 6) { k.cyl(0.03, 0.06, 0.9, 6, STEEL, 0, 0.3 + R, 0); k.sphere(0.08, A, 0, 1.25 + R, 0, { glow: true }); }
  return { group: k.build('dome'), height: R + 0.5 };
}
// underground: a regolith mound over the tunnels, skylights and an airlock
function burrow(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, A = look.accent; pad(k, 4, 4, '#8a8b8f');
  k.add(new THREE.SphereGeometry(1.7, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#8f9094', 0, 0.08, 0, { sy: 0.32 }); k.add(new THREE.SphereGeometry(1.2, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#9a9b9f', 0.3, 0.1, -0.2, { sy: 0.4 });
  for (let i = 0; i < 2 + Math.floor(t / 2); i++) { const a = i * 2.1; k.cyl(0.16, 0.16, 0.05, 10, '#ffe7a8', Math.cos(a) * 0.8, 0.5 - i * 0.03, Math.sin(a) * 0.8, { glow: true }); }
  k.box(0.7, 0.55, 0.8, '#d9dde2', 0, 0.08, 1.45); k.box(0.72, 0.06, 0.82, A, 0, 0.6, 1.45); k.box(0.36, 0.42, 0.04, '#2b3340', 0, 0.08, 1.86); k.cyl(0.06, 0.06, 0.7, 6, '#9aa3ad', -0.9, 0.3, -0.6); k.cyl(0.06, 0.06, 0.55, 6, '#9aa3ad', 0.9, 0.3, 0.2);
  // tiers: vent stacks, a second entrance, a rover garage, glowing skylights, a radar mast
  if (t >= 2) for (const x of [1.3, 1.55]) { k.cyl(0.08, 0.1, 0.7, 8, '#c9ced5', x, 0.08, -1.45); k.cyl(0.1, 0.1, 0.05, 8, '#3b4350', x, 0.78, -1.45); }
  if (t >= 3) { k.box(0.6, 0.5, 0.7, '#d9dde2', -1.55, 0.08, 0.3); k.box(0.62, 0.06, 0.72, A, -1.55, 0.58, 0.3); k.box(0.04, 0.36, 0.3, '#2b3340', -1.86, 0.08, 0.3); }
  if (t >= 4) { k.box(0.9, 0.45, 0.6, '#b8bcc2', 1.3, 0.08, 1.35); k.box(0.5, 0.18, 0.32, A, 1.3, 0.12, 0.95); for (const x of [1.12, 1.48]) k.cyl(0.07, 0.07, 0.06, 8, '#2b2f36', x, 0.1, 0.95, { rz: Math.PI / 2 }); }
  if (t >= 5) k.add(new THREE.TorusGeometry(1.35, 0.03, 4, 32), '#ffe7a8', 0.1, 0.42, -0.1, { rx: Math.PI / 2, glow: true });
  if (t >= 6) { k.cyl(0.04, 0.05, 1.2, 6, STEEL, -1.4, 0.08, -1.4); k.add(new THREE.SphereGeometry(0.3, 12, 5, 0, Math.PI * 2, 0, Math.PI / 3.2), '#eef2f6', -1.4, 1.3, -1.4, { rx: Math.PI - 0.7 }); }
  return { group: k.build('burrow'), height: 1.0 };
}
function llab(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, P = look.primary, A = look.accent; pad(k, 4, 4, REG); k.box(2.2, 0.9 + lf * 0.1, 1.4, P, -0.5, 0.1, 0.6); windows(k, 2.2, 1.4, 0.4, 0.2, -0.5, 0.6); k.box(2.25, 0.08, 1.45, A, -0.5, 1.0 + lf * 0.1, 0.6);
  // tiers: a sample greenhouse, a second lab block, a glass atrium, glowing instruments
  if (t >= 2) { k.box(0.9, 0.5, 0.9, '#bfe6ff', -1.4, 0.1, -1.0, { glass: true }); k.box(0.8, 0.05, 0.8, '#3f9a4a', -1.4, 0.12, -1.0); }
  if (t >= 3) { k.box(1.0, 0.7 + lf * 0.1, 0.9, shade(P, -0.06), 1.2, 0.1, 1.2); windows(k, 1.0, 0.9, 0.35, 0.14, 1.2, 1.2); }
  if (t >= 4) k.box(0.9, 0.6, 0.6, '#bfe6ff', -0.5, 1.05 + lf * 0.1, 0.6, { glass: true });
  if (t >= 5) k.box(2.25, 0.05, 0.05, '#7fe4ff', -0.5, 0.6, 1.33, { glow: true });
  const g = k.build('llab'); const dish = new THREE.Group(); const dk = new Kit(); dk.add(new THREE.SphereGeometry(0.9, 18, 8, 0, Math.PI * 2, 0, Math.PI / 3.2), '#f3f5f8', 0, 0, 0, { rx: Math.PI }); dk.cyl(0.25, 0.35, 0.6, 8, '#c9ced5', 0, -1.3, 0); const dg = dk.build(); dg.rotation.x = -0.7; dish.add(dg); dish.position.set(1.0, 1.4, -0.9); g.add(dish);
  return { group: g, height: 2.2, anim: (tt) => { dish.rotation.y = Math.sin(tt * 0.1) * 1.5; } };
}
function greenhouse(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4; pad(k, 4, 3, REG); const n = Math.min(3, 1 + Math.floor(t / 2));
  for (let i = 0; i < n; i++) { const z = -0.9 + i * 0.9; k.add(new THREE.CylinderGeometry(0.4, 0.4, 3.2, 12, 1, false, 0, Math.PI), '#bfe6ff', 0, 0.12, z, { rz: Math.PI / 2, ry: Math.PI / 2, glass: true }); k.box(3.1, 0.12, 0.7, '#5b3a22', 0, 0.12, z); for (let x = -1.3; x <= 1.3; x += 0.32) k.sphere(0.12, x % 0.64 ? '#4fcf5a' : '#7cf29a', x, 0.3, z, { w: 6, h: 4 }); k.box(3.15, 0.04, 0.05, '#ff9be8', 0, 0.5, z, { glow: true }); }
  return { group: k.build('greenhouse'), height: 0.9 };
}
// spirulina tanks under grow-lights: tall glowing-green cylinders, a pump house and pipes
function algae(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4; pad(k, 3, 3, REG); const n = Math.min(4, 2 + Math.floor(t / 2)); const pos: [number, number][] = [[-0.7, -0.6], [0.7, -0.6], [-0.7, 0.7], [0.7, 0.7]];
  for (let i = 0; i < n; i++) { const [x, z] = pos[i], h = 1.0 + lf * 0.08; k.cyl(0.42, 0.42, 0.1, 14, '#c9ced5', x, 0.1, z); k.cyl(0.36, 0.36, h, 14, '#4fdc6a', x, 0.2, z, { glow: true }); k.cyl(0.4, 0.4, h + 0.02, 14, '#bfe6ff', x, 0.19, z, { glass: true }); k.cyl(0.42, 0.42, 0.08, 14, '#c9ced5', x, 0.2 + h, z); }
  k.box(0.5, 0.45, 0.5, '#d9dde2', 0, 0.1, 0); k.box(0.52, 0.05, 0.52, look.accent, 0, 0.55, 0); k.box(1.4, 0.06, 0.06, '#9aa3ad', 0, 0.5, -0.6); k.box(1.4, 0.06, 0.06, '#9aa3ad', 0, 0.5, 0.7); k.box(0.06, 0.06, 1.3, '#9aa3ad', 0, 0.45, 0.05);
  const g = k.build('algae'); const bub = new THREE.Group(); const bm = new THREE.MeshBasicMaterial({ color: '#d8ffe0', transparent: true, opacity: 0.6, depthWrite: false });
  for (let i = 0; i < n * 3; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), bm); const [x, z] = pos[i % n]; b.position.set(x + ((i * 37) % 7 - 3) * 0.05, 0.3, z + ((i * 53) % 7 - 3) * 0.05); b.userData.ph = i * 0.37; bub.add(b); } g.add(bub);
  const top = 1.0 + lf * 0.08; return { group: g, height: top + 0.35, anim: (tt) => { for (const b of bub.children) b.position.y = 0.3 + ((tt * 0.35 + b.userData.ph) % 1) * top; } };
}
// fields under the surface: skylights glowing with LED sunlight over rows of green, a ramp down and air vents
function deepfarm(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, A = look.accent; pad(k, 4, 4, '#8a8b8f'); k.box(3.5, 0.18, 3.1, '#9a9b9f', 0, 0.08, -0.25);
  const rows = 2 + Math.min(2, Math.floor(t / 2)); for (let i = 0; i < rows; i++) { const z = -1.3 + i * (2.2 / Math.max(1, rows - 1)); k.box(3.0, 0.03, 0.42, '#fff2c0', 0, 0.26, z, { glow: true }); k.box(3.04, 0.05, 0.5, '#bfe6ff', 0, 0.27, z, { glass: true }); for (let x = -1.35; x <= 1.36; x += 0.3) k.box(0.18, 0.04, 0.3, i % 2 ? '#7cf29a' : '#4fcf5a', x, 0.29, z); }
  k.box(0.9, 0.08, 0.9, '#6b6f75', 1.2, 0.08, 1.45, { rx: -0.18 }); k.box(0.92, 0.35, 0.1, '#d9dde2', 1.2, 0.08, 1.0); k.box(0.94, 0.05, 0.12, A, 1.2, 0.43, 1.0);
  for (const x of [-1.4, -0.9]) { k.cyl(0.1, 0.12, 0.6 + lf * 0.05, 8, '#c9ced5', x, 0.08, 1.45); k.cyl(0.12, 0.12, 0.05, 8, '#3b4350', x, 0.68 + lf * 0.05, 1.45); }
  return { group: k.build('deepfarm'), height: 0.9 };
}
function reactor(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4; pad(k, 3, 3, REG); k.add(new THREE.SphereGeometry(1.0, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), '#8f9094', 0, 0.08, 0, { sy: 0.45 }); k.cyl(0.35, 0.4, 0.7 + lf * 0.08, 10, '#e6e9ee', 0, 0.4, 0); k.cyl(0.37, 0.37, 0.06, 10, '#7fe4ff', 0, 0.9, 0, { glow: true });
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; k.box(0.5, 0.04, 0.9, '#9aa3ad', Math.cos(a) * 1.1, 0.2, Math.sin(a) * 1.1, { ry: -a }); } // radiator fins
  k.box(0.06, 0.4, 0.06, '#f5c542', 1.2, 0.1, 1.2); k.box(0.3, 0.3, 0.02, '#f5c542', 1.2, 0.5, 1.2);
  // tiers: more radiator fins, a second containment dome, glowing coolant loops
  if (t >= 2) for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + Math.PI / 3; k.box(0.45, 0.04, 0.75, '#9aa3ad', Math.cos(a) * 1.05, 0.3, Math.sin(a) * 1.05, { ry: -a }); }
  if (t >= 3) { k.add(new THREE.SphereGeometry(0.42, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#a3a5ab', -1.05, 0.08, 1.05, { sy: 0.7 }); }
  if (t >= 4) k.add(new THREE.TorusGeometry(0.6, 0.04, 6, 24), '#7fe4ff', 0, 0.62, 0, { rx: Math.PI / 2, glow: true });
  if (t >= 5) k.cyl(0.39, 0.39, 0.06, 10, '#ffe7a8', 0, 0.7 + lf * 0.08, 0, { glow: true });
  return { group: k.build('reactor'), height: 1.4 };
}
// ---- the Defence Council ----
const ARMOR = (t: number) => ['#9aa3ad', '#8f99a6', '#7d8a99', '#5f6f82', '#4a5a70', '#3a4a66'][t - 1];
// the Tactics Centre: a low bunker, a glowing holotable seen through the roof light, an aerial and the Council's flag
function warroom(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, P = look.primary, A = look.accent; pad(k, 3, 3);
  k.box(2.5, 0.75 + lf * 0.06, 2.3, shade(P, -0.08), 0, 0.1, 0); k.box(2.56, 0.08, 2.36, A, 0, 0.85 + lf * 0.06, 0); k.box(1.1, 0.06, 1.0, '#7fe4ff', -0.3, 0.9 + lf * 0.06, 0.1, { glow: true });
  k.box(0.6, 0.5, 0.06, '#2b3340', 0, 0.1, 1.16); k.box(0.66, 0.08, 0.1, '#ff5a6a', 0, 0.62, 1.18, { glow: true }); for (const x of [-0.95, 0.95]) k.box(0.3, 0.2, 2.4, ARMOR(t), x, 0.1, 0);
  k.cyl(0.03, 0.04, 1.6 + lf * 0.15, 5, STEEL, 0.9, 0.9, -0.8); k.sphere(0.06, '#ff5a6a', 0.9, 2.55 + lf * 0.15, -0.8, { glow: true });
  // tiers: a radar dome, a sensor array, armoured shutters
  if (t >= 2) k.add(new THREE.SphereGeometry(0.32, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#eef2f6', 0.75, 0.85 + lf * 0.06, 0.75);
  if (t >= 3) for (const z of [-0.6, -0.3, 0]) k.box(0.05, 0.4, 0.2, STEEL, -1.1, 0.95 + lf * 0.06, z);
  if (t >= 4) k.box(2.56, 0.12, 0.08, ARMOR(t), 0, 0.5, 1.2);
  const g = k.build('warroom'); const holo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), new THREE.MeshBasicMaterial({ color: '#7fe4ff', wireframe: true, transparent: true, opacity: 0.8, toneMapped: false })); holo.position.set(-0.3, 1.35 + lf * 0.06, 0.1); g.add(holo);
  return { group: g, height: 1.8 + lf * 0.15, anim: (tt) => { holo.rotation.y = tt * 0.8; holo.rotation.x = tt * 0.3; holo.position.y = 1.35 + lf * 0.06 + Math.sin(tt * 1.6) * 0.06; } };
}
// twin cannons on a fast-swinging turret
function turret(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, A = look.accent; pad(k, 2, 2, '#8a929c'); k.cyl(0.7, 0.8, 0.35, 8, ARMOR(t), 0, 0.1, 0); k.cyl(0.72, 0.72, 0.05, 8, A, 0, 0.45, 0);
  const g = k.build('turret'); const head = new THREE.Group(); const hk = new Kit(); hk.cyl(0.42, 0.48, 0.32, 8, shade(ARMOR(t), 0.12), 0, 0, 0); hk.box(0.5, 0.26, 0.5, shade(ARMOR(t), 0.05), 0, 0.05, -0.05);
  for (const x of [-0.13, 0.13]) { hk.cyl(0.05, 0.06, 0.75 + lf * 0.04, 6, '#3b4350', x, 0.18, 0.45, { rx: Math.PI / 2 }); hk.cyl(0.065, 0.065, 0.06, 6, A, x, 0.18, 0.82 + lf * 0.04, { rx: Math.PI / 2 }); }
  hk.box(0.12, 0.08, 0.04, '#ff5a6a', 0, 0.3, 0.2, { glow: true }); head.add(hk.build()); head.position.y = 0.5; g.add(head);
  return { group: g, height: 1.2, head, anim: (tt) => { head.rotation.y = Math.sin(tt * 0.5) * 1.2; } };
}
// a beam projector: a lens on a gimbal, glowing when charged
function laserBattery(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, A = look.accent; pad(k, 2, 2, '#8a929c'); k.box(1.3, 0.4, 1.3, ARMOR(t), 0, 0.1, 0); k.box(1.34, 0.05, 1.34, A, 0, 0.5, 0); for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) k.box(0.18, 0.12, 0.18, '#7fe4ff', x, 0.5, z, { glow: true });
  const g = k.build('laser'); const head = new THREE.Group(); const hk = new Kit(); hk.cyl(0.26, 0.32, 0.4, 10, '#d9dde2', 0, 0, 0); hk.cyl(0.2, 0.28, 0.9 + lf * 0.05, 10, shade(ARMOR(t), 0.15), 0, 0.3, 0.2, { rx: Math.PI / 2.6 }); hk.cyl(0.17, 0.17, 0.05, 12, '#9ff3ff', 0, 0.55, 0.62 + lf * 0.03, { rx: Math.PI / 2.6, glow: true });
  head.add(hk.build()); head.position.y = 0.55; g.add(head); return { group: g, height: 1.5, head, anim: (tt) => { head.rotation.y = tt * 0.3; } };
}
// a squat silo with sliding hatches and missile noses peeking out
function missileSilo(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, A = look.accent; pad(k, 3, 3, '#8a929c'); k.box(2.3, 0.55, 2.3, ARMOR(t), 0, 0.1, 0); k.box(2.36, 0.06, 2.36, A, 0, 0.65, 0);
  const n = Math.min(4, 2 + Math.floor(t / 2)); for (let i = 0; i < 4; i++) { const x = i % 2 ? 0.5 : -0.5, z = i < 2 ? -0.5 : 0.5; k.box(0.75, 0.04, 0.75, '#2b3340', x, 0.66, z); if (i < n) { k.cyl(0.13, 0.13, 0.35, 8, '#eef0f3', x, 0.6, z); k.add(new THREE.ConeGeometry(0.13, 0.25, 8), '#ff5a6a', x, 1.08, z); } }
  k.box(0.08, 0.5, 0.08, STEEL, 1.05, 0.7, -1.05); k.box(0.3, 0.2, 0.05, '#f5c542', 1.05, 1.15, -1.05);
  const g = k.build('missile'); const head = new THREE.Group(); g.add(head); return { group: g, height: 1.4, head };
}
// a pylon wrapped in coils with a faint dome that pulses
function shieldGen(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, A = look.accent; pad(k, 3, 3, '#8a929c'); k.cyl(0.9, 1.05, 0.35, 10, ARMOR(t), 0, 0.1, 0); k.cyl(0.25, 0.4, 1.6 + lf * 0.1, 8, '#d9dde2', 0, 0.45, 0);
  for (let y = 0.7; y < 1.9 + lf * 0.1; y += 0.35) k.add(new THREE.TorusGeometry(0.42, 0.06, 6, 16), '#9ff3ff', 0, y, 0, { rx: Math.PI / 2, glow: true }); k.sphere(0.22, A, 0, 2.15 + lf * 0.1, 0);
  const g = k.build('shield'); const dome = new THREE.Mesh(new THREE.SphereGeometry(1.45, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#7fe4ff', transparent: true, opacity: 0.12, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); dome.position.y = 0.1; g.add(dome);
  return { group: g, height: 2.5, anim: (tt) => { (dome.material as THREE.MeshBasicMaterial).opacity = 0.08 + Math.sin(tt * 2) * 0.04; dome.scale.setScalar(1 + Math.sin(tt * 2) * 0.02); } };
}
// a Tesla-style tower: a coil column under a crackling crown
function empTower(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, A = look.accent; pad(k, 2, 2, '#8a929c'); k.cyl(0.55, 0.7, 0.3, 8, ARMOR(t), 0, 0.1, 0); const h = 1.7 + lf * 0.12; k.cyl(0.14, 0.22, h, 8, '#c9cdd3', 0, 0.4, 0);
  for (let y = 0.6; y < h; y += 0.22) k.cyl(0.26 - y * 0.03, 0.26 - y * 0.03, 0.05, 10, '#b87333', 0, 0.4 + y, 0); k.add(new THREE.TorusGeometry(0.42, 0.1, 8, 18), '#d9dde2', 0, 0.45 + h, 0, { rx: Math.PI / 2 }); k.box(0.1, 0.06, 0.1, A, 0.55, 0.1, 0.55);
  const g = k.build('emp'); const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), new THREE.MeshBasicMaterial({ color: '#c9b6ff', toneMapped: false })); orb.position.y = 0.45 + h; g.add(orb);
  return { group: g, height: h + 0.8, anim: (tt) => { orb.scale.setScalar(0.8 + Math.abs(Math.sin(tt * 5)) * 0.5); } };
}
// a wall block: concrete, then steel, then energy-lined as it levels up
function wall(L: number): Model { const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4; const col = ['#c9c4b8', '#b0b6be', '#8f99a6', '#6f7f94', '#5a6b84', '#3e4c66'][t - 1];
  k.box(0.98, 0.62 + lf * 0.04, 0.98, col, 0, 0, 0); k.box(1.0, 0.07, 1.0, shade(col, 0.12), 0, 0.62 + lf * 0.04, 0); if (t >= 4) k.box(1.0, 0.05, 1.0, '#7fe4ff', 0, 0.3, 0, { glow: true });
  return { group: k.build('wall'), height: 0.8 }; }
// rising puffs (steam, vented gas): a few soft spheres that loop upward and fade
function plume(color: string, n: number, h: number, size: number) { const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false });
  for (let i = 0; i < n; i++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1), m.clone()); p.userData.o = i / n; g.add(p); }
  const step = (tt: number, on: boolean) => { g.visible = on; g.children.forEach((p) => { const f = (tt * 0.22 + (p.userData.o as number)) % 1; p.position.set(Math.sin(f * 6 + (p.userData.o as number) * 9) * 0.15, f * h, f * 0.4); p.scale.setScalar(0.5 + f * 1.4); ((p as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - f); }); };
  return { g, step };
}
// Venus: intake booms that dangle into the clouds below, a compressor, acid-crackers and water tanks; the turbine spins
function skimmer(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, A = look.accent; pad(k, 3, 3, '#d8d2c2');
  k.cyl(0.55, 0.62, 0.6, 12, '#ece6d4', -0.55, 0.1, -0.5); k.cyl(0.57, 0.57, 0.06, 12, A, -0.55, 0.7, -0.5); k.sphere(0.55, '#f4efe2', -0.55, 0.72, -0.5, { theta: Math.PI / 2, w: 12 });
  for (let i = 0; i < 2; i++) { k.cyl(0.24, 0.24, 0.8 + lf * 0.08, 10, '#9fd3ff', 0.75, 0.1, -0.75 + i * 0.6, { glass: true }); k.cyl(0.26, 0.26, 0.05, 10, '#e9edf2', 0.75, 0.88 + lf * 0.08, -0.75 + i * 0.6); }
  k.box(1.6, 0.09, 0.09, '#c9ced5', 0.1, 0.55, 0.8); for (const x of [-0.6, 0.8]) k.cyl(0.07, 0.07, 0.55, 6, '#c9ced5', x, 0.1, 0.8); // pipe rack
  const mh = 1.5 + lf * 0.2; k.cyl(0.06, 0.09, mh, 6, '#dfe3e8', -1.0, 0.1, 0.75); k.box(0.3, 0.2, 0.3, A, -1.0, 0.1 + mh, 0.75);
  const g = k.build('skimmer'); const rot = new THREE.Group(); const rk = new Kit(); for (let i = 0; i < 3; i++) rk.box(0.07, 0.02, 0.62, '#f6f8fb', 0, 0, 0.31, { ry: (i / 3) * Math.PI * 2 }); const rg = rk.build(); rg.rotation.x = Math.PI / 2; rot.add(rg); rot.position.set(-1.0, 0.25 + mh, 0.95); g.add(rot);
  return { group: g, height: mh + 0.6, anim: (tt, s) => { rot.rotation.z = tt * (s.working ? 4 : 0.6); } };
}
// Venus: a glass pavilion on the city's edge, palm courts inside and a pleasure balloon tethered above
function resort(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, A = look.accent; pad(k, 4, 4, '#e6e0d0'); const R = 1.35 + lf * 0.05;
  k.cyl(R + 0.1, R + 0.15, 0.25, 20, '#f6f2e8', 0, 0.1, 0); k.cyl(R, R, 0.7 + lf * 0.06, 20, '#9fd3ff', 0, 0.35, 0, { glass: true }); k.cyl(R + 0.08, R + 0.08, 0.1, 20, A, 0, 1.05 + lf * 0.06, 0); k.add(new THREE.ConeGeometry(R + 0.1, 0.45, 20), '#fbf8f0', 0, 1.35 + lf * 0.06, 0);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3; const x = Math.cos(a) * R * 0.55, z = Math.sin(a) * R * 0.55; k.cyl(0.03, 0.04, 0.45, 5, '#8a6a44', x, 0.35, z); k.sphere(0.2, '#4fcf5a', x, 0.85, z, { w: 7, h: 5 }); }
  k.box(0.04, 0.04, 0.04, '#ffe7a8', 0, 0.5, 0, { glow: true }); k.cyl(0.25, 0.25, 0.05, 12, '#ffe7a8', 0, 0.36, 0, { glow: true });
  const g = k.build('resort'); const bal = new THREE.Group(); const bk = new Kit(); bk.sphere(0.55, '#ffd36a', 0, 0, 0, { w: 14, h: 10 }); bk.sphere(0.56, '#ff8a5b', 0, 0, 0, { w: 14, h: 10, theta: 0.5 }); bk.box(0.22, 0.14, 0.22, '#8a6a44', 0, -0.85, 0); bk.cyl(0.006, 0.006, 0.4, 3, '#555', 0, -0.72, 0);
  bal.add(bk.build()); bal.position.set(R * 0.7, 3.0, -R * 0.6); g.add(bal); const tether = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.6, 3), new THREE.MeshBasicMaterial({ color: '#cfd3d8' })); tether.position.set(R * 0.7, 1.4, -R * 0.6); g.add(tether);
  return { group: g, height: 2.6, anim: (tt) => { bal.position.y = 3.0 + Math.sin(tt * 0.8) * 0.12; bal.rotation.y = tt * 0.2; } };
}
// changing a world: cracking towers venting greenhouse gas, a control block and a dish talking to the mirror fleets
function terraformer(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, P = look.primary, A = look.accent; pad(k, 4, 4, REG);
  k.box(2.0, 0.9, 1.3, P, -0.7, 0.1, 0.9); windows(k, 2.0, 1.3, 0.4, 0.2, -0.7, 0.9); k.box(2.05, 0.08, 1.35, A, -0.7, 1.0, 0.9);
  const n = Math.min(3, 1 + Math.floor(t / 2)), sh = 2.2 + lf * 0.3; for (let i = 0; i < n; i++) { const x = -1.2 + i * 0.85, z = -0.8; k.cyl(0.26, 0.38, sh, 10, '#d9dde2', x, 0.1, z); for (let y = 0.5; y < sh - 0.2; y += 0.6) k.cyl(0.3, 0.3, 0.05, 10, A, x, 0.1 + y, z); k.cyl(0.27, 0.27, 0.06, 10, '#ff8a3c', x, 0.1 + sh, z, { glow: true }); }
  const g = k.build('terraformer'); const plumes = Array.from({ length: n }, (_, i) => { const p = plume('#f7e4c8', 5, 2.6, 0.32); p.g.position.set(-1.2 + i * 0.85, 0.2 + sh, -0.8); g.add(p.g); return p; });
  const dish = new THREE.Group(); const dk = new Kit(); dk.add(new THREE.SphereGeometry(0.55, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3.2), '#f3f5f8', 0, 0, 0, { rx: Math.PI }); dk.cyl(0.08, 0.12, 0.6, 6, '#c9ced5', 0, -0.9, 0); const dg = dk.build(); dg.rotation.x = -0.9; dish.add(dg); dish.position.set(1.1, 1.0, 0.9); g.add(dish);
  return { group: g, height: sh + 0.8, anim: (tt, s) => { plumes.forEach((p, i) => p.step(tt + i * 0.37, s.working)); dish.rotation.y = tt * 0.15; } };
}
// Ceres: the control tower for a thousand mining tugs, with a pad and a tug resting on it
function beltControl(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, P = look.primary, A = look.accent; pad(k, 4, 4, REG); const th = 1.8 + lf * 0.25;
  k.cyl(0.42, 0.55, th, 10, P, -0.9, 0.1, -0.9); k.cyl(0.75, 0.6, 0.45, 10, '#d9dde2', -0.9, 0.1 + th, -0.9); k.cyl(0.76, 0.76, 0.14, 10, WIN, -0.9, 0.22 + th, -0.9, { glow: true }); k.cyl(0.78, 0.78, 0.05, 10, A, -0.9, 0.55 + th, -0.9);
  k.cyl(1.0, 1.0, 0.06, 16, '#6a6e76', 0.7, 0.1, 0.7); k.add(new THREE.RingGeometry(0.75, 0.85, 16), '#f5c542', 0.7, 0.17, 0.7, { rx: -Math.PI / 2 }); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.78; k.box(0.08, 0.05, 0.08, '#ff5a6a', 0.7 + Math.cos(a) * 1.0, 0.16, 0.7 + Math.sin(a) * 1.0, { glow: true }); }
  k.box(0.8, 0.32, 0.5, '#eef0f3', 0.7, 0.2, 0.7); k.box(0.3, 0.2, 0.52, '#3b4350', 1.0, 0.36, 0.7); for (const s of [-1, 1]) k.box(0.1, 0.18, 0.62, '#9aa3ad', 0.45 + s * 0.3, 0.12, 0.7);
  const g = k.build('beltControl'); const radar = new THREE.Group(); const rk = new Kit(); rk.box(0.9, 0.22, 0.05, '#f3f5f8', 0, 0, 0); rk.cyl(0.03, 0.03, 0.3, 5, STEEL, 0, -0.3, 0); radar.add(rk.build()); radar.position.set(-0.9, 0.95 + th, -0.9); g.add(radar);
  return { group: g, height: th + 1.2, anim: (tt) => { radar.rotation.y = tt * 1.4; } };
}
// Titan: spherical methane tanks, a pump house, pipework and a flare that burns off the excess
function methane(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, A = look.accent; pad(k, 3, 3, '#8a7a66');
  for (let i = 0; i < Math.min(3, 1 + Math.floor(t / 2)); i++) { const x = -0.75 + i * 0.75, z = -0.6; k.sphere(0.38, '#eceef1', x, 0.62, z, { w: 14, h: 10 }); for (const s of [-1, 1]) k.cyl(0.03, 0.03, 0.42, 4, STEEL, x + s * 0.25, 0.1, z); }
  k.box(1.1, 0.5, 0.7, '#c9cdd3', -0.4, 0.1, 0.65); k.box(1.12, 0.05, 0.72, A, -0.4, 0.6, 0.65); k.box(0.09, 0.09, 1.5, '#9aa3ad', 0.65, 0.3, 0.1);
  const fh = 1.6 + lf * 0.15; k.cyl(0.05, 0.07, fh, 6, '#b8bec6', 1.05, 0.1, 0.8); const g = k.build('methane');
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 7), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.85, toneMapped: false })); flame.position.set(1.05, 0.3 + fh, 0.8); g.add(flame);
  return { group: g, height: fh + 0.6, anim: (tt, s) => { flame.visible = s.working; flame.scale.set(1, 0.8 + Math.sin(tt * 11) * 0.25 + Math.sin(tt * 6.1) * 0.15, 1); } };
}
function massDriver(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4; pad(k, 2, 7, REG); for (let i = 0; i < 7; i++) { const z = -3 + i; const h = 0.3 + i * 0.14; k.box(0.12, h, 0.12, '#9aa3ad', -0.5, 0.1, z); k.box(0.12, h, 0.12, '#9aa3ad', 0.5, 0.1, z); k.box(1.1, 0.06, 0.12, '#9aa3ad', 0, 0.1 + h, z); }
  k.box(0.5, 0.08, 7, '#3b4350', 0, 0.42, 0, { rx: -0.14 }); for (let i = 0; i < 7; i++) k.box(0.7, 0.05, 0.08, '#7fe4ff', 0, 0.48 + i * 0.14, -3 + i, { glow: true }); k.box(0.9, 0.5, 0.8, '#d9dde2', 0, 0.1, -3.1);
  // tiers: capacitor banks along the track, accent coil rings, a second launch rail
  const banks = Math.min(6, (t - 1) * 2); for (let i = 0; i < banks; i++) { k.box(0.35, 0.35, 0.5, '#c9ced5', 0.75, 0.1, -2.6 + i * 0.95); k.box(0.36, 0.05, 0.51, '#7fe4ff', 0.75, 0.45, -2.6 + i * 0.95, { glow: true }); }
  if (t >= 3) for (let i = 0; i < 7; i++) k.add(new THREE.TorusGeometry(0.42, 0.04, 6, 16), look.accent, 0, 0.62 + i * 0.14, -3 + i, { glow: true });
  if (t >= 4) k.box(0.18, 0.06, 6.6, '#5a616b', -0.75, 0.32, 0.2, { rx: -0.14 });
  return { group: k.build('massDriver'), height: 1.4 };
}
function fusionPlant(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, A = look.accent; pad(k, 4, 4); k.add(new THREE.TorusGeometry(1.0, 0.38, 10, 24), '#d9dde2', 0, 0.6, 0, { rx: Math.PI / 2 }); k.cyl(0.62, 0.62, 0.7, 14, '#c9ced5', 0, 0.25, 0); k.add(new THREE.TorusGeometry(1.0, 0.1, 6, 24), A, 0, 0.98, 0, { rx: Math.PI / 2, glow: true });
  // tiers: a second torus, magnet coils, a cooling tower, a plasma column, a floating containment ring
  if (t >= 2) k.add(new THREE.TorusGeometry(0.62, 0.16, 8, 20), '#c9ced5', 0, 1.2, 0, { rx: Math.PI / 2 });
  if (t >= 3) for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; k.box(0.32, 0.9, 0.32, '#8f99a6', Math.cos(a) * 1.45, 0.1, Math.sin(a) * 1.45); k.box(0.34, 0.08, 0.34, A, Math.cos(a) * 1.45, 0.55, Math.sin(a) * 1.45, { glow: true }); }
  if (t >= 4) { k.cyl(0.38, 0.5, 1.4, 14, '#d9dde2', -1.45, 0.1, 1.35); k.cyl(0.4, 0.4, 0.05, 14, A, -1.45, 1.3, 1.35); }
  if (t >= 5) k.cyl(0.08, 0.08, 1.4, 8, '#e6c8ff', 0, 1.1, 0, { glow: true });
  k.box(1.2, 0.8, 0.8, '#e6e9ee', 0.9, 0.1, 1.3); windows(k, 1.2, 0.8, 0.35, 0.14, 0.9, 1.3); const g = k.build('fusion');
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), new THREE.MeshBasicMaterial({ color: '#c49bff', toneMapped: false })); core.position.y = 1.15; g.add(core);
  return { group: g, height: 1.6, anim: (tt, st) => { core.scale.setScalar(0.8 + (st.working ? Math.sin(tt * 6) * 0.2 : 0)); } };
}
// unknown types (later parts) get a placeholder block so the base never breaks
// the space elevator: an anchor station and a ribbon rising out of sight; a climber rides it; higher tiers add anchor
// pylons, a second ribbon, a counterweight glow and a climber dock
function elevator(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, P = look.primary, A = look.accent; pad(k, 4, 4); k.cyl(1.25, 1.45, 0.5, 8, '#c9ced5', 0, 0.1, 0); k.cyl(0.9, 1.0, 0.7 + lf * 0.12, 8, P, 0, 0.6, 0); k.cyl(0.92, 0.92, 0.06, 8, A, 0, 1.0, 0); windows(k, 1.6, 1.6, 0.85, 0.12);
  const rh = 9 + lf * 1.5; k.box(0.06, rh, 0.02, '#e9edf2', 0, 1.3, 0, { glow: true }); if (t >= 3) k.box(0.06, rh, 0.02, '#e9edf2', 0.18, 1.3, 0, { glow: true });
  for (let i = 0; i < Math.min(4, t); i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; k.box(0.18, 1.0 + lf * 0.15, 0.18, '#9aa3ad', Math.cos(a) * 1.55, 0.1, Math.sin(a) * 1.55); k.box(0.2, 0.06, 0.2, A, Math.cos(a) * 1.55, 1.1 + lf * 0.15, Math.sin(a) * 1.55, { glow: true }); }
  if (t >= 4) { k.box(1.0, 0.5, 0.8, shade(P, -0.08), 1.2, 0.1, -1.3); windows(k, 1.0, 0.8, 0.25, 0.12, 1.2, -1.3); }
  if (t >= 5) k.add(new THREE.TorusGeometry(0.5, 0.05, 6, 20), A, 0, 2.2, 0, { rx: Math.PI / 2, glow: true });
  const g = k.build('elevator'); const climber = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.34), new THREE.MeshStandardMaterial({ color: A, metalness: 0.4, roughness: 0.4 })); g.add(climber);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff2b0', toneMapped: false })); glow.position.y = 1.3 + rh; g.add(glow);
  return { group: g, height: 3, anim: (tt, st) => { const f = (tt * (st.working ? 0.08 : 0.03)) % 1; climber.position.set(0, 1.5 + f * (rh - 0.5), 0); } };
}
// the Casimir foundry: vacuum chambers stacked with nanometre plates, glowing faintly with exotic matter; more chambers
// and a containment ring with each tier
function casimir(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, P = look.primary, A = look.accent; pad(k, 4, 4); k.box(3.2, 0.5, 2.0, shade(P, -0.06), 0, 0.1, 0.8); windows(k, 3.2, 2.0, 0.25, 0.12, 0, 0.8);
  const n = Math.min(5, 1 + t); for (let i = 0; i < n; i++) { const x = -1.3 + i * (2.6 / Math.max(1, n - 1)); const h = 0.9 + (i % 2) * 0.25 + lf * 0.08; k.cyl(0.3, 0.3, h, 10, '#d9dde2', x, 0.1, -0.9); for (let y = 0.25; y < h; y += 0.18) k.cyl(0.32, 0.32, 0.03, 10, '#8f99a6', x, 0.1 + y, -0.9); k.sphere(0.12, '#ff6bd6', x, 0.2 + h, -0.9, { glow: true }); }
  if (t >= 3) k.add(new THREE.TorusGeometry(0.7, 0.07, 8, 24), '#c9ced5', 0, 0.7, 0.8, { rx: Math.PI / 2 }); if (t >= 4) k.add(new THREE.TorusGeometry(0.7, 0.03, 6, 24), '#ff6bd6', 0, 0.78, 0.8, { rx: Math.PI / 2, glow: true });
  const g = k.build('casimir'); const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.18 + lf * 0.02, 0), new THREE.MeshBasicMaterial({ color: '#ff9ae8', toneMapped: false })); core.position.set(0, 1.05, 0.8); g.add(core);
  return { group: g, height: 1.6 + lf * 0.1, anim: (tt, st) => { core.rotation.y = tt * (st.working ? 2 : 0.5); core.position.y = 1.05 + Math.sin(tt * 2) * 0.05; } };
}
// the Xenology Institute: a crescent of offices around a garden of alien plants, a translation dish listening to the
// stars; tiers add the dish, wings, a specimen dome and a beacon for visiting envoys
function xenolab(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, P = look.primary, A = look.accent; pad(k, 4, 4);
  for (let i = 0; i < 5; i++) { const a = Math.PI * (0.15 + i * 0.175) + Math.PI; const x = Math.cos(a) * 1.35, z = Math.sin(a) * 1.35 + 0.4; k.box(0.75, 0.8 + lf * 0.1, 0.55, P, x, 0.1, z, { ry: -a + Math.PI / 2 }); k.box(0.77, 0.06, 0.57, A, x, 0.9 + lf * 0.1, z, { ry: -a + Math.PI / 2 }); }
  k.cyl(0.8, 0.8, 0.06, 20, '#2f4a36', 0, 0.1, 0.5); for (let i = 0; i < 6; i++) { const a = i * 1.05; k.cyl(0.03, 0.04, 0.4, 5, '#5a7a4a', Math.cos(a) * 0.45, 0.16, 0.5 + Math.sin(a) * 0.45); k.sphere(0.12, ['#9dff5c', '#5fe0c8', '#c9a0ff'][i % 3], Math.cos(a) * 0.45, 0.58, 0.5 + Math.sin(a) * 0.45, { glow: true }); }
  if (t >= 2) { k.cyl(0.12, 0.18, 0.7, 8, '#c9ced5', 1.45, 0.1, 1.35); k.add(new THREE.SphereGeometry(0.5, 14, 6, 0, Math.PI * 2, 0, Math.PI / 3.2), '#eef2f6', 1.45, 1.1, 1.35, { rx: Math.PI - 0.6 }); }
  if (t >= 3) k.sphere(0.45, '#bfe6ff', -1.4, 0.1, 1.4, { theta: Math.PI / 2, w: 14, h: 6, glass: true });
  if (t >= 4) { k.cyl(0.04, 0.06, 1.8, 6, STEEL, 0, 0.1, -1.55); k.sphere(0.1, '#9dff5c', 0, 1.95, -1.55, { glow: true }); }
  if (t >= 5) k.add(new THREE.TorusGeometry(0.85, 0.03, 4, 28), '#9dff5c', 0, 0.2, 0.5, { rx: Math.PI / 2, glow: true });
  return { group: k.build('xenolab'), height: 1.6 + lf * 0.15 };
}
// the antimatter factory: a ring accelerator round a trapping hall, magnetic bottles stacked outside; tiers widen the
// ring, add bottle racks and light the beamline
function antimatter(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), lf = 1 + (Math.max(1, L) - 1) / 4, P = look.primary, A = look.accent; pad(k, 4, 4); const R = 1.35 + lf * 0.06;
  k.add(new THREE.TorusGeometry(R, 0.16, 8, 36), '#c9ced5', 0, 0.3, 0, { rx: Math.PI / 2 }); k.add(new THREE.TorusGeometry(R, 0.05, 6, 36), '#7fe4ff', 0, 0.42, 0, { rx: Math.PI / 2, glow: t >= 2 });
  k.box(1.1, 0.7 + lf * 0.12, 1.1, P, 0, 0.1, 0); k.box(1.14, 0.06, 1.14, A, 0, 0.8 + lf * 0.12, 0); windows(k, 1.1, 1.1, 0.4, 0.12);
  const bottles = Math.min(8, 2 + t); for (let i = 0; i < bottles; i++) { const a = (i / 8) * Math.PI * 2; const x = Math.cos(a) * (R + 0.42), z = Math.sin(a) * (R + 0.42); k.cyl(0.11, 0.11, 0.45, 8, '#e6e9ee', x, 0.1, z); k.sphere(0.07, '#ff5ad1', x, 0.4, z, { glow: true }); }
  if (t >= 4) for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; k.box(0.12, 0.35, 0.22, '#5a616b', Math.cos(a) * R, 0.1, Math.sin(a) * R, { ry: -a }); }
  const g = k.build('antimatter'); const beam = new THREE.Mesh(new THREE.TorusGeometry(R, 0.03, 4, 36, 0.6), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })); beam.rotation.x = Math.PI / 2; beam.position.y = 0.44; g.add(beam);
  return { group: g, height: 1.4 + lf * 0.12, anim: (tt, st) => { beam.rotation.z = tt * (st.working ? 4 : 1); } };
}
function generic(b: string, look: Look): Model { const d = BUILDINGS[b]; const [w, dd] = d ? d.fp : [3, 3]; const k = new Kit(); pad(k, w, dd); k.box(w * 0.7, 1.2, dd * 0.7, look.primary, 0, 0.1, 0); windows(k, w * 0.7, dd * 0.7, 0.5, 0.2); k.box(w * 0.72, 0.1, dd * 0.72, look.accent, 0, 1.3, 0); return { group: k.build(b), height: 1.6 }; }
// ---------------- decorations ----------------
function flagPole(look: Look, x = 0, z = 0, h = 1.6) { const g = new THREE.Group(); const k = new Kit(); k.cyl(0.13, 0.16, 0.08, 8, CON, x, 0, z); k.cyl(0.025, 0.03, h, 6, STEEL, x, 0.08, z); k.sphere(0.04, look.accent, x, h + 0.1, z); g.add(k.build());
  const f = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.39), new THREE.MeshStandardMaterial({ map: bannerTexture(look.banner), side: THREE.DoubleSide, roughness: 0.8 })); f.position.set(x + 0.33, h - 0.15, z); g.add(f); return { g, f }; }
function decorModel(b: string, look: Look): Model | null { const P = look.primary, A = look.accent;
  switch (b) {
    case 'walkway': { const k = new Kit(); k.box(0.98, 0.06, 0.98, '#b9bdc3'); k.box(0.9, 0.02, 0.9, '#cfd3d8', 0, 0.06, 0); k.box(0.92, 0.012, 0.05, A, 0, 0.075, 0.36); return { group: k.build('walkway'), height: 0.1 }; }
    case 'lamp': { const k = new Kit(); k.cyl(0.12, 0.15, 0.1, 8, CON); k.cyl(0.03, 0.04, 1.5, 6, DARK, 0, 0.1, 0); k.box(0.34, 0.04, 0.08, DARK, 0.12, 1.55, 0); k.sphere(0.09, WIN, 0.26, 1.48, 0, { glow: true }); return { group: k.build('lamp'), height: 1.7 }; }
    case 'flag': { const { g, f } = flagPole(look); return { group: g, height: 1.8, anim: (t) => { f.rotation.y = Math.sin(t * 2.2) * 0.18; } }; }
    case 'holotree': { const k = new Kit(); k.cyl(0.2, 0.24, 0.12, 8, CON); k.cyl(0.05, 0.08, 0.9, 6, '#5b4636', 0, 0.12, 0); for (const [x, y, z, r] of [[0, 1.15, 0, 0.36], [0.22, 0.98, 0.1, 0.24], [-0.2, 1.0, -0.08, 0.26], [0.05, 1.42, -0.05, 0.22]]) k.sphere(r, A, x, y, z, { glow: true });
      const g = k.build('holotree'); return { group: g, height: 1.6, anim: (t) => { g.scale.setScalar(1 + Math.sin(t * 1.4) * 0.02); } }; }
    case 'rockgarden': { const k = new Kit(); k.box(1.96, 0.06, 1.96, '#d9cdb5'); for (let r = 0.3; r < 0.95; r += 0.16) k.add(new THREE.TorusGeometry(r, 0.012, 4, 40), '#c4b597', -0.3, 0.07, -0.3, { rx: Math.PI / 2 }); for (const [x, z, s, c] of [[-0.3, -0.3, 0.26, '#7a6f66'], [0.5, 0.35, 0.2, '#b0583a'], [0.45, -0.5, 0.14, '#8f99a6'], [-0.55, 0.55, 0.16, '#5a5048']] as [number, number, number, string][]) k.add(new THREE.DodecahedronGeometry(s, 0), c, x, s * 0.6, z, { sy: 0.7 }); return { group: k.build('rockgarden'), height: 0.4 }; }
    case 'dishes': { const k = new Kit(); k.box(1.96, 0.08, 1.96, CON); const g = k.build('dishes'); const heads: THREE.Group[] = [];
      for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) { const p = new Kit(); p.cyl(0.04, 0.06, 0.45, 6, STEEL, x, 0.08, z); g.add(p.build()); const h = new THREE.Group(); const d = new Kit(); d.add(new THREE.SphereGeometry(0.36, 14, 6, 0, Math.PI * 2, 0, Math.PI / 3.2), '#eef2f6', 0, 0, 0, { rx: Math.PI }); d.cyl(0.015, 0.015, 0.3, 4, STEEL, 0, -0.32, 0); d.sphere(0.035, A, 0, -0.48, 0); const dg = d.build(); dg.rotation.x = -0.8; h.add(dg); h.position.set(x, 0.62, z); g.add(h); heads.push(h); }
      return { group: g, height: 1.0, anim: (t) => { heads.forEach((h, i) => { h.rotation.y = Math.sin(t * 0.1 + i * 0.3) * 1.1; }); } }; }
    case 'beacon': { const k = new Kit(); k.cyl(0.3, 0.36, 0.16, 10, DARK); k.cyl(0.22, 0.22, 0.03, 16, A, 0, 0.16, 0, { glow: true }); const g = k.build('beacon');
      const tex = bannerTexture({ bg: 'rgba(0,0,0,0)', fg: look.banner.fg, emblem: look.banner.emblem }); const holo = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.56), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      holo.position.y = 0.85; g.add(holo); const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.2, 0.55, 16, 1, true), new THREE.MeshBasicMaterial({ color: A, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); cone.position.y = 0.45; g.add(cone);
      return { group: g, height: 1.3, anim: (t) => { holo.rotation.y = t * 0.8; holo.position.y = 0.85 + Math.sin(t * 1.5) * 0.04; } }; }
    case 'statue': { const k = new Kit(); const SU = '#f1ede4', BR = '#c79a4a'; k.box(1.2, 0.5, 1.2, '#9aa3ad'); k.box(1.3, 0.08, 1.3, BR, 0, 0.5, 0); k.box(1.21, 0.1, 0.02, BR, 0, 0.22, 0.6);
      k.box(0.17, 0.5, 0.18, SU, -0.11, 0.58, 0); k.box(0.17, 0.5, 0.18, SU, 0.11, 0.58, 0); k.box(0.2, 0.1, 0.26, '#6b7280', -0.11, 0.58, 0.03); k.box(0.2, 0.1, 0.26, '#6b7280', 0.11, 0.58, 0.03);
      k.box(0.5, 0.56, 0.34, SU, 0, 1.06, 0); k.box(0.42, 0.46, 0.18, '#cfd3d8', 0, 1.1, -0.25); k.box(0.16, 0.1, 0.02, P, 0, 1.38, 0.18); k.box(0.08, 0.06, 0.02, A, -0.14, 1.26, 0.18);
      k.sphere(0.24, SU, 0, 1.84, 0); k.sphere(0.17, '#ffcf6a', 0, 1.84, 0.1, { sz: 0.55, glow: true }); k.box(0.13, 0.46, 0.13, SU, -0.33, 1.16, 0, { rz: 0.18 }); k.box(0.13, 0.5, 0.13, SU, 0.34, 1.42, 0, { rz: -0.5 });
      const f = flagPole(look, 0.52, 0.05, 1.5); const g = k.build('statue'); f.g.position.y = 0.54; f.g.scale.setScalar(0.85); g.add(f.g); return { group: g, height: 2.5, anim: (t) => { f.f.rotation.y = Math.sin(t * 2) * 0.15; } }; }
    case 'xenogarden': { const k = new Kit(); k.cyl(0.92, 0.98, 0.2, 20, DARK); k.cyl(0.88, 0.88, 0.04, 20, '#2b3a2e', 0, 0.2, 0); const blobs: [number, number, number, number, string][] = [[-0.3, 0.32, -0.2, 0.16, '#5fe0c8'], [0.25, 0.3, 0.25, 0.12, '#c9a0ff'], [0.35, 0.28, -0.3, 0.1, '#7cf29a'], [-0.2, 0.3, 0.35, 0.11, '#ffd166']];
      for (const [x, y, z, r, c] of blobs) { k.cyl(0.02, 0.03, y + r, 4, '#3a5a3a', x, 0.22, z); k.sphere(r, c, x, 0.22 + y + r, z, { glow: true }); } for (let i = 0; i < 9; i++) { const a = i * 0.7, d = 0.25 + (i % 3) * 0.18; k.box(0.03, 0.18 + (i % 4) * 0.08, 0.03, '#5fae6a', Math.cos(a) * d, 0.22, Math.sin(a) * d, { rz: (i % 2 ? 1 : -1) * 0.25 }); }
      const g = k.build('xenogarden'); const glass = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#cfefff', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0, depthWrite: false })); glass.position.y = 0.22; g.add(glass); return { group: g, height: 1.2 }; }
    case 'monument': { const k = new Kit(); k.box(1.4, 0.4, 1.4, '#cfd3d8'); k.box(1.5, 0.06, 1.5, A, 0, 0.4, 0); k.cyl(0.2, 0.22, 1.7, 12, P, 0, 0.46, 0); k.cyl(0.0, 0.2, 0.5, 12, A, 0, 2.16, 0); k.cyl(0.205, 0.205, 0.12, 12, A, 0, 1.4, 0);
      for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; k.box(0.04, 0.42, 0.26, A, Math.cos(a) * 0.24, 0.46, Math.sin(a) * 0.24, { ry: -a }); } k.cyl(0.13, 0.17, 0.18, 10, DARK, 0, 0.46, 0); return { group: k.build('monument'), height: 2.8 }; }
  }
  return null; }
// ---------------- visible progress: every level of every building looks different ----------------
// The models change shape every four levels (tiers 1-6). On top of that, every building wears its rank:
//  - a trim band round the pad in the tier's metal: steel, bronze, silver, gold, glowing platinum, prismatic
//  - one glowing light on the front edge for each level within the tier (1-4), so every single upgrade shows
//  - a corner pylon that grows with the tier: a beacon, a dish, a gold spire, a floating halo, a prismatic crown
//  - lamps on the other corners from tier 3, and the building itself grows a little taller with every level
// All of it is merged into one mesh (plus the spinning halo at the top tiers), so a grown base stays cheap to draw.
export const TIER_METAL = ['#8a929c', '#c98a4a', '#dfe6ee', '#ffcb3c', '#a6f2ff', '#ff8ae6'];
export const TIER_NAME = ['Steel', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Prismatic'];
function dress(m: Model, b: string, L: number, look: Look): Model {
  const d = BUILDINGS[b]; if (!d || d.max <= 1 || b === 'wall') return m; const t = tierOf(L), sub = (Math.max(1, L) - 1) % 4, [w, dp] = d.fp, col = TIER_METAL[t - 1];
  const grow = 1 + 0.006 * (Math.max(1, L) - 1); m.group.scale.set(1 + 0.0015 * (L - 1), grow, 1 + 0.0015 * (L - 1)); m.height *= grow;
  const k = new Kit(), hw = w / 2 - 0.03, hd = dp / 2 - 0.03, G = { glow: true };
  k.box(w - 0.02, 0.04, 0.05, col, 0, 0.1, hd, G); k.box(w - 0.02, 0.04, 0.05, col, 0, 0.1, -hd, G); k.box(0.05, 0.04, dp - 0.02, col, hw, 0.1, 0, G); k.box(0.05, 0.04, dp - 0.02, col, -hw, 0.1, 0, G);
  // the tier pylon, back-left corner, with one glowing ring for each level within the tier
  const px = -hw + 0.16, pz = -hd + 0.16, ph = 0.45 + 0.3 * t + 0.1 * sub; k.box(0.07, ph, 0.07, '#3b4350', px, 0.1, pz, G);
  const pip = shade(col, 0.5); for (let i = 0; i <= sub; i++) k.add(new THREE.TorusGeometry(0.11, 0.035, 6, 16), pip, px, 0.28 + i * 0.16, pz, { glow: true, rx: Math.PI / 2 });
  let top = 0.1 + ph; if (t >= 2) k.sphere(0.07, t >= 4 ? col : '#ff5a5a', px, top + 0.05, pz, G);
  if (t >= 3) k.add(new THREE.SphereGeometry(0.2, 10, 5, 0, Math.PI * 2, 0, Math.PI / 3), '#dfe6ee', px, top - 0.15, pz, { glow: true, rx: Math.PI - 0.6 });
  if (t >= 4) { k.cyl(0.0, 0.06, 0.5, 6, col, px, top + 0.1, pz, G); top += 0.55; }
  for (const [cx, cz, need] of [[hw - 0.16, -hd + 0.16, 3], [-hw + 0.16, hd - 0.16, 4], [hw - 0.16, hd - 0.16, 4]] as [number, number, number][]) if (t >= need) { k.box(0.05, 0.42, 0.05, '#3b4350', cx, 0.1, cz, G); k.sphere(0.06, shade(col, 0.3), cx, 0.56, cz, G); }
  const dg = k.build('rank'); m.group.add(dg); dg.scale.set(1 / m.group.scale.x, 1 / grow, 1 / m.group.scale.z);
  if (t >= 5) { const halo = new THREE.Group(); const hm = new THREE.MeshBasicMaterial({ color: col, toneMapped: false }); const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 24), hm); r1.rotation.x = Math.PI / 2; halo.add(r1);
    if (t >= 6) { const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 6, 24), new THREE.MeshBasicMaterial({ color: '#9ff3ff', toneMapped: false })); halo.add(r2); const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })); halo.add(gem); }
    halo.position.set(px, (top + 0.3) / grow, pz); halo.scale.set(1 / m.group.scale.x, 1 / grow, 1 / m.group.scale.z); m.group.add(halo); const a0 = m.anim; m.anim = (tt, st) => { a0?.(tt, st); halo.rotation.y = tt * 1.4; halo.children[1] && (halo.children[1].rotation.x = tt * 0.9); }; }
  return m; }
export function buildModel(b: string, L: number, look: Look): Model {
  const dm = decorModel(b, look); if (dm) return dm; return dress(baseModel(b, L, look), b, L, look); }
function baseModel(b: string, L: number, look: Look): Model {
  switch (b) {
    case 'hq': return hq(L, look); case 'research': return research(L, look); case 'university': return university(L, look); case 'mine': return mine(L, look);
    case 'refinery': return refinery(L, look); case 'office': return office(L, look); case 'solar': return solar(L); case 'fission': return fission(L, look); case 'depot': return depot(L, look);
    case 'launch': return launch(L, look); case 'vab': return vab(L, look); case 'tracking': return tracking(L, look); case 'academy': return academy(L, look);
    case 'workshop': return workshop(L, look); case 'dock': return dock(L, look); case 'cellplant': return cellplant(L, look); case 'fusionlab': return fusionlab(L, look);
    case 'hub': return hub(L, look); case 'regolith': return regolith(L, look); case 'ice': return ice(L, look); case 'he3x': return he3x(L, look); case 'lsolar': return lsolar(L); case 'dome': return dome(L, look); case 'burrow': return burrow(L, look);
    case 'warroom': return warroom(L, look); case 'turret': return turret(L, look); case 'laser': return laserBattery(L, look); case 'missile': return missileSilo(L, look); case 'shield': return shieldGen(L, look); case 'emp': return empTower(L, look); case 'wall': return wall(L);
    case 'skimmer': return skimmer(L, look); case 'resort': return resort(L, look); case 'terraformer': return terraformer(L, look); case 'beltControl': return beltControl(L, look); case 'methane': return methane(L, look);
    case 'elevator': return elevator(L, look); case 'casimir': return casimir(L, look); case 'xenolab': return xenolab(L, look); case 'antimatter': return antimatter(L, look); case 'llab': return llab(L, look); case 'greenhouse': return greenhouse(L, look); case 'algae': return algae(L, look); case 'deepfarm': return deepfarm(L, look); case 'reactor': return reactor(L, look); case 'massDriver': return massDriver(L, look); case 'fusion': return fusionPlant(L, look);
  }
  return generic(b, look);
}
// construction scaffold over a building in progress
export function scaffold(w: number, d: number, h: number) {
  const k = new Kit(); const Y = '#f5c542'; for (const [x, z] of [[-w / 2 + 0.15, -d / 2 + 0.15], [w / 2 - 0.15, -d / 2 + 0.15], [-w / 2 + 0.15, d / 2 - 0.15], [w / 2 - 0.15, d / 2 - 0.15]]) k.box(0.06, h, 0.06, Y, x, 0, z);
  for (let y = 0.5; y < h; y += 0.6) { k.box(w - 0.2, 0.05, 0.08, Y, 0, y, -d / 2 + 0.15); k.box(w - 0.2, 0.05, 0.08, Y, 0, y, d / 2 - 0.15); k.box(0.08, 0.05, d - 0.2, Y, -w / 2 + 0.15, y, 0); k.box(0.08, 0.05, d - 0.2, Y, w / 2 - 0.15, y, 0); }
  k.box(0.08, h + 0.8, 0.08, '#e67e22', w / 2 - 0.4, 0, -d / 2 + 0.4); return k.build('scaffold');
}
// a construction drone: a small quadcopter with a welding light
export function droneModel() {
  const k = new Kit(); k.box(0.34, 0.1, 0.34, '#f2f4f7'); k.box(0.36, 0.03, 0.36, '#f5c542', 0, 0.1, 0); for (const [x, z] of [[0.24, 0.24], [-0.24, 0.24], [0.24, -0.24], [-0.24, -0.24]]) { k.box(0.2, 0.025, 0.04, '#3b4350', x * 0.6, 0.06, z * 0.6, { ry: Math.atan2(z, x) }); k.cyl(0.11, 0.11, 0.015, 10, '#9aa3ad', x, 0.09, z); }
  k.sphere(0.05, '#7ff5ff', 0, -0.04, 0, { glow: true }); return k.build('drone');
}
// the banner texture (flag, emblems): drawn once per combination
const texCache = new Map<string, THREE.Texture>();
export function emblemPath(g: CanvasRenderingContext2D, e: string, r: number) {
  g.beginPath();
  if (e === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } }
  else if (e === 'planet') { g.arc(0, 0, r * 0.6, 0, 7); g.moveTo(r, 0); g.ellipse(0, 0, r, r * 0.28, -0.3, 0, 7); }
  else if (e === 'rocket') { g.moveTo(0, -r); g.quadraticCurveTo(r * 0.45, -r * 0.3, r * 0.3, r * 0.5); g.lineTo(r * 0.6, r); g.lineTo(-r * 0.6, r); g.lineTo(-r * 0.3, r * 0.5); g.quadraticCurveTo(-r * 0.45, -r * 0.3, 0, -r); }
  else if (e === 'bolt') { g.moveTo(r * 0.2, -r); g.lineTo(-r * 0.5, r * 0.1); g.lineTo(0, r * 0.1); g.lineTo(-r * 0.2, r); g.lineTo(r * 0.5, -r * 0.1); g.lineTo(0, -r * 0.1); }
  else if (e === 'gear') { for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, rr = i % 2 ? r * 0.7 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.moveTo(r * 0.3, 0); g.arc(0, 0, r * 0.3, 0, Math.PI * 2, true); }
  else if (e === 'crown') { g.moveTo(-r * 0.9, r * 0.7); g.lineTo(-r * 0.95, -r * 0.55); g.lineTo(-r * 0.45, -r * 0.05); g.lineTo(0, -r * 0.8); g.lineTo(r * 0.45, -r * 0.05); g.lineTo(r * 0.95, -r * 0.55); g.lineTo(r * 0.9, r * 0.7); }
  else if (e === 'atom') { for (let i = 0; i < 3; i++) { const a = (i * Math.PI) / 3; g.moveTo(Math.cos(a) * r, Math.sin(a) * r); g.ellipse(0, 0, r, r * 0.3, a, 0, Math.PI * 2); g.moveTo(Math.cos(a) * r * 0.84, Math.sin(a) * r * 0.84); g.ellipse(0, 0, r * 0.84, r * 0.17, a, 0, Math.PI * 2, true); } g.moveTo(r * 0.22, 0); g.arc(0, 0, r * 0.22, 0, Math.PI * 2); }
  else if (e === 'leaf') { g.moveTo(-r * 0.75, r * 0.75); g.quadraticCurveTo(-r * 0.9, -r * 0.6, r * 0.8, -r * 0.85); g.quadraticCurveTo(r * 0.7, r * 0.75, -r * 0.6, r * 0.6); g.lineTo(-r * 0.9, r * 0.95); g.lineTo(-r * 0.95, r * 0.88); }
  else if (e === 'eye') { g.moveTo(-r, 0); g.quadraticCurveTo(0, -r * 0.95, r, 0); g.quadraticCurveTo(0, r * 0.95, -r, 0); g.moveTo(r * 0.42, 0); g.arc(0, 0, r * 0.42, 0, Math.PI * 2, true); g.moveTo(r * 0.2, 0); g.arc(0, 0, r * 0.2, 0, Math.PI * 2); }
  else if (e === 'chip') { const b = r * 0.62; g.rect(-b, -b, b * 2, b * 2); g.moveTo(-b * 0.5, -b * 0.5); g.lineTo(-b * 0.5, b * 0.5); g.lineTo(b * 0.5, b * 0.5); g.lineTo(b * 0.5, -b * 0.5); g.closePath();
    for (let i = -1; i <= 1; i++) { const o = i * b * 0.6 - r * 0.07; g.rect(o, -r, r * 0.14, r - b); g.rect(o, b, r * 0.14, r - b); g.rect(-r, o, r - b, r * 0.14); g.rect(b, o, r - b, r * 0.14); } }
  else if (e === 'gem') { g.moveTo(-r * 0.85, -r * 0.3); g.lineTo(-r * 0.45, -r * 0.78); g.lineTo(r * 0.45, -r * 0.78); g.lineTo(r * 0.85, -r * 0.3); g.lineTo(0, r * 0.92); }
  else if (e === 'helix') { const w = r * 0.16; for (const sd of [-1, 1]) { g.moveTo(sd * r * 0.5, -r); for (let k = 0; k <= 24; k++) { const t = k / 24, y = -r + t * 2 * r; g.lineTo(sd * Math.cos(t * Math.PI * 2) * r * 0.5 - w / 2, y); } for (let k = 24; k >= 0; k--) { const t = k / 24, y = -r + t * 2 * r; g.lineTo(sd * Math.cos(t * Math.PI * 2) * r * 0.5 + w / 2, y); } g.closePath(); }
    for (let k = 1; k < 8; k++) { const t = k / 8, y = -r + t * 2 * r, x = Math.abs(Math.cos(t * Math.PI * 2)) * r * 0.5; if (x > w) g.rect(-x, y - w * 0.3, x * 2, w * 0.6); } }
  else if (e === 'shield') { g.moveTo(0, -r); g.lineTo(r * 0.85, -r * 0.65); g.quadraticCurveTo(r * 0.85, r * 0.5, 0, r); g.quadraticCurveTo(-r * 0.85, r * 0.5, -r * 0.85, -r * 0.65); }
  else if (e === 'ring') { g.arc(0, 0, r * 0.32, 0, Math.PI * 2); g.moveTo(r * 0.95, 0); g.ellipse(0, 0, r * 0.95, r * 0.95, 0, 0, Math.PI * 2); g.moveTo(r * 0.72, 0); g.ellipse(0, 0, r * 0.72, r * 0.72, 0, 0, Math.PI * 2, true); }
  else if (e === 'spiral') { for (let arm = 0; arm < 2; arm++) { const pts: [number, number][] = []; for (let k = 0; k <= 30; k++) { const t = k / 30, a = arm * Math.PI + t * Math.PI * 2.2, rr = r * (0.12 + t * 0.88), w = r * 0.16 * (1 - t * 0.7); pts.push([Math.cos(a) * (rr + w), Math.sin(a) * (rr + w)]); } for (let k = 30; k >= 0; k--) { const t = k / 30, a = arm * Math.PI + t * Math.PI * 2.2, rr = r * (0.12 + t * 0.88), w = r * 0.16 * (1 - t * 0.7); pts.push([Math.cos(a) * (rr - w), Math.sin(a) * (rr - w)]); } pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); } g.moveTo(r * 0.2, 0); g.arc(0, 0, r * 0.2, 0, Math.PI * 2); }
  else g.arc(0, 0, r * 0.8, 0, 7);
  g.closePath();
}
export const emblemRule = (e: string): CanvasFillRule => (e === 'atom' || e === 'eye' || e === 'chip' || e === 'gear' || e === 'ring' ? 'evenodd' : 'nonzero');
export function bannerTexture(b: { bg: string; fg: string; emblem: string }) {
  const key = b.bg + b.fg + b.emblem; const hit = texCache.get(key); if (hit) return hit;
  const c = document.createElement('canvas'); c.width = 128; c.height = 80; const g = c.getContext('2d')!; g.fillStyle = b.bg; g.fillRect(0, 0, 128, 80); g.fillStyle = b.fg; g.translate(64, 40); emblemPath(g, b.emblem, 24); g.fill(emblemRule(b.emblem));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; texCache.set(key, t); return t;
}
