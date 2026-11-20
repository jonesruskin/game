// Cosmetics: 100% visual. Nothing here touches stats — skill decides every match.
import { HEROES } from './heroes.js';

export const RARITY = {
  common: { name: 'Common', color: '#b0bec5', gold: 350 },
  rare: { name: 'Rare', color: '#4cc9f0', gold: 1000, gems: 60 },
  epic: { name: 'Epic', color: '#c77dff', gems: 150 },
  legendary: { name: 'Legendary', color: '#ffd60a', gems: 320 },
  mythic: { name: 'Mythic', color: '#ff4d6d' }, // pass / achievement exclusive — cannot be bought directly
};

// Skin themes applied across all heroes. fx = special render flag.
const THEMES = [
  { key: 'midnight', name: 'Midnight', rarity: 'common', c1: '#3d405b', c2: '#81b29a' },
  { key: 'bubblegum', name: 'Bubblegum', rarity: 'rare', c1: '#ff8fab', c2: '#ffe5ec', extra: 'bow' },
  { key: 'synth', name: 'Synthwave', rarity: 'epic', c1: '#7209b7', c2: '#4cc9f0', extra: 'visor', fx: 'neon' },
  { key: 'midas', name: 'Midas', rarity: 'legendary', c1: '#ffd60a', c2: '#fff3b0', extra: 'crown', fx: 'shine' },
  { key: 'galaxy', name: 'Galaxy', rarity: 'mythic', c1: '#3c096c', c2: '#e0aaff', extra: 'halo', fx: 'stars', source: 'pass' },
];
export const SKINS = [];
for (const h of HEROES) {
  SKINS.push({ id: `${h.id}_default`, hero: h.id, name: 'Classic', rarity: 'common', c1: h.color, c2: h.color2, owned: true, source: 'default' });
  for (const t of THEMES) SKINS.push({ id: `${h.id}_${t.key}`, hero: h.id, name: `${t.name} ${h.name}`, rarity: t.rarity, c1: t.c1, c2: t.c2, extra: t.extra, fx: t.fx, source: t.source || 'shop' });
}
// Hero mastery skins (earned by playing a hero a lot)
for (const h of HEROES) SKINS.push({ id: `${h.id}_master`, hero: h.id, name: `Grandmaster ${h.name}`, rarity: 'mythic', c1: '#111', c2: h.color, extra: 'horns', fx: 'aura', source: 'mastery' });

export const TRAILS = [
  { id: 'none', name: 'None', rarity: 'common', source: 'default' },
  { id: 'dust', name: 'Dust Kick', rarity: 'common', color: '#c2b280', source: 'default' },
  { id: 'sparkle', name: 'Sparkles', rarity: 'rare', color: '#fff3b0' },
  { id: 'hearts', name: 'Lovestruck', rarity: 'rare', color: '#ff4d6d', glyph: '❤' },
  { id: 'bolts', name: 'Static', rarity: 'epic', color: '#f8f32b' },
  { id: 'bubbles', name: 'Bubbles', rarity: 'rare', color: '#a0e7ff' },
  { id: 'notes', name: 'Mixtape', rarity: 'epic', color: '#c77dff', glyph: '♪' },
  { id: 'rainbow', name: 'Prism', rarity: 'legendary', color: 'rainbow' },
  { id: 'stars', name: 'Stardust', rarity: 'mythic', color: '#e0aaff', glyph: '✦', source: 'pass' },
  { id: 'coins', name: 'Money Trail', rarity: 'mythic', color: '#ffd60a', glyph: '●', source: 'achievement' },
];
export const KOFX = [
  { id: 'poof', name: 'Poof', rarity: 'common', source: 'default' },
  { id: 'confetti', name: 'Party Time', rarity: 'rare' },
  { id: 'pixel', name: 'Glitch Out', rarity: 'epic' },
  { id: 'lightning', name: 'Smite', rarity: 'epic' },
  { id: 'firework', name: 'Grand Finale', rarity: 'legendary' },
  { id: 'ghost', name: 'Boo!', rarity: 'rare' },
  { id: 'supernova', name: 'Supernova', rarity: 'mythic', source: 'pass' },
];
export const EMOTES = [
  { id: 'gg', name: 'GG', text: 'GG', rarity: 'common', source: 'default' },
  { id: 'lol', name: 'LOL', text: '😂', rarity: 'common', source: 'default' },
  { id: 'cool', name: 'Too Cool', text: '😎', rarity: 'common', source: 'default' },
  { id: 'thanks', name: 'Thanks!', text: 'Thx for the power!', rarity: 'rare' },
  { id: 'crown', name: 'Royalty', text: '👑', rarity: 'rare' },
  { id: 'fire', name: 'On Fire', text: '🔥', rarity: 'rare' },
  { id: 'cry', name: 'Big Sad', text: '😭', rarity: 'common' },
  { id: 'think', name: 'Hmm', text: '🤔', rarity: 'common' },
  { id: 'ez', name: 'Too Easy', text: 'too easy 💅', rarity: 'epic' },
  { id: 'storm', name: 'Stormborn', text: '⛈️ STORMBORN ⛈️', rarity: 'mythic', source: 'pass' },
];
export const TITLES = [
  { id: 'rookie', name: 'Storm Rookie', source: 'default' },
  { id: 'pickpocket', name: 'Pickpocket', source: 'achievement' },
  { id: 'thief', name: 'Master Thief', source: 'achievement' },
  { id: 'champion', name: 'Champion', source: 'achievement' },
  { id: 'unstoppable', name: 'Unstoppable', source: 'achievement' },
  { id: 'collector', name: 'Collector', source: 'achievement' },
  { id: 'stormlord', name: 'Stormlord', source: 'pass' },
  { id: 'supporter', name: '💎 Supporter', source: 'pass' },
  { id: 'legend', name: 'Living Legend', source: 'achievement' },
];
export const ALL_COSMETICS = {};
for (const [type, list] of [['skin', SKINS], ['trail', TRAILS], ['kofx', KOFX], ['emote', EMOTES], ['title', TITLES]]) for (const c of list) { c.type = type; ALL_COSMETICS[c.id] = c; }
export function priceOf(c) {
  if (c.source && c.source !== 'shop') return null;
  if (c.type === 'title') return null;
  switch (c.rarity) {
    case 'common': return { gold: 350 };
    case 'rare': return { gold: 1000, gems: 60 };
    case 'epic': return { gems: 150 };
    case 'legendary': return { gems: 320 };
    default: return null;
  }
}
