// Style Locker rules: what the player wears, what is unlocked, how to earn the rest, and which unlocks are new.
import { State } from './state';
import { PAINTS, BANNER_BG, EMBLEMS, Need, COLONY_NAMES, GALAXY_NAMES } from '../data/style';
import { hqLevel } from './econ';
import { war as wg } from './war';
import { daily } from './daily';
import { rb } from './robots';
import { terraStage } from './solar';
import { war as conflict } from './conflict';
export interface Style { primary: string; accent: string; bg: string; fg: string; emblem: string; }
export const style = (s: State): Style => { const a = s as any; return a.style || (a.style = { primary: PAINTS[0].primary, accent: PAINTS[0].accent, bg: BANNER_BG[0].color, fg: '#ffd23a', emblem: 'rocket' }); };
export const lookOf = (s: State) => { const S = style(s); return { primary: S.primary, accent: S.accent, banner: { bg: S.bg, fg: S.fg, emblem: S.emblem } }; };
export function met(s: State, n?: Need): boolean { if (!n) return true; const a = s as any;
  if (n.hq && hqLevel(s) < n.hq) return false; if (n.colony && !s.bases[n.colony]) return false; if (n.trophies && wg(s).best < n.trophies) return false;
  if (n.studied && Object.values((a.life || {}).st || {}).filter((v: any) => v >= 3).length < n.studied) return false; if (n.rungs && Object.keys((a.life || {}).rungs || {}).length < n.rungs) return false;
  if (n.met && Object.keys((a.aliens || {}).known || {}).length < n.met) return false; if (n.hive && !Object.keys(conflict(s).hives || {}).some((k) => k.endsWith('_done'))) return false;
  if (n.galaxy && !((a.beyond || {}).visited || {})[n.galaxy]) return false; if (n.dex && Object.keys(rb(s).dex).length < n.dex) return false; if (n.logins && daily(s).total < n.logins) return false;
  if (n.terra && terraStage(s, n.terra[0]) < n.terra[1]) return false; if (n.k && (s.kMax || 0) < n.k) return false; if (n.asc && ((a.asc || {}).count || 0) < n.asc) return false; return true; }
export function needText(n?: Need) { if (!n) return 'Free'; if (n.hq) return `Mission Control level ${n.hq}`; if (n.colony) return COLONY_NAMES[n.colony] || n.colony; if (n.trophies) return `${n.trophies} Orbital Trials merit`;
  if (n.studied) return `Fully study ${n.studied} lifeform${n.studied > 1 ? 's' : ''}`; if (n.rungs) return `Reach ${n.rungs} rungs of the Life Ladder`; if (n.met) return n.met > 1 ? `Meet ${n.met} civilisations` : 'Meet an alien civilisation';
  if (n.hive) return 'Destroy a Kr\'thul hive'; if (n.galaxy) return GALAXY_NAMES[n.galaxy] || n.galaxy; if (n.dex) return `${n.dex} species in the Robot Registry`; if (n.logins) return `${n.logins} days on the calendar`;
  if (n.terra) return `Terraform ${n.terra[0] === 'mars' ? 'Mars' : 'Venus'} to stage ${n.terra[1]}`; if (n.k) return `Kardashev ${n.k.toFixed(1)}`; if (n.asc) return 'Ascend once'; return ''; }
// one flat list, so "new" badges and the collection count are easy
export const ALL = [...PAINTS.map((p) => ({ key: 'paint:' + p.id, kind: 'paint scheme', name: p.name, need: p.need })), ...BANNER_BG.map((b) => ({ key: 'bg:' + b.id, kind: 'banner colour', name: b.name, need: b.need })), ...EMBLEMS.map((e) => ({ key: 'em:' + e.id, kind: 'emblem', name: e.name, need: e.need }))];
export const owned = (s: State) => ALL.filter((x) => met(s, x.need));
function seen(s: State): string[] { const a = s as any; if (!a.styleSeen) a.styleSeen = owned(s).map((x) => x.key); return a.styleSeen; }
// unlocks the player has not been told about yet (marks them told)
export function freshUnlocks(s: State) { const sn = seen(s); const out = ALL.filter((x) => met(s, x.need) && !sn.includes(x.key)); for (const x of out) sn.push(x.key); if (out.length) (s as any).styleNew = ((s as any).styleNew || 0) + out.length; return out; }
export const newCount = (s: State) => (s as any).styleNew || 0;
export const clearNew = (s: State) => { (s as any).styleNew = 0; };
