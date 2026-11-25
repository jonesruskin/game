// The interstellar screens: the star map's panels (a star's facts and planets, light-sail surveys, settling a planet;
// Sol's megastructures and the starship yard), labels over the stars, each star colony's development and
// specialisation (on its Colony Hub), and the Empire overview of every world.
import { esc, fmt, fmtTime, clamp } from '../core/util';
import * as ST from '../core/stars';
import * as SO from '../core/solar';
import { STARS, CLASS, PTYPE, DRIVES, DRIVE_ORDER, SPECS, MEGA, COLONY_MAX, EXO_TERRA } from '../data/stars';
import { RES } from '../data/resources';
import { TECH } from '../data/research';
import { BODIES } from '../data/solar';
import type { UI } from './ui';
import { costHTML } from './ui';
import { worldIcon } from './solar';
import { bioAt, life } from '../core/life';
import { RUNGS } from '../data/life';
const perH = (o: Record<string, number>) => Object.entries(o).filter(([, n]) => n > 0).map(([k, n]) => `<span class="cost"><span style="color:${RES[k].color}">${RES[k].icon}</span>${fmt(n)}/h</span>`).join(' ');
const PIC: Record<string, string> = { temperate: '🌍', ocean: '🌊', desert: '🏜', super: '🪨', rocky: '🌑', ice: '🧊', lava: '🌋', gas: '🪐', neptune: '🔵', dwarf: '✨', belt: '☄' };
export class StarsUI {
  sel: string | null = null;
  constructor(private ui: UI) {}
  get s() { return this.ui.app.s; } get A() { return this.ui.app; }
  private job(kind: string, f: (j: any) => boolean) { return this.s.jobs.find((j) => j.kind === kind && f(j)); }
  private progress(j: any, label: string) { return `<div class="now"><div class="grow"><div class="tier">${esc(label)}</div><div class="bar gold" style="margin-top:6px"><i style="width:${clamp((Date.now() - j.start) / (j.end - j.start)) * 100}%"></i></div></div><div style="text-align:right"><b class="ox">${fmtTime((j.end - Date.now()) / 1000)}</b><br><button class="btn gold small" data-a="finish" data-job="${j.id}">Finish</button></div></div>`; }
  private btn(c: any, act: string, label: string, data = '') { return `<button class="btn small ${c.ok ? 'gold' : ''}" data-a="${act}" ${data} ${c.ok || c.why === 'Not enough resources' ? '' : 'disabled'}>${c.ok ? label : esc(c.why === 'Research required' && c.tech ? `Research ${TECH[c.tech]?.name || c.tech}` : c.why || '')}</button>`; }
  // ---------------- labels and map state ----------------
  // life on a surveyed world, once Exoplanetology can read its air (tap to open the Life screen)
  private lifeTag(star: string, p: number) { const s = this.s, b = bioAt(star, p); if (!b || !s.tech.exoplanetology) return ''; const f = life(s).found['x:' + star + ':' + p];
    return ` · <span class="good" data-a="lifeAt" data-k="x:${star}:${p}" style="cursor:pointer;text-decoration:underline dotted">🧬 ${f ? esc(b.name) : 'biosignature'} (${esc(RUNGS[b.rung].name.toLowerCase())})</span>`; }
  frameLabels() { const W = this.A.world; if (W.mode !== 'stars' || !W.starMap) return; const M = W.starMap, s = this.s, I = ST.ist(s); const root = document.getElementById('bubbles')!; const r = W.renderer.domElement.getBoundingClientRect();
    const cols = new Set(Object.values(I.colonies).map((C) => C.star)); const ids = Object.keys(STARS).filter((id) => id === 'sol' || !STARS[id].proc || I.surveyed[id] || id === this.sel); const seen = new Set<string>();
    for (const id of ids) { const p = M.project(id, r.width, r.height); if (!p) continue; seen.add(id); let el = root.querySelector(`[data-slbl="${id}"]`) as HTMLElement | null;
      if (!el) { el = document.createElement('div'); el.className = 'bub lbl'; el.dataset.slbl = id; el.dataset.a = 'starPick'; el.dataset.b = id; root.appendChild(el); }
      const tag = cols.has(id) ? '🏠 ' : I.surveyed[id] ? '' : id === 'sol' ? '' : '? '; const html = `${tag}${esc(STARS[id].name)}`; if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; } el.style.left = r.left + p.x + 'px'; el.style.top = r.top + p.y + 'px'; el.classList.toggle('full', id === this.sel); }
    root.querySelectorAll('[data-slbl]').forEach((e) => { if (!seen.has((e as HTMLElement).dataset.slbl!)) e.remove(); });
    if (this.ui.tick % 8 === 0) { M.sync(ST.surveyRange(s), I.surveyed, Object.values(I.colonies).map((C) => C.star), I.gates);
      M.setFlights(s.jobs.filter((j) => j.kind === 'sail' || j.kind === 'star').map((j) => ({ star: j.kind === 'sail' ? j.star : j.payload.star, f: (Date.now() - j.start) / (j.end - j.start), col: j.kind === 'sail' ? '#ffd36a' : DRIVES[j.ship].col }))); } }
  clearLabels() { document.querySelectorAll('#bubbles [data-slbl]').forEach((e) => e.remove()); }
  // ---------------- panels ----------------
  panelHTML(): string { const id = this.sel; if (!id) return this.overview(); if (id === 'sol') return this.sol(); return this.star(id); }
  private overview() { const s = this.s, I = ST.ist(s); const cols = Object.entries(I.colonies);
    return `<h2>The stars</h2><p class="desc">${fmt(Object.keys(STARS).length - 1)} star systems within 60 light-years, at their real positions. Survey them with light sails pushed by the Starshot array (select the Sun), then send settlers.</p>
      <table class="stats"><tr><td>Survey range</td><td>${ST.surveyRange(s) ? ST.surveyRange(s) + ' light-years' : 'none yet'}</td></tr><tr><td>Systems surveyed</td><td>${Object.keys(I.surveyed).length}</td></tr><tr><td>Star colonies</td><td>${cols.length} / ${ST.capacity(s)}</td></tr><tr><td>Starships</td><td>${DRIVE_ORDER.map((d) => `${DRIVES[d].name} ×${I.ships[d] || 0}`).join(' · ')}</td></tr></table>
      ${cols.map(([k, C]) => `<div class="botc" style="grid-template-columns:1fr auto"><div><b>${PIC[STARS[C.star].planets[C.p].type]} ${esc(STARS[C.star].planets[C.p].name)}</b> <span class="muted">${esc(STARS[C.star].name)} · level ${C.lvl} · ${esc(SPECS[C.spec].name)}</span></div><button class="btn small gold" data-a="travel" data-k="${k}">Visit</button></div>`).join('')}
      <button class="btn" style="width:100%;margin-top:8px" data-a="starPick" data-b="sol">☀ Sol: megastructures and starships</button>`; }
  private sol() { const s = this.s, I = ST.ist(s);
    const megas = ['laser', 'dyson', 'gate', 'matrioshka', 'ringworld'].filter((m) => MEGA[m] && (!['matrioshka', 'ringworld'].includes(m) || s.tech[MEGA[m].req] || ST.megaStage(s, m))).map((m) => { const d = MEGA[m], n = ST.megaStage(s, m), c = ST.canMega(s, m), j = this.job('mega', (x) => x.mega === m);
      if (d.fund && !j && n < d.stages) return `<div class="box"><div class="row"><b class="ox grow">${esc(d.name)}</b><span class="muted ox">${n} / ${d.stages}</span></div><p class="desc">${esc(d.desc)}</p>${this.ui.beyond.fundBox('mega:' + m, ST.megaCost(m, n), 'mega', `Build stage ${n + 1}`, c, `data-k="${m}"`)}</div>`;
      return `<div class="box"><div class="row"><b class="ox grow">${esc(d.name)}</b><span class="muted ox">${n} / ${d.stages}</span></div><div class="bar" style="margin:6px 0"><i style="width:${(n / d.stages) * 100}%"></i></div><p class="desc">${esc(d.desc)}</p><div class="meta">${esc(d.effect)}</div>
        ${j ? this.progress(j, `STAGE ${j.stage + 1} UNDER CONSTRUCTION`) : n < d.stages ? `<div class="row"><span class="grow">${costHTML(ST.megaCost(m, n), s.res)}</span><span class="muted" style="font-size:11px">⏱ ${fmtTime(ST.megaTime(m, n))}</span></div>${this.btn(c, 'mega', `Build stage ${n + 1}`, `data-k="${m}"`)}` : '<p class="good">Complete.</p>'}</div>`; }).join('');
    const yard = DRIVE_ORDER.map((d) => { const D = DRIVES[d], c = ST.canBuildDrive(s, d); return `<div class="botc" style="grid-template-columns:1fr auto"><div><b style="color:${D.col}">${esc(D.name)}</b> <span class="muted" style="font-size:11px">${esc(D.role)} · ${D.hpl} h per light-year · ${I.ships[d] || 0} built, ${ST.drivesFree(s, d)} free</span><div class="meta">${esc(D.desc)}</div><div>${costHTML(D.cost, s.res)}</div></div>${this.btn(c, 'drive', 'Build', `data-k="${d}"`)}</div>`; }).join('');
    const dj = this.job('drive', () => true);
    return `<button class="ibtn x" data-a="starClose">✕</button><h2>☀ Sol</h2><div class="sub">Home. Megastructures and the interstellar shipyard.</div>${megas}<h3 style="margin-top:10px">Starships (Orbital Shipyard level ${SO.yardLevel(s)})</h3>${dj ? this.progress(dj, `BUILDING ${DRIVES[dj.ship].name.toUpperCase()}`) : ''}<div class="bots">${yard}</div>`; }
  private star(id: string) { const s = this.s, I = ST.ist(s), S = STARS[id], C = CLASS[S.cls]; const sv = !!I.surveyed[id]; const sail = this.job('sail', (j) => j.star === id);
    let h = `<button class="ibtn x" data-a="starClose">✕</button><h2>${esc(S.name)}</h2><div class="sub"><span style="color:${C.col}">●</span> ${esc(C.name)} · ${ST.dist(id).toFixed(1)} light-years${S.proc ? ' · Starward catalogue' : ''}</div><p class="desc">${esc(S.fact)}</p>`;
    if (!sv) { const c = ST.canSail(s, id); h += sail ? this.progress(sail, 'LIGHT SAIL ON ITS WAY') : `<div class="box"><b class="ox">Light-sail survey</b><p class="desc">A gram-scale probe on a sail of light, pushed by the Starshot array to a fifth of light speed. It maps the system and every planet in it.</p><div class="row"><span class="grow">${costHTML(c.ms.cost, s.res)}</span><span class="muted" style="font-size:11px">⏱ ${fmtTime(c.ms.time)}</span></div>${this.btn(c, 'sail', '⛵ Launch a sail', `data-k="${id}"`)}</div>`;
      return h + (S.planets.length ? `<div class="meta">${S.planets.length} known planet${S.planets.length > 1 ? 's' : ''}: survey to learn more.</div>` : ''); }
    if (!S.planets.length) h += '<p class="desc">No planets: a quiet system. Its light still helps the survey network.</p>';
    S.planets.forEach((pl, p) => { const key = ST.ckey(id, p), T = PTYPE[pl.type], col = I.colonies[key]; const go = this.job('star', (j) => j.payload.star === id && j.payload.p === p);
      h += `<div class="box planet"><div class="row"><b class="grow">${PIC[pl.type] || '•'} ${esc(pl.name)}</b><span class="muted">${esc(T.name)}</span></div><div class="meta">Habitability ${Math.round(pl.hab * 100)}%${Object.keys(pl.res).length ? ' · rich in ' + Object.keys(pl.res).map((r) => `<span style="color:${RES[r].color}">${esc(RES[r].name)}</span>`).join(', ') : ''}${ST.exoBreathable(key) ? ' · <span class="good">breathable air</span>' : ''}${this.lifeTag(id, p)}</div>${pl.note ? `<p class="desc">${esc(pl.note)}</p>` : ''}`;
      if (col) h += `<div class="row"><span class="grow good">🏠 Colony, level ${col.lvl} · ${esc(SPECS[col.spec].name)}</span><button class="btn small gold" data-a="travel" data-k="${key}">Visit</button></div>`;
      else if (go) h += this.progress(go, `${DRIVES[go.ship].name.toUpperCase()} EN ROUTE`);
      else { const c = ST.canFound(s, id, p); h += `<div class="row"><span class="grow">${costHTML(c.cost || ST.foundCost(s), s.res)}</span>${c.time ? `<span class="muted" style="font-size:11px">⏱ ${fmtTime(c.time)}</span>` : ''}</div>${this.btn(c, 'found', c.ok ? `🚀 Send the ${DRIVES[c.ship].name}` : '', `data-k="${id}" data-p="${p}"`)}`; }
      h += '</div>'; });
    if (Object.values(I.colonies).some((C) => C.star === id)) { const c = ST.canGate(s, id), j = this.job('gatebuild', (x) => x.star === id); h += `<div class="box"><b class="ox">Wormhole gate</b><p class="desc">Pair this system with the Sol Gate: voyages take ten minutes and the colony's trade grows by a quarter.</p>${I.gates[id] ? '<p class="good">The gate is open.</p>' : j ? this.progress(j, 'GATE UNDER CONSTRUCTION') : `<div>${costHTML(ST.gateCost(), s.res)}</div>${this.btn(c, 'gate', 'Open a gate', `data-k="${id}"`)}`}</div>`; }
    return h; }
  // ---------------- a star colony, on its Colony Hub ----------------
  colonyHTML(key: string) { const s = this.s, C = ST.ist(s).colonies[key]; if (!C) return ''; const S = STARS[C.star], pl = S.planets[C.p]; const c = ST.canDevelop(s, key), j = this.job('develop', (x) => x.key === key);
    return `<div class="box"><div class="row"><b class="ox grow">${esc(pl.name)}: the whole world</b><span class="muted ox">level ${C.lvl} / ${COLONY_MAX}</span></div><p class="desc">Your base is where the first families live. Beyond it, towns, mines and farms spread across the planet as it develops. Habitability ${Math.round(pl.hab * 100)}% under ${esc(S.name)}${ST.gated(s, C.star) ? ' · gate open (+25%)' : ''}.</p>
      <div class="meta">Produces ${perH(ST.colonyOut(s, key))}</div><div class="specs">${Object.entries(SPECS).map(([k, sp]) => `<button class="tab ${C.spec === k ? 'on' : ''}" data-a="spec" data-k="${key}" data-t="${k}" title="${esc(sp.desc)}">${esc(sp.name)}</button>`).join('')}</div>
      ${j ? this.progress(j, `DEVELOPING TO LEVEL ${j.to}`) : C.lvl < COLONY_MAX ? `<div class="row" style="margin-top:6px"><span class="grow">${costHTML(c.cost || ST.devCost(C.lvl + 1), s.res)}</span><span class="muted" style="font-size:11px">⏱ ${fmtTime(ST.devTime(C.lvl + 1))}</span></div>${this.btn(c, 'develop', `Develop to level ${C.lvl + 1}`, `data-k="${key}"`)}` : '<p class="good">Fully developed.</p>'}</div>${this.terraHTML(key)}`; }
  // terraforming a star colony: four stages, each one visible on the world
  private terraHTML(key: string) { const s = this.s; if (!ST.exoTerraformable(key)) return ''; const n = ST.exoTerraStage(s, key), j = this.job('exoterra', (x) => x.key === key), c = ST.canExoTerra(s, key);
    const steps = EXO_TERRA.map((st, i) => `<div class="tstep ${i < n ? 'done' : i === n ? 'next' : ''}"><b>${i < n ? '✓' : i + 1}</b> ${esc(st.name)}</div>`).join('');
    return `<div class="box"><div class="row"><b class="ox grow">🌍 Worldseeding</b><span class="muted ox">${n} / ${EXO_TERRA.length}</span></div><div class="tsteps">${steps}</div>${n < EXO_TERRA.length ? `<p class="desc">${esc(EXO_TERRA[n].desc)}</p>` : '<p class="good">A living world with an open sky. No more domes.</p>'}
      ${j ? this.progress(j, `STAGE ${(j.stage || 0) + 1}: ${EXO_TERRA[j.stage || 0].name.toUpperCase()}`) : n < EXO_TERRA.length ? `<div class="row" style="margin-top:6px"><span class="grow">${costHTML(c.cost || EXO_TERRA[n].cost, s.res)}</span><span class="muted" style="font-size:11px">⏱ ${fmtTime(EXO_TERRA[n].days * 86400)}</span></div>${this.btn(c, 'exoTerra', `Begin stage ${n + 1}`, `data-k="${key}"`)}` : ''}</div>`; }
  // ---------------- the Empire overview ----------------
  empireHTML() { const s = this.s, R = this.A.R; const I = ST.ist(s); let pop = 0; const rows = Object.entries(s.bases).map(([k, B]) => { const col = R.col[k]; const p = k === 'earth' ? 0 : Math.floor(B.pop || 0); pop += p; const exo = ST.isExo(k); const where = exo ? `${STARS[k.split(':')[0]].name}` : BODIES[B.body]?.name || k;
      return `<div class="botc" style="grid-template-columns:1fr auto"><div><b>${exo ? PIC[STARS[k.split(':')[0]].planets[+k.split(':')[1]].type] : worldIcon(k)} ${esc(B.name)}</b> <span class="muted">${esc(where)}</span><div class="meta">${k === 'earth' ? 'Home: Cape Horizon' : `${fmt(p)} colonists${col ? ` / ${fmt(col.house)} housing` : ''}`} · ${B.items.length} buildings${exo && I.colonies[k] ? ` · world level ${I.colonies[k].lvl} (${perH(ST.colonyOut(s, k))})` : ''}</div></div>${s.at === k ? '<span class="good ox">Here</span>' : `<button class="btn small gold" data-a="travel" data-k="${k}">Go</button>`}</div>`; }).join('');
    const inc = Object.entries(R.prod).filter(([r, n]) => n > 0 && RES[r]).map(([r, n]) => [r, n + (R.collect[r] || 0)] as [string, number]);
    return `<div class="head"><h1>Empire</h1><span class="chip">👥 ${fmt(pop)} colonists off Earth</span><button class="ibtn" data-a="close">✕</button></div><div class="body"><h3>Income</h3><div class="meta" style="font-size:13px">${perH(Object.fromEntries(inc))}</div>
      <h3 style="margin-top:10px">Worlds (${Object.keys(s.bases).length})</h3><div class="bots">${rows}</div><div class="row" style="gap:8px;margin-top:10px"><button class="btn" data-a="map">🪐 Solar System</button>${this.starsOpen() ? '<button class="btn" data-a="starsOpen">✨ Star map</button>' : ''}</div></div>`; }
  starsOpen() { const s = this.s; return !!(s.tech.laserSails || Object.keys(ST.ist(s).surveyed).length); }
  // ---------------- actions ----------------
  act(a: string, t: HTMLElement): boolean { const s = this.s, A = this.A, ui = this.ui; const done = (r: any, msg: string, snd: Parameters<typeof A.audio.play>[0] = 'build') => { if (r.ok) { A.audio.play(snd); ui.toast(msg, 'good'); A.changed(); ui.renderPanel(); } else ui.deny(r.why); return true; };
    switch (a) {
      case 'exoTerra': { const r = ST.startExoTerra(this.s, t.dataset.k!); if (r.ok) { this.A.audio.play('build'); this.ui.toast('Worldseeding begins', 'gold'); this.A.changed(); this.ui.renderPanel(); } else this.ui.deny((r as any).why); return true; }
      case 'starsOpen': ui.closeOver(); ui.closeModal(); A.openStars(); return true;
      case 'starPick': this.sel = t.dataset.b || null; A.world.starMap?.setFocus(this.sel); ui.renderPanel(); A.audio.play('tap'); return true;
      case 'starClose': this.sel = null; A.world.starMap?.setFocus(null); ui.renderPanel(); return true;
      case 'sail': return done(ST.startSail(s, t.dataset.k!), `A light sail is on its way to ${esc(STARS[t.dataset.k!].name)}`, 'launch');
      case 'drive': return done(ST.startDrive(s, t.dataset.k!), `The shipyard starts on the ${esc(DRIVES[t.dataset.k!].name)}`);
      case 'found': { const st = t.dataset.k!, p = +t.dataset.p!; return done(ST.startFound(s, st, p), `Settlers are on their way to ${esc(STARS[st].planets[p].name)}`, 'launch'); }
      case 'mega': return done(ST.startMega(s, t.dataset.k!), `Construction begins: ${esc(MEGA[t.dataset.k!].name)}`);
      case 'gate': return done(ST.startGate(s, t.dataset.k!), 'Gate construction begins');
      case 'develop': return done(ST.startDevelop(s, t.dataset.k!), 'Development begins');
      case 'spec': ST.setSpec(s, t.dataset.k!, t.dataset.t!); A.changed(); ui.renderPanel(); A.audio.play('tap'); return true;
      case 'empire': ui.closeModal(); ui.openOver('empire'); A.audio.play('tap'); return true;
    }
    return false; }
}
