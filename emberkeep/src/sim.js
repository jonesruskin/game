// EMBERKEEP battle simulation: endless waves vs a merge board of wisps around the Ember. Renderer-agnostic.
import { TAU, clamp, dist, dist2, angTo, rand, pick, chance } from './util.js';
import { WISPS, MAX_LVL, levelMult, cardMult, ENEMIES, WAVE_TIME, enemyHp, waveCount, embersPerKill, coinsForWave, summonCost, powerCost, POWER_STEP, TIERS } from './data.js';
import { FX } from './fx.js';

export const CORE_R = 42, SPAWN_R = 560;
export const SLOTS = [];
for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU - Math.PI / 2; SLOTS.push({ x: Math.cos(a) * 108, y: Math.sin(a) * 108, ring: 0 }); }
for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU - Math.PI / 2 + TAU / 24; SLOTS.push({ x: Math.cos(a) * 200, y: Math.sin(a) * 200, ring: 1 }); }

export class Run {
  constructor(o) {
    this.o = o; this.sfx = o.sfx || (() => {}); this.ev = o.events || (() => {});
    this.fx = new FX(); this.fx.lowFx = !!o.lowFx;
    const S = (this.S = o.stats); this.tier = o.tier || 0; this.deck = o.deck.slice();
    this.time = 0; this.wave = 1; this.waveT = 0; this.over = false; this.uid = 1;
    this.enemies = []; this.projs = []; this.spawnQ = []; this.slots = SLOTS.map(() => null);
    this.embers = S.startEmbers; this.summons = 0; this.power = Object.fromEntries(this.deck.map((t) => [t, 0]));
    this.maxHp = S.hp; this.hp = S.hp; this.coreCd = 0; this.novaT = 10; this.hitT = 0;
    this.coins = 0; this.st = { kills: 0, merges: 0, bosses: 0, lvl5: 0, maxLvl: 1, powers: 0, chests: 0 };
    this.auto = o.auto || { summon: false, merge: false, power: false }; this.autoT = 0;
    for (let i = 0; i < (S.startWisps || 0); i++) this.place(pick(this.deck), 1);
    this.planWave();
  }
  // ---------------------------------------------------------------- waves
  planWave() {
    const w = this.wave; const boss = w % 10 === 0; const n = boss ? Math.ceil(waveCount(w) * 0.5) : waveCount(w);
    const pool = Object.entries(ENEMIES).filter(([k, e]) => !e.boss && w >= e.from);
    const q = [];
    for (let i = 0; i < n; i++) {
      // weight: grunts common early, specials ramp in
      const [k, e] = pool.length > 1 && chance(0.55) ? pick(pool.slice(1)) : pool[0];
      q.push({ t: (i / n) * WAVE_TIME * 0.8, type: k });
    }
    if (boss) q.push({ t: WAVE_TIME * 0.25, type: 'boss' });
    q.sort((a, b) => a.t - b.t); this.spawnQ = q;
    if (boss) this.ev({ type: 'boss', wave: w });
  }
  spawn(type, x, y) {
    const E = ENEMIES[type]; const hp = enemyHp(this.wave, this.tier) * E.hp;
    if (x === undefined) { const a = rand(TAU); x = Math.cos(a) * SPAWN_R; y = Math.sin(a) * SPAWN_R; }
    const e = { id: this.uid++, type, E, x, y, hp, maxHp: hp, speed: E.speed * (1 + Math.min(0.5, this.wave * 0.004)), r: E.r, slowT: 0, slowMag: 0, poison: [], phaseT: rand(2, 4), phased: false, hitT: 0, wob: rand(TAU) };
    this.enemies.push(e); return e;
  }
  update(dt) {
    if (this.over) { this.fx.update(dt); return; }
    this.time += dt; this.waveT += dt;
    while (this.spawnQ.length && this.spawnQ[0].t <= this.waveT) { const s = this.spawnQ.shift(); const E = ENEMIES[s.type]; const a = rand(TAU); for (let g = 0; g < (E.group || 1); g++) this.spawn(s.type, Math.cos(a + g * 0.08) * (SPAWN_R + g * 14), Math.sin(a + g * 0.08) * (SPAWN_R + g * 14)); }
    if (this.waveT >= WAVE_TIME) {
      const c = Math.round(coinsForWave(this.wave, this.tier) * this.S.coins); this.coins += c; this.ev({ type: 'wave', wave: this.wave, coins: c });
      this.wave++; this.waveT = 0; this.planWave(); this.sfx('wave');
    }
    // regen + gold passive
    this.hp = Math.min(this.maxHp, this.hp + this.S.regen * dt); this.hitT = Math.max(0, this.hitT - dt);
    for (const s of this.slots) if (s && s.type === 'gold') this.embers += 0.4 * s.lvl * dt * this.S.embers;
    this.updateEnemies(dt); this.updateWisps(dt); this.updateCore(dt); this.updateProjs(dt);
    if (this.auto.summon || this.auto.merge || this.auto.power) { this.autoT -= dt; if (this.autoT <= 0) { this.autoT = 0.3; this.autoStep(); } }
    this.fx.update(dt);
  }
  // ---------------------------------------------------------------- enemies
  updateEnemies(dt) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hitT > 0) e.hitT -= dt;
      if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowMag = 0; }
      // poison
      if (e.poison.length) { let d = 0; for (const p of e.poison) { d += p.dps * dt; p.t -= dt; } e.poison = e.poison.filter((p) => p.t > 0); e.hp -= d; if (e.hp <= 0) { this.kill(e, i, null); continue; } }
      if (e.E.phase) { e.phaseT -= dt; if (e.phaseT <= 0) { e.phased = !e.phased; e.phaseT = e.phased ? 1 : rand(2.5, 4); } }
      if (e.E.heal && Math.random() < dt * 2) for (const o of this.enemies) if (o !== e && dist2(o.x, o.y, e.x, e.y) < 110 * 110) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.025);
      const d = Math.hypot(e.x, e.y); const sp = e.speed * (1 - e.slowMag) * dt;
      e.x -= (e.x / d) * sp; e.y -= (e.y / d) * sp; e.wob += dt * 6;
      if (d - sp <= CORE_R + e.r * 0.6) {
        this.enemies.splice(i, 1); const dmg = e.E.dmg * this.S.armor * Math.pow(1.065, this.wave - 1) * TIERS[this.tier].hp ** 0.5;
        this.hp -= dmg; this.hitT = 0.25; this.fx.burst(e.x, e.y, '#ff4d6d', 10, 160); this.fx.shake(e.E.boss ? 14 : 4); this.sfx('hurt');
        this.ev({ type: 'hurt', dmg });
        if (this.hp <= 0) { this.hp = 0; this.end(); return; }
      }
    }
  }
  kill(e, i, src) {
    if (i === undefined || i < 0) { i = this.enemies.indexOf(e); if (i < 0) return; }
    this.enemies.splice(i, 1); this.st.kills++;
    let em = embersPerKill(this.wave) * this.S.embers * (e.E.boss ? 10 : 1); if (src && src.type === 'gold') em += src.lvl * 2;
    this.embers += em;
    this.fx.burst(e.x, e.y, e.E.eye, e.E.boss ? 40 : 8, e.E.boss ? 300 : 140); this.fx.burst(e.x, e.y, '#2b1d3a', e.E.boss ? 20 : 5, 100);
    if (e.E.split) for (let k = 0; k < e.E.split; k++) { const r = this.spawn('runner', e.x + rand(-12, 12), e.y + rand(-12, 12)); r.hp = r.maxHp = e.maxHp * 0.25; }
    if (e.E.boss) { this.st.bosses++; this.st.chests++; const bc = Math.round(coinsForWave(this.wave, this.tier) * 3 * this.S.coins); this.coins += bc; this.ev({ type: 'bosskill', coins: bc }); this.fx.ring(e.x, e.y, 120, '#ffd23f', 0.8); this.fx.flash('#fff3b0', 0.25); this.sfx('boss'); }
    else if (Math.random() < 0.3) this.sfx('pop');
  }
  hurt(e, dmg, src, crit) {
    if (e.phased || e.hp <= 0) return;
    e.hp -= dmg; e.hitT = 0.08;
    if (crit && !this.fx.lowFx) this.fx.text(e.x + rand(-8, 8), e.y - e.r - 6, fmtShort(dmg), '#ffd23f', 14, { life: 0.6, vy: -50 });
    if (e.hp <= 0) this.kill(e, undefined, src);
  }
  // ---------------------------------------------------------------- wisps
  wispDmg(s) { const W = WISPS[s.type]; return W.dmg * levelMult(s.lvl) * cardMult(this.S.cards[s.type] || 1) * (1 + POWER_STEP * (this.power[s.type] || 0)) * this.S.wispDmg; }
  roll(d) { if (Math.random() < this.S.crit) return [d * this.S.critDmg, true]; return [d, false]; }
  target(sx, sy, range) { let best = null, bd = Infinity; const r2 = range * range; for (const e of this.enemies) { if (e.phased) continue; if (dist2(sx, sy, e.x, e.y) > r2) continue; const dc = e.x * e.x + e.y * e.y; if (dc < bd) { bd = dc; best = e; } } return best; }
  updateWisps(dt) {
    // sun auras
    const buff = this.slots.map(() => 1);
    this.slots.forEach((s, i) => { if (!s || s.type !== 'sun') return; const p = SLOTS[i]; this.slots.forEach((o, j) => { if (j !== i && o && o.type !== 'sun' && dist(p.x, p.y, SLOTS[j].x, SLOTS[j].y) <= WISPS.sun.range) buff[j] += WISPS.sun.aura * s.lvl * cardMult(this.S.cards.sun || 1) * 0.6 + 0.0; }); });
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i]; if (!s) continue; const W = WISPS[s.type]; if (!W.rate) continue;
      s.cd -= dt * this.S.speed * buff[i] * (1 + 0.04 * (s.lvl - 1)); s.buff = buff[i];
      if (s.cd > 0) continue;
      const p = SLOTS[i]; const t = this.target(p.x, p.y, W.range + s.lvl * 6);
      if (!t) { s.cd = 0.05; continue; }
      s.cd = 1 / W.rate; s.flash = 0.1; s.aim = angTo(p.x, p.y, t.x, t.y);
      const [d, crit] = this.roll(this.wispDmg(s));
      switch (s.type) {
        case 'storm': { const hit = new Set([t]); let cur = t, dd = d; this.fx.bolt(p.x, p.y, t.x, t.y, W.color, 0.15); this.hurt(t, dd, s, crit); const jumps = W.chain + Math.floor(s.lvl / 2);
          for (let k = 0; k < jumps; k++) { let nx = null, nd = 140 * 140; for (const e of this.enemies) { if (hit.has(e) || e.phased) continue; const q = dist2(cur.x, cur.y, e.x, e.y); if (q < nd) { nd = q; nx = e; } } if (!nx) break; hit.add(nx); this.fx.bolt(cur.x, cur.y, nx.x, nx.y, W.color, 0.15); dd *= 0.8; this.hurt(nx, dd, s, false); cur = nx; }
          this.sfx('zap'); break; }
        case 'arc': { const a = angTo(p.x, p.y, t.x, t.y); const L = W.range + s.lvl * 6; const ex = p.x + Math.cos(a) * L, ey = p.y + Math.sin(a) * L; this.fx.bolt(p.x, p.y, ex, ey, W.color, 0.12);
          for (const e of this.enemies.slice()) { const along = (e.x - p.x) * Math.cos(a) + (e.y - p.y) * Math.sin(a); const across = Math.abs(-(e.x - p.x) * Math.sin(a) + (e.y - p.y) * Math.cos(a)); if (along > 0 && along < L && across < e.r + 10) this.hurt(e, d, s, crit); }
          this.sfx('beam'); break; }
        default: this.projs.push({ x: p.x, y: p.y, t, type: s.type, lvl: s.lvl, dmg: d, crit, src: s, sp: s.type === 'stone' ? 0 : 640, color: W.color, life: 2, lob: s.type === 'stone' ? { sx: p.x, sy: p.y, tx: t.x, ty: t.y, k: 0 } : null });
          if (s.type === 'flame') this.sfx('shoot');
      }
    }
    for (const s of this.slots) if (s && s.flash > 0) s.flash -= dt;
  }
  updateProjs(dt) {
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i]; p.life -= dt;
      if (p.lob) { const L = p.lob; L.k += dt / 0.45; if (!p.t.hp || p.t.hp <= 0) { /* keep landing spot */ } else { L.tx = p.t.x; L.ty = p.t.y; } p.x = L.sx + (L.tx - L.sx) * L.k; p.y = L.sy + (L.ty - L.sy) * L.k; p.z = Math.sin(Math.min(1, L.k) * Math.PI) * 50;
        if (L.k >= 1) { const R = WISPS.stone.splash + p.lvl * 4; this.fx.ring(L.tx, L.ty, R, p.color, 0.3); this.fx.burst(L.tx, L.ty, p.color, 8, 150); for (const e of this.enemies.slice()) if (dist2(e.x, e.y, L.tx, L.ty) < (R + e.r) ** 2) this.hurt(e, p.dmg, p.src, p.crit); this.projs.splice(i, 1); this.sfx('thud'); }
        continue; }
      const t = p.t; if (!t || t.hp <= 0 || !this.enemies.includes(t) || p.life <= 0) { this.projs.splice(i, 1); continue; }
      const a = angTo(p.x, p.y, t.x, t.y); p.x += Math.cos(a) * p.sp * dt; p.y += Math.sin(a) * p.sp * dt;
      if (dist2(p.x, p.y, t.x, t.y) < (t.r + 5) ** 2) {
        this.projs.splice(i, 1);
        if (p.type === 'frost' && !t.phased) { t.slowMag = Math.max(t.slowMag, Math.min(0.7, WISPS.frost.slow + 0.05 * (p.lvl - 1))); t.slowT = 1.6; }
        if (p.type === 'venom' && !t.phased) { if (t.poison.length >= 5) t.poison.shift(); t.poison.push({ dps: WISPS.venom.poison * levelMult(p.lvl) * cardMult(this.S.cards.venom || 1) * (1 + POWER_STEP * (this.power.venom || 0)) * this.S.wispDmg, t: 3 }); }
        let dmg = p.dmg; if (p.type === 'void') dmg += Math.min(t.maxHp * WISPS.void.pct * (1 + 0.15 * (p.lvl - 1)), p.dmg * 60);
        this.hurt(t, dmg, p.src, p.crit); this.fx.burst(p.x, p.y, p.color, 3, 80);
      }
    }
  }
  updateCore(dt) {
    this.coreCd -= dt * this.S.speed;
    if (this.coreCd <= 0) { const t = this.target(0, 0, 300); if (t) { this.coreCd = 1; const [d, c] = this.roll(this.S.coreDmg); this.projs.push({ x: 0, y: 0, t, type: 'core', lvl: 1, dmg: d, crit: c, src: null, sp: 560, color: '#ffd23f', life: 2 }); } else this.coreCd = 0.1; }
    if (this.S.nova > 0) { this.novaT -= dt; if (this.novaT <= 0) { this.novaT = 10; const dmg = 40 * this.S.nova * this.S.wispDmg * (1 + this.S.coreDmg / 30); this.fx.ring(0, 0, 170, '#ffd23f', 0.6); this.fx.burst(0, 0, '#fff3b0', 30, 400); for (const e of this.enemies.slice()) if (dist2(e.x, e.y, 0, 0) < 170 * 170) this.hurt(e, dmg, null, false); this.sfx('nova'); } }
  }
  // ---------------------------------------------------------------- player actions
  emptySlots() { const out = []; this.slots.forEach((s, i) => { if (!s) out.push(i); }); return out; }
  get summonPrice() { return summonCost(this.summons, this.S.discount); }
  place(type, lvl, idx) { const e = this.emptySlots(); if (!e.length) return -1; const i = idx ?? pick(e); this.slots[i] = { type, lvl, cd: rand(0.2, 0.8), id: this.uid++, born: this.time, flash: 0 }; return i; }
  summon() {
    if (this.over) return false; const c = this.summonPrice; if (this.embers < c || !this.emptySlots().length) return false;
    this.embers -= c; this.summons++; const i = this.place(pick(this.deck), 1); const p = SLOTS[i];
    this.fx.burst(p.x, p.y, WISPS[this.slots[i].type].color, 14, 160); this.fx.ring(p.x, p.y, 30, '#fff', 0.3); this.sfx('summon'); return true;
  }
  canMerge(a, b) { const A = this.slots[a], B = this.slots[b]; return a !== b && A && B && A.type === B.type && A.lvl === B.lvl && A.lvl < MAX_LVL; }
  merge(a, b) {
    if (!this.canMerge(a, b)) return false; const B = this.slots[b]; const lvl = B.lvl + 1;
    this.slots[a] = null; this.slots[b] = { type: pick(this.deck), lvl, cd: 0.3, id: this.uid++, born: this.time, flash: 0.3 };
    this.st.merges++; this.st.maxLvl = Math.max(this.st.maxLvl, lvl); if (lvl >= 5) this.st.lvl5++;
    const p = SLOTS[b]; const W = WISPS[this.slots[b].type]; this.fx.burst(p.x, p.y, W.color, 18 + lvl * 4, 200); this.fx.ring(p.x, p.y, 36 + lvl * 4, W.glow, 0.4);
    if (lvl >= 6) { this.fx.flash(W.glow, 0.15); this.ev({ type: 'bigmerge', lvl, wisp: W }); }
    this.sfx(lvl >= 5 ? 'bigmerge' : 'merge'); return true;
  }
  powerPrice(type) { return Math.round(powerCost(this.power[type] || 0) * (this.S.cheapPower || 1)); }
  powerUp(type) { const c = this.powerPrice(type); if (this.embers < c || (this.power[type] || 0) >= 12) return false; this.embers -= c; this.power[type]++; this.st.powers++; this.sfx('power'); this.ev({ type: 'power', wisp: type, lvl: this.power[type] }); return true; }
  // Autopilot (unlocked through research; also used for balancing sims)
  autoStep() {
    if (this.auto.merge) { const pair = this.findMerge(); if (pair) { this.merge(pair[0], pair[1]); return; } }
    if (this.auto.summon && this.emptySlots().length && this.embers >= this.summonPrice) { this.summon(); return; }
    if (this.auto.power) {
      const full = !this.emptySlots().length;
      const counts = {}; for (const s of this.slots) if (s) counts[s.type] = (counts[s.type] || 0) + levelMult(s.lvl);
      const best = Object.keys(counts).filter((t) => WISPS[t].rate).sort((a, b) => counts[b] - counts[a])[0];
      if (best && (full || this.embers > this.summonPrice * 3) && this.embers >= this.powerPrice(best)) this.powerUp(best);
    }
  }
  findMerge() {
    let best = null, bl = 99;
    for (let i = 0; i < this.slots.length; i++) { const A = this.slots[i]; if (!A || A.lvl >= MAX_LVL || A.lvl >= bl) continue; for (let j = i + 1; j < this.slots.length; j++) { const B = this.slots[j]; if (B && B.type === A.type && B.lvl === A.lvl) { best = SLOTS[i].ring <= SLOTS[j].ring ? [j, i] : [i, j]; bl = A.lvl; break; } } }
    return best;
  }
  end() {
    if (this.over) return; this.over = true; this.fx.ring(0, 0, 200, '#ff4d6d', 1); this.fx.burst(0, 0, '#ff7b2e', 60, 400); this.sfx('lose');
    this.ev({ type: 'end' });
    this.o.onEnd && this.o.onEnd(this.result());
  }
  result() { return { wave: this.wave, tier: this.tier, coins: Math.round(this.coins), time: Math.round(this.time), ...this.st }; }
}
export function fmtShort(n) { n = Math.floor(n); if (n < 1000) return String(n); const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc']; let i = -1; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; } return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : n.toFixed(0)) + u[i]; }
