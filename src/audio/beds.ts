export type BedKind = 'wind' | 'chime' | 'ratchet';
export type Beds = { start(kind: BedKind): void; stop(): void; readonly playing: BedKind | null; dispose(): void };

const PEAK = 0.08; // well under the ride's −18 dB accent ceiling (0.125)
const CHIME_EVERY = 2600;
const RATCHET_STEP = 90;
const RATCHET_CLICKS = 8;
const RATCHET_REST = 700;

/**
 * Looping ambience synthesised with Web Audio (ux spec §3 F4): wind, a konbini chime, a gacha ratchet. One bed at a
 * time; nothing is created while sound is not allowed, and `stop` leaves no timer or node running.
 */
export function createBeds(o: { canPlay: () => boolean; makeContext?: () => AudioContext }): Beds {
  let ctx: AudioContext | undefined;
  let playing: BedKind | null = null;
  let timer: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval> | undefined;
  let stoppers: (() => void)[] = [];
  const make = o.makeContext ?? (() => new AudioContext());

  const ready = () => {
    if (!o.canPlay()) return undefined;
    try {
      ctx ??= make();
    } catch {
      return undefined; // no Web Audio: stay silent
    }
    if (ctx.state === 'suspended') ctx.resume?.().catch(() => {});
    return ctx;
  };
  const env = (c: AudioContext, t: number, len: number, peak = PEAK) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    g.connect(c.destination);
    return g;
  };
  const tone = (c: AudioContext, type: OscillatorType, hz: number, t: number, len: number, peak = PEAK) => {
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, t);
    osc.connect(env(c, t, len, peak));
    osc.start(t);
    osc.stop(t + len + 0.05);
  };

  const wind = (c: AudioContext) => {
    const n = Math.floor(c.sampleRate * 2);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.06, c.currentTime);
    // A slow wobble (0.15 Hz) on the gain, so the wind swells and fades.
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.15;
    const depth = c.createGain();
    depth.gain.value = 0.02;
    lfo.connect(depth);
    depth.connect(gain.gain);
    src.connect(lp);
    lp.connect(gain);
    gain.connect(c.destination);
    src.start();
    lfo.start();
    stoppers.push(
      () => { try { src.stop(); } catch { /* already stopped */ } },
      () => { try { lfo.stop(); } catch { /* already stopped */ } },
      () => gain.disconnect(),
    );
  };
  const chime = (c: AudioContext) => {
    const play = () => {
      const t = c.currentTime;
      [880, 660, 990].forEach((hz, i) => tone(c, 'sine', hz, t + i * 0.25, 0.25));
    };
    play();
    timer = setInterval(play, CHIME_EVERY);
  };
  const ratchet = (c: AudioContext) => {
    const click = (i: number) => {
      tone(c, 'square', 1800, c.currentTime, 0.02, PEAK);
      timer = setTimeout(() => click((i + 1) % RATCHET_CLICKS), i === RATCHET_CLICKS - 1 ? RATCHET_REST : RATCHET_STEP);
    };
    click(0);
  };

  const stop = () => {
    if (timer !== undefined) {
      clearTimeout(timer as ReturnType<typeof setTimeout>);
      clearInterval(timer as ReturnType<typeof setInterval>);
      timer = undefined;
    }
    for (const f of stoppers.splice(0)) f();
    stoppers = [];
    playing = null;
  };

  return {
    start(kind) {
      stop();
      const c = ready();
      if (!c) return;
      playing = kind;
      c.resume?.().catch(() => {});
      if (kind === 'wind') wind(c);
      else if (kind === 'chime') chime(c);
      else ratchet(c);
    },
    stop,
    get playing() {
      return playing;
    },
    dispose() {
      stop();
      ctx?.close().catch(() => {});
      ctx = undefined;
    },
  };
}
