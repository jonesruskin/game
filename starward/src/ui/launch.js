// STARWARD: Launch Control. Missions, satellites, the station and the rocket hangar.
import { icon } from './icons.js';
import { fmt, fmtTime, esc, $, $$, clamp, pct } from '../util.js';
import { RES } from '../data/resources.js';
import { ROCKETS, ROCKET_ORDER, SATS, MODULES, MISSIONS, ORBITS } from '../data/space.js';
import { TECH } from '../data/research.js';
import * as S from '../core/space.js';
import { rates } from '../core/econ.js';

const cost = (c, s) => Object.entries(c).map(([r, n]) => `<span class="cost ${(s.res[r] || 0) < n ? 'short' : ''}" data-r="${r}" data-n="${n}" style="--rc:${RES[r].color}">${icon(r, 'xs')}${fmt(n)}</span>`).join('');
const rw = (c) => Object.entries(c || {}).map(([r, n]) => `<span class="cost" style="--rc:${RES[r].color}">${icon(r, 'xs')}+${fmt(n)}</span>`).join('');
const effLine = (d, L) => { const o = []; for (const r in d.prod || {}) o.push(`+${fmt(d.prod[r][0] * Math.pow(d.prod[r][1], L - 1))} ${RES[r].name}/h`); if (d.gen) o.push(`+${fmt(d.gen[0] * Math.pow(d.gen[1], L - 1))} energy`); for (const r in d.mult || {}) o.push(`${RES[r].name} +${Math.round(d.mult[r] * L * 100)}%`); if (d.rel) o.push(`launch reliability +${(d.rel * L * 100).toFixed(1)}%`); if (d.flightCut) o.push(`flights ${Math.round(d.flightCut * L * 100)}% faster`); if (d.fuelCut) o.push(`mission fuel −${Math.round(d.fuelCut * L * 100)}%`); if (d.speed) o.push(`research +${Math.round(d.speed * L * 100)}%`); for (const r in d.cap || {}) o.push(`+${fmt(d.cap[r][0] * Math.pow(d.cap[r][1], L - 1))} ${RES[r].name} storage`); return o.join(' · '); };

export class LaunchUI {
  constructor(ui) { this.ui = ui; this.tab = 'missions'; }
  get app() { return this.ui.app; } get s() { return this.app.s; }
  open(tab) { if (tab) this.tab = tab; const el = $('#overlay'); el.className = 'on launch'; this.render(); }
  render() {
    const el = $('#overlay'); const s = this.s; const tabs = [['missions', 'Missions', 'flag'], ['sats', 'Satellites', 'target'], ['station', 'Station', 'base'], ['hangar', 'Hangar', 'rocket']];
    const scroll = el.querySelector('.lc-body') ? el.querySelector('.lc-body').scrollTop : 0;
    let h = `<div class="ovh"><h1>${icon('rocket')} Launch Control</h1><span class="muted" id="lcInfo"></span><button class="ibtn" data-a="closeov">${icon('x')}</button></div>
      <div class="lc-tabs">${tabs.map(([k, n, ic]) => `<button class="${this.tab === k ? 'on' : ''}" data-a="lctab" data-tab2="${k}">${icon(ic, 'xs')} ${n}</button>`).join('')}</div><div class="lc-flights" id="lcFlights"></div><div class="lc-body">`;
    if (!S.padLevel(s)) h += `<div class="empty">${icon('lock')} Build the <b>Launch Complex</b> on the launch site to fly missions.${s.tech.rocketry ? '' : ' Research <b>Rocketry Fundamentals</b> first.'}</div>`;
    else if (this.tab === 'missions') h += this.missions(); else if (this.tab === 'sats') h += this.sats(); else if (this.tab === 'station') h += this.station(); else h += this.hangar();
    el.innerHTML = h + '</div>'; const b = el.querySelector('.lc-body'); if (b) b.scrollTop = scroll; this.live();
  }
  live() {
    const s = this.s; const info = $('#lcInfo'); if (!info) return; info.textContent = `Pad ${S.launchesBusy(s)}/${S.launchSlots(s)} busy · largest rocket class ${S.maxClass(s)}`;
    const fl = s.jobs.filter((j) => j.kind === 'mission' || j.kind === 'rocket'); const F = $('#lcFlights'); const key = fl.map((j) => j.id).join();
    if (F.__k !== key) { F.__k = key; F.innerHTML = fl.map((j) => `<div class="fl" data-j="${j.id}"><span>${icon(j.kind === 'rocket' ? 'cog' : 'rocket', 'xs')} ${esc(j.kind === 'rocket' ? 'Assembling ' + ROCKETS[j.rocket].name : j.name)}</span><b></b><i></i><button class="mini" data-a="finish" data-job="${j.id}" title="Finish now with dark matter">${icon('dm', 'xs')}</button></div>`).join(''); }
    for (const j of fl) { const el = F.querySelector(`[data-j="${j.id}"]`); if (!el) continue; el.querySelector('b').textContent = fmtTime((j.end - Date.now()) / 1000); el.querySelector('i').style.width = clamp((Date.now() - j.start) / (j.end - j.start)) * 100 + '%'; }
    $$('#overlay .cost[data-r]').forEach((e) => e.classList.toggle('short', (s.res[e.dataset.r] || 0) < +e.dataset.n));
  }
  card(title, sub, body, act, cls = '') { return `<div class="lcard ${cls}"><div class="lc-h"><b>${title}</b>${sub ? `<i>${sub}</i>` : ''}</div>${body}${act || ''}</div>`; }
  missionBtn(payload, label) {
    const c = S.canLaunch(this.s, payload); const p = esc(JSON.stringify(payload));
    if (c.why === 'Research required') return `<div class="lc-a"><div class="costs">${cost(c.ms.cost, this.s)}<span class="cost time">${icon('clock', 'xs')}${fmtTime(c.ms.flight)}</span><span class="cost cls">CLASS ${c.ms.cls}</span></div></div>`;
    const relTxt = c.ok ? `${Math.round(c.rel * 100)}% success · ${ROCKETS[c.rocket].name}` : ''; const why = c.ok ? '' : c.why;
    return `<div class="lc-a"><div class="costs">${cost(c.ms.cost, this.s)}<span class="cost time">${icon('clock', 'xs')}${fmtTime(c.ms.flight)}</span><span class="cost cls">CLASS ${c.ms.cls}</span></div>${relTxt ? `<p class="rel">${relTxt}</p>` : ''}${why ? `<p class="why">${esc(why)}${c.rocket ? ` <button class="lnk" data-a="lctab" data-tab2="hangar">Open the hangar</button>` : ''}</p>` : ''}<button class="btn gold" data-a="launch" data-p="${p}" ${c.ok ? '' : 'disabled'}>${icon('rocket', 'xs')} ${label || 'Launch'}</button></div>`;
  }
  missions() {
    const s = this.s; let h = '';
    for (const id in MISSIONS) { const d = MISSIONS[id]; const done = S.sp(s).done[id] || 0; const locked = d.req.some((t) => !s.tech[t]) || (d.flags || []).some((f) => !s.flags[f]);
      if (locked && !d.req.every((t) => !t || TECH[t])) continue;
      const req = d.req.filter((t) => !s.tech[t]).map((t) => TECH[t].name);
      const status = d.kind !== 'repeat' && s.flags[d.flag] ? `<span class="tag ok">${icon('check', 'xs')} Accomplished</span>` : d.kind === 'repeat' ? `<span class="tag">Repeatable${done ? ' · flown ' + done + '×' : ''}</span>` : `<span class="tag story">Milestone</span>`;
      const body = `<p class="desc">${esc(d.desc)}</p><div class="rws">${rw(d.reward)}${d.firstReward && !done ? rw(d.firstReward) : ''}</div>${req.length ? `<p class="why">${icon('lock', 'xs')} Research: ${esc(req.join(', '))}</p>` : ''}`;
      h += this.card(esc(d.name), status, body, d.kind !== 'repeat' && s.flags[d.flag] ? '' : this.missionBtn({ mission: id }), (d.kind !== 'repeat' && s.flags[d.flag] ? 'done' : '') + (req.length ? ' locked' : '')); }
    return `<div class="lc-grid">${h}</div>`;
  }
  sats() {
    const s = this.s; let h = ''; const SP = S.sp(s);
    for (const orbit of ['leo', 'geo', 'lagrange']) { const n = S.slotsFor(s, orbit); const list = S.satsIn(s, orbit); if (!n) { h += `<h3 class="orb">${ORBITS[orbit].name} <small>locked: research Deep Space Navigation</small></h3>`; continue; }
      h += `<h3 class="orb">${ORBITS[orbit].name} <small>${ORBITS[orbit].alt} · ${list.length}/${n} slots</small></h3><div class="lc-grid">`;
      for (const x of list) { const d = SATS[x.type]; const idx = SP.sats.indexOf(x); h += this.card(`${esc(d.name)}`, `<span class="tag ok">Mk ${x.lvl} in orbit</span>`, `<p class="desc">${esc(d.desc)}</p><p class="cur">Now: ${effLine(d, x.lvl)}</p><p class="nx">Mk ${x.lvl + 1}: ${effLine(d, x.lvl + 1)}</p>`, this.missionBtn({ sat: x.type, idx }, `Launch Mk ${x.lvl + 1}`)); }
      if (list.length < n) { const types = Object.keys(SATS).filter((k) => SATS[k].orbit === orbit);
        for (const k of types) { const d = SATS[k]; const lock = !s.tech[d.req]; h += this.card(`${esc(d.name)}`, `<span class="tag">empty slot</span>`, `<p class="desc">${esc(d.desc)}</p><p class="nx">${effLine(d, 1)}</p>${lock ? `<p class="why">${icon('lock', 'xs')} Research ${esc(TECH[d.req].name)}</p>` : ''}`, lock ? '' : this.missionBtn({ sat: k }), lock ? 'locked' : ''); } }
      h += '</div>'; }
    return h;
  }
  station() {
    const s = this.s; const M = S.sp(s).modules; let h = `<p class="muted">Each module docks with a launch. Launching more of the same module expands it.</p><div class="lc-grid">`;
    for (const k in MODULES) { const d = MODULES[k]; const L = M[k] || 0; const lock = !s.tech[d.req];
      h += this.card(`${esc(d.name)}`, L ? `<span class="tag ok">Level ${L}${L >= d.max ? ' · max' : ''}</span>` : '<span class="tag">not built</span>', `<p class="desc">${esc(d.desc)}</p>${L ? `<p class="cur">Now: ${effLine(d, L)}</p>` : ''}${L >= d.max ? '' : `<p class="nx">${L ? 'Level ' + (L + 1) + ': ' : ''}${effLine(d, L + 1)}</p>`}${lock ? `<p class="why">${icon('lock', 'xs')} Research ${esc(TECH[d.req].name)}</p>` : ''}`, lock || L >= d.max ? '' : this.missionBtn({ module: k }, L ? 'Launch expansion' : 'Launch module'), lock ? 'locked' : ''); }
    return h + '</div>';
  }
  hangar() {
    const s = this.s; const SP = S.sp(s); let h = `<p class="muted">Rockets are assembled one at a time in the Vehicle Assembly building. Each mission uses the smallest rocket that can carry it.</p><div class="lc-grid">`;
    for (const id of ROCKET_ORDER) { const r = ROCKETS[id]; const c = S.canBuildRocket(s, id); const own = SP.rockets[id] || 0; const miss = r.req.filter((t) => !s.tech[t]);
      const body = `<div class="rk"><canvas class="rkc" data-rk="${id}" width="40" height="120"></canvas><div><p class="desc">${esc(r.desc)}</p><table class="stats small"><tr><td>Class</td><td>${r.cls}</td></tr><tr><td>Payload</td><td>${r.payload} t</td></tr><tr><td>Base reliability</td><td>${Math.round(r.rel * 100)}%</td></tr><tr><td>Needs</td><td>Pad ${r.pad}${r.vab ? ', VAB ' + r.vab : ''}</td></tr></table></div></div>`;
      const act = miss.length ? `<p class="why">${icon('lock', 'xs')} Research ${esc(miss.map((t) => TECH[t].name).join(', '))}</p>` : `<div class="lc-a"><div class="costs">${cost(S.rocketCost(s, id), s)}<span class="cost time">${icon('clock', 'xs')}${fmtTime(S.rocketTime(s, id))}</span></div>${c.ok ? '' : `<p class="why">${esc(c.why)}</p>`}<button class="btn gold" data-a="buildRocket" data-rk="${id}" ${c.ok ? '' : 'disabled'}>${icon('cog', 'xs')} Assemble</button></div>`;
      h += this.card(`${esc(r.name)} <small>· ${esc(r.role)}</small>`, `<span class="tag ${own ? 'ok' : ''}">${own} in hangar</span>`, body, act, miss.length ? 'locked' : ''); }
    h += '</div>'; setTimeout(() => this.drawRockets(), 0); return h;
  }
  drawRockets() { $$('canvas.rkc').forEach((cv) => { const r = ROCKETS[cv.dataset.rk]; const c = cv.getContext('2d'); const k = 100 / 118; const h = r.h * k, w = r.w * k; const x = 20, y = 112; c.clearRect(0, 0, 40, 120);
    const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, '#c9d0d8'); g.addColorStop(0.4, '#ffffff'); g.addColorStop(1, '#7d8794'); c.fillStyle = g; c.fillRect(x - w / 2, y - h, w, h); c.fillStyle = r.band; c.fillRect(x - w / 2, y - h * 0.3, w, 3); c.fillStyle = '#20252c'; c.fillRect(x - w / 2, y - h * 0.62, w, 2);
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - w / 2, y - h); c.quadraticCurveTo(x, y - h - w * 2, x + w / 2, y - h); c.fill(); c.fillStyle = '#596270'; c.beginPath(); c.moveTo(x - w / 2, y - 6); c.lineTo(x - w / 2 - 4, y); c.lineTo(x - w / 2, y); c.fill(); c.beginPath(); c.moveTo(x + w / 2, y - 6); c.lineTo(x + w / 2 + 4, y); c.lineTo(x + w / 2, y); c.fill(); }); }
  click(t) {
    const A = this.app, s = this.s; const a = t.dataset.a;
    if (a === 'lctab') { this.tab = t.dataset.tab2; A.audio.play('tap'); this.render(); return true; }
    if (a === 'buildRocket') { const r = S.startRocket(s, t.dataset.rk); if (r.ok) { A.audio.play('build'); this.ui.toast(`Assembling ${ROCKETS[t.dataset.rk].name}`, 'good'); A.changed(); } else this.ui.toast(r.why, 'bad'); this.render(); return true; }
    if (a === 'launch') { const p = JSON.parse(t.dataset.p); const r = S.launch(s, p); if (r.ok) { A.changed(); A.launched(r); } else { this.ui.toast(r.why, 'bad'); A.audio.play('deny'); this.render(); } return true; }
    return false;
  }
}
