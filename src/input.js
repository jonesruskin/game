// Keyboard + mouse + touch (twin-stick with drag-to-aim, tap-to-autoaim).
import { clamp, angTo, dist } from './util.js';

export class Input {
  constructor() {
    this.keys = new Set(); this.pressed = new Set(); this.mouse = { x: 0, y: 0, down: false, moved: false };
    this.touch = false; this.move = { id: null, ox: 0, oy: 0, x: 0, y: 0 }; this.btn = {}; this.autoFire = 0; this.lastDevice = 'kb';
    this.enabled = false;
  }
  attach(canvas, touchLayer) {
    this.canvas = canvas;
    addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k) && this.enabled) e.preventDefault();
      if (!this.keys.has(k)) this.pressed.add(k); this.keys.add(k); this.lastDevice = 'kb';
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => { this.keys.clear(); this.mouse.down = false; });
    canvas.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.moved = true; });
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) this.mouse.down = true; if (e.button === 2) this.pressed.add('rmb'); this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.down = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.touchLayer = touchLayer;
    this.buildTouch(touchLayer);
  }
  buildTouch(root) {
    root.innerHTML = `
      <div class="tzone" id="tzone"></div>
      <div class="tstick" id="tstick"><div class="tknob" id="tknob"></div></div>
      <div class="tbtn tfire" data-b="fire"><span>🎯</span></div>
      <div class="tbtn tq" data-b="q"><span class="ic"></span><i class="cd"></i><b class="lv"></b></div>
      <div class="tbtn te" data-b="e"><span class="ic"></span><i class="cd"></i><b class="lv"></b></div>
      <div class="tbtn tult" data-b="ult"><span class="ic"></span><i class="cd"></i></div>
      <div class="tbtn temote" data-b="emote"><span>💬</span></div>`;
    const zone = root.querySelector('#tzone'), stick = root.querySelector('#tstick'), knob = root.querySelector('#tknob');
    this.stickEl = stick; this.knobEl = knob;
    const opts = { passive: false };
    zone.addEventListener('touchstart', (e) => { e.preventDefault(); this.touch = true; this.lastDevice = 'touch'; const t = e.changedTouches[0]; this.move = { id: t.identifier, ox: t.clientX, oy: t.clientY, x: t.clientX, y: t.clientY }; stick.style.left = t.clientX + 'px'; stick.style.top = t.clientY + 'px'; stick.classList.add('on'); knob.style.transform = 'translate(-50%,-50%)'; }, opts);
    const tmove = (e) => { for (const t of e.changedTouches) { if (t.identifier === this.move.id) { this.move.x = t.clientX; this.move.y = t.clientY; const dx = clamp(t.clientX - this.move.ox, -55, 55), dy = clamp(t.clientY - this.move.oy, -55, 55); knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; } for (const b in this.btn) { const s = this.btn[b]; if (s && s.id === t.identifier) { s.x = t.clientX; s.y = t.clientY; } } } };
    const tend = (e) => { for (const t of e.changedTouches) { if (t.identifier === this.move.id) { this.move.id = null; stick.classList.remove('on'); } for (const b in this.btn) { const s = this.btn[b]; if (s && s.id === t.identifier) { s.released = true; s.x = t.clientX; s.y = t.clientY; } } } };
    root.addEventListener('touchmove', (e) => { e.preventDefault(); tmove(e); }, opts);
    root.addEventListener('touchend', tend); root.addEventListener('touchcancel', tend);
    root.querySelectorAll('.tbtn').forEach((el) => {
      el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); this.touch = true; this.lastDevice = 'touch'; const t = e.changedTouches[0]; this.btn[el.dataset.b] = { id: t.identifier, ox: t.clientX, oy: t.clientY, x: t.clientX, y: t.clientY, t0: performance.now(), released: false }; el.classList.add('down'); }, opts);
      el.addEventListener('touchend', () => el.classList.remove('down'));
    });
  }
  setEnabled(v) { this.enabled = v; if (!v) { this.pressed.clear(); this.btn = {}; this.move.id = null; this.stickEl && this.stickEl.classList.remove('on'); } }
  clearEdges() { this.pressed.clear(); }
  // Build player's intent for the match. `r` is the renderer (screen↔world).
  apply(m, f, r) {
    const I = f.intent; I.mx = 0; I.my = 0; I.fire = false; m.aimGuide = null;
    if (!this.enabled) return;
    const K = this.keys;
    if (K.has('w') || K.has('arrowup') || K.has('z')) I.my -= 1;
    if (K.has('s') || K.has('arrowdown')) I.my += 1;
    if (K.has('a') || K.has('arrowleft')) I.mx -= 1;
    if (K.has('d') || K.has('arrowright')) I.mx += 1;
    const nearest = () => m.nearestEnemyTo(f.x, f.y, f.hero.weapon.range * 1.05, f, f, true) || m.nearestEnemyTo(f.x, f.y, f.hero.weapon.range * 1.05, f, f, false);
    const crateNear = () => { let best = null, bd = 380 * 380; for (const c of m.world.crates) { if (c.dead) continue; const d = (c.x - f.x) ** 2 + (c.y - f.y) ** 2; if (d < bd) { bd = d; best = c; } } return best; };
    if (this.lastDevice !== 'touch') {
      const w = r.screenToWorld(this.mouse.x, this.mouse.y);
      I.aim = angTo(f.x, f.y, w.x, w.y); I.ax = w.x; I.ay = w.y;
      I.fire = this.mouse.down;
      if (this.pressed.has('q')) I.cast[0] = true;
      if (this.pressed.has('e')) I.cast[1] = true;
      if (this.pressed.has('r') || this.pressed.has(' ') || this.pressed.has('rmb')) I.ult = true;
      if (this.pressed.has('1')) I.swap = 0;
      if (this.pressed.has('2')) I.swap = 1;
      if (this.pressed.has('f') && f.nearOrb) I.swap = f.abilities[0].lvl <= f.abilities[1].lvl ? 0 : 1;
      if (this.pressed.has('t')) this.emoteReq = true;
    } else {
      // movement stick
      if (this.move.id !== null) { const dx = this.move.x - this.move.ox, dy = this.move.y - this.move.oy; const l = Math.hypot(dx, dy); if (l > 8) { const k = Math.min(1, l / 50); I.mx = (dx / l) * k; I.my = (dy / l) * k; } }
      const tgt = nearest();
      const autoAim = () => { if (tgt) return { a: angTo(f.x, f.y, tgt.x, tgt.y), x: tgt.x, y: tgt.y }; const c = crateNear(); if (c) return { a: angTo(f.x, f.y, c.x, c.y), x: c.x, y: c.y }; const a = Math.hypot(I.mx, I.my) > 0.1 ? Math.atan2(I.my, I.mx) : f.aim; return { a, x: f.x + Math.cos(a) * 250, y: f.y + Math.sin(a) * 250 }; };
      let aimSet = false;
      // fire button: drag = manual aim + fire; tap = auto-aimed volley
      const fb = this.btn.fire;
      if (fb) {
        const dx = fb.x - fb.ox, dy = fb.y - fb.oy, l = Math.hypot(dx, dy);
        if (l > 18) { I.aim = Math.atan2(dy, dx); I.ax = f.x + Math.cos(I.aim) * 300; I.ay = f.y + Math.sin(I.aim) * 300; I.fire = true; aimSet = true; m.aimGuide = { a: I.aim }; }
        if (fb.released) { if (l <= 18) this.autoFire = Math.max(f.hero.weapon.rate * 1.2, 0.3); this.btn.fire = null; }
      }
      if (this.autoFire > 0) { this.autoFire -= 1 / 60; const a = autoAim(); I.aim = a.a; I.ax = a.x; I.ay = a.y; I.fire = true; aimSet = true; }
      // ability buttons: drag to aim, release to cast; tap = auto-aim
      const slots = { q: 0, e: 1, ult: 2 };
      for (const b of ['q', 'e', 'ult']) {
        const s = this.btn[b]; if (!s) continue;
        const dx = s.x - s.ox, dy = s.y - s.oy, l = Math.hypot(dx, dy);
        const range = 380;
        let a, px, py;
        if (l > 18) { a = Math.atan2(dy, dx); const k = clamp(l / 90, 0.15, 1); px = f.x + Math.cos(a) * range * k; py = f.y + Math.sin(a) * range * k; m.aimGuide = { a, type: 'circle', x: px, y: py, r: 40, range: range * k }; }
        else { const au = autoAim(); a = au.a; px = au.x; py = au.y; }
        if (s.released) {
          I.aim = a; I.ax = px; I.ay = py; aimSet = true;
          if (slots[b] === 2) I.ult = true; else I.cast[slots[b]] = true;
          this.btn[b] = null;
        }
      }
      if (this.btn.emote && this.btn.emote.released) { this.emoteReq = true; this.btn.emote = null; }
      if (!aimSet) { const ml = Math.hypot(I.mx, I.my); const t = tgt; if (t) { I.aim = angTo(f.x, f.y, t.x, t.y); I.ax = t.x; I.ay = t.y; } else if (ml > 0.2) { I.aim = Math.atan2(I.my, I.mx); I.ax = f.x + I.mx * 300; I.ay = f.y + I.my * 300; } else I.aim = f.aim; }
    }
    if (this.swapReq !== undefined) { I.swap = this.swapReq; this.swapReq = undefined; }
    this.pressed.clear();
  }
}
