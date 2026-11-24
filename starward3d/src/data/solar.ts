// The Solar System, ported from Starward: real orbital and physical data for every major body, what can be built
// there (sites: outposts, mining claims, gas-giant scoops), the interplanetary fleet and Mars's terraforming.
// a: semi-major axis (AU); moons give parent and orbit (km). zone decides the drive class needed to reach it.
type C = [number, number];
export interface BodyDef { name: string; type: string; rings?: boolean; a?: number; P?: number; r: number; g?: number; day?: string; temp?: string; atm?: string; zone?: string; travel?: number; fact: string; presence?: string; world?: string; parent?: string; orbit?: number; mult?: Record<string, number>; solar?: number; }
export interface SiteDef { name: string; role: string; req: string; prod?: Record<string, C>; gen?: C; cost: Record<string, C>; fuelCut?: number; travelCut?: number; story?: string; }
export interface ShipDef { name: string; role: string; cls: number; speed: number; yard: number; req: string[]; carries?: number; cost: Record<string, number>; time: number; col: string; desc: string; }
export interface TerraStage { name: string; req: string; days: number; cost: Record<string, number>; set: Record<string, number>; house: number; desc: string; }
export interface TerraDef { start: Record<string, number>; stages: TerraStage[]; }
export const BODIES: Record<string, BodyDef> = {
  sun: { name: 'The Sun', type: 'star', r: 696340, fact: 'Holds 99.86% of the Solar System\'s mass. Its light takes 8 minutes 20 seconds to reach Earth.' },
  mercury: { name: 'Mercury', type: 'Planet', a: 0.387, P: 87.97, r: 2440, g: 0.38, day: '176 Earth days', temp: '−173 to 427 °C', atm: 'None (a thin exosphere)', zone: 'inner', travel: 6,
    fact: 'Its year is shorter than its day: 88 Earth days to circle the Sun, 176 from one noon to the next.', presence: 'outpost', world: 'mercury' },
  venus: { name: 'Venus', type: 'Planet', a: 0.723, P: 224.7, r: 6052, g: 0.9, day: '117 Earth days (spins backwards)', temp: '464 °C', atm: '92 bar CO₂, sulphuric-acid clouds', zone: 'inner', travel: 5,
    fact: 'Hell on the ground, but 50 km up the pressure and temperature are almost Earth-like: the most hospitable place in the Solar System after Earth.', presence: 'outpost', world: 'venus' },
  earth: { name: 'Earth', type: 'Planet', a: 1, P: 365.25, r: 6371, g: 1, day: '24 hours', temp: '15 °C', atm: '1 bar N₂/O₂', zone: 'home', fact: 'Home. The only place we know of with life, so far.', world: 'earth' },
  moon: { name: 'The Moon', type: 'Moon', parent: 'earth', orbit: 384400, P: 27.3, r: 1737, g: 0.17, day: '29.5 Earth days', temp: '−173 to 127 °C', atm: 'None', zone: 'home', fact: 'Moving away from Earth by 3.8 cm a year.', world: 'moon' },
  mars: { name: 'Mars', type: 'Planet', a: 1.524, P: 687, r: 3390, g: 0.38, day: '24 h 37 min', temp: '−63 °C', atm: '0.006 bar CO₂', zone: 'inner', travel: 6,
    fact: 'Olympus Mons is 22 km high, two and a half times Everest. Martian sunsets are blue.', presence: 'colony', world: 'mars', mult: { metal: 1.15, fuel: 1.0 }, solar: 0.43 },
  phobos: { name: 'Phobos', type: 'Moon', parent: 'mars', orbit: 9376, P: 0.319, r: 11, g: 0.0006, day: '7 h 39 min', temp: '−40 °C', atm: 'None', zone: 'inner', travel: 6,
    fact: 'Circles Mars faster than Mars turns, so it rises in the west. In 30-50 million years tides will tear it into a ring.', presence: 'outpost', world: 'phobos' },
  vesta: { name: 'Vesta', type: 'Asteroid', a: 2.36, P: 1325, r: 263, g: 0.025, day: '5 h 20 min', temp: '−85 °C', atm: 'None', zone: 'belt', travel: 8, fact: 'The Rheasilvia crater\'s central peak is 22 km high, one of the tallest mountains in the Solar System.', presence: 'claim', world: 'vesta' },
  ceres: { name: 'Ceres', type: 'Dwarf planet', a: 2.77, P: 1682, r: 470, g: 0.029, day: '9 h 4 min', temp: '−105 °C', atm: 'None', zone: 'belt', travel: 9,
    fact: 'A third of the asteroid belt\'s mass. The bright spots in Occator crater are salt left by briny water from below.', presence: 'colony', world: 'ceres', mult: { fuel: 1.4, rare: 1.0 }, solar: 0.13 },
  pallas: { name: 'Pallas', type: 'Asteroid', a: 2.77, P: 1686, r: 256, g: 0.022, day: '7 h 49 min', temp: '−110 °C', atm: 'None', zone: 'belt', travel: 9, fact: 'Its orbit is tilted 35° to the planets\', which makes it surprisingly hard to reach.', presence: 'claim', world: 'pallas' },
  psyche: { name: 'Psyche', type: 'Asteroid', a: 2.92, P: 1828, r: 113, g: 0.015, day: '4 h 12 min', temp: '−113 °C', atm: 'None', zone: 'belt', travel: 9, fact: 'Probably the exposed iron-nickel core of a shattered protoplanet. NASA\'s Psyche probe launched in 2023 to find out.', presence: 'claim', world: 'psyche' },
  hygiea: { name: 'Hygiea', type: 'Asteroid', a: 3.14, P: 2031, r: 217, g: 0.02, day: '13 h 50 min', temp: '−110 °C', atm: 'None', zone: 'belt', travel: 10, fact: 'Nearly round. It may deserve to be called a dwarf planet.', presence: 'claim', world: 'hygiea' },
  eros: { name: 'Eros', type: 'Near-Earth asteroid', a: 1.458, P: 643, r: 8.4, g: 0.0006, day: '5 h 16 min', temp: '−50 °C', atm: 'None', zone: 'inner', travel: 4, fact: 'The first asteroid ever orbited and landed on, by NEAR Shoemaker in 2001.', presence: 'claim', world: 'eros' },
  bennu: { name: 'Bennu', type: 'Near-Earth asteroid', a: 1.126, P: 437, r: 0.245, g: 0.00001, day: '4 h 18 min', temp: '−20 °C', atm: 'None', zone: 'inner', travel: 3, fact: 'A loose rubble pile. OSIRIS-REx brought 121 g of it back to Earth in 2023.', presence: 'claim', world: 'bennu' },
  jupiter: { name: 'Jupiter', type: 'Gas giant', a: 5.2, P: 4333, r: 69911, g: 2.53, day: '9 h 56 min', temp: '−110 °C (cloud tops)', atm: 'Hydrogen and helium', zone: 'jovian', travel: 14,
    fact: 'Twice as massive as all the other planets combined. The Great Red Spot is a storm wider than Earth.', presence: 'station', world: 'jupiter' },
  io: { name: 'Io', type: 'Moon', parent: 'jupiter', orbit: 421700, P: 1.77, r: 1822, g: 0.18, day: '1.8 Earth days', temp: '−143 °C (lava at 1,600 °C)', atm: 'Thin SO₂', zone: 'jovian', travel: 14,
    fact: 'The most volcanic world known. Its orbit through Jupiter\'s magnetic field drives a current of millions of amperes.', presence: 'outpost', world: 'io' },
  europa: { name: 'Europa', type: 'Moon', parent: 'jupiter', orbit: 671000, P: 3.55, r: 1561, g: 0.13, day: '3.6 Earth days', temp: '−160 °C', atm: 'Trace O₂', zone: 'jovian', travel: 14,
    fact: 'Under 15-25 km of ice lies a salty ocean holding twice as much water as all of Earth\'s oceans.', presence: 'outpost', world: 'europa' },
  ganymede: { name: 'Ganymede', type: 'Moon', parent: 'jupiter', orbit: 1070400, P: 7.15, r: 2634, g: 0.15, day: '7.2 Earth days', temp: '−163 °C', atm: 'Trace O₂', zone: 'jovian', travel: 14,
    fact: 'The largest moon in the Solar System, bigger than Mercury, and the only one with its own magnetic field.', presence: 'outpost', world: 'ganymede' },
  callisto: { name: 'Callisto', type: 'Moon', parent: 'jupiter', orbit: 1882700, P: 16.7, r: 2410, g: 0.13, day: '16.7 Earth days', temp: '−139 °C', atm: 'Trace CO₂', zone: 'jovian', travel: 14,
    fact: 'Outside Jupiter\'s deadliest radiation belts. NASA\'s HOPE study picked it for a crewed base.', presence: 'outpost', world: 'callisto' },
  saturn: { name: 'Saturn', type: 'Gas giant', a: 9.58, P: 10759, r: 58232, g: 1.07, day: '10 h 33 min', temp: '−140 °C (cloud tops)', atm: 'Hydrogen and helium', zone: 'saturnian', travel: 20,
    fact: 'Less dense than water. Its rings are 280,000 km across but mostly only about 10 m thick.', presence: 'station', world: 'saturn', rings: true },
  titan: { name: 'Titan', type: 'Moon', parent: 'saturn', orbit: 1221870, P: 15.95, r: 2575, g: 0.14, day: '16 Earth days', temp: '−179 °C', atm: '1.45 bar nitrogen, orange haze', zone: 'saturnian', travel: 20,
    fact: 'Thicker air than Earth\'s and a seventh of the gravity: you could fly with wings strapped to your arms. It has lakes and rain of liquid methane.', presence: 'colony', world: 'titan', mult: { fuel: 3.0 }, solar: 0.01 },
  enceladus: { name: 'Enceladus', type: 'Moon', parent: 'saturn', orbit: 238000, P: 1.37, r: 252, g: 0.011, day: '1.4 Earth days', temp: '−198 °C', atm: 'Water-vapour plumes', zone: 'saturnian', travel: 20,
    fact: 'The brightest object in the Solar System. Geysers at its south pole spray an ocean into space and feed Saturn\'s E ring.', presence: 'outpost', world: 'enceladus' },
  uranus: { name: 'Uranus', type: 'Ice giant', a: 19.19, P: 30687, r: 25362, g: 0.89, day: '17 h 14 min', temp: '−224 °C', atm: 'H₂, He, methane', zone: 'outer', travel: 30,
    fact: 'Rolls around the Sun on its side, tilted 98°. Each pole gets 42 years of daylight, then 42 of night.', presence: 'station', world: 'uranus' },
  titania: { name: 'Titania', type: 'Moon', parent: 'uranus', orbit: 435910, P: 8.7, r: 788, g: 0.04, day: '8.7 Earth days', temp: '−203 °C', atm: 'None', zone: 'outer', travel: 30, fact: 'The largest moon of Uranus, scarred by canyons up to 1,500 km long.', presence: 'outpost', world: 'titania' },
  neptune: { name: 'Neptune', type: 'Ice giant', a: 30.07, P: 60190, r: 24622, g: 1.14, day: '16 h 6 min', temp: '−214 °C', atm: 'H₂, He, methane', zone: 'outer', travel: 40,
    fact: 'Found by mathematics before anyone saw it (Le Verrier, 1846). Its winds reach 2,100 km/h, the fastest in the Solar System.', presence: 'station', world: 'neptune' },
  triton: { name: 'Triton', type: 'Moon', parent: 'neptune', orbit: 354760, P: 5.88, r: 1353, g: 0.08, day: '5.9 Earth days', temp: '−235 °C', atm: 'Thin nitrogen', zone: 'outer', travel: 40,
    fact: 'Orbits backwards: a captured Kuiper Belt world. Nitrogen geysers shoot 8 km high.', presence: 'outpost', world: 'triton' },
  pluto: { name: 'Pluto', type: 'Dwarf planet', a: 39.48, P: 90560, r: 1188, g: 0.063, day: '6.4 Earth days', temp: '−229 °C', atm: 'Thin nitrogen and methane', zone: 'outer', travel: 48,
    fact: 'A heart-shaped glacier of nitrogen ice, Sputnik Planitia, is bigger than Texas. New Horizons flew past in 2015.', presence: 'outpost', world: 'pluto' },
};
export const BODY_ORDER: string[] = ['mercury', 'venus', 'earth', 'moon', 'mars', 'phobos', 'eros', 'bennu', 'vesta', 'ceres', 'pallas', 'psyche', 'hygiea', 'jupiter', 'io', 'europa', 'ganymede', 'callisto', 'saturn', 'titan', 'enceladus', 'uranus', 'titania', 'neptune', 'triton', 'pluto'];
export const ZONE_CLASS: Record<string, number> = { inner: 1, belt: 1, jovian: 2, saturnian: 2, outer: 3 };
export const ZONE_NAME: Record<string, string> = { home: 'Earth–Moon system', inner: 'Inner system', belt: 'Asteroid belt', jovian: 'Jovian system', saturnian: 'Saturnian system', outer: 'Outer system' };
// rocket class a survey probe needs to reach each zone
export const PROBE_CLASS: Record<string, number> = { inner: 3, belt: 4, jovian: 4, saturnian: 5, outer: 5 };

// ---- what gets built where (outposts, gas-giant stations, mining claims). One entry per body. ----
export const SITES: Record<string, SiteDef> = {
  mercury: { name: 'Helios Array', role: 'Kilometres of mirrors and panels in permanent daylight at the poles, beaming power home.', req: 'solarFurnace', gen: [500, 1.25], prod: { credits: [6000, 1.24] }, cost: { credits: [900000, 1.55], metal: [800000, 1.55], rare: [400, 1.5] } },
  venus: { name: 'Cytherea Aerostat', role: 'A city of balloons floating 50 km up, where the air is breathable-pressure and 25 °C. Tourists pay a fortune.', req: 'aerostats', prod: { science: [3500, 1.24], credits: [9000, 1.24] }, cost: { credits: [700000, 1.55], metal: [500000, 1.55], fuel: [150000, 1.5] } },
  phobos: { name: 'Phobos Depot', role: 'A propellant depot in Martian orbit, refining Phobos dust into fuel. Mars voyages burn less.', req: 'marsDirect', prod: { fuel: [9000, 1.24] }, fuelCut: 0.04, cost: { credits: [500000, 1.55], metal: [400000, 1.55] } },
  vesta: { name: 'Vesta Mining Claim', role: 'Basalt and metal from a battered protoplanet.', req: 'asteroidMining', prod: { metal: [30000, 1.24], rare: [10, 1.24] }, cost: { credits: [600000, 1.55], metal: [300000, 1.55], fuel: [200000, 1.5] } },
  pallas: { name: 'Pallas Mining Claim', role: 'Hydrated minerals: water for fuel, metals for structures.', req: 'asteroidMining', prod: { fuel: [12000, 1.24], metal: [12000, 1.24] }, cost: { credits: [650000, 1.55], metal: [300000, 1.55], fuel: [220000, 1.5] } },
  psyche: { name: 'Psyche Mining Claim', role: 'A mountain of iron, nickel and platinum-group metals. Worth more than Earth\'s economy, on paper.', req: 'asteroidMining', prod: { metal: [45000, 1.24], rare: [30, 1.24] }, cost: { credits: [900000, 1.55], metal: [400000, 1.55], fuel: [300000, 1.5] } },
  hygiea: { name: 'Hygiea Mining Claim', role: 'A dark, carbon-rich world full of ice.', req: 'asteroidMining', prod: { fuel: [20000, 1.24], science: [800, 1.24] }, cost: { credits: [700000, 1.55], metal: [320000, 1.55], fuel: [200000, 1.5] } },
  eros: { name: 'Eros Mining Claim', role: 'A near-Earth asteroid: an easy run, steady rare metals.', req: 'asteroidMining', prod: { rare: [16, 1.24], metal: [10000, 1.24] }, cost: { credits: [400000, 1.55], metal: [250000, 1.55], fuel: [120000, 1.5] } },
  bennu: { name: 'Bennu Sample Works', role: 'Primordial dust older than the planets. Every gram is a laboratory.', req: 'asteroidMining', prod: { science: [2500, 1.24], rare: [6, 1.24] }, cost: { credits: [350000, 1.55], metal: [200000, 1.55], fuel: [100000, 1.5] } },
  jupiter: { name: 'Jovian He-3 Scoop', role: 'A ramjet that skims Jupiter\'s upper atmosphere and sifts out helium-3.', req: 'gasGiantScoops', prod: { he3: [60, 1.24] }, cost: { credits: [2500000, 1.55], metal: [1800000, 1.55], rare: [1500, 1.5] } },
  io: { name: 'Io Flux Tap', role: 'Harvests the electric current Io drives through Jupiter\'s magnetosphere.', req: 'radiationShielding', gen: [900, 1.25], cost: { credits: [1800000, 1.55], metal: [1200000, 1.55], rare: [1000, 1.5] } },
  europa: { name: 'Europa Deep Probe', role: 'A nuclear melt-probe boring through the ice towards the hidden ocean.', req: 'xenobiology', prod: { science: [12000, 1.24] }, cost: { credits: [2000000, 1.55], metal: [1000000, 1.55], he3: [300, 1.5] }, story: 'europaLife' },
  ganymede: { name: 'Ganymede Shield Base', role: 'Sheltered by the moon\'s own magnetic field: research labs and Jovian traffic control.', req: 'radiationShielding', prod: { science: [8000, 1.24], credits: [12000, 1.24] }, cost: { credits: [1600000, 1.55], metal: [1300000, 1.55] } },
  callisto: { name: 'Callisto Staging Base', role: 'A radiation-safe port for the Jovian system. Ships to Jupiter fly faster.', req: 'radiationShielding', prod: { credits: [10000, 1.24] }, travelCut: 0.05, cost: { credits: [1400000, 1.55], metal: [1100000, 1.55] } },
  saturn: { name: 'Saturn He-3 Scoop', role: 'Skims Saturn\'s atmosphere for helium-3; a sister rig mines the rings for ice.', req: 'gasGiantScoops', prod: { he3: [80, 1.24], fuel: [20000, 1.24] }, cost: { credits: [3500000, 1.55], metal: [2500000, 1.55], rare: [2000, 1.5] } },
  enceladus: { name: 'Enceladus Geyser Station', role: 'Catches the plumes: water, salts and organic molecules from an ocean.', req: 'gasGiantScoops', prod: { fuel: [25000, 1.24], science: [9000, 1.24] }, cost: { credits: [2800000, 1.55], metal: [2000000, 1.55] } },
  uranus: { name: 'Uranian He-3 Scoop', role: 'Deep in the cold: rich helium-3, slow to bring home.', req: 'advancedFusion', prod: { he3: [140, 1.24] }, cost: { credits: [6000000, 1.55], metal: [4500000, 1.55], rare: [4000, 1.5] } },
  titania: { name: 'Titania Station', role: 'Canyon-side research station studying the ice giants.', req: 'advancedFusion', prod: { science: [20000, 1.24], rare: [40, 1.24] }, cost: { credits: [5000000, 1.55], metal: [3500000, 1.55] } },
  neptune: { name: 'Neptunian He-3 Scoop', role: 'The richest helium-3 in the Solar System, at the end of the line.', req: 'advancedFusion', prod: { he3: [200, 1.24] }, cost: { credits: [8000000, 1.55], metal: [6000000, 1.55], rare: [5000, 1.5] } },
  triton: { name: 'Triton Deep-Space Array', role: 'A radio telescope on the coldest surface known, listening beyond the Solar System.', req: 'advancedFusion', prod: { science: [30000, 1.24] }, cost: { credits: [7000000, 1.55], metal: [5000000, 1.55] }, story: 'tritonSignal' },
  pluto: { name: 'Tombaugh Station', role: 'Humanity\'s farthest outpost, on the shore of a nitrogen glacier. Beyond: the stars.', req: 'advancedFusion', prod: { science: [25000, 1.24], credits: [20000, 1.24] }, cost: { credits: [9000000, 1.55], metal: [6500000, 1.55], he3: [2000, 1.5] }, story: 'plutoEdge' },
};
export const SITE_MAX = 15;

// ---- the interplanetary fleet: reusable ships built at the Orbital Shipyard (a station module) ----
export const SHIPS: Record<string, ShipDef> = {
  hermes: { name: 'Hermes', role: 'Nuclear-thermal transfer vehicle', cls: 1, speed: 1, yard: 1, req: ['nuclearThermal'], cost: { credits: 400000, metal: 500000, fuel: 150000 }, time: 43200, col: '#6ee7ff', desc: 'A reactor heats hydrogen to 2,500 °C: twice the efficiency of chemical rockets. It reaches anywhere out to the asteroid belt.' },
  ares: { name: 'Ares', role: 'Colony transport', cls: 1, speed: 0.8, yard: 2, req: ['colonyShips'], carries: 80, cost: { credits: 700000, metal: 900000, fuel: 250000 }, time: 64800, col: '#ffd166', desc: 'Spin-gravity decks for eighty colonists, their seeds, tools and pets. Slow, but it gets families to Mars and Ceres.' },
  daedalus: { name: 'Daedalus', role: 'Fusion torch ship', cls: 2, speed: 2, yard: 4, req: ['fusionDrive'], carries: 40, cost: { credits: 3000000, metal: 2500000, he3: 800, rare: 1200 }, time: 129600, col: '#b892ff', desc: 'Helium-3 fusion burning the whole way: Jupiter in hours, not years. It reaches Saturn too.' },
  odyssey: { name: 'Odyssey', role: 'Antimatter-catalysed fusion cruiser', cls: 3, speed: 3, yard: 6, req: ['advancedFusion'], carries: 60, cost: { credits: 9000000, metal: 7000000, he3: 3000, rare: 5000 }, time: 259200, col: '#ff6bd6', desc: 'A pinch of antimatter lights a fusion fire hot enough for the ice giants and Pluto.' },
};
export const SHIP_ORDER = ['hermes', 'ares', 'daedalus', 'odyssey'];

// ---- terraforming Mars: seven stages, each a long project. Values after the stage completes. ----
export const TERRA: Record<string, TerraDef> = {
  mars: { start: { temp: -63, pressure: 0.006, water: 0, o2: 0 }, stages: [
    { name: 'Orbital Mirrors', req: 'planetaryEngineering', days: 2, cost: { credits: 6000000, metal: 5000000, rare: 2000 }, set: { temp: -50 }, house: 0.05, desc: 'Aluminium-foil mirrors a hundred kilometres wide focus sunlight on the polar caps. Frozen CO₂ begins to boil off.' },
    { name: 'Greenhouse Factories', req: 'planetaryEngineering', days: 3, cost: { credits: 8000000, metal: 6000000, fuel: 3000000 }, set: { temp: -30, pressure: 0.05 }, house: 0.05, desc: 'Plants across Mars pump out super-greenhouse gases. The planet warms itself, and the air thickens.' },
    { name: 'Comet Bombardment', req: 'cometCapture', days: 4, cost: { credits: 12000000, fuel: 6000000, he3: 2000 }, set: { temp: -15, pressure: 0.25, water: 4 }, house: 0.1, desc: 'Ice comets nudged from the outer system strike the planet, delivering water and nitrogen by the cubic kilometre.' },
    { name: 'Magnetic Shield', req: 'magnetosphere', days: 3, cost: { credits: 15000000, metal: 9000000, rare: 6000 }, set: { pressure: 0.35 }, house: 0.1, desc: 'A superconducting dipole at the Mars–Sun L1 point casts a magnetic shadow. The solar wind can no longer strip the new air away.' },
    { name: 'Liquid Oceans', req: 'hydrosphere', days: 5, cost: { credits: 20000000, metal: 8000000, he3: 4000 }, set: { temp: -2, pressure: 0.5, water: 25 }, house: 0.15, desc: 'For the first time in three billion years, rain falls on Mars and rivers find the old ocean beds.' },
    { name: 'Lichen and Algae', req: 'extremophiles', days: 4, cost: { credits: 16000000, science: 3000000, rare: 8000 }, set: { temp: 3, o2: 3, water: 28 }, house: 0.15, desc: 'Engineered lichens, mosses and algae spread from the equator. The red planet begins to turn green-grey.' },
    { name: 'Forests and Oxygen', req: 'ecopoiesis', days: 7, cost: { credits: 30000000, science: 5000000, he3: 8000, rare: 12000 }, set: { temp: 8, pressure: 0.7, o2: 14, water: 32 }, house: 0.4, desc: 'Pines and engineered grasses breathe out oxygen. Colonists walk outside with nothing but a breather mask.' },
  ] },
};
