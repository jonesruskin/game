// Meridian, the programme's AI. It never tells the player what to do: it carries out the orders the player gives it and
// handles the logistics nobody wants to babysit.
//   Level 1 (Artificial Intelligence):        a research queue and an upgrade queue, one order each
//   Level 2 (Autonomous Logistics):           two orders each; colonies with spare food feed hungry ones (15% lost)
//   Level 3 (Cognitive Architectures):        three orders each; 5% lost in transit; supply runs from Earth 40% cheaper
//   Level 4 (Matrioshka Brains):              four orders each
// Queues are strict: the next order starts as soon as it can (a free research slot or drone crew, and the resources);
// nothing is skipped ahead, and an order that becomes impossible (already researched, building gone, at its maximum
// level) is dropped with a note.
import { State } from './state';
import { canResearch, startResearch, canUpgrade, startUpgrade, slotsBusy, slotsTotal, itemOf } from './game';
import { logistics } from './food';
import { TECH } from '../data/research';
import { BUILDINGS } from '../data/buildings';
export interface UpOrder { base: string; id: string; }
export interface Meridian { rq: string[]; uq: UpOrder[]; }
export const LEVEL_TECH = ['ai', 'autonomousLogistics', 'cognitiveArchitecture', 'matrioshkaBrains'];
export const level = (s: State) => { let n = 0; for (const t of LEVEL_TECH) { if (s.tech[t]) n++; else break; } return n; };
export const mer = (s: State): Meridian => { const a = s as any; return a.meridian || (a.meridian = { rq: [], uq: [] }); };
export const capacity = (s: State) => level(s);
// research the player may queue: not done, not running, not queued, and its prerequisites done, running or queued ahead
export function canQueueResearch(s: State, id: string) { const M = mer(s), t = TECH[id]; if (!t || !level(s)) return { ok: false, why: '' }; if (s.tech[id] || s.jobs.some((j) => j.kind === 'research' && j.tech === id)) return { ok: false, why: '' };
  if (M.rq.includes(id)) return { ok: false, why: 'Queued' }; if (M.rq.length >= capacity(s)) return { ok: false, why: 'Queue full' };
  const have = (r: string) => !!s.tech[r] || s.jobs.some((j) => j.kind === 'research' && j.tech === r) || M.rq.includes(r); if (!(t.req || []).every(have)) return { ok: false, why: 'Needs earlier research' }; return { ok: true }; }
export function queueResearch(s: State, id: string) { const c = canQueueResearch(s, id); if (c.ok) mer(s).rq.push(id); return c; }
export function canQueueUpgrade(s: State, base: string, id: string) { const M = mer(s); if (!level(s)) return { ok: false, why: '' }; const it = itemOf(s, base, id); if (!it) return { ok: false, why: '' };
  const pending = M.uq.filter((o) => o.base === base && o.id === id).length; if (it.lvl + pending + (s.jobs.some((j) => j.item === id) ? 1 : 0) >= BUILDINGS[it.b].max) return { ok: false, why: 'Maximum level' }; if (M.uq.length >= capacity(s)) return { ok: false, why: 'Queue full' }; return { ok: true }; }
export function queueUpgrade(s: State, base: string, id: string) { const c = canQueueUpgrade(s, base, id); if (c.ok) mer(s).uq.push({ base, id }); return c; }
export function unqueue(s: State, kind: 'r' | 'u', i: number) { const M = mer(s); if (kind === 'r') M.rq.splice(i, 1); else M.uq.splice(i, 1); }
// once a second: start what can be started, drop what never can
export function tickMeridian(s: State, t = Date.now()) { const out: { kind: string; text: string }[] = []; const a = s as any; if (!a.meridian || !level(s)) return out; const M = mer(s);
  while (M.rq.length) { const id = M.rq[0]; if (s.tech[id] || !TECH[id]) { M.rq.shift(); continue; } if (slotsBusy(s) >= slotsTotal(s)) break; const c = canResearch(s, id); if (!c.ok) break; startResearch(s, id, t); M.rq.shift(); out.push({ kind: 'meridian', text: `Meridian started research: ${TECH[id].name}` }); }
  while (M.uq.length) { const o = M.uq[0]; const it = itemOf(s, o.base, o.id); if (!it || it.lvl >= BUILDINGS[it.b].max) { M.uq.shift(); if (it) out.push({ kind: 'meridian', text: `Meridian dropped an order: ${BUILDINGS[it.b].name} is at its maximum level` }); continue; }
    if (s.jobs.some((j) => j.item === o.id)) break; const c = canUpgrade(s, o.base, o.id); if (!c.ok) break; startUpgrade(s, o.base, o.id, t); M.uq.shift(); out.push({ kind: 'meridian', text: `Meridian started: ${BUILDINGS[it.b].name} → level ${it.lvl + 1}${o.base !== 'earth' ? ` (${s.bases[o.base]?.name || o.base})` : ''}` }); }
  return out; }
// food logistics follow Meridian's level
logistics.level = (s) => { const n = level(s); return n >= 2 ? n - 1 : 0; };
