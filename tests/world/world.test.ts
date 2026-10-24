import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createWorld } from '../../src/world/world';
import { stationT, trackFrame } from '../../src/world/track';
import { STATIONS } from '../../src/journey/stations';

const fakeRenderer = () => ({
  calls: [] as string[],
  setSize(w: number, h: number) { this.calls.push(`size ${w}x${h}`); },
  setPixelRatio(r: number) { this.calls.push(`ratio ${r}`); },
  setAnimationLoop(fn: unknown) { this.calls.push(fn ? 'loop on' : 'loop off'); },
  render() {},
  dispose() { this.calls.push('dispose'); },
  info: { render: { calls: 0, triangles: 0 } },
});

let container: HTMLElement;
beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
});
afterEach(() => container.remove());

test('no WebGL → no world (the 2a story runs instead)', () => {
  expect(createWorld(container, { reduced: false, makeRenderer: () => { throw new Error('no webgl'); } })).toBeNull();
  expect(container.querySelector('canvas')).toBeNull();
});

test('travel moves the camera from one station to another over the given time', () => {
  const r = fakeRenderer();
  const w = createWorld(container, { reduced: false, makeRenderer: () => r as never })!;
  const tl = w.travel(1, 4, 1.6);
  expect(tl.duration()).toBeCloseTo(1.6);
  tl.progress(1);
  expect(w.camera.position.distanceTo(trackFrame(stationT(4)).pos)).toBeLessThan(1e-3); // tween float rounding over a 520-unit track
  w.destroy();
});

test('reduced motion: travel is an instant cut', () => {
  const w = createWorld(container, { reduced: true, makeRenderer: () => fakeRenderer() as never })!;
  expect(w.travel(1, 4, 1.6).duration()).toBe(0);
  expect(w.camera.position.distanceTo(trackFrame(stationT(4)).pos)).toBeLessThan(1e-6);
  w.destroy();
});

test('jump puts the camera at a station at once', () => {
  const w = createWorld(container, { reduced: false, makeRenderer: () => fakeRenderer() as never })!;
  w.jump(9);
  expect(w.camera.position.distanceTo(trackFrame(stationT(9)).pos)).toBeLessThan(1e-6);
  w.destroy();
});

test('resize follows the window', () => {
  const r = fakeRenderer();
  const w = createWorld(container, { reduced: false, makeRenderer: () => r as never })!;
  Object.assign(window, { innerWidth: 400, innerHeight: 800 });
  window.dispatchEvent(new Event('resize'));
  expect(w.camera.aspect).toBeCloseTo(0.5);
  w.destroy();
});

test('destroy releases everything: loop off, renderer disposed, canvas gone, no more resize handling', () => {
  const r = fakeRenderer();
  const w = createWorld(container, { reduced: false, makeRenderer: () => r as never })!;
  expect(container.querySelector('canvas')).not.toBeNull();
  w.destroy();
  expect(r.calls).toContain('loop off');
  expect(r.calls).toContain('dispose');
  expect(container.querySelector('canvas')).toBeNull();
  const before = r.calls.length;
  window.dispatchEvent(new Event('resize'));
  expect(r.calls.length).toBe(before);
});

test('a lost WebGL context is reported once and rendering stops', () => {
  const r = fakeRenderer();
  const onLost = vi.fn();
  const w = createWorld(container, { reduced: false, onLost, makeRenderer: () => r as never })!;
  const ev = new Event('webglcontextlost', { cancelable: true });
  w.canvas.dispatchEvent(ev);
  w.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  expect(onLost).toHaveBeenCalledTimes(1);
  expect(r.calls.at(-1)).toBe('loop off');
  w.destroy();
});

test('pause and resume switch the render loop', () => {
  const r = fakeRenderer();
  const w = createWorld(container, { reduced: false, makeRenderer: () => r as never })!;
  w.pause();
  expect(r.calls.at(-1)).toBe('loop off');
  w.resume();
  expect(r.calls.at(-1)).toBe('loop on');
  w.destroy();
});

test('travel builds the destination district before the camera gets there', () => {
  const w = createWorld(container, { reduced: false, stationIds: STATIONS.map((s) => s.id), makeRenderer: () => fakeRenderer() as never })!;
  w.travel(1, 4, 1.6);
  const built = w.scene.children.filter((c) => c.userData.district !== undefined).map((c) => c.userData.district);
  expect(built).toEqual(expect.arrayContaining([3, 4, 5])); // plus the district being left, until the ride ends
  w.destroy();
  expect(w.scene.children.filter((c) => c.userData.district !== undefined)).toHaveLength(0);
});

test('destroy hands the WebGL context back (browsers cap live contexts at ~16)', () => {
  const r = { ...fakeRenderer(), forceContextLoss: vi.fn() };
  const onLost = vi.fn();
  const w = createWorld(container, { reduced: false, onLost, makeRenderer: () => r as never })!;
  w.destroy();
  expect(r.forceContextLoss).toHaveBeenCalled();
  expect(onLost).not.toHaveBeenCalled(); // our own release is not a "lost" world
});

test('the district you leave stays until the train has left it, even when stations are skipped', () => {
  const w = createWorld(container, { reduced: false, stationIds: STATIONS.map((s) => s.id), makeRenderer: () => fakeRenderer() as never })!;
  w.jump(1);
  const tl = w.travel(1, 4, 1.6); // bento and ganguro passed through
  const built = () => w.scene.children.filter((c) => c.userData.district !== undefined).map((c) => c.userData.district as number).sort((a, b) => a - b);
  expect(built()).toEqual(expect.arrayContaining([1, 3, 4, 5]));
  tl.progress(1);
  expect(built()).toEqual([3, 4, 5]);
  w.destroy();
});

test('if building the world fails after the renderer exists, nothing is left behind', () => {
  const r = { ...fakeRenderer(), forceContextLoss: vi.fn(), setPixelRatio() { throw new Error('boom'); } };
  expect(createWorld(container, { reduced: false, makeRenderer: () => r as never })).toBeNull();
  expect(r.calls).toContain('dispose');
  expect(r.forceContextLoss).toHaveBeenCalled();
  expect(container.querySelector('canvas')).toBeNull();
});

test('the first quality step drops the glass blur (costly over a live canvas)', () => {
  const r = fakeRenderer();
  const w = createWorld(container, { reduced: false, makeRenderer: () => r as never })!;
  (w as unknown as { _qualityStep(l: 1 | 2): void })._qualityStep(1);
  expect(document.documentElement.classList.contains('lowfx')).toBe(true);
  w.destroy();
  expect(document.documentElement.classList.contains('lowfx')).toBe(false);
});
