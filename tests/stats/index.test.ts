import { expect, test } from 'vitest';
import { makeDemoPlays } from '../../src/ingest/demo';
import { computeAllYears } from '../../src/stats';
import { many } from './p';

const demo = computeAllYears(makeDemoPlays(), { lifetime: true });

test('lists every year newest first with eligibility', () => {
  expect(demo.years.map((y) => [y.year, y.eligible])).toEqual([[2025, true], [2024, true]]);
});

test('the demo reads like a real person: varied names, seasons with different favorites', () => {
  const s = demo.stats.get(2025)!;
  expect(new Set(s.topArtists!.map((a) => a.name.split(' ')[1])).size).toBeGreaterThanOrEqual(3);
  expect(new Set(Object.values(s.seasons!).map((x) => x.topArtist!.name)).size).toBeGreaterThanOrEqual(3);
  expect(s.traits!.skipRate).toBeGreaterThan(0);
});

test('the planted riser wins the race in 2025', () => {
  expect(demo.stats.get(2025)!.fastestRiser).toMatchObject({ artist: 'Hoshino Rei', via: 'race' });
});

test('the first year of data has no novelty (nothing earlier to compare with)', () => {
  expect(demo.stats.get(2024)!.traits!.novelty).toBeUndefined();
  expect(demo.stats.get(2025)!.traits!.novelty).toBeGreaterThan(0);
});

test('fills the full YearStats for an eligible year', () => {
  const s = demo.stats.get(2025)!;
  expect(s.topArtists).toHaveLength(5);
  expect(s.topTracks).toHaveLength(5);
  expect(s.topArtistShare).toBeGreaterThan(0);
  expect(s.minutes).toBeGreaterThan(0);
  expect(s.peakWeek!.start.startsWith('2025-03')).toBe(true); // the demo's planted hot week
  expect(s.personality).toBeDefined();
  expect(s.fortune).toBeDefined();
  expect(s.kanji).toBeDefined();
  expect(s.genreShares).toBeUndefined(); // Phase 3
});

test('skip rate counts the short skipped plays that the 30s rule filters out', () => {
  const ds = computeAllYears([
    ...many(60, '2025-01-01T12:00', 'A').map((p) => ({ ...p, skipped: false })),
    ...many(20, '2025-01-01T13:00', 'A', 'x', 8_000).map((p) => ({ ...p, skipped: true })),
  ]);
  expect(ds.stats.get(2025)!.traits!.skipRate).toBeCloseTo(0.25);
});

test('only qualifying plays count toward eligibility', () => {
  const ds = computeAllYears([...many(40, '2025-01-01T12:00', 'A'), ...many(30, '2025-03-01T12:00', 'B', 'x', 10_000)]);
  expect(ds.years).toEqual([{ year: 2025, plays: 40, eligible: false }]);
  expect(ds.stats.size).toBe(0);
});

test('a few months of earlier data is not enough to call artists "new this year"', () => {
  // Account-style export: Oct 2025 → Jun 2026. Old favourite 'A' simply wasn't played in Oct–Dec.
  const ds = computeAllYears([...many(60, '2025-10-01T12:00', 'B'), ...many(80, '2026-01-05T12:00', 'A'), ...many(40, '2026-01-05T13:00', 'B')]);
  expect(ds.stats.get(2026)!.traits!.novelty).toBeUndefined();
  expect(ds.stats.get(2026)!.fastestRiser?.via).not.toBe('race');
});

test('soundtrack picks: #1 song, the #1 artist’s song, the riser’s song', () => {
  const s = demo.stats.get(2025)!;
  expect(s.soundtrack!.top).toEqual(s.topTracks![0]);
  expect(s.soundtrack!.topArtistTrack!.artist).toBe(s.topArtists![0].name);
  expect(s.soundtrack!.riserTrack!.artist).toBe('Hoshino Rei');
});
