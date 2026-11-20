// Lobby + meta screens. Pure DOM, event delegation via data-act.
import { HEROES, HERO } from '../data/heroes.js';
import { ABILITIES, ULTS } from '../data/abilities.js';
import { SKINS, TRAILS, KOFX, EMOTES, TITLES, ALL_COSMETICS, RARITY, priceOf } from '../data/cosmetics.js';
import { RANKS, rankOf, nextRank, TROPHY_ROAD, PASS, PASS_XP_PER_TIER, PASS_PRICE_GEMS, SEASON, ACHIEVEMENTS, LOGIN_REWARDS, MASTERY, masteryOf, GEM_PACKS } from '../data/progression.js';
import { drawHero } from '../game/render.js';
import { Save } from '../save.js';
import { Platform } from '../platform.js';
import { esc, fmtNum, el, dayNumber, TAU, rand } from '../util.js';

const TYPE_ICON = { trail: '✨', kofx: '💥', emote: '💬', title: '🏷️' };
export function rewardInfo(r) {
  if (!r) return { icon: '❔', text: '' };
  if (r.gold) return { icon: '🪙', text: `${r.gold} Gold` };
  if (r.gems) return { icon: '💎', text: `${r.gems} Gems` };
  if (r.hero) return { icon: '⭐', text: `Hero: ${HERO[r.hero].name}`, hero: r.hero };
  if (r.skinOf) return { icon: '🏆', text: 'Mastery skin' };
  for (const k of ['skin', 'trail', 'kofx', 'emote', 'title']) if (r[k]) { const c = ALL_COSMETICS[r[k]]; return { icon: k === 'skin' ? '👕' : TYPE_ICON[k], text: c.name, skin: k === 'skin' ? c : null, c }; }
  return { icon: '❔', text: '' };
}
function heroThumb(hero, skin, size = 96, aim = 0.6) {
  const c = document.createElement('canvas'); const d = Math.min(2, devicePixelRatio || 1); c.width = size * d; c.height = size * d;
  const x = c.getContext('2d'); x.scale(d * size / 96, d * size / 96); drawHero(x, hero, skin, 48, 56, aim, 1.2, { r: 26 }); return c;
}
function cosIcon(c) { if (c.type === 'trail') return c.glyph || (c.id === 'rainbow' ? '🌈' : c.id === 'none' ? '🚫' : '✨'); if (c.type === 'kofx') return { poof: '💨', confetti: '🎉', pixel: '👾', lightning: '🌩️', firework: '🎆', ghost: '👻', supernova: '🌟' }[c.id] || '💥'; if (c.type === 'emote') return c.text.length <= 2 ? c.text : '💬'; if (c.type === 'title') return '🏷️'; return '👕'; }

export class Menus {
  constructor(root, app) { this.root = root; this.app = app; this.t = 0; this.stageHero = null; this.toastRoot = document.getElementById('toasts');
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; this.app.audio.ensure(); this.app.audio.play('click'); this.act(b.dataset.act, b.dataset, b); });
    root.addEventListener('input', (e) => { const t = e.target; if (t.dataset.set) { Save.p.settings[t.dataset.set] = t.type === 'checkbox' ? t.checked : +t.value; Save.save(); this.app.applySettings(); } });
  }
  get p() { return Save.p; }
  toast(lines) { for (const l of [].concat(lines)) { const d = el('div', 'toast', `<span style="font-size:20px">${l.icon}</span>${esc(l.text)}`); this.toastRoot.appendChild(d); setTimeout(() => d.remove(), 2600); } }
  clear() { this.root.innerHTML = ''; this.stage = null; }

  // ------------------------------------------------------------------ LOBBY
  lobby() {
    const p = this.p; const h = HERO[p.selHero]; const rk = rankOf(p.trophies); const nr = nextRank(p.trophies);
    const nextRoad = TROPHY_ROAD.find((r) => r.t > p.maxTrophies); const prevT = [...TROPHY_ROAD].reverse().find((r) => r.t <= p.maxTrophies)?.t || 0;
    const ri = nextRoad ? rewardInfo(nextRoad.r) : null;
    const qs = Save.questState(); const qReady = qs.filter((q) => q.done && !q.claimed).length + (p.login.pending ? 1 : 0);
    const roadReady = Save.roadPending().length;
    const passTier = Save.passTier(); const passReady = PASS.filter((t) => t.tier <= passTier && (!p.pass.cf.includes(t.tier) || (p.pass.premium && !p.pass.cp.includes(t.tier)))).length;
    const lvlNeed = Save.levelXpNeeded(p.level);
    const title = ALL_COSMETICS[p.equip.title]?.name || '';
    this.root.innerHTML = `<div class="screen lobby">
      <div class="topbar">
        <div class="prof" data-act="profile"><span id="pav"></span><div><div class="nm">${esc(p.name)}</div><div class="tt">Lv ${p.level} · ${esc(title)}</div><div class="lvlbar"><i style="width:${(p.xp / lvlNeed) * 100}%"></i></div></div></div>
        <div class="chip" data-act="road" style="cursor:pointer;border-color:${rk.color}"><span class="ic">🏆</span>${p.trophies}<span class="rank" style="color:${rk.color};font-size:12px">${rk.icon} ${rk.name}</span></div>
        <div class="spacer"></div>
        <div class="chip"><span class="ic">🪙</span>${fmtNum(p.gold)}</div>
        <div class="chip ${Platform.purchasesAvailable ? 'plus' : ''}" data-act="shop" style="cursor:pointer"><span class="ic">💎</span>${fmtNum(p.gems)}</div>
      </div>
      <div class="lmain">
        <div class="nav">
          <button class="navb" data-act="heroes"><span class="ic">🦸</span>HEROES</button>
          <button class="navb" data-act="locker"><span class="ic">🎨</span>LOCKER</button>
          <button class="navb" data-act="shop"><span class="ic">🛒</span>SHOP</button>
          <button class="navb" data-act="pass"><span class="ic">⚡</span>PASS${passReady ? `<span class="badge">${passReady}</span>` : ''}</button>
          <button class="navb" data-act="quests"><span class="ic">📜</span>QUESTS${qReady ? `<span class="badge">${qReady}</span>` : ''}</button>
          <button class="navb" data-act="road"><span class="ic">🏆</span>ROAD${roadReady ? `<span class="badge">${roadReady}</span>` : ''}</button>
        </div>
        <div class="stage" id="stage">
          <canvas id="stagecv"></canvas>
          <div class="heroarrows"><button data-act="herocycle" data-d="-1">‹</button><button data-act="herocycle" data-d="1">›</button></div>
          <div class="heroname"><div class="n stroke" style="color:${h.color}">${esc(h.name)}</div><div class="s">${esc(h.title)} · ${esc(h.role)} · Mastery: ${masteryOf(p.heroes[h.id]?.mxp || 0).name}</div></div>
        </div>
        <div class="side">
          <div class="card road" data-act="road" style="cursor:pointer">
            ${nextRoad ? `<div class="tx"><span>${ri.icon} Next: ${esc(ri.text)}</span><span>🏆 ${nextRoad.t}</span></div><div class="pb"><i style="width:${Math.min(100, ((p.maxTrophies - prevT) / (nextRoad.t - prevT)) * 100)}%"></i></div>` : '<div class="tx">Trophy Road complete! 👑</div>'}
            ${nr ? `<div class="muted" style="margin-top:6px">${nr.icon} ${nr.name} rank at ${nr.min} trophies</div>` : ''}
          </div>
          <div class="card" data-act="quests" style="cursor:pointer"><h4><span>Daily Quests</span><span>⏳ ${this.timeToReset()}</span></h4>
            ${qs.map((q) => `<div class="qrow"><span style="width:16px">${q.claimed ? '✅' : q.done ? '🎁' : '▫️'}</span><span style="flex:2">${esc(q.text)}</span><div class="pb blue"><i style="width:${(q.prog / q.n) * 100}%"></i></div></div>`).join('')}
          </div>
          <div class="card" data-act="pass" style="cursor:pointer"><h4><span>⚡ Storm Pass · Tier ${passTier}/30</span><span>${p.pass.premium ? '💎 PREMIUM' : ''}</span></h4><div class="pb blue"><i style="width:${passTier >= 30 ? 100 : ((p.pass.xp % PASS_XP_PER_TIER) / PASS_XP_PER_TIER) * 100}%"></i></div></div>
          <button class="play" data-act="play">PLAY<small>Battle Royale · 12 players · ~3 min</small></button>
        </div>
      </div></div>`;
    this.root.querySelector('#pav').appendChild(heroThumb(h, Save.skinFor(h.id), 40));
    this.stage = this.root.querySelector('#stagecv'); this.stageHero = h; this.sparks = [];
    if (p.login.pending) setTimeout(() => this.loginPopup(), 300);
  }
  timeToReset() { const now = new Date(); const t = new Date(now); t.setHours(24, 0, 0, 0); const ms = t - now; const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000); return `${h}h ${m}m`; }
  tick(dt) {
    this.t += dt;
    if (!this.stage || !this.stage.isConnected) return;
    const cv = this.stage; const d = Math.min(2, devicePixelRatio || 1); const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    if (cv.width !== Math.round(w * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
    const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, w, h);
    const s = Math.min(w, h * 0.8) / 160; const cx = w / 2, cy = h * 0.46;
    // pedestal + storm ring
    const g = x.createRadialGradient(cx, cy + 30 * s, 0, cx, cy + 30 * s, 60 * s); g.addColorStop(0, 'rgba(199,125,255,.55)'); g.addColorStop(1, 'rgba(199,125,255,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy + 30 * s, 60 * s, 18 * s, 0, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(255,214,10,.5)'; x.lineWidth = 2; x.setLineDash([8, 10]); x.lineDashOffset = -this.t * 30; x.beginPath(); x.ellipse(cx, cy + 30 * s, 42 * s, 12 * s, 0, 0, TAU); x.stroke(); x.setLineDash([]);
    if (Math.random() < 0.3) this.sparks.push({ x: cx + rand(-60, 60) * s, y: cy + 30 * s, v: rand(20, 60), life: 2, c: this.stageHero.color2 });
    for (const sp of this.sparks) { sp.y -= sp.v * dt; sp.life -= dt; x.globalAlpha = Math.max(0, sp.life / 2); x.fillStyle = sp.c; x.fillRect(sp.x, sp.y, 3, 3); } x.globalAlpha = 1; this.sparks = this.sparks.filter((sp) => sp.life > 0);
    x.save(); x.translate(cx, cy); x.scale(s * 1.25, s * 1.25);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(0, 22, 24, 8, 0, 0, TAU); x.fill();
    drawHero(x, this.stageHero, Save.skinFor(this.stageHero.id), 0, 0, Math.sin(this.t * 0.8) * 0.9 + 0.3, this.t, { moving: false });
    x.restore();
  }
  act(a, d) {
    const p = this.p;
    switch (a) {
      case 'play': this.app.startMatch(); break;
      case 'herocycle': { const owned = HEROES.filter((h) => Save.ownsHero(h.id)); const i = owned.findIndex((h) => h.id === p.selHero); p.selHero = owned[(i + +d.d + owned.length) % owned.length].id; Save.save(); this.lobby(); break; }
      case 'heroes': this.heroes(); break;
      case 'hero': this.heroDetail(d.id); break;
      case 'selhero': if (Save.ownsHero(d.id)) { p.selHero = d.id; Save.save(); this.lobby(); } break;
      case 'locker': this.locker(d.tab || 'skin'); break;
      case 'equip': { const c = ALL_COSMETICS[d.id]; if (Save.owns(d.id)) { Save.equip(c); this.toast({ icon: '✅', text: `Equipped ${c.name}` }); } this.refreshModal(); break; }
      case 'shop': this.shop(); break;
      case 'buy': { const c = ALL_COSMETICS[d.id]; if (Save.buyCosmetic(d.id, d.cur)) { this.app.audio.play('buy'); this.toast({ icon: '🎉', text: `Unlocked ${c.name}!` }); Save.equip(c); } else this.toast({ icon: '❌', text: `Not enough ${d.cur}` }); this.refreshModal(); break; }
      case 'iap': this.buyGems(d.sku); break;
      case 'freegift': this.freeGift(d.ad === '1'); break;
      case 'pass': this.pass(); break;
      case 'claimpass': this.toast(Save.claimPass(+d.tier, d.prem === '1')); this.app.audio.play('buy'); this.refreshModal(); break;
      case 'buypass': if (p.pass.premium) break; if (p.gems >= PASS_PRICE_GEMS) { p.gems -= PASS_PRICE_GEMS; p.pass.premium = true; Save.save(); this.app.audio.play('level'); this.toast({ icon: '💎', text: 'Premium Storm Pass unlocked!' }); } else this.toast({ icon: '💎', text: `Need ${PASS_PRICE_GEMS} gems` }); this.refreshModal(); break;
      case 'quests': this.quests(); break;
      case 'claimq': this.toast(Save.claimQuest(d.key)); this.app.audio.play('buy'); this.refreshModal(); break;
      case 'rerollq': this.app.rewardedAd(() => { Save.rerollQuest(d.key); this.toast({ icon: '🔄', text: 'Quest rerolled!' }); this.refreshModal(); }); break;
      case 'road': this.road(); break;
      case 'claimroad': { const l = Save.claimRoad(+d.t); this.toast(l); this.app.audio.play('level'); this.refreshModal(); break; }
      case 'profile': this.profile(); break;
      case 'rename': { const v = this.root.querySelector('#nameIn').value.replace(/[^\w\- .]/g, '').trim().slice(0, 16); if (v.length >= 2) { p.name = v; Save.save(); this.toast({ icon: '✏️', text: 'Name saved' }); } this.refreshModal(); break; }
      case 'close': this.closeModal(); break;
      case 'resume': this.app.resume(); break;
      case 'quit': this.app.quitMatch(); break;
      case 'again': this.app.afterResults(true); break;
      case 'tolobby': this.app.afterResults(false); break;
      case 'double': this.app.rewardedAd(() => { if (this.lastRes && !this.lastRes.doubled) { this.lastRes.doubled = true; Save.grant({ gold: this.lastRes.sum.gold }); Save.save(); this.toast({ icon: '🪙', text: `+${this.lastRes.sum.gold} bonus Gold!` }); const b = this.root.querySelector('[data-act=double]'); if (b) b.remove(); } }); break;
      case 'login': this.toast(Save.claimLogin()); this.app.audio.play('level'); this.closeModal(); break;
    }
  }
  modal(title, body, opts = {}) {
    this.closeModal();
    const m = el('div', 'modal', `<div class="panel" style="${opts.w ? `width:min(${opts.w}px,100%)` : ''}"><div class="phead"><h2 class="stroke">${title}</h2>${opts.head || ''}${opts.noClose ? '' : '<button class="x" data-act="close">✕</button>'}</div>${opts.tabs || ''}<div class="pbody">${body}</div></div>`);
    this.root.appendChild(m); this.modalEl = m; this.modalRender = opts.render; return m;
  }
  refreshModal() { if (this.modalRender) { const scroll = this.modalEl?.querySelector('.pbody')?.scrollTop; const pass = this.modalEl?.querySelector('.pass')?.scrollLeft; this.modalRender(); const b = this.modalEl?.querySelector('.pbody'); if (b && scroll) b.scrollTop = scroll; const ps = this.modalEl?.querySelector('.pass'); if (ps && pass) ps.scrollLeft = pass; } this.refreshTop(); }
  refreshTop() { if (this.app.state === 'lobby') { const keep = this.modalEl; const render = this.modalRender; this.lobby(); if (keep) { this.root.appendChild(keep); this.modalEl = keep; this.modalRender = render; } } }
  closeModal() { if (this.modalEl) this.modalEl.remove(); this.modalEl = null; this.modalRender = null; if (this.app.state === 'lobby') this.lobby(); }

  // ------------------------------------------------------------------ HEROES
  heroes() {
    const render = () => {
      const p = this.p;
      const body = `<div class="grid">${HEROES.map((h) => { const own = Save.ownsHero(h.id); const m = masteryOf(p.heroes[h.id]?.mxp || 0); return `<div class="item ${own ? '' : 'locked'} ${p.selHero === h.id ? 'sel' : ''}" data-act="hero" data-id="${h.id}"><span class="th" data-h="${h.id}"></span>${own ? '' : '<span class="lock">🔒</span>'}<div class="nm" style="color:${h.color}">${h.name}</div><div class="sub">${h.role}${own ? ` · ${m.name}` : ` · 🏆 ${h.unlock}`}</div></div>`; }).join('')}</div>
        <p class="muted" style="margin-top:12px">Heroes unlock on the Trophy Road by playing — never with money. Every hero is balanced: only skill decides the match.</p>`;
      this.modal('Heroes', body, { render });
      this.modalEl.querySelectorAll('.th').forEach((s) => s.appendChild(heroThumb(HERO[s.dataset.h], Save.skinFor(s.dataset.h))));
    };
    render();
  }
  heroDetail(id) {
    const h = HERO[id]; const own = Save.ownsHero(id); const p = this.p; const hx = p.heroes[id]; const m = masteryOf(hx?.mxp || 0); const nm = MASTERY.find((x) => x.lvl === m.lvl + 1);
    const w = h.weapon; const u = ULTS[h.ult.id];
    const body = `<div class="herodetail"><div class="l"><span id="hdc"></span><div class="stroke" style="font-size:28px;font-weight:900;color:${h.color};font-style:italic">${h.name.toUpperCase()}</div><div class="muted">${h.title}</div>
      <div class="row" style="justify-content:center">${own ? `<button class="btn gold" data-act="selhero" data-id="${id}">${p.selHero === id ? '✅ Selected' : 'SELECT'}</button><button class="btn" data-act="locker" data-tab="skin">Skins</button>` : `<span class="btn dis">🔒 ${h.unlock} 🏆 on Trophy Road</span>`}</div>
      ${own ? `<div style="width:100%;margin-top:6px"><div class="muted">Mastery: ${m.name}${nm ? ` → ${nm.name}` : ''}</div><div class="pb blue"><i style="width:${nm ? ((hx.mxp - m.xp) / (nm.xp - m.xp)) * 100 : 100}%"></i></div></div>` : ''}
      <p class="muted" style="margin-top:8px;font-style:italic">“${esc(h.lore)}”</p></div>
      <div class="r">
        <div class="row"><span class="tag">❤️ ${h.hp} HP</span><span class="tag">👟 Speed ${h.speed}</span><span class="tag">${h.role}</span></div>
        <div class="kv"><div class="k">🎯</div><div><b>${w.name} <span class="tag">ATTACK</span></b><span>${w.count > 1 ? `${w.count}×` : ''}${w.dmg} dmg · range ${w.range}${w.burn ? ' · burns' : ''}${w.slow ? ' · slows' : ''}${w.bounce ? ' · bounces' : ''}${w.boomerang ? ' · returns' : ''}</span></div></div>
        <div class="kv"><div class="k">🧬</div><div><b>${h.passive.name} <span class="tag">PASSIVE</span></b><span>${esc(h.passive.desc)}</span></div></div>
        <div class="kv"><div class="k">${u.icon}</div><div><b>${h.ult.name} <span class="tag">ULTIMATE</span></b><span>${esc(h.ult.desc)}</span></div></div>
        ${h.kit.map((k, i) => { const a = ABILITIES[k]; return `<div class="kv"><div class="k">${a.icon}</div><div><b>${a.name} <span class="tag" style="color:#7CFC9A">${i ? 'E' : 'Q'} · STEALABLE</span></b><span>${esc(a.desc)} (${a.cd}s)</span></div></div>`; }).join('')}
        <p class="muted">💡 Q/E abilities drop when a hero is KO'd. Grab duplicates to upgrade them up to Lv3!</p>
      </div></div>`;
    this.modal(h.name, body, { render: () => this.heroDetail(id), head: '<button class="btn sm" data-act="heroes">‹ All heroes</button>' });
    this.modalEl.querySelector('#hdc').appendChild(heroThumb(h, Save.skinFor(id), 200));
  }
  // ------------------------------------------------------------------ LOCKER
  locker(tab) {
    const render = () => {
      const p = this.p; const hid = p.selHero;
      const tabs = `<div class="tabs">${[['skin', '👕 Skins'], ['trail', '✨ Trails'], ['kofx', '💥 KO Effects'], ['emote', '💬 Emotes'], ['title', '🏷️ Titles']].map(([k, n]) => `<button class="tab ${tab === k ? 'on' : ''}" data-act="locker" data-tab="${k}">${n}</button>`).join('')}</div>`;
      let list = tab === 'skin' ? SKINS.filter((s) => s.hero === hid) : tab === 'trail' ? TRAILS : tab === 'kofx' ? KOFX : tab === 'emote' ? EMOTES : TITLES;
      const equipped = (c) => tab === 'skin' ? Save.skinFor(hid).id === c.id : tab === 'emote' ? p.equip.emotes.includes(c.id) : p.equip[tab] === c.id;
      const body = `${tab === 'skin' ? `<div class="row"><span class="muted">Skins for <b style="color:${HERO[hid].color}">${HERO[hid].name}</b> — change hero in the lobby.</span></div>` : ''}<div class="grid">${list.map((c) => {
        const own = Save.owns(c.id); const pr = priceOf(c); const rr = RARITY[c.rarity] || RARITY.common;
        return `<div class="item ${own ? '' : 'locked'} ${equipped(c) ? 'sel' : ''}" style="border-color:${rr.color}">${c.type === 'skin' ? `<span class="th" data-id="${c.id}"></span>` : `<div class="big-ic">${cosIcon(c)}</div>`}
          <div class="nm">${esc(c.name)}</div><div class="rar" style="color:${rr.color}">${rr.name}</div>${c.type === 'emote' ? `<div class="sub">“${esc(c.text)}”</div>` : ''}
          <div class="price">${own ? (equipped(c) ? '<span class="btn sm dis">Equipped</span>' : `<button class="btn sm green" data-act="equip" data-id="${c.id}">Equip</button>`) : pr ? `${pr.gold ? `<button class="btn sm gold" data-act="buy" data-id="${c.id}" data-cur="gold">🪙 ${pr.gold}</button>` : ''}${pr.gems ? `<button class="btn sm gem" data-act="buy" data-id="${c.id}" data-cur="gems">💎 ${pr.gems}</button>` : ''}` : `<span class="sub">${c.source === 'pass' ? '⚡ Storm Pass' : c.source === 'mastery' ? '🏆 Hero Mastery' : c.source === 'achievement' ? '🎖️ Achievement' : '🏆 Trophy Road'}</span>`}</div></div>`;
      }).join('')}</div><p class="muted" style="margin-top:12px">Cosmetics are purely visual — they never change stats. Flex responsibly. 😎</p>`;
      this.modal('Locker', body, { tabs, render });
      this.modalEl.querySelectorAll('.th').forEach((s) => { const c = ALL_COSMETICS[s.dataset.id]; s.appendChild(heroThumb(HERO[c.hero], c)); });
    };
    render();
  }
  // ------------------------------------------------------------------ SHOP
  shop() {
    const render = () => {
      const p = this.p; const items = Save.shopToday();
      const gift = p.freeChestDay !== dayNumber();
      const body = `
        <div class="card" style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><div style="font-size:40px">🎁</div><div style="flex:1"><b>Daily Free Gift</b><div class="muted">Free gold every day. Watch an optional ad to triple it.</div></div>
          ${gift ? `<button class="btn green" data-act="freegift">Claim 50 🪙</button>${Platform.adsAvailable ? '<button class="btn ad" data-act="freegift" data-ad="1">📺 Claim 150 🪙</button>' : ''}` : '<span class="btn dis">Come back tomorrow</span>'}</div>
        <h3 class="stroke" style="margin:6px 0 8px">🔥 Today's Featured <span class="muted">· refreshes in ${this.timeToReset()}</span></h3>
        <div class="grid">${items.map((c) => { const own = Save.owns(c.id); const pr = priceOf(c); const rr = RARITY[c.rarity];
          return `<div class="item ${own ? 'locked' : ''}" style="border-color:${rr.color}">${c.type === 'skin' ? `<span class="th" data-id="${c.id}"></span>` : `<div class="big-ic">${cosIcon(c)}</div>`}<div class="nm">${esc(c.name)}</div><div class="rar" style="color:${rr.color}">${rr.name} ${c.type === 'kofx' ? 'KO effect' : c.type}</div>
          <div class="price">${own ? '<span class="btn sm dis">Owned</span>' : `${pr.gold ? `<button class="btn sm gold" data-act="buy" data-id="${c.id}" data-cur="gold">🪙 ${pr.gold}</button>` : ''}${pr.gems ? `<button class="btn sm gem" data-act="buy" data-id="${c.id}" data-cur="gems">💎 ${pr.gems}</button>` : ''}`}</div></div>`; }).join('')}</div>
        ${Platform.purchasesAvailable ? `<h3 class="stroke" style="margin:16px 0 8px">💎 Gems</h3><div class="grid">${GEM_PACKS.map((g) => `<div class="item" style="border-color:${g.best ? '#ffd60a' : '#4cc9f0'}">${g.best ? '<span class="lock">⭐</span>' : ''}<div class="big-ic">💎</div><div class="nm">${g.gems} Gems</div><div class="sub">${g.bonus || '&nbsp;'}</div><div class="price"><button class="btn sm gem" data-act="iap" data-sku="${g.sku}">${g.price}</button></div></div>`).join('')}</div>` : `<p class="muted" style="margin-top:14px">💎 Gems are earned from the Trophy Road, Storm Pass, achievements, hero mastery and daily logins.</p>`}
        <p class="muted" style="margin-top:10px">No loot boxes. No pay-to-win. Everything you buy is exactly what you see.</p>`;
      this.modal('Shop', body, { render });
      this.modalEl.querySelectorAll('.th').forEach((s) => { const c = ALL_COSMETICS[s.dataset.id]; s.appendChild(heroThumb(HERO[c.hero], c)); });
    };
    render();
  }
  freeGift(ad) {
    const p = this.p; if (p.freeChestDay === dayNumber()) return;
    const give = (n) => { p.freeChestDay = dayNumber(); this.toast(Save.grant({ gold: n })); Save.save(); this.app.audio.play('buy'); this.refreshModal(); };
    if (ad) this.app.rewardedAd(() => give(150)); else give(50);
  }
  async buyGems(sku) {
    const res = await Platform.purchase(sku);
    if (res.ok) { const g = GEM_PACKS.find((x) => x.sku === sku); this.toast(Save.grant({ gems: g.gems })); Save.save(); this.refreshModal(); }
    else this.toast({ icon: 'ℹ️', text: 'Purchases are not available right now.' });
  }
  // ------------------------------------------------------------------ PASS
  pass() {
    const render = () => {
      const p = this.p; const tier = Save.passTier();
      const cell = (t, prem) => { const r = prem ? t.prem : t.free; const ri = rewardInfo(r); const got = (prem ? p.pass.cp : p.pass.cf).includes(t.tier); const can = !got && tier >= t.tier && (!prem || p.pass.premium);
        return `<div class="rw ${prem ? 'prem' : ''} ${got ? 'got' : ''} ${can ? 'can' : ''}" ${can ? `data-act="claimpass" data-tier="${t.tier}" data-prem="${prem ? 1 : 0}"` : ''}>${prem && !p.pass.premium ? '<span class="lk">🔒</span>' : ''}${got ? '<span class="lk">✅</span>' : ''}${ri.skin ? `<span class="th" data-id="${ri.skin.id}"></span>` : `<span class="ic">${ri.c ? cosIcon(ri.c) : ri.icon}</span>`}<span>${esc(ri.text)}</span></div>`; };
      const body = `<div class="row"><div style="flex:1"><b style="font-size:18px">${SEASON.name}</b><div class="muted">Ends ${SEASON.ends} · Tier ${tier}/30 · ${p.pass.xp % PASS_XP_PER_TIER}/${PASS_XP_PER_TIER} XP to next tier</div></div>
        ${p.pass.premium ? '<span class="btn gold dis">💎 Premium Active</span>' : `<button class="btn gem" data-act="buypass">Unlock Premium · 💎 ${PASS_PRICE_GEMS}</button>`}</div>
        <div class="row muted">Top row: FREE for everyone. Bottom row: PREMIUM — exclusive Galaxy skins, Stardust trail, Supernova KO effect, 410 gems back &amp; more. Cosmetic only.</div>
        <div class="pass" id="passScroll">${PASS.map((t) => `<div class="tier ${t.tier === tier + 1 ? 'cur' : ''}"><div class="num">${t.tier}</div>${cell(t, false)}${cell(t, true)}</div>`).join('')}</div>
        <p class="muted">Earn Pass XP from every match and from daily quests.</p>`;
      this.modal('⚡ Storm Pass', body, { render });
      this.modalEl.querySelectorAll('.th').forEach((s) => { const c = ALL_COSMETICS[s.dataset.id]; const cv = heroThumb(HERO[c.hero], c, 56); s.appendChild(cv); });
      const sc = this.modalEl.querySelector('#passScroll'); if (sc && !sc.scrollLeft) sc.scrollLeft = Math.max(0, (tier - 2) * 116);
    };
    render();
  }
  // ------------------------------------------------------------------ QUESTS
  quests() {
    const render = () => {
      const p = this.p; const qs = Save.questState();
      const body = `<div class="card" style="margin-bottom:12px"><h4><span>📅 Login Streak · Day ${p.login.streak}/7</span></h4><div style="display:flex;gap:6px;flex-wrap:wrap">${LOGIN_REWARDS.map((r, i) => { const ri = rewardInfo(r); const dn = i + 1; return `<div class="rw" style="height:70px;flex:1;min-width:64px;${dn < p.login.streak || (dn === p.login.streak && !p.login.pending) ? 'opacity:.45' : ''}${dn === p.login.streak ? ';border-color:#ffd60a' : ''}"><span class="ic" style="font-size:22px">${ri.icon}</span><span>Day ${dn}</span></div>`; }).join('')}</div>${p.login.pending ? '<div class="row"><button class="btn gold" data-act="login">Claim today\'s reward</button></div>' : ''}</div>
        ${qs.map((q) => `<div class="card" style="margin-bottom:8px;display:flex;align-items:center;gap:12px"><div style="font-size:30px">${q.claimed ? '✅' : q.done ? '🎁' : '📜'}</div><div style="flex:1"><b>${esc(q.text)}</b><div class="muted">🪙 ${q.gold} · ⚡ ${q.xp} Pass XP</div><div class="pb blue" style="margin-top:5px"><i style="width:${(q.prog / q.n) * 100}%"></i></div><div class="muted">${fmtNum(q.prog)}/${fmtNum(q.n)}</div></div>
          ${q.claimed ? '' : q.done ? `<button class="btn green" data-act="claimq" data-key="${q.key}">Claim</button>` : Platform.adsAvailable && p.quests.rerolls < 2 ? `<button class="btn ad sm" data-act="rerollq" data-key="${q.key}">📺 Reroll</button>` : ''}</div>`).join('')}
        <p class="muted">New quests in ${this.timeToReset()}. Everyone gets the same quests each day — compare with friends!</p>`;
      this.modal('Quests', body, { render });
    };
    render();
  }
  loginPopup() {
    if (!this.p.login.pending || this.modalEl || this.app.state !== 'lobby') return;
    const r = LOGIN_REWARDS[(this.p.login.streak - 1) % 7]; const ri = rewardInfo(r);
    this.modal('Daily Reward', `<div style="text-align:center"><div style="font-size:70px">${ri.icon}</div><h2 class="stroke">Day ${this.p.login.streak} of 7</h2><p class="muted" style="margin:6px 0 14px">Log in every day for bigger rewards — Day 7 gives 40 💎!</p><button class="btn gold" style="font-size:22px;padding:12px 30px" data-act="login">Claim ${esc(ri.text)}</button></div>`, { w: 440 });
  }
  // ------------------------------------------------------------------ ROAD
  road() {
    const render = () => {
      const p = this.p; const pend = Save.roadPending().map((r) => r.t); const next = TROPHY_ROAD.find((r) => r.t > p.maxTrophies);
      const body = `<div class="row" style="gap:16px"><div><div class="muted">Trophies</div><b style="font-size:28px">🏆 ${p.trophies}</b> <span class="muted">best ${p.maxTrophies}</span></div><div class="row">${RANKS.map((r) => `<span class="tag" style="color:${r.color};${p.trophies >= r.min ? '' : 'opacity:.4'}">${r.icon} ${r.name} ${r.min}</span>`).join('')}</div></div>
        <div class="roadlist" id="roadScroll">${TROPHY_ROAD.map((r) => { const ri = rewardInfo(r.r); const done = p.road.claimed.includes(r.t); const can = pend.includes(r.t);
          return `<div class="rnode ${done ? 'done' : ''} ${can ? 'can' : ''} ${next && next.t === r.t ? 'next' : ''}"><div class="t">🏆 ${r.t}</div>${ri.hero ? `<span class="th" data-h="${ri.hero}"></span>` : ri.skin ? `<span class="th" data-id="${ri.skin.id}"></span>` : `<div class="ic">${ri.c ? cosIcon(ri.c) : ri.icon}</div>`}<div class="d">${esc(ri.text)}</div>${done ? '✅' : can ? `<button class="btn sm green" data-act="claimroad" data-t="${r.t}">Claim</button>` : '🔒'}</div>`; }).join('')}</div>
        <p class="muted">Win, KO and steal to climb. Higher ranks face smarter opponents.</p>`;
      this.modal('🏆 Trophy Road', body, { render });
      this.modalEl.querySelectorAll('.th').forEach((s) => { if (s.dataset.h) s.appendChild(heroThumb(HERO[s.dataset.h], Save.skinFor(s.dataset.h), 64)); else { const c = ALL_COSMETICS[s.dataset.id]; s.appendChild(heroThumb(HERO[c.hero], c, 64)); } });
      const sc = this.modalEl.querySelector('#roadScroll'); const idx = TROPHY_ROAD.findIndex((r) => r.t > p.maxTrophies); if (sc) sc.scrollLeft = Math.max(0, (idx - 2) * 130);
    };
    render();
  }
  // ------------------------------------------------------------------ PROFILE / SETTINGS
  profile() {
    const render = () => {
      const p = this.p; const s = p.stats; const S = p.settings;
      const body = `<div class="row"><input class="name" id="nameIn" maxlength="16" value="${esc(p.name)}"><button class="btn gold" data-act="rename">Save name</button></div>
        <div class="statrow" style="justify-content:flex-start;margin:10px 0">${[['Matches', s.matches], ['Wins', s.wins], ['Win %', s.matches ? Math.round((s.wins / s.matches) * 100) + '%' : '-'], ['KOs', s.kills], ['Steals', s.steals], ['Damage', fmtNum(s.damage)], ['Best KOs', s.bestKills]].map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('')}</div>
        <h3 class="stroke" style="margin:10px 0 6px">⚙️ Settings</h3>
        <div class="row"><span class="lbl">Sound FX</span><input class="sl" type="range" min="0" max="1" step="0.05" value="${S.sfx}" data-set="sfx"></div>
        <div class="row"><span class="lbl">Music</span><input class="sl" type="range" min="0" max="1" step="0.05" value="${S.music}" data-set="music"></div>
        <div class="row"><span class="lbl">Low effects</span><input type="checkbox" ${S.lowFx ? 'checked' : ''} data-set="lowFx"> <span class="muted">for older devices</span></div>
        <div class="row muted">Controls: WASD move · Mouse aim · Click shoot · Q/E abilities · R / Space / Right-click ultimate · 1/2 or F swap a stolen power · T emote · Esc pause</div>
        <h3 class="stroke" style="margin:12px 0 6px">🎖️ Achievements</h3>
        <div class="grid">${ACHIEVEMENTS.map((a) => { const done = p.ach[a.id]; const v = Math.min(a.n, p.stats[a.stat] || 0); const ri = rewardInfo(a.r); return `<div class="item ${done ? '' : 'locked'}" style="min-height:120px"><div style="font-size:30px">${done ? '🏅' : '🔒'}</div><div class="nm">${a.name}</div><div class="sub">${a.desc}</div><div class="pb blue" style="width:100%"><i style="width:${(v / a.n) * 100}%"></i></div><div class="sub">${ri.icon} ${esc(ri.text)}${a.r.title ? ' + title' : ''}</div></div>`; }).join('')}</div>
        <p class="muted" style="margin-top:12px">Progress is saved on this device${Platform.name === 'crazygames' ? ' and synced to your CrazyGames account when logged in' : ''}. Stealstorm v1.0</p>`;
      this.modal('Profile', body, { render });
    };
    render();
  }
  // ------------------------------------------------------------------ PAUSE
  pause() {
    this.modal('Paused', `<div style="text-align:center;display:flex;flex-direction:column;gap:12px;align-items:center"><button class="play" style="width:260px;height:70px;font-size:28px" data-act="resume">RESUME</button><button class="btn ad" data-act="quit">Leave match (counts as a loss)</button>
      <div class="row" style="width:100%"><span class="lbl">Sound FX</span><input class="sl" type="range" min="0" max="1" step="0.05" value="${this.p.settings.sfx}" data-set="sfx"></div><div class="row" style="width:100%"><span class="lbl">Music</span><input class="sl" type="range" min="0" max="1" step="0.05" value="${this.p.settings.music}" data-set="music"></div></div>`, { w: 420, noClose: true });
  }
  // ------------------------------------------------------------------ RESULTS
  results(res, sum) {
    this.lastRes = { res, sum, doubled: false };
    const p = this.p; const win = res.won; const rk = rankOf(p.trophies);
    const nextRoad = TROPHY_ROAD.find((r) => r.t > p.maxTrophies); const prevT = [...TROPHY_ROAD].reverse().find((r) => r.t <= p.maxTrophies)?.t || 0; const ri = nextRoad ? rewardInfo(nextRoad.r) : null;
    const flavor = win ? pickOne(['The storm bows to you.', 'Nobody could hold onto their powers around you.', 'Last one standing. Again?']) : res.place <= 3 ? 'So close! One more and that crown is yours.' : res.killerName ? `KO'd by ${res.killerName}${res.killerHero ? ` (${HERO[res.killerHero].name})` : ''}` : 'The storm got you.';
    this.root.innerHTML = `<div class="screen results">
      <div class="place ${win ? 'win' : ''} stroke">${win ? '#1 STORMBORN' : '#' + res.place}</div>
      <div class="rsub">${esc(flavor)} <span class="muted">· of ${res.total}</span></div>
      <div class="statrow">${[['KOs', res.kills], ['Steals', res.steals], ['Damage', fmtNum(res.damage)], ['Best Lv', res.maxLvl], ['Time', `${Math.floor(res.time / 60)}:${String(res.time % 60).padStart(2, '0')}`]].map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('')}</div>
      <div><div class="muted" style="margin-bottom:6px">Final build</div><div class="build">${res.build.map((b) => { const a = ABILITIES[b.id]; return `<div class="ab" style="background:${a.color}" title="${esc(a.name)}">${a.icon}<i>Lv${b.lvl}</i></div>`; }).join('')}</div></div>
      <div class="rewards"><div class="rew ${sum.trophyDelta >= 0 ? 'up' : 'down'}">🏆 ${sum.trophyDelta >= 0 ? '+' : ''}${sum.trophyDelta}</div><div class="rew">🪙 +${sum.gold}</div><div class="rew">⚡ +${sum.xp} XP</div></div>
      ${nextRoad ? `<div class="card" style="width:min(420px,92vw)"><div class="road"><div class="tx"><span>${ri.icon} Next: ${esc(ri.text)}</span><span>${p.maxTrophies}/${nextRoad.t} 🏆</span></div><div class="pb"><i id="rbar" style="width:${Math.min(100, ((p.maxTrophies - sum.trophyDelta - prevT) / (nextRoad.t - prevT)) * 100)}%"></i></div></div></div>` : ''}
      ${sum.roadNew.length ? `<div class="toast" style="animation:pop .4s">🎁 ${sum.roadNew.length} Trophy Road reward${sum.roadNew.length > 1 ? 's' : ''} unlocked — claim in the lobby!</div>` : ''}
      ${sum.questsReady ? `<div class="muted">📜 ${sum.questsReady} quest${sum.questsReady > 1 ? 's' : ''} ready to claim</div>` : ''}
      <div class="rbtns"><button class="play" data-act="again">PLAY AGAIN</button><button class="btn" style="height:70px;padding:0 24px;font-size:18px" data-act="tolobby">Lobby</button>
      ${Platform.adsAvailable ? `<button class="btn ad" style="height:70px;padding:0 20px" data-act="double">📺 +${sum.gold} Gold</button>` : ''}</div>
      <div class="muted">Rank: <span style="color:${rk.color}">${rk.icon} ${rk.name}</span> · 🏆 ${p.trophies}</div>
    </div>`;
    setTimeout(() => { const b = this.root.querySelector('#rbar'); if (b && nextRoad) b.style.width = Math.min(100, ((p.maxTrophies - prevT) / (nextRoad.t - prevT)) * 100) + '%'; }, 250);
    for (const l of sum.lines) setTimeout(() => this.toast(l), 600);
    for (const a of sum.ach) setTimeout(() => { this.toast({ icon: '🏅', text: `Achievement: ${a.a.name}` }); this.toast(a.lines); }, 900);
  }
}
function pickOne(a) { return a[Math.floor(Math.random() * a.length)]; }
