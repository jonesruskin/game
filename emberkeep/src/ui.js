// EMBERKEEP menus + battle HUD.
import { WISPS, WISP_IDS, WORKSHOP, wsCost, LAB, labTime, labCost, TIERS, CARD_MAX, cardShards, cardCoins, cardMult, EMBER_SKINS, THEMES, RARITY, ACHIEVEMENTS, LOGIN, GEM_PACKS, powerCost, POWER_STEP } from './data.js';
import { drawWisp, drawEmber } from './render.js';
import { Save, fmt, fmtTime } from './save.js';
import { labVal } from './stats.js';
import { Platform } from './platform.js';
import { esc, el, dayNumber, TAU } from './util.js';

function wispThumb(type, lvl = 1, size = 76) { const c = document.createElement('canvas'); const d = 2; c.width = c.height = size * d; const x = c.getContext('2d'); x.scale((size * d) / 100, (size * d) / 100); drawWisp(x, type, lvl, 50, 56, 1, { noBob: true, r: 26 }); return c; }

export class Menus {
  constructor(root, app) {
    this.root = root; this.app = app; this.toastRoot = document.getElementById('toasts'); this.t = 0; this.deckSel = 0;
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; app.audio.ensure(); app.audio.play('click'); this.act(b.dataset.act, b.dataset); });
    root.addEventListener('input', (e) => { const t = e.target; if (t.dataset.set) { Save.p.settings[t.dataset.set] = t.type === 'checkbox' ? t.checked : +t.value; Save.save(); app.applySettings(); } });
  }
  get p() { return Save.p; }
  toast(lines) { for (const l of [].concat(lines)) { const d = el('div', 'toast', `<span style="font-size:20px">${l.icon}</span>${esc(l.text)}`); this.toastRoot.appendChild(d); setTimeout(() => d.remove(), 2600); } }
  clear() { this.root.innerHTML = ''; this.stage = null; this.modalEl = null; }
  modal(title, body, o = {}) { this.modalEl?.remove(); const m = el('div', 'modal', `<div class="panel" style="${o.w ? `width:min(${o.w}px,100%)` : ''}"><div class="phead"><h2 class="stroke">${title}</h2>${o.head || ''}${o.noClose ? '' : '<button class="x" data-act="close">✕</button>'}</div>${o.tabs || ''}<div class="pbody">${body}</div></div>`); this.root.appendChild(m); this.modalEl = m; this.modalRender = o.render; return m; }
  refresh() { const sc = this.modalEl?.querySelector('.pbody')?.scrollTop; const r = this.modalRender; this.home(); if (r) { r(); const b = this.modalEl?.querySelector('.pbody'); if (b && sc) b.scrollTop = sc; } }
  closeModal() { this.modalEl?.remove(); this.modalEl = null; this.modalRender = null; if (this.app.state === 'home') this.home(); }
  timeToReset() { const n = new Date(), t = new Date(n); t.setHours(24, 0, 0, 0); return fmtTime((t - n) / 1000); }

  // ------------------------------------------------------------------ HOME
  home() {
    const p = this.p; const T = TIERS[p.tier]; const qs = Save.questState();
    const qReady = qs.filter((x) => x.done && !x.claimed).length + (p.login.pending ? 1 : 0);
    const affordable = WORKSHOP.filter((w) => Save.wsLevel(w.id) < w.max && p.coins >= wsCost(w, Save.wsLevel(w.id))).length;
    const labFree = Save.labSlots() - p.lab.active.length;
    const cardsReady = Object.keys(p.cards).filter((t) => Save.canLevelCard(t)).length + p.chests.length;
    const next = TIERS[p.tier + 1];
    this.root.innerHTML = `<div class="screen home">
      <div class="topbar"><div class="logo" style="font-size:clamp(22px,3.4vw,34px)">EMBER<span>KEEP</span></div><div class="spacer"></div>
        ${p.chests.length ? `<div class="chip" data-act="chest" style="cursor:pointer;border-color:#ffd23f"><span class="ic">🎁</span>${p.chests.length}</div>` : ''}
        <div class="chip"><span class="ic">🪙</span><span id="coinTxt">${fmt(p.coins)}</span></div><div class="chip" data-act="shop" style="cursor:pointer"><span class="ic">💎</span>${p.gems}</div></div>
      <div class="lmain">
        <div class="nav">
          <button class="navb" data-act="workshop"><span class="ic">🔨</span>WORKSHOP${affordable ? `<span class="badge">${affordable}</span>` : ''}</button>
          <button class="navb" data-act="lab"><span class="ic">⚗️</span>LAB${labFree > 0 ? `<span class="badge">${labFree}</span>` : ''}</button>
          <button class="navb" data-act="wisps"><span class="ic">✨</span>WISPS${cardsReady ? `<span class="badge">${cardsReady}</span>` : ''}</button>
          <button class="navb" data-act="quests"><span class="ic">📜</span>QUESTS${qReady ? `<span class="badge">${qReady}</span>` : ''}</button>
          <button class="navb" data-act="shop"><span class="ic">🛒</span>SHOP</button>
          <button class="navb" data-act="profile"><span class="ic">⚙️</span>STATS</button>
        </div>
        <div class="stage"><canvas id="stagecv"></canvas>
          <div class="heroname"><div class="muted">Tier ${T.n} · <span style="color:${T.color}">${T.name}</span> · best wave</div><div class="bigstat stroke">🌊 ${p.best[p.tier]}</div></div></div>
        <div class="side">
          <div class="card"><h4><span>Tier</span><span>${next ? (p.maxTier > p.tier ? '' : `Next unlocks at wave ${next.unlock}`) : ''}</span></h4><div class="tiers">${TIERS.map((t, i) => `<button class="tierb ${i === p.tier ? 'on' : ''} ${i > p.maxTier ? 'lock' : ''}" ${i <= p.maxTier ? `data-act="tier" data-i="${i}"` : ''}>${i > p.maxTier ? '🔒' : ''}T${t.n}</button>`).join('')}</div>
            <div class="muted" style="margin-top:6px">${T.name}: enemies ×${T.hp} health · coins ×${T.coin}</div></div>
          <div class="card" data-act="lab" style="cursor:pointer"><h4><span>⚗️ Research</span><span>${p.lab.active.length}/${Save.labSlots()}</span></h4><div id="labmini">${this.labMini()}</div></div>
          <div class="card" data-act="quests" style="cursor:pointer"><h4><span>Daily Quests</span><span>⏳ ${this.timeToReset()}</span></h4>${qs.map((x) => `<div class="qrow"><span style="width:16px">${x.claimed ? '✅' : x.done ? '🎁' : '▫️'}</span><span style="flex:2">${esc(x.text)}</span><div class="pb blue"><i style="width:${x.pct * 100}%"></i></div></div>`).join('')}</div>
          <button class="play" data-act="defend">DEFEND<small>Tier ${T.n} · ${p.deck.map((t) => WISPS[t].icon).join('')}</small></button>
        </div></div></div>`;
    this.stage = this.root.querySelector('#stagecv');
    if (Save.offline) setTimeout(() => this.offlinePopup(), 200); else if (p.login.pending) setTimeout(() => this.loginPopup(), 300);
  }
  labMini() { const p = this.p; if (!p.lab.active.length) return '<div class="muted">No research running — start one!</div>'; return p.lab.active.map((a) => { const r = LAB.find((x) => x.id === a.id); const left = (a.end - Date.now()) / 1000; return `<div class="qrow"><span>${r.icon}</span><span style="flex:2">${esc(r.name)}</span><span class="muted">${fmtTime(left)}</span></div><div class="pb"><i style="width:${Math.min(100, (1 - left * 1000 / a.dur) * 100)}%"></i></div>`; }).join(''); }
  tick(dt) {
    this.t += dt;
    if ((this._lt = (this._lt || 0) + dt) > 1) { this._lt = 0; const done = Save.tickLab(); if (done.length) { this.app.audio.play('level'); this.toast(done.map((id) => ({ icon: '⚗️', text: `Research complete: ${LAB.find((r) => r.id === id).name}` }))); if (this.app.state === 'home') this.refresh(); } const lm = this.root.querySelector('#labmini'); if (lm) lm.innerHTML = this.labMini(); if (this.modalRender && this.modalEl?.dataset.live) this.refresh(); }
    if (!this.stage || !this.stage.isConnected) return;
    const cv = this.stage, d = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    if (cv.width !== Math.round(w * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
    const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, w, h);
    const s = Math.min(w, h * 0.85) / 330, cx = w / 2, cy = h * 0.42; x.save(); x.translate(cx, cy); x.scale(s, s);
    const skin = EMBER_SKINS.find((k) => k.id === this.p.equip.skin) || EMBER_SKINS[0];
    drawEmber(x, 0, 0, 42, this.t, skin);
    this.p.deck.forEach((t, i) => { const a = this.t * 0.5 + (i / this.p.deck.length) * TAU; drawWisp(x, t, Math.min(7, this.p.cards[t] ? 1 + Math.floor(this.p.cards[t] / 3) : 1), Math.cos(a) * 120, Math.sin(a) * 70 + 10, this.t + i, { r: 22 }); });
    x.restore();
  }
  act(a, d) {
    const p = this.p;
    switch (a) {
      case 'close': this.closeModal(); break;
      case 'defend': this.app.startRun(); break;
      case 'tier': p.tier = +d.i; Save.save(); this.home(); break;
      case 'workshop': this.workshop(d.cat || 'Attack'); break;
      case 'ws': if (Save.buyWs(d.id)) { this.app.audio.play('buy'); } else this.toast({ icon: '🪙', text: 'Not enough coins' }); this.refresh(); break;
      case 'ws10': { let n = 0; while (n < 10 && Save.buyWs(d.id)) n++; if (n) this.app.audio.play('buy'); this.refresh(); break; }
      case 'lab': this.lab(); break;
      case 'research': if (Save.startLab(d.id)) { this.app.audio.play('level'); this.toast({ icon: '⚗️', text: 'Research started' }); } else this.toast({ icon: 'ℹ️', text: p.lab.active.length >= Save.labSlots() ? 'All lab slots busy' : 'Not enough coins' }); this.refresh(); break;
      case 'wisps': this.wisps(); break;
      case 'decksel': this.deckSel = +d.i; this.refresh(); break;
      case 'setdeck': Save.setDeck(d.t, this.deckSel); this.refresh(); break;
      case 'card': if (Save.levelCard(d.t)) { this.app.audio.play('level'); this.toast({ icon: WISPS[d.t].icon, text: `${WISPS[d.t].name} → Lv ${p.cards[d.t]}` }); } this.refresh(); break;
      case 'chest': this.chest(); break;
      case 'freechest': if (p.freeChestDay !== dayNumber()) { const give = (n) => { p.freeChestDay = dayNumber(); this.toast(Save.grant({ chest: n })); Save.save(); this.refresh(); }; if (d.ad) this.app.rewardedAd(() => give(2)); else give(1); } break;
      case 'quests': this.quests(); break;
      case 'claimq': this.toast(Save.claimQuest(d.key)); this.app.audio.play('coin'); this.refresh(); break;
      case 'login': this.toast(Save.claimLogin()); this.app.audio.play('level'); this.closeModal(); break;
      case 'shop': this.shop(); break;
      case 'buycos': if (Save.buyCosmetic(d.id)) { this.app.audio.play('buy'); this.equip(d.id); } else this.toast({ icon: '💎', text: 'Not enough gems' }); this.refresh(); break;
      case 'equip': this.equip(d.id); this.refresh(); break;
      case 'iap': Platform.purchase(d.sku).then((r) => { if (r.ok) { const g = GEM_PACKS.find((x) => x.sku === d.sku); this.toast(Save.grant({ gems: g.gems })); Save.save(); this.refresh(); } else this.toast({ icon: 'ℹ️', text: 'Purchases are not available right now.' }); }); break;
      case 'profile': this.profile(); break;
      case 'offline': { const o = Save.offline; if (!o) break; const give = (m) => { Save.grant({ coins: o.coins * m, raw: true }); Save.offline = null; Save.save(); this.app.audio.play('coin'); this.toast({ icon: '🪙', text: `+${fmt(o.coins * m)} coins` }); this.closeModal(); }; if (d.ad) this.app.rewardedAd(() => give(2)); else give(1); break; }
      case 'resume': this.app.resume(); break;
      case 'quit': this.app.quit(); break;
      case 'again': this.app.afterResults(true); break;
      case 'home': this.app.afterResults(false); break;
    }
  }
  equip(id) { if (!this.p.owned[id]) return; if (EMBER_SKINS.some((s) => s.id === id)) this.p.equip.skin = id; else this.p.equip.theme = id; Save.save(); }
  offlinePopup() {
    const o = Save.offline; if (!o || this.modalEl) return;
    this.modal('Welcome back, Keeper', `<div style="text-align:center"><div style="font-size:60px">🌙</div><p class="muted">While you were away for <b>${fmtTime(o.away)}</b>, your Keep held the night${o.capped ? ` (capped at ${fmtTime(o.secs)} — research <b>Long Vigil</b> to extend)` : ''}.</p>
      <div class="offl stroke">🪙 ${fmt(o.coins)}</div><div class="row" style="justify-content:center;margin-top:12px"><button class="btn gold" style="font-size:18px;padding:12px 24px" data-act="offline">Collect</button>${Platform.adsAvailable ? `<button class="btn ad" style="font-size:18px;padding:12px 20px" data-act="offline" data-ad="1">📺 Collect ×2</button>` : ''}</div></div>`, { w: 460, noClose: true });
  }
  loginPopup() { if (!this.p.login.pending || this.modalEl || this.app.state !== 'home') return; const r = LOGIN[(this.p.login.streak - 1) % 7]; this.modal('Daily Reward', `<div style="text-align:center"><div style="font-size:60px">${r.chest ? '🎁' : r.gems ? '💎' : '🪙'}</div><h2 class="stroke">Day ${this.p.login.streak} of 7</h2><p class="muted" style="margin:6px 0 14px">Come back every day — Day 7: 40 💎 + Ember Chest</p><button class="btn gold" style="font-size:20px;padding:12px 28px" data-act="login">Claim</button></div>`, { w: 420 }); }
  // ------------------------------------------------------------------ WORKSHOP
  workshop(cat) {
    const render = () => {
      const p = this.p;
      const tabs = `<div class="tabs">${['Attack', 'Defense', 'Economy'].map((c) => `<button class="tab ${c === cat ? 'on' : ''}" data-act="workshop" data-cat="${c}">${{ Attack: '⚔️', Defense: '🛡️', Economy: '🪙' }[c]} ${c}</button>`).join('')}</div>`;
      const body = `<div class="row"><b style="font-size:20px">🪙 ${fmt(p.coins)}</b><span class="muted">Permanent upgrades. Costs rise each level — but so does your coin income.</span></div><div class="wsgrid">${WORKSHOP.filter((w) => w.cat === cat).map((w) => { const l = Save.wsLevel(w.id); const max = l >= w.max; const c = wsCost(w, l); const can = p.coins >= c;
        return `<div class="ws"><div class="ic">${w.icon}</div><div><div class="nm">${w.name} <span class="muted">Lv ${l}</span></div><div class="ds">${w.desc}</div><div class="v">${w.fmt(w.val(l))}${max ? '' : ` → ${w.fmt(w.val(l + 1))}`}</div></div>${max ? '<span class="btn dis">MAX</span>' : `<div style="display:flex;flex-direction:column;gap:4px;margin-left:auto"><button class="btn ${can ? 'gold' : 'dis'}" data-act="ws" data-id="${w.id}">🪙 ${fmt(c)}</button>${can ? `<button class="btn sm" data-act="ws10" data-id="${w.id}">×10</button>` : ''}</div>`}</div>`; }).join('')}</div>`;
      this.modal('🔨 Workshop', body, { tabs, render });
    };
    render();
  }
  // ------------------------------------------------------------------ LAB
  lab() {
    const render = () => {
      const p = this.p; const slots = Save.labSlots();
      const body = `<div class="row"><b>🪙 ${fmt(p.coins)}</b><span class="muted">Research runs in real time — even when the game is closed. Slots: ${p.lab.active.length}/${slots}</span></div>
        ${LAB.map((r) => { const l = p.lab.levels[r.id] || 0; const act = p.lab.active.find((a) => a.id === r.id); const max = l >= r.max; const c = labCost(r, l); const left = act ? (act.end - Date.now()) / 1000 : 0;
          return `<div class="labrow ${act ? 'run' : ''}"><div class="ic">${r.icon}</div><div style="flex:1"><b>${r.name}</b> <span class="muted">${r.max > 1 ? `Lv ${l}/${r.max}` : l ? 'Unlocked ✅' : ''}</span><div class="muted">${r.desc}</div>
            ${act ? `<div class="pb" style="margin-top:4px"><i style="width:${Math.min(100, (1 - (left * 1000) / act.dur) * 100)}%"></i></div><div class="muted">⏳ ${fmtTime(left)} left</div>` : ''}</div>
            ${max ? '<span class="btn dis">DONE</span>' : act ? '<span class="btn dis">Researching…</span>' : `<button class="btn ${p.coins >= c && p.lab.active.length < slots ? 'green' : 'dis'}" data-act="research" data-id="${r.id}">🪙 ${fmt(c)}<br><small>⏱ ${fmtTime(labTime(r, l))}</small></button>`}</div>`; }).join('')}`;
      const m = this.modal('⚗️ Laboratory', body, { render }); m.dataset.live = '1';
    };
    render();
  }
  // ------------------------------------------------------------------ WISPS (collection + deck)
  wisps() {
    const render = () => {
      const p = this.p;
      const body = `<div class="muted" style="text-align:center;margin-bottom:6px">Your battle deck (5). Tap a slot, then tap a wisp to place it.</div>
        <div class="deck">${p.deck.map((t, i) => `<div class="ds ${i === this.deckSel ? 'sel' : ''}" data-act="decksel" data-i="${i}"><span data-th="${t}"></span></div>`).join('')}</div>
        ${p.chests.length ? `<div class="card" style="display:flex;align-items:center;gap:10px;margin-bottom:10px;border-color:#ffd23f"><div style="font-size:36px">🎁</div><div style="flex:1"><b>${p.chests.length} Ember Chest${p.chests.length > 1 ? 's' : ''}</b><div class="muted">Earned from bosses. Contains wisp shards — and maybe a new wisp!</div></div><button class="btn gold" data-act="chest">Open</button></div>` : ''}
        <div class="grid">${WISP_IDS.map((t) => { const W = WISPS[t]; const l = p.cards[t]; const sh = p.shards[t] || 0; const need = l ? cardShards(l) : 1; const inDeck = p.deck.includes(t);
          return `<div class="wc ${inDeck ? 'indeck' : ''} ${l ? '' : 'locked'}" ${l ? `data-act="setdeck" data-t="${t}"` : ''}><span data-th="${t}"></span><b style="color:${W.color}">${W.name}</b><div class="muted" style="font-size:11px;min-height:28px">${esc(W.desc)}</div>
            ${l ? `<div class="muted">Lv ${l}${l < CARD_MAX ? ` · ${sh}/${need} shards` : ' · MAX'}</div><div class="pb" style="width:100%"><i style="width:${Math.min(100, (sh / need) * 100)}%"></i></div><div class="muted">dmg ×${cardMult(l).toFixed(1)}</div>${l < CARD_MAX ? `<button class="btn sm ${Save.canLevelCard(t) ? 'green' : 'dis'}" data-act="card" data-t="${t}">Level up · 🪙 ${fmt(cardCoins(l))}</button>` : ''}` : '<div class="muted">🔒 Found in Ember Chests</div>'}</div>`; }).join('')}</div>
        <div class="card" style="margin-top:12px;display:flex;align-items:center;gap:10px"><div style="font-size:30px">🎁</div><div style="flex:1"><b>Daily Free Chest</b><div class="muted">One free chest every day.</div></div>${p.freeChestDay !== dayNumber() ? `<button class="btn green" data-act="freechest">Claim</button>${Platform.adsAvailable ? '<button class="btn ad" data-act="freechest" data-ad="1">📺 Claim 2</button>' : ''}` : '<span class="btn dis">Tomorrow</span>'}</div>`;
      this.modal('✨ Wisps', body, { render });
      this.modalEl.querySelectorAll('[data-th]').forEach((s) => s.appendChild(wispThumb(s.dataset.th, 1, s.closest('.ds') ? 56 : 76)));
    };
    render();
  }
  chest() {
    const res = Save.openChest(); if (!res) return; this.app.audio.play('chest'); if (res.fresh.length) setTimeout(() => this.app.audio.play('unlock'), 600);
    const body = `<div style="text-align:center"><div class="chestfx">🎁</div>${res.fresh.map((t) => `<h2 class="stroke" style="color:${WISPS[t].color}">NEW WISP: ${WISPS[t].icon} ${WISPS[t].name}!</h2>`).join('')}
      <div class="grid" style="margin-top:10px">${Object.entries(res.shards).map(([t, n]) => `<div class="wc"><span data-th="${t}"></span><b>${WISPS[t].name}</b><div class="bigstat" style="font-size:22px">+${n}</div></div>`).join('')}</div>
      <div class="row" style="justify-content:center;margin-top:10px">${this.p.chests.length ? `<button class="btn gold" data-act="chest">Open next (${this.p.chests.length})</button>` : ''}<button class="btn" data-act="wisps">Go to Wisps</button></div></div>`;
    this.modal(`Ember Chest · ${res.total} shards`, body, { w: 640 });
    this.modalEl.querySelectorAll('[data-th]').forEach((s) => s.appendChild(wispThumb(s.dataset.th, 1, 64)));
  }
  quests() {
    const render = () => {
      const p = this.p; const qs = Save.questState();
      const body = `<div class="card" style="margin-bottom:12px"><h4><span>📅 Login Streak · Day ${p.login.streak}/7</span></h4><div style="display:flex;gap:6px;flex-wrap:wrap">${LOGIN.map((r, i) => `<div style="height:60px;flex:1;min-width:56px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px solid ${i + 1 === p.login.streak ? '#ffd23f' : 'var(--line)'};border-radius:12px;${i + 1 < p.login.streak ? 'opacity:.45' : ''}"><span style="font-size:20px">${r.chest ? '🎁' : r.gems ? '💎' : '🪙'}</span><span class="muted">Day ${i + 1}</span></div>`).join('')}</div>${p.login.pending ? '<div class="row"><button class="btn gold" data-act="login">Claim today\'s reward</button></div>' : ''}</div>
        ${qs.map((x) => `<div class="card" style="margin-bottom:8px;display:flex;align-items:center;gap:12px"><div style="font-size:28px">${x.claimed ? '✅' : x.done ? '🎁' : '📜'}</div><div style="flex:1"><b>${esc(x.text)}</b><div class="muted">🪙 ${fmt(Save.scaledCoins(x.coins))} · 💎 ${x.gems}</div><div class="pb blue" style="margin-top:5px"><i style="width:${x.pct * 100}%"></i></div><div class="muted">${fmt(x.v)}/${fmt(x.n)}</div></div>${x.claimed ? '' : x.done ? `<button class="btn green" data-act="claimq" data-key="${x.key}">Claim</button>` : ''}</div>`).join('')}<p class="muted">New quests in ${this.timeToReset()}.</p>`;
      this.modal('Quests', body, { render });
    };
    render();
  }
  shop() {
    const render = () => {
      const p = this.p;
      const item = (c) => { const own = p.owned[c.id]; const rr = RARITY[c.rarity]; const eq = p.equip.skin === c.id || p.equip.theme === c.id; const isSkin = EMBER_SKINS.includes(c);
        const prev = isSkin ? `<div style="height:70px;display:flex;gap:4px;align-items:center;justify-content:center">${c.c.map((x) => `<span style="width:20px;height:${30 + c.c.indexOf(x) * 10}px;border-radius:50% 50% 40% 40%;background:${x};display:inline-block;box-shadow:0 0 12px ${x}"></span>`).join('')}</div>` : `<div style="height:70px;border-radius:10px;background:linear-gradient(180deg,${c.bg[0]},${c.bg[1]});border:2px solid ${c.fog};width:100%"></div>`;
        return `<div class="item ${eq ? 'sel' : ''}" style="border-color:${rr.color}">${prev}<div class="nm">${esc(c.name)}</div><div class="rar" style="color:${rr.color}">${rr.name} ${isSkin ? 'Ember' : 'Theme'}</div><div class="price">${own ? (eq ? '<span class="btn sm dis">Equipped</span>' : `<button class="btn sm green" data-act="equip" data-id="${c.id}">Equip</button>`) : c.price ? `<button class="btn sm gem" data-act="buycos" data-id="${c.id}">💎 ${c.price.gems}</button>` : `<span class="sub">${esc(c.source || '')}</span>`}</div></div>`; };
      const body = `<h3 class="stroke">🔥 Ember Skins</h3><div class="grid" style="margin:8px 0 14px">${EMBER_SKINS.map(item).join('')}</div><h3 class="stroke">🌌 Battlefield Themes</h3><div class="grid" style="margin:8px 0 14px">${THEMES.map(item).join('')}</div>
        ${Platform.purchasesAvailable ? `<h3 class="stroke">💎 Gems</h3><div class="grid">${GEM_PACKS.map((g) => `<div class="item"><div class="big-ic">💎</div><div class="nm">${g.gems} Gems</div><div class="price"><button class="btn sm gem" data-act="iap" data-sku="${g.sku}">${g.price}</button></div></div>`).join('')}</div>` : ''}
        <p class="muted">💎 Gems are earned from quests, logins and achievements. Gems buy looks only — never power. Progress comes from playing.</p>`;
      this.modal('Shop', body, { render });
    };
    render();
  }
  profile() {
    const render = () => {
      const p = this.p, s = p.stats, S = p.settings;
      const body = `<div class="statrow" style="justify-content:flex-start">${[['Battles', s.runs], ['Best wave', s.bestWave], ['Waves survived', fmt(s.waves)], ['Shadows banished', fmt(s.kills)], ['Merges', fmt(s.merges)], ['Bosses', s.bosses], ['Best wisp', 'Lv ' + s.maxLvl], ['Play time', fmtTime(s.playTime)]].map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('')}</div>
        <div class="muted" style="margin:8px 0">Best wave per tier: ${TIERS.map((t, i) => `T${t.n}: ${p.best[i]}`).join(' · ')}</div>
        <h3 class="stroke" style="margin:12px 0 6px">⚙️ Settings</h3>
        <div class="row"><span class="lbl">Sound FX</span><input class="sl" type="range" min="0" max="1" step="0.05" value="${S.sfx}" data-set="sfx"></div>
        <div class="row"><span class="lbl">Music</span><input class="sl" type="range" min="0" max="1" step="0.05" value="${S.music}" data-set="music"></div>
        <div class="row"><span class="lbl">Low effects</span><input type="checkbox" ${S.lowFx ? 'checked' : ''} data-set="lowFx"></div>
        <div class="row muted">How to play: tap SUMMON to call a random wisp from your deck. Drag a wisp onto an identical one (same type + same level) to merge into a stronger random wisp. Spend Embers on power-ups. Survive as many waves as you can — coins upgrade your Keep forever. Space = summon · Esc = pause.</div>
        <h3 class="stroke" style="margin:12px 0 6px">🎖️ Achievements</h3><div class="grid">${ACHIEVEMENTS.map((a) => `<div class="item ${p.ach[a.id] ? '' : 'locked'}" style="min-height:110px"><div style="font-size:28px">${p.ach[a.id] ? '🏅' : '🔒'}</div><div class="nm">${a.name}</div><div class="sub">${a.desc}</div><div class="sub">💎 ${a.gems}${a.skin ? ' + Starless Ember' : ''}</div></div>`).join('')}</div>`;
      this.modal('Stats & Settings', body, { render });
    };
    render();
  }
  pause() { this.modal('Paused', `<div style="text-align:center;display:flex;flex-direction:column;gap:12px;align-items:center"><button class="play" style="width:260px;height:70px;font-size:28px" data-act="resume">RESUME</button><button class="btn ad" data-act="quit">End battle (keep coins earned)</button></div>`, { w: 400, noClose: true }); }
  results(res, sum) {
    const p = this.p; const T = TIERS[res.tier];
    this.root.innerHTML = `<div class="screen results">
      <div class="muted" style="font-size:16px">THE EMBER FADED ON</div><div class="place stroke ${sum.newBest ? 'win' : ''}" style="font-size:clamp(54px,12vw,120px)">WAVE ${res.wave}</div>
      <div class="rsub">Tier ${T.n} · ${T.name} · ${sum.newBest ? '<span style="color:#7CFC9A">NEW BEST!</span>' : `best ${p.best[res.tier]}`}</div>
      ${sum.unlocked ? `<div class="toast" style="font-size:20px;animation:pop .4s">🔓 Tier ${sum.unlocked.n} unlocked: ${sum.unlocked.name}! (coins ×${sum.unlocked.coin})</div>` : ''}
      <div class="statrow">${[['Coins', '🪙 ' + fmt(res.coins)], ['Chests', '🎁 ' + res.chests], ['Merges', res.merges], ['Best wisp', 'Lv ' + res.maxLvl], ['Time', fmtTime(res.time)]].map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('')}</div>
      ${sum.questsReady ? `<div class="muted">📜 ${sum.questsReady} quest${sum.questsReady > 1 ? 's' : ''} ready to claim</div>` : ''}
      <div class="muted">🔨 Spend your coins in the Workshop — every upgrade pushes the night back further.</div>
      <div class="rbtns"><button class="play" data-act="again">DEFEND AGAIN</button><button class="btn gold" style="height:70px;padding:0 24px;font-size:18px" data-act="home">🔨 Upgrade</button></div></div>`;
    for (const a of sum.ach) setTimeout(() => { this.toast({ icon: '🏅', text: `Achievement: ${a.a.name}` }); this.toast(a.lines); }, 800);
  }
}

// ------------------------------------------------------------------ battle HUD
export class HUD {
  constructor(root, app) { this.root = root; this.app = app; this.cache = {}; }
  mount(run) {
    this.run = run; this.cache = {}; const p = Save.p; const lab = (id) => labVal(p, id);
    this.root.className = 'ehud';
    this.root.innerHTML = `<div class="top"><button class="pausebtn" data-h="pause">II</button><div class="pill wave" id="wave"></div><div class="wbar"><i id="wbar"></i></div><div class="pill" id="coins"></div><div class="spacer" style="flex:1"></div>
        ${lab('autoSummon') ? '<button class="tbtn2" data-h="auto" data-k="summon">🤖 Summon</button>' : ''}${lab('autoMerge') ? '<button class="tbtn2" data-h="auto" data-k="merge">🧲 Merge</button>' : ''}${lab('autoPower') ? '<button class="tbtn2" data-h="auto" data-k="power">⚙️ Power</button>' : ''}
        ${lab('speed2') ? '<button class="tbtn2" data-h="speed" id="spd"></button>' : ''}</div>
      <div class="ann" id="ann" style="top:16%"></div><div class="hint hidden" id="hint" style="top:calc(60px + var(--safe-t))"></div>
      <div class="bottom"><div class="hpbar"><i id="hp"></i></div><div class="powers" id="powers">${run.deck.map((t) => `<button class="pw" data-h="power" data-t="${t}"><div class="ic">${WISPS[t].icon}</div><div class="lv"></div><div class="c"></div></button>`).join('')}</div>
        <button class="summon" data-h="summon" id="summon">SUMMON<small id="sc"></small></button></div>`;
    this.$ = (id) => this.root.querySelector('#' + id);
    this.root.onclick = (e) => { const b = e.target.closest('[data-h]'); if (!b) return; this.app.audio.ensure(); const h = b.dataset.h; const r = this.run;
      if (h === 'summon') { if (!r.summon()) this.app.audio.play('click'); }
      else if (h === 'power') r.powerUp(b.dataset.t);
      else if (h === 'pause') this.app.pause();
      else if (h === 'auto') { const k = b.dataset.k; r.auto[k] = !r.auto[k]; Save.p.autoPref[k] = r.auto[k]; Save.save(); this.cache = {}; }
      else if (h === 'speed') { const max = labVal(Save.p, 'speed3') ? 3 : 2; this.app.speed = this.app.speed >= max ? 1 : this.app.speed + 1; Save.p.speedPref = this.app.speed; Save.save(); this.cache = {}; } };
    this.annT = 0; this.hintQ = []; this.hintT = 0;
  }
  unmount() { this.root.className = 'hidden'; this.root.innerHTML = ''; this.root.onclick = null; }
  set(id, k, v, fn) { if (this.cache[id + k] === v) return; this.cache[id + k] = v; const e = this.$(id); if (e) fn(e, v); }
  announce(t, sub, color) { const a = this.$('ann'); if (!a) return; a.innerHTML = `<div class="a1 stroke" style="font-size:clamp(26px,5vw,46px);${color ? 'color:' + color : ''}">${esc(t)}</div>${sub ? `<div class="a2 stroke">${esc(sub)}</div>` : ''}`; this.annT = 1.6; }
  hint(t, d = 5) { this.hintQ.push({ t, d }); }
  update(dt) {
    const r = this.run;
    this.set('wave', 't', r.wave, (e, v) => (e.textContent = `🌊 Wave ${v}`));
    this.set('wbar', 'w', Math.floor((r.waveT / 20) * 50), (e, v) => (e.style.width = v * 2 + '%'));
    this.set('coins', 't', Math.floor(r.coins), (e, v) => (e.textContent = '🪙 ' + fmt(v)));
    this.set('hp', 'w', Math.round((r.hp / r.maxHp) * 200), (e, v) => (e.style.width = v / 2 + '%'));
    const price = r.summonPrice; const canS = r.embers >= price && r.emptySlots().length > 0;
    this.set('sc', 't', `${fmt(r.embers)} · ${price}`, (e) => (e.innerHTML = `🔶 ${fmt(r.embers)} &nbsp;·&nbsp; cost ${fmt(price)}${r.emptySlots().length ? '' : ' · board full'}`));
    this.set('summon', 'c', canS, (e, v) => e.classList.toggle('no', !v));
    this.root.querySelectorAll('.pw').forEach((b) => { const t = b.dataset.t; const lv = r.power[t]; const c = r.powerPrice(t); const key = lv + ':' + (r.embers >= c);
      if (this.cache['pw' + t] !== key) { this.cache['pw' + t] = key; b.querySelector('.lv').textContent = lv ? `+${Math.round(lv * POWER_STEP * 100)}%` : 'power'; b.querySelector('.c').textContent = '🔶' + fmt(c); b.classList.toggle('can', r.embers >= c); b.classList.toggle('no', r.embers < c); } });
    this.root.querySelectorAll('[data-h=auto]').forEach((b) => { const on = !!r.auto[b.dataset.k]; if (this.cache['a' + b.dataset.k] !== on) { this.cache['a' + b.dataset.k] = on; b.classList.toggle('on', on); b.classList.toggle('off', !on); } });
    this.set('spd', 't', this.app.speed, (e, v) => { e.textContent = `⏩ ${v}×`; e.classList.toggle('on', v > 1); });
    if (this.annT > 0) { this.annT -= dt; if (this.annT <= 0) this.$('ann').innerHTML = ''; }
    const hi = this.$('hint'); if (this.hintT > 0) { this.hintT -= dt; if (this.hintT <= 0) hi.classList.add('hidden'); } else if (this.hintQ.length) { const n = this.hintQ.shift(); hi.innerHTML = n.t; hi.classList.remove('hidden'); this.hintT = n.d; }
  }
}
