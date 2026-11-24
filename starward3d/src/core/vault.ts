// The Precursor Vault: mines dig relic crystals for credits, the Forge refines them up four tiers with Iridium,
// crystals summon Relic AIs and evolve them (1-5 stars), and Relic Sanctums fill with the Iridium they earn.
import { State, BotRec, Item } from './state';
import { uid } from './util';
import { SPECIES } from '../data/species';
import { RARITY_ORDER } from '../data/rarities';
import { CRYSTAL_ORDER, DIGS, mineYield, FORGE_IN, forgeIridium, SUMMON, EVOLVE, relicEarn, relicStore } from '../data/vault';
import { bayCapacity } from '../data/buildings';
import { addXp, itemsOf, jobOf, events, botsIn, item } from './game';
import type { Check } from './game';
export interface VaultState { crystals: Record<string, number[]>; ready: Record<string, { color: string; n: number }>; }
export function vault(s: State): VaultState { const a = s as any; if (!a.vault) a.vault = { crystals: Object.fromEntries(CRYSTAL_ORDER.map((c) => [c, [0, 0, 0, 0]])), ready: {} }; return a.vault; }
export const isRelic = (sp: string) => SPECIES[sp].alien === 'relic';
export const relicColor = (sp: string) => SPECIES[sp].el[0];
export const relicTier = (sp: string) => RARITY_ORDER.indexOf(SPECIES[sp].rarity) - 3; // 0 Minor, 1 Major, 2 Prime
// ---------------- mines ----------------
export function canDig(s: State, mine: Item, di: number, color: string): Check { const d = DIGS[di]; if (!d || !CRYSTAL_ORDER.includes(color)) return { ok: false }; if (mine.lvl < 1 || jobOf(s, mine.id, 'build')) return { ok: false, why: 'Under construction' };
  if (jobOf(s, mine.id, 'dig' as any)) return { ok: false, why: 'Already digging' }; if (vault(s).ready[mine.id]) return { ok: false, why: 'Collect the crystals first' }; if (s.res.credits < d.cost) return { ok: false, why: 'Not enough credits', cost: d.cost }; return { ok: true, cost: d.cost, time: d.sec }; }
export function dig(s: State, mine: Item, di: number, color: string, now = Date.now()) { const c = canDig(s, mine, di, color); if (!c.ok) return c; s.res.credits -= c.cost || 0;
  s.jobs.push({ id: uid('j'), kind: 'dig' as any, item: mine.id, start: now, end: now + DIGS[di].sec * 1000, recipe: di, sp: color }); s.stats.digs = (s.stats.digs || 0) + 1; return c; }
export function completeDig(s: State, mine: Item, di: number, color: string) { vault(s).ready[mine.id] = { color, n: mineYield(DIGS[di].shards, Math.max(1, mine.lvl)) }; events.push({ kind: 'dug', item: mine.id }); }
export function collectMine(s: State, mine: Item) { const r = vault(s).ready[mine.id]; if (!r) return null; delete vault(s).ready[mine.id]; vault(s).crystals[r.color][0] += r.n; addXp(s, 5 + Math.round(r.n / 4)); return r; }
// ---------------- the Forge ----------------
export function canForge(s: State, color: string, tier: number): Check { const V = vault(s); if (!itemsOf(s, 'forge').some((f) => f.lvl > 0)) return { ok: false, why: 'Build the Relic Forge' }; if (tier >= 3) return { ok: false, why: 'Prisms are the highest tier' };
  if (V.crystals[color][tier] < FORGE_IN) return { ok: false, why: `Needs ${FORGE_IN}` }; const ir = forgeIridium(tier); if ((s.res.iridium || 0) < ir) return { ok: false, why: 'Not enough Iridium', cost: ir }; return { ok: true, cost: ir }; }
export function forge(s: State, color: string, tier: number) { const c = canForge(s, color, tier); if (!c.ok) return c; const V = vault(s); V.crystals[color][tier] -= FORGE_IN; V.crystals[color][tier + 1]++; s.res.iridium = (s.res.iridium || 0) - (c.cost || 0); addXp(s, 10 * (tier + 1)); s.stats.forged = (s.stats.forged || 0) + 1; return c; }
// ---------------- Relic AIs ----------------
export const relicHome = (s: State, sp: string) => itemsOf(s, 'relicbay').filter((b) => b.lvl > 0 && b.el === relicColor(sp) && botsIn(s, b.id).length < bayCapacity(b.lvl))[0];
export function canSummon(s: State, sp: string): Check { if (!isRelic(sp)) return { ok: false }; const [tier, n] = SUMMON[relicTier(sp)]; const have = vault(s).crystals[relicColor(sp)][tier];
  if (!relicHome(s, sp)) return { ok: false, why: `Needs a ${relicColor(sp)[0].toUpperCase() + relicColor(sp).slice(1)} Relic Sanctum with room` }; if (have < n) return { ok: false, why: `Needs ${n} ${relicColor(sp)} ${['shards', 'crystals', 'gems', 'prisms'][tier]}` }; return { ok: true }; }
export function summon(s: State, sp: string, now = Date.now()) { const c = canSummon(s, sp); if (!c.ok) return c; const [tier, n] = SUMMON[relicTier(sp)]; vault(s).crystals[relicColor(sp)][tier] -= n;
  const b: BotRec = { id: uid('b'), sp, lvl: 1, fed: 0, bay: relicHome(s, sp)!.id, born: now }; s.bots.push(b); if (!s.dex[sp]) { s.dex[sp] = now; s.res.dm += 40; events.push({ kind: 'discover', sp, dm: 40 }); } addXp(s, 80 + relicTier(sp) * 60); events.push({ kind: 'newBot', bot: b.id }); return { ...c, bot: b }; }
export function canEvolve(s: State, b: BotRec): Check { if (!isRelic(b.sp)) return { ok: false }; if (b.lvl >= 5) return { ok: false, why: 'Five stars: fully evolved' }; const [tier, n] = EVOLVE[b.lvl - 1]; const have = vault(s).crystals[relicColor(b.sp)][tier];
  if (have < n) return { ok: false, why: `Needs ${n} ${relicColor(b.sp)} ${['shards', 'crystals', 'gems', 'prisms'][tier]}` }; return { ok: true }; }
export function evolve(s: State, b: BotRec) { const c = canEvolve(s, b); if (!c.ok) return c; const [tier, n] = EVOLVE[b.lvl - 1]; vault(s).crystals[relicColor(b.sp)][tier] -= n; b.lvl++; addXp(s, 60 * b.lvl); events.push({ kind: 'evolved', bot: b.id, stars: b.lvl }); return c; }
// Iridium per second in a sanctum, and its store
export const relicRate = (s: State, bayId: string) => botsIn(s, bayId).reduce((a, b) => a + relicEarn(RARITY_ORDER.indexOf(SPECIES[b.sp].rarity), b.lvl), 0) / 60;
export const relicCap = (it: Item) => relicStore(Math.max(1, it.lvl));
export { item };
