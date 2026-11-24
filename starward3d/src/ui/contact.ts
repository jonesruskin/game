// The Contact screen: every civilisation you know of (portrait, nature, relations, understanding), first contact,
// deciphering, gifts, embassies, agreements, requests, alien knowledge, the Swarm's tribute, the fate of young species
// and the Hollow ruins.
import { esc, fmt, fmtTime, clamp } from '../core/util';
import * as AL from '../core/aliens';
import { TIERS, XENOTECH, OPENINGS, UNDERSTAND } from '../data/civs';
import { STARS } from '../data/stars';
import { RES } from '../data/resources';
import { TECH } from '../data/research';
import { portrait } from '../render/portraits';
import type { UI } from './ui';
import { costHTML } from './ui';
const relCol = (r: number) => (r >= 40 ? '#7cf29a' : r >= 0 ? '#ffd36a' : r >= -40 ? '#ffb35a' : '#ff6b7a');
const relWord = (r: number) => (r >= 70 ? 'Allied' : r >= 40 ? 'Friendly' : r >= 10 ? 'Cordial' : r >= -10 ? 'Neutral' : r >= -40 ? 'Wary' : 'Hostile');
export class ContactUI {
  sel = ''; private shown = new Set<string>();
  constructor(private ui: UI) {}
  get s() { return this.ui.app.s; } get A() { return this.ui.app; }
  available() { const s = this.s; return !!s.tech.contactProtocols || Object.keys(AL.al(s).known).length > 0; }
  attention() { const s = this.s, A = AL.al(s); return AL.pendingContacts(s).length > 0 || Object.keys(A.known).some((id) => A.known[id].req && AL.reqDone(s, A.known[id].req)) || Object.keys(XENOTECH).some((x) => AL.canXeno(s, x).ok); }
  private pic(id: string, size: number) { const d = AL.allSpecies()[id]; return `<img class="portrait" src="${portrait(id, d as any, size * 2)}" width="${size}" height="${size}" alt="">`; }
  private btn(c: any, act: string, label: string, data = '') { return `<button class="btn small ${c.ok ? 'gold' : ''}" data-a="${act}" ${data} ${c.ok || c.why === 'Not enough resources' ? '' : 'disabled'}>${c.ok ? label : esc(c.why === 'Research required' && c.tech ? `Research ${TECH[c.tech]?.name}` : c.why || label)}</button>`; }
  private job(kind: string, sp: string) { return this.s.jobs.find((j) => j.kind === kind && (!sp || j.sp === sp)); }
  private prog(j: any, label: string) { return `<div class="now"><div class="grow"><div class="tier">${esc(label)}</div><div class="bar gold" style="margin-top:6px"><i style="width:${clamp((Date.now() - j.start) / (j.end - j.start)) * 100}%"></i></div></div><div style="text-align:right"><b class="ox">${fmtTime((j.end - Date.now()) / 1000)}</b><br><button class="btn gold small" data-a="finish" data-job="${j.id}">Finish</button></div></div>`; }
  html() { const s = this.s, A = AL.al(s); const all = AL.allSpecies(); const known = Object.keys(A.known); const pend = AL.pendingContacts(s); if (!this.sel || !A.known[this.sel]) this.sel = known[0] || '';
    const cards = [...pend.map((id) => `<div class="civ pend" data-a="firstContact" data-k="${id}"><div class="portrait unknown">?</div><div><b>An unknown signal</b><div class="meta">From the direction of ${esc(STARS[all[id].star]?.name || 'deep space')}</div><button class="btn gold small">Make contact</button></div></div>`),
      ...known.map((id) => { const d = all[id], k = A.known[id]; return `<div class="civ ${id === this.sel ? 'on' : ''}" data-a="civ" data-k="${id}">${this.pic(id, 48)}<div class="grow"><b style="color:${d.col}">${esc(d.name)}</b> <span class="muted" style="font-size:11px">${esc(TIERS[d.tier])}</span><div class="relbar"><i style="left:${(clamp(k.rel, -100, 100) + 100) / 2}%;background:${relCol(k.rel)}"></i></div><div class="meta">${d.extinct ? 'Extinct' : `${relWord(k.rel)} · understood ${Math.round(k.und)}%`}${k.req ? ' · <span class="good">request</span>' : ''}</div></div></div>`; })].join('');
    const empty = !known.length && !pend.length ? `<p class="desc">${s.tech.contactProtocols ? 'No one has answered yet. Survey more star systems: civilisations are found where they live.' : 'Research Contact Protocols to listen for, and answer, other civilisations.'}</p>` : '';
    return `<div class="head"><h1>Contact</h1><span class="chip" style="color:${RES.influence.color}">${RES.influence.icon} ${fmt(s.res.influence || 0)}</span><span class="chip" style="color:${RES.xeno.color}">${RES.xeno.icon} ${fmt(s.res.xeno || 0)}</span><button class="ibtn" data-a="close">✕</button></div>
      <div class="body contact"><div class="civs">${cards}${empty}</div><div class="civd">${this.sel ? this.detail(this.sel) : ''}</div></div>`; }
  private detail(id: string) { const s = this.s, A = AL.al(s), d = AL.allSpecies()[id], k = A.known[id]; let h = `<div class="row" style="gap:12px;align-items:flex-start">${this.pic(id, 112)}<div class="grow"><h2 style="margin:0;color:${d.col}">${esc(d.name)}</h2><div class="sub">${esc(TIERS[d.tier])} · ${esc(d.temper)}</div><p class="desc">${esc(d.lore)}</p><div class="meta">${esc(d.origin)}${d.likes ? ` · likes ${esc(d.likes)}` : ''}${d.dislikes ? ` · dislikes ${esc(d.dislikes)}` : ''}</div></div></div>`;
    if (!d.extinct) h += `<table class="stats"><tr><td>Relations</td><td style="color:${relCol(k.rel)}">${relWord(k.rel)} (${Math.round(k.rel)})</td></tr><tr><td>Understanding</td><td>${Math.round(k.und)}%</td></tr>${k.embassy ? `<tr><td>Embassy</td><td>level ${k.embassy}</td></tr>` : ''}${Object.keys(k.deals).length ? `<tr><td>Agreements</td><td>${Object.keys(k.deals).map((x) => esc(AL.DEALS[x].name)).join(', ')}</td></tr>` : ''}${d.trade ? `<tr><td>Trade</td><td>${esc(d.trade.label)}</td></tr>` : ''}</table>`;
    // understanding
    if (!d.extinct && k.und < 100) { const j = this.job('decipher', id), c = AL.canDecipher(s, id); h += `<div class="box"><b class="ox">Decipher their language</b><p class="desc">Each step unlocks more: trade at ${UNDERSTAND.trade}%, a research pact at ${UNDERSTAND.pact}%, their knowledge at ${UNDERSTAND.knowledge}%, an alliance at ${UNDERSTAND.alliance}%.</p>${j ? this.prog(j, 'LINGUISTS AT WORK') : `<div>${costHTML(c.cost || AL.decipherCost(s, id), s.res)}</div>${this.btn(c, 'decipher', 'Decipher (+25%)', `data-k="${id}"`)}`}</div>`; }
    // the Swarm
    if (id === 'krthul') h += `<div class="box warn"><b class="ox">The Swarm's demand</b><p class="desc">${k.tribute ? `You pay a tribute of ${fmt(AL.tributeRate(this.A.R))} credits an hour. The Swarm leaves you alone, for now.` : 'They want a share of your income. Refuse, and their raids will come.'}</p><button class="btn small ${k.tribute ? '' : 'gold'}" data-a="tribute" data-k="${k.tribute ? 0 : 1}">${k.tribute ? 'Stop paying' : 'Pay the tribute'}</button>${k.tribute ? '' : ' <button class="btn small red" data-a="tribute" data-k="0">Refuse them</button>'}</div>`;
    // gifts, embassies, agreements
    if (!d.extinct && !d.hostile && !d.minor) { const g = AL.giftSpec(s, id, this.A.R); h += `<div class="box"><b class="ox">Diplomacy</b><div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px"><button class="btn small" data-a="giftCiv" data-k="${id}">🎁 Gift ${fmt(g.n)} ${esc(RES[g.r].name)}</button>`;
      const ej = this.job('embassy', id), ec = AL.canEmbassy(s, id); h += ej ? '</div>' + this.prog(ej, 'EMBASSY UNDER CONSTRUCTION') : `${this.btn(ec, 'embassy', `🏛 ${k.embassy ? 'Expand' : 'Open'} embassy`, `data-k="${id}"`)}</div>${ec.ok || ec.cost ? `<div class="meta">${costHTML(ec.cost || AL.embassyCost(k.embassy + 1), s.res)}</div>` : ''}`;
      h += `<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${['trade', 'pact', 'alliance'].map((x) => { const c = AL.canDeal(s, id, x); return k.deals[x] ? `<span class="tag live">${esc(AL.DEALS[x].name)}</span>` : this.btn(c, 'deal', `✍ ${AL.DEALS[x].name} (${AL.DEALS[x].inf} ${RES.influence.icon})`, `data-k="${id}" data-t="${x}"`); }).join('')}</div></div>`; }
    // a request
    if (k && k.req) { const ok = AL.reqDone(s, k.req); h += `<div class="box"><b class="ox">Request</b><p class="desc">${esc(k.req.text)}. Expires in ${fmtTime((k.req.until - Date.now()) / 1000)}.</p><button class="btn small ${ok ? 'gold' : ''}" data-a="fulfil" data-k="${id}" ${ok ? '' : 'disabled'}>${ok ? 'Fulfil' : 'Not yet possible'}</button></div>`; }
    // young species
    if (d.minor) { const mode = A.minors[id] || 'observe'; const up = this.job('uplift', id), uc = AL.canUplift(s, id); h += `<div class="box"><b class="ox">Their future</b><p class="desc">${mode === 'uplift' ? 'Uplifted: they are learning to reach the stars, with your help.' : 'They do not know we are here. Observe from orbit (xenodata), take what their world has (resources, and the Veyari will not forgive it), or lift them up.'}</p>${mode === 'uplift' ? '' : `<div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn small ${mode === 'observe' ? 'gold' : ''}" data-a="minor" data-k="${id}" data-t="observe">🔭 Observe</button><button class="btn small ${mode === 'exploit' ? 'red' : ''}" data-a="minor" data-k="${id}" data-t="exploit">⛏ Exploit</button>${up ? '' : this.btn(uc, 'uplift', '🌱 Uplift', `data-k="${id}"`)}</div>${up ? this.prog(up, 'UPLIFT UNDER WAY') : ''}`}</div>`; }
    // the Hollow ruins
    if (id === 'hollow') { const j = this.job('dig', ''), c = AL.canDig(s); h += `<div class="box"><b class="ox">The ruins at Epsilon Eridani · level ${A.ruins} / 10</b><p class="desc">Each level uncovers more of the relay's builders: xenodata, and their surviving machines.</p>${j ? this.prog(j, `EXCAVATING LEVEL ${j.lvl}`) : `<div>${costHTML(c.cost || AL.digCost(A.ruins + 1), s.res)}</div>${this.btn(c, 'dig', '⛏ Excavate')}`}</div>`; }
    // their knowledge
    const xs = Object.entries(XENOTECH).filter(([, X]) => X.sp === id); if (xs.length) h += `<h3>Their knowledge</h3><div class="bots">${xs.map(([x, X]) => { const c = AL.canXeno(s, x); return `<div class="botc" style="grid-template-columns:1fr auto"><div><b>${esc(X.name)}</b><div class="meta">${esc(X.desc)}</div></div>${A.xt[x] ? '<span class="good ox">Learned</span>' : `<button class="btn small ${c.ok ? 'gold' : ''}" data-a="xeno" data-k="${x}" ${c.ok || (c.why || '').startsWith('Needs ' + X.xeno) ? '' : 'disabled'}>${c.ok ? `${RES.xeno.icon} ${fmt(X.xeno)}` : esc(c.why || '')}</button>`}</div>`; }).join('')}</div>`;
    return h; }
  firstContactModal(id: string) { const d = AL.allSpecies()[id]; this.shown.add(id);
    this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">FIRST CONTACT · ${esc(STARS[d.star]?.name || '')}</div><div class="portrait unknown big">?</div><h1>A signal</h1><p class="desc">It is unmistakably artificial, and it is aimed at us. How we answer will be remembered: different minds will hear the same words very differently.</p>
      <div class="bots">${Object.entries(OPENINGS).map(([k, o]) => `<button class="botc opening" data-a="meet" data-k="${id}" data-t="${k}" style="grid-template-columns:1fr;text-align:left"><b>${esc(o.name)}</b><span class="meta">${esc(o.desc)}</span></button>`).join('')}</div>`, { rays: true }); }
  // a contact to make: offer it once per session when the player is at the base
  maybePrompt() { const p = AL.pendingContacts(this.s).find((id) => !this.shown.has(id)); if (p) { this.shown.add(p); this.A.enqueue(() => { if (!AL.known(this.s, p)) this.firstContactModal(p); }); } }
  act(a: string, t: HTMLElement): boolean { const s = this.s, A = this.A, ui = this.ui; const k = t.dataset.k!; const rr = (r: any, msg: string) => { if (r && r.ok) { A.audio.play('claim'); if (msg) ui.toast(msg, 'good'); A.changed(); ui.renderOver(); } else ui.deny(r && r.why); return true; };
    switch (a) {
      case 'contact': ui.openOver('contact'); A.audio.play('tap'); return true;
      case 'civ': this.sel = k; ui.renderOver(); A.audio.play('tap'); return true;
      case 'firstContact': this.firstContactModal(k); return true;
      case 'meet': { AL.meet(s, k, t.dataset.t!); ui.closeModal(); this.sel = k; const d = AL.allSpecies()[k]; A.audio.play('levelup'); A.platform.happytime(); ui.modal(`<div class="ox muted" style="letter-spacing:.2em">FIRST CONTACT</div><img class="portrait" src="${portrait(k, d as any, 240)}" width="120" height="120"><h1 style="color:${d.col}">${esc(d.name)}</h1><p class="desc">${esc(d.lore)}</p><p class="desc">They heard ${esc(OPENINGS[t.dataset.t!].name.toLowerCase())}. Relations: <b style="color:${relCol(AL.known(s, k).rel)}">${relWord(AL.known(s, k).rel)}</b>.</p><button class="btn gold" data-a="contact">Open Contact</button> <button class="btn" data-a="closeModal">Later</button>`, { rays: true }); A.changed(); return true; }
      case 'decipher': return rr(AL.startDecipher(s, k), 'Linguists begin work');
      case 'giftCiv': return rr(AL.gift(s, k, A.R), 'They accept your gift');
      case 'embassy': return rr(AL.startEmbassy(s, k), 'Embassy construction begins');
      case 'deal': return rr(AL.deal(s, k, t.dataset.t!), 'Agreement signed');
      case 'fulfil': { const r = AL.fulfil(s, k); return rr(r, r.ok ? `Request fulfilled: +${fmt((r as any).xeno)} xenodata` : ''); }
      case 'xeno': return rr(AL.learnXeno(s, k), 'Alien knowledge learned');
      case 'tribute': AL.setTribute(s, k === '1'); A.changed(); ui.renderOver(); ui.toast(k === '1' ? 'You pay the Swarm. For now, they hold back.' : 'You refuse the Swarm. Expect raids: build defences and warships.', k === '1' ? 'good' : 'bad'); return true;
      case 'minor': AL.setMinor(s, k, t.dataset.t!); A.changed(); ui.renderOver(); A.audio.play('tap'); return true;
      case 'uplift': return rr(AL.startUplift(s, k), 'The uplift begins');
      case 'dig': return rr(AL.startDig(s), 'The excavation begins');
    }
    return false; }
}
