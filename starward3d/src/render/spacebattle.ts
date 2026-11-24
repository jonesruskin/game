// Space battles in 3D: the round-by-round simulator's result played back. Two fleets face each other over the world
// they are fighting for; every round its shots fly (laser beams, missile arcs, rail slugs), and ships break apart in
// proportion to the kills the simulator recorded. Human warships are steel with cyan drives; orbital defence
// platforms are rings; the Kr'thul Swarm is chitin and fire.
import * as THREE from 'three';
import { starfield, nebula } from './planet';
import { Kit } from './kit';
import { WARSHIPS, SWARM, DEFENCE } from '../data/fleet';
import { clamp } from '../core/util';
const CAP = 14; // models shown per stack at most
const SIZE: Record<string, number> = { S: 0.7, M: 1.1, L: 1.8, XL: 3 };
function shipModel(k: string): THREE.Group {
  const kit = new Kit(); const hull = '#c9d0da', dark = '#3b4350', glow = '#6ee7ff', chit = '#6b3a2a', fire = '#ff6b3a';
  switch (k) {
    case 'corvette': kit.box(0.5, 0.18, 1.4, hull); kit.box(0.9, 0.05, 0.5, dark, 0, 0.05, -0.2); kit.box(0.2, 0.12, 0.1, glow, 0, 0.03, -0.75, { glow: true }); break;
    case 'frigate': kit.box(0.4, 0.3, 2.6, hull); kit.cyl(0.08, 0.08, 1.2, 6, dark, 0, 0.15, 1.6, { rx: Math.PI / 2 }); kit.box(1.0, 0.06, 0.6, dark, 0, 0.1, -0.6); kit.box(0.3, 0.2, 0.1, glow, 0, 0.05, -1.35, { glow: true }); break;
    case 'destroyer': kit.box(0.8, 0.45, 2.8, hull); for (const x of [-0.55, 0.55]) kit.box(0.35, 0.3, 1.6, dark, x, 0.05, 0.2); kit.box(0.5, 0.3, 0.1, glow, 0, 0.08, -1.45, { glow: true }); break;
    case 'cruiser': kit.box(1.1, 0.6, 4.2, hull); kit.box(0.7, 0.5, 1.4, '#9aa3ad', 0, 0.6, -0.4); for (const z of [1.2, 0.4]) kit.cyl(0.18, 0.18, 0.5, 8, dark, 0, 0.6, z); kit.box(0.8, 0.4, 0.1, glow, 0, 0.1, -2.15, { glow: true }); break;
    case 'battleship': kit.box(1.6, 0.9, 6, hull); kit.box(1.0, 0.8, 2.2, '#9aa3ad', 0, 0.9, -0.8); kit.cyl(0.25, 0.25, 4.5, 8, dark, 0, 0.45, 1.2, { rx: Math.PI / 2 }); kit.box(1.2, 0.6, 0.1, glow, 0, 0.15, -3.05, { glow: true }); break;
    case 'carrier': kit.box(3.2, 0.6, 6.5, hull); kit.box(2.6, 0.08, 5.6, dark, 0, 0.6, 0); kit.box(0.6, 0.9, 1.4, '#9aa3ad', 1.2, 0.6, -1.2); kit.box(2.2, 0.4, 0.1, glow, 0, 0.1, -3.3, { glow: true }); break;
    case 'battery': case 'silo': kit.add(new THREE.TorusGeometry(1.4, 0.22, 8, 24), '#9aa3ad', 0, 0, 0, { rx: Math.PI / 2 }); kit.cyl(0.4, 0.4, 0.5, 10, hull); kit.box(0.3, 0.3, 0.8, k === 'battery' ? glow : '#ffb347', 0, 0.4, 0.3, { glow: true }); break;
    case 'drone': kit.add(new THREE.ConeGeometry(0.25, 1.0, 5), chit, 0, 0, 0, { rx: Math.PI / 2 }); kit.box(0.9, 0.04, 0.3, '#3a1a14', 0, 0, 0.1); kit.sphere(0.08, fire, 0, 0, -0.45, { glow: true }); break;
    case 'warrior': kit.sphere(0.6, chit, 0, 0, 0, { w: 8, h: 6 }); kit.add(new THREE.ConeGeometry(0.3, 1.4, 6), '#4a2418', 0, 0, 0.9, { rx: Math.PI / 2 }); for (const x of [-0.7, 0.7]) kit.box(0.9, 0.06, 0.5, '#3a1a14', x, 0, 0); kit.sphere(0.15, fire, 0, 0.2, 0.4, { glow: true }); break;
    case 'brood': kit.sphere(1.5, chit, 0, 0, 0, { w: 12, h: 8 }); kit.sphere(1.0, '#8a4a30', 0, 0.6, -0.6, { w: 10, h: 6 }); for (let i = 0; i < 5; i++) kit.sphere(0.25, fire, Math.cos(i) * 1.2, Math.sin(i * 2) * 0.6, Math.sin(i) * 1.2, { glow: true }); break;
    case 'queen': kit.sphere(4, '#5a2a1e', 0, 0, 0, { w: 18, h: 12 }); for (let i = 0; i < 9; i++) kit.add(new THREE.ConeGeometry(0.6, 4, 6), '#3a1a14', Math.cos(i * 0.7) * 3.5, Math.sin(i * 1.3) * 2.5, Math.sin(i * 0.7) * 3.5, { rx: i, rz: i * 0.5 }); kit.sphere(1.2, fire, 0, 1.5, 3.2, { glow: true }); break;
    default: kit.box(0.6, 0.3, 1.2, hull);
  }
  return kit.build(k);
}
interface Stack { k: string; side: 'A' | 'B'; n0: number; n: number; models: THREE.Group[]; center: THREE.Vector3; }
interface FX { o: THREE.Object3D; t: number; life: number; up?: (k: number, o: THREE.Object3D) => void; }
export class SpaceBattleView {
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(45, 1, 0.1, 4000); res: any = null; round = -1; private rt = 0; done = false; speed = 1;
  cam = { yaw: 0.45, pitch: 0.22, dist: 60, tdist: 60 }; private stacks: Stack[] = []; private fx: FX[] = []; private world: THREE.Mesh; private group = new THREE.Group(); private t = 0;
  onRound: () => void = () => {}; onDone: () => void = () => {};
  constructor(renderer: THREE.WebGLRenderer, big: boolean) {
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), new THREE.MeshBasicMaterial({ map: nebula(renderer, big), side: THREE.BackSide, depthWrite: false })), starfield(1500, big ? 2200 : 1100, 1.6));
    this.scene.add(new THREE.AmbientLight('#4a5a7a', 0.9)); const sun = new THREE.DirectionalLight('#fff4e0', 2.4); sun.position.set(-60, 40, 30); this.scene.add(sun);
    this.world = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 32), new THREE.MeshStandardMaterial({ color: '#5a7aa0', roughness: 0.9 })); this.world.position.set(0, -95, -70); this.scene.add(this.world, this.group);
  }
  resize(w: number, h: number) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  // res: the simulator's result (start compositions, rounds). A = attacker (left), B = defender (right)
  load(res: any, worldCol = '#5a7aa0') { this.clear(); this.res = res; this.round = -1; this.rt = 0.6; this.done = false; this.speed = 1; (this.world.material as THREE.MeshStandardMaterial).color.set(worldCol);
    const place = (comp: Record<string, number>, side: 'A' | 'B') => { const ks = Object.keys(comp).filter((k) => comp[k] > 0); ks.forEach((k, i) => { const n0 = comp[k]; const m = Math.min(CAP, Math.max(1, Math.ceil(Math.sqrt(n0) * 2.2))); const sz = SIZE[(WARSHIPS[k] || SWARM[k] || DEFENCE[k]).size] || 1;
      const center = new THREE.Vector3(side === 'A' ? -20 - i * 3 : 20 + i * 3, (i - (ks.length - 1) / 2) * 6, (i % 2 ? 5 : -5)); const models: THREE.Group[] = [];
      for (let j = 0; j < m; j++) { const g = shipModel(k); g.scale.setScalar(1.6); const row = Math.floor(j / 4), col = j % 4; g.position.set(center.x + (side === 'A' ? -row : row) * sz * 2.8, center.y + (col - 1.5) * sz * 1.6, center.z + (col % 2 ? 1 : -1) * sz * 1.4 + row * 0.6); g.rotation.y = side === 'A' ? Math.PI / 2 : -Math.PI / 2; g.userData.ph = Math.random() * 6; this.group.add(g); models.push(g); }
      this.stacks.push({ k, side, n0, n: n0, models, center }); }); };
    place(res.startA, 'A'); place(res.startB, 'B'); }
  clear() { this.group.clear(); for (const f of this.fx) this.scene.remove(f.o); this.fx = []; this.stacks = []; this.res = null; }
  drag(dx: number, dy: number) { this.cam.yaw -= dx * 0.005; this.cam.pitch = clamp(this.cam.pitch + dy * 0.004, -1.2, 1.3); }
  zoom(k: number) { this.cam.tdist = clamp(this.cam.tdist * k, 25, 180); }
  counts() { const by = (side: string) => this.stacks.filter((s) => s.side === side).map((s) => [s.k, s.n] as [string, number]); return { A: by('A'), B: by('B') }; }
  private addFx(o: THREE.Object3D, life: number, up?: FX['up']) { this.scene.add(o); this.fx.push({ o, t: 0, life, up }); }
  private boom(p: THREE.Vector3, col: string, r: number) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: col, transparent: true, toneMapped: false, depthWrite: false })); m.position.copy(p); this.addFx(m, 0.7, (k, o) => { o.scale.setScalar(r * (0.3 + k * 1.4)); ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1 - k; }); }
  private shot(a: THREE.Vector3, b: THREE.Vector3, wpn: string, side: string, delay: number) { const col = side === 'A' && this.swarmSide() === 'A' ? '#ff6b3a' : side === 'B' && this.swarmSide() === 'B' ? '#ff6b3a' : wpn === 'laser' ? '#6ee7ff' : wpn === 'missile' ? '#ffb347' : '#ffffff';
    if (wpn === 'laser') { const g = new THREE.BufferGeometry().setFromPoints([a, b]); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0, toneMapped: false })); this.addFx(l, 0.5 + delay, (k, o) => { const kk = (k * (0.5 + delay) - delay) / 0.5; ((o as THREE.Line).material as THREE.LineBasicMaterial).opacity = kk > 0 && kk < 1 ? 1 - kk : 0; }); }
    else { const m = new THREE.Mesh(new THREE.SphereGeometry(wpn === 'missile' ? 0.35 : 0.2, 6, 4), new THREE.MeshBasicMaterial({ color: col, toneMapped: false })); m.visible = false; const life = (wpn === 'missile' ? 1.1 : 0.45) + delay;
      this.addFx(m, life, (k, o) => { const kk = (k * life - delay) / (life - delay); o.visible = kk > 0 && kk < 1; if (!o.visible) return; o.position.copy(a).lerp(b, kk); if (wpn === 'missile') o.position.y += Math.sin(kk * Math.PI) * 5; if (kk > 0.95 && !o.userData.hit) { o.userData.hit = 1; this.boom(b, col, wpn === 'missile' ? 1.4 : 0.6); } }); } }
  private swarmSide(): 'A' | 'B' | null { const s = this.stacks.find((x) => SWARM[x.k]); return s ? s.side : null; }
  private play(r: any) {
    // sample shots: up to ~36 visible per round, spread over the first second
    const shots: any[] = r.shots; const step = Math.max(1, Math.floor(shots.length / 36));
    for (let i = 0; i < shots.length; i += step) { const sh = shots[i]; const from = this.stacks.find((s) => s.side === sh.side && s.k === sh.a && s.models.length), to = this.stacks.find((s) => s.side !== sh.side && s.k === sh.b && s.models.length); if (!from || !to) continue;
      const a = from.models[Math.floor(Math.random() * from.models.length)].position.clone(), b = to.models[Math.floor(Math.random() * to.models.length)].position.clone(); const u = WARSHIPS[sh.a] || SWARM[sh.a] || DEFENCE[sh.a]; this.shot(a, b, u.wpn, sh.side, Math.random() * 0.9); }
    // kills: remove models in proportion, with explosions, a moment after the shots land
    window.setTimeout(() => { for (const kill of r.kills) { const st = this.stacks.find((s) => s.side === kill.side && s.k === kill.k); if (!st) continue; st.n = Math.max(0, st.n - kill.n); const keep = st.n <= 0 ? 0 : Math.max(1, Math.ceil((st.models.length * st.n) / (st.n + kill.n)));
      while (st.models.length > keep) { const g = st.models.pop()!; this.boom(g.position, SWARM[st.k] ? '#ff6b3a' : '#ffd36a', (SIZE[(WARSHIPS[st.k] || SWARM[st.k] || DEFENCE[st.k]).size] || 1) * 2); this.group.remove(g); } } this.onRound(); }, 1100 / this.speed);
  }
  frame(dt: number) {
    this.t += dt; if (this.res && !this.done) { this.rt -= dt * this.speed; if (this.rt <= 0) { this.round++; if (this.round < this.res.rounds.length) { this.play(this.res.rounds[this.round]); this.rt = 2.6; this.onRound(); } else { this.done = true; this.onDone(); } } }
    for (const st of this.stacks) for (const g of st.models) g.position.y += Math.sin(this.t * 1.2 + g.userData.ph) * 0.006;
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.t += dt * this.speed; const k = f.t / f.life; if (k >= 1) { this.scene.remove(f.o); this.fx.splice(i, 1); continue; } f.up?.(k, f.o); }
    this.world.rotation.y += dt * 0.01; const c = this.cam; c.dist += (c.tdist - c.dist) * 0.1; this.camera.position.set(Math.sin(c.yaw) * Math.cos(c.pitch) * c.dist, Math.sin(c.pitch) * c.dist, Math.cos(c.yaw) * Math.cos(c.pitch) * c.dist); this.camera.lookAt(0, 0, 0);
  }
}
