// STARWARD: the Contact screen. Every civilisation you have found: portrait, nature, relations and understanding,
// requests, gifts, agreements, embassies and the knowledge they will trade. Minor species, the Kr'thul's demands,
// the Hollow ruins and a codex of alien life.
import { icon } from './icons.js';
import { fmt, fmtTime, esc, $, $$, clamp } from '../util.js';
import { RES } from '../data/resources.js';
import { TECH } from '../data/research.js';
import { STARS } from '../data/stars.js';
import { TIERS, OPENINGS, XENOTECH } from '../data/aliens.js';
import * as AL from '../core/aliens.js';
import { portrait } from '../render/portraits.js';

const cost = (c, s) => Object.entries(c).map(([r, n]) => `<span class="cost ${(s.res[r] || 0) < n ? 'short' : ''}" data-r="${r}" data-n="${n}" style="--rc:${RES[r].color}">${icon(r, 'xs')}${fmt(n)}</span>`).join('');
const relBar = (v) => `<div class="relbar"><i style="left:50%;width:${Math.abs(v) / 2}%;${v < 0 ? 'transform:translateX(-100%);background:var(--red)' : ''}"></i><b>${Math.round(v)}</b></div>`;
export class ContactUI {
  constructor(ui) { this.ui = ui; this.sel = null; }
  get app() { return this.ui.app; } get s() { return this.app.s; }
  open() { $('#overlay').className = 'on contact'; this.render(); }
  list() { const s = this.s, ALL = AL.allSpecies(); return Object.keys(ALL).filter((id) => AL.known(s, id) || AL.discovered(s, id)); }
  render() {
    const s = this.s, ALL = AL.allSpecies(), el = $('#overlay'); const ids = this.list(); if (!this.sel || !ids.includes(this.sel)) this.sel = ids[0] || null;
    const scroll = el.querySelector('.ct-detail') ? el.querySelector('.ct-detail').scrollTop : 0;
    let h = `<div class="ovh"><h1>${icon('xeno')} Contact</h1><span class="muted">${Object.keys(AL.al(s).known).length} civilisations known · ${fmt(s.res.influence || 0)} influence · ${fmt(s.res.xeno || 0)} xenodata</span><button class="ibtn" data-a="closeov">${icon('x')}</button></div><div class="ct">`;
    h += `<div class="ct-list">${ids.map((id) => { const d = ALL[id], k = AL.known(s, id); return `<button class="ct-card ${this.sel === id ? 'on' : ''} ${k ? '' : 'unk'}" data-a="alsel" data-sp="${id}"><img src="${k ? portrait(id, d, 96) : ''}" class="${k ? '' : 'sil'}"><span><b>${k ? esc(d.name) : 'Unanswered signal'}</b><i>${k ? esc(TIERS[d.tier]) + (d.extinct ? ' · extinct' : '') : 'from ' + esc(STARS[d.star].name)}</i>${k && !d.extinct ? relBar(k.rel) : ''}</span>${k && k.req ? '<em class="dot"></em>' : ''}</button>`; }).join('')}${AL.al(s).codex.length ? `<div class="codex"><b>${icon('book', 'xs')} Codex of life</b>${AL.al(s).codex.map((c) => `<span>${esc(c.name)} <i>${esc(c.world)}</i></span>`).join('')}</div>` : ''}</div>`;
    h += `<div class="ct-detail">${this.sel ? this.detail(this.sel) : `<div class="empty">${icon('xeno')} No one has answered yet. Survey more stars: someone is out there.</div>`}</div></div>`;
    el.innerHTML = h; const dd = el.querySelector('.ct-detail'); if (dd) dd.scrollTop = scroll; this.live();
  }
  detail(id) {
    const s = this.s, d = AL.allSpecies()[id], k = AL.known(s, id), R = this.app.R;
    if (!k) return `<div class="ct-head"><div class="sil big"></div><div><h2>Unanswered signal</h2><p class="muted">From the direction of ${esc(STARS[d.star].name)}. Something is there, and it has noticed us.</p></div></div>${s.tech.contactProtocols ? `<button class="btn gold big" data-a="contact" data-sp="${id}">${icon('xeno', 'xs')} Make first contact</button>` : `<p class="why">${icon('lock', 'xs')} Research ${esc(TECH.contactProtocols.name)}</p>`}`;
    let h = `<div class="ct-head"><img src="${portrait(id, d, 200)}"><div><h2 style="color:${d.col}">${esc(d.name)}</h2><span class="lvl">${esc(TIERS[d.tier])} · ${esc(d.temper)}</span><p class="origin">${esc(d.origin)}</p></div></div><p class="desc">${esc(d.lore)}</p>`;
    if (d.extinct) return h + this.ruins();
    h += `<div class="ct-stats"><div><span>Relations</span>${relBar(k.rel)}<small>Drifting towards ${Math.round(AL.target(s, id))}</small></div><div><span>Understanding</span><div class="undbar"><i style="width:${k.und}%"></i><b>${k.und}%</b></div>${this.decipherBtn(id)}</div></div>`;
    if (d.likes) h += `<p class="muted small">Likes: ${esc(d.likes)} · Dislikes: ${esc(d.dislikes)}</p>`;
    if (k.req) h += `<div class="sec req"><b>${icon('target', 'xs')} Request</b><p>${esc(k.req.text)}</p><p class="muted small">Expires in <b data-until="${k.req.until}"></b> · reward: relations +15, xenodata, influence</p><button class="btn gold small" data-a="fulfil" data-sp="${id}" ${AL.reqDone(s, k.req) ? '' : 'disabled'}>${icon('check', 'xs')} ${k.req.k === 'give' ? 'Deliver' : 'Report back'}</button></div>`;
    if (id === 'krthul') return h + this.krthul(k, R);
    const g = AL.giftSpec(s, id, R); const cd = Math.max(0, 6 * 3600e3 - (Date.now() - (k.gift || 0)));
    h += `<div class="ct-row"><button class="btn small" data-a="gift" data-sp="${id}" ${cd || (s.res[g.r] || 0) < g.n ? 'disabled' : ''}>${icon('star', 'xs')} Send a gift: ${fmt(g.n)} ${RES[g.r].name.toLowerCase()}${cd ? ` (in ${fmtTime(cd / 1000)})` : ''}</button></div>`;
    if (d.minor && d.tier < 3 && AL.al(s).minors[id] !== 'uplift') return h + this.minor(id);
    h += `<div class="sec"><b>${icon('book', 'xs')} Agreements</b>${Object.entries(AL.DEAL_INFO).map(([kd, D]) => { const c = AL.canDeal(s, id, kd); const on = k.deals[kd]; return `<div class="deal ${on ? 'on' : ''}"><span><b>${D.name}</b><i>${kd === 'trade' && d.trade ? esc(d.trade.label) : kd === 'pact' ? 'Research 4% faster, science +4%' : 'Every agreement 50% stronger'}</i></span>${on ? `<em class="${AL.dealActive(s, id, kd) ? '' : 'bad'}">${AL.dealActive(s, id, kd) ? 'active' : 'suspended: relations too low'}</em>` : `<button class="btn small" data-a="deal" data-sp="${id}" data-deal="${kd}" ${c.ok ? '' : 'disabled'} title="${esc(c.why || '')}">${icon('influence', 'xs')} ${D.inf}</button>`}</div>${!on && !c.ok && c.why ? `<p class="why small">${esc(c.why)}</p>` : ''}`; }).join('')}</div>`;
    const ec = AL.canEmbassy(s, id); const ej = s.jobs.find((j) => j.kind === 'embassy' && j.sp === id);
    h += `<div class="sec"><b>${icon('base', 'xs')} Embassy · level ${k.embassy}/5</b><p class="muted small">Makes influence and warms relations by 4 per level.</p>${ej ? `<p>Building · <b data-left="${ej.id}"></b></p>` : k.embassy < 5 ? `<div class="costs">${cost(AL.embassyCost(k.embassy + 1), s)}</div><button class="btn small" data-a="embassy" data-sp="${id}" ${ec.ok ? '' : 'disabled'}>${icon('up', 'xs')} ${k.embassy ? 'Expand' : 'Open'} the embassy</button>${ec.ok || ec.cost ? '' : `<p class="why small">${esc(ec.why)}</p>`}` : ''}</div>`;
    const xs = Object.keys(XENOTECH).filter((x) => XENOTECH[x].sp === id); if (xs.length) h += this.knowledge(xs);
    return h;
  }
  decipherBtn(id) { const s = this.s, k = AL.known(s, id); if (k.und >= 100) return '<small>Fully understood</small>'; const j = s.jobs.find((x) => x.kind === 'decipher' && x.sp === id); if (j) return `<small>Deciphering · <b data-left="${j.id}"></b></small>`;
    const c = AL.canDecipher(s, id); return `<div class="costs small">${cost(AL.decipherCost(s, id), s)}</div><button class="btn small" data-a="decipher" data-sp="${id}" ${c.ok ? '' : 'disabled'}>${icon('research', 'xs')} Decipher (+25%) · ${fmtTime(AL.decipherTime(s, id))}</button>${c.ok || c.cost ? '' : `<p class="why small">${esc(c.why)}</p>`}`; }
  knowledge(xs) { const s = this.s; return `<div class="sec"><b>${icon('research', 'xs')} Knowledge they will share</b>${xs.map((x) => { const X = XENOTECH[x], c = AL.canXeno(s, x), have = AL.al(s).xt[x]; return `<div class="deal ${have ? 'on' : ''}"><span><b>${esc(X.name)}</b><i>${esc(X.desc)}</i></span>${have ? '<em>learned</em>' : `<button class="btn small" data-a="xeno" data-x="${x}" ${c.ok ? '' : 'disabled'} title="${esc(c.why || '')}">${icon('xeno', 'xs')} ${fmt(X.xeno)}</button>`}</div>${have || c.ok || c.cost ? '' : `<p class="why small">${esc(c.why)}</p>`}`; }).join('')}</div>`; }
  minor(id) { const s = this.s, mode = AL.al(s).minors[id]; const c = AL.canUplift(s, id); const j = s.jobs.find((x) => x.kind === 'uplift' && x.sp === id);
    return `<div class="sec"><b>${icon('target', 'xs')} What do we do?</b><p class="muted small">Observing quietly yields xenodata. Exploiting their world yields metal and rare elements, but they will hate us, and the Veyari will remember. Uplifting them is slow and costly, and makes a friend for ever.</p><div class="chips">${[['observe', 'Observe quietly'], ['exploit', 'Exploit their world']].map(([m, n]) => `<button class="chip2 ${mode === m ? 'on' : ''}" data-a="minor" data-sp="${id}" data-mode="${m}">${n}</button>`).join('')}</div>
      ${j ? `<p>Uplift under way · <b data-left="${j.id}"></b></p>` : `<div class="costs">${cost(AL.upliftCost(), s)}<span class="cost time">${icon('clock', 'xs')}${fmtTime(5 * 86400)}</span></div><button class="btn gold small" data-a="uplift" data-sp="${id}" ${c.ok ? '' : 'disabled'}>${icon('up', 'xs')} Uplift them</button>${c.ok || c.cost ? '' : `<p class="why small">${esc(c.why)}</p>`}`}</div>`; }
  krthul(k, R) { return `<div class="sec danger"><b>${icon('target', 'xs')} The Swarm's demand</b><p>The Kr'thul demand tribute: a share of your income, every hour, or they will come. Their fleets are still far off, but they are on the way.</p><p class="muted small">Tribute: ${fmt(AL.tributeRate(R))} credits per hour. It keeps them calm (relations drift up by 45).</p><div class="row"><button class="btn small ${k.tribute ? 'gold' : ''}" data-a="tribute" data-on="1">${k.tribute ? icon('check', 'xs') + ' Paying tribute' : 'Pay tribute'}</button><button class="btn small ${k.tribute === false && this.s.flags.krthulAnswered ? 'gold' : ''}" data-a="tribute" data-on="0">Refuse</button></div></div>`; }
  ruins() { const s = this.s, A = AL.al(s); const c = AL.canDig(s); const j = s.jobs.find((x) => x.kind === 'dig');
    let h = `<div class="sec"><b>${icon('base', 'xs')} The relay ruins · excavated ${A.ruins}/10</b><div class="undbar"><i style="width:${A.ruins * 10}%"></i></div>${j ? `<p>Digging level ${j.lvl} · <b data-left="${j.id}"></b></p>` : A.ruins < 10 ? `<div class="costs">${cost(AL.digCost(A.ruins + 1), s)}</div><button class="btn gold small" data-a="dig" ${c.ok ? '' : 'disabled'}>${icon('up', 'xs')} Excavate level ${A.ruins + 1}</button>${c.ok || c.cost ? '' : `<p class="why small">${esc(c.why)}</p>`}` : ''}</div>`;
    return h + this.knowledge(Object.keys(XENOTECH).filter((x) => XENOTECH[x].sp === 'hollow')); }
  live() { const s = this.s; $$('#overlay [data-left]').forEach((el) => { const j = s.jobs.find((x) => x.id === el.dataset.left); if (j) el.textContent = fmtTime((j.end - Date.now()) / 1000); else if (!this.pending) { this.pending = true; setTimeout(() => { this.pending = false; if (this.app.view === 'contact') this.render(); }, 300); } });
    $$('#overlay [data-until]').forEach((el) => (el.textContent = fmtTime(Math.max(0, (+el.dataset.until - Date.now()) / 1000)))); $$('#overlay .cost[data-r]').forEach((e) => e.classList.toggle('short', (s.res[e.dataset.r] || 0) < +e.dataset.n)); }
  // the first-contact moment (a modal with the four openings)
  contact(id) { const d = AL.allSpecies()[id]; this.ui.modal(`<div class="intro contactm"><img class="cport" src="${portrait(id, d, 200)}"><div class="logo small">FIRST CONTACT</div><p class="tag">${esc(d.name)} · ${esc(TIERS[d.tier])}</p><p>${esc(d.lore)}</p><p class="muted">How does humanity say hello?</p><div class="openings">${Object.entries(OPENINGS).map(([k, o]) => `<button class="btn" data-a="opening" data-sp="${id}" data-o="${k}"><b>${o.name}</b><i>${o.desc}</i></button>`).join('')}</div></div>`, 'intro'); }
  click(t) {
    const A = this.app, s = this.s, a = t.dataset.a, id = t.dataset.sp; const ok = (r, msg) => { if (r && r.ok === false) { this.ui.toast(r.why, 'bad'); A.audio.play('deny'); } else { A.audio.play('claim'); if (msg) this.ui.toast(msg, 'gold'); A.changed(); } if (A.view === 'contact') this.render(); return true; };
    if (a === 'alsel') { this.sel = id; A.audio.play('tap'); this.render(); return true; }
    if (a === 'contact') { this.contact(id); return true; }
    if (a === 'opening') { AL.meet(s, id, t.dataset.o); this.ui.closeModal(); this.sel = id; A.audio.play('research'); this.ui.toast(`Contact: the ${AL.allSpecies()[id].name} have answered`, 'gold'); A.changed(); if (A.view === 'contact') this.render(); else A.setView('contact'); return true; }
    if (a === 'decipher') return ok(AL.startDecipher(s, id), 'Linguists begin work');
    if (a === 'gift') return ok(AL.gift(s, id, A.R), 'Gift sent');
    if (a === 'deal') return ok(AL.deal(s, id, t.dataset.deal), `${AL.DEAL_INFO[t.dataset.deal].name} signed`);
    if (a === 'embassy') return ok(AL.startEmbassy(s, id), 'Embassy construction begins');
    if (a === 'fulfil') { const r = AL.fulfil(s, id); return ok(r, r.ok ? `Request fulfilled: +${r.xeno} xenodata` : ''); }
    if (a === 'xeno') return ok(AL.learnXeno(s, t.dataset.x), `Learned: ${XENOTECH[t.dataset.x].name}`);
    if (a === 'minor') { AL.setMinor(s, id, t.dataset.mode); if (t.dataset.mode === 'observe') s.flags.minorProtected = 1; return ok(null, t.dataset.mode === 'exploit' ? 'Extraction begins. Somewhere, the Veyari take note.' : 'We watch, and we wait.'); }
    if (a === 'uplift') return ok(AL.startUplift(s, id), 'The uplift begins: teachers, medicine, and patience');
    if (a === 'tribute') { const k = AL.known(s, 'krthul'); AL.setTribute(s, t.dataset.on === '1'); if (k && t.dataset.on === '0') k.tribute = false; return ok(null, t.dataset.on === '1' ? 'Tribute flows to the Swarm' : 'We refuse. The Swarm will remember.'); }
    if (a === 'dig') return ok(AL.startDig(s), 'The excavation goes deeper');
    return false;
  }
}
