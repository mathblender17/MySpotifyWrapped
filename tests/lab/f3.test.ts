import { beforeEach, expect, test } from 'vitest';
import { f3 } from '../../src/lab/experiments/f3-stamp';
import { chargePattern, SLAM } from '../../src/feel/patterns';
import { fakeKit, type FakeKit } from './fakeKit';

const ptr = (type: string, t: number) => {
  const e = new MouseEvent(type, { clientX: 100, clientY: 100, bubbles: true });
  Object.defineProperty(e, 'timeStamp', { value: t });
  Object.defineProperty(e, 'pointerId', { value: 1 });
  return e;
};
let stage: HTMLElement;
let kit: FakeKit;
const mount = (over = {}) => {
  stage = document.createElement('div');
  document.body.append(stage);
  kit = fakeKit(over);
  f3.mount(stage, kit);
};
const ticket = () => stage.querySelector('.f3-ticket') as HTMLElement;
beforeEach(() => { document.body.innerHTML = ''; });

test('pointer down starts the charge: a charge pattern is buzzed', () => {
  mount();
  ticket().dispatchEvent(ptr('pointerdown', 0));
  expect(kit.buzz).toHaveBeenCalledWith(chargePattern(600));
});

test('release after at least 400 ms slams: sound, vibration, 8 splats and a stamp', () => {
  mount();
  ticket().dispatchEvent(ptr('pointerdown', 0));
  ticket().dispatchEvent(ptr('pointerup', 500));
  expect(kit.fx.slam).toHaveBeenCalledTimes(1);
  expect(kit.buzz).toHaveBeenLastCalledWith(SLAM);
  expect(stage.querySelectorAll('.f3-splat').length).toBe(8);
  expect(stage.querySelector('.f3-mark')).not.toBeNull();
});

test('a release before 400 ms is only a poke: no splat, no stamp, no slam', () => {
  mount();
  ticket().dispatchEvent(ptr('pointerdown', 0));
  ticket().dispatchEvent(ptr('pointerup', 200));
  expect(kit.fx.slam).not.toHaveBeenCalled();
  expect(stage.querySelectorAll('.f3-splat').length).toBe(0);
  expect(stage.querySelector('.f3-mark')).toBeNull();
  expect(kit.buzz).toHaveBeenLastCalledWith([10]);
});

test('cancelling the pointer aborts the charge and stops the vibration', () => {
  mount();
  ticket().dispatchEvent(ptr('pointerdown', 0));
  ticket().dispatchEvent(ptr('pointercancel', 100));
  expect(kit.buzz).toHaveBeenLastCalledWith(0);
  expect(stage.querySelector('.f3-mark')).toBeNull();
});

test('reduced motion stamps on a tap with no splat, sound or vibration', () => {
  mount({ reduced: true });
  ticket().dispatchEvent(ptr('pointerdown', 0));
  ticket().dispatchEvent(ptr('pointerup', 100));
  expect(stage.querySelector('.f3-mark')).not.toBeNull();
  expect(stage.querySelectorAll('.f3-splat').length).toBe(0);
  expect(kit.fx.slam).not.toHaveBeenCalled();
  expect(kit.buzz).not.toHaveBeenCalled();
});

test('leaving removes the splats and stops reacting', () => {
  mount();
  ticket().dispatchEvent(ptr('pointerdown', 0));
  ticket().dispatchEvent(ptr('pointerup', 500));
  expect(stage.querySelectorAll('.f3-splat').length).toBe(8);
  kit.leave();
  expect(stage.querySelectorAll('.f3-splat').length).toBe(0);
  const calls = (kit.buzz as unknown as { mock: { calls: unknown[] } }).mock.calls.length;
  ticket().dispatchEvent(ptr('pointerdown', 0));
  expect((kit.buzz as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(calls);
});
