// Procedural WebAudio: synthesized SFX + a light generative soundtrack. No audio files.
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
      case 'shoot_fire': this.tone(420, 160, 0.14, 'sawtooth', V(0.08)); this.noiseHit(0.12, 1500, V(0.06)); break;
      case 'shoot_shock': this.tone(1400, 700, 0.06, 'square', V(0.04)); break;
      case 'shoot_slug': this.noiseHit(0.18, 900, V(0.2)); this.tone(160, 60, 0.16, 'square', V(0.1)); break;
      case 'shoot_seed': this.tone(700, 1000, 0.07, 'triangle', V(0.08)); break;
      case 'shoot_snipe': this.noiseHit(0.3, 2500, V(0.18)); this.tone(900, 120, 0.25, 'sawtooth', V(0.1)); break;
      case 'shoot_ice': this.tone(1800, 1200, 0.1, 'triangle', V(0.07)); break;
      case 'shoot_blade': this.tone(500, 900, 0.12, 'sawtooth', V(0.05)); break;
      case 'shoot_bullet': this.noiseHit(0.07, 3000, V(0.09)); this.tone(600, 200, 0.06, 'square', V(0.04)); break;
      case 'hit': this.tone(260, 140, 0.07, 'square', 0.08); break;
      case 'ko': this.tone(600, 80, 0.4, 'sawtooth', V(0.14)); this.noiseHit(0.35, 700, V(0.18)); break;
      case 'boom': this.noiseHit(0.5, 400, V(0.35)); this.tone(120, 40, 0.45, 'sine', V(0.3)); break;
      case 'fire': this.noiseHit(0.5, 1200, V(0.15)); break;
      case 'dash': this.noiseHit(0.2, 2400, V(0.1), 0, 'bandpass'); this.tone(300, 700, 0.15, 'sine', V(0.08)); break;
      case 'zap': for (let i = 0; i < 3; i++) this.tone(1200 - i * 200, 300, 0.08, 'square', V(0.06), i * 0.04); break;
      case 'blink': this.tone(400, 1600, 0.15, 'sine', V(0.12)); break;
      case 'wall': this.tone(140, 90, 0.2, 'square', V(0.12)); this.noiseHit(0.15, 600, V(0.1)); break;
      case 'root': this.tone(200, 90, 0.3, 'triangle', V(0.14)); break;
      case 'heal': this.tone(600, 900, 0.12, 'sine', V(0.1)); this.tone(900, 1200, 0.15, 'sine', V(0.08), 0.08); break;
      case 'smoke': this.noiseHit(0.6, 800, V(0.12)); break;
      case 'hook': this.tone(300, 900, 0.12, 'sawtooth', V(0.07)); break;
      case 'ice': this.tone(2000, 600, 0.25, 'triangle', V(0.1)); this.noiseHit(0.2, 5000, V(0.06), 0, 'highpass'); break;
      case 'rewind': this.tone(1200, 300, 0.3, 'sine', V(0.12)); break;
      case 'hole': this.tone(80, 40, 0.9, 'sawtooth', V(0.15)); break;
      case 'lance': this.tone(2000, 300, 0.3, 'sawtooth', V(0.1)); break;
      case 'shield': this.tone(500, 500, 0.2, 'triangle', V(0.1)); this.tone(750, 750, 0.2, 'triangle', V(0.07), 0.05); break;
      case 'ult': this.tone(200, 800, 0.35, 'sawtooth', V(0.12)); this.tone(300, 1200, 0.35, 'square', V(0.06), 0.05); break;
      case 'crate': this.noiseHit(0.2, 1200, V(0.2)); this.tone(220, 110, 0.12, 'square', V(0.06)); break;
      case 'steal': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, f, 0.14, 'square', 0.1, i * 0.06)); break;
      case 'upgrade': [523, 784, 1046, 1318, 1568].forEach((f, i) => this.tone(f, f * 1.01, 0.16, 'square', 0.1, i * 0.05)); break;
      case 'storm': this.tone(90, 60, 1.2, 'sawtooth', 0.12); this.noiseHit(1.2, 300, 0.12); break;
      case 'click': this.tone(800, 600, 0.05, 'square', 0.06); break;
      case 'buy': [659, 880, 1318].forEach((f, i) => this.tone(f, f, 0.12, 'triangle', 0.12, i * 0.07)); break;
      case 'win': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, f, 0.22, 'square', 0.1, i * 0.12)); break;
      case 'lose': [392, 349, 311, 262].forEach((f, i) => this.tone(f, f * 0.98, 0.3, 'triangle', 0.12, i * 0.18)); break;
      case 'level': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, f, 0.18, 'triangle', 0.12, i * 0.08)); break;
      case 'announce': this.tone(300, 600, 0.2, 'square', 0.1); this.tone(450, 900, 0.25, 'square', 0.08, 0.1); break;
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
    const prog = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62]];
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
