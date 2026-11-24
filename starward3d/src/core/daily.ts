// The daily loop (ported from v1 and rebuilt for v2): a 28-day calendar that grows (a missed day pauses it, never
// resets it), three daily missions and a bonus chest, a supply capsule every 4 hours, a free daily core spin,
// achievements, and a weekly themed event whose last milestone is an exclusive robot. Every reward is scaled to the
// empire's real hourly income, so a calendar day is as welcome in year one as on day one.
import { State } from './state';
import { rng, hash, round2 } from './util';
import { give, rates, hqLevel } from './econ';
import * as RB from './robots';
import { RARITY_ORDER } from '../data/rarities';
import { sol, terraStage } from './solar';
import { TERRA } from '../data/solar';
export interface Mission { id: string; kind: string; n: number; reward: Record<string, number>; text: string; }
export interface Daily { day: number; cycle: number; last: string; streak: number; best: number; total: number; mDate: string; missions: Mission[]; mBase: Record<string, number>; mClaimed: boolean[]; bonus: boolean;
  drop: number; drops: number; spin: string; adSpin: string; ach: Record<string, number>; ev: { week: number; pts: number; base: number; claimed: number[] }; }
export const dateKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const yesterday = (t = Date.now()) => dateKey(t - 86400000);
export function daily(s: State): Daily { const a = s as any; if (!a.daily) a.daily = { day: 0, cycle: 0, last: '', streak: 0, best: 0, total: 0, mDate: '', missions: [], mBase: {}, mClaimed: [], bonus: false, drop: Date.now() + 10 * 60000, drops: 0, spin: '', adSpin: '', ach: {}, ev: { week: -1, pts: 0, base: 0, claimed: [] } }; return a.daily; }
// rewards in hours of the empire's real income (with a floor for the first minutes of play)
export function income(s: State, hours: number) { const R = rates(s); const per = (r: string, floor: number) => round2(Math.max(floor, ((R.prod[r] || 0) + (R.collect[r] || 0)) * hours));
  return { credits: per('credits', 300 * hours), metal: per('metal', 250 * hours), fuel: per('fuel', 60 * hours), science: per('science', 30 * hours), cells: round2(Math.max(40 * hours, ((R.prod.cells || 0) * hours) || (20 + hqLevel(s) * 18) * hours)) }; }
const pick = (o: Record<string, number>, ...k: string[]) => Object.fromEntries(k.map((x) => [x, o[x]]));
// a gift core of a rarity, leaning toward species you haven't found yet (that first-discovery moment)
export function giftCore(s: State, rarity: string, seed: number) { const ri = Math.max(0, RARITY_ORDER.indexOf(rarity)); const all = RB.pool(ri); const R = RB.rb(s); const fresh = all.filter((k) => !R.dex[k]);
  const r = rng(seed); const list = fresh.length && r() < 0.75 ? fresh : all; const sp = list[Math.floor(r() * list.length)]; RB.giveCore(s, sp, 'gift'); return sp; }
export function giftSpecies(s: State, sp: string) { RB.giveCore(s, sp, 'event'); return sp; }
// ---------------- the calendar ----------------
export const SPECIAL: Record<number, { core?: string; dm?: number; label: string }> = {
  2: { dm: 10, label: 'Dark Matter' }, 6: { core: 'advanced', label: 'Advanced core' }, 9: { dm: 20, label: 'Dark Matter' }, 13: { core: 'elite', label: 'Elite core' },
  16: { dm: 30, label: 'Dark Matter' }, 20: { core: 'advanced', label: 'Advanced core' }, 23: { dm: 40, label: 'Dark Matter' }, 27: { core: 'epic', label: 'Epic core' },
};
export function dayReward(s: State, day: number, cycle = daily(s).cycle) { const k = (1 + day * 0.04) * (1 + cycle * 0.25); const inc = income(s, 1.5 * k); const sp = SPECIAL[day];
  const res: Record<string, number> = day % 3 === 0 ? pick(inc, 'credits') : day % 3 === 1 ? pick(inc, 'metal', 'fuel') : pick(inc, 'cells'); if (sp && sp.dm) res.dm = sp.dm + cycle * 10;
  const core = sp && sp.core ? RARITY_ORDER[Math.min(RARITY_ORDER.length - 1, RARITY_ORDER.indexOf(sp.core) + cycle)] : undefined; return { res, core, label: sp ? sp.label : '' }; }
export const canClaimDay = (s: State, now = Date.now()) => daily(s).last !== dateKey(now);
export function claimDay(s: State, now = Date.now()) { const D = daily(s); if (!canClaimDay(s, now)) return null; const r = dayReward(s, D.day);
  give(s, r.res); const gift = r.core ? giftCore(s, r.core, hash(dateKey(now)) + D.total) : null;
  D.streak = D.last === yesterday(now) ? D.streak + 1 : 1; D.best = Math.max(D.best, D.streak); D.total++; D.last = dateKey(now); const day = D.day; D.day++; if (D.day >= 28) { D.day = 0; D.cycle++; }
  return { ...r, day, gift }; }
// ---------------- daily missions ----------------
interface MDef { id: string; kind: string; n: (s: State) => number; text: (n: number) => string; need?: (s: State) => boolean; }
const has = (s: State, b: string) => Object.values(s.bases).some((B) => B.items.some((i) => i.b === b && i.lvl > 0));
const MISSIONS: MDef[] = [
  { id: 'collect', kind: 'collects', n: () => 10, text: (n) => `Collect from your buildings ${n} times` },
  { id: 'haul', kind: 'collected', n: (s) => { const i = income(s, 2); return round2(i.credits + i.metal + i.fuel); }, text: (n) => `Collect ${n.toLocaleString('en')} resources` },
  { id: 'upgrade', kind: 'upgradesStarted', n: () => 2, text: (n) => `Start ${n} upgrades` },
  { id: 'research', kind: 'researched', n: () => 1, text: () => 'Complete a research project' },
  { id: 'launch', kind: 'launches', n: () => 1, text: () => 'Fly a mission from Launch Control', need: (s) => has(s, 'launch') },
  { id: 'feed', kind: 'feeds', n: () => 4, text: (n) => `Level up your robots ${n} times`, need: (s) => RB.rb(s).list.length > 0 },
  { id: 'craft', kind: 'crafts', n: () => 1, text: () => 'Assemble a robot core in the Workshop', need: (s) => has(s, 'workshop') },
  { id: 'fuse', kind: 'fusions', n: () => 1, text: () => 'Fuse two robots', need: (s) => has(s, 'fusionlab') },
  { id: 'drop', kind: 'drops', n: () => 1, text: () => 'Open a supply capsule' },
  { id: 'voyage', kind: 'voyages', n: () => 1, text: () => 'Send a ship on a voyage', need: (s) => Object.values(sol(s).ships).some((n) => n > 0) },
  { id: 'war', kind: 'warWins', n: () => 2, text: (n) => `Win ${n} War Games`, need: (s) => has(s, 'warroom') },
];
const MREWARD = (s: State, i: number): Record<string, number> => (i === 0 ? pick(income(s, 1), 'credits') : i === 1 ? pick(income(s, 1), 'cells') : { dm: 5 });
export function refreshMissions(s: State, now = Date.now()) { const D = daily(s), today = dateKey(now); if (D.mDate === today) return false;
  const R = rng(hash(today) ^ (s.created >>> 0)); const pool = MISSIONS.filter((m) => !m.need || m.need(s)); const out: MDef[] = []; while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
  D.missions = out.map((m, i) => { const n = m.n(s); return { id: m.id, kind: m.kind, n, text: m.text(n), reward: MREWARD(s, i) }; }); D.mBase = { ...s.stats }; D.mClaimed = [false, false, false]; D.bonus = false; D.mDate = today; return true; }
export const mProgress = (s: State, m: Mission) => Math.max(0, (s.stats[m.kind] || 0) - (daily(s).mBase[m.kind] || 0));
export function claimMission(s: State, i: number) { const D = daily(s), m = D.missions[i]; if (!m || D.mClaimed[i] || mProgress(s, m) < m.n) return null; D.mClaimed[i] = true; give(s, m.reward); evGain(s, 1); return m; }
export const bonusReady = (s: State) => { const D = daily(s); return D.missions.length === 3 && D.mClaimed.every(Boolean) && !D.bonus; };
export function claimBonus(s: State) { const D = daily(s); if (!bonusReady(s)) return null; D.bonus = true; const res = { dm: 10, ...pick(income(s, 2), 'cells') }; give(s, res);
  const r = rng(hash(D.mDate) + 3)(); const gift = r < 0.4 ? giftCore(s, r < 0.06 ? 'elite' : 'advanced', hash(D.mDate) + 11) : null; evGain(s, 2); return { res, gift }; }
// ---------------- supply capsules ----------------
export const DROP_EVERY = 4 * 3600e3, DROP_MAX = 2;
export function tickDrops(s: State, now = Date.now()) { const D = daily(s); while (D.drops < DROP_MAX && now >= D.drop) { D.drops++; D.drop += DROP_EVERY; } if (D.drops >= DROP_MAX && D.drop < now) D.drop = now + DROP_EVERY; }
export function openDrop(s: State, now = Date.now()) { const D = daily(s); if (D.drops <= 0) return null; D.drops--; if (D.drops === DROP_MAX - 1 && D.drop - now > DROP_EVERY) D.drop = now + DROP_EVERY;
  const R = rng((now / 1000) >>> 0); const inc = income(s, 0.6 + R() * 0.5); const res: Record<string, number> = pick(inc, 'credits', 'metal', 'fuel'); if (R() < 0.5) res.cells = inc.cells; if (R() < 0.35) res.dm = 2 + Math.floor(R() * 5);
  give(s, res); const cr = R(); const gift = cr < 0.12 ? giftCore(s, cr < 0.02 ? 'elite' : cr < 0.06 ? 'advanced' : 'standard', (now / 1000) >>> 0) : null; s.stats.drops = (s.stats.drops || 0) + 1; return { res, gift }; }
// ---------------- the daily core spin: eight segments, the result is decided first and the wheel lands on it ----------------
export interface Seg { label: string; kind: 'core' | 'res'; rarity?: string; res?: string; hours?: number; w: number; col: string; }
export const SEGS: Seg[] = [
  { label: 'Standard core', kind: 'core', rarity: 'standard', w: 26, col: '#9aa6b8' }, { label: 'Credits', kind: 'res', res: 'credits', hours: 2, w: 16, col: '#ffd166' },
  { label: 'Advanced core', kind: 'core', rarity: 'advanced', w: 14, col: '#4fc3f7' }, { label: 'Power Cells', kind: 'res', res: 'cells', hours: 3, w: 14, col: '#7cf29a' },
  { label: 'Standard core', kind: 'core', rarity: 'standard', w: 14, col: '#9aa6b8' }, { label: 'Dark Matter', kind: 'res', res: 'dm', w: 8, col: '#c9b6ff' },
  { label: 'Advanced core', kind: 'core', rarity: 'advanced', w: 6, col: '#4fc3f7' }, { label: 'Elite core', kind: 'core', rarity: 'elite', w: 2, col: '#b892ff' },
];
export const canSpin = (s: State, now = Date.now()) => daily(s).spin !== dateKey(now);
export const canAdSpin = (s: State, now = Date.now()) => !canSpin(s, now) && daily(s).adSpin !== dateKey(now);
export function spin(s: State, ad = false, now = Date.now()) { const D = daily(s); if (ad ? !canAdSpin(s, now) : !canSpin(s, now)) return null;
  const R = rng(hash(dateKey(now) + (ad ? 'ad' : '')) ^ (s.created >>> 0)); const tot = SEGS.reduce((a, x) => a + x.w, 0); let r = R() * tot, idx = 0; for (; idx < SEGS.length - 1; idx++) { r -= SEGS[idx].w; if (r < 0) break; }
  const seg = SEGS[idx]; let sp: string | null = null; let res: Record<string, number> = {};
  if (seg.kind === 'core') sp = giftCore(s, seg.rarity!, (R() * 1e9) >>> 0); else if (seg.res === 'dm') res = { dm: 8 + Math.floor(R() * 8) }; else res = pick(income(s, seg.hours!), seg.res!);
  give(s, res); if (ad) D.adSpin = dateKey(now); else D.spin = dateKey(now); s.stats.spins = (s.stats.spins || 0) + 1; return { idx, seg, sp, res }; }
// ---------------- achievements ----------------
export interface Ach { id: string; name: string; tiers: number[]; stat: (s: State) => number; unit: string; }
export const ACHS: Ach[] = [
  { id: 'builder', name: 'Master Builder', tiers: [3, 6, 10, 15], stat: (s) => hqLevel(s), unit: 'Mission Control level' },
  { id: 'collector', name: 'Quartermaster', tiers: [5e4, 2e6, 1e8, 1e10], stat: (s) => s.stats.collected || 0, unit: 'resources collected' },
  { id: 'scholar', name: 'Scholar', tiers: [5, 20, 50, 100], stat: (s) => Object.keys(s.tech).length, unit: 'technologies' },
  { id: 'rocketeer', name: 'Rocketeer', tiers: [1, 10, 50, 250], stat: (s) => s.stats.launches || 0, unit: 'launches' },
  { id: 'crew', name: 'Robot Wrangler', tiers: [3, 10, 25, 50], stat: (s) => RB.rb(s).list.length, unit: 'robots' },
  { id: 'dex', name: 'Botdex Keeper', tiers: [5, 20, 50, 100], stat: (s) => RB.dexCount(s), unit: 'species discovered' },
  { id: 'fuser', name: 'Fusion Pioneer', tiers: [1, 10, 50, 250], stat: (s) => s.stats.fusions || 0, unit: 'fusions' },
  { id: 'settler', name: 'Settler', tiers: [1, 2, 4, 6], stat: (s) => Object.keys(s.bases).length - 1, unit: 'colonies' },
  { id: 'gardener', name: 'World Gardener', tiers: [1, 4, 8, 13], stat: (s) => Object.keys(TERRA).reduce((a, b) => a + terraStage(s, b), 0), unit: 'terraforming stages' },
  { id: 'navigator', name: 'Navigator', tiers: [1, 10, 50, 200], stat: (s) => sol(s).voyages || 0, unit: 'voyages' },
  { id: 'loyal', name: 'Loyal Commander', tiers: [3, 7, 28, 100], stat: (s) => daily(s).total, unit: 'days logged in' },
  { id: 'streak', name: 'On a Roll', tiers: [3, 7, 14, 30], stat: (s) => daily(s).best, unit: 'day streak' },
  { id: 'hoarder', name: 'Supply Hoarder', tiers: [5, 30, 150, 600], stat: (s) => s.stats.drops || 0, unit: 'supply capsules' },
  { id: 'warrior', name: 'War Games Ace', tiers: [10, 100, 500, 2000], stat: (s) => s.stats.warStars || 0, unit: 'stars won in War Games' },
  { id: 'defender', name: 'Iron Wall', tiers: [1, 10, 50, 200], stat: (s) => s.stats.defHeld || 0, unit: 'defences held' },
];
export const ACH_DM = [5, 15, 40, 100];
export const achTier = (s: State, a: Ach) => daily(s).ach[a.id] || 0;
export const achReady = (s: State, a: Ach) => { const t = achTier(s, a); return t < a.tiers.length && a.stat(s) >= a.tiers[t]; };
export function claimAch(s: State, id: string) { const a = ACHS.find((x) => x.id === id); if (!a || !achReady(s, a)) return null; const t = achTier(s, a); daily(s).ach[id] = t + 1; give(s, { dm: ACH_DM[t] }); return { a, tier: t, dm: ACH_DM[t] }; }
// ---------------- the weekly event: six themes in rotation, each with its own action and an exclusive robot ----------------
export interface Theme { id: string; name: string; robot: string; stat: string; action: string; blurb: string; col: string; }
export const THEMES: Theme[] = [
  { id: 'solstice', name: 'Solar Solstice', robot: 'solstice', stat: 'collects', action: 'collections', blurb: 'The Sun at its strongest: every collection counts toward the Solstice Seraph.', col: '#ffd166' },
  { id: 'cup', name: 'War Games Cup', robot: 'champion', stat: 'warWins', action: 'War Games wins', blurb: 'The Defence Council\'s grand tournament. Win simulations for the Arena Champion.', col: '#ff6b6b' },
  { id: 'deep', name: 'Deep Space Week', robot: 'voyager', stat: 'launches', action: 'launches', blurb: 'Every launch pad on Earth is busy. Fly missions for the Deep Voyager.', col: '#8ec0ff' },
  { id: 'fusion', name: 'Fusion Frenzy', robot: 'chimera', stat: 'feeds', action: 'robot level-ups', blurb: 'The Fusion Labs run day and night. Level up your robots for the Chimera Core.', col: '#ff8be8' },
  { id: 'garden', name: 'Garden Gala', robot: 'blossom', stat: 'collected', action: 'resources collected (per 10% of a day\'s income)', blurb: 'Greenhouses in bloom on every world. Bring in the harvest for the Blossom Sentinel.', col: '#7cf29a' },
  { id: 'forge', name: 'Forge Fest', robot: 'anvil', stat: 'upgradesStarted', action: 'upgrades started', blurb: 'Every builder drone at once. Start upgrades for the Anvil Titan.', col: '#ff9a3c' },
];
export const EV_MILESTONES = [4, 10, 18];
const WEEK = 7 * 86400000, EPOCH = Date.UTC(2026, 0, 5); // a Monday
export const weekOf = (t = Date.now()) => Math.floor((t - EPOCH) / WEEK);
export const themeOf = (t = Date.now()) => THEMES[((weekOf(t) % THEMES.length) + THEMES.length) % THEMES.length];
export const weekEnds = (t = Date.now()) => EPOCH + (weekOf(t) + 1) * WEEK;
function ev(s: State, now = Date.now()) { const E = daily(s).ev; const w = weekOf(now); if (E.week !== w) { E.week = w; E.pts = 0; E.claimed = []; E.base = s.stats[themeOf(now).stat] || 0; } return E; }
function evGain(s: State, n: number) { ev(s).pts += n; }
// theme actions add up to 10 points a week on top of mission points
export function evPoints(s: State, now = Date.now()) { const E = ev(s, now), T = themeOf(now); let a = (s.stats[T.stat] || 0) - E.base; if (T.stat === 'collected') a = a / Math.max(1, income(s, 2.4).credits); else if (T.stat === 'collects') a = a / 5; return E.pts + Math.min(10, Math.floor(Math.max(0, a))); }
export function evReward(s: State, i: number, now = Date.now()) { const T = themeOf(now); return i === 0 ? { res: pick(income(s, 3), 'cells') } : i === 1 ? { res: { dm: 25 }, core: 'advanced' } : { robot: T.robot }; }
export const evReady = (s: State, i: number, now = Date.now()) => !ev(s, now).claimed.includes(i) && evPoints(s, now) >= EV_MILESTONES[i];
export function claimEv(s: State, i: number, now = Date.now()) { if (!evReady(s, i, now)) return null; const E = ev(s, now); E.claimed.push(i); const r = evReward(s, i, now); if (r.res) give(s, r.res); let sp: string | null = null;
  if (r.core) sp = giftCore(s, r.core, hash('ev' + E.week)); if (r.robot) sp = giftSpecies(s, r.robot); return { ...r, sp }; }
// ---------------- what deserves a red dot ----------------
export function attention(s: State, now = Date.now()) { const D = daily(s); return { day: canClaimDay(s, now), missions: D.missions.some((m, i) => !D.mClaimed[i] && mProgress(s, m) >= m.n) || bonusReady(s), ach: ACHS.some((a) => achReady(s, a)), spin: canSpin(s, now), drop: D.drops > 0, ev: [0, 1, 2].some((i) => evReady(s, i, now)) }; }
export const anyAttention = (s: State, now = Date.now()) => { const a = attention(s, now); return a.day || a.missions || a.ach || a.spin || a.ev; };
