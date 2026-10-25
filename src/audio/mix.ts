import type { Ranked, YearStats } from '../types';

/** The ride's non-stop mix: the year's top tracks, then the #1 artist's and the riser's songs, once each. */
export function mixQueue(stats: YearStats): Ranked[] {
  const seen = new Set<string>();
  const out: Ranked[] = [];
  for (const t of [...(stats.topTracks ?? []), stats.soundtrack?.topArtistTrack, stats.soundtrack?.riserTrack]) {
    if (!t?.artist) continue;
    const key = `${t.artist}\u0000${t.name}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}
