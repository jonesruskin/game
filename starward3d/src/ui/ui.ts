// The interface: HUD, objective card, building panels, shop, bot roster, world-anchored bubbles, placement bar,
// reward modals and the colony customiser. Plain DOM over the 3D canvas; actions are data-a attributes.
import { $, $$, esc, fmt, fmtTime, clamp } from '../core/util';
import * as G from '../core/game';
import { State, Item, BotRec } from '../core/state';
import { BUILDINGS, SHOP_ORDER, bayCapacity, bayLimit, fabLimit, CC_REQ, RECIPES, landCost, landLevel, PLOT, assemblySlots, helperSlots } from '../data/buildings';
import { SPECIES, SPECIES_ORDER } from '../data/species';
import { ELEMENTS } from '../data/elements';
import { RARITIES } from '../data/rarities';
import { xpNeed, STEPS } from '../data/progress';
import { N } from '../render/island';
import { emblemPath } from '../render/models';
import type { App } from '../main';
import { CrewUI } from './crew';
import { DailyUI } from './daily';
import { ArenaUI } from './arena';
import * as AR from '../core/arena';
import * as C from '../core/crew';
import { CORE_ELEMENTS } from '../data/elements';
import { RARITY_ORDER } from '../data/rarities';
const IC = { credits: '<span class="ic cr">C</span>', cells: '<span class="ic ce">⚡</span>', dm: '<span class="ic dm">◆</span>' } as Record<string, string>;
const cost = (c: Record<string, number>, s?: State) => Object.entries(c).filter(([, n]) => n > 0).map(([r, n]) => `<span class="cost ${s && (s.res as any)[r] < n ? 'short' : ''}">${IC[r] || ''}${fmt(n)}</span>`).join(' ');
const elPills = (els: string[]) => `<span class="els">${els.map((e) => `<span class="el" style="background:${ELEMENTS[e].color}" title="${ELEMENTS[e].name}">${ELEMENTS[e].glyph}</span>`).join('')}</span>`;
const STARTER_BAYS = CORE_ELEMENTS;
const PAINTS = [['#e9eef5', '#22c7e8'], ['#f4efe6', '#ff7a3c'], ['#dfe7d8', '#4fcf5a'], ['#2e3644', '#ffd23a'], ['#f2e8f7', '#b06dff'], ['#e6f1ff', '#2f6bff'], ['#3b2f2f', '#ff4f6a'], ['#fff6dc', '#c9902a']];
const BANNER_BG = ['#1b6fd8', '#d83a3a', '#1f9c5a', '#7a3fd6', '#e08a1a', '#14202e', '#e6e6ea', '#0fb3c9'];
const EMBLEMS = ['star', 'planet', 'bolt', 'gear', 'rocket', 'circle'];
export class UI {
  sel: string | null = null; selBot: string | null = null; crew: CrewUI; daily: DailyUI; arena: ArenaUI; tab = 'bays'; over: '' | 'shop' | 'bots' | 'custom' | 'settings' | 'dex' | 'daily' | 'arena' = ''; private bubbles = new Map<string, HTMLElement>(); private lastRes = { credits: 0, cells: 0, dm: 0 }; private panelKey = ''; private tick = 0;
  constructor(public app: App) { this.crew = new CrewUI(this); this.daily = new DailyUI(this); this.arena = new ArenaUI(this);
    document.addEventListener('click', (e) => { const t = (e.target as HTMLElement).closest('[data-a]') as HTMLElement | null; if (t) { e.stopPropagation(); this.act(t.dataset.a!, t); } });
    document.addEventListener('input', (e) => { const t = e.target as HTMLInputElement; if (t.dataset.set) this.app.setSetting(t.dataset.set, t.type === 'range' ? +t.value : t.value); if (t.id === 'cname') { this.s.name = t.value.slice(0, 24) || 'New Haven'; this.renderHud(); } });
    this.renderHud(); this.renderNav(); this.renderObj();
  }
  get s() { return this.app.s; } get world() { return this.app.world; }
  // ---------------- HUD ----------------
  renderHud() { const s = this.s; const p = (s.xp / G.xpNeedOf(s)) * 100;
    $('#hud').innerHTML = `<div class="lvl" title="Commander level"><div class="badge" style="--p:${p}%"><b>${s.lvl}</b></div><div class="nm"><b>${esc(s.name)}</b><i>${fmt(s.xp)} / ${fmt(G.xpNeedOf(s))} XP</i></div></div>
      <div class="res" id="r-credits">${IC.credits}<span class="v">${fmt(s.res.credits)}</span></div><div class="res" id="r-cells">${IC.cells}<span class="v">${fmt(s.res.cells)}</span></div><div class="res" id="r-dm">${IC.dm}<span class="v">${fmt(s.res.dm)}</span></div>
      <div class="sp"></div><span id="dailyHud" class="row" style="gap:6px;flex-wrap:nowrap">${this.daily.hudHTML()}</span><button class="ibtn" data-a="settings" title="Settings">⚙</button>`; }
  private updHud() { const s = this.s; for (const r of ['credits', 'cells', 'dm'] as const) { const v = Math.floor(s.res[r]); if (v !== Math.floor(this.lastRes[r])) { const el = $(`#r-${r}`); if (el) { el.querySelector('.v')!.textContent = fmt(v); if (v > this.lastRes[r]) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } } this.lastRes[r] = v; } }
    const b = $('.lvl .badge') as HTMLElement; if (b) { b.style.setProperty('--p', (s.xp / G.xpNeedOf(s)) * 100 + '%'); b.querySelector('b')!.textContent = String(s.lvl); const i = $('.lvl .nm i'); if (i) i.textContent = `${fmt(s.xp)} / ${fmt(G.xpNeedOf(s))} XP`; } }
  renderNav() { $('#nav').innerHTML = `<button data-a="shop" id="n-shop"><span class="g">🛒</span>Shop</button><button data-a="bots"><span class="g">🤖</span>Crew</button><button data-a="dex"><span class="g">📖</span>Botdex</button><button data-a="arena"><span class="g">⚔</span>Arena</button><button data-a="custom"><span class="g">🎨</span>Style</button><button data-a="zoomout"><span class="g">🛰</span>Overview</button>`; }
  // ---------------- objectives ----------------
  renderObj() { const s = this.s, st = G.currentStep(s); const el = $('#obj'); if (!st) { el.classList.add('hidden'); return; } el.classList.remove('hidden'); const done = G.stepDone(s, st);
    el.classList.toggle('done', done); el.innerHTML = `<div class="t">Mission ${s.obj.i + 1} of ${STEPS.length}</div><p>${esc(st.text)}</p><div class="rw">Reward: ${cost(st.reward)}</div>${done ? '<button class="btn gold claim" data-a="claim">✓ Claim reward</button>' : ''}`; }
  // ---------------- per-frame ----------------
  private dailyKey = ''; frame() { this.tick++; this.updHud(); this.placeBubbles(); if (this.tick % 20 === 0) { const h = this.daily.hudHTML(); if (h !== this.dailyKey) { this.dailyKey = h; const el = $('#dailyHud'); if (el) el.innerHTML = h; } }
    if (this.tick % 15 === 0) { this.refreshPanel(); this.renderObjIfChanged(); if (this.over === 'shop' || this.over === 'bots') this.refreshOverCosts(); } }
  private objKey = ''; renderObjIfChanged() { const st = G.currentStep(this.s); const k = (st ? st.id : '-') + (st && G.stepDone(this.s, st) ? 1 : 0); if (k !== this.objKey) { this.objKey = k; this.renderObj(); } }
  // bubbles over buildings: credits waiting, cells ready, timers, idle fabricators, land for sale
  private placeBubbles() { const s = this.s, w = this.world, seen = new Set<string>(); const root = $('#bubbles');
    const put = (key: string, at: { x: number; y: number; z: number } | null, html: string, cls: string, act?: string, id?: string) => { if (!at) return; seen.add(key); let el = this.bubbles.get(key);
      if (!el) { el = document.createElement('div'); el.className = 'bub'; if (act) { el.dataset.a = act; if (id) el.dataset.id = id; } root.appendChild(el); this.bubbles.set(key, el); }
      if (el.dataset.h !== html + cls) { el.innerHTML = html; el.className = 'bub ' + cls; el.dataset.h = html + cls; }
      const p = w.project(at as any); el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.style.display = p.vis && !w.ghost && w.mode === 'island' ? '' : 'none'; };
    for (const it of s.isl.items) { const top = w.topOf(it.id); const job = G.jobOf(s, it.id, 'build');
      if (job) { const left = (job.end - Date.now()) / 1000, f = clamp(1 - (job.end - Date.now()) / (job.end - job.start)); put('t' + it.id, top, `<span>${left > 0 ? fmtTime(left) : 'Done!'}</span><div class="bar"><i style="width:${f * 100}%"></i></div>`, 'timer', 'select', it.id); continue; }
      if (it.t === 'bay') { const n = Math.floor(s.bay[it.id] || 0); if (n >= 1) put('c' + it.id, top, `${IC.credits}${fmt(n)}`, n >= G.bayCap(it) * 0.98 ? 'full' : '', 'collect', it.id); }
      if (it.t === 'fab') { const r = s.ready[it.id], cj = G.jobOf(s, it.id, 'craft');
        if (r) put('r' + it.id, top, `${IC.cells}+${fmt(r.cells)}`, 'ready', 'harvest', it.id);
        else if (cj) { const f = clamp(1 - (cj.end - Date.now()) / (cj.end - cj.start)); put('t' + it.id, top, `<span>${fmtTime((cj.end - Date.now()) / 1000)}</span><div class="bar cell"><i style="width:${f * 100}%"></i></div>`, 'timer', 'select', it.id); }
        else if (it.lvl > 0) put('i' + it.id, top, `${IC.cells}<span>Idle</span>`, '', 'select', it.id); }
      if (it.t === 'assembly' && it.lvl > 0) { const rd = s.cores.filter((c) => c.state === 'ready').length; if (rd) put('a' + it.id, top, `🤖 <span>${rd} ready!</span>`, 'ready', 'select', it.id); }
      if (it.t === 'fusion' && it.lvl > 0) { const fj = G.jobOf(s, it.id, 'fuse'); if (fj) { const f = clamp(1 - (fj.end - Date.now()) / (fj.end - fj.start)); put('t' + it.id, top, `<span>🧬 ${fmtTime((fj.end - Date.now()) / 1000)}</span><div class="bar"><i style="width:${f * 100}%"></i></div>`, 'timer', 'select', it.id); }
        else if (s.bots.filter((b) => b.lvl >= C.FUSE_LEVEL).length >= 2) put('i' + it.id, top, `🧬 <span>Fuse</span>`, '', 'select', it.id); } }
    for (let px = 0; px < 5; px++) for (let pz = 0; pz < 5; pz++) { const k = `${px},${pz}`; if (G.plotState(s, k) !== 'buyable') continue; const at = { x: px * PLOT + PLOT / 2 - N / 2, y: 0.4, z: pz * PLOT + PLOT / 2 - N / 2 };
      const st = G.currentStep(s); if (s.lvl >= landLevel(s.landBought) && (w.cam.tdist > 40 || (st && st.kind === 'land'))) put('p' + k, at, `＋ ${IC.credits}${fmt(landCost(s.landBought))}`, 'plot', 'plot', k); }
    for (const [k, el] of this.bubbles) if (!seen.has(k)) { el.remove(); this.bubbles.delete(k); } }
  // ---------------- selection + panels ----------------
  select(id: string | null) { this.sel = id; this.selBot = null; this.world.select(id, this.s); this.panelKey = ''; this.renderPanel(); }
  selectBot(id: string | null) { this.sel = null; this.selBot = id; this.world.select(null); this.panelKey = ''; this.renderPanel(); }
  private panelSig() { const s = this.s; if (this.selBot) { const b = s.bots.find((x) => x.id === this.selBot); return b ? ['bot', b.id, b.lvl, b.fed, b.post, b.bay, b.stored, b.nick].join('|') : ''; }
    const it = this.sel ? G.item(s, this.sel) : null; if (!it) return ''; const j = s.jobs.filter((x) => x.item === it.id).map((x) => x.id + x.kind).join();
    return [it.id, it.lvl, it.r, j, it.t === 'bay' ? G.botsIn(s, it.id).map((b) => b.id + b.lvl + b.fed + (b.post || '')).join() : '', s.ready[it.id] ? 1 : 0, s.lvl, G.ccLevel(s), G.buildersBusy(s), C.helpersAt(s, it.id).map((b) => b.id).join(), it.t === 'assembly' ? s.cores.map((c) => c.id + c.state).join() : '', this.crew.fuseA, this.crew.fuseB].join('|'); }
  refreshPanel() { if (!this.sel && !this.selBot) return; const sig = this.panelSig(); if (sig !== this.panelKey) { this.renderPanel(); return; } const s = this.s; if (this.selBot) { $$('#panel [data-cost]').forEach((e) => { const [r, n] = e.dataset.cost!.split(':'); e.classList.toggle('short', (s.res as any)[r] < +n); }); return; } const it = G.item(s, this.sel!); if (!it) return;
    $$('#panel [data-left]').forEach((e) => { const j = s.jobs.find((x) => x.id === e.dataset.left); if (j) e.textContent = fmtTime((j.end - Date.now()) / 1000); });
    $$('#panel [data-bar]').forEach((e) => { const j = s.jobs.find((x) => x.id === e.dataset.bar); if (j) e.style.width = clamp(1 - (j.end - Date.now()) / (j.end - j.start)) * 100 + '%'; });
    $$('#panel [data-dm]').forEach((e) => { const j = s.jobs.find((x) => x.id === e.dataset.dm); if (j) { const c = G.dmCost((j.end - Date.now()) / 1000); e.innerHTML = c ? `${IC.dm}${c} Finish now` : 'Finish (free)'; } });
    if (it.t === 'bay') { const bar = $('#panel .bar.gold i') as HTMLElement, v = $('#panel #bayv'); const n = s.bay[it.id] || 0; if (bar) bar.style.width = (n / G.bayCap(it)) * 100 + '%'; if (v) v.textContent = `${fmt(n)} / ${fmt(G.bayCap(it))}`; }
    $$('#panel [data-cost]').forEach((e) => { const [r, n] = e.dataset.cost!.split(':'); e.classList.toggle('short', (s.res as any)[r] < +n); }); }
  renderPanel() { const el = $('#panel'); const s = this.s; const bot = this.selBot ? s.bots.find((x) => x.id === this.selBot) : null; if (bot) { el.classList.remove('hidden'); this.panelKey = this.panelSig(); el.innerHTML = this.crew.botPanel(bot); return; }
    const it = this.sel ? G.item(s, this.sel) : null; if (!it) { el.classList.add('hidden'); return; } el.classList.remove('hidden'); this.panelKey = this.panelSig();
    const d = BUILDINGS[it.t]; const job = G.jobOf(s, it.id, 'build'); let h = `<button class="ibtn x" data-a="deselect">✕</button><h2>${esc(it.t === 'bay' ? `${ELEMENTS[it.el!].name} Bay` : d.name)}</h2><div class="sub">${d.cat === 'decor' ? 'Decoration' : `Level ${it.lvl} / ${G.maxLevelOf(s, it)}`}</div>`;
    if (job) { const c = G.dmCost((job.end - Date.now()) / 1000); h += `<p class="desc">${it.lvl === 0 ? 'Under construction' : `Upgrading to level ${job.lvl}`}: builder drones at work.</p><div class="bar"><i data-bar="${job.id}"></i></div><div class="row" style="margin-top:8px"><b class="grow" data-left="${job.id}"></b><button class="btn gold small" data-a="finish" data-job="${job.id}" data-dm="${job.id}">${c ? `${IC.dm}${c} Finish now` : 'Finish (free)'}</button></div>`; }
    else if (it.t === 'command') { const next = it.lvl + 1; h += `<p class="desc">${esc(d.desc)}</p><table class="stats"><tr><td>Bays allowed</td><td>${bayLimit(it.lvl)}</td></tr><tr><td>Fabricators allowed</td><td>${fabLimit(it.lvl)}</td></tr><tr><td>Max building level</td><td>${it.lvl}</td></tr><tr><td>Builder drones</td><td>${s.builders}</td></tr></table>`;
      if (it.lvl < d.max) h += `<div class="sub">Level ${next}: ${bayLimit(next)} bays · ${fabLimit(next)} fabricators · buildings to level ${next}${CC_REQ[next] > s.lvl ? ` · needs Commander level ${CC_REQ[next]}` : ''}</div>`;
      h += this.upgradeRow(it) + this.crew.helpersHTML(it) + `<div class="row" style="margin-top:8px"><button class="btn small" data-a="custom">🎨 Colony style</button><button class="btn small" data-a="move" data-id="${it.id}">✥ Move</button></div>`; }
    else if (it.t === 'arena') { const AS = AR.arena(s), lg = AR.leagueOf(AS.trophies); h += `<p class="desc">${esc(d.desc)}</p><div class="row"><b class="grow" style="color:${AR.LEAGUE_COLOR[lg]}">🏆 ${AR.LEAGUES[lg][0]} · ${fmt(AS.trophies)}</b><span class="chip">🎟 ${AS.tickets}/${AR.TICKETS}</span></div><button class="btn gold" data-a="arena" style="width:100%;margin-top:8px">⚔ Enter the Arena</button>`
        + this.upgradeRow(it, it.lvl < d.max ? `Level ${it.lvl + 1}: battle rewards +${it.lvl * 10}%` : '') + this.moveRow(it); }
    else if (it.t === 'assembly' || it.t === 'fusion') { h += (it.t === 'assembly' ? this.crew.assemblyHTML(it) : this.crew.fusionHTML(it)) + this.upgradeRow(it, it.lvl < d.max ? (it.t === 'assembly' ? `Level ${it.lvl + 1}: boots 5% faster${assemblySlots(it.lvl + 1) > assemblySlots(it.lvl) ? ', +1 pod' : ''}${helperSlots(it.lvl + 1) > helperSlots(it.lvl) ? ', +1 helper slot' : ''}` : `Level ${it.lvl + 1}: fuses 5% faster`) : '') + this.moveRow(it); }
    else if (it.t === 'bay') { const bots = G.botsIn(s, it.id), cap = bayCapacity(it.lvl), n = s.bay[it.id] || 0, rate = G.bayRate(s, it.id) * 60;
      h += `<div class="row"><div class="grow"><div class="bar gold"><i style="width:${(n / G.bayCap(it)) * 100}%"></i></div></div><b id="bayv">${fmt(n)} / ${fmt(G.bayCap(it))}</b></div><div class="row" style="margin:6px 0"><span class="grow sub">${IC.credits} ${fmt(rate)} per minute · ${bots.length}/${cap} bots</span><button class="btn gold small" data-a="collect" data-id="${it.id}" ${n >= 1 ? '' : 'disabled'}>Collect</button></div>`;
      h += `<div class="bots">${bots.map((b) => this.botCard(b)).join('') || '<p class="desc">No bots yet. Recruit one in the Shop.</p>'}</div>`;
      if (bots.length < cap) h += `<button class="btn small" style="margin-top:8px;width:100%" data-a="shop" data-tab="bots">＋ Recruit a ${ELEMENTS[it.el!].name} bot</button>`;
      h += this.upgradeRow(it, it.lvl < d.max ? `Level ${it.lvl + 1}: holds ${fmt(G.bayCapAt(it.lvl + 1))} credits${bayCapacity(it.lvl + 1) > cap ? `, ${bayCapacity(it.lvl + 1)} bots` : ''}` : '') + this.moveRow(it); }
    else if (it.t === 'fab') { const r = s.ready[it.id], cj = G.jobOf(s, it.id, 'craft');
      if (r) h += `<div class="row"><span class="grow desc">${fmt(r.cells)} Power Cells are ready.</span><button class="btn green" data-a="harvest" data-id="${it.id}">${IC.cells} Harvest</button></div>`;
      else if (cj) { const rec = RECIPES[cj.recipe || 0]; const c = G.dmCost((cj.end - Date.now()) / 1000); h += `<p class="desc">Printing <b>${esc(rec.name)}</b></p><div class="bar cell"><i data-bar="${cj.id}"></i></div><div class="row" style="margin-top:8px"><b class="grow" data-left="${cj.id}"></b><button class="btn gold small" data-a="finish" data-job="${cj.id}" data-dm="${cj.id}">${c ? `${IC.dm}${c} Finish now` : 'Finish (free)'}</button></div>`; }
      else h += `<p class="desc">Pick a recipe. Longer recipes make more cells per credit: choose one that finishes when you'll be back.</p><div class="recipes">${G.recipesFor(it).map((rc) => `<div class="rec ${rc.open ? '' : 'locked'}"><b>${esc(rc.name)}</b><span class="out">⚡${fmt(rc.out)}</span><span class="sub">${fmtTime(rc.sec)}</span>${rc.open ? `<button class="btn small" data-a="craft" data-id="${it.id}" data-r="${rc.i}"><span class="cost" data-cost="credits:${rc.cost}">${IC.credits}${fmt(rc.cost)}</span></button>` : `<span class="why">Level ${rc.lvl}</span>`}</div>`).join('')}</div>`;
      h += this.upgradeRow(it, it.lvl < d.max ? `Level ${it.lvl + 1}: +10% cells${RECIPES.some((rc) => rc.lvl === it.lvl + 1) ? ', a new recipe' : ''}` : '') + this.crew.helpersHTML(it) + this.moveRow(it); }
    else { h += `<p class="desc">${esc(d.desc)}</p><div class="row"><button class="btn small" data-a="move" data-id="${it.id}">✥ Move</button><button class="btn small" data-a="sell" data-id="${it.id}">Sell (${IC.credits}${fmt(Math.floor(d.buildCost(0) * 0.5))})</button></div>`; }
    el.innerHTML = h; }
  private moveRow(it: Item) { return `<div class="row" style="margin-top:8px"><button class="btn small" data-a="move" data-id="${it.id}">✥ Move</button></div>`; }
  private upgradeRow(it: Item, note = '') { const s = this.s, d = BUILDINGS[it.t]; if (it.lvl >= d.max) return '<p class="sub">Maximum level.</p>'; const c = G.canUpgrade(s, it);
    return `${note ? `<div class="sub">${note}</div>` : ''}<div class="row" style="margin-top:8px"><span class="grow">${c.cost ? `<span class="cost ${s.res.credits < c.cost ? 'short' : ''}" data-cost="credits:${c.cost}">${IC.credits}${fmt(c.cost)}</span> · ${fmtTime(c.time || 0)}` : ''}</span><button class="btn gold" data-a="upgrade" data-id="${it.id}" ${c.ok ? '' : 'disabled'}>⬆ Upgrade</button></div>${c.ok ? '' : `<p class="why">${esc(c.why || '')}</p>`}`; }
  botCard(b: BotRec, withBay = false) { const s = this.s, d = SPECIES[b.sp], fc = G.feedCost(b.lvl); const bay = withBay && b.bay ? G.item(s, b.bay) : null;
    return `<div class="botc"><div class="pic" data-a="selBot" data-bot="${b.id}" style="cursor:pointer;background:radial-gradient(circle at 50% 40%, ${ELEMENTS[d.el[0]].color}55, transparent 70%)"><img src="${this.app.studio.bot(b.sp)}" alt=""></div>
      <div><b data-a="selBot" data-bot="${b.id}" style="cursor:pointer">${esc(b.nick || d.name)}</b> ${elPills(d.el)}<div class="meta"><span class="rar" style="color:${RARITIES[d.rarity].color}">${RARITIES[d.rarity].name}</span> · Level ${b.lvl}<span class="pips">${[0, 1, 2, 3].map((i) => `<i class="${i < b.fed ? 'on' : ''}"></i>`).join('')}</span></div><div class="meta">${b.post ? '🛠 helping' : b.stored ? '❄ stored' : `${IC.credits} ${fmt(G.botEarn(b))}/min`}${bay ? ` · ${ELEMENTS[bay.el!].name} Bay` : ''}</div></div>
      ${b.lvl < G.BOT_MAX ? `<button class="btn small green" data-a="feed" data-bot="${b.id}"><span class="cost" data-cost="cells:${fc}">${IC.cells}${fmt(fc)}</span></button>` : '<span class="sub">MAX</span>'}</div>`; }
  // ---------------- overlays ----------------
  openOver(kind: UI['over'], tab?: string) { this.over = kind; if (tab) this.tab = tab; this.select(null); this.renderOver(); this.app.platform.gameplayStop(); }
  closeOver() { this.over = ''; $('#over').classList.add('hidden'); this.app.platform.gameplayStart(); }
  renderOver() { const el = $('#over'); el.classList.remove('hidden'); const s = this.s;
    if (this.over === 'shop') { const tabs = [['bays', 'Bays'], ['bots', 'Bots'], ['buildings', 'Buildings'], ['decor', 'Decor']];
      let body = '';
      if (this.tab === 'bays') body = STARTER_BAYS.map((e) => { const c = G.canBuild(s, 'bay', e); const has = G.itemsOf(s, 'bay').filter((b) => b.el === e).length; return this.shopCard(this.app.studio.building('bay', 1, e, this.world.look), `${ELEMENTS[e].name} Bay`, `${ELEMENTS[e].blurb} ${has ? `You have ${has}.` : ''}`, c, `data-a="buyB" data-t="bay" data-el="${e}"`, elPills([e])); }).join('');
      else if (this.tab === 'bots') body = SPECIES_ORDER.filter((k) => SPECIES[k].price).map((k) => { const d = SPECIES[k], c = G.canRecruit(s, k); const owned = s.bots.filter((b) => b.sp === k).length;
        return this.shopCard(this.app.studio.bot(k), d.name, d.desc + (d.rarity !== 'standard' ? ` Boots in the Assembly Bay (${fmtTime(RARITIES[d.rarity].assembly * 0.5)}).` : ''), c, `data-a="recruit" data-sp="${k}"`, `${elPills(d.el)} <span class="rar" style="color:${RARITIES[d.rarity].color}">${RARITIES[d.rarity].name}</span> · ${fmt(G.botEarn({ sp: k, lvl: 1 } as BotRec))}/min${owned ? ` · owned ${owned}` : ''}${s.dex[k] ? '' : ' · <b style="color:#ffd36a">new</b>'}`, (d.unlock || 1) > s.lvl); }).join('');
      else if (this.tab === 'buildings') body = ['fab', 'assembly', 'fusion'].map((t) => { const c = G.canBuild(s, t); return this.shopCard(this.app.studio.building(t, 1, undefined, this.world.look), BUILDINGS[t].name, BUILDINGS[t].desc, c, `data-a="buyB" data-t="${t}"`, t === 'fab' ? `${G.itemsOf(s, t).length}/${fabLimit(G.ccLevel(s))} built` : G.itemsOf(s, t).length ? 'Built' : `Unlocks at Commander level ${BUILDINGS[t].unlock}`, BUILDINGS[t].unlock > s.lvl); }).join('');
      else body = [...(s.stats.decor_arch ? ['arch'] : []), ...SHOP_ORDER.filter((t) => BUILDINGS[t].cat === 'decor')].map((t) => { const c = G.canBuild(s, t); return this.shopCard(this.app.studio.building(t, 1, undefined, this.world.look), BUILDINGS[t].name, BUILDINGS[t].desc, c, `data-a="buyB" data-t="${t}"`, '', BUILDINGS[t].unlock > s.lvl); }).join('');
      el.innerHTML = `<div class="head"><h1>Shop</h1><div class="res">${IC.credits}<span>${fmt(s.res.credits)}</span></div><button class="ibtn" data-a="close">✕</button></div><div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${this.tab === k ? 'on' : ''}" data-a="tab" data-tab="${k}">${n}</button>`).join('')}</div><div class="body"><div class="grid">${body}</div></div>`; }
    else if (this.over === 'bots') { const byRate = [...s.bots].sort((a, b) => G.botEarn(b) - G.botEarn(a)); const total = s.bots.reduce((a, b) => a + G.botEarn(b), 0);
      const waiting = s.cores.length ? `<div class="botc" style="grid-template-columns:54px 1fr auto;border-color:var(--gold)"><div style="font-size:30px;text-align:center">🤖</div><div><b>${s.cores.length} core${s.cores.length > 1 ? 's' : ''} waiting</b><div class="meta">${s.cores.map((c) => `<span style="color:${RARITIES[SPECIES[c.sp].rarity].color}">●</span>`).join(' ')} ${G.itemsOf(s, 'assembly').some((i) => i.lvl > 0) ? 'in the Assembly Bay' : 'Build the Assembly Bay (Commander level 4) to boot them'}</div></div><span></span></div>` : '';
      el.innerHTML = `<div class="head"><h1>Your crew</h1><span class="sub">${s.bots.length} bots · ${IC.credits} ${fmt(total)}/min</span><button class="ibtn" data-a="close">✕</button></div><div class="body"><div class="bots" style="max-width:640px;margin:0 auto">${waiting}${byRate.map((b) => this.botCard(b, true)).join('')}</div></div>`; }
    else if (this.over === 'custom') { el.innerHTML = this.customHTML(); }
    else if (this.over === 'dex') { el.innerHTML = this.crew.dexHTML(); }
    else if (this.over === 'daily') { el.innerHTML = this.daily.overHTML(); }
    else if (this.over === 'arena') { el.innerHTML = this.arena.overHTML(); }
    else if (this.over === 'settings') { const st = s.settings; el.innerHTML = `<div class="head"><h1>Settings</h1><button class="ibtn" data-a="close">✕</button></div><div class="body"><div class="card" style="max-width:420px;margin:0 auto;gap:12px">
      <label>Sound effects <input type="range" min="0" max="1" step="0.05" value="${st.sfx}" data-set="sfx" style="width:100%"></label><label>Music <input type="range" min="0" max="1" step="0.05" value="${st.music}" data-set="music" style="width:100%"></label>
      <label>Graphics <select data-set="quality" style="width:100%;padding:8px;border-radius:8px;background:#0d1a2e;color:#fff;border:1px solid var(--line)">${['auto', 'high', 'low'].map((q) => `<option ${st.quality === q ? 'selected' : ''}>${q}</option>`).join('')}</select></label>
      <p class="sub">Starward 3D · version ${this.app.version} · ${__TARGET__} build. Your colony runs in real time, even while you are away.</p><button class="btn" data-a="reset">Reset progress</button></div></div>`; } }
  private shopCard(img: string, name: string, desc: string, c: G.Check, act: string, meta = '', locked = false) {
    return `<div class="card ${locked ? 'locked' : ''}"><div class="thumb"><img src="${img}" alt=""></div><b>${esc(name)}</b>${meta ? `<div class="sub" style="margin:0">${meta}</div>` : ''}<p class="desc">${esc(desc)}</p>
      <button class="btn ${c.ok ? 'gold' : ''} small" ${act} ${c.ok ? '' : 'disabled'}>${locked ? '🔒 ' : ''}${c.cost !== undefined ? `<span class="cost" data-cost="credits:${c.cost}">${IC.credits}${fmt(c.cost)}</span>` : 'Free'}</button>${c.ok ? '' : `<span class="why">${esc(c.why || '')}</span>`}</div>`; }
  private refreshOverCosts() { $$('#over [data-cost]').forEach((e) => { const [r, n] = e.dataset.cost!.split(':'); e.classList.toggle('short', (this.s.res as any)[r] < +n); }); }
  customHTML() { const s = this.s; const ban = this.bannerSVG(s.banner);
    return `<div class="head"><h1>Colony style</h1><button class="ibtn" data-a="close">✕</button></div><div class="body"><div class="card" style="max-width:520px;margin:0 auto;gap:12px">
      <label class="ox">Colony name<input id="cname" value="${esc(s.name)}" maxlength="24" style="width:100%;margin-top:6px;padding:10px;border-radius:10px;border:1px solid var(--line);background:#0d1a2e;color:#fff;font:600 16px Barlow"></label>
      <div><div class="ox">Paint scheme</div><div class="row" style="margin-top:6px">${PAINTS.map(([p, a], i) => `<button data-a="paint" data-i="${i}" style="width:46px;height:46px;border-radius:12px;border:2px solid ${s.paint.primary === p && s.paint.accent === a ? '#fff' : 'transparent'};background:linear-gradient(135deg, ${p} 55%, ${a} 55%)"></button>`).join('')}</div></div>
      <div><div class="ox">Banner</div><div class="row" style="margin-top:6px;align-items:flex-start"><div style="width:120px">${ban}</div><div class="grow"><div class="row">${BANNER_BG.map((c) => `<button data-a="bannerBg" data-c="${c}" style="width:30px;height:30px;border-radius:8px;background:${c};border:2px solid ${s.banner.bg === c ? '#fff' : 'transparent'}"></button>`).join('')}</div>
        <div class="row" style="margin-top:6px">${['#ffd23a', '#ffffff', '#14202e', '#ff4f6a', '#6ee7ff', '#7cf29a'].map((c) => `<button data-a="bannerFg" data-c="${c}" style="width:30px;height:30px;border-radius:50%;background:${c};border:2px solid ${s.banner.fg === c ? '#6ee7ff' : 'rgba(255,255,255,0.2)'}"></button>`).join('')}</div>
        <div class="row" style="margin-top:6px">${EMBLEMS.map((e) => `<button class="btn small ${s.banner.emblem === e ? 'gold' : ''}" data-a="emblem" data-e="${e}">${this.bannerSVG({ bg: 'transparent', fg: '#ffffff', emblem: e }, 22)}</button>`).join('')}</div></div></div></div>
      <p class="sub">Your paint scheme recolours every building's trim; your banner flies over the Command Center and on every Colony Flag. More decorations, paints and banner parts unlock as you level up.</p></div></div>`; }
  bannerSVG(b: { bg: string; fg: string; emblem: string }, size = 120) { const c = document.createElement('canvas'); c.width = 128; c.height = 80; const g = c.getContext('2d')!; if (b.bg !== 'transparent') { g.fillStyle = b.bg; g.fillRect(0, 0, 128, 80); } g.fillStyle = b.fg; g.translate(64, 40); emblemPath(g, b.emblem, 26); g.fill();
    return `<img src="${c.toDataURL()}" style="width:${size}px;height:${(size * 80) / 128}px;border-radius:6px;display:block">`; }
  // ---------------- placement bar ----------------
  renderPlace() { const el = $('#place'); const g = this.world.ghost; if (!g) { el.classList.add('hidden'); return; } el.classList.remove('hidden'); const d = BUILDINGS[g.t]; const c = g.move ? null : G.canBuild(this.s, g.t, g.el);
    el.innerHTML = `<span class="lbl">${esc(g.t === 'bay' ? `${ELEMENTS[g.el!].name} Bay` : d.name)}${c && c.cost ? ` · ${IC.credits}${fmt(c.cost)}` : ''}</span><button class="btn small" data-a="placeRot">⟳ Rotate</button><button class="btn small" data-a="placeCancel">✕</button><button class="btn green small" data-a="placeOk" ${g.ok ? '' : 'disabled'}>✓ ${g.move ? 'Place' : 'Build'}</button>`; }
  // ---------------- feedback ----------------
  toast(msg: string, cls = '') { const t = document.createElement('div'); t.className = 'toast ' + cls; t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), 2600); }
  popText(x: number, y: number, txt: string, color: string) { const p = document.createElement('div'); p.className = 'pop'; p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.color = color; p.textContent = txt; document.body.appendChild(p); setTimeout(() => p.remove(), 1100); }
  flyTo(res: 'credits' | 'cells' | 'dm', x: number, y: number, n = 6) { const target = $(`#r-${res}`); if (!target) return; const r = target.getBoundingClientRect(); for (let i = 0; i < n; i++) { const f = document.createElement('div'); f.className = 'fly'; f.innerHTML = IC[res].replace('class="ic', 'style="width:26px;height:26px" class="ic');
      f.style.left = x - 13 + (Math.random() - 0.5) * 40 + 'px'; f.style.top = y - 13 + (Math.random() - 0.5) * 30 + 'px'; document.body.appendChild(f);
      setTimeout(() => { f.style.transform = `translate(${r.left + 13 - parseFloat(f.style.left)}px, ${r.top + 13 - parseFloat(f.style.top)}px) scale(0.6)`; f.style.opacity = '0.4'; }, 30 + i * 45); setTimeout(() => f.remove(), 800 + i * 45); } }
  modal(html: string, rays = false) { const m = $('#modal'); m.innerHTML = `${rays ? '<div class="rays"></div>' : ''}<div class="box">${html}</div>`; m.classList.remove('hidden'); this.app.platform.gameplayStop(); }
  closeModal() { $('#modal').classList.add('hidden'); $('#modal').innerHTML = ''; if (!this.over) this.app.platform.gameplayStart(); }
  levelUp(lvl: number, reward: Record<string, number>, gift: any = null) { const unl = [...SPECIES_ORDER.filter((k) => SPECIES[k].unlock === lvl).map((k) => SPECIES[k].name), ...SHOP_ORDER.filter((t) => BUILDINGS[t].unlock === lvl).map((t) => BUILDINGS[t].name)];
    this.modal(`<div class="ox sub" style="letter-spacing:.2em">COMMANDER LEVEL</div><div class="big">${lvl}</div><h1>Level up!</h1><div class="rewards">${cost(reward)}</div>${gift ? `<div class="sub" style="margin:0">Milestone bonus</div>${this.daily.giftLine(gift)}` : ''}${unl.length ? `<p class="desc">Unlocked: <b>${unl.map(esc).join(', ')}</b></p>` : ''}${CC_REQ.indexOf(lvl) > 1 ? `<p class="desc">You can now upgrade the Command Center to level ${CC_REQ.indexOf(lvl)}.</p>` : ''}<button class="btn gold" data-a="closeModal" style="margin-top:8px;min-width:160px">Awesome!</button>`, true); }
  newBot(b: BotRec) { const d = SPECIES[b.sp]; const fresh = Date.now() - (this.s.dex[b.sp] || 0) < 4000 && Object.keys(this.s.dex).length > 1; const rc = RARITIES[d.rarity].color; const ri = RARITY_ORDER.indexOf(d.rarity);
    this.modal(`<div class="ox sub" style="letter-spacing:.2em;color:${rc}">${fresh ? '★ NEW SPECIES DISCOVERED ★' : 'NEW CREWMATE'}</div>${ri >= 2 ? `<div style="position:absolute;inset:0;border-radius:22px;box-shadow:inset 0 0 60px ${rc}66;pointer-events:none"></div>` : ''}<img src="${this.app.studio.bot(b.sp)}" style="width:180px;height:180px;margin:-6px auto -10px;display:block"><h1>${esc(d.name)}</h1><div>${elPills(d.el)} <span class="rar" style="color:${RARITIES[d.rarity].color}">${RARITIES[d.rarity].name}</span></div><p class="desc">${esc(d.desc)}</p><p class="sub">Earns ${IC.credits} ${fmt(G.botEarn(b))} per minute. Feed it Power Cells to level it up.</p><button class="btn gold" data-a="closeModal" style="min-width:160px">Welcome aboard!</button>`, true); }
  // ---------------- actions ----------------
  act(a: string, t: HTMLElement) { const A = this.app, s = this.s; A.audio.unlock(); if (this.crew.act(a, t) || this.daily.act(a, t) || this.arena.act(a, t)) return;
    const id = t.dataset.id || '', it = id ? G.item(s, id) : undefined;
    switch (a) {
      case 'shop': this.openOver('shop', t.dataset.tab || this.tab); A.audio.play('tap'); break;
      case 'bots': this.openOver('bots'); A.audio.play('tap'); break;
      case 'dex': this.openOver('dex'); A.audio.play('tap'); break;
      case 'custom': this.openOver('custom'); A.audio.play('tap'); break;
      case 'settings': this.openOver('settings'); A.audio.play('tap'); break;
      case 'close': this.closeOver(); A.audio.play('tap'); break;
      case 'tab': this.tab = t.dataset.tab!; this.renderOver(); A.audio.play('tap'); break;
      case 'zoomout': this.world.focus(0, 1, this.world.cam.tdist > 45 ? 30 : 58); A.audio.play('whoosh'); break;
      case 'deselect': this.select(null); this.selBot = null; this.renderPanel(); break;
      case 'select': if (id) { this.select(id); A.audio.play('tap'); } break;
      case 'collect': if (it) A.collect(it); break;
      case 'harvest': if (it) A.harvest(it); break;
      case 'craft': if (it) { const r = G.craft(s, it, +t.dataset.r!); if (r.ok) { A.audio.play('buy'); A.changed(); this.renderPanel(); } else this.deny(r.why); } break;
      case 'upgrade': if (it) { const r = G.upgrade(s, it); if (r.ok) { A.audio.play('build'); A.changed(); this.renderPanel(); } else this.deny(r.why); } break;
      case 'finish': { const j = s.jobs.find((x) => x.id === t.dataset.job); if (j && G.finishNow(s, j)) { A.audio.play('done'); A.changed(); this.renderPanel(); } else this.deny('Not enough Dark Matter'); break; }
      case 'feed': { const b = s.bots.find((x) => x.id === t.dataset.bot); if (!b) break; const r = G.feed(s, b); if (r.ok) { A.audio.play(r.lvlUp ? 'done' : 'feed'); const rc = t.getBoundingClientRect(); this.popText(rc.left + rc.width / 2, rc.top, r.lvlUp ? `Level ${b.lvl}!` : '+XP', r.lvlUp ? '#ffd36a' : '#9dff5a'); A.changed(); if (this.over === 'bots') this.renderOver(); else this.renderPanel(); } else this.deny(r.why); break; }
      case 'recruit': { const r = G.recruit(s, t.dataset.sp!) as any; if (r.ok && r.core) { A.audio.play('buy'); this.closeOver(); A.changed(); const asm = G.itemsOf(s, 'assembly')[0]; if (asm) { const c = this.world.centerOf(asm); this.world.focus(c.x, c.z); this.select(asm.id); } this.toast('The core is booting in the Assembly Bay', 'good'); break; }
        if (r.ok && r.bot) { A.audio.play('buy'); this.closeOver(); A.changed(); this.newBot(r.bot); const bay = G.item(s, r.bot.bay!); if (bay) { const c = this.world.centerOf(bay); this.world.focus(c.x, c.z); } } else this.deny(r.why); break; }
      case 'buyB': { const tt = t.dataset.t!, el = t.dataset.el; const c = G.canBuild(s, tt, el); if (!c.ok) { this.deny(c.why); break; } this.closeOver(); A.startPlacing({ t: tt, el, r: 0, x: 0, z: 0, ok: false }); break; }
      case 'move': if (it) { this.select(null); A.startPlacing({ t: it.t, el: it.el, r: it.r, x: it.x, z: it.z, move: it.id, ok: true }); } break;
      case 'sell': if (it && G.sellDecor(s, it)) { A.audio.play('buy'); this.select(null); A.changed(); } break;
      case 'placeRot': this.world.rotateGhost(); A.audio.play('tap'); break;
      case 'placeCancel': A.endPlacing(); A.audio.play('tap'); break;
      case 'placeOk': A.confirmPlacing(); break;
      case 'plot': A.askPlot(id); break;
      case 'buyPlot': { const r = G.buyPlot(s, t.dataset.k!); this.closeModal(); if (r.ok) { A.audio.play('levelup'); A.changed(); this.toast('The island grows!', 'gold'); } else this.deny(r.why); break; }
      case 'claim': { const st = G.claimStep(s); if (st) { A.audio.play('claim'); const rc = t.getBoundingClientRect(); for (const r of Object.keys(st.reward)) this.flyTo(r as any, rc.left + rc.width / 2, rc.top); A.changed(); this.renderObj(); } break; }
      case 'closeModal': this.closeModal(); A.audio.play('tap'); break;
      case 'paint': { const [p, ac] = PAINTS[+t.dataset.i!]; s.paint = { primary: p, accent: ac }; A.changed(); this.renderOver(); A.audio.play('tap'); break; }
      case 'bannerBg': s.banner = { ...s.banner, bg: t.dataset.c! }; A.changed(); this.renderOver(); A.audio.play('tap'); break;
      case 'bannerFg': s.banner = { ...s.banner, fg: t.dataset.c! }; A.changed(); this.renderOver(); A.audio.play('tap'); break;
      case 'emblem': s.banner = { ...s.banner, emblem: t.dataset.e! }; A.changed(); this.renderOver(); A.audio.play('tap'); break;
      case 'reset': if (t.dataset.sure) A.reset(); else { t.dataset.sure = '1'; t.textContent = 'Tap again to erase your colony'; } break;
    } }
  deny(why?: string) { this.toast(why || 'Not possible', 'bad'); this.app.audio.play('deny'); }
}
