// Procedural bots. A species' chassis sets the silhouette; its elements colour it; rarity lights its eyes and
// scales it up a little. Moving parts (rotors, wheels, legs, rings) animate while it wanders its bay.
import * as THREE from 'three';
import { Kit, shade } from './kit';
import { SPECIES } from '../data/species';
import { ELEMENTS } from '../data/elements';
import { RARITIES, RARITY_ORDER } from '../data/rarities';
export interface BotModel { group: THREE.Group; hover: number; anim: (t: number, moving: boolean) => void; }
const DARK = '#2c3340', STEEL = '#cdd5df';
export function buildBot(sp: string, lvl = 1): BotModel {
  const d = SPECIES[sp]; const c1 = ELEMENTS[d.el[0]].color, c2 = d.el[1] ? ELEMENTS[d.el[1]].color : shade(c1, -0.35), eye = RARITIES[d.rarity].color;
  const g = new THREE.Group(); const k = new Kit(); const parts: THREE.Object3D[] = []; let hover = 0;
  const add = (o: THREE.Object3D) => { g.add(o); parts.push(o); return o; };
  const sub = (fn: (kk: Kit) => void) => { const kk = new Kit(); fn(kk); return kk.build(); };
  let anim: (t: number, moving: boolean) => void = () => {};
  switch (d.chassis) {
    case 'orb': { hover = 0.55; k.sphere(0.26, c1, 0, 0, 0, { w: 14, h: 10 }); k.sphere(0.27, c2, 0, 0, 0, { w: 14, h: 4, theta: Math.PI * 0.18 }); k.sphere(0.09, eye, 0, 0.02, 0.22, { glow: true, w: 8, h: 6 }); k.sphere(0.05, '#ffffff', 0.02, 0.05, 0.27, { glow: true, w: 6, h: 4 });
      const ring = add(sub((kk) => kk.add(new THREE.TorusGeometry(0.38, 0.025, 5, 28), c2))); ring.rotation.x = Math.PI / 2.4;
      anim = (t) => { ring.rotation.z = t * 1.8; }; break; }
    case 'drone': { hover = 0.6; k.box(0.34, 0.14, 0.34, c1, 0, -0.07, 0); k.sphere(0.16, c2, 0, 0.05, 0, { theta: Math.PI / 2, w: 10, h: 5 }); k.box(0.12, 0.05, 0.02, eye, 0, -0.01, 0.18, { glow: true });
      const rotors: THREE.Object3D[] = []; for (const [x, z] of [[0.28, 0.28], [-0.28, 0.28], [0.28, -0.28], [-0.28, -0.28]]) { k.box(0.24, 0.03, 0.04, DARK, x / 2, 0, z / 2, { ry: Math.atan2(x, z) });
        const r = add(sub((kk) => { kk.cyl(0.13, 0.13, 0.012, 10, STEEL, 0, 0, 0, { glass: true }); kk.box(0.24, 0.01, 0.03, DARK); })); r.position.set(x, 0.02, z); rotors.push(r); }
      anim = (t) => rotors.forEach((r, i) => { r.rotation.y = t * 30 * (i % 2 ? 1 : -1); }); break; }
    case 'rover': { k.box(0.5, 0.18, 0.36, c1, 0, 0.12, 0); k.box(0.3, 0.1, 0.3, c2, -0.05, 0.3, 0); k.cyl(0.02, 0.02, 0.22, 5, STEEL, 0.12, 0.3, 0); k.box(0.14, 0.08, 0.08, DARK, 0.12, 0.52, 0); k.box(0.02, 0.04, 0.06, eye, 0.19, 0.53, 0, { glow: true });
      const wheels: THREE.Object3D[] = []; for (const [x, z] of [[0.17, 0.2], [-0.17, 0.2], [0.17, -0.2], [-0.17, -0.2]]) { const w = add(sub((kk) => kk.cyl(0.09, 0.09, 0.07, 10, DARK, 0, -0.035, 0, { rx: Math.PI / 2 }))); w.position.set(x, 0.09, z); wheels.push(w); }
      if (sp === 'digger') k.add(new THREE.ConeGeometry(0.08, 0.22, 7), STEEL, 0.32, 0.18, 0, { rz: -Math.PI / 2 });
      if (sp === 'ember') k.cyl(0.035, 0.035, 0.2, 5, DARK, 0.25, 0.28, 0, { rz: -0.9 });
      anim = (t, mv) => wheels.forEach((w) => { w.rotation.z = mv ? -t * 8 : 0; }); break; }
    case 'walker': { const body = add(sub((kk) => { kk.box(0.36, 0.22, 0.3, c1, 0, 0, 0); kk.box(0.3, 0.06, 0.26, c2, 0, 0.22, 0); kk.box(0.14, 0.05, 0.02, eye, 0.06, 0.12, 0.16, { glow: true }); kk.box(0.06, 0.05, 0.02, eye, -0.08, 0.12, 0.16, { glow: true }); }));
      body.position.y = 0.34; const legs: THREE.Object3D[] = []; for (const x of [0.11, -0.11]) { const l = add(sub((kk) => { kk.box(0.07, 0.32, 0.07, DARK, 0, -0.32, 0); kk.box(0.13, 0.04, 0.16, c2, 0, -0.34, 0.02); })); l.position.set(x, 0.36, 0); legs.push(l); }
      anim = (t, mv) => { legs.forEach((l, i) => { l.rotation.x = mv ? Math.sin(t * 9 + i * Math.PI) * 0.5 : 0; }); body.position.y = 0.34 + (mv ? Math.abs(Math.sin(t * 9)) * 0.03 : 0); }; break; }
    case 'android': { const body = add(sub((kk) => { kk.box(0.24, 0.3, 0.16, c1, 0, 0, 0); kk.box(0.26, 0.06, 0.18, c2, 0, 0.24, 0); kk.sphere(0.12, STEEL, 0, 0.42, 0, { w: 10, h: 8 }); kk.box(0.18, 0.05, 0.05, eye, 0, 0.43, 0.09, { glow: true }); kk.sphere(0.035, eye, 0, 0.12, 0.085, { glow: true, w: 6, h: 4 }); }));
      body.position.y = 0.3; const limbs: THREE.Object3D[] = [];
      for (const [x, y, len, col] of [[0.16, 0.56, 0.26, c2], [-0.16, 0.56, 0.26, c2], [0.07, 0.3, 0.3, DARK], [-0.07, 0.3, 0.3, DARK]] as [number, number, number, string][]) { const l = add(sub((kk) => kk.box(0.07, len, 0.07, col, 0, -len, 0))); l.position.set(x, y, 0); limbs.push(l); }
      if (sp === 'sprout') k.add(new THREE.IcosahedronGeometry(0.08, 0), '#5fdc5a', 0, 0.86, 0);
      anim = (t, mv) => { limbs.forEach((l, i) => { l.rotation.x = mv ? Math.sin(t * 8 + (i % 2) * Math.PI + (i > 1 ? Math.PI : 0)) * 0.55 : Math.sin(t * 1.5 + i) * 0.05; }); }; break; }
    case 'mech': { const body = add(sub((kk) => { kk.box(0.46, 0.34, 0.34, c1, 0, 0, 0); kk.box(0.2, 0.12, 0.2, c2, 0, 0.34, 0); kk.box(0.16, 0.05, 0.02, eye, 0, 0.4, 0.105, { glow: true });
        for (const x of [0.29, -0.29]) { kk.box(0.14, 0.14, 0.2, c2, x, 0.16, 0); kk.box(0.11, 0.3, 0.11, DARK, x, -0.14, 0.02); } }));
      body.position.y = 0.36; const legs: THREE.Object3D[] = []; for (const x of [0.13, -0.13]) { const l = add(sub((kk) => { kk.box(0.12, 0.34, 0.12, DARK, 0, -0.34, 0); kk.box(0.18, 0.05, 0.22, c2, 0, -0.36, 0.02); })); l.position.set(x, 0.38, 0); legs.push(l); }
      anim = (t, mv) => { legs.forEach((l, i) => { l.rotation.x = mv ? Math.sin(t * 5 + i * Math.PI) * 0.35 : 0; }); body.rotation.y = mv ? Math.sin(t * 5) * 0.06 : 0; }; break; }
    case 'crawler': { const body = add(sub((kk) => { kk.sphere(0.16, c1, 0.18, 0, 0, { w: 10, h: 7 }); kk.sphere(0.13, c2, 0, 0, 0, { w: 10, h: 7 }); kk.sphere(0.11, c1, -0.16, 0, 0, { w: 10, h: 7 });
        kk.sphere(0.035, eye, 0.31, 0.04, 0.06, { glow: true, w: 6, h: 4 }); kk.sphere(0.035, eye, 0.31, 0.04, -0.06, { glow: true, w: 6, h: 4 }); }));
      body.position.y = 0.2; const legs: THREE.Object3D[] = []; for (let i = 0; i < 6; i++) { const x = 0.16 - (i >> 1) * 0.16, s = i % 2 ? 1 : -1; const l = add(sub((kk) => kk.box(0.03, 0.03, 0.24, DARK, 0, 0, 0.1 * s))); l.position.set(x, 0.18, 0.08 * s); l.rotation.x = 0.5 * s; legs.push(l); }
      anim = (t, mv) => legs.forEach((l, i) => { l.rotation.y = mv ? Math.sin(t * 14 + i) * 0.35 : 0; }); break; }
  }
  const b = k.build('bot'); g.add(b); if (d.chassis === 'orb' || d.chassis === 'drone') { b.position.y = 0; }
  // hovering chassis float above a soft glow; everything sits on y=0 otherwise
  const inner = new THREE.Group(); while (g.children.length) inner.add(g.children[0]); inner.position.y = hover; g.add(inner);
  if (hover) { const sh = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), new THREE.MeshBasicMaterial({ color: ELEMENTS[d.el[0]].glow, transparent: true, opacity: 0.35, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; sh.name = 'hoverGlow'; g.add(sh); }
  const s = 0.95 + RARITY_ORDER.indexOf(d.rarity) * 0.08 + Math.min(0.25, (lvl - 1) * 0.008); g.scale.setScalar(s);
  // rank ring under seasoned robots: bronze from level 10, silver from 20, gold at the top (30)
  if (lvl >= 10) { const col = lvl >= 30 ? '#ffcb3c' : lvl >= 20 ? '#dfe6ee' : '#c98a4a'; const rr = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.29, 24), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); rr.rotation.x = -Math.PI / 2; rr.position.y = 0.025; rr.name = 'rank'; g.add(rr); }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
  return { group: g, hover, anim: (t, mv) => { anim(t, mv); if (hover) inner.position.y = hover + Math.sin(t * 2.2 + lvl) * 0.05; } };
}
