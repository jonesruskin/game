// A world's environment: the ground the base stands on (flat where you build, rolling to the horizon beyond),
// water, scattered flora and rocks, the sky dome (gradient, sun, celestial bodies), clouds, fog and light.
// Each world is a config; Part 1 dresses Earth, later parts add the Moon, Mars, Venus and beyond.
import * as THREE from 'three';
import { GRID } from '../data/buildings';
import { rng, hash } from '../core/util';
import { STARS, PTYPE, CLASS } from '../data/stars';
import { earthGlobe } from './planet';
export interface WorldLook {
  id: string; ground: string[]; base: string; rim: string; rock: string; sky: [string, string, string]; fog: string; fogNear: number; fogFar: number;
  sun: string; sunI: number; amb: [string, string, number]; sea?: string; seaSide?: number; hills: number; flora?: 'trees' | 'rocks' | 'none'; clouds?: string; cloudN?: number;
  stars?: number; craters?: number; skyBody?: 'earth' | 'phobos' | 'saturn' | 'belt'; baseGround?: string;
  deck?: boolean; cloudFloor?: string; gap?: number; trees?: number; lakes?: number; curve?: number; green?: number; dust?: number; salt?: number; ponds?: number; island?: boolean; sunPow?: number; craterN?: number;
}
export const WORLDS: Record<string, WorldLook> = {
  earth: { id: 'earth', ground: ['#4a8f3e', '#5ea34a', '#3a7a36', '#6cad52'], base: '#5aa648', rim: '#c9b98c', rock: '#8a8478', sky: ['#2f6fd0', '#8fc3f2', '#e8f2ff'], fog: '#cfe2f6', fogNear: 90, fogFar: 420,
    sun: '#fff1d6', sunI: 2.4, amb: ['#bcd8ff', '#3b5a34', 0.75], sea: '#2a78b8', seaSide: 1, hills: 9, flora: 'trees', clouds: '#ffffff', cloudN: 26, stars: 0 },
  moon: { id: 'moon', ground: ['#86868a', '#97979b', '#727276', '#a4a4a8'], base: '#9a9a9e', rim: '#9a9a9e', rock: '#66666a', sky: ['#000000', '#010204', '#05060b'], fog: '#05060b', fogNear: 500, fogFar: 2600,
    sun: '#ffffff', sunI: 3.1, amb: ['#8a9bb5', '#2a2a2e', 0.32], hills: 5, flora: 'rocks', stars: 1, craters: 70, skyBody: 'earth' },
  mars: { id: 'mars', ground: ['#b4643a', '#c27447', '#9e5532', '#cc8656'], base: '#bd7247', rim: '#c98a5e', rock: '#8a4a2e', sky: ['#a8724c', '#d2a074', '#ecc8a0'], fog: '#dcae86', fogNear: 80, fogFar: 420,
    sun: '#fff1e0', sunI: 2.3, amb: ['#e8c4a0', '#5a3a2a', 0.62], hills: 8, flora: 'rocks', stars: 0, craters: 26, skyBody: 'phobos', dust: 1 },
  // Ceres: dark carbon-rich rock and bright salt, a horizon that drops away fast, the belt strung across a black sky
  ceres: { id: 'ceres', ground: ['#57534e', '#615c56', '#4a4642', '#6a655e'], base: '#5e5a54', rim: '#5e5a54', rock: '#3e3b38', sky: ['#000000', '#010203', '#04050a'], fog: '#04050a', fogNear: 400, fogFar: 2400,
    sun: '#ffffff', sunI: 2.4, amb: ['#8a93a8', '#222226', 0.34], hills: 3, flora: 'rocks', stars: 1.2, craters: 60, skyBody: 'belt', curve: 0.0028, salt: 1 },
  // Titan: orange haze, a shore of liquid methane, water-ice pebbles, Saturn a ghost through the smog
  titan: { id: 'titan', ground: ['#6e5232', '#7a5c38', '#5e4428', '#86683f'], base: '#735634', rim: '#4a3620', rock: '#b8a48a', sky: ['#7a3e10', '#b8702a', '#d89a4c'], fog: '#c08440', fogNear: 40, fogFar: 260,
    sun: '#ffbd70', sunI: 1.45, amb: ['#e8aa5c', '#4a3018', 1.1], sea: '#2a1a0c', seaSide: 1, hills: 4, flora: 'rocks', stars: 0, craters: 4, skyBody: 'saturn' },
  // Venus: no ground at all. The city is a deck on its envelopes, 50 km up, over an endless sea of yellow cloud
  venus: { id: 'venus', ground: ['#e8e2d2'], base: '#e4ddcb', rim: '#e4ddcb', rock: '#c9c2b0', sky: ['#b8792a', '#e2b05c', '#f4d898'], fog: '#efcf8c', fogNear: 120, fogFar: 900,
    sun: '#fff4d0', sunI: 2.9, amb: ['#ffe2a8', '#a07a3a', 0.85], hills: 0, flora: 'none', clouds: '#fff0c4', cloudN: 14, stars: 0, deck: true, cloudFloor: '#f0cc6e', gap: 0 },
};
const mix = (a: string, b: string, k: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, k))).getHexString();
const sstep = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b);
// a world part-way through terraforming: the same place, with thicker air, bluer sky, clouds, lakes, then seas, lichen and forests
// an exoplanet: its look comes from the planet type and its star (a red dwarf paints the sky orange-pink and hangs a big
// red sun; ocean worlds put the colony on an island; lava worlds glow; giants get a cloud-top deck)
export function exoLook(key: string): WorldLook {
  const [st, ps] = key.split(':'); const S = STARS[st], pl = S && S.planets[+ps]; if (!pl) return WORLDS.earth; const T = PTYPE[pl.type]; const sc = CLASS[S.cls].col; const [c0, c1, c2] = T.col; const R = rng(hash(key));
  const sunPow = ({ M: 110, K: 300, G: 900, F: 1200, A: 1600, D: 2000 } as Record<string, number>)[S.cls] || 900; const sunI = ({ M: 1.9, K: 2.2, G: 2.4, F: 2.6, A: 2.8, D: 1.6 } as Record<string, number>)[S.cls] || 2.3;
  const sun = mix('#ffffff', sc, 0.75); const g4 = (a: string, b: string) => [mix(a, b, 0.2), mix(a, b, 0.5), mix(a, '#000000', 0.15), mix(b, '#ffffff', 0.12)];
  const L: WorldLook = { id: key, ground: g4(c0, c1), base: mix(c1, '#9a968e', 0.35), rim: c2, rock: mix(c0, '#000000', 0.25), sky: [mix('#05060b', sc, 0.08), mix('#0a0c14', sc, 0.12), mix('#1a1c26', sc, 0.25)], fog: mix('#10121a', sc, 0.25), fogNear: 300, fogFar: 2200,
    sun, sunI, amb: [mix('#a8b8d0', sc, 0.4), mix(c0, '#000000', 0.5), 0.45], hills: 6, flora: 'rocks', stars: 1, craters: 30, sunPow, craterN: 20 };
  const airSky = (k = 0.35): [string, string, string] => [mix('#2f6fd0', sc, k), mix('#8fc3f2', sc, k * 0.85), mix('#e8f2ff', sc, k * 0.7)];
  switch (pl.type) {
    case 'temperate': Object.assign(L, { ground: g4(c1, '#5ea34a'), base: mix(c1, '#6a9a50', 0.4), rim: c2, sky: airSky(), fog: mix('#cfe2f6', sc, 0.3), fogNear: 90, fogFar: 420, amb: [mix('#bcd8ff', sc, 0.3), '#3b5a34', 0.72], sea: c0, seaSide: 1, hills: 9, flora: pl.hab >= 0.5 ? 'trees' : 'rocks', clouds: '#ffffff', cloudN: 20, stars: 0, craters: 0, craterN: 2 }); break;
    case 'ocean': Object.assign(L, { ground: g4('#c9b88a', '#5f9a4c'), base: '#9aa070', rim: '#e8dcb8', sky: airSky(0.3), fog: mix('#d8ecfb', sc, 0.3), fogNear: 90, fogFar: 420, amb: [mix('#bcd8ff', sc, 0.3), '#2a4a5a', 0.72], sea: c1, seaSide: 1, island: true, hills: 5, flora: pl.hab >= 0.55 ? 'trees' : 'rocks', clouds: '#ffffff', cloudN: 24, stars: 0, craters: 0, craterN: 0 }); break;
    case 'desert': Object.assign(L, { ground: g4(c0, c1), base: c1, rim: c2, sky: [mix('#9a7a5a', sc, 0.3), mix('#d6b080', sc, 0.25), mix('#f0dcb8', sc, 0.2)], fog: mix('#e8c89a', sc, 0.25), fogNear: 80, fogFar: 420, amb: [mix('#f0d0a8', sc, 0.3), '#5a3e2a', 0.65], hills: 11, stars: 0, craters: 8, dust: 0.8, craterN: 6 }); break;
    case 'super': Object.assign(L, { sky: [mix('#5a6a7a', sc, 0.3), mix('#9aa4ac', sc, 0.25), mix('#c9ccc4', sc, 0.2)], fog: mix('#a8aca4', sc, 0.2), fogNear: 50, fogFar: 300, amb: [mix('#c4ccd4', sc, 0.3), '#3a3a30', 0.75], hills: 4, stars: 0, craters: 6, craterN: 5 }); break;
    case 'ice': Object.assign(L, { ground: g4(c1, c2), base: mix(c1, '#c9d6e0', 0.4), rim: '#ffffff', rock: '#cfe2f0', sky: [mix('#3a5a7a', sc, 0.25), mix('#9fc0d8', sc, 0.2), mix('#e6f0f8', sc, 0.15)], fog: mix('#dceaf4', sc, 0.2), fogNear: 90, fogFar: 500, amb: [mix('#d6e6ff', sc, 0.25), '#5a6a7a', 0.7], hills: 7, stars: 0.4, craters: 10, craterN: 8 }); break;
    case 'lava': Object.assign(L, { ground: g4(c0, '#3a2a24'), base: '#3a3030', rim: '#1a1210', rock: '#1a1412', sky: [mix('#140604', sc, 0.1), mix('#3a120a', sc, 0.15), mix('#8a2e12', sc, 0.2)], fog: '#5a1e0e', fogNear: 60, fogFar: 340, amb: [mix('#ff8a4a', sc, 0.2), '#2a0e08', 0.7], sea: '#ff6a1a', seaSide: 1, hills: 8, stars: 0.3, craters: 6, craterN: 4 }); break;
    case 'belt': Object.assign(L, { skyBody: 'belt', curve: 0.0028, craters: 70, craterN: 40, salt: R() < 0.5 ? 1 : 0 }); break;
    case 'dwarf': Object.assign(L, { ground: g4('#3a3448', '#5a5470'), base: '#4a4458', rock: '#2a2438', sky: ['#020108', '#06040e', mix('#140c24', sc, 0.4)], amb: ['#9a8ac8', '#1a1428', 0.4], stars: 1.6, craters: 50, craterN: 30 }); break;
    case 'rocky': default: if (!T.giant) Object.assign(L, { craters: 50, craterN: 32 });
  }
  if (T.giant) Object.assign(L, { deck: true, ground: ['#d8d2c2'], base: '#d8d2c4', rim: '#d8d2c4', rock: '#b9b2a0', sky: [mix(c2, '#000010', 0.55), mix(c0, '#202030', 0.25), mix(c1, '#ffffff', 0.2)], fog: mix(c1, '#ffffff', 0.15), fogNear: 120, fogFar: 900, amb: [mix(c1, '#ffffff', 0.3), mix(c0, '#000000', 0.4), 0.85], hills: 0, flora: 'none', clouds: mix(c1, '#ffffff', 0.5), cloudN: 12, stars: 0, cloudFloor: c0, gap: 0, craters: 0 });
  return L;
}
export function terraLook(base: WorldLook, T?: Record<string, number> | null): WorldLook {
  if (!T || !T.n) return base; const L: WorldLook = JSON.parse(JSON.stringify(base)); const o2 = T.o2 || 0, water = T.water || 0, p = T.pressure || 0;
  const blue: [string, string, string] = ['#3f78c8', '#9cc4ec', '#e6eef8'];
  if (base.id === 'mars') {
    const kAir = sstep(0.02, 0.7, p), kLich = Math.min(1, o2 / 3), kGreen = Math.min(1, o2 / 14), kSky = Math.min(1, kAir * 0.85 + kGreen * 0.15);
    L.sky = base.sky.map((c, i) => mix(c, blue[i], kSky)) as [string, string, string]; L.fog = mix(base.fog, '#d8e6f4', kSky); L.fogNear = 80 + kSky * 20; L.amb = [mix(base.amb[0], '#bcd8ff', kSky), mix(base.amb[1], '#3b5a34', kGreen), base.amb[2] + kSky * 0.1]; L.sun = mix(base.sun, '#fff1d6', kSky);
    if (p >= 0.2) { L.clouds = '#ffffff'; L.cloudN = Math.round(6 + 20 * kAir); }
    const lich = ['#7d7550', '#8a8458', '#6e6a48', '#969060'], grn = ['#5a8a3e', '#6a9a48', '#4a7a36', '#78a852'];
    const kWet = Math.min(1, water / 25), kWarm = sstep(-63, -15, T.temp ?? -63); L.amb[2] = base.amb[2] + kSky * 0.3; L.sunI = base.sunI + kWarm * 0.25;
    L.ground = base.ground.map((c, i) => mix(mix(mix(c, '#8a4a30', kWet * 0.4), lich[i], kLich * 0.55), grn[i], kGreen * 0.75)); L.base = mix(mix(mix(base.base, '#9a5a3a', kWet * 0.3), '#8a8458', kLich * 0.35), '#7a8a52', kGreen * 0.4); L.rim = mix(base.rim, '#d8c8a0', kAir);
    if (water > 0) { L.sea = '#2f6aa0'; if (water >= 22) L.seaSide = 1; else L.lakes = -2.6 + (water / 22) * 1.6; L.ponds = water >= 22 ? 6 : 3; }
    L.trees = kGreen > 0.1 ? kGreen : 0; L.green = kLich; L.dust = 1 - kAir;
  }
  // a star colony being terraformed: a sky that turns blue and fills with cloud, seas, lichen, then forests
  if (T.exo) {
    const kAir = sstep(0.05, 0.9, p), kLich = Math.min(1, o2 / 4), kGreen = Math.min(1, o2 / 14), kWet = Math.min(1, water / 24), lerp = (a: number, b: number, k: number) => a + (b - a) * k;
    L.sky = base.sky.map((c, i) => mix(c, blue[i], kAir * 0.92)) as [string, string, string]; L.fog = mix(base.fog, '#d8e6f4', kAir * 0.9); L.fogNear = lerp(base.fogNear, 90, kAir); L.fogFar = lerp(base.fogFar, 420, kAir);
    L.amb = [mix(base.amb[0], '#bcd8ff', kAir), mix(base.amb[1], '#3b5a34', kGreen), base.amb[2] + kAir * 0.3]; L.stars = (base.stars || 0) * (1 - kAir); L.craters = (base.craters || 0) * (1 - kWet * 0.8); L.craterN = Math.round((base.craterN || 0) * (1 - kAir));
    if (p >= 0.3) { L.clouds = '#ffffff'; L.cloudN = Math.round(6 + 18 * kAir); }
    const lich = ['#7d7550', '#8a8458', '#6e6a48', '#969060'], grn = ['#5a8a3e', '#6a9a48', '#4a7a36', '#78a852'];
    L.ground = base.ground.map((c, i) => mix(mix(mix(c, '#6a5a48', kWet * 0.3), lich[i], kLich * 0.5), grn[i], kGreen * 0.8)); L.base = mix(mix(base.base, '#8a8458', kLich * 0.3), '#7a8a52', kGreen * 0.45);
    if (water > 0) { L.sea = '#2f6aa0'; if (water >= 22) L.seaSide = 1; else L.lakes = -2.6 + (water / 22) * 1.6; L.ponds = water >= 22 ? 6 : 3; }
    if (kGreen > 0.3) { L.flora = 'trees'; L.trees = kGreen; } L.green = kLich; L.dust = 1 - kAir;
  }
  if (base.id === 'venus') {
    const cool = 1 - sstep(30, 464, T.temp ?? 464), kO2 = Math.min(1, o2 / 15);
    L.sky = base.sky.map((c, i) => mix(c, blue[i], kO2 * 0.85 + cool * 0.1)) as [string, string, string]; L.fog = mix(base.fog, '#e2ecf6', kO2 * 0.8 + cool * 0.1); L.amb = [mix(base.amb[0], '#d8e6ff', kO2), base.amb[1], base.amb[2]];
    L.cloudFloor = mix(mix(base.cloudFloor!, '#efe6cf', cool * 0.6), '#f6f8fb', Math.min(1, o2 / 5)); L.clouds = mix(base.clouds!, '#ffffff', cool); L.gap = sstep(10, 26, water);
  }
  return L;
}
const C = GRID / 2;
// smooth value noise
function noise2(seed: number) { const R = rng(seed); const P = new Float32Array(256 * 256).map(() => R()); const f = (x: number, z: number) => { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi; const h = (a: number, b: number) => P[((a & 255) << 8) | (b & 255)]; const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return (h(xi, zi) * (1 - u) + h(xi + 1, zi) * u) * (1 - v) + (h(xi, zi + 1) * (1 - u) + h(xi + 1, zi + 1) * u) * v; }; return (x: number, z: number) => f(x, z) * 0.55 + f(x * 2.1 + 7, z * 2.1 + 3) * 0.3 + f(x * 4.3 + 1, z * 4.3 + 9) * 0.15; }
export class Env {
  group = new THREE.Group(); sky: THREE.Mesh; private clouds: THREE.Group = new THREE.Group(); private water: THREE.Mesh | null = null; private grid: THREE.LineSegments | null = null; private bound: THREE.Mesh | null = null; look: WorldLook;
  height: (x: number, z: number) => number = () => 0;
  constructor(private scene: THREE.Scene, id: string, private quality: 'high' | 'low', private renderer?: THREE.WebGLRenderer, terra?: Record<string, number> | null) { this.look = terraLook(WORLDS[id] || (id.includes(':') ? exoLook(id) : WORLDS.earth), terra); this.sky = this.makeSky(); this.build(); this.skyBodies(); this.scene.add(this.sats); }
  private skyObjs: THREE.Object3D[] = [];
  private skyBodies() { const L = this.look; const sun = new THREE.Vector3(-0.55, 0.62, 0.42).normalize();
    if (L.skyBody === 'earth' && this.renderer) { const e = earthGlobe(this.renderer, 70, sun, this.quality === 'high'); e.group.position.set(-620, 420, -1500); e.mesh.rotation.z = 0.4; this.scene.add(e.group); this.skyObjs.push(e.group); this.earthSky = e; }
    if (L.skyBody === 'saturn') { const g = new THREE.Group(); const m = (c: string, o: number) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, fog: false, depthWrite: false });
      g.add(new THREE.Mesh(new THREE.SphereGeometry(70, 32, 16), m('#f2dca8', 0.42))); const ring = new THREE.Mesh(new THREE.RingGeometry(95, 165, 64), m('#f6e6c0', 0.3)); ring.material.side = THREE.DoubleSide; ring.rotation.x = Math.PI / 2.3; g.add(ring);
      g.position.set(-520, 700, -1400); g.rotation.z = 0.35; this.scene.add(g); this.skyObjs.push(g); }
    if (L.skyBody === 'belt') { const R = rng(17), n = this.quality === 'high' ? 2600 : 1400, pos = new Float32Array(n * 3); const ax = new THREE.Vector3(0.3, 0.2, 1).normalize(), u = new THREE.Vector3(1, 0.35, -0.3).normalize(), v = ax.clone().cross(u).normalize();
      for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, w = (R() + R() + R() - 1.5) * 0.09; const d = u.clone().multiplyScalar(Math.cos(a)).add(v.clone().multiplyScalar(Math.sin(a))).add(ax.clone().multiplyScalar(w)).normalize().multiplyScalar(2400); pos.set([d.x, d.y, d.z], i * 3); }
      const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const pts = new THREE.Points(bg, new THREE.PointsMaterial({ color: '#c8bca8', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85, depthWrite: false })); this.scene.add(pts); this.skyObjs.push(pts); }
    if (L.skyBody === 'phobos') { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(18, 1), new THREE.MeshStandardMaterial({ color: '#6e6660', flatShading: true, roughness: 1, fog: false })); p.scale.set(1.3, 1, 1); p.position.set(-500, 520, -1300); this.scene.add(p); this.skyObjs.push(p); } }
  private earthSky: ReturnType<typeof earthGlobe> | null = null;
  private makeSky() {
    const L = this.look; const g = new THREE.SphereGeometry(3000, 32, 16);
    const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: new THREE.Color(L.sky[0]) }, mid: { value: new THREE.Color(L.sky[1]) }, hor: { value: new THREE.Color(L.sky[2]) }, sunDir: { value: new THREE.Vector3(-0.55, 0.62, 0.42).normalize() }, sunCol: { value: new THREE.Color(L.sun) }, stars: { value: L.stars || 0 }, sunPow: { value: L.sunPow || 900 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top, mid, hor, sunCol, sunDir; uniform float stars, sunPow; varying vec3 vP;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
        void main(){ float y = vP.y; vec3 c = y > 0.18 ? mix(mid, top, smoothstep(0.18, 0.75, y)) : mix(hor, mid, smoothstep(-0.02, 0.18, y));
          float sd = max(dot(vP, sunDir), 0.0); c += sunCol * (pow(sd, sunPow) * 3.0 + pow(sd, 18.0) * 0.18 * (900.0 / sunPow > 2.0 ? 2.0 : 1.0));
          if (stars > 0.0) { vec3 q = floor(vP * 420.0); float s = step(0.9975, h(q)); c += vec3(s) * stars * smoothstep(0.0, 0.2, y); }
          gl_FragColor = vec4(c, 1.0); }` });
    const s = new THREE.Mesh(g, m); s.renderOrder = -10; s.frustumCulled = false; this.scene.add(s); return s;
  }
  private build() {
    const L = this.look; if (L.deck) { this.buildDeck(); return; } const seed = [...L.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 997; const n = noise2(L.id === 'earth' ? 77 : L.id === 'moon' ? 41 : seed); const R = rng(5); const span = 520, seg = this.quality === 'high' ? 200 : 140;
    // craters: bowls with raised rims, scattered beyond the base
    const CR: [number, number, number][] = []; const RC = rng(seed * 13 + 11); for (let i = 0; i < (L.craters || 0); i++) { const a = RC() * Math.PI * 2, d = C + 14 + RC() * 230, r = 3 + Math.pow(RC(), 2) * 26; CR.push([Math.cos(a) * d, Math.sin(a) * d, r]); }
    const crater = (x: number, z: number) => { let h = 0; for (const [cx, cz, r] of CR) { const dx = x - cx, dz = z - cz; const d2 = dx * dx + dz * dz; if (d2 > r * r * 2.6) continue; const d = Math.sqrt(d2); if (d < r) h -= r * 0.22 * (1 - (d / r) * (d / r)); h += r * 0.1 * Math.exp(-Math.pow((d - r) / (0.2 * r), 2)); } return h; };
    // terrain: flat inside the base (with a margin), rising into hills beyond; the sea on one side
    const sea = (x: number, z: number) => (L.seaSide ? (x + z) / Math.SQRT2 : 99999); // signed distance toward the shore (−x −z side is sea)
    this.height = (x: number, z: number) => { const r = Math.max(Math.abs(x), Math.abs(z)); const flat = THREE.MathUtils.smoothstep(r, C + 4, C + 30);
      let h = flat * (n(x * 0.018, z * 0.018) * L.hills * 2.2 + n(x * 0.06, z * 0.06) * 2.2 - 1.2) + flat * Math.max(0, r - 90) * 0.06;
      if (L.island) h = Math.min(h, THREE.MathUtils.lerp(h, -6, THREE.MathUtils.smoothstep(Math.hypot(x, z) + (n(x * 0.035 + 4, z * 0.035) - 0.5) * 16, C + 6, C + 18))); // an island in an open sea, with a ragged coast clear of the buildable square
      if (L.seaSide) { const d = sea(x, z); h = Math.min(h, THREE.MathUtils.lerp(-6, h, THREE.MathUtils.smoothstep(d, -C - 34, -C - 12))); } if (CR.length) h += crater(x, z) * THREE.MathUtils.smoothstep(r, C + 6, C + 16); if (L.curve) h -= Math.pow(Math.max(0, r - C - 24), 2) * L.curve; return h; };
    const g = new THREE.PlaneGeometry(span, span, seg, seg); g.rotateX(-Math.PI / 2); const p = g.attributes.position; const col = new Float32Array(p.count * 3); const c = new THREE.Color(), cg = L.ground.map((x) => new THREE.Color(x)), cb = new THREE.Color(L.base), cr = new THREE.Color(L.rim), ck = new THREE.Color(L.rock);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const y = this.height(x, z); p.setY(i, y); const r = Math.max(Math.abs(x), Math.abs(z));
      const k = n(x * 0.09 + 3, z * 0.09); c.copy(cg[0]).lerp(cg[1], k).lerp(cg[2], n(x * 0.03, z * 0.03 + 5) * 0.8);
      if (r < C + 2) { c.lerp(cb, 0.6); if (L.id === 'earth') { const st = Math.floor((x + z + 400) / 2) % 2; c.offsetHSL(0, 0, st ? 0.025 : -0.015); } } // a mown field with stripes on Earth, packed regolith elsewhere
      if (y > L.hills * 1.4) c.lerp(ck, THREE.MathUtils.smoothstep(y, L.hills * 1.4, L.hills * 2.6));
      if (L.seaSide) { const d = sea(x, z); if (d < -C - 8 && y < 1.2) c.lerp(cr, THREE.MathUtils.smoothstep(-d, C + 8, C + 16) * THREE.MathUtils.smoothstep(-y, -1.2, 0.2)); } col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true })); ground.receiveShadow = true; ground.name = 'ground'; this.group.add(ground); this.detail();
    if (L.sea && (L.seaSide || L.lakes !== undefined)) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.ShaderMaterial({ transparent: true, fog: true, uniforms: { t: { value: 0 }, col: { value: new THREE.Color(L.sea) }, deep: { value: new THREE.Color(L.sea).multiplyScalar(0.5) }, sky: { value: new THREE.Color(L.sky[2]) }, sunDir: { value: new THREE.Vector3(-0.55, 0.62, 0.42).normalize() }, ...THREE.UniformsLib.fog },
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
      w.rotation.x = -Math.PI / 2; w.position.y = L.seaSide ? -0.4 : (L.lakes ?? -0.4); this.water = w; this.group.add(w);
      // ponds and meres just beyond the colony (a terraformed world's first open water, where you can see it)
      if (L.ponds) { const RP = rng(77); for (let i = 0; i < L.ponds; i++) { const big = L.seaSide ? 1.5 : 1; const r0 = (1.6 + RP() * 2.2) * big; let x = 0, z = 0; for (let k = 0; k < 20; k++) { const a = RP() * Math.PI * 2, d = 23.5 + r0 + RP() * (6 - r0 * 0.5); x = Math.cos(a) * d; z = Math.sin(a) * d; if (Math.max(Math.abs(x), Math.abs(z)) > 21 + r0) break; }
        const sh = new THREE.Shape(), rim = new THREE.Shape(); for (let k = 0; k <= 20; k++) { const a = (k / 20) * Math.PI * 2, j = 0.75 + 0.5 * n(Math.cos(a) * 2 + i * 7, Math.sin(a) * 2); const px = Math.cos(a) * r0 * j, pz = Math.sin(a) * r0 * j; if (k) { sh.lineTo(px, pz); rim.lineTo(px * 1.25, pz * 1.25); } else { sh.moveTo(px, pz); rim.moveTo(px * 1.25, pz * 1.25); } }
        const y = this.height(x, z); const rm = new THREE.Mesh(new THREE.ShapeGeometry(rim), new THREE.MeshStandardMaterial({ color: mix(L.base, '#3a2414', 0.45), roughness: 1 })); rm.rotation.x = -Math.PI / 2; rm.position.set(x, y + 0.05, z); rm.receiveShadow = true; this.group.add(rm);
        const pm = new THREE.Mesh(new THREE.ShapeGeometry(sh), w.material); pm.rotation.x = -Math.PI / 2; pm.position.set(x, y + 0.14, z); pm.renderOrder = 2; this.group.add(pm); } } }
    // trees and rocks outside the base (instanced)
    if (L.flora === 'rocks') { const pos: THREE.Matrix4[] = []; const q = new THREE.Quaternion();
      for (let i = 0; i < (this.quality === 'high' ? 900 : 450); i++) { const x = (R() - 0.5) * 380, z = (R() - 0.5) * 380; const r = Math.max(Math.abs(x), Math.abs(z)); if (r < C + 3) continue; const y = this.height(x, z); const s = 0.25 + Math.pow(R(), 3) * 2.4;
        q.setFromEuler(new THREE.Euler(R() * 3, R() * 6, R() * 3)); pos.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y + s * 0.2, z), q, new THREE.Vector3(s, s * (0.5 + R() * 0.4), s * (0.8 + R() * 0.4)))); }
      const m = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.6, 0), new THREE.MeshStandardMaterial({ color: L.rock, flatShading: true, roughness: 1 }), pos.length); pos.forEach((mm, i) => m.setMatrixAt(i, mm)); m.castShadow = true; m.receiveShadow = true; this.group.add(m); }
    if (L.flora === 'trees' || L.trees) { const pos: THREE.Matrix4[] = []; const q = new THREE.Quaternion(); const thr = L.flora === 'trees' ? 0.42 : 0.42 + (1 - (L.trees || 0)) * 0.22; const wl = L.seaSide ? -0.4 : (L.lakes ?? -0.4); const rin = L.id === 'earth' ? C + 5 : 23, ymin = L.id === 'earth' ? 0.5 : wl + 0.3, young = L.id === 'earth' ? 1 : 0.65;
      for (let i = 0; i < (this.quality === 'high' ? 1400 : 700); i++) { const x = (R() - 0.5) * 360, z = (R() - 0.5) * 360; const r = Math.max(Math.abs(x), Math.abs(z)); if (r < rin) continue; const y = this.height(x, z); if (y < ymin || y > L.hills * 2) continue; if (n(x * 0.05 + 9, z * 0.05) < thr) continue;
        const s = (0.7 + R() * 0.9) * young; q.setFromEuler(new THREE.Euler(0, R() * 6, 0)); pos.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s * (0.9 + R() * 0.5), s))); }
      const trunk = new THREE.CylinderGeometry(0.1, 0.14, 0.8, 5); trunk.translate(0, 0.4, 0); const crown = new THREE.ConeGeometry(0.75, 1.9, 7); crown.translate(0, 1.6, 0); const crown2 = new THREE.ConeGeometry(0.55, 1.3, 7); crown2.translate(0, 2.4, 0);
      for (const [geo, color] of [[trunk, '#6b4a2e'], [crown, '#2f6b34'], [crown2, '#3a7d3c']] as const) { const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 }), pos.length); pos.forEach((mm, i) => m.setMatrixAt(i, mm)); m.castShadow = color !== '#6b4a2e'; m.receiveShadow = true; this.group.add(m); } }
    // lichen, moss and grass tufts creeping in around a terraformed colony
    if (L.green && L.id !== 'earth') { const pos: THREE.Matrix4[] = []; const q = new THREE.Quaternion(); const RG = rng(41); const nT = Math.round((this.quality === 'high' ? 700 : 350) * L.green);
      for (let i = 0; i < nT; i++) { const a = RG() * Math.PI * 2, d = 21 + Math.pow(RG(), 0.7) * 60; const x = Math.cos(a) * d, z = Math.sin(a) * d; if (Math.max(Math.abs(x), Math.abs(z)) < 21) continue; const y = this.height(x, z); if (L.lakes !== undefined && y < L.lakes + 0.2) continue; const s = 0.3 + RG() * 0.5; q.setFromEuler(new THREE.Euler(0, RG() * 6, 0)); pos.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s * (0.6 + RG() * 0.8), s))); }
      const geo = new THREE.ConeGeometry(0.35, 0.6, 5); geo.translate(0, 0.3, 0); const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: (L.trees || 0) > 0.5 ? '#5f9a44' : '#7f8a5a', flatShading: true, roughness: 1 }), pos.length); pos.forEach((mm, i) => m.setMatrixAt(i, mm)); m.receiveShadow = true; this.group.add(m); }
    // clouds: flat soft puffs drifting high above
    if (L.clouds) { const tex = cloudTexture(); for (let i = 0; i < (L.cloudN || 0); i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: L.clouds, transparent: true, opacity: 0.75, depthWrite: false, fog: false }));
        const a = R() * Math.PI * 2, d = 120 + R() * 900; sp.position.set(Math.cos(a) * d, 60 + R() * 70, Math.sin(a) * d); const s = 60 + R() * 110; sp.scale.set(s, s * 0.38, 1); sp.userData.v = 0.6 + R() * 1.2; this.clouds.add(sp); } this.group.add(this.clouds); }
    this.scene.add(this.group);
  }
  // Venus: the city deck (an octagon wide enough for the whole grid) on its lifting envelopes, guard rails, distant
  // aerostats, and two layers of cloud far below. As Venus is terraformed the clouds whiten and part over blue seas.
  private buildDeck() {
    const L = this.look; const R = rng(23); this.height = () => 0; const D = 29;
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(D, D - 1.5, 1.4, 8), new THREE.MeshStandardMaterial({ color: L.base, roughness: 0.8, metalness: 0.15, flatShading: true })); deck.position.y = -0.7; deck.receiveShadow = true; deck.name = 'ground'; this.group.add(deck);
    const under = new THREE.Mesh(new THREE.CylinderGeometry(D - 1.5, D - 6, 2.2, 8), new THREE.MeshStandardMaterial({ color: '#8f8a7e', roughness: 0.9, flatShading: true })); under.position.y = -2.5; this.group.add(under);
    const rail = new THREE.Mesh(new THREE.TorusGeometry(D - 0.4, 0.09, 4, 8), new THREE.MeshStandardMaterial({ color: '#f4f1e8', metalness: 0.4, roughness: 0.4 })); rail.rotation.x = Math.PI / 2; rail.rotation.z = Math.PI / 8 * 0; rail.position.y = 0.9; this.group.add(rail);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; for (let k = 0; k < 7; k++) { const f = k / 7; const a2 = a + (Math.PI / 4) * f; const p = new THREE.Vector3(Math.cos(a) * (D - 0.4), 0, Math.sin(a) * (D - 0.4)).lerp(new THREE.Vector3(Math.cos(a + Math.PI / 4) * (D - 0.4), 0, Math.sin(a + Math.PI / 4) * (D - 0.4)), f); void a2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 4), rail.material); post.position.set(p.x, 0.45, p.z); this.group.add(post); } }
    // the lifting envelopes: breathable air is a lifting gas in Venus's heavy CO₂
    const env = new THREE.MeshStandardMaterial({ color: '#f3f1ea', roughness: 0.28, metalness: 0.18 }), strap = new THREE.MeshStandardMaterial({ color: '#b9b2a0', roughness: 0.6, metalness: 0.3 });
    const cell = (r: number, x: number, y: number, z: number, sy: number) => { const g = new THREE.Group(); const e = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), env); e.scale.set(1, sy, 1); g.add(e); for (const k of [-0.45, 0, 0.45]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r * Math.sqrt(1 - k * k) * 1.005, r * 0.025, 4, 32), strap); t.rotation.x = Math.PI / 2; t.position.y = k * r * sy; g.add(t); } for (let m = 0; m < 6; m++) { const t = new THREE.Mesh(new THREE.TorusGeometry(r * 1.005, r * 0.02, 4, 32, Math.PI), strap); t.scale.set(1, sy, 1); t.rotation.y = (m / 6) * Math.PI; g.add(t); } g.position.set(x, y, z); this.group.add(g); };
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.2; cell(7.2, Math.cos(a) * 24, -7, Math.sin(a) * 24, 0.62); } cell(15, 0, -9, 0, 0.5);
    // a promenade of planters and lamps around the rim
    const pl = new THREE.MeshStandardMaterial({ color: '#5fae54', flatShading: true, roughness: 0.9 }), lamp = new THREE.MeshBasicMaterial({ color: '#ffe7a8', toneMapped: false }); for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; const rr = (D - 2.2) * Math.cos(Math.PI / 8) / Math.cos(((a % (Math.PI / 4)) - Math.PI / 8)); const x = Math.cos(a) * rr, z = Math.sin(a) * rr; if (i % 3) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), pl); b.position.set(x, 0.4, z); b.scale.set(1, 0.8, 1); this.group.add(b); } else { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 4), rail.material); p.position.set(x, 0.7, z); this.group.add(p); const l = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 4), lamp); l.position.set(x, 1.45, z); this.group.add(l); } }
    // distant aerostats drifting in the haze
    const far = new THREE.Group(); for (let i = 0; i < 12; i++) { const g = new THREE.Group(); const s = 2 + R() * 4; const b = new THREE.Mesh(new THREE.SphereGeometry(s, 14, 10), env); b.scale.set(1, 0.7, 1); g.add(b); const d = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.9, s * 0.8, s * 0.25, 8), new THREE.MeshStandardMaterial({ color: '#d8d2c2', flatShading: true })); d.position.y = s * 0.85; g.add(d);
      const a = R() * Math.PI * 2, dist = 160 + R() * 520; g.position.set(Math.cos(a) * dist, -20 + R() * 50, Math.sin(a) * dist); g.userData.ph = R() * 6; far.add(g); } this.group.add(far); this.drift = far;
    // the cloud sea: two noisy layers far below (shader), scrolling at different speeds
    const cloudMat = (y: number, o: number, sc: number) => new THREE.ShaderMaterial({ transparent: true, fog: true, depthWrite: false, uniforms: { t: { value: 0 }, col: { value: new THREE.Color(L.cloudFloor) }, sea: { value: new THREE.Color('#2a6aa8') }, gap: { value: L.gap || 0 }, op: { value: o }, sc: { value: sc }, ...THREE.UniformsLib.fog },
      vertexShader: '#include <fog_pars_vertex>\nvarying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
      fragmentShader: `#include <fog_pars_fragment>
        uniform float t, gap, op, sc; uniform vec3 col, sea; varying vec3 vW;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * n(p); p *= 2.07; a *= 0.5; } return s; }
        void main(){ vec2 q = vW.xz * sc + vec2(t * 0.006, t * 0.0025); float c = fbm(q) * 0.7 + fbm(q * 3.1 + 5.0) * 0.3; vec3 k = col * (0.72 + c * 0.5);
          float hole = smoothstep(0.62 - gap * 0.3, 0.5 - gap * 0.3, c) * gap; vec3 o = mix(k, sea * (0.8 + c * 0.3), hole); gl_FragColor = vec4(o, op * (1.0 - hole * 0.15));
        #include <fog_fragment>
        }` });
    const c1 = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), cloudMat(-34, 1, 0.012)); c1.rotation.x = -Math.PI / 2; c1.position.y = -34; this.group.add(c1);
    const c2 = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), cloudMat(-22, 0.45, 0.02)); c2.rotation.x = -Math.PI / 2; c2.position.y = -22; this.group.add(c2); this.cloudSea = [c1, c2];
    if (L.clouds) { const tex = cloudTexture(); for (let i = 0; i < (L.cloudN || 0); i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: L.clouds, transparent: true, opacity: 0.6, depthWrite: false, fog: false })); const a = R() * Math.PI * 2, d = 200 + R() * 900; sp.position.set(Math.cos(a) * d, 70 + R() * 90, Math.sin(a) * d); const s = 80 + R() * 140; sp.scale.set(s, s * 0.32, 1); sp.userData.v = 0.5 + R(); this.clouds.add(sp); } this.group.add(this.clouds); }
    this.detail(); this.scene.add(this.group);
  }
  private drift: THREE.Group | null = null; private cloudSea: THREE.Mesh[] = [];
  // satellites crossing the sky: your Earth satellites at Cape Horizon, your relays over a colony
  sats = new THREE.Group(); private satN = -1;
  setSats(n: number) { n = Math.min(14, Math.max(0, n)); if (n === this.satN) return; this.satN = n; this.sats.clear(); const R = rng(91);
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(5, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false, toneMapped: false, transparent: true })); const u = new THREE.Vector3(R() - 0.5, 0, R() - 0.5).normalize(); const v = new THREE.Vector3(-u.z * (R() - 0.5), 0.9 + R() * 0.4, u.x * (R() - 0.5)).normalize();
      m.userData = { u, v, a: R() * Math.PI * 2, s: (0.025 + R() * 0.03) * (R() < 0.5 ? 1 : -1), ph: R() * 6 }; this.sats.add(m); } }
  // close-up ground detail around an off-world base, painted once into a canvas: regolith speckle and mottling,
  // small craters lit from the sun's side and rover tracks; on Mars dust ripples and dust-devil trails (fading, and
  // lichen spreading, as it is terraformed), on Ceres bright salt, on Titan drainage channels, on Venus deck plating.
  // The terrain mesh is too coarse to carry any of this.
  private detail() {
    const L = this.look; if (L.id === 'earth') return; const S = this.quality === 'high' ? 1024 : 512, W = L.deck ? 60 : GRID + 20, u = S / W; const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d')!; const R = rng([...L.id].reduce((a, c) => a + c.charCodeAt(0) * 7, 3));
    const blob = (x: number, y: number, r: number, c: string) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
    const speck = (n: number, dark: string, light: string) => { for (let i = 0; i < n; i++) { g.fillStyle = R() < 0.55 ? dark : light; const r = (0.5 + R() * 1.4) * (S / 1024); g.fillRect(R() * S, R() * S, r, r); } };
    g.lineCap = 'round';
    if (L.deck) { // Venus: deck plates, seams, walkway stripes and hazard chevrons at the edge
      for (let x = 0; x < S; x += 2 * u) for (let y = 0; y < S; y += 2 * u) { const k = R(); if (k < 0.3) { g.fillStyle = k < 0.15 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)'; g.fillRect(x, y, 2 * u, 2 * u); } }
      g.strokeStyle = 'rgba(60,50,30,0.16)'; g.lineWidth = Math.max(1, 0.05 * u); for (let x = 0; x <= S; x += 2 * u) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, S); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(S, x); g.stroke(); }
      g.strokeStyle = 'rgba(255,200,80,0.35)'; g.lineWidth = 0.18 * u; g.setLineDash([u * 0.8, u * 0.6]); g.beginPath(); g.arc(S / 2, S / 2, 24.5 * u, 0, 7); g.stroke(); g.setLineDash([]); speck(S * 3, 'rgba(0,0,0,0.06)', 'rgba(255,255,255,0.06)');
    } else {
      for (let i = 0; i < 46; i++) blob(R() * S, R() * S, (1.5 + R() * 6) * u, R() < 0.55 ? 'rgba(0,0,0,0.11)' : 'rgba(255,255,255,0.08)');
      speck(S * 9, 'rgba(0,0,0,0.16)', L.id === 'titan' ? 'rgba(255,240,210,0.22)' : 'rgba(255,255,255,0.12)');
      if (L.green) for (let i = 0; i < Math.round(60 * L.green); i++) blob(R() * S, R() * S, (0.8 + R() * 3.5) * u, `rgba(70,${110 + Math.round(R() * 40)},50,${0.18 + L.green * 0.12})`);
      if ((L.dust ?? 0) > 0.05) { const da = L.dust ?? 1; // dust ripples and dust-devil trails
        for (let i = 0; i < 260; i++) { const x = R() * S, y = R() * S, l = (0.6 + R() * 1.6) * u; g.strokeStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,230,200'},${0.1 * da})`; g.lineWidth = 0.08 * u; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l * 0.5, y - l * 0.18, x + l, y + l * 0.12); g.stroke(); }
        for (let i = 0; i < 7; i++) { let x = R() * S, y = R() * S, a = R() * 6.3; g.strokeStyle = `rgba(40,10,0,${0.09 * da})`; g.lineWidth = (0.25 + R() * 0.35) * u; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 40; k++) { a += (R() - 0.5) * 0.5; x += Math.cos(a) * u * 0.9; y += Math.sin(a) * u * 0.9; g.lineTo(x, y); } g.stroke(); } }
      if (L.id === 'titan') for (let i = 0; i < 5; i++) { const branch = (x: number, y: number, a: number, w: number, d: number) => { g.strokeStyle = 'rgba(30,18,6,0.2)'; g.lineWidth = w * u; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 18; k++) { a += (R() - 0.5) * 0.6; x += Math.cos(a) * u * 0.7; y += Math.sin(a) * u * 0.7; g.lineTo(x, y); if (d < 2 && R() < 0.08) branch(x, y, a + (R() < 0.5 ? 0.8 : -0.8), w * 0.6, d + 1); } g.stroke(); }; branch(R() * S, R() * S, R() * 6.3, 0.35, 0); }
      if (L.salt) for (let i = 0; i < 7; i++) { const x = R() * S, y = R() * S; for (let k = 0; k < 5; k++) blob(x + (R() - 0.5) * u * 3, y + (R() - 0.5) * u * 3, (0.6 + R() * 1.8) * u, 'rgba(255,255,255,0.32)'); }
      // craters: shaded floor, a lit far wall and a shadowed near wall (light comes from the lower left of the canvas)
      const nC = L.craterN ?? (L.id === 'moon' ? 46 : L.id === 'ceres' ? 40 : L.id === 'titan' ? 3 : 16); for (let i = 0; i < nC; i++) { const x = R() * S, y = R() * S, r = (0.4 + Math.pow(R(), 2.4) * 2.4) * u;
        if (R() < 0.18) for (let k = 0; k < 9; k++) { const a = R() * 6.3, l = r * (2.2 + R() * 2.5); g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = r * 0.22; g.beginPath(); g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
        blob(x, y, r * 1.6, 'rgba(255,255,255,0.07)'); const gr = g.createRadialGradient(x - r * 0.3, y + r * 0.3, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,0.22)'); gr.addColorStop(0.75, 'rgba(0,0,0,0.11)'); gr.addColorStop(1, 'rgba(0,0,0,0.04)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        g.lineWidth = Math.max(1, r * 0.13); g.strokeStyle = 'rgba(255,255,255,0.2)'; g.beginPath(); g.arc(x, y, r * 0.88, -Math.PI * 0.85, Math.PI * 0.35); g.stroke(); g.strokeStyle = 'rgba(0,0,0,0.17)'; g.beginPath(); g.arc(x, y, r * 0.88, Math.PI * 0.35, Math.PI * 1.15); g.stroke(); }
      // rover tracks: pairs of ruts curving out from the colony
      for (let i = 0; i < 6; i++) { let a = R() * 6.3; let x = S / 2 + Math.cos(a) * u * 4, y = S / 2 + Math.sin(a) * u * 4; const pts: [number, number][] = []; for (let k = 0; k < 60; k++) { a += (R() - 0.5) * 0.12; x += Math.cos(a) * u * 0.5; y += Math.sin(a) * u * 0.5; pts.push([x, y]); }
        for (const off of [-0.17, 0.17]) { g.strokeStyle = 'rgba(0,0,0,0.13)'; g.lineWidth = 0.1 * u; g.beginPath(); pts.forEach(([px, py], k) => { const nx = -Math.sin(a), ny = Math.cos(a); const X = px + nx * off * u, Y = py + ny * off * u; if (k) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke(); } }
    }
    // fade out towards the edge so it melts into the terrain (the deck keeps its plating to the rim)
    if (!L.deck) { g.globalCompositeOperation = 'destination-in'; const fade = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.5); fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = fade; g.fillRect(0, 0, S, S); }
    else { g.globalCompositeOperation = 'destination-in'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const X = S / 2 + Math.cos(a) * 28.6 * u, Y = S / 2 + Math.sin(a) * 28.6 * u; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); } g.closePath(); g.fillStyle = '#000'; g.fill(); }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, W), new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 })); m.rotation.x = -Math.PI / 2; m.position.y = 0.015; m.receiveShadow = true; m.renderOrder = -1; this.group.add(m);
  }
  // the buildable square: a grid while placing, and a dashed border always
  setArea(lo: number, hi: number) {
    if (this.grid) { this.group.remove(this.grid); this.grid.geometry.dispose(); } if (this.bound) { this.group.remove(this.bound); this.bound.geometry.dispose(); }
    const pts: number[] = []; for (let i = lo; i <= hi; i++) { pts.push(i - C, 0.03, lo - C, i - C, 0.03, hi - C, lo - C, 0.03, i - C, hi - C, 0.03, i - C); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); this.grid = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22 })); this.grid.visible = false; this.group.add(this.grid);
    const s = hi - lo, r = new THREE.RingGeometry(0, 1, 4, 1); r.dispose(); const shape = new THREE.Shape(); const o = s / 2 + 0.25, i2 = s / 2; shape.moveTo(-o, -o); shape.lineTo(o, -o); shape.lineTo(o, o); shape.lineTo(-o, o); shape.lineTo(-o, -o);
    const hole = new THREE.Path(); hole.moveTo(-i2, -i2); hole.lineTo(-i2, i2); hole.lineTo(i2, i2); hole.lineTo(i2, -i2); hole.lineTo(-i2, -i2); shape.holes.push(hole);
    const bg = new THREE.ShapeGeometry(shape); bg.rotateX(-Math.PI / 2); this.bound = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: '#f4e7b8', transparent: true, opacity: 0.55, depthWrite: false })); this.bound.position.set((lo + hi) / 2 - C, 0.04, (lo + hi) / 2 - C); this.group.add(this.bound);
  }
  showGrid(v: boolean) { if (this.grid) this.grid.visible = v; }
  update(t: number, dt: number) { for (const m of this.sats.children) { const d = m.userData; d.a += d.s * dt; const p = (d.u as THREE.Vector3).clone().multiplyScalar(Math.cos(d.a)).add((d.v as THREE.Vector3).clone().multiplyScalar(Math.sin(d.a))).multiplyScalar(1500); m.position.copy(p); ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = p.y > 40 ? 0.55 + 0.45 * Math.max(0, Math.sin(t * 3 + d.ph)) : 0; }
    for (const c of this.cloudSea) (c.material as THREE.ShaderMaterial).uniforms.t.value = t; if (this.drift) this.drift.children.forEach((g) => { g.position.y += Math.sin(t * 0.3 + g.userData.ph) * dt * 0.4; g.rotation.y += dt * 0.02; });
    if (this.earthSky) { this.earthSky.mesh.rotation.y = t * 0.01; if (this.earthSky.uniforms) this.earthSky.uniforms.uTime.value = t; } if (this.water) (this.water.material as THREE.ShaderMaterial).uniforms.t.value = t; for (const c of this.clouds.children) { c.position.x += (c.userData.v as number) * dt; if (c.position.x > 1000) c.position.x = -1000; } }
  dispose() { this.scene.remove(this.group); this.scene.remove(this.sky); this.scene.remove(this.sats); for (const o of this.skyObjs) this.scene.remove(o); }
}
let ctex: THREE.Texture | null = null;
function cloudTexture() { if (ctex) return ctex; const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d')!; const R = rng(3);
  for (let i = 0; i < 14; i++) { const x = 20 + R() * 88, y = 22 + R() * 22, r = 10 + R() * 18; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  ctex = new THREE.CanvasTexture(c); ctex.colorSpace = THREE.SRGBColorSpace; return ctex; }
