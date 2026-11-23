// STARWARD: synthesised sound (WebAudio). Short UI cues for now; a generative score arrives with the polish pass.
export class Audio {
  constructor() { this.ctx = null; this.vol = 0.7; this.muted = false; }
  unlock() { if (this.ctx) { if (this.ctx.state === 'suspended' && !this.muted) this.ctx.resume().catch(() => {}); return; } const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; this.ctx = new AC(); this.out = this.ctx.createGain(); this.out.gain.value = this.muted ? 0 : this.vol; this.out.connect(this.ctx.destination); }
  setVolume(v) { this.vol = v; if (this.out) this.out.gain.value = this.muted ? 0 : v; }
  setMuted(m) { this.muted = m; if (this.out) this.out.gain.value = m ? 0 : this.vol; }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }
  resume() { if (this.ctx && this.ctx.state === 'suspended' && !this.muted) this.ctx.resume().catch(() => {}); }
  tone(f, d, g, type = 'sine', at = 0, f2) { const c = this.ctx, t = c.currentTime + at; const o = c.createOscillator(), v = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + 0.008); v.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(v); v.connect(this.out); o.start(t); o.stop(t + d + 0.05); }
  play(n) {
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
    switch (n) {
      case 'tap': this.tone(1400, 0.05, 0.05, 'triangle'); break;
      case 'build': this.tone(220, 0.12, 0.12, 'square', 0, 330); this.tone(660, 0.1, 0.06, 'triangle', 0.08); break;
      case 'done': [523, 659, 784].forEach((f, i) => this.tone(f, 0.35, 0.08, 'triangle', i * 0.07)); break;
      case 'research': [392, 523, 659, 1046].forEach((f, i) => this.tone(f, 0.5, 0.07, 'sine', i * 0.09)); break;
      case 'claim': [523, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.6, 0.08, 'triangle', i * 0.08)); break;
      case 'dm': this.tone(300, 0.4, 0.08, 'sine', 0, 1200); this.tone(1800, 0.3, 0.04, 'sine', 0.15); break;
      case 'deny': this.tone(200, 0.15, 0.1, 'triangle'); this.tone(150, 0.2, 0.1, 'triangle', 0.1); break;
    }
  }
}
