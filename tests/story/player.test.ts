import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { gsap } from 'gsap';
import { createStory, type Slide, type SlideContext } from '../../src/story/player';
import { STATIONS } from '../../src/journey/stations';
import { makeDemoPlays } from '../../src/ingest/demo';
import { computeAllYears } from '../../src/stats';

const ds = computeAllYears(makeDemoPlays(), { lifetime: true });
const ctx: SlideContext = { stats: ds.stats.get(2025), years: ds.years, onPickYear: () => {} };
const slides: Record<string, Slide> = Object.fromEntries(
  STATIONS.map((s) => [s.id, () => {
    const el = Object.assign(document.createElement('div'), { id: s.id, className: 'ph' });
    el.innerHTML = `<b data-beat="1">${s.id}</b>`;
    if (s.id === 'torii') el.append(Object.assign(document.createElement('button'), { textContent: 'tap me' }));
    return el;
  }]),
);

let root: HTMLElement;
let stories: { destroy(): void }[] = [];
const story = (o: Partial<Parameters<typeof createStory>[1]> = {}) => {
  const s = createStory(root, { slides, ctx, reduced: false, ...o });
  stories.push(s);
  return s;
};

/** GSAP doesn't run on fake timers, so drive its clock and the timers together. */
const advance = (ms: number) => {
  const g = gsap.globalTimeline;
  for (let t = 0; t < ms; t += 50) {
    g.totalTime(g.totalTime() + 0.05);
    vi.advanceTimersByTime(50);
  }
};

beforeEach(() => {
  vi.useFakeTimers();
  gsap.ticker.sleep();
  root = document.createElement('div');
  document.body.append(root);
});
afterEach(() => {
  for (const s of stories) s.destroy();
  stories = [];
  vi.useRealTimers();
  root.remove();
});

const fire = (el: Element, type: string, clientX = 900) => el.dispatchEvent(new MouseEvent(type, { clientX, bubbles: true }));
const tap = (el: Element, clientX = 900) => {
  fire(el, 'pointerdown', clientX);
  fire(el, 'pointerup', clientX);
};
const slidesInFrame = () => root.querySelectorAll('.frame > .ph').length;

test('a station plays its transition and beats, holds, then rides on — skipping pass-throughs', () => {
  const s = story({ startAt: 1 });
  expect(s.index).toBe(1);
  advance(6000);
  expect(s.index).toBe(4);
  expect(root.querySelector('#sumo')).not.toBeNull();
});

test('the route map shows all 13 stops with pass-throughs marked', () => {
  story({ startAt: 1 });
  const stops = [...root.querySelectorAll('.stop')];
  expect(stops).toHaveLength(13);
  expect(stops.filter((x) => x.textContent!.includes('通過'))).toHaveLength(2);
});

test('the departure board waits for the rider', () => {
  const s = story({ startAt: 0 });
  advance(20000);
  expect(s.index).toBe(0);
});

test('first tap during a transition finishes it; the next tap moves on', () => {
  const s = story({ startAt: 1 });
  advance(3000);
  s.next(); // into sumo, mid-ride
  advance(100);
  tap(root);
  expect(s.index).toBe(4);
  expect(slidesInFrame()).toBe(1);
  tap(root);
  expect(s.index).toBe(5);
});

test('rapid taps never stack slides: each tap does one thing', () => {
  const s = story({ startAt: 1 });
  for (let i = 0; i < 10; i++) {
    tap(root);
    expect(slidesInFrame()).toBeLessThanOrEqual(2); // never more than outgoing + incoming
  }
  // first tap finishes the opening, then move/finish alternate: 5 moves, skipping bento and ganguro
  expect(s.index).toBe(8);
  advance(5000);
  expect(slidesInFrame()).toBe(1);
});

test('going back lands instantly with every beat shown', () => {
  const s = story({ startAt: 4 });
  advance(100);
  tap(root, 10); // finish the current animation
  tap(root, 10);
  expect(s.index).toBe(1);
  expect((root.querySelector('#torii b') as HTMLElement).style.opacity).toBe('1');
  expect(slidesInFrame()).toBe(1);
});

test('tapping a button inside a slide does not move the story', () => {
  const s = story({ startAt: 1 });
  advance(3000);
  tap(root.querySelector('button')!);
  expect(s.index).toBe(1);
});

test('holding pauses everything, releasing resumes', () => {
  const s = story({ startAt: 1 });
  advance(3000);
  fire(root, 'pointerdown');
  advance(10000);
  expect(s.index).toBe(1);
  fire(root, 'pointerup');
  advance(3000);
  expect(s.index).toBe(4);
});

test('a cancelled hold resumes instead of staying paused', () => {
  const s = story({ startAt: 1 });
  advance(3000);
  fire(root, 'pointerdown');
  advance(300);
  fire(root, 'pointercancel');
  advance(3000);
  expect(s.index).toBe(4);
});

test('keyboard: arrows move, space toggles pause', () => {
  const s = story({ startAt: 1 });
  advance(3000);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
  advance(3000);
  expect(s.index).toBe(4);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
  expect(s.index).toBe(1);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
  advance(9000);
  expect(s.index).toBe(1);
});

test('the guide texts each station’s hook', () => {
  story({ startAt: 1 });
  advance(2000);
  expect(root.querySelector('.guide')!.textContent).toContain('First up');
});

test('genre stations explain they are coming, not that an export would unlock them', () => {
  story({ startAt: 1 });
  const bento = root.querySelectorAll('.stop')[2] as HTMLElement;
  expect(bento.title).toBe('Genres arrive in a later update');
});
