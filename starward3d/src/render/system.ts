// The Solar System map: the Sun, orbit rings, planets and the destination worlds (moons circle their planets),
// the asteroid belt, and ships in transit along arcs from Earth. Its own scene, camera and touch controls.
import * as THREE from 'three';
import { DESTS, DEST_ORDER, PLANETS } from '../core/space';
import type { Expedition } from '../core/space';
const ANG: Record<string, number> = { mercury: 0.4, venus: 2.2, earth: 4.1, neo: 3.5, mars: 5.3, ceres: 1.2, jupiter: 2.6, saturn: 0.9, uranus: 3.9, neptune: 5.6, pluto: 4.6 };
export class SystemView {
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000); bodies = new Map<string, THREE.Object3D>(); private picks: THREE.Mesh[] = []; private ships = new Map<string, THREE.Mesh>();
  private yaw = 0.6; private dist = 34; private t = 0; active = false; private ray = new THREE.Raycaster(); onPick: (id: string) => void = () => {};
  constructor(private canvas: HTMLCanvasElement) {
    this.scene.add(new THREE.AmbientLight('#556070', 0.6)); const sunL = new THREE.PointLight('#fff2d8', 3.2, 0, 0); this.scene.add(sunL);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 20), new THREE.MeshBasicMaterial({ color: '#ffd27a', toneMapped: false })); this.scene.add(sun);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ffcf7a', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); glow.scale.setScalar(7); this.scene.add(glow);
    // stars
    const n = 1500, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = Math.sqrt(1 - u * u); p.set([r * Math.cos(a) * 600, u * 600, r * Math.sin(a) * 600], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(p, 3)); this.scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, color: '#cfe0ff' })));
    const orbit = (r: number, op = 0.18) => { const pts: THREE.Vector3[] = []; for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); } return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#6ee7ff', transparent: true, opacity: op })); };
    const planet = (id: string, r: number, color: string, size: number, ring = false) => { const g = new THREE.Group(); const geo = new THREE.IcosahedronGeometry(size, 3); const cols = new Float32Array(geo.attributes.position.count * 3); const c = new THREE.Color(color), c2 = new THREE.Color();
        for (let i = 0; i < geo.attributes.position.count; i++) { const y = geo.attributes.position.getY(i) / size; const n2 = Math.sin(y * 9 + i * 0.37) * 0.06; c2.copy(c).offsetHSL(0, 0, n2 + (Math.random() - 0.5) * 0.05); cols.set([c2.r, c2.g, c2.b], i * 3); }
        geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true })); g.add(m);
        if (ring) { const rg = new THREE.Mesh(new THREE.RingGeometry(size * 1.4, size * 2.3, 48), new THREE.MeshBasicMaterial({ color: '#d9c79a', side: THREE.DoubleSide, transparent: true, opacity: 0.6 })); rg.rotation.x = -Math.PI / 2.3; g.add(rg); }
        const a = ANG[id] ?? Math.random() * 6; g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); g.userData = { r, a, speed: 0.08 / Math.pow(r, 1.5), size }; this.scene.add(g); this.bodies.set(id, g); return g; };
    for (const pl of PLANETS) { this.scene.add(orbit(pl.dist)); planet(pl.id, pl.dist, pl.color, pl.size, !!pl.ring); }
    // the belt
    const nb = 700, bp = new Float32Array(nb * 3); for (let i = 0; i < nb; i++) { const a = Math.random() * 6.283, r = 6.6 + Math.random() * 1.5; bp.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.25, Math.sin(a) * r], i * 3); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3)); this.scene.add(new THREE.Points(bg, new THREE.PointsMaterial({ size: 0.05, color: '#a89880' })));
    // destination worlds: moons orbit their planet, the rest orbit the Sun
    for (const id of DEST_ORDER) { const d = DESTS[id]; let g: THREE.Object3D;
      if (d.moonOf) { const host = this.bodies.get(d.moonOf)!; const k = new THREE.Group(); const m = new THREE.Mesh(new THREE.IcosahedronGeometry(d.size, 2), new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.9, flatShading: true })); const off = (host.children[0] as THREE.Mesh).geometry.boundingSphere ? 0 : 0;
        k.add(m); const mr = host.userData.size || 0.4; m.position.x = mr + 0.45 + DEST_ORDER.indexOf(id) % 3 * 0.25 + off; k.userData = { spin: 0.6 + (DEST_ORDER.indexOf(id) % 4) * 0.25, mesh: m }; host.add(k); g = m; }
      else { this.scene.add(orbit(d.dist, 0.1)); g = planet(id, d.dist, d.color, d.size); }
      const pick = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.5, d.size * 2), 8, 6), new THREE.MeshBasicMaterial({ visible: false })); pick.userData.id = id; g.add(pick); this.picks.push(pick); this.bodies.set(id, g); }
    this.input();
  }
  private input() { let down: { x: number; y: number; id: number } | null = null, moved = false, pinch = 0; const pts = new Map<number, { x: number; y: number }>();
    this.canvas.addEventListener('pointerdown', (e) => { if (!this.active) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); down = { x: e.clientX, y: e.clientY, id: e.pointerId }; moved = false; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
    this.canvas.addEventListener('pointermove', (e) => { if (!this.active || !down) return; const p = pts.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x; p.x = e.clientX; p.y = e.clientY; if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7) moved = true;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) this.dist = Math.min(60, Math.max(10, this.dist * pinch / d)); pinch = d; } else if (moved) this.yaw -= dx * 0.006; });
    this.canvas.addEventListener('pointerup', (e) => { if (!this.active) return; pts.delete(e.pointerId); if (down && !moved && pts.size === 0) this.tap(e.clientX, e.clientY); if (!pts.size) down = null; });
    this.canvas.addEventListener('wheel', (e) => { if (!this.active) return; this.dist = Math.min(60, Math.max(10, this.dist * Math.pow(1.0015, e.deltaY))); }, { passive: true }); }
  private tap(x: number, y: number) { const r = this.canvas.getBoundingClientRect(); this.ray.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), this.camera); const h = this.ray.intersectObjects(this.picks, false)[0]; if (h) this.onPick(h.object.userData.id); }
  worldPos(id: string) { const b = this.bodies.get(id); const v = new THREE.Vector3(); if (b) b.getWorldPosition(v); return v; }
  project(v: THREE.Vector3) { const p = v.clone().project(this.camera); const r = this.canvas.getBoundingClientRect(); return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height, vis: p.z < 1 }; }
  focus(id: string) { const v = this.worldPos(id); this.yaw = Math.atan2(v.x, v.z); }
  // ships in transit: a glowing dart on an arc from Earth to its destination
  syncShips(exps: Expedition[], now: number) { const seen = new Set<string>(); for (const e of exps) { seen.add(e.id); let s = this.ships.get(e.id); if (!s) { s = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 6), new THREE.MeshBasicMaterial({ color: '#7cf29a', toneMapped: false })); this.scene.add(s); this.ships.set(e.id, s); }
      const k = Math.min(1, Math.max(0, (now - e.start) / (e.end - e.start))); const a = this.worldPos('earth'), b = this.worldPos(e.dest); const mid = a.clone().lerp(b, 0.5); mid.y += a.distanceTo(b) * 0.3; const p = new THREE.Vector3().copy(a).multiplyScalar((1 - k) * (1 - k)).addScaledVector(mid, 2 * k * (1 - k)).addScaledVector(b, k * k);
      const ahead = new THREE.Vector3().copy(a).multiplyScalar((1 - k - 0.01) ** 2).addScaledVector(mid, 2 * (k + 0.01) * (1 - k - 0.01)).addScaledVector(b, (k + 0.01) ** 2); s.position.copy(p); s.lookAt(ahead); s.rotateX(Math.PI / 2); }
    for (const [id, s] of this.ships) if (!seen.has(id)) { this.scene.remove(s); this.ships.delete(id); } }
  frame(dt: number, renderer: THREE.WebGLRenderer) { this.t += dt; const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight; if (this.camera.aspect !== w / h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    for (const [, b] of this.bodies) { const u = b.userData; if (u && u.r) { u.a += u.speed * dt; b.position.set(Math.cos(u.a) * u.r, 0, Math.sin(u.a) * u.r); b.rotation.y += dt * 0.3; } b.children.forEach((c) => { if (c.userData && c.userData.spin) c.rotation.y += dt * c.userData.spin; }); }
    const pitch = 0.95, d = this.dist * (w / h < 0.8 ? 1.5 : 1); this.camera.position.set(Math.sin(this.yaw) * Math.cos(pitch) * d, Math.sin(pitch) * d, Math.cos(this.yaw) * Math.cos(pitch) * d); this.camera.lookAt(0, 0, 0);
    renderer.render(this.scene, this.camera); }
}
let gt: THREE.Texture | null = null;
function glowTex() { if (gt) return gt; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!; const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.2, 'rgba(255,210,120,0.6)'); gr.addColorStop(1, 'rgba(255,180,80,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); gt = new THREE.CanvasTexture(c); return gt; }
