import { describe, expect, test } from 'vitest';
import extended from '../../fixtures/extended.json';
import account from '../../fixtures/account.json';
import { detect } from '../../src/ingest/detect';
import { parseExtended } from '../../src/ingest/extended';
import { parseAccount } from '../../src/ingest/account';

describe('parseExtended', () => {
  const plays = parseExtended(extended);

  test('drops podcast rows but keeps short plays (filtering is a stats concern)', () => {
    expect(plays).toHaveLength(5);
    expect(plays.some((p) => p.msPlayed === 12000)).toBe(true);
  });

  test('uses the track URI as trackKey and parses ts as UTC', () => {
    expect(plays[0].trackKey).toBe('spotify:track:aaa');
    expect(plays[0].ts.getTime()).toBe(new Date('2024-12-31T16:00:00Z').getTime());
    expect(plays[0]).toMatchObject({ track: 'Neon Rain', artist: 'Aoi Kaze', album: 'Shibuya', msPlayed: 185000, skipped: false });
  });

  test('never throws on junk rows', () => {
    expect(parseExtended([null, 42, { ts: 'nope', master_metadata_track_name: 'x', master_metadata_album_artist_name: 'y' }])).toEqual([]);
  });
});

describe('parseAccount', () => {
  const plays = parseAccount(account);

  test('parses endTime as UTC', () => {
    expect(plays[0].ts.getTime()).toBe(Date.UTC(2024, 11, 31, 16, 0));
  });

  test('builds a lowercased artist+track key', () => {
    expect(plays[0].trackKey).toBe('aoi kaze\u0000neon rain');
    expect(plays).toHaveLength(4);
  });
});

describe('detect', () => {
  test('recognises both history formats', () => {
    expect(detect(extended).kind).toBe('extended');
    expect(detect(account).kind).toBe('account');
  });

  test.each([
    [{ playlists: [] }, 'your playlists file'],
    [{ tracks: [] }, 'your library file'],
    [[{ endTime: '2024-01-01 10:00', podcastName: 'p', episodeName: 'e', msPlayed: 1 }], 'your podcast history'],
    [{ hello: 1 }, 'not a listening-history file'],
    [[], 'not a listening-history file'],
  ])('labels other files: %j', (json, label) => {
    expect(detect(json)).toEqual({ kind: 'other', label });
  });
});
