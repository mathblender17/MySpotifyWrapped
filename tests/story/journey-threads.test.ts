import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { gsap } from 'gsap';
import { createStory, type Slide, type SlideContext } from '../../src/story/player';
import { seasonFor } from '../../src/story/season';
import { STATIONS } from '../../src/journey/stations';
import { makeDemoPlays } from '../../src/ingest/demo';
import { computeAllYears } from '../../src/stats';

const ds = computeAllYears(makeDemoPlays(), { lifetime: true });
const ctx: SlideContext = { stats: ds.stats.get(2025), years: ds.years, onPickYear: () => {} };
const slides: Record<string, Slide> = Object.fromEntries(
  STATIONS.map((s) => [s.id, () => Object.assign(document.createElement('div'), { id: s.id, className: 'ph' })]),
);

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

test('acts map to the four seasons', () => {
  expect([1, 2, 3, 4].map((a) => seasonFor(a as 1 | 2 | 3 | 4))).toEqual(['spring', 'summer', 'autumn', 'winter']);
});

test('the story wears the season of the current act', () => {
  const s = story({ startAt: 1 });
  expect(root.classList.contains('season-spring')).toBe(true);
  s.next(); // finish torii
  s.next(); // ride to sumo (act 2)
  expect(root.classList.contains('season-summer')).toBe(true);
  expect(root.classList.contains('season-spring')).toBe(false);
});

test('the ticket is stamped at every station you stop at, and passed stations read 通過', () => {
  const s = story({ startAt: 1 });
  advance(4000); // torii → sumo
  advance(4000); // sumo → idol
  s.next(); // finish idol's animation
  expect(s.index).toBe(5);
  const slots = [...root.querySelectorAll('.ticket .slot')];
  expect(slots).toHaveLength(13);
  expect(slots.filter((x) => x.classList.contains('on')).map((x) => slots.indexOf(x))).toEqual([0, 1, 4, 5]);
  expect(slots[2].textContent).toContain('通過');
  expect(slots[3].textContent).toContain('通過');
});

test('the train marker sits at the current stop', () => {
  const s = story({ startAt: 1 });
  const marker = () => (root.querySelector('.train-marker') as HTMLElement).style.left;
  expect(marker()).toBe(`${(1 / 12) * 100}%`);
  s.next();
  s.next();
  expect(marker()).toBe(`${(4 / 12) * 100}%`);
});

test('reduced motion: no particles', () => {
  story({ startAt: 1, reduced: true });
  expect(root.querySelectorAll('.season-fx i')).toHaveLength(0);
});

test('with motion: a particle layer', () => {
  story({ startAt: 1 });
  expect(root.querySelectorAll('.season-fx i').length).toBeGreaterThan(0);
});

test('the soundtrack follows the stations and stops when the story is left', async () => {
  const calls: (string | undefined)[] = [];
  const soundtrack = { play: (u?: string) => calls.push(u), pause() {}, resume() {}, stop: vi.fn(), unlock() {}, mute() {}, muted: false };
  const findPreview = vi.fn(async (artist: string, track: string) => `https://x/${artist}/${track}.m4a`);
  const s = story({ startAt: 1, soundtrack, findPreview });
  await Promise.resolve();
  const top = ctx.stats!.soundtrack!.top!;
  expect(calls).toEqual([`https://x/${top.artist}/${top.name}.m4a`]);
  s.destroy();
  expect(soundtrack.stop).toHaveBeenCalled();
});

test('the first tap or key anywhere in the story unlocks sound (not only the year pick)', () => {
  const make = () => ({ play() {}, pause() {}, resume() {}, stop() {}, unlock: vi.fn(), mute() {}, muted: false });
  const a = make();
  story({ startAt: 0, soundtrack: a });
  root.dispatchEvent(new MouseEvent('pointerdown', { clientX: 900, bubbles: true }));
  root.dispatchEvent(new MouseEvent('pointerup', { clientX: 900, bubbles: true }));
  expect(a.unlock).toHaveBeenCalled();
  stories.pop()!.destroy();
  const b = make();
  story({ startAt: 0, soundtrack: b });
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
  expect(b.unlock).toHaveBeenCalled();
});

test('reduced motion: ticket stamps land without spinning, and the story is flagged for CSS', async () => {
  const { createTicket } = await import('../../src/story/ticket');
  const t = createTicket(STATIONS, STATIONS.map(() => true), true);
  expect(t.stamp(1).duration()).toBe(0);
  story({ startAt: 1, reduced: true });
  expect(root.classList.contains('reduced')).toBe(true);
});
