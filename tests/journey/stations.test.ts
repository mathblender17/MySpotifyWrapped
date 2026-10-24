import { expect, test } from 'vitest';
import { isPlayable, STATIONS } from '../../src/journey/stations';
import { makeDemoPlays } from '../../src/ingest/demo';
import { computeAllYears } from '../../src/stats';
import type { YearStats } from '../../src/types';

// A full object typed Required<YearStats>: renaming a field breaks compilation here, and its keys are the valid needs.
const FULL: Required<YearStats> = {
  year: 0, plays: 0, minutes: 0, daysListened: 0, topArtists: [], topTracks: [], topArtistShare: 0,
  seasons: {} as Required<YearStats>['seasons'], weekly: [], peakWeek: { start: '', value: 0 },
  fastestRiser: { artist: '', via: 'race' }, genreShares: [], topGenre: '', traits: {},
  personality: { id: 'balanced', name: '', jp: '', line: '' }, fortune: { jp: '吉', en: '' }, kanji: { kanji: '', meaning: '' },
  soundtrack: {},
};

test('13 stations in order', () => {
  expect(STATIONS.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  expect(STATIONS.map((s) => s.id)).toEqual(['departure', 'torii', 'bento', 'ganguro', 'sumo', 'idol', 'konbini', 'gacha', 'weather', 'fuji', 'shinkansen', 'omikuji', 'kanji']);
});

test('every need is a real YearStats field', () => {
  const keys = Object.keys(FULL);
  for (const s of STATIONS) for (const n of s.needs) expect(keys).toContain(n);
});

test('acts follow the storyboard', () => {
  expect(STATIONS.map((s) => s.act)).toEqual([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4]);
});

test('with demo data, only the genre stations pass through in Phase 1', () => {
  const stats = computeAllYears(makeDemoPlays(), { lifetime: true }).stats.get(2025)!;
  expect(STATIONS.filter((s) => !isPlayable(s, stats)).map((s) => s.id)).toEqual(['bento', 'ganguro']);
});

test('empty arrays and missing stats do not count as present', () => {
  const sumo = STATIONS.find((s) => s.id === 'sumo')!;
  expect(isPlayable(sumo, { year: 2025, topArtists: [] })).toBe(false);
  expect(isPlayable(sumo, undefined)).toBe(false);
  expect(isPlayable(STATIONS[0], undefined)).toBe(true);
});

test('every station declares its art world and a #rrggbb accent', () => {
  for (const s of STATIONS) {
    expect(['F', 'C', 'J', 'G', 'D', 'Q', 'B', 'K', 'O', 'I', 'L']).toContain(s.world);
    expect(s.accent).toMatch(/^#[0-9a-f]{6}$/);
  }
  expect(STATIONS[0]).toMatchObject({ world: 'F', accent: '#00a7db' });
  expect(STATIONS[7]).toMatchObject({ world: 'K', accent: '#ffe36b' });
  expect(STATIONS.map((s) => s.world).join('')).toBe('FCJGDQBKOILIC');
});
