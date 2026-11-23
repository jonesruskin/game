// GLINT: every sound is synthesised live with WebAudio. Stone clinks and crunches, the hum and hiss of the
// faceting lap, crystalline chimes, the shop bell and till, rain on the window, and a generative late-night
// lounge trio (FM electric piano, walking upright bass, brushed hats) that never repeats.
export class Audio {
  constructor() { this.ctx = null; this.muted = false; this.sfxVol = 0.8; this.musVol = 0.5; this.grind = null; this.polish = null; this.music = null; this.started = false; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && !this.muted) this.ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = (this.ctx = new AC()); this.out = c.createGain(); this.out.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.connect(this.out);
    this.sfx = c.createGain(); this.sfx.gain.value = this.sfxVol; this.sfx.connect(comp);
    this.mus = c.createGain(); this.mus.gain.value = this.musVol * 0.5; this.mus.connect(comp);
    this.amb = c.createGain(); this.amb.gain.value = this.sfxVol * 0.5; this.amb.connect(comp);
    // room reverb (generated impulse) shared by music + chimes
    this.rev = c.createConvolver(); const len = c.sampleRate * 2.2, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    this.rev.buffer = ir; this.revOut = c.createGain(); this.revOut.gain.value = 0.28; this.rev.connect(this.revOut); this.revOut.connect(comp);
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; this.noiseBuf = nb;
    this.setMuted(this.muted); this.startAmbience(); this.startMusic();
  }
  setMuted(m) { this.muted = m; if (!this.ctx) return; this.out.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05); }
  setVolumes(sfx, mus) { this.sfxVol = sfx; this.musVol = mus; if (!this.ctx) return; this.sfx.gain.value = sfx; this.mus.gain.value = mus * 0.5; this.amb.gain.value = sfx * 0.5; }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }
  resume() { if (this.ctx && this.ctx.state === 'suspended' && !this.muted) this.ctx.resume().catch(() => {}); }
  get t() { return this.ctx.currentTime; }
  // ---- building blocks ----
  noise(dur, f, q, gain, type = 'bandpass', at = 0, dest = this.sfx) {
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = c.createGain(); const t = this.t + at; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05); return { fl, g };
  }
  tone(f, dur, gain, type = 'sine', at = 0, dest = this.sfx, attack = 0.005, rev = 0) {
    const c = this.ctx; const o = c.createOscillator(); o.type = type; o.frequency.value = f; const g = c.createGain(); const t = this.t + at;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); if (rev) { const rg = c.createGain(); rg.gain.value = rev; g.connect(rg); rg.connect(this.rev); } o.start(t); o.stop(t + dur + 0.05); return o;
  }
  bell(f, dur, gain, at = 0, rev = 0.6) { for (const [r, a] of [[1, 1], [2.76, 0.42], [5.4, 0.22], [8.93, 0.1]]) this.tone(f * r, dur / Math.sqrt(r), gain * a, 'sine', at, this.sfx, 0.002, rev); }
  ok() { return this.ctx && !this.muted && this.ctx.state === 'running'; }
  // ---- sound effects ----
  play(name, a = 0, b = 0) {
    if (!this.ok()) return; const S = this;
    switch (name) {
      case 'tap': S.tone(1800, 0.05, 0.05, 'triangle'); S.noise(0.03, 4000, 1, 0.03); break;
      case 'soft': S.tone(900, 0.08, 0.04, 'sine'); break;
      case 'hammer': { const p = 1 + a * 0.12; S.noise(0.12, 2200 * p, 2.5, 0.5); S.tone(95, 0.18, 0.5, 'sine'); S.tone(1240 * p, 0.25, 0.08, 'sine'); S.tone(2710 * p, 0.18, 0.05, 'sine'); S.noise(0.3, 600, 0.7, 0.12, 'lowpass', 0.01); break; }
      case 'crack': S.noise(0.5, 1400, 0.6, 0.8, 'lowpass'); S.noise(0.35, 3800, 1.2, 0.35); S.tone(70, 0.4, 0.6, 'sine'); for (let i = 0; i < 9; i++) S.noise(0.04, 3000 + Math.random() * 4000, 4, 0.12, 'bandpass', 0.08 + Math.random() * 0.5); break;
      case 'reveal': { const base = [523.25, 587.33, 659.25, 783.99, 880][Math.min(4, a)]; const steps = [0, 4, 7, 12, 16, 19, 24].slice(0, 3 + a); steps.forEach((st, i) => S.bell(base * Math.pow(2, st / 12), 1.6 + a * 0.3, 0.09, i * 0.07, 0.8)); if (a >= 3) for (let i = 0; i < 14; i++) S.tone(2000 + Math.random() * 3000, 0.3, 0.025, 'sine', 0.3 + i * 0.06, S.sfx, 0.002, 0.9); break; }
      case 'ting': S.bell(1975, 1.4, 0.12, 0, 0.9); S.bell(2637, 1.0, 0.06, 0.04, 0.9); break;
      case 'meet': S.bell(1318.5, 0.9, 0.1, 0, 0.7); break;
      case 'over': S.tone(160, 0.25, 0.3, 'triangle'); S.noise(0.2, 400, 1, 0.2, 'lowpass'); break;
      case 'stamp': S.tone(80, 0.15, 0.6, 'sine'); S.noise(0.08, 900, 0.8, 0.4, 'lowpass'); S.noise(0.12, 3000, 1, 0.08); break;
      case 'paper': S.noise(0.25, 2500, 0.6, 0.12, 'highpass'); break;
      case 'cash': S.noise(0.05, 2000, 2, 0.25); S.tone(220, 0.05, 0.2, 'square', 0.02); S.bell(2093, 0.9, 0.12, 0.08, 0.5); S.bell(2637, 0.9, 0.1, 0.16, 0.5); break;
      case 'coin': S.bell(3135 + Math.random() * 300, 0.35, 0.05, 0, 0.3); break;
      case 'door': S.bell(1046.5, 1.6, 0.11, 0, 0.6); S.bell(830.6, 1.8, 0.1, 0.22, 0.6); break;
      case 'sparkle': S.tone(3000 + Math.random() * 3500, 0.18, 0.03, 'sine', 0, S.sfx, 0.001, 0.8); break;
      case 'buy': S.tone(660, 0.1, 0.08, 'triangle'); S.tone(990, 0.15, 0.08, 'triangle', 0.08); break;
      case 'deny': S.tone(220, 0.15, 0.1, 'triangle'); S.tone(185, 0.2, 0.1, 'triangle', 0.1); break;
      case 'fanfare': [0, 4, 7, 12, 7, 12, 16].forEach((st, i) => S.bell(523.25 * Math.pow(2, st / 12), 1.2, 0.1, i * 0.11, 0.8)); break;
      case 'whoosh': S.noise(0.35, 900, 0.6, 0.15, 'bandpass'); break;
      case 'drip': S.tone(1400 + Math.random() * 500, 0.08, 0.05, 'sine'); break;
      case 'chip': S.noise(0.04, 5000, 3, 0.15); break;
    }
  }
  // continuous lap: hum + grind hiss; intensity 0..1, tension 0..1 (pitch rises near the meet)
  grindOn(on, intensity = 1, tension = 0) {
    if (!this.ctx) return; const c = this.ctx;
    if (!this.grind) {
      const hum = c.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 58; const hf = c.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 260; const hg = c.createGain(); hg.gain.value = 0;
      hum.connect(hf); hf.connect(hg); hg.connect(this.sfx); hum.start();
      const n = c.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true; const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 2600; nf.Q.value = 1.4; const ng = c.createGain(); ng.gain.value = 0;
      const lfo = c.createOscillator(); lfo.frequency.value = 13; const lg = c.createGain(); lg.gain.value = 0.25; lfo.connect(lg); lg.connect(ng.gain); lfo.start();
      n.connect(nf); nf.connect(ng); ng.connect(this.sfx); n.start();
      this.grind = { hg, ng, nf, hum };
    }
    const g = this.grind, t = c.currentTime;
    g.hg.gain.setTargetAtTime(on ? 0.07 : 0.0, t, 0.08); g.ng.gain.setTargetAtTime(on ? 0.16 * intensity : 0, t, 0.05);
    g.nf.frequency.setTargetAtTime(2200 + tension * 2600, t, 0.05); g.hum.frequency.setTargetAtTime(58 + tension * 8, t, 0.2);
  }
  polishOn(speed) {
    if (!this.ctx) return; const c = this.ctx;
    if (!this.polish) { const n = c.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 3; const g = c.createGain(); g.gain.value = 0; n.connect(f); f.connect(g); g.connect(this.sfx); n.start(); this.polish = { g, f }; }
    this.polish.g.gain.setTargetAtTime(Math.min(0.22, speed * 0.08), c.currentTime, 0.04); this.polish.f.frequency.setTargetAtTime(1400 + Math.min(3, speed) * 900, c.currentTime, 0.05);
  }
  // ---- ambience: rain on glass + a clock ----
  startAmbience() {
    const c = this.ctx; const n = c.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; const g = c.createGain(); g.gain.value = 0.05;
    n.connect(f); f.connect(g); g.connect(this.amb); n.start(); this.rain = g;
    const drop = () => { if (this.ctx && this.ok() && this.rainOn) { const d = this.noise(0.03, 3000 + Math.random() * 3000, 6, 0.012 + Math.random() * 0.02, 'bandpass', 0, this.amb); void d; } this.dropT = setTimeout(drop, 40 + Math.random() * 160); }; drop();
    this.rainOn = true;
  }
  setRain(on) { this.rainOn = on; if (this.rain) this.rain.gain.setTargetAtTime(on ? 0.05 : 0.0, this.ctx.currentTime, 1); }
  // ---- generative lounge trio ----
  startMusic() {
    const c = this.ctx; const bpm = 82, beat = 60 / bpm; let next = c.currentTime + 0.3, step = 0;
    // ii-V-I-VI in a few keys, 7th/9th voicings (semitones from key root)
    const prog = [[2, [0, 3, 7, 10, 14]], [7, [0, 4, 7, 10, 13]], [0, [0, 4, 7, 11, 14]], [9, [0, 3, 7, 10, 14]]];
    const keys = [0, 5, -2, 3, -4]; let key = 0, bar = 0;
    const ep = (f, t, dur, vel) => { // FM electric piano
      const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain(); car.frequency.value = f; mod.frequency.value = f * 1.0; mg.gain.setValueAtTime(f * 1.6 * vel, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.9);
      mod.connect(mg); mg.connect(car.frequency); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05 * vel, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const tr = c.createGain(); tr.gain.value = 0.35; car.connect(g); g.connect(this.mus); g.connect(tr); tr.connect(this.rev); car.start(t); mod.start(t); car.stop(t + dur + 0.1); mod.stop(t + dur + 0.1);
    };
    const bass = (f, t, dur) => { const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(lp); lp.connect(g); g.connect(this.mus); o.start(t); o.stop(t + dur + 0.05); };
    const hat = (t, v) => { const s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.018 * v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); s.connect(f); f.connect(g); g.connect(this.mus); s.start(t, Math.random()); s.stop(t + 0.2); };
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const tick = () => {
      if (!this.ctx) return;
      while (next < c.currentTime + 0.6) {
        const b = step % 4, chord = prog[bar % 4]; const root = 48 + keys[key] + chord[0];
        const swing = b % 2 === 1 ? beat * 0.08 : 0; const t = next + swing;
        if (this.musVol > 0.01) {
          if (b === 0 || (b === 2 && Math.random() < 0.5)) { const v = 0.6 + Math.random() * 0.4; chord[1].slice(1).forEach((iv, i) => ep(mtof(root + 12 + iv), t + i * 0.012, beat * (b === 0 ? 2.6 : 1.4), v)); }
          // walking bass
          const walk = [0, chord[1][2], chord[1][1], b === 3 ? (prog[(bar + 1) % 4][0] - chord[0] + 13) % 12 - 1 : chord[1][3] - 12]; bass(mtof(root - 12 + walk[b]), t, beat * 0.9);
          hat(t, b % 2 ? 0.6 : 1); if (Math.random() < 0.35) hat(t + beat * 0.66, 0.4);
          // occasional melody note from the chord's scale
          if (Math.random() < 0.22) ep(mtof(root + 24 + chord[1][Math.floor(Math.random() * 5)]), t + beat * 0.5, beat * 1.5, 0.45);
        }
        next += beat; step++; if (step % 4 === 0) { bar++; if (bar % 16 === 0) key = (key + 1) % keys.length; }
      }
      this.musT = setTimeout(tick, 120);
    };
    tick();
  }
}
