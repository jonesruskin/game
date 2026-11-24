// Robots and AIs: what they are good at. Dragon City's core ideas, made ours: robots are collected, housed in docks,
// levelled with Power Cells and fused into hybrids, but here they work for people. Assigned to a building as
// operators, a robot whose element suits the job boosts it far more than a mismatch.
// building → the elements that suit its work
export const AFFINITY: Record<string, string[]> = {
  hq: ['neural', 'chrono'], research: ['neural', 'chrono', 'photon'], university: ['neural', 'chrono'], llab: ['neural', 'photon', 'chrono'], xenolab: ['neural', 'void'],
  mine: ['geo', 'kinetic'], regolith: ['geo', 'kinetic'], refinery: ['cryo', 'plasma'], ice: ['hydro', 'cryo'], methane: ['cryo', 'hydro'], he3x: ['geo', 'plasma'],
  office: ['neural', 'photon'], dome: ['bio', 'neural'], solar: ['solar', 'photon'], lsolar: ['solar', 'photon'], fission: ['plasma', 'volt'], fusion: ['plasma', 'volt'], reactor: ['plasma', 'volt'],
  depot: ['alloy', 'gravity'], launch: ['aero', 'gravity'], vab: ['alloy', 'gravity', 'kinetic'], tracking: ['photon', 'aero'], academy: ['neural', 'bio'],
  greenhouse: ['bio', 'hydro'], terraformer: ['bio', 'aero'], skimmer: ['aero', 'hydro'], resort: ['neural', 'photon'], warroom: ['neural', 'chrono'], turret: ['kinetic', 'alloy'], laser: ['photon', 'plasma'], missile: ['kinetic', 'gravity'], shield: ['volt', 'alloy'], emp: ['volt', 'void'], beltControl: ['gravity', 'kinetic'], casimir: ['void', 'gravity'], antimatter: ['void', 'plasma'], elevator: ['gravity', 'alloy'], massDriver: ['kinetic', 'gravity'],
  workshop: ['alloy', 'kinetic'], cellplant: ['volt', 'solar'], fusionlab: ['neural', 'chrono'],
};
// what an operator does at each kind of building (shown in the panel)
export const BOOST_WHAT: Record<string, string> = { launch: 'launch reliability', vab: 'rocket assembly speed', workshop: 'core assembly speed', fusionlab: 'fusion speed', academy: 'crewed-flight safety', depot: 'storage' };
// operator boost by rarity (Standard → Singularity), +3.5% of it per level, ×0.35 when the element does not suit the job
export const RARITY_BOOST = [0.08, 0.12, 0.18, 0.26, 0.38, 0.55, 0.8];
export const MATCH_K = 1, MISMATCH_K = 0.35, BOOST_CAP = 2;
export const MAX_LVL = 30;
// operator slots: 1, a second at level 8, a third at level 16 (docks house robots instead)
export const opSlots = (b: string, L: number) => (b === 'dock' || !AFFINITY[b] ? 0 : L <= 0 ? 0 : 1 + (L >= 8 ? 1 : 0) + (L >= 16 ? 1 : 0));
export const dockCapacity = (L: number) => (L <= 0 ? 0 : 3 + L);
// Power Cells to reach the next level
export const feedCost = (lvl: number, rarity: number) => Math.round((20 * Math.pow(1.17, lvl - 1) * (1 + 0.45 * rarity)) / 5) * 5;
// cores the Workshop can assemble: a random robot of that rarity whose elements include the chosen focus
export interface CoreRecipe { name: string; rarity: number; cost: Record<string, number>; ws: number; desc: string; }
export const CORE_RECIPES: CoreRecipe[] = [
  { name: 'Standard core', rarity: 0, cost: { credits: 800, metal: 600, cells: 60 }, ws: 1, desc: 'A single-element robot: dependable, cheap, quick to boot.' },
  { name: 'Advanced core', rarity: 1, cost: { credits: 9000, metal: 7000, cells: 400 }, ws: 5, desc: 'A two-element robot that suits more jobs.' },
  { name: 'Elite core', rarity: 2, cost: { credits: 90000, metal: 70000, cells: 3000 }, ws: 12, desc: 'A three-element specialist, rarely seen outside fusion labs.' },
];
// dark matter for discovering a species, by rarity
export const DEX_REWARD = [2, 4, 8, 15, 30, 60, 120];
export const FUSE_LEVEL = 4;
// the first two robots arrive with the Workshop
export const STARTERS = ['helio', 'digger'];
