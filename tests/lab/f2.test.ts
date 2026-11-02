import { beforeEach, expect, test, vi } from 'vitest';
import { f2 } from '../../src/lab/experiments/f2-tilt';
import { fakeKit, type FakeKit } from './fakeKit';

let stage: HTMLElement;
let kit: FakeKit;
let emit: (x: number, y: number) => void = () => {};
let unsub = vi.fn();
const mount = (over: Parameters<typeof fakeKit>[0] = {}) => {
  stage = document.createElement('div');
  document.body.append(stage);
  unsub = vi.fn();
  const tilt = { state: 'idle' as const, request: vi.fn(async () => true), stop: vi.fn(), on: vi.fn((fn: (x: number, y: number) => void) => { emit = fn; return unsub; }) };
  kit = fakeKit({ tilt, ...over });
  f2.mount(stage, kit);
};
const layers = () => [...stage.querySelectorAll<HTMLElement>('.f2-layer')];
const shiftX = (el: HTMLElement) => Math.abs(parseFloat(/translate3d\((-?[\d.]+)px/.exec(el.style.transform)?.[1] ?? '0'));
beforeEach(() => { document.body.innerHTML = ''; });

test('mounts four depth layers', () => {
  mount();
  expect(layers().length).toBe(4);
});

test('each layer moves by depth × tilt, further layers more', () => {
  mount();
  emit(1, 0);
  const s = layers().map(shiftX);
  expect(s[0]).toBeGreaterThan(0);
  for (let i = 1; i < s.length; i++) expect(s[i]).toBeGreaterThan(s[i - 1]);
});

test('without tilt the layers follow a pointer drag instead', () => {
  mount();
  const move = (type: string, x: number) => stage.dispatchEvent(Object.assign(new MouseEvent(type, { clientX: x, clientY: 100, bubbles: true }), { pointerId: 1 }));
  move('pointerdown', 195);
  move('pointermove', 295);
  expect(shiftX(layers()[3])).toBeGreaterThan(0);
});

test('an "Enable tilt" button calls kit.tilt.request inside the tap', () => {
  mount();
  (stage.querySelector('.f2-enable') as HTMLElement).click();
  expect(kit.tilt.request).toHaveBeenCalledTimes(1);
});

test('reduced motion shows the still scene and a note that motion is off', () => {
  mount({ reduced: true });
  expect(stage.textContent).toContain('motion is off');
  expect(stage.querySelector('.f2-enable')).toBeNull();
  emit(1, 0);
  expect(layers().every((l) => shiftX(l) === 0)).toBe(true);
});

test('leaving unsubscribes and stops tilt', () => {
  mount();
  kit.leave();
  expect(unsub).toHaveBeenCalled();
  expect(kit.tilt.stop).toHaveBeenCalled();
});
