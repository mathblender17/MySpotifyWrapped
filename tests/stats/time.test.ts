import { describe, expect, test } from 'vitest';
import { peakWeek, seasonOf, seasons, weekly } from '../../src/stats/time';
import { p } from './p';

test.each([
  [1, 'winter'], [2, 'winter'], [3, 'spring'], [5, 'spring'], [6, 'summer'],
  [8, 'summer'], [9, 'autumn'], [11, 'autumn'], [12, 'winter'],
])('local month %i is %s', (month, season) => {
  expect(seasonOf(new Date(2025, month - 1, 15))).toBe(season);
});

describe('seasons', () => {
  const s = seasons([
    p('2025-04-01T10:00', 'Spring Star', 'Bloom', 120_000),
    p('2025-04-02T10:00', 'Other', 'x', 60_000),
    p('2025-07-01T10:00', 'Summer Star', 'Heat', 60_000),
  ]);

  test('each season has its value and top track/artist', () => {
    expect(s.spring.value).toBe(3);
    expect(s.spring.topArtist?.name).toBe('Spring Star');
    expect(s.spring.topTrack?.name).toBe('Bloom');
    expect(s.summer.topArtist?.name).toBe('Summer Star');
  });

  test('a season with no plays is just zero', () => {
    expect(s.autumn).toEqual({ value: 0 });
    expect(s.winter).toEqual({ value: 0 });
  });
});

describe('weekly', () => {
  test('keys a Wednesday to its Monday and fills empty weeks with zero', () => {
    const w = weekly([p('2025-03-05T10:00', 'A'), p('2025-03-19T10:00', 'A'), p('2025-03-20T10:00', 'A')]);
    expect(w).toEqual([
      { start: '2025-03-03', value: 1 },
      { start: '2025-03-10', value: 0 },
      { start: '2025-03-17', value: 2 },
    ]);
  });

  test('a Sunday belongs to the week that started the Monday before', () => {
    expect(weekly([p('2025-03-09T23:00', 'A')])[0].start).toBe('2025-03-03');
  });
});

describe('peakWeek', () => {
  test('returns the highest week, earliest wins ties', () => {
    expect(peakWeek([{ start: 'a', value: 2 }, { start: 'b', value: 5 }, { start: 'c', value: 5 }])).toEqual({ start: 'b', value: 5 });
  });

  test('is undefined for no weeks', () => {
    expect(peakWeek([])).toBeUndefined();
  });
});
