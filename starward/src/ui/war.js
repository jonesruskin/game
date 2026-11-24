// STARWARD: Fleet Command. Incoming raids (with time to impact, the scouted enemy, and an intercept order), the navy
// and the war docks, defences for every world, the campaign against the Kr'thul hives, and battle reports with replays.
import { icon } from './icons.js';
import { fmt, fmtTime, esc, $, $$, clamp } from '../util.js';
import { RES } from '../data/resources.js';
import { TECH } from '../data/research.js';
import { STARS } from '../data/stars.js';
import * as W from '../core/war.js';
import { BattleReplay, drawUnit } from '../render/battle.js';

const cost = (c, s) => Object.entries(c).map(([r, n]) => `<span class="cost ${(s.res[r] || 0) < n ? 'short' : ''}" data-r="${r}" data-n="${n}" style="--rc:${RES[r].color}">${icon(r, 'xs')}${fmt(n)}</span>`).join('');
const compLine = (c) => Object.entries(c).filter(([, n]) => n > 0).map(([k, n]) => `${fmt(n)} ${W.UNIT(k).name}${n > 1 && !W.UNIT(k).name.endsWith('s') ? 's' : ''}`).join(', ') || 'nothing';
const unitImg = (k, dir = 1) => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'); drawUnit(c, k, 32, 32, 2, dir); return cv.toDataURL(); };
const IMG = {}; const uimg = (k, d) => IMG[k + d] || (IMG[k + d] = unitImg(k, d));
export class WarUI {
  constructor(ui) { this.ui = ui; this.n = {}; }
  get app() { return this.ui.app; } get s() { return this.app.s; }
  open() { $('#overlay').className = 'on war'; this.render(); }
  placeName(key) { if (key === 'home') return 'Sol (home)'; const s = this.s; if (s.bases[key]) return s.bases[key].name; const [st, p] = key.split(':'); return STARS[st] ? STARS[st].planets[+p].name : key; }
  render() {
    const s = this.s, Wr = W.war(s), el = $('#overlay'); const scroll = el.querySelector('.lc-body') ? el.querySelector('.lc-body').scrollTop : 0; const mv = W.fleetBusy(s);
    let h = `<div class="ovh"><h1>${icon('target')} Fleet Command</h1><span class="muted">Fleet at <b>${esc(mv ? 'sea' : this.placeName(Wr.fleetAt))}</b> · power ${fmt(W.power(Wr.ships))}</span><button class="ibtn" data-a="closeov">${icon('x')}</button></div><div class="lc-body">`;
    // threats
    h += `<h3 class="orb">Threats</h3>`;
    if (!Wr.raids.length) h += `<p class="muted">${W.raidsOn(s) ? 'No raid inbound right now. The Swarm will be back.' : s.aliens && s.aliens.known.krthul ? (s.aliens.known.krthul.tribute ? 'Tribute keeps the Swarm away. For now.' : 'The Swarm watches.') : 'No known threats.'}</p>`;
    for (const r of Wr.raids) { const can = W.canMove(s, r.target); h += `<div class="lcard threat"><div class="lc-h"><b>${icon('target', 'xs')} Kr'thul raid on ${esc(r.name)}</b><i class="eta" data-until="${r.eta}"></i></div><p class="desc">${esc(compLine(r.comp))}</p><p class="muted small">Defending: ${esc(compLine(W.defComp(s, r.target)))}${Wr.fleetAt === r.target && !mv ? ' plus the fleet' : ''}. Losing costs 5% of your credits and metal and halves that world's output for 12 hours.</p>${this.fc('Forecast, defences alone', W.raidForecast(s, r, false))}${Object.values(Wr.ships).some((x) => x > 0) ? this.fc('Forecast with the fleet', W.raidForecast(s, r, true)) : ''}${Wr.fleetAt === r.target && !mv ? '<p class="cur">The fleet is in position.</p>' : `<button class="btn gold small" data-a="wmove" data-to="${r.target}" ${can.ok ? '' : 'disabled'}>${icon('rocket', 'xs')} Intercept${can.ok ? ' · arrives in ' + fmtTime(can.time) : ''}</button>${can.ok ? '' : `<p class="why small">${esc(can.why)}</p>`}`}</div>`; }
    // navy
    h += `<h3 class="orb">Navy <small>${esc(compLine(Wr.ships))}</small></h3>${mv ? `<p class="cur">${mv.hive ? 'Assaulting ' + esc(W.HIVES[mv.hive].name) : 'Moving to ' + esc(this.placeName(mv.to))} · <b data-left="${mv.id}"></b></p>` : Wr.fleetAt !== 'home' ? `<button class="btn small" data-a="wmove" data-to="home">${icon('rocket', 'xs')} Bring the fleet home</button>` : ''}<div class="lc-grid">`;
    const wj = W.warBusy(s); if (wj) h += `<div class="lcard"><b>${icon('cog', 'xs')} Building ${wj.n} ${esc(W.WARSHIPS[wj.ship].name)}${wj.n > 1 ? 's' : ''}</b><p><b data-left="${wj.id}"></b></p><button class="btn gold small" data-a="finish" data-job="${wj.id}">${icon('dm', 'xs')} Finish now</button></div>`;
    for (const k of W.WARSHIP_ORDER) { const d = W.WARSHIPS[k]; const n = this.n[k] || 5; const c = W.canWarship(s, k, n); const lock = !s.tech[d.req];
      h += `<div class="lcard ${lock ? 'locked' : ''}"><div class="wsh"><img src="${uimg(k, 1)}"><div><b>${esc(d.name)} <small>· ${d.size} hull · ${d.wpn}</small></b><p class="desc">${esc(d.desc)}</p><p class="muted small">${{ laser: 'Lasers: strong against small hulls', missile: 'Missiles: strong against large hulls', rail: 'Railgun: ignores half of any shield' }[d.wpn]}</p></div></div><table class="stats small"><tr><td>Hull / shields / attack</td><td>${fmt(d.hp)} / ${fmt(d.sh)} / ${fmt(d.atk)}</td></tr><tr><td>In service</td><td>${Wr.ships[k] || 0}</td></tr></table>`;
      h += lock ? `<p class="why">${icon('lock', 'xs')} Research ${esc(TECH[d.req].name)}${d.yard > 1 ? ' · Shipyard ' + d.yard : ''}</p>` : `<div class="lc-a"><div class="qty">${[1, 5, 20, 50].map((q) => `<button class="chip2 ${n === q ? 'on' : ''}" data-a="wqty" data-k="${k}" data-q="${q}">×${q}</button>`).join('')}</div><div class="costs">${cost(W.warCost(k, n), s)}<span class="cost time">${icon('clock', 'xs')}${fmtTime(W.warTime(s, k, n))}</span></div>${c.ok ? '' : `<p class="why small">${esc(c.why)}</p>`}<button class="btn gold small" data-a="wbuild" data-k="${k}" ${c.ok ? '' : 'disabled'}>${icon('cog', 'xs')} Build ${n}</button></div>`;
      h += '</div>'; }
    h += '</div>';
    // defences
    h += `<h3 class="orb">Defences</h3>${s.tech.planetaryDefence ? '' : `<p class="why">${icon('lock', 'xs')} Research ${esc(TECH.planetaryDefence.name)}</p>`}<div class="lc-grid">`;
    for (const t of W.targets(s)) { const L = W.defLevel(s, t.key); const c = W.canDefence(s, t.key); const j = s.jobs.find((x) => x.kind === 'defence' && x.key === t.key); const bl = W.blockaded(s, t.key);
      h += `<div class="lcard"><div class="lc-h"><b>${esc(t.name)}</b><i>${bl ? '<span class="tag bad">blockaded</span>' : `level ${L}/${W.DEF_MAX}`}</i></div><p class="muted small">${L ? esc(compLine(W.defComp(s, t.key))) + ` · shields ×${W.shieldOf(s, t.key).toFixed(2)}` : 'Undefended'}</p>${j ? `<p>Building · <b data-left="${j.id}"></b></p>` : L < W.DEF_MAX && s.tech.planetaryDefence ? `<div class="costs">${cost(W.defCost(L + 1), s)}</div><button class="btn small" data-a="wdef" data-key="${t.key}" ${c.ok ? '' : 'disabled'}>${icon('up', 'xs')} Fortify to ${L + 1}</button>` : ''}</div>`; }
    h += '</div>';
    // campaign
    h += `<h3 class="orb">The campaign against the Swarm</h3><div class="lc-grid">`;
    for (const id of W.HIVE_ORDER) { const H = W.HIVES[id]; const done = Wr.hives[id + '_done']; const c = W.canAssault(s, id); const left = W.hiveLeft(s, id);
      h += `<div class="lcard ${done ? 'done' : W.hiveOpen(s, id) ? '' : 'locked'} ${H.queen ? 'queen' : ''}"><div class="lc-h"><b>${esc(H.name)}</b><i>${done ? `<span class="tag ok">${icon('check', 'xs')} destroyed</span>` : STARS[H.star].d + ' ly'}</i></div><p class="desc">${esc(H.desc)}</p>${done ? '' : `<p class="muted small">Garrison: ${esc(compLine(left))}</p>${W.hiveOpen(s, id) && Object.values(Wr.ships).some((x) => x > 0) ? this.fc('Forecast for an assault now', W.assaultForecast(s, id)) : ''}<p class="muted small">Spoils: ${Object.entries(H.loot).map(([r, n]) => fmt(n) + ' ' + RES[r].name.toLowerCase()).join(', ')}</p><button class="btn ${H.queen ? 'gold' : ''} small" data-a="wassault" data-hive="${id}" ${c.ok ? '' : 'disabled'}>${icon('target', 'xs')} Launch the assault${c.ok ? ' · ' + fmtTime(c.time) : ''}</button>${c.ok ? '' : `<p class="why small">${esc(c.why)}</p>`}`}</div>`; }
    h += '</div>';
    // reports
    if (Wr.log.length) { h += `<h3 class="orb">Battle reports</h3><div class="reports">`; Wr.log.forEach((r, i) => { h += `<div class="rep ${r.win ? 'win' : 'loss'}"><b>${r.win ? 'Victory' : 'Defeat'}: ${esc(r.kind === 'raid' ? 'raid on ' + r.name : r.name)}</b><i>${new Date(r.t).toLocaleString()}${r.loot && !r.win ? ' · lost ' + fmt(r.loot.credits) + ' credits, ' + fmt(r.loot.metal) + ' metal' : ''}${r.salvage ? ' · salvage ' + fmt(r.salvage.metal) + ' metal' : ''}</i><button class="btn small" data-a="wreplay" data-i="${i}">${icon('play', 'xs')} Replay</button></div>`; }); h += '</div>'; }
    el.innerHTML = h + '</div>'; const b = el.querySelector('.lc-body'); if (b) b.scrollTop = scroll; this.live();
  }
  fc(label, p) { const pc = Math.round(p * 100); return `<div class="fc ${pc >= 70 ? 'good' : pc >= 35 ? 'mid' : 'bad'}"><span>${esc(label)}</span><i style="width:${pc}%"></i><b>${pc}% to win</b></div>`; }
  live() { const s = this.s; $$('#overlay [data-left]').forEach((e) => { const j = s.jobs.find((x) => x.id === e.dataset.left); if (j) e.textContent = fmtTime((j.end - Date.now()) / 1000); });
    $$('#overlay [data-until]').forEach((e) => (e.textContent = 'impact in ' + fmtTime(Math.max(0, (+e.dataset.until - Date.now()) / 1000)))); $$('#overlay .cost[data-r]').forEach((e) => e.classList.toggle('short', (s.res[e.dataset.r] || 0) < +e.dataset.n)); }
  // a modal with the battle replay
  replay(rep) { const res = rep.res; const meA = rep.kind === 'raid' ? 'B' : 'A'; // we are always shown on the left
    const R2 = meA === 'A' ? res : { ...res, startA: res.startB, startB: res.startA, rounds: res.rounds.map((r) => ({ ...r, A: r.B, B: r.A, shots: r.shots.map((x) => ({ ...x, side: x.side === 'A' ? 'B' : 'A' })), kills: r.kills.map((x) => ({ ...x, side: x.side === 'A' ? 'B' : 'A' })) })) };
    this.ui.modal(`<div class="replay"><canvas id="rpCanvas"></canvas><div class="row"><button class="btn small" id="rpFast">${icon('play', 'xs')} Faster</button><button class="btn gold small" data-a="close">Close</button></div></div>`, 'wide');
    const cv = $('#rpCanvas'); const dpr = Math.min(2, devicePixelRatio || 1); const w = cv.clientWidth || 640, hgt = cv.clientHeight || 360; cv.width = w * dpr; cv.height = hgt * dpr;
    const bp = new BattleReplay(cv, R2, ['Our forces', rep.kind === 'raid' ? 'Kr\'thul raid' : rep.name, rep.win]); let last = performance.now();
    $('#rpFast').addEventListener('click', () => (bp.speed = bp.speed >= 4 ? 1 : bp.speed * 2));
    const step = (now) => { if (!document.body.contains(cv)) return; bp.frame(Math.min(0.05, (now - last) / 1000), dpr); last = now; requestAnimationFrame(step); }; requestAnimationFrame(step); }
  click(t) { const A = this.app, s = this.s, a = t.dataset.a; const done = (r, msg) => { if (r.ok) { A.audio.play('build'); this.ui.toast(msg, 'gold'); A.changed(); } else { this.ui.toast(r.why, 'bad'); A.audio.play('deny'); } this.render(); return true; };
    if (a === 'wqty') { this.n[t.dataset.k] = +t.dataset.q; A.audio.play('tap'); this.render(); return true; }
    if (a === 'wbuild') { const n = this.n[t.dataset.k] || 5; return done(W.startWarship(s, t.dataset.k, n), `The war docks start ${n} ${W.WARSHIPS[t.dataset.k].name}${n > 1 ? 's' : ''}`); }
    if (a === 'wdef') return done(W.startDefence(s, t.dataset.key), 'Fortifications under construction');
    if (a === 'wmove') return done(W.startMove(s, t.dataset.to), t.dataset.to === 'home' ? 'The fleet heads home' : 'The fleet moves to intercept');
    if (a === 'wassault') return done(W.startAssault(s, t.dataset.hive), `The fleet sets out for ${W.HIVES[t.dataset.hive].name}`);
    if (a === 'wreplay') { this.replay(W.war(s).log[+t.dataset.i]); return true; }
    return false; }
}
