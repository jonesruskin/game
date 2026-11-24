// STARWARD: conflict. Warships (built at the Orbital Shipyard), planetary defences, the Kr'thul Swarm's units,
// its hives at real stars, and the Brood Queen. Weapons form a triangle:
//   laser   → strong against small hulls (S),  weak against L/XL
//   missile → strong against large hulls (L/XL), weak against S
//   rail    → punches through shields (halves their effect)
export const SIZE_W = { S: 1, M: 2, L: 4, XL: 8 }; // how likely a hull is to be targeted
export const VS = { laser: { S: 1.5, M: 1, L: 0.65, XL: 0.6 }, missile: { S: 0.5, M: 1, L: 1.5, XL: 1.6 }, rail: { S: 0.9, M: 1, L: 1.05, XL: 1.05 } };
export const WARSHIPS = {
  corvette: { name: 'Corvette', size: 'S', wpn: 'laser', hp: 400, sh: 40, atk: 60, yard: 3, req: 'navalWarfare', cost: { credits: 2e6, metal: 3e6 }, time: 2400, desc: 'Fast, cheap point-defence boats. Laser clusters that shred drones and fighters.' },
  frigate: { name: 'Frigate', size: 'M', wpn: 'rail', hp: 1500, sh: 160, atk: 230, yard: 4, req: 'navalWarfare', cost: { credits: 6e6, metal: 9e6, rare: 500 }, time: 5400, desc: 'A spinal railgun: slugs at 3% of light speed that shrug off shields.' },
  destroyer: { name: 'Destroyer', size: 'M', wpn: 'missile', hp: 3200, sh: 300, atk: 520, yard: 5, req: 'guidedOrdnance', cost: { credits: 1.4e7, metal: 2e7, rare: 1500 }, time: 10800, desc: 'Missile racks for hunting big targets. The capital-ship killer.' },
  cruiser: { name: 'Cruiser', size: 'L', wpn: 'laser', hp: 9000, sh: 900, atk: 1300, yard: 6, req: 'capitalShips', cost: { credits: 4e7, metal: 5.5e7, rare: 5000 }, time: 21600, desc: 'Heavy laser batteries and thick armour: the backbone of a battle line.' },
  battleship: { name: 'Battleship', size: 'L', wpn: 'rail', hp: 26000, sh: 2600, atk: 3600, yard: 8, req: 'capitalShips', cost: { credits: 1.1e8, metal: 1.5e8, rare: 15000, exotic: 50 }, time: 43200, desc: 'A kilometre of armour around a railgun the size of a skyscraper.' },
  carrier: { name: 'Carrier', size: 'XL', wpn: 'missile', hp: 60000, sh: 4500, atk: 6500, yard: 10, req: 'carrierWarfare', cost: { credits: 2.6e8, metal: 3.2e8, rare: 40000, exotic: 200 }, time: 86400, desc: 'A flying dockyard launching wings of missile drones. Nothing large survives it for long.' },
};
export const WARSHIP_ORDER = ['corvette', 'frigate', 'destroyer', 'cruiser', 'battleship', 'carrier'];
// defences per base or star colony: each level adds batteries (laser) and silos (missile); shields add absorption
export const DEFENCE = { battery: { name: 'Laser batteries', size: 'L', wpn: 'laser', hp: 9000, sh: 900, atk: 1200 }, silo: { name: 'Missile silos', size: 'L', wpn: 'missile', hp: 9000, sh: 900, atk: 1300 } };
export const defCost = (L) => ({ credits: Math.round(2e7 * Math.pow(1.55, L - 1)), metal: Math.round(2.5e7 * Math.pow(1.55, L - 1)) });
export const DEF_MAX = 10;
// the Swarm
export const SWARM = {
  drone: { name: 'Drone', size: 'S', wpn: 'laser', hp: 350, sh: 0, atk: 55, desc: 'A chitin dart with a cutting maw. They come in clouds.' },
  warrior: { name: 'Warrior', size: 'M', wpn: 'missile', hp: 2400, sh: 100, atk: 400, desc: 'Fires spines of frozen acid that home in on heat.' },
  brood: { name: 'Brood Ship', size: 'L', wpn: 'rail', hp: 15000, sh: 1200, atk: 2200, desc: 'A living carrier, spawning drones as it fights.' },
  queen: { name: 'Brood Queen', size: 'XL', wpn: 'missile', hp: 300000, sh: 9000, atk: 25000, desc: 'The mind of the Swarm: a living moon.' },
};
// hives the Swarm holds at real stars; strength is the size of their garrison
export const HIVES = {
  ross154: { name: 'Hive at Ross 154', star: 'ross154', comp: { drone: 150, warrior: 22, brood: 3 }, loot: { metal: 2e9, rare: 2e5 }, desc: 'A forward hive in Sagittarius, stripping a red dwarf\'s asteroid belt.' },
  uvceti: { name: 'Hive at Luyten 726-8', star: 'uvceti', comp: { drone: 420, warrior: 70, brood: 8 }, loot: { credits: 4e9, xeno: 20000 }, desc: 'Nested between two flare stars that hide its heat from our telescopes.' },
  lacaille: { name: 'Hive at Lacaille 9352', star: 'lacaille', comp: { drone: 900, warrior: 150, brood: 18 }, loot: { metal: 6e9, exotic: 3000 }, desc: 'It has eaten one super-Earth already and is starting on the second.' },
  kapteyn: { name: 'The Brood Queen', star: 'kapteyn', comp: { drone: 1800, warrior: 320, brood: 40, queen: 1 }, loot: { dm: 1000, xeno: 100000 }, queen: true, desc: 'At Kapteyn\'s Star, refugee from a swallowed galaxy, the Queen broods over the Swarm.' },
};
export const HIVE_ORDER = ['ross154', 'uvceti', 'lacaille', 'kapteyn'];
