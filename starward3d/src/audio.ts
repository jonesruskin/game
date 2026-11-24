// Synthesised sound (WebAudio, no files): collection chimes that rise with the amount, construction thunks,
// feeding zaps and a level-up fanfare, plus a gentle generative ambient score.
type Cue = 'tap' | 'collect' | 'build' | 'done' | 'feed' | 'levelup' | 'deny' | 'harvest' | 'buy' | 'claim' | 'place' | 'whoosh';
export class Audio {
  ctx: AudioContext | null = null; out: GainNode | null = null; vol = 0.8; mvol = 0.45; muted = false; private music: { bus: GainNode; next: number; chord: number; lp: BiquadFilterNode } | null = null; private timer = 0;
  unlock() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; } try { this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); this.out = this.ctx.createGain(); this.out.gain.value = this.muted ? 0 : this.vol; this.out.connect(this.ctx.destination); } catch (e) { this.ctx = null; } }
  setVolume(v: number) { this.vol = v; if (this.out) this.out.gain.value = this.muted ? 0 : v; }
  setMuted(m: boolean) { this.muted = m; if (this.out) this.out.gain.value = m ? 0 : this.vol; if (this.music) this.music.bus.gain.value = m ? 0 : this.mvol * 0.4; }
  private tone(f: number, t: number, dur: number, type: OscillatorType = 'sine', g = 0.2, slide = 0) { const c = this.ctx!; const o = c.createOscillator(), a = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g, t + 0.008); a.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(a); a.connect(this.out!); o.start(t); o.stop(t + dur + 0.05); }
  private noise(t: number, dur: number, g = 0.2, f = 800) { const c = this.ctx!; const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = c.createBufferSource(); s.buffer = b; const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = f; const a = c.createGain(); a.gain.value = g; s.connect(fl); fl.connect(a); a.connect(this.out!); s.start(t); }
  play(cue: Cue, amount = 1) { if (!this.ctx || !this.out || this.muted) return; const t = this.ctx.currentTime;
    switch (cue) {
      case 'tap': this.tone(880, t, 0.06, 'triangle', 0.08); break;
      case 'collect': { const n = Math.min(6, 2 + Math.floor(Math.log10(Math.max(1, amount)))); [0, 4, 7, 12, 16, 19].slice(0, n).forEach((s, i) => this.tone(988 * Math.pow(2, s / 12), t + i * 0.055, 0.22, 'triangle', 0.12)); break; }
      case 'harvest': [0, 5, 9].forEach((s, i) => this.tone(660 * Math.pow(2, s / 12), t + i * 0.06, 0.2, 'square', 0.05)); this.tone(1320, t + 0.2, 0.3, 'sine', 0.08); break;
      case 'build': this.noise(t, 0.12, 0.25, 500); this.tone(120, t, 0.18, 'sine', 0.3, 0.5); break;
      case 'place': this.tone(220, t, 0.12, 'sine', 0.25, 0.6); this.noise(t, 0.08, 0.15, 1200); break;
      case 'done': [0, 4, 7, 12].forEach((s, i) => this.tone(523 * Math.pow(2, s / 12), t + i * 0.08, 0.3, 'triangle', 0.12)); break;
      case 'feed': this.tone(300, t, 0.15, 'sawtooth', 0.06, 2.2); this.tone(600, t + 0.05, 0.12, 'square', 0.04, 1.6); break;
      case 'levelup': [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => this.tone(392 * Math.pow(2, s / 12), t + i * 0.07, 0.5, 'triangle', 0.13)); [0, 4, 7].forEach((s) => this.tone(784 * Math.pow(2, s / 12), t + 0.55, 0.9, 'sine', 0.09)); break;
      case 'deny': this.tone(180, t, 0.16, 'square', 0.07, 0.7); break;
      case 'buy': this.tone(660, t, 0.1, 'triangle', 0.1); this.tone(990, t + 0.08, 0.18, 'triangle', 0.1); break;
      case 'claim': [0, 7, 12].forEach((s, i) => this.tone(659 * Math.pow(2, s / 12), t + i * 0.07, 0.35, 'triangle', 0.12)); break;
      case 'whoosh': this.noise(t, 0.35, 0.18, 2400); break;
    }
  }
  setMusic(v: number) { this.mvol = v; if (this.music) this.music.bus.gain.setTargetAtTime(this.muted ? 0 : v * 0.4, this.ctx!.currentTime, 0.4); else if (v > 0) this.startMusic(); }
  startMusic() { if (!this.ctx || this.music || this.mvol <= 0) return; const c = this.ctx; const bus = c.createGain(); bus.gain.value = 0; bus.gain.setTargetAtTime(this.muted ? 0 : this.mvol * 0.4, c.currentTime, 2); bus.connect(c.destination);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200; lp.connect(bus); this.music = { bus, next: c.currentTime + 0.5, chord: 0, lp };
    this.timer = window.setInterval(() => this.tick(), 300); }
  private tick() { const c = this.ctx, M = this.music; if (!c || !M || c.state !== 'running') return; const t = c.currentTime; if (t < M.next) return;
    const CH = [[261.63, 329.63, 392, 493.88], [220, 261.63, 329.63, 392], [174.61, 220, 261.63, 329.63], [196, 246.94, 293.66, 392], [233.08, 293.66, 349.23, 440]]; const ch = CH[M.chord % CH.length]; M.chord += 1 + (Math.random() < 0.25 ? 1 : 0); const dur = 9;
    for (const f of ch) for (const det of [-6, 5]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f / 2; o.detune.value = det; const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.011, t + 3); g.gain.setValueAtTime(0.011, t + dur - 2.5); g.gain.linearRampToValueAtTime(0, t + dur + 1); o.connect(g); g.connect(M.lp); o.start(t); o.stop(t + dur + 1.5); }
    for (let i = 0; i < 3; i++) { const f = ch[Math.floor(Math.random() * ch.length)] * 2; const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = c.createGain(); const tt = t + 1 + i * 2.4 + Math.random(); g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(0.03, tt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, tt + 2.5); o.connect(g); g.connect(M.bus); o.start(tt); o.stop(tt + 2.6); }
    M.lp.frequency.setTargetAtTime(800 + Math.random() * 900, t, 3); M.next = t + dur - 1.5; }
}
