import { readFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { departure } from '../../src/slides/departure';
import { ctx } from './fixture';

const css = (w: string) => readFileSync(`src/slides/worlds/${w}.css`, 'utf8');

test('F departure: a platform sign with 出発 and the OS 01 number circle', () => {
  const el = departure(ctx());
  expect(el.textContent).toContain('出発');
  expect(el.querySelector('.os')!.textContent).toContain('01');
  expect(el.textContent).toContain('乗る年を選んでね');
});

test('F departure: year rows are still buttons that pick the year', () => {
  const onPickYear = vi.fn();
  const el = departure(ctx({ onPickYear }));
  const rows = el.querySelectorAll<HTMLButtonElement>('button.row');
  expect(rows).toHaveLength(2);
  rows[1].click();
  expect(onPickYear).toHaveBeenCalledWith(2024);
});

test('F departure: a huge play count stays on one line with an ellipsis', () => {
  const el = departure(ctx({ years: [{ year: 2025, plays: 123456789, eligible: true }] }));
  expect(el.querySelector('.row .pl')!.classList.contains('clip')).toBe(true);
  expect(css('f')).toMatch(/\.clip\s*{[^}]*white-space:\s*nowrap[^}]*text-overflow:\s*ellipsis/);
});
