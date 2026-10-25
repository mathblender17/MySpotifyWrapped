import { expect, test } from 'vitest';
import { decodeMyRide } from '../../src/ingest/myride';

test('decodeMyRide turns the compact file back into plays', () => {
  const plays = decodeMyRide({ v: 1, artists: ['Aoi Kaze'], tracks: [[0, 'Neon Rain']], plays: [[1735660800, 0, 185000, 1]] });
  expect(plays).toEqual([
    { ts: new Date('2024-12-31T16:00:00Z'), track: 'Neon Rain', artist: 'Aoi Kaze', msPlayed: 185000, skipped: true, trackKey: 't0' },
  ]);
});
