import { expect, test } from 'vitest';
import { makeDemoPlays } from '../../src/ingest/demo';

const plays = makeDemoPlays();
const inYear = (y: number) => plays.filter((p) => p.ts.getFullYear() === y);

test('is deterministic', () => {
  expect(makeDemoPlays()).toEqual(plays);
});

test('2025 has a realistic volume of plays', () => {
  expect(inYear(2025).length).toBeGreaterThanOrEqual(8000);
  expect(inYear(2025).length).toBeLessThanOrEqual(10000);
});

test('the planted riser has no play before 2025-05-03 local', () => {
  const rei = plays.filter((p) => p.artist === 'Hoshino Rei');
  expect(rei.length).toBeGreaterThan(0);
  expect(rei.every((p) => p.ts >= new Date(2025, 4, 3))).toBe(true);
});

test('both years have enough qualifying plays and every play has a duration', () => {
  for (const y of [2024, 2025]) expect(inYear(y).filter((p) => p.msPlayed! >= 30000).length).toBeGreaterThanOrEqual(50);
  expect(plays.every((p) => typeof p.msPlayed === 'number')).toBe(true);
});
