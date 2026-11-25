// The War Games arena in 3D: the Defence Council's holographic copy of a commander's base (dark floor, cyan grid, the
// buildable square outlined in red: robots land outside it), the real building models, robots with their escort drones
// (positions interpolated between engine ticks), turret heads tracking targets, tracers, laser beams, missile arcs,
// EMP rings, shield domes that flare as they soak damage, rubble and health bars. It only draws: the battle engine
// decides everything, which is why a replay looks exactly like the fight.
import * as THREE from 'three';
import { Battle, BBld, BUnit, step, newBattle, BattleInput } from '../core/battle';
import { buildModel, droneModel, Look, Model } from './models';
import { buildBot, BotModel } from './botmodels';
import { BATTLE_GRID as GRID } from '../data/buildings';
import { TICK } from '../data/war';
import { ELEMENTS } from '../data/elements';
import { SPECIES } from '../data/species';
import { clamp } from '../core/util';
const C = GRID / 2;
interface BV { m: Model; root: THREE.Group; bar: THREE.Group; fill: THREE.Mesh; dome?: THREE.Mesh; rubble?: THREE.Object3D; h: number; }
interface UV { o: THREE.Object3D; bot?: BotModel; px: number; pz: number; bar?: THREE.Group; fill?: THREE.Mesh; hover: number; }
interface FX { o: THREE.Object3D; t: number; life: number; up?: (k: number, o: THREE.Object3D) => void; }
const barGeo = new THREE.PlaneGeometry(1, 0.12), barBg = new THREE.MeshBasicMaterial({ color: '#0b1424', transparent: true, opacity: 0.75, depthTest: false }), sparkGeo = new THREE.SphereGeometry(0.12, 6, 4), ringGeo = new THREE.RingGeometry(0.9, 1, 40);
export class BattleView {
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(40, 1, 0.1, 600); B: Battle | null = null; speed = 1; paused = false; live = false;
  cam = { x: 0, z: 0, tx: 0, tz: 0, dist: 50, tdist: 50, yaw: Math.PI / 4, tyaw: Math.PI / 4 };
  private bv: BV[] = []; private uv = new Map<number, UV>(); private fx: FX[] = []; private acc = 0; private t = 0; private zone: THREE.Group = new THREE.Group(); private droneProto = droneModel();
  onTick: () => void = () => {}; onOver: () => void = () => {};
  constructor(private renderer: THREE.WebGLRenderer, private quality: 'high' | 'low') {
    this.scene.background = new THREE.Color('#050b18'); this.scene.fog = new THREE.Fog('#050b18', 70, 170);
    this.scene.add(new THREE.HemisphereLight('#bcd8ff', '#1a2440', 1.1)); const sun = new THREE.DirectionalLight('#ffffff', 1.8); sun.position.set(-30, 50, 25); this.scene.add(sun);
    // the holo-floor: a dark plate, a cyan grid and a faint glow at the edge
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(GRID + 30, GRID + 30), new THREE.MeshStandardMaterial({ color: '#0a1830', roughness: 0.6, metalness: 0.3 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.02; this.scene.add(floor);
    const pts: number[] = []; for (let i = 0; i <= GRID; i += 2) { pts.push(i - C, 0, -C, i - C, 0, C, -C, 0, i - C, C, 0, i - C); } const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); this.scene.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: '#2f7fd0', transparent: true, opacity: 0.35 })));
    const edge = new THREE.Mesh(new THREE.RingGeometry(GRID * 0.705, GRID * 0.72, 4, 1, Math.PI / 4), new THREE.MeshBasicMaterial({ color: '#6ee7ff', transparent: true, opacity: 0.5, side: THREE.DoubleSide })); edge.rotation.x = -Math.PI / 2; edge.position.y = 0.01; this.scene.add(edge, this.zone);
  }
  resize(w: number, h: number) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  // load a battle (live or replay) and build its scene
  load(input: BattleInput, look: Look, live: boolean) { this.clear(); const B = newBattle(input, live); this.B = B; this.live = live; this.acc = 0; this.speed = 1; this.paused = false;
    const L = input.layout; const side = L.hi - L.lo, mid = (L.lo + L.hi) / 2 - C; this.cam.x = this.cam.tx = mid + 2.5; this.cam.z = this.cam.tz = mid + 2.5; this.cam.dist = this.cam.tdist = 15 + side * 0.78; // nudged toward the near corner: the deploy cards cover the bottom of the screen
    // the no-landing square: robots must be deployed outside it
    const red = new THREE.Mesh(new THREE.PlaneGeometry(side + 1, side + 1), new THREE.MeshBasicMaterial({ color: '#ff4d6d', transparent: true, opacity: 0.07, depthWrite: false })); red.rotation.x = -Math.PI / 2; red.position.set(mid, 0.01, mid); this.zone.add(red);
    const rim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(side + 1, side + 1)), new THREE.LineBasicMaterial({ color: '#ff6b7a', transparent: true, opacity: 0.8 })); rim.rotation.x = -Math.PI / 2; rim.position.set(mid, 0.03, mid); this.zone.add(rim);
    for (const b of B.blds) { const m = buildModel(b.b, b.lvl, look); const it = input.layout.items.find((i) => i.id === b.id)!; m.group.rotation.y = (-it.r * Math.PI) / 2; const root = new THREE.Group(); root.add(m.group); root.position.set(b.cx - C, 0, b.cz - C); this.scene.add(root);
      const bar = new THREE.Group(); bar.add(new THREE.Mesh(barGeo, barBg)); const fill = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: '#7cf29a', depthTest: false })); fill.position.z = 0.001; bar.add(fill); bar.scale.set(Math.min(2.2, b.w * 0.8), 1, 1); bar.position.set(b.cx - C, m.height + 0.5, b.cz - C); bar.visible = false; bar.renderOrder = 10; fill.renderOrder = 11; this.scene.add(bar);
      const v: BV = { m, root, bar, fill, h: m.height }; if (b.def && b.def.shield) { const dome = new THREE.Mesh(new THREE.SphereGeometry(b.def.shieldR!, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#7fe4ff', transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); dome.position.set(b.cx - C, 0, b.cz - C); this.scene.add(dome); v.dome = dome; }
      this.bv.push(v); }
  }
  clear() { for (const v of this.bv) { this.scene.remove(v.root, v.bar); if (v.dome) this.scene.remove(v.dome); if (v.rubble) this.scene.remove(v.rubble); } for (const u of this.uv.values()) { this.scene.remove(u.o); if (u.bar) this.scene.remove(u.bar); } for (const f of this.fx) this.scene.remove(f.o); this.bv = []; this.uv.clear(); this.fx = []; this.zone.clear(); this.B = null; }
  // ---------------- input helpers ----------------
  groundAt(x: number, y: number, w: number, h: number) { const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1), this.camera); const p = new THREE.Vector3(); return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) ? { x: p.x + C, z: p.z + C } : null; }
  drag(dx: number, dy: number) { const s = this.cam.dist * 0.0022, cy = Math.cos(this.cam.yaw), sy = Math.sin(this.cam.yaw); this.cam.tx = clamp(this.cam.tx - (dx * cy + dy * sy * 1.3) * s, -C - 6, C + 6); this.cam.tz = clamp(this.cam.tz - (-dx * sy + dy * cy * 1.3) * s, -C - 6, C + 6); }
  zoom(k: number) { this.cam.tdist = clamp(this.cam.tdist * k, 14, 95); }
  project(x: number, y: number, z: number, w: number, h: number) { const v = new THREE.Vector3(x - C, y, z - C).project(this.camera); return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h }; }
  flash(x: number, z: number, ok: boolean) { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: ok ? '#7cf29a' : '#ff4d6d', transparent: true, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x - C, 0.05, z - C); this.addFx(m, 0.5, (k, o) => { o.scale.setScalar(0.3 + k * 1.2); ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1 - k; }); }
  // ---------------- the loop ----------------
  frame(dt: number) {
    this.t += dt; const B = this.B; if (B && !this.paused && !B.over) { this.acc += dt * this.speed; let n = 0; while (this.acc >= TICK && !B.over && n < 8) { for (const u of B.units) { const v = this.uv.get(u.id); if (v) { v.px = u.x; v.pz = u.z; } } step(B); this.events(B); this.acc -= TICK; n++; } if (B.over) this.onOver(); this.onTick(); }
    const a = B ? clamp(this.acc / TICK) : 0; if (B) this.sync(B, a);
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.t += dt; const k = f.t / f.life; if (k >= 1) { this.scene.remove(f.o); this.fx.splice(i, 1); continue; } f.up?.(k, f.o); }
    const c = this.cam, kk = 0.14; c.x += (c.tx - c.x) * kk; c.z += (c.tz - c.z) * kk; c.dist += (c.tdist - c.dist) * kk; c.yaw += (c.tyaw - c.yaw) * kk; const pitch = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(56, 32, clamp((c.dist - 14) / 81))); const nar = this.camera.aspect < 0.8 ? Math.min(2.2, 0.85 / this.camera.aspect) : 1, d = c.dist * nar; // portrait screens see less sideways: pull back
    this.camera.position.set(c.x + Math.sin(c.yaw) * Math.cos(pitch) * d, Math.sin(pitch) * d, c.z + Math.cos(c.yaw) * Math.cos(pitch) * d); this.camera.lookAt(c.x, 0, c.z);
  }
  private sync(B: Battle, a: number) {
    for (const b of B.blds) { const v = this.bv[b.i]; if (!v) continue; if (b.alive) { v.m.anim?.(this.t, { working: true }); if (v.m.head && b.def && b.def.range) v.m.head.rotation.y = Math.atan2(b.ax, b.az);
        const dmg = b.hp < b.max; v.bar.visible = dmg && !b.wall; if (dmg) { const k = b.hp / b.max; v.fill.scale.x = k; v.fill.position.x = -(1 - k) / 2; ((v.fill.material as THREE.MeshBasicMaterial).color as THREE.Color).set(k > 0.5 ? '#7cf29a' : k > 0.25 ? '#ffd36a' : '#ff6b7a'); v.bar.quaternion.copy(this.camera.quaternion); }
        if (v.dome) { const k = b.poolMax ? b.pool / b.poolMax : 0; (v.dome.material as THREE.MeshBasicMaterial).opacity = k > 0 ? 0.06 + k * 0.08 + (B.tick - b.lastHit < 3 ? 0.18 : 0) : 0; } } }
    for (const u of B.units) { let v = this.uv.get(u.id); if (!u.alive) { if (v) { this.scene.remove(v.o); if (v.bar) this.scene.remove(v.bar); this.uv.delete(u.id); this.burst(v.o.position.x + C, v.o.position.y, v.o.position.z + C, u.drone ? '#9ff3ff' : '#ffb347', u.drone ? 6 : 14); } continue; }
      if (!v) v = this.makeUnit(u); const x = v.px + (u.x - v.px) * a, z = v.pz + (u.z - v.pz) * a; v.o.position.set(x - C, v.hover + (u.air ? Math.sin(this.t * 3 + u.id) * 0.12 : 0), z - C); v.o.rotation.y = Math.atan2(u.fx, u.fz); if (u.stun > 0) v.o.rotation.z = Math.sin(this.t * 40) * 0.08; else v.o.rotation.z = 0;
      if (v.bot) v.bot.anim(this.t, !u.atk); if (v.bar && v.fill) { const k = u.hp / u.max; v.bar.visible = k < 0.999; v.fill.scale.x = Math.max(0.001, k); v.fill.position.x = -(1 - k) / 2; v.bar.position.set(x - C, v.hover + 1.7, z - C); v.bar.quaternion.copy(this.camera.quaternion); } }
  }
  private makeUnit(u: BUnit): UV { let o: THREE.Object3D, bot: BotModel | undefined; if (u.drone) { o = this.droneProto.clone(); o.scale.setScalar(1.8); } else { bot = buildBot(u.sp, 1); o = bot.group; o.scale.setScalar(0.95); } this.scene.add(o);
    const v: UV = { o, bot, px: u.x, pz: u.z, hover: u.drone ? 0.9 : u.air ? 1.6 : 0.05 }; if (!u.drone) { const bar = new THREE.Group(); bar.add(new THREE.Mesh(barGeo, barBg)); const fill = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: '#6ee7ff', depthTest: false })); fill.position.z = 0.001; bar.add(fill); bar.scale.set(0.8, 1, 1); bar.renderOrder = 10; fill.renderOrder = 11; this.scene.add(bar); v.bar = bar; v.fill = fill; }
    this.uv.set(u.id, v); return v; }
  // ---------------- effects ----------------
  private addFx(o: THREE.Object3D, life: number, up?: FX['up']) { this.scene.add(o); this.fx.push({ o, t: 0, life, up }); }
  private line(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, col: string, life: number, width = 1) { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0 - C, y0, z0 - C), new THREE.Vector3(x1 - C, y1, z1 - C)]); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: col, transparent: true, linewidth: width, toneMapped: false })); this.addFx(l, life, (k, o) => { ((o as THREE.Line).material as THREE.LineBasicMaterial).opacity = 1 - k; }); }
  private beam(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, col: string, r: number, life: number) { const a = new THREE.Vector3(x0 - C, y0, z0 - C), b = new THREE.Vector3(x1 - C, y1, z1 - C); const len = a.distanceTo(b); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, toneMapped: false, depthWrite: false }));
    m.position.copy(a).lerp(b, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); this.addFx(m, life, (k, o) => { ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1 - k; o.scale.x = o.scale.z = 1 - k * 0.6; }); }
  burst(x: number, y: number, z: number, col: string, n: number) { const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, toneMapped: false }); for (let i = 0; i < n; i++) { const m = new THREE.Mesh(sparkGeo, mat); const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.3, Math.random() - 0.5).multiplyScalar(4); m.position.set(x - C, y + 0.4, z - C); const p0 = m.position.clone();
      this.addFx(m, 0.6 + Math.random() * 0.3, (k, o) => { o.position.set(p0.x + v.x * k, p0.y + v.y * k - 4 * k * k, p0.z + v.z * k); o.scale.setScalar(1 - k); mat.opacity = 1 - k; }); } }
  private ring(x: number, z: number, r: number, col: string, life: number) { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.position.set(x - C, 0.15, z - C); this.addFx(m, life, (k, o) => { o.scale.setScalar(0.2 + k * r); ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1 - k; }); }
  private events(B: Battle) { const hiQ = this.quality === 'high';
    for (const e of B.ev) {
      if (e.k === 'shot') { const b = B.blds[e.b], v = this.bv[e.b]; const y0 = v ? v.h * 0.75 : 1; const u = B.units.find((x) => x.id === e.u); const ty = u && u.air ? 1.6 : 0.5;
        if (b.b === 'laser') this.beam(b.cx, y0, b.cz, e.x, ty, e.z, '#9ff3ff', 0.07, 0.18);
        else if (b.b === 'missile') { const p0 = new THREE.Vector3(b.cx - C, y0, b.cz - C), p1 = new THREE.Vector3(e.x - C, ty, e.z - C); const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: '#ffb347', toneMapped: false })); m.scale.setScalar(1.4); const sx = e.x, sz = e.z, sp = e.splash || 2;
          this.addFx(m, 0.55, (k, o) => { o.position.copy(p0).lerp(p1, k); o.position.y += Math.sin(k * Math.PI) * 4; if (k > 0.94 && !o.userData.boom) { o.userData.boom = 1; this.ring(sx, sz, sp, '#ffb347', 0.45); this.burst(sx, 0.2, sz, '#ff8a3c', hiQ ? 10 : 5); } }); }
        else this.line(b.cx, y0, b.cz, e.x, ty, e.z, '#ffe27a', 0.08); }
      else if (e.k === 'pulse') { const b = B.blds[e.b]; this.ring(b.cx, b.cz, b.def!.pulseR!, '#c9b6ff', 0.5); }
      else if (e.k === 'hit') { const u = B.units.find((x) => x.id === e.u); if (!u) continue; const col = u.drone ? '#6ee7ff' : ELEMENTS[SPECIES[u.sp].el[0]]?.color || '#ffffff'; const y0 = u.air ? 1.6 : u.drone ? 0.9 : 0.6;
        if (u.range > 1) this.line(u.x, y0, u.z, e.x, 0.5, e.z, col, 0.12); if (hiQ || Math.random() < 0.4) this.burst(e.x, 0.3, e.z, col, 2); }
      else if (e.k === 'down') { const b = B.blds[e.b], v = this.bv[e.b]; if (!v) continue; v.root.visible = false; v.bar.visible = false; if (v.dome) v.dome.visible = false;
        const rub = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.9, 0.25, b.d * 0.9), new THREE.MeshStandardMaterial({ color: '#2b3340', roughness: 1, flatShading: true })); rub.position.set(b.cx - C, 0.12, b.cz - C); this.scene.add(rub); v.rubble = rub;
        this.burst(b.cx, 0.6, b.cz, b.wall ? '#9aa3ad' : '#ffd36a', b.wall ? 6 : hiQ ? 26 : 14); if (!b.wall) this.ring(b.cx, b.cz, Math.max(b.w, b.d) * 1.2, '#ffd36a', 0.6); }
      else if (e.k === 'deploy') { this.ring(e.x, e.z, 2.5, '#6ee7ff', 0.6); this.beam(e.x, 0, e.z, e.x, 12, e.z, '#6ee7ff', 0.25, 0.5); }
    } }
}
export type { BBld };
