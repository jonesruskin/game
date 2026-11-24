// Bot species. Part 1 ships the starter crew (one per starter element) and the first two-element hybrids; Part 2
// expands to the full roster with fusion. A species' look is procedural: chassis + its elements' colours.
export type Chassis = 'drone' | 'rover' | 'walker' | 'android' | 'mech' | 'orb' | 'crawler';
export interface Species { name: string; el: string[]; rarity: string; chassis: Chassis; desc: string; price?: number; unlock?: number; }
export const SPECIES: Record<string, Species> = {
  helio:      { name: 'Helio',      el: ['solar'],  rarity: 'standard', chassis: 'orb',     price: 300,  unlock: 1, desc: 'A floating solar collector with a sunny disposition. Your first crewmate.' },
  ember:      { name: 'Ember',      el: ['plasma'], rarity: 'standard', chassis: 'rover',   price: 350,  unlock: 1, desc: 'Welds hull plates with a plasma torch it is very proud of.' },
  tidepool:   { name: 'Tidepool',   el: ['hydro'],  rarity: 'standard', chassis: 'crawler', price: 400,  unlock: 2, desc: 'Recycles every drop of water on the island. Twice.' },
  frostbyte:  { name: 'Frostbyte',  el: ['cryo'],   rarity: 'standard', chassis: 'walker',  price: 450,  unlock: 3, desc: 'Keeps the servers cold and the jokes colder.' },
  digger:     { name: 'Digger',     el: ['geo'],    rarity: 'standard', chassis: 'rover',   price: 500,  unlock: 4, desc: 'Has never met a rock it could not move.' },
  sprout:     { name: 'Sprout',     el: ['bio'],    rarity: 'standard', chassis: 'android', price: 550,  unlock: 5, desc: 'Talks to the greenhouse plants. They grow faster.' },
  sparky:     { name: 'Sparky',     el: ['volt'],   rarity: 'standard', chassis: 'drone',   price: 600,  unlock: 6, desc: 'A hyperactive power drone. Do not let it near the coffee.' },
  bolt:       { name: 'Bolt',       el: ['alloy'],  rarity: 'standard', chassis: 'mech',    price: 700,  unlock: 7, desc: 'Lifts girders, opens jars, never complains.' },
  // the first hybrids (Advanced): bought in Part 1, bred in the Fusion Lab from Part 2
  solarflare: { name: 'Solarflare', el: ['solar', 'plasma'], rarity: 'advanced', chassis: 'drone',   price: 2600,  unlock: 8,  desc: 'Catches sunlight, throws it back as fire.' },
  thunderhead:{ name: 'Thunderhead',el: ['volt', 'hydro'],   rarity: 'advanced', chassis: 'orb',     price: 3800,  unlock: 10, desc: 'A storm in a sphere. Crackles when it is happy.' },
  magmaw:     { name: 'Magmaw',     el: ['geo', 'plasma'],   rarity: 'advanced', chassis: 'crawler', price: 5200,  unlock: 12, desc: 'Eats rock, breathes lava, purrs.' },
  greenhouse: { name: 'Greenhouse', el: ['bio', 'solar'],    rarity: 'advanced', chassis: 'android', price: 7000,  unlock: 14, desc: 'A walking garden that photosynthesises on the job.' },
  glacier:    { name: 'Glacier',    el: ['cryo', 'alloy'],   rarity: 'advanced', chassis: 'mech',    price: 9500,  unlock: 16, desc: 'Ice-armoured and unhurried. Nothing gets past.' },
};
export const SPECIES_ORDER = Object.keys(SPECIES);
