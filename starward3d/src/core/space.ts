// The road to the stars: the Launch Pad, rocket tiers, expeditions crewed by bots to real Solar System worlds
// (loot scales with crew strength and element matches), first-visit discoveries, and outposts that earn on their own.
import { State, BotRec } from './state';
import { rng, round2, uid } from './util';
import { SPECIES } from '../data/species';
import { addXp, give, itemsOf, jobOf, events } from './game';
import { botPower } from './crew';
import { giveCore, giveSpecies } from './daily';
export interface Dest { star?: boolean; alien?: string; ly?: number; angle?: number; name: string; tier: number; hours: number; crew: number; els: string[]; needs?: string; dist: number; color: string; size: number; ring?: boolean; moonOf?: string; fact: string; first: string; outpost: { res: 'credits' | 'cells' | 'dm'; rate: number }; }
export const DESTS: Record<string, Dest> = {
  moon:      { name: 'The Moon', tier: 1, hours: 0.5, crew: 1, els: ['geo', 'solar'], dist: 1.4, color: '#bdbab4', size: 0.32, moonOf: 'earth', fact: '384,400 km away; three days by chemical rocket.', first: 'Your crew plants the colony banner beside the Apollo 11 site. Helium-3 glitters in the regolith.', outpost: { res: 'cells', rate: 120 } },
  neo:       { name: 'Near-Earth Asteroids', tier: 1, hours: 1, crew: 2, els: ['geo', 'alloy', 'gravity'], needs: 'moon', dist: 4.2, color: '#8a7a68', size: 0.18, fact: 'Thousands of mountains of metal drift past Earth every year.', first: 'A nickel-iron asteroid the size of a stadium. Your bots start a claim.', outpost: { res: 'credits', rate: 400 } },
  mars:      { name: 'Mars', tier: 2, hours: 2, crew: 2, els: ['geo', 'plasma', 'cryo'], needs: 'moon', dist: 5.4, color: '#c2643a', size: 0.42, fact: 'Olympus Mons is 22 km high; a day lasts 24 h 37 min.', first: 'Dust devils dance across Jezero Crater as your rover crew rolls out. Ice lies a metre down.', outpost: { res: 'credits', rate: 700 } },
  phobos:    { name: 'Phobos', tier: 2, hours: 2.5, crew: 2, els: ['gravity', 'alloy'], needs: 'mars', dist: 5.9, color: '#6e6660', size: 0.14, moonOf: 'mars', fact: 'Orbits Mars three times a day, slowly spiralling inwards.', first: 'A perfect depot site: one shove and cargo falls to Mars.', outpost: { res: 'cells', rate: 260 } },
  ceres:     { name: 'Ceres', tier: 2, hours: 4, crew: 2, els: ['cryo', 'hydro', 'geo'], needs: 'neo', dist: 7.4, color: '#7a7570', size: 0.24, fact: 'The largest object in the asteroid belt, with salt-bright craters.', first: 'Occator Crater\'s bright salts are brine frozen in place. Water for the whole belt.', outpost: { res: 'credits', rate: 1300 } },
  europa:    { name: 'Europa', tier: 3, hours: 6, crew: 3, els: ['cryo', 'hydro', 'bio'], needs: 'ceres', dist: 10.5, color: '#d8ccb4', size: 0.2, moonOf: 'jupiter', fact: 'An ocean of salt water under 20 km of ice.', first: 'The deep probe melts through the ice. Something down there glows.', outpost: { res: 'cells', rate: 900 } },
  ganymede:  { name: 'Ganymede', tier: 3, hours: 6, crew: 3, els: ['gravity', 'volt', 'cryo'], needs: 'ceres', dist: 10.9, color: '#a39889', size: 0.26, moonOf: 'jupiter', fact: 'The largest moon in the Solar System, with its own magnetic field.', first: 'Aurorae ripple over the ice plains. Jupiter fills half the sky.', outpost: { res: 'credits', rate: 2400 } },
  titan:     { name: 'Titan', tier: 4, hours: 8, crew: 3, els: ['hydro', 'bio', 'aero'], needs: 'europa', dist: 13.6, color: '#d08a3a', size: 0.3, moonOf: 'saturn', fact: 'Thick orange skies and lakes of liquid methane.', first: 'Your drone crew glides down through orange haze onto the shore of Kraken Mare.', outpost: { res: 'credits', rate: 4200 } },
  enceladus: { name: 'Enceladus', tier: 4, hours: 10, crew: 3, els: ['cryo', 'neural', 'hydro'], needs: 'titan', dist: 14.1, color: '#f2f8fd', size: 0.16, moonOf: 'saturn', fact: 'Geysers at its south pole spray an ocean into space.', first: 'Your bots fly straight through a geyser plume and sample an alien ocean.', outpost: { res: 'dm', rate: 2 } },
  proxima:   { star: true, alien: 'veyari', ly: 4.2, angle: 0.6, name: 'Proxima Centauri b', tier: 5, hours: 16, crew: 3, els: ['void', 'photon', 'gravity'], needs: 'pluto', dist: 28, color: '#ff9a6a', size: 0.35, fact: 'The nearest star to the Sun: a red dwarf with a rocky world in its habitable zone.', first: 'On a tidally locked world, crystal gardens grow along the twilight line. Their gardeners, the Veyari, have been waiting for you.', outpost: { res: 'dm', rate: 6 } },
  barnard:   { star: true, alien: 'synod', ly: 6.0, angle: 1.7, name: "Barnard's Star", tier: 5, hours: 18, crew: 3, els: ['cryo', 'chrono', 'gravity'], needs: 'proxima', dist: 30, color: '#ff7a5a', size: 0.32, fact: 'An ancient red dwarf racing across our sky faster than any other star.', first: 'A frozen planet humming with machinery. The Synod, a parliament of machines, opens a channel: "We have been expecting your bots."', outpost: { res: 'dm', rate: 7 } },
  tauceti:   { star: true, alien: 'mycelar', ly: 12, angle: 2.9, name: 'Tau Ceti e', tier: 5, hours: 20, crew: 3, els: ['bio', 'hydro', 'neural'], needs: 'barnard', dist: 32, color: '#ffe08a', size: 0.34, fact: 'A Sun-like star with a debris disc and several super-Earths.', first: 'A whole continent is one fungal mind, the Mycelar. It sings to your crew through their sensors.', outpost: { res: 'dm', rate: 8 } },
  trappist:  { star: true, alien: 'oshoru', ly: 40, angle: 4.1, name: 'TRAPPIST-1e', tier: 5, hours: 24, crew: 3, els: ['hydro', 'aero', 'kinetic'], needs: 'tauceti', dist: 34, color: '#ff6a5a', size: 0.3, fact: 'Seven Earth-sized worlds orbit one tiny star; three could hold oceans.', first: 'An ocean world. The Oshoru, a young sea-faring people, swim up to greet your landing craft.', outpost: { res: 'dm', rate: 9 } },
  epseri:    { star: true, alien: 'lumenchoir', ly: 10.5, angle: 5.2, name: 'Epsilon Eridani', tier: 5, hours: 24, crew: 3, els: ['photon', 'solar', 'neural'], needs: 'trappist', dist: 36, color: '#ffd27a', size: 0.36, fact: 'A young, restless star wrapped in asteroid belts.', first: 'Something old is broadcasting here. The Lumen, beings of pure light, have been listening to Earth for a century.', outpost: { res: 'dm', rate: 12 } },
  pluto:     { name: 'Pluto', tier: 4, hours: 12, crew: 3, els: ['cryo', 'void', 'chrono'], needs: 'enceladus', dist: 18.5, color: '#d9c4a8', size: 0.2, fact: 'A heart-shaped glacier of nitrogen ice, 6 billion km from the Sun.', first: 'At the edge of the Solar System your crew looks back. The Sun is just a bright star. Beyond: the real stars.', outpost: { res: 'dm', rate: 4 } },
};
export const DEST_ORDER = [...Object.keys(DESTS).filter((k) => !DESTS[k].star), ...Object.keys(DESTS).filter((k) => DESTS[k].star)];
export const PLANETS = [ // purely visual bodies on the map (destinations are drawn too)
  { id: 'mercury', dist: 2.2, color: '#9a948d', size: 0.16 }, { id: 'venus', dist: 3.1, color: '#d9b77a', size: 0.3 }, { id: 'earth', dist: 4.0, color: '#3f7fd8', size: 0.32 },
  { id: 'jupiter', dist: 10.7, color: '#d6b48a', size: 0.95 }, { id: 'saturn', dist: 13.8, color: '#e6d3a3', size: 0.8, ring: true }, { id: 'uranus', dist: 16.4, color: '#a6dce4', size: 0.5 }, { id: 'neptune', dist: 17.6, color: '#3a6ed8', size: 0.48 },
];
export const ROCKETS = [{ name: 'Kestrel', pad: 1 }, { name: 'Meridian', pad: 3 }, { name: 'Colossus', pad: 6 }, { name: 'Leviathan', pad: 9 }, { name: 'Starship', pad: 10 }];
export const rocketTier = (padLvl: number) => ROCKETS.filter((r) => padLvl >= r.pad).length;
export const launchSlots = (padLvl: number) => 1 + Math.floor(padLvl / 4);
export interface Expedition { id: string; dest: string; crew: string[]; start: number; end: number; power: number; match: number; }
export interface Space { visits: Record<string, number>; exps: Expedition[]; outposts: Record<string, { lvl: number; buf: number; t: number }>; }
export function space(s: State): Space { const a = s as any; if (!a.space) a.space = { visits: {}, exps: [], outposts: {} }; return a.space; }
export const pad = (s: State) => itemsOf(s, 'pad')[0];
export const onMission = (s: State, botId: string) => space(s).exps.some((e) => e.crew.includes(botId));
export const destOpen = (s: State, id: string) => { const d = DESTS[id]; return !d.needs || (space(s).visits[d.needs] || 0) > 0; };
// difficulty grows outwards; crew power vs difficulty and element matches scale the loot
export const destPower = (id: string) => Math.round(120 * Math.pow(2.1, DEST_ORDER.indexOf(id) * 0.6 + DESTS[id].tier - 1));
export function crewStats(s: State, id: string, crew: BotRec[]) { const d = DESTS[id]; const power = Math.round(crew.reduce((a, b) => { const p = botPower(b); return a + Math.sqrt(p.hp * p.atk); }, 0));
  const match = crew.reduce((a, b) => a + SPECIES[b.sp].el.filter((e) => d.els.includes(e)).length, 0); return { power, match, mult: Math.min(2.5, (0.55 + 0.45 * Math.min(1.6, power / destPower(id))) * (1 + 0.15 * match)) }; }
export function canLaunch(s: State, id: string, crewIds: string[]): { ok: boolean; why?: string; cost?: number } {
  const p = pad(s), d = DESTS[id]; if (!p || p.lvl < 1) return { ok: false, why: 'Build the Launch Pad first' }; if (jobOf(s, p.id, 'build')) return { ok: false, why: 'The Launch Pad is being upgraded' };
  if (!destOpen(s, id)) return { ok: false, why: `Visit ${DESTS[d.needs!].name} first` }; if (rocketTier(p.lvl) < d.tier) return { ok: false, why: `Needs a ${ROCKETS[d.tier - 1].name} rocket (Launch Pad level ${ROCKETS[d.tier - 1].pad})` };
  if (space(s).exps.length >= launchSlots(p.lvl)) return { ok: false, why: 'Every rocket is out: wait for one to return' }; if (space(s).exps.some((e) => e.dest === id)) return { ok: false, why: 'A crew is already on its way there' };
  if (!crewIds.length) return { ok: false, why: 'Pick a crew' }; if (crewIds.length > d.crew) return { ok: false, why: `At most ${d.crew} bots` };
  const cost = round2(150 * Math.pow(2.3, DEST_ORDER.indexOf(id) * 0.55)); if (s.res.credits < cost) return { ok: false, why: 'Not enough credits for fuel', cost }; return { ok: true, cost }; }
export function launch(s: State, id: string, crewIds: string[], now = Date.now()) { const c = canLaunch(s, id, crewIds); if (!c.ok) return c; s.res.credits -= c.cost || 0; const crew = crewIds.map((b) => s.bots.find((x) => x.id === b)!).filter(Boolean);
  for (const b of crew) delete b.post; const st = crewStats(s, id, crew); const e: Expedition = { id: uid('e'), dest: id, crew: crewIds, start: now, end: now + DESTS[id].hours * 3600e3, power: st.power, match: st.match };
  space(s).exps.push(e); s.stats.launches = (s.stats.launches || 0) + 1; addXp(s, 20 + DEST_ORDER.indexOf(id) * 6); events.push({ kind: 'launch', dest: id }); return { ...c, exp: e }; }
export const expTime = (id: string) => DESTS[id].hours * 3600;
// the haul: credits and cells scale with the trip; Dark Matter, cores and a first-visit bonus on top
export function haul(s: State, e: Expedition) { const d = DESTS[e.dest], i = DEST_ORDER.indexOf(e.dest); const crew = e.crew.map((b) => s.bots.find((x) => x.id === b)).filter((b): b is BotRec => !!b); const st = crewStats(s, e.dest, crew);
  const R = rng((e.start / 1000) >>> 0); const k = st.mult * (1 + s.lvl * 0.25) * Math.pow(1.3, i); const res: Record<string, number> = { credits: round2(400 * k * d.hours), cells: round2(110 * k * d.hours) };
  if (R() < 0.35 + 0.05 * d.tier) res.dm = 2 + Math.round(R() * 4 * d.tier); const first = !(space(s).visits[e.dest] > 0); if (first) res.dm = (res.dm || 0) + 10 + i * 5;
  const cr = R(); const rarity = cr < 0.02 * d.tier ? 'epic' : cr < 0.08 * d.tier ? 'elite' : cr < 0.3 ? 'advanced' : null; return { res, rarity, first, alien: first && d.alien ? d.alien : null }; }
export const allies = (s: State) => Object.keys(DESTS).filter((k) => DESTS[k].alien && (space(s).visits[k] || 0) > 0).length;
export function tickSpace(s: State, now = Date.now()) { const S = space(s); const back: { exp: Expedition; res: Record<string, number>; gift: any; first: boolean }[] = [];
  for (const e of [...S.exps]) { if (e.end > now) continue; const h = haul(s, e); give(s, h.res); const gift = h.alien ? giveSpecies(s, h.alien, e.end) : h.rarity ? giveCore(s, h.rarity, (e.start / 1000) >>> 0, e.end) : null; S.visits[e.dest] = (S.visits[e.dest] || 0) + 1; S.exps = S.exps.filter((x) => x !== e);
    s.stats.expeditions = (s.stats.expeditions || 0) + 1; addXp(s, 25 + DEST_ORDER.indexOf(e.dest) * 8); back.push({ exp: e, res: h.res, gift, first: h.first }); events.push({ kind: 'expBack', dest: e.dest }); }
  // outposts fill their stores
  for (const [id, o] of Object.entries(S.outposts)) { const dt = (now - o.t) / 1000; o.t = now; if (dt <= 0) continue; const cap = outpostCap(id, o.lvl); o.buf = Math.min(cap, o.buf + outpostRate(id, o.lvl) * dt / 3600); }
  return back; }
// ---------------- outposts ----------------
export const outpostRate = (id: string, lvl: number) => DESTS[id].outpost.rate * (1 + 0.5 * (lvl - 1)); // per hour
export const outpostCap = (id: string, lvl: number) => outpostRate(id, lvl) * 8;
export const outpostCost = (id: string, lvl: number) => round2(2000 * Math.pow(2.2, DEST_ORDER.indexOf(id) * 0.6) * Math.pow(2.0, lvl));
export function canOutpost(s: State, id: string) { const o = space(s).outposts[id], lvl = o ? o.lvl : 0; if (!(space(s).visits[id] > 0)) return { ok: false, why: 'Send an expedition there first' }; if (lvl >= 10) return { ok: false, why: 'Maximum level' };
  const cost = outpostCost(id, lvl); if (s.res.credits < cost) return { ok: false, why: 'Not enough credits', cost }; return { ok: true, cost }; }
export function buildOutpost(s: State, id: string, now = Date.now()) { const c = canOutpost(s, id); if (!c.ok) return c; s.res.credits -= c.cost || 0; const S = space(s); const o = S.outposts[id]; if (o) o.lvl++; else S.outposts[id] = { lvl: 1, buf: 0, t: now }; s.stats.outposts = Object.keys(S.outposts).length; addXp(s, 40); return c; }
export function collectOutpost(s: State, id: string) { const o = space(s).outposts[id]; if (!o) return 0; const n = Math.floor(o.buf); if (n <= 0) return 0; o.buf -= n; (s.res as any)[DESTS[id].outpost.res] += n; return n; }
