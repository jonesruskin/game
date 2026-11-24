// STARWARD balance sim: a greedy bot plays the real game rules from a fresh save on a realistic schedule
// (awake 08:00-23:00, sleeping overnight while production continues) and reports when each objective lands.
//   node tools/sim.mjs                         engaged player: checks in every 10 min, first 40 min focused
//   STEP=10800 node tools/sim.mjs              casual player: checks in every 3 hours
//   FOCUS=90 MIN=1 STEP=20 DAYS=0.1 node tools/sim.mjs   the first session, minute by minute
//   SNAP=1 ...                                 add an economy snapshot every 2 days (caps, income, idle crews)
// Use it after any balance change: nothing may get stuck, and the milestone days should stay on target
// (DESIGN.md §10.1). Covers Parts 1-7: research, building, launches, probes, the fleet, voyages, colonies,
// terraforming, light sails, starships, star colonies, megastructures, gates, contact, war and the Beyond.
//   WARLOG=1 prints battles; DUMP=file.json saves the final state for debugging. Outcomes are random (launch failures), so run it a few times.
const root = new URL('../src/', import.meta.url).href;
const { fresh } = await import(root + 'core/state.js');
const G = await import(root + 'core/game.js');
const S = await import(root + 'core/space.js');
const { BUILDINGS } = await import(root + 'data/buildings.js');
const { TECH } = await import(root + 'data/research.js');
const { LAYOUTS } = await import(root + 'data/layouts.js');
const { ROCKETS, MISSIONS } = await import(root + 'data/space.js');
const { allSteps } = await import(root + 'data/objectives.js');
const SO = await import(root + 'core/solar.js');
const ST = await import(root + 'core/stars.js');
const AL = await import(root + 'core/aliens.js');
const WR = await import(root + 'core/war.js');
const BY = await import(root + 'core/beyond.js');
const FU = await import(root + 'core/fund.js');
const { OPENINGS, XENOTECH } = await import(root + 'data/aliens.js');
const { STARS, STAR_IDS, DRIVE_ORDER } = await import(root + 'data/stars.js');
const { BODIES, SITES, SHIPS, SHIP_ORDER, TERRA, ZONE_CLASS } = await import(root + 'data/solar.js');

const env = (k, d) => (process.env[k] !== undefined ? Number(process.env[k]) : d);
const STEP = env('STEP', 600), DAYS = env('DAYS', 150), FOCUS = env('FOCUS', 40);
const s = fresh(); let t = Date.UTC(2026, 0, 1, 8); s.last = t; const t0 = t; s.tut = 1;
const STEPS = allSteps(); const log = [];
const when = (x) => (process.env.MIN ? Math.round((x - t0) / 60000) + ' min' : ((x - t0) / 86400000).toFixed(2) + ' d');
const focused = () => t - t0 < FOCUS * 60000; // a new player doing exactly what the objective panel says
const GOALS = ['rocketry', 'liquidProp', 'multistage', 'guidance', 'orbital', 'satComms', 'lifeSupport', 'crewed', 'deepSpace', 'additive', 'spaceStation', 'alloys', 'heavy', 'lunarLanders', 'closedLoop', 'isru', 'he3Mining', 'lunarHabitats',
  'planetaryProbes', 'nuclearThermal', 'orbitalShipyard', 'marsDirect', 'spaceAgriculture', 'asteroidMining', 'colonyShips', 'aerostats', 'fusionPower', 'planetaryEngineering', 'beltSettlement', 'fusionDrive', 'radiationShielding', 'cometCapture', 'magnetosphere', 'gasGiantScoops', 'xenobiology', 'cryoHabitats', 'hydrosphere', 'extremophiles', 'advancedFusion', 'ecopoiesis', 'solarFurnace', 'spaceElevator',
  'laserSails', 'exoplanetology', 'starColonies', 'sleeperShips', 'dysonSwarm', 'casimirEffect', 'ramjets', 'domeWorlds', 'xenoarchaeology', 'interstellarTrade', 'warpTheory', 'wormholeGates', 'warpDrive', 'contactProtocols', 'xenolinguistics', 'xenodiplomacy', 'upliftEthics', 'navalWarfare', 'planetaryDefence', 'guidedOrdnance', 'capitalShips', 'swarmTactics', 'carrierWarfare', 'antimatterProduction', 'relayNetwork', 'matrioshkaBrains', 'intergalacticDrive', 'ringworlds', 'transcendence'];
const closure = (id, out = []) => { if (s.tech[id] || out.includes(id)) return out; for (const r of TECH[id].req) closure(r, out); out.push(id); return out; };
const lots = (base) => LAYOUTS[base].lots.filter((l) => G.lotOpen(s, base, l) && !(s.bases[base].lots[l.id] && s.bases[base].lots[l.id].b));
const lotOf = (base, b) => Object.keys(s.bases[base].lots).find((k) => s.bases[base].lots[k].b === b && !G.jobAt(s, base, k));
const cmd = (base) => (base === 'earth' ? 'hq' : 'hub');

function research() {
  if (G.slotsBusy(s) >= G.slotsTotal(s)) return;
  if (focused()) { const st = G.currentStep(s); if (st && st.kind === 'tech') for (const id of closure(st.id2)) if (G.canResearch(s, id).ok) return G.startResearch(s, id, t); return; }
  for (const g of GOALS) { if (s.tech[g]) continue; for (const id of closure(g)) if (G.canResearch(s, id).ok) return G.startResearch(s, id, t); break; }
  const opts = Object.keys(TECH).filter((id) => G.canResearch(s, id).ok).sort((a, b) => TECH[a].tier - TECH[b].tier); if (opts.length && Math.random() < 0.5) G.startResearch(s, opts[0], t);
}
function want(base) { // buildings worth placing on a free lot, best first
  const st = G.currentStep(s); if (st && st.kind === 'build' && BUILDINGS[st.b].bases.includes(base)) return [st.b]; if (st && st.kind === 'buildOn' && st.base === base && !Object.values(s.bases[base].lots).some((l) => l.b === st.b)) return [st.b];
  const need = G.reqsMissing(s, base, cmd(base), G.hqLevel(s, base) + 1).map(([b]) => b).filter((b) => !Object.values(s.bases[base].lots).some((l) => l.b === b));
  if (lots(base).length <= 1 && !need.length) return []; // keep a lot spare for whatever the campaign asks next
  const R = G.rates(s); const C = R.col[base];
  const LISTS = { earth: ['research', 'mine', 'office', 'refinery', 'solar', 'depot', 'vab', 'tracking', 'academy', 'university', 'fission', 'fusion', 'elevator', 'casimir', 'xenolab', 'antimatter'], moon: ['he3x', 'regolith', 'lsolar', 'ice', 'llab', 'dome', 'greenhouse', 'massDriver', 'reactor'],
    mars: ['dome', 'greenhouse', 'regolith', 'reactor', 'terraformer', 'llab', 'ice', 'lsolar', 'fusion'], ceres: ['dome', 'greenhouse', 'ice', 'reactor', 'beltControl', 'regolith', 'llab', 'fusion'], titan: ['dome', 'greenhouse', 'reactor', 'methane', 'ice', 'llab', 'fusion'] };
  const list = [...LISTS[base]]; if (C && C.pop >= C.house * 0.9) list.unshift('dome');
  if (R.gen - R.draw < 15) list.unshift(base === 'earth' ? (s.tech.fusionPower ? 'fusion' : s.tech.fission ? 'fission' : 'solar') : base === 'moon' || base === 'mars' ? 'lsolar' : 'reactor');
  return [...need, ...list];
}
function constructFocused() {
  const st = G.currentStep(s); if (!st || G.crewsBusy(s) >= G.crewsTotal(s)) return;
  if (st.kind === 'hq') { if (G.canUpgrade(s, 'earth', 'hq').ok) return G.startUpgrade(s, 'earth', 'hq', t); for (const [b] of G.reqsMissing(s, 'earth', 'hq', G.hqLevel(s) + 1)) { const id = lotOf('earth', b); if (id && G.canUpgrade(s, 'earth', id).ok) return G.startUpgrade(s, 'earth', id, t); } return; }
  if (st.kind === 'build') { const ex = lotOf('earth', st.b); if (ex && s.bases.earth.lots[ex].lvl < st.lvl) { if (G.canUpgrade(s, 'earth', ex).ok) G.startUpgrade(s, 'earth', ex, t); return; } const L = lots('earth').find((l) => (l.special || null) === (BUILDINGS[st.b].lot || null)); if (L && G.canBuild(s, 'earth', L.id, st.b).ok) G.startBuild(s, 'earth', L.id, st.b, t); return; }
  if (st.kind === 'rate' || st.kind === 'energy') { const id = lotOf('earth', st.kind === 'rate' ? 'mine' : 'solar'); if (id && G.canUpgrade(s, 'earth', id).ok) G.startUpgrade(s, 'earth', id, t); }
}
function construct() {
  if (focused()) return constructFocused();
  const st = G.currentStep(s);
  if (st && st.kind === 'hq' && G.crewsBusy(s) < G.crewsTotal(s) && G.canUpgrade(s, 'earth', 'hq').ok) G.startUpgrade(s, 'earth', 'hq', t);
  if (st && st.kind === 'hq' && !G.jobAt(s, 'earth', 'hq') && G.canUpgrade(s, 'earth', 'hq').why === 'Not enough resources') return; // save up for the objective
  for (let guard = 0; guard < 6 && G.crewsBusy(s) < G.crewsTotal(s); guard++) {
    const R = G.rates(s); let acted = false;
    for (const base of Object.keys(s.bases)) { const free = lots(base); if (!free.length) continue;
      for (const b of want(base)) { const L = free.find((l) => (l.special || null) === (BUILDINGS[b].lot || null)); if (L && G.canBuild(s, base, L.id, b).ok) { G.startBuild(s, base, L.id, b, t); acted = true; break; } }
      if (acted) break; }
    if (!acted) for (const base of Object.keys(s.bases)) { // no room for a required building: demolish a duplicate, as a player would
      const st2 = G.currentStep(s); const need = G.reqsMissing(s, base, cmd(base), G.hqLevel(s, base) + 1).map(([b]) => b).concat(st2 && st2.kind === 'buildOn' && st2.base === base ? [st2.b] : []).concat(st2 && st2.kind === 'build' && base === 'earth' && BUILDINGS[st2.b].bases.includes('earth') ? [st2.b] : []).filter((b) => !Object.values(s.bases[base].lots).some((l) => l.b === b) && G.canBuild(s, base, 'nope', b).why !== 'Research ' + (BUILDINGS[b].req && BUILDINGS[b].req.tech && TECH[BUILDINGS[b].req.tech] ? TECH[BUILDINGS[b].req.tech].name : ''));
      if (!need.length || lots(base).length) continue; const cnt = {}; for (const l of Object.values(s.bases[base].lots)) if (l.b) cnt[l.b] = (cnt[l.b] || 0) + 1;
      const victim = Object.keys(s.bases[base].lots).filter((k) => { const l = s.bases[base].lots[k]; return l.b && cnt[l.b] > 1 && G.canDemolish(s, base, k); }).sort((a, b) => s.bases[base].lots[a].lvl - s.bases[base].lots[b].lvl)[0];
      if (victim && need.some((b) => !BUILDINGS[b].req || !BUILDINGS[b].req.tech || s.tech[BUILDINGS[b].req.tech])) { G.demolish(s, base, victim); acted = true; break; } }
    if (!acted) { // upgrades: command prerequisites first, then the command building, power when short, then the cheapest
      const cands = [];
      for (const base of Object.keys(s.bases)) { const need = G.reqsMissing(s, base, cmd(base), G.hqLevel(s, base) + 1);
        for (const id in s.bases[base].lots) { const l = s.bases[base].lots[id]; if (!l.b || G.jobAt(s, base, id)) continue; const c = G.canUpgrade(s, base, id); if (!c.ok) continue;
          let pri = Object.values(c.cost).reduce((a, b) => a + b, 0); if (l.b === 'hq' || l.b === 'hub') pri *= 0.35; if (need.some(([b2, n2]) => b2 === l.b && l.lvl < n2)) pri *= 0.05; if (R.gen - R.draw < 15 && /solar|fission|lsolar/.test(l.b)) pri *= 0.2; if (l.b === 'launch' || l.b === 'vab') pri *= 0.6; cands.push([pri, base, id]); } }
      cands.sort((a, b) => a[0] - b[0]); if (cands.length) { G.startUpgrade(s, cands[0][1], cands[0][2], t); acted = true; } }
    if (!acted) break;
  }
}
function payloads() { // the campaign's next flight first, then satellites, station modules and science hops
  const st = G.currentStep(s); const order = [];
  if (st && st.kind === 'survey') order.push({ probe: st.body });
  if (st && st.kind === 'module' && st.mod === 'yard') order.push({ module: 'yard' });
  if (st) { if (st.kind === 'flag') { const m = Object.keys(MISSIONS).find((k) => MISSIONS[k].flag === st.flag); if (m) order.push({ mission: m }); } if (st.kind === 'sat') order.push({ sat: st.sat }); if (st.kind === 'module') order.push({ module: st.mod }); if (st.kind === 'rockets') order.push(null); }
  if (focused()) return order.slice(0, 1);
  for (const k of ['comms', 'observe', 'weather', 'telescope', 'nav']) order.push({ sat: k });
  for (const k of ['core', 'lab', 'solar', ...(s.tech.orbitalShipyard ? ['yard'] : [])]) order.push({ module: k });
  if (s.tech.planetaryProbes) for (const b of ['mars', 'phobos', 'eros', 'bennu', 'venus', 'psyche', 'vesta', 'ceres', 'pallas', 'hygiea', 'mercury', 'jupiter', 'europa', 'io', 'ganymede', 'callisto', 'saturn', 'titan', 'enceladus', 'uranus', 'titania', 'neptune', 'triton', 'pluto']) if (!SO.sol(s).surveyed[b]) { order.push({ probe: b }); break; }
  order.push({ mission: 'suborbital' }); return order;
}
function fly() {
  const order = payloads();
  for (const p of order) {
    if (!p) { if (!S.rocketBusy(s) && S.canBuildRocket(s, 'kestrel').ok && !Object.values(S.sp(s).rockets).some((n) => n > 0)) S.startRocket(s, 'kestrel', t); continue; }
    const c = S.canLaunch(s, p);
    if (c.ok) { S.launch(s, p, t); if (S.launchesBusy(s) >= S.launchSlots(s)) break; continue; }
    if (c.rocket && !S.rocketBusy(s)) { const id = Object.keys(ROCKETS).find((k) => ROCKETS[k].cls >= c.ms.cls && S.canBuildRocket(s, k).ok); if (id) S.startRocket(s, id, t); }
    if (p === order[0] && (c.cost || c.rocket)) break; // save up for the campaign flight
  }
}
// ---- Part 3: the fleet, voyages, colonies and terraforming ----
function shipyard() { if (SO.shipBusy(s)) return; const S2 = SO.sol(s); const have = (id) => S2.ships[id] || 0;
  const want = [['hermes', 1], ['ares', 1], ['hermes', 2], ['daedalus', 1], ['odyssey', 1], ['ares', 2], ['daedalus', 2]];
  for (const [id, n] of want) if (have(id) < n) { if (SO.canBuildShip(s, id).ok) SO.startShip(s, id, t); return; } }
function voyages() {
  const S2 = SO.sol(s); const st = G.currentStep(s); const plan = [];
  if (st && st.kind === 'colony') plan.push({ body: st.body, op: 'found' }); if (st && st.kind === 'site') plan.push({ body: st.body, op: 'site' });
  for (const id of ['mars', 'ceres', 'titan']) if (!s.bases[id]) plan.push({ body: id, op: 'found' });
  for (const id of ['mars', 'ceres', 'titan']) { const c = G.rates(s).col[id]; if (c && c.pop < c.house - 70) plan.push({ body: id, op: 'transport' }); }
  for (const id in SITES) if (S2.surveyed[id] && s.tech[SITES[id].req]) plan.push({ body: id, op: S2.sites[id] ? 'upgrade' : 'site' });
  for (const P of plan) { const c = SO.canVoyage(s, P, t); if (c.ok && SO.windowOf(P.body, t).q > 0.35) SO.startVoyage(s, P, t); else if (c.ok && P === plan[0]) SO.startVoyage(s, P, t); }
  if (s.bases.mars && SO.canTerra(s, 'mars').ok) SO.startTerra(s, 'mars', t);
}
// ---- Part 4: megastructures, light sails, starships, star colonies, gates ----
function interstellar() {
  const I = ST.ist(s); const st = G.currentStep(s);
  for (const id of ['laser', 'dyson', 'gate']) if (ST.canMega(s, id).ok && (id !== 'dyson' || ST.megaStage(s, 'laser') >= 1)) ST.startMega(s, id, t);
  const want = st && st.kind === 'starSurvey' && st.star ? [st.star] : []; const near = STAR_IDS.filter((k) => !I.surveyed[k]).sort((a, b) => ST.dist(a) - ST.dist(b));
  for (const k of [...want, ...near]) { if (ST.canSail(s, k).ok) ST.startSail(s, k, t); if (ST.sailsOut(s) >= ST.megaStage(s, 'laser')) break; }
  if (!ST.driveBusy(s) && !SO.shipBusy(s)) for (const [id, n] of [['ark', 1], ['ramjet', 1], ['ark', 2], ['warp', 1], ['ramjet', 2]]) if ((I.ships[id] || 0) < n) { if (ST.canBuildDrive(s, id).ok) ST.startDrive(s, id, t); break; }
  const sites = []; for (const k in I.surveyed) STARS[k].planets.forEach((pl, p) => sites.push([pl.hab + (pl.res.exotic ? 0.3 : 0) - ST.dist(k) * 0.004, k, p]));
  sites.sort((a, b) => b[0] - a[0]); for (const [, k, p] of sites) { const c = ST.canFound(s, k, p); if (c.ok) { ST.startFound(s, k, p, t); break; } }
  let n = 0; for (const key in I.colonies) { const C = I.colonies[key]; if (C.spec === 'balanced') ST.setSpec(s, key, ['research', 'trade', 'mining', 'industry'][n++ % 4]); if (ST.canDevelop(s, key).ok) ST.startDevelop(s, key, t); if (ST.canGate(s, C.star).ok) ST.startGate(s, C.star, t); }
}
// ---- Part 5: contact and diplomacy ----
function contact() {
  const R = G.rates(s); AL.tickAliens(s, R, t); const A = AL.al(s);
  for (const id of AL.pendingContacts(s)) { const best = Object.keys(OPENINGS).sort((a, b) => (OPENINGS[b].d[id] || 0) - (OPENINGS[a].d[id] || 0))[0]; AL.meet(s, id, best, t); }
  for (const id in A.known) { const k = A.known[id], d = AL.allSpecies()[id];
    if (d.extinct) { if (AL.canDig(s).ok) AL.startDig(s, t); continue; }
    if (id === 'krthul') { if (!s.flags.krthulAnswered) AL.setTribute(s, true); }
    if (k.req && AL.reqDone(s, k.req) && (k.req.k !== 'give' || (s.res[k.req.res] || 0) > k.req.n * 2)) AL.fulfil(s, id);
    if (d.minor && d.tier < 3) { if (A.minors[id] === 'observe') s.flags.minorProtected = 1; if (!Object.values(A.minors).includes('uplift') && AL.canUplift(s, id).ok) AL.startUplift(s, id, t); continue; }
    if (AL.canDecipher(s, id).ok) AL.startDecipher(s, id, t);
    AL.gift(s, id, R, t);
    for (const kd of ['trade', 'pact', 'alliance']) if (AL.canDeal(s, id, kd).ok) AL.deal(s, id, kd);
    if (AL.canEmbassy(s, id).ok && k.embassy < 3) AL.startEmbassy(s, id, t); }
  for (const x in XENOTECH) if (AL.canXeno(s, x).ok) AL.learnXeno(s, x);
}
// ---- Part 6: the navy, defences, intercepts and the hive campaign ----
const MIX = { corvette: 2, frigate: 2, destroyer: 2, cruiser: 1.5, battleship: 1.5, carrier: 0.4 };
function warfare() {
  if (SO.yardLevel(s) < 10) { const c = S.canLaunch(s, { module: 'yard' }); if (c.ok) S.launch(s, { module: 'yard' }, t); else if (c.rocket && !S.rocketBusy(s)) { const id = ['colossus', 'leviathan'].find((k) => S.canBuildRocket(s, k).ok); if (id) S.startRocket(s, id, t); } } // capital ships need a bigger shipyard
  const W = WR.war(s); for (const e of WR.tickWar(s, t)) if (e.kind === 'raidResult') warLog.push(`${when(t)} raid on ${e.rep.name}: ${e.rep.win ? 'repelled' : 'LOST'}`);
  const next = WR.HIVE_ORDER.find((id) => !W.hives[id + '_done']); const total = Object.values(W.ships).reduce((a, b) => a + b, 0);
  const st1 = G.currentStep(s); const warOn = !!(st1 && ['ch11', 'ch12'].includes(st1.ch)); warSaving = false;
  // follow Fleet Command's advice: only hulls that can hurt the hive's toughest unit count (by damage per credit)
  const opts = Object.keys(MIX).filter((k) => s.tech[WR.WARSHIPS[k].req] && yardOK(k)); const pw = (k) => WR.power({ [k]: 1 });
  const foe = next ? Object.keys(WR.hiveLeft(s, next)).map((u) => WR.UNIT(u)).sort((x, y) => y.sh - x.sh)[0] : null;
  const eff = (x) => { const u = WR.WARSHIPS[x]; if (!foe) return 1; const sh = foe.sh * (u.wpn === 'rail' ? 0.5 : 1); return (u.atk * WR.VS[u.wpn][foe.size] * (1 - sh / (sh + u.atk))) / u.cost.credits; };
  const best = opts.length ? Math.max(...opts.map(eff)) : 0; const good = opts.filter((x) => eff(x) >= best * 0.4); const goodPow = good.reduce((a, k) => a + (W.ships[k] || 0) * pw(k), 0);
  // before the war chapters, just the squadron the objectives ask for; in them, only what the next fight needs (past 3x the hive's power in useful hulls, the answer is better research)
  const needMore = (st1 && st1.kind === 'warships' && total < st1.n) || (!warOn ? total < 20 : next ? WR.assaultForecast(s, next) < 0.9 && goodPow < 3 * WR.power(WR.hiveLeft(s, next)) : false);
  if (needMore && !WR.warBusy(s)) {
    const k = good.filter((x) => good.length < 3 || WR.WARSHIPS[x].size !== 'S' || (W.ships.corvette || 0) < 60).sort((a, b) => (W.ships[a] || 0) * pw(a) / MIX[a] - (W.ships[b] || 0) * pw(b) / MIX[b])[0];
    let built = false; if (k) for (const n of [10, 5, 2, 1]) if (WR.canWarship(s, k, n).ok) { WR.startWarship(s, k, n, t); built = true; break; }
    if (k && !built && warOn && WR.canWarship(s, k, 1).why === 'Not enough resources') warSaving = true; }
  for (const tg of WR.targets(s)) if (WR.defLevel(s, tg.key) < 4 && WR.canDefence(s, tg.key).ok) { WR.startDefence(s, tg.key, t); break; }
  const raid = W.raids[0]; if (raid && WR.raidForecast(s, raid, false) < 0.7 && W.fleetAt !== raid.target && WR.canMove(s, raid.target).ok && WR.moveTime(s, raid.target) * 1000 < raid.eta - t) WR.startMove(s, raid.target, t);
  if (!raid) for (const id of WR.HIVE_ORDER) { if (W.hives[id + '_done'] || !WR.hiveOpen(s, id)) continue; if (WR.canAssault(s, id).ok && WR.assaultForecast(s, id) >= 0.8) { WR.startAssault(s, id, t); warLog.push(`${when(t)} assault on ${id} (power ${Math.round(WR.power(W.ships))} vs ${Math.round(WR.power(WR.hiveLeft(s, id)))})`); } break; }
}
const yardOK = (k) => SO.yardLevel(s) >= WR.WARSHIPS[k].yard; const warLog = []; let warSaving = false; // saving up for a capital hull: other spending waits a turn
// ---- Part 7: antimatter, relays, expeditions, endgame megaprojects ----
// the funded megaprojects: route surplus into the next one on the road to the Far Shore (or the one the objective
// asks for), and invest whatever sits above half of storage, like a player topping it up at each check-in
function nextProject() { const st0 = G.currentStep(s); if (st0 && st0.kind === 'mega' && ST.MEGA[st0.mega] && ST.MEGA[st0.mega].fund && s.tech[ST.MEGA[st0.mega].req]) return 'mega:' + st0.mega;
  const B = BY.bey(s); if (!s.tech.relayNetwork) return null; const gal = BY.GALAXY_ORDER.find((id) => !B.visited[id]);
  if (gal && s.tech.intergalacticDrive && BY.expOpen(s, gal) && B.relay >= BY.EXPEDITIONS[gal].relay) return 'exp:' + gal; if (B.relay < BY.RELAY.stages) return 'relay';
  for (const id of ['matrioshka', 'ringworld']) if (s.tech[ST.MEGA[id].req] && ST.megaStage(s, id) < ST.MEGA[id].stages) return 'mega:' + id; return null; }
function beyond() { const st1 = G.currentStep(s); const late = s.flags.queenDead || !st1 || ['ch13', 'ch14'].includes(st1.ch); const key = late ? nextProject() : null; if (key) { const c = BY.projectCost(s, key); if (c) { if (!FU.routed(s, key)) FU.setRoute(s, key, c); const R0 = G.rates(s); const max = {}; for (const r in c) max[r] = Math.max(0, (s.res[r] || 0) - 0.5 * (R0.cap[r] || 0)); FU.invest(s, key, c, max); } }
  if (BY.canRelay(s).ok) BY.startRelay(s, t); for (const id of BY.GALAXY_ORDER) if (BY.canExpedition(s, id).ok) { BY.startExpedition(s, id, t); break; } for (const id of ['matrioshka', 'ringworld']) if (ST.canMega(s, id).ok) ST.startMega(s, id, t); BY.checkAchievements(s); }
const ready = {}; // READY=1: when each step first became achievable, whatever the objective order
let fails = 0; const W = { idle: 0, lab: 0, n: 0 }; let snapT = t0;
while (t < t0 + DAYS * 86400000) {
  const h = new Date(t).getUTCHours(); const awake = h >= 8 && h < 23;
  const notes = G.advance(s, t); fails += notes.filter((x) => x.kind === 'fail').length;
  if (awake) { W.n++; if (G.crewsBusy(s) < G.crewsTotal(s)) W.idle++; if (G.slotsBusy(s) < G.slotsTotal(s)) W.lab++; }
  if (process.env.SNAP && t - snapT >= 2 * 86400000) { snapT = t; const R = G.rates(s); const r = (k) => `${k} ${Math.round(s.res[k])}/${Math.round(R.cap[k])} (+${Math.round(R.prod[k])}/h)`;
    log.push(`    [${when(t)}] HQ${G.hqLevel(s)} techs ${Object.keys(s.tech).length} crews ${G.crewsTotal(s)} idle ${Math.round((W.idle / W.n) * 100)}% lab idle ${Math.round((W.lab / W.n) * 100)}% · ${['credits', 'metal', 'science', 'rare', 'he3', 'exotic'].map(r).join(' · ')} · laser ${ST.megaStage(s, 'laser')} dyson ${ST.megaStage(s, 'dyson')}`); Object.assign(W, { idle: 0, lab: 0, n: 0 }); }
  if (awake && process.env.READY) { const R0 = G.rates(s); for (let k = s.obj.i + 1; k < Math.min(STEPS.length, s.obj.i + 40); k++) if (!ready[STEPS[k].id]) { try { if (G.stepDone(s, STEPS[k], R0)) ready[STEPS[k].id] = t; } catch (e) {} } }
  if (awake) { for (let k = 0; k < 8; k++) { const st = G.claimStep(s); if (!st) break; log.push(`${when(t).padStart(9)}  ✓ ${st.id.padEnd(4)} ${st.text}${ready[st.id] && t - ready[st.id] > 5 * 86400e3 ? `   (achievable since ${when(ready[st.id]).trim()})` : ''}`); } // like a player, save up for the megastructure or starship the campaign is asking for
    const st0 = G.currentStep(s); const saving = st0 && ((st0.kind === 'mega' && ST.canMega(s, st0.mega).why === 'Not enough resources') || (st0.kind === 'drive' && ST.canBuildDrive(s, st0.ship).why === 'Not enough resources')); const capOK = (c) => { const R0 = G.rates(s); return Object.entries(c || {}).every(([r, n]) => R0.cap[r] >= n); }; const savingOK = saving && capOK(st0.kind === 'mega' ? ST.megaCost(st0.mega, ST.megaStage(s, st0.mega)) : (ST.DRIVES[st0.ship] || {}).cost);
    if (st0 && st0.kind === 'ruins' && AL.canDig(s).ok) AL.startDig(s, t); // the objective's dig before anything else spends the science
    const holdFire = warSaving; research(); if (s.tech.laserSails && !holdFire) interstellar(); if (s.tech.contactProtocols) contact(); if (s.tech.navalWarfare || (s.war && s.war.raids.length)) warfare(); else WR.tickWar(s, t); if (s.tech.relayNetwork || s.tech.antimatterProduction) beyond(); if (!savingOK && !holdFire) { construct(); fly(); if (s.tech.nuclearThermal) { shipyard(); voyages(); } } }
  if (s.obj.i >= STEPS.length) { log.push(`${when(t).padStart(9)}  campaign complete`); break; }
  t += awake ? (t - t0 > 150 * 86400e3 ? Math.max(STEP, 1800) : STEP) * 1000 : 3600 * 1000; // late-game players check in less often
}
const st = G.currentStep(s);
console.log(log.join('\n')); if (process.env.WARLOG) console.log(warLog.join('\n'));
if (process.env.DUMP) (await import('node:fs')).writeFileSync(process.env.DUMP, JSON.stringify({ s, t }));
if (s.fund) console.log('fund:', JSON.stringify({ route: s.fund.route && s.fund.route.key, pools: Object.fromEntries(Object.entries(s.fund.pools).map(([k, p]) => [k, Object.fromEntries(Object.entries(p).map(([r, v]) => [r, Math.round(v)]))])) }));
if (s.tech.navalWarfare) console.log('war:', JSON.stringify({ yard: SO.yardLevel(s), yardLaunch: S.canLaunch(s, { module: 'yard' }).why || 'ok', ships: WR.war(s).ships, rockets: s.space.rockets }));
console.log(`\nend ${when(t)} · Mission Control ${G.hqLevel(s)} · hubs ${Object.keys(s.bases).filter((b) => b !== 'earth').map((b) => b + ' ' + G.hqLevel(s, b) + ' (' + Math.floor(s.bases[b].pop) + ' pop)').join(', ') || '-'} · sites ${Object.keys(SO.sol(s).sites).length} · terra ${SO.terraStage(s, 'mars')}/7 · stars surveyed ${Object.keys(ST.ist(s).surveyed).length}, colonies ${Object.keys(ST.ist(s).colonies).length} (max lvl ${Math.max(0, ...Object.values(ST.ist(s).colonies).map((C) => C.lvl))}), dyson ${ST.megaStage(s, 'dyson')}/10, gates ${Object.keys(ST.ist(s).gates).length} · met ${Object.keys(AL.al(s).known).length}, xenotech ${Object.keys(AL.al(s).xt).length}, deals ${Object.values(AL.al(s).known).map((k) => Object.keys(k.deals || {}).length).reduce((a, b) => a + b, 0)} · fleet ${Object.values(WR.war(s).ships).reduce((a, b) => a + b, 0)} ships (power ${Math.round(WR.power(WR.war(s).ships))}), hives ${WR.HIVE_ORDER.filter((h) => WR.war(s).hives[h + '_done']).length}/4 · relay ${BY.bey(s).relay}/6, galaxies ${Object.keys(BY.bey(s).visited).length}/6, achievements ${Object.keys(s.ach || {}).length}/30, ascension points ${BY.ascensionPoints(s)} · techs ${Object.keys(s.tech).length}/${Object.keys(TECH).length} · flights ${S.sp(s).flights} (lost ${fails}) · ${st ? 'STUCK on ' + st.id + ': ' + st.text : 'nothing stuck'}`);
if (st) { process.exitCode = 1; console.log('jobs:', s.jobs.filter((j) => j.kind === 'research').map((j) => j.tech + ' ends in ' + Math.round((j.end - t) / 86400000) + 'd').join(', '), 'slots', G.slotsBusy(s), '/', G.slotsTotal(s)); console.log('unresearched:', Object.keys(TECH).filter((k) => !s.tech[k]).map((k) => k + ' (' + G.canResearch(s, k).why + ')').join(', ')); console.log('res', JSON.stringify(Object.fromEntries(['credits','metal','science','exotic','rare','xeno','influence'].map((r) => [r, Math.round(s.res[r] || 0)]))), 'cap', JSON.stringify(Object.fromEntries(['exotic','science','credits'].map((r) => [r, Math.round(G.rates(s).cap[r])])))); }
