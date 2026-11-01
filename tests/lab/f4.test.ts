import { beforeEach, expect, test } from 'vitest';
import { f4 } from '../../src/lab/experiments/f4-beds';
import { fakeKit, type FakeKit } from './fakeKit';

let stage: HTMLElement;
let kit: FakeKit;
const mount = (over = {}) => {
  stage = document.createElement('div');
  document.body.append(stage);
  kit = fakeKit(over);
  f4.mount(stage, kit);
};
const btn = (kind: string) => stage.querySelector(`[data-bed="${kind}"]`) as HTMLButtonElement;
beforeEach(() => { document.body.innerHTML = ''; });

test('shows three bed buttons: torii wind, konbini chime, gacha ratchet', () => {
  mount();
  expect(['wind', 'chime', 'ratchet'].map((k) => !!btn(k))).toEqual([true, true, true]);
});

test('tapping one starts it and highlights it; tapping it again stops it', () => {
  mount();
  btn('wind').click();
  expect(kit.beds.start).toHaveBeenCalledWith('wind');
  expect(btn('wind').classList.contains('on')).toBe(true);
  btn('wind').click();
  expect(kit.beds.stop).toHaveBeenCalled();
  expect(btn('wind').classList.contains('on')).toBe(false);
});

test('tapping a second bed moves the highlight', () => {
  mount();
  btn('wind').click();
  btn('chime').click();
  expect(btn('wind').classList.contains('on')).toBe(false);
  expect(btn('chime').classList.contains('on')).toBe(true);
});

test('each button is at least 48 px tall by style', () => {
  mount();
  for (const k of ['wind', 'chime', 'ratchet']) expect(parseInt(btn(k).style.minHeight, 10)).toBeGreaterThanOrEqual(48);
});

test('leaving calls beds.stop', () => {
  mount();
  btn('wind').click();
  kit.leave();
  expect(kit.beds.stop).toHaveBeenCalled();
});

test('reduced motion disables the buttons and says sound is off', () => {
  mount({ reduced: true });
  expect(btn('wind').disabled).toBe(true);
  expect(stage.textContent).toMatch(/sound is off/i);
});
