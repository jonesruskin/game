// GLINT: DOM interface. HUD, bench controls (protractor dial, live value meter, hold-to-grind ring),
// certificate, haggling, market, vault, workshop, codex, settings, toasts.
import { icon } from './icons.js';
import { fmt$, fmtCt, fmtTime, esc, $, $$, dayNumber } from './util.js';
import { SPECIES, SPECIES_IDS, variety, gemName, swatch, RARITY, FAMILY, familyOf } from './species.js';
import { CUTS } from './cuts.js';
import { TIERS, UPGRADES, upLevel, upVal, upNext, MYSTERY, REGIONS, EXPEDITIONS, expeditionCost, orderText, meets, apprenticeCost, trainCost, apprenticeMax, apprenticeTime, ACH, tierCuts, tierSpecies, roughEstimate, rollRough } from './economy.js';
import { STAGES } from './bench.js';
import { roughCarat, perfMax, bestAngles } from './stone.js';
import { Platform } from './platform.js';
import { Save } from './save.js';
import { rng, clamp } from './math.js';

const TABS = [['bench', 'Bench', 'bench'], ['shop', 'Shop', 'shop'], ['market', 'Market', 'market'], ['vault', 'Vault', 'vault'], ['workshop', 'Workshop', 'machine'], ['codex', 'Codex', 'book']];
const rareTag = (r) => (r ? `<span class="rtag" style="--rc:${RARITY[Math.min(4, r + 0)].color}">${RARITY[Math.min(4, r)].name}</span>` : '');
const toneWord = (t) => (t < 0.82 ? 'pale' : t < 0.93 ? 'light' : t < 1.08 ? 'vivid' : t < 1.2 ? 'deep' : 'dark');

export class UI {
  constructor(app) { this.app = app; this.shownMoney = 0; this.toastQ = []; }
  get s() { return this.app.save; }
  init() {
    const hud = $('#hud');
    hud.innerHTML = `<div class="top"><button class="crest" data-a="tier"><span class="crest-ic">${icon('crown')}</span><span class="crest-t"><b id="tierName"></b><i id="repLine"></i></span></button>
      <div class="money" id="money">$0</div><div class="topr"><button class="ibtn" data-a="daily" title="Daily Stone">${icon('cal')}<em class="badge" id="bDaily"></em></button><button class="ibtn" data-a="settings" title="Settings">${icon('cog')}</button></div></div>
      <nav class="nav">${TABS.map(([id, n, ic]) => `<button data-tab="${id}">${icon(ic)}<span>${n}</span><em class="badge" id="b-${id}"></em></button>`).join('')}</nav>`;
    hud.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; this.app.start(); this.app.audio.play('tap');
      if (b.dataset.tab) { const t = b.dataset.tab; if (t === 'bench' || t === 'shop') this.app.setView(t); else if (this.app.screen === t) this.app.closeScreen(); else this.app.openScreen(t); }
      if (b.dataset.a === 'settings') this.settings(); if (b.dataset.a === 'tier') this.app.openScreen('workshop', 'tier'); if (b.dataset.a === 'daily') this.daily(); });
    $('#panel').addEventListener('click', (e) => this.panelClick(e));
    $('#screen').addEventListener('click', (e) => this.screenClick(e));
    $('#modal').addEventListener('click', (e) => this.modalClick(e));
    this.shownMoney = this.s.money; this.money(); this.rep(); this.nav(); this.panel(); this.badges();
  }
  layout() { document.documentElement.style.setProperty('--panel', (this.app.benchL ? this.app.benchL.panel : 320) + 'px'); }
  nav() { const tu = $('#tutor'); if (tu && this.tutStep) tu.style.visibility = (this.tutStep === 'shop') === (this.app.view === 'shop') ? '' : 'hidden'; $$('.nav button').forEach((b) => b.classList.toggle('on', this.app.screen ? b.dataset.tab === this.app.screen : b.dataset.tab === this.app.view)); document.body.dataset.view = this.app.view; document.body.classList.toggle('screen-open', !!this.app.screen); }
  money(pulse) { if (pulse) { const m = $('#money'); m.classList.remove('pulse'); void m.offsetWidth; m.classList.add('pulse'); } }
  rep() { const s = this.s, T = TIERS[s.tier], N = TIERS[s.tier + 1]; $('#tierName').textContent = T.name; $('#repLine').innerHTML = N ? `${icon('star', 'xs')} ${Math.floor(s.rep)} / ${N.rep}` : `${icon('star', 'xs')} ${Math.floor(s.rep)} · Royal Warrant`; $('.crest').classList.toggle('ready', this.app.canTierUp()); }
  badges() { const s = this.s; const set = (id, n) => { const e = $('#b-' + id); if (e) { e.textContent = n || ''; e.style.display = n ? '' : 'none'; } };
    set('shop', s.orders.length); set('vault', s.gems.filter((g) => !s.cases.includes(g.id)).length + s.roughs.length); set('market', s.exped && Date.now() >= s.exped.end ? '!' : ''); set('workshop', this.app.canTierUp() ? '!' : ''); set('codex', '');
    const d = $('#bDaily'); if (d) { d.textContent = s.daily.done ? '' : '1'; d.style.display = s.daily.done ? 'none' : ''; } }
  frame(dt) {
    const m = this.s.money; if (Math.abs(this.shownMoney - m) > 0.5) { this.shownMoney += (m - this.shownMoney) * Math.min(1, dt * 8); if (Math.abs(this.shownMoney - m) < 1) this.shownMoney = m; } $('#money').textContent = fmt$(this.shownMoney);
    this.tickT = (this.tickT || 0) + dt; if (this.tickT > 0.5) { this.tickT = 0; $$('[data-timer]').forEach((el) => { const end = +el.dataset.timer; el.textContent = fmtTime((end - Date.now()) / 1000); }); $$('[data-otimer]').forEach((el) => { const o = this.s.orders.find((x) => x.id === el.dataset.otimer); if (o) el.textContent = fmtTime(o.time); }); $$('[data-staff]').forEach((el) => { const a = this.s.staff.find((x) => x.id === el.dataset.staff); if (a) el.style.width = (a.job ? (a.t / apprenticeTime(a.skill)) * 100 : 0) + '%'; }); if (this.hag) this.hagTick(); }
  }
  toast(text, kind = 'info') { const el = document.createElement('div'); el.className = 'toast ' + kind; el.innerHTML = esc(text); $('#toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 3200); setTimeout(() => el.remove(), 3800); while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove(); }
  meet(text, kind) { const el = $('#meetMsg'); if (!el) return; el.className = 'meetmsg ' + kind; el.textContent = text; void el.offsetWidth; el.classList.add('show'); }
  // ---------------- tutorial coach marks ----------------
  tutor(step) {
    const s = this.s; let el = $('#tutor'); if (!el) { el = document.createElement('div'); el.id = 'tutor'; document.body.appendChild(el); }
    this.tutStep = step; if (s.tut !== 1 || !step) { el.className = ''; return; }
    const T = { crack: ['Your first stone', 'Something sparkles inside this river rock. Tap it to crack it open!'],
      plan: ['Plan the cut', 'The glowing outline is your future gem. Drag it around: bigger means more carats. Then press Start cutting.'],
      pav: ['Find the sweet spot', 'Turn the dial and watch the estimated value. Every stone has its own perfect angle. Then HOLD the grind button and let go when the ring hits the green zone.'],
      crown: ['The crown', 'Same again: dial to the best value, then hold to grind and release in the green.'],
      table: ['The table', 'Last facet. Pick the table size, then grind it.'],
      polish: ['Polish', 'Rub the stone with your finger or mouse until every facet shines.'],
      cert: ['Your first gem!', 'Put it in a display case: customers in your shop will buy it.'],
      shop: ['Your shop', 'Customers browse your cases and buy what they love. Price tags set your markup: higher earns more but sells slower. Now head to the Market and buy more rough!'] };
    const t = T[step]; if (!t) { el.className = ''; return; }
    el.style.visibility = ''; el.className = 'on t-' + step; el.innerHTML = `<b>${t[0]}</b><p>${t[1]}</p>`;
    if (step === 'shop') setTimeout(() => { if (this.s.tut === 1) { this.s.tut = 2; el.className = ''; this.app.persist(); } }, 9000);
  }
  // ---------------- title ----------------
  title(first) {
    const m = $('#modal'); m.className = 'on m-title';
    m.innerHTML = `<div class="titlecard"><div class="logo"><span>GLINT</span></div><div class="tag">A gem-cutting simulator</div><p>${first ? 'Crack open rough stones. Cut them with real light physics. Build a jewellery empire.' : `Welcome back to ${esc(TIERS[this.s.tier].name)}.`}</p><button class="big gold" data-m="start">${first ? 'Open the workshop' : 'Continue'}</button></div>`;
  }
  // ---------------- bench panel ----------------
  panel() { if (this.app.view === 'bench') this.bench(this.app.bench); else this.shopPanel(); }
  bench(b) {
    if (this.app.view !== 'bench') return; const p = $('#panel'); p.className = 'panel bench st-' + b.stage; let h = '';
    const steps = ['Crack', 'Plan', 'Cut', 'Polish', 'Appraise']; const si = { crack: 0, plan: 1, cut: 2, polish: 3, appraise: 4 }[b.stage] ?? -1;
    if (b.stage !== 'empty') h += `<div class="steps">${steps.map((n, i) => `<i class="${i < si ? 'done' : i === si ? 'on' : ''}">${n}</i>`).join('')}</div>`;
    if (b.stage === 'empty') {
      const rs = this.s.roughs; const s = this.s;
      h += `<h2>The bench is free</h2><p class="muted">Pick a rough stone to work on.</p>`; const N = TIERS[s.tier + 1]; if (N) h += `<div class="goal">${icon('crown', 'xs')} Next premises: <b>${esc(N.name)}</b><div class="pbar"><span style="width:${Math.min(100, (s.rep / N.rep) * 100)}%"></span></div><i>★ ${Math.floor(s.rep)} / ${N.rep} · ${fmt$(N.cost)}</i></div>`;
      if (!s.daily.done) h += `<button class="daily-cta" data-p="daily">${icon('cal')}<span><b>Stone of the Day</b><i>The same mystery rock for every cutter, today only</i></span></button>`;
      h += rs.length ? `<div class="rlist">${rs.slice(0, 24).map((r) => this.roughCard(r, 'load')).join('')}</div>` : `<div class="empty-note">No rough in your vault.</div>`;
      h += `<button class="big gold" data-p="market">${icon('market')} Buy rough at the Market</button>`;
    } else if (b.stage === 'crack') {
      h += `<h2>${b.r.src === 'daily' ? 'Stone of the Day' : 'A mystery rock'}</h2><p class="muted">Something glitters inside. Tap the rock to crack it open.</p><div class="pips">${Array.from({ length: b.hitsNeed }, (_, i) => `<i class="${i < b.hits ? 'on' : ''}"></i>`).join('')}</div><div class="hint big-hint">${icon('hammer')} Tap the rock</div>`;
    } else if (b.stage === 'plan') {
      const r = b.r, V = variety(r.sp, r.vid), cuts = this.app.cutsAvailable(); const sc = upVal(this.s, 'loupe'); const pl = upVal(this.s, 'planner');
      h += `<div class="stone-head"><span class="sw" style="background:${swatch(r.sp, r.vid)}"></span><div><h2>${esc(V.name)} ${rareTag(V.rare)}</h2><p class="muted">${fmtCt(roughCarat(r))} rough · ${toneWord(r.tone)} colour · RI ${SPECIES[r.sp].ri}</p></div></div>`;
      h += `<div class="label">Shape</div><div class="chips">${cuts.map((c) => `<button class="chip ${c === b.cut ? 'on' : ''}" data-cut="${c}">${esc(CUTS[c].name)}</button>`).join('')}</div>`;
      const yieldP = (b.planCt / roughCarat(r)) * 100;
      h += `<div class="readout"><div><i>Gem weight</i><b id="pCt">${fmtCt(b.planCt)}</b></div><div><i>Yield</i><b id="pYield">${yieldP.toFixed(0)}%</b></div><div><i>Clarity</i><b id="pClar">${sc >= 1 ? b.planClar.grade : sc >= 0.6 ? '≈ ' + b.planClar.grade : '?'}</b></div><div class="wide"><i>Estimated value</i><b id="pVal" class="gold-t">${fmt$(b.planVal)}</b></div></div>`;
      h += `<p class="hint">${icon('hand', 'xs')} Drag the glowing outline to move your gem inside the rough. Drag outside the stone to look around.${sc >= 0.6 ? ' Circles mark inclusions: keep them outside the outline.' : ''}</p>`;
      h += `<div class="plan-act"><button class="tool" data-p="rotL">${icon('rot')}<span>Turn</span></button><button class="tool" data-p="tip">${icon('flip')}<span>Tip</span></button>${pl ? `<button class="tool" data-p="auto">${icon('auto')}<span>Optimise</span></button>` : ''}<button class="big gold" data-p="cut">${icon('machine')} Start cutting</button></div>`;
    } else if (b.stage === 'cut') {
      const order = [['girdle', 'Girdle'], ['pav', 'Pavilion'], ['crown', 'Crown'], ['table', 'Table']]; const oi = order.findIndex((o) => o[0] === b.sub);
      h += `<div class="substeps">${order.map(([id, n], i) => `<i class="${i < oi ? 'done' : i === oi ? 'on' : ''}">${n}</i>`).join('<b></b>')}</div>`;
      if (b.sub === 'girdle') h += `<h2>Preforming the girdle…</h2><p class="muted">The saw trims the outline of your ${esc(CUTS[b.cut].name)}.</p>`;
      else {
        const sd = b.stageDef();
        h += `<div class="dial-wrap">${this.dialSVG(b)}</div><div class="angle" id="angleVal"></div>
          <div class="meter"><div class="mrow"><i>Brilliance</i><div class="bar"><span id="mBril"></span></div><b id="mBrilT">–</b></div><div class="mrow"><i>Weight</i><b id="mCt" class="r">–</b></div><div class="mrow big"><i>Est. value</i><b id="mVal" class="gold-t r">computing…</b></div></div>
          <p class="advice" id="advice">${esc(sd.hint)}</p>
          <div class="grind-wrap"><button class="grind" id="grindBtn"><svg viewBox="0 0 120 120"><circle class="g-bg" cx="60" cy="60" r="52"/><path class="g-zone" id="gZone"/><circle class="g-prog" id="gProg" cx="60" cy="60" r="52"/></svg><span>HOLD<br>TO GRIND</span></button><div id="meetMsg" class="meetmsg"></div></div>`;
      }
    } else if (b.stage === 'polish') {
      h += `<h2>Polish</h2><p class="muted">Rub the stone to bring each facet to a mirror shine.</p><div class="meter"><div class="mrow"><i>Polish</i><div class="bar"><span id="mPol"></span></div><b id="mPolT">0%</b></div></div><div class="hint big-hint">${icon('hand')} Rub the facets</div><button class="big" data-p="finish">Finish now</button>`;
    } else if (b.stage === 'appraise' && b.result) {
      const g = b.result; h += this.gemActions(g, true);
    }
    p.innerHTML = h; this.bindBench(b); this.benchLive(b);
  }
  roughCard(r, act) {
    const known = r.known; const V = known ? variety(r.sp, r.vid) : null; const th = known ? this.app.roughThumb(r) : '';
    return `<button class="rcard ${known ? '' : 'mystery'}" data-${act}="${r.id}"><span class="rimg">${th ? `<img src="${th}">` : `<i class="rock"></i>`}</span><span class="rtxt"><b>${known ? esc(V.name) : r.src === 'expedition' ? 'Expedition rock' : 'Mystery rock'}</b><i>${known ? fmtCt(roughCarat(r)) + ' · ' + toneWord(r.tone) : 'Crack to reveal'}</i>${known && V.rare ? rareTag(V.rare) : ''}</span></button>`;
  }
  dialSVG(b) {
    const sd = b.stageDef(); const [a0, a1] = sd.range; let ticks = ''; const cx = 150, cy = 150, R = 128;
    for (let a = a0; a <= a1; a += sd.key === 'table' ? 1 : 1) { const t = (a - a0) / (a1 - a0); const ang = Math.PI * (1 - t); const big = a % 5 === 0; const r1 = R - (big ? 14 : 7); ticks += `<line x1="${cx + Math.cos(ang) * R}" y1="${cy - Math.sin(ang) * R}" x2="${cx + Math.cos(ang) * r1}" y2="${cy - Math.sin(ang) * r1}" class="${big ? 'tb' : 'ts'}"/>`; if (big) ticks += `<text x="${cx + Math.cos(ang) * (R - 28)}" y="${cy - Math.sin(ang) * (R - 28) + 4}">${a}${sd.key === 'table' ? '%' : '°'}</text>`; }
    return `<svg class="dial" id="dial" viewBox="0 0 300 165"><path d="M ${cx - R - 10} ${cy} A ${R + 10} ${R + 10} 0 0 1 ${cx + R + 10} ${cy}" class="d-rim"/><g id="dCurve"></g><path id="dBand" class="d-band"/>${ticks}<g id="dNeedle"><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - R + 4}" class="d-needle"/><circle cx="${cx}" cy="${cy}" r="9" class="d-hub"/></g><text x="${cx}" y="${cy - 52}" class="d-label">${sd.name.toUpperCase()} ${sd.key === 'table' ? 'SIZE' : 'ANGLE'}</text></svg>`;
  }
  bindBench(b) {
    const g = $('#grindBtn'); if (g) { const on = (e) => { e.preventDefault(); try { g.setPointerCapture(e.pointerId); } catch (er) {} this.app.start(); b.grindStart(); }; const off = () => b.grindStop(); g.addEventListener('pointerdown', on); g.addEventListener('pointerup', off); g.addEventListener('pointerleave', off); g.addEventListener('pointercancel', off); }
    const d = $('#dial'); if (d) { let drag = false; const setFrom = (e) => { const r = d.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 300 - 150, y = 150 - (e.clientY - r.top) / r.height * 165; let ang = Math.atan2(Math.max(0, y), x); const t = 1 - ang / Math.PI; const sd = b.stageDef(); const v = sd.range[0] + t * (sd.range[1] - sd.range[0]); b.setAngle(Math.round(v * 2) / 2); };
      d.addEventListener('pointerdown', (e) => { drag = true; d.setPointerCapture(e.pointerId); setFrom(e); this.app.audio.play('soft'); }); d.addEventListener('pointermove', (e) => { if (drag) setFrom(e); }); d.addEventListener('pointerup', () => (drag = false)); d.addEventListener('wheel', (e) => { e.preventDefault(); b.setAngle(b.angleOf() + (e.deltaY < 0 ? 0.5 : -0.5)); }, { passive: false }); }
  }
  benchLive(b) {
    if (this.app.view !== 'bench') return;
    if (b.stage === 'plan') { const r = b.r; const sc = upVal(this.s, 'loupe'); const e = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; }; e('pCt', fmtCt(b.planCt)); e('pYield', ((b.planCt / roughCarat(r)) * 100).toFixed(0) + '%'); e('pClar', sc >= 1 ? b.planClar.grade : sc >= 0.6 ? '≈ ' + b.planClar.grade : '?'); e('pVal', fmt$(b.planVal)); }
    if (b.stage === 'cut' && b.sub !== 'girdle') {
      const sd = b.stageDef(); const a = b.angleOf(); const [a0, a1] = sd.range; const t = (a - a0) / (a1 - a0); const ang = t * 180 - 90;
      const nd = $('#dNeedle'); if (nd) nd.setAttribute('transform', `rotate(${ang} 150 150)`);
      const av = $('#angleVal'); if (av) av.innerHTML = `${a.toFixed(1)}${sd.key === 'table' ? '%' : '°'} <small>${b.P[sd.u] > 0.02 ? 'locked' : 'drag the dial'}</small>`;
      const cv = b.curveAt(a); const lvl = upVal(this.s, 'refract');
      if (cv) { $('#mBril').style.width = clamp(cv.ratio * 100, 0, 100) + '%'; $('#mBrilT').textContent = Math.round(clamp(cv.ratio, 0, 1) * 100) + '%'; $('#mCt').textContent = fmtCt(cv.ct); $('#mVal').textContent = fmt$(cv.v);
        const adv = $('#advice'); if (adv && !b.grinding) { let tip = sd.hint; const near = b.curve.ready && Math.abs(a - b.curve.best.a) < (sd.key === 'table' ? 2.5 : 1.1);
          if (b.curve.ready && lvl >= 1 && !near) { const lo = a < b.curve.best.a; tip = sd.id === 'pav' ? (lo ? 'Too shallow: light leaks out of the back (a "window"). Steepen it.' : 'Too steep: the centre goes dark (extinction). Go shallower.') : sd.id === 'crown' ? (lo ? 'A little more crown angle will add fire.' : 'Too steep: the crown is eating weight and brightness.') : (lo ? 'A bigger table would brighten the stone.' : 'Table too big: the stone loses fire.'); }
          else if (near) tip = 'Sweet spot! Hold the button to grind.'; else if (!b.curve.ready) tip = 'The lab is tracing light through your stone…'; adv.textContent = tip; } }
      // sweet-spot band (refractometer) + value curve
      const band = $('#dBand'); if (band) { if (lvl >= 1 && b.curve && b.curve.ready) { const best = b.curve.best.a; const w = sd.key === 'table' ? 3 : 1.2 / lvl; const arc = (x0, x1, R) => { const p = (v) => { const tt = (v - a0) / (a1 - a0); const an = Math.PI * (1 - tt); return [150 + Math.cos(an) * R, 150 - Math.sin(an) * R]; }; const s0 = p(x0), s1 = p(x1); return `M ${s0[0]} ${s0[1]} A ${R} ${R} 0 0 1 ${s1[0]} ${s1[1]}`; }; band.setAttribute('d', arc(Math.max(a0, best - w), Math.min(a1, best + w), 134)); } else band.setAttribute('d', ''); }
      const cg = $('#dCurve'); if (cg && b.curve && lvl >= 2 && b.curve.ready && !cg.dataset.done) { cg.dataset.done = 1; const mx = Math.max(...b.curve.pts.map((p) => p.v)); cg.innerHTML = b.curve.pts.map((p) => { const tt = (p.a - a0) / (a1 - a0); const an = Math.PI * (1 - tt); const r0 = 100, r1 = 100 - (p.v / mx) * 34; return `<line x1="${150 + Math.cos(an) * r0}" y1="${150 - Math.sin(an) * r0}" x2="${150 + Math.cos(an) * r1}" y2="${150 - Math.sin(an) * r1}" class="d-curve"/>`; }).join(''); }
      // grind ring
      const u = b.P[sd.u] || 0; const win = upVal(this.s, 'machine'); const C = 2 * Math.PI * 52; const f = clamp(u / 1.3, 0, 1); const gp = $('#gProg'); if (gp) { gp.style.strokeDasharray = `${C * f} ${C}`; gp.classList.toggle('over', u > 1 + win); gp.classList.toggle('near', Math.abs(u - 1) <= win); }
      const gz = $('#gZone'); if (gz && !gz.dataset.done) { gz.dataset.done = 1; const z0 = (1 - win) / 1.3, z1 = (1 + win) / 1.3; const pt = (k) => { const an = -Math.PI / 2 + k * Math.PI * 2; return [60 + Math.cos(an) * 52, 60 + Math.sin(an) * 52]; }; const p0 = pt(z0), p1 = pt(z1); gz.setAttribute('d', `M ${p0[0]} ${p0[1]} A 52 52 0 0 1 ${p1[0]} ${p1[1]}`); }
      const gb = $('#grindBtn'); if (gb) { gb.classList.toggle('active', b.grinding); gb.disabled = !!b.stageDone; }
    }
    if (b.stage === 'polish') { const pc = clamp(b.polishPct || 0, 0, 1); const el = $('#mPol'); if (el) el.style.width = pc * 100 + '%'; const t = $('#mPolT'); if (t) t.textContent = Math.round(pc * 100) + '%'; }
    if (b.stage === 'crack') { $$('.pips i').forEach((el, i) => el.classList.toggle('on', i < b.hits)); }
  }
  panelClick(e) {
    const t = e.target.closest('button'); if (!t) return; const b = this.app.bench, A = this.app; A.start(); A.audio.play('tap');
    if (t.dataset.cut) b.setCut(t.dataset.cut); if (t.dataset.load) A.loadRough(t.dataset.load);
    const p = t.dataset.p; if (p === 'rotL') b.rotateGem(1); if (p === 'tip') b.tipGem(); if (p === 'auto') b.optimise(); if (p === 'cut') b.startCut(); if (p === 'finish') b.finish(); if (p === 'market') A.openScreen('market'); if (p === 'daily') A.playDaily();
    if (p === 'next') { b.clear(); A.midgame(); }
    if (t.dataset.g) this.gemAct(t.dataset.g, t.dataset.act, t.dataset.o);
    if (t.dataset.sp === 'markup') return; if (t.dataset.order) this.orderPick(t.dataset.order);
  }
  // actions for a finished / owned gem
  gemActions(g, onBench) {
    const s = this.s; const o = this.app.matchingOrder(g); const caseFree = s.cases.includes(null); const inCase = s.cases.includes(g.id);
    let h = `<div class="gem-sum"><img src="${this.app.thumb(g)}"><div><h2>${esc(gemName(g.sp, g.vid))}</h2><p class="muted">${esc(CUTS[g.cut].name)} · ${fmtCt(g.ct)} · ${g.cutG} · ${g.clarity}</p><b class="gold-t big-v">${fmt$(g.value)}</b></div></div>`;
    if (o) h += `<button class="big gold" data-g="${g.id}" data-act="order" data-o="${o.id}">${icon('ribbon')} Deliver to ${esc(o.who)} · ${fmt$(o.reward)}</button>`;
    if (!inCase) h += `<button class="big ${o ? '' : 'gold'}" data-g="${g.id}" data-act="case" ${caseFree ? '' : 'disabled'}>${icon('shop')} ${caseFree ? `Display in a case · sells for ~${fmt$(g.value * s.markup)}` : 'All cases are full'}</button>`;
    h += `<button class="big" data-g="${g.id}" data-act="dealer">${icon('coin')} Sell to the dealer now · ${fmt$(this.app.dealerPrice(g))}</button>`;
    if (onBench) h += `<button class="big ghost" data-p="next">${icon('vault')} Keep in vault & take a new stone</button>`;
    else h += `<button class="big ghost" data-g="${g.id}" data-act="cert">${icon('info')} View certificate</button>`;
    return h;
  }
  gemAct(id, act, oid) {
    const A = this.app; const g = A.gemById(id); if (!g) return; const onBench = A.bench.result && A.bench.result.id === id;
    if (act === 'case') { if (A.toCase(g)) { this.toast(`${gemName(g.sp, g.vid)} is on display`, 'good'); if (onBench) { A.bench.clear(); A.midgame(); } this.closeModal(); } }
    if (act === 'dealer') { A.sellToDealer(g); if (onBench) { A.bench.clear(); A.midgame(); } this.closeModal(); }
    if (act === 'order') { const o = this.s.orders.find((x) => x.id === oid); if (o) { A.fulfil(o, g); if (onBench) A.bench.clear(); this.closeModal(); } }
    if (act === 'cert') this.certificate(g, false);
    if (act === 'remove') { const i = this.s.cases.indexOf(g.id); if (i >= 0) A.fromCase(i); this.closeModal(); }
  }
  // ---------------- shop HUD ----------------
  shopPanel() {
    const s = this.s; const p = $('#panel'); p.className = 'panel shop';
    const n = s.cases.filter((x) => x).length;
    p.innerHTML = `<div class="shop-bar"><div class="mk"><i>Price tags</i><input type="range" id="markup" min="0.8" max="2" step="0.05" value="${s.markup}"><b id="mkv">${Math.round(s.markup * 100)}%</b></div><div class="shop-info"><span>${icon('gem', 'xs')} ${n}/${s.cases.length} cases</span><span>${icon('clerk', 'xs')} ${upVal(s, 'clerk') ? 'Clerk on duty' : 'No clerk'}</span></div></div>
      <div class="orders">${s.orders.length ? s.orders.map((o) => this.orderCard(o)).join('') : `<div class="ord-empty">${icon('ribbon')} Commissions from VIP clients appear here.</div>`}</div>
      <div class="sales">${s.sales.slice(0, 4).map((x) => `<div><span>${esc(x.n)}</span><b>+${fmt$(x.p)}</b></div>`).join('')}</div>`;
    const mk = $('#markup'); mk.addEventListener('input', () => { s.markup = +mk.value; $('#mkv').textContent = Math.round(s.markup * 100) + '%'; });
    mk.addEventListener('change', () => this.app.persist());
  }
  orderCard(o) { const has = this.s.gems.find((g) => meets(o, g)); return `<button class="order ${has ? 'ready' : ''}" data-order="${o.id}"><span class="o-who">${icon('ribbon', 'xs')} ${esc(o.who)}</span><span class="o-req">${esc(orderText(o))}</span><span class="o-pay"><b>${fmt$(o.reward)}</b> +${o.rep}★ <i data-otimer="${o.id}">${fmtTime(o.time)}</i></span>${has ? '<em>Ready to deliver</em>' : ''}</button>`; }
  orderPick(id) { const o = this.s.orders.find((x) => x.id === id); if (!o) return; const gs = this.s.gems.filter((g) => meets(o, g)); const m = this.openModal('order');
    m.innerHTML = `<div class="card"><h2>${icon('ribbon')} ${esc(o.who)}</h2><p class="muted">${esc(o.role)} would like:</p><p class="req">${esc(orderText(o))}</p><p>Reward: <b class="gold-t">${fmt$(o.reward)}</b> and <b>${o.rep}★</b> reputation · expires in <span data-otimer="${o.id}">${fmtTime(o.time)}</span></p>
    ${gs.length ? `<div class="label">Matching gems in your vault</div><div class="glist">${gs.map((g) => `<button class="gcard" data-g="${g.id}" data-act="order" data-o="${o.id}"><img src="${this.app.thumb(g)}"><b>${esc(gemName(g.sp, g.vid))}</b><i>${fmtCt(g.ct)} · ${g.cutG}</i></button>`).join('')}</div>` : `<p class="muted">You have nothing that fits yet. Buy ${o.sp ? esc(SPECIES[o.sp].name) : 'suitable'} rough at the Market and cut it${o.cut ? ' as a ' + esc(CUTS[o.cut].name) : ''}.</p>`}
    <div class="row"><button class="big ghost" data-m="close">Close</button>${o.sp && SPECIES[o.sp].tier <= this.s.tier + 1 ? `<button class="big" data-m="market">Find rough</button>` : ''}</div></div>`; }
  caseMenu(i) {
    const s = this.s; const id = s.cases[i]; const m = this.openModal('case');
    if (id) { const g = this.app.gemById(id); m.innerHTML = `<div class="card"><h2>Case ${i + 1}</h2>${this.gemActionsCase(g)}</div>`; return; }
    const avail = s.gems.filter((g) => !s.cases.includes(g.id)).sort((a, b) => b.value - a.value);
    m.innerHTML = `<div class="card"><h2>Case ${i + 1} is empty</h2>${avail.length ? `<div class="label">Choose a gem to display</div><div class="glist">${avail.map((g) => `<button class="gcard" data-case="${i}" data-gid="${g.id}"><img src="${this.app.thumb(g)}"><b>${esc(gemName(g.sp, g.vid))}</b><i>${fmtCt(g.ct)} · ${fmt$(g.value)}</i></button>`).join('')}</div>` : `<p class="muted">No cut gems in your vault. Head to the bench!</p>`}<button class="big ghost" data-m="close">Close</button></div>`;
  }
  gemActionsCase(g) { const o = this.app.matchingOrder(g); return `<div class="gem-sum"><img src="${this.app.thumb(g)}"><div><h3>${esc(gemName(g.sp, g.vid))}</h3><p class="muted">${esc(CUTS[g.cut].name)} · ${fmtCt(g.ct)} · ${g.cutG} · ${g.clarity}</p><p>Value ${fmt$(g.value)} · tagged <b class="gold-t">${fmt$(this.app.shop.priceOf(g))}</b></p></div></div>${o ? `<button class="big gold" data-g="${g.id}" data-act="order" data-o="${o.id}">Deliver to ${esc(o.who)} · ${fmt$(o.reward)}</button>` : ''}<button class="big" data-g="${g.id}" data-act="remove">Take out of the case</button><button class="big" data-g="${g.id}" data-act="dealer">Sell to dealer · ${fmt$(this.app.dealerPrice(g))}</button><button class="big ghost" data-g="${g.id}" data-act="cert">Certificate</button>`; }
  // ---------------- haggle ----------------
  haggle(h) {
    const el = $('#haggle'); this.hag = h; if (!h) { el.className = ''; el.innerHTML = ''; return; }
    el.className = 'on'; el.innerHTML = `<div class="hg"><div class="hg-who">${icon('people', 'xs')} ${esc(h.c.name)} at case ${this.s.cases.indexOf(h.g.id) + 1}</div><div class="hg-line">“${esc(h.c.bubble ? h.c.bubble.text : '')}”</div><div class="hg-nums"><span>Tag ${fmt$(h.price)}</span><b>Offer ${fmt$(h.offer)}</b></div><div class="hg-pat"><span id="hgPat"></span></div><div class="row"><button data-h="accept" class="gold">Accept</button><button data-h="counter">Counter ${fmt$(Math.round((h.offer + h.price) / 2))}</button><button data-h="decline" class="ghost">Decline</button></div></div>`;
    el.onclick = (e) => { const b = e.target.closest('button'); if (b) { this.app.audio.play('tap'); this.app.shop.answerHaggle(b.dataset.h); } };
    this.hagMax = h.c.wait;
  }
  hagTick() { const el = $('#hgPat'); if (el && this.hag) el.style.width = clamp(this.hag.c.wait / (this.hagMax || 1), 0, 1) * 100 + '%'; }
  // ---------------- auction ----------------
  aucNext() { const p = this.auc.price; const raw = Math.max(10, p * 0.08); const mag = Math.pow(10, Math.floor(Math.log10(raw))); const inc = Math.ceil(raw / mag) * mag; return Math.round((p + inc) / inc) * inc; }
  aucJoin() { const A = this.app.auctionLot(); if (!A || A.done) return; const R = rng(parseInt(A.lot.id, 36) & 0xffff); const names = ['Mme. Vautrin', 'Mr. Osei', 'The Antwerp Syndicate', 'Count Lisowski'];
    this.auc = { lot: A.lot.id, price: Math.round(A.est * 0.22), leader: 'the floor', t: 8, next: 1.2, log: ['Bidding opens.'], call: '', rivals: names.slice(0, 3).map((n) => ({ n, max: A.est * R.range(0.38, 0.78) })) };
    this.app.audio.play('stamp'); this.app.save.auction.live = true; this.renderScreen(); }
  aucBid() { const au = this.auc; if (!au) return; const p = this.aucNext(); if (this.s.money < p) { this.toast('Not enough money for that bid', 'bad'); this.app.audio.play('deny'); return; } au.price = p; au.leader = 'you'; au.t = Math.max(au.t, 6); au.call = ''; au.log.unshift(`You bid ${fmt$(p)}`); this.app.audio.play('buy'); this.aucDraw(); }
  auctionTick(dt) {
    const au = this.auc, S = this.s.auction; if (!au || !S || !S.live) return; au.t -= dt; au.next -= dt;
    if (au.next <= 0) { au.next = 0.9 + Math.random() * 1.6; const p = this.aucNext(); const r = au.rivals.filter((x) => x.max >= p && au.leader !== x.n).sort(() => Math.random() - 0.5)[0]; if (r && Math.random() < 0.75) { au.price = p; au.leader = r.n; au.t = Math.max(au.t, 5 + Math.random() * 2); au.call = ''; au.log.unshift(`${r.n} bids ${fmt$(p)}`); this.app.audio.play('tap'); } }
    const call = au.t < 1.2 ? 'Going twice…' : au.t < 2.8 ? 'Going once…' : ''; if (call !== au.call) { au.call = call; if (call) this.app.audio.play('soft'); }
    if (au.t <= 0) { S.live = false; const won = au.leader === 'you'; this.app.audio.play('stamp');
      if (won) { if (this.app.spend(au.price)) { const r = { ...S.lot, paid: au.price, known: true }; delete r.price; this.app.addRough(r); S.done = `SOLD to you for ${fmt$(au.price)}! The rough is in your vault.`; this.app.audio.play('fanfare'); } else S.done = 'You could not cover your bid. The lot went to the underbidder.'; }
      else S.done = au.leader === 'the floor' ? 'No sale.' : `Sold to ${au.leader} for ${fmt$(au.price)}.`;
      this.auc = null; this.app.persist(); if (this.app.screen === 'market') this.renderScreen(); return; }
    this.aucDraw();
  }
  aucDraw() { const au = this.auc; if (!au) return; const e = (id) => document.getElementById(id); if (!e('aucPrice')) return; e('aucPrice').textContent = fmt$(au.price); e('aucLead').textContent = au.leader === 'you' ? 'You lead!' : au.leader + ' leads'; e('aucLead').className = au.leader === 'you' ? 'lead' : ''; e('aucClock').style.width = Math.max(0, (au.t / 8) * 100) + '%'; e('aucCall').textContent = au.call || ''; e('aucBid').textContent = 'Bid ' + fmt$(this.aucNext()); e('aucLog').innerHTML = au.log.slice(0, 5).map((x) => `<div>${esc(x)}</div>`).join(''); }
  // ---------------- certificate ----------------
  certificate(g, fresh) {
    const m = this.openModal('cert'); const V = variety(g.sp, g.vid); const no = (parseInt(g.id, 36) % 900000) + 100000;
    const stamps = []; if (g.cutG === 'Ideal') stamps.push(['IDEAL CUT', 'gold']); if (g.record) stamps.push(['NEW RECORD', 'red']); if (V.rare >= 2) stamps.push([RARITY[V.rare].name.toUpperCase(), 'blue']); if (g.clarity === 'FL') stamps.push(['FLAWLESS', 'green']); if (g.daily) stamps.push(['STONE OF THE DAY', 'red']);
    const row = (k, v) => `<div><i>${k}</i><b>${v}</b></div>`;
    m.innerHTML = `<div class="cert ${fresh ? 'fresh' : ''}"><div class="cert-in"><div class="c-head"><span>GLINT GEMMOLOGICAL LABORATORY</span><i>Report Nº ${no}</i></div>
      <div class="c-main"><div class="c-img"><img src="${this.app.thumb(g, 192)}"></div><div class="c-name"><h2>${esc(V.name)}</h2><p>${esc(CUTS[g.cut].name)} · ${fmtCt(g.ct)}</p></div></div>
      <div class="c-grid">${row('Cut grade', g.cutG)}${row('Clarity', g.clarity)}${row('Colour', g.colorG)}${row('Polish', g.polishG)}${row('Brilliance', Math.round(clamp(g.brill, 0, 1) * 100) + '%')}${row('Fire', g.fire > 0.09 ? 'Blazing' : g.fire > 0.05 ? 'Lively' : 'Soft')}${row('Species', esc(SPECIES[g.sp].name))}${row('Origin', esc(SPECIES[g.sp].origin))}</div>
      <div class="c-val"><i>Appraised value</i><b id="certVal">${fresh ? '$0' : fmt$(g.value)}</b></div>
      <div class="stamps">${stamps.map(([t, c], i) => `<span class="stamp ${c}" style="--d:${0.9 + i * 0.35}s">${t}</span>`).join('')}</div>
      <p class="c-fact">${esc(SPECIES[g.sp].fact)}</p></div>
      <div class="c-act">${fresh ? this.gemActions(g, true) : this.gemActions(g, false)}</div></div>`;
    if (fresh) { const A = this.app; A.audio.play('paper'); const el = $('#certVal'); const t0 = performance.now(); const dur = 1300; const tick = () => { const k = Math.min(1, (performance.now() - t0) / dur); const e = 1 - Math.pow(1 - k, 3); el.textContent = fmt$(g.value * e); if (Math.random() < 0.5) A.audio.play('coin'); if (k < 1) requestAnimationFrame(tick); else { A.audio.play('stamp'); el.classList.add('pop'); } }; setTimeout(tick, 350); stamps.forEach((_, i) => setTimeout(() => A.audio.play('stamp'), 900 + i * 350 + 50)); }
  }
  tierUp(t) { const T = TIERS[t]; const m = this.openModal('tier'); m.innerHTML = `<div class="card tiercard"><div class="laurel">${icon('crown')}</div><h1>${esc(T.name)}</h1><p>${esc(T.blurb)}</p><ul><li>${T.cases} display cases</li><li>Wealthier clients (budgets up to ~${fmt$(T.budget * 4)})</li>${T.cuts.length ? `<li>New cuts: ${T.cuts.map((c) => esc(CUTS[c].name)).join(', ')}</li>` : ''}<li>New species at the Market: ${SPECIES_IDS.filter((s) => SPECIES[s].tier === t + 1).map((s) => esc(SPECIES[s].name)).join(', ') || 'the rarest of all'}</li></ul><button class="big gold" data-m="close">Magnificent</button></div>`; }
  offline(r) { const m = this.openModal('offline'); m.innerHTML = `<div class="card"><h2>Welcome back</h2><p class="muted">You were away for ${fmtTime(r.sec)}.</p>${r.sold ? `<p>${icon('clerk', 'xs')} Your clerk sold <b>${r.sold}</b> gem${r.sold > 1 ? 's' : ''} for <b class="gold-t">${fmt$(r.earned)}</b>.</p>` : ''}${r.made ? `<p>${icon('machine', 'xs')} Your apprentices cut <b>${r.made}</b> gem${r.made > 1 ? 's' : ''}.</p>` : ''}${r.exped ? `<p>${icon('map', 'xs')} Your expedition is back with a haul of rough.</p>` : ''}${!upVal(this.s, 'clerk') ? `<p class="hint">Tip: hire a Sales Clerk in the Workshop and your shop keeps selling while you're away.</p>` : ''}<button class="big gold" data-m="close">Back to work</button></div>`; }
  daily() { const s = this.s; const m = this.openModal('daily'); const r = this.app.dailyRough();
    m.innerHTML = `<div class="card"><h2>${icon('cal')} Stone of the Day</h2><p>Every cutter in the world gets the same mystery rock today. Crack it, cut it, and see what you can make of it.</p>${s.daily.done ? `<p>Your best today: <b class="gold-t">${fmt$(s.daily.best)}</b></p><p class="muted">A new stone arrives tomorrow.</p><button class="big" data-m="share">Copy my result</button>` : `<button class="big gold" data-m="dailyGo">Crack today's stone</button>`}<button class="big ghost" data-m="close">Close</button></div>`; }
  settings() { const st = this.s.settings; const m = this.openModal('settings');
    m.innerHTML = `<div class="card"><h2>${icon('cog')} Settings</h2><label class="set">Sound effects<input type="range" min="0" max="1" step="0.05" value="${st.sfx}" data-set="sfx"></label><label class="set">Music<input type="range" min="0" max="1" step="0.05" value="${st.music}" data-set="music"></label>
      <div class="set">Graphics <div class="chips">${['auto', 'high', 'low'].map((q) => `<button class="chip ${st.quality === q ? 'on' : ''}" data-q="${q}">${q}</button>`).join('')}</div></div>
      <label class="set">Auto-restock cases with your best gems<input type="checkbox" data-set="autoStock" ${st.autoStock ? 'checked' : ''}></label>
      <p class="muted small">Every gem is ray-traced in real time: light refracts, reflects and splits into colour exactly as it does in a real stone. Glint ${'v1.0'} · fonts: Limelight, Marcellus, Jost (OFL).</p><div class="row"><button class="big ghost" data-m="reset">Reset progress</button><button class="big gold" data-m="close">Done</button></div></div>`;
    m.querySelectorAll('[data-set]').forEach((el) => el.addEventListener('input', () => { const k = el.dataset.set; st[k] = el.type === 'checkbox' ? el.checked : +el.value; this.app.applySettings(); this.app.persist(); })); }
  openModal(kind) { const m = $('#modal'); m.className = 'on m-' + kind; m.innerHTML = ''; return m; }
  modalOpen() { return $('#modal').classList.contains('on'); }
  closeModal() { const m = $('#modal'); m.className = ''; m.innerHTML = ''; if (this.app.bench.stage === 'appraise') this.bench(this.app.bench); }
  modalClick(e) {
    const t = e.target.closest('button'); const A = this.app; if (!t) { if (e.target.id === 'modal' && !$('#modal').classList.contains('m-title') && !$('#modal').classList.contains('m-cert')) this.closeModal(); return; } A.start(); A.audio.play('tap');
    const m = t.dataset.m; if (m === 'close') this.closeModal(); if (m === 'start') { this.closeModal(); A.start(); if (!this.s.tut) this.app.tutorialStart && this.app.tutorialStart(); }
    if (m === 'market') { this.closeModal(); A.openScreen('market'); } if (m === 'dailyGo') { this.closeModal(); A.playDaily(); }
    if (m === 'share') { const txt = `💎 Glint · Stone of the Day #${dayNumber() % 10000}: I cut it into a ${fmt$(this.s.daily.best)} gem. Can you beat it?`; try { navigator.clipboard.writeText(txt); this.toast('Copied to clipboard', 'good'); } catch (er) {} }
    if (m === 'reset') { if (t.dataset.sure) { Save.reset(); location.reload(); } else { t.dataset.sure = 1; t.textContent = 'Tap again to erase everything'; } }
    if (t.dataset.q) { this.s.settings.quality = t.dataset.q; A.applySettings(); A.layout(); this.settings(); A.persist(); }
    if (t.dataset.g) this.gemAct(t.dataset.g, t.dataset.act, t.dataset.o);
    if (t.dataset.case !== undefined && t.dataset.gid) { const g = A.gemById(t.dataset.gid); if (g) { A.toCase(g, +t.dataset.case); this.closeModal(); } }
  }
  // ---------------- full screens ----------------
  screen(id, arg) { const el = $('#screen'); if (!id) { el.className = ''; el.innerHTML = ''; return; } el.className = 'on ' + id; this.scr = id; this.scrArg = arg || this.scrTab?.[id]; this.renderScreen(); }
  refreshScreen() { if (this.app.screen) this.renderScreen(); if (this.app.view === 'shop' && !this.app.screen) this.shopPanel(); this.badges(); this.rep(); }
  renderScreen() {
    const el = $('#screen'); const id = this.app.screen; if (!id) return; const scroll = el.querySelector('.scr-body') ? el.querySelector('.scr-body').scrollTop : 0;
    let h = `<div class="scr"><div class="scr-head"><h1>${{ market: 'Rough Market', vault: 'Vault', workshop: 'Workshop', codex: 'Codex' }[id]}</h1><button class="ibtn" data-s="close">${icon('x')}</button></div>`;
    if (id === 'market') h += this.marketHTML(); if (id === 'vault') h += this.vaultHTML(); if (id === 'workshop') h += this.workshopHTML(); if (id === 'codex') h += this.codexHTML();
    el.innerHTML = h + '</div>'; const b = el.querySelector('.scr-body'); if (b) b.scrollTop = scroll;
  }
  tabs(id, list, cur) { this.scrTab = this.scrTab || {}; return `<div class="tabs">${list.map(([k, n]) => `<button class="${k === cur ? 'on' : ''}" data-tab2="${id}:${k}">${n}</button>`).join('')}</div>`; }
  marketHTML() {
    const s = this.s; const tab = this.scrArg && ['dealer', 'mystery', 'exped', 'auction'].includes(this.scrArg) ? this.scrArg : 'mystery'; let h = this.tabs('market', [['mystery', 'Mystery Rocks'], ['dealer', 'Rough Dealer'], ['exped', 'Expeditions'], ['auction', 'Auction House']], tab) + '<div class="scr-body">';
    h += `<div class="cap">${icon('vault', 'xs')} Vault ${this.app.vaultUsed()} / ${this.app.vaultCap()}</div>`;
    if (tab === 'mystery') {
      h += `<p class="muted">Unknown rocks. Most hold common crystal; a lucky few hide treasures. Crack them at the bench.</p><div class="bins">`;
      for (const b of MYSTERY) { const lock = b.tier > s.tier; h += `<div class="bin ${lock ? 'lock' : ''}"><div class="bin-art"><i class="rock big"></i><i class="rock"></i><i class="rock sm"></i></div><h3>${esc(b.name)}</h3><p class="muted">${esc(b.desc)}</p>${lock ? `<b class="lockt">${icon('crown', 'xs')} ${esc(TIERS[b.tier].name)}</b>` : `<button class="big gold" data-buybin="${b.id}">Buy · ${fmt$(b.price)}</button><button class="big" data-buybin="${b.id}" data-andcrack="1">Buy & crack now</button>`}</div>`; }
      h += `</div>`;
      if (s.adGift.day !== dayNumber() || s.adGift.n < 3) h += Platform.adsAvailable ? `<button class="big ad" data-adgift="1">${icon('play')} Watch an ad: free ${esc(MYSTERY[Math.min(s.tier, 1)].name)} rock</button>` : '';
    } else if (tab === 'dealer') {
      h += `<p class="muted">Rough you can see before you buy. New stock in <b data-timer="${s.dealer.next}">${fmtTime((s.dealer.next - Date.now()) / 1000)}</b>.${upVal(s, 'loupe') >= 1 ? '' : ' Upgrade your Inclusion Scope to spot flaws.'}</p><div class="glist dealer">`;
      s.dealer.stock.forEach((r, i) => { const V = variety(r.sp, r.vid); const ct = roughCarat(r); h += `<div class="dcard ${r.sold ? 'sold' : ''}"><img src="${this.app.roughThumb(r)}"><b>${esc(V.name)}</b>${rareTag(V.rare)}<i>${fmtCt(ct)} · ${toneWord(r.tone)} · ${upVal(s, 'loupe') >= 1 ? (r.clarity < 0.25 ? 'clean' : r.clarity < 0.5 ? 'lightly included' : 'included') : 'clarity ?'}</i>${r.sold ? '<em>Sold</em>' : `<button class="gold" data-buyd="${i}">${fmt$(r.price)}</button>`}</div>`; });
      h += `</div>`;
    } else if (tab === 'auction') {
      const A = this.app.auctionLot();
      if (!A) h += `<div class="locked-note">${icon('crown')} The Auction House admits dealers from the <b>Boutique</b> upward.</div>`;
      else { const r = A.lot, V = variety(r.sp, r.vid), ct = roughCarat(r); const live = this.auc && this.auc.lot === r.id;
        h += `<div class="auction"><div class="au-lot"><img src="${this.app.roughThumb(r, 160)}"><div><i class="muted small">LOT ${(parseInt(r.id, 36) % 900) + 100}</i><h2>${esc(V.name)} ${rareTag(V.rare)}</h2><p class="muted">${fmtCt(ct)} rough · ${toneWord(r.tone)} colour · ${r.clarity < 0.25 ? 'remarkably clean' : r.clarity < 0.5 ? 'lightly included' : 'included'}</p><p>Catalogue estimate: <b class="gold-t">${fmt$(A.est * 0.35)} – ${fmt$(A.est * 0.7)}</b></p></div></div>`;
        if (A.done) h += `<p class="au-res">${esc(A.done)}</p><p class="muted">Next lot in <b data-timer="${A.next}">${fmtTime((A.next - Date.now()) / 1000)}</b></p>`;
        else if (!live) h += `<button class="big gold" data-aucjoin="1">${icon('hand')} Join the bidding · opens at ${fmt$(Math.round(A.est * 0.22))}</button><p class="muted small">Rival dealers bid too. Every bid resets the hammer clock. Highest bid when the hammer falls wins.</p>`;
        else { const au = this.auc; h += `<div class="au-live"><div class="au-cur"><i>Current bid</i><b id="aucPrice">${fmt$(au.price)}</b><span id="aucLead">${au.leader === 'you' ? 'You lead!' : esc(au.leader) + ' leads'}</span></div><div class="pbar lg"><span id="aucClock" style="width:${(au.t / 8) * 100}%"></span></div><div id="aucCall" class="au-call">${esc(au.call || '')}</div><button class="big gold" data-aucbid="1" id="aucBid">Bid ${fmt$(this.aucNext())}</button><div class="au-log" id="aucLog">${au.log.slice(0, 5).map((x) => `<div>${esc(x)}</div>`).join('')}</div></div>`; }
        h += `</div>`; }
    } else if (tab === 'exped') {
      if (s.tier < 1) h += `<div class="locked-note">${icon('crown')} Expeditions open with the <b>Corner Shop</b>.</div>`;
      else if (s.exped) { const reg = REGIONS.find((r) => r.id === s.exped.region); const done = Date.now() >= s.exped.end; h += `<div class="exp-live"><h3>${icon('map')} ${esc(reg.name)}</h3><p>${s.exped.n} stones expected</p>${done ? `<button class="big gold" data-collect="1">Collect the haul</button>` : `<p>Back in <b data-timer="${s.exped.end}">${fmtTime((s.exped.end - Date.now()) / 1000)}</b></p>${Platform.adsAvailable ? `<button class="big ad" data-adrush="1">${icon('play')} Watch an ad: halve the remaining time</button>` : ''}`}</div>`; }
      else { h += `<p class="muted">Send a prospector to a famous gem field. They keep digging while you're away.</p>`; for (const reg of REGIONS) { const lock = reg.tier > s.tier; h += `<div class="region ${lock ? 'lock' : ''}"><h3>${icon('map', 'xs')} ${esc(reg.name)}</h3><p class="muted">${reg.species.map((x) => esc(SPECIES[x].name)).join(' · ')}</p>${lock ? `<b class="lockt">${esc(TIERS[reg.tier].name)}</b>` : `<div class="row wrap">${EXPEDITIONS.map((e, i) => `<button class="small" data-exp="${reg.id}:${i}">${e.min < 60 ? e.min + ' min' : e.min / 60 + ' h'} · ${e.n} stones · ${fmt$(expeditionCost(s.tier, e))}</button>`).join('')}</div>`}</div>`; } }
    }
    return h + '</div>';
  }
  vaultHTML() {
    const s = this.s; const tab = this.scrArg === 'roughs' ? 'roughs' : 'gems'; let h = this.tabs('vault', [['gems', `Cut gems (${s.gems.length})`], ['roughs', `Rough (${s.roughs.length})`]], tab) + '<div class="scr-body">';
    h += `<div class="cap">${icon('vault', 'xs')} ${this.app.vaultUsed()} / ${this.app.vaultCap()} slots</div>`;
    if (tab === 'gems') { const gs = s.gems.slice().sort((a, b) => b.value - a.value); const un = gs.filter((g) => !s.cases.includes(g.id)); if (un.length > 1) h += `<button class="big" data-sellall="1">${icon('coin')} Sell all ${un.length} gems not on display to the dealer · ${fmt$(un.reduce((a, g) => a + this.app.dealerPrice(g), 0))}</button>`; h += gs.length ? `<div class="glist">${gs.map((g) => `<button class="gcard big ${s.cases.includes(g.id) ? 'incase' : ''}" data-vg="${g.id}"><img src="${this.app.thumb(g)}"><b>${esc(gemName(g.sp, g.vid))}</b><i>${esc(CUTS[g.cut].name)} · ${fmtCt(g.ct)}</i><i>${g.cutG} · ${g.clarity}</i><span class="gold-t">${fmt$(g.value)}</span>${s.cases.includes(g.id) ? '<em>On display</em>' : ''}${this.app.matchingOrder(g) ? '<em class="ord">Fits a commission</em>' : ''}</button>`).join('')}</div>` : `<div class="empty-note">No cut gems yet.</div>`; }
    else h += s.roughs.length ? `<div class="rlist wide">${s.roughs.map((r) => this.roughCard(r, 'vr')).join('')}</div>` : `<div class="empty-note">No rough. Visit the Market.</div>`;
    return h + '</div>';
  }
  workshopHTML() {
    const s = this.s; const tab = ['tools', 'shop', 'staff', 'tier'].includes(this.scrArg) ? this.scrArg : 'tools'; let h = this.tabs('workshop', [['tools', 'Tools'], ['shop', 'Shop'], ['staff', 'Staff'], ['tier', 'Premises']], tab) + '<div class="scr-body">';
    const up = (id) => { const U = UPGRADES[id]; const lv = upLevel(s, id); const n = upNext(s, id); return `<div class="up"><span class="up-ic">${icon(U.icon)}</span><div class="up-t"><b>${esc(U.name)}</b><i>${esc(U.levels[lv].label)}</i><p class="muted">${esc(U.desc)}</p><div class="lv">${U.levels.map((_, i) => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}</div></div>${n ? `<button class="${s.money >= n.cost ? 'gold' : ''}" data-up="${id}"><small>${esc(n.label)}</small>${fmt$(n.cost)}</button>` : '<b class="maxed">MAX</b>'}</div>`; };
    if (tab === 'tools') h += ['hammer', 'loupe', 'refract', 'machine', 'polisher', 'planner'].map(up).join('');
    if (tab === 'shop') h += ['lights', 'decor', 'ads', 'vault'].map(up).join('');
    if (tab === 'staff') { h += up('clerk'); h += `<h3 class="sec">Apprentices <small>${s.staff.length}/${apprenticeMax(s.tier)}</small></h3><p class="muted">Apprentices cut stones from your vault on their own (cheapest rough first), using the angles in your recipe book. Train them to cut better.</p>`;
      for (const a of s.staff) h += `<div class="up staff"><span class="up-ic">${icon('clerk')}</span><div class="up-t"><b>${esc(a.name)}</b><i>Skill ${a.skill}/10 · ${a.made} gems cut</i><div class="pbar"><span data-staff="${a.id}"></span></div><p class="muted">${a.job ? 'Cutting ' + (a.job.known ? esc(gemName(a.job.sp, a.job.vid)) : 'a mystery rock') : s.roughs.length ? 'Picking up a stone…' : 'Waiting for rough in the vault'}</p></div>${a.skill < 10 ? `<button data-train="${a.id}" class="${s.money >= trainCost(a.skill) ? 'gold' : ''}"><small>Train</small>${fmt$(trainCost(a.skill))}</button>` : '<b class="maxed">MASTER</b>'}</div>`;
      if (s.staff.length < apprenticeMax(s.tier)) h += `<button class="big ${s.money >= apprenticeCost(s.staff.length) ? 'gold' : ''}" data-hire="1">${icon('plus')} Hire an apprentice · ${fmt$(apprenticeCost(s.staff.length))}</button>`; else if (s.tier < 4) h += `<p class="muted">Bigger premises allow more apprentices.</p>`; }
    if (tab === 'tier') { const T = TIERS[s.tier], N = TIERS[s.tier + 1]; h += `<div class="tierbox"><div class="tb-cur"><i>Current premises</i><h2>${esc(T.name)}</h2><p class="muted">${esc(T.blurb)}</p></div>`;
      if (N) { const rp = Math.min(1, s.rep / N.rep); h += `<div class="tb-next"><i>Next</i><h2>${esc(N.name)}</h2><p class="muted">${esc(N.blurb)}</p><ul><li>${N.cases} display cases</li><li>Richer clients</li>${N.cuts.length ? `<li>${N.cuts.map((c) => esc(CUTS[c].name)).join(', ')} cuts</li>` : ''}<li>${SPECIES_IDS.filter((x) => SPECIES[x].tier === s.tier + 2).map((x) => esc(SPECIES[x].name)).join(', ')}</li></ul><div class="label">Reputation ${Math.floor(s.rep)} / ${N.rep}</div><div class="pbar lg"><span style="width:${rp * 100}%"></span></div><button class="big ${this.app.canTierUp() && s.money >= N.cost ? 'gold' : ''}" data-tierup="1" ${this.app.canTierUp() ? '' : 'disabled'}>${this.app.canTierUp() ? `Move in · ${fmt$(N.cost)}` : `Need ${Math.ceil(N.rep - s.rep)} more reputation`}</button><p class="muted small">Earn reputation by selling well-cut gems from your cases and fulfilling commissions.</p></div>`; }
      else h += `<p>You hold the Royal Warrant. Chase legendary stones and fill the Codex!</p>`; h += `</div>`; }
    return h + '</div>';
  }
  codexHTML() {
    const s = this.s; const tab = ['gems', 'ach', 'hall'].includes(this.scrArg) ? this.scrArg : 'gems'; const total = SPECIES_IDS.reduce((a, x) => a + SPECIES[x].vars.length, 0);
    let h = this.tabs('codex', [['gems', `Gems ${Object.keys(s.codex).length}/${total}`], ['hall', 'Hall of Fame'], ['ach', `Achievements ${Object.keys(s.ach).length}/${ACH.length}`]], tab) + '<div class="scr-body">';
    if (tab === 'gems') for (const sp of SPECIES_IDS) { const S = SPECIES[sp]; const lock = S.tier > s.tier + 1; h += `<div class="cx-sp ${lock ? 'lock' : ''}"><div class="cx-h"><h3>${esc(S.name)}</h3><span class="muted small">RI ${S.ri} · dispersion ${S.disp} · hardness ${S.h} · ${esc(S.origin)}</span></div><div class="cx-row">${S.vars.map((v) => { const c = s.codex[sp + ':' + v.id]; return `<div class="cx ${c ? 'got' : ''}" style="--sw:${swatch(sp, v.id)}"><i class="cx-sw"></i><b>${c ? esc(v.name) : '???'}</b><span>${c ? (c.best ? 'best ' + fmt$(c.best) : 'found') : RARITY[Math.min(4, v.rare || 0)].name}</span></div>`; }).join('')}</div>${s.codex[sp + ':' + S.vars[0].id] ? `<p class="fact">${esc(S.fact)}</p>` : ''}</div>`; }
    if (tab === 'hall') h += s.hall.length ? `<div class="glist">${s.hall.map((g, i) => `<div class="gcard big"><em class="rank">#${i + 1}</em><img src="${this.app.thumb(g)}"><b>${esc(gemName(g.sp, g.vid))}</b><i>${esc(CUTS[g.cut].name)} · ${fmtCt(g.ct)} · ${g.cutG}</i><span class="gold-t">${fmt$(g.value)}</span></div>`).join('')}</div>` : `<div class="empty-note">Your finest gems will be remembered here.</div>`;
    if (tab === 'ach') h += `<div class="achs">${ACH.map((a) => `<div class="ach ${s.ach[a.id] ? 'got' : ''}">${icon(s.ach[a.id] ? 'trophy' : 'star')}<div><b>${esc(a.name)}</b><i>${esc(a.desc)}</i></div><span>${fmt$(a.reward)}</span></div>`).join('')}</div>`;
    return h + '</div>';
  }
  screenClick(e) {
    const t = e.target.closest('button'); if (!t) return; const A = this.app, s = this.s; A.start(); A.audio.play('tap');
    if (t.dataset.s === 'close') A.closeScreen();
    if (t.dataset.tab2) { const [id, k] = t.dataset.tab2.split(':'); this.scrTab[id] = k; this.scrArg = k; this.renderScreen(); }
    if (t.dataset.buybin) { const b = MYSTERY.find((x) => x.id === t.dataset.buybin); const r = A.buyMystery(b); if (r) { if (t.dataset.andcrack) A.loadRough(r.id); else { this.toast(`${b.name} rock added to your vault`, 'good'); this.renderScreen(); } } }
    if (t.dataset.buyd !== undefined) { const r = A.buyDealer(+t.dataset.buyd); this.renderScreen(); if (r && A.bench.stage === 'empty') this.toast('Tap Bench to start cutting it', 'info'); }
    if (t.dataset.exp) { const [rid, i] = t.dataset.exp.split(':'); A.startExpedition(REGIONS.find((r) => r.id === rid), EXPEDITIONS[+i]); }
    if (t.dataset.collect) A.collectExpedition();
    if (t.dataset.aucjoin) this.aucJoin(); if (t.dataset.aucbid) this.aucBid();
    if (t.dataset.adrush) A.rewarded(() => { const x = s.exped; if (x) { x.end = Date.now() + (x.end - Date.now()) / 2; A.persist(); this.renderScreen(); } });
    if (t.dataset.adgift) A.rewarded(() => { const d = dayNumber(); if (s.adGift.day !== d) s.adGift = { day: d, n: 0 }; s.adGift.n++; const b = MYSTERY[Math.min(s.tier, 1)]; const r = rollRough(rng((Math.random() * 1e9) | 0), { tier: b.tier, luck: b.luck, src: 'mystery', known: false }); r.paid = 0; A.addRough(r); this.toast('Free rock added to your vault', 'good'); A.persist(); this.renderScreen(); });
    if (t.dataset.vg) { const g = A.gemById(t.dataset.vg); if (g) { const m = this.openModal('gem'); m.innerHTML = `<div class="card">${s.cases.includes(g.id) ? this.gemActionsCase(g) : this.gemActions(g, false)}<button class="big ghost" data-m="close">Close</button></div>`; } }
    if (t.dataset.vr) A.loadRough(t.dataset.vr);
    if (t.dataset.sellall) { if (t.dataset.sure) A.sellAllUnlisted(); else { t.dataset.sure = 1; t.textContent = 'Tap again to confirm'; } }
    if (t.dataset.up) A.buyUpgrade(t.dataset.up); if (t.dataset.hire) A.hire(); if (t.dataset.train) { const a = s.staff.find((x) => x.id === t.dataset.train); if (a) A.train(a); } if (t.dataset.tierup) A.tierUp();
  }
}
