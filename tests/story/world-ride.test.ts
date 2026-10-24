import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { gsap } from 'gsap';
import { createStory, type Slide, type SlideContext } from '../../src/story/player';
import { STATIONS } from '../../src/journey/stations';
import { makeDemoPlays } from '../../src/ingest/demo';
import { computeAllYears } from '../../src/stats';

const ds = computeAllYears(makeDemoPlays(), { lifetime: true });
const ctx: SlideContext = { stats: ds.stats.get(2025), years: ds.years, onPickYear: () => {} };
const slides: Record<string, Slide> = Object.fromEntries(
  STATIONS.map((s) => [s.id, () => Object.assign(document.createElement('div'), { id: s.id, className: 'ph' })]),
);

type Call = [string, ...number[]];
const fakeWorld = () => {
  const calls: Call[] = [];
  const travels: gsap.core.Timeline[] = [];
  return {
    calls,
    travels,
    travel(from: number, to: number, s: number) {
      calls.push(['travel', from, to, s]);
      const tl = gsap.timeline({ paused: true }).to({ x: 0 }, { x: 1, duration: s });
      travels.push(tl);
      return tl;
    },
    jump: (i: number) => void calls.push(['jump', i]),
    setSeason: (d: number) => void calls.push(['season', d]),
    pause() {},
    resume() {},
    destroy: vi.fn(),
  };
};

let root: HTMLElement;
let stories: { destroy(): void }[] = [];
const story = (o: Partial<Parameters<typeof createStory>[1]> = {}) => {
  const s = createStory(root, { slides, ctx, reduced: false, ...o });
  stories.push(s);
  return s;
};
const advance = (ms: number) => {
  const g = gsap.globalTimeline;
  for (let t = 0; t < ms; t += 50) {
    g.totalTime(g.totalTime() + 0.05);
    vi.advanceTimersByTime(50);
  }
};
const slidesInFrame = () => root.querySelectorAll('.stage > .ph').length;
const tap = () => {
  root.dispatchEvent(new MouseEvent('pointerdown', { clientX: 900, bubbles: true }));
  root.dispatchEvent(new MouseEvent('pointerup', { clientX: 900, bubbles: true }));
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

test('a ride hands the screen to the world: the train travels 1.6 s between the slides', () => {
  const w = fakeWorld();
  const s = story({ startAt: 1, world: w as never });
  advance(6000);
  s.next(); // finish anything, or move
  expect(w.calls).toContainEqual(['travel', 1, 4, 1.6]);
});

test('with a world the ride lasts longer: the old slide is still leaving at 1.2 s', () => {
  const w = fakeWorld();
  const s = story({ startAt: 1, world: w as never });
  advance(3000); // torii settled
  s.next(); // ride to sumo
  advance(1200);
  expect(slidesInFrame()).toBe(2);
  advance(2000);
  expect(slidesInFrame()).toBe(1);
});

test('the first station puts the camera there; going back jumps', () => {
  const w = fakeWorld();
  const s = story({ startAt: 4, world: w as never });
  expect(w.calls).toContainEqual(['jump', 4]);
  expect(w.calls.some((c) => c[0] === 'travel')).toBe(false); // no ride into the first stop
  s.next(); // finish
  s.prev();
  expect(w.calls).toContainEqual(['jump', 1]);
});

test('every arrival sets the season dial from its act', () => {
  const w = fakeWorld();
  story({ startAt: 4, world: w as never });
  expect(w.calls).toContainEqual(['season', 1 / 3]);
});

test('cuts and teases glide the camera in parallel with the slide', () => {
  const w = fakeWorld();
  const s = story({ startAt: 4, world: w as never });
  s.next(); // finish sumo
  s.next(); // tease → idol
  const t = w.calls.find((c) => c[0] === 'travel' && c[2] === 5)!;
  expect(t[1]).toBe(4);
  expect(t[3]).toBeGreaterThan(0);
});

test('the breather is a real ride, not the window overlay', () => {
  const w = fakeWorld();
  const s = story({ startAt: 7, world: w as never }); // gacha
  s.next(); // finish
  s.next(); // breather → weather
  expect(w.calls).toContainEqual(['travel', 7, 8, 2.6]);
  expect(root.querySelector('.window')).toBeNull();
});

test('a tap mid-ride snaps the train to the station and leaves one slide', () => {
  const w = fakeWorld();
  const s = story({ startAt: 1, world: w as never });
  advance(3000);
  s.next();
  advance(600);
  tap();
  expect(w.travels.at(-1)!.progress()).toBe(1);
  expect(slidesInFrame()).toBe(1);
});

test('if the world is lost mid-ride the story carries on without it', () => {
  const w = fakeWorld();
  const s = story({ startAt: 1, world: w as never });
  advance(3000);
  s.next();
  advance(500);
  s.dropWorld();
  expect(w.destroy).toHaveBeenCalled();
  advance(4000);
  expect(slidesInFrame()).toBe(1);
  const before = w.calls.filter((c) => c[0] === 'travel').length;
  s.next();
  s.next();
  expect(w.calls.filter((c) => c[0] === 'travel').length).toBe(before);
});

test('leaving the story destroys the world', () => {
  const w = fakeWorld();
  const s = story({ startAt: 1, world: w as never });
  s.destroy();
  expect(w.destroy).toHaveBeenCalled();
});

test('with a world the story turns its own background off so the world shows', () => {
  story({ startAt: 1, world: fakeWorld() as never });
  expect(root.classList.contains('world-on')).toBe(true);
});
