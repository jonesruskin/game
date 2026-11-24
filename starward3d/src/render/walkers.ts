// Life in the base: people walking between buildings (instanced: a handful of draw calls for dozens of them) and
// robots, each its own 3D model, hovering at the building they operate or milling about their dock.
import * as THREE from 'three';
import { buildBot, BotModel } from './botmodels';
import { GRID } from '../data/buildings';
import { State, Item } from '../core/state';
import * as G from '../core/game';
import type { Robot } from '../core/robots';
const C = GRID / 2;
interface Person { p: THREE.Vector3; path: THREE.Vector3[]; wait: number; speed: number; ph: number; }
interface Bot { m: BotModel; home: string; pos: THREE.Vector3; target: THREE.Vector3; wait: number; working: boolean; }
const SHIRTS = ['#f2f4f7', '#ff8a3c', '#2f6fd0', '#22c7e8', '#f5c542', '#e9edf2'];
const SKIN = ['#f1c9a5', '#d9a47c', '#a86d4a', '#7a4a2e', '#ffdcbc'];
export class Walkers {
  group = new THREE.Group(); private body: THREE.InstancedMesh; private head: THREE.InstancedMesh; private people: Person[] = []; private bots = new Map<string, Bot>(); private doors: THREE.Vector3[] = []; private max: number; private m4 = new THREE.Matrix4(); private q = new THREE.Quaternion();
  constructor(scene: THREE.Scene, quality: 'high' | 'low') {
    this.max = quality === 'high' ? 48 : 24; const bg = new THREE.CapsuleGeometry(0.075, 0.18, 3, 6); bg.translate(0, 0.17, 0); const hg = new THREE.SphereGeometry(0.06, 8, 6); hg.translate(0, 0.38, 0);
    this.body = new THREE.InstancedMesh(bg, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), this.max); this.head = new THREE.InstancedMesh(hg, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), this.max);
    const c = new THREE.Color(); for (let i = 0; i < this.max; i++) { this.body.setColorAt(i, c.set(SHIRTS[i % SHIRTS.length])); this.head.setColorAt(i, c.set(SKIN[(i * 7) % SKIN.length])); }
    this.body.castShadow = true; this.body.count = 0; this.head.count = 0; this.group.add(this.body, this.head); scene.add(this.group);
  }
  // doors: the front edge of every finished building; people walk between them
  sync(s: State, base: string, robots: Robot[]) {
    const B = s.bases[base]; if (!B) return; this.doors = B.items.filter((i) => i.lvl > 0).map((i) => doorOf(i));
    const want = Math.min(this.max, Math.round(2 + this.doors.length * 1.6)); while (this.people.length < want && this.doors.length) { const d = this.doors[Math.floor(Math.random() * this.doors.length)].clone(); this.people.push({ p: d, path: [], wait: Math.random() * 3, speed: 0.7 + Math.random() * 0.5, ph: Math.random() * 6 }); }
    this.people.length = Math.min(this.people.length, want); this.body.count = this.head.count = this.people.length;
    // robots on this world: at their building, or around a dock
    const seen = new Set<string>(); const docks = B.items.filter((i) => i.b === 'dock' && i.lvl > 0); let di = 0;
    for (const r of robots.slice(0, this.max)) { let home: Item | undefined; let working = false;
      if (r.post && r.post.base === base) { home = G.itemOf(s, base, r.post.item); working = true; } else if (!r.post && docks.length) home = docks[di++ % docks.length]; if (!home) continue;
      seen.add(r.id); let v = this.bots.get(r.id); const key = home.id;
      if (!v || v.home !== key) { if (v) this.group.remove(v.m.group); const m = buildBot(r.sp, r.lvl); m.group.scale.setScalar(0.85); const p = centerOf(home); const pos = p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 0, (Math.random() - 0.5) * 1.2)); m.group.position.copy(pos); this.group.add(m.group); v = { m, home: key, pos, target: pos.clone(), wait: 0, working }; this.bots.set(r.id, v); }
      v.working = working; }
    for (const [id, v] of this.bots) if (!seen.has(id)) { this.group.remove(v.m.group); this.bots.delete(id); }
  }
  frame(s: State, base: string, t: number, dt: number) {
    const B = s.bases[base]; if (!B) return;
    this.people.forEach((h, i) => { if (h.wait > 0) h.wait -= dt; else if (!h.path.length) { if (this.doors.length) { const d = this.doors[Math.floor(Math.random() * this.doors.length)]; h.path = [new THREE.Vector3(d.x, 0, h.p.z), d.clone()]; } h.wait = 1 + Math.random() * 4; }
      else { const tg = h.path[0]; const dx = tg.x - h.p.x, dz = tg.z - h.p.z, dd = Math.hypot(dx, dz); const step = h.speed * dt; if (dd <= step) { h.p.copy(tg); h.path.shift(); } else { h.p.x += (dx / dd) * step; h.p.z += (dz / dd) * step; h.ph = Math.atan2(dx, dz); } }
      const bob = h.path.length ? Math.abs(Math.sin(t * 9 + i)) * 0.03 : 0; this.q.setFromEuler(new THREE.Euler(0, h.ph, 0)); this.m4.compose(new THREE.Vector3(h.p.x, bob, h.p.z), this.q, new THREE.Vector3(1, 1, 1)); this.body.setMatrixAt(i, this.m4); this.head.setMatrixAt(i, this.m4); });
    this.body.instanceMatrix.needsUpdate = true; this.head.instanceMatrix.needsUpdate = true;
    for (const v of this.bots.values()) { const it = B.items.find((x) => x.id === v.home); if (!it) continue; const c = centerOf(it); const [w, d] = G.dims(it.b, it.r);
      if (v.wait > 0) v.wait -= dt; else { const dx = v.target.x - v.pos.x, dz = v.target.z - v.pos.z, dd = Math.hypot(dx, dz); if (dd < 0.05) { v.target.set(c.x + (Math.random() - 0.5) * (w + 0.6), 0, c.z + (Math.random() - 0.5) * (d + 0.6)); if (Math.abs(v.target.x - c.x) < w / 2 - 0.2 && Math.abs(v.target.z - c.z) < d / 2 - 0.2) v.target.z = c.z + (d / 2 + 0.35) * Math.sign(v.target.z - c.z || 1); v.wait = v.working ? 0.5 + Math.random() * 2 : 1 + Math.random() * 3; }
        else { const sp = 0.8 * dt; v.pos.x += (dx / dd) * Math.min(sp, dd); v.pos.z += (dz / dd) * Math.min(sp, dd); v.m.group.rotation.y = Math.atan2(dx, dz); } }
      v.m.group.position.set(v.pos.x, 0.05 + (v.m.hover ? v.m.hover * 0.6 : 0), v.pos.z); v.m.anim(t, v.wait <= 0); }
  }
  clear() { for (const v of this.bots.values()) this.group.remove(v.m.group); this.bots.clear(); this.people = []; this.body.count = this.head.count = 0; }
}
function centerOf(it: Item) { const [w, d] = G.dims(it.b, it.r); return new THREE.Vector3(it.x + w / 2 - C, 0, it.z + d / 2 - C); }
function doorOf(it: Item) { const [w, d] = G.dims(it.b, it.r); const c = centerOf(it); return new THREE.Vector3(c.x + (Math.random() - 0.5) * w * 0.5, 0, c.z + d / 2 + 0.25); }
