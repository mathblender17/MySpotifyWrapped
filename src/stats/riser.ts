import type { Play, YearStats } from '../types';
import { hasDurations, localDay, topN } from './basics';

const dayNumber = (d: Date) => {
  const [y, m, dd] = localDay(d).split('-').map(Number);
  return Date.UTC(y, m - 1, dd) / 86_400_000;
};

/** Race path: newcomers in the final top 10, fewest days from first play to entering the running top 5. */
function race(plays: Play[], firstSeen: Map<string, Date>): YearStats['fastestRiser'] {
  const year = plays[0].ts.getFullYear();
  const top10 = topN(plays, 'artist', 10).map((r) => r.name);
  // Skip a two-week warm-up: on Jan 2 almost nobody has plays yet, so any newcomer would "enter the top 5" in 0 days.
  const warmUpEnd = new Date(year, 0, 15);
  const candidates = new Set(top10.filter((a) => {
    const f = firstSeen.get(a);
    return f?.getFullYear() === year && f >= warmUpEnd;
  }));
  if (!candidates.size) return undefined;

  const withDur = hasDurations(plays);
  const cum = new Map<string, number>();
  const firstPlay = new Map<string, Date>();
  const entered = new Map<string, number>();
  for (const p of [...plays].sort((a, b) => a.ts.getTime() - b.ts.getTime())) {
    const v = (cum.get(p.artist) ?? 0) + (withDur ? p.msPlayed! / 60_000 : 1);
    cum.set(p.artist, v);
    if (!candidates.has(p.artist) || entered.has(p.artist)) continue;
    if (!firstPlay.has(p.artist)) firstPlay.set(p.artist, p.ts);
    // Rank-check only on a candidate's own plays: O(artists) each, so long histories stay fast.
    let above = 0;
    for (const [a, c] of cum) if (a !== p.artist && c > v) above++;
    if (above < 5) entered.set(p.artist, dayNumber(p.ts) - dayNumber(firstPlay.get(p.artist)!));
  }
  let best: { artist: string; days: number } | undefined;
  for (const a of top10) {
    const days = entered.get(a);
    if (days !== undefined && (!best || days < best.days)) best = { artist: a, days }; // top10 order breaks ties
  }
  return best && { artist: best.artist, via: 'race', days: best.days };
}

/** Halves path: biggest rank climb from Jan–Jun to Jul–Dec among artists with 20+ plays. */
function halves(plays: Play[]): YearStats['fastestRiser'] {
  const ranks = (ps: Play[]) => {
    const order = topN(ps, 'artist', Infinity).map((r) => r.name);
    return (a: string) => (order.includes(a) ? order.indexOf(a) + 1 : order.length + 1);
  };
  const h1 = ranks(plays.filter((p) => p.ts.getMonth() < 6));
  const h2 = ranks(plays.filter((p) => p.ts.getMonth() >= 6));
  const counts = new Map<string, number>();
  for (const p of plays) counts.set(p.artist, (counts.get(p.artist) ?? 0) + 1);

  let best: { artist: string; climb: number } | undefined;
  for (const [a, n] of [...counts].sort(([x], [y]) => (x < y ? -1 : 1))) {
    if (n < 20) continue;
    const climb = h1(a) - h2(a);
    if (climb > 0 && (!best || climb > best.climb)) best = { artist: a, climb };
  }
  return best && { artist: best.artist, via: 'halves', climb: best.climb };
}

export function fastestRiser(yearPlays: Play[], firstSeen: Map<string, Date>, coversPriorYears: boolean): YearStats['fastestRiser'] {
  if (!yearPlays.length) return undefined;
  return (coversPriorYears ? race(yearPlays, firstSeen) : undefined) ?? halves(yearPlays);
}
