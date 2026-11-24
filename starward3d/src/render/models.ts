// Procedural building models. Every building grows with its level and wears the player's paint scheme, so no
// two colonies look the same. Animated parts (beacons, holograms, flags, arms) stay separate meshes.
import * as THREE from 'three';
import { Kit, shade, mix, MATS } from './kit';
import { ELEMENTS } from '../data/elements';
export interface Look { primary: string; accent: string; banner: { bg: string; fg: string; emblem: string }; noRocket?: boolean; }
export interface AnimState { working?: boolean; ready?: number; cores?: { color: string; ready: boolean }[]; }
export interface Model { group: THREE.Group; height: number; anim?: (t: number, k: AnimState) => void; }
const STEEL = '#c8d0da', DARK = '#3a4250', GLASSC = '#bfe9ff', WIN = '#ffe9a8';
function glowMesh(geo: THREE.BufferGeometry, color: string) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, toneMapped: false })); return m; }
function flag(look: Look, w = 0.7, h = 0.45) {
  const tex = bannerTexture(look.banner); const geo = new THREE.PlaneGeometry(w, h, 8, 1); geo.translate(w / 2, 0, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 })); m.castShadow = true;
  const base = (geo.attributes.position.array as Float32Array).slice();
  m.userData.wave = (t: number) => { const p = geo.attributes.position.array as Float32Array; for (let i = 0; i < p.length; i += 3) { const x = base[i]; p[i + 2] = Math.sin(x * 7 - t * 4) * 0.06 * (x / w); } geo.attributes.position.needsUpdate = true; };
  return m;
}
const texCache = new Map<string, THREE.Texture>();
export function bannerTexture(b: { bg: string; fg: string; emblem: string }) {
  const key = b.bg + b.fg + b.emblem; const hit = texCache.get(key); if (hit) return hit;
  const c = document.createElement('canvas'); c.width = 128; c.height = 80; const g = c.getContext('2d')!;
  g.fillStyle = b.bg; g.fillRect(0, 0, 128, 80); g.fillStyle = shade(b.bg, -0.25); g.fillRect(0, 64, 128, 16);
  g.fillStyle = b.fg; g.translate(64, 36); emblemPath(g, b.emblem, 22); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; texCache.set(key, t); return t;
}
export function emblemPath(g: CanvasRenderingContext2D, e: string, r: number) {
  g.beginPath();
  if (e === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } }
  else if (e === 'planet') { g.arc(0, 0, r * 0.6, 0, 7); g.moveTo(r, 0); g.ellipse(0, 0, r, r * 0.28, -0.3, 0, 7); }
  else if (e === 'bolt') { g.moveTo(r * 0.2, -r); g.lineTo(-r * 0.5, r * 0.1); g.lineTo(0, r * 0.1); g.lineTo(-r * 0.2, r); g.lineTo(r * 0.5, -r * 0.1); g.lineTo(0, -r * 0.1); }
  else if (e === 'gear') { for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, rr = i % 2 ? r * 0.7 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } }
  else if (e === 'rocket') { g.moveTo(0, -r); g.quadraticCurveTo(r * 0.45, -r * 0.3, r * 0.3, r * 0.5); g.lineTo(r * 0.6, r); g.lineTo(-r * 0.6, r); g.lineTo(-r * 0.3, r * 0.5); g.quadraticCurveTo(-r * 0.45, -r * 0.3, 0, -r); }
  else { g.arc(0, 0, r * 0.8, 0, 7); }
  g.closePath();
}
// ---------------- Command Center ----------------
function command(lvl: number, look: Look): Model {
  const k = new Kit(), P = look.primary, A = look.accent; const tiers = Math.min(5, 1 + Math.floor((lvl - 1) / 3));
  k.cyl(1.95, 1.95, 0.28, 8, shade(P, -0.18), 0, 0, 0, { ry: Math.PI / 8 }); k.cyl(1.88, 1.88, 0.05, 8, A, 0, 0.28, 0, { ry: Math.PI / 8, glow: true });
  // corner modules with lit windows
  const ext = 1.25; for (const [x, z] of [[ext, ext], [-ext, ext], [ext, -ext], [-ext, -ext]]) { const h = 0.55 + Math.min(0.5, lvl * 0.04);
    k.box(0.85, h, 0.85, P, x, 0.33, z); k.box(0.87, 0.07, 0.87, A, x, 0.33 + h, z); k.box(0.6, 0.09, 0.02, WIN, x, 0.33 + h * 0.55, z + 0.43, { glow: true }); k.box(0.02, 0.09, 0.6, WIN, x + 0.43 * Math.sign(x), 0.33 + h * 0.55, z, { glow: true }); }
  // the stacked hub
  let y = 0.33, r = 1.15; for (let i = 0; i < tiers; i++) { const h = 0.62 - i * 0.04; k.cyl(r, r * 1.04, h, 12, i % 2 ? shade(P, -0.08) : P, 0, y, 0); k.cyl(r * 1.03, r * 1.03, 0.06, 12, A, 0, y + h - 0.12, 0, { glow: i === tiers - 1 });
    for (let w = 0; w < 8; w++) { const a = (w / 8) * Math.PI * 2; k.box(0.18, 0.12, 0.02, WIN, Math.cos(a) * r * 1.02, y + h * 0.45, Math.sin(a) * r * 1.02, { ry: -a + Math.PI / 2, glow: true }); }
    y += h; r *= 0.84; }
  k.sphere(r * 1.05, GLASSC, 0, y, 0, { theta: Math.PI / 2, w: 14, h: 6, glass: true }); k.sphere(r * 0.45, A, 0, y + 0.05, 0, { glow: true, w: 8, h: 5 });
  // landing pad from level 5, radar from level 8
  if (lvl >= 5) { k.cyl(0.62, 0.62, 0.05, 10, DARK, 1.35, 0.3, -1.35); k.cyl(0.5, 0.5, 0.06, 10, '#ffcc33', 1.35, 0.3, -1.35); k.cyl(0.42, 0.42, 0.07, 10, DARK, 1.35, 0.3, -1.35); }
  if (lvl >= 8) { k.cyl(0.05, 0.08, 0.6, 6, STEEL, -1.25, 0.95 + Math.min(0.5, lvl * 0.04), 1.25); k.sphere(0.32, STEEL, -1.25, 1.62 + Math.min(0.5, lvl * 0.04), 1.25, { theta: Math.PI / 2, rx: Math.PI * 0.75 }); }
  const g = k.build('command'); const top = y + r * 1.05;
  // antenna beacon
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.9, 5), MATS.body); ant.position.set(0, top + 0.45, 0); (ant.geometry as any).setAttribute('color', new THREE.BufferAttribute(new Float32Array(ant.geometry.attributes.position.count * 3).fill(0.8), 3)); g.add(ant);
  const tip = glowMesh(new THREE.SphereGeometry(0.07, 8, 6), '#ff4a4a'); tip.position.set(0, top + 0.92, 0); g.add(tip);
  // the colony flag
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 5), new THREE.MeshStandardMaterial({ color: STEEL })); mast.position.set(-1.7, 1.03, -1.7); mast.castShadow = true; g.add(mast);
  const fl = flag(look); fl.position.set(-1.68, 1.55, -1.7); g.add(fl);
  return { group: g, height: top + 1, anim: (t) => { (tip.material as THREE.MeshBasicMaterial).color.set(Math.sin(t * 3) > 0 ? '#ff4a4a' : '#3a0a0a'); fl.userData.wave(t); } };
}
// ---------------- Colony Hub (off-world islands) ----------------
function hub(lvl: number, look: Look): Model {
  const k = new Kit(), P = look.primary, A = look.accent; const rings = Math.min(4, 1 + Math.floor((lvl - 1) / 3));
  k.cyl(1.9, 1.95, 0.3, 6, shade(P, -0.2), 0, 0, 0, { ry: Math.PI / 6 }); k.cyl(1.82, 1.82, 0.05, 6, A, 0, 0.3, 0, { ry: Math.PI / 6, glow: true });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; k.cyl(0.42, 0.42, 0.55 + Math.min(0.4, lvl * 0.03), 10, P, Math.cos(a) * 1.25, 0.3, Math.sin(a) * 1.25); k.sphere(0.42, GLASSC, Math.cos(a) * 1.25, 0.85 + Math.min(0.4, lvl * 0.03), Math.sin(a) * 1.25, { theta: Math.PI / 2, w: 10, h: 5, glass: true }); }
  let y = 0.3; for (let i = 0; i < rings; i++) { k.cyl(0.95 - i * 0.12, 1.0 - i * 0.12, 0.5, 14, i % 2 ? shade(P, -0.1) : P, 0, y, 0); k.cyl(0.98 - i * 0.12, 0.98 - i * 0.12, 0.06, 14, A, 0, y + 0.42, 0, { glow: i === rings - 1 }); y += 0.5; }
  k.sphere(0.62, GLASSC, 0, y, 0, { theta: Math.PI / 2, w: 14, h: 6, glass: true }); k.sphere(0.25, A, 0, y + 0.05, 0, { glow: true, w: 8, h: 5 });
  const g = k.build('hub'); const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.4, 5), new THREE.MeshStandardMaterial({ color: STEEL })); mast.position.set(-1.6, 1.0, -1.2); g.add(mast);
  const fl = flag(look); fl.position.set(-1.58, 1.5, -1.2); g.add(fl); return { group: g, height: y + 0.9, anim: (t) => fl.userData.wave(t) }; }
// ---------------- Bot Bay ----------------
function bay(lvl: number, el: string, look: Look): Model {
  const k = new Kit(), P = look.primary, E = (ELEMENTS[el] || ELEMENTS.solar).color, EG = (ELEMENTS[el] || ELEMENTS.solar).glow;
  k.cyl(1.42, 1.48, 0.22, 6, shade(P, -0.12), 0, 0, 0, { ry: Math.PI / 6 }); k.cyl(1.36, 1.36, 0.04, 6, mix(P, E, 0.35), 0, 0.22, 0, { ry: Math.PI / 6 });
  k.cyl(0.62, 0.62, 0.03, 16, E, 0, 0.26, 0, { glow: true }); k.cyl(0.5, 0.5, 0.035, 16, shade(E, -0.5), 0, 0.26, 0);
  // pylons, more and taller with level
  const n = lvl >= 4 ? 6 : 3, ph = 0.7 + Math.min(0.8, lvl * 0.07);
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + Math.PI / 6, x = Math.cos(a) * 1.18, z = Math.sin(a) * 1.18;
    k.box(0.16, ph, 0.16, P, x, 0.26, z, { ry: -a }); k.box(0.2, 0.08, 0.2, A2(look), x, 0.26 + ph, z, { ry: -a }); k.box(0.06, ph * 0.6, 0.02, E, x * 0.99, 0.26 + ph * 0.25, z * 0.99, { ry: -a + Math.PI / 2, glow: true }); }
  if (lvl >= 4) k.add(new THREE.TorusGeometry(1.18, 0.05, 6, 24), A2(look), 0, 0.26 + ph + 0.06, 0, { rx: Math.PI / 2 });
  if (lvl >= 7) k.sphere(1.25, mix(EG, '#ffffff', 0.4), 0, 0.26, 0, { theta: Math.PI / 2, w: 18, h: 8, glass: true });
  // docking pads: one per bot slot
  const cap = 2 + Math.floor((lvl - 1) / 3); for (let i = 0; i < cap; i++) { const a = (i / cap) * Math.PI * 2 + 0.4; k.cyl(0.17, 0.17, 0.03, 8, shade(E, 0.2), Math.cos(a) * 0.86, 0.26, Math.sin(a) * 0.86, { glow: true }); }
  const g = k.build('bay');
  const holo = glowMesh(new THREE.OctahedronGeometry(0.18, 0), EG); holo.position.y = 0.26 + ph + 0.45; (holo.material as THREE.MeshBasicMaterial).transparent = true; (holo.material as THREE.MeshBasicMaterial).opacity = 0.85; g.add(holo);
  return { group: g, height: 0.26 + ph + 0.7, anim: (t) => { holo.rotation.y = t * 1.4; holo.position.y = 0.26 + ph + 0.45 + Math.sin(t * 2) * 0.06; } };
}
const A2 = (look: Look) => look.accent;
// ---------------- Fabricator ----------------
function fab(lvl: number, look: Look): Model {
  const k = new Kit(), P = look.primary, A = look.accent; const CELL = '#9dff5a';
  k.box(2.7, 0.18, 2.7, shade(P, -0.2), 0, 0, 0); k.box(1.7, 1.0 + Math.min(0.4, lvl * 0.04), 1.5, P, -0.35, 0.18, -0.4); k.box(1.74, 0.1, 1.54, A, -0.35, 1.18 + Math.min(0.4, lvl * 0.04), -0.4);
  k.box(1.0, 0.12, 0.02, WIN, -0.35, 0.75, 0.36, { glow: true }); k.box(0.4, 0.55, 0.03, DARK, 0.25, 0.18, 0.36);
  const stacks = 1 + Math.min(3, Math.floor(lvl / 3)); for (let i = 0; i < stacks; i++) { k.cyl(0.13, 0.16, 0.7 + i * 0.1, 8, STEEL, -0.9 + i * 0.38, 1.28, -0.85); k.cyl(0.15, 0.15, 0.06, 8, A, -0.9 + i * 0.38, 1.9 + i * 0.1, -0.85); }
  // conveyor with printed cells
  k.box(2.2, 0.12, 0.4, DARK, 0, 0.18, 0.95); for (let i = 0; i < 5; i++) k.box(0.18, 0.18, 0.22, CELL, -0.8 + i * 0.4, 0.3, 0.95, { glow: true });
  const g = k.build('fab');
  // the cell tank fills as a recipe runs
  const tankK = new Kit(); tankK.cyl(0.42, 0.42, 1.25, 14, GLASSC, 0, 0, 0, { glass: true }); tankK.cyl(0.46, 0.46, 0.08, 14, A, 0, 1.25, 0); tankK.cyl(0.46, 0.46, 0.1, 14, STEEL, 0, -0.02, 0);
  const tank = tankK.build('tank'); tank.position.set(0.85, 0.18, -0.55); g.add(tank);
  const liquid = glowMesh(new THREE.CylinderGeometry(0.36, 0.36, 1, 14), CELL); liquid.geometry.translate(0, 0.5, 0); liquid.position.set(0.85, 0.22, -0.55); g.add(liquid);
  const arm = new THREE.Group(); const ak = new Kit(); ak.box(0.1, 0.6, 0.1, '#ffb23e', 0, 0, 0); ak.box(0.5, 0.08, 0.08, '#ffb23e', 0.22, 0.56, 0); ak.box(0.08, 0.18, 0.08, DARK, 0.45, 0.4, 0); arm.add(ak.build()); arm.position.set(0.95, 0.3, 0.6); g.add(arm);
  return { group: g, height: 2.1, anim: (t, s) => { const f = s.ready ? 1 : s.working ? 0.15 + 0.7 * ((t * 0.08) % 1) : 0.08; liquid.scale.y = THREE.MathUtils.lerp(liquid.scale.y || 0.1, f * 1.2, 0.08);
    arm.rotation.y = s.working ? Math.sin(t * 2.4) * 0.9 : 0; (liquid.material as THREE.MeshBasicMaterial).color.set(s.ready ? (Math.sin(t * 5) > 0 ? '#c8ff7a' : CELL) : CELL); } };
}
// ---------------- Assembly Bay ----------------
function assembly(lvl: number, look: Look): Model {
  const k = new Kit(), P = look.primary, A = look.accent; const pods = Math.min(3, 1 + Math.floor((lvl - 1) / 3));
  k.box(2.8, 0.2, 2.8, shade(P, -0.2), 0, 0, 0); k.box(2.6, 0.05, 0.4, '#ffcc33', 0, 0.2, 1.05); k.box(2.0, 0.6, 0.7, P, 0, 0.2, -0.95); k.box(2.04, 0.06, 0.74, A, 0, 0.8, -0.95); k.box(1.4, 0.1, 0.02, WIN, 0, 0.55, -0.59, { glow: true });
  const xs = [-0.85, 0, 0.85]; for (let i = 0; i < 3; i++) { const on = i < pods; k.cyl(0.36, 0.4, 0.14, 12, on ? STEEL : DARK, xs[i], 0.2, 0.15); if (on) { k.cyl(0.32, 0.32, 0.9, 12, GLASSC, xs[i], 0.34, 0.15, { glass: true }); k.cyl(0.36, 0.36, 0.08, 12, A, xs[i], 1.24, 0.15); } }
  const g = k.build('assembly');
  // gantry arm sweeping across the pods
  const arm = new THREE.Group(); const ak = new Kit(); ak.box(0.08, 1.5, 0.08, '#ffb23e', -1.3, 0, -0.3); ak.box(2.7, 0.08, 0.08, '#ffb23e', 0, 1.5, -0.3); ak.box(0.12, 0.3, 0.12, DARK, 0, 1.22, -0.3); arm.add(ak.build()); arm.position.y = 0.2; g.add(arm);
  const coreM: THREE.Mesh[] = []; for (let i = 0; i < 3; i++) { const m = glowMesh(new THREE.IcosahedronGeometry(0.17, 1), '#ffffff'); m.position.set(xs[i], 0.8, 0.15); m.visible = false; g.add(m); coreM.push(m); }
  return { group: g, height: 1.8, anim: (t, s) => { const cs = s.cores || []; coreM.forEach((m, i) => { const c = cs[i]; m.visible = !!c && i < pods; if (!c) return; (m.material as THREE.MeshBasicMaterial).color.set(c.color);
      m.rotation.y = t * (c.ready ? 3 : 1.2); m.rotation.x = t * 0.7; const pulse = c.ready ? 1 + Math.sin(t * 6) * 0.15 : 0.85 + Math.sin(t * 2 + i) * 0.08; m.scale.setScalar(pulse); m.position.y = 0.8 + Math.sin(t * 1.5 + i) * 0.05; });
    arm.position.x = cs.some((c) => !c.ready) ? Math.sin(t * 0.9) * 0.8 : arm.position.x * 0.95; } };
}
// ---------------- Fusion Lab ----------------
function fusionLab(lvl: number, look: Look): Model {
  const k = new Kit(), P = look.primary, A = look.accent;
  k.box(3.8, 0.22, 2.8, shade(P, -0.2), 0, 0, 0); k.box(3.6, 0.04, 0.3, A, 0, 0.22, 1.15, { glow: true });
  for (const x of [-1.25, 1.25]) { k.cyl(0.62, 0.7, 0.35, 12, P, x, 0.22, 0); k.cyl(0.66, 0.66, 0.06, 12, A, x, 0.57, 0); k.sphere(0.58, GLASSC, x, 0.62, 0, { theta: Math.PI / 2, w: 16, h: 7, glass: true }); k.cyl(0.4, 0.4, 0.03, 14, '#b06dff', x, 0.6, 0, { glow: true }); }
  k.cyl(0.22, 0.3, 1.0 + Math.min(0.4, lvl * 0.04), 10, STEEL, 0, 0.22, 0); k.box(2.0, 0.12, 0.18, DARK, 0, 0.62, 0); k.box(0.7, 0.5, 0.6, P, 0, 0.22, -0.95); k.box(0.5, 0.08, 0.02, WIN, 0, 0.5, -0.64, { glow: true });
  const g = k.build('fusion'); const top = 1.25 + Math.min(0.4, lvl * 0.04);
  const ring = new THREE.Group(); const rk = new Kit(); rk.add(new THREE.TorusGeometry(0.55, 0.07, 8, 32), A); rk.add(new THREE.TorusGeometry(0.42, 0.03, 6, 28), '#b06dff', 0, 0, 0, { glow: true }); ring.add(rk.build()); ring.position.y = top; g.add(ring);
  const orb = glowMesh(new THREE.IcosahedronGeometry(0.16, 1), '#e2c8ff'); orb.position.y = top; g.add(orb);
  const beam = glowMesh(new THREE.CylinderGeometry(0.035, 0.035, 2.5, 6), '#d6b8ff'); beam.rotation.z = Math.PI / 2; beam.position.y = 0.95; beam.visible = false; g.add(beam);
  return { group: g, height: top + 0.6, anim: (t, s) => { ring.rotation.x = Math.PI / 2 + Math.sin(t * 0.5) * 0.2; ring.rotation.z = t * (s.working ? 4 : 0.4); orb.scale.setScalar(s.working ? 1 + Math.sin(t * 9) * 0.25 : 0.7);
    beam.visible = !!s.working; beam.scale.x = 1 + Math.sin(t * 20) * 0.3; (orb.material as THREE.MeshBasicMaterial).color.set(s.ready ? '#fff2a8' : '#e2c8ff'); } };
}
// ---------------- Arena (the island gateway) ----------------
function arenaGate(lvl: number, look: Look): Model {
  const k = new Kit(), P = look.primary, A = look.accent;
  k.cyl(1.9, 2.0, 0.25, 24, shade(P, -0.2), 0, 0, 0); k.cyl(1.7, 1.7, 0.04, 32, '#2a3446', 0, 0.25, 0); k.add(new THREE.TorusGeometry(1.7, 0.05, 6, 48), A, 0, 0.29, 0, { rx: Math.PI / 2, glow: true });
  for (const [x, c] of [[-0.8, '#4aa8ff'], [0.8, '#ff5a6a']] as [number, string][]) k.cyl(0.42, 0.42, 0.03, 18, c, x, 0.29, 0, { glow: true });
  const n = 6 + Math.min(6, lvl); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; k.box(0.14, 0.9 + (i % 2) * 0.3, 0.14, P, Math.cos(a) * 1.75, 0.25, Math.sin(a) * 1.75); k.box(0.17, 0.08, 0.17, A, Math.cos(a) * 1.75, 1.15 + (i % 2) * 0.3, Math.sin(a) * 1.75, { glow: true }); }
  const g = k.build('arena'); const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.04, 6, 48), new THREE.MeshBasicMaterial({ color: '#7af7ff', toneMapped: false, transparent: true, opacity: 0.85 })); ring.position.y = 1.5; ring.rotation.x = Math.PI / 2; g.add(ring);
  const fl = flag(look, 0.55, 0.34); fl.position.set(0.02, 2.0, 0); const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 5), new THREE.MeshStandardMaterial({ color: STEEL })); mast.position.set(0, 1.7, 0); g.add(mast, fl);
  return { group: g, height: 2.3, anim: (t) => { ring.rotation.z = t * 0.8; ring.position.y = 1.4 + Math.sin(t * 1.5) * 0.1; fl.userData.wave(t); } };
}
// ---------------- Launch Pad ----------------
export function rocketModel(tier: number) { const k = new Kit(); const h = 1.3 + tier * 0.35, r = 0.2 + tier * 0.03;
  k.cyl(r, r, h, 12, '#f2f4f7', 0, 0.2); k.add(new THREE.ConeGeometry(r, 0.5 + tier * 0.08, 12), '#ff7a3c', 0, 0.2 + h + 0.25 + tier * 0.04, 0); k.cyl(r * 1.02, r * 1.02, 0.08, 12, '#2c3340', 0, 0.2 + h * 0.6);
  if (tier >= 3) for (const x of [-1, 1]) { k.cyl(r * 0.45, r * 0.45, h * 0.6, 10, '#e6e9ee', x * r * 1.5, 0.2); k.add(new THREE.ConeGeometry(r * 0.45, 0.25, 10), '#ff7a3c', x * r * 1.5, 0.2 + h * 0.6 + 0.12, 0); }
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; k.box(0.04, 0.35, 0.22, '#ff7a3c', Math.cos(a) * r, 0.2, Math.sin(a) * r, { ry: -a }); } k.cyl(r * 0.7, r * 0.9, 0.2, 10, '#3a4250', 0, 0); return { group: k.build('rocket'), height: 0.2 + h + 0.7 }; }
function launchPad(lvl: number, look: Look, rocket: boolean): Model {
  const k = new Kit(), P = look.primary, A = look.accent; const tier = lvl >= 9 ? 4 : lvl >= 6 ? 3 : lvl >= 3 ? 2 : 1;
  k.box(2.8, 0.25, 2.8, shade(P, -0.25), 0, 0, 0); k.cyl(0.95, 0.95, 0.06, 20, '#2c3340', 0, 0.25, 0); k.cyl(0.8, 0.8, 0.065, 20, '#ffcc33', 0, 0.25, 0); k.cyl(0.66, 0.66, 0.07, 20, '#2c3340', 0, 0.25, 0);
  const th = 2.2 + tier * 0.4; k.box(0.3, th, 0.3, P, -1.05, 0.25, -1.0); for (let y = 0.6; y < th; y += 0.5) k.box(0.62, 0.05, 0.05, A, -0.78, 0.25 + y, -1.0); k.box(0.36, 0.1, 0.36, A, -1.05, 0.25 + th, -1.0, { glow: true });
  k.box(0.7, 0.4, 0.5, P, 1.0, 0.25, 1.0); k.box(0.5, 0.08, 0.02, WIN, 1.0, 0.45, 1.26, { glow: true });
  const g = k.build('pad'); let rk: THREE.Group | null = null; if (rocket) { const r = rocketModel(tier); rk = r.group; rk.position.y = 0.3; g.add(rk); }
  return { group: g, height: 0.3 + (rocket ? 2.2 + tier * 0.5 : 1.5) }; }
// ---------------- the Precursor Vault ----------------
function mine(lvl: number, look: Look): Model { const k = new Kit(); k.cyl(0.95, 1.0, 0.18, 10, '#3a2f4a'); k.cyl(0.7, 0.7, 0.05, 12, '#120a1c', 0, 0.18); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; k.add(new THREE.OctahedronGeometry(0.12, 0), '#c48bff', Math.cos(a) * 0.45, 0.25, Math.sin(a) * 0.45, { sy: 2, glass: true }); }
  for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [0, 0.75]]) k.box(0.08, 1.3, 0.08, '#c8d0da', x, 0.18, z); k.box(1.5, 0.08, 0.08, look.accent, 0, 1.45, -0.7); k.box(0.3, 0.3, 0.3, look.primary, 0, 1.2, 0);
  const g = k.build('mine'); const bit = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 8), new THREE.MeshStandardMaterial({ color: '#e6b84a', metalness: 0.6, roughness: 0.3 })); bit.rotation.x = Math.PI; bit.position.y = 0.75; g.add(bit);
  const glow = glowMesh(new THREE.CircleGeometry(0.55, 20), '#b06dff'); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.24; (glow.material as THREE.MeshBasicMaterial).transparent = true; (glow.material as THREE.MeshBasicMaterial).opacity = 0.6; g.add(glow);
  return { group: g, height: 1.7, anim: (t, s) => { bit.rotation.y = s.working ? t * 12 : 0; bit.position.y = s.working ? 0.55 + Math.sin(t * 3) * 0.15 : 0.75; (glow.material as THREE.MeshBasicMaterial).opacity = s.ready ? 0.6 + Math.sin(t * 5) * 0.3 : 0.35; } }; }
function forge(look: Look): Model { const k = new Kit(); k.cyl(1.3, 1.45, 0.3, 8, '#2a2236', 0, 0, 0, { ry: Math.PI / 8 }); k.cyl(0.9, 1.0, 0.5, 8, '#3a2f4a', 0, 0.3, 0, { ry: Math.PI / 8 }); k.cyl(0.6, 0.6, 0.05, 16, '#b06dff', 0, 0.8, 0, { glow: true });
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; k.box(0.22, 1.4, 0.22, '#4a3d5e', Math.cos(a) * 1.15, 0.3, Math.sin(a) * 1.15); k.add(new THREE.OctahedronGeometry(0.1, 0), '#e6c8ff', Math.cos(a) * 1.15, 1.85, Math.sin(a) * 1.15, { glow: true }); }
  const g = k.build('forge'); const cr = glowMesh(new THREE.OctahedronGeometry(0.28, 0), '#d6b8ff'); cr.position.y = 1.5; g.add(cr); const rings = new THREE.Group(); for (let i = 0; i < 3; i++) { const r = glowMesh(new THREE.TorusGeometry(0.45 + i * 0.12, 0.012, 4, 32), '#b06dff'); r.rotation.x = i * 1.1; rings.add(r); } rings.position.y = 1.5; g.add(rings);
  return { group: g, height: 2.2, anim: (t) => { cr.rotation.y = t * 1.5; cr.position.y = 1.5 + Math.sin(t * 1.4) * 0.08; rings.children.forEach((r, i) => { r.rotation.y = t * (0.6 + i * 0.4); r.rotation.z = t * 0.3 * (i + 1); }); } }; }
function relicBay(lvl: number, el: string): Model { const E = (ELEMENTS[el] || ELEMENTS.aurora); const k = new Kit(); k.cyl(1.45, 1.5, 0.22, 12, '#2a2236'); k.cyl(1.2, 1.2, 0.04, 24, '#3a2f4a', 0, 0.22, 0);
  const n = 6 + Math.min(4, Math.floor(lvl / 3)); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const h = 0.9 + (i % 2) * 0.35; k.box(0.22, h, 0.22, '#4a3d5e', Math.cos(a) * 1.2, 0.22, Math.sin(a) * 1.2, { ry: -a }); k.box(0.05, h * 0.6, 0.02, E.color, Math.cos(a) * 1.08, 0.22 + h * 0.2, Math.sin(a) * 1.08, { ry: -a + Math.PI / 2, glow: true }); }
  k.cyl(0.7, 0.7, 0.04, 24, E.color, 0, 0.26, 0, { glow: true }); const g = k.build('relicbay'); const glyph = glowMesh(new THREE.TorusGeometry(0.4, 0.03, 4, 6), E.glow); glyph.position.y = 1.4; g.add(glyph);
  return { group: g, height: 1.9, anim: (t) => { glyph.rotation.y = t; glyph.rotation.x = Math.sin(t * 0.7) * 0.6; } }; }
// ---------------- decorations ----------------
function decor(t: string, look: Look): Model {
  const k = new Kit();
  switch (t) {
    case 'tree': { k.cyl(0.05, 0.08, 0.45, 6, '#7a5232'); k.add(new THREE.IcosahedronGeometry(0.32, 0), '#47c95a', 0, 0.68, 0); k.add(new THREE.IcosahedronGeometry(0.22, 0), '#6ee36f', 0.12, 0.88, 0.05);
      for (const [x, y, z] of [[0.2, 0.62, 0.15], [-0.18, 0.75, 0.12], [0.05, 0.6, -0.25]]) k.sphere(0.045, '#aaffee', x, y, z, { glow: true, w: 6, h: 4 }); return { group: k.build('tree'), height: 1.1 }; }
    case 'rock': { const g = new THREE.DodecahedronGeometry(0.32, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * 0.7); k.add(g, '#8a8f99', 0, 0.18, 0, { ry: 0.7 }); k.add(new THREE.DodecahedronGeometry(0.14, 0), '#6c717b', 0.28, 0.08, 0.12); return { group: k.build('rock'), height: 0.5 }; }
    case 'path': { k.box(0.98, 0.04, 0.98, '#cfd6df'); k.box(0.86, 0.045, 0.86, '#e7ecf2'); return { group: k.build('path'), height: 0.1 }; }
    case 'lamp': { k.cyl(0.08, 0.1, 0.1, 6, DARK); k.cyl(0.03, 0.03, 0.95, 6, STEEL, 0, 0.1); k.box(0.24, 0.04, 0.06, STEEL, 0.1, 1.02, 0); const g = k.build('lamp'); const bulb = glowMesh(new THREE.SphereGeometry(0.07, 8, 6), '#ffe7a0'); bulb.position.set(0.2, 0.98, 0); g.add(bulb);
      const pl = new THREE.PointLight('#ffd890', 1.2, 3.2, 2); pl.position.set(0.2, 0.92, 0); g.add(pl); return { group: g, height: 1.2 }; }
    case 'flag': { k.cyl(0.07, 0.09, 0.08, 6, DARK); const g = k.build('flag'); const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 5), new THREE.MeshStandardMaterial({ color: STEEL })); mast.position.y = 0.75; g.add(mast);
      const f = flag(look, 0.6, 0.38); f.position.set(0.02, 1.25, 0); g.add(f); return { group: g, height: 1.5, anim: (tt) => f.userData.wave(tt) }; }
    case 'crystal': { for (const [x, z, h, r] of [[0, 0, 0.7, 0.13], [0.16, 0.08, 0.45, 0.09], [-0.14, 0.1, 0.5, 0.1], [0.05, -0.16, 0.38, 0.08]]) k.add(new THREE.OctahedronGeometry(r, 0), '#c48bff', x, h / 2, z, { sy: h / r / 2, glass: true });
      k.cyl(0.25, 0.3, 0.06, 7, '#5d5468'); const g = k.build('crystal'); const core = glowMesh(new THREE.OctahedronGeometry(0.06, 0), '#f0d8ff'); core.position.y = 0.3; g.add(core); return { group: g, height: 0.8 }; }
    case 'fountain': { k.cyl(0.85, 0.9, 0.22, 16, '#d9dee5'); k.cyl(0.72, 0.72, 0.03, 16, '#2f8cff', 0, 0.2, 0, { glass: true }); k.cyl(0.12, 0.16, 0.55, 8, '#c8d0da', 0, 0.2); k.cyl(0.3, 0.3, 0.05, 12, '#c8d0da', 0, 0.75);
      const g = k.build('fountain'); const arcs = new THREE.Group(); for (let i = 0; i < 6; i++) { const m = glowMesh(new THREE.TorusGeometry(0.28, 0.02, 4, 12, Math.PI), '#9fd8ff'); m.rotation.y = (i / 6) * Math.PI * 2; m.position.y = 0.78; m.rotation.z = 0; arcs.add(m); }
      arcs.children.forEach((m) => { (m as THREE.Mesh).geometry.translate(0.28, 0, 0); }); g.add(arcs); return { group: g, height: 1.2, anim: (tt) => { arcs.rotation.y = tt * 0.6; arcs.scale.y = 1 + Math.sin(tt * 3) * 0.08; } }; }
    case 'dish': { k.box(0.9, 0.2, 0.9, '#9aa4b1'); k.cyl(0.1, 0.14, 0.6, 8, STEEL, 0, 0.2); k.sphere(0.65, '#e9eef5', 0, 1.05, 0, { theta: Math.PI / 2.6, rx: Math.PI * 0.8, w: 16, h: 6 }); k.cyl(0.02, 0.02, 0.5, 4, DARK, 0.12, 0.95, 0.1, { rx: -0.6 });
      const g = k.build('dish'); const tip = glowMesh(new THREE.SphereGeometry(0.05, 6, 4), '#7af7ff'); tip.position.set(0.22, 1.32, 0.3); g.add(tip); return { group: g, height: 1.6 }; }
    case 'monolith': { k.box(0.5, 1.8, 0.2, '#0c0a12'); for (let i = 0; i < 5; i++) k.box(0.36, 0.03, 0.01, '#b06dff', 0, 0.3 + i * 0.3, 0.105, { glow: true }); return { group: k.build('monolith'), height: 2 }; }
    case 'arch': { for (const x of [-0.75, 0.75]) { k.cyl(0.12, 0.16, 0.12, 8, '#c8d0da', x, 0); k.cyl(0.07, 0.07, 0.6, 8, '#e9eef5', x, 0.12); }
      k.add(new THREE.TorusGeometry(0.75, 0.07, 8, 28, Math.PI), '#e6b84a', 0, 0.72, 0); k.add(new THREE.TorusGeometry(0.62, 0.025, 6, 28, Math.PI), '#fff4c2', 0, 0.72, 0, { glow: true });
      const g = k.build('arch'); const sparks = new THREE.Group(); for (let i = 0; i < 7; i++) { const m = glowMesh(new THREE.OctahedronGeometry(0.04, 0), '#fff4c2'); const a = (i / 6) * Math.PI; m.position.set(Math.cos(a) * 0.75, 0.72 + Math.sin(a) * 0.75, 0); sparks.add(m); } g.add(sparks);
      return { group: g, height: 1.6, anim: (tt) => sparks.children.forEach((m, i) => { m.scale.setScalar(0.6 + 0.6 * Math.abs(Math.sin(tt * 2 + i))); m.rotation.y = tt * 3; }) }; }
    case 'statue': { k.box(1.2, 0.3, 1.2, '#d9dee5'); k.box(1.0, 0.5, 1.0, '#c3cad4', 0, 0.3); k.sphere(0.38, '#e6b84a', 0, 1.22, 0, { w: 14, h: 10 }); k.add(new THREE.TorusGeometry(0.52, 0.05, 6, 24), '#e6b84a', 0, 1.22, 0, { rx: 1.2 });
      k.sphere(0.1, '#fff4c2', 0, 1.26, 0.33, { glow: true }); return { group: k.build('statue'), height: 1.8 }; }
  }
  k.box(0.8, 0.4, 0.8, '#ff00ff'); return { group: k.build('?'), height: 0.5 };
}
export function buildModel(t: string, lvl: number, el: string | undefined, look: Look): Model {
  const L = Math.max(1, lvl);
  if (t === 'command') return command(L, look);
  if (t === 'hub') return hub(L, look);
  if (t === 'bay') return bay(L, el || 'solar', look);
  if (t === 'fab') return fab(L, look);
  if (t === 'assembly') return assembly(L, look);
  if (t === 'fusion') return fusionLab(L, look);
  if (t === 'arena') return arenaGate(L, look);
  if (t === 'mine') return mine(L, look);
  if (t === 'forge') return forge(look);
  if (t === 'relicbay') return relicBay(L, el || 'aurora');
  if (t === 'pad') return launchPad(L, look, !look.noRocket);
  return decor(t, look);
}
// the supply drop pod: falls from orbit on thrusters, lands, blinks until opened
export function dropPod() { const k = new Kit(); k.cyl(0.32, 0.42, 0.7, 8, '#e9eef5', 0, 0.1); k.cyl(0.43, 0.43, 0.08, 8, '#ff7a3c', 0, 0.3); k.add(new THREE.ConeGeometry(0.32, 0.4, 8), '#e9eef5', 0, 1.0, 0); k.box(0.3, 0.2, 0.02, '#2c3340', 0, 0.42, 0.37);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; k.box(0.05, 0.35, 0.22, '#ff7a3c', Math.cos(a) * 0.38, 0, Math.sin(a) * 0.38, { ry: -a }); }
  const g = k.build('pod'); const flame = glowMesh(new THREE.ConeGeometry(0.2, 0.7, 8), '#ffd27a'); flame.rotation.x = Math.PI; flame.position.y = -0.3; g.add(flame);
  const beacon = glowMesh(new THREE.SphereGeometry(0.06, 8, 6), '#7cf29a'); beacon.position.y = 1.22; g.add(beacon); g.userData.flame = flame; g.userData.beacon = beacon; return g; }
// construction scaffold drawn over a building in progress
export function scaffold(w: number, d: number, h: number) {
  const g = new THREE.Group(); const mat = new THREE.MeshStandardMaterial({ color: '#f2b233', roughness: 0.6, metalness: 0.3 });
  const pole = new THREE.CylinderGeometry(0.035, 0.035, h, 5); const bar = new THREE.CylinderGeometry(0.025, 0.025, 1, 4);
  const xs = [-w / 2 + 0.1, w / 2 - 0.1], zs = [-d / 2 + 0.1, d / 2 - 0.1];
  for (const x of xs) for (const z of zs) { const m = new THREE.Mesh(pole, mat); m.position.set(x, h / 2, z); m.castShadow = true; g.add(m); }
  for (let y = 0.4; y < h; y += 0.6) { for (const z of zs) { const m = new THREE.Mesh(bar, mat); m.scale.y = w - 0.2; m.rotation.z = Math.PI / 2; m.position.set(0, y, z); g.add(m); } for (const x of xs) { const m = new THREE.Mesh(bar, mat); m.scale.y = d - 0.2; m.rotation.x = Math.PI / 2; m.position.set(x, y, 0); g.add(m); } }
  const crane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, Math.max(w, d) * 0.9), mat); crane.position.set(0, h + 0.1, 0); crane.name = 'crane'; g.add(crane);
  return g;
}
