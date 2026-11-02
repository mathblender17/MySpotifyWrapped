import { beforeEach, expect, test } from 'vitest';
import { f7, settleFor } from '../../src/lab/experiments/f7-speed';
import { shakeFor } from '../../src/feel/physics';
import { fakeKit, type FakeKit } from './fakeKit';

let stage: HTMLElement;
let kit: FakeKit;
const mount = (over = {}) => {
  stage = document.createElement('div');
  document.body.append(stage);
  kit = fakeKit(over);
  f7.mount(stage, kit);
};
const ptr = (type: string, t: number, x: number, y = 100) => {
  const e = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
  Object.defineProperty(e, 'timeStamp', { value: t });
  Object.defineProperty(e, 'pointerId', { value: 1 });
  stage.dispatchEvent(e);
};
const lines = () => [...stage.querySelectorAll<HTMLElement>('.f7-line')].filter((l) => l.style.display !== 'none').length;
const shake = () => Number(stage.dataset.shake ?? 0);
beforeEach(() => { document.body.innerHTML = ''; });

test('a fast swipe shows more speed lines than a slow one', () => {
  mount();
  ptr('pointerdown', 0, 0);
  ptr('pointermove', 50, 300); // 6000 px/s
  const fast = lines();
  ptr('pointerup', 60, 300);
  settleFor(stage);
  ptr('pointerdown', 1000, 0);
  ptr('pointermove', 1600, 60); // 100 px/s
  const slow = lines();
  expect(fast).toBeGreaterThan(slow);
  expect(slow).toBe(0);
});

test('a fast swipe shakes by at most shakeFor(speed) px; a slow one does not shake', () => {
  mount();
  ptr('pointerdown', 0, 0);
  ptr('pointermove', 50, 300);
  expect(shake()).toBeGreaterThan(0);
  expect(shake()).toBeLessThanOrEqual(shakeFor(6000));
  ptr('pointerup', 60, 300);
  settleFor(stage);
  ptr('pointerdown', 1000, 0);
  ptr('pointermove', 1600, 60);
  expect(shake()).toBe(0);
});

test('lines and shake are gone once the fade finishes', () => {
  mount();
  ptr('pointerdown', 0, 0);
  ptr('pointermove', 50, 300);
  ptr('pointerup', 60, 300);
  settleFor(stage);
  expect(lines()).toBe(0);
  expect(shake()).toBe(0);
});

test('reduced motion shows a static note and no lines', () => {
  mount({ reduced: true });
  ptr('pointerdown', 0, 0);
  ptr('pointermove', 50, 300);
  expect(lines()).toBe(0);
  expect(stage.textContent).toMatch(/motion is off/i);
});

test('leaving removes the lines', () => {
  mount();
  expect(stage.querySelectorAll('.f7-line').length).toBeGreaterThan(0);
  kit.leave();
  expect(stage.querySelectorAll('.f7-line').length).toBe(0);
});
