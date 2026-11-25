// The endgame screens: the Local Group (the relay network, expeditions, their stories and gifts), the funding box used
// by every project too big for storage, the road to Type III (what the empire commands, in watts) and Ascension.
import { esc, fmt, fmtTime, clamp } from '../core/util';
import * as BY from '../core/beyond';
import * as F from '../core/fund';
import { kardashev, watts } from '../core/econ';
import { GALAXIES, EXPEDITIONS, HRELAY, PERKS } from '../data/beyond';
import { RES } from '../data/resources';
import { TECH } from '../data/research';
import { ist, megaStage } from '../core/stars';
import type { UI } from './ui';
const ly = (d: number) => (d >= 1e6 ? `${(d / 1e6).toFixed(2)} million` : fmt(d)) + ' light-years';
const sci = (w: number) => { const e = Math.floor(Math.log10(w)); return `${(w / Math.pow(10, e)).toFixed(1)} × 10<sup>${e}</sup> W`; };
export class BeyondUI {
  sel: string | null = null;
  constructor(private ui: UI) {}
  get s() { return this.ui.app.s; } get A() { return this.ui.app; }
  available() { const s = this.s; return !!(s.tech.relayNetwork || s.flags.relayFound || s.tech.intergalacticDrive); }
  // a project too big for storage: a pool filled over time, by hand or with overflowing production
  fundBox(key: string, cost: Record<string, number>, startAct: string, startLabel: string, c: any, data = '') { const s = this.s; const p = F.pool(s, key); const prog = F.progress(s, key, cost); const rt = F.routed(s, key);
    return `<div class="fund"><div class="bar ${prog >= 1 ? 'green' : 'gold'}"><i style="width:${prog * 100}%"></i></div><div class="meta">${Object.entries(cost).map(([r, n]) => `<span class="cost" style="color:${(p[r] || 0) + (s.res[r] || 0) >= n ? RES[r].color : '#ff8a8a'}">${RES[r].icon}${fmt(Math.min(n, p[r] || 0))} / ${fmt(n)}</span>`).join(' ')}</div>
      <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px"><button class="btn small" data-a="fundIn" data-k="${key}">Invest what we have</button><button class="btn small ${rt ? 'gold' : ''}" data-a="fundRoute" data-k="${key}">${rt ? '✓ Overflow routed here' : 'Route overflow here'}</button><button class="btn small ${c.ok ? 'gold' : ''}" data-a="${startAct}" ${data} ${c.ok ? '' : 'disabled'}>${c.ok ? startLabel : esc(c.why || startLabel)}</button></div></div>`; }
  private costFor(key: string): Record<string, number> | null { const s = this.s; if (key === 'relay') return BY.bey(s).relay < HRELAY.stages ? BY.relayCost(BY.bey(s).relay) : null; if (key.startsWith('exp:')) return EXPEDITIONS[key.slice(4)].cost; return null; }
  frameLabels() { const W = this.A.world; if (W.mode !== 'galaxy' || !W.galaxy) return; const G = W.galaxy; const root = document.getElementById('bubbles')!; const r = W.renderer.domElement.getBoundingClientRect(); const seen = new Set<string>();
    for (const id in GALAXIES) { const p = G.project(id, r.width, r.height); if (!p) continue; seen.add(id); let el = root.querySelector(`[data-glbl="${id}"]`) as HTMLElement | null; if (!el) { el = document.createElement('div'); el.className = 'bub lbl'; el.dataset.glbl = id; el.dataset.a = 'galPick'; el.dataset.b = id; root.appendChild(el); }
      const html = `${BY.bey(this.s).visited[id] ? '✓ ' : ''}${esc(GALAXIES[id].name)}`; if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; } el.style.left = r.left + p.x + 'px'; el.style.top = r.top + p.y + 'px'; el.classList.toggle('full', id === this.sel); }
    root.querySelectorAll('[data-glbl]').forEach((e) => { if (!seen.has((e as HTMLElement).dataset.glbl!)) e.remove(); });
    if (this.ui.tick % 8 === 0) { const j = this.s.jobs.find((x) => x.kind === 'expedition'); G.sync(BY.bey(this.s).relay, BY.bey(this.s).visited, j ? { gal: j.gal, f: (Date.now() - j.start) / (j.end - j.start) } : null); } }
  clearLabels() { document.querySelectorAll('#bubbles [data-glbl]').forEach((e) => e.remove()); }
  private job(kind: string) { return this.s.jobs.find((j) => j.kind === kind); }
  private prog(j: any, label: string) { return `<div class="now"><div class="grow"><div class="tier">${esc(label)}</div><div class="bar gold" style="margin-top:6px"><i style="width:${clamp((Date.now() - j.start) / (j.end - j.start)) * 100}%"></i></div></div><div style="text-align:right"><b class="ox">${fmtTime((j.end - Date.now()) / 1000)}</b><br><button class="btn gold small" data-a="finish" data-job="${j.id}">Finish</button></div></div>`; }
  // the road to Type III, in watts
  kardashevHTML() { const s = this.s, R = this.A.R; const k = kardashev(s, R), w = watts(s, R); const I = ist(s), B = BY.bey(s);
    const rows: [string, number][] = [['Earth and the colonies (energy grid)', 1.8e13 * Math.pow(1 + R.gen / 25, 0.8)], ['The Dyson Swarm', megaStage(s, 'dyson') * 3.8e25], ['Matrioshka Brain and Ring Habitat', megaStage(s, 'matrioshka') * 2e26 + megaStage(s, 'ringworld') * 1e27], ['Star colonies', Object.values(I.colonies).reduce((a, C) => a + C.lvl * 2e24, 0)], ['The Hollow relay network', B.relay * 1.5e34], ['Galaxies reached', Object.keys(B.visited).length * 1.7e35]];
    return `<div class="box"><div class="row"><b class="ox grow">Kardashev ${k.toFixed(3)}</b><span class="muted">${sci(w)}</span></div><div class="bar ${k >= 3 ? 'green' : 'gold'}" style="margin:6px 0"><i style="width:${clamp(k / 3) * 100}%"></i></div><div class="meta">Type I: a planet's power (10<sup>16</sup> W). Type II: a star's (10<sup>26</sup> W). Type III: a galaxy's (10<sup>36</sup> W).</div><table class="stats">${rows.filter(([, v]) => v > 0).map(([n, v]) => `<tr><td>${esc(n)}</td><td>${sci(v)}</td></tr>`).join('')}</table></div>`; }
  panelHTML() { const s = this.s, B = BY.bey(s); const id = this.sel;
    if (!id || id === 'milkyway') { const j = this.job('hrelay'); const c = BY.canRelay(s); const cost = this.costFor('relay');
      return `${id ? '<button class="ibtn x" data-a="galClose">✕</button>' : ''}<h2>The Local Group</h2><p class="desc">Fifty-odd galaxies bound by gravity, the Milky Way among the largest. The Hollow left relays on the paths between them; wake them, and expeditions can cross the dark.</p>${this.kardashevHTML()}
        <div class="box"><div class="row"><b class="ox grow">${esc(HRELAY.name)}</b><span class="muted ox">${B.relay} / ${HRELAY.stages}</span></div><p class="desc">Each stage wakes one more relay and reaches one galaxy further.</p>${j ? this.prog(j, `WAKING RELAY ${(j.stage || 0) + 1}`) : cost ? (s.tech[HRELAY.req] ? this.fundBox('relay', cost, 'relayGo', `Wake relay ${B.relay + 1}`, c) : `<p class="why">Research ${esc(TECH[HRELAY.req]?.name || HRELAY.req)}</p>`) : '<p class="good">Every relay is awake.</p>'}</div>
        ${BY.canAscend(s) ? '<button class="btn gold" style="width:100%" data-a="ascendOpen">✨ Ascension</button>' : ''}`; }
    const G = GALAXIES[id], E = EXPEDITIONS[id]; let h = `<button class="ibtn x" data-a="galClose">✕</button><h2>${esc(G.name)}</h2><div class="sub">${ly(G.d)} away</div><p class="desc">${esc(G.fact)}</p>`;
    if (E) { const v = B.visited[id]; const j = this.job('expedition'); const c = BY.canExpedition(s, id); h += `<div class="box"><div class="row"><b class="ox grow">Expedition: ${esc(E.name)}</b><span class="muted">${E.days} days</span></div><div class="meta">Gift: <b class="good">${esc(E.perkText)}</b> · reward ${Object.entries(E.reward).map(([r, n]) => `<span style="color:${RES[r].color}">${RES[r].icon}</span>${fmt(n)}`).join(' ')}</div>`;
      if (v) h += `<p class="desc">${esc(E.story)}</p><p class="good">Visited.</p>`; else if (j && j.gal === id) h += this.prog(j, 'EXPEDITION UNDER WAY'); else h += this.fundBox('exp:' + id, E.cost, 'expGo', 'Launch the expedition', c, `data-k="${id}"`);
      h += '</div>'; }
    return h; }
  ascensionHTML() { const s = this.s, A = BY.ascOf(s); const earn = BY.ascensionPoints(s); const free = BY.perkFree(s);
    return `<div class="head"><h1>Ascension</h1><span class="chip">✨ ${free} points to spend</span><button class="ibtn" data-a="close">✕</button></div><div class="body"><p class="desc">At the Far Shore the Ascendants offer what every civilisation that crossed the dark was offered: begin again, wiser. Ascending starts a new programme from one launch pad, and keeps your Ascension perks, the Robot Registry, your style, the calendar, your Orbital Trials merit and your dark matter.</p>
      <div class="box"><b class="ox">Ascending now would earn ${fmt(earn)} points</b><div class="meta">From technologies, Mission Control, colonies, outposts, hives destroyed, galaxies reached and worlds terraformed. Ascended ${A.count} time${A.count === 1 ? '' : 's'}.</div>${BY.canAscend(s) ? '<button class="btn gold" data-a="ascendGo">✨ Ascend</button>' : '<p class="why">Reach the Far Shore to be offered Ascension.</p>'}</div>
      <h3>Perks (kept for ever)</h3><div class="bots">${Object.entries(PERKS).map(([id, P]) => `<div class="botc" style="grid-template-columns:1fr auto"><div><b>${esc(P.name)}</b> <span class="muted">rank ${A.spent[id] || 0} / ${P.max}</span><div class="meta">${esc(P.desc)}</div></div><button class="btn small ${free >= P.cost && (A.spent[id] || 0) < P.max ? 'gold' : ''}" data-a="perk" data-k="${id}" ${free >= P.cost && (A.spent[id] || 0) < P.max ? '' : 'disabled'}>✨ ${P.cost}</button></div>`).join('')}</div></div>`; }
  act(a: string, t: HTMLElement): boolean { const s = this.s, A = this.A, ui = this.ui; const k = t.dataset.k!;
    switch (a) {
      case 'galaxyOpen': ui.closeOver(); ui.closeModal(); A.openGalaxy(); return true;
      case 'galPick': this.sel = t.dataset.b || null; A.world.galaxy?.setFocus(this.sel); ui.renderPanel(); A.audio.play('tap'); return true;
      case 'galClose': this.sel = null; A.world.galaxy?.setFocus(null); ui.renderPanel(); return true;
      case 'fundIn': { const cost = this.costFor(k) || this.megaCost(k); if (cost) { const n = F.invest(s, k, cost); if (n) { A.audio.play('claim'); A.changed(); } else ui.deny('Nothing to invest'); ui.renderPanel(); } return true; }
      case 'fundRoute': { const cost = this.costFor(k) || this.megaCost(k); if (cost) { F.setRoute(s, F.routed(s, k) ? null : k, cost); A.audio.play('tap'); ui.renderPanel(); } return true; }
      case 'relayGo': { const r = BY.startRelay(s); if (r.ok) { A.audio.play('build'); ui.toast('The relay begins to wake', 'gold'); A.changed(); ui.renderPanel(); } else ui.deny(r.why); return true; }
      case 'expGo': { const r = BY.startExpedition(s, k); if (r.ok) { A.audio.play('launch'); ui.toast(`The expedition sets out for ${esc(GALAXIES[k].name)}`, 'gold'); A.changed(); ui.renderPanel(); } else ui.deny(r.why); return true; }
      case 'ascendOpen': ui.openOver('ascension'); A.audio.play('tap'); return true;
      case 'perk': { const r = BY.buyPerk(s, k); if (r.ok) { A.audio.play('levelup'); A.changed(); ui.renderOver(); } else ui.deny(r.why); return true; }
      case 'ascendGo': ui.modal(`<h1>Ascend?</h1><p class="desc">Your empire begins again from one launch pad, keeping your perks, the Robot Registry, your style, the calendar, your merit and dark matter, and earning ${fmt(BY.ascensionPoints(s))} Ascension points.</p><button class="btn gold" data-a="ascendYes">✨ Begin again</button> <button class="btn" data-a="closeModal">Not yet</button>`); return true;
      case 'ascendYes': ui.closeModal(); ui.closeOver(); A.ascendNow(); return true;
    }
    return false; }
  megaCost(key: string): Record<string, number> | null { if (!key.startsWith('mega:')) return null; const id = key.slice(5); const n = megaStage(this.s, id); return this.A.megaCost(id, n); }
}
