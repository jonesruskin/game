import { ladder } from '../util.js';
import { capClamp } from './buildings.js';
// STARWARD: the technology tree. Costs and times come from the tier unless overridden.
// Effects: mult.{res} (+% output), gen (+% energy), buildTime (−%), researchTime (−%), cap (+% storage),
//          crews (+n), slots (+n research slots), costs (−% build costs), flag (unlocks a game system)
export const BRANCHES = {
  rocketry: { name: 'Rocketry', color: '#ff8a5b' }, engineering: { name: 'Engineering', color: '#b8c4d6' }, energy: { name: 'Energy', color: '#ffd166' },
  computing: { name: 'Computing', color: '#6ee7ff' }, economy: { name: 'Economy', color: '#7cf29a' }, life: { name: 'Life Sciences', color: '#ff9bd2' }, astro: { name: 'Astronomy', color: '#b892ff' },
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
};
// science 60·3.6^(T-1), credits 200·3.2^(T-1), clamped under the storage guaranteed at the tech's Mission Control gate
export const techCost = (t) => { if (t.cost) return t.cost; const T = t.tier, h = t.hq || Math.max(1, T); return { science: capClamp(Math.round(60 * Math.pow(3.6, T - 1) / 10) * 10, h, 'science'), credits: capClamp(Math.round(200 * Math.pow(3.2, T - 1) / 10) * 10, h, 'credits') }; };
// Mission Control gates: the spaceflight programme follows the size of the agency (Clash-style town-hall gating)
const HQ_GATE = { orbital: 4, satComms: 4, lifeSupport: 4, crewed: 5, cryo: 5, deepSpace: 6, spaceStation: 6, heavy: 7, reusable: 7, closedLoop: 7, constellations: 7, lunarLanders: 8, spacePower: 8, isru: 9, he3Mining: 9, lowGravity: 9, lunarHabitats: 10, massDrivers: 10 };
for (const k in HQ_GATE) if (TECH[k]) TECH[k].hq = HQ_GATE[k];
// tier 1 ≈ 1 min, 3 ≈ 1 h, 5 ≈ 12 h, 6 ≈ 1 day, 7 ≈ 2 days, 8 ≈ 4 days, 9+ a week or more (before speed bonuses)
export const techTime = (t) => t.time || Math.round(ladder(3 + 3.6 * (t.tier - 1)));
