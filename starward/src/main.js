// STARWARD: app shell. Boot, offline catch-up report, the loop, input (pan / zoom / tap), views, saving, ads.
import { Platform } from './platform.js';
import { load, save, fresh, SAVE_KEY } from './core/state.js';
import * as G from './core/game.js';
import { BaseView } from './render/base.js';
import { OrbitView } from './render/orbit.js';
import { SystemView } from './render/system.js';
import { StarsView } from './render/stars.js';
import { STARS, DRIVES, MEGA } from './data/stars.js';
import * as AL from './core/aliens.js';
import * as WR from './core/war.js';
import * as BY from './core/beyond.js';
import { BODIES, SHIPS, TERRA, SITES } from './data/solar.js';
import * as SO from './core/solar.js';
import * as SP from './core/space.js';
import { ROCKETS, ROCKET_ORDER, SATS, MODULES, MISSIONS } from './data/space.js';
import { UI } from './ui/ui.js';
import { Audio } from './audio.js';
import { BUILDINGS } from './data/buildings.js';
import { TECH } from './data/research.js';
import { RES } from './data/resources.js';
import { CHAPTERS } from './data/objectives.js';
import { fmt, fmtTime, $, clamp } from './util.js';

const esc2 = (t) => String(t).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
class App {
  constructor() { this.base = 'earth'; this.view = 'base'; this.scene = 'earth'; this.audio = new Audio(); this.ui = new UI(this); this.last = performance.now(); this.saveT = 0; window.__app = this; }
  async boot() {
    Platform.loadingStart(); await Platform.init(); this.s = load(Platform.storage()); const s = this.s; s.stats.sessions++;
    try { await Promise.race([Promise.all([document.fonts.load('600 20px Oxanium'), document.fonts.load('500 15px Barlow')]), new Promise((r) => setTimeout(r, 1500))]); } catch (e) {}
    const away = (Date.now() - s.last) / 1000; const before = { ...s.res }; const notes = G.advance(s, Date.now()); this.R = G.rates(s);
    this.bv = new BaseView($('#base')); this.orbit = new OrbitView($('#gl'), $('#fx')); this.system = new SystemView(this.orbit.g, $('#fx')); this.stars = new StarsView(this.orbit.g, $('#fx')); this.mapMode = 'sol'; this.syncPad(); this.ui.init(); this.applySettings(); this.layout(); addEventListener('resize', () => this.layout()); this.bindInput();
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.persist(); this.audio.suspend(); } else { this.audio.resume(); this.catchUp(); } });
    addEventListener('pagehide', () => this.persist());
    Platform.onMuteChange = (m) => this.audio.setMuted(m); this.audio.setMuted(Platform.muteAudioSetting());
    $('#boot').classList.add('gone'); setTimeout(() => $('#boot') && $('#boot').remove(), 700); Platform.loadingStop(); this.state = 'ready';
    if (!s.tut) this.intro(); else if (away > 90) this.report(away, before, notes);
    requestAnimationFrame((t) => this.frame(t));
  }
  applySettings() { const st = this.s.settings; this.audio.setVolume(st.sfx); this.audio.setMusic(st.music); if (this.bv) this.bv.dayLock = st.dayNight === 'day' ? 1 : st.dayNight === 'night' ? 0 : null; }
  layout() { const W = innerWidth, H = innerHeight; const dpr = Math.min(devicePixelRatio || 1, 2); const port = H > W; document.body.classList.toggle('port', port); this.bv.padR = port ? 0 : 0; this.bv.resize(W, H, dpr); this.orbit.resize(W, H, dpr); this.system.resize(W, H, dpr); this.stars.resize(W, H, dpr); }
  // scenes: earth / moon (isometric bases) and orbit (3D); research and launch are overlays above the scene
  setView(v, arg) {
    if (v === 'base') v = this.scene;
    if (v === 'moon' && !this.s.bases.moon) v = 'earth';
    const isBase = !!this.s.bases[v];
    if (isBase || v === 'orbit' || v === 'system') { if (this.scene !== v) { if (this.scene === 'system') { this.ui.sys.open(null); this.ui.stars.open(null); this.system.sel = null; this.stars.sel = null; } this.scene = v; this.ui.select(null); } if (isBase) { this.base = v; this.bv.setBase(v); } }
    this.view = v; const tab = v === 'research' || v === 'launch' || v === 'contact' || v === 'war' || v === 'beyond' ? v : this.scene === 'orbit' || this.scene === 'system' ? this.scene : 'bases'; document.querySelectorAll('.nav [data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    document.body.dataset.scene = this.scene; const ov = $('#overlay');
    if (v === 'research') { this.ui.research(); Platform.gameplayStop(); } else if (v === 'contact') { this.ui.contact.open(); Platform.gameplayStop(); } else if (v === 'war') { this.ui.war.open(); Platform.gameplayStop(); } else if (v === 'beyond') { this.ui.beyond.open(arg); Platform.gameplayStop(); } else if (v === 'launch') { this.ui.launch.open(arg); Platform.gameplayStop(); } else { ov.className = ''; ov.innerHTML = ''; if (this.started) Platform.gameplayStart(); }
  }
  // requests come and go; newly discovered species knock on the door (one first-contact moment at a time)
  // raids arrive and are resolved; a battle report pops up with a replay
  warTick() { for (const e of WR.tickWar(this.s)) { if (e.kind === 'raidIncoming') { this.audio.play('deny'); this.ui.toast(`Kr'thul raid detected, heading for ${e.raid.name}: impact in 8 hours (Fleet screen)`, 'bad'); }
      if (e.kind === 'raidResult') this.battleModal(e.rep); } if (this.view === 'war') this.ui.war.render(); }
  battleModal(rep) { this.audio.play(rep.win ? 'claim' : 'fail'); const lost = rep.loot ? `They plundered ${fmt(rep.loot.credits)} credits and ${fmt(rep.loot.metal)} metal; ${rep.kind === 'raid' ? esc2(rep.name) + ' is blockaded for 12 hours.' : ''}` : '';
    const gain = rep.salvage ? `Salvage: ${fmt(rep.salvage.metal)} metal and ${fmt(rep.salvage.xeno)} xenodata.` : rep.loot && rep.win ? `Spoils: ${Object.entries(rep.loot).map(([r, n]) => fmt(n) + ' ' + RES[r].name.toLowerCase()).join(', ')}.` : '';
    this.ui.modal(`<div class="intro"><div class="logo small" style="${rep.win ? '' : 'background:linear-gradient(#fff,#ff6b6b);-webkit-background-clip:text;background-clip:text'}">${rep.win ? 'VICTORY' : 'DEFEAT'}</div><p class="tag">${esc2(rep.kind === 'raid' ? 'Kr\'thul raid on ' + rep.name : rep.name)}</p><p>${rep.win ? gain : lost}</p><div class="row"><button class="btn" id="bmReplay">Watch the replay</button><button class="btn gold" data-a="close">Continue</button></div></div>`, 'intro');
    $('#bmReplay').addEventListener('click', () => this.ui.war.replay(rep)); }
  alienTick() { const s = this.s; for (const e of AL.tickAliens(s, this.R)) { const d = AL.allSpecies()[e.sp]; if (e.kind === 'request') { this.audio.play('tap'); this.ui.toast(`${d.name}: a new request (Contact screen)`, 'info'); } if (e.kind === 'reqExpired') this.ui.toast(`${d.name} are disappointed: their request expired`, 'bad'); }
    this.prompted = this.prompted || {}; if ($('#modal').classList.contains('on') || this.view === 'contact') return; const p = AL.pendingContacts(s).find((id) => !this.prompted[id]); if (p) { this.prompted[p] = 1; this.ui.contact.contact(p); } }
  // the Star Map shows either the Solar System or the stellar neighbourhood
  starsOpen() { const s = this.s; return !!(s.tech.laserSails || s.tech.exoplanetology || s.tech.starColonies || s.flags.plutoEdge || s.flags.tritonSignal); }
  setMapMode(m) { if (m === 'stars' && !this.starsOpen()) { this.ui.toast('The stars open up once you reach Pluto or research Laser Light Sails', 'info'); return; } this.audio.play('tap'); this.mapMode = m; this.ui.sys.open(null); this.ui.stars.open(null); this.system.sel = null; this.stars.sel = null; }
  // the biggest rocket in the hangar stands on the pad
  syncPad() { const r = SP.sp(this.s).rockets; let best = null; for (const id of ROCKET_ORDER) if ((r[id] || 0) > 0) best = id; this.bv.padRocket = best ? ROCKETS[best] : null; }
  launched(c) {
    this.audio.play('launch'); this.ui.toast(`Liftoff! ${c.ms.name} on ${ROCKETS[c.rocket].name} · ${fmtTime(c.ms.flight)} to go`, 'gold');
    this.setView('earth'); this.bv.padRocket = ROCKETS[c.rocket]; this.bv.launch(ROCKETS[c.rocket]); this.bv.focusLaunch(); this.syncPadLater();
  }
  syncPadLater() { clearTimeout(this.padT); this.padT = setTimeout(() => this.syncPad(), 12500); }
  // ---------------- loop ----------------
  frame(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; const s = this.s; s.stats.playS += dt;
    const notes = G.advance(s, Date.now()); if (notes.length) { this.R = G.rates(s); for (const n of notes) this.notify(n); this.ui.panelKey = ''; }
    this.rT = (this.rT || 0) + dt; if (this.rT > 1) { this.rT = 0; this.R = G.rates(s); this.alienTick(); this.warTick(); if ((this.achT = (this.achT || 0) + 1) % 5 === 0) for (const a of BY.checkAchievements(s)) { this.audio.play('claim'); this.ui.toast(`Achievement: ${a.name} (+${a.dm} dark matter)`, 'gold'); } }
    const showOv = ['research', 'launch', 'contact', 'war', 'beyond'].includes(this.view);
    if (this.scene === 'system') { if (!showOv || (this.fT = (this.fT || 0) + dt) > 0.25) { (this.mapMode === 'stars' ? this.stars : this.system).render(s, showOv ? this.fT : dt); this.fT = 0; } }
    else if (this.scene === 'orbit') { if (!showOv || (this.fT = (this.fT || 0) + dt) > 0.25) { this.orbit.render(s, showOv ? this.fT : dt); this.fT = 0; } }
    else if (!showOv || (this.fT = (this.fT || 0) + dt) > 0.25) { this.bv.render(s, G, showOv ? this.fT : dt); this.fT = 0; }
    this.ui.frame(dt);
    this.saveT += dt; if (this.saveT > 10) { this.saveT = 0; this.persist(); }
    requestAnimationFrame((t) => this.frame(t));
  }
  notify(n) {
    if (n.kind === 'build') { this.audio.play('done'); this.ui.toast(n.lvl === 1 ? `${BUILDINGS[n.b].name} is complete!` : `${BUILDINGS[n.b].name} reached level ${n.lvl}`, 'good'); if (n.b === 'hq') { const opened = n.lvl; this.ui.toast(`Mission Control level ${opened}: new lots and higher building levels unlocked`, 'gold'); } }
    if (n.kind === 'research') { this.audio.play('research'); this.ui.toast(`Research complete: ${TECH[n.tech].name}`, 'gold'); if (this.view === 'research') this.ui.research(); }
    if (n.kind === 'rocket') { this.audio.play('done'); this.ui.toast(`${ROCKETS[n.rocket].name} rolled out to the hangar`, 'good'); this.syncPad(); }
    if (n.kind === 'fail') { this.audio.play('fail'); this.ui.toast(`Mission lost: ${n.name}. The engineers recovered ${fmt(n.sci)} science from the telemetry.`, 'bad'); }
    if (n.kind === 'sat') { this.audio.play('arrive'); this.ui.toast(`${n.name}: in orbit and operational`, 'good'); }
    if (n.kind === 'module') { this.audio.play('arrive'); this.ui.toast(`${MODULES[n.mod].name} docked with the station${n.lvl > 1 ? ' (level ' + n.lvl + ')' : ''}`, 'good'); }
    if (n.kind === 'mission') { this.audio.play('arrive'); this.ui.toast(`Mission accomplished: ${n.name}`, 'gold'); if (n.base === 'moon' && n.first) this.moonFounded(); }
    if (n.kind === 'survey') { this.audio.play('arrive'); this.ui.toast(`Survey complete: ${BODIES[n.body].name} mapped`, 'gold'); }
    if (n.kind === 'ship') { this.audio.play('done'); this.ui.toast(`The ${SHIPS[n.ship].name} leaves the shipyard`, 'good'); }
    if (n.kind === 'terra') { this.audio.play('claim'); this.ui.toast(`Terraforming: ${TERRA[n.body].stages[n.stage].name} complete`, 'gold'); if (n.stage + 1 >= TERRA[n.body].stages.length) this.story('marsGreen'); }
    if (n.kind === 'voyage') { this.audio.play('arrive'); this.ui.toast(n.op === 'transport' ? `${n.people} colonists arrive on ${BODIES[n.body].name}` : `Arrived: ${n.name}`, 'gold'); if (n.founded) this.story('found_' + n.body); if (n.story) this.story(n.story); }
    if (n.kind === 'sail') { this.audio.play('arrive'); const st = STARS[n.star]; this.ui.toast(`Light sail reached ${st.name}: ${st.planets.length ? st.planets.length + ' world' + (st.planets.length > 1 ? 's' : '') + ' mapped' : 'no planets'}`, 'gold'); if (n.story) this.story(n.story); }
    if (n.kind === 'drive') { this.audio.play('done'); this.ui.toast(`The ${DRIVES[n.ship].name} is ready for the stars`, 'good'); }
    if (n.kind === 'mega') { this.audio.play('claim'); this.ui.toast(`${MEGA[n.mega].name}: stage ${n.stage + 1} complete`, 'gold'); }
    if (n.kind === 'gatebuild') { this.audio.play('claim'); this.ui.toast(`Wormhole gate open at ${STARS[n.star].name}`, 'gold'); }
    if (n.kind === 'develop') { this.audio.play('done'); this.ui.toast(`Star colony developed to level ${n.lvl}`, 'good'); }
    if (n.kind === 'relay') { this.audio.play('claim'); this.ui.toast(`The relay network wakes: stage ${n.stage}`, 'gold'); }
    if (n.kind === 'expedition') { this.audio.play('research'); const E = BY.EXPEDITIONS[n.gal]; this.ui.modal(`<div class="intro"><div class="logo small">${BY.GALAXIES[n.gal].name.toUpperCase()}</div><p class="tag">${E.name}</p><p>${E.story}</p><p class="cur">${E.perkText}</p><button class="btn gold big" data-a="close">Continue</button></div>`, 'intro'); }
    if (n.kind === 'warship') { this.audio.play('done'); this.ui.toast(`${n.n} ${WR.WARSHIPS[n.ship].name}${n.n > 1 ? 's' : ''} join the fleet`, 'good'); }
    if (n.kind === 'defence') { this.audio.play('done'); this.ui.toast(`Defences raised to level ${n.lvl}`, 'good'); }
    if (n.kind === 'fleetMoved') this.ui.toast('The fleet is in position', 'info');
    if (n.kind === 'assault') { this.battleModal(n.rep); if (n.win && n.hive === 'kapteyn') setTimeout(() => this.story('queenDead'), 400); }
    if (n.kind === 'decipher') { this.audio.play('research'); this.ui.toast(`${AL.allSpecies()[n.sp].name} language: ${n.und}% understood`, 'gold'); }
    if (n.kind === 'embassy') { this.audio.play('done'); this.ui.toast(`Embassy to the ${AL.allSpecies()[n.sp].name}: level ${n.lvl}`, 'good'); }
    if (n.kind === 'uplift') { this.audio.play('claim'); this.ui.toast(`The ${AL.allSpecies()[n.sp].name} have been uplifted: a new spacefaring friend`, 'gold'); }
    if (n.kind === 'dig') { this.audio.play('claim'); this.ui.toast(`The Hollow ruins: level ${n.lvl} excavated`, 'gold'); }
    if (n.kind === 'starcolony' && n.life) this.ui.toast(`Life on ${n.name}: the settlers have found ${n.life}`, 'gold');
    if (n.kind === 'starcolony') { this.audio.play('arrive'); this.ui.toast(`Settlers have landed on ${n.name}`, 'gold'); if (n.first) this.story('firstStar'); if (n.story) this.story(n.story); }
    if (n.kind !== 'build' && n.kind !== 'research') this.syncPad();
    if (this.view === 'launch') this.ui.launch.render(); if (this.view === 'contact') this.ui.contact.render(); if (this.view === 'war') this.ui.war.render();
  }
  describe(n) { switch (n.kind) { case 'build': return `${BUILDINGS[n.b].name} → level ${n.lvl}`; case 'research': return `Research: ${TECH[n.tech].name}`; case 'rocket': return `Rocket assembled: ${ROCKETS[n.rocket].name}`; case 'fail': return `Mission lost: ${n.name}`; case 'sat': case 'module': case 'mission': return `${n.name}: success`; case 'survey': return `Survey: ${BODIES[n.body].name}`; case 'ship': return `Ship built: ${SHIPS[n.ship].name}`; case 'voyage': return n.op === 'transport' ? `${n.people} colonists reached ${BODIES[n.body].name}` : `Voyage complete: ${n.name}`; case 'terra': return `Terraforming: ${TERRA[n.body].stages[n.stage].name}`; case 'sail': return `Light sail reached ${STARS[n.star].name}`; case 'drive': return `Starship built: ${DRIVES[n.ship].name}`; case 'mega': return `${MEGA[n.mega].name}: stage ${n.stage + 1}`; case 'gatebuild': return `Gate open at ${STARS[n.star].name}`; case 'develop': return `Star colony reached level ${n.lvl}`; case 'starcolony': return `New star colony: ${n.name}`; case 'decipher': return `Deciphered: ${AL.allSpecies()[n.sp].name} (${n.und}%)`; case 'embassy': return `Embassy: ${AL.allSpecies()[n.sp].name}`; case 'uplift': return `Uplifted: ${AL.allSpecies()[n.sp].name}`; case 'dig': return `Ruins excavated: level ${n.lvl}`; case 'warship': return `${n.n} ${WR.WARSHIPS[n.ship].name} built`; case 'defence': return `Defences raised to ${n.lvl}`; case 'fleetMoved': return 'Fleet in position'; case 'assault': return `${n.win ? 'Victory' : 'Defeat'} at ${WR.HIVES[n.hive].name}`; case 'relay': return `Relay network stage ${n.stage}`; case 'expedition': return `Expedition reached ${BY.GALAXIES[n.gal].name}`; } return ''; }
  // story beats: new colonies and discoveries
  story(k) {
    const T = {
      found_mars: ['BRADBURY LANDING', 'The first city on another planet', 'Twenty-four colonists step out under a butterscotch sky. Regolith for metal, ice for water and fuel, and a planet that might, one day, breathe. Visit it from the base picker; send more colonists with Ares transports, and grow them with greenhouses.', 'mars'],
      found_ceres: ['OCCATOR STATION', 'Capital of the asteroid belt', 'Ceres has water, gravity enough to stand in, and a million asteroids within reach. Build Mining Control here and every mining claim produces more.', 'ceres'],
      found_titan: ['KRAKEN SHORE', 'A town beside a sea of methane', 'Orange sky, −179 °C, rain that is liquid gas. Titan sits on more hydrocarbons than all of Earth. Solar power is useless this far out: build reactors.', 'titan'],
      europaLife: ['WE ARE NOT ALONE', 'Europa, 19 km below the ice', 'The melt-probe breaks into black water. Clinging to a hydrothermal vent are mats of single-celled organisms using a chemistry no Earth microbe uses. Life began twice in one Solar System, so it may be everywhere.', null],
      tritonSignal: ['A SIGNAL', 'Triton Deep-Space Array', 'Out past the noise of the Sun, the array picks up a narrowband pulse from the direction of Epsilon Eridani, 10.5 light-years away. It repeats every 4 hours 12 minutes. It is not natural.', null],
      plutoEdge: ['THE EDGE', 'Tombaugh Station, 39 AU from the Sun', 'From here the Sun is just the brightest star in the sky. The nearest other star is 4.2 light-years away, a gap ten thousand times wider than everything we have crossed so far. The engineers have started sketching anyway.', null],
      queenDead: ['THE SWARM FALLS SILENT', 'Kapteyn\'s Star', 'The Brood Queen dies and, across forty light-years, trillions of drones stop moving at once. The Swarm that ate worlds for ten billion years is over. Somewhere very far away, something older takes notice.', null],
      firstStar: ['ANOTHER SUN', 'The first star colony', 'For the first time, humans wake under a light that is not the Sun. Choose what the colony specialises in, develop it level by level, and give it a wormhole gate once you can.', null],
      relay: ['THE SOURCE', 'Epsilon Eridani, 10.5 light-years', 'The light sail\'s camera finds it in the inner belt: a structure four kilometres long, older than human civilisation, still transmitting the pulse Triton heard. Someone built a lighthouse here, and it is pointed at us.', null],
      relayVisit: ['FIRST FOOTSTEPS', 'The relay at Epsilon Eridani', 'The settlers dock with the relay. Inside: corridors sized for something taller than us, star charts of systems we have never seen, and a map of the galaxy with six other lights burning. We are about to have company.', null],
      marsGreen: ['A SECOND EARTH', 'Mars, terraformed', 'Blue skies, grey-green forests, a northern ocean. Children born on Bradbury Landing will walk outside with nothing but a breather mask. Their grandchildren may not need even that.', 'mars'],
    }[k]; if (!T) return;
    this.ui.modal(`<div class="intro"><div class="logo small">${T[0]}</div><p class="tag">${T[1]}</p><p>${T[2]}</p><button class="btn gold big" data-a="close" id="storyGo">${T[3] ? 'Visit' : 'Continue'}</button></div>`, 'intro');
    if (T[3]) $('#storyGo').addEventListener('click', () => this.setView(T[3])); }
  moonFounded() { this.ui.modal(`<div class="intro"><div class="logo small">TRANQUILITY BASE</div><p class="tag">Humanity's first home off Earth</p><p>Twelve crew, a hub, a regolith processor, solar arrays and an ice mine. The Moon has <b>Helium-3</b>, a fusion fuel found nowhere on Earth, and it is a far cheaper place to launch from.</p><p class="muted">Switch between Earth, Orbit and the Moon with the tabs below. Build up the Colony Hub to open more lunar lots.</p><button class="btn gold big" data-a="close" id="moonGo">Visit the Moon</button></div>`, 'intro');
    $('#moonGo').addEventListener('click', () => this.setView('moon')); }
  changed() { this.R = G.rates(this.s); this.ui.hud(); this.ui.side(); this.persist(); }
  persist() { save(Platform.storage(), this.s); }
  catchUp() { const s = this.s; const away = (Date.now() - s.last) / 1000; if (away < 90) return; const before = { ...s.res }; const notes = G.advance(s, Date.now()); this.R = G.rates(s); this.report(away, before, notes); this.warTick(); }
  reset() { this.s = fresh(); this.persist(); location.reload(); }
  ascend() { const n = BY.ascend(this.s); if (!n) return; this.s = n; this.persist(); location.reload(); }
  // ---------------- input ----------------
  bindInput() {
    const cv = $('#base'); const pts = new Map(); let downAt = null, moved = 0, pinch0 = 0;
    cv.addEventListener('pointerdown', (e) => { this.start(); cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); downAt = [e.clientX, e.clientY]; moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    cv.addEventListener('pointermove', (e) => { const p = pts.get(e.pointerId); if (!p) { const id = this.bv.pick(e.clientX, e.clientY, this.s); this.bv.hover = id; cv.style.cursor = id ? 'pointer' : 'grab'; return; }
      if (pts.size === 2) { pts.set(e.pointerId, [e.clientX, e.clientY]); const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0) this.bv.zoomAt(d / pinch0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); pinch0 = d; moved = 99; return; }
      const dx = e.clientX - p[0], dy = e.clientY - p[1]; moved += Math.abs(dx) + Math.abs(dy); pts.set(e.pointerId, [e.clientX, e.clientY]); if (moved > 6) this.bv.pan(dx, dy); });
    const up = (e) => { if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); if (pts.size === 0 && moved <= 6 && downAt) { const id = this.bv.pick(downAt[0], downAt[1], this.s); this.ui.select(id); } if (pts.size < 2) pinch0 = 0; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); this.bv.zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, { passive: false });
    const fx = $('#fx'); let fdown = null, fmoved = 0; const fp = new Map(); let fpinch = 0;
    fx.addEventListener('pointerdown', (e) => { this.start(); fx.setPointerCapture(e.pointerId); fp.set(e.pointerId, [e.clientX, e.clientY]); fdown = [e.clientX, e.clientY]; fmoved = 0; if (fp.size === 2) { const [a, b] = [...fp.values()]; fpinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    fx.addEventListener('pointermove', (e) => { const sys = this.scene === 'system'; const q = fp.get(e.pointerId);
      const starsM = sys && this.mapMode === 'stars';
      if (!q) { if (starsM) { const id = this.stars.pick(e.clientX, e.clientY); this.stars.hover = id; fx.style.cursor = id ? 'pointer' : 'grab'; } else if (sys) { const id = this.system.pick(e.clientX, e.clientY); this.system.hover = id; fx.style.cursor = id ? 'pointer' : 'grab'; } else { const p = this.orbit.pick(e.clientX, e.clientY); this.orbit.hover = p; fx.style.cursor = p ? 'pointer' : 'default'; } return; }
      if (!sys) return; if (fp.size === 2) { fp.set(e.pointerId, [e.clientX, e.clientY]); const [a, b] = [...fp.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (fpinch) { if (starsM) this.stars.zoomAt(d / fpinch); else this.system.zoomAt(d / fpinch, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } fpinch = d; fmoved = 99; return; }
      const dx = e.clientX - q[0], dy = e.clientY - q[1]; fmoved += Math.abs(dx) + Math.abs(dy); fp.set(e.pointerId, [e.clientX, e.clientY]); if (fmoved > 6) { if (starsM) { this.stars.drag = true; this.stars.rotate(dx, dy); } else { this.system.panT = null; this.system.panBy(dx, dy); } } });
    const fup = (e) => { if (!fp.has(e.pointerId)) return; fp.delete(e.pointerId); if (fp.size < 2) fpinch = 0; if (fp.size || !fdown || fmoved > 6) return; const [x, y] = fdown; fdown = null;
      if (this.scene === 'system') { if (this.mapMode === 'stars') this.ui.selectStar(this.stars.pick(x, y)); else this.ui.selectBody(this.system.pick(x, y)); } else this.ui.orbitPick(this.orbit.pick(x, y)); this.stars.drag = false; };
    fx.addEventListener('pointerup', fup); fx.addEventListener('pointercancel', fup);
    fx.addEventListener('wheel', (e) => { if (this.scene !== 'system') return; e.preventDefault(); const f = Math.exp(-e.deltaY * 0.0015); if (this.mapMode === 'stars') this.stars.zoomAt(f); else this.system.zoomAt(f, e.clientX, e.clientY); }, { passive: false });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') { if ($('#modal').classList.contains('on')) this.ui.closeModal(); else if (['research', 'launch', 'contact', 'war', 'beyond'].includes(this.view)) this.setView('base'); else if (this.scene === 'system') { if (this.mapMode === 'stars') this.ui.selectStar(null); else this.ui.selectBody(null); } else this.ui.select(null); } });
  }
  start() { this.audio.unlock(); this.audio.setMusic(this.s.settings.music); if (!this.started) { this.started = true; Platform.gameplayStart(); } }
  // ---------------- story & reports ----------------
  intro() { const ch = CHAPTERS[0]; this.ui.modal(`<div class="intro"><div class="logo">STARWARD</div><p class="tag">From one launch pad to the edge of the universe</p><h2>${ch.name}</h2><p>${ch.intro}</p><ul class="how"><li>Tap a building to upgrade it, or an empty lot to build.</li><li>Construction and research run in <b>real time</b>, even while you're away.</li><li>Follow the objectives on the left; each pays a reward.</li></ul><button class="btn gold big" data-a="close" id="beginBtn">Begin the programme</button></div>`, 'intro');
    $('#beginBtn').addEventListener('click', () => { this.s.tut = 1; this.persist(); this.start(); }); }
  report(sec, before, notes) {
    const gained = Object.keys(RES).map((r) => [r, (this.s.res[r] || 0) - (before[r] || 0)]).filter(([, n]) => n > 0.5);
    const done = notes.map((n) => this.describe(n)).filter(Boolean);
    this.ui.modal(`<h2>Welcome back, Director</h2><p class="muted">You were away for ${fmtTime(sec)}.</p>${done.length ? `<div class="lst"><b>Completed</b>${done.slice(0, 8).map((d) => `<div>✓ ${d}</div>`).join('')}</div>` : ''}${gained.length ? `<div class="lst"><b>Produced</b><div class="costs">${gained.map(([r, n]) => `<span class="cost" style="--rc:${RES[r].color}">+${fmt(n)} ${RES[r].name}</span>`).join('')}</div></div>` : ''}<p class="muted small">Storage caps limit what accumulates while you're away: upgrade Logistics Depots to bank more.</p><button class="btn gold big" data-a="close">Back to work</button>`);
  }
  adsOk() { return Platform.adsAvailable; }
  async rewarded(fn) { this.audio.suspend(); const ok = await Platform.rewarded(); this.audio.resume(); if (ok) fn(); else this.ui.toast('Ad unavailable right now', 'info'); }
}
new App().boot();
