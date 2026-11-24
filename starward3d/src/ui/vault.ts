// Events and the Precursor Vault: the weekly event screen, Crystal Mines, the Relic Forge, Relic Sanctums
// (summon and evolve Relic AIs) and the crystal inventory.
import { esc, fmt, fmtTime } from '../core/util';
import * as G from '../core/game';
import * as EV from '../core/events';
import * as V from '../core/vault';
import { Item } from '../core/state';
import { SPECIES, SPECIES_ORDER } from '../data/species';
import { RARITIES } from '../data/rarities';
import { ELEMENTS } from '../data/elements';
import { CRYSTALS, CRYSTAL_ORDER, TIER_NAMES, DIGS, mineYield, FORGE_IN, forgeIridium, SUMMON, EVOLVE, relicEarn } from '../data/vault';
import { bayCapacity } from '../data/buildings';
import { RARITY_ORDER } from '../data/rarities';
import type { UI } from './ui';
const IC: Record<string, string> = { credits: '<span class="ic cr">C</span>', cells: '<span class="ic ce">⚡</span>', dm: '<span class="ic dm">◆</span>', iridium: '<span class="ic ir">✦</span>' };
const gem = (c: string, tier: number, size = 22) => `<span class="gem t${tier}" style="--gc:${CRYSTALS[c].color};width:${size}px;height:${size}px"></span>`;
export class VaultUI {
  digColor = 'aurora';
  constructor(private ui: UI) {}
  get s() { return this.ui.app.s; } get app() { return this.ui.app; }
  // ---------------- events ----------------
  eventChip() { const ev = EV.currentEvent(), dot = EV.eventDot(this.s); return `<button class="chip ev" data-a="event" style="--ec:${ev.def.color}">${ev.def.icon} ${esc(ev.def.name)} · ${fmtTime((ev.end - Date.now()) / 1000)}${dot ? '<i class="rdot"></i>' : ''}</button>`; }
  eventHTML() { const s = this.s, ev = EV.currentEvent(), E = EV.eventState(s), t = EV.tokens(s), d = ev.def; const max = EV.MILESTONES[EV.MILESTONES.length - 1]; const bot = SPECIES[d.bot];
    return `<div class="head"><h1>${d.icon} ${esc(d.name)}</h1><span class="chip">ends in ${fmtTime((ev.end - Date.now()) / 1000)}</span><button class="ibtn" data-a="close">✕</button></div><div class="body" style="max-width:760px;margin:0 auto;width:100%">
      <div class="card evhero" style="--ec:${d.color}"><div class="row" style="align-items:center;gap:14px"><img src="${this.app.studio.bot(d.bot)}" style="width:120px;height:120px"><div class="grow"><div class="ox sub" style="letter-spacing:.15em;color:${d.color}">THIS WEEK'S EXCLUSIVE</div><h2 style="margin:2px 0">${esc(bot.name)}</h2><span class="rar" style="color:${RARITIES[bot.rarity].color}">${RARITIES[bot.rarity].name}</span><p class="desc">${esc(d.tagline)} Reach the top of the track to win it: it never comes back in the shop.</p></div></div></div>
      <div class="row" style="margin:12px 0 4px"><b class="ox grow" style="font-size:20px">🎟 ${fmt(t)} tokens</b><span class="sub">${E.claimed.length}/${EV.MILESTONES.length} rewards</span></div><div class="bar gold"><i style="width:${Math.min(100, (t / max) * 100)}%"></i></div>
      <div class="track">${EV.MILESTONES.map((m, i) => { const r = EV.milestoneReward(s, i, d) as any; const got = E.claimed.includes(i), ok = t >= m;
        return `<div class="ms ${got ? 'got' : ok ? 'ok' : ''}"><b>${fmt(m)}</b><span>${r.bot ? `<img src="${this.app.studio.bot(r.bot)}" style="width:40px;height:40px">` : r.core ? '🤖' : r.res ? (r.res.dm ? '◆' : '📦') : ''}</span><i>${esc(r.label)}</i>${got ? '<em>✓</em>' : ok ? `<button class="btn gold small" data-a="claimMs" data-i="${i}">Claim</button>` : ''}</div>`; }).join('')}</div>
      <h3 class="ox" style="margin:14px 0 6px">How to earn tokens</h3><div class="earn">${Object.entries(EV.TOKEN_VALUE).map(([k, [v, label]]) => { const f = d.featured.includes(k); return `<div class="${f ? 'feat' : ''}"><span>${esc(label)}</span><b>+${v * (f ? 3 : 1)}</b>${f ? '<em>×3 this week</em>' : ''}</div>`; }).join('')}</div>
      <p class="sub" style="text-align:center">A new event starts every Monday. Six themes rotate, each with its own exclusive bot.</p></div>`; }
  // ---------------- the Vault ----------------
  crystalsHTML() { const C = V.vault(this.s).crystals; return `<table class="gems"><tr><td></td>${TIER_NAMES.map((n) => `<th>${n}</th>`).join('')}</tr>${CRYSTAL_ORDER.map((c) => `<tr><td><b style="color:${CRYSTALS[c].color}">${CRYSTALS[c].name}</b></td>${C[c].map((n, t) => `<td>${gem(c, t, 18)} ${fmt(n)}</td>`).join('')}</tr>`).join('')}</table>`; }
  mineHTML(it: Item) { const s = this.s, r = V.vault(s).ready[it.id], j = G.jobOf(s, it.id, 'dig' as any);
    if (r) return `<div class="row"><span class="grow desc">${gem(r.color, 0)} ${fmt(r.n)} ${CRYSTALS[r.color].name} shards are ready.</span><button class="btn green" data-a="collectMine" data-id="${it.id}">Collect</button></div>`;
    if (j) { const c = G.dmCost((j.end - Date.now()) / 1000); return `<p class="desc">Digging for ${CRYSTALS[j.sp || 'aurora'].name} shards…</p><div class="bar"><i data-bar="${j.id}"></i></div><div class="row" style="margin-top:8px"><b class="grow" data-left="${j.id}"></b><button class="btn gold small" data-a="finish" data-job="${j.id}" data-dm="${j.id}">${c ? `${IC.dm}${c} Finish now` : 'Finish (free)'}</button></div>`; }
    return `<p class="desc">Pick a crystal colour, then a dig. Credits buy digging time; deeper digs pay more shards.</p><div class="row">${CRYSTAL_ORDER.map((c) => `<button class="btn small ${this.digColor === c ? 'gold' : ''}" data-a="digColor" data-c="${c}">${gem(c, 0, 16)} ${CRYSTALS[c].name}</button>`).join('')}</div>
      <div class="recipes">${DIGS.map((d, i) => `<div class="rec"><b>${esc(d.name)}</b><span class="out" style="color:${CRYSTALS[this.digColor].color}">${gem(this.digColor, 0, 16)} ${mineYield(d.shards, it.lvl)}</span><span class="sub">${fmtTime(d.sec)}</span><button class="btn small" data-a="dig" data-id="${it.id}" data-i="${i}"><span class="cost" data-cost="credits:${d.cost}">${IC.credits}${fmt(d.cost)}</span></button></div>`).join('')}</div>`; }
  forgeHTML() { const s = this.s, C = V.vault(s).crystals; return `<p class="desc">Four crystals of a tier and some Iridium make one of the next tier. You have ${IC.iridium} ${fmt(s.res.iridium || 0)} Iridium.</p>
    <table class="gems"><tr><td></td>${TIER_NAMES.slice(0, 3).map((n, t) => `<th>${n} → ${TIER_NAMES[t + 1]}<br><span class="sub" style="margin:0">${IC.iridium}${forgeIridium(t)}</span></th>`).join('')}</tr>${CRYSTAL_ORDER.map((c) => `<tr><td><b style="color:${CRYSTALS[c].color}">${CRYSTALS[c].name}</b></td>${[0, 1, 2].map((t) => { const ok = V.canForge(s, c, t).ok;
      return `<td><button class="btn small ${ok ? 'gold' : ''}" data-a="forge" data-c="${c}" data-t="${t}" ${ok ? '' : 'disabled'}>${gem(c, t, 14)}${C[c][t]}/${FORGE_IN} → ${gem(c, t + 1, 14)}</button></td>`; }).join('')}</tr>`).join('')}</table>`; }
  relicHTML(it: Item) { const s = this.s, el = it.el || 'aurora', bots = G.botsIn(s, it.id), cap = bayCapacity(it.lvl), n = s.bay[it.id] || 0;
    const species = SPECIES_ORDER.filter((k) => SPECIES[k].alien === 'relic' && SPECIES[k].el[0] === el);
    return `<div class="row"><div class="grow"><div class="bar" id="relbar"><i style="width:${(n / V.relicCap(it)) * 100}%;background:linear-gradient(90deg,#c49bff,#8a5cff)"></i></div></div><b>${IC.iridium} <span id="relv">${fmt(n)} / ${fmt(V.relicCap(it))}</span></b><button class="btn gold small" id="relc" data-a="collect" data-id="${it.id}" ${n >= 1 ? '' : 'disabled'}>Collect</button></div>
      <div class="sub">${IC.iridium} ${(Math.round(V.relicRate(s, it.id) * 600) / 10).toLocaleString('en-US')} Iridium per minute · ${bots.length}/${cap} Relic AIs</div>
      <div class="bots">${bots.map((b) => { const ev = V.canEvolve(s, b); const nx = b.lvl < 5 ? EVOLVE[b.lvl - 1] : null;
        return `<div class="botc"><div class="pic" style="background:radial-gradient(circle, ${ELEMENTS[el].color}55, transparent 70%)"><img src="${this.app.studio.bot(b.sp)}"></div><div><b>${esc(SPECIES[b.sp].name)}</b> <span style="color:#ffd36a">${'★'.repeat(b.lvl)}${'☆'.repeat(5 - b.lvl)}</span><div class="meta">${IC.iridium} ${relicEarn(RARITY_ORDER.indexOf(SPECIES[b.sp].rarity), b.lvl).toFixed(1)}/min</div></div>
          ${nx ? `<button class="btn small ${ev.ok ? 'gold' : ''}" data-a="evolve" data-bot="${b.id}" ${ev.ok ? '' : 'disabled'}>⬆ ${gem(el, nx[0], 14)}${nx[1]}</button>` : '<span class="sub">MAX</span>'}</div>`; }).join('') || '<p class="desc">No Relic AIs here yet.</p>'}</div>
      <div class="sub" style="margin-top:10px">Summon ${/^[AEIOU]/.test(ELEMENTS[el].name) ? 'an' : 'a'} ${ELEMENTS[el].name} Relic AI</div><div class="bots">${species.map((k, i) => { const [t, c] = SUMMON[i]; const ok = V.canSummon(s, k);
        return `<div class="botc"><div class="pic"><img src="${this.app.studio.bot(k)}" style="${s.dex[k] ? '' : 'filter:brightness(0) opacity(.55)'}"></div><div><b>${s.dex[k] ? esc(SPECIES[k].name) : '???'}</b> <span class="rar" style="color:${RARITIES[SPECIES[k].rarity].color}">${['Minor', 'Major', 'Prime'][i]}</span><div class="meta">earns ${IC.iridium} ${relicEarn(RARITY_ORDER.indexOf(SPECIES[k].rarity), 1).toFixed(1)}/min at one star</div></div><button class="btn small ${ok.ok ? 'gold' : ''}" data-a="summon" data-sp="${k}" ${ok.ok ? '' : 'disabled'} title="${esc(ok.why || '')}">${gem(el, t, 14)}${c}</button></div>`; }).join('')}</div>`; }
  act(a: string, t: HTMLElement): boolean { const s = this.s, A = this.app, ui = this.ui; const it = t.dataset.id ? G.item(s, t.dataset.id) : undefined;
    switch (a) {
      case 'event': ui.openOver('event'); A.audio.play('tap'); return true;
      case 'claimMs': { const r = EV.claimMilestone(s, +(t.dataset.i || 0)); if (r) { A.audio.play(r.r.bot ? 'levelup' : 'claim'); A.changed(); ui.renderOver(); if (r.r.bot) ui.toast(`${SPECIES[r.r.bot].name} is yours! Its core is booting.`, 'gold'); else if (r.gift) ui.toast('A core is booting in the Assembly Bay', 'gold'); } return true; }
      case 'crystals': ui.modal(`<h1 style="font-size:20px">Relic crystals</h1>${this.crystalsHTML()}<p class="sub">${IC.iridium} ${fmt(s.res.iridium || 0)} Iridium</p><button class="btn" data-a="closeModal">Close</button>`); return true;
      case 'digColor': this.digColor = t.dataset.c || 'aurora'; ui.renderPanel(); A.audio.play('tap'); return true;
      case 'dig': if (it) { const r = V.dig(s, it, +(t.dataset.i || 0), this.digColor); if (r.ok) { A.audio.play('build'); A.changed(); ui.renderPanel(); } else ui.deny(r.why); } return true;
      case 'collectMine': if (it) { const r = V.collectMine(s, it); if (r) { A.audio.play('crystal'); const rc = t.getBoundingClientRect(); ui.popText(rc.left + rc.width / 2, rc.top, `+${r.n} ${CRYSTALS[r.color].name}`, CRYSTALS[r.color].color); A.changed(); ui.renderPanel(); } } return true;
      case 'forge': { const r = V.forge(s, t.dataset.c || 'aurora', +(t.dataset.t || 0)); if (r.ok) { A.audio.play('done'); A.changed(); ui.renderPanel(); } else ui.deny(r.why); return true; }
      case 'summon': { const r = V.summon(s, t.dataset.sp || '') as any; if (r.ok && r.bot) { A.audio.play('levelup'); A.changed(); ui.renderPanel(); ui.newBot(r.bot); } else ui.deny(r.why); return true; }
      case 'evolve': { const b = s.bots.find((x) => x.id === t.dataset.bot); if (!b) return true; const r = V.evolve(s, b); if (r.ok) { A.audio.play('evolve'); A.changed(); ui.renderPanel(); ui.toast(`${SPECIES[b.sp].name} evolved to ${b.lvl} stars!`, 'gold'); } else ui.deny(r.why); return true; }
    }
    return false; }
}
