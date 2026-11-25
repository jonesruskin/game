// Programme Rank: a single line of progress that always moves. Every finished project earns Esteem (bigger projects
// earn more), and so do goals, missions, launches and collecting. Each rank pays out, scaled to the empire's income,
// and comes with a mission patch for the collection. A layer on top: it never changes how anything else works.
import { State } from './state';
import { give } from './econ';
import { income, giftCore } from './daily';
import { round2, hash } from './util';
export interface RankState { xp: number; lvl: number; total: number; seen: number }
export const rk = (s: State): RankState => { const a = s as any; if (!a.rank) a.rank = { xp: 0, lvl: 1, total: 0, seen: 1 }; return a.rank; };
export const need = (r: number) => Math.round(30 + 25 * Math.pow(r, 1.55)); // Esteem from rank r to r + 1
export const TITLES = ['Ground Crew', 'Cadet', 'Technician', 'Flight Engineer', 'Mission Specialist', 'Test Pilot', 'Navigator', 'Payload Commander', 'Mission Commander', 'Flight Director', 'Programme Chief', 'Orbital Marshal', 'Lunar Warden', 'Red Planet Envoy', 'System Pathfinder', 'Belt Ranger', 'Gas Giant Pilot', 'Outer Reach Captain', 'Heliopause Voyager', 'Starwright', 'Interstellar Envoy', 'Star Admiral', 'Galactic Herald', 'Ascendant Navigator', 'Helion'];
const ROMAN = ['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export const titleOf = (r: number) => r <= TITLES.length ? TITLES[r - 1] : `Helion ${ROMAN[Math.min(9, r - TITLES.length)] || r - TITLES.length + 1}`;
// a finished project: 5 Esteem for a quick job, about 20 for five minutes, 67 for an hour, 180 for eight hours
export const jobEsteem = (sec: number, kind: string) => Math.round((5 + 8 * Math.sqrt(Math.max(0, sec) / 60)) * (kind === 'claim' ? 1.2 : kind === 'prospect' ? 0.8 : 1));
export const CORE_EVERY = 5;
const coreRarity = (r: number) => (r >= 30 ? 'elite' : r >= 15 ? 'advanced' : 'standard');
export interface RankUp { lvl: number; res: Record<string, number>; dm: number; core?: string }
// what reaching rank r pays (shown ahead of time, so the next rank is something to want)
export function rewardOf(s: State, r: number) { const inc = income(s, 0.5 + 0.02 * r); const res: Record<string, number> = {}; for (const k of ['credits', 'metal', 'fuel', 'science']) res[k] = round2(inc[k as keyof typeof inc] as number);
  return { res, dm: 2 + Math.floor(r / 3), core: r % CORE_EVERY === 0 ? coreRarity(r) : undefined }; }
export function gain(s: State, n: number): RankUp[] { const R = rk(s); n = Math.max(0, Math.round(n)); if (!n) return []; R.xp += n; R.total += n; const out: RankUp[] = [];
  while (R.xp >= need(R.lvl)) { R.xp -= need(R.lvl); R.lvl++; const w = rewardOf(s, R.lvl); give(s, w.res); s.res.dm = (s.res.dm || 0) + w.dm; let core: string | undefined; if (w.core) core = giftCore(s, w.core, hash('rank' + R.lvl + s.created));
    out.push({ lvl: R.lvl, res: w.res, dm: w.dm, core }); }
  return out; }
export const progress = (s: State) => { const R = rk(s); return Math.min(1, R.xp / need(R.lvl)); };
