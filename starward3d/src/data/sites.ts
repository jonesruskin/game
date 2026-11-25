// Landing sites: where on a world a colony is founded, chosen by the player. Real regions in the Solar System (with what
// makes each one worth choosing: ice, minerals, sunlight, shelter, how well it terraforms, how often dust storms come);
// regions generated from each exoplanet's type. Richness and exposure run 0 (none) to 3 (rich, or stormy).
// A site seeds the deposits hidden in the land around the base, sets its sunlight and storms, and can speed
// terraforming (a deep basin fills with sea first).
import { rng, hash } from '../core/util';
export interface Site { id: string; name: string; desc: string; ice: number; ore: number; rare: number; sun: number; shelter: number; storm: number; he3?: number; geo?: number; methane?: number; terra?: number; }
export const SITES_BY_BODY: Record<string, Site[]> = {
  earth: [{ id: 'cape', name: 'Cape Horizon coastal plain', desc: 'A launch site on the coast: rockets fly out over the sea, the plain is flat and the rock below holds ore.', ice: 0, ore: 2, rare: 1, sun: 2, shelter: 1, storm: 0, geo: 1 }],
  moon: [
    { id: 'tranquillity', name: 'Mare Tranquillitatis', desc: 'The flat dark plain where people first walked on the Moon: ilmenite rich in iron and titanium, and helium-3 soaked into the dust by the solar wind.', ice: 0, ore: 3, rare: 1, he3: 3, sun: 2, shelter: 0, storm: 0 },
    { id: 'shackleton', name: 'Shackleton Crater rim', desc: 'The south pole: ridges in almost permanent sunlight beside craters that have not seen the Sun for two billion years, full of ice.', ice: 3, ore: 1, rare: 0, he3: 1, sun: 3, shelter: 1, storm: 0 },
    { id: 'marius', name: 'Marius Hills lava tubes', desc: 'Skylights into lava tubes big enough to hold a city: shelter from radiation, meteorites and the 300-degree swing between day and night.', ice: 0, ore: 2, rare: 1, he3: 1, sun: 1, shelter: 3, storm: 0 },
    { id: 'aristarchus', name: 'Aristarchus Plateau', desc: 'The brightest spot on the Moon: volcanic glass and rare minerals thrown up by an ancient eruption.', ice: 0, ore: 2, rare: 3, he3: 1, sun: 2, shelter: 1, storm: 0 },
  ],
  mars: [
    { id: 'gale', name: 'Gale Crater', desc: 'A crater with a mountain of layered rock in the middle, a record of Mars drying out. Clays, sulphates, a little buried ice, a sheltered floor.', ice: 1, ore: 2, rare: 2, sun: 2, shelter: 2, storm: 2 },
    { id: 'jezero', name: 'Jezero Crater', desc: 'An ancient lake with a river delta, one of the best places to look for signs of past life. Clays and carbonates, buried ice, a protective rim.', ice: 2, ore: 2, rare: 1, sun: 2, shelter: 2, storm: 2, terra: 0.1 },
    { id: 'hellas', name: 'Hellas Planitia', desc: 'The deepest basin on Mars, seven kilometres down: the thickest air on the planet and the first place a sea will form when Mars is terraformed. Dust storms are born here.', ice: 2, ore: 1, rare: 1, sun: 1, shelter: 1, storm: 3, terra: 0.3 },
    { id: 'arcadia', name: 'Arcadia Planitia', desc: 'Smooth northern plains over sheets of ice a few metres down: the easiest water on Mars.', ice: 3, ore: 1, rare: 0, sun: 2, shelter: 0, storm: 2 },
    { id: 'valles', name: 'Valles Marineris', desc: 'A canyon four thousand kilometres long and up to seven deep: walls of exposed minerals and shelter from the worst of the storms.', ice: 1, ore: 3, rare: 2, sun: 1, shelter: 3, storm: 1, terra: 0.1 },
    { id: 'tharsis', name: 'Tharsis lava tubes', desc: 'On the flanks of the great volcanoes, above most of the dust: strong sunlight and lava tubes to live in. Thin, cold air.', ice: 0, ore: 2, rare: 2, sun: 3, shelter: 3, storm: 1 },
    { id: 'korolev', name: 'Korolev Crater', desc: 'An eighty-kilometre crater near the north pole filled with a permanent block of water ice almost two kilometres thick. Weak winter sun.', ice: 3, ore: 1, rare: 0, sun: 0, shelter: 2, storm: 1 },
  ],
  ceres: [
    { id: 'occator', name: 'Occator Crater', desc: 'The bright spots: salts left behind by brine rising from below. Salts, ice and organic molecules.', ice: 2, ore: 1, rare: 2, sun: 1, shelter: 1, storm: 0 },
    { id: 'ahuna', name: 'Ahuna Mons', desc: 'A lone ice volcano four kilometres high: fresh water ice and minerals pushed up from inside the dwarf planet.', ice: 3, ore: 1, rare: 1, sun: 1, shelter: 1, storm: 0 },
    { id: 'kerwan', name: 'Kerwan Basin', desc: 'An old, smooth basin of rocky, metal-rich ground.', ice: 1, ore: 3, rare: 1, sun: 1, shelter: 1, storm: 0 },
  ],
  titan: [
    { id: 'kraken', name: 'Kraken Mare shore', desc: 'The shore of the largest sea of liquid methane and ethane on Titan: hydrocarbons without end.', ice: 1, ore: 1, rare: 0, methane: 3, sun: 0, shelter: 1, storm: 1 },
    { id: 'xanadu', name: 'Xanadu highlands', desc: 'Rugged uplands of water-ice bedrock, hard as granite at minus 179 degrees.', ice: 3, ore: 1, rare: 1, methane: 1, sun: 0, shelter: 2, storm: 1 },
    { id: 'selk', name: 'Selk crater', desc: 'An impact crater where melted ice once mixed with organic sand: a chemistry lab, and a sheltered floor.', ice: 2, ore: 1, rare: 2, methane: 1, sun: 0, shelter: 2, storm: 0, geo: 1 },
    { id: 'belet', name: 'Belet dune sea', desc: 'Dunes a hundred metres high made of organic sand: endless raw material, and the wind never stops.', ice: 1, ore: 2, rare: 1, methane: 2, sun: 0, shelter: 0, storm: 2 },
  ],
  venus: [
    { id: 'equator', name: 'Equatorial band, 52 km up', desc: 'Earth-like pressure and temperature, winds that carry the city round the planet every four days, and the most sunlight.', ice: 0, ore: 0, rare: 0, sun: 3, shelter: 0, storm: 2 },
    { id: 'vortex', name: 'Polar vortex, 55 km up', desc: 'Calmer air inside the great vortex over the pole: steadier flying, less sun.', ice: 0, ore: 0, rare: 0, sun: 1, shelter: 2, storm: 0 },
    { id: 'aphrodite', name: 'Over Aphrodite Terra, 50 km up', desc: 'Lower, warmer and denser: more lift for the envelopes and richer acid to skim.', ice: 0, ore: 1, rare: 1, sun: 2, shelter: 1, storm: 1 },
  ],
};
// the site a base was founded at before landing sites existed
export const DEFAULT_SITE: Record<string, string> = { earth: 'cape', moon: 'tranquillity', mars: 'gale', ceres: 'occator', titan: 'kraken', venus: 'equator' };
// regions of an exoplanet, from its type (deterministic, so every player sees the same world)
const EXO_REGIONS: Record<string, [string, string, Partial<Site>][]> = {
  temperate: [['Coastal plain', 'Gentle ground by a warm sea: easy building, fair weather.', { ice: 1, ore: 1, sun: 2, shelter: 1, storm: 1, terra: 0.1 }], ['Rift highlands', 'A great rift valley: exposed minerals in the walls.', { ore: 3, rare: 2, sun: 2, shelter: 2, storm: 1 }], ['Polar tundra', 'Cold plains over permafrost: water everywhere.', { ice: 3, ore: 1, sun: 0, shelter: 1, storm: 2 }], ['Volcanic islands', 'Young volcanic ground: geothermal heat and rare minerals.', { ore: 2, rare: 2, sun: 2, shelter: 1, storm: 2, geo: 2 }]],
  ocean: [['Archipelago', 'Scattered islands in an endless ocean: water, fish-like life and wind.', { ice: 2, ore: 1, sun: 2, shelter: 0, storm: 2, terra: 0.1 }], ['Shallow reef shelf', 'Warm shallows over living reefs: calm water, little land.', { ice: 2, ore: 1, rare: 1, sun: 3, shelter: 1, storm: 1 }], ['Ice cap edge', 'Where the ocean freezes: sheltered coves and pack ice.', { ice: 3, ore: 1, sun: 0, shelter: 2, storm: 1 }]],
  desert: [['Dune sea', 'Endless dunes: open ground, scouring winds.', { ore: 1, rare: 1, sun: 3, shelter: 0, storm: 3 }], ['Salt flats', 'A dried-up sea: salts and minerals, flat as glass.', { ice: 1, ore: 2, rare: 2, sun: 3, shelter: 0, storm: 2 }], ['Canyon country', 'Deep canyons: shade, shelter, and buried ice in the shadows.', { ice: 2, ore: 2, rare: 1, sun: 1, shelter: 3, storm: 1 }], ['Ancient lakebed', 'A basin where water once pooled: the best place to bring a sea back.', { ice: 1, ore: 2, sun: 2, shelter: 1, storm: 2, terra: 0.3 }]],
  super: [['Highland plateau', 'High ground above the thick air: sun and minerals.', { ore: 3, rare: 1, sun: 3, shelter: 1, storm: 1 }], ['Lowland basin', 'A vast basin under heavy air: shelter and water.', { ice: 2, ore: 1, sun: 1, shelter: 2, storm: 1, terra: 0.2 }], ['Mountain foothills', 'Foothills of mountains taller than any on Earth: ore and caves.', { ore: 2, rare: 2, sun: 2, shelter: 3, storm: 1 }]],
  rocky: [['Crater field', 'Old cratered ground: metals from ancient impacts.', { ore: 3, rare: 1, sun: 2, shelter: 1, storm: 0 }], ['Polar craters', 'Craters at the pole, their floors in permanent shadow and full of ice.', { ice: 3, ore: 1, sun: 2, shelter: 2, storm: 0 }], ['Lava tube plains', 'Plains riddled with collapsed lava tubes: ready-made shelter.', { ore: 2, rare: 2, sun: 2, shelter: 3, storm: 0 }]],
  ice: [['Ice plains', 'Flat sheets of water ice: water without end.', { ice: 3, ore: 0, sun: 1, shelter: 0, storm: 1 }], ['Cryovolcano field', 'Ice volcanoes venting from a hidden ocean: warmth and minerals.', { ice: 3, ore: 1, rare: 2, sun: 1, shelter: 1, storm: 0, geo: 2 }], ['Rifted terrain', 'Long cracks in the crust: shelter in the walls, minerals pushed up.', { ice: 2, ore: 2, rare: 1, sun: 1, shelter: 3, storm: 0 }]],
  lava: [['Cooling crust', 'Black crust over molten rock: geothermal power everywhere, little else.', { ore: 2, rare: 2, sun: 2, shelter: 0, storm: 1, geo: 3 }], ['Terminator ridge', 'The line between day and night: survivable, and rich.', { ore: 3, rare: 3, sun: 2, shelter: 2, storm: 1, geo: 2 }]],
};
export function sitesFor(body: string, planetType?: string): Site[] {
  if (SITES_BY_BODY[body]) return SITES_BY_BODY[body];
  const list = EXO_REGIONS[planetType || 'rocky'] || EXO_REGIONS.rocky; const R = rng(hash(body));
  return list.map(([name, desc, a], i) => { const j = (v?: number) => Math.max(0, Math.min(3, (v || 0) + (R() < 0.3 ? (R() < 0.5 ? -1 : 1) : 0)));
    return { id: 'r' + i, name, desc, ice: j(a.ice), ore: j(a.ore), rare: j(a.rare), sun: j(a.sun), shelter: j(a.shelter), storm: Math.max(0, Math.min(3, a.storm || 0)), geo: a.geo ? j(a.geo) : 0, terra: a.terra || 0 }; });
}
// deposit types found in the land around bases, and what they do for a building standing on them
export const DEPOSITS: Record<string, { name: string; col: string; desc: string; boosts: string[]; prod?: number; gen?: number; house?: number }> = {
  ore: { name: 'Ore seam', col: '#b5653a', desc: 'Metal-rich rock close to the surface.', boosts: ['mine', 'regolith'], prod: 1.6 },
  rare: { name: 'Rare minerals', col: '#b892ff', desc: 'Veins of rare elements.', boosts: ['mine', 'regolith', 'beltControl'], prod: 1.5 },
  ice: { name: 'Ice', col: '#9fdcff', desc: 'Water ice just below the surface.', boosts: ['ice', 'skimmer', 'algae', 'greenhouse', 'deepfarm'], prod: 1.6 },
  he3: { name: 'Helium-3 regolith', col: '#e6d4ff', desc: 'Dust soaked in helium-3 by billions of years of solar wind.', boosts: ['he3x'], prod: 1.8 },
  methane: { name: 'Methane pools', col: '#c8823a', desc: 'Liquid hydrocarbons on the surface.', boosts: ['methane'], prod: 1.7 },
  geo: { name: 'Geothermal vents', col: '#ff7a3c', desc: 'Heat rising from below.', boosts: ['reactor', 'fission', 'fusion'], gen: 1.5 },
  sun: { name: 'Sunny ridge', col: '#ffd36a', desc: 'High ground that catches the sun all day.', boosts: ['solar', 'lsolar'], gen: 1.4 },
  shelter: { name: 'Natural shelter', col: '#7f8a9a', desc: 'A crater wall or lava tube: shelter from radiation and storms.', boosts: ['dome', 'burrow', 'hub'], house: 1.3 },
};
