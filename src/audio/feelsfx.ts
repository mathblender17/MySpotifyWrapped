const PEAK = 0.125; // −18 dB under the music, the same ceiling as the ride's accents (src/audio/sfx.ts)

export type FeelSfx = { unlock(): void; clack(): void; slam(): void; tick(): void; dispose(): void };

/**
 * Feel-layer sounds (ux spec §3), synthesised with Web Audio: no files. Nothing is created until a sound is allowed,
 * and a missing or blocked Web Audio leaves every call a silent no-op.
 */
export function createFeelSfx(opts: { canPlay: () => boolean; makeContext?: () => AudioContext }): FeelSfx {
  let ctx: AudioContext | undefined;
  const make = opts.makeContext ?? (() => new AudioContext());
  const ready = () => {
    if (!opts.canPlay()) return undefined;
    try {
      ctx ??= make();
    } catch {
      return undefined;
    }
    if (ctx.state === 'suspended') ctx.resume?.().catch(() => {});
    return ctx;
  };
  const env = (c: AudioContext, t: number, len: number, peak = PEAK) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    g.connect(c.destination);
    return g;
  };
  const tone = (c: AudioContext, type: OscillatorType, hz: number, t: number, len: number, peak = PEAK, to?: number) => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(hz, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + len);
    o.connect(env(c, t, len, peak));
    o.start(t);
    o.stop(t + len + 0.05);
  };
  /** A burst of noise through a band-pass: the click of metal on metal. */
  const noise = (c: AudioContext, t: number, len: number, hz: number, peak: number) => {
    const n = Math.max(1, Math.floor(c.sampleRate * len));
    const buf = c.createBuffer(1, n, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = hz;
    src.connect(f);
    f.connect(env(c, t, len, peak));
    src.start(t);
    src.stop(t + len + 0.02);
  };

  return {
    /** Call inside a tap: iOS only starts or resumes an AudioContext during a user gesture. */
    unlock() {
      ready()?.resume().catch(() => {});
    },
    clack() {
      const c = ready();
      if (!c) return;
      const t = c.currentTime;
      noise(c, t, 0.025, 2400, PEAK);
      tone(c, 'sine', 140, t, 0.08, PEAK, 90);
    },
    slam() {
      const c = ready();
      if (!c) return;
      const t = c.currentTime;
      noise(c, t, 0.09, 900, PEAK / 2);
      tone(c, 'sine', 90, t, 0.18, PEAK, 40);
    },
    tick() {
      const c = ready();
      if (!c) return;
      tone(c, 'square', 1800, c.currentTime, 0.02, PEAK / 2);
    },
    dispose() {
      ctx?.close().catch(() => {});
      ctx = undefined;
    },
  };
}
