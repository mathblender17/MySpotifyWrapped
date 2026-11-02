import { beforeEach, expect, test } from 'vitest';
import { f6, settleFor } from '../../src/lab/experiments/f6-cord';
import { BELL } from '../../src/feel/patterns';
import { rubber } from '../../src/feel/physics';
import { fakeKit, type FakeKit } from './fakeKit';

let stage: HTMLElement;
let kit: FakeKit;
const mount = (over = {}) => {
  stage = document.createElement('div');
  document.body.append(stage);
  kit = fakeKit(over);
  f6.mount(stage, kit);
};
const tassel = () => stage.querySelector('.f6-tassel') as HTMLElement;
const label = () => stage.querySelector('.f6-label') as HTMLElement;
const ptr = (el: Element, type: string, y: number) => {
  const e = new MouseEvent(type, { clientX: 100, clientY: y, bubbles: true });
  Object.defineProperty(e, 'pointerId', { value: 1 });
  el.dispatchEvent(e);
};
const drag = (to: number, release = true) => {
  ptr(tassel(), 'pointerdown', 100);
  ptr(tassel(), 'pointermove', 100 + to);
  if (release) ptr(tassel(), 'pointerup', 100 + to);
};
beforeEach(() => { document.body.innerHTML = ''; });

test('dragging down moves the cord by rubber(distance, 140) and never beyond 140', () => {
  mount();
  drag(300, false);
  const pull = Number(tassel().dataset.pull);
  expect(pull).toBeGreaterThan(0);
  expect(pull).toBeLessThanOrEqual(140);
  expect(pull).toBeCloseTo(rubber(300, 140), 0);
});

test('releasing past 90 px rings the bell once and shows the next-stop label', () => {
  mount();
  drag(200);
  expect(kit.sfx.bell).toHaveBeenCalledTimes(1);
  expect(kit.buzz).toHaveBeenCalledWith(BELL);
  expect(label().style.display).not.toBe('none');
  expect(label().textContent).toMatch(/NEXT STOP/);
});

test('releasing before 90 px springs back without ringing', () => {
  mount();
  drag(50);
  settleFor(stage);
  expect(kit.sfx.bell).not.toHaveBeenCalled();
  expect(label().style.display).toBe('none');
  expect(Number(tassel().dataset.pull)).toBe(0);
});

test('the cord end is at least 48 px wide', () => {
  mount();
  expect(parseInt(tassel().style.width, 10)).toBeGreaterThanOrEqual(48);
});

test('reduced motion: a tap shows the label with no motion, sound or vibration', () => {
  mount({ reduced: true });
  tassel().click();
  expect(label().style.display).not.toBe('none');
  expect(kit.sfx.bell).not.toHaveBeenCalled();
  expect(kit.buzz).not.toHaveBeenCalled();
});

test('leaving removes the listeners', () => {
  mount();
  kit.leave();
  drag(200);
  expect(kit.sfx.bell).not.toHaveBeenCalled();
});
