import { expect, test, vi } from 'vitest';
import { createFeelSfx } from '../../src/audio/feelsfx';

/** A fake AudioContext that counts what the synth builds. */
function fakeContext() {
  const made = { oscillators: 0, sources: 0, gains: [] as number[], closed: false };
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
    createBiquadFilter: () => ({ ...node(), type: 'lowpass', frequency: param() }),
    createBufferSource: () => { made.sources++; return { ...node(), buffer: null, start() {}, stop() {} }; },
    close: () => { made.closed = true; return Promise.resolve(); },
    resume: () => Promise.resolve(),
  };
  return { ctx: ctx as unknown as AudioContext, made };
}

test('makes no AudioContext while sound is not allowed', () => {
  const makeContext = vi.fn(() => fakeContext().ctx);
  const fx = createFeelSfx({ canPlay: () => false, makeContext });
  fx.clack();
  fx.slam();
  fx.tick();
  expect(makeContext).not.toHaveBeenCalled();
});

test('clack, slam and tick each build nodes once allowed', () => {
  const f = fakeContext();
  const fx = createFeelSfx({ canPlay: () => true, makeContext: () => f.ctx });
  fx.clack();
  const afterClack = f.made.oscillators + f.made.sources;
  expect(afterClack).toBeGreaterThan(0);
  fx.slam();
  const afterSlam = f.made.oscillators + f.made.sources;
  expect(afterSlam).toBeGreaterThan(afterClack);
  fx.tick();
  expect(f.made.oscillators + f.made.sources).toBeGreaterThan(afterSlam);
});

test('no gain peak exceeds the -18 dB ceiling of the ride accents', () => {
  const f = fakeContext();
  const fx = createFeelSfx({ canPlay: () => true, makeContext: () => f.ctx });
  fx.clack();
  fx.slam();
  fx.tick();
  expect(Math.max(...f.made.gains)).toBeLessThanOrEqual(0.125);
});

test('a context that throws on construction stays silent without throwing', () => {
  const fx = createFeelSfx({ canPlay: () => true, makeContext: () => { throw new Error('no audio'); } });
  expect(() => { fx.clack(); fx.slam(); fx.tick(); }).not.toThrow();
});

test('dispose closes the context', () => {
  const f = fakeContext();
  const fx = createFeelSfx({ canPlay: () => true, makeContext: () => f.ctx });
  fx.tick();
  fx.dispose();
  expect(f.made.closed).toBe(true);
});

test('unlock resumes the context once allowed and makes none before', () => {
  const f = fakeContext();
  const resume = vi.fn(() => Promise.resolve());
  (f.ctx as unknown as { resume: unknown }).resume = resume;
  let allowed = false;
  const makeContext = vi.fn(() => f.ctx);
  const fx = createFeelSfx({ canPlay: () => allowed, makeContext });
  fx.unlock();
  expect(makeContext).not.toHaveBeenCalled();
  allowed = true;
  fx.unlock();
  expect(resume).toHaveBeenCalledTimes(1);
});
