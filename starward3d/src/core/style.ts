// Style Locker rules: what is unlocked, how to earn the rest, and which unlocks are new since the player last looked.
import { State } from './state';
import { PAINTS, BANNER_BG, EMBLEMS, TURFS, Need, STAT_LABEL, ISLAND_LABEL } from '../data/cosmetics';
import { daily } from './daily';
import { arena } from './arena';
import { allies } from './space';
export function met(s: State, n?: Need): boolean { if (!n) return true;
  if (n.lvl && s.lvl < n.lvl) return false; if (n.stat && (s.stats[n.stat[0]] || 0) < n.stat[1]) return false; if (n.island && !s.islands[n.island]) return false;
  if (n.allies && allies(s) < n.allies) return false; if (n.dex && Object.keys(s.dex).length < n.dex) return false; if (n.logins && daily(s).total < n.logins) return false;
  if (n.trophies && arena(s).best < n.trophies) return false; return true; }
export function needText(n?: Need) { if (!n) return 'Free'; if (n.lvl) return `Commander level ${n.lvl}`; if (n.stat) return `${n.stat[1]} ${STAT_LABEL[n.stat[0]] || n.stat[0]}`;
  if (n.island) return ISLAND_LABEL[n.island] || n.island; if (n.allies) return 'Meet an alien civilisation'; if (n.dex) return `${n.dex} species in the Botdex`; if (n.logins) return `${n.logins} days on the login calendar`;
  if (n.trophies) return `${n.trophies} trophies`; return ''; }
// one flat list, so "new" badges and the collection count are easy
export const ALL = [...PAINTS.map((p) => ({ key: 'paint:' + p.id, kind: 'paint', name: p.name, need: p.need })), ...BANNER_BG.map((b) => ({ key: 'bg:' + b.id, kind: 'banner colour', name: b.name, need: b.need })),
  ...EMBLEMS.map((e) => ({ key: 'em:' + e.id, kind: 'emblem', name: e.name, need: e.need })), ...TURFS.map((t) => ({ key: 'turf:' + t.id, kind: 'island turf', name: t.name, need: t.need }))];
export const owned = (s: State) => ALL.filter((x) => met(s, x.need));
function seen(s: State): string[] { const a = s as any; if (!a.styleSeen) a.styleSeen = ALL.filter((x) => met(s, x.need)).map((x) => x.key); return a.styleSeen; }
// unlocks the player has not been told about yet (marks them told)
export function freshUnlocks(s: State) { const sn = seen(s); const out = ALL.filter((x) => met(s, x.need) && !sn.includes(x.key)); for (const x of out) sn.push(x.key); if (out.length) (s as any).styleNew = ((s as any).styleNew || 0) + out.length; return out; }
export const baseline = (s: State) => { seen(s); };
export const newCount = (s: State) => (s as any).styleNew || 0;
export const clearNew = (s: State) => { (s as any).styleNew = 0; };
