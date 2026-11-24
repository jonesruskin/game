// STARWARD: the DOM interface. HUD (resources, energy, crews, research), building panel and build menu,
// research tree, objectives, toasts and modals.
import { icon } from './icons.js';
import { fmt, fmtTime, esc, $, $$, clamp } from '../util.js';
import { RES, RES_ORDER } from '../data/resources.js';
import { BUILDINGS, allowedLevel, allowedCount, crewsFromHq, CATS, cmdReqs } from '../data/buildings.js';
import { TECH, BRANCHES, techCost, techTime } from '../data/research.js';
import { LAYOUTS } from '../data/layouts.js';
import { CHAPTERS } from '../data/objectives.js';
import { BODIES } from '../data/solar.js';
import * as G from '../core/game.js';
import { ART } from '../render/art.js';
import { TW, TH } from '../render/iso.js';
import { LaunchUI } from './launch.js';
import { SystemUI } from './system.js';
import { StarsUI } from './stars.js';
import { ContactUI } from './contact.js';
import { WarUI } from './war.js';
import { BeyondUI } from './beyond.js';
import * as WR from '../core/war.js';
import * as AL from '../core/aliens.js';
import * as SP from '../core/space.js';

const THUMBS = {};
export function thumb(b, L = 1, px = 120) {
  const k = b + L + px; if (THUMBS[k]) return THUMBS[k]; const d = BUILDINGS[b]; const S = d.size; const cv = document.createElement('canvas'); cv.width = cv.height = px * 2; const c = cv.getContext('2d');
  const sc = (px * 2) / (S * TW + 40); c.scale(sc, sc); c.translate((S * TW + 40) / 2, (S * TW + 40) * 0.72 - S * TH / 2); (ART[b] || ART.depot)(c, L, S, [], []);
  return (THUMBS[k] = cv.toDataURL());
}
// replace markup only when it changed, so buttons are not swapped out from under a press
export const setHTML = (el, h) => { if (el.__h !== h) { el.__h = h; el.innerHTML = h; } };
const costHTML = (cost, s) => Object.entries(cost).map(([r, n]) => `<span class="cost ${(s.res[r] || 0) < n ? 'short' : ''}" style="--rc:${RES[r].color}">${icon(r, 'xs')}${fmt(n)}</span>`).join('');

export class UI {
  constructor(app) { this.app = app; this.tick = 0; this.sel = null; this.panelKey = ''; this.launch = new LaunchUI(this); this.sys = new SystemUI(this); this.stars = new StarsUI(this); this.contact = new ContactUI(this); this.war = new WarUI(this); this.beyond = new BeyondUI(this); }
  get s() { return this.app.s; }
  init() {
    $('#hud').innerHTML = `<div class="topbar"><div class="res" id="resBar"></div><div class="topr"><div class="chip dm" id="dmChip" title="Dark Matter">${icon('dm')}<b id="dmVal">0</b></div><button class="ibtn" data-a="settings" title="Settings">${icon('cog')}</button></div></div>
      <div class="side"><div class="crews" id="crews"></div><div class="colline" id="colline"></div><button class="rslot" id="rslot" data-a="research"></button><div class="obj" id="obj"></div></div>
      <div class="basepick" id="basepick"></div><div class="maptog" id="maptog"><button data-a="maptog" data-m="sol">${icon('orbit', 'xs')} Solar System</button><button data-a="maptog" data-m="stars">${icon('star', 'xs')} Neighbourhood</button></div><nav class="nav"><button data-tab="bases" class="on" id="baseTab">${icon('earth')}<span>Earth</span></button><button data-tab="orbit" class="soon">${icon('orbit')}<span>Orbit</span></button><button data-tab="launch" class="soon">${icon('rocket')}<span>Launch</span><em class="badge" id="bLaunch"></em></button><button data-tab="research">${icon('research')}<span>Research</span><em class="badge" id="bRes"></em></button><button data-tab="system" class="soon">${icon('map')}<span>Star Map</span></button><button data-tab="contact" class="gone">${icon('xeno')}<span>Contact</span><em class="badge" id="bCon"></em></button><button data-tab="war" class="gone">${icon('target')}<span>Fleet</span><em class="badge" id="bWar"></em></button><button data-tab="beyond" class="gone">${icon('star')}<span>Beyond</span></button></nav>`;
    $('#hud').addEventListener('click', (e) => this.click(e)); $('#panel').addEventListener('click', (e) => this.click(e)); $('#overlay').addEventListener('click', (e) => this.click(e)); $('#modal').addEventListener('click', (e) => this.click(e));
    this.hud(true); this.side(true);
  }
  // ---------------- per frame ----------------
  frame(dt) { this.tick += dt; if (this.tick < 0.25) return; this.tick = 0; this.hud(); this.side(); if (this.app.scene === 'system') { if (this.app.mapMode === 'stars') this.stars.live(); else this.sys.live(); } else this.panelLive();
    const mt = $('#maptog'); mt.classList.toggle('on', this.app.scene === 'system' && this.app.view === 'system'); $$('#maptog button').forEach((b) => b.classList.toggle('on', b.dataset.m === this.app.mapMode)); if (this.app.view === 'research') this.researchLive(); if (this.app.view === 'launch') this.launch.live(); if (this.app.view === 'contact') this.contact.live(); if (this.app.view === 'war') this.war.live(); if (this.app.view === 'beyond') this.beyond.live(); }
  // taps in the orbit view open the matching part of Launch Control
  // the base picker above the nav (Earth, the Moon and every colony)
  bases() { const s = this.s, el = $('#basepick'); if (el.classList.contains('on')) { el.className = 'basepick'; return; }
    const R = this.app.R; el.innerHTML = Object.keys(s.bases).map((id) => { const B = s.bases[id]; const c = R.col[id]; const jobs = s.jobs.filter((j) => j.kind === 'build' && j.base === id).length; return `<button data-tab="${id}" class="${this.app.scene === id ? 'on' : ''}">${icon(id === 'earth' ? 'earth' : id === 'moon' ? 'moon' : 'base')}<span><b>${esc(B.name)}</b><i>${id === 'earth' ? 'Earth' : esc(BODIES[B.body].name)}${c ? ` · ${Math.floor(B.pop)} colonists` : ''}${jobs ? ` · ${jobs} building` : ''}</i></span></button>`; }).join(''); el.className = 'basepick on'; }
  selectStar(id) { this.sel = null; this.app.stars.sel = id; this.stars.open(id); if (id) this.app.audio.play('tap'); }
  selectBody(id) { this.sel = null; this.app.bv.sel = null; this.app.system.sel = id; this.sys.open(id); if (id) { this.app.audio.play('tap'); this.app.system.focus(id); } }
  orbitPick(p) { if (!p) return; this.app.audio.play('tap'); if (p.kind === 'sat' || p.kind === 'slot') this.app.setView('launch', 'sats'); else if (p.kind === 'station') this.app.setView('launch', 'station'); else if (p.kind === 'moon') { if (this.s.bases.moon) this.app.setView('moon'); else this.app.setView('launch', 'missions'); } }
  hud(force) {
    const s = this.s, R = this.app.R; const bar = $('#resBar'); const show = RES_ORDER.filter((r) => RES[r].start || (s.res[r] || 0) > 0);
    if (force || bar.childElementCount !== show.length + 1) bar.innerHTML = show.map((r) => `<div class="chip" data-r="${r}" style="--rc:${RES[r].color}">${icon(r)}<span class="v"><b></b><i class="rate"></i></span><i class="bar"><span></span></i></div>`).join('') + `<div class="chip energy" data-r="energy">${icon('energy')}<span class="v"><b></b><i class="rate"></i></span></div>`;
    for (const el of bar.children) { const r = el.dataset.r;
      if (r === 'energy') { const sp = R.gen - R.draw; el.querySelector('b').textContent = `${fmt(R.gen)} / ${fmt(R.draw)}`; el.querySelector('.rate').textContent = sp >= 0 ? `+${fmt(sp)} spare` : `${Math.round(R.eff * 100)}% power`; el.classList.toggle('bad', sp < 0); el.title = 'Energy generated / used. A shortage slows all production.'; continue; }
      const v = s.res[r] || 0, cap = R.cap[r]; el.querySelector('b').textContent = fmt(v); el.querySelector('.rate').textContent = R.prod[r] ? `+${fmt(R.prod[r])}/h` : ''; el.querySelector('.bar span').style.width = (cap === Infinity ? 0 : clamp(v / cap) * 100) + '%'; el.classList.toggle('full', cap !== Infinity && v >= cap * 0.999); el.title = `${RES[r].name}: ${fmt(v)} / ${fmt(cap)} · ${fmt(R.prod[r])} per hour\n${RES[r].desc}`; }
    $('#dmVal').textContent = fmt(s.res.dm || 0);
    const ready = Object.keys(TECH).filter((id) => G.canResearch(s, id).ok).length; const b = $('#bRes'); b.textContent = ready && G.slotsBusy(s) < G.slotsTotal(s, R.m) ? '!' : ''; b.style.display = b.textContent ? '' : 'none';
    const pad = SP.padLevel(s) > 0; $('.nav [data-tab=launch]').classList.toggle('soon', !pad && !s.tech.rocketry); $('.nav [data-tab=orbit]').classList.toggle('soon', !pad); $('.nav [data-tab=system]').classList.toggle('soon', !pad);
    const cont = Object.keys(AL.allSpecies()).some((id) => AL.known(s, id) || AL.discovered(s, id)); $('.nav [data-tab=contact]').classList.toggle('gone', !cont);
    const showWar = !!(s.tech.navalWarfare || WR.war(s).raids.length || (s.aliens && s.aliens.known.krthul)); $('.nav [data-tab=war]').classList.toggle('gone', !showWar); const wb = $('#bWar'); const nr = WR.war(s).raids.length; wb.textContent = nr ? '!' : ''; wb.style.display = nr ? '' : 'none';
    $('.nav [data-tab=beyond]').classList.toggle('gone', !(s.tech.relayNetwork || s.tech.antimatterProduction || Object.keys(s.ach || {}).length >= 8 || (s.asc && s.asc.count)));
    const cb = $('#bCon'); const nreq = AL.pendingContacts(s).length + Object.values(AL.al(s).known).filter((k) => k.req && AL.reqDone(s, k.req)).length; cb.textContent = nreq ? nreq : ''; cb.style.display = nreq ? '' : 'none';
    const lb = $('#bLaunch'); const idle = pad && SP.launchesBusy(s) < SP.launchSlots(s) && Object.values(SP.sp(s).rockets).some((n) => n > 0); lb.textContent = idle ? '!' : ''; lb.style.display = idle ? '' : 'none';
  }
  side() {
    const s = this.s, R = this.app.R; const tot = G.crewsTotal(s, R.m), busy = G.crewsBusy(s);
    setHTML($('#crews'), `<span class="lbl">${icon('crew', 'xs')} Crews</span>${Array.from({ length: tot }, (_, k) => `<i class="${k < busy ? 'busy' : ''}"></i>`).join('')}<span class="n">${tot - busy} free</span>`);
    const cb = this.app.scene; const cl = $('#colline'); const C = R.col[cb];
    if (C && s.bases[cb]) { cl.style.display = ''; setHTML(cl, `${icon('crew', 'xs')} <b>${Math.floor(s.bases[cb].pop)}</b><i>/ ${fmt(C.house)} colonists</i><em class="${C.staff < 0.999 ? 'bad' : ''}">${Math.round(C.staff * 100)}% jobs filled</em><span>+${C.grow.toFixed(1)}/h</span>`); } else cl.style.display = 'none';
    const bt = $('#baseTab'); const bn = s.bases[this.app.base]; if (bt && bn) setHTML(bt, `${icon(this.app.base === 'earth' ? 'earth' : this.app.base === 'moon' ? 'moon' : 'base')}<span>${esc(this.app.base === 'earth' ? 'Earth' : BODIES[bn.body].name)}${Object.keys(s.bases).length > 1 ? ' ▴' : ''}</span>`);
    const rj = s.jobs.find((j) => j.kind === 'research'); const rs = $('#rslot');
    if (rj) { const p = clamp((Date.now() - rj.start) / (rj.end - rj.start)); rs.innerHTML = `${icon('research', 'xs')}<span><b>${esc(TECH[rj.tech].name)}</b><i>${fmtTime((rj.end - Date.now()) / 1000)}</i></span><em style="width:${p * 100}%"></em>`; rs.classList.remove('idle'); }
    else { rs.innerHTML = `${icon('research', 'xs')}<span><b>Lab idle</b><i>${G.slotsTotal(s, R.m) ? 'Start a research project' : ''}</i></span>`; rs.classList.add('idle'); }
    const st = G.currentStep(s); const o = $('#obj');
    if (!st) { setHTML(o, `<b class="ch">Campaign complete</b><p>${s.flags.ascendant ? 'The Ascendants are waiting: open Beyond and Ascend to begin again, stronger.' : 'Every chapter done. Keep building your empire.'}</p>`); return; }
    const ch = CHAPTERS.find((c) => c.steps.includes(CHAPTERS.flatMap((x) => x.steps).find((x) => x.id === st.id))); const done = G.stepDone(s, st, R);
    let prog = ''; if ((st.kind === 'build' || st.kind === 'buildOn') && !done) { const bases = st.kind === 'buildOn' ? [st.base] : Object.keys(s.bases).filter((b) => BUILDINGS[st.b].bases.includes(b)); const has = bases.some((b) => s.bases[b] && Object.values(s.bases[b].lots).some((l) => l.b === st.b));
      const room = bases.some((b) => s.bases[b] && LAYOUTS[b].lots.some((L) => G.lotOpen(s, b, L) && (L.special || null) === (BUILDINGS[st.b].lot || null) && !(s.bases[b].lots[L.id] && s.bases[b].lots[L.id].b))); if (!has && !room && bases.length) prog = `<i class="pg warn">No free lot: tap a building you have two of and demolish it to make room</i>`; }
    if (st.kind === 'rate') prog = `<i class="pg">${fmt(R.prod[st.res])} / ${fmt(st.n)} per hour</i>`; if (st.kind === 'energy') prog = `<i class="pg">${fmt(R.gen - R.draw)} / ${st.n} spare</i>`; if (st.kind === 'pop' && s.bases[st.body]) prog = `<i class="pg">${Math.floor(s.bases[st.body].pop)} / ${st.n} colonists</i>`; if (st.kind === 'sites') prog = `<i class="pg">${Object.keys((s.solar && s.solar.sites) || {}).length} / ${st.n}</i>`; if (st.kind === 'terra') prog = `<i class="pg">stage ${(s.solar && s.solar.terra[st.body]) || 0} / ${st.n}</i>`;
    setHTML(o, `<b class="ch">${esc(ch ? ch.name : '')}</b><p>${icon('target', 'xs')} ${esc(st.text)}</p>${prog}<div class="rw">${Object.entries(st.reward).map(([r, n]) => `<span class="cost" style="--rc:${RES[r].color}">${icon(r, 'xs')}${fmt(n)}</span>`).join('')}</div>${done ? `<button class="claim" data-a="claim">${icon('check', 'xs')} Claim reward</button>` : ''}`);
    o.classList.toggle('done', done);
  }
  // ---------------- selection panel ----------------
  select(lotId) { this.sel = lotId; this.app.bv.sel = lotId; this.panelKey = ''; this.panel(); if (lotId) { this.app.audio.play('tap'); if (document.body.classList.contains('port')) this.app.bv.focusLot(lotId); } }
  panel() {
    const p = $('#panel'); const s = this.s; const base = this.app.base; document.body.classList.toggle('panel-open', !!this.sel); if (!this.sel) { p.className = ''; p.innerHTML = ''; return; }
    const lotDef = LAYOUTS[base].lots.find((l) => l.id === this.sel); const st = s.bases[base].lots[this.sel]; const hq = G.hqLevel(s, base);
    p.className = 'on'; let h = `<button class="close" data-a="deselect">${icon('x')}</button>`;
    if (!G.lotOpen(s, base, lotDef)) { h += `<div class="ptitle"><h2>Empty lot</h2></div><p class="muted">${icon('lock', 'xs')} This lot opens when ${base === 'earth' ? 'Mission Control' : 'the Colony Hub'} reaches level ${lotDef.hq}.</p>`; }
    else if (!st || !st.b) h += this.buildMenu(lotDef);
    else h += this.buildingInfo(st, lotDef, hq);
    p.innerHTML = h; this.panelKey = this.keyOf();
  }
  keyOf() { const s = this.s; const st = s.bases[this.app.base].lots[this.sel]; const j = G.jobAt(s, this.app.base, this.sel); return JSON.stringify([this.sel, st && st.b, st && st.lvl, j && j.id, G.crewsBusy(s), Object.keys(s.tech).length, G.hqLevel(s)]); }
  panelLive() {
    if (!this.sel) return; if (this.keyOf() !== this.panelKey) { this.panel(); return; }
    const s = this.s; $$('#panel .cost').forEach((el) => { const r = el.dataset.r; if (r) el.classList.toggle('short', (s.res[r] || 0) < +el.dataset.n); });
    const j = G.jobAt(s, this.app.base, this.sel); if (j) { const left = Math.max(0, (j.end - Date.now()) / 1000); const el = $('#jobLeft'); if (el) el.textContent = fmtTime(left); const bar = $('#jobBar'); if (bar) bar.style.width = clamp(1 - (j.end - Date.now()) / (j.end - j.start)) * 100 + '%'; const f = $('#finishBtn'); if (f) { const c = G.dmCost(left); f.innerHTML = c ? `${icon('dm', 'xs')} Finish now · ${c}` : `${icon('check', 'xs')} Finish now (free)`; f.classList.toggle('free', !c); } }
    $$('#panel [data-need]').forEach((el) => { const need = JSON.parse(el.dataset.need); el.disabled = !Object.entries(need).every(([r, n]) => (s.res[r] || 0) >= n) || el.dataset.block === '1'; });
  }
  statRows(b, L, next, m) {
    const a = G.bStats(b, L, m), n = next ? G.bStats(b, next, m) : null; const rows = [];
    for (const r in a.prod) rows.push([`${icon(r, 'xs')} ${RES[r].name}`, `${fmt(a.prod[r])}/h`, n && `${fmt(n.prod[r])}/h`]);
    for (const r in a.cap) rows.push([`${icon(r, 'xs')} ${RES[r].name} storage`, fmt(a.cap[r]), n && fmt(n.cap[r])]);
    if (a.gen) rows.push([`${icon('energy', 'xs')} Energy generated`, `+${fmt(a.gen)}`, n && `+${fmt(n.gen)}`]);
    if (a.draw) rows.push([`${icon('energy', 'xs')} Energy used`, `−${fmt(a.draw)}`, n && `−${fmt(n.draw)}`]);
    if (a.speed) rows.push([`${icon('research', 'xs')} Research speed`, `+${Math.round(a.speed * 100)}%`, n && `+${Math.round(n.speed * 100)}%`]);
    if (b === 'hq') { const lots = (l) => LAYOUTS.earth.lots.filter((x) => x.hq <= l).length; rows.push([`${icon('base', 'xs')} Building lots`, lots(L), n && lots(next)], [`${icon('crew', 'xs')} Engineering crews`, crewsFromHq(L), n && crewsFromHq(next)], [`${icon('up', 'xs')} Max building level`, L * 2, n && next * 2]); }
    if (a.house) rows.push([`${icon('crew', 'xs')} Houses colonists`, fmt(a.house), n && fmt(n.house)]);
    if (a.jobs) rows.push([`${icon('crew', 'xs')} Workers needed`, a.jobs, n && n.jobs]);
    if (a.grow) rows.push([`${icon('crew', 'xs')} Colonist growth`, `+${a.grow.toFixed(1)}/h`, n && `+${n.grow.toFixed(1)}/h`]);
    if (b === 'hub') { const lots = (l) => LAYOUTS.moon.lots.filter((x) => x.hq <= l).length; rows.push([`${icon('base', 'xs')} Colony lots`, lots(L), n && lots(next)], [`${icon('up', 'xs')} Max building level here`, L * 2, n && next * 2]); }
    if (b === 'launch') rows.push([`${icon('rocket', 'xs')} Simultaneous launches`, 1 + (L >= 10) + (L >= 18), n && 1 + (next >= 10) + (next >= 18)]);
    if (b === 'launch') rows.push([`${icon('rocket', 'xs')} Largest rocket class`, Math.min(9, Math.ceil(L / 2)), n && Math.min(9, Math.ceil(next / 2))]);
    return `<table class="stats">${rows.map(([k, v, w]) => `<tr><td>${k}</td><td>${v}</td>${n ? `<td class="nx">${w !== v ? '→ ' + w : ''}</td>` : ''}</tr>`).join('')}</table>`;
  }
  buildingInfo(st, lotDef, hq) {
    const s = this.s, d = BUILDINGS[st.b], R = this.app.R; const j = G.jobAt(s, this.app.base, this.sel);
    let h = `<div class="ptitle"><img src="${thumb(st.b, Math.max(1, st.lvl))}"><div><h2>${esc(d.name)}</h2><span class="lvl">Level ${st.lvl}<small> / ${G.levelCap(s, this.app.base, st.b)}${G.levelCap(s, this.app.base, st.b) < d.max ? ' (max ' + d.max + ')' : ''}</small></span></div></div><p class="desc">${esc(d.desc)}</p>`;
    if (j) {
      const left = Math.max(0, (j.end - Date.now()) / 1000);
      h += `<div class="job"><div class="jl">${j.from === 0 ? 'Constructing' : `Upgrading to level ${j.to}`} · <b id="jobLeft">${fmtTime(left)}</b></div><div class="pbar"><span id="jobBar"></span></div>
        <button class="btn gold" id="finishBtn" data-a="finish" data-job="${j.id}"></button>${this.app.adsOk() ? `<button class="btn ad" data-a="adskip" data-job="${j.id}">${icon('play', 'xs')} Watch an ad: −30 min</button>` : ''}<button class="btn ghost small" data-a="cancel" data-job="${j.id}">Cancel (50% refund)</button></div>`;
      h += this.statRows(st.b, Math.max(1, j.to), null, R.m);
      return h;
    }
    const cu = G.canUpgrade(s, this.app.base, this.sel); const next = st.lvl + 1;
    h += this.statRows(st.b, st.lvl, next <= d.max ? next : null, R.m);
    let reqH = ''; const reqs = cmdReqs(st.b, next, this.app.base); if (reqs.length && next <= d.max) { const miss = G.reqsMissing(s, this.app.base, st.b, next); reqH = `<div class="reqs"><b>Before level ${next}</b>${reqs.map(([b, n]) => { const ok = !miss.some(([x]) => x === b); return `<span class="${ok ? 'ok' : ''}">${icon(ok ? 'check' : 'lock', 'xs')} ${esc(BUILDINGS[b].name)} level ${n}</span>`; }).join('')}</div>`; }
    if (G.canDemolish(s, this.app.base, this.sel)) h += `<button class="btn ghost small demo" data-a="demolish">Demolish to free the lot (no refund)</button>`;
    if (cu.max) h += `<div class="maxed">${icon('star', 'xs')} Maximum level</div>`;
    else { const cost = G.costOf(st.b, next, R.m); const time = G.timeOf(st.b, next, R.m); const block = cu.hq || cu.crews;
      h += `<div class="upg">${reqH}<div class="costs">${Object.entries(cost).map(([r, n]) => `<span class="cost ${(s.res[r] || 0) < n ? 'short' : ''}" data-r="${r}" data-n="${n}" style="--rc:${RES[r].color}">${icon(r, 'xs')}${fmt(n)}</span>`).join('')}<span class="cost time">${icon('clock', 'xs')}${fmtTime(time)}</span></div>
        <button class="btn gold big" data-a="upgrade" data-need='${JSON.stringify(cost)}' data-block="${block ? 1 : 0}" ${cu.ok ? '' : 'disabled'}>${icon('up', 'xs')} Upgrade to level ${next}</button>${!cu.ok && (cu.hq || cu.crews) && !cu.reqs ? `<p class="why">${esc(cu.why)}</p>` : ''}</div>`; }
    return h;
  }
  buildMenu(lotDef) {
    const s = this.s, R = this.app.R, base = this.app.base; const hq = G.hqLevel(s, base);
    const ids = Object.keys(BUILDINGS).filter((b) => BUILDINGS[b].bases.includes(base) && (BUILDINGS[b].lot || null) === (lotDef.special || null) && BUILDINGS[b].size <= lotDef.size);
    const items = ids.map((b) => ({ b, c: G.canBuild(s, base, lotDef.id, b) })).sort((x, y) => (y.c.ok - x.c.ok) || ((y.c.why === 'Not enough resources') - (x.c.why === 'Not enough resources')));
    let h = `<div class="ptitle"><div><h2>${lotDef.special === 'pad' ? 'Launch Site' : 'Empty lot'}</h2><span class="muted">Choose what to build</span></div></div><div class="bmenu">`;
    for (const { b, c } of items) { const d = BUILDINGS[b]; const cnt = G.countOf(s, base, b), max = allowedCount(d, hq); const cost = G.costOf(b, 1, R.m); const locked = c.tech || (c.why && /Command level|Research/.test(c.why));
      h += `<button class="bcard ${c.ok ? '' : 'no'} ${locked ? 'locked' : ''}" data-a="build" data-b="${b}" ${c.ok ? '' : 'disabled'}><img src="${thumb(b)}"><b>${esc(d.name)}</b><i class="cat">${CATS[d.cat]} · ${cnt}/${max}</i>
        ${locked ? `<i class="why">${icon('lock', 'xs')} ${esc(c.why)}</i>` : `<span class="costs">${costHTML(cost, s)}<span class="cost time">${icon('clock', 'xs')}${fmtTime(G.timeOf(b, 1, R.m))}</span></span>${!c.ok ? `<i class="why">${esc(c.why)}</i>` : ''}`}</button>`; }
    return h + '</div>';
  }
  // ---------------- research ----------------
  openResearch() { this.app.setView('research'); }
  research() {
    const el = $('#overlay'); const s = this.s; el.className = 'on research';
    const br = Object.keys(BRANCHES); const tiers = Math.max(...Object.values(TECH).map((t) => t.tier));
    const CW = 178, NH = 54; const pos = {}; const cnt = {}; for (const id in TECH) { const t = TECH[id]; const k = br.indexOf(t.branch) + ':' + t.tier; cnt[k] = (cnt[k] || 0) + 1; }
    const tierTop = []; let y = 46; for (let T = 1; T <= tiers; T++) { tierTop[T] = y; let mx = 1; for (let c = 0; c < br.length; c++) mx = Math.max(mx, cnt[c + ':' + T] || 0); y += mx * NH + 22; }
    const used = {}; for (const id in TECH) { const t = TECH[id]; const c = br.indexOf(t.branch); const k = (used[c + ':' + t.tier] = (used[c + ':' + t.tier] || 0) + 1) - 1; pos[id] = { x: 12 + c * CW, y: tierTop[t.tier] + k * NH }; }
    const W = 12 + br.length * CW, H = y + 10;
    let lines = ''; for (const id in TECH) for (const r of TECH[id].req) { const a = pos[r], b = pos[id]; if (!a || !b) continue; const x1 = a.x + 80, y1 = a.y + 42, x2 = b.x + 80, y2 = b.y; lines += `<path d="M${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}" class="ln ${s.tech[r] ? 'on' : ''}"/>`; }
    let h = `<div class="ovh"><h1>${icon('research')} Research</h1><span class="muted" id="slotInfo"></span><button class="ibtn" data-a="closeov">${icon('x')}</button></div><div class="tree-wrap"><div class="tree" style="width:${W}px;height:${H}px">`;
    h += br.map((b, i) => `<div class="brh" style="left:${12 + i * CW}px;--bc:${BRANCHES[b].color}">${BRANCHES[b].name}</div>`).join('') + Array.from({ length: tiers }, (_, T) => `<div class="tierh" style="top:${tierTop[T + 1] - 18}px">TIER ${T + 1}</div>`).join('');
    h += `<svg class="lines" width="${W}" height="${H}">${lines}</svg>`;
    for (const id in TECH) { const t = TECH[id]; const p = pos[id]; h += `<button class="node" data-a="tech" data-t="${id}" style="left:${p.x}px;top:${p.y}px;--bc:${BRANCHES[t.branch].color}"><b>${esc(t.name)}</b><i></i><em></em></button>`; }
    h += `</div></div><div class="tdetail" id="tdetail"></div>`; el.innerHTML = h; this.researchLive(true); if (this.techSel) this.techDetail(this.techSel);
  }
  researchLive() {
    const s = this.s; const R = this.app.R; const si = $('#slotInfo'); if (!si) return; si.textContent = `${G.slotsBusy(s)} / ${G.slotsTotal(s, R.m)} research slots busy`;
    $$('.node').forEach((n) => { const id = n.dataset.t; const c = G.canResearch(s, id); const j = s.jobs.find((x) => x.kind === 'research' && x.tech === id);
      n.className = 'node ' + (s.tech[id] ? 'done' : j ? 'busy' : c.ok ? 'ready' : c.locked ? 'locked' : 'avail') + (this.techSel === id ? ' sel' : '');
      const it = n.querySelector('i'); if (s.tech[id]) it.textContent = 'Researched'; else if (j) it.textContent = fmtTime((j.end - Date.now()) / 1000); else { const cost = techCost(TECH[id]); it.textContent = `${fmt(cost.science)} SC · ${fmtTime(G.researchTimeOf(id, R))}`; }
      const em = n.querySelector('em'); em.style.width = j ? clamp((Date.now() - j.start) / (j.end - j.start)) * 100 + '%' : '0'; });
    if (this.techSel) this.techLive();
  }
  techDetail(id) { this.techSel = id; const t = TECH[id]; const el = $('#tdetail'); if (!el) return; const cost = techCost(t);
    const eff = []; const e = t.effect || {}; for (const r in e.mult || {}) eff.push(`${RES[r].name} +${Math.round(e.mult[r] * 100)}%`); if (e.gen) eff.push(`Energy +${Math.round(e.gen * 100)}%`); if (e.buildTime) eff.push(`Construction ${Math.round(e.buildTime * 100)}% faster`); if (e.researchTime) eff.push(`Research ${Math.round(e.researchTime * 100)}% faster`); if (e.cap) eff.push(`Storage +${Math.round(e.cap * 100)}%`); if (e.crews) eff.push(`+${e.crews} engineering crew`); if (e.slots) eff.push(`+${e.slots} research slot`); if (e.costs) eff.push(`Build costs −${Math.round(e.costs * 100)}%`); if (t.unlocks) eff.push(`Unlocks: ${t.unlocks}`);
    el.className = 'tdetail on'; el.style.setProperty('--bc', BRANCHES[t.branch].color);
    el.innerHTML = `<div class="td-t"><span class="br">${BRANCHES[t.branch].name} · Tier ${t.tier}</span><h2>${esc(t.name)}</h2><p>${esc(t.desc)}</p>${eff.length ? `<div class="eff">${eff.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}${t.req.length || t.hq ? `<p class="muted small">Requires: ${[...t.req.map((r) => esc(TECH[r].name)), ...(t.hq ? [`Mission Control level ${t.hq}`] : [])].join(', ')}</p>` : ''}</div>
      <div class="td-a"><div class="costs">${Object.entries(cost).map(([r, n]) => `<span class="cost" data-r="${r}" data-n="${n}" style="--rc:${RES[r].color}">${icon(r, 'xs')}${fmt(n)}</span>`).join('')}<span class="cost time">${icon('clock', 'xs')}<b id="tdTime"></b></span></div><button class="btn gold big" data-a="research" data-t="${id}" id="tdBtn"></button><p class="why" id="tdWhy"></p></div>`;
    this.techLive(); this.researchLive(); }
  techLive() { const s = this.s; const id = this.techSel; const c = G.canResearch(s, id); const b = $('#tdBtn'); if (!b) return; const j = s.jobs.find((x) => x.kind === 'research' && x.tech === id);
    $$('#tdetail .cost[data-r]').forEach((el) => el.classList.toggle('short', (s.res[el.dataset.r] || 0) < +el.dataset.n)); $('#tdTime').textContent = fmtTime(G.researchTimeOf(id, this.app.R));
    if (s.tech[id]) { b.disabled = true; b.innerHTML = `${icon('check', 'xs')} Researched`; $('#tdWhy').textContent = ''; return; }
    if (j) { const left = (j.end - Date.now()) / 1000; const dc = G.dmCost(left); b.disabled = false; b.dataset.a = 'finish'; b.dataset.job = j.id; b.innerHTML = dc ? `${icon('dm', 'xs')} Finish now · ${dc}` : `${icon('check', 'xs')} Finish now (free)`; $('#tdWhy').textContent = `In progress · ${fmtTime(left)} left`; return; }
    b.dataset.a = 'research'; b.disabled = !c.ok; b.innerHTML = `${icon('research', 'xs')} Start research`; $('#tdWhy').textContent = c.ok ? '' : c.why; }
  // ---------------- clicks ----------------
  click(e) {
    const t = e.target.closest('[data-a],[data-tab]'); if (!t) return; const A = this.app, s = this.s; A.audio.unlock();
    if (t.dataset.tab) { const v = t.dataset.tab; $('#basepick').className = 'basepick'; if (v === 'bases') { if (Object.keys(s.bases).length > 1 && (this.app.scene === 'earth' || this.app.scene === 'moon' || s.bases[this.app.scene])) { this.app.audio.play('tap'); this.bases(); return; } A.setView(Object.keys(s.bases).length > 1 ? A.base : 'earth'); return; } if (t.classList.contains('soon')) { this.toast(v === 'launch' ? 'Research Rocketry Fundamentals to open Launch Control' : v === 'orbit' ? 'Build the Launch Complex to watch your orbit fill up' : 'The Star Map opens with interplanetary travel (coming in a future update)', 'info'); return; } A.audio.play('tap'); A.setView(v); return; }
    const a = t.dataset.a; if (this.beyond.click(t)) return; if (this.war.click(t)) return; if (this.contact.click(t)) return; if (this.launch.click(t)) return; if (this.sys.click(t)) return; if (this.stars.click(t)) return;
    if (a === 'deselect') { if (this.app.scene === 'system') { if (this.app.mapMode === 'stars') this.selectStar(null); else this.selectBody(null); } else this.select(null); }
    if (a === 'build') { const r = G.startBuild(s, A.base, this.sel, t.dataset.b); if (r.ok) { A.audio.play('build'); this.toast(`Construction started: ${BUILDINGS[t.dataset.b].name}`, 'good'); A.changed(); } else this.toast(r.why, 'bad'); this.panelKey = ''; }
    if (a === 'upgrade') { const r = G.startUpgrade(s, A.base, this.sel); if (r.ok) { A.audio.play('build'); A.changed(); } else this.toast(r.why, 'bad'); this.panelKey = ''; }
    if (a === 'finish') { const r = G.speedup(s, t.dataset.job); if (r.ok) { A.audio.play('dm'); A.changed(); } else { this.toast(`${r.why}: need ${r.need} dark matter`, 'bad'); A.audio.play('deny'); } this.panelKey = ''; }
    if (a === 'adskip') A.rewarded(() => { G.skip(s, t.dataset.job, 1800); A.changed(); this.toast('30 minutes skipped', 'good'); });
    if (a === 'demolish') { if (t.dataset.sure) { const b = s.bases[A.base].lots[this.sel].b; if (G.demolish(s, A.base, this.sel)) { this.toast(`${BUILDINGS[b].name} demolished`, 'info'); A.changed(); this.panelKey = ''; } } else { t.dataset.sure = 1; t.textContent = 'Tap again to demolish'; t.classList.add('warn'); } return; }
    if (a === 'cancel') { if (t.dataset.sure) { G.cancel(s, t.dataset.job); A.changed(); this.panelKey = ''; } else { t.dataset.sure = 1; t.textContent = 'Tap again to cancel'; } }
    if (a === 'claim') { const st = G.claimStep(s); if (st) { A.audio.play('claim'); this.toast(`Objective complete! ${Object.entries(st.reward).map(([r, n]) => '+' + fmt(n) + ' ' + RES[r].name).join(', ')}`, 'gold'); A.changed(); } }
    if (a === 'research') { if (t.closest('#rslot') || t.id === 'rslot') { A.setView('research'); return; } const r = G.startResearch(s, t.dataset.t); if (r.ok) { A.audio.play('build'); A.changed(); this.techDetail(t.dataset.t); } else this.toast(r.why, 'bad'); }
    if (a === 'tech') { A.audio.play('tap'); this.techDetail(t.dataset.t); }
    if (a === 'closeov') A.setView('base');
    if (a === 'settings') this.settings();
    if (a === 'close') this.closeModal();
    if (a === 'reset') { if (t.dataset.sure) { A.reset(); } else { t.dataset.sure = 1; t.textContent = 'Tap again: erase everything'; } }
    if (a === 'day') { s.settings.dayNight = t.dataset.v; A.applySettings(); this.settings(); }
  }
  // ---------------- toasts & modals ----------------
  toast(text, kind = 'info') { const el = document.createElement('div'); el.className = 'toast ' + kind; el.innerHTML = esc(text); $('#toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 3400); setTimeout(() => el.remove(), 4000); while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove(); }
  modal(html, cls = '') { const m = $('#modal'); m.className = 'on ' + cls; m.innerHTML = `<div class="card">${html}</div>`; }
  closeModal() { const m = $('#modal'); m.className = ''; m.innerHTML = ''; }
  settings() { const st = this.s.settings; this.modal(`<h2>${icon('cog')} Settings</h2><label class="set">Sound effects<input type="range" min="0" max="1" step="0.05" value="${st.sfx}" data-set="sfx"></label><label class="set">Music<input type="range" min="0" max="1" step="0.05" value="${st.music}" data-set="music"></label>
    <div class="set">Day / night<div class="chips">${[['auto', 'Local time'], ['day', 'Always day'], ['night', 'Always night']].map(([v, n]) => `<button class="chip2 ${st.dayNight === v ? 'on' : ''}" data-a="day" data-v="${v}">${n}</button>`).join('')}</div></div>
    <p class="muted small">Starward runs in real time: construction and research continue while you are away. Version 1.0.</p><div class="row"><button class="btn ghost" data-a="reset">Reset progress</button><button class="btn gold" data-a="close">Done</button></div>`);
    $$('#modal [data-set]').forEach((el) => el.addEventListener('input', () => { st[el.dataset.set] = +el.value; this.app.applySettings(); })); }
}
