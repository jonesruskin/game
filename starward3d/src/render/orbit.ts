// The view from orbit: Earth turning below (baked procedural maps), its atmosphere, the Moon, the Sun and the stars;
// every satellite you launch on its orbit (low orbit, geostationary, the Earth–Moon L1 point), and your space
// station, assembled from the modules you have docked (core, laboratory, solar wings, habitat, depot, shipyard, dock).
import * as THREE from 'three';
import { Kit } from './kit';
import { earthGlobe, rockGlobe, starfield, sunSprite, nebula, Globe } from './planet';
import { SATS } from '../data/space';
import type { Space } from '../core/space';
import { clamp } from '../core/util';
const R = 20, LEO = 23.6, GEO = 34, STA = 25.2;
export class OrbitView {
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(40, 1, 0.05, 20000); earth: Globe; moon: Globe; sun = new THREE.Vector3(-0.7, 0.35, 0.6).normalize();
  private sats = new THREE.Group(); private station = new THREE.Group(); private key = ''; private satObjs: { g: THREE.Group; orbit: string; ph: number; r: number; inc: number }[] = [];
  cam = { yaw: 0.6, pitch: 0.35, dist: 78, tdist: 78, tyaw: 0.6, tpitch: 0.35 }; focus: 'earth' | 'station' = 'earth'; private t = 0;
  constructor(renderer: THREE.WebGLRenderer, big: boolean) {
    this.earth = earthGlobe(renderer, R, this.sun, big); this.earth.mesh.rotation.z = 0.41; this.scene.add(this.earth.group);
    this.moon = rockGlobe(renderer, 5.4, this.sun, 2, 4); this.moon.group.position.set(-150, 22, -96); this.scene.add(this.moon.group);
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), new THREE.MeshBasicMaterial({ map: nebula(renderer, big), side: THREE.BackSide, depthWrite: false })));
    this.scene.add(starfield(8000, big ? 3500 : 1800, big ? 2.2 : 1.8)); const s = sunSprite(1400); s.position.copy(this.sun).multiplyScalar(7000); this.scene.add(s);
    const light = new THREE.DirectionalLight('#fff4e0', 2.6); light.position.copy(this.sun).multiplyScalar(100); this.scene.add(light, new THREE.AmbientLight('#334466', 0.6));
    for (const [r, c] of [[LEO, '#6ee7ff'], [GEO, '#ffd36a']] as const) { const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.03, r + 0.03, 160), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = Math.PI / 2; this.scene.add(ring); }
    this.scene.add(this.sats, this.station);
  }
  resize(w: number, h: number) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  // keep the satellites and the station in step with the save
  sync(S: Space) {
    const key = JSON.stringify([S.sats, S.modules]); if (key === this.key) return; this.key = key;
    this.sats.clear(); this.satObjs = []; const per: Record<string, number> = {};
    S.sats.forEach((x) => { const d = SATS[x.type]; const n = (per[d.orbit] = (per[d.orbit] || 0) + 1); const g = satModel(x.type, x.lvl); g.scale.setScalar(1.3 + x.lvl * 0.08); this.sats.add(g);
      this.satObjs.push({ g, orbit: d.orbit, ph: n * 2.1 + (d.orbit === 'geo' ? 0.5 : 0), r: d.orbit === 'geo' ? GEO : LEO + (n % 3) * 0.5, inc: d.orbit === 'leo' ? (n % 2 ? 0.5 : -0.35) : 0 }); });
    this.station.clear(); const M = S.modules; if (M.core) { this.station.add(stationModel(M)); }
  }
  stationPos(t: number) { const a = t * 0.05; return new THREE.Vector3(Math.cos(a) * STA, Math.sin(a) * STA * 0.36, Math.sin(a) * STA * 0.93); }
  drag(dx: number, dy: number) { this.cam.tyaw -= dx * 0.006; this.cam.tpitch = clamp(this.cam.tpitch + dy * 0.005, -1.2, 1.2); }
  zoom(k: number) { this.cam.tdist = clamp(this.cam.tdist * k, this.focus === 'station' ? 3 : 30, this.focus === 'station' ? 30 : 260); }
  setFocus(f: 'earth' | 'station') { this.focus = f; this.cam.tdist = f === 'station' ? 9 : 78; }
  frame(dt: number) {
    this.t += dt; const t = this.t; const c = this.cam; const k = 0.12; c.yaw += (c.tyaw - c.yaw) * k; c.pitch += (c.tpitch - c.pitch) * k; c.dist += (c.tdist - c.dist) * k;
    this.earth.mesh.rotation.y = t * 0.01; if (this.earth.uniforms) this.earth.uniforms.uTime.value = t;
    for (const o of this.satObjs) { const sp = o.orbit === 'geo' ? 0.01 : o.orbit === 'lagrange' ? 0 : 0.07; const a = o.ph + t * sp;
      if (o.orbit === 'lagrange') { o.g.position.copy(this.moon.group.position).multiplyScalar(0.84); o.g.position.y += Math.sin(t * 0.3 + o.ph) * 0.6; }
      else o.g.position.set(Math.cos(a) * o.r, Math.sin(a) * o.r * o.inc, Math.sin(a) * o.r * Math.cos(o.inc)); o.g.lookAt(0, 0, 0); }
    const sp = this.stationPos(t); this.station.position.copy(sp); this.station.rotation.y = t * 0.02; this.station.scale.setScalar(this.focus === 'station' ? 1 : 1.6);
    const target = this.focus === 'station' && this.station.children.length ? sp : new THREE.Vector3();
    this.camera.position.set(target.x + Math.cos(c.pitch) * Math.sin(c.yaw) * c.dist, target.y + Math.sin(c.pitch) * c.dist, target.z + Math.cos(c.pitch) * Math.cos(c.yaw) * c.dist); this.camera.lookAt(target);
  }
}
// small satellite models, one silhouette per type
function satModel(type: string, lvl: number) {
  const k = new Kit(); const gold = '#d9a82e', panel = '#1d3c78', W = '#e9edf2';
  const wings = (span: number, h = 0.3) => { k.box(span, 0.02, h, panel, span / 2 + 0.2, 0, 0); k.box(span, 0.02, h, panel, -span / 2 - 0.2, 0, 0); k.box(span * 2 + 0.4, 0.015, 0.03, '#9aa3ad', 0, 0, 0); };
  switch (type) {
    case 'comms': k.box(0.3, 0.3, 0.3, gold); wings(0.8 + lvl * 0.05); k.add(new THREE.SphereGeometry(0.22, 12, 6, 0, Math.PI * 2, 0, Math.PI / 3), W, 0, 0.35, 0, { rx: Math.PI }); break;
    case 'observe': k.box(0.25, 0.35, 0.25, W); k.cyl(0.08, 0.08, 0.3, 10, '#3a3f47', 0, -0.4, 0); wings(0.6); break;
    case 'weather': k.cyl(0.18, 0.18, 0.4, 10, W); wings(0.7, 0.25); k.cyl(0.02, 0.02, 0.4, 4, '#9aa3ad', 0, 0.2, 0); break;
    case 'nav': k.box(0.28, 0.28, 0.28, '#c9d6e6'); wings(0.7); k.cyl(0.015, 0.015, 0.5, 4, gold, 0, 0.15, 0); break;
    case 'telescope': k.cyl(0.16, 0.16, 0.9, 12, W, 0, -0.2, 0); k.cyl(0.17, 0.17, 0.05, 12, gold, 0, 0.1, 0); wings(0.5, 0.35); break;
    case 'power': k.box(0.3, 0.2, 0.3, gold); wings(2.2 + lvl * 0.15, 0.9); break;
    default: k.box(0.3, 0.3, 0.3, gold); k.add(new THREE.SphereGeometry(0.4, 14, 6, 0, Math.PI * 2, 0, Math.PI / 3), W, 0, 0.45, 0, { rx: Math.PI }); wings(0.5);
  }
  k.sphere(0.04, '#ff5b5b', 0, 0.2, 0.18, { glow: true }); return k.build('sat');
}
// the station grows with every module and level
function stationModel(M: Record<string, number>) {
  const k = new Kit(); const W = '#e6e9ee', G = '#d9a82e', P = '#1d3c78';
  k.cyl(0.32, 0.32, 2.0, 14, W, 0, -1.0, 0, { rz: Math.PI / 2 }); k.cyl(0.34, 0.34, 0.1, 14, G, -0.4, -0.05, 0, { rz: Math.PI / 2 }); // core along x
  if (M.lab) { const h = 1.2 + M.lab * 0.05; k.cyl(0.3, 0.3, h, 14, W, 0, -h / 2, 0.3 + h / 2, { rx: Math.PI / 2 }); k.cyl(0.31, 0.31, 0.08, 14, '#6ee7ff', 0, -0.04, 0.3 + h * 0.8, { rx: Math.PI / 2, glow: true }); }
  if (M.habitat) { k.sphere(0.55 + M.habitat * 0.02, '#f1f3f5', 1.5, 0, 0, { w: 16, h: 10 }); k.cyl(0.18, 0.18, 0.5, 10, W, 1.0, -0.25, 0, { rz: Math.PI / 2 }); }
  if (M.depot) for (let i = 0; i < Math.min(4, 1 + Math.floor(M.depot / 3)); i++) k.sphere(0.3, '#c9ced5', -1.4, 0.0, -0.6 - i * 0.62, { w: 12, h: 8 });
  if (M.dock) { k.cyl(0.5, 0.5, 0.12, 20, '#b8c4d6', 0, -0.06, -0.9, { rx: Math.PI / 2 }); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; k.cyl(0.08, 0.08, 0.3, 8, G, Math.cos(a) * 0.5, Math.sin(a) * 0.5 - 0.15, -0.9, { rz: a + Math.PI / 2 }); } }
  if (M.yard) { for (let i = 0; i < 4; i++) { k.box(0.04, 0.04, 2.6, '#9aa3ad', -0.9 + (i % 2) * 1.8, -1.2 - Math.floor(i / 2) * 0.9, 0); } for (let z = -1.2; z <= 1.2; z += 0.6) k.box(1.84, 0.04, 0.04, '#9aa3ad', 0, -1.2, z); k.box(0.6, 0.3, 1.4, '#c9ced5', 0, -1.65, 0); }
  const n = M.solar ? 2 + Math.min(6, M.solar) : 2; for (let i = 0; i < n; i++) { const x = -0.8 + (i % 2 ? 1.6 : 0) * 0 + (i - (n - 1) / 2) * 0.55; k.box(0.06, 0.06, 4.0, '#9aa3ad', x, 0.42, 0); k.box(0.45, 0.02, 1.6, P, x, 0.42, 1.0); k.box(0.45, 0.02, 1.6, P, x, 0.42, -1.0); }
  k.sphere(0.05, '#ff5b5b', 1.0, 0.4, 0, { glow: true }); k.sphere(0.05, '#7cf29a', -1.0, 0.4, 0, { glow: true });
  return k.build('station');
}
