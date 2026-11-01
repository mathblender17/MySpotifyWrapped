import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { f8 } from '../../src/lab/experiments/f8-grammar';
import { classify } from '../../src/feel/pointer';
import { fakeKit, type FakeKit } from './fakeKit';

let stage: HTMLElement;
let kit: FakeKit;
const mount = (over = {}) => {
  stage = document.createElement('div');
  document.body.append(stage);
  kit = fakeKit(over);
  f8.mount(stage, kit);
};
const card = () => stage.querySelector('.f8-card') as HTMLElement;
const label = () => stage.querySelector('.f8-label') as HTMLElement;
const ptr = (type: string, t: number, x: number, y = 100) => {
  const e = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
  Object.defineProperty(e, 'timeStamp', { value: t });
  Object.defineProperty(e, 'pointerId', { value: 1 });
  card().dispatchEvent(e);
};
const shakeOnce = (mag = 20) => {
  const e = new Event('devicemotion');
  Object.defineProperty(e, 'acceleration', { value: { x: mag, y: 0, z: 0 } });
  window.dispatchEvent(e);
};
beforeEach(() => { document.body.innerHTML = ''; });
afterEach(() => { delete (window as unknown as { DeviceMotionEvent?: unknown }).DeviceMotionEvent; });

test('a quick tap shows poke', () => {
  mount();
  ptr('pointerdown', 0, 100);
  ptr('pointerup', 100, 100);
  expect(label().dataset.kind).toBe('tap');
  expect(label().textContent).toMatch(/poke/i);
});

test('a hold of at least 300 ms shows charge and a grown ring', () => {
  mount();
  ptr('pointerdown', 0, 100);
  ptr('pointerup', 400, 100);
  expect(label().dataset.kind).toBe('hold');
  expect(label().textContent).toMatch(/charge/i);
  expect(stage.querySelector('.f8-ring')?.getAttribute('data-grown')).toBe('1');
});

test('a fast horizontal move shows flick and slides the card', () => {
  mount();
  ptr('pointerdown', 0, 0);
  ptr('pointermove', 50, 300);
  ptr('pointerup', 60, 300);
  expect(label().dataset.kind).toBe('flick');
  expect(card().dataset.slid).toBe('1');
});

test('the label always matches classify for the same samples', () => {
  mount();
  ptr('pointerdown', 0, 0);
  ptr('pointermove', 400, 40);
  ptr('pointerup', 420, 40);
  const expected = classify([{ t: 0, x: 0, y: 100 }, { t: 400, x: 40, y: 100 }, { t: 420, x: 40, y: 100 }]).kind;
  expect(label().dataset.kind).toBe(expected);
});

test('a shake (acceleration over 15 for two samples) shows shake with confetti', () => {
  mount();
  shakeOnce();
  expect(label().dataset.kind).not.toBe('shake');
  shakeOnce();
  expect(label().dataset.kind).toBe('shake');
  expect(stage.querySelectorAll('.f8-confetti').length).toBe(12);
});

test('a single hard sample is not a shake', () => {
  mount();
  shakeOnce(20);
  shakeOnce(2);
  shakeOnce(20);
  expect(label().dataset.kind).not.toBe('shake');
});

test('devicemotion is optional: the pointer gestures work without DeviceMotionEvent', () => {
  mount();
  expect('DeviceMotionEvent' in window).toBe(false);
  ptr('pointerdown', 0, 100);
  ptr('pointerup', 50, 100);
  expect(label().dataset.kind).toBe('tap');
});

test('the first tap asks for motion permission where the browser requires it', () => {
  const requestPermission = vi.fn(async () => 'granted');
  (window as unknown as { DeviceMotionEvent: unknown }).DeviceMotionEvent = { requestPermission };
  mount();
  ptr('pointerdown', 0, 100);
  ptr('pointerup', 50, 100);
  ptr('pointerdown', 100, 100);
  ptr('pointerup', 150, 100);
  expect(requestPermission).toHaveBeenCalledTimes(1);
});

test('reduced motion shows the label only: no ring, slide or confetti', () => {
  mount({ reduced: true });
  ptr('pointerdown', 0, 0);
  ptr('pointermove', 50, 300);
  ptr('pointerup', 60, 300);
  expect(label().dataset.kind).toBe('flick');
  expect(card().dataset.slid).toBeUndefined();
  shakeOnce();
  shakeOnce();
  expect(stage.querySelectorAll('.f8-confetti').length).toBe(0);
});

test('leaving removes the pointer and devicemotion listeners', () => {
  mount();
  kit.leave();
  shakeOnce();
  shakeOnce();
  expect(label().dataset.kind).not.toBe('shake');
  ptr('pointerdown', 0, 100);
  ptr('pointerup', 50, 100);
  expect(label().dataset.kind).not.toBe('tap');
});
