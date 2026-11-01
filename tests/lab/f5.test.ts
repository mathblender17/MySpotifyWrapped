import { beforeEach, expect, test, vi } from 'vitest';
import { countAt, f5, settleFor } from '../../src/lab/experiments/f5-heavy';
import { fakeKit, type FakeKit } from './fakeKit';

let stage: HTMLElement;
let kit: FakeKit;
const mount = (over = {}) => {
  stage = document.createElement('div');
  document.body.append(stage);
  kit = fakeKit(over);
  f5.mount(stage, kit);
};
const num = () => stage.querySelector('.f5-num') as HTMLElement;
const digits = (s: string) => Number(s.replace(/[^0-9]/g, ''));
const tiltHandler = () => (kit.tilt.on as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as (x: number, y: number) => void;
beforeEach(() => { document.body.innerHTML = ''; });

test('countAt runs from 0, overshoots the target, and lands on it', () => {
  expect(countAt(28613, 0)).toBe(0);
  expect(countAt(28613, 1)).toBe(28613);
  const peak = Math.max(...Array.from({ length: 101 }, (_, i) => countAt(28613, i / 100)));
  expect(peak).toBeGreaterThan(28613);
});

test('the number settles on its target', () => {
  mount();
  settleFor(stage);
  expect(digits(num().textContent ?? '')).toBe(28613);
});

test('a tap recounts from 0', () => {
  mount();
  settleFor(stage);
  num().click();
  expect(digits(num().textContent ?? '')).toBe(0);
});

test('a tilt change over 0.4 bounces once; a smaller change does not', () => {
  mount();
  settleFor(stage);
  const bounces = () => Number(num().dataset.bounces ?? 0);
  tiltHandler()(0, 0);
  tiltHandler()(0, 0.1);
  expect(bounces()).toBe(0);
  tiltHandler()(0, 0.6);
  expect(bounces()).toBe(1);
  tiltHandler()(0, 0.65);
  expect(bounces()).toBe(1);
});

test('the first tap asks for tilt permission', () => {
  mount();
  num().click();
  expect(kit.tilt.request).toHaveBeenCalledTimes(1);
});

test('reduced motion shows the final number at once and never bounces', () => {
  mount({ reduced: true });
  expect(digits(num().textContent ?? '')).toBe(28613);
  expect(kit.tilt.on).not.toHaveBeenCalled();
});

test('leaving unsubscribes from tilt', () => {
  const off = vi.fn();
  mount({ tilt: { state: 'idle' as const, request: vi.fn(async () => true), stop: vi.fn(), on: vi.fn(() => off) } });
  kit.leave();
  expect(off).toHaveBeenCalled();
});
