// The 3D world: renderer, near-isometric camera with pan / pinch / twist / wheel, the island, building and bot
// views kept in sync with the save, placement ghosts, selection, particle bursts and screen projection.
import * as THREE from 'three';
import { Backdrop } from './sky';
import { IslandView, N } from './island';
import { buildModel, scaffold, Look, Model } from './models';
import { buildBot, BotModel } from './botmodels';
import { MATS } from './kit';
import { State, Item } from '../core/state';
import * as G from '../core/game';
import { BUILDINGS } from '../data/buildings';
import { clamp } from '../core/util';
interface View { key: string; root: THREE.Group; model: Model; pick: THREE.Mesh; scaf?: THREE.Group; }
interface BotView { key: string; model: BotModel; pos: THREE.Vector3; target: THREE.Vector3; wait: number; bay: string; }
export interface Ghost { t: string; el?: string; r: number; x: number; z: number; move?: string; ok: boolean; }
export class World {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera: THREE.PerspectiveCamera; island = new IslandView(); backdrop: Backdrop;
  views = new Map<string, View>(); bots = new Map<string, BotView>(); sun: THREE.DirectionalLight;
  cam = { x: 0, z: 1, dist: 30, yaw: Math.PI / 4, tx: 0, tz: 1, tdist: 30, tyaw: Math.PI / 4 };
  ghost: Ghost | null = null; private ghostObj: THREE.Group | null = null; private ghostFoot: THREE.Mesh | null = null;
  selRing: THREE.Mesh; selected: string | null = null; t = 0; quality: 'high' | 'low';
  private ray = new THREE.Raycaster(); private ptr = new THREE.Vector2(); private fx: { pts: THREE.Points; v: Float32Array; life: number }[] = [];
  onTap: (hit: { item?: string; plot?: string; tile?: [number, number] }) => void = () => {};
  onGhostMove: () => void = () => {};
  constructor(private canvas: HTMLCanvasElement, quality: 'auto' | 'high' | 'low') {
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator as any).maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 820;
    this.quality = quality === 'auto' ? (mobile ? 'low' : 'high') : quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality === 'high', powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 2 : 1.5)); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05; this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(30, 1, 1, 16000);
    const sunDir = new THREE.Vector3(-0.55, 0.62, 0.42).normalize();
    this.sun = new THREE.DirectionalLight('#fff3df', 2.7); this.sun.position.copy(sunDir).multiplyScalar(40); this.sun.castShadow = true; const sz = this.quality === 'high' ? 2048 : 1024;
    this.sun.shadow.mapSize.set(sz, sz); const sc = this.sun.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 110; this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target); this.scene.add(new THREE.HemisphereLight('#bcd8ff', '#3a2a22', 0.85)); this.scene.add(new THREE.AmbientLight('#405070', 0.35));
    const rim = new THREE.DirectionalLight('#7ab6ff', 0.6); rim.position.set(30, 10, -30); this.scene.add(rim);
    this.backdrop = new Backdrop(this.renderer, sunDir, this.quality); this.scene.add(this.backdrop.group); this.scene.add(this.island.group);
    this.selRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: '#6ee7ff', transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide })); this.selRing.rotation.x = -Math.PI / 2; this.selRing.visible = false; this.scene.add(this.selRing);
    this.resize(); window.addEventListener('resize', () => this.resize()); this.input();
  }
  resize() { const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  // ---------------- camera ----------------
  private placeCamera() { const c = this.cam; const k = 0.18; c.x += (c.tx - c.x) * k; c.z += (c.tz - c.z) * k; c.dist += (c.tdist - c.dist) * k; c.yaw += (c.tyaw - c.yaw) * k;
    const pitch = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(56, 34, clamp((c.dist - 14) / 52))); const narrow = this.camera.aspect < 0.8 ? 1.35 : 1;
    const d = c.dist * narrow; this.camera.position.set(c.x + Math.sin(c.yaw) * Math.cos(pitch) * d, Math.sin(pitch) * d, c.z + Math.cos(c.yaw) * Math.cos(pitch) * d); this.camera.lookAt(c.x, 0, c.z);
    this.sun.target.position.set(c.x, 0, c.z); this.sun.position.set(c.x - 0.55 * 40, 0.62 * 40, c.z + 0.42 * 40); }
  focus(x: number, z: number, dist?: number) { this.cam.tx = x; this.cam.tz = z; if (dist) this.cam.tdist = dist; }
  private clampCam() { const c = this.cam, L = N / 2 + 2; c.tx = clamp(c.tx, -L, L); c.tz = clamp(c.tz, -L, L); c.tdist = clamp(c.tdist, 12, 66); }
  private groundAt(cx: number, cy: number): THREE.Vector3 | null { const r = this.canvas.getBoundingClientRect(); this.ptr.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ptr, this.camera); const p = new THREE.Vector3(); return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) ? p : null; }
  private input() {
    const el = this.canvas; const pts = new Map<number, { x: number; y: number; sx: number; sy: number }>(); let moved = false, start = 0, last: { d: number; a: number; cx: number; cy: number } | null = null; let ghostDrag = false;
    const two = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), a: Math.atan2(b.y - a.y, b.x - a.x), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; };
    el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }); moved = false; start = performance.now(); if (pts.size === 2) last = two();
      ghostDrag = false; if (this.ghost && pts.size === 1) { const g = this.groundAt(e.clientX, e.clientY); if (g) { const [w, d] = G.dims({ t: this.ghost.t, r: this.ghost.r }); const gx = this.ghost.x - N / 2, gz = this.ghost.z - N / 2; if (g.x >= gx - 0.5 && g.x <= gx + w + 0.5 && g.z >= gz - 0.5 && g.z <= gz + d + 0.5) ghostDrag = true; } } });
    el.addEventListener('pointermove', (e) => { const p = pts.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (Math.hypot(p.x - p.sx, p.y - p.sy) > 7) moved = true; if (!moved) return;
      if (pts.size === 1) { if (ghostDrag && this.ghost) { this.ghostTo(e.clientX, e.clientY); return; }
        if (e.buttons === 2) { this.cam.tyaw -= dx * 0.008; return; } const s = this.cam.dist * 0.0021 * (this.camera.aspect < 0.8 ? 1.35 : 1); const cy = Math.cos(this.cam.yaw), sy = Math.sin(this.cam.yaw);
        this.cam.tx -= (dx * cy + dy * sy * 1.25) * s; this.cam.tz -= (-dx * sy + dy * cy * 1.25) * s; this.clampCam(); }
      else if (pts.size === 2 && last) { const n = two(); this.cam.tdist *= last.d / Math.max(1, n.d); this.cam.tyaw -= n.a - last.a; last = n; this.clampCam(); } });
    const up = (e: PointerEvent) => { const p = pts.get(e.pointerId); pts.delete(e.pointerId); if (pts.size < 2) last = null; if (!p || moved || e.button === 2) return; if (performance.now() - start > 600) return; this.tap(e.clientX, e.clientY); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', (e) => pts.delete(e.pointerId)); el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('wheel', (e) => { e.preventDefault(); this.cam.tdist *= Math.pow(1.0015, e.deltaY); this.clampCam(); }, { passive: false });
    window.addEventListener('keydown', (e) => { if ((e.target as HTMLElement).tagName === 'INPUT') return; if (e.key === 'q' || e.key === 'Q') this.cam.tyaw += Math.PI / 4; if (e.key === 'e' || e.key === 'E') this.cam.tyaw -= Math.PI / 4; });
  }
  private tap(cx: number, cy: number) {
    if (this.ghost) { this.ghostTo(cx, cy); return; }
    const r = this.canvas.getBoundingClientRect(); this.ptr.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); this.ray.setFromCamera(this.ptr, this.camera);
    const picks = [...this.views.values()].map((v) => v.pick); const hit = this.ray.intersectObjects(picks, false)[0]; if (hit) { this.onTap({ item: hit.object.userData.item }); return; }
    const hp = this.ray.intersectObjects(this.island.holoMeshes(), false)[0]; if (hp) { this.onTap({ plot: hp.object.userData.plot }); return; }
    const g = this.groundAt(cx, cy); this.onTap(g ? { tile: [Math.floor(g.x + N / 2), Math.floor(g.z + N / 2)] } : {});
  }
  // ---------------- placement ghost ----------------
  startGhost(g: Ghost) { this.ghost = g; this.island.grid!.visible = true; this.rebuildGhost(); }
  endGhost() { this.ghost = null; if (this.ghostObj) this.scene.remove(this.ghostObj); this.ghostObj = null; this.island.grid!.visible = false; }
  private ghostTo(cx: number, cy: number) { const g = this.groundAt(cx, cy); if (!g || !this.ghost) return; const [w, d] = G.dims({ t: this.ghost.t, r: this.ghost.r });
    const x = Math.round(g.x + N / 2 - w / 2), z = Math.round(g.z + N / 2 - d / 2); if (x !== this.ghost.x || z !== this.ghost.z) { this.ghost.x = x; this.ghost.z = z; this.onGhostMove(); } }
  rotateGhost() { if (!this.ghost) return; this.ghost.r = (this.ghost.r + 1) % 4; this.rebuildGhost(); this.onGhostMove(); }
  rebuildGhost() { if (this.ghostObj) this.scene.remove(this.ghostObj); const g = this.ghost!; const [w, d] = G.dims({ t: g.t, r: g.r }); const root = new THREE.Group();
    const m = buildModel(g.t, 1, g.el, this.look); m.group.rotation.y = -g.r * Math.PI / 2; m.group.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh) { mm.castShadow = false; } }); root.add(m.group);
    this.ghostFoot = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MATS.ghostOk); this.ghostFoot.rotation.x = -Math.PI / 2; this.ghostFoot.position.y = 0.04; root.add(this.ghostFoot); this.ghostObj = root; this.scene.add(root); }
  setGhostOk(ok: boolean) { if (this.ghost) this.ghost.ok = ok; if (this.ghostFoot) this.ghostFoot.material = ok ? MATS.ghostOk : MATS.ghostBad; }
  // ---------------- sync with the save ----------------
  look: Look = { primary: '#e9eef5', accent: '#22c7e8', banner: { bg: '#1b6fd8', fg: '#ffd23a', emblem: 'star' } };
  sync(s: State) {
    this.look = { primary: s.paint.primary, accent: s.paint.accent, banner: s.banner }; const lookKey = JSON.stringify(this.look);
    const buyable = []; for (let px = 0; px < 5; px++) for (let pz = 0; pz < 5; pz++) { const k = `${px},${pz}`; if (G.plotState(s, k) === 'buyable') buyable.push(k); }
    this.island.build(s.isl.plots, buyable); const occ = new Set<string>(); for (const it of s.isl.items) { const [w, d] = G.dims(it); for (let i = it.x; i < it.x + w; i++) for (let j = it.z; j < it.z + d; j++) occ.add(i + ',' + j); } this.island.scatter(s.isl.plots, occ);
    const seen = new Set<string>();
    for (const it of s.isl.items) { seen.add(it.id); const job = G.jobOf(s, it.id, 'build'); const key = `${it.t}|${it.lvl}|${it.el}|${it.r}|${lookKey}|${job ? 1 : 0}`; let v = this.views.get(it.id);
      if (!v || v.key !== key) { if (v) this.scene.remove(v.root); v = this.makeView(it, key, !!job); this.views.set(it.id, v); }
      if (this.ghost && this.ghost.move === it.id) v.root.visible = false; else v.root.visible = true; }
    for (const [id, v] of this.views) if (!seen.has(id)) { this.scene.remove(v.root); this.views.delete(id); }
    // bots live on their bay's docking pads and wander inside its footprint
    const bseen = new Set<string>();
    for (const b of s.bots) { if (!b.bay) continue; const bay = G.item(s, b.bay); if (!bay) continue; bseen.add(b.id); const key = `${b.sp}|${Math.floor(b.lvl / 5)}`; let bv = this.bots.get(b.id);
      if (!bv || bv.key !== key || bv.bay !== b.bay) { if (bv) this.scene.remove(bv.model.group); const m = buildBot(b.sp, b.lvl); const c = this.centerOf(bay); const p = new THREE.Vector3(c.x + (Math.random() - 0.5) * 1.6, 0.26, c.z + (Math.random() - 0.5) * 1.6);
        m.group.position.copy(p); this.scene.add(m.group); bv = { key, model: m, pos: p, target: p.clone(), wait: Math.random() * 2, bay: b.bay }; this.bots.set(b.id, bv); } }
    for (const [id, bv] of this.bots) if (!bseen.has(id)) { this.scene.remove(bv.model.group); this.bots.delete(id); }
  }
  centerOf(it: Item) { const [w, d] = G.dims(it); return new THREE.Vector3(it.x + w / 2 - N / 2, 0, it.z + d / 2 - N / 2); }
  topOf(id: string) { const v = this.views.get(id); if (!v) return null; const p = v.root.position.clone(); p.y = v.model.height + 0.3; return p; }
  private makeView(it: Item, key: string, building: boolean): View {
    const root = new THREE.Group(); const m = buildModel(it.t, it.lvl, it.el, this.look); m.group.rotation.y = -it.r * Math.PI / 2; root.add(m.group); const [w, d] = G.dims(it);
    root.position.copy(this.centerOf(it)); const pick = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, Math.max(0.6, m.height), d * 0.95), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = Math.max(0.6, m.height) / 2; pick.userData.item = it.id; root.add(pick);
    let scaf; if (building) { scaf = scaffold(w, d, Math.max(0.8, m.height * 0.8)); root.add(scaf); if (it.lvl === 0) { m.group.scale.y = 0.25; } }
    this.scene.add(root); return { key, root, model: m, pick, scaf };
  }
  select(id: string | null, s?: State) { this.selected = id; this.selRing.visible = !!id; if (id && s) { const it = G.item(s, id); if (!it) return; const [w, d] = G.dims(it); const c = this.centerOf(it); this.selRing.position.set(c.x, 0.05, c.z); this.selRing.scale.setScalar(Math.max(w, d) * 0.72); } }
  // ---------------- effects ----------------
  burst(at: THREE.Vector3, color: string, n = 26) { const pos = new Float32Array(n * 3), v = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos.set([at.x, at.y, at.z], i * 3); const a = Math.random() * Math.PI * 2, u = Math.random(); v.set([Math.cos(a) * u * 2.2, 2 + Math.random() * 3, Math.sin(a) * u * 2.2], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.22, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); this.scene.add(p); this.fx.push({ pts: p, v, life: 1 }); }
  project(p: { x: number; y: number; z: number }) { const v = new THREE.Vector3(p.x, p.y, p.z).project(this.camera); const r = this.canvas.getBoundingClientRect(); return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height, vis: v.z < 1 && v.z > -1 }; }
  // ---------------- frame ----------------
  frame(dt: number, s: State) {
    this.t += dt; const t = this.t; this.placeCamera(); this.backdrop.update(t, this.camera); this.island.update(t);
    for (const [id, v] of this.views) { const crafting = !!G.jobOf(s, id, 'craft'); v.model.anim?.(t, { working: crafting, ready: s.ready[id] ? 1 : 0 }); if (v.scaf) { const cr = v.scaf.getObjectByName('crane'); if (cr) cr.rotation.y = t * 0.8; } }
    for (const [, bv] of this.bots) { const bay = G.item(s, bv.bay); if (!bay) continue; const c = this.centerOf(bay); const to = bv.target.clone().sub(bv.pos); to.y = 0; const dist = to.length(); let moving = false;
      if (dist > 0.05) { moving = true; to.normalize(); bv.pos.addScaledVector(to, Math.min(dist, dt * 0.7)); const ang = Math.atan2(to.x, to.z); const g = bv.model.group; let dr = ang - g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); g.rotation.y += dr * Math.min(1, dt * 6); }
      else { bv.wait -= dt; if (bv.wait <= 0) { const a = Math.random() * Math.PI * 2, rr = 0.35 + Math.random() * 0.75; bv.target.set(c.x + Math.cos(a) * rr, 0.26, c.z + Math.sin(a) * rr); bv.wait = 1.5 + Math.random() * 4; } }
      bv.model.group.position.copy(bv.pos); bv.model.anim(t, moving); }
    if (this.selRing.visible) (this.selRing.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(t * 4) * 0.3;
    if (this.ghost && this.ghostObj) { const [w, d] = G.dims({ t: this.ghost.t, r: this.ghost.r }); this.ghostObj.position.set(this.ghost.x + w / 2 - N / 2, 0.02 + Math.sin(t * 5) * 0.03, this.ghost.z + d / 2 - N / 2); }
    for (const f of [...this.fx]) { f.life -= dt * 1.1; const p = f.pts.geometry.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { f.v[i * 3 + 1] -= dt * 6; p.setXYZ(i, p.getX(i) + f.v[i * 3] * dt, p.getY(i) + f.v[i * 3 + 1] * dt, p.getZ(i) + f.v[i * 3 + 2] * dt); }
      p.needsUpdate = true; (f.pts.material as THREE.PointsMaterial).opacity = Math.max(0, f.life); if (f.life <= 0) { this.scene.remove(f.pts); f.pts.geometry.dispose(); this.fx.splice(this.fx.indexOf(f), 1); } }
    this.renderer.render(this.scene, this.camera);
  }
}
