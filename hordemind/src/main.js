// HORDEMIND bootstrap: boot → (first hunt | hive) → hunt → results.
import { Platform } from './platform.js';
import { Save } from './save.js';
import { Audio } from './audio.js';
import { Hunt, HuntRenderer } from './game.js';
import { Menus, HUD } from './ui.js';
import { HERO, QUEEN } from './data.js';
import { clamp } from './util.js';

const STEP = 1 / 60;

// ---- Input: keyboard/mouse + twin-touch (joystick left, SWARM hold button right)
class Input {
  constructor() { this.keys = new Set(); this.edge = new Set(); this.mouse = false; this.stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 }; this.touchCharge = false; this.touchAbility = false; this.enabled = false; }
  attach() {
    addEventListener('keydown', (e) => { const k = e.key.toLowerCase(); if (this.enabled && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault(); if (!this.keys.has(k)) this.edge.add(k); this.keys.add(k); });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => { this.keys.clear(); this.mouse = false; });
    const cv = document.getElementById('game');
    cv.addEventListener('mousedown', (e) => { if (e.button === 0) this.mouse = true; if (e.button === 2) this.edge.add('rmb'); });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse = false; });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    const hud = document.getElementById('hud');
    const opt = { passive: false };
    addEventListener('touchstart', (e) => {
      if (!this.enabled) return;
      for (const t of e.changedTouches) {
        const tg = t.target;
        if (tg.closest && tg.closest('#chargeBtn')) { this.touchCharge = t.identifier; tg.closest('#chargeBtn').classList.add('down'); e.preventDefault(); continue; }
        if (tg.closest && tg.closest('#abilBtn')) { this.touchAbility = true; e.preventDefault(); continue; }
        if (tg.closest && (tg.closest('#pauseBtn') || tg.closest('.evo') || tg.closest('.modal'))) continue;
        if (t.clientX < innerWidth * 0.55 && this.stick.id === null) { this.stick = { id: t.identifier, ox: t.clientX, oy: t.clientY, x: t.clientX, y: t.clientY }; e.preventDefault(); }
      }
    }, opt);
    addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (t.identifier === this.stick.id) { this.stick.x = t.clientX; this.stick.y = t.clientY; } if (this.enabled) e.preventDefault(); }, opt);
    const end = (e) => { for (const t of e.changedTouches) { if (t.identifier === this.stick.id) this.stick.id = null; if (t.identifier === this.touchCharge) { this.touchCharge = false; hud.querySelector('#chargeBtn')?.classList.remove('down'); } } };
    addEventListener('touchend', end); addEventListener('touchcancel', end);
  }
  intent() {
    const K = this.keys; let mx = 0, my = 0;
    if (K.has('w') || K.has('arrowup') || K.has('z')) my -= 1; if (K.has('s') || K.has('arrowdown')) my += 1;
    if (K.has('a') || K.has('arrowleft') || K.has('q')) mx -= 1; if (K.has('d') || K.has('arrowright')) mx += 1;
    if (this.stick.id !== null) { const dx = this.stick.x - this.stick.ox, dy = this.stick.y - this.stick.oy, l = Math.hypot(dx, dy); if (l > 8) { const k = Math.min(1, l / 55); mx = (dx / l) * k; my = (dy / l) * k; } }
    const ability = this.edge.has('e') || this.edge.has('shift') || this.edge.has('rmb') || this.touchAbility;
    const out = { mx, my, charge: this.mouse || K.has(' ') || this.touchCharge !== false, ability };
    this.touchAbility = false; this.edge.delete('e'); this.edge.delete('shift'); this.edge.delete('rmb');
    return out;
  }
  setEnabled(v) { this.enabled = v; if (!v) { this.stick.id = null; this.touchCharge = false; this.mouse = false; } }
}

class App {
  async init() {
    this.state = 'boot'; Platform.loadingStart(); await Platform.init(); Save.load();
    this.audio = new Audio(); this.canvas = document.getElementById('game'); this.renderer = new HuntRenderer(this.canvas);
    this.input = new Input(); this.input.attach();
    this.hud = new HUD(document.getElementById('hud')); this.menus = new Menus(document.getElementById('ui'), this);
    Platform.onMuteChange = (m) => this.audio.setForceMute(m || Platform.adPlaying);
    this.applySettings(); this.resize(); addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'hunt') this.pause(); });
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { if (this.state === 'hunt' && !this.hunt?.choosing) this.pause(); else if (this.state === 'paused') this.resume(); }
      if (this.state === 'hunt' && this.hunt?.choosing && ['1', '2', '3'].includes(e.key)) { const o = this.hunt.choosing[+e.key - 1]; if (o) this.chooseEvo(o.id); }
    });
    const unlock = () => { this.audio.ensure(); this.audio.startMusic(); };
    addEventListener('pointerdown', unlock); addEventListener('touchend', unlock); addEventListener('keydown', unlock);
    Platform.loadingStop();
    document.getElementById('boot').style.opacity = 0; setTimeout(() => document.getElementById('boot').remove(), 400);
    this.last = performance.now(); this.acc = 0; requestAnimationFrame((t) => this.loop(t));
    if (!Save.p.tutorialDone) this.firstRun(); else this.toLobby();
  }
  applySettings() { const s = Save.p.settings; this.audio.sfxVol = s.sfx; this.audio.musicVol = s.music; this.audio.setForceMute(Platform.muteAudioSetting()); this.audio.apply(); }
  resize() { this.renderer.resize(innerWidth, innerHeight, Math.min(Platform.isMobile ? 1.5 : 2, devicePixelRatio || 1)); }
  firstRun() {
    const ui = document.getElementById('ui');
    ui.innerHTML = `<div class="screen lobby" style="align-items:center;justify-content:center;text-align:center;gap:18px"><div class="logo">HORDE<span>MIND</span></div>
      <div class="stroke" style="font-size:clamp(16px,3vw,24px);font-weight:900;max-width:640px">The heroes always win. <span style="color:#b5e48c">Not today.</span><br>You are the horde.</div>
      <button class="play" style="width:min(360px,80vw)" id="frplay">TAP TO PLAY<small>no sign-up · instant</small></button></div>`;
    ui.querySelector('#frplay').addEventListener('click', () => { this.audio.ensure(); this.audio.startMusic(); this.startHunt({ hero: 'aldric', diff: 0, tutorial: true }); });
  }
  toLobby() { this.state = 'lobby'; this.audio.mode = 'lobby'; this.hud.unmount(); this.input.setEnabled(false); this.hunt = null; this.menus.lobby(); }
  startHunt(o) {
    const p = Save.p; this.lastHunt = o;
    const queen = o.queen || p.queen;
    this.menus.clear();
    this.hunt = new Hunt({
      queenId: queen, heroId: o.hero, diff: o.diff || 0, hive: p.hive, palette: p.equip.palette, queenSkin: p.equip.queenSkin, splat: p.equip.splat, lowFx: p.settings.lowFx, mutator: o.mutator,
      sfx: (n, x, y) => this.audio.play(n, x, y, true), events: (e) => this.onEvent(e), intent: () => this.input.intent(),
      onEnd: (r) => this.endHunt({ ...r, daily: !!o.daily, tutorial: !!o.tutorial }),
    });
    this.renderer.init = false; this.state = 'hunt'; this.audio.mode = 'match'; this.tutorial = !!o.tutorial || !p.tutorialDone; this.tutStep = 0;
    const touch = Platform.isMobile || (matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches);
    this.touch = touch; this.hud.mount(this.hunt, touch, () => this.pause()); this.input.setEnabled(true);
    this.hud.$('abilBtn').addEventListener('click', () => { this.input.touchAbility = true; });
    Platform.gameplayStart();
    const h = HERO[o.hero];
    this.hud.announce(`HUNT: ${h.name.toUpperCase()}`, o.mutator ? `🌙 ${o.mutator.name} — ${o.mutator.desc}` : `${h.title} · bring the swarm`, true);
  }
  onEvent(e) {
    switch (e.type) {
      case 'announce': this.hud.announce(e.text, '', false); break;
      case 'herocast': if (this.tutorial && !this.castHint) { this.castHint = true; this.hud.hint('🟥 Red zone = incoming attack! <b>Release</b> to pull your swarm back, then swarm again!', 6); } break;
      case 'herolevel': this.hud.announce(`HERO LEVEL ${e.level}`, e.ability ? `New ability: ${e.ability.name}` : 'The hero grows stronger — hurry!', false); break;
      case 'enrage': this.hud.announce('🔥 THE HERO IS ENRAGED!', 'Finish it now!', true); break;
      case 'evolve': this.menus.evolve(e.opts, this.hunt.rerolls); if (this.tutorial && !this.evoHint) { this.evoHint = true; this.hud.hint('🧬 Pick an evolution — every hunt builds a different swarm!', 5); } break;
      case 'hurt': this.hud.hurt(); break;
      case 'win': this.hud.announce('HERO SLAIN!', 'The horde is victorious', true); Platform.happytime(); break;
      case 'lose': this.hud.announce('THE QUEEN HAS FALLEN', 'Protect her next time!', true); break;
    }
  }
  tutorialTick() {
    if (!this.tutorial || !this.hunt) return; const t = this.hunt.time; const T = this.touch;
    const steps = [[0.6, T ? '🕹️ Drag the <b>left side</b> to move your Queen — your swarm follows' : '🕹️ <b>WASD</b> moves your Queen — your swarm follows'], [6, T ? '🐜 <b>Hold SWARM</b> to send every minion at the hero' : '🐜 <b>Hold mouse or Space</b> to send every minion at the hero'], [16, '🟢 Fallen minions drop <b>biomass</b> — grab it with your Queen to hatch more'], [28, T ? '✨ Tap your <b>ability</b> button for your Queen\'s power' : '✨ Press <b>E</b> for your Queen\'s power']];
    if (this.tutStep < steps.length && t > steps[this.tutStep][0]) { this.hud.hint(steps[this.tutStep][1], 6); this.tutStep++; }
  }
  chooseEvo(id) { if (!this.hunt) return; this.hunt.choose(id); this.menus.clearEvolve(); }
  rerollEvo() { if (this.hunt && this.hunt.reroll()) this.menus.evolve(this.hunt.choosing, this.hunt.rerolls); }
  endHunt(res) {
    Platform.gameplayStop(); this.input.setEnabled(false);
    if (res.tutorial) Save.p.tutorialDone = true;
    const sum = Save.applyHunt(res);
    this.hud.unmount(); this.state = 'results'; this.audio.mode = 'lobby';
    this.menus.results(res, sum); this.hunt = null;
  }
  async afterResults(again) {
    const p = Save.p;
    if (Platform.adsAvailable && p.stats.hunts > 2 && p.sinceAd >= 2 && Date.now() - (p.lastMidgame || 0) > 180000) {
      p.sinceAd = 0; p.lastMidgame = Date.now(); Save.save();
      await Platform.midgame(() => this.audio.setForceMute(true)); this.audio.setForceMute(Platform.muteAudioSetting());
    }
    if (again && this.lastHunt) this.startHunt({ ...this.lastHunt, tutorial: false }); else this.toLobby();
  }
  async rewardedAd(cb) {
    if (!Platform.adsAvailable) { this.menus.toast({ icon: 'ℹ️', text: 'Ads unavailable right now' }); return; }
    const ui = document.getElementById('ui'); ui.style.pointerEvents = 'none';
    const ok = await Platform.rewarded(() => this.audio.setForceMute(true));
    ui.style.pointerEvents = ''; this.audio.setForceMute(Platform.muteAudioSetting());
    if (ok) cb(); else this.menus.toast({ icon: '📺', text: 'Ad not available — try again later' });
  }
  pause() { if (this.state !== 'hunt') return; this.state = 'paused'; this.input.setEnabled(false); Platform.gameplayStop(); this.menus.pause(); }
  resume() { if (this.state !== 'paused') return; this.menus.modalEl?.remove(); this.menus.modalEl = null; this.state = 'hunt'; this.input.setEnabled(true); this.last = performance.now(); Platform.gameplayStart(); }
  quit() { if (!this.hunt) return; this.menus.modalEl?.remove(); this.menus.modalEl = null; this.state = 'hunt'; this.hunt.queen.hp = 1; this.hunt.hurtQueen(999); this.hunt.endT = 0.01; }
  loop(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    if ((this.state === 'hunt' || this.state === 'paused') && this.hunt) {
      if (this.state === 'hunt') { this.acc += dt; let n = 0; while (this.acc >= STEP && n < 5 && this.hunt) { this.hunt.update(STEP); this.acc -= STEP; n++; } if (n === 5) this.acc = 0; }
      if (this.hunt) { this.renderer.draw(this.hunt, this.state === 'hunt' ? dt : 0); this.hud.update(dt); this.tutorialTick(); }
    } else {
      this.menus.tick(dt);
      const c = this.renderer.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#0b1414'; c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    requestAnimationFrame((t) => this.loop(t));
  }
}
const app = new App(); window.__app = app;
app.init().catch((e) => { console.error(e); const b = document.getElementById('boot'); if (b) b.innerHTML = '<div style="padding:20px;text-align:center">Something went wrong loading the game. Please refresh.</div>'; });
