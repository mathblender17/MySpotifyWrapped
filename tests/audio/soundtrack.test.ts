import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createSoundtrack } from '../../src/audio/soundtrack';

class FakeAudio {
  src = '';
  volume = 1;
  muted = false;
  paused = true;
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  onended: (() => void) | null = null;
  end() {
    this.paused = true;
    this.onended?.();
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

test('mute silences the players and is remembered next time', () => {
  const s = createSoundtrack(make);
  s.unlock();
  s.play('https://x/a.m4a');
  vi.advanceTimersByTime(1000);
  s.mute(true);
  expect(made.every((x) => x.muted)).toBe(true);
  expect(createSoundtrack(make).muted).toBe(true);
});

class IosAudio extends FakeAudio {
  plays = 0;
  constructor() {
    super();
    // WebKit on iOS: volume is read-only and always 1 (an own property, so the base class field can't shadow it).
    Object.defineProperty(this, 'volume', { get: () => 1, set: () => {} });
  }
  play() {
    this.plays++;
    return super.play();
  }
}
const makeIos = () => {
  const a = new IosAudio();
  made.push(a);
  return a as unknown as HTMLAudioElement;
};

test('unlock plays both players inside the tap, and every later song reuses them', () => {
  const s = createSoundtrack(makeIos);
  s.unlock();
  expect(made).toHaveLength(2);
  expect(made.every((a) => (a as IosAudio).plays >= 1)).toBe(true);
  s.play('https://x/a.m4a');
  s.play('https://x/b.m4a');
  s.play('https://x/c.m4a');
  expect(made).toHaveLength(2);
});

test('where volume is read-only, a new song swaps in at once instead of both playing at full volume', () => {
  const s = createSoundtrack(makeIos);
  s.unlock();
  s.play('https://x/a.m4a');
  s.play('https://x/b.m4a');
  const playingNow = made.filter((a) => !a.paused);
  expect(playingNow).toHaveLength(1);
  expect(playingNow[0].src).toBe('https://x/b.m4a');
});

test('mute uses muted, which works where volume is read-only', () => {
  const s = createSoundtrack(makeIos);
  s.unlock();
  s.play('https://x/a.m4a');
  s.mute(true);
  expect(made.every((a) => (a as IosAudio).muted)).toBe(true);
  s.mute(false);
  expect(made.some((a) => (a as IosAudio).muted)).toBe(false);
});

test('reports whether sound has been unlocked', () => {
  const s = createSoundtrack(make);
  expect(s.unlocked).toBe(false);
  s.unlock();
  expect(s.unlocked).toBe(true);
});

test('onEnded fires when the playing song finishes by itself', () => {
  const s = createSoundtrack(make);
  const cb = vi.fn();
  s.onEnded(cb);
  s.play('https://x/a.m4a');
  s.unlock();
  made.find((x) => x.src === 'https://x/a.m4a')!.end();
  expect(cb).toHaveBeenCalledTimes(1);
});

test('onEnded does not fire for a song that was faded out or stopped', () => {
  const s = createSoundtrack(make);
  const cb = vi.fn();
  s.onEnded(cb);
  s.unlock();
  s.play('https://x/a.m4a');
  const a = made.find((x) => x.src === 'https://x/a.m4a')!;
  s.play('https://x/b.m4a');
  vi.advanceTimersByTime(1000);
  a.end();
  expect(cb).not.toHaveBeenCalled();
  const b = made.find((x) => x.src === 'https://x/b.m4a')!;
  s.stop();
  b.end();
  expect(cb).not.toHaveBeenCalled();
});
