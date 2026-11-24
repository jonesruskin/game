// Buildings. Placed freely on the island grid; footprints are [width, depth] in tiles (swapped when rotated).
// Command Center level caps every other building's level and how many bays and fabricators you may run.
import { round2 } from '../core/util';
export type Cat = 'core' | 'bay' | 'production' | 'decor';
export interface BuildingDef {
  name: string; size: [number, number]; cat: Cat; max: number; unique?: boolean; unlock: number; desc: string;
  /** credits to build (owned = how many of this kind you already have) */
  buildCost: (owned: number) => number;
  /** credits to upgrade from level L to L+1 */
  upCost: (L: number) => number;
  /** seconds to build (L=1) or reach level L */
  time: (L: number) => number;
}
const T = [3, 20, 60, 180, 600, 1800, 3600, 2 * 3600, 4 * 3600, 8 * 3600, 12 * 3600, 16 * 3600, 24 * 3600, 36 * 3600, 48 * 3600];
const tl = (L: number, off = 0) => T[Math.min(T.length - 1, Math.max(0, L - 1 + off))];
const decor = (name: string, size: [number, number], cost: number, unlock: number, desc: string): BuildingDef =>
  ({ name, size, cat: 'decor', max: 1, unlock, desc, buildCost: () => cost, upCost: () => 0, time: () => 0 });
export const BUILDINGS: Record<string, BuildingDef> = {
  command: { name: 'Command Center', size: [4, 4], cat: 'core', max: 15, unique: true, unlock: 1, desc: 'The heart of your colony. Its level sets how far every other building can grow, and how many Bays and Fabricators you can run.',
    buildCost: () => 0, upCost: (L) => round2(400 * Math.pow(2.05, L - 1)), time: (L) => tl(L, 0) },
  bay: { name: 'Bot Bay', size: [3, 3], cat: 'bay', max: 10, unlock: 1, desc: 'Home and charging dock for bots of its element. Bots earn credits here; the bay holds them until you collect.',
    buildCost: (n) => round2(150 * Math.pow(1.6, n)), upCost: (L) => round2(250 * Math.pow(1.9, L - 1)), time: (L) => tl(L, -1) },
  fab: { name: 'Fabricator', size: [3, 3], cat: 'production', max: 10, unlock: 1, desc: 'Prints Power Cells for your bots. Pick a recipe that matches when you will be back.',
    buildCost: (n) => round2(300 * Math.pow(2.4, n)), upCost: (L) => round2(400 * Math.pow(1.95, L - 1)), time: (L) => tl(L, -1) },
  // decorations: the personal touch (no gameplay effect beyond XP on purchase)
  tree:     decor('Holo Tree', [1, 1], 40, 1, 'A glowing tree grown from engineered moss and fibre optics.'),
  rock:     decor('Moon Rock', [1, 1], 30, 1, 'A souvenir boulder. Every colony keeps one.'),
  path:     decor('Walkway', [1, 1], 10, 1, 'A paved tile for paths and plazas.'),
  lamp:     decor('Lumen Post', [1, 1], 60, 2, 'A tall lamp with a soft, warm glow.'),
  flag:     decor('Colony Flag', [1, 1], 100, 3, 'Flies your colony colours.'),
  crystal:  decor('Crystal Cluster', [1, 1], 250, 4, 'Grown in microgravity, sold by the kilo.'),
  fountain: decor('Gravity Fountain', [2, 2], 600, 5, 'Water arcing in a gentle artificial gravity well.'),
  dish:     decor('Dish Array', [2, 2], 900, 7, 'Listening to the stars, mostly for show.'),
  statue:   decor('Bot Statue', [2, 2], 1500, 9, 'A monument to the bots who built the colony.'),
};
export const SHOP_ORDER = ['bay', 'fab', 'tree', 'rock', 'path', 'lamp', 'flag', 'crystal', 'fountain', 'dish', 'statue'];
// limits by Command Center level
export const bayLimit = (cc: number) => 2 + cc;
export const fabLimit = (cc: number) => 1 + Math.floor(cc / 3);
// Command Center upgrade needs this Commander level (index = target level)
export const CC_REQ = [0, 0, 2, 3, 5, 7, 9, 12, 15, 18, 21, 25, 29, 33, 38, 44];
// Bays: bot capacity and credit storage by level
export const bayCapacity = (L: number) => 2 + Math.floor((L - 1) / 3);
export const bayStore = (L: number) => round2(400 * Math.pow(1.75, L - 1));
// Fabricator recipes: unlocked by Fabricator level; output grows 10% per level
export interface Recipe { name: string; sec: number; cells: number; cost: number; xp: number; lvl: number; }
export const RECIPES: Recipe[] = [
  { name: 'Quick Charge', sec: 30, cells: 12, cost: 20, xp: 1, lvl: 1 },
  { name: 'Standard Cells', sec: 300, cells: 60, cost: 80, xp: 3, lvl: 1 },
  { name: 'Battery Pack', sec: 1800, cells: 240, cost: 300, xp: 8, lvl: 2 },
  { name: 'Power Core', sec: 7200, cells: 700, cost: 900, xp: 20, lvl: 3 },
  { name: 'Fusion Rod', sec: 8 * 3600, cells: 2200, cost: 2600, xp: 50, lvl: 5 },
  { name: 'Star Battery', sec: 24 * 3600, cells: 6000, cost: 6500, xp: 120, lvl: 7 },
];
export const fabOutput = (r: Recipe, L: number) => Math.round(r.cells * (1 + 0.1 * (L - 1)));
// Island land: 5x5 plots of 6x6 tiles; the centre 3x3 start unlocked
export const PLOT = 6, PLOTS = 5;
export const landCost = (bought: number) => round2(800 * Math.pow(2, bought));
export const landLevel = (bought: number) => 3 + bought * 2;
