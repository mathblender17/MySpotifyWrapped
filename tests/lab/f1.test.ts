import { beforeEach, expect, test, vi } from 'vitest';
import { f1, settleFor } from '../../src/lab/experiments/f1-momentum';
import { CLACK } from '../../src/feel/patterns';
import { fakeKit, type FakeKit } from './fakeKit';

/** A pointer event whose timeStamp the test controls. */
const ptr = (type: string, x: number, t: number, y = 100) => {
  const e = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
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
  f1.mount(stage, kit);
};
const strip = () => stage.querySelector('.f1-strip') as HTMLElement;
/** Drag `px` to the left over `ms`, in four steps, then release. */
const swipeLeft = (px: number, ms: number) => {
  strip().dispatchEvent(ptr('pointerdown', 300, 0));
  for (let i = 1; i <= 4; i++) strip().dispatchEvent(ptr('pointermove', 300 - (px * i) / 4, (ms * i) / 4));
  strip().dispatchEvent(ptr('pointerup', 300 - px, ms));
};
beforeEach(() => { document.body.innerHTML = ''; });

test('mounts 13 station cards in a strip', () => {
  mount();
  expect(stage.querySelectorAll('.f1-card').length).toBe(13);
});

test('a fast leftward flick ends on a later card than a slow drag of the same distance', () => {
  mount();
  swipeLeft(150, 2000);
  settleFor(stage);
  const slow = Number(strip().dataset.index);
  stage.remove();
  mount();
  swipeLeft(150, 60);
  settleFor(stage);
  const fast = Number(strip().dataset.index);
  expect(fast).toBeGreaterThan(slow);
});

test('crossing a station fires one clack and one vibration per card crossed', () => {
  mount();
  swipeLeft(150, 60);
  settleFor(stage);
  const reached = Number(strip().dataset.index);
  expect(reached).toBeGreaterThan(0);
  expect(kit.fx.clack).toHaveBeenCalledTimes(reached);
  expect(kit.buzz).toHaveBeenCalledTimes(reached);
  expect(kit.buzz).toHaveBeenCalledWith(CLACK);
});

test('under reduced motion the strip jumps to the nearest card with no clack', () => {
  mount({ reduced: true });
  swipeLeft(250, 60);
  expect(strip().dataset.index).toBe('1');
  expect(kit.fx.clack).not.toHaveBeenCalled();
  expect(kit.buzz).not.toHaveBeenCalled();
});

test('leaving cancels the animation frame and removes the listeners', () => {
  const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame');
  mount();
  swipeLeft(150, 60); // leaves an animation running
  kit.leave();
  expect(cancel).toHaveBeenCalled();
  const before = strip().dataset.index;
  strip().dispatchEvent(ptr('pointerdown', 300, 0));
  strip().dispatchEvent(ptr('pointermove', 100, 50));
  expect(strip().dataset.index).toBe(before);
  cancel.mockRestore();
});
