// Procedural WebAudio for HORDEMIND: synthesized SFX + generative soundtrack. No audio files.
const rnd = (a, b) => a + Math.random() * (b - a);
export class Audio {
  constructor() { this.ctx = null; this.sfxVol = 0.7; this.musicVol = 0.35; this.muted = false; this.forceMute = false; this.last = {}; this.listener = { x: 0, y: 0 }; this.musicOn = false; this.mode = 'lobby'; }
  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC();
        this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
        this.sfx = this.ctx.createGain(); this.sfx.connect(this.master);
        this.music = this.ctx.createGain(); this.music.connect(this.master);
        const len = this.ctx.sampleRate; this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate); const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.apply();
      } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  apply() { if (!this.ctx) return; const m = this.muted || this.forceMute; this.master.gain.value = m ? 0 : 1; this.sfx.gain.value = this.sfxVol; this.music.gain.value = this.musicVol; }
  setForceMute(v) { this.forceMute = v; this.apply(); }
  tone(f0, f1, dur, type = 'square', vol = 0.2, delay = 0, dest) {
    const c = this.ctx, t = c.currentTime + delay; const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.02);
  }
  noiseHit(dur, freq, vol = 0.2, delay = 0, type = 'lowpass', dest) {
    const c = this.ctx, t = c.currentTime + delay; const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfx); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  play(name, x, y, mine) {
    if (!this.ctx || this.muted || this.forceMute) return;
    const now = this.ctx.currentTime; const minGap = name.startsWith('shoot') ? (mine ? 0.04 : 0.07) : 0.05;
    if (this.last[name] && now - this.last[name] < minGap) return; this.last[name] = now;
    let v = 1;
    if (x !== undefined && !mine) { const d = Math.hypot(x - this.listener.x, y - this.listener.y); if (d > 1400) return; v = Math.max(0.08, 1 - d / 1400); v *= v; }
    const V = (a) => a * v;
    switch (name) {
      case 'ability': this.tone(200, 900, 0.35, 'sawtooth', 0.12); this.tone(300, 1200, 0.3, 'square', 0.06, 0.05); break;
      case 'pop': this.noiseHit(0.25, 700, V(0.25)); this.tone(160, 50, 0.2, 'sine', V(0.2)); break;
      case 'squish': this.tone(rnd(300, 500), 80, 0.08, 'triangle', V(0.06)); break;
      case 'queenhit': this.tone(220, 80, 0.25, 'sawtooth', 0.16); this.noiseHit(0.2, 900, 0.14); break;
      case 'win': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, f, 0.22, 'square', 0.1, i * 0.12)); break;
      case 'lose': [392, 349, 311, 262].forEach((f, i) => this.tone(f, f * 0.98, 0.3, 'triangle', 0.12, i * 0.18)); break;
      case 'evolve': [392, 523, 659, 784].forEach((f, i) => this.tone(f, f * 1.01, 0.2, 'triangle', 0.1, i * 0.07)); break;
      case 'pick': [659, 988, 1318].forEach((f, i) => this.tone(f, f, 0.12, 'square', 0.08, i * 0.05)); break;
      case 'herolevel': this.tone(150, 300, 0.4, 'sawtooth', 0.1); this.tone(225, 450, 0.4, 'sawtooth', 0.06, 0.1); break;
      case 'enrage': this.tone(90, 60, 1.2, 'sawtooth', 0.18); this.noiseHit(1, 300, 0.15); break;
      case 'shield': this.tone(500, 500, 0.3, 'triangle', 0.1); this.tone(750, 750, 0.3, 'triangle', 0.07, 0.05); break;
      case 'blink': this.tone(400, 1600, 0.15, 'sine', 0.1); break;
      case 'turret': this.tone(140, 90, 0.2, 'square', 0.1); break;
      case 'raise': this.tone(120, 60, 0.6, 'sawtooth', 0.12); this.tone(180, 90, 0.6, 'triangle', 0.08, 0.1); break;
      case 'telegraph': this.tone(880, 660, 0.12, 'square', 0.05); break;
      case 'swipe': this.noiseHit(0.12, 2500, V(0.08), 0, 'bandpass'); break;
      case 'blast': this.noiseHit(0.4, 600, 0.22); this.tone(110, 45, 0.35, 'sine', 0.22); break;
      case 'orb': this.tone(900, 1300, 0.06, 'sine', 0.05); break;
      case 'click': this.tone(800, 600, 0.05, 'square', 0.06); break;
      case 'buy': [659, 880, 1318].forEach((f, i) => this.tone(f, f, 0.12, 'triangle', 0.12, i * 0.07)); break;
      case 'level': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, f, 0.18, 'triangle', 0.12, i * 0.08)); break;
      case 'announce': this.tone(300, 600, 0.2, 'square', 0.08); break;
    }
  }
  // ----- generative music: bass + arpeggio, intensity follows game mode
  startMusic() {
    if (!this.ctx || this.musicOn) return; this.musicOn = true; this.step = 0; this.nextT = this.ctx.currentTime + 0.1;
    const tick = () => { if (!this.musicOn) return; while (this.nextT < this.ctx.currentTime + 0.25) { this.musicStep(this.nextT); this.nextT += this.mode === 'match' ? 0.15 : 0.22; } this.musicTimer = setTimeout(tick, 80); };
    tick();
  }
  stopMusic() { this.musicOn = false; clearTimeout(this.musicTimer); }
  musicStep(t) {
    if (this.muted || this.forceMute || this.musicVol <= 0) { this.step++; return; }
    const prog = [[57, 60, 63, 67], [53, 56, 60, 63], [55, 58, 62, 65], [50, 53, 57, 60]];
    const bar = Math.floor(this.step / 16) % 4, s = this.step % 16; const ch = prog[bar];
    const mf = (n) => 440 * Math.pow(2, (n - 69) / 12);
    const c = this.ctx; const delay = t - c.currentTime;
    if (s % 4 === 0) this.tone(mf(ch[0] - 24), mf(ch[0] - 24), 0.3, 'triangle', 0.18, delay, this.music);
    if (this.mode === 'match') { if (s % 2 === 0) this.noiseHit(0.04, 7000, 0.03, delay, 'highpass', this.music); if (s % 8 === 4) this.noiseHit(0.12, 1800, 0.08, delay, 'bandpass', this.music); if (s % 8 === 0) this.tone(120, 45, 0.18, 'sine', 0.22, delay, this.music); }
    const pat = [0, 2, 1, 3, 2, 1, 3, 2];
    if (s % 2 === 0 || this.mode === 'match') this.tone(mf(ch[pat[s % 8]] + 12), mf(ch[pat[s % 8]] + 12), 0.12, 'square', 0.035, delay, this.music);
    this.step++;
  }
}
