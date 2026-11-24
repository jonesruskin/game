// The 3D world: renderer, near-isometric camera with pan / pinch / twist / wheel, the world's environment, building
// views kept in sync with the save, placement ghosts, selection, construction drones, particle bursts and
// screen projection for the HUD bubbles.
import * as THREE from 'three';
import { Env } from './env';
import { buildModel, scaffold, droneModel, Look, Model } from './models';
import { MATS } from './kit';
import { State } from '../core/state';
import * as G from '../core/game';
import { GRID } from '../data/buildings';
import { clamp } from '../core/util';
import { OrbitView } from './orbit';
import { SystemView } from './system';
import { Walkers } from './walkers';
import { rb } from '../core/robots';
import { terraState, breathable, relayLevel } from '../core/solar';
import { sp } from '../core/space';
import { rocketModel, RocketModel } from './rocket';
import type { Design } from '../data/rockets';
import type { Space } from '../core/space';
interface View { key: string; root: THREE.Group; model: Model; pick: THREE.Mesh; scaf?: THREE.Group; }
interface Drone { g: THREE.Group; job: string; ph: number; spark: THREE.Mesh; }
export interface Ghost { b: string; r: number; x: number; z: number; move?: string; ok: boolean; }
const C = GRID / 2;
export class World {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera: THREE.PerspectiveCamera; env!: Env; sun: THREE.DirectionalLight; hemi: THREE.HemisphereLight;
  views = new Map<string, View>(); drones = new Map<string, Drone>(); baseId = ''; look: Look = { primary: '#e9eef5', accent: '#22c7e8', banner: { bg: '#1b6fd8', fg: '#ffd23a', emblem: 'rocket' } };
  cam = { x: 0, z: 2, y: 0, dist: 44, yaw: Math.PI / 4, tx: 0, tz: 2, ty: 0, tdist: 44, tyaw: Math.PI / 4 }; quality: 'high' | 'low';
  mode: 'base' | 'orbit' | 'system' = 'base'; system: SystemView | null = null; onPick: (body: string | null) => void = () => {}; walkers: Walkers | null = null; private walkKey = ''; orbit: OrbitView | null = null; private padRocket: { key: string; m: RocketModel; item: string } | null = null;
  private flights: { m: RocketModel; t: number; x: number; z: number; smoke: THREE.Points; v: Float32Array; life: Float32Array }[] = []; private saved: { x: number; z: number; dist: number } | null = null;
  ghost: Ghost | null = null; private ghostObj: THREE.Group | null = null; selRing: THREE.Mesh; selected: string | null = null; t = 0;
  private ray = new THREE.Raycaster(); private ptr = new THREE.Vector2(); private fx: { pts: THREE.Points; v: Float32Array; life: number }[] = []; private area = { lo: 0, hi: 0 };
  onTap: (hit: { item?: string; cell?: [number, number] }) => void = () => {}; onGhostMove: () => void = () => {};
  private shF = 0; private shX = 1e9; private shZ = 1e9;
  constructor(private canvas: HTMLCanvasElement, quality: 'auto' | 'high' | 'low') {
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ((navigator as any).maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 820);
    this.quality = quality === 'auto' ? (mobile ? 'low' : 'high') : quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality === 'high', powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 2 : 1.5)); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.0; this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.5, 6000);
    this.sun = new THREE.DirectionalLight('#fff1d6', 2.8); this.sun.castShadow = true; const sz = this.quality === 'high' ? 2048 : 1024; this.sun.shadow.mapSize.set(sz, sz);
    const sc = this.sun.shadow.camera; sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 160; this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.03;
    this.hemi = new THREE.HemisphereLight('#bcd8ff', '#5a6a3a', 0.9); this.scene.add(this.sun, this.sun.target, this.hemi, new THREE.AmbientLight('#405070', 0.25));
    this.selRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48), new THREE.MeshBasicMaterial({ color: '#6ee7ff', transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide })); this.selRing.rotation.x = -Math.PI / 2; this.selRing.visible = false; this.scene.add(this.selRing);
    this.resize(); window.addEventListener('resize', () => this.resize()); this.input();
  }
  resize() { const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.orbit?.resize(w, h); this.system?.resize(w, h); }
  openSystem() { if (!this.system) { this.system = new SystemView(this.renderer, this.quality === 'high'); this.resize(); } this.mode = 'system'; this.select(null); }
  openOrbit(S: Space) { if (!this.orbit) { this.orbit = new OrbitView(this.renderer, this.quality === 'high'); this.resize(); } this.orbit.sync(S); this.mode = 'orbit'; this.select(null); }
  closeOrbit() { this.mode = 'base'; }
  mapSel: string | null = null;
  // switch to a world (builds its environment)
  // a base's scenery is rebuilt when you travel there or its terraforming moves on a stage
  private worldKey = '';
  setWorld(s: State, base: string) {
    const body = s.bases[base].body, T = terraState(s, body); const key = `${base}:${T ? T.n : 0}`; if (this.worldKey === key) return; this.worldKey = key;
    this.baseId = base; if (this.env) this.env.dispose(); this.env = new Env(this.scene, body, this.quality, this.renderer, T); if (this.walkers) this.walkers.clear(); else this.walkers = new Walkers(this.scene, this.quality); this.walkers.suits(body !== 'earth' && !breathable(T)); this.walkKey = '';
    for (const v of this.views.values()) this.scene.remove(v.root); this.views.clear(); for (const d of this.drones.values()) this.scene.remove(d.g); this.drones.clear();
    const L = this.env.look; this.scene.fog = new THREE.Fog(L.fog, L.fogNear, L.fogFar); this.sun.color.set(L.sun); this.sun.intensity = L.sunI; this.hemi.color.set(L.amb[0]); this.hemi.groundColor.set(L.amb[1]); this.hemi.intensity = L.amb[2]; this.area = { lo: -1, hi: -1 };
  }
  // ---------------- camera ----------------
  private placeCamera() {
    const c = this.cam; const k = 0.16; c.x += (c.tx - c.x) * k; c.z += (c.tz - c.z) * k; c.dist += (c.tdist - c.dist) * k; c.yaw += (c.tyaw - c.yaw) * k;
    c.y += (c.ty - c.y) * 0.08; const pitch = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(52, 17, clamp((c.dist - 14) / 81))); const narrow = this.camera.aspect < 0.8 ? 1.45 : 1; const d = c.dist * narrow;
    this.camera.position.set(c.x + Math.sin(c.yaw) * Math.cos(pitch) * d, Math.sin(pitch) * d + 1 + c.y * 0.85, c.z + Math.cos(c.yaw) * Math.cos(pitch) * d); this.camera.lookAt(c.x, 0.5 + c.y, c.z);
    this.sun.target.position.set(c.x, 0, c.z); this.sun.position.set(c.x - 0.55 * 70, 0.62 * 70, c.z + 0.42 * 70);
  }
  focus(x: number, z: number, dist?: number) { this.cam.tx = x; this.cam.tz = z; if (dist) this.cam.tdist = dist; }
  private clampCam() { const c = this.cam, L = C + 6; c.tx = clamp(c.tx, -L, L); c.tz = clamp(c.tz, -L, L); c.tdist = clamp(c.tdist, 12, 95); }
  groundAt(cx: number, cy: number): THREE.Vector3 | null { const r = this.canvas.getBoundingClientRect(); this.ptr.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ptr, this.camera); const p = new THREE.Vector3(); return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) ? p : null; }
  private input() {
    const el = this.canvas; const pts = new Map<number, { x: number; y: number; sx: number; sy: number }>(); let moved = false, start = 0, last: { d: number; a: number } | null = null; let ghostDrag = false;
    const two = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), a: Math.atan2(b.y - a.y, b.x - a.x) }; };
    el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }); moved = false; start = performance.now(); if (pts.size === 2) last = two();
      ghostDrag = false; if (this.ghost && pts.size === 1) { const g = this.groundAt(e.clientX, e.clientY); if (g) { const [w, d] = G.dims(this.ghost.b, this.ghost.r); const gx = this.ghost.x - C, gz = this.ghost.z - C; if (g.x >= gx - 0.6 && g.x <= gx + w + 0.6 && g.z >= gz - 0.6 && g.z <= gz + d + 0.6) ghostDrag = true; } } });
    el.addEventListener('pointermove', (e) => { const p = pts.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (Math.hypot(p.x - p.sx, p.y - p.sy) > 7) moved = true; if (!moved) return;
      if (this.mode === 'system' && this.system) { if (pts.size === 1) this.system.drag(dx, dy); else if (pts.size === 2 && last) { const n = two(); this.system.zoom(last.d / Math.max(1, n.d)); last = n; } return; }
      if (this.mode === 'orbit' && this.orbit) { if (pts.size === 1) this.orbit.drag(dx, dy); else if (pts.size === 2 && last) { const n = two(); this.orbit.zoom(last.d / Math.max(1, n.d)); last = n; } return; }
      if (pts.size === 1) { if (ghostDrag && this.ghost) { this.ghostTo(e.clientX, e.clientY); return; }
        if (e.buttons === 2) { this.cam.tyaw -= dx * 0.008; return; } const s = this.cam.dist * 0.0021 * (this.camera.aspect < 0.8 ? 1.45 : 1); const cy = Math.cos(this.cam.yaw), sy = Math.sin(this.cam.yaw);
        this.cam.tx -= (dx * cy + dy * sy * 1.3) * s; this.cam.tz -= (-dx * sy + dy * cy * 1.3) * s; this.clampCam(); }
      else if (pts.size === 2 && last) { const n = two(); this.cam.tdist *= last.d / Math.max(1, n.d); this.cam.tyaw -= n.a - last.a; last = n; this.clampCam(); } });
    const up = (e: PointerEvent) => { const p = pts.get(e.pointerId); pts.delete(e.pointerId); if (pts.size < 2) last = null; if (!p || moved || e.button === 2) return; if (performance.now() - start > 600) return; this.tap(e.clientX, e.clientY); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', (e) => pts.delete(e.pointerId)); el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('wheel', (e) => { e.preventDefault(); if (this.mode === 'orbit' && this.orbit) { this.orbit.zoom(Math.pow(1.0015, e.deltaY)); return; } if (this.mode === 'system' && this.system) { this.system.zoom(Math.pow(1.0015, e.deltaY)); return; } this.cam.tdist *= Math.pow(1.0015, e.deltaY); this.clampCam(); }, { passive: false });
    window.addEventListener('keydown', (e) => { if ((e.target as HTMLElement).tagName === 'INPUT') return; if (e.key === 'q' || e.key === 'Q') this.cam.tyaw += Math.PI / 4; if (e.key === 'e' || e.key === 'E') this.cam.tyaw -= Math.PI / 4; });
  }
  private tap(cx: number, cy: number) {
    if (this.mode === 'system' && this.system) { const r = this.canvas.getBoundingClientRect(); this.onPick(this.system.pick(cx - r.left, cy - r.top, r.width, r.height)); return; }
    if (this.mode === 'orbit') return; if (this.ghost) { this.ghostTo(cx, cy); return; }
    const r = this.canvas.getBoundingClientRect(); this.ptr.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); this.ray.setFromCamera(this.ptr, this.camera);
    const hit = this.ray.intersectObjects([...this.views.values()].map((v) => v.pick), false)[0]; if (hit) { this.onTap({ item: hit.object.userData.item }); return; }
    const g = this.groundAt(cx, cy); this.onTap(g ? { cell: [Math.floor(g.x + C), Math.floor(g.z + C)] } : {});
  }
  // ---------------- placement ghost ----------------
  startGhost(g: Ghost) { this.ghost = g; this.env.showGrid(true); this.rebuildGhost(); }
  endGhost() { this.ghost = null; if (this.ghostObj) this.scene.remove(this.ghostObj); this.ghostObj = null; this.env.showGrid(false); for (const v of this.views.values()) v.root.visible = true; }
  private ghostTo(cx: number, cy: number) { const g = this.groundAt(cx, cy); if (!g || !this.ghost) return; const [w, d] = G.dims(this.ghost.b, this.ghost.r);
    const x = Math.round(g.x + C - w / 2), z = Math.round(g.z + C - d / 2); if (x !== this.ghost.x || z !== this.ghost.z) { this.ghost.x = x; this.ghost.z = z; this.onGhostMove(); } }
  rotateGhost() { if (!this.ghost) return; this.ghost.r = (this.ghost.r + 1) % 4; this.rebuildGhost(); this.onGhostMove(); }
  rebuildGhost() {
    if (this.ghostObj) this.scene.remove(this.ghostObj); const g = this.ghost!; const [w, d] = G.dims(g.b, g.r); const root = new THREE.Group();
    const m = buildModel(g.b, 1, this.look); m.group.rotation.y = (-g.r * Math.PI) / 2; m.group.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh) mm.castShadow = false; }); root.add(m.group);
    const foot = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MATS.ghostOk); foot.rotation.x = -Math.PI / 2; foot.position.y = 0.06; foot.name = 'foot'; root.add(foot); this.ghostObj = root; this.scene.add(root); this.syncGhost();
  }
  syncGhost() { const g = this.ghost; if (!g || !this.ghostObj) return; const [w, d] = G.dims(g.b, g.r); this.ghostObj.position.set(g.x + w / 2 - C, 0.05, g.z + d / 2 - C); (this.ghostObj.getObjectByName('foot') as THREE.Mesh).material = g.ok ? MATS.ghostOk : MATS.ghostBad; }
  // ---------------- sync with the save ----------------
  sync(s: State) {
    const B = s.bases[this.baseId]; if (!B) return; const A = G.area(s, this.baseId); if (A.lo !== this.area.lo || A.hi !== this.area.hi) { this.area = { lo: A.lo, hi: A.hi }; this.env.setArea(A.lo, A.hi); }
    this.env.setSats(this.baseId === 'earth' ? (sp(s).sats || []).length : relayLevel(s, this.baseId) * 2);
    const lookKey = JSON.stringify(this.look); const seen = new Set<string>();
    for (const it of B.items) { seen.add(it.id); const job = G.jobOf(s, it.id); const key = `${it.b}|${it.lvl}|${it.r}|${job ? 1 : 0}|${lookKey}`; let v = this.views.get(it.id);
      if (!v || v.key !== key) { if (v) this.scene.remove(v.root); v = this.makeView(it.id, it.b, it.lvl, it.r, !!job, key); this.views.set(it.id, v); }
      const [w, d] = G.dims(it.b, it.r); v.root.position.set(it.x + w / 2 - C, 0, it.z + d / 2 - C); v.root.visible = !(this.ghost && this.ghost.move === it.id); }
    for (const [id, v] of this.views) if (!seen.has(id)) { this.scene.remove(v.root); this.views.delete(id); }
    const RR = rb(s); const wk = B.items.map((i) => i.id + i.lvl).join() + '|' + RR.list.map((r) => r.id + r.lvl + (r.post ? r.post.item : '')).join(); if (wk !== this.walkKey) { this.walkKey = wk; this.walkers!.sync(s, this.baseId, RR.list); }
    // a drone hovers over every active construction site on this world
    const active = new Set<string>(); for (const j of s.jobs) if (j.kind === 'build' && j.base === this.baseId) { active.add(j.id); if (!this.drones.has(j.id)) { const g = droneModel(); const spark = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshBasicMaterial({ color: '#bff8ff', toneMapped: false })); g.add(spark); this.scene.add(g); this.drones.set(j.id, { g, job: j.item!, ph: Math.random() * 6, spark }); } }
    for (const [id, d] of this.drones) if (!active.has(id)) { this.scene.remove(d.g); this.drones.delete(id); }
  }
  private makeView(id: string, b: string, lvl: number, r: number, building: boolean, key: string): View {
    const root = new THREE.Group(); const m = buildModel(b, Math.max(1, lvl), this.look); m.group.rotation.y = (-r * Math.PI) / 2; root.add(m.group); const [w, d] = G.dims(b, r);
    const ph = Math.max(0.8, m.height); const pick = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, ph, d * 0.96), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = ph / 2; pick.userData.item = id; root.add(pick);
    let scaf; if (building) { scaf = scaffold(w, d, Math.max(1, m.height * 0.8)); root.add(scaf); if (lvl === 0) m.group.scale.y = 0.3; }
    this.scene.add(root); return { key, root, model: m, pick, scaf };
  }
  centerOf(id: string) { const v = this.views.get(id); return v ? v.root.position.clone() : null; }
  topOf(id: string) { const v = this.views.get(id); if (!v) return null; const p = v.root.position.clone(); p.y = v.model.height + 0.4; return p; }
  select(id: string | null) { this.selected = id; const v = id ? this.views.get(id) : null; if (!v) { this.selRing.visible = false; return; } const box = new THREE.Box3().setFromObject(v.pick); const s = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.62; this.selRing.scale.setScalar(s); this.selRing.position.set(v.root.position.x, 0.08, v.root.position.z); this.selRing.visible = true; }
  project(p: { x: number; y: number; z: number }) { const v = new THREE.Vector3(p.x, p.y, p.z).project(this.camera); const r = this.canvas.getBoundingClientRect(); return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, behind: v.z > 1 }; }
  burst(at: THREE.Vector3, color: string, n = 24) { const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos.set([at.x, at.y, at.z], i * 3); vel.set([(Math.random() - 0.5) * 4, 2 + Math.random() * 4, (Math.random() - 0.5) * 4], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.28, transparent: true, depthWrite: false })); this.scene.add(pts); this.fx.push({ pts, v: vel, life: 1 }); }
  // ---------------- rockets ----------------
  // the next rocket in the hangar stands on the pad, ready to fly
  setPadRocket(d: Design | null, padId: string | null) {
    const key = d && padId ? d.id + JSON.stringify(d) + padId + JSON.stringify(this.look) : '';
    if (this.padRocket && this.padRocket.key === key) return; if (this.padRocket) { this.views.get(this.padRocket.item)?.root.remove(this.padRocket.m.group); this.padRocket = null; }
    if (!d || !padId) return; const v = this.views.get(padId); if (!v) return; const m = rocketModel(d, this.look); m.group.position.set(0, 0.42, 0); v.root.add(m.group); this.padRocket = { key, m, item: padId };
  }
  launchFx(d: Design, padId: string) {
    const v = this.views.get(padId); if (!v) return; if (this.padRocket && this.padRocket.item === padId) { v.root.remove(this.padRocket.m.group); this.padRocket = null; }
    const m = rocketModel(d, this.look); const x = v.root.position.x, z = v.root.position.z; m.group.position.set(x, 0.42, z); m.flame.visible = true; this.scene.add(m.group);
    const n = this.quality === 'high' ? 420 : 220; const pos = new Float32Array(n * 3).fill(-999), vel = new Float32Array(n * 3), life = new Float32Array(n);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const smoke = new THREE.Points(g, new THREE.PointsMaterial({ color: '#eef0f3', size: 3.2, transparent: true, opacity: 0.55, depthWrite: false, map: smokeTex() }));
    this.scene.add(smoke); this.flights.push({ m, t: 0, x, z, smoke, v: vel, life }); this.saved = { x: this.cam.tx, z: this.cam.tz, dist: this.cam.tdist }; this.focus(x, z, Math.max(this.cam.tdist, 34));
  }
  private flightsFrame(dt: number) {
    for (const f of [...this.flights]) { f.t += dt; const T = Math.max(0, f.t - 1.2); const y = 0.42 + 2.2 * T * T + 0.6 * T; f.m.group.position.y = y; f.m.flame.scale.set(1, 0.8 + Math.random() * 0.4 + Math.min(1.5, T * 0.4), 1); f.m.group.rotation.z = Math.min(0.25, T * T * 0.004);
      const p = f.smoke.geometry.attributes.position as THREE.BufferAttribute; const n = f.life.length; const emit = f.t < 8 ? 5 : 0; let e = 0;
      for (let i = 0; i < n; i++) { if (f.life[i] <= 0 && e < emit) { e++; f.life[i] = 1; const low = y < 3; p.setXYZ(i, f.x + (Math.random() - 0.5) * 0.4, low ? 0.4 : y - 1.2, f.z + (Math.random() - 0.5) * 0.4); const a = Math.random() * Math.PI * 2, sp = low ? 1.2 + Math.random() * 1.8 : 0.25; f.v.set([Math.cos(a) * sp, low ? 0.3 + Math.random() * 0.6 : -0.8, Math.sin(a) * sp], i * 3); }
        if (f.life[i] > 0) { f.life[i] -= dt * 0.22; p.setXYZ(i, p.getX(i) + f.v[i * 3] * dt, p.getY(i) + f.v[i * 3 + 1] * dt, p.getZ(i) + f.v[i * 3 + 2] * dt); f.v[i * 3] *= 0.97; f.v[i * 3 + 2] *= 0.97; f.v[i * 3 + 1] += dt * 0.25; if (f.life[i] <= 0) p.setXYZ(i, 0, -999, 0); } }
      p.needsUpdate = true; this.cam.ty = Math.min(28, Math.max(0, y - 2) * 0.8);
      if (f.t > 11) { this.scene.remove(f.m.group, f.smoke); f.smoke.geometry.dispose(); this.flights.splice(this.flights.indexOf(f), 1); this.cam.ty = 0; if (this.saved && !this.flights.length) { this.focus(this.saved.x, this.saved.z, this.saved.dist); this.saved = null; } } }
  }
  // ---------------- frame ----------------
  frame(s: State, dt: number, working: (id: string) => boolean) {
    this.t += dt; const t = this.t;
    if (this.mode === 'orbit' && this.orbit) { this.orbit.frame(dt); this.renderer.render(this.orbit.scene, this.orbit.camera); return; }
    if (this.mode === 'system' && this.system) { this.system.frame(dt, this.mapSel); this.renderer.render(this.system.scene, this.system.camera); return; }
    this.placeCamera(); this.env.update(t, dt); this.flightsFrame(dt); this.walkers?.frame(s, this.baseId, t, dt);
    for (const [id, v] of this.views) { v.model.anim?.(t, { working: working(id) }); if (v.scaf) { const cr = v.scaf.children[0]; if (cr) cr.rotation.y = 0; } }
    for (const d of this.drones.values()) { const c = this.views.get(d.job); if (!c) continue; const h = c.model.height + 0.8; const a = t * 1.3 + d.ph; d.g.position.set(c.root.position.x + Math.cos(a) * 0.9, h + Math.sin(t * 3 + d.ph) * 0.15, c.root.position.z + Math.sin(a) * 0.9); d.g.rotation.y = -a;
      d.spark.position.set(0, -0.25 - Math.random() * 0.1, 0); d.spark.visible = Math.sin(t * 23 + d.ph) > 0.2; }
    if (this.selRing.visible) (this.selRing.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(t * 4) * 0.3;
    for (const f of [...this.fx]) { f.life -= dt * 1.2; const p = f.pts.geometry.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { f.v[i * 3 + 1] -= dt * 7; p.setXYZ(i, p.getX(i) + f.v[i * 3] * dt, p.getY(i) + f.v[i * 3 + 1] * dt, p.getZ(i) + f.v[i * 3 + 2] * dt); }
      p.needsUpdate = true; (f.pts.material as THREE.PointsMaterial).opacity = Math.max(0, f.life); if (f.life <= 0) { this.scene.remove(f.pts); f.pts.geometry.dispose(); this.fx.splice(this.fx.indexOf(f), 1); } }
    if (this.quality === 'low') { const sm = this.renderer.shadowMap, tp = this.sun.target.position; sm.autoUpdate = false; if (++this.shF % 3 === 0 || Math.abs(tp.x - this.shX) + Math.abs(tp.z - this.shZ) > 1e-3) { sm.needsUpdate = true; this.shX = tp.x; this.shZ = tp.z; } }
    this.renderer.render(this.scene, this.camera);
  }
}
let sTex: THREE.Texture | null = null;
function smokeTex() { if (sTex) return sTex; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!; const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); sTex = new THREE.CanvasTexture(c); return sTex; }
