// Turns a profile (workshop + lab + cards) into battle stats. Shared by the game and balancing sims.
import { WORKSHOP, LAB } from './data.js';
const W = Object.fromEntries(WORKSHOP.map((w) => [w.id, w]));
const L = Object.fromEntries(LAB.map((r) => [r.id, r]));
export function deriveStats(p) {
  const ws = (id) => W[id].val(p.workshop[id] || 0); const lab = (id) => L[id].val(p.lab.levels[id] || 0);
  return {
    coreDmg: ws('coreDmg'), wispDmg: ws('wispDmg'), speed: ws('speed'), crit: ws('crit'), critDmg: ws('critDmg'),
    hp: ws('hp'), regen: ws('regen'), armor: ws('armor'), nova: ws('nova'),
    embers: ws('embers'), startEmbers: ws('startEmbers'), coins: ws('coins') * lab('coinYield'), discount: ws('discount'),
    startWisps: lab('startWisps'), cheapPower: lab('cheapPower'), cards: { ...p.cards },
  };
}
export const labVal = (p, id) => L[id].val(p.lab.levels[id] || 0);
