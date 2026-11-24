// The War Games client for the optional server (server/ in this folder). Set VITE_WAR_SERVER at build time to the
// Worker's URL; without it, or whenever the server cannot be reached, the War Games run on Academy commanders and the
// game never waits on the network. The server is authoritative for trophies and checks every result.
import { State } from './state';
import * as W from './war';
import type { BattleInput, BattleResult, Layout } from './battle';
import { income } from './daily';
const BASE: string = String(((import.meta as any).env || {}).VITE_WAR_SERVER || '').replace(/\/+$/, '');
export const online = () => !!BASE && Date.now() >= down;
let down = 0, lastSnap = '';
type Net = { id: string; token: string };
async function call(path: string, init: RequestInit = {}, net?: Net | null): Promise<any> {
  if (!BASE || Date.now() < down) throw new Error('offline'); const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 6000);
  try { const r = await fetch(BASE + path, { ...init, signal: ctl.signal, headers: { 'content-type': 'application/json', ...(net ? { authorization: `Bearer ${net.id}:${net.token}` } : {}) } }); const b = await r.json().catch(() => ({}));
    if (!r.ok) { const e: any = new Error(b.error || 'HTTP ' + r.status); e.status = r.status; throw e; } return b; }
  catch (e: any) { if (!(e.status && e.status < 500)) down = Date.now() + 90000; throw e; } finally { clearTimeout(tm); } }
async function ensure(s: State): Promise<Net | null> { const Wr = W.war(s); if (Wr.net) return Wr.net; if (!BASE) return null; const b = await call('/v1/register', { method: 'POST', body: JSON.stringify({ name: s.name }) }); Wr.net = { id: b.id, token: b.token }; return Wr.net; }
// keep the server's copy of your base current (when it changes, at most every two minutes; hourly regardless)
export async function pushSnapshot(s: State, look: { primary: string; accent: string }) { if (!online() || !W.unlocked(s)) return; const Wr = W.war(s); const L = W.layoutOf(s); const key = JSON.stringify(L); const now = Date.now();
  if ((key === lastSnap && now - Wr.snapAt < 3600e3) || now - Wr.snapAt < 120e3) return; try { const net = await ensure(s); await call('/v1/snapshot', { method: 'PUT', body: JSON.stringify({ name: s.name, layout: L, look, power: W.squadPower(W.squad(s)) }) }, net); lastSnap = key; Wr.snapAt = now; } catch (e) { /* the Academy covers for it */ } }
// real commanders first, the Academy fills any gap
export async function fetchOpps(s: State): Promise<W.Opp[] | null> { if (!online() || !W.unlocked(s)) return null; try { const net = await ensure(s); const b = await call('/v1/opponents', {}, net);
    return (b.opponents || []).map((o: any): W.Opp => ({ id: 'm:' + o.match, name: o.name, trophies: o.trophies, hq: o.hq, layout: o.layout as Layout, academy: false, look: { primary: o.look?.primary || '#2f6fd0', accent: o.look?.accent || '#ffd36a' } })); } catch (e) { return null; } }
export async function submit(s: State, opp: W.Opp, input: BattleInput, r: BattleResult): Promise<{ stars: number; pct: number; dT: number; trophies: number } | null> {
  if (opp.academy || !opp.id.startsWith('m:')) return null; try { const net = await ensure(s); return await call('/v1/result', { method: 'POST', body: JSON.stringify({ match: opp.id.slice(2), army: input.army, deploys: input.deploys, end: input.end, stars: r.stars, pct: r.pct }) }, net); } catch (e) { return null; } }
// attacks by real commanders on your base land in the same log as the Academy drills (hold one: a bounty)
export async function pullDefences(s: State) { if (!online() || !W.war(s).net) return 0; const Wr = W.war(s); try { const b = await call('/v1/defences?since=' + (Wr.defSince || 0), {}, Wr.net); let n = 0;
    for (const a of b.attacks || []) { const id = 's' + a.id; if (Wr.log.some((e) => e.id === id)) continue; const held = a.stars <= 1; const i = income(s, 1 + (1 - a.pct / 100));
      Wr.log.unshift({ id, t: a.at, who: a.who, stars: a.stars, pct: a.pct, input: a.input, bounty: held ? { credits: i.credits, metal: i.metal } : {}, held, claimed: false, dT: a.dT, academy: false }); if (held) s.stats.defHeld = (s.stats.defHeld || 0) + 1; Wr.defSince = Math.max(Wr.defSince || 0, a.at); n++; }
    Wr.log.sort((x, y) => y.t - x.t); Wr.log.length = Math.min(Wr.log.length, 20); if (typeof b.trophies === 'number') Wr.trophies = b.trophies; return n; } catch (e) { return 0; } }
export async function leaderboard(): Promise<{ name: string; trophies: number; hq: number }[] | null> { if (!online()) return null; try { return (await call('/v1/leaderboard')).top; } catch (e) { return null; } }
