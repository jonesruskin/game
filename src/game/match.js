// The battle-royale simulation. Fixed timestep, deterministic-ish, renderer-agnostic.
import { TAU, clamp, lerp, dist, dist2, angTo, rand, randi, pick, chance, shuffle, circleRect, segRect, segCircle } from '../util.js';
import { HEROES, HERO, ULT_COST } from '../data/heroes.js';
import { ABILITIES, ABILITY_IDS, ULTS, cdMult } from '../data/abilities.js';
import { SKINS, TRAILS, KOFX, EMOTES } from '../data/cosmetics.js';
import { generateWorld, queryObstacles, inBush } from './world.js';
import { FX } from './fx.js';
import { Bot, botName } from './bot.js';

export const PROJ_COLORS = { fire: '#ffb703', shock: '#9ef0ff', slug: '#ffd166', seed: '#b7f171', snipe: '#f15bb5', ice: '#caf0f8', blade: '#ff4d6d', bullet: '#ffe066' };
const HISTORY_N = 25;
export const HP_MULT = 2;
const tmp = [];

export class Match {
  constructor(o) {
    this.o = o;
    this.sfxFn = o.sfx || (() => {});
    this.events = o.events || (() => {});
    const total = o.total || 12;
    this.total = total;
    this.size = o.size || (total <= 8 ? 2500 : 3400);
    this.world = generateWorld(this.size, total);
    this.fx = new FX(); this.fx.lowFx = !!o.lowFx;
    this.time = 0; this.over = false; this.slowmo = 1; this.endTimer = -1;
    this.projectiles = []; this.zones = []; this.deployables = []; this.pickups = []; this.tempWalls = []; this.lobs = [];
    this.fighters = []; this.feed = []; this.uid = 1;
    this.stats = { kills: 0, damage: 0, steals: 0, maxLvl: 1, ults: 0, crates: 0, stormDmg: 0 };
    this.streak = { n: 0, t: -99 };
    const spawns = shuffle(this.world.spawns.slice());
    // Player
    const ph = HERO[o.heroId] || HEROES[0];
    this.player = this.makeFighter({ name: o.playerName || 'You', hero: ph, skin: o.skin, trail: o.trail, kofx: o.kofx, emotes: o.emotes, isPlayer: true, title: o.title }, spawns[0]);
    // Bots — named, skinned, skill-varied so lobbies feel alive.
    const usedNames = new Set([this.player.name]);
    for (let i = 1; i < total; i++) {
      const h = pick(HEROES); const skins = SKINS.filter((s) => s.hero === h.id);
      const skin = chance(0.45) ? skins[0] : pick(skins);
      let name; do name = botName(); while (usedNames.has(name)); usedNames.add(name);
      const f = this.makeFighter({ name, hero: h, skin, trail: chance(0.5) ? pick(TRAILS) : TRAILS[0], kofx: pick(KOFX), emotes: EMOTES }, spawns[i]);
      const s = clamp((o.botSkill ?? 0.4) + rand(-0.15, 0.15), 0.03, 0.97);
      f.bot = new Bot(this, f, s);
    }
    // Storm
    const W = this.size; const cx = W / 2 + rand(-W * 0.08, W * 0.08), cy = W / 2 + rand(-W * 0.08, W * 0.08);
    const fast = o.tutorial ? 1.25 : 1;
    this.storm = { x: W / 2, y: W / 2, r: W * 0.75, phase: -1, t: 0, from: null, to: null, dps: 4,
      phases: [
        { wait: 30 * fast, shrink: 18, r: W * 0.45, dps: 6 },
        { wait: 15 * fast, shrink: 15, r: W * 0.28, dps: 10 },
        { wait: 12, shrink: 12, r: W * 0.15, dps: 16 },
        { wait: 10, shrink: 10, r: W * 0.06, dps: 24 },
        { wait: 6, shrink: 14, r: 0, dps: 36 },
      ], next: { x: cx, y: cy, r: W * 0.45 } };
    this.nextStormPhase();
  }

  makeFighter(d, sp) {
    const h = d.hero;
    const f = {
      id: this.uid++, isFighter: true, name: d.name, title: d.title, isPlayer: !!d.isPlayer, hero: h,
      skin: d.skin || SKINS.find((s) => s.hero === h.id), trail: d.trail || TRAILS[0], kofx: d.kofx || KOFX[0], emotes: d.emotes || EMOTES.slice(0, 3),
      x: sp.x, y: sp.y, r: 26, kvx: 0, kvy: 0, hp: Math.round(h.hp * HP_MULT), maxHp: Math.round(h.hp * HP_MULT), shield: 0, aim: rand(TAU), alive: true, moving: false, walkT: rand(10),
      abilities: h.kit.map((id) => ({ id, lvl: 1, cd: 0 })), ult: 0, fireCd: 0, st: { spawn: 2.5 },
      kills: 0, dmgDealt: 0, steals: 0, lastHurt: -99, lastCombat: -99, history: [], histT: 0, dash: null, leap: null, deadeye: 0,
      revealT: 0, inBush: false, emote: null, intent: { mx: 0, my: 0, aim: 0, ax: sp.x, ay: sp.y, fire: false, cast: [false, false], ult: false, swap: -1 },
      trailT: 0, place: 0, nearOrb: null,
    };
    this.fighters.push(f); return f;
  }

  // ---------------------------------------------------------------- core loop
  update(dt) {
    dt *= this.slowmo;
    this.time += dt;
    this.updateStorm(dt);
    for (const f of this.fighters) if (f.alive) this.updateFighter(f, dt);
    this.updateProjectiles(dt);
    this.updateZones(dt);
    this.updateDeployables(dt);
    this.updateLobs(dt);
    this.updatePickups(dt);
    for (let i = this.tempWalls.length - 1; i >= 0; i--) { const w = this.tempWalls[i]; w.life -= dt; if (w.life <= 0) { this.fx.burst(w.x, w.y, w.color, 5, 120); this.tempWalls.splice(i, 1); } }
    this.fx.update(dt);
    for (const k of this.feed) k.t -= dt; this.feed = this.feed.filter((k) => k.t > 0);
    if (this.endTimer >= 0) { this.endTimer -= dt / Math.max(0.2, this.slowmo); this.slowmo = lerp(this.slowmo, 1, 0.02); if (this.endTimer < 0 && !this.over) this.finish(); }
  }

  alive() { return this.fighters.filter((f) => f.alive); }

  // ---------------------------------------------------------------- storm
  nextStormPhase() {
    const s = this.storm; s.phase++;
    const ph = s.phases[Math.min(s.phase, s.phases.length - 1)];
    s.from = { x: s.x, y: s.y, r: s.r };
    if (s.phase > 0) { // choose next target inside current target
      const cur = s.next; const nr = ph.r; const maxOff = Math.max(0, cur.r - nr) * 0.85; const a = rand(TAU), d = rand(maxOff);
      s.next = { x: clamp(cur.x + Math.cos(a) * d, nr, this.size - nr), y: clamp(cur.y + Math.sin(a) * d, nr, this.size - nr), r: nr };
    }
    s.wait = ph.wait; s.shrink = ph.shrink; s.t = 0; s.state = 'wait'; s.dpsNext = ph.dps;
    if (s.phase > 0) this.events({ type: 'storm', text: s.phase >= s.phases.length - 1 ? 'FINAL STORM — the zone is collapsing!' : 'The storm is moving!' });
  }
  updateStorm(dt) {
    const s = this.storm; s.t += dt;
    if (s.state === 'wait') { if (s.t >= s.wait) { s.state = 'shrink'; s.t = 0; s.from = { x: s.x, y: s.y, r: s.r }; s.dps = s.dpsNext; this.events({ type: 'storm', text: '⚡ The storm is closing in!' }); this.sfxFn('storm'); } }
    else if (s.state === 'shrink') {
      const k = clamp(s.t / s.shrink, 0, 1); const e = k * k * (3 - 2 * k);
      s.x = lerp(s.from.x, s.next.x, e); s.y = lerp(s.from.y, s.next.y, e); s.r = lerp(s.from.r, s.next.r, e);
      if (k >= 1) { if (s.phase < s.phases.length - 1) this.nextStormPhase(); else s.state = 'done'; }
    }
  }
  stormTimeLeft() { const s = this.storm; return s.state === 'wait' ? s.wait - s.t : s.state === 'shrink' ? s.shrink - s.t : 0; }
  outsideStorm(x, y) { const s = this.storm; return dist2(x, y, s.x, s.y) > s.r * s.r; }

  // ---------------------------------------------------------------- fighters
  updateFighter(f, dt) {
    const st = f.st;
    for (const k in st) { if (typeof st[k] === 'number') { st[k] -= dt; if (st[k] <= 0) delete st[k]; } else if (st[k] && st[k].t !== undefined) { st[k].t -= dt; if (st[k].t <= 0) delete st[k]; } }
    if (f.revealT > 0) f.revealT -= dt;
    if (f.emote) { f.emote.t -= dt; if (f.emote.t <= 0) f.emote = null; }
    // history for Rewind
    f.histT -= dt; if (f.histT <= 0) { f.histT = 0.1; f.history.push({ x: f.x, y: f.y, hp: f.hp }); if (f.history.length > HISTORY_N) f.history.shift(); }
    // burn
    if (st.burn) { st.burn.acc = (st.burn.acc || 0) + dt; if (st.burn.acc >= 0.5) { st.burn.acc = 0; this.damage(f, st.burn.mag, st.burn.src, { kind: 'burn', dot: true }); this.fx.burst(f.x, f.y - 10, '#ff9f1c', 3, 60); if (!f.alive) return; } }
    // regen + Bastion shield
    const lb = f.hero.passive.id === 'lifebloom';
    const quiet = this.time - Math.max(f.lastHurt, f.lastCombat);
    if (quiet > (lb ? 2.5 : 3.5) && f.hp < f.maxHp) f.hp = Math.min(f.maxHp, f.hp + f.maxHp * (lb ? 0.12 : 0.06) * dt);
    if (f.hero.passive.id === 'bulwark' && this.time - f.lastHurt > 4 && f.shield < 30) f.shield = Math.min(30, f.shield + 20 * dt);
    // storm damage
    if (this.outsideStorm(f.x, f.y) && !st.spawn) { f.stormAcc = (f.stormAcc || 0) + dt; if (f.stormAcc >= 0.5) { f.stormAcc = 0; this.damage(f, this.storm.dps * 0.5, null, { kind: 'storm' }); if (f.isPlayer) this.stats.stormDmg += this.storm.dps * 0.5; if (!f.alive) return; } }
    // intent
    if (f.bot) f.bot.think(dt); else if (this.o.getPlayerIntent) this.o.getPlayerIntent(this, f);
    const I = f.intent;
    const cc = st.stun > 0;
    if (!cc) f.aim = I.aim;
    // movement
    let sp = f.hero.speed;
    if (st.slow) sp *= 1 - st.slow.mag;
    if (st.haste) sp *= 1 + st.haste.mag;
    if (f.hero.passive.id === 'momentum' && st.momentum) sp *= 1.3;
    if (st.bulletstorm) sp *= 0.6;
    if (f.leap) { this.updateLeap(f, dt); }
    else if (f.dash) { this.updateDash(f, dt); }
    else {
      let mx = I.mx, my = I.my; const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
      if (cc || st.root) { mx = 0; my = 0; }
      f.moving = ml > 0.1 && !(cc || st.root);
      this.moveCircle(f, (mx * sp + f.kvx) * dt, (my * sp + f.kvy) * dt);
      const kd = Math.exp(-7 * dt); f.kvx *= kd; f.kvy *= kd;
      if (f.moving) f.walkT += dt * sp / 40;
    }
    // trail cosmetic
    if (f.moving && f.trail && f.trail.id !== 'none') { f.trailT -= dt; if (f.trailT <= 0) { f.trailT = 0.06; if (this.canSeeFromPlayer(f)) this.fx.puff(f.x + rand(-8, 8), f.y + 16, f.trail.color || '#c2b280', f.trail.glyph ? 5 : 4, 0.6, f.trail.glyph); } }
    // bush
    const b = inBush(this.world, f.x, f.y); f.inBush = !!b || this.inConcealZone(f.x, f.y); f.bush = b;
    // weapons + abilities
    f.fireCd -= dt;
    for (const a of f.abilities) if (a.cd > 0) a.cd -= dt;
    if (!cc && !f.leap) {
      if (I.fire && f.fireCd <= 0 && !st.bulletstorm) this.fireWeapon(f);
      for (let i = 0; i < 2; i++) if (I.cast[i]) { this.castAbility(f, i, I.ax, I.ay); I.cast[i] = false; }
      if (I.ult) { this.castUlt(f, I.ax, I.ay); I.ult = false; }
    }
    I.cast[0] = I.cast[1] = false; I.ult = false;
    if (st.bulletstorm) { f.stormAcc2 = (f.stormAcc2 || 0) + dt; while (f.stormAcc2 > 0.05) { f.stormAcc2 -= 0.05; f.stormAngle += 0.55; for (let k = 0; k < 2; k++) this.spawnProjectile({ owner: f, x: f.x, y: f.y, angle: f.stormAngle + k * Math.PI, speed: 900, range: 560, r: 6, dmg: 9, color: f.skin?.c2 || '#ffe066', kind: 'bullet', bounce: 1 }); } if (Math.random() < 0.3) this.sfxFn('shoot_bullet', f.x, f.y); }
    f.ult = Math.min(1, f.ult + dt / 150);
    // swap request
    if (I.swap >= 0 && f.nearOrb) { this.swapOrb(f, f.nearOrb, I.swap); I.swap = -1; }
    I.swap = -1;
  }

  fireWeapon(f) {
    const w = f.hero.weapon; let rate = w.rate; if (f.st.overcharge) rate *= 0.5;
    f.fireCd = rate; f.lastCombat = this.time; f.revealT = 0.7; delete f.st.invis;
    let dmg = w.dmg, pierce = 0, r = w.r, speed = w.speed;
    if (f.hero.passive.id === 'ambush' && (f.inBush || f.st.invis)) { dmg *= 1.5; }
    let de = false;
    if (f.deadeye > 0 && f.st.deadeyeT) { dmg *= 2; pierce = 99; f.deadeye--; r += 3; speed *= 1.2; de = true; }
    const color = f.skin && f.skin.source !== 'default' ? f.skin.c2 : PROJ_COLORS[w.kind];
    for (let i = 0; i < w.count; i++) {
      const off = w.count > 1 ? lerp(-w.spread / 2, w.spread / 2, i / (w.count - 1)) + rand(-0.03, 0.03) : rand(-w.spread, w.spread);
      const a = f.aim + off;
      this.spawnProjectile({ owner: f, x: f.x + Math.cos(a) * (f.r - 4), y: f.y + Math.sin(a) * (f.r - 4), angle: a, speed: speed * rand(0.95, 1.05), range: w.range * rand(0.95, 1.02), r, dmg, color, kind: w.kind, burn: w.burn, slow: w.slow, bounce: w.bounce || 0, boomerang: w.boomerang, pierce, glow: de || w.kind === 'snipe' });
    }
    f.recoil = 1;
    this.sfxFn('shoot_' + w.kind, f.x, f.y, f.isPlayer);
  }

  castAbility(f, i, ax, ay) {
    const slot = f.abilities[i]; if (!slot || slot.cd > 0) return false;
    const def = ABILITIES[slot.id];
    def.cast(this, f, ax, ay, slot.lvl);
    slot.cd = def.cd * cdMult(slot.lvl);
    f.lastCombat = this.time;
    if (def.id !== 'decoy' && def.id !== 'smoke_bomb') { delete f.st.invis; f.revealT = Math.max(f.revealT, 0.4); }
    if (f.hero.passive.id === 'momentum') this.status(f, 'momentum', 2);
    return true;
  }
  castUlt(f, ax, ay) {
    if (f.ult < 1) return false;
    f.ult = 0; ULTS[f.hero.ult.id].cast(this, f, ax, ay);
    f.lastCombat = this.time;
    if (f.isPlayer) this.stats.ults++;
    this.fx.ring(f.x, f.y, 110, f.hero.color2);
    return true;
  }

  updateDash(f, dt) {
    const d = f.dash; const step = Math.min(d.left, d.speed * dt);
    const ox = f.x, oy = f.y;
    this.moveCircle(f, Math.cos(d.a) * step, Math.sin(d.a) * step);
    const moved = Math.hypot(f.x - ox, f.y - oy);
    d.left -= step; f.moving = true;
    if (d.trail) { d.trailAcc = (d.trailAcc || 0) + moved; if (d.trailAcc > 55) { d.trailAcc = 0; d.trail(f.x, f.y); } }
    this.fx.puff(f.x, f.y, f.hero.color, 7, 0.3);
    if (d.onHit) {
      for (const e of this.targetsNear(f.x, f.y, f.r + 30, f)) { if (d.hit.has(e)) continue; d.hit.add(e); d.onHit(e); if (d.hitOnce) { f.dash = null; return; } }
    }
    if (d.left <= 0.5 || moved < step * 0.3) f.dash = null;
  }
  startDash(f, a, distance, speed, o = {}) { f.dash = { a, left: distance, speed, trail: o.trail, onHit: o.onHit, hitOnce: o.hitOnce, hit: new Set() }; }
  startLeap(f, tx, ty, dur, onLand) { f.dash = null; f.leap = { sx: f.x, sy: f.y, tx: clamp(tx, 40, this.size - 40), ty: clamp(ty, 40, this.size - 40), t: 0, dur, onLand }; }
  updateLeap(f, dt) {
    const L = f.leap; L.t += dt; const k = Math.min(1, L.t / L.dur);
    f.x = lerp(L.sx, L.tx, k); f.y = lerp(L.sy, L.ty, k); f.z = Math.sin(k * Math.PI) * 80;
    this.fx.puff(f.x, f.y, '#ff006e', 6, 0.4);
    if (k >= 1) { f.leap = null; f.z = 0; this.moveCircle(f, 0, 0); L.onLand && L.onLand(); }
  }
  blinkTo(f, x, y) {
    const a = angTo(f.x, f.y, x, y), d = dist(f.x, f.y, x, y);
    let best = 0;
    for (let s = d; s > 0; s -= 12) { const px = f.x + Math.cos(a) * s, py = f.y + Math.sin(a) * s; if (this.pointFree(px, py, f.r)) { best = s; break; } }
    f.x += Math.cos(a) * best; f.y += Math.sin(a) * best; f.dash = null; this.moveCircle(f, 0, 0);
  }
  pointFree(x, y, r) {
    if (x < r || y < r || x > this.size - r || y > this.size - r) return false;
    for (const o of queryObstacles(this.world, x - r, y - r, x + r, y + r, tmp)) {
      if (o.kind === 'rect' ? circleRect(x, y, r, o.x, o.y, o.w, o.h) : dist2(x, y, o.x, o.y) < (r + o.r) ** 2) return false;
    }
    for (const w of this.tempWalls) if (dist2(x, y, w.x, w.y) < (r + w.r) ** 2) return false;
    return true;
  }
  moveCircle(e, dx, dy) {
    // sub-step to avoid tunneling
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 14));
    for (let s = 0; s < steps; s++) {
      e.x += dx / steps; e.y += dy / steps;
      for (let it = 0; it < 2; it++) {
        for (const o of queryObstacles(this.world, e.x - e.r, e.y - e.r, e.x + e.r, e.y + e.r, tmp)) {
          if (o.kind === 'rect') { const p = circleRect(e.x, e.y, e.r, o.x, o.y, o.w, o.h); if (p) { e.x += p.x; e.y += p.y; } }
          else { const d2 = dist2(e.x, e.y, o.x, o.y), rr = e.r + o.r; if (d2 < rr * rr) { const d = Math.sqrt(d2) || 0.01; e.x = o.x + ((e.x - o.x) / d) * rr; e.y = o.y + ((e.y - o.y) / d) * rr; } }
        }
        for (const o of this.tempWalls) { const d2 = dist2(e.x, e.y, o.x, o.y), rr = e.r + o.r; if (d2 < rr * rr) { const d = Math.sqrt(d2) || 0.01; e.x = o.x + ((e.x - o.x) / d) * rr; e.y = o.y + ((e.y - o.y) / d) * rr; } }
      }
    }
    e.x = clamp(e.x, e.r, this.size - e.r); e.y = clamp(e.y, e.r, this.size - e.r);
  }
  push(e, dx, dy) { if (e.isFighter && !e.leap) this.moveCircle(e, dx, dy); }
  knock(e, a, force) { if (!e.isFighter || e.st.fortress) return; e.dash = null; e.kvx += Math.cos(a) * force; e.kvy += Math.sin(a) * force; }

  status(f, key, dur, mag, src) {
    if (!f || !f.isFighter || !f.alive) return;
    if ((key === 'stun' || key === 'root' || key === 'slow') && f.st.spawn) return;
    if (mag !== undefined) { const cur = f.st[key]; if (!cur || cur.mag <= mag || cur.t < dur) f.st[key] = { t: Math.max(dur, cur ? cur.t : 0), mag: Math.max(mag, cur && cur.t > 0.2 ? cur.mag : 0), src: src || (cur && cur.src), acc: cur ? cur.acc : 0 }; }
    else f.st[key] = Math.max(f.st[key] || 0, dur);
  }
  heal(f, amt) { if (!f.alive) return; const before = f.hp; f.hp = Math.min(f.maxHp, f.hp + amt); const h = f.hp - before; if (h > 0.5 && f.isPlayer) { f.healAcc = (f.healAcc || 0) + h; if (f.healAcc > 8) { this.fx.text(f.x + rand(-10, 10), f.y - 40, '+' + Math.round(f.healAcc), '#7CFC9A', 16); f.healAcc = 0; } } }

  // ---------------------------------------------------------------- damage + KO
  damage(t, amt, src, o = {}) {
    if (!t || t.dead) return 0;
    const sf = src ? (src.isFighter ? src : src.owner) : null;
    if (t.isFighter) {
      if (!t.alive || t.st.spawn) return 0;
      if (sf === t) return 0;
      if (sf && sf.hero.passive.id === 'frostbite' && t.st.slow) amt *= 1.2;
      if (sf && sf.bot && this.o.botDamage) amt *= this.o.botDamage;
      if (sf && sf.bot && t.bot && !this.o.simAllBots) amt *= 0.6; // bot-vs-bot skirmishes last longer → more third-party chances for the player
      t.lastHurt = this.time; t.revealT = Math.max(t.revealT, 0.6);
      let a = amt; if (t.shield > 0) { const s = Math.min(t.shield, a); t.shield -= s; a -= s; }
      t.hp -= a;
      if (sf && sf.alive !== undefined) {
        sf.dmgDealt += amt; sf.ult = Math.min(1, sf.ult + amt / ULT_COST); sf.lastCombat = this.time; t.lastHitBy = sf;
        if (sf.isPlayer) { this.stats.damage += amt; if (!o.dot || amt >= 3) this.fx.text(t.x + rand(-14, 14), t.y - 34, Math.round(amt), amt >= 35 ? '#ffd60a' : '#fff', amt >= 35 ? 26 : 18, { crit: amt >= 35 }); this.sfxFn('hit', t.x, t.y, true); }
      }
      if (t.isPlayer && amt >= 1) { this.fx.text(t.x + rand(-14, 14), t.y - 34, '-' + Math.round(amt), '#ff4d6d', 17); if (!o.dot) this.fx.shake(Math.min(10, 2 + amt / 5)); this.events({ type: 'hurt' }); }
      t.hitFlash = 0.12;
      if (t.hp <= 0) this.kill(t, sf);
      return amt;
    }
    // deployable or crate
    t.hp -= amt; t.hitFlash = 0.12;
    if (t.hp <= 0) { if (t.crate) this.breakCrate(t, sf); else this.destroyDeployable(t); }
    return amt;
  }
  explode(x, y, r, dmg, owner, color) {
    this.fx.ring(x, y, r, color); this.fx.burst(x, y, color, 30, 420); this.fx.burst(x, y, '#fff', 10, 200);
    for (const e of this.targetsNear(x, y, r, owner)) { this.damage(e, dmg, owner, { kind: 'blast' }); this.knock(e, angTo(x, y, e.x, e.y), 420); }
    for (const c of this.cratesNear(x, y, r)) this.damage(c, dmg, owner);
    if (dist(x, y, this.player.x, this.player.y) < 900) this.fx.shake(10);
    this.sfxFn('boom', x, y);
  }
  kill(f, killer) {
    if (!f.alive) return;
    f.alive = false; f.hp = 0;
    const aliveNow = this.fighters.filter((x) => x.alive).length;
    f.place = aliveNow + 1; f.killer = killer;
    f.deathT = this.time;
    // Drop stealable abilities — the heart of the game.
    f.abilities.forEach((a, i) => { const ang = (i / 2) * TAU + rand(-0.4, 0.4); this.dropOrb(f.x + Math.cos(ang) * 30, f.y + Math.sin(ang) * 30, a.id, a.lvl, f, Math.cos(ang) * 160, Math.sin(ang) * 160); });
    this.pickups.push({ kind: 'health', x: f.x, y: f.y, amt: 45, t: 0, id: this.uid++, vx: 0, vy: 0 });
    // KO cosmetics of the killer — show-off moment
    this.koEffect(f, killer);
    this.sfxFn('ko', f.x, f.y);
    if (killer && killer !== f) {
      killer.kills++;
      if (killer.hero.passive.id === 'slippery') killer.abilities.forEach((a) => (a.cd = 0));
      if (killer.bot && chance(0.35)) setTimeout(() => this.emote(killer, pick(killer.emotes).text), 500 + rand(700));
      if (killer.isPlayer) {
        this.stats.kills++;
        this.streak.n = this.time - this.streak.t < 7 ? this.streak.n + 1 : 1; this.streak.t = this.time;
        const names = ['', 'KO!', 'DOUBLE HEIST!', 'TRIPLE HEIST!', 'MEGA HEIST!', 'HEIST LEGEND!'];
        this.events({ type: 'announce', text: names[Math.min(5, this.streak.n)], sub: `You KO'd ${f.name} — grab their powers!`, big: this.streak.n > 1 });
        this.fx.flash('#fff', 0.25);
      }
    }
    this.feed.unshift({ t: 6, killer: killer ? killer.name : 'The Storm', victim: f.name, kc: killer ? killer.hero.color : '#c77dff', vc: f.hero.color, me: f.isPlayer || (killer && killer.isPlayer) });
    if (this.feed.length > 5) this.feed.length = 5;
    // Bounty: leader with 3+ KOs is marked for everyone.
    const lead = this.fighters.filter((x) => x.alive).sort((a, b) => b.kills - a.kills)[0];
    this.fighters.forEach((x) => (x.bounty = false)); if (lead && lead.kills >= 3) lead.bounty = true;
    const remaining = aliveNow;
    if (f.isPlayer) { this.endTimer = 2.2; this.slowmo = 0.3; this.events({ type: 'dead', killer }); }
    else if (remaining === 1 && this.player.alive) { this.player.place = 1; this.endTimer = 2.6; this.slowmo = 0.25; this.events({ type: 'win' }); }
    else if (this.player.alive) this.events({ type: 'alive', n: remaining });
  }
  koEffect(f, killer) {
    const id = killer && killer.kofx ? killer.kofx.id : 'poof';
    const x = f.x, y = f.y;
    this.fx.burst(x, y, f.hero.color, 22, 320); this.fx.ring(x, y, 80, '#fff');
    switch (id) {
      case 'confetti': for (const c of ['#ff4d6d', '#ffd60a', '#4cc9f0', '#7CFC9A', '#c77dff']) this.fx.burst(x, y, c, 10, 380, { shape: 'sq', grav: 400, life: 1.2, drag: 1.5 }); break;
      case 'pixel': this.fx.burst(x, y, f.hero.color, 30, 260, { shape: 'sq', size: 9, life: 1 }); this.fx.burst(x, y, '#00ffd5', 14, 200, { shape: 'sq', size: 7 }); break;
      case 'lightning': this.fx.bolt(x, y - 600, x, y, '#f8f32b', 0.4); this.fx.bolt(x + 20, y - 600, x, y, '#fff', 0.3); this.fx.flash('#f8f32b', 0.15); break;
      case 'firework': for (let i = 0; i < 5; i++) { const c = `hsl(${i * 72},90%,60%)`; this.fx.burst(x + rand(-60, 60), y + rand(-80, 0), c, 16, 300, { life: 1.1 }); } break;
      case 'ghost': this.fx.text(x, y - 20, '👻', '#fff', 40, { life: 1.6, vy: -60 }); break;
      case 'supernova': this.fx.ring(x, y, 220, '#e0aaff', 0.8); this.fx.ring(x, y, 140, '#fff', 0.6); this.fx.burst(x, y, '#e0aaff', 40, 600, { glyph: '✦', life: 1.2 }); break;
      default: this.fx.burst(x, y, '#ddd', 14, 160, { size: 9, life: 0.8 });
    }
  }
  emote(f, text) { if (f.alive) f.emote = { text, t: 2.2 }; }

  // ---------------------------------------------------------------- orbs + pickups
  dropOrb(x, y, id, lvl, from, vx = 0, vy = 0) {
    this.pickups.push({ kind: 'orb', ability: id, lvl, x, y, vx, vy, from: from ? from.name : null, fromId: from ? from.id : 0, t: 0, id: this.uid++, noPick: from, noPickT: 1.0 });
  }
  updatePickups(dt) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i]; p.t += dt; if (p.noPickT > 0) p.noPickT -= dt;
      if (p.vx || p.vy) { p.x += p.vx * dt; p.y += p.vy * dt; const d = Math.exp(-5 * dt); p.vx *= d; p.vy *= d; if (Math.abs(p.vx) + Math.abs(p.vy) < 2) p.vx = p.vy = 0; p.x = clamp(p.x, 30, this.size - 30); p.y = clamp(p.y, 30, this.size - 30); }
      if (p.t > 75) { this.pickups.splice(i, 1); continue; }
    }
    for (const f of this.fighters) {
      if (!f.alive) continue; f.nearOrb = null;
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const p = this.pickups[i]; if (dist2(f.x, f.y, p.x, p.y) > (f.r + 24) ** 2) continue;
        if (p.kind === 'health') { if (f.hp < f.maxHp - 5) { this.heal(f, p.amt); this.fx.burst(p.x, p.y, '#7CFC9A', 12, 160); this.sfxFn('heal', p.x, p.y, f.isPlayer); this.pickups.splice(i, 1); } continue; }
        if (p.noPick === f && p.noPickT > 0) continue;
        const same = f.abilities.findIndex((a) => a.id === p.ability);
        if (same >= 0) { // stacking upgrade
          const a = f.abilities[same];
          if (a.lvl >= 3) { if (!f.nearOrb) f.nearOrb = p; continue; }
          a.lvl = Math.min(3, a.lvl + p.lvl); a.cd = Math.min(a.cd, 1);
          this.pickups.splice(i, 1); this.onSteal(f, p, true); continue;
        }
        if (!f.nearOrb) f.nearOrb = p;
      }
      if (f.bot && f.nearOrb) f.bot.considerOrb(f.nearOrb);
    }
  }
  swapOrb(f, p, slot) {
    if (!this.pickups.includes(p) || slot < 0 || slot > 1) return;
    if (f.abilities.some((a) => a.id === p.ability)) return;
    const old = f.abilities[slot];
    f.abilities[slot] = { id: p.ability, lvl: p.lvl, cd: 0 };
    this.pickups.splice(this.pickups.indexOf(p), 1);
    const a = angTo(p.x, p.y, f.x, f.y) + Math.PI;
    this.dropOrb(f.x, f.y, old.id, old.lvl, f, Math.cos(a) * 140, Math.sin(a) * 140);
    f.nearOrb = null;
    this.onSteal(f, p, false);
  }
  onSteal(f, p, upgraded) {
    const def = ABILITIES[p.ability];
    const lvl = f.abilities.find((a) => a.id === p.ability)?.lvl || 1;
    this.fx.burst(f.x, f.y, def.color, 18, 260); this.fx.ring(f.x, f.y, 60, def.color);
    const stolen = p.fromId && p.fromId !== f.id;
    if (stolen) f.steals++;
    if (f.isPlayer) {
      if (stolen) this.stats.steals++;
      this.stats.maxLvl = Math.max(this.stats.maxLvl, lvl);
      this.events({ type: 'steal', ability: def, lvl, upgraded, from: stolen ? p.from : null });
      this.sfxFn(upgraded ? 'upgrade' : 'steal', f.x, f.y, true);
    }
  }
  breakCrate(c, by) {
    if (c.dead) return; c.dead = true;
    this.fx.burst(c.x, c.y, '#c08552', 18, 260, { shape: 'sq', size: 7 }); this.fx.burst(c.x, c.y, '#ffe0a3', 8, 180);
    this.sfxFn('crate', c.x, c.y);
    if (by && by.isPlayer) this.stats.crates++;
    if (Math.random() < 0.72) {
      const wild = ABILITY_IDS.filter((id) => ABILITIES[id].wild), kit = ABILITY_IDS.filter((id) => !ABILITIES[id].wild);
      const id = chance(0.4) ? pick(wild) : pick(kit);
      this.dropOrb(c.x, c.y, id, 1, null);
    } else this.pickups.push({ kind: 'health', x: c.x, y: c.y, amt: 40, t: 0, id: this.uid++, vx: 0, vy: 0 });
  }
  cratesNear(x, y, r) { return queryObstacles(this.world, x - r, y - r, x + r, y + r, []).filter((o) => o.crate && !o.dead && dist2(x, y, o.x, o.y) < (r + o.r) ** 2); }

  // ---------------------------------------------------------------- projectiles
  spawnProjectile(o) {
    const p = { x: o.x, y: o.y, vx: Math.cos(o.angle) * o.speed, vy: Math.sin(o.angle) * o.speed, speed: o.speed, r: o.r || 6, dmg: o.dmg, owner: o.owner, travelled: 0, range: o.range, color: o.color, kind: o.kind,
      pierce: o.pierce || 0, bounce: o.bounce || 0, boomerang: o.boomerang, returning: false, burn: o.burn, slow: o.slow, onHit: o.onHit, onWall: o.onWall, tether: o.tether, glow: o.glow, hit: new Set(), sx: o.x, sy: o.y, dead: false };
    this.projectiles.push(p); return p;
  }
  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.boomerang && p.returning) {
        const o = p.owner; if (!o.alive) { p.dead = true; } else { const a = angTo(p.x, p.y, o.x, o.y); p.vx = Math.cos(a) * p.speed * 1.1; p.vy = Math.sin(a) * p.speed * 1.1; if (dist2(p.x, p.y, o.x, o.y) < (o.r + 10) ** 2) p.dead = true; }
      }
      if (!p.dead) this.stepProjectile(p, dt);
      if (p.dead) { this.projectiles[i] = this.projectiles[this.projectiles.length - 1]; this.projectiles.pop(); }
    }
  }
  stepProjectile(p, dt) {
    const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
    const stepLen = Math.hypot(nx - p.x, ny - p.y);
    // Walls / rocks / crates / temp walls
    let bestT = 2, hitObs = null, nrm = null;
    const x0 = Math.min(p.x, nx) - p.r, y0 = Math.min(p.y, ny) - p.r, x1 = Math.max(p.x, nx) + p.r, y1 = Math.max(p.y, ny) + p.r;
    for (const o of queryObstacles(this.world, x0, y0, x1, y1, tmp)) {
      let t;
      if (o.kind === 'rect') t = segRect(p.x, p.y, nx, ny, o.x - p.r * 0.5, o.y - p.r * 0.5, o.w + p.r, o.h + p.r);
      else t = segCircle(p.x, p.y, nx, ny, o.x, o.y, o.r + p.r * 0.5);
      if (t >= 0 && t < bestT) { bestT = t; hitObs = o; }
    }
    for (const w of this.tempWalls) { const t = segCircle(p.x, p.y, nx, ny, w.x, w.y, w.r + p.r * 0.5); if (t >= 0 && t < bestT) { bestT = t; hitObs = w; } }
    // Targets (fighters + deployables)
    let bestE = null, bestET = 2;
    for (const e of this.fighters) {
      if (!e.alive || e === p.owner || p.hit.has(e) || e.leap) continue;
      const t = segCircle(p.x, p.y, nx, ny, e.x, e.y, e.r + p.r); if (t >= 0 && t < bestET) { bestET = t; bestE = e; }
    }
    for (const d of this.deployables) {
      if (d.hp === undefined || d.owner === p.owner || p.hit.has(d) || d.dead) continue;
      const t = segCircle(p.x, p.y, nx, ny, d.x, d.y, d.r + p.r); if (t >= 0 && t < bestET) { bestET = t; bestE = d; }
    }
    // Fortress domes block enemy projectiles
    for (const f of this.fighters) {
      if (!f.alive || !f.st.fortress || f === p.owner) continue;
      const R = 135; const insideNow = dist2(p.x, p.y, f.x, f.y) < R * R; const insideNext = dist2(nx, ny, f.x, f.y) < R * R;
      if (!insideNow && insideNext) { p.dead = true; this.fx.burst(nx, ny, '#ffb703', 5, 120); return; }
    }
    if (bestE && bestET <= bestT) {
      const e = bestE; const hx = p.x + (nx - p.x) * bestET, hy = p.y + (ny - p.y) * bestET;
      if (e.isFighter && e.st.reflect && p.owner && p.owner !== e) { // Mirror Shell
        p.owner = e; p.vx = -p.vx; p.vy = -p.vy; p.travelled = 0; p.hit.clear(); p.hit.add(e); p.x = hx; p.y = hy; this.fx.ring(hx, hy, 30, '#cdb4db', 0.25); this.sfxFn('shield', hx, hy); return;
      }
      p.hit.add(e);
      this.damage(e, p.dmg, p.owner, { kind: p.kind });
      if (e.isFighter) {
        if (p.burn) this.status(e, 'burn', 1.6, 3, p.owner);
        if (p.slow) this.status(e, 'slow', 1, p.slow);
        if (p.onHit) p.onHit(e);
        if (p.kind === 'snipe' || p.kind === 'lance') this.knock(e, Math.atan2(p.vy, p.vx), 160);
      }
      this.fx.burst(hx, hy, p.color, 6, 160);
      if (p.pierce > 0) { p.pierce--; } else if (p.boomerang && !p.returning) { p.returning = true; p.hit.clear(); p.hit.add(e); }
      else { p.dead = true; return; }
    } else if (hitObs) {
      const hx = p.x + (nx - p.x) * bestT, hy = p.y + (ny - p.y) * bestT;
      if (hitObs.crate) this.damage(hitObs, p.dmg, p.owner);
      if (p.onWall && !hitObs.crate) { p.onWall(hx, hy); p.dead = true; return; }
      if (p.bounce > 0 && !hitObs.crate) {
        p.bounce--;
        if (hitObs.kind === 'rect') { const o = hitObs; const cx = clamp(hx, o.x, o.x + o.w), cy = clamp(hy, o.y, o.y + o.h); const dx = Math.abs(hx - cx), dy = Math.abs(hy - cy); if (dx > dy) p.vx = -p.vx; else p.vy = -p.vy; }
        else { const a = angTo(hitObs.x, hitObs.y, hx, hy); const nxv = Math.cos(a), nyv = Math.sin(a); const dot = p.vx * nxv + p.vy * nyv; p.vx -= 2 * dot * nxv; p.vy -= 2 * dot * nyv; }
        p.x = hx + p.vx * 0.002; p.y = hy + p.vy * 0.002; this.fx.burst(hx, hy, p.color, 4, 100); return;
      }
      if (p.boomerang && !p.returning) { p.returning = true; p.x = hx; p.y = hy; return; }
      this.fx.burst(hx, hy, p.color, 5, 110); p.dead = true; return;
    }
    p.x = nx; p.y = ny; p.travelled += stepLen;
    if (p.travelled >= p.range) {
      if (p.boomerang && !p.returning) { p.returning = true; p.hit.clear(); }
      else if (!p.boomerang) { p.dead = true; }
    }
    if (p.x < 0 || p.y < 0 || p.x > this.size || p.y > this.size) p.dead = true;
  }

  // ---------------------------------------------------------------- zones, lobs, deployables
  addZone(z) { z.t = 0; z.acc = z.acc || 0; z.tick = 0; z.max = z.life; this.zones.push(z); return z; }
  addTempWall(w) { w.max = w.life; this.tempWalls.push(w); for (const f of this.fighters) if (f.alive && dist2(f.x, f.y, w.x, w.y) < (f.r + w.r) ** 2) this.moveCircle(f, 0, 0); }
  addDeployable(d) { d.id = this.uid++; d.t = 0; d.max = d.life; d.fireCd = d.fireCd || 0; this.deployables.push(d); return d; }
  lob(owner, tx, ty, dur, color, onLand) { this.lobs.push({ sx: owner.x, sy: owner.y, tx, ty, t: 0, dur, color, onLand }); }
  inConcealZone(x, y) { for (const z of this.zones) if (z.conceal && dist2(x, y, z.x, z.y) < z.r * z.r) return true; return false; }
  updateZones(dt) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i]; z.t += dt; z.life -= dt;
      if (z.follow) { if (!z.follow.alive) z.life = 0; z.x = z.follow.x; z.y = z.follow.y; }
      if (z.onTick && z.tickEvery) { z.tick += dt; while (z.tick >= z.tickEvery) { z.tick -= z.tickEvery; z.onTick(z, this); } }
      if (z.kind === 'fire' && Math.random() < 0.3) this.fx.puff(z.x + rand(-z.r, z.r) * 0.6, z.y + rand(-z.r, z.r) * 0.6, pick(['#ff6b35', '#ffd23f', '#ff9f1c']), 6, 0.5);
      if (z.life <= 0) { this.zones.splice(i, 1); z.onEnd && z.onEnd(z); }
    }
  }
  updateLobs(dt) {
    for (let i = this.lobs.length - 1; i >= 0; i--) { const l = this.lobs[i]; l.t += dt; if (l.t >= l.dur) { this.lobs.splice(i, 1); l.onLand(); } }
  }
  updateDeployables(dt) {
    for (let i = this.deployables.length - 1; i >= 0; i--) {
      const d = this.deployables[i]; d.t += dt; d.life -= dt; if (d.hitFlash > 0) d.hitFlash -= dt;
      if (!d.owner.alive && d.type !== 'mine') d.life = Math.min(d.life, 0);
      if (d.dead) { this.deployables.splice(i, 1); continue; }
      if (d.life <= 0) { this.destroyDeployable(d, true); this.deployables.splice(i, 1); continue; }
      if (d.type === 'turret' || d.type === 'clone') {
        d.fireCd -= dt;
        const tgt = this.nearestEnemyTo(d.x, d.y, d.type === 'clone' ? 520 : d.range, d.owner, d.owner, true);
        if (d.type === 'clone') {
          let mx = 0, my = 0;
          if (tgt) { const a = angTo(d.x, d.y, tgt.x, tgt.y); d.angle = a; const dd = dist(d.x, d.y, tgt.x, tgt.y); if (dd > 260) { mx = Math.cos(a); my = Math.sin(a); } else { mx = Math.cos(a + Math.PI / 2) * (d.id % 2 ? 1 : -1); my = Math.sin(a + Math.PI / 2) * (d.id % 2 ? 1 : -1); } }
          else { const o = d.owner; const a = angTo(d.x, d.y, o.x, o.y); if (dist(d.x, d.y, o.x, o.y) > 120) { mx = Math.cos(a); my = Math.sin(a); } }
          this.moveCircle(d, mx * 250 * dt, my * 250 * dt); d.moving = !!(mx || my); d.walkT = (d.walkT || 0) + dt * 6;
          if (tgt && d.fireCd <= 0) { const w = d.hero.weapon; d.fireCd = Math.max(0.35, w.rate * 1.3); this.spawnProjectile({ owner: d.owner, x: d.x, y: d.y, angle: d.angle + rand(-0.1, 0.1), speed: w.speed, range: w.range, r: w.r, dmg: w.dmg * w.count * 0.45, color: PROJ_COLORS[w.kind], kind: w.kind }); }
        } else if (tgt && d.fireCd <= 0) {
          d.angle = angTo(d.x, d.y, tgt.x, tgt.y); d.fireCd = d.rate;
          this.spawnProjectile({ owner: d.owner, x: d.x, y: d.y, angle: d.angle + rand(-0.06, 0.06), speed: 950, range: d.range + 40, r: 5, dmg: d.dmg, color: '#ffbe0b', kind: 'bullet' });
          this.sfxFn('shoot_bullet', d.x, d.y);
        }
      } else if (d.type === 'decoy') {
        this.moveCircle(d, Math.cos(d.angle) * 280 * dt, Math.sin(d.angle) * 280 * dt); d.moving = true; d.walkT = (d.walkT || 0) + dt * 7;
      } else if (d.type === 'mine') {
        if (d.t > d.arm) for (const e of this.fighters) if (e.alive && e !== d.owner && dist2(e.x, e.y, d.x, d.y) < (e.r + d.r + 10) ** 2) { d.dead = true; this.explode(d.x, d.y, 100, d.dmg, d.owner, '#e63946'); break; }
      }
    }
  }
  destroyDeployable(d, expired) {
    if (d.dead) return; d.dead = true;
    this.fx.burst(d.x, d.y, d.hero ? d.hero.color : '#ffbe0b', 12, 200);
    if (d.onDeath && !expired) d.onDeath(d);
  }

  // ---------------------------------------------------------------- queries
  targetsNear(x, y, r, owner) {
    const out = [];
    for (const e of this.fighters) if (e.alive && e !== owner && !e.leap && dist2(x, y, e.x, e.y) < (r + e.r) ** 2) out.push(e);
    for (const d of this.deployables) if (d.hp !== undefined && !d.dead && d.owner !== owner && dist2(x, y, d.x, d.y) < (r + d.r) ** 2) out.push(d);
    return out;
  }
  enemiesInRadius(x, y, r, owner) { return this.targetsNear(x, y, r, owner); }
  // Is target visible to observer? (bushes, invis, reveal)
  canSee(obs, t) {
    if (!t.isFighter) return true;
    if (obs && obs.st && obs.st.reveal) return true;
    const d2 = obs ? dist2(obs.x, obs.y, t.x, t.y) : Infinity;
    if (t.st.invis) return d2 < 85 * 85;
    if (t.inBush && t.revealT <= 0) { if (obs && obs.bush && t.bush && dist2(obs.bush.x, obs.bush.y, t.bush.x, t.bush.y) < 160 * 160) return true; return d2 < 150 * 150; }
    return true;
  }
  canSeeFromPlayer(t) { const p = this.player; if (t === p) return true; if (!p.alive) return !t.st.invis && !(t.inBush && t.revealT <= 0); return this.canSee(p, t); }
  nearestEnemyTo(x, y, range, owner, observer, needLos) {
    let best = null, bd = range * range;
    for (const e of this.fighters) { if (!e.alive || e === owner || e.st.spawn) continue; const d = dist2(x, y, e.x, e.y); if (d < bd && (!observer || this.canSee(observer, e)) && (!needLos || !this.losBlocked(x, y, e.x, e.y))) { bd = d; best = e; } }
    for (const dpl of this.deployables) { if (!dpl.lure || dpl.dead || dpl.owner === owner) continue; const d = dist2(x, y, dpl.x, dpl.y); if (d < bd && (!needLos || !this.losBlocked(x, y, dpl.x, dpl.y))) { bd = d; best = dpl; } }
    return best;
  }
  losBlocked(x1, y1, x2, y2) {
    for (const o of queryObstacles(this.world, Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2), tmp)) {
      const t = o.kind === 'rect' ? segRect(x1, y1, x2, y2, o.x, o.y, o.w, o.h) : segCircle(x1, y1, x2, y2, o.x, o.y, o.r * 0.9);
      if (t >= 0 && t <= 1) return true;
    }
    for (const w of this.tempWalls) { const t = segCircle(x1, y1, x2, y2, w.x, w.y, w.r); if (t >= 0) return true; }
    return false;
  }
  sfx(name, x, y) { this.sfxFn(name, x, y); }

  finish() {
    this.over = true;
    const p = this.player;
    if (p.alive) p.place = 1;
    const killer = p.killer;
    const res = { place: p.place, total: this.total, won: p.place === 1, hero: p.hero.id, kills: this.stats.kills, damage: Math.round(this.stats.damage), steals: this.stats.steals, maxLvl: this.stats.maxLvl, ults: this.stats.ults, crates: this.stats.crates, time: Math.round(this.time),
      killerName: killer ? killer.name : (p.alive ? null : 'The Storm'), killerHero: killer ? killer.hero.id : null, build: p.abilities.map((a) => ({ id: a.id, lvl: a.lvl })) };
    this.o.onEnd && this.o.onEnd(res);
  }
}
export { ABILITIES };
