export type Detected = { kind: 'extended' | 'account' | 'other'; label: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Identify a parsed Spotify export file from its shape, not its name (people rename files). */
export function detect(json: unknown): Detected {
  if (Array.isArray(json)) {
    const row = json.find(isObj);
    if (row && 'ts' in row && 'ms_played' in row) return { kind: 'extended', label: 'extended streaming history' };
    if (row && 'episodeName' in row) return { kind: 'other', label: 'your podcast history' };
    if (row && 'endTime' in row && 'msPlayed' in row && 'trackName' in row) return { kind: 'account', label: 'streaming history' };
  } else if (isObj(json)) {
    if ('playlists' in json) return { kind: 'other', label: 'your playlists file' };
    if ('tracks' in json) return { kind: 'other', label: 'your library file' };
  }
  return { kind: 'other', label: 'not a listening-history file' };
}
