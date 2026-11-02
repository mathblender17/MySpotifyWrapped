import { expect, test } from 'vitest';
import { HOOKS } from '../../src/journey/hooks';
import { lineFor } from '../../src/story/conductor';
import type { YearStats } from '../../src/types';

const stats = (twists: YearStats['twists']): YearStats => ({ year: 2024, twists });

test('with no twists every station keeps its written hook', () => {
  expect(lineFor('torii', stats([]))).toEqual(HOOKS.torii);
  expect(lineFor('torii', undefined)).toEqual(HOOKS.torii);
});

test('the streak is told at the torii with the real day count', () => {
  const l = lineFor('torii', stats([{ kind: 'streak', days: 23 }]));
  expect(l.jp).toContain('23');
  expect(l.en).toContain('23 days in a row');
});

test('the obsession day is told at Fuji with the artist, date and plays', () => {
  const l = lineFor('fuji', stats([{ kind: 'obsession', artist: 'Yoasobi', day: '2024-05-05', plays: 12 }]));
  expect(l.en).toContain('Yoasobi');
  expect(l.en).toContain('12');
  expect(l.en).toContain('May 5');
});

test('a comeback is told at the idol station in whole months', () => {
  const l = lineFor('idol', stats([{ kind: 'comeback', artist: 'Utada', awayDays: 800, plays: 30 }]));
  expect(l.en).toContain('Utada');
  expect(l.en).toContain('26 months');
});

test('a twist only speaks at its own station', () => {
  expect(lineFor('sumo', stats([{ kind: 'streak', days: 23 }]))).toEqual(HOOKS.sumo);
});

test('an unknown station falls back to nothing instead of throwing', () => {
  expect(lineFor('nope', stats([]))).toBeUndefined();
});
