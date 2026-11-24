// The Solar System screens: the map's world panel (facts, survey, colonies, outposts, launch windows), the fleet and
// shipyard, the colony panel (people, housing, water, air, traits) and the base switcher.
import { esc, fmt, fmtTime, clamp, pct } from '../core/util';
import * as SO from '../core/solar';
import * as SP from '../core/space';
import * as G from '../core/game';
import { BODIES, SITES, SHIPS, SHIP_ORDER, ZONE_NAME } from '../data/solar';
import { TECH } from '../data/research';
import type { UI } from './ui';
import { costHTML, icon } from './ui';
export class SolarUI {
  sel: string | null = null; fleet = false;
  constructor(private ui: UI) {}
  get s() { return this.ui.app.s; } get A() { return this.ui.app; }
  // labels over the bodies on the map
  frameLabels() {
    const W = this.A.world; if (W.mode !== 'system' || !W.system) return; const root = document.getElementById('bubbles')!; const r = (W.renderer.domElement as HTMLCanvasElement).getBoundingClientRect(); const S = SO.sol(this.s);
    const ids = ['mercury', 'venus', 'earth', 'moon', 'mars', 'ceres', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'titan', 'europa', ...Object.keys(S.sites), ...Object.keys(this.s.bases)]; const seen = new Set<string>();
    for (const id of new Set(ids)) { const p = W.system.project(id, r.width, r.height); if (!p) continue; seen.add(id); let el = root.querySelector(`[data-lbl="${id}"]`) as HTMLElement | null;
      if (!el) { el = document.createElement('div'); el.className = 'bub lbl'; el.dataset.lbl = id; el.dataset.a = 'mapPick'; el.dataset.b = id; root.appendChild(el); }
      const tag = this.s.bases[id] ? '🏠 ' : S.sites[id] ? '🛰 ' : S.surveyed[id] ? '' : '? '; const html = `${tag}${esc(BODIES[id].name)}`; if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; }
      el.style.left = r.left + p.x + 'px'; el.style.top = r.top + p.y + 'px'; el.classList.toggle('full', id === this.sel); }
    root.querySelectorAll('[data-lbl]').forEach((e) => { if (!seen.has((e as HTMLElement).dataset.lbl!)) e.remove(); });
    if (this.ui.tick % 8 === 0) W.system.setFlights(this.s.jobs.filter((j) => j.kind === 'voyage' || (j.kind === 'mission' && j.payload.probe)).map((j) => ({ body: j.kind === 'voyage' ? j.payload.body : j.payload.probe, f: (Date.now() - j.start) / (j.end - j.start), col: j.kind === 'voyage' ? SHIPS[j.ship].col : '#ffd36a' })));
  }
  clearLabels() { document.querySelectorAll('#bubbles [data-lbl]').forEach((e) => e.remove()); }
  panelHTML(): string {
    if (this.fleet) return this.fleetHTML(); const id = this.sel; if (!id) return `<h2>The Solar System</h2><p class="desc">Tap a world to see what you can do there. Planets move on their real orbits: launch windows to Mars and the belt open every few days of play, and a good window halves the fuel bill.</p>${this.voyagesHTML()}<button class="btn" style="width:100%" data-a="fleet">🚀 Fleet & shipyard</button>`;
    const s = this.s, b = BODIES[id], S = SO.sol(s); const w = SO.windowOf(id); const site = SITES[id]; const col = SO.COLONY[id]; const L = SO.siteLevel(s, id);
    let h = `<button class="ibtn x" data-a="mapClose">✕</button><h2>${esc(b.name)}</h2><div class="sub">${esc(b.type)}${b.zone ? ' · ' + esc(ZONE_NAME[b.zone] || '') : ''}</div><p class="desc">${esc(b.fact)}</p>`;
    h += `<table class="stats">${b.g !== undefined ? `<tr><td>Gravity</td><td>${b.g} g</td></tr>` : ''}${b.day ? `<tr><td>Day</td><td>${esc(b.day)}</td></tr>` : ''}${b.temp ? `<tr><td>Temperature</td><td>${esc(b.temp)}</td></tr>` : ''}${b.atm ? `<tr><td>Atmosphere</td><td>${esc(b.atm)}</td></tr>` : ''}</table>`;
    if (b.a && id !== 'earth') { const nx = SO.nextWindow(id); h += `<div class="box"><div class="row"><b class="ox grow">Launch window</b><span class="${w.open ? 'good' : 'warn'} ox">${w.open ? 'OPEN' : `opens in ${fmtTime(nx / 1000)}`}</span></div><div class="bar ${w.open ? 'green' : 'gold'}" style="margin-top:6px"><i style="width:${w.q * 100}%"></i></div><div class="muted" style="font-size:11px;margin-top:4px">Fuel ×${w.fuel.toFixed(2)}, flight time ×${w.time.toFixed(2)} today.</div></div>`; }
    if (id === 'earth') h += `<button class="btn" style="width:100%" data-a="travel" data-k="earth">🏠 Go to Cape Horizon</button>`;
    else if (!S.surveyed[id] && id !== 'moon') { const c = SP.canLaunch(s, { probe: id }); h += `<div class="box"><b class="ox">Survey probe</b><p class="desc">Robotic eyes on ${esc(b.name)}: maps, samples and a landing site. Needed before any voyage.</p><div class="row"><span class="grow">${costHTML(c.ms.cost, s.res)}</span><span class="muted" style="font-size:11px">⏱ ${fmtTime(c.ms.flight)}</span></div><button class="btn small ${c.ok ? 'gold' : ''}" data-a="launch" data-p="${esc(JSON.stringify({ probe: id }))}" ${c.ok || c.why === 'Not enough resources' ? '' : 'disabled'}>${c.ok ? '🚀 Launch probe' : esc(c.why || '')}</button></div>`; }
    if (s.bases[id]) { h += `<button class="btn gold" style="width:100%" data-a="travel" data-k="${id}">🏠 Visit ${esc(s.bases[id].name)}</button>`; h += this.voyageBox({ body: id, op: 'transport' }, 'Send colonists', `An Ares transport carries ${SHIPS.ares.carries} colonists.`); }
    else if (id === 'moon') h += `<div class="box"><b class="ox">Tranquility Base</b><p class="desc">${s.flags.moonBase ? '' : 'Fly the Lunar Outpost mission from Launch Control to found humanity\'s first home off Earth.'}</p></div>`;
    else if (col && col.tech) h += this.voyageBox({ body: id, op: 'found' }, `Found ${col.name}`, `Prefabricated domes, a reactor and ${col.pop} colonists.${s.tech[col.tech] ? '' : ` Research ${TECH[col.tech].name} first.`}`);
    if (site) h += L ? `<div class="box"><b class="ox">${esc(site.name)} · level ${L}</b><p class="desc">${esc(site.role)}</p></div>${this.voyageBox({ body: id, op: 'upgrade' }, `Upgrade to level ${L + 1}`, '')}` : this.voyageBox({ body: id, op: 'site' }, `Build the ${site.name}`, site.role + (s.tech[site.req] ? '' : ` Research ${TECH[site.req].name} first.`));
    return h;
  }
  private voyageBox(P: SO.Voyage, title: string, desc: string) { const s = this.s; const c = SO.canVoyage(s, P); return `<div class="box"><b class="ox">${esc(title)}</b>${desc ? `<p class="desc">${esc(desc)}</p>` : ''}<div class="row"><span class="grow">${costHTML(c.ms.cost, s.res)}</span>${c.time ? `<span class="muted" style="font-size:11px">⏱ ${fmtTime(c.time)}</span>` : ''}</div><button class="btn small ${c.ok ? 'gold' : ''}" data-a="voyage" data-p="${esc(JSON.stringify(P))}" ${c.ok || c.why === 'Not enough resources' ? '' : 'disabled'}>${c.ok ? `🚀 Send the ${esc(SHIPS[c.ship!].name)}` : esc(c.why || '')}</button>${c.noShip ? '<button class="btn small" data-a="fleet">Shipyard</button>' : ''}</div>`; }
  private voyagesHTML() { const v = this.s.jobs.filter((j) => j.kind === 'voyage'); return v.map((j) => `<div class="now"><div class="grow"><div class="tier">${esc(SHIPS[j.ship].name)} EN ROUTE</div><b class="ox">${esc(j.name)}</b><div class="bar gold" style="margin-top:6px"><i style="width:${clamp((Date.now() - j.start) / (j.end - j.start)) * 100}%"></i></div></div><div style="text-align:right"><b class="ox">${fmtTime((j.end - Date.now()) / 1000)}</b><br><button class="btn gold small" data-a="finish" data-job="${j.id}">Finish</button></div></div>`).join(''); }
  private fleetHTML() { const s = this.s, S = SO.sol(s); const building = s.jobs.filter((j) => j.kind === 'ship');
    return `<button class="ibtn x" data-a="fleetClose">✕</button><h2>Fleet & shipyard</h2><div class="sub">Orbital Shipyard level ${SO.yardLevel(s)}${SO.yardLevel(s) ? '' : ' · launch the Shipyard station module first'}</div>${this.voyagesHTML()}${building.map((j) => `<div class="now"><div class="grow"><div class="tier">BUILDING</div><b class="ox">${esc(SHIPS[j.ship].name)}</b></div><b class="ox">${fmtTime((j.end - Date.now()) / 1000)}</b></div>`).join('')}
      <div class="bots">${SHIP_ORDER.map((id) => { const d = SHIPS[id]; const c = SO.canBuildShip(s, id); const n = S.ships[id] || 0; return `<div class="botc" style="grid-template-columns:1fr auto"><div><b style="color:${d.col}">${esc(d.name)}</b> <span class="muted" style="font-size:11px">${esc(d.role)} · class ${d.cls}${d.carries ? ` · ${d.carries} colonists` : ''}</span><div class="meta">${n} built, ${SO.shipsFree(s, id)} free · ${esc(d.desc)}</div><div>${costHTML(d.cost, s.res)}</div></div><button class="btn small ${c.ok ? 'gold' : ''}" data-a="buildShip" data-k="${id}" ${c.ok || c.why === 'Not enough resources' ? '' : 'disabled'}>${c.ok ? 'Build' : esc(c.why || '')}</button></div>`; }).join('')}</div>`; }
  // the colony panel (on the Colony Hub)
  colonyHTML(base: string) {
    const s = this.s, B = s.bases[base]; if (!B || base === 'earth') return ''; const R = this.A.R.col[base]; const L = SO.lifeSupport(s, base); const pop = Math.floor(B.pop || 0); const C = SO.COLONY[base];
    const need = (v: number) => (v >= pop ? '<span class="good">✓</span>' : '<span class="bad">short</span>');
    return `<div class="box"><b class="ox">Colony: ${esc(B.name)}</b><table class="stats"><tr><td>👥 Colonists</td><td>${fmt(pop)} / ${fmt(R ? R.house : 0)} housing</td></tr><tr><td>💧 Water (ice mines)</td><td>${fmt(L.water)} ${need(L.water)}</td></tr><tr><td>🫧 Air (hub, greenhouses, domes)</td><td>${fmt(L.air)} ${need(L.air)}</td></tr><tr><td>📈 Growth</td><td>${R && R.grow > 0 && pop < R.house ? `+${R.grow.toFixed(1)}/h` : R && R.ls < 1 ? 'stopped: life support short' : pop >= (R ? R.house : 0) ? 'housing full' : '–'}</td></tr><tr><td>🛠 Jobs filled</td><td>${pct(R ? R.staff : 1)}</td></tr></table>
      ${L.ls < 1 ? '<p class="why">Life support is short: growth has stopped and work is slower. Build or upgrade Ice Mines (water) and Greenhouses (air).</p>' : ''}${C ? `<div class="muted" style="font-size:12px">${C.traits.map((t) => '• ' + esc(t)).join('<br>')}</div>` : ''}</div>`;
  }
  basesHTML() { const s = this.s; return `<h1 style="font-size:22px">Your worlds</h1><div class="bots" style="text-align:left">${Object.entries(s.bases).map(([k, B]) => `<div class="botc" style="grid-template-columns:1fr auto"><div><b>${k === 'earth' ? '🌍' : k === 'moon' ? '🌕' : k === 'mars' ? '🔴' : '🪐'} ${esc(B.name)}</b><div class="meta">${esc(BODIES[B.body]?.name || k)}${k !== 'earth' ? ` · ${fmt(Math.floor(B.pop || 0))} colonists` : ''} · ${B.items.length} buildings</div></div>${s.at === k ? '<span class="good ox">You are here</span>' : `<button class="btn small gold" data-a="travel" data-k="${k}">Go</button>`}</div>`).join('')}</div><button class="btn small" data-a="map" style="margin-top:8px">🪐 Solar System map</button> <button class="btn small" data-a="closeModal">Close</button>`; }
  act(a: string, t: HTMLElement): boolean {
    const s = this.s, A = this.A, ui = this.ui;
    switch (a) {
      case 'map': ui.closeModal(); ui.closeOver(); A.openMap(); return true;
      case 'mapPick': this.sel = t.dataset.b || null; this.fleet = false; A.world.mapSel = this.sel; if (this.sel) A.world.system?.setFocus(this.sel); ui.renderPanel(); A.audio.play('tap'); return true;
      case 'mapClose': this.sel = null; A.world.mapSel = null; A.world.system?.setFocus(''); ui.renderPanel(); return true;
      case 'fleet': if (A.world.mode !== 'system') A.openMap(); this.fleet = true; ui.renderPanel(); A.audio.play('tap'); return true;
      case 'fleetClose': this.fleet = false; ui.renderPanel(); return true;
      case 'buildShip': { const r = SO.startShip(s, t.dataset.k!); if (r.ok) { A.audio.play('build'); A.changed(); ui.renderPanel(); } else ui.deny(r.why); return true; }
      case 'voyage': { const P = JSON.parse(t.dataset.p!); const r = SO.startVoyage(s, P); if (r.ok) { A.audio.play('launch'); ui.toast(`The ${esc(SHIPS[r.ship!].name)} is on its way: ${esc(r.ms.name)}`, 'gold'); A.changed(); ui.renderPanel(); } else ui.deny(r.why); return true; }
      case 'travel': ui.closeModal(); A.travel(t.dataset.k!); return true;
      case 'bases': ui.modal(this.basesHTML()); A.audio.play('tap'); return true;
    }
    return false;
  }
}
export { icon, G };
