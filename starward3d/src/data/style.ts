// The Style Locker: paint schemes, banner colours and emblems, and how each is earned. Cosmetics never change the
// numbers; they make the programme yours, and every one is earned by playing (milestones across all five eras),
// never bought.
export interface Need { hq?: number; colony?: string; trophies?: number; studied?: number; rungs?: number; met?: number; hive?: boolean; galaxy?: string; dex?: number; logins?: number; terra?: [string, number]; k?: number; asc?: number; }
export interface Paint { id: string; name: string; primary: string; accent: string; need?: Need; }
export interface Swatch { id: string; name: string; color: string; need?: Need; }
export interface Emblem { id: string; name: string; need?: Need; }
export const PAINTS: Paint[] = [
  { id: 'agency', name: 'Agency White', primary: '#e9eef5', accent: '#22c7e8' },
  { id: 'sunrise', name: 'Sunrise', primary: '#f4efe6', accent: '#ff7a3c' },
  { id: 'meadow', name: 'Meadow', primary: '#dfe7d8', accent: '#4fcf5a' },
  { id: 'nightgold', name: 'Night Gold', primary: '#2e3644', accent: '#ffd23a', need: { hq: 4 } },
  { id: 'cobalt', name: 'Cobalt', primary: '#e6f1ff', accent: '#2f6bff', need: { hq: 7 } },
  { id: 'brass', name: 'Brass', primary: '#fff6dc', accent: '#c9902a', need: { hq: 10 } },
  { id: 'lunar', name: 'Lunar Silver', primary: '#c9ccd3', accent: '#7aa8ff', need: { colony: 'moon' } },
  { id: 'rust', name: 'Martian Rust', primary: '#e8d2c0', accent: '#c4502a', need: { colony: 'mars' } },
  { id: 'sulphur', name: 'Cloud City', primary: '#fff3c8', accent: '#e0a400', need: { colony: 'venus' } },
  { id: 'kraken', name: 'Kraken Amber', primary: '#3a2f22', accent: '#ff9a3c', need: { colony: 'titan' } },
  { id: 'verdant', name: 'Verdant Mars', primary: '#e2efe0', accent: '#2fae5a', need: { terra: ['mars', 5] } },
  { id: 'biolume', name: 'Bioluminescent', primary: '#0f2a2a', accent: '#5fe0c8', need: { studied: 3 } },
  { id: 'jade', name: 'Veyari Jade', primary: '#e4f2ea', accent: '#1fae7a', need: { met: 3 } },
  { id: 'champion', name: 'Champion', primary: '#fbf3e4', accent: '#e8202f', need: { trophies: 1200 } },
  { id: 'carapace', name: 'Carapace', primary: '#2a2f22', accent: '#9bdc3a', need: { hive: true } },
  { id: 'prism', name: 'Prism', primary: '#f4f7ff', accent: '#ff5ad1', need: { dex: 20 } },
  { id: 'hollow', name: 'Hollow Violet', primary: '#1d1a2b', accent: '#c49bff', need: { galaxy: 'smc' } },
  { id: 'ascendant', name: 'Ascendant', primary: '#14061c', accent: '#ff6bd6', need: { asc: 1 } },
];
export const BANNER_BG: Swatch[] = [
  { id: 'blue', name: 'Blue', color: '#1b6fd8' }, { id: 'red', name: 'Red', color: '#d83a3a' }, { id: 'green', name: 'Green', color: '#1f9c5a' }, { id: 'violet', name: 'Violet', color: '#7a3fd6' },
  { id: 'amber', name: 'Amber', color: '#e08a1a' }, { id: 'night', name: 'Night', color: '#14202e' }, { id: 'snow', name: 'Snow', color: '#e6e6ea' }, { id: 'teal', name: 'Teal', color: '#0fb3c9' },
  { id: 'rose', name: 'Rose', color: '#ff7ab8', need: { hq: 8 } }, { id: 'gold', name: 'Gold', color: '#d4a21c', need: { logins: 14 } },
  { id: 'ocean', name: 'Europa Blue', color: '#0a3a5a', need: { rungs: 3 } }, { id: 'onyx', name: 'Onyx', color: '#050608', need: { trophies: 800 } },
  { id: 'void', name: 'Void', color: '#2b0f45', need: { galaxy: 'sagdeg' } }, { id: 'solar', name: 'Solar', color: '#ff9a00', need: { k: 2 } },
];
export const BANNER_FG = ['#ffd23a', '#ffffff', '#14202e', '#ff4f6a', '#6ee7ff', '#7cf29a', '#c49bff', '#ff9a3c'];
export const EMBLEMS: Emblem[] = [
  { id: 'rocket', name: 'Rocket' }, { id: 'star', name: 'Star' }, { id: 'planet', name: 'Planet' }, { id: 'circle', name: 'Orb' },
  { id: 'bolt', name: 'Bolt', need: { hq: 3 } }, { id: 'gear', name: 'Gear', need: { dex: 5 } }, { id: 'atom', name: 'Atom', need: { hq: 6 } },
  { id: 'crown', name: 'Crown', need: { trophies: 1000 } }, { id: 'helix', name: 'Helix', need: { studied: 1 } }, { id: 'leaf', name: 'Leaf', need: { terra: ['mars', 3] } },
  { id: 'eye', name: 'Watcher', need: { met: 1 } }, { id: 'chip', name: 'Chip', need: { dex: 15 } }, { id: 'shield', name: 'Bulwark', need: { hive: true } },
  { id: 'ring', name: 'Ring', need: { k: 1.5 } }, { id: 'gem', name: 'Relic', need: { galaxy: 'smc' } }, { id: 'spiral', name: 'Galaxy', need: { galaxy: 'andromeda' } },
];
export const COLONY_NAMES: Record<string, string> = { moon: 'Found a base on the Moon', mars: 'Found a colony on Mars', venus: 'Raise the Venus cloud city', titan: 'Found the Titan colony', ceres: 'Found the Ceres colony' };
export const GALAXY_NAMES: Record<string, string> = { sagdeg: 'Reach the Sagittarius Dwarf', smc: 'Reach the Small Magellanic Cloud', andromeda: 'Cross to Andromeda' };
