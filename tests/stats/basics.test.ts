import { describe, expect, test } from 'vitest';
import { hasDurations, localDay, localYear, qualifying, topN, totals } from '../../src/stats/basics';
import { p } from './p';

test('qualifying keeps plays of 30s or more, and plays without a duration', () => {
  const plays = [p('2025-01-01T10:00', 'A', 'x', 29_999), p('2025-01-01T10:00', 'A', 'y', 30_000), p('2025-01-01T10:00', 'A', 'z', null)];
  expect(qualifying(plays).map((x) => x.track)).toEqual(['y', 'z']);
});

test('a UTC timestamp on New Year’s Eve lands in the local new year', () => {
  const d = new Date('2024-12-31T16:00:00Z');
  expect(localYear(d)).toBe(2025);
  expect(localDay(d)).toBe('2025-01-01');
});

describe('totals', () => {
  test('counts plays, rounded minutes and distinct local days', () => {
    const plays = [p('2025-01-01T09:00', 'A'), p('2025-01-01T21:00', 'A'), p('2025-01-02T09:00', 'B')];
    expect(totals(plays)).toEqual({ plays: 3, minutes: 3, daysListened: 2 });
  });

  test('minutes are undefined when any play lacks a duration', () => {
    const plays = [p('2025-01-01T09:00', 'A'), p('2025-01-02T09:00', 'B', 'Song', null)];
    expect(totals(plays).minutes).toBeUndefined();
    expect(hasDurations(plays)).toBe(false);
  });
});

describe('topN', () => {
  test('ranks artists by minutes when durations exist', () => {
    const plays = [p('2025-01-01T09:00', 'Many', 'a', 60_000), p('2025-01-01T09:05', 'Many', 'a', 60_000), p('2025-01-01T09:10', 'Long', 'b', 600_000)];
    expect(topN(plays, 'artist', 2)).toEqual([
      { name: 'Long', plays: 1, minutes: 10 },
      { name: 'Many', plays: 2, minutes: 2 },
    ]);
  });

  test('ranks by plays when durations are missing', () => {
    const plays = [p('2025-01-01T09:00', 'B', 'x', null), p('2025-01-01T09:01', 'B', 'x', null), p('2025-01-01T09:02', 'A', 'y', null)];
    expect(topN(plays, 'artist', 5).map((r) => r.name)).toEqual(['B', 'A']);
    expect(topN(plays, 'artist', 5)[0].minutes).toBeUndefined();
  });

  test('ties break by plays desc, then name asc — never input order', () => {
    const plays = [
      p('2025-01-01T09:00', 'Zed', 'z', 120_000),
      p('2025-01-01T09:01', 'Bee', 'b', 60_000), p('2025-01-01T09:02', 'Bee', 'b', 60_000),
      p('2025-01-01T09:03', 'Ace', 'a', 60_000), p('2025-01-01T09:04', 'Ace', 'a', 60_000),
    ];
    expect(topN(plays, 'artist', 3).map((r) => r.name)).toEqual(['Ace', 'Bee', 'Zed']);
  });

  test('tracks carry their artist and are grouped by trackKey', () => {
    const plays = [p('2025-01-01T09:00', 'A', 'Hit'), p('2025-01-02T09:00', 'A', 'Hit'), p('2025-01-02T10:00', 'B', 'Other')];
    expect(topN(plays, 'track', 1)).toEqual([{ name: 'Hit', artist: 'A', plays: 2, minutes: 2 }]);
  });
});
