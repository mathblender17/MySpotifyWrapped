import { expect, test } from 'vitest';
import { projectFling, rubber, shakeFor, snapIndex, speedLines, stepSpring } from '../../src/feel/physics';

const simulate = (start: { x: number; v: number }, target: number, seconds: number) => {
  let s = start;
  const trace: number[] = [];
  for (let t = 0; t < seconds; t += 1 / 60) {
    s = stepSpring(s, target, 1 / 60);
    trace.push(s.x);
  }
  return { s, trace };
};

test('stepSpring converges to the target within 0.5 px in under 1.2 s', () => {
  const { s } = simulate({ x: 0, v: 0 }, 300, 1.2);
  expect(Math.abs(s.x - 300)).toBeLessThan(0.5);
});

test('stepSpring with a strong initial velocity overshoots then settles', () => {
  const { s, trace } = simulate({ x: 0, v: 3000 }, 300, 1.6);
  expect(Math.max(...trace)).toBeGreaterThan(300);
  expect(Math.abs(s.x - 300)).toBeLessThan(0.5);
});

test('projectFling returns the rest point under constant deceleration', () => {
  expect(projectFling(100, 1000)).toBeCloseTo(100 + (1000 * 1000) / (2 * 3000), 5);
  expect(projectFling(100, -1000)).toBeCloseTo(100 - (1000 * 1000) / (2 * 3000), 5);
  expect(projectFling(100, 0)).toBe(100);
});

test('snapIndex rounds to the nearest card and clamps', () => {
  expect(snapIndex(200, 13, 390)).toBe(1);
  expect(snapIndex(-50, 13, 390)).toBe(0);
  expect(snapIndex(99999, 13, 390)).toBe(12);
});

test('rubber is 0 at 0, increasing, and never exceeds the limit', () => {
  expect(rubber(0, 140)).toBe(0);
  expect(rubber(50, 140)).toBeGreaterThan(0);
  expect(rubber(100, 140)).toBeGreaterThan(rubber(50, 140));
  expect(rubber(100000, 140)).toBeLessThanOrEqual(140);
});

test('speedLines is 0 below 300, grows, and caps at 24', () => {
  expect(speedLines(299)).toBe(0);
  expect(speedLines(1200)).toBeGreaterThan(speedLines(600));
  expect(speedLines(99999)).toBe(24);
});

test('shakeFor is 0 below 600 and caps at 6', () => {
  expect(shakeFor(599)).toBe(0);
  expect(shakeFor(2000)).toBeGreaterThan(0);
  expect(shakeFor(99999)).toBe(6);
});
