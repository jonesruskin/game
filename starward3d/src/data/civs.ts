// The civilisations (ported from Starward). Seven handcrafted species with homes at real stars, their temperaments, what they
// trade and the knowledge they guard; procedural minor species on a few worlds; first-contact choices; requests.
// Tiers: 0 microbial · 1 flora/fauna · 2 tribal · 3 industrial · 4 spacefaring · 5 ascended.
export interface Civ { name: string; tier: number; star: string; planet?: number; base: number; temper: string; col: string; art: string; origin: string; lore: string; likes: string; dislikes: string; trade: { label: string; eff?: Record<string, number>; prod?: Record<string, number>; mult?: Record<string, number>; grow?: number } | null; gifts?: string; minor?: boolean; hostile?: boolean; extinct?: boolean; seed?: number; }
export interface XenoDef { sp: string; name: string; rel: number; xeno: number; eff: { mult?: Record<string, number>; buildTime?: number; researchTime?: number; slots?: number; flag?: string }; desc: string; }
export const TIERS = ['Microbial life', 'Flora and fauna', 'Tribal', 'Industrial', 'Spacefaring', 'Ascended'];
export const CIVS: Record<string, Civ> = {
  veyari: { name: 'Veyari', tier: 4, star: 'vega', base: 10, temper: 'Benevolent, testing', col: '#9ff0ff', art: 'crystal', origin: 'Emissaries of the Large Magellanic Cloud, a satellite galaxy 160,000 light-years away',
    lore: 'Crystalline gardeners who have tended young civilisations for a hundred million years. They watch how a species treats those weaker than itself, and teach only those who show restraint.', likes: 'restraint, uplifting the weak', dislikes: 'exploitation, showing strength',
    trade: { label: 'Mentorship', eff: { researchTime: 0.1 } }, gifts: 'science' },
  lumen: { name: 'Lumen Concord', tier: 4, star: 'altair', base: 20, temper: 'Mercantile', col: '#ffd166', art: 'plasma', origin: 'Plasma beings who live in the magnetic storms of fast-spinning stars',
    lore: 'Self-sustaining knots of plasma and light, ten metres across, who think in frequencies. They trade in everything, and above all in exotic matter, which they harvest from their star\'s spin.', likes: 'trade, generous gifts', dislikes: 'silence, hoarding',
    trade: { label: 'Exotic matter caravans', prod: { exotic: 6 }, mult: { credits: 0.05 } }, gifts: 'credits' },
  synod: { name: 'Synod of Iron', tier: 4, star: 'fomalhaut', base: 0, temper: 'Calculating', col: '#b8c4d6', art: 'machine', origin: 'A machine civilisation that outlived its makers, mining Fomalhaut\'s comet ring',
    lore: 'Billions of minds in a lattice of iron and silicon. They negotiate in data and remember every promise to the decimal place. An ally of unmatched precision, or a nemesis that never forgets.', likes: 'mathematics, data, kept promises', dislikes: 'music, broken deals',
    trade: { label: 'Data exchange', mult: { science: 0.12 } }, gifts: 'science' },
  mycelar: { name: 'Mycelar', tier: 3, star: 'gj667c', base: 30, temper: 'Peaceful, slow', col: '#c9ff9a', art: 'fungal', origin: 'A planet-wide fungal network under three suns',
    lore: 'One mind spread through a continent of mycelium, thinking a single thought a day. Gentle and patient, it shapes ecosystems the way we shape clay, and offers biotech to those who listen.', likes: 'music, patience, gardens', dislikes: 'shows of strength',
    trade: { label: 'Living soils and spore-bread (colony food +30%)', mult: { fuel: 0.08 }, grow: 0.5 }, gifts: 'fuel' },
  oshoru: { name: 'Oshoru', tier: 2, star: 'trappist', planet: 0, base: 0, temper: 'Curious, vulnerable', col: '#6ec8ff', art: 'aquatic', minor: true, origin: 'An aquatic people in the oceans of TRAPPIST-1 e',
    lore: 'Clever, playful swimmers with a culture of song, on the edge of discovering fire through undersea volcanoes. They do not know we exist. What we do next will shape their whole history.', likes: 'gentle contact, protection', dislikes: 'exploitation',
    trade: { label: 'Deep song archives and kelp harvests (colony food +15%)', mult: { science: 0.05 } }, gifts: 'science' },
  krthul: { name: 'Kr\'thul Swarm', tier: 4, star: 'kapteyn', base: -60, temper: 'Hostile, consuming', col: '#ff6b6b', art: 'insect', hostile: true, origin: 'From Gaia-Enceladus, a dwarf galaxy the Milky Way swallowed ten billion years ago, riding in with stars like Kapteyn\'s',
    lore: 'A hive of trillions of insectoid drones and a few vast queens. They strip worlds to the bedrock and move on. They have noticed the relay at Epsilon Eridani, and through it, us.', likes: 'tribute, weakness', dislikes: 'everything else',
    trade: null, gifts: 'metal' },
  hollow: { name: 'The Hollow', tier: 5, star: 'epseri', base: 0, temper: 'Extinct', col: '#c9b6ff', art: 'hollow', extinct: true, origin: 'The ancients who built the relay, gone for a million years',
    lore: 'Builders of the relays, lighthouses on the paths between stars. They vanished a million years ago. Their ruins remain, and the machines in them still work.', likes: '', dislikes: '', trade: null },
};
export const CIV_ORDER = ['veyari', 'lumen', 'synod', 'mycelar', 'oshoru', 'krthul', 'hollow'];
// first contact: how each opening lands (relation change by species; default for others)
export const OPENINGS: Record<string, { name: string; desc: string; d: Record<string, number> }> = {
  math: { name: 'Prime numbers', desc: 'A pulse train of primes: 2, 3, 5, 7, 11. Universal, unmistakably artificial.', d: { synod: 25, veyari: 10, lumen: 5, mycelar: 0, krthul: -5, oshoru: 0 } },
  music: { name: 'Music', desc: 'Bach, gamelan, whale song and the Voyager record.', d: { mycelar: 25, lumen: 15, oshoru: 20, synod: -10, veyari: 10, krthul: -5 } },
  strength: { name: 'A show of strength', desc: 'Fly the fleet past and light up the drives.', d: { krthul: 15, synod: 5, veyari: -25, mycelar: -20, lumen: -5, oshoru: -30 } },
  silence: { name: 'Watch in silence', desc: 'Observe, learn, and say nothing yet.', d: { veyari: 15, oshoru: 10, lumen: -15, synod: -5, mycelar: 5, krthul: 0 } },
};
// what understanding unlocks (percent)
export const UNDERSTAND: Record<string, number> = { trade: 25, pact: 50, knowledge: 75, alliance: 100 };
// alien knowledge, bought with xenodata once you understand a species well enough and they like you enough
export const XENOTECH: Record<string, XenoDef> = {
  crystalLattice: { sp: 'veyari', name: 'Crystal Lattice Engineering', rel: 40, xeno: 3000, eff: { mult: { metal: 0.1, credits: 0.1, fuel: 0.1, science: 0.1 } }, desc: 'Structures grown atom by atom as single crystals. All production +10%.' },
  gardenersPatience: { sp: 'veyari', name: 'The Gardeners\' Patience', rel: 70, xeno: 8000, eff: { buildTime: 0.12 }, desc: 'Build as a garden grows: everything in its place, nothing wasted. Construction 12% faster.' },
  photonicSails: { sp: 'lumen', name: 'Photonic Sails', rel: 30, xeno: 4000, eff: { flag: 'photonic' }, desc: 'Sails of woven light. Light-sail range +20 light-years; warp ships twice as fast.' },
  plasmaCommerce: { sp: 'lumen', name: 'Plasma Commerce', rel: 60, xeno: 9000, eff: { mult: { credits: 0.15 } }, desc: 'Markets that clear at the speed of light. Credits +15%.' },
  quantumCognition: { sp: 'synod', name: 'Quantum Cognition', rel: 40, xeno: 6000, eff: { slots: 1 }, desc: 'Thinking machines that explore every branch at once. +1 research slot.' },
  machineDiplomacy: { sp: 'synod', name: 'Machine Diplomacy', rel: 70, xeno: 9000, eff: { flag: 'machineDiplo' }, desc: 'Negotiation as an optimisation problem. Influence +50%; relations decay half as fast.' },
  mycelialTerra: { sp: 'mycelar', name: 'Mycelial Terraforming', rel: 30, xeno: 4000, eff: { flag: 'mycelial' }, desc: 'Fungal networks that build soil in months. Colonists grow 50% faster; terraforming stages 30% faster.' },
  sporeMedicine: { sp: 'mycelar', name: 'Spore Medicine', rel: 60, xeno: 7000, eff: { flag: 'spores' }, desc: 'Antibiotics, immune boosters and healing moulds. Colony housing +20%.' },
  deepSong: { sp: 'oshoru', name: 'Deep Song', rel: 50, xeno: 5000, eff: { mult: { science: 0.08 } }, desc: 'The Oshoru remember everything in song. Their memory-craft improves ours. Science +8%.' },
  relicCores: { sp: 'hollow', name: 'Hollow Relic Cores', rel: 0, xeno: 12000, eff: { flag: 'relicCores' }, desc: 'Power cores from the ruins, still humming after a million years. Exotic matter production doubled.' },
  precursorMaps: { sp: 'hollow', name: 'Ancient Star Charts', rel: 0, xeno: 6000, eff: { flag: 'precursorMaps' }, desc: 'The Hollow mapped every star within a thousand light-years. Reveals the planets of every system on the map.' },
};
// requests a civilisation may make (scaled to your economy when generated)
export const REQUESTS: { k: string; res?: string; text: string; hours?: number }[] = [
  { k: 'give', res: 'credits', text: 'asks for a shipment of {n} credits', hours: 3 },
  { k: 'give', res: 'metal', text: 'needs {n} metal for a construction project', hours: 3 },
  { k: 'give', res: 'science', text: 'requests {n} science: data on human biology', hours: 2 },
  { k: 'give', res: 'exotic', text: 'wants {n} exotic matter', hours: 0.03 },
  { k: 'survey', text: 'asks you to survey {star} for them' },
  { k: 'develop', text: 'wants to see a star colony reach development level {n}' },
];
// lower life forms discovered on settled worlds
const PRE = ['Glass', 'Drift', 'Lantern', 'Hollow-back', 'Tide', 'Ember', 'Veil', 'Spire', 'Moss', 'Chime', 'Thorn', 'Silk'];
const POST = ['grazers', 'reef-builders', 'kites', 'burrowers', 'swimmers', 'lichens', 'walkers', 'bloom', 'shells', 'trees'];
export const fauna = (seed: number) => `${PRE[seed % PRE.length]} ${POST[(seed >> 4) % POST.length]}`;
// procedural minor species: pick a few livable procedural worlds and give them people
export function minorsFor(STARS: Record<string, any>): Record<string, Civ> {
  const out: Record<string, Civ> = {}; const cand: [number, string, number][] = []; for (const id in STARS) { const st = STARS[id]; if (!st.proc) continue; st.planets.forEach((pl: any, p: number) => { if (pl.hab > 0.5) cand.push([pl.hab + (st.seed % 97) / 1000, id, p]); }); }
  cand.sort((a, b) => b[0] - a[0]); const names: [string, number, string][] = [['Tavri', 2, '#ffb36a'], ['Quelloth', 3, '#ff9bd2'], ['Ummaru', 2, '#7cf29a'], ['Ishkai', 3, '#b892ff']];
  cand.slice(0, 4).forEach(([, id, p], k) => { const [name, tier, col] = names[k]; out['m_' + name.toLowerCase()] = { name, tier, star: id, planet: p, base: 0, temper: tier === 2 ? 'Tribal, wary' : 'Industrial, curious', col, art: 'proc', minor: true, seed: STARS[id].seed + k,
    origin: `Natives of ${STARS[id].planets[p].name}`, lore: tier === 2 ? 'Hunter-gatherers with stone tools, rich oral history and a sky full of gods. A visit from the stars would change everything.' : 'A steam-age civilisation, just inventing radio. Their first broadcasts are leaking into space, and they are wonderful.', likes: 'gentle contact', dislikes: 'exploitation', trade: { label: 'Cultural exchange', mult: { science: 0.03 } }, gifts: 'science' }; });
  return out;
}
