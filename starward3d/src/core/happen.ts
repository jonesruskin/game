// Happenings: small surprises at the programme, one at a time, every 20 to 40 minutes, and one waiting whenever you
// come back. A trade barge with a good rate, a rich seam, a visiting drone crew, volunteers for a night shift, a guest
// lecturer, a lost cargo pod. Each offer lasts half an hour; take it or let it pass. Bonuses ride on the existing
// modifier hooks, so nothing underneath changes.
import { State } from './state';
import { modHooks, canPay, pay, give, hqLevel } from './econ';
import { income } from './daily';
import { rng, round2 } from './util';
export type HapKind = 'barge' | 'seam' | 'crew' | 'night' | 'lecture' | 'cache';
export interface Hap { kind: HapKind; seed: number; at: number; ends: number; r?: string; give?: Record<string, number>; get?: Record<string, number>; }
export interface Boost { kind: HapKind; until: number; r?: string }
export interface Haps { next: number; cur: Hap | null; act: Boost[]; n: number; took: number }
export const OFFER_MIN = 30, GAP: [number, number] = [20, 40], FIRST_MIN = 6;
export const LAST: Partial<Record<HapKind, number>> = { seam: 15, crew: 30, lecture: 30 }; // minutes the bonus runs
export const NIGHT_CUT = 0.15, NIGHT_MAX = 45 * 60e3, LECTURE = 0.25;
export const hp = (s: State): Haps => { const a = s as any; if (!a.hap) a.hap = { next: Date.now() + FIRST_MIN * 60e3, cur: null, act: [], n: 0, took: 0 }; return a.hap; };
const SEAM: Record<string, [string, string]> = { metal: ['Rich seam', 'The miners hit a rich vein'], fuel: ['Gas pocket', 'The refinery tapped a pressurised pocket'], credits: ['Investor visit', 'Investors are touring the spaceport'], science: ['Clear skies', 'Perfect observing conditions tonight'] };
export const INFO: Record<HapKind, { icon: string; name: (h: Hap | Boost) => string }> = {
  barge: { icon: '🛸', name: () => 'Trade barge' }, seam: { icon: '⛏', name: (h) => SEAM[h.r || 'metal']?.[0] || 'Rich seam' }, crew: { icon: '👷', name: () => 'Visiting crew' },
  night: { icon: '🌙', name: () => 'Night shift' }, lecture: { icon: '🎓', name: () => 'Guest lecturer' }, cache: { icon: '📦', name: () => 'Lost cargo pod' } };
export const seamLine = (r: string) => SEAM[r]?.[1] || '';
const RES4 = ['credits', 'metal', 'fuel', 'science'];
const nightJobs = (s: State, now: number) => s.jobs.filter((j) => (j.kind === 'build' || j.kind === 'research') && j.end - now > 5 * 60e3);
// what could happen now (only offers that make sense for this programme)
function candidates(s: State, now: number): [HapKind, number][] { const out: [HapKind, number][] = [['cache', 2]]; const L = hqLevel(s);
  if (L >= 2) out.push(['barge', 3], ['seam', 2]); if (L >= 3) out.push(['crew', 2]); if (nightJobs(s, now).length) out.push(['night', 2]);
  if (s.bases.earth.items.some((i) => i.b === 'research' && i.lvl > 0)) out.push(['lecture', 1.5]); return out; }
export function roll(s: State, now = Date.now()): Hap | null { const H = hp(s), r = rng(H.n * 7919 + (s.created % 100000)); const C = candidates(s, now); const tot = C.reduce((a, [, w]) => a + w, 0); let x = r() * tot; let kind: HapKind = 'cache';
  for (const [k, w] of C) { x -= w; if (x <= 0) { kind = k; break; } } const inc = income(s, 1) as Record<string, number>; const h: Hap = { kind, seed: H.n, at: now, ends: now + OFFER_MIN * 60e3 };
  if (kind === 'barge') { // offer the most-hoarded resource for the scarcest, at 1.6 times the going rate
    const ratio = (k: string) => (s.res[k] || 0) / Math.max(1, inc[k] || 1); const by = RES4.filter((k) => (s.res[k] || 0) > (inc[k] || 0) * 0.5).sort((a, b) => ratio(b) - ratio(a)); const A = by[0]; const B = RES4.filter((k) => k !== A).sort((a, b) => ratio(a) - ratio(b))[0];
    if (!A || !B) h.kind = 'cache'; else { const g = round2(Math.min((s.res[A] || 0) * 0.4, (inc[A] || 1) * 2)); h.give = { [A]: g }; h.get = { [B]: round2((g / Math.max(1, inc[A] || 1)) * (inc[B] || 1) * 1.6) }; } }
  if (kind === 'seam') { const has = RES4.filter((k) => (inc[k] || 0) > 0); h.r = has[Math.floor(r() * has.length)] || 'metal'; }
  if (h.kind === 'cache') { const k2 = ['metal', 'fuel', 'science'][Math.floor(r() * 3)]; h.get = { credits: round2(inc.credits * 0.4), [k2]: round2((inc[k2] || 100) * 0.4), dm: H.n % 3 === 2 ? 2 : 1 }; }
  if (kind === 'night') h.ends = now + 20 * 60e3;
  return h; }
export interface HapNote { kind: 'hap' | 'hapEnd'; h: Hap | Boost }
export function tickHappen(s: State, now = Date.now()): HapNote[] { const H = hp(s), out: HapNote[] = []; if (s.tut < 99) return out;
  for (const b of H.act) if (b.until <= now) out.push({ kind: 'hapEnd', h: b }); H.act = H.act.filter((b) => b.until > now);
  if (H.cur && H.cur.ends <= now) H.cur = null; // an offer nobody took drifts away
  if (H.cur && H.cur.kind === 'night' && !nightJobs(s, now).length) H.cur = null;
  if (!H.cur && now >= H.next) { const h = roll(s, now); H.n++; const r = rng(H.n * 31 + 7); H.next = now + (GAP[0] + r() * (GAP[1] - GAP[0])) * 60e3; if (h) { H.cur = h; out.push({ kind: 'hap', h }); } }
  return out; }
export function accept(s: State, now = Date.now()): { ok: boolean; why?: string; h?: Hap } { const H = hp(s), h = H.cur; if (!h) return { ok: false, why: 'It has gone' };
  if (h.kind === 'barge') { if (!canPay(s, h.give!)) return { ok: false, why: 'Not enough to trade' }; pay(s, h.give!); give(s, h.get!); }
  else if (h.kind === 'cache') give(s, h.get!);
  else if (h.kind === 'night') { for (const j of nightJobs(s, now)) j.end -= Math.min(NIGHT_MAX, (j.end - now) * NIGHT_CUT); }
  else H.act.push({ kind: h.kind, until: now + (LAST[h.kind] || 15) * 60e3, r: h.r });
  H.cur = null; H.took++; return { ok: true, h }; }
export function decline(s: State) { hp(s).cur = null; }
export const boostOn = (s: State, k: HapKind, now = Date.now()) => hp(s).act.find((b) => b.kind === k && b.until > now);
// the bonuses, while they run: double output of one resource, one more drone, faster research for anything started now
modHooks.push((s, m) => { const H = (s as any).hap as Haps | undefined; if (!H || !H.act.length) return; const now = Date.now();
  for (const b of H.act) { if (b.until <= now) continue; if (b.kind === 'seam' && b.r) m.mult[b.r] = (m.mult[b.r] || 0) + 1; if (b.kind === 'crew') m.crews += 1; if (b.kind === 'lecture') m.researchTime += LECTURE; } });
