/**
 * Procedural Web Audio Sound Engine for Skyfire Ace
 * Zero external audio files, completely synthetic, responsive and low-latency.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineNoiseNode: AudioBufferSourceNode | null = null;
  private engineNoiseGain: GainNode | null = null;
  private rwrOsc: OscillatorNode | null = null;
  private rwrGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;
  private lastLockToneTime: number = 0;

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Jet Engine Continuous Loop
      this.setupEngineLoop();

      this.isInitialized = true;
    } catch {
      // Audio not supported or blocked
    }
  }

  private setupEngineLoop() {
    if (!this.ctx || !this.masterGain) return;

    // Sub-oscillator for jet turbine drone
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(65, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(260, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);
    this.engineOsc.start();

    // Procedural Pink Noise buffer for jet exhaust rumble
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    noiseFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

    this.engineNoiseGain = this.ctx.createGain();
    this.engineNoiseGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(this.engineNoiseGain);
    this.engineNoiseGain.connect(this.masterGain);
    noiseSource.start();
    this.engineNoiseNode = noiseSource;
  }

  public updateEngineSound(throttle: number, isBoosting: boolean) {
    if (!this.ctx || !this.engineOsc || !this.engineFilter || !this.engineNoiseGain || !this.engineGain) return;
    const targetFreq = 55 + throttle * 75 + (isBoosting ? 45 : 0);
    const targetFilter = 220 + throttle * 380 + (isBoosting ? 500 : 0);
    const targetVolume = 0.06 + throttle * 0.08 + (isBoosting ? 0.08 : 0);
    const targetNoiseVol = 0.08 + throttle * 0.12 + (isBoosting ? 0.16 : 0);

    const now = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.1);
    this.engineFilter.frequency.setTargetAtTime(targetFilter, now, 0.1);
    this.engineGain.gain.setTargetAtTime(targetVolume, now, 0.1);
    this.engineNoiseGain.gain.setTargetAtTime(targetNoiseVol, now, 0.1);
  }

  public playGunShot() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    // Punchy low transient
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.07);

    oscGain.gain.setValueAtTime(0.35, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);

    // Crack noise
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.05), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  public playRocketLaunch() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    // Sub whoosh
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.35);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.37);
  }

  public playMissileLaunch() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    // High velocity ignite whoosh
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.45);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + 0.45);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  public playFlareLaunch() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    // Mortar / ejection pop
    const popOsc = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(260, now);
    popOsc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
    popGain.gain.setValueAtTime(0.4, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    popOsc.connect(popGain);
    popGain.connect(this.sfxGain);
    popOsc.start(now);
    popOsc.stop(now + 0.1);

    // Sizzle sparkle
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.25), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin(i * 0.08);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2500, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  public playLockOnTone(isFullyLocked: boolean) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    if (now - this.lastLockToneTime < 0.12) return;
    this.lastLockToneTime = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isFullyLocked ? 1150 : 780, now);

    const dur = isFullyLocked ? 0.1 : 0.05;
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur + 0.01);
  }

  public playExplosion(isLarge: boolean = false) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const dur = isLarge ? 1.2 : 0.6;

    // Sub thud
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(isLarge ? 110 : 150, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + dur);
    oscGain.gain.setValueAtTime(isLarge ? 0.6 : 0.35, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur + 0.05);

    // Rumble noise
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.4));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isLarge ? 600 : 900, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + dur);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(isLarge ? 0.5 : 0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  public playPickup() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

    notes.forEach((freq, index) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + index * 0.05;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }

  public setRwrAlert(active: boolean) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    if (active) {
      if (!this.rwrOsc) {
        this.rwrOsc = this.ctx.createOscillator();
        this.rwrGain = this.ctx.createGain();
        this.rwrOsc.type = 'sawtooth';
        this.rwrOsc.frequency.setValueAtTime(950, this.ctx.currentTime);
        this.rwrGain.gain.setValueAtTime(0.16, this.ctx.currentTime);

        this.rwrOsc.connect(this.rwrGain);
        this.rwrGain.connect(this.sfxGain);
        this.rwrOsc.start();
      }
    } else {
      if (this.rwrOsc) {
        try {
          this.rwrOsc.stop();
          this.rwrOsc.disconnect();
        } catch {
          // ignore
        }
        this.rwrOsc = null;
        this.rwrGain = null;
      }
    }
  }

  public playWaveAlert() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const chords = [392.0, 523.25, 659.25]; // G4, C5, E5
    chords.forEach((f) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.55);
    });
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.8, this.ctx.currentTime);
    }
  }
}

export const soundManager = new SoundEngine();
