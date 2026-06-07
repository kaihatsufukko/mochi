/**
 * Retro Sound Effects using Web Audio API
 * Generates 16-bit style sound effects procedurally
 */

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized: boolean = false;

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'square', volume: number = 0.3) {
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  }

  private playNoise(duration: number, volume: number = 0.2) {
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    source.connect(gain);
    gain.connect(this.masterGain);
    source.start(this.ctx.currentTime);
  }

  // Sound effects
  shoot() {
    this.playTone(800, 0.05, 'square', 0.15);
    this.playTone(600, 0.03, 'sawtooth', 0.1);
  }

  enemyHit() {
    this.playTone(300, 0.08, 'square', 0.2);
    this.playNoise(0.05, 0.1);
  }

  enemyDie() {
    this.playTone(200, 0.15, 'sawtooth', 0.25);
    this.playTone(100, 0.2, 'square', 0.15);
    this.playNoise(0.1, 0.15);
  }

  gateGood() {
    this.playTone(523, 0.1, 'square', 0.2);
    setTimeout(() => this.playTone(659, 0.1, 'square', 0.2), 80);
    setTimeout(() => this.playTone(784, 0.15, 'square', 0.2), 160);
  }

  gateBad() {
    this.playTone(200, 0.15, 'sawtooth', 0.25);
    setTimeout(() => this.playTone(150, 0.2, 'sawtooth', 0.25), 100);
  }

  kaijuAttack() {
    this.playTone(80, 0.5, 'sawtooth', 0.3);
    this.playTone(60, 0.6, 'square', 0.2);
    this.playNoise(0.4, 0.2);
    setTimeout(() => {
      this.playTone(100, 0.3, 'sawtooth', 0.25);
      this.playNoise(0.3, 0.15);
    }, 200);
  }

  bossWarning() {
    this.playTone(440, 0.2, 'square', 0.3);
    setTimeout(() => this.playTone(440, 0.2, 'square', 0.3), 300);
    setTimeout(() => this.playTone(440, 0.2, 'square', 0.3), 600);
    setTimeout(() => this.playTone(880, 0.4, 'square', 0.3), 900);
  }

  playerHit() {
    this.playTone(150, 0.2, 'square', 0.3);
    this.playNoise(0.15, 0.2);
  }

  gameOver() {
    this.playTone(440, 0.3, 'square', 0.25);
    setTimeout(() => this.playTone(370, 0.3, 'square', 0.25), 300);
    setTimeout(() => this.playTone(330, 0.3, 'square', 0.25), 600);
    setTimeout(() => this.playTone(262, 0.6, 'square', 0.25), 900);
  }

  victory() {
    this.playTone(523, 0.15, 'square', 0.25);
    setTimeout(() => this.playTone(659, 0.15, 'square', 0.25), 150);
    setTimeout(() => this.playTone(784, 0.15, 'square', 0.25), 300);
    setTimeout(() => this.playTone(1047, 0.4, 'square', 0.3), 450);
  }

  startGame() {
    this.playTone(262, 0.1, 'square', 0.2);
    setTimeout(() => this.playTone(523, 0.2, 'square', 0.25), 100);
  }
}

export const audio = new AudioManager();
