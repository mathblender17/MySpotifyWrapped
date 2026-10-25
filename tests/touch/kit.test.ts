import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { gsap } from 'gsap';
import { createStory, type Slide, type SlideContext } from '../../src/story/player';
import { STATIONS } from '../../src/journey/stations';
import { TOUCH } from '../../src/touch';
import type { TouchKit } from '../../src/touch/kit';
import { makeDemoPlays } from '../../src/ingest/demo';
import { computeAllYears } from '../../src/stats';

const ds = computeAllYears(makeDemoPlays(), { lifetime: true });
const ctx: SlideContext = { stats: ds.stats.get(2025), years: ds.years, onPickYear: () => {} };
const slides: Record<string, Slide> = Object.fromEntries(
  STATIONS.map((s) => [s.id, () => {
    const el = Object.assign(document.createElement('div'), { id: s.id, className: 'ph' });
    el.innerHTML = `<b data-beat="1">${s.id}</b><span class="thing">thing</span>`;
    return el;
  }]),
);
const TORII = 1;
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
const fire = (el: Element, type: string, clientX = 900) => el.dispatchEvent(new MouseEvent(type, { clientX, bubbles: true }));
const tap = (el: Element, clientX = 900) => {
  fire(el, 'pointerdown', clientX);
  fire(el, 'pointerup', clientX);
};
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
let kit: TouchKit;
const saved = { ...TOUCH };
beforeEach(() => {
  vi.useFakeTimers();
  gsap.ticker.sleep();
  root = document.createElement('div');
  document.body.append(root);
  TOUCH.torii = (el, k) => {
    kit = k;
    k.mark(el.querySelector('.thing')!);
  };
});
afterEach(() => {
  for (const s of stories) s.destroy();
  stories = [];
  delete TOUCH.torii;
  delete TOUCH.weather;
  Object.assign(TOUCH, saved);
  vi.useRealTimers();
  root.remove();
});

test('a marked element is interactive: tapping it never moves the ride, tapping beside it still does', () => {
  const s = story({ startAt: TORII, holdMs: 3000 });
  advance(3000);
  const thing = root.querySelector('.thing')!;
  expect(thing.hasAttribute('data-touch')).toBe(true);
  tap(thing);
  expect(s.index).toBe(TORII);
  tap(root.querySelector('b')!);
  expect(s.index).toBeGreaterThan(TORII);
});

test('busy freezes the hold and release continues it; nested uses need both releases', () => {
  const s = story({ startAt: TORII, holdMs: 3000 });
  s.next(); // finish the arrival animation: the hold starts now
  advance(1000);
  const r1 = kit.busy();
  const r2 = kit.busy();
  advance(10000);
  expect(s.index).toBe(TORII);
  r1();
  r1(); // a double release counts once
  advance(10000);
  expect(s.index).toBe(TORII);
  r2();
  advance(1900);
  expect(s.index).toBe(TORII);
  advance(200);
  expect(s.index).toBeGreaterThan(TORII);
});

test('the first touch removes the card\'s dots', () => {
  story({ startAt: TORII, holdMs: 3000 });
  expect(root.querySelectorAll('.touch-dot')).toHaveLength(1);
  fire(root.querySelector('.thing')!, 'pointerdown');
  expect(root.querySelectorAll('.touch-dot')).toHaveLength(0);
});

test('playTrack plays over the mix and a late mix lookup does not override it', async () => {
  const plays: (string | undefined)[] = [];
  let ended: (() => void) | undefined;
  const st = { play: (u?: string) => void plays.push(u), onEnded: (cb: () => void) => void (ended = cb), pause() {}, resume() {}, stop() {}, unlock() {}, mute() {}, muted: false, unlocked: true };
  const waiting = new Map<string, () => void>();
  story({ startAt: TORII, soundtrack: st, findPreview: (_a, t) => new Promise((res) => waiting.set(t, () => res(`url-${t}`))) });
  ended!(); // mix lookup now pending
  const mix = [...waiting.values()][0];
  const got = kit.playTrack({ name: 'Mine', artist: 'Me' });
  waiting.get('Mine')!();
  expect(await got).toBe(true);
  mix();
  await flush();
  expect(plays).toEqual(['url-Mine']);
});

test('a station without a touch entry, or whose attach throws, still shows its card', () => {
  TOUCH.torii = () => { throw new Error('boom'); };
  const s = story({ startAt: TORII, holdMs: 2500 });
  expect(root.querySelector('#torii')).not.toBeNull();
  advance(6000);
  expect(s.index).toBeGreaterThan(TORII);
});

test('a touched song with no preview lets the mix carry on', async () => {
  const plays: (string | undefined)[] = [];
  let ended: (() => void) | undefined;
  const st = { play: (u?: string) => void plays.push(u), onEnded: (cb: () => void) => void (ended = cb), pause() {}, resume() {}, stop() {}, unlock() {}, mute() {}, muted: false, unlocked: true };
  const asked: string[] = [];
  story({ startAt: TORII, soundtrack: st, findPreview: (_a, t) => { asked.push(t); return t === 'None' ? Promise.resolve(undefined) : new Promise(() => {}); } });
  ended!(); // mix lookup in flight
  expect(await kit.playTrack({ name: 'None', artist: 'Me' })).toBe(false);
  await flush();
  expect(asked.length).toBe(3); // mix #1, the touched song, mix #2 restarted
  expect(asked.filter((t) => t === 'None')).toHaveLength(1);
});

test('a touched-song lookup still pending when the card changes is dropped', async () => {
  const plays: (string | undefined)[] = [];
  const st = { play: (u?: string) => void plays.push(u), onEnded: () => {}, pause() {}, resume() {}, stop() {}, unlock() {}, mute() {}, muted: false, unlocked: true };
  const waiting = new Map<string, () => void>();
  TOUCH.weather = (_el, k) => { kit = k; };
  const s = story({ startAt: STATIONS.findIndex((x) => x.id === 'weather'), soundtrack: st, findPreview: (_a, t) => new Promise((res) => waiting.set(t, () => res(`url-${t}`))) });
  const got = kit.playTrack({ name: 'Mine', artist: 'Me' });
  s.next(); // finishes the arrival animation
  s.next();
  expect(STATIONS[s.index].id).toBe('fuji');
  expect(STATIONS[s.index].song).toBeUndefined(); // the new station has no cue to bump the lookup id
  waiting.get('Mine')!();
  expect(await got).toBe(false);
  await flush();
  expect(plays).not.toContain('url-Mine');
});
