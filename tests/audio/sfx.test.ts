import { expect, test, vi } from 'vitest';
import { createSfx } from '../../src/audio/sfx';

/** A fake AudioContext that records what the synth builds. */
function fakeContext() {
  const made = { oscillators: 0, gains: [] as number[], closed: false };
  const param = (track?: number[]) => ({
    value: 0,
    setValueAtTime(v: number) { track?.push(v); return this; },
    linearRampToValueAtTime(v: number) { track?.push(v); return this; },
    exponentialRampToValueAtTime(v: number) { track?.push(v); return this; },
  });
  const node = () => ({ connect: () => {}, disconnect: () => {} });
  const ctx = {
    currentTime: 0,
    sampleRate: 8000,
    destination: node(),
    createOscillator: () => { made.oscillators++; return { ...node(), type: 'sine', frequency: param(), start() {}, stop() {} }; },
    createGain: () => ({ ...node(), gain: param(made.gains) }),
    createBuffer: (_c: number, n: number) => ({ getChannelData: () => new Float32Array(n) }),
    createBufferSource: () => ({ ...node(), buffer: null, start() {}, stop() {} }),
    close: () => { made.closed = true; return Promise.resolve(); },
  };
  return { ctx: ctx as unknown as AudioContext, made };
}

test('nothing plays, and no AudioContext is made, while sound is not allowed', () => {
  const makeContext = vi.fn(() => fakeContext().ctx);
  const sfx = createSfx({ canPlay: () => false, makeContext });
  sfx.chime();
  sfx.don();
  sfx.blip();
  sfx.bell();
  expect(makeContext).not.toHaveBeenCalled();
});

test('the chime is two tones, never louder than -18 dB', () => {
  const { ctx, made } = fakeContext();
  const sfx = createSfx({ canPlay: () => true, makeContext: () => ctx });
  sfx.chime();
  expect(made.oscillators).toBe(2);
  expect(Math.max(...made.gains)).toBeLessThanOrEqual(0.125);
  expect(Math.max(...made.gains)).toBeGreaterThan(0);
});

test('every accent stays at or under the -18 dB ceiling', () => {
  const { ctx, made } = fakeContext();
  const sfx = createSfx({ canPlay: () => true, makeContext: () => ctx });
  sfx.don();
  sfx.blip();
  sfx.bell();
  expect(Math.max(...made.gains)).toBeLessThanOrEqual(0.125);
});

test('the context is made once, lazily, and closed on dispose', () => {
  const { ctx, made } = fakeContext();
  const makeContext = vi.fn(() => ctx);
  const sfx = createSfx({ canPlay: () => true, makeContext });
  sfx.chime();
  sfx.chime();
  expect(makeContext).toHaveBeenCalledTimes(1);
  sfx.dispose();
  expect(made.closed).toBe(true);
});
