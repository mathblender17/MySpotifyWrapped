import type { Play, Ranked } from '../types';

/** Spotify counts a stream from 30 seconds; sources without durations (Last.fm) already apply their own rule. */
export const qualifying = (plays: Play[]): Play[] => plays.filter((p) => p.msPlayed === undefined || p.msPlayed >= 30_000);

export const localYear = (d: Date): number => d.getFullYear();

const pad = (n: number) => String(n).padStart(2, '0');
export const localDay = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const hasDurations = (plays: Play[]): boolean => plays.every((p) => p.msPlayed !== undefined);

/** What "how much" means for a set of plays: minutes when every play has a duration, else play count. */
export function valueOf(plays: Play[]): number {
  return hasDurations(plays) ? plays.reduce((s, p) => s + p.msPlayed!, 0) / 60_000 : plays.length;
}

export function totals(plays: Play[]): { plays: number; minutes?: number; daysListened: number } {
  return {
    plays: plays.length,
    minutes: hasDurations(plays) ? Math.round(valueOf(plays)) : undefined,
    daysListened: new Set(plays.map((p) => localDay(p.ts))).size,
  };
}

export function topN(plays: Play[], by: 'artist' | 'track', n: number): Ranked[] {
  const groups = new Map<string, Play[]>();
  for (const p of plays) {
    const key = by === 'artist' ? p.artist : p.trackKey;
    const g = groups.get(key);
    if (g) g.push(p);
    else groups.set(key, [p]);
  }
  const withDur = hasDurations(plays);
  const rows = [...groups.values()].map((g) => {
    const latest = g.reduce((a, b) => (b.ts > a.ts ? b : a));
    const ms = withDur ? g.reduce((s, p) => s + p.msPlayed!, 0) : 0;
    return { latest, plays: g.length, ms, name: by === 'artist' ? latest.artist : latest.track };
  });
  rows.sort((a, b) => b.ms - a.ms || b.plays - a.plays || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return rows.slice(0, n).map((r) => ({
    name: r.name,
    ...(by === 'track' ? { artist: r.latest.artist } : {}),
    plays: r.plays,
    minutes: withDur ? Math.round(r.ms / 60_000) : undefined,
  }));
}
