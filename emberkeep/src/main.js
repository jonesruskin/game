// EMBERKEEP bootstrap: home ⇄ battle, drag-to-merge input, offline/lab loops, ads.
import { Platform } from './platform.js';
import { Save, fmt } from './save.js';
import { Audio } from './audio.js';
import { Run } from './sim.js';
import { Renderer } from './render.js';
import { Menus, HUD } from './ui.js';
import { deriveStats, labVal } from './stats.js';
import { WISPS, TIERS, EMBER_SKINS, THEMES } from './data.js';

const STEP = 1 / 60;

class App {
  async init() {
    this.state = 'boot'; Platform.loadingStart(); await Platform.init(); Save.load();
    this.audio = new Audio(); this.canvas = document.getElementById('game'); this.renderer = new Renderer(this.canvas);
    this.hud = new HUD(document.getElementById('hud'), this); this.menus = new Menus(document.getElementById('ui'), this);
    Platform.onMuteChange = (m) => this.audio.setForceMute(m || Platform.adPlaying);
    this.applySettings(); this.resize(); addEventListener('resize', () => this.resize());
    this.speed = 1; this.ui = { drag: null, hover: -1, selected: -1 };
    this.bindInput();
    document.addEventListener('visibilitychange', () => { if (document.hidden) { if (this.state === 'run') this.pause(); Save.save(); } });
    addEventListener('pagehide', () => { if (this.run && !this.run.over && this.run.wave > 1) { this.run.over = true; Save.applyRun(this.run.result()); } Save.save(); }); // never lose a battle's coins
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { if (this.state === 'run') this.pause(); else if (this.state === 'paused') this.resume(); }
      if (e.key === ' ' && this.state === 'run') { e.preventDefault(); this.run.summon(); }
    });
    const unlock = () => { this.audio.ensure(); this.audio.startMusic(); };
    addEventListener('pointerdown', unlock); addEventListener('touchend', unlock); addEventListener('keydown', unlock);
    setInterval(() => Save.save(), 15000);
    Platform.loadingStop(); document.getElementById('boot').style.opacity = 0; setTimeout(() => document.getElementById('boot').remove(), 400);
    this.last = performance.now(); this.acc = 0; requestAnimationFrame((t) => this.loop(t));
    if (!Save.p.tutorialDone) this.firstRun(); else this.toHome();
  }
  applySettings() { const s = Save.p.settings; this.audio.sfxVol = s.sfx; this.audio.musicVol = s.music; this.audio.setForceMute(Platform.muteAudioSetting()); this.audio.apply(); }
  resize() { this.renderer.resize(innerWidth, innerHeight, Math.min(Platform.isMobile ? 1.5 : 2, devicePixelRatio || 1)); this.renderer.layout(58, 178); }
  get theme() { return THEMES.find((t) => t.id === Save.p.equip.theme) || THEMES[0]; }
  get skin() { return EMBER_SKINS.find((t) => t.id === Save.p.equip.skin) || EMBER_SKINS[0]; }
  // ---------------------------------------------------------------- input: drag a wisp onto a twin to merge
  bindInput() {
    const cv = this.canvas;
    cv.addEventListener('pointerdown', (e) => {
      if (this.state !== 'run') return; const i = this.renderer.slotAt(e.clientX, e.clientY);
      if (i >= 0 && this.run.slots[i]) { this.ui.drag = { from: i, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }; cv.setPointerCapture(e.pointerId); } else this.ui.selected = -1;
    });
    cv.addEventListener('pointermove', (e) => { const d = this.ui.drag; if (!d) return; d.x = e.clientX; d.y = e.clientY; this.ui.hover = this.renderer.slotAt(e.clientX, e.clientY, 1.15); });
    const up = (e) => {
      const d = this.ui.drag; if (!d) return; this.ui.drag = null; this.ui.hover = -1;
      const moved = Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 12; const to = this.renderer.slotAt(e.clientX, e.clientY, 1.15);
      if (moved && to >= 0 && to !== d.from) { if (this.run.merge(d.from, to)) { this.ui.selected = -1; if (this.tutorial) this.tutMerged = true; } else this.audio.play('click'); }
      else if (!moved) this.ui.selected = this.ui.selected === d.from ? -1 : d.from;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', () => { this.ui.drag = null; });
  }
  firstRun() {
    const ui = document.getElementById('ui');
    ui.innerHTML = `<div class="screen home" style="align-items:center;justify-content:center;text-align:center;gap:18px"><div class="logo">EMBER<span>KEEP</span></div>
      <div class="stroke" style="font-size:clamp(16px,3vw,24px);font-weight:900;max-width:640px">The night never ends.<br><span style="color:#ffb347">Keep the last ember alive.</span></div>
      <button class="play" style="width:min(360px,80vw)" id="frplay">TAP TO PLAY<small>no sign-up · instant</small></button></div>`;
    ui.querySelector('#frplay').addEventListener('click', () => { this.audio.ensure(); this.audio.startMusic(); this.startRun(true); });
  }
  toHome() { this.state = 'home'; this.audio.mode = 'lobby'; this.hud.unmount(); this.run = null; this.menus.home(); }
  startRun(tutorial) {
    const p = Save.p; this.menus.clear();
    const stats = deriveStats(p); if (tutorial) stats.startEmbers += 30;
    const auto = { summon: labVal(p, 'autoSummon') ? p.autoPref.summon : false, merge: labVal(p, 'autoMerge') ? p.autoPref.merge : false, power: labVal(p, 'autoPower') ? p.autoPref.power : false };
    this.run = new Run({ tier: p.tier, deck: p.deck, stats, auto, lowFx: p.settings.lowFx, sfx: (n) => this.audio.play(n), events: (e) => this.onEvent(e), onEnd: (r) => setTimeout(() => this.endRun(r), 1400) });
    this.speed = Math.min(p.speedPref || 1, labVal(p, 'speed3') ? 3 : labVal(p, 'speed2') ? 2 : 1);
    this.ui = { drag: null, hover: -1, selected: -1 };
    this.state = 'run'; this.audio.mode = 'match'; this.tutorial = !!tutorial; this.tutStep = 0; this.tutMerged = false;
    this.hud.mount(this.run); Platform.gameplayStart();
    this.hud.announce(`TIER ${TIERS[p.tier].n} · ${TIERS[p.tier].name.toUpperCase()}`, 'Summon wisps · merge twins · survive the night');
  }
  onEvent(e) {
    switch (e.type) {
      case 'boss': this.hud.announce('⚠️ BOSS WAVE', `Wave ${e.wave} — a Shadow Lord approaches`, '#ff4d6d'); break;
      case 'bosskill': this.hud.announce('BOSS BANISHED!', `+${fmt(e.coins)} coins · +1 Ember Chest 🎁`, '#ffd23f'); break;
      case 'bigmerge': this.hud.announce(`LEVEL ${e.lvl} ${e.wisp.name.toUpperCase()}!`, '', e.wisp.glow); break;
      case 'end': this.hud.announce('THE EMBER FADES…', '', '#ff4d6d'); break;
    }
  }
  tutorialTick() {
    if (!this.tutorial || !this.run) return; const r = this.run; const st = this.tutStep;
    const twins = () => { for (let i = 0; i < r.slots.length; i++) for (let j = i + 1; j < r.slots.length; j++) if (r.canMerge(i, j)) return true; return false; };
    if (st === 0 && r.time > 0.5) { this.hud.hint('👇 Tap <b>SUMMON</b> to call a wisp to defend the Ember', 6); this.tutStep = 1; }
    else if (st === 1 && twins()) { this.hud.hint('✨ Two identical wisps! <b>Drag one onto the other</b> to MERGE', 8); this.tutStep = 2; }
    else if (st === 2 && this.tutMerged) { this.hud.hint('🎲 Merged wisps become a <b>random</b> wisp one level higher — dots show the level', 6); this.tutStep = 3; }
    else if (st === 3 && r.time > 45) { this.hud.hint('⚡ Spare Embers? Buy <b>power-ups</b> to boost a wisp type for this battle', 6); this.tutStep = 4; }
    else if (st === 4 && r.wave >= 10) { this.hud.hint('🎁 Bosses drop <b>Ember Chests</b> with wisp shards. Survive as long as you can!', 6); this.tutStep = 5; }
  }
  endRun(res) {
    if (this.state !== 'run' && this.state !== 'paused') return;
    Platform.gameplayStop(); const p = Save.p; p.tutorialDone = true;
    const sum = Save.applyRun(res); if (sum.newBest && res.wave >= 20) Platform.happytime();
    this.hud.unmount(); this.state = 'results'; this.audio.mode = 'lobby'; this.menus.results(res, sum); this.run = null;
  }
  async afterResults(again) {
    const p = Save.p;
    const pokiBreak = Platform.name === 'poki' && !!again;
    if (pokiBreak || (Platform.adsAvailable && Platform.name !== 'poki' && p.stats.runs > 2 && p.sinceAd >= 2 && Date.now() - (p.lastMidgame || 0) > 180000)) {
      p.sinceAd = 0; p.lastMidgame = Date.now(); Save.save(); await Platform.midgame(() => this.audio.setForceMute(true)); this.audio.setForceMute(Platform.muteAudioSetting());
    }
    if (again) this.startRun(); else this.toHome();
  }
  async rewardedAd(cb) {
    if (!Platform.adsAvailable) { this.menus.toast({ icon: 'ℹ️', text: 'Ads unavailable right now' }); return; }
    const ui = document.getElementById('ui'); ui.style.pointerEvents = 'none'; const ok = await Platform.rewarded(() => this.audio.setForceMute(true)); ui.style.pointerEvents = ''; this.audio.setForceMute(Platform.muteAudioSetting());
    if (ok) cb(); else if (Platform.name !== 'poki') this.menus.toast({ icon: '📺', text: 'Ad not available — try again later' });
  }
  pause() { if (this.state !== 'run') return; this.state = 'paused'; Platform.gameplayStop(); this.menus.pause(); }
  resume() { if (this.state !== 'paused') return; this.menus.modalEl?.remove(); this.menus.modalEl = null; this.state = 'run'; this.last = performance.now(); Platform.gameplayStart(); }
  quit() { if (!this.run) return; this.menus.modalEl?.remove(); this.menus.modalEl = null; this.state = 'run'; this.run.end(); }
  loop(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    if ((this.state === 'run' || this.state === 'paused') && this.run) {
      if (this.state === 'run') { this.acc += dt * this.speed; let n = 0; while (this.acc >= STEP && n < 12 && this.run) { this.run.update(STEP); this.acc -= STEP; n++; } if (n === 12) this.acc = 0; }
      if (this.run) { this.renderer.draw(this.run, this.state === 'run' ? dt : 0, { ...this.ui, theme: this.theme, skin: this.skin }); this.hud.update(dt); this.tutorialTick(); }
    } else { this.menus.tick(dt); this.renderer.draw(null, dt, { theme: this.theme, skin: this.skin }); }
    requestAnimationFrame((t) => this.loop(t));
  }
}
const app = new App(); window.__app = app;
app.init().catch((e) => { console.error(e); const b = document.getElementById('boot'); if (b) b.innerHTML = '<div style="padding:20px;text-align:center">Something went wrong loading the game. Please refresh.</div>'; });
