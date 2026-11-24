// STARWARD: interstellar panels. Star systems (facts, planets, habitability), light-sail surveys, settling exoplanets,
// developing star colonies and choosing what they specialise in, wormhole gates, and the megastructures around Sol.
import { icon } from './icons.js';
import { fmt, fmtTime, esc, $, $$, clamp } from '../util.js';
import { RES } from '../data/resources.js';
import { TECH } from '../data/research.js';
import { STARS, CLASS, PTYPE, SPECS, MEGA, DRIVES, COLONY_MAX } from '../data/stars.js';
import * as ST from '../core/stars.js';

import { costTags, fundHTML, fundClick } from './fund.js';
const cost = costTags;
const outLine = (o) => Object.entries(o).filter(([, n]) => n > 0.05).map(([r, n]) => `+${fmt(n)} ${RES[r].name}/h`).join(' · ');
// a tiny painted world for planet rows
export function globe(type, size = 34) { const T = PTYPE[type]; const cv = document.createElement('canvas'); cv.width = cv.height = size * 2; const c = cv.getContext('2d'); const r = size * 0.9; const C = size;
  if (T.belt) { c.fillStyle = T.col[1]; for (let k = 0; k < 40; k++) { const a = k * 2.4, d = r * (0.5 + (k % 5) * 0.1); c.fillRect(C + Math.cos(a) * d, C + Math.sin(a) * d * 0.45, 2.5, 2.5); } return cv.toDataURL(); }
  c.save(); c.beginPath(); c.arc(C, C, r, 0, 7); c.clip();
  if (T.giant) for (let k = 0; k < 9; k++) { c.fillStyle = T.col[k % 2]; c.fillRect(0, k * (size * 2 / 9), size * 2, size * 2 / 9 + 1); }
  else { const g = c.createLinearGradient(0, 0, size * 2, size * 2); g.addColorStop(0, T.col[2]); g.addColorStop(0.5, T.col[1]); g.addColorStop(1, T.col[0]); c.fillStyle = g; c.fillRect(0, 0, size * 2, size * 2);
    if (type === 'temperate' || type === 'ocean') { c.fillStyle = type === 'ocean' ? '#2a6aa8' : '#2f6fa8'; for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(C - r * 0.4 + k * r * 0.35, C - r * 0.3 + (k % 2) * r * 0.6, r * 0.35, r * 0.22, k, 0, 7); c.fill(); } } }
  const sh = c.createRadialGradient(C - r * 0.4, C - r * 0.4, r * 0.1, C, C, r * 1.1); sh.addColorStop(0, 'rgba(255,255,255,0.25)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,10,0.75)'); c.fillStyle = sh; c.fillRect(0, 0, size * 2, size * 2); c.restore(); return cv.toDataURL(); }

export class StarsUI {
  constructor(ui) { this.ui = ui; }
  get app() { return this.ui.app; } get s() { return this.app.s; }
  open(id) { this.id = id; this.key = ''; this.render(); }
  keyOf() { const s = this.s, I = ST.ist(s); return JSON.stringify([this.id, I.surveyed[this.id], JSON.stringify(I.colonies), JSON.stringify(I.gates), JSON.stringify(I.ships), JSON.stringify(I.mega), s.jobs.filter((j) => ['sail', 'star', 'develop', 'gatebuild', 'drive'].includes(j.kind)).map((j) => j.id), Object.keys(s.tech).length]); }
  render() {
    const s = this.s, id = this.id, p = $('#panel'); document.body.classList.toggle('panel-open', !!id); if (!id) { p.className = ''; p.innerHTML = ''; return; }
    const st = STARS[id], cl = CLASS[st.cls], I = ST.ist(s); p.className = 'on body';
    let h = `<button class="close" data-a="deselect">${icon('x')}</button><div class="ptitle"><div class="starball" style="--sc:${cl.col}"></div><div><h2>${esc(st.name)}</h2><span class="lvl">${esc(cl.name)}${id !== 'sol' ? ' · ' + ST.dist(id).toFixed(1) + ' light-years' : ''}</span></div></div><p class="desc">${esc(st.fact)}</p>`;
    if (id === 'sol') { h += `<p class="muted">Tap the Sun on the Sol map to build megastructures.</p><button class="btn" data-a="maptog" data-m="sol">${icon('map', 'xs')} Back to the Solar System</button>`; p.innerHTML = h; this.key = this.keyOf(); return; }
    if (!I.surveyed[id]) { const c = ST.canSail(s, id); h += `<div class="sec"><b>${icon('target', 'xs')} Unsurveyed</b><p class="muted">${st.planets.length && !st.proc ? `Telescopes know of ${st.planets.length} world${st.planets.length > 1 ? 's' : ''} here. ` : ''}A light sail will map the system and reveal what is really there.</p>`;
      h += s.tech.laserSails ? `<div class="lc-a"><div class="costs">${cost(c.ms.cost, s)}<span class="cost time">${icon('clock', 'xs')}${fmtTime(c.ms.time)}</span></div>${c.ok ? '' : `<p class="why">${esc(c.why)}</p>`}<button class="btn gold" data-a="sail" data-star="${id}" ${c.ok ? '' : 'disabled'}>${icon('rocket', 'xs')} Launch a light sail</button></div>` : `<p class="why">${icon('lock', 'xs')} Research ${esc(TECH.laserSails.name)}</p>`;
      p.innerHTML = h + '</div>'; this.key = this.keyOf(); this.live(); return; }
    if (!st.planets.length) h += `<p class="muted">${icon('info', 'xs')} The survey found no planets worth settling: just dust and the star.</p>`;
    st.planets.forEach((pl, k) => { const T = PTYPE[pl.type]; const key = ST.ckey(id, k), C = I.colonies[key];
      h += `<div class="sec planet"><div class="prow"><img src="${globe(pl.type)}"><div><b>${esc(pl.name)}</b><i>${esc(T.name)}${pl.note ? ' · ' + esc(pl.note) : ''}</i><div class="hab"><span style="width:${pl.hab * 100}%"></span></div><small>Habitability ${Math.round(pl.hab * 100)}%${Object.keys(pl.res).length ? ' · rich in ' + Object.keys(pl.res).map((r) => RES[r].name.toLowerCase()).join(', ') : ''}</small></div></div>`;
      if (C) { const o = ST.colonyOut(s, key); const job = s.jobs.find((j) => j.kind === 'develop' && j.key === key);
        h += `<p class="cur">${icon('base', 'xs')} Colony · development ${C.lvl}/${COLONY_MAX} · ${outLine(o)}</p><div class="chips specs">${Object.keys(SPECS).map((sp) => `<button class="chip2 ${C.spec === sp ? 'on' : ''}" data-a="spec" data-key="${key}" data-spec="${sp}" title="${esc(SPECS[sp].desc)}">${SPECS[sp].name}</button>`).join('')}</div>`;
        if (job) h += `<div class="job"><div class="jl">Developing to ${job.to} · <b data-left="${job.id}"></b></div><div class="pbar"><span data-bar="${job.id}"></span></div><button class="btn gold small" data-a="finish" data-job="${job.id}">${icon('dm', 'xs')} Finish now</button></div>`;
        else if (C.lvl < COLONY_MAX) { const c = ST.canDevelop(s, key); h += `<div class="lc-a"><div class="costs">${cost(ST.devCost(C.lvl + 1), s)}<span class="cost time">${icon('clock', 'xs')}${fmtTime(ST.devTime(C.lvl + 1))}</span></div><button class="btn gold small" data-a="develop" data-key="${key}" ${c.ok ? '' : 'disabled'}>${icon('up', 'xs')} Develop to ${C.lvl + 1}</button></div>`; } }
      else { const c = ST.canFound(s, id, k); h += `<div class="lc-a"><div class="costs">${cost(c.cost, s)}${c.ok ? `<span class="cost time">${icon('clock', 'xs')}${fmtTime(c.time)}</span>` : ''}</div>${c.ok ? `<p class="rel">${esc(DRIVES[c.ship].name)} · ${esc(DRIVES[c.ship].role)}</p>` : `<p class="why">${esc(c.why)}${c.ship ? ` <button class="lnk" data-a="lc" data-tab2="fleet">Open the shipyard</button>` : ''}</p>`}<button class="btn gold small" data-a="found" data-star="${id}" data-p="${k}" ${c.ok ? '' : 'disabled'}>${icon('rocket', 'xs')} Send settlers</button></div>`; }
      h += '</div>'; });
    if (Object.values(I.colonies).some((C) => C.star === id)) { const g = ST.canGate(s, id); const gj = s.jobs.find((j) => j.kind === 'gatebuild' && j.star === id);
      h += `<div class="sec"><b>${icon('orbit', 'xs')} Wormhole gate${I.gates[id] ? ': open' : ''}</b>${I.gates[id] ? '<p class="cur">Voyages here take minutes; colonies trade 25% more.</p>' : gj ? `<p class="muted">Under construction · <b data-left="${gj.id}"></b></p>` : `<div class="lc-a"><div class="costs">${cost(ST.gateCost(), s)}<span class="cost time">${icon('clock', 'xs')}${fmtTime(3 * 86400)}</span></div>${g.ok ? '' : `<p class="why">${esc(g.why)}</p>`}<button class="btn small" data-a="gate" data-star="${id}" ${g.ok ? '' : 'disabled'}>${icon('orbit', 'xs')} Build a gate here</button></div>`}</div>`; }
    p.innerHTML = h; this.key = this.keyOf(); this.live();
  }
  // megastructures (shown on the Sun's panel in the Sol map)
  megaHTML() {
    const s = this.s; let h = ''; for (const id in MEGA) { const d = MEGA[id], n = ST.megaStage(s, id), job = s.jobs.find((j) => j.kind === 'mega' && j.mega === id);
      h += `<div class="sec"><b>${icon('star', 'xs')} ${esc(d.name)}${d.stages > 1 ? ` · stage ${n}/${d.stages}` : n ? ' · open' : ''}</b><p class="desc">${esc(d.desc)}</p>${d.stages > 1 ? `<div class="tbar"><i style="width:${(n / d.stages) * 100}%"></i></div>` : ''}`;
      if (id === 'laser' && n) h += `<p class="cur">Survey range ${ST.surveyRange(s)} ly · ${n} sail${n > 1 ? 's' : ''} at a time</p>`; if (id === 'dyson' && n) h += `<p class="cur">+${fmt(d.gen * n)} energy · +${fmt(d.prod.credits * n)} credits/h · +${fmt(d.prod.science * n)} science/h</p>`;
      if (!s.tech[d.req]) h += `<p class="why">${icon('lock', 'xs')} Research ${esc(TECH[d.req].name)}</p>`;
      else if (job) h += `<div class="job"><div class="jl">Stage ${job.stage + 1} under construction · <b data-left="${job.id}"></b></div><div class="pbar"><span data-bar="${job.id}"></span></div><button class="btn gold small" data-a="finish" data-job="${job.id}">${icon('dm', 'xs')} Finish now</button></div>`;
      else if (n < d.stages && d.fund) { const c = ST.canMega(s, id); h += `${fundHTML(s, 'mega:' + id, ST.megaCost(id, n))}<div class="lc-a"><div class="costs"><span class="cost time">${icon('clock', 'xs')}${fmtTime(ST.megaTime(id, n))}</span></div><button class="btn gold small" data-a="mega" data-mega="${id}" ${c.ok ? '' : 'disabled'}>${icon('up', 'xs')} ${n ? 'Build stage ' + (n + 1) : 'Begin construction'}</button></div>`; }
      else if (n < d.stages) { const c = ST.canMega(s, id); h += `<div class="lc-a"><div class="costs">${cost(ST.megaCost(id, n), s)}<span class="cost time">${icon('clock', 'xs')}${fmtTime(ST.megaTime(id, n))}</span></div><button class="btn gold small" data-a="mega" data-mega="${id}" ${c.ok ? '' : 'disabled'}>${icon('up', 'xs')} ${n ? 'Build stage ' + (n + 1) : 'Begin construction'}</button></div>`; }
      h += '</div>'; }
    return h;
  }
  live() { const s = this.s; if (this.id && this.keyOf() !== this.key) { this.render(); return; }
    $$('#panel [data-left]').forEach((el) => { const j = s.jobs.find((x) => x.id === el.dataset.left); if (j) el.textContent = fmtTime((j.end - Date.now()) / 1000); });
    $$('#panel [data-bar]').forEach((el) => { const j = s.jobs.find((x) => x.id === el.dataset.bar); if (j) el.style.width = clamp((Date.now() - j.start) / (j.end - j.start)) * 100 + '%'; });
    $$('#panel .cost[data-r]').forEach((e) => e.classList.toggle('short', (s.res[e.dataset.r] || 0) < +e.dataset.n)); }
  click(t) {
    if (t.closest('#panel') && fundClick(this.app, this.s, t)) { if (this.ui.sys.id === 'sun') this.ui.sys.render(); else this.render(); return true; }
    const A = this.app, s = this.s, a = t.dataset.a; const done = (r, msg, snd = 'build') => { if (r.ok) { A.audio.play(snd); this.ui.toast(msg, 'gold'); A.changed(); } else { this.ui.toast(r.why, 'bad'); A.audio.play('deny'); } if (this.id) this.render(); else this.ui.sys.render(); return true; };
    if (a === 'sail') return done(ST.startSail(s, t.dataset.star), `Light sail launched towards ${STARS[t.dataset.star].name}`, 'launch');
    if (a === 'found') { const r = ST.startFound(s, t.dataset.star, +t.dataset.p); return done(r, r.ok ? `${DRIVES[r.ship].name} departs for ${STARS[t.dataset.star].name} · ${fmtTime(r.time)}` : '', 'launch'); }
    if (a === 'develop') return done(ST.startDevelop(s, t.dataset.key), 'Colony development under way');
    if (a === 'spec') { ST.setSpec(s, t.dataset.key, t.dataset.spec); A.audio.play('tap'); A.changed(); this.render(); return true; }
    if (a === 'gate') return done(ST.startGate(s, t.dataset.star), 'Gate construction begins');
    if (a === 'mega') return done(ST.startMega(s, t.dataset.mega), `${MEGA[t.dataset.mega].name}: construction begins`);
    if (a === 'buildDrive') { const r = ST.startDrive(s, t.dataset.ship); if (r.ok) { A.audio.play('build'); this.ui.toast(`The shipyard lays the keel of a ${DRIVES[t.dataset.ship].name}`, 'good'); A.changed(); } else this.ui.toast(r.why, 'bad'); this.ui.launch.render(); return true; }
    if (a === 'maptog') { A.setMapMode(t.dataset.m); return true; }
    return false;
  }
}
