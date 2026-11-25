// Beyond the Milky Way (ported from Starward). The Local Group (real distances), expeditions through the Hollow relay network,
// endgame megaprojects, Ascension (the prestige loop), achievements.
export interface Galaxy { name: string; d: number; x: number; y: number; r: number; kind: string; col: string; fact: string; }
export interface Expedition { name: string; relay: number; days: number; cost: Record<string, number>; reward: Record<string, number>; perk: { mult?: Record<string, number>; researchTime?: number; flag?: string }; perkText: string; story: string; }
export const GALAXIES: Record<string, Galaxy> = {
  milkyway: { name: 'The Milky Way', d: 0, x: 0, y: 0, r: 34, kind: 'spiral', col: '#ffe8c8', fact: 'Home: a barred spiral 100,000 light-years across, holding 100 to 400 billion stars.' },
  sagdeg: { name: 'Sagittarius Dwarf', d: 70000, x: 75, y: -45, r: 7, kind: 'dwarf', col: '#ffd8a8', fact: 'A small galaxy being torn apart by the Milky Way\'s gravity, its stars strung around ours in streams.' },
  lmc: { name: 'Large Magellanic Cloud', d: 160000, x: -115, y: 55, r: 14, kind: 'irregular', col: '#c8dcff', fact: 'Our largest satellite galaxy: thirty billion stars, the Tarantula Nebula and the supernova of 1987.' },
  smc: { name: 'Small Magellanic Cloud', d: 200000, x: -160, y: 100, r: 10, kind: 'irregular', col: '#d8e4ff', fact: 'The Large Cloud\'s small companion, trailing a bridge of gas between them.' },
  andromeda: { name: 'Andromeda', d: 2500000, x: 270, y: -80, r: 46, kind: 'spiral', col: '#fff0dc', fact: 'A trillion stars, 220,000 light-years across. It is falling towards us and will merge with the Milky Way in about 4.5 billion years.' },
  triangulum: { name: 'Triangulum', d: 2730000, x: 340, y: 25, r: 22, kind: 'spiral', col: '#dce8ff', fact: 'The third-largest galaxy of the Local Group, a loose pinwheel of forty billion stars.' },
  farshore: { name: 'The Far Shore', d: 3500000, x: 460, y: -130, r: 12, kind: 'unknown', col: '#ff6bd6', fact: 'Past Andromeda the Hollow relays point at one last coordinate. Nothing is visible there. Something is.' },
};
export const GALAXY_ORDER = ['sagdeg', 'lmc', 'smc', 'andromeda', 'triangulum', 'farshore'];
// expeditions: one at a time, through the relay network (its stage must be at least `relay`)
export const EXPEDITIONS: Record<string, Expedition> = {
  sagdeg: { name: 'The Dying Galaxy', relay: 1, days: 2, cost: { antimatter: 300, exotic: 2000, credits: 1e9 }, reward: { exotic: 20000, xeno: 30000 }, perk: { mult: { exotic: 0.5 } }, perkText: 'Exotic matter +50%', story: 'A galaxy in its last billion years: dense stellar cores and neutron stars, all rich in degenerate matter. The expedition brings home a hold full of it.' },
  lmc: { name: 'Home of the Gardeners', relay: 2, days: 4, cost: { antimatter: 800, exotic: 5000, credits: 2e9 }, reward: { xeno: 80000, dm: 300 }, perk: { mult: { science: 0.15 }, flag: 'gardenerSeed' }, perkText: 'Science +15%; colonists grow twice as fast', story: 'In the Large Cloud the Veyari tend a garden of worlds a hundred million years old. They show us their nurseries and hand us a seed: a genome for life that grows anywhere.' },
  smc: { name: 'The Silent Cloud', relay: 3, days: 4, cost: { antimatter: 1200, exotic: 8000, credits: 3.5e9 }, reward: { xeno: 120000 }, perk: { researchTime: 0.12 }, perkText: 'Research 12% faster', story: 'The Hollow came from here. Their last city still stands, empty, its libraries humming. We copy what we can understand, about one part in a thousand.' },
  andromeda: { name: 'The Great Spiral', relay: 4, days: 10, cost: { antimatter: 4000, exotic: 25000, credits: 8e9 }, reward: { xeno: 400000, dm: 600 }, perk: { mult: { credits: 0.2, metal: 0.2 } }, perkText: 'Aurivane and metal +20%', story: 'Two and a half million light-years from home. Andromeda is crowded with civilisations, and every one of them is listening to the same signal, coming from somewhere beyond.' },
  triangulum: { name: 'The Pinwheel', relay: 5, days: 10, cost: { antimatter: 5000, exotic: 30000, credits: 1e10 }, reward: { rare: 5e6, metal: 1e10 }, perk: { mult: { fuel: 0.25, rare: 0.25 } }, perkText: 'Fuel and rare elements +25%', story: 'Triangulum has no one in it at all: forty billion stars, rich and untouched. The survey claims are worth more than everything we own.' },
  farshore: { name: 'The Far Shore', relay: 6, days: 14, cost: { antimatter: 12000, exotic: 80000, credits: 2.5e10 }, reward: { dm: 3000 }, perk: { flag: 'ascendant' }, perkText: 'Meet the Ascendants: Ascension becomes possible', story: 'There is nothing at the coordinates, except a voice. "You crossed the dark between galaxies. Most never leave their first world. Now leave everything behind, and begin again, wiser." The Ascendants offer us Ascension.' },
};
// the Hollow relay network (a megastructure-like project): each stage reaches one galaxy further
export const HRELAY: { name: string; stages: number; req: string; cost: Record<string, number>; growth: number; days: number } = { name: 'Hollow Relay Network', stages: 6, req: 'relayNetwork', cost: { credits: 7e8, exotic: 4000, antimatter: 200 }, growth: 1.8, days: 5 };
// endgame megaprojects, added to the megastructure panel on the Sun
export const MEGA2: Record<string, { name: string; req: string; stages: number; days: number; fund?: boolean; cost: Record<string, number>; growth: number; desc: string; effect: string }> = {
  matrioshka: { name: 'Matrioshka Brain', req: 'matrioshkaBrains', stages: 5, days: 6, fund: true, cost: { credits: 2e9, metal: 3e9, exotic: 10000, antimatter: 500 }, growth: 1.6, desc: 'Shells of computers around the Sun, each running on the waste heat of the one inside. A mind the size of a solar system. Each stage: research 15% faster and +1M science per hour.', effect: 'Research' },
  ringworld: { name: 'Ring Habitat', req: 'ringworlds', stages: 3, days: 10, fund: true, cost: { credits: 6e9, metal: 1e10, rare: 3e6, antimatter: 2000 }, growth: 1.8, desc: 'A band of land a million kilometres wide around a star: three million Earths of living space. Each stage: Aurivane +25% and colony housing +50%.', effect: 'Aurivane and living space' },
};
// Ascension perks: bought with Ascension points, kept for ever
export const PERKS: Record<string, { name: string; max: number; cost: number; desc: string }> = {
  prosperity: { name: 'Prosperity', max: 20, cost: 1, desc: 'All production +6% per rank.' },
  engineering: { name: 'Master Builders', max: 15, cost: 1, desc: 'Construction 4% faster per rank.' },
  insight: { name: 'Insight', max: 15, cost: 1, desc: 'Research 4% faster per rank.' },
  headstart: { name: 'Head Start', max: 5, cost: 2, desc: 'Begin each run with 5x more starting resources per rank.' },
  crews: { name: 'Extra Crews', max: 3, cost: 5, desc: '+1 engineering crew per rank.' },
  reserves: { name: 'Dark Reserves', max: 10, cost: 1, desc: '+100 dark matter at the start of each run per rank.' },
};
