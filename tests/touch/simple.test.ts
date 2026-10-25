import { expect, test } from 'vitest';
import { gsap } from 'gsap';
import { torii } from '../../src/slides/torii';
import { sumo } from '../../src/slides/sumo';
import { departure } from '../../src/slides/departure';
import { TOUCH } from '../../src/touch';
import type { TouchKit } from '../../src/touch/kit';
import { ctx, STATS } from '../slides/fixture';

const fake = (stats = STATS) => {
  const log = { busy: 0, release: 0, don: 0, buzz: [] as unknown[], marked: [] as Element[] };
  const kit = {
    stats, reduced: false,
    busy: () => { log.busy++; return () => { log.release++; }; },
    playTrack: async () => true,
    sfx: { don: () => { log.don++; } },
    buzz: (p: unknown) => { log.buzz.push(p); },
    mark: (e: Element) => { log.marked.push(e); },
    dur: (s: number) => s,
  } as unknown as TouchKit;
  return { kit, log };
};
const run = (ms: number) => { const g = gsap.globalTimeline; for (let t = 0; t < ms; t += 50) g.totalTime(g.totalTime() + 0.05); };

test('torii: tapping the number recounts it and flips the band between minutes and hours', () => {
  const el = torii(ctx());
  const { kit, log } = fake();
  TOUCH.torii!(el, kit);
  const hero = el.querySelector<HTMLElement>('.hero')!;
  const band = el.querySelector<HTMLElement>('.band')!;
  const orig = band.innerHTML;
  expect(log.marked).toEqual([hero]);
  hero.click();
  run(2000);
  expect(hero.textContent).toBe('341');
  expect(band.textContent).toBe('471 hours');
  hero.click();
  expect(band.innerHTML).toBe(orig);
});

test('torii: no minutes → the band never flips', () => {
  const stats = { ...STATS, minutes: undefined } as never;
  const el = torii(ctx({ stats }));
  const band = el.querySelector<HTMLElement>('.band')!;
  const orig = band.innerHTML;
  TOUCH.torii!(el, fake(stats).kit);
  el.querySelector<HTMLElement>('.hero')!.click();
  run(2000);
  expect(band.innerHTML).toBe(orig);
});

test("sumo: tapping a rank panel zooms it with that artist's minutes and a ドン; tapping again closes it", () => {
  const el = sumo(ctx());
  const { kit, log } = fake();
  TOUCH.sumo!(el, kit);
  const pa = el.querySelector<HTMLElement>('.pa')!;
  const pb = el.querySelector<HTMLElement>('.pb')!;
  expect(log.marked).toEqual([pa, pb]);
  pa.click();
  expect(pa.classList.contains('zoom')).toBe(true);
  expect(pa.querySelector('.mins')!.textContent).toBe('2,542 min');
  expect(log.don).toBe(1);
  expect(log.buzz).toContain(10);
  expect([log.busy, log.release]).toEqual([1, 0]);
  pb.click();
  expect(pa.classList.contains('zoom')).toBe(false);
  expect(pb.querySelector('.mins')!.textContent).toBe('1,870 min');
  expect([log.busy, log.release]).toEqual([2, 1]);
  pb.click();
  expect(pb.classList.contains('zoom')).toBe(false);
  expect([log.busy, log.release]).toEqual([2, 2]);
});

test('departure: pressing an eligible year buzzes', () => {
  const el = departure(ctx());
  const { kit, log } = fake();
  TOUCH.departure!(el, kit);
  el.querySelector('button.row')!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  el.querySelector('.row.off')!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  expect(log.buzz).toEqual([10]);
  expect(log.marked).toEqual([]);
});

test('sumo: reduced motion zooms with no transition', () => {
  const el = sumo(ctx());
  const { kit } = fake();
  TOUCH.sumo!(el, { ...kit, reduced: true } as TouchKit);
  const pa = el.querySelector<HTMLElement>('.pa')!;
  pa.click();
  expect(pa.classList.contains('zoom')).toBe(true);
  expect(pa.style.transition).toBe('none');
});

test('sumo: an artist with neither minutes nor plays gets no mark and no badge', () => {
  const stats = { ...STATS, topArtists: STATS.topArtists.map((a, i) => (i === 1 ? { name: a.name } : a)) } as never;
  const el = sumo(ctx({ stats }));
  const { kit, log } = fake(stats);
  TOUCH.sumo!(el, kit);
  const pa = el.querySelector<HTMLElement>('.pa')!;
  expect(pa.querySelector('.mins')).toBeNull();
  expect(log.marked).toEqual([el.querySelector('.pb')]);
  pa.click();
  expect(pa.classList.contains('zoom')).toBe(false);
});
