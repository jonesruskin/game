// War Games data: how robots fight (a role from their primary element), how defences and buildings hold up, squad
// size, leagues and rewards. Pure data shared by the client, the battle engine and the server.
export type Role = 'breacher' | 'striker' | 'flyer' | 'disruptor' | 'support';
// primary element → battlefield role
export const ROLE_OF: Record<string, Role> = {
  geo: 'breacher', alloy: 'breacher', kinetic: 'breacher',
  solar: 'striker', plasma: 'striker', volt: 'striker', photon: 'striker',
  aero: 'flyer', gravity: 'flyer',
  void: 'disruptor', chrono: 'disruptor', cryo: 'disruptor',
  bio: 'support', hydro: 'support', neural: 'support',
  relic: 'striker', aurora: 'flyer', arcana: 'disruptor', entropy: 'disruptor', joy: 'support', reverie: 'flyer', soul: 'support',
};
export interface RoleDef { name: string; hp: number; dps: number; speed: number; range: number; splash?: number; air?: boolean; heal?: number; wallK?: number; prefers: 'defence' | 'any'; desc: string; glyph: string; }
export const ROLES: Record<Role, RoleDef> = {
  breacher: { name: 'Breacher', hp: 2.6, dps: 0.8, speed: 1.1, range: 0.7, wallK: 3, prefers: 'defence', glyph: '🛡', desc: 'Heavy and slow. Goes for defences first and smashes walls three times as fast.' },
  striker: { name: 'Striker', hp: 1, dps: 1.25, speed: 1.3, range: 3, prefers: 'any', glyph: '⚔', desc: 'Ranged fire at the nearest building.' },
  flyer: { name: 'Flyer', hp: 0.9, dps: 1, speed: 1.8, range: 2.2, air: true, prefers: 'defence', glyph: '✈', desc: 'Flies over walls straight at the defences. Only turrets and missiles can hit it.' },
  disruptor: { name: 'Disruptor', hp: 1, dps: 0.9, speed: 1.2, range: 2.6, splash: 1.6, prefers: 'any', glyph: '✺', desc: 'Its blasts hit everything around the target.' },
  support: { name: 'Support', hp: 1.1, dps: 0.35, speed: 1.3, range: 2.5, heal: 0.6, prefers: 'any', glyph: '✚', desc: 'Repairs nearby robots and drones as they fight.' },
};
// stat power by rarity index (Standard → Singularity) and by level
export const R_POWER = [1, 1.55, 2.4, 3.7, 5.7, 8.8, 13.5];
export const levelK = (lvl: number) => 1 + 0.06 * (lvl - 1);
export const BOT_HP = 800, BOT_DPS = 60;
// each robot brings escort drones (more for rarer robots)
export const escorts = (ri: number) => 2 + Math.floor(ri / 2);
export const DRONE = { hp: 240, dps: 20, speed: 1.6, range: 2 };
// defences: base stats at level 1; ×1.18 per level (×1.2 for walls)
export interface DefDef { hp: number; dps?: number; range?: number; minRange?: number; air?: boolean; ground?: boolean; period?: number; splash?: number; shield?: number; shieldR?: number; pulse?: number; stun?: number; pulseR?: number; }
export const DEF: Record<string, DefDef> = {
  turret: { hp: 900, dps: 48, range: 6.5, air: true, ground: true, period: 0.25 },
  laser: { hp: 1100, dps: 105, range: 8.5, ground: true, period: 0.5 },
  missile: { hp: 1400, dps: 60, range: 10, minRange: 3.5, air: true, ground: true, period: 3, splash: 2 },
  shield: { hp: 1300, shield: 1800, shieldR: 6 },
  emp: { hp: 1000, dps: 40, pulse: 7, stun: 1.5, pulseR: 5 },
};
export const DEF_K = 1.18, WALL_HP = 320, WALL_K = 1.2;
export const isDefence = (b: string) => !!DEF[b];
// any other building: hit points from its footprint and level (Mission Control is extra tough)
export const buildingHp = (b: string, w: number, d: number, lvl: number) => b === 'wall' ? WALL_HP * Math.pow(WALL_K, lvl - 1) : DEF[b] ? DEF[b].hp * Math.pow(DEF_K, lvl - 1) : 110 * Math.pow(w * d, 0.8) * (1 + 0.12 * (lvl - 1)) * (b === 'hq' ? 1.8 : 1);
// the battle
export const TICK = 0.1, MAX_TICKS = 1200; // two minutes
export const squadSize = (warroomLvl: number) => (warroomLvl > 0 ? 4 + Math.ceil(warroomLvl / 2) : 0);
// sorties: three a day, one back every 8 hours
export const SORTIES = 3, SORTIE_EVERY = 8 * 3600e3;
// leagues by trophies, with a weekly season reward
export interface League { name: string; min: number; col: string; dm: number; cellsH: number; }
export const LEAGUES: League[] = [
  { name: 'Lunar', min: 0, col: '#9aa7b8', dm: 5, cellsH: 1 }, { name: 'Martian', min: 400, col: '#cd7f32', dm: 10, cellsH: 2 }, { name: 'Asteroid', min: 800, col: '#c0c8d4', dm: 20, cellsH: 3 },
  { name: 'Jovian', min: 1400, col: '#ffd36a', dm: 35, cellsH: 5 }, { name: 'Saturnian', min: 2000, col: '#7fe4ff', dm: 55, cellsH: 7 }, { name: 'Heliopause', min: 2600, col: '#b892ff', dm: 80, cellsH: 10 }, { name: 'Interstellar', min: 3200, col: '#ff8be8', dm: 120, cellsH: 14 },
];
// the Council's charters: granted for good by the best circle ever reached, and they shape the rest of the game
export interface Charter { id: string; circle: number; name: string; glyph: string; desc: string; }
export const CHARTERS: Charter[] = [
  { id: 'land1', circle: 1, name: 'Land Charter I', glyph: '🚩', desc: 'Claiming land costs 10% less on every world.' },
  { id: 'rover', circle: 2, name: 'Survey Charter', glyph: '🚙', desc: 'A third rover for surveys.' },
  { id: 'land2', circle: 3, name: 'Land Charter II', glyph: '🚩', desc: 'Claims cost 20% less, and the rovers reach one plot further.' },
  { id: 'guard', circle: 4, name: 'Swarm Guard', glyph: '🛡', desc: 'Swarm landings on Earth come down with 15% fewer troops.' },
  { id: 'land3', circle: 5, name: 'Land Charter III', glyph: '🚩', desc: 'Claims cost 30% less, and claimed land draws 25% less energy.' },
  { id: 'seat', circle: 6, name: 'Council Seat', glyph: '🏛', desc: 'Trial grants are 25% bigger.' },
];
export const leagueOf = (t: number) => { let L = LEAGUES[0]; for (const x of LEAGUES) if (t >= x.min) L = x; return L; };
// trophies: a win is worth more against a stronger commander, a loss costs less against one
export const trophyGain = (stars: number, mine: number, theirs: number) => { const d = Math.max(-200, Math.min(200, theirs - mine)); if (stars <= 0) return -Math.max(4, Math.round(14 - d / 25)); return Math.max(4, Math.round([0, 18, 26, 34][stars] + d / 20)); };
// grants, in hours of the empire's income, by stars; and Power Cells for the robots that fought
export const GRANT_H = [0.25, 0.9, 1.6, 2.6];
export const FIRST_WIN_DM = 15;
