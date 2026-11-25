// The 22 elements. A bot carries 1 to 4 of them; each grants moves in the Arena and decides which Bays it can
// live in. The 15 core elements fight; the 7 relic elements belong to the Precursor Vault and never fight.
export interface Element { name: string; color: string; glow: string; glyph: string; relic?: boolean; strong: string[]; blurb: string; }
export const ELEMENTS: Record<string, Element> = {
  solar:   { name: 'Solar',   color: '#ffb23e', glow: '#ffe08a', glyph: '☀', strong: ['bio', 'cryo'], blurb: 'Runs on starlight. Hums when the Sun is up.' },
  plasma:  { name: 'Plasma',  color: '#ff5a3c', glow: '#ffb08a', glyph: '♨', strong: ['alloy', 'bio'], blurb: 'Contained fire at ten thousand degrees.' },
  hydro:   { name: 'Hydro',   color: '#2f8cff', glow: '#9fd0ff', glyph: '≈', strong: ['plasma', 'geo'], blurb: 'Pumps, cleans and cools. Every colony needs water.' },
  cryo:    { name: 'Cryo',    color: '#7fe4ff', glow: '#dff8ff', glyph: '❄', strong: ['aero', 'bio'], blurb: 'Supercooled circuits, near absolute zero.' },
  geo:     { name: 'Geo',     color: '#b07a4a', glow: '#e2b48c', glyph: '▲', strong: ['volt', 'plasma'], blurb: 'Drills, diggers and regolith movers.' },
  bio:     { name: 'Bio',     color: '#4fcf5a', glow: '#b6ffb0', glyph: '❦', strong: ['hydro', 'geo'], blurb: 'Gardeners of greenhouses and living hulls.' },
  volt:    { name: 'Volt',    color: '#ffe23a', glow: '#fff6a8', glyph: 'ϟ', strong: ['hydro', 'aero'], blurb: 'Lightning in a capacitor.' },
  alloy:   { name: 'Alloy',   color: '#9aa7b8', glow: '#e6edf5', glyph: '⚙', strong: ['cryo', 'kinetic'], blurb: 'Armour, welders and heavy lifting.' },
  void:    { name: 'Void',    color: '#6b3fd6', glow: '#c2a6ff', glyph: '◐', strong: ['photon', 'neural'], blurb: 'Built for the dark between stars.' },
  photon:  { name: 'Photon',  color: '#fff4c2', glow: '#ffffff', glyph: '✦', strong: ['void', 'chrono'], blurb: 'Lasers, lenses and light.' },
  kinetic: { name: 'Kinetic', color: '#ff7a1a', glow: '#ffc28a', glyph: '✊', strong: ['alloy', 'gravity'], blurb: 'Impact, momentum, mass drivers.' },
  aero:    { name: 'Aero',    color: '#b9f0e6', glow: '#ecfffb', glyph: '༄', strong: ['geo', 'kinetic'], blurb: 'Flyers and atmosphere shapers.' },
  gravity: { name: 'Gravity', color: '#3c4aa8', glow: '#9aa6ff', glyph: '◉', strong: ['aero', 'photon'], blurb: 'Bends space a little, on purpose.' },
  chrono:  { name: 'Chrono',  color: '#c9a2ff', glow: '#eedcff', glyph: '⧗', strong: ['neural', 'volt'], blurb: 'Clocks running a little sideways.' },
  neural:  { name: 'Neural',  color: '#ff6fd8', glow: '#ffc4f0', glyph: '✺', strong: ['kinetic', 'gravity'], blurb: 'Artificial minds. They learn from everything.' },
  // relic elements (the Precursor Vault)
  relic:   { name: 'Relic',   color: '#d8b46a', glow: '#fff0c4', glyph: '⌬', relic: true, strong: [], blurb: 'Ancient make, older than our species.' },
  aurora:  { name: 'Aurora',  color: '#6fffc8', glow: '#d6fff0', glyph: '❈', relic: true, strong: [], blurb: 'Beauty as a power source.' },
  arcana:  { name: 'Arcana',  color: '#8a5cff', glow: '#d7c6ff', glyph: '✧', relic: true, strong: [], blurb: 'Technology indistinguishable from magic.' },
  entropy: { name: 'Entropy', color: '#ff3d6e', glow: '#ffb3c6', glyph: '✹', relic: true, strong: [], blurb: 'Chaos, harnessed.' },
  joy:     { name: 'Joy',     color: '#ffd24a', glow: '#fff2b8', glyph: '☺', relic: true, strong: [], blurb: 'Ancient machines made to be happy.' },
  reverie: { name: 'Reverie', color: '#7aa8ff', glow: '#d2e2ff', glyph: '☾', relic: true, strong: [], blurb: 'They dream in mathematics.' },
  soul:    { name: 'Soul',    color: '#f2f2ff', glow: '#ffffff', glyph: '❂', relic: true, strong: [], blurb: 'Something in them is alive.' },
};
export const CORE_ELEMENTS = Object.keys(ELEMENTS).filter((k) => !ELEMENTS[k].relic);
