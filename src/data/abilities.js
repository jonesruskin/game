// Every stealable ability + every hero ultimate.
// cast(m, f, ax, ay, lvl): m = Match, f = caster fighter, (ax, ay) = world aim point, lvl = 1..3
import { TAU, angTo, dist, clamp, rand } from '../util.js';

const P = (lvl) => 1 + 0.3 * (lvl - 1);       // power multiplier per level
export const cdMult = (lvl) => 1 - 0.15 * (lvl - 1); // cooldown multiplier per level

function aimClamp(f, ax, ay, max) {
  const d = dist(f.x, f.y, ax, ay), a = angTo(f.x, f.y, ax, ay);
  const r = Math.min(d, max);
  return { x: f.x + Math.cos(a) * r, y: f.y + Math.sin(a) * r, a };
}

export const ABILITIES = {
  // ---------------- Blaze ----------------
  fire_wall: {
    name: 'Fire Wall', icon: '🔥', color: '#ff6b35', cd: 9, tier: 3,
    desc: 'Raise a wall of flame that scorches anyone crossing it.',
    ai: { type: 'zone', range: 380 },
    cast(m, f, ax, ay, lvl) {
      const p = aimClamp(f, ax, ay, 380); const perp = p.a + Math.PI / 2;
      const len = 100 + 20 * lvl;
      for (let i = -2; i <= 2; i++) {
        const x = p.x + Math.cos(perp) * i * (len / 2.2), y = p.y + Math.sin(perp) * i * (len / 2.2);
        m.addZone({ x, y, r: 46, life: 3.2, owner: f, kind: 'fire', tickEvery: 0.4, color: '#ff6b35',
          onTick: (z) => m.enemiesInRadius(z.x, z.y, z.r, f).forEach((e) => { m.damage(e, 7 * P(lvl), f, { kind: 'fire' }); m.status(e, 'burn', 1.5, 3 * P(lvl), f); }) });
      }
      m.sfx('fire', p.x, p.y);
    },
  },
  flame_dash: {
    name: 'Flame Dash', icon: '☄️', color: '#ff9f1c', cd: 7, tier: 2,
    desc: 'Dash forward, leaving a trail of fire behind you.',
    ai: { type: 'gap', range: 300 },
    cast(m, f, ax, ay, lvl) {
      const a = angTo(f.x, f.y, ax, ay);
      m.startDash(f, a, 240 + 30 * lvl, 1300, {
        trail: (x, y) => m.addZone({ x, y, r: 34, life: 2, owner: f, kind: 'fire', tickEvery: 0.4, color: '#ff9f1c',
          onTick: (z) => m.enemiesInRadius(z.x, z.y, z.r, f).forEach((e) => m.damage(e, 6 * P(lvl), f, { kind: 'fire' })) }),
      });
      m.sfx('dash', f.x, f.y);
    },
  },
  // ---------------- Volt ----------------
  chain_lightning: {
    name: 'Chain Lightning', icon: '⚡', color: '#f8f32b', cd: 7, tier: 3,
    desc: 'Zap the nearest enemy near your aim; it arcs to 2 more.',
    ai: { type: 'shot', range: 430 },
    cast(m, f, ax, ay, lvl) {
      const p = aimClamp(f, ax, ay, 430);
      let target = m.nearestEnemyTo(p.x, p.y, 260, f, f);
      let from = { x: f.x, y: f.y }; const hit = new Set();
      for (let i = 0; i < 2 + lvl && target; i++) {
        hit.add(target);
        m.fx.bolt(from.x, from.y, target.x, target.y, '#f8f32b');
        m.damage(target, (i === 0 ? 30 : 20) * P(lvl), f, { kind: 'shock' });
        from = target;
        target = m.enemiesInRadius(from.x, from.y, 260, f).find((e) => !hit.has(e));
      }
      if (!hit.size) m.fx.bolt(f.x, f.y, p.x, p.y, '#f8f32b');
      m.sfx('zap', f.x, f.y);
    },
  },
  blink: {
    name: 'Blink', icon: '✨', color: '#3ad1ff', cd: 6, tier: 2,
    desc: 'Teleport a short distance instantly.',
    ai: { type: 'escape', range: 240 },
    cast(m, f, ax, ay, lvl) {
      const p = aimClamp(f, ax, ay, 210 + 30 * lvl);
      m.fx.burst(f.x, f.y, '#3ad1ff', 14, 200);
      m.blinkTo(f, p.x, p.y);
      m.fx.burst(f.x, f.y, '#3ad1ff', 14, 200);
      m.sfx('blink', f.x, f.y);
    },
  },
  // ---------------- Bastion ----------------
  shield_bash: {
    name: 'Shield Bash', icon: '🛡️', color: '#ffb703', cd: 8, tier: 3,
    desc: 'Charge forward. The first enemy hit is stunned and knocked back.',
    ai: { type: 'gap', range: 280 },
    cast(m, f, ax, ay, lvl) {
      const a = angTo(f.x, f.y, ax, ay);
      m.startDash(f, a, 280, 1100, {
        hitOnce: true,
        onHit: (e) => { m.damage(e, 28 * P(lvl), f, { kind: 'bash' }); m.status(e, 'stun', 0.7 + 0.15 * lvl); m.knock(e, a, 520); m.fx.shake(8); },
      });
      m.sfx('dash', f.x, f.y);
    },
  },
  barrier: {
    name: 'Barrier', icon: '🧱', color: '#8a9bb5', cd: 10, tier: 2,
    desc: 'Slam down a temporary wall that blocks shots and movement.',
    ai: { type: 'defense', range: 400 },
    cast(m, f, ax, ay) {
      const a = angTo(f.x, f.y, ax, ay), perp = a + Math.PI / 2;
      const cx = f.x + Math.cos(a) * 75, cy = f.y + Math.sin(a) * 75;
      for (let i = -2; i <= 2; i++) m.addTempWall({ x: cx + Math.cos(perp) * i * 30, y: cy + Math.sin(perp) * i * 30, r: 20, life: 4, color: '#8a9bb5' });
      m.sfx('wall', cx, cy);
    },
  },
  // ---------------- Thorn ----------------
  root_seeds: {
    name: 'Root Seeds', icon: '🌱', color: '#5cdb5c', cd: 9, tier: 3,
    desc: 'Toss a seed that erupts into roots, holding enemies in place.',
    ai: { type: 'zone', range: 450 },
    cast(m, f, ax, ay, lvl) {
      const p = aimClamp(f, ax, ay, 450);
      m.lob(f, p.x, p.y, 0.45, '#5cdb5c', () => {
        m.fx.ring(p.x, p.y, 110, '#5cdb5c');
        m.enemiesInRadius(p.x, p.y, 110, f).forEach((e) => { m.damage(e, 20 * P(lvl), f, { kind: 'root' }); m.status(e, 'root', 1.0 + 0.2 * lvl); });
        m.addZone({ x: p.x, y: p.y, r: 110, life: 1.2, owner: f, kind: 'roots', color: '#3a9a3a' });
        m.sfx('root', p.x, p.y);
      });
    },
  },
  heal_bloom: {
    name: 'Heal Bloom', icon: '🌸', color: '#ff7eb6', cd: 12, tier: 2,
    desc: 'Grow a flower that rapidly heals you while you stand in it.',
    ai: { type: 'heal', range: 0 },
    cast(m, f, ax, ay, lvl) {
      m.addZone({ x: f.x, y: f.y, r: 120, life: 3.2, owner: f, kind: 'bloom', tickEvery: 0.25, color: '#ff7eb6',
        onTick: (z) => { if (dist(f.x, f.y, z.x, z.y) < z.r) m.heal(f, 4 * P(lvl)); } });
      m.sfx('heal', f.x, f.y);
    },
  },
  // ---------------- Whisper ----------------
  smoke_bomb: {
    name: 'Smoke Bomb', icon: '💨', color: '#b8b8d1', cd: 10, tier: 2,
    desc: 'Create a smoke cloud that hides you like a bush and slows enemies.',
    ai: { type: 'escape', range: 200 },
    cast(m, f, ax, ay, lvl) {
      const p = aimClamp(f, ax, ay, 300);
      m.lob(f, p.x, p.y, 0.3, '#b8b8d1', () => {
        m.addZone({ x: p.x, y: p.y, r: 130 + 15 * lvl, life: 4.5, owner: f, kind: 'smoke', conceal: true, tickEvery: 0.25, color: '#b8b8d1',
          onTick: (z) => m.enemiesInRadius(z.x, z.y, z.r, f).forEach((e) => m.status(e, 'slow', 0.4, 0.3)) });
        m.sfx('smoke', p.x, p.y);
      });
    },
  },
  grapple: {
    name: 'Grapple Hook', icon: '🪝', color: '#f15bb5', cd: 8, tier: 3,
    desc: 'Fire a hook. Hit a wall to zip to it, or an enemy to yank them in.',
    ai: { type: 'shot', range: 460 },
    cast(m, f, ax, ay, lvl) {
      const a = angTo(f.x, f.y, ax, ay);
      m.spawnProjectile({ owner: f, x: f.x, y: f.y, angle: a, speed: 1300, range: 480, r: 10, dmg: 15 * P(lvl), color: '#f15bb5', kind: 'hook', tether: true,
        onHit: (e) => { m.knock(e, a + Math.PI, 700); m.status(e, 'stun', 0.25); },
        onWall: (x, y) => { m.startDash(f, angTo(f.x, f.y, x, y), Math.max(0, dist(f.x, f.y, x, y) - f.r - 4), 1500, {}); } });
      m.sfx('hook', f.x, f.y);
    },
  },
  // ---------------- Rime ----------------
  frost_nova: {
    name: 'Frost Nova', icon: '❄️', color: '#a0e7ff', cd: 8, tier: 3,
    desc: 'Blast frost around you, damaging and heavily slowing enemies.',
    ai: { type: 'self', range: 150 },
    cast(m, f, ax, ay, lvl) {
      const R = 150 + 10 * lvl;
      m.fx.ring(f.x, f.y, R, '#a0e7ff'); m.fx.burst(f.x, f.y, '#dff6ff', 30, 360);
      m.enemiesInRadius(f.x, f.y, R, f).forEach((e) => { m.damage(e, 22 * P(lvl), f, { kind: 'ice' }); m.status(e, 'slow', 2, 0.5); });
      m.sfx('ice', f.x, f.y);
    },
  },
  ice_wall: {
    name: 'Ice Wall', icon: '🧊', color: '#4cc9f0', cd: 11, tier: 2,
    desc: 'Freeze a thick ice wall at a target location.',
    ai: { type: 'defense', range: 400 },
    cast(m, f, ax, ay) {
      const p = aimClamp(f, ax, ay, 360); const perp = p.a + Math.PI / 2;
      for (let i = -3; i <= 3; i++) m.addTempWall({ x: p.x + Math.cos(perp) * i * 28, y: p.y + Math.sin(perp) * i * 28, r: 22, life: 3.8, color: '#a0e7ff' });
      m.sfx('ice', p.x, p.y);
    },
  },
  // ---------------- Rift ----------------
  decoy: {
    name: 'Decoy', icon: '🎭', color: '#ff4d6d', cd: 10, tier: 2,
    desc: 'Turn invisible and send a fake you running. It explodes when destroyed.',
    ai: { type: 'escape', range: 300 },
    cast(m, f, ax, ay, lvl) {
      const a = angTo(f.x, f.y, ax, ay);
      m.addDeployable({ type: 'decoy', owner: f, x: f.x, y: f.y, r: f.r, hp: 50, maxHp: 50, life: 4, angle: a, lure: true, hero: f.hero, skin: f.skin,
        onDeath: (d) => { m.fx.burst(d.x, d.y, '#ff4d6d', 24, 300); m.enemiesInRadius(d.x, d.y, 95, f).forEach((e) => m.damage(e, 22 * P(lvl), f, { kind: 'blast' })); } });
      m.status(f, 'invis', 1.2 + 0.3 * lvl);
      m.sfx('blink', f.x, f.y);
    },
  },
  rewind: {
    name: 'Rewind', icon: '⏪', color: '#2ec4b6', cd: 14, tier: 3,
    desc: 'Snap back to where you were 2.5s ago — and get back any health lost.',
    ai: { type: 'heal', range: 0 },
    cast(m, f) {
      const h = f.history[0]; if (!h) return;
      m.fx.bolt(f.x, f.y, h.x, h.y, '#2ec4b6');
      m.fx.burst(f.x, f.y, '#2ec4b6', 16, 220);
      f.x = h.x; f.y = h.y; f.hp = Math.max(f.hp, Math.min(f.maxHp, h.hp)); f.dash = null;
      m.fx.burst(f.x, f.y, '#2ec4b6', 16, 220);
      m.sfx('rewind', f.x, f.y);
    },
  },
  // ---------------- Nova ----------------
  sentry: {
    name: 'Sentry', icon: '🔫', color: '#ffbe0b', cd: 13, tier: 2,
    desc: 'Deploy an auto-turret that fires at nearby enemies.',
    ai: { type: 'self', range: 380 },
    cast(m, f, ax, ay, lvl) {
      const p = aimClamp(f, ax, ay, 90);
      m.addDeployable({ type: 'turret', owner: f, x: p.x, y: p.y, r: 18, hp: 60 * P(lvl), maxHp: 60 * P(lvl), life: 7, fireCd: 0, rate: 0.45, dmg: 7 * P(lvl), range: 400, angle: 0 });
      m.sfx('wall', p.x, p.y);
    },
  },
  grenade: {
    name: 'Grenade', icon: '💣', color: '#fb5607', cd: 8, tier: 3,
    desc: 'Lob a grenade over walls. Big boom, big knockback.',
    ai: { type: 'zone', range: 480 },
    cast(m, f, ax, ay, lvl) {
      const p = aimClamp(f, ax, ay, 480);
      m.lob(f, p.x, p.y, 0.6, '#fb5607', () => m.explode(p.x, p.y, 120, 40 * P(lvl), f, '#fb5607'));
    },
  },
  // ---------------- Wild (crate-only) ----------------
  black_hole: {
    name: 'Black Hole', icon: '🌀', color: '#7b2cbf', cd: 14, tier: 4, wild: true,
    desc: 'Open a singularity that drags enemies to its core.',
    ai: { type: 'zone', range: 450 },
    cast(m, f, ax, ay, lvl) {
      const p = aimClamp(f, ax, ay, 450);
      m.addZone({ x: p.x, y: p.y, r: 190, life: 2.4, owner: f, kind: 'hole', tickEvery: 0.05, color: '#7b2cbf', acc: 0,
        onTick: (z) => { z.acc += 0.05;
          m.enemiesInRadius(z.x, z.y, z.r, f).forEach((e) => { if (!e.isFighter) return; const a = angTo(e.x, e.y, z.x, z.y); m.push(e, Math.cos(a) * 9, Math.sin(a) * 9); if (z.acc >= 0.3) m.damage(e, 7 * P(lvl), f, { kind: 'void' }); });
          if (z.acc >= 0.3) z.acc = 0; } });
      m.sfx('hole', p.x, p.y);
    },
  },
  mine: {
    name: 'Proximity Mine', icon: '🧨', color: '#e63946', cd: 7, tier: 3, wild: true,
    desc: 'Plant a near-invisible mine. Enemies who step on it get launched.',
    ai: { type: 'defense', range: 200 },
    cast(m, f, ax, ay, lvl) {
      m.addDeployable({ type: 'mine', owner: f, x: f.x, y: f.y, r: 14, life: 25, arm: 0.6, dmg: 45 * P(lvl) });
      m.sfx('wall', f.x, f.y);
    },
  },
  rocket_leap: {
    name: 'Rocket Leap', icon: '🚀', color: '#ff006e', cd: 10, tier: 3, wild: true,
    desc: 'Rocket over walls to a target spot and slam down on landing.',
    ai: { type: 'gap', range: 400 },
    cast(m, f, ax, ay, lvl) {
      const p = aimClamp(f, ax, ay, 400);
      m.startLeap(f, p.x, p.y, 0.55, () => m.explode(f.x, f.y, 110, 25 * P(lvl), f, '#ff006e'));
      m.sfx('dash', f.x, f.y);
    },
  },
  lance: {
    name: 'Star Lance', icon: '🌠', color: '#fee440', cd: 9, tier: 4, wild: true,
    desc: 'Fire a long-range piercing lance through every enemy in its path.',
    ai: { type: 'shot', range: 850 },
    cast(m, f, ax, ay, lvl) {
      m.spawnProjectile({ owner: f, x: f.x, y: f.y, angle: angTo(f.x, f.y, ax, ay), speed: 1800, range: 950, r: 12, dmg: 48 * P(lvl), color: '#fee440', kind: 'lance', pierce: 99, glow: true });
      m.sfx('lance', f.x, f.y);
    },
  },
  reflect: {
    name: 'Mirror Shell', icon: '🪞', color: '#cdb4db', cd: 12, tier: 3, wild: true,
    desc: 'For a moment, enemy projectiles bounce right back at their owner.',
    ai: { type: 'defense', range: 500 },
    cast(m, f, ax, ay, lvl) { m.status(f, 'reflect', 1.1 + 0.25 * lvl); m.sfx('shield', f.x, f.y); },
  },
  siphon: {
    name: 'Soul Siphon', icon: '🩸', color: '#d00000', cd: 12, tier: 4, wild: true,
    desc: 'Tether the nearest enemy and drain their life into yours.',
    ai: { type: 'shot', range: 280 },
    cast(m, f, ax, ay, lvl) {
      const t = m.nearestEnemyTo(f.x, f.y, 300, f, f, true); if (!t) { m.fx.text(f.x, f.y - 40, 'no target', '#fff', 14); return; }
      m.addZone({ x: f.x, y: f.y, r: 0, life: 2, owner: f, kind: 'siphon', target: t, tickEvery: 0.2, color: '#d00000',
        onTick: (z) => { if (!t.alive || dist(f.x, f.y, t.x, t.y) > 360) { z.life = 0; return; } const d = m.damage(t, 4.5 * P(lvl), f, { kind: 'void' }); m.heal(f, d); } });
      m.sfx('zap', f.x, f.y);
    },
  },
};
export const ABILITY_IDS = Object.keys(ABILITIES);
for (const id of ABILITY_IDS) ABILITIES[id].id = id;

// ---------------- Ultimates (hero identity, not stealable) ----------------
export const ULTS = {
  meteor: { icon: '🌋', aim: true, range: 650, cast(m, f, ax, ay) {
    const p = aimClamp(f, ax, ay, 650);
    m.addZone({ x: p.x, y: p.y, r: 175, life: 1.0, owner: f, kind: 'telegraph', color: '#ff6b35',
      onEnd: () => { m.explode(p.x, p.y, 175, 72, f, '#ff6b35'); m.enemiesInRadius(p.x, p.y, 175, f).forEach((e) => m.status(e, 'burn', 3, 5, f)); m.fx.shake(16); } });
    m.sfx('ult', f.x, f.y);
  } },
  overcharge: { icon: '🔋', aim: false, cast(m, f) { m.status(f, 'overcharge', 5); m.status(f, 'haste', 5, 0.6); m.fx.ring(f.x, f.y, 90, '#f8f32b'); m.sfx('ult', f.x, f.y); } },
  fortress: { icon: '🏰', aim: false, cast(m, f) { m.status(f, 'fortress', 3.5); m.heal(f, 30); m.sfx('shield', f.x, f.y); m.sfx('ult', f.x, f.y); } },
  deadeye: { icon: '🎯', aim: false, cast(m, f) { f.deadeye = 3; m.status(f, 'deadeyeT', 7); m.status(f, 'reveal', 7); m.sfx('ult', f.x, f.y); } },
  overgrowth: { icon: '🌿', aim: true, range: 550, cast(m, f, ax, ay) {
    const p = aimClamp(f, ax, ay, 550);
    m.addZone({ x: p.x, y: p.y, r: 220, life: 4.2, owner: f, kind: 'jungle', tickEvery: 0.4, color: '#2d6a4f',
      onTick: (z) => { m.enemiesInRadius(z.x, z.y, z.r, f).forEach((e) => { m.damage(e, 9, f, { kind: 'root' }); m.status(e, 'slow', 0.6, 0.6); });
        if (dist(f.x, f.y, z.x, z.y) < z.r) m.heal(f, 5); } });
    m.sfx('root', p.x, p.y); m.sfx('ult', f.x, f.y);
  } },
  blizzard: { icon: '🌨️', aim: false, cast(m, f) {
    m.addZone({ x: f.x, y: f.y, r: 230, life: 5, owner: f, kind: 'blizzard', follow: f, tickEvery: 0.25, color: '#a0e7ff',
      onTick: (z) => m.enemiesInRadius(z.x, z.y, z.r, f).forEach((e) => { m.damage(e, 5.5, f, { kind: 'ice' }); m.status(e, 'slow', 0.5, 0.4); }) });
    m.sfx('ice', f.x, f.y); m.sfx('ult', f.x, f.y);
  } },
  mirror_army: { icon: '🪞', aim: false, cast(m, f) {
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; m.addDeployable({ type: 'clone', owner: f, x: f.x + Math.cos(a) * 50, y: f.y + Math.sin(a) * 50, r: f.r, hp: 45, maxHp: 45, life: 6, fireCd: rand(0.2, 0.6), angle: a, lure: true, hero: f.hero, skin: f.skin }); }
    m.sfx('blink', f.x, f.y); m.sfx('ult', f.x, f.y);
  } },
  bullet_storm: { icon: '🌪️', aim: false, cast(m, f) { m.status(f, 'bulletstorm', 2.5); f.stormAngle = f.aim; m.sfx('ult', f.x, f.y); } },
};

// tier used by bots for swap decisions and by UI for rarity glow
export const TIER_COLORS = { 2: '#4cc9f0', 3: '#b5179e', 4: '#ffd60a' };
export const clampAim = aimClamp;
export { clamp };
