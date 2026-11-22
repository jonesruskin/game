// A run: 8 nights × 3 acts (Opening, Headliner, Finale-with-a-boss), a crate of shells, catalysts, charms,
// formulas, blueprints, money and the shop. Deterministic from its seed (Daily Show = same seed for everyone).
import { SHELLS, SHELL_IDS, COLOR_IDS, CATALYSTS, CAT, RARITY, FORMULAS, RITES, CHARM, BLUEPRINTS, BP, BOSSES, FINAL_BOSSES, BOSS, NIGHTS, nightBase, ACT_MULT, ACT_REWARD, LAUNCHER, LOCKED, ENH, baseMods } from './content.js';
import { Sky, Launch, makeShell, IDLE } from './sky.js';
import { makeRng, mix } from './util.js';

const PACKS = {
  shell: { name: 'Shell Pack', cost: 4, n: 3, icon: 'keg', desc: 'Choose 1 of 3 shells to add to your crate.' },
  formula: { name: 'Formula Pack', cost: 4, n: 3, icon: 'flask', desc: 'Choose 1 of 3 formulas to level up a shell type.' },
  rite: { name: 'Rite Pack', cost: 4, n: 3, icon: 'moon', desc: 'Choose 1 of 3 rites to keep.' },
  catalyst: { name: 'Catalyst Pack', cost: 6, n: 2, icon: 'star', desc: 'Choose 1 of 2 catalysts. Legendaries hide here.' },
};
export { PACKS };
const roundNice = (v) => { const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(v)) - 1)); return Math.round(v / p) * p; };

export class Run {
  constructor(o = {}) {
    this.seed = (o.seed >>> 0) || 1; this.launcherId = o.launcher || 'classic'; this.stake = o.stake || 0; this.daily = !!o.daily; this.tutorial = !!o.tutorial;
    this.unlocked = o.unlocked instanceof Set ? o.unlocked : new Set(o.unlocked || []);
    if (o.restore) { Object.assign(this, o.restore); this.unlocked = new Set(o.restore.unlocked || []); this.recalc(); if (o.restore.act) this.restoreAct(o.restore.act); return; }
    const L = LAUNCHER[this.launcherId];
    this.crate = L.crate(this.rng(1), (t) => this.avail('shell', t)).map((s, i) => ({ id: i + 1, type: s.type, color: s.color, enh: s.enh || null }));
    this.nextId = this.crate.length + 1; this.uidN = 1; this.luckN = 0;
    this.money = L.money ?? 4; this.catalysts = []; this.charms = []; this.formulas = {}; this.blueprints = [];
    this.night = 1; this.actIdx = 0; this.endless = false; this.revived = false; this.won = false;
    this.bossByNight = {}; this.bpByNight = {};
    this.stats = { shells: 0, longest: 0, bestLaunch: 0, finales: 0, acts: 0, bosses: 0, maxMoney: this.money, launches: 0, rerolls: 0, maxFormula: 1, maxCats: 0, rainbows: 0, bestNight: 1 };
    for (const id of L.cats || []) this.addCatalyst(id);
    this.recalc(); this.phase = 'preact'; this.act = null; this.shop = null; this.pack = null;
  }
  rng(...k) { return makeRng(mix(this.seed, ...k)); }
  luck() { return makeRng(mix(this.seed, 77, this.luckN++))(); }
  avail(prefix, id) { const key = prefix + ':' + id; return !LOCKED.has(key) || (!this.daily && this.unlocked.has(key)); }
  get launcher() { return LAUNCHER[this.launcherId]; }
  // ---------------------------------------------------------------- derived stats
  recalc() {
    const m = baseMods(); const L = LAUNCHER[this.launcherId];
    if (L.mods) L.mods(m);
    if (this.stake >= 2) m.moves -= 1;
    if (this.stake >= 3) m.interestCap = Math.min(m.interestCap, 3);
    for (const id of this.blueprints) BP[id].mods(m);
    this.catalysts.forEach((inst, i) => { const d = CAT[inst.id]; if (d.mirror) { const r = this.catalysts[i + 1]; if (r && CAT[r.id].mods && !CAT[r.id].mirror) CAT[r.id].mods(m); } else if (d.mods) d.mods(m); });
    m.sky = Math.max(5, m.sky); m.moves = Math.max(0, m.moves); m.launches = Math.max(1, m.launches); m.rerollCost = Math.max(1, m.rerollCost);
    this.mods = m; if (this.act && this.act.sky) this.act.sky.ctx.mods = m;
    return m;
  }
  bossFor(n) {
    if (this.bossByNight[n]) return BOSS[this.bossByNight[n]];
    let b;
    if (n % NIGHTS === 0) b = this.rng(3, n).pick(FINAL_BOSSES);
    else { const recent = [this.bossByNight[n - 1], this.bossByNight[n - 2]]; const pool = BOSSES.filter((x) => x.min <= n && !recent.includes(x.id)); b = this.rng(3, n).pick(pool); }
    this.bossByNight[n] = b.id; return b;
  }
  blueprintFor(n) {
    if (n in this.bpByNight) return this.bpByNight[n] ? BP[this.bpByNight[n]] : null;
    const pool = BLUEPRINTS.filter((b) => !this.blueprints.includes(b.id)); const b = pool.length ? this.rng(4, n).pick(pool) : null;
    this.bpByNight[n] = b ? b.id : null; return b;
  }
  target(n = this.night, a = this.actIdx) {
    if (this.tutorial && n === 1 && a === 0) return 300;
    let v = nightBase(n) * ACT_MULT[a] * (this.launcher.target || 1); if (this.stake >= 1) v *= 1.25; if (this.stake >= 4) v *= Math.pow(1.1, n - 1);
    return roundNice(v);
  }
  // ---------------------------------------------------------------- acts
  startAct(W, H) {
    const boss = this.actIdx === 2 ? this.bossFor(this.night).id : null; const M = this.mods;
    const a = { idx: this.actIdx, night: this.night, boss, target: this.target(), score: 0, launchNo: 0, W, H, launches: M.launches, moves: M.moves, movesSince: 0, fills: 0, purist: null, current: null, history: [] };
    if (boss === 'curfew') { a.launches = 2; a.moves += 2; }
    if (boss === 'strike') a.moves = 0;
    if (this.stake >= 4 && a.idx === 2) a.launches = Math.max(1, a.launches - 1);
    if (boss === 'purist') a.purist = this.rng(5, this.night).pick(COLOR_IDS);
    a.pile = this.rng(10, this.night, this.actIdx).shuffle(this.crate.map((c) => c.id));
    a.sky = new Sky(W, H, { mods: M, boss });
    this.act = a; this.phase = 'act';
    if (this.tutorial && this.night === 1 && this.actIdx === 0) this.tutorialSky(); else this.refill();
    return a;
  }
  crateEntry(id) { return this.crate.find((c) => c.id === id); }
  refill() {
    const a = this.act, sky = a.sky; const r = this.rng(11, this.night, this.actIdx, a.fills++);
    const need = this.mods.sky - sky.alive.length; if (need <= 0 || !a.pile.length) return;
    const nC = need >= 10 ? 3 + (r() < 0.5 ? 1 : 0) : need >= 5 ? 2 : 1; const cl = sky.makeClusters(r, nC); let k = Math.floor(r() * nC);
    while (sky.alive.length < this.mods.sky && a.pile.length) {
      const cs = this.crateEntry(a.pile.pop()); if (!cs) continue;
      const sh = makeShell(cs); if (a.boss === 'drizzle') sh.damp = r() < 0.34;
      const c = cl[k++ % nC]; if (r() < 0.12) k++;
      if (!(r() < 0.82 && sky.placeNear(sh, c.x, c.y, 112, r)) && !sky.place(sh, r)) { a.pile.push(cs.id); break; }
    }
  }
  tutorialSky() {
    // a heart of Peonies, spaced so one tap lights them all — the very first tap of the game is a Grand Finale
    const a = this.act, sky = a.sky; const pts = []; let len = 0; let prev = null; const N = 400;
    const hp = (t) => [16 * Math.sin(t) ** 3, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))];
    for (let i = 0; i <= N; i++) { const p = hp((i / N) * Math.PI * 2); if (prev) len += Math.hypot(p[0] - prev[0], p[1] - prev[1]); pts.push([p[0], p[1], len]); prev = p; }
    const n = 10, s = (n * 128) / len; const out = [];
    for (let k = 0; k < n; k++) { const want = (k / n) * len; const p = pts.find((q) => q[2] >= want) || pts[pts.length - 1]; out.push([a.W / 2 + p[0] * s, a.H * 0.46 + p[1] * s]); }
    const peonies = this.crate.filter((c) => c.type === 'peony').slice(0, n);
    peonies.forEach((cs, i) => { const sh = makeShell(cs); sh.x = out[i][0]; sh.y = out[i][1]; sky.shells.push(sh); a.pile.splice(a.pile.indexOf(cs.id), 1); });
  }
  get chainRunning() { return !!(this.act && this.act.current); }
  canMove() { return this.phase === 'act' && !this.chainRunning && this.act.moves > 0; }
  moveShell(sh, x, y) { const a = this.act; if (!this.canMove() || !a.sky.canPlace(x, y, sh)) return false; sh.x = x; sh.y = y; a.moves--; a.movesSince++; return true; }
  launcherPos() { return { x: this.act.W / 2, y: this.act.H + 160 }; }
  beginLaunch(sh) {
    const a = this.act; if (this.phase !== 'act' || a.current || sh.state !== IDLE) return null;
    a.launchNo++;
    for (const c of this.catalysts) c.off = false;
    if (a.boss === 'thief' && this.catalysts.length) this.catalysts[Math.floor(this.luck() * this.catalysts.length)].off = true;
    const L = new Launch(this, { launchNo: a.launchNo, isLast: a.launchNo >= a.launches, launchesLeft: a.launches - a.launchNo, movesUsed: a.movesSince });
    a.sky.start(sh, L, this.launcherPos()); a.current = L; return L;
  }
  endLaunch() {
    const a = this.act, L = a.current; if (!L) return null;
    const score = L.finish(a.sky); a.score += score; a.current = null; a.movesSince = 0;
    const s = this.stats; s.launches++; s.shells += L.chain; s.longest = Math.max(s.longest, L.chain); s.bestLaunch = Math.max(s.bestLaunch, score); if (L.grandFinale) s.finales++; if (L.rainbow) s.rainbows++; s.maxMoney = Math.max(s.maxMoney, this.money);
    const gone = a.sky.sweep();
    for (const g of gone) if (g.shatter) this.crate = this.crate.filter((c) => c.id !== g.cid);
    for (const c of this.catalysts) c.off = false;
    if (a.boss === 'tremor') { const r = this.rng(12, this.night, a.launchNo); for (const sh of a.sky.shells) for (let i = 0; i < 12; i++) { const x = sh.x + (r() - 0.5) * 220, y = sh.y + (r() - 0.5) * 220; if (a.sky.canPlace(x, y, sh)) { sh.x = x; sh.y = y; break; } } }
    this.refill();
    const res = { score, launch: L, cleared: a.score >= a.target, failed: false, phoenix: false, gone };
    a.history.push(score);
    if (!res.cleared && (a.launchNo >= a.launches || a.sky.alive.length === 0)) {
      const ph = this.catalysts.findIndex((c) => CAT[c.id].phoenix);
      if (ph >= 0 && a.sky.alive.length) { this.catalysts.splice(ph, 1); this.recalc(); a.launches = a.launchNo + 1; res.phoenix = true; }
      else res.failed = true;
    }
    if (res.cleared) this.phase = 'cleared'; else if (res.failed) this.phase = 'over';
    return res;
  }
  // second chance (rewarded ad, once per run, never in the Daily): one more launch
  revive() { if (this.revived || this.daily || this.phase !== 'over') return false; this.revived = true; this.act.launches = this.act.launchNo + 1; if (!this.act.sky.alive.length) this.refill(); this.phase = 'act'; return true; }
  cashOut() {
    const a = this.act, M = this.mods; const lines = [];
    const interest = a.boss === 'miser' ? 0 : Math.max(0, Math.min(Math.floor(this.money / M.interestPer), M.interestCap));
    const base = this.stake >= 3 && a.idx === 0 ? 0 : ACT_REWARD[a.idx]; if (base) lines.push({ label: a.idx === 2 ? 'Finale cleared' : `${['Opening', 'Headliner'][a.idx]} cleared`, v: base });
    const left = Math.max(0, a.launches - a.launchNo); if (left) lines.push({ label: `${left} launch${left > 1 ? 'es' : ''} left`, v: left });
    if (interest) lines.push({ label: `Interest ($1 per $${M.interestPer})`, v: interest });
    if (M.moveMoney && a.moves > 0) lines.push({ label: `${a.moves} unused move${a.moves > 1 ? 's' : ''}`, v: a.moves * M.moveMoney });
    this.catalysts.forEach((inst, i) => { const d = CAT[inst.id]; const fn = d.mirror ? (this.catalysts[i + 1] && CAT[this.catalysts[i + 1].id]) : d; if (fn && fn.actEnd) { const v = fn.actEnd(this, d.mirror ? this.catalysts[i + 1] : inst, !!d.mirror); if (v) lines.push({ label: d.name, v, cat: inst.uid }); } });
    const total = lines.reduce((t, l) => t + l.v, 0); this.money += total;
    const s = this.stats; s.acts++; if (a.idx === 2) s.bosses++; s.maxMoney = Math.max(s.maxMoney, this.money);
    let won = false;
    if (a.idx === 2) { if (this.night === NIGHTS && !this.endless) { won = true; this.won = true; } this.night++; this.actIdx = 0; s.bestNight = Math.max(s.bestNight, this.night); }
    else this.actIdx++;
    this.act = null; this.phase = won ? 'won' : 'shop'; if (!won) this.openShop();
    return { lines, total, won };
  }
  goEndless() { this.endless = true; this.phase = 'shop'; this.openShop(); }
  // ---------------------------------------------------------------- shop
  price(base) { return Math.max(1, base - this.mods.discount); }
  catPool(maxRarity = 2, exclude = []) { const own = new Set(this.catalysts.map((c) => c.id)); return CATALYSTS.filter((c) => c.rarity <= maxRarity && this.avail('cat', c.id) && !own.has(c.id) && !exclude.includes(c.id)); }
  shellPool() { return SHELL_IDS.filter((t) => this.avail('shell', t)); }
  rollCat(r, exclude, legendary = 0) {
    if (legendary && r() < legendary) { const L = this.catPool(3, exclude).filter((c) => c.rarity === 3); if (L.length) return r.pick(L); }
    const pool = this.catPool(2, exclude); if (!pool.length) return null;
    const rar = r.weighted([0, 1, 2], (k) => (pool.some((c) => c.rarity === k) ? RARITY[k].w : 0));
    return r.pick(pool.filter((c) => c.rarity === rar));
  }
  rollShell(r, enhChance = 0.2) {
    const types = this.shellPool(); const w = (t) => ({ peony: 10, willow: 8, palm: 8, crossette: 8, crackle: 7, ring: 6, glitter: 6, strobe: 5, comet: 5, spider: 4, crown: 2 }[t] || 4);
    const type = r.weighted(types, w); const s = { type, color: r.pick(COLOR_IDS), enh: null };
    if (r() < enhChance) s.enh = r.pick(Object.keys(ENH).filter((e) => e !== 'prism' || r() < 0.3));
    return s;
  }
  genItems(r) {
    const items = []; const ex = [];
    if (this.tutorial && this.night === 1 && this.actIdx === 1 && !this.shop) { for (const id of ['spark_plug', 'kindling']) { ex.push(id); items.push({ kind: 'cat', id, cost: this.price(CAT[id].cost) }); } return items; }
    for (let i = 0; i < this.mods.shopSlots; i++) {
      const roll = r(); let it = null;
      if (roll < 0.68) { const c = this.rollCat(r, ex); if (c) { ex.push(c.id); it = { kind: 'cat', id: c.id, cost: this.price(c.cost) }; } }
      else if (roll < 0.82) { const f = r.pick(FORMULAS.filter((f) => this.avail('shell', f.type))); it = { kind: 'charm', id: f.id, cost: this.price(f.cost) }; }
      else if (roll < 0.92) { const t = r.pick(RITES.filter((x) => !x.rare || r() < 0.3)); it = { kind: 'charm', id: t.id, cost: this.price(t.cost) }; }
      if (!it) { const s = this.rollShell(r, 0.6); it = { kind: 'shell', shell: s, cost: this.price(s.enh ? 4 : 3) }; }
      items.push(it);
    }
    return items;
  }
  genPacks(r) { const kinds = ['shell', 'formula', 'rite', 'catalyst']; const w = { shell: 34, formula: 28, rite: 18, catalyst: 20 }; const out = []; for (let i = 0; i < 2; i++) { const k = r.weighted(kinds, (x) => w[x]); out.push({ kind: k, cost: this.price(PACKS[k].cost) }); } return out; }
  openShop() {
    const r = this.rng(20, this.night, this.actIdx, 0);
    const bp = this.blueprintFor(this.night);
    this.shop = null; this.shop = { items: this.genItems(r), packs: this.genPacks(r), bp: bp && !this.blueprints.includes(bp.id) ? { id: bp.id, cost: this.price(10) } : null, rerolls: 0 };
    this.phase = 'shop';
  }
  rerollCost() { return this.mods.rerollCost + (this.shop ? this.shop.rerolls : 0); }
  reroll() { const c = this.rerollCost(); if (this.money < c) return false; this.money -= c; this.shop.rerolls++; this.stats.rerolls++; this.shop.items = this.genItems(this.rng(20, this.night, this.actIdx, this.shop.rerolls)); return true; }
  addCatalyst(id) { const d = CAT[id]; const inst = { uid: this.uidN++, id, s: d.init ? d.init() : {}, off: false }; this.catalysts.push(inst); this.stats.maxCats = Math.max(this.stats.maxCats, this.catalysts.length); this.recalc(); return inst; }
  levelFormula(type, n = 1) { this.formulas[type] = (this.formulas[type] || 1) + n; this.stats.maxFormula = Math.max(this.stats.maxFormula, this.formulas[type]); return this.formulas[type]; }
  addShell(s) { const e = { id: this.nextId++, type: s.type, color: s.color, enh: s.enh || null }; this.crate.push(e); return e; }
  canBuy(it) {
    if (!it || it.sold || this.money < it.cost) return false;
    if (it.kind === 'cat') return this.catalysts.length < this.mods.catSlots;
    if (it.kind === 'charm' && CHARM[it.id].kind === 'rite') return this.charms.length < this.mods.charmSlots;
    return true;
  }
  buy(i) {
    const it = this.shop.items[i]; if (!this.canBuy(it)) return null;
    this.money -= it.cost; it.sold = true; let out = { it };
    if (it.kind === 'cat') out.inst = this.addCatalyst(it.id);
    else if (it.kind === 'charm') { const ch = CHARM[it.id]; if (ch.kind === 'formula') out.level = this.levelFormula(ch.type); else this.charms.push({ id: ch.id }); }
    else if (it.kind === 'shell') out.shell = this.addShell(it.shell);
    return out;
  }
  buyBlueprint() { const b = this.shop.bp; if (!b || this.money < b.cost) return false; this.money -= b.cost; this.blueprints.push(b.id); this.shop.bp = null; this.recalc(); return BP[b.id]; }
  buyPack(i) {
    const p = this.shop.packs[i]; if (!p || p.sold || this.money < p.cost) return null; this.money -= p.cost; p.sold = true;
    const r = this.rng(30, this.night, this.actIdx, i, this.shop.rerolls); const K = PACKS[p.kind]; const opts = []; const ex = [];
    for (let k = 0; k < K.n; k++) {
      if (p.kind === 'shell') opts.push({ kind: 'shell', shell: this.rollShell(r, 0.35) });
      else if (p.kind === 'formula') { const pool = FORMULAS.filter((f) => this.avail('shell', f.type) && !ex.includes(f.id)); const f = r.pick(pool); ex.push(f.id); opts.push({ kind: 'charm', id: f.id }); }
      else if (p.kind === 'rite') { const pool = RITES.filter((x) => !ex.includes(x.id) && (!x.rare || r() < 0.4)); const t = r.pick(pool); ex.push(t.id); opts.push({ kind: 'charm', id: t.id }); }
      else { const c = this.rollCat(r, ex, 0.04); if (c) { ex.push(c.id); opts.push({ kind: 'cat', id: c.id }); } }
    }
    this.pack = { kind: p.kind, opts, left: 1 }; this.phase = 'pack'; return this.pack;
  }
  canPick(o) { if (o.kind === 'cat') return this.catalysts.length < this.mods.catSlots; if (o.kind === 'charm' && CHARM[o.id].kind === 'rite') return this.charms.length < this.mods.charmSlots; return true; }
  pickPack(j) {
    const o = this.pack && this.pack.opts[j]; if (!o || o.taken || !this.canPick(o)) return null; o.taken = true; this.pack.left--; let out = { o };
    if (o.kind === 'cat') out.inst = this.addCatalyst(o.id);
    else if (o.kind === 'charm') { const ch = CHARM[o.id]; if (ch.kind === 'formula') out.level = this.levelFormula(ch.type); else this.charms.push({ id: ch.id }); }
    else out.shell = this.addShell(o.shell);
    if (this.pack.left <= 0) this.closePack(); return out;
  }
  closePack() { this.pack = null; this.phase = 'shop'; }
  sellValue(inst) { return Math.max(1, Math.floor(CAT[inst.id].cost / 2)); }
  sell(uid) { const i = this.catalysts.findIndex((c) => c.uid === uid); if (i < 0) return 0; const v = this.sellValue(this.catalysts[i]); this.catalysts.splice(i, 1); this.money += v; this.recalc(); return v; }
  sellCharm(i) { if (!this.charms[i]) return 0; this.charms.splice(i, 1); this.money += 1; return 1; }
  moveCat(from, to) { const [c] = this.catalysts.splice(from, 1); this.catalysts.splice(to, 0, c); this.recalc(); }
  leaveShop() { this.shop = null; this.pack = null; this.phase = 'preact'; }
  // ---------------------------------------------------------------- charms (rites)
  charmUsable(i) { const c = this.charms[i] && CHARM[this.charms[i].id]; if (!c) return false; if (c.need > 0 || c.inAct) return this.phase === 'act' && !this.chainRunning; if (c.wild) return this.catalysts.length < this.mods.catSlots; return true; }
  useCharm(i, targets = []) {
    const c = CHARM[this.charms[i].id]; if (!this.charmUsable(i)) return null; const out = { c, targets };
    if (c.need > 0) {
      if (!targets.length) return null;
      const r = this.rng(40, this.night, this.actIdx, this.luckN++);
      for (const sh of targets.slice(0, c.need)) {
        const e = this.crateEntry(sh.cid);
        if (c.apply) { c.apply(sh, r); if (e) { e.type = sh.type; e.color = sh.color; e.enh = sh.enh; } }
        if (c.dup && e) out.copy = this.addShell(e);
        if (c.scrap) { this.crate = this.crate.filter((x) => x.id !== sh.cid); this.act.sky.shells = this.act.sky.shells.filter((x) => x !== sh); this.money += 2; out.money = (out.money || 0) + 2; }
      }
    } else if (c.now) out.v = c.now(this);
    else if (c.wild) { const r = this.rng(41, this.luckN++); const pool = this.catPool(1); if (pool.length) out.inst = this.addCatalyst(r.pick(pool).id); }
    this.charms.splice(i, 1); this.stats.maxMoney = Math.max(this.stats.maxMoney, this.money); return out;
  }
  // ---------------------------------------------------------------- save / restore (never mid-chain)
  serialize() {
    const o = {}; for (const k of ['seed', 'launcherId', 'stake', 'daily', 'tutorial', 'crate', 'nextId', 'uidN', 'luckN', 'money', 'catalysts', 'charms', 'formulas', 'blueprints', 'night', 'actIdx', 'endless', 'revived', 'won', 'winCounted', 'dustPaid', 'bossByNight', 'bpByNight', 'stats', 'phase', 'shop', 'pack']) o[k] = this[k];
    o.unlocked = [...this.unlocked];
    if (this.act) { const a = this.act; o.act = { ...a, sky: undefined, current: undefined, shells: a.sky.shells.map((s) => ({ cid: s.cid, type: s.type, color: s.color, enh: s.enh, x: s.x, y: s.y, damp: s.damp, dry: s.dry })) }; }
    return JSON.parse(JSON.stringify(o));
  }
  restoreAct(a) {
    const sky = new Sky(a.W, a.H, { mods: this.mods, boss: a.boss });
    for (const d of a.shells) { const sh = makeShell({ id: d.cid, type: d.type, color: d.color, enh: d.enh }); Object.assign(sh, { x: d.x, y: d.y, damp: d.damp, dry: d.dry }); sky.shells.push(sh); }
    this.act = { ...a, shells: undefined, sky, current: null };
  }
}
export function shellDesc(s) { return SHELLS[s.type].desc + (s.enh ? ' ' + ENH[s.enh].desc : ''); }
