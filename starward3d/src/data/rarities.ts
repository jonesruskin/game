// Seven rarities. Rarity sets how fast a bot earns, how hard it hits and how hard it is to fuse.
export interface Rarity { name: string; color: string; earn: number; power: number; fuseChance: number; assembly: number; }
export const RARITIES: Record<string, Rarity> = {
  standard:    { name: 'Standard',    color: '#b9c3cf', earn: 10,  power: 1.0, fuseChance: 1.0,   assembly: 30 },
  advanced:    { name: 'Advanced',    color: '#5fdc7a', earn: 15,  power: 1.2, fuseChance: 0.6,   assembly: 600 },
  elite:       { name: 'Elite',       color: '#4aa8ff', earn: 22,  power: 1.45, fuseChance: 0.35, assembly: 3600 },
  epic:        { name: 'Epic',        color: '#b06dff', earn: 34,  power: 1.75, fuseChance: 0.18, assembly: 4 * 3600 },
  legendary:   { name: 'Legendary',   color: '#ffa53a', earn: 52,  power: 2.1, fuseChance: 0.08,  assembly: 12 * 3600 },
  prototype:   { name: 'Prototype',   color: '#ff4f6a', earn: 80,  power: 2.6, fuseChance: 0.035, assembly: 24 * 3600 },
  singularity: { name: 'Singularity', color: '#7af7ff', earn: 125, power: 3.2, fuseChance: 0.015, assembly: 48 * 3600 },
};
export const RARITY_ORDER = Object.keys(RARITIES);
