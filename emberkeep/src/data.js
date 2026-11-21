// EMBERKEEP content + economy curves. Every number that shapes the long-term loop lives here.

// ---------------------------------------------------------------- wisps (merge units)
// dmg/rate at Lv1. Each merge level: dmg × 2^(L-1) × (1 + 0.1(L-1)). Max level 7.
export const WISPS = {
  flame: { name: 'Flame', icon: '🔥', color: '#ff7b2e', glow: '#ffb347', dmg: 10, rate: 1.9, range: 230, desc: 'Rapid fire at the closest threat to the Ember.', unlocked: true },
  frost: { name: 'Frost', icon: '❄️', color: '#7fdbff', glow: '#c8f4ff', dmg: 5, rate: 1.1, range: 215, slow: 0.3, desc: 'Chills targets, slowing them. Stronger chill per level.', unlocked: true },
  storm: { name: 'Storm', icon: '⚡', color: '#f9f871', glow: '#fffbd1', dmg: 8, rate: 0.95, range: 220, chain: 2, desc: 'Lightning that leaps between enemies. More jumps per level.', unlocked: true },
  stone: { name: 'Stone', icon: '🪨', color: '#c2a383', glow: '#e9d8c4', dmg: 24, rate: 0.55, range: 205, splash: 58, desc: 'Hurls boulders that crush everything nearby.', unlocked: true },
  gold: { name: 'Gold', icon: '🪙', color: '#ffd23f', glow: '#fff1a8', dmg: 4, rate: 1.0, range: 200, desc: 'Weak attacks, but mints Embers over time and on kills.', unlocked: true },
  venom: { name: 'Venom', icon: '☠️', color: '#9ef01a', glow: '#d9ff9e', dmg: 3, rate: 1.0, range: 215, poison: 5, desc: 'Stacking poison that melts tanky enemies.' },
  sun: { name: 'Sun', icon: '☀️', color: '#ffbe0b', glow: '#fff3b0', dmg: 0, rate: 0, range: 135, aura: 0.15, desc: 'Never attacks. Supercharges nearby wisps’ attack speed.' },
  void: { name: 'Void', icon: '🌀', color: '#b388ff', glow: '#e5d4ff', dmg: 4, rate: 0.75, range: 260, pct: 0.02, desc: 'Deals % of max health. The ultimate boss slayer.' },
  arc: { name: 'Arc', icon: '✨', color: '#ff70a6', glow: '#ffd6e7', dmg: 13, rate: 0.7, range: 300, pierce: true, desc: 'A piercing beam that cuts through every enemy in a line.' },
};
export const WISP_IDS = Object.keys(WISPS);
export const START_DECK = ['flame', 'frost', 'storm', 'stone', 'gold'];
export const MAX_LVL = 7;
export const levelMult = (L) => Math.pow(2, L - 1) * (1 + 0.1 * (L - 1));
// card (collection) levels: shards needed + coin cost to level a wisp permanently (+10% dmg each)
export const CARD_MAX = 20;
export const cardShards = (lvl) => Math.round(2 + Math.pow(lvl, 1.55) * 2);   // shards to go lvl → lvl+1
export const cardCoins = (lvl) => Math.round(60 * Math.pow(1.55, lvl));
export const cardMult = (lvl) => 1 + 0.1 * (lvl - 1);

// ---------------------------------------------------------------- enemies
export const ENEMIES = {
  grunt: { hp: 1, speed: 40, dmg: 5, r: 13, color: '#2b1d3a', eye: '#ff4d6d', from: 1 },
  runner: { hp: 0.55, speed: 78, dmg: 3, r: 10, color: '#1d2b3a', eye: '#4cc9f0', from: 4 },
  brute: { hp: 3.2, speed: 25, dmg: 12, r: 19, color: '#3a1d1d', eye: '#ff9f1c', from: 8 },
  swarm: { hp: 0.25, speed: 58, dmg: 2, r: 8, color: '#2a2a1a', eye: '#d9ed92', from: 12, group: 5 },
  ghost: { hp: 1.3, speed: 45, dmg: 6, r: 13, color: '#2d2d4a', eye: '#e0aaff', from: 16, phase: true },
  healer: { hp: 1.6, speed: 34, dmg: 4, r: 14, color: '#1a3a2a', eye: '#7CFC9A', from: 20, heal: true },
  splitter: { hp: 2, speed: 36, dmg: 7, r: 16, color: '#3a2a1a', eye: '#ffd166', from: 25, split: 3 },
  boss: { hp: 22, speed: 20, dmg: 45, r: 34, color: '#120a1f', eye: '#ff2d55', boss: true },
};
export const WAVE_TIME = 20;                       // seconds per wave (enemies carry over)
export const BASE_HP = 12;
export const HP_GROWTH = 1.115;
export const enemyHp = (w, tier) => BASE_HP * Math.pow(HP_GROWTH, w - 1) * TIERS[tier].hp;
export const waveCount = (w) => Math.min(34, Math.round(6 + w * 0.55));
export const embersPerKill = (w) => Math.ceil(2 + w * 0.22);
export const coinsForWave = (w, tier) => Math.round((5 + w * 1.25) * Math.pow(1.032, w) * TIERS[tier].coin);
export const summonCost = (n, disc = 0) => Math.round((10 + 8 * n) * (1 - disc));
export const powerCost = (lvl) => Math.round(60 * Math.pow(2.1, lvl));
export const POWER_STEP = 0.3;                       // +30% damage per in-run power level

// ---------------------------------------------------------------- tiers (long-term ladder)
export const TIERS = [
  { n: 1, name: 'Dusk', hp: 1, coin: 1, unlock: 0, color: '#ffb347' },
  { n: 2, name: 'Nightfall', hp: 3, coin: 2.1, unlock: 30, color: '#ff7b2e' },
  { n: 3, name: 'Midnight', hp: 9, coin: 4.3, unlock: 35, color: '#ff4d6d' },
  { n: 4, name: 'Witching Hour', hp: 27, coin: 8.8, unlock: 40, color: '#c77dff' },
  { n: 5, name: 'Black Moon', hp: 81, coin: 18, unlock: 45, color: '#7b2cbf' },
  { n: 6, name: 'Abyss', hp: 243, coin: 36, unlock: 50, color: '#4361ee' },
  { n: 7, name: 'Eclipse', hp: 729, coin: 72, unlock: 55, color: '#4cc9f0' },
  { n: 8, name: 'Endless Night', hp: 2187, coin: 145, unlock: 60, color: '#e0e0e0' },
];
// unlock = best wave needed in the PREVIOUS tier

// ---------------------------------------------------------------- workshop (instant, coins, exponential)
export const WORKSHOP = [
  { id: 'coreDmg', cat: 'Attack', name: 'Ember Bolt', icon: '🔥', desc: '+3 Ember attack damage', base: 15, g: 1.12, max: 9999, val: (l) => 6 + 3 * l, fmt: (v) => v.toFixed(0) },
  { id: 'wispDmg', cat: 'Attack', name: 'Wisp Power', icon: '✨', desc: '+6% damage for all wisps', base: 25, g: 1.13, max: 9999, val: (l) => 1 + 0.06 * l, fmt: (v) => '×' + v.toFixed(2) },
  { id: 'speed', cat: 'Attack', name: 'Quickening', icon: '💨', desc: '+2% attack speed', base: 40, g: 1.15, max: 50, val: (l) => 1 + 0.02 * l, fmt: (v) => '×' + v.toFixed(2) },
  { id: 'crit', cat: 'Attack', name: 'Keen Sparks', icon: '🎯', desc: '+1% critical chance', base: 50, g: 1.16, max: 40, val: (l) => 0.03 + 0.01 * l, fmt: (v) => (v * 100).toFixed(0) + '%' },
  { id: 'critDmg', cat: 'Attack', name: 'Searing Crits', icon: '💥', desc: '+10% critical damage', base: 50, g: 1.14, max: 9999, val: (l) => 1.5 + 0.1 * l, fmt: (v) => '×' + v.toFixed(1) },
  { id: 'hp', cat: 'Defense', name: 'Ember Heart', icon: '❤️', desc: '+15 Ember health', base: 15, g: 1.12, max: 9999, val: (l) => 100 + 15 * l, fmt: (v) => v.toFixed(0) },
  { id: 'regen', cat: 'Defense', name: 'Rekindle', icon: '♻️', desc: '+0.5 health regen per second', base: 30, g: 1.13, max: 9999, val: (l) => 0.5 * l, fmt: (v) => v.toFixed(1) + '/s' },
  { id: 'armor', cat: 'Defense', name: 'Ward Stones', icon: '🛡️', desc: '-1% damage from enemies', base: 60, g: 1.16, max: 50, val: (l) => 1 - 0.01 * l, fmt: (v) => '-' + ((1 - v) * 100).toFixed(0) + '%' },
  { id: 'nova', cat: 'Defense', name: 'Ember Nova', icon: '🌟', desc: 'Every 10s the Ember blasts nearby foes (+20% power)', base: 120, g: 1.17, max: 9999, val: (l) => (l ? 0.8 + 0.2 * l : 0), fmt: (v) => (v ? '×' + v.toFixed(1) : 'locked') },
  { id: 'embers', cat: 'Economy', name: 'Ember Harvest', icon: '🔶', desc: '+5% Embers per kill', base: 30, g: 1.14, max: 9999, val: (l) => 1 + 0.05 * l, fmt: (v) => '×' + v.toFixed(2) },
  { id: 'startEmbers', cat: 'Economy', name: 'Kindling', icon: '🪵', desc: '+10 starting Embers', base: 40, g: 1.15, max: 30, val: (l) => 40 + 10 * l, fmt: (v) => v.toFixed(0) },
  { id: 'coins', cat: 'Economy', name: 'Coin Purse', icon: '🪙', desc: '+4% coins from waves', base: 80, g: 1.17, max: 9999, val: (l) => 1 + 0.04 * l, fmt: (v) => '×' + v.toFixed(2) },
  { id: 'discount', cat: 'Economy', name: 'Summoner’s Pact', icon: '📜', desc: '-1% summon cost', base: 100, g: 1.2, max: 30, val: (l) => 0.01 * l, fmt: (v) => '-' + (v * 100).toFixed(0) + '%' },
];
export const wsCost = (w, l) => Math.round(w.base * Math.pow(w.g, l));

// ---------------------------------------------------------------- lab (real-time research — the "come back later" loop)
export const LAB = [
  { id: 'coinYield', name: 'Coin Alchemy', icon: '⚗️', desc: '+5% coins from everything', max: 50, time: 300, tg: 1.32, cost: 200, cg: 1.45, val: (l) => 1 + 0.05 * l },
  { id: 'offlineRate', name: 'Night Watch', icon: '🌙', desc: '+10% offline earning rate', max: 20, time: 600, tg: 1.35, cost: 300, cg: 1.5, val: (l) => 0.25 + 0.03 * l },
  { id: 'offlineCap', name: 'Long Vigil', icon: '⏳', desc: '+1h maximum offline time', max: 20, time: 900, tg: 1.3, cost: 400, cg: 1.5, val: (l) => 4 + l },
  { id: 'autoSummon', name: 'Auto-Summon', icon: '🤖', desc: 'Unlock automatic summoning (toggle in battle)', max: 1, time: 900, tg: 1, cost: 1500, cg: 1, val: (l) => l },
  { id: 'autoMerge', name: 'Auto-Merge', icon: '🧲', desc: 'Unlock automatic merging (toggle in battle)', max: 1, time: 3600, tg: 1, cost: 6000, cg: 1, val: (l) => l },
  { id: 'autoPower', name: 'Auto-Power', icon: '⚙️', desc: 'Unlock automatic power-ups (toggle in battle)', max: 1, time: 7200, tg: 1, cost: 20000, cg: 1, val: (l) => l },
  { id: 'speed2', name: 'Time Warp I', icon: '⏩', desc: 'Unlock 2× battle speed', max: 1, time: 600, tg: 1, cost: 800, cg: 1, val: (l) => l },
  { id: 'speed3', name: 'Time Warp II', icon: '⏭️', desc: 'Unlock 3× battle speed', max: 1, time: 10800, tg: 1, cost: 40000, cg: 1, val: (l) => l },
  { id: 'slots', name: 'Second Laboratory', icon: '🧪', desc: '+1 research slot', max: 2, time: 3600, tg: 4, cost: 5000, cg: 8, val: (l) => 1 + l },
  { id: 'startWisps', name: 'Ember Seeds', icon: '🌱', desc: 'Start each battle with +1 free wisp', max: 5, time: 1800, tg: 1.8, cost: 1200, cg: 2.2, val: (l) => l },
  { id: 'chestLuck', name: 'Lucky Embers', icon: '🍀', desc: '+10% shards from chests', max: 20, time: 1200, tg: 1.33, cost: 600, cg: 1.5, val: (l) => 1 + 0.1 * l },
  { id: 'cheapPower', name: 'Overclock', icon: '🔋', desc: '-4% power-up cost', max: 15, time: 900, tg: 1.33, cost: 700, cg: 1.5, val: (l) => 1 - 0.04 * l },
];
export const labTime = (r, l) => Math.round(r.time * Math.pow(r.tg, l));
export const labCost = (r, l) => Math.round(r.cost * Math.pow(r.cg, l));

// ---------------------------------------------------------------- cosmetics (visual only)
export const RARITY = { common: { name: 'Common', color: '#b0bec5' }, rare: { name: 'Rare', color: '#4cc9f0' }, epic: { name: 'Epic', color: '#c77dff' }, legendary: { name: 'Legendary', color: '#ffd60a' }, mythic: { name: 'Mythic', color: '#ff4d6d' } };
export const EMBER_SKINS = [
  { id: 'e_classic', name: 'Hearthfire', rarity: 'common', c: ['#ff7b2e', '#ffd23f', '#fff3b0'], price: null },
  { id: 'e_azure', name: 'Azure Flame', rarity: 'rare', c: ['#3a86ff', '#7fdbff', '#e0fbfc'], price: { gems: 80 } },
  { id: 'e_jade', name: 'Jade Spirit', rarity: 'rare', c: ['#2d6a4f', '#52b788', '#d8f3dc'], price: { gems: 80 } },
  { id: 'e_amethyst', name: 'Amethyst Soul', rarity: 'epic', c: ['#7209b7', '#c77dff', '#f3e8ff'], price: { gems: 160 } },
  { id: 'e_rose', name: 'Rose Gold', rarity: 'epic', c: ['#ff4d6d', '#ffb3c1', '#fff0f3'], price: { gems: 160 } },
  { id: 'e_solar', name: 'Solar Crown', rarity: 'legendary', c: ['#ffd60a', '#fff3b0', '#ffffff'], price: { gems: 320 }, crown: true },
  { id: 'e_void', name: 'Starless', rarity: 'mythic', c: ['#10002b', '#7b2cbf', '#e0aaff'], price: null, source: 'Reach Tier 5' },
];
export const THEMES = [
  { id: 't_forest', name: 'Haunted Forest', rarity: 'common', bg: ['#070b12', '#0e1a1f'], fog: '#1b2f2a', price: null },
  { id: 't_desert', name: 'Moonlit Dunes', rarity: 'rare', bg: ['#120d07', '#2a1f12'], fog: '#3a2c1a', price: { gems: 100 } },
  { id: 't_ice', name: 'Frozen Wastes', rarity: 'rare', bg: ['#060b14', '#122236'], fog: '#1f3a52', price: { gems: 100 } },
  { id: 't_crimson', name: 'Crimson Moor', rarity: 'epic', bg: ['#12060a', '#2a0f18'], fog: '#3a1422', price: { gems: 180 } },
];
export const COSMETICS = [...EMBER_SKINS, ...THEMES];

// ---------------------------------------------------------------- quests, achievements, login
export const QUESTS = [
  { id: 'waves', text: 'Survive {n} waves (total)', stat: 'waves', n: [40, 90], coins: 1.0, gems: 5 },
  { id: 'merges', text: 'Merge {n} wisps', stat: 'merges', n: [60, 150], coins: 0.8, gems: 5 },
  { id: 'bosses', text: 'Defeat {n} bosses', stat: 'bosses', n: [3, 8], coins: 1.2, gems: 8 },
  { id: 'kills', text: 'Banish {n} shadows', stat: 'kills', n: [800, 2000], coins: 1.0, gems: 5 },
  { id: 'lvl5', text: 'Create {n} Lv5+ wisps', stat: 'lvl5', n: [2, 5], coins: 1.2, gems: 8 },
  { id: 'power', text: 'Buy {n} in-battle power-ups', stat: 'powers', n: [10, 25], coins: 0.8, gems: 5 },
  { id: 'upgrade', text: 'Buy {n} workshop upgrades', stat: 'wsBuys', n: [15, 40], coins: 0.8, gems: 5 },
];
export const ACHIEVEMENTS = [
  { id: 'w10', name: 'First Light', desc: 'Reach wave 10', stat: 'bestWave', n: 10, gems: 10 },
  { id: 'w25', name: 'Night Owl', desc: 'Reach wave 25', stat: 'bestWave', n: 25, gems: 20 },
  { id: 'w50', name: 'Keeper of the Flame', desc: 'Reach wave 50', stat: 'bestWave', n: 50, gems: 40 },
  { id: 'w100', name: 'Undying Ember', desc: 'Reach wave 100', stat: 'bestWave', n: 100, gems: 80 },
  { id: 'l7', name: 'Perfect Wisp', desc: 'Create a Lv7 wisp', stat: 'maxLvl', n: 7, gems: 40 },
  { id: 'm1k', name: 'Master Merger', desc: 'Merge 1,000 wisps', stat: 'merges', n: 1000, gems: 30 },
  { id: 'm10k', name: 'Fusion Sage', desc: 'Merge 10,000 wisps', stat: 'merges', n: 10000, gems: 100 },
  { id: 'b50', name: 'Bane of Shadows', desc: 'Defeat 50 bosses', stat: 'bosses', n: 50, gems: 40 },
  { id: 'all', name: 'Full Choir', desc: 'Unlock all 9 wisps', stat: 'wispsOwned', n: 9, gems: 60 },
  { id: 't3', name: 'Into the Midnight', desc: 'Unlock Tier 3', stat: 'maxTier', n: 3, gems: 50 },
  { id: 't5', name: 'Black Moon Rising', desc: 'Unlock Tier 5', stat: 'maxTier', n: 5, gems: 100, skin: 'e_void' },
];
export const LOGIN = [{ coins: 1 }, { coins: 1.5 }, { gems: 10 }, { chest: 1 }, { gems: 15 }, { coins: 3 }, { gems: 40, chest: 1 }];
export const GEM_PACKS = [{ sku: 'gems_100', gems: 100, price: '$0.99' }, { sku: 'gems_550', gems: 550, price: '$4.99' }, { sku: 'gems_1200', gems: 1200, price: '$9.99', best: true }];
