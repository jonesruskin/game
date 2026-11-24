// STARWARD affordability audit: every price in the game must fit in what a fully built Earth can store (capMax),
// except the funded megaprojects, which are paid in over time. Run after any balance change:  node tools/audit.mjs
const root = new URL('../src/', import.meta.url).href; const im = (m) => import(root + m);
const [AL, BY, SO, ST, WR, BLD, DS, DST, DSO, DW, DB, DA] = await Promise.all(['core/aliens.js', 'core/beyond.js', 'core/solar.js', 'core/stars.js', 'core/war.js', 'data/buildings.js', 'data/space.js', 'data/stars.js', 'data/solar.js', 'data/war.js', 'data/beyond.js', 'data/aliens.js'].map(im));
const bad = []; let n = 0;
const chk = (name, cost) => { n++; for (const r in cost) { const c = BLD.capMax(r); if (c > 0 && cost[r] > c) { bad.push(`${name}: ${r} ${(cost[r] / 1e6).toFixed(1)}M > ${(c / 1e6).toFixed(1)}M`); return; } } };
const lv = (spec, L) => { const c = {}; for (const r in spec) c[r] = Array.isArray(spec[r]) ? spec[r][0] * Math.pow(spec[r][1], L - 1) : spec[r]; return c; };
for (let L = 1; L <= 10; L++) chk('ruins dig ' + L, AL.digCost(L)); for (let L = 1; L <= 5; L++) chk('embassy ' + L, AL.embassyCost(L)); chk('uplift', AL.upliftCost());
for (const k in DA.XENOTECH) chk('xenotech ' + k, DA.XENOTECH[k].cost || {});
for (const id in DSO.SITES) for (let L = 1; L <= (DSO.SITES[id].max || DSO.SITE_MAX || 10); L++) chk(`site ${id} ${L}`, SO.siteCost(id, L));
for (const k in DSO.SHIPS) chk('ship ' + k, DSO.SHIPS[k].cost || {});
for (const id in DST.MEGA) if (!DST.MEGA[id].fund) for (let i = 0; i < DST.MEGA[id].stages; i++) chk(`mega ${id} ${i + 1}`, ST.megaCost(id, i));
for (let L = 1; L <= (DST.COLONY_MAX || 15); L++) chk('colony development ' + L, ST.devCost(L)); chk('gate', ST.gateCost());
for (let c = 0; c < 40; c++) { const s = { stars: { colonies: Object.fromEntries([...Array(c)].map((_, i) => ['x' + i, {}])) } }; chk(`found colony #${c + 1}`, ST.foundCost(s)); }
for (const k in DST.DRIVES) chk('drive ' + k, DST.DRIVES[k].cost || {});
for (const k in DW.WARSHIPS) chk('warship ' + k, WR.warCost(k, 1)); for (let L = 1; L <= DW.DEF_MAX; L++) chk('defence ' + L, DW.defCost(L));
for (const k in DS.ROCKETS) chk('rocket ' + k, DS.ROCKETS[k].cost);
for (const k in DS.MODULES || {}) for (let L = 1; L <= (DS.MODULES[k].max || 1); L++) chk(`module ${k} ${L}`, lv(DS.MODULES[k].cost, L));
for (const k in DS.SATS || {}) for (let L = 1; L <= (DS.SATS[k].max || 1); L++) chk(`satellite ${k} ${L}`, lv(DS.SATS[k].cost || {}, L));
console.log(`${n} prices checked against capMax (credits ${(BLD.capMax('credits') / 1e6).toFixed(0)}M, metal ${(BLD.capMax('metal') / 1e6).toFixed(0)}M, science ${(BLD.capMax('science') / 1e6).toFixed(0)}M)`);
console.log('funded (exempt): relay, ' + Object.keys(DB.EXPEDITIONS).length + ' expeditions, ' + Object.keys(DST.MEGA).filter((k) => DST.MEGA[k].fund).join(', '));
if (bad.length) { console.log('OVER STORAGE:\n  ' + bad.join('\n  ')); process.exitCode = 1; } else console.log('✓ every price fits');
