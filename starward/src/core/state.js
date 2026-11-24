import { allSteps } from '../data/objectives.js';
// STARWARD: the save. Versioned so years-long saves can be migrated forward safely.
export const SAVE_KEY = 'starward_save_v1';
export const VERSION = 1;
export function fresh(t = Date.now()) {
  return {
    v: VERSION, created: t, last: t, seq: 1,
    res: { credits: 1500, metal: 1800, fuel: 300, science: 60, dm: 30 },
    bases: {
      earth: { body: 'earth', name: 'Cape Horizon', lots: { hq: { b: 'hq', lvl: 1 }, L0: { b: 'mine', lvl: 1 }, L1: { b: 'solar', lvl: 1 }, L2: { b: 'office', lvl: 1 }, L3: { b: 'depot', lvl: 1 } } },
    },
    jobs: [], tech: {}, flags: {}, space: { rockets: {}, sats: [], modules: {}, flights: 0, fails: 0, done: {} }, solar: { surveyed: {}, sites: {}, ships: {}, terra: {}, voyages: 0, story: {} }, stars: { surveyed: {}, colonies: {}, ships: {}, mega: {}, gates: {}, story: {} }, aliens: { known: {}, xt: {}, ruins: 0, minors: {}, codex: [], seen: {} }, war: { ships: {}, def: {}, raids: [], log: [], hives: {}, next: 0, fleetAt: 'home', raidsSeen: 0, blockade: {} },
    obj: { i: 0, claimed: {} },
    stats: { built: 0, upgrades: 0, researched: 0, dmSpent: 0, playS: 0, sessions: 0, rocketsBuilt: 0 },
    log: [], settings: { sfx: 0.7, music: 0.45, quality: 'auto', dayNight: 'auto' }, tut: 0, adSkips: { day: 0, n: 0 },
  };
}
export function migrate(s) {
  const f = fresh(s.created || Date.now());
  for (const k in f) if (s[k] === undefined) s[k] = f[k];
  for (const k in f.stats) if (s.stats[k] === undefined) s.stats[k] = f.stats[k];
  for (const k in f.settings) if (s.settings[k] === undefined) s.settings[k] = f.settings[k];
  for (const id in s.bases) if (id !== 'earth' && s.bases[id].pop === undefined) s.bases[id].pop = 16; // colonists arrived with Part 3
  // objectives are tracked by id: resume at the first step not yet claimed (steps can be reordered between versions)
  const steps = allSteps(); const i = steps.findIndex((st) => !s.obj.claimed[st.id]); s.obj.i = i < 0 ? steps.length : i;
  s.v = VERSION; return s;
}
export function load(storage) {
  let raw = null; try { raw = storage.get(SAVE_KEY); } catch (e) {}
  if (!raw) try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
  let s = null; try { s = raw ? JSON.parse(raw) : null; } catch (e) {}
  return s && s.v ? migrate(s) : fresh();
}
export function save(storage, s) { try { const j = JSON.stringify(s); storage.set(SAVE_KEY, j); try { localStorage.setItem(SAVE_KEY, j); } catch (e) {} } catch (e) {} }
export const uid = (s) => 'j' + (s.seq++).toString(36);
