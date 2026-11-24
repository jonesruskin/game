// Procedural building models for the spaceport. Every building grows with its level (a new tier every few levels)
// and wears the player's paint scheme; parts are merged by Kit into 2-3 draw calls per building.
import * as THREE from 'three';
import { Kit, shade } from './kit';
import { BUILDINGS } from '../data/buildings';
export interface Look { primary: string; accent: string; banner: { bg: string; fg: string; emblem: string }; }
export interface Model { group: THREE.Group; height: number; anim?: (t: number, k: AnimState) => void; }
export interface AnimState { working: boolean; full?: boolean; }
const CON = '#cfd3d8', DARK = '#3b4350', STEEL = '#aeb8c4', WIN = '#ffe7a8', GLASS = '#9fd3ff';
const tierOf = (L: number) => Math.min(6, 1 + Math.floor((Math.max(1, L) - 1) / 4));
// a concrete apron under every building, with painted kerbs
function pad(k: Kit, w: number, d: number, c = CON) { k.box(w - 0.08, 0.1, d - 0.08, c); k.box(w - 0.08, 0.03, 0.06, '#f2d36b', 0, 0.1, d / 2 - 0.1); }
// a window band: a glowing strip on each face of a block
function windows(k: Kit, w: number, d: number, y: number, h: number, x = 0, z = 0) { k.box(w + 0.05, h, d + 0.05, WIN, x, y, z, { glow: true }); for (let i = -w / 2 + 0.35; i < w / 2 - 0.2; i += 0.42) { k.box(0.07, h + 0.02, d + 0.07, '#5b6676', x + i, y - 0.01, z); } }
function hq(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), P = look.primary, A = look.accent; pad(k, 5, 5);
  // main block with a glass facade and a roof garden of equipment
  const bh = 0.95 + t * 0.12; k.box(3.3, bh, 2.3, P, 0.55, 0.1, 0.55); windows(k, 3.3, 2.3, 0.4, 0.3, 0.55, 0.55); k.box(3.36, 0.1, 2.36, A, 0.55, 0.1 + bh, 0.55);
  k.box(3.0, bh - 0.15, 0.06, GLASS, 0.55, 0.15, -0.62, { glass: true }); for (let x = -0.8; x <= 1.9; x += 0.45) k.box(0.05, bh - 0.15, 0.08, shade(P, -0.3), x, 0.15, -0.62);
  for (let i = 1; i < Math.min(t, 4); i++) { const w = 3.0 - i * 0.5, d = 2.0 - i * 0.3, y0 = 0.2 + bh + (i - 1) * 0.62; k.box(w, 0.55, d, i % 2 ? shade(P, -0.05) : P, 0.85, y0, 0.75); windows(k, w, d, y0 + 0.18, 0.2, 0.85, 0.75); k.box(w + 0.05, 0.06, d + 0.05, A, 0.85, y0 + 0.55, 0.75); }
  k.box(0.5, 0.3, 0.4, '#9aa3ad', 1.6, 0.2 + bh, 1.2); k.box(0.4, 0.25, 0.4, '#9aa3ad', 1.1, 0.2 + bh, 1.4);
  // the control tower: an octagonal shaft and a glowing glass cab
  const th = 2.0 + t * 0.45, tx = -1.35, tz = -1.15; k.cyl(0.42, 0.5, th, 8, shade(P, -0.04), tx, 0.1, tz); for (let y = 0.6; y < th - 0.3; y += 0.55) k.cyl(0.43, 0.43, 0.05, 8, A, tx, 0.1 + y, tz);
  k.cyl(0.8, 0.55, 0.22, 10, P, tx, 0.1 + th, tz); k.cyl(0.78, 0.78, 0.42, 10, GLASS, tx, 0.32 + th, tz, { glass: true }); k.cyl(0.7, 0.7, 0.36, 10, WIN, tx, 0.35 + th, tz, { glow: true });
  k.cyl(0.86, 0.86, 0.1, 10, A, tx, 0.74 + th, tz); k.cyl(0.55, 0.8, 0.14, 10, P, tx, 0.84 + th, tz); k.cyl(0.03, 0.03, 0.9, 5, STEEL, tx, 0.98 + th, tz); k.sphere(0.06, '#ff4f4f', tx, 1.9 + th, tz, { glow: true });
  const g = k.build('hq');
  // a tracking dish on the roof
  const dish = new THREE.Group(); { const dk = new Kit(); dk.add(new THREE.SphereGeometry(0.6 + t * 0.05, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3.2), '#eef2f6', 0, 0, 0, { rx: Math.PI }); dk.cyl(0.02, 0.02, 0.5, 4, STEEL, 0, -0.55, 0); dk.sphere(0.05, A, 0, -0.8, 0); const dg = dk.build(); dg.rotation.x = -0.9; dish.add(dg); }
  const ped = new Kit(); ped.cyl(0.1, 0.16, 0.45, 8, STEEL, 0, 0, 0); const pg = ped.build(); pg.position.set(0.1, 0.2 + bh, 0.3); g.add(pg); dish.position.set(0.1, 0.75 + bh, 0.3); g.add(dish);
  const fk = new Kit(); fk.cyl(0.03, 0.035, 2.4, 5, STEEL, 2.15, 0.1, -2.05); g.add(fk.build()); const f = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.48), new THREE.MeshStandardMaterial({ map: bannerTexture(look.banner), side: THREE.DoubleSide, roughness: 0.8 })); f.position.set(2.53, 2.25, -2.05); g.add(f);
  return { group: g, height: th + 1.4, anim: (tt) => { dish.rotation.y = tt * 0.25; f.rotation.y = Math.sin(tt * 2) * 0.15; } };
}
function research(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), P = look.primary, A = look.accent; pad(k, 4, 4);
  const h = 0.9 + t * 0.18; k.box(2.6, h, 2.0, P, -0.5, 0.1, 0.5); windows(k, 2.6, 2.0, 0.4, 0.26, -0.5, 0.5); k.box(2.65, 0.08, 2.05, A, -0.5, 0.1 + h, 0.5);
  for (let i = 0; i < Math.min(3, 1 + Math.floor(t / 2)); i++) { const x = 1.1, z = -1.0 + i * 1.0; k.cyl(0.42, 0.42, 0.45, 12, '#e9edf2', x, 0.1, z); k.sphere(0.42, '#f6f8fb', x, 0.55, z, { theta: Math.PI / 2, w: 14 }); k.box(0.12, 0.3, 0.5, DARK, x, 0.7, z, { ry: 0.6 }); }
  k.cyl(0.32, 0.32, 3.0, 10, STEEL, -0.6, 0.45, -1.35, { rz: Math.PI / 2 }); k.cyl(0.36, 0.36, 0.2, 10, A, -2.0, 0.45, -1.35, { rz: Math.PI / 2 }); // wind tunnel
  if (t >= 3) { k.box(1.2, 0.8, 1.0, shade(P, -0.08), -0.9, 0.1 + h, 0.6); windows(k, 1.2, 1.0, 0.25 + h, 0.2, -0.9, 0.6); }
  return { group: k.build('research'), height: h + 1.2 };
}
function university(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), P = '#e8dcc6', A = look.accent; pad(k, 4, 4, '#7fae5a');
  k.box(3.2, 0.9, 1.3, P, 0, 0.1, -1.1); k.box(3.3, 0.18, 1.4, '#a8452f', 0, 1.0, -1.1); for (let i = -3; i <= 3; i++) k.cyl(0.06, 0.06, 0.8, 6, '#f6f1e6', i * 0.45, 0.1, -0.4);
  k.box(3.4, 0.08, 0.3, '#f6f1e6', 0, 0.9, -0.42); k.box(1.0, 0.9, 2.2, P, -1.2, 0.1, 0.7); k.box(1.1, 0.16, 2.3, '#a8452f', -1.2, 1.0, 0.7); windows(k, 1.0, 2.2, 0.45, 0.2, -1.2, 0.7); windows(k, 3.2, 1.3, 0.45, 0.2, 0, -1.1);
  const th = 1.6 + t * 0.25; k.box(0.6, th, 0.6, P, 1.2, 0.1, 0.9); k.box(0.7, 0.1, 0.7, A, 1.2, 0.1 + th, 0.9); k.cyl(0.0, 0.42, 0.6, 4, '#a8452f', 1.2, 0.2 + th, 0.9, { ry: Math.PI / 4 }); k.cyl(0.18, 0.18, 0.05, 12, '#fff8dc', 1.2, th - 0.35, 1.21, { rx: Math.PI / 2, glow: true });
  for (let i = 0; i < 3; i++) { k.cyl(0.05, 0.07, 0.35, 5, '#6b4a2e', 0.1 + i * 0.5, 0.1, 0.9); k.sphere(0.25, '#3f8a3a', 0.1 + i * 0.5, 0.6, 0.9); }
  return { group: k.build('university'), height: th + 0.9 };
}
function mine(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), A = look.accent; pad(k, 3, 3, '#8e8170');
  for (let i = 0; i < 3; i++) { const s = 2.0 - i * 0.55; k.box(s, 0.06, s, i % 2 ? '#6e6152' : '#7d6f5e', -0.25, 0.1 - i * 0.05, -0.25); } // stepped pit
  k.box(0.7, 0.04, 0.7, '#4a4036', -0.25, -0.02, -0.25);
  const hh = 1.4 + t * 0.2; for (const [x, z] of [[0.75, 0.55], [1.15, 0.55], [0.75, 0.95], [1.15, 0.95]]) k.box(0.07, hh, 0.07, '#c0392b', x, 0.1, z); // headframe
  k.box(0.55, 0.08, 0.55, '#c0392b', 0.95, 0.1 + hh, 0.75); k.cyl(0.16, 0.16, 0.06, 10, DARK, 0.95, 0.15 + hh, 0.75, { rx: Math.PI / 2 });
  k.box(0.18, 0.12, 1.5, DARK, 0.2, 0.45, 0.9, { rx: -0.35 }); // conveyor
  k.add(new THREE.ConeGeometry(0.45, 0.5, 7), '#9aa3ad', -0.9, 0.35, 0.95); k.box(0.6, 0.35, 0.4, A, -0.95, 0.1, -1.0); k.box(0.3, 0.25, 0.4, '#f5c542', -0.55, 0.1, -1.0); // ore pile and a truck
  if (t >= 3) { k.box(0.9, 0.7, 0.6, '#d8d2c6', 0.9, 0.1, -0.9); windows(k, 0.9, 0.6, 0.35, 0.16, 0.9, -0.9); }
  return { group: k.build('mine'), height: hh + 0.5 };
}
function refinery(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), A = look.accent; pad(k, 3, 3);
  const n = Math.min(4, 1 + Math.floor(t / 2)); for (let i = 0; i < n; i++) { const h = 1.6 + t * 0.2 - i * 0.2, x = -0.9 + i * 0.55; k.cyl(0.18, 0.2, h, 10, '#e4e7eb', x, 0.1, -0.8); for (let j = 1; j < 4; j++) k.cyl(0.21, 0.21, 0.05, 10, A, x, 0.1 + (h * j) / 4, -0.8); }
  k.sphere(0.45, '#f1f3f5', 0.6, 0.6, 0.6, { w: 14, h: 9 }); k.cyl(0.05, 0.05, 0.4, 5, STEEL, 0.6, 0.1, 0.6); if (t >= 2) k.sphere(0.36, '#f1f3f5', -0.5, 0.5, 0.75, { w: 12, h: 8 });
  k.box(2.2, 0.08, 0.08, STEEL, 0, 0.45, 0.0); k.box(0.08, 0.08, 1.5, STEEL, 0.1, 0.35, 0);
  const fh = 1.9 + t * 0.25; k.cyl(0.05, 0.07, fh, 6, DARK, 1.15, 0.1, -1.1); const g = k.build('refinery');
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 8), new THREE.MeshBasicMaterial({ color: '#ffb347', toneMapped: false })); flame.position.set(1.15, 0.1 + fh + 0.2, -1.1); g.add(flame);
  return { group: g, height: fh + 0.6, anim: (tt, s) => { flame.visible = s.working; flame.scale.set(1, 0.8 + Math.sin(tt * 13) * 0.25 + Math.sin(tt * 7.3) * 0.15, 1); } };
}
function office(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), P = look.primary, A = look.accent; pad(k, 3, 3);
  const h = 1.2 + t * 0.55; k.box(1.7, h, 1.5, GLASS, -0.2, 0.1, -0.2, { glass: true }); k.box(1.6, h - 0.05, 1.4, '#5d7da0', -0.2, 0.1, -0.2);
  for (let y = 0.4; y < h; y += 0.42) k.box(1.72, 0.05, 1.52, A, -0.2, 0.1 + y, -0.2); k.box(1.8, 0.12, 1.6, P, -0.2, 0.1 + h, -0.2);
  windows(k, 1.62, 1.42, 0.3, h - 0.5, -0.2, -0.2); k.box(1.0, 0.6, 0.9, P, 0.6, 0.1, 0.8); windows(k, 1.0, 0.9, 0.25, 0.18, 0.6, 0.8); k.box(0.5, 0.05, 0.25, '#ffd166', 0.6, 0.72, 1.26, { glow: true });
  return { group: k.build('office'), height: h + 0.4 };
}
function solar(L: number): Model {
  const k = new Kit(), t = tierOf(L); pad(k, 3, 3, '#a5b07f');
  const rows = Math.min(4, 2 + Math.floor(t / 2)), cols = t >= 4 ? 3 : 2; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = -0.95 + c * (1.9 / Math.max(1, cols - 1)) * (cols > 1 ? 1 : 0), z = -1.0 + (r * 2.0) / Math.max(1, rows - 1);
    k.box(0.05, 0.3, 0.05, STEEL, x, 0.1, z); k.box(cols > 2 ? 0.8 : 1.1, 0.04, 0.45, '#1d3c78', x, 0.42, z, { rx: -0.5 }); k.box(cols > 2 ? 0.82 : 1.12, 0.02, 0.47, '#4f7fd6', x, 0.445, z + 0.01, { rx: -0.5 }); }
  k.box(0.35, 0.3, 0.3, '#e8eaee', 1.2, 0.1, 1.2);
  return { group: k.build('solar'), height: 0.9 };
}
function fission(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), A = look.accent; pad(k, 4, 4);
  const pts: THREE.Vector2[] = []; for (let i = 0; i <= 12; i++) { const y = i / 12; pts.push(new THREE.Vector2(0.95 - Math.sin(y * Math.PI * 0.85) * 0.38 + y * 0.05, y * (2.2 + t * 0.2))); }
  k.add(new THREE.LatheGeometry(pts, 18), '#d9dde2', -0.6, 0.1, -0.5); k.cyl(0.62, 0.62, 0.05, 18, A, -0.6, 1.5 + t * 0.15, -0.5);
  k.cyl(0.6, 0.6, 0.9, 16, '#eef0f3', 1.0, 0.1, 0.8); k.sphere(0.6, '#eef0f3', 1.0, 1.0, 0.8, { theta: Math.PI / 2, w: 16 }); k.box(1.2, 0.6, 0.8, '#c9cdd3', 0.9, 0.1, -0.6); windows(k, 1.2, 0.8, 0.3, 0.14, 0.9, -0.6);
  const g = k.build('fission'); const steam = new THREE.Group(); const sm = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), sm); p.userData.o = i / 5; steam.add(p); } steam.position.set(-0.6, 2.3 + t * 0.2, -0.5); g.add(steam);
  return { group: g, height: 3 + t * 0.2, anim: (tt, s) => { steam.visible = s.working; steam.children.forEach((p) => { const f = (tt * 0.25 + (p.userData.o as number)) % 1; p.position.set(Math.sin(f * 7) * 0.2, f * 2.2, f * 0.6); p.scale.setScalar(0.6 + f * 1.6); }); sm.opacity = 0.45; } };
}
function depot(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), P = look.primary, A = look.accent; pad(k, 3, 3);
  const nW = Math.min(2, 1 + Math.floor(t / 3)); for (let i = 0; i < nW; i++) { const z = -0.7 + i * 0.95; k.box(1.7, 0.55, 0.8, P, -0.4, 0.1, z); k.add(new THREE.CylinderGeometry(0.4, 0.4, 1.7, 12, 1, false, 0, Math.PI), shade(P, -0.12), -0.4, 0.65, z, { rz: Math.PI / 2, sz: 1 }); k.box(0.5, 0.4, 0.04, A, -1.26, 0.1, z); }
  const nT = Math.min(3, 1 + Math.floor(t / 2)); for (let i = 0; i < nT; i++) { const z = -0.9 + i * 0.8; k.cyl(0.32, 0.32, 0.8 + t * 0.1, 12, '#eceff2', 1.05, 0.1, z); k.cyl(0.33, 0.33, 0.05, 12, A, 1.05, 0.5, z); }
  for (let i = 0; i < 3; i++) k.box(0.25, 0.25, 0.25, ['#c98b3a', '#5b8bd6', '#c94a4a'][i], -0.9 + i * 0.32, 0.1, 1.15);
  return { group: k.build('depot'), height: 1.3 };
}
function launch(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), A = look.accent; pad(k, 6, 6, '#bfc4ca');
  k.box(2.4, 0.3, 2.4, '#9aa1a9', 0, 0.1, 0); k.box(0.9, 0.05, 2.6, '#2b2f36', 0, 0.38, 0); k.box(0.95, 0.12, 0.6, '#2b2f36', 0, 0.05, 2.6); // pad, flame trench
  const th = 2.6 + t * 0.6; for (const [x, z] of [[-1.7, -0.55], [-1.7, 0.55], [-2.5, -0.55], [-2.5, 0.55]]) k.box(0.08, th, 0.08, '#c0392b', x, 0.1, z);
  for (let y = 0.6; y < th; y += 0.55) { k.box(0.9, 0.05, 1.18, '#c0392b', -2.1, 0.1 + y, 0); } k.box(1.0, 0.12, 1.2, '#7d838c', -2.1, 0.1 + th, 0);
  k.box(0.7, 0.06, 0.1, STEEL, -1.4, 0.1 + th * 0.75, 0); // crew access arm
  for (const [x, z] of [[2.5, 2.5], [-2.5, 2.5], [2.5, -2.5]]) { k.cyl(0.04, 0.06, th + 1.2, 5, STEEL, x, 0.1, z); k.sphere(0.06, '#ff4f4f', x, th + 1.35, z, { glow: true }); } // lightning masts
  k.cyl(0.35, 0.35, 0.5, 10, '#e9edf2', 2.3, 1.6, -2.2); k.box(0.06, 1.5, 0.06, STEEL, 2.1, 0.1, -2.0); k.box(0.06, 1.5, 0.06, STEEL, 2.5, 0.1, -2.4); // water tower
  k.box(1.2, 0.5, 0.8, A, 2.0, 0.1, 0.4); windows(k, 1.2, 0.8, 0.25, 0.12, 2.0, 0.4);
  return { group: k.build('launch'), height: th + 1.6 };
}
function vab(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), P = '#e6e9ed', A = look.accent; pad(k, 4, 5);
  const h = 2.6 + t * 0.55; k.box(3.4, h, 4.2, P, 0, 0.1, 0); k.box(3.45, 0.14, 4.25, shade(P, -0.15), 0, 0.1 + h, 0);
  k.box(1.3, h - 0.3, 0.04, '#9aa3ad', 0, 0.1, 2.11); for (let y = 0.5; y < h - 0.3; y += 0.45) k.box(1.32, 0.03, 0.05, '#7c858f', 0, 0.1 + y, 2.12); // the great door
  k.box(0.05, h * 0.7, 1.4, look.banner.bg, 1.71, 0.1 + h * 0.2, -0.6); k.box(0.06, h * 0.12, 1.4, A, 1.72, 0.1 + h * 0.5, -0.6);
  k.box(1.2, 0.7, 1.6, shade(P, -0.05), -2.25, 0.1, 1.2); windows(k, 1.2, 1.6, 0.3, 0.14, -2.25, 1.2);
  return { group: k.build('vab'), height: h + 0.4 };
}
function tracking(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L); pad(k, 4, 4); k.box(1.1, 0.6, 0.9, '#d9dde2', 1.2, 0.1, 1.3); windows(k, 1.1, 0.9, 0.3, 0.12, 1.2, 1.3);
  const s = 1.1 + t * 0.15; k.cyl(0.25, 0.4, 1.0 + t * 0.1, 8, '#c9ced5', -0.3, 0.1, -0.3); const g = k.build('tracking');
  const dish = new THREE.Group(); const dk = new Kit(); dk.add(new THREE.SphereGeometry(s, 20, 10, 0, Math.PI * 2, 0, Math.PI / 3.4), '#f3f5f8', 0, 0, 0, { rx: Math.PI }); dk.cyl(0.03, 0.03, s * 0.8, 4, STEEL, 0, -s * 0.85, 0); dk.sphere(0.08, look.accent, 0, -s * 1.25, 0);
  const dg = dk.build(); dg.rotation.x = -0.75; dish.add(dg); dish.position.set(-0.3, 1.3 + t * 0.1 + s * 0.4, -0.3); g.add(dish);
  for (let i = 0; i < Math.min(3, t - 1); i++) { const sk = new Kit(); sk.cyl(0.04, 0.06, 0.5, 6, STEEL, 0, 0, 0); sk.add(new THREE.SphereGeometry(0.35, 12, 6, 0, Math.PI * 2, 0, Math.PI / 3.2), '#eef2f6', 0, 0.85, 0, { rx: Math.PI - 0.7 }); const sg = sk.build(); sg.position.set(1.3 - i * 0.7, 0.1, -1.4); g.add(sg); }
  return { group: g, height: 2.4 + t * 0.3, anim: (tt) => { dish.rotation.y = Math.sin(tt * 0.12) * 1.2; } };
}
function academy(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), P = look.primary, A = look.accent; pad(k, 4, 4);
  k.box(2.4, 0.9 + t * 0.12, 1.4, P, -0.6, 0.1, -1.1); windows(k, 2.4, 1.4, 0.4, 0.2, -0.6, -1.1); k.box(2.45, 0.08, 1.45, A, -0.6, 1.0 + t * 0.12, -1.1);
  k.box(1.4, 0.06, 1.0, '#4fb3e8', 1.0, 0.1, 1.0, { glass: true }); k.box(1.5, 0.1, 1.1, '#e9edf2', 1.0, 0.08, 1.0); // training pool
  k.cyl(0.35, 0.45, 0.5, 10, '#d9dde2', -0.6, 0.1, 0.8); const g = k.build('academy');
  const arm = new THREE.Group(); const ak = new Kit(); ak.box(2.2, 0.08, 0.12, STEEL, 0, 0, 0); ak.sphere(0.2, A, 1.1, 0, 0, { w: 10, h: 7 }); ak.box(0.25, 0.25, 0.25, '#eef0f3', -1.1, -0.1, 0); arm.add(ak.build()); arm.position.set(-0.6, 0.75, 0.8); g.add(arm);
  return { group: g, height: 1.6 + t * 0.15, anim: (tt) => { arm.rotation.y = tt * 1.6; } };
}
function workshop(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), P = look.primary, A = look.accent; pad(k, 4, 4);
  const h = 1.0 + t * 0.12; k.box(2.8, h, 2.2, P, -0.3, 0.1, -0.4); for (let i = 0; i < 4; i++) k.add(new THREE.CylinderGeometry(0.35, 0.35, 2.2, 3, 1, false, 0, Math.PI), shade(P, -0.1), -1.35 + i * 0.7, 0.1 + h, -0.4, { rx: Math.PI / 2, rz: Math.PI / 2 }); // sawtooth roof
  windows(k, 2.8, 2.2, 0.35, 0.22, -0.3, -0.4); k.box(1.0, h - 0.2, 0.05, '#2b3340', -0.3, 0.1, 0.72); k.box(1.04, 0.08, 0.08, A, -0.3, h - 0.12, 0.73);
  for (let i = 0; i < Math.min(3, 1 + Math.floor(t / 2)); i++) { k.cyl(0.18, 0.2, 0.32, 10, '#e9edf2', 1.45, 0.1, -1.2 + i * 0.6); k.sphere(0.13, A, 1.45, 0.52, -1.2 + i * 0.6, { glow: true, w: 10, h: 7 }); } // core pods
  k.box(1.6, 0.1, 0.4, DARK, 0.4, 0.15, 1.35); const g = k.build('workshop');
  const arm = new THREE.Group(); const ak = new Kit(); ak.cyl(0.12, 0.16, 0.25, 8, '#f5c542', 0, 0, 0); ak.box(0.1, 0.8, 0.1, '#f5c542', 0, 0.25, 0); const ag = ak.build(); arm.add(ag); const fore = new THREE.Group(); const fk = new Kit(); fk.box(0.08, 0.6, 0.08, '#f5c542', 0, 0, 0); fk.sphere(0.06, '#7ff5ff', 0, 0.62, 0, { glow: true }); fore.add(fk.build()); fore.position.y = 1.0; arm.add(fore); arm.position.set(1.0, 0.1, 1.15); g.add(arm);
  return { group: g, height: h + 0.8, anim: (tt, st) => { const w = st.working ? 1 : 0.2; arm.rotation.y = Math.sin(tt * 0.9) * 1.2 * w; fore.rotation.z = -0.6 + Math.sin(tt * 1.7) * 0.5 * w; } };
}
function dock(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), A = look.accent; pad(k, 3, 3, '#c3c8cf');
  const n = Math.min(4, 2 + Math.floor(t / 2)); const rings: THREE.Mesh[] = [];
  for (let i = 0; i < n; i++) { const x = -0.9 + (i % 2) * 1.8, z = -0.7 + Math.floor(i / 2) * 1.3; k.cyl(0.42, 0.46, 0.12, 14, '#8a939e', x, 0.1, z); k.box(0.08, 0.9, 0.08, '#9aa3ad', x - 0.35, 0.1, z); k.box(0.35, 0.06, 0.06, '#9aa3ad', x - 0.18, 0.95, z); }
  k.box(2.6, 0.06, 0.2, A, 0, 1.2, 0); k.box(0.1, 1.1, 0.1, '#9aa3ad', -1.25, 0.1, 0); k.box(0.1, 1.1, 0.1, '#9aa3ad', 1.25, 0.1, 0); const g = k.build('dock');
  for (let i = 0; i < n; i++) { const x = -0.9 + (i % 2) * 1.8, z = -0.7 + Math.floor(i / 2) * 1.3; const r = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 6, 24), new THREE.MeshBasicMaterial({ color: A, toneMapped: false, transparent: true, opacity: 0.8 })); r.rotation.x = Math.PI / 2; r.position.set(x, 0.3, z); g.add(r); rings.push(r); }
  return { group: g, height: 1.4, anim: (tt) => rings.forEach((r, i) => { r.position.y = 0.25 + ((tt * 0.6 + i * 0.3) % 1) * 0.6; (r.material as THREE.MeshBasicMaterial).opacity = 0.9 - ((tt * 0.6 + i * 0.3) % 1) * 0.8; }) };
}
function cellplant(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), A = look.accent; pad(k, 3, 3);
  const rows = Math.min(3, 1 + Math.floor(t / 2)); for (let r = 0; r < rows; r++) { const z = -0.9 + r * 0.8; k.box(2.0, 0.08, 0.5, '#5b6676', -0.3, 0.1, z); for (let i = 0; i < 6; i++) { k.cyl(0.11, 0.11, 0.42, 8, '#7cf29a', -1.1 + i * 0.32, 0.18, z, { glow: true }); k.cyl(0.08, 0.08, 0.05, 8, '#e9edf2', -1.1 + i * 0.32, 0.6, z); } }
  k.box(0.7, 0.8, 0.7, '#d9dde2', 1.05, 0.1, 0.8); k.box(0.72, 0.08, 0.72, A, 1.05, 0.9, 0.8); for (let i = 0; i < 3; i++) k.cyl(0.05, 0.05, 0.3, 6, '#9aa3ad', 0.85 + i * 0.2, 0.98, 0.8);
  return { group: k.build('cellplant'), height: 1.2 };
}
function fusionlab(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), P = look.primary, A = look.accent; pad(k, 4, 4);
  for (const x of [-1.15, 1.15]) { k.cyl(0.55, 0.6, 1.1 + t * 0.1, 12, P, x, 0.1, -0.2); k.sphere(0.55, shade(P, -0.05), x, 1.2 + t * 0.1, -0.2, { theta: Math.PI / 2, w: 14 }); k.cyl(0.57, 0.57, 0.08, 12, A, x, 0.6, -0.2); }
  k.cyl(0.22, 0.22, 1.6, 10, '#9aa3ad', 0, 0.75, -0.2, { rz: Math.PI / 2 }); k.box(2.6, 0.5, 0.9, shade(P, -0.08), 0, 0.1, 1.2); windows(k, 2.6, 0.9, 0.22, 0.14, 0, 1.2);
  const g = k.build('fusionlab'); const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), new THREE.MeshBasicMaterial({ color: '#c49bff', toneMapped: false })); core.position.set(0, 1.0, -0.2); g.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 6, 28), new THREE.MeshBasicMaterial({ color: '#ff9be8', toneMapped: false })); ring.position.copy(core.position); g.add(ring);
  return { group: g, height: 1.9 + t * 0.1, anim: (tt, st) => { const w = st.working ? 1 : 0.3; core.rotation.y = tt * 1.5; core.scale.setScalar(0.85 + Math.sin(tt * 4) * 0.12 * w); ring.rotation.x = tt * 1.1; ring.rotation.y = tt * 0.7; } };
}
// ---------------- colony buildings ----------------
const REG = '#a8a9ad'; // regolith-dusted concrete
function hub(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), P = look.primary, A = look.accent; pad(k, 5, 5, REG);
  k.cyl(1.25, 1.35, 0.9 + t * 0.12, 10, P, 0, 0.1, 0); k.sphere(1.25, shade(P, -0.04), 0, 1.0 + t * 0.12, 0, { theta: Math.PI / 2, w: 16, h: 8 }); k.cyl(1.37, 1.37, 0.1, 10, A, 0, 0.55, 0); windows(k, 2.3, 2.3, 0.45, 0.2);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; k.cyl(0.32, 0.32, 1.1, 10, '#d9dde2', Math.cos(a) * 1.65, 0.12, Math.sin(a) * 1.65, { rz: Math.PI / 2, ry: -a }); k.box(0.7, 0.75, 0.7, P, Math.cos(a) * 2.05, 0.1, Math.sin(a) * 2.05, { ry: -a }); k.box(0.3, 0.4, 0.04, '#2b3340', Math.cos(a) * 2.42, 0.1, Math.sin(a) * 2.42, { ry: -a + Math.PI / 2 }); } // airlock tubes
  k.cyl(0.03, 0.03, 1.6, 5, STEEL, 0.3, 1.6 + t * 0.12, 0.2); k.sphere(0.07, '#ff4f4f', 0.3, 3.25 + t * 0.12, 0.2, { glow: true });
  const g = k.build('hub'); const dish = new THREE.Group(); const dk = new Kit(); dk.add(new THREE.SphereGeometry(0.45, 14, 6, 0, Math.PI * 2, 0, Math.PI / 3.2), '#eef2f6', 0, 0, 0, { rx: Math.PI }); const dg = dk.build(); dg.rotation.x = -0.8; dish.add(dg); dish.position.set(-0.5, 2.2 + t * 0.12, -0.3); g.add(dish);
  return { group: g, height: 2.6 + t * 0.12, anim: (tt) => { dish.rotation.y = tt * 0.3; } };
}
function regolith(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L); pad(k, 3, 3, '#7c7d82');
  k.add(new THREE.ConeGeometry(0.75, 0.6 + t * 0.06, 8), '#8c8d91', -0.6, 0.4, -0.5); k.box(1.1, 0.8, 0.9, '#d9dde2', 0.6, 0.1, 0.5); windows(k, 1.1, 0.9, 0.35, 0.14, 0.6, 0.5); k.cyl(0.18, 0.22, 1.3 + t * 0.15, 8, '#9aa3ad', 0.95, 0.1, -0.7); k.cyl(0.24, 0.24, 0.06, 8, look.accent, 0.95, 0.9, -0.7);
  k.box(0.18, 0.1, 1.3, '#3b4350', 0.0, 0.5, 0.0, { rx: -0.3, ry: 0.8 }); const g = k.build('regolith');
  const rover = new THREE.Group(); const rk = new Kit(); rk.box(0.45, 0.18, 0.3, '#f5c542', 0, 0.12, 0); rk.box(0.2, 0.18, 0.28, '#e9edf2', 0.12, 0.3, 0); for (const [x, z] of [[-0.16, 0.17], [0.16, 0.17], [-0.16, -0.17], [0.16, -0.17]]) rk.cyl(0.08, 0.08, 0.06, 8, '#2b2f36', x, 0.08, z, { rx: Math.PI / 2 }); rk.box(0.06, 0.06, 0.45, '#f5c542', -0.3, 0.25, 0, { rz: 0.5 }); rover.add(rk.build()); g.add(rover);
  return { group: g, height: 1.6 + t * 0.15, anim: (tt, st) => { const a = st.working ? tt * 0.5 : 0; rover.position.set(Math.cos(a) * 0.9 - 0.2, 0.05, Math.sin(a) * 0.9); rover.rotation.y = -a - Math.PI / 2; } };
}
function ice(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L); pad(k, 3, 3, REG);
  k.cyl(0.5, 0.55, 0.9 + t * 0.12, 12, '#e9f4ff', -0.6, 0.1, -0.5); k.sphere(0.5, '#cfe8ff', -0.6, 1.0 + t * 0.12, -0.5, { theta: Math.PI / 2, w: 12 }); k.cyl(0.52, 0.52, 0.06, 12, '#4fb3e8', -0.6, 0.6, -0.5);
  k.box(1.0, 0.6, 0.8, '#d9dde2', 0.6, 0.1, 0.6); windows(k, 1.0, 0.8, 0.28, 0.12, 0.6, 0.6); k.cyl(0.08, 0.08, 1.5, 6, '#9aa3ad', 0.2, 0.32, -0.6, { rz: Math.PI / 2 }); k.box(0.5, 0.05, 0.5, '#8fd6ff', -0.6, 0.1, 0.9, { glass: true });
  for (let i = 0; i < 2 + Math.floor(t / 2); i++) k.cyl(0.14, 0.14, 0.4, 8, '#bfe6ff', 1.05, 0.1, -0.9 + i * 0.35);
  return { group: k.build('ice'), height: 1.6 + t * 0.12 };
}
function he3x(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L); pad(k, 3, 3, '#7c7d82'); k.cyl(0.75, 0.85, 0.5, 12, '#c9ced5', -0.3, 0.1, -0.3); k.cyl(0.55, 0.65, 0.7 + t * 0.1, 12, '#e6e9ee', -0.3, 0.6, -0.3); k.cyl(0.57, 0.57, 0.06, 12, '#b892ff', -0.3, 1.0, -0.3, { glow: true });
  k.box(0.9, 0.5, 0.6, '#d9dde2', 0.8, 0.1, 0.8); for (let i = 0; i < 3; i++) k.sphere(0.2, '#b892ff', 0.95 - i * 0.45, 0.3, -1.05, { w: 10, h: 7 });
  return { group: k.build('he3x'), height: 1.6 + t * 0.1 };
}
function lsolar(L: number): Model {
  const k = new Kit(), t = tierOf(L); pad(k, 3, 3, '#7c7d82'); const n = Math.min(4, 2 + Math.floor(t / 2));
  for (let i = 0; i < n; i++) { const x = -0.9 + (i % 2) * 1.8, z = -0.8 + Math.floor(i / 2) * 1.6; k.cyl(0.04, 0.05, 1.1, 5, STEEL, x, 0.1, z); k.box(1.4, 0.03, 0.7, '#1d3c78', x, 1.2, z, { rx: -0.4 }); k.box(1.42, 0.015, 0.72, '#4f7fd6', x, 1.22, z + 0.01, { rx: -0.4 }); }
  return { group: k.build('lsolar'), height: 1.5 };
}
// the iconic glass dome: gardens and homes under glass
function dome(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), A = look.accent; pad(k, 4, 4, REG); const R = 1.55 + t * 0.06;
  k.cyl(R + 0.08, R + 0.12, 0.3, 24, '#d9dde2', 0, 0.1, 0); k.cyl(R + 0.1, R + 0.1, 0.06, 24, A, 0, 0.36, 0);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const x = Math.cos(a) * R * 0.55, z = Math.sin(a) * R * 0.55; if (i % 2) { k.cyl(0.04, 0.05, 0.35, 5, '#6b4a2e', x, 0.4, z); k.sphere(0.24, '#3f9a4a', x, 0.85, z, { w: 8, h: 6 }); } else { k.box(0.4, 0.38 + (i % 3) * 0.12, 0.4, '#f1f3f5', x, 0.4, z); k.box(0.42, 0.06, 0.42, A, x, 0.78 + (i % 3) * 0.12, z); } }
  k.cyl(0.25, 0.25, 0.08, 10, '#4fb3e8', 0, 0.4, 0, { glass: true }); k.sphere(R, '#bfe6ff', 0, 0.38, 0, { theta: Math.PI / 2, w: 22, h: 10, glass: true });
  for (let i = 0; i < 6; i++) k.add(new THREE.TorusGeometry(R, 0.018, 4, 24, Math.PI), '#e9edf2', 0, 0.38, 0, { ry: (i / 6) * Math.PI }); // glazing ribs
  k.box(0.5, 0.45, 0.6, '#d9dde2', 0, 0.1, R + 0.15); k.box(0.3, 0.36, 0.04, '#2b3340', 0, 0.1, R + 0.46);
  return { group: k.build('dome'), height: R + 0.5 };
}
// underground: a regolith mound over the tunnels, skylights and an airlock
function burrow(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), A = look.accent; pad(k, 4, 4, '#8a8b8f');
  k.add(new THREE.SphereGeometry(1.7, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#8f9094', 0, 0.08, 0, { sy: 0.32 }); k.add(new THREE.SphereGeometry(1.2, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#9a9b9f', 0.3, 0.1, -0.2, { sy: 0.4 });
  for (let i = 0; i < 2 + Math.floor(t / 2); i++) { const a = i * 2.1; k.cyl(0.16, 0.16, 0.05, 10, '#ffe7a8', Math.cos(a) * 0.8, 0.5 - i * 0.03, Math.sin(a) * 0.8, { glow: true }); }
  k.box(0.7, 0.55, 0.8, '#d9dde2', 0, 0.08, 1.45); k.box(0.72, 0.06, 0.82, A, 0, 0.6, 1.45); k.box(0.36, 0.42, 0.04, '#2b3340', 0, 0.08, 1.86); k.cyl(0.06, 0.06, 0.7, 6, '#9aa3ad', -0.9, 0.3, -0.6); k.cyl(0.06, 0.06, 0.55, 6, '#9aa3ad', 0.9, 0.3, 0.2);
  return { group: k.build('burrow'), height: 1.0 };
}
function llab(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), P = look.primary, A = look.accent; pad(k, 4, 4, REG); k.box(2.2, 0.9 + t * 0.1, 1.4, P, -0.5, 0.1, 0.6); windows(k, 2.2, 1.4, 0.4, 0.2, -0.5, 0.6); k.box(2.25, 0.08, 1.45, A, -0.5, 1.0 + t * 0.1, 0.6);
  const g = k.build('llab'); const dish = new THREE.Group(); const dk = new Kit(); dk.add(new THREE.SphereGeometry(0.9, 18, 8, 0, Math.PI * 2, 0, Math.PI / 3.2), '#f3f5f8', 0, 0, 0, { rx: Math.PI }); dk.cyl(0.25, 0.35, 0.6, 8, '#c9ced5', 0, -1.3, 0); const dg = dk.build(); dg.rotation.x = -0.7; dish.add(dg); dish.position.set(1.0, 1.4, -0.9); g.add(dish);
  return { group: g, height: 2.2, anim: (tt) => { dish.rotation.y = Math.sin(tt * 0.1) * 1.5; } };
}
function greenhouse(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L); pad(k, 4, 3, REG); const n = Math.min(3, 1 + Math.floor(t / 2));
  for (let i = 0; i < n; i++) { const z = -0.9 + i * 0.9; k.add(new THREE.CylinderGeometry(0.4, 0.4, 3.2, 12, 1, false, 0, Math.PI), '#bfe6ff', 0, 0.12, z, { rz: Math.PI / 2, ry: Math.PI / 2, glass: true }); k.box(3.1, 0.12, 0.7, '#5b3a22', 0, 0.12, z); for (let x = -1.3; x <= 1.3; x += 0.32) k.sphere(0.12, x % 0.64 ? '#4fcf5a' : '#7cf29a', x, 0.3, z, { w: 6, h: 4 }); k.box(3.15, 0.04, 0.05, '#ff9be8', 0, 0.5, z, { glow: true }); }
  return { group: k.build('greenhouse'), height: 0.9 };
}
function reactor(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L); pad(k, 3, 3, REG); k.add(new THREE.SphereGeometry(1.0, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), '#8f9094', 0, 0.08, 0, { sy: 0.45 }); k.cyl(0.35, 0.4, 0.7 + t * 0.08, 10, '#e6e9ee', 0, 0.4, 0); k.cyl(0.37, 0.37, 0.06, 10, '#7fe4ff', 0, 0.9, 0, { glow: true });
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; k.box(0.5, 0.04, 0.9, '#9aa3ad', Math.cos(a) * 1.1, 0.2, Math.sin(a) * 1.1, { ry: -a }); } // radiator fins
  k.box(0.06, 0.4, 0.06, '#f5c542', 1.2, 0.1, 1.2); k.box(0.3, 0.3, 0.02, '#f5c542', 1.2, 0.5, 1.2);
  return { group: k.build('reactor'), height: 1.4 };
}
// rising puffs (steam, vented gas): a few soft spheres that loop upward and fade
function plume(color: string, n: number, h: number, size: number) { const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false });
  for (let i = 0; i < n; i++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1), m.clone()); p.userData.o = i / n; g.add(p); }
  const step = (tt: number, on: boolean) => { g.visible = on; g.children.forEach((p) => { const f = (tt * 0.22 + (p.userData.o as number)) % 1; p.position.set(Math.sin(f * 6 + (p.userData.o as number) * 9) * 0.15, f * h, f * 0.4); p.scale.setScalar(0.5 + f * 1.4); ((p as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - f); }); };
  return { g, step };
}
// Venus: intake booms that dangle into the clouds below, a compressor, acid-crackers and water tanks; the turbine spins
function skimmer(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), A = look.accent; pad(k, 3, 3, '#d8d2c2');
  k.cyl(0.55, 0.62, 0.6, 12, '#ece6d4', -0.55, 0.1, -0.5); k.cyl(0.57, 0.57, 0.06, 12, A, -0.55, 0.7, -0.5); k.sphere(0.55, '#f4efe2', -0.55, 0.72, -0.5, { theta: Math.PI / 2, w: 12 });
  for (let i = 0; i < 2; i++) { k.cyl(0.24, 0.24, 0.8 + t * 0.08, 10, '#9fd3ff', 0.75, 0.1, -0.75 + i * 0.6, { glass: true }); k.cyl(0.26, 0.26, 0.05, 10, '#e9edf2', 0.75, 0.88 + t * 0.08, -0.75 + i * 0.6); }
  k.box(1.6, 0.09, 0.09, '#c9ced5', 0.1, 0.55, 0.8); for (const x of [-0.6, 0.8]) k.cyl(0.07, 0.07, 0.55, 6, '#c9ced5', x, 0.1, 0.8); // pipe rack
  const mh = 1.5 + t * 0.2; k.cyl(0.06, 0.09, mh, 6, '#dfe3e8', -1.0, 0.1, 0.75); k.box(0.3, 0.2, 0.3, A, -1.0, 0.1 + mh, 0.75);
  const g = k.build('skimmer'); const rot = new THREE.Group(); const rk = new Kit(); for (let i = 0; i < 3; i++) rk.box(0.07, 0.02, 0.62, '#f6f8fb', 0, 0, 0.31, { ry: (i / 3) * Math.PI * 2 }); const rg = rk.build(); rg.rotation.x = Math.PI / 2; rot.add(rg); rot.position.set(-1.0, 0.25 + mh, 0.95); g.add(rot);
  return { group: g, height: mh + 0.6, anim: (tt, s) => { rot.rotation.z = tt * (s.working ? 4 : 0.6); } };
}
// Venus: a glass pavilion on the city's edge, palm courts inside and a pleasure balloon tethered above
function resort(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), A = look.accent; pad(k, 4, 4, '#e6e0d0'); const R = 1.35 + t * 0.05;
  k.cyl(R + 0.1, R + 0.15, 0.25, 20, '#f6f2e8', 0, 0.1, 0); k.cyl(R, R, 0.7 + t * 0.06, 20, '#9fd3ff', 0, 0.35, 0, { glass: true }); k.cyl(R + 0.08, R + 0.08, 0.1, 20, A, 0, 1.05 + t * 0.06, 0); k.add(new THREE.ConeGeometry(R + 0.1, 0.45, 20), '#fbf8f0', 0, 1.35 + t * 0.06, 0);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3; const x = Math.cos(a) * R * 0.55, z = Math.sin(a) * R * 0.55; k.cyl(0.03, 0.04, 0.45, 5, '#8a6a44', x, 0.35, z); k.sphere(0.2, '#4fcf5a', x, 0.85, z, { w: 7, h: 5 }); }
  k.box(0.04, 0.04, 0.04, '#ffe7a8', 0, 0.5, 0, { glow: true }); k.cyl(0.25, 0.25, 0.05, 12, '#ffe7a8', 0, 0.36, 0, { glow: true });
  const g = k.build('resort'); const bal = new THREE.Group(); const bk = new Kit(); bk.sphere(0.55, '#ffd36a', 0, 0, 0, { w: 14, h: 10 }); bk.sphere(0.56, '#ff8a5b', 0, 0, 0, { w: 14, h: 10, theta: 0.5 }); bk.box(0.22, 0.14, 0.22, '#8a6a44', 0, -0.85, 0); bk.cyl(0.006, 0.006, 0.4, 3, '#555', 0, -0.72, 0);
  bal.add(bk.build()); bal.position.set(R * 0.7, 3.0, -R * 0.6); g.add(bal); const tether = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.6, 3), new THREE.MeshBasicMaterial({ color: '#cfd3d8' })); tether.position.set(R * 0.7, 1.4, -R * 0.6); g.add(tether);
  return { group: g, height: 2.6, anim: (tt) => { bal.position.y = 3.0 + Math.sin(tt * 0.8) * 0.12; bal.rotation.y = tt * 0.2; } };
}
// changing a world: cracking towers venting greenhouse gas, a control block and a dish talking to the mirror fleets
function terraformer(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), P = look.primary, A = look.accent; pad(k, 4, 4, REG);
  k.box(2.0, 0.9, 1.3, P, -0.7, 0.1, 0.9); windows(k, 2.0, 1.3, 0.4, 0.2, -0.7, 0.9); k.box(2.05, 0.08, 1.35, A, -0.7, 1.0, 0.9);
  const n = Math.min(3, 1 + Math.floor(t / 2)), sh = 2.2 + t * 0.3; for (let i = 0; i < n; i++) { const x = -1.2 + i * 0.85, z = -0.8; k.cyl(0.26, 0.38, sh, 10, '#d9dde2', x, 0.1, z); for (let y = 0.5; y < sh - 0.2; y += 0.6) k.cyl(0.3, 0.3, 0.05, 10, A, x, 0.1 + y, z); k.cyl(0.27, 0.27, 0.06, 10, '#ff8a3c', x, 0.1 + sh, z, { glow: true }); }
  const g = k.build('terraformer'); const plumes = Array.from({ length: n }, (_, i) => { const p = plume('#f7e4c8', 5, 2.6, 0.32); p.g.position.set(-1.2 + i * 0.85, 0.2 + sh, -0.8); g.add(p.g); return p; });
  const dish = new THREE.Group(); const dk = new Kit(); dk.add(new THREE.SphereGeometry(0.55, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3.2), '#f3f5f8', 0, 0, 0, { rx: Math.PI }); dk.cyl(0.08, 0.12, 0.6, 6, '#c9ced5', 0, -0.9, 0); const dg = dk.build(); dg.rotation.x = -0.9; dish.add(dg); dish.position.set(1.1, 1.0, 0.9); g.add(dish);
  return { group: g, height: sh + 0.8, anim: (tt, s) => { plumes.forEach((p, i) => p.step(tt + i * 0.37, s.working)); dish.rotation.y = tt * 0.15; } };
}
// Ceres: the control tower for a thousand mining tugs, with a pad and a tug resting on it
function beltControl(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), P = look.primary, A = look.accent; pad(k, 4, 4, REG); const th = 1.8 + t * 0.25;
  k.cyl(0.42, 0.55, th, 10, P, -0.9, 0.1, -0.9); k.cyl(0.75, 0.6, 0.45, 10, '#d9dde2', -0.9, 0.1 + th, -0.9); k.cyl(0.76, 0.76, 0.14, 10, WIN, -0.9, 0.22 + th, -0.9, { glow: true }); k.cyl(0.78, 0.78, 0.05, 10, A, -0.9, 0.55 + th, -0.9);
  k.cyl(1.0, 1.0, 0.06, 16, '#6a6e76', 0.7, 0.1, 0.7); k.add(new THREE.RingGeometry(0.75, 0.85, 16), '#f5c542', 0.7, 0.17, 0.7, { rx: -Math.PI / 2 }); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.78; k.box(0.08, 0.05, 0.08, '#ff5a6a', 0.7 + Math.cos(a) * 1.0, 0.16, 0.7 + Math.sin(a) * 1.0, { glow: true }); }
  k.box(0.8, 0.32, 0.5, '#eef0f3', 0.7, 0.2, 0.7); k.box(0.3, 0.2, 0.52, '#3b4350', 1.0, 0.36, 0.7); for (const s of [-1, 1]) k.box(0.1, 0.18, 0.62, '#9aa3ad', 0.45 + s * 0.3, 0.12, 0.7);
  const g = k.build('beltControl'); const radar = new THREE.Group(); const rk = new Kit(); rk.box(0.9, 0.22, 0.05, '#f3f5f8', 0, 0, 0); rk.cyl(0.03, 0.03, 0.3, 5, STEEL, 0, -0.3, 0); radar.add(rk.build()); radar.position.set(-0.9, 0.95 + th, -0.9); g.add(radar);
  return { group: g, height: th + 1.2, anim: (tt) => { radar.rotation.y = tt * 1.4; } };
}
// Titan: spherical methane tanks, a pump house, pipework and a flare that burns off the excess
function methane(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), A = look.accent; pad(k, 3, 3, '#8a7a66');
  for (let i = 0; i < Math.min(3, 1 + Math.floor(t / 2)); i++) { const x = -0.75 + i * 0.75, z = -0.6; k.sphere(0.38, '#eceef1', x, 0.62, z, { w: 14, h: 10 }); for (const s of [-1, 1]) k.cyl(0.03, 0.03, 0.42, 4, STEEL, x + s * 0.25, 0.1, z); }
  k.box(1.1, 0.5, 0.7, '#c9cdd3', -0.4, 0.1, 0.65); k.box(1.12, 0.05, 0.72, A, -0.4, 0.6, 0.65); k.box(0.09, 0.09, 1.5, '#9aa3ad', 0.65, 0.3, 0.1);
  const fh = 1.6 + t * 0.15; k.cyl(0.05, 0.07, fh, 6, '#b8bec6', 1.05, 0.1, 0.8); const g = k.build('methane');
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 7), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.85, toneMapped: false })); flame.position.set(1.05, 0.3 + fh, 0.8); g.add(flame);
  return { group: g, height: fh + 0.6, anim: (tt, s) => { flame.visible = s.working; flame.scale.set(1, 0.8 + Math.sin(tt * 11) * 0.25 + Math.sin(tt * 6.1) * 0.15, 1); } };
}
function massDriver(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L); pad(k, 2, 7, REG); for (let i = 0; i < 7; i++) { const z = -3 + i; const h = 0.3 + i * 0.14; k.box(0.12, h, 0.12, '#9aa3ad', -0.5, 0.1, z); k.box(0.12, h, 0.12, '#9aa3ad', 0.5, 0.1, z); k.box(1.1, 0.06, 0.12, '#9aa3ad', 0, 0.1 + h, z); }
  k.box(0.5, 0.08, 7, '#3b4350', 0, 0.42, 0, { rx: -0.14 }); for (let i = 0; i < 7; i++) k.box(0.7, 0.05, 0.08, '#7fe4ff', 0, 0.48 + i * 0.14, -3 + i, { glow: true }); k.box(0.9, 0.5, 0.8, '#d9dde2', 0, 0.1, -3.1);
  return { group: k.build('massDriver'), height: 1.4 };
}
function fusionPlant(L: number, look: Look): Model {
  const k = new Kit(), t = tierOf(L), A = look.accent; pad(k, 4, 4); k.add(new THREE.TorusGeometry(1.0, 0.38, 10, 24), '#d9dde2', 0, 0.6, 0, { rx: Math.PI / 2 }); k.cyl(0.62, 0.62, 0.7, 14, '#c9ced5', 0, 0.25, 0); k.add(new THREE.TorusGeometry(1.0, 0.1, 6, 24), A, 0, 0.98, 0, { rx: Math.PI / 2, glow: true });
  k.box(1.2, 0.8, 0.8, '#e6e9ee', 0.9, 0.1, 1.3); windows(k, 1.2, 0.8, 0.35, 0.14, 0.9, 1.3); const g = k.build('fusion');
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), new THREE.MeshBasicMaterial({ color: '#c49bff', toneMapped: false })); core.position.y = 1.15; g.add(core);
  return { group: g, height: 1.6, anim: (tt, st) => { core.scale.setScalar(0.8 + (st.working ? Math.sin(tt * 6) * 0.2 : 0)); } };
}
// unknown types (later parts) get a placeholder block so the base never breaks
function generic(b: string, look: Look): Model { const d = BUILDINGS[b]; const [w, dd] = d ? d.fp : [3, 3]; const k = new Kit(); pad(k, w, dd); k.box(w * 0.7, 1.2, dd * 0.7, look.primary, 0, 0.1, 0); windows(k, w * 0.7, dd * 0.7, 0.5, 0.2); k.box(w * 0.72, 0.1, dd * 0.72, look.accent, 0, 1.3, 0); return { group: k.build(b), height: 1.6 }; }
export function buildModel(b: string, L: number, look: Look): Model {
  switch (b) {
    case 'hq': return hq(L, look); case 'research': return research(L, look); case 'university': return university(L, look); case 'mine': return mine(L, look);
    case 'refinery': return refinery(L, look); case 'office': return office(L, look); case 'solar': return solar(L); case 'fission': return fission(L, look); case 'depot': return depot(L, look);
    case 'launch': return launch(L, look); case 'vab': return vab(L, look); case 'tracking': return tracking(L, look); case 'academy': return academy(L, look);
    case 'workshop': return workshop(L, look); case 'dock': return dock(L, look); case 'cellplant': return cellplant(L, look); case 'fusionlab': return fusionlab(L, look);
    case 'hub': return hub(L, look); case 'regolith': return regolith(L, look); case 'ice': return ice(L, look); case 'he3x': return he3x(L, look); case 'lsolar': return lsolar(L); case 'dome': return dome(L, look); case 'burrow': return burrow(L, look);
    case 'skimmer': return skimmer(L, look); case 'resort': return resort(L, look); case 'terraformer': return terraformer(L, look); case 'beltControl': return beltControl(L, look); case 'methane': return methane(L, look);
    case 'llab': return llab(L, look); case 'greenhouse': return greenhouse(L, look); case 'reactor': return reactor(L, look); case 'massDriver': return massDriver(L, look); case 'fusion': return fusionPlant(L, look);
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
  else g.arc(0, 0, r * 0.8, 0, 7);
  g.closePath();
}
export function bannerTexture(b: { bg: string; fg: string; emblem: string }) {
  const key = b.bg + b.fg + b.emblem; const hit = texCache.get(key); if (hit) return hit;
  const c = document.createElement('canvas'); c.width = 128; c.height = 80; const g = c.getContext('2d')!; g.fillStyle = b.bg; g.fillRect(0, 0, 128, 80); g.fillStyle = b.fg; g.translate(64, 40); emblemPath(g, b.emblem, 24); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; texCache.set(key, t); return t;
}
