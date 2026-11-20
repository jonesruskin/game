// Bot brains: human-feeling opponents with skill-scaled aim, reaction, ability use and looting.
import { TAU, clamp, dist, dist2, angTo, angDiff, rand, pick, chance } from '../util.js';
import { ABILITIES, ULTS } from '../data/abilities.js';

const A = ['Shadow', 'Pixel', 'Turbo', 'Lucky', 'Ninja', 'Spicy', 'Captain', 'Lil', 'Epic', 'Sneaky', 'Cosmic', 'Mega', 'Frosty', 'Salty', 'Sir', 'Big', 'Tiny', 'Crispy', 'Neon', 'Zesty', 'Hyper', 'Silent', 'Rogue', 'Moon'];
const B = ['Fox', 'Wizard', 'Potato', 'Gamer', 'Dragon', 'Taco', 'Viper', 'Panda', 'Knight', 'Noodle', 'Goose', 'Waffle', 'Raptor', 'Bean', 'Yeti', 'Pickle', 'Comet', 'Otter', 'Mango', 'Falcon', 'Toast', 'Kraken'];
export function botName() {
  const r = Math.random();
  if (r < 0.45) return pick(A) + pick(B) + (chance(0.5) ? Math.floor(rand(1, 999)) : '');
  if (r < 0.65) return (pick(A) + '_' + pick(B)).toLowerCase();
  if (r < 0.8) return 'xX' + pick(B) + 'Xx';
  if (r < 0.9) return pick(B) + pick(['Main', 'TTV', 'God', 'Pro', 'Lord', 'King', 'Queen']);
  return pick(A) + pick(B).toUpperCase();
}

export class Bot {
  constructor(m, f, skill) {
    this.m = m; this.f = f; this.s = skill;
    this.target = null; this.retarget = 0; this.react = 0; this.strafe = chance(0.5) ? 1 : -1; this.strafeT = 0;
    this.goal = null; this.goalT = 0; this.abilT = rand(0.5); this.stuckT = 0; this.lastPos = { x: f.x, y: f.y }; this.unstick = 0; this.unstickA = 0;
    this.aimErr = 0; this.aimErrT = 0; this.losT = 0; this.los = false; this.prefer = f.hero.weapon.range * (f.hero.id === 'bastion' ? 0.5 : f.hero.id === 'whisper' ? 0.75 : 0.6);
    this.aggro = rand(0.3, 1); this.lootUntil = rand(25, 55);
  }
  think(dt) {
    const { m, f } = this; const I = f.intent; const s = this.s;
    // --- target selection
    this.retarget -= dt;
    if (this.retarget <= 0) {
      this.retarget = 0.35;
      const lootPhase = m.time < this.lootUntil;
      let t = m.nearestEnemyTo(f.x, f.y, lootPhase ? 240 : 520 + 200 * s * this.aggro, f, f, false);
      if (m.time - f.lastHurt < 2.5 && f.lastHitBy && f.lastHitBy.alive && m.canSee(f, f.lastHitBy)) t = f.lastHitBy; // fight back
      if (t !== this.target) { this.target = t; this.react = 0.55 - 0.45 * s + rand(0.15); }
    }
    let tgt = this.target;
    if (tgt && (tgt.dead || (tgt.isFighter && (!tgt.alive || !m.canSee(f, tgt))))) { this.target = tgt = null; }
    if (this.react > 0) this.react -= dt;
    this.losT -= dt; if (tgt && this.losT <= 0) { this.losT = 0.2; this.los = !m.losBlocked(f.x, f.y, tgt.x, tgt.y); }
    const lowHp = f.hp / f.maxHp < 0.35;
    // --- movement goal
    let mx = 0, my = 0;
    const storm = m.storm; const sd = dist(f.x, f.y, storm.next.x, storm.next.y);
    const stormUrgent = m.outsideStorm(f.x, f.y) || (storm.state === 'shrink' && sd > storm.next.r * 0.85) || (storm.state === 'wait' && m.stormTimeLeft() < 8 && sd > storm.next.r * 0.9);
    let engaged = false;
    if (tgt && this.react <= 0) {
      const d = dist(f.x, f.y, tgt.x, tgt.y);
      const a = angTo(f.x, f.y, tgt.x, tgt.y);
      engaged = d < f.hero.weapon.range * 1.15;
      const tgtHp = tgt.isFighter ? tgt.hp / tgt.maxHp : 1;
      const cautious = f.hp / f.maxHp < 0.5 && this.aggro < 0.55 && tgtHp > 0.4;
      if (((lowHp && tgtHp > f.hp / f.maxHp) || cautious) && !stormUrgent) { // retreat
        mx = -Math.cos(a); my = -Math.sin(a);
        const hp = this.nearestPickup('health', 600); if (hp) { const ha = angTo(f.x, f.y, hp.x, hp.y); mx = Math.cos(ha); my = Math.sin(ha); }
      } else {
        this.strafeT -= dt; if (this.strafeT <= 0) { this.strafeT = rand(0.5, 1.6); if (chance(0.6)) this.strafe *= -1; }
        const want = this.prefer * (0.8 + 0.4 * this.aggro);
        const radial = d > want + 60 ? 1 : d < want - 80 ? -0.8 : 0;
        const perp = a + Math.PI / 2;
        const st = 0.4 + 0.6 * s;
        mx = Math.cos(a) * radial + Math.cos(perp) * this.strafe * st;
        my = Math.sin(a) * radial + Math.sin(perp) * this.strafe * st;
        if (!this.los && d < 900) { mx = Math.cos(a) * 0.8 + Math.cos(perp) * this.strafe * 0.6; my = Math.sin(a) * 0.8 + Math.sin(perp) * this.strafe * 0.6; }
      }
      // --- aim (lead + error)
      this.aimErrT -= dt; if (this.aimErrT <= 0) { this.aimErrT = rand(0.2, 0.5); this.aimErr = rand(-1, 1) * (0.42 * (1 - s) + 0.03); }
      let tx = tgt.x, ty = tgt.y;
      const tv = tgt.isFighter ? tgt.intent : null;
      if (tv && tgt.moving) { const lead = (d / f.hero.weapon.speed) * s * 0.9; const sp = tgt.hero.speed; tx += tv.mx * sp * lead; ty += tv.my * sp * lead; }
      const aim = angTo(f.x, f.y, tx, ty) + this.aimErr;
      I.aim = f.aim + clamp(angDiff(f.aim, aim), -dt * (6 + 14 * s), dt * (6 + 14 * s));
      I.ax = tx; I.ay = ty;
      I.fire = this.los && d < f.hero.weapon.range * 0.98 && Math.abs(angDiff(f.aim, aim)) < 0.35;
      // --- abilities
      this.abilT -= dt;
      if (this.abilT <= 0) { this.abilT = 0.35 + (1 - s) * 0.9; this.useAbilities(tgt, d, a, tx, ty); }
    } else {
      I.fire = false;
      // Loot or break crates or wander
      this.goalT -= dt;
      if (!this.goal || this.goalT <= 0 || (this.goal.obj && (this.goal.obj.dead || (!this.goal.crate && !m.pickups.includes(this.goal.obj))))) this.pickGoal();
      if (this.goal) {
        const g = this.goal.obj || this.goal; const a = angTo(f.x, f.y, g.x, g.y); const d = dist(f.x, f.y, g.x, g.y);
        if (this.goal.crate) {
          I.aim = a; I.ax = g.x; I.ay = g.y; if (d < 360) { I.fire = !m.losBlocked(f.x, f.y, g.x, g.y) || d < 80; if (d > 180) { mx = Math.cos(a); my = Math.sin(a); } } else { mx = Math.cos(a); my = Math.sin(a); }
        } else { if (d > 20) { mx = Math.cos(a); my = Math.sin(a); } I.aim = f.aim + clamp(angDiff(f.aim, a), -dt * 5, dt * 5); }
      }
      // Use heal when quiet
      for (let i = 0; i < 2; i++) { const ab = ABILITIES[f.abilities[i].id]; if (ab.ai.type === 'heal' && f.abilities[i].cd <= 0 && f.hp / f.maxHp < 0.5 && ab.id !== 'rewind') I.cast[i] = true; }
    }
    if (stormUrgent) { // override toward safety
      const a = angTo(f.x, f.y, storm.next.x, storm.next.y);
      mx = mx * 0.3 + Math.cos(a); my = my * 0.3 + Math.sin(a);
      if (m.outsideStorm(f.x, f.y)) for (let i = 0; i < 2; i++) { const id = f.abilities[i].id; if ((id === 'blink' || id === 'flame_dash' || id === 'rocket_leap') && f.abilities[i].cd <= 0) { I.cast[i] = true; I.ax = f.x + Math.cos(a) * 400; I.ay = f.y + Math.sin(a) * 400; } }
    }
    // --- obstacle steering
    const ml = Math.hypot(mx, my);
    if (ml > 0.01) {
      mx /= ml; my /= ml;
      let base = Math.atan2(my, mx);
      if (this.unstick > 0) { this.unstick -= dt; base = this.unstickA; }
      else {
        const probe = (a) => m.pointFree(f.x + Math.cos(a) * 46, f.y + Math.sin(a) * 46, f.r * 0.9);
        if (!probe(base)) { for (const off of [0.6, -0.6, 1.2, -1.2, 1.8, -1.8, 2.5, -2.5]) { const o = off * (this.strafe); if (probe(base + o)) { base += o; break; } } }
      }
      mx = Math.cos(base); my = Math.sin(base);
      // stuck detection
      this.stuckT += dt;
      if (this.stuckT > 0.8) { const moved = dist(f.x, f.y, this.lastPos.x, this.lastPos.y); if (moved < 30 && !f.st.root && !f.st.stun) { this.unstick = rand(0.4, 0.9); this.unstickA = rand(TAU); this.goal = null; } this.stuckT = 0; this.lastPos = { x: f.x, y: f.y }; }
    }
    I.mx = mx; I.my = my;
    if (!tgt || this.react > 0) { I.ax = f.x + Math.cos(f.aim) * 200; I.ay = f.y + Math.sin(f.aim) * 200; }
  }
  useAbilities(tgt, d, a, tx, ty) {
    const { m, f, s } = this; const I = f.intent; if (chance(0.25 * (1 - s))) return;
    const hpK = f.hp / f.maxHp;
    for (let i = 0; i < 2; i++) {
      const slot = f.abilities[i]; if (slot.cd > 0) continue;
      const ab = ABILITIES[slot.id]; const t = ab.ai.type, R = ab.ai.range; let go = false; let ax = tx, ay = ty;
      if (t === 'shot') go = d < R && this.los;
      else if (t === 'zone') go = d < R + 40;
      else if (t === 'self') go = d < R + 10;
      else if (t === 'gap') { go = (d > 180 && d < R + 160 && hpK > 0.5) || (hpK < 0.3 && d < 300); if (hpK < 0.3) { ax = f.x - Math.cos(a) * 300; ay = f.y - Math.sin(a) * 300; } }
      else if (t === 'escape') { go = hpK < 0.45 && d < 400; ax = f.x - Math.cos(a) * 300; ay = f.y - Math.sin(a) * 300; if (slot.id === 'smoke_bomb') { ax = f.x; ay = f.y; } }
      else if (t === 'heal') go = slot.id === 'rewind' ? (f.history[0] && f.history[0].hp > f.hp + 30) : hpK < 0.55;
      else if (t === 'defense') go = d < R && (m.time - f.lastHurt < 0.6) ;
      if (go) { I.cast[i] = true; I.ax = ax; I.ay = ay; return; }
    }
    if (f.ult >= 1) {
      const u = ULTS[f.hero.ult.id]; let go = false;
      if (u.aim) go = d < u.range;
      else if (f.hero.ult.id === 'blizzard') go = d < 220;
      else if (f.hero.ult.id === 'bullet_storm') go = d < 330;
      else if (f.hero.ult.id === 'fortress') go = m.time - f.lastHurt < 0.5 && hpK < 0.7;
      else go = d < f.hero.weapon.range;
      if (go) { I.ult = true; I.ax = tx; I.ay = ty; }
    }
  }
  nearestPickup(kind, range) {
    let best = null, bd = range * range; const f = this.f;
    for (const p of this.m.pickups) { if (p.kind !== kind) continue; const d = dist2(f.x, f.y, p.x, p.y); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  value(id, lvl) { return ABILITIES[id].tier + (lvl - 1) * 0.9; }
  wantsOrb(p) {
    const f = this.f;
    if (f.abilities.some((a) => a.id === p.ability)) return f.abilities.find((a) => a.id === p.ability).lvl < 3;
    const worst = Math.min(...f.abilities.map((a) => this.value(a.id, a.lvl)));
    return this.value(p.ability, p.lvl) > worst + 0.4;
  }
  considerOrb(p) {
    const f = this.f; if (!this.wantsOrb(p) || f.abilities.some((a) => a.id === p.ability)) return;
    let wi = 0; let wv = 99; f.abilities.forEach((a, i) => { const v = this.value(a.id, a.lvl); if (v < wv) { wv = v; wi = i; } });
    f.intent.swap = wi;
  }
  pickGoal() {
    const { m, f } = this; this.goalT = rand(2, 4);
    let best = null, bd = 900 * 900;
    for (const p of m.pickups) { if (p.kind === 'orb' && !this.wantsOrb(p)) continue; if (p.kind === 'health' && f.hp > f.maxHp * 0.8) continue; const d = dist2(f.x, f.y, p.x, p.y); if (d < bd) { bd = d; best = { obj: p }; } }
    if (!best && chance(0.75)) {
      bd = 800 * 800;
      for (const c of m.world.crates) { if (c.dead) continue; const d = dist2(f.x, f.y, c.x, c.y); if (d < bd && !m.outsideStorm(c.x, c.y)) { bd = d; best = { obj: c, crate: true }; } }
    }
    if (!best) { // wander inside next safe circle
      const n = m.storm.next; const a = rand(TAU), r = rand(n.r * 0.8);
      best = { x: clamp(n.x + Math.cos(a) * r, 60, m.size - 60), y: clamp(n.y + Math.sin(a) * r, 60, m.size - 60) };
    }
    this.goal = best;
  }
}
