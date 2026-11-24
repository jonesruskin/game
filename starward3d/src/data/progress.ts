// Commander levels (XP from everything you do) and the first objective chain.
export const MAX_LEVEL = 100;
export const xpNeed = (L: number) => Math.round(40 * Math.pow(L, 1.85));
export const levelReward = (L: number) => ({ dm: 3 + Math.floor(L / 5), credits: 100 * L });
export interface Step { id: string; text: string; kind: string; n?: number; t?: string; reward: Record<string, number>; hint?: string; }
// Each step pays out; the first ones double as the tutorial.
export const STEPS: Step[] = [
  { id: 'a1', text: 'Tap the Solar Bay to collect the credits Helio earned', kind: 'collect', n: 1, reward: { credits: 150 }, hint: 'bay' },
  { id: 'a2', text: 'Start a recipe at the Fabricator', kind: 'craft', n: 1, reward: { cells: 20 }, hint: 'fab' },
  { id: 'a3', text: 'Harvest Power Cells from the Fabricator', kind: 'harvest', n: 1, reward: { credits: 100 }, hint: 'fab' },
  { id: 'a4', text: 'Feed Helio until it reaches level 2', kind: 'botLevel', n: 2, reward: { cells: 40, dm: 5 }, hint: 'bay' },
  { id: 'a5', text: 'Recruit Ember from the Shop (Bots tab)', kind: 'ownSpecies', t: 'ember', reward: { credits: 200 }, hint: 'shop' },
  { id: 'a6', text: 'Build a Plasma Bay so Ember has a home', kind: 'bayEl', t: 'plasma', reward: { credits: 250 }, hint: 'shop' },
  { id: 'a7', text: 'Upgrade the Command Center to level 2', kind: 'cc', n: 2, reward: { dm: 10, credits: 300 }, hint: 'command' },
  { id: 'a8', text: 'Place a decoration (Shop → Decor)', kind: 'decor', n: 1, reward: { credits: 150 } },
  { id: 'a9', text: 'Raise any bot to level 4', kind: 'botLevel', n: 4, reward: { cells: 150, dm: 10 } },
  { id: 'a10', text: 'Upgrade a Bay to level 2 (more credit storage)', kind: 'bayLevel', n: 2, reward: { credits: 500 } },
  { id: 'a11', text: 'Expand the island: buy a new plot of land', kind: 'land', n: 1, reward: { dm: 15 } },
  { id: 'a12', text: 'Run 4 bots', kind: 'bots', n: 4, reward: { credits: 800 } },
  { id: 'a13', text: 'Reach Commander level 6', kind: 'level', n: 6, reward: { dm: 20 } },
  { id: 'a14', text: 'Upgrade the Command Center to level 4', kind: 'cc', n: 4, reward: { credits: 2500, dm: 15 } },
  { id: 'b1', text: 'Build the Assembly Bay (Shop → Buildings)', kind: 'build', t: 'assembly', reward: { credits: 1000, dm: 10 } },
  { id: 'b2', text: 'Post a bot as a helper at the Fabricator (tap a bot)', kind: 'helper', reward: { cells: 300 } },
  { id: 'b3', text: 'Build the Fusion Lab', kind: 'build', t: 'fusion', reward: { credits: 1500, dm: 15 } },
  { id: 'b4', text: 'Fuse two level-4 bots in the Fusion Lab', kind: 'fusions', n: 1, reward: { cells: 400, dm: 10 } },
  { id: 'b5', text: 'Boot the new core in the Assembly Bay and activate it', kind: 'boots', n: 1, reward: { credits: 1500 } },
  { id: 'a15', text: 'Recruit an Advanced hybrid bot', kind: 'rarity', t: 'advanced', reward: { dm: 30 } },
  { id: 'b6', text: 'Discover 12 species in the Botdex', kind: 'dex', n: 12, reward: { dm: 25 } },
  { id: 'b7', text: 'Upgrade the Command Center to level 6', kind: 'cc', n: 6, reward: { credits: 8000, dm: 20 } },
  { id: 'b8', text: 'Fuse an Elite bot (three elements)', kind: 'rarity', t: 'elite', reward: { dm: 40 } },
  { id: 'b9', text: 'Discover 25 species', kind: 'dex', n: 25, reward: { dm: 40 } },
  { id: 'b10', text: 'Fuse an Epic bot', kind: 'rarity', t: 'epic', reward: { dm: 60 } },
  { id: 'b11', text: 'Reach Commander level 20', kind: 'level', n: 20, reward: { dm: 50 } },
];
