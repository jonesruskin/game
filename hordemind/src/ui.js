// HORDEMIND menus + HUD.
import { HEROES, HERO, QUEENS, QUEEN, SPECIES, DIFFS, BUILDINGS, buildCost, PALETTES, QUEEN_SKINS, SPLATS, RARITY, ACHIEVEMENTS, LOGIN, GEM_PACKS, LEVEL_TIME, MAX_LEVEL, ENRAGE_AFTER } from './data.js';
import { HuntRenderer } from './game.js';
import { Save } from './save.js';
import { Platform } from './platform.js';
import { esc, el, fmtNum, dayNumber, TAU, rand } from './util.js';

// Portrait helpers reuse the in-game renderer so menus match gameplay art.
const pr = new HuntRenderer(document.createElement('canvas'));
export function heroPortrait(h, size = 64) {
  const c = document.createElement('canvas'); c.width = c.height = size * 2; pr.ctx = c.getContext('2d'); pr.ctx.setTransform((size * 2) / 110, 0, 0, (size * 2) / 110, 55 * (size * 2) / 110, 62 * (size * 2) / 110);
  pr.drawHero({ hero: { x: 0, y: 0, r: 34, hp: 1, maxHp: 1, aim: 0.5, level: 0, hitT: 0, shieldT: 0, poison: 0, moving: false, walk: 0, enraged: false }, heroDef: h }, 1);
  return c;
}
export function queenPortrait(q, skinId, size = 64) {
  const c = document.createElement('canvas'); c.width = c.height = size * 2; pr.ctx = c.getContext('2d'); pr.ctx.setTransform((size * 2) / 90, 0, 0, (size * 2) / 90, 45 * (size * 2) / 90, 52 * (size * 2) / 90);
  pr.drawQueen({ queen: { x: 0, y: 0, hp: 1, maxHp: 1, hitT: 0, rootT: 0, face: -Math.PI / 2, skin: QUEEN_SKINS.find((s) => s.id === skinId) || QUEEN_SKINS[0] }, queenDef: q, phaseT: 0 }, 1);
  return c;
}
const starStr = (arr = []) => [0, 1, 2].map((i) => `<span class="${arr[i] ? '' : 'off'}">★</span>`).join('');
const fmtT = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export class Menus {
  constructor(root, app) {
    this.root = root; this.app = app; this.toastRoot = document.getElementById('toasts');
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; app.audio.ensure(); app.audio.play('click'); this.act(b.dataset.act, b.dataset); });
    root.addEventListener('input', (e) => { const t = e.target; if (t.dataset.set) { Save.p.settings[t.dataset.set] = t.type === 'checkbox' ? t.checked : +t.value; Save.save(); app.applySettings(); } });
  }
  get p() { return Save.p; }
  toast(lines) { for (const l of [].concat(lines)) { const d = el('div', 'toast', `<span style="font-size:20px">${l.icon}</span>${esc(l.text)}`); this.toastRoot.appendChild(d); setTimeout(() => d.remove(), 2600); } }
  clear() { this.root.innerHTML = ''; this.stage = null; this.modalEl = null; }
  modal(title, body, o = {}) {
    if (this.modalEl) this.modalEl.remove();
    const m = el('div', 'modal', `<div class="panel" style="${o.w ? `width:min(${o.w}px,100%)` : ''}"><div class="phead"><h2 class="stroke">${title}</h2>${o.noClose ? '' : '<button class="x" data-act="close">✕</button>'}</div><div class="pbody">${body}</div></div>`);
    this.root.appendChild(m); this.modalEl = m; this.modalRender = o.render; return m;
  }
  refresh() { const sc = this.modalEl?.querySelector('.pbody')?.scrollTop; const r = this.modalRender; this.lobby(); if (r) { r(); const b = this.modalEl?.querySelector('.pbody'); if (b && sc) b.scrollTop = sc; } }
  closeModal() { if (this.modalEl) this.modalEl.remove(); this.modalEl = null; this.modalRender = null; if (this.app.state === 'lobby') this.lobby(); }

  // ------------------------------------------------------------------ LOBBY (the hive)
  lobby() {
    const p = this.p; const q = QUEEN[p.queen]; const stars = Save.totalStars(); const qs = Save.questState();
    const qReady = qs.filter((x) => x.done && !x.claimed).length + (p.login.pending ? 1 : 0);
    const canUp = BUILDINGS.filter((b) => p.hive[b.id] < b.max && p.ichor >= buildCost(p.hive[b.id])).length;
    const daily = Save.dailySetup(); const dh = HERO[daily.hero];
    const next = HEROES.find((h) => !Save.heroUnlocked(h)); const nextQ = QUEENS.find((x) => !Save.queenUnlocked(x));
    this.root.innerHTML = `<div class="screen lobby">
      <div class="topbar">
        <div class="logo" style="font-size:clamp(22px,3.4vw,34px);margin-right:6px">HORDE<span>MIND</span></div>
        <div class="chip" style="border-color:#ffd60a"><span class="ic">⭐</span>${stars}/18</div>
        <div class="spacer"></div>
        <div class="chip"><span class="ic">🧪</span>${fmtNum(p.ichor)}</div>
        <div class="chip"><span class="ic">🪙</span>${fmtNum(p.gold)}</div>
        <div class="chip" data-act="shop" style="cursor:pointer"><span class="ic">💎</span>${fmtNum(p.gems)}</div>
      </div>
      <div class="lmain">
        <div class="nav">
          <button class="navb" data-act="queens"><span class="ic">👑</span>QUEENS</button>
          <button class="navb" data-act="hive"><span class="ic">🏯</span>HIVE${canUp ? `<span class="badge">${canUp}</span>` : ''}</button>
          <button class="navb" data-act="shop"><span class="ic">🛒</span>SHOP</button>
          <button class="navb" data-act="quests"><span class="ic">📜</span>QUESTS${qReady ? `<span class="badge">${qReady}</span>` : ''}</button>
          <button class="navb" data-act="profile"><span class="ic">⚙️</span>PROFILE</button>
        </div>
        <div class="stage"><canvas id="stagecv"></canvas>
          <div class="heroname"><div class="n stroke" style="color:${q.color}">${esc(q.name)}</div><div class="s">${esc(q.title)} · Brood: ${q.brood.map((s) => SPECIES[s].icon + ' ' + SPECIES[s].name).join(' + ')} · ${q.ability.icon} ${esc(q.ability.name)}</div></div>
        </div>
        <div class="side">
          <div class="card" data-act="daily" style="cursor:pointer;border-color:#ffd60a"><h4><span>🌙 Daily Hunt #${daily.day % 1000}</span><span>${p.daily.best !== null ? '🏆 ' + fmtT(p.daily.best) : p.daily.played ? 'retry!' : 'NEW'}</span></h4>
            <div style="display:flex;gap:8px;align-items:center"><span id="dailyPort"></span><div style="font-size:13px;font-weight:800">${esc(dh.name)} · Heroic<br><span class="muted">${esc(daily.mut.name)}: ${esc(daily.mut.desc)}</span><br><span class="muted">Play as ${esc(QUEEN[daily.queen].name)} — same hunt for everyone today</span></div></div></div>
          <div class="card" data-act="quests" style="cursor:pointer"><h4><span>Daily Quests</span></h4>${qs.map((x) => `<div class="qrow"><span style="width:16px">${x.claimed ? '✅' : x.done ? '🎁' : '▫️'}</span><span style="flex:2">${esc(x.text)}</span><div class="pb blue"><i style="width:${x.pct * 100}%"></i></div></div>`).join('')}</div>
          ${next || nextQ ? `<div class="card"><div class="muted">${next ? `🔒 Next hero: <b>${esc(next.name)}</b> at ⭐${next.stars}` : ''}${next && nextQ ? '<br>' : ''}${nextQ ? `🔒 Next queen: <b>${esc(nextQ.name)}</b> at ⭐${nextQ.unlock.stars}` : ''}</div></div>` : ''}
          <button class="play" data-act="hunt">HUNT<small>Topple a hero with your swarm</small></button>
        </div>
      </div></div>`;
    this.root.querySelector('#dailyPort').appendChild(heroPortrait(dh, 44));
    this.stage = this.root.querySelector('#stagecv'); this.attract = null;
    if (p.login.pending) setTimeout(() => this.loginPopup(), 300);
  }
  tick(dt) {
    if (!this.stage || !this.stage.isConnected) return;
    const cv = this.stage, d = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    if (cv.width !== Math.round(w * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
    const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, w, h);
    // attract mode: a little swarm circling the queen
    if (!this.attract) { this.attract = { t: 0, bugs: Array.from({ length: 40 }, (_, i) => ({ a: rand(TAU), r: rand(50, 130), s: rand(0.4, 1.1) * (i % 2 ? 1 : -1), sp: this.p.queen ? QUEEN[this.p.queen].brood[i % 2] : 'drone', ph: rand(TAU) })) }; }
    const A = this.attract; A.t += dt; const s = Math.min(w, h * 0.85) / 300; const cx = w / 2, cy = h * 0.45;
    x.save(); x.translate(cx, cy); x.scale(s, s);
    const g = x.createRadialGradient(0, 30, 0, 0, 30, 170); g.addColorStop(0, 'rgba(124,252,154,.25)'); g.addColorStop(1, 'rgba(124,252,154,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(0, 30, 170, 70, 0, 0, TAU); x.fill();
    const pal = PALETTES.find((p) => p.id === this.p.equip.palette);
    pr.ctx = x;
    for (const b of A.bugs) { b.a += b.s * dt; const bx = Math.cos(b.a) * b.r, by = Math.sin(b.a) * b.r * 0.55 + 20; const c = pal.tint ? pal.tint[['drone', 'spitter', 'bomber', 'brute', 'leech', 'swarmling'].indexOf(b.sp) % pal.tint.length] : SPECIES[b.sp].color; b.ph += dt * 12;
      pr.drawMinion({ x: bx, y: by, vx: -Math.sin(b.a) * b.s, vy: Math.cos(b.a) * b.s * 0.55, r: SPECIES[b.sp].r, color: c, frozen: 0, phase: b.ph, sp: b.sp, id: 1 }, true, { phaseT: 0 }); }
    x.scale(1.7, 1.7);
    pr.drawQueen({ queen: { x: 0, y: 0, hp: 1, maxHp: 1, hitT: 0, rootT: 0, face: -Math.PI / 2 + Math.sin(A.t) * 0.3, skin: QUEEN_SKINS.find((k) => k.id === this.p.equip.queenSkin) }, queenDef: QUEEN[this.p.queen], phaseT: 0 }, A.t);
    x.restore();
  }
  timeToReset() { const n = new Date(), t = new Date(n); t.setHours(24, 0, 0, 0); const ms = t - n; return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`; }
  act(a, d) {
    const p = this.p;
    switch (a) {
      case 'close': this.closeModal(); break;
      case 'hunt': this.huntSelect(); break;
      case 'go': this.app.startHunt({ hero: d.hero, diff: +d.diff }); break;
      case 'daily': { const ds = Save.dailySetup(); this.app.startHunt({ hero: ds.hero, diff: ds.diff, queen: ds.queen, mutator: ds.mut, daily: true }); break; }
      case 'queens': this.queens(); break;
      case 'selq': if (Save.queenUnlocked(QUEEN[d.id])) { p.queen = d.id; Save.save(); this.refresh(); } break;
      case 'hive': this.hive(); break;
      case 'up': if (Save.upgrade(d.id)) { this.app.audio.play('level'); this.toast({ icon: '🏯', text: 'Upgraded!' }); } else this.toast({ icon: '🧪', text: 'Not enough Ichor — go hunt!' }); this.refresh(); break;
      case 'shop': this.shop(); break;
      case 'buy': { const it = [...PALETTES, ...QUEEN_SKINS, ...SPLATS].find((x) => x.id === d.id); if (Save.buy(it, d.cur)) { this.app.audio.play('buy'); this.equip(it); this.toast({ icon: '🎉', text: `Unlocked ${it.name}!` }); } else this.toast({ icon: '❌', text: `Not enough ${d.cur}` }); this.refresh(); break; }
      case 'equip': { const it = [...PALETTES, ...QUEEN_SKINS, ...SPLATS].find((x) => x.id === d.id); if (p.owned[it.id]) this.equip(it); this.refresh(); break; }
      case 'gift': if (p.giftDay !== dayNumber()) { const give = (n) => { p.giftDay = dayNumber(); this.toast(Save.grant({ gold: n })); Save.save(); this.refresh(); }; if (d.ad) this.app.rewardedAd(() => give(150)); else give(50); } break;
      case 'iap': Platform.purchase(d.sku).then((r) => { if (r.ok) { const g = GEM_PACKS.find((x) => x.sku === d.sku); this.toast(Save.grant({ gems: g.gems })); Save.save(); this.refresh(); } else this.toast({ icon: 'ℹ️', text: 'Purchases are not available right now.' }); }); break;
      case 'quests': this.quests(); break;
      case 'claimq': this.toast(Save.claimQuest(d.key)); this.app.audio.play('buy'); this.refresh(); break;
      case 'login': this.toast(Save.claimLogin()); this.app.audio.play('level'); this.closeModal(); break;
      case 'profile': this.profile(); break;
      case 'evo': this.app.chooseEvo(d.id); break;
      case 'reroll': this.app.rerollEvo(); break;
      case 'resume': this.app.resume(); break;
      case 'quit': this.app.quit(); break;
      case 'again': this.app.afterResults(true); break;
      case 'tolobby': this.app.afterResults(false); break;
      case 'share': this.share(); break;
      case 'double': this.app.rewardedAd(() => { if (this.last && !this.last.doubled) { this.last.doubled = true; this.toast(Save.grant({ ichor: this.last.sum.ichor })); Save.save(); this.root.querySelector('[data-act=double]')?.remove(); } }); break;
    }
  }
  equip(it) { const e = this.p.equip; if (PALETTES.includes(it)) e.palette = it.id; else if (QUEEN_SKINS.includes(it)) e.queenSkin = it.id; else e.splat = it.id; Save.save(); }
  huntSelect() {
    const render = () => {
      const p = this.p;
      const body = HEROES.map((h) => { const un = Save.heroUnlocked(h); const st = p.stars[h.id] || [];
        return `<div class="hunt ${un ? '' : 'locked'}"><span data-port="${h.id}"></span><div class="info"><b style="color:${h.color}">${esc(h.name)}</b> <span class="muted">${esc(h.title)}</span><div class="stars">${starStr(st)}</div><div class="muted">${h.abilities.map((a) => esc(a.name)).join(' · ')}</div></div>
          ${un ? DIFFS.map((df) => `<button class="btn sm" style="background:${st[df.id] ? '#2d6a4f' : ''};border:2px solid ${df.color}" data-act="go" data-hero="${h.id}" data-diff="${df.id}" ${df.id > 0 && !st[df.id - 1] ? 'disabled' : ''}>${df.name}${st[df.id] ? ' ✓' : ''}</button>`).join(' ') : `<span class="btn dis">🔒 ⭐${h.stars}</span>`}</div>`; }).join('') +
        `<p class="muted">Win on Normal to unlock Heroic, then Legendary. Each win earns a ⭐ — stars unlock new heroes and queens.</p>`;
      this.modal('Choose your prey', body, { render });
      this.modalEl.querySelectorAll('[data-port]').forEach((s) => s.appendChild(heroPortrait(HERO[s.dataset.port], 64)));
    };
    render();
  }
  queens() {
    const render = () => {
      const p = this.p;
      const body = `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">${QUEENS.map((q) => { const un = Save.queenUnlocked(q); return `<div class="item ${un ? '' : 'locked'} ${p.queen === q.id ? 'sel' : ''}" data-act="selq" data-id="${q.id}" style="min-height:220px"><span data-q="${q.id}"></span>${un ? '' : `<span class="lock">🔒⭐${q.unlock.stars}</span>`}
        <div class="nm" style="color:${q.color};font-size:16px">${esc(q.name)}</div><div class="sub">${q.brood.map((s) => SPECIES[s].icon + ' ' + SPECIES[s].name).join(' + ')}</div><div class="sub" style="color:#d9ed92">${q.ability.icon} ${esc(q.ability.name)}: ${esc(q.ability.desc)}</div></div>`; }).join('')}</div>
        <h3 class="stroke" style="margin:14px 0 8px">🐜 Species</h3><div class="grid">${Object.entries(SPECIES).map(([k, s]) => `<div class="item" style="min-height:110px"><div style="font-size:30px">${s.icon}</div><div class="nm">${s.name}</div><div class="sub">${esc(s.desc)}</div><div class="sub">❤️${s.hp} · 🧪${s.cost}</div></div>`).join('')}</div>
        <p class="muted">Add more species mid-hunt through Evolution cards.</p>`;
      this.modal('Queens', body, { render });
      this.modalEl.querySelectorAll('[data-q]').forEach((s) => s.appendChild(queenPortrait(QUEEN[s.dataset.q], p.equip.queenSkin, 72)));
    };
    render();
  }
  hive() {
    const render = () => {
      const p = this.p;
      const body = `<div class="row"><b style="font-size:20px">🧪 ${fmtNum(p.ichor)} Ichor</b><span class="muted">Earn Ichor by damaging and slaying heroes. Upgrades are permanent.</span></div>
        <div class="hive">${BUILDINGS.map((b) => { const l = p.hive[b.id]; const c = buildCost(l); const max = l >= b.max;
          return `<div class="bld"><div class="ic">${b.icon}</div><b>${b.name} <span class="muted">Lv ${l}/${b.max}</span></b><div class="muted">${b.desc}</div><div class="pips">${Array.from({ length: b.max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</div>
          ${max ? '<span class="btn dis">MAX</span>' : `<button class="btn ${p.ichor >= c ? 'green' : ''}" data-act="up" data-id="${b.id}">Upgrade · 🧪 ${c}</button>`}</div>`; }).join('')}</div>`;
      this.modal('🏯 The Hive', body, { render });
    };
    render();
  }
  shop() {
    const render = () => {
      const p = this.p; const gift = p.giftDay !== dayNumber();
      const card = (it, kind) => { const own = p.owned[it.id]; const rr = RARITY[it.rarity]; const eq = p.equip.palette === it.id || p.equip.queenSkin === it.id || p.equip.splat === it.id;
        const vis = kind === 'pal' ? `<div style="height:70px;display:flex;align-items:center;justify-content:center;gap:4px">${(it.tint || ['#7CFC9A', '#ffd166', '#ff6b6b']).map((c) => `<span style="width:22px;height:22px;border-radius:50%;background:${c};border:2px solid #000;display:inline-block"></span>`).join('')}</div>` : kind === 'q' ? `<span data-qs="${it.id}"></span>` : `<div class="big-ic" style="height:70px">${{ goo: '🟢', confetti: '🎉', hearts: '💕', stars: '✨' }[it.id]}</div>`;
        return `<div class="item ${eq ? 'sel' : ''}" style="border-color:${rr.color};min-height:170px">${vis}<div class="nm">${esc(it.name)}</div><div class="rar" style="color:${rr.color}">${rr.name}</div><div class="price">${own ? (eq ? '<span class="btn sm dis">Equipped</span>' : `<button class="btn sm green" data-act="equip" data-id="${it.id}">Equip</button>`) : it.price ? `${it.price.gold ? `<button class="btn sm gold" data-act="buy" data-id="${it.id}" data-cur="gold">🪙 ${it.price.gold}</button>` : ''}${it.price.gems ? `<button class="btn sm gem" data-act="buy" data-id="${it.id}" data-cur="gems">💎 ${it.price.gems}</button>` : ''}` : `<span class="sub">${esc(it.source || '')}</span>`}</div></div>`; };
      const body = `<div class="card" style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><div style="font-size:40px">🎁</div><div style="flex:1"><b>Daily Free Gift</b><div class="muted">Free gold every day. Optional ad triples it.</div></div>${gift ? `<button class="btn green" data-act="gift">Claim 50 🪙</button>${Platform.adsAvailable ? '<button class="btn ad" data-act="gift" data-ad="1">📺 Claim 150 🪙</button>' : ''}` : '<span class="btn dis">Come back tomorrow</span>'}</div>
        <h3 class="stroke">🎨 Swarm Palettes</h3><div class="grid" style="margin:8px 0 14px">${PALETTES.map((x) => card(x, 'pal')).join('')}</div>
        <h3 class="stroke">👑 Queen Skins</h3><div class="grid" style="margin:8px 0 14px">${QUEEN_SKINS.map((x) => card(x, 'q')).join('')}</div>
        <h3 class="stroke">💥 Splat Effects</h3><div class="grid" style="margin:8px 0 14px">${SPLATS.map((x) => card(x, 's')).join('')}</div>
        ${Platform.purchasesAvailable ? `<h3 class="stroke">💎 Gems</h3><div class="grid">${GEM_PACKS.map((g) => `<div class="item"><div class="big-ic">💎</div><div class="nm">${g.gems} Gems</div><div class="price"><button class="btn sm gem" data-act="iap" data-sku="${g.sku}">${g.price}</button></div></div>`).join('')}</div>` : '<p class="muted">💎 Gems come from achievements and daily logins.</p>'}
        <p class="muted">All cosmetics are purely visual. Power only comes from your Hive — earned by hunting.</p>`;
      this.modal('Shop', body, { render });
      this.modalEl.querySelectorAll('[data-qs]').forEach((s) => s.appendChild(queenPortrait(QUEEN[p.queen], s.dataset.qs, 40)));
    };
    render();
  }
  quests() {
    const render = () => {
      const p = this.p; const qs = Save.questState();
      const body = `<div class="card" style="margin-bottom:12px"><h4><span>📅 Login Streak · Day ${p.login.streak}/7</span></h4><div style="display:flex;gap:6px;flex-wrap:wrap">${LOGIN.map((r, i) => `<div class="rw" style="height:64px;flex:1;min-width:60px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px solid ${i + 1 === p.login.streak ? '#ffd60a' : 'var(--line)'};border-radius:12px;${i + 1 < p.login.streak ? 'opacity:.45' : ''}"><span style="font-size:22px">${r.gold ? '🪙' : r.gems ? '💎' : '🧪'}</span><span class="muted">Day ${i + 1}</span></div>`).join('')}</div>${p.login.pending ? '<div class="row"><button class="btn gold" data-act="login">Claim today\'s reward</button></div>' : ''}</div>
        ${qs.map((x) => `<div class="card" style="margin-bottom:8px;display:flex;align-items:center;gap:12px"><div style="font-size:28px">${x.claimed ? '✅' : x.done ? '🎁' : '📜'}</div><div style="flex:1"><b>${esc(x.text)}</b><div class="muted">🪙 ${x.gold} · 🧪 ${x.ichor}</div><div class="pb blue" style="margin-top:5px"><i style="width:${x.pct * 100}%"></i></div></div>${x.claimed ? '' : x.done ? `<button class="btn green" data-act="claimq" data-key="${x.key}">Claim</button>` : ''}</div>`).join('')}
        <p class="muted">New quests in ${this.timeToReset()}.</p>`;
      this.modal('Quests', body, { render });
    };
    render();
  }
  loginPopup() {
    if (!this.p.login.pending || this.modalEl || this.app.state !== 'lobby') return;
    const r = LOGIN[(this.p.login.streak - 1) % 7]; const txt = r.gold ? `${r.gold} Gold` : r.gems ? `${r.gems} Gems` : `${r.ichor} Ichor`;
    this.modal('Daily Reward', `<div style="text-align:center"><div style="font-size:64px">${r.gold ? '🪙' : r.gems ? '💎' : '🧪'}</div><h2 class="stroke">Day ${this.p.login.streak} of 7</h2><p class="muted" style="margin:6px 0 14px">Come back daily — Day 7 gives 40 💎</p><button class="btn gold" style="font-size:20px;padding:12px 28px" data-act="login">Claim ${txt}</button></div>`, { w: 420 });
  }
  profile() {
    const render = () => {
      const p = this.p, s = p.stats, S = p.settings;
      const body = `<div class="statrow" style="justify-content:flex-start">${[['Hunts', s.hunts], ['Heroes slain', s.wins], ['Minions hatched', fmtNum(s.spawned)], ['Damage', fmtNum(s.damage)], ['Biggest swarm', s.maxSwarm], ['Fastest kill', s.fastest < 9999 ? fmtT(s.fastest) : '-']].map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('')}</div>
        <h3 class="stroke" style="margin:12px 0 6px">⚙️ Settings</h3>
        <div class="row"><span class="lbl">Sound FX</span><input class="sl" type="range" min="0" max="1" step="0.05" value="${S.sfx}" data-set="sfx"></div>
        <div class="row"><span class="lbl">Music</span><input class="sl" type="range" min="0" max="1" step="0.05" value="${S.music}" data-set="music"></div>
        <div class="row"><span class="lbl">Low effects</span><input type="checkbox" ${S.lowFx ? 'checked' : ''} data-set="lowFx"></div>
        <div class="row muted">Controls: WASD / arrows move the Queen · Hold Mouse or Space to SWARM the hero · Release to pull back · E / Shift / Right-click = Queen ability · Esc pause</div>
        <h3 class="stroke" style="margin:12px 0 6px">🎖️ Achievements</h3><div class="grid">${ACHIEVEMENTS.map((a) => `<div class="item ${p.ach[a.id] ? '' : 'locked'}" style="min-height:110px"><div style="font-size:28px">${p.ach[a.id] ? '🏅' : '🔒'}</div><div class="nm">${a.name}</div><div class="sub">${a.desc}</div><div class="sub">${a.r.gems ? '💎 ' + a.r.gems : ''}${a.r.palette ? ' + Void palette' : ''}</div></div>`).join('')}</div>`;
      this.modal('Profile', body, { render });
    };
    render();
  }
  pause() { this.modal('Paused', `<div style="text-align:center;display:flex;flex-direction:column;gap:12px;align-items:center"><button class="play" style="width:260px;height:70px;font-size:28px" data-act="resume">RESUME</button><button class="btn ad" data-act="quit">Abandon hunt</button></div>`, { w: 400, noClose: true }); }
  evolve(opts, rerolls) {
    this.root.querySelector('.evo')?.remove();
    const e = el('div', 'evo', `<h2 class="stroke">🧬 EVOLVE YOUR SWARM</h2><div class="evocards">${opts.map((o, i) => `<div class="evocard ${o.kind === 'species' ? 'sp' : ''}" data-act="evo" data-id="${o.id}" style="animation-delay:${i * 0.07}s">${o.kind === 'species' ? '<div class="tagx">NEW SPECIES</div>' : ''}<div class="ic">${o.icon}</div><b>${esc(o.name)}</b><span>${esc(o.desc)}</span><div class="muted" style="margin-top:6px">[${i + 1}]</div></div>`).join('')}</div>${rerolls > 0 ? `<button class="btn" data-act="reroll">🎲 Reroll (${rerolls})</button>` : ''}`);
    this.root.appendChild(e);
  }
  clearEvolve() { this.root.querySelector('.evo')?.remove(); }
  share() {
    const r = this.last?.res; if (!r) return;
    const txt = r.daily ? `🐜 HORDEMIND Daily #${dayNumber() % 1000}\n${r.won ? `👑 ${HERO[r.hero].name} slain in ${fmtT(r.time)}` : `💀 ${HERO[r.hero].name} survived (${r.hpLeft}% HP left)`}\n🥚 ${r.spawned} hatched · 🧬 ${r.evos} evolutions\nCan your swarm do better?` : `🐜 HORDEMIND — ${r.won ? `my swarm slew ${HERO[r.hero].name} (${DIFFS[r.diff].name}) in ${fmtT(r.time)}` : `${HERO[r.hero].name} barely survived my swarm`} · ${r.spawned} minions hatched`;
    const done = () => this.toast({ icon: '📋', text: 'Result copied — paste it to your friends!' });
    try { navigator.clipboard.writeText(txt).then(done, () => this.toast({ icon: 'ℹ️', text: 'Copy not available here' })); } catch (e) { this.toast({ icon: 'ℹ️', text: 'Copy not available here' }); }
  }
  results(res, sum) {
    this.last = { res, sum, doubled: false };
    const h = HERO[res.hero]; const p = this.p;
    this.root.innerHTML = `<div class="screen results">
      <div class="place ${res.won ? 'win' : ''} stroke" style="font-size:clamp(40px,9vw,90px)">${res.won ? 'HERO SLAIN!' : 'HIVE FALLEN'}</div>
      <div class="rsub">${res.won ? `${esc(h.name)} ${esc(h.title)} fell in ${fmtT(res.time)}` : `${esc(h.name)} survived with ${res.hpLeft}% health`} · ${DIFFS[res.diff].name}${res.daily ? ' · 🌙 Daily Hunt' : ''}</div>
      ${sum.newStar ? '<div class="toast" style="animation:pop .4s;font-size:20px">⭐ NEW STAR EARNED!</div>' : ''}${sum.dailyPB ? '<div class="toast">🏆 New daily best!</div>' : ''}
      <div class="statrow">${[['Damage', fmtNum(res.damage)], ['Hatched', res.spawned], ['Biggest swarm', res.maxSwarm], ['Evolutions', res.evos], ['Hero level', res.heroLevel]].map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('')}</div>
      <div class="rewards"><div class="rew">🧪 +${sum.ichor}</div><div class="rew">🪙 +${sum.gold}</div></div>
      ${sum.questsReady ? `<div class="muted">📜 ${sum.questsReady} quest${sum.questsReady > 1 ? 's' : ''} ready to claim</div>` : ''}
      <div class="rbtns"><button class="play" data-act="again">${res.won ? 'HUNT AGAIN' : 'TRY AGAIN'}</button><button class="btn" style="height:70px;padding:0 22px;font-size:18px" data-act="tolobby">Hive</button><button class="btn gem" style="height:70px;padding:0 18px" data-act="share">📋 Share</button>
      ${Platform.adsAvailable ? `<button class="btn ad" style="height:70px;padding:0 18px" data-act="double">📺 +${sum.ichor} Ichor</button>` : ''}</div>
      <div class="muted">🧪 Spend Ichor in the Hive to grow stronger permanently.</div></div>`;
    for (const a of sum.ach) setTimeout(() => { this.toast({ icon: '🏅', text: `Achievement: ${a.a.name}` }); this.toast(a.lines); }, 800);
  }
}

// ------------------------------------------------------------------ HUD
export class HUD {
  constructor(root) { this.root = root; this.cache = {}; this.annT = 0; this.hintQ = []; this.hintT = 0; }
  mount(g, touch, onPause) {
    this.g = g; this.cache = {}; this.touch = touch;
    this.root.innerHTML = `<div class="vign" id="vign"></div>
      <div class="tl" style="flex-direction:column;align-items:flex-start"><div style="display:flex;gap:8px"><button class="pausebtn" id="pauseBtn">II</button><div class="pill" id="swarm"></div><div class="pill" id="bio"></div></div></div>
      <div class="herobar"><div class="nm stroke" id="hname"></div><div class="hb"><i id="hhp"></i></div><div class="lv stroke" id="hlv"></div></div>
      <div class="ann" id="ann"></div><div class="hint hidden" id="hint" style="top:calc(84px + var(--safe-t))"></div>
      ${touch ? '<div class="chargebtn" id="chargeBtn">HOLD TO<br>SWARM</div>' : ''}
      <div class="abilbtn" id="abilBtn" style="${touch ? '' : 'right:auto;left:50%;transform:translateX(-50%);bottom:calc(16px + var(--safe-b))'}"><span id="abIc"></span><div class="cd" id="abCd"></div></div>`;
    this.root.classList.remove('hidden');
    this.$ = (id) => this.root.querySelector('#' + id);
    this.$('pauseBtn').addEventListener('click', onPause);
    this.$('hname').textContent = `${g.heroDef.name} ${g.heroDef.title} · ${g.diff.name}`;
    this.$('abIc').textContent = g.queenDef.ability.icon;
    this.annT = 0; this.hintQ = []; this.hintT = 0;
  }
  unmount() { this.root.classList.add('hidden'); this.root.innerHTML = ''; }
  set(id, k, v, fn) { if (this.cache[id + k] === v) return; this.cache[id + k] = v; fn(this.$(id), v); }
  announce(t, sub, big) { const a = this.$('ann'); if (!a) return; a.innerHTML = `<div class="a1 stroke" style="${big ? '' : 'font-size:clamp(24px,4.5vw,42px)'}">${esc(t)}</div>${sub ? `<div class="a2 stroke">${esc(sub)}</div>` : ''}`; this.annT = big ? 2.2 : 1.4; }
  hint(t, d = 5) { this.hintQ.push({ t, d }); }
  hurt() { this.hurtT = 0.35; }
  update(dt) {
    const g = this.g, h = g.hero, q = g.queen;
    this.set('swarm', 't', `${g.minions.length}/${g.mods.cap}`, (e, v) => (e.textContent = '🐜 ' + v));
    this.set('bio', 't', Math.floor(g.biomass), (e, v) => (e.textContent = '🧪 ' + v));
    this.set('hhp', 'w', Math.round((h.hp / h.maxHp) * 400), (e, v) => (e.style.width = v / 4 + '%'));
    const lvTxt = h.enraged ? '🔥 ENRAGED — FINISH HIM!' : h.level >= MAX_LEVEL ? `⚠️ Lv ${h.level} · ENRAGE in ${Math.ceil(ENRAGE_AFTER - h.levelT)}s` : `Lv ${h.level} · levels up in ${Math.ceil(LEVEL_TIME - h.levelT)}s`;
    this.set('hlv', 't', lvTxt, (e, v) => { e.textContent = v; e.classList.toggle('enr', h.level >= MAX_LEVEL); });
    const cd = Math.ceil(q.cd);
    this.set('abCd', 't', cd, (e, v) => { e.style.display = v > 0 ? 'flex' : 'none'; e.textContent = v; });
    if (this.annT > 0) { this.annT -= dt; if (this.annT <= 0) this.$('ann').innerHTML = ''; }
    const hi = this.$('hint');
    if (this.hintT > 0) { this.hintT -= dt; if (this.hintT <= 0) hi.classList.add('hidden'); } else if (this.hintQ.length) { const n = this.hintQ.shift(); hi.innerHTML = n.t; hi.classList.remove('hidden'); this.hintT = n.d; }
    if (this.hurtT > 0) { this.hurtT -= dt; this.$('vign').style.opacity = Math.max(0, this.hurtT * 2).toFixed(2); }
  }
}
