// A world's environment: the ground the base stands on (flat where you build, rolling to the horizon beyond),
// water, scattered flora and rocks, the sky dome (gradient, sun, celestial bodies), clouds, fog and light.
// Each world is a config; Part 1 dresses Earth, later parts add the Moon, Mars, Venus and beyond.
import * as THREE from 'three';
import { GRID } from '../data/buildings';
import { rng } from '../core/util';
import { earthGlobe } from './planet';
export interface WorldLook {
  id: string; ground: string[]; base: string; rim: string; rock: string; sky: [string, string, string]; fog: string; fogNear: number; fogFar: number;
  sun: string; sunI: number; amb: [string, string, number]; sea?: string; seaSide?: number; hills: number; flora?: 'trees' | 'rocks' | 'none'; clouds?: string; cloudN?: number;
  stars?: number; craters?: number; skyBody?: 'earth' | 'phobos'; baseGround?: string;
}
export const WORLDS: Record<string, WorldLook> = {
  earth: { id: 'earth', ground: ['#4a8f3e', '#5ea34a', '#3a7a36', '#6cad52'], base: '#5aa648', rim: '#c9b98c', rock: '#8a8478', sky: ['#2f6fd0', '#8fc3f2', '#e8f2ff'], fog: '#cfe2f6', fogNear: 90, fogFar: 420,
    sun: '#fff1d6', sunI: 2.4, amb: ['#bcd8ff', '#3b5a34', 0.75], sea: '#2a78b8', seaSide: 1, hills: 9, flora: 'trees', clouds: '#ffffff', cloudN: 26, stars: 0 },
  moon: { id: 'moon', ground: ['#86868a', '#97979b', '#727276', '#a4a4a8'], base: '#9a9a9e', rim: '#9a9a9e', rock: '#66666a', sky: ['#000000', '#010204', '#05060b'], fog: '#05060b', fogNear: 500, fogFar: 2600,
    sun: '#ffffff', sunI: 3.1, amb: ['#8a9bb5', '#2a2a2e', 0.32], hills: 5, flora: 'rocks', stars: 1, craters: 70, skyBody: 'earth' },
  mars: { id: 'mars', ground: ['#b4643a', '#c27447', '#9e5532', '#cc8656'], base: '#bd7247', rim: '#c98a5e', rock: '#8a4a2e', sky: ['#a8724c', '#d2a074', '#ecc8a0'], fog: '#dcae86', fogNear: 80, fogFar: 420,
    sun: '#fff1e0', sunI: 2.3, amb: ['#e8c4a0', '#5a3a2a', 0.62], hills: 8, flora: 'rocks', stars: 0, craters: 26, skyBody: 'phobos' },
};
const C = GRID / 2;
// smooth value noise
function noise2(seed: number) { const R = rng(seed); const P = new Float32Array(256 * 256).map(() => R()); const f = (x: number, z: number) => { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi; const h = (a: number, b: number) => P[((a & 255) << 8) | (b & 255)]; const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return (h(xi, zi) * (1 - u) + h(xi + 1, zi) * u) * (1 - v) + (h(xi, zi + 1) * (1 - u) + h(xi + 1, zi + 1) * u) * v; }; return (x: number, z: number) => f(x, z) * 0.55 + f(x * 2.1 + 7, z * 2.1 + 3) * 0.3 + f(x * 4.3 + 1, z * 4.3 + 9) * 0.15; }
export class Env {
  group = new THREE.Group(); sky: THREE.Mesh; private clouds: THREE.Group = new THREE.Group(); private water: THREE.Mesh | null = null; private grid: THREE.LineSegments | null = null; private bound: THREE.Mesh | null = null; look: WorldLook;
  height: (x: number, z: number) => number = () => 0;
  constructor(private scene: THREE.Scene, id: string, private quality: 'high' | 'low', private renderer?: THREE.WebGLRenderer) { this.look = WORLDS[id] || WORLDS.earth; this.sky = this.makeSky(); this.build(); this.skyBodies(); }
  private skyObjs: THREE.Object3D[] = [];
  private skyBodies() { const L = this.look; const sun = new THREE.Vector3(-0.55, 0.62, 0.42).normalize();
    if (L.skyBody === 'earth' && this.renderer) { const e = earthGlobe(this.renderer, 70, sun, this.quality === 'high'); e.group.position.set(-620, 420, -1500); e.mesh.rotation.z = 0.4; this.scene.add(e.group); this.skyObjs.push(e.group); this.earthSky = e; }
    if (L.skyBody === 'phobos') { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(18, 1), new THREE.MeshStandardMaterial({ color: '#6e6660', flatShading: true, roughness: 1, fog: false })); p.scale.set(1.3, 1, 1); p.position.set(-500, 520, -1300); this.scene.add(p); this.skyObjs.push(p); } }
  private earthSky: ReturnType<typeof earthGlobe> | null = null;
  private makeSky() {
    const L = this.look; const g = new THREE.SphereGeometry(3000, 32, 16);
    const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: new THREE.Color(L.sky[0]) }, mid: { value: new THREE.Color(L.sky[1]) }, hor: { value: new THREE.Color(L.sky[2]) }, sunDir: { value: new THREE.Vector3(-0.55, 0.62, 0.42).normalize() }, sunCol: { value: new THREE.Color(L.sun) }, stars: { value: L.stars || 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top, mid, hor, sunCol, sunDir; uniform float stars; varying vec3 vP;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
        void main(){ float y = vP.y; vec3 c = y > 0.18 ? mix(mid, top, smoothstep(0.18, 0.75, y)) : mix(hor, mid, smoothstep(-0.02, 0.18, y));
          float sd = max(dot(vP, sunDir), 0.0); c += sunCol * (pow(sd, 900.0) * 3.0 + pow(sd, 18.0) * 0.18);
          if (stars > 0.0) { vec3 q = floor(vP * 420.0); float s = step(0.9975, h(q)); c += vec3(s) * stars * smoothstep(0.0, 0.2, y); }
          gl_FragColor = vec4(c, 1.0); }` });
    const s = new THREE.Mesh(g, m); s.renderOrder = -10; s.frustumCulled = false; this.scene.add(s); return s;
  }
  private build() {
    const L = this.look; const n = noise2(L.id === 'earth' ? 77 : L.id === 'moon' ? 41 : 63); const R = rng(5); const span = 520, seg = this.quality === 'high' ? 200 : 140;
    // craters: bowls with raised rims, scattered beyond the base
    const CR: [number, number, number][] = []; const RC = rng(L.id.length * 97 + 11); for (let i = 0; i < (L.craters || 0); i++) { const a = RC() * Math.PI * 2, d = C + 14 + RC() * 230, r = 3 + Math.pow(RC(), 2) * 26; CR.push([Math.cos(a) * d, Math.sin(a) * d, r]); }
    const crater = (x: number, z: number) => { let h = 0; for (const [cx, cz, r] of CR) { const dx = x - cx, dz = z - cz; const d2 = dx * dx + dz * dz; if (d2 > r * r * 2.6) continue; const d = Math.sqrt(d2); if (d < r) h -= r * 0.22 * (1 - (d / r) * (d / r)); h += r * 0.1 * Math.exp(-Math.pow((d - r) / (0.2 * r), 2)); } return h; };
    // terrain: flat inside the base (with a margin), rising into hills beyond; the sea on one side
    const sea = (x: number, z: number) => (L.seaSide ? (x + z) / Math.SQRT2 : 99999); // signed distance toward the shore (−x −z side is sea)
    this.height = (x: number, z: number) => { const r = Math.max(Math.abs(x), Math.abs(z)); const flat = THREE.MathUtils.smoothstep(r, C + 4, C + 30);
      let h = flat * (n(x * 0.018, z * 0.018) * L.hills * 2.2 + n(x * 0.06, z * 0.06) * 2.2 - 1.2) + flat * Math.max(0, r - 90) * 0.06;
      if (L.seaSide) { const d = sea(x, z); h = Math.min(h, THREE.MathUtils.lerp(-6, h, THREE.MathUtils.smoothstep(d, -C - 34, -C - 12))); } if (CR.length) h += crater(x, z) * THREE.MathUtils.smoothstep(r, C + 6, C + 16); return h; };
    const g = new THREE.PlaneGeometry(span, span, seg, seg); g.rotateX(-Math.PI / 2); const p = g.attributes.position; const col = new Float32Array(p.count * 3); const c = new THREE.Color(), cg = L.ground.map((x) => new THREE.Color(x)), cb = new THREE.Color(L.base), cr = new THREE.Color(L.rim), ck = new THREE.Color(L.rock);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const y = this.height(x, z); p.setY(i, y); const r = Math.max(Math.abs(x), Math.abs(z));
      const k = n(x * 0.09 + 3, z * 0.09); c.copy(cg[0]).lerp(cg[1], k).lerp(cg[2], n(x * 0.03, z * 0.03 + 5) * 0.8);
      if (r < C + 2) { c.lerp(cb, 0.6); if (L.id === 'earth') { const st = Math.floor((x + z + 400) / 2) % 2; c.offsetHSL(0, 0, st ? 0.025 : -0.015); } } // a mown field with stripes on Earth, packed regolith elsewhere
      if (y > L.hills * 1.4) c.lerp(ck, THREE.MathUtils.smoothstep(y, L.hills * 1.4, L.hills * 2.6));
      if (L.seaSide) { const d = sea(x, z); if (d < -C - 8 && y < 1.2) c.lerp(cr, THREE.MathUtils.smoothstep(-d, C + 8, C + 16) * THREE.MathUtils.smoothstep(-y, -1.2, 0.2)); } col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true })); ground.receiveShadow = true; ground.name = 'ground'; this.group.add(ground); this.detail();
    if (L.sea) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.ShaderMaterial({ transparent: true, fog: true, uniforms: { t: { value: 0 }, col: { value: new THREE.Color(L.sea) }, deep: { value: new THREE.Color(L.sea).multiplyScalar(0.5) }, sky: { value: new THREE.Color(L.sky[2]) }, sunDir: { value: new THREE.Vector3(-0.55, 0.62, 0.42).normalize() }, ...THREE.UniformsLib.fog },
        vertexShader: '#include <fog_pars_vertex>\nvarying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
        fragmentShader: `#include <fog_pars_fragment>
          uniform float t; uniform vec3 col, deep, sky, sunDir; varying vec3 vW;
          void main(){ vec2 q = vW.xz * 0.15; float w = sin(q.x * 3.1 + t * 1.3) * 0.5 + sin(q.y * 2.3 - t * 1.1 + q.x) * 0.5 + sin((q.x + q.y) * 5.0 + t * 2.0) * 0.25;
            vec3 n = normalize(vec3(cos(q.x * 3.1 + t) * 0.08, 1.0, cos(q.y * 2.3 - t) * 0.08 + w * 0.03)); vec3 v = normalize(cameraPosition - vW);
            float fr = pow(1.0 - max(dot(n, v), 0.0), 3.0); vec3 c = mix(deep, col, 0.6 + 0.2 * w); c = mix(c, sky, fr * 0.7);
            vec3 h = normalize(sunDir + v); c += vec3(1.0, 0.95, 0.85) * pow(max(dot(n, h), 0.0), 220.0) * 1.8;
            gl_FragColor = vec4(c, 0.94);
          #include <fog_fragment>
          }` }));
      w.rotation.x = -Math.PI / 2; w.position.y = -0.4; this.water = w; this.group.add(w); }
    // trees and rocks outside the base (instanced)
    if (L.flora === 'rocks') { const pos: THREE.Matrix4[] = []; const q = new THREE.Quaternion();
      for (let i = 0; i < (this.quality === 'high' ? 900 : 450); i++) { const x = (R() - 0.5) * 380, z = (R() - 0.5) * 380; const r = Math.max(Math.abs(x), Math.abs(z)); if (r < C + 3) continue; const y = this.height(x, z); const s = 0.25 + Math.pow(R(), 3) * 2.4;
        q.setFromEuler(new THREE.Euler(R() * 3, R() * 6, R() * 3)); pos.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y + s * 0.2, z), q, new THREE.Vector3(s, s * (0.5 + R() * 0.4), s * (0.8 + R() * 0.4)))); }
      const m = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.6, 0), new THREE.MeshStandardMaterial({ color: L.rock, flatShading: true, roughness: 1 }), pos.length); pos.forEach((mm, i) => m.setMatrixAt(i, mm)); m.castShadow = true; m.receiveShadow = true; this.group.add(m); }
    if (L.flora === 'trees') { const pos: THREE.Matrix4[] = []; const q = new THREE.Quaternion();
      for (let i = 0; i < (this.quality === 'high' ? 1400 : 700); i++) { const x = (R() - 0.5) * 360, z = (R() - 0.5) * 360; const r = Math.max(Math.abs(x), Math.abs(z)); if (r < C + 5) continue; const y = this.height(x, z); if (y < 0.5 || y > L.hills * 2) continue; if (n(x * 0.05 + 9, z * 0.05) < 0.42) continue;
        const s = 0.7 + R() * 0.9; q.setFromEuler(new THREE.Euler(0, R() * 6, 0)); pos.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s * (0.9 + R() * 0.5), s))); }
      const trunk = new THREE.CylinderGeometry(0.1, 0.14, 0.8, 5); trunk.translate(0, 0.4, 0); const crown = new THREE.ConeGeometry(0.75, 1.9, 7); crown.translate(0, 1.6, 0); const crown2 = new THREE.ConeGeometry(0.55, 1.3, 7); crown2.translate(0, 2.4, 0);
      for (const [geo, color] of [[trunk, '#6b4a2e'], [crown, '#2f6b34'], [crown2, '#3a7d3c']] as const) { const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 }), pos.length); pos.forEach((mm, i) => m.setMatrixAt(i, mm)); m.castShadow = color !== '#6b4a2e'; m.receiveShadow = true; this.group.add(m); } }
    // clouds: flat soft puffs drifting high above
    if (L.clouds) { const tex = cloudTexture(); for (let i = 0; i < (L.cloudN || 0); i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: L.clouds, transparent: true, opacity: 0.75, depthWrite: false, fog: false }));
        const a = R() * Math.PI * 2, d = 120 + R() * 900; sp.position.set(Math.cos(a) * d, 60 + R() * 70, Math.sin(a) * d); const s = 60 + R() * 110; sp.scale.set(s, s * 0.38, 1); sp.userData.v = 0.6 + R() * 1.2; this.clouds.add(sp); } this.group.add(this.clouds); }
    this.scene.add(this.group);
  }
  // the buildable square: a grid while placing, and a dashed border always
  // close-up ground detail around an off-world base, painted once into a canvas: regolith speckle and mottling,
  // small craters lit from the sun's side, rover tracks leading out of the colony, and on Mars dust ripples and the
  // dark trails dust devils leave. The terrain mesh is too coarse to carry any of this.
  private detail() {
    const L = this.look; if (L.id === 'earth') return; const S = this.quality === 'high' ? 1024 : 512, W = GRID + 20, u = S / W; const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d')!; const R = rng(L.id.length * 31 + 7);
    const blob = (x: number, y: number, r: number, c: string) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
    for (let i = 0; i < 46; i++) blob(R() * S, R() * S, (1.5 + R() * 6) * u, R() < 0.55 ? 'rgba(0,0,0,0.11)' : 'rgba(255,255,255,0.08)');
    for (let i = 0; i < S * 9; i++) { const k = R(); g.fillStyle = k < 0.55 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.12)'; const r = (0.5 + R() * 1.4) * (S / 1024); g.fillRect(R() * S, R() * S, r, r); }
    if (L.id === 'mars') { // dust ripples and dust-devil trails
      g.lineCap = 'round'; for (let i = 0; i < 260; i++) { const x = R() * S, y = R() * S, l = (0.6 + R() * 1.6) * u; g.strokeStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,230,200'},0.10)`; g.lineWidth = 0.08 * u; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l * 0.5, y - l * 0.18, x + l, y + l * 0.12); g.stroke(); }
      for (let i = 0; i < 7; i++) { let x = R() * S, y = R() * S, a = R() * 6.3; g.strokeStyle = 'rgba(40,10,0,0.09)'; g.lineWidth = (0.25 + R() * 0.35) * u; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 40; k++) { a += (R() - 0.5) * 0.5; x += Math.cos(a) * u * 0.9; y += Math.sin(a) * u * 0.9; g.lineTo(x, y); } g.stroke(); } }
    // craters: shaded floor, a lit far wall and a shadowed near wall (light comes from the lower left of the canvas)
    const nC = L.id === 'moon' ? 46 : 16; for (let i = 0; i < nC; i++) { const x = R() * S, y = R() * S, r = (0.4 + Math.pow(R(), 2.4) * 2.4) * u;
      if (R() < 0.18) for (let k = 0; k < 9; k++) { const a = R() * 6.3, l = r * (2.2 + R() * 2.5); g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = r * 0.22; g.beginPath(); g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
      blob(x, y, r * 1.6, 'rgba(255,255,255,0.07)'); const gr = g.createRadialGradient(x - r * 0.3, y + r * 0.3, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,0.22)'); gr.addColorStop(0.75, 'rgba(0,0,0,0.11)'); gr.addColorStop(1, 'rgba(0,0,0,0.04)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.lineWidth = Math.max(1, r * 0.13); g.strokeStyle = 'rgba(255,255,255,0.2)'; g.beginPath(); g.arc(x, y, r * 0.88, -Math.PI * 0.85, Math.PI * 0.35); g.stroke(); g.strokeStyle = 'rgba(0,0,0,0.17)'; g.beginPath(); g.arc(x, y, r * 0.88, Math.PI * 0.35, Math.PI * 1.15); g.stroke(); }
    // rover tracks: pairs of ruts curving out from the colony
    g.lineCap = 'round'; for (let i = 0; i < 6; i++) { let a = R() * 6.3; let x = S / 2 + Math.cos(a) * u * 4, y = S / 2 + Math.sin(a) * u * 4; const pts: [number, number][] = []; for (let k = 0; k < 60; k++) { a += (R() - 0.5) * 0.12; x += Math.cos(a) * u * 0.5; y += Math.sin(a) * u * 0.5; pts.push([x, y]); }
      for (const off of [-0.17, 0.17]) { g.strokeStyle = 'rgba(0,0,0,0.13)'; g.lineWidth = 0.1 * u; g.beginPath(); pts.forEach(([px, py], k) => { const nx = -Math.sin(a), ny = Math.cos(a); const X = px + nx * off * u, Y = py + ny * off * u; if (k) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke(); } }
    // fade out towards the edge so it melts into the terrain
    g.globalCompositeOperation = 'destination-in'; const fade = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.5); fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = fade; g.fillRect(0, 0, S, S);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, W), new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 })); m.rotation.x = -Math.PI / 2; m.position.y = 0.015; m.receiveShadow = true; m.renderOrder = 1; this.group.add(m);
  }
  setArea(lo: number, hi: number) {
    if (this.grid) { this.group.remove(this.grid); this.grid.geometry.dispose(); } if (this.bound) { this.group.remove(this.bound); this.bound.geometry.dispose(); }
    const pts: number[] = []; for (let i = lo; i <= hi; i++) { pts.push(i - C, 0.03, lo - C, i - C, 0.03, hi - C, lo - C, 0.03, i - C, hi - C, 0.03, i - C); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); this.grid = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22 })); this.grid.visible = false; this.group.add(this.grid);
    const s = hi - lo, r = new THREE.RingGeometry(0, 1, 4, 1); r.dispose(); const shape = new THREE.Shape(); const o = s / 2 + 0.25, i2 = s / 2; shape.moveTo(-o, -o); shape.lineTo(o, -o); shape.lineTo(o, o); shape.lineTo(-o, o); shape.lineTo(-o, -o);
    const hole = new THREE.Path(); hole.moveTo(-i2, -i2); hole.lineTo(-i2, i2); hole.lineTo(i2, i2); hole.lineTo(i2, -i2); hole.lineTo(-i2, -i2); shape.holes.push(hole);
    const bg = new THREE.ShapeGeometry(shape); bg.rotateX(-Math.PI / 2); this.bound = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: '#f4e7b8', transparent: true, opacity: 0.55, depthWrite: false })); this.bound.position.set((lo + hi) / 2 - C, 0.04, (lo + hi) / 2 - C); this.group.add(this.bound);
  }
  showGrid(v: boolean) { if (this.grid) this.grid.visible = v; }
  update(t: number, dt: number) { if (this.earthSky) { this.earthSky.mesh.rotation.y = t * 0.01; if (this.earthSky.uniforms) this.earthSky.uniforms.uTime.value = t; } if (this.water) (this.water.material as THREE.ShaderMaterial).uniforms.t.value = t; for (const c of this.clouds.children) { c.position.x += (c.userData.v as number) * dt; if (c.position.x > 1000) c.position.x = -1000; } }
  dispose() { this.scene.remove(this.group); this.scene.remove(this.sky); for (const o of this.skyObjs) this.scene.remove(o); }
}
let ctex: THREE.Texture | null = null;
function cloudTexture() { if (ctex) return ctex; const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d')!; const R = rng(3);
  for (let i = 0; i < 14; i++) { const x = 20 + R() * 88, y = 22 + R() * 22, r = 10 + R() * 18; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  ctex = new THREE.CanvasTexture(c); ctex.colorSpace = THREE.SRGBColorSpace; return ctex; }
