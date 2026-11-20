// Trophy road, ranks, Storm Pass, quests, achievements, login calendar.
import { seeded, dayNumber } from '../util.js';
import { HEROES } from './heroes.js';

export const RANKS = [
  { name: 'Bronze', min: 0, color: '#cd7f32', icon: '🥉' },
  { name: 'Silver', min: 100, color: '#c0c0c0', icon: '🥈' },
  { name: 'Gold', min: 250, color: '#ffd60a', icon: '🥇' },
  { name: 'Platinum', min: 500, color: '#7ae7c7', icon: '💠' },
  { name: 'Diamond', min: 800, color: '#4cc9f0', icon: '💎' },
  { name: 'Mythic', min: 1200, color: '#c77dff', icon: '🔮' },
  { name: 'Stormlord', min: 1700, color: '#ff4d6d', icon: '⛈️' },
];
export function rankOf(t) { let r = RANKS[0]; for (const k of RANKS) if (t >= k.min) r = k; return r; }
export function nextRank(t) { return RANKS.find((k) => k.min > t) || null; }

// Placement → trophies. Harder ranks lose more on bad placements (ELO-ish feel).
export function trophyDelta(place, total, trophies, kills) {
  const pct = (place - 1) / (total - 1); // 0 = winner
  const table = [12, 9, 7, 5, 4, 2, 1, 0, -1, -2, -3, -4];
  const base = table[Math.min(table.length - 1, Math.round(pct * (table.length - 1)))];
  const tier = Math.floor(trophies / 400);
  const neg = base < 0 ? base - tier : base;
  return Math.max(-12, neg + Math.min(kills, 4));
}

// Trophy road — the "Clash" steady-progress spine. Heroes unlock here, never with money.
export const TROPHY_ROAD = [
  { t: 10, r: { gold: 150 } },
  { t: 20, r: { emote: 'thanks' } },
  { t: 30, r: { hero: 'bastion' } },
  { t: 45, r: { gold: 250 } },
  { t: 60, r: { gems: 20 } },
  { t: 80, r: { hero: 'thorn' } },
  { t: 100, r: { trail: 'sparkle' } },
  { t: 125, r: { gold: 400 } },
  { t: 150, r: { hero: 'whisper' } },
  { t: 190, r: { gems: 30 } },
  { t: 220, r: { kofx: 'confetti' } },
  { t: 250, r: { hero: 'rime' } },
  { t: 300, r: { gold: 600 } },
  { t: 350, r: { skin: 'blaze_bubblegum' } },
  { t: 400, r: { hero: 'rift' } },
  { t: 470, r: { gems: 50 } },
  { t: 530, r: { trail: 'bubbles' } },
  { t: 600, r: { hero: 'nova' } },
  { t: 700, r: { gold: 1000 } },
  { t: 800, r: { kofx: 'ghost' } },
  { t: 950, r: { gems: 80 } },
  { t: 1100, r: { skin: 'volt_synth' } },
  { t: 1300, r: { gold: 1500 } },
  { t: 1500, r: { trail: 'notes' } },
  { t: 1700, r: { title: 'legend' } },
  { t: 2000, r: { gems: 150 } },
];

// Storm Pass — season track. Free lane for everyone; premium lane is cosmetic-only.
export const PASS_XP_PER_TIER = 300;
export const PASS_PRICE_GEMS = 450;
export const SEASON = { n: 1, name: 'Season 1: First Flash', ends: '2027-01-31' };
export const PASS = [];
{
  const freeCycle = [{ gold: 120 }, { gold: 150 }, { gems: 10 }, { gold: 200 }, { emote: 'cry' }, { gold: 250 }, { emote: 'think' }, { gold: 300 }, { gems: 15 }];
  const prem = {
    1: { skin: 'blaze_galaxy' }, 3: { gems: 40 }, 5: { trail: 'stars' }, 7: { skin: 'volt_galaxy' }, 9: { gems: 50 }, 10: { emote: 'storm' }, 12: { skin: 'bastion_galaxy' },
    14: { gold: 800 }, 15: { kofx: 'supernova' }, 17: { skin: 'thorn_galaxy' }, 19: { gems: 60 }, 20: { title: 'supporter' }, 22: { skin: 'whisper_galaxy' }, 24: { gems: 70 },
    25: { skin: 'rime_galaxy' }, 27: { skin: 'rift_galaxy' }, 29: { gems: 100 }, 30: { skin: 'nova_galaxy' },
  };
  for (let i = 1; i <= 30; i++) PASS.push({ tier: i, free: i === 30 ? { title: 'stormlord' } : i === 15 ? { gems: 30 } : freeCycle[(i - 1) % freeCycle.length], prem: prem[i] || { gold: 200 + i * 10 } });
}

// Quests: 3 per day, chosen deterministically from the date so every player gets the same set (shareable!).
const QUEST_POOL = [
  { id: 'play', text: 'Play {n} matches', stat: 'matches', n: [3, 5] , gold: 120, xp: 250 },
  { id: 'kills', text: 'Get {n} KOs', stat: 'kills', n: [5, 12], gold: 150, xp: 300 },
  { id: 'steal', text: 'Steal {n} abilities', stat: 'steals', n: [4, 10], gold: 150, xp: 300 },
  { id: 'top3', text: 'Reach the top 3 in {n} matches', stat: 'top3', n: [2, 3], gold: 180, xp: 350 },
  { id: 'dmg', text: 'Deal {n} damage', stat: 'damage', n: [2500, 5000], gold: 140, xp: 300 },
  { id: 'ults', text: 'Use your ultimate {n} times', stat: 'ults', n: [4, 8], gold: 120, xp: 250 },
  { id: 'crates', text: 'Smash {n} crates', stat: 'crates', n: [8, 15], gold: 110, xp: 220 },
  { id: 'upgrade', text: 'Upgrade an ability to Lv{n}', stat: 'maxLvl', n: [3, 3], gold: 200, xp: 400, max: true },
  { id: 'win', text: 'Win {n} match', stat: 'wins', n: [1, 1], gold: 250, xp: 450 },
];
export function dailyQuests(day = dayNumber()) {
  const r = seeded(day * 7919);
  const pool = QUEST_POOL.slice(); const out = [];
  while (out.length < 3) { const q = pool.splice(Math.floor(r() * pool.length), 1)[0]; const n = Math.round(q.n[0] + r() * (q.n[1] - q.n[0])); out.push({ ...q, n, text: q.text.replace('{n}', n), key: `${day}_${q.id}` }); }
  return out;
}

export const ACHIEVEMENTS = [
  { id: 'first_win', name: 'Eye of the Storm', desc: 'Win your first match', stat: 'wins', n: 1, r: { gems: 30, title: 'champion' } },
  { id: 'steal_25', name: 'Pickpocket', desc: 'Steal 25 abilities', stat: 'steals', n: 25, r: { gems: 20, title: 'pickpocket' } },
  { id: 'steal_200', name: 'Master Thief', desc: 'Steal 200 abilities', stat: 'steals', n: 200, r: { gems: 60, title: 'thief' } },
  { id: 'kills_100', name: 'Centurion', desc: 'Get 100 KOs', stat: 'kills', n: 100, r: { gems: 40 } },
  { id: 'kills_1000', name: 'Unstoppable', desc: 'Get 1,000 KOs', stat: 'kills', n: 1000, r: { gems: 120, title: 'unstoppable' } },
  { id: 'wins_25', name: 'Storm Chaser', desc: 'Win 25 matches', stat: 'wins', n: 25, r: { gems: 80 } },
  { id: 'wins_100', name: 'Money Moves', desc: 'Win 100 matches', stat: 'wins', n: 100, r: { trail: 'coins' } },
  { id: 'heroes_all', name: 'Full Roster', desc: 'Unlock every hero', stat: 'heroesOwned', n: HEROES.length, r: { gems: 100, title: 'collector' } },
  { id: 'lvl3', name: 'Overclocked', desc: 'Upgrade an ability to Lv3', stat: 'maxLvl', n: 3, r: { gems: 20 } },
  { id: 'streak5', name: 'Rampage', desc: 'Get 5 KOs in one match', stat: 'bestKills', n: 5, r: { gems: 30 } },
];

// 7-day login loop (resets if a day is skipped — gentle streak pressure)
export const LOGIN_REWARDS = [{ gold: 100 }, { gold: 150 }, { gems: 10 }, { gold: 250 }, { gems: 15 }, { gold: 400 }, { gems: 40 }];

// Hero mastery (per-hero XP) — cosmetic milestones only.
export const MASTERY = [
  { lvl: 1, xp: 0, name: 'Novice' }, { lvl: 2, xp: 400, name: 'Adept', r: { gold: 200 } }, { lvl: 3, xp: 1200, name: 'Expert', r: { gems: 20 } },
  { lvl: 4, xp: 2800, name: 'Master', r: { gems: 40 } }, { lvl: 5, xp: 5500, name: 'Grandmaster', r: { skinOf: true } },
];
export function masteryOf(xp) { let m = MASTERY[0]; for (const k of MASTERY) if (xp >= k.xp) m = k; return m; }

// Real-money gem packs (only shown where the host platform supports purchases).
export const GEM_PACKS = [
  { sku: 'gems_100', gems: 100, price: '$0.99', bonus: '' },
  { sku: 'gems_550', gems: 550, price: '$4.99', bonus: '+10%' },
  { sku: 'gems_1200', gems: 1200, price: '$9.99', bonus: '+20%', best: true },
  { sku: 'gems_2600', gems: 2600, price: '$19.99', bonus: '+30%' },
];
