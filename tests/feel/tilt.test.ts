import { afterEach, expect, test, vi } from 'vitest';
import { createTilt, normalizeTilt } from '../../src/feel/tilt';

afterEach(() => vi.useRealTimers());

const fakeWin = () => {
  let handler: ((e: unknown) => void) | undefined;
  return {
    win: {
      addEventListener: vi.fn((_t: string, h: (e: unknown) => void) => { handler = h; }),
      removeEventListener: vi.fn(() => { handler = undefined; }),
    },
    fire: (gamma: number | null, beta: number | null) => handler?.({ gamma, beta }),
    attached: () => handler !== undefined,
  };
};

test('normalizeTilt maps ±30° to ±1, centres a 45° beta at 0 and clamps', () => {
  expect(normalizeTilt(30, 45)).toEqual({ x: 1, y: 0 });
  expect(normalizeTilt(-30, 75)).toEqual({ x: -1, y: 1 });
  expect(normalizeTilt(0, 45)).toEqual({ x: 0, y: 0 });
  expect(normalizeTilt(90, -90)).toEqual({ x: 1, y: -1 });
});

test('reduced motion makes request resolve false and state unsupported', async () => {
  const w = fakeWin();
  const t = createTilt({ reduced: true, win: w.win });
  expect(await t.request()).toBe(false);
  expect(t.state).toBe('unsupported');
  expect(w.win.addEventListener).not.toHaveBeenCalled();
});

test('a denied permission resolves false and sets denied', async () => {
  const w = fakeWin();
  const t = createTilt({ reduced: false, win: w.win, permission: async () => 'denied' as const });
  expect(await t.request()).toBe(false);
  expect(t.state).toBe('denied');
  expect(w.win.addEventListener).not.toHaveBeenCalled();
});

test('a granted permission starts listening and emits normalised, smoothed values', async () => {
  const w = fakeWin();
  const t = createTilt({ reduced: false, win: w.win, permission: async () => 'granted' as const });
  const seen: [number, number][] = [];
  t.on((x, y) => seen.push([x, y]));
  const pending = t.request();
  await Promise.resolve();
  await Promise.resolve();
  w.fire(30, 75); // target (1, 1)
  expect(await pending).toBe(true);
  expect(t.state).toBe('running');
  w.fire(30, 75);
  expect(seen.length).toBe(2);
  expect(seen[0][0]).toBeGreaterThan(0);
  expect(seen[0][0]).toBeLessThan(1);
  expect(seen[1][0]).toBeGreaterThan(seen[0][0]);
});

test('no events within 1500 ms sets unsupported', async () => {
  vi.useFakeTimers();
  const w = fakeWin();
  const t = createTilt({ reduced: false, win: w.win });
  const pending = t.request();
  await vi.advanceTimersByTimeAsync(1600);
  expect(await pending).toBe(false);
  expect(t.state).toBe('unsupported');
  expect(w.attached()).toBe(false);
});

test('events with null angles do not start tilt', async () => {
  vi.useFakeTimers();
  const w = fakeWin();
  const t = createTilt({ reduced: false, win: w.win });
  const pending = t.request();
  w.fire(null, null);
  await vi.advanceTimersByTimeAsync(1600);
  expect(await pending).toBe(false);
});

test('stop removes the listener and on() returns an unsubscribe', async () => {
  const w = fakeWin();
  const t = createTilt({ reduced: false, win: w.win });
  const seen: number[] = [];
  const off = t.on((x) => seen.push(x));
  const pending = t.request();
  w.fire(10, 45);
  await pending;
  off();
  w.fire(10, 45);
  expect(seen.length).toBe(1);
  t.stop();
  expect(w.attached()).toBe(false);
  expect(t.state).toBe('idle');
});
