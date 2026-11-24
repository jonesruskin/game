// The islands of your colony. Each new world is its own floating island with its own ground, sky, hub and perk.
export interface IslandDef { name: string; theme: 'haven' | 'moon' | 'mars' | 'vault'; world: 'earth' | 'moon' | 'mars' | 'vault'; needs?: string; level?: number; cost?: number; perk?: string; blurb: string; }
export const ISLANDS: Record<string, IslandDef> = {
  home: { name: 'Home orbit', theme: 'haven', world: 'earth', blurb: 'Your first island, in low Earth orbit.' },
  moon: { name: 'Tranquility Base', theme: 'moon', world: 'moon', needs: 'moon', level: 14, cost: 60000, perk: 'Low gravity: bays here hold 50% more credits', blurb: 'An island of grey regolith floating above the Moon, with Earth hanging in the black sky.' },
  vault: { name: 'The Precursor Vault', theme: 'vault', world: 'vault', needs: 'epseri', level: 27, cost: 1500000, perk: 'Relic crystals, the Forge and Relic AIs that earn Iridium', blurb: 'A shard of the Precursors\' world, found beyond Epsilon Eridani: violet ground veined with light.' },
  mars: { name: 'Bradbury Landing', theme: 'mars', world: 'mars', needs: 'mars', level: 22, cost: 400000, perk: 'Rich regolith: Fabricators here print 30% more cells', blurb: 'Rust-red ground above the plains of Mars, with Phobos racing overhead.' },
};
export const ISLAND_ORDER = ['home', 'moon', 'mars', 'vault'];
