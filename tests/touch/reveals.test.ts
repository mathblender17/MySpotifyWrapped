import { expect, test, vi } from 'vitest';
import { gsap } from 'gsap';
import { gacha } from '../../src/slides/gacha';
import { shinkansen } from '../../src/slides/shinkansen';
import { omikuji } from '../../src/slides/omikuji';
import { TOUCH } from '../../src/touch';
import type { TouchKit } from '../../src/touch/kit';
import { ctx, STATS } from '../slides/fixture';

const fake = (stats = STATS as never) => {
  const log = { busy: 0, release: 0, played: [] as string[], marked: [] as Element[], blip: 0, rumble: 0, buzz: [] as unknown[], leave: [] as (() => void)[] };
  const kit = {
    stats, reduced: false,
    busy: () => { log.busy++; return () => { log.release++; }; },
    playTrack: async (t: { name: string }) => { log.played.push(t.name); return true; },
    sfx: { blip: () => { log.blip++; }, rumble: () => { log.rumble++; } },
    buzz: (p: unknown) => { log.buzz.push(p); }, mark: (e: Element) => { log.marked.push(e); }, dur: (s: number) => s,
    onLeave: (f: () => void) => { log.leave.push(f); },
  } as unknown as TouchKit;
  return { kit, log };
};
const advance = (s: number) => gsap.globalTimeline.totalTime(gsap.globalTimeline.totalTime() + s);
const txt = (el: Element, sel: string) => el.querySelector(sel)!.textContent;

test('gacha: taps pull #2–#5 with SR, R, R, N, then back to the SSR', () => {
  const el = gacha(ctx());
  const { kit, log } = fake();
  TOUCH.gacha!(el, kit);
  const card = el.querySelector<HTMLElement>('.k-win.card')!;
  expect(log.marked).toEqual([card]);
  const ssr = txt(el, '.ssr');
  for (const [i, label] of ['SR', 'R', 'R', 'N'].entries()) {
    card.click();
    expect(txt(el, '.ssr')).toBe(label);
    expect(txt(el, '.k-song')).toBe(STATS.topTracks[i + 1].name);
    expect(txt(el, '.ar')).toBe(STATS.topTracks[i + 1].artist);
  }
  card.click();
  expect(txt(el, '.ssr')).toBe(ssr);
  expect(txt(el, '.k-song')).toBe(STATS.topTracks[0].name);
  expect(txt(el, '.ar')).toBe(STATS.topTracks[0].artist);
  expect(card.dataset.haptic).toBe('ssr');
  expect(log.blip).toBe(5);
  expect(log.buzz).toEqual([10, 10, 10, 10, 10]);
});

test('gacha: one track → no mark', () => {
  const stats = { ...STATS, topTracks: STATS.topTracks.slice(0, 1) } as never;
  const { kit, log } = fake(stats);
  TOUCH.gacha!(gacha(ctx({ stats })), kit);
  expect(log.marked).toEqual([]);
});

test("shinkansen: tapping the beast rumbles and plays the riser's song", () => {
  const stats = { ...STATS, soundtrack: { riserTrack: { name: 'Riser Song', artist: 'Hoshino Rei' } } } as never;
  const el = shinkansen(ctx({ stats }));
  const { kit, log } = fake(stats);
  TOUCH.shinkansen!(el, kit);
  const beast = el.querySelector<HTMLElement>('.beastwrap')!;
  expect(log.marked).toEqual([beast]);
  beast.click();
  expect(log.rumble).toBe(1);
  expect(log.buzz).toEqual([[30, 30, 30]]);
  expect(log.played).toEqual(['Riser Song']);
  expect(log.busy).toBe(1);
  advance(0.1);
  beast.click(); // re-tap mid-shake: one release per take, and it still ends at rest
  expect(log.release).toBe(1);
  advance(1);
  expect(log.release).toBe(2);
  expect(gsap.getProperty(beast, 'x')).toBe(0);
});

test('shinkansen: no riser track → still shakes, plays nothing', () => {
  const el = shinkansen(ctx());
  const { kit, log } = fake();
  TOUCH.shinkansen!(el, kit);
  el.querySelector<HTMLElement>('.beastwrap')!.click();
  expect(log.played).toEqual([]);
  expect(log.rumble).toBe(1);
});

test('omikuji: tapping the box shakes the same fortune out again', () => {
  const el = omikuji(ctx());
  const { kit, log } = fake();
  TOUCH.omikuji!(el, kit);
  const kuji = el.querySelector<HTMLElement>('.kuji')!;
  expect(log.marked).toEqual([kuji]);
  const fortune = txt(el, '.hero');
  kuji.click();
  expect(log.busy).toBe(1);
  expect(log.buzz).toEqual([10]);
  advance(3);
  expect(log.release).toBe(1);
  expect(txt(el, '.hero')).toBe(fortune);
  expect(el.querySelector<HTMLElement>('.hero')!.style.opacity).toBe('1');
  expect(gsap.getProperty(kuji, 'x')).toBe(0);
});

test('omikuji: a shake past the threshold acts like a tap; the listener goes when the card leaves', () => {
  const requestPermission = vi.fn(async () => 'granted');
  vi.stubGlobal('DeviceMotionEvent', { requestPermission });
  let now = 10_000;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  const el = omikuji(ctx());
  const { kit, log } = fake();
  TOUCH.omikuji!(el, kit);
  const motion = (a: number) => window.dispatchEvent(Object.assign(new Event('devicemotion'), { acceleration: { x: a, y: 0, z: 0 } }));
  motion(20); // one hard sample alone is a bump, not a shake
  expect(log.busy).toBe(0);
  motion(5);
  motion(20); motion(20);
  expect(log.busy).toBe(1);
  expect(requestPermission).not.toHaveBeenCalled(); // only the first tap asks
  motion(20); motion(20); // inside the 1.5 s cooldown
  expect(log.busy).toBe(1);
  now += 2000;
  el.querySelector<HTMLElement>('.kuji')!.click();
  el.querySelector<HTMLElement>('.kuji')!.click();
  expect(requestPermission).toHaveBeenCalledTimes(1);
  expect(log.busy).toBe(3);
  now += 2000;
  for (const f of log.leave) f();
  motion(20); motion(20);
  expect(log.busy).toBe(3);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('reduced motion: shinkansen tap still shows an instant, brief response', () => {
  vi.useFakeTimers();
  const el = shinkansen(ctx());
  const { kit } = fake();
  (kit as { dur: (s: number) => number }).dur = () => 0;
  TOUCH.shinkansen!(el, kit);
  const beast = el.querySelector<HTMLElement>('.beastwrap')!;
  beast.click();
  expect(beast.classList.contains('rumbling')).toBe(true);
  vi.advanceTimersByTime(700);
  expect(beast.classList.contains('rumbling')).toBe(false);
  vi.useRealTimers();
});

test('reduced motion: omikuji tap still shows the slip, then puts it away', () => {
  vi.useFakeTimers();
  const el = omikuji(ctx());
  const { kit, log } = fake();
  (kit as { dur: (s: number) => number }).dur = () => 0;
  TOUCH.omikuji!(el, kit);
  el.querySelector<HTMLElement>('.kuji')!.click();
  const slip = el.querySelector<HTMLElement>('.slip')!;
  expect(slip.style.opacity).toBe('1');
  expect(log.release).toBe(0);
  vi.advanceTimersByTime(1600);
  expect(slip.style.opacity).toBe('0');
  expect(log.release).toBe(1);
  vi.useRealTimers();
});
