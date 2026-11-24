// The empire stockpile (ported from Starward). cap: limited by storage. Energy is a live balance, never stockpiled.
export interface ResDef { name: string; short: string; color: string; cap: boolean; start?: boolean; icon: string; desc: string; }
export const RES: Record<string, ResDef> = {
  credits: { name: 'Credits', short: 'CR', color: '#ffd166', cap: true, start: true, icon: '¢', desc: 'Funding from governments, sponsors and commerce. Spent on nearly everything.' },
  metal: { name: 'Metal', short: 'MT', color: '#b8c4d6', cap: true, start: true, icon: '▣', desc: 'Steel, aluminium and titanium for structures, rockets and ships.' },
  fuel: { name: 'Fuel', short: 'FU', color: '#ff8a5b', cap: true, start: true, icon: '▲', desc: 'Rocket propellant: kerosene, liquid hydrogen and oxygen, later methane and more.' },
  science: { name: 'Science', short: 'SC', color: '#6ee7ff', cap: true, start: true, icon: '✦', desc: 'Research data. Spent to unlock technologies.' },
  cells: { name: 'Power Cells', short: 'PC', color: '#7cf29a', cap: true, icon: '⚡', desc: 'Charged cells that level robots up and power new robot cores.' },
  he3: { name: 'Helium-3', short: 'He3', color: '#b892ff', cap: true, icon: '◉', desc: 'A rare isotope found in lunar regolith and gas giants. Fusion fuel.' },
  rare: { name: 'Rare Elements', short: 'RE', color: '#7cf29a', cap: true, icon: '◆', desc: 'Platinum-group metals and rare earths from asteroids.' },
  exotic: { name: 'Exotic Matter', short: 'EX', color: '#ff5cf0', cap: true, icon: '✺', desc: 'Negative-energy matter. It holds warp bubbles and wormholes open.' },
  antimatter: { name: 'Antimatter', short: 'AM', color: '#ff4d6d', cap: true, icon: '⊛', desc: 'The densest energy source known. Handle with care.' },
  influence: { name: 'Influence', short: 'IN', color: '#ffb3c7', cap: true, icon: '❖', desc: 'Diplomatic standing among the civilisations of the galaxy.' },
  xeno: { name: 'Xenodata', short: 'XD', color: '#9dff5c', cap: true, icon: '⌬', desc: 'Knowledge gathered from alien life, ruins and artifacts.' },
  dm: { name: 'Dark Matter', short: 'DM', color: '#c9b6ff', cap: false, start: true, icon: '◈', desc: 'A precious, mysterious resource. It completes any timer instantly. Earned, never bought.' },
};
export const RES_ORDER = ['credits', 'metal', 'fuel', 'science', 'cells', 'he3', 'rare', 'exotic', 'antimatter', 'influence', 'xeno'];
// resources whose producers hold their output until it is collected (Clash of Clans collectors)
export const COLLECTED = ['credits', 'metal', 'fuel'];
