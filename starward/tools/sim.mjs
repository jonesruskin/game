// STARWARD balance sim: a greedy bot plays the real game rules from a fresh save on a realistic schedule
// (awake 08:00-23:00, sleeping overnight while production continues) and reports when each objective lands.
//   node tools/sim.mjs                         engaged player: checks in every 10 min, first 40 min focused
//   STEP=10800 node tools/sim.mjs              casual player: checks in every 3 hours
//   FOCUS=90 MIN=1 STEP=20 DAYS=0.1 node tools/sim.mjs   the first session, minute by minute
//   SNAP=1 ...                                 add an economy snapshot every 2 days (caps, income, idle crews)
// Use it after any balance change: nothing may get stuck, and the milestone days should stay on target
// (DESIGN.md §10.1). Covers Parts 1-4: research, building, launches, probes, the fleet, voyages, colonies,
// terraforming, light sails, starships, star colonies, megastructures and gates. Outcomes are random (launch failures), so run it a few times.
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
  'laserSails', 'exoplanetology', 'starColonies', 'sleeperShips', 'dysonSwarm', 'casimirEffect', 'ramjets', 'domeWorlds', 'xenoarchaeology', 'interstellarTrade', 'warpTheory', 'wormholeGates', 'warpDrive'];
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
  const LISTS = { earth: ['research', 'mine', 'office', 'refinery', 'solar', 'depot', 'vab', 'tracking', 'academy', 'university', 'fission', 'fusion', 'elevator', 'casimir'], moon: ['he3x', 'regolith', 'lsolar', 'ice', 'llab', 'dome', 'greenhouse', 'massDriver', 'reactor'],
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
      const st2 = G.currentStep(s); const need = G.reqsMissing(s, base, cmd(base), G.hqLevel(s, base) + 1).map(([b]) => b).concat(st2 && st2.kind === 'buildOn' && st2.base === base ? [st2.b] : []).filter((b) => !Object.values(s.bases[base].lots).some((l) => l.b === b) && G.canBuild(s, base, 'nope', b).why !== 'Research ' + (BUILDINGS[b].req && BUILDINGS[b].req.tech && TECH[BUILDINGS[b].req.tech] ? TECH[BUILDINGS[b].req.tech].name : ''));
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
let fails = 0; const W = { idle: 0, lab: 0, n: 0 }; let snapT = t0;
while (t < t0 + DAYS * 86400000) {
  const h = new Date(t).getUTCHours(); const awake = h >= 8 && h < 23;
  const notes = G.advance(s, t); fails += notes.filter((x) => x.kind === 'fail').length;
  if (awake) { W.n++; if (G.crewsBusy(s) < G.crewsTotal(s)) W.idle++; if (G.slotsBusy(s) < G.slotsTotal(s)) W.lab++; }
  if (process.env.SNAP && t - snapT >= 2 * 86400000) { snapT = t; const R = G.rates(s); const r = (k) => `${k} ${Math.round(s.res[k])}/${Math.round(R.cap[k])} (+${Math.round(R.prod[k])}/h)`;
    log.push(`    [${when(t)}] HQ${G.hqLevel(s)} techs ${Object.keys(s.tech).length} crews ${G.crewsTotal(s)} idle ${Math.round((W.idle / W.n) * 100)}% lab idle ${Math.round((W.lab / W.n) * 100)}% · ${['credits', 'metal', 'science', 'rare', 'he3', 'exotic'].map(r).join(' · ')} · laser ${ST.megaStage(s, 'laser')} dyson ${ST.megaStage(s, 'dyson')}`); Object.assign(W, { idle: 0, lab: 0, n: 0 }); }
  if (awake) { for (let k = 0; k < 8; k++) { const st = G.claimStep(s); if (!st) break; log.push(`${when(t).padStart(9)}  ✓ ${st.id.padEnd(4)} ${st.text}`); } // like a player, save up for the megastructure or starship the campaign is asking for
    const st0 = G.currentStep(s); const saving = st0 && ((st0.kind === 'mega' && ST.canMega(s, st0.mega).why === 'Not enough resources') || (st0.kind === 'drive' && ST.canBuildDrive(s, st0.ship).why === 'Not enough resources'));
    if (s.tech.laserSails) interstellar(); research(); if (!saving) { construct(); fly(); if (s.tech.nuclearThermal) { shipyard(); voyages(); } } }
  if (s.obj.i >= STEPS.length) { log.push(`${when(t).padStart(9)}  campaign complete`); break; }
  t += awake ? STEP * 1000 : 3600 * 1000;
}
const st = G.currentStep(s);
console.log(log.join('\n'));
console.log(`\nend ${when(t)} · Mission Control ${G.hqLevel(s)} · hubs ${Object.keys(s.bases).filter((b) => b !== 'earth').map((b) => b + ' ' + G.hqLevel(s, b) + ' (' + Math.floor(s.bases[b].pop) + ' pop)').join(', ') || '-'} · sites ${Object.keys(SO.sol(s).sites).length} · terra ${SO.terraStage(s, 'mars')}/7 · stars surveyed ${Object.keys(ST.ist(s).surveyed).length}, colonies ${Object.keys(ST.ist(s).colonies).length} (max lvl ${Math.max(0, ...Object.values(ST.ist(s).colonies).map((C) => C.lvl))}), dyson ${ST.megaStage(s, 'dyson')}/10, gates ${Object.keys(ST.ist(s).gates).length} · techs ${Object.keys(s.tech).length}/${Object.keys(TECH).length} · flights ${S.sp(s).flights} (lost ${fails}) · ${st ? 'STUCK on ' + st.id + ': ' + st.text : 'nothing stuck'}`);
if (st) process.exitCode = 1;
