import type { Play } from '../types';

// shortcut: shape taken from Spotify's documented account-data export; confirm against a real file (spec §15.3).
/** Account-data streaming history rows ("endTime": "YYYY-MM-DD HH:mm" in UTC) → plays. */
export function parseAccount(rows: unknown[]): Play[] {
  const plays: Play[] = [];
  for (const r of rows) {
    if (typeof r !== 'object' || r === null) continue;
    const { endTime, artistName, trackName, msPlayed } = r as Record<string, unknown>;
    if (typeof artistName !== 'string' || typeof trackName !== 'string' || typeof endTime !== 'string') continue;
    const ts = new Date(endTime.replace(' ', 'T') + ':00Z');
    if (isNaN(ts.getTime())) continue;
    plays.push({
      ts,
      track: trackName,
      artist: artistName,
      msPlayed: typeof msPlayed === 'number' ? msPlayed : undefined,
      trackKey: `${artistName}\u0000${trackName}`.toLowerCase(),
    });
  }
  return plays;
}
