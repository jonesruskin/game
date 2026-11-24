// The daily loop: a 28-day calendar that grows (a missed day pauses it, never resets it), three daily missions
// and a bonus chest, a supply drop every 4 hours, a free daily core spin, achievements and the offline report.
import { State } from './state';
import { rng, hash, round2 } from './util';
import { SPECIES, SPECIES_ORDER } from '../data/species';
import { RARITY_ORDER } from '../data/rarities';
import { addXp, give, itemsOf, events, ccLevel } from './game';
import { addCore, homeFor, discover, dexCount } from './crew';
import { uid } from './util';
export interface Mission { id: string; kind: string; n: number; reward: Record<string, number>; text: string; }
export interface Daily { day: number; cycle: number; last: string; streak: number; best: number; total: number; mDate: string; missions: Mission[]; mBase: Record<string, number>; mClaimed: boolean[]; bonus: boolean;
  drop: number; drops: number; dropAt: [number, number] | null; spin: string; adSpin: string; ach: Record<string, number>; }
export const dateKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const yesterday = (t = Date.now()) => dateKey(t - 86400000);
export function daily(s: State): Daily { const a = s as any; if (!a.daily) a.daily = { day: 0, cycle: 0, last: '', streak: 0, best: 0, total: 0, mDate: '', missions: [], mBase: {}, mClaimed: [], bonus: false, drop: Date.now() + 8 * 60000, drops: 0, dropAt: null, spin: '', adSpin: '', ach: {} }; return a.daily; }
const scale = (s: State) => 1 + s.lvl * 0.6;
// ---------------- the calendar ----------------
export const SPECIAL: Record<number, { core?: string; decor?: string; dm?: number; label: string }> = {
  2: { dm: 10, label: 'Dark Matter' }, 6: { core: 'advanced', label: 'Advanced core' }, 9: { dm: 20, label: 'Dark Matter' }, 13: { core: 'elite', label: 'Elite core' },
  16: { dm: 30, label: 'Dark Matter' }, 20: { decor: 'arch', label: 'Starlight Arch' }, 23: { dm: 40, label: 'Dark Matter' }, 27: { core: 'epic', label: 'Epic core' },
};
export function dayReward(s: State, day: number, cycle = daily(s).cycle) { const k = scale(s) * (1 + day * 0.07) * (1 + cycle * 0.5); const sp = SPECIAL[day];
  const base: Record<string, number> = day % 2 ? { cells: round2(60 * k) } : { credits: round2(250 * k) }; if (sp && sp.dm) base.dm = sp.dm + cycle * 10;
  const core = sp && sp.core ? RARITY_ORDER[Math.min(RARITY_ORDER.length - 1, RARITY_ORDER.indexOf(sp.core) + cycle)] : undefined; return { res: base, core, decor: sp && sp.decor, label: sp ? sp.label : '' }; }
export const canClaimDay = (s: State, now = Date.now()) => daily(s).last !== dateKey(now);
// a gift core of a rarity, leaning towards species you haven't found yet (that first-discovery moment)
export function giftSpecies(s: State, rarity: string, seed: number) { let all = SPECIES_ORDER.filter((k) => SPECIES[k].rarity === rarity);
  // before the Assembly Bay exists, a Standard gift should be one the player can house right away
  if (rarity === 'standard' && !itemsOf(s, 'assembly').some((i) => i.lvl > 0)) { const ok = all.filter((k) => homeFor(s, k)); if (ok.length) all = ok; } const fresh = all.filter((k) => !s.dex[k]); const pool = fresh.length && rng(seed)() < 0.75 ? fresh : all; return pool[Math.floor(rng(seed + 7)() * pool.length)]; }
export function giveCore(s: State, rarity: string, seed: number, now = Date.now()) { const sp = giftSpecies(s, rarity, seed); const asm = itemsOf(s, 'assembly')[0];
  if (asm && asm.lvl > 0) { addCore(s, sp, 'gift', now); return { sp, core: true }; }
  // no Assembly Bay yet: Standard gifts arrive at once (if there's room), rarer ones wait until it is built
  const home = rarity === 'standard' ? homeFor(s, sp) : null; if (home) { s.bots.push({ id: uid('b'), sp, lvl: 1, fed: 0, bay: home.id, born: now }); discover(s, sp, now); events.push({ kind: 'newBot', bot: s.bots[s.bots.length - 1].id }); return { sp, core: false }; }
  s.cores.push({ id: uid('c'), sp, from: 'gift', state: 'waiting', at: now }); return { sp, core: true }; }
export function claimDay(s: State, now = Date.now()) { const D = daily(s); if (!canClaimDay(s, now)) return null; const r = dayReward(s, D.day);
  give(s, r.res); let gift: any = null; if (r.core) gift = giveCore(s, r.core, hash(dateKey(now)) + D.total, now); if (r.decor) s.stats['decor_' + r.decor] = (s.stats['decor_' + r.decor] || 0) + 1;
  D.streak = D.last === yesterday(now) ? D.streak + 1 : 1; D.best = Math.max(D.best, D.streak); D.total++; D.last = dateKey(now); const day = D.day; D.day++; if (D.day >= 28) { D.day = 0; D.cycle++; }
  addXp(s, 20 + day * 2); return { ...r, day, gift }; }
// ---------------- daily missions ----------------
interface MDef { id: string; kind: string; n: (s: State) => number; text: (n: number) => string; need?: (s: State) => boolean; }
const MISSIONS: MDef[] = [
  { id: 'collect', kind: 'collects', n: () => 8, text: (n) => `Collect credits from your bays ${n} times` },
  { id: 'credits', kind: 'collected', n: (s) => round2(1500 * scale(s)), text: (n) => `Collect ${n.toLocaleString()} credits` },
  { id: 'harvest', kind: 'harvests', n: () => 3, text: (n) => `Harvest ${n} Fabricator recipes` },
  { id: 'feed', kind: 'feeds', n: () => 12, text: (n) => `Feed your bots ${n} times` },
  { id: 'craft', kind: 'crafts', n: () => 4, text: (n) => `Start ${n} Fabricator recipes` },
  { id: 'upgrade', kind: 'upgrades', n: () => 2, text: (n) => `Start ${n} upgrades` },
  { id: 'recruit', kind: 'recruits', n: () => 1, text: () => 'Recruit a bot from the shop' },
  { id: 'decor', kind: 'decor', n: () => 2, text: (n) => `Place ${n} decorations` },
  { id: 'fuse', kind: 'fusions', n: () => 1, text: () => 'Fuse two bots', need: (s) => itemsOf(s, 'fusion').some((i) => i.lvl > 0) },
  { id: 'boot', kind: 'boots', n: () => 1, text: () => 'Activate a core in the Assembly Bay', need: (s) => itemsOf(s, 'assembly').some((i) => i.lvl > 0) },
  { id: 'drop', kind: 'drops', n: () => 1, text: () => 'Open a supply drop' },
];
const MREWARD = (s: State, i: number): Record<string, number> => (i === 0 ? { credits: round2(500 * scale(s)) } : i === 1 ? { cells: round2(150 * scale(s)) } : { dm: 5 });
export function refreshMissions(s: State, now = Date.now()) { const D = daily(s), today = dateKey(now); if (D.mDate === today) return false;
  const R = rng(hash(today) ^ (s.created >>> 0)); const pool = MISSIONS.filter((m) => !m.need || m.need(s)); const pick: MDef[] = []; while (pick.length < 3 && pool.length) pick.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
  D.missions = pick.map((m, i) => { const n = m.n(s); return { id: m.id, kind: m.kind, n, text: m.text(n), reward: MREWARD(s, i) }; }); D.mBase = { ...s.stats }; D.mClaimed = [false, false, false]; D.bonus = false; D.mDate = today; return true; }
export const mProgress = (s: State, m: Mission) => Math.max(0, (s.stats[m.kind] || 0) - (daily(s).mBase[m.kind] || 0));
export function claimMission(s: State, i: number) { const D = daily(s), m = D.missions[i]; if (!m || D.mClaimed[i] || mProgress(s, m) < m.n) return null; D.mClaimed[i] = true; give(s, m.reward); addXp(s, 15); return m; }
export const bonusReady = (s: State) => { const D = daily(s); return D.missions.length === 3 && D.mClaimed.every(Boolean) && !D.bonus; };
export function claimBonus(s: State, now = Date.now()) { const D = daily(s); if (!bonusReady(s)) return null; D.bonus = true; const res = { dm: 10, cells: round2(250 * scale(s)) }; give(s, res);
  const r = rng(hash(D.mDate) + 3)(); const gift = r < 0.35 ? giveCore(s, r < 0.06 ? 'elite' : 'advanced', hash(D.mDate) + 11, now) : null; addXp(s, 30); return { res, gift }; }
// ---------------- supply drops ----------------
export const DROP_EVERY = 4 * 3600e3, DROP_MAX = 2;
export function tickDrops(s: State, now = Date.now()) { const D = daily(s); while (D.drops < DROP_MAX && now >= D.drop) { D.drops++; D.drop += DROP_EVERY; } if (D.drops >= DROP_MAX && D.drop < now) D.drop = now + DROP_EVERY; }
export function openDrop(s: State, now = Date.now()) { const D = daily(s); if (D.drops <= 0) return null; D.drops--; if (D.drops === DROP_MAX - 1 && D.drop - now > DROP_EVERY) D.drop = now + DROP_EVERY;
  const R = rng((now / 1000) >>> 0); const res: Record<string, number> = { credits: round2(350 * scale(s) * (0.7 + R() * 0.8)), cells: round2(90 * scale(s) * (0.7 + R() * 0.8)) }; if (R() < 0.35) res.dm = 2 + Math.floor(R() * 5);
  give(s, res); const cr = R(); const gift = cr < 0.12 ? giveCore(s, cr < 0.025 ? 'elite' : cr < 0.12 && ccLevel(s) >= 3 ? 'advanced' : 'standard', (now / 1000) >>> 0, now) : null; s.stats.drops = (s.stats.drops || 0) + 1; addXp(s, 10); return { res, gift }; }
// ---------------- the daily core spin ----------------
export const canSpin = (s: State, now = Date.now()) => daily(s).spin !== dateKey(now);
export function spin(s: State, ad = false, now = Date.now()) { const D = daily(s); if (!ad && !canSpin(s, now)) return null; if (ad && D.adSpin === dateKey(now)) return null;
  const R = rng(hash(dateKey(now) + (ad ? 'ad' : '')) ^ (s.created >>> 0)); const r = R(); const rarity = r < 0.04 ? 'elite' : r < 0.3 ? 'advanced' : 'standard';
  if (ad) D.adSpin = dateKey(now); else D.spin = dateKey(now); const gift = giveCore(s, rarity, (R() * 1e9) >>> 0, now); addXp(s, 10); return { rarity, ...gift }; }
// ---------------- achievements ----------------
export interface Ach { id: string; name: string; tiers: number[]; stat: (s: State) => number; unit: string; }
export const ACHS: Ach[] = [
  { id: 'collector', name: 'Credit Collector', tiers: [1e4, 2e5, 5e6, 1e8], stat: (s) => s.stats.collected || 0, unit: 'credits collected' },
  { id: 'crew', name: 'Crew Chief', tiers: [5, 12, 25, 50], stat: (s) => s.bots.length, unit: 'bots' },
  { id: 'dex', name: 'Botanist of Bots', tiers: [10, 25, 50, 82], stat: (s) => dexCount(s), unit: 'species discovered' },
  { id: 'fuser', name: 'Fusion Pioneer', tiers: [1, 10, 50, 250], stat: (s) => s.stats.fusions || 0, unit: 'fusions' },
  { id: 'feeder', name: 'Snack Time', tiers: [50, 500, 5000, 50000], stat: (s) => s.stats.feeds || 0, unit: 'feedings' },
  { id: 'farmer', name: 'Power Farmer', tiers: [10, 100, 1000, 5000], stat: (s) => s.stats.harvests || 0, unit: 'harvests' },
  { id: 'builder', name: 'Master Builder', tiers: [3, 6, 10, 15], stat: (s) => ccLevel(s), unit: 'Command Center level' },
  { id: 'loyal', name: 'Loyal Commander', tiers: [3, 7, 28, 100], stat: (s) => daily(s).total, unit: 'days logged in' },
  { id: 'streak', name: 'On a Roll', tiers: [3, 7, 14, 30], stat: (s) => daily(s).best, unit: 'day streak' },
  { id: 'land', name: 'Land Baron', tiers: [1, 4, 8, 16], stat: (s) => s.landBought, unit: 'plots bought' },
  { id: 'decorator', name: 'Interior Designer', tiers: [5, 25, 75, 200], stat: (s) => s.stats.decor || 0, unit: 'decorations' },
  { id: 'veteran', name: 'Veteran', tiers: [5, 15, 30, 60], stat: (s) => s.lvl, unit: 'Commander level' },
  { id: 'hoarder', name: 'Supply Hoarder', tiers: [5, 30, 150, 600], stat: (s) => s.stats.drops || 0, unit: 'supply drops' },
];
export const ACH_DM = [5, 15, 40, 100];
export const achTier = (s: State, a: Ach) => daily(s).ach[a.id] || 0;
export const achReady = (s: State, a: Ach) => { const t = achTier(s, a); return t < a.tiers.length && a.stat(s) >= a.tiers[t]; };
export function claimAch(s: State, id: string) { const a = ACHS.find((x) => x.id === id); if (!a || !achReady(s, a)) return null; const t = achTier(s, a); daily(s).ach[id] = t + 1; s.res.dm += ACH_DM[t]; addXp(s, 25 * (t + 1)); return { a, tier: t, dm: ACH_DM[t] }; }
// ---------------- what deserves a red dot ----------------
export function attention(s: State, now = Date.now()) { const D = daily(s); return { day: canClaimDay(s, now), missions: D.missions.some((m, i) => !D.mClaimed[i] && mProgress(s, m) >= m.n) || bonusReady(s), ach: ACHS.some((a) => achReady(s, a)), spin: canSpin(s, now), drop: D.drops > 0 }; }
