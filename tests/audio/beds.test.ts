import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createBeds } from '../../src/audio/beds';

/** A fake AudioContext that records what the synth builds and the loudest gain it asks for. */
function fakeContext() {
  const made = { oscillators: 0, sources: 0, loops: 0, stops: 0, peak: 0, closed: false };
  const param = (isGain = false) => ({
    value: 0,
    setValueAtTime(v: number) { if (isGain) made.peak = Math.max(made.peak, v); return this; },
    linearRampToValueAtTime(v: number) { if (isGain) made.peak = Math.max(made.peak, v); return this; },
    exponentialRampToValueAtTime(v: number) { if (isGain) made.peak = Math.max(made.peak, v); return this; },
  });
  const node = () => ({ connect: () => {}, disconnect: () => {} });
  const ctx = {
    currentTime: 0,
    sampleRate: 8000,
    destination: node(),
    createOscillator: () => { made.oscillators++; return { ...node(), type: 'sine', frequency: param(), start() {}, stop() { made.stops++; } }; },
    createGain: () => ({ ...node(), gain: param(true) }),
    createBuffer: (_c: number, n: number) => ({ getChannelData: () => new Float32Array(n) }),
    createBiquadFilter: () => ({ ...node(), type: 'lowpass', frequency: param() }),
    createBufferSource: () => {
      made.sources++;
      const s = { ...node(), buffer: null, start() {}, stop() { made.stops++; }, _loop: false };
      Object.defineProperty(s, 'loop', { set(v: boolean) { if (v) made.loops++; }, get: () => false });
      return s;
    },
    createOscillatorLfo: undefined,
    close: () => { made.closed = true; return Promise.resolve(); },
    resume: () => Promise.resolve(),
  };
  return { ctx: ctx as unknown as AudioContext, made };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('start while sound is not allowed makes no context and playing stays null', () => {
  const makeContext = vi.fn(() => fakeContext().ctx);
  const beds = createBeds({ canPlay: () => false, makeContext });
  beds.start('wind');
  expect(makeContext).not.toHaveBeenCalled();
  expect(beds.playing).toBeNull();
});

test('start wind makes one looping buffer source and sets playing', () => {
  const f = fakeContext();
  const beds = createBeds({ canPlay: () => true, makeContext: () => f.ctx });
  beds.start('wind');
  expect(f.made.loops).toBe(1);
  expect(beds.playing).toBe('wind');
});

test('start chime schedules three notes now and again after 2600 ms', () => {
  const f = fakeContext();
  const beds = createBeds({ canPlay: () => true, makeContext: () => f.ctx });
  beds.start('chime');
  expect(f.made.oscillators).toBe(3);
  vi.advanceTimersByTime(2600);
  expect(f.made.oscillators).toBe(6);
});

test('start ratchet schedules 8 clicks per cycle', () => {
  const f = fakeContext();
  const beds = createBeds({ canPlay: () => true, makeContext: () => f.ctx });
  beds.start('ratchet');
  vi.advanceTimersByTime(90 * 7); // the first click is immediate, then 7 more at 90 ms
  const clicks = f.made.oscillators + f.made.sources;
  expect(clicks).toBe(8);
});

test('starting a second bed stops the first: its timers no longer fire', () => {
  const f = fakeContext();
  const beds = createBeds({ canPlay: () => true, makeContext: () => f.ctx });
  beds.start('chime');
  beds.start('wind');
  const before = f.made.oscillators;
  vi.advanceTimersByTime(10000);
  expect(f.made.oscillators).toBe(before);
  expect(beds.playing).toBe('wind');
});

test('stop clears timers so no more nodes are made, and playing is null', () => {
  const f = fakeContext();
  const beds = createBeds({ canPlay: () => true, makeContext: () => f.ctx });
  beds.start('ratchet');
  beds.stop();
  const before = f.made.oscillators + f.made.sources;
  vi.advanceTimersByTime(5000);
  expect(f.made.oscillators + f.made.sources).toBe(before);
  expect(beds.playing).toBeNull();
});

test('no gain peak exceeds 0.125', () => {
  const f = fakeContext();
  const beds = createBeds({ canPlay: () => true, makeContext: () => f.ctx });
  for (const k of ['wind', 'chime', 'ratchet'] as const) { beds.start(k); vi.advanceTimersByTime(3000); }
  expect(f.made.peak).toBeGreaterThan(0);
  expect(f.made.peak).toBeLessThanOrEqual(0.125);
});

test('a context that throws on construction stays silent without throwing', () => {
  const beds = createBeds({ canPlay: () => true, makeContext: () => { throw new Error('no audio'); } });
  expect(() => beds.start('wind')).not.toThrow();
  expect(beds.playing).toBeNull();
});

test('dispose stops the bed and closes the context', () => {
  const f = fakeContext();
  const beds = createBeds({ canPlay: () => true, makeContext: () => f.ctx });
  beds.start('wind');
  beds.dispose();
  expect(f.made.closed).toBe(true);
  expect(beds.playing).toBeNull();
});
