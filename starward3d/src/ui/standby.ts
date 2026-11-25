// Three layers that answer "what now?": the Standby board (whatever is waiting for an order, one tap away), the
// Programme Rank (a patch for every rank, with its reward shown ahead of time and the road ahead), and Happenings
// (the surprise offers). None of it gives advice: it shows what is possible and lets the player choose.
import { ri } from './icons';
import { esc, fmt, fmtTime } from '../core/util';
import * as G from '../core/game';
import * as RK from '../core/rank';
import * as HP from '../core/happen';
import * as W from '../core/war';
import * as LD from '../core/land';
import { hqLevel } from '../core/econ';
import { TECH } from '../data/research';
import { RES } from '../data/resources';
import { BUILDINGS } from '../data/buildings';
import { SORTIES } from '../data/war';
import { RARITIES } from '../data/rarities';
import { patchSVG } from './patch';
import { coreBall } from './daily';
import type { UI } from './ui';
const cost = (r: Record<string, number>) => Object.entries(r).filter(([, n]) => n > 0).map(([k, n]) => `<span class="cost"><span style="color:${RES[k].color}">${ri(k)}</span>${fmt(n)}</span>`).join(' ');
interface Chip { a: string; cls: string; html: string; title: string }
export class Standby {
  private key = ''; private roverAt = 0; private roverOk = false; private flash = 0;
  constructor(private ui: UI) {}
  get s() { return this.ui.app.s; } get A() { return this.ui.app; }
  // ---------------- the Standby board ----------------
  private canRove() { const s = this.s, now = Date.now(); if (now - this.roverAt < 5000) return this.roverOk; this.roverAt = now; this.roverOk = false; if (LD.noGround(s, s.at)) return false;
    for (let cx = 0; cx < LD.NCH && !this.roverOk; cx++) for (let cz = 0; cz < LD.NCH; cz++) { const c = LD.canSurvey(s, s.at, cx, cz); if (c.ok || c.cost) { this.roverOk = true; break; } } return this.roverOk; }
  private labIdle() { const s = this.s; if (G.slotsBusy(s) >= G.slotsTotal(s)) return false; if (!Object.values(s.bases).some((B) => B.items.some((i) => i.b === 'research' && i.lvl > 0))) return false; const L = hqLevel(s);
    return Object.keys(TECH).some((id) => { const t = TECH[id]; return !s.tech[id] && t.req.every((r) => s.tech[r]) && (!t.hq || L >= t.hq); }); }
  chips(): Chip[] { const s = this.s, now = Date.now(), H = HP.hp(s), out: Chip[] = [];
    if (H.cur) { const I = HP.INFO[H.cur.kind]; out.push({ a: 'hap', cls: 'hot', html: `<span>${I.icon}</span>${esc(I.name(H.cur))}<em>${fmtTime((H.cur.ends - now) / 1000)}</em>`, title: 'Something is happening: tap to see' }); }
    for (const b of H.act) if (b.until > now) { const I = HP.INFO[b.kind]; out.push({ a: 'hapInfo', cls: 'on', html: `<span>${I.icon}</span>${esc(I.name(b))}<em>${fmtTime((b.until - now) / 1000)}</em>`, title: 'A bonus is running' }); }
    const idle = G.crewsTotal(s) - G.crewsBusy(s); if (idle > 0) out.push({ a: 'shop', cls: '', html: `${ri('crews', '16px')}${idle} drone${idle > 1 ? 's' : ''} idle`, title: 'Construction drones waiting for work: build or upgrade something' });
    if (this.labIdle()) out.push({ a: 'research', cls: '', html: `<span style="color:${RES.science.color}">${ri('science', '16px')}</span>Lab idle`, title: 'The research lab is free: pick a technology' });
    if (this.ui.land.available()) { const free = LD.maxRovers(s) - s.jobs.filter((j) => j.kind === 'prospect').length; if (free > 0 && this.canRove()) out.push({ a: 'land', cls: '', html: `<span>🛰</span>${free} rover${free > 1 ? 's' : ''} idle`, title: 'Rovers waiting: survey a plot of land' }); }
    if (W.unlocked(s) && W.war(s).sorties >= SORTIES) out.push({ a: 'war', cls: '', html: `<span>⚔</span>${SORTIES} sorties ready`, title: 'Orbital Trials sorties are full: use one so the next can recharge' });
    return out; }
  render() { const el = document.getElementById('standby') || (() => { const d = document.createElement('div'); d.id = 'standby'; document.body.appendChild(d); return d; })(); const A = this.A;
    const show = A.world.mode === 'base' && !this.ui.coach.on && !(A as any).placing && !document.body.classList.contains('landmode') && !this.ui.over; const list = show ? this.chips() : [];
    // rebuild only when the set of chips changes; countdowns tick in place, so a tap is never lost to a redraw
    const shape = list.map((c) => c.a + '|' + c.cls + '|' + c.html.replace(/<em>.*?<\/em>/, '')).join('~');
    if (shape !== this.key) { this.key = shape; el.innerHTML = list.length ? `<b class="sbt">STANDBY</b>${list.map((c) => `<button class="sb ${c.cls}" data-a="${c.a}" title="${esc(c.title)}">${c.html}</button>`).join('')}` : ''; }
    else { const ems = el.querySelectorAll('.sb'); list.forEach((c, i) => { const m = /<em>(.*?)<\/em>/.exec(c.html); const e = ems[i]?.querySelector('em'); if (m && e && e.textContent !== m[1]) e.textContent = m[1]; }); }
    el.classList.toggle('hidden', !list.length); if (!list.length) return;
    // sit just under the goal card (just above it on phones, where the card is at the bottom)
    const o = document.getElementById('obj'); const r = o && !o.classList.contains('hidden') ? o.getBoundingClientRect() : null; const phone = innerWidth <= 720;
    if (phone) { el.style.top = 'auto'; el.style.bottom = (r ? innerHeight - r.top + 6 : 84) + 'px'; } else { el.style.bottom = 'auto'; el.style.top = (r ? r.bottom + 8 : 112) + 'px'; } }
  // ---------------- Programme Rank ----------------
  chipHTML() { const R = RK.rk(this.s); return `<button class="rankc" data-a="rank" id="rankc" title="Programme Rank ${R.lvl}: ${esc(RK.titleOf(R.lvl))}">${patchSVG(R.lvl, 34)}<span class="rbar"><i id="rankbar" style="width:${(RK.progress(this.s) * 100).toFixed(1)}%"></i></span></button>`; }
  updChip() { const b = document.getElementById('rankbar'); if (b) b.style.width = (RK.progress(this.s) * 100).toFixed(1) + '%'; }
  // Esteem earned: a little "+12 ✦" from the badge, and the bar fills
  gained(n: number) { if (n < 1) return; const c = document.getElementById('rankc'); this.updChip(); if (!c) return; const r = c.getBoundingClientRect(); const now = performance.now(); if (now - this.flash < 350) return; this.flash = now;
    this.ui.popText(r.left + r.width / 2, r.bottom + 14, `+${n} ✦`, '#ffd36a'); c.classList.remove('gain'); void c.offsetWidth; c.classList.add('gain'); }
  rankUpHTML(u: RK.RankUp) { const sp = u.core ? this.ui.daily.giftLine(u.core) : '';
    return `<div class="ox muted" style="letter-spacing:.2em">PROGRAMME RANK</div><div class="patchbig">${patchSVG(u.lvl, 132)}</div><h1 style="margin:4px 0 0">${esc(RK.titleOf(u.lvl))}</h1><p class="desc">Rank ${u.lvl}. A new patch for the collection, and a reward for the programme:</p>
      <div class="lootrow">${Object.entries({ ...u.res, dm: u.dm }).filter(([, n]) => n > 0).map(([k, n], i) => `<div class="loot" style="animation-delay:${0.2 + i * 0.15}s"><span style="color:${RES[k].color};font-size:26px">${ri(k)}</span><b>+${fmt(n)}</b><i>${esc(RES[k].name)}</i></div>`).join('')}</div>${sp ? `<div style="animation:zoom .4s .9s both">${sp}</div>` : ''}
      <button class="btn gold" data-a="closeModal" style="min-width:160px;margin-top:12px">Onward</button>`; }
  rankHTML() { const s = this.s, R = RK.rk(s), nx = RK.rewardOf(s, R.lvl + 1), L = hqLevel(s); const left = RK.need(R.lvl) - R.xp;
    const patches = Array.from({ length: R.lvl + 4 }, (_, i) => i + 1).map((r) => `<div class="pt ${r > R.lvl ? 'no' : ''}" title="Rank ${r}: ${esc(RK.titleOf(r))}">${patchSVG(r, 46, r > R.lvl)}<i>${r > R.lvl ? '?' : esc(RK.titleOf(r))}</i></div>`).join('');
    const hq = s.bases.earth.items.find((i) => i.b === 'hq'); const hqMax = BUILDINGS.hq.max;
    const road = hq && hq.lvl < hqMax ? `<div class="tier">THE ROAD AHEAD: MISSION CONTROL ${hq.lvl + 1}</div>${this.ui.hqTiles(hq.lvl + 1)}<div class="go" data-a="rankGoto" data-id="${hq.id}" style="text-align:center">Show me Mission Control →</div>` : '';
    return `<div class="rankm"><button class="ibtn mx" data-a="closeModal">✕</button><div class="ox muted" style="letter-spacing:.2em">PROGRAMME RANK</div>
      <div class="rankhead">${patchSVG(R.lvl, 96)}<div><div class="ox muted" style="letter-spacing:.14em">RANK ${R.lvl}</div><h2 style="margin:2px 0">${esc(RK.titleOf(R.lvl))}</h2><div class="bar" style="margin:6px 0 4px"><i style="width:${(RK.progress(s) * 100).toFixed(1)}%"></i></div><div class="muted" style="font-size:12px">${fmt(R.xp)} / ${fmt(RK.need(R.lvl))} ✦ Esteem · ${fmt(left)} to rank ${R.lvl + 1}</div></div></div>
      <div class="rsec"><div class="tier">AT RANK ${R.lvl + 1}: ${esc(RK.titleOf(R.lvl + 1).toUpperCase())}</div><div class="row" style="flex-wrap:wrap;gap:8px">${cost({ ...nx.res, dm: nx.dm })}${nx.core ? `<span class="cost">${coreBall(nx.core, 16)} ${esc(RARITIES[nx.core].name)} robot core</span>` : ''}</div></div>
      <div class="rsec"><div class="tier">EARNING ESTEEM ✦</div><div class="muted" style="font-size:12.5px;line-height:1.5">Every finished project earns Esteem, and bigger projects earn more: about 5 for a quick job, 20 for five minutes, 65 for an hour, 180 for eight hours. Surveys, land claims, launches, goals, daily missions and collecting all count too.</div></div>
      ${road ? `<div class="rsec">${road}</div>` : ''}<div class="tier" style="margin-top:6px">MISSION PATCHES · ${R.lvl} EARNED</div><div class="patches">${patches}</div><p class="muted" style="font-size:11px;text-align:center">Mission Control level ${L} · lifetime Esteem ${fmt(R.total)}</p></div>`; }
  // ---------------- Happenings ----------------
  hapHTML() { const s = this.s, h = HP.hp(s).cur; if (!h) return '<h1>It has gone</h1><p class="desc">That one drifted away. Another will turn up soon.</p><button class="btn" data-a="closeModal">OK</button>'; const I = HP.INFO[h.kind], left = fmtTime((h.ends - Date.now()) / 1000);
    let body = '', yes = 'Accept';
    switch (h.kind) {
      case 'barge': { const [A] = Object.keys(h.give!), [B] = Object.keys(h.get!); body = `A freighter in orbit has spare ${esc(RES[B].name)} and wants ${esc(RES[A].name)}, at a better rate than any market.<div class="trade">${cost(h.give!)}<span class="arr">→</span>${cost(h.get!)}</div>`; yes = 'Trade'; break; }
      case 'seam': body = `${esc(HP.seamLine(h.r!))}. For ${HP.LAST.seam} minutes, ${esc(RES[h.r!].name)} output gets <b>+100%</b>.`; yes = 'Get to work'; break;
      case 'crew': body = `A contractor's drone crew is passing through. For ${HP.LAST.crew} minutes you have <b>one extra construction drone</b>. Anything it starts, it finishes.`; yes = 'Hire them'; break;
      case 'night': { const n = s.jobs.filter((j) => (j.kind === 'build' || j.kind === 'research') && j.end - Date.now() > 5 * 60e3).length; body = `Volunteers want to work through the night: <b>${Math.round(HP.NIGHT_CUT * 100)}% off the time left</b> on ${n} project${n > 1 ? 's' : ''} being built or researched right now (up to 45 minutes each).`; yes = 'Thank them'; break; }
      case 'lecture': body = `A visiting professor is at the Research Center. Research you start in the next ${HP.LAST.lecture} minutes runs <b>${Math.round(HP.LECTURE * 100)}% faster</b>.`; yes = 'Welcome them'; break;
      case 'cache': body = `A supply pod drifted off course and came down near the spaceport. Finders keepers.<div class="trade">${cost(h.get!)}</div>`; yes = 'Collect'; break;
    }
    return `<div class="ox muted" style="letter-spacing:.2em">HAPPENING · ${left} LEFT</div><div style="font-size:58px;line-height:1;margin:8px 0;animation:zoom .5s">${I.icon}</div><h1 style="margin:0 0 6px">${esc(I.name(h))}</h1><p class="desc">${body}</p>
      <div class="row" style="justify-content:center;gap:10px;margin-top:10px"><button class="btn gold" data-a="hapYes" style="min-width:140px">${esc(yes)}</button><button class="btn" data-a="hapNo">Not now</button></div>`; }
  act(a: string, t: HTMLElement): boolean { const A = this.A, ui = this.ui, s = this.s;
    switch (a) {
      case 'rank': ui.modal(this.rankHTML(), { wide: true }); A.audio.play('tap'); return true;
      case 'hap': ui.modal(this.hapHTML()); A.audio.play('tap'); return true;
      case 'hapNo': ui.closeModal(); return true;
      case 'rankGoto': ui.closeModal(); ui.act('goto', t); return true;
            case 'hapYes': { const r = HP.accept(s); if (!r.ok) { ui.deny(r.why || 'Not now'); return true; } ui.closeModal(); const h = r.h!; A.audio.play(h.kind === 'cache' || h.kind === 'barge' ? 'claim' : 'levelup'); A.esteem(8);
        ui.toast(h.kind === 'barge' ? `Trade done: ${cost(h.get!)}` : h.kind === 'cache' ? `Collected: ${cost(h.get!)}` : h.kind === 'night' ? '🌙 The night shift is on: every running project jumped ahead' : `${HP.INFO[h.kind].icon} ${esc(HP.INFO[h.kind].name(h))} is on`, 'gold'); A.changed(); ui.renderPanel(); this.render(); return true; }
      case 'hapInfo': { const now = Date.now(); for (const b of HP.hp(s).act.filter((x) => x.until > now)) ui.toast(`${HP.INFO[b.kind].icon} ${esc(HP.INFO[b.kind].name(b))}: ${fmtTime((b.until - now) / 1000)} left`, 'good'); return true; }
    }
    return false; }
}
