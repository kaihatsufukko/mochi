// AudioManager — Web Audio synthesized placeholder SFX + event log.
// Contract: docs/architecture.md §4. No three.js / DOM dependency (window use is guarded).
//
// 17 fixed event IDs. Each has a distinct synthesized voice so they can be
// told apart by ear. Each SOUND_DEFS entry may later gain a `file` property
// ('assets/sfx/<name>.mp3') — when present the file is fetched + decoded and
// played instead of the synth (see sounds.md for the swap procedure).

const LOG_LIMIT = 2000;
const THROTTLE_MS = 45; // real-audio throttle per event name; log/onEvent are NEVER throttled

// ---------------------------------------------------------------------------
// Sound definitions.
// Each def: { synth: (ctx, dest, t0) => void, file?: 'assets/sfx/name.mp3' }
// Synth helpers below build oscillator/noise voices with envelopes.
// ---------------------------------------------------------------------------

/**
 * Simple oscillator voice.
 * o: { type, freq, freqEnd?, dur, attack?, decay?, gain?, delay? }
 * freqEnd triggers an exponential pitch sweep over dur.
 */
function tone(ctx, dest, t0, o) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const start = t0 + (o.delay || 0);
  const dur = o.dur;
  const attack = o.attack != null ? o.attack : 0.005;
  const peak = o.gain != null ? o.gain : 0.22;

  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.freq, start);
  if (o.freqEnd != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), start + dur);
  }

  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  osc.connect(g);
  g.connect(dest);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** Shared white-noise buffer (1s), lazily built per context. */
let _noiseBuf = null;
let _noiseCtx = null;
function noiseBuffer(ctx) {
  if (_noiseBuf && _noiseCtx === ctx) return _noiseBuf;
  const len = Math.floor(ctx.sampleRate * 1.0);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  _noiseBuf = buf;
  _noiseCtx = ctx;
  return buf;
}

/**
 * Noise burst voice.
 * o: { dur, gain?, attack?, delay?, filterType?, freq?, freqEnd?, Q? }
 */
function noise(ctx, dest, t0, o) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const g = ctx.createGain();
  const start = t0 + (o.delay || 0);
  const dur = o.dur;
  const attack = o.attack != null ? o.attack : 0.003;
  const peak = o.gain != null ? o.gain : 0.25;

  let node = src;
  if (o.filterType) {
    const f = ctx.createBiquadFilter();
    f.type = o.filterType;
    f.frequency.setValueAtTime(o.freq != null ? o.freq : 1000, start);
    if (o.freqEnd != null) {
      f.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), start + dur);
    }
    if (o.Q != null) f.Q.value = o.Q;
    src.connect(f);
    node = f;
  }

  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  node.connect(g);
  g.connect(dest);
  src.start(start);
  src.stop(start + dur + 0.02);
}

// Each synth receives (ctx, dest, t0) and schedules its voices.
export const SOUND_DEFS = {
  // Short bright square blip, quick downward snap — machine-gun friendly.
  shoot: {
    synth(ctx, dest, t0) {
      tone(ctx, dest, t0, { type: 'square', freq: 1650, freqEnd: 900, dur: 0.05, gain: 0.12, attack: 0.001 });
    },
  },

  // Dull mid thock: short triangle with tiny pitch drop.
  zombie_hit: {
    synth(ctx, dest, t0) {
      tone(ctx, dest, t0, { type: 'triangle', freq: 420, freqEnd: 260, dur: 0.07, gain: 0.2, attack: 0.002 });
    },
  },

  // Sagging sawtooth groan, longer and lower than zombie_hit.
  zombie_death: {
    synth(ctx, dest, t0) {
      tone(ctx, dest, t0, { type: 'sawtooth', freq: 300, freqEnd: 70, dur: 0.22, gain: 0.18, attack: 0.004 });
      noise(ctx, dest, t0, { dur: 0.12, gain: 0.06, filterType: 'lowpass', freq: 900, freqEnd: 200 });
    },
  },

  // Metallic plink: high sine with fast decay + faint octave partial.
  gate_hit: {
    synth(ctx, dest, t0) {
      tone(ctx, dest, t0, { type: 'sine', freq: 2100, dur: 0.06, gain: 0.14, attack: 0.001 });
      tone(ctx, dest, t0, { type: 'sine', freq: 4200, dur: 0.04, gain: 0.05, attack: 0.001 });
    },
  },

  // Short rising pitch zip — "value ticked up".
  gate_value_change: {
    synth(ctx, dest, t0) {
      tone(ctx, dest, t0, { type: 'square', freq: 700, freqEnd: 1400, dur: 0.09, gain: 0.12, attack: 0.002 });
    },
  },

  // Bright ascending 2-note chime (C6 -> G6), sine.
  gate_pass_blue: {
    synth(ctx, dest, t0) {
      tone(ctx, dest, t0, { type: 'sine', freq: 1046.5, dur: 0.1, gain: 0.2, attack: 0.003 });
      tone(ctx, dest, t0, { type: 'sine', freq: 1568.0, dur: 0.14, gain: 0.2, attack: 0.003, delay: 0.09 });
    },
  },

  // Descending 2-note (G5 -> C5), darker triangle — mirror of blue.
  gate_pass_red: {
    synth(ctx, dest, t0) {
      tone(ctx, dest, t0, { type: 'triangle', freq: 784.0, dur: 0.1, gain: 0.22, attack: 0.003 });
      tone(ctx, dest, t0, { type: 'triangle', freq: 523.25, dur: 0.16, gain: 0.22, attack: 0.003, delay: 0.09 });
    },
  },

  // Positive pop: fast wide upward sine sweep, bubbly.
  squad_gain: {
    synth(ctx, dest, t0) {
      tone(ctx, dest, t0, { type: 'sine', freq: 500, freqEnd: 1900, dur: 0.12, gain: 0.22, attack: 0.002 });
    },
  },

  // Low dull thud: sub-ish sine drop + tiny lowpassed noise knock.
  squad_loss: {
    synth(ctx, dest, t0) {
      tone(ctx, dest, t0, { type: 'sine', freq: 180, freqEnd: 60, dur: 0.18, gain: 0.3, attack: 0.002 });
      noise(ctx, dest, t0, { dur: 0.05, gain: 0.08, filterType: 'lowpass', freq: 400 });
    },
  },

  // Glassy shatter: bright highpassed noise + high sine sparkle falling.
  ice_crash: {
    synth(ctx, dest, t0) {
      noise(ctx, dest, t0, { dur: 0.28, gain: 0.22, filterType: 'highpass', freq: 2500, Q: 0.7 });
      tone(ctx, dest, t0, { type: 'sine', freq: 3400, freqEnd: 1300, dur: 0.2, gain: 0.08, attack: 0.001 });
      tone(ctx, dest, t0, { type: 'sine', freq: 5200, freqEnd: 2400, dur: 0.14, gain: 0.05, attack: 0.001, delay: 0.03 });
    },
  },

  // Big boom: long lowpassed noise sweeping down + sub sine drop.
  barrel_explode: {
    synth(ctx, dest, t0) {
      noise(ctx, dest, t0, { dur: 0.55, gain: 0.34, filterType: 'lowpass', freq: 1600, freqEnd: 90, attack: 0.002 });
      tone(ctx, dest, t0, { type: 'sine', freq: 120, freqEnd: 35, dur: 0.4, gain: 0.3, attack: 0.002 });
    },
  },

  // Hard metallic clank: detuned square pair, mid register, fast decay.
  boss_hit: {
    synth(ctx, dest, t0) {
      tone(ctx, dest, t0, { type: 'square', freq: 620, freqEnd: 520, dur: 0.07, gain: 0.1, attack: 0.001 });
      tone(ctx, dest, t0, { type: 'square', freq: 660, freqEnd: 540, dur: 0.07, gain: 0.1, attack: 0.001 });
    },
  },

  // Ice-mech destruction: glass-like high-frequency noise burst + wide
  // sparkle sweep + low body crunch. Longer/bigger than ice_crash.
  boss_break: {
    synth(ctx, dest, t0) {
      noise(ctx, dest, t0, { dur: 0.6, gain: 0.3, filterType: 'highpass', freq: 3200, Q: 0.8 });
      noise(ctx, dest, t0, { dur: 0.45, gain: 0.2, filterType: 'bandpass', freq: 1200, freqEnd: 300, Q: 1.2, delay: 0.02 });
      tone(ctx, dest, t0, { type: 'sine', freq: 6000, freqEnd: 1800, dur: 0.35, gain: 0.07, attack: 0.001 });
      tone(ctx, dest, t0, { type: 'sine', freq: 90, freqEnd: 40, dur: 0.5, gain: 0.24, attack: 0.003 });
    },
  },

  // Menacing swell: slow rising sawtooth pair (dissonant) + rumble noise.
  horde_start: {
    synth(ctx, dest, t0) {
      tone(ctx, dest, t0, { type: 'sawtooth', freq: 110, freqEnd: 220, dur: 0.7, gain: 0.16, attack: 0.15 });
      tone(ctx, dest, t0, { type: 'sawtooth', freq: 116, freqEnd: 233, dur: 0.7, gain: 0.16, attack: 0.15 });
      noise(ctx, dest, t0, { dur: 0.7, gain: 0.1, filterType: 'lowpass', freq: 300, attack: 0.2 });
    },
  },

  // Sharp alarm bite: two quick descending square stabs.
  player_hit: {
    synth(ctx, dest, t0) {
      tone(ctx, dest, t0, { type: 'square', freq: 880, freqEnd: 440, dur: 0.06, gain: 0.16, attack: 0.001 });
      tone(ctx, dest, t0, { type: 'square', freq: 660, freqEnd: 330, dur: 0.08, gain: 0.16, attack: 0.001, delay: 0.07 });
    },
  },

  // Victory: ascending major arpeggio C5-E5-G5-C6 (triangle) + sparkle.
  stage_clear: {
    synth(ctx, dest, t0) {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      for (let i = 0; i < notes.length; i++) {
        tone(ctx, dest, t0, { type: 'triangle', freq: notes[i], dur: 0.22, gain: 0.2, attack: 0.005, delay: i * 0.12 });
      }
      tone(ctx, dest, t0, { type: 'sine', freq: 2093, dur: 0.4, gain: 0.08, attack: 0.01, delay: 0.48 });
    },
  },

  // Defeat: descending minor-ish line C5-Ab4-F4-C4 (sawtooth, slow decay).
  game_over: {
    synth(ctx, dest, t0) {
      const notes = [523.25, 415.3, 349.23, 261.63];
      for (let i = 0; i < notes.length; i++) {
        tone(ctx, dest, t0, { type: 'sawtooth', freq: notes[i], freqEnd: notes[i] * 0.97, dur: 0.3, gain: 0.15, attack: 0.01, delay: i * 0.18 });
      }
      tone(ctx, dest, t0, { type: 'sine', freq: 130.81, freqEnd: 65, dur: 0.6, gain: 0.16, attack: 0.02, delay: 0.72 });
    },
  },
};

export const EVENT_NAMES = Object.keys(SOUND_DEFS);

// ---------------------------------------------------------------------------

export class AudioManager {
  constructor() {
    /** Event log: [{t, name}] or {t, name, unknown:true}. Same array ref kept forever. */
    this.log = [];
    this._listeners = [];
    this._muted = false;
    this._ctx = null;
    this._master = null;
    this._lastPlayed = Object.create(null); // name -> last real-audio time (ms)
    this._fileBuffers = Object.create(null); // name -> AudioBuffer | 'loading' | 'failed'
  }

  /** Register a callback fired for EVERY play() call (never throttled). */
  onEvent(fn) {
    this._listeners.push(fn);
  }

  setMuted(bool) {
    this._muted = !!bool;
    if (this._master) {
      this._master.gain.value = this._muted ? 0 : 1;
    }
  }

  /**
   * Create/resume the AudioContext. Call from a user gesture
   * (e.g. the TAP TO START handler).
   */
  resume() {
    if (typeof window === 'undefined') return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this._ctx) {
      this._ctx = new AC();
      this._master = this._ctx.createGain();
      this._master.gain.value = this._muted ? 0 : 1;
      this._master.connect(this._ctx.destination);
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
  }

  /**
   * Fire a named sound event.
   * Always logs and notifies onEvent listeners — even before resume(),
   * even when muted, even when the real audio is throttled.
   */
  play(name) {
    const t = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const def = SOUND_DEFS[name];

    const entry = def ? { t, name } : { t, name, unknown: true };
    this.log.push(entry);
    if (this.log.length > LOG_LIMIT) {
      this.log.splice(0, this.log.length - LOG_LIMIT); // keep same array reference
    }

    if (!def) {
      console.error(`[AudioManager] unknown sound event: "${name}"`);
    }

    for (let i = 0; i < this._listeners.length; i++) {
      try {
        this._listeners[i](entry);
      } catch (err) {
        console.error('[AudioManager] onEvent listener threw', err);
      }
    }

    if (!def) return;

    // Real audio only below: needs a running context, not muted, not throttled.
    if (!this._ctx || this._ctx.state !== 'running' || this._muted) return;
    const last = this._lastPlayed[name];
    if (last != null && t - last < THROTTLE_MS) return; // throttle real audio only
    this._lastPlayed[name] = t;

    try {
      if (def.file && this._playFile(name, def)) return;
      def.synth(this._ctx, this._master, this._ctx.currentTime);
    } catch (err) {
      console.error(`[AudioManager] failed to play "${name}"`, err);
    }
  }

  /**
   * File-based playback (production sounds). Returns true if handled
   * (buffer played, or fetch in-flight — synth is skipped while loading
   * only when a decoded buffer exists; otherwise we fall back to synth).
   */
  _playFile(name, def) {
    const buf = this._fileBuffers[name];
    if (buf && buf !== 'loading' && buf !== 'failed') {
      const src = this._ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this._master);
      src.start();
      return true;
    }
    if (buf === 'failed') return false; // permanent fallback to synth
    if (buf !== 'loading') {
      this._fileBuffers[name] = 'loading';
      fetch(def.file)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        })
        .then((ab) => this._ctx.decodeAudioData(ab))
        .then((decoded) => {
          this._fileBuffers[name] = decoded;
        })
        .catch((err) => {
          console.error(`[AudioManager] failed to load ${def.file}, using synth`, err);
          this._fileBuffers[name] = 'failed';
        });
    }
    return false; // synth plays while the file is still loading
  }
}

export const audio = new AudioManager();

if (typeof window !== 'undefined') {
  window.__audioLog = audio.log;
}
