// DRIFTLINE bootstrap + state machine.
import { Platform } from './platform.js';
import { Save } from './save.js';
import { Audio } from './audio.js';
import { Race, RaceRenderer, makeTrack, referenceLap } from './race.js';
import { Menus, HUD, fmtT, TIER_COL } from './ui.js';
import { CUPS, CAR } from './data.js';
import { clamp, dayNumber, pick } from './util.js';

const STEP = 1 / 60;
const ADJ = ['Neon', 'Velvet', 'Midnight', 'Turbo', 'Chrome', 'Laser', 'Retro', 'Sunset', 'Hyper', 'Cobalt'];
const NOUN = ['Loop', 'Ring', 'Run', 'Circuit', 'Bends', 'Canyon', 'Strip', 'Sprint', 'Spiral', 'Grid'];

class Input {
  constructor() { this.keys = new Set(); this.edge = new Set(); this.touches = new Map(); this.enabled = false; }
  attach() {
    addEventListener('keydown', (e) => { const k = e.key.toLowerCase(); if (this.enabled && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault(); if (!this.keys.has(k)) this.edge.add(k); this.keys.add(k); });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => { this.keys.clear(); this.touches.clear(); });
    const opt = { passive: false };
    addEventListener('touchstart', (e) => { if (!this.enabled) return; for (const t of e.changedTouches) { if (t.target.closest && (t.target.closest('#pauseBtn') || t.target.closest('.modal'))) continue; this.touches.set(t.identifier, t.clientX); e.preventDefault(); } this.vis(); }, opt);
    addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (this.touches.has(t.identifier)) this.touches.set(t.identifier, t.clientX); if (this.enabled) e.preventDefault(); this.vis(); }, opt);
    const end = (e) => { for (const t of e.changedTouches) this.touches.delete(t.identifier); this.vis(); };
    addEventListener('touchend', end); addEventListener('touchcancel', end);
  }
  sides() { let l = false, r = false; for (const x of this.touches.values()) { if (x < innerWidth / 2) l = true; else r = true; } return { l, r }; }
  vis() { const s = this.sides(); document.getElementById('tl')?.classList.toggle('down', s.l); document.getElementById('tr')?.classList.toggle('down', s.r); }
  intent() {
    const K = this.keys; let steer = 0;
    if (K.has('arrowleft') || K.has('a') || K.has('q')) steer -= 1; if (K.has('arrowright') || K.has('d')) steer += 1;
    let brake = K.has('arrowdown') || K.has('s');
    const s = this.sides(); if (s.l && s.r) brake = true; else if (s.l) steer = -1; else if (s.r) steer = 1;
    return { steer, brake, drift: K.has(' ') || K.has('shift') };
  }
  setEnabled(v) { this.enabled = v; if (!v) this.touches.clear(); }
}

class App {
  async init() {
    this.state = 'boot'; Platform.loadingStart(); await Platform.init(); Save.load();
    this.audio = new Audio(); this.canvas = document.getElementById('game'); this.renderer = new RaceRenderer(this.canvas);
    this.input = new Input(); this.input.attach(); this.hud = new HUD(document.getElementById('hud')); this.menus = new Menus(document.getElementById('ui'), this);
    Platform.onMuteChange = (m) => this.audio.setForceMute(m || Platform.adPlaying);
    this.applySettings(); this.resize(); addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'race') this.pause(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { if (this.state === 'race') this.pause(); else if (this.state === 'paused') this.resume(); } });
    const unlock = () => { this.audio.ensure(); this.audio.startMusic(); };
    addEventListener('pointerdown', unlock); addEventListener('touchend', unlock); addEventListener('keydown', unlock);
    Platform.loadingStop(); document.getElementById('boot').style.opacity = 0; setTimeout(() => document.getElementById('boot').remove(), 400);
    this.last = performance.now(); this.acc = 0; this.frame = 0; requestAnimationFrame((t) => this.loop(t));
    if (!Save.p.tutorialDone) this.firstRun(); else this.toLobby();
  }
  applySettings() { const s = Save.p.settings; this.audio.sfxVol = s.sfx; this.audio.musicVol = s.music; this.audio.setForceMute(Platform.muteAudioSetting()); this.audio.apply(); }
  resize() { this.renderer.resize(innerWidth, innerHeight, Math.min(Platform.isMobile ? 1.5 : 2, devicePixelRatio || 1)); }
  firstRun() {
    const ui = document.getElementById('ui');
    ui.innerHTML = `<div class="screen lobby" style="align-items:center;justify-content:center;text-align:center;gap:18px"><div class="logo">DRIFT<span>LINE</span></div>
      <div class="stroke" style="font-size:clamp(16px,3vw,24px);font-weight:900;max-width:640px">One thumb. Endless drift.<br><span style="color:#4cc9f0">Slide longer → boost harder.</span></div>
      <button class="play" style="width:min(360px,80vw)" id="frplay">TAP TO PLAY<small>no sign-up · instant</small></button></div>`;
    ui.querySelector('#frplay').addEventListener('click', () => { this.audio.ensure(); this.audio.startMusic(); this.startRace({ mode: 'career', cup: 'neon', ti: 0, tutorial: true }); });
  }
  toLobby() { this.state = 'lobby'; this.audio.mode = 'lobby'; this.audio.engineStop(); this.hud.unmount(); this.input.setEnabled(false); this.race = null; this.menus.lobby(); }
  startRace(o) {
    const p = Save.p; this.cfg = o; let seed, skill = 0.4, rivals = 5, name, ghostKey, laps = 3;
    if (o.mode === 'career') { const cup = CUPS.find((c) => c.id === o.cup); const tr = cup.tracks[o.ti]; seed = tr.seed; skill = cup.skill; name = tr.name; ghostKey = `c_${seed}`; if (o.tutorial) skill = 0.18; }
    else if (o.mode === 'daily') { seed = 50000 + dayNumber(); rivals = 0; name = `Daily Track #${dayNumber() % 1000}`; ghostKey = `d_${dayNumber()}`; }
    else { seed = o.seed || Math.floor(Math.random() * 1e6); o.seed = seed; skill = clamp(0.3 + p.trophies / 1100, 0.3, 0.97) * (p.stats.races < 3 ? 0.8 : 1); name = o.name || (o.name = `${pick(ADJ)} ${pick(NOUN)}`); ghostKey = `q_${seed}`; }
    const track = makeTrack(seed);
    let medals = null; if (o.mode === 'daily') { const ref = referenceLap(track); const gold = ref * 3 + 2.5; medals = [gold, gold * 1.07, gold * 1.16]; }
    this.menus.clear();
    const eq = p.equip;
    this.race = new Race({ track, laps, rivals, skill, car: p.car, name: p.name, paint: Save.item(eq.paint), decal: Save.item(eq.decal), glow: Save.item(eq.glow), smoke: Save.item(eq.smoke), ghost: p.ghosts[ghostKey] || null, lowFx: p.settings.lowFx,
      sfx: (n) => this.audio.play(n), events: (e) => this.onEvent(e), intent: () => this.input.intent(),
      onEnd: (res) => this.endRace({ ...res, mode: o.mode, trackName: name, trackKey: o.mode === 'career' ? `${o.cup}_${o.ti}` : null, medals, tutorial: !!o.tutorial }) });
    this.race.onLap = (lt, rec) => { if (Save.saveGhost(ghostKey, lt, rec)) { this.race.ghost = rec.slice(); this.newRecord = true; } };
    this.newRecord = false; this.ghostKey = ghostKey;
    this.renderer.init = false; this.state = 'race'; this.audio.mode = 'match'; this.tutStep = 0; this.tutorial = !!o.tutorial;
    const touch = Platform.isMobile || (matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches); this.touch = touch;
    this.hud.mount(this.race, touch, () => this.pause(), { best: p.best[ghostKey] ?? null }); this.input.setEnabled(true);
    this.audio.engineStart(); Platform.gameplayStart();
    this.hud.announce(name.toUpperCase(), o.mode === 'daily' ? `🥇 ${fmtT(medals[0])}  🥈 ${fmtT(medals[1])}  🥉 ${fmtT(medals[2])}` : `${rivals + 1} drivers · ${laps} laps`);
  }
  onEvent(e) {
    switch (e.type) {
      case 'count': this.hud.count(e.n); break;
      case 'go': this.hud.count('GO!'); if (this.tutorial) this.hud.announce('', this.touch ? 'Hold LEFT or RIGHT side of the screen to steer' : '← → to steer — the car accelerates itself'); break;
      case 'tier': if (this.tutorial && e.tier === 1 && !this.th1) { this.th1 = true; this.hud.announce('KEEP HOLDING!', 'Sparks turn blue → orange → purple'); } break;
      case 'boost': this.hud.announce(['', 'BOOST!', 'SUPER BOOST!', 'ULTRA BOOST!'][e.tier], '', TIER_COL[e.tier]); break;
      case 'overtake': if (e.place <= 3) this.hud.announce(`${['', '1ST', '2ND', '3RD'][e.place]} PLACE`, '', '#7CFC9A'); break;
      case 'lap': this.hud.announce(`LAP ${fmtT(e.time)}`, this.newRecord ? '🟢 NEW BEST — your ghost will race you' : e.clean ? '✨ Clean lap!' : ''); this.newRecord = false; break;
      case 'finallap': this.hud.announce('FINAL LAP!', '', '#ff4d6d'); break;
      case 'finish': this.hud.announce(this.race.cars.length === 1 ? 'FINISH!' : e.place === 1 ? '🏆 VICTORY!' : `FINISHED ${['', '1ST', '2ND', '3RD', '4TH', '5TH', '6TH'][e.place]}`, ''); this.input.setEnabled(false); if (e.place === 1 && this.race.cars.length > 1) Platform.happytime(); break;
    }
  }
  tutorialTick() {
    if (!this.tutorial || !this.race) return; const t = this.race.time;
    const steps = [[4, '', this.touch ? 'Keep holding a side through a corner to DRIFT 💨' : 'Hold a turn through a corner to DRIFT 💨'], [10, '', 'Let go to fire your BOOST — longer drift, bigger boost!'], [18, '', 'Stay on the road — grass slows you down']];
    if (this.tutStep < steps.length && t > steps[this.tutStep][0]) { this.hud.announce(steps[this.tutStep][1], steps[this.tutStep][2]); this.tutStep++; }
  }
  endRace(res) {
    Platform.gameplayStop(); this.input.setEnabled(false); this.audio.engineStop();
    const p = Save.p; if (res.tutorial) p.tutorialDone = true;
    res.newLapRecord = res.bestLap !== null && p.best[this.ghostKey] !== undefined && Math.abs(p.best[this.ghostKey] - res.bestLap) < 0.002;
    if (res.mode === 'daily') res.medal = res.time <= res.medals[0] ? 3 : res.time <= res.medals[1] ? 2 : res.time <= res.medals[2] ? 1 : 0;
    if (res.mode === 'career') { const cup = CUPS.find((c) => c.id === this.cfg.cup); res.hasNext = this.cfg.ti < 2; }
    const sum = Save.applyRace(res);
    this.hud.unmount(); this.state = 'results'; this.audio.mode = 'lobby'; this.menus.results(res, sum); this.race = null;
  }
  async afterResults(again) {
    const p = Save.p;
    // Poki: no own timers — call a break whenever the player heads back into gameplay; Poki decides if an ad shows.
    // CrazyGames: natural breaks only, spaced out, never in the first matches.
    const pokiBreak = Platform.name === 'poki' && !!again;
    if (pokiBreak || Platform.adsAvailable && Platform.name !== 'poki' && p.stats.races > 2 && p.sinceAd >= 2 && Date.now() - (p.lastMidgame || 0) > 180000) { p.sinceAd = 0; p.lastMidgame = Date.now(); Save.save(); await Platform.midgame(() => this.audio.setForceMute(true)); this.audio.setForceMute(Platform.muteAudioSetting()); }
    if (again === 'next') this.startRace({ ...this.cfg, ti: this.cfg.ti + 1, tutorial: false });
    else if (again) this.startRace({ ...this.cfg, tutorial: false });
    else this.toLobby();
  }
  async rewardedAd(cb) {
    if (!Platform.adsAvailable) { this.menus.toast({ icon: 'ℹ️', text: 'Ads unavailable right now' }); return; }
    const ui = document.getElementById('ui'); ui.style.pointerEvents = 'none'; const ok = await Platform.rewarded(() => this.audio.setForceMute(true)); ui.style.pointerEvents = ''; this.audio.setForceMute(Platform.muteAudioSetting());
    if (ok) cb(); else if (Platform.name !== 'poki') this.menus.toast({ icon: '📺', text: 'Ad not available — try again later' });
  }
  pause() { if (this.state !== 'race') return; this.state = 'paused'; this.input.setEnabled(false); this.audio.engineSet(0); Platform.gameplayStop(); this.menus.pause(); }
  resume() { if (this.state !== 'paused') return; this.menus.modalEl?.remove(); this.menus.modalEl = null; this.state = 'race'; this.input.setEnabled(true); this.last = performance.now(); Platform.gameplayStart(); }
  restart() { this.menus.modalEl?.remove(); this.menus.modalEl = null; Platform.gameplayStop(); this.audio.engineStop(); this.startRace({ ...this.cfg, tutorial: false }); }
  quit() { this.menus.modalEl?.remove(); this.menus.modalEl = null; Platform.gameplayStop(); this.toLobby(); }
  loop(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; this.frame++;
    if ((this.state === 'race' || this.state === 'paused') && this.race) {
      if (this.state === 'race') { this.acc += dt; let n = 0; while (this.acc >= STEP && n < 5 && this.race) { this.race.update(STEP); this.acc -= STEP; n++; } if (n === 5) this.acc = 0; }
      if (this.race) { const p = this.race.player; this.renderer.draw(this.race, this.state === 'race' ? dt : 0); this.hud.update(dt, this.frame); this.tutorialTick(); if (this.state === 'race') this.audio.engineSet(clamp(Math.hypot(p.vx, p.vy) / 700, 0, 1.2), p.drift, p.boostT > 0); }
    } else {
      this.menus.tick(dt); const c = this.renderer.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#0a0618'; c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    requestAnimationFrame((t) => this.loop(t));
  }
}
const app = new App(); window.__app = app;
app.init().catch((e) => { console.error(e); const b = document.getElementById('boot'); if (b) b.innerHTML = '<div style="padding:20px;text-align:center">Something went wrong loading the game. Please refresh.</div>'; });
