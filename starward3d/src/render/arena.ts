// The holo-arena: a platform floating in orbit, far from the island, where two crews face off. Bots lunge, fire
// element-coloured projectiles or beams, flash on impact and topple when knocked out.
import * as THREE from 'three';
import { Kit } from './kit';
import { buildBot, BotModel } from './botmodels';
import { ELEMENTS } from '../data/elements';
import type { Battle, Hit } from '../core/arena';
import { MOVES } from '../core/arena';
export const ARENA_POS = new THREE.Vector3(0, 0, -260);
interface Slot { m: BotModel; home: THREE.Vector3; ko: boolean; flash: number; }
const BEAMS = new Set(['photon', 'volt', 'solar', 'neural', 'void']);
export class ArenaView {
  group = new THREE.Group(); private A: Slot[] = []; private B: Slot[] = []; private t = 0; private anims: { t: number; dur: number; fn: (k: number) => void; done?: () => void }[] = []; private ring: THREE.Object3D;
  onImpact: (h: Hit, at: THREE.Vector3) => void = () => {};
  constructor(scene: THREE.Scene) {
    const k = new Kit(); k.cyl(7.2, 7.6, 0.6, 32, '#2a3446', 0, -0.6); k.cyl(7.0, 7.0, 0.06, 48, '#3a4a64', 0, 0); k.add(new THREE.TorusGeometry(6.9, 0.08, 6, 64), '#6ee7ff', 0, 0.05, 0, { rx: Math.PI / 2, glow: true });
    k.add(new THREE.TorusGeometry(3.2, 0.05, 6, 48), '#6ee7ff', 0, 0.06, 0, { rx: Math.PI / 2, glow: true });
    for (const [x, c] of [[-3.2, '#4aa8ff'], [3.2, '#ff5a6a']] as [number, string][]) { k.cyl(1.4, 1.4, 0.05, 24, c, x, 0.05, 0, { glow: true }); k.cyl(1.25, 1.25, 0.06, 24, '#1a2232', x, 0.06, 0); }
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; k.box(0.3, 2.2, 0.3, '#c8d0da', Math.cos(a) * 6.6, 0, Math.sin(a) * 6.6); k.box(0.34, 0.12, 0.34, '#6ee7ff', Math.cos(a) * 6.6, 2.2, Math.sin(a) * 6.6, { glow: true }); }
    k.cyl(0.1, 1.2, 4, 10, '#3a4250', 0, -4.6, 0); const plat = k.build('arena'); plat.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).receiveShadow = true; }); this.group.add(plat);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(7.6, 0.03, 4, 96), new THREE.MeshBasicMaterial({ color: '#7af7ff', transparent: true, opacity: 0.18 })); this.ring.rotation.x = Math.PI / 2; this.ring.position.y = 6; this.group.add(this.ring);
    this.group.position.copy(ARENA_POS); scene.add(this.group);
  }
  private clear() { for (const s of [...this.A, ...this.B]) this.group.remove(s.m.group); this.A = []; this.B = []; this.anims = []; }
  setup(bt: Battle) { this.clear();
    const place = (side: 'A' | 'B', i: number, active: boolean) => { const dir = side === 'A' ? -1 : 1; return active ? new THREE.Vector3(dir * 2.4, 0.1, 0) : new THREE.Vector3(dir * 4.8, 0.1, i % 2 ? 1.8 : -1.8); };
    const mk = (f: { sp: string; lvl: number; hp: number }, side: 'A' | 'B', i: number, active: boolean): Slot => { const m = buildBot(f.sp, f.lvl); m.group.scale.multiplyScalar(2.7); const home = place(side, i, active); m.group.position.copy(home); m.group.rotation.y = side === 'A' ? Math.PI / 2 : -Math.PI / 2; this.group.add(m.group); return { m, home, ko: f.hp <= 0, flash: 0 }; };
    this.A = bt.A.map((f, i) => mk(f, 'A', i, i === bt.a)); this.B = bt.B.map((f, i) => mk(f, 'B', i, i === bt.b)); }
  worldPos(side: 'A' | 'B', i: number) { const s = (side === 'A' ? this.A : this.B)[i]; return s ? s.m.group.position.clone().add(this.group.position).add(new THREE.Vector3(0, 1.4, 0)) : this.group.position.clone(); }
  private tween(dur: number, fn: (k: number) => void, done?: () => void) { this.anims.push({ t: 0, dur, fn, done }); }
  // play one round of hits in order; resolves when every animation has finished
  play(hits: Hit[], bt: Battle, speed = 1): Promise<void> { return new Promise((res) => { let i = 0; const next = () => { if (i >= hits.length) { this.reposition(bt, speed, res); return; } const h = hits[i++]; this.playHit(h, speed, next); }; next(); }); }
  private playHit(h: Hit, sp: number, done: () => void) {
    const atkSide = h.side === 'A' ? this.A : this.B, defSide = h.side === 'A' ? this.B : this.A; const target = defSide[h.target]; if (!target) { done(); return; }
    if (h.move === 'burn') { target.flash = 1; this.onImpact(h, target.m.group.position.clone().add(this.group.position).add(new THREE.Vector3(0, 1.6, 0))); this.tween(0.35 / sp, () => {}, done); return; }
    const me = atkSide[h.who]; if (!me) { done(); return; } const el = MOVES[h.move].el; const color = el === 'none' ? '#ffffff' : ELEMENTS[el].glow;
    const from = me.m.group.position.clone(), lunge = from.clone().lerp(target.m.group.position, 0.18);
    this.tween(0.18 / sp, (k) => me.m.group.position.lerpVectors(from, lunge, Math.sin(k * Math.PI / 2)), () => {
      const a = me.m.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), b = target.m.group.position.clone().add(new THREE.Vector3(0, 1.1, 0));
      let fx: THREE.Object3D; if (BEAMS.has(el)) { const len = a.distanceTo(b); const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, len, 8), new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true })); beam.position.copy(a).lerp(b, 0.5); beam.lookAt(b); beam.rotateX(Math.PI / 2); fx = beam; }
      else { fx = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), new THREE.MeshBasicMaterial({ color, toneMapped: false })); fx.position.copy(a); }
      this.group.add(fx); const isBeam = BEAMS.has(el);
      this.tween((isBeam ? 0.22 : 0.32) / sp, (k) => { if (isBeam) { ((fx as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1 - k * 0.6; fx.scale.x = fx.scale.z = 1 + Math.sin(k * 30) * 0.3; } else { fx.position.lerpVectors(a, b, k); fx.position.y += Math.sin(k * Math.PI) * 0.8; fx.rotation.y += 0.3; } }, () => {
        this.group.remove(fx); if (!h.miss) target.flash = 1; this.onImpact(h, b.clone().add(this.group.position));
        this.tween(0.22 / sp, (k) => me.m.group.position.lerpVectors(lunge, from, k), () => { if (h.ko) this.knockOut(target, sp, done); else done(); }); }); }); }
  private knockOut(s: Slot, sp: number, done: () => void) { s.ko = true; const g = s.m.group, z0 = g.rotation.z, y0 = g.position.y; this.tween(0.5 / sp, (k) => { g.rotation.z = z0 + k * 1.4 * (g.position.x < 0 ? -1 : 1); g.position.y = y0 - k * 0.3; g.scale.setScalar(2.7 * (1 - k * 0.35)); }, () => { g.visible = false; done(); }); }
  // move the next fighters forward after knockouts
  private reposition(bt: Battle, sp: number, res: () => void) { const moves: (() => void)[] = []; for (const [side, arr, act] of [['A', this.A, bt.a], ['B', this.B, bt.b]] as ['A' | 'B', Slot[], number][]) { const s = arr[act]; if (!s || s.ko) continue; const front = new THREE.Vector3((side === 'A' ? -1 : 1) * 2.4, 0.1, 0);
      if (s.m.group.position.distanceTo(front) > 0.1) { const p0 = s.m.group.position.clone(); moves.push(() => this.tween(0.4 / sp, (k) => s.m.group.position.lerpVectors(p0, front, k))); s.home = front; } }
    moves.forEach((m) => m()); this.tween(moves.length ? 0.45 / sp : 0.05, () => {}, res); }
  update(dt: number) { this.t += dt; const t = this.t; this.ring.rotation.z = t * 0.2;
    for (const a of [...this.anims]) { a.t += dt; const k = Math.min(1, a.t / a.dur); a.fn(k); if (k >= 1) { this.anims.splice(this.anims.indexOf(a), 1); a.done && a.done(); } }
    for (const s of [...this.A, ...this.B]) { if (s.ko) continue; s.m.anim(t, false); if (s.flash > 0) { s.flash = Math.max(0, s.flash - dt * 4); const sc = 2.7 * (1 + s.flash * 0.12); s.m.group.scale.setScalar(sc); } } }
}
