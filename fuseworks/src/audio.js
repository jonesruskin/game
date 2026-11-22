// Synthesised audio — no files. Fireworks (boom/echo, crackle, whistle, fizz, glitter), a rising pentatonic
// chain melody (every burst plays the next note), score ticks/slams, applause, UI sounds and a generative
// lo-fi festival groove whose intensity follows the action.
const SCALE = [0, 2, 4, 7, 9];
const KEYS = [0, 5, 2, 7, 3, 8, 10, 1]; // per-night key changes (semitones from C)
const PROG_MAJ = [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 12, 14, 17]]; // Imaj7 vi7 IVmaj7 V7sus
const PROG_MIN = [[9, 12, 16, 19], [5, 9, 12, 16], [0, 4, 7, 11], [7, 11, 14, 17]];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Audio {
  constructor() { this.ctx = null; this.sfxVol = 0.8; this.musVol = 0.55; this.muted = false; this.key = 0; this.mood = 'title'; this.intensity = 0; this.lastBoom = 0; this.booms = 0; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = (this.ctx = new AC()); const sr = c.sampleRate;
    this.master = c.createGain(); this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.knee.value = 10; this.comp.ratio.value = 5; this.comp.attack.value = 0.004; this.comp.release.value = 0.2;
    this.master.connect(this.comp).connect(c.destination);
    this.sfx = c.createGain(); this.sfx.connect(this.master); this.mus = c.createGain(); this.musDuck = c.createGain(); this.mus.connect(this.musDuck).connect(this.master);
    // reverb (synthetic impulse) + city echo
    const ir = c.createBuffer(2, Math.floor(sr * 2.6), sr); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 2.4) * (t < 0.02 ? t / 0.02 : 1); } }
    this.rev = c.createConvolver(); this.rev.buffer = ir; this.revIn = c.createGain(); this.revIn.gain.value = 0.9; const revLp = c.createBiquadFilter(); revLp.type = 'lowpass'; revLp.frequency.value = 5200; this.revIn.connect(this.rev).connect(revLp).connect(this.master);
    this.echo = c.createDelay(1.5); this.echo.delayTime.value = 0.34; const fb = c.createGain(); fb.gain.value = 0.32; const elp = c.createBiquadFilter(); elp.type = 'lowpass'; elp.frequency.value = 900; this.echoIn = c.createGain(); this.echoIn.connect(this.echo); this.echo.connect(elp).connect(fb).connect(this.echo); elp.connect(this.master);
    // noise buffers
    this.noise = c.createBuffer(1, sr * 2, sr); { const d = this.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    this.crackBuf = c.createBuffer(1, sr * 2, sr); { const d = this.crackBuf.getChannelData(0); for (let k = 0; k < 220; k++) { const at = Math.floor(Math.random() * (d.length - 2000)); const len = 80 + Math.random() * 500; const amp = 0.3 + Math.random() * 0.7; for (let i = 0; i < len; i++) d[at + i] += (Math.random() * 2 - 1) * amp * Math.exp(-i / (len * 0.25)); } }
    this.applyVol(); this.startMusic();
  }
  applyVol() { if (!this.ctx) return; const m = this.muted ? 0 : 1; this.sfx.gain.value = this.sfxVol * m; this.mus.gain.value = this.musVol * 0.5 * m; }
  setVolumes(sfx, mus) { this.sfxVol = sfx; this.musVol = mus; this.applyVol(); }
  setMuted(v) { this.muted = v; this.applyVol(); }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  get now() { return this.ctx.currentTime; }
  // ---------------------------------------------------------------- building blocks
  env(g, t, a, peak, d, end = 0.0001) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(end, t + a + d); }
  out(node, pan = 0, rev = 0, echo = 0, bus = this.sfx) { const c = this.ctx; let n = node; if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; n.connect(p); n = p; } n.connect(bus); if (rev) { const s = c.createGain(); s.gain.value = rev; n.connect(s).connect(this.revIn); } if (echo) { const s = c.createGain(); s.gain.value = echo; n.connect(s).connect(this.echoIn); } return n; }
  noiseSrc(t, dur, off = Math.random()) { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.start(t, off * 1.2, dur + 0.05); return s; }
  osc(type, f, t, dur) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(t + dur + 0.05); return o; }
  // ---------------------------------------------------------------- fireworks
  boom(size = 1, pan = 0, small = false) {
    if (!this.ctx) return; const c = this.ctx, t = this.now + 0.005;
    if (t - this.lastBoom < 0.045) { this.booms++; if (this.booms > 3) return; } else this.booms = 0; this.lastBoom = t;
    const v = Math.min(1.3, size) * (small ? 0.5 : 1) * (0.85 + Math.random() * 0.3);
    const o = this.osc('sine', 120 * (0.9 + Math.random() * 0.2), t, 0.9); o.frequency.exponentialRampToValueAtTime(34, t + 0.4); const og = c.createGain(); this.env(og, t, 0.004, 0.9 * v, 0.75); o.connect(og); this.out(og, pan * 0.5);
    const n = this.noiseSrc(t, 1.6); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(160, t + 0.9); lp.Q.value = 0.6; const ng = c.createGain(); this.env(ng, t, 0.006, 0.75 * v, 1.4); n.connect(lp).connect(ng); this.out(ng, pan, 0.35, small ? 0 : 0.42);
    const h = this.noiseSrc(t, 0.12); const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2800; const hg = c.createGain(); this.env(hg, t, 0.002, 0.4 * v, 0.07); h.connect(hp).connect(hg); this.out(hg, pan);
    this.duck(0.55, 0.25);
  }
  duck(depth, dur) { if (!this.ctx) return; const g = this.musDuck.gain, t = this.now; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(1 - depth, t + 0.02); g.linearRampToValueAtTime(1, t + dur + 0.3); }
  crackle(intensity = 1, dur = 0.6, delay = 0.38) { if (!this.ctx) return; const c = this.ctx, t = this.now + delay; const s = c.createBufferSource(); s.buffer = this.crackBuf; s.start(t, Math.random() * 1.2, dur + 0.3); const bp = c.createBiquadFilter(); bp.type = 'highpass'; bp.frequency.value = 1400; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.42 * intensity, t + 0.04); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.25); s.connect(bp).connect(g); this.out(g, (Math.random() - 0.5) * 0.8, 0.25); }
  pop(v = 0.3) { if (!this.ctx) return; const c = this.ctx, t = this.now; const n = this.noiseSrc(t, 0.04); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800 + Math.random() * 2000; const g = c.createGain(); this.env(g, t, 0.001, v, 0.035); n.connect(bp).connect(g); this.out(g, (Math.random() - 0.5) * 0.6, 0.2); }
  whistle(dur = 0.45) { if (!this.ctx) return; const c = this.ctx, t = this.now; const o = this.osc('sine', 900, t, dur + 0.1); o.frequency.exponentialRampToValueAtTime(2300 + Math.random() * 500, t + dur); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + 0.05); g.gain.linearRampToValueAtTime(0.0001, t + dur); o.connect(g); this.out(g, 0, 0.3);
    const n = this.noiseSrc(t, dur + 0.1); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.setValueAtTime(700, t); bp.frequency.exponentialRampToValueAtTime(3500, t + dur); const ng = c.createGain(); this.env(ng, t, 0.03, 0.22, dur); n.connect(bp).connect(ng); this.out(ng, 0, 0.2); }
  whoosh(dur = 0.6) { if (!this.ctx) return; const c = this.ctx, t = this.now; const n = this.noiseSrc(t, dur + 0.2); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9; bp.frequency.setValueAtTime(600, t); bp.frequency.exponentialRampToValueAtTime(2400, t + dur); const g = c.createGain(); this.env(g, t, 0.05, 0.3, dur); n.connect(bp).connect(g); this.out(g, 0, 0.3); }
  fizz(dur = 1.5) { if (!this.ctx) return; const c = this.ctx, t = this.now + 0.15; const n = this.noiseSrc(t, dur); const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); n.connect(hp).connect(g); this.out(g, (Math.random() - 0.5) * 0.6, 0.4); }
  glitter() { if (!this.ctx) return; const t0 = this.now + 0.2; for (let i = 0; i < 6; i++) { const t = t0 + Math.random() * 0.9; const o = this.osc('sine', 3500 + Math.random() * 3500, t, 0.08); const g = this.ctx.createGain(); this.env(g, t, 0.002, 0.035, 0.07); o.connect(g); this.out(g, (Math.random() - 0.5), 0.5); } }
  hiss() { if (!this.ctx) return; const c = this.ctx, t = this.now; const n = this.noiseSrc(t, 0.6); const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000; const g = c.createGain(); this.env(g, t, 0.02, 0.15, 0.5); n.connect(hp).connect(g); this.out(g); }
  // chain melody: i-th burst of the chain → next pentatonic note
  note(i, vel = 1, when = 0) {
    if (!this.ctx) return; const c = this.ctx, t = this.now + when; const deg = Math.min(i, 17); const oct = Math.floor(deg / 5), d = SCALE[deg % 5];
    const f = mtof(67 + this.key + oct * 12 + d); const v = 0.13 * vel * (i > 17 ? 1.1 : 1);
    for (const [mul, a, dec] of [[1, 1, 0.9], [2, 0.35, 0.45], [3.01, 0.12, 0.25], [0.5, 0.25, 0.6]]) { const o = this.osc('sine', f * mul, t, dec + 0.1); const g = c.createGain(); this.env(g, t, 0.004, v * a, dec); o.connect(g); this.out(g, 0, 0.55); }
  }
  tick(p = 0) { if (!this.ctx) return; const c = this.ctx, t = this.now; const o = this.osc('triangle', 520 * Math.pow(2, Math.min(p, 24) / 12), t, 0.06); const g = c.createGain(); this.env(g, t, 0.002, 0.06, 0.05); o.connect(g); this.out(g); }
  slam(power = 1) {
    if (!this.ctx) return; const c = this.ctx, t = this.now; this.boom(1.1 * power, 0, false);
    const root = 48 + this.key; for (const iv of [0, 7, 12, 16, 19]) { for (const det of [-6, 6]) { const o = this.osc('sawtooth', mtof(root + iv), t, 0.9); o.detune.value = det; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(4000, t); lp.frequency.exponentialRampToValueAtTime(300, t + 0.7); const g = c.createGain(); this.env(g, t, 0.006, 0.05 * power, 0.75); o.connect(lp).connect(g); this.out(g, det / 30, 0.4); } }
  }
  fanfare(level = 1) {
    if (!this.ctx) return; const t = this.now; const root = 60 + this.key; const seq = [0, 4, 7, 12, 16, 19, 24].slice(0, 4 + Math.min(3, level));
    seq.forEach((iv, k) => this.bell(mtof(root + iv), t + k * 0.075, 0.16, 1.1));
    this.bell(mtof(root + 24), t + seq.length * 0.075 + 0.05, 0.12, 1.6); this.cymbal(t, 1.4); this.applause(1.6 + level, 0.6 + level * 0.15);
  }
  bell(f, t, v, dec) { const c = this.ctx; for (const [m, a] of [[1, 1], [2.76, 0.28], [5.4, 0.1]]) { const o = this.osc('sine', f * m, t, dec); const g = c.createGain(); this.env(g, t, 0.003, v * a, dec); o.connect(g); this.out(g, 0, 0.5); } }
  cymbal(t, dur) { const c = this.ctx; const n = this.noiseSrc(t, dur); const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6500; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); n.connect(hp).connect(g); this.out(g, 0, 0.5); }
  applause(dur = 2, intensity = 0.7) {
    if (!this.ctx) return; const c = this.ctx, t0 = this.now + 0.1; const rate = 45 * intensity;
    const roar = this.noiseSrc(t0, dur + 0.6); const lp = c.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 700; lp.Q.value = 0.5; const rg = c.createGain(); rg.gain.setValueAtTime(0.0001, t0); rg.gain.linearRampToValueAtTime(0.1 * intensity, t0 + 0.3); rg.gain.linearRampToValueAtTime(0.0001, t0 + dur + 0.5); roar.connect(lp).connect(rg); this.out(rg, 0, 0.3);
    for (let i = 0; i < rate * dur; i++) { const t = t0 + Math.random() * dur * (0.6 + 0.4 * Math.random()); const n = this.noiseSrc(t, 0.03); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900 + Math.random() * 1800; bp.Q.value = 1.4; const g = c.createGain(); const fade = 1 - (t - t0) / (dur + 0.2); this.env(g, t, 0.001, 0.05 * intensity * Math.max(0.1, fade) * (0.5 + Math.random()), 0.02 + Math.random() * 0.02); n.connect(bp).connect(g); this.out(g, Math.random() * 1.6 - 0.8, 0.15); }
  }
  // ---------------------------------------------------------------- UI
  ui(kind) {
    if (!this.ctx) return; const c = this.ctx, t = this.now;
    if (kind === 'click') { this.bell(mtof(84 + this.key), t, 0.05, 0.12); }
    else if (kind === 'hover') { const o = this.osc('sine', 1900, t, 0.04); const g = c.createGain(); this.env(g, t, 0.002, 0.018, 0.03); o.connect(g); this.out(g); }
    else if (kind === 'buy') { this.bell(mtof(88), t, 0.08, 0.3); this.bell(mtof(95), t + 0.07, 0.08, 0.5); this.glitter(); }
    else if (kind === 'coin') { this.bell(mtof(91), t, 0.06, 0.25); }
    else if (kind === 'sell') { this.bell(mtof(79), t, 0.07, 0.3); this.bell(mtof(74), t + 0.06, 0.06, 0.3); }
    else if (kind === 'error') { const o = this.osc('square', 110, t, 0.18); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; const g = c.createGain(); this.env(g, t, 0.005, 0.07, 0.16); o.connect(lp).connect(g); this.out(g); }
    else if (kind === 'flip') { const n = this.noiseSrc(t, 0.08); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; const g = c.createGain(); this.env(g, t, 0.004, 0.12, 0.06); n.connect(bp).connect(g); this.out(g); }
    else if (kind === 'pack') { this.whoosh(0.4); [0, 4, 7, 12].forEach((iv, k) => this.bell(mtof(76 + this.key + iv), t + 0.15 + k * 0.06, 0.06, 0.5)); }
    else if (kind === 'level') { [0, 4, 7, 11, 14].forEach((iv, k) => this.bell(mtof(72 + this.key + iv), t + k * 0.05, 0.07, 0.6)); }
    else if (kind === 'move') { const o = this.osc('sine', 300, t, 0.15); o.frequency.exponentialRampToValueAtTime(600, t + 0.1); const g = c.createGain(); this.env(g, t, 0.005, 0.06, 0.12); o.connect(g); this.out(g, 0, 0.2); }
    else if (kind === 'lose') { [12, 7, 3, 0].forEach((iv, k) => this.bell(mtof(60 + this.key + iv), t + k * 0.18, 0.08, 0.9)); }
  }
  // ---------------------------------------------------------------- music
  setMood(m) { this.mood = m; }
  setKey(night) { this.key = KEYS[(night - 1) % KEYS.length]; }
  startMusic() { this.step = 0; this.nextT = this.ctx.currentTime + 0.1; this.bar = 0; if (this.timer) clearInterval(this.timer); this.timer = setInterval(() => this.schedule(), 30); this.pad = null; }
  schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return; const spb = 60 / 92 / 4; // 16th note length
    while (this.nextT < this.ctx.currentTime + 0.15) { this.playStep(this.step, this.nextT); const swing = this.step % 2 ? -0.018 : 0.018; this.nextT += spb + swing; this.step = (this.step + 1) % 64; }
  }
  playStep(s, t) {
    const mood = this.mood; if (mood === 'silent') return; const c = this.ctx; const beat = s % 16; const barN = Math.floor(s / 16); const prog = mood === 'boss' ? PROG_MIN : PROG_MAJ; const ch = prog[barN % 4]; const root = 48 + this.key; const I = Math.min(1, this.intensity);
    const drums = mood === 'play' || mood === 'boss'; const soft = mood === 'shop' || mood === 'title';
    if (beat === 0) this.padChord(ch, t, (60 / 92) * 4, soft ? 0.05 : 0.04);
    // e-piano stabs
    if (beat === 0 || beat === 6 || (beat === 10 && barN % 2)) for (const iv of ch) this.epiano(mtof(root + 12 + iv), t, soft ? 0.03 : 0.035);
    // bass
    if (!(mood === 'title')) { if (beat === 0 || beat === 7 || beat === 10) { const f = mtof(root - 12 + ch[0] + (beat === 10 ? 7 : 0)); const o = this.osc('triangle', f, t, 0.4); const g = c.createGain(); this.env(g, t, 0.01, 0.14, 0.35); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; o.connect(lp).connect(g); this.out(g, 0, 0, 0, this.mus); } }
    if (drums) {
      if (beat === 0 || beat === 8 || (beat === 11 && I > 0.3)) { const o = this.osc('sine', 120, t, 0.3); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); const g = c.createGain(); this.env(g, t, 0.003, 0.32, 0.22); o.connect(g); this.out(g, 0, 0, 0, this.mus); }
      if (beat === 4 || beat === 12) { const n = this.noiseSrc(t, 0.2); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.8; const g = c.createGain(); this.env(g, t, 0.002, 0.13, 0.14); n.connect(bp).connect(g); this.out(g, 0, 0.25, 0, this.mus); }
      if (beat % 2 === 0 || I > 0.5) { const n = this.noiseSrc(t, 0.05); const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7500; const g = c.createGain(); this.env(g, t, 0.001, beat % 4 === 2 ? 0.05 : 0.025, 0.03); n.connect(hp).connect(g); this.out(g, 0.3, 0, 0, this.mus); }
    } else if (mood === 'shop' && (beat === 4 || beat === 12)) { const n = this.noiseSrc(t, 0.1); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; const g = c.createGain(); this.env(g, t, 0.002, 0.04, 0.08); n.connect(bp).connect(g); this.out(g, 0, 0.3, 0, this.mus); }
    // twinkly arp
    const pArp = mood === 'title' ? 0.32 : soft ? 0.22 : 0.12 + I * 0.4;
    if (Math.random() < pArp && beat % 2 === 0) { const n = ch[Math.floor(Math.random() * 4)] + (Math.random() < 0.5 ? 24 : 12); const f = mtof(root + n); const o = this.osc('sine', f, t, 0.5); const g = c.createGain(); this.env(g, t, 0.004, 0.035, 0.42); o.connect(g); this.out(g, Math.random() - 0.5, 0.6, 0, this.mus); }
  }
  padChord(ch, t, dur, v) { const c = this.ctx; const root = 48 + this.key; for (const iv of ch) for (const det of [-8, 8]) { const o = this.osc('sawtooth', mtof(root + iv), t, dur + 0.6); o.detune.value = det; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650 + this.intensity * 900; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.5, t + 0.5); g.gain.linearRampToValueAtTime(v * 0.35, t + dur * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.5); o.connect(lp).connect(g); this.out(g, det / 20, 0.4, 0, this.mus); } }
  epiano(f, t, v) { const c = this.ctx; const car = this.osc('sine', f, t, 1.2); const mod = this.osc('sine', f, t, 1.2); const mg = c.createGain(); mg.gain.setValueAtTime(f * 1.6, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.5); mod.connect(mg).connect(car.frequency); const g = c.createGain(); this.env(g, t, 0.006, v, 1.0); car.connect(g); this.out(g, 0, 0.35, 0, this.mus); }
}
