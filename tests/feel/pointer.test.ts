import { expect, test } from 'vitest';
import { classify, velocity, type PointSample } from '../../src/feel/pointer';

const p = (t: number, x: number, y = 0): PointSample => ({ t, x, y });

test('velocity of a steady 1 px/ms move is 1000 px/s', () => {
  const v = velocity([p(0, 0), p(50, 50), p(100, 100)]);
  expect(v.vx).toBeCloseTo(1000, 0);
  expect(v.vy).toBe(0);
});

test('velocity ignores samples older than the window', () => {
  const v = velocity([p(0, 0), p(900, 10), p(950, 60), p(1000, 110)]);
  expect(v.vx).toBeCloseTo(1000, 0);
});

test('velocity with fewer than two samples is 0', () => {
  expect(velocity([])).toEqual({ vx: 0, vy: 0 });
  expect(velocity([p(0, 5)])).toEqual({ vx: 0, vy: 0 });
});

test('a short quick touch is a tap', () => {
  expect(classify([p(0, 100), p(120, 101)]).kind).toBe('tap');
});

test('a long still touch is a hold', () => {
  expect(classify([p(0, 100), p(450, 100)]).kind).toBe('hold');
});

test('a 5 px wobble is still a tap', () => {
  expect(classify([p(0, 100), p(60, 105), p(100, 102)]).kind).toBe('tap');
});

test('a fast leftward move is a flick with dir left', () => {
  const g = classify([p(0, 300), p(50, 200), p(100, 100)]);
  expect(g.kind).toBe('flick');
  expect(g.dir).toBe('left');
  expect(g.speed).toBeGreaterThan(600);
});

test('a slow rightward move is a drag', () => {
  const g = classify([p(0, 0), p(500, 30), p(1000, 60)]);
  expect(g.kind).toBe('drag');
  expect(g.dir).toBe('right');
});

test('a downward move is a pull', () => {
  const g = classify([p(0, 100, 0), p(100, 102, 120)]);
  expect(g.kind).toBe('pull');
  expect(g.dir).toBe('down');
});

test('one sample is a tap with speed 0', () => {
  expect(classify([p(0, 1)])).toEqual({ kind: 'tap', speed: 0 });
});
