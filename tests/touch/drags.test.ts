import { expect, test } from 'vitest';
import { gsap } from 'gsap';
import { weather as weatherSlide } from '../../src/slides/weather';
import { fuji as fujiSlide } from '../../src/slides/fuji';
import { playBeats } from '../../src/journey/beats';
import { TOUCH } from '../../src/touch';
import type { TouchKit } from '../../src/touch/kit';
import { ctx, STATS } from '../slides/fixture';

const fake = (stats = STATS as never) => {
  const log = { busy: 0, release: 0, marked: [] as Element[] };
  const kit = {
    stats, reduced: false,
    busy: () => { log.busy++; return () => { log.release++; }; },
    mark: (e: Element) => { log.marked.push(e); }, dur: (s: number) => s, onLeave: () => {},
  } as unknown as TouchKit;
  return { kit, log };
};
/** Stub layout: the slide is 210 design px wide at scale k, at the screen origin. */
const layout = (el: HTMLElement, k = 1) => { el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 210 * k, height: 373 * k, right: 210 * k, bottom: 373 * k, x: 0, y: 0, toJSON() {} }); };
const ptr = (el: Element, type: string, x = 0, y = 0) => el.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), { clientX: x, clientY: y, pointerId: 1 }));

test('forecast: dragging the sun snaps to the nearest season and shows its value', () => {
  for (const k of [1, 2]) {
    const el = weatherSlide(ctx());
    const { kit, log } = fake();
    layout(el, k);
    TOUCH.weather!(el, kit);
    const sun = el.querySelector<HTMLElement>('.sun')!;
    expect(log.marked).toEqual([sun]);
    const cells = [...el.querySelectorAll('.ss')];
    // Finger centred on the autumn point (88,52): sun top-left is 50 less.
    ptr(sun, 'pointerdown', (88 + 50) * k, (52 + 50) * k);
    ptr(sun, 'pointermove', (90 + 50) * k, (60 + 50) * k);
    expect(el.querySelectorAll('.ss.on')).toHaveLength(1);
    expect(cells[2].classList.contains('on')).toBe(true);
    expect(cells[2].querySelector('.val')!.textContent).toBe('6,500 min');
    // Dragging on to winter re-uses the one .val per cell.
    ptr(sun, 'pointermove', (94 + 50) * k, (118 + 50) * k);
    ptr(sun, 'pointerup');
    expect(cells[3].classList.contains('on')).toBe(true);
    expect(cells[2].classList.contains('on')).toBe(false);
    expect(el.querySelectorAll('.val')).toHaveLength(4);
    expect(cells[3].querySelector('.val')!.textContent).toBe('6,700 min');
    gsap.globalTimeline.totalTime(gsap.globalTimeline.totalTime() + 1);
    expect([gsap.getProperty(sun, 'x'), gsap.getProperty(sun, 'y')]).toEqual([94, 118]);
  }
});

test('forecast: release resumes the hold', () => {
  const el = weatherSlide(ctx());
  const { kit, log } = fake();
  TOUCH.weather!(el, kit);
  const sun = el.querySelector<HTMLElement>('.sun')!;
  ptr(sun, 'pointerdown', 100, 100);
  expect(log.busy).toBe(1);
  expect(log.release).toBe(0);
  ptr(sun, 'pointerup');
  ptr(sun, 'pointercancel');
  expect(log.release).toBe(1);
});

test('forecast: a drag during the arrival orbit is not pulled back by it', () => {
  const el = weatherSlide(ctx());
  const { kit } = fake();
  layout(el);
  const tl = playBeats(el);
  TOUCH.weather!(el, kit);
  const sun = el.querySelector<HTMLElement>('.sun')!;
  tl.totalTime(1.3);
  ptr(sun, 'pointerdown', 138, 102);
  ptr(sun, 'pointerup');
  gsap.globalTimeline.totalTime(gsap.globalTimeline.totalTime() + 1);
  tl.totalTime(tl.duration());
  expect([gsap.getProperty(sun, 'x'), gsap.getProperty(sun, 'y')]).toEqual([88, 52]);
  expect(el.querySelector('.ss.on')).toBe(el.querySelectorAll('.ss')[2]);
  expect(gsap.getProperty(sun, 'opacity')).toBe(1);
});

test('forecast: a new drag right after a release is not overwritten by the snap', () => {
  const el = weatherSlide(ctx());
  const { kit } = fake();
  layout(el);
  TOUCH.weather!(el, kit);
  const sun = el.querySelector<HTMLElement>('.sun')!;
  ptr(sun, 'pointerdown', 138, 102);
  ptr(sun, 'pointerup');
  ptr(sun, 'pointerdown', 60, 80);
  ptr(sun, 'pointermove', 90, 90);
  gsap.globalTimeline.totalTime(gsap.globalTimeline.totalTime() + 1);
  expect([gsap.getProperty(sun, 'x'), gsap.getProperty(sun, 'y')]).toEqual([40, 40]);
  ptr(sun, 'pointerup');
});

test('forecast: no seasons → no mark', () => {
  const { kit, log } = fake({ ...STATS, seasons: undefined } as never);
  TOUCH.weather!(weatherSlide(ctx()), kit);
  expect(log.marked).toEqual([]);
});

test('fuji: dragging maps x to the right week and shows its value', () => {
  for (const k of [1, 2]) {
    const el = fujiSlide(ctx());
    const { kit, log } = fake();
    layout(el, k);
    TOUCH.fuji!(el, kit);
    const svg = el.querySelector('svg')!;
    expect(log.marked).toEqual([svg]);
    expect(el.querySelector('.marker')).toBeNull();
    // 3 weeks → step 89: week 1 sits at design x 105.
    ptr(svg, 'pointerdown', 100 * k, 150 * k);
    const m = el.querySelector<HTMLElement>('.marker')!;
    expect(m.style.left).toBe('105px');
    expect(m.textContent).toBe('week of Mar 10 · 1,411 min');
    ptr(svg, 'pointermove', 500 * k, 150 * k);
    expect(m.style.left).toBe('194px');
    expect(m.textContent).toBe('week of Mar 17 · 600 min');
    ptr(svg, 'pointermove', -50 * k, 150 * k);
    ptr(svg, 'pointerup');
    expect(m.textContent).toBe('week of Mar 3 · 500 min');
    expect(el.querySelectorAll('.marker')).toHaveLength(1);
    expect(el.querySelector('.seal')).not.toBeNull();
    expect([log.busy, log.release]).toEqual([1, 1]);
  }
});

test('fuji: one week → no mark', () => {
  const { kit, log } = fake({ ...STATS, weekly: STATS.weekly.slice(0, 1) } as never);
  TOUCH.fuji!(fujiSlide(ctx()), kit);
  expect(log.marked).toEqual([]);
});
