// Thumbnail studio: renders a building or bot model into a small transparent image (cached) for shop cards,
// bot portraits and reward reveals, using the main renderer and an offscreen target.
import * as THREE from 'three';
import { buildModel, Look } from './models';
import { rocketModel } from './rocket';
import type { Design } from '../data/rockets';
import { buildBot } from './botmodels';
import { BUILDINGS } from '../data/buildings';
export class Studio {
  private scene = new THREE.Scene(); private cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100); private cache = new Map<string, string>(); private rt: THREE.WebGLRenderTarget; private size = 192;
  constructor(private renderer: THREE.WebGLRenderer) {
    this.rt = new THREE.WebGLRenderTarget(this.size, this.size, { samples: 4 }); this.rt.texture.colorSpace = THREE.SRGBColorSpace;
    const sun = new THREE.DirectionalLight('#fff3df', 2.6); sun.position.set(-3, 5, 4); this.scene.add(sun, new THREE.HemisphereLight('#cfe4ff', '#3a2a22', 1.1));
    const rim = new THREE.DirectionalLight('#7ab6ff', 0.9); rim.position.set(4, 2, -4); this.scene.add(rim);
  }
  private shoot(obj: THREE.Object3D, key: string, dist: number, h: number) {
    const hit = this.cache.get(key); if (hit) return hit; this.scene.add(obj);
    this.cam.position.set(dist * 0.7, h + dist * 0.55, dist * 0.85); this.cam.lookAt(0, h * 0.45, 0);
    const prev = this.renderer.getRenderTarget(), pc = this.renderer.getClearColor(new THREE.Color()), pa = this.renderer.getClearAlpha(), ps = this.renderer.shadowMap.enabled;
    this.renderer.setClearColor(0x000000, 0); this.renderer.setRenderTarget(this.rt); this.renderer.clear(); this.renderer.render(this.scene, this.cam);
    const px = new Uint8Array(this.size * this.size * 4); this.renderer.readRenderTargetPixels(this.rt, 0, 0, this.size, this.size, px);
    this.renderer.setRenderTarget(prev); this.renderer.setClearColor(pc, pa); this.renderer.shadowMap.enabled = ps; this.scene.remove(obj);
    const cv = document.createElement('canvas'); cv.width = cv.height = this.size; const g = cv.getContext('2d')!; const img = g.createImageData(this.size, this.size);
    for (let y = 0; y < this.size; y++) img.data.set(px.subarray((this.size - 1 - y) * this.size * 4, (this.size - y) * this.size * 4), y * this.size * 4); // flip
    g.putImageData(img, 0, 0); const url = cv.toDataURL('image/png'); this.cache.set(key, url); return url;
  }
  building(t: string, lvl: number, look: Look) { const m = buildModel(t, lvl, look); const [w, d] = BUILDINGS[t].fp; const s = Math.max(w, d);
    return this.shoot(m.group, `b|${t}|${lvl}|${look.primary}${look.accent}${look.banner.bg}${look.banner.fg}${look.banner.emblem}`, s * 1.45 + 1.2, Math.max(0.8, m.height * 0.55)); }
  rocket(d: Design, look: Look) { const m = rocketModel(d, look); m.group.rotation.y = 0.6; const h = m.height; return this.shoot(m.group, `r|${JSON.stringify(d)}|${look.accent}`, h * 1.45 + 1.2, h * 0.95); }
  bot(sp: string) { const m = buildBot(sp, 1); m.group.rotation.y = 0.5; const hg = m.group.getObjectByName('hoverGlow'); if (hg) hg.visible = false; return this.shoot(m.group, `bot|${sp}`, 1.75, 0.55); }
}
