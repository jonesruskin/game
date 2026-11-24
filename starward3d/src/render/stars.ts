// The star map in 3D: every catalogued star within ~60 light-years at its real position (right ascension,
// declination, distance), coloured by spectral class and sized by brightness; Sol at the centre; the Starshot array's
// survey range as a glass bubble; colonies ringed in green, gates in violet; light sails and starships in flight as
// moving dots along their routes; faint rings every 10 light-years for scale.
import * as THREE from 'three';
import { STARS, CLASS, Star } from '../data/stars';
import { starfield, nebula, sunSprite } from './planet';
import { clamp } from '../core/util';
const K = 1.6; // map units per light-year
const posOf = (s: Star) => new THREE.Vector3(s.pos[0] * K, s.pos[2] * K, -s.pos[1] * K);
let glowT: THREE.Texture | null = null;
function glowTex() { if (glowT) return glowT; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!; const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); glowT = new THREE.CanvasTexture(c); return glowT; }
export class StarMap {
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000); sel: string | null = null;
  cam = { yaw: 0.6, pitch: 0.5, dist: 70, tdist: 70, tyaw: 0.6, tpitch: 0.5, fx: 0, fy: 0, fz: 0, tfx: 0, tfy: 0, tfz: 0 };
  private sprites = new Map<string, THREE.Sprite>(); private range: THREE.Mesh; private ring: THREE.Mesh; private marks = new THREE.Group(); private flights = new THREE.Group(); private t = 0;
  constructor(renderer: THREE.WebGLRenderer, big: boolean) {
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(2500, 32, 16), new THREE.MeshBasicMaterial({ map: nebula(renderer, big), side: THREE.BackSide, depthWrite: false, color: '#8090b0' })), starfield(2000, big ? 2500 : 1200, 1.4));
    for (let r = 10; r <= 60; r += 10) { const m = new THREE.Mesh(new THREE.RingGeometry(r * K - 0.06, r * K + 0.06, 128), new THREE.MeshBasicMaterial({ color: '#6ee7ff', transparent: true, opacity: r % 20 ? 0.06 : 0.12, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = Math.PI / 2; this.scene.add(m); }
    for (const id in STARS) { const s = STARS[id]; const C = CLASS[s.cls]; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: C.col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      const size = (id === 'sol' ? 3.2 : (s.proc ? 1.3 : 1.9)) * C.lum; sp.scale.setScalar(size); sp.position.copy(posOf(s)); sp.userData = { id, size }; this.scene.add(sp); this.sprites.set(id, sp);
      if (Math.abs(s.pos[2]) > 0.5 && !s.proc) { const p = posOf(s); const g = new THREE.BufferGeometry().setFromPoints([p, new THREE.Vector3(p.x, 0, p.z)]); this.scene.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: C.col, transparent: true, opacity: 0.12 }))); } }
    const sun = sunSprite(3.2); this.scene.add(sun);
    this.range = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.MeshBasicMaterial({ color: '#6ee7ff', transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide })); this.range.visible = false; this.scene.add(this.range);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.12, 40), new THREE.MeshBasicMaterial({ color: '#ffd36a', transparent: true, depthWrite: false, side: THREE.DoubleSide })); this.ring.visible = false; this.scene.add(this.ring, this.marks, this.flights);
  }
  resize(w: number, h: number) { this.camera.aspect = w / h; if (w < 700) this.camera.setViewOffset(w, h, 0, h * 0.24, w, h); else this.camera.setViewOffset(w, h, Math.min(210, w * 0.15), 0, w, h); this.camera.updateProjectionMatrix(); }
  posOf(id: string) { return posOf(STARS[id]); }
  // what the player has done out here: survey range, colonies, gates, surveyed stars brighter
  sync(range: number, surveyed: Record<string, number>, colonies: string[], gates: Record<string, number>) {
    this.range.visible = range > 0; this.range.scale.setScalar(Math.max(0.01, range * K)); this.marks.clear();
    for (const [id, sp] of this.sprites) { const known = id === 'sol' || !!surveyed[id]; (sp.material as THREE.SpriteMaterial).opacity = known ? 1 : 0.55; sp.scale.setScalar(sp.userData.size * (known ? 1.15 : 1)); }
    const ringAt = (id: string, col: string, r: number) => { const m = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.18, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide })); m.position.copy(this.posOf(id)); m.userData.bill = true; this.marks.add(m); };
    for (const id of new Set(colonies)) ringAt(id, '#7cf29a', 1.4); for (const id in gates) ringAt(id, '#c9a0ff', 2.0); }
  setFlights(list: { star: string; f: number; col: string }[]) { this.flights.clear(); const a = new THREE.Vector3();
    for (const fl of list) { const b = this.posOf(fl.star); const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineDashedMaterial({ color: fl.col, dashSize: 0.6, gapSize: 0.4, transparent: true, opacity: 0.6 })); line.computeLineDistances(); this.flights.add(line);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 6), new THREE.MeshBasicMaterial({ color: fl.col, toneMapped: false })); dot.position.copy(a).lerp(b, clamp(fl.f)); this.flights.add(dot); } }
  setFocus(id: string | null) { this.sel = id; const p = id ? this.posOf(id) : new THREE.Vector3(); this.cam.tfx = p.x; this.cam.tfy = p.y; this.cam.tfz = p.z; this.cam.tdist = id ? (id === 'sol' ? 40 : 24) : 70; }
  drag(dx: number, dy: number) { this.cam.tyaw -= dx * 0.006; this.cam.tpitch = clamp(this.cam.tpitch + dy * 0.004, -1.3, 1.45); }
  zoom(k: number) { this.cam.tdist = clamp(this.cam.tdist * k, 6, 200); }
  pick(x: number, y: number, w: number, h: number) { let best: string | null = null, bd = 22; for (const [id, sp] of this.sprites) { const p = sp.position.clone().project(this.camera); if (p.z > 1) continue; const d = Math.hypot(((p.x + 1) / 2) * w - x, ((1 - p.y) / 2) * h - y); if (d < bd) { bd = d; best = id; } } return best; }
  project(id: string, w: number, h: number) { const sp = this.sprites.get(id); if (!sp) return null; const p = sp.position.clone(); p.y += sp.userData.size * 0.45; const v = p.project(this.camera); if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) return null; return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h }; }
  frame(dt: number) { this.t += dt; const c = this.cam, k = 0.1; c.yaw += (c.tyaw - c.yaw) * k; c.pitch += (c.tpitch - c.pitch) * k; c.dist += (c.tdist - c.dist) * k; c.fx += (c.tfx - c.fx) * k; c.fy += (c.tfy - c.fy) * k; c.fz += (c.tfz - c.fz) * k;
    this.camera.position.set(c.fx + Math.cos(c.pitch) * Math.sin(c.yaw) * c.dist, c.fy + Math.sin(c.pitch) * c.dist, c.fz + Math.cos(c.pitch) * Math.cos(c.yaw) * c.dist); this.camera.lookAt(c.fx, c.fy, c.fz);
    if (this.sel && this.sprites.has(this.sel)) { const sp = this.sprites.get(this.sel)!; this.ring.visible = true; this.ring.position.copy(sp.position); this.ring.scale.setScalar(sp.userData.size * 0.75 + Math.sin(this.t * 3) * 0.05); this.ring.lookAt(this.camera.position); } else this.ring.visible = false;
    for (const m of this.marks.children) if (m.userData.bill) m.lookAt(this.camera.position); }
}
