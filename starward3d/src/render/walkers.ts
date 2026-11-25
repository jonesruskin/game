// Life in the base (instanced: a handful of draw calls for dozens of people). Every workplace has a crew that grows
// with its level, dressed for the job (hi-vis at the mines and refineries, white coats in the labs, blue shirts in the
// offices): they walk between work spots around their building, stop to work, and carry crates where there is cargo
// to move. Commuters walk between Mission Control (or the domes) and the workplaces. Robots, each its own model,
// hover at the building they operate or mill about their dock.
import * as THREE from 'three';
import { buildBot, BotModel } from './botmodels';
import { GRID } from '../data/buildings';
import { State, Item } from '../core/state';
import * as G from '../core/game';
import type { Robot } from '../core/robots';
const C = GRID / 2;
interface Person { p: THREE.Vector3; path: THREE.Vector3[]; wait: number; speed: number; ph: number; home?: string; spots?: THREE.Vector3[]; si: number; carry: boolean; work: boolean; role: string; }
// who works where, and what they wear
const ROLE: Record<string, string> = { mine: 'ind', refinery: 'ind', regolith: 'ind', ice: 'ind', he3x: 'ind', methane: 'ind', skimmer: 'ind', beltControl: 'ind', antimatter: 'ind', depot: 'ind', massDriver: 'ind', cellplant: 'ind',
  research: 'sci', university: 'sci', llab: 'sci', xenolab: 'sci', casimir: 'sci', terraformer: 'sci', fusionlab: 'sci', tracking: 'sci', office: 'off', hq: 'off', academy: 'off', warroom: 'off', resort: 'off', hub: 'off',
  solar: 'pow', lsolar: 'pow', fission: 'pow', reactor: 'pow', fusion: 'pow', launch: 'lch', vab: 'lch', elevator: 'lch', workshop: 'lch', greenhouse: 'farm', algae: 'farm', deepfarm: 'farm' };
const WEAR: Record<string, [string, string]> = { ind: ['#ff8a3c', '#f5c542'], sci: ['#f2f4f7', ''], off: ['#2f6fd0', ''], pow: ['#f5c542', '#f2f4f7'], lch: ['#e9edf2', '#ff5a3c'], farm: ['#3fa34d', ''], walk: ['', ''] };
const CARRY = new Set(['ind', 'lch', 'farm']);
interface Bot { m: BotModel; home: string; pos: THREE.Vector3; target: THREE.Vector3; wait: number; working: boolean; }
const SHIRTS = ['#f2f4f7', '#ff8a3c', '#2f6fd0', '#22c7e8', '#f5c542', '#e9edf2'];
const SKIN = ['#f1c9a5', '#d9a47c', '#a86d4a', '#7a4a2e', '#ffdcbc'];
export class Walkers {
  group = new THREE.Group(); private body: THREE.InstancedMesh; private head: THREE.InstancedMesh; private box: THREE.InstancedMesh; private people: Person[] = []; private crewKey = ''; private suited = false; private sc = new THREE.Vector3(1.3, 1.3, 1.3); private bots = new Map<string, Bot>(); private doors: THREE.Vector3[] = []; private max: number; private m4 = new THREE.Matrix4(); private q = new THREE.Quaternion();
  constructor(scene: THREE.Scene, quality: 'high' | 'low') {
    this.max = quality === 'high' ? 72 : 36; const bg = new THREE.CapsuleGeometry(0.075, 0.18, 3, 6); bg.translate(0, 0.17, 0); const hg = new THREE.SphereGeometry(0.06, 8, 6); hg.translate(0, 0.38, 0);
    this.body = new THREE.InstancedMesh(bg, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), this.max); this.head = new THREE.InstancedMesh(hg, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), this.max);
    const c = new THREE.Color(); for (let i = 0; i < this.max; i++) { this.body.setColorAt(i, c.set(SHIRTS[i % SHIRTS.length])); this.head.setColorAt(i, c.set(SKIN[(i * 7) % SKIN.length])); }
    const cg = new THREE.BoxGeometry(0.14, 0.1, 0.12); cg.translate(0, 0.5, 0.02); this.box = new THREE.InstancedMesh(cg, new THREE.MeshStandardMaterial({ color: '#c08a4a', roughness: 0.8 }), this.max); this.box.count = 0;
    this.body.castShadow = true; this.body.count = 0; this.head.count = 0; this.group.add(this.body, this.head, this.box); scene.add(this.group);
  }
  // airless worlds: white pressure suits and gold visors; once the sky is breathable, everyday clothes again
  suits(on: boolean) { this.suited = on; this.dress(); }
  private dress() { const c = new THREE.Color(); for (let i = 0; i < this.max; i++) { const h = this.people[i]; const w = WEAR[h ? h.role : 'walk'] || WEAR.walk;
      if (this.suited) { this.body.setColorAt(i, c.set(w[0] && h && h.role !== 'walk' ? new THREE.Color('#eef0f3').lerp(new THREE.Color(w[0]), 0.45) : i % 5 ? '#eef0f3' : '#ff8a3c')); this.head.setColorAt(i, c.set('#e8b84a')); }
      else { this.body.setColorAt(i, c.set(w[0] || SHIRTS[i % SHIRTS.length])); this.head.setColorAt(i, c.set(w[1] || SKIN[(i * 7) % SKIN.length])); } }
    if (this.body.instanceColor) this.body.instanceColor.needsUpdate = true; if (this.head.instanceColor) this.head.instanceColor.needsUpdate = true; }
  // doors: the front edge of every finished building; people walk between them
  sync(s: State, base: string, robots: Robot[]) {
    const B = s.bases[base]; if (!B) return; const live = B.items.filter((i) => i.lvl > 0); this.doors = live.filter((i) => ROLE[i.b] || ['dome', 'burrow', 'dock'].includes(i.b)).map((i) => doorOf(i));
    // crews: one person per workplace at level 1, up to four as it grows; then commuters
    const work = live.filter((i) => ROLE[i.b] && !s.jobs.some((j) => j.kind === 'build' && j.item === i.id && j.from === 0)); const crews: [Item, number][] = work.map((i) => [i, Math.min(4, 1 + Math.floor(i.lvl / 3))]);
    const key = crews.map(([i, n]) => i.id + ':' + n + ':' + i.x + ',' + i.z).join(';'); if (key !== this.crewKey) { this.crewKey = key; const next: Person[] = [];
      for (const [it, n] of crews) for (let k = 0; k < n && next.length < this.max - 4; k++) { const old = this.people.find((h) => h.home === it.id && !next.includes(h)); const spots = spotsOf(it); const role = ROLE[it.b];
        next.push(old ? { ...old, spots, role } : { p: spots[k % spots.length].clone(), path: [], wait: Math.random() * 2, speed: 0.55 + Math.random() * 0.3, ph: Math.random() * 6, home: it.id, spots, si: k % spots.length, carry: false, work: false, role }); }
      const commuters = Math.min(this.max - next.length, Math.max(2, Math.round(this.doors.length * 0.35))); for (let k = 0; k < commuters && this.doors.length; k++) { const old = this.people.find((h) => !h.home && !next.includes(h)); next.push(old || { p: this.doors[Math.floor(Math.random() * this.doors.length)].clone(), path: [], wait: Math.random() * 3, speed: 0.75 + Math.random() * 0.45, ph: Math.random() * 6, si: 0, carry: false, work: false, role: 'walk' }); }
      this.people = next; this.dress(); }
    this.body.count = this.head.count = this.box.count = this.people.length;
    // robots on this world: at their building, or around a dock
    const seen = new Set<string>(); const docks = B.items.filter((i) => i.b === 'dock' && i.lvl > 0); let di = 0;
    for (const r of robots.slice(0, this.max)) { let home: Item | undefined; let working = false;
      if (r.post && r.post.base === base) { home = G.itemOf(s, base, r.post.item); working = true; } else if (!r.post && docks.length) home = docks[di++ % docks.length]; if (!home) continue;
      seen.add(r.id); let v = this.bots.get(r.id); const key = home.id + ':' + r.lvl; // a level-up rebuilds the robot (bigger, a rank ring)
      if (!v || v.home !== key) { if (v) this.group.remove(v.m.group); const m = buildBot(r.sp, r.lvl); m.group.scale.multiplyScalar(0.85); const p = centerOf(home); const pos = p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 0, (Math.random() - 0.5) * 1.2)); m.group.position.copy(pos); this.group.add(m.group); v = { m, home: key, pos, target: pos.clone(), wait: 0, working }; this.bots.set(r.id, v); }
      v.working = working; }
    for (const [id, v] of this.bots) if (!seen.has(id)) { this.group.remove(v.m.group); this.bots.delete(id); }
  }
  frame(s: State, base: string, t: number, dt: number) {
    const B = s.bases[base]; if (!B) return;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    this.people.forEach((h, i) => {
      if (h.wait > 0) { h.wait -= dt; if (h.wait <= 0) h.work = false; }
      else if (!h.path.length) {
        if (h.spots) { // a crew member: work here a while, then on to the next spot (carrying a crate where there is cargo)
          const nx = (h.si + 1 + Math.floor(Math.random() * 2)) % h.spots.length; const to = h.spots[nx]; h.carry = CARRY.has(h.role) && !h.carry && Math.random() < 0.7; h.path = [new THREE.Vector3(to.x, 0, h.p.z), to.clone()]; h.si = nx; }
        else if (this.doors.length) { const d = this.doors[Math.floor(Math.random() * this.doors.length)]; h.path = [new THREE.Vector3(d.x, 0, h.p.z), d.clone()]; } }
      else { const tg = h.path[0]; const dx = tg.x - h.p.x, dz = tg.z - h.p.z, dd = Math.hypot(dx, dz); const step = h.speed * (h.carry ? 0.8 : 1) * dt; if (dd <= step) { h.p.copy(tg); h.path.shift(); if (!h.path.length) { if (h.spots) { h.work = true; h.wait = 2 + Math.random() * 4; if (h.carry && Math.random() < 0.6) h.carry = false; } else h.wait = 1 + Math.random() * 4; } } else { h.p.x += (dx / dd) * step; h.p.z += (dz / dd) * step; h.ph = Math.atan2(dx, dz); } }
      const walking = h.path.length > 0; const bob = walking ? Math.abs(Math.sin(t * 9 + i)) * 0.03 : h.work ? Math.abs(Math.sin(t * (h.role === 'ind' ? 11 : 5) + i)) * 0.045 : 0; const lean = h.work ? (h.role === 'ind' ? Math.max(0, Math.sin(t * 11 + i)) * 0.35 : 0.12) : 0;
      this.q.setFromEuler(new THREE.Euler(lean, h.ph, 0)); this.m4.compose(new THREE.Vector3(h.p.x, bob, h.p.z), this.q, this.sc); this.body.setMatrixAt(i, this.m4); this.head.setMatrixAt(i, this.m4); this.box.setMatrixAt(i, h.carry ? this.m4 : zero); });
    this.body.instanceMatrix.needsUpdate = true; this.head.instanceMatrix.needsUpdate = true; this.box.instanceMatrix.needsUpdate = true;
    for (const v of this.bots.values()) { const it = B.items.find((x) => x.id === v.home); if (!it) continue; const c = centerOf(it); const [w, d] = G.dims(it.b, it.r);
      if (v.wait > 0) v.wait -= dt; else { const dx = v.target.x - v.pos.x, dz = v.target.z - v.pos.z, dd = Math.hypot(dx, dz); if (dd < 0.05) { v.target.set(c.x + (Math.random() - 0.5) * (w + 0.6), 0, c.z + (Math.random() - 0.5) * (d + 0.6)); if (Math.abs(v.target.x - c.x) < w / 2 - 0.2 && Math.abs(v.target.z - c.z) < d / 2 - 0.2) v.target.z = c.z + (d / 2 + 0.35) * Math.sign(v.target.z - c.z || 1); v.wait = v.working ? 0.5 + Math.random() * 2 : 1 + Math.random() * 3; }
        else { const sp = 0.8 * dt; v.pos.x += (dx / dd) * Math.min(sp, dd); v.pos.z += (dz / dd) * Math.min(sp, dd); v.m.group.rotation.y = Math.atan2(dx, dz); } }
      v.m.group.position.set(v.pos.x, 0.05 + (v.m.hover ? v.m.hover * 0.6 : 0), v.pos.z); v.m.anim(t, v.wait <= 0); }
  }
  clear() { for (const v of this.bots.values()) this.group.remove(v.m.group); this.bots.clear(); this.people = []; this.crewKey = ''; this.body.count = this.head.count = this.box.count = 0; }
}
function centerOf(it: Item) { const [w, d] = G.dims(it.b, it.r); return new THREE.Vector3(it.x + w / 2 - C, 0, it.z + d / 2 - C); }
// work spots just outside a building: its door, its corners and the middle of each side
function spotsOf(it: Item) { const [w, d] = G.dims(it.b, it.r); const c = centerOf(it); const ox = w / 2 + 0.28, oz = d / 2 + 0.28;
  return [new THREE.Vector3(c.x - w * 0.3, 0, c.z + oz), new THREE.Vector3(c.x + w * 0.1, 0, c.z + oz), new THREE.Vector3(c.x + ox, 0, c.z + d * 0.25), new THREE.Vector3(c.x + ox, 0, c.z - d * 0.2), new THREE.Vector3(c.x + w * 0.38, 0, c.z + oz)]; } // mostly the sides the camera sees
function doorOf(it: Item) { const [w, d] = G.dims(it.b, it.r); const c = centerOf(it); return new THREE.Vector3(c.x + (Math.random() - 0.5) * w * 0.5, 0, c.z + d / 2 + 0.25); }
