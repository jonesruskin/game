// The Arena: 3v3 turn-based battles between crews. Every element grants a signature move; effectiveness follows the
// element chart. Leagues and weekly seasons, battle tickets that recharge, and rival colonies to fight. Pure rules.
import { State, BotRec } from './state';
import { rng, hash, round2 } from './util';
import { SPECIES, SPECIES_ORDER, Chassis } from '../data/species';
import { ELEMENTS } from '../data/elements';
import { RARITY_ORDER } from '../data/rarities';
import { botPower } from './crew';
import { addXp, give, itemsOf } from './game';
// ---------------- moves ----------------
export interface Move { name: string; el: string; power: number; fx?: 'burn' | 'freeze' | 'shield' | 'heal' | 'drain' | 'pierce' | 'weaken' | 'first' | 'reckless' | 'crush' | 'stun'; chance?: number; desc: string; }
export const MOVES: Record<string, Move> = {
  strike:  { name: 'Strike', el: 'none', power: 0.8, desc: 'A plain, honest hit.' },
  solar:   { name: 'Sunburst', el: 'solar', power: 1.0, fx: 'drain', desc: 'Heals for a third of the damage dealt.' },
  plasma:  { name: 'Plasma Torch', el: 'plasma', power: 1.2, fx: 'burn', chance: 0.4, desc: 'May set the target burning.' },
  hydro:   { name: 'Tidal Jet', el: 'hydro', power: 1.15, desc: 'A crushing jet of water.' },
  cryo:    { name: 'Cryo Lance', el: 'cryo', power: 1.0, fx: 'freeze', chance: 0.3, desc: 'May freeze the target for a turn.' },
  geo:     { name: 'Rockslide', el: 'geo', power: 1.25, desc: 'Heavy and hard to argue with.' },
  bio:     { name: 'Overgrowth', el: 'bio', power: 0.75, fx: 'heal', desc: 'Strikes, then restores 18% of its hull.' },
  volt:    { name: 'Arc Discharge', el: 'volt', power: 1.1, fx: 'stun', chance: 0.2, desc: 'May short-circuit the target.' },
  alloy:   { name: 'Plate Up', el: 'alloy', power: 0.6, fx: 'shield', desc: 'Hits, then halves the next blow it takes.' },
  void:    { name: 'Null Pulse', el: 'void', power: 1.25, desc: 'A wave of absolute nothing.' },
  photon:  { name: 'Prism Laser', el: 'photon', power: 1.1, fx: 'pierce', desc: 'Cuts straight through shields.' },
  kinetic: { name: 'Mass Driver', el: 'kinetic', power: 1.45, fx: 'reckless', chance: 0.2, desc: 'Devastating, but misses one shot in five.' },
  aero:    { name: 'Cyclone', el: 'aero', power: 1.0, fx: 'first', desc: 'Always strikes first.' },
  gravity: { name: 'Crush', el: 'gravity', power: 1.0, fx: 'crush', desc: 'Hits harder the healthier the target is.' },
  chrono:  { name: 'Rewind', el: 'chrono', power: 0.7, fx: 'heal', desc: 'Strikes, then winds back 18% of its damage.' },
  neural:  { name: 'Overload', el: 'neural', power: 1.0, fx: 'weaken', desc: 'Lowers the target\'s attack by 20%.' },
};
export const movesOf = (sp: string) => [...SPECIES[sp].el.filter((e) => MOVES[e]).map((e) => e), 'strike'];
export function effectiveness(moveEl: string, def: string[]) { if (moveEl === 'none') return 1; const strong = def.some((d) => ELEMENTS[moveEl].strong.includes(d)); const weak = def.some((d) => (ELEMENTS[d].strong || []).includes(moveEl)); return strong && !weak ? 1.35 : weak && !strong ? 0.8 : 1; }
const SPD: Record<Chassis, number> = { drone: 14, orb: 12, android: 11, rover: 10, crawler: 9, walker: 8, mech: 6 };
export interface Fighter { sp: string; lvl: number; name: string; hp: number; max: number; atk: number; spd: number; shield: boolean; burn: number; frozen: boolean; weak: number; bot?: string; }
export function fighter(sp: string, lvl: number, name?: string, bot?: string): Fighter { const p = botPower({ sp, lvl } as BotRec); return { sp, lvl, name: name || SPECIES[sp].name, hp: p.hp, max: p.hp, atk: Math.round(p.atk * 1.6), spd: SPD[SPECIES[sp].chassis] + lvl * 0.25 + RARITY_ORDER.indexOf(SPECIES[sp].rarity), shield: false, burn: 0, frozen: false, weak: 0, bot }; }
export const teamPower = (t: { sp: string; lvl: number }[]) => Math.round(t.reduce((a, f) => { const p = botPower({ sp: f.sp, lvl: f.lvl } as BotRec); return a + Math.sqrt(p.hp * p.atk); }, 0));
// ---------------- one battle ----------------
export interface Battle { A: Fighter[]; B: Fighter[]; a: number; b: number; turn: number; seed: number; over: '' | 'A' | 'B'; }
export interface Hit { side: 'A' | 'B'; who: number; target: number; move: string; dmg: number; eff: number; crit: boolean; miss: boolean; heal: number; status: string; ko: boolean; }
export function newBattle(A: Fighter[], B: Fighter[], seed: number): Battle { return { A, B, a: 0, b: 0, turn: 0, seed, over: '' }; }
const R = (bt: Battle) => rng(bt.seed + bt.turn * 7919)();
function strike(bt: Battle, side: 'A' | 'B', mk: string, rnd: () => number): Hit { const me = side === 'A' ? bt.A[bt.a] : bt.B[bt.b], foe = side === 'A' ? bt.B[bt.b] : bt.A[bt.a]; const mv = MOVES[mk];
  const h: Hit = { side, who: side === 'A' ? bt.a : bt.b, target: side === 'A' ? bt.b : bt.a, move: mk, dmg: 0, eff: 1, crit: false, miss: false, heal: 0, status: '', ko: false };
  if (me.frozen) { me.frozen = false; h.status = 'frozen'; h.miss = true; return h; }
  if (mv.fx === 'reckless' && rnd() < (mv.chance || 0)) { h.miss = true; return h; }
  h.eff = effectiveness(mv.el, SPECIES[foe.sp].el); h.crit = rnd() < 0.1; let dmg = me.atk * (1 - me.weak) * mv.power * h.eff * (0.9 + rnd() * 0.2) * (h.crit ? 1.5 : 1);
  if (mv.fx === 'crush') dmg *= 0.7 + 0.6 * (foe.hp / foe.max); if (foe.shield && mv.fx !== 'pierce') { dmg *= 0.5; foe.shield = false; h.status = 'shielded'; }
  h.dmg = Math.max(1, Math.round(dmg)); foe.hp = Math.max(0, foe.hp - h.dmg);
  if (mv.fx === 'drain') { h.heal = Math.round(h.dmg / 3); me.hp = Math.min(me.max, me.hp + h.heal); }
  if (mv.fx === 'heal') { h.heal = Math.round(me.max * 0.18); me.hp = Math.min(me.max, me.hp + h.heal); }
  if (mv.fx === 'shield') me.shield = true;
  if (mv.fx === 'weaken') { foe.weak = Math.min(0.5, foe.weak + 0.2); h.status = 'weakened'; }
  if ((mv.fx === 'burn' || mv.fx === 'freeze' || mv.fx === 'stun') && foe.hp > 0 && rnd() < (mv.chance || 0)) { if (mv.fx === 'burn') { foe.burn = 3; h.status = 'burning'; } else { foe.frozen = true; h.status = mv.fx === 'freeze' ? 'frozen solid' : 'stunned'; } }
  h.ko = foe.hp <= 0; return h; }
// the AI: the move with the best expected damage (healing when hurt)
export function aiMove(bt: Battle, side: 'A' | 'B') { const me = side === 'A' ? bt.A[bt.a] : bt.B[bt.b], foe = side === 'A' ? bt.B[bt.b] : bt.A[bt.a]; let best = 'strike', bv = -1;
  for (const mk of movesOf(me.sp)) { const mv = MOVES[mk]; let v = mv.power * effectiveness(mv.el, SPECIES[foe.sp].el) * (mv.fx === 'reckless' ? 0.8 : 1);
    if ((mv.fx === 'heal' || mv.fx === 'drain') && me.hp < me.max * 0.45) v *= 1.6; if (mv.fx === 'shield' && !me.shield && me.hp < me.max * 0.6) v += 0.5; if (mv.fx === 'weaken' && foe.weak < 0.2) v += 0.2; if (v > bv) { bv = v; best = mk; } }
  return best; }
// one round: both sides act in speed order (Cyclone always first); burns tick; knocked-out bots are replaced
export function round(bt: Battle, mA: string, mB: string): Hit[] { if (bt.over) return []; const rnd = rng(bt.seed + ++bt.turn * 104729); const out: Hit[] = [];
  const fa = bt.A[bt.a], fb = bt.B[bt.b]; const pa = (MOVES[mA].fx === 'first' ? 100 : 0) + fa.spd, pb = (MOVES[mB].fx === 'first' ? 100 : 0) + fb.spd;
  const order: ['A' | 'B', string][] = pa > pb || (pa === pb && rnd() < 0.5) ? [['A', mA], ['B', mB]] : [['B', mB], ['A', mA]];
  for (const [side, mk] of order) { const me = side === 'A' ? bt.A[bt.a] : bt.B[bt.b]; if (me.hp <= 0) continue; const foe = side === 'A' ? bt.B[bt.b] : bt.A[bt.a]; if (foe.hp <= 0) continue; out.push(strike(bt, side, mk, rnd)); }
  for (const [side, f] of [['A', bt.A[bt.a]], ['B', bt.B[bt.b]]] as ['A' | 'B', Fighter][]) if (f.hp > 0 && f.burn > 0) { const d = Math.max(1, Math.round(f.max * 0.06)); f.hp = Math.max(0, f.hp - d); f.burn--; out.push({ side: side === 'A' ? 'B' : 'A', who: -1, target: side === 'A' ? bt.a : bt.b, move: 'burn', dmg: d, eff: 1, crit: false, miss: false, heal: 0, status: 'burn', ko: f.hp <= 0 }); }
  if (bt.A[bt.a].hp <= 0) { const n = bt.A.findIndex((f) => f.hp > 0); if (n < 0) bt.over = 'B'; else bt.a = n; }
  if (bt.B[bt.b].hp <= 0) { const n = bt.B.findIndex((f) => f.hp > 0); if (n < 0) bt.over = bt.over ? bt.over : 'A'; else bt.b = n; }
  if (bt.turn >= 60 && !bt.over) bt.over = bt.A.reduce((a, f) => a + f.hp / f.max, 0) >= bt.B.reduce((a, f) => a + f.hp / f.max, 0) ? 'A' : 'B';
  return out; }
// ---------------- leagues, tickets, rivals, seasons ----------------
export const LEAGUES = [['Bronze III', 0], ['Bronze II', 100], ['Bronze I', 200], ['Silver III', 350], ['Silver II', 500], ['Silver I', 650], ['Gold III', 850], ['Gold II', 1050], ['Gold I', 1250], ['Platinum', 1500], ['Diamond', 1800], ['Singularity', 2200]] as [string, number][];
export const LEAGUE_COLOR = ['#cd7f32', '#cd7f32', '#cd7f32', '#c0c8d4', '#c0c8d4', '#c0c8d4', '#ffd36a', '#ffd36a', '#ffd36a', '#7af7ff', '#9fd0ff', '#c49bff'];
export const leagueOf = (tr: number) => { let i = 0; for (let k = 0; k < LEAGUES.length; k++) if (tr >= LEAGUES[k][1]) i = k; return i; };
export const TICKETS = 5, TICKET_MS = 90 * 60000;
export interface Rival { name: string; banner: { bg: string; fg: string; emblem: string }; team: { sp: string; lvl: number }[]; diff: number; power: number; }
export interface ArenaState { trophies: number; best: number; seasonBest: number; season: string; tickets: number; tAt: number; wins: number; losses: number; rivals: Rival[]; rAt: number; team: string[]; dayWins: number; day: string; }
export function arena(s: State): ArenaState { const a = s as any; if (!a.arena) a.arena = { trophies: 0, best: 0, seasonBest: 0, season: weekKey(), tickets: TICKETS, tAt: Date.now(), wins: 0, losses: 0, rivals: [], rAt: 0, team: [], dayWins: 0, day: '' }; return a.arena; }
export const weekKey = (t = Date.now()) => { const d = new Date(t); const day = (d.getDay() + 6) % 7; d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - day); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export const seasonEnds = (t = Date.now()) => { const d = new Date(t); const day = (d.getDay() + 6) % 7; d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - day + 7); return d.getTime(); };
export function tickArena(s: State, now = Date.now()) { const A = arena(s); while (A.tickets < TICKETS && now >= A.tAt + TICKET_MS) { A.tickets++; A.tAt += TICKET_MS; } if (A.tickets >= TICKETS) A.tAt = now; }
// season rollover: rewards by the best league reached, trophies soften
export function seasonReward(s: State, lg: number) { const k = 1 + s.lvl * 0.5; return { dm: 10 + lg * 8, cells: round2(300 * k * (1 + lg * 0.4)), credits: round2(800 * k * (1 + lg * 0.5)) }; }
export function rollSeason(s: State, now = Date.now()) { const A = arena(s), wk = weekKey(now); if (A.season === wk) return null; const lg = leagueOf(A.seasonBest); const reward = A.seasonBest > 0 ? seasonReward(s, lg) : null; if (reward) give(s, reward);
  A.season = wk; A.trophies = Math.floor(A.trophies * 0.75); A.seasonBest = A.trophies; return reward ? { league: lg, reward } : null; }
const SYL = ['Nova', 'Astra', 'Kepler', 'Lumen', 'Vega', 'Orion', 'Tycho', 'Halley', 'Sagan', 'Ceres', 'Juno', 'Selene', 'Rhea', 'Titan', 'Helix', 'Zenith', 'Polaris', 'Draco', 'Lyra', 'Corvus'];
const SUF = ['Station', 'Colony', 'Outpost', 'Haven', 'Reach', 'Spire', 'Hold', 'Landing', 'Array', 'Ring'];
const BG = ['#1b6fd8', '#d83a3a', '#1f9c5a', '#7a3fd6', '#e08a1a', '#14202e', '#0fb3c9', '#c9324f'], EMB = ['star', 'planet', 'bolt', 'gear', 'rocket', 'circle'];
export function myTeam(s: State) { const A = arena(s); const busy = (b: BotRec) => SPECIES[b.sp].alien === 'relic' || !!((s as any).space && (s as any).space.exps.some((e: any) => e.crew.includes(b.id))); let t = A.team.map((id) => s.bots.find((b) => b.id === id)).filter((b): b is BotRec => !!b && !b.stored && !busy(b)); if (t.length < Math.min(3, s.bots.filter((b) => !b.stored).length)) { const best = [...s.bots].filter((b) => !b.stored && !busy(b) && !t.includes(b)).sort((x, y) => teamPower([y]) - teamPower([x])); t = [...t, ...best].slice(0, 3); A.team = t.map((b) => b.id); } return t.slice(0, 3); }
export function makeRivals(s: State, now = Date.now()) { const A = arena(s); const mine = teamPower(myTeam(s).map((b) => ({ sp: b.sp, lvl: b.lvl }))); const R = rng(hash(String(now >>> 0)) ^ (s.created >>> 0)); const lg = leagueOf(A.trophies);
  A.rivals = [0, 1, 2].map((diff) => { const target = Math.max(40, mine * [0.78, 0.98, 1.2][diff] * (1 + lg * 0.02)); const maxR = Math.min(6, Math.floor(lg / 2) + (diff === 2 ? 2 : 1));
    const pool = SPECIES_ORDER.filter((k) => RARITY_ORDER.indexOf(SPECIES[k].rarity) <= maxR); const team: { sp: string; lvl: number }[] = [];
    for (let i = 0; i < 3; i++) { const sp = pool[Math.floor(R() * pool.length)]; let lvl = 1; while (lvl < 40 && teamPower([...team, { sp, lvl: lvl + 1 }]) <= target * ((i + 1) / 3)) lvl++; team.push({ sp, lvl }); }
    return { name: `${SYL[Math.floor(R() * SYL.length)]} ${SUF[Math.floor(R() * SUF.length)]}`, banner: { bg: BG[Math.floor(R() * BG.length)], fg: R() < 0.5 ? '#ffd23a' : '#ffffff', emblem: EMB[Math.floor(R() * EMB.length)] }, team, diff, power: teamPower(team) }; });
  A.rAt = now; return A.rivals; }
export const TROPHY_WIN = [18, 26, 36], TROPHY_LOSS = 14;
export function canFight(s: State): { ok: boolean; why?: string } { const A = arena(s); if (!itemsOf(s, 'arena').some((i) => i.lvl > 0)) return { ok: false, why: 'Build the Arena first' }; if (A.tickets <= 0) return { ok: false, why: 'No battle tickets: one recharges every 90 minutes' }; if (myTeam(s).length < 1) return { ok: false, why: 'You need bots to fight' }; return { ok: true }; }
export function startFight(s: State, ri: number, now = Date.now()) { const A = arena(s), c = canFight(s); if (!c.ok) return null; const rv = A.rivals[ri]; if (!rv) return null; if (A.tickets === TICKETS) A.tAt = now; A.tickets--;
  const team = myTeam(s).map((b) => fighter(b.sp, b.lvl, b.nick, b.id)); return { bt: newBattle(team, rv.team.map((f) => fighter(f.sp, f.lvl)), (now / 1000) >>> 0), rival: rv }; }
export function finishFight(s: State, win: boolean, diff: number, now = Date.now()) { const A = arena(s); const today = new Date(now).toDateString(); if (A.day !== today) { A.day = today; A.dayWins = 0; }
  const k = 1 + s.lvl * 0.5; let reward: Record<string, number>; let dt: number;
  if (win) { dt = TROPHY_WIN[diff]; A.wins++; A.dayWins++; reward = { credits: round2(300 * k * (1 + diff * 0.5)), cells: round2(80 * k * (1 + diff * 0.5)) }; if (A.dayWins === 1) reward.dm = 5; s.stats.arenaWins = (s.stats.arenaWins || 0) + 1; }
  else { dt = -TROPHY_LOSS; A.losses++; reward = { credits: round2(60 * k) }; }
  const before = leagueOf(A.trophies); A.trophies = Math.max(0, A.trophies + dt); A.best = Math.max(A.best, A.trophies); A.seasonBest = Math.max(A.seasonBest, A.trophies); const after = leagueOf(A.trophies);
  const al = (itemsOf(s, 'arena')[0] || { lvl: 1 }).lvl; for (const k of Object.keys(reward)) if (k !== 'dm') reward[k] = round2(reward[k] * (1 + 0.1 * (al - 1)));
  give(s, reward); addXp(s, win ? 20 + diff * 10 : 5); A.rivals = []; return { reward, dt, promoted: after > before ? after : -1, league: after }; }
export const SPECIES_IN_ARENA = SPECIES_ORDER;
// ---------------- the Kr'thul Swarm: raids on the colony ----------------
export const RAID_LEVEL = 16, RAID_EVERY = 10 * 3600e3, RAID_WARN = 2 * 3600e3;
export interface Raid { next: number; eta: number; team: { sp: string; lvl: number }[]; won: number; lost: number; }
export function raid(s: State): Raid { const a = s as any; if (!a.raid) a.raid = { next: Date.now() + 3600e3, eta: 0, team: [], won: 0, lost: 0 }; return a.raid; }
export const SWARM_BANNER = { bg: '#14080c', fg: '#ff3d5a', emblem: 'circle' };
export function tickRaid(s: State, now = Date.now()) { if (s.lvl < RAID_LEVEL) return null; const R = raid(s);
  if (!R.eta && now >= R.next) { const mine = teamPower(myTeam(s).map((b) => ({ sp: b.sp, lvl: b.lvl }))); const target = Math.max(60, mine * 1.08); const pool = ['krdrone', 'krwarrior', 'krdrone', 'krbrood']; const team: { sp: string; lvl: number }[] = [];
    for (let i = 0; i < 3; i++) { const sp = pool[(i + Math.floor(now / 3600e3)) % (i === 2 && s.lvl > 24 ? 4 : 3)]; let lvl = 1; while (lvl < 40 && teamPower([...team, { sp, lvl: lvl + 1 }]) <= target * ((i + 1) / 3)) lvl++; team.push({ sp, lvl }); }
    R.team = team; R.eta = now + RAID_WARN; return { kind: 'warn' as const }; }
  if (R.eta && now >= R.eta) { let stolen = 0; for (const it of itemsOf(s, 'bay')) { const n = Math.floor((s.bay[it.id] || 0) * 0.5); s.bay[it.id] -= n; stolen += n; } R.eta = 0; R.next = now + RAID_EVERY; R.lost++; return { kind: 'hit' as const, stolen }; }
  return null; }
export function startRaid(s: State, now = Date.now()) { const R = raid(s); if (!R.eta || !R.team.length) return null; const team = myTeam(s).map((b) => fighter(b.sp, b.lvl, b.nick, b.id)); if (!team.length) return null;
  const rival: Rival = { name: "Kr'thul Swarm", banner: SWARM_BANNER, team: R.team, diff: 2, power: teamPower(R.team) }; return { bt: newBattle(team, R.team.map((f) => fighter(f.sp, f.lvl)), (now / 1000) >>> 0), rival }; }
export function finishRaid(s: State, win: boolean, now = Date.now()) { const R = raid(s); const k = 1 + s.lvl * 0.5; R.eta = 0; R.next = now + RAID_EVERY;
  if (win) { R.won++; s.stats.raidsWon = (s.stats.raidsWon || 0) + 1; const reward = { dm: 12, cells: round2(400 * k), credits: round2(1200 * k) }; give(s, reward); addXp(s, 60); const r = rng((now / 1000) >>> 0)(); const capture = r < 0.35 ? (r < 0.03 ? 'krbrood' : r < 0.12 ? 'krwarrior' : 'krdrone') : null; return { win, reward, capture }; }
  R.lost++; let stolen = 0; for (const it of itemsOf(s, 'bay')) { const n = Math.floor((s.bay[it.id] || 0) * 0.5); s.bay[it.id] -= n; stolen += n; } return { win, reward: {} as Record<string, number>, capture: null, stolen }; }
