// DRIFTLINE content: cars (balanced sidegrades), cups, cosmetics, quests.

// Every car has the same performance budget — different feel, no "better" car. Skill wins races.
export const CARS = [
  { id: 'sparrow', name: 'Sparrow', desc: 'Balanced and forgiving. A great all-rounder.', stars: 0, maxSpeed: 600, accel: 520, grip: 8, driftGrip: 1.7, turn: 3.0, charge: 1.0, mass: 1, shape: 'hatch', stats: [3, 3, 3, 3] },
  { id: 'mule', name: 'Mule', desc: 'Grippy and nimble. Corners like it is on rails.', stars: 3, maxSpeed: 575, accel: 565, grip: 10.5, driftGrip: 2.2, turn: 3.35, charge: 0.92, mass: 1.1, shape: 'truck', stats: [2, 4, 4, 2] },
  { id: 'viper', name: 'Viper', desc: 'Top-speed monster that slides at the slightest touch.', stars: 7, maxSpeed: 650, accel: 470, grip: 6.4, driftGrip: 1.5, turn: 2.8, charge: 0.95, mass: 1, shape: 'wedge', stats: [5, 2, 2, 3] },
  { id: 'comet', name: 'Comet', desc: 'Charges drift boosts faster than anything else.', stars: 12, maxSpeed: 588, accel: 600, grip: 7.6, driftGrip: 1.7, turn: 3.0, charge: 1.28, mass: 0.95, shape: 'bubble', stats: [3, 4, 3, 5] },
  { id: 'wraith', name: 'Wraith', desc: 'Built to drift. Long, low and very sideways.', stars: 18, maxSpeed: 615, accel: 500, grip: 6.0, driftGrip: 1.2, turn: 3.45, charge: 1.15, mass: 1, shape: 'coupe', stats: [4, 3, 2, 4] },
  { id: 'titan', name: 'Titan', desc: 'Heavy bruiser. Bumps rivals out of the racing line.', stars: 24, maxSpeed: 610, accel: 470, grip: 8.6, driftGrip: 1.9, turn: 2.8, charge: 1.0, mass: 1.9, shape: 'muscle', stats: [4, 2, 3, 3] },
];
export const CAR = Object.fromEntries(CARS.map((c) => [c.id, c]));

// Career cups: 3 handcrafted-seed tracks each. Stars: 1st = 3, 2nd = 2, 3rd = 1.
export const CUPS = [
  { id: 'neon', name: 'Neon Cup', color: '#4cc9f0', stars: 0, skill: 0.3, tracks: [{ name: 'Glowtown Loop', seed: 101 }, { name: 'Arcade Alley', seed: 238 }, { name: 'Pixel Park', seed: 377 }] },
  { id: 'sunset', name: 'Sunset Cup', color: '#ff9f1c', stars: 6, skill: 0.48, tracks: [{ name: 'Boulevard 88', seed: 412 }, { name: 'Palm Hairpins', seed: 561 }, { name: 'Golden Mile', seed: 693 }] },
  { id: 'chrome', name: 'Chrome Cup', color: '#c0c0c0', stars: 13, skill: 0.64, tracks: [{ name: 'Mirror Maze', seed: 744 }, { name: 'Steel Serpent', seed: 819 }, { name: 'Quicksilver', seed: 958 }] },
  { id: 'storm', name: 'Storm Cup', color: '#c77dff', stars: 20, skill: 0.8, tracks: [{ name: 'Thunder Run', seed: 1021 }, { name: 'Eye of Night', seed: 1163 }, { name: 'Voltage Peak', seed: 1290 }] },
  { id: 'legend', name: 'Legend Cup', color: '#ffd60a', stars: 28, skill: 0.93, tracks: [{ name: 'The Gauntlet', seed: 1337 }, { name: 'Infinity Drift', seed: 1488 }, { name: 'Crown Circuit', seed: 1600 }] },
];
export const LEAGUES = [
  { name: 'Rookie', min: 0, color: '#b0bec5', icon: '🔰' }, { name: 'Street', min: 60, color: '#cd7f32', icon: '🥉' }, { name: 'Pro', min: 160, color: '#c0c0c0', icon: '🥈' },
  { name: 'Elite', min: 320, color: '#ffd60a', icon: '🥇' }, { name: 'Master', min: 550, color: '#4cc9f0', icon: '💎' }, { name: 'Drift King', min: 850, color: '#ff4d6d', icon: '👑' },
];
export const leagueOf = (t) => { let l = LEAGUES[0]; for (const x of LEAGUES) if (t >= x.min) l = x; return l; };
export const RIVALS = ['Kenji', 'Roxy', 'Blaze', 'Nitro Nana', 'Max Torque', 'Lumi', 'Drifty McDriftface', 'Vex', 'Juno', 'Sly', 'Tsunami', 'Ace', 'Mira', 'Duke', 'Pixel', 'Zed', 'Cleo', 'Rook'];

// Cosmetics (visual only)
export const RARITY = { common: { name: 'Common', color: '#b0bec5' }, rare: { name: 'Rare', color: '#4cc9f0' }, epic: { name: 'Epic', color: '#c77dff' }, legendary: { name: 'Legendary', color: '#ffd60a' }, mythic: { name: 'Mythic', color: '#ff4d6d' } };
export const PAINTS = [
  { id: 'p_red', name: 'Racing Red', c1: '#e63946', c2: '#f1faee', rarity: 'common', price: null },
  { id: 'p_blue', name: 'Ocean', c1: '#1d4ed8', c2: '#93c5fd', rarity: 'common', price: { gold: 300 } },
  { id: 'p_lime', name: 'Acid Lime', c1: '#a3e635', c2: '#1a2e05', rarity: 'common', price: { gold: 300 } },
  { id: 'p_white', name: 'Ghost White', c1: '#f8f9fa', c2: '#212529', rarity: 'common', price: { gold: 300 } },
  { id: 'p_sunset', name: 'Sunset', c1: '#ff9f1c', c2: '#7b2cbf', rarity: 'rare', price: { gold: 900 } },
  { id: 'p_mint', name: 'Mint Chip', c1: '#7ae7c7', c2: '#3d2c2e', rarity: 'rare', price: { gold: 900 } },
  { id: 'p_bubble', name: 'Bubblegum', c1: '#ff8fab', c2: '#ffe5ec', rarity: 'rare', price: { gold: 900 } },
  { id: 'p_synth', name: 'Synthwave', c1: '#7209b7', c2: '#f72585', rarity: 'epic', price: { gems: 120 } },
  { id: 'p_carbon', name: 'Carbon Night', c1: '#1b1b1b', c2: '#ff4d6d', rarity: 'epic', price: { gems: 120 } },
  { id: 'p_gold', name: '24K Gold', c1: '#ffd60a', c2: '#3a2c00', rarity: 'legendary', price: { gems: 300 } },
  { id: 'p_chrome', name: 'Liquid Chrome', c1: '#dee2e6', c2: '#4cc9f0', rarity: 'legendary', price: { gems: 300 }, fx: 'chrome' },
  { id: 'p_king', name: 'Drift King', c1: '#10002b', c2: '#ffd60a', rarity: 'mythic', price: null, source: 'Reach the Drift King league', fx: 'chrome' },
];
export const DECALS = [
  { id: 'd_none', name: 'Clean', rarity: 'common', price: null }, { id: 'd_stripes', name: 'Twin Stripes', rarity: 'common', price: { gold: 400 } },
  { id: 'd_number', name: 'Race Number', rarity: 'rare', price: { gold: 800 } }, { id: 'd_checker', name: 'Checkered', rarity: 'rare', price: { gold: 800 } },
  { id: 'd_flames', name: 'Hot Flames', rarity: 'epic', price: { gems: 100 } }, { id: 'd_bolt', name: 'Lightning', rarity: 'epic', price: { gems: 100 } },
];
export const GLOWS = [
  { id: 'g_none', name: 'No Glow', color: null, rarity: 'common', price: null }, { id: 'g_cyan', name: 'Cyan Glow', color: '#4cc9f0', rarity: 'rare', price: { gold: 1000 } },
  { id: 'g_pink', name: 'Pink Glow', color: '#f72585', rarity: 'rare', price: { gold: 1000 } }, { id: 'g_green', name: 'Toxic Glow', color: '#7CFC9A', rarity: 'rare', price: { gold: 1000 } },
  { id: 'g_gold', name: 'Gold Glow', color: '#ffd60a', rarity: 'epic', price: { gems: 140 } }, { id: 'g_rainbow', name: 'Prism Glow', color: 'rainbow', rarity: 'legendary', price: { gems: 260 } },
];
export const SMOKES = [
  { id: 's_white', name: 'Classic Smoke', color: '#dddddd', rarity: 'common', price: null }, { id: 's_pink', name: 'Pink Smoke', color: '#ff8fab', rarity: 'rare', price: { gold: 700 } },
  { id: 's_blue', name: 'Blue Smoke', color: '#90e0ef', rarity: 'rare', price: { gold: 700 } }, { id: 's_black', name: 'Burnout Black', color: '#333', rarity: 'rare', price: { gold: 700 } },
  { id: 's_rainbow', name: 'Rainbow Smoke', color: 'rainbow', rarity: 'legendary', price: { gems: 240 } },
];
export const ALL_ITEMS = [...PAINTS, ...DECALS, ...GLOWS, ...SMOKES];

export const QUESTS = [
  { id: 'races', text: 'Finish {n} races', stat: 'races', n: [3, 5], gold: 120 },
  { id: 'wins', text: 'Win {n} races', stat: 'wins', n: [1, 3], gold: 180 },
  { id: 'drift', text: 'Drift for {n} seconds total', stat: 'driftTime', n: [60, 140], gold: 150 },
  { id: 'purple', text: 'Fire {n} purple boosts', stat: 'boost3', n: [5, 12], gold: 160 },
  { id: 'pass', text: 'Overtake {n} rivals', stat: 'overtakes', n: [8, 20], gold: 140 },
  { id: 'clean', text: 'Finish {n} laps without going off-track', stat: 'cleanLaps', n: [3, 6], gold: 170 },
  { id: 'daily', text: 'Set a time on the Daily Track', stat: 'dailyRuns', n: [1, 1], gold: 120 },
];
export const ACHIEVEMENTS = [
  { id: 'firstwin', name: 'Chequered Flag', desc: 'Win your first race', stat: 'wins', n: 1, r: { gems: 30 } },
  { id: 'wins25', name: 'Podium Regular', desc: 'Win 25 races', stat: 'wins', n: 25, r: { gems: 80 } },
  { id: 'drift10', name: 'Sideways', desc: 'Drift for 10 minutes total', stat: 'driftTime', n: 600, r: { gems: 40 } },
  { id: 'purple100', name: 'Ultraviolet', desc: 'Fire 100 purple boosts', stat: 'boost3', n: 100, r: { gems: 50 } },
  { id: 'stars15', name: 'Cup Hunter', desc: 'Earn 15 career stars', stat: 'stars', n: 15, r: { gems: 50 } },
  { id: 'stars45', name: 'Grand Champion', desc: 'Earn all 45 career stars', stat: 'stars', n: 45, r: { gems: 150 } },
  { id: 'gold10', name: 'Gold Rush', desc: 'Earn 10 gold medals on Daily Tracks', stat: 'golds', n: 10, r: { gems: 60 } },
  { id: 'king', name: 'Long Live the King', desc: 'Reach the Drift King league', stat: 'trophiesMax', n: 850, r: { paint: 'p_king', gems: 100 } },
];
export const LOGIN = [{ gold: 100 }, { gold: 150 }, { gems: 10 }, { gold: 250 }, { gems: 15 }, { gold: 400 }, { gems: 40 }];
export const GEM_PACKS = [{ sku: 'gems_100', gems: 100, price: '$0.99' }, { sku: 'gems_550', gems: 550, price: '$4.99' }, { sku: 'gems_1200', gems: 1200, price: '$9.99', best: true }];
