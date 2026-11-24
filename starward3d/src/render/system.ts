// The Solar System map in 3D: the Sun, every major body on its real orbit (positions move with time, so launch windows
// open and close before your eyes), moons around their planets, the asteroid belt, and ships in flight drawn along
// their route. Distances are compressed (square root of AU) so everything fits; sizes are log-scaled.
import * as THREE from 'three';
import { BODIES, BODY_ORDER } from '../data/solar';
import { angleOf, moonAngle } from '../core/solar';
import { earthGlobe, rockGlobe, terraGlobe, setTerraGlobe, starfield, sunSprite, nebula, Globe } from './planet';
import { clamp, hash, rng } from '../core/util';
const PAL: Record<string, string> = { mercury: '#9b8f84', venus: '#e8c98a', jupiter: '#d8b48a', saturn: '#e6d29a', uranus: '#9fe0e6', neptune: '#4f78e0', pluto: '#c9b49a', io: '#e8d25a', europa: '#e6dccb', ganymede: '#a89a8a', callisto: '#6e6258', titan: '#d9a24a', enceladus: '#f4f6f8', titania: '#b8b0a8', triton: '#d8c8c0', phobos: '#7a6a60', ceres: '#8a8680', vesta: '#a09a90', pallas: '#8f8a84', psyche: '#a8a39a', hygiea: '#5e5a56', eros: '#9a8a70', bennu: '#5a5450' };
export const distOf = (a: number) => 18 * Math.sqrt(a);
export const sizeOf = (r: number) => clamp(0.35 + Math.log10(Math.max(1, r) / 200) * 0.75, 0.22, 3.4);
export class SystemView {
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(42, 1, 0.1, 20000); bodies = new Map<string, { g: THREE.Object3D; mesh: THREE.Mesh; size: number; globe?: Globe }>(); sun = new THREE.Vector3(0, 0, 0);
  cam = { yaw: 0.7, pitch: 0.55, dist: 95, tdist: 95, tyaw: 0.7, tpitch: 0.55, fx: 0, fz: 0, tfx: 0, tfz: 0 }; focus = ''; private ships = new THREE.Group(); private t = 0; private sel: THREE.Mesh; private head = new THREE.DirectionalLight('#cdd8ff', 0.9);
  constructor(renderer: THREE.WebGLRenderer, big: boolean) {
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), new THREE.MeshBasicMaterial({ map: nebula(renderer, big), side: THREE.BackSide, depthWrite: false })), starfield(8000, big ? 3000 : 1600, 1.8));
    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(3.2, 32, 16), new THREE.MeshBasicMaterial({ color: '#ffd98a', toneMapped: false })); this.scene.add(sunMesh); const glow = sunSprite(40); this.scene.add(glow);
    // the Sun lights the day sides; a soft headlight from the camera keeps night sides readable on the map
    this.scene.add(new THREE.PointLight('#fff4e0', 3.2, 0, 0), new THREE.AmbientLight('#5a6c90', 0.7), this.head, this.head.target);
    // the asteroid belt: a ring of rocks between Mars and Jupiter
    const R = rng(7), n = big ? 1600 : 800, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, d = distOf(2.1 + R() * 1.3); pos.set([Math.cos(a) * d, (R() - 0.5) * 1.2, Math.sin(a) * d], i * 3); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); this.scene.add(new THREE.Points(bg, new THREE.PointsMaterial({ color: '#a89e94', size: big ? 2.2 : 1.8, sizeAttenuation: false, map: dotTex(), transparent: true, alphaTest: 0.3, depthWrite: false })));
    const sunDirFrom = (p: THREE.Vector3) => p.clone().negate().normalize();
    for (const id of BODY_ORDER) { const b = BODIES[id]; if (!b) continue; const isMoon = !!b.parent; const size = isMoon ? Math.max(0.18, sizeOf(b.r) * 0.55) : sizeOf(b.r); let g: THREE.Object3D, mesh: THREE.Mesh, globe: Globe | undefined;
      if (id === 'earth') { globe = earthGlobe(renderer, size, new THREE.Vector3(1, 0, 0), big); g = globe.group; mesh = globe.mesh; }
      else if (id === 'mars' || id === 'venus') { globe = terraGlobe(renderer, size, new THREE.Vector3(1, 0, 0), id); g = globe.group; mesh = globe.mesh; }
      else if (id === 'moon') { globe = rockGlobe(renderer, size, new THREE.Vector3(1, 0, 0), 2, 4); g = globe.group; mesh = globe.mesh; }
      else { mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 24, 12), new THREE.MeshStandardMaterial({ color: PAL[id] || '#999', roughness: 0.9, map: b.type === 'Gas giant' ? bandTex(PAL[id] || '#ccc', hash(id)) : null })); g = mesh;
        if (b.rings) { const ring = new THREE.Mesh(new THREE.RingGeometry(size * 1.35, size * 2.3, 48), new THREE.MeshBasicMaterial({ color: '#e8d8b0', side: THREE.DoubleSide, transparent: true, opacity: 0.55 })); ring.rotation.x = Math.PI / 2.4; (g as THREE.Mesh).add(ring); } }
      mesh.userData.body = id; this.scene.add(g); this.bodies.set(id, { g, mesh, size, globe });
      if (!isMoon && b.a) { const orbit = new THREE.Mesh(new THREE.RingGeometry(distOf(b.a) - 0.05, distOf(b.a) + 0.05, 180), new THREE.MeshBasicMaterial({ color: '#6ee7ff', transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })); orbit.rotation.x = Math.PI / 2; this.scene.add(orbit); } }
    void sunDirFrom;
    this.sel = new THREE.Mesh(new THREE.RingGeometry(1, 1.035, 64), new THREE.MeshBasicMaterial({ color: '#ffd36a', side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false })); this.sel.visible = false; this.scene.add(this.sel, this.ships);
  }
  // the world panel covers the bottom of a phone screen and the right of a wide one: shift the view so the focused
  // world sits in the part you can see (labels and picking use the same projection, so they follow)
  resize(w: number, h: number) { this.camera.aspect = w / h; if (w < 700) this.camera.setViewOffset(w, h, 0, h * 0.26, w, h); else this.camera.setViewOffset(w, h, Math.min(210, w * 0.15), 0, w, h); this.camera.updateProjectionMatrix(); }
  posOf(id: string, t = Date.now()): THREE.Vector3 { const b = BODIES[id]; if (!b) return new THREE.Vector3(); if (b.parent) { const p: THREE.Vector3 = this.posOf(b.parent, t); const ps = this.bodies.get(b.parent)?.size || 1; const r = ps + 1.2 + Math.log10(Math.max(1000, b.orbit || 1e5) / 1000) * 0.9; const a = moonAngle(id, t); return p.add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    if (!b.a) return new THREE.Vector3(); const a = angleOf(id, t); const d = distOf(b.a); return new THREE.Vector3(Math.cos(a) * d, 0, -Math.sin(a) * d); }
  setFocus(id: string) { this.focus = id; const p = id ? this.posOf(id) : new THREE.Vector3(); this.cam.tfx = p.x; this.cam.tfz = p.z; this.cam.tdist = id ? Math.max(15, (this.bodies.get(id)?.size || 1) * 15) : 95; }
  drag(dx: number, dy: number) { this.cam.tyaw -= dx * 0.006; this.cam.tpitch = clamp(this.cam.tpitch + dy * 0.004, 0.08, 1.45); }
  zoom(k: number) { this.cam.tdist = clamp(this.cam.tdist * k, 4, 320); }
  pick(x: number, y: number, w: number, h: number) { const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1), this.camera); const meshes = [...this.bodies.values()].map((b) => b.mesh);
    const hit = ray.intersectObjects(meshes, false)[0]; if (hit) return hit.object.userData.body as string;
    // generous picking for small worlds: the nearest body to the ray within a few pixels
    let best = '', bd = 1e9; for (const [id, b] of this.bodies) { const p = b.g.position.clone().project(this.camera); const dx = ((p.x + 1) / 2) * w - x, dy = ((1 - p.y) / 2) * h - y; const d = Math.hypot(dx, dy); if (d < 22 && d < bd && p.z < 1) { bd = d; best = id; } } return best || null; }
  // terraforming shows from space: seas, green, clouds and a bluer halo, stage by stage
  setTerra(id: 'mars' | 'venus', T: Record<string, number> | null) { const b = this.bodies.get(id); if (b && b.globe) setTerraGlobe(b.globe, id, T); }
  // comms relays: tiny satellites circling every world that has them (one per level, up to eight)
  private relays = new THREE.Group(); private relayKey = '';
  setRelays(map: Record<string, number>) { const key = JSON.stringify(map); if (key === this.relayKey) return; this.relayKey = key; this.relays.clear(); if (!this.relays.parent) this.scene.add(this.relays);
    const mat = new THREE.MeshBasicMaterial({ color: '#9ff3ff', toneMapped: false }); for (const id in map) { const b = this.bodies.get(id); if (!b) continue; const n = Math.min(8, map[id]);
      for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.07 + b.size * 0.03, 0), mat); m.userData = { id, r: b.size * (1.6 + (i % 3) * 0.25), a: (i / n) * Math.PI * 2, tilt: (i % 4) * 0.5 - 0.6, s: 0.6 + (i % 3) * 0.25 }; this.relays.add(m); } } }
  // ships in flight: a glowing dot that moves from Earth to its target as the voyage goes
  setFlights(list: { body: string; f: number; col: string }[]) { this.ships.clear(); for (const fl of list) { const a = this.posOf('earth'), b = this.posOf(fl.body); const mid = a.clone().lerp(b, 0.5); mid.y += a.distanceTo(b) * 0.18; const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(32)), new THREE.LineBasicMaterial({ color: fl.col, transparent: true, opacity: 0.45 })); this.ships.add(line);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 6), new THREE.MeshBasicMaterial({ color: fl.col, toneMapped: false })); dot.position.copy(curve.getPoint(clamp(fl.f))); this.ships.add(dot); } }
  frame(dt: number, sel: string | null) {
    this.t += dt; const now = Date.now();
    for (const [id, b] of this.bodies) { const p = this.posOf(id, now); b.g.position.copy(p); b.mesh.rotation.y = this.t * 0.2; const sd = p.clone().negate().normalize().multiplyScalar(0.55).add(this.camera.position.clone().sub(p).normalize().multiplyScalar(0.8)).normalize(); if (b.globe && b.globe.uniforms) { b.globe.uniforms.uSun.value = sd; b.globe.uniforms.uTime.value = this.t; } else if (b.globe) { const u = (b.globe.mesh.material as THREE.ShaderMaterial).uniforms; if (u && u.uSun) u.uSun.value = sd; } }
    for (const m of this.relays.children) { const d = m.userData; const c = this.bodies.get(d.id)!.g.position; const a = d.a + this.t * d.s; m.position.set(c.x + Math.cos(a) * d.r, c.y + Math.sin(a) * d.r * Math.sin(d.tilt), c.z + Math.sin(a) * d.r * Math.cos(d.tilt)); m.rotation.y = this.t; }
    if (this.focus) { const p = this.posOf(this.focus, now); this.cam.tfx = p.x; this.cam.tfz = p.z; }
    this.head.position.copy(this.camera.position); this.head.target.position.set(this.cam.fx, 0, this.cam.fz);
    if (sel && this.bodies.has(sel)) { const b = this.bodies.get(sel)!; this.sel.visible = true; this.sel.position.copy(b.g.position); this.sel.scale.setScalar(b.size * 1.75); this.sel.lookAt(this.camera.position); } else this.sel.visible = false;
    const c = this.cam, k = 0.1; c.yaw += (c.tyaw - c.yaw) * k; c.pitch += (c.tpitch - c.pitch) * k; c.dist += (c.tdist - c.dist) * k; c.fx += (c.tfx - c.fx) * k; c.fz += (c.tfz - c.fz) * k;
    this.camera.position.set(c.fx + Math.cos(c.pitch) * Math.sin(c.yaw) * c.dist, Math.sin(c.pitch) * c.dist, c.fz + Math.cos(c.pitch) * Math.cos(c.yaw) * c.dist); this.camera.lookAt(c.fx, 0, c.fz);
  }
  project(id: string, w: number, h: number) { const b = this.bodies.get(id); if (!b) return null; const p = b.g.position.clone(); p.y += b.size + 0.4; const v = p.project(this.camera); if (v.z > 1) return null; return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h }; }
}
let dot: THREE.Texture | null = null; function dotTex() { if (dot) return dot; const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d')!; const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(0.6, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); dot = new THREE.CanvasTexture(c); return dot; }
function bandTex(color: string, seed: number) { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d')!; const R = rng(seed); const base = new THREE.Color(color);
  for (let y = 0; y < 128; y += 4) { const k = 0.82 + R() * 0.3; g.fillStyle = '#' + base.clone().multiplyScalar(k).getHexString(); g.fillRect(0, y, 64, 4 + Math.floor(R() * 6)); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
