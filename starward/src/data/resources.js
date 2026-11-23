// STARWARD: resources of the empire stockpile.
// cap: true → limited by storage; energy is a live balance (generation vs. draw), never stockpiled.
export const RES = {
  credits: { name: 'Credits', short: 'CR', color: '#ffd166', cap: true, start: true, desc: 'Funding from governments, sponsors and commerce. Spent on nearly everything.' },
  metal: { name: 'Metal', short: 'MT', color: '#b8c4d6', cap: true, start: true, desc: 'Steel, aluminium and titanium for structures, rockets and ships.' },
  fuel: { name: 'Fuel', short: 'FU', color: '#ff8a5b', cap: true, start: true, desc: 'Rocket propellant: kerosene, liquid hydrogen and oxygen, later methane and more.' },
  science: { name: 'Science', short: 'SC', color: '#6ee7ff', cap: true, start: true, desc: 'Research data. Spent to unlock technologies.' },
  he3: { name: 'Helium-3', short: 'He3', color: '#b892ff', cap: true, desc: 'A rare isotope found in lunar regolith and gas giants. Fusion fuel.' },
  rare: { name: 'Rare Elements', short: 'RE', color: '#7cf29a', cap: true, desc: 'Platinum-group metals and rare earths from asteroids.' },
  exotic: { name: 'Exotic Matter', short: 'EX', color: '#ff5cf0', cap: true, desc: 'Negative-energy matter (speculative). It holds warp bubbles and wormholes open.' },
  antimatter: { name: 'Antimatter', short: 'AM', color: '#ff4d6d', cap: true, desc: 'The densest energy source known. Handle with care.' },
  influence: { name: 'Influence', short: 'IN', color: '#ffb3c7', cap: true, desc: 'Diplomatic standing among the civilisations of the galaxy.' },
  xeno: { name: 'Xenodata', short: 'XD', color: '#9dff5c', cap: true, desc: 'Knowledge gathered from alien life, ruins and artifacts.' },
  dm: { name: 'Dark Matter', short: 'DM', color: '#c9b6ff', cap: false, start: true, desc: 'A precious, mysterious resource. It completes any timer instantly. Earned through milestones.' },
};
export const RES_ORDER = ['credits', 'metal', 'fuel', 'science', 'he3', 'rare', 'exotic', 'antimatter', 'influence', 'xeno'];
