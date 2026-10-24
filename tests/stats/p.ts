import type { Play } from '../../src/types';

/** Build a play. `when` is a local-time string ('2025-03-05T10:00') or UTC ISO ('…Z'). ms defaults to 60s. */
export function p(when: string, artist: string, track = 'Song', ms: number | null = 60_000, skipped?: boolean): Play {
  return {
    ts: new Date(when),
    artist,
    track,
    msPlayed: ms === null ? undefined : ms,
    skipped,
    trackKey: `${artist}\u0000${track}`.toLowerCase(),
  };
}

/** n plays of the same artist/track spread one per day from `start` (local date). */
export function many(n: number, start: string, artist: string, track = 'Song', ms: number | null = 60_000): Play[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return { ...p(start, artist, track, ms), ts: d };
  });
}
