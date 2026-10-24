import type { Play } from '../types';

/** Extended streaming history rows → plays. Podcast/video rows (no track name) and malformed rows are dropped. */
export function parseExtended(rows: unknown[]): Play[] {
  const plays: Play[] = [];
  for (const r of rows) {
    if (typeof r !== 'object' || r === null) continue;
    const row = r as Record<string, unknown>;
    const track = row.master_metadata_track_name;
    const artist = row.master_metadata_album_artist_name;
    const ts = new Date(String(row.ts));
    if (typeof track !== 'string' || typeof artist !== 'string' || isNaN(ts.getTime())) continue;
    const uri = row.spotify_track_uri;
    plays.push({
      ts,
      track,
      artist,
      album: typeof row.master_metadata_album_album_name === 'string' ? row.master_metadata_album_album_name : undefined,
      msPlayed: typeof row.ms_played === 'number' ? row.ms_played : undefined,
      skipped: typeof row.skipped === 'boolean' ? row.skipped : undefined,
      trackKey: typeof uri === 'string' ? uri : `${artist}\u0000${track}`.toLowerCase(),
    });
  }
  return plays;
}
