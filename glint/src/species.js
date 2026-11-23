// GLINT: the minerals. Optical and physical constants are real (mean refractive index, B–G dispersion,
// specific gravity, Mohs hardness); they drive the ray tracer, carat weight and the cutting sweet spot.
// Prices are game dollars per carat for a well-cut 1 ct stone of that variety.
//   col: body colour (linear RGB transmitted through ~1 gem unit), k: colour strength, warm: alt colour
//   under the warm bench lamp (alexandrite's colour change), glow: faint fluorescence (Paraíba neon)
export const SPECIES = {
  quartz: { name: 'Quartz', ri: 1.544, disp: 0.013, sg: 2.65, h: 7, habit: 'hexpoint', size: [6, 11], clarity: 0.25, tier: 1, origin: 'Arkansas, USA',
    fact: 'Quartz is piezoelectric: squeeze it and it makes electricity. Your watch keeps time with a sliver of it.',
    vars: [
      { id: 'rock', name: 'Rock Crystal', col: [0.97, 0.98, 1.0], k: 0.25, ppc: 9, w: 40 },
      { id: 'smoky', name: 'Smoky Quartz', col: [0.55, 0.42, 0.32], k: 0.55, ppc: 14, w: 22 },
      { id: 'amethyst', name: 'Amethyst', col: [0.62, 0.3, 0.88], k: 0.7, ppc: 28, w: 22 },
      { id: 'citrine', name: 'Citrine', col: [1.0, 0.72, 0.22], k: 0.6, ppc: 24, w: 14 },
      { id: 'siberian', name: 'Siberian Amethyst', col: [0.55, 0.12, 0.75], k: 1.0, ppc: 70, w: 3, rare: 1 },
    ] },
  garnet: { name: 'Garnet', ri: 1.76, disp: 0.024, sg: 3.95, h: 7.5, habit: 'dodeca', size: [3.2, 6.5], clarity: 0.3, tier: 1, origin: 'Rajasthan, India',
    fact: 'Garnets were carried as lanterns: Noah was said to light the ark with one.',
    vars: [
      { id: 'almandine', name: 'Almandine', col: [0.7, 0.08, 0.12], k: 1.0, ppc: 40, w: 40 },
      { id: 'rhodolite', name: 'Rhodolite', col: [0.8, 0.22, 0.45], k: 0.85, ppc: 85, w: 25 },
      { id: 'spessartite', name: 'Mandarin Spessartite', col: [1.0, 0.42, 0.08], k: 0.75, ppc: 420, w: 7, rare: 1 },
      { id: 'tsavorite', name: 'Tsavorite', col: [0.18, 0.85, 0.3], k: 0.8, ppc: 900, w: 4, rare: 2 },
      { id: 'demantoid', name: 'Demantoid', col: [0.45, 0.85, 0.22], k: 0.7, ppc: 1800, w: 1.5, rare: 3, disp: 0.057 },
    ] },
  peridot: { name: 'Peridot', ri: 1.67, disp: 0.02, sg: 3.34, h: 6.5, habit: 'pebble', size: [3.4, 7], clarity: 0.3, tier: 1, origin: 'San Carlos, Arizona',
    fact: 'Peridot also falls from the sky: it has been found inside meteorites.',
    vars: [
      { id: 'olive', name: 'Peridot', col: [0.55, 0.85, 0.12], k: 0.75, ppc: 60, w: 80 },
      { id: 'kashmir', name: 'Kashmir Peridot', col: [0.42, 0.95, 0.15], k: 0.85, ppc: 260, w: 6, rare: 2 },
    ] },
  topaz: { name: 'Topaz', ri: 1.62, disp: 0.014, sg: 3.53, h: 8, habit: 'ortho', size: [4, 9], clarity: 0.2, tier: 1, origin: 'Minas Gerais, Brazil',
    fact: 'The 21,005-carat "El-Dorado" topaz is one of the largest faceted gems ever.',
    vars: [
      { id: 'white', name: 'White Topaz', col: [0.98, 0.98, 1.0], k: 0.2, ppc: 18, w: 35 },
      { id: 'sky', name: 'Sky Blue Topaz', col: [0.5, 0.82, 1.0], k: 0.6, ppc: 38, w: 35 },
      { id: 'london', name: 'London Blue Topaz', col: [0.2, 0.45, 0.72], k: 0.85, ppc: 75, w: 14 },
      { id: 'imperial', fam: 'orange', name: 'Imperial Topaz', col: [1.0, 0.55, 0.35], k: 0.7, ppc: 650, w: 4, rare: 2 },
    ] },
  iolite: { name: 'Iolite', ri: 1.545, disp: 0.017, sg: 2.61, h: 7.2, habit: 'pebble', size: [5, 9], clarity: 0.28, tier: 1, origin: 'Orissa, India',
    fact: 'Vikings may have used thin slices of iolite as a polarising filter to find the sun through clouds.',
    vars: [
      { id: 'iolite', name: 'Iolite', fam: 'purple', col: [0.42, 0.42, 0.9], k: 0.8, ppc: 42, w: 80 },
      { id: 'water', name: 'Water Sapphire', fam: 'blue', col: [0.6, 0.68, 0.95], k: 0.6, ppc: 110, w: 10, rare: 1 },
    ] },
  aquamarine: { name: 'Aquamarine', ri: 1.577, disp: 0.014, sg: 2.72, h: 7.5, habit: 'hexflat', size: [4, 8.5], clarity: 0.18, tier: 2, origin: 'Minas Gerais, Brazil',
    fact: 'Sailors carried aquamarine as a charm against storms: "the water of the sea".',
    vars: [
      { id: 'aqua', name: 'Aquamarine', col: [0.55, 0.85, 0.98], k: 0.6, ppc: 240, w: 60 },
      { id: 'santamaria', name: 'Santa Maria Aquamarine', col: [0.22, 0.6, 0.98], k: 0.85, ppc: 900, w: 7, rare: 2 },
    ] },
  morganite: { name: 'Morganite', ri: 1.585, disp: 0.014, sg: 2.8, h: 7.5, habit: 'hexflat', size: [4, 8], clarity: 0.2, tier: 2, origin: 'Madagascar',
    fact: 'Named for banker J. P. Morgan, who collected gems as fiercely as railroads.',
    vars: [
      { id: 'peach', name: 'Peach Morganite', col: [1.0, 0.72, 0.62], k: 0.55, ppc: 180, w: 60 },
      { id: 'heliodor', name: 'Golden Heliodor', col: [1.0, 0.85, 0.25], k: 0.6, ppc: 120, w: 35 },
    ] },
  tourmaline: { name: 'Tourmaline', ri: 1.635, disp: 0.017, sg: 3.06, h: 7.2, habit: 'trigonal', size: [3.6, 7.5], clarity: 0.32, tier: 2, origin: 'Minas Gerais, Brazil',
    fact: 'Heat a tourmaline and it becomes electrically charged; Dutch traders used them to pull ash from pipes.',
    vars: [
      { id: 'verdelite', name: 'Verdelite', col: [0.28, 0.72, 0.35], k: 0.85, ppc: 160, w: 40 },
      { id: 'rubellite', name: 'Rubellite', col: [0.95, 0.15, 0.42], k: 0.85, ppc: 420, w: 25 },
      { id: 'indicolite', name: 'Indicolite', col: [0.2, 0.55, 0.75], k: 0.9, ppc: 520, w: 15 },
      { id: 'paraiba', name: 'Paraíba Tourmaline', col: [0.15, 0.95, 0.95], k: 0.8, ppc: 9000, w: 1.2, rare: 3, glow: 0.35 },
    ] },
  zircon: { name: 'Zircon', ri: 1.95, disp: 0.039, sg: 4.65, h: 7.5, habit: 'octa', size: [3, 6], clarity: 0.22, tier: 2, origin: 'Ratanakiri, Cambodia',
    fact: 'Some zircon crystals are 4.4 billion years old: the oldest pieces of Earth ever found.',
    vars: [
      { id: 'blue', name: 'Blue Zircon', col: [0.35, 0.8, 0.95], k: 0.65, ppc: 320, w: 60 },
      { id: 'cognac', name: 'Cognac Zircon', col: [0.9, 0.55, 0.25], k: 0.7, ppc: 160, w: 40 },
    ] },
  kunzite: { name: 'Kunzite', ri: 1.67, disp: 0.017, sg: 3.18, h: 6.8, habit: 'ortho', size: [4, 8.5], clarity: 0.2, tier: 2, origin: 'Nuristan, Afghanistan',
    fact: 'Named after Tiffany\'s gemmologist George F. Kunz. Kunzite slowly fades in sunlight, so it\'s called the "evening stone".',
    vars: [
      { id: 'kunzite', name: 'Kunzite', fam: 'pink', col: [0.95, 0.68, 0.88], k: 0.6, ppc: 120, w: 80 },
      { id: 'hiddenite', name: 'Hiddenite', fam: 'green', col: [0.55, 0.9, 0.5], k: 0.65, ppc: 600, w: 6, rare: 2 },
    ] },
  tanzanite: { name: 'Tanzanite', ri: 1.7, disp: 0.019, sg: 3.35, h: 6.5, habit: 'ortho', size: [3.2, 6.5], clarity: 0.2, tier: 3, origin: 'Merelani Hills, Tanzania',
    fact: 'Found in only one place on Earth: a 7 km strip in the foothills of Kilimanjaro.',
    vars: [
      { id: 'violet', name: 'Tanzanite', col: [0.45, 0.35, 0.95], k: 0.85, ppc: 650, w: 70 },
      { id: 'blockd', fam: 'purple', name: 'Block-D Tanzanite', col: [0.3, 0.22, 0.95], k: 1.1, ppc: 1600, w: 10, rare: 2 },
    ] },
  spinel: { name: 'Spinel', ri: 1.718, disp: 0.02, sg: 3.6, h: 8, habit: 'octa', size: [3, 6], clarity: 0.18, tier: 3, origin: 'Mogok, Myanmar',
    fact: 'The "Black Prince\'s Ruby" in the British crown is actually a 170-carat red spinel.',
    vars: [
      { id: 'pink', name: 'Hot Pink Spinel', col: [1.0, 0.3, 0.6], k: 0.75, ppc: 900, w: 45 },
      { id: 'red', name: 'Red Spinel', col: [0.95, 0.1, 0.15], k: 0.9, ppc: 1500, w: 30 },
      { id: 'cobalt', name: 'Cobalt Blue Spinel', col: [0.15, 0.32, 1.0], k: 0.9, ppc: 4500, w: 4, rare: 3 },
    ] },
  chrysoberyl: { name: 'Chrysoberyl', ri: 1.75, disp: 0.015, sg: 3.73, h: 8.5, habit: 'tabular', size: [3, 6], clarity: 0.22, tier: 3, origin: 'Ural Mountains, Russia',
    fact: 'Alexandrite is green by daylight and red by candlelight: "an emerald by day, a ruby by night".',
    vars: [
      { id: 'golden', name: 'Golden Chrysoberyl', col: [0.95, 0.85, 0.3], k: 0.65, ppc: 260, w: 70 },
      { id: 'alexandrite', name: 'Alexandrite', col: [0.25, 0.72, 0.5], warm: [0.85, 0.2, 0.35], k: 0.85, ppc: 12000, w: 2.5, rare: 3 },
    ] },
  sphene: { name: 'Sphene', ri: 1.95, disp: 0.051, sg: 3.52, h: 5.2, habit: 'tabular', size: [3, 6], clarity: 0.3, tier: 3, origin: 'Tuléar, Madagascar',
    fact: 'Sphene has more fire than diamond: its dispersion is 0.051 against diamond\'s 0.044.',
    vars: [
      { id: 'sphene', name: 'Sphene', fam: 'yellow', col: [0.85, 0.9, 0.35], k: 0.65, ppc: 450, w: 70 },
      { id: 'chrome', name: 'Chrome Sphene', fam: 'green', col: [0.35, 0.85, 0.3], k: 0.8, ppc: 1500, w: 6, rare: 2 },
    ] },
  sapphire: { name: 'Sapphire', ri: 1.77, disp: 0.018, sg: 4.0, h: 9, habit: 'barrel', size: [3, 6.2], clarity: 0.3, tier: 4, origin: 'Ratnapura, Sri Lanka',
    fact: 'Sapphire is so hard it is used for watch crystals and the windows of supermarket scanners.',
    vars: [
      { id: 'yellow', name: 'Yellow Sapphire', col: [1.0, 0.82, 0.18], k: 0.7, ppc: 900, w: 30 },
      { id: 'pink', name: 'Pink Sapphire', col: [1.0, 0.4, 0.7], k: 0.7, ppc: 1600, w: 25 },
      { id: 'blue', name: 'Blue Sapphire', col: [0.12, 0.25, 0.9], k: 0.95, ppc: 2400, w: 40 },
      { id: 'cornflower', name: 'Cornflower Sapphire', col: [0.3, 0.45, 1.0], k: 0.85, ppc: 6000, w: 6, rare: 2 },
      { id: 'padparadscha', name: 'Padparadscha', col: [1.0, 0.5, 0.42], k: 0.75, ppc: 14000, w: 1.5, rare: 3 },
    ] },
  ruby: { name: 'Ruby', ri: 1.77, disp: 0.018, sg: 4.0, h: 9, habit: 'barrel', size: [2.8, 5.8], clarity: 0.4, tier: 4, origin: 'Mogok, Myanmar',
    fact: 'Ruby and sapphire are the same mineral: corundum. A pinch of chromium turns it red.',
    vars: [
      { id: 'ruby', name: 'Ruby', col: [0.95, 0.08, 0.2], k: 1.0, ppc: 4200, w: 80 },
      { id: 'pigeon', name: "Pigeon's Blood Ruby", col: [1.0, 0.02, 0.12], k: 1.15, ppc: 22000, w: 4, rare: 3, glow: 0.12 },
    ] },
  emerald: { name: 'Emerald', ri: 1.577, disp: 0.014, sg: 2.72, h: 7.8, habit: 'hexflat', size: [3, 6.5], clarity: 0.6, tier: 4, origin: 'Muzo, Colombia',
    fact: 'Almost every emerald is included; jewellers call the inclusions its "jardin": its garden.',
    vars: [
      { id: 'emerald', name: 'Emerald', col: [0.12, 0.78, 0.38], k: 0.95, ppc: 3800, w: 80 },
      { id: 'muzo', name: 'Muzo Emerald', col: [0.05, 0.85, 0.35], k: 1.15, ppc: 16000, w: 5, rare: 3 },
    ] },
  benitoite: { name: 'Benitoite', ri: 1.78, disp: 0.046, sg: 3.65, h: 6.2, habit: 'tabular', size: [2.6, 5], clarity: 0.3, tier: 4, origin: 'San Benito County, California',
    fact: 'Found in gem quality at only one mine on Earth. Under ultraviolet light it glows bright blue.',
    vars: [{ id: 'benitoite', name: 'Benitoite', fam: 'blue', col: [0.3, 0.45, 1.0], k: 0.85, ppc: 5200, w: 10, rare: 2, glow: 0.18 }] },
  taaffeite: { name: 'Taaffeite', ri: 1.72, disp: 0.019, sg: 3.6, h: 8.2, habit: 'barrel', size: [2.4, 4.6], clarity: 0.25, tier: 5, origin: 'Ratnapura, Sri Lanka',
    fact: 'In 1945 Count Taaffe noticed one "spinel" in a box of cut stones behaved oddly: it was a new mineral, the only gem first identified after being cut.',
    vars: [{ id: 'taaffeite', name: 'Taaffeite', fam: 'purple', col: [0.85, 0.6, 0.85], k: 0.7, ppc: 24000, w: 3, rare: 3 }] },
  diamond: { name: 'Diamond', ri: 2.417, disp: 0.044, sg: 3.52, h: 10, habit: 'octa', size: [2.4, 5.2], clarity: 0.32, tier: 5, origin: 'Jwaneng, Botswana',
    fact: 'Diamonds form 150 km down and ride to the surface in volcanic eruptions, at up to 30 km/h.',
    vars: [
      { id: 'white', name: 'Diamond', col: [1.0, 1.0, 1.0], k: 0.1, ppc: 8000, w: 70 },
      { id: 'canary', name: 'Fancy Yellow Diamond', col: [1.0, 0.9, 0.3], k: 0.6, ppc: 16000, w: 15, rare: 1 },
      { id: 'pink', name: 'Pink Diamond', col: [1.0, 0.55, 0.72], k: 0.6, ppc: 120000, w: 2.5, rare: 3 },
      { id: 'blue', name: 'Blue Diamond', col: [0.45, 0.68, 1.0], k: 0.6, ppc: 180000, w: 1.6, rare: 3 },
      { id: 'red', name: 'Red Diamond', col: [0.95, 0.12, 0.2], k: 0.85, ppc: 600000, w: 0.4, rare: 4, glow: 0.1 },
    ] },
};
export const SPECIES_IDS = Object.keys(SPECIES);
export const RARITY = [
  { name: 'Common', color: '#cfc6b6' }, { name: 'Fine', color: '#7fd4a4' }, { name: 'Rare', color: '#6fb6ff' }, { name: 'Exceptional', color: '#c48cff' }, { name: 'Legendary', color: '#ffc35c' },
];
export const variety = (sp, vid) => SPECIES[sp].vars.find((v) => v.id === vid);
export const gemName = (sp, vid) => variety(sp, vid).name;
// absorption coefficients for the shader (and the colour swatch for UI)
export function optics(sp, vid, tone = 1, warm = 0) {
  const S = SPECIES[sp], V = variety(sp, vid); let c = V.warm && warm > 0 ? V.col.map((x, i) => x + (V.warm[i] - x) * warm) : V.col;
  let k = V.k * tone;
  if (V.col[0] > 0.95 && V.col[1] > 0.95 && V.col[2] > 0.95) { const y = Math.min(1, Math.max(0, (tone - 0.7) / 0.6)); c = [1, 1 - 0.09 * y, 1 - 0.32 * y]; k = 0.25 + y * 0.5; } // white stones: D → M tint
  const sig = c.map((x) => -Math.log(Math.max(0.02, x)) * k * 0.9);
  return { ri: S.ri, disp: V.disp || S.disp, sig, tint: c, glow: V.glow || 0 };
}
export const swatch = (sp, vid) => { const c = variety(sp, vid).col; return `rgb(${c.map((x) => Math.round(Math.pow(x, 1 / 2.2) * 255)).join(',')})`; };
// colour families (customers ask for these)
export const FAMILY = { red: 'Red', pink: 'Pink', orange: 'Orange', yellow: 'Yellow', green: 'Green', blue: 'Blue', purple: 'Purple', white: 'Colourless', brown: 'Earthy' };
export function familyOf(sp, vid) {
  const V = variety(sp, vid); if (V.fam) return V.fam; const [r, g, b] = V.col; const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx - mn < 0.12) return 'white';
  if (r > 0.45 && g < 0.6 && b < 0.6 && r - g > 0.3 && r - b > 0.25 && !(b > 0.35 && r > 0.9 && g > 0.3)) return g > 0.35 && b < 0.3 ? 'orange' : (b > 0.32 ? 'pink' : 'red');
  if (r > 0.8 && b > 0.5 && g < 0.75) return 'pink';
  if (r > 0.8 && g > 0.6 && b < 0.45) return 'yellow';
  if (r > 0.8 && g > 0.35 && b < 0.45) return 'orange';
  if (r < 0.65 && g > 0.6 && b < 0.55) return 'green';
  if (b > 0.7 && r > 0.4 && g < 0.45) return 'purple';
  if (b >= g && b > 0.6) return 'blue';
  if (g > 0.7 && b > 0.7) return 'blue';
  return 'brown';
}
