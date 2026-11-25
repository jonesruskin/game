// Synthesised sound (WebAudio, no files, all original): interface cues, a composed generative score that changes with
// where you are, an environment bed for each world, and the sounds of the base at work, mixed by what the camera sees.
// Signal flow: cues → sfx bus; score → music bus; beds and site sounds → world bus; all three → a soft compressor.
// Everything that wants space sends a little to a shared reverb made from a generated impulse.
type Cue = 'tap' | 'collect' | 'build' | 'done' | 'feed' | 'levelup' | 'deny' | 'harvest' | 'buy' | 'claim' | 'place' | 'whoosh' | 'hit' | 'crit' | 'launch' | 'crystal' | 'evolve' | 'sparkle';
export type Mood = 'base' | 'space' | 'battle';
export interface Site { build: number; mine: number; refinery: number; traffic: number; power: number }
const N = (m: number) => 440 * Math.pow(2, (m - 69) / 12); // MIDI note → Hz
// the score: D major, an eight-bar progression and its answer (chord tones as MIDI notes, bass root)
const PROG_A: [number[], number][] = [[[62, 66, 69, 73], 38], [[57, 61, 64, 71], 33], [[59, 62, 66, 69], 35], [[55, 59, 62, 66], 31], [[62, 66, 69, 73], 38], [[57, 61, 64, 68], 33], [[55, 59, 62, 69], 31], [[57, 61, 64, 69], 33]];
const PROG_B: [number[], number][] = [[[64, 67, 71, 74], 40], [[55, 59, 62, 66], 31], [[62, 66, 69, 74], 38], [[57, 61, 64, 69], 33], [[59, 62, 66, 69], 35], [[55, 59, 62, 66], 31], [[64, 67, 71, 74], 40], [[57, 61, 64, 69], 33]];
const PROG_T: [number[], number][] = [[[59, 62, 66, 69], 35], [[55, 59, 62, 67], 31], [[54, 57, 61, 64], 30], [[52, 55, 59, 62], 28]]; // tense (Orbital Trials)
// the theme: a rising four-bar figure (step in 16ths, MIDI note, length in steps)
const THEME: [number, number, number][] = [[0, 74, 3], [4, 76, 2], [6, 78, 6], [16, 81, 3], [20, 78, 2], [22, 76, 6], [32, 74, 3], [36, 73, 2], [38, 71, 4], [42, 73, 2], [48, 69, 10]];
export class Audio {
  ctx: AudioContext | null = null; out: GainNode | null = null; vol = 0.8; mvol = 0.45; muted = false;
  private master: GainNode | null = null; private mbus: GainNode | null = null; private wbus: GainNode | null = null; private verb: ConvolverNode | null = null; private vsend: GainNode | null = null; private dly: DelayNode | null = null; private dsend: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null; private seqT = 0; private step = 0; private bar = 0; private mood: Mood = 'base'; private playing = false; private duck: GainNode | null = null;
  private bed: { wind: GainNode; windF: BiquadFilterNode; sea: GainNode; hum: GainNode; rain: GainNode; world: string; storm: number } | null = null; private site: Site = { build: 0, mine: 0, refinery: 0, traffic: 0, power: 0 }; private siteHum: { pump: GainNode; steam: GainNode; elec: GainNode } | null = null;
  unlock() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { const c = this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25; comp.connect(c.destination);
      this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 1; this.master.connect(comp);
      this.out = c.createGain(); this.out.gain.value = this.vol * 1.4; this.out.connect(this.master); this.mbus = c.createGain(); this.mbus.gain.value = 0; this.mbus.connect(this.master); this.wbus = c.createGain(); this.wbus.gain.value = this.vol * 0.9; this.wbus.connect(this.master);
      // a hall reverb from decaying noise, and a stereo-ish echo for the plucks
      this.verb = c.createConvolver(); this.verb.buffer = this.impulse(2.8); const vr = c.createGain(); vr.gain.value = 0.5; this.verb.connect(vr); vr.connect(this.master); this.vsend = c.createGain(); this.vsend.gain.value = 1; this.vsend.connect(this.verb);
      this.dly = c.createDelay(1.5); this.dly.delayTime.value = (60 / 96) * 0.75; const fb = c.createGain(); fb.gain.value = 0.38; const dlp = c.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2600; this.dly.connect(dlp); dlp.connect(fb); fb.connect(this.dly); dlp.connect(this.mbus); this.dsend = c.createGain(); this.dsend.connect(this.dly);
      this.duck = c.createGain(); this.duck.connect(this.mbus); this.noiseBuf = this.noise2(2);
      document.addEventListener('visibilitychange', () => { const x = this.ctx; if (!x) return; if (document.hidden) x.suspend(); else x.resume(); }); /* silent in a background tab */
    } catch (e) { this.ctx = null; } }
  private impulse(sec: number) { const c = this.ctx!; const len = Math.floor(c.sampleRate * sec); const b = c.createBuffer(2, len, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); } return b; }
  private noise2(sec: number) { const c = this.ctx!; const b = c.createBuffer(1, Math.floor(c.sampleRate * sec), c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  setVolume(v: number) { this.vol = v; if (this.out) this.out.gain.value = v * 1.4; if (this.wbus) this.wbus.gain.value = v * 0.9; }
  setMuted(m: boolean) { this.muted = m; if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05); }
  // ---------------- interface cues ----------------
  private tone(f: number, t: number, dur: number, type: OscillatorType = 'sine', g = 0.2, slide = 0, dest?: AudioNode, wet = 0) { const c = this.ctx!; const o = c.createOscillator(), a = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g, t + 0.008); a.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(a); a.connect(dest || this.out!); if (wet && this.vsend) { const w = c.createGain(); w.gain.value = wet; a.connect(w); w.connect(this.vsend); } o.start(t); o.stop(t + dur + 0.05); }
  private hiss(t: number, dur: number, g = 0.2, f = 800, type: BiquadFilterType = 'lowpass', dest?: AudioNode, q = 0.7) { const c = this.ctx!; const s = c.createBufferSource(); s.buffer = this.noiseBuf; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const a = c.createGain();
    a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(fl); fl.connect(a); a.connect(dest || this.out!); s.start(t, Math.random()); s.stop(t + dur + 0.05); }
  play(cue: Cue, amount = 1) { if (!this.ctx || !this.out || this.muted) return; const t = this.ctx.currentTime;
    switch (cue) {
      case 'tap': this.tone(880, t, 0.06, 'triangle', 0.08); break;
      case 'collect': { const n = Math.min(6, 2 + Math.floor(Math.log10(Math.max(1, amount)))); [0, 4, 7, 12, 16, 19].slice(0, n).forEach((s, i) => this.tone(988 * Math.pow(2, s / 12), t + i * 0.055, 0.25, 'triangle', 0.12, 0, undefined, 0.25)); this.hiss(t, 0.08, 0.06, 6000, 'highpass'); break; }
      case 'harvest': [0, 5, 9].forEach((s, i) => this.tone(660 * Math.pow(2, s / 12), t + i * 0.06, 0.2, 'square', 0.05)); this.tone(1320, t + 0.2, 0.3, 'sine', 0.08); break;
      case 'build': this.hiss(t, 0.12, 0.25, 500); this.tone(120, t, 0.18, 'sine', 0.3, 0.5); this.metal(t + 0.12, 0.12); this.metal(t + 0.3, 0.1); break;
      case 'place': this.tone(220, t, 0.12, 'sine', 0.25, 0.6); this.hiss(t, 0.08, 0.15, 1200); break;
      case 'done': [0, 4, 7, 12].forEach((s, i) => this.tone(523 * Math.pow(2, s / 12), t + i * 0.08, 0.35, 'triangle', 0.12, 0, undefined, 0.3)); break;
      case 'feed': this.tone(300, t, 0.15, 'sawtooth', 0.06, 2.2); this.tone(600, t + 0.05, 0.12, 'square', 0.04, 1.6); break;
      case 'levelup': [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => this.tone(392 * Math.pow(2, s / 12), t + i * 0.07, 0.5, 'triangle', 0.13, 0, undefined, 0.35)); [0, 4, 7].forEach((s) => this.tone(784 * Math.pow(2, s / 12), t + 0.55, 1.1, 'sine', 0.09, 0, undefined, 0.5)); this.hiss(t + 0.5, 0.9, 0.05, 7000, 'highpass'); break;
      case 'deny': this.tone(180, t, 0.16, 'square', 0.07, 0.7); break;
      case 'buy': this.tone(660, t, 0.1, 'triangle', 0.1); this.tone(990, t + 0.08, 0.18, 'triangle', 0.1); break;
      case 'claim': [0, 7, 12].forEach((s, i) => this.tone(659 * Math.pow(2, s / 12), t + i * 0.07, 0.4, 'triangle', 0.12, 0, undefined, 0.3)); break;
      case 'whoosh': this.hiss(t, 0.35, 0.18, 2400); break;
      case 'hit': this.hiss(t, 0.09, 0.22, 900); this.tone(170, t, 0.12, 'square', 0.07, 0.5); break;
      case 'crit': this.hiss(t, 0.18, 0.32, 1800); this.tone(95, t, 0.28, 'sawtooth', 0.11, 0.4); this.tone(1250, t + 0.02, 0.16, 'triangle', 0.06, 0.5); break;
      case 'launch': this.hiss(t, 1.8, 0.32, 320); this.tone(55, t, 1.8, 'sawtooth', 0.1, 2.6); this.hiss(t + 0.2, 1.4, 0.12, 2600); break;
      case 'crystal': [0, 7, 12, 19].forEach((s, i) => this.tone(1046 * Math.pow(2, s / 12), t + i * 0.05, 0.45, 'sine', 0.07, 0, undefined, 0.4)); this.tone(2093, t + 0.22, 0.6, 'triangle', 0.03); break;
      case 'evolve': [0, 4, 7, 11, 14, 19, 24].forEach((s, i) => { this.tone(330 * Math.pow(2, s / 12), t + i * 0.06, 0.55, 'triangle', 0.1); this.tone(660 * Math.pow(2, s / 12), t + i * 0.06 + 0.02, 0.4, 'sine', 0.04); }); this.hiss(t + 0.42, 0.5, 0.08, 5000); break;
      case 'sparkle': [12, 19, 24, 31].forEach((s, i) => this.tone(784 * Math.pow(2, s / 12) / 2, t + i * 0.045, 0.3, 'sine', 0.06, 0, undefined, 0.3)); break;
    } }
  // a struck piece of metal (construction, mining): a few inharmonic partials
  private metal(t: number, g: number, dest?: AudioNode, f0 = 520 + Math.random() * 300) { for (const [r, a] of [[1, 1], [2.76, 0.5], [5.4, 0.25]]) this.tone(f0 * r, t, 0.18 + Math.random() * 0.1, 'sine', g * a, 0, dest, 0.15); this.hiss(t, 0.03, g * 0.8, 3000, 'bandpass', dest, 2); }
  // ---------------- the score ----------------
  setMusic(v: number) { this.mvol = v; if (this.mbus && this.ctx) this.mbus.gain.setTargetAtTime(v * this.mk(), this.ctx.currentTime, 0.4); if (v > 0) this.startMusic(); }
  setMood(m: Mood) { if (m === this.mood) return; this.mood = m; this.bar = 0; this.step = 0; if (this.mbus && this.ctx && this.playing) this.mbus.gain.setTargetAtTime(this.mvol * this.mk(), this.ctx.currentTime, 0.6); if (this.dly) this.dly.delayTime.value = (60 / this.bpm()) * 0.75; }
  private mk() { return this.mood === 'battle' ? 0.75 : 0.95; } // the score sits under the cues
  private bpm() { return this.mood === 'battle' ? 112 : this.mood === 'space' ? 80 : 96; }
  startMusic() { if (!this.ctx || this.playing) return; this.playing = true; const c = this.ctx; this.mbus!.gain.setTargetAtTime(this.mvol * this.mk(), c.currentTime, 1.2); this.seqT = c.currentTime + 0.3; window.setInterval(() => this.schedule(), 60); }
  private schedule() { const c = this.ctx; if (!c || c.state !== 'running' || this.mvol <= 0 || this.muted) return; if (this.seqT < c.currentTime) this.seqT = c.currentTime + 0.05; /* after a pause: pick up, never burst */ const spb = 60 / this.bpm() / 4; while (this.seqT < c.currentTime + 0.2) { this.stepAt(this.seqT, this.step, spb); this.seqT += spb; this.step++; if (this.step % 16 === 0) this.bar++; } }
  // arrangement: a four-bar intro once, then 8-bar sections that build and fall away: groove → full → full (the answer) → breakdown
  private stepAt(t: number, st: number, spb: number) { const s16 = st % 16, b = this.bar, mood = this.mood, intro = b < 4, sec = intro ? -1 : Math.floor((b - 4) / 8) % 4;
    const P = mood === 'battle' ? PROG_T : sec === 2 ? PROG_B : PROG_A; const [chord, root] = P[b % P.length]; const D = this.duck!;
    const drums = mood === 'battle' ? sec !== 3 && !intro : mood === 'base' && (sec === 1 || sec === 2); const groove = mood === 'battle' || (mood === 'base' && sec >= 0 && sec <= 2) || (mood === 'space' && sec === 1);
    if (s16 === 0) this.pad(t, chord, spb * 16, mood === 'space' ? 1.2 : 1); // a warm chord every bar
    // bass: root on 1, a push on the and-of-2, the fifth on 3 (space: one long note a bar)
    if (mood === 'space' ? s16 === 0 && !intro : groove && (s16 === 0 || s16 === 6 || s16 === 10 || (mood === 'battle' && s16 % 4 === 2))) { const n = s16 === 10 ? root + 7 : root; this.bass(t, N(n), spb * (mood === 'space' ? 14 : s16 === 6 ? 1.5 : 3), mood === 'space' ? 0.6 : 1); }
    // plucked arpeggio through the echo; the figure changes each section
    const FIG = [[0, 2, 1, 3, 2, 1, 3, 2], [0, 1, 2, 3, 2, 3, 1, 2], [3, 2, 0, 2, 1, 2, 0, 3], [0, 2, 3, 2, 0, 1, 3, 1]][Math.max(0, sec)];
    const every = mood === 'space' ? 4 : mood === 'battle' ? 1 : 2; if (st % every === 0 && Math.random() < (sec === 3 ? 0.6 : 0.92)) { const n = chord[FIG[Math.floor(st / every) % 8]] + 12 + (sec === 2 && s16 >= 8 ? 12 : 0); this.pluck(t, N(n), mood === 'space' ? 0.2 : 0.26); }
    // drums: a soft kick that the pad ducks under, claps on 2 and 4, hats and a shaker
    if (drums && (s16 === 0 || s16 === 8 || (sec === 2 && s16 === 14) || (mood === 'battle' && (s16 === 4 || s16 === 12)))) { this.kick(t); D.gain.setValueAtTime(0.5, t); D.gain.linearRampToValueAtTime(1, t + spb * 3); }
    if (groove && mood !== 'space') { if (s16 % 2 === 0) this.hat(t, s16 % 4 === 2 ? 0.1 : 0.05); if (drums && (s16 === 4 || s16 === 12)) this.snap(t); if (s16 % 2 === 1 && Math.random() < 0.5) this.hat(t, 0.03, 9500); }
    if (sec === 0 && mood === 'base' && b % 8 === 7 && s16 >= 12) this.hat(t, 0.02 + (s16 - 12) * 0.012, 5000); // a lift into the full section
    // the theme: in both full sections, answered an octave down the second time
    if (mood === 'base' && (sec === 1 || sec === 2) && (b - 4) % 8 < 4) { const at = ((b - 4) % 4) * 16 + s16; for (const [ss, n, len] of THEME) if (ss === at) this.bell(t, N(n - (sec === 2 ? 12 : 0)), spb * len); }
    if (mood === 'space' && s16 === 0 && b % 4 === 2) this.bell(t + spb * 2, N(chord[3] + 12), spb * 10);
    if (mood === 'battle' && sec === 1 && s16 % 8 === 0) this.bell(t, N(chord[(st >> 3) % 4] + 24), spb * 4); }
  private voice(t: number, dur: number, peak: number, att: number, rel: number, dest: AudioNode) { const g = this.ctx!.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + att); g.gain.setValueAtTime(peak, t + Math.max(att, dur - rel)); g.gain.linearRampToValueAtTime(0, t + dur + rel); g.connect(dest); return g; }
  private pad(t: number, chord: number[], dur: number, lvl: number) { lvl *= 0.8; const c = this.ctx!; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1200, t); lp.frequency.linearRampToValueAtTime(2600 + Math.random() * 900, t + dur * 0.6); lp.frequency.linearRampToValueAtTime(1400, t + dur);
    const g = this.voice(t, dur, 0.022 * lvl * 2.2, dur * 0.25, dur * 0.3, lp); const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 190; lp.connect(hp); hp.connect(this.duck!); const w = c.createGain(); w.gain.value = 0.6; hp.connect(w); w.connect(this.vsend!); /* the bass owns the low end */
    for (const n of chord) for (const det of [-7, 6]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = N(n - 12); o.detune.value = det; o.connect(g); o.start(t); o.stop(t + dur * 1.4); } }
  private bass(t: number, f: number, dur: number, lvl = 1) { const c = this.ctx!; const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2; /* the octave above carries the line on phone and laptop speakers */ const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650; const g = this.voice(t, dur, 0.17 * lvl, 0.012, 0.08, this.mbus!); lp.connect(g); o.connect(lp); o2.connect(lp); o.start(t); o2.start(t); o.stop(t + dur + 0.2); o2.stop(t + dur + 0.2); }
  private pluck(t: number, f: number, g: number) { const c = this.ctx!; const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const m = c.createOscillator(); m.frequency.value = f * 2; const mg = c.createGain(); mg.gain.setValueAtTime(f * 2, t); mg.gain.exponentialRampToValueAtTime(1, t + 0.3); m.connect(mg); mg.connect(o.frequency);
    const a = c.createGain(); a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g, t + 0.004); a.gain.exponentialRampToValueAtTime(0.0001, t + 0.45); o.connect(a); a.connect(this.mbus!); const ds = c.createGain(); ds.gain.value = 0.55; a.connect(ds); ds.connect(this.dsend!); const vs = c.createGain(); vs.gain.value = 0.3; a.connect(vs); vs.connect(this.vsend!);
    o.start(t); m.start(t); o.stop(t + 0.5); m.stop(t + 0.5); }
  private bell(t: number, f: number, dur: number) { for (const [r, a] of [[1, 1], [2, 0.35], [3.01, 0.18], [4.2, 0.08]]) this.tone(f * r, t, Math.min(3, dur + 0.8), 'sine', 0.08 * a, 0, this.mbus!, 0.55); }
  private kick(t: number) { const c = this.ctx!; const o = c.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.16); const a = c.createGain(); a.gain.setValueAtTime(0.22, t); a.gain.exponentialRampToValueAtTime(0.0001, t + 0.32); o.connect(a); a.connect(this.mbus!); o.start(t); o.stop(t + 0.35); }
  private hat(t: number, g: number, f = 7000) { this.hiss(t, 0.08, g * 2.6, f, 'highpass', this.mbus!); }
  private snap(t: number) { this.hiss(t, 0.16, 0.1, 1800, 'bandpass', this.mbus!, 0.8); this.hiss(t, 0.2, 0.03, 2200, 'bandpass', this.vsend!, 0.8); }
  // ---------------- the world: an environment bed for each place, and the base at work ----------------
  setAmbient(world: string, storm: number) { const c = this.ctx; if (!c || !this.wbus) return; if (!this.bed) this.bed = this.makeBed(); const B = this.bed, T = c.currentTime;
    const earth = world === 'earth', airless = ['moon', 'ceres'].includes(world), mars = world === 'mars', titan = world === 'titan', venus = world === 'venus', map = world === 'map';
    const wind = map ? 0 : airless ? 0.004 : (earth ? 0.04 : mars ? 0.06 : venus ? 0.07 : titan ? 0.04 : 0.045) * (1 + storm * 1.4);
    B.wind.gain.setTargetAtTime(wind, T, 1.2); B.windF.frequency.setTargetAtTime(earth ? 900 : mars ? 650 : venus ? 1200 : 700, T, 1); B.sea.gain.setTargetAtTime(earth ? 0.05 : 0, T, 1.5); B.hum.gain.setTargetAtTime(airless || map ? 0.025 : 0.008, T, 1.5); B.rain.gain.setTargetAtTime(titan ? 0.03 + storm * 0.05 : 0, T, 1.5); B.world = world; B.storm = storm; }
  private makeBed() { const c = this.ctx!; const src = (f: number, type: BiquadFilterType, q = 0.7) => { const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(this.wbus!); s.start(); return { g, fl }; };
    const w = src(900, 'bandpass', 0.6); const lfo = c.createOscillator(); lfo.frequency.value = 0.08; const lg = c.createGain(); lg.gain.value = 400; lfo.connect(lg); lg.connect(w.fl.frequency); lfo.start(); // gusts
    const sea = src(500, 'lowpass'); const swell = c.createGain(); swell.gain.value = 0.6; sea.fl.disconnect(); sea.fl.connect(swell); swell.connect(sea.g); const sl = c.createOscillator(); sl.frequency.value = 0.11; const sg = c.createGain(); sg.gain.value = 0.4; sl.connect(sg); sg.connect(swell.gain); sl.start(); // surf rolling in (the swell rides inside the level, so a dry world stays silent)
    const hum = c.createOscillator(); hum.type = 'triangle'; hum.frequency.value = 58; const hg = c.createGain(); hg.gain.value = 0; hum.connect(hg); hg.connect(this.wbus!); hum.start(); const rain = src(5000, 'highpass');
    window.setInterval(() => this.critters(), 900); return { wind: w.g, windF: w.fl, sea: sea.g, hum: hg, rain: rain.g, world: '', storm: 0 }; }
  // birds on Earth's coast (when the weather is fair), envelopes creaking on Venus
  private critters() { const c = this.ctx, B = this.bed; if (!c || !B || c.state !== 'running' || this.muted) return; const t = c.currentTime + Math.random() * 0.6;
    if (B.world === 'earth' && B.storm < 0.2 && Math.random() < 0.45) { const f = 2400 + Math.random() * 1800; const n = 2 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) this.tone(f * (1 + (Math.random() - 0.5) * 0.15), t + i * 0.09, 0.07, 'sine', 0.018, 1.35 + Math.random() * 0.3, this.wbus!, 0.25); }
    if (B.world === 'venus' && Math.random() < 0.2) this.tone(70 + Math.random() * 30, t, 1.2, 'sawtooth', 0.012, 1.4, this.wbus!, 0.4); }
  // what the camera sees at the base: construction, mining, refining, traffic, power (0 to 1 each)
  setSite(x: Site) { this.site = x; const c = this.ctx; if (!c || !this.wbus) return; if (!this.siteHum) { const mk = (f: number, type: OscillatorType) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; const g = c.createGain(); g.gain.value = 0; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; o.connect(lp); lp.connect(g); g.connect(this.wbus!); o.start(); return g; };
      const st = c.createBufferSource(); st.buffer = this.noiseBuf; st.loop = true; const sf = c.createBiquadFilter(); sf.type = 'highpass'; sf.frequency.value = 3500; const sg = c.createGain(); sg.gain.value = 0; st.connect(sf); sf.connect(sg); sg.connect(this.wbus!); st.start();
      this.siteHum = { pump: mk(46, 'sawtooth'), steam: sg, elec: mk(100, 'square') }; window.setInterval(() => this.siteTick(), 220); }
    const T = c.currentTime, H = this.siteHum; H.pump.gain.setTargetAtTime(0.02 * x.refinery, T, 0.5); H.steam.gain.setTargetAtTime(0.012 * x.refinery, T, 0.5); H.elec.gain.setTargetAtTime(0.006 * x.power, T, 0.5); }
  private siteTick() { const c = this.ctx, S = this.site; if (!c || c.state !== 'running' || this.muted) return; const t = c.currentTime + Math.random() * 0.15, W = this.wbus!;
    if (S.build > 0.05 && Math.random() < 0.55 * S.build) { this.metal(t, 0.05 * S.build, W); if (Math.random() < 0.3) this.metal(t + 0.18, 0.042 * S.build, W); if (Math.random() < 0.06) this.tone(180, t, 0.6, 'sawtooth', 0.012 * S.build, 1.6, W); } // hammering, the odd drill
    if (S.mine > 0.05 && Math.random() < 0.4 * S.mine) { this.tone(70, t, 0.22, 'sine', 0.08 * S.mine, 0.6, W); this.hiss(t + 0.02, 0.25, 0.045 * S.mine, 1400, 'bandpass', W, 1.2); if (Math.random() < 0.25) this.metal(t + 0.05, 0.025 * S.mine, W, 1500 + Math.random() * 500); } // picks and rock
    if (S.refinery > 0.05 && Math.random() < 0.06 * S.refinery) this.hiss(t, 0.9, 0.02 * S.refinery, 2500, 'highpass', W); // a valve venting
    if (S.traffic > 0.05 && Math.random() < 0.05 * S.traffic) { const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03 * S.traffic, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 2.6); const s = c.createBufferSource(); s.buffer = this.noiseBuf; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; s.connect(lp); lp.connect(g); g.connect(W); s.start(t); s.stop(t + 2.7); } } // a truck going by
}
