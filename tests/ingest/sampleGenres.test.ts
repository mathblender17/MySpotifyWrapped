import { expect, test } from 'vitest';
import { makeDemoPlays } from '../../src/ingest/demo';
import { withSampleGenres } from '../../src/ingest/sampleGenres';
import { computeAllYears } from '../../src/stats';

test('every year gets five sample genre shares summing to 1, city pop on top', () => {
  const ds = computeAllYears(makeDemoPlays(), { lifetime: true });
  const out = withSampleGenres(ds);
  for (const s of out.stats.values()) {
    expect(s.genreShares).toHaveLength(5);
    expect(s.genreShares!.reduce((a, g) => a + g.share, 0)).toBeCloseTo(1);
    expect(s.topGenre).toBe('city pop');
  }
});

test('the input dataset is not changed', () => {
  const ds = computeAllYears(makeDemoPlays(), { lifetime: true });
  withSampleGenres(ds);
  for (const s of ds.stats.values()) expect(s.genreShares).toBeUndefined();
});
