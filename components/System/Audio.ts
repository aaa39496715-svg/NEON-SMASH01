
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export class AudioController {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;

  constructor() {}

  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5; // 마스터 볼륨 약간 상향
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  async playStartBuzz() {
    await this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    
    // 강렬한 엔진 시동 사운드 (Layered oscillators)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const osc3 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(40, t);
    osc1.frequency.exponentialRampToValueAtTime(80, t + 0.5);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(42, t);
    osc2.frequency.exponentialRampToValueAtTime(82, t + 0.5);

    osc3.type = 'triangle'; // 서브 베이스 추가
    osc3.frequency.setValueAtTime(20, t);
    osc3.frequency.exponentialRampToValueAtTime(40, t + 0.5);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1.0, t + 0.02); // 매우 빠른 어택
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6); // 서서히 사라짐

    osc1.connect(gain);
    osc2.connect(gain);
    osc3.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc1.stop(t + 0.6);
    osc2.start(t);
    osc2.stop(t + 0.6);
    osc3.start(t);
    osc3.stop(t + 0.6);
  }

  playGemCollect() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(2000, t + 0.1);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playLetterCollect() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99]; 
    freqs.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.value = f;
        const start = t + (i * 0.04);
        const dur = 0.3;
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + dur);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(start);
        osc.stop(start + dur);
    });
  }

  playJump(isDouble = false) {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const startFreq = isDouble ? 400 : 200;
    const endFreq = isDouble ? 800 : 450;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.15);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playDamage() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.3);
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.6, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.3);
    noise.start(t);
    noise.stop(t + 0.3);
  }
}

export const audio = new AudioController();
