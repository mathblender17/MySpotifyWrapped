const cache = new Map<string, Promise<string | undefined>>();

/**
 * 30-second preview of a song from the iTunes Search API. Only the artist and track name leave the device.
 * Returns undefined rather than a wrong song: the first result must be by the same artist.
 */
export function findPreview(artist: string, track: string, fetcher: typeof fetch = fetch): Promise<string | undefined> {
  const key = `${artist}\u0000${track}`.toLowerCase();
  let hit = cache.get(key);
  if (!hit) {
    hit = lookup(artist, track, fetcher);
    cache.set(key, hit);
  }
  return hit;
}

async function lookup(artist: string, track: string, fetcher: typeof fetch): Promise<string | undefined> {
  try {
    const res = await fetcher(`https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${track}`)}&entity=song&limit=5`);
    if (!res.ok) return undefined;
    const data = (await res.json()) as { results?: { artistName?: string; previewUrl?: string }[] };
    const want = artist.toLowerCase();
    // Exact name first; otherwise the artist must appear as a whole word (a featured credit), never as a substring:
    // "Ye" must not match "Yeah Yeah Yeahs".
    const whole = new RegExp(`(^|[^\\p{L}\\p{N}])${want.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'u');
    const results = (data.results ?? []).filter((r) => r.previewUrl);
    const match =
      results.find((r) => r.artistName?.toLowerCase() === want) ?? results.find((r) => whole.test(r.artistName?.toLowerCase() ?? ''));
    return match?.previewUrl;
  } catch {
    return undefined;
  }
}
