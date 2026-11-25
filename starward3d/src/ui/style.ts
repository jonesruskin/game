// The Style Locker: the programme's name, paint scheme, banner and emblem (every unlock earned by playing, each locked
// one says how), a live preview of Mission Control in your colours, and the colony card: a shareable 1200×630 image
// of the base as it looks right now, with your banner, name and the story so far.
import { esc, fmt } from '../core/util';
import * as STY from '../core/style';
import { PAINTS, BANNER_BG, BANNER_FG, EMBLEMS } from '../data/style';
import { emblemPath, emblemRule } from '../render/models';
import { hqLevel, kardashev } from '../core/econ';
import { war as wg } from '../core/war';
import { life } from '../core/life';
import { rb } from '../core/robots';
import type { UI } from './ui';
export class StyleUI {
  private cardUrl = '';
  constructor(private ui: UI) {}
  get s() { return this.ui.app.s; } get A() { return this.ui.app; }
  banner(b: { bg: string; fg: string; emblem: string }, w = 120) { const c = document.createElement('canvas'); c.width = 128; c.height = 80; const g = c.getContext('2d')!; if (b.bg !== 'transparent') { g.fillStyle = b.bg; g.fillRect(0, 0, 128, 80); } g.fillStyle = b.fg; g.translate(64, 40); emblemPath(g, b.emblem, 26); g.fill(emblemRule(b.emblem));
    return `<img src="${c.toDataURL()}" style="width:${w}px;height:${(w * 80) / 128}px;border-radius:6px;display:block" alt="">`; }
  html() { const s = this.s, S = STY.style(s); STY.clearNew(s);
    const sw = (on: boolean, need: any, inner: string, attrs: string, title: string) => { const ok = STY.met(s, need); return `<button class="sw ${on ? 'on' : ''} ${ok ? '' : 'lk'}" ${ok ? attrs : `data-a="styleLocked" data-why="${esc(title + ': ' + STY.needText(need))}"`} title="${esc(title + (ok ? '' : ' · ' + STY.needText(need)))}">${inner}${ok ? '' : '<i>🔒</i>'}</button>`; };
    const paint = PAINTS.find((p) => p.primary === S.primary && p.accent === S.accent); const look = STY.lookOf(s);
    return `<div class="head"><h1>Style</h1><span class="chip">🎨 ${STY.owned(s).length} / ${STY.ALL.length} unlocked</span><button class="ibtn" data-a="close">✕</button></div><div class="body"><div class="stylegrid">
      <div class="card"><div class="row" style="gap:12px;align-items:center"><div class="thumb" style="width:150px;height:120px;flex:none"><img src="${this.A.studio.building('hq', Math.max(1, hqLevel(s)), look)}" alt=""></div><div class="grow">${this.banner({ bg: S.bg, fg: S.fg, emblem: S.emblem }, 120)}<div class="meta" style="margin-top:6px">Your colours on every building, every flag, the holo beacons and in War Games.</div></div></div>
        <label class="ox" style="margin-top:6px">Programme name<input id="sname" value="${esc(s.name)}" maxlength="24" class="tin"></label>
        <label class="ox">Spaceport name<input id="bname" value="${esc(s.bases.earth.name)}" maxlength="24" class="tin"></label>
        <div class="row" style="gap:8px"><button class="btn small" data-a="styleNames">Save names</button><button class="btn gold small" data-a="shareCard">📸 Make a colony card</button></div></div>
      <div class="card"><div class="row"><b class="ox grow">Paint scheme</b><span class="sub">${esc(paint ? paint.name : '')}</span></div><div class="sws">${PAINTS.map((p, i) => sw(paint === p, p.need, `<span style="background:linear-gradient(135deg, ${p.primary} 55%, ${p.accent} 55%)"></span>`, `data-a="stylePaint" data-i="${i}"`, p.name)).join('')}</div></div>
      <div class="card"><b class="ox">Banner</b><div class="sws sm">${BANNER_BG.map((b) => sw(S.bg === b.color, b.need, `<span style="background:${b.color}"></span>`, `data-a="styleBg" data-c="${b.color}"`, b.name)).join('')}</div>
        <div class="sws sm round">${BANNER_FG.map((c) => sw(S.fg === c, undefined, `<span style="background:${c}"></span>`, `data-a="styleFg" data-c="${c}"`, 'Emblem colour')).join('')}</div>
        <div class="sws em">${EMBLEMS.map((e) => sw(S.emblem === e.id, e.need, this.banner({ bg: 'transparent', fg: '#ffffff', emblem: e.id }, 40), `data-a="styleEm" data-e="${e.id}"`, e.name)).join('')}</div></div>
      </div><p class="sub" style="text-align:center;margin-top:12px">Locked styles say how to earn them: grow Mission Control, found colonies, terraform, study alien life, meet civilisations, win War Games, beat the Swarm, cross to other galaxies. Decorations are in the Build menu.</p></div>`; }
  private apply() { const A = this.A; A.world.look = STY.lookOf(this.s); A.world.sync(this.s); A.changed(); this.ui.renderOver(); }
  act(a: string, t: HTMLElement): boolean { const s = this.s, A = this.A, ui = this.ui, S = STY.style(s);
    switch (a) {
      case 'style': ui.closeModal(); ui.openOver('style'); A.audio.play('tap'); return true;
      case 'styleLocked': ui.toast('🔒 ' + esc(t.dataset.why || ''), 'bad'); A.audio.play('deny'); return true;
      case 'stylePaint': { const p = PAINTS[+t.dataset.i!]; if (p && STY.met(s, p.need)) { S.primary = p.primary; S.accent = p.accent; A.audio.play('claim'); this.apply(); } return true; }
      case 'styleBg': S.bg = t.dataset.c!; A.audio.play('tap'); this.apply(); return true;
      case 'styleFg': S.fg = t.dataset.c!; A.audio.play('tap'); this.apply(); return true;
      case 'styleEm': S.emblem = t.dataset.e!; A.audio.play('tap'); this.apply(); return true;
      case 'styleNames': { const n = (document.getElementById('sname') as HTMLInputElement)?.value.trim(), b = (document.getElementById('bname') as HTMLInputElement)?.value.trim(); if (n) s.name = n.slice(0, 24); if (b) s.bases.earth.name = b.slice(0, 24); A.changed(); ui.renderHud(); ui.toast('Names saved', 'good'); A.audio.play('claim'); return true; }
      case 'shareCard': this.card(); return true;
      case 'shareNative': this.shareNative(); return true;
    }
    return false; }
  // a shareable 1200×630 card: the base as it looks right now, your banner, name and the story so far
  card() { const s = this.s, A = this.A, W = A.world, S = STY.style(s); W.renderNow(); const shot = W.renderer.domElement; const c = document.createElement('canvas'); c.width = 1200; c.height = 630; const g = c.getContext('2d')!;
    g.fillStyle = '#081221'; g.fillRect(0, 0, 1200, 630); const tw = 780, th = 630, sa = shot.width / shot.height, ta = tw / th; let sw = shot.width, sh = shot.height, sx = 0, sy = 0; if (sa > ta) { sw = sh * ta; sx = (shot.width - sw) / 2; } else { sh = sw / ta; sy = (shot.height - sh) / 2; } g.drawImage(shot, sx, sy, sw, sh, 420, 0, tw, th);
    const fade = g.createLinearGradient(380, 0, 720, 0); fade.addColorStop(0, '#081221'); fade.addColorStop(1, 'rgba(8,18,33,0)'); g.fillStyle = fade; g.fillRect(380, 0, 340, 630);
    const bc = document.createElement('canvas'); bc.width = 128; bc.height = 80; const bg = bc.getContext('2d')!; bg.fillStyle = S.bg; bg.fillRect(0, 0, 128, 80); bg.fillStyle = S.fg; bg.translate(64, 40); emblemPath(bg, S.emblem, 26); bg.fill(emblemRule(S.emblem));
    g.save(); g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 16; g.drawImage(bc, 56, 52, 144, 90); g.restore(); g.fillStyle = S.accent; g.fillRect(56, 146, 144, 6);
    g.fillStyle = '#ffffff'; let fs = 52; g.font = `700 ${fs}px Oxanium, sans-serif`; while (g.measureText(s.name).width > 420 && fs > 26) { fs -= 2; g.font = `700 ${fs}px Oxanium, sans-serif`; } g.fillText(s.name, 56, 216);
    g.fillStyle = '#7fe3ff'; g.font = '600 24px Barlow, sans-serif'; g.fillText(`${s.bases.earth.name} · Kardashev ${kardashev(s, A.R).toFixed(2)}`, 58, 252);
    const L = (s as any).life ? life(s) : null; const worlds = Object.keys(s.bases).length; const stars = Object.keys(((s as any).stars || {}).colonies || {}).length;
    const rows: [string, string][] = [['Worlds settled', String(worlds)], ['Star colonies', String(stars)], ['Lifeforms found', String(L ? Object.keys(L.found).length : 0)], ['Robots', String(rb(s).list.length)], ['Technologies', String(Object.keys(s.tech).length)], ['War Games trophies', fmt(wg(s).trophies)]];
    rows.forEach(([k, v], i) => { const x = 58 + (i % 2) * 200, y = 310 + Math.floor(i / 2) * 70; g.fillStyle = 'rgba(255,255,255,0.55)'; g.font = '600 17px Barlow, sans-serif'; g.fillText(k.toUpperCase(), x, y); g.fillStyle = '#ffd36a'; g.font = '700 32px Oxanium, sans-serif'; g.fillText(v, x, y + 34); });
    g.fillStyle = 'rgba(8,18,33,0.78)'; g.fillRect(420, 562, 780, 68); g.fillStyle = '#ffffff'; g.font = '800 30px Oxanium, sans-serif'; g.fillText('STARWARD 3D', 446, 606); g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = '600 20px Barlow, sans-serif'; g.fillText('From one launch pad to a galactic civilisation', 680, 604);
    this.cardUrl = c.toDataURL('image/png'); const canShare = typeof navigator.share === 'function';
    this.ui.modal(`<h1 style="font-size:22px">Your colony card</h1><img id="cardImg" src="${this.cardUrl}" alt="Colony card" style="width:100%;border-radius:12px;display:block;margin:8px 0"><div class="row" style="justify-content:center;gap:8px"><a class="btn gold" download="${esc(s.name.replace(/[^\w -]/g, '') || 'colony')}.png" href="${this.cardUrl}">⬇ Save image</a>${canShare ? '<button class="btn" data-a="shareNative">Share</button>' : ''}<button class="btn" data-a="closeModal">Close</button></div>`); }
  private async shareNative() { try { const blob = await (await fetch(this.cardUrl)).blob(); const file = new File([blob], 'starward-colony.png', { type: 'image/png' }); const data: ShareData = { files: [file], title: this.s.name, text: `${this.s.name} in Starward 3D` };
      if (navigator.canShare && !navigator.canShare(data)) delete data.files; await navigator.share(data); } catch { /* cancelled or not allowed here */ } }
}
