// STARWARD: Star Map panels. Facts about each world, its launch window, survey probes, voyages (colonies,
// outposts, mining claims, gas-giant scoops, colonist transports) and the terraforming of Mars.
import { icon } from './icons.js';
import { fmt, fmtTime, esc, $, $$, clamp } from '../util.js';
import { RES } from '../data/resources.js';
import { TECH } from '../data/research.js';
import { BODIES, SITES, SHIPS, TERRA, ZONE_NAME, ZONE_CLASS, SITE_MAX } from '../data/solar.js';
import * as SO from '../core/solar.js';
import * as SP from '../core/space.js';
import { WORLDS } from '../render/planet.js';

const cost = (c, s) => Object.entries(c).map(([r, n]) => `<span class="cost ${(s.res[r] || 0) < n ? 'short' : ''}" data-r="${r}" data-n="${n}" style="--rc:${RES[r].color}">${icon(r, 'xs')}${fmt(n)}</span>`).join('');
const val = (c, L) => c[0] * Math.pow(c[1], L - 1);
export const siteLine = (d, L) => { const o = []; for (const r in d.prod || {}) o.push(`+${fmt(val(d.prod[r], L))} ${RES[r].name}/h`); if (d.gen) o.push(`+${fmt(val(d.gen, L))} energy`); if (d.fuelCut) o.push(`Mars voyages −${Math.round(d.fuelCut * L * 100)}% fuel`); if (d.travelCut) o.push(`Jovian voyages ${Math.round(d.travelCut * L * 100)}% faster`); return o.join(' · '); };

export class SystemUI {
  constructor(ui) { this.ui = ui; }
  get app() { return this.ui.app; } get s() { return this.app.s; }
  // the body panel (uses the shared #panel)
  open(id) { this.id = id; this.key = ''; this.render(); }
  render() {
    const s = this.s, id = this.id, p = $('#panel'); document.body.classList.toggle('panel-open', !!id); if (!id) { p.className = ''; p.innerHTML = ''; return; }
    const b = BODIES[id]; const S = SO.sol(s); p.className = 'on body'; const known = S.surveyed[id] || b.zone === 'home';
    let h = `<button class="close" data-a="deselect">${icon('x')}</button><div class="ptitle"><canvas class="bthumb" width="84" height="84" data-body="${id}"></canvas><div><h2>${esc(b.name)}</h2><span class="lvl">${esc(b.type)}${b.zone && ZONE_NAME[b.zone] ? ' · ' + ZONE_NAME[b.zone] : ''}</span></div></div>`;
    if (id === 'sun') { h += `<p class="desc">${esc(b.fact)}</p>`; p.innerHTML = h; return; }
    h += `<p class="desc">${esc(b.fact)}</p>`;
    const dist = b.parent ? `${fmt(b.orbit)} km from ${BODIES[b.parent].name}` : `${b.a} AU from the Sun`;
    h += `<table class="stats small"><tr><td>Radius</td><td>${fmt(b.r)} km</td></tr><tr><td>Gravity</td><td>${b.g} g</td></tr><tr><td>Day</td><td>${esc(b.day)}</td></tr><tr><td>Temperature</td><td>${esc(b.temp)}</td></tr><tr><td>Atmosphere</td><td>${esc(b.atm)}</td></tr><tr><td>Orbit</td><td>${dist}</td></tr></table>`;
    if (id === 'earth') h += `<button class="btn" data-a="goto" data-v="earth">${icon('earth', 'xs')} Visit Cape Horizon</button>`;
    else if (id === 'moon') h += s.bases.moon ? `<button class="btn" data-a="goto" data-v="moon">${icon('moon', 'xs')} Visit ${esc(s.bases.moon.name)}</button>` : `<p class="muted">Reach the Moon from Launch Control: the lunar landing, then the outpost.</p><button class="btn" data-a="lc" data-tab2="missions">${icon('rocket', 'xs')} Open Launch Control</button>`;
    else { h += `<div class="win" id="winLine"></div>`; h += !known ? this.surveyBlock(id) : this.presenceBlock(id); }
    p.innerHTML = h; this.key = this.keyOf(); this.thumb(); this.live();
  }
  keyOf() { const s = this.s, S = SO.sol(s), id = this.id; return JSON.stringify([id, S.surveyed[id], S.sites[id], !!s.bases[id], SO.terraStage(s, id), s.jobs.filter((j) => j.kind === 'voyage' || j.kind === 'terra' || j.kind === 'mission').map((j) => j.id), Object.keys(s.tech).length, JSON.stringify(S.ships)]); }
  // a small painted globe for the panel header (palette from the world's shader preset)
  thumb() { const cv = $('#panel canvas.bthumb'); if (!cv) return; const c = cv.getContext('2d'); const b = BODIES[this.id]; c.clearRect(0, 0, 84, 84);
    if (this.id === 'sun') { const g = c.createRadialGradient(42, 42, 0, 42, 42, 40); g.addColorStop(0, '#fffef0'); g.addColorStop(0.5, '#ffd76a'); g.addColorStop(0.75, 'rgba(255,150,40,0.6)'); g.addColorStop(1, 'rgba(255,120,30,0)'); c.fillStyle = g; c.fillRect(0, 0, 84, 84); return; }
    const W = WORLDS[b.world] || WORLDS.moon; const thick = W.p1[0] >= 1; const r = 30;
    c.save(); c.beginPath(); c.arc(42, 42, r, 0, 7); c.clip();
    if (W.p1[3] > 0) { for (let k = 0; k < 14; k++) { c.fillStyle = k % 2 ? W.high : W.low; c.fillRect(0, 12 + k * 4.3 + Math.sin(k) * 1.5, 84, 4.6); } if (this.id === 'jupiter') { c.fillStyle = W.deep; c.beginPath(); c.ellipse(52, 54, 7, 4, 0, 0, 7); c.fill(); } }
    else { const g = c.createLinearGradient(12, 12, 72, 72); g.addColorStop(0, thick ? W.cloud : W.peak); g.addColorStop(0.5, thick ? W.cloud : W.high); g.addColorStop(1, thick ? W.cloud : W.low); c.fillStyle = g; c.fillRect(0, 0, 84, 84);
      if (!thick && W.p0[0] > -1) { c.fillStyle = W.shallow; for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(20 + k * 13, 30 + (k % 3) * 14, 9, 6, k, 0, 7); c.fill(); } }
      if (W.p1[2] > 0.2) { c.fillStyle = 'rgba(0,0,0,0.18)'; for (let k = 0; k < 9; k++) { c.beginPath(); c.arc(18 + (k * 23) % 50, 20 + (k * 37) % 46, 2 + (k % 3) * 2, 0, 7); c.fill(); } } }
    const sh = c.createRadialGradient(30, 28, 4, 42, 42, r * 1.15); sh.addColorStop(0, 'rgba(255,255,255,0.25)'); sh.addColorStop(0.55, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,10,0.75)'); c.fillStyle = sh; c.fillRect(0, 0, 84, 84); c.restore();
    if (W.p1[1] > 0.3) { c.strokeStyle = W.atm; c.globalAlpha = 0.5; c.lineWidth = 2; c.beginPath(); c.arc(42, 42, r + 1, 0, 7); c.stroke(); c.globalAlpha = 1; }
    if (b.rings) { c.strokeStyle = 'rgba(230,210,170,0.8)'; c.lineWidth = 3; c.beginPath(); c.ellipse(42, 42, 40, 11, -0.25, 0, Math.PI); c.stroke(); } }
  surveyBlock(id) {
    const s = this.s; let h = `<div class="sec"><b>${icon('target', 'xs')} Unexplored</b><p class="muted">Send a robotic probe to map its resources, then you can build here.</p>`;
    if (!s.tech.planetaryProbes) return h + `<p class="why">${icon('lock', 'xs')} Research ${esc(TECH.planetaryProbes.name)}</p></div>`;
    return h + this.ui.launch.missionBtn({ probe: id }, 'Launch survey probe') + '</div>';
  }
  presenceBlock(id) {
    const s = this.s, b = BODIES[id], S = SO.sol(s); let h = '';
    if (b.presence === 'colony') {
      if (!s.bases[id]) { const C = SO.COLONY[id]; h += `<div class="sec"><b>${icon('base', 'xs')} Colony site: ${esc(C.name)}</b><p class="muted">A full settlement with its own buildings and colonists.${b.mult ? ' Rich in ' + Object.keys(b.mult).map((r) => RES[r].name.toLowerCase()).join(' and ') + '.' : ''}</p>${s.tech[C.tech] ? this.voyageBtn({ body: id, op: 'found' }, 'Send the founding expedition') : `<p class="why">${icon('lock', 'xs')} Research ${esc(TECH[C.tech].name)}</p>`}</div>`; }
      else { const B = s.bases[id]; const R = this.app.R.col[id] || { pop: B.pop, house: 0, staff: 1, grow: 0 };
        h += `<div class="sec"><b>${icon('base', 'xs')} ${esc(B.name)}</b><table class="stats small"><tr><td>Colonists</td><td><b id="popNow">${Math.floor(B.pop)}</b> / ${fmt(R.house)}</td></tr><tr><td>Growth</td><td>+${R.grow.toFixed(1)} per hour</td></tr><tr><td>Jobs filled</td><td>${Math.round(R.staff * 100)}%</td></tr></table><button class="btn" data-a="goto" data-v="${id}">${icon('base', 'xs')} Visit the colony</button>${this.voyageBtn({ body: id, op: 'transport' }, 'Send colonists')}</div>`;
        if (TERRA[id]) h += this.terraBlock(id); }
    } else if (SITES[id]) { const d = SITES[id]; const L = S.sites[id] || 0;
      h += `<div class="sec"><b>${icon('base', 'xs')} ${esc(d.name)}${L ? ' · level ' + L : ''}</b><p class="desc">${esc(d.role)}</p>`;
      if (L) h += `<p class="cur">Now: ${siteLine(d, L)}</p>`; if (L < SITE_MAX) h += `<p class="nx">${L ? 'Level ' + (L + 1) + ': ' : ''}${siteLine(d, L + 1)}</p>`;
      if (!s.tech[d.req]) h += `<p class="why">${icon('lock', 'xs')} Research ${esc(TECH[d.req].name)}</p>`; else if (L < SITE_MAX) h += this.voyageBtn({ body: id, op: L ? 'upgrade' : 'site' }, L ? `Supply run: level ${L + 1}` : 'Send the construction ship'); else h += `<div class="maxed">${icon('star', 'xs')} Maximum level</div>`;
      h += '</div>'; }
    return h;
  }
  terraBlock(id) {
    const s = this.s, T = TERRA[id], st = SO.terraState(s, id); const job = s.jobs.find((j) => j.kind === 'terra' && j.body === id);
    let h = `<div class="sec terra"><b>${icon('earth', 'xs')} Terraforming · stage ${st.n}/${st.of}</b><div class="tbar"><i style="width:${st.p * 100}%"></i></div><div class="tstats"><span>${st.temp} °C</span><span>${st.pressure} bar</span><span>${st.water}% ocean</span><span>${st.o2}% O₂</span></div>`;
    h += `<div class="stages">${T.stages.map((x, k) => `<span class="${k < st.n ? 'ok' : k === st.n ? 'now' : ''}" title="${esc(x.name)}">${k + 1}</span>`).join('')}</div>`;
    if (st.n >= st.of) return h + `<p class="cur">${icon('check', 'xs')} Mars has a living biosphere. Colonists walk outside with breather masks.</p></div>`;
    const x = T.stages[st.n]; h += `<p><b>${esc(x.name)}</b>: ${esc(x.desc)}</p>`;
    if (job) return h + `<div class="job"><div class="jl">Under way · <b id="terraLeft"></b></div><div class="pbar"><span id="terraBar"></span></div><button class="btn gold" data-a="finish" data-job="${job.id}">${icon('dm', 'xs')} Finish now</button></div></div>`;
    const c = SO.canTerra(s, id);
    return h + `<div class="lc-a"><div class="costs">${cost(x.cost, s)}<span class="cost time">${icon('clock', 'xs')}${fmtTime(SO.terraTime(s, id))}</span></div>${c.ok ? '' : `<p class="why">${esc(c.tech ? 'Research ' + TECH[c.tech].name : c.why)}</p>`}<button class="btn gold" data-a="terra" data-body="${id}" ${c.ok ? '' : 'disabled'}>${icon('earth', 'xs')} Begin stage ${st.n + 1}</button></div></div>`;
  }
  voyageBtn(P, label) {
    const s = this.s, c = SO.canVoyage(s, P); const pj = esc(JSON.stringify(P)); const ship = c.ship ? SHIPS[c.ship] : null;
    const time = c.ok ? c.time : SO.travelTime(s, P.body, SO.SHIP_ORDER.find((k) => SHIPS[k].cls >= c.ms.cls && (P.op !== 'transport' || SHIPS[k].carries)) || 'hermes');
    return `<div class="lc-a"><div class="costs">${cost(c.ms.cost, s)}<span class="cost time">${icon('clock', 'xs')}${fmtTime(time)}</span><span class="cost cls">CLASS ${c.ms.cls}</span></div>${ship ? `<p class="rel">${esc(ship.name)} · ${esc(ship.role)}${P.op === 'transport' ? ` · ${ship.carries} colonists` : ''}</p>` : ''}${c.ok ? '' : `<p class="why">${esc(c.tech ? 'Research ' + TECH[c.tech].name : c.why)}${c.ship ? ` <button class="lnk" data-a="lc" data-tab2="fleet">Open the shipyard</button>` : ''}</p>`}<button class="btn gold" data-a="voyage" data-p="${pj}" ${c.ok ? '' : 'disabled'}>${icon('rocket', 'xs')} ${esc(label)}</button></div>`;
  }
  live() {
    if (!this.id) return; const s = this.s; if (this.keyOf() !== this.key) { this.render(); return; }
    const wl = $('#winLine'); if (wl) { const w = SO.windowOf(this.id); const nx = SO.nextWindow(this.id); const pct = (x) => `${x < 1 ? '−' : '+'}${Math.round(Math.abs(1 - x) * 100)}%`;
      wl.className = 'win ' + (w.open ? 'open' : ''); wl.innerHTML = w.k === 0 ? '' : w.open ? `${icon('check', 'xs')} Launch window open: fuel ${pct(w.fuel)}, travel ${pct(w.time)}` : `${icon('clock', 'xs')} Window ${nx ? 'opens in ' + fmtTime(nx / 1000) : 'closed'} · right now fuel ${pct(w.fuel)}, travel ${pct(w.time)}`; }
    $$('#panel .cost[data-r]').forEach((e) => e.classList.toggle('short', (s.res[e.dataset.r] || 0) < +e.dataset.n));
    const j = s.jobs.find((x) => x.kind === 'terra' && x.body === this.id); if (j) { const el = $('#terraLeft'); if (el) el.textContent = fmtTime((j.end - Date.now()) / 1000); const bar = $('#terraBar'); if (bar) bar.style.width = clamp((Date.now() - j.start) / (j.end - j.start)) * 100 + '%'; }
    const pn = $('#popNow'); if (pn && s.bases[this.id]) pn.textContent = Math.floor(s.bases[this.id].pop);
  }
  click(t) {
    const A = this.app, s = this.s, a = t.dataset.a;
    if (a === 'voyage') { const P = JSON.parse(t.dataset.p); const r = SO.startVoyage(s, P); if (r.ok) { A.audio.play('launch'); this.ui.toast(`${SHIPS[r.ship].name} departs: ${r.ms.name} · arrives in ${fmtTime(r.time)}`, 'gold'); A.changed(); this.render(); } else { this.ui.toast(r.why, 'bad'); A.audio.play('deny'); } return true; }
    if (a === 'terra') { const r = SO.startTerra(s, t.dataset.body); if (r.ok) { A.audio.play('build'); this.ui.toast(`Terraforming: ${r.st.name} has begun`, 'gold'); A.changed(); this.render(); } else this.ui.toast(r.why, 'bad'); return true; }
    if (a === 'goto') { A.setView(t.dataset.v); return true; }
    if (a === 'lc') { A.setView('launch', t.dataset.tab2); return true; }
    return false;
  }
}
