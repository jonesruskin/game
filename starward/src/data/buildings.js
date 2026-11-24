// STARWARD: building definitions. Each value is a geometric curve [base, growth] read at the building's level.
//   cost   cost to reach level L (L = 1 is construction)      time   seconds to reach level L
//   prod   output per hour                                    cap    storage added
//   gen    energy generated                                   draw   energy consumed
//   count  how many may stand, indexed by command level (hq)  req    { tech, hq } needed to build
// Values are scaled by research multipliers in core/econ.js.
export const BUILDINGS = {
  // ---------------- Earth ----------------
  hq: {
    name: 'Mission Control', icon: 'hq', size: 3, bases: ['earth'], unique: true, lot: 'hq', max: 20, cat: 'core',
    cost: { credits: [400, 2.1], metal: [500, 2.1] }, time: [-6, 13, 'ln'],
    prod: { credits: [500, 1.2], science: [30, 1.2] }, cap: { credits: [8000, 1.55], metal: [6000, 1.55], fuel: [3000, 1.55], science: [2500, 1.55] }, gen: [12, 1.2],
    desc: 'The heart of the programme. Raising it opens more building lots, allows higher building levels and adds engineering crews at levels 5, 10 and 15.',
  },
  research: {
    name: 'Research Center', icon: 'research', size: 2, bases: ['earth'], unique: true, max: 25, cat: 'science',
    cost: { credits: [250, 1.84], metal: [300, 1.84] }, time: [2, 2.0], prod: { science: [150, 1.24] }, cap: { science: [2000, 1.5] }, draw: [4, 1.14],
    desc: 'Laboratories, wind tunnels and clean rooms. Produces science and runs research projects.',
  },
  university: {
    name: 'University Campus', icon: 'university', size: 2, bases: ['earth'], unique: true, max: 20, cat: 'science', req: { hq: 3 },
    cost: { credits: [1200, 1.84], metal: [1400, 1.84] }, time: [5, 2.0], prod: { science: [90, 1.24] }, draw: [3, 1.14], speed: 0.04,
    desc: 'Trains the next generation of engineers. Each level speeds up all research by 4% and adds science.',
  },
  mine: {
    name: 'Metal Mine', icon: 'mine', size: 2, bases: ['earth'], max: 25, cat: 'production', count: [1, 2, 3, 3, 4, 4, 5, 5, 6, 6],
    cost: { credits: [120, 1.74], metal: [80, 1.74] }, time: [1, 2.0], prod: { metal: [900, 1.24] }, draw: [2, 1.14],
    desc: 'Open-pit mining and smelting. Produces metal around the clock.',
  },
  refinery: {
    name: 'Fuel Refinery', icon: 'refinery', size: 2, bases: ['earth'], max: 25, cat: 'production', count: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5], req: { hq: 2 },
    cost: { credits: [160, 1.74], metal: [220, 1.74] }, time: [1.5, 2.0], prod: { fuel: [450, 1.24] }, draw: [3, 1.14],
    desc: 'Cracks hydrocarbons and liquefies hydrogen and oxygen into rocket propellant.',
  },
  office: {
    name: 'Agency Office', icon: 'office', size: 2, bases: ['earth'], max: 25, cat: 'production', count: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4],
    cost: { credits: [80, 1.72], metal: [150, 1.72] }, time: [1, 2.0], prod: { credits: [1100, 1.24] }, draw: [2, 1.14],
    desc: 'Public relations, contracts and grants: the money that keeps rockets flying.',
  },
  solar: {
    name: 'Solar Farm', icon: 'solar', size: 2, bases: ['earth'], max: 25, cat: 'power', count: [2, 2, 3, 3, 4, 4, 5, 5, 6, 6],
    cost: { credits: [90, 1.72], metal: [140, 1.72] }, time: [0.5, 1.95], gen: [12, 1.24],
    desc: 'Fields of photovoltaic panels. Clean, quiet power.',
  },
  fission: {
    name: 'Fission Plant', icon: 'fission', size: 2, bases: ['earth'], max: 20, cat: 'power', count: [0, 0, 1, 1, 1, 2, 2, 2, 3, 3], req: { tech: 'fission' },
    cost: { credits: [2500, 1.82], metal: [3500, 1.82] }, time: [6, 1.95], gen: [70, 1.27],
    desc: 'A pressurised-water reactor. Dense, reliable power for a growing programme.',
  },
  depot: {
    name: 'Logistics Depot', icon: 'depot', size: 2, bases: ['earth'], max: 25, cat: 'storage', count: [1, 1, 1, 2, 2, 2, 3, 3, 3, 4],
    cost: { credits: [180, 1.78], metal: [280, 1.78] }, time: [1.5, 2.0], cap: { credits: [5000, 1.48], metal: [6000, 1.48], fuel: [3500, 1.48], science: [1500, 1.48], rare: [800, 1.48], he3: [300, 1.48] }, draw: [1, 1.1],
    desc: 'Warehouses, tank farms and secure data vaults. Raises storage for every basic resource.',
  },
  launch: {
    name: 'Launch Complex', icon: 'launch', size: 3, bases: ['earth'], unique: true, lot: 'pad', max: 20, cat: 'spaceflight', req: { tech: 'rocketry' },
    cost: { credits: [1100, 1.97], metal: [1600, 1.97], fuel: [300, 1.97] }, time: [5, 2.1], draw: [5, 1.18],
    desc: 'Pad, service tower and flame trench. Its level sets the largest rocket you can fly.',
  },
  vab: {
    name: 'Vehicle Assembly', icon: 'vab', size: 2, bases: ['earth'], unique: true, max: 20, cat: 'spaceflight', req: { tech: 'multistage' },
    cost: { credits: [1800, 1.92], metal: [3000, 1.92] }, time: [6, 2.1], draw: [6, 1.16],
    desc: 'A cathedral of a hangar where rockets are stacked. Higher levels build bigger rockets faster.',
  },
  tracking: {
    name: 'Tracking Station', icon: 'tracking', size: 2, bases: ['earth'], unique: true, max: 20, cat: 'spaceflight', req: { tech: 'guidance' },
    cost: { credits: [900, 1.87], metal: [1100, 1.87] }, time: [5.5, 2.0], prod: { science: [60, 1.224] }, draw: [4, 1.15],
    desc: 'Giant dish antennas that talk to spacecraft. Raises mission success and earns science from telemetry.',
  },
  academy: {
    name: 'Astronaut Academy', icon: 'academy', size: 2, bases: ['earth'], unique: true, max: 20, cat: 'spaceflight', req: { tech: 'lifeSupport' },
    cost: { credits: [3000, 1.87], metal: [3500, 1.87] }, time: [6.5, 2.0], prod: { science: [40, 1.224] }, draw: [4, 1.15],
    desc: 'Centrifuges, pools and simulators. Crewed missions need graduates; each level makes them 1% safer.',
  },
  // ---------------- the Moon ----------------
  hub: {
    name: 'Colony Hub', icon: 'hub', size: 3, bases: ['moon', 'mars', 'ceres', 'titan'], unique: true, lot: 'hq', max: 20, cat: 'core',
    cost: { credits: [60000, 2.05], metal: [80000, 2.05], fuel: [20000, 2.05] }, time: [7.5, 9.3, 'ln'], prod: { science: [200, 1.2] }, cap: { he3: [600, 1.55], metal: [20000, 1.5], fuel: [15000, 1.5], rare: [500, 1.5] }, gen: [40, 1.2], house: [20, 1.22],
    desc: 'Command, life support and the airlock everyone passes through. Raising it opens more lots and higher building levels.',
  },
  regolith: {
    name: 'Regolith Mine', icon: 'regolith', size: 2, bases: ['moon', 'mars', 'ceres'], jobs: [6, 1.08], max: 25, cat: 'production', count: [2, 2, 3, 3, 4, 4, 5, 5, 6, 6],
    cost: { credits: [18000, 1.74], metal: [12000, 1.74] }, time: [8, 1.95], prod: { metal: [3200, 1.24] }, draw: [6, 1.14],
    desc: 'Robotic excavators scrape the soil; furnaces pull out iron, aluminium and titanium.',
  },
  ice: {
    name: 'Ice Mine', icon: 'ice', size: 2, bases: ['moon', 'mars', 'ceres', 'titan'], jobs: [6, 1.08], max: 25, cat: 'production', count: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4],
    cost: { credits: [22000, 1.74], metal: [16000, 1.74] }, time: [8.5, 1.95], prod: { fuel: [2200, 1.24] }, draw: [7, 1.14],
    desc: 'Buried ice, melted and split into hydrogen and oxygen. Fuel made where it is needed, outside Earth\'s deep gravity well.',
  },
  he3x: {
    name: 'He-3 Extractor', icon: 'he3x', size: 2, bases: ['moon'], jobs: [8, 1.08], max: 25, cat: 'production', count: [1, 1, 1, 2, 2, 2, 3, 3, 3, 4], req: { tech: 'he3Mining' },
    cost: { credits: [60000, 1.77], metal: [50000, 1.77], fuel: [10000, 1.72] }, time: [10, 1.95], prod: { he3: [24, 1.24] }, draw: [12, 1.15],
    desc: 'Roasts regolith to release helium-3, a fusion fuel almost absent on Earth.',
  },
  lsolar: {
    name: 'Solar Array', icon: 'lsolar', size: 2, bases: ['moon', 'mars', 'ceres'], jobs: [2, 1.05], max: 25, cat: 'power', count: [2, 2, 3, 3, 4, 4, 5, 5, 6, 6],
    cost: { credits: [12000, 1.72], metal: [14000, 1.72] }, time: [7.5, 1.95], gen: [45, 1.24],
    desc: 'Ridge-top photovoltaic arrays. Superb on the Moon; weaker on Mars (43% of Earth\'s sunlight) and Ceres (13%).',
  },
  dome: {
    name: 'Habitat Dome', icon: 'dome', size: 2, bases: ['moon', 'mars', 'ceres', 'titan'], house: [40, 1.22], max: 20, cat: 'core', count: [1, 1, 1, 2, 2, 2, 3, 3, 3, 4], req: { tech: 'lunarHabitats' },
    cost: { credits: [40000, 1.77], metal: [45000, 1.77] }, time: [11, 1.95], prod: { credits: [2600, 1.24] }, cap: { he3: [300, 1.45] }, draw: [6, 1.14],
    desc: 'Homes under glass and regolith for colonists, and a garden the tourists pay well to see. Houses colonists.',
  },
  llab: {
    name: 'Colony Laboratory', icon: 'llab', size: 2, bases: ['moon', 'mars', 'ceres', 'titan'], jobs: [10, 1.08], unique: true, max: 20, cat: 'science', req: { tech: 'lunarHabitats' },
    cost: { credits: [50000, 1.82], metal: [40000, 1.82] }, time: [11.5, 1.95], prod: { science: [900, 1.24] }, draw: [8, 1.14], speed: 0.03,
    desc: 'Field science where the samples are: vacuum labs, radio telescopes, geology. Science, plus 3% faster research per level.',
  },
  massDriver: {
    name: 'Mass Driver', icon: 'massDriver', size: 2, bases: ['moon'], jobs: [8, 1.08], unique: true, max: 15, cat: 'spaceflight', req: { tech: 'massDrivers' },
    cost: { credits: [120000, 1.87], metal: [150000, 1.87] }, time: [13, 1.95], prod: { credits: [4000, 1.24] }, draw: [25, 1.16], fuelCut: 0.03,
    desc: 'A kilometre of magnetic rail. Sells lunar metal to orbit and cuts mission fuel by 3% per level.',
  },
  // ---------------- Part 3: colonies across the Solar System ----------------
  greenhouse: {
    name: 'Greenhouse', icon: 'greenhouse', size: 2, bases: ['moon', 'mars', 'ceres', 'titan'], max: 20, cat: 'core', count: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4], req: { tech: 'spaceAgriculture' }, jobs: [4, 1.06],
    cost: { credits: [90000, 1.77], metal: [70000, 1.77] }, time: [11, 1.95], grow: [1.5, 1.2], draw: [8, 1.14],
    desc: 'Hydroponic racks under LED light. A colony that feeds itself grows: more colonists every hour.',
  },
  reactor: {
    name: 'Colony Reactor', icon: 'reactor', size: 2, bases: ['moon', 'mars', 'ceres', 'titan'], max: 25, cat: 'power', count: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5], req: { tech: 'marsDirect' }, jobs: [3, 1.05],
    cost: { credits: [80000, 1.74], metal: [90000, 1.74] }, time: [10, 1.95], gen: [90, 1.24],
    desc: 'A compact fission reactor buried in the regolith. Steady power through dust storms, long nights and Titan\'s gloom.',
  },
  terraformer: {
    name: 'Atmosphere Processor', icon: 'terraformer', size: 2, bases: ['mars'], unique: true, max: 20, cat: 'science', req: { tech: 'planetaryEngineering' }, jobs: [12, 1.08],
    cost: { credits: [400000, 1.8], metal: [350000, 1.8] }, time: [13, 1.95], prod: { science: [3000, 1.24] }, draw: [30, 1.16], terra: 0.04,
    desc: 'Cracks carbonates and vents greenhouse gases into the sky. Terraforming stages run 4% faster per level.',
  },
  beltControl: {
    name: 'Mining Control', icon: 'beltControl', size: 2, bases: ['ceres'], unique: true, max: 20, cat: 'production', req: { tech: 'beltSettlement' }, jobs: [10, 1.08],
    cost: { credits: [500000, 1.8], metal: [300000, 1.8] }, time: [12, 1.95], prod: { rare: [10, 1.24] }, cap: { rare: [2000, 1.5] }, draw: [20, 1.15], claims: 0.05,
    desc: 'Traffic control for a thousand mining tugs. Every asteroid claim produces 5% more per level; refines rare elements.',
  },
  methane: {
    name: 'Hydrocarbon Refinery', icon: 'methane', size: 2, bases: ['titan'], max: 25, cat: 'production', count: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6], req: { tech: 'cryoHabitats' }, jobs: [8, 1.08],
    cost: { credits: [300000, 1.74], metal: [250000, 1.74] }, time: [11, 1.95], prod: { fuel: [6000, 1.24] }, draw: [18, 1.15],
    desc: 'Pumps liquid methane straight out of Kraken Mare. Titan sits on more hydrocarbons than all of Earth\'s oil and gas.',
  },
  fusion: {
    name: 'Fusion Plant', icon: 'fusion', size: 2, bases: ['earth', 'moon', 'mars', 'ceres', 'titan'], max: 25, cat: 'power', count: [1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4], req: { tech: 'fusionPower' }, jobs: [6, 1.06],
    cost: { credits: [600000, 1.74], metal: [500000, 1.74], he3: [150, 1.6] }, time: [12, 1.95], gen: [700, 1.24],
    desc: 'A tokamak burning deuterium and helium-3. Enormous, clean power, if you can keep it fuelled with He-3.',
  },
  elevator: {
    name: 'Space Elevator', icon: 'elevator', size: 2, bases: ['earth'], unique: true, max: 15, cat: 'spaceflight', req: { tech: 'spaceElevator' },
    cost: { credits: [5000000, 1.8], metal: [4000000, 1.8], rare: [3000, 1.6] }, time: [16, 1.95], prod: { credits: [20000, 1.24] }, draw: [60, 1.16], liftCut: 0.03,
    desc: 'A ribbon from the equator to geostationary orbit. Climbers carry cargo up for the price of electricity: rockets and missions cost 3% less per level.',
  },
  casimir: {
    name: 'Casimir Foundry', icon: 'casimir', size: 2, bases: ['earth'], unique: true, max: 20, cat: 'science', req: { tech: 'casimirEffect' },
    cost: { credits: [3e7, 1.7], metal: [2e7, 1.7], rare: [5000, 1.6] }, time: [17, 1.8], prod: { exotic: [3, 1.24] }, cap: { exotic: [300, 1.5] }, draw: [80, 1.16],
    desc: 'Stacks of nanometre-gap plates in a vacuum chamber, squeezing out exotic matter a microgram at a time.',
  },
  xenolab: {
    name: 'Xenology Institute', icon: 'xenolab', size: 2, bases: ['earth'], unique: true, max: 20, cat: 'science', req: { tech: 'xenolinguistics' },
    cost: { credits: [4e7, 1.7], metal: [2.5e7, 1.7] }, time: [17, 1.8], prod: { xeno: [25, 1.24], influence: [8, 1.22] }, cap: { xeno: [10000, 1.5], influence: [4000, 1.5] }, draw: [60, 1.15],
    desc: 'Linguists, xenobiologists and diplomats under one roof. Makes xenodata and influence; each level deciphers languages 5% faster.',
  },
};
// command level → building lots open (Earth)
export const allowedLevel = (def, hq) => Math.min(def.max, def.lot === 'hq' ? def.max : hq * 2 + (def.cat === 'core' ? 0 : 0));
export const allowedCount = (def, hq) => (def.unique ? 1 : def.count ? def.count[Math.min(def.count.length - 1, hq - 1)] : 1);
// storage the player is guaranteed to have at Mission Control level h: the command centre's own vaults plus one
// Logistics Depot at the level the command prerequisites force (2h-4). Costs are clamped under this, so no
// upgrade, research or launch can ever cost more than the player is able to store.
// (levels are never counted above a building's maximum)
export function capRef(h, r) { const v = (d, L) => (d.cap[r] ? d.cap[r][0] * Math.pow(d.cap[r][1], Math.min(d.max, Math.max(1, L)) - 1) : 0); return v(BUILDINGS.hq, h) + v(BUILDINGS.depot, 2 * h - 4) + (r === 'science' ? v(BUILDINGS.research, 2 * h - 4) : 0); }
export const capClamp = (n, h, r) => { const c = capRef(h, r); return c > 0 ? Math.min(n, Math.floor(c * 0.85 / 100) * 100) : n; };
// Mission Control level at which building b's level L first becomes possible
export const unlockHq = (b, L) => { const d = BUILDINGS[b]; if (b === 'hq') return Math.max(1, L - 1); if (b === 'hub') return L + 7; if (!d.bases.includes('earth') && !d.bases.includes('moon')) return Math.ceil(L / 2) + 10; return d.bases.includes('earth') ? Math.max(1, Math.ceil(L / 2)) : Math.ceil(L / 2) + 7; };
// command-building prerequisites: grow the whole base before the next command level (two levels below its cap)
export function cmdReqs(b, L, base) {
  const r = []; const n = 2 * L - 4;
  if (b === 'hq') { if (L >= 3) r.push(['research', n], ['depot', n]); if (L >= 4) r.push(['mine', n], ['office', n]); if (L >= 5) r.push(['launch', n - 2], ['refinery', n - 2]); if (L >= 6) r.push(['vab', n - 4], ['solar', n]); if (L >= 7) r.push(['tracking', n - 4]); if (L >= 8) r.push(['academy', n - 6]); }
  if (b === 'hub' && (!base || base === 'moon')) { if (L >= 2) r.push(['regolith', 2 * L - 2], ['lsolar', 2 * L - 2]); if (L >= 3) r.push(['ice', 2 * L - 3], ['he3x', 2 * L - 4]); if (L >= 4) r.push(['dome', 2 * L - 6], ['llab', 2 * L - 6]); }
  else if (b === 'hub') { const main = { mars: 'regolith', ceres: 'ice', titan: 'ice' }[base]; if (L >= 2) r.push([main, 2 * L - 2], ['dome', 2 * L - 2]); if (L >= 3) r.push(['reactor', 2 * L - 3], ['greenhouse', 2 * L - 4]); if (L >= 4) r.push(['llab', 2 * L - 6]); }
  return r.filter(([, lv]) => lv > 0).map(([rb, lv]) => [rb, Math.min(lv, BUILDINGS[rb].max)]); // never ask for more than a building's maximum
}
export const crewsFromHq = (hq) => 2 + (hq >= 5 ? 1 : 0) + (hq >= 10 ? 1 : 0) + (hq >= 15 ? 1 : 0);
export const CATS = { core: 'Command', production: 'Production', power: 'Power', storage: 'Storage', science: 'Science', spaceflight: 'Spaceflight', defense: 'Defense' };
