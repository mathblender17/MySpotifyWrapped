import { expect, test } from 'vitest';
import { fastestRiser } from '../../src/stats/riser';
import type { Play } from '../../src/types';
import { many } from './p';

const firstSeenOf = (plays: Play[], prior: Record<string, string> = {}) => {
  const m = new Map<string, Date>(Object.entries(prior).map(([a, d]) => [a, new Date(d)]));
  for (const p of plays) if (!m.has(p.artist) || p.ts < m.get(p.artist)!) m.set(p.artist, p.ts);
  return m;
};

// Five established artists with 11 plays each by Jan 11 (10 more later in spring), and a newcomer from Mar 1.
const established = ['A', 'B', 'C', 'D', 'E'];
const raceYear: Play[] = [
  ...established.flatMap((a) => [...many(11, '2025-01-01T12:00', a), ...many(10, '2025-04-01T12:00', a)]),
  ...many(20, '2025-03-01T12:00', 'New'),
  ...many(30, '2025-09-01T12:00', 'New'),
].sort((x, y) => x.ts.getTime() - y.ts.getTime());
const prior = Object.fromEntries(established.map((a) => [a, '2024-06-01T12:00']));

test('race: a newcomer who ties the 5th artist on day 10 entered the top 5 in 10 days', () => {
  expect(fastestRiser(raceYear, firstSeenOf(raceYear, prior), true)).toEqual({ artist: 'New', via: 'race', days: 10 });
});

test('without earlier years of data, "new this year" is unknowable so it falls back to halves', () => {
  expect(fastestRiser(raceYear, firstSeenOf(raceYear), false)).toEqual({ artist: 'New', via: 'halves', climb: 5 });
});

test('halves: ranked 8th in the first half and 1st in the second climbs 7', () => {
  const year = [
    ...['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7'].flatMap((a) => many(30, '2025-01-01T12:00', a)),
    ...many(1, '2025-03-01T12:00', 'Late'),
    ...many(25, '2025-08-01T12:00', 'Late'),
  ];
  expect(fastestRiser(year, firstSeenOf(year), false)).toEqual({ artist: 'Late', via: 'halves', climb: 7 });
});

test('nothing qualifies → undefined', () => {
  const year = [...many(5, '2025-01-01T12:00', 'A'), ...many(5, '2025-08-01T12:00', 'B')];
  expect(fastestRiser(year, firstSeenOf(year), false)).toBeUndefined();
});

test('a newcomer from the first days of the year does not "race" in 0 days', () => {
  const year = [
    ...established.flatMap((a) => many(30, '2025-02-01T12:00', a)),
    ...many(60, '2025-01-02T12:00', 'Jan'),
  ];
  expect(fastestRiser(year, firstSeenOf(year, prior), true)?.via).not.toBe('race');
});
