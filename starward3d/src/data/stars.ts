// The stellar neighbourhood (ported from Starward). Real stars within ~41 light-years (RA in hours, Dec in degrees, distance in
// light-years, spectral class) with their known planets, then a deterministic procedural fill so the map is full.
// Planet types: temperate, ocean, desert, super (super-Earth), rocky, ice, lava, gas, neptune. hab: 0..1.
import { rng, hash } from '../core/util';
export interface Planet { name: string; type: string; hab: number; note: string; res: Record<string, number>; }
export interface Star { id: string; name: string; ra: number; dec: number; d: number; cls: string; fact: string; planets: Planet[]; pos: [number, number, number]; proc?: boolean; seed: number; story?: boolean | string; }
export interface PType { name: string; col: string[]; out: Record<string, number>; giant?: boolean; remnant?: boolean; belt?: boolean; }
export interface DriveDef { name: string; role: string; hpl: number; yard: number; req: string[]; settlers?: boolean; cost: Record<string, number>; time: number; col: string; desc: string; }
export interface MegaDef { name: string; req: string; stages: number; days: number; cost: Record<string, number>; growth: number; gen?: number; prod?: Record<string, number>; desc: string; effect: string; fund?: boolean; }

const P = (name: string, type: string, hab: number, note: string, res?: Record<string, number>): Planet => ({ name, type, hab, note, res: res || {} });
export const REAL: Record<string, Omit<Star, 'id' | 'pos' | 'seed'>> = {
  proxima: { name: 'Proxima Centauri', ra: 14.495, dec: -62.68, d: 4.24, cls: 'M', fact: 'The nearest star to the Sun: a small red dwarf that flares violently, circling Alpha Centauri A and B at a fifth of a light-year.', planets: [P('Proxima b', 'temperate', 0.55, 'Rocky, 1.07 Earth masses, in the habitable zone, tidally locked.', { metal: 1 }), P('Proxima d', 'rocky', 0.08, 'A scorched little world, a quarter of Earth\'s mass.', { rare: 1 })] },
  acen: { name: 'Alpha Centauri A & B', ra: 14.66, dec: -60.83, d: 4.37, cls: 'G', fact: 'A Sun-like pair, 23 AU apart. In 2025 JWST spotted a possible giant planet in A\'s habitable zone.', planets: [P('Alpha Centauri Ab', 'gas', 0.0, 'A candidate gas giant, its moons inside the habitable zone.', { he3: 1 })] },
  barnard: { name: 'Barnard\'s Star', ra: 17.963, dec: 4.69, d: 5.96, cls: 'M', fact: 'The fastest-moving star in our sky. Four small planets were confirmed around it in 2025.', planets: [P('Barnard b', 'rocky', 0.05, 'A hot rocky world, a third of Earth\'s mass.', { metal: 1 }), P('Barnard c', 'rocky', 0.05, 'Hot and small.', { rare: 1 })] },
  wolf359: { name: 'Wolf 359', ra: 10.94, dec: 7.01, d: 7.86, cls: 'M', fact: 'One of the faintest, smallest stars known. Famous from fiction, quiet in reality.', planets: [] },
  lalande: { name: 'Lalande 21185', ra: 11.055, dec: 35.97, d: 8.31, cls: 'M', fact: 'The brightest red dwarf in the northern sky, with two known planets.', planets: [P('Lalande 21185 b', 'super', 0.15, 'A hot super-Earth.', { metal: 1 }), P('Lalande 21185 c', 'neptune', 0.0, 'A cold ice giant.', { he3: 1 })] },
  sirius: { name: 'Sirius', ra: 6.752, dec: -16.72, d: 8.6, cls: 'A', fact: 'The brightest star in Earth\'s night sky. Its companion, Sirius B, is a white dwarf: a teaspoon weighs tonnes.', planets: [P('Sirius B', 'dwarf', 0.0, 'A white dwarf. Degenerate matter: a laboratory for exotic physics.', { exotic: 1 })] },
  uvceti: { name: 'Luyten 726-8', ra: 1.65, dec: -17.95, d: 8.79, cls: 'M', fact: 'A pair of flare stars; UV Ceti brightens fivefold in minutes.', planets: [] },
  ross154: { name: 'Ross 154', ra: 18.83, dec: -23.84, d: 9.7, cls: 'M', fact: 'A young, active red dwarf in Sagittarius.', planets: [] },
  ross248: { name: 'Ross 248', ra: 23.70, dec: 44.18, d: 10.3, cls: 'M', fact: 'Heading our way: in 36,000 years it will be the closest star to the Sun.', planets: [] },
  epseri: { name: 'Epsilon Eridani', ra: 3.549, dec: -9.46, d: 10.5, cls: 'K', fact: 'A young orange star with dust belts like ours and a giant planet, Ægir. The Triton signal came from here.', planets: [P('Ægir', 'gas', 0.0, 'A Jupiter-mass giant on a wide, tilted orbit.', { he3: 1 }), P('The Inner Belt', 'belt', 0.0, 'A rich asteroid belt at 3 AU.', { metal: 1, rare: 1 })], story: true },
  lacaille: { name: 'Lacaille 9352', ra: 23.10, dec: -35.85, d: 10.7, cls: 'M', fact: 'One of the first red dwarfs to have its diameter measured.', planets: [P('Lacaille 9352 b', 'super', 0.2, 'A warm super-Earth.', { metal: 1 }), P('Lacaille 9352 c', 'super', 0.35, 'A cooler super-Earth near the habitable zone.', { metal: 1 })] },
  ross128: { name: 'Ross 128', ra: 11.791, dec: 0.80, d: 11.0, cls: 'M', fact: 'One of the quietest red dwarfs nearby, with few dangerous flares.', planets: [P('Ross 128 b', 'temperate', 0.7, 'A temperate rocky world, 1.4 Earth masses, under a calm star.', { metal: 1, science: 1 })] },
  ezaqr: { name: 'EZ Aquarii', ra: 22.64, dec: -15.30, d: 11.1, cls: 'M', fact: 'A triple system of three red dwarfs.', planets: [] },
  procyon: { name: 'Procyon', ra: 7.655, dec: 5.22, d: 11.46, cls: 'F', fact: 'A bright white-yellow star with a white-dwarf companion, Procyon B.', planets: [P('Procyon B', 'dwarf', 0.0, 'A white dwarf, hot and dense.', { exotic: 1 })] },
  cygni61: { name: '61 Cygni', ra: 21.12, dec: 38.75, d: 11.4, cls: 'K', fact: 'The first star (after the Sun) whose distance was measured, by Bessel in 1838.', planets: [] },
  struve: { name: 'Struve 2398', ra: 18.71, dec: 59.63, d: 11.5, cls: 'M', fact: 'A red-dwarf pair in Draco with two known planets.', planets: [P('Struve 2398 Bb', 'super', 0.1, 'A hot super-Earth.', { metal: 1 })] },
  groom34: { name: 'Groombridge 34', ra: 0.30, dec: 44.02, d: 11.6, cls: 'M', fact: 'A pair of red dwarfs in Andromeda.', planets: [P('Groombridge 34 Ab', 'super', 0.15, 'A warm super-Earth.', { metal: 1 })] },
  epsind: { name: 'Epsilon Indi', ra: 22.055, dec: -56.79, d: 11.9, cls: 'K', fact: 'An orange star with two brown dwarfs. JWST imaged its cold giant planet directly in 2024.', planets: [P('Epsilon Indi Ab', 'gas', 0.0, 'A cold super-Jupiter, photographed by JWST.', { he3: 1 })] },
  tauceti: { name: 'Tau Ceti', ra: 1.734, dec: -15.94, d: 11.9, cls: 'G', fact: 'A Sun-like star, older than the Sun, ringed by ten times more comets and dust.', planets: [P('Tau Ceti e', 'desert', 0.45, 'A warm super-Earth at the inner edge of the habitable zone.', { metal: 1 }), P('Tau Ceti f', 'ice', 0.4, 'A cold super-Earth at the outer edge.', { science: 1 })] },
  gj1061: { name: 'GJ 1061', ra: 3.598, dec: -44.51, d: 12.0, cls: 'M', fact: 'A quiet red dwarf with three rocky planets, two in its habitable zone.', planets: [P('GJ 1061 c', 'temperate', 0.65, 'A rocky world in the habitable zone.', { metal: 1 }), P('GJ 1061 d', 'ocean', 0.55, 'Cooler; possibly an ocean world.', { science: 1 }), P('GJ 1061 b', 'rocky', 0.05, 'Hot and close to its star.', { rare: 1 })] },
  yzceti: { name: 'YZ Ceti', ra: 1.21, dec: -16.99, d: 12.1, cls: 'M', fact: 'Its innermost planet may generate radio aurorae on the star itself.', planets: [P('YZ Ceti b', 'rocky', 0.05, 'A hot rocky world.', { rare: 1 })] },
  luyten: { name: 'Luyten\'s Star', ra: 7.456, dec: 5.23, d: 12.2, cls: 'M', fact: 'In 2017 we beamed music at it ("Sónar Calling GJ 273b"). Replies are due around 2042.', planets: [P('GJ 273 b', 'super', 0.6, 'A super-Earth in the habitable zone.', { metal: 1 })] },
  teegarden: { name: 'Teegarden\'s Star', ra: 2.888, dec: 16.88, d: 12.5, cls: 'M', fact: 'A dim, old red dwarf whose planet b has one of the highest Earth-similarity scores known.', planets: [P('Teegarden b', 'temperate', 0.85, 'Earth-mass, temperate, Earth Similarity Index 0.95.', { metal: 1, science: 1 }), P('Teegarden c', 'ice', 0.4, 'A cold Earth-mass world.', { science: 1 })] },
  kapteyn: { name: 'Kapteyn\'s Star', ra: 5.194, dec: -45.02, d: 12.8, cls: 'M', fact: 'A halo star, eleven billion years old: a refugee from a galaxy the Milky Way swallowed.', planets: [] },
  altair: { name: 'Altair', ra: 19.846, dec: 8.87, d: 16.7, cls: 'A', fact: 'Spins so fast (once every 9 hours) that it bulges into an egg shape.', planets: [] },
  wolf1061: { name: 'Wolf 1061', ra: 16.51, dec: -12.66, d: 14.0, cls: 'M', fact: 'A red dwarf in Ophiuchus with a planet at the edge of its habitable zone.', planets: [P('Wolf 1061 c', 'desert', 0.5, 'A super-Earth at the inner edge of the habitable zone.', { metal: 1 })] },
  gj581: { name: 'Gliese 581', ra: 15.322, dec: -7.72, d: 20.5, cls: 'M', fact: 'Its "habitable" planets of 2010 turned out to be stellar activity. Two real ones remain.', planets: [P('Gliese 581 c', 'super', 0.2, 'A hot super-Earth.', { metal: 1 })] },
  gj667c: { name: 'Gliese 667 C', ra: 17.31, dec: -34.99, d: 23.6, cls: 'M', fact: 'Part of a triple star; from its planets you would see three suns.', planets: [P('Gliese 667 Cc', 'temperate', 0.7, 'A super-Earth in the habitable zone under three suns.', { metal: 1, science: 1 })] },
  vega: { name: 'Vega', ra: 18.616, dec: 38.78, d: 25.0, cls: 'A', fact: 'Once the pole star, and will be again in 12,000 years. Ringed by a wide dust disk.', planets: [] },
  fomalhaut: { name: 'Fomalhaut', ra: 22.96, dec: -29.62, d: 25.1, cls: 'A', fact: 'Circled by a sharp ring of comets 140 AU across.', planets: [P('The Eye of Sauron', 'belt', 0.0, 'A vast cometary ring.', { metal: 1, he3: 1 })] },
  trappist: { name: 'TRAPPIST-1', ra: 23.107, dec: -5.04, d: 40.7, cls: 'M', fact: 'Seven Earth-sized planets packed closer than Mercury is to the Sun. Three sit in the habitable zone.', planets: [P('TRAPPIST-1 e', 'ocean', 0.85, 'Rocky, Earth-sized, probably watery.', { science: 1 }), P('TRAPPIST-1 f', 'ice', 0.55, 'Icy and temperate beneath.', { science: 1 }), P('TRAPPIST-1 g', 'ice', 0.45, 'The largest of the seven.', { metal: 1 }), P('TRAPPIST-1 d', 'desert', 0.4, 'Small and warm.', { rare: 1 })] },
  cancri55: { name: '55 Cancri', ra: 8.886, dec: 28.33, d: 41.0, cls: 'G', fact: 'Five planets, including 55 Cancri e: a lava world once nicknamed "the diamond planet".', planets: [P('55 Cancri e', 'lava', 0.0, 'Twice Earth\'s size, a lava ocean, possibly carbon-rich.', { rare: 1, exotic: 1 }), P('55 Cancri f', 'gas', 0.0, 'A warm gas giant.', { he3: 1 })] },
};
export const CLASS: Record<string, { name: string; col: string; lum: number }> = {
  O: { name: 'O blue giant', col: '#9bb0ff', lum: 4 }, B: { name: 'B blue-white', col: '#aabfff', lum: 3 }, A: { name: 'A white', col: '#cad7ff', lum: 2.2 }, F: { name: 'F yellow-white', col: '#f8f7ff', lum: 1.6 },
  G: { name: 'G yellow (Sun-like)', col: '#fff4ea', lum: 1.3 }, K: { name: 'K orange', col: '#ffd2a1', lum: 1.05 }, M: { name: 'M red dwarf', col: '#ffb07c', lum: 0.75 }, D: { name: 'white dwarf', col: '#dfe8ff', lum: 0.6 },
};
// planet types: how they look, what they give, how livable they are
export const PTYPE: Record<string, PType> = {
  temperate: { name: 'Temperate world', col: ['#2f6fa8', '#4f8a3f', '#e8e2d6'], out: { credits: 1, science: 0.6 } },
  ocean: { name: 'Ocean world', col: ['#1b4f8a', '#2f7fc0', '#d8ecfb'], out: { science: 1, credits: 0.5 } },
  desert: { name: 'Desert world', col: ['#b8864a', '#d6aa6a', '#f0d8a8'], out: { metal: 1, credits: 0.4 } },
  super: { name: 'Super-Earth', col: ['#6b6a5a', '#8f8a70', '#c9c4a8'], out: { metal: 1.2 } },
  rocky: { name: 'Barren rock', col: ['#5e5a56', '#8f8a84', '#bdb7ae'], out: { metal: 1, rare: 0.3 } },
  ice: { name: 'Ice world', col: ['#9fb8cc', '#d6e6f2', '#ffffff'], out: { fuel: 1, science: 0.4 } },
  lava: { name: 'Lava world', col: ['#2a1a14', '#c9441c', '#ffb347'], out: { rare: 1, metal: 0.5 } },
  gas: { name: 'Gas giant', col: ['#c9a27c', '#efe0c8', '#a0623a'], out: { he3: 1 }, giant: true },
  neptune: { name: 'Ice giant', col: ['#3a6ed8', '#8fd0e0', '#2a4ea8'], out: { he3: 1 }, giant: true },
  dwarf: { name: 'Stellar remnant', col: ['#cfd8ff', '#ffffff', '#9fb0ff'], out: { exotic: 1 }, remnant: true },
  belt: { name: 'Asteroid belt', col: ['#6a645c', '#958d82', '#c2b9ac'], out: { metal: 1, rare: 0.6 }, belt: true },
};
// equatorial → Cartesian light-years (x toward RA 0h, z toward the celestial north pole)
const xyz = (ra: number, dec: number, d: number): [number, number, number] => { const a = (ra * 15 * Math.PI) / 180, b = (dec * Math.PI) / 180; return [d * Math.cos(b) * Math.cos(a), d * Math.cos(b) * Math.sin(a), d * Math.sin(b)]; };
// procedural neighbours: a realistic spectral mix (mostly red dwarfs), Starward Stellar Catalogue names
function procedural() {
  const R = rng(4242); const out: Record<string, any> = {}; const mix: [string, number][] = [['M', 0.72], ['K', 0.12], ['G', 0.07], ['F', 0.03], ['A', 0.01], ['D', 0.05]];
  const types = ['rocky', 'rocky', 'super', 'desert', 'ice', 'gas', 'neptune', 'temperate', 'ocean', 'lava', 'belt'];
  for (let k = 0; k < 150; k++) {
    const d = 13 + Math.pow(R(), 0.6) * 46; const ra = R() * 24, dec = (Math.asin(R() * 2 - 1) * 180) / Math.PI; let x = R(), cls = 'M'; for (const [c, p] of mix) { if (x < p) { cls = c; break; } x -= p; }
    const id = 'ssc' + (1000 + k * 7 + Math.floor(R() * 7)); const n = cls === 'D' ? 1 : Math.floor(R() * 4); const planets: Planet[] = [];
    for (let q = 0; q < n; q++) { const ty = cls === 'D' ? 'dwarf' : types[Math.floor(R() * types.length)]; const hab = ty === 'temperate' ? 0.45 + R() * 0.45 : ty === 'ocean' ? 0.4 + R() * 0.4 : ty === 'desert' ? 0.25 + R() * 0.3 : ty === 'ice' ? 0.15 + R() * 0.3 : ty === 'super' ? 0.1 + R() * 0.35 : 0;
      const res: Record<string, number> = {}; if (R() < 0.08 && !PTYPE[ty].giant) res.exotic = 1; planets.push({ name: `SSC ${id.slice(3)} ${'bcdefg'[q]}`, type: ty, hab: Math.round(hab * 100) / 100, note: '', res }); }
    out[id] = { name: `SSC ${id.slice(3)}`, ra, dec, d: Math.round(d * 10) / 10, cls, planets, proc: true, fact: 'Catalogued by the Helioscend Stellar Survey.' };
  }
  return out;
}
export const STARS: Record<string, Star> = { sol: { id: 'sol', seed: 0, name: 'Sol', ra: 0, dec: 0, d: 0, cls: 'G', fact: 'Home.', planets: [], pos: [0, 0, 0] }, ...(REAL as any), ...procedural() };
for (const id in STARS) { const s: any = STARS[id]; if (!s.pos) s.pos = xyz(s.ra, s.dec, s.d); s.id = id; s.seed = hash(id); }
export const STAR_IDS = Object.keys(STARS).filter((k) => k !== 'sol');

// ---- interstellar drives (ships built at the Orbital Shipyard) ----
// hpl: hours of travel per light-year. Arks carry settlers; scouts survey; warp needs exotic matter.
export const DRIVES: Record<string, DriveDef> = {
  ark: { name: 'Exodus Ark', role: 'Sleeper colony ship', hpl: 36, yard: 7, req: ['sleeperShips'], settlers: true, cost: { credits: 3e7, metal: 2.5e7, he3: 6000, rare: 8000 }, time: 345600, col: '#ffd166', desc: 'Ten thousand colonists asleep in cryo-pods, a fusion engine, and a voyage measured in generations for the ship, days for you.' },
  ramjet: { name: 'Driftrunner', role: 'Bussard ramjet', hpl: 6, yard: 8, req: ['ramjets'], settlers: true, cost: { credits: 6e7, metal: 4e7, he3: 12000, rare: 15000 }, time: 518400, col: '#6ee7ff', desc: 'A magnetic scoop thousands of kilometres wide gathers interstellar hydrogen as fuel. A tenth of light speed and climbing.' },
  warp: { name: 'Herald', role: 'Alcubierre warp ship', hpl: 0.6, yard: 10, req: ['warpDrive'], settlers: true, cost: { credits: 1.5e8, metal: 8e7, exotic: 400, rare: 30000 }, time: 777600, col: '#ff6bd6', desc: 'Space contracts ahead and expands behind; the ship never moves locally at all. Held open by exotic matter.' },
};
export const DRIVE_ORDER = ['ark', 'ramjet', 'warp'];
// ---- star-colony specialisations ----
export const SPECS: Record<string, { name: string; desc: string; k?: number; out?: Record<string, number> }> = {
  balanced: { name: 'Balanced', desc: 'A bit of everything the world offers.', k: 1 },
  mining: { name: 'Mining', desc: 'Metal and rare elements; exotic matter where the world has it.', out: { metal: 2.2, rare: 2.5, exotic: 2.5 } },
  research: { name: 'Research', desc: 'Universities, observatories and xenobiology labs.', out: { science: 2.6 } },
  industry: { name: 'Industry', desc: 'Shipyards, factories and fuel refineries.', out: { credits: 1.6, fuel: 2.2, metal: 1.2 } },
  trade: { name: 'Trade', desc: 'A hub of commerce on the interstellar lanes.', out: { credits: 2.6 } },
};
// what one development level of a star colony yields per hour, before habitability and specialisation
export const COLONY_BASE: Record<string, number> = { credits: 60000, metal: 70000, fuel: 50000, science: 12000, rare: 120, he3: 90, exotic: 2 };
export const COLONY_MAX = 15;
// ---- megastructures ----
export const MEGA: Record<string, MegaDef> = {
  laser: { name: 'Lightsail Laser Array', req: 'laserSails', stages: 5, days: 3, cost: { credits: 2e7, metal: 1.5e7, rare: 6000 }, growth: 1.7, desc: 'A hundred gigawatts of phased lasers on the Moon\'s far side. It pushes gram-scale light sails to a fifth of light speed: survey a star in days. Each stage widens its reach.', effect: 'Survey range' },
  dyson: { name: 'Dyson Swarm', req: 'dysonSwarm', stages: 10, days: 4, cost: { credits: 5e7, metal: 6e7, rare: 15000 }, growth: 1.55, gen: 6000, prod: { credits: 400000, science: 40000 }, desc: 'Millions of solar collectors circling the Sun, built from Mercury. Each stage captures more of the Sun\'s output, and power becomes almost free.', effect: 'Energy, credits and science per stage' },
  gate: { name: 'Sol Wormhole Gate', req: 'wormholeGates', stages: 1, days: 6, cost: { credits: 2e8, metal: 1e8, exotic: 1500 }, growth: 1, desc: 'A throat of exotic matter held open in Sol\'s outer system. Pair it with gates at your star colonies and voyages between them take minutes.', effect: 'Opens the gate network' },
};
// terraforming star colonies (Worldseeding): four stages for rocky, desert, ice, super-Earth and thin-aired worlds.
// The third stage seeds life the programme has fully studied on the Life Ladder; the fourth needs a developed world.
export interface ExoTerraStage { name: string; days: number; cost: Record<string, number>; set: Record<string, number>; desc: string; life?: boolean; dev?: number; }
export const EXO_TERRA: ExoTerraStage[] = [
  { name: 'Atmosphere Factories', days: 2, cost: { credits: 1.5e8, metal: 1.2e8, he3: 15000 }, set: { pressure: 0.35, temp: -20 }, desc: 'Fusion-powered factories bake gases out of the rock: a thin, warming sky with weather in it.' },
  { name: 'Comet Seas', days: 3, cost: { credits: 3e8, metal: 2e8, he3: 30000 }, set: { pressure: 0.8, temp: 8, water: 14 }, desc: 'Ice comets steered in from the system\'s outer belt: rain, rivers and the first shallow seas.' },
  { name: 'Lifeseed', days: 4, cost: { credits: 5e8, science: 3e8, xeno: 5000 }, set: { o2: 5, water: 20 }, life: true, desc: 'Lichens, algae and soil microbes, some from Earth and some from the Life Ladder, spread along the new shores.' },
  { name: 'Breathable Sky', days: 5, cost: { credits: 9e8, science: 5e8, rare: 200000 }, set: { o2: 14, pressure: 1, temp: 15, water: 24 }, dev: 5, desc: 'Forests and plankton finish the work: an open sky people can breathe. No more domes.' },
];
export const EXO_TERRA_TYPES = ['temperate', 'ocean', 'desert', 'super', 'rocky', 'ice'];
