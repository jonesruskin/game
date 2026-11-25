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
import { BUILDINGS, areaSide, GRID } from './data/buildings';
import { DEPOSITS } from './data/sites';
import { TECH } from './data/research';
import { RES } from './data/resources';
import * as SP from './core/space';
import * as RB from './core/robots';
import * as SO from './core/solar';
import * as DY from './core/daily';
import * as WG from './core/war';
import * as STR from './core/stars';
import * as AL from './core/aliens';
import * as CF from './core/conflict';
import * as BY from './core/beyond';
import * as LF from './core/life';
import * as FD from './core/food';
import * as MER from './core/meridian';
import * as STY from './core/style';
import { plotName } from './ui/land';
import * as LD from './core/land';
import { LIFE, RUNGS } from './data/life';
import { specimen } from './render/specimens';
import * as NET from './core/net';
import { Battle, deployLive, surrender, resultOf, canDeployAt, BattleInput } from './core/battle';
import { SPECIES } from './data/species';
import { RARITIES } from './data/rarities';
import type { Design } from './data/rockets';
export class App {
  version = '2.0-dev'; platform: PlatformAPI = Platform; audio = new Audio(); s!: State; R!: Rates; world!: World; studio!: Studio; ui!: UI;
  private last = performance.now(); private acc = 0; private saveAt = 0; private queue: (() => void)[] = []; private placing: { b: string; move?: string } | null = null;
  async boot() {
    await this.platform.init(); this.platform.loadingStart();
    let raw: string | null = null; try { raw = this.platform.load(SAVE_KEY); } catch (e) { raw = null; }
    let s: State | null = null; try { s = raw ? JSON.parse(raw) : null; } catch (e) { s = null; } this.s = s && s.v ? migrate(s) : fresh();
    const away = Date.now() - this.s.last; const before = { ...this.s.res }; const notes = G.advance(this.s, Date.now()); AL.drift(this.s, Math.max(0, away / 1000)); this.R = rates(this.s); this.s.stats.sessions++;
    this.world = new World($('#gl') as HTMLCanvasElement, this.s.settings.quality); this.studio = new Studio(this.world.renderer); this.ui = new UI(this);
    this.world.look = STY.lookOf(this.s); STY.freshUnlocks(this.s); this.world.setWorld(this.s, this.s.at); this.world.sync(this.s); this.world.onTap = (h) => this.tapped(h); this.world.onGhostMove = () => this.ghostMoved();
    const A = G.area(this.s, this.s.at); const c = (A.lo + A.hi) / 2 - GRID / 2; this.world.focus(c, c + 2, 30 + A.side * 0.55); this.world.cam.dist = 30 + A.side * 0.55;
    this.ui.renderHud(); this.ui.renderNav(); this.ui.renderObj(); this.audio.setVolume(this.s.settings.sfx); this.audio.mvol = this.s.settings.music;
    this.platform.onMute = (m) => this.audio.setMuted(m); this.audio.setMuted(this.platform.muted());
    document.addEventListener('pointerdown', () => { this.audio.unlock(); this.audio.startMusic(); }, { once: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.save(); this.scheduleNotes(); } else { this.cancelNotes(); this.tickNow(); } }); window.addEventListener('pagehide', () => this.save());
    (window as any).__app = this; (window as any).__G = G; (window as any).__LD = LD; (window as any).__SO = SO; (window as any).__SP = SP; (window as any).__foundExo = (k: string) => STR.foundExoBase(this.s, k); (window as any).__AL = AL; (window as any).__CF = CF; (window as any).__BY = BY; (window as any).__LF = LF; (window as any).__FD = FD; (window as any).__MER = MER; (window as any).__STRF = STR; (window as any).__D = { TECH, BUILDINGS }; (window as any).__STY = STY; (window as any).__WG = WG; (window as any).__spec = specimen;
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
    if (this.queue.length && $('#modal').classList.contains('hidden') && !this.placing && this.world.mode !== 'battle' && this.world.mode !== 'space') this.queue.shift()!(); // never over a battle
    requestAnimationFrame((tt) => this.loop(tt));
  }
  tickNow() { this.tick(); this.changed(); }
  // local notifications (mobile build only; no-ops elsewhere): the next finished timers, a supply capsule, the daily reward
  private noteIds: string[] = [];
  private scheduleNotes() { const P = this.platform, s = this.s; this.cancelNotes(); const now = Date.now();
    const jobs = s.jobs.filter((j) => j.end > now + 60e3).sort((a, b) => a.end - b.end).slice(0, 3); const label = (j: any) => j.kind === 'research' ? `Research complete: ${TECH[j.tech]?.name || 'a new technology'}` : j.kind === 'bio' ? 'The xenobiologists have results' : j.kind === 'prospect' ? 'A rover has finished its survey' : j.kind === 'claim' ? 'New land is ready to build on' : j.kind === 'build' || j.b ? `${BUILDINGS[j.b]?.name || 'A building'} is ready` : 'A project is complete';
    jobs.forEach((j, i) => { const id = 'job' + i; P.notify(id, j.end, s.name, label(j)); this.noteIds.push(id); });
    const dd = DY.daily(s); if (dd.drop > now) { P.notify('capsule', dd.drop, s.name, 'A supply capsule has landed at the spaceport'); this.noteIds.push('capsule'); }
    const ev = new Date(now); ev.setHours(19, 0, 0, 0); if (ev.getTime() < now + 3600e3) ev.setDate(ev.getDate() + 1); P.notify('daily', ev.getTime(), s.name, 'Your daily reward is waiting'); this.noteIds.push('daily'); }
  private cancelNotes() { for (const id of this.noteIds) this.platform.cancelNotify(id); this.noteIds = []; }
  private tick() {
    const notes = this.batchLand(G.advance(this.s, Date.now())); this.R = rates(this.s); for (const n of notes) this.note(n); if (notes.length) this.changed();
    for (const e of G.events.splice(0)) { if (e.kind === 'starters') this.enqueue(() => this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">ROBOTICS WORKSHOP ONLINE</div><h1>Your first robots</h1><p class="desc">Two robot cores are waiting in the Workshop. Robots make life easier for your people: put each one to work in a building that suits its elements and it boosts that building's output.</p><p class="desc">Build a Robot Dock to house them, then open <b>Robots → Workshop</b> to activate them.</p><button class="btn gold" data-a="closeModal">Let's meet them</button>`, { rays: true })); }
    this.ui.updHud(); this.ui.tick++; if (this.ui.tick % 4 === 0) this.ui.renderObj(); if (this.ui.tick % 12 === 0) this.ui.renderNav();
    // the daily loop: capsules land every 4 hours, missions roll over at midnight, the rail shows what is waiting
    DY.tickDrops(this.s); if (this.ui.tick % 5 === 0) DY.refreshMissions(this.s); WG.tickWar(this.s);
    // contact and conflict: relations drift, civilisations make requests, the Swarm raids
    AL.drift(this.s, 1); for (const n of [...AL.tickAliens(this.s, this.R), ...CF.tickWar(this.s), ...LF.tickLife(this.s)]) this.note(n); if (this.ui.tick % 30 === 11 && this.world.mode === 'base' && !this.ui.over) this.ui.contact.maybePrompt();
    for (const n of MER.tickMeridian(this.s)) { this.ui.toast('🤖 ' + esc(n.text), 'good'); this.changed(); if (this.ui.over === 'research') this.ui.renderOver(); this.ui.renderPanel(); }
    if (this.ui.tick % 5 === 2) for (const n of FD.tickFood(this.s)) { const nm = esc(this.s.bases[n.base]?.name || n.base); this.ui.toast(n.ok ? `${nm} is fed again` : `🍽 ${nm} is going hungry: build farms there (Algae Vats, Greenhouses, Deep Farms) or turn on supply runs from Earth`, n.ok ? 'good' : 'bad'); }
    if (this.ui.tick % 20 === 13) { const nu = STY.freshUnlocks(this.s); if (nu.length) { this.ui.toast(`🎨 New style unlocked: <b>${esc(nu[0].name)}</b>${nu.length > 1 ? ` and ${nu.length - 1} more` : ''} (Style Studio)`, 'gold'); this.ui.renderHud(); } }
    if (this.ui.tick % 60 === 7) NET.pushSnapshot(this.s, { primary: this.world.look.banner.bg, accent: this.world.look.banner.fg });
    if (this.ui.tick % 10 === 3 && WG.unlocked(this.s) && this.world.mode === 'base') { const d = WG.drill(this.s); if (d) this.ui.toast(d.held ? `The Academy drilled your defences: they held (${d.pct}%). Bounty waiting in the Orbital Trials log.` : `The Academy drill broke through (${d.stars}★, ${d.pct}%). Check the replay in the Orbital Trials log.`, d.held ? 'good' : 'bad'); } this.world.setCapsule(this.s, DY.daily(this.s).drops > 0 && this.world.mode === 'base' && !this.placing); this.ui.daily.renderRail();
    // Kardashev milestones pay out dark matter as the civilisation's power grows
    const k = kardashev(this.s, this.R); const m = K_MILESTONES.find((x) => x > (this.s.kMax || 0) && k >= x);
    if (m) { this.s.kMax = m; const dm = kReward(m); this.s.res.dm = (this.s.res.dm || 0) + dm; this.audio.play('levelup'); this.platform.happytime(); this.enqueue(() => this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">KARDASHEV MILESTONE</div><div class="big">${m.toFixed(2)}</div><p class="desc">Your civilisation now commands more power than ever. Reward:</p><div class="rewards">${costHTML({ dm })}</div><button class="btn gold" data-a="closeModal">Onward</button>`, { rays: true })); }
    // Type III: a civilisation that commands the power of a galaxy (once, ever, per programme)
    if (k >= 3 && !BY.bey(this.s).typeIII) { BY.bey(this.s).typeIII = Date.now(); this.audio.play('levelup'); this.platform.happytime(); this.enqueue(() => this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">KARDASHEV TYPE III</div><h1>A galactic civilisation</h1><p class="desc">From one launch pad on Earth to the power of a galaxy: ${k.toFixed(2)} on the Kardashev scale. Every star the relays reach answers to the people you sent out from the domes and the tunnels, the robots that built them and the friends you made in the dark.</p><p class="desc good">Nobody in the Local Group has done this in a million years.</p><button class="btn gold" data-a="closeModal">Onward</button>`, { rays: true })); }
    if (Date.now() > this.saveAt) { this.saveAt = Date.now() + 10000; this.save(); }
  }
  // many surveys finishing at once (back from a break): one summary instead of a stack of toasts
  private batchLand(notes: G.Note[]) { const P = notes.filter((n) => n.kind === 'prospect'); if (P.length < 3) return notes; const found = new Set<string>(); for (const n of P) for (const t of n.found) found.add(t);
    this.ui.toast(`${P.length} surveys complete${found.size ? `: ${[...found].map((t) => esc(DEPOSITS[t].name)).join(', ')} found` : ': nothing below the surface'}`, found.size ? 'gold' : 'good'); this.audio.play('done'); this.world.sync(this.s); return notes.filter((n) => n.kind !== 'prospect'); }
  private note(n: G.Note) {
    if (n.kind === 'prospect') { const [cx, cz] = String(n.key).split(',').map(Number); const B = this.s.bases[n.base]; this.audio.play('done'); this.ui.toast(`Survey of plot ${plotName(cx, cz)}${n.base !== this.s.at && B ? ` on ${esc(B.name)}` : ''} complete: ${n.found.length ? n.found.map((t: string) => esc(DEPOSITS[t].name)).join(', ') + ' found' : 'nothing below the surface'}`, n.found.length ? 'gold' : 'good'); if (n.base === this.s.at) this.world.sync(this.s); return; }
    if (n.kind === 'claim') { const [cx, cz] = String(n.key).split(',').map(Number); const B = this.s.bases[n.base]; this.audio.play('done'); this.ui.toast(`Plot ${plotName(cx, cz)}${n.base !== this.s.at && B ? ` on ${esc(B.name)}` : ''} is yours: more room to build`, 'gold'); if (n.base === this.s.at) { this.world.sync(this.s); const p = { x: (cx + 0.5) * 6 - GRID / 2, y: 1, z: (cz + 0.5) * 6 - GRID / 2 }; this.world.burst(p as any, '#ffd36a', 36); } return; }
    if (n.kind === 'build') { const d = BUILDINGS[n.b]; this.audio.play('done'); const at = this.world.topOf(n.item); if (at) this.world.burst(at, '#ffd36a', 28); this.ui.toast(`${esc(d.name)} ${n.first ? 'is ready' : `reached level ${n.lvl}`}`, 'good'); if (n.b === 'warroom' && n.first && !this.s.flags.trialsBrief) { this.s.flags.trialsBrief = 1; this.enqueue(() => this.ui.modal(this.ui.war.briefHTML(), { wide: true })); } if (n.b === 'hq') { this.platform.happytime(); if (areaSide('earth', n.lvl) > areaSide('earth', n.lvl - 1)) this.ui.toast('The spaceport grows: more room to build', 'gold'); } }
    else if (n.kind === 'core') { this.audio.play('claim'); this.ui.toast(`${n.fused ? 'Fusion complete' : 'Core assembled'}: a ${RARITIES[SPECIES[n.sp].rarity].name} core is ready to activate (Robots → Workshop)`, 'gold'); this.ui.renderNav(); if (this.ui.over === 'robots') this.ui.renderOver(); }
    else if (n.kind === 'rocket') { this.audio.play('done'); this.ui.toast(`${esc(n.name)} is assembled and waiting on the pad`, 'good'); this.ui.renderNav(); if (this.ui.over === 'launch') this.ui.renderOver(); }
    else if (n.kind === 'mission') { this.audio.play('levelup'); this.platform.happytime(); if (n.base) { this.ui.renderHud(); this.enqueue(() => this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">HUMANITY'S FIRST HOME OFF EARTH</div><h1>${esc(this.s.bases[n.base].name)}</h1><p class="desc">Prefabricated habitats, a power plant and a crew of colonists on the Moon. They need housing, water and air: build Ice Mines, a Habitat Dome or an Underground Habitat, and let your robots do the digging.</p><button class="btn gold" data-a="travel" data-k="${n.base}">Go to the Moon</button> <button class="btn" data-a="closeModal">Later</button>`, { rays: true })); } else if (n.first) this.enqueue(() => this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">MISSION ACCOMPLISHED</div><h1>${esc(n.name)}</h1>${n.reward ? `<div class="rewards">${costHTML(n.reward)}</div>` : ''}<button class="btn gold" data-a="closeModal">Onward</button>`, { rays: true })); else this.ui.toast(`${esc(n.name)} complete`, 'good'); }
    else if (n.kind === 'sat' || n.kind === 'module') { this.audio.play('levelup'); this.ui.toast(`${esc(n.name)}: in orbit and working`, 'gold'); this.ui.renderNav(); }
    else if (n.kind === 'fail') { this.audio.play('deny'); this.ui.toast(`${esc(n.name)} failed. The engineers learned something: +${fmt(n.sci)} science`, 'bad'); }
    else if (n.kind === 'survey') { this.audio.play('levelup'); this.ui.toast(`Survey complete: ${esc(SO.BODIES[n.body].name)} is mapped`, 'gold'); }
    else if (n.kind === 'terra') { this.audio.play('levelup'); this.platform.happytime(); const T = SO.TERRA[n.body], st = T.stages[n.stage]; if (this.s.at === n.body && this.world.mode === 'base') { this.world.setWorld(this.s, n.body); this.world.sync(this.s); }
      this.enqueue(() => this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">${esc(SO.BODIES[n.body].name.toUpperCase())} · STAGE ${n.stage + 1} OF ${T.stages.length}</div><h1>${esc(st.name)}</h1><p class="desc">${esc(st.desc)}</p>${n.last ? '<p class="desc good">Terraforming is complete. A new living world.</p>' : ''}${this.s.at !== n.body ? `<button class="btn gold" data-a="travel" data-k="${n.body}">See it</button> ` : ''}<button class="btn" data-a="closeModal">${this.s.at === n.body ? 'Look around' : 'Later'}</button>`, { rays: true })); this.ui.renderHud(); }
    else if (n.kind === 'exoterra') { const st = STR.EXO_TERRA_LIST[n.stage]; this.audio.play('levelup'); this.platform.happytime(); if (this.s.at === n.key && this.world.mode === 'base') { this.world.setWorld(this.s, n.key); this.world.sync(this.s); }
      this.enqueue(() => this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">${esc((this.s.bases[n.key]?.name || '').toUpperCase())} · STAGE ${n.stage + 1} OF ${STR.EXO_TERRA_LIST.length}</div><h1>${esc(st.name)}</h1><p class="desc">${esc(st.desc)}</p>${n.last ? '<p class="desc good">Worldseeding is complete: a living world under another sun.</p>' : ''}${this.s.at !== n.key ? `<button class="btn gold" data-a="travel" data-k="${n.key}">Go and see</button> ` : ''}<button class="btn" data-a="closeModal">Close</button>`, { rays: !!n.last })); }
    else if (n.kind === 'hrelay') { this.audio.play('levelup'); this.ui.toast(`A Hollow relay wakes: the network reaches ${n.stage} galax${n.stage === 1 ? 'y' : 'ies'}`, 'gold'); }
    else if (n.kind === 'expedition') { const E = BY.EXPEDITIONS[n.gal]; this.audio.play('levelup'); this.platform.happytime(); this.enqueue(() => this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">${esc(BY.GALAXIES[n.gal].name.toUpperCase())}</div><h1>${esc(E.name)}</h1><p class="desc">${esc(E.story)}</p><p class="desc good">${esc(E.perkText)}, for ever.</p><button class="btn gold" data-a="closeModal">Onward</button>`, { rays: true })); }
    else if (n.kind === 'lifeSignal') { this.audio.play('claim'); this.ui.toast(`Biosignature: something is alive out there (${esc(LIFE[n.life].home.split(',')[0])}). Open Life to search for it.`, 'gold'); this.ui.daily.renderRail(); }
    else if (n.kind === 'lifeFound') { const e = LF.entry(this.s, n.life); this.audio.play('levelup'); if (this.ui.over === 'life') this.ui.renderOver(); this.ui.daily.renderRail(); if (!e) return;
      if (n.first || e.rung >= 3) { this.platform.happytime(); const R = RUNGS[e.rung]; this.enqueue(() => this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">${n.first ? 'WE ARE NOT ALONE' : `RUNG ${R.num} · ${R.name.toUpperCase()}`}</div><img class="plate" src="${specimen({ id: e.id, art: e.art, col: e.col, seed: e.seed, rung: e.rung, size: e.size }, 320)}" width="160" height="160" alt="" style="margin:10px auto;display:block"><h1>${esc(e.name)}</h1><p class="desc">${esc(e.lore || '')}</p>${n.first ? '<p class="desc good">The first life ever found beyond Earth. Every textbook just changed.</p>' : ''}${n.dm ? `<div class="rewards"><span>+${n.dm} dark matter: a new rung on the Life Ladder</span></div>` : ''}<button class="btn gold" data-a="life">🧬 Open Life</button> <button class="btn" data-a="closeModal">Later</button>`, { rays: true })); }
      else this.ui.toast(`Found: <b>${esc(e.name)}</b>${n.dm ? ` · new rung on the Life Ladder (+${n.dm} dark matter)` : ''}`, 'gold'); }
    else if (n.kind === 'lifeStudy') { const e = LF.entry(this.s, n.life); this.audio.play(n.lvl >= 3 ? 'levelup' : 'done'); if (e) this.ui.toast(n.lvl >= 3 ? `${esc(e.name)} fully catalogued: <b>${esc(e.giftText || '')}</b>` : `${esc(e.name)}: study ${n.lvl} of 3 complete`, n.lvl >= 3 ? 'gold' : 'good'); if (this.ui.over === 'life') this.ui.renderOver(); this.ui.daily.renderRail(); }
    else if (n.kind === 'outbreak') { this.audio.play('deny'); this.ui.daily.renderRail(); const claim = n.okind === 'claim'; const firstLitho = claim && !LF.life(this.s).found.lithophages;
      if (firstLitho || !claim) this.enqueue(() => this.ui.modal(`<div class="ox" style="letter-spacing:.2em;color:#ff8a8a">☣ OUTBREAK</div><h1>${claim ? `Something is eating the ore at ${esc(n.name)}` : `Spores in the domes at ${esc(n.name)}`}</h1><p class="desc">${claim ? 'The drill crews found crystal growths along the ore seams, spreading by the hour. They are alive, and they like iron. The claim\'s output is halved until we deal with them.' : 'The native life of this world has found its way through the air filters. Nobody is ill, yet, but the colony has stopped growing until the domes are clean.'}</p><p class="desc">Contain it now, or study it and learn what it is.</p><button class="btn gold" data-a="life">🧬 Deal with it</button> <button class="btn" data-a="closeModal">Later</button>`));
      else this.ui.toast(`☣ Lithophages are spreading at ${esc(n.name)} (Life)`, 'bad'); if (this.ui.over === 'life') this.ui.renderOver(); }
    else if (n.kind === 'outbreakEnd') { this.ui.toast(`The outbreak at ${esc(n.name)} has burnt itself out`, 'good'); this.ui.daily.renderRail(); if (this.ui.over === 'life') this.ui.renderOver(); }
    else if (n.kind === 'rung') { this.audio.play('levelup'); this.ui.toast(`New rung on the Life Ladder: <b>${esc(RUNGS[n.rung].name)}</b> (+${n.dm} dark matter)`, 'gold'); }
    else if (n.kind === 'request') { const d = AL.allSpecies()[n.sp]; this.audio.play('claim'); this.ui.toast(`${esc(d.name)} has a request (Contact)`, 'gold'); }
    else if (n.kind === 'reqExpired') { this.ui.toast(`A request from ${esc(AL.allSpecies()[n.sp].name)} went unanswered`, 'bad'); }
    else if (n.kind === 'decipher') { this.audio.play('levelup'); this.ui.toast(`${esc(AL.allSpecies()[n.sp].name)}: language ${n.und}% understood`, 'gold'); }
    else if (n.kind === 'embassy') { this.audio.play('done'); this.ui.toast(`Embassy to the ${esc(AL.allSpecies()[n.sp].name)}: level ${n.lvl}`, 'good'); }
    else if (n.kind === 'uplift') { this.audio.play('levelup'); this.platform.happytime(); this.ui.toast(`The ${esc(AL.allSpecies()[n.sp].name)} take their first steps toward the stars`, 'gold'); }
    else if (n.kind === 'dig') { this.audio.play('levelup'); this.ui.toast(`The Hollow ruins: level ${n.lvl} excavated`, 'gold'); }
    else if (n.kind === 'warship') { this.audio.play('done'); this.ui.toast(`${n.n} × ${esc(CF.WARSHIPS[n.ship].name)} join the fleet`, 'good'); }
    else if (n.kind === 'defence') { this.audio.play('done'); this.ui.toast(`Defences raised to level ${n.lvl}`, 'good'); }
    else if (n.kind === 'fleetMoved') { this.ui.toast('The fleet has arrived', 'good'); }
    else if (n.kind === 'raidIncoming') { this.audio.play('deny'); const r = n.raid; this.ui.toast(r.target === 'earth' ? `⚠ The Swarm is coming for Cape Horizon: landing in ${fmtTime((r.eta - Date.now()) / 1000)}. Check Defence Command.` : `⚠ Kr'thul assault inbound to ${esc(r.name)} in ${fmtTime((r.eta - Date.now()) / 1000)}`, 'bad'); }
    else if (n.kind === 'raidResult' || n.kind === 'assault') { const r = n.rep; this.audio.play(r.win ? 'levelup' : 'deny'); const title = `${r.kind === 'assault' ? 'Assault on' : r.kind === 'landing' ? 'Swarm landing at' : 'Swarm attack on'} ${r.name}`;
      this.enqueue(() => this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">${r.win ? (r.kind === 'assault' ? 'VICTORY' : 'DEFENCE HELD') : r.kind === 'assault' ? 'REPULSED' : 'BREACHED'}</div><h1>${esc(title)}</h1><p class="desc">${r.loot && r.kind !== 'assault' ? `They carried off ${Object.entries(r.loot).map(([k, v]: any) => `${fmt(v)} ${esc(RES[k].name.toLowerCase())}`).join(' and ')}.` : r.loot ? `Spoils: ${Object.entries(r.loot).map(([k, v]: any) => `${fmt(v)} ${esc(RES[k].name.toLowerCase())}`).join(', ')}.` : r.salvage ? `Salvage: ${Object.entries(r.salvage).map(([k, v]: any) => `${fmt(v)} ${esc(RES[k].name.toLowerCase())}`).join(', ')}.` : ''}</p><button class="btn gold" data-a="watchBattle" data-i="0">▶ Watch the battle</button> <button class="btn" data-a="closeModal">Close</button>`, { rays: r.win })); }
    else if (n.kind === 'sail') { this.audio.play('levelup'); this.ui.toast(`Light sail arrived: ${esc(STR.STARS[n.star].name)} is surveyed`, 'gold'); if (n.story) this.enqueue(() => this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">EPSILON ERIDANI</div><h1>A lighthouse</h1><p class="desc">The sail's cameras find a structure in the inner belt, older than our species, still transmitting. Whoever built it wanted to be found.</p><button class="btn gold" data-a="closeModal">Onward</button>`, { rays: true })); }
    else if (n.kind === 'drive') { this.audio.play('done'); this.ui.toast(`The ${esc(STR.DRIVES[n.ship].name)} leaves the shipyard`, 'gold'); }
    else if (n.kind === 'mega') { this.audio.play('levelup'); this.platform.happytime(); this.ui.toast(`${esc(STR.MEGA[n.mega].name)}: stage ${n.stage + 1} complete`, 'gold'); }
    else if (n.kind === 'gatebuild') { this.audio.play('levelup'); this.ui.toast(`A wormhole gate opens at ${esc(STR.STARS[n.star].name)}`, 'gold'); }
    else if (n.kind === 'develop') { this.audio.play('done'); this.ui.toast(`${esc(this.s.bases[n.key]?.name || 'A star colony')} reaches level ${n.lvl}`, 'good'); }
    else if (n.kind === 'starcolony') { const life = AL.discoverLife(this.s, n.star, +n.key.split(':')[1]); if (life) this.ui.toast(`Life on ${esc(n.name)}: ${esc(life)} (+600 xenodata)`, 'gold'); this.audio.play('levelup'); this.platform.happytime(); this.ui.renderHud(); this.enqueue(() => this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">${n.first ? "HUMANITY'S FIRST STAR COLONY" : 'A NEW WORLD UNDER ANOTHER SUN'}</div><h1>${esc(n.name)}</h1><p class="desc">The settlers wake from their long sleep under the light of ${esc(STR.STARS[n.star].name)}. Robots unfold the first habitats; the rest of the world waits to be developed.</p><button class="btn gold" data-a="travel" data-k="${n.key}">Visit the colony</button> <button class="btn" data-a="closeModal">Later</button>`, { rays: true })); }
    else if (n.kind === 'relay') { this.audio.play('done'); this.ui.toast(`Relays around ${esc(SO.BODIES[n.body].name)} online: level ${n.lvl}`, 'good'); }
    else if (n.kind === 'ship') { this.audio.play('done'); this.ui.toast(`The ${esc(SO.SHIPS[n.ship].name)} leaves the shipyard`, 'good'); }
    else if (n.kind === 'voyage') { this.audio.play('levelup'); this.platform.happytime(); if (n.founded) this.enqueue(() => this.ui.modal(`<div class="ox muted" style="letter-spacing:.2em">A NEW WORLD</div><h1>${esc(this.s.bases[n.body].name)}</h1><p class="desc">Colonists step out onto ${esc(SO.BODIES[n.body].name)}. Keep them housed, watered and breathing, and they will build a civilisation.</p><button class="btn gold" data-a="travel" data-k="${n.body}">Visit the colony</button> <button class="btn" data-a="closeModal">Later</button>`, { rays: true })); else this.ui.toast(`${esc(n.name)}: done${n.people ? ` (+${n.people} colonists)` : ''}`, 'gold'); this.ui.renderHud(); }
    else if (n.kind === 'research') { this.audio.play('levelup'); this.ui.toast(`Research complete: <b>${esc(TECH[n.tech].name)}</b>`, 'gold'); this.ui.renderNav(); if (this.ui.over === 'research') this.ui.renderOver(); }
  }
  changed() { this.R = rates(this.s); this.world.sync(this.s); this.syncPad(); if (this.world.orbit) this.world.orbit.sync(SP.sp(this.s)); this.ui.renderObj(); this.ui.renderPanel(); this.ui.renderNav(); this.ui.updHud(); this.saveAt = Math.min(this.saveAt, Date.now() + 1500); }
  // the next rocket in the hangar stands on the pad
  private syncPad() { const pad = this.s.bases.earth.items.find((i) => i.b === 'launch' && i.lvl > 0); const S = SP.sp(this.s); const id = Object.keys(S.hangar).find((k) => S.hangar[k] > 0); const d = id ? SP.designOf(this.s, id) : null; this.world.setPadRocket(this.s.at === 'earth' && !this.s.jobs.some((j) => j.kind === 'mission' && Date.now() - j.start < 12000) ? d : null, pad ? pad.id : null); }
  launched(d: Design) { const pad = this.s.bases.earth.items.find((i) => i.b === 'launch'); if (this.world.mode !== 'base') this.toBase(); if (pad && this.s.at === 'earth') this.world.launchFx(d, pad.id); this.audio.play('launch'); this.ui.toast(`Liftoff! ${esc(d.name)} is on its way`, 'gold'); this.changed(); this.ui.renderNav(); }
  openMap() { this.ui.select(null); this.ui.stars.clearLabels(); this.ui.beyond.clearLabels(); this.world.openSystem(); document.body.classList.add('mapping'); this.ui.solar.sel = this.ui.solar.sel || null; this.ui.renderNav(); this.ui.renderPanel(); this.world.onPick = (b) => { this.ui.solar.sel = b; this.ui.solar.fleet = false; this.world.mapSel = b; if (b) this.world.system?.setFocus(b); this.ui.renderPanel(); if (b) this.audio.play('tap'); }; }
  openGalaxy() { this.ui.select(null); this.ui.stars.clearLabels(); this.ui.solar.clearLabels(); const G = this.world.openGalaxy(); document.body.classList.add('mapping'); this.world.onGalaxyPick = (id) => { this.ui.beyond.sel = id; G.setFocus(id); this.ui.renderPanel(); if (id) this.audio.play('tap'); }; this.ui.renderNav(); this.ui.renderPanel(); }
  megaCost(id: string, n: number) { return STR.megaCost(id, n); }
  ascendNow() { const n = BY.ascend(this.s); if (!n) return; this.s = n as any; this.save(); location.reload(); }
  openStars() { this.ui.select(null); this.ui.solar.clearLabels(); this.ui.beyond.clearLabels(); const M = this.world.openStars(); document.body.classList.add('mapping'); this.world.onStarPick = (id) => { this.ui.stars.sel = id; M.setFocus(id); this.ui.renderPanel(); if (id) this.audio.play('tap'); }; this.ui.renderNav(); this.ui.renderPanel(); }
  toBase() { this.world.closeOrbit(); document.body.classList.remove('orbiting', 'mapping'); this.ui.solar.clearLabels(); this.ui.stars.clearLabels(); this.ui.beyond.clearLabels(); this.ui.renderNav(); this.ui.renderPanel(); }
  travel(base: string) { if (!this.s.bases[base]) return; this.toBase(); this.ui.select(null); this.s.at = base; this.world.setWorld(this.s, base); this.world.sync(this.s); const A = G.area(this.s, base); const c = (A.lo + A.hi) / 2 - GRID / 2; this.world.cam.x = this.world.cam.tx = c; this.world.cam.z = this.world.cam.tz = c + 2; this.world.cam.dist = this.world.cam.tdist = 26 + A.side * 0.6; this.audio.play('whoosh'); this.ui.renderHud(); this.changed(); if (LD.askSite(this.s, base)) this.enqueue(() => this.ui.modal(this.ui.land.sitePickHTML(base), { wide: true })); }
  openOrbit(f: 'earth' | 'station') { this.ui.select(null); this.world.openOrbit(SP.sp(this.s)); this.world.orbit!.setFocus(f); document.body.classList.add('orbiting'); this.ui.renderNav(); }
  closeOrbit() { this.world.closeOrbit(); document.body.classList.remove('orbiting'); this.ui.renderNav(); }
  enqueue(fn: () => void) { this.queue.push(fn); }
  // ---------------- taps ----------------
  private tapped(h: { item?: string; cell?: [number, number]; drop?: boolean }) {
    if (this.placing) return; if (h.drop) { this.openDropNow(); return; }
    if (this.world.land.mode) { if (h.cell) this.ui.land.tapCell(h.cell[0], h.cell[1]); return; }
    if (h.item) { const it = G.itemOf(this.s, this.s.at, h.item); if (it && this.R.item[it.id] && (it.held || 0) >= 1 && this.ui.sel !== it.id) { this.collect(it.id); } this.ui.select(h.item); this.audio.play('tap'); return; }
    this.ui.select(null);
  }
  // ---------------- War Games ----------------
  battle: { B: Battle; live: boolean; opp: WG.Opp | null; who: string } | null = null;
  private oppLook(o: { primary: string; accent: string } | null) { return o ? { primary: '#e9eef5', accent: o.accent, banner: { bg: o.primary, fg: o.accent, emblem: 'star' } } : this.world.look; }
  startAttack(i: number) { const s = this.s, Wr = WG.war(s); const opp = Wr.opps[i]; if (!opp) return; const input = WG.beginSortie(s, opp); if (!input) { this.ui.deny(WG.canAttack(s).why); return; }
    this.ui.closeOver(); this.ui.select(null); const bv = this.world.openBattle(input, this.oppLook(opp.look), true); this.battle = { B: bv.B!, live: true, opp, who: opp.name }; this.ui.war.sel = 0; document.body.classList.add('battling'); this.ui.war.hud(bv.B!, true, opp.name);
    bv.onTick = () => this.ui.war.upd(bv.B!); bv.onOver = () => this.battleOver(); this.world.onBattleTap = (x, z) => this.battleTap(x, z); this.audio.play('launch'); this.save(); }
  private battleTap(x: number, z: number) { const b = this.battle; if (!b || !b.live || b.B.over) return; const bv = this.world.battle!; const i = this.ui.war.sel;
    if (b.B.used[i]) { const n = b.B.used.findIndex((u) => !u); if (n < 0) return; this.ui.war.sel = n; }
    if (!canDeployAt(b.B, x, z)) { bv.flash(x, z, false); this.audio.play('deny'); const h = document.getElementById('bhint'); if (h) { h.textContent = 'Not on the base (the red land): land your robots outside it.'; h.classList.add('warn'); } return; }
    if (deployLive(b.B, this.ui.war.sel, x, z)) { bv.flash(x, z, true); this.audio.play('place'); const n = b.B.used.findIndex((u, k) => !u && k !== this.ui.war.sel); this.ui.war.sel = n < 0 ? this.ui.war.sel : n; this.ui.war.upd(b.B); document.getElementById('bhint')?.classList.add('hidden'); } }
  endAttack() { const b = this.battle; if (!b) return; if (b.live && !b.B.over) surrender(b.B); }
  private battleOver() { const b = this.battle; if (!b) return; if (!b.live) { this.ui.toast('Replay finished', 'good'); return; } b.live = false; const r = resultOf(b.B); const opp = b.opp!; const out = WG.settle(this.s, opp, b.B.input, r);
    // a real commander: the server re-runs the battle and owns the trophy count
    NET.submit(this.s, opp, b.B.input, r).then((sv) => { if (!sv) return; const Wr = WG.war(this.s); Wr.trophies = sv.trophies; Wr.best = Math.max(Wr.best, sv.trophies); if (Wr.hist[0]) Wr.hist[0].dT = sv.dT; this.save(); }); this.audio.play(r.stars ? 'levelup' : 'deny'); if (r.stars >= 2) this.platform.happytime();
    window.setTimeout(() => { this.ui.war.hideHud(); this.ui.war.result(r, out, b.who); }, 900); this.changed(); this.save(); }
  replay(input: BattleInput, look: { primary: string; accent: string } | null, who: string) { this.ui.closeOver(); const bv = this.world.openBattle(JSON.parse(JSON.stringify(input)), look ? this.oppLook(look) : this.world.look, false); this.battle = { B: bv.B!, live: false, opp: null, who }; document.body.classList.add('battling'); this.ui.war.hud(bv.B!, false, who); bv.onTick = () => this.ui.war.upd(bv.B!); bv.onOver = () => this.battleOver(); }
  closeBattle() { this.battle = null; this.world.closeBattle(); document.body.classList.remove('battling'); this.ui.war.hideHud(); this.ui.renderNav(); this.ui.renderPanel(); this.world.sync(this.s); }
  watchSpace(res: any, title: string) { this.ui.select(null); const V = this.world.openSpace(res); document.body.classList.add('battling'); this.ui.fleet.hud(title); V.onRound = () => this.ui.fleet.updHud(); V.onDone = () => { const el = document.getElementById('sres'); if (el) el.innerHTML = `<div class="banner ${res.win ? 'good' : 'bad'}">${res.win ? 'The attackers win' : 'The defenders hold'}</div>`; }; }
  closeSpace() { this.world.space?.clear(); this.world.closeOrbit(); document.body.classList.remove('battling'); this.ui.fleet.hideHud(); this.ui.renderNav(); this.ui.renderPanel(); this.world.sync(this.s); }
  openDropNow() { const at = this.world.capsulePos(); const r = DY.openDrop(this.s); if (!r) return; this.audio.play('levelup'); if (at) { at.y += 1; this.world.burst(at, '#ffd36a', 36); } this.world.setCapsule(this.s, false); this.ui.daily.reveal('SUPPLY CAPSULE', '📦', r.res, r.gift); this.changed(); this.ui.daily.renderRail(); }
  focusCapsule() { const p = this.world.capsulePos(); if (p) { this.world.focus(p.x, p.z, 24); this.ui.toast('A supply capsule has landed: tap it to open', 'good'); } else this.openDropNow(); }
  collect(id: string) {
    const r = G.collect(this.s, this.s.at, id, this.R); if (!r) return; if (r.n <= 0) { this.ui.toast(`${RES[r.r].name} storage is full. Build or upgrade a Logistics Depot.`, 'bad'); this.audio.play('deny'); return; }
    this.audio.play('collect', r.n); const at = this.world.topOf(id); if (at) { this.world.burst(at, RES[r.r].color, 16 + Math.min(24, Math.floor(Math.log10(r.n) * 5))); const p = this.world.project(at); this.ui.popText(p.x, p.y - 10, `+${fmt(r.n)} ${RES[r.r].icon}`, RES[r.r].color); }
    if (r.full) this.ui.toast(`${RES[r.r].name} storage is full: the rest stays in the building.`, 'bad'); this.changed();
  }
  // ---------------- placement ----------------
  private wallDir: [number, number] = [1, 0];
  startPlacing(b: string, move?: string, at?: [number, number]) {
    const s = this.s; let x = 0, z = 0, r = 0; if (move) { const it = G.itemOf(s, s.at, move)!; x = it.x; z = it.z; r = it.r; } else { const sp = at || G.freeSpot(s, s.at, b); if (!sp) { this.ui.deny('No room left: claim more land (Land) or raise the command level'); return; } [x, z] = sp; }
    this.placing = { b, move }; this.ui.select(null); this.world.startGhost({ b, r, x, z, move, ok: true }); this.ghostMoved(); const [w, d] = G.dims(b, r); this.world.focus(x + w / 2 - GRID / 2, z + d / 2 - GRID / 2);
    const el = $('#place'); el.classList.remove('hidden'); el.innerHTML = `<span class="lbl">${move ? 'Move' : 'Place'} ${esc(BUILDINGS[b].name)}<i class="gnd"></i></span><button class="btn small" data-a="rotate">⟳ Rotate</button><button class="btn small red" data-a="unplace">✕</button><button class="btn small gold" data-a="place" id="placeOk">✓ ${move ? 'Move here' : 'Build here'}</button>`; this.ghostMoved();
    this.world.sync(s);
  }
  private ghostMoved() { const g = this.world.ghost; if (!g) return; const f = G.fits(this.s, this.s.at, g.b, g.x, g.z, g.r, g.move); g.ok = f.ok; this.world.syncGhost(); const b = $('#placeOk') as HTMLButtonElement; if (b) b.disabled = !g.ok; const lb = $('#place .gnd'); if (lb) { const t = g.ok ? this.ui.land.ghostLine(this.s.at, g.b, g.x, g.z, g.r) : f.why || ''; lb.textContent = t; lb.className = 'gnd ' + (g.ok ? 'good' : 'bad'); } }
  confirmPlace() {
    const g = this.world.ghost, P = this.placing; if (!g || !P) return; const s = this.s;
    const r = P.move ? G.moveItem(s, s.at, P.move, g.x, g.z, g.r) : G.startBuild(s, s.at, g.b, g.x, g.z, g.r);
    if (!r.ok) { this.ui.deny(r.why); return; } this.audio.play(P.move ? 'place' : 'build'); this.cancelPlace();
    // walls: keep placing, one block further along the line, until the limit or the money runs out
    if (!P.move && BUILDINGS[g.b].instant && G.canBuild(s, s.at, g.b).ok) { const dx = this.wallDir[0], dz = this.wallDir[1]; const tries: [number, number][] = [[dx, dz], [dz, dx], [-dz, -dx], [-dx, -dz]]; const next = tries.map(([a, b]) => [g.x + a, g.z + b] as [number, number]).find(([x, z]) => G.fits(s, s.at, g.b, x, z, 0).ok);
      if (next) { this.wallDir = [next[0] - g.x, next[1] - g.z]; this.changed(); this.startPlacing(g.b, undefined, next); return; } }
    if (!P.move && r.item && !BUILDINGS[g.b].instant) { this.ui.select(r.item.id); } this.changed();
  }
  cancelPlace() { this.placing = null; this.world.endGhost(); $('#place').classList.add('hidden'); this.world.sync(this.s); }
  // ---------------- settings & save ----------------
  setSetting(k: string, v: any) { (this.s.settings as any)[k] = v; if (k === 'sfx') this.audio.setVolume(v); if (k === 'music') this.audio.setMusic(v); this.save(); }
  save() { try { this.s.last = Math.max(this.s.last, Date.now()); this.platform.save(SAVE_KEY, JSON.stringify(this.s)); } catch (e) { /* storage full */ } }
  reset() { this.s = fresh(); this.save(); location.reload(); }
}
new App().boot();
