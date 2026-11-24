// The floating island: a turf top merged across every open plot, soil walls where the ground ends, a rocky
// underbelly per plot, glowing rim lights, drifting debris, holographic plots for sale and a build-mode grid.
import * as THREE from 'three';
import { PLOT, PLOTS } from '../data/buildings';
import { rng } from '../core/util';
export const N = PLOT * PLOTS; // tiles per side
export const tileToWorld = (x: number, z: number) => new THREE.Vector3(x - N / 2, 0, z - N / 2);
// ground palettes: [hue, saturation, lightness] for the top, the rim, the two soil bands and the rock
const PAL: Record<string, { top: number[]; rim: number[]; soil: number[]; deep: number[]; rock: number[]; flora: 'grass' | 'pebbles'; peb: string; grass?: string; fl?: string[]; flp?: number; glow?: boolean; check?: number }> = {
  haven: { top: [0.3, 0.55, 0.43], rim: [0.24, 0.42, 0.5], soil: [0.08, 0.42, 0.33], deep: [0.07, 0.25, 0.22], rock: [0.07, 0.28, 0.27], flora: 'grass', peb: '#8a8f99' },
  moon:  { top: [0.6, 0.03, 0.46], rim: [0.6, 0.03, 0.55], soil: [0.6, 0.03, 0.4], deep: [0.6, 0.03, 0.28], rock: [0.6, 0.03, 0.3], flora: 'pebbles', peb: '#9a9a9e' },
  vault: { top: [0.74, 0.32, 0.24], rim: [0.76, 0.42, 0.34], soil: [0.74, 0.3, 0.16], deep: [0.74, 0.25, 0.1], rock: [0.72, 0.2, 0.14], flora: 'pebbles', peb: '#b06dff' },
  dune:  { top: [0.095, 0.62, 0.5], rim: [0.11, 0.58, 0.64], soil: [0.075, 0.5, 0.46], deep: [0.065, 0.45, 0.3], rock: [0.07, 0.32, 0.34], flora: 'grass', peb: '#a08060', grass: '#f0cf7a', fl: ['#ff9a4a', '#ffd84a', '#e05a3a'], flp: 0.06 },
  sakura: { top: [0.27, 0.45, 0.42], rim: [0.93, 0.65, 0.74], soil: [0.05, 0.3, 0.36], deep: [0.04, 0.28, 0.22], rock: [0.07, 0.18, 0.3], flora: 'grass', peb: '#8a8f99', grass: '#a8e08e', fl: ['#ffb7d5', '#ff8fc0', '#ffffff', '#ffd1e6'], flp: 0.42 },
  frost: { top: [0.58, 0.34, 0.8], rim: [0.54, 0.65, 0.66], soil: [0.58, 0.35, 0.62], deep: [0.6, 0.42, 0.42], rock: [0.6, 0.22, 0.45], flora: 'grass', peb: '#cfe8ff', grass: '#e6f6ff', fl: ['#9fd0ff', '#ffffff'], flp: 0.05 },
  ember: { top: [0.05, 0.72, 0.36], rim: [0.085, 0.7, 0.5], soil: [0.04, 0.45, 0.3], deep: [0.03, 0.4, 0.2], rock: [0.05, 0.25, 0.25], flora: 'grass', peb: '#7a5040', grass: '#ff9a40', fl: ['#ffd84a', '#ff5a3a', '#b33a1a'], flp: 0.2 },
  neon:  { top: [0.66, 0.45, 0.13], rim: [0.52, 0.9, 0.5], soil: [0.7, 0.4, 0.12], deep: [0.75, 0.5, 0.07], rock: [0.7, 0.3, 0.11], flora: 'grass', peb: '#3cf2ff', grass: '#2ee6ff', fl: ['#ff3df0', '#3cf2ff', '#ffe03c'], flp: 0.08, glow: true, check: 0.035 },
  mars:  { top: [0.03, 0.62, 0.36], rim: [0.05, 0.55, 0.46], soil: [0.03, 0.45, 0.32], deep: [0.02, 0.35, 0.22], rock: [0.02, 0.32, 0.24], flora: 'pebbles', peb: '#6b3422' },
};
export function turfColors(id: string) { const P = PAL[id] || PAL.haven; const c = new THREE.Color(); const css = (h: number[]) => '#' + c.setHSL(h[0], h[1], h[2]).getHexString();
  return [css(P.top), css(P.rim), P.flora === 'pebbles' ? css(P.soil) : P.grass || '#5fb04a']; }
export class IslandView {
  group = new THREE.Group(); grid: THREE.LineSegments | null = null; private theme = 'haven'; private holo = new THREE.Group(); private debris: THREE.InstancedMesh | null = null; private dInfo: { p: THREE.Vector3; s: number; r: number; ph: number }[] = []; key = '';
  constructor() { this.group.add(this.holo); }
  build(plots: string[], buyable: string[], theme = 'haven') {
    const key = plots.join('|') + '#' + buyable.join('|') + theme; if (key === this.key) return; this.key = key; this.floraKey = ''; this.theme = theme; const P = PAL[theme] || PAL.haven;
    for (const c of [...this.group.children]) if (c !== this.holo) { this.group.remove(c); dispose(c); } this.holo.clear(); this.flora = [];
    const open = new Set(plots); const isOpen = (x: number, z: number) => x >= 0 && z >= 0 && x < N && z < N && open.has(`${Math.floor(x / PLOT)},${Math.floor(z / PLOT)}`);
    const R = rng(7); const pos: number[] = [], col: number[] = []; const c = new THREE.Color();
    const quad = (a: number[], b: number[], cc: number[], d: number[], color: THREE.Color) => { pos.push(...a, ...b, ...cc, ...a, ...cc, ...d); for (let i = 0; i < 6; i++) col.push(color.r, color.g, color.b); };
    // turf top with a gentle per-tile variation and a sandy rim
    for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) { if (!isOpen(x, z)) continue; const X = x - N / 2, Z = z - N / 2;
      const edge = !isOpen(x - 1, z) || !isOpen(x + 1, z) || !isOpen(x, z - 1) || !isOpen(x, z + 1); const ck = P.check || 0.012; const v = (R() - 0.5) * 0.05 + ((x + z) % 2 ? ck : -ck);
      const tp = edge ? P.rim : P.top; c.setHSL(tp[0] + (edge ? 0 : (R() - 0.5) * 0.02), tp[1], tp[2] + v); quad([X, 0, Z], [X, 0, Z + 1], [X + 1, 0, Z + 1], [X + 1, 0, Z], c);
      // soil walls on exposed edges (two bands)
      const walls: [boolean, number[], number[]][] = [[!isOpen(x, z - 1), [X + 1, 0, Z], [X, 0, Z]], [!isOpen(x, z + 1), [X, 0, Z + 1], [X + 1, 0, Z + 1]], [!isOpen(x - 1, z), [X, 0, Z], [X, 0, Z + 1]], [!isOpen(x + 1, z), [X + 1, 0, Z + 1], [X + 1, 0, Z]]];
      for (const [w, a, b] of walls) { if (!w) continue; c.setHSL(P.soil[0], P.soil[1], P.soil[2] + (R() - 0.5) * 0.04); quad(a, [a[0], -0.45, a[2]], [b[0], -0.45, b[2]], b, c); c.setHSL(P.deep[0], P.deep[1], P.deep[2]); quad([a[0], -0.45, a[2]], [a[0], -0.9, a[2]], [b[0], -0.9, b[2]], [b[0], -0.45, b[2]], c); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const top = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: true })); top.receiveShadow = true; top.name = 'ground'; this.group.add(top);
    // rocky underbelly: one displaced cone per plot, overlapping into a single mass
    const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
    for (const k of plots) { const [px, pz] = k.split(',').map(Number); const cx = px * PLOT + PLOT / 2 - N / 2, cz = pz * PLOT + PLOT / 2 - N / 2; const rr = rng(px * 31 + pz * 7 + 3);
      const h = 4 + rr() * 3.5; const cone = new THREE.ConeGeometry(PLOT * 0.62, h, 9, 4, true); cone.rotateX(Math.PI); cone.translate(0, -0.85 - h / 2, 0);
      const p = cone.attributes.position; const cols = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const y = p.getY(i), t = (-y - 0.85) / h; const j = 1 - t * 0.15; p.setX(i, p.getX(i) * j + (rr() - 0.5) * 0.5 * (1 - t)); p.setZ(i, p.getZ(i) * j + (rr() - 0.5) * 0.5 * (1 - t)); p.setY(i, y + (rr() - 0.5) * 0.35 * (t > 0.02 ? 1 : 0));
        c.setHSL(P.rock[0] - t * 0.02, Math.max(0, P.rock[1] - t * 0.12), P.rock[2] - t * 0.12 + (rr() - 0.5) * 0.04); cols.set([c.r, c.g, c.b], i * 3); }
      cone.setAttribute('color', new THREE.BufferAttribute(cols, 3)); cone.computeVertexNormals(); const m = new THREE.Mesh(cone, rockMat); m.position.set(cx, 0, cz); m.castShadow = true; this.group.add(m);
      // glowing crystal veins in the rock
      const vein = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshBasicMaterial({ color: '#7af7ff', toneMapped: false })); vein.position.set(cx + (rr() - 0.5) * 3, -1.6 - rr() * 1.4, cz + (rr() - 0.5) * 3); vein.scale.y = 2; this.group.add(vein); }
    // rim lights along the outer edge
    const rim: THREE.Vector3[] = []; for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) { if (!isOpen(x, z)) continue; if ((x + z) % 2) continue; const X = x - N / 2 + 0.5, Z = z - N / 2 + 0.5;
      if (!isOpen(x, z - 1)) rim.push(new THREE.Vector3(X, -0.2, Z - 0.5)); if (!isOpen(x, z + 1)) rim.push(new THREE.Vector3(X, -0.2, Z + 0.5)); if (!isOpen(x - 1, z)) rim.push(new THREE.Vector3(X - 0.5, -0.2, Z)); if (!isOpen(x + 1, z)) rim.push(new THREE.Vector3(X + 0.5, -0.2, Z)); }
    if (rim.length) { const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: '#7af7ff', toneMapped: false }), rim.length); const m4 = new THREE.Matrix4(); rim.forEach((p, i) => { m4.makeTranslation(p.x, p.y, p.z); im.setMatrixAt(i, m4); }); this.group.add(im); }
    // drifting debris
    const nd = 26; this.debris = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.5, 0), rockMat.clone(), nd); (this.debris.material as THREE.MeshStandardMaterial).vertexColors = false; (this.debris.material as THREE.MeshStandardMaterial).color.set('#6b5a4a'); this.debris.castShadow = true;
    this.dInfo = []; for (let i = 0; i < nd; i++) { const a = R() * Math.PI * 2, d = 14 + R() * 12; this.dInfo.push({ p: new THREE.Vector3(Math.cos(a) * d, -3 - R() * 6, Math.sin(a) * d), s: 0.3 + R() * 1.1, r: R() * 6, ph: R() * 6 }); } this.group.add(this.debris);
    // plots for sale: holographic slabs
    for (const k of buyable) { const [px, pz] = k.split(',').map(Number); const cx = px * PLOT + PLOT / 2 - N / 2, cz = pz * PLOT + PLOT / 2 - N / 2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(PLOT - 0.3, 0.08, PLOT - 0.3), new THREE.MeshBasicMaterial({ color: '#4fd8ff', transparent: true, opacity: 0.12, depthWrite: false })); m.position.set(cx, -0.1, cz); m.userData.plot = k; this.holo.add(m);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(PLOT - 0.3, 0.08, PLOT - 0.3)), new THREE.LineBasicMaterial({ color: '#7af7ff', transparent: true, opacity: 0.35 })); edges.position.copy(m.position); this.holo.add(edges); }
    // build grid
    const gp: number[] = []; for (let x = 0; x <= N; x++) for (let z = 0; z < N; z++) if (isOpen(x, z) || isOpen(x - 1, z)) gp.push(x - N / 2, 0.02, z - N / 2, x - N / 2, 0.02, z + 1 - N / 2);
    for (let z = 0; z <= N; z++) for (let x = 0; x < N; x++) if (isOpen(x, z) || isOpen(x, z - 1)) gp.push(x - N / 2, 0.02, z - N / 2, x + 1 - N / 2, 0.02, z - N / 2);
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); this.grid = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.18 })); this.grid.visible = false; this.group.add(this.grid);
  }
  holoMeshes() { return this.holo.children.filter((c) => c.userData.plot); }
  // grass tufts and flowers on free ground (instanced: two draw calls for the lot), kept off occupied tiles
  private flora: THREE.InstancedMesh[] = []; private floraKey = '';
  scatter(plots: string[], occupied: Set<string>) {
    const key = plots.join('|') + '#' + [...occupied].sort().join(','); if (key === this.floraKey) return; this.floraKey = key; this.flora.forEach((m) => { this.group.remove(m); m.geometry.dispose(); }); this.flora = [];
    const open = new Set(plots); const R = rng(99); const grass: THREE.Matrix4[] = [], flowers: { m: THREE.Matrix4; c: THREE.Color }[] = []; const q = new THREE.Quaternion(), e = new THREE.Euler();
    const P0 = PAL[this.theme] || PAL.haven; const FL = P0.fl || ['#ffd84a', '#ff7ab8', '#ffffff', '#9fd0ff', '#ff9a4a'], FLP = P0.flp ?? 0.12;
    for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) { if (!open.has(`${Math.floor(x / PLOT)},${Math.floor(z / PLOT)}`) || occupied.has(x + ',' + z)) continue;
      const n = R() < 0.55 ? 1 + Math.floor(R() * 3) : 0; for (let i = 0; i < n; i++) { e.set(0, R() * 6, (R() - 0.5) * 0.3); q.setFromEuler(e); const s = 0.6 + R() * 0.7;
        grass.push(new THREE.Matrix4().compose(new THREE.Vector3(x - N / 2 + 0.15 + R() * 0.7, 0, z - N / 2 + 0.15 + R() * 0.7), q, new THREE.Vector3(s, s * (0.8 + R() * 0.6), s))); }
      if (R() < FLP) { const c = new THREE.Color(FL[Math.floor(R() * FL.length)]); flowers.push({ m: new THREE.Matrix4().makeTranslation(x - N / 2 + 0.2 + R() * 0.6, 0.09, z - N / 2 + 0.2 + R() * 0.6), c }); } }
    const P = PAL[this.theme] || PAL.haven; const pebbles = P.flora === 'pebbles'; if (pebbles) flowers.length = 0;
    if (grass.length) { const g = pebbles ? new THREE.DodecahedronGeometry(0.06, 0) : new THREE.ConeGeometry(0.045, 0.2, 3); g.translate(0, pebbles ? 0.03 : 0.1, 0); const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: pebbles ? P.peb : P.grass || '#5fb04a', flatShading: true, roughness: 0.9, emissive: P.glow ? (P.grass || '#000000') : '#000000', emissiveIntensity: P.glow ? 0.9 : 0 }), grass.length); grass.forEach((mm, i) => m.setMatrixAt(i, mm)); m.receiveShadow = true; this.group.add(m); this.flora.push(m); }
    if (flowers.length) { const g = new THREE.IcosahedronGeometry(0.045, 0); const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, emissive: P.glow ? '#888888' : '#222222' }), flowers.length); flowers.forEach((f, i) => { m.setMatrixAt(i, f.m); m.setColorAt(i, f.c); }); this.group.add(m); this.flora.push(m); }
  }
  update(t: number) {
    if (this.debris) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(); this.dInfo.forEach((d, i) => { e.set(d.r + t * 0.1, d.r * 2 + t * 0.07, 0); q.setFromEuler(e); s.setScalar(d.s);
      m4.compose(new THREE.Vector3(d.p.x, d.p.y + Math.sin(t * 0.4 + d.ph) * 0.4, d.p.z), q, s); this.debris!.setMatrixAt(i, m4); }); this.debris.instanceMatrix.needsUpdate = true; }
    this.holo.children.forEach((c) => { const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial; if (m && 'opacity' in m && c.userData.plot) m.opacity = 0.05 + Math.sin(t * 2) * 0.025; });
  }
}
function dispose(o: THREE.Object3D) { o.traverse((c) => { const m = c as THREE.Mesh; if (m.geometry) m.geometry.dispose(); }); }
