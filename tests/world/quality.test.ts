import { expect, test, vi } from 'vitest';
import { createQuality } from '../../src/world/quality';

const run = (q: ReturnType<typeof createQuality>, ms: number, seconds = 2.1) => {
  for (let t = 0; t < seconds * 1000; t += ms) q.frame(ms);
};

test('smooth frames keep full quality', () => {
  const onStep = vi.fn();
  const q = createQuality(onStep);
  run(q, 16, 6);
  expect(q.level).toBe(0);
  expect(onStep).not.toHaveBeenCalled();
});

test('a slow two seconds steps down once, then again, then stops', () => {
  const onStep = vi.fn();
  const q = createQuality(onStep);
  run(q, 30);
  expect(q.level).toBe(1);
  run(q, 30);
  expect(q.level).toBe(2);
  run(q, 30, 6);
  expect(q.level).toBe(2);
  expect(onStep.mock.calls).toEqual([[1], [2]]);
});

test('it never steps back up', () => {
  const q = createQuality(() => {});
  run(q, 30);
  run(q, 10, 6);
  expect(q.level).toBe(1);
});

test('one long hitch (tab switch) does not count as a slow device', () => {
  const q = createQuality(() => {});
  q.frame(3000);
  run(q, 16, 3);
  expect(q.level).toBe(0);
});
