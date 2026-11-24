// The robot screens: the crew (levels, jobs, feeding), the Workshop (cores and activation), the Fusion Lab, the
// Botdex, and the operator stations in every building panel.
import { esc, fmt, fmtTime, clamp, pct } from '../core/util';
import * as RB from '../core/robots';
import { SPECIES, SPECIES_ORDER } from '../data/species';
import { RARITIES, RARITY_ORDER } from '../data/rarities';
import { ELEMENTS, CORE_ELEMENTS } from '../data/elements';
import { BUILDINGS } from '../data/buildings';
import { BOOST_WHAT, FUSE_LEVEL, MAX_LVL } from '../data/robots';
import type { UI } from './ui';
import { costHTML } from './ui';
export const elPills = (els: string[]) => `<span class="els">${els.map((e) => `<span class="el" style="background:${ELEMENTS[e].color}" title="${ELEMENTS[e].name}">${ELEMENTS[e].glyph}</span>`).join('')}</span>`;
const rarTag = (sp: string) => { const r = RARITIES[SPECIES[sp].rarity]; return `<span class="rar" style="color:${r.color}">${r.name}</span>`; };
export class RobotsUI {
  tab: 'crew' | 'cores' | 'fusion' | 'dex' = 'crew'; focus = ''; fA = ''; fB = ''; pickFor: { base: string; item: string } | null = null;
  constructor(private ui: UI) {}
  get s() { return this.ui.app.s; } get A() { return this.ui.app; }
  private pic(sp: string, known = true, size = 54) { return `<div class="pic" style="width:${size}px;height:${size}px;background:radial-gradient(circle, ${ELEMENTS[SPECIES[sp].el[0]].color}44, transparent 70%)"><img src="${this.A.studio.bot(sp)}" style="${known ? '' : 'filter:brightness(0) opacity(.5)'}"></div>`; }
  html() {
    const s = this.s, R = RB.rb(s); const ready = R.cores.length; const tabs: [string, string][] = [['crew', `Crew (${R.list.length}/${RB.capacity(s)})`], ['cores', `Workshop${ready ? ` · ${ready} ready` : ''}`], ['fusion', 'Fusion'], ['dex', `Botdex ${RB.dexCount(s)}/${RB.discoverable().length}`]];
    let body = this.tab === 'crew' ? this.crew() : this.tab === 'cores' ? this.cores() : this.tab === 'fusion' ? this.fusion() : this.dex();
    return `<div class="head"><h1>Robots</h1><span class="chip">⚡ ${fmt(s.res.cells || 0)} Power Cells</span><button class="ibtn" data-a="close">✕</button></div><div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${k === this.tab ? 'on' : ''}" data-a="rtabR" data-t="${k}">${n}</button>`).join('')}</div><div class="body">${body}</div>`;
  }
  private crew() {
    const s = this.s, R = RB.rb(s); if (!R.list.length) return `<p class="desc">No robots yet. ${RB.workshopLvl(s) ? 'Assemble a core in the Workshop, then activate it.' : 'Research Industrial Automation and build a Robotics Workshop: your first two robots come with it.'}</p>`;
    const list = [...R.list].sort((a, b) => RB.rIdx(b.sp) - RB.rIdx(a.sp) || b.lvl - a.lvl);
    return `<div class="bots">${list.map((r) => { const d = SPECIES[r.sp]; const f = RB.canFeed(s, r.id); const job = r.post ? RB.robotBoost(r, (s.bases[r.post.base]?.items.find((i) => i.id === r.post!.item) || { b: '' }).b) : 0; const at = r.post ? s.bases[r.post.base]?.items.find((i) => i.id === r.post!.item) : null;
      return `<div class="botc">${this.pic(r.sp)}<div><b>${esc(d.name)}</b> ${rarTag(r.sp)} ${elPills(d.el)}<div class="meta">Level ${r.lvl}/${MAX_LVL} · ${at ? `operating the ${esc(BUILDINGS[at.b].name)} (+${pct(job)}${RB.matches(r.sp, at.b) ? ', a perfect fit' : ''})` : 'resting in a dock'}</div></div>
        <div class="row" style="flex-direction:column;align-items:flex-end;gap:4px"><button class="btn small ${f.ok ? 'green' : ''}" data-a="feedR" data-id="${r.id}" ${f.ok || f.why === 'Not enough Power Cells' ? '' : 'disabled'}>${f.max ? 'MAX' : `⚡${fmt(f.cost?.cells || 0)} Level up`}</button>${r.post ? `<button class="btn small" data-a="unassignR" data-id="${r.id}">Recall</button>` : ''}</div></div>`; }).join('')}</div>`;
  }
  private cores() {
    const s = this.s, R = RB.rb(s); const ws = RB.workshopLvl(s); let h = '';
    if (R.cores.length) h += `<h3 class="ox">Ready to activate</h3><div class="bots">${R.cores.map((c) => { const ok = RB.canActivate(s, c.id); return `<div class="botc">${this.pic(c.sp, false)}<div><b>A ${esc(RARITIES[SPECIES[c.sp].rarity].name)} core</b><div class="meta">${c.from === 'fusion' ? 'Fused in the lab' : c.from === 'gift' ? 'A gift' : 'From the Workshop'} · who will it be?</div></div><button class="btn small ${ok.ok ? 'gold' : ''}" data-a="activateR" data-id="${c.id}" ${ok.ok ? '' : 'disabled'}>${ok.ok ? 'Activate' : esc(ok.why || '')}</button></div>`; }).join('')}</div>`;
    const busy = s.jobs.filter((j) => j.kind === 'core' || j.kind === 'fuse'); if (busy.length) h += busy.map((j) => `<div class="now"><div class="grow"><div class="tier">${j.kind === 'fuse' ? 'FUSING' : 'ASSEMBLING'}</div><b class="ox">A ${esc(RARITIES[SPECIES[j.sp].rarity].name)} core</b><div class="bar gold" style="margin-top:6px"><i style="width:${clamp(1 - (j.end - Date.now()) / (j.end - j.start)) * 100}%"></i></div></div><div style="text-align:right"><b class="ox">${fmtTime((j.end - Date.now()) / 1000)}</b><br><button class="btn gold small" data-a="finish" data-job="${j.id}">Finish</button></div></div>`).join('');
    if (!ws) return h + '<p class="desc">Build the Robotics Workshop (Industrial Automation) to assemble robot cores.</p>';
    h += `<h3 class="ox">Assemble a core <span class="muted" style="font-size:12px">· ${RB.coresBusy(s)}/${RB.assemblySlots(s)} bays busy</span></h3><div class="box"><div class="muted" style="font-size:12px;margin-bottom:6px">Focus on an element (the robot will carry it):</div><div class="row">${['', ...CORE_ELEMENTS].map((e) => `<button class="tab ${this.focus === e ? 'on' : ''}" data-a="focusR" data-e="${e}">${e ? `${ELEMENTS[e].glyph} ${ELEMENTS[e].name}` : 'Any'}</button>`).join('')}</div></div>
      <div class="grid">${RB.CORE_RECIPES.map((rc, i) => { const c = RB.canCraft(s, i); return `<div class="card ${ws < rc.ws ? 'locked' : ''}"><b style="color:${RARITIES[RARITY_ORDER[rc.rarity]].color}">${esc(rc.name)}</b><p class="desc">${esc(rc.desc)}</p><div>${costHTML(rc.cost, s.res)}</div><button class="btn small ${c.ok ? 'gold' : ''}" data-a="craftR" data-i="${i}" ${c.ok || c.why === 'Not enough resources' ? '' : 'disabled'}>${c.ok ? 'Assemble' : esc(c.why || '')}</button></div>`; }).join('')}</div>`;
    return h;
  }
  private fusion() {
    const s = this.s, R = RB.rb(s); if (!RB.labLvl(s)) return '<p class="desc">Research Construction Robotics and build the Fusion Lab (Mission Control 4) to fuse two robots into a new hybrid core. Rarer parents make rarer robots.</p>';
    const a = RB.robotOf(s, this.fA), b = RB.robotOf(s, this.fB); const pickers = (slot: 'A' | 'B') => `<div class="bots" style="max-height:260px;overflow:auto">${R.list.filter((r) => r.lvl >= FUSE_LEVEL).map((r) => `<div class="botc" style="${(slot === 'A' ? this.fA : this.fB) === r.id ? 'border-color:var(--gold)' : ''};cursor:pointer" data-a="pickF" data-s="${slot}" data-id="${r.id}">${this.pic(r.sp, true, 40)}<div><b>${esc(SPECIES[r.sp].name)}</b> ${elPills(SPECIES[r.sp].el)}<div class="meta">Level ${r.lvl}</div></div><span></span></div>`).join('') || `<p class="muted">Robots need level ${FUSE_LEVEL} to fuse.</p>`}</div>`;
    let out = ''; if (a && b && a !== b) { const o = RB.fusionOutcomes(a, b).slice(0, 8); const c = RB.canFuse(s, a.id, b.id);
      out = `<div class="box"><b class="ox">Possible results</b><div class="bots">${o.map((x) => `<div class="botc">${this.pic(x.sp, !!R.dex[x.sp], 40)}<div><b>${R.dex[x.sp] ? esc(SPECIES[x.sp].name) : '???'}</b> ${rarTag(x.sp)} ${elPills(SPECIES[x.sp].el)}</div><b class="ox">${pct(x.p, x.p < 0.1 ? 1 : 0)}</b></div>`).join('')}</div><div class="row" style="margin-top:8px"><span class="grow">${costHTML(c.cost || RB.fuseCost(a, b), s.res)}</span><button class="btn ${c.ok ? 'gold' : ''}" data-a="fuseR" ${c.ok ? '' : 'disabled'}>${c.ok ? '🧬 Fuse' : esc(c.why || '')}</button></div><p class="muted" style="font-size:12px">The parents are not used up: they go back to work.</p></div>`; }
    return `<div class="row" style="align-items:flex-start"><div class="grow" style="min-width:260px"><b class="ox">Parent A</b>${pickers('A')}</div><div class="grow" style="min-width:260px"><b class="ox">Parent B</b>${pickers('B')}</div></div>${out}`;
  }
  private dex() { const s = this.s, R = RB.rb(s); const list = RB.discoverable();
    return `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr))">${list.map((k) => { const known = !!R.dex[k]; return `<div class="card" style="align-items:center;text-align:center">${this.pic(k, known, 72)}<b style="font-size:12px">${known ? esc(SPECIES[k].name) : '???'}</b>${rarTag(k)}${elPills(SPECIES[k].el)}</div>`; }).join('')}</div>`; }
  // the operator stations in a building panel
  panelHTML(base: string, itemId: string) {
    const s = this.s; const it = s.bases[base]?.items.find((i) => i.id === itemId); if (!it || it.lvl < 1) return ''; const n = RB.opSlots(it.b, it.lvl); if (!n) return ''; const ops = RB.operatorsAt(s, base, itemId); const k = RB.boostOf(s, base, itemId);
    const what = BOOST_WHAT[it.b] || 'output';
    return `<div class="box"><div class="row"><b class="ox grow">Robot operators</b><span class="good ox">+${pct(k)} ${esc(what)}</span></div><div class="row" style="margin-top:6px">${Array.from({ length: n }, (_, i) => { const r = ops[i];
      return r ? `<div class="botc" style="grid-template-columns:40px 1fr auto;padding:4px 6px;flex:1;min-width:150px">${this.pic(r.sp, true, 40)}<div><b style="font-size:12px">${esc(SPECIES[r.sp].name)}</b><div class="meta">Lv ${r.lvl} · +${pct(RB.robotBoost(r, it.b))}${RB.matches(r.sp, it.b) ? ' ✓' : ''}</div></div><button class="btn small" data-a="unassignR" data-id="${r.id}">✕</button></div>` : `<button class="btn small" style="flex:1;min-width:150px" data-a="pickOp" data-base="${base}" data-id="${itemId}">✚ Assign a robot</button>`; }).join('')}</div>
      <div class="muted" style="font-size:11px;margin-top:4px">Suits: ${(RB.AFFINITY[it.b] || []).map((e) => `${ELEMENTS[e].glyph} ${ELEMENTS[e].name}`).join(', ')}${it.lvl < 16 ? ' · more stations at levels 8 and 16' : ''}</div></div>`;
  }
  pickerHTML() { const s = this.s, P = this.pickFor!; const it = s.bases[P.base]?.items.find((i) => i.id === P.item); if (!it) return ''; const list = [...RB.rb(s).list].sort((a, b) => RB.robotBoost(b, it.b) - RB.robotBoost(a, it.b));
    return `<h1 style="font-size:20px">Assign to the ${esc(BUILDINGS[it.b].name)}</h1><p class="muted" style="font-size:12px">Best fits first. A robot can work one station at a time.</p><div class="bots" style="max-height:52vh;overflow:auto;text-align:left">${list.map((r) => { const at = r.post ? s.bases[r.post.base]?.items.find((i) => i.id === r.post!.item) : null;
      return `<div class="botc">${this.pic(r.sp, true, 44)}<div><b>${esc(SPECIES[r.sp].name)}</b> ${elPills(SPECIES[r.sp].el)}<div class="meta">Lv ${r.lvl} · +${pct(RB.robotBoost(r, it.b))}${RB.matches(r.sp, it.b) ? ' ✓ fits' : ''}${at ? ` · now at ${esc(BUILDINGS[at.b].name)}` : ''}</div></div><button class="btn small ${RB.matches(r.sp, it.b) ? 'gold' : ''}" data-a="assignR" data-id="${r.id}">Assign</button></div>`; }).join('') || '<p class="muted">No robots yet.</p>'}</div><button class="btn" data-a="closeModal">Close</button>`; }
  reveal(r: RB.Robot, dm: number) { const d = SPECIES[r.sp], rr = RARITIES[d.rarity];
    this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">NEW ROBOT ONLINE</div><div style="margin:8px auto;width:150px;height:150px;border-radius:24px;background:radial-gradient(circle, ${rr.color}55, transparent 70%)"><img src="${this.A.studio.bot(r.sp)}" style="width:100%;height:100%"></div><h1>${esc(d.name)}</h1>${rarTag(r.sp)} ${elPills(d.el)}<p class="desc">${esc(d.desc || '')}</p>${dm ? `<div class="good ox">New in the Botdex: +${dm} Dark Matter</div>` : ''}<p class="muted" style="font-size:12px">Assign it to a building that suits its elements: tap a building, then "Assign a robot".</p><button class="btn gold" data-a="closeModal">Welcome aboard</button>`, { rays: RB.rIdx(r.sp) >= 2 }); }
  act(a: string, t: HTMLElement): boolean {
    const s = this.s, A = this.A, ui = this.ui;
    switch (a) {
      case 'robots': ui.openOver('robots'); A.audio.play('tap'); return true;
      case 'rtabR': this.tab = t.dataset.t as any; ui.renderOver(); A.audio.play('tap'); return true;
      case 'focusR': this.focus = t.dataset.e || ''; ui.renderOver(); A.audio.play('tap'); return true;
      case 'craftR': { const r = RB.craft(s, +t.dataset.i!, this.focus || undefined); if (r.ok) { A.audio.play('build'); A.changed(); ui.renderOver(); } else ui.deny(r.why); return true; }
      case 'activateR': { const r = RB.activate(s, t.dataset.id!) as any; if (r.ok) { A.audio.play(RB.rIdx(r.robot.sp) >= 2 ? 'levelup' : 'claim'); A.changed(); ui.renderOver(); this.reveal(r.robot, r.dm); } else ui.deny(r.why); return true; }
      case 'feedR': { const r = RB.feed(s, t.dataset.id!) as any; if (r.ok) { A.audio.play('feed'); A.changed(); ui.renderOver(); ui.renderPanel(); } else ui.deny(r.why); return true; }
      case 'unassignR': RB.unassign(s, t.dataset.id!); A.audio.play('tap'); A.changed(); ui.renderOver(); ui.renderPanel(); return true;
      case 'pickOp': this.pickFor = { base: t.dataset.base!, item: t.dataset.id! }; ui.modal(this.pickerHTML()); A.audio.play('tap'); return true;
      case 'assignR': { if (!this.pickFor) return true; const r = RB.assign(s, t.dataset.id!, this.pickFor.base, this.pickFor.item); if (r.ok) { A.audio.play('place'); ui.closeModal(); A.changed(); ui.renderPanel(); } else ui.deny(r.why); return true; }
      case 'pickF': if (t.dataset.s === 'A') this.fA = t.dataset.id!; else this.fB = t.dataset.id!; ui.renderOver(); A.audio.play('tap'); return true;
      case 'fuseR': { const r = RB.fuse(s, this.fA, this.fB); if (r.ok) { A.audio.play('build'); A.changed(); this.tab = 'cores'; ui.renderOver(); ui.toast('The Fusion Lab hums to life: a new core is forming', 'good'); } else ui.deny(r.why); return true; }
    }
    return false;
  }
}
