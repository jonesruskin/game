// The Solar System screens: the map's world panel (facts, survey, colonies, outposts, launch windows), the fleet and
// shipyard, the colony panel (people, housing, water, air, traits) and the base switcher.
import { esc, fmt, fmtTime, clamp, pct } from '../core/util';
import * as SO from '../core/solar';
import * as SP from '../core/space';
import * as G from '../core/game';
import { megaStage } from '../core/stars';
import { BODIES, SITES, SHIPS, SHIP_ORDER, ZONE_NAME, TERRA, RELAY } from '../data/solar';
import { TECH } from '../data/research';
import type { UI } from './ui';
import { LIFE, LIFE_ORDER } from '../data/life';
import { life, entry } from '../core/life';
import * as FD from '../core/food';
import { RES } from '../data/resources';
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
    if (this.ui.tick % 8 === 0) { for (const b of ['mars', 'venus'] as const) W.system.setTerra(b, SO.terraState(this.s, b)); W.system.setRelays(S.relays || {}); W.system.setMega(megaStage(this.s, 'dyson'), megaStage(this.s, 'gate')); W.system.setMega2(megaStage(this.s, 'matrioshka'), megaStage(this.s, 'ringworld'));
      const cols: Record<string, number> = {}; for (const k in this.s.bases) if (k !== 'earth' && !k.includes(':')) cols[k] = G.lvlOf(this.s, k, 'hub'); W.system.setSites(S.sites, cols); }
    if (this.ui.tick % 8 === 0) W.system.setFlights(this.s.jobs.filter((j) => j.kind === 'voyage' || (j.kind === 'mission' && j.payload.probe)).map((j) => ({ body: j.kind === 'voyage' ? j.payload.body : j.payload.probe, f: (Date.now() - j.start) / (j.end - j.start), col: j.kind === 'voyage' ? SHIPS[j.ship].col : '#ffd36a' })));
  }
  clearLabels() { document.querySelectorAll('#bubbles [data-lbl]').forEach((e) => e.remove()); }
  // the life a world hides (the real places astrobiologists look)
  private lifeLine(body: string) { const s = this.s; const id = LIFE_ORDER.find((k) => LIFE[k].find.colony === body || LIFE[k].find.site === body); if (!id) return ''; const e = entry(s, id); if (!e) return ''; const L = life(s);
    if (!s.tech.xenobiology && !L.found[id]) return `<p class="meta">🧬 Astrobiologists think something could live here. Research Xenobiology to look.</p>`;
    const txt = e.state === 'found' ? `${esc(e.name)} · ${e.lvl >= 3 ? 'fully studied' : `studied ${e.lvl}/3`}` : e.state === 'signal' ? 'biosignature detected: search for it' : esc(e.hint || '');
    return `<p class="meta"><span class="good" data-a="lifeAt" data-k="${id}" style="cursor:pointer;text-decoration:underline dotted">🧬 ${txt}</span></p>`; }
  panelHTML(): string {
    if (this.fleet) return this.fleetHTML(); const id = this.sel; if (!id) return `<h2>The Solar System</h2><p class="desc">Tap a world to see what you can do there. Planets move on their real orbits: launch windows to Mars and the belt open every few days of play, and a good window halves the fuel bill.</p>${this.voyagesHTML()}<button class="btn" style="width:100%" data-a="fleet">🚀 Fleet & shipyard</button>`;
    const s = this.s, b = BODIES[id], S = SO.sol(s); const w = SO.windowOf(id); const site = SITES[id]; const col = SO.COLONY[id]; const L = SO.siteLevel(s, id);
    let h = `<button class="ibtn x" data-a="mapClose">✕</button><h2>${esc(b.name)}</h2><div class="sub">${esc(b.type)}${b.zone ? ' · ' + esc(ZONE_NAME[b.zone] || '') : ''}</div><p class="desc">${esc(b.fact)}</p>${this.lifeLine(id)}`;
    const Tn = SO.terraState(s, id), tf = Tn && Tn.n > 0; const temp = tf ? `${Math.round(Tn!.temp)} °C` : b.temp, atm = tf ? `${Tn!.pressure < 0.1 ? Tn!.pressure.toFixed(3) : Tn!.pressure.toFixed(2)} bar${Tn!.o2 ? `, ${Math.round(Tn!.o2)}% oxygen` : ''} (terraforming ${Tn!.n}/${Tn!.of})` : b.atm;
    h += `<table class="stats">${b.g !== undefined ? `<tr><td>Gravity</td><td>${b.g} g</td></tr>` : ''}${b.day ? `<tr><td>Day</td><td>${esc(b.day)}</td></tr>` : ''}${temp ? `<tr><td>Temperature</td><td>${esc(temp)}</td></tr>` : ''}${atm ? `<tr><td>Atmosphere</td><td>${esc(atm)}</td></tr>` : ''}</table>`;
    if (b.a && id !== 'earth') { const nx = SO.nextWindow(id); h += `<div class="box"><div class="row"><b class="ox grow">Launch window</b><span class="${w.open ? 'good' : 'warn'} ox">${w.open ? 'OPEN' : `opens in ${fmtTime(nx / 1000)}`}</span></div><div class="bar ${w.open ? 'green' : 'gold'}" style="margin-top:6px"><i style="width:${w.q * 100}%"></i></div><div class="muted" style="font-size:11px;margin-top:4px">Fuel ×${w.fuel.toFixed(2)}, flight time ×${w.time.toFixed(2)} today.</div></div>`; }
    if (id === 'earth') h += `<button class="btn" style="width:100%" data-a="travel" data-k="earth">🏠 Go to Cape Horizon</button>`;
    else if (!S.surveyed[id] && id !== 'moon') { const c = SP.canLaunch(s, { probe: id }); h += `<div class="box"><b class="ox">Survey probe</b><p class="desc">Robotic eyes on ${esc(b.name)}: maps, samples and a landing site. Needed before any voyage.</p><div class="row"><span class="grow">${costHTML(c.ms.cost, s.res)}</span><span class="muted" style="font-size:11px">⏱ ${fmtTime(c.ms.flight)}</span></div><button class="btn small ${c.ok ? 'gold' : ''}" data-a="launch" data-p="${esc(JSON.stringify({ probe: id }))}" ${c.ok || c.why === 'Not enough resources' ? '' : 'disabled'}>${c.ok ? '🚀 Launch probe' : esc(c.why || '')}</button></div>`; }
    if (s.bases[id]) { h += `<button class="btn gold" style="width:100%" data-a="travel" data-k="${id}">🏠 Visit ${esc(s.bases[id].name)}</button>`; h += this.terraHTML(id); h += this.voyageBox({ body: id, op: 'transport' }, 'Send colonists', `An Ares transport carries ${SHIPS.ares.carries} colonists.`); }
    else if (id === 'moon') h += `<div class="box"><b class="ox">Tranquility Base</b><p class="desc">${s.flags.moonBase ? '' : 'Fly the Lunar Outpost mission from Launch Control to found humanity\'s first home off Earth.'}</p></div>`;
    else if (col && col.tech) h += this.voyageBox({ body: id, op: 'found' }, `Found ${col.name}`, `Prefabricated domes, a reactor and ${col.pop} colonists.${s.tech[col.tech] ? '' : ` Research ${TECH[col.tech].name} first.`}`);
    if (site) h += L ? `<div class="box"><b class="ox">${esc(site.name)} · level ${L}</b><p class="desc">${esc(site.role)}</p></div>${this.voyageBox({ body: id, op: 'upgrade' }, `Upgrade to level ${L + 1}`, '')}` : this.voyageBox({ body: id, op: 'site' }, `Build the ${site.name}`, site.role + (s.tech[site.req] ? '' : ` Research ${TECH[site.req].name} first.`));
    if (id !== 'earth' && (s.bases[id] || L)) h += this.relayHTML(id);
    return h;
  }
  private voyageBox(P: SO.Voyage, title: string, desc: string) { const s = this.s; const c = SO.canVoyage(s, P); return `<div class="box"><b class="ox">${esc(title)}</b>${desc ? `<p class="desc">${esc(desc)}</p>` : ''}<div class="row"><span class="grow">${costHTML(c.ms.cost, s.res)}</span>${c.time ? `<span class="muted" style="font-size:11px">⏱ ${fmtTime(c.time)}</span>` : ''}</div><button class="btn small ${c.ok ? 'gold' : ''}" data-a="voyage" data-p="${esc(JSON.stringify(P))}" ${c.ok || c.why === 'Not enough resources' ? '' : 'disabled'}>${c.ok ? `🚀 Send the ${esc(SHIPS[c.ship!].name)}` : esc(c.why || '')}</button>${c.noShip ? '<button class="btn small" data-a="fleet">Shipyard</button>' : ''}</div>`; }
  private voyagesHTML() { const v = this.s.jobs.filter((j) => j.kind === 'voyage'); return v.map((j) => `<div class="now"><div class="grow"><div class="tier">${esc(SHIPS[j.ship].name)} EN ROUTE</div><b class="ox">${esc(j.name)}</b><div class="bar gold" style="margin-top:6px"><i style="width:${clamp((Date.now() - j.start) / (j.end - j.start)) * 100}%"></i></div></div><div style="text-align:right"><b class="ox">${fmtTime((j.end - Date.now()) / 1000)}</b><br><button class="btn gold small" data-a="finish" data-job="${j.id}">Finish</button></div></div>`).join(''); }
  private fleetHTML() { const s = this.s, S = SO.sol(s); const building = s.jobs.filter((j) => j.kind === 'ship');
    return `<button class="ibtn x" data-a="fleetClose">✕</button><h2>Fleet & shipyard</h2><div class="sub">Orbital Shipyard level ${SO.yardLevel(s)}${SO.yardLevel(s) ? '' : ' · launch the Shipyard station module first'}</div>${this.voyagesHTML()}${building.map((j) => `<div class="now"><div class="grow"><div class="tier">BUILDING</div><b class="ox">${esc(SHIPS[j.ship].name)}</b></div><b class="ox">${fmtTime((j.end - Date.now()) / 1000)}</b></div>`).join('')}
      <div class="bots">${SHIP_ORDER.map((id) => { const d = SHIPS[id]; const c = SO.canBuildShip(s, id); const n = S.ships[id] || 0; return `<div class="botc" style="grid-template-columns:1fr auto"><div><b style="color:${d.col}">${esc(d.name)}</b> <span class="muted" style="font-size:11px">${esc(d.role)} · class ${d.cls}${d.carries ? ` · ${d.carries} colonists` : ''}</span><div class="meta">${n} built, ${SO.shipsFree(s, id)} free · ${esc(d.desc)}</div><div>${costHTML(d.cost, s.res)}</div></div><button class="btn small ${c.ok ? 'gold' : ''}" data-a="buildShip" data-k="${id}" ${c.ok || c.why === 'Not enough resources' ? '' : 'disabled'}>${c.ok ? 'Build' : esc(c.why || '')}</button></div>`; }).join('')}</div>`; }
  // terraforming: the stage track, the world's climate now and after the next stage, and the next step
  terraHTML(body: string) {
    const s = this.s, T = TERRA[body]; if (!T || !s.bases[body]) return ''; const st = SO.terraState(s, body)!; const n = st.n, job = SO.terraJob(s, body); const c = SO.canTerra(s, body); const nx = T.stages[n];
    const after: Record<string, number> = nx ? { ...st, ...nx.set } : st; const arrow = (k: string, f: (v: number) => string) => `${f(st[k] || 0)}${nx && nx.set[k] !== undefined ? ` <span class="good">→ ${f(after[k])}</span>` : ''}`;
    const pips = T.stages.map((x, i) => `<span title="${esc(x.name)}" style="flex:1;height:7px;border-radius:4px;background:${i < n ? '#7cf29a' : job && i === n ? '#ffd166' : 'rgba(255,255,255,0.15)'}"></span>`).join('');
    let h = `<div class="box"><div class="row"><b class="ox grow">🌍 Terraforming ${esc(BODIES[body].name)}</b><span class="muted ox">${n} / ${T.stages.length}</span></div><div style="display:flex;gap:3px;margin:6px 0">${pips}</div>
      <table class="stats"><tr><td>🌡 Temperature</td><td>${arrow('temp', (v) => `${Math.round(v)} °C`)}</td></tr><tr><td>🌫 Air pressure</td><td>${arrow('pressure', (v) => `${v < 0.1 ? v.toFixed(3) : v.toFixed(2)} bar`)}</td></tr><tr><td>💧 Surface water</td><td>${arrow('water', (v) => `${Math.round(v)}%`)}</td></tr><tr><td>🫧 Oxygen</td><td>${arrow('o2', (v) => `${Math.round(v)}%`)}</td></tr></table>`;
    if (SO.breathable(st)) h += '<p class="desc good">The sky is breathable: colonists live and work outdoors, and air is no longer a limit.</p>';
    if (job) h += `<div class="now"><div class="grow"><div class="tier">STAGE ${n + 1} UNDER WAY</div><b class="ox">${esc(T.stages[job.stage].name)}</b><div class="bar gold" style="margin-top:6px"><i style="width:${clamp((Date.now() - job.start) / (job.end - job.start)) * 100}%"></i></div></div><div style="text-align:right"><b class="ox">${fmtTime((job.end - Date.now()) / 1000)}</b><br><button class="btn gold small" data-a="finish" data-job="${job.id}">Finish</button></div></div>`;
    else if (nx) h += `<b class="ox">Stage ${n + 1}: ${esc(nx.name)}</b><p class="desc">${esc(nx.desc)}</p><div class="row"><span class="grow">${costHTML(nx.cost, s.res)}</span><span class="muted" style="font-size:11px">⏱ ${fmtTime(SO.terraTime(s, body, n))} · housing +${Math.round(nx.house * 100)}%</span></div>
      <button class="btn small ${c.ok ? 'gold' : ''}" data-a="terra" data-k="${body}" ${c.ok || c.why === 'Not enough resources' ? '' : 'disabled'}>${c.ok ? '🌍 Begin stage ' + (n + 1) : esc(c.why === 'Research required' ? `Research ${TECH[c.tech as string]?.name}` : c.why || '')}</button>`;
    else h += '<p class="desc good">Terraforming complete. A living world.</p>';
    return h + '</div>';
  }
  relayHTML(body: string) { const s = this.s, L = SO.relayLevel(s, body), c = SO.canRelay(s, body); const job = s.jobs.find((j) => j.kind === 'relay' && j.body === body);
    return `<div class="box"><div class="row"><b class="ox grow">📡 ${esc(RELAY.name)}</b><span class="muted ox">level ${L} / ${RELAY.max}</span></div><p class="desc">${esc(RELAY.desc)}${L ? ` Now: <span class="good">+${Math.round(L * RELAY.bonus * 100)}%</span>.` : ''}</p>
      ${job ? `<div class="row"><span class="grow muted">Satellites on their way</span><b class="ox">${fmtTime((job.end - Date.now()) / 1000)}</b> <button class="btn gold small" data-a="finish" data-job="${job.id}">Finish</button></div>` : L < RELAY.max ? `<div class="row"><span class="grow">${costHTML(c.cost || SO.relayCost(L + 1), s.res)}</span><span class="muted" style="font-size:11px">⏱ ${fmtTime(SO.relayTime(body))}</span></div><button class="btn small ${c.ok ? 'gold' : ''}" data-a="relay" data-k="${body}" ${c.ok || c.why === 'Not enough resources' ? '' : 'disabled'}>${c.ok ? (L ? '📡 Add relays' : '📡 Deploy relays') : esc(c.why === 'Research required' ? `Research ${TECH[c.tech as string]?.name}` : c.why || '')}</button>` : ''}</div>`; }
  // the colony panel (on the Colony Hub)
  // food: what the colony grows, what Meridian shares from other colonies, what Earth ships up (and what that costs)
  private foodRows(base: string, pop: number) { const s = this.s, st = FD.foodState(s)[base]; if (!st) return ''; const bill = FD.importBill(s).by[base] || 0; const off = !!FD.food(s).noImport[base];
    const ok = st.fed >= 1 ? '<span class="good">✓</span>' : '<span class="bad">short</span>';
    return `<tr><td>🌾 Food (farms)</td><td>${fmt(st.prod)} ${st.prod >= pop ? '<span class="good">✓</span>' : ''}</td></tr>${st.shared > 0 ? `<tr><td>🤖 Shared by Meridian</td><td>+${fmt(st.shared)}</td></tr>` : ''}<tr><td>🚀 Supply runs from Earth</td><td>${off ? '<span class="muted">off</span>' : st.imported > 0 ? `+${fmt(st.imported)} · <span style="color:${RES.credits.color}">${RES.credits.icon}${fmt(bill)}/h</span>` : '<span class="muted">not needed</span>'} <button class="btn small" data-a="foodImports" data-k="${base}" style="padding:2px 8px">${off ? 'Turn on' : 'Turn off'}</button></td></tr><tr><td>🍽 Fed</td><td>${pct(st.fed)} ${ok}</td></tr>`; }
  colonyHTML(base: string) {
    const s = this.s, B = s.bases[base]; if (!B || base === 'earth') return ''; const R = this.A.R.col[base]; const L = SO.lifeSupport(s, base); const pop = Math.floor(B.pop || 0); const C = SO.COLONY[base];
    const need = (v: number) => (v >= pop ? '<span class="good">✓</span>' : '<span class="bad">short</span>');
    return `<div class="box"><b class="ox">Colony: ${esc(B.name)}</b><table class="stats"><tr><td>👥 Colonists</td><td>${fmt(pop)} / ${fmt(R ? R.house : 0)} housing</td></tr><tr><td>💧 Water (${base === 'venus' ? 'cloud skimmers' : base === 'titan' ? 'ice and refineries' : 'ice mines'})</td><td>${fmt(L.water)} ${need(L.water)}</td></tr><tr><td>🫧 Air (hub, greenhouses, domes)</td><td>${L.air === Infinity ? 'open sky <span class="good">✓</span>' : `${fmt(L.air)} ${need(L.air)}`}</td></tr>${this.foodRows(base, pop)}${TERRA[base] ? `<tr><td>🌍 Terraforming</td><td>${SO.terraStage(s, base)} / ${TERRA[base].stages.length}${SO.terraJob(s, base) ? ' (under way)' : ''}</td></tr>` : ''}${SO.relayLevel(s, base) ? `<tr><td>📡 Relays</td><td>+${Math.round(SO.relayLevel(s, base) * RELAY.bonus * 100)}% output</td></tr>` : ''}<tr><td>📈 Growth</td><td>${R && R.grow > 0 && pop < R.house ? `+${R.grow.toFixed(1)}/h` : R && R.ls < 1 ? 'stopped: life support short' : pop >= (R ? R.house : 0) ? 'housing full' : '–'}</td></tr><tr><td>🛠 Jobs filled</td><td>${pct(R ? R.staff : 1)}</td></tr></table>
      ${L.ls < 1 ? `<p class="why">Life support is short: growth has stopped and work is slower. ${L.water < pop ? 'More water: Ice Mines. ' : ''}${L.air < pop ? 'More air: Greenhouses and the hub. ' : ''}${L.fed < 1 ? 'More food: Algae Vats, Greenhouses, Deep Farms, or supply runs from Earth. ' : ''}</p>` : ''}${C ? `<div class="muted" style="font-size:12px">${C.traits.map((t) => '• ' + esc(t)).join('<br>')}</div>` : ''}</div>`;
  }
  basesHTML() { const s = this.s; return `<h1 style="font-size:22px">Your worlds</h1><div class="bots" style="text-align:left">${Object.entries(s.bases).map(([k, B]) => `<div class="botc" style="grid-template-columns:1fr auto"><div><b>${worldIcon(k)} ${esc(B.name)}</b><div class="meta">${esc(BODIES[B.body]?.name || k)}${k !== 'earth' ? ` · ${fmt(Math.floor(B.pop || 0))} colonists` : ''} · ${B.items.length} buildings</div></div>${s.at === k ? '<span class="good ox">You are here</span>' : `<button class="btn small gold" data-a="travel" data-k="${k}">Go</button>`}</div>`).join('')}</div><button class="btn small" data-a="map" style="margin-top:8px">🪐 Solar System map</button> <button class="btn small" data-a="empire">👑 Empire overview</button> <button class="btn small" data-a="closeModal">Close</button>`; }
  act(a: string, t: HTMLElement): boolean {
    const s = this.s, A = this.A, ui = this.ui;
    switch (a) {
      case 'foodImports': { const k = t.dataset.k!; FD.setImports(s, k, !!FD.food(s).noImport[k]); A.audio.play('tap'); A.changed(); ui.renderPanel(); return true; }
      case 'map': ui.closeModal(); ui.closeOver(); A.openMap(); return true;
      case 'mapPick': this.sel = t.dataset.b || null; this.fleet = false; A.world.mapSel = this.sel; if (this.sel) A.world.system?.setFocus(this.sel); ui.renderPanel(); A.audio.play('tap'); return true;
      case 'mapClose': this.sel = null; A.world.mapSel = null; A.world.system?.setFocus(''); ui.renderPanel(); return true;
      case 'fleet': if (A.world.mode !== 'system') A.openMap(); this.fleet = true; ui.renderPanel(); A.audio.play('tap'); return true;
      case 'fleetClose': this.fleet = false; ui.renderPanel(); return true;
      case 'buildShip': { const r = SO.startShip(s, t.dataset.k!); if (r.ok) { A.audio.play('build'); A.changed(); ui.renderPanel(); } else ui.deny(r.why); return true; }
      case 'voyage': { const P = JSON.parse(t.dataset.p!); const r = SO.startVoyage(s, P); if (r.ok) { A.audio.play('launch'); ui.toast(`The ${esc(SHIPS[r.ship!].name)} is on its way: ${esc(r.ms.name)}`, 'gold'); A.changed(); ui.renderPanel(); } else ui.deny(r.why); return true; }
      case 'travel': ui.closeModal(); A.travel(t.dataset.k!); return true;
      case 'terra': { const r = SO.startTerra(s, t.dataset.k!); if (r.ok) { A.audio.play('build'); ui.toast(`Terraforming begins: ${esc(r.stage!.name)}`, 'gold'); A.changed(); ui.renderPanel(); } else ui.deny(r.why); return true; }
      case 'relay': { const r = SO.startRelay(s, t.dataset.k!); if (r.ok) { A.audio.play('launch'); ui.toast(`Relay satellites launched to ${esc(BODIES[t.dataset.k!].name)}`, 'good'); A.changed(); ui.renderPanel(); } else ui.deny(r.why); return true; }
      case 'bases': ui.modal(this.basesHTML()); A.audio.play('tap'); return true;
    }
    return false;
  }
}
export const worldIcon = (k: string) => ({ earth: '🌍', moon: '🌕', mars: '🔴', venus: '🟡', ceres: '🪨', titan: '🟠' } as Record<string, string>)[k] || '🪐';
export { icon, G };
