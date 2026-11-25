// Launch Control: missions, satellites, the space station, the hangar and assembly lines, and the rocket designer.
import { ri } from './icons';
import { esc, fmt, fmtTime, clamp, pct } from '../core/util';
import * as SP from '../core/space';
import { designStats, Design, ENGINES, TANKS, TOPS, STAGE_REQ, BOOST_REQ, CLASS_NAME } from '../data/rockets';
import { TECH } from '../data/research';
import { RES } from '../data/resources';
import type { UI } from './ui';
import { costHTML, icon } from './ui';
export class LaunchUI {
  tab: 'missions' | 'sats' | 'station' | 'rockets' = 'missions'; design: Design | null = null;
  constructor(private ui: UI) {}
  get s() { return this.ui.app.s; } get A() { return this.ui.app; }
  private near = (req?: string) => !req || !!this.s.tech[req] || (TECH[req] && TECH[req].req.every((r) => this.s.tech[r]));
  html() {
    const s = this.s, S = SP.sp(s); const tabs: [string, string][] = [['missions', 'Missions'], ['sats', 'Satellites'], ['station', 'Station'], ['rockets', `Rockets (${Object.values(S.hangar).reduce((a, b) => a + b, 0)})`]];
    const flying = s.jobs.filter((j) => j.kind === 'mission'); const fl = flying.map((j) => `<div class="now"><div class="grow"><div class="tier">IN FLIGHT · ${esc(j.design.name)}</div><b class="ox">${esc(j.name)}</b><div class="bar gold" style="margin-top:6px"><i style="width:${clamp(1 - (j.end - Date.now()) / (j.end - j.start)) * 100}%"></i></div></div><div style="text-align:right"><b class="ox">${fmtTime((j.end - Date.now()) / 1000)}</b><br><button class="btn gold small" data-a="finish" data-job="${j.id}">Finish</button></div></div>`).join('');
    let body = ''; if (this.tab === 'missions') body = this.missions(); else if (this.tab === 'sats') body = this.sats(); else if (this.tab === 'station') body = this.station(); else body = this.rockets();
    return `<div class="head"><h1>Launch Control</h1><span class="chip">🚀 ${SP.launchesBusy(s)}/${SP.launchSlots(s)} pads · class ${SP.maxClass(s)} max</span><button class="ibtn" data-a="close">✕</button></div><div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${k === this.tab ? 'on' : ''}" data-a="ltab" data-t="${k}">${n}</button>`).join('')}</div><div class="body">${fl}${body}</div>`;
  }
  private launchBtn(p: SP.Payload, label = 'Launch') { const c = SP.canLaunch(this.s, p); const pj = esc(JSON.stringify(p));
    return `<div class="row"><span class="grow">${costHTML(c.ms.cost, this.s.res)}</span><span class="muted" style="font-size:11px">${ri('time')} ${fmtTime(c.ms.flight)}</span></div>${c.ok ? `<div class="muted" style="font-size:11px">On a ${esc(c.rocket!.name)} · ${pct(c.rel!)} success</div>` : ''}<button class="btn small ${c.ok ? 'gold' : ''}" data-a="launch" data-p="${pj}" ${c.ok || c.why === 'Not enough resources' ? '' : 'disabled'}>${c.ok ? '🚀 ' + label : esc(c.why || '')}</button>${c.noRocket ? '<button class="btn small" data-a="ltab" data-t="rockets">Build a rocket</button>' : ''}`; }
  private missions() {
    const s = this.s, S = SP.sp(s); const list = Object.entries(SP.MISSIONS).filter(([, m]) => m.req.every((r) => this.near(r)) && (m.flags || []).every((f) => s.flags[f]));
    return `<div class="techs">${list.map(([id, m]) => { const done = m.kind !== 'repeat' && m.flag && s.flags[m.flag];
      return `<div class="tech ${done ? 'done' : ''}" style="--bc:#ff8a5b"><div class="row"><span class="tier grow">CLASS ${m.cls}${m.crewed ? ' · CREWED' : ''}${m.lander ? ' · LANDER' : ''}${m.kind === 'repeat' ? ' · REPEATABLE' : ''}</span>${done ? '<span class="good">✓</span>' : ''}</div><b>${esc(m.name)}</b><p class="desc">${esc(m.desc)}</p>${m.reward ? `<div class="unl">Reward: ${costHTML(m.reward)}${m.firstReward && !S.done[id] ? ` + first time ${costHTML(m.firstReward)}` : ''}</div>` : ''}${done ? '' : this.launchBtn({ mission: id })}</div>`; }).join('') || '<p class="muted">Research Rocketry Fundamentals and build the Launch Complex to fly your first mission.</p>'}</div>`;
  }
  private sats() {
    const s = this.s, S = SP.sp(s); let h = `<div class="row" style="margin-bottom:10px">${Object.entries(SP.ORBITS).map(([o, d]) => `<span class="chip">${esc(d.name)} · ${SP.satsIn(s, o).length}/${SP.slotsFor(s, o)}</span>`).join('')}</div>`;
    if (S.sats.length) h += `<h3 class="ox">Your satellites</h3><div class="techs">${S.sats.map((x, i) => { const d = SP.SATS[x.type]; return `<div class="tech" style="--bc:#6ee7ff"><span class="tier">${esc(SP.ORBITS[d.orbit].name)} · MK ${x.lvl}</span><b>${esc(d.name)}</b><p class="desc">${esc(d.desc)}</p>${this.launchBtn({ sat: x.type, idx: i }, 'Upgrade')}</div>`; }).join('')}</div>`;
    const types = Object.entries(SP.SATS).filter(([, d]) => this.near(d.req));
    h += `<h3 class="ox">Launch a new satellite</h3><div class="techs">${types.map(([id, d]) => `<div class="tech ${s.tech[d.req] ? '' : 'locked'}" style="--bc:#ffd36a"><span class="tier">${esc(SP.ORBITS[d.orbit].name)} · CLASS ${d.cls}</span><b>${esc(d.name)}</b><p class="desc">${esc(d.desc)}</p>${s.tech[d.req] ? this.launchBtn({ sat: id }) : `<div class="warn" style="font-size:12px">Research ${esc(TECH[d.req].name)}</div>`}</div>`).join('') || '<p class="muted">Research Orbital Mechanics, then Communication Satellites or Remote Sensing.</p>'}</div>`;
    return h;
  }
  private station() {
    const s = this.s, S = SP.sp(s); const list = Object.entries(SP.MODULES).filter(([, d]) => this.near(d.req));
    return `${S.modules.core ? '<button class="btn small" data-a="orbitStation" style="margin-bottom:10px">🛰 View the station</button>' : ''}<div class="techs">${list.map(([id, d]) => { const L = S.modules[id] || 0;
      return `<div class="tech ${s.tech[d.req] ? '' : 'locked'}" style="--bc:#b892ff"><span class="tier">CLASS ${d.cls} · LEVEL ${L}/${d.max}</span><b>${esc(d.name)}</b><p class="desc">${esc(d.desc)}</p>${!s.tech[d.req] ? `<div class="warn" style="font-size:12px">Research ${esc(TECH[d.req].name)}</div>` : L >= d.max ? '<div class="good ox">Complete</div>' : this.launchBtn({ module: id }, L ? 'Expand' : 'Launch')}</div>`; }).join('') || '<p class="muted">Research Orbital Assembly to start a space station.</p>'}</div>`;
  }
  private rockets() {
    const s = this.s, S = SP.sp(s); const building = s.jobs.filter((j) => j.kind === 'rocket');
    let h = building.map((j) => `<div class="now"><div class="grow"><div class="tier">ASSEMBLING</div><b class="ox">${esc(j.design.name)}</b><div class="bar gold" style="margin-top:6px"><i style="width:${clamp(1 - (j.end - Date.now()) / (j.end - j.start)) * 100}%"></i></div></div><div style="text-align:right"><b class="ox">${fmtTime((j.end - Date.now()) / 1000)}</b><br><button class="btn gold small" data-a="finish" data-job="${j.id}">Finish</button></div></div>`).join('');
    h += `<div class="row" style="margin-bottom:10px"><span class="chip">🏭 ${SP.rocketsBusy(s)}/${SP.assemblyLines(s)} assembly lines</span><span class="chip">Vehicle Assembly level ${SP.vabLevel(s)}</span><button class="btn small gold" data-a="newDesign">✚ New design</button></div>`;
    const ds = SP.allDesigns(s); h += `<div class="grid">${ds.map((d) => { const st = designStats(d); const c = SP.canBuildRocket(s, d); const n = S.hangar[d.id] || 0; const preset = !S.designs.some((x) => x.id === d.id);
      return `<div class="card"><div class="thumb" style="height:150px"><img src="${this.A.studio.rocket(d, this.A.world.look)}" alt=""></div><div class="row"><b class="grow">${esc(d.name)}</b><span class="n">${n} ready</span></div><div class="muted" style="font-size:12px">Class ${st.cls} · ${esc(CLASS_NAME[st.cls] || '')} · ${fmt(st.payload)} t · ${pct(st.rel)}${st.crew ? ' · crew' : ''}${st.lander ? ' · lander' : ''}${d.legs ? ' · reusable' : ''}${preset ? ' · template' : ''}</div>
        <div class="row"><span class="grow">${costHTML(SP.rocketCost(s, d), s.res)}</span><span class="muted" style="font-size:11px">${ri('time')} ${fmtTime(SP.rocketTime(s, d))}</span></div><div class="row"><button class="btn small ${c.ok ? 'gold' : ''} grow" data-a="assemble" data-id="${d.id}" ${c.ok || c.why === 'Not enough resources' ? '' : 'disabled'}>${c.ok ? 'Assemble' : esc(c.why || '')}</button><button class="btn small" data-a="editDesign" data-id="${d.id}">✎</button></div></div>`; }).join('') || '<p class="muted">Research Rocketry Fundamentals to unlock your first rocket parts.</p>'}</div>`;
    return h;
  }
  // ---------------- the designer ----------------
  designerHTML() {
    const s = this.s, d = this.design!; const st = designStats(d); const c = SP.checkDesign(s, d); const ok = (r?: string) => !r || !!s.tech[r];
    const chip = (on: boolean, lock: boolean, a: string, extra: string, label: string, title = '') => `<button class="tab ${on ? 'on' : ''}" ${lock ? 'disabled style="opacity:.35"' : ''} data-a="${a}" ${extra} title="${esc(title)}">${label}</button>`;
    const stages = d.stages.map((x, i) => `<div class="box"><div class="row"><b class="ox grow">Stage ${i + 1}${i === 0 ? ' (first)' : ''}</b>${i > 0 && i === d.stages.length - 1 ? '<button class="btn small red" data-a="dRemove">Remove</button>' : ''}</div>
      <div class="row" style="margin-top:6px">${Object.entries(ENGINES).map(([k, e]) => chip(x.eng === k, !ok(e.req) || (i === 0 && !!e.upper), 'dEng', `data-i="${i}" data-k="${k}"`, esc(e.name), ok(e.req) ? e.desc : `Research ${TECH[e.req].name}`)).join('')}</div>
      <div class="row" style="margin-top:6px">Tank ${Object.entries(TANKS).map(([k, t]) => chip(x.tank === k, !ok(t.req) || SP.vabLevel(s) < t.vab && t.vab > 0, 'dTank', `data-i="${i}" data-k="${k}"`, k, t.vab ? `Vehicle Assembly level ${t.vab}` : '')).join('')}</div></div>`).join('');
    const canAdd = d.stages.length < 3 && ok(STAGE_REQ[d.stages.length] || undefined);
    return `<div class="head"><h1>Rocket designer</h1><button class="ibtn" data-a="dClose">✕</button></div><div class="body" style="max-width:980px;margin:0 auto;width:100%"><div class="row" style="align-items:flex-start;gap:14px">
      <div class="grow" style="min-width:300px"><label class="ox">Name<input id="dname" value="${esc(d.name)}" maxlength="22" style="width:100%;margin:6px 0 4px;padding:10px;border-radius:10px;border:1px solid var(--line);background:#0d1a2e;color:#fff;font:600 15px Barlow"></label>
        ${stages}${canAdd ? '<button class="btn small" data-a="dAdd">✚ Add a stage</button>' : d.stages.length < 3 ? `<p class="muted" style="font-size:12px">Research ${esc(TECH[STAGE_REQ[d.stages.length]!].name)} for stage ${d.stages.length + 1}.</p>` : ''}
        <div class="box"><b class="ox">Strap-on boosters</b><div class="row" style="margin-top:6px">${[0, 2, 4].map((n) => chip(d.boost.n === n, n > 0 && !ok(BOOST_REQ[n]), 'dBoost', `data-n="${n}"`, n ? `${n} solid` : 'None')).join('')}</div>${d.boost.n ? `<div class="row" style="margin-top:6px">Size ${Object.entries(TANKS).map(([k, t]) => chip(d.boost.tank === k, !ok(t.req) || SP.vabLevel(s) < t.vab && t.vab > 0, 'dBTank', `data-k="${k}"`, k)).join('')}</div>` : ''}</div>
        <div class="box"><b class="ox">Payload</b><div class="row" style="margin-top:6px">${Object.entries(TOPS).map(([k, t]) => chip(d.top === k, !ok(t.req), 'dTop', `data-k="${k}"`, esc(t.name), ok(t.req) ? t.desc : `Research ${TECH[t.req!].name}`)).join('')}</div>
          <div class="row" style="margin-top:6px">${chip(d.legs, !ok('reusable'), 'dLegs', '', d.legs ? '✓ Landing legs (reusable)' : 'Landing legs', ok('reusable') ? 'The first stage lands itself: 85% of flights return the rocket to the hangar.' : 'Research Reusable Boosters')}</div></div></div>
      <div style="width:280px;max-width:100%"><div class="card"><div class="thumb" style="height:260px"><img src="${this.A.studio.rocket(d, this.A.world.look)}" alt=""></div>
        <table class="stats"><tr><td>Class</td><td>${st.cls ? `${st.cls} · ${esc(CLASS_NAME[st.cls])}` : '–'}</td></tr><tr><td>Payload to orbit</td><td>${fmt(st.payload)} t</td></tr><tr><td>Lift rating</td><td>${st.D.toFixed(1)}</td></tr><tr><td>Reliability</td><td>${pct(SP.reliability(s, d))}</td></tr><tr><td>Build time</td><td>${fmtTime(SP.rocketTime(s, d))}</td></tr></table>
        <div>${costHTML(SP.rocketCost(s, d), s.res)}</div>${c.ok ? '' : `<p class="why">${esc(c.why || '')}</p>`}
        <div class="row" style="margin-top:8px"><button class="btn small grow" data-a="dSave">Save</button><button class="btn small gold grow" data-a="dBuild" ${SP.canBuildRocket(s, d).ok ? '' : 'disabled'}>Save & assemble</button></div>${SP.sp(s).designs.some((x) => x.id === d.id) ? '<button class="btn small red" style="margin-top:6px;width:100%" data-a="dDelete">Delete design</button>' : ''}</div></div></div></div>`;
  }
  act(a: string, t: HTMLElement): boolean {
    const s = this.s, A = this.A, ui = this.ui; const d = this.design; const rerender = () => { ui.renderOver(); A.audio.play('tap'); };
    const keepName = () => { const el = document.getElementById('dname') as HTMLInputElement | null; if (el && d) d.name = el.value.trim().slice(0, 22) || d.name; };
    switch (a) {
      case 'launchctl': ui.openOver('launch'); A.audio.play('tap'); return true;
      case 'ltab': this.tab = t.dataset.t as any; if (ui.over !== 'launch') ui.openOver('launch'); else ui.renderOver(); A.audio.play('tap'); return true;
      case 'launch': { const p = JSON.parse(t.dataset.p!); const r = SP.launch(s, p); if (r.ok) { ui.closeOver(); A.launched(r.rocket!); } else ui.deny(r.why); return true; }
      case 'assemble': { const ds = SP.designOf(s, t.dataset.id!); if (!ds) return true; const r = SP.startRocket(s, ds); if (r.ok) { A.audio.play('build'); A.changed(); ui.renderOver(); } else ui.deny(r.why); return true; }
      case 'newDesign': { const base = SP.allDesigns(s)[0] || { id: '', name: 'Rocket', stages: [{ eng: 'solid', tank: 'S' }], boost: { n: 0, tank: 'S' }, top: 'probe', legs: false }; this.design = { ...JSON.parse(JSON.stringify(base)), id: SP.newDesignId(s), name: 'My rocket ' + (SP.sp(s).designs.length + 1) }; ui.openOver('designer'); return true; }
      case 'editDesign': { const ds = SP.designOf(s, t.dataset.id!); if (!ds) return true; const mine = SP.sp(s).designs.some((x) => x.id === ds.id); this.design = mine ? JSON.parse(JSON.stringify(ds)) : { ...JSON.parse(JSON.stringify(ds)), id: SP.newDesignId(s), name: ds.name + ' II' }; ui.openOver('designer'); return true; }
      case 'dClose': this.tab = 'rockets'; ui.openOver('launch'); return true;
      case 'dEng': keepName(); d!.stages[+t.dataset.i!].eng = t.dataset.k!; rerender(); return true;
      case 'dTank': keepName(); d!.stages[+t.dataset.i!].tank = t.dataset.k!; rerender(); return true;
      case 'dAdd': keepName(); d!.stages.push({ eng: d!.stages[d!.stages.length - 1].eng, tank: 'S' }); rerender(); return true;
      case 'dRemove': keepName(); d!.stages.pop(); rerender(); return true;
      case 'dBoost': keepName(); d!.boost.n = +t.dataset.n!; rerender(); return true;
      case 'dBTank': keepName(); d!.boost.tank = t.dataset.k!; rerender(); return true;
      case 'dTop': keepName(); d!.top = t.dataset.k!; rerender(); return true;
      case 'dLegs': keepName(); d!.legs = !d!.legs; rerender(); return true;
      case 'dSave': case 'dBuild': { keepName(); if (!d) return true; const c = SP.checkDesign(s, d); if (!c.ok && a === 'dBuild') { ui.deny(c.why); return true; } SP.saveDesign(s, JSON.parse(JSON.stringify(d)));
        if (a === 'dBuild') { const r = SP.startRocket(s, d); if (!r.ok) { ui.deny(r.why); return true; } A.audio.play('build'); } else A.audio.play('buy'); A.changed(); ui.toast(`Design saved: ${esc(d.name)}`, 'good'); this.tab = 'rockets'; ui.openOver('launch'); return true; }
      case 'dDelete': if (d && SP.deleteDesign(s, d.id)) { ui.toast('Design deleted'); this.tab = 'rockets'; ui.openOver('launch'); A.changed(); } else ui.deny('Fly or scrap the rockets built from it first'); return true;
      case 'orbitStation': ui.closeOver(); A.openOrbit('station'); return true;
    }
    return false;
  }
}
export { RES, icon };
