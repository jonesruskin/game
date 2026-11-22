// FUSEWORKS — all game content: shells, colours, enhancements, catalysts (jokers), charms, blueprints,
// bosses, launchers, heat levels, achievements and cosmetics. Pure data + small hook functions so the
// same rules run in the browser and in the headless balance simulator (tools/sim.mjs).

export const FIELD_AREA = 780_000; // world units² — the field aspect adapts to the screen, its area never changes
export const SHELL_R = 33; // visual radius of a shell in world units
export const MIN_GAP = 90; // minimum centre distance between shells

export const COLORS = {
  crimson: { name: 'Crimson', hex: '#ff3b5c', rgb: [1, 0.23, 0.36], deep: [0.55, 0.04, 0.12] },
  amber: { name: 'Amber', hex: '#ffb21e', rgb: [1, 0.7, 0.12], deep: [0.6, 0.28, 0.02] },
  azure: { name: 'Azure', hex: '#38b6ff', rgb: [0.22, 0.71, 1], deep: [0.04, 0.2, 0.55] },
  jade: { name: 'Jade', hex: '#35f0a0', rgb: [0.21, 0.94, 0.63], deep: [0.02, 0.4, 0.22] },
};
export const COLOR_IDS = Object.keys(COLORS);
export const CK = { crimson: 'c', amber: 'a', azure: 'z', jade: 'j' }; // markup letter per colour

// Zones (reach) — k: circle | ring | willow (circle + long drip below) | palm (circle + cone above) |
// cross (4 beams) | comet (flies onward) | spider (n nearest anywhere)
export const SHELLS = {
  peony: { name: 'Peony', sparks: 20, heat: 1, zone: { k: 'circle', r: 180 }, lv: [12, 1], desc: 'Bursts evenly in every direction.' },
  willow: { name: 'Willow', sparks: 30, heat: 1, zone: { k: 'willow', r: 112, w: 86, l: 430 }, lv: [15, 1], desc: 'Golden trails drip far below it.' },
  palm: { name: 'Palm', sparks: 25, heat: 1, zone: { k: 'palm', r: 102, l: 440, a: 0.42 }, lv: [12, 1], desc: 'Fronds shoot high above it.' },
  crossette: { name: 'Crossette', sparks: 15, heat: 2, zone: { k: 'cross', r: 74, l: 420, w: 44 }, lv: [8, 1], desc: 'Splits into four long beams.' },
  crackle: { name: 'Crackle', sparks: 10, heat: 4, zone: { k: 'circle', r: 124 }, lv: [5, 2], desc: 'Short reach, but lots of Heat.' },
  ring: { name: 'Ring', sparks: 25, heat: 3, zone: { k: 'ring', r0: 160, r1: 300 }, lv: [10, 1], desc: 'Only reaches shells at a distance.' },
  glitter: { name: 'Glitter', sparks: 12, heat: 1, money: 1, zone: { k: 'circle', r: 158 }, lv: [8, 1], desc: 'Earns $1 when it bursts.' },
  strobe: { name: 'Strobe', sparks: 12, heat: 1, zone: { k: 'circle', r: 146 }, lv: [6, 1], desc: 'Flashes 3 times — every flash scores.' },
  comet: { name: 'Comet', sparks: 22, heat: 1, zone: { k: 'comet', l: 500, w: 66, r: 130 }, lv: [12, 1], desc: 'Flies on from whatever lit it, lighting its whole path.' },
  spider: { name: 'Spider', sparks: 16, heat: 1, zone: { k: 'spider', r: 72 }, lv: [8, 1], desc: 'Lights the 2 nearest shells, however far away.' },
  crown: { name: 'Crown', sparks: 40, heat: 0, xheat: 1.5, zone: { k: 'circle', r: 200 }, lv: [20, 0.1], desc: 'Multiplies Heat ×1.5 when it bursts.' },
};
export const SHELL_IDS = Object.keys(SHELLS);

export const ENH = {
  gilded: { name: 'Gilded', desc: 'Earns {$:$1} when it bursts.' },
  titan: { name: 'Titan', desc: 'Reaches {k:40% farther}.' },
  twin: { name: 'Twin', desc: 'Bursts {k:twice}.' },
  glass: { name: 'Glass', desc: '{x:×2 Heat}. {k:1 in 4} chance to shatter for good.' },
  lucky: { name: 'Lucky', desc: '{k:1 in 4}: {h:+15 Heat}. {k:1 in 12}: {$:$8}.' },
  prism: { name: 'Prism', desc: '{x:×1.5 Heat}.' },
};

export function baseMods() {
  return { launches: 4, moves: 3, sky: 16, catSlots: 5, charmSlots: 2, interestCap: 5, interestPer: 5, zone: 1, starterZone: 1, comet: 1, spider: 2, strobe: 3, crown: 1.5, finale: 2, rerollCost: 5, shopSlots: 2, discount: 0, moveMoney: 0, bigBang: false, twinAll: false };
}

// ------------------------------------------------------------------------------------------------ catalysts
// Hooks: mods(m) static · burst(c, b, inst, copy) per burst · pattern(c, p, inst) on SYNC/STREAK/RAINBOW/money ·
// end(c, inst) end of launch (left → right) · actEnd(run, inst, copy) → $ · info(inst, run) live value text.
// c (scoring context): add(n), heatAdd(n), heatMul(x), money(n), retrigger(shell, n), chance(p), chain, bursts, ...
const C = (id, name, rarity, cost, icon, desc, h = {}) => ({ id, name, rarity, cost, icon, desc, ...h });
const T = (b, t) => b.type === t;
export const CATALYSTS = [
  // ---- Common
  C('kindling', 'Kindling', 0, 4, 'flame', '{h:+4 Heat} at the end of every launch.', { end: (c) => c.heatAdd(4) }),
  C('powder', 'Black Powder', 0, 4, 'keg', '{s:+60 Sparks} at the end of every launch.', { end: (c) => c.add(60) }),
  C('spark_plug', 'Spark Plug', 0, 5, 'bolt', 'Every burst gives {s:+8 Sparks}.', { burst: (c, b) => c.add(8, b) }),
  C('peony_patch', 'Peony Patch', 0, 4, 'flower', 'Every {k:Peony} burst gives {h:+2 Heat}.', { burst: (c, b) => T(b, 'peony') && c.heatAdd(2, b) }),
  C('weeping', 'Weeping Gold', 0, 4, 'drop', 'Every {k:Willow} burst gives {s:+45 Sparks}.', { burst: (c, b) => T(b, 'willow') && c.add(45, b) }),
  C('palmistry', 'Palmistry', 0, 4, 'palm', 'Every {k:Palm} burst gives {h:+3 Heat}.', { burst: (c, b) => T(b, 'palm') && c.heatAdd(3, b) }),
  C('crosswind', 'Crosswind', 0, 4, 'cross', 'Every {k:Crossette} burst gives {s:+25 Sparks} and {h:+1 Heat}.', { burst: (c, b) => { if (T(b, 'crossette')) { c.add(25, b); c.heatAdd(1, b); } } }),
  C('crest_crimson', 'Crimson Crest', 0, 5, 'shield', 'Every {c:Crimson} burst gives {h:+3 Heat}.', { hue: 'crimson', burst: (c, b) => b.color === 'crimson' && c.heatAdd(3, b) }),
  C('crest_amber', 'Amber Crest', 0, 5, 'shield', 'Every {a:Amber} burst gives {h:+3 Heat}.', { hue: 'amber', burst: (c, b) => b.color === 'amber' && c.heatAdd(3, b) }),
  C('crest_azure', 'Azure Crest', 0, 5, 'shield', 'Every {z:Azure} burst gives {h:+3 Heat}.', { hue: 'azure', burst: (c, b) => b.color === 'azure' && c.heatAdd(3, b) }),
  C('crest_jade', 'Jade Crest', 0, 5, 'shield', 'Every {j:Jade} burst gives {h:+3 Heat}.', { hue: 'jade', burst: (c, b) => b.color === 'jade' && c.heatAdd(3, b) }),
  C('long_fuse', 'Long Fuse', 0, 5, 'fuse', 'Every shell reaches {k:15% farther}.', { mods: (m) => { m.zone *= 1.15; } }),
  C('stagehand', 'Stagehand', 0, 4, 'hand', '{v:+1 Move} every act.', { mods: (m) => { m.moves += 1; } }),
  C('piggy', 'Piggy Bank', 0, 4, 'coin', 'Earn {$:$3} at the end of every act.', { actEnd: () => 3 }),
  C('chain_gang', 'Chain Gang', 0, 4, 'chain', '{h:+1 Heat} for every 2 shells in the chain.', { end: (c) => c.heatAdd(Math.floor(c.chain / 2)) }),
  C('opening', 'Opening Number', 0, 4, 'sunrise', 'The first launch of each act gets {h:+10 Heat}.', { end: (c) => c.isFirst && c.heatAdd(10) }),
  C('encore', 'Encore', 0, 4, 'mic', 'The last launch of each act gets {h:+15 Heat}.', { end: (c) => c.isLast && c.heatAdd(15) }),
  C('matchbook', 'Matchbook', 0, 4, 'match', 'The shell you light gives {h:+8 Heat}.', { burst: (c, b) => b.starter && !b.retrig && c.heatAdd(8, b) }),
  C('roman', 'Roman Candle', 0, 5, 'rocket', '{h:+3 Heat} for every launch you have left.', { end: (c) => c.launchesLeft > 0 && c.heatAdd(3 * c.launchesLeft) }),
  // ---- Uncommon
  C('marshal', 'Grand Marshal', 1, 6, 'medal', '{x:×2 Heat} if {k:10 or more} shells burst in the chain.', { end: (c) => c.chain >= 10 && c.heatMul(2) }),
  C('parade', 'Prism Parade', 1, 6, 'rainbow', '{k:RAINBOW} also gives {x:×2 Heat}.', { pattern: (c, p) => p.k === 'rainbow' && c.heatMul(2) }),
  C('metronome', 'Metronome', 1, 6, 'clock', '{h:+3 Heat} for every {k:SYNC} (two bursts at once).', { pattern: (c, p) => p.k === 'sync' && c.heatAdd(3) }),
  C('hot_streak', 'Hot Streak', 1, 6, 'streak', 'Every {k:STREAK} step gives {x:×1.2 Heat}.', { pattern: (c, p) => p.k === 'streak' && c.heatMul(1.2) }),
  C('pyromaniac', 'Pyromaniac', 1, 6, 'fire', '{h:+1 Heat} for every 15 shells burst this run.', { end: (c) => { const n = Math.floor(c.run.stats.shells / 15); n && c.heatAdd(n); }, info: (i, r) => `Currently {h:+${Math.floor(r.stats.shells / 15)} Heat}` }),
  C('snowball', 'Snowball', 1, 6, 'orb', 'Every burst gives {s:+4 Sparks}. Grows {s:+4} every act you clear.', { init: () => ({ n: 4 }), burst: (c, b, i) => c.add(i.s.n, b), actEnd: (r, i, copy) => { if (!copy) i.s.n += 4; return 0; }, info: (i) => `Currently {s:+${i.s.n} Sparks}` }),
  C('echo', 'Echo Chamber', 1, 7, 'waves', 'The shell you light bursts {k:2 extra times}.', { burst: (c, b) => b.starter && !b.retrig && c.retrigger(b.s, 2) }),
  C('disco', 'Disco Fever', 1, 6, 'disco', '{k:Strobes} flash 2 extra times and give {h:+1 Heat} per flash.', { mods: (m) => { m.strobe += 2; }, burst: (c, b) => T(b, 'strobe') && c.heatAdd(1, b) }),
  C('tailwind', 'Tailwind', 1, 6, 'wind', '{k:Comets} fly twice as far. {k:Spiders} light 1 more shell.', { mods: (m) => { m.comet *= 2; m.spider += 1; } }),
  C('lodestone', 'Lodestone', 1, 6, 'magnet', '{v:+2 Moves} every act.', { mods: (m) => { m.moves += 2; } }),
  C('royal', 'Royal Decree', 1, 7, 'crown', '{k:Crowns} give {x:×2 Heat} instead of ×1.5.', { mods: (m) => { m.crown = Math.max(m.crown, 2); } }),
  C('cannon', 'Glass Cannon', 1, 7, 'cannon', '{x:×3 Heat}, but the sky holds {k:3 fewer} shells.', { mods: (m) => { m.sky -= 3; }, end: (c) => c.heatMul(3) }),
  C('zen', 'Zen Master', 1, 6, 'feather', '{x:×2.5 Heat} if you made no Moves since your last launch.', { end: (c) => c.movesUsed === 0 && c.heatMul(2.5) }),
  C('toll', 'Toll Booth', 1, 5, 'toll', '{k:Crossettes} and {k:Rings} earn {$:$1} when they burst.', { burst: (c, b) => (T(b, 'crossette') || T(b, 'ring')) && !b.retrig && c.money(1, b) }),
  C('fever', 'Finale Fever', 1, 7, 'star', '{k:GRAND FINALE} gives {x:×4 Heat} instead of ×2.', { mods: (m) => { m.finale = Math.max(m.finale, 4); } }),
  C('compound', 'Compound Interest', 1, 6, 'chart', '{h:+1 Heat} for every {$:$4} you hold.', { end: (c) => { const n = Math.floor(c.run.money / 4); n > 0 && c.heatAdd(n); }, info: (i, r) => `Currently {h:+${Math.max(0, Math.floor(r.money / 4))} Heat}` }),
  C('slow_burn', 'Slow Burn', 1, 6, 'hourglass', '{h:+4 Heat} for every second the chain lasted.', { end: (c) => { const n = Math.floor(c.duration * 4); n && c.heatAdd(n); } }),
  C('quickdraw', 'Quickdraw', 1, 6, 'lightning', '{x:×2 Heat} if the whole chain lasted under 2.5 seconds.', { end: (c) => c.duration < 2.5 && c.heatMul(2) }),
  C('dice', 'Loaded Dice', 1, 6, 'dice', '{k:1 in 3} chance for {x:×3 Heat}.', { end: (c) => c.chance(1 / 3) && c.heatMul(3) }),
  C('firecracker', 'Firecracker', 1, 6, 'firecracker', 'Every {k:Crackle} burst gives {x:×1.25 Heat}.', { burst: (c, b) => T(b, 'crackle') && c.heatMul(1.25, b) }),
  C('treasurer', 'Treasurer', 1, 6, 'gem', '{k:Glitter} and {k:Gilded} shells give {h:+5 Heat}.', { burst: (c, b) => (T(b, 'glitter') || b.enh === 'gilded') && c.heatAdd(5, b) }),
  // ---- Rare
  C('mirror', 'Mirror Image', 2, 9, 'mirror', 'Copies the ability of the catalyst to its {k:right}.', { mirror: true }),
  C('supernova', 'Supernova', 2, 9, 'nova', 'The {k:last shell} to burst each launch bursts {k:3 extra times}.', { last: (c, s) => c.retrigger(s, 3) }),
  C('butterfly', 'Butterfly Effect', 2, 8, 'butterfly', 'The shell you light reaches {k:3× as far}.', { mods: (m) => { m.starterZone = Math.max(m.starterZone, 3); } }),
  C('domino', 'Domino Theory', 2, 9, 'domino', '{x:×Heat} equal to 1 + 0.1 × your longest chain this run.', { end: (c) => c.heatMul(1 + 0.1 * c.run.stats.longest), info: (i, r) => `Currently {x:×${(1 + 0.1 * r.stats.longest).toFixed(1)} Heat}` }),
  C('constellation', 'Constellation', 2, 8, 'stars', '{x:×1.5 Heat} for every colour with 3+ bursts this launch.', { end: (c) => { let n = 0; for (const k in c.colorCounts) if (c.colorCounts[k] >= 3) n++; n && c.heatMul(1.5 ** n); } }),
  C('phoenix', 'Phoenix', 2, 8, 'phoenix', 'If your last launch falls short, get {k:1 more launch}. Burns up after use.', { phoenix: true }),
  C('midas', 'Midas Touch', 2, 9, 'midas', 'Every {$:$1} earned during a launch gives {x:×1.25 Heat}.', { pattern: (c, p) => p.k === 'money' && c.heatMul(1.25 ** p.n) }),
  C('chain_letter', 'Chain Letter', 2, 9, 'letter', 'Every {k:7th} burst of a launch gives {x:×2 Heat}.', { burst: (c, b) => c.bursts % 7 === 0 && c.heatMul(2, b) }),
  C('showrunner', 'Showrunner', 2, 9, 'ticket', '{x:×Heat} equal to 1 + 0.25 × the catalysts you own.', { end: (c) => c.heatMul(1 + 0.25 * c.run.catalysts.length) }),
  // ---- Legendary (catalyst packs only)
  C('big_bang', 'Big Bang', 3, 15, 'bang', 'The shell you light sets off {k:the entire sky} at once.', { mods: (m) => { m.bigBang = true; } }),
  C('infinite', 'Infinite Encore', 3, 15, 'infinity', 'Every shell bursts {k:twice}.', { mods: (m) => { m.twinAll = true; } }),
  C('starfather', 'The Starfather', 3, 15, 'sun', 'Every burst after the 8th gives {x:×1.15 Heat}.', { burst: (c, b) => c.bursts > 8 && c.heatMul(1.15, b) }),
];
export const CAT = Object.fromEntries(CATALYSTS.map((c) => [c.id, c]));
export const RARITY = [{ name: 'Common', w: 70, cls: 'r0' }, { name: 'Uncommon', w: 25, cls: 'r1' }, { name: 'Rare', w: 5, cls: 'r2' }, { name: 'Legendary', w: 0, cls: 'r3' }];

// ------------------------------------------------------------------------------------------------ charms
// Formulas level up a shell type for the rest of the run. Rites change shells or the act. need: shells to pick.
export const FORMULAS = SHELL_IDS.map((t) => ({ id: 'f_' + t, kind: 'formula', type: t, name: `${SHELLS[t].name} Formula`, cost: 3, icon: 'flask' }));
export const RITES = [
  ...['crimson', 'amber', 'azure', 'jade'].map((col) => ({ id: 'dye_' + col, kind: 'rite', name: `${COLORS[col].name} Dye`, cost: 3, icon: 'drop', hue: col, need: 2, desc: `Turn up to {k:2} shells {${CK[col]}:${COLORS[col].name}}.`, apply: (s) => { s.color = col; } })),
  { id: 'gild', kind: 'rite', name: 'Gild', cost: 3, icon: 'coin', need: 1, desc: 'Make {k:1} shell {k:Gilded}: earns {$:$1} every burst.', apply: (s) => { s.enh = 'gilded'; } },
  { id: 'titan', kind: 'rite', name: 'Titan Fuse', cost: 3, icon: 'fuse', need: 1, desc: 'Make {k:1} shell {k:Titan}: reaches 40% farther.', apply: (s) => { s.enh = 'titan'; } },
  { id: 'twin', kind: 'rite', name: 'Twin Charge', cost: 4, icon: 'waves', need: 1, desc: 'Make {k:1} shell {k:Twin}: bursts twice.', apply: (s) => { s.enh = 'twin'; } },
  { id: 'glass', kind: 'rite', name: 'Glassblower', cost: 3, icon: 'gem', need: 1, desc: 'Make {k:1} shell {k:Glass}: {x:×2 Heat}, may shatter.', apply: (s) => { s.enh = 'glass'; } },
  { id: 'clover', kind: 'rite', name: 'Four-Leaf', cost: 3, icon: 'clover', need: 1, desc: 'Make {k:1} shell {k:Lucky}.', apply: (s) => { s.enh = 'lucky'; } },
  { id: 'prism', kind: 'rite', name: 'Prismatic', cost: 5, icon: 'rainbow', need: 1, rare: true, desc: 'Make {k:1} shell {k:Prism}: {x:×1.5 Heat}.', apply: (s) => { s.enh = 'prism'; } },
  { id: 'transmute', kind: 'rite', name: 'Transmute', cost: 3, icon: 'swap', need: 1, desc: 'Change {k:1} shell into a random different type.', apply: (s, rng) => { const o = SHELL_IDS.filter((t) => t !== s.type && t !== 'crown'); s.type = rng.pick(o); } },
  { id: 'duplicate', kind: 'rite', name: 'Duplicate', cost: 4, icon: 'copy', need: 1, desc: 'Add {k:a copy} of 1 shell to your crate.', dup: true },
  { id: 'scrap', kind: 'rite', name: 'Scrap', cost: 2, icon: 'trash', need: 2, desc: 'Destroy up to {k:2} shells for good. {$:+$2} each.', scrap: true },
  { id: 'windfall', kind: 'rite', name: 'Windfall', cost: 3, icon: 'chart', need: 0, desc: 'Double your money (max {$:+$20}).', now: (run) => { const g = Math.min(20, Math.max(0, run.money)); run.money += g; return g; } },
  { id: 'spare', kind: 'rite', name: 'Spare Fuse', cost: 4, icon: 'rocket', need: 0, inAct: true, desc: '{l:+1 Launch} this act.', now: (run) => { run.act.launches += 1; } },
  { id: 'crew', kind: 'rite', name: 'Stage Crew', cost: 3, icon: 'hand', need: 0, inAct: true, desc: '{v:+3 Moves} this act.', now: (run) => { run.act.moves += 3; } },
  { id: 'wild', kind: 'rite', name: 'Wildcard', cost: 4, icon: 'dice', need: 0, desc: 'Create a random {k:Common} or {k:Uncommon} catalyst (needs room).', wild: true },
];
export const CHARMS = [...FORMULAS, ...RITES];
export const CHARM = Object.fromEntries(CHARMS.map((c) => [c.id, c]));
export function formulaDesc(t, lv = 1) { const L = SHELLS[t].lv; return t === 'crown' ? `{k:${SHELLS[t].name}}: {s:+${L[0]} Sparks} and {x:+0.1×} per level.` : `{k:${SHELLS[t].name}}: {s:+${L[0]} Sparks} and {h:+${L[1]} Heat} per burst.`; }

// ------------------------------------------------------------------------------------------------ blueprints (one per night)
export const BLUEPRINTS = [
  { id: 'bp_launch', name: 'Extra Launcher', icon: 'rocket', desc: '{l:+1 Launch} every act.', mods: (m) => { m.launches += 1; } },
  { id: 'bp_crew', name: 'Rigging Crew', icon: 'hand', desc: '{v:+1 Move} every act.', mods: (m) => { m.moves += 1; } },
  { id: 'bp_sky', name: 'Wider Sky', icon: 'stars', desc: 'The sky holds {k:+2 shells}.', mods: (m) => { m.sky += 2; } },
  { id: 'bp_slot', name: 'Showcase', icon: 'ticket', desc: '{k:+1} catalyst slot.', mods: (m) => { m.catSlots += 1; } },
  { id: 'bp_pouch', name: 'Charm Pouch', icon: 'gem', desc: '{k:+1} charm slot.', mods: (m) => { m.charmSlots += 1; } },
  { id: 'bp_bond', name: 'Savings Bond', icon: 'chart', desc: 'Interest cap raised to {$:$10}.', mods: (m) => { m.interestCap = Math.max(m.interestCap, 10); } },
  { id: 'bp_bargain', name: 'Bargain Bin', icon: 'dice', desc: 'Rerolls cost {$:$2} less.', mods: (m) => { m.rerollCost -= 2; } },
  { id: 'bp_supply', name: 'Supply Deal', icon: 'coin', desc: 'Everything in the shop costs {$:$1} less.', mods: (m) => { m.discount += 1; } },
  { id: 'bp_stall', name: 'Bigger Stall', icon: 'keg', desc: 'The shop offers {k:+1} item.', mods: (m) => { m.shopSlots += 1; } },
  { id: 'bp_wick', name: 'Long Wick', icon: 'fuse', desc: 'Every shell reaches {k:10% farther}.', mods: (m) => { m.zone *= 1.1; } },
  { id: 'bp_steady', name: 'Steady Hands', icon: 'feather', desc: 'Unused Moves earn {$:$1} each at the end of an act.', mods: (m) => { m.moveMoney += 1; } },
];
export const BP = Object.fromEntries(BLUEPRINTS.map((b) => [b.id, b]));

// ------------------------------------------------------------------------------------------------ bosses (every 3rd act)
export const BOSSES = [
  { id: 'gale', name: 'The Gale', icon: 'wind', desc: 'A strong wind blows every reach to the right.', min: 1 },
  { id: 'drizzle', name: 'The Drizzle', icon: 'drop', desc: 'A third of the shells are damp and must be lit twice.', min: 2 },
  { id: 'critic', name: 'The Critic', icon: 'eye', desc: 'The first 4 bursts of every launch score nothing.', min: 2 },
  { id: 'curfew', name: 'The Curfew', icon: 'clock', desc: 'Only 2 launches — but +2 Moves.', min: 2 },
  { id: 'miser', name: 'The Miser', icon: 'coin', desc: 'Shells earn no money. No interest after this act.', min: 1 },
  { id: 'purist', name: 'The Purist', icon: 'shield', desc: 'One colour gives no Sparks.', min: 1 },
  { id: 'tremor', name: 'The Tremor', icon: 'waves', desc: 'After every launch, the whole sky shakes loose.', min: 2 },
  { id: 'short', name: 'The Short Fuse', icon: 'fuse', desc: 'Every reach is 25% shorter.', min: 2 },
  { id: 'strike', name: 'The Strike', icon: 'hand', desc: 'No Moves this act.', min: 3 },
  { id: 'thief', name: 'The Thief', icon: 'mask', desc: 'A random catalyst is switched off each launch.', min: 3 },
  { id: 'hush', name: 'The Hush', icon: 'moon', desc: 'Heat is halved at the end of every launch.', min: 4 },
  { id: 'fog', name: 'The Fog', icon: 'cloud', desc: 'Shell types and reaches are hidden.', min: 4 },
];
export const FINAL_BOSSES = [
  { id: 'eclipse', name: 'The Eclipse', icon: 'moon', desc: 'Reaches are hidden and 20% shorter.', final: true },
  { id: 'jury', name: 'The Grand Jury', icon: 'eye', desc: 'The first 6 bursts score nothing and Heat is halved.', final: true },
];
export const BOSS = Object.fromEntries([...BOSSES, ...FINAL_BOSSES].map((b) => [b.id, b]));

// ------------------------------------------------------------------------------------------------ targets & rewards
export const NIGHTS = 8;
const BASE = [2400, 8000, 15000, 31000, 60000, 135000, 250000, 450000];
export function nightBase(n) { if (n <= NIGHTS) return BASE[n - 1]; const k = n - NIGHTS; return Math.round(BASE[NIGHTS - 1] * Math.pow(2.9, k) * Math.pow(1.22, k * k)); }
export const ACT_MULT = [1, 1.5, 2];
export const ACT_NAMES = ['Opening', 'Headliner', 'Finale'];
export const ACT_REWARD = [3, 4, 5];

// ------------------------------------------------------------------------------------------------ launchers (starting crates) & heat levels
const crate = (spec) => { const out = []; let ci = 0; for (const [type, n] of spec) for (let i = 0; i < n; i++) out.push({ type, color: COLOR_IDS[ci++ % 4] }); return out; };
export const LAUNCHERS = [
  { id: 'classic', name: 'Classic Crate', icon: 'keg', desc: 'A balanced crate of Peonies, Willows, Palms, Crossettes and Crackles.', crate: () => crate([['peony', 18], ['willow', 8], ['palm', 8], ['crossette', 7], ['crackle', 7]]) },
  { id: 'twin', name: 'Twin Rockets', icon: 'rocket', desc: '{l:+1 Launch} every act, but {v:-1 Move}.', unlock: 'night3', crate: () => crate([['peony', 18], ['willow', 8], ['palm', 8], ['crossette', 7], ['crackle', 7]]), mods: (m) => { m.launches += 1; m.moves -= 1; } },
  { id: 'gold', name: 'Gold Rush', icon: 'coin', desc: 'Start with {$:$14}. Six Glitter shells. Interest cap {$:$8}.', unlock: 'rich', money: 14, crate: () => crate([['peony', 16], ['willow', 7], ['palm', 7], ['crossette', 6], ['crackle', 6], ['glitter', 6]]), mods: (m) => { m.interestCap = Math.max(m.interestCap, 8); } },
  { id: 'bigtop', name: 'Big Top', icon: 'stars', desc: 'The sky holds {k:+3 shells}, but targets are {k:30% higher}.', unlock: 'night5', target: 1.3, crate: () => crate([['peony', 20], ['willow', 9], ['palm', 9], ['crossette', 8], ['crackle', 8]]), mods: (m) => { m.sky += 3; } },
  { id: 'mono', name: 'Monochrome', icon: 'shield', desc: 'Every shell is {c:Crimson}. Starts with {k:Crimson Crest}.', unlock: 'win', cats: ['crest_crimson'], crate: () => crate([['peony', 18], ['willow', 8], ['palm', 8], ['crossette', 7], ['crackle', 7]]).map((s) => ({ ...s, color: 'crimson' })) },
  { id: 'chaos', name: 'Chaos Crate', icon: 'dice', desc: 'Random shell types and colours, with {k:6 random enhancements}.', unlock: 'million', chaos: true, crate: (rng, avail = () => true) => { const ids = SHELL_IDS.filter((t) => t !== 'crown' && avail(t)); const out = []; for (let i = 0; i < 48; i++) out.push({ type: rng.pick(ids), color: rng.pick(COLOR_IDS) }); const en = Object.keys(ENH); for (let i = 0; i < 6; i++) out[rng.int(out.length)].enh = rng.pick(en); return out; } },
];
export const LAUNCHER = Object.fromEntries(LAUNCHERS.map((l) => [l.id, l]));
export const STAKES = [
  { name: 'Warm', desc: 'The standard show.' },
  { name: 'Hot', desc: 'All targets are 25% higher.' },
  { name: 'Blazing', desc: '…and {v:-1 Move} every act.' },
  { name: 'Scorching', desc: '…and interest is capped at {$:$3}. Openings pay nothing.' },
  { name: 'Inferno', desc: '…and targets climb faster. Finales get {l:-1 Launch}.' },
];

// ------------------------------------------------------------------------------------------------ meta: achievements unlock new content
// Starting pool: everything except the ids listed in `unlocks` below.
export const ACHIEVEMENTS = [
  { id: 'first', name: 'Opening Night', desc: 'Clear your first act.', test: (s) => s.acts >= 1, dust: 10 },
  { id: 'finale1', name: 'Grand Finale', desc: 'Burst every shell in the sky with one launch.', test: (s) => s.finales >= 1, dust: 20, unlock: ['cat:fever'] },
  { id: 'night3', name: 'Rising Star', desc: 'Reach Night 3.', test: (s) => s.bestNight >= 3, dust: 25, unlock: ['shell:comet', 'launcher:twin'] },
  { id: 'chain15', name: 'Unbroken', desc: 'Make a chain of 15 shells.', test: (s) => s.longest >= 15, dust: 25, unlock: ['shell:strobe', 'cat:disco'] },
  { id: 'score10k', name: 'Crowd Pleaser', desc: 'Score 10,000 in a single launch.', test: (s) => s.bestLaunch >= 1e4, dust: 20, unlock: ['cat:chain_letter'] },
  { id: 'night5', name: 'Headliner', desc: 'Reach Night 5.', test: (s) => s.bestNight >= 5, dust: 40, unlock: ['shell:spider', 'launcher:bigtop', 'cat:tailwind'] },
  { id: 'boss3', name: 'Tough Crowd', desc: 'Beat 3 Finale bosses.', test: (s) => s.bosses >= 3, dust: 25, unlock: ['cat:phoenix'] },
  { id: 'rich', name: 'Deep Pockets', desc: 'Hold $40 at once.', test: (s) => s.maxMoney >= 40, dust: 25, unlock: ['launcher:gold', 'cat:midas'] },
  { id: 'score100k', name: 'Showstopper', desc: 'Score 100,000 in a single launch.', test: (s) => s.bestLaunch >= 1e5, dust: 40, unlock: ['shell:crown', 'cat:royal'] },
  { id: 'win', name: 'Show of the Century', desc: 'Win a run (clear Night 8).', test: (s) => s.wins >= 1, dust: 100, unlock: ['launcher:mono', 'stake:1', 'cat:showrunner'] },
  { id: 'million', name: 'Millionaire', desc: 'Score 1,000,000 in a single launch.', test: (s) => s.bestLaunch >= 1e6, dust: 60, unlock: ['launcher:chaos', 'cat:starfather'] },
  { id: 'cats5', name: 'Full House', desc: 'Own 5 catalysts at once.', test: (s) => s.maxCats >= 5, dust: 15, unlock: ['cat:mirror'] },
  { id: 'finale10', name: 'Pyrotechnician', desc: 'Set off 10 Grand Finales.', test: (s) => s.finales >= 10, dust: 40, unlock: ['cat:supernova'] },
  { id: 'chain25', name: 'Sky on Fire', desc: 'Make a chain of 25 shells.', test: (s) => s.longest >= 25, dust: 50, unlock: ['cat:big_bang'] },
  { id: 'billion', name: 'Astronomical', desc: 'Score 1 billion in a single launch.', test: (s) => s.bestLaunch >= 1e9, dust: 120, unlock: ['cat:infinite'] },
  { id: 'endless10', name: 'Encore! Encore!', desc: 'Reach Night 10 in endless.', test: (s) => s.bestNight >= 10, dust: 80, unlock: ['cosm:theme_aurora'] },
  { id: 'runs10', name: 'Regular', desc: 'Play 10 runs.', test: (s) => s.runs >= 10, dust: 30, unlock: ['cat:butterfly'] },
  { id: 'formula5', name: 'Mad Scientist', desc: 'Get a shell type to level 5 in one run.', test: (s) => s.maxFormula >= 5, dust: 30, unlock: ['cat:constellation'] },
  { id: 'daily', name: 'Daily Spark', desc: 'Finish a Daily Show.', test: (s) => s.dailies >= 1, dust: 20, unlock: ['cosm:trail_rainbow'] },
  { id: 'stake3', name: 'Feel the Heat', desc: 'Win on Heat level 3 or higher.', test: (s) => s.maxStakeWin >= 2, dust: 150, unlock: ['cosm:theme_neon'] },
];
export const LOCKED = new Set(ACHIEVEMENTS.flatMap((a) => a.unlock || []));

// ------------------------------------------------------------------------------------------------ cosmetics (Stardust — earned only by playing)
export const COSMETICS = [
  { id: 'theme_harbor', kind: 'theme', name: 'Harbour Twilight', price: 0 },
  { id: 'theme_lantern', kind: 'theme', name: 'Lantern River', price: 250 },
  { id: 'theme_dunes', kind: 'theme', name: 'Desert Moon', price: 350 },
  { id: 'theme_aurora', kind: 'theme', name: 'Aurora Fjord', price: 0, achievement: 'endless10' },
  { id: 'theme_neon', kind: 'theme', name: 'Neon Metropolis', price: 0, achievement: 'stake3' },
  { id: 'trail_classic', kind: 'trail', name: 'Classic Fuse', price: 0 },
  { id: 'trail_ice', kind: 'trail', name: 'Frost Trail', price: 150 },
  { id: 'trail_ember', kind: 'trail', name: 'Ember Trail', price: 150 },
  { id: 'trail_rainbow', kind: 'trail', name: 'Rainbow Trail', price: 0, achievement: 'daily' },
  { id: 'burst_classic', kind: 'burst', name: 'Classic Peony', price: 0 },
  { id: 'burst_heart', kind: 'burst', name: 'Heart Peony', price: 300 },
  { id: 'burst_star', kind: 'burst', name: 'Star Peony', price: 300 },
  { id: 'burst_smile', kind: 'burst', name: 'Smiley Peony', price: 400 },
  { id: 'burst_saturn', kind: 'burst', name: 'Saturn Peony', price: 500 },
];
export const COSM = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));
