// Limited-time events: one themed event every week (rotating from a calendar, so it works offline and needs no
// server). Everything you do earns event tokens, and the event's featured actions earn triple; tokens climb an
// eight-step milestone track that ends with an exclusive bot. Pure rules.
import { State } from './state';
import { round2 } from './util';
import { give, addXp } from './game';
import { giveSpecies, giveCore } from './daily';
export interface EventDef { id: string; name: string; tagline: string; color: string; icon: string; featured: string[]; bot: string; decor?: string; }
// what each action is worth in tokens (featured actions are worth 3x during their event)
export const TOKEN_VALUE: Record<string, [number, string]> = { collects: [2, 'collect from a bay'], harvests: [6, 'harvest a recipe'], feeds: [1, 'feed a bot'], fusions: [30, 'fuse two bots'], boots: [15, 'activate a core'],
  arenaWins: [20, 'win an Arena battle'], expeditions: [25, 'complete an expedition'], decor: [3, 'place a decoration'], drops: [10, 'open a supply drop'], raidsWon: [40, 'repel a Swarm raid'], upgrades: [8, 'start an upgrade'] };
export const EVENTS: EventDef[] = [
  { id: 'solstice', name: 'Solar Solstice', tagline: 'The Sun is at its brightest: every solar panel sings.', color: '#ffb23e', icon: '☀', featured: ['collects', 'harvests'], bot: 'solstice' },
  { id: 'cup', name: 'Arena Cup', tagline: 'Rival colonies gather in orbit for the season\'s grand tournament.', color: '#ff5a6a', icon: '🏆', featured: ['arenaWins', 'raidsWon'], bot: 'champion' },
  { id: 'deep', name: 'Deep Space Week', tagline: 'Launch windows are wide open. Fill the sky with rockets.', color: '#4aa8ff', icon: '🚀', featured: ['expeditions', 'drops'], bot: 'voyager' },
  { id: 'fusion', name: 'Fusion Frenzy', tagline: 'The Fusion Lab hums day and night. Strange new cores appear.', color: '#b06dff', icon: '🧬', featured: ['fusions', 'boots'], bot: 'chimera' },
  { id: 'garden', name: 'Garden Gala', tagline: 'The colony blooms. Decorate, feed and grow.', color: '#4fcf5a', icon: '🌸', featured: ['decor', 'feeds'], bot: 'blossom' },
  { id: 'forge', name: 'Forge Fest', tagline: 'Builder drones work double shifts. Raise the skyline.', color: '#ff7a1a', icon: '🔨', featured: ['upgrades', 'harvests'], bot: 'anvil' },
];
export const MILESTONES = [60, 150, 300, 500, 800, 1200, 1700, 2400];
const WEEK = 7 * 86400e3, EPOCH = Date.UTC(2026, 0, 5); // a Monday
export function currentEvent(now = Date.now()) { const n = Math.floor((now - EPOCH) / WEEK); const def = EVENTS[((n % EVENTS.length) + EVENTS.length) % EVENTS.length]; return { def, week: n, start: EPOCH + n * WEEK, end: EPOCH + (n + 1) * WEEK }; }
export interface EventState { week: number; base: Record<string, number>; claimed: number[]; }
export function eventState(s: State, now = Date.now()) { const a = s as any; const ev = currentEvent(now); if (!a.event || a.event.week !== ev.week) a.event = { week: ev.week, base: { ...s.stats }, claimed: [] }; return a.event as EventState; }
export function tokens(s: State, now = Date.now()) { const ev = currentEvent(now), E = eventState(s, now); let t = 0;
  for (const [k, [v]] of Object.entries(TOKEN_VALUE)) t += Math.max(0, (s.stats[k] || 0) - (E.base[k] || 0)) * v * (ev.def.featured.includes(k) ? 3 : 1); return t; }
export function milestoneReward(s: State, i: number, def: EventDef) { const k = 1 + s.lvl * 0.4;
  if (i === MILESTONES.length - 1) return { label: 'Exclusive bot', bot: def.bot };
  if (i === 3) return { label: 'Elite core', core: 'elite' }; if (i === 5) return { label: 'Epic core', core: 'epic' };
  return { label: i % 2 ? 'Dark Matter' : 'Supplies', res: i % 2 ? { dm: 10 + i * 5 } : { credits: round2(1500 * k * (1 + i)), cells: round2(400 * k * (1 + i)) } }; }
export function claimMilestone(s: State, i: number, now = Date.now()) { const ev = currentEvent(now), E = eventState(s, now); if (E.claimed.includes(i) || tokens(s, now) < MILESTONES[i]) return null;
  const r = milestoneReward(s, i, ev.def) as any; E.claimed.push(i); let gift = null; if (r.res) give(s, r.res); if (r.core) gift = giveCore(s, r.core, ev.week * 31 + i, now); if (r.bot) gift = giveSpecies(s, r.bot, now); addXp(s, 30 + i * 10); s.stats.eventSteps = (s.stats.eventSteps || 0) + 1; return { r, gift }; }
export const eventDot = (s: State, now = Date.now()) => { const E = eventState(s, now), t = tokens(s, now); return MILESTONES.some((m, i) => t >= m && !E.claimed.includes(i)); };
