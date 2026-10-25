import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { slides } from '../../src/slides';
import { slide } from '../../src/slides/fmt';
import { ctx } from './fixture';

test('every slide carries the shared print grain', () => {
  for (const [id, s] of Object.entries(slides)) expect(s(ctx()).classList.contains('grain'), id).toBe(true);
});

test('dark slides get the screen-blended grain', () => {
  const el = slide('x', '', { dark: true });
  expect(el.classList.contains('grain')).toBe(true);
  expect(el.classList.contains('dark')).toBe(true);
  expect(slide('x', '').classList.contains('dark')).toBe(false);
});

test('tokens define the palette core and line colour', () => {
  const css = readFileSync('src/style/tokens.css', 'utf8').toLowerCase();
  for (const hex of ['#f4efe6', '#111111', '#e60012', '#ff2d95', '#00a7db']) expect(css).toContain(hex);
});
