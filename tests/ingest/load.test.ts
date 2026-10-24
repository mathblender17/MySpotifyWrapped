import { expect, test } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { readFileSync } from 'node:fs';
import { loadFiles } from '../../src/ingest/load';

const extendedBytes = new Uint8Array(readFileSync('fixtures/extended.json'));
const accountBytes = new Uint8Array(readFileSync('fixtures/account.json'));

test('reads a zip, quietly skipping non-history files, folders and the pdf', () => {
  const zip = zipSync({
    'Spotify Extended Streaming History/Streaming_History_Audio_2024-2025.json': extendedBytes,
    'Spotify Extended Streaming History/ReadMeFirst_ExtendedStreamingHistory.pdf': strToU8('%PDF'),
    'Playlist1.json': strToU8(JSON.stringify({ playlists: [] })),
    'notes.txt': strToU8('hi'),
  });
  const { plays, problems } = loadFiles([{ name: 'my_spotify_data.zip', bytes: zip }]);
  expect(plays).toHaveLength(5);
  expect(problems).toEqual([]); // inside a zip, non-history files are expected and skipped quietly
});

test('loads several loose json files together', () => {
  const { plays } = loadFiles([
    { name: 'a.json', bytes: extendedBytes },
    { name: 'b.json', bytes: strToU8(JSON.stringify([{ ts: '2025-06-01T10:00:00Z', ms_played: 200000, master_metadata_track_name: 'Solo', master_metadata_album_artist_name: 'Z', spotify_track_uri: 'spotify:track:zzz' }])) },
  ]);
  expect(plays).toHaveLength(6);
});

test('a broken file is reported and the rest still load', () => {
  const { plays, problems } = loadFiles([
    { name: 'broken.json', bytes: strToU8('{]') },
    { name: 'a.json', bytes: extendedBytes },
  ]);
  expect(plays).toHaveLength(5);
  expect(problems).toEqual(["broken.json: couldn't be read — skipped"]);
});

test('the same play in two files is kept once', () => {
  const { plays } = loadFiles([
    { name: 'a.json', bytes: extendedBytes },
    { name: 'a-copy.json', bytes: extendedBytes },
  ]);
  expect(plays).toHaveLength(5);
});

test('reports progress once per file', () => {
  const calls: [number, number][] = [];
  loadFiles([{ name: 'a.json', bytes: extendedBytes }, { name: 'b.json', bytes: accountBytes }], (d, t) => calls.push([d, t]));
  expect(calls).toEqual([[1, 2], [2, 2]]);
});

test('a corrupt zip is reported and the other files still load', () => {
  const { plays, problems } = loadFiles([{ name: 'bad.zip', bytes: strToU8('not a zip') }, { name: 'a.json', bytes: extendedBytes }]);
  expect(plays).toHaveLength(5);
  expect(problems).toEqual(["bad.zip: couldn't be opened — skipped"]);
});

test('with extended history present, account history is not double-counted', () => {
  const { plays, problems } = loadFiles([{ name: 'ext.json', bytes: extendedBytes }, { name: 'StreamingHistory_music_0.json', bytes: accountBytes }]);
  expect(plays).toHaveLength(5);
  expect(problems).toEqual(['StreamingHistory_music_0.json: already covered by your extended history — skipped']);
});

test('non-history files inside a zip (Payments, Identity, __MACOSX) are skipped quietly', () => {
  const zip = zipSync({
    'MyData/Payments.json': strToU8('{"payment_method":"x"}'),
    'MyData/Identity.json': strToU8('{"displayName":"x"}'),
    '__MACOSX/MyData/._StreamingHistory_music_0.json': strToU8('\u0000\u0005junk'),
    'MyData/StreamingHistory_music_0.json': accountBytes,
  });
  const { plays, problems } = loadFiles([{ name: 'my_spotify_data.zip', bytes: zip }]);
  expect(plays).toHaveLength(4);
  expect(problems).toEqual([]);
});

test('a zip with no listening history at all says so', () => {
  const zip = zipSync({ 'Payments.json': strToU8('{}') });
  expect(loadFiles([{ name: 'x.zip', bytes: zip }]).problems).toEqual(['x.zip: no listening history found inside — skipped']);
});
