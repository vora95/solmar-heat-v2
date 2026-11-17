// audio.js — all sound is synthesized with WebAudio: no audio files.
// Engine hum follows speed, the siren wails while wanted, plus blips and jingles.
export class AudioSys {
  constructor() {
    this.ctx = null; this.engineOsc = null; this.engineGain = null;
    this.sirenOsc = null; this.sirenGain = null; this.muted = false;
    this.sirenPhase = 0;
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 60;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 500;
      this.engineOsc.connect(filt); filt.connect(this.engineGain); this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sine';
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.ctx.destination);
      this.sirenOsc.start();
    } catch (e) { this.ctx = null; }
  }
  setEngine(speed01, driving) {
    if (!this.ctx || this.muted) return;
    const target = driving ? 0.05 + speed01 * 0.09 : 0;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    this.engineOsc.frequency.setTargetAtTime(55 + speed01 * 160, this.ctx.currentTime, 0.1);
  }
  setSiren(on, dt) {
    if (!this.ctx) return;
    this.sirenPhase += dt;
    if (on && !this.muted) {
      const f = 700 + 300 * Math.sin(this.sirenPhase * 4);
      this.sirenOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.05);
      this.sirenGain.gain.setTargetAtTime(0.03, this.ctx.currentTime, 0.1);
    } else this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
  }
  blip(freq = 660, dur = 0.08, vol = 0.08) {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }
  jingle() {
    if (!this.ctx || this.muted) return;
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.16, 0.1), i * 110));
  }
  setMuted(m) {
    this.muted = m;
    if (this.ctx && this.engineGain) this.engineGain.gain.value = 0;
  }
}
export const audio = new AudioSys();
