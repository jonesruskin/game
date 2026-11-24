// Building definitions, ported from Starward. Each value is a geometric curve [base, growth] read at the level:
//   cost  cost to reach level L (L = 1 is construction)   time  ladder curve (seconds)
//   prod  output per hour                                cap   storage added      gen / draw  energy
//   count how many may stand, indexed by command level   req   { tech, hq } needed to build
// 3D additions: fp = footprint in grid cells [w, d]; collect = output waits in the building until tapped.
import { TimeDef } from '../core/util';
import { STARS, PTYPE } from './stars';
export type Curve = [number, number];
export interface BuildingDef {
  name: string; fp: [number, number]; bases: string[]; max: number; cat: string; desc: string;
  unique?: boolean; command?: boolean; count?: number[]; req?: { tech?: string; hq?: number };
  cost: Record<string, Curve>; time: TimeDef; prod?: Record<string, Curve>; cap?: Record<string, Curve>; gen?: Curve; draw?: Curve;
  speed?: number; house?: Curve; jobs?: Curve; grow?: Curve; collect?: boolean; instant?: boolean; fuelCut?: number; liftCut?: number; terra?: number; claims?: number;
}
// star colonies' bases are 'exo' (ground) or 'exodeck' (a cloud-top deck over a gas giant), see kindOf
const COL = ['moon', 'mars', 'ceres', 'titan', 'venus', 'exo', 'exodeck'];
const GROUND = ['moon', 'mars', 'ceres', 'titan', 'exo']; // colonies with ground to dig into (Venus and the giants float)
export const BUILDINGS: Record<string, BuildingDef> = {
  // ---------------- Earth ----------------
  hq: {
    name: 'Mission Control', fp: [5, 5], bases: ['earth'], unique: true, command: true, max: 20, cat: 'core',
    cost: { credits: [400, 2.1], metal: [500, 2.1] }, time: [-6, 13, 'ln'],
    prod: { credits: [500, 1.2], science: [30, 1.2] }, cap: { credits: [8000, 1.55], metal: [6000, 1.55], fuel: [3000, 1.55], science: [2500, 1.55], cells: [400, 1.55] }, gen: [12, 1.2],
    desc: 'The heart of the programme. Raising it expands the spaceport, allows higher building levels and adds construction drones at levels 5, 10 and 15.',
  },
  research: {
    name: 'Research Center', fp: [4, 4], bases: ['earth'], unique: true, max: 25, cat: 'science',
    cost: { credits: [250, 1.84], metal: [300, 1.84] }, time: [2, 2.0], prod: { science: [150, 1.24] }, cap: { science: [2000, 1.5] }, draw: [4, 1.14],
    desc: 'Laboratories, wind tunnels and clean rooms. Produces science and runs research projects.',
  },
  university: {
    name: 'University Campus', fp: [4, 4], bases: ['earth'], unique: true, max: 20, cat: 'science', req: { hq: 3 },
    cost: { credits: [1200, 1.84], metal: [1400, 1.84] }, time: [5, 2.0], prod: { science: [90, 1.24] }, draw: [3, 1.14], speed: 0.04,
    desc: 'Trains the next generation of engineers. Each level speeds up all research by 4% and adds science.',
  },
  // ---- the Defence Council: War Games and the defences they test (Earth, from Mission Control 3) ----
  warroom: {
    name: 'War Room', fp: [3, 3], bases: ['earth'], unique: true, max: 15, cat: 'defense', req: { hq: 3 },
    cost: { credits: [3000, 1.8], metal: [2500, 1.8] }, time: [10, 1.95], draw: [4, 1.12],
    desc: 'Your seat on the Defence Council. Daily War Games against other commanders\' bases (holographic, nothing is ever destroyed); every second level adds a robot to your strike squad.',
  },
  turret: {
    name: 'Point-Defence Turret', fp: [2, 2], bases: ['earth'], max: 20, cat: 'defense', count: [0, 0, 2, 2, 3, 3, 4, 4, 5, 5], req: { hq: 3 },
    cost: { credits: [2000, 1.74], metal: [3000, 1.74] }, time: [8, 1.95], draw: [3, 1.12],
    desc: 'Twin rapid-fire cannons on a fast turret. Hits ground robots and flyers alike; short range, quick to swing.',
  },
  laser: {
    name: 'Laser Battery', fp: [2, 2], bases: ['earth'], max: 20, cat: 'defense', count: [0, 0, 0, 1, 2, 2, 3, 3, 4, 4], req: { hq: 4 },
    cost: { credits: [5000, 1.76], metal: [6000, 1.76] }, time: [10, 1.95], draw: [8, 1.13],
    desc: 'A focused beam that burns through one target at a time, from far away. Ground targets only.',
  },
  missile: {
    name: 'Missile Silo', fp: [3, 3], bases: ['earth'], max: 20, cat: 'defense', count: [0, 0, 0, 0, 1, 1, 2, 2, 3, 3], req: { hq: 5 },
    cost: { credits: [9000, 1.78], metal: [10000, 1.78], fuel: [2000, 1.7] }, time: [12, 1.95], draw: [6, 1.13],
    desc: 'Volleys of guided missiles that burst over clusters of robots and flyers. Slow to reload; cannot hit what is right next to it.',
  },
  shield: {
    name: 'Shield Generator', fp: [3, 3], bases: ['earth'], max: 20, cat: 'defense', count: [0, 0, 0, 0, 0, 1, 1, 2, 2, 2], req: { hq: 6 },
    cost: { credits: [14000, 1.8], metal: [12000, 1.8] }, time: [14, 1.95], draw: [12, 1.14],
    desc: 'Projects a dome that soaks up damage for every building inside it, and recharges when it is not under fire.',
  },
  emp: {
    name: 'EMP Tower', fp: [2, 2], bases: ['earth'], max: 20, cat: 'defense', count: [0, 0, 0, 0, 0, 0, 1, 1, 2, 2], req: { hq: 7 },
    cost: { credits: [18000, 1.8], metal: [15000, 1.8] }, time: [14, 1.95], draw: [10, 1.14],
    desc: 'Every few seconds a pulse freezes every robot nearby. Devastating against crowds.',
  },
  wall: {
    name: 'Wall', fp: [1, 1], bases: ['earth'], max: 16, cat: 'defense', instant: true, count: [0, 0, 25, 40, 60, 80, 100, 125, 150, 175], req: { hq: 3 },
    cost: { credits: [200, 1.9] }, time: [0.02, 1.0],
    desc: 'Reinforced barrier blocks. Ground robots must break through or walk around; place them in lines to channel attackers into your defences.',
  },
  mine: {
    name: 'Metal Mine', fp: [3, 3], bases: ['earth'], max: 25, cat: 'production', count: [1, 2, 3, 3, 4, 4, 5, 5, 6, 6], collect: true,
    cost: { credits: [120, 1.74], metal: [80, 1.74] }, time: [1, 2.0], prod: { metal: [900, 1.24] }, draw: [2, 1.14],
    desc: 'Open-pit mining and smelting. Metal piles up at the mine until you collect it.',
  },
  refinery: {
    name: 'Fuel Refinery', fp: [3, 3], bases: ['earth'], max: 25, cat: 'production', count: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5], req: { hq: 2 }, collect: true,
    cost: { credits: [160, 1.74], metal: [220, 1.74] }, time: [1.5, 2.0], prod: { fuel: [450, 1.24] }, draw: [3, 1.14],
    desc: 'Cracks hydrocarbons and liquefies hydrogen and oxygen into rocket propellant.',
  },
  office: {
    name: 'Agency Office', fp: [3, 3], bases: ['earth'], max: 25, cat: 'production', count: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4], collect: true,
    cost: { credits: [80, 1.72], metal: [150, 1.72] }, time: [1, 2.0], prod: { credits: [1100, 1.24] }, draw: [2, 1.14],
    desc: 'Public relations, contracts and grants: the money that keeps rockets flying.',
  },
  solar: {
    name: 'Solar Farm', fp: [3, 3], bases: ['earth'], max: 25, cat: 'power', count: [2, 2, 3, 3, 4, 4, 5, 5, 6, 6],
    cost: { credits: [90, 1.72], metal: [140, 1.72] }, time: [0.5, 1.95], gen: [12, 1.24],
    desc: 'Fields of photovoltaic panels. Clean, quiet power.',
  },
  fission: {
    name: 'Fission Plant', fp: [4, 4], bases: ['earth'], max: 20, cat: 'power', count: [0, 0, 1, 1, 1, 2, 2, 2, 3, 3], req: { tech: 'fission' },
    cost: { credits: [2500, 1.82], metal: [3500, 1.82] }, time: [6, 1.95], gen: [70, 1.27],
    desc: 'A pressurised-water reactor. Dense, reliable power for a growing programme.',
  },
  depot: {
    name: 'Logistics Depot', fp: [3, 3], bases: ['earth'], max: 25, cat: 'storage', count: [1, 1, 1, 2, 2, 2, 3, 3, 3, 4],
    cost: { credits: [180, 1.78], metal: [280, 1.78] }, time: [1.5, 2.0], cap: { credits: [5000, 1.48], metal: [6000, 1.48], fuel: [3500, 1.48], science: [1500, 1.48], cells: [400, 1.48], rare: [800, 1.48], he3: [300, 1.48] }, draw: [1, 1.1],
    desc: 'Warehouses, tank farms and secure data vaults. Raises storage for every basic resource.',
  },
  launch: {
    name: 'Launch Complex', fp: [6, 6], bases: ['earth'], unique: true, max: 20, cat: 'spaceflight', req: { tech: 'rocketry' },
    cost: { credits: [1100, 1.97], metal: [1600, 1.97], fuel: [300, 1.97] }, time: [5, 2.1], draw: [5, 1.18],
    desc: 'Pad, service tower and flame trench. Its level sets the largest rocket you can fly.',
  },
  vab: {
    name: 'Vehicle Assembly', fp: [4, 5], bases: ['earth'], unique: true, max: 20, cat: 'spaceflight', req: { tech: 'multistage' },
    cost: { credits: [1800, 1.92], metal: [3000, 1.92] }, time: [6, 2.1], draw: [6, 1.16],
    desc: 'A cathedral of a hangar where rockets are stacked. Higher levels build bigger rockets faster.',
  },
  tracking: {
    name: 'Tracking Station', fp: [4, 4], bases: ['earth'], unique: true, max: 20, cat: 'spaceflight', req: { tech: 'guidance' },
    cost: { credits: [900, 1.87], metal: [1100, 1.87] }, time: [5.5, 2.0], prod: { science: [60, 1.224] }, draw: [4, 1.15],
    desc: 'Giant dish antennas that talk to spacecraft. Raises mission success and earns science from telemetry.',
  },
  academy: {
    name: 'Astronaut Academy', fp: [4, 4], bases: ['earth'], unique: true, max: 20, cat: 'spaceflight', req: { tech: 'lifeSupport' },
    cost: { credits: [3000, 1.87], metal: [3500, 1.87] }, time: [6.5, 2.0], prod: { science: [40, 1.224] }, draw: [4, 1.15],
    desc: 'Centrifuges, pools and simulators. Crewed missions need graduates; each level makes them 1% safer.',
  },
  // ---------------- robots ----------------
  workshop: {
    name: 'Robotics Workshop', fp: [4, 4], bases: ['earth'], unique: true, max: 20, cat: 'robots', req: { tech: 'automation' },
    cost: { credits: [600, 1.84], metal: [700, 1.84] }, time: [2.5, 2.0], draw: [3, 1.14],
    desc: 'Assembly cells, welders and a test floor where new robots boot up. Builds robot cores; more assembly bays at levels 5, 10 and 15.',
  },
  dock: {
    name: 'Robot Dock', fp: [3, 3], bases: ['earth', 'moon', 'mars', 'ceres', 'titan'], max: 25, cat: 'robots', count: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4], req: { tech: 'automation' },
    cost: { credits: [300, 1.76], metal: [380, 1.76] }, time: [1.5, 2.0], draw: [1, 1.1],
    desc: 'Charging cradles and maintenance arms. Houses robots: 3 plus one per level.',
  },
  cellplant: {
    name: 'Cell Plant', fp: [3, 3], bases: ['earth', 'moon', 'mars', 'ceres', 'titan'], max: 25, cat: 'robots', count: [1, 1, 1, 2, 2, 2, 3, 3, 3, 3], req: { tech: 'automation' },
    cost: { credits: [250, 1.74], metal: [300, 1.74] }, time: [1.5, 2.0], prod: { cells: [60, 1.23] }, cap: { cells: [500, 1.45] }, draw: [3, 1.14],
    desc: 'Charges Power Cells: they level your robots up and power new robot cores.',
  },
  fusionlab: {
    name: 'Fusion Lab', fp: [4, 4], bases: ['earth'], unique: true, max: 20, cat: 'robots', req: { tech: 'robotics', hq: 4 },
    cost: { credits: [5000, 1.84], metal: [5500, 1.84] }, time: [6, 2.0], draw: [6, 1.15],
    desc: 'Merges the minds and bodies of two robots into a new hybrid core. Rarer parents make rarer robots; each level fuses 5% faster.',
  },
  // ---------------- colonies ----------------
  hub: {
    name: 'Colony Hub', fp: [5, 5], bases: COL, unique: true, command: true, max: 20, cat: 'core',
    cost: { credits: [60000, 2.05], metal: [80000, 2.05], fuel: [20000, 2.05] }, time: [7.5, 9.3, 'ln'], prod: { science: [200, 1.2] }, cap: { he3: [600, 1.55], metal: [20000, 1.5], fuel: [15000, 1.5], rare: [500, 1.5] }, gen: [40, 1.2], house: [20, 1.22],
    desc: 'Command, life support and the airlock everyone passes through. Raising it expands the colony and allows higher building levels.',
  },
  regolith: {
    name: 'Regolith Mine', fp: [3, 3], bases: ['moon', 'mars', 'ceres', 'exo'], jobs: [6, 1.08], max: 25, cat: 'production', count: [2, 2, 3, 3, 4, 4, 5, 5, 6, 6], collect: true,
    cost: { credits: [18000, 1.74], metal: [12000, 1.74] }, time: [8, 1.95], prod: { metal: [3200, 1.24] }, draw: [6, 1.14],
    desc: 'Robotic excavators scrape the soil; furnaces pull out iron, aluminium and titanium.',
  },
  ice: {
    name: 'Ice Mine', fp: [3, 3], bases: GROUND, jobs: [6, 1.08], max: 25, cat: 'production', count: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4], collect: true,
    cost: { credits: [22000, 1.74], metal: [16000, 1.74] }, time: [8.5, 1.95], prod: { fuel: [2200, 1.24] }, draw: [7, 1.14],
    desc: 'Buried ice, melted and split into hydrogen and oxygen. Water for the colonists, fuel made outside Earth\'s deep gravity well.',
  },
  he3x: {
    name: 'He-3 Extractor', fp: [3, 3], bases: ['moon'], jobs: [8, 1.08], max: 25, cat: 'production', count: [1, 1, 1, 2, 2, 2, 3, 3, 3, 4], req: { tech: 'he3Mining' },
    cost: { credits: [60000, 1.77], metal: [50000, 1.77], fuel: [10000, 1.72] }, time: [10, 1.95], prod: { he3: [24, 1.24] }, draw: [12, 1.15],
    desc: 'Roasts regolith to release helium-3, a fusion fuel almost absent on Earth.',
  },
  lsolar: {
    name: 'Solar Array', fp: [3, 3], bases: ['moon', 'mars', 'ceres', 'venus', 'exo', 'exodeck'], jobs: [2, 1.05], max: 25, cat: 'power', count: [2, 2, 3, 3, 4, 4, 5, 5, 6, 6],
    cost: { credits: [12000, 1.72], metal: [14000, 1.72] }, time: [7.5, 1.95], gen: [45, 1.24],
    desc: 'Photovoltaic arrays. Superb on the Moon, best of all above the clouds of Venus (190% of Earth\'s sunlight); weaker on Mars (43%) and Ceres (13%).',
  },
  dome: {
    name: 'Habitat Dome', fp: [4, 4], bases: COL, house: [40, 1.22], max: 20, cat: 'core', count: [1, 1, 1, 2, 2, 2, 3, 3, 3, 4], req: { tech: 'lunarHabitats' },
    cost: { credits: [40000, 1.77], metal: [45000, 1.77] }, time: [11, 1.95], prod: { credits: [2600, 1.24] }, cap: { he3: [300, 1.45] }, draw: [6, 1.14],
    desc: 'Homes under glass for colonists, and a garden the tourists pay well to see. Houses colonists.',
  },
  burrow: {
    name: 'Underground Habitat', fp: [4, 4], bases: GROUND, house: [55, 1.22], max: 20, cat: 'core', count: [1, 1, 1, 2, 2, 2, 3, 3, 3, 4], req: { tech: 'isru' },
    cost: { credits: [30000, 1.77], metal: [25000, 1.77] }, time: [10.5, 1.95], draw: [5, 1.14],
    desc: 'Tunnels dug by your robots under metres of regolith: safe from radiation and meteorites, with room for more colonists than a dome. Needs a Geo or Kinetic robot to dig.',
  },
  llab: {
    name: 'Colony Laboratory', fp: [4, 4], bases: COL, jobs: [10, 1.08], unique: true, max: 20, cat: 'science', req: { tech: 'lunarHabitats' },
    cost: { credits: [50000, 1.82], metal: [40000, 1.82] }, time: [11.5, 1.95], prod: { science: [900, 1.24] }, draw: [8, 1.14], speed: 0.03,
    desc: 'Field science where the samples are: vacuum labs, radio telescopes, geology. Science, plus 3% faster research per level.',
  },
  massDriver: {
    name: 'Mass Driver', fp: [2, 7], bases: ['moon'], jobs: [8, 1.08], unique: true, max: 15, cat: 'spaceflight', req: { tech: 'massDrivers' },
    cost: { credits: [120000, 1.87], metal: [150000, 1.87] }, time: [13, 1.95], prod: { credits: [4000, 1.24] }, draw: [25, 1.16], fuelCut: 0.03,
    desc: 'A kilometre of magnetic rail. Sells lunar metal to orbit and cuts mission fuel by 3% per level.',
  },
  greenhouse: {
    name: 'Greenhouse', fp: [4, 3], bases: COL, max: 20, cat: 'core', count: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4], req: { tech: 'spaceAgriculture' }, jobs: [4, 1.06],
    cost: { credits: [90000, 1.77], metal: [70000, 1.77] }, time: [11, 1.95], grow: [1.5, 1.2], draw: [8, 1.14],
    desc: 'Hydroponic racks under LED light. A colony that feeds itself grows: more colonists every hour.',
  },
  reactor: {
    name: 'Colony Reactor', fp: [3, 3], bases: COL, max: 25, cat: 'power', count: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5], req: { tech: 'marsDirect' }, jobs: [3, 1.05],
    cost: { credits: [80000, 1.74], metal: [90000, 1.74] }, time: [10, 1.95], gen: [90, 1.24],
    desc: 'A compact fission reactor buried in the regolith. Steady power through dust storms, long nights and Titan\'s gloom.',
  },
  terraformer: {
    name: 'Atmosphere Processor', fp: [4, 4], bases: ['mars', 'venus'], unique: true, max: 20, cat: 'science', req: { tech: 'planetaryEngineering' }, jobs: [12, 1.08],
    cost: { credits: [400000, 1.8], metal: [350000, 1.8] }, time: [13, 1.95], prod: { science: [3000, 1.24] }, draw: [30, 1.16], terra: 0.04,
    desc: 'Mission control for changing a world: it vents greenhouse gases, steers the mirror and sunshade fleets and tracks every comet. Each terraforming stage needs one more level; stages run 4% faster per level.',
  },
  beltControl: {
    name: 'Mining Control', fp: [4, 4], bases: ['ceres'], unique: true, max: 20, cat: 'production', req: { tech: 'beltSettlement' }, jobs: [10, 1.08],
    cost: { credits: [500000, 1.8], metal: [300000, 1.8] }, time: [12, 1.95], prod: { rare: [10, 1.24] }, cap: { rare: [2000, 1.5] }, draw: [20, 1.15], claims: 0.05,
    desc: 'Traffic control for a thousand mining tugs. Every asteroid claim produces 5% more per level; refines rare elements.',
  },
  skimmer: {
    name: 'Cloud Skimmer', fp: [3, 3], bases: ['venus', 'exodeck'], jobs: [6, 1.08], max: 25, cat: 'production', count: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4], collect: true,
    cost: { credits: [30000, 1.74], metal: [26000, 1.74] }, time: [8.5, 1.95], prod: { fuel: [3200, 1.24] }, draw: [9, 1.14],
    desc: 'Long intakes dangle into the clouds below and haul up CO₂, nitrogen and sulphuric acid: fuel, and water cracked out of the acid for the colonists.',
  },
  resort: {
    name: 'Sky Resort', fp: [4, 4], bases: ['venus'], unique: true, max: 20, cat: 'production', collect: true, req: { tech: 'aerostats' }, jobs: [10, 1.08],
    cost: { credits: [120000, 1.78], metal: [90000, 1.78] }, time: [10, 1.95], prod: { credits: [7000, 1.24] }, draw: [14, 1.15],
    desc: 'Glass promenades over an endless sea of cloud. The richest tourists in the Solar System pay a fortune to watch a Venusian sunrise.',
  },
  methane: {
    name: 'Hydrocarbon Refinery', fp: [3, 3], bases: ['titan'], max: 25, cat: 'production', count: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6], req: { tech: 'cryoHabitats' }, jobs: [8, 1.08], collect: true,
    cost: { credits: [300000, 1.74], metal: [250000, 1.74] }, time: [11, 1.95], prod: { fuel: [6000, 1.24] }, draw: [18, 1.15],
    desc: 'Pumps liquid methane straight out of Kraken Mare. Titan sits on more hydrocarbons than all of Earth\'s oil and gas.',
  },
  fusion: {
    name: 'Fusion Plant', fp: [4, 4], bases: ['earth', ...COL], max: 25, cat: 'power', count: [1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4], req: { tech: 'fusionPower' }, jobs: [6, 1.06],
    cost: { credits: [600000, 1.74], metal: [500000, 1.74], he3: [150, 1.6] }, time: [12, 1.95], gen: [700, 1.24],
    desc: 'A tokamak burning deuterium and helium-3. Enormous, clean power, if you can keep it fuelled with He-3.',
  },
  elevator: {
    name: 'Space Elevator', fp: [4, 4], bases: ['earth'], unique: true, max: 15, cat: 'spaceflight', req: { tech: 'spaceElevator' },
    cost: { credits: [5000000, 1.8], metal: [4000000, 1.8], rare: [3000, 1.6] }, time: [16, 1.95], prod: { credits: [20000, 1.24] }, draw: [60, 1.16], liftCut: 0.03,
    desc: 'A ribbon from the equator to geostationary orbit. Climbers carry cargo up for the price of electricity: rockets and missions cost 3% less per level.',
  },
  casimir: {
    name: 'Casimir Foundry', fp: [4, 4], bases: ['earth'], unique: true, max: 20, cat: 'science', req: { tech: 'casimirEffect' },
    cost: { credits: [3e7, 1.7], metal: [2e7, 1.7], rare: [5000, 1.6] }, time: [17, 1.8], prod: { exotic: [3, 1.24] }, cap: { exotic: [300, 1.5] }, draw: [80, 1.16],
    desc: 'Stacks of nanometre-gap plates in a vacuum chamber, squeezing out exotic matter a microgram at a time.',
  },
  xenolab: {
    name: 'Xenology Institute', fp: [4, 4], bases: ['earth'], unique: true, max: 20, cat: 'science', req: { tech: 'xenolinguistics' },
    cost: { credits: [4e7, 1.7], metal: [2.5e7, 1.7] }, time: [17, 1.8], prod: { xeno: [25, 1.24], influence: [8, 1.22] }, cap: { xeno: [10000, 1.5], influence: [4000, 1.5] }, draw: [60, 1.15],
    desc: 'Linguists, xenobiologists and diplomats under one roof. Makes xenodata and influence; each level deciphers languages 5% faster.',
  },
  antimatter: {
    name: 'Antimatter Factory', fp: [4, 4], bases: ['earth', 'mars', 'ceres', 'titan'], max: 20, cat: 'production', count: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 3], req: { tech: 'antimatterProduction' },
    cost: { credits: [6e9, 1.6], metal: [5e9, 1.6], exotic: [2000, 1.5] }, time: [18, 1.7], prod: { antimatter: [6, 1.24] }, cap: { antimatter: [1500, 1.5] }, draw: [400, 1.15], jobs: [20, 1.06],
    desc: 'A ring accelerator that smashes protons into antiprotons and traps them in magnetic bottles. Fuel for intergalactic drives.',
  },
};
// how long a collector holds its output before it is full (hours)
export const holdHours = (L: number) => 3 + 0.35 * (L - 1);
export const allowedLevel = (d: BuildingDef, hq: number) => Math.min(d.max, d.command ? d.max : hq * 2);
export const allowedCount = (d: BuildingDef, hq: number) => (d.unique ? 1 : d.count ? d.count[Math.min(d.count.length - 1, hq - 1)] : 1);
const capAt = (d: BuildingDef, r: string, L: number) => (d.cap && d.cap[r] ? d.cap[r][0] * Math.pow(d.cap[r][1], Math.min(d.max, Math.max(1, L)) - 1) : 0);
// storage guaranteed at Mission Control level h (its vaults + one depot at the level its prerequisites force);
// costs are clamped under 85% of it, so nothing can ever cost more than the player is able to store
export function capRef(h: number, r: string) { return capAt(BUILDINGS.hq, r, h) + capAt(BUILDINGS.depot, r, 2 * h - 4) + (r === 'science' ? capAt(BUILDINGS.research, r, 2 * h - 4) : 0); }
export function capMax(r: string) { const D = BUILDINGS.depot, Rs = BUILDINGS.research; return capAt(BUILDINGS.hq, r, 20) + allowedCount(D, 20) * capAt(D, r, D.max) + (r === 'science' ? allowedCount(Rs, 20) * capAt(Rs, r, Rs.max) : 0); }
export const fitMax = (cost: Record<string, number>) => { const o: Record<string, number> = {}; for (const r in cost) { const c = capMax(r); o[r] = c > 0 ? Math.min(cost[r], Math.floor((c * 0.85) / 1e4) * 1e4) : cost[r]; } return o; };
export const capClamp = (n: number, h: number, r: string) => { const c = capRef(h, r); return c > 0 ? Math.min(n, Math.floor((c * 0.85) / 100) * 100) : n; };
// the Mission Control level at which building b's level L first becomes possible
export const unlockHq = (b: string, L: number) => { const d = BUILDINGS[b]; if (b === 'hq') return Math.max(1, L - 1); if (b === 'hub') return L + 7; if (!d.bases.includes('earth') && !d.bases.includes('moon')) return Math.ceil(L / 2) + 10; return d.bases.includes('earth') ? Math.max(1, Math.ceil(L / 2)) : Math.ceil(L / 2) + 7; };
// command-building prerequisites: grow the whole base before the next command level
// which building rules a base follows: its own name in the Solar System, 'exo' or 'exodeck' around other stars
export const kindOf = (base: string) => { if (!base.includes(':')) return base; const [st, p] = base.split(':'); const pl = STARS[st] && STARS[st].planets[+p]; return pl && PTYPE[pl.type] && PTYPE[pl.type].giant ? 'exodeck' : 'exo'; };
export function cmdReqs(b: string, L: number, base?: string): [string, number][] {
  const r: [string, number][] = []; const n = 2 * L - 4;
  if (b === 'hq') { if (L >= 3) r.push(['research', n], ['depot', n]); if (L >= 4) r.push(['mine', n], ['office', n]); if (L >= 5) r.push(['launch', n - 2], ['refinery', n - 2]); if (L >= 6) r.push(['vab', n - 4], ['solar', n]); if (L >= 7) r.push(['tracking', n - 4]); if (L >= 8) r.push(['academy', n - 6]); }
  if (b === 'hub' && (!base || base === 'moon')) { if (L >= 2) r.push(['regolith', 2 * L - 2], ['lsolar', 2 * L - 2]); if (L >= 3) r.push(['ice', 2 * L - 3], ['he3x', 2 * L - 4]); if (L >= 4) r.push(['dome', 2 * L - 6], ['llab', 2 * L - 6]); }
  else if (b === 'hub') { const main = ({ mars: 'regolith', ceres: 'ice', titan: 'ice', venus: 'skimmer', exo: 'ice', exodeck: 'skimmer' } as Record<string, string>)[kindOf(base || 'mars')] || 'regolith'; if (L >= 2) r.push([main, 2 * L - 2], ['dome', 2 * L - 2]); if (L >= 3) r.push(['reactor', 2 * L - 3], ['greenhouse', 2 * L - 4]); if (L >= 4) r.push(['llab', 2 * L - 6]); }
  return r.filter(([, lv]) => lv > 0).map(([rb, lv]) => [rb, Math.min(lv, BUILDINGS[rb].max)] as [string, number]);
}
export const crewsFromHq = (hq: number) => 2 + (hq >= 5 ? 1 : 0) + (hq >= 10 ? 1 : 0) + (hq >= 15 ? 1 : 0);
export const CATS: Record<string, string> = { core: 'Command', production: 'Production', power: 'Power', storage: 'Storage', science: 'Science', spaceflight: 'Spaceflight', defense: 'Defence', robots: 'Robots', decor: 'Decor' };
// buildable area (grid cells per side) for a command level; the landscape continues beyond it
export const GRID = 52;
export const areaSide = (base: string, hq: number) => (base === 'earth' ? Math.min(GRID, 24 + 2 * (hq - 1)) : Math.min(40, 18 + 2 * (hq - 1)));
