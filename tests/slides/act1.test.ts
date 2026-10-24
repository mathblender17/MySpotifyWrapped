import { expect, test, vi } from 'vitest';
import { departure } from '../../src/slides/departure';
import { torii } from '../../src/slides/torii';
import { bento } from '../../src/slides/bento';
import { ganguro } from '../../src/slides/ganguro';
import { ctx, hasPink, STATS } from './fixture';

test('departure board: a button per eligible year, greyed rows for thin years', () => {
  const onPickYear = vi.fn();
  const el = departure(ctx({ onPickYear }));
  const buttons = [...el.querySelectorAll('button')];
  expect(buttons.map((b) => b.textContent)).toEqual([expect.stringContaining('2025'), expect.stringContaining('2024')]);
  expect(buttons[0].textContent).toContain('8,406');
  expect(el.textContent).toContain('2019');
  expect(el.querySelector('.off')!.textContent).toContain('12');
  buttons[0].click();
  expect(onPickYear).toHaveBeenCalledWith(2025);
});

test('torii: days listened and minutes', () => {
  const t = torii(ctx()).textContent!;
  expect(t).toContain('341');
  expect(t).toContain('28,243');
});

test('torii: falls back to plays when minutes are unknown', () => {
  const t = torii(ctx({ stats: { ...STATS, minutes: undefined } })).textContent!;
  expect(t).toContain('8,406 plays');
});

test('bento: top genres as percentages', () => {
  const t = bento(ctx()).textContent!;
  expect(t).toContain('CITY POP');
  expect(t).toContain('42%');
});

test('ganguro: top genre, loud', () => {
  expect(ganguro(ctx()).textContent).toContain('CITY POP');
});

test('every act-1 slide carries gyaru pink', () => {
  for (const s of [departure, torii, bento, ganguro]) expect(hasPink(s(ctx()))).toBe(true);
});
