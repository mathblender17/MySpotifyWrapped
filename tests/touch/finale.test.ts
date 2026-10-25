import { expect, test } from 'vitest';
import { gsap } from 'gsap';
import { bento } from '../../src/slides/bento';
import { TOUCH } from '../../src/touch';
import type { TouchKit } from '../../src/touch/kit';
import { createTicket } from '../../src/story/ticket';
import { STATIONS } from '../../src/journey/stations';
import { ctx, STATS } from '../slides/fixture';

const fake = (stats = STATS, reduced = false) => {
  const log = { busy: 0, release: 0, marked: [] as Element[], left: [] as (() => void)[] };
  const ticket = createTicket(STATIONS, STATIONS.map(() => true), reduced);
  const kit = {
    stats, reduced, ticket,
    busy: () => { log.busy++; return () => { log.release++; }; },
    sfx: {}, buzz: () => {}, mark: (e: Element) => { log.marked.push(e); }, dur: (s: number) => (reduced ? 0 : s),
    onLeave: (fn: () => void) => void log.left.push(fn),
  } as unknown as TouchKit;
  return { kit, log };
};

test('bento: each tap lifts the next row and shows its share', () => {
  const el = bento(ctx());
  const { kit, log } = fake();
  TOUCH.bento!(el, kit);
  const box = el.querySelector<HTMLElement>('.box')!;
  expect(log.marked).toEqual([box]);
  const rows = [...el.querySelectorAll<HTMLElement>('.row')];
  for (let i = 0; i < rows.length + 1; i++) {
    box.click();
    const k = i % rows.length;
    expect(el.querySelectorAll('.row.lift')).toHaveLength(1);
    expect(rows[k].classList.contains('lift')).toBe(true);
    const bar = rows[k].querySelector<HTMLElement>('.bar i')!;
    expect(bar.dataset.pct).toBe(bar.style.width); // the row's own share
    expect(bar.dataset.pct).toMatch(/^\d+%$/);
  }
});

test("bento: no genres → the card is today's pass-through (no mark, no throw)", () => {
  const { kit, log } = fake();
  const el = document.createElement('div');
  el.innerHTML = '<div class="box"></div>';
  expect(() => TOUCH.bento!(el, kit)).not.toThrow();
  expect(() => TOUCH.bento!(document.createElement('div'), kit)).not.toThrow();
  expect(log.marked).toEqual([]);
});

test('kanji: tapping the ticket flips it to the ride date and stamp count, and back', () => {
  const { kit, log } = fake();
  kit.ticket.el.querySelectorAll('.slot').forEach((s, i) => i < 4 && s.classList.add('on'));
  TOUCH.kanji!(document.createElement('div'), kit);
  expect(log.marked).toEqual([kit.ticket.el]);
  kit.ticket.el.click();
  expect(kit.ticket.el.classList.contains('flipped')).toBe(true);
  const back = kit.ticket.el.querySelector('.back')!;
  expect(back.textContent).toContain(new Date().toLocaleDateString());
  expect(back.textContent).toContain('4 / 13');
  expect(log.busy).toBe(1);
  gsap.globalTimeline.totalTime(gsap.globalTimeline.totalTime() + 1);
  expect(log.release).toBe(1);
  kit.ticket.el.click();
  expect(kit.ticket.el.classList.contains('flipped')).toBe(false);
});

test('kanji: reduced motion flips and releases at once; leaving undoes the ticket', () => {
  const { kit, log } = fake(STATS, true);
  TOUCH.kanji!(document.createElement('div'), kit);
  kit.ticket.el.click();
  expect(kit.ticket.el.classList.contains('flipped')).toBe(true);
  expect(log.release).toBe(1);
  expect(kit.ticket.el.style.getPropertyValue('--flip')).toBe('0s');
  log.left.forEach((f) => f());
  expect(kit.ticket.el.classList.contains('flipped')).toBe(false);
});
