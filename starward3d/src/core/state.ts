// Save format. Everything the colony is; versioned so later parts can migrate old saves.
import { uid } from './util';
import { STEPS } from '../data/progress';
export const VERSION = 1;
export interface Item { id: string; t: string; el?: string; lvl: number; x: number; z: number; r: number; }
export interface Island { plots: string[]; items: Item[]; bought: number; }
export interface BotRec { id: string; sp: string; lvl: number; fed: number; bay: string | null; nick?: string; born: number; post?: string; stored?: boolean; }
export interface Core { id: string; sp: string; from: 'fusion' | 'shop' | 'gift'; state: 'waiting' | 'booting' | 'ready'; at: number; }
export interface Job { id: string; kind: 'build' | 'craft' | 'fuse' | 'boot'; item: string; start: number; end: number; lvl?: number; recipe?: number; sp?: string; core?: string; parents?: [string, string]; }
export interface State {
  v: number; created: number; last: number; name: string;
  res: { credits: number; cells: number; dm: number };
  xp: number; lvl: number;
  islands: Record<string, Island>; at: string;
  bots: BotRec[]; jobs: Job[]; cores: Core[]; dex: Record<string, number>;
  bay: Record<string, number>;
  ready: Record<string, { cells: number; xp: number }>;
  obj: { i: number; claimed: Record<string, number> };
  stats: Record<string, number>;
  settings: { sfx: number; music: number; quality: 'auto' | 'high' | 'low' };
  paint: { primary: string; accent: string };
  banner: { bg: string; fg: string; emblem: string };
  builders: number; landBought: number; tut: number;
}
export function fresh(now = Date.now()): State {
  const item = (t: string, x: number, z: number, lvl = 1, el?: string): Item => ({ id: uid('i'), t, x, z, r: 0, lvl, ...(el ? { el } : {}) });
  const cc = item('command', 13, 13), bay = item('bay', 8, 9, 1, 'solar'), fab = item('fab', 19, 9);
  const s: State = {
    v: VERSION, created: now, last: now, name: 'New Haven',
    res: { credits: 600, cells: 30, dm: 25 }, xp: 0, lvl: 1,
    islands: { home: { plots: ['1,1', '2,1', '3,1', '1,2', '2,2', '3,2', '1,3', '2,3', '3,3'], bought: 0,
      items: [cc, bay, fab, item('tree', 12, 9), item('tree', 17, 18), item('rock', 8, 19), item('tree', 9, 18), item('path', 14, 17), item('path', 15, 17), item('path', 14, 18), item('path', 15, 18)] } }, at: 'home',
    bots: [{ id: uid('b'), sp: 'helio', lvl: 1, fed: 0, bay: bay.id, born: now }],
    jobs: [], cores: [], dex: { helio: now }, bay: { [bay.id]: 120 }, ready: {},
    obj: { i: 0, claimed: {} }, stats: {},
    settings: { sfx: 0.8, music: 0.45, quality: 'auto' },
    paint: { primary: '#e9eef5', accent: '#22c7e8' },
    banner: { bg: '#1b6fd8', fg: '#ffd23a', emblem: 'star' },
    builders: 2, landBought: 0, tut: 0,
  };
  return s;
}
export function migrate(s: State): State {
  const f = fresh(s.created || Date.now()) as any; const o = s as any;
  // Part 6: one island became several
  if (o.isl && !o.islands) { o.islands = { home: { plots: o.isl.plots, items: o.isl.items, bought: o.landBought || 0 } }; o.at = 'home'; delete o.isl; }
  for (const k in f) if (o[k] === undefined) o[k] = f[k];
  for (const k in f.settings) if ((o.settings as any)[k] === undefined) (o.settings as any)[k] = f.settings[k];
  for (const b of s.bots) if (!s.dex[b.sp]) s.dex[b.sp] = b.born || Date.now();
  // missions are tracked by id: resume at the first one not yet claimed (steps can be reordered between versions)
  const i = STEPS.findIndex((st) => !s.obj.claimed[st.id]); s.obj.i = i < 0 ? STEPS.length : i;
  s.v = VERSION; return s;
}
