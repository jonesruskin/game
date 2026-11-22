// FUSEWORKS — app orchestration: layout, input, the launch/chain/tally loop, run flow, tutorial, ads, saving.
import { Renderer, xfFor } from './gl.js';
import { buildAtlas, paintBackdrop, THEMES } from './atlas.js';
import { Scene } from './scene.js';
import { Overlay } from './overlay.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import { Save } from './save.js';
import { Platform } from './platform.js';
import { Run } from './run.js';
import { IDLE } from './sky.js';
import { FIELD_AREA, SHELL_R, CAT, CHARM, ACT_NAMES, NIGHTS, COLORS, SHELLS, BOSS } from './content.js';
import { fmt, fmtHeat, hashStr, dayNumber, clamp } from './util.js';

const $ = (s) => document.querySelector(s);
const STEP = 1 / 60;

class App {
  constructor() {
    this.cv = $('#gl'); this.ov = $('#ov'); this.audio = new Audio();
    this.R = new Renderer(this.cv); this.scene = new Scene(this.audio); this.overlay = new Overlay(this.ov); this.ui = new UI(this);
    this.state = 'boot'; this.run = null; this.u = { hover: null, selected: null, drag: null, preview: null, targets: [] };
    this.phase = 'idle'; this.seq = []; this.timeScale = 1; this.slow = 0; this.ff = false; this.acc = 0; this.last = performance.now(); this.paused = false;
    this.view = { ox: 0, oy: 0, s: 1 }; this.calc = { sp: 0, ht: 0 }; this.shownScore = 0; this.live = 0; this.logIdx = 0; this.sessionActs = 0; this.lastAd = 0; this.pressed = null; this.targeting = null; this.tut = null;
  }
  async boot() {
    Platform.loadingStart(); await Platform.init(); Save.load();
    if (!this.R.ok) { $('#boot').innerHTML = '<div class="nogl">Fuseworks needs WebGL 2.<br>Please update your browser.</div>'; return; }
    const at = buildAtlas(); this.atlas = at; this.R.setAtlas(at.canvas); this.R.onRestore = () => { this.R.setAtlas(at.canvas); this.layout(true); };
    // glyph images for the DOM (pack/shop/crate cards)
    for (const t of Object.keys(SHELLS)) { const u = at.uv['g_' + t]; const c = document.createElement('canvas'); c.width = c.height = 96; c.getContext('2d').drawImage(at.canvas, u[0] * 1024 - 0.5, u[1] * 1024 - 0.5, 96, 96, 0, 0, 96, 96); this.ui.glyph[t] = c.toDataURL(); }
    try { await Promise.race([document.fonts.load("40px 'Lilita One'"), new Promise((r) => setTimeout(r, 1500))]); await document.fonts.load("16px 'Rubik'"); } catch (e) {}
    this.applySettings(); Save.checkAch(null); // award anything earned by older saves
    Platform.onMuteChange = (m) => this.audio.setMuted(m); this.audio.setMuted(Platform.muteAudioSetting());
    addEventListener('resize', () => this.layout()); this.layout();
    this.bindInput();
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.saveRun(); this.audio.suspend(); } else if (!Platform.adPlaying) this.audio.resume(); });
    addEventListener('pagehide', () => this.saveRun());
    $('#boot').classList.add('gone'); setTimeout(() => $('#boot').remove(), 600);
    Platform.loadingStop();
    this.toTitle();
    requestAnimationFrame((t) => this.frame(t));
    window.__app = this;
  }
  applySettings() { const s = Save.p.settings; this.audio.setVolumes(s.sfx, s.music); this.scene.setLowFx(s.lowFx); this.R.lowFx = s.lowFx; this.R.renderScale = s.lowFx ? 0.7 : 1; this.scene.burstStyle = Save.p.equip.burst; this.scene.trailStyle = Save.p.equip.trail; this.scene.cbMarks = !!s.cbMarks; }
  adsOn() { return Platform.adsAvailable; }
  // ------------------------------------------------------------------ layout
  layout(force) {
    const W = innerWidth, H = innerHeight; const dpr = Math.min(devicePixelRatio || 1, Save.p.settings.lowFx ? 1.25 : 2);
    const land = W / H >= 1.12; const compact = Math.min(W, H) < 560; document.body.classList.toggle('land', land); document.body.classList.toggle('port', !land); document.body.classList.toggle('compact', compact);
    let side, top, bottom, info, waterY, F;
    if (land) { side = compact ? clamp(W * 0.18, 146, 190) : clamp(W * 0.2, 200, 300); top = compact ? clamp(H * 0.17, 60, 92) : clamp(H * 0.17, 92, 136); waterY = H * (compact ? 0.93 : 0.91); F = { x: side + (compact ? 10 : 18), y: top + (compact ? 4 : 10), w: W - side - (compact ? 20 : 36), h: waterY - top - (compact ? 18 : 34) }; bottom = 0; info = 0; }
    else { top = clamp(H * 0.105, 66, 108); info = clamp(H * 0.08, 58, 76); bottom = clamp(H * 0.17, 120, 168); waterY = H - bottom - 4; F = { x: 10, y: top + info + 8, w: W - 20, h: waterY - top - info - 30 }; side = 0; }
    const st = document.documentElement.style; st.setProperty('--side', side + 'px'); st.setProperty('--top', top + 'px'); st.setProperty('--bottom', bottom + 'px'); st.setProperty('--info', info + 'px');
    this.W = W; this.H = H; this.dpr = dpr; this.F = F; this.waterY = waterY; this.land = land;
    const pw = Math.round(W * dpr), ph = Math.round(H * dpr); this.cv.width = pw; this.cv.height = ph; this.cv.style.width = W + 'px'; this.cv.style.height = H + 'px';
    this.R.resize(pw, ph); this.overlay.resize(W, H, dpr);
    const theme = Save.p.equip.theme; const bd = paintBackdrop(theme, W, H, waterY, dpr * this.R.renderScale); this.R.setBackground(bd.color, bd.mask); this.theme = bd.theme;
    this.fitView();
  }
  fieldDims() { const a = clamp(this.F.w / this.F.h, 0.6, document.body.classList.contains('compact') ? 2 : 1.6); const Ww = Math.sqrt(FIELD_AREA * a); return { W: Math.round(Ww), H: Math.round(FIELD_AREA / Ww) }; }
  fitView() {
    const a = this.run && this.run.act; let Ww, Hw, F = this.F;
    if (a) { Ww = a.W; Hw = a.H; } else { const s = Math.min(this.W, this.H) / 900; this.view = { ox: 0, oy: 0, s }; this.scene.W = this.W / s; this.scene.H = this.waterY / s; this.setToUV(); return; }
    const s = Math.min(F.w / Ww, F.h / Hw); this.view = { ox: F.x + (F.w - Ww * s) / 2, oy: F.y + (F.h - Hw * s) / 2, s }; this.scene.W = Ww; this.scene.H = Hw; this.setToUV();
  }
  setToUV() { this.scene.toUV = (x, y) => [(this.view.ox + x * this.view.s) / this.W, 1 - (this.view.oy + y * this.view.s) / this.H]; }
  toWorld(cx, cy) { return [(cx - this.view.ox) / this.view.s, (cy - this.view.oy) / this.view.s]; }
  launcherWorld() { const [x, y] = this.toWorld(this.W / 2 + (this.land ? this.F.x / 2 - 9 : 0), this.waterY - 6); return { x, y }; }
  // ------------------------------------------------------------------ input
  bindInput() {
    const el = this.ov; el.style.touchAction = 'none'; addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => { this.audio.init(); this.down(e); });
    addEventListener('pointermove', (e) => this.move(e)); addEventListener('pointerup', (e) => this.up(e)); addEventListener('pointercancel', (e) => this.up(e, true));
    document.addEventListener('pointerdown', () => this.audio.init(), { once: false, capture: true });
    addEventListener('keydown', (e) => this.key(e));
  }
  shellAt(cx, cy, r = 1.7) { const sky = this.run && this.run.act && this.run.act.sky; if (!sky) return null; const [x, y] = this.toWorld(cx, cy); let best = null, bd = SHELL_R * r + 14 / this.view.s; for (const s of sky.shells) { if (s.state !== IDLE) continue; const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } } return best; }
  canInteract() { return this.state === 'act' && this.phase === 'idle' && this.run && this.run.phase === 'act' && !this.paused && !this.ui.modalEl.classList.contains('on'); }
  down(e) {
    if (this.state === 'title' || this.state === 'menu') { const [x, y] = this.toWorld(e.clientX, e.clientY); const sc = this.scene; const s = { x, y: Math.min(y, sc.H * 0.85), type: ['peony', 'willow', 'palm', 'crossette', 'ring', 'glitter', 'crown', 'crackle'][Math.floor(Math.random() * 8)], color: ['crimson', 'amber', 'azure', 'jade'][Math.floor(Math.random() * 4)], enh: null }; sc.rocket(x + (Math.random() - 0.5) * 80, sc.H + 60, s.x, s.y, 0.55, () => sc.burst(s, {})); return; }
    if (this.state === 'act' && this.phase === 'chain') { this.ff = true; return; }
    if (!this.canInteract()) return;
    const s = this.shellAt(e.clientX, e.clientY);
    if (this.targeting) { if (s) this.toggleTarget(s); return; }
    if (!s) { this.u.selected = null; return; }
    this.pressed = { s, x0: e.clientX, y0: e.clientY, id: e.pointerId, type: e.pointerType, t0: performance.now() };
  }
  move(e) {
    if (this.state !== 'act') return; const p = this.pressed;
    if (p && p.id === e.pointerId) {
      const d = Math.hypot(e.clientX - p.x0, e.clientY - p.y0);
      if (!this.u.drag && d > 10 && !this.tutLock('drag', p.s)) { if (this.run.canMove()) { this.u.drag = { s: p.s, x: p.s.x, y: p.s.y, ok: true }; this.u.selected = null; this.audio.ui('flip'); } else if (!p.warned) { p.warned = true; this.ui.toast('No Moves left this act', 'warn'); this.audio.ui('error'); } }
      if (this.u.drag) { const [x, y] = this.toWorld(e.clientX, e.clientY - (p.type === 'mouse' ? 0 : 36)); const sky = this.run.act.sky; this.u.drag.x = clamp(x, sky.margin, sky.W - sky.margin); this.u.drag.y = clamp(y, sky.margin, sky.H - sky.margin); this.u.drag.ok = sky.canPlace(this.u.drag.x, this.u.drag.y, p.s); }
      return;
    }
    if (e.pointerType === 'mouse' && this.canInteract()) { const s = this.shellAt(e.clientX, e.clientY, 1.4); if (s !== this.u.hover) { this.u.hover = s; if (s) this.audio.ui('hover'); } this.ov.style.cursor = s ? (this.targeting ? 'copy' : 'pointer') : 'default'; }
  }
  up(e, cancel) {
    if (this.ff && this.phase === 'chain') this.ff = false;
    const p = this.pressed; if (!p || p.id !== e.pointerId) return; this.pressed = null;
    if (this.u.drag) { const d = this.u.drag; this.u.drag = null; if (!cancel && d.ok && this.run.moveShell(d.s, d.x, d.y)) { this.audio.ui('move'); this.scene.P.emit({ life: [0.3, 0.4], size: [20, 110], c0: COLORS[d.s.color].rgb, a: 0.6, spr: 3 }, d.x, d.y, 0, 0); this.afterMove(); } else if (!cancel) this.audio.ui('error'); return; }
    if (cancel || !this.canInteract()) return;
    const s = p.s; if (this.tutLock('light', s)) return;
    if (p.type === 'mouse' || this.u.selected === s || (this.tut && this.tut.step === 'tap')) this.light(s); else { this.u.selected = s; this.audio.ui('hover'); }
  }
  key(e) {
    if (e.key === 'Escape') { if (this.targeting) this.cancelTarget(); else if (this.state === 'act' && !this.ui.modalEl.classList.contains('on')) this.act('pause'); else if (this.ui.modalEl.classList.contains('on') && this.state !== 'over') this.act('close'); return; }
    if ((e.key === ' ' || e.key === 'Enter') && this.canInteract() && !this.targeting) { const s = this.u.selected || this.u.hover; if (s) { e.preventDefault(); this.light(s); } }
  }
  // ------------------------------------------------------------------ gameplay
  hudState() {
    const run = this.run, a = run && run.act; if (!run) return null;
    let hint = '', hintHtml = '';
    if (this.targeting) { const c = CHARM[run.charms[this.targeting.i].id]; hintHtml = `<span>${c.name}: pick ${c.need > 1 ? 'up to ' + c.need + ' shells' : 'a shell'} (${this.targeting.sel.length}/${c.need})</span><button class="btn sm primary" data-act="apply-charm" ${this.targeting.sel.length ? '' : 'disabled'}>Apply</button><button class="btn sm ghost" data-act="cancel-charm">Cancel</button>`; }
    else if (this.tut && this.tut.text) hint = this.tut.text;
    else if (this.state === 'act' && this.phase === 'idle' && a) { const touch = this.lastPointer !== 'mouse'; hint = this.u.selected ? 'Tap it again to light it · drag to move it' : a.launchNo === 0 && run.night === 1 && run.actIdx <= 1 ? (touch ? 'Tap a firework to aim · tap again to light' : 'Click a firework to light it · drag to move it') : ''; }
    else if (this.phase === 'chain') hint = this.ff ? 'Fast-forward ▸▸' : '';
    return { score: this.shownScore, target: a ? a.target : run.target(), sp: this.calc.sp, ht: this.calc.ht, live: this.live, launches: a ? Math.max(0, a.launches - a.launchNo) : run.mods.launches, moves: a ? a.moves : run.mods.moves, crate: a ? a.pile.length : run.crate.length, hint, hintHtml };
  }
  light(s) {
    const run = this.run; const L = run.beginLaunch(s); if (!L) return;
    this.u.selected = null; this.u.hover = null; this.phase = 'rocket'; this.logIdx = 0; this.live = 0; this.calc = { sp: 0, ht: 0 }; this.targetHit = this.shownScore >= run.act.target; this.gfDone = false; this.uidMap = new Map(run.act.sky.shells.map((x) => [x.uid, x]));
    const from = this.launcherWorld(); this.audio.intensity = 0.2; this.ui.renderCats();
    this.scene.rocket(from.x, from.y, s.x, s.y, 0.42, () => { if (this.phase === 'rocket') this.phase = 'chain'; });
    if (this.tut && (this.tut.step === 'tap' || this.tut.step === 'drag' || this.tut.step === 'move')) { this.tut.text = ''; this.tut.hand = null; if (this.tut.step !== 'tap') this.tut.step = 'done2'; }
    Platform.gameplayStart();
  }
  afterMove() { if (this.tut && this.tut.step === 'drag') { this.tut.step = 'move'; this.tut.hand = null; this.tut.text = 'Nice! Now light the chain.'; } }
  stepChain(dt) {
    const run = this.run, a = run.act, sky = a.sky, L = a.current; if (!L) return;
    const sp = (Save.p.settings.fast ? 1.6 : 1) * (this.ff ? 2.6 : 1);
    sky.advance(dt * sp);
    this.scene.consume(sky, { burst: (e) => { if (!e.retrig) { this.audio.note(L.chain - 1, 1); } else this.audio.note(Math.min(L.chain + 2, 19), 0.6); this.audio.intensity = Math.min(1, L.bursts / 14); } });
    // replay the scoring log with juice
    for (; this.logIdx < L.log.length; this.logIdx++) {
      const e = L.log[this.logIdx], n = L.log[this.logIdx + 1];
      if (e.k === 's' && !e.src && n && n.k === 'h' && !n.src && n.at === e.at && n.t === e.t) { const sh = this.uidMap.get(e.at); if (sh) this.overlay.pop(sh.x, sh.y, [['+' + fmt(e.v), '#5fe1ff'], ['+' + fmtHeat(n.v), '#ffa63d']], 's'); this.logIdx++; continue; }
      this.showEntry(e, false);
    }
    this.calc.sp = L.sparks; this.calc.ht = L.heat; this.live = Math.floor(L.sparks * L.heat);
    if (!this.targetHit && this.shownScore + this.live >= a.target) { this.targetHit = true; this.slow = 0.55; this.scene.celebrate(0.6); this.ui.banner('TARGET!', '', 'target', 1.1); this.audio.fanfare(0); }
    if (!this.gfDone && L.skyCount >= 5 && sky.shells.every((s) => s.state !== IDLE) && sky.q.length < 3) { this.gfDone = true; this.slow = Math.max(this.slow, 0.8); this.scene.celebrate(1); this.ui.banner('GRAND FINALE!', `×${run.mods.finale} Heat`, 'finale', 1.8); this.audio.applause(2.6, 1); for (let i = 0; i < 5; i++) setTimeout(() => this.scene.ambient(99, 99), 120 * i); Platform.happytime(); this.haptic([40, 40, 80]); }
    if (sky.done) this.endChain();
  }
  showEntry(e, end) {
    const sh = e.at ? this.uidMap.get(e.at) : null; const pos = sh ? { x: sh.x, y: sh.y } : { x: this.scene.W / 2, y: this.scene.H * 0.42 };
    const O = this.overlay; let txt = null, cls = e.k;
    if (e.k === 's') txt = '+' + fmt(e.v); else if (e.k === 'h') txt = '+' + fmtHeat(e.v); else if (e.k === 'x') txt = '×' + fmtHeat(e.v); else if (e.k === '$') { txt = '+$' + e.v; this.audio.ui('coin'); }
    if (e.k === 'say') { if (e.cls === 'finale') return; O.pop(pos.x, pos.y, e.v, e.cls, { word: true, size: e.cls === 'mute' ? 20 : 28 }); return; }
    if (txt) { if (!e.src || end) O.pop(pos.x, pos.y, txt, cls, end ? { size: 30 } : {}); if (e.src) this.ui.catFx(e.src, txt, cls === 'x' ? 'x' : cls === '$' ? 'm' : cls === 's' ? 's' : 'h'); }
  }
  endChain() {
    const run = this.run, a = run.act, L = a.current; this.phase = 'tally'; this.ff = false;
    const prevScore = this.shownScore; const res = run.endLaunch(); this.lastRes = res; const now = this.scene.time;
    const steps = L.endLog.filter((e) => e.k !== 'say' || e.cls !== 'finale' || true); let t = 0.35; let k = 0;
    for (const s of a.sky.shells) if (!this.uidMap.has(s.uid)) s.bornT = now + 9; // new shells appear after the tally
    for (const e of steps) { this.seq.push({ at: t, fn: () => { this.calc.sp = e.S; this.calc.ht = e.H; this.live = Math.floor(e.S * e.H); this.audio.tick(k++); if (e.k === 'say') this.ui.banner(e.v, '', e.cls, 1.2); else this.showEntry(e, true); } }); t += e.k === 'say' ? 0.55 : 0.3; }
    this.seq.push({ at: t + 0.1, fn: () => this.slam(prevScore, res) });
    this.seq.push({ at: t + 1.05, fn: () => this.afterLaunch(res) });
  }
  haptic(p) { try { if (navigator.vibrate && this.lastPointer === 'touch') navigator.vibrate(p); } catch (e) {} }
  slam(prevScore, res) {
    const run = this.run, a = run.act; const score = res.score; this.calc.sp = res.launch.sparks; this.calc.ht = res.launch.heat;
    const pow = clamp(Math.log10(Math.max(10, score / Math.max(1, a.target))) + 1, 0.6, 1.6);
    this.audio.slam(pow); this.haptic(Math.round(25 * pow)); this.scene.shake(0.3 * pow); this.scene.kick(0.02 * pow); this.ui.banner(fmt(score), `${fmt(res.launch.sparks)} × ${fmtHeat(res.launch.heat)}`, 'slam', 1);
    this.shownScore = a.score; this.live = 0; this.ui.bump('hScore', 'pop');
    if (score > (Save.p.stats.bestLaunch || 0) && Save.p.stats.runs > 0 && score > 1000) this.ui.toast(`${'NEW BEST LAUNCH'} · <b>${fmt(score)}</b>`, 'best');
    const ach = Save.bump(run); for (const x of ach) { this.ui.achToast(x); this.ui.renderCats(); }
  }
  afterLaunch(res) {
    const run = this.run, a = run.act; this.phase = 'idle'; this.u.preview = null; this.audio.intensity = 0.1;
    for (const s of a.sky.shells) if (s.bornT > this.scene.time) s.bornT = this.scene.time + Math.random() * 0.25;
    this.calc = { sp: 0, ht: 0 }; this.ui.renderCats();
    if (res.cleared) { this.phase = 'done'; const over = a.score / a.target; this.ui.banner(over >= 3 ? 'TARGET SMASHED!' : 'ACT CLEAR!', over >= 2 ? `×${over.toFixed(1)} the target` : '', 'clear', 1.6); this.audio.fanfare(Math.min(3, Math.floor(over))); this.scene.confetti(over >= 2 ? 220 : 140); this.scene.celebrate(0.7); if (over >= 3) Platform.happytime(); this.seq.push({ at: 1.5, fn: () => this.cashout() }); this.sessionActs++; return; }
    if (a.boss === 'tremor' && !res.cleared) { this.scene.shake(0.6); this.audio.boom(1.2, 0, false); this.ui.toast('The Tremor shakes the sky loose!', 'warn'); }
    if (res.phoenix) { this.ui.banner('PHOENIX!', 'One more launch', 'finale', 1.6); this.audio.fanfare(1); this.ui.renderCats(); }
    if (res.failed) { this.phase = 'done'; this.seq.push({ at: 0.6, fn: () => this.lose() }); return; }
    if (this.tut && this.tut.step === 'done2') { this.tut = null; Save.p.tutorialDone = true; Save.save(); }
    this.saveRun();
  }
  cashout() { if (this.tut && this.tut.step === 'tap') this.tut.step = 'shop'; const run = this.run; const act = run.act; if (act.idx === 2) { for (let i = 0; i < 6; i++) setTimeout(() => this.scene.ambient(99, 99), 160 * i); this.audio.applause(3, 0.9); } const res = run.cashOut(); this.lastCash = res; this.shownScore = 0; this.ui.disp.score = 0; Platform.gameplayStop(); this.ui.cashout(res, run, act); this.audio.setMood('shop'); res.lines.forEach((l, i) => setTimeout(() => this.audio.ui('coin'), 250 + i * 160)); this.saveRun(); }
  toShop() {
    const run = this.run; this.ui.modal('');
    if (run.phase === 'won') { const w = Save.recordWin(run); this.saveRun(); const fin = { dust: w.dust, ach: w.ach, canDouble: false }; for (const a of w.ach) this.ui.achToast(a); this.state = 'over'; this.ui.over(run, fin, true); this.audio.applause(4, 1); this.scene.confetti(300); for (let i = 0; i < 8; i++) setTimeout(() => this.scene.ambient(99, 99), 220 * i); return; }
    this.state = 'shop'; document.body.classList.add('inshop'); this.ui.shop(run); this.ui.renderCats();
    if (this.tut && this.tut.step === 'shop') { this.ui.toast('Catalysts power up every launch. Buy one!', 'tip'); }
  }
  async nextAct() {
    const run = this.run; run.leaveShop(); this.ui.show(''); document.body.classList.remove('inshop'); this.saveRun();
    // natural break: CrazyGames midgame (never in the first acts, ≥3 min apart); Poki decides frequency itself
    if (Platform.name === 'poki' || (Platform.name === 'crazygames' && this.sessionActs >= 3 && Date.now() - this.lastAd > 180000)) { await this.withAd(() => Platform.midgame(() => this.audio.suspend())); this.lastAd = Date.now(); }
    this.startAct();
  }
  async withAd(fn) { this.paused = true; Platform.gameplayStop(); const r = await fn(); this.paused = false; this.audio.resume(); return r; }
  startAct() {
    const run = this.run; const d = this.fieldDims(); const a = run.startAct(d.W, d.H); this.state = 'act'; this.phase = 'idle'; this.fitView(); this.shownScore = 0; this.ui.disp.score = 0; this.calc = { sp: 0, ht: 0 };
    a.sky.shells.forEach((s, i) => (s.bornT = this.scene.time + 0.5 + i * 0.045));
    this.audio.setKey(run.night); this.audio.setMood(a.boss ? 'boss' : 'play'); this.ui.buildHud(); this.ui.show(''); this.ui.modal('');
    const b = a.boss ? this.bossName(a.boss) : null;
    this.ui.banner(`NIGHT ${run.night} · ${ACT_NAMES[a.idx].toUpperCase()}`, `Target <b>${fmt(a.target)}</b>${b ? `<br><span class="bb">${b.name}</span> ${b.desc}` : ''}`, a.boss ? 'intro boss' : 'intro', a.boss ? 2.6 : 1.8);
    if (run.tutorial && run.night === 1 && a.idx === 0) { this.tut = { step: 'tap', text: 'Tap a firework to light it!' }; }
    else if (this.tut && run.night === 1 && a.idx === 1) { this.tut.step = 'drag'; this.tut.text = 'Drag a firework into reach of the others — then light it'; this.tut.drag = this.suggestMove(); }
    Platform.gameplayStart(); this.saveRun();
  }
  bossName(id) { return { name: BOSS[id].name, desc: BOSS[id].desc }; }
  suggestMove() { // find an isolated shell and a spot that links it into the biggest cluster (tutorial)
    const sky = this.run.act.sky; let best = null;
    for (const s of sky.shells) { const n = sky.links(s, this.launcherWorld()).length; if (!best || n < best.n) best = { s, n }; }
    if (!best) return null; const s = best.s; const others = sky.shells.filter((o) => o !== s).sort((a, b) => sky.links(b).length - sky.links(a).length);
    for (const o of others.slice(0, 4)) for (let k = 0; k < 12; k++) { const ang = (k / 12) * Math.PI * 2; const x = o.x + Math.cos(ang) * 120, y = o.y + Math.sin(ang) * 120; if (sky.canPlace(x, y, s)) return { s, x, y }; }
    return null;
  }
  tutLock(kind, s) { const t = this.tut; if (!t) return false; if (t.step === 'drag' && kind === 'light' && t.drag && false) return true; return false; }
  // ------------------------------------------------------------------ losing, reviving, finishing
  lose() {
    const run = this.run, a = run.act; this.audio.ui('lose'); Platform.gameplayStop(); this.saveRun(); // a lost run can't be reloaded to retry the last launch
    const close = a.score >= a.target * 0.5; if (!run.revived && !run.daily && run.night >= 3 && close && this.adsOn()) { this.state = 'revive'; this.ui.revive(); return; }
    this.finish(false);
  }
  async revive() { const ok = await this.withAd(() => Platform.rewarded(() => this.audio.suspend())); if (ok && this.run.revive()) { this.ui.modal(''); this.state = 'act'; this.phase = 'idle'; this.ui.banner('SECOND WIND', 'One more launch!', 'finale', 1.5); this.audio.fanfare(1); Platform.gameplayStart(); this.saveRun(); } else { this.ui.toast('Ad not available right now', 'warn'); this.finish(false); } }
  finish(won) {
    const run = this.run; run.finished = true; const fin = Save.finishRun(run, { won: won || run.won, daily: run.daily }); fin.canDouble = this.adsOn(); this.lastFin = fin; this.state = 'over'; this.audio.setMood('title');
    this.ui.over(run, fin, false); for (const a of fin.ach) this.ui.achToast(a); if (this.tut) { this.tut = null; Save.p.tutorialDone = true; Save.save(); }
  }
  // ------------------------------------------------------------------ menus
  toTitle() { document.body.classList.remove('inshop'); this.state = 'title'; this.run = null; this.phase = 'idle'; this.ui.hud.innerHTML = ''; this.ui.modal(''); this.ui.title(); this.fitView(); this.audio.setMood('title'); Platform.gameplayStop(); this.tut = null; this.targeting = null; }
  newRun(o = {}) {
    const p = Save.p; const first = !p.tutorialDone && !o.daily; const seed = o.seed || (Math.random() * 2 ** 31) >>> 0;
    this.run = new Run({ seed, launcher: o.launcher || 'classic', stake: o.stake || 0, daily: !!o.daily, tutorial: first, unlocked: Save.unlockedSet() });
    p.lastLauncher = this.run.launcherId; p.lastStake = this.run.stake; this.ui.modal(''); this.ui.show(''); this.startAct();
  }
  continueRun() {
    try { this.run = new Run({ restore: Save.p.run }); } catch (e) { console.warn(e); Save.p.run = null; Save.save(); return this.toTitle(); }
    const run = this.run; this.ui.show(''); this.ui.modal('');
    if (run.phase === 'act' && run.act) { this.state = 'act'; this.phase = 'idle'; this.fitView(); this.shownScore = run.act.score; this.ui.disp.score = run.act.score; this.ui.buildHud(); run.act.sky.shells.forEach((s, i) => (s.bornT = this.scene.time + 0.3 + i * 0.04)); this.audio.setKey(run.night); this.audio.setMood(run.act.boss ? 'boss' : 'play'); Platform.gameplayStart(); }
    else if (run.phase === 'shop' || run.phase === 'pack') { this.ui.buildHud(); this.state = 'shop'; document.body.classList.add('inshop'); this.ui.shop(run); if (run.phase === 'pack') this.ui.pack(run); this.audio.setMood('shop'); }
    else if (run.phase === 'won') { this.ui.buildHud(); this.toShop(); }
    else if (run.phase === 'over') { this.ui.buildHud(); this.finish(false); }
    else { this.ui.buildHud(); this.startAct(); }
  }
  saveRun() { const r = this.run; if (!r || this.phase === 'chain' || this.phase === 'rocket' || this.phase === 'tally') return; if (r.phase === 'over' || this.state === 'over') { Save.p.run = null; Save.save(); return; } try { Save.p.run = r.serialize(); } catch (e) { console.warn('save failed', e); } Save.save(); }
  // ------------------------------------------------------------------ charms (rites)
  useCharm(i) {
    const run = this.run; const c = CHARM[run.charms[i].id]; if (!run.charmUsable(i)) { this.ui.toast(c.need > 0 || c.inAct ? 'Use this during an act' : 'No room for that', 'warn'); this.audio.ui('error'); return; }
    if (c.need > 0) { this.targeting = { i, sel: [] }; this.u.targets = []; this.ui.hideTip(true); this.ui.renderCharms(); return; }
    const out = run.useCharm(i); this.charmDone(c, out);
  }
  toggleTarget(s) { const t = this.targeting; const c = CHARM[this.run.charms[t.i].id]; const k = t.sel.indexOf(s); if (k >= 0) t.sel.splice(k, 1); else { if (t.sel.length >= c.need) t.sel.shift(); t.sel.push(s); } this.u.targets = t.sel; this.audio.ui('hover'); if (c.need === 1 && t.sel.length === 1) this.applyTarget(); }
  applyTarget() { const t = this.targeting; if (!t || !t.sel.length) return; const run = this.run; const c = CHARM[run.charms[t.i].id]; const out = run.useCharm(t.i, t.sel); this.targeting = null; this.u.targets = []; for (const s of t.sel) this.scene.P.emit({ life: [0.4, 0.5], size: [30, 140], c0: COLORS[s.color].rgb, a: 0.8, spr: 3 }, s.x, s.y, 0, 0); this.charmDone(c, out); }
  cancelTarget() { this.targeting = null; this.u.targets = []; this.ui.renderCharms(); }
  charmDone(c, out) { this.audio.ui('level'); this.ui.toast(`<b>${c.name}</b> used${out && out.v ? ` · +$${out.v}` : ''}${out && out.money ? ` · +$${out.money}` : ''}`, 'tip'); this.ui.renderCats(); if (this.state === 'shop') this.ui.shop(this.run); this.saveRun(); }
  // ------------------------------------------------------------------ UI actions
  act(name, d = {}, el) {
    const run = this.run; const p = Save.p;
    switch (name) {
      case 'play': if (p.run) return this.continueRun(); if (!p.tutorialDone) return this.newRun({}); this.setupSel = { launcher: p.lastLauncher || 'classic', stake: Math.min(p.lastStake || 0, Save.stakesAvailable()) }; return this.ui.setup(this.setupSel);
      case 'newrun': if (p.run) return this.ui.confirm('Abandon your saved show?', 'newrun-ok'); this.setupSel = { launcher: p.lastLauncher || 'classic', stake: 0 }; return this.ui.setup(this.setupSel);
      case 'newrun-ok': p.run = null; Save.save(); this.ui.title(); this.setupSel = { launcher: p.lastLauncher || 'classic', stake: 0 }; return this.ui.setup(this.setupSel);
      case 'pick-launcher': this.setupSel.launcher = d.id; return this.ui.setup(this.setupSel);
      case 'pick-stake': this.setupSel.stake = +d.i; return this.ui.setup(this.setupSel);
      case 'start': return this.newRun(this.setupSel);
      case 'daily': return this.ui.daily();
      case 'daily-start': if (p.run) return this.ui.confirm('Abandon your saved show to play the Daily?', 'daily-ok'); return this.newRun({ daily: true, seed: hashStr('fuseworks-daily-' + dayNumber()) });
      case 'daily-ok': p.run = null; Save.save(); return this.newRun({ daily: true, seed: hashStr('fuseworks-daily-' + dayNumber()) });
      case 'collection': return this.ui.collection('cats');
      case 'ctab': return this.ui.collection(d.t);
      case 'locker': return this.ui.locker('theme');
      case 'ltab': return this.ui.locker(d.t);
      case 'equip': if (Save.equip(d.id)) { this.applySettings(); this.layout(); this.audio.ui('buy'); } return this.ui.locker(this.cosmTab(d.id));
      case 'buy-cosm': if (Save.buyCosmetic(d.id)) { Save.equip(d.id); this.applySettings(); this.layout(); this.audio.ui('buy'); this.scene.celebrate(0.5); } else this.audio.ui('error'); return this.ui.locker(this.cosmTab(d.id));
      case 'dust-ad': return this.withAd(() => Platform.rewarded(() => this.audio.suspend())).then((ok) => { if (ok) { Save.grantAdDust(25); this.audio.ui('buy'); } this.ui.locker('theme'); if (this.state === 'title') this.ui.title(); });
      case 'settings': this.settingsFrom = this.ui.modalEl.querySelector('.pause') ? 'pause' : null; return this.ui.settings();
      case 'set': p.settings[d.k] = d.v; this.applySettings(); Save.save(); return;
      case 'toggle': p.settings[d.k] = !p.settings[d.k]; this.applySettings(); if (d.k === 'lowFx') this.layout(); Save.save(); return this.ui.settings();
      case 'reset': return this.ui.confirm('Erase all progress?', 'reset-ok');
      case 'reset-ok': Save.reset(); this.applySettings(); this.layout(); return this.toTitle();
      case 'close': if (this.settingsFrom === 'pause' && this.ui.modalEl.querySelector('.settings')) { this.settingsFrom = null; return this.ui.pause(); } if (this.helpFrom === 'pause' && this.ui.modalEl.querySelector('.help')) { this.helpFrom = null; return this.ui.pause(); } this.ui.modal(''); if (this.state === 'title') this.ui.title(); if (this.state === 'shop' && run) this.ui.shop(run); return;
      case 'pause': if (this.phase === 'chain' || this.phase === 'rocket' || this.phase === 'tally') return; this.paused = true; Platform.gameplayStop(); return this.ui.pause();
      case 'resume': this.paused = false; if (this.state === 'act') Platform.gameplayStart(); return this.ui.modal('');
      case 'abandon': return this.ui.confirm('Abandon this show? It counts as a loss.', 'abandon-ok');
      case 'abandon-ok': this.paused = false; this.ui.modal(''); if (run) { run.phase = 'over'; this.finish(false); } return;
      case 'menu': this.paused = false; if (this.state === 'over') { if (run && run.won && !run.finished) { run.finished = true; const fin = Save.finishRun(run, { won: true, daily: run.daily }); for (const a of fin.ach) this.ui.achToast(a); } p.run = null; Save.save(); } else this.saveRun(); return this.toTitle();
      case 'crate': if (run) this.ui.crate(run); return;
      case 'help': this.helpFrom = this.ui.modalEl.querySelector('.pause') ? 'pause' : null; return this.ui.help();
      case 'boss-info': return;
      // shop
      case 'buy': { const it = run.shop && run.shop.items[+d.i]; if (!it) return; if (!run.canBuy(it)) { this.audio.ui('error'); this.ui.toast(run.money < it.cost ? 'Not enough money' : 'No free slot — sell something first', 'warn'); return; } const out = run.buy(+d.i); this.audio.ui('buy'); if (out.level) { this.audio.ui('level'); this.ui.toast(`<b>${SHELLS[CHARM[it.id].type].name}</b> is now level ${out.level}!`, 'tip'); } if (out.inst) setTimeout(() => this.ui.catFx(out.inst.uid, 'NEW', 'k'), 30); this.ui.hideTip(true); this.ui.renderCats(); this.ui.shop(run); if (this.tut && this.tut.step === 'shop') this.tut.step = 'shopdone'; const ach = Save.bump(run); ach.forEach((a) => this.ui.achToast(a)); return this.saveRun(); }
      case 'buy-bp': { const b = run.buyBlueprint(); if (!b) { this.audio.ui('error'); return; } this.audio.ui('buy'); this.ui.toast(`<b>${b.name}</b> installed`, 'tip'); this.ui.hideTip(true); this.ui.renderCats(); this.ui.shop(run); return this.saveRun(); }
      case 'buy-pack': { const pk = run.buyPack(+d.i); if (!pk) { this.audio.ui('error'); return; } this.audio.ui('pack'); this.ui.hideTip(true); this.ui.shop(run); this.ui.pack(run); return; }
      case 'pick': { const o = run.pack && run.pack.opts[+d.j]; if (!o) return; if (!run.canPick(o)) { this.audio.ui('error'); this.ui.toast('No free slot — sell something first', 'warn'); return; } const out = run.pickPack(+d.j); this.audio.ui(out && out.level ? 'level' : 'buy'); if (out && out.level) this.ui.toast(`<b>${SHELLS[CHARM[o.id].type].name}</b> is now level ${out.level}!`, 'tip'); this.ui.renderCats(); if (run.pack) this.ui.pack(run); else { this.ui.modal(''); this.ui.shop(run); } return this.saveRun(); }
      case 'skip-pack': run.closePack(); this.ui.modal(''); this.ui.shop(run); return this.saveRun();
      case 'reroll': if (run.reroll()) { this.audio.ui('flip'); this.ui.shop(run); this.saveRun(); } else this.audio.ui('error'); return;
      case 'sell': { const v = run.sell(+d.uid); if (v) { this.audio.ui('sell'); this.ui.toast(`Sold for <b>$${v}</b>`, 'tip'); } this.ui.hideTip(true); this.ui.renderCats(); if (this.state === 'shop') this.ui.shop(run); return this.saveRun(); }
      case 'sell-charm': run.sellCharm(+d.i); this.audio.ui('sell'); this.ui.hideTip(true); this.ui.renderCharms(); if (this.state === 'shop') this.ui.shop(run); return this.saveRun();
      case 'use-charm': this.ui.hideTip(true); return this.useCharm(+d.i);
      case 'apply-charm': return this.applyTarget();
      case 'cancel-charm': return this.cancelTarget();
      case 'reorder': if (run && !run.chainRunning) { run.moveCat(d.from, d.to); this.ui.renderCats(); this.audio.ui('flip'); this.saveRun(); } return;
      case 'next-act': return this.nextAct();
      case 'to-shop': return this.toShop();
      case 'revive': return this.revive();
      case 'no-revive': this.ui.modal(''); return this.finish(false);
      case 'retry': { const L = run ? run.launcherId : 'classic', S = run ? run.stake : 0; const daily = run && run.daily; this.ui.modal(''); return daily ? this.newRun({ daily: true, seed: hashStr('fuseworks-daily-' + dayNumber()) }) : this.newRun({ launcher: L, stake: S }); }
      case 'endless': run.goEndless(); this.ui.modal(''); this.state = 'shop'; document.body.classList.add('inshop'); this.ui.shop(run); this.audio.setMood('shop'); return this.saveRun();
      case 'dust-x2': return this.withAd(() => Platform.rewarded(() => this.audio.suspend())).then((ok) => { if (ok && this.lastFin && !this.lastFin.doubled) { this.lastFin.doubled = true; p.dust += this.lastFin.dust; Save.save(); const n = document.getElementById('dustN'); if (n) n.textContent = String(this.lastFin.dust * 2); if (el) el.remove(); this.audio.ui('buy'); } });
      case 'share': { const r = run; const txt = `FUSEWORKS Daily #${dayNumber() % 10000} 🎆\nReached Night ${r.night} · ${ACT_NAMES[r.actIdx]}\nBest launch ${fmt(r.stats.bestLaunch)} · Longest chain ${r.stats.longest}\n${'🎇'.repeat(Math.min(8, r.night))}`; try { navigator.clipboard.writeText(txt); this.ui.toast('Copied! Share it with friends', 'tip'); } catch (e) { this.ui.toast('Could not copy', 'warn'); } return; }
    }
  }
  cosmTab(id) { return id.startsWith('theme') ? 'theme' : id.startsWith('trail') ? 'trail' : 'burst'; }
  // ------------------------------------------------------------------ frame
  frame(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t;
    if (!this.paused) { this.acc += dt; let n = 0; while (this.acc >= STEP && n++ < 4) { this.step(STEP); this.acc -= STEP; } if (this.acc > STEP) this.acc = 0; }
    this.render(dt);
    requestAnimationFrame((tt) => this.frame(tt));
  }
  step(h) {
    this.slow = Math.max(0, this.slow - h); const ts = this.slow > 0 ? 0.35 : 1; const sd = h * ts;
    if (this.state === 'act' && this.phase === 'chain' && this.run && this.run.act && this.run.act.current) this.stepChain(sd);
    if (this.state === 'title' || this.state === 'over' || (this.state === 'shop' && Math.random() < 0.3)) this.scene.ambient(h, this.state === 'title' ? 1 : 0.35);
    this.scene.P.wind = this.run && this.run.act && this.run.act.boss === 'gale' ? 70 : 6;
    this.scene.update(sd);
    for (const s of this.seq) s.at -= h; const due = this.seq.filter((s) => s.at <= 0); this.seq = this.seq.filter((s) => s.at > 0); for (const s of due) s.fn();
  }
  render(dt) {
    const R = this.R, sc = this.scene, uv = this.atlas.uv; const v = this.view; const W = this.W, H = this.H;
    const z = sc.zoom; const cx = this.F.x + this.F.w / 2, cy = this.F.y + this.F.h / 2;
    const ox = cx + (v.ox - cx) * z + sc.shakeX, oy = cy + (v.oy - cy) * z + sc.shakeY, s = v.s * z;
    R.begin(); R.group(xfFor(0, 0, 1, W, H)); sc.drawTwinkles(R, uv, W, this.waterY * 0.8);
    R.group(xfFor(ox, oy, s, W, H));
    const run = this.run; const sky = run && run.act && run.act.sky;
    // preview: hovered/selected shell → reach + links
    let reaches = [], links = null, bad = null; this.u.preview = null;
    if (sky && this.state === 'act') {
      const from = this.launcherWorld(); const hide = sky.ctx.boss === 'fog' || sky.ctx.boss === 'eclipse'; const st = Save.p.settings.reaches && !hide;
      const focus = this.u.drag ? null : this.canInteract() && !this.targeting ? this.u.selected || this.u.hover : null;
      if (focus) this.label = this.shellLabel(focus, sky); else this.label = null;
      if (focus) { focus.starter = true; const tg = sky.links(focus, from); if (st || (this.u.selected && !hide)) reaches.push({ s: focus, x: focus.x, y: focus.y, from, strength: 1 }); if (!hide) { links = { s: focus, x: focus.x, y: focus.y, targets: tg }; this.u.preview = tg; } focus.starter = false; }
      if (this.u.drag) { const d = this.u.drag, s0 = d.s; const ox0 = s0.x, oy0 = s0.y; s0.x = d.x; s0.y = d.y; const tg = sky.links(s0, from).filter((o) => o !== s0); if (!hide) { reaches.push({ s: s0, x: d.x, y: d.y, from, strength: d.ok ? 1 : 0.4 }); links = { s: s0, x: d.x, y: d.y, targets: tg }; this.u.preview = tg.concat(sky.shells.filter((o) => o !== s0 && o.state === IDLE && sky.reach(o, s0) >= 0)); } s0.x = ox0; s0.y = oy0; if (!d.ok) bad = { x: d.x, y: d.y }; }
      if (this.tut && this.tut.step === 'drag' && this.tut.drag && !this.u.drag) { const m = this.tut.drag; if (m.s.state === IDLE) this.tutHand = { x: this.X(m.s.x), y: this.Y(m.s.y), x2: this.X(m.x), y2: this.Y(m.y), mode: 'drag' }; }
      else if (this.tut && this.tut.step === 'tap' && this.phase === 'idle') { const s0 = sky.shells.find((q) => q.state === IDLE); if (s0) this.tutHand = { x: this.X(s0.x), y: this.Y(s0.y), mode: 'tap' }; }
      else this.tutHand = null;
      sc.drawShells(R, uv, sky, this.u);
      const lw = this.launcherWorld(); sc.drawLauncher(R, uv, lw.x, lw.y + 10, 1 / Math.max(0.5, v.s) * 0.6, this.phase === 'rocket' ? 1 : 0);
    } else this.tutHand = null;
    sc.drawParticles(R, uv);
    R.group(xfFor(0, 0, 1, W, H)); sc.drawCrowd(R, uv, W, this.waterY, Math.max(9, Math.min(W, H) / 70));
    const f = sc.flash;
    R.render({ flash: [f[0], f[1], f[2], f[3]], flashPos: sc.flashPos, time: sc.time, bloom: 1.0, threshold: 0.72, waterY: 1 - this.waterY / H, aberration: sc.ab, exposure: 1.06, waterTint: this.theme ? this.theme.tint : [0.8, 0.85, 1], globalFlash: sc.gflash, ambient: this.theme ? this.theme.amb : [0, 0, 0] });
    this.overlay.view(ox, oy, s);
    this.overlay.draw(dt, { sky: this.state === 'act' ? sky : null, reaches, links, bad, hand: this.tutHand, label: this.state === 'act' && !this.u.drag && this.phase === 'idle' ? this.label : null });
    if (run && (this.state === 'act' || this.state === 'shop')) { const hs = this.hudState(); if (hs) this.ui.updateHud(dt, hs); }
  }
  shellLabel(s, sky) {
    const C = COLORS[s.color]; if (sky.ctx.boss === 'fog') return { x: s.x, y: s.y, title: 'Hidden firework', parts: [['The Fog hides it', '#b4a8d6']], color: C.hex };
    const d = SHELLS[s.type]; const lv = this.run.formulas[s.type] || 1; const pur = sky.ctx.boss === 'purist' && this.run.act && this.run.act.purist === s.color; const sp = pur ? 0 : d.sparks + (lv - 1) * d.lv[0];
    const heat = d.xheat ? [`×${(this.run.mods.crown >= 2 ? 2 : d.xheat + (lv - 1) * d.lv[1]).toFixed(1)}`, '#ff5a8a'] : [`+${d.heat + (lv - 1) * d.lv[1]}`, '#ffa63d'];
    const parts = [[`+${sp}`, '#5fe1ff'], [' Sparks  ', '#d8cdf5'], heat, [' Heat', '#d8cdf5']]; if (d.money) parts.push(['  +$1', '#ffd23f']);
    const extra = [s.enh ? { gilded: 'Gilded: +$1', titan: 'Titan: +40% reach', twin: 'Twin: bursts twice', glass: 'Glass: ×2 Heat, may shatter', lucky: 'Lucky', prism: 'Prism: ×1.5 Heat' }[s.enh] : '', s.damp && !s.dry ? 'Damp: light it twice' : ''].filter(Boolean).join(' · ');
    return { x: s.x, y: s.y, title: `${C.name} ${d.name}${lv > 1 ? ` · Lv ${lv}` : ''}`, parts, extra, color: C.hex };
  }
  X(x) { return this.view.ox + x * this.view.s; } Y(y) { return this.view.oy + y * this.view.s; }
}
const app = new App(); app.boot();
document.addEventListener('pointerdown', (e) => { app.lastPointer = e.pointerType; }, true);
