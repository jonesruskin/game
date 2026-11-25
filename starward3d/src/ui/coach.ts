// The first minute: no reading, just a hand that points at what to tap next. Collect the bubbles, upgrade Mission
// Control, build the Research Center, place it; then the goals card takes over. Skippable at any point, shown once.
import type { UI } from './ui';
import { $ } from '../core/util';
type Step = 'collect' | 'hq' | 'upgrade' | 'build' | 'card' | 'place';
const ORDER: Step[] = ['collect', 'hq', 'upgrade', 'build', 'card', 'place'];
const CAP: Record<Step, string> = { collect: 'Tap to collect', hq: 'Tap Mission Control', upgrade: 'Upgrade it', build: 'Build something new', card: 'Build a Research Center', place: 'Place it here' };
export const COACH_DONE = 99;
const HAND = '<svg viewBox="0 0 64 64" width="54" height="54"><path d="M22 30V12a5 5 0 0 1 10 0v14l3-.6a5 5 0 0 1 5.6 3.2l.4-.1a5 5 0 0 1 6.2 3.6l.2-.1a5 5 0 0 1 6.2 4.4V46c0 8-6 14-14 14h-6c-5 0-9-2.6-11.6-6.6L13 43a5 5 0 0 1 7.6-6.4L22 38z" fill="#fff" stroke="#0b1424" stroke-width="3" stroke-linejoin="round"/></svg>';
export class Coach {
  private el: HTMLElement | null = null; private ring: HTMLElement | null = null; private collected = false; private t0 = performance.now();
  constructor(private ui: UI) {}
  get s() { return this.ui.app.s; }
  get on() { return this.s.tut < COACH_DONE; }
  private get step(): Step { return ORDER[Math.max(0, Math.min(ORDER.length - 1, this.s.tut))]; }
  private set(st: Step) { this.s.tut = ORDER.indexOf(st); }
  event(e: 'collect') { if (e === 'collect') this.collected = true; }
  skip() { this.finish(false); }
  private finish(done: boolean) { this.s.tut = COACH_DONE; this.el?.remove(); this.ring?.remove(); this.el = this.ring = null; this.ui.app.changed();
    if (done) { this.ui.toast('Nicely done. Follow the goal card: every goal pays a reward.', 'gold'); const o = $('#obj'); o.classList.add('pulse'); setTimeout(() => o.classList.remove('pulse'), 7000); } }
  private hqId() { return this.s.bases.earth.items.find((i) => i.b === 'hq')?.id || ''; }
  private job(b: string) { return this.s.jobs.some((j) => j.kind === 'build' && this.s.bases.earth.items.some((i) => i.id === j.item && i.b === b)) || this.s.bases.earth.items.some((i) => i.b === b && i.lvl > 0 && b === 'research'); }
  // decide where we are from what the player has actually done (they can wander off and come back)
  private advance() { const A = this.ui.app, s = this.s; if (s.at !== 'earth' || A.world.mode !== 'base') return;
    let st = this.step; const hqUp = this.job('hq') || (s.bases.earth.items.find((i) => i.b === 'hq')?.lvl || 1) >= 2; const res = this.job('research');
    const R = A.R, held = s.bases.earth.items.some((i) => R.item[i.id] && (i.held || 0) >= Math.max(1, R.item[i.id].hold * 0.03)); /* something to collect (by the state, not by what has been drawn yet) */
    if (st === 'collect' && (this.collected || (!held && performance.now() - this.t0 > 2500))) st = 'hq';
    if ((st === 'hq' || st === 'upgrade') && hqUp) st = 'build';
    if (st === 'hq' && this.ui.sel === this.hqId()) st = 'upgrade'; if (st === 'upgrade' && this.ui.sel !== this.hqId() && !hqUp) st = 'hq';
    if (st === 'build' && this.ui.over === 'shop') st = 'card'; if (st === 'card' && this.ui.over !== 'shop' && !(A as any).placing) st = 'build';
    if ((st === 'card' || st === 'build') && (A as any).placing?.b === 'research') st = 'place'; if (st === 'place' && !(A as any).placing && !res) st = 'build';
    if (res) { this.set(st); this.finish(true); return; } this.set(st); }
  private target(): { x: number; y: number; w: number; h: number } | null { const A = this.ui.app, st = this.step;
    const rect = (sel: string) => { const e = document.querySelector(sel) as HTMLElement | null; if (!e || !e.offsetParent) return null; let r = e.getBoundingClientRect(); if (r.bottom > innerHeight - 4 || r.top < 0 || r.right > innerWidth - 4 || r.left < 0) { e.scrollIntoView({ block: 'nearest', inline: 'center' }); r = e.getBoundingClientRect(); } /* inside a scrolled panel: bring it into view */ return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height } : null; };
    if (st === 'collect') return rect('#bubbles .bub[data-a="collect"]');
    if (st === 'hq') { const p = A.world.topOf(this.hqId()); if (!p) return null; const q = A.world.project(p); return q.behind ? null : { x: q.x, y: q.y + 26, w: 64, h: 64 }; }
    if (st === 'upgrade') return rect('#panel [data-a="upgrade"]');
    if (st === 'build') return rect('#nav [data-a="shop"]');
    if (st === 'card') return this.ui.tab !== 'science' ? rect('#over [data-a="tab"][data-t="science"]') : rect('#over [data-a="buy"][data-b="research"]');
    return rect('#placeOk'); }
  frame() { if (!this.on) { if (this.el) { this.el.remove(); this.ring?.remove(); this.el = this.ring = null; } return; } if (document.getElementById('introCard') && performance.now() - this.t0 < 2700) return; /* the one-line intro first, then the hand */ if (this.s.stats.sessions > 1 && this.s.obj.i > 0) { this.s.tut = COACH_DONE; return; } this.advance(); if (!this.on) return;
    if (!this.el) { this.el = document.createElement('div'); this.el.id = 'coach'; this.el.innerHTML = `<div class="hand">${HAND}</div><div class="cap"><b></b><button data-a="coachSkip">Skip</button></div>`; document.body.appendChild(this.el); this.ring = document.createElement('div'); this.ring.id = 'coachRing'; document.body.appendChild(this.ring); }
    const modal = !$('#modal').classList.contains('hidden'); const t = modal ? null : this.target(); const st = this.step; const cap = this.step === 'card' && this.ui.tab !== 'science' ? 'Open Science' : CAP[st];
    const b = this.el.querySelector('.cap b') as HTMLElement; if (b.textContent !== cap) b.textContent = cap; const ring = this.ring!; this.el.classList.toggle('nohand', !t); ring.style.display = t ? 'block' : 'none';
    if (t) { const up = t.y > innerHeight * 0.62; this.el.style.left = t.x + 'px'; this.el.style.top = t.y + 'px'; this.el.classList.toggle('up', up); const r = Math.max(t.w, t.h) / 2 + 10; Object.assign(ring.style, { left: t.x - r + 'px', top: t.y - r + 'px', width: r * 2 + 'px', height: r * 2 + 'px' }); }
    else { this.el.style.left = innerWidth / 2 + 'px'; this.el.style.top = '96px'; } }
  // the opening card: what the game is, in one line, then straight into play (never blocks)
  intro() { const d = document.createElement('div'); d.id = 'introCard'; d.innerHTML = '<b>HELIOSCEND</b><i>Build a space programme. Reach the stars.</i>'; document.body.appendChild(d); setTimeout(() => d.classList.add('out'), 2600); setTimeout(() => d.remove(), 3400); this.t0 = performance.now(); }
}
