const PEAK = 0.125; // −18 dB under the music (art spec §8)

export type Sfx = { unlock(): void; chime(): void; don(): void; blip(): void; bell(): void; dispose(): void };

/**
 * Sound accents synthesised with Web Audio: no files, no licences. Nothing is created until a sound is allowed
 * (unlocked, not muted, motion not reduced), so a silent ride never opens an AudioContext.
 */
export function createSfx(opts: { canPlay: () => boolean; makeContext?: () => AudioContext }): Sfx {
  let ctx: AudioContext | undefined;
  const make = opts.makeContext ?? (() => new AudioContext());
  const ready = () => {
    if (!opts.canPlay()) return undefined;
    try {
      ctx ??= make();
    } catch {
      return undefined; // no Web Audio: stay silent
    }
    return ctx;
  };

  /** A gain envelope at `t`: fast attack to `peak`, exponential decay over `len` seconds. */
  const env = (c: AudioContext, t: number, len: number, peak = PEAK) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.01);
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

  return {
    /** Call inside a tap: iOS only lets an AudioContext start (or resume) during a user gesture. */
    unlock() {
      ready()?.resume().catch(() => {});
    },
    chime() {
      const c = ready();
      if (!c) return;
      const t = c.currentTime;
      tone(c, 'sine', 880, t, 0.25);
      tone(c, 'sine', 660, t + 0.25, 0.35);
    },
    don() {
      const c = ready();
      if (!c) return;
      const t = c.currentTime;
      tone(c, 'sine', 70, t, 0.25, PEAK, 40);
      const n = Math.floor(c.sampleRate * 0.08);
      const buf = c.createBuffer(1, n, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = c.createBufferSource();
      src.buffer = buf;
      src.connect(env(c, t, 0.08, PEAK / 2));
      src.start(t);
      src.stop(t + 0.1);
    },
    blip() {
      const c = ready();
      if (!c) return;
      tone(c, 'square', 1320, c.currentTime, 0.06, PEAK / 2);
    },
    bell() {
      const c = ready();
      if (!c) return;
      const t = c.currentTime;
      // Partials of a struck temple bell: the fundamental and two inharmonic overtones, quieter as they rise.
      tone(c, 'sine', 220, t, 2.5);
      tone(c, 'sine', 220 * 2.76, t, 1.6, PEAK / 2);
      tone(c, 'sine', 220 * 5.4, t, 0.9, PEAK / 4);
    },
    dispose() {
      ctx?.close().catch(() => {});
      ctx = undefined;
    },
  };
}
