import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createSoundtrack } from '../../src/audio/soundtrack';

class FakeAudio {
  src = '';
  volume = 1;
  paused = true;
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

let made: FakeAudio[];
const make = () => {
  const a = new FakeAudio();
  made.push(a);
  return a as unknown as HTMLAudioElement;
};

beforeEach(() => {
  vi.useFakeTimers();
  made = [];
  localStorage.clear();
});
afterEach(() => vi.useRealTimers());

test('nothing plays until the rider has tapped (unlock), then the remembered song starts', () => {
  const s = createSoundtrack(make);
  s.play('https://x/a.m4a');
  expect(made.every((a) => a.paused)).toBe(true);
  s.unlock();
  vi.advanceTimersByTime(1000);
  const a = made.find((x) => x.src === 'https://x/a.m4a')!;
  expect(a.paused).toBe(false);
  expect(a.volume).toBe(1);
});

test('a new song crossfades in over one second', () => {
  const s = createSoundtrack(make);
  s.unlock();
  s.play('https://x/a.m4a');
  vi.advanceTimersByTime(1000);
  s.play('https://x/b.m4a');
  vi.advanceTimersByTime(500);
  const a = made.find((x) => x.src === 'https://x/a.m4a')!;
  const b = made.find((x) => x.src === 'https://x/b.m4a')!;
  expect(a.volume).toBeGreaterThan(0);
  expect(b.volume).toBeLessThan(1);
  vi.advanceTimersByTime(600);
  expect(a.volume).toBe(0);
  expect(a.paused).toBe(true);
  expect(b.volume).toBe(1);
});

test('the same song again keeps playing (no restart)', () => {
  const s = createSoundtrack(make);
  s.unlock();
  s.play('https://x/a.m4a');
  vi.advanceTimersByTime(1000);
  s.play('https://x/a.m4a');
  expect(made.filter((x) => x.src === 'https://x/a.m4a')).toHaveLength(1);
});

test('play(undefined) fades the music out', () => {
  const s = createSoundtrack(make);
  s.unlock();
  s.play('https://x/a.m4a');
  vi.advanceTimersByTime(1000);
  s.play(undefined);
  vi.advanceTimersByTime(1100);
  expect(made.every((x) => x.paused)).toBe(true);
});

test('stop silences everything at once', () => {
  const s = createSoundtrack(make);
  s.unlock();
  s.play('https://x/a.m4a');
  s.stop();
  expect(made.every((x) => x.paused)).toBe(true);
});

test('mute zeroes the volume and is remembered next time', () => {
  const s = createSoundtrack(make);
  s.unlock();
  s.play('https://x/a.m4a');
  vi.advanceTimersByTime(1000);
  s.mute(true);
  expect(made.every((x) => x.volume === 0)).toBe(true);
  expect(createSoundtrack(make).muted).toBe(true);
});
