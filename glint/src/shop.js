// GLINT: the shop floor. Customers walk in, browse the cases, buy, haggle or leave; VIPs post commissions.
// Logic runs whatever room you're in (you hear the door bell from the bench); drawing happens in the shop view.
import { rng, clamp, lerp } from './math.js';
import { TIERS, makeCustomer, willBuy, makeOrder, repFor, upVal, ARCH } from './economy.js';
import { optics, gemName, SPECIES } from './species.js';
import { fmt$ } from './util.js';

const SKIN = ['#f1d1b5', '#e0b48f', '#c68e62', '#a06a43', '#6f4428', '#f5dcc8'];
const COAT = ['#7a1f2a', '#1f4a6b', '#2f5a3a', '#5a3a6a', '#a87a2a', '#2a2a34', '#8a4a2a', '#3a5a7a', '#6a2a4a', '#c8b89a'];
export class Shop {
  constructor(app) { this.app = app; this.cust = []; this.spawnT = 4; this.R = rng(Date.now() & 0xffff); this.floats = []; this.t = 0; this.haggle = null; }
  get save() { return this.app.save; }
  spawnInterval() { const s = this.save; return TIERS[s.tier].spawn / (upVal(s, 'decor') * upVal(s, 'ads')); }
  update(dt) {
    this.t += dt; const s = this.save; const L = this.app.shopL;
    this.spawnT -= dt; if (this.spawnT <= 0) { this.spawnT = this.spawnInterval() * this.R.range(0.6, 1.4); if (this.cust.length < 5 && s.cases.some((g) => g)) this.spawn(); }
    for (const c of this.cust) this.stepCustomer(c, dt, L);
    this.cust = this.cust.filter((c) => !c.gone);
    for (const f of this.floats) f.t += dt; this.floats = this.floats.filter((f) => f.t < 2.2);
    // commissions
    s.orderT -= dt; if (s.orderT <= 0) { s.orderT = this.R.range(110, 190); if (s.orders.length < 3 && s.stats.cut >= 2) { const o = makeOrder(this.R, s); s.orders.push(o); this.app.ui.toast(`${o.who} has a commission for you`, 'order'); this.app.ui.badges(); this.app.audio.play('paper'); } }
    for (const o of s.orders) o.time -= dt; const exp = s.orders.filter((o) => o.time <= 0); if (exp.length) { s.orders = s.orders.filter((o) => o.time > 0); this.app.ui.badges(); }
  }
  spawn() {
    const c = makeCustomer(this.R, this.save); const R = rng(c.look);
    Object.assign(c, { x: -0.05, y: R.range(0.72, 0.9), tx: 0, ty: 0, state: 'enter', wait: 0, visits: 0, skin: R.pick(SKIN), coat: R.pick(COAT), hat: R.int(0, 5), h: R.range(0.95, 1.08), walk: 0, dir: 1, bubble: null });
    this.cust.push(c); this.app.audio.play('door');
    this.pickCase(c);
  }
  pickCase(c) {
    const idx = this.save.cases.map((g, i) => (g ? i : -1)).filter((i) => i >= 0); if (!idx.length || c.visits >= 3) { c.state = 'decide'; return; }
    c.case = this.R.pick(idx); c.state = 'walk'; c.visits++;
  }
  caseX(i) { const L = this.app.shopL; const r = L && L.caseRects && L.caseRects[i]; return r ? r.gx / L.W : 0.5; }
  stepCustomer(c, dt, L) {
    const sp = 0.12 * dt; c.walk += dt;
    if (c.state === 'enter' || c.state === 'walk') { const tx = c.case !== undefined ? this.caseX(c.case) : 0.5; c.dir = tx > c.x ? 1 : -1; c.x += c.dir * sp; if (Math.abs(c.x - tx) < 0.01) { c.state = 'browse'; c.wait = this.R.range(1.6, 3.2); } }
    else if (c.state === 'browse') { c.wait -= dt; if (c.wait <= 0) { this.consider(c); } }
    else if (c.state === 'counter') { const tx = 0.84; c.dir = tx > c.x ? 1 : -1; if (Math.abs(c.x - tx) > 0.01) c.x += c.dir * sp; else { c.wait -= dt; if (c.wait <= 0) this.pay(c); } }
    else if (c.state === 'haggle') { c.wait -= dt; if (c.wait <= 0) { if (this.haggle && this.haggle.c === c) this.endHaggle(false, true); else { c.state = 'leave'; c.bubble = { text: '…maybe another time.', t: 0 }; } } }
    else if (c.state === 'decide') { c.state = 'leave'; c.bubble = { text: this.R.pick(['Just looking, thanks!', 'Nothing for me today.', 'Hmm. I\'ll think about it.']), t: 0 }; }
    else if (c.state === 'leave') { c.dir = -1; c.x -= sp * 1.2; if (c.x < -0.08) c.gone = true; }
    if (c.bubble) { c.bubble.t += dt; if (c.bubble.t > 3.2) c.bubble = null; }
  }
  // look at the case in front of them (and their wishes)
  consider(c) {
    const s = this.save; const g = s.cases[c.case] ? this.app.gemById(s.cases[c.case]) : null; if (!g) { this.pickCase(c); return; }
    const price = this.priceOf(g); const res = willBuy(c, g, price, upVal(s, 'lights'), this.R);
    if (res.buy) { c.target = g.id; c.price = price; c.state = 'counter'; c.wait = 0.8; c.bubble = { text: this.R.pick(['I\'ll take it!', 'Perfect. Wrap it up!', 'Oh, it\'s gorgeous!', 'Sold!']), t: 0 }; return; }
    if (res.offer && !this.haggle) {
      if (upVal(s, 'clerk') > 0 && res.offer >= price * 0.88) { c.target = g.id; c.price = res.offer; c.state = 'counter'; c.wait = 0.8; c.bubble = { text: `Would you take ${fmt$(res.offer)}?`, t: 0 }; this.app.ui.toast('Your clerk accepted an offer', 'info'); return; }
      c.state = 'haggle'; c.wait = 16 * c.pat + 6; c.target = g.id; c.offer = res.offer; c.bubble = { text: `${fmt$(res.offer)} for the ${gemName(g.sp, g.vid)}?`, t: 0 };
      this.haggle = { c, g, price, offer: res.offer, round: 0 }; this.app.ui.haggle(this.haggle); this.app.audio.play('paper'); return;
    }
    if (c.visits < 3 && this.R.chance(0.65)) this.pickCase(c); else c.state = 'decide';
  }
  priceOf(g) { return Math.max(1, Math.round((g.value * this.save.markup) / (g.value > 1000 ? 10 : 1)) * (g.value > 1000 ? 10 : 1)); }
  // player answers a haggle
  answerHaggle(kind) {
    const h = this.haggle; if (!h) return; const c = h.c;
    if (kind === 'accept') { this.endHaggle(true); return; }
    if (kind === 'decline') { this.endHaggle(false); return; }
    // counter at the midpoint: they accept if it's within their real limit (with some pride)
    const mid = Math.round((h.offer + h.price) / 2); const limit = h.offer * (1 + 0.12 * c.pat + this.R.range(0, 0.12));
    if (mid <= limit && h.round < 2) { h.offer = mid; this.save.stats.haggleWins++; this.endHaggle(true, false, true); }
    else if (h.round < 1 && this.R.chance(0.5)) { h.round++; h.offer = Math.round(h.offer * 1.05); c.bubble = { text: `Best I can do: ${fmt$(h.offer)}.`, t: 0 }; this.app.ui.haggle(h); }
    else this.endHaggle(false);
  }
  endHaggle(ok, timeout, won) {
    const h = this.haggle; if (!h) return; const c = h.c; this.haggle = null; this.app.ui.haggle(null);
    if (ok) { c.price = h.offer; c.state = 'counter'; c.wait = 0.6; c.bubble = { text: won ? 'Fine, you drive a hard bargain!' : 'Wonderful, thank you!', t: 0 }; this.app.audio.play('buy'); }
    else { c.state = 'leave'; c.bubble = { text: timeout ? 'I can\'t wait all day…' : 'Too rich for me.', t: 0 }; this.app.audio.play('deny'); }
  }
  pay(c) {
    const s = this.save; const i = s.cases.indexOf(c.target); const g = this.app.gemById(c.target);
    if (i < 0 || !g) { c.state = 'leave'; return; }
    this.app.sellGem(g, c.price, 'case', i); c.state = 'leave'; c.bubble = { text: 'Thank you!', t: 0 };
    const L = this.app.shopL; this.floats.push({ x: c.x * (L ? L.W : 800), y: (L ? L.floorY : 400) + 20, text: '+' + fmt$(c.price), t: 0 });
  }
  // ---------------- drawing ----------------
  gems() {
    const s = this.save, L = this.app.shopL; if (!L || !L.caseRects) return [];
    const out = []; s.cases.forEach((id, i) => { if (!id) return; const g = this.app.gemById(id); const r = L.caseRects[i]; if (!g || !r) return; const st = this.app.gemStone(g); if (!st) return; const o = optics(g.sp, g.vid, g.tone, 0);
      const a = this.t * 0.6 + i * 1.7; out.push({ stone: st, x: r.gx, y: r.gy, r: r.gr, rot: this.app.spinRot(a, 1.05), ri: o.ri, disp: o.disp, sig: o.sig, tint: o.tint, rb: st.rb || 1.3, bound: st.bound, bounces: 6, light: 0.9 + upVal(s, 'lights') * 0.2 }); });
    return out;
  }
  draw(c) {
    const L = this.app.shopL; if (!L) return; const W = L.W, fy = L.floorY, H = L.H;
    // glass reflections on cases + price tags
    this.save.cases.forEach((id, i) => { const r = L.caseRects[i]; if (!r) return; c.save(); c.globalAlpha = 0.12; c.fillStyle = '#fff'; c.beginPath(); c.moveTo(r.x + r.w * 0.1, r.y); c.lineTo(r.x + r.w * 0.28, r.y); c.lineTo(r.x + r.w * 0.12, r.y + r.h * 0.55); c.lineTo(r.x - r.w * 0.06 + r.w * 0.1, r.y + r.h * 0.55); c.fill(); c.restore();
      const g = id && this.app.gemById(id); c.font = '600 12px Jost, sans-serif'; c.textAlign = 'center';
      if (g) { const p = fmt$(this.priceOf(g)); const tw = c.measureText(p).width + 14; c.fillStyle = 'rgba(243,231,207,0.95)'; c.fillRect(r.gx - tw / 2, r.y + r.h * 0.58, tw, 18); c.fillStyle = '#3a2410'; c.fillText(p, r.gx, r.y + r.h * 0.58 + 13); }
      else { c.fillStyle = 'rgba(214,176,106,0.5)'; c.fillText('empty', r.gx, r.y + r.h * 0.33); } });
    // customers (back to front)
    const cs = this.cust.slice().sort((a, b) => a.y - b.y);
    for (const p of cs) this.drawPerson(c, p, L);
    for (const f of this.floats) { c.save(); c.globalAlpha = clamp(1.6 - f.t); c.font = '600 20px Jost, sans-serif'; c.fillStyle = '#ffe2a0'; c.textAlign = 'center'; c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 6; c.fillText(f.text, f.x, f.y - f.t * 40); c.restore(); }
  }
  drawPerson(c, p, L) {
    const fy = L.floorY, H = L.H; const y = fy + (H - fy - (L.bot || 0)) * (p.y - 0.62) * 1.25; const x = p.x * L.W; const sc = (0.75 + (y - fy) / (H - fy) * 0.6) * Math.min(1.2, L.H / 760) * p.h; const h = 150 * sc;
    const bob = p.state === 'browse' || p.state === 'haggle' || p.state === 'counter' && Math.abs(p.x - 0.84) < 0.011 ? 0 : Math.abs(Math.sin(p.walk * 7)) * 4 * sc; const legA = p.state === 'browse' || p.state === 'haggle' ? 0 : Math.sin(p.walk * 7) * 0.35;
    c.save(); c.translate(x, y - bob); c.scale(p.dir < 0 ? -1 : 1, 1);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(0, bob, 26 * sc, 6 * sc, 0, 0, 7); c.fill();
    // legs
    c.strokeStyle = '#1a1418'; c.lineWidth = 7 * sc; c.lineCap = 'round'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 6 * sc, -h * 0.42); c.lineTo(s * 6 * sc + Math.sin(legA * s) * h * 0.2, 0); c.stroke(); }
    // coat (deco trapezoid)
    c.fillStyle = p.coat; c.beginPath(); c.moveTo(-15 * sc, -h * 0.78); c.lineTo(15 * sc, -h * 0.78); c.lineTo(21 * sc, -h * 0.36); c.lineTo(-21 * sc, -h * 0.36); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(-2 * sc, -h * 0.78, 4 * sc, h * 0.42);
    c.strokeStyle = 'rgba(214,176,106,0.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-21 * sc, -h * 0.36); c.lineTo(21 * sc, -h * 0.36); c.stroke();
    // arm
    c.strokeStyle = p.coat; c.lineWidth = 7 * sc; c.beginPath(); c.moveTo(12 * sc, -h * 0.74); c.lineTo(16 * sc + (p.state === 'browse' ? 8 * sc : Math.sin(p.walk * 7) * 6 * sc), -h * 0.5); c.stroke();
    // head
    c.fillStyle = p.skin; c.beginPath(); c.arc(0, -h * 0.87, 11 * sc, 0, 7); c.fill();
    c.fillStyle = '#2a1a12'; c.beginPath(); c.arc(-2 * sc, -h * 0.89, 11 * sc, Math.PI * 0.9, Math.PI * 1.9); c.fill();
    // hats
    c.fillStyle = ['#1a1418', '#5a2a3a', '#2a3a2a', '#1a1418', '#8a6a3a', 'none'][p.hat];
    if (p.hat === 0) { c.fillRect(-16 * sc, -h * 0.93, 32 * sc, 3 * sc); c.fillRect(-10 * sc, -h * 1.02, 20 * sc, h * 0.09); }
    else if (p.hat === 1) { c.beginPath(); c.arc(0, -h * 0.9, 13 * sc, Math.PI, 0); c.fill(); }
    else if (p.hat === 2) { c.beginPath(); c.ellipse(2 * sc, -h * 0.95, 13 * sc, 5 * sc, -0.2, 0, 7); c.fill(); }
    else if (p.hat === 3) { c.fillRect(-14 * sc, -h * 0.935, 28 * sc, 3 * sc); c.fillRect(-9 * sc, -h * 1.1, 18 * sc, h * 0.17); }
    else if (p.hat === 4) { c.beginPath(); c.ellipse(0, -h * 0.94, 17 * sc, 4 * sc, 0, 0, 7); c.fill(); c.beginPath(); c.arc(0, -h * 0.95, 9 * sc, Math.PI, 0); c.fill(); }
    // props by archetype
    if (p.arch === 'banker') { c.fillStyle = '#3a2412'; c.fillRect(16 * sc, -h * 0.5, 16 * sc, 12 * sc); }
    if (p.arch === 'tourist') { c.fillStyle = '#222'; c.fillRect(-8 * sc, -h * 0.68, 14 * sc, 9 * sc); c.fillStyle = '#88a'; c.beginPath(); c.arc(-1 * sc, -h * 0.64, 2.5 * sc, 0, 7); c.fill(); }
    if (p.arch === 'gran') { c.strokeStyle = '#6a4a2a'; c.lineWidth = 2.5 * sc; c.beginPath(); c.moveTo(24 * sc, -h * 0.5); c.lineTo(28 * sc, 0); c.stroke(); }
    if (p.arch === 'star') { c.fillStyle = '#eee'; c.fillRect(18 * sc, -h * 0.62, 6 * sc, 10 * sc); }
    c.restore();
    if (p.bubble) { const a = clamp(Math.min(p.bubble.t * 4, 3.2 - p.bubble.t)); c.save(); c.globalAlpha = a; c.font = `500 ${Math.round(13 * Math.max(0.85, sc))}px Jost, sans-serif`; const tw = Math.min(240, c.measureText(p.bubble.text).width + 18); const bx = clamp(x - tw / 2, 6, L.W - tw - 6), by = y - h * 1.12 - 34;
      c.fillStyle = 'rgba(243,231,207,0.96)'; c.beginPath(); c.roundRect(bx, by, tw, 26, 8); c.fill(); c.beginPath(); c.moveTo(x - 6, by + 26); c.lineTo(x, by + 34); c.lineTo(x + 6, by + 26); c.fill(); c.fillStyle = '#2a1a0c'; c.textAlign = 'center'; c.fillText(p.bubble.text, bx + tw / 2, by + 17, tw - 12); c.restore(); }
  }
  // offline: customers come and go while you're away (only with a clerk); returns {sold:[{g,price}], n}
  offline(seconds) {
    const s = this.save; const hours = upVal(s, 'clerk'); if (!hours) return { sold: [], n: 0 };
    const secs = Math.min(seconds, hours * 3600); const n = Math.floor((secs / this.spawnInterval()) * 0.6); const sold = []; const R = this.R;
    for (let i = 0; i < n; i++) { const idx = s.cases.map((g, j) => (g ? j : -1)).filter((j) => j >= 0); if (!idx.length) break; const c = makeCustomer(R, s); for (let k = 0; k < 2; k++) { const j = R.pick(idx); const g = this.app.gemById(s.cases[j]); if (!g) continue; const price = this.priceOf(g); const res = willBuy(c, g, price, upVal(s, 'lights'), R); if (res.buy || (res.offer && res.offer >= price * 0.88)) { const pr = res.buy ? price : res.offer; this.app.sellGem(g, pr, 'offline', j, true); sold.push({ g, price: pr }); break; } } }
    return { sold, n };
  }
}
