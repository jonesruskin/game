// GLINT: the business. Shop tiers, tools, the rough market (dealer, mystery rocks, auctions, expeditions),
// customers and their wishes, commissions, apprentices, achievements. Pure data + logic (no DOM).
import { rng, clamp } from './math.js';
import { SPECIES, SPECIES_IDS, variety, familyOf, FAMILY } from './species.js';
import { CUTS } from './cuts.js';

// ---------- shop tiers ----------
export const TIERS = [
  { name: 'Market Stall', rep: 0, cost: 0, cases: 3, budget: 600, spawn: 26, cuts: ['round', 'oval', 'cushion'], blurb: 'A folding table, a velvet cloth and a dream.' },
  { name: 'Corner Shop', rep: 120, cost: 2500, cases: 5, budget: 4500, spawn: 22, cuts: ['emerald', 'pear'], blurb: 'A real door with a real bell. Expeditions unlocked.' },
  { name: 'Boutique', rep: 480, cost: 30000, cases: 7, budget: 32000, spawn: 19, cuts: ['marquise', 'princess', 'trillion'], blurb: 'Brass, glass and gossip. Auctions unlocked.' },
  { name: 'Grand Salon', rep: 2000, cost: 250000, cases: 9, budget: 260000, spawn: 17, cuts: ['asscher', 'radiant'], blurb: 'Chandeliers. Clients who arrive by limousine.' },
  { name: 'Maison Royale', rep: 7000, cost: 3000000, cases: 12, budget: 2600000, spawn: 15, cuts: [], blurb: 'By appointment to Their Majesties.' },
];
export const tierCuts = (tier) => TIERS.slice(0, tier + 1).flatMap((t) => t.cuts);
export const tierSpecies = (tier) => SPECIES_IDS.filter((s) => SPECIES[s].tier <= tier + 1);

// ---------- tools & upgrades ----------
// each: levels[] of { cost, label, v (effect value) }
export const UPGRADES = {
  hammer: { name: 'Hammer', icon: 'hammer', cat: 'tools', desc: 'Fewer taps to crack a rock open.', levels: [{ cost: 0, label: 'Iron hammer', v: 4 }, { cost: 120, label: 'Steel hammer', v: 3 }, { cost: 2400, label: 'Tungsten hammer', v: 2 }, { cost: 60000, label: 'Sonic splitter', v: 1 }] },
  loupe: { name: 'Inclusion Scope', icon: 'loupe', cat: 'tools', desc: 'See flaws hidden inside the rough while planning your cut.', levels: [{ cost: 0, label: 'Naked eye', v: 0.25 }, { cost: 250, label: '10× loupe', v: 0.6 }, { cost: 6000, label: 'Microscope', v: 1 }, { cost: 140000, label: 'X-ray mapper', v: 1.5 }] },
  refract: { name: 'Refractometer', icon: 'prism', cat: 'tools', desc: 'Reads the stone\'s refractive index and marks the sweet-spot angles on your dial.', levels: [{ cost: 0, label: 'None', v: 0 }, { cost: 600, label: 'Hand refractometer', v: 1 }, { cost: 18000, label: 'Digital refractometer', v: 2 }] },
  machine: { name: 'Faceting Machine', icon: 'machine', cat: 'tools', desc: 'A steadier mast widens the perfect-meet window.', levels: [{ cost: 0, label: 'Old jamb-peg', v: 0.022 }, { cost: 400, label: 'Mast machine', v: 0.032 }, { cost: 9000, label: 'Precision mast', v: 0.045 }, { cost: 220000, label: 'Laser stop', v: 0.07 }] },
  polisher: { name: 'Polishing Lap', icon: 'lap', cat: 'tools', desc: 'Polish faster. The last level polishes the whole stone in one go.', levels: [{ cost: 0, label: 'Cerium lap', v: 1 }, { cost: 300, label: 'Tin lap', v: 1.7 }, { cost: 7000, label: 'Diamond paste', v: 2.6 }, { cost: 90000, label: 'Auto-polisher', v: 99 }] },
  planner: { name: 'Planning Scanner', icon: 'scan', cat: 'tools', desc: 'Suggests the most valuable way to place your cut inside the rough.', levels: [{ cost: 0, label: 'Eyeball it', v: 0 }, { cost: 1500, label: 'Yield optimiser', v: 1 }, { cost: 50000, label: 'Clarity-aware optimiser', v: 2 }] },
  lights: { name: 'Showcase Lights', icon: 'lamp', cat: 'shop', desc: 'Pin spots in your cases make stones blaze. Customers pay more.', levels: [{ cost: 0, label: 'Bare bulbs', v: 1 }, { cost: 350, label: 'Halogen pins', v: 1.06 }, { cost: 5000, label: 'Fibre-optic spots', v: 1.12 }, { cost: 120000, label: 'Daylight LED rig', v: 1.2 }, { cost: 2500000, label: 'Museum lighting', v: 1.3 }] },
  decor: { name: 'Décor', icon: 'decor', cat: 'shop', desc: 'A finer room draws more passers-by inside.', levels: [{ cost: 0, label: 'Bare', v: 1 }, { cost: 500, label: 'Potted palm', v: 1.12 }, { cost: 9000, label: 'Persian rug', v: 1.25 }, { cost: 160000, label: 'Marble & brass', v: 1.4 }, { cost: 3000000, label: 'Chandelier', v: 1.6 }] },
  ads: { name: 'Advertising', icon: 'ad', cat: 'shop', desc: 'Get the word out. More customers per minute.', levels: [{ cost: 0, label: 'Word of mouth', v: 1 }, { cost: 800, label: 'Handbills', v: 1.15 }, { cost: 15000, label: 'Newspaper', v: 1.3 }, { cost: 300000, label: 'Radio jingle', v: 1.5 }, { cost: 6000000, label: 'Billboard', v: 1.75 }] },
  clerk: { name: 'Sales Clerk', icon: 'clerk', cat: 'staff', desc: 'Sells from your cases while you\'re at the bench, and while you\'re away (offline sales).', levels: [{ cost: 0, label: 'Nobody', v: 0 }, { cost: 1800, label: 'Part-time clerk (2 h away)', v: 2 }, { cost: 35000, label: 'Full-time clerk (6 h)', v: 6 }, { cost: 700000, label: 'Head of sales (12 h)', v: 12 }] },
  vault: { name: 'Vault', icon: 'vault', cat: 'shop', desc: 'Room for more cut gems and roughs.', levels: [{ cost: 0, label: 'Shoebox', v: 24 }, { cost: 600, label: 'Safe', v: 48 }, { cost: 12000, label: 'Strongroom', v: 96 }, { cost: 250000, label: 'Bank vault', v: 200 }] },
};
export const upLevel = (save, id) => save.up[id] || 0;
export const upVal = (save, id) => UPGRADES[id].levels[upLevel(save, id)].v;
export const upNext = (save, id) => UPGRADES[id].levels[upLevel(save, id) + 1] || null;

// ---------- apprentices ----------
export const APPRENTICE_NAMES = ['Ines', 'Tobias', 'Mirela', 'Kofi', 'Hana', 'Pavel', 'Lucía', 'Oskar', 'Amara', 'Jun'];
export const apprenticeCost = (n) => [900, 14000, 220000, 3500000][n] || Infinity;
export const trainCost = (skill) => Math.round(250 * Math.pow(2.15, skill));
export const apprenticeMax = (tier) => [1, 2, 3, 4, 4][tier];
export const apprenticeTime = (skill) => 95 - skill * 6; // seconds per stone

// ---------- rough generation ----------
let UID = Date.now() % 100000;
export const uid = () => (++UID).toString(36) + Math.floor(Math.random() * 1296).toString(36);
export function rollRough(R, opt = {}) {
  const tier = opt.tier ?? 0; const pool = opt.species || tierSpecies(tier);
  const sp = opt.sp || R.weighted(pool, (s) => (SPECIES[s].tier === tier + 1 ? 1.6 : 1) / Math.pow(1.5, SPECIES[s].tier - 1) * (opt.richer ? Math.pow(1.6, SPECIES[s].tier - 1) : 1));
  const S = SPECIES[sp]; const luck = opt.luck || 1;
  const V = opt.vid ? variety(sp, opt.vid) : R.weighted(S.vars, (v) => v.w * (v.rare ? Math.pow(luck, v.rare) : 1));
  const size = R.range(S.size[0], S.size[1]) * (opt.big ? R.range(1.25, 1.6) : 1);
  const clarity = clamp(S.clarity * R.range(0.3, 1.7) + (opt.clean ? -0.2 : 0), 0, 1);
  const tone = clamp(1 + R.gauss() * 0.13, 0.7, 1.35);
  return { id: uid(), sp, vid: V.id, seed: Math.floor(R() * 1e9), size: +size.toFixed(2), clarity: +clarity.toFixed(2), tone: +tone.toFixed(2), rare: V.rare || 0, src: opt.src || 'dealer', known: opt.known !== false };
}
// rough → expected value of a decently cut gem (for pricing)
export function roughEstimate(r, ct) {
  const V = variety(r.sp, r.vid); const gct = ct * 0.24; const tone = 1.12 - Math.abs(r.tone - 1) * 1.6; const clar = 1.25 - r.clarity * 0.55;
  return V.ppc * Math.pow(Math.max(0.05, gct), 1.28) * 1.1 * clamp(tone, 0.6, 1.12) * clar;
}
export const MYSTERY = [
  { id: 'gravel', name: 'River Gravel', tier: 0, price: 24, luck: 1, desc: 'Tumbled pebbles from the riverbank. Mostly quartz… mostly.' },
  { id: 'tailings', name: 'Mine Tailings', tier: 1, price: 380, luck: 1.6, desc: 'Leftovers from a gem mine. Miners miss things.' },
  { id: 'vein', name: 'Deep Vein Ore', tier: 2, price: 4800, luck: 2.4, desc: 'Hard rock from a pocket deep underground.', richer: true },
  { id: 'royal', name: 'Royal Geode', tier: 3, price: 60000, luck: 3.6, desc: 'Sealed geodes from a crown estate. Anything could be inside.', richer: true },
  { id: 'kimberlite', name: 'Kimberlite Pipe', tier: 4, price: 900000, luck: 5, desc: 'Blue ground from a volcanic pipe: home of diamonds.', sp: 'diamond' },
];
export const REGIONS = [
  { id: 'brazil', name: 'Minas Gerais, Brazil', tier: 1, species: ['quartz', 'topaz', 'aquamarine', 'tourmaline', 'morganite'], icon: 'palm' },
  { id: 'srilanka', name: 'Ratnapura, Sri Lanka', tier: 1, species: ['garnet', 'iolite', 'zircon', 'spinel', 'chrysoberyl', 'sapphire', 'taaffeite'], icon: 'river' },
  { id: 'tanzania', name: 'Merelani, Tanzania', tier: 2, species: ['tanzanite', 'garnet', 'spinel', 'tourmaline'], icon: 'mountain' },
  { id: 'afghan', name: 'Nuristan, Afghanistan', tier: 2, species: ['kunzite', 'tourmaline', 'aquamarine', 'spinel'], icon: 'mountain' },
  { id: 'madagascar', name: 'Tuléar, Madagascar', tier: 3, species: ['sphene', 'sapphire', 'morganite', 'garnet'], icon: 'palm' },
  { id: 'california', name: 'San Benito, California', tier: 3, species: ['benitoite', 'kunzite', 'tourmaline'], icon: 'mine' },
  { id: 'colombia', name: 'Muzo, Colombia', tier: 3, species: ['emerald', 'quartz'], icon: 'jungle' },
  { id: 'myanmar', name: 'Mogok, Myanmar', tier: 3, species: ['ruby', 'sapphire', 'spinel', 'peridot'], icon: 'temple' },
  { id: 'botswana', name: 'Jwaneng, Botswana', tier: 4, species: ['diamond'], icon: 'mine' },
];
export const EXPEDITIONS = [{ min: 5, cost: 1, n: 2 }, { min: 30, cost: 4, n: 5 }, { min: 120, cost: 12, n: 12 }, { min: 480, cost: 36, n: 30 }];
export const expeditionCost = (tier, e) => Math.round(TIERS[Math.max(1, tier)].budget * 0.25 * e.cost);

// dealer stock: a handful of visible roughs, refreshed every few minutes
export function dealerStock(R, tier, n = 6) {
  const out = []; for (let i = 0; i < n; i++) { const r = rollRough(R, { tier, src: 'dealer' }); out.push(r); } return out;
}
export const priceRough = (r, ct, markup = 0.42) => Math.max(5, Math.round(roughEstimate(r, ct) * markup));

// ---------- customers ----------
export const ARCH = [
  { id: 'tourist', name: 'Tourist', bud: [0.25, 0.9], want: 'any', pat: 0.6, lines: ['Ooh, shiny! Something to remember the trip by?', 'What\'s nice for a souvenir?', 'I have a bit of holiday money to spend.'] },
  { id: 'couple', name: 'Young Couple', bud: [0.8, 2.2], want: 'family', cutPref: ['round', 'oval', 'cushion', 'pear'], pat: 0.5, lines: ['We\'re getting engaged! She loves {fam}.', 'Something {fam} for the ring, please.', 'Our song is about {fam}. Long story.'] },
  { id: 'collector', name: 'Collector', bud: [1.4, 3.6], want: 'species', pat: 0.8, lines: ['I\'m missing a fine {sp} in my cabinet.', 'Only {sp} interests me today.', 'Show me your best {sp}.'] },
  { id: 'gran', name: 'Grandmother', bud: [0.6, 1.6], want: 'family', pat: 0.9, lines: ['A {fam} stone for my granddaughter\'s birthday, dear.', 'My late husband gave me {fam} stones. Something like that.'] },
  { id: 'banker', name: 'Banker', bud: [2, 5], want: 'big', pat: 0.4, lines: ['Carats. I want carats. Biggest you have.', 'Something that looks expensive. Because it is.'] },
  { id: 'star', name: 'Influencer', bud: [1, 3], want: 'sparkle', pat: 0.35, lines: ['It has to SPARKLE on camera. Excellent cut or better!', 'My followers want fire. Show me fire.'] },
  { id: 'artist', name: 'Painter', bud: [0.5, 1.8], want: 'rare', pat: 0.7, lines: ['I chase colours nobody has seen. Anything unusual?', 'Rare colour, please. The rarer the better.'] },
  { id: 'scientist', name: 'Geologist', bud: [0.7, 2], want: 'clean', pat: 0.8, lines: ['Flawless or close to it. VS or better.', 'I want a clean stone. I\'ll be checking with my loupe.'] },
];
export const VIP = [
  { id: 'duchess', name: 'The Duchess', title: 'Lady Ashcombe' }, { id: 'tycoon', name: 'Shipping Tycoon', title: 'Mr. Vandermeer' }, { id: 'diva', name: 'Opera Diva', title: 'Signora Ricci' },
  { id: 'prince', name: 'Crown Prince', title: 'His Highness Amir' }, { id: 'film', name: 'Film Star', title: 'Miss Delacroix' }, { id: 'curator', name: 'Museum Curator', title: 'Dr. Okafor' },
];
export function makeCustomer(R, save) {
  const tier = save.tier; const A = R.pick(ARCH); const base = TIERS[tier].budget;
  const c = { id: uid(), arch: A.id, name: A.name, budget: Math.round(base * R.range(A.bud[0], A.bud[1])), pat: A.pat, look: R.int(0, 9999) };
  const owned = tierSpecies(tier);
  if (A.want === 'family') c.fam = R.pick(['red', 'pink', 'orange', 'yellow', 'green', 'blue', 'purple', 'white']);
  if (A.want === 'species') c.sp = R.pick(owned);
  if (A.cutPref) c.cuts = A.cutPref;
  c.want = A.want; c.line = R.pick(A.lines).replace('{fam}', c.fam ? FAMILY[c.fam].toLowerCase() : '').replace('{sp}', c.sp ? SPECIES[c.sp].name.toLowerCase() : '');
  return c;
}
// how much a customer likes a gem (0 = not at all, 1 = good match, 1.4 = perfect)
export function desire(c, g) {
  let s = 0.75;
  if (c.fam) s = familyOf(g.sp, g.vid) === c.fam ? 1.2 : 0.15;
  if (c.sp) s = g.sp === c.sp ? 1.25 : 0.1;
  if (c.want === 'big') s = 0.7 + Math.min(0.6, g.ct / 8);
  if (c.want === 'sparkle') s = ['Ideal', 'Excellent'].includes(g.cutG) ? 1.3 : 0.35;
  if (c.want === 'rare') s = (variety(g.sp, g.vid).rare || 0) > 0 ? 1.1 + 0.1 * variety(g.sp, g.vid).rare : 0.3;
  if (c.want === 'clean') s = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2'].includes(g.clarity) ? 1.2 : 0.2;
  if (c.cuts) s *= c.cuts.includes(g.cut) ? 1.1 : 0.8;
  if (g.cutG === 'Ideal') s *= 1.08;
  return s;
}
// will they buy at this price? returns {buy, offer} (offer = their counter if close)
export function willBuy(c, g, price, lights, R) {
  const d = desire(c, g); if (d < 0.5) return { buy: false };
  const wtp = g.value * (0.92 + 0.38 * d) * lights * R.range(0.92, 1.1);
  const cap = Math.min(c.budget * 1.08, wtp);
  if (price <= cap) return { buy: true, d };
  if (price <= cap * 1.4 && cap >= g.value * 0.75) return { buy: false, offer: Math.round(cap / 10) * 10 || Math.round(cap), d };
  return { buy: false, d };
}

// ---------- commissions (VIP orders) ----------
export function makeOrder(R, save) {
  const tier = save.tier; const V = R.pick(VIP); const sps = tierSpecies(tier); const cuts = tierCuts(tier);
  const sp = R.weighted(sps, (s) => Math.pow(1.7, SPECIES[s].tier)); const S = SPECIES[sp];
  const kind = R.pick(['species', 'species', 'family', 'cut']);
  const o = { id: uid(), vip: V.id, who: V.title, role: V.name, time: R.int(10, 18) * 60, born: 0 };
  const avgCt = caratGuess(sp); o.minCt = +(avgCt * R.range(0.5, 0.95)).toFixed(1);
  if (kind === 'family') { o.fam = familyOf(sp, S.vars[0].id); } else o.sp = sp;
  if (kind === 'cut' || R.chance(0.35)) o.cut = R.pick(cuts);
  o.minCut = R.pick(['Good', 'Very Good', 'Very Good', 'Excellent']);
  o.minClar = R.chance(0.4) ? R.pick(['VS2', 'VS1', 'SI1']) : null;
  const ref = S.vars[0].ppc * Math.pow(Math.max(0.3, o.minCt), 1.28) * 1.3;
  o.reward = Math.round(ref * R.range(2, 2.8) / 10) * 10; o.rep = Math.round(10 + 8 * (tier + 1) + (o.cut ? 4 : 0) + (o.minClar ? 4 : 0));
  return o;
}
function caratGuess(sp) { const S = SPECIES[sp]; const r = (S.size[0] + S.size[1]) / 2; return r * r * r * 4.2 * 0.001 * S.sg * 5 * 0.22; }
const CUTRANK = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent', 'Ideal'];
const CLARANK = ['I3', 'I2', 'I1', 'SI2', 'SI1', 'VS2', 'VS1', 'VVS2', 'VVS1', 'IF', 'FL'];
export function meets(o, g) {
  if (o.sp && g.sp !== o.sp) return false; if (o.fam && familyOf(g.sp, g.vid) !== o.fam) return false; if (o.cut && g.cut !== o.cut) return false;
  if (g.ct < o.minCt) return false; if (CUTRANK.indexOf(g.cutG) < CUTRANK.indexOf(o.minCut)) return false; if (o.minClar && CLARANK.indexOf(g.clarity) < CLARANK.indexOf(o.minClar)) return false; return true;
}
export const orderText = (o) => `${o.minCt}+ ct ${o.sp ? SPECIES[o.sp].name : FAMILY[o.fam] + ' gem'}${o.cut ? ', ' + CUTS[o.cut].name + ' cut' : ''} · ${o.minCut}+ cut${o.minClar ? ' · ' + o.minClar + '+' : ''}`;

// reputation earned for a sale
export function repFor(g) { const c = { Ideal: 4, Excellent: 2.5, 'Very Good': 1.5, Good: 1, Fair: 0.5, Poor: 0.2 }[g.cutG] || 1; const r = (variety(g.sp, g.vid).rare || 0) * 1.5; const t = SPECIES[g.sp].tier; return Math.round((c + r) * (1 + (t - 1) * 0.5) * (1 + 0.45 * Math.max(0, Math.log10(Math.max(1, g.value)) - 2)) * 10) / 10; }

// ---------- achievements ----------
export const ACH = [
  { id: 'first', name: 'First Facet', desc: 'Cut your first gem.', test: (s) => s.stats.cut >= 1, reward: 50 },
  { id: 'ten', name: 'Journeyman', desc: 'Cut 10 gems.', test: (s) => s.stats.cut >= 10, reward: 300 },
  { id: 'hundred', name: 'Master Cutter', desc: 'Cut 100 gems.', test: (s) => s.stats.cut >= 100, reward: 25000 },
  { id: 'ideal', name: 'Hearts & Arrows', desc: 'Cut an Ideal-grade gem.', test: (s) => s.stats.ideal >= 1, reward: 400 },
  { id: 'ideal10', name: 'Optical Perfection', desc: 'Cut 10 Ideal gems.', test: (s) => s.stats.ideal >= 10, reward: 8000 },
  { id: 'flawless', name: 'Flawless', desc: 'Cut an FL clarity gem.', test: (s) => s.stats.fl >= 1, reward: 300 },
  { id: 'perfect', name: 'Perfect Meet', desc: 'Hit 3 perfect meets on one stone.', test: (s) => s.stats.perfect3 >= 1, reward: 250 },
  { id: 'k1', name: 'Four Figures', desc: 'Appraise a gem over $1,000.', test: (s) => s.stats.best >= 1000, reward: 200 },
  { id: 'k100', name: 'Six Figures', desc: 'Appraise a gem over $100,000.', test: (s) => s.stats.best >= 1e5, reward: 20000 },
  { id: 'm1', name: 'The Million-Dollar Stone', desc: 'Appraise a gem over $1,000,000.', test: (s) => s.stats.best >= 1e6, reward: 200000 },
  { id: 'carat10', name: 'Heavyweight', desc: 'Cut a gem of 10 carats or more.', test: (s) => s.stats.maxCt >= 10, reward: 500 },
  { id: 'rare', name: 'Lucky Strike', desc: 'Find an Exceptional or Legendary variety.', test: (s) => s.stats.maxRare >= 3, reward: 1000 },
  { id: 'legend', name: 'Legend', desc: 'Find a Legendary variety.', test: (s) => s.stats.maxRare >= 4, reward: 100000 },
  { id: 'sale', name: 'Open for Business', desc: 'Sell a gem from your cases.', test: (s) => s.stats.sold >= 1, reward: 40 },
  { id: 'sale50', name: 'Shopkeeper', desc: 'Sell 50 gems from your cases.', test: (s) => s.stats.sold >= 50, reward: 5000 },
  { id: 'order', name: 'By Appointment', desc: 'Fulfil a commission.', test: (s) => s.stats.orders >= 1, reward: 300 },
  { id: 'order10', name: 'Society Jeweller', desc: 'Fulfil 10 commissions.', test: (s) => s.stats.orders >= 10, reward: 15000 },
  { id: 'haggle', name: 'Silver Tongue', desc: 'Win a haggle with a counter-offer.', test: (s) => s.stats.haggleWins >= 1, reward: 150 },
  { id: 'tier2', name: 'Bricks & Mortar', desc: 'Move into the Corner Shop.', test: (s) => s.tier >= 1, reward: 500 },
  { id: 'tier3', name: 'Boutique', desc: 'Open a Boutique.', test: (s) => s.tier >= 2, reward: 5000 },
  { id: 'tier4', name: 'Grand Salon', desc: 'Open the Grand Salon.', test: (s) => s.tier >= 3, reward: 60000 },
  { id: 'tier5', name: 'Maison Royale', desc: 'Earn the Royal Warrant.', test: (s) => s.tier >= 4, reward: 1000000 },
  { id: 'codex10', name: 'Curious Mind', desc: 'Discover 10 varieties.', test: (s) => Object.keys(s.codex).length >= 10, reward: 1500 },
  { id: 'codex30', name: 'Mineralogist', desc: 'Discover 30 varieties.', test: (s) => Object.keys(s.codex).length >= 30, reward: 60000 },
  { id: 'daily', name: 'Stone of the Day', desc: 'Cut a Daily Stone.', test: (s) => s.stats.dailies >= 1, reward: 200 },
  { id: 'apprentice', name: 'Passing It On', desc: 'Hire an apprentice.', test: (s) => s.staff.length >= 1, reward: 300 },
];
