import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createStory, type Slide, type SlideContext } from '../../src/story/player';
import { STATIONS } from '../../src/journey/stations';
import { makeDemoPlays } from '../../src/ingest/demo';
import { computeAllYears } from '../../src/stats';

const ds = computeAllYears(makeDemoPlays());
const ctx: SlideContext = { stats: ds.stats.get(2025), years: ds.years, onPickYear: () => {} };
const slides: Record<string, Slide> = Object.fromEntries(
  STATIONS.map((s) => [s.id, () => {
    const el = Object.assign(document.createElement('div'), { id: s.id });
    if (s.id === 'torii') el.append(Object.assign(document.createElement('button'), { textContent: 'tap me' }));
    return el;
  }]),
);

let root: HTMLElement;
beforeEach(() => {
  vi.useFakeTimers();
  root = document.createElement('div');
  document.body.append(root);
});
afterEach(() => {
  vi.useRealTimers();
  root.remove();
});

const fire = (el: Element, type: string, clientX = 900) => el.dispatchEvent(new MouseEvent(type, { clientX, bubbles: true }));
const tap = (el: Element, clientX = 900) => {
  fire(el, 'pointerdown', clientX);
  fire(el, 'pointerup', clientX);
};

test('auto-advance skips pass-through stations', () => {
  const s = createStory(root, { slides, ctx, startAt: 1 });
  expect(s.index).toBe(1);
  expect(root.querySelector('#torii')).not.toBeNull();
  vi.advanceTimersByTime(8000);
  expect(s.index).toBe(4);
  expect(root.querySelector('#sumo')).not.toBeNull();
});

test('the route map shows all 13 stops with pass-throughs marked', () => {
  createStory(root, { slides, ctx, startAt: 1 });
  const stops = [...root.querySelectorAll('.stop')];
  expect(stops).toHaveLength(13);
  expect(stops.filter((x) => x.textContent!.includes('通過'))).toHaveLength(2);
  expect(root.querySelector('.stop.current')!.textContent).toContain('2');
});

test('the departure board waits for the rider', () => {
  const s = createStory(root, { slides, ctx, startAt: 0 });
  vi.advanceTimersByTime(20000);
  expect(s.index).toBe(0);
});

test('tapping the left third goes back, skipping pass-throughs', () => {
  const s = createStory(root, { slides, ctx, startAt: 4 });
  tap(root, 10);
  expect(s.index).toBe(1);
  tap(root, 900);
  expect(s.index).toBe(4);
});

test('tapping a button inside a slide does not move the story', () => {
  const s = createStory(root, { slides, ctx, startAt: 1 });
  tap(root.querySelector('button')!);
  expect(s.index).toBe(1);
});

test('holding pauses, releasing resumes without advancing', () => {
  const s = createStory(root, { slides, ctx, startAt: 1 });
  fire(root, 'pointerdown');
  vi.advanceTimersByTime(300);
  vi.advanceTimersByTime(8000);
  expect(s.index).toBe(1);
  fire(root, 'pointerup');
  expect(s.index).toBe(1);
  vi.advanceTimersByTime(8000);
  expect(s.index).toBe(4);
});

test('keyboard: arrows move, space toggles pause', () => {
  const s = createStory(root, { slides, ctx, startAt: 1 });
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
  expect(s.index).toBe(4);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
  expect(s.index).toBe(1);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
  vi.advanceTimersByTime(9000);
  expect(s.index).toBe(1);
  s.destroy();
});
