// The Style Locker: every paint, banner colour, emblem and island turf, and how each one is earned.
// Cosmetics never change the numbers; they are how a colony becomes yours (and something to chase every week).
export interface Need { lvl?: number; stat?: [string, number]; island?: string; allies?: number; dex?: number; logins?: number; trophies?: number; }
export interface Paint { id: string; name: string; primary: string; accent: string; need?: Need; }
export interface Swatch { id: string; name: string; color: string; need?: Need; }
export interface Emblem { id: string; name: string; need?: Need; }
export interface Turf { id: string; name: string; desc: string; need?: Need; }
export const PAINTS: Paint[] = [
  { id: 'haven', name: 'Haven', primary: '#e9eef5', accent: '#22c7e8' },
  { id: 'sunrise', name: 'Sunrise', primary: '#f4efe6', accent: '#ff7a3c' },
  { id: 'meadow', name: 'Meadow', primary: '#dfe7d8', accent: '#4fcf5a' },
  { id: 'nightgold', name: 'Night Gold', primary: '#2e3644', accent: '#ffd23a', need: { lvl: 4 } },
  { id: 'orchid', name: 'Orchid', primary: '#f2e8f7', accent: '#b06dff', need: { lvl: 7 } },
  { id: 'cobalt', name: 'Cobalt', primary: '#e6f1ff', accent: '#2f6bff', need: { lvl: 10 } },
  { id: 'dusk', name: 'Crimson Dusk', primary: '#3b2f2f', accent: '#ff4f6a', need: { lvl: 13 } },
  { id: 'brass', name: 'Brass', primary: '#fff6dc', accent: '#c9902a', need: { lvl: 16 } },
  { id: 'lunar', name: 'Lunar Silver', primary: '#c9ccd3', accent: '#7aa8ff', need: { island: 'moon' } },
  { id: 'rust', name: 'Martian Rust', primary: '#e8d2c0', accent: '#c4502a', need: { island: 'mars' } },
  { id: 'jade', name: 'Veyari Jade', primary: '#e4f2ea', accent: '#1fae7a', need: { allies: 1 } },
  { id: 'precursor', name: 'Precursor', primary: '#1d1a2b', accent: '#c49bff', need: { island: 'vault' } },
  { id: 'champion', name: 'Champion', primary: '#fbf3e4', accent: '#e8202f', need: { stat: ['arenaWins', 25] } },
  { id: 'carapace', name: 'Carapace', primary: '#2a2f22', accent: '#9bdc3a', need: { stat: ['raidsWon', 5] } },
  { id: 'solstice', name: 'Solstice', primary: '#fff4d6', accent: '#ffb23e', need: { stat: ['eventSteps', 8] } },
  { id: 'prism', name: 'Prism', primary: '#f4f7ff', accent: '#ff5ad1', need: { dex: 50 } },
];
export const BANNER_BG: Swatch[] = [
  { id: 'blue', name: 'Blue', color: '#1b6fd8' }, { id: 'red', name: 'Red', color: '#d83a3a' }, { id: 'green', name: 'Green', color: '#1f9c5a' }, { id: 'violet', name: 'Violet', color: '#7a3fd6' },
  { id: 'amber', name: 'Amber', color: '#e08a1a' }, { id: 'night', name: 'Night', color: '#14202e' }, { id: 'snow', name: 'Snow', color: '#e6e6ea' }, { id: 'teal', name: 'Teal', color: '#0fb3c9' },
  { id: 'rose', name: 'Rose', color: '#ff7ab8', need: { lvl: 12 } }, { id: 'gold', name: 'Gold', color: '#d4a21c', need: { logins: 14 } },
  { id: 'void', name: 'Void', color: '#2b0f45', need: { island: 'vault' } }, { id: 'onyx', name: 'Onyx', color: '#050608', need: { stat: ['raidsWon', 3] } },
];
export const BANNER_FG = ['#ffd23a', '#ffffff', '#14202e', '#ff4f6a', '#6ee7ff', '#7cf29a', '#c49bff', '#ff9a3c'];
export const EMBLEMS: Emblem[] = [
  { id: 'star', name: 'Star' }, { id: 'planet', name: 'Planet' }, { id: 'circle', name: 'Orb' },
  { id: 'bolt', name: 'Bolt', need: { lvl: 3 } }, { id: 'gear', name: 'Gear', need: { lvl: 5 } }, { id: 'rocket', name: 'Rocket', need: { stat: ['expeditions', 1] } },
  { id: 'crown', name: 'Crown', need: { stat: ['arenaWins', 10] } }, { id: 'atom', name: 'Atom', need: { stat: ['fusions', 5] } }, { id: 'leaf', name: 'Leaf', need: { stat: ['decor', 25] } },
  { id: 'eye', name: 'Watcher', need: { allies: 1 } }, { id: 'chip', name: 'Chip', need: { dex: 30 } }, { id: 'gem', name: 'Relic', need: { island: 'vault' } },
];
export const TURFS: Turf[] = [
  { id: 'haven', name: 'Haven Meadow', desc: 'Soft green turf and wildflowers.' },
  { id: 'dune', name: 'Dune Mesa', desc: 'Warm sand, dry grass and desert blooms.', need: { lvl: 9 } },
  { id: 'sakura', name: 'Sakura Terrace', desc: 'Pale grass under drifts of pink petals.', need: { lvl: 12 } },
  { id: 'frost', name: 'Frost Shelf', desc: 'Packed snow, blue ice and frosted tufts.', need: { lvl: 15 } },
  { id: 'ember', name: 'Ember Grove', desc: 'Autumn fire: copper grass and red leaves.', need: { stat: ['eventSteps', 4] } },
  { id: 'neon', name: 'Neon Grid', desc: 'Midnight panels and glowing fibre-optic grass.', need: { stat: ['arenaWins', 15] } },
  { id: 'moon', name: 'Lunar Regolith', desc: 'Grey dust and pebbles carried home from the Moon.', need: { island: 'moon' } },
  { id: 'mars', name: 'Red Sands', desc: 'Iron-red ground from Bradbury Landing.', need: { island: 'mars' } },
  { id: 'vault', name: 'Precursor Stone', desc: 'Violet ruin-stone, humming with relic dust.', need: { island: 'vault' } },
];
export const STAT_LABEL: Record<string, string> = { arenaWins: 'Arena wins', raidsWon: 'Swarm raids repelled', eventSteps: 'event rewards claimed', expeditions: 'expeditions', fusions: 'fusions', decor: 'decorations placed' };
export const ISLAND_LABEL: Record<string, string> = { moon: 'Found Tranquility Base on the Moon', mars: 'Found Bradbury Landing on Mars', vault: 'Found the Precursor Vault' };
