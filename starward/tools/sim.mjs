// STARWARD balance sim: a greedy bot plays the real game rules from a fresh save on a realistic schedule
// (awake 08:00-23:00, sleeping overnight while production continues) and reports when each objective lands.
//   node tools/sim.mjs                         engaged player: checks in every 10 min, first 40 min focused
//   STEP=10800 node tools/sim.mjs              casual player: checks in every 3 hours
//   FOCUS=90 MIN=1 STEP=20 DAYS=0.1 node tools/sim.mjs   the first session, minute by minute
//   SNAP=1 ...                                 add an economy snapshot every 2 days (caps, income, idle crews)
// Use it after any balance change: nothing may get stuck, and the milestone days should stay on target
// (DESIGN.md §10). Outcomes are random (launch failures), so run it a few times.
const root = new URL('../src/', import.meta.url).href;
const { fresh } = await import(root + 'core/state.js');
const G = await import(root + 'core/game.js');
const S = await import(root + 'core/space.js');
const { BUILDINGS } = await import(root + 'data/buildings.js');
const { TECH } = await import(root + 'data/research.js');
const { LAYOUTS } = await import(root + 'data/layouts.js');
const { ROCKETS, MISSIONS } = await import(root + 'data/space.js');
const { allSteps } = await import(root + 'data/objectives.js');

const env = (k, d) => (process.env[k] !== undefined ? Number(process.env[k]) : d);
const STEP = env('STEP', 600), DAYS = env('DAYS', 150), FOCUS = env('FOCUS', 40);
const s = fresh(); let t = Date.UTC(2026, 0, 1, 8); s.last = t; const t0 = t; s.tut = 1;
const STEPS = allSteps(); const log = [];
const when = (x) => (process.env.MIN ? Math.round((x - t0) / 60000) + ' min' : ((x - t0) / 86400000).toFixed(2) + ' d');
const focused = () => t - t0 < FOCUS * 60000; // a new player doing exactly what the objective panel says
const GOALS = ['rocketry', 'liquidProp', 'multistage', 'guidance', 'orbital', 'satComms', 'lifeSupport', 'crewed', 'deepSpace', 'additive', 'spaceStation', 'alloys', 'heavy', 'lunarLanders', 'closedLoop', 'isru', 'he3Mining', 'lunarHabitats'];
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
  const st = G.currentStep(s); if (st && st.kind === 'build' && BUILDINGS[st.b].bases.includes(base)) return [st.b];
  const need = G.reqsMissing(s, base, cmd(base), G.hqLevel(s, base) + 1).map(([b]) => b).filter((b) => !Object.values(s.bases[base].lots).some((l) => l.b === b));
  if (lots(base).length <= 1 && !need.length) return []; // keep a lot spare for whatever the campaign asks next
  const R = G.rates(s); const list = base === 'earth' ? ['research', 'mine', 'office', 'refinery', 'solar', 'depot', 'vab', 'tracking', 'academy', 'university', 'fission'] : ['he3x', 'regolith', 'lsolar', 'ice', 'llab', 'dome', 'massDriver'];
  if (R.gen - R.draw < 15) list.unshift(base === 'earth' ? (s.tech.fission ? 'fission' : 'solar') : 'lsolar');
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
  if (st) { if (st.kind === 'flag') { const m = Object.keys(MISSIONS).find((k) => MISSIONS[k].flag === st.flag); if (m) order.push({ mission: m }); } if (st.kind === 'sat') order.push({ sat: st.sat }); if (st.kind === 'module') order.push({ module: st.mod }); if (st.kind === 'rockets') order.push(null); }
  if (focused()) return order.slice(0, 1);
  for (const k of ['comms', 'observe', 'weather', 'telescope', 'nav']) order.push({ sat: k });
  for (const k of ['core', 'lab', 'solar']) order.push({ module: k });
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
let fails = 0; const W = { idle: 0, lab: 0, n: 0 }; let snapT = t0;
while (t < t0 + DAYS * 86400000) {
  const h = new Date(t).getUTCHours(); const awake = h >= 8 && h < 23;
  const notes = G.advance(s, t); fails += notes.filter((x) => x.kind === 'fail').length;
  if (awake) { W.n++; if (G.crewsBusy(s) < G.crewsTotal(s)) W.idle++; if (G.slotsBusy(s) < G.slotsTotal(s)) W.lab++; }
  if (process.env.SNAP && t - snapT >= 2 * 86400000) { snapT = t; const R = G.rates(s); const r = (k) => `${k} ${Math.round(s.res[k])}/${Math.round(R.cap[k])} (+${Math.round(R.prod[k])}/h)`;
    log.push(`    [${when(t)}] HQ${G.hqLevel(s)} techs ${Object.keys(s.tech).length} crews ${G.crewsTotal(s)} idle ${Math.round((W.idle / W.n) * 100)}% lab idle ${Math.round((W.lab / W.n) * 100)}% · ${['credits', 'metal', 'fuel', 'science'].map(r).join(' · ')}`); Object.assign(W, { idle: 0, lab: 0, n: 0 }); }
  if (awake) { for (let k = 0; k < 8; k++) { const st = G.claimStep(s); if (!st) break; log.push(`${when(t).padStart(9)}  ✓ ${st.id.padEnd(4)} ${st.text}`); } research(); construct(); fly(); }
  if (s.obj.i >= STEPS.length) { log.push(`${when(t).padStart(9)}  campaign complete`); break; }
  t += awake ? STEP * 1000 : 3600 * 1000;
}
const st = G.currentStep(s);
console.log(log.join('\n'));
console.log(`\nend ${when(t)} · Mission Control ${G.hqLevel(s)} · Colony Hub ${s.bases.moon ? G.hqLevel(s, 'moon') : '-'} · techs ${Object.keys(s.tech).length}/${Object.keys(TECH).length} · flights ${S.sp(s).flights} (lost ${fails}) · ${st ? 'STUCK on ' + st.id + ': ' + st.text : 'nothing stuck'}`);
if (st) process.exitCode = 1;
