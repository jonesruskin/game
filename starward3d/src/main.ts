// STARWARD 3D: app shell. Boots the platform, loads (and catches up) the save, runs the frame loop, routes taps,
// handles placement and turns game events into feedback.
import './ui/style.css';
import { Platform } from '@platform';
import type { PlatformAPI } from './platform/types';
import { State, fresh, migrate, Item } from './core/state';
import * as G from './core/game';
import { World, Ghost } from './render/world';
import { Studio } from './render/studio';
import { UI } from './ui/ui';
import { Audio } from './audio';
import { $, fmt, esc } from './core/util';
import { BUILDINGS, landCost, landLevel } from './data/buildings';
import { SPECIES } from './data/species';
import * as D from './core/daily';
import * as AR from './core/arena';
import * as SP from './core/space';
import * as V from './core/vault';
import { CRYSTALS } from './data/vault';
import { ISLANDS } from './data/islands';
import { RARITIES } from './data/rarities';
const SAVE_KEY = 'starward3d_v1';
export class App {
  version = '0.2'; platform: PlatformAPI = Platform; audio = new Audio(); s!: State; world!: World; studio!: Studio; ui!: UI; private last = performance.now(); private saveAt = 0; private queue: (() => void)[] = [];
  async boot() {
    await this.platform.init(); this.platform.loadingStart();
    const raw = this.platform.load(SAVE_KEY); let s: State; try { s = raw ? migrate(JSON.parse(raw)) : fresh(); } catch (e) { console.warn('save unreadable, starting fresh', e); s = fresh(); }
    this.s = s; const away = Date.now() - (s.last || Date.now()); G.advance(s, Date.now()); const built = G.events.filter((e) => e.kind === 'built').length; G.events.length = 0; D.tickDrops(s); D.refreshMissions(s);
    const pend = G.itemsOf(s, 'bay').map((b) => Math.floor(s.bay[b.id] || 0)).filter((n) => n >= 1); const sum = { credits: pend.reduce((a, b) => a + b, 0), bays: pend.length, ready: Object.keys(s.ready).length, cores: s.cores.filter((c) => c.state === 'ready').length, built };
    this.world = new World($('#gl') as HTMLCanvasElement, s.settings.quality); this.studio = new Studio(this.world.renderer); this.ui = new UI(this);
    this.audio.setVolume(s.settings.sfx); this.audio.mvol = s.settings.music; this.platform.onMute = (m) => this.audio.setMuted(m); if (this.platform.muted()) this.audio.setMuted(true);
    this.world.onTap = (h) => this.tapped(h); this.world.onGhostMove = () => this.validatePlacing();
    this.world.sync(s); const cc = G.itemsOf(s, 'command')[0]; if (cc) { const c = this.world.centerOf(cc); this.world.cam.x = this.world.cam.tx = c.x - 1; this.world.cam.z = this.world.cam.tz = c.z + 1; }
    document.addEventListener('pointerdown', () => { this.audio.unlock(); this.audio.setMusic(this.s.settings.music); }, { once: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save(); else { G.advance(this.s, Date.now()); } });
    window.addEventListener('pagehide', () => this.save());
    requestAnimationFrame((t) => this.loop(t)); this.platform.loadingStop(); const ld = $('#load'); ld.style.opacity = '0'; setTimeout(() => ld.remove(), 500); this.platform.gameplayStart();
    if (raw && away > 10 * 60000) setTimeout(() => this.enqueue(() => this.ui.daily.offlineReport(away, sum)), 600);
    if (!raw) setTimeout(() => this.ui.modal(`<div class="ox sub" style="letter-spacing:.2em">WELCOME, COMMANDER</div><h1>${esc(s.name)}</h1><p class="desc">An asteroid in low Earth orbit, a Command Center, a fabricator and one small, cheerful robot named Helio. Everything else is up to you.</p><p class="desc">Your bots earn credits in their bays. Tap a bay to collect, print Power Cells, feed your crew and grow the colony.</p><button class="btn gold" data-a="closeModal" style="min-width:180px">Let's go!</button>`, true), 400);
    window.__app = this; (window as any).__G = G; (window as any).__daily = D;
  }
  private dayCheck = 0; private spaceCheck = 0;
  private loop(t: number) { const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t; const now = Date.now();
    G.advance(this.s, now); D.tickDrops(this.s, now); if (now > this.spaceCheck) { this.spaceCheck = now + 1000; for (const b of SP.tickSpace(this.s, now)) { this.changed(); this.enqueue(() => this.ui.space.reveal(b)); } } if (now > this.dayCheck) { this.dayCheck = now + 5000; D.refreshMissions(this.s, now); this.placeDrop(); AR.tickArena(this.s, now); const rd = AR.tickRaid(this.s, now); if (rd && rd.kind === 'warn') { this.audio.play('deny'); this.ui.toast("⚠ A Kr'thul raid is coming: defend your colony!", 'bad'); this.platform.notify('raid', Date.now() + 60000, 'Swarm raid incoming!', 'The Kr\'thul arrive in 2 hours. Defend your colony!'); }
      if (rd && rd.kind === 'hit') this.enqueue(() => this.ui.modal(`<div class="ox sub" style="letter-spacing:.2em;color:#ff6b7a">RAID</div><div class="big">🔥</div><h1>The Swarm raided the colony</h1><p class="desc">Nobody stood in their way. They carried off ${fmt(rd.stolen)} credits from your bays.</p><p class="sub">Next time, tap the red Swarm warning at the top and defend with your Arena team.</p><button class="btn gold" data-a="closeModal">We'll be ready</button>`));
      const sr = AR.rollSeason(this.s, now);
      if (sr) this.enqueue(() => this.ui.modal(`<div class="ox sub" style="letter-spacing:.2em">ARENA SEASON ENDED</div><div class="big">🏆</div><h1>${AR.LEAGUES[sr.league][0]}</h1><p class="desc">Your best league this season. Here are your rewards:</p><div class="rewards">${Object.entries(sr.reward).map(([k, n]) => `<span class="cost">${k === 'dm' ? '◆' : k === 'cells' ? '⚡' : 'C'} ${fmt(n)}</span>`).join(' ')}</div><button class="btn gold" data-a="closeModal">Collect</button>`, true)); } this.drain(); this.world.frame(dt, this.s); this.ui.frame();
    if (now > this.saveAt) { this.saveAt = now + 10000; this.save(); }
    requestAnimationFrame((tt) => this.loop(tt)); }
  private drain() { while (G.events.length) { const e = G.events.shift()!;
      if (e.kind === 'levelup') { this.audio.play('levelup'); this.platform.happytime(); const gift = e.lvl % 5 === 0 ? D.giveCore(this.s, e.lvl % 10 === 0 ? 'advanced' : 'standard', e.lvl * 7919 + (this.s.created >>> 0)) : null; this.enqueue(() => this.ui.levelUp(e.lvl, e.reward, gift)); this.ui.renderHud(); }
      else if (e.kind === 'built') { this.audio.play('done'); const p = this.world.topOf(e.item); this.changed(); const it = G.item(this.s, e.item); if (it) { const at = this.world.topOf(it.id); if (at) this.world.burst(at, '#ffd36a', 30); this.ui.toast(`${it.t === 'bay' ? 'Bay' : BUILDINGS[it.t].name} ${e.first ? 'is ready' : `reached level ${e.lvl}`}!`, 'good'); } void p; }
      else if (e.kind === 'crafted') { this.changed(); }
      else if (e.kind === 'discover') { this.ui.toast(`New species in the Botdex: +${e.dm} Dark Matter`, 'gold'); }
      else if (e.kind === 'fused') { this.audio.play('done'); this.changed(); this.ui.toast(`Fusion complete: a ${RARITIES[SPECIES[e.sp].rarity].name} core is in the Assembly Bay`, 'gold'); }
      else if (e.kind === 'booted') { this.audio.play('claim'); this.changed(); this.ui.toast(`A ${RARITIES[SPECIES[e.sp].rarity].name} core has booted: activate it in the Assembly Bay`, 'good'); }
      else if (e.kind === 'core') { this.changed(); }
      else if (e.kind === 'launch') { const p = SP.pad(this.s); this.changed(); if (p) { this.world.launchFx(p.id, SP.rocketTier(p.lvl)); this.audio.play('launch'); } }
      else if (e.kind === 'expBack') { this.audio.play('levelup'); this.changed(); }
      else if (e.kind === 'land') this.changed();
      else if (e.kind === 'dug') { this.audio.play('done'); this.changed(); const at = this.world.topOf(e.item); if (at) this.world.burst(at, '#c49bff', 24); this.ui.toast('Crystals dug up: tap the mine to collect', 'good'); }
      else if (e.kind === 'evolved') { this.platform.happytime(); this.changed(); } }
    if (this.queue.length && $('#modal').classList.contains('hidden')) this.queue.shift()!(); }
  private enqueue(fn: () => void) { this.queue.push(fn); }
  // the drop pod lands on a free tile near the Command Center
  private placeDrop() { const dd = D.daily(this.s); if (dd.drops <= 0) { if (dd.dropAt) { dd.dropAt = null; this.world.sync(this.s); } return; } if (dd.dropAt && G.areaFree(this.s, dd.dropAt[0], dd.dropAt[1], 1, 1)) { if (!this.world.podTop()) this.world.sync(this.s); return; }
    const cc = G.itemsOf(this.s, 'command')[0]; const cx = cc ? cc.x + 2 : 15, cz = cc ? cc.z + 2 : 15; let best: [number, number] | null = null, bd = 1e9;
    for (let x = 0; x < 30; x++) for (let z = 0; z < 30; z++) { if (!G.areaFree(this.s, x, z, 1, 1)) continue; const d = Math.abs(Math.hypot(x - cx, z - cz) - 4.5); if (d < bd) { bd = d; best = [x, z]; } } dd.dropAt = best; this.world.sync(this.s); }
  changed() { this.world.sync(this.s); this.ui.renderObjIfChanged(); this.saveAt = Math.min(this.saveAt, Date.now() + 1500); }
  save() { try { this.platform.save(SAVE_KEY, JSON.stringify(this.s)); } catch (e) { /* storage full */ } this.notifications(); }
  // mobile: remind the player when there is something to collect (no-op on the web)
  private notifications() { if (this.platform.name !== 'mobile') return; const s = this.s, now = Date.now(); let full = Infinity;
    for (const b of G.itemsOf(s, 'bay')) { const r = G.bayRate(s, b.id); if (r > 0) full = Math.min(full, now + ((G.bayCap(b, s) - (s.bay[b.id] || 0)) / r) * 1000); }
    if (isFinite(full)) this.platform.notify('bays', full, 'Your bays are full', 'Your crew has filled their bays with credits. Come and collect!');
    const fab = s.jobs.filter((j) => j.kind === 'craft').map((j) => j.end).sort()[0]; if (fab) this.platform.notify('fab', fab, 'Power Cells ready', 'Your Fabricator has finished printing.');
    const dd = D.daily(s); this.platform.notify('drop', dd.drops ? now + 3600e3 : dd.drop, 'A supply drop has landed', 'Open it before the next one arrives.');
    const tm = new Date(); tm.setDate(tm.getDate() + 1); tm.setHours(19, 0, 0, 0); this.platform.notify('daily', tm.getTime(), 'Your daily reward is waiting', `Day ${dd.day + 1} of your calendar is ready. Keep the streak going!`); }
  // ---------------- taps ----------------
  private tapped(h: { item?: string; plot?: string; tile?: [number, number]; bot?: string; drop?: boolean }) { this.audio.unlock(); const s = this.s;
    if (h.drop) { const top = this.world.podTop(); this.ui.daily.act('drop', document.body); if (top) this.world.burst(top, '#7cf29a', 40); this.placeDrop(); return; }
    if (h.bot) { this.ui.selectBot(h.bot); this.audio.play('tap'); return; }
    if (h.item) { const it = G.item(s, h.item); if (!it) return;
      if (it.t === 'bay' && (s.bay[it.id] || 0) >= 1 && !G.jobOf(s, it.id, 'build')) { this.collect(it); if (this.ui.sel !== it.id) this.ui.select(it.id); return; }
      if (it.t === 'fab' && s.ready[it.id]) { this.harvest(it); this.ui.select(it.id); return; }
      if (it.t === 'mine' && V.vault(s).ready[it.id]) { const r = V.collectMine(s, it); if (r) { this.audio.play('crystal'); const top = this.world.topOf(it.id); if (top) { this.world.burst(top, CRYSTALS[r.color].color, 26); const p = this.world.project(top); this.ui.popText(p.x, p.y - 10, `+${r.n} ${CRYSTALS[r.color].name}`, CRYSTALS[r.color].color); } this.changed(); } if (this.ui.sel !== it.id) this.ui.select(it.id); else this.ui.renderPanel(); return; }
      if (it.t === 'relicbay' && (s.bay[it.id] || 0) >= 1) { this.collect(it); if (this.ui.sel !== it.id) this.ui.select(it.id); return; }
      this.ui.select(this.ui.sel === it.id ? null : it.id); this.audio.play('tap'); return; }
    if (h.plot) { this.askPlot(h.plot); return; }
    this.ui.select(null); }
  collect(it: Item) { const n = G.collectBay(this.s, it); if (!n) return; this.audio.play('collect', n); const ir = it.t === 'relicbay', col = ir ? '#c49bff' : '#ffd36a'; const top = this.world.topOf(it.id); if (top) { this.world.burst(top, col, 18 + Math.min(30, Math.floor(Math.log10(n) * 6))); const p = this.world.project(top); this.ui.popText(p.x, p.y - 10, `+${fmt(n)}${ir ? ' ✦' : ''}`, col); this.ui.flyTo(ir ? 'iridium' : 'credits', p.x, p.y, Math.min(9, 3 + Math.floor(Math.log10(n) * 2))); } this.changed(); this.ui.renderPanel(); }
  harvest(it: Item) { const n = G.harvest(this.s, it); if (!n) return; this.audio.play('harvest'); const top = this.world.topOf(it.id); if (top) { this.world.burst(top, '#9dff5a', 26); const p = this.world.project(top); this.ui.popText(p.x, p.y - 10, `+${fmt(n)} ⚡`, '#9dff5a'); this.ui.flyTo('cells', p.x, p.y, 6); } this.changed(); this.ui.renderPanel(); }
  askPlot(key: string) { const s = this.s, c = G.canBuyPlot(s, key), cost = G.plotCost(s), need = G.plotLevel(s);
    this.ui.modal(`<div class="ox sub" style="letter-spacing:.2em">EXPAND THE ISLAND</div><h1>New land</h1><p class="desc">Tow in another 6×6 slab of asteroid and bolt it to your island: room for more bays, fabricators and decorations.</p><div class="rewards"><span class="cost ${s.res.credits < cost ? 'short' : ''}"><span class="ic cr">C</span>${fmt(cost)}</span></div>${c.ok ? '' : `<p class="why">${esc(c.why || '')}</p>`}<div class="row" style="justify-content:center"><button class="btn" data-a="closeModal">Not now</button><button class="btn gold" data-a="buyPlot" data-k="${key}" ${c.ok ? '' : 'disabled'}>Expand</button></div>${s.lvl < need ? `<p class="sub">Reach Commander level ${need} to expand.</p>` : ''}`); }
  // ---------------- placement ----------------
  startPlacing(g: Ghost) { const s = this.s; if (!g.move) { const [w, d] = G.dims({ t: g.t, r: g.r }); const cx = Math.round(this.world.cam.tx + 15 - w / 2), cz = Math.round(this.world.cam.tz + 15 - d / 2); let best: [number, number] | null = null, bd = 1e9;
      for (let x = 0; x < 30; x++) for (let z = 0; z < 30; z++) if (G.areaFree(s, x, z, w, d)) { const dd = (x - cx) ** 2 + (z - cz) ** 2; if (dd < bd) { bd = dd; best = [x, z]; } }
      if (!best) { this.ui.deny('No free space: expand the island or move things around'); return; } [g.x, g.z] = best; }
    this.world.startGhost(g); this.world.sync(s); this.validatePlacing(); this.ui.select(null); this.audio.play('tap'); }
  validatePlacing() { const g = this.world.ghost; if (!g) return; const [w, d] = G.dims({ t: g.t, r: g.r }); this.world.setGhostOk(G.areaFree(this.s, g.x, g.z, w, d, g.move)); this.ui.renderPlace(); }
  confirmPlacing() { const g = this.world.ghost; if (!g || !g.ok) return; const s = this.s;
    if (g.move) { const it = G.item(s, g.move); if (it && G.moveItem(s, it, g.x, g.z, g.r)) { this.audio.play('place'); this.endPlacing(); this.changed(); this.ui.select(it.id); } return; }
    const r = G.build(s, g.t, g.x, g.z, g.r, g.el); if (!r.ok) { this.ui.deny(r.why); return; } this.audio.play(BUILDINGS[g.t].cat === 'decor' ? 'place' : 'build'); this.changed();
    const at = r.item ? this.world.topOf(r.item.id) : null; if (at) this.world.burst(at, '#6ee7ff', 16);
    // decorations keep placing (paths, trees...) while you can afford them
    if (BUILDINGS[g.t].cat === 'decor' && G.canBuild(s, g.t).ok) { this.validatePlacing(); this.ui.renderPlace(); return; }
    this.endPlacing(); if (r.item && BUILDINGS[g.t].cat !== 'decor') this.ui.select(r.item.id); }
  endPlacing() { this.world.endGhost(); this.world.sync(this.s); this.ui.renderPlace(); }
  // warp to another island: a flash, then the new ground, sky and crew
  travel(key: string, fresh = false) { const s = this.s; if (!fresh && !G.travel(s, key)) return; this.ui.select(null); this.audio.play('whoosh'); const fl = document.createElement('div'); fl.className = 'warp'; document.body.appendChild(fl);
    setTimeout(() => { this.world.sync(s); const hub = G.itemsHere(s, s.at === 'home' ? 'command' : 'hub')[0]; if (hub) { const c = this.world.centerOf(hub); this.world.cam.x = this.world.cam.tx = c.x - 1; this.world.cam.z = this.world.cam.tz = c.z + 1; } this.ui.renderHud(); this.placeDrop(); }, 250);
    setTimeout(() => fl.remove(), 900); if (fresh) setTimeout(() => this.ui.modal(`<div class="ox sub" style="letter-spacing:.2em">NEW ISLAND</div><h1>${esc(ISLANDS[key].name)}</h1><p class="desc">${esc(ISLANDS[key].blurb)}</p><p class="desc" style="color:#7cf29a">★ ${esc(ISLANDS[key].perk || '')}</p><p class="sub">Build bays and fabricators here: bots of any element can live on any island. Use the island button at the top to travel.</p><button class="btn gold" data-a="closeModal">Let's build</button>`, true), 700); this.changed(); }
  setSetting(k: string, v: any) { (this.s.settings as any)[k] = v; if (k === 'sfx') this.audio.setVolume(v); if (k === 'music') this.audio.setMusic(v); if (k === 'quality') { this.save(); this.ui.toast('Graphics change applies after a reload', 'gold'); } this.save(); }
  reset() { this.platform.save(SAVE_KEY, ''); try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* noop */ } location.reload(); }
}
new App().boot().catch((e) => { console.error(e); const l = document.getElementById('load'); if (l) l.innerHTML = `<div style="text-align:center;padding:20px"><div class="logo">STARWARD</div><p>Your device could not start WebGL. Try another browser.</p></div>`; });
