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
const slidesInFrame = () => root.querySelectorAll('.stage > .ph').length;

test('a station plays its transition and beats, holds, then rides on — skipping pass-throughs', () => {
  const s = story({ startAt: 1, holdMs: 2500 }); // navigation test: a fixed short hold, not reading time
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
  const s = story({ startAt: 1, holdMs: 2500 }); // navigation test: a fixed short hold, not reading time
  advance(3000);
  fire(root, 'pointerdown');
  advance(10000);
  expect(s.index).toBe(1);
  fire(root, 'pointerup');
  advance(3000);
  expect(s.index).toBe(4);
});

test('a cancelled hold resumes instead of staying paused', () => {
  const s = story({ startAt: 1, holdMs: 2500 }); // navigation test: a fixed short hold, not reading time
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

test('every arrival shows the station sign, then docks it before the beats', () => {
  story({ startAt: 1 });
  advance(100);
  const sign = root.querySelector('.frame .sign')!;
  expect(sign.textContent).toContain('02'); // a Plan-2 station gets the sign too
  tap(root); // finish
  tap(root); // ride on to sumo
  expect(sign.textContent).toContain('05');
  tap(root);
  expect(sign.classList.contains('docked')).toBe(true);
});

test('the arrival ritual adds the sign beats (0.45 s + 0.25 s dock) to the timeline', async () => {
  const { runTransition } = await import('../../src/journey/transitions');
  const { playBeats } = await import('../../src/journey/beats');
  const spy = vi.spyOn(gsap.core.Timeline.prototype, 'play');
  story({ startAt: 4 });
  const master = spy.mock.contexts.at(-1) as gsap.core.Timeline;
  const el = slides.sumo(ctx);
  const stage = document.createElement('div');
  const base = runTransition('ride', null, el, { stage, reduced: false }).duration() + playBeats(el, { reduced: false }).duration();
  expect(master.duration()).toBeGreaterThanOrEqual(base + 0.7 - 1e-6);
  spy.mockRestore();
});

test('going back shows the sign docked at once', () => {
  const s = story({ startAt: 4 });
  advance(100);
  tap(root, 10);
  tap(root, 10);
  expect(s.index).toBe(1);
  const sign = root.querySelector('.frame .sign')!;
  expect(sign.textContent).toContain('02');
  expect(sign.classList.contains('docked')).toBe(true);
});

/** A soundtrack that records what it was asked to play and lets the test end the song. */
const fakeSoundtrack = () => {
  let ended: (() => void) | undefined;
  const plays: (string | undefined)[] = [];
  return {
    plays,
    end: () => ended?.(),
    play: (u?: string) => void plays.push(u),
    onEnded: (cb: () => void) => void (ended = cb),
    pause() {}, resume() {}, stop() {}, unlock() {}, mute() {},
    muted: false, unlocked: true,
  };
};
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
const queue = ctx.stats!.topTracks!.map((t) => t.name);

test('when a preview ends the next song in the mix plays', async () => {
  const st = fakeSoundtrack();
  story({ startAt: 1, soundtrack: st, findPreview: async (_a, t) => `url-${t}` });
  await flush();
  expect(st.plays.at(-1)).toBe(`url-${queue[0]}`);
  st.end();
  await flush();
  expect(st.plays.at(-1)).toBe(`url-${queue[1]}`);
});

test('a song that has no preview is skipped, and an all-missing mix goes quiet', async () => {
  const st = fakeSoundtrack();
  story({ startAt: 1, soundtrack: st, findPreview: async (_a, t) => (t === queue[1] ? undefined : `url-${t}`) });
  await flush();
  st.end();
  await flush();
  expect(st.plays.at(-1)).toBe(`url-${queue[2]}`);

  const quiet = fakeSoundtrack();
  let lookups = 0;
  story({ startAt: 1, soundtrack: quiet, findPreview: async () => void lookups++ });
  await flush();
  const before = lookups;
  quiet.end();
  await flush();
  expect(lookups - before).toBeLessThanOrEqual(queue.length + 2);
  expect(quiet.plays.filter(Boolean)).toEqual([]);
});

test('a station song wins over a late mix lookup', async () => {
  const st = fakeSoundtrack();
  const pending: ((u: string) => void)[] = [];
  const s = story({ startAt: 1, soundtrack: st, findPreview: (_a, t) => new Promise((res) => pending.push(() => res(`url-${t}`))) });
  pending.shift()!('');
  await flush();
  st.end(); // mix lookup now pending
  const mixLookup = pending.shift()!;
  while (s.index < STATIONS.findIndex((x) => x.id === 'idol')) { s.next(); s.next(); }
  for (const p of pending.splice(0)) p('');
  mixLookup('');
  await flush();
  expect(st.plays.at(-1)).toBe(`url-${ctx.stats!.soundtrack!.topArtistTrack!.name}`);
});

test('without holdMs a card holds for its reading time', () => {
  const sumo = STATIONS.findIndex((x) => x.id === 'sumo');
  const dwell = (text: string) => {
    const withText: Record<string, Slide> = { ...slides, sumo: () => Object.assign(document.createElement('div'), { id: 'sumo', className: 'ph', innerHTML: `<b data-beat="1">${text}</b>` }) };
    const s = story({ slides: withText, startAt: sumo, holdMs: undefined });
    let t = 0;
    while (s.index === sumo && t < 30000) { advance(50); t += 50; }
    s.destroy();
    return t;
  };
  // 1 word holds 6 s (the floor); 21 words hold 3 + 0.25 × 21 = 8.25 s. Same arrival, so the dwells differ by the hold.
  expect(dwell('x') - 0).toBeGreaterThan(6000);
  expect(dwell(Array(21).fill('w').join(' ')) - dwell('x')).toBeCloseTo(2250, -2);
});

test('pausing mid-hold keeps the time left', () => {
  const sumo = STATIONS.findIndex((x) => x.id === 'sumo');
  const s = story({ startAt: sumo, holdMs: 3000 });
  advance(4000); // arrival done (under 2 s) and part of the 3 s hold gone
  s.pause();
  advance(10000);
  expect(s.index).toBe(sumo);
  s.resume();
  let t = 0;
  while (s.index === sumo && t < 5000) { advance(50); t += 50; }
  expect(t).toBeGreaterThan(0);
  expect(t).toBeLessThan(2900); // the remaining time, not a fresh 3 s
});

test('a card gets the idle class once its beats finish, never with reduced motion', () => {
  const sumo = STATIONS.findIndex((x) => x.id === 'sumo');
  story({ startAt: sumo });
  expect(root.querySelector('#sumo')!.classList.contains('idle')).toBe(false);
  advance(4000);
  expect(root.querySelector('#sumo')!.classList.contains('idle')).toBe(true);
  for (const s of stories) s.destroy();
  stories = [];
  root.replaceChildren();
  story({ startAt: sumo, reduced: true });
  advance(4000);
  expect(root.querySelector('#sumo')!.classList.contains('idle')).toBe(false);
});

test('the control buttons move, pause and resume the story and never count as a tap on the card', () => {
  const sumo = STATIONS.findIndex((x) => x.id === 'sumo');
  const s = story({ startAt: sumo });
  advance(5000);
  const btn = (label: string) => root.querySelector<HTMLButtonElement>(`.controls button[aria-label="${label}"]`)!;
  tap(btn('Next'));
  btn('Next').click();
  expect(s.index).toBe(STATIONS.findIndex((x) => x.id === 'idol'));
  btn('Pause').click();
  expect(root.querySelector('.frame .paused-stamp')).not.toBeNull();
  btn('Play').click();
  expect(root.querySelector('.frame .paused-stamp')).toBeNull();
});

const drag = (dx: number, dy: number, steps = 5, ms = 0) => {
  const at = (x: number, y: number, type: string) => root.dispatchEvent(new MouseEvent(type, { clientX: 500 + x, clientY: 400 + y, bubbles: true }));
  at(0, 0, 'pointerdown');
  for (let i = 1; i <= steps; i++) {
    if (ms) advance(ms / steps);
    at((dx * i) / steps, (dy * i) / steps, 'pointermove');
  }
  at(dx, dy, 'pointerup');
};

test('swipe left moves on, swipe right goes back, swipe down pauses', () => {
  const sumo = STATIONS.findIndex((x) => x.id === 'sumo');
  const s = story({ startAt: sumo });
  advance(5000);
  drag(-80, 0);
  expect(s.index).toBe(STATIONS.findIndex((x) => x.id === 'idol'));
  s.next(); // finish idol's arrival
  drag(80, 0);
  expect(s.index).toBe(sumo);
  drag(0, 80);
  expect(root.querySelector('.frame .paused-stamp')).not.toBeNull();
});

test('a slow 50 px drag is a swipe, not a hold-pause', () => {
  const sumo = STATIONS.findIndex((x) => x.id === 'sumo');
  const s = story({ startAt: sumo });
  advance(5000);
  drag(-50, 0, 5, 300);
  expect(s.index).toBe(STATIONS.findIndex((x) => x.id === 'idol'));
  expect(root.querySelector('.frame .paused-stamp')).toBeNull();
});

test('a 30 px drag is a tap, and the card springs back', () => {
  const sumo = STATIONS.findIndex((x) => x.id === 'sumo');
  const s = story({ startAt: sumo });
  advance(5000);
  drag(-30, 0);
  expect(s.index).toBe(STATIONS.findIndex((x) => x.id === 'idol')); // a tap on the right two-thirds moves on
  advance(1000);
  expect(Number(gsap.getProperty(root.querySelector('.stage')!, 'x'))).toBe(0);
});

test('the hint shows on the departure board and goes on the first tap', () => {
  localStorage.clear();
  story({ startAt: 0 });
  expect(root.querySelector('.hint')).not.toBeNull();
  tap(root.querySelector('.stage')!);
  expect(root.querySelector('.hint')).toBeNull();
});

test('arrival buzzes 20 ms and each stamp 10 ms; nothing when muted or reduced or skipped', () => {
  const stampy: Record<string, Slide> = { ...slides, sumo: () => Object.assign(document.createElement('div'), { id: 'sumo', className: 'ph', innerHTML: '<b data-beat="1" data-fx="stamp">a</b><b data-beat="2" data-fx="drop">b</b><b data-beat="3" data-fx="stamp" data-haptic="ssr">c</b>' }) };
  const sumo = STATIONS.findIndex((x) => x.id === 'sumo');
  const run = (o: Partial<Parameters<typeof createStory>[1]>, finishEarly = false) => {
    const buzzes: (number | number[])[] = [];
    const s = story({ slides: stampy, startAt: sumo, holdMs: 60000, makeHaptics: (h) => ({ buzz: (p) => void (h.canBuzz() && buzzes.push(p)) }), ...o });
    if (finishEarly) s.next();
    advance(6000);
    s.destroy();
    return buzzes;
  };
  const sound = { play() {}, pause() {}, resume() {}, stop() {}, unlock() {}, mute() {}, onEnded() {}, muted: false, unlocked: true };
  expect(run({ soundtrack: sound })).toEqual([20, 10, 10, [15, 40, 15]]);
  expect(run({ soundtrack: { ...sound, muted: true } })).toEqual([]);
  expect(run({ soundtrack: sound, reduced: true })).toEqual([]);
  expect(run({ soundtrack: sound }, true)).toEqual([]);
});
