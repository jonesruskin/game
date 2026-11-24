// The interface: HUD (resources and caps, energy, construction drones, the Kardashev meter), the objective card,
// bubbles over buildings, the building panel, the build shop, the research tree, goals, the Kardashev screen,
// settings, toasts and modals. Every button carries data-a; act() routes them.
import { $, $$, esc, fmt, fmtTime, clamp } from '../core/util';
import * as G from '../core/game';
import { rates, kardashev, K_MILESTONES, kTitle, bStats, collectsOf, Rates } from '../core/econ';
import { BUILDINGS, CATS, allowedCount, holdHours } from '../data/buildings';
import { TECH, BRANCHES, techCost } from '../data/research';
import { RES } from '../data/resources';
import { CHAPTERS } from '../data/objectives';
import type { App } from '../main';
import { LaunchUI } from './launch';
import { RobotsUI } from './robots';
import { SolarUI, worldIcon } from './solar';
import { DailyUI } from './daily';
import * as RB from '../core/robots';
import * as SP from '../core/space';
const HUD_RES = ['credits', 'metal', 'fuel', 'science'];
export const icon = (r: string) => `<span class="ci" style="color:${RES[r]?.color || '#fff'}">${RES[r]?.icon || ''}</span>`;
export function costHTML(cost: Record<string, number>, have?: Record<string, number>) { return `<span class="costs">${Object.entries(cost).filter(([, n]) => n > 0).map(([r, n]) => `<span class="cost ${have && (have[r] || 0) < n ? 'short' : ''}" title="${RES[r]?.name || r}">${icon(r)}${fmt(n)}</span>`).join('')}</span>`; }
export class UI {
  sel: string | null = null; over: '' | 'shop' | 'research' | 'goals' | 'launch' | 'designer' | 'robots' | 'daily' = ''; tab = 'production'; rtab = 'avail'; launch: LaunchUI; robots: RobotsUI; solar: SolarUI; daily: DailyUI;
  private bubbles = new Map<string, HTMLElement>(); private lastRes: Record<string, number> = {}; private panelKey = ''; tick = 0;
  constructor(public app: App) {
    this.launch = new LaunchUI(this); this.robots = new RobotsUI(this); this.solar = new SolarUI(this); this.daily = new DailyUI(this);
    document.addEventListener('click', (e) => { const t = (e.target as HTMLElement).closest('[data-a]') as HTMLElement | null; if (t) { e.stopPropagation(); this.act(t.dataset.a!, t); } });
    document.addEventListener('change', (e) => { const t = e.target as HTMLInputElement; if (t.id === 'aname') { const v = t.value.trim().slice(0, 24); if (v) { this.s.name = v; this.s.bases.earth.name = v; this.app.changed(); this.renderHud(); } } if (t.dataset.set) this.app.setSetting(t.dataset.set, t.type === 'range' ? +t.value : t.value); });
  }
  get s() { return this.app.s; }
  get R(): Rates { return this.app.R; }
  // ---------------- HUD ----------------
  renderHud() {
    const s = this.s, R = this.R; const k = kardashev(s, R);
    $('#hud').innerHTML = `<div class="kchip" data-a="kard" title="Kardashev scale"><div class="ring" id="kring"><b id="kval">${k.toFixed(2)}</b></div><div class="nm"><b>${esc(s.name)}</b><i id="ktitle">Kardashev ${k.toFixed(3)}</i></div></div>${Object.keys(s.bases).length > 1 ? `<button class="chip" data-a="bases" title="Your worlds">${worldIcon(s.at)} ${esc(s.bases[s.at].name)} ▾</button>` : ''}
      ${HUD_RES.map((r) => `<div class="res" id="r-${r}" data-a="resinfo" data-r="${r}" style="--c:${RES[r].color}" title="${RES[r].name}"><span class="ic" style="color:${RES[r].color}">${RES[r].icon}</span><span class="v">0</span><span class="cap"><i></i></span></div>`).join('')}
      <div class="res" id="r-dm" data-a="resinfo" data-r="dm" title="Dark Matter"><span class="ic" style="color:${RES.dm.color}">${RES.dm.icon}</span><span class="v">0</span></div>
      <span class="sp"></span><span class="chip" id="energy" data-a="energy" title="Energy: generation / demand">⚡ <span>0</span></span><span class="chip" id="crews" title="Construction drones">🛸 <span>0/0</span></span><button class="ibtn" data-a="settings" title="Settings">⚙</button>`;
    this.lastRes = {}; this.updHud();
  }
  updHud() {
    const s = this.s, R = this.R;
    for (const r of [...HUD_RES, 'dm']) { const el = $(`#r-${r}`); if (!el) continue; const v = Math.floor(s.res[r] || 0); if (v !== this.lastRes[r]) { (el.querySelector('.v') as HTMLElement).textContent = fmt(v); if (v > (this.lastRes[r] ?? v)) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } this.lastRes[r] = v; }
      const cap = R.cap[r]; const bar = el.querySelector('.cap i') as HTMLElement | null; if (bar && isFinite(cap)) { const f = clamp(v / Math.max(1, cap)); bar.style.width = f * 100 + '%'; el.classList.toggle('full', f >= 0.999); el.title = `${RES[r].name}: ${fmt(v)} / ${fmt(cap)}`; } }
    const en = $('#energy'); if (en) { (en.querySelector('span') as HTMLElement).textContent = `${fmt(R.gen)} / ${fmt(R.draw)}`; en.classList.toggle('low', R.gen < R.draw); }
    const cr = $('#crews'); if (cr) (cr.querySelector('span') as HTMLElement).textContent = `${G.crewsBusy(s)}/${G.crewsTotal(s, R.m)}`;
    const k = kardashev(s, R); const kv = $('#kval'); if (kv) { kv.textContent = k.toFixed(2); const next = K_MILESTONES.find((m) => m > k) || 3, prev = [...K_MILESTONES].reverse().find((m) => m <= k) || 0.7; $('#kring').style.setProperty('--p', clamp((k - prev) / (next - prev)) * 100 + '%'); $('#ktitle').textContent = `Kardashev ${k.toFixed(3)}`; }
  }
  // ---------------- navigation ----------------
  renderNav() {
    const r = this.s.jobs.some((j) => j.kind === 'research') ? '' : (Object.keys(TECH).some((id) => G.canResearch(this.s, id).ok) ? '<span class="rdot"></span>' : '');
    const s = this.s, S = SP.sp(s); if (this.app.world && this.app.world.mode === 'system') { $('#nav').innerHTML = `<button data-a="base"><span class="g">🏠</span>Base</button><button data-a="fleet"><span class="g">🛸</span>Fleet</button><button data-a="launchctl"><span class="g">🚀</span>Launch</button><button data-a="bases"><span class="g">🌍</span>Worlds</button>`; return; }
    if (this.app.world && this.app.world.mode === 'orbit') { $('#nav').innerHTML = `<button data-a="base"><span class="g">🏠</span>Base</button><button data-a="orbitFocus" data-f="earth"><span class="g">🌍</span>Earth</button>${S.modules.core ? '<button data-a="orbitFocus" data-f="station"><span class="g">🛰</span>Station</button>' : ''}<button data-a="launchctl"><span class="g">🚀</span>Launch</button>`; return; }
    const pad = G.lvlOf(s, 'earth', 'launch') > 0; const ready = Object.values(S.hangar).some((n) => n > 0) && s.jobs.every((j) => j.kind !== 'mission');
    const bots = RB.workshopLvl(s) > 0 || RB.rb(s).list.length > 0; const cores = RB.rb(s).cores.length > 0;
    $('#nav').innerHTML = `<button data-a="shop"><span class="g">🏗</span>Build</button><button data-a="research"><span class="g">🔬</span>Research${r}</button>${bots ? `<button data-a="robots"><span class="g">🤖</span>Robots${cores ? '<span class="rdot"></span>' : ''}</button>` : ''}${pad ? `<button data-a="launchctl"><span class="g">🚀</span>Launch${ready ? '<span class="rdot"></span>' : ''}</button>` : ''}${S.sats.length || S.modules.core ? '<button data-a="orbit"><span class="g">🛰</span>Orbit</button>' : ''}${pad || Object.keys(s.bases).length > 1 ? '<button data-a="map"><span class="g">🪐</span>Map</button>' : ''}<button data-a="goals"><span class="g">🎯</span>Goals</button><button data-a="kard"><span class="g">☀</span>Kardashev</button>`;
  }
  // ---------------- objective card ----------------
  renderObj() {
    const s = this.s, st = G.currentStep(s); const el = $('#obj'); if (!st) { el.classList.add('hidden'); return; } el.classList.remove('hidden'); const done = G.stepDone(s, st, this.R); const ch = CHAPTERS.find((c) => c.id === st.ch);
    el.classList.toggle('done', done); el.innerHTML = `<div class="t">${esc(ch ? ch.name : 'Objective')}</div><p>${esc(st.text)}</p><div class="rw">Reward: ${costHTML(st.reward)}</div>${done ? '<button class="btn gold claim" data-a="claim">✓ Claim reward</button>' : this.hint(st)}`;
  }
  private hint(st: any) { if (st.kind === 'build' || st.kind === 'hq') { const b = st.kind === 'hq' ? 'hq' : st.b; const it = this.s.bases.earth.items.find((i) => i.b === b); return it ? `<div class="go" data-a="goto" data-id="${it.id}">Show me →</div>` : `<div class="go" data-a="shopFor" data-b="${b}">Open the build menu →</div>`; } if (st.kind === 'tech') return '<div class="go" data-a="research">Open research →</div>'; return ''; }
  // ---------------- bubbles over buildings ----------------
  frameBubbles() {
    if (this.app.world.mode === 'system') { this.solar.frameLabels(); return; }
    const s = this.s, W = this.app.world, R = this.R; const root = $('#bubbles'); const seen = new Set<string>(); const B = s.bases[s.at]; if (!B) return;
    const put = (key: string, at: { x: number; y: number; z: number } | null, html: string, cls: string, act?: string, id?: string) => { if (!at) return; const p = W.project(at); if (p.behind) return; seen.add(key); let el = this.bubbles.get(key);
      if (!el) { el = document.createElement('div'); el.className = 'bub'; if (act) { el.dataset.a = act; if (id) el.dataset.id = id; } root.appendChild(el); this.bubbles.set(key, el); }
      if (el.dataset.h !== html + cls) { el.innerHTML = html; el.className = 'bub ' + cls; el.dataset.h = html + cls; } el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; };
    if (!W.ghost) for (const it of B.items) { const top = W.topOf(it.id); const job = G.jobOf(s, it.id);
      if (job) { const f = clamp(1 - (job.end - Date.now()) / (job.end - job.start)); put('t' + it.id, top, `<span>${fmtTime((job.end - Date.now()) / 1000)}</span><div class="bar"><i style="width:${f * 100}%"></i></div>`, 'timer'); continue; }
      const x = R.item[it.id], held = it.held || 0; if (x && held >= Math.max(1, x.hold * 0.03)) { const full = held >= x.hold * 0.98; put('c' + it.id, top, `<span class="bi" style="color:${RES[x.r].color}">${RES[x.r].icon}</span>${fmt(held)}`, full ? 'full' : '', 'collect', it.id); } }
    for (const [k, el] of this.bubbles) if (!seen.has(k)) { el.remove(); this.bubbles.delete(k); }
  }
  popText(x: number, y: number, txt: string, color = '#fff') { const el = document.createElement('div'); el.className = 'pop'; el.textContent = txt; el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.color = color; document.body.appendChild(el); setTimeout(() => el.remove(), 1100); }
  // ---------------- building panel ----------------
  select(id: string | null) { this.sel = id; this.app.world.select(id); this.renderPanel(); }
  private panelSig() { const s = this.s; const it = this.sel ? G.itemOf(s, s.at, this.sel) : null; if (!it) return ''; const j = G.jobOf(s, it.id); return [it.id, it.lvl, it.x, it.z, j ? j.id : '', G.canUpgrade(s, s.at, it.id).ok, G.crewsBusy(s), Math.floor((s.res.dm || 0) / 5), RB.operatorsAt(s, s.at, it.id).map((r) => r.id + r.lvl).join()].join('|'); }
  refreshPanel() { if (this.app.world.mode === 'system') { if (this.tick % 8 === 0) this.renderPanel(); return; } if (!this.sel) return; const sig = this.panelSig(); if (sig !== this.panelKey) { this.renderPanel(); return; } const s = this.s;
    $$('#panel [data-left]').forEach((e) => { const j = s.jobs.find((x) => x.id === e.dataset.left); if (j) e.textContent = fmtTime((j.end - Date.now()) / 1000); });
    $$('#panel [data-bar]').forEach((e) => { const j = s.jobs.find((x) => x.id === e.dataset.bar); if (j) e.style.width = clamp(1 - (j.end - Date.now()) / (j.end - j.start)) * 100 + '%'; });
    $$('#panel [data-dm]').forEach((e) => { const j = s.jobs.find((x) => x.id === e.dataset.dm); if (j) { const c = G.dmCost((j.end - Date.now()) / 1000); e.innerHTML = c ? `${icon('dm')}${c} Finish now` : 'Finish (free)'; } });
    const it = G.itemOf(s, s.at, this.sel); const x = it && this.R.item[it.id]; const h = $('#panel #held'); if (h && x && it) { h.textContent = `${fmt(it.held || 0)} / ${fmt(x.hold)}`; const b = $('#panel #heldbar') as HTMLElement; if (b) b.style.width = clamp((it.held || 0) / x.hold) * 100 + '%'; }
    $$('#panel [data-cost]').forEach((e) => { const [r, n] = e.dataset.cost!.split(':'); e.classList.toggle('short', (s.res[r] || 0) < +n); }); }
  renderPanel() {
    const el = $('#panel'); const s = this.s; if (this.app.world && this.app.world.mode === 'system') { el.classList.remove('hidden'); el.innerHTML = this.solar.panelHTML(); return; } if (this.app.world && this.app.world.mode === 'orbit') { el.classList.add('hidden'); return; } const it = this.sel ? G.itemOf(s, s.at, this.sel) : null; if (!it) { el.classList.add('hidden'); return; } el.classList.remove('hidden'); this.panelKey = this.panelSig();
    const d = BUILDINGS[it.b]; const m = this.R.m; const job = G.jobOf(s, it.id); const cap = G.levelCap(s, s.at, it.b);
    let h = `<button class="ibtn x" data-a="deselect">✕</button><h2>${esc(d.name)}</h2><div class="sub">${it.lvl ? `Level ${it.lvl} of ${d.max}` : 'Under construction'}${!d.command && cap < d.max ? ` · up to ${cap} at this ${s.at === 'earth' ? 'Mission Control' : 'Colony Hub'} level` : ''} · ${CATS[d.cat] || ''}</div><p class="desc">${esc(d.desc)}</p>`;
    if (job) { const c = G.dmCost((job.end - Date.now()) / 1000); h += `<div class="box"><div class="row"><b class="grow ox">${job.from === 0 ? 'Building' : `Upgrading to level ${job.to}`}</b><b data-left="${job.id}">${fmtTime((job.end - Date.now()) / 1000)}</b></div><div class="bar" style="margin:6px 0"><i data-bar="${job.id}" style="width:0%"></i></div><div class="row"><button class="btn gold small grow" data-a="finish" data-job="${job.id}" data-dm="${job.id}">${c ? `${icon('dm')}${c} Finish now` : 'Finish (free)'}</button><button class="btn small" data-a="cancel" data-job="${job.id}">Cancel</button></div></div>`; }
    const x = this.R.item[it.id]; if (x && it.lvl > 0) h += `<div class="box"><div class="row"><span class="grow">${icon(x.r)} Stored here <b id="held" class="ox">${fmt(it.held || 0)} / ${fmt(x.hold)}</b></span><button class="btn green small" data-a="collect" data-id="${it.id}" ${(it.held || 0) >= 1 ? '' : 'disabled'}>Collect</button></div><div class="bar green" style="margin-top:6px"><i id="heldbar" style="width:${clamp((it.held || 0) / x.hold) * 100}%"></i></div><div class="muted" style="font-size:11px;margin-top:4px">Fills in ${holdHours(it.lvl).toFixed(1)} h. Come back and tap the bubble to collect.</div></div>`;
    if (it.b === 'hub') h += this.solar.colonyHTML(s.at);
    if (it.b === 'terraformer') h += this.solar.terraHTML(s.at);
    h += this.statsHTML(it.b, Math.max(1, it.lvl), m, !job && it.lvl < d.max); h += this.robots.panelHTML(s.at, it.id);
    if (!job && it.lvl > 0) { const c = G.canUpgrade(s, s.at, it.id);
      if (c.max) h += '<p class="good ox">Maximum level reached.</p>';
      else { const cost = G.costOf(it.b, it.lvl + 1, m); h += `<div class="box"><div class="row"><b class="grow ox">Upgrade to level ${it.lvl + 1}</b><span class="muted">${BUILDINGS[it.b].instant ? '⚡ instant' : '⏱ ' + fmtTime(G.timeOf(it.b, it.lvl + 1, m))}</span></div><div style="margin:6px 0">${this.costLive(cost)}</div>`;
        if (c.reqs && c.reqs.length) h += `<ul class="reqs">${c.reqs.map(([b, n]: [string, number]) => `<li>${esc(BUILDINGS[b].name)} level ${n}</li>`).join('')}</ul>`;
        h += `<button class="btn ${c.ok ? 'gold' : ''}" style="width:100%" data-a="upgrade" data-id="${it.id}" ${c.ok || c.why === 'Not enough resources' ? '' : 'disabled'}>⬆ Upgrade</button>${c.ok ? '' : `<p class="why">${esc(c.why || '')}</p>`}`;
        if (BUILDINGS[it.b].instant) { const same = s.bases[s.at].items.filter((i) => i.b === it.b && i.lvl === it.lvl).length; if (same > 1) h += `<button class="btn" style="width:100%;margin-top:6px" data-a="upgradeAll" data-b="${it.b}" data-l="${it.lvl}">⬆ Upgrade all ${same} level-${it.lvl} ${esc(BUILDINGS[it.b].name.toLowerCase())}s (${fmt(cost.credits * same)} ¢)</button>`; }
        h += '</div>'; } }
    if (it.b === 'research') h += '<button class="btn" style="width:100%" data-a="research">🔬 Open research</button>';
    if ((it.b === 'launch' || it.b === 'vab') && it.lvl > 0) h += `<button class="btn" style="width:100%" data-a="ltab" data-t="${it.b === 'vab' ? 'rockets' : 'missions'}">🚀 Launch Control</button>`;
    h += `<div class="row" style="margin-top:10px"><button class="btn small" data-a="move" data-id="${it.id}">✥ Move</button>${G.canDemolish(s, s.at, it.id) ? `<button class="btn small red" data-a="demolish" data-id="${it.id}">Demolish</button>` : ''}</div>`;
    el.innerHTML = h; this.refreshPanel();
  }
  private costLive(cost: Record<string, number>) { return `<span class="costs">${Object.entries(cost).map(([r, n]) => `<span class="cost ${(this.s.res[r] || 0) < n ? 'short' : ''}" data-cost="${r}:${n}">${icon(r)}${fmt(n)}</span>`).join('')}</span>`; }
  // current output vs. the next level
  private statsHTML(b: string, L: number, m: any, next: boolean) {
    const a = bStats(b, L, m), n = next ? bStats(b, L + 1, m) : null; const rows: string[] = []; const up = (v: number, w?: number) => (w !== undefined && w > v ? `<span class="up">→ ${fmt(w)}</span>` : '');
    for (const r in a.prod) rows.push(`<tr><td>${icon(r)} ${RES[r].name} per hour</td><td>${fmt(a.prod[r])}${up(a.prod[r], n?.prod[r])}</td></tr>`);
    for (const r in a.cap) rows.push(`<tr><td>${icon(r)} ${RES[r].name} storage</td><td>+${fmt(a.cap[r])}${up(a.cap[r], n?.cap[r])}</td></tr>`);
    if (a.gen) rows.push(`<tr><td>⚡ Energy generated</td><td>${fmt(a.gen)}${up(a.gen, n?.gen)}</td></tr>`); if (a.draw) rows.push(`<tr><td>⚡ Energy used</td><td>${fmt(a.draw)}${n && n.draw > a.draw ? `<span class="up" style="color:var(--amber)">→ ${fmt(n.draw)}</span>` : ''}</td></tr>`);
    if (a.speed) rows.push(`<tr><td>🔬 Research speed</td><td>+${Math.round(a.speed * 100)}%</td></tr>`);
    return rows.length ? `<table class="stats">${rows.join('')}</table>` : '';
  }
  // ---------------- overlays ----------------
  openOver(kind: UI['over'], tab?: string) { this.over = kind; if (tab) { if (kind === 'shop') this.tab = tab; else this.rtab = tab; } this.select(null); this.renderOver(); this.app.platform.gameplayStop(); }
  closeOver() { this.over = ''; $('#over').classList.add('hidden'); this.app.platform.gameplayStart(); }
  renderOver() {
    const el = $('#over'); if (!this.over) { el.classList.add('hidden'); return; } el.classList.remove('hidden'); const s = this.s;
    if (this.over === 'shop') { const base = s.at; const cats = ['core', 'production', 'power', 'storage', 'science', 'spaceflight', 'defense'].filter((c) => Object.values(BUILDINGS).some((d) => d.cat === c && d.bases.includes(base)));
      if (!cats.includes(this.tab)) this.tab = cats[0];
      const near = (tech?: string) => !tech || !!s.tech[tech] || (TECH[tech] && TECH[tech].req.every((r) => s.tech[r])); // hide buildings more than one discovery away
      const list = Object.entries(BUILDINGS).filter(([, d]) => d.cat === this.tab && d.bases.includes(base) && !d.command && near(d.req && d.req.tech));
      el.innerHTML = `<div class="head"><h1>Build</h1><span class="chip">🛸 ${G.crewsBusy(s)}/${G.crewsTotal(s, this.R.m)} drones busy</span><button class="ibtn" data-a="close">✕</button></div><div class="tabs">${cats.map((c) => `<button class="tab ${c === this.tab ? 'on' : ''}" data-a="tab" data-t="${c}">${CATS[c]}</button>`).join('')}</div>
        <div class="body"><div class="grid">${list.map(([b, d]) => this.shopCard(b, d)).join('') || '<p class="muted">Nothing to build here yet.</p>'}</div></div>`; return; }
    if (this.over === 'research') { el.innerHTML = this.researchHTML(); return; }
    if (this.over === 'launch') { el.innerHTML = this.launch.html(); return; }
    if (this.over === 'designer') { el.innerHTML = this.launch.designerHTML(); return; }
    if (this.over === 'robots') { el.innerHTML = this.robots.html(); return; }
    if (this.over === 'daily') { el.innerHTML = this.daily.html(); return; }
    if (this.over === 'goals') { el.innerHTML = this.goalsHTML(); return; }
  }
  private shopCard(b: string, d: (typeof BUILDINGS)[string]) {
    const s = this.s, c = G.canBuild(s, s.at, b), hq = G.hqLevel(s, s.at), n = G.countOf(s, s.at, b), lim = allowedCount(d, hq); const cost = G.costOf(b, 1, this.R.m); const locked = !c.ok && c.why !== 'Not enough resources' && !c.crews;
    return `<div class="card ${locked ? 'locked' : ''}"><div class="thumb"><img src="${this.app.studio.building(b, 1, this.app.world.look)}" alt=""></div><div class="row"><b class="grow">${esc(d.name)}</b><span class="n">${n}/${lim}</span></div><p class="desc">${esc(d.desc)}</p>
      <div class="row"><span class="grow">${this.costLive(cost)}</span><span class="muted" style="font-size:11px">⏱ ${fmtTime(G.timeOf(b, 1, this.R.m))}</span></div><button class="btn ${c.ok ? 'gold' : ''} small" data-a="buy" data-b="${b}" ${c.ok || c.why === 'Not enough resources' ? '' : 'disabled'}>${locked ? '🔒 ' + esc(c.why || '') : 'Build'}</button></div>`;
  }
  private researchHTML() {
    const s = this.s; const busy = s.jobs.filter((j) => j.kind === 'research'); const ids = Object.keys(TECH);
    const tabs: [string, string][] = [['avail', 'Available'], ...Object.entries(BRANCHES).map(([k, v]) => [k, v.name] as [string, string]), ['done', 'Done']];
    let list = ids.filter((id) => (this.rtab === 'avail' ? !s.tech[id] && TECH[id].req.every((r) => s.tech[r]) : this.rtab === 'done' ? !!s.tech[id] : TECH[id].branch === this.rtab));
    list.sort((a, b) => TECH[a].tier - TECH[b].tier || (TECH[a].hq || 0) - (TECH[b].hq || 0));
    const now = busy.map((j) => { const t = TECH[j.tech!]; const c = G.dmCost((j.end - Date.now()) / 1000); return `<div class="now"><div class="grow"><div class="tier">RESEARCHING</div><b class="ox" style="font-size:16px">${esc(t.name)}</b><div class="bar gold" style="margin-top:6px"><i style="width:${clamp(1 - (j.end - Date.now()) / (j.end - j.start)) * 100}%"></i></div></div><div style="text-align:right"><b class="ox">${fmtTime((j.end - Date.now()) / 1000)}</b><br><button class="btn gold small" data-a="finish" data-job="${j.id}">${c ? `${icon('dm')}${c}` : 'Finish'}</button></div></div>`; }).join('');
    return `<div class="head"><h1>Research</h1><span class="chip">🔬 ${G.slotsBusy(s)}/${G.slotsTotal(s, this.R.m)} slots</span><button class="ibtn" data-a="close">✕</button></div><div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${k === this.rtab ? 'on' : ''}" data-a="rtab" data-t="${k}">${esc(n)}</button>`).join('')}</div>
      <div class="body">${now}<div class="techs">${list.map((id) => this.techCard(id)).join('') || '<p class="muted">Nothing here yet.</p>'}</div></div>`;
  }
  private techCard(id: string) {
    const s = this.s, t = TECH[id], c = G.canResearch(s, id); const done = !!s.tech[id], busy = s.jobs.some((j) => j.kind === 'research' && j.tech === id); const cost = techCost(t);
    const cls = done ? 'done' : busy ? 'busy' : c.locked ? 'locked' : c.ok ? 'ready' : ''; const time = c.time || G.researchTimeOf(id, this.R);
    return `<div class="tech ${cls}" style="--bc:${BRANCHES[t.branch]?.color}"><div class="row"><span class="tier grow">${esc(BRANCHES[t.branch]?.name || '')} · TIER ${t.tier}${t.hq ? ` · MC ${t.hq}` : ''}</span>${done ? '<span class="good">✓</span>' : ''}</div><b>${esc(t.name)}</b><p class="desc">${esc(t.desc)}</p>${t.unlocks ? `<div class="unl">Unlocks: ${esc(t.unlocks)}</div>` : ''}
      ${done ? '' : busy ? '<div class="warn ox">In progress</div>' : `<div class="row"><span class="grow">${this.costLive(cost)}</span><span class="muted" style="font-size:11px">⏱ ${fmtTime(time)}</span></div><button class="btn small ${c.ok ? 'gold' : ''}" data-a="study" data-t="${id}" ${c.ok || c.why === 'Not enough resources' ? '' : 'disabled'}>${c.ok ? 'Research' : esc(c.why || '')}</button>`}</div>`;
  }
  private goalsHTML() {
    const s = this.s; const cur = G.currentStep(s); let h = `<div class="head"><h1>Goals</h1><span class="chip">${G.stepIndex(s)}/${G.stepCount()} complete</span><button class="ibtn" data-a="close">✕</button></div><div class="body" style="max-width:760px;margin:0 auto;width:100%">`;
    for (const ch of CHAPTERS) { const open = ch.steps.some((st) => s.obj.claimed[st.id] || (cur && cur.id === st.id)); if (!open) { h += `<div class="box muted">🔒 ${esc(ch.name)}</div>`; continue; }
      h += `<div class="box"><b class="ox">${esc(ch.name)}</b><p class="desc">${esc(ch.intro)}</p><ul class="reqs">${ch.steps.map((st) => `<li class="${s.obj.claimed[st.id] ? 'ok' : ''}" style="${cur && cur.id === st.id ? 'color:var(--gold)' : s.obj.claimed[st.id] ? '' : 'opacity:.55'}">${esc(st.text)}</li>`).join('')}</ul></div>`; }
    return h + '</div>';
  }
  kardHTML() {
    const s = this.s, R = this.R; const k = kardashev(s, R); const got = s.kMax || 0; const pos = (v: number) => clamp((v - 0.7) / 2.3) * 100;
    return `<div class="ox muted" style="letter-spacing:.2em">THE KARDASHEV SCALE</div><div class="kbig">${k.toFixed(3)}</div><b class="ox">${esc(kTitle(k))}</b>
      <p class="desc">How much energy a civilisation commands. Humanity today runs about 20 terawatts (0.73). Type I harnesses a whole planet, Type II a star, Type III a galaxy. Every watt you generate moves the needle.</p>
      <div class="kscale">${[[0.73, 'Today'], [1, 'Type I'], [2, 'Type II'], [3, 'Type III']].map(([v, l]) => `<span class="lb" style="left:${pos(+v)}%">${l}</span>`).join('')}<span class="mk" style="left:${pos(k)}%"></span></div>
      <div class="mlist">${K_MILESTONES.map((m) => `<div class="ms ${got >= m ? 'got' : ''}">${m.toFixed(2)}<i>${got >= m ? 'reached' : `${icon('dm')}${kReward(m)}`}</i></div>`).join('')}</div>
      <p class="muted" style="font-size:12px">Power now: ${fmt(R.gen)} generated, ${fmt(R.draw)} used.</p><button class="btn" data-a="closeModal">Close</button>`;
  }
  // ---------------- toasts & modals ----------------
  toast(msg: string, cls = '') { const el = document.createElement('div'); el.className = 'toast ' + cls; el.innerHTML = msg; $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3200); }
  modal(html: string, opts: { rays?: boolean; wide?: boolean } = {}) { const m = $('#modal'); m.innerHTML = `${opts.rays ? '<div class="rays"></div>' : ''}<div class="box ${opts.wide ? 'wide' : ''}">${html}</div>`; m.classList.remove('hidden'); this.app.platform.gameplayStop(); }
  closeModal() { $('#modal').classList.add('hidden'); $('#modal').innerHTML = ''; if (!this.over) this.app.platform.gameplayStart(); }
  deny(why?: string) { if (why) this.toast(esc(why), 'bad'); this.app.audio.play('deny'); }
  settingsHTML() { const st = this.s.settings; return `<h1>Settings</h1><div class="box" style="text-align:left"><label class="ox">Agency name<input id="aname" value="${esc(this.s.name)}" maxlength="24" style="width:100%;margin-top:6px;padding:10px;border-radius:10px;border:1px solid var(--line);background:#0d1a2e;color:#fff;font:600 15px Barlow"></label>
      <label class="row" style="margin-top:10px"><span class="grow">Sound effects</span><input type="range" min="0" max="1" step="0.05" value="${st.sfx}" data-set="sfx"></label><label class="row"><span class="grow">Music</span><input type="range" min="0" max="1" step="0.05" value="${st.music}" data-set="music"></label>
      <label class="row"><span class="grow">Graphics</span><select data-set="quality" style="background:#0d1a2e;color:#fff;border:1px solid var(--line);border-radius:8px;padding:6px">${['auto', 'high', 'low'].map((q) => `<option ${st.quality === q ? 'selected' : ''}>${q}</option>`).join('')}</select></label></div>
      <p class="muted" style="font-size:12px">Graphics changes apply after a reload. Camera: drag to pan, scroll or pinch to zoom, right-drag, two-finger twist or Q/E to rotate.</p><div class="row" style="justify-content:center"><button class="btn red small" data-a="reset">Start over</button><button class="btn" data-a="closeModal">Close</button></div>`; }
  // ---------------- actions ----------------
  act(a: string, t: HTMLElement) {
    const A = this.app, s = this.s; A.audio.unlock(); if (this.launch.act(a, t) || this.robots.act(a, t) || this.solar.act(a, t) || this.daily.act(a, t)) return; const id = t.dataset.id; const it = id ? G.itemOf(s, s.at, id) : undefined;
    switch (a) {
      case 'orbit': A.openOrbit('earth'); A.audio.play('whoosh'); break;
      case 'base': A.toBase(); A.audio.play('whoosh'); break;
      case 'orbitFocus': A.world.orbit?.setFocus(t.dataset.f as any); A.audio.play('tap'); break;
      case 'shop': this.openOver('shop'); A.audio.play('tap'); break;
      case 'shopFor': { const d = BUILDINGS[t.dataset.b!]; this.openOver('shop', d ? d.cat : undefined); A.audio.play('tap'); break; }
      case 'research': this.openOver('research', this.rtab); A.audio.play('tap'); break;
      case 'goals': this.openOver('goals'); A.audio.play('tap'); break;
      case 'close': this.closeOver(); A.audio.play('tap'); break;
      case 'tab': this.tab = t.dataset.t!; this.renderOver(); A.audio.play('tap'); break;
      case 'rtab': this.rtab = t.dataset.t!; this.renderOver(); A.audio.play('tap'); break;
      case 'kard': this.modal(this.kardHTML(), { wide: true }); A.audio.play('tap'); break;
      case 'settings': this.modal(this.settingsHTML()); A.audio.play('tap'); break;
      case 'closeModal': this.closeModal(); A.audio.play('tap'); break;
      case 'claim': { const st = G.claimStep(s); if (st) { A.audio.play('claim'); this.toast(`Objective complete: ${costHTML(st.reward)}`, 'gold'); A.changed(); const nx = G.currentStep(s); if (nx && nx.ch !== st.ch) { const ch = CHAPTERS.find((c) => c.id === nx.ch); if (ch) A.enqueue(() => this.modal(`<div class="ox muted" style="letter-spacing:.2em">NEW CHAPTER</div><h1>${esc(ch.name)}</h1><p class="desc">${esc(ch.intro)}</p><button class="btn gold" data-a="closeModal">Onward</button>`, { rays: true })); } } break; }
      case 'goto': if (id) { const c = A.world.centerOf(id); if (c) A.world.focus(c.x, c.z); this.select(id); A.audio.play('tap'); } break;
      case 'deselect': this.select(null); break;
      case 'collect': if (it) A.collect(it.id); break;
      case 'upgrade': if (it) { const r = G.startUpgrade(s, s.at, it.id); if (r.ok) { A.audio.play('build'); A.changed(); this.renderPanel(); } else this.deny(r.why); } break;
      case 'upgradeAll': { const n = G.upgradeAllOf(s, s.at, t.dataset.b!, +t.dataset.l!); if (n) { A.audio.play('build'); this.toast(`${n} ${esc(BUILDINGS[t.dataset.b!].name.toLowerCase())}${n > 1 ? 's' : ''} upgraded`, 'good'); A.changed(); this.renderPanel(); } else this.deny('Not enough resources'); break; }
      case 'finish': { const r = G.speedup(s, t.dataset.job!); if (r.ok) { A.audio.play('done'); A.tickNow(); this.renderOver(); } else this.deny((r as any).why); break; }
      case 'cancel': if (G.cancel(s, t.dataset.job!)) { A.audio.play('tap'); this.toast('Cancelled: half the cost refunded'); A.changed(); if (this.sel && !G.itemOf(s, s.at, this.sel)) this.select(null); } break;
      case 'buy': { const b = t.dataset.b!; const c = G.canBuild(s, s.at, b); if (!c.ok) { this.deny(c.why); break; } this.closeOver(); A.startPlacing(b); break; }
      case 'study': { const r = G.startResearch(s, t.dataset.t!); if (r.ok) { A.audio.play('buy'); A.changed(); this.renderOver(); this.renderNav(); } else this.deny(r.why); break; }
      case 'move': if (it) A.startPlacing(it.b, it.id); break;
      case 'demolish': if (it) this.modal(`<h1>Demolish?</h1><p class="desc">${esc(BUILDINGS[it.b].name)} (level ${it.lvl}) will be cleared. Nothing is refunded.</p><div class="row" style="justify-content:center"><button class="btn" data-a="closeModal">Keep it</button><button class="btn red" data-a="demolishYes" data-id="${it.id}">Demolish</button></div>`); break;
      case 'demolishYes': if (it && G.demolish(s, s.at, it.id)) { this.closeModal(); this.select(null); A.changed(); A.audio.play('build'); } break;
      case 'place': A.confirmPlace(); break;
      case 'rotate': A.world.rotateGhost(); A.audio.play('tap'); break;
      case 'unplace': A.cancelPlace(); break;
      case 'resinfo': { const r = t.dataset.r!; const R = this.R; const prod = (R.prod[r] || 0) + (R.collect[r] || 0); this.toast(`${RES[r].icon} <b>${RES[r].name}</b>: ${fmt(s.res[r] || 0)}${isFinite(R.cap[r]) ? ` / ${fmt(R.cap[r])}` : ''}${prod ? ` · +${fmt(prod)}/h` : ''}`); break; }
      case 'energy': { const R = this.R; this.toast(R.gen >= R.draw ? `⚡ ${fmt(R.gen)} generated, ${fmt(R.draw)} used. All systems powered.` : `⚡ Power shortage: ${fmt(R.gen)} of ${fmt(R.draw)}. Production runs at ${Math.round((0.25 + 0.75 * R.eff) * 100)}%. Build or upgrade Solar Farms.`, R.gen >= R.draw ? 'good' : 'bad'); break; }
      case 'reset': this.modal('<h1>Start over?</h1><p class="desc">Your whole programme will be erased. This cannot be undone.</p><div class="row" style="justify-content:center"><button class="btn" data-a="closeModal">Cancel</button><button class="btn red" data-a="resetYes">Erase everything</button></div>'); break;
      case 'resetYes': A.reset(); break;
    }
  }
}
export const kReward = (m: number) => Math.round(10 + (m - 0.7) * 60);
export { collectsOf, rates };
