import { expect, test } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { readFileSync } from 'node:fs';
import { loadFiles } from '../../src/ingest/load';

const extendedBytes = new Uint8Array(readFileSync('fixtures/extended.json'));
const accountBytes = new Uint8Array(readFileSync('fixtures/account.json'));

test('reads a zip, skipping non-history files with a reason and ignoring folders/pdf', () => {
  const zip = zipSync({
    'Spotify Extended Streaming History/Streaming_History_Audio_2024-2025.json': extendedBytes,
    'Spotify Extended Streaming History/ReadMeFirst_ExtendedStreamingHistory.pdf': strToU8('%PDF'),
    'Playlist1.json': strToU8(JSON.stringify({ playlists: [] })),
    'notes.txt': strToU8('hi'),
  });
  const { plays, problems } = loadFiles([{ name: 'my_spotify_data.zip', bytes: zip }]);
  expect(plays).toHaveLength(5);
  expect(problems).toEqual(['Playlist1.json: your playlists file — skipped', 'notes.txt: not JSON — skipped']);
});

test('loads several loose json files together', () => {
  const { plays } = loadFiles([
    { name: 'a.json', bytes: extendedBytes },
    { name: 'b.json', bytes: accountBytes },
  ]);
  expect(plays).toHaveLength(9);
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
