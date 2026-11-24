import { ladder } from '../util.js';
import { capClamp } from './buildings.js';
// STARWARD: the technology tree. Costs and times come from the tier unless overridden.
// Effects: mult.{res} (+% output), gen (+% energy), buildTime (−%), researchTime (−%), cap (+% storage),
//          crews (+n), slots (+n research slots), costs (−% build costs), flag (unlocks a game system)
export const BRANCHES = {
  rocketry: { name: 'Rocketry', color: '#ff8a5b' }, engineering: { name: 'Engineering', color: '#b8c4d6' }, energy: { name: 'Energy', color: '#ffd166' },
  computing: { name: 'Computing', color: '#6ee7ff' }, economy: { name: 'Economy', color: '#7cf29a' }, life: { name: 'Life Sciences', color: '#ff9bd2' }, astro: { name: 'Astronomy', color: '#b892ff' },
  planetary: { name: 'Planetary', color: '#ff7a59' }, interstellar: { name: 'Interstellar', color: '#ff6bd6' },
};
export const TECH = {
  // ---- Rocketry ----
  rocketry: { name: 'Rocketry Fundamentals', branch: 'rocketry', tier: 1, req: [], effect: {}, unlocks: 'Launch Complex', desc: 'Newton\'s third law, thrust, specific impulse. The first step off the planet.' },
  liquidProp: { name: 'Liquid Propellants', branch: 'rocketry', tier: 1, req: ['rocketry'], effect: { mult: { fuel: 0.15 } }, desc: 'Kerosene and liquid oxygen: throttleable, restartable, powerful. Fuel output +15%.' },
  multistage: { name: 'Multistage Rockets', branch: 'rocketry', tier: 2, req: ['liquidProp'], effect: {}, unlocks: 'Vehicle Assembly', desc: 'Drop the empty tanks on the way up. The trick that makes orbit possible.' },
  guidance: { name: 'Inertial Guidance', branch: 'rocketry', tier: 2, req: ['rocketry', 'computing'], effect: {}, unlocks: 'Tracking Station', desc: 'Gyroscopes and accelerometers that know where the rocket is going.' },
  orbital: { name: 'Orbital Mechanics', branch: 'rocketry', tier: 3, req: ['multistage', 'guidance'], effect: { flag: 'orbit' }, unlocks: 'Satellite launches', desc: 'Kepler, Hohmann and the art of falling around the Earth.' },
  cryo: { name: 'Cryogenic Engines', branch: 'rocketry', tier: 3, req: ['multistage'], effect: { mult: { fuel: 0.1 }, flag: 'cryo' }, desc: 'Liquid hydrogen at −253 °C: the highest-efficiency chemical rocket. Fuel output +10%.' },
  crewed: { name: 'Human Spaceflight', branch: 'rocketry', tier: 4, req: ['orbital', 'lifeSupport'], effect: { flag: 'crewed' }, unlocks: 'Crewed missions', desc: 'Capsules, launch-escape towers and splashdowns. People in space.' },
  reusable: { name: 'Reusable Boosters', branch: 'rocketry', tier: 5, req: ['crewed', 'simulation'], effect: { flag: 'reusable' }, desc: 'Land the first stage and fly it again. Launch costs collapse.' },
  heavy: { name: 'Heavy Lift Vehicles', branch: 'rocketry', tier: 5, req: ['crewed', 'alloys'], effect: { flag: 'heavy' }, desc: 'Super-heavy rockets for the Moon and beyond.' },
  // ---- Engineering ----
  automation: { name: 'Industrial Automation', branch: 'engineering', tier: 1, req: [], effect: { mult: { metal: 0.15 } }, desc: 'Conveyor belts, robots and process control. Metal output +15%.' },
  alloys: { name: 'Aerospace Alloys', branch: 'engineering', tier: 2, req: ['automation'], effect: { mult: { metal: 0.15 } }, desc: 'Aluminium-lithium and titanium alloys: light and strong. Metal output +15%.' },
  modular: { name: 'Modular Construction', branch: 'engineering', tier: 2, req: ['automation'], effect: { buildTime: 0.08 }, desc: 'Prefabricated sections assembled on site. Construction 8% faster.' },
  robotics: { name: 'Construction Robotics', branch: 'engineering', tier: 3, req: ['modular', 'microchips'], effect: { crews: 1 }, desc: 'Tireless robotic builders join your crews. +1 engineering crew.' },
  composites: { name: 'Carbon Composites', branch: 'engineering', tier: 3, req: ['alloys'], effect: { costs: 0.06 }, desc: 'Carbon fibre everything. Build costs −6%.' },
  additive: { name: 'Additive Manufacturing', branch: 'engineering', tier: 4, req: ['composites', 'simulation'], effect: { buildTime: 0.1, costs: 0.05 }, desc: '3D-printed engines and structures. Construction 10% faster, costs −5%.' },
  // ---- Energy ----
  photovoltaics: { name: 'Advanced Photovoltaics', branch: 'energy', tier: 1, req: [], effect: { gen: 0.15 }, desc: 'Multi-junction solar cells. Energy generation +15%.' },
  batteries: { name: 'Grid Storage', branch: 'energy', tier: 2, req: ['photovoltaics'], effect: { cap: 0.12 }, desc: 'Lithium battery farms smooth the grid and let you stockpile more. Storage +12%.' },
  grid: { name: 'Smart Grid', branch: 'energy', tier: 2, req: ['photovoltaics', 'computing'], effect: { gen: 0.12 }, desc: 'Software-balanced power distribution. Energy generation +12%.' },
  fission: { name: 'Nuclear Fission', branch: 'energy', tier: 3, req: ['grid'], effect: {}, unlocks: 'Fission Plant', desc: 'Split the atom, boil the water, spin the turbine.' },
  breeder: { name: 'Breeder Reactors', branch: 'energy', tier: 4, req: ['fission'], effect: { gen: 0.2 }, desc: 'Reactors that make more fuel than they burn. Energy generation +20%.' },
  // ---- Computing ----
  computing: { name: 'Computer Science', branch: 'computing', tier: 1, req: [], effect: { researchTime: 0.05, mult: { science: 0.1 } }, desc: 'Algorithms, compilers, numerical methods. Research 5% faster, science +10%.' },
  microchips: { name: 'Microprocessors', branch: 'computing', tier: 2, req: ['computing'], effect: { mult: { science: 0.15 } }, desc: 'A computer on a chip. Science +15%.' },
  networks: { name: 'Global Networks', branch: 'computing', tier: 3, req: ['microchips'], effect: { slots: 1 }, desc: 'Laboratories worldwide share data in real time. +1 parallel research project.' },
  simulation: { name: 'Simulation & Modelling', branch: 'computing', tier: 3, req: ['microchips'], effect: { buildTime: 0.05, mult: { science: 0.1 } }, desc: 'Test it in silicon before steel. Construction 5% faster, science +10%.' },
  ai: { name: 'Artificial Intelligence', branch: 'computing', tier: 5, req: ['simulation', 'networks'], effect: { crews: 1, researchTime: 0.1 }, desc: 'Machine minds plan, design and supervise. +1 crew, research 10% faster.' },
  // ---- Economy ----
  outreach: { name: 'Public Outreach', branch: 'economy', tier: 1, req: [], effect: { mult: { credits: 0.15 } }, desc: 'Launch broadcasts and school visits win hearts and budgets. Credits +15%.' },
  contracts: { name: 'Commercial Contracts', branch: 'economy', tier: 2, req: ['outreach'], effect: { mult: { credits: 0.2 } }, desc: 'Sell launches, data and patents. Credits +20%.' },
  logistics: { name: 'Supply Chains', branch: 'economy', tier: 2, req: ['outreach'], effect: { cap: 0.15 }, desc: 'Just-in-time logistics. Storage +15%.' },
  investors: { name: 'Private Investment', branch: 'economy', tier: 3, req: ['contracts'], effect: { mult: { credits: 0.25 } }, desc: 'Venture capital discovers space. Credits +25%.' },
  // ---- Life sciences ----
  medicine: { name: 'Space Medicine', branch: 'life', tier: 2, req: ['computing'], effect: {}, desc: 'What weightlessness does to bone, muscle and mind.' },
  lifeSupport: { name: 'Life Support Systems', branch: 'life', tier: 3, req: ['medicine'], effect: {}, desc: 'Scrubbers, water recycling and oxygen generation for crewed vehicles.' },
  // ---- Astronomy ----
  radioAstro: { name: 'Radio Astronomy', branch: 'astro', tier: 1, req: [], effect: { mult: { science: 0.1 } }, desc: 'Listen to the universe in radio waves. Science +10%.' },
  telescopes: { name: 'Space Telescopes', branch: 'astro', tier: 4, req: ['orbital', 'radioAstro'], effect: { flag: 'telescopes' }, unlocks: 'Telescope satellites', desc: 'Above the atmosphere the sky is perfectly sharp.' },
  // ---- Part 2: orbit & the Moon ----
  satComms: { name: 'Communication Satellites', branch: 'astro', tier: 3, req: ['orbital'], effect: {}, unlocks: 'Comms satellites', desc: 'Arthur C. Clarke\'s geostationary relays: a satellite that hangs over one spot of the Earth.' },
  remoteSensing: { name: 'Remote Sensing', branch: 'astro', tier: 3, req: ['orbital'], effect: {}, unlocks: 'Observation & weather satellites', desc: 'Multispectral cameras and radar that read the planet from above.' },
  orbitalOps: { name: 'Orbital Operations', branch: 'rocketry', tier: 4, req: ['orbital', 'networks'], effect: { flag: 'orbitalOps' }, desc: 'Traffic control for crowded orbits. +1 low-orbit and +1 geostationary slot.' },
  gps: { name: 'Satellite Navigation', branch: 'astro', tier: 4, req: ['satComms', 'networks'], effect: {}, unlocks: 'Navigation satellites', desc: 'Atomic clocks in orbit. Know where everything is, to the centimetre.' },
  deepSpace: { name: 'Deep Space Navigation', branch: 'rocketry', tier: 4, req: ['orbital', 'guidance'], effect: {}, unlocks: 'Lunar probes, deep space relays', desc: 'Trajectory design and the Deep Space Network: reaching beyond Earth orbit.' },
  spaceStation: { name: 'Orbital Assembly', branch: 'engineering', tier: 5, req: ['crewed', 'additive'], effect: {}, unlocks: 'Space station', desc: 'Dock modules in orbit and bolt them together: a permanent home in space.' },
  closedLoop: { name: 'Closed-Loop Ecology', branch: 'life', tier: 5, req: ['lifeSupport', 'spaceStation'], effect: {}, unlocks: 'Habitat modules', desc: 'Recycle every drop of water and breath of air. Long stays become possible.' },
  constellations: { name: 'Satellite Constellations', branch: 'astro', tier: 5, req: ['orbitalOps', 'reusable'], effect: { flag: 'constellations' }, desc: 'Cheap mass-produced satellites in swarms. +2 low-orbit slots.' },
  lunarLanders: { name: 'Lunar Landers', branch: 'rocketry', tier: 6, req: ['deepSpace', 'heavy'], effect: {}, unlocks: 'Crewed lunar landing', desc: 'Descent engines, landing legs and the nerve to fly them.' },
  spacePower: { name: 'Space-Based Solar Power', branch: 'energy', tier: 6, req: ['spaceStation', 'breeder'], effect: {}, unlocks: 'Solar power satellites', desc: 'Collect sunlight where it never sets and beam it home.' },
  isru: { name: 'In-Situ Resource Utilisation', branch: 'engineering', tier: 6, req: ['lunarLanders', 'closedLoop'], effect: {}, unlocks: 'Lunar outpost', desc: 'Live off the land: oxygen from rock, water from ice, metal from regolith.' },
  he3Mining: { name: 'Helium-3 Extraction', branch: 'energy', tier: 7, req: ['isru'], effect: { flag: 'he3' }, unlocks: 'He-3 Extractor', desc: 'Heat tonnes of regolith to release a few grams of the perfect fusion fuel.' },
  lunarHabitats: { name: 'Lunar Habitats', branch: 'life', tier: 7, req: ['isru'], effect: {}, unlocks: 'Habitat Dome, Lunar Lab', desc: 'Regolith-shielded domes where people can live for years.' },
  massDrivers: { name: 'Mass Drivers', branch: 'engineering', tier: 7, req: ['isru', 'spacePower'], effect: {}, unlocks: 'Mass Driver', desc: 'Electromagnetic rails that fling cargo off the Moon without a drop of fuel.' },
  lowGravity: { name: 'Low-Gravity Industry', branch: 'engineering', tier: 7, req: ['isru'], effect: { mult: { metal: 0.15 } }, desc: 'Smelt, cast and print in one-sixth gravity. Metal output +15%.' },
  // ---- Part 3: the Solar System ----
  planetaryProbes: { name: 'Planetary Probes', branch: 'planetary', tier: 7, req: ['deepSpace', 'telescopes'], effect: {}, unlocks: 'Survey probes to any world', desc: 'Radioisotope power, autonomous navigation and patience: robotic eyes on every planet.' },
  nuclearThermal: { name: 'Nuclear Thermal Propulsion', branch: 'rocketry', tier: 7, req: ['heavy', 'fission'], effect: {}, unlocks: 'Hermes transfer ships', desc: 'A reactor heats hydrogen to 2,500 °C. Twice the efficiency of chemistry: the inner Solar System opens up.' },
  orbitalShipyard: { name: 'Orbital Shipyards', branch: 'engineering', tier: 7, req: ['spaceStation', 'robotics'], effect: {}, unlocks: 'Shipyard station module', desc: 'Build ships too big to launch, in orbit where they will fly.' },
  marsDirect: { name: 'Mars Direct', branch: 'planetary', tier: 8, req: ['nuclearThermal', 'isru'], effect: {}, unlocks: 'Mars colony, colony reactors, Phobos Depot', desc: 'Make the return fuel on Mars from its own air. Robert Zubrin\'s plan, finally flown.' },
  asteroidMining: { name: 'Asteroid Mining', branch: 'planetary', tier: 8, req: ['nuclearThermal', 'robotics'], effect: {}, unlocks: 'Mining claims in the belt', desc: 'Grapple, bag and digest a mountain. One metal asteroid outweighs every mine on Earth.' },
  spaceAgriculture: { name: 'Space Agriculture', branch: 'life', tier: 8, req: ['closedLoop', 'lunarHabitats'], effect: {}, unlocks: 'Greenhouses (colonists grow)', desc: 'Hydroponics, LED light and Martian soil washed of perchlorates. Colonies that feed themselves can grow.' },
  fusionPower: { name: 'Fusion Power', branch: 'energy', tier: 8, req: ['he3Mining', 'breeder'], effect: { gen: 0.1 }, unlocks: 'Fusion Plant', desc: 'Deuterium–helium-3 fusion: almost no neutrons, almost no waste, power without end. Energy +10%.' },
  aerostats: { name: 'Aerostat Habitats', branch: 'planetary', tier: 8, req: ['planetaryProbes', 'composites'], effect: {}, unlocks: 'Venus cloud city', desc: 'Breathable air is a lifting gas in Venus\'s heavy CO₂. A city can simply float.' },
  colonyShips: { name: 'Colony Ships', branch: 'life', tier: 9, req: ['marsDirect', 'spaceAgriculture'], effect: {}, unlocks: 'Ares colony transports', desc: 'Spin gravity, radiation shelters and room for families: mass emigration begins.' },
  beltSettlement: { name: 'Belt Settlement', branch: 'planetary', tier: 10, req: ['asteroidMining', 'colonyShips'], effect: {}, unlocks: 'Ceres colony, Mining Control', desc: 'Ceres has water, gravity enough to stand in, and every asteroid within reach. The belt gets a capital.' },
  planetaryEngineering: { name: 'Planetary Engineering', branch: 'planetary', tier: 9, req: ['marsDirect', 'spacePower'], effect: {}, unlocks: 'Terraforming stages 1-2, Atmosphere Processor', desc: 'Change a whole world\'s climate on purpose. Start with mirrors and greenhouse gases.' },
  solarFurnace: { name: 'Helios Concentrators', branch: 'energy', tier: 9, req: ['spacePower', 'planetaryProbes'], effect: { gen: 0.05 }, unlocks: 'Mercury Helios Array', desc: 'Mercury gets seven times Earth\'s sunlight. Build where the light is. Energy +5%.' },
  radiationShielding: { name: 'Radiation Shielding', branch: 'life', tier: 10, req: ['colonyShips', 'medicine'], effect: {}, unlocks: 'Jovian moon outposts', desc: 'Water walls, magnetic bubbles and radiation-hardened medicine for Jupiter\'s killing belts.' },
  fusionDrive: { name: 'Fusion Drive', branch: 'rocketry', tier: 10, req: ['fusionPower', 'nuclearThermal'], effect: {}, unlocks: 'Daedalus torch ships', desc: 'Fusion exhaust at thousands of kilometres per second: thrust the whole way, Jupiter in hours.' },
  gasGiantScoops: { name: 'Atmospheric Scoops', branch: 'energy', tier: 11, req: ['fusionDrive', 'he3Mining'], effect: {}, unlocks: 'He-3 scoops on Jupiter and Saturn, Enceladus', desc: 'Dive into a gas giant at 60 km/s, gulp helium-3, climb back out. Repeat forever.' },
  cometCapture: { name: 'Comet Capture', branch: 'planetary', tier: 10, req: ['planetaryEngineering', 'asteroidMining'], effect: {}, unlocks: 'Terraforming stage 3', desc: 'Tiny pushes, applied decades early, steer an ice comet onto a chosen spot on Mars.' },
  magnetosphere: { name: 'Planetary Magnetic Shield', branch: 'planetary', tier: 10, req: ['planetaryEngineering', 'fusionPower'], effect: {}, unlocks: 'Terraforming stage 4', desc: 'A 1-2 tesla dipole at Mars–Sun L1 shades the planet from the solar wind (NASA, 2017).' },
  xenobiology: { name: 'Xenobiology', branch: 'life', tier: 11, req: ['radiationShielding', 'ai'], effect: {}, unlocks: 'Europa Deep Probe', desc: 'How to recognise life that isn\'t ours, and how not to kill it by accident.' },
  cryoHabitats: { name: 'Cryogenic Habitats', branch: 'planetary', tier: 11, req: ['fusionDrive', 'beltSettlement'], effect: {}, unlocks: 'Titan colony, Hydrocarbon Refinery', desc: 'Insulated settlements for −180 °C, heated by fusion, under an orange sky.' },
  hydrosphere: { name: 'Ocean Engineering', branch: 'planetary', tier: 11, req: ['cometCapture', 'magnetosphere'], effect: {}, unlocks: 'Terraforming stage 5', desc: 'Melt the permafrost, fill the northern basin: an ocean for Mars.' },
  spaceElevator: { name: 'Space Elevator', branch: 'engineering', tier: 11, req: ['alloys', 'orbitalShipyard', 'fusionPower'], effect: {}, unlocks: 'Space Elevator', desc: 'A carbon-nanotube ribbon from the equator to geostationary orbit. Climb to space by train.' },
  extremophiles: { name: 'Engineered Extremophiles', branch: 'life', tier: 12, req: ['xenobiology', 'hydrosphere'], effect: {}, unlocks: 'Terraforming stage 6', desc: 'Lichens and algae rewritten to thrive in cold, thin, radiation-soaked air.' },
  advancedFusion: { name: 'Antimatter-Catalysed Fusion', branch: 'rocketry', tier: 12, req: ['fusionDrive', 'cryoHabitats'], effect: {}, unlocks: 'Odyssey cruisers, the outer planets', desc: 'A few micrograms of antiprotons ignite fusion hotter than any magnet can hold.' },
  ecopoiesis: { name: 'Ecopoiesis', branch: 'life', tier: 13, req: ['extremophiles'], effect: {}, unlocks: 'Terraforming stage 7', desc: 'Not engineering a planet: gardening one. Forests, soil and a breathable sky.' },
  // ---- Part 4: interstellar ----
  laserSails: { name: 'Laser Light Sails', branch: 'interstellar', tier: 13, req: ['solarFurnace', 'spaceElevator'], effect: {}, unlocks: 'Starshot Laser Array (megastructure)', desc: 'Gram-scale probes on sails thinner than a soap bubble, pushed by lasers to a fifth of light speed.' },
  exoplanetology: { name: 'Exoplanetology', branch: 'interstellar', tier: 13, req: ['planetaryProbes', 'xenobiology'], effect: { mult: { science: 0.1 } }, desc: 'Read a world\'s atmosphere from its starlight. Science +10%.' },
  sleeperShips: { name: 'Sleeper Ships', branch: 'interstellar', tier: 14, req: ['advancedFusion', 'cryoHabitats'], effect: {}, unlocks: 'Exodus Ark', desc: 'Cryogenic suspension for ten thousand. Decades pass in a dreamless night.' },
  starColonies: { name: 'Star Colonies', branch: 'interstellar', tier: 14, req: ['exoplanetology', 'colonyShips'], effect: {}, unlocks: 'Settling exoplanets (capacity 2)', desc: 'Governance, supply and culture across light-years: how to found a world you will never visit.' },
  dysonSwarm: { name: 'Dyson Swarm', branch: 'energy', tier: 14, req: ['solarFurnace', 'spaceElevator'], effect: {}, unlocks: 'Dyson Swarm (megastructure)', desc: 'Disassemble Mercury into a cloud of mirrors and collectors around the Sun.' },
  casimirEffect: { name: 'Casimir Engineering', branch: 'interstellar', tier: 15, req: ['laserSails', 'fusionDrive'], effect: {}, unlocks: 'Casimir Foundry (exotic matter)', desc: 'Plates a few atoms apart squeeze the vacuum itself: negative energy density, bottled.' },
  ramjets: { name: 'Bussard Ramjets', branch: 'rocketry', tier: 15, req: ['sleeperShips', 'gasGiantScoops'], effect: {}, unlocks: 'Pathfinder ramjets', desc: 'Scoop interstellar hydrogen with magnetic fields a thousand kilometres wide and burn it on the fly.' },
  domeWorlds: { name: 'Dome Worlds', branch: 'interstellar', tier: 15, req: ['starColonies', 'extremophiles'], effect: {}, unlocks: 'Settle hostile worlds, giants and belts (+2 capacity)', desc: 'Domes, orbital habitats and mining stations: no world is too hostile to settle.' },
  xenoarchaeology: { name: 'Xenoarchaeology', branch: 'life', tier: 15, req: ['exoplanetology', 'xenobiology'], effect: { mult: { science: 0.1 } }, desc: 'The study of minds that are not human, from what they leave behind. Science +10%.' },
  interstellarTrade: { name: 'Interstellar Commerce', branch: 'economy', tier: 16, req: ['starColonies', 'domeWorlds'], effect: { mult: { credits: 0.15 } }, unlocks: 'Star colonies +15% (+2 capacity)', desc: 'Light-lag contracts, tachyon-free banking and the first interstellar brands. Credits +15%.' },
  warpTheory: { name: 'Warp Field Theory', branch: 'interstellar', tier: 16, req: ['casimirEffect', 'ramjets'], effect: {}, desc: 'Alcubierre\'s metric, made practical: the energy budget falls from a galaxy\'s worth to a few tonnes of exotic matter.' },
  warpDrive: { name: 'Warp Drive', branch: 'rocketry', tier: 17, req: ['warpTheory'], effect: {}, unlocks: 'Herald warp ships', desc: 'Space folds ahead and unfolds behind. Light-years in an afternoon.' },
  wormholeGates: { name: 'Wormhole Gates', branch: 'interstellar', tier: 17, req: ['warpTheory', 'dysonSwarm'], effect: {}, unlocks: 'Sol Gate and colony gates', desc: 'Two throats of a wormhole, held open with exotic matter and towed apart. Step through, arrive light-years away.' },
  // ---- Part 5: contact ----
  contactProtocols: { name: 'First Contact Protocols', branch: 'life', tier: 16, req: ['exoplanetology', 'xenoarchaeology'], effect: {}, unlocks: 'Meeting alien civilisations', desc: 'What to say, what never to say, and who gets to speak for humanity. Written in a hurry.' },
  xenolinguistics: { name: 'Xenolinguistics', branch: 'computing', tier: 17, req: ['contactProtocols'], effect: {}, unlocks: 'Deciphering alien languages, Xenology Institute', desc: 'Grammar without grammar, meaning without shared senses. AI linguists and a lot of patience.' },
  xenodiplomacy: { name: 'Xenodiplomacy', branch: 'economy', tier: 18, req: ['xenolinguistics', 'interstellarTrade'], effect: {}, unlocks: 'Embassies and agreements', desc: 'Treaties with minds that do not share our instincts, our senses or our idea of a promise.' },
  upliftEthics: { name: 'Uplift Ethics', branch: 'life', tier: 18, req: ['xenolinguistics', 'extremophiles'], effect: {}, unlocks: 'Uplifting minor species', desc: 'When, if ever, may an elder species accelerate a younger one? The debate ends with a protocol.' },
  // ---- Part 6: conflict ----
  navalWarfare: { name: 'Naval Warfare', branch: 'engineering', tier: 18, req: ['fusionDrive', 'ai'], effect: {}, unlocks: 'Corvettes, frigates, fleet operations', desc: 'We never wanted warships. The Swarm did not ask what we wanted.' },
  planetaryDefence: { name: 'Planetary Defence', branch: 'engineering', tier: 19, req: ['navalWarfare'], effect: {}, unlocks: 'Defences and shields for every base and colony', desc: 'Laser batteries, missile silos and plasma shields over every world we hold.' },
  guidedOrdnance: { name: 'Guided Ordnance', branch: 'rocketry', tier: 19, req: ['navalWarfare'], effect: {}, unlocks: 'Destroyers', desc: 'Missiles that think, swarm and pick out the biggest target.' },
  capitalShips: { name: 'Capital Ships', branch: 'engineering', tier: 20, req: ['guidedOrdnance', 'planetaryDefence'], effect: {}, unlocks: 'Cruisers and battleships', desc: 'Kilometre-long hulls with layered armour and spinal weapons.' },
  swarmTactics: { name: 'Swarm Tactics', branch: 'computing', tier: 20, req: ['planetaryDefence', 'xenolinguistics'], effect: {}, unlocks: '+25% damage against the Kr\'thul', desc: 'We studied how the Swarm thinks. Now we can think one move ahead of it.' },
  carrierWarfare: { name: 'Carrier Warfare', branch: 'rocketry', tier: 21, req: ['capitalShips'], effect: {}, unlocks: 'Carriers', desc: 'Motherships launching clouds of autonomous missile drones.' },
};
// science 60·3.6^(T-1) and credits 200·3.2^(T-1) up to tier 8, then ×2 / ×1.9 per tier (tracks the empire's
// income instead of exploding); clamped under the storage guaranteed at the tech's Mission Control gate
const tierCurve = (b, g, g2, T) => b * Math.pow(g, Math.min(T, 8) - 1) * Math.pow(g2, Math.max(0, T - 8));
export const techCost = (t) => { if (t.cost) return t.cost; const T = t.tier, h = t.hq || Math.max(1, T); return { science: capClamp(Math.round(tierCurve(60, 3.6, 2, T) / 10) * 10, h, 'science'), credits: capClamp(Math.round(tierCurve(200, 3.2, 1.9, T) / 10) * 10, h, 'credits') }; };
// Mission Control gates: the spaceflight programme follows the size of the agency (Clash-style town-hall gating)
const HQ_GATE = { orbital: 4, satComms: 4, lifeSupport: 4, crewed: 5, cryo: 5, deepSpace: 6, spaceStation: 6, heavy: 7, reusable: 7, closedLoop: 7, constellations: 7, lunarLanders: 8, spacePower: 8, isru: 9, he3Mining: 9, lowGravity: 9, lunarHabitats: 10, massDrivers: 10,
  planetaryProbes: 10, nuclearThermal: 10, orbitalShipyard: 10, marsDirect: 10, spaceAgriculture: 10, asteroidMining: 11, fusionPower: 11, aerostats: 11, colonyShips: 11, planetaryEngineering: 11,
  beltSettlement: 12, solarFurnace: 12, radiationShielding: 12, fusionDrive: 12, gasGiantScoops: 12, cometCapture: 12, magnetosphere: 12, xenobiology: 13, cryoHabitats: 13, hydrosphere: 13, spaceElevator: 13, extremophiles: 13, advancedFusion: 13, ecopoiesis: 14,
  laserSails: 13, exoplanetology: 13, sleeperShips: 14, starColonies: 14, dysonSwarm: 14, casimirEffect: 15, ramjets: 15, domeWorlds: 15, xenoarchaeology: 15, interstellarTrade: 16, warpTheory: 16, warpDrive: 17, wormholeGates: 17,
  contactProtocols: 16, xenolinguistics: 16, xenodiplomacy: 17, upliftEthics: 17,
  navalWarfare: 17, planetaryDefence: 18, guidedOrdnance: 18, capitalShips: 18, swarmTactics: 19, carrierWarfare: 19 };
for (const k in HQ_GATE) if (TECH[k]) TECH[k].hq = HQ_GATE[k];
// tier 1 ≈ 1 min, 3 ≈ 1 h, 5 ≈ 12 h, 6 ≈ 1 day, 7 ≈ 2 days, 8 ≈ 4 days, 9+ a week or more (before speed bonuses)
export const techTime = (t) => t.time || Math.round(ladder(3 + 3.6 * (t.tier - 1)));
