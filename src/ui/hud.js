// In-match HUD (DOM). Updates only what changed each frame.
import { ABILITIES, ULTS } from '../data/abilities.js';
import { drawMinimap } from '../game/render.js';
import { esc } from '../util.js';

export class HUD {
  constructor(root, touchRoot, input) { this.root = root; this.touch = touchRoot; this.input = input; this.cache = {}; this.annT = 0; this.hintQ = []; }
  mount(m, isTouch) {
    this.m = m; this.isTouch = isTouch; this.cache = {};
    this.root.innerHTML = `
      <div class="vign" id="vign"></div>
      <div class="tl"><button class="pausebtn" id="pauseBtn">II</button><div class="pill" id="alive">👥 12</div><div class="pill" id="kills">💥 0</div></div>
      <div class="storm" id="storm"></div>
      <canvas class="mm" id="mm" width="300" height="300"></canvas>
      <div class="feed" id="feed"></div>
      <div class="ann" id="ann"></div>
      <div class="hint hidden" id="hint"></div>
      <div class="swap hidden" id="swap"></div>
      <div class="bar ${isTouch ? 'hidden' : ''}" id="bar">
        <div class="slot" id="s0"><span class="key">Q</span><span class="ic"></span><b class="lv"></b><div class="nm"></div><div class="cd"></div></div>
        <div class="slot ult" id="s2"><span class="key">R</span><span class="ic"></span><div class="cd"></div></div>
        <div class="slot" id="s1"><span class="key">E</span><span class="ic"></span><b class="lv"></b><div class="nm"></div><div class="cd"></div></div>
      </div>`;
    this.root.classList.remove('hidden');
    this.touch.classList.toggle('hidden', !isTouch);
    this.mm = this.root.querySelector('#mm').getContext('2d');
    this.$ = (id) => this.root.querySelector('#' + id);
    this.root.querySelector('#pauseBtn').addEventListener('click', () => this.onPause && this.onPause());
    this.root.querySelector('#pauseBtn').addEventListener('touchstart', (e) => { e.stopPropagation(); }, { passive: true });
    this.$('swap').addEventListener('click', (e) => { const b = e.target.closest('[data-slot]'); if (b) { this.input.swapReq = +b.dataset.slot; } });
    this.$('swap').addEventListener('touchstart', (e) => { const b = e.target.closest('[data-slot]'); if (b) { e.preventDefault(); e.stopPropagation(); this.input.swapReq = +b.dataset.slot; } }, { passive: false });
    for (const i of [0, 1, 2]) this.$('s' + i).addEventListener('mousedown', (e) => { e.stopPropagation(); const I = m.player.intent; if (i === 2) I.ult = true; else I.cast[i] = true; });
    this.annT = 0; this.hintQ = []; this.hintT = 0;
  }
  unmount() { this.root.classList.add('hidden'); this.touch.classList.add('hidden'); this.root.innerHTML = ''; }
  set(id, key, val, fn) { if (this.cache[id + key] === val) return; this.cache[id + key] = val; fn(this.$(id), val); }
  announce(text, sub, big) { const a = this.$('ann'); if (!a) return; a.innerHTML = `<div class="a1 stroke" style="${big ? '' : 'font-size:clamp(26px,5vw,48px)'}">${esc(text)}</div>${sub ? `<div class="a2 stroke">${esc(sub)}</div>` : ''}`; this.annT = big ? 2.2 : 1.6; }
  hint(text, dur = 4.5) { this.hintQ.push({ text, dur }); }
  update(dt, frame) {
    const m = this.m, p = m.player;
    const alive = m.fighters.filter((f) => f.alive).length;
    this.set('alive', 't', alive, (e, v) => (e.textContent = '👥 ' + v + ' left'));
    this.set('kills', 't', p.kills, (e, v) => (e.textContent = '💥 ' + v + ' KOs'));
    const s = m.storm; const tl = Math.ceil(m.stormTimeLeft());
    const outside = p.alive && m.outsideStorm(p.x, p.y);
    const st = outside ? '⚠️ IN THE STORM — GET TO THE SAFE ZONE!' : s.state === 'wait' ? `⛈️ Storm moves in ${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}` : s.state === 'shrink' ? '⚡ Storm closing!' : '⚡ Final circle';
    this.set('storm', 't', st, (e, v) => (e.textContent = v));
    this.set('storm', 'c', outside || s.state === 'shrink', (e, v) => e.classList.toggle('danger', v));
    if (frame % 3 === 0) drawMinimap(this.mm, m, 300);
    // feed
    const fk = m.feed.map((k) => k.killer + k.victim).join('|');
    this.set('feed', 'k', fk, (e) => { e.innerHTML = m.feed.map((k) => `<div class="${k.me ? 'me' : ''}"><span style="color:${k.kc}">${esc(k.killer)}</span> ⚔️ <span style="color:${k.vc}">${esc(k.victim)}</span></div>`).join(''); });
    // abilities
    const slots = [p.abilities[0], p.abilities[1]];
    slots.forEach((a, i) => {
      const def = ABILITIES[a.id]; const cd = Math.max(0, a.cd);
      const key = a.id + a.lvl;
      if (!this.isTouch) {
        this.set('s' + i, 'id', key, (e) => { e.querySelector('.ic').textContent = def.icon; e.querySelector('.lv').textContent = '★'.repeat(a.lvl); e.querySelector('.nm').textContent = def.name; e.style.borderColor = def.color; });
        this.set('s' + i, 'cd', cd > 0 ? Math.ceil(cd) : 0, (e, v) => { const c = e.querySelector('.cd'); c.style.display = v ? 'flex' : 'none'; c.textContent = v || ''; });
      } else {
        const tb = this.touch.querySelector(i === 0 ? '.tq' : '.te');
        if (tb) { if (this.cache['tb' + i] !== key) { this.cache['tb' + i] = key; tb.querySelector('.ic').textContent = def.icon; tb.querySelector('.lv').textContent = '★'.repeat(a.lvl); tb.style.borderColor = def.color; } const v = cd > 0 ? Math.ceil(cd) : 0; if (this.cache['tbc' + i] !== v) { this.cache['tbc' + i] = v; const c = tb.querySelector('.cd'); c.style.display = v ? 'flex' : 'none'; c.textContent = v || ''; } }
      }
    });
    const ult = ULTS[p.hero.ult.id]; const uk = Math.floor(p.ult * 100);
    const ultEl = this.isTouch ? this.touch.querySelector('.tult') : this.$('s2');
    if (ultEl && this.cache.ult !== uk) {
      this.cache.ult = uk; ultEl.querySelector('.ic').textContent = ult.icon;
      const c = ultEl.querySelector('.cd'); c.style.display = uk >= 100 ? 'none' : 'flex'; c.textContent = uk + '%'; c.style.fontSize = '14px';
      ultEl.classList.toggle('ready', uk >= 100); if (this.isTouch) ultEl.style.boxShadow = uk >= 100 ? '0 0 22px #ffd60a' : '';
    }
    // swap prompt
    const o = p.alive ? p.nearOrb : null;
    const ok = o ? o.id + ':' + p.abilities.map((a) => a.id + a.lvl).join(',') : '';
    this.set('swap', 'o', ok, (e) => {
      if (!o) { e.classList.add('hidden'); return; }
      const d = ABILITIES[o.ability];
      if (p.abilities.some((a) => a.id === o.ability)) { e.innerHTML = `<div class="t">${d.icon} ${esc(d.name)} is already MAX level</div>`; e.classList.remove('hidden'); return; }
      e.innerHTML = `<div class="t">${d.icon} <b style="color:${d.color}">${esc(d.name)}</b> Lv${o.lvl}${o.from ? ` <span class="muted">stolen from ${esc(o.from)}</span>` : ''}<div class="muted" style="margin-top:3px">${esc(d.desc)}</div></div>
        <div class="o">${p.abilities.map((a, i) => `<button class="btn ${i ? 'gem' : 'gold'}" data-slot="${i}">${this.isTouch ? '' : `[${i + 1}] `}Replace ${ABILITIES[a.id].icon} ${esc(ABILITIES[a.id].name)}</button>`).join('')}</div>`;
      e.classList.remove('hidden');
    });
    // announcer + hints
    if (this.annT > 0) { this.annT -= dt; if (this.annT <= 0) this.$('ann').innerHTML = ''; }
    const h = this.$('hint');
    if (this.hintT > 0) { this.hintT -= dt; if (this.hintT <= 0) h.classList.add('hidden'); }
    else if (this.hintQ.length) { const n = this.hintQ.shift(); h.innerHTML = n.text; h.classList.remove('hidden'); this.hintT = n.dur; }
    // hurt vignette pulse
    if (this.hurtT > 0) { this.hurtT -= dt; this.$('vign').style.opacity = Math.max(0, this.hurtT * 2).toFixed(2); }
  }
  hurt() { this.hurtT = 0.35; }
}
