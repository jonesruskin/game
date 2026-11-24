// STARWARD: the Beyond screen. A map of the Local Group (real distances), the relay network and expeditions,
// Ascension and its perks, achievements, and a codex of everything discovered.
import { fundSig } from '../core/fund.js';
import { icon } from './icons.js';
import { fmt, fmtTime, esc, $, $$ } from '../util.js';
import { RES } from '../data/resources.js';
import { TECH } from '../data/research.js';
import { BODIES, BODY_ORDER } from '../data/solar.js';
import { STARS } from '../data/stars.js';
import * as BY from '../core/beyond.js';
import * as AL from '../core/aliens.js';
import { ist } from '../core/stars.js';
import { sol } from '../core/solar.js';

import { costTags, fundHTML, fundClick } from './fund.js';
const cost = costTags;
export class BeyondUI {
  constructor(ui) { this.ui = ui; this.tab = 'group'; }
  get app() { return this.ui.app; } get s() { return this.app.s; }
  open(tab) { if (tab) this.tab = tab; $('#overlay').className = 'on beyond'; this.render(); }
  render() {
    const s = this.s, el = $('#overlay'); const scroll = el.querySelector('.lc-body') ? el.querySelector('.lc-body').scrollTop : 0;
    const tabs = [['group', 'Local Group', 'map'], ['asc', 'Ascension', 'star'], ['ach', 'Achievements', 'check'], ['codex', 'Codex', 'book']];
    let h = `<div class="ovh"><h1>${icon('star')} Beyond</h1><span class="muted">${Object.keys(BY.bey(s).visited).length} galaxies reached · ${Object.keys(s.ach || {}).length}/${BY.ACHIEVEMENTS.length} achievements${BY.ascOf(s).count ? ' · ascended ×' + BY.ascOf(s).count : ''}</span><button class="ibtn" data-a="closeov">${icon('x')}</button></div><div class="lc-tabs">${tabs.map(([k, n, ic]) => `<button class="${this.tab === k ? 'on' : ''}" data-a="bytab" data-t="${k}">${icon(ic, 'xs')} ${n}</button>`).join('')}</div><div class="lc-body">`;
    h += this.tab === 'group' ? this.group() : this.tab === 'asc' ? this.asc() : this.tab === 'ach' ? this.ach() : this.codex();
    el.innerHTML = h + '</div>'; const b = el.querySelector('.lc-body'); if (b) b.scrollTop = scroll; if (this.tab === 'group') this.drawMap(); this.live();
  }
  group() {
    const s = this.s, B = BY.bey(s); const rc = BY.canRelay(s); const rj = s.jobs.find((j) => j.kind === 'relay'); const ej = s.jobs.find((j) => j.kind === 'expedition');
    let h = `<canvas id="lgMap" class="lgmap"></canvas><div class="lcard"><div class="lc-h"><b>${icon('orbit', 'xs')} ${esc(BY.RELAY.name)} · stage ${B.relay}/${BY.RELAY.stages}</b></div><p class="desc">The Hollow built relays on the paths between galaxies. Each stage we wake reaches one galaxy further.</p>`;
    h += !s.tech.relayNetwork ? `<p class="why">${icon('lock', 'xs')} Research ${esc(TECH.relayNetwork.name)}</p>` : rj ? `<p>Waking stage ${rj.stage + 1} · <b data-left="${rj.id}"></b></p>` : B.relay < BY.RELAY.stages ? `${fundHTML(s, 'relay', BY.relayCost(B.relay))}<div class="costs"><span class="cost time">${icon('clock', 'xs')}${fmtTime(rc.time || BY.RELAY.days * 86400)}</span></div><button class="btn gold small" data-a="relay" ${rc.ok ? '' : 'disabled'}>${icon('up', 'xs')} Wake stage ${B.relay + 1}</button>` : '';
    h += `</div><h3 class="orb">Expeditions</h3><div class="lc-grid">`;
    for (const id of BY.GALAXY_ORDER) { const G = BY.GALAXIES[id], E = BY.EXPEDITIONS[id]; const c = BY.canExpedition(s, id); const done = B.visited[id];
      h += `<div class="lcard ${done ? 'done' : BY.expOpen(s, id) ? '' : 'locked'}"><div class="lc-h"><b>${esc(G.name)}</b><i>${fmt(G.d)} ly</i></div><p class="muted small">${esc(G.fact)}</p><p><b>${esc(E.name)}</b>: ${esc(done ? E.story : 'Gift: ' + E.perkText)}</p>`;
      h += done ? `<p class="cur">${icon('check', 'xs')} ${esc(E.perkText)}</p>` : ej && ej.gal === id ? `<p>Under way · <b data-left="${ej.id}"></b></p>` : `${BY.expOpen(s, id) && B.relay >= E.relay && s.tech.intergalacticDrive ? fundHTML(s, 'exp:' + id, E.cost) : `<div class="costs">${cost(E.cost, s)}</div>`}<div class="costs"><span class="cost time">${icon('clock', 'xs')}${fmtTime(E.days * 86400)}</span></div>${c.ok || c.fund ? '' : `<p class="why small">${esc(c.why)}</p>`}<button class="btn gold small" data-a="expedition" data-g="${id}" ${c.ok ? '' : 'disabled'}>${icon('rocket', 'xs')} Launch the expedition</button>`;
      h += '</div>'; }
    return h + '</div>';
  }
  drawMap() { const cv = $('#lgMap'); if (!cv) return; const dpr = Math.min(2, devicePixelRatio || 1); const W = cv.clientWidth, H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; const c = cv.getContext('2d'); c.scale(dpr, dpr); const B = BY.bey(this.s);
    c.fillStyle = '#03060d'; c.fillRect(0, 0, W, H); for (let k = 0; k < 160; k++) { c.fillStyle = `rgba(255,255,255,${0.15 + ((k * 13) % 10) / 25})`; c.fillRect((k * 197) % W, (k * 89) % H, 1, 1); }
    const k = Math.min(W / 720, H / 300); const ox = W * 0.3, oy = H * 0.52; const P = (g) => [ox + g.x * k, oy + g.y * k];
    // relay lines
    let prev = BY.GALAXIES.milkyway; for (const id of BY.GALAXY_ORDER) { const g = BY.GALAXIES[id], E = BY.EXPEDITIONS[id]; const [x1, y1] = P(prev), [x2, y2] = P(g); c.strokeStyle = B.relay >= E.relay ? 'rgba(184,146,255,0.7)' : 'rgba(184,146,255,0.18)'; c.setLineDash(B.relay >= E.relay ? [] : [3, 5]); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.setLineDash([]); prev = g; }
    for (const id in BY.GALAXIES) { const g = BY.GALAXIES[id]; const [x, y] = P(g); const r = g.r * k * 0.9; const known = id === 'milkyway' || B.visited[id];
      const gr = c.createRadialGradient(x, y, 0, x, y, r * 1.4); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.15, g.col); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = known ? 1 : 0.55; c.fillStyle = gr; c.beginPath(); c.ellipse(x, y, r * 1.4, r * (g.kind === 'spiral' ? 0.55 : 0.9), -0.4, 0, 7); c.fill();
      if (g.kind === 'spiral') { c.strokeStyle = g.col + '88'; c.lineWidth = 1; for (let a = 0; a < 2; a++) { c.beginPath(); for (let t = 0; t < 3.5; t += 0.1) { const rr = r * 0.15 + t * r * 0.3; const ang = t + a * Math.PI; const px = x + Math.cos(ang) * rr * 1.2, py = y + Math.sin(ang) * rr * 0.45; t ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); } }
      c.globalAlpha = 1; c.fillStyle = known ? '#e9f4ff' : 'rgba(200,215,240,0.6)'; c.font = '600 11px Oxanium, sans-serif'; c.textAlign = 'center'; c.fillText(g.name, x, y + r + 14); if (id === 'milkyway') { c.fillStyle = '#ffd166'; c.fillText('You are here', x, y - r - 6); } }
    c.fillStyle = 'rgba(233,244,255,0.5)'; c.font = '500 11px Barlow, sans-serif'; c.textAlign = 'left'; c.fillText('The Local Group · about 10 million light-years across · not to scale', 10, H - 10); }
  asc() {
    const s = this.s, A = BY.ascOf(s); const pts = BY.ascensionPoints(s); let h = `<div class="lcard asc"><b>${icon('star', 'xs')} Ascension</b><p class="desc">Leave the whole programme behind and begin again on Earth: a new agency, a new launch pad. You keep your Ascension perks, achievements and dark matter, and gain Ascension points for everything you achieved this time.</p>`;
    h += `<p>Points banked: <b>${A.points}</b> · free to spend: <b>${BY.perkFree(s)}</b> · this run would add <b>${pts}</b></p>`;
    h += BY.canAscend(s) ? `<button class="btn gold big" data-a="ascend">${icon('star', 'xs')} Ascend (+${pts} points)</button>` : `<p class="why">${icon('lock', 'xs')} The Ascendants wait at the Far Shore, beyond Andromeda.</p>`;
    h += `</div><h3 class="orb">Perks <small>permanent, across every run</small></h3><div class="lc-grid">`;
    for (const id in BY.PERKS) { const P = BY.PERKS[id], n = A.spent[id] || 0; h += `<div class="lcard"><div class="lc-h"><b>${esc(P.name)}</b><i>rank ${n}/${P.max}</i></div><p class="desc">${esc(P.desc)}</p><button class="btn small" data-a="perk" data-p="${id}" ${n < P.max && BY.perkFree(s) >= P.cost ? '' : 'disabled'}>${icon('up', 'xs')} Buy rank · ${P.cost} point${P.cost > 1 ? 's' : ''}</button></div>`; }
    return h + '</div>';
  }
  ach() { const s = this.s; return `<div class="achs">${BY.ACHIEVEMENTS.map(([id, name, desc, dm]) => { const got = s.ach && s.ach[id]; return `<div class="achv ${got ? 'got' : ''}">${icon(got ? 'check' : 'lock', 'xs')}<span><b>${esc(name)}</b><i>${esc(desc)}</i></span><em>${icon('dm', 'xs')} ${dm}</em></div>`; }).join('')}</div>`; }
  codex() { const s = this.s, S = sol(s), I = ist(s), Aa = AL.al(s);
    const worlds = BODY_ORDER.filter((b) => S.surveyed[b] || BODIES[b].zone === 'home'); const stars = Object.keys(I.surveyed).filter((k) => !STARS[k].proc); const sp = Object.keys(Aa.known);
    const sec = (t, items) => `<div class="lcard"><b>${t} <small>(${items.length})</small></b><p class="codexl">${items.map((x) => `<span>${esc(x)}</span>`).join('') || '<i>Nothing yet.</i>'}</p></div>`;
    return `<div class="lc-grid">${sec('Worlds of the Solar System', worlds.map((b) => BODIES[b].name))}${sec('Star systems surveyed', stars.map((k) => STARS[k].name).concat(Object.keys(I.surveyed).length - stars.length > 0 ? [`+ ${Object.keys(I.surveyed).length - stars.length} catalogued systems`] : []))}${sec('Civilisations', sp.map((k) => AL.allSpecies()[k].name))}${sec('Alien life', Aa.codex.map((c) => `${c.name} (${c.world})`).concat(s.flags.europaLife ? ['Europan vent microbes (Europa)'] : []))}${sec('Galaxies', ['The Milky Way', ...Object.keys(BY.bey(s).visited).map((g) => BY.GALAXIES[g].name)])}</div>`; }
  live() { const s = this.s; const sig = fundSig(s); if (this.fsig !== undefined && sig !== this.fsig && !document.querySelector('#overlay .btn:hover')) { this.fsig = sig; this.render(); return; } this.fsig = sig; $$('#overlay [data-left]').forEach((e) => { const j = s.jobs.find((x) => x.id === e.dataset.left); if (j) e.textContent = fmtTime((j.end - Date.now()) / 1000); }); $$('#overlay .cost[data-r]').forEach((e) => e.classList.toggle('short', (s.res[e.dataset.r] || 0) < +e.dataset.n)); }
  click(t) { const A = this.app, s = this.s, a = t.dataset.a; const done = (r, msg) => { if (r.ok) { A.audio.play('claim'); this.ui.toast(msg, 'gold'); A.changed(); } else { this.ui.toast(r.why, 'bad'); A.audio.play('deny'); } this.render(); return true; };
    if (a === 'bytab') { this.tab = t.dataset.t; A.audio.play('tap'); this.render(); return true; }
    if (t.closest('#overlay') && fundClick(A, s, t)) { this.render(); return true; }
    if (a === 'relay') return done(BY.startRelay(s), 'The relay network stirs');
    if (a === 'expedition') return done(BY.startExpedition(s, t.dataset.g), `The expedition departs for ${BY.GALAXIES[t.dataset.g].name}`);
    if (a === 'perk') return done(BY.buyPerk(s, t.dataset.p), `${BY.PERKS[t.dataset.p].name} improved`);
    if (a === 'ascend') { if (t.dataset.sure) { A.ascend(); } else { t.dataset.sure = 1; t.innerHTML = 'Tap again: leave everything and begin again'; } return true; }
    return false; }
}
