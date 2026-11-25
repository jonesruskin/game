// The Life Ladder. Every kind of living thing the programme can meet, from single cells in Martian brine to the
// Ascendants past the edge of the Local Group, on eight rungs. The Solar System entries follow real astrobiology
// (where scientists actually look, and why); the leviathans are honest speculation (Sagan and Salpeter's Jovian
// floaters are a real 1976 paper); exoplanet biospheres are generated from each world's habitability; the
// civilisations come from the contact chapters.
export interface Rung { name: string; num: string; desc: string; col: string; scale: string; }
export const RUNGS: Rung[] = [
  { name: 'Microbial', num: 'I', col: '#7cf29a', scale: '10 µm', desc: 'Single cells: the commonest life in the galaxy and the hardest to find. On Earth it was all there was for three billion years.' },
  { name: 'Colonial', num: 'II', col: '#5fe0c8', scale: '1 m', desc: 'Mats, reefs and films: cells that learned to work together, and to build.' },
  { name: 'Complex', num: 'III', col: '#6ec8ff', scale: '1 m', desc: 'Plants, animals and things that are neither: bodies, senses, food webs, whole ecosystems.' },
  { name: 'Leviathan', num: 'IV', col: '#9f8cff', scale: '1 km', desc: 'Life on a scale no planet\'s surface could hold: gas-giant floaters, asteroid grazers, sail-beasts between the stars.' },
  { name: 'Sapient', num: 'V', col: '#ffb36a', scale: '1 m', desc: 'Minds: language, tools, stories and gods. A culture that will one day look up and wonder about us.' },
  { name: 'Industrial', num: 'VI', col: '#ff9bd2', scale: '1 m', desc: 'Engines, cities and radio leaking out into space.' },
  { name: 'Spacefaring', num: 'VII', col: '#ffd166', scale: '10 m', desc: 'Civilisations among the stars, as we are becoming.' },
  { name: 'Ascended', num: 'VIII', col: '#ff6bd6', scale: '∞', desc: 'Beyond matter and beyond the galaxy: what gods would be, if gods were real.' },
];
// what a fully studied lifeform gives the empire for ever
export interface Gift { mult?: Record<string, number>; grow?: number; food?: number; house?: number; flag?: string; researchTime?: number; buildTime?: number; }
// where and how a handcrafted lifeform is found
export interface Find { colony?: string; site?: string; tech: string; dyson?: number; voyages?: number; outbreak?: boolean; }
export interface LifeDef { name: string; rung: number; home: string; art: string; col: string; size: string; science: string; lore: string; gift: Gift; giftText: string; cost: number; find: Find; hint: string; }
export const LIFE: Record<string, LifeDef> = {
  aresbrine: { name: 'Ares Brine-Cells', rung: 0, home: 'Mars, 1.5 km under the south polar ice', art: 'rods', col: '#ff9a6a', size: '2 µm', cost: 2.5e6,
    science: 'In 2018 the MARSIS radar on Mars Express saw what may be a lake of salty liquid water under the south polar cap, kept liquid by perchlorate salts. Curiosity has measured methane rising and falling with the seasons, and on Earth most methane is made by microbes.',
    lore: 'Rod-shaped cells that breathe perchlorate and eat the iron in the rock around them. They have been alone in the dark for three billion years, since Mars lost its seas.',
    gift: { mult: { metal: 0.08 } }, giftText: 'Biomining: metal +8%', find: { colony: 'mars', tech: 'xenobiology' }, hint: 'Research Xenobiology and search from the Mars colony' },
  cloudmotes: { name: 'Venusian Cloud-Motes', rung: 0, home: 'Venus, 52 km up in the cloud deck', art: 'motes', col: '#ffe08a', size: '1 µm', cost: 3e6,
    science: 'Fifty kilometres above Venus the pressure is one bar and the temperature is like a spring day. In 2020 astronomers reported phosphine there, a gas made on Earth by life; the detection is still argued over. Carl Sagan suggested life in Venus\'s clouds in 1967.',
    lore: 'Specks of life inside droplets of sulphuric acid, wrapped in a shell of sulphur. They ride the winds round the planet every four days and never touch the ground, which would kill them.',
    gift: { mult: { rare: 0.1 } }, giftText: 'Acid leaching: rare elements +10%', find: { colony: 'venus', tech: 'xenobiology' }, hint: 'Research Xenobiology and search from the Venus cloud city' },
  plumespores: { name: 'Enceladus Plume-Spores', rung: 0, home: 'Enceladus, frozen in the south-pole geysers', art: 'spores', col: '#bfe8ff', size: '0.5 µm', cost: 4e6,
    science: 'Cassini flew through the geysers of Enceladus and tasted the ocean below: salt, silica, molecular hydrogen, complex organic molecules and, found in 2023, phosphates. Every ingredient life on Earth needs.',
    lore: 'Dormant cells blasted into space by the geysers and freeze-dried in an instant. Warm one in a dish and it wakes up hungry for hydrogen. They have been seeding Saturn\'s E ring for millions of years.',
    gift: { mult: { fuel: 0.1 } }, giftText: 'Cold enzymes: fuel +10%', find: { site: 'enceladus', tech: 'xenobiology' }, hint: 'Build the Enceladus Geyser Station and research Xenobiology' },
  azotes: { name: 'Titan Azotes', rung: 0, home: 'Titan, in the methane seas at −179 °C', art: 'azotes', col: '#ffb85c', size: '9 µm', cost: 6e6,
    science: 'In 2015 chemists at Cornell modelled a cell membrane, the azotosome, built from acrylonitrile that could work in liquid methane. ALMA has since found acrylonitrile in Titan\'s air. Life there would share nothing with ours: not water, not DNA, nothing.',
    lore: 'Hollow cells with skins of nitrogen compounds, drifting in the black methane of Kraken Mare. They live a thousand times slower than anything on Earth. The first proof that life began twice in one solar system.',
    gift: { mult: { science: 0.08 } }, giftText: 'A second biochemistry: science +8%', find: { colony: 'titan', tech: 'xenobiology' }, hint: 'Found the Titan colony and research Xenobiology' },
  ventweavers: { name: 'Europan Vent-Weavers', rung: 1, home: 'Europa, 100 km down on the ocean floor', art: 'vents', col: '#5fe0c8', size: '3 m', cost: 8e6,
    science: 'Europa hides more water than all Earth\'s oceans under its ice, warmed by Jupiter\'s tides. On Earth, life thrives around deep-sea hydrothermal vents with no sunlight at all, living on chemical energy. NASA\'s Europa Clipper is surveying the moon now.',
    lore: 'Pale filaments, woven by trillions of cells into curtains around the black-smoker chimneys, glowing faintly where the hot water meets the cold. Each curtain is one colony, and they trade chemicals like a city trades goods.',
    gift: { food: 0.25 }, giftText: 'Chemosynthetic food vats: colony food +25%', find: { site: 'europa', tech: 'xenobiology' }, hint: 'Send the Europa Deep Probe under the ice' },
  lithophages: { name: 'Lithophage Reefs', rung: 1, home: 'The asteroid belt, inside the mining claims', art: 'litho', col: '#c9a0ff', size: '40 cm', cost: 5e6,
    science: 'On Earth, lithotrophic microbes live kilometres down in solid rock, eating minerals and hydrogen from radioactive decay. Panspermia, the idea that life rides between worlds inside rocks, is taken seriously: Martian meteorites have reached Earth.',
    lore: 'Crystal-shelled colonies that arrived in the belt inside a comet four billion years ago. They eat iron and nickel and grow along the ore seams. Our mines woke them, and they like what we dig.',
    gift: { mult: { metal: 0.12 } }, giftText: 'Bio-smelting: metal +12%', find: { outbreak: true, tech: 'xenobiology' }, hint: 'Something lives in the asteroids. Run mining claims in the belt' },
  floaters: { name: 'Jovian Floaters', rung: 3, home: 'Jupiter, drifting in the ammonia clouds', art: 'floater', col: '#ffcf9a', size: '2 km', cost: 1.5e7,
    science: 'In 1976 Carl Sagan and Edwin Salpeter worked out an ecology for Jupiter\'s atmosphere: sinkers, floaters the size of cities and hunters that eat them, all living in the clouds. Nobody has looked yet.',
    lore: 'Living gas-bags kilometres across, filled with hydrogen they warm with their own bodies. They graze on organic snow, sing in radio, and are hunted by something faster that we have only glimpsed.',
    gift: { mult: { he3: 0.15 } }, giftText: 'Living balloons: helium-3 +15%', find: { site: 'jupiter', tech: 'xenobiology' }, hint: 'Build the Jovian He-3 Scoop and research Xenobiology' },
  drifters: { name: 'Void Drifters', rung: 3, home: 'Interstellar space, between the stars', art: 'drifter', col: '#9ff0ff', size: '6 km', cost: 2e8,
    science: 'Light sails are real physics: a large, light enough sheet can be pushed by starlight alone. Nothing rules out something alive doing it, given billions of years and a galaxy to evolve in.',
    lore: 'Sails of carbon lattice six kilometres wide, thinner than a soap bubble, around a body the size of a bus. They ride starlight from system to system and live for a million years. One followed our probe home.',
    gift: { flag: 'drifterSails' }, giftText: 'Drifter sails: interstellar voyages 20% faster', find: { voyages: 4, tech: 'exoplanetology' }, hint: 'Fly more interstellar voyages: something is following the sails' },
  kites: { name: 'Coronal Kites', rung: 3, home: 'The Sun\'s corona, 2 million °C', art: 'kite', col: '#ffd166', size: '40,000 km', cost: 4e8,
    science: 'Some physicists have modelled self-organising structures in plasma that can grow, split and pass on their shape: life without chemistry. The Sun\'s corona is full of tangled magnetic fields, and is hotter than its surface for reasons still argued over.',
    lore: 'Knots of magnetised plasma as wide as Jupiter, grazing on the Sun\'s magnetic field. They have started feeding on the Dyson Swarm\'s power beams. The Lumen Concord recognise them: their own wild ancestors.',
    gift: { mult: { exotic: 0.2 } }, giftText: 'Plasma husbandry: exotic matter +20%', find: { dyson: 2, tech: 'dysonSwarm' }, hint: 'Raise the Dyson Swarm: something lives in the corona' },
};
export const LIFE_ORDER = ['aresbrine', 'cloudmotes', 'plumespores', 'azotes', 'ventweavers', 'lithophages', 'floaters', 'drifters', 'kites'];
// rungs of the civilisations met in the contact chapters (data/civs tiers 2..5 → rungs V..VIII)
export const civRung = (tier: number) => Math.max(4, Math.min(7, tier + 2));
// the Ascendants: the last rung, met at the Far Shore
export const ASCENDANTS = { name: 'The Ascendants', home: 'The Far Shore, past Andromeda', col: '#ff6bd6',
  lore: 'A voice, and a light that is not quite there. They were the Hollow once: they built the relays, crossed to the Far Shore and left their bodies behind. They have waited a million years for someone to follow.',
  science: 'No physics we know describes them. Freeman Dyson wondered whether minds could outlive the stars by thinking slower and slower as the universe cools. Perhaps this is what that looks like.' };
// procedural biospheres on exoplanets: names
const PRE = ['Glass', 'Drift', 'Lantern', 'Hollow-back', 'Tide', 'Ember', 'Veil', 'Spire', 'Moss', 'Chime', 'Thorn', 'Silk', 'Rust', 'Quill', 'Salt', 'Dusk'];
const POSTS = [['motes', 'rods', 'spirals', 'beads', 'threads'], ['mats', 'reefs', 'towers', 'films', 'carpets'], ['grazers', 'reef-builders', 'kites', 'burrowers', 'swimmers', 'walkers', 'bloom', 'shells', 'trees', 'striders']];
export const exoName = (seed: number, rung: number) => `${PRE[(seed >>> 0) % PRE.length]} ${POSTS[rung][(seed >>> 4) % POSTS[rung].length]}`;
// small permanent gifts for catalogued exoplanet life (one per entry, chosen by its seed)
export const EXO_GIFTS: { gift: Gift; text: string }[] = [
  { gift: { mult: { science: 0.02 } }, text: 'Gene bank: science +2%' },
  { gift: { mult: { credits: 0.02 } }, text: 'Bio-patents: Aurivane +2%' },
  { gift: { mult: { fuel: 0.02 } }, text: 'Bio-fuels: fuel +2%' },
  { gift: { food: 0.05 }, text: 'Hardy crops: colony food +5%' },
  { gift: { mult: { rare: 0.02 } }, text: 'Bio-assay: rare elements +2%' },
];
