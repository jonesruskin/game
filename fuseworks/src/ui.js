// DOM UI: HUD, cards (tilt, jiggle, drag-reorder, tooltips), shop, packs and every menu screen.
import { icon } from './icons.js';
import { CAT, CATALYSTS, CHARM, SHELLS, SHELL_IDS, COLORS, ENH, BP, BOSS, BOSSES, FINAL_BOSSES, RARITY, LAUNCHERS, LAUNCHER, STAKES, ACHIEVEMENTS, COSMETICS, LOCKED, ACT_NAMES, NIGHTS, formulaDesc } from './content.js';
import { PACKS, shellDesc } from './run.js';
import { fmt, fmtHeat, esc, hashStr, dayNumber } from './util.js';
import { Save } from './save.js';

export const rich = (s) => esc(s).replace(/\{([a-z$]):([^}]+)\}/g, (_, k, v) => `<b class="t-${k === '$' ? 'm' : k}">${v}</b>`);
const HUES = ['#ff5d73', '#ffb84d', '#ffe066', '#7cf29a', '#4dd6ff', '#7c9bff', '#c38bff', '#ff7ad9', '#62f0d8', '#ff9966'];
const catHue = (d) => (d.hue ? COLORS[d.hue].hex : HUES[hashStr(d.id) % HUES.length]);
const $ = (s, r = document) => r.querySelector(s);

export class UI {
  constructor(app) {
    this.app = app; this.root = $('#ui'); this.modalEl = $('#modal'); this.hud = $('#hud'); this.tip = $('#tip'); this.toastEl = $('#toasts'); this.bannerEl = $('#banner');
    this.glyph = {}; this.cache = {}; this.disp = { score: 0 }; this.pinned = null; this.dragCard = null;
    const click = (e) => { const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; e.stopPropagation(); this.app.audio.ui('click'); this.app.act(b.dataset.act, b.dataset, b, e); };
    for (const el of [this.root, this.modalEl, this.hud]) el.addEventListener('click', click);
    this.tip.addEventListener('click', click);
    document.addEventListener('pointerdown', (e) => { if (this.pinned && !e.target.closest('#tip') && !e.target.closest('.card')) this.hideTip(true); }, true);
    this.hud.addEventListener('pointerover', (e) => { const c = e.target.closest('.card'); if (c && e.pointerType === 'mouse' && !this.pinned && !this.dragCard) this.cardTip(c, false); });
    this.hud.addEventListener('pointerout', (e) => { const c = e.target.closest('.card'); if (c && !this.pinned && (!e.relatedTarget || !c.contains(e.relatedTarget))) this.hideTip(); });
    this.hud.addEventListener('pointerdown', (e) => this.cardDown(e));
    for (const el of [this.root, this.modalEl]) { el.addEventListener('pointerover', (e) => { const c = e.target.closest('.card[data-tip]'); if (c && e.pointerType === 'mouse' && !this.pinned) this.cardTip(c, false); }); el.addEventListener('pointerout', (e) => { const c = e.target.closest('.card[data-tip]'); if (c && !this.pinned && (!e.relatedTarget || !c.contains(e.relatedTarget))) this.hideTip(); }); el.addEventListener('pointerup', (e) => { const c = e.target.closest('.card[data-tip]'); if (c && e.pointerType !== 'mouse' && !e.target.closest('[data-act]')) this.cardTip(c, true); }); }
    document.addEventListener('pointermove', (e) => { const c = e.target.closest && e.target.closest('.card'); if (c && e.pointerType === 'mouse') { const r = c.getBoundingClientRect(); c.style.setProperty('--rx', ((e.clientY - r.top) / r.height - 0.5) * -16 + 'deg'); c.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 18 + 'deg'); c.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%'); } });
    document.addEventListener('pointerout', (e) => { const c = e.target.closest && e.target.closest('.card'); if (c && (!e.relatedTarget || !c.contains(e.relatedTarget))) { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); } });
  }
  // ------------------------------------------------------------------ pieces
  shellHTML(s, cls = '') { const C = COLORS[s.color]; const deep = `rgb(${C.deep.map((v) => Math.round(v * 255)).join(',')})`; return `<div class="shellv ${cls} ${s.enh ? 'e-' + s.enh : ''}" style="--c:${C.hex};--d:${deep}"><img src="${this.glyph[s.type] || ''}" alt="" draggable="false"></div>`; }
  catHTML(id, o = {}) {
    const d = CAT[id]; return `<div class="card cat r${d.rarity}${o.cls ? ' ' + o.cls : ''}" data-kind="cat" data-id="${id}"${o.uid ? ` data-uid="${o.uid}"` : ''}${o.i !== undefined ? ` data-i="${o.i}"` : ''}${o.tip ? ' data-tip="1"' : ''} style="--hue:${catHue(d)}">
      <div class="ci"><div class="shine"></div><div class="medal">${icon(d.icon)}</div><div class="nm">${esc(d.name)}</div></div>${o.price !== undefined ? `<div class="tag" ${o.buyAct ? `data-act="${o.buyAct}" data-i="${o.i}"` : ''}>$${o.price}</div>` : ''}${o.off ? `<div class="offx">${icon('close')}</div>` : ''}</div>`;
  }
  charmHTML(id, o = {}) {
    const c = CHARM[id]; const isF = c.kind === 'formula'; const hue = isF ? COLORS[['crimson', 'amber', 'azure', 'jade'][SHELL_IDS.indexOf(c.type) % 4]].hex : c.hue ? COLORS[c.hue].hex : '#c9a6ff';
    const lv = isF ? (this.app.run ? this.app.run.formulas[c.type] || 1 : 1) : 0;
    return `<div class="card charm ${isF ? 'formula' : 'rite'}${o.cls ? ' ' + o.cls : ''}" data-kind="charm" data-id="${id}"${o.i !== undefined ? ` data-i="${o.i}"` : ''}${o.tip ? ' data-tip="1"' : ''} style="--hue:${hue}">
      <div class="ci"><div class="shine"></div>${isF ? `<div class="fshell">${this.shellHTML({ type: c.type, color: 'amber' }, 'mini')}<span class="lv">Lv ${lv}→${lv + 1}</span></div>` : `<div class="medal">${icon(c.icon)}</div>`}<div class="nm">${esc(c.name)}</div></div>${o.price !== undefined ? `<div class="tag" ${o.buyAct ? `data-act="${o.buyAct}" data-i="${o.i}"` : ''}>$${o.price}</div>` : ''}</div>`;
  }
  shellCard(s, o = {}) { return `<div class="card shellcard${o.cls ? ' ' + o.cls : ''}" data-kind="shell" data-type="${s.type}" data-color="${s.color}" data-enh="${s.enh || ''}"${o.i !== undefined ? ` data-i="${o.i}"` : ''}${o.tip ? ' data-tip="1"' : ''} style="--hue:${COLORS[s.color].hex}"><div class="ci"><div class="shine"></div>${this.shellHTML(s)}<div class="nm">${COLORS[s.color].name} ${SHELLS[s.type].name}${s.enh ? `<small>${ENH[s.enh].name}</small>` : ''}</div></div>${o.price !== undefined ? `<div class="tag" ${o.buyAct ? `data-act="${o.buyAct}" data-i="${o.i}"` : ''}>$${o.price}</div>` : ''}</div>`; }
  tipFor(card) {
    const k = card.dataset.kind, id = card.dataset.id; const run = this.app.run; const ctx = card.closest('#hud') ? 'own' : card.closest('.shop') ? 'shop' : card.closest('.pack') ? 'pack' : 'view';
    if (k === 'cat') {
      const d = CAT[id]; const inst = card.dataset.uid && run ? run.catalysts.find((c) => c.uid === +card.dataset.uid) : null;
      let h = `<div class="tip-h"><b>${esc(d.name)}</b><span class="rar r${d.rarity}">${RARITY[d.rarity].name}</span></div><div class="tip-d">${rich(d.desc)}</div>`;
      if (d.info && run) h += `<div class="tip-i">${rich(d.info(inst || { s: d.init ? d.init() : {} }, run))}</div>`;
      if (inst && inst.off) h += `<div class="tip-i bad">Switched off by The Thief this launch.</div>`;
      if (ctx === 'own' && inst && run && !run.chainRunning) h += `<div class="tip-a"><button class="btn sm sell" data-act="sell" data-uid="${inst.uid}">Sell <b class="t-m">$${run.sellValue(inst)}</b></button><span class="tip-hint">Drag to reorder — left to right</span></div>`;
      if (ctx === 'shop') h += `<div class="tip-a"><button class="btn sm primary" data-act="buy" data-i="${card.dataset.i}">Buy</button></div>`;
      return h;
    }
    if (k === 'charm') {
      const c = CHARM[id]; let h = `<div class="tip-h"><b>${esc(c.name)}</b><span class="rar ${c.kind}">${c.kind === 'formula' ? 'Formula' : 'Rite'}</span></div>`;
      if (c.kind === 'formula') { const lv = run ? run.formulas[c.type] || 1 : 1; h += `<div class="tip-d">${rich(formulaDesc(c.type))}</div><div class="tip-i">${SHELLS[c.type].name} is level <b>${lv}</b>. Applies instantly.</div>`; }
      else h += `<div class="tip-d">${rich(c.desc)}</div>${c.need ? `<div class="tip-i">Use during an act: pick shells in the sky.</div>` : ''}`;
      if (ctx === 'own' && run) { const i = +card.dataset.i; h += `<div class="tip-a">${run.charmUsable(i) ? `<button class="btn sm primary" data-act="use-charm" data-i="${i}">Use</button>` : ''}<button class="btn sm sell" data-act="sell-charm" data-i="${i}">Sell <b class="t-m">$1</b></button></div>`; }
      if (ctx === 'shop') h += `<div class="tip-a"><button class="btn sm primary" data-act="buy" data-i="${card.dataset.i}">Buy</button></div>`;
      return h;
    }
    if (k === 'shell') { const s = { type: card.dataset.type, color: card.dataset.color, enh: card.dataset.enh || null }; let h = `<div class="tip-h"><b>${COLORS[s.color].name} ${SHELLS[s.type].name}</b>${s.enh ? `<span class="rar enh">${ENH[s.enh].name}</span>` : ''}</div><div class="tip-d">${rich(shellStats(s, run))}</div>`; if (ctx === 'shop') h += `<div class="tip-a"><button class="btn sm primary" data-act="buy" data-i="${card.dataset.i}">Buy</button></div>`; return h; }
    if (k === 'bp') { const b = BP[id]; return `<div class="tip-h"><b>${esc(b.name)}</b><span class="rar bp">Blueprint</span></div><div class="tip-d">${rich(b.desc)}</div><div class="tip-i">Permanent for this run. One per night.</div>${ctx === 'shop' ? '<div class="tip-a"><button class="btn sm primary" data-act="buy-bp">Buy</button></div>' : ''}`; }
    if (k === 'pack') { const P = PACKS[card.dataset.pk]; return `<div class="tip-h"><b>${P.name}</b></div><div class="tip-d">${esc(P.desc)}</div>${ctx === 'shop' ? `<div class="tip-a"><button class="btn sm primary" data-act="buy-pack" data-i="${card.dataset.i}">Open</button></div>` : ''}`; }
    if (k === 'boss') { const b = BOSS[id]; return `<div class="tip-h"><b>${esc(b.name)}</b><span class="rar boss">Finale boss</span></div><div class="tip-d">${esc(b.desc)}</div>`; }
    return '';
  }
  cardTip(card, pin) { const h = this.tipFor(card); if (!h) return; this.tip.innerHTML = h; this.tip.classList.add('on'); this.pinned = pin ? card : null; this.placeTip(card); }
  placeTip(anchor) { const r = anchor.getBoundingClientRect(); const t = this.tip; t.style.left = '0px'; t.style.top = '0px'; const tw = t.offsetWidth, th = t.offsetHeight; const W = innerWidth, H = innerHeight; let x = r.left + r.width / 2 - tw / 2; x = Math.max(8, Math.min(W - tw - 8, x)); let y = r.bottom + 10; if (y + th > H - 8) y = r.top - th - 10; if (y < 8) y = 8; t.style.left = x + 'px'; t.style.top = y + 'px'; }
  hideTip(force) { if (this.pinned && !force) return; this.tip.classList.remove('on'); this.pinned = null; }
  // drag to reorder owned catalysts
  cardDown(e) {
    const c = e.target.closest('.card.owned'); if (!c || e.target.closest('[data-act]')) return; const run = this.app.run; const start = { x: e.clientX, y: e.clientY }; let drag = false;
    const cards = [...this.hud.querySelectorAll('#cats .card')]; const from = cards.indexOf(c);
    const move = (ev) => { const dx = ev.clientX - start.x; if (!drag && Math.abs(dx) > 8 && run && !run.chainRunning && c.dataset.kind === 'cat') { drag = true; this.dragCard = c; c.classList.add('dragging'); this.hideTip(true); } if (drag) c.style.transform = `translateX(${dx}px) scale(1.08)`; };
    const up = (ev) => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      if (drag) { c.classList.remove('dragging'); c.style.transform = ''; this.dragCard = null; let to = from; const x = ev.clientX; cards.forEach((o, i) => { const r = o.getBoundingClientRect(); if (o !== c && x > r.left + r.width / 2) to = i > from ? i : i + 1; }); to = Math.max(0, Math.min(cards.length - 1, to > from ? to : to)); if (to !== from) this.app.act('reorder', { from, to }); else this.renderCats(); }
      else if (ev.pointerType !== 'mouse' || true) this.cardTip(c, true);
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }
  // ------------------------------------------------------------------ HUD
  buildHud() {
    this.hud.innerHTML = `
      <div class="hud-top"><div class="cats" id="cats"></div><div class="slots" id="catSlots"></div><div class="charms" id="charms"></div></div>
      <div class="hud-side">
        <div class="act-info"><div class="night">NIGHT <b id="hNight">1</b><span class="pips" id="hPips"></span></div><div class="actname" id="hAct">OPENING</div><div class="boss" id="hBoss" data-act="boss-info"></div></div>
        <div class="goal"><div class="target"><span class="lbl">TARGET</span><b id="hTarget">0</b></div><div class="score"><span class="lbl">SCORE</span><b id="hScore">0</b></div><div class="bar"><i id="hGhost" class="ghost"></i><i id="hBar"></i><s id="hFire"></s></div></div>
        <div class="calc" id="hCalc"><div class="box sp"><b id="hSp">0</b><span>SPARKS</span></div><div class="times">×</div><div class="box ht"><b id="hHt">0</b><span>HEAT</span></div></div>
        <div class="res"><div class="r launches" title="Launches left">${icon('rocket')}<b id="hL">4</b><span>LAUNCHES</span></div><div class="r moves" title="Moves left">${icon('hand')}<b id="hM">3</b><span>MOVES</span></div><div class="r money" title="Money"><i>$</i><b id="hMoney">4</b><span>MONEY</span></div></div>
        <div class="res2"><button class="mini" data-act="crate" title="Your crate">${icon('crate')}<b id="hCrate">0</b></button><button class="mini" data-act="pause" title="Pause">${icon('pause')}</button></div>
      </div>
      <div class="hud-hint" id="hHint"></div>`;
    this.cache = {}; this.renderCats(); this.renderCharms();
  }
  setText(id, v) { if (this.cache[id] === v) return false; this.cache[id] = v; const el = document.getElementById(id); if (el) el.textContent = v; return true; }
  bump(id, cls = 'bump') { const el = typeof id === 'string' ? document.getElementById(id) : id; if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  renderCats() {
    const run = this.app.run; const el = $('#cats'); if (!el || !run) return;
    el.innerHTML = run.catalysts.map((c, i) => this.catHTML(c.id, { uid: c.uid, i, cls: 'owned' + (c.off ? ' off' : ''), off: c.off })).join('') + Array.from({ length: Math.max(0, run.mods.catSlots - run.catalysts.length) }, () => '<div class="card empty"></div>').join('');
    $('#catSlots').textContent = `${run.catalysts.length}/${run.mods.catSlots}`; this.renderCharms();
  }
  renderCharms() { const run = this.app.run; const el = $('#charms'); if (!el || !run) return; el.innerHTML = run.charms.map((c, i) => this.charmHTML(c.id, { i, cls: 'owned' + (this.app.targeting && this.app.targeting.i === i ? ' active' : '') })).join('') + Array.from({ length: Math.max(0, run.mods.charmSlots - run.charms.length) }, () => '<div class="card empty"></div>').join(''); }
  catFx(uid, text, cls) { const el = this.hud.querySelector(`.card[data-uid="${uid}"]`); if (!el) return; this.bump(el, 'trig'); if (text) { const f = document.createElement('div'); f.className = 'cfx ' + cls; f.textContent = text; el.appendChild(f); setTimeout(() => f.remove(), 900); } }
  // st: { score, target, sp, ht, live, launches, moves, crate, hint, hintHtml }
  updateHud(dt, st) {
    const run = this.app.run; if (!run) return; const a = run.act;
    this.setText('hNight', run.endless || run.night > NIGHTS ? `${run.night} · ENDLESS` : `${run.night}/${NIGHTS}`); this.setText('hAct', ACT_NAMES[a ? a.idx : Math.min(2, run.actIdx)].toUpperCase());
    const pk = run.actIdx + ':' + (a ? 1 : 0);
    if (this.cache.pips !== pk) { this.cache.pips = pk; const cur = a ? a.idx : run.actIdx; document.getElementById('hPips').innerHTML = [0, 1, 2].map((i) => `<i class="${i < cur ? 'done' : i === cur ? 'cur' : ''}${i === 2 ? ' boss' : ''}"></i>`).join(''); }
    const bossId = (a && a.boss) || (!a && run.actIdx <= 2 ? run.bossFor(run.night).id : null);
    const bk = bossId + ':' + (a ? a.idx : 'x');
    if (this.cache.boss !== bk) { this.cache.boss = bk; const b = bossId ? BOSS[bossId] : null; const el = $('#hBoss'); const desc = a && a.boss === 'purist' && a.purist ? `${COLORS[a.purist].name} shells give no Sparks.` : b ? b.desc : ''; el.innerHTML = b ? `${icon(b.icon)}<span><b>${a && a.boss ? 'BOSS' : 'FINALE BOSS'}: ${esc(b.name)}</b><small>${esc(desc)}</small></span>` : ''; el.classList.toggle('live', !!(a && a.boss)); el.style.display = b ? '' : 'none'; }
    const target = st.target; if (this.setText('hTarget', fmt(target))) this.bump('hTarget');
    const show = st.score + (st.live || 0);
    this.disp.score += (show - this.disp.score) * Math.min(1, dt * 9); if (Math.abs(show - this.disp.score) < 1 || show < this.disp.score) this.disp.score = show;
    this.setText('hScore', fmt(this.disp.score));
    const pr = Math.min(1, st.score / target), pg = Math.min(1, show / target); const bar = $('#hBar'), gh = $('#hGhost');
    if (bar) { bar.style.width = (pr * 100).toFixed(1) + '%'; gh.style.width = (pg * 100).toFixed(1) + '%'; $('#hFire').classList.toggle('on', show >= target); }
    const fit = (id) => { const el = document.getElementById(id); const n = el.textContent.length; el.style.fontSize = n > 9 ? '0.62em' : n > 7 ? '0.78em' : ''; };
    if (this.setText('hSp', fmt(st.sp, 1e8))) { this.bump($('#hCalc .sp'), 'pop'); fit('hSp'); } if (this.setText('hHt', fmtHeat(st.ht))) { this.bump($('#hCalc .ht'), 'pop'); fit('hHt'); }
    this.setText('hL', String(st.launches)); this.setText('hM', String(st.moves)); this.setText('hCrate', String(st.crate));
    if (this.setText('hMoney', String(run.money))) this.bump($('.r.money'), 'pop');
    const hk = st.hintHtml || st.hint || ''; if (this.cache.hint !== hk) { this.cache.hint = hk; const h = $('#hHint'); h.innerHTML = st.hintHtml || esc(st.hint || ''); h.classList.toggle('on', !!hk); h.classList.toggle('act', !!st.hintHtml); }
  }
  // ------------------------------------------------------------------ banners, toasts
  banner(title, sub = '', cls = '', dur = 1.6) { const b = this.bannerEl; b.className = 'on ' + cls; b.innerHTML = `<div class="bw"><div class="bt">${title}</div>${sub ? `<div class="bs">${sub}</div>` : ''}</div>`; clearTimeout(this.bT); this.bT = setTimeout(() => { b.className = ''; }, dur * 1000); }
  toast(html, cls = '') { const t = document.createElement('div'); t.className = 'toast ' + cls; t.innerHTML = html; this.toastEl.appendChild(t); setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3700); }
  achToast(a) { this.toast(`${icon('trophy')}<div><b>${esc(a.name)}</b><span>${esc(a.desc)}</span>${a.unlock ? `<em>Unlocked: ${a.unlock.map(unlockName).join(', ')}</em>` : ''}</div>`, 'ach'); }
  // ------------------------------------------------------------------ screens
  show(html, cls = '') { this.root.innerHTML = html ? `<div class="screen ${cls}">${html}</div>` : ''; this.hideTip(true); }
  modal(html, cls = '') { this.modalEl.innerHTML = html ? `<div class="mwrap"><div class="modal ${cls}">${html}</div></div>` : ''; this.modalEl.classList.toggle('on', !!html); this.hideTip(true); }
  title() {
    const p = Save.p; const hasRun = !!p.run; const d = dayNumber(); const dailyDone = p.daily.day === d && p.daily.done;
    this.show(`<div class="logo"><div class="lw"><span class="l1">FUSE</span><span class="l2">WORKS</span></div><div class="fuse"><i></i></div></div>
      <div class="tagline">One spark. A hundred explosions.</div>
      <div class="menu">
        <button class="btn big primary pulse" data-act="play">${icon('play')}<span>${hasRun ? 'Continue' : 'Play'}</span></button>
        ${hasRun ? `<button class="btn" data-act="newrun">${icon('plus')}<span>New Show</span></button>` : ''}
        <button class="btn daily" data-act="daily">${icon('calendar')}<span>Daily Show</span><small>${dailyDone ? `Best: Night ${p.daily.night}` : 'New today!'}</small></button>
        <div class="row"><button class="btn icon" data-act="collection">${icon('book')}<span>Collection</span></button><button class="btn icon" data-act="locker">${icon('palette')}<span>Locker</span></button><button class="btn icon" data-act="settings">${icon('gear')}<span>Settings</span></button></div>
      </div>
      <div class="foot">${p.stats.runs ? `<span>${icon('trophy')} Best <b>Night ${p.stats.bestNight}</b></span><span>${icon('star')} <b>${p.stats.wins}</b> wins</span><span>${icon('spark')} <b>${fmt(p.stats.bestLaunch)}</b> best launch</span>` : ''}<span class="dust">${icon('spark')} <b>${p.dust}</b> Stardust</span></div>
      <div class="tap-hint">tap the sky</div>`, 'title');
  }
  setup(sel) {
    const p = Save.p; const un = Save.unlockedSet(); const maxStake = Save.stakesAvailable();
    const tiles = LAUNCHERS.map((L) => { const locked = L.unlock && !un.has('launcher:' + L.id); const a = locked ? ACHIEVEMENTS.find((x) => (x.unlock || []).includes('launcher:' + L.id)) : null;
      return `<button class="ltile${sel.launcher === L.id ? ' sel' : ''}${locked ? ' locked' : ''}" ${locked ? 'disabled' : `data-act="pick-launcher" data-id="${L.id}"`}><div class="li">${icon(locked ? 'lock' : L.icon)}</div><b>${esc(L.name)}</b><span>${locked ? 'Unlock: ' + esc(a ? a.desc : '???') : rich(L.desc)}</span></button>`; }).join('');
    const stakes = STAKES.map((s, i) => `<button class="chip${sel.stake === i ? ' sel' : ''}" ${i > maxStake ? 'disabled' : `data-act="pick-stake" data-i="${i}"`}>${i > maxStake ? icon('lock') : icon('heat')}${esc(s.name)}</button>`).join('');
    this.modal(`<h2>New Show</h2><div class="sub">Choose your crate</div><div class="ltiles">${tiles}</div><div class="stakes"><span class="lbl">Heat level</span>${stakes}</div><div class="stake-desc">${rich(STAKES[sel.stake].desc)}${maxStake === 0 ? ' <i>Win a show to unlock higher heat.</i>' : ''}</div>
      <div class="btns"><button class="btn ghost" data-act="close">Back</button><button class="btn big primary" data-act="start">${icon('play')}<span>Start the Show</span></button></div>`, 'setup');
  }
  cashout(res, run, act) {
    const lines = res.lines.map((l, i) => `<div class="ln" style="--i:${i}"><span>${esc(l.label)}</span><b class="t-m">+$${l.v}</b></div>`).join('');
    this.modal(`<div class="burst-h">${act.idx === 2 ? `NIGHT ${act.night} CONQUERED!` : 'ACT CLEAR!'}</div><div class="sc">Scored <b>${fmt(act.score)}</b> of ${fmt(act.target)}${act.score >= act.target * 2 ? ` <em>×${(act.score / act.target).toFixed(1)}</em>` : ''}</div><div class="lines">${lines}</div><div class="tot" style="--i:${res.lines.length}">Total <b class="t-m">+$${res.total}</b></div>
      <button class="btn big primary" data-act="to-shop" style="--i:${res.lines.length + 1}">${res.won ? `${icon('trophy')}<span>Take a bow</span>` : `<span>To the Bazaar</span>${icon('play')}`}</button>`, 'cashout');
  }
  shop(run) {
    const S = run.shop; if (!S) return; const items = S.items.map((it, i) => { if (it.sold) return `<div class="card sold"><span>SOLD</span></div>`; const o = { price: it.cost, i, tip: true, buyAct: 'buy', cls: run.canBuy(it) ? '' : 'cant' }; if (it.kind === 'cat') { Save.seeCat(it.id); return this.catHTML(it.id, o); } if (it.kind === 'charm') return this.charmHTML(it.id, o); return this.shellCard(it.shell, o); }).join('');
    const bp = S.bp ? `<div class="card bp${run.money >= S.bp.cost ? '' : ' cant'}" data-kind="bp" data-id="${S.bp.id}" data-tip="1"><div class="ci"><div class="shine"></div><div class="medal">${icon(BP[S.bp.id].icon)}</div><div class="nm">${esc(BP[S.bp.id].name)}</div><div class="bpl">BLUEPRINT</div></div><div class="tag" data-act="buy-bp">$${S.bp.cost}</div></div>` : '';
    const packs = S.packs.map((p, i) => p.sold ? `<div class="card pack sold"><span>OPENED</span></div>` : `<div class="card pack pk-${p.kind}${run.money >= p.cost ? '' : ' cant'}" data-kind="pack" data-pk="${p.kind}" data-i="${i}" data-tip="1"><div class="ci"><div class="shine"></div><div class="medal">${icon(PACKS[p.kind].icon)}</div><div class="nm">${PACKS[p.kind].name}</div></div><div class="tag" data-act="buy-pack" data-i="${i}">$${p.cost}</div></div>`).join('');
    const next = run.phase === 'won' ? null : { n: run.night, a: run.actIdx }; const boss = next && next.a === 2 ? run.bossFor(next.n) : null;
    const intr = Math.max(0, Math.min(Math.floor(run.money / run.mods.interestPer), run.mods.interestCap));
    const intrTxt = intr < run.mods.interestCap ? `interest +$${intr} · next at $${(intr + 1) * run.mods.interestPer}` : `interest +$${intr} (max)`;
    this.show(`<div class="shop"><div class="shop-h"><h2>THE BAZAAR</h2><div class="money"><span>$<b>${run.money}</b></span><small>${intrTxt}</small></div></div>
      <div class="shop-body"><div class="col"><div class="lbl">Wares</div><div class="shop-row items">${items}${bp}</div></div><div class="col"><div class="lbl">Packs</div><div class="shop-row packs">${packs}</div></div></div>
      <div class="shop-f"><button class="btn" data-act="reroll" ${run.money < run.rerollCost() ? 'disabled' : ''}>${icon('refresh')}<span>Reroll</span><b class="t-m">$${run.rerollCost()}</b></button>
        <div class="next"><div class="nx-t">Next: Night ${next.n} · ${ACT_NAMES[next.a]}</div><div class="nx-g">Target <b>${fmt(run.target(next.n, next.a))}</b>${boss ? ` · <span class="bossn">${icon(boss.icon)}${esc(boss.name)}</span>` : ''}</div>${boss ? `<div class="nx-b">${esc(boss.desc)}</div>` : ''}</div>
        <button class="btn big primary" data-act="next-act"><span>Start</span>${icon('play')}</button></div></div>`, 'shopscreen');
  }
  pack(run) {
    const P = run.pack; if (!P) return; const K = PACKS[P.kind];
    const opts = P.opts.map((o, j) => { const cls = 'flip' + (o.taken ? ' taken' : '') + (run.canPick(o) ? '' : ' cant'); const inner = o.kind === 'cat' ? this.catHTML(o.id, { cls, tip: true }) : o.kind === 'charm' ? this.charmHTML(o.id, { cls, tip: true }) : this.shellCard(o.shell, { cls, tip: true }); return `<div class="opt" style="--j:${j}" data-act="pick" data-j="${j}">${inner}<div class="optd">${o.kind === 'cat' ? rich(CAT[o.id].desc) : o.kind === 'charm' ? rich(CHARM[o.id].kind === 'formula' ? formulaDesc(CHARM[o.id].type) : CHARM[o.id].desc) : rich(shellStats(o.shell, run))}</div></div>`; }).join('');
    for (const o of P.opts) if (o.kind === 'cat') Save.seeCat(o.id);
    this.modal(`<h2>${K.name}</h2><div class="sub">Choose ${P.left}${P.kind === 'catalyst' && run.catalysts.length >= run.mods.catSlots ? ' — <b class="t-x">your catalyst slots are full, sell one first</b>' : ''}</div><div class="opts">${opts}</div><div class="btns"><button class="btn ghost" data-act="skip-pack">Skip</button></div>`, 'pack');
  }
  revive() { this.modal(`<div class="burst-h sad">SO CLOSE!</div><div class="sub">The crowd wants more. One more launch could do it.</div><div class="btns col"><button class="btn big primary" data-act="revive">${icon('play')}<span>Second Wind</span><small>watch an ad · one extra launch</small></button><button class="btn ghost" data-act="no-revive">No thanks</button></div>`, 'revive'); }
  over(run, fin, won) {
    const s = run.stats; const ach = (fin.ach || []).map((a) => `<div class="ach">${icon('trophy')}<div><b>${esc(a.name)}</b>${a.unlock ? `<span>Unlocked: ${a.unlock.map(unlockName).join(', ')}</span>` : ''}</div></div>`).join('');
    const reached = won ? 'All 8 nights cleared!' : `Night ${run.night} · ${ACT_NAMES[run.actIdx]}`;
    const dustBtn = fin.canDouble ? `<button class="btn sm primary" data-act="dust-x2">${icon('play')} ×2 with ad</button>` : '';
    this.modal(`<div class="burst-h${won ? ' gold' : ''}">${won ? 'SHOW OF THE CENTURY!' : 'THE SHOW IS OVER'}</div><div class="reached">${reached}${run.daily ? ' · Daily Show' : ''}</div>
      <div class="stats"><div><b>${fmt(s.bestLaunch)}</b><span>Best launch</span></div><div><b>${s.longest}</b><span>Longest chain</span></div><div><b>${s.finales}</b><span>Grand Finales</span></div><div><b>${s.acts}</b><span>Acts cleared</span></div></div>
      <div class="dustline">${icon('spark')}<span>+<b id="dustN">${fin.dust}</b> Stardust</span>${dustBtn}</div>${ach ? `<div class="achs">${ach}</div>` : ''}
      ${run.daily ? `<button class="btn" data-act="share">${icon('share')}<span>Copy result</span></button>` : ''}
      <div class="btns">${won && !run.daily ? `<button class="btn big primary" data-act="endless">${icon('infinity')}<span>Endless</span></button>` : `<button class="btn big primary" data-act="retry">${icon('refresh')}<span>Play Again</span></button>`}<button class="btn" data-act="menu">Menu</button></div>`, 'over');
  }
  pause() { this.modal(`<h2>Paused</h2><div class="btns col"><button class="btn big primary" data-act="resume">${icon('play')}<span>Resume</span></button><button class="btn" data-act="help">${icon('info')}<span>How to play</span></button><button class="btn" data-act="settings">${icon('gear')}<span>Settings</span></button><button class="btn" data-act="menu">${icon('back')}<span>Save &amp; Quit</span></button><button class="btn ghost danger" data-act="abandon">Abandon show</button></div>`, 'pause'); }
  help() {
    const row = (ic, t, d) => `<div class="hrow">${icon(ic)}<div><b>${t}</b><span>${d}</span></div></div>`;
    this.modal(`<h2>How to play</h2><div class="helpg">
      ${row('spark', 'Light one firework', 'Tap a firework to light it. It bursts and lights every firework inside its <b class="t-k">reach</b>. Those light theirs, and so on. Hover or tap first to preview the reach.')}
      ${row('heat', 'Sparks × Heat', 'Every burst adds <b class="t-s">Sparks</b> and <b class="t-h">Heat</b>. When the chain ends, your score is <b class="t-s">Sparks</b> × <b class="t-h">Heat</b>. Long chains grow fast!')}
      ${row('hand', 'Moves', 'Drag fireworks into reach before you light them. You get a few <b class="t-v">Moves</b> per act.')}
      ${row('rocket', 'Launches & targets', 'Reach the target within your <b class="t-l">Launches</b> to clear the act. Unused launches pay <b class="t-m">$1</b> each.')}
      ${row('star', 'Grand Finale', 'Burst <b class="t-k">every</b> firework in the sky with one launch for <b class="t-x">×2 Heat</b>.')}
      ${row('stars', 'Combos', '3+ bursts of the same colour in a row: <b class="t-k">STREAK</b>. All four colours in one launch: <b class="t-k">RAINBOW</b>.')}
      ${row('ticket', 'Catalysts', 'Bought at the Bazaar, they trigger <b class="t-k">left to right</b>. Drag to reorder: put <b class="t-h">+Heat</b> before <b class="t-x">×Heat</b>!')}
      ${row('crown', 'Bosses', 'Every third act is a Finale with a boss that twists the rules. Read it before you start.')}
    </div><div class="btns"><button class="btn primary" data-act="close">Got it</button></div>`, 'help');
  }
  confirm(text, act) { this.modal(`<h2>${esc(text)}</h2><div class="btns"><button class="btn ghost" data-act="close">Cancel</button><button class="btn primary danger" data-act="${act}">Confirm</button></div>`, 'confirm'); }
  settings() {
    const s = Save.p.settings; const sl = (k, label, ic) => `<label class="set">${icon(ic)}<span>${label}</span><input type="range" min="0" max="1" step="0.05" value="${s[k]}" data-set="${k}"></label>`; const tg = (k, label, ic, help) => `<button class="set tog${s[k] ? ' on' : ''}" data-act="toggle" data-k="${k}">${icon(ic)}<span>${label}<small>${help}</small></span><i></i></button>`;
    this.modal(`<h2>Settings</h2><div class="sets">${sl('sfx', 'Sound effects', 'speaker')}${sl('music', 'Music', 'note')}${tg('reaches', 'Show reaches on hover', 'eye', 'Preview where each firework reaches')}${tg('fast', 'Fast chains', 'fast', 'Chains play 1.6× faster')}${tg('lowFx', 'Low effects', 'bolt', 'Fewer particles, for older devices')}${tg('cbMarks', 'Colour-blind shapes', 'shield', '▲ Crimson · ■ Amber · ● Azure · ◆ Jade')}</div>
      <div class="btns"><button class="btn ghost danger sm" data-act="reset">Reset progress</button><button class="btn" data-act="help">${icon('info')}<span>How to play</span></button><button class="btn primary" data-act="close">Done</button></div><div class="credits">Fonts: Lilita One &amp; Rubik (SIL Open Font License). Everything else is procedural.</div>`, 'settings');
    this.modalEl.querySelectorAll('input[data-set]').forEach((el) => el.addEventListener('input', () => this.app.act('set', { k: el.dataset.set, v: +el.value })));
  }
  daily() { const d = dayNumber(); const p = Save.p.daily; const done = p.day === d && p.done; this.modal(`<div class="burst-h">DAILY SHOW #${d % 10000}</div><div class="sub">Everyone on Earth gets the same crate, skies and shops today. How far can you go?</div><div class="drules"><div>${icon('keg')} Classic Crate · Warm</div><div>${icon('calendar')} New show every day</div><div>${icon('trophy')} ${done ? `Today's best: <b>Night ${p.night}</b>` : 'Play as often as you like, your best counts'}</div></div><div class="btns"><button class="btn ghost" data-act="close">Back</button><button class="btn big primary" data-act="daily-start">${icon('play')}<span>${done ? 'Play again' : 'Start'}</span></button></div>`, 'daily'); }
  collection(tab = 'cats') {
    const un = Save.unlockedSet(); const seen = Save.p.seen; let body = '';
    if (tab === 'cats') body = `<div class="grid">${CATALYSTS.map((d) => { const locked = LOCKED.has('cat:' + d.id) && !un.has('cat:' + d.id); if (locked) { const a = ACHIEVEMENTS.find((x) => (x.unlock || []).includes('cat:' + d.id)); return `<div class="card cat locked"><div class="ci"><div class="medal">${icon('lock')}</div><div class="nm">???</div></div><div class="lockhint">${esc(a ? a.desc : '')}</div></div>`; } if (!seen[d.id]) return `<div class="card cat unseen r${d.rarity}"><div class="ci"><div class="medal">${icon('star')}</div><div class="nm">Not found yet</div></div></div>`; return this.catHTML(d.id, { tip: true }); }).join('')}</div>`;
    else if (tab === 'shells') body = `<div class="grid shells">${SHELL_IDS.map((t, i) => { const locked = LOCKED.has('shell:' + t) && !un.has('shell:' + t); const s = { type: t, color: ['crimson', 'amber', 'azure', 'jade'][i % 4] }; return locked ? `<div class="sinfo locked">${icon('lock')}<b>???</b><span>${esc((ACHIEVEMENTS.find((x) => (x.unlock || []).includes('shell:' + t)) || {}).desc || '')}</span></div>` : `<div class="sinfo">${this.shellHTML(s)}<b>${SHELLS[t].name}</b><span>${rich(shellStats(s, null))}</span></div>`; }).join('')}</div><div class="enhs">${Object.entries(ENH).map(([k, e]) => `<div class="sinfo sm">${this.shellHTML({ type: 'peony', color: 'azure', enh: k })}<b>${e.name}</b><span>${rich(e.desc)}</span></div>`).join('')}</div>`;
    else if (tab === 'bosses') body = `<div class="grid bosses">${[...BOSSES, ...FINAL_BOSSES].map((b) => `<div class="binfo${b.final ? ' final' : ''}">${icon(b.icon)}<b>${esc(b.name)}</b><span>${esc(b.desc)}</span></div>`).join('')}</div>`;
    else body = `<div class="grid achs">${ACHIEVEMENTS.map((a) => { const got = !!Save.p.ach[a.id]; return `<div class="ainfo${got ? ' got' : ''}">${icon(got ? 'trophy' : 'lock')}<b>${esc(a.name)}</b><span>${esc(a.desc)}</span>${a.unlock ? `<em>${a.unlock.map(unlockName).join(', ')}</em>` : ''}<i>+${a.dust} ${icon('spark')}</i></div>`; }).join('')}</div>`;
    const tabs = [['cats', 'Catalysts'], ['shells', 'Shells'], ['bosses', 'Bosses'], ['ach', 'Achievements']].map(([k, l]) => `<button class="tab${tab === k ? ' on' : ''}" data-act="ctab" data-t="${k}">${l}</button>`).join('');
    const found = CATALYSTS.filter((d) => seen[d.id]).length;
    this.modal(`<h2>Collection</h2><div class="sub">${found}/${CATALYSTS.length} catalysts found · ${Object.keys(Save.p.ach).length}/${ACHIEVEMENTS.length} achievements</div><div class="tabs">${tabs}</div><div class="cbody">${body}</div><div class="btns"><button class="btn primary" data-act="close">Close</button></div>`, 'collection');
  }
  locker(tab = 'theme') {
    const p = Save.p; const items = COSMETICS.filter((c) => c.kind === tab).map((c) => { const own = !!p.owned[c.id]; const eq = p.equip[c.kind] === c.id; const ach = c.achievement ? ACHIEVEMENTS.find((a) => a.id === c.achievement) : null;
      return `<div class="cosm${eq ? ' eq' : ''}${own ? ' own' : ''}"><div class="sw sw-${c.id}"></div><b>${esc(c.name)}</b>${eq ? '<span class="eqd">Equipped</span>' : own ? `<button class="btn sm" data-act="equip" data-id="${c.id}">Equip</button>` : ach ? `<span class="lockd">${icon('lock')} ${esc(ach.name)}</span>` : `<button class="btn sm primary" data-act="buy-cosm" data-id="${c.id}" ${p.dust < c.price ? 'disabled' : ''}>${icon('spark')} ${c.price}</button>`}</div>`; }).join('');
    const tabs = [['theme', 'Skies'], ['trail', 'Rocket Trails'], ['burst', 'Peony Shapes']].map(([k, l]) => `<button class="tab${tab === k ? ' on' : ''}" data-act="ltab" data-t="${k}">${l}</button>`).join('');
    const adLeft = Save.adDustLeft();
    this.modal(`<h2>Pyro Locker</h2><div class="sub">Cosmetics only — they never change the game. Stardust comes from playing.</div><div class="dustbal">${icon('spark')} <b>${p.dust}</b> Stardust ${this.app.adsOn() && adLeft > 0 ? `<button class="btn sm" data-act="dust-ad">${icon('play')} +25 (ad) · ${adLeft} left today</button>` : ''}</div><div class="tabs">${tabs}</div><div class="cgrid">${items}</div><div class="btns"><button class="btn primary" data-act="close">Close</button></div>`, 'locker');
  }
  crate(run) {
    const a = run.act; const inPile = a ? new Set(a.pile) : null; const onSky = a ? new Set(a.sky.shells.map((s) => s.cid)) : null;
    const groups = {}; for (const c of run.crate) { const k = c.type; (groups[k] = groups[k] || []).push(c); }
    const body = SHELL_IDS.filter((t) => groups[t]).map((t) => `<div class="cgroup"><div class="cg-h">${this.shellHTML({ type: t, color: 'amber' }, 'mini')}<b>${SHELLS[t].name}</b><span>Lv ${run.formulas[t] || 1} · ${groups[t].length}</span></div><div class="cg-s">${groups[t].map((c) => `<span class="cs ${a ? (inPile.has(c.id) ? '' : onSky.has(c.id) ? 'sky' : 'used') : ''}">${this.shellHTML(c, 'tiny')}</span>`).join('')}</div></div>`).join('');
    this.modal(`<h2>Your Crate</h2><div class="sub">${run.crate.length} shells${a ? ` · ${a.pile.length} left to draw this act` : ''}</div><div class="crate">${body}</div><div class="btns"><button class="btn primary" data-act="close">Close</button></div>`, 'cratem');
  }
}
export function shellStats(s, run) {
  const d = SHELLS[s.type]; const lv = run ? run.formulas[s.type] || 1 : 1; const sp = d.sparks + (lv - 1) * d.lv[0];
  const heat = d.xheat ? `{x:×${(d.xheat + (lv - 1) * d.lv[1]).toFixed(1)} Heat}` : `{h:+${d.heat + (lv - 1) * d.lv[1]} Heat}`;
  return `{s:+${sp} Sparks} ${heat}${lv > 1 ? ` {d:(Lv ${lv})}` : ''}. ${d.desc}${s.enh ? ' ' + ENH[s.enh].desc : ''}`;
}
export function unlockName(u) { const [k, id] = u.split(':'); if (k === 'cat') return CAT[id] ? CAT[id].name : id; if (k === 'shell') return SHELLS[id].name + ' shells'; if (k === 'launcher') return LAUNCHER[id].name; if (k === 'stake') return 'Heat level ' + STAKES[+id].name; if (k === 'cosm') return 'a cosmetic'; return u; }
