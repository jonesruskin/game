// App bootstrap + state machine: boot → (tutorial match | lobby) → match → results → ...
import { Platform } from './platform.js';
import { Save } from './save.js';
import { Audio } from './audio.js';
import { Input } from './input.js';
import { Match } from './game/match.js';
import { Renderer } from './game/render.js';
import { HUD } from './ui/hud.js';
import { Menus } from './ui/menus.js';
import { HERO } from './data/heroes.js';
import { ALL_COSMETICS, EMOTES, TRAILS, KOFX } from './data/cosmetics.js';
import { clamp, pick } from './util.js';

const STEP = 1 / 60;

class App {
  async init() {
    this.state = 'boot';
    Platform.loadingStart();
    await Platform.init();
    Save.load();
    this.audio = new Audio();
    this.canvas = document.getElementById('game');
    this.renderer = new Renderer(this.canvas);
    this.input = new Input(); this.input.attach(this.canvas, document.getElementById('touch'));
    this.hud = new HUD(document.getElementById('hud'), document.getElementById('touch'), this.input);
    this.hud.onPause = () => this.pause();
    this.menus = new Menus(document.getElementById('ui'), this);
    Platform.onMuteChange = (m) => this.audio.setForceMute(m || Platform.adPlaying);
    this.applySettings();
    this.resize(); addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'match') this.pause(); });
    addEventListener('keydown', (e) => { if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && this.state === 'match') this.pause(); else if (e.key === 'Escape' && this.state === 'paused') this.resume(); });
    const unlock = () => { this.audio.ensure(); this.audio.startMusic(); };
    addEventListener('pointerdown', unlock); addEventListener('touchend', unlock); addEventListener('keydown', unlock);
    Platform.loadingStop();
    document.getElementById('boot').style.opacity = 0; setTimeout(() => document.getElementById('boot').remove(), 400);
    this.last = performance.now(); this.acc = 0; this.frame = 0;
    requestAnimationFrame((t) => this.loop(t));
    // First-time players drop straight into a (gentle) match — one click to gameplay.
    if (!Save.p.tutorialDone) this.firstRun(); else this.toLobby();
  }
  applySettings() {
    const s = Save.p.settings; this.audio.sfxVol = s.sfx; this.audio.musicVol = s.music; this.audio.setForceMute(Platform.muteAudioSetting());
    this.audio.apply();
  }
  resize() {
    const dpr = Math.min(Platform.isMobile ? 1.5 : 2, devicePixelRatio || 1);
    this.renderer.resize(innerWidth, innerHeight, dpr);
  }
  firstRun() {
    this.state = 'boot';
    const ui = document.getElementById('ui');
    ui.innerHTML = `<div class="screen lobby" style="align-items:center;justify-content:center;text-align:center;gap:18px" id="fr">
      <div class="logo">STEAL<span>STORM</span></div>
      <div class="stroke" style="font-size:clamp(16px,3vw,24px);font-weight:900;max-width:640px">KO rivals. <span style="color:#ffd60a">Steal their powers.</span> Survive the storm.</div>
      <button class="play" style="width:min(360px,80vw)" id="frplay">TAP TO PLAY<small>no sign-up · instant</small></button></div>`;
    ui.querySelector('#frplay').addEventListener('click', () => { this.audio.ensure(); this.audio.startMusic(); this.startMatch({ tutorial: true }); });
  }
  toLobby() {
    this.state = 'lobby'; this.audio.mode = 'lobby'; this.hud.unmount(); this.input.setEnabled(false);
    this.match = null; this.menus.lobby();
  }
  startMatch(o = {}) {
    const p = Save.p; const tutorial = !!o.tutorial || !p.tutorialDone;
    const heroId = Save.ownsHero(p.selHero) ? p.selHero : 'blaze';
    const base = clamp(0.12 + p.trophies / 1400, 0.12, 0.92) * (p.stats.matches < 4 ? 0.6 : 1);
    const emotes = p.equip.emotes.map((id) => ALL_COSMETICS[id]).filter(Boolean);
    this.menus.clear();
    this.match = new Match({
      heroId, skin: Save.skinFor(heroId), trail: ALL_COSMETICS[p.equip.trail] || TRAILS[1], kofx: ALL_COSMETICS[p.equip.kofx] || KOFX[0], emotes: emotes.length ? emotes : EMOTES.slice(0, 3),
      playerName: p.name, title: ALL_COSMETICS[p.equip.title]?.name, total: tutorial ? 8 : 12, botSkill: tutorial ? 0.05 : base, botDamage: tutorial ? 0.55 : p.stats.matches < 4 ? 0.8 : 1, tutorial, lowFx: p.settings.lowFx,
      sfx: (n, x, y, mine) => this.audio.play(n, x, y, mine),
      events: (e) => this.onEvent(e),
      getPlayerIntent: (m, f) => this.input.apply(m, f, this.renderer),
      onEnd: (res) => this.endMatch({ ...res, tutorial }),
    });
    this.tutorial = tutorial; this.tutStep = 0; this.firstOrbHint = false; this.emoteIdx = 0;
    this.renderer.inited = false;
    this.state = 'match'; this.audio.mode = 'match';
    const isTouch = Platform.isMobile || this.input.lastDevice === 'touch' || (matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches);
    this.isTouch = isTouch;
    this.hud.mount(this.match, isTouch);
    this.input.setEnabled(true);
    if (isTouch) this.input.lastDevice = 'touch';
    Platform.gameplayStart();
    const h = HERO[heroId];
    this.hud.announce(tutorial ? 'STEAL THEIR POWERS!' : `${h.name.toUpperCase()} READY`, tutorial ? 'KO enemies and grab the glowing orbs they drop' : `${this.match.total} players · last one standing wins`, true);
    this.audio.play('announce');
  }
  onEvent(e) {
    const m = this.match; if (!m) return;
    switch (e.type) {
      case 'announce': this.hud.announce(e.text, e.sub, e.big); this.audio.play('announce'); if (this.tutorial && m.stats.kills === 1) this.hud.hint('🔮 Walk over the glowing orbs to <b>STEAL</b> their powers!', 5); break;
      case 'steal': {
        const t = e.upgraded ? `${e.ability.icon} UPGRADED → Lv${e.lvl}!` : `${e.ability.icon} STOLE ${e.ability.name.toUpperCase()}!`;
        this.hud.announce(t, e.from ? `from ${e.from}` : e.upgraded ? 'Same power twice = stronger power' : 'New power equipped', e.lvl >= 3);
        if (e.lvl >= 3) m.fx.flash('#ffd60a', 0.2);
        break;
      }
      case 'storm': this.hud.announce(e.text, 'Stay inside the white circle', false); if (this.tutorial && !this.stormHint) { this.stormHint = true; this.hud.hint('⛈️ The storm is shrinking — stay inside the <b>white circle</b>!', 5); } break;
      case 'hurt': this.hud.hurt(); break;
      case 'dead': this.audio.play('lose'); this.hud.announce('KNOCKED OUT', e.killer ? `by ${e.killer.name}` : 'by the storm', true); break;
      case 'win': this.audio.play('win'); this.hud.announce('#1 STORMBORN!', 'Last one standing!', true); Platform.happytime(); break;
      case 'alive': if (e.n <= 3 && e.n > 1) this.hud.announce(`TOP ${e.n}!`, 'Hold on...', false); break;
    }
  }
  tutorialTick() {
    const m = this.match; if (!this.tutorial || !m) return; const t = m.time; const T = this.isTouch;
    const steps = [
      [0.8, T ? '🕹️ Drag the <b>left side</b> to move · Tap <b>🎯</b> to auto-shoot (drag it to aim)' : '🕹️ <b>WASD</b> to move · <b>Aim</b> with mouse · <b>Click</b> to shoot'],
      [8, T ? '✨ Tap your <b>power buttons</b> to use abilities · drag them to aim' : '✨ <b>Q</b> and <b>E</b> fire your powers · <b>R</b> unleashes your Ultimate when charged'],
      [18, '📦 Smash <b>? crates</b> for free powers · Hide in <b>bushes</b> to vanish'],
    ];
    if (this.tutStep < steps.length && t > steps[this.tutStep][0]) { this.hud.hint(steps[this.tutStep][1], 6); this.tutStep++; }
    if (!this.firstOrbHint && m.player.nearOrb) { this.firstOrbHint = true; this.hud.hint(T ? '🔮 Tap a <b>Replace</b> button to take this power · same power = <b>UPGRADE</b>' : '🔮 Press <b>1</b> or <b>2</b> to swap in this power · grab a duplicate to <b>UPGRADE</b> it', 6); }
  }
  endMatch(res) {
    Platform.gameplayStop(); this.input.setEnabled(false);
    const p = Save.p; if (res.tutorial) p.tutorialDone = true;
    const sum = Save.applyMatch(res);
    this.hud.unmount();
    this.state = 'results'; this.audio.mode = 'lobby';
    this.menus.results(res, sum);
    this.match = null;
  }
  async afterResults(again) {
    const p = Save.p;
    // Midgame ad only at natural breaks, never in the first 2 matches, and spaced out.
    if (Platform.adsAvailable && p.stats.matches > 2 && p.matchesSinceAd >= 2 && Date.now() - (p.lastMidgame || 0) > 180000) {
      p.matchesSinceAd = 0; p.lastMidgame = Date.now(); Save.save();
      await Platform.midgame(() => this.audio.setForceMute(true));
      this.audio.setForceMute(Platform.muteAudioSetting());
    }
    if (again) this.startMatch(); else this.toLobby();
  }
  async rewardedAd(onReward) {
    if (!Platform.adsAvailable) { this.menus.toast({ icon: 'ℹ️', text: 'Ads unavailable right now' }); return; }
    const ui = document.getElementById('ui'); ui.style.pointerEvents = 'none';
    const ok = await Platform.rewarded(() => this.audio.setForceMute(true));
    ui.style.pointerEvents = '';
    this.audio.setForceMute(Platform.muteAudioSetting());
    if (ok) onReward(); else this.menus.toast({ icon: '📺', text: 'Ad not available — try again later' });
  }
  pause() { if (this.state !== 'match') return; this.state = 'paused'; this.input.setEnabled(false); Platform.gameplayStop(); this.menus.pause(); }
  resume() { if (this.state !== 'paused') return; this.menus.closeModal(); this.state = 'match'; this.input.setEnabled(true); this.last = performance.now(); Platform.gameplayStart(); }
  quitMatch() { if (!this.match) return; this.menus.closeModal(); this.state = 'match'; const m = this.match; const f = m.player; if (f.alive) { f.hp = 0; m.kill(f, null); } m.endTimer = 0.01; }
  loop(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; this.frame++;
    if (this.state === 'match' && this.match) {
      this.acc += dt; let n = 0;
      while (this.acc >= STEP && n < 5) { this.match.update(STEP); this.acc -= STEP; n++; }
      if (n === 5) this.acc = 0;
      const m = this.match; if (!m) { requestAnimationFrame((t) => this.loop(t)); return; }
      this.audio.listener.x = m.player.x; this.audio.listener.y = m.player.y;
      if (this.input.emoteReq) { this.input.emoteReq = false; const em = m.player.emotes[this.emoteIdx++ % m.player.emotes.length]; m.emote(m.player, em.text); }
      this.renderer.draw(m, dt);
      this.hud.update(dt, this.frame);
      this.tutorialTick();
    } else if (this.state === 'paused' && this.match) {
      this.renderer.draw(this.match, 0);
    } else {
      this.menus.tick(dt);
      if (this.state !== 'match') { const c = this.renderer.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#140a24'; c.fillRect(0, 0, this.canvas.width, this.canvas.height); }
    }
    requestAnimationFrame((t) => this.loop(t));
  }
}

const app = new App();
window.__app = app; // debug/QA hook
app.init().catch((e) => { console.error(e); const b = document.getElementById('boot'); if (b) b.innerHTML = '<div style="padding:20px;text-align:center">Something went wrong loading the game. Please refresh.</div>'; });
