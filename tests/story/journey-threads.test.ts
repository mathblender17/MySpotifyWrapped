import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { gsap } from 'gsap';
import { createStory, type Slide, type SlideContext } from '../../src/story/player';
import { seasonFor } from '../../src/story/season';
import { STATIONS } from '../../src/journey/stations';
import { HOOKS } from '../../src/journey/hooks';
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
  const s = story({ startAt: 1, holdMs: 2500 }); // a fixed short hold: this test is about stamps, not reading time
  advance(4700); // torii → sumo (arrival incl. the sign ritual + 0.6 s beats)
  advance(4700); // sumo → idol
  s.next(); // finish idol's animation
  expect(s.index).toBe(5);
  const slots = [...root.querySelectorAll('.ticket .slot')];
  expect(slots).toHaveLength(13);
  expect(slots.filter((x) => x.classList.contains('on')).map((x) => slots.indexOf(x))).toEqual([0, 1, 4, 5]);
  expect(slots[2].textContent).toContain('通過');
  expect(slots[3].textContent).toContain('通過');
});

test('each ticket stamp takes the accent colour of its station', () => {
  const s = story({ startAt: 1 });
  s.next(); // finish torii
  s.next(); // ride to sumo
  s.next(); // finish sumo
  const slots = [...root.querySelectorAll<HTMLElement>('.ticket .slot')];
  expect(slots[4].style.color).toBe('rgb(230, 0, 51)');
  expect(slots[1].style.color).toBe('rgb(255, 59, 31)');
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
  const soundtrack = { play: (u?: string) => calls.push(u), pause() {}, resume() {}, stop: vi.fn(), unlock() {}, mute() {}, muted: false, unlocked: false };
  const findPreview = vi.fn(async (artist: string, track: string) => `https://x/${artist}/${track}.m4a`);
  const s = story({ startAt: 1, soundtrack, findPreview });
  await Promise.resolve();
  const top = ctx.stats!.soundtrack!.top!;
  expect(calls).toEqual([`https://x/${top.artist}/${top.name}.m4a`]);
  s.destroy();
  expect(soundtrack.stop).toHaveBeenCalled();
});

test('the first tap or key anywhere in the story unlocks sound (not only the year pick)', () => {
  const make = () => ({ play() {}, pause() {}, resume() {}, stop() {}, unlock: vi.fn(), mute() {}, muted: false, unlocked: false });
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

test('each arrival rings the station chime; muted or reduced, sound accents are not allowed', () => {
  let canPlay = () => true;
  const sfx = { chime: vi.fn(), don: vi.fn(), blip: vi.fn(), bell: vi.fn(), dispose: vi.fn(), unlock: vi.fn() };
  const makeSfx = (o: { canPlay: () => boolean }) => ((canPlay = o.canPlay), sfx);
  const soundtrack = { play() {}, pause() {}, resume() {}, stop() {}, unlock() {}, mute() {}, muted: true, unlocked: true };
  const s = story({ startAt: 1, soundtrack, makeSfx });
  advance(2000); // torii's ride and sign
  expect(sfx.chime).toHaveBeenCalledTimes(1);
  root.dispatchEvent(new MouseEvent('pointerdown', { clientX: 900, bubbles: true }));
  root.dispatchEvent(new MouseEvent('pointerup', { clientX: 900, bubbles: true }));
  expect(sfx.unlock).toHaveBeenCalled(); // the tap unlocks the accents too
  expect(canPlay()).toBe(false); // muted
  soundtrack.muted = false;
  expect(canPlay()).toBe(true);
  soundtrack.unlocked = false;
  expect(canPlay()).toBe(false); // not unlocked yet
  s.destroy();
  expect(sfx.dispose).toHaveBeenCalled();
});

test('the sumo Yokozuna lands with a ドン', () => {
  const sfx = { chime: vi.fn(), don: vi.fn(), blip: vi.fn(), bell: vi.fn(), dispose: vi.fn(), unlock: vi.fn() };
  const sumoSlide = () => Object.assign(document.createElement('div'), { className: 'ph', innerHTML: '<b data-beat="1">a</b><b data-beat="2" data-sfx="don">y</b>' });
  story({ startAt: 4, makeSfx: () => sfx, slides: { ...slides, sumo: sumoSlide } });
  expect(sfx.don).not.toHaveBeenCalled();
  advance(3500);
  expect(sfx.don).toHaveBeenCalledTimes(1);
});

test('tapping to skip an arrival does not fire its queued sounds as one chord', () => {
  const sfx = { chime: vi.fn(), don: vi.fn(), blip: vi.fn(), bell: vi.fn(), dispose: vi.fn(), unlock: vi.fn() };
  const sumoSlide = () => Object.assign(document.createElement('div'), { className: 'ph', innerHTML: '<b data-beat="1">a</b><b data-beat="2" data-sfx="don">y</b>' });
  const s = story({ startAt: 4, makeSfx: () => sfx, slides: { ...slides, sumo: sumoSlide } });
  advance(100);
  s.next(); // skip to the end of the arrival
  expect(sfx.chime).not.toHaveBeenCalled();
  expect(sfx.don).not.toHaveBeenCalled();
});

test('arriving at a station loads its world fonts and those of the next stop', () => {
  document.head.querySelectorAll('link[data-world]').forEach((l) => l.remove());
  story({ startAt: 4 }); // sumo (D), next idol (Q)
  const worlds = [...document.head.querySelectorAll<HTMLLinkElement>('link[data-world]')].map((l) => l.dataset.world);
  expect(worlds).toEqual(expect.arrayContaining(['D', 'Q']));
});

test('light accents (konbini cyan, gacha yellow) stamp in ink so they read on the cream ticket', () => {
  const s = story({ startAt: 8 }); // weather: every stop before it is already stamped
  const slots = [...root.querySelectorAll('.ticket .slot')];
  expect(slots[6].classList.contains('light')).toBe(true);
  expect(slots[7].classList.contains('light')).toBe(true);
  expect(slots[4].classList.contains('light')).toBe(false);
  s.destroy();
});

test('after a phone or tease arrival the guide picks the hook up again (her phone is never left blank)', () => {
  const s = story({ startAt: 5 }); // idol arrives by tease
  s.next(); // finish the arrival
  expect(root.querySelector('.guide .jp')!.textContent).toBe(HOOKS.idol.jp);
});
