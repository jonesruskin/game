// Player profile, economy and progression bookkeeping.
import { Platform } from './platform.js';
import { HEROES, HERO } from './data/heroes.js';
import { ALL_COSMETICS, SKINS, TRAILS, KOFX, EMOTES, priceOf } from './data/cosmetics.js';
import { TROPHY_ROAD, PASS, PASS_XP_PER_TIER, SEASON, dailyQuests, ACHIEVEMENTS, LOGIN_REWARDS, masteryOf, MASTERY, trophyDelta } from './data/progression.js';
import { dayNumber, seeded } from './util.js';

const KEY = 'stealstorm_profile_v1';

function fresh() {
  return {
    v: 1, name: 'Player' + Math.floor(1000 + Math.random() * 9000), created: Date.now(), firstRun: true, tutorialDone: false,
    trophies: 0, maxTrophies: 0, gold: 0, gems: 0, level: 1, xp: 0,
    heroes: { blaze: { mxp: 0, mlvl: 1 }, volt: { mxp: 0, mlvl: 1 } }, selHero: 'blaze',
    owned: {}, equip: { skin: {}, trail: 'dust', kofx: 'poof', title: 'rookie', emotes: ['gg', 'lol', 'cool', 'thanks'] },
    stats: { matches: 0, wins: 0, kills: 0, steals: 0, damage: 0, top3: 0, ults: 0, crates: 0, maxLvl: 1, bestKills: 0, heroesOwned: 2 },
    road: { claimed: [] },
    pass: { season: SEASON.n, xp: 0, premium: false, cf: [], cp: [] },
    quests: { day: 0, prog: {}, claimed: {}, rerolls: 0 },
    login: { last: 0, streak: 0, pending: false },
    ach: {},
    settings: { sfx: 0.7, music: 0.35, lowFx: false, aimGuide: true },
    lastMidgame: 0, matchesSinceAd: 0, freeChestDay: 0,
  };
}

export const Save = {
  p: null,
  load() {
    const st = Platform.storage(); let raw = null;
    try { raw = st.get(KEY); } catch (e) {}
    if (!raw) { try { raw = localStorage.getItem(KEY); } catch (e) {} } // migration from local → cloud
    let p = null; try { p = raw ? JSON.parse(raw) : null; } catch (e) { p = null; }
    const f = fresh();
    if (!p) p = f; else { for (const k in f) if (p[k] === undefined) p[k] = f[k]; for (const k in f.stats) if (p.stats[k] === undefined) p.stats[k] = f.stats[k]; for (const k in f.settings) if (p.settings[k] === undefined) p.settings[k] = f.settings[k]; }
    for (const c of Object.values(ALL_COSMETICS)) if (c.source === 'default' || c.owned) p.owned[c.id] = true;
    if (p.pass.season !== SEASON.n) p.pass = { season: SEASON.n, xp: 0, premium: false, cf: [], cp: [] };
    this.p = p; this.rollDay(); this.save();
    return p;
  },
  save() { try { Platform.storage().set(KEY, JSON.stringify(this.p)); } catch (e) {} },
  rollDay() {
    const p = this.p, d = dayNumber();
    if (p.quests.day !== d) p.quests = { day: d, prog: {}, claimed: {}, rerolls: 0, list: dailyQuests(d) };
    if (!p.quests.list) p.quests.list = dailyQuests(d);
    if (p.login.last !== d) { p.login.streak = p.login.last === d - 1 ? (p.login.streak % 7) + 1 : 1; p.login.last = d; p.login.pending = true; }
  },
  ownsHero(id) { return !!this.p.heroes[id]; },
  skinFor(heroId) { const id = this.p.equip.skin[heroId]; return (id && this.p.owned[id] && ALL_COSMETICS[id]) || SKINS.find((s) => s.id === heroId + '_default'); },
  owns(id) { return !!this.p.owned[id]; },
  // Grant a reward object; returns list of human-readable lines for UI toasts.
  grant(r, lines = []) {
    const p = this.p; if (!r) return lines;
    if (r.gold) { p.gold += r.gold; lines.push({ icon: '🪙', text: `+${r.gold} Gold` }); }
    if (r.gems) { p.gems += r.gems; lines.push({ icon: '💎', text: `+${r.gems} Gems` }); }
    if (r.hero && !p.heroes[r.hero]) { p.heroes[r.hero] = { mxp: 0, mlvl: 1 }; p.stats.heroesOwned = Object.keys(p.heroes).length; lines.push({ icon: '⭐', text: `New hero: ${HERO[r.hero].name}!`, hero: r.hero }); }
    for (const k of ['skin', 'trail', 'kofx', 'emote', 'title']) if (r[k] && !p.owned[r[k]]) { p.owned[r[k]] = true; lines.push({ icon: '🎁', text: `${ALL_COSMETICS[r[k]].name} (${k === 'kofx' ? 'KO effect' : k})` }); }
    if (r.skinOf) { const id = r.skinOf + '_master'; if (!p.owned[id]) { p.owned[id] = true; lines.push({ icon: '🏆', text: `${ALL_COSMETICS[id].name} skin!` }); } }
    return lines;
  },
  spend(price, currency) {
    const p = this.p; const amt = price[currency]; if (amt === undefined || p[currency] < amt) return false;
    p[currency] -= amt; this.save(); return true;
  },
  buyCosmetic(id, currency) {
    const c = ALL_COSMETICS[id]; const price = priceOf(c); if (!price || this.p.owned[id]) return false;
    if (!this.spend(price, currency)) return false;
    this.p.owned[id] = true; this.checkAch(); this.save(); return true;
  },
  equip(c) {
    const e = this.p.equip;
    if (c.type === 'skin') e.skin[c.hero] = c.id;
    else if (c.type === 'emote') { if (!e.emotes.includes(c.id)) { e.emotes.unshift(c.id); e.emotes = e.emotes.slice(0, 4); } }
    else e[c.type] = c.id;
    this.save();
  },
  // ---- Trophy road
  roadPending() { return TROPHY_ROAD.filter((r) => r.t <= this.p.maxTrophies && !this.p.road.claimed.includes(r.t)); },
  claimRoad(t) { const r = TROPHY_ROAD.find((x) => x.t === t); if (!r || this.p.road.claimed.includes(t) || this.p.maxTrophies < t) return []; this.p.road.claimed.push(t); const l = this.grant(r.r); this.checkAch(); this.save(); return l; },
  // ---- Pass
  passTier() { return Math.min(PASS.length, Math.floor(this.p.pass.xp / PASS_XP_PER_TIER)); },
  claimPass(tier, prem) {
    const p = this.p; const arr = prem ? p.pass.cp : p.pass.cf; if (arr.includes(tier) || this.passTier() < tier || (prem && !p.pass.premium)) return [];
    arr.push(tier); const l = this.grant(PASS[tier - 1][prem ? 'prem' : 'free']); this.save(); return l;
  },
  // ---- Quests
  questState() { const q = this.p.quests; return q.list.map((x) => ({ ...x, prog: Math.min(x.n, q.prog[x.key] || 0), done: (q.prog[x.key] || 0) >= x.n, claimed: !!q.claimed[x.key] })); },
  claimQuest(key) { const q = this.p.quests; const x = q.list.find((y) => y.key === key); if (!x || q.claimed[key] || (q.prog[key] || 0) < x.n) return []; q.claimed[key] = true; this.p.pass.xp += x.xp; const l = this.grant({ gold: x.gold }); l.push({ icon: '⚡', text: `+${x.xp} Pass XP` }); this.save(); return l; },
  rerollQuest(key) { const q = this.p.quests; const i = q.list.findIndex((y) => y.key === key); if (i < 0) return; const pool = dailyQuests(q.day + 1000 + q.rerolls * 17 + i).filter((n) => !q.list.some((o) => o.id === n.id)); if (!pool.length) return; q.list[i] = { ...pool[0], key: pool[0].key + '_r' + q.rerolls }; q.rerolls++; this.save(); },
  // ---- Achievements
  checkAch() {
    const p = this.p; const out = [];
    for (const a of ACHIEVEMENTS) { if (p.ach[a.id]) continue; if ((p.stats[a.stat] || 0) >= a.n) { p.ach[a.id] = true; out.push({ a, lines: this.grant(a.r) }); } }
    return out;
  },
  // ---- Daily login
  claimLogin() { const p = this.p; if (!p.login.pending) return []; p.login.pending = false; const l = this.grant(LOGIN_REWARDS[(p.login.streak - 1) % 7]); this.save(); return l; },
  // ---- Account level
  levelXpNeeded(l) { return 200 + l * 60; },
  // ---- Daily shop: deterministic per day, same for every player (good for community chatter)
  shopToday() {
    const r = seeded(dayNumber() * 31337); const pool = Object.values(ALL_COSMETICS).filter((c) => priceOf(c) && (c.type !== 'skin' || this.ownsHero(c.hero) || r() < 0.3));
    const pick = (filter, n) => { const list = pool.filter(filter); const out = []; while (out.length < n && list.length) out.push(list.splice(Math.floor(r() * list.length), 1)[0]); return out; };
    return [...pick((c) => c.type === 'skin' && (c.rarity === 'legendary' || c.rarity === 'epic'), 2), ...pick((c) => c.type === 'skin' && (c.rarity === 'rare' || c.rarity === 'common'), 2), ...pick((c) => c.type !== 'skin', 4)];
  },
  // ---- Apply match result. Returns a summary for the results screen.
  applyMatch(res) {
    const p = this.p; const s = p.stats; const out = { lines: [], roadNew: [], levelUp: false, masteryUp: null, ach: [] };
    s.matches++; if (res.won) s.wins++; s.kills += res.kills; s.steals += res.steals; s.damage += res.damage; if (res.place <= 3) s.top3++; s.ults += res.ults; s.crates += res.crates; s.maxLvl = Math.max(s.maxLvl, res.maxLvl); s.bestKills = Math.max(s.bestKills, res.kills);
    const before = p.trophies;
    const td = res.tutorial ? Math.max(8, trophyDelta(res.place, res.total, p.trophies, res.kills)) : trophyDelta(res.place, res.total, p.trophies, res.kills);
    p.trophies = Math.max(0, p.trophies + td); out.trophyDelta = p.trophies - before;
    const oldMax = p.maxTrophies; p.maxTrophies = Math.max(p.maxTrophies, p.trophies);
    out.roadNew = TROPHY_ROAD.filter((r) => r.t > oldMax && r.t <= p.maxTrophies);
    const placeGold = [0, 60, 40, 30, 22, 16, 12, 9, 7, 5, 4, 3, 2];
    const gold = 10 + res.kills * 6 + res.steals * 2 + (placeGold[res.place] || 2);
    out.gold = gold; p.gold += gold;
    const xp = 40 + res.kills * 15 + res.steals * 5 + Math.round((res.total - res.place + 1) * 8);
    out.xp = xp; p.pass.xp += xp; p.xp += xp;
    while (p.xp >= this.levelXpNeeded(p.level)) { p.xp -= this.levelXpNeeded(p.level); p.level++; out.levelUp = true; p.gold += 100; out.lines.push({ icon: '🆙', text: `Level ${p.level}! +100 Gold` }); }
    // mastery
    const h = p.heroes[res.hero]; if (h) { const old = masteryOf(h.mxp); h.mxp += xp; const nw = masteryOf(h.mxp); if (nw.lvl > old.lvl) { out.masteryUp = nw; const r = nw.r && nw.r.skinOf ? { skinOf: res.hero } : nw.r; out.lines.push(...this.grant(r)); } }
    // quests
    const q = p.quests; const add = (stat, v, max) => { for (const x of q.list) if (x.stat === stat) q.prog[x.key] = max ? Math.max(q.prog[x.key] || 0, v) : (q.prog[x.key] || 0) + v; };
    add('matches', 1); add('kills', res.kills); add('steals', res.steals); add('top3', res.place <= 3 ? 1 : 0); add('damage', res.damage); add('ults', res.ults); add('crates', res.crates); add('maxLvl', res.maxLvl, true); add('wins', res.won ? 1 : 0);
    out.questsReady = this.questState().filter((x) => x.done && !x.claimed).length;
    out.ach = this.checkAch();
    p.matchesSinceAd++;
    this.save();
    return out;
  },
};
