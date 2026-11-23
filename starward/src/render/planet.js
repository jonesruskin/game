// STARWARD: WebGL 2 space renderer. A procedural starfield + nebula backdrop and analytic ray-traced planets:
// continents from 3D simplex fbm, oceans with sun glint, drifting clouds with shadows, night-side city lights,
// atmospheric rim scattering, craters, gas-giant bands and polar ice. One generic shader drives every world
// via a parameter block, so terraforming can blend a planet from barren to living in real time.
const VS = `#version 300 es
uniform vec4 u_rect; uniform vec2 u_res; out vec2 v_q;
void main(){ vec2 c = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2))*2.0-1.0; v_q = c; vec2 px = u_rect.xy + c*u_rect.zw; gl_Position = vec4(px/u_res*2.0-1.0, 0.0, 1.0); }`;
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
// crater field: distance to the nearest cell centre
float craters(vec3 p){ vec3 i=floor(p), f=fract(p); float c=0.0; for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) for(int z=-1;z<=1;z++){ vec3 o=vec3(x,y,z); vec3 h=hash3(i+o); vec3 d=o+h-f; float r=0.15+0.3*h.x; float dd=length(d)/r; if(dd<1.0){ c+= (dd<0.8? -0.6*(1.0-dd*dd*1.4) : 0.0) + (dd>=0.75 ? 0.5*(1.0-abs(dd-0.88)/0.13) : 0.0); } } return c; }`;
const FS_PLANET = `#version 300 es
precision highp float;
${NOISE}
uniform mat3 u_rot; uniform vec3 u_sun; uniform float u_time; uniform vec4 u_p0; uniform vec4 u_p1; uniform vec4 u_p2;
uniform vec3 u_cDeep; uniform vec3 u_cShallow; uniform vec3 u_cLow; uniform vec3 u_cHigh; uniform vec3 u_cPeak; uniform vec3 u_atm; uniform vec3 u_cloudCol; uniform float u_seed;
in vec2 v_q; out vec4 o;
// u_p0: water level, mountain scale, ice caps, city lights   u_p1: clouds, atmosphere, craters, bands   u_p2: terraform blend, roughness, glow, scale
void main(){
  float r2 = dot(v_q, v_q); float atmW = 0.06*u_p1.y; float R = 1.0/(1.0+atmW);
  vec2 q = v_q/R; float d2 = dot(q,q);
  if (d2 > 1.0) { // atmosphere halo outside the disc
    float h = (sqrt(d2)-1.0)/(atmW/R); if (h>1.0 || u_p1.y<=0.0) { o=vec4(0.0); return; }
    vec3 n = normalize(vec3(q/sqrt(d2), 0.0)); float lit = clamp(dot(n, u_sun)*0.8+0.35, 0.0, 1.0); float a = pow(1.0-h, 2.2)*lit*u_p1.y;
    o = vec4(u_atm*a*1.4, a); return; }
  vec3 nV = vec3(q, sqrt(1.0-d2)); vec3 n = u_rot*nV; vec3 L = u_sun; float ndl = dot(nV, L);
  vec3 p = n*u_p2.w + vec3(u_seed*7.31, u_seed*3.17, u_seed*1.91);
  float h; vec3 col; float water = 0.0; float spec = 0.0;
  if (u_p1.w > 0.0) { // gas giant: latitude bands with turbulence
    float lat = n.y + 0.08*fbm(p*vec3(1.0,4.0,1.0)*1.5 + vec3(u_time*0.01,0.0,0.0), 4);
    float b = sin(lat*u_p1.w*3.14159) * 0.5 + 0.5; float b2 = sin(lat*u_p1.w*7.1+1.3)*0.5+0.5;
    col = mix(mix(u_cLow, u_cHigh, b), u_cPeak, b2*0.35); float spot = smoothstep(0.12, 0.0, length(vec2(atan(n.z,n.x)-u_time*0.02-1.0, (n.y+0.35)*2.6))); col = mix(col, u_cDeep, spot*0.8); h = 0.0;
  } else {
    h = fbm(p*1.6, 7) + 0.35*fbm(p*5.0, 4)*u_p0.y;
    float cr = u_p1.z > 0.0 ? craters(n*6.0+u_seed)*0.5 + craters(n*15.0+u_seed*2.0)*0.25 : 0.0; h += cr*u_p1.z*0.6;
    float wl = u_p0.x;
    if (h < wl) { float dpt = clamp((wl-h)*3.0, 0.0, 1.0); col = mix(u_cShallow, u_cDeep, dpt); water = 1.0; }
    else { float e = clamp((h-wl)/(0.75-wl), 0.0, 1.0); col = e < 0.45 ? mix(u_cLow, u_cHigh, e/0.45) : mix(u_cHigh, u_cPeak, (e-0.45)/0.55);
      // terraform greening: vegetation creeps over low ground
      float veg = u_p2.x*smoothstep(0.55, 0.0, e)*(0.7+0.3*snoise(p*3.0)); col = mix(col, vec3(0.17,0.42,0.16), clamp(veg,0.0,0.85)); }
    float lat = abs(n.y) + 0.06*snoise(p*2.0); float ice = smoothstep(1.0-u_p0.z, 1.05-u_p0.z, lat); col = mix(col, vec3(0.94,0.96,1.0), ice); water *= 1.0-ice;
  }
  // lighting
  float diff = max(ndl, 0.0); float wrap = smoothstep(-0.15, 0.25, ndl);
  vec3 lit = col*(0.03 + diff*1.05);
  if (water > 0.0) { vec3 hv = normalize(L + vec3(0.0,0.0,1.0)); spec = pow(max(dot(nV, hv), 0.0), 60.0)*water; lit += vec3(1.0,0.95,0.85)*spec*0.9*diff; }
  // clouds
  float cl = 0.0;
  if (u_p1.x > 0.0) { vec3 cp = n*2.2 + vec3(u_time*0.004, 0.0, u_time*0.002) + u_seed; cl = smoothstep(0.55-u_p1.x*0.5, 0.95-u_p1.x*0.4, fbm(cp, 6)*0.5+0.5);
    lit *= 1.0 - cl*0.35*diff; lit = mix(lit, u_cloudCol*(0.05+diff*1.1), cl*0.92); }
  // night-side city lights on land
  if (u_p0.w > 0.0 && water < 0.5) { float region = smoothstep(0.6, 0.85, snoise(p*5.0)*0.5+0.5); float dots = smoothstep(0.62, 0.9, snoise(p*70.0)*0.5+0.5) + 0.35*smoothstep(0.7, 0.95, snoise(p*26.0)*0.5+0.5);
    float c = region*dots*u_p0.w*(1.0-cl*0.85)*smoothstep(0.03, 0.12, h-u_p0.x); lit += vec3(1.0,0.76,0.42)*c*smoothstep(0.05,-0.25,ndl)*1.25; }
  // self glow (lava / Io)
  lit += u_cPeak*u_p2.z*smoothstep(0.2,0.0,h)*0.0 + col*u_p2.z*(1.0-wrap)*0.4;
  // atmospheric scattering at the limb + terminator warmth
  float limb = pow(1.0-nV.z, 3.0); lit += u_atm*limb*u_p1.y*(0.25+diff*0.9); lit = mix(lit, lit*vec3(1.15,0.85,0.7), smoothstep(0.2,0.0,ndl)*smoothstep(-0.1,0.05,ndl)*u_p1.y*0.6);
  float edge = smoothstep(1.0, 0.985, d2);
  o = vec4(lit*edge, edge);
}`;
const FS_SKY = `#version 300 es
precision highp float;
${NOISE}
uniform vec2 u_res; uniform float u_time; uniform vec2 u_off; uniform vec3 u_neb; in vec2 v_q; out vec4 o;
void main(){ vec2 uv = (v_q*0.5+0.5)*u_res + u_off; vec3 col = vec3(0.004,0.006,0.016);
  float n1 = fbm(vec3(uv*0.0016, 1.3), 5)*0.5+0.5; float n2 = fbm(vec3(uv*0.0035+3.0, 4.1), 4)*0.5+0.5;
  col += u_neb*pow(n1, 3.2)*0.55 + vec3(0.12,0.05,0.18)*pow(n2,4.0)*0.6;
  for (int k=0;k<3;k++){ float sc = float(k)*1.7+1.0; vec2 g = floor(uv/ (3.0*sc)); vec3 h = hash3(vec3(g, float(k)*13.0)); if (h.x > 0.985 - float(k)*0.004){ vec2 c = (g+h.yz)*3.0*sc; float d = length(uv-c); float tw = 0.7+0.3*sin(u_time*(1.0+h.y*3.0)+h.z*20.0); col += vec3(0.8+0.2*h.y, 0.85, 1.0-0.2*h.z)*smoothstep(1.4, 0.0, d)*tw*(1.0-float(k)*0.25); } }
  o = vec4(col, 1.0); }`;

// planet presets (Part 3 adds the rest of the Solar System)
export const WORLDS = {
  earth: { p0: [0.02, 1.0, 0.16, 1.0], p1: [0.42, 1.0, 0.0, 0.0], p2: [0.0, 0.5, 0.0, 1.2], deep: '#0b2a5c', shallow: '#1f6aa5', low: '#3f7a3a', high: '#9c8a5c', peak: '#e8e2d6', atm: '#5aa0ff', cloud: '#ffffff', seed: 1.0 },
  moon: { p0: [-9, 0.6, 0.0, 0.0], p1: [0.0, 0.0, 1.0, 0.0], p2: [0.0, 0.5, 0.0, 1.0], deep: '#000000', shallow: '#000000', low: '#5f5d5a', high: '#9c9993', peak: '#cfccc6', atm: '#000000', cloud: '#ffffff', seed: 4.0 },
};
const hex = (c) => { const n = parseInt(c.replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
export class Space3D {
  constructor(canvas) { this.cv = canvas; this.gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: true }); this.ok = !!this.gl; if (!this.ok) return;
    const gl = this.gl; this.pPlanet = this.prog(VS, FS_PLANET); this.pSky = this.prog(VS, FS_SKY); this.vao = gl.createVertexArray();
    const U = (p, names) => Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)]));
    this.uP = U(this.pPlanet, ['u_rect', 'u_res', 'u_rot', 'u_sun', 'u_time', 'u_p0', 'u_p1', 'u_p2', 'u_cDeep', 'u_cShallow', 'u_cLow', 'u_cHigh', 'u_cPeak', 'u_atm', 'u_cloudCol', 'u_seed']);
    this.uS = U(this.pSky, ['u_rect', 'u_res', 'u_time', 'u_off', 'u_neb']); }
  prog(vs, fs) { const gl = this.gl; const mk = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }; const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
  resize(w, h, dpr) { this.w = w; this.h = h; this.dpr = dpr; this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr); this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px'; }
  begin(t, neb = [0.12, 0.2, 0.42], off = [0, 0]) {
    const gl = this.gl; gl.viewport(0, 0, this.cv.width, this.cv.height); gl.bindVertexArray(this.vao); gl.disable(gl.BLEND);
    gl.useProgram(this.pSky); gl.uniform4f(this.uS.u_rect, this.cv.width / 2, this.cv.height / 2, this.cv.width / 2, this.cv.height / 2); gl.uniform2f(this.uS.u_res, this.cv.width, this.cv.height); gl.uniform1f(this.uS.u_time, t); gl.uniform2f(this.uS.u_off, off[0], off[1]); gl.uniform3fv(this.uS.u_neb, neb); gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  // draw a world at css (x, y) with radius r. W: preset; rot: 3x3 (column-major for GL); sun: unit vec in view space
  planet(W, x, y, r, rot, sun, t, extra = {}) {
    const gl = this.gl, u = this.uP, k = this.dpr; gl.useProgram(this.pPlanet); const rr = r * (1 + 0.06 * W.p1[1]) * k;
    gl.uniform4f(u.u_rect, x * k, this.cv.height - y * k, rr, rr); gl.uniform2f(u.u_res, this.cv.width, this.cv.height);
    gl.uniformMatrix3fv(u.u_rot, false, rot); gl.uniform3fv(u.u_sun, sun); gl.uniform1f(u.u_time, t);
    const p2 = extra.p2 || W.p2; gl.uniform4fv(u.u_p0, extra.p0 || W.p0); gl.uniform4fv(u.u_p1, extra.p1 || W.p1); gl.uniform4fv(u.u_p2, p2);
    gl.uniform3fv(u.u_cDeep, hex(W.deep)); gl.uniform3fv(u.u_cShallow, hex(W.shallow)); gl.uniform3fv(u.u_cLow, hex(W.low)); gl.uniform3fv(u.u_cHigh, hex(W.high)); gl.uniform3fv(u.u_cPeak, hex(W.peak)); gl.uniform3fv(u.u_atm, hex(W.atm)); gl.uniform3fv(u.u_cloudCol, hex(W.cloud)); gl.uniform1f(u.u_seed, W.seed);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
// rotation about Y (spin) then tilt about X, as a column-major mat3
export function spinTilt(spin, tilt) { const cs = Math.cos(spin), ss = Math.sin(spin), ct = Math.cos(tilt), st = Math.sin(tilt);
  // R = Rx(tilt) * Ry(spin)
  const m = [cs, 0, -ss, st * ss, ct, st * cs, ct * ss, -st, ct * cs]; return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]; }
