import type { Play } from '../types';

/** The stripped history baked into the site (scripts/strip-history.mjs): only artist, track, end time, ms played, skipped. */
export type MyRideFile = {
  v: 1;
  artists: string[];
  tracks: [artist: number, name: string][];
  /** [end time in epoch seconds, track index, ms played, skipped 1/0] */
  plays: [number, number, number, number][];
};

export function decodeMyRide(f: MyRideFile): Play[] {
  return f.plays.map(([t, i, ms, sk]) => {
    const [a, track] = f.tracks[i];
    return { ts: new Date(t * 1000), track, artist: f.artists[a], msPlayed: ms, skipped: sk === 1, trackKey: `t${i}` };
  });
}

/** null when the site ships no history (the file is absent) or it can't be read. */
export async function loadMyRide(url = './my-ride.json'): Promise<Play[] | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return decodeMyRide((await res.json()) as MyRideFile);
  } catch {
    return null;
  }
}
