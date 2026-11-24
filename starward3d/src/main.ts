// STARWARD 3D: app shell. Boots the platform, loads (and catches up) the save, runs the frame loop, routes taps,
// handles placement and feedback, and saves. Rules live in core/, the 3D world in render/, the interface in ui/.
import './ui/style.css';
import { Platform } from '@platform';
import type { PlatformAPI } from './platform/types';
import { State, fresh, migrate, SAVE_KEY } from './core/state';
import * as G from './core/game';
import { rates, kardashev, K_MILESTONES, Rates } from './core/econ';
import { World } from './render/world';
import { Studio } from './render/studio';
import { UI, costHTML, kReward } from './ui/ui';
import { Audio } from './audio';
import { $, fmt, esc, fmtTime } from './core/util';
import { BUILDINGS } from './data/buildings';
import { TECH } from './data/research';
import { RES } from './data/resources';
import * as SP from './core/space';
import type { Design } from './data/rockets';
export class App {
  version = '2.0-dev'; platform: PlatformAPI = Platform; audio = new Audio(); s!: State; R!: Rates; world!: World; studio!: Studio; ui!: UI;
  private last = performance.now(); private acc = 0; private saveAt = 0; private queue: (() => void)[] = []; private placing: { b: string; move?: string } | null = null;
  async boot() {
    await this.platform.init(); this.platform.loadingStart();
    let raw: string | null = null; try { raw = this.platform.load(SAVE_KEY); } catch (e) { raw = null; }
    let s: State | null = null; try { s = raw ? JSON.parse(raw) : null; } catch (e) { s = null; } this.s = s && s.v ? migrate(s) : fresh();
    const away = Date.now() - this.s.last; const before = { ...this.s.res }; const notes = G.advance(this.s, Date.now()); this.R = rates(this.s); this.s.stats.sessions++;
    this.world = new World($('#gl') as HTMLCanvasElement, this.s.settings.quality); this.studio = new Studio(this.world.renderer); this.ui = new UI(this);
    this.world.setWorld(this.s.at, this.s.bases[this.s.at].body); this.world.sync(this.s); this.world.onTap = (h) => this.tapped(h); this.world.onGhostMove = () => this.ghostMoved();
    const A = G.area(this.s, this.s.at); const c = (A.lo + A.hi) / 2 - 26; this.world.focus(c, c + 2, 30 + A.side * 0.55); this.world.cam.dist = 30 + A.side * 0.55;
    this.ui.renderHud(); this.ui.renderNav(); this.ui.renderObj(); this.audio.setVolume(this.s.settings.sfx); this.audio.mvol = this.s.settings.music;
    this.platform.onMute = (m) => this.audio.setMuted(m); this.audio.setMuted(this.platform.muted());
    document.addEventListener('pointerdown', () => { this.audio.unlock(); this.audio.startMusic(); }, { once: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save(); else this.tickNow(); }); window.addEventListener('pagehide', () => this.save());
    (window as any).__app = this; (window as any).__G = G;
    requestAnimationFrame((t) => this.loop(t)); this.platform.loadingStop(); const ld = $('#load'); ld.style.opacity = '0'; setTimeout(() => ld.remove(), 500); this.platform.gameplayStart();
    if (this.s.stats.sessions === 1 && this.s.obj.i === 0) this.enqueue(() => this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">CHAPTER 1</div><h1>Humble Beginnings</h1><p class="desc">A patch of coastal scrubland, a borrowed budget and a dream. Build the programme that will carry humanity from this launch pad to the stars, and one day to a civilisation spanning the galaxy.</p><p class="desc">Tap the bubbles over your Metal Mine and Agency Office to collect, then follow the goals card: every goal pays a reward.</p><button class="btn gold" data-a="closeModal">Let's begin</button>`, { rays: true }));
    else if (away > 5 * 60e3) this.enqueue(() => this.report(away, before, notes));
  }
  private report(away: number, before: Record<string, number>, notes: G.Note[]) {
    const gained = Object.keys(RES).filter((r) => (this.s.res[r] || 0) - (before[r] || 0) >= 1).map((r) => `<span class="cost">${RES[r].icon} +${fmt(this.s.res[r] - before[r])}</span>`).join(' ');
    const held = this.s.bases[this.s.at].items.reduce((a, it) => a + (it.held || 0), 0); const done = notes.filter((n) => n.kind === 'build' || n.kind === 'research').map((n) => n.kind === 'build' ? `${esc(BUILDINGS[n.b].name)} → level ${n.lvl}` : `Researched ${esc(TECH[n.tech].name)}`);
    this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">WELCOME BACK</div><h1>${fmtTime(away / 1000)} away</h1><div class="report"><div>${gained || 'Your stockpile is full or unchanged.'}</div>${held >= 1 ? `<div>Waiting in your collectors: <b>${fmt(held)}</b>. Tap the bubbles!</div>` : ''}${done.length ? `<div>${done.slice(0, 6).join('<br>')}</div>` : ''}</div><button class="btn gold" data-a="closeModal">Back to work</button>`);
  }
  // ---------------- loop ----------------
  private loop(t: number) {
    const dt = Math.min(0.1, (t - this.last) / 1000); this.last = t; this.acc += dt; this.s.stats.playS += dt;
    if (this.acc >= 0.25) { this.acc = 0; this.tick(); }
    this.world.frame(this.s, dt, (id) => { const it = G.itemOf(this.s, this.s.at, id); return !!it && it.lvl > 0 && this.R.eff > 0.5; }); this.ui.frameBubbles(); this.ui.refreshPanel();
    if (this.queue.length && $('#modal').classList.contains('hidden') && !this.placing) this.queue.shift()!();
    requestAnimationFrame((tt) => this.loop(tt));
  }
  tickNow() { this.tick(); this.changed(); }
  private tick() {
    const notes = G.advance(this.s, Date.now()); this.R = rates(this.s); for (const n of notes) this.note(n); if (notes.length) this.changed();
    this.ui.updHud(); this.ui.tick++; if (this.ui.tick % 4 === 0) this.ui.renderObj(); if (this.ui.tick % 12 === 0) this.ui.renderNav();
    // Kardashev milestones pay out dark matter as the civilisation's power grows
    const k = kardashev(this.s, this.R); const m = K_MILESTONES.find((x) => x > (this.s.kMax || 0) && k >= x);
    if (m) { this.s.kMax = m; const dm = kReward(m); this.s.res.dm = (this.s.res.dm || 0) + dm; this.audio.play('levelup'); this.platform.happytime(); this.enqueue(() => this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">KARDASHEV MILESTONE</div><div class="big">${m.toFixed(2)}</div><p class="desc">Your civilisation now commands more power than ever. Reward:</p><div class="rewards">${costHTML({ dm })}</div><button class="btn gold" data-a="closeModal">Onward</button>`, { rays: true })); }
    if (Date.now() > this.saveAt) { this.saveAt = Date.now() + 10000; this.save(); }
  }
  private note(n: G.Note) {
    if (n.kind === 'build') { const d = BUILDINGS[n.b]; this.audio.play('done'); const at = this.world.topOf(n.item); if (at) this.world.burst(at, '#ffd36a', 28); this.ui.toast(`${esc(d.name)} ${n.first ? 'is ready' : `reached level ${n.lvl}`}`, 'good'); if (n.b === 'hq') { this.platform.happytime(); this.ui.toast('The spaceport grows: more room to build', 'gold'); } }
    else if (n.kind === 'rocket') { this.audio.play('done'); this.ui.toast(`${esc(n.name)} is assembled and waiting on the pad`, 'good'); this.ui.renderNav(); if (this.ui.over === 'launch') this.ui.renderOver(); }
    else if (n.kind === 'mission') { this.audio.play('levelup'); this.platform.happytime(); if (n.first) this.enqueue(() => this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">MISSION ACCOMPLISHED</div><h1>${esc(n.name)}</h1>${n.reward ? `<div class="rewards">${costHTML(n.reward)}</div>` : ''}<button class="btn gold" data-a="closeModal">Onward</button>`, { rays: true })); else this.ui.toast(`${esc(n.name)} complete`, 'good'); }
    else if (n.kind === 'sat' || n.kind === 'module') { this.audio.play('levelup'); this.ui.toast(`${esc(n.name)}: in orbit and working`, 'gold'); this.ui.renderNav(); }
    else if (n.kind === 'fail') { this.audio.play('deny'); this.ui.toast(`${esc(n.name)} failed. The engineers learned something: +${fmt(n.sci)} science`, 'bad'); }
    else if (n.kind === 'research') { this.audio.play('levelup'); this.ui.toast(`Research complete: <b>${esc(TECH[n.tech].name)}</b>`, 'gold'); this.ui.renderNav(); if (this.ui.over === 'research') this.ui.renderOver(); }
  }
  changed() { this.R = rates(this.s); this.world.sync(this.s); this.syncPad(); if (this.world.orbit) this.world.orbit.sync(SP.sp(this.s)); this.ui.renderObj(); this.ui.renderPanel(); this.ui.renderNav(); this.ui.updHud(); this.saveAt = Math.min(this.saveAt, Date.now() + 1500); }
  // the next rocket in the hangar stands on the pad
  private syncPad() { const pad = this.s.bases.earth.items.find((i) => i.b === 'launch' && i.lvl > 0); const S = SP.sp(this.s); const id = Object.keys(S.hangar).find((k) => S.hangar[k] > 0); const d = id ? SP.designOf(this.s, id) : null; this.world.setPadRocket(this.s.at === 'earth' && !this.s.jobs.some((j) => j.kind === 'mission' && Date.now() - j.start < 12000) ? d : null, pad ? pad.id : null); }
  launched(d: Design) { const pad = this.s.bases.earth.items.find((i) => i.b === 'launch'); if (this.world.mode === 'orbit') this.closeOrbit(); if (pad) this.world.launchFx(d, pad.id); this.audio.play('launch'); this.ui.toast(`Liftoff! ${esc(d.name)} is on its way`, 'gold'); this.changed(); this.ui.renderNav(); }
  openOrbit(f: 'earth' | 'station') { this.ui.select(null); this.world.openOrbit(SP.sp(this.s)); this.world.orbit!.setFocus(f); document.body.classList.add('orbiting'); this.ui.renderNav(); }
  closeOrbit() { this.world.closeOrbit(); document.body.classList.remove('orbiting'); this.ui.renderNav(); }
  enqueue(fn: () => void) { this.queue.push(fn); }
  // ---------------- taps ----------------
  private tapped(h: { item?: string; cell?: [number, number] }) {
    if (this.placing) return;
    if (h.item) { const it = G.itemOf(this.s, this.s.at, h.item); if (it && this.R.item[it.id] && (it.held || 0) >= 1 && this.ui.sel !== it.id) { this.collect(it.id); } this.ui.select(h.item); this.audio.play('tap'); return; }
    this.ui.select(null);
  }
  collect(id: string) {
    const r = G.collect(this.s, this.s.at, id, this.R); if (!r) return; if (r.n <= 0) { this.ui.toast(`${RES[r.r].name} storage is full. Build or upgrade a Logistics Depot.`, 'bad'); this.audio.play('deny'); return; }
    this.audio.play('collect', r.n); const at = this.world.topOf(id); if (at) { this.world.burst(at, RES[r.r].color, 16 + Math.min(24, Math.floor(Math.log10(r.n) * 5))); const p = this.world.project(at); this.ui.popText(p.x, p.y - 10, `+${fmt(r.n)} ${RES[r.r].icon}`, RES[r.r].color); }
    if (r.full) this.ui.toast(`${RES[r.r].name} storage is full: the rest stays in the building.`, 'bad'); this.changed();
  }
  // ---------------- placement ----------------
  startPlacing(b: string, move?: string) {
    const s = this.s; let x = 0, z = 0, r = 0; if (move) { const it = G.itemOf(s, s.at, move)!; x = it.x; z = it.z; r = it.r; } else { const sp = G.freeSpot(s, s.at, b); if (!sp) { this.ui.deny('No room left: raise Mission Control to expand the spaceport'); return; } [x, z] = sp; }
    this.placing = { b, move }; this.ui.select(null); this.world.startGhost({ b, r, x, z, move, ok: true }); this.ghostMoved(); const [w, d] = G.dims(b, r); this.world.focus(x + w / 2 - 26, z + d / 2 - 26);
    const el = $('#place'); el.classList.remove('hidden'); el.innerHTML = `<span class="lbl">${move ? 'Move' : 'Place'} ${esc(BUILDINGS[b].name)}</span><button class="btn small" data-a="rotate">⟳ Rotate</button><button class="btn small red" data-a="unplace">✕</button><button class="btn small gold" data-a="place" id="placeOk">✓ ${move ? 'Move here' : 'Build here'}</button>`;
    this.world.sync(s);
  }
  private ghostMoved() { const g = this.world.ghost; if (!g) return; g.ok = G.fits(this.s, this.s.at, g.b, g.x, g.z, g.r, g.move).ok; this.world.syncGhost(); const b = $('#placeOk') as HTMLButtonElement; if (b) b.disabled = !g.ok; }
  confirmPlace() {
    const g = this.world.ghost, P = this.placing; if (!g || !P) return; const s = this.s;
    const r = P.move ? G.moveItem(s, s.at, P.move, g.x, g.z, g.r) : G.startBuild(s, s.at, g.b, g.x, g.z, g.r);
    if (!r.ok) { this.ui.deny(r.why); return; } this.audio.play(P.move ? 'place' : 'build'); this.cancelPlace(); if (!P.move && r.item) { this.ui.select(r.item.id); } this.changed();
  }
  cancelPlace() { this.placing = null; this.world.endGhost(); $('#place').classList.add('hidden'); this.world.sync(this.s); }
  // ---------------- settings & save ----------------
  setSetting(k: string, v: any) { (this.s.settings as any)[k] = v; if (k === 'sfx') this.audio.setVolume(v); if (k === 'music') this.audio.setMusic(v); this.save(); }
  save() { try { this.s.last = Math.max(this.s.last, Date.now()); this.platform.save(SAVE_KEY, JSON.stringify(this.s)); } catch (e) { /* storage full */ } }
  reset() { this.s = fresh(); this.save(); location.reload(); }
}
new App().boot();
