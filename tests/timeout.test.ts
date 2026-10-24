import { expect, test, vi } from 'vitest';
import { withTimeout } from '../src/timeout';

test('resolves with the value when it arrives in time', async () => {
  await expect(withTimeout(Promise.resolve(5), 100, 0)).resolves.toBe(5);
});

test('gives the fallback when the promise hangs (a stalled download)', async () => {
  vi.useFakeTimers();
  const p = withTimeout(new Promise<number>(() => {}), 3000, -1);
  vi.advanceTimersByTime(3000);
  await expect(p).resolves.toBe(-1);
  vi.useRealTimers();
});

test('gives the fallback when the promise fails', async () => {
  await expect(withTimeout(Promise.reject(new Error('404')), 100, null)).resolves.toBeNull();
});
