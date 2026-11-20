// HORDEMIND content: species, queens, heroes (bosses), evolutions, hive, cosmetics, quests.

// ---- Minion species. cost = biomass to spawn.
export const SPECIES = {
  drone:     { name: 'Drone', icon: '🐜', hp: 10, dmg: 3, rate: 0.6, speed: 300, r: 9, cost: 5, range: 0, color: '#7CFC9A', desc: 'Reliable melee biter. The backbone of any brood.' },
  spitter:   { name: 'Spitter', icon: '🦂', hp: 7, dmg: 2.6, rate: 0.85, speed: 280, r: 9, cost: 8, range: 230, color: '#ffd166', desc: 'Lobs acid from range. Stays out of melee sweeps.' },
  bomber:    { name: 'Bomber', icon: '🪲', hp: 6, dmg: 26, rate: 0, speed: 340, r: 10, cost: 10, range: 0, color: '#ff6b6b', desc: 'Rushes in and explodes for big area damage.', bomb: 60 },
  brute:     { name: 'Brute', icon: '🦏', hp: 55, dmg: 7, rate: 1.0, speed: 220, r: 15, cost: 15, range: 0, color: '#9d8df1', desc: 'Huge, slow, and absorbs the hero\'s attention.' },
  leech:     { name: 'Leech', icon: '🦟', hp: 8, dmg: 2, rate: 0.7, speed: 310, r: 8, cost: 9, range: 0, color: '#ff7eb6', desc: 'Every bite heals your Queen.', heal: 0.8 },
  swarmling: { name: 'Swarmling', icon: '🐛', hp: 3, dmg: 1.4, rate: 0.35, speed: 360, r: 6, cost: 2, range: 0, color: '#4cc9f0', desc: 'Tiny, cheap and absurdly fast. Comes in waves.' },
};

// ---- Queens = the "hero select". Each brings 2 species + a signature ability.
export const QUEENS = [
  { id: 'vyx', name: 'Mother Vyx', title: 'The Patient', color: '#7CFC9A', color2: '#2d6a4f', brood: ['drone', 'spitter'], ability: { id: 'frenzy', name: 'Frenzy', icon: '💢', cd: 16, desc: 'All minions attack 70% faster for 5s.' }, unlock: { stars: 0 } },
  { id: 'skitter', name: 'Skitter', title: 'The Countless', color: '#4cc9f0', color2: '#3a0ca3', brood: ['swarmling', 'bomber'], ability: { id: 'burst', name: 'Burst Brood', icon: '🥚', cd: 18, desc: 'Instantly hatch 14 free Swarmlings.' }, unlock: { stars: 2 } },
  { id: 'glutt', name: 'Glutt', title: 'The Devourer', color: '#9d8df1', color2: '#5a189a', brood: ['brute', 'leech'], ability: { id: 'devour', name: 'Devour', icon: '👄', cd: 20, desc: 'Vacuum every biomass orb on screen and heal 30.' }, unlock: { stars: 5 } },
  { id: 'nyx', name: 'Nyx', title: 'The Veiled', color: '#c77dff', color2: '#10002b', brood: ['drone', 'bomber'], ability: { id: 'phase', name: 'Phase Veil', icon: '🌫️', cd: 12, desc: 'Your whole swarm becomes untouchable for 2.5s.' }, unlock: { stars: 9 } },
  { id: 'oozra', name: 'Oozra', title: 'The Corroder', color: '#b5e48c', color2: '#386641', brood: ['spitter', 'leech'], ability: { id: 'acid', name: 'Acid Rain', icon: '☔', cd: 15, desc: 'Drench the hero in acid: heavy damage over 4s.' }, unlock: { stars: 13 } },
];
export const QUEEN = Object.fromEntries(QUEENS.map((q) => [q.id, q]));

// ---- Heroes (the bosses you hunt). Abilities are telegraphed shapes: dodge them by pulling your swarm away.
// shape: circle(r) | cone(r,arc) | line(len,w) | ring(r,w) ; target: swarm | queen | self ; multi: n copies
export const HEROES = [
  { id: 'aldric', name: 'Sir Aldric', title: 'the Paladin', color: '#f4d35e', color2: '#e5e5e5', look: 'knight', hp: 13000, speed: 165, prefer: 60, stars: 0,
    basic: { shape: 'cone', r: 125, arc: 1.6, dmg: 22, delay: 0.32, rate: 1.05 },
    abilities: [
      { name: 'Whirlwind', shape: 'circle', target: 'self', r: 175, dmg: 30, delay: 0.85, cd: 6, lvl: 1 },
      { name: 'Judgment', shape: 'line', target: 'queen', len: 520, w: 70, dmg: 35, delay: 0.9, cd: 9, lvl: 2, special: 'dash' },
      { name: 'Holy Nova', shape: 'ring', target: 'self', r: 300, w: 90, dmg: 30, delay: 1.1, cd: 11, lvl: 4 },
      { name: 'Aegis', shape: 'none', target: 'self', cd: 14, lvl: 6, special: 'shield' },
    ] },
  { id: 'ignis', name: 'Ignis', title: 'the Pyromancer', color: '#ff6b35', color2: '#7b2cbf', look: 'wizard', hp: 10000, speed: 155, prefer: 240, stars: 2,
    basic: { shape: 'line', len: 380, w: 34, dmg: 20, delay: 0.38, rate: 0.95, target: 'swarm' },
    abilities: [
      { name: 'Dragon Breath', shape: 'cone', target: 'swarm', r: 330, arc: 0.9, dmg: 30, delay: 0.9, cd: 6, lvl: 1 },
      { name: 'Meteor Shower', shape: 'circle', target: 'swarm', r: 95, dmg: 40, delay: 1.1, cd: 9, lvl: 2, multi: 4, spread: 200 },
      { name: 'Ring of Fire', shape: 'ring', target: 'self', r: 230, w: 70, dmg: 35, delay: 1.0, cd: 10, lvl: 4 },
      { name: 'Blink', shape: 'none', target: 'self', cd: 8, lvl: 3, special: 'blink' },
    ] },
  { id: 'lyra', name: 'Lyra', title: 'the Ranger', color: '#80ed99', color2: '#6f4518', look: 'hood', hp: 9500, speed: 185, prefer: 320, stars: 4,
    basic: { shape: 'line', len: 520, w: 22, dmg: 18, delay: 0.3, rate: 0.75 },
    abilities: [
      { name: 'Volley', shape: 'line', target: 'swarm', len: 560, w: 40, dmg: 28, delay: 0.75, cd: 6, lvl: 1, multi: 5, fan: 0.22 },
      { name: 'Bear Trap', shape: 'circle', target: 'queen', r: 70, dmg: 25, delay: 1.2, cd: 10, lvl: 2, special: 'root' },
      { name: 'Rain of Arrows', shape: 'circle', target: 'swarm', r: 220, dmg: 32, delay: 1.4, cd: 11, lvl: 4 },
      { name: 'Tumble', shape: 'none', target: 'self', cd: 5, lvl: 3, special: 'roll' },
    ] },
  { id: 'frostbeard', name: 'Frostbeard', title: 'the Glacier', color: '#a0e7ff', color2: '#4361ee', look: 'beard', hp: 12500, speed: 140, prefer: 90, stars: 6,
    basic: { shape: 'cone', r: 140, arc: 1.3, dmg: 24, delay: 0.38, rate: 1.2 },
    abilities: [
      { name: 'Ice Spikes', shape: 'line', target: 'swarm', len: 640, w: 80, dmg: 32, delay: 0.95, cd: 7, lvl: 1 },
      { name: 'Deep Freeze', shape: 'circle', target: 'swarm', r: 200, dmg: 15, delay: 1.0, cd: 10, lvl: 2, special: 'freeze' },
      { name: 'Blizzard', shape: 'circle', target: 'self', r: 260, dmg: 0, delay: 0.6, cd: 13, lvl: 4, special: 'blizzard' },
      { name: 'Avalanche', shape: 'line', target: 'queen', len: 700, w: 130, dmg: 40, delay: 1.3, cd: 12, lvl: 6 },
    ] },
  { id: 'gearwright', name: 'Gearwright', title: 'the Engineer', color: '#ffbe0b', color2: '#495057', look: 'goggles', hp: 10500, speed: 150, prefer: 260, stars: 8,
    basic: { shape: 'line', len: 420, w: 28, dmg: 16, delay: 0.3, rate: 0.6, target: 'swarm' },
    abilities: [
      { name: 'Deploy Turret', shape: 'none', target: 'self', cd: 9, lvl: 1, special: 'turret' },
      { name: 'Laser Sweep', shape: 'line', target: 'swarm', len: 700, w: 50, dmg: 30, delay: 0.7, cd: 8, lvl: 2, multi: 4, sweep: 0.45 },
      { name: 'Minefield', shape: 'circle', target: 'swarm', r: 70, dmg: 35, delay: 1.6, cd: 11, lvl: 4, multi: 6, spread: 260 },
      { name: 'Overclock', shape: 'none', target: 'self', cd: 15, lvl: 6, special: 'haste' },
    ] },
  { id: 'morwen', name: 'Morwen', title: 'the Necromancer', color: '#b8f2e6', color2: '#3c096c', look: 'skull', hp: 10000, speed: 150, prefer: 280, stars: 11,
    basic: { shape: 'line', len: 460, w: 30, dmg: 18, delay: 0.35, rate: 0.8, target: 'swarm' },
    abilities: [
      { name: 'Raise Dead', shape: 'none', target: 'self', cd: 8, lvl: 1, special: 'raise' },
      { name: 'Bone Prison', shape: 'ring', target: 'queen', r: 160, w: 50, dmg: 30, delay: 1.1, cd: 9, lvl: 2 },
      { name: 'Soul Harvest', shape: 'circle', target: 'swarm', r: 240, dmg: 26, delay: 1.2, cd: 10, lvl: 4, special: 'drain' },
      { name: 'Death Coil', shape: 'line', target: 'queen', len: 600, w: 60, dmg: 45, delay: 0.9, cd: 12, lvl: 6 },
    ] },
];
export const HERO = Object.fromEntries(HEROES.map((h) => [h.id, h]));
export const DIFFS = [
  { id: 0, name: 'Normal', hp: 1, dmg: 1, cd: 1, color: '#7CFC9A' },
  { id: 1, name: 'Heroic', hp: 1.6, dmg: 1.25, cd: 0.85, color: '#ffd60a' },
  { id: 2, name: 'Legendary', hp: 2.4, dmg: 1.5, cd: 0.72, color: '#ff4d6d' },
];
export const LEVEL_TIME = 28;   // hero levels up every N seconds
export const MAX_LEVEL = 8;     // after this + ENRAGE_AFTER, the hero enrages
export const ENRAGE_AFTER = 40;

// ---- Evolution cards (in-run roguelite choices)
export const EVOLUTIONS = [
  { id: 'sp_drone', kind: 'species', sp: 'drone', name: 'Drone Hatchery', icon: '🐜', desc: 'Drones join your brood.' },
  { id: 'sp_spitter', kind: 'species', sp: 'spitter', name: 'Acid Sacs', icon: '🦂', desc: 'Spitters join your brood.' },
  { id: 'sp_bomber', kind: 'species', sp: 'bomber', name: 'Volatile Eggs', icon: '🪲', desc: 'Bombers join your brood.' },
  { id: 'sp_brute', kind: 'species', sp: 'brute', name: 'Titan Larvae', icon: '🦏', desc: 'Brutes join your brood.' },
  { id: 'sp_leech', kind: 'species', sp: 'leech', name: 'Blood Pact', icon: '🦟', desc: 'Leeches join your brood.' },
  { id: 'sp_swarmling', kind: 'species', sp: 'swarmling', name: 'Endless Clutch', icon: '🐛', desc: 'Swarmlings join your brood.' },
  { id: 'dmg', name: 'Razor Mandibles', icon: '🦷', desc: '+25% minion damage.', stack: true },
  { id: 'hp', name: 'Chitin Plating', icon: '🛡️', desc: '+35% minion health.', stack: true },
  { id: 'spawn', name: 'Hyperbrood', icon: '🥚', desc: 'Hatch 40% faster and +15 swarm cap.', stack: true },
  { id: 'speed', name: 'Pheromone Rush', icon: '💨', desc: '+20% minion speed.', stack: true },
  { id: 'acid', name: 'Acid Blood', icon: '🧪', desc: 'Fallen minions leave acid that burns the hero.' },
  { id: 'split', name: 'Mitosis', icon: '🧬', desc: 'Drones & Brutes split into Swarmlings when they die.' },
  { id: 'venom', name: 'Neurotoxin', icon: '☠️', desc: 'Bites poison the hero (stacking damage over time).' },
  { id: 'jelly', name: 'Royal Jelly', icon: '👑', desc: 'Queen +40 max health and full heal.', stack: true },
  { id: 'harvest', name: 'Rich Biomass', icon: '🟢', desc: 'Biomass orbs +50% value and bigger pickup range.', stack: true },
  { id: 'volatile', name: 'Unstable Genome', icon: '💥', desc: '20% of fallen minions explode on death.' },
  { id: 'cooldown', name: 'Hive Mind', icon: '🧠', desc: 'Queen ability recharges 35% faster.', stack: true },
  { id: 'carapace', name: 'Hardened Queen', icon: '🐚', desc: 'Queen takes 30% less damage.' },
];
export const EVO = Object.fromEntries(EVOLUTIONS.map((e) => [e.id, e]));

// ---- Hive buildings (Clash-style steady progress, paid with Ichor earned by hunting — never with money)
export const BUILDINGS = [
  { id: 'brood', name: 'Brood Chamber', icon: '🥚', desc: '+3 starting minions per level', max: 10 },
  { id: 'vats', name: 'Biomass Vats', icon: '🧫', desc: '+15 starting biomass per level', max: 10 },
  { id: 'forge', name: 'Mandible Forge', icon: '🦷', desc: '+5% minion damage per level', max: 10 },
  { id: 'chitin', name: 'Chitin Works', icon: '🛡️', desc: '+6% minion health per level', max: 10 },
  { id: 'royal', name: 'Royal Chamber', icon: '👑', desc: '+10 Queen health per level', max: 10 },
  { id: 'pit', name: 'Evolution Pit', icon: '🧬', desc: '+1 evolution reroll per hunt per level', max: 3 },
];
export const buildCost = (lvl) => Math.round(60 * Math.pow(1.55, lvl));

// ---- Cosmetics (visual only)
export const RARITY = { common: { name: 'Common', color: '#b0bec5' }, rare: { name: 'Rare', color: '#4cc9f0' }, epic: { name: 'Epic', color: '#c77dff' }, legendary: { name: 'Legendary', color: '#ffd60a' }, mythic: { name: 'Mythic', color: '#ff4d6d' } };
export const PALETTES = [ // tints the whole swarm
  { id: 'natural', name: 'Natural', rarity: 'common', tint: null, price: null },
  { id: 'ember', name: 'Ember Brood', rarity: 'rare', tint: ['#ff9f1c', '#ff4d6d', '#ffd166'], price: { gold: 900 } },
  { id: 'toxic', name: 'Toxic Bloom', rarity: 'rare', tint: ['#b5e48c', '#52b788', '#d9ed92'], price: { gold: 900 } },
  { id: 'abyss', name: 'Abyssal', rarity: 'epic', tint: ['#3a0ca3', '#7209b7', '#4cc9f0'], price: { gems: 140 } },
  { id: 'candy', name: 'Candy Swarm', rarity: 'epic', tint: ['#ff8fab', '#ffc8dd', '#bde0fe'], price: { gems: 140 } },
  { id: 'gold', name: 'Midas Horde', rarity: 'legendary', tint: ['#ffd60a', '#fff3b0', '#ffb703'], price: { gems: 300 } },
  { id: 'void', name: 'Starless Void', rarity: 'mythic', tint: ['#10002b', '#e0aaff', '#240046'], price: null, source: 'Achievement: slay every hero on Legendary' },
];
export const QUEEN_SKINS = [
  { id: 'q_default', name: 'Classic', rarity: 'common', price: null },
  { id: 'q_crystal', name: 'Crystal Crown', rarity: 'rare', price: { gold: 1200 }, crown: '#a0e7ff' },
  { id: 'q_inferno', name: 'Inferno Mantle', rarity: 'epic', price: { gems: 160 }, crown: '#ff6b35', glow: '#ff9f1c' },
  { id: 'q_empress', name: 'Golden Empress', rarity: 'legendary', price: { gems: 320 }, crown: '#ffd60a', glow: '#fff3b0' },
];
export const SPLATS = [
  { id: 'goo', name: 'Goo', rarity: 'common', price: null },
  { id: 'confetti', name: 'Party Pop', rarity: 'rare', price: { gold: 700 } },
  { id: 'hearts', name: 'Lovebugs', rarity: 'rare', price: { gold: 700 } },
  { id: 'stars', name: 'Stardust', rarity: 'epic', price: { gems: 120 } },
];

export const QUESTS = [
  { id: 'hunts', text: 'Complete {n} hunts', stat: 'hunts', n: [2, 4], gold: 120, ichor: 40 },
  { id: 'slay', text: 'Slay {n} hero', stat: 'wins', n: [1, 2], gold: 180, ichor: 70 },
  { id: 'spawn', text: 'Hatch {n} minions', stat: 'spawned', n: [300, 700], gold: 140, ichor: 50 },
  { id: 'dmg', text: 'Deal {n} damage to heroes', stat: 'damage', n: [8000, 20000], gold: 150, ichor: 60 },
  { id: 'evo', text: 'Choose {n} evolutions', stat: 'evos', n: [6, 12], gold: 120, ichor: 40 },
  { id: 'ability', text: 'Use your Queen ability {n} times', stat: 'abilities', n: [8, 15], gold: 110, ichor: 35 },
  { id: 'fast', text: 'Slay a hero in under {n}s', stat: 'fastest', n: [180, 150], gold: 220, ichor: 90, min: true },
];
export const ACHIEVEMENTS = [
  { id: 'first', name: 'First Blood', desc: 'Slay your first hero', stat: 'wins', n: 1, r: { gems: 30 } },
  { id: 'swarm1k', name: 'Thousand Legs', desc: 'Hatch 1,000 minions', stat: 'spawned', n: 1000, r: { gems: 20 } },
  { id: 'swarm10k', name: 'Plague', desc: 'Hatch 10,000 minions', stat: 'spawned', n: 10000, r: { gems: 60 } },
  { id: 'stars9', name: 'Apex Predator', desc: 'Earn 9 stars', stat: 'stars', n: 9, r: { gems: 50 } },
  { id: 'stars18', name: 'Hive Sovereign', desc: 'Earn all 18 stars', stat: 'stars', n: 18, r: { palette: 'void', gems: 150 } },
  { id: 'wins25', name: 'Hero Hunter', desc: 'Slay 25 heroes', stat: 'wins', n: 25, r: { gems: 80 } },
  { id: 'cap', name: 'Living Tide', desc: 'Command 100 minions at once', stat: 'maxSwarm', n: 100, r: { gems: 30 } },
  { id: 'speed', name: 'Blitz Brood', desc: 'Slay a hero in under 90 seconds', stat: 'fastestInv', n: 1, r: { gems: 40 } },
];
export const LOGIN = [{ gold: 100 }, { gold: 150 }, { gems: 10 }, { ichor: 80 }, { gems: 15 }, { gold: 400 }, { gems: 40 }];
export const GEM_PACKS = [
  { sku: 'gems_100', gems: 100, price: '$0.99' }, { sku: 'gems_550', gems: 550, price: '$4.99' }, { sku: 'gems_1200', gems: 1200, price: '$9.99', best: true },
];
