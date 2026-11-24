// The view from orbit: Earth turning below the island (baked once from a procedural shader into day, cloud,
// city-light and water maps, then lit cheaply every frame), its atmosphere, the Moon, the Sun and the stars.
import * as THREE from 'three';
const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;} vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);} vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){ const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx); vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy; i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y); vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0)); vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3))); }
float fbm(vec3 p, int oct){ float s=0.0, a=0.5; for(int i=0;i<8;i++){ if(i>=oct) break; s+=a*snoise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; } return s; }
vec3 hash3(vec3 p){ p=fract(p*vec3(0.1031,0.1030,0.0973)); p+=dot(p,p.yxz+33.33); return fract((p.xxy+p.yxx)*p.zyx); }
float craters(vec3 p){ vec3 i=floor(p), f=fract(p); float c=0.0; for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) for(int z=-1;z<=1;z++){ vec3 o=vec3(float(x),float(y),float(z)); vec3 h=hash3(i+o); vec3 d=o+h-f; float r=0.15+0.3*h.x; float dd=length(d)/r; if(dd<1.0){ c+= (dd<0.8? -0.6*(1.0-dd*dd*1.4) : 0.0) + (dd>=0.75 ? 0.5*(1.0-abs(dd-0.88)/0.13) : 0.0); } } return c; }`;
// one baking pass: every texel of an equirectangular map is a direction on the sphere
const BAKE_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const BAKE_FS = `precision highp float; varying vec2 vUv; uniform int uMode; uniform float uSeed;
${NOISE}
vec3 dirOf(vec2 uv){ float lon = (uv.x - 0.5) * 6.2831853; float lat = (uv.y - 0.5) * 3.1415926; return vec3(cos(lat)*cos(lon), sin(lat), cos(lat)*sin(lon)); }
void main(){ vec3 n = dirOf(vUv); vec3 p = n*1.2 + vec3(uSeed*7.31, uSeed*3.17, uSeed*1.91);
  if (uMode == 0) { // Earth albedo (rgb) + water mask (a)
    float h = fbm(p*1.6, 7) + 0.35*fbm(p*5.0, 4); float wl = 0.02; vec3 col; float water = 0.0;
    if (h < wl) { float dpt = clamp((wl-h)*3.0, 0.0, 1.0); col = mix(vec3(0.12,0.42,0.65), vec3(0.04,0.16,0.36), dpt); water = 1.0; }
    else { float e = clamp((h-wl)/0.73, 0.0, 1.0); float dry = smoothstep(0.1, 0.5, snoise(p*1.3+4.0)*0.5+0.5) * (1.0-abs(n.y));
      vec3 green = mix(vec3(0.20,0.45,0.18), vec3(0.62,0.55,0.34), dry); col = e < 0.45 ? mix(green, vec3(0.55,0.5,0.36), e/0.45) : mix(vec3(0.55,0.5,0.36), vec3(0.92,0.9,0.86), (e-0.45)/0.55); }
    float lat = abs(n.y) + 0.06*snoise(p*2.0); float ice = smoothstep(0.84, 0.89, lat); col = mix(col, vec3(0.94,0.96,1.0), ice); water *= 1.0-ice;
    gl_FragColor = vec4(col, water); }
  else if (uMode == 1) { // clouds (r), city lights (g)
    float cl = smoothstep(0.36, 0.78, fbm(n*2.2 + vec3(uSeed), 6)*0.5+0.5); cl = max(cl, smoothstep(0.55, 0.9, fbm(n*vec3(1.0,3.5,1.0)*2.0+3.0, 4)*0.5+0.5)*0.8*(1.0-abs(n.y)));
    float h = fbm(p*1.6, 7) + 0.35*fbm(p*5.0, 4); float land = smoothstep(0.03, 0.12, h-0.02);
    float region = smoothstep(0.55, 0.8, snoise(p*5.0)*0.5+0.5); float dots = smoothstep(0.6, 0.9, snoise(p*70.0)*0.5+0.5) + 0.35*smoothstep(0.7, 0.95, snoise(p*26.0)*0.5+0.5);
    gl_FragColor = vec4(cl, region*dots*land*(1.0-smoothstep(0.75, 0.9, abs(n.y))), 0.0, 1.0); }
  else if (uMode == 2) { // Moon albedo
    float h = fbm(p*1.6, 6)*0.6 + craters(n*6.0+uSeed)*0.5 + craters(n*15.0+uSeed*2.0)*0.25; float mare = smoothstep(0.1, -0.2, fbm(p*0.9+2.0, 4));
    vec3 col = mix(vec3(0.62,0.61,0.59), vec3(0.36,0.36,0.37), mare) * (0.8 + h*0.35); gl_FragColor = vec4(col, 1.0); }
  else if (uMode == 4) { // Mars albedo: rust plains, dark regions, polar caps
    float h = fbm(p*1.4, 6); float dark = smoothstep(0.05, 0.35, fbm(p*0.8+5.0, 4)); vec3 col = mix(vec3(0.78,0.42,0.24), vec3(0.42,0.2,0.13), dark) * (0.85 + h*0.25);
    float ice = smoothstep(0.86, 0.9, abs(n.y) + 0.04*snoise(p*3.0)); col = mix(col, vec3(0.95,0.93,0.9), ice); gl_FragColor = vec4(col, 1.0); }
  else { // nebula sky
    float n1 = fbm(n*1.8 + 1.3, 5)*0.5+0.5; float n2 = fbm(n*4.0 + 3.0, 4)*0.5+0.5; vec3 col = vec3(0.004,0.006,0.016) + vec3(0.12,0.22,0.5)*pow(n1, 3.4)*0.6 + vec3(0.25,0.08,0.3)*pow(n2, 4.0)*0.5;
    float band = exp(-pow(n.y*3.2 + 0.4*snoise(n*3.0), 2.0)); col += vec3(0.16,0.15,0.2)*band*(0.5+0.5*n1);
    gl_FragColor = vec4(col, 1.0); } }`;
function bake(renderer: THREE.WebGLRenderer, mode: number, w: number, h: number, seed = 1) {
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.UnsignedByteType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping });
  const scene = new THREE.Scene(); const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({ vertexShader: BAKE_VS, fragmentShader: BAKE_FS, uniforms: { uMode: { value: mode }, uSeed: { value: seed } } });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); scene.add(quad);
  const prev = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(prev);
  mat.dispose(); quad.geometry.dispose(); rt.texture.colorSpace = mode === 1 ? THREE.NoColorSpace : THREE.SRGBColorSpace; return rt;
}
const EARTH_VS = `varying vec3 vN; varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
const EARTH_FS = `uniform sampler2D uDay; uniform sampler2D uAux; uniform vec3 uSun; uniform float uTime; varying vec3 vN; varying vec3 vW; varying vec2 vUv;
void main(){ vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW); float ndl = dot(n, uSun);
  vec4 day = texture2D(uDay, vUv); vec4 aux = texture2D(uAux, vUv); float cl = texture2D(uAux, vUv + vec2(uTime*0.0016, 0.0)).r;
  float diff = max(ndl, 0.0); vec3 col = day.rgb*(0.025 + diff*1.1);
  vec3 h = normalize(uSun + v); col += vec3(1.0,0.93,0.8)*pow(max(dot(n,h),0.0), 70.0)*day.a*diff*0.9;
  col = mix(col, vec3(1.0)*(0.04 + diff*1.15), cl*0.9);
  col += vec3(1.0,0.72,0.38)*aux.g*(1.0-cl*0.85)*smoothstep(0.05,-0.25,ndl)*1.6;
  float limb = pow(1.0 - max(dot(n, v), 0.0), 3.0); col += vec3(0.32,0.58,1.0)*limb*(0.15 + diff*0.95);
  col = mix(col, col*vec3(1.15,0.85,0.7), smoothstep(0.2,0.0,ndl)*smoothstep(-0.1,0.05,ndl)*0.6);
  gl_FragColor = vec4(col, 1.0); }`;
const ATM_FS = `uniform vec3 uSun; varying vec3 vN; varying vec3 vW; void main(){ vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW); float rim = pow(1.0 - abs(dot(n, v)), 2.6);
  float lit = clamp(dot(n, uSun)*0.9 + 0.35, 0.0, 1.0); gl_FragColor = vec4(vec3(0.35,0.62,1.0)*rim*lit*1.6, rim*lit); }`;
const SIMPLE_VS = `varying vec3 vN; varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
const MOON_FS = `uniform sampler2D uMap; uniform vec3 uSun; varying vec3 vN; varying vec2 vUv; void main(){ float d = max(dot(normalize(vN), uSun), 0.0); gl_FragColor = vec4(texture2D(uMap, vUv).rgb*(0.02 + d*1.2), 1.0); }`;
export class Backdrop {
  group = new THREE.Group(); earth: THREE.Mesh; moon: THREE.Mesh; private atm!: THREE.Mesh; sunDir: THREE.Vector3; private uniforms: Record<string, THREE.IUniform>; private targets: THREE.WebGLRenderTarget[] = [];
  constructor(renderer: THREE.WebGLRenderer, sunDir: THREE.Vector3, quality: 'high' | 'low') {
    this.sunDir = sunDir.clone().normalize(); const big = quality === 'high'; const W = big ? 2048 : 1024;
    const day = bake(renderer, 0, W, W / 2, 1), aux = bake(renderer, 1, W, W / 2, 1), moonT = bake(renderer, 2, 512, 256, 4), neb = bake(renderer, 3, big ? 1024 : 512, big ? 512 : 256, 2); this.targets.push(day, aux, moonT, neb);
    // Earth directly below: from any camera angle the island floats over it, its limb curving across the top of the view
    const D = 3000, R = D * Math.sin(THREE.MathUtils.degToRad(50));
    this.uniforms = { uDay: { value: day.texture }, uAux: { value: aux.texture }, uSun: { value: this.sunDir }, uTime: { value: 0 } };
    this.earth = new THREE.Mesh(new THREE.SphereGeometry(R, big ? 128 : 72, big ? 64 : 40), new THREE.ShaderMaterial({ vertexShader: EARTH_VS, fragmentShader: EARTH_FS, uniforms: this.uniforms }));
    this.earth.position.set(0, -D, 0); this.earth.rotation.z = 0.35; this.group.add(this.earth);
    const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.03, 64, 32), new THREE.ShaderMaterial({ vertexShader: SIMPLE_VS, fragmentShader: ATM_FS, uniforms: { uSun: { value: this.sunDir } }, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    atm.position.copy(this.earth.position); this.group.add(atm); this.atm = atm; this.renderer = renderer; this.R = R; this.worlds.earth = [];
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(160, 40, 24), new THREE.ShaderMaterial({ vertexShader: SIMPLE_VS, fragmentShader: MOON_FS, uniforms: { uMap: { value: moonT.texture }, uSun: { value: this.sunDir } } }));
    this.moon.position.set(-3400, 900, -4200); this.group.add(this.moon);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), new THREE.MeshBasicMaterial({ map: neb.texture, side: THREE.BackSide, depthWrite: false })); this.group.add(sky);
    // stars
    const n = big ? 3500 : 1800, pos = new Float32Array(n * 3), col = new Float32Array(n * 3); const c = new THREE.Color();
    for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u); pos.set([r * Math.cos(a) * 8500, u * 8500, r * Math.sin(a) * 8500], i * 3);
      c.setHSL(0.55 + Math.random() * 0.15 - (Math.random() < 0.2 ? 0.45 : 0), 0.5, 0.75 + Math.random() * 0.25); col.set([c.r, c.g, c.b], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.group.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: big ? 2.2 : 1.8, sizeAttenuation: false, vertexColors: true, depthWrite: false, transparent: true, opacity: 0.95 })));
    // the Sun: a soft glow where the light comes from
    const sunTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d')!; const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.12, 'rgba(255,248,220,0.95)'); gr.addColorStop(0.35, 'rgba(255,220,160,0.25)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true })); sun.position.copy(this.sunDir).multiplyScalar(7000); sun.scale.setScalar(1300); this.group.add(sun);
  }
  // the world below the island: Earth from orbit, the Moon (Earth in the sky) or Mars (Phobos overhead)
  private worlds: Record<string, THREE.Object3D[]> = {}; private world = 'earth'; private renderer: THREE.WebGLRenderer | null = null; private R = 0;
  setWorld(w: 'earth' | 'moon' | 'mars' | 'vault') { if (w === this.world) return; this.world = w; const r = this.renderer!;
    if (!this.worlds[w] && w !== 'earth') { const map = bake(r, w === 'mars' ? 4 : 2, 1024, 512, w === 'moon' ? 4 : w === 'vault' ? 9 : 5); this.targets.push(map); const big = new THREE.Mesh(new THREE.SphereGeometry(this.R, 96, 48), new THREE.MeshLambertMaterial({ map: map.texture, color: w === 'vault' ? new THREE.Color(0.55, 0.38, 0.85) : new THREE.Color(0.62, 0.62, 0.62), emissive: w === 'vault' ? new THREE.Color(0.05, 0.02, 0.1) : new THREE.Color(0, 0, 0) }));
      big.position.copy(this.earth.position); big.rotation.z = 0.2; this.group.add(big); const objs: THREE.Object3D[] = [big];
      if (w === 'mars' || w === 'vault') { const halo = new THREE.Mesh(new THREE.SphereGeometry(this.R * 1.02, 64, 32), new THREE.ShaderMaterial({ vertexShader: SIMPLE_VS, fragmentShader: ATM_FS.replace('vec3(0.35,0.62,1.0)', w === 'vault' ? 'vec3(0.7,0.45,1.0)' : 'vec3(0.95,0.6,0.42)'), uniforms: { uSun: { value: this.sunDir } }, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); halo.position.copy(big.position); this.group.add(halo); objs.push(halo); }
      // what hangs in the sky: Earth over the Moon, Phobos over Mars
      const sky = w === 'moon' ? new THREE.Mesh(new THREE.SphereGeometry(260, 48, 32), new THREE.ShaderMaterial({ vertexShader: EARTH_VS, fragmentShader: EARTH_FS, uniforms: this.uniforms })) : new THREE.Mesh(new THREE.IcosahedronGeometry(90, 2), new THREE.MeshStandardMaterial({ color: '#6e6660', flatShading: true, roughness: 1 }));
      sky.position.set(-3000, 1400, -4600); this.group.add(sky); objs.push(sky); this.worlds[w] = objs; }
    for (const [k, objs] of Object.entries(this.worlds)) objs.forEach((o) => (o.visible = k === w)); this.earth.visible = w === 'earth'; this.atm.visible = w === 'earth'; this.moon.visible = w === 'earth'; }
  update(t: number, cam: THREE.Camera) { this.uniforms.uTime.value = t; this.earth.rotation.y = t * 0.004; this.group.position.set(cam.position.x * 0.98, 0, cam.position.z * 0.98); }
}
