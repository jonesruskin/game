// The Precursor Vault: relic crystals (six colours, four tiers), mines, the forge and Relic AIs.
export const CRYSTALS: Record<string, { name: string; color: string }> = {
  aurora: { name: 'Aurora', color: '#6fffc8' }, arcana: { name: 'Arcana', color: '#8a5cff' }, entropy: { name: 'Entropy', color: '#ff3d6e' },
  joy: { name: 'Joy', color: '#ffd24a' }, reverie: { name: 'Reverie', color: '#7aa8ff' }, soul: { name: 'Soul', color: '#f2f2ff' },
};
export const CRYSTAL_ORDER = Object.keys(CRYSTALS);
export const TIER_NAMES = ['Shard', 'Crystal', 'Gem', 'Prism'];
// dig recipes at a Crystal Mine: credits in, tier-1 shards out
export const DIGS = [{ name: 'Surface dig', sec: 600, shards: 4, cost: 4000 }, { name: 'Deep dig', sec: 2 * 3600, shards: 18, cost: 15000 }, { name: 'Core dig', sec: 8 * 3600, shards: 60, cost: 42000 }];
export const mineYield = (base: number, lvl: number) => Math.round(base * (1 + 0.15 * (lvl - 1)));
// forging: four of a tier plus Iridium make one of the next
export const FORGE_IN = 4; export const forgeIridium = (tier: number) => [30, 120, 400][tier] || 0;
// summoning a Relic AI (Minor / Major / Prime) costs crystals of its colour
export const SUMMON: [number, number][] = [[0, 30], [2, 8], [3, 6]]; // [tier index, count]
// evolving (stars 1-5): crystals of its colour at rising tiers
export const EVOLVE: [number, number][] = [[1, 10], [1, 25], [2, 12], [3, 8]];
export const relicEarn = (rarityIdx: number, stars: number) => [0, 0, 0, 2.5, 4, 7, 10][rarityIdx] * (1 + 0.6 * (stars - 1)); // iridium per minute
export const relicStore = (L: number) => Math.round(300 * Math.pow(1.7, L - 1));
