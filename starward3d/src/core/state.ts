// The save. Versioned so years-long saves can be migrated forward safely. Systems added by later parts keep their
// state in their own sub-objects, created on first use (see each module's accessor).
import { GRID } from '../data/buildings';
export const SAVE_KEY = 'starward3d_v2';
export const VERSION = 3;
export interface Item { id: string; b: string; lvl: number; x: number; z: number; r: number; held?: number; }
export interface Base { body: string; name: string; items: Item[]; pop?: number; claims?: Record<string, number>; surveyed?: Record<string, number>; site?: string; }
export interface Job { id: string; kind: string; base?: string; item?: string; b?: string; from?: number; to?: number; tech?: string; start: number; end: number; [k: string]: any; }
export interface State {
  v: number; created: number; last: number; seq: number; name: string;
  res: Record<string, number>; bases: Record<string, Base>; at: string; jobs: Job[]; tech: Record<string, number>; flags: Record<string, any>;
  obj: { i: number; claimed: Record<string, number> }; stats: Record<string, number>; settings: { sfx: number; music: number; quality: 'auto' | 'high' | 'low' }; tut: number;
  kMax: number; [k: string]: any;
}
const C = GRID / 2;
export function fresh(t = Date.now()): State {
  let n = 0; const it = (b: string, x: number, z: number, lvl = 1, held = 0): Item => ({ id: 'i' + (n++).toString(36), b, x, z, r: 0, lvl, held });
  return {
    v: VERSION, created: t, last: t, seq: 100, name: 'Cape Horizon',
    res: { credits: 1500, metal: 1800, fuel: 300, science: 60, dm: 30 },
    bases: { earth: { body: 'earth', name: 'Cape Horizon', items: [it('hq', C - 2, C - 2), it('mine', C - 9, C - 6, 1, 400), it('solar', C - 9, C - 1), it('office', C + 5, C - 6, 1, 600), it('depot', C + 5, C - 1)] } },
    at: 'earth', jobs: [], tech: {}, flags: {}, obj: { i: 0, claimed: {} },
    stats: { built: 0, upgrades: 0, researched: 0, dmSpent: 0, collected: 0, playS: 0, sessions: 0 },
    settings: { sfx: 0.8, music: 0.45, quality: 'auto' }, tut: 0, kMax: 0,
  };
}
export function migrate(s: State): State {
  const f = fresh(s.created || Date.now()) as any; const o = s as any;
  // v3: the land around each base grew from 52 to 96 cells; everything moves to the new centre
  if ((o.v || 2) < 3 && o.bases) for (const k in o.bases) for (const it of o.bases[k].items || []) { it.x += 22; it.z += 22; }
  for (const k in f) if (o[k] === undefined) o[k] = f[k];
  for (const k in f.stats) if (s.stats[k] === undefined) s.stats[k] = f.stats[k];
  for (const k in f.settings) if ((s.settings as any)[k] === undefined) (s.settings as any)[k] = f.settings[k];
  s.v = VERSION; return s;
}
export const uid = (s: State, p = 'j') => p + (s.seq++).toString(36);
