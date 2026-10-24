import { expect, test, vi } from 'vitest';
import { findPreview } from '../../src/audio/previews';

const respond = (results: object[]) => vi.fn(async () => ({ ok: true, json: async () => ({ resultCount: results.length, results }) }) as unknown as Response);

test('returns the preview of the first result by the same artist', async () => {
  const fetcher = respond([
    { artistName: 'Someone Else', trackName: 'HUMBLE.', previewUrl: 'https://x/wrong.m4a' },
    { artistName: 'Kendrick Lamar', trackName: 'HUMBLE.', previewUrl: 'https://x/right.m4a' },
  ]);
  expect(await findPreview('kendrick lamar', 'HUMBLE.', fetcher)).toBe('https://x/right.m4a');
  const url = String((fetcher.mock.calls[0] as unknown[])[0]);
  expect(url).toBe('https://itunes.apple.com/search?term=kendrick%20lamar%20HUMBLE.&entity=song&limit=5');
});

test('no matching artist → no preview (never a wrong song)', async () => {
  expect(await findPreview('Aoi Kaze', 'Neon Rain', respond([{ artistName: 'Kaze Band', previewUrl: 'u' }]))).toBeUndefined();
});

test('network failure or bad JSON → no preview, no throw', async () => {
  expect(await findPreview('A1', 'T1', vi.fn(async () => { throw new Error('offline'); }))).toBeUndefined();
  expect(await findPreview('A2', 'T2', vi.fn(async () => ({ ok: true, json: async () => { throw new Error('bad'); } }) as unknown as Response))).toBeUndefined();
  expect(await findPreview('A3', 'T3', vi.fn(async () => ({ ok: false }) as unknown as Response))).toBeUndefined();
});

test('the same song is looked up once', async () => {
  const fetcher = respond([{ artistName: 'Cached Artist', previewUrl: 'https://x/c.m4a' }]);
  await findPreview('Cached Artist', 'Song', fetcher);
  expect(await findPreview('Cached Artist', 'Song', fetcher)).toBe('https://x/c.m4a');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
