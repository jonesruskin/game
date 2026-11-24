// STARWARD: synthesised sound (WebAudio). UI cues, plus a generative ambient score: slow pad chords that never
// quite repeat, a deep drone, and bell-like sparkles in D minor pentatonic drifting through an echo. No audio files.
export class Audio {
  constructor() { this.ctx = null; this.vol = 0.7; this.muted = false; this.mvol = 0.45; this.music = null; }
  unlock() { if (this.ctx) { if (this.ctx.state === 'suspended' && !this.muted) this.ctx.resume().catch(() => {}); return; } const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; this.ctx = new AC(); this.out = this.ctx.createGain(); this.out.gain.value = this.muted ? 0 : this.vol; this.out.connect(this.ctx.destination); }
  // ---------------- the score ----------------
  setMusic(v) { this.mvol = v; if (this.music) this.music.bus.gain.setTargetAtTime(this.muted ? 0 : v * 0.5, this.ctx.currentTime, 0.4); if (v > 0 && !this.music && this.ctx) this.startMusic(); }
  startMusic() { if (!this.ctx || this.music || this.mvol <= 0) return; const c = this.ctx; const bus = c.createGain(); bus.gain.value = 0; bus.gain.setTargetAtTime(this.muted ? 0 : this.mvol * 0.5, c.currentTime, 2); bus.connect(c.destination);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.4; lp.connect(bus);
    const dly = c.createDelay(2); dly.delayTime.value = 0.48; const fb = c.createGain(); fb.gain.value = 0.42; const wet = c.createGain(); wet.gain.value = 0.35; dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(bus);
    const drone = c.createOscillator(); drone.type = 'sine'; drone.frequency.value = 73.42; const dg = c.createGain(); dg.gain.value = 0.09; const trem = c.createOscillator(); trem.frequency.value = 0.07; const tg = c.createGain(); tg.gain.value = 0.02; trem.connect(tg); tg.connect(dg.gain); drone.connect(dg); dg.connect(lp); drone.start(); trem.start();
    this.music = { bus, lp, dly, chord: 0, next: c.currentTime + 0.5, bell: c.currentTime + 3, nodes: [drone, trem] };
    this.musicTimer = setInterval(() => this.tickMusic(), 250); }
  tickMusic() { const c = this.ctx, M = this.music; if (!M || c.state !== 'running') return; const t = c.currentTime;
    const CHORDS = [[146.83, 174.61, 220, 261.63, 329.63], [116.54, 146.83, 174.61, 220, 293.66], [110, 130.81, 174.61, 220, 261.63], [98, 130.81, 164.81, 196, 246.94], [116.54, 174.61, 233.08, 261.63, 349.23], [130.81, 164.81, 196, 246.94, 329.63]];
    if (t >= M.next) { const ch = CHORDS[M.chord % CHORDS.length]; M.chord += 1 + (Math.random() < 0.3 ? 1 : 0); const dur = 11;
      for (const f of ch) for (const det of [-5, 6]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det + (Math.random() - 0.5) * 4; const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03, t + 3.5); g.gain.setValueAtTime(0.03, t + dur - 3); g.gain.linearRampToValueAtTime(0, t + dur + 1.5); o.connect(g); g.connect(M.lp); o.start(t); o.stop(t + dur + 2); }
      M.lp.frequency.setTargetAtTime(700 + Math.random() * 900, t, 3); M.next = t + dur - 1.5; }
    if (t >= M.bell) { const PENTA = [587.33, 698.46, 783.99, 880, 1046.5, 1174.66, 1396.91, 1567.98]; const f = PENTA[Math.floor(Math.random() * PENTA.length)]; const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.76; const g = c.createGain(), g2 = c.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.11, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5); g2.gain.setValueAtTime(0.025, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.2); o.connect(g); o2.connect(g2); g.connect(M.dly); g2.connect(M.dly); g.connect(M.lp); o.start(t); o2.start(t); o.stop(t + 4); o2.stop(t + 1.5); M.bell = t + 1.6 + Math.random() * 3.5; } }
  setVolume(v) { this.vol = v; if (this.out) this.out.gain.value = this.muted ? 0 : v; }
  setMuted(m) { this.muted = m; if (this.out) this.out.gain.value = m ? 0 : this.vol; if (this.music) this.music.bus.gain.value = m ? 0 : this.mvol * 0.5; }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }
  resume() { if (this.ctx && this.ctx.state === 'suspended' && !this.muted) this.ctx.resume().catch(() => {}); }
  tone(f, d, g, type = 'sine', at = 0, f2) { const c = this.ctx, t = c.currentTime + at; const o = c.createOscillator(), v = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + 0.008); v.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(v); v.connect(this.out); o.start(t); o.stop(t + d + 0.05); }
  noise(d, g, freq, at = 0) { const c = this.ctx, t = c.currentTime + at; const n = Math.floor(c.sampleRate * d); const b = c.createBuffer(1, n, c.sampleRate); const a = b.getChannelData(0); let last = 0; for (let i = 0; i < n; i++) { last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; a[i] = last * 3.5; }
    const src = c.createBufferSource(); src.buffer = b; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; const v = c.createGain(); v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + 0.6); v.gain.exponentialRampToValueAtTime(0.0001, t + d); src.connect(f); f.connect(v); v.connect(this.out); src.start(t); src.stop(t + d + 0.05); }
  play(n) {
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
    switch (n) {
      case 'tap': this.tone(1400, 0.05, 0.05, 'triangle'); break;
      case 'build': this.tone(220, 0.12, 0.12, 'square', 0, 330); this.tone(660, 0.1, 0.06, 'triangle', 0.08); break;
      case 'done': [523, 659, 784].forEach((f, i) => this.tone(f, 0.35, 0.08, 'triangle', i * 0.07)); break;
      case 'research': [392, 523, 659, 1046].forEach((f, i) => this.tone(f, 0.5, 0.07, 'sine', i * 0.09)); break;
      case 'claim': [523, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.6, 0.08, 'triangle', i * 0.08)); break;
      case 'dm': this.tone(300, 0.4, 0.08, 'sine', 0, 1200); this.tone(1800, 0.3, 0.04, 'sine', 0.15); break;
      case 'launch': this.noise(5.5, 0.32, 180, 0.4); this.tone(55, 5, 0.18, 'sawtooth', 0.3, 38); this.tone(90, 3, 0.06, 'triangle', 0.5, 60); break;
      case 'arrive': [659, 880, 1175].forEach((f, i) => this.tone(f, 0.7, 0.07, 'sine', i * 0.12)); this.tone(1760, 0.9, 0.03, 'sine', 0.36); break;
      case 'fail': this.tone(330, 0.5, 0.08, 'sawtooth', 0, 110); this.noise(0.8, 0.12, 600, 0); break;
      case 'deny': this.tone(200, 0.15, 0.1, 'triangle'); this.tone(150, 0.2, 0.1, 'triangle', 0.1); break;
    }
  }
}
