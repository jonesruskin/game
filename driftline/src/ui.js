// DRIFTLINE menus + HUD.
import { CARS, CAR, CUPS, PAINTS, DECALS, GLOWS, SMOKES, ALL_ITEMS, RARITY, LEAGUES, leagueOf, ACHIEVEMENTS, LOGIN, GEM_PACKS } from './data.js';
import { drawCar, drawMinimap, TIER_COL } from './race.js';
import { Save } from './save.js';
import { Platform } from './platform.js';
import { esc, el, fmtNum, dayNumber, TAU, seeded } from './util.js';

export const fmtT = (s) => (s == null ? '--:--' : `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`);
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th'];
function carThumb(carId, eq, size = 96, angle = -0.5) {
  const c = document.createElement('canvas'); c.width = c.height = size * 2; const x = c.getContext('2d'); x.scale((size * 2) / 70, (size * 2) / 70);
  drawCar(x, { x: 35, y: 35, a: angle, av: 0, id: 3, def: CAR[carId], paint: Save.item(eq.paint), decal: Save.item(eq.decal), glow: Save.item(eq.glow) }, 1);
  return c;
}
const eqObj = () => Save.p.equip;

export class Menus {
  constructor(root, app) {
    this.root = root; this.app = app; this.toastRoot = document.getElementById('toasts'); this.t = 0;
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; app.audio.ensure(); app.audio.play('click'); this.act(b.dataset.act, b.dataset); });
    root.addEventListener('input', (e) => { const t = e.target; if (t.dataset.set) { Save.p.settings[t.dataset.set] = t.type === 'checkbox' ? t.checked : +t.value; Save.save(); app.applySettings(); } });
  }
  get p() { return Save.p; }
  toast(lines) { for (const l of [].concat(lines)) { const d = el('div', 'toast', `<span style="font-size:20px">${l.icon}</span>${esc(l.text)}`); this.toastRoot.appendChild(d); setTimeout(() => d.remove(), 2600); } }
  clear() { this.root.innerHTML = ''; this.stage = null; this.modalEl = null; }
  modal(title, body, o = {}) { if (this.modalEl) this.modalEl.remove(); const m = el('div', 'modal', `<div class="panel" style="${o.w ? `width:min(${o.w}px,100%)` : ''}"><div class="phead"><h2 class="stroke">${title}</h2>${o.noClose ? '' : '<button class="x" data-act="close">✕</button>'}</div>${o.tabs || ''}<div class="pbody">${body}</div></div>`); this.root.appendChild(m); this.modalEl = m; this.modalRender = o.render; return m; }
  refresh() { const sc = this.modalEl?.querySelector('.pbody')?.scrollTop; const r = this.modalRender; this.lobby(); if (r) { r(); const b = this.modalEl?.querySelector('.pbody'); if (b && sc) b.scrollTop = sc; } }
  closeModal() { this.modalEl?.remove(); this.modalEl = null; this.modalRender = null; if (this.app.state === 'lobby') this.lobby(); }
  timeToReset() { const n = new Date(), t = new Date(n); t.setHours(24, 0, 0, 0); const ms = t - n; return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`; }

  lobby() {
    const p = this.p; const car = CAR[p.car]; const lg = leagueOf(p.trophies); const stars = Save.totalStars(); const qs = Save.questState();
    const qReady = qs.filter((x) => x.done && !x.claimed).length + (p.login.pending ? 1 : 0);
    const nextCup = CUPS.find((c) => !Save.cupUnlocked(c)); const nextCar = CARS.find((c) => !Save.carUnlocked(c));
    const medal = ['', '🥉', '🥈', '🥇'][p.daily.medal];
    this.root.innerHTML = `<div class="screen lobby">
      <div class="topbar"><div class="logo" style="font-size:clamp(22px,3.4vw,34px)">DRIFT<span>LINE</span></div>
        <div class="chip" style="border-color:${lg.color}"><span class="ic">🏆</span>${p.trophies}<span style="color:${lg.color};font-size:12px">${lg.icon} ${lg.name}</span></div>
        <div class="chip" style="border-color:#ffd60a"><span class="ic">⭐</span>${stars}/45</div>
        <div class="spacer"></div><div class="chip"><span class="ic">🪙</span>${fmtNum(p.gold)}</div><div class="chip" data-act="shop" style="cursor:pointer"><span class="ic">💎</span>${fmtNum(p.gems)}</div></div>
      <div class="lmain">
        <div class="nav">
          <button class="navb" data-act="garage"><span class="ic">🏎️</span>GARAGE</button>
          <button class="navb" data-act="shop"><span class="ic">🛒</span>SHOP</button>
          <button class="navb" data-act="quests"><span class="ic">📜</span>QUESTS${qReady ? `<span class="badge">${qReady}</span>` : ''}</button>
          <button class="navb" data-act="profile"><span class="ic">⚙️</span>PROFILE</button>
        </div>
        <div class="stage"><canvas id="stagecv"></canvas><div class="heroname"><div class="n stroke" style="color:${Save.item(p.equip.paint).c1}">${esc(car.name)}</div><div class="s">${esc(car.desc)}</div></div></div>
        <div class="side"><div class="modes">
          <div class="mode" data-act="career"><span class="ic">🏁</span><div><b>Career Cups</b><span>⭐ ${stars}/45 stars${nextCup ? ` · ${nextCup.name} at ⭐${nextCup.stars}` : ' · all cups open'}</span></div></div>
          <div class="mode" data-act="daily" style="border-color:#ffd60a"><span class="ic">🌙</span><div><b>Daily Track #${dayNumber() % 1000} ${medal}</b><span>${p.daily.best ? `Your best ${fmtT(p.daily.best)} · ` : ''}same track for everyone · beat your ghost</span></div></div>
          ${nextCar ? `<div class="card"><div class="muted">🔒 Next car: <b>${esc(nextCar.name)}</b> at ⭐${nextCar.stars}</div></div>` : ''}
          <div class="card" data-act="quests" style="cursor:pointer"><h4><span>Daily Quests</span></h4>${qs.map((x) => `<div class="qrow"><span style="width:16px">${x.claimed ? '✅' : x.done ? '🎁' : '▫️'}</span><span style="flex:2">${esc(x.text)}</span><div class="pb blue"><i style="width:${x.pct * 100}%"></i></div></div>`).join('')}</div>
        </div><button class="play" data-act="quick">RACE<small>Quick race · 6 drivers · trophies</small></button></div>
      </div></div>`;
    this.stage = this.root.querySelector('#stagecv');
    if (p.login.pending) setTimeout(() => this.loginPopup(), 300);
  }
  tick(dt) {
    this.t += dt; if (!this.stage || !this.stage.isConnected) return;
    const cv = this.stage, d = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    if (cv.width !== Math.round(w * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
    const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, w, h);
    const s = Math.min(w, h * 0.9) / 120, cx = w / 2, cy = h * 0.45;
    // turntable
    x.save(); x.translate(cx, cy); x.scale(1, 0.45); const g = x.createRadialGradient(0, 0, 0, 0, 0, 60 * s); g.addColorStop(0, 'rgba(247,37,133,.5)'); g.addColorStop(1, 'rgba(247,37,133,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 60 * s, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(76,201,240,.6)'; x.lineWidth = 3; x.setLineDash([10, 10]); x.lineDashOffset = -this.t * 40; x.beginPath(); x.arc(0, 0, 45 * s, 0, TAU); x.stroke(); x.restore();
    x.save(); x.translate(cx, cy); x.scale(s * 1.05, s * 1.05);
    const eq = eqObj(); drawCar(x, { x: 0, y: 0, a: this.t * 0.6, av: Math.sin(this.t) * 0.5, id: 3, def: CAR[this.p.car], paint: Save.item(eq.paint), decal: Save.item(eq.decal), glow: Save.item(eq.glow) }, this.t);
    x.restore();
  }
  act(a, d) {
    const p = this.p;
    switch (a) {
      case 'close': this.closeModal(); break;
      case 'quick': this.app.startRace({ mode: 'quick' }); break;
      case 'daily': this.app.startRace({ mode: 'daily' }); break;
      case 'career': this.career(); break;
      case 'track': this.app.startRace({ mode: 'career', cup: d.cup, ti: +d.ti }); break;
      case 'garage': this.garage(d.tab || 'cars'); break;
      case 'selcar': if (Save.carUnlocked(CAR[d.id])) { p.car = d.id; Save.save(); this.refresh(); } break;
      case 'buy': { const it = Save.item(d.id); if (Save.buy(it, d.cur)) { this.app.audio.play('buy'); this.equip(it); this.toast({ icon: '🎉', text: `Unlocked ${it.name}!` }); } else this.toast({ icon: '❌', text: `Not enough ${d.cur}` }); this.refresh(); break; }
      case 'equip': { const it = Save.item(d.id); if (p.owned[it.id]) this.equip(it); this.refresh(); break; }
      case 'shop': this.shop(); break;
      case 'gift': if (p.giftDay !== dayNumber()) { const give = (n) => { p.giftDay = dayNumber(); this.toast(Save.grant({ gold: n })); Save.save(); this.refresh(); }; if (d.ad) this.app.rewardedAd(() => give(150)); else give(50); } break;
      case 'iap': Platform.purchase(d.sku).then((r) => { if (r.ok) { const g = GEM_PACKS.find((x) => x.sku === d.sku); this.toast(Save.grant({ gems: g.gems })); Save.save(); this.refresh(); } else this.toast({ icon: 'ℹ️', text: 'Purchases are not available right now.' }); }); break;
      case 'quests': this.quests(); break;
      case 'claimq': this.toast(Save.claimQuest(d.key)); this.app.audio.play('buy'); this.refresh(); break;
      case 'login': this.toast(Save.claimLogin()); this.app.audio.play('level'); this.closeModal(); break;
      case 'profile': this.profile(); break;
      case 'rename': { const v = this.root.querySelector('#nameIn').value.replace(/[^\w\- .]/g, '').trim().slice(0, 14); if (v.length >= 2) { p.name = v; Save.save(); this.toast({ icon: '✏️', text: 'Name saved' }); } break; }
      case 'resume': this.app.resume(); break;
      case 'quit': this.app.quit(); break;
      case 'restart': this.app.restart(); break;
      case 'again': this.app.afterResults(true); break;
      case 'tolobby': this.app.afterResults(false); break;
      case 'next': this.app.afterResults('next'); break;
      case 'share': this.share(); break;
      case 'double': this.app.rewardedAd(() => { if (this.last && !this.last.doubled) { this.last.doubled = true; this.toast(Save.grant({ gold: this.last.sum.gold })); Save.save(); this.root.querySelector('[data-act=double]')?.remove(); } }); break;
    }
  }
  equip(it) { const e = this.p.equip; if (PAINTS.includes(it)) e.paint = it.id; else if (DECALS.includes(it)) e.decal = it.id; else if (GLOWS.includes(it)) e.glow = it.id; else e.smoke = it.id; Save.save(); }
  career() {
    const render = () => {
      const p = this.p;
      const body = CUPS.map((c) => { const un = Save.cupUnlocked(c); const cs = c.tracks.reduce((a, t, i) => a + (p.stars[`${c.id}_${i}`] || 0), 0);
        return `<div class="card" style="margin-bottom:10px;border-color:${c.color};${un ? '' : 'opacity:.55'}"><h4><span style="color:${c.color};font-size:15px">🏆 ${c.name}</span><span>${un ? `⭐ ${cs}/9` : `🔒 ⭐${c.stars}`}</span></h4>
          <div style="display:flex;gap:8px;flex-wrap:wrap">${c.tracks.map((t, i) => { const st = p.stars[`${c.id}_${i}`] || 0; const best = p.best[`c_${t.seed}`]; return `<button class="mode" style="flex:1;min-width:150px" ${un ? `data-act="track" data-cup="${c.id}" data-ti="${i}"` : ''}><span class="ic">🛣️</span><div><b>${esc(t.name)}</b><span class="stars" style="color:#ffd60a">${'★'.repeat(st)}<span style="color:#3a2f55">${'★'.repeat(3 - st)}</span></span><span>${best ? ' · lap ' + fmtT(best) : ''}</span></div></button>`; }).join('')}</div></div>`; }).join('') +
        '<p class="muted">Finish 1st for ⭐⭐⭐, 2nd for ⭐⭐, 3rd for ⭐. Stars unlock new cups and cars.</p>';
      this.modal('🏁 Career', body, { render });
    };
    render();
  }
  garage(tab) {
    const render = () => {
      const p = this.p;
      const tabs = `<div class="tabs">${[['cars', '🏎️ Cars'], ['paint', '🎨 Paint'], ['decal', '✒️ Decals'], ['glow', '💡 Underglow'], ['smoke', '💨 Smoke']].map(([k, n]) => `<button class="tab ${tab === k ? 'on' : ''}" data-act="garage" data-tab="${k}">${n}</button>`).join('')}</div>`;
      let body;
      if (tab === 'cars') {
        body = `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr))">${CARS.map((c) => { const un = Save.carUnlocked(c); return `<div class="item ${un ? '' : 'locked'} ${p.car === c.id ? 'sel' : ''}" data-act="selcar" data-id="${c.id}" style="min-height:230px"><span data-car="${c.id}"></span>${un ? '' : `<span class="lock">🔒⭐${c.stars}</span>`}<div class="nm" style="font-size:16px">${c.name}</div><div class="sub">${esc(c.desc)}</div>
          ${['Top speed', 'Grip', 'Handling', 'Boost charge'].map((n, i) => `<div class="statbar" style="width:100%"><span style="width:78px;text-align:left">${n}</span><div class="pips">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= c.stats[i] ? 'on' : ''}"></i>`).join('')}</div></div>`).join('')}</div>`; }).join('')}</div>
          <p class="muted">Every car shares the same performance budget — they just feel different. Pick the one that matches your style.</p>`;
      } else {
        const list = { paint: PAINTS, decal: DECALS, glow: GLOWS, smoke: SMOKES }[tab];
        body = `<div class="grid">${list.map((it) => { const own = p.owned[it.id]; const rr = RARITY[it.rarity]; const eq = Object.values(p.equip).includes(it.id);
          const preview = tab === 'smoke' ? `<div class="big-ic" style="color:${it.color === 'rainbow' ? '#fff' : it.color}">${it.color === 'rainbow' ? '🌈' : '💨'}</div>` : `<span data-prev="${it.id}"></span>`;
          return `<div class="item ${eq ? 'sel' : ''}" style="border-color:${rr.color}">${preview}<div class="nm">${esc(it.name)}</div><div class="rar" style="color:${rr.color}">${rr.name}</div><div class="price">${own ? (eq ? '<span class="btn sm dis">Equipped</span>' : `<button class="btn sm green" data-act="equip" data-id="${it.id}">Equip</button>`) : it.price ? `${it.price.gold ? `<button class="btn sm gold" data-act="buy" data-id="${it.id}" data-cur="gold">🪙 ${it.price.gold}</button>` : ''}${it.price.gems ? `<button class="btn sm gem" data-act="buy" data-id="${it.id}" data-cur="gems">💎 ${it.price.gems}</button>` : ''}` : `<span class="sub">${esc(it.source || '')}</span>`}</div></div>`; }).join('')}</div><p class="muted">Cosmetics never change how a car drives.</p>`;
      }
      this.modal('Garage', body, { tabs, render });
      this.modalEl.querySelectorAll('[data-car]').forEach((s) => s.appendChild(carThumb(s.dataset.car, eqObj(), 96)));
      this.modalEl.querySelectorAll('[data-prev]').forEach((s) => { const it = Save.item(s.dataset.prev); const eq = { ...eqObj() }; if (PAINTS.includes(it)) eq.paint = it.id; else if (DECALS.includes(it)) eq.decal = it.id; else eq.glow = it.id; s.appendChild(carThumb(p.car, eq, 96)); });
    };
    render();
  }
  shop() {
    const render = () => {
      const p = this.p; const gift = p.giftDay !== dayNumber();
      const r = seeded(dayNumber() * 777); const pool = ALL_ITEMS.filter((x) => x.price && !p.owned[x.id]); const feat = []; while (feat.length < 6 && pool.length) feat.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
      const body = `<div class="card" style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><div style="font-size:40px">🎁</div><div style="flex:1"><b>Daily Free Gift</b><div class="muted">Free gold every day. Optional ad triples it.</div></div>${gift ? `<button class="btn green" data-act="gift">Claim 50 🪙</button>${Platform.adsAvailable ? '<button class="btn ad" data-act="gift" data-ad="1">📺 Claim 150 🪙</button>' : ''}` : '<span class="btn dis">Come back tomorrow</span>'}</div>
        <h3 class="stroke">🔥 Today's Featured <span class="muted">· ${this.timeToReset()}</span></h3><div class="grid" style="margin:8px 0 14px">${feat.map((it) => { const rr = RARITY[it.rarity]; return `<div class="item" style="border-color:${rr.color}">${SMOKES.includes(it) ? `<div class="big-ic">💨</div>` : `<span data-prev="${it.id}"></span>`}<div class="nm">${esc(it.name)}</div><div class="rar" style="color:${rr.color}">${rr.name}</div><div class="price">${it.price.gold ? `<button class="btn sm gold" data-act="buy" data-id="${it.id}" data-cur="gold">🪙 ${it.price.gold}</button>` : ''}${it.price.gems ? `<button class="btn sm gem" data-act="buy" data-id="${it.id}" data-cur="gems">💎 ${it.price.gems}</button>` : ''}</div></div>`; }).join('') || '<p class="muted">You own everything! 👑</p>'}</div>
        ${Platform.purchasesAvailable ? `<h3 class="stroke">💎 Gems</h3><div class="grid">${GEM_PACKS.map((g) => `<div class="item"><div class="big-ic">💎</div><div class="nm">${g.gems} Gems</div><div class="price"><button class="btn sm gem" data-act="iap" data-sku="${g.sku}">${g.price}</button></div></div>`).join('')}</div>` : '<p class="muted">💎 Gems come from achievements and daily logins.</p>'}
        <p class="muted">No loot boxes. No pay-to-win. Browse every item in the Garage.</p>`;
      this.modal('Shop', body, { render });
      this.modalEl.querySelectorAll('[data-prev]').forEach((s) => { const it = Save.item(s.dataset.prev); const eq = { ...eqObj() }; if (PAINTS.includes(it)) eq.paint = it.id; else if (DECALS.includes(it)) eq.decal = it.id; else eq.glow = it.id; s.appendChild(carThumb(p.car, eq, 96)); });
    };
    render();
  }
  quests() {
    const render = () => {
      const p = this.p; const qs = Save.questState();
      const body = `<div class="card" style="margin-bottom:12px"><h4><span>📅 Login Streak · Day ${p.login.streak}/7</span></h4><div style="display:flex;gap:6px;flex-wrap:wrap">${LOGIN.map((r, i) => `<div style="height:60px;flex:1;min-width:56px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px solid ${i + 1 === p.login.streak ? '#ffd60a' : 'var(--line)'};border-radius:12px;${i + 1 < p.login.streak ? 'opacity:.45' : ''}"><span style="font-size:20px">${r.gold ? '🪙' : '💎'}</span><span class="muted">Day ${i + 1}</span></div>`).join('')}</div>${p.login.pending ? '<div class="row"><button class="btn gold" data-act="login">Claim today\'s reward</button></div>' : ''}</div>
        ${qs.map((x) => `<div class="card" style="margin-bottom:8px;display:flex;align-items:center;gap:12px"><div style="font-size:28px">${x.claimed ? '✅' : x.done ? '🎁' : '📜'}</div><div style="flex:1"><b>${esc(x.text)}</b><div class="muted">🪙 ${x.gold}</div><div class="pb blue" style="margin-top:5px"><i style="width:${x.pct * 100}%"></i></div></div>${x.claimed ? '' : x.done ? `<button class="btn green" data-act="claimq" data-key="${x.key}">Claim</button>` : ''}</div>`).join('')}<p class="muted">New quests in ${this.timeToReset()}.</p>`;
      this.modal('Quests', body, { render });
    };
    render();
  }
  loginPopup() { if (!this.p.login.pending || this.modalEl || this.app.state !== 'lobby') return; const r = LOGIN[(this.p.login.streak - 1) % 7]; this.modal('Daily Reward', `<div style="text-align:center"><div style="font-size:64px">${r.gold ? '🪙' : '💎'}</div><h2 class="stroke">Day ${this.p.login.streak} of 7</h2><p class="muted" style="margin:6px 0 14px">Day 7 gives 40 💎</p><button class="btn gold" style="font-size:20px;padding:12px 28px" data-act="login">Claim ${r.gold ? r.gold + ' Gold' : r.gems + ' Gems'}</button></div>`, { w: 420 }); }
  profile() {
    const render = () => {
      const p = this.p, s = p.stats, S = p.settings;
      const body = `<div class="row"><input class="name" id="nameIn" maxlength="14" value="${esc(p.name)}"><button class="btn gold" data-act="rename">Save name</button></div>
        <div class="statrow" style="justify-content:flex-start">${[['Races', s.races], ['Wins', s.wins], ['Drift time', Math.round(s.driftTime) + 's'], ['Purple boosts', s.boost3], ['Overtakes', s.overtakes], ['Best trophies', p.trophiesMax]].map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('')}</div>
        <div class="row">${LEAGUES.map((l) => `<span class="tag" style="color:${l.color};${p.trophies >= l.min ? '' : 'opacity:.4'}">${l.icon} ${l.name} ${l.min}</span>`).join('')}</div>
        <h3 class="stroke" style="margin:12px 0 6px">⚙️ Settings</h3>
        <div class="row"><span class="lbl">Sound FX</span><input class="sl" type="range" min="0" max="1" step="0.05" value="${S.sfx}" data-set="sfx"></div>
        <div class="row"><span class="lbl">Music</span><input class="sl" type="range" min="0" max="1" step="0.05" value="${S.music}" data-set="music"></div>
        <div class="row"><span class="lbl">Low effects</span><input type="checkbox" ${S.lowFx ? 'checked' : ''} data-set="lowFx"></div>
        <div class="row muted">Controls: ←/→ or A/D steer (the car accelerates by itself) · hold a turn to DRIFT — longer drift = bigger boost (blue → orange → purple) · Space = instant drift · ↓/S brake · Esc pause. Mobile: hold left/right half of the screen; both = brake.</div>
        <h3 class="stroke" style="margin:12px 0 6px">🎖️ Achievements</h3><div class="grid">${ACHIEVEMENTS.map((a) => `<div class="item ${p.ach[a.id] ? '' : 'locked'}" style="min-height:110px"><div style="font-size:28px">${p.ach[a.id] ? '🏅' : '🔒'}</div><div class="nm">${a.name}</div><div class="sub">${a.desc}</div><div class="sub">💎 ${a.r.gems}${a.r.paint ? ' + exclusive paint' : ''}</div></div>`).join('')}</div>`;
      this.modal('Profile', body, { render });
    };
    render();
  }
  pause() { this.modal('Paused', `<div style="text-align:center;display:flex;flex-direction:column;gap:12px;align-items:center"><button class="play" style="width:260px;height:70px;font-size:28px" data-act="resume">RESUME</button><button class="btn" data-act="restart">↻ Restart race</button><button class="btn ad" data-act="quit">Quit to garage</button></div>`, { w: 400, noClose: true }); }
  share() {
    const r = this.last?.res; if (!r) return; const medal = ['⬜', '🥉', '🥈', '🥇'][r.medal || 0];
    const txt = r.mode === 'daily' ? `🏎️ DRIFTLINE Daily #${dayNumber() % 1000}\n${medal} ${fmtT(r.time)} · best lap ${fmtT(r.bestLap)}\n💨 ${Math.round(r.driftTime)}s drifting · 🟣 ${r.boost3} purple boosts\nBeat my time!` : `🏎️ DRIFTLINE — finished ${ORD[r.place]} of ${r.total} on ${r.trackName} · best lap ${fmtT(r.bestLap)} 💨`;
    try { navigator.clipboard.writeText(txt).then(() => this.toast({ icon: '📋', text: 'Copied — paste it to your friends!' }), () => this.toast({ icon: 'ℹ️', text: 'Copy not available here' })); } catch (e) { this.toast({ icon: 'ℹ️', text: 'Copy not available here' }); }
  }
  results(res, sum) {
    this.last = { res, sum, doubled: false };
    const win = res.place === 1; const daily = res.mode === 'daily';
    const title = daily ? (res.medal ? ['', 'BRONZE', 'SILVER', 'GOLD'][res.medal] + '!' : 'FINISHED') : (win ? '1ST PLACE!' : ORD[res.place]);
    this.root.innerHTML = `<div class="screen results">
      <div class="place ${win || res.medal === 3 ? 'win' : ''} stroke" style="font-size:clamp(50px,11vw,110px)">${daily ? ['🏁', '🥉', '🥈', '🥇'][res.medal] + ' ' : ''}${title}</div>
      <div class="rsub">${esc(res.trackName)} · ${fmtT(res.time)}${res.newLapRecord ? ' · <span style="color:#7CFC9A">NEW LAP RECORD!</span>' : ''}</div>
      ${daily ? `<div class="muted">🥇 ${fmtT(res.medals[0])} · 🥈 ${fmtT(res.medals[1])} · 🥉 ${fmtT(res.medals[2])}</div>` : ''}
      ${sum.newStars ? `<div class="toast" style="animation:pop .4s;font-size:20px">⭐ +${sum.newStars} star${sum.newStars > 1 ? 's' : ''}!</div>` : ''}${sum.dailyPB ? '<div class="toast">🏆 New daily best!</div>' : ''}
      <div class="statrow">${[['Best lap', fmtT(res.bestLap)], ['Drift time', Math.round(res.driftTime) + 's'], ['Purple boosts', res.boost3], ['Overtakes', res.overtakes], ['Clean laps', res.cleanLaps]].map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('')}</div>
      <div class="rewards">${sum.trophyDelta !== undefined ? `<div class="rew ${sum.trophyDelta >= 0 ? 'up' : 'down'}">🏆 ${sum.trophyDelta >= 0 ? '+' : ''}${sum.trophyDelta}</div>` : ''}<div class="rew">🪙 +${sum.gold}</div></div>
      ${sum.questsReady ? `<div class="muted">📜 ${sum.questsReady} quest${sum.questsReady > 1 ? 's' : ''} ready to claim</div>` : ''}
      <div class="rbtns"><button class="play" data-act="again">${win ? 'RACE AGAIN' : 'RETRY'}</button>${res.mode === 'career' && res.hasNext ? '<button class="btn gold" style="height:70px;padding:0 20px;font-size:18px" data-act="next">Next track ›</button>' : ''}<button class="btn" style="height:70px;padding:0 20px;font-size:18px" data-act="tolobby">Garage</button><button class="btn gem" style="height:70px;padding:0 18px" data-act="share">📋 Share</button>
      ${Platform.adsAvailable ? `<button class="btn ad" style="height:70px;padding:0 18px" data-act="double">📺 +${sum.gold} Gold</button>` : ''}</div></div>`;
    for (const a of sum.ach) setTimeout(() => { this.toast({ icon: '🏅', text: `Achievement: ${a.a.name}` }); this.toast(a.lines); }, 800);
  }
}

export class HUD {
  constructor(root) { this.root = root; this.cache = {}; }
  mount(r, touch, onPause, info) {
    this.r = r; this.cache = {}; this.info = info;
    this.root.className = 'dhud';
    this.root.innerHTML = `<div class="tl"><button class="pausebtn" id="pauseBtn">II</button></div><div class="lap stroke" id="lap"></div><div class="pos stroke" id="pos"></div>
      <div class="tm stroke" id="tm"></div><canvas class="mm" id="mm" width="280" height="280"></canvas><div class="spd stroke" id="spd"></div><div class="count stroke" id="count"></div><div class="ann" id="ann" style="top:30%"></div>
      ${touch ? '<div class="tzone2 l" id="tl">◀</div><div class="tzone2 r" id="tr">▶</div>' : ''}`;
    this.$ = (id) => this.root.querySelector('#' + id); this.mm = this.$('mm').getContext('2d');
    this.$('pauseBtn').addEventListener('click', onPause); this.annT = 0;
    if (r.cars.length === 1) this.$('pos').style.display = 'none';
  }
  unmount() { this.root.className = 'hidden'; this.root.innerHTML = ''; }
  set(id, k, v, fn) { if (this.cache[id + k] === v) return; this.cache[id + k] = v; fn(this.$(id), v); }
  count(n) { const c = this.$('count'); c.textContent = n; c.style.animation = 'none'; void c.offsetWidth; c.style.animation = 'annin .4s cubic-bezier(.2,1.8,.4,1)'; if (n === 'GO!') setTimeout(() => (c.textContent = ''), 700); }
  announce(t, sub, color) { const a = this.$('ann'); a.innerHTML = `<div class="a1 stroke" style="font-size:clamp(26px,5vw,48px);${color ? 'color:' + color : ''}">${esc(t)}</div>${sub ? `<div class="a2 stroke">${esc(sub)}</div>` : ''}`; this.annT = 1.4; }
  update(dt, frame) {
    const r = this.r, p = r.player;
    this.set('lap', 't', `LAP ${Math.max(1, Math.min(r.laps, p.lap))}/${r.laps}`, (e, v) => (e.textContent = v));
    this.set('pos', 't', p.place, (e, v) => (e.innerHTML = `${v}<sub>/${r.cars.length}</sub>`));
    const lt = p.lap >= 1 ? r.time - p.lapStart : 0;
    this.set('tm', 't', Math.floor(Math.max(0, r.time) * 10), () => (this.$('tm').innerHTML = `${fmtT(Math.max(0, r.time))}<small>lap ${fmtT(lt)} · best ${fmtT(p.bestLap ?? this.info.best)}</small>`));
    const kmh = Math.round(Math.hypot(p.vx, p.vy) * 0.36);
    this.set('spd', 't', kmh + (p.boostT > 0 ? 'b' : ''), () => (this.$('spd').innerHTML = `<span style="color:${p.boostT > 0 ? p.boostCol : '#fff'}">${kmh}</span><small>km/h${p.drift ? ' · DRIFT' : ''}</small>`));
    if (frame % 3 === 0) drawMinimap(this.mm, r, 280);
    if (this.annT > 0) { this.annT -= dt; if (this.annT <= 0) this.$('ann').innerHTML = ''; }
  }
}
export { TIER_COL };
