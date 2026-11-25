// The Life screen: the eight rungs of the Life Ladder, every lifeform found (and the silhouettes of those still out
// there, with a hint of where to look), specimen plates, the real science behind each one, searches and studies, the
// gifts that fully studied life gives, and outbreaks to contain or study.
import { esc, fmt, fmtTime, clamp } from '../core/util';
import * as LF from '../core/life';
import { RUNGS } from '../data/life';
import { RES } from '../data/resources';
import { specimen } from '../render/specimens';
import { allSpecies } from '../core/aliens';
import type { UI } from './ui';
import { costHTML } from './ui';
export class LifeUI {
  sel = ''; rung = -1;
  constructor(private ui: UI) {}
  get s() { return this.ui.app.s; } get A() { return this.ui.app; }
  available() { const s = this.s; return !!s.tech.xenobiology || !!(s as any).life && (Object.keys(LF.life(s).found).length > 0 || LF.life(s).outbreaks.length > 0); }
  outbreaks() { return (this.s as any).life ? LF.life(this.s).outbreaks : []; }
  attention() { const s = this.s; if (!(s as any).life) return false; if (this.outbreaks().length) return true; if (s.jobs.filter((j) => j.kind === 'bio').length >= LF.MAX_BIO(s)) return false; return LF.entries(s).some((e) => e.state === 'signal' && LF.canBio(s, e.id, e).ok); }
  private plate(e: LF.Entry, size: number) { const civ = e.kind === 'civ' ? allSpecies()[e.sp!] : null;
    return `<img class="plate" src="${specimen({ id: e.id, art: e.art, col: e.col, seed: e.seed, rung: e.rung, size: e.size, unknown: e.state === 'unknown', signal: e.state === 'signal', civ: civ ? { col: civ.col, art: civ.art, seed: civ.seed, extinct: civ.extinct } : undefined }, size * 2)}" width="${size}" height="${size}" alt="">`; }
  private pips(e: LF.Entry) { return e.kind === 'life' || e.kind === 'exo' ? `<span class="pips">${[1, 2, 3].map((k) => `<i class="${e.lvl >= k ? 'on' : ''}"></i>`).join('')}</span>` : ''; }
  private status(e: LF.Entry) { if (e.state === 'unknown') return '<span class="muted">Not found</span>'; if (e.state === 'signal') return '<span class="good">Biosignature</span>'; if (e.kind === 'civ') return '<span class="muted">Met</span>'; if (e.kind === 'asc') return '<span style="color:#ff6bd6">Met</span>'; return e.lvl >= 3 ? '<span class="good">Catalogued</span>' : `<span class="muted">Studied ${e.lvl}/3</span>`; }
  private job(id: string) { return this.s.jobs.find((j) => j.kind === 'bio' && j.life === id); }
  private prog(j: any, label: string) { return `<div class="now"><div class="grow"><div class="tier">${esc(label)}</div><div class="bar gold" style="margin-top:6px"><i style="width:${clamp((Date.now() - j.start) / (j.end - j.start)) * 100}%"></i></div></div><div style="text-align:right"><b class="ox">${fmtTime((j.end - Date.now()) / 1000)}</b><br><button class="btn gold small" data-a="finish" data-job="${j.id}">Finish</button></div></div>`; }
  html() { const s = this.s, all = LF.entries(s), L = LF.life(s); if (!this.sel || !all.some((e) => e.id === this.sel)) this.sel = (all.find((e) => e.state !== 'unknown') || all[0])?.id || '';
    const counts = RUNGS.map((_, i) => all.filter((e) => e.rung === i && e.state === 'found').length); const nFound = all.filter((e) => e.state === 'found').length;
    const ladder = `<div class="ladder">${RUNGS.map((r, i) => i).reverse().map((i) => { const R = RUNGS[i], on = !!L.rungs[i]; return `<button class="rung ${on ? 'on' : ''} ${this.rung === i ? 'sel' : ''}" data-a="lrung" data-k="${i}" style="--rc:${R.col}"><span class="num">${R.num}</span><span class="grow"><b>${esc(R.name)}</b><i>${counts[i] ? counts[i] + ' found' : on ? 'reached' : '—'}</i></span></button>`; }).join('')}<button class="rung all ${this.rung < 0 ? 'sel' : ''}" data-a="lrung" data-k="-1"><span class="num">✦</span><span class="grow"><b>Everything</b><i>${nFound} found</i></span></button></div>`;
    const list = all.filter((e) => this.rung < 0 || e.rung === this.rung); const R0 = this.rung >= 0 ? RUNGS[this.rung] : null;
    const cards = list.map((e) => `<div class="lcard ${e.id === this.sel ? 'on' : ''} ${e.state}" data-a="lsel" data-k="${esc(e.id)}">${this.plate(e, 56)}<div class="grow"><b style="color:${e.state === 'unknown' ? 'var(--muted)' : e.col}">${esc(e.name)}</b><div class="meta">${esc(RUNGS[e.rung].name)} · ${this.status(e)}</div>${this.pips(e)}</div>${this.job(e.id) ? '<span class="tag">STUDY</span>' : ''}</div>`).join('');
    const hidden = s.tech.exoplanetology ? '' : '<p class="meta">Research Exoplanetology to read the atmospheres of surveyed worlds for signs of life.</p>';
    return `<div class="head"><h1>Life</h1><span class="chip">🧬 ${nFound} found · ${Object.keys(L.rungs).length} / 8 rungs</span><span class="chip" style="color:${RES.xeno.color}">${RES.xeno.icon} ${fmt(s.res.xeno || 0)}</span><button class="ibtn" data-a="close">✕</button></div>
      <div class="body life">${ladder}<div class="lmain">${this.outbreaks().map((o) => this.outbreakHTML(o)).join('')}${this.sel ? this.detail(this.sel) : ''}${R0 ? `<p class="desc" style="color:${R0.col}">${R0.num} · ${esc(R0.desc)}</p>` : ''}<div class="lgrid">${cards || '<p class="desc">Nothing found on this rung yet.</p>'}</div>${hidden}</div></div>`; }
  private outbreakHTML(o: LF.Outbreak) { const s = this.s, e = LF.entry(s, o.life); const cost = LF.containCost(s, this.A.R); const j = this.job(o.life); const c = LF.canBio(s, o.life);
    const what = o.kind === 'claim' ? `Something is eating the ore at ${esc(o.name)}. Output there is halved.` : `Native spores have got into the domes at ${esc(o.name)}. The colony has stopped growing.`;
    return `<div class="box warn"><div class="row"><b class="ox grow">☣ Outbreak · ${esc(o.name)}</b><span class="muted">burns out in ${fmtTime((o.until - Date.now()) / 1000)}</span></div><p class="desc">${what} Contain it now, or study it: when the first study is done the outbreak ends, and we will know what it is.</p>
      <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn small" data-a="lcontain" data-k="${o.id}">Contain (${costHTML(cost, s.res)})</button>${j ? '<span class="tag">STUDY UNDER WAY</span>' : e && e.state !== 'found' ? `<button class="btn small ${c.ok ? 'gold' : ''}" data-a="lstudy" data-k="${esc(o.life)}" ${c.ok ? '' : 'disabled'}>${c.ok ? '🔬 Study it' : esc(c.why || 'Study it')}</button>` : ''}</div></div>`; }
  private detail(id: string) { const s = this.s, e = LF.entry(s, id); if (!e) return ''; const R = RUNGS[e.rung];
    let h = `<div class="ldet"><div class="row" style="gap:14px;align-items:flex-start">${this.plate(e, 132)}<div class="grow"><div class="ox" style="letter-spacing:.18em;font-size:11px;color:${R.col}">RUNG ${R.num} · ${esc(R.name.toUpperCase())}</div><h2 style="margin:2px 0 4px;color:${e.state === 'unknown' ? 'var(--muted)' : e.col}">${esc(e.name)}</h2><div class="sub">${esc(e.home)}${e.size && e.state !== 'unknown' ? ` · ${esc(e.size)}` : ''}</div>`;
    if (e.state === 'unknown') h += `<p class="desc">Something lives here that nobody has found yet.</p><p class="why">${esc(e.hint || '')}</p>`;
    else if (e.state === 'signal') h += `<p class="desc">${e.kind === 'exo' ? esc(e.science || '') : 'The instruments have picked up a signal: chemistry that should not be there unless something is alive. Send a search team to find it.'}</p>`;
    else h += `<p class="desc">${esc(e.lore || '')}</p>`;
    h += '</div></div>';
    if (e.state !== 'unknown' && e.science && e.kind !== 'exo') h += `<div class="science"><b>THE REAL SCIENCE</b><p>${esc(e.science)}</p></div>`;
    if (e.kind === 'life' || e.kind === 'exo') { const j = this.job(id), c = LF.canBio(s, id); const lvl = e.state === 'found' ? e.lvl + 1 : 0;
      h += `<div class="box"><div class="row"><b class="ox grow">${e.state === 'found' ? (e.lvl >= 3 ? 'Fully catalogued' : `Study ${lvl} of 3`) : 'Search for it'}</b>${this.pips(e)}</div><div class="meta">Gift when fully studied: <b class="${e.lvl >= 3 ? 'good' : ''}">${esc(e.giftText || '')}</b>${e.lvl >= 3 ? ' ✓' : ''}</div>`;
      if (j) h += this.prog(j, j.lvl === 0 ? 'SEARCH TEAM OUT' : `STUDY ${j.lvl} UNDER WAY`);
      else if (e.lvl < 3 && e.state !== 'unknown') { const cost = c.cost || LF.bioCost(e, lvl); h += `<div class="row" style="gap:8px;align-items:center;margin-top:6px"><div class="grow">${costHTML(cost, s.res)} <span class="muted">· ${fmtTime(c.time || LF.bioTime(s, e, lvl))}</span></div><button class="btn small ${c.ok ? 'gold' : ''}" data-a="lstudy" data-k="${esc(id)}" ${c.ok || c.why === 'Not enough resources' ? '' : 'disabled'}>${c.ok ? (lvl === 0 ? '🔭 Search' : '🔬 Study') : esc(c.why || 'Study')}</button></div>`; }
      h += '</div>'; }
    if (e.kind === 'civ') h += `<button class="btn small" data-a="lcontact" data-k="${e.sp}">👽 Open Contact</button>`;
    return h + '</div>'; }
  act(a: string, t: HTMLElement): boolean { const s = this.s, A = this.A, ui = this.ui, k = t.dataset.k!;
    switch (a) {
      case 'life': ui.closeModal(); ui.openOver('life'); A.audio.play('tap'); return true;
      case 'lifeAt': this.sel = k; this.rung = -1; ui.closeModal(); ui.openOver('life'); A.audio.play('tap'); return true;
      case 'lrung': this.rung = +k; ui.renderOver(); A.audio.play('tap'); return true;
      case 'lsel': this.sel = k; ui.renderOver(); A.audio.play('tap'); return true;
      case 'lstudy': { const r = LF.startBio(s, k); if (r.ok) { A.audio.play('build'); ui.toast(r.lvl === 0 ? 'A search team sets out' : 'The xenobiologists get to work', 'good'); A.changed(); ui.renderOver(); } else ui.deny(r.why); return true; }
      case 'lcontain': { const r = LF.contain(s, k, A.R); if (r.ok) { A.audio.play('claim'); ui.toast('Outbreak contained. Specimens are on their way to the labs.', 'good'); if (r.found && r.found.dm) ui.toast(`New rung on the Life Ladder: +${r.found.dm} dark matter`, 'gold'); A.changed(); ui.renderOver(); } else ui.deny(r.why); return true; }
      case 'lcontact': ui.contact.sel = k; ui.openOver('contact'); return true;
    }
    return false; }
}
