// The land around a base, drawn. The plots you own: graded ground inside a gold boundary. Deposits your rovers have
// found: soft stains in the ground with ice shards, ore boulders, crystal clusters, steaming vents, methane pools and
// rock walls standing in them. Rovers driving their survey lines, survey stakes and a drone where crews are laying out
// a new plot. In Land mode, the plot grid: what you can survey, what you can claim, and what the satellites see from
// orbit. On Venus every new plot is a new deck module hanging under its own envelope. Dust storms thicken the air and
// drive dust across the base.
import * as THREE from 'three';
import { State } from '../core/state';
import { GRID, CHUNK, BUILDINGS } from '../data/buildings';
import { DEPOSITS } from '../data/sites';
import * as LD from '../core/land';
import { area, dims } from '../core/game';
import { Kit, mix, shade } from './kit';
import { droneModel } from './models';
const C = GRID / 2, N = LD.NCH;
// the stain each deposit leaves in the ground
const STAIN: Record<string, string> = { ore: '#8a4626', rare: '#8a5ad8', ice: '#eaf8ff', he3: '#d9cdf2', methane: '#1e1208', geo: '#c8461e', sun: '#ffe08a', shelter: '#34323a' };
const LABEL: Record<string, string> = { ore: 'ORE', rare: 'RARE', ice: 'ICE', he3: 'He-3', methane: 'CH₄', geo: 'GEO', sun: 'SUN', shelter: 'SHELTER' };
const pillTex = new Map<string, THREE.Texture>();
let softTex: THREE.Texture | null = null; // a soft round puff (dust, steam, dust clouds)
function soft() { if (softTex) return softTex; const ct = document.createElement('canvas'); ct.width = ct.height = 64; const cg = ct.getContext('2d')!; const gr = cg.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cg.fillStyle = gr; cg.fillRect(0, 0, 64, 64); softTex = new THREE.CanvasTexture(ct); return softTex; }
function pill(t: string, hint: boolean) { const key = t + hint; let tx = pillTex.get(key); if (tx) return tx; const c = document.createElement('canvas'); c.width = 160; c.height = 56; const g = c.getContext('2d')!; const col = DEPOSITS[t]?.col || '#fff';
  g.fillStyle = 'rgba(8,14,28,0.86)'; g.strokeStyle = col; g.lineWidth = 4; if (hint) g.setLineDash([9, 6]); g.beginPath(); g.roundRect(4, 4, 152, 48, 22); g.fill(); g.stroke(); g.setLineDash([]);
  g.fillStyle = col; g.font = '700 26px Oxanium, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(LABEL[t] + (hint ? '?' : ''), 80, 30);
  tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; pillTex.set(key, tx); return tx; }
const h32 = (x: number, z: number) => { let h = (x * 374761393 + z * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export interface LandLook { id: string; fog: string; fogNear: number; fogFar: number; ground: string[]; base: string; rock: string; deck?: boolean }
export class LandLayer {
  group = new THREE.Group(); mode = false; sel: [number, number] | null = null;
  private P: number; private cv = document.createElement('canvas'); private tex: THREE.CanvasTexture; private plane: THREE.Mesh;
  private edge: THREE.Mesh | null = null; private grid: THREE.LineSegments | null = null; private gridOn = false; private selFrame: THREE.Mesh;
  private props = new THREE.Group(); private marks = new THREE.Group(); private work = new THREE.Group(); private decks = new THREE.Group();
  private kTex = ''; private kEdge = ''; private kProps = ''; private kWork = ''; private kMarks = ''; private kDeck = '';
  private rovers: { g: THREE.Group; beam: THREE.Mesh; cx: number; cz: number; ph: number }[] = []; private drones: { g: THREE.Group; cx: number; cz: number; ph: number; ring: THREE.Mesh }[] = [];
  private steam: THREE.Points | null = null; private vents: THREE.Vector3[] = []; private life = new Float32Array(0);
  private dust: THREE.Points; private dustV: Float32Array; private stormTo = 0; storm = 0; private clouds: THREE.Sprite[] = [];
  sun: { light: THREE.DirectionalLight; base: number } | null = null; // dimmed in a storm
  get dustCol() { return mix(this.look.fog, this.look.ground[1] || this.look.base, 0.55); }
  constructor(private scene: THREE.Scene, private look: LandLook, private quality: 'high' | 'low') {
    this.P = quality === 'high' ? 8 : 5; this.cv.width = this.cv.height = GRID * this.P; this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4;
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(GRID, GRID), new THREE.MeshStandardMaterial({ map: this.tex, transparent: true, depthWrite: false, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3 })); this.plane.rotation.x = -Math.PI / 2; this.plane.position.y = 0.025; this.plane.receiveShadow = true; this.plane.renderOrder = 1; this.group.add(this.plane);
    const sh = new THREE.Shape(); const o = CHUNK / 2 + 0.3, i = CHUNK / 2 - 0.05; sh.moveTo(-o, -o); sh.lineTo(o, -o); sh.lineTo(o, o); sh.lineTo(-o, o); sh.lineTo(-o, -o); const hole = new THREE.Path(); hole.moveTo(-i, -i); hole.lineTo(-i, i); hole.lineTo(i, i); hole.lineTo(i, -i); hole.lineTo(-i, -i); sh.holes.push(hole);
    const sg = new THREE.ShapeGeometry(sh); sg.rotateX(-Math.PI / 2); this.selFrame = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: '#ffd36a', transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false })); this.selFrame.position.y = 0.09; this.selFrame.visible = false; this.selFrame.renderOrder = 3; this.group.add(this.selFrame);
    this.group.add(this.props, this.marks, this.work, this.decks); this.marks.visible = false;
    const nd = quality === 'high' ? 900 : 420; const dp = new Float32Array(nd * 3); this.dustV = new Float32Array(nd); for (let k = 0; k < nd; k++) { dp[k * 3] = (Math.random() - 0.5) * 80; dp[k * 3 + 1] = Math.random() * 12; dp[k * 3 + 2] = (Math.random() - 0.5) * 80; this.dustV[k] = 0.6 + Math.random() * 0.8; }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ map: soft(), color: mix(look.fog, look.ground[1] || look.base, 0.5), size: 0.32, transparent: true, opacity: 0, depthWrite: false })); this.dust.visible = false; this.dust.frustumCulled = false; this.group.add(this.dust);
    const tx = soft();
    for (let k = 0; k < (quality === 'high' ? 16 : 9); k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, color: mix(look.fog, look.ground[1] || look.base, 0.6), transparent: true, opacity: 0, depthWrite: false })); sp.position.set((Math.random() - 0.5) * 90, 1.5 + Math.random() * 4, (Math.random() - 0.5) * 90); const sz = 16 + Math.random() * 18; sp.scale.set(sz, sz * 0.35, 1); sp.visible = false; this.clouds.push(sp); this.group.add(sp); }
    scene.add(this.group); }
  dispose() { this.scene.remove(this.group); this.tex.dispose(); }
  showGrid(v: boolean) { this.gridOn = v; if (this.grid) this.grid.visible = v; }
  setMode(on: boolean) { this.mode = on; this.marks.visible = on; this.kTex = ''; if (!on) this.sel = null; this.selFrame.visible = on && !!this.sel; }
  select(cx: number, cz: number) { this.sel = [cx, cz]; this.selFrame.position.set((cx + 0.5) * CHUNK - C, 0.09, (cz + 0.5) * CHUNK - C); this.selFrame.visible = this.mode; }
  // ---------------- rebuild what changed ----------------
  sync(s: State, base: string) {
    const B = s.bases[base]; if (!B) return; const A = area(s, base); const claims = Object.keys(B.claims || {}).sort().join(';'), surv = Object.keys(B.surveyed || {}).sort().join(';'), site = LD.siteOf(s, base)?.id || '', hl = LD.hintLevel(s, base), rr = LD.roverRange(s, base);
    const own = new Uint8Array(GRID * GRID); for (let z = 0; z < GRID; z++) for (let x = 0; x < GRID; x++) { if (x >= A.lo && z >= A.lo && x < A.hi && z < A.hi) own[z * GRID + x] = 1; else if (B.claims && B.claims[Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK)]) own[z * GRID + x] = 2; }
    const kE = A.lo + ':' + A.hi + '|' + claims; if (kE !== this.kEdge) { this.kEdge = kE; this.buildEdge(own); if (this.look.deck) this.buildDecks(s, base); }
    const kT = kE + '|' + surv + '|' + site + '|' + hl + '|' + rr + '|' + this.mode; if (kT !== this.kTex) { this.kTex = kT; this.drawTex(s, base, own); }
    const occ = new Set<number>(); for (const it of B.items) { const [w, d] = dims(it.b, it.r); for (let z = it.z; z < it.z + d; z++) for (let x = it.x; x < it.x + w; x++) occ.add(z * GRID + x); }
    const kP = surv + '|' + site + '|' + B.items.map((i) => i.x + ',' + i.z + ',' + i.r + i.b).join(';'); if (kP !== this.kProps) { this.kProps = kP; this.buildProps(s, base, occ); }
    const kM = kT; if (kM !== this.kMarks) { this.kMarks = kM; this.buildMarks(s, base); }
    const jobs = s.jobs.filter((j) => (j.kind === 'prospect' || j.kind === 'claim') && j.base === base); const kW = jobs.map((j) => j.id).join(); if (kW !== this.kWork) { this.kWork = kW; this.buildWork(jobs); }
    const st = LD.stormAt(s, base); this.stormTo = st ? Math.min(1, 0.35 + st.k * 0.22) : 0; }
  // the boundary of the land you own, and the placement grid over it
  private buildEdge(own: Uint8Array) {
    if (this.edge) { this.group.remove(this.edge); this.edge.geometry.dispose(); } if (this.grid) { this.group.remove(this.grid); this.grid.geometry.dispose(); }
    const at = (x: number, z: number) => x >= 0 && z >= 0 && x < GRID && z < GRID && own[z * GRID + x] > 0; const P: number[] = []; const w = 0.22;
    const quad = (x0: number, z0: number, x1: number, z1: number) => { x0 -= C; x1 -= C; z0 -= C; z1 -= C; P.push(x0, 0, z0, x0, 0, z1, x1, 0, z1, x0, 0, z0, x1, 0, z1, x1, 0, z0); };
    const L: number[] = []; const seen = new Set<string>(); const line = (x0: number, z0: number, x1: number, z1: number) => { const k = x0 + ',' + z0 + ',' + x1 + ',' + z1; if (seen.has(k)) return; seen.add(k); L.push(x0 - C, 0.035, z0 - C, x1 - C, 0.035, z1 - C); };
    for (let z = 0; z < GRID; z++) for (let x = 0; x < GRID; x++) { if (!at(x, z)) continue;
      if (!at(x, z - 1)) quad(x, z - w, x + 1, z); if (!at(x, z + 1)) quad(x, z + 1, x + 1, z + 1 + w); if (!at(x - 1, z)) quad(x - w, z, x, z + 1); if (!at(x + 1, z)) quad(x + 1, z, x + 1 + w, z + 1);
      line(x, z, x + 1, z); line(x, z, x, z + 1); line(x, z + 1, x + 1, z + 1); line(x + 1, z, x + 1, z + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); this.edge = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#f4e7b8', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide })); this.edge.position.y = 0.045; this.edge.renderOrder = 2; this.group.add(this.edge);
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(L, 3)); this.grid = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22 })); this.grid.visible = this.gridOn; this.group.add(this.grid); }
  // the ground layer: graded plots, deposit stains, and the Land-mode overlay
  private drawTex(s: State, base: string, own: Uint8Array) {
    const P = this.P, S = GRID * P, g = this.cv.getContext('2d')!; g.clearRect(0, 0, S, S); const D = LD.deposits(s, base);
    const sv = new Uint8Array(N * N); for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) sv[z * N + x] = LD.surveyed(s, base, x, z) ? 1 : 0;
    if (!this.look.deck) { g.fillStyle = this.look.id === 'earth' ? 'rgba(255,250,225,0.10)' : 'rgba(255,246,220,0.12)'; for (let i = 0; i < own.length; i++) if (own[i] === 2) g.fillRect((i % GRID) * P, Math.floor(i / GRID) * P, P, P); }
    const blob = (x: number, z: number, r: number, col: string, a: number) => { const X = (x + 0.5) * P, Y = (z + 0.5) * P, R = r * P; const gr = g.createRadialGradient(X, Y, 0, X, Y, R); const c = new THREE.Color(col); const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`; gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(X - R, Y - R, R * 2, R * 2); };
    for (const [i, t] of D) { const x = i % GRID, z = Math.floor(i / GRID); if (!sv[Math.floor(z / CHUNK) * N + Math.floor(x / CHUNK)]) continue; blob(x, z, 1.25, STAIN[t] || '#fff', t === 'methane' ? 0.7 : t === 'sun' || t === 'shelter' ? 0.28 : 0.42); }
    if (!this.mode) { this.tex.needsUpdate = true; return; }
    // Land mode: veil what is unknown, show hints from orbit, outline what the rovers can reach and what can be claimed
    const hl = LD.hintLevel(s, base), rr = LD.roverRange(s, base); const ownC = (x: number, z: number) => x >= 0 && z >= 0 && x < N && z < N && LD.ownedChunk(s, base, x, z);
    const dist = new Uint8Array(N * N).fill(99); for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (ownC(x, z)) for (let zz = 0; zz < N; zz++) for (let xx = 0; xx < N; xx++) dist[zz * N + xx] = Math.min(dist[zz * N + xx], Math.max(Math.abs(xx - x), Math.abs(zz - z)));
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) { const X = x * CHUNK * P, Y = z * CHUNK * P, W = CHUNK * P; const o = ownC(x, z), k = sv[z * N + x];
      if (!k) { g.fillStyle = dist[z * N + x] <= rr ? 'rgba(6,12,24,0.34)' : 'rgba(4,7,14,0.6)'; g.fillRect(X, Y, W, W); }
      else if (!o && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => ownC(x + a, z + b))) { g.fillStyle = 'rgba(93,255,154,0.13)'; g.fillRect(X, Y, W, W); g.strokeStyle = 'rgba(93,255,154,0.85)'; g.lineWidth = P * 0.22; g.setLineDash([P * 0.9, P * 0.6]); g.strokeRect(X + P * 0.3, Y + P * 0.3, W - P * 0.6, W - P * 0.6); g.setLineDash([]); }
      if (!k && dist[z * N + x] <= rr) { g.strokeStyle = 'rgba(110,231,255,0.6)'; g.lineWidth = P * 0.16; g.setLineDash([P * 0.5, P * 0.7]); g.strokeRect(X + P * 0.3, Y + P * 0.3, W - P * 0.6, W - P * 0.6); g.setLineDash([]); } }
    if (hl) for (const [i, t] of D) { const x = i % GRID, z = Math.floor(i / GRID); if (sv[Math.floor(z / CHUNK) * N + Math.floor(x / CHUNK)]) continue; if (hl < 2 && t !== 'ice' && t !== 'ore') continue; if (h32(x, z) > 0.35) continue; blob(x + (h32(z, x) - 0.5) * 2, z + (h32(x + 7, z) - 0.5) * 2, 2.6, DEPOSITS[t].col, 0.16); }
    g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = Math.max(1, P * 0.1); g.beginPath(); for (let k = 0; k <= N; k++) { g.moveTo(k * CHUNK * P, 0); g.lineTo(k * CHUNK * P, S); g.moveTo(0, k * CHUNK * P); g.lineTo(S, k * CHUNK * P); } g.stroke();
    this.tex.needsUpdate = true; }
  // what stands in a deposit: shards, boulders, crystals, vents, pools, rock walls (not under buildings)
  private buildProps(s: State, base: string, occ: Set<number>) {
    for (const c of [...this.props.children]) { this.props.remove(c); (c as THREE.Mesh).geometry?.dispose(); } this.vents = []; if (this.steam) { this.group.remove(this.steam); this.steam.geometry.dispose(); this.steam = null; }
    const D = LD.deposits(s, base); const lists: Record<string, THREE.Matrix4[]> = {}; const q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(); const cap = this.quality === 'high' ? 500 : 240;
    const put = (k: string, x: number, y: number, z: number, ry: number, sx: number, sy: number, sz: number, rx = 0) => { const L = lists[k] || (lists[k] = []); if (L.length >= cap) return; e.set(rx, ry, 0); q.setFromEuler(e); L.push(new THREE.Matrix4().compose(v.set(x - C, y, z - C), q, sc.set(sx, sy, sz))); };
    for (const [i, t] of D) { const x = i % GRID, z = Math.floor(i / GRID); if (occ.has(i) || !LD.surveyed(s, base, Math.floor(x / CHUNK), Math.floor(z / CHUNK))) continue; const r = h32(x, z), r2 = h32(z + 3, x + 11), px = x + 0.25 + r2 * 0.5, pz = z + 0.25 + r * 0.5;
      if (t === 'methane') { put('pool', x + 0.5, 0.03, z + 0.5, r * 6, 1.55, 1, 1.55); continue; }
      if (r > (t === 'shelter' ? 0.3 : 0.45)) continue;
      if (t === 'ice') { for (let k = 0; k < 3; k++) put('ice', px + (h32(x + k, z) - 0.5) * 0.6, 0.1, pz + (h32(z, x + k) - 0.5) * 0.6, r * 9 + k, 0.18 + r2 * 0.16, 0.4 + h32(k, x) * 0.6, 0.18 + r * 0.12, (h32(x, k) - 0.5) * 0.7); }
      else if (t === 'ore') put('ore', px, 0.12, pz, r * 9, 0.4 + r2 * 0.45, 0.28 + r * 0.3, 0.35 + r2 * 0.3, r2 * 3);
      else if (t === 'rare') { for (let k = 0; k < 4; k++) put('rare', px + (h32(x + k, z + 1) - 0.5) * 0.5, 0, pz + (h32(z + k, x + 1) - 0.5) * 0.5, k * 1.7, 0.12 + r2 * 0.08, 0.35 + h32(k, z) * 0.55, 0.12 + r2 * 0.08, (h32(k, x) - 0.5) * 0.8); }
      else if (t === 'he3') put('he3', px, 0.03, pz, r * 9, 0.5 + r2 * 0.4, 0.06, 0.4 + r * 0.3);
      else if (t === 'geo') { put('vent', px, 0, pz, r * 6, 0.55, 0.35 + r2 * 0.3, 0.55); if (this.vents.length < 24) this.vents.push(new THREE.Vector3(px - C, 0.35 + r2 * 0.3, pz - C)); }
      else if (t === 'sun') put('slab', px, 0.04, pz, r * 9, 0.7 + r2 * 0.5, 0.1, 0.5 + r * 0.4);
      else if (t === 'shelter') put('wall', px, 0, pz, r * 6, 0.7 + r2 * 0.6, 0.9 + r * 1.6, 0.6 + r2 * 0.5); }
    const geo: Record<string, () => THREE.BufferGeometry> = { ice: () => new THREE.OctahedronGeometry(0.5, 0).scale(1, 1.6, 1).translate(0, 0.5, 0), ore: () => new THREE.DodecahedronGeometry(0.5, 0), rare: () => new THREE.CylinderGeometry(0.28, 0.42, 1, 6).translate(0, 0.5, 0), he3: () => new THREE.OctahedronGeometry(0.5, 0), vent: () => new THREE.ConeGeometry(0.5, 1, 7, 1, true).translate(0, 0.5, 0), slab: () => new THREE.BoxGeometry(1, 1, 1), wall: () => new THREE.DodecahedronGeometry(0.6, 0).translate(0, 0.45, 0), pool: () => new THREE.CircleGeometry(0.62, 10).rotateX(-Math.PI / 2) };
    const mat: Record<string, () => THREE.Material> = { ice: () => new THREE.MeshStandardMaterial({ color: '#d6f2ff', roughness: 0.12, metalness: 0.05, emissive: '#3a7fb0', emissiveIntensity: 0.25, flatShading: true }), ore: () => new THREE.MeshStandardMaterial({ color: '#7a4e34', roughness: 0.5, metalness: 0.3, flatShading: true }),
      rare: () => new THREE.MeshStandardMaterial({ color: '#b48cff', roughness: 0.2, metalness: 0.1, emissive: '#5a28d0', emissiveIntensity: 0.7, flatShading: true }), he3: () => new THREE.MeshStandardMaterial({ color: '#f1ecff', roughness: 0.3, metalness: 0.2, emissive: '#7a68b0', emissiveIntensity: 0.25, flatShading: true }),
      vent: () => new THREE.MeshStandardMaterial({ color: '#4a2a1e', roughness: 0.9, emissive: '#ff5a1c', emissiveIntensity: 0.35, flatShading: true, side: THREE.DoubleSide }), slab: () => new THREE.MeshStandardMaterial({ color: shade(this.look.base, 0.25), roughness: 0.9, flatShading: true }),
      wall: () => new THREE.MeshStandardMaterial({ color: shade(this.look.rock, -0.15), roughness: 1, flatShading: true }), pool: () => new THREE.MeshStandardMaterial({ color: '#4a3018', roughness: 0.12, metalness: 0, emissive: '#2a1606', emissiveIntensity: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }) };
    for (const k in lists) { const L = lists[k]; const m = new THREE.InstancedMesh(geo[k](), mat[k](), L.length); L.forEach((mm, i) => m.setMatrixAt(i, mm)); m.castShadow = k !== 'pool' && k !== 'he3'; m.receiveShadow = true; this.props.add(m); }
    if (this.vents.length) { const n = this.vents.length * 6; const p = new Float32Array(n * 3).fill(-999); this.life = new Float32Array(n).map(() => Math.random()); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); this.steam = new THREE.Points(g, new THREE.PointsMaterial({ map: soft(), color: '#f2ece4', size: 0.9, transparent: true, opacity: 0.55, depthWrite: false })); this.steam.frustumCulled = false; this.group.add(this.steam); } }
  // Land mode: what each plot holds (surveyed) or seems to hold (seen from orbit)
  private buildMarks(s: State, base: string) {
    for (const c of [...this.marks.children]) { this.marks.remove(c); ((c as THREE.Sprite).material as THREE.Material).dispose(); } if (!this.mode) return;
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) { const I = LD.plotInfo(s, base, x, z); const types = I.surveyed ? Object.keys(I.found).sort((a, b) => I.found[b] - I.found[a]) : I.hints; if (!types.length) continue;
      types.slice(0, 3).forEach((t, k) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: pill(t, !I.surveyed), transparent: true, depthWrite: false, depthTest: false, opacity: I.surveyed ? 0.95 : 0.8 })); sp.scale.set(4.4, 1.54, 1); sp.position.set((x + 0.5) * CHUNK - C, 1.4 + k * 1.7, (z + 0.5) * CHUNK - C); sp.renderOrder = 5; this.marks.add(sp); }); } }
  // rovers on survey and crews laying out new plots
  private buildWork(jobs: { kind: string; key?: any }[]) {
    for (const c of [...this.work.children]) this.work.remove(c); this.rovers = []; this.drones = [];
    jobs.forEach((j, i) => { const [cx, cz] = String(j.key).split(',').map(Number);
      if (j.kind === 'prospect') { const k = new Kit(); k.box(0.78, 0.2, 0.5, '#f2f4f7', 0, 0.2, 0); k.box(0.5, 0.12, 0.42, '#f5c542', -0.08, 0.4, 0); for (const sx of [-0.28, 0, 0.28]) for (const sz of [-0.29, 0.29]) k.cyl(0.11, 0.11, 0.08, 8, '#2c323c', sx, 0.11, sz, { rx: Math.PI / 2 });
        k.cyl(0.02, 0.02, 0.42, 4, '#c9d1dc', 0.24, 0.52, 0); k.cyl(0.14, 0.04, 0.05, 8, '#e6ebf2', 0.24, 0.94, 0, { rz: 0.5 }); k.sphere(0.04, '#6ee7ff', -0.3, 0.46, 0, { glow: true }); const g = k.build('rover');
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.22, 9, 8, 1, true).translate(0, 4.5, 0), new THREE.MeshBasicMaterial({ color: '#6ee7ff', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); g.add(beam);
        this.work.add(g); this.rovers.push({ g, beam, cx, cz, ph: i * 0.37 }); }
      else { const k = new Kit(); for (const [sx, sz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const x = cx * CHUNK + sx * CHUNK - C + (sx ? -0.25 : 0.25), z = cz * CHUNK + sz * CHUNK - C + (sz ? -0.25 : 0.25); k.cyl(0.04, 0.05, 1.1, 5, '#f4efe2', x, 0, z); k.box(0.36, 0.22, 0.02, '#ff7a1a', x + 0.18, 0.82, z); }
        const st = k.build('stakes'); this.work.add(st); const sh = new THREE.Shape(); const o = CHUNK / 2, w = CHUNK / 2 - 0.16; sh.moveTo(-o, -o); sh.lineTo(o, -o); sh.lineTo(o, o); sh.lineTo(-o, o); sh.lineTo(-o, -o); const h = new THREE.Path(); h.moveTo(-w, -w); h.lineTo(-w, w); h.lineTo(w, w); h.lineTo(w, -w); h.lineTo(-w, -w); sh.holes.push(h);
        const rg = new THREE.ShapeGeometry(sh); rg.rotateX(-Math.PI / 2); const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: '#ff9a3c', transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false })); ring.position.set((cx + 0.5) * CHUNK - C, 0.08, (cz + 0.5) * CHUNK - C); this.work.add(ring);
        const d = droneModel(); this.work.add(d); this.drones.push({ g: d, cx, cz, ph: i * 1.3, ring }); } }); }
  // Venus: a new plot is a new deck module with its own lifting envelope
  private buildDecks(s: State, base: string) {
    for (const c of [...this.decks.children]) this.decks.remove(c); const B = s.bases[base]; const keys = Object.keys(B.claims || {}); if (!keys.length) return; const k = new Kit(); const has = (x: number, z: number) => !!B.claims?.[x + ',' + z] || LD.ownedChunk(s, base, x, z);
    for (const key of keys) { const [cx, cz] = key.split(',').map(Number); const x = (cx + 0.5) * CHUNK - C, z = (cz + 0.5) * CHUNK - C; if ([[-1, -1], [1, -1], [-1, 1], [1, 1]].every(([a, b]) => Math.hypot(x + a * CHUNK / 2, z + b * CHUNK / 2) < 26.5)) continue; // already on the city deck
      k.box(CHUNK - 0.04, 1.2, CHUNK - 0.04, this.look.base, x, -1.2, z); k.box(CHUNK - 1.2, 0.9, CHUNK - 1.2, '#8f8a7e', x, -2.1, z); k.sphere(2.3, '#f3f1ea', x, -5.2, z, { sy: 0.55, w: 16, h: 10 }); k.box(0.12, 2.6, 0.12, '#b9b2a0', x, -4.4, z);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (has(cx + dx, cz + dz)) continue; const ex = x + dx * (CHUNK / 2 - 0.1), ez = z + dz * (CHUNK / 2 - 0.1); k.box(dx ? 0.08 : CHUNK, 0.08, dz ? 0.08 : CHUNK, '#f4f1e8', ex, 0.86, ez); for (let p = -2; p <= 2; p++) k.box(0.06, 0.9, 0.06, '#f4f1e8', ex + (dx ? 0 : p * 1.4), 0, ez + (dz ? 0 : p * 1.4)); } }
    this.decks.add(k.build('decks')); }
  // ---------------- every frame ----------------
  frame(t: number, dt: number, cx: number, cz: number, fog: THREE.Fog | null) {
    for (const r of this.rovers) { const f = ((t / 46 + r.ph) % 1) * 3, row = Math.floor(f), u = f - row; const along = row % 2 ? 1 - u : u; const x = r.cx * CHUNK + 0.8 + along * (CHUNK - 1.6), z = r.cz * CHUNK + 1 + row * 2 + (u > 0.92 ? (u - 0.92) / 0.08 * 2 : 0);
      r.g.position.set(x - C, Math.abs(Math.sin(t * 9 + r.ph)) * 0.015, Math.min(z, r.cz * CHUNK + 5.2) - C); r.g.rotation.y = u > 0.92 ? -Math.PI / 2 : row % 2 ? Math.PI : 0; (r.beam.material as THREE.MeshBasicMaterial).opacity = 0.14 + Math.sin(t * 3 + r.ph) * 0.08; }
    for (const d of this.drones) { const a = t * 0.9 + d.ph; d.g.position.set((d.cx + 0.5) * CHUNK - C + Math.cos(a) * 1.8, 1.6 + Math.sin(t * 2.4 + d.ph) * 0.2, (d.cz + 0.5) * CHUNK - C + Math.sin(a) * 1.8); d.g.rotation.y = -a; (d.ring.material as THREE.MeshBasicMaterial).opacity = 0.45 + Math.sin(t * 3 + d.ph) * 0.3; }
    if (this.selFrame.visible) (this.selFrame.material as THREE.MeshBasicMaterial).opacity = 0.65 + Math.sin(t * 4) * 0.3;
    if (this.steam) { const p = this.steam.geometry.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const v = this.vents[Math.floor(i / 6)]; let l = this.life[i] + dt * 0.35; if (l >= 1) l = 0; this.life[i] = l; p.setXYZ(i, v.x + Math.sin(l * 5 + i) * 0.25 * l, v.y + l * 2.6, v.z + Math.cos(l * 4 + i) * 0.25 * l); } p.needsUpdate = true; }
    this.storm += (this.stormTo - this.storm) * Math.min(1, dt * 0.6); const k = this.storm;
    if (fog) { const c0 = new THREE.Color(this.look.fog), c1 = new THREE.Color(mix(this.look.fog, this.look.ground[1] || this.look.base, 0.55)); fog.color.copy(c0.lerp(c1, k)); const lm = this.mode ? 3 : 1; fog.near = this.look.fogNear * (1 - 0.92 * k) * lm; fog.far = Math.max(fog.near + 30, this.look.fogFar * (1 - 0.86 * k) * lm); } // the land map sees through the haze
    if (this.sun) this.sun.light.intensity = this.sun.base * (1 - 0.45 * k);
    for (const c of this.clouds) { c.visible = k > 0.02; if (!c.visible) continue; (c.material as THREE.SpriteMaterial).opacity = 0.42 * k; c.position.x += dt * 7 * k; c.position.z += dt * 2.6 * k; if (c.position.x > cx + 50) c.position.x -= 100; if (c.position.z > cz + 50) c.position.z -= 100; if (c.position.x < cx - 50) c.position.x += 100; if (c.position.z < cz - 50) c.position.z += 100; }
    this.dust.visible = k > 0.02; if (this.dust.visible) { (this.dust.material as THREE.PointsMaterial).opacity = 0.8 * k; (this.dust.material as THREE.PointsMaterial).size = 0.7; const p = this.dust.geometry.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { let x = p.getX(i) + dt * 9 * this.dustV[i] * k, z = p.getZ(i) + dt * 3.5 * this.dustV[i] * k, y = p.getY(i) + Math.sin(t * 2 + i) * dt * 0.3;
        if (x > cx + 40) x -= 80; if (x < cx - 40) x += 80; if (z > cz + 40) z -= 80; if (z < cz - 40) z += 80; p.setXYZ(i, x, y, z); } p.needsUpdate = true; } }
}
