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
    cost: { credits: [400, 1.95], metal: [500, 1.95] }, time: [20, 1.78],
    prod: { credits: [500, 1.25], science: [30, 1.25] }, cap: { credits: [8000, 1.55], metal: [6000, 1.55], fuel: [3000, 1.55], science: [2500, 1.55] }, gen: [12, 1.2],
    desc: 'The heart of the programme. Raising it opens more building lots, allows higher building levels and adds engineering crews at levels 5, 10 and 15.',
  },
  research: {
    name: 'Research Center', icon: 'research', size: 2, bases: ['earth'], unique: true, max: 25, cat: 'science',
    cost: { credits: [250, 1.72], metal: [300, 1.72] }, time: [25, 1.72], prod: { science: [150, 1.3] }, cap: { science: [2000, 1.5] }, draw: [4, 1.14],
    desc: 'Laboratories, wind tunnels and clean rooms. Produces science and runs research projects.',
  },
  university: {
    name: 'University Campus', icon: 'university', size: 2, bases: ['earth'], unique: true, max: 20, cat: 'science', req: { hq: 3 },
    cost: { credits: [1200, 1.72], metal: [1400, 1.72] }, time: [240, 1.74], prod: { science: [90, 1.3] }, draw: [3, 1.14], speed: 0.04,
    desc: 'Trains the next generation of engineers. Each level speeds up all research by 4% and adds science.',
  },
  mine: {
    name: 'Metal Mine', icon: 'mine', size: 2, bases: ['earth'], max: 25, cat: 'production', count: [1, 2, 3, 3, 4, 4, 5, 5, 6, 6],
    cost: { credits: [120, 1.62], metal: [80, 1.62] }, time: [10, 1.72], prod: { metal: [900, 1.3] }, draw: [2, 1.14],
    desc: 'Open-pit mining and smelting. Produces metal around the clock.',
  },
  refinery: {
    name: 'Fuel Refinery', icon: 'refinery', size: 2, bases: ['earth'], max: 25, cat: 'production', count: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5], req: { hq: 2 },
    cost: { credits: [160, 1.62], metal: [220, 1.62] }, time: [15, 1.72], prod: { fuel: [450, 1.3] }, draw: [3, 1.14],
    desc: 'Cracks hydrocarbons and liquefies hydrogen and oxygen into rocket propellant.',
  },
  office: {
    name: 'Agency Office', icon: 'office', size: 2, bases: ['earth'], max: 25, cat: 'production', count: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4],
    cost: { credits: [80, 1.6], metal: [150, 1.6] }, time: [12, 1.72], prod: { credits: [1100, 1.3] }, draw: [2, 1.14],
    desc: 'Public relations, contracts and grants: the money that keeps rockets flying.',
  },
  solar: {
    name: 'Solar Farm', icon: 'solar', size: 2, bases: ['earth'], max: 25, cat: 'power', count: [2, 2, 3, 3, 4, 4, 5, 5, 6, 6],
    cost: { credits: [90, 1.6], metal: [140, 1.6] }, time: [8, 1.7], gen: [12, 1.24],
    desc: 'Fields of photovoltaic panels. Clean, quiet power.',
  },
  fission: {
    name: 'Fission Plant', icon: 'fission', size: 2, bases: ['earth'], max: 20, cat: 'power', count: [0, 0, 1, 1, 1, 2, 2, 2, 3, 3], req: { tech: 'fission' },
    cost: { credits: [2500, 1.7], metal: [3500, 1.7] }, time: [600, 1.74], gen: [70, 1.27],
    desc: 'A pressurised-water reactor. Dense, reliable power for a growing programme.',
  },
  depot: {
    name: 'Logistics Depot', icon: 'depot', size: 2, bases: ['earth'], max: 25, cat: 'storage', count: [1, 1, 1, 2, 2, 2, 3, 3, 3, 4],
    cost: { credits: [180, 1.66], metal: [280, 1.66] }, time: [20, 1.74], cap: { credits: [5000, 1.48], metal: [6000, 1.48], fuel: [3500, 1.48], science: [1500, 1.48] }, draw: [1, 1.1],
    desc: 'Warehouses, tank farms and secure data vaults. Raises storage for every basic resource.',
  },
  launch: {
    name: 'Launch Complex', icon: 'launch', size: 3, bases: ['earth'], unique: true, lot: 'pad', max: 20, cat: 'spaceflight', req: { tech: 'rocketry' },
    cost: { credits: [1100, 1.85], metal: [1600, 1.85], fuel: [300, 1.85] }, time: [120, 1.78], draw: [5, 1.18],
    desc: 'Pad, service tower and flame trench. Its level sets the largest rocket you can fly.',
  },
  vab: {
    name: 'Vehicle Assembly', icon: 'vab', size: 2, bases: ['earth'], unique: true, max: 20, cat: 'spaceflight', req: { tech: 'multistage' },
    cost: { credits: [1800, 1.8], metal: [3000, 1.8] }, time: [300, 1.78], draw: [6, 1.16],
    desc: 'A cathedral of a hangar where rockets are stacked. Higher levels build bigger rockets faster.',
  },
  tracking: {
    name: 'Tracking Station', icon: 'tracking', size: 2, bases: ['earth'], unique: true, max: 20, cat: 'spaceflight', req: { tech: 'guidance' },
    cost: { credits: [900, 1.75], metal: [1100, 1.75] }, time: [200, 1.76], prod: { science: [60, 1.28] }, draw: [4, 1.15],
    desc: 'Giant dish antennas that talk to spacecraft. Raises mission success and earns science from telemetry.',
  },
};
// command level → building lots open (Earth)
export const allowedLevel = (def, hq) => Math.min(def.max, def.lot === 'hq' ? def.max : hq * 2 + (def.cat === 'core' ? 0 : 0));
export const allowedCount = (def, hq) => (def.unique ? 1 : def.count ? def.count[Math.min(def.count.length - 1, hq - 1)] : 1);
export const crewsFromHq = (hq) => 2 + (hq >= 5 ? 1 : 0) + (hq >= 10 ? 1 : 0) + (hq >= 15 ? 1 : 0);
export const CATS = { core: 'Command', production: 'Production', power: 'Power', storage: 'Storage', science: 'Science', spaceflight: 'Spaceflight', defense: 'Defense' };
