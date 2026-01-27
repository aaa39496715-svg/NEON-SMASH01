
export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private nextNoteTime: number = 0;
  private bgmActive: boolean = false;
  private currentMode: 'MENU' | 'GAME' = 'MENU';
  private lastHitTime: number = 0;
  private beatCount: number = 0;
  
  private _bgmVolume: number = 0.6;
  private _sfxVolume: number = 1.0;

  constructor() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.filter = this.ctx.createBiquadFilter();
      
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(20000, this.ctx.currentTime);
      
      this.masterGain.connect(this.filter);
      this.filter.connect(this.ctx.destination);
      
      // Load saved volumes
      const savedBGM = localStorage.getItem('neon_smash_bgm_vol');
      const savedSFX = localStorage.getItem('neon_smash_sfx_vol');
      if (savedBGM !== null) this._bgmVolume = parseFloat(savedBGM);
      if (savedSFX !== null) this._sfxVolume = parseFloat(savedSFX);
      
      this.updateMasterVolume();
    } catch (e) {
      console.warn("AudioContext not supported");
    }
  }

  private updateMasterVolume() {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0.4 * this._sfxVolume, this.ctx.currentTime, 0.1);
    }
    if (this.bgmGain && this.ctx) {
      const baseVol = this.currentMode === 'GAME' ? 0.12 : 0.15;
      this.bgmGain.gain.setTargetAtTime(baseVol * this._bgmVolume, this.ctx.currentTime, 0.1);
    }
  }

  public setBGMVolume(val: number) {
    this._bgmVolume = val;
    localStorage.setItem('neon_smash_bgm_vol', val.toString());
    this.updateMasterVolume();
  }

  public setSFXVolume(val: number) {
    this._sfxVolume = val;
    localStorage.setItem('neon_smash_sfx_vol', val.toString());
    this.updateMasterVolume();
  }

  public getBGMVolume() { return this._bgmVolume; }
  public getSFXVolume() { return this._sfxVolume; }

  public resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private canPlay(key: string, cooldown: number = 50): boolean {
    const now = Date.now();
    if (key === 'hit' && now - this.lastHitTime < cooldown) return false;
    if (key === 'hit') this.lastHitTime = now;
    return true;
  }

  playHit(freq: number = 440, type: OscillatorType = 'sine') {
    this.resume();
    if (!this.ctx || !this.masterGain || !this.canPlay('hit')) return;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    
    const detune = (Math.random() - 0.5) * 15;
    osc.type = type;
    osc.frequency.setValueAtTime(freq + detune, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, this.ctx.currentTime + 0.12);
    
    // SFX volume applied here
    g.gain.setValueAtTime(0.15 * this._sfxVolume, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playCollect() {
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const startTime = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; 
    
    notes.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, startTime + i * 0.04);
      g.gain.setValueAtTime(0.12 * this._sfxVolume, startTime + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.01, startTime + i * 0.04 + 0.2);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(startTime + i * 0.04);
      osc.stop(startTime + i * 0.04 + 0.2);
    });
  }

  playLevelUp() {
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const startTime = this.ctx.currentTime;
    const notes = [440, 554, 659, 880, 1108, 1318];
    
    notes.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, startTime + i * 0.08);
      g.gain.setValueAtTime(0.04 * this._sfxVolume, startTime + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.005, startTime + i * 0.08 + 0.4);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(startTime + i * 0.08);
      osc.stop(startTime + i * 0.08 + 0.5);
    });
  }

  playGameOver() {
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 1.2);
    
    g.gain.setValueAtTime(0.25 * this._sfxVolume, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);
    
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.2);
  }

  setMuffled(muffled: boolean) {
    if (!this.filter || !this.ctx) return;
    const freq = muffled ? 400 : 20000;
    this.filter.frequency.exponentialRampToValueAtTime(freq, this.ctx.currentTime + 0.5);
  }

  startBGM(mode: 'MENU' | 'GAME', speedMultiplier: number = 1) {
    this.resume();
    if (!this.ctx || !this.masterGain) return;
    
    this.stopBGM();
    this.bgmActive = true;
    this.currentMode = mode;
    this.bgmGain = this.ctx.createGain();
    
    const baseVol = mode === 'GAME' ? 0.12 : 0.15;
    this.bgmGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.bgmGain.gain.linearRampToValueAtTime(baseVol * this._bgmVolume, this.ctx.currentTime + 1.5);
    this.bgmGain.connect(this.masterGain);
    
    this.nextNoteTime = this.ctx.currentTime;
    const tempo = (mode === 'GAME' ? 150 : 85) * speedMultiplier;
    const secondsPerBeat = 60.0 / tempo;

    const scheduler = () => {
      if (!this.bgmActive || !this.ctx) return;
      while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
        if (this.currentMode === 'GAME') this.scheduleGameBeat(this.nextNoteTime);
        else this.scheduleMenuBeat(this.nextNoteTime);
        this.nextNoteTime += secondsPerBeat;
        this.beatCount++;
      }
      requestAnimationFrame(scheduler);
    };
    scheduler();
  }

  private scheduleMenuBeat(time: number) {
    if (!this.ctx || !this.bgmGain || this.beatCount % 8 !== 0) return;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    const freqs = [110, 138.59, 164.81]; 
    const f = freqs[Math.floor(this.beatCount / 8) % freqs.length];
    
    osc.frequency.setValueAtTime(f, time);
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.1, time + 2);
    g.gain.linearRampToValueAtTime(0, time + 6);
    
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(400, time);
    
    osc.connect(lp);
    lp.connect(g);
    g.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 6);
  }

  private scheduleGameBeat(time: number) {
    if (!this.ctx || !this.bgmGain) return;

    if (this.beatCount % 4 === 0 || this.beatCount % 16 === 10) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(65, time);
      osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);
      g.gain.setValueAtTime(0.6, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(g);
      g.connect(this.bgmGain);
      osc.start(time);
      osc.stop(time + 0.15);
    }

    if (this.beatCount % 8 === 4) {
      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseG = this.ctx.createGain();
      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1200, time);
      noiseG.gain.setValueAtTime(0.15, time);
      noiseG.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      noise.connect(bandpass);
      bandpass.connect(noiseG);
      noiseG.connect(this.bgmGain);
      noise.start(time);
    }

    const notes = [110, 110, 146.83, 130.81, 110, 164.81, 146.83, 110]; 
    const note = notes[this.beatCount % notes.length];
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(note, time);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.1);
    
    g2.gain.setValueAtTime(0.08, time);
    g2.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    osc2.connect(filter);
    filter.connect(g2);
    g2.connect(this.bgmGain);
    osc2.start(time);
    osc2.stop(time + 0.12);

    if (this.beatCount % 2 === 1) {
      const noiseG = this.ctx.createGain();
      const highpass = this.ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(7000, time);
      
      const bufferSize = this.ctx.sampleRate * 0.02;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      noiseG.gain.setValueAtTime(0.04, time);
      noiseG.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
      noise.connect(highpass);
      highpass.connect(noiseG);
      noiseG.connect(this.bgmGain);
      noise.start(time);
    }
  }

  stopBGM() {
    this.bgmActive = false;
    if (this.bgmGain && this.ctx) {
      const target = this.bgmGain;
      target.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
      setTimeout(() => { try { target.disconnect(); } catch (e) {} }, 600);
      this.bgmGain = null;
    }
  }
}

export const sound = new SoundManager();
