// Procedural model kit. Parts are added with a colour; build() merges them into three meshes (lit body, unlit
// glow, glass) so a whole building costs 2-3 draw calls: the difference between 60 fps and a slideshow on a phone.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export interface PartOpts { rx?: number; ry?: number; rz?: number; sx?: number; sy?: number; sz?: number; glow?: boolean; glass?: boolean; }
const tmpC = new THREE.Color();
export const MATS = {
  body: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.62, metalness: 0.12 }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
  glass: new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.38, roughness: 0.08, metalness: 0.2, depthWrite: false }),
  ghostOk: new THREE.MeshBasicMaterial({ color: 0x5dff9a, transparent: true, opacity: 0.45, depthWrite: false }),
  ghostBad: new THREE.MeshBasicMaterial({ color: 0xff5a6a, transparent: true, opacity: 0.45, depthWrite: false }),
};
export class Kit {
  private parts: Record<'body' | 'glow' | 'glass', THREE.BufferGeometry[]> = { body: [], glow: [], glass: [] };
  add(g: THREE.BufferGeometry, color: THREE.ColorRepresentation, x = 0, y = 0, z = 0, o: PartOpts = {}) {
    let geo = g.index ? g.toNonIndexed() : g.clone(); if (geo.attributes.uv) geo.deleteAttribute('uv'); if (geo.attributes.uv1) geo.deleteAttribute('uv1');
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0)), new THREE.Vector3(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1));
    geo.applyMatrix4(m); tmpC.set(color); const n = geo.attributes.position.count; const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = tmpC.r; col[i * 3 + 1] = tmpC.g; col[i * 3 + 2] = tmpC.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); this.parts[o.glow ? 'glow' : o.glass ? 'glass' : 'body'].push(geo); g.dispose(); return this;
  }
  box(w: number, h: number, d: number, c: THREE.ColorRepresentation, x = 0, y = 0, z = 0, o: PartOpts = {}) { return this.add(new THREE.BoxGeometry(w, h, d), c, x, y + h / 2, z, o); }
  cyl(rt: number, rb: number, h: number, seg: number, c: THREE.ColorRepresentation, x = 0, y = 0, z = 0, o: PartOpts = {}) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y + h / 2, z, o); }
  sphere(r: number, c: THREE.ColorRepresentation, x = 0, y = 0, z = 0, o: PartOpts & { w?: number; h?: number; phi?: number; theta?: number } = {}) {
    return this.add(new THREE.SphereGeometry(r, o.w || 10, o.h || 7, 0, Math.PI * 2, 0, o.theta || Math.PI), c, x, y, z, o); }
  build(name = ''): THREE.Group {
    const g = new THREE.Group(); g.name = name;
    for (const k of ['body', 'glow', 'glass'] as const) { const ps = this.parts[k]; if (!ps.length) continue; const merged = mergeGeometries(ps, false); ps.forEach((p) => p.dispose()); if (!merged) continue;
      const mesh = new THREE.Mesh(merged, MATS[k]); mesh.castShadow = k === 'body'; mesh.receiveShadow = k === 'body'; mesh.userData.bucket = k; g.add(mesh); }
    return g;
  }
}
// small colour helpers
export const shade = (c: string, k: number) => { const x = new THREE.Color(c); if (k < 0) x.lerp(new THREE.Color(0x000000), -k); else x.lerp(new THREE.Color(0xffffff), k); return '#' + x.getHexString(); };
export const mix = (a: string, b: string, k: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();
