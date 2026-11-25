// The War Games screens: the Defence Council overlay (squad, three opponents, the defence log with replays and
// bounties, the leagues), the battle HUD (timer, stars, destruction, squad cards to deploy) and the result.
import { esc, fmt, fmtTime } from '../core/util';
import * as W from '../core/war';
import { Battle, pctOf, starsOf, botPower, roleOf, rIdxOf, Fighter } from '../core/battle';
import { ROLES, LEAGUES, leagueOf, trophyGain, GRANT_H, MAX_TICKS, TICK, SORTIES, FIRST_WIN_DM } from '../data/war';
import { SPECIES } from '../data/species';
import { RARITIES } from '../data/rarities';
import { RES } from '../data/resources';
import { BUILDINGS } from '../data/buildings';
import { income, dateKey } from '../core/daily';
import type { UI } from './ui';
import * as NET from '../core/net';
const resList = (r: Record<string, number>) => Object.entries(r).filter(([, n]) => n > 0).map(([k, n]) => `<span class="cost"><span style="color:${RES[k].color}">${RES[k].icon}</span>${fmt(n)}</span>`).join(' ');
const starRow = (n: number, size = 18) => `<span class="stars" style="font-size:${size}px">${[0, 1, 2].map((i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('')}</span>`;
const DEF_ICON: Record<string, string> = { turret: '🔫', laser: '🔦', missile: '🚀', shield: '🛡', emp: '⚡', wall: '🧱' };
export class WarUI {
  tab: 'attack' | 'log' | 'ranks' = 'attack'; sel = 0; private top: { name: string; trophies: number; hq: number }[] | null = null; private netAt = 0;
  // real commanders and attacks on you, fetched in the background (the Academy is there instantly either way)
  refreshNet(force = false) { const s = this.s; if (!NET.online() || (!force && Date.now() - this.netAt < 60e3)) return; this.netAt = Date.now();
    NET.fetchOpps(s).then((o) => { if (o && o.length) { const Wr = W.war(s); W.refreshOpps(s, true); Wr.opps = [...o, ...Wr.opps].slice(0, 3); if (this.ui.over === 'war') this.ui.renderOver(); } });
    NET.pullDefences(s).then((n) => { if (n && this.ui.over === 'war') this.ui.renderOver(); }); NET.leaderboard().then((t) => { this.top = t; if (this.ui.over === 'war' && this.tab === 'ranks') this.ui.renderOver(); }); }
  constructor(private ui: UI) {}
  get s() { return this.ui.app.s; } get A() { return this.ui.app; }
  private pic(sp: string, size = 46) { return `<div class="pic" style="width:${size}px;height:${size}px"><img src="${this.A.studio.bot(sp)}"></div>`; }
  html() { const s = this.s, Wr = W.war(s); W.tickWar(s); const L = leagueOf(Wr.trophies); const fw = Wr.firstWin !== dateKey(); const un = W.unclaimed(s);
    const pips = Array.from({ length: SORTIES }, (_, i) => `<i class="${i < Wr.sorties ? 'on' : ''}"></i>`).join('');
    const tabs: [string, string][] = [['attack', 'Attack'], ['log', `Defence log${un ? ` · ${un}` : ''}`], ['ranks', 'Circles']];
    const body = this.tab === 'attack' ? this.attack() : this.tab === 'log' ? this.log() : this.ranks();
    return `<div class="head"><h1>Orbital Trials</h1><span class="chip" style="color:${L.col}">✪ ${fmt(Wr.trophies)} · ${L.name}</span><span class="chip sorties" title="Sorties: one returns every 8 hours">${pips}${Wr.sorties < SORTIES && Wr.sortieAt ? `<b>${fmtTime((Wr.sortieAt - Date.now()) / 1000)}</b>` : ''}</span><button class="ibtn" data-a="close">✕</button></div>
      ${Wr.seasonPay ? `<div class="box season"><b class="ox">Season over: ${esc(Wr.seasonPay.league)} circle</b> ${resList({ dm: Wr.seasonPay.dm, cells: Wr.seasonPay.cells })} <button class="btn gold small" data-a="warSeason">Claim</button></div>` : ''}
      <p class="desc" style="margin:4px 0 8px">The Defence Council's simulations: your robots attack a holographic copy of another commander's base. Nothing is ever destroyed, but grants, Power Cells and merit is real. ${fw ? `<b class="good">First win today: +${FIRST_WIN_DM} Dark Matter.</b>` : 'First-win bonus claimed today.'}</p>
      <div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${this.tab === k ? 'on' : ''}" data-a="wtab" data-t="${k}">${esc(n)}</button>`).join('')}</div><div class="body">${body}</div>`; }
  private squadHTML(army: Fighter[]) { const s = this.s; const n = army.length, N = Math.max(n, 4 + Math.ceil(W.warroomLvl(this.s) / 2));
    return `<div class="squad">${army.map((f) => { const r = roleOf(f.sp), d = SPECIES[f.sp]; return `<div class="sq" title="${esc(d.name)} · ${ROLES[r].name}: ${esc(ROLES[r].desc)}" style="--rc:${RARITIES[d.rarity].color}">${this.pic(f.sp, 40)}<span class="rg">${ROLES[r].glyph}</span><b>${f.lvl}</b></div>`; }).join('')}${Array.from({ length: Math.max(0, N - n) }, () => '<div class="sq empty">+</div>').join('')}</div>
      <div class="meta">Squad ${n}/${N} (your strongest robots; the Tactics Centre adds a slot every second level) · strength ${fmt(W.squadPower(army) * 10)}${s.robots && s.robots.list.length > n ? '' : ''}</div>`; }
  private attack() { const s = this.s, Wr = W.war(s); const c = W.canAttack(s); const army = W.squad(s); W.refreshOpps(s);
    const cards = Wr.opps.map((o, i) => { const defs: Record<string, number> = {}; let lv = 0, nd = 0; for (const it of o.layout.items) if (DEF_ICON[it.b]) { defs[it.b] = (defs[it.b] || 0) + 1; if (it.b !== 'wall') { lv += it.lvl; nd++; } }
      const win = trophyGain(2, Wr.trophies, o.trophies), lose = trophyGain(0, Wr.trophies, o.trophies); const g = income(s, GRANT_H[3]);
      return `<div class="opp" style="--oc:${o.look.primary}"><div class="ot"><b class="ox">${esc(o.name)}</b>${o.academy ? '<span class="tag">ACADEMY</span>' : '<span class="tag live">COMMANDER</span>'}</div><div class="meta">✪ ${fmt(o.trophies)} · Mission Control ${o.hq} · defences avg. level ${nd ? Math.round(lv / nd) : 0}</div>
        <div class="defs">${Object.entries(defs).map(([b, n]) => `<span title="${esc(BUILDINGS[b].name)}">${DEF_ICON[b]}×${n}</span>`).join('')}</div><div class="meta">Win: <span class="good">+${win}</span> ✪ · loss: <span class="bad">${lose}</span> · 3 stars: ${resList({ credits: g.credits, metal: g.metal })}</div>
        <button class="btn ${c.ok ? 'gold' : ''} small" style="width:100%;margin-top:6px" data-a="warAttack" data-i="${i}" ${c.ok ? '' : 'disabled'}>${c.ok ? '⚔ Attack' : esc(c.why || '')}</button></div>`; }).join('');
    return `${army.length ? this.squadHTML(army) : `<p class="why">${esc(c.why || '')}</p>`}<div class="opps">${cards}</div><div class="row" style="justify-content:center;margin-top:8px"><button class="btn small" data-a="warNext">↻ New opponents (${fmt(this.nextCost())} ¢)</button></div>`; }
  nextCost() { return Math.max(50, Math.round(income(this.s, 0.08).credits)); }
  private log() { const s = this.s, Wr = W.war(s);
    const def = Wr.log.length ? Wr.log.map((e) => `<div class="botc" style="grid-template-columns:1fr auto"><div><b>${esc(e.who)}</b> ${starRow(e.stars, 14)} <span class="muted">${e.pct}% · ${fmtTime((Date.now() - e.t) / 1000)} ago</span><div class="meta">${e.held ? `<span class="good">Defence held.</span> Bounty ${resList(e.bounty)}` : '<span class="bad">They broke through.</span> Strengthen the side they came from, or add walls to channel them.'}</div></div>
        <div class="row" style="gap:6px">${e.held && !e.claimed ? `<button class="btn gold small" data-a="warBounty" data-id="${e.id}">Claim</button>` : ''}<button class="btn small" data-a="warReplay" data-k="log" data-id="${e.id}">▶ Replay</button></div></div>`).join('') : '<p class="desc">No attacks yet. Every day the Academy runs a drill against a copy of your base; hold it and you earn a bounty.</p>';
    const att = Wr.hist.map((h) => `<div class="botc" style="grid-template-columns:1fr auto"><div><b>vs ${esc(h.who)}</b> ${starRow(h.stars, 14)} <span class="muted">${h.pct}% · <span class="${h.dT >= 0 ? 'good' : 'bad'}">${h.dT >= 0 ? '+' : ''}${h.dT} ✪</span></span></div><button class="btn small" data-a="warReplay" data-k="hist" data-id="${h.id}">▶ Replay</button></div>`).join('');
    return `<h3>Attacks on your base</h3><p class="meta">Other commanders fight the buildings inside your core square (the land around Mission Control); claimed plots stay out of the Trials.</p><div class="bots">${def}</div>${att ? `<h3 style="margin-top:12px">Your attacks</h3><div class="bots">${att}</div>` : ''}`; }
  private ranks() { const Wr = W.war(this.s); const L = leagueOf(Wr.trophies);
    return `<p class="desc">Win to climb. The Academy sends stronger commanders as your merit grows, so a good fight is always close. Every Monday the season ends: you are paid by circle, and merit above 400 are halved toward it.</p><div class="bots">${[...LEAGUES].reverse().map((x) => `<div class="botc ${x === L ? 'ready' : ''}" style="grid-template-columns:1fr auto"><div><b style="color:${x.col}">${esc(x.name)}</b> <span class="muted">from ${fmt(x.min)} ✪</span></div><div>${resList({ dm: x.dm })} + ${x.cellsH}h of cells</div></div>`).join('')}</div><div class="meta" style="margin-top:8px">Personal best: ${fmt(Wr.best)} ✪</div>${this.top && this.top.length ? `<h3 style="margin-top:12px">Top commanders</h3><div class="bots">${this.top.slice(0, 20).map((p, i) => `<div class="botc" style="grid-template-columns:28px 1fr auto"><b class="ox">${i + 1}</b><div><b>${esc(p.name)}</b> <span class="muted">MC ${p.hq}</span></div><span style="color:${leagueOf(p.trophies).col}">✪ ${fmt(p.trophies)}</span></div>`).join('')}</div>` : ''}`; }
  // ---------------- the battle HUD ----------------
  hud(B: Battle, live: boolean, who: string) { let el = document.getElementById('bhud'); if (!el) { el = document.createElement('div'); el.id = 'bhud'; document.body.appendChild(el); } el.classList.remove('hidden');
    const cards = B.input.army.map((f, i) => { const r = roleOf(f.sp), d = SPECIES[f.sp]; return `<button class="bc ${B.used[i] ? 'used' : ''} ${live && i === this.sel ? 'on' : ''}" data-a="bcard" data-i="${i}" style="--rc:${RARITIES[d.rarity].color}" ${live ? '' : 'disabled'}>${this.pic(f.sp, 44)}<span class="rg">${ROLES[r].glyph}</span><b>${f.lvl}</b></button>`; }).join('');
    el.innerHTML = `<div class="bt"><div class="who"><span class="tag">${live ? 'SIMULATION' : 'REPLAY'}</span> <b>${esc(who)}</b></div><div class="mid"><b id="btime">2:00</b>${starRow(0, 22).replace('class="stars"', 'class="stars" id="bstars"')}<span id="bpct">0%</span></div>
      <div class="ctl">${live ? '<button class="btn small red" data-a="bEnd">End battle</button>' : '<button class="btn small" data-a="bSpeed" id="bspd">×1</button> <button class="btn small" data-a="bClose">Close</button>'}</div></div>
      ${live ? `<div class="bb"><div class="hint" id="bhint">Pick a robot, then tap anywhere outside the red square to land it. Breachers (🛡) go for defences, flyers (✈) cross walls.</div><div class="cards">${cards}</div></div>` : ''}`; this.upd(B); }
  upd(B: Battle) { const t = Math.max(0, (MAX_TICKS - B.tick) * TICK); const e = (id: string) => document.getElementById(id); const tm = e('btime'); if (tm) tm.textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    const p = e('bpct'); if (p) p.textContent = pctOf(B) + '%'; const st = e('bstars'); if (st) { const n = starsOf(B); st.querySelectorAll('i').forEach((x, i) => x.classList.toggle('on', i < n)); }
    document.querySelectorAll('#bhud .bc').forEach((c) => { const i = +(c as HTMLElement).dataset.i!; c.classList.toggle('used', !!B.used[i]); c.classList.toggle('on', i === this.sel && !B.used[i]); }); }
  hideHud() { document.getElementById('bhud')?.classList.add('hidden'); }
  result(r: { stars: number; pct: number }, out: { dT: number; reward: Record<string, number>; first: boolean }, who: string) {
    this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">${r.stars ? 'VICTORY' : 'DEFEAT'} · ${esc(who)}</div><div class="bigstars">${[0, 1, 2].map((i) => `<i class="${i < r.stars ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.35}s">★</i>`).join('')}</div><h1 style="margin:2px 0">${r.pct}% destroyed</h1>
      <p class="desc"><span class="${out.dT >= 0 ? 'good' : 'bad'}">${out.dT >= 0 ? '+' : ''}${out.dT} ✪</span>${out.first ? ` · <b class="good">first win today!</b>` : ''}</p><div class="lootrow">${Object.entries(out.reward).map(([k, n], i) => `<div class="loot" style="animation-delay:${0.9 + i * 0.12}s"><span style="color:${RES[k].color};font-size:22px">${RES[k].icon}</span><b>+${fmt(n)}</b><i>${esc(RES[k].name)}</i></div>`).join('')}</div>
      <div class="row" style="justify-content:center;gap:8px;margin-top:10px"><button class="btn" data-a="warReplay" data-k="hist" data-id="${W.war(this.s).hist[0]?.id || ''}">▶ Watch replay</button><button class="btn gold" data-a="bDone">Continue</button></div>`, { rays: r.stars >= 2 }); }
  // ---------------- actions ----------------
  act(a: string, t: HTMLElement): boolean { const s = this.s, A = this.A, ui = this.ui;
    switch (a) {
      case 'war': ui.openOver('war'); this.refreshNet(); A.audio.play('tap'); return true;
      case 'wtab': this.tab = t.dataset.t as any; ui.renderOver(); A.audio.play('tap'); return true;
      case 'warAttack': A.startAttack(+t.dataset.i!); return true;
      case 'warNext': { const c = this.nextCost(); if ((s.res.credits || 0) < c) { ui.deny('Not enough credits'); return true; } s.res.credits -= c; W.refreshOpps(s, true); this.refreshNet(true); A.audio.play('tap'); ui.renderOver(); return true; }
      case 'warBounty': { const e = W.claimBounty(s, t.dataset.id!); if (e) { A.audio.play('claim'); ui.toast('Bounty claimed', 'good'); A.changed(); ui.renderOver(); } return true; }
      case 'warSeason': { const p = W.claimSeason(s); if (p) { A.audio.play('levelup'); ui.toast(`${esc(p.league)} circle season reward claimed`, 'gold'); A.changed(); ui.renderOver(); } return true; }
      case 'warReplay': { const Wr = W.war(s); const e = t.dataset.k === 'log' ? Wr.log.find((x) => x.id === t.dataset.id) : Wr.hist.find((x) => x.id === t.dataset.id); if (e) { ui.closeModal(); A.replay(e.input, 'look' in e ? (e as any).look : null, e.who); } return true; }
      case 'bcard': this.sel = +t.dataset.i!; A.audio.play('tap'); if (A.battle) this.upd(A.battle.B); return true;
      case 'bEnd': A.endAttack(); return true;
      case 'bSpeed': { const bv = A.world.battle; if (bv) { bv.speed = bv.speed === 1 ? 2 : bv.speed === 2 ? 4 : 1; const b = document.getElementById('bspd'); if (b) b.textContent = '×' + bv.speed; } return true; }
      case 'bClose': A.closeBattle(); return true;
      case 'bDone': ui.closeModal(); A.closeBattle(); ui.openOver('war'); return true;
    }
    return false; }
}
export { botPower, rIdxOf };
