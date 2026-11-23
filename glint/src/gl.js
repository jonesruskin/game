// GLINT renderer (WebGL 2). Every gem is ray-traced per pixel: the stone is a convex polyhedron (a list of
// planes in uniforms); rays refract in, bounce by total internal reflection and Fresnel, pick up body colour
// (Beer–Lambert), hit inclusions, and leave with a per-channel index of refraction (dispersion = "fire").
// The scene goes into an HDR buffer → bloom mip chain + two Kawase light-streak passes (the 4-point star of
// jewellery photography) → ACES tone map → sRGB.
const VS_TRI = `#version 300 es
out vec2 v_uv; void main(){ vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); v_uv = p; gl_Position = vec4(p*2.0-1.0, 0.0, 1.0); }`;
const VS_QUAD = `#version 300 es
uniform vec4 u_rect; uniform vec2 u_res; out vec2 v_q;
void main(){ vec2 c = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2))*2.0-1.0; v_q = c; vec2 px = u_rect.xy + c*u_rect.zw; gl_Position = vec4(px/u_res*2.0-1.0, 0.0, 1.0); }`;
const FS_BG = `#version 300 es
precision mediump float; uniform sampler2D u_bg; uniform float u_dim; in vec2 v_uv; out vec4 o;
void main(){ vec3 c = texture(u_bg, vec2(v_uv.x, 1.0-v_uv.y)).rgb; c = pow(c, vec3(2.2))*u_dim; o = vec4(c, 1.0); }`;
export const MAXP = 120, MAXI = 8;
const FS_GEM = `#version 300 es
precision highp float;
#define MAXP ${MAXP}
#define MAXI ${MAXI}
uniform vec4 u_pl[MAXP]; uniform vec4 u_fr[${MAXP / 4}]; uniform vec4 u_inc[MAXI*2];
uniform int u_np; uniform int u_ni; uniform int u_bounces;
uniform mat3 u_rot; uniform vec4 u_opt; uniform vec3 u_sig; uniform vec3 u_tint; uniform vec4 u_cam; uniform vec4 u_fx;
in vec2 v_q; out vec4 o;
float g_sharp = 1.0;
float frostOf(int i){ vec4 f = u_fr[i>>2]; int k = i & 3; return k==0?f.x:(k==1?f.y:(k==2?f.z:f.w)); }
vec3 hash3(vec3 p){ p = fract(p*vec3(0.1031,0.1030,0.0973)); p += dot(p, p.yxz+33.33); return fract((p.xxy+p.yxx)*p.zyx); }
// smooth 3D value noise (vec3) for frosted / water-worn surfaces
vec3 vn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  vec3 a = mix(mix(hash3(i), hash3(i+vec3(1,0,0)), f.x), mix(hash3(i+vec3(0,1,0)), hash3(i+vec3(1,1,0)), f.x), f.y);
  vec3 b = mix(mix(hash3(i+vec3(0,0,1)), hash3(i+vec3(1,0,1)), f.x), mix(hash3(i+vec3(0,1,1)), hash3(i+vec3(1,1,1)), f.x), f.y);
  return mix(a, b, f.z) - 0.5; }
vec3 frostN(vec3 n, vec3 p, float fr){ float a = smoothstep(0.24, 0.6, fr); if (a <= 0.0) return n; vec3 h = vn3(p*u_fx.x)*0.8 + vn3(p*u_fx.x*2.7)*0.3; return normalize(n + h*a*0.9); }
float fres(float ci, float n1, float n2){ float st = n1/n2*sqrt(max(0.0,1.0-ci*ci)); if(st>=1.0) return 1.0; float ct = sqrt(1.0-st*st); float rs=(n1*ci-n2*ct)/(n1*ci+n2*ct), rp=(n2*ci-n1*ct)/(n2*ci+n1*ct); return 0.5*(rs*rs+rp*rp); }
// studio: warm softbox, cool window strip, three pin spots (sparkle makers), dark velvet floor
vec3 env(vec3 d){
  float y = d.y;
  vec3 c = mix(vec3(0.012,0.010,0.014), vec3(0.16,0.135,0.115), smoothstep(-0.2, 0.9, y));
  c += vec3(0.9,0.82,0.72)*smoothstep(0.55, 0.95, y); // broad ceiling light
  vec3 k = normalize(vec3(-0.38, 0.80, 0.46)); float a = dot(d,k);
  c += vec3(5.2,4.3,3.2)*smoothstep(0.952, 0.985, a) + vec3(0.42,0.34,0.26)*smoothstep(0.5,1.0,a);
  c += vec3(0.5,0.48,0.46)*smoothstep(0.86, 0.96, dot(d, normalize(vec3(0.15,0.2,1.0)))); // reflector card behind the camera
  vec3 r = normalize(vec3(0.92, 0.30, -0.22)); c += vec3(0.9,1.35,2.2)*smoothstep(0.935, 0.972, dot(d,r));
  vec3 r2 = normalize(vec3(-0.85, 0.15, -0.5)); c += vec3(1.6,1.1,0.7)*smoothstep(0.965, 0.985, dot(d,r2));
  vec3 pin = vec3(70.0,64.0,54.0)*smoothstep(0.99935, 0.99985, dot(d, normalize(vec3(0.28,0.94,0.18))))
    + vec3(48.0,52.0,66.0)*smoothstep(0.99935, 0.99985, dot(d, normalize(vec3(-0.52,0.78,-0.34))))
    + vec3(60.0,58.0,56.0)*smoothstep(0.9992, 0.9998, dot(d, normalize(vec3(0.62,0.66,0.42))))
    + vec3(40.0,38.0,36.0)*smoothstep(0.9993, 0.9998, dot(d, normalize(vec3(0.05,0.55,0.83))));
  c += pin*g_sharp;
  c *= u_fx.y;
  return mix(c, vec3(0.014,0.008,0.012), smoothstep(-0.02, -0.25, y));
}
vec3 irr(vec3 n){ vec3 k = normalize(vec3(-0.38,0.80,0.46)); return vec3(0.05,0.045,0.04) + vec3(0.9,0.75,0.55)*max(dot(n,k),0.0) + vec3(0.15,0.22,0.35)*max(dot(n,normalize(vec3(0.92,0.3,-0.22))),0.0); }
void main(){
  float rb = u_cam.x, cam = u_cam.y, pxw = u_cam.z;
  vec2 q = v_q*rb;
  vec3 row = vec3(0.0,0.0,cam); vec3 rdw = normalize(vec3(q,0.0)-row);
  mat3 iR = transpose(u_rot); vec3 ro = iR*row, rd = iR*rdw;
  { float bq = dot(ro, rd); float h = bq*bq - dot(ro,ro) + u_cam.w*u_cam.w; if (h < 0.0) { o = vec4(0.0); return; } }
  float t0=-1e9, t1=1e9; int i0=-1;
  for(int i=0;i<MAXP;i++){ if(i>=u_np) break; vec4 p=u_pl[i]; float dn=dot(p.xyz,rd), dist=p.w-dot(p.xyz,ro);
    if(abs(dn)<1e-7){ if(dist<0.0){ i0=-2; break; } continue; }
    float t=dist/dn; if(dn<0.0){ if(t>t0){ t0=t; i0=i; } } else t1=min(t1,t); }
  if(i0<0 || t0>t1 || t1<0.0){ o=vec4(0.0); return; }
  float cov = clamp((t1-t0)/(pxw*2.2), 0.0, 1.0);
  float ri=u_opt.x, disp=u_opt.y, gf=u_opt.w;
  vec3 p = ro + rd*t0; vec3 n = u_pl[i0].xyz; float fr = clamp(frostOf(i0)+gf, 0.0, 1.0);
  if(fr>0.0) n = frostN(n, p, fr);
  float cosi = clamp(-dot(rd,n), 0.0, 1.0); float F = fres(cosi, 1.0, ri);
  g_sharp = pow(1.0-fr, 6.0);
  vec3 col = F*env(u_rot*reflect(rd,n))*(1.0-fr*0.75) + fr*irr(u_rot*n)*u_tint*0.42;
  vec3 d = refract(rd, n, 1.0/ri);
  vec3 w = vec3((1.0-F)*(1.0-fr*0.6));
  col += fr*0.3*u_tint*irr(u_rot*n);
  for(int b=0;b<12;b++){
    if(b>=u_bounces) break;
    float tm=1e9; int j=-1;
    for(int i=0;i<MAXP;i++){ if(i>=u_np) break; vec4 pl=u_pl[i]; float dn=dot(pl.xyz,d); if(dn<=1e-6) continue; float t=(pl.w-dot(pl.xyz,p))/dn; if(t<tm){ tm=t; j=i; } }
    if(j<0) break; tm=max(tm,0.0);
    for(int k=0;k<MAXI;k++){ if(k>=u_ni) break; vec4 s=u_inc[k*2]; vec3 oc=p-s.xyz; float bq=dot(oc,d); float cq=dot(oc,oc)-s.w*s.w; float hh=bq*bq-cq;
      if(hh>0.0){ float th=-bq-sqrt(hh); if(th>0.0 && th<tm){ vec4 ty=u_inc[k*2+1]; if(ty.x<0.5){ w*=0.12+0.25*(1.0-ty.y); } else { col += w*0.3*ty.y*irr(u_rot*normalize(oc+d*th)); w*=0.6; } } } }
    w *= exp(-u_sig*tm);
    p += d*tm;
    vec3 nn = u_pl[j].xyz; float frj = clamp(frostOf(j)+gf, 0.0, 1.0);
    if(frj>0.0) nn = frostN(nn, p, frj);
    float ci = dot(d,nn);
    if(frj>0.55){ col += w*irr(u_rot*nn)*0.55*u_tint; w*=0.22; }
    g_sharp = pow(1.0-frj, 6.0);
    if(ri*ri*(1.0-ci*ci) < 1.0){
      float Fx = fres(ci, ri, 1.0); vec3 tw = w*(1.0-Fx);
      vec3 dr = refract(d,-nn,ri-disp*0.6), dg = refract(d,-nn,ri), db = refract(d,-nn,ri+disp*0.6);
      vec3 e = vec3(dot(dr,dr)>0.5?env(u_rot*dr).r:0.0, env(u_rot*dg).g, dot(db,db)>0.5?env(u_rot*db).b:0.0);
      col += tw*e; w *= Fx;
    }
    d = reflect(d, nn);
    if(max(w.r,max(w.g,w.b))<0.008) break;
  }
  // a whisper of the body colour even in dark zones, so stones read as their colour
  col += (vec3(1.0)-exp(-u_sig*0.8))*0.0 + u_tint*0.012;
  o = vec4(col*u_opt.z*cov, cov*u_fx.z);
}`;
const FS_DOWN = `#version 300 es
precision mediump float; uniform sampler2D u_src; uniform vec2 u_tx; uniform float u_th; uniform float u_first; in vec2 v_uv; out vec4 o;
vec3 S(float x, float y){ return texture(u_src, v_uv + vec2(x,y)*u_tx).rgb; }
void main(){ vec3 c = S(0.,0.)*0.125 + (S(-2.,2.)+S(2.,2.)+S(-2.,-2.)+S(2.,-2.))*0.03125 + (S(0.,2.)+S(-2.,0.)+S(2.,0.)+S(0.,-2.))*0.0625 + (S(-1.,1.)+S(1.,1.)+S(-1.,-1.)+S(1.,-1.))*0.125;
  if (u_first > 0.5) { float br = max(c.r, max(c.g, c.b)); float k = 0.5; float soft = clamp(br - u_th + k, 0.0, 2.0*k); soft = soft*soft/(4.0*k + 1e-4); c *= max(soft, br - u_th)/max(br, 1e-4); c = min(c, vec3(60.0)); }
  o = vec4(c, 1.0); }`;
const FS_UP = `#version 300 es
precision mediump float; uniform sampler2D u_src; uniform vec2 u_tx; in vec2 v_uv; out vec4 o;
void main(){ vec2 d = u_tx; vec3 s = texture(u_src, v_uv + vec2(-d.x, d.y)).rgb + 2.0*texture(u_src, v_uv + vec2(0.0, d.y)).rgb + texture(u_src, v_uv + d).rgb
 + 2.0*texture(u_src, v_uv + vec2(-d.x, 0.0)).rgb + 4.0*texture(u_src, v_uv).rgb + 2.0*texture(u_src, v_uv + vec2(d.x, 0.0)).rgb
 + texture(u_src, v_uv - d).rgb + 2.0*texture(u_src, v_uv + vec2(0.0, -d.y)).rgb + texture(u_src, v_uv + vec2(d.x, -d.y)).rgb; o = vec4(s/16.0, 1.0); }`;
// Kawase light streak: symmetric taps along one direction, step grows each pass
const FS_STREAK = `#version 300 es
precision mediump float; uniform sampler2D u_src; uniform vec2 u_dir; uniform float u_step; uniform float u_fall; in vec2 v_uv; out vec4 o;
void main(){ vec3 s = vec3(0.0); float wt = 0.0;
  for (int k = -4; k <= 4; k++) { float w = pow(u_fall, abs(float(k))*u_step); s += texture(u_src, v_uv + u_dir*float(k)*u_step).rgb*w; wt += w; }
  o = vec4(s/wt*1.6, 1.0); }`;
const FS_COMP = `#version 300 es
precision highp float; uniform sampler2D u_scene; uniform sampler2D u_bloom; uniform sampler2D u_s1; uniform sampler2D u_s2; uniform float u_bs; uniform float u_ss; uniform float u_exp; uniform vec2 u_res; uniform float u_time; uniform float u_vig;
in vec2 v_uv; out vec4 o;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
void main(){ vec3 col = texture(u_scene, v_uv).rgb + texture(u_bloom, v_uv).rgb*u_bs + (texture(u_s1, v_uv).rgb + texture(u_s2, v_uv).rgb)*u_ss;
  col = aces(col*u_exp); col = pow(col, vec3(1.0/2.2));
  vec2 q = v_uv - 0.5; col *= 1.0 - dot(q*vec2(1.0, 1.2), q*vec2(1.0, 1.2))*u_vig;
  float n = fract(sin(dot(v_uv*u_res + fract(u_time)*61.0, vec2(12.9898, 78.233)))*43758.5453);
  o = vec4(col + (n - 0.5)*(1.5/255.0), 1.0); }`;
const FS_THUMB = `#version 300 es
precision highp float; uniform sampler2D u_src; in vec2 v_uv; out vec4 o;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
void main(){ vec4 s = texture(u_src, v_uv); float a = clamp(s.a, 0.0, 1.0); vec3 c = a > 0.001 ? s.rgb/a : vec3(0.0); c = pow(aces(c*1.1), vec3(1.0/2.2)); o = vec4(c*a, a); }`;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ok = false; this.scale = 1; this.bounces = 8; this.streaks = true;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.ok = false; }, false);
    canvas.addEventListener('webglcontextrestored', () => { this.init(); if (this.onRestore) this.onRestore(); }, false);
    this.init();
  }
  init() {
    const gl = this.canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    if (!gl) { this.ok = false; return; }
    this.gl = gl; this.hdr = !!gl.getExtension('EXT_color_buffer_float'); gl.getExtension('OES_texture_float_linear');
    try {
      this.pBg = this.prog(VS_TRI, FS_BG); this.pGem = this.prog(VS_QUAD, FS_GEM); this.pDown = this.prog(VS_TRI, FS_DOWN); this.pUp = this.prog(VS_TRI, FS_UP);
      this.pStreak = this.prog(VS_TRI, FS_STREAK); this.pComp = this.prog(VS_TRI, FS_COMP); this.pThumb = this.prog(VS_TRI, FS_THUMB);
    } catch (e) { console.error(e); this.ok = false; this.err = String(e.message || e); return; }
    this.vao = gl.createVertexArray();
    const U = (p, names) => Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)]));
    this.uGem = U(this.pGem, ['u_rect', 'u_res', 'u_pl', 'u_fr', 'u_inc', 'u_np', 'u_ni', 'u_bounces', 'u_rot', 'u_opt', 'u_sig', 'u_tint', 'u_cam', 'u_fx']);
    this.uDown = U(this.pDown, ['u_src', 'u_tx', 'u_th', 'u_first']); this.uUp = U(this.pUp, ['u_src', 'u_tx']); this.uStreak = U(this.pStreak, ['u_src', 'u_dir', 'u_step', 'u_fall']);
    this.uComp = U(this.pComp, ['u_scene', 'u_bloom', 'u_s1', 'u_s2', 'u_bs', 'u_ss', 'u_exp', 'u_res', 'u_time', 'u_vig']); this.uBg = U(this.pBg, ['u_bg', 'u_dim']); this.uThumb = U(this.pThumb, ['u_src']);
    this.bgTex = null; this.w = 0; this.h = 0; this.fb = null; this.thumbT = null;
    this.ok = true;
  }
  prog(vs, fs) {
    const gl = this.gl; const mk = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p;
  }
  target(w, h, hdr = this.hdr) {
    const gl = this.gl; const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    if (hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE && hdr) { this.hdr = false; gl.deleteFramebuffer(fb); gl.deleteTexture(tex); return this.target(w, h, false); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); return { tex, fb, w, h };
  }
  free(t) { if (!t) return; this.gl.deleteFramebuffer(t.fb); this.gl.deleteTexture(t.tex); }
  // css size → internal buffers. scale = dynamic resolution (0.5..1)
  resize(cssW, cssH, dpr) {
    if (!this.ok) return; this.cssW = cssW; this.cssH = cssH; this.dpr = dpr;
    const W = Math.max(2, Math.round(cssW * dpr)), H = Math.max(2, Math.round(cssH * dpr));
    this.canvas.width = W; this.canvas.height = H; this.canvas.style.width = cssW + 'px'; this.canvas.style.height = cssH + 'px';
    this.rebuild();
  }
  rebuild() {
    const W = Math.max(2, Math.round(this.cssW * this.dpr * this.scale)), H = Math.max(2, Math.round(this.cssH * this.dpr * this.scale));
    if (this.fb && this.w === W && this.h === H) return;
    if (this.fb) { this.free(this.fb.scene); this.fb.mips.forEach((m) => this.free(m)); this.fb.ups.forEach((m) => this.free(m)); this.free(this.fb.sA); this.free(this.fb.sB); this.free(this.fb.sC); }
    this.w = W; this.h = H; const mips = [], ups = []; let w = W, h = H;
    for (let i = 0; i < 6; i++) { w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); mips.push(this.target(w, h)); }
    for (let i = 0; i < 5; i++) ups.push(this.target(mips[i].w, mips[i].h));
    const sw = mips[0].w, sh = mips[0].h;
    this.fb = { scene: this.target(W, H), mips, ups, sA: this.target(sw, sh), sB: this.target(sw, sh), sC: this.target(sw, sh) };
  }
  setScale(s) { s = Math.max(0.45, Math.min(1, s)); if (Math.abs(s - this.scale) < 0.01) return; this.scale = s; this.rebuild(); }
  setBackground(cv) {
    const gl = this.gl; if (!this.ok) return; this.bgTex = this.bgTex || gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.bgTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  }
  // ---- per frame ----
  begin(dim = 1) {
    const gl = this.gl; gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb.scene.fb); gl.viewport(0, 0, this.w, this.h); gl.bindVertexArray(this.vao);
    gl.disable(gl.BLEND); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    if (this.bgTex) { gl.useProgram(this.pBg); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.bgTex); gl.uniform1i(this.uBg.u_bg, 0); gl.uniform1f(this.uBg.u_dim, dim); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  // g: { stone: {planes, frost, inc}, x, y, r (css px half-size), rot (3x3 gem→world), ri, disp, sig, tint, rb, exposure, gfrost, bounces, alpha }
  gem(g, target) {
    const gl = this.gl, u = this.uGem; const k = target ? 1 : this.dpr * this.scale; const tw = target ? target.w : this.w, th = target ? target.h : this.h;
    gl.useProgram(this.pGem);
    const S = g.stone; const np = Math.min(MAXP, S.planes.length);
    if (S._buf !== S.ver || !S._pl) { // pack uniforms once per stone version
      S._pl = new Float32Array(MAXP * 4); S._fr = new Float32Array(MAXP); S._inc = new Float32Array(MAXI * 8);
      for (let i = 0; i < np; i++) { const p = S.planes[i]; S._pl.set([p.n[0], p.n[1], p.n[2], p.d], i * 4); S._fr[i] = S.frost ? S.frost[i] || 0 : 0; }
      const inc = S.inc || []; for (let i = 0; i < Math.min(MAXI, inc.length); i++) { const c = inc[i]; S._inc.set([c.p[0], c.p[1], c.p[2], c.r, c.kind === 'feather' ? 1 : 0, c.vis === undefined ? 1 : c.vis, 0, 0], i * 8); }
      S._buf = S.ver;
    }
    gl.uniform4fv(u.u_pl, S._pl); gl.uniform4fv(u.u_fr, S._fr); gl.uniform4fv(u.u_inc, S._inc);
    gl.uniform1i(u.u_np, np); gl.uniform1i(u.u_ni, Math.min(MAXI, (S.inc || []).length)); gl.uniform1i(u.u_bounces, g.bounces || this.bounces);
    const px = g.x * k, py = th - g.y * k, pr = g.r * k;
    gl.uniform4f(u.u_rect, px, py, pr, pr); gl.uniform2f(u.u_res, tw, th);
    gl.uniformMatrix3fv(u.u_rot, true, g.rot);
    gl.uniform4f(u.u_opt, g.ri, g.disp, g.exposure || 1, g.gfrost || 0);
    gl.uniform3fv(u.u_sig, g.sig || [0, 0, 0]); gl.uniform3fv(u.u_tint, g.tint || [1, 1, 1]);
    const rb = g.rb || 1.35; gl.uniform4f(u.u_cam, rb, g.cam || rb * 7, (2 * rb) / Math.max(4, 2 * pr), g.bound || rb * 1.2);
    gl.uniform4f(u.u_fx, g.grain || 7, g.light === undefined ? 1 : g.light, g.alpha === undefined ? 1 : g.alpha, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  end(opt = {}) {
    const gl = this.gl; const F = this.fb; gl.disable(gl.BLEND); gl.bindVertexArray(this.vao);
    const pass = (prog, dst, bind) => { gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fb : null); gl.viewport(0, 0, dst ? dst.w : this.canvas.width, dst ? dst.h : this.canvas.height); gl.useProgram(prog); bind(); gl.drawArrays(gl.TRIANGLES, 0, 3); };
    const tex = (unit, t, loc) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(loc, unit); };
    let src = F.scene;
    for (let i = 0; i < F.mips.length; i++) { const dst = F.mips[i]; pass(this.pDown, dst, () => { tex(0, src.tex, this.uDown.u_src); gl.uniform2f(this.uDown.u_tx, 1 / src.w, 1 / src.h); gl.uniform1f(this.uDown.u_th, opt.threshold || 1.6); gl.uniform1f(this.uDown.u_first, i === 0 ? 1 : 0); }); src = dst; }
    for (let i = F.mips.length - 2; i >= 0; i--) { const dst = F.ups[i]; const lower = i === F.mips.length - 2 ? F.mips[i + 1] : F.ups[i + 1];
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ZERO);
      pass(this.pUp, dst, () => { tex(0, lower.tex, this.uUp.u_src); gl.uniform2f(this.uUp.u_tx, 1 / lower.w, 1 / lower.h); });
      gl.blendFunc(gl.ONE, gl.ONE); pass(this.pDown, dst, () => { tex(0, F.mips[i].tex, this.uDown.u_src); gl.uniform2f(this.uDown.u_tx, 0.5 / F.mips[i].w, 0.5 / F.mips[i].h); gl.uniform1f(this.uDown.u_first, 0); }); gl.disable(gl.BLEND); }
    // light streaks from the first (thresholded) mip
    const ss = this.streaks && opt.streak !== 0 ? (opt.streak || 0.5) : 0;
    if (ss > 0) {
      const ang = opt.streakAng === undefined ? 0.38 : opt.streakAng; const m0 = F.mips[0];
      // three passes per direction (m0 → out → sC → out) with growing step: long, thin, smooth rays
      for (const [dir, out] of [[[Math.cos(ang), Math.sin(ang)], F.sA], [[-Math.sin(ang), Math.cos(ang)], F.sB]]) {
        const chain = [[m0, out], [out, F.sC], [F.sC, out]];
        chain.forEach(([r, w], it) => pass(this.pStreak, w, () => { tex(0, r.tex, this.uStreak.u_src); gl.uniform2f(this.uStreak.u_dir, dir[0] / m0.w, dir[1] / m0.h); gl.uniform1f(this.uStreak.u_step, Math.pow(3.4, it)); gl.uniform1f(this.uStreak.u_fall, 0.84); }));
      }
    }
    pass(this.pComp, null, () => { tex(0, F.scene.tex, this.uComp.u_scene); tex(1, F.ups[0].tex, this.uComp.u_bloom); tex(2, F.sA.tex, this.uComp.u_s1); tex(3, F.sB.tex, this.uComp.u_s2);
      gl.uniform1f(this.uComp.u_bs, opt.bloom || 0.55); gl.uniform1f(this.uComp.u_ss, ss); gl.uniform1f(this.uComp.u_exp, opt.exposure || 1); gl.uniform2f(this.uComp.u_res, this.canvas.width, this.canvas.height); gl.uniform1f(this.uComp.u_time, opt.time || 0); gl.uniform1f(this.uComp.u_vig, opt.vignette === undefined ? 0.5 : opt.vignette); });
  }
  // render one gem to a small transparent image (inventory cards, certificates, codex)
  thumbnail(g, size = 128) {
    const gl = this.gl; if (!this.ok) return null;
    if (!this.thumbT || this.thumbT.w !== size) { this.free(this.thumbT); this.free(this.thumbL); this.thumbT = this.target(size, size); this.thumbL = this.target(size, size, false); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.thumbT.fb); gl.viewport(0, 0, size, size); gl.bindVertexArray(this.vao); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.disable(gl.BLEND);
    this.gem({ ...g, x: size / 2, y: size / 2, r: size / 2 }, this.thumbT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.thumbL.fb); gl.viewport(0, 0, size, size); gl.useProgram(this.pThumb); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.thumbT.tex); gl.uniform1i(this.uThumb.u_src, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
    const px = new Uint8Array(size * size * 4); gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const cv = document.createElement('canvas'); cv.width = cv.height = size; const c = cv.getContext('2d'); const im = c.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const s = ((size - 1 - y) * size + x) * 4, d = (y * size + x) * 4; const a = px[s + 3]; im.data[d] = a ? Math.min(255, (px[s] * 255) / a) : 0; im.data[d + 1] = a ? Math.min(255, (px[s + 1] * 255) / a) : 0; im.data[d + 2] = a ? Math.min(255, (px[s + 2] * 255) / a) : 0; im.data[d + 3] = a; }
    c.putImageData(im, 0, 0); return cv;
  }
}
