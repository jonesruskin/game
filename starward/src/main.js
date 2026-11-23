// STARWARD: app shell. Boot, offline catch-up report, the loop, input (pan / zoom / tap), views, saving, ads.
import { Platform } from './platform.js';
import { load, save, fresh, SAVE_KEY } from './core/state.js';
import * as G from './core/game.js';
import { BaseView } from './render/base.js';
import { UI } from './ui/ui.js';
import { Audio } from './audio.js';
import { BUILDINGS } from './data/buildings.js';
import { TECH } from './data/research.js';
import { RES } from './data/resources.js';
import { CHAPTERS } from './data/objectives.js';
import { fmt, fmtTime, $, clamp } from './util.js';

class App {
  constructor() { this.base = 'earth'; this.view = 'base'; this.audio = new Audio(); this.ui = new UI(this); this.last = performance.now(); this.saveT = 0; window.__app = this; }
  async boot() {
    Platform.loadingStart(); await Platform.init(); this.s = load(Platform.storage()); const s = this.s; s.stats.sessions++;
    try { await Promise.race([Promise.all([document.fonts.load('600 20px Oxanium'), document.fonts.load('500 15px Barlow')]), new Promise((r) => setTimeout(r, 1500))]); } catch (e) {}
    const away = (Date.now() - s.last) / 1000; const before = { ...s.res }; const notes = G.advance(s, Date.now()); this.R = G.rates(s);
    this.bv = new BaseView($('#base')); this.ui.init(); this.applySettings(); this.layout(); addEventListener('resize', () => this.layout()); this.bindInput();
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.persist(); this.audio.suspend(); } else { this.audio.resume(); this.catchUp(); } });
    addEventListener('pagehide', () => this.persist());
    Platform.onMuteChange = (m) => this.audio.setMuted(m); this.audio.setMuted(Platform.muteAudioSetting());
    $('#boot').classList.add('gone'); setTimeout(() => $('#boot') && $('#boot').remove(), 700); Platform.loadingStop(); this.state = 'ready';
    if (!s.tut) this.intro(); else if (away > 90) this.report(away, before, notes);
    requestAnimationFrame((t) => this.frame(t));
  }
  applySettings() { const st = this.s.settings; this.audio.setVolume(st.sfx); if (this.bv) this.bv.dayLock = st.dayNight === 'day' ? 1 : st.dayNight === 'night' ? 0 : null; }
  layout() { const W = innerWidth, H = innerHeight; const dpr = Math.min(devicePixelRatio || 1, 2); const port = H > W; document.body.classList.toggle('port', port); this.bv.padR = port ? 0 : 0; this.bv.resize(W, H, dpr); }
  setView(v) {
    this.view = v; document.querySelectorAll('.nav [data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === v));
    const ov = $('#overlay'); if (v === 'research') { this.ui.research(); Platform.gameplayStop(); } else { ov.className = ''; ov.innerHTML = ''; if (this.started) Platform.gameplayStart(); }
  }
  // ---------------- loop ----------------
  frame(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; const s = this.s; s.stats.playS += dt;
    const notes = G.advance(s, Date.now()); if (notes.length) { this.R = G.rates(s); for (const n of notes) this.notify(n); this.ui.panelKey = ''; }
    this.rT = (this.rT || 0) + dt; if (this.rT > 1) { this.rT = 0; this.R = G.rates(s); }
    if (this.view === 'base' || this.view === 'research') this.bv.render(s, G, dt);
    this.ui.frame(dt);
    this.saveT += dt; if (this.saveT > 10) { this.saveT = 0; this.persist(); }
    requestAnimationFrame((t) => this.frame(t));
  }
  notify(n) {
    if (n.kind === 'build') { this.audio.play('done'); this.ui.toast(n.lvl === 1 ? `${BUILDINGS[n.b].name} is complete!` : `${BUILDINGS[n.b].name} reached level ${n.lvl}`, 'good'); if (n.b === 'hq') { const opened = n.lvl; this.ui.toast(`Mission Control level ${opened}: new lots and higher building levels unlocked`, 'gold'); } }
    if (n.kind === 'research') { this.audio.play('research'); this.ui.toast(`Research complete: ${TECH[n.tech].name}`, 'gold'); if (this.view === 'research') this.ui.research(); }
  }
  changed() { this.R = G.rates(this.s); this.ui.hud(); this.ui.side(); this.persist(); }
  persist() { save(Platform.storage(), this.s); }
  catchUp() { const s = this.s; const away = (Date.now() - s.last) / 1000; if (away < 90) return; const before = { ...s.res }; const notes = G.advance(s, Date.now()); this.R = G.rates(s); this.report(away, before, notes); }
  reset() { this.s = fresh(); this.persist(); location.reload(); }
  // ---------------- input ----------------
  bindInput() {
    const cv = $('#base'); const pts = new Map(); let downAt = null, moved = 0, pinch0 = 0;
    cv.addEventListener('pointerdown', (e) => { this.start(); cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); downAt = [e.clientX, e.clientY]; moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    cv.addEventListener('pointermove', (e) => { const p = pts.get(e.pointerId); if (!p) { const id = this.bv.pick(e.clientX, e.clientY, this.s); this.bv.hover = id; cv.style.cursor = id ? 'pointer' : 'grab'; return; }
      if (pts.size === 2) { pts.set(e.pointerId, [e.clientX, e.clientY]); const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0) this.bv.zoomAt(d / pinch0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); pinch0 = d; moved = 99; return; }
      const dx = e.clientX - p[0], dy = e.clientY - p[1]; moved += Math.abs(dx) + Math.abs(dy); pts.set(e.pointerId, [e.clientX, e.clientY]); if (moved > 6) this.bv.pan(dx, dy); });
    const up = (e) => { if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); if (pts.size === 0 && moved <= 6 && downAt) { const id = this.bv.pick(downAt[0], downAt[1], this.s); this.ui.select(id); } if (pts.size < 2) pinch0 = 0; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); this.bv.zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, { passive: false });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') { if ($('#modal').classList.contains('on')) this.ui.closeModal(); else if (this.view !== 'base') this.setView('base'); else this.ui.select(null); } });
  }
  start() { this.audio.unlock(); if (!this.started) { this.started = true; Platform.gameplayStart(); } }
  // ---------------- story & reports ----------------
  intro() { const ch = CHAPTERS[0]; this.ui.modal(`<div class="intro"><div class="logo">STARWARD</div><p class="tag">From one launch pad to the edge of the universe</p><h2>${ch.name}</h2><p>${ch.intro}</p><ul class="how"><li>Tap a building to upgrade it, or an empty lot to build.</li><li>Construction and research run in <b>real time</b>, even while you're away.</li><li>Follow the objectives on the left; each pays a reward.</li></ul><button class="btn gold big" data-a="close" id="beginBtn">Begin the programme</button></div>`, 'intro');
    $('#beginBtn').addEventListener('click', () => { this.s.tut = 1; this.persist(); this.start(); }); }
  report(sec, before, notes) {
    const gained = Object.keys(RES).map((r) => [r, (this.s.res[r] || 0) - (before[r] || 0)]).filter(([, n]) => n > 0.5);
    const done = notes.map((n) => (n.kind === 'build' ? `${BUILDINGS[n.b].name} → level ${n.lvl}` : `Research: ${TECH[n.tech].name}`));
    this.ui.modal(`<h2>Welcome back, Director</h2><p class="muted">You were away for ${fmtTime(sec)}.</p>${done.length ? `<div class="lst"><b>Completed</b>${done.slice(0, 8).map((d) => `<div>✓ ${d}</div>`).join('')}</div>` : ''}${gained.length ? `<div class="lst"><b>Produced</b><div class="costs">${gained.map(([r, n]) => `<span class="cost" style="--rc:${RES[r].color}">+${fmt(n)} ${RES[r].name}</span>`).join('')}</div></div>` : ''}<p class="muted small">Storage caps limit what accumulates while you're away: upgrade Logistics Depots to bank more.</p><button class="btn gold big" data-a="close">Back to work</button>`);
  }
  adsOk() { return Platform.adsAvailable; }
  async rewarded(fn) { this.audio.suspend(); const ok = await Platform.rewarded(); this.audio.resume(); if (ok) fn(); else this.ui.toast('Ad unavailable right now', 'info'); }
}
new App().boot();
