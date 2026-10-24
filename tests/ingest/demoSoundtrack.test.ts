import { expect, test } from 'vitest';
import { DEMO_SOUNDTRACK, withDemoSoundtrack } from '../../src/ingest/demoSoundtrack';
import { makeDemoPlays } from '../../src/ingest/demo';
import { computeAllYears } from '../../src/stats';
import { slides } from '../../src/slides';

const ds = withDemoSoundtrack(computeAllYears(makeDemoPlays(), { lifetime: true }));

test('every demo year rides with the curated soundtrack', () => {
  for (const s of ds.stats.values()) expect(s.soundtrack).toEqual(DEMO_SOUNDTRACK);
});

test('the soundtrack is background music only: no slide presents it as a stat', () => {
  const stats = ds.stats.get(2025)!;
  const text = Object.values(slides)
    .map((s) => {
      try {
        return s({ stats, years: ds.years, onPickYear: () => {} }).textContent ?? '';
      } catch {
        return ''; // genre slides need Phase-3 data
      }
    })
    .join(' ');
  for (const song of Object.values(DEMO_SOUNDTRACK)) expect(text).not.toContain(song.name);
});

test('the demo’s own (fictional) top song is untouched', () => {
  const s = ds.stats.get(2025)!;
  expect(s.topTracks![0].artist).not.toBe(DEMO_SOUNDTRACK.top.artist);
});
