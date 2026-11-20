// HORDEMIND simulation + renderer. You are the swarm; the hero is the boss.
import { TAU, clamp, lerp, dist, dist2, angTo, angDiff, rand, randi, pick, chance, shuffle } from './util.js';
import { SPECIES, QUEEN, HERO, DIFFS, EVOLUTIONS, EVO, LEVEL_TIME, MAX_LEVEL, ENRAGE_AFTER, PALETTES, QUEEN_SKINS } from './data.js';
import { FX } from './fx.js';

const ARENA = 1300;
const SPECIES_ORDER = ['drone', 'spitter', 'bomber', 'brute', 'leech', 'swarmling'];
const GOLD = 2.399963; // golden angle for formations

export class Hunt {
  constructor(o) {
    this.o = o; this.sfx = o.sfx || (() => {}); this.ev = o.events || (() => {});
    this.fx = new FX(); this.fx.lowFx = !!o.lowFx;
    this.time = 0; this.over = false; this.result = null; this.slowmo = 1; this.endT = -1; this.choosing = null; this.uid = 1;
    const q = QUEEN[o.queenId]; const h = HERO[o.heroId]; const d = DIFFS[o.diff || 0]; const hv = o.hive || {};
    this.queenDef = q; this.heroDef = h; this.diff = d;
    const mut = o.mutator || {};
    this.mods = { dmg: 1 + 0.05 * (hv.forge || 0), hp: 1 + 0.06 * (hv.chitin || 0), spawn: 1, cap: 70, speed: 1, harvest: 1, magnet: 70, cd: 1, flags: {} };
    if (mut.minionHp) this.mods.hp *= mut.minionHp; if (mut.minionDmg) this.mods.dmg *= mut.minionDmg; if (mut.harvest) this.mods.harvest *= mut.harvest;
    this.brood = q.brood.slice(); this.spawnIdx = 0;
    this.rerolls = hv.pit || 0;
    this.queen = { x: 0, y: 380, r: 20, hp: 100 + 10 * (hv.royal || 0), maxHp: 100 + 10 * (hv.royal || 0), cd: 3, rootT: 0, hitT: 0, walk: 0, skin: QUEEN_SKINS.find((s) => s.id === o.queenSkin) || QUEEN_SKINS[0] };
    const hpm = d.hp * (mut.heroHp || 1);
    this.hero = { x: 0, y: -300, r: 34, hp: h.hp * hpm, maxHp: h.hp * hpm, baseMax: h.hp * hpm, level: 1, levelT: 0, dmgM: d.dmg, speed: h.speed * (mut.heroSpeed || 1), basicT: 1.5, cds: h.abilities.map((a) => a.cd * rand(0.35, 0.7)), cast: null, aim: Math.PI / 2, shieldT: 0, hasteT: 0, poison: 0, poisonT: 0, hitT: 0, enraged: false, walk: 0, dashT: 0 };
    this.minions = []; this.orbs = []; this.tele = []; this.projs = []; this.zones = []; this.turrets = []; this.skels = []; this.splats = [];
    this.biomass = 40 + 15 * (hv.vats || 0); this.spawnT = 0;
    this.stats = { damage: 0, spawned: 0, evos: 0, abilities: 0, maxSwarm: 0, lost: 0 };
    this.nextEvo = this.hero.baseMax * 0.12; this.dmgAcc = 0; this.dmgTextT = 0;
    this.palette = PALETTES.find((p) => p.id === o.palette) || PALETTES[0];
    this.decor = []; for (let i = 0; i < 260; i++) { const a = rand(TAU), r = Math.sqrt(Math.random()) * ARENA; this.decor.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, k: randi(0, 3), s: rand(0.6, 1.4), ph: rand(TAU) }); }
    const start = 14 + 3 * (hv.brood || 0);
    for (let i = 0; i < start; i++) this.spawn(this.brood[i % this.brood.length], true);
    this.swarmC = { x: this.queen.x, y: this.queen.y, n: 0 };
  }
  color(sp) { const t = this.palette.tint; if (!t) return SPECIES[sp].color; return t[SPECIES_ORDER.indexOf(sp) % t.length]; }

  // ------------------------------------------------------------------ update
  update(dt) {
    if (this.choosing || this.over) { this.fx.update(dt * 0.3); return; }
    dt *= this.slowmo; this.time += dt;
    const I = this.o.intent ? this.o.intent(this) : { mx: 0, my: 0, charge: false, ability: false };
    this.updateQueen(dt, I);
    this.updateSpawning(dt);
    this.updateCentroid();
    this.updateHero(dt);
    this.updateMinions(dt, I.charge);
    this.updateTele(dt);
    this.updateProjs(dt);
    this.updateZones(dt);
    this.updateOrbs(dt);
    for (let i = this.splats.length - 1; i >= 0; i--) { this.splats[i].t -= dt; if (this.splats[i].t <= 0) this.splats.splice(i, 1); }
    this.fx.update(dt);
    this.stats.maxSwarm = Math.max(this.stats.maxSwarm, this.minions.length);
    if (this.dmgTextT > 0) this.dmgTextT -= dt; else if (this.dmgAcc > 0) { this.fx.text(this.hero.x + rand(-30, 30), this.hero.y - 50, Math.round(this.dmgAcc), '#fff', 16 + Math.min(14, this.dmgAcc / 6)); this.dmgAcc = 0; this.dmgTextT = 0.25; }
    if (this.endT >= 0) { this.endT -= dt / Math.max(0.2, this.slowmo); this.slowmo = lerp(this.slowmo, 1, 0.03); if (this.endT < 0) this.finish(); }
  }
  updateQueen(dt, I) {
    const q = this.queen; if (q.hp <= 0) return;
    q.rootT = Math.max(0, q.rootT - dt); q.hitT = Math.max(0, q.hitT - dt); q.cd = Math.max(0, q.cd - dt);
    let mx = I.mx, my = I.my; const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
    if (q.rootT > 0) { mx = my = 0; }
    q.x += mx * 255 * dt; q.y += my * 255 * dt; q.moving = l > 0.1; if (q.moving) { q.walk += dt * 10; q.face = Math.atan2(my, mx); }
    const r = Math.hypot(q.x, q.y); if (r > ARENA - q.r) { q.x *= (ARENA - q.r) / r; q.y *= (ARENA - q.r) / r; }
    if (I.ability && q.cd <= 0) this.useAbility();
  }
  useAbility() {
    const q = this.queen, a = this.queenDef.ability; q.cd = a.cd * this.mods.cd; this.stats.abilities++;
    this.fx.ring(q.x, q.y, 120, this.queenDef.color); this.sfx('ability');
    switch (a.id) {
      case 'frenzy': this.frenzyT = 5; this.ev({ type: 'announce', text: '💢 FRENZY!' }); break;
      case 'burst': for (let i = 0; i < 14; i++) this.spawn('swarmling', true); this.ev({ type: 'announce', text: '🥚 BURST BROOD!' }); break;
      case 'devour': for (const o of this.orbs) o.pull = true; q.hp = Math.min(q.maxHp, q.hp + 30); this.ev({ type: 'announce', text: '👄 DEVOUR!' }); break;
      case 'phase': this.phaseT = 2.5; this.ev({ type: 'announce', text: '🌫️ PHASE VEIL!' }); break;
      case 'acid': this.zones.push({ kind: 'acidrain', x: this.hero.x, y: this.hero.y, r: 120, t: 4, follow: true, tick: 0 }); this.ev({ type: 'announce', text: '☔ ACID RAIN!' }); break;
    }
  }
  updateSpawning(dt) {
    if (this.frenzyT > 0) this.frenzyT -= dt; if (this.phaseT > 0) this.phaseT -= dt;
    this.biomass += (5 + 0.6 * (this.o.hive?.vats || 0)) * dt; // the hive always feeds you
    this.spawnT -= dt; if (this.spawnT > 0) return;
    const cap = this.mods.cap;
    if (this.minions.length >= cap) { this.spawnT = 0.1; return; }
    const sp = this.brood[this.spawnIdx % this.brood.length]; const cost = SPECIES[sp].cost;
    if (this.biomass < cost) { this.spawnT = 0.1; return; }
    this.biomass -= cost; this.spawnIdx++;
    const n = sp === 'swarmling' ? 3 : 1; for (let i = 0; i < n; i++) this.spawn(sp);
    this.spawnT = 0.2 / this.mods.spawn;
  }
  spawn(sp, free) {
    const S = SPECIES[sp]; const q = this.queen; const a = rand(TAU);
    const m = { id: this.uid++, sp, x: q.x + Math.cos(a) * 18, y: q.y + Math.sin(a) * 18, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, hp: S.hp * this.mods.hp, maxHp: S.hp * this.mods.hp, r: S.r, atk: rand(0.3), slot: this.uid, frozen: 0, slow: 0, phase: rand(TAU), color: this.color(sp) };
    this.minions.push(m); this.stats.spawned++;
    if (!free) this.fx.burst(m.x, m.y, '#d9ed92', 3, 80);
  }
  updateCentroid() {
    let sx = 0, sy = 0, n = 0; const h = this.hero;
    for (const m of this.minions) { if (dist2(m.x, m.y, h.x, h.y) < 900 * 900) { sx += m.x; sy += m.y; n++; } }
    this.swarmC = n ? { x: sx / n, y: sy / n, n } : { x: this.queen.x, y: this.queen.y, n: 0 };
  }

  // ------------------------------------------------------------------ minions
  updateMinions(dt, charge) {
    const h = this.hero, q = this.queen, M = this.mods;
    // spatial hash for separation
    const cell = 32, grid = new Map();
    for (const m of this.minions) { const k = ((m.x / cell) | 0) * 7919 + ((m.y / cell) | 0); let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(m); }
    const fr = this.frenzyT > 0 ? 1.7 : 1;
    const heroAlive = h.hp > 0;
    for (let i = this.minions.length - 1; i >= 0; i--) {
      const m = this.minions[i]; const S = SPECIES[m.sp];
      if (m.frozen > 0) { m.frozen -= dt; continue; }
      if (m.slow > 0) m.slow -= dt;
      m.atk -= dt * fr;
      const dh = dist(m.x, m.y, h.x, h.y);
      // pick target: skeleton nearby > hero (if charging or close) > formation
      let tx, ty, attacking = false, skel = null;
      if (this.skels.length) { for (const s of this.skels) { if (dist2(m.x, m.y, s.x, s.y) < 90 * 90) { skel = s; break; } } }
      if (!skel && this.turrets.length) { for (const s of this.turrets) { if (dist2(m.x, m.y, s.x, s.y) < 130 * 130) { skel = s; break; } } }
      if (skel) { tx = skel.x; ty = skel.y; }
      else if (heroAlive && (charge || dh < 150 + (S.range || 0))) {
        attacking = true;
        const ang = angTo(h.x, h.y, m.x, m.y) + Math.sin(m.slot) * 0.3;
        const want = S.range ? S.range * 0.85 : h.r + m.r + 2;
        tx = h.x + Math.cos(ang) * want; ty = h.y + Math.sin(ang) * want;
        if (m.sp === 'bomber') { tx = h.x; ty = h.y; }
      } else {
        const k = (m.slot % 140); const ang = k * GOLD; const rad = 34 + Math.sqrt(k) * 13;
        tx = q.x + Math.cos(ang) * rad; ty = q.y + Math.sin(ang) * rad;
      }
      let sp = S.speed * M.speed * (m.slow > 0 ? 0.5 : 1);
      let dx = tx - m.x, dy = ty - m.y; const dl = Math.hypot(dx, dy) || 1;
      const arrive = Math.min(1, dl / 40);
      let ax = (dx / dl) * sp * arrive, ay = (dy / dl) * sp * arrive;
      // separation
      const gx = (m.x / cell) | 0, gy = (m.y / cell) | 0;
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) { const a = grid.get((gx + ox) * 7919 + gy + oy); if (!a) continue; for (const o of a) { if (o === m) continue; const ddx = m.x - o.x, ddy = m.y - o.y; const d2 = ddx * ddx + ddy * ddy; const rr = m.r + o.r; if (d2 < rr * rr && d2 > 0.01) { const d = Math.sqrt(d2); const push = (rr - d) / rr; ax += (ddx / d) * push * 260; ay += (ddy / d) * push * 260; } } }
      // keep out of hero body
      if (dh < h.r + m.r && dh > 0.1) { ax += ((m.x - h.x) / dh) * 300; ay += ((m.y - h.y) / dh) * 300; }
      m.vx = lerp(m.vx, ax, Math.min(1, dt * 10)); m.vy = lerp(m.vy, ay, Math.min(1, dt * 10));
      m.x += m.vx * dt; m.y += m.vy * dt; m.phase += dt * Math.hypot(m.vx, m.vy) / 6;
      const rr = Math.hypot(m.x, m.y); if (rr > ARENA - m.r) { m.x *= (ARENA - m.r) / rr; m.y *= (ARENA - m.r) / rr; }
      // attacks
      if (skel && m.atk <= 0 && dist(m.x, m.y, skel.x, skel.y) < skel.r + m.r + 6) { m.atk = Math.max(0.3, S.rate || 0.6); skel.hp -= S.dmg * M.dmg * 2; if (m.sp === 'bomber') { this.killMinion(m, i, true); continue; } }
      else if (attacking && heroAlive) {
        if (m.sp === 'bomber') { if (dh < h.r + m.r + 6) { this.explodeAt(m.x, m.y, S.bomb, S.dmg * M.dmg); this.killMinion(m, i, true); continue; } }
        else if (S.range) { if (dh < S.range && m.atk <= 0) { m.atk = S.rate; this.projs.push({ x: m.x, y: m.y, tx: h, sp: 520, dmg: S.dmg * M.dmg, color: m.color, kind: 'glob' }); } }
        else if (dh < h.r + m.r + 8 && m.atk <= 0) {
          m.atk = S.rate; this.hitHero(S.dmg * M.dmg);
          if (S.heal) { q.hp = Math.min(q.maxHp, q.hp + S.heal); }
          if (M.flags.venom) { h.poison = Math.min(40, h.poison + 0.15); }
          if (Math.random() < 0.15) this.fx.burst(h.x + (m.x - h.x) * 0.6, h.y + (m.y - h.y) * 0.6, '#fff', 2, 90);
        }
      }
    }
  }
  explodeAt(x, y, r, dmg) {
    this.fx.burst(x, y, '#ff6b6b', 12, 260); this.fx.ring(x, y, r, '#ffb703', 0.3);
    if (dist(x, y, this.hero.x, this.hero.y) < r + this.hero.r) this.hitHero(dmg);
    for (const s of this.skels) if (dist(x, y, s.x, s.y) < r + s.r) s.hp -= dmg;
    for (const s of this.turrets) if (dist(x, y, s.x, s.y) < r + s.r) s.hp -= dmg;
    this.sfx('pop');
  }
  killMinion(m, i, silent) {
    this.minions.splice(i, 1); this.stats.lost++;
    const S = SPECIES[m.sp], M = this.mods;
    this.orbs.push({ x: m.x + rand(-6, 6), y: m.y + rand(-6, 6), v: S.cost * 0.6 * M.harvest, t: 14 });
    this.splat(m.x, m.y, m.color, m.r);
    if (M.flags.acid && chance(0.5)) this.zones.push({ kind: 'acid', x: m.x, y: m.y, r: 26, t: 3, tick: 0 });
    if (M.flags.volatile && chance(0.2) && m.sp !== 'bomber') this.explodeAt(m.x, m.y, 50, 10 * M.dmg);
    if (M.flags.split && (m.sp === 'drone' || m.sp === 'brute')) { const n = m.sp === 'brute' ? 4 : 2; for (let k = 0; k < n; k++) { const s = SPECIES.swarmling; this.minions.push({ id: this.uid++, sp: 'swarmling', x: m.x + rand(-8, 8), y: m.y + rand(-8, 8), vx: 0, vy: 0, hp: s.hp * M.hp, maxHp: s.hp * M.hp, r: s.r, atk: 0.2, slot: this.uid, frozen: 0, slow: 0, phase: 0, color: this.color('swarmling') }); } }
    if (!silent && Math.random() < 0.3) this.sfx('squish');
  }
  splat(x, y, c, r) {
    if (this.splats.length > 220) this.splats.shift();
    const kind = this.o.splat || 'goo';
    this.splats.push({ x, y, c, r: r * rand(1.1, 1.8), t: 7, max: 7, rot: rand(TAU) });
    if (kind === 'confetti') this.fx.burst(x, y, `hsl(${rand(360)},90%,60%)`, 4, 160, { shape: 'sq' });
    else if (kind === 'hearts') this.fx.burst(x, y, '#ff4d6d', 1, 60, { glyph: '❤', life: 0.8 });
    else if (kind === 'stars') this.fx.burst(x, y, '#e0aaff', 2, 90, { glyph: '✦', life: 0.7 });
    else this.fx.burst(x, y, c, 4, 110);
  }
  hitHero(dmg) {
    const h = this.hero; if (h.hp <= 0) return;
    if (h.shieldT > 0) dmg *= 0.3;
    h.hp -= dmg; h.hitT = 0.08; this.stats.damage += dmg; this.dmgAcc += dmg;
    this.biomass += (dmg / 6) * this.mods.harvest;
    if (this.stats.damage >= this.nextEvo && h.hp > 0) { this.nextEvo += h.baseMax * 0.13; this.offerEvolution(); }
    if (h.hp <= 0) this.heroDown();
  }
  heroDown() {
    const h = this.hero; h.hp = 0; this.tele.length = 0;
    this.slowmo = 0.2; this.endT = 2.6; this.result = { won: true };
    this.fx.burst(h.x, h.y, h.color || '#fff', 60, 500); this.fx.ring(h.x, h.y, 260, '#ffd60a', 1); this.fx.flash('#fff', 0.5); this.fx.shake(24);
    this.ev({ type: 'win' }); this.sfx('win');
  }
  hurtQueen(dmg) {
    const q = this.queen; if (q.hp <= 0 || this.phaseT > 0) return;
    if (this.mods.flags.carapace) dmg *= 0.7;
    q.hp -= dmg; q.hitT = 0.15; this.fx.text(q.x, q.y - 30, '-' + Math.round(dmg), '#ff4d6d', 18); this.fx.shake(8); this.ev({ type: 'hurt' }); this.sfx('queenhit');
    if (q.hp <= 0) { q.hp = 0; this.slowmo = 0.25; this.endT = 2.2; this.result = { won: false }; this.fx.burst(q.x, q.y, this.queenDef.color, 50, 400); this.ev({ type: 'lose' }); this.sfx('lose'); }
  }

  // ------------------------------------------------------------------ evolutions
  offerEvolution() {
    const opts = this.rollEvo();
    if (!opts.length) return;
    this.choosing = opts; this.ev({ type: 'evolve', opts }); this.sfx('evolve');
  }
  rollEvo() {
    const taken = this.taken || (this.taken = {});
    const pool = EVOLUTIONS.filter((e) => (e.kind === 'species' ? !this.brood.includes(e.sp) && this.brood.length < 4 : e.stack || !taken[e.id]));
    const sp = shuffle(pool.filter((e) => e.kind === 'species')); const other = shuffle(pool.filter((e) => e.kind !== 'species'));
    const out = []; if (sp.length && chance(0.75)) out.push(sp[0]);
    while (out.length < 3 && other.length) out.push(other.shift());
    return shuffle(out);
  }
  reroll() { if (this.rerolls <= 0 || !this.choosing) return false; this.rerolls--; this.choosing = this.rollEvo(); return true; }
  choose(id) {
    const e = EVO[id]; if (!e || !this.choosing) return; const M = this.mods;
    (this.taken || (this.taken = {}))[id] = (this.taken[id] || 0) + 1; this.stats.evos++;
    if (e.kind === 'species') this.brood.push(e.sp);
    else switch (id) {
      case 'dmg': M.dmg *= 1.25; break;
      case 'hp': M.hp *= 1.35; for (const m of this.minions) { m.hp *= 1.35; m.maxHp *= 1.35; } break;
      case 'spawn': M.spawn *= 1.4; M.cap += 15; break;
      case 'speed': M.speed *= 1.2; break;
      case 'jelly': this.queen.maxHp += 40; this.queen.hp = this.queen.maxHp; break;
      case 'harvest': M.harvest *= 1.5; M.magnet += 70; break;
      case 'cooldown': M.cd *= 0.65; break;
      default: M.flags[id] = true;
    }
    this.choosing = null; this.sfx('pick');
    this.fx.ring(this.queen.x, this.queen.y, 160, '#d9ed92', 0.6);
  }

  // ------------------------------------------------------------------ hero AI
  updateHero(dt) {
    const h = this.hero, q = this.queen, H = this.heroDef; if (h.hp <= 0) return;
    h.hitT = Math.max(0, h.hitT - dt); h.shieldT = Math.max(0, h.shieldT - dt); h.hasteT = Math.max(0, h.hasteT - dt);
    // level up / enrage — the clock that pressures you
    h.levelT += dt;
    if (h.level < MAX_LEVEL && h.levelT >= LEVEL_TIME) { h.levelT = 0; h.level++; h.maxHp *= 1.07; h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.06); h.dmgM *= 1.1; h.speed *= 1.03; this.fx.ring(h.x, h.y, 140, '#ffd60a'); this.ev({ type: 'herolevel', level: h.level, ability: H.abilities.find((a) => a.lvl === h.level) }); this.sfx('herolevel'); }
    if (h.level >= MAX_LEVEL && !h.enraged && h.levelT >= ENRAGE_AFTER) { h.enraged = true; h.dmgM *= 2; h.speed *= 1.25; this.ev({ type: 'enrage' }); this.sfx('enrage'); this.fx.flash('#ff0033', 0.3); }
    // poison ticks
    if (h.poison > 0) { h.poisonT -= dt; if (h.poisonT <= 0) { h.poisonT = 0.5; this.hitHero(h.poison * 3); } h.poison = Math.max(0, h.poison - dt * 0.4); }
    const sm = h.hasteT > 0 ? 1.5 : 1, cdm = this.diff.cd * (h.enraged ? 0.6 : 1) / sm;
    // dash motion
    if (h.dash) { const d = h.dash; const st = Math.min(d.left, 1400 * dt); h.x += Math.cos(d.a) * st; h.y += Math.sin(d.a) * st; d.left -= st; this.fx.puff(h.x, h.y, H.color, 8, 0.3); if (d.left <= 0) h.dash = null; this.clampHero(); return; }
    if (h.cast) { h.cast -= dt; if (h.cast <= 0) h.cast = null; }
    // movement: hunt the queen but get pulled toward big swarms
    const dq = dist(h.x, h.y, q.x, q.y);
    let tx = q.x, ty = q.y;
    if (this.swarmC.n > 25 && dq > 450) { tx = this.swarmC.x; ty = this.swarmC.y; }
    const dd = dist(h.x, h.y, tx, ty); const a = angTo(h.x, h.y, tx, ty);
    if (!h.cast) {
      let mv = 0; if (dd > H.prefer + 30) mv = 1; else if (dd < H.prefer - 60) mv = -0.7;
      const slowed = this.zones.some((z) => z.kind === 'acidrain' && dist(z.x, z.y, h.x, h.y) < z.r) ? 0.75 : 1;
      h.x += Math.cos(a) * h.speed * mv * sm * slowed * dt; h.y += Math.sin(a) * h.speed * mv * sm * slowed * dt; h.moving = mv !== 0; if (h.moving) h.walk += dt * 8;
      h.aim = a;
    }
    this.clampHero();
    // abilities
    for (let i = 0; i < H.abilities.length; i++) h.cds[i] -= dt;
    if (!h.cast) {
      for (let i = 0; i < H.abilities.length; i++) {
        const ab = H.abilities[i]; if (h.level < ab.lvl || h.cds[i] > 0) continue;
        if (!this.wantCast(ab)) continue;
        h.cds[i] = ab.cd * cdm * rand(0.9, 1.15); this.castAbility(ab); return;
      }
      h.basicT -= dt * sm;
      if (h.basicT <= 0) {
        const b = H.basic; const near = this.nearestTarget(h, (b.r || b.len) + 30);
        if (near) { h.basicT = b.rate * (h.enraged ? 0.7 : 1); this.castAbility({ ...b, name: null, basic: true, target: b.target || 'near', at: near }); }
        else h.basicT = 0.2;
      }
    }
  }
  clampHero() { const h = this.hero; const r = Math.hypot(h.x, h.y); if (r > ARENA - h.r) { h.x *= (ARENA - h.r) / r; h.y *= (ARENA - h.r) / r; } }
  nearestTarget(h, range) {
    let best = null, bd = range * range; const q = this.queen;
    const dq = dist2(h.x, h.y, q.x, q.y); if (dq < bd) { bd = dq; best = q; }
    for (const m of this.minions) { const d = dist2(h.x, h.y, m.x, m.y); if (d < bd * 0.8) { bd = d; best = m; } }
    return best;
  }
  wantCast(ab) {
    const h = this.hero, q = this.queen;
    if (ab.special === 'shield') return h.hp < h.maxHp * 0.9 && this.swarmC.n > 10;
    if (ab.special === 'turret' || ab.special === 'haste') return true;
    if (ab.special === 'raise') return this.orbs.length >= 3;
    if (ab.special === 'blink' || ab.special === 'roll') return this.minionsNear(h.x, h.y, 120) > 8;
    if (ab.target === 'self') return this.minionsNear(h.x, h.y, (ab.r || 150) + 20) >= 6 || dist(h.x, h.y, q.x, q.y) < (ab.r || 150);
    if (ab.target === 'queen') return dist(h.x, h.y, q.x, q.y) < (ab.len || 600) + 100;
    return this.swarmC.n >= 5 && dist(h.x, h.y, this.swarmC.x, this.swarmC.y) < (ab.len || ab.r || 300) + 300;
  }
  minionsNear(x, y, r) { let n = 0; const r2 = r * r; for (const m of this.minions) if (dist2(x, y, m.x, m.y) < r2) n++; return n; }
  castAbility(ab) {
    const h = this.hero, q = this.queen;
    if (ab.name && !ab.basic) this.ev({ type: 'herocast', name: ab.name });
    // instant specials
    if (ab.special === 'shield') { h.shieldT = 3.5; this.fx.ring(h.x, h.y, 70, '#fff3b0'); this.sfx('shield'); return; }
    if (ab.special === 'haste') { h.hasteT = 5; this.fx.ring(h.x, h.y, 90, '#ffbe0b'); return; }
    if (ab.special === 'blink' || ab.special === 'roll') { const a = angTo(this.swarmC.x, this.swarmC.y, h.x, h.y) + rand(-0.6, 0.6); const d = ab.special === 'blink' ? 380 : 230; this.fx.burst(h.x, h.y, this.heroDef.color, 16, 220); if (ab.special === 'blink') { h.x += Math.cos(a) * d; h.y += Math.sin(a) * d; } else h.dash = { a, left: d }; this.clampHero(); this.fx.burst(h.x, h.y, this.heroDef.color, 16, 220); this.sfx('blink'); return; }
    if (ab.special === 'turret') { const a = rand(TAU); this.turrets.push({ x: h.x + Math.cos(a) * 70, y: h.y + Math.sin(a) * 70, t: 9, fire: 0.5, a: 0, r: 16, hp: 60 * this.diff.hp, maxHp: 60 * this.diff.hp }); this.sfx('turret'); return; }
    if (ab.special === 'raise') { let n = 0; for (let i = this.orbs.length - 1; i >= 0 && n < 7; i--) { const o = this.orbs[i]; if (dist(o.x, o.y, h.x, h.y) > 700) continue; this.skels.push({ x: o.x, y: o.y, r: 11, hp: 18 * this.diff.hp, atk: 0.5, walk: 0 }); this.fx.burst(o.x, o.y, '#b8f2e6', 10, 150); this.orbs.splice(i, 1); n++; } this.sfx('raise'); return; }
    // telegraphed shape
    let tx, ty;
    if (ab.target === 'near' && ab.at) { tx = ab.at.x; ty = ab.at.y; }
    else if (ab.target === 'queen') { const lead = (ab.delay || 0.5) * 0.5; tx = q.x + (q.moving ? Math.cos(q.face || 0) * 255 * lead : 0); ty = q.y + (q.moving ? Math.sin(q.face || 0) * 255 * lead : 0); }
    else if (ab.target === 'self') { tx = h.x; ty = h.y; }
    else { tx = this.swarmC.x; ty = this.swarmC.y; }
    const a = angTo(h.x, h.y, tx, ty); h.aim = a;
    const n = ab.multi || 1;
    for (let k = 0; k < n; k++) {
      const t = { shape: ab.shape, dmg: ab.dmg * h.dmgM, delay: ab.delay * (h.enraged ? 0.8 : 1) * (ab.basic ? 1 : 1), t: 0, special: ab.special, r: ab.r, arc: ab.arc, len: ab.len, w: ab.w, basic: ab.basic };
      if (ab.shape === 'circle') {
        if (ab.target === 'self') { t.x = h.x; t.y = h.y; t.follow = true; }
        else { const sp = n > 1 ? ab.spread || 180 : 0; t.x = tx + rand(-sp, sp); t.y = ty + rand(-sp, sp); }
      } else if (ab.shape === 'ring') { t.x = ab.target === 'self' ? h.x : tx; t.y = ab.target === 'self' ? h.y : ty; t.follow = ab.target === 'self'; }
      else { // cone / line from hero
        t.x = h.x; t.y = h.y; t.follow = ab.shape === 'cone';
        t.a = a + (ab.fan ? (k - (n - 1) / 2) * ab.fan : 0) + (ab.sweep ? (k - (n - 1) / 2) * ab.sweep : 0);
        if (ab.sweep) t.delay += k * 0.22;
      }
      if (ab.special === 'dash') t.dash = true;
      this.tele.push(t);
    }
    h.cast = Math.min(ab.delay || 0.3, 1.0) * (ab.basic ? 0.7 : 1);
    if (!ab.basic) this.sfx('telegraph');
  }
  inShape(t, x, y, r) {
    const dx = x - t.x, dy = y - t.y, d = Math.hypot(dx, dy);
    switch (t.shape) {
      case 'circle': return d < t.r + r * 0.5;
      case 'ring': return d < t.r + r * 0.5 && d > t.r - t.w - r * 0.5;
      case 'cone': return d < t.r + r * 0.5 && Math.abs(angDiff(t.a, Math.atan2(dy, dx))) < t.arc / 2 + (d > 0 ? Math.atan(r / d) : 3);
      case 'line': { const ca = Math.cos(t.a), sa = Math.sin(t.a); const along = dx * ca + dy * sa, across = -dx * sa + dy * ca; return along > -r && along < t.len + r && Math.abs(across) < t.w / 2 + r * 0.5; }
    }
    return false;
  }
  updateTele(dt) {
    const h = this.hero, q = this.queen;
    for (let i = this.tele.length - 1; i >= 0; i--) {
      const t = this.tele[i]; t.t += dt;
      if (t.follow && h.hp > 0) { t.x = h.x; t.y = h.y; if (t.shape === 'cone' && !t.locked && t.t > t.delay * 0.6) t.locked = true; }
      if (t.t < t.delay) continue;
      this.tele.splice(i, 1);
      // FIRE
      const phased = this.phaseT > 0;
      let killed = 0;
      if (!phased) for (let j = this.minions.length - 1; j >= 0; j--) {
        const m = this.minions[j]; if (!this.inShape(t, m.x, m.y, m.r)) continue;
        if (t.special === 'freeze') { m.frozen = 2; continue; }
        m.hp -= t.dmg; if (t.special === 'drain') h.hp = Math.min(h.maxHp, h.hp + 3);
        if (m.hp <= 0) { this.killMinion(m, j); killed++; }
      }
      if (this.inShape(t, q.x, q.y, q.r)) { this.hurtQueen(t.dmg * (t.basic ? 0.45 : 0.65)); if (t.special === 'root') q.rootT = 1.4; }
      if (t.special === 'blizzard') this.zones.push({ kind: 'blizzard', x: t.x, y: t.y, r: t.r, t: 5, tick: 0, follow: true });
      if (t.dash) { const d = Math.min(t.len, dist(h.x, h.y, h.x + Math.cos(t.a) * t.len, h.y + Math.sin(t.a) * t.len)); h.dash = { a: t.a, left: d }; }
      this.fireFx(t);
      if (killed > 12) this.fx.shake(6);
    }
  }
  fireFx(t) {
    const c = t.special === 'freeze' || t.special === 'blizzard' ? '#a0e7ff' : this.heroDef.color;
    if (t.shape === 'circle') { this.fx.ring(t.x, t.y, t.r, c, 0.35); this.fx.burst(t.x, t.y, c, t.basic ? 6 : 18, t.r * 2); }
    else if (t.shape === 'ring') { this.fx.ring(t.x, t.y, t.r, c, 0.45); for (let k = 0; k < 20; k++) { const a = (k / 20) * TAU; this.fx.burst(t.x + Math.cos(a) * (t.r - t.w / 2), t.y + Math.sin(a) * (t.r - t.w / 2), c, 1, 120); } }
    else if (t.shape === 'cone') { for (let k = 0; k < (t.basic ? 6 : 16); k++) { const a = t.a + rand(-t.arc / 2, t.arc / 2), r = rand(t.r * 0.3, t.r); this.fx.burst(t.x + Math.cos(a) * r, t.y + Math.sin(a) * r, c, 1, 80); } }
    else if (t.shape === 'line') { for (let k = 0; k < (t.basic ? 6 : 18); k++) { const r = rand(t.len); this.fx.burst(t.x + Math.cos(t.a) * r, t.y + Math.sin(t.a) * r, c, 1, 100); } }
    if (!t.basic) this.fx.shake(5);
    this.sfx(t.basic ? 'swipe' : 'blast');
  }
  updateProjs(dt) {
    const h = this.hero;
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      const tgt = p.tx; if (!tgt || (tgt.hp !== undefined && tgt.hp <= 0)) { this.projs.splice(i, 1); continue; }
      const a = angTo(p.x, p.y, tgt.x, tgt.y); p.x += Math.cos(a) * p.sp * dt; p.y += Math.sin(a) * p.sp * dt;
      if (dist2(p.x, p.y, tgt.x, tgt.y) < ((tgt.r || 10) + 4) ** 2) {
        this.projs.splice(i, 1);
        if (p.kind === 'glob') { this.hitHero(p.dmg); if (this.mods.flags.venom) h.poison = Math.min(40, h.poison + 0.1); this.fx.burst(p.x, p.y, p.color, 3, 80); }
        else if (p.kind === 'bullet') { const j = this.minions.indexOf(tgt); if (j >= 0) { tgt.hp -= p.dmg; if (tgt.hp <= 0) this.killMinion(tgt, j); } }
      }
    }
  }
  updateZones(dt) {
    const h = this.hero, q = this.queen;
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i]; z.t -= dt; z.tick -= dt;
      if (z.follow && h.hp > 0) { z.x = lerp(z.x, h.x, z.kind === 'acidrain' ? dt * 2 : 1); z.y = lerp(z.y, h.y, z.kind === 'acidrain' ? dt * 2 : 1); }
      if (z.tick <= 0) {
        z.tick = 0.25;
        if (z.kind === 'acid' && dist(z.x, z.y, h.x, h.y) < z.r + h.r) this.hitHero(2.5 * this.mods.dmg);
        if (z.kind === 'acidrain' && dist(z.x, z.y, h.x, h.y) < z.r + h.r) this.hitHero(14 * this.mods.dmg);
        if (z.kind === 'blizzard' && this.phaseT <= 0) for (let j = this.minions.length - 1; j >= 0; j--) { const m = this.minions[j]; if (dist2(m.x, m.y, z.x, z.y) < z.r * z.r) { m.slow = 0.4; m.hp -= 1.2; if (m.hp <= 0) this.killMinion(m, j); } }
        if (z.kind === 'blizzard' && dist(q.x, q.y, z.x, z.y) < z.r) this.hurtQueen(1.5);
      }
      if (z.kind === 'acidrain' && Math.random() < 0.5) this.fx.puff(z.x + rand(-z.r, z.r), z.y + rand(-z.r, z.r), '#b5e48c', 5, 0.5);
      if (z.t <= 0) this.zones.splice(i, 1);
    }
    // turrets
    for (let i = this.turrets.length - 1; i >= 0; i--) {
      const t = this.turrets[i]; t.t -= dt; t.fire -= dt; if (t.t <= 0 || t.hp <= 0) { this.fx.burst(t.x, t.y, '#ffbe0b', 10, 150); this.turrets.splice(i, 1); continue; }
      if (t.fire <= 0) { let best = null, bd = 380 * 380; for (const m of this.minions) { const d = dist2(t.x, t.y, m.x, m.y); if (d < bd) { bd = d; best = m; } } if (best) { t.fire = 0.32; t.a = angTo(t.x, t.y, best.x, best.y); this.projs.push({ x: t.x, y: t.y, tx: best, sp: 900, dmg: 6 * this.hero.dmgM, kind: 'bullet', color: '#ffbe0b' }); } else t.fire = 0.2; }
    }
    // skeletons (raised from your dead)
    for (let i = this.skels.length - 1; i >= 0; i--) {
      const s = this.skels[i]; if (s.hp <= 0) { this.fx.burst(s.x, s.y, '#e9ecef', 8, 160); this.skels.splice(i, 1); continue; }
      let tgt = this.queen, bd = dist2(s.x, s.y, q.x, q.y);
      for (const m of this.minions) { const d = dist2(s.x, s.y, m.x, m.y); if (d < bd) { bd = d; tgt = m; } }
      const a = angTo(s.x, s.y, tgt.x, tgt.y); const d = Math.sqrt(bd);
      if (d > s.r + (tgt.r || 10)) { s.x += Math.cos(a) * 190 * dt; s.y += Math.sin(a) * 190 * dt; s.walk += dt * 10; }
      s.atk -= dt; if (d < s.r + (tgt.r || 10) + 6 && s.atk <= 0) { s.atk = 0.7; if (tgt === q) this.hurtQueen(5 * this.diff.dmg); else { tgt.hp -= 5; if (tgt.hp <= 0) { const j = this.minions.indexOf(tgt); if (j >= 0) this.killMinion(tgt, j); } } }
    }
  }
  updateOrbs(dt) {
    const q = this.queen; const mg = this.mods.magnet;
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i]; o.t -= dt; if (o.t <= 0) { this.orbs.splice(i, 1); continue; }
      const d = dist(o.x, o.y, q.x, q.y);
      if (o.pull || d < mg) { const a = angTo(o.x, o.y, q.x, q.y); const s = o.pull ? 900 : 420; o.x += Math.cos(a) * s * dt; o.y += Math.sin(a) * s * dt; }
      if (d < q.r + 8) { this.biomass += o.v; this.orbs.splice(i, 1); if (Math.random() < 0.4) this.sfx('orb'); }
    }
  }
  finish() {
    if (this.over) return; this.over = true;
    const won = !!(this.result && this.result.won);
    this.o.onEnd && this.o.onEnd({ won, time: Math.round(this.time), damage: Math.round(this.stats.damage), spawned: this.stats.spawned, evos: this.stats.evos, abilities: this.stats.abilities, maxSwarm: this.stats.maxSwarm, heroLevel: this.hero.level, hero: this.heroDef.id, diff: this.diff.id, queen: this.queenDef.id, hpLeft: Math.max(0, Math.round((this.hero.hp / this.hero.maxHp) * 100)) });
  }
}

// ------------------------------------------------------------------ autopilot (QA + attract mode)
export function autoIntent(g) {
  const q = g.queen, h = g.hero;
  let danger = false; let ax = 0, ay = 0;
  for (const t of g.tele) { if (g.inShape(t, q.x, q.y, q.r + 30)) { danger = true; const a = angTo(t.x, t.y, q.x, q.y); ax += Math.cos(a); ay += Math.sin(a); } }
  const swarmDanger = g.tele.some((t) => !t.basic && g.inShape(t, g.swarmC.x, g.swarmC.y, 40));
  const d = dist(q.x, q.y, h.x, h.y); const a = angTo(h.x, h.y, q.x, q.y);
  let mx = 0, my = 0;
  if (danger) { mx = ax; my = ay; }
  else if (d < 320) { mx = Math.cos(a); my = Math.sin(a); }
  else { const o = g.orbs.find((o) => dist(o.x, o.y, h.x, h.y) > 220); if (o) { const b = angTo(q.x, q.y, o.x, o.y); mx = Math.cos(b); my = Math.sin(b); } else { mx = Math.cos(a + 1.4) * 0.6; my = Math.sin(a + 1.4) * 0.6; } }
  const r = Math.hypot(q.x, q.y); if (r > ARENA * 0.8) { mx -= q.x / r; my -= q.y / r; }
  return { mx, my, charge: !swarmDanger, ability: q.cd <= 0 && d < 500 };
}

// ------------------------------------------------------------------ renderer
export class HuntRenderer {
  constructor(canvas) { this.c = canvas; this.ctx = canvas.getContext('2d'); this.cam = { x: 0, y: 0, s: 1 }; this.t = 0; }
  resize(w, h, dpr) { this.w = w; this.h = h; this.dpr = dpr; this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr); }
  draw(g, dt) {
    const ctx = this.ctx; this.t += dt; const t = this.t; const W = this.w, H = this.h, dpr = this.dpr;
    const q = g.queen, h = g.hero;
    const fx = q.hp > 0 ? (q.x * 0.75 + h.x * 0.25) : h.x, fy = q.hp > 0 ? (q.y * 0.75 + h.y * 0.25) : h.y;
    if (!this.init) { this.cam.x = fx; this.cam.y = fy; this.init = true; }
    this.cam.x += (fx - this.cam.x) * Math.min(1, dt * 6); this.cam.y += (fy - this.cam.y) * Math.min(1, dt * 6);
    const view = Math.max(W, H) < 900 ? 1000 : 1250; const s = (Math.max(W, H) / view) * dpr; this.cam.s = s;
    const sh = g.fx.shakeAmt;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#070b0d'; ctx.fillRect(0, 0, this.c.width, this.c.height);
    ctx.setTransform(s, 0, 0, s, (W * dpr) / 2 - this.cam.x * s + rand(-sh, sh) * dpr, (H * dpr) / 2 - this.cam.y * s + rand(-sh, sh) * dpr);
    // arena ground
    const gr = ctx.createRadialGradient(0, 0, 100, 0, 0, ARENA); gr.addColorStop(0, '#1c2b2a'); gr.addColorStop(1, '#101a1b');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, ARENA, 0, TAU); ctx.fill();
    for (const d of g.decor) {
      if (d.k === 0) { ctx.fillStyle = '#243837'; ctx.beginPath(); ctx.arc(d.x, d.y, 9 * d.s, 0, TAU); ctx.fill(); }
      else if (d.k === 1) { const gl = 0.5 + 0.5 * Math.sin(t * 1.5 + d.ph); ctx.fillStyle = `rgba(124,252,154,${0.18 + 0.25 * gl})`; ctx.beginPath(); ctx.arc(d.x, d.y, 10 * d.s, 0, TAU); ctx.fill(); ctx.fillStyle = '#c7f9cc'; ctx.beginPath(); ctx.arc(d.x, d.y - 3, 4 * d.s, Math.PI, 0); ctx.fill(); ctx.fillRect(d.x - 1, d.y - 3, 2, 6 * d.s); }
      else if (d.k === 2) { ctx.strokeStyle = '#2b4a3f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.quadraticCurveTo(d.x + 6, d.y - 8, d.x + 2, d.y - 14 * d.s); ctx.stroke(); }
      else { const gl = 0.5 + 0.5 * Math.sin(t * 2 + d.ph); ctx.fillStyle = `rgba(199,125,255,${0.15 + 0.3 * gl})`; ctx.beginPath(); ctx.arc(d.x, d.y, 3 * d.s, 0, TAU); ctx.fill(); }
    }
    // arena wall of thorns
    ctx.strokeStyle = '#2d6a4f'; ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(0, 0, ARENA + 12, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(124,252,154,${0.35 + 0.15 * Math.sin(t * 2)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, ARENA, 0, TAU); ctx.stroke();
    // splats
    for (const sp of g.splats) { ctx.globalAlpha = Math.min(0.55, sp.t / sp.max); ctx.fillStyle = sp.c; ctx.beginPath(); ctx.ellipse(sp.x, sp.y, sp.r, sp.r * 0.7, sp.rot, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    // zones
    for (const z of g.zones) {
      if (z.kind === 'acid') { ctx.globalAlpha = Math.min(1, z.t) * 0.55; ctx.fillStyle = '#b5e48c'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill(); }
      else if (z.kind === 'acidrain') { ctx.globalAlpha = 0.3; ctx.fillStyle = '#b5e48c'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill(); }
      else if (z.kind === 'blizzard') { ctx.globalAlpha = 0.2; ctx.fillStyle = '#a0e7ff'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.8; ctx.fillStyle = '#fff'; for (let i = 0; i < 30; i++) { const a = i * 0.7 + t * 2, rr = ((i * 53) % 100) / 100 * z.r; ctx.fillRect(z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr, 3, 3); } }
    }
    ctx.globalAlpha = 1;
    // orbs
    for (const o of g.orbs) { const p = 0.7 + 0.3 * Math.sin(t * 6 + o.x); ctx.fillStyle = `rgba(217,237,146,${0.25 * p})`; ctx.beginPath(); ctx.arc(o.x, o.y, 9, 0, TAU); ctx.fill(); ctx.fillStyle = o.t < 3 && Math.sin(t * 20) > 0 ? '#fff' : '#b5e48c'; ctx.beginPath(); ctx.arc(o.x, o.y, 4 + Math.min(3, o.v / 4), 0, TAU); ctx.fill(); }
    // telegraphs
    for (const tl of g.tele) this.drawTele(tl);
    // minions
    const detailed = g.minions.length < 140 && !g.fx.lowFx;
    for (const m of g.minions) this.drawMinion(m, detailed, g);
    // skeletons & turrets
    for (const sk of g.skels) { ctx.fillStyle = '#e9ecef'; ctx.strokeStyle = '#0b1320'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sk.x, sk.y, sk.r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#0b1320'; ctx.fillRect(sk.x - 5, sk.y - 3, 3, 3); ctx.fillRect(sk.x + 2, sk.y - 3, 3, 3); }
    for (const tu of g.turrets) { ctx.fillStyle = '#495057'; ctx.strokeStyle = '#0b1320'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tu.x, tu.y, 16, 0, TAU); ctx.fill(); ctx.stroke(); ctx.save(); ctx.translate(tu.x, tu.y); ctx.rotate(tu.a); ctx.fillStyle = '#ffbe0b'; ctx.fillRect(0, -4, 22, 8); ctx.restore(); }
    // hero + queen
    if (h.hp > 0) this.drawHero(g, t);
    if (q.hp > 0) this.drawQueen(g, t);
    // projectiles
    for (const p of g.projs) { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.kind === 'glob' ? 4 : 3, 0, TAU); ctx.fill(); }
    g.fx.draw(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (g.fx.flashA > 0.01) { ctx.globalAlpha = g.fx.flashA; ctx.fillStyle = g.fx.flashC; ctx.fillRect(0, 0, this.c.width, this.c.height); ctx.globalAlpha = 1; }
    if (q.hp > 0 && q.hp / q.maxHp < 0.3) { const gg = ctx.createRadialGradient(this.c.width / 2, this.c.height / 2, this.c.height * 0.35, this.c.width / 2, this.c.height / 2, this.c.width * 0.75); gg.addColorStop(0, 'rgba(255,0,40,0)'); gg.addColorStop(1, `rgba(255,0,40,${0.25 + 0.12 * Math.sin(t * 8)})`); ctx.fillStyle = gg; ctx.fillRect(0, 0, this.c.width, this.c.height); }
    if (h.enraged) { ctx.fillStyle = `rgba(255,0,40,${0.06 + 0.04 * Math.sin(t * 5)})`; ctx.fillRect(0, 0, this.c.width, this.c.height); }
  }
  drawTele(tl) {
    const ctx = this.ctx; const k = Math.min(1, tl.t / tl.delay);
    const ice = tl.special === 'freeze' || tl.special === 'blizzard' || tl.special === 'root';
    const base = ice ? '76,201,240' : '255,45,85';
    const path = (scale) => {
      ctx.beginPath();
      if (tl.shape === 'circle') ctx.arc(tl.x, tl.y, tl.r * scale, 0, TAU);
      else if (tl.shape === 'ring') { ctx.arc(tl.x, tl.y, tl.r, 0, TAU); ctx.arc(tl.x, tl.y, Math.max(1, tl.r - tl.w * scale), 0, TAU, true); }
      else if (tl.shape === 'cone') { ctx.moveTo(tl.x, tl.y); ctx.arc(tl.x, tl.y, tl.r * scale, tl.a - tl.arc / 2, tl.a + tl.arc / 2); ctx.closePath(); }
      else if (tl.shape === 'line') { const ca = Math.cos(tl.a), sa = Math.sin(tl.a), hw = tl.w / 2, L = tl.len * scale; ctx.moveTo(tl.x - sa * hw, tl.y + ca * hw); ctx.lineTo(tl.x - sa * hw + ca * L, tl.y + ca * hw + sa * L); ctx.lineTo(tl.x + sa * hw + ca * L, tl.y - ca * hw + sa * L); ctx.lineTo(tl.x + sa * hw, tl.y - ca * hw); ctx.closePath(); }
    };
    ctx.fillStyle = `rgba(${base},${tl.basic ? 0.12 : 0.16})`; path(1); ctx.fill('evenodd');
    ctx.fillStyle = `rgba(${base},${0.25 + 0.3 * k})`; path(tl.shape === 'ring' ? k : k); ctx.fill('evenodd');
    ctx.strokeStyle = `rgba(${base},${0.6 + 0.4 * k})`; ctx.lineWidth = tl.basic ? 2 : 3; path(1); ctx.stroke();
  }
  drawMinion(m, detailed, g) {
    const ctx = this.ctx; const a = Math.atan2(m.vy, m.vx); const c = m.frozen > 0 ? '#caf0f8' : m.color;
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(a);
    if (g.phaseT > 0) ctx.globalAlpha = 0.45;
    const r = m.r;
    if (detailed) { ctx.strokeStyle = '#0b1320'; ctx.lineWidth = 1.5; const ph = m.frozen > 0 ? 0 : m.phase; ctx.beginPath(); for (let i = -1; i <= 1; i++) { const sw = Math.sin(ph + i * 2) * 3; ctx.moveTo(i * r * 0.5, 0); ctx.lineTo(i * r * 0.5 + sw, -r * 1.25); ctx.moveTo(i * r * 0.5, 0); ctx.lineTo(i * r * 0.5 - sw, r * 1.25); } ctx.stroke(); }
    ctx.fillStyle = '#0b1320'; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.15 + 1.5, r * 0.85 + 1.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(-r * 0.15, 0, r * 1.05, r * 0.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(r * 0.65, 0, r * 0.45, r * 0.5, 0, 0, TAU); ctx.fill();
    if (detailed) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * 0.75, -r * 0.28, r * 0.22, 0, TAU); ctx.arc(r * 0.75, r * 0.28, r * 0.22, 0, TAU); ctx.fill(); }
    if (m.sp === 'brute') { ctx.fillStyle = '#e9ecef'; ctx.beginPath(); ctx.moveTo(r, -4); ctx.lineTo(r + 9, 0); ctx.lineTo(r, 4); ctx.fill(); }
    if (m.sp === 'bomber') { ctx.fillStyle = Math.sin(this.t * 12 + m.id) > 0 ? '#fff' : '#ff4d6d'; ctx.beginPath(); ctx.arc(-r * 0.5, 0, 2.5, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  drawQueen(g, t) {
    const ctx = this.ctx, q = g.queen, Q = g.queenDef, sk = q.skin; const a = q.face ?? -Math.PI / 2;
    ctx.save(); ctx.translate(q.x, q.y);
    if (g.phaseT > 0) ctx.globalAlpha = 0.5;
    const glow = sk.glow || Q.color; const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.fillStyle = glow; ctx.globalAlpha *= 0.18 + 0.12 * pulse; ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.fill(); ctx.globalAlpha = g.phaseT > 0 ? 0.5 : 1;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 22, 26, 8, 0, 0, TAU); ctx.fill();
    ctx.rotate(a);
    // wings
    ctx.fillStyle = 'rgba(224,251,252,.35)'; const wf = Math.sin(t * 30) * 0.15; for (const sgn of [-1, 1]) { ctx.save(); ctx.rotate(sgn * (0.9 + wf)); ctx.beginPath(); ctx.ellipse(-6, sgn * 2, 22, 9, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.strokeStyle = '#0b1320'; ctx.lineWidth = 3;
    // abdomen
    ctx.fillStyle = q.hitT > 0 ? '#fff' : Q.color2; ctx.beginPath(); ctx.ellipse(-16, 0, 20, 14, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-16, 0, 6 + i * 5, -1, 1); ctx.stroke(); }
    ctx.strokeStyle = '#0b1320'; ctx.lineWidth = 3;
    // thorax/head
    ctx.fillStyle = q.hitT > 0 ? '#fff' : Q.color; ctx.beginPath(); ctx.ellipse(6, 0, 13, 11, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(13, -5, 3.5, 0, TAU); ctx.arc(13, 5, 3.5, 0, TAU); ctx.fill(); ctx.fillStyle = '#0b1320'; ctx.beginPath(); ctx.arc(14, -5, 1.8, 0, TAU); ctx.arc(14, 5, 1.8, 0, TAU); ctx.fill();
    // crown
    ctx.rotate(-a); ctx.fillStyle = sk.crown || '#ffd60a'; ctx.strokeStyle = '#0b1320'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-10, -22); ctx.lineTo(-10, -32); ctx.lineTo(-5, -26); ctx.lineTo(0, -35); ctx.lineTo(5, -26); ctx.lineTo(10, -32); ctx.lineTo(10, -22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    if (g.cover) return;
    // hp ring
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(q.x, q.y, 32, 0, TAU); ctx.stroke();
    ctx.strokeStyle = q.hp / q.maxHp > 0.35 ? '#7CFC9A' : '#ff4d6d'; ctx.beginPath(); ctx.arc(q.x, q.y, 32, -Math.PI / 2, -Math.PI / 2 + TAU * (q.hp / q.maxHp)); ctx.stroke();
    if (q.rootT > 0) { ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(q.x, q.y + 6, 24, 0, TAU); ctx.stroke(); }
  }
  drawHero(g, t) {
    const ctx = this.ctx, h = g.hero, H = g.heroDef; const r = h.r; const bob = h.moving ? Math.abs(Math.sin(h.walk)) * 4 : 0;
    ctx.save(); ctx.translate(h.x, h.y - bob);
    if (h.enraged) { ctx.fillStyle = `rgba(255,0,40,${0.25 + 0.15 * Math.sin(t * 10)})`; ctx.beginPath(); ctx.arc(0, 0, r + 22, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, r * 0.9 + bob, r, r * 0.35, 0, 0, TAU); ctx.fill();
    // weapon
    ctx.save(); ctx.rotate(h.aim); ctx.fillStyle = '#0b1320'; ctx.fillRect(r * 0.5, -6, r * 1.3, 12); ctx.fillStyle = H.color2; ctx.fillRect(r * 0.55, -4, r * 1.2, 8); ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = '#0b1320'; ctx.fillStyle = H.color;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
    if (h.hitT > 0) { ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.arc(0, 0, r - 2, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.arc(0, r * 0.9, r, 0, TAU); ctx.fill(); ctx.restore();
    const ex = Math.cos(h.aim) * 5, ey = Math.sin(h.aim) * 4;
    switch (H.look) {
      case 'knight': ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.arc(0, -4, r * 0.85, Math.PI, 0); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#0b1320'; ctx.fillRect(-r * 0.6, -6 + ey, r * 1.2, 7); ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.ellipse(0, -r * 0.95, 6, 14, 0, 0, TAU); ctx.fill(); break;
      case 'wizard': ctx.fillStyle = H.color2; ctx.beginPath(); ctx.moveTo(-r, -r * 0.4); ctx.lineTo(r * 0.2, -r * 1.9); ctx.lineTo(r, -r * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
      case 'hood': ctx.fillStyle = H.color2; ctx.beginPath(); ctx.moveTo(-r, -r * 0.1); ctx.quadraticCurveTo(0, -r * 1.7, r, -r * 0.1); ctx.quadraticCurveTo(0, -r * 0.6, -r, -r * 0.1); ctx.fill(); ctx.stroke(); break;
      case 'beard': ctx.fillStyle = '#e9ecef'; ctx.beginPath(); ctx.moveTo(-r * 0.7, r * 0.1); ctx.quadraticCurveTo(0, r * 1.5, r * 0.7, r * 0.1); ctx.fill(); ctx.stroke(); ctx.fillStyle = H.color2; ctx.fillRect(-r * 0.8, -r * 0.8, r * 1.6, r * 0.35); break;
      case 'goggles': ctx.fillStyle = '#495057'; ctx.fillRect(-r, -r * 0.35, r * 2, 8); ctx.fillStyle = '#4cc9f0'; ctx.beginPath(); ctx.arc(-r * 0.35 + ex, -r * 0.2, 8, 0, TAU); ctx.arc(r * 0.35 + ex, -r * 0.2, 8, 0, TAU); ctx.fill(); ctx.stroke(); break;
      case 'skull': ctx.fillStyle = H.color2; ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 1.05, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); ctx.fillStyle = '#e9ecef'; ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 0.6, 0, TAU); ctx.fill(); ctx.fillStyle = '#0b1320'; ctx.beginPath(); ctx.arc(-r * 0.22, -r * 0.1, 5, 0, TAU); ctx.arc(r * 0.22, -r * 0.1, 5, 0, TAU); ctx.fill(); break;
    }
    if (H.look !== 'knight' && H.look !== 'skull' && H.look !== 'goggles') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-r * 0.3 + ex * 0.5, -r * 0.05 + ey * 0.5, 5.5, 0, TAU); ctx.arc(r * 0.3 + ex * 0.5, -r * 0.05 + ey * 0.5, 5.5, 0, TAU); ctx.fill(); ctx.fillStyle = h.enraged ? '#ff0033' : '#0b1320'; ctx.beginPath(); ctx.arc(-r * 0.3 + ex, -r * 0.05 + ey, 2.8, 0, TAU); ctx.arc(r * 0.3 + ex, -r * 0.05 + ey, 2.8, 0, TAU); ctx.fill(); }
    if (h.shieldT > 0) { ctx.strokeStyle = `rgba(255,243,176,${0.6 + 0.3 * Math.sin(t * 10)})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, r + 12, 0, TAU); ctx.stroke(); }
    if (h.poison > 0.5) { ctx.fillStyle = 'rgba(181,228,140,.35)'; ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, TAU); ctx.fill(); }
    ctx.restore();
    if (!h.level) return;
    ctx.font = '900 14px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.strokeText(`Lv ${h.level}`, h.x, h.y - r - 14); ctx.fillStyle = h.enraged ? '#ff4d6d' : '#ffd60a'; ctx.fillText(`Lv ${h.level}`, h.x, h.y - r - 14);
  }
}
