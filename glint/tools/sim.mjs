// Headless economy simulator: a player who cuts one stone every ~70 s (with real physics via the apprentice
// cutter at a given skill), buys rough, stocks cases, sells to simulated customers, buys upgrades and moves
// up the premises ladder. Prints the time to reach each tier.   node tools/sim.mjs [skill=8] [hours=8]
import { rng } from '../src/math.js';
import { TIERS, UPGRADES, upVal, upNext, MYSTERY, dealerStock, priceRough, makeCustomer, willBuy, repFor, makeOrder, meets, apprenticeCost, apprenticeMax, apprenticeTime, trainCost } from '../src/economy.js';
import { roughCarat } from '../src/stone.js';
import { apprenticeCut } from '../src/workshop.js';
import { fresh } from '../src/save.js';

const skill = +(process.argv[2] || 8), hours = +(process.argv[3] || 8);
const s = fresh(); s.money = 40; const R = rng(1234);
let t = 0, cutT = 0, custT = 0, stockT = 0, orderT = 120; const log = []; let stock = [], gemsMade = 0, sold = 0, revenue = 0; const vals = [];
const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n.toFixed(0));
const spawnInt = () => TIERS[s.tier].spawn / (upVal(s, 'decor') * upVal(s, 'ads'));
// tutorial gift
s.roughs.push({ id: 'a', sp: 'quartz', vid: 'amethyst', seed: 424242, size: 9.5, clarity: 0.12, tone: 1.02, known: true }, { id: 'b', sp: 'garnet', vid: 'rhodolite', seed: 77177, size: 5.2, clarity: 0.2, tone: 1, known: true });
const priority = ['clerk', 'machine', 'refract', 'hammer', 'lights', 'decor', 'ads', 'loupe', 'planner', 'polisher', 'vault'];
while (t < hours * 3600 && s.tier < 4) {
  const saving = TIERS[s.tier + 1] && s.rep >= TIERS[s.tier + 1].rep * 0.8; const dt = 5; t += dt; cutT += dt; custT += dt; stockT -= dt; orderT -= dt;
  if (stockT <= 0) { stock = dealerStock(R, s.tier, 6).map((r) => ({ ...r, price: priceRough(r, roughCarat(r)) })); stockT = 240; }
  // buy rough: best value-per-dollar from the dealer, else a mystery rock of the best unlocked bin
  if (s.roughs.length < 2) {
    const aff = stock.filter((r) => !r.sold && r.price <= s.money * 0.6).sort((a, b) => b.price - a.price);
    if (aff.length) { const r = aff[0]; r.sold = true; s.money -= r.price; s.roughs.push({ ...r, paid: r.price }); }
    else { const bins = MYSTERY.filter((b) => b.tier <= s.tier && b.price <= s.money * 0.5).sort((a, b) => b.price - a.price); if (bins.length) { const b = bins[0]; s.money -= b.price; const r = { ...dealerStock(R, b.tier, 1)[0], paid: b.price }; s.roughs.push(r); } }
  }
  // cut one stone every 70 s
  if (cutT >= 70 && s.roughs.length) { cutT = 0; s.roughs.sort((a, b) => (b.paid || 0) - (a.paid || 0)); const r = s.roughs.shift(); const g = apprenticeCut(s, r, skill); s.gems.push(g); gemsMade++; vals.push(g.value); const i = s.cases.indexOf(null); if (i >= 0) s.cases[i] = g.id; else if (s.gems.length > s.cases.length + 2) { const w = s.gems.find((x) => !s.cases.includes(x.id)); s.gems.splice(s.gems.indexOf(w), 1); s.money += Math.round(w.value * 0.62); s.rep += repFor(w) * 0.4; } }
  // apprentices: hire + train when cheap relative to cash, each cuts from the rough pile
  if (!saving && s.staff.length < apprenticeMax(s.tier) && apprenticeCost(s.staff.length) < s.money * 0.3) { s.money -= apprenticeCost(s.staff.length); s.staff.push({ skill: 1, t: 0 }); }
  for (const a of s.staff) { if (!saving && a.skill < 10 && trainCost(a.skill) < s.money * 0.08) { s.money -= trainCost(a.skill); a.skill++; } a.t += dt; if (a.t >= apprenticeTime(a.skill) && s.roughs.length) { a.t = 0; s.roughs.sort((x, y) => (y.paid || 0) - (x.paid || 0)); const g = apprenticeCut(s, s.roughs.pop(), a.skill); s.gems.push(g); gemsMade++; const i = s.cases.indexOf(null); if (i >= 0) s.cases[i] = g.id; } }
  if (s.roughs.length < 1 + s.staff.length) { const aff = stock.filter((r) => !r.sold && r.price <= s.money * 0.12).sort((a, b) => b.price - a.price); if (aff.length) { const r = aff[0]; r.sold = true; s.money -= r.price; s.roughs.push({ ...r, paid: r.price }); } }
  // customers
  if (custT >= spawnInt()) { custT = 0; const c = makeCustomer(R, s); const idx = s.cases.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
    for (let k = 0; k < 3 && idx.length; k++) { const i = idx[Math.floor(R() * idx.length)]; const g = s.gems.find((x) => x.id === s.cases[i]); const price = Math.round(g.value * s.markup); const res = willBuy(c, g, price, upVal(s, 'lights'), R);
      if (res.buy || (res.offer && res.offer >= price * 0.85)) { const p = res.buy ? price : res.offer; s.money += p; revenue += p; sold++; s.rep += repFor(g); s.gems.splice(s.gems.indexOf(g), 1); s.cases[i] = null; const n = s.gems.find((x) => !s.cases.includes(x.id)); if (n) s.cases[i] = n.id; break; } } }
  // commissions: fulfil if something fits
  if (orderT <= 0) { orderT = 150; if (s.orders.length < 3) s.orders.push(makeOrder(R, s)); }
  for (const o of s.orders.slice()) { const g = s.gems.find((x) => meets(o, x)); if (g) { s.money += o.reward; s.rep += o.rep; s.gems.splice(s.gems.indexOf(g), 1); const ci = s.cases.indexOf(g.id); if (ci >= 0) s.cases[ci] = null; s.orders.splice(s.orders.indexOf(o), 1); s.stats.orders++; } }
  // upgrades (keep a reserve for rough)

  for (const id of priority) { const n = upNext(s, id); if (!saving && n && n.cost < s.money * 0.4) { s.money -= n.cost; s.up[id] = (s.up[id] || 0) + 1; } }
  const N = TIERS[s.tier + 1]; if (N && s.rep >= N.rep && s.money >= N.cost * 1.1) { s.money -= N.cost; s.tier++; while (s.cases.length < N.cases) s.cases.push(null); log.push(`${(t / 60).toFixed(0).padStart(4)} min  → ${N.name.padEnd(14)} gems ${gemsMade}, sold ${sold}, median gem $${fmt(vals.slice(-20).sort((a, b) => a - b)[10] || 0)}`); }
  if (t % 1800 < dt) log.push(`${(t / 60).toFixed(0).padStart(4)} min    money $${fmt(s.money)} rep ${s.rep.toFixed(0)} tier ${s.tier} gems ${gemsMade} sold ${sold} (${(revenue / Math.max(1, t / 60)).toFixed(0)}/min) orders ${s.stats.orders}`);
}
console.log(`skill ${skill}\n` + log.join('\n'));
