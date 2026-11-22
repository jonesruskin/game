// WebGL2 renderer: one instanced sprite batch (premultiplied alpha; per-sprite additive factor), a baked
// background with dynamic flash lighting, HDR bloom (13-tap down / tent up mip chain) and a composite pass
// with water reflections, chromatic aberration, ACES tone-mapping, vignette and dither.
const FS_TRI = `#version 300 es
out vec2 v_uv; void main(){ vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); v_uv = p; gl_Position = vec4(p*2.0-1.0, 0.0, 1.0); }`;
const VS_SPRITE = `#version 300 es
layout(location=0) in vec2 a_c; layout(location=1) in vec4 i_p; layout(location=2) in vec4 i_col; layout(location=3) in vec4 i_uv; layout(location=4) in vec2 i_r;
uniform vec4 u_xf; out vec2 v_uv; out vec4 v_col; out float v_add;
void main(){ float c = cos(i_r.x), s = sin(i_r.x); vec2 p = vec2(a_c.x*i_p.z, a_c.y*i_p.w); p = vec2(p.x*c - p.y*s, p.x*s + p.y*c) + i_p.xy;
  gl_Position = vec4(p*u_xf.xy + u_xf.zw, 0.0, 1.0); v_uv = mix(i_uv.xy, i_uv.zw, a_c*0.5+0.5); v_col = i_col; v_add = i_r.y; }`;
const FS_SPRITE = `#version 300 es
precision mediump float; uniform sampler2D u_tex; in vec2 v_uv; in vec4 v_col; in float v_add; out vec4 o;
void main(){ vec4 t = texture(u_tex, v_uv); o = vec4(t.rgb*v_col.rgb*v_col.a, t.a*v_col.a*(1.0-v_add)); }`;
const FS_BG = `#version 300 es
precision highp float; uniform sampler2D u_bg; uniform sampler2D u_mask; uniform vec4 u_flash; uniform vec2 u_fpos; uniform vec2 u_res; uniform float u_time; uniform vec3 u_amb;
in vec2 v_uv; out vec4 o;
void main(){ vec2 tuv = vec2(v_uv.x, 1.0-v_uv.y); vec3 c = texture(u_bg, tuv).rgb; float sky = texture(u_mask, tuv).r;
  vec2 d = (v_uv - u_fpos)*vec2(u_res.x/u_res.y, 1.0); float fl = u_flash.a*exp(-dot(d,d)*1.6);
  c += u_flash.rgb*fl*(sky*0.17 + (1.0-sky)*0.05) + u_amb*sky;
  o = vec4(c, 1.0); }`;
const FS_DOWN = `#version 300 es
precision mediump float; uniform sampler2D u_src; uniform vec2 u_tx; uniform float u_th; uniform float u_first; in vec2 v_uv; out vec4 o;
vec3 S(float x, float y){ return texture(u_src, v_uv + vec2(x,y)*u_tx).rgb; }
void main(){ vec3 c = S(0.,0.)*0.125 + (S(-2.,2.)+S(2.,2.)+S(-2.,-2.)+S(2.,-2.))*0.03125 + (S(0.,2.)+S(-2.,0.)+S(2.,0.)+S(0.,-2.))*0.0625 + (S(-1.,1.)+S(1.,1.)+S(-1.,-1.)+S(1.,-1.))*0.125;
  if (u_first > 0.5) { float br = max(c.r, max(c.g, c.b)); float k = 0.25; float soft = clamp(br - u_th + k, 0.0, 2.0*k); soft = soft*soft/(4.0*k + 1e-4); c *= max(soft, br - u_th)/max(br, 1e-4); c = min(c, vec3(24.0)); }
  o = vec4(c, 1.0); }`;
const FS_UP = `#version 300 es
precision mediump float; uniform sampler2D u_src; uniform vec2 u_tx; in vec2 v_uv; out vec4 o;
void main(){ vec2 d = u_tx; vec3 s = texture(u_src, v_uv + vec2(-d.x, d.y)).rgb + 2.0*texture(u_src, v_uv + vec2(0.0, d.y)).rgb + texture(u_src, v_uv + d).rgb
 + 2.0*texture(u_src, v_uv + vec2(-d.x, 0.0)).rgb + 4.0*texture(u_src, v_uv).rgb + 2.0*texture(u_src, v_uv + vec2(d.x, 0.0)).rgb
 + texture(u_src, v_uv - d).rgb + 2.0*texture(u_src, v_uv + vec2(0.0, -d.y)).rgb + texture(u_src, v_uv + vec2(d.x, -d.y)).rgb; o = vec4(s/16.0, 1.0); }`;
const FS_COMP = `#version 300 es
precision highp float; uniform sampler2D u_scene; uniform sampler2D u_bloom; uniform float u_bs; uniform float u_wy; uniform float u_time; uniform float u_ab; uniform float u_exp; uniform vec2 u_res; uniform vec3 u_wtint; uniform float u_flash;
in vec2 v_uv; out vec4 o;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
void main(){ vec2 uv = v_uv; vec2 dir = uv - 0.5; float ab = u_ab*0.010;
  vec3 sc = ab > 0.0001 ? vec3(texture(u_scene, uv + dir*ab).r, texture(u_scene, uv).g, texture(u_scene, uv - dir*ab).b) : texture(u_scene, uv).rgb;
  vec3 col = sc + texture(u_bloom, uv).rgb*u_bs;
  if (uv.y < u_wy) { float depth = u_wy - uv.y; float ry = u_wy + depth*1.15;
    float wob = sin(uv.y*u_res.y*0.12 + u_time*2.3)*0.0035 + sin(uv.y*u_res.y*0.037 - u_time*1.1)*0.0025;
    vec2 ruv = vec2(uv.x + wob*(1.0 + depth*10.0), min(ry, 0.999));
    vec3 refl = texture(u_scene, ruv).rgb + texture(u_bloom, ruv).rgb*u_bs*1.3;
    float fade = exp(-depth*4.0) * smoothstep(0.0, 0.004, depth);
    col += refl*0.5*fade*u_wtint; }
  col *= u_exp*(1.0 + u_flash*0.12);
  col = aces(col);
  vec2 q = uv - 0.5; col *= 1.0 - dot(q*vec2(1.0, 1.25), q*vec2(1.0, 1.25))*0.6;
  float n = fract(sin(dot(uv*u_res + fract(u_time)*61.0, vec2(12.9898, 78.233)))*43758.5453);
  o = vec4(col + (n - 0.5)*(2.0/255.0), 1.0); }`;

const STRIDE = 14;
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ok = false; this.lowFx = false; this.renderScale = 1;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.ok = false; }, false);
    canvas.addEventListener('webglcontextrestored', () => { this.init(); if (this.onRestore) this.onRestore(); }, false);
    this.init();
  }
  init() {
    const gl = this.canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) { this.ok = false; return; }
    this.gl = gl; this.hdr = !!gl.getExtension('EXT_color_buffer_float'); gl.getExtension('OES_texture_float_linear');
    this.pSprite = this.prog(VS_SPRITE, FS_SPRITE); this.pBg = this.prog(FS_TRI, FS_BG); this.pDown = this.prog(FS_TRI, FS_DOWN); this.pUp = this.prog(FS_TRI, FS_UP); this.pComp = this.prog(FS_TRI, FS_COMP);
    // sprite batch
    this.cap = 48000; this.data = new Float32Array(this.cap * STRIDE); this.n = 0;
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.ibuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.ibuf); gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    const B = STRIDE * 4; [[1, 4, 0], [2, 4, 16], [3, 4, 32], [4, 2, 48]].forEach(([loc, n, off]) => { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, B, off); gl.vertexAttribDivisor(loc, 1); });
    gl.bindVertexArray(null);
    this.emptyVao = gl.createVertexArray();
    this.uSprite = { xf: gl.getUniformLocation(this.pSprite, 'u_xf'), tex: gl.getUniformLocation(this.pSprite, 'u_tex') };
    this.U = (p, n) => gl.getUniformLocation(p, n);
    this.atlasTex = null; this.bgTex = null; this.maskTex = null; this.w = 0; this.h = 0; this.fbos = null;
    this.ok = true;
  }
  prog(vs, fs) {
    const gl = this.gl; const mk = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p;
  }
  texFromCanvas(cv, tex, premul = true, mip = false) {
    const gl = this.gl; tex = tex || gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premul); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (mip) gl.generateMipmap(gl.TEXTURE_2D); return tex;
  }
  setAtlas(cv) { this.atlasTex = this.texFromCanvas(cv, this.atlasTex, true, true); }
  setBackground(colorCv, maskCv) { this.bgTex = this.texFromCanvas(colorCv, this.bgTex, false); this.maskTex = this.texFromCanvas(maskCv, this.maskTex, false); }
  makeTarget(w, h) {
    const gl = this.gl; const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    if (this.hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE && this.hdr) { this.hdr = false; gl.deleteFramebuffer(fb); gl.deleteTexture(tex); return this.makeTarget(w, h); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); return { tex, fb, w, h };
  }
  resize(w, h) {
    if (!this.ok) return; const gl = this.gl;
    if (this.fbos) { for (const t of [this.fbos.scene, ...this.fbos.mips]) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); } }
    this.w = w; this.h = h; const sw = Math.max(2, Math.round(w * this.renderScale)), sh = Math.max(2, Math.round(h * this.renderScale));
    const scene = this.makeTarget(sw, sh); const mips = []; let mw = sw >> 1, mh = sh >> 1; const levels = this.lowFx ? 4 : 6;
    for (let i = 0; i < levels && mw >= 4 && mh >= 4; i++) { mips.push(this.makeTarget(mw, mh)); mw >>= 1; mh >>= 1; }
    this.fbos = { scene, mips };
  }
  // ---- batch
  begin() { this.n = 0; this.groups = []; this.gStart = 0; }
  // x,y center; hw,hh half extents; rot; r,g,b (HDR ok), a; uv [u0,v0,u1,v1]; add 0..1
  push(x, y, hw, hh, rot, r, g, b, a, uv, add) {
    if (this.n >= this.cap) return; const d = this.data, o = this.n++ * STRIDE;
    d[o] = x; d[o + 1] = y; d[o + 2] = hw; d[o + 3] = hh; d[o + 4] = r; d[o + 5] = g; d[o + 6] = b; d[o + 7] = a; d[o + 8] = uv[0]; d[o + 9] = uv[1]; d[o + 10] = uv[2]; d[o + 11] = uv[3]; d[o + 12] = rot; d[o + 13] = add;
  }
  group(xf) { if (this.n > this.gStart) { this.groups.push({ xf: this.curXf, start: this.gStart, count: this.n - this.gStart }); } this.gStart = this.n; this.curXf = xf; }
  // ---- frame
  render(o) {
    if (!this.ok || !this.fbos) return; const gl = this.gl; const F = this.fbos;
    this.group(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, F.scene.fb); gl.viewport(0, 0, F.scene.w, F.scene.h); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    // background
    gl.useProgram(this.pBg); gl.bindVertexArray(this.emptyVao);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.bgTex); gl.uniform1i(this.U(this.pBg, 'u_bg'), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.maskTex); gl.uniform1i(this.U(this.pBg, 'u_mask'), 1);
    gl.uniform4fv(this.U(this.pBg, 'u_flash'), o.flash); gl.uniform2fv(this.U(this.pBg, 'u_fpos'), o.flashPos); gl.uniform2f(this.U(this.pBg, 'u_res'), F.scene.w, F.scene.h); gl.uniform1f(this.U(this.pBg, 'u_time'), o.time); gl.uniform3fv(this.U(this.pBg, 'u_amb'), o.ambient || [0, 0, 0]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // sprites
    if (this.n) {
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(this.pSprite); gl.bindVertexArray(this.vao); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.atlasTex); gl.uniform1i(this.uSprite.tex, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.ibuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data, 0, this.n * STRIDE);
      const B = STRIDE * 4; // no base-instance in WebGL2: re-point the instance attributes at each group's slice
      for (const g of this.groups) { if (!g.xf || !g.count) continue; const base = g.start * B; gl.vertexAttribPointer(1, 4, gl.FLOAT, false, B, base); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, B, base + 16); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, B, base + 32); gl.vertexAttribPointer(4, 2, gl.FLOAT, false, B, base + 48); gl.uniform4fv(this.uSprite.xf, g.xf); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, g.count); }
    }
    // bloom
    gl.disable(gl.BLEND); gl.bindVertexArray(this.emptyVao); const mips = F.mips;
    gl.useProgram(this.pDown); gl.uniform1i(this.U(this.pDown, 'u_src'), 0); gl.activeTexture(gl.TEXTURE0);
    let src = F.scene;
    for (let i = 0; i < mips.length; i++) {
      const m = mips[i]; gl.bindFramebuffer(gl.FRAMEBUFFER, m.fb); gl.viewport(0, 0, m.w, m.h); gl.bindTexture(gl.TEXTURE_2D, src.tex);
      gl.uniform2f(this.U(this.pDown, 'u_tx'), 1 / src.w, 1 / src.h); gl.uniform1f(this.U(this.pDown, 'u_first'), i === 0 ? 1 : 0); gl.uniform1f(this.U(this.pDown, 'u_th'), this.hdr ? o.threshold : o.threshold * 0.72);
      gl.drawArrays(gl.TRIANGLES, 0, 3); src = m;
    }
    gl.useProgram(this.pUp); gl.uniform1i(this.U(this.pUp, 'u_src'), 0); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = mips.length - 1; i > 0; i--) { const s = mips[i], d = mips[i - 1]; gl.bindFramebuffer(gl.FRAMEBUFFER, d.fb); gl.viewport(0, 0, d.w, d.h); gl.bindTexture(gl.TEXTURE_2D, s.tex); gl.uniform2f(this.U(this.pUp, 'u_tx'), 1 / s.w, 1 / s.h); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    gl.disable(gl.BLEND);
    // composite
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.w, this.h); gl.useProgram(this.pComp);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, F.scene.tex); gl.uniform1i(this.U(this.pComp, 'u_scene'), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mips.length ? mips[0].tex : F.scene.tex); gl.uniform1i(this.U(this.pComp, 'u_bloom'), 1);
    gl.uniform1f(this.U(this.pComp, 'u_bs'), mips.length ? o.bloom : 0); gl.uniform1f(this.U(this.pComp, 'u_wy'), o.waterY); gl.uniform1f(this.U(this.pComp, 'u_time'), o.time); gl.uniform1f(this.U(this.pComp, 'u_ab'), o.aberration);
    gl.uniform1f(this.U(this.pComp, 'u_exp'), o.exposure); gl.uniform2f(this.U(this.pComp, 'u_res'), this.w, this.h); gl.uniform3fv(this.U(this.pComp, 'u_wtint'), o.waterTint); gl.uniform1f(this.U(this.pComp, 'u_flash'), o.globalFlash || 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3); gl.activeTexture(gl.TEXTURE0);
  }
}
// world → clip transform for a given screen mapping (css px): X = ox + x*s
export function xfFor(ox, oy, s, cssW, cssH) { return new Float32Array([(2 * s) / cssW, (-2 * s) / cssH, (2 * ox) / cssW - 1, 1 - (2 * oy) / cssH]); }
