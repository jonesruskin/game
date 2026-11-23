// GLINT: app orchestration: boot, layout, the loop, input, scenes (bench / shop), economy actions,
// offline progress, apprentices, expeditions, daily stone, ads and saving.
import { Renderer } from './gl.js';
import { paintBench, paintShop } from './paint.js';
import { Audio } from './audio.js';
import { Save } from './save.js';
import { Platform } from './platform.js';
import { Bench, roughFrost } from './bench.js';
import { Shop } from './shop.js';
import { UI } from './ui.js';
import { apprenticeCut } from './workshop.js';
import { rng, mMul, mRotX, mRotY, clamp } from './math.js';
import { buildPoly } from './poly.js';
import { SPECIES, SPECIES_IDS, variety, optics, RARITY, gemName } from './species.js';
import { TIERS, tierCuts, upVal, upNext, UPGRADES, rollRough, MYSTERY, REGIONS, EXPEDITIONS, expeditionCost, dealerStock, priceRough, repFor, meets, apprenticeCost, trainCost, apprenticeMax, apprenticeTime, APPRENTICE_NAMES, uid, roughEstimate } from './economy.js';
import { roughCarat, stonePlanes, toGemSpace } from './stone.js';
import { fmt$, dayNumber, $ } from './util.js';

const STEP = 1 / 60;
class App {
  constructor() {
    this.cv = $('#gl'); this.ov = $('#ov'); this.octx = this.ov.getContext('2d');
    this.audio = new Audio(); this.R = new Renderer(this.cv); this.bench = new Bench(this); this.shop = new Shop(this); this.ui = new UI(this);
    this.view = 'bench'; this.screen = null; this.t = 0; this.acc = 0; this.last = performance.now(); this.stoneCache = new Map(); this.frameMs = 16; this.perfT = 0; this.saveT = 0;
    window.__app = this;
  }
  get save() { return Save.p; }
  async boot() {
    Platform.loadingStart(); await Platform.init(); Save.load();
    if (!this.R.ok) { $('#boot').innerHTML = '<div class="nogl">Glint needs WebGL 2 to ray-trace its gems.<br>Please update your browser or enable hardware acceleration.</div>'; return; }
    try { await Promise.race([Promise.all([document.fonts.load("40px Limelight"), document.fonts.load("20px Marcellus"), document.fonts.load("500 16px Jost")]), new Promise((r) => setTimeout(r, 1500))]); } catch (e) {}
    const s = this.save; this.applySettings(); this.audio.setMuted(Platform.muteAudioSetting()); Platform.onMuteChange = (m) => this.audio.setMuted(m);
    // a stone left on the bench goes back into the vault
    if (s.bench) { if (!s.roughs.find((r) => r.id === s.bench.id)) s.roughs.push(s.bench); s.bench = null; }
    if (!s.dealer.stock.length || Date.now() > s.dealer.next) this.restockDealer();
    this.R.onRestore = () => this.layout();
    addEventListener('resize', () => this.layout()); this.layout(); this.bindInput();
    document.addEventListener('visibilitychange', () => { if (document.hidden) { Save.save(); this.audio.suspend(); } else if (!Platform.adPlaying) { this.audio.resume(); this.catchUp(); } });
    addEventListener('pagehide', () => Save.save());
    this.ui.init();
    const away = (Date.now() - (s.lastSeen || Date.now())) / 1000;
    $('#boot').classList.add('gone'); setTimeout(() => $('#boot') && $('#boot').remove(), 700);
    Platform.loadingStop();
    if (!s.tut) this.ui.title(true); else { this.ui.title(false); if (away > 120) this.offlineReport(away); }
    this.state = 'ready';
    if (s.tut) this.dailyGift();
    requestAnimationFrame((t) => this.frame(t));
  }
  applySettings() { const st = this.save.settings; this.audio.setVolumes(st.sfx, st.music); const q = st.quality; const touch = matchMedia('(pointer: coarse)').matches; this.R.bounces = q === 'low' ? 5 : touch && q === 'auto' ? 7 : 8; this.R.streaks = q !== 'low'; if (q === 'low') this.R.setScale(0.6); else if (q === 'high') this.R.setScale(1); else if (touch && !this.scaled) { this.scaled = true; this.R.setScale(0.72); } }
  start() { // first interaction: audio unlock + gameplay start
    this.audio.unlock(); if (!this.screen) Platform.gameplayStart(); this.started = true;
  }
  // ---------------- layout ----------------
  layout() {
    const W = innerWidth, H = innerHeight; const dpr = Math.min(devicePixelRatio || 1, 2); const port = H > W * 1.05; this.port = port; document.body.classList.toggle('port', port); document.body.classList.toggle('land', !port);
    this.R.resize(W, H, Math.min(dpr, this.save.settings.quality === 'high' ? 2 : 1.5));
    this.ov.width = Math.round(W * dpr); this.ov.height = Math.round(H * dpr); this.ov.style.width = W + 'px'; this.ov.style.height = H + 'px'; this.octx.setTransform(dpr, 0, 0, dpr, 0, 0); this.dpr = dpr;
    const top = port ? 58 : 64, nav = port ? 68 : 0, side = port ? 0 : 76; this.topH = top;
    // bench
    let L; if (port) { const ph = Math.round(H * 0.42); const avail = H - top - ph - nav; L = { W, H, port, gx: W / 2, gy: top + avail * 0.52, gr: Math.min(W * 0.34, avail * 0.4), panel: ph, nav }; }
    else { const pw = clamp(W * 0.3, 320, 400); const aw = W - pw - side; L = { W, H, port, gx: side + aw / 2, gy: top + (H - top) * 0.47, gr: Math.min(aw * 0.28, (H - top) * 0.3), panel: pw, side }; }
    L.top = top; this.benchL = L; this.bench.L = L;
    // shop
    this.shopL = { W, H, port, top, side, panelW: port ? 0 : 300, bot: port ? nav + Math.round(H * 0.2) : 0, cases: TIERS[this.save.tier].cases };
    this.paintScene();
    this.ui.layout();
  }
  paintScene() {
    const k = Math.min(1.5, this.dpr || 1);
    if (this.view === 'bench') this.bgCanvas = paintBench(this.benchL, k); else this.bgCanvas = paintShop(this.shopL, this.save.tier, k);
    this.R.setBackground(this.bgCanvas);
  }
  setView(v) { this.bench.grindStop(); this.bench.up(); if (this.view === v && !this.screen) return; this.closeScreen(); if (this.view !== v) { this.view = v; this.paintScene(); this.audio.play('whoosh'); this.audio.setRain(v === 'bench'); } this.ui.nav(); this.ui.panel(); }
  openScreen(id, arg) { this.bench.grindStop(); this.screen = id; this.ui.screen(id, arg); this.ui.nav(); Platform.gameplayStop(); }
  closeScreen() { if (!this.screen) return; this.screen = null; this.ui.screen(null); this.ui.nav(); if (this.started) Platform.gameplayStart(); }
  // ---------------- input ----------------
  bindInput() {
    const el = this.ov; const pos = (e) => [e.clientX, e.clientY]; let id = null;
    el.addEventListener('pointerdown', (e) => { this.start(); if (id !== null) return; id = e.pointerId; try { el.setPointerCapture(id); } catch (er) {} const [x, y] = pos(e);
      if (this.view === 'bench') this.bench.down(x, y, e); else this.shopTap(x, y); });
    el.addEventListener('pointermove', (e) => { if (e.pointerId !== id) return; const [x, y] = pos(e); if (this.view === 'bench') this.bench.move(x, y); });
    const up = (e) => { if (e.pointerId !== id) return; id = null; if (this.view === 'bench') this.bench.up(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('keydown', (e) => { if (e.repeat) return; if (e.code === 'Space' && this.view === 'bench' && !this.screen) { e.preventDefault(); this.start(); this.bench.grindStart(); } if (e.code === 'Escape') { if (this.ui.modalOpen()) this.ui.closeModal(); else this.closeScreen(); } });
    addEventListener('keyup', (e) => { if (e.code === 'Space' && this.view === 'bench') this.bench.grindStop(); });
    addEventListener('pointerdown', () => this.start(), { capture: true, once: false });
  }
  shopTap(x, y) { const L = this.shopL; if (!L.caseRects) return; L.caseRects.forEach((r, i) => { if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) { this.audio.play('tap'); this.ui.caseMenu(i); } }); }
  // ---------------- loop ----------------
  frame(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; this.t += dt;
    this.frameMs = this.frameMs * 0.92 + dt * 1000 * 0.08;
    if (!Platform.adPlaying) { this.acc += dt; let n = 0; while (this.acc >= STEP && n < 6) { this.step(STEP); this.acc -= STEP; n++; } if (n >= 6) this.acc = 0; }
    const skip = this.screen && (Math.floor(this.t * 60) % 4 !== 0);
    if (!skip && this.R.ok) this.render(dt);
    this.adaptQuality(dt);
    requestAnimationFrame((t) => this.frame(t));
  }
  step(dt) {
    const s = this.save; s.stats.playS += dt;
    this.bench.update(dt); this.shop.update(dt); this.tickStaff(dt); this.tickWorld(dt);
    this.saveT += dt; if (this.saveT > 8) { this.saveT = 0; this.persist(); }
  }
  render(dt) {
    const R = this.R; R.begin(this.screen ? 0.55 : 1);
    if (this.view === 'bench') { const g = this.bench.gemDraw(); if (g) R.gem(g); }
    else for (const g of this.shop.gems()) R.gem(g);
    R.end({ time: this.t, bloom: 0.6, streak: this.view === 'bench' ? 0.55 : 0.45, threshold: 1.5, vignette: 0.35 });
    const c = this.octx; c.clearRect(0, 0, innerWidth, innerHeight);
    this.drawRain(c);
    if (this.view === 'bench') this.bench.drawOverlay(c); else this.shop.draw(c);
    this.ui.frame(dt);
  }
  drawRain(c) {
    const L = this.view === 'bench' ? this.benchL : this.shopL; const w = L.window; if (!w) return; c.save(); c.beginPath(); c.rect(w.x, w.y, w.w, w.h); c.clip(); c.strokeStyle = 'rgba(180,200,255,0.25)'; c.lineWidth = 1;
    const n = 40; for (let i = 0; i < n; i++) { const x = w.x + ((i * 97.3 + this.t * 20) % w.w); const y = w.y + ((i * 53.1 + this.t * (300 + (i % 5) * 60)) % (w.h + 40)) - 20; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y + 12); c.stroke(); } c.restore();
  }
  adaptQuality(dt) {
    if (this.save.settings.quality !== 'auto') return; this.perfT += dt; if (this.perfT < 2) return; this.perfT = 0;
    if (this.frameMs > 24 && this.R.scale > 0.5) this.R.setScale(this.R.scale - 0.1); else if (this.frameMs < 15 && this.R.scale < 1) this.R.setScale(this.R.scale + 0.05);
    if (this.frameMs > 30 && this.R.bounces > 5) this.R.bounces = 6;
  }
  persist() { const s = this.save; s.bench = this.bench.r && this.bench.stage !== 'appraise' && this.bench.stage !== 'empty' ? this.bench.r : null; Save.save(); }
  catchUp() { const away = (Date.now() - this.save.lastSeen) / 1000; if (away > 120) this.offlineReport(away); }
  vibrate(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
  platformHappy() { Platform.happytime(); }
  // ---------------- helpers ----------------
  cutsAvailable() { return tierCuts(this.save.tier); }
  gemById(id) { return this.save.gems.find((g) => g.id === id) || null; }
  spinRot(a, tilt) { return mMul(mRotX(tilt), mRotY(a)); }
  gemStone(g) {
    if (this.stoneCache.has(g.id)) return this.stoneCache.get(g.id);
    const r = { ...g.rough, id: 'x' }; const st = stonePlanes(r, g.place, g.cut, { ...g.P, uG: 1, uP: g.P.uP ?? 1, uC: g.P.uC ?? 1, uT: g.P.uT ?? 1 });
    const poly = buildPoly(st.planes, 8); const used = new Set(poly.faces.map((f) => f.pi)); const planes = st.planes.filter((_, i) => used.has(i));
    let m = 0; for (const v of poly.verts) m = Math.max(m, Math.hypot(v[0], v[1], v[2]));
    const stone = { planes, frost: planes.map((p) => (p.stage === 9 ? 0.34 : 0)), inc: st.inc, ver: 1, rb: m * 1.08, bound: m * 1.02 };
    this.stoneCache.set(g.id, stone); if (this.stoneCache.size > 60) this.stoneCache.delete(this.stoneCache.keys().next().value); return stone;
  }
  thumb(g, size = 112) { if (g._thumb && g._thumbS === size) return g._thumb; const st = this.gemStone(g); const o = optics(g.sp, g.vid, g.tone, 0); const cv = this.R.thumbnail({ stone: st, glow: o.glow, rot: this.spinRot(0.5, 1.0), ri: o.ri, disp: o.disp, sig: o.sig, tint: o.tint, rb: st.rb, bounces: 7 }, size); const url = cv ? cv.toDataURL() : ''; Object.defineProperty(g, '_thumb', { value: url, writable: true, enumerable: false, configurable: true }); Object.defineProperty(g, '_thumbS', { value: size, writable: true, enumerable: false, configurable: true }); return url; }
  roughThumb(r, size = 96) {
    if (r._thumb) return r._thumb; const known = r.known; if (!known) return '';
    const G = toGemSpace(r, { m: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0], s: 1 }); const o = optics(r.sp, r.vid, r.tone, 0);
    let m = 0; const P = buildPoly(G.planes, 50); for (const v of P.verts) m = Math.max(m, Math.hypot(...v));
    const cv = this.R.thumbnail({ stone: { planes: G.planes, frost: roughFrost({ planes: G.planes }, SPECIES[r.sp]), inc: G.inc, ver: 1 }, rot: this.spinRot(0.7, 0.4), ri: o.ri, disp: o.disp, sig: o.sig.map((x) => x / Math.max(1, m * 0.35)), tint: o.tint, rb: m * 1.15, grain: 7 / Math.max(1, m * 0.3), bounces: 6 }, size);
    const url = cv ? cv.toDataURL() : ''; Object.defineProperty(r, '_thumb', { value: url, writable: true, enumerable: false, configurable: true }); return url;
  }
  vaultCap() { return upVal(this.save, 'vault'); }
  vaultUsed() { const s = this.save; return s.gems.length + s.roughs.length; }
  // ---------------- economy actions ----------------
  canAfford(n) { return this.save.money >= n; }
  spend(n) { if (this.save.money < n) { this.ui.toast('Not enough money', 'bad'); this.audio.play('deny'); return false; } this.save.money -= n; this.ui.money(); return true; }
  earn(n) { this.save.money += n; this.save.stats.earned += n; this.ui.money(true); }
  addRough(r) { if (this.vaultUsed() >= this.vaultCap()) { this.ui.toast('Your vault is full: sell or cut something first', 'bad'); return false; } this.save.roughs.push(r); this.ui.badges(); return true; }
  restockDealer() { const s = this.save; s.dealer.stock = dealerStock(rng((Date.now() / 1000) | 0), s.tier, 6).map((r) => { r.price = priceRough(r, roughCarat(r)); return r; }); s.dealer.next = Date.now() + 4 * 60 * 1000; }
  buyDealer(i) { const s = this.save; const r = s.dealer.stock[i]; if (!r || r.sold) return; if (this.vaultUsed() >= this.vaultCap()) { this.ui.toast('Vault full', 'bad'); return; } if (!this.spend(r.price)) return; r.sold = true; const c = { ...r }; delete c.price; delete c.sold; c.paid = r.price; this.addRough(c); this.audio.play('buy'); this.ui.toast(`Bought ${gemName(r.sp, r.vid)} rough`, 'good'); this.persist(); return c; }
  buyMystery(bin) { const s = this.save; if (this.vaultUsed() >= this.vaultCap()) { this.ui.toast('Vault full', 'bad'); return null; }
    const broke = bin.id === 'gravel' && s.money < bin.price && !s.roughs.length && !s.gems.length && (this.bench.stage === 'empty' || this.bench.stage === 'appraise');
    if (broke) this.ui.toast('The quarry foreman lets you have this one on credit', 'good'); else if (!this.spend(bin.price)) return null; const R = rng((Math.random() * 1e9) | 0); const r = rollRough(R, { tier: bin.tier, luck: bin.luck, richer: bin.richer, sp: bin.sp, src: 'mystery', known: false }); r.paid = bin.price; this.addRough(r); this.audio.play('buy'); this.persist(); return r; }
  loadRough(id) { const s = this.save; const i = s.roughs.findIndex((r) => r.id === id); if (i < 0) return; if (this.bench.r && this.bench.stage !== 'appraise' && this.bench.stage !== 'empty') { s.roughs.push(this.bench.r); } const r = s.roughs.splice(i, 1)[0]; this.bench.load(r); this.setView('bench'); this.persist(); }
  discover(r) { const s = this.save; const k = r.sp + ':' + r.vid; const isNew = !s.codex[k]; if (isNew) s.codex[k] = { n: 0, best: 0, ct: 0 }; s.stats.maxRare = Math.max(s.stats.maxRare, (variety(r.sp, r.vid).rare || 0) + 1); if (isNew) this.ui.toast(`New in your Codex: ${gemName(r.sp, r.vid)}`, 'codex'); this.checkAch(); }
  gemFinished(g, r) {
    const s = this.save; s.stats.cut++; if (g.cutG === 'Ideal') s.stats.ideal++; if (g.clarity === 'FL') s.stats.fl++; if (g.perfectMeets >= 3) s.stats.perfect3++;
    s.stats.best = Math.max(s.stats.best, g.value); s.stats.maxCt = Math.max(s.stats.maxCt, g.ct);
    this.discover(r); const k = g.sp + ':' + g.vid; const cx = s.codex[k]; cx.n++; const rec = g.value > cx.best; cx.best = Math.max(cx.best, g.value); cx.ct = Math.max(cx.ct, g.ct); g.record = rec && cx.n > 1;
    if (r.src === 'daily') { s.stats.dailies++; s.daily.done = true; s.daily.best = Math.max(s.daily.best, g.value); g.daily = dayNumber(); }
    s.gems.push(g); s.hall.push({ ...g }); s.hall.sort((a, b) => b.value - a.value); s.hall = s.hall.slice(0, 10);
    if (g.cutG === 'Ideal' || g.record || (variety(g.sp, g.vid).rare || 0) >= 3) Platform.happytime();
    this.checkAch(); this.persist(); this.ui.certificate(g, true);
  }
  sellGem(g, price, how, caseIdx, silent) {
    const s = this.save; const i = s.gems.findIndex((x) => x.id === g.id); if (i < 0) return; s.gems.splice(i, 1); if (caseIdx !== undefined && caseIdx >= 0) s.cases[caseIdx] = null; else { const ci = s.cases.indexOf(g.id); if (ci >= 0) s.cases[ci] = null; }
    this.earn(price); const rep = repFor(g) * (how === 'dealer' ? 0.4 : 1); s.rep += rep; if (how !== 'dealer') s.stats.sold++;
    s.sales.unshift({ n: gemName(g.sp, g.vid), p: price, t: Date.now() }); s.sales = s.sales.slice(0, 20);
    if (!silent) { this.audio.play('cash'); this.ui.toast(`${how === 'dealer' ? 'Sold to the dealer' : 'Sold'}: ${gemName(g.sp, g.vid)} +${fmt$(price)}`, 'money'); }
    this.stoneCache.delete(g.id); this.checkAch(); this.ui.rep(); this.ui.badges(); this.persist(); this.ui.refreshScreen();
    if (how === 'case') this.autoStock();
  }
  dealerPrice(g) { return Math.max(1, Math.round(g.value * 0.62)); }
  sellAllUnlisted() { const s = this.save; const list = s.gems.filter((g) => !s.cases.includes(g.id) && !(this.bench.result && this.bench.result.id === g.id)); if (!list.length) return; let tot = 0; for (const g of list) { const p = this.dealerPrice(g); tot += p; this.sellGem(g, p, 'dealer', undefined, true); } this.audio.play('cash'); this.ui.toast(`Sold ${list.length} gem${list.length > 1 ? 's' : ''} to the dealer for ${fmt$(tot)}`, 'money'); }
  sellToDealer(g) { this.sellGem(g, this.dealerPrice(g), 'dealer'); }
  toCase(g, i) { const s = this.save; if (s.tut === 1 && s.stats.cut <= 1) this.bench.after(0.4, () => { this.setView('shop'); this.ui.tutor('shop'); }); if (i === undefined) i = s.cases.indexOf(null); if (i < 0) { this.ui.toast('All cases are full', 'bad'); return false; } const old = s.cases.indexOf(g.id); if (old >= 0) s.cases[old] = null; s.cases[i] = g.id; this.audio.play('soft'); this.persist(); this.ui.refreshScreen(); return true; }
  fromCase(i) { this.save.cases[i] = null; this.persist(); this.ui.refreshScreen(); }
  autoStock() { const s = this.save; if (!s.settings.autoStock) return; for (let i = 0; i < s.cases.length; i++) if (!s.cases[i]) { const g = s.gems.filter((x) => !s.cases.includes(x.id)).sort((a, b) => b.value - a.value)[0]; if (g) s.cases[i] = g.id; } }
  fulfil(o, g) { const s = this.save; const i = s.gems.findIndex((x) => x.id === g.id); if (i < 0 || !meets(o, g)) return; s.gems.splice(i, 1); const ci = s.cases.indexOf(g.id); if (ci >= 0) s.cases[ci] = null; s.orders = s.orders.filter((x) => x.id !== o.id);
    this.earn(o.reward); s.rep += o.rep; s.stats.orders++; this.audio.play('fanfare'); this.ui.toast(`${o.who} is delighted! +${fmt$(o.reward)} · +${o.rep}★`, 'money'); this.stoneCache.delete(g.id); this.checkAch(); this.ui.rep(); this.ui.badges(); this.persist(); this.ui.refreshScreen(); Platform.happytime(); }
  matchingOrder(g) { return this.save.orders.find((o) => meets(o, g)) || null; }
  buyUpgrade(id) { const s = this.save; const n = upNext(s, id); if (!n) return; if (!this.spend(n.cost)) return; s.up[id] = (s.up[id] || 0) + 1; this.audio.play('fanfare'); this.ui.toast(`${UPGRADES[id].name}: ${n.label}`, 'good'); if (id === 'lights' || id === 'decor') { if (this.view === 'shop') this.paintScene(); } this.applySettings(); this.checkAch(); this.persist(); this.ui.refreshScreen(); }
  canTierUp() { const s = this.save; const n = TIERS[s.tier + 1]; return n && s.rep >= n.rep; }
  tierUp() { const s = this.save; const n = TIERS[s.tier + 1]; if (!n || s.rep < n.rep) return; if (!this.spend(n.cost)) return; s.tier++; Platform.happytime(); while (s.cases.length < n.cases) s.cases.push(null); this.shopL.cases = n.cases; this.restockDealer(); this.layout(); this.audio.play('fanfare'); this.ui.tierUp(s.tier); this.checkAch(); this.persist(); this.ui.refreshScreen(); }
  // apprentices
  hire() { const s = this.save; if (s.staff.length >= apprenticeMax(s.tier)) return; const cost = apprenticeCost(s.staff.length); if (!this.spend(cost)) return; s.staff.push({ id: uid(), name: APPRENTICE_NAMES[s.staff.length % APPRENTICE_NAMES.length], skill: 1, job: null, t: 0, made: 0, auto: true }); this.audio.play('fanfare'); this.checkAch(); this.persist(); this.ui.refreshScreen(); }
  train(a) { const c = trainCost(a.skill); if (a.skill >= 10 || !this.spend(c)) return; a.skill++; this.audio.play('ting'); this.persist(); this.ui.refreshScreen(); }
  tickStaff(dt, offline) {
    const s = this.save; let made = 0;
    for (const a of s.staff) {
      if (!a.job) { if (!a.auto) continue; const pool = s.roughs.filter((r) => !r.mine); if (!pool.length) continue; pool.sort((x, y) => (x.paid || 0) - (y.paid || 0)); const r = pool[0]; s.roughs.splice(s.roughs.indexOf(r), 1); a.job = r; a.t = 0; }
      a.t += dt; if (a.t >= apprenticeTime(a.skill)) { const r = a.job; r.known = true; const g = apprenticeCut(s, r, a.skill); a.job = null; a.t = 0; a.made++; s.gems.push(g); const k = g.sp + ':' + g.vid; if (!s.codex[k]) s.codex[k] = { n: 0, best: 0, ct: 0 }; s.codex[k].n++; s.codex[k].best = Math.max(s.codex[k].best, g.value); made++; s.stats.maxRare = Math.max(s.stats.maxRare, (variety(g.sp, g.vid).rare || 0) + 1);
        if (!offline) { this.ui.toast(`${a.name} finished a ${gemName(g.sp, g.vid)} (${g.cutG}, ${fmt$(g.value)})`, 'info'); this.autoStock(); this.ui.badges(); this.ui.refreshScreen(); } }
    }
    return made;
  }
  tickWorld(dt) {
    const s = this.save; const now = Date.now();
    if (now > s.dealer.next) { this.restockDealer(); if (this.screen === 'market') this.ui.refreshScreen(); }
    if (s.exped && now >= s.exped.end && !s.exped.done) { s.exped.done = true; this.ui.toast('Your expedition is back! Collect the haul in the Market.', 'good'); this.audio.play('fanfare'); this.ui.badges(); }
    if (s.auction && s.auction.live) this.ui.auctionTick && this.ui.auctionTick(dt);
    const d = dayNumber(); if (s.daily.day !== d) { s.daily = { day: d, done: false, best: 0 }; }
  }
  // auction house: one big lot every few minutes, bid against rival dealers
  auctionLot() {
    const s = this.save; if (s.tier < 2) return null;
    if (!s.auction || !s.auction.lot || Date.now() > s.auction.next) { const R = rng((Date.now() / 60000) | 0); const pool = SPECIES_IDS.filter((x) => SPECIES[x].tier >= s.tier && SPECIES[x].tier <= s.tier + 2); const r = rollRough(R, { tier: Math.min(4, s.tier + 1), species: pool, luck: 2.6, big: true, clean: R.chance(0.5), src: 'auction' }); const est = roughEstimate(r, roughCarat(r)); s.auction = { lot: r, est: Math.round(est), next: Date.now() + 7 * 60000, done: false }; }
    return s.auction;
  }
  startExpedition(region, e) { const s = this.save; if (s.exped) return; const cost = expeditionCost(s.tier, e); if (!this.spend(cost)) return; s.exped = { region: region.id, n: e.n, start: Date.now(), end: Date.now() + e.min * 60000, done: false }; this.audio.play('whoosh'); this.persist(); this.ui.refreshScreen(); }
  collectExpedition() { const s = this.save; const x = s.exped; if (!x || Date.now() < x.end) return; const reg = REGIONS.find((r) => r.id === x.region); const R = rng(x.start & 0x7fffffff); let got = 0;
    for (let i = 0; i < x.n; i++) { if (this.vaultUsed() >= this.vaultCap()) break; const r = rollRough(R, { tier: s.tier, species: reg.species.filter((sp) => SPECIES[sp].tier <= s.tier + 2), luck: 1.4, src: 'expedition', known: false }); r.paid = Math.round(expeditionCost(s.tier, EXPEDITIONS.find((e) => e.n === x.n) || EXPEDITIONS[0]) / x.n); s.roughs.push(r); got++; }
    s.exped = null; this.audio.play('cash'); this.ui.toast(`Expedition haul: ${got} rough stones added to your vault`, 'good'); this.persist(); this.ui.badges(); this.ui.refreshScreen(); }
  // daily stone: identical for everyone today
  dailyRough() { const d = dayNumber(); const R = rng(d * 7919 + 13); const tier = Math.min(4, 1 + (d % 4)); const r = rollRough(R, { tier, luck: 2, src: 'daily', known: false }); r.id = 'daily' + d; r.size = +(r.size * 1.15).toFixed(2); return r; }
  playDaily() { const s = this.save; if (s.daily.done) return; const r = this.dailyRough(); this.bench.load(r); this.setView('bench'); }
  // achievements → toast + money
  checkAch() { const got = Save.checkAch(); for (const a of got) { this.ui.toast(`Achievement: ${a.name} (+${fmt$(a.reward)})`, 'ach'); this.audio.play('fanfare'); this.ui.money(true); } }
  // offline progress: clerk sales, apprentices, expedition
  offlineReport(sec) {
    const s = this.save; const cap = Math.min(sec, 8 * 3600); const before = s.money;
    const sales = this.shop.offline(cap); let made = 0; if (s.staff.length) { const steps = Math.min(400, Math.floor(cap / 30)); for (let i = 0; i < steps; i++) made += this.tickStaff(cap / steps, true); }
    if (s.dealer.next < Date.now()) this.restockDealer();
    const earned = s.money - before; s.lastSeen = Date.now(); this.persist();
    if (earned > 0 || made > 0 || (s.exped && Date.now() >= s.exped.end)) this.ui.offline({ sec, earned, sold: sales.sold.length, made, exped: s.exped && Date.now() >= s.exped.end });
  }
  // first session: a guaranteed beautiful amethyst inside a river rock, straight onto the bench
  tutorialStart() {
    const s = this.save; s.tut = 1; const r = { id: uid(), sp: 'quartz', vid: 'amethyst', seed: 424242, size: 9.5, clarity: 0.12, tone: 1.02, rare: 0, src: 'mystery', known: false, paid: 0 };
    const r2 = { id: uid(), sp: 'garnet', vid: 'rhodolite', seed: 77177, size: 5.2, clarity: 0.2, tone: 1.0, rare: 0, src: 'mystery', known: false, paid: 0 };
    s.roughs.push(r2); this.bench.load(r); this.setView('bench'); this.ui.tutor('crack'); this.persist();
  }
  // a free mystery rock on the first visit of each day
  dailyGift() {
    const s = this.save; const d = dayNumber(); if (s.giftDay === d) return; s.giftDay = d;
    const bin = MYSTERY[Math.min(s.tier, 2)]; const r = rollRough(rng((d * 131 + 7) >>> 0), { tier: bin.tier, luck: bin.luck * 1.2, richer: bin.richer, src: 'mystery', known: false }); r.paid = 0;
    if (this.addRough(r)) setTimeout(() => this.ui.toast(`Morning delivery: a free ${bin.name} rock is in your vault`, 'good'), 1200);
    this.persist();
  }
  // rewarded ad helpers
  async rewarded(fn) { if (!Platform.adsAvailable) { fn(); return; } this.audio.suspend(); const ok = await Platform.rewarded(); this.audio.resume(); if (ok) fn(); else this.ui.toast('Ad unavailable right now', 'info'); }
  async midgame() { if (!Platform.adsAvailable) return; const now = Date.now(); if (this.save.stats.cut < 3 || now - (this.lastAd || 0) < 180000) return; this.lastAd = now; this.audio.suspend(); Platform.gameplayStop(); await Platform.midgame(); Platform.gameplayStart(); this.audio.resume(); }
}
const app = new App(); app.boot();
