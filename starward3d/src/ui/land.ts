// Land mode: the whole 96 × 96 land around a base, seen from above. Tap a plot to see what is in it (or what the
// satellites think is in it), send a rover to survey it, or claim it and have the crews lay it out. With nothing
// selected the panel shows the landing site: what this ground is good for, the land you hold and what it draws, the
// rovers, the view from orbit and the weather.
import { ri } from './icons';
import { esc, fmt, fmtTime, clamp } from '../core/util';
import * as LD from '../core/land';
import * as G from '../core/game';
import { DEPOSITS, Site, sitesFor } from '../data/sites';
import { BUILDINGS, CHUNK, kindOf } from '../data/buildings';
import { bStats, lvlOf } from '../core/econ';
import type { UI } from './ui';
import { costHTML } from './ui';
const COLS = 'ABCDEFGHIJKLMNOP';
export const plotName = (cx: number, cz: number) => `${COLS[cx] || '?'}${cz + 1}`;
const boostNames = (t: string) => { const d = DEPOSITS[t]; const names = [...new Set(d.boosts.filter((b) => BUILDINGS[b]).map((b) => BUILDINGS[b].name))]; return names.join(', '); };
const effect = (t: string) => { const d = DEPOSITS[t]; return d.prod ? `×${d.prod} output` : d.gen ? `×${d.gen} power` : d.house ? `×${d.house} housing, storm-proof` : ''; };
export const pips = (n: number, cls = '') => `<span class="pips ${cls}">${[1, 2, 3].map((k) => `<i class="${n >= k ? 'on' : ''}"></i>`).join('')}</span>`;
// a site's character as a row of labelled pips (shared with the landing-site picker)
export function siteStats(x: Site) { const rows: [string, number, string?][] = [['💧 Ice', x.ice], ['⛏ Ore', x.ore], ['✦ Rare', x.rare], ['☀ Sun', x.sun], ['⛰ Shelter', x.shelter]]; if (x.he3) rows.push(['He-3', x.he3]); if (x.methane) rows.push(['Methane', x.methane]); if (x.geo) rows.push(['♨ Geothermal', x.geo]); rows.push(['🌪 Storms', x.storm, 'bad']);
  return `<div class="sitestats">${rows.map(([n, v, c]) => `<span>${n} ${pips(v, c)}</span>`).join('')}${x.terra ? `<span class="good">🌱 Terraforms ${Math.round(x.terra * 100)}% faster</span>` : ''}</div>`; }
export class LandUI {
  constructor(private ui: UI) {}
  get s() { return this.ui.app.s; } get A() { return this.ui.app; } get W() { return this.ui.app.world; }
  get on() { return !!this.W?.land?.mode; }
  available() { const s = this.s; return s.at !== 'earth' || G.hqLevel(s) >= 2 || Object.keys(s.bases.earth.claims || {}).length > 0; }
  open() { const W = this.W; if (W.mode !== 'base') return; this.ui.select(null); W.land.setMode(true); W.land.sync(this.s, this.s.at); this.saved = { x: W.cam.tx, z: W.cam.tz, d: W.cam.tdist }; W.focus(0, 10, 132); document.body.classList.add('landmode'); this.A.audio.play('whoosh'); this.ui.renderNav(); this.ui.renderPanel(); }
  close() { const W = this.W; W.land.setMode(false); W.land.sync(this.s, this.s.at); if (this.saved) W.focus(this.saved.x, this.saved.z, this.saved.d); this.saved = null; document.body.classList.remove('landmode'); this.ui.renderNav(); this.ui.renderPanel(); }
  private saved: { x: number; z: number; d: number } | null = null;
  tapCell(x: number, z: number) { const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK); if (cx < 0 || cz < 0 || cx >= LD.NCH || cz >= LD.NCH) return; this.W.land.select(cx, cz); this.W.land.sync(this.s, this.s.at); this.A.audio.play('tap'); this.ui.renderPanel(); }
  navHTML() { return '<button data-a="landDone"><span class="g">✓</span>Done</button><button data-a="landSite"><span class="g">📍</span>Site</button><button data-a="landGuide"><span class="g">📖</span>Deposits</button>'; }
  private job(kind: string, cx: number, cz: number) { return this.s.jobs.find((j) => j.kind === kind && j.base === this.s.at && j.key === cx + ',' + cz); }
  private prog(j: any, label: string) { const c = G.dmCost((j.end - Date.now()) / 1000); return `<div class="box"><div class="row"><b class="grow ox">${esc(label)}</b><b data-left="${j.id}">${fmtTime((j.end - Date.now()) / 1000)}</b></div><div class="bar" style="margin:6px 0"><i data-bar="${j.id}" style="width:${clamp((Date.now() - j.start) / (j.end - j.start)) * 100}%"></i></div><button class="btn gold small" data-a="finish" data-job="${j.id}" data-dm="${j.id}">${c ? `${c} dark matter: finish now` : 'Finish (free)'}</button></div>`; }
  private stormLine(base: string) { const s = this.s, st = LD.stormAt(s, base), site = LD.siteOf(s, base); if (!site?.storm) return `<div class="meta">🌤 ${base === 'earth' ? 'Fair weather on the coast.' : 'No storms at this site.'}</div>`;
    if (st) return `<div class="box warn">🌪 <b>${LD.stormName(s, base)}</b>, ends in ${fmtTime((st.end - Date.now()) / 1000)}. Exposed solar panels make ${Math.round(22 * st.k)}% less, other work slows ${Math.round(4 * st.k)}%. Buildings on natural shelter carry on.</div>`;
    const soon = LD.hintLevel(s, base) >= 1 && LD.stormSoon(s, base); return `<div class="meta">${soon ? '⚠ <b>Storm warning:</b> the relays see a storm front less than an hour away.' : `🌤 Clear for now. Storms here: ${['rare', 'occasional', 'frequent', 'almost daily'][site.storm]}.`}</div>`; }
  private orbitLine(base: string) { const hl = LD.hintLevel(this.s, base); const how = base === 'earth' ? (hl < 2 ? 'Put more satellites in orbit (3 or more) to see every kind of deposit from space.' : '') : base.includes(':') ? (hl < 2 ? 'The view from orbit sharpens as the colony grows (level 3, then 6).' : '') : hl < 2 ? `Build ${hl ? 'up' : ''} a relay network over this world (Map, then the world's relays): level 1 shows ice and ore, level 3 everything.` : '';
    return `<div class="meta">🛰 From orbit: ${['nothing yet', 'ice and ore show up as hints', 'every kind of deposit shows up as a hint'][hl]}. ${esc(how)}</div>`; }
  // what a deposit would do for the buildings you could put on it, in real numbers (your own best level of each)
  private boostRows(t: string) { const s = this.s, base = s.at, D = DEPOSITS[t], k = kindOf(base); const list = [...new Set(D.boosts)].filter((b) => BUILDINGS[b] && BUILDINGS[b].bases.includes(k)); const A = this.A;
    if (!list.length) return `<div class="meta">Nothing that can be built here uses it${t === 'shelter' ? '' : ' yet'}.</div>`;
    return `<div class="boosts">${list.map((b) => { const mine = lvlOf(s, base, b), L = Math.max(1, mine); const st = bStats(b, L, A.R.m); const g: string[] = [];
      if (D.prod) for (const r in st.prod) if (st.prod[r] > 0) g.push(`${ri(r)} +${fmt(st.prod[r] * (D.prod - 1))}/h`); if (D.gen && st.gen > 0) g.push(`${ri('energy')} +${fmt(st.gen * (D.gen - 1))}`); if (D.house && st.house > 0) g.push(`🏠 +${fmt(st.house * (D.house - 1))} people`);
      return `<div class="boost"><img src="${A.studio.building(b, L, A.world.look)}" alt=""><div><b>${esc(BUILDINGS[b].name)}</b><i>${mine ? `Your level ${L} here` : 'A new one here'}: ${g.join(' ') || 'works harder'} more</i></div><span class="mult">×${D.prod || D.gen || D.house}</span></div>`; }).join('')}${t === 'shelter' ? '<div class="meta">🌪 And storms pass over anything built on it.</div>' : ''}</div>`; }
  panelHTML() { const s = this.s, base = s.at, B = s.bases[base]; const sel = this.W.land.sel; if (!sel) return this.siteHTML();
    const [cx, cz] = sel; const I = LD.plotInfo(s, base, cx, cz); const status = I.core ? 'Core land around the command building' : I.claimed ? 'Your land' : I.edge ? 'Partly inside the core: claim it to build across all of it' : I.surveyed ? 'Surveyed, not yet claimed' : 'Unsurveyed';
    let h = `<button class="ibtn x" data-a="landSite">✕</button><h2>Plot ${plotName(cx, cz)}</h2><div class="sub">${status} · ${esc(B.name)}</div>`;
    const found = Object.keys(I.found).sort((a, b) => I.found[b] - I.found[a]);
    if (I.surveyed) h += found.length ? `<div class="deps">${found.map((t) => `<div class="dep" style="--c:${DEPOSITS[t].col}"><b>${esc(DEPOSITS[t].name)}</b> <span class="muted">${I.found[t]} cells</span><div class="meta">${esc(DEPOSITS[t].desc)}</div>${this.boostRows(t)}</div>`).join('')}</div>` : `<p class="desc">${LD.noGround(s, base) ? 'Open air: a plot here becomes a new deck module under its own lifting envelope.' : 'Nothing under the surface here: plain building ground.'}</p>`;
    else h += I.hints.length ? `<p class="desc">Seen from orbit: ${I.hints.map((t) => `<b style="color:${DEPOSITS[t].col}">${esc(DEPOSITS[t].name)}?</b>`).join(', ')}. Survey it to find exactly where.</p>` : `<p class="desc">Nobody knows what is down there. Send a rover to find out.</p>${this.orbitLine(base)}`;
    if (!I.surveyed) { const j = this.job('prospect', cx, cz); if (j) h += this.prog(j, 'Rover surveying'); else { const c = LD.canSurvey(s, base, cx, cz);
        h += `<div class="box"><div class="row"><b class="grow ox">🚙 Survey</b>${c.time || c.cost ? this.ui.timeHTML(c.time || LD.surveyTime(s, base)) : ''}</div><div class="meta">A rover drives survey lines across the plot with ground radar and a drill. ${s.jobs.filter((x) => x.kind === 'prospect').length}/${LD.maxRovers(s)} rovers out; they reach ${LD.roverRange(s, base)} plots past your land.</div>${c.cost ? `<div class="cost">${costHTML(c.cost, s.res)}</div>${this.ui.needHTML(c.cost)}` : ''}<button class="btn ${c.ok ? 'gold' : ''}" style="width:100%" data-a="lSurvey" ${c.ok || c.cost ? '' : 'disabled'}>${c.ok ? 'Send a rover' : esc(c.why || '')}</button></div>`; } }
    if (I.surveyed && !I.owned) { const j = this.job('claim', cx, cz); if (j) h += this.prog(j, 'Crews laying out the plot'); else { const c = LD.canClaim(s, base, cx, cz);
        h += `<div class="box"><div class="row"><b class="grow ox">🚩 Claim</b>${c.time || c.cost ? this.ui.timeHTML(c.time || LD.claimTime(s, base)) : ''}</div><div class="meta">Construction drones grade the ground and run roads, power and pipes out to it. Every plot you hold draws <b>${ri('energy')} ${LD.claimDraw(s, base)}</b> energy for ever.</div>${c.cost ? `<div class="cost">${costHTML(c.cost, s.res)}</div>${this.ui.needHTML(c.cost)}` : ''}<button class="btn ${c.ok ? 'gold' : ''}" style="width:100%" data-a="lClaim" ${c.ok || c.cost ? '' : 'disabled'}>${c.ok ? 'Claim this plot' : esc(c.why || '')}</button></div>`; } }
    if (I.owned) { const n = B.items.filter((it) => Math.floor(it.x / CHUNK) === cx && Math.floor(it.z / CHUNK) === cz).length; h += `<div class="meta">${n ? `${n} building${n > 1 ? 's' : ''} stand here.` : 'Empty and ready to build on.'}${found.length ? ' Build on a deposit to use it: moving a building onto one is free.' : ''}</div>`; }
    return h; }
  siteHTML() { const s = this.s, base = s.at, B = s.bases[base], site = LD.siteOf(s, base); const n = Object.keys(B.claims || {}).length, nd = LD.drawnClaims(s, base), draw = LD.claimDraw(s, base);
    const rov = s.jobs.filter((j) => j.kind === 'prospect').length;
    return `<h2>${esc(site?.name || B.name)}</h2><div class="sub">${esc(B.name)} · Land</div>${site ? `<p class="desc">${esc(site.desc)}</p>${siteStats(site)}` : ''}
      <div class="box"><div class="row"><b class="grow">🚩 Land claimed</b><b class="ox">${n} plot${n === 1 ? '' : 's'}</b></div><div class="meta">${n ? `They draw ${ri('energy')} ${fmt(nd * draw)} energy (${draw} each${nd < n ? `; ${n - nd} now inside the core draw nothing` : ''}).` : 'Only the core land around the command building so far.'} Next claim: ${costHTML(LD.claimCost(s, base))}</div></div>
      <div class="box"><div class="row"><b class="grow">🚙 Rovers</b><b class="ox">${rov}/${LD.maxRovers(s)} out</b></div><div class="meta">Survey range: ${LD.roverRange(s, base)} plots past your land. ${LD.noGround(s, base) ? 'Nothing to survey here: open air.' : ''}</div></div>
      ${LD.canResite(s, base).ok ? '<button class="btn" style="width:100%" data-a="lResite">📍 Move the landing site</button>' : ''}${this.orbitLine(base)}${this.stormLine(base)}
      <p class="meta">Tap any plot. <span style="color:#6ee7ff">Blue dashes</span>: the rovers can survey it. <span style="color:#5dff9a">Green dashes</span>: surveyed and next to your land, ready to claim. Dark: out of reach.</p>`; }
  // the landing sites of a world not yet settled (Solar System map, star colonies): scout before you commit
  scoutHTML(body: string, planetType?: string) { const L = sitesFor(body, planetType); if (L.length < 2) return ''; return `<details class="box scout"><summary><b class="ox">📍 ${L.length} landing sites</b> <span class="muted">tap to compare</span></summary><div class="sites">${L.map((x) => `<div class="site"><b>${esc(x.name)}</b><div class="meta">${esc(x.desc)}</div>${siteStats(x)}</div>`).join('')}</div></details>`; }
  // choose (or move) the landing site of a new colony
  sitePickHTML(base: string) { const s = this.s, B = s.bases[base]; const L = LD.siteList(s, base), cur = LD.siteOf(s, base); const first = !B.site;
    return `<h1>${first ? 'Where do we set down?' : 'Move the landing site'}</h1><p class="desc">${first ? `The lander carrying ${esc(B.name)} is holding in orbit.` : 'Nothing has been built yet, so the lander can still lift off and set down somewhere else.'} The ground decides what lies under the colony, how much sun the panels catch and how often storms come. You can move it until you start building.</p>
      <div class="sites">${L.map((x) => `<button class="site ${x.id === cur?.id ? 'on' : ''}" data-a="lPickSite" data-k="${esc(x.id)}" data-b="${esc(base)}"><b>${esc(x.name)}</b>${x.id === cur?.id ? ' <span class="muted">· current</span>' : ''}<div class="meta">${esc(x.desc)}</div>${siteStats(x)}</button>`).join('')}</div>`; }
  guideHTML() { const A = this.A; return `<h1>What lies in the ground</h1><p class="desc">Where you land decides what you find. Survey plots to reveal deposits, then build on them: a building standing on a deposit it can use works harder.</p><div class="deps guide">${Object.keys(DEPOSITS).map((t) => `<div class="dep" style="--c:${DEPOSITS[t].col}"><div class="row"><b class="grow">${esc(DEPOSITS[t].name)}</b><span class="mult">${effect(t)}</span></div><div class="meta">${esc(DEPOSITS[t].desc)}</div><div class="thumbs">${[...new Set(DEPOSITS[t].boosts)].filter((b) => BUILDINGS[b]).map((b) => `<span title="${esc(BUILDINGS[b].name)}"><img src="${A.studio.building(b, 3, A.world.look)}" alt=""><i>${esc(BUILDINGS[b].name)}</i></span>`).join('')}</div></div>`).join('')}</div><p class="meta">Natural shelter also keeps dust storms off anything built on it. Sunny sites make every solar panel stronger, stormy sites weaker.</p><div class="row" style="justify-content:center"><button class="btn gold" data-a="closeModal">Got it</button></div>`; }
  // building panel: what the ground under a building does for it
  groundLine(base: string, it: { b: string; x: number; z: number; r: number }) { const b = LD.bonusOf(this.s, base, it as any); if (!b.types.length) return ''; const useful = b.types.filter((t) => DEPOSITS[t].boosts.includes(it.b)); const other = b.types.filter((t) => !useful.includes(t) && t !== 'shelter');
    return `<div class="meta">⛏ Standing on ${b.types.map((t) => `<b style="color:${DEPOSITS[t].col}">${esc(DEPOSITS[t].name)}</b>`).join(', ')}.${useful.length ? ` <b class="good">${useful.map(effect).join(', ')}</b>.` : ''}${b.shelter ? ' Sheltered from storms.' : ''}${other.length && !useful.length ? ` Of no use to this building: ${esc(boostNames(other[0]))} could use it.` : ''}</div>`; }
  // what the ground under a building being placed would do for it (shown while placing)
  ghostLine(base: string, b: string, x: number, z: number, r: number) { const t = LD.bonusOf(this.s, base, { id: '', b, x, z, r, lvl: 1 } as any); const useful = t.types.filter((k) => DEPOSITS[k].boosts.includes(b)); return useful.length ? `On ${DEPOSITS[useful[0]].name}: ${effect(useful[0])}` : t.shelter ? 'On natural shelter: storm-proof' : ''; }
  act(a: string, t: HTMLElement): boolean { const s = this.s, A = this.A, sel = this.W.land?.sel;
    switch (a) {
      case 'land': this.open(); return true;
      case 'landDone': this.close(); return true;
      case 'landSite': this.W.land.sel = null; this.W.land.setMode(true); this.W.land.sync(s, s.at); this.ui.renderPanel(); return true;
      case 'landGuide': this.ui.modal(this.guideHTML(), { wide: true }); A.audio.play('tap'); return true;
      case 'lResite': this.ui.modal(this.sitePickHTML(s.at), { wide: true }); A.audio.play('tap'); return true;
      case 'lPickSite': { const base = t.dataset.b || s.at; const r = LD.setSite(s, base, t.dataset.k!); if (!r.ok) { this.ui.deny(r.why); return true; } A.audio.play('place'); this.ui.closeModal(); this.ui.toast(`Landing at ${esc(LD.siteOf(s, base).name)}`, 'gold'); A.changed(); this.ui.renderHud(); if (this.on) this.ui.renderPanel(); return true; }
      case 'lSurvey': { if (!sel) return true; const r = LD.startSurvey(s, s.at, sel[0], sel[1]); if (r.ok) { A.audio.play('buy'); this.ui.toast(`A rover is on its way to plot ${plotName(sel[0], sel[1])}`, 'good'); A.changed(); } else this.ui.deny(r.why); this.ui.renderPanel(); return true; }
      case 'lClaim': { if (!sel) return true; const r = LD.startClaim(s, s.at, sel[0], sel[1]); if (r.ok) { A.audio.play('build'); this.ui.toast(`Crews are laying out plot ${plotName(sel[0], sel[1])}`, 'good'); A.changed(); } else this.ui.deny(r.why); this.ui.renderPanel(); return true; }
    }
    return false; }
}
