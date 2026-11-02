import { expect, test } from 'vitest';
import { computeTwists } from '../../src/stats/twists';
import type { Play } from '../../src/types';

const play = (day: string, artist = 'A', hour = 12): Play => ({
  ts: new Date(`${day}T${String(hour).padStart(2, '0')}:00:00`),
  track: 't',
  artist,
  trackKey: `${artist}-t`,
  msPlayed: 200_000,
});
const days = (from: string, n: number, artist = 'A') =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(`${from}T12:00:00`);
    d.setDate(d.getDate() + i);
    return play(d.toISOString().slice(0, 10), artist);
  });

test('a run of 7 or more days in a row is a streak, the longest one wins', () => {
  const ps = [...days('2024-03-01', 7), ...days('2024-06-01', 10)];
  expect(computeTwists(ps)).toContainEqual({ kind: 'streak', days: 10 });
});

test('a run shorter than 7 days is no twist', () => {
  expect(computeTwists(days('2024-03-01', 6)).some((t) => t.kind === 'streak')).toBe(false);
});

test('ten plays of one artist in a single day is an obsession day', () => {
  const ps = Array.from({ length: 12 }, (_, i) => play('2024-05-05', 'Yoasobi', 8 + (i % 10)));
  expect(computeTwists(ps)).toContainEqual({ kind: 'obsession', artist: 'Yoasobi', day: '2024-05-05', plays: 12 });
});

test('nine plays in a day is not an obsession', () => {
  const ps = Array.from({ length: 9 }, () => play('2024-05-05', 'Yoasobi'));
  expect(computeTwists(ps).some((t) => t.kind === 'obsession')).toBe(false);
});

test('an artist back after a year away is a comeback, only when earlier history is given', () => {
  const ps = days('2024-04-01', 10, 'Utada');
  const before = [play('2022-01-10', 'Utada')];
  const t = computeTwists(ps, before).find((x) => x.kind === 'comeback');
  expect(t).toMatchObject({ kind: 'comeback', artist: 'Utada', plays: 10 });
  expect((t as { awayDays: number }).awayDays).toBeGreaterThan(365);
  expect(computeTwists(ps).some((x) => x.kind === 'comeback')).toBe(false);
});

test('an artist heard six months ago is not a comeback', () => {
  expect(computeTwists(days('2024-04-01', 10, 'Utada'), [play('2023-10-10', 'Utada')]).some((x) => x.kind === 'comeback')).toBe(false);
});

test('no plays, no twists', () => {
  expect(computeTwists([])).toEqual([]);
});

test('computeAllYears adds twists: a streak always, a comeback only with lifetime history', async () => {
  const { computeAllYears } = await import('../../src/stats');
  const ps = [...days('2022-01-10', 1, 'Utada'), ...days('2024-01-01', 60, 'Utada'), ...days('2024-03-05', 5, 'B')];
  const filler = days('2024-06-01', 60, 'Z');
  const lifetime = computeAllYears([...ps, ...filler], { lifetime: true }).stats.get(2024)!;
  expect(lifetime.twists?.some((t) => t.kind === 'streak')).toBe(true);
  expect(lifetime.twists?.some((t) => t.kind === 'comeback')).toBe(true);
});
