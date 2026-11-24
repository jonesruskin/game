// Daily screens: the calendar, missions + bonus chest, achievements, the daily core spin (a reel that slows onto
// your prize), supply drop reveals and the "while you were away" report.
import { esc, fmt, fmtTime } from '../core/util';
import * as G from '../core/game';
import * as D from '../core/daily';
import { SPECIES, SPECIES_ORDER } from '../data/species';
import { RARITIES, RARITY_ORDER } from '../data/rarities';
import type { UI } from './ui';
const IC: Record<string, string> = { credits: '<span class="ic cr">C</span>', cells: '<span class="ic ce">⚡</span>', dm: '<span class="ic dm">◆</span>' };
const resList = (r: Record<string, number>) => Object.entries(r).filter(([, n]) => n > 0).map(([k, n]) => `<span class="cost">${IC[k] || ''}${fmt(n)}</span>`).join(' ');
const coreBall = (rarity: string, size = 34) => `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle at 40% 35%, #fff, ${RARITIES[rarity].color} 45%, ${RARITIES[rarity].color}55 70%, transparent 72%);vertical-align:middle"></span>`;
export class DailyUI {
  tab: 'calendar' | 'missions' | 'ach' = 'calendar';
  constructor(private ui: UI) {}
  get s() { return this.ui.app.s; } get app() { return this.ui.app; }
  // ---------------- HUD buttons ----------------
  hudHTML() { const s = this.s, at = D.attention(s), dd = D.daily(s); const dot = (on: boolean) => (on ? '<i class="rdot"></i>' : '');
    const R = (s as any).raid; const raidChip = R && R.eta ? `<button class="chip raid" data-a="raid">⚠ Swarm ${fmtTime((R.eta - Date.now()) / 1000)}</button>` : '';
    return `${raidChip}<button class="ibtn" data-a="daily" title="Daily rewards">📅${dot(at.day || at.missions || at.ach)}</button><button class="ibtn" data-a="spin" title="Free daily core">🎁${dot(at.spin)}</button><button class="chip ${dd.drops ? 'hot' : ''}" data-a="drop" title="Supply drop">📦 <span id="dropT">${dd.drops ? `Open${dd.drops > 1 ? ' ×' + dd.drops : ''}!` : fmtTime((dd.drop - Date.now()) / 1000)}</span></button>`; }
  // ---------------- the daily overlay ----------------
  overHTML() { const s = this.s, dd = D.daily(s), at = D.attention(s);
    const tabs = [['calendar', 'Calendar', at.day], ['missions', 'Missions', at.missions], ['ach', 'Achievements', at.ach]] as [string, string, boolean][];
    let body = '';
    if (this.tab === 'calendar') { const can = D.canClaimDay(s);
      body = `<div class="row" style="justify-content:center;gap:18px;margin-bottom:10px"><div class="ox" style="font-size:18px">🔥 ${dd.streak} day streak</div><div class="sub" style="margin:0">Best ${dd.best} · ${dd.total} days in all${dd.cycle ? ` · cycle ${dd.cycle + 1}` : ''}</div></div>
        <p class="sub" style="text-align:center">Rewards grow every day. Miss a day and the calendar simply waits for you: it never resets.</p><div class="cal">${Array.from({ length: 28 }, (_, i) => { const r = D.dayReward(s, i); const done = i < dd.day, today = i === dd.day && can;
          const big = r.core ? coreBall(r.core, 30) : r.decor ? '<span style="font-size:26px">🌟</span>' : r.res.dm && !r.res.credits && !r.res.cells ? `<span style="font-size:22px">◆</span>` : '';
          return `<div class="day ${done ? 'done' : ''} ${today ? 'today' : ''} ${D.SPECIAL[i] ? 'special' : ''}" ${today ? 'data-a="claimDay"' : ''}><b>Day ${i + 1}</b>${big}<span class="dr">${resList(r.res)}</span>${r.label ? `<span class="lbl">${esc(r.label)}</span>` : ''}${done ? '<span class="tick">✓</span>' : ''}</div>`; }).join('')}</div>
        ${can ? `<div class="row" style="justify-content:center;margin-top:12px"><button class="btn gold" data-a="claimDay">Claim day ${dd.day + 1}</button>${this.app.platform.adsAvailable ? '<button class="btn" data-a="claimDayAd">▶ Watch an ad: double it</button>' : ''}</div>` : `<p class="sub" style="text-align:center;margin-top:12px">Come back tomorrow for day ${dd.day + 1}.</p>`}`; }
    else if (this.tab === 'missions') { D.refreshMissions(s);
      body = `<p class="sub" style="text-align:center">New missions every day. Finish all three for the bonus chest.</p><div class="bots" style="max-width:520px;margin:0 auto">${dd.missions.map((m, i) => { const p = Math.min(m.n, D.mProgress(s, m)), ok = p >= m.n, cl = dd.mClaimed[i];
          return `<div class="botc" style="grid-template-columns:1fr auto"><div><b>${esc(m.text)}</b><div class="bar" style="margin:6px 0 4px"><i style="width:${(p / m.n) * 100}%"></i></div><div class="meta">${fmt(p)} / ${fmt(m.n)} · reward ${resList(m.reward)}</div></div>${cl ? '<span class="sub">✓ Done</span>' : `<button class="btn ${ok ? 'gold' : ''} small" data-a="claimMission" data-i="${i}" ${ok ? '' : 'disabled'}>Claim</button>`}</div>`; }).join('')}
        <div class="botc chest ${D.bonusReady(s) ? 'ready' : ''}" style="grid-template-columns:54px 1fr auto"><div style="font-size:36px;text-align:center">🧰</div><div><b>Bonus chest</b><div class="meta">Dark Matter, Power Cells and a chance of an Advanced or Elite core</div></div>${dd.bonus ? '<span class="sub">✓ Opened</span>' : `<button class="btn ${D.bonusReady(s) ? 'gold' : ''} small" data-a="claimBonus" ${D.bonusReady(s) ? '' : 'disabled'}>Open</button>`}</div></div>`; }
    else { body = `<div class="bots" style="max-width:620px;margin:0 auto">${D.ACHS.map((a) => { const t = D.achTier(s, a), v = a.stat(s), max = t >= a.tiers.length; const goal = a.tiers[Math.min(t, a.tiers.length - 1)];
        return `<div class="botc" style="grid-template-columns:44px 1fr auto"><div style="font:700 16px Oxanium;text-align:center;color:${['#9aa7b8', '#cd7f32', '#c0c8d4', '#ffd36a', '#7af7ff'][t]}">${['☆', '★', '★★', '★★★', '✦'][t]}</div><div><b>${esc(a.name)}</b> <span class="sub">tier ${Math.min(t + 1, a.tiers.length)}/${a.tiers.length}</span><div class="bar" style="margin:5px 0 3px"><i style="width:${max ? 100 : Math.min(100, (v / goal) * 100)}%"></i></div><div class="meta">${fmt(v)} / ${fmt(goal)} ${esc(a.unit)}</div></div>
          ${max ? '<span class="sub">Complete</span>' : `<button class="btn ${D.achReady(s, a) ? 'gold' : ''} small" data-a="claimAch" data-id="${a.id}" ${D.achReady(s, a) ? '' : 'disabled'}>${IC.dm}${D.ACH_DM[t]}</button>`}</div>`; }).join('')}</div>`; }
    return `<div class="head"><h1>Daily</h1><button class="ibtn" data-a="close">✕</button></div><div class="tabs">${tabs.map(([k, n, dot]) => `<button class="tab ${this.tab === k ? 'on' : ''}" data-a="dtab" data-t="${k}">${n}${dot ? ' <i class="rdot" style="position:static;display:inline-block"></i>' : ''}</button>`).join('')}</div><div class="body">${body}</div>`; }
  // ---------------- reveals ----------------
  giftLine(g: any) { if (!g) return ''; const r = SPECIES[g.sp].rarity; return `<div class="gift" style="--rc:${RARITIES[r].color}">${coreBall(r, 40)}<span><b style="color:${RARITIES[r].color}">${RARITIES[r].name} core!</b><br><span class="sub" style="margin:0">${g.core ? (G.itemsOf(this.s, 'assembly').some((i) => i.lvl > 0) ? 'Booting in the Assembly Bay' : 'Waits for your Assembly Bay') : 'Joined your crew'}</span></span></div>`; }
  dropReveal(r: { res: Record<string, number>; gift: any }) { const items = Object.entries(r.res).map(([k, n], i) => `<div class="loot" style="animation-delay:${0.25 + i * 0.22}s">${IC[k].replace('class="ic', 'style="width:38px;height:38px;font-size:18px" class="ic')}<b>+${fmt(n)}</b></div>`).join('');
    this.ui.modal(`<div class="ox sub" style="letter-spacing:.2em">SUPPLY DROP</div><div style="font-size:64px;line-height:1;margin:6px 0;animation:zoom .5s">📦</div><div class="lootrow">${items}</div>${r.gift ? `<div style="animation:zoom .4s ${0.3 + Object.keys(r.res).length * 0.22}s both">${this.giftLine(r.gift)}</div>` : ''}<button class="btn gold" data-a="closeModal" style="min-width:160px;margin-top:12px">Nice!</button>`, true); }
  // the spin: a reel of cores that decelerates onto the prize
  spinReveal(r: { rarity: string; sp: string; core: boolean }) { const pool = SPECIES_ORDER.filter((k) => ['standard', 'advanced', 'elite'].includes(SPECIES[k].rarity)); const N = 34, win = 29; const cards: string[] = [];
    for (let i = 0; i < N; i++) { const sp = i === win ? r.sp : pool[Math.floor(Math.random() * pool.length)]; const rr = SPECIES[sp].rarity; cards.push(`<div class="rc" style="--rc:${RARITIES[rr].color}"><img src="${this.app.studio.bot(sp)}"></div>`); }
    this.ui.modal(`<div class="ox sub" style="letter-spacing:.2em">DAILY CORE</div><div class="reel"><div class="strip" id="strip">${cards.join('')}</div><div class="needle"></div></div><div id="spinRes" style="min-height:96px"></div><button class="btn gold hidden" id="spinOk" data-a="closeModal" style="min-width:160px">Collect</button>`);
    const strip = document.getElementById('strip')!; const cw = 96; requestAnimationFrame(() => { strip.style.transition = 'transform 4.2s cubic-bezier(.12,.62,.16,1)'; const box = strip.parentElement!.clientWidth; strip.style.transform = `translateX(${-(win * cw) + box / 2 - cw / 2}px)`; });
    let last = 0; const tick = () => { const m = new DOMMatrix(getComputedStyle(strip).transform); const idx = Math.floor(-m.m41 / cw); if (idx !== last) { last = idx; this.app.audio.play('tap'); } };
    const iv = window.setInterval(tick, 30); window.setTimeout(() => { clearInterval(iv); const d = SPECIES[r.sp], rc = RARITIES[d.rarity]; this.app.audio.play(RARITY_ORDER.indexOf(d.rarity) >= 1 ? 'levelup' : 'claim');
      document.getElementById('spinRes')!.innerHTML = `<h1 style="color:${rc.color};margin:10px 0 2px">${esc(d.name)}</h1><div class="rar" style="color:${rc.color}">${rc.name}${this.s.dex[r.sp] && Date.now() - this.s.dex[r.sp] < 6000 ? ' · NEW SPECIES' : ''}</div><p class="sub">${!r.core ? 'It joined your crew.' : G.itemsOf(this.s, 'assembly').some((i) => i.lvl > 0) ? 'Its core is booting in the Assembly Bay.' : 'Its core waits for your Assembly Bay (Commander level 4).'}</p>`;
      document.getElementById('spinOk')!.classList.remove('hidden'); }, 4300); }
  offlineReport(away: number, sum: { credits: number; bays: number; ready: number; cores: number; built: number }) { const at = D.attention(this.s); const lines: string[] = [];
    if (sum.credits >= 1) lines.push(`${IC.credits} <b>${fmt(sum.credits)}</b> credits waiting in ${sum.bays} bay${sum.bays > 1 ? 's' : ''}`);
    if (sum.ready) lines.push(`${IC.cells} <b>${sum.ready}</b> fabricator recipe${sum.ready > 1 ? 's' : ''} ready to harvest`);
    if (sum.built) lines.push(`🏗 <b>${sum.built}</b> construction${sum.built > 1 ? 's' : ''} finished`); if (sum.cores) lines.push(`🤖 <b>${sum.cores}</b> core${sum.cores > 1 ? 's' : ''} booted and ready`);
    if (at.drop) lines.push('📦 A supply drop has landed'); if (at.day) lines.push("📅 Today's calendar reward is waiting"); if (at.spin) lines.push('🎁 Your free daily core is ready');
    if (!lines.length) return false;
    this.ui.modal(`<div class="ox sub" style="letter-spacing:.2em">WELCOME BACK</div><h1>While you were away</h1><p class="sub">${fmtTime(away / 1000)} in orbit. Your crew kept working.</p><div class="report">${lines.map((l) => `<div>${l}</div>`).join('')}</div>${sum.credits >= 1 || sum.ready ? '<button class="btn gold" data-a="collectAll" style="min-width:180px">Collect everything</button>' : `<button class="btn gold" data-a="closeModal">Let's go</button>`}`, true); return true; }
  // ---------------- actions ----------------
  act(a: string, t: HTMLElement): boolean { const s = this.s, A = this.app, ui = this.ui;
    switch (a) {
      case 'daily': D.refreshMissions(s); ui.openOver('daily'); A.audio.play('tap'); return true;
      case 'dtab': this.tab = t.dataset.t as any; ui.renderOver(); A.audio.play('tap'); return true;
      case 'claimDay': case 'claimDayAd': { const go = (double: boolean) => { const before = { ...s.res }; const r = D.claimDay(s); if (!r) return; if (double) G.give(s, r.res); A.audio.play('claim'); A.changed(); ui.renderOver(); ui.renderHud();
          const gained: Record<string, number> = {}; for (const k of ['credits', 'cells', 'dm'] as const) { const d = s.res[k] - before[k]; if (d > 0) gained[k] = d; }
          ui.modal(`<div class="ox sub" style="letter-spacing:.2em">DAY ${r.day + 1}</div><h1>Daily reward</h1><div class="rewards">${resList(gained)}</div>${this.giftLine(r.gift)}${r.decor ? '<div class="gift"><span style="font-size:36px">🌟</span><span><b>Starlight Arch</b><br><span class="sub" style="margin:0">An exclusive decoration: place it from Shop → Decor</span></span></div>' : ''}<p class="sub">🔥 ${D.daily(s).streak} day streak</p><button class="btn gold" data-a="closeModal" style="min-width:160px">Thanks!</button>`, true); };
        if (a === 'claimDayAd') A.platform.rewarded(() => A.audio.setMuted(true)).then((ok) => { A.audio.setMuted(A.platform.muted()); go(ok); }); else go(false); return true; }
      case 'claimMission': { const m = D.claimMission(s, +(t.dataset.i || 0)); if (m) { A.audio.play('claim'); const rc = t.getBoundingClientRect(); for (const k of Object.keys(m.reward)) ui.flyTo(k as any, rc.left + rc.width / 2, rc.top); A.changed(); ui.renderOver(); } return true; }
      case 'claimBonus': { const r = D.claimBonus(s); if (r) { A.audio.play('levelup'); A.changed(); ui.renderOver(); ui.modal(`<div class="ox sub" style="letter-spacing:.2em">ALL MISSIONS DONE</div><div style="font-size:60px;line-height:1">🧰</div><h1>Bonus chest</h1><div class="rewards">${resList(r.res)}</div>${this.giftLine(r.gift)}<button class="btn gold" data-a="closeModal" style="min-width:160px">Awesome!</button>`, true); } return true; }
      case 'claimAch': { const r = D.claimAch(s, t.dataset.id || ''); if (r) { A.audio.play('claim'); ui.toast(`${r.a.name} tier ${r.tier + 1}: +${r.dm} Dark Matter`, 'gold'); A.changed(); ui.renderOver(); } return true; }
      case 'spin': { if (!D.canSpin(s)) { if (A.platform.adsAvailable && D.daily(s).adSpin !== D.dateKey()) { ui.modal(`<h1>Daily core</h1><p class="desc">You have used today's free spin. Watch a short ad for one more?</p><div class="row" style="justify-content:center"><button class="btn" data-a="closeModal">No thanks</button><button class="btn gold" data-a="spinAd">▶ Watch ad</button></div>`); } else ui.toast(`Your next free core is ready tomorrow`, ''); return true; }
        const r = D.spin(s); if (r) { A.changed(); this.spinReveal(r as any); } return true; }
      case 'spinAd': ui.closeModal(); A.platform.rewarded(() => A.audio.setMuted(true)).then((ok) => { A.audio.setMuted(A.platform.muted()); if (!ok) return; const r = D.spin(s, true); if (r) { A.changed(); this.spinReveal(r as any); } }); return true;
      case 'drop': { const r = D.openDrop(s); if (!r) { ui.toast(`The next supply drop lands in ${fmtTime((D.daily(s).drop - Date.now()) / 1000)}`, ''); return true; } A.audio.play('harvest'); A.changed(); this.dropReveal(r); return true; }
      case 'collectAll': { let n = 0, c = 0; for (const it of G.itemsOf(s, 'bay')) n += G.collectBay(s, it); for (const it of G.itemsOf(s, 'fab')) c += G.harvest(s, it); ui.closeModal(); A.audio.play('collect', n); if (n) ui.toast(`Collected ${fmt(n)} credits${c ? ` and ${fmt(c)} Power Cells` : ''}`, 'gold'); A.changed(); return true; }
    }
    return false; }
}
