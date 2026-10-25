import { expect, test } from 'vitest';
import { mixQueue } from '../../src/audio/mix';
import { STATS } from '../slides/fixture';

test('the mix is the top tracks, then the top artist and riser songs, without duplicates', () => {
  const riser = { name: 'Rise Up', artist: 'Newbie', minutes: 50 };
  const q = mixQueue({ ...STATS, soundtrack: { top: STATS.topTracks[0], topArtistTrack: STATS.topTracks[0], riserTrack: riser } });
  expect(q.map((t) => t.name)).toEqual([...STATS.topTracks.map((t) => t.name), 'Rise Up']);
});
