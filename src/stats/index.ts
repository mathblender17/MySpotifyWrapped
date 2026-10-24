import type { Dataset, Play, Season, YearStats, YearSummary } from '../types';
import { localYear, qualifying, topN, totals, valueOf } from './basics';
import { fortune, kanji, personality, traits } from './readings';
import { fastestRiser } from './riser';
import { peakWeek, seasons, weekly } from './time';

const MIN_PLAYS = 50;

function yearStats(year: number, ps: Play[], raw: Play[], firstSeen: Map<string, Date>, coversPriorYears: boolean): YearStats {
  const topArtists = topN(ps, 'artist', 5);
  const topArtistShare = valueOf(ps.filter((p) => p.artist === topArtists[0].name)) / valueOf(ps);
  const seasonStats = seasons(ps);
  const peakSeason = (['spring', 'summer', 'autumn', 'winter'] as Season[]).reduce((a, b) => (seasonStats[b].value > seasonStats[a].value ? b : a));
  const w = weekly(ps);
  const t = traits(ps, firstSeen, coversPriorYears, topArtistShare, raw);
  const persona = personality(t);
  return {
    year,
    ...totals(ps),
    topArtists,
    topTracks: topN(ps, 'track', 5),
    topArtistShare,
    seasons: seasonStats,
    weekly: w,
    peakWeek: peakWeek(w),
    fastestRiser: fastestRiser(ps, firstSeen, coversPriorYears),
    traits: t,
    personality: persona,
    fortune: fortune(t),
    kanji: kanji(persona.id, peakSeason),
  };
}

/**
 * `lifetime`: the plays are the account's whole history (extended export), so its first play really is where
 * listening began. Otherwise (account export, Last.fm) only a full earlier year of data can tell "new this year".
 */
export function computeAllYears(plays: Play[], opts: { lifetime?: boolean } = {}): Dataset {
  const q = qualifying(plays);
  const byYear = new Map<number, Play[]>();
  const firstSeen = new Map<string, Date>();
  let earliest: Date | undefined;
  for (const p of q) {
    const y = localYear(p.ts);
    const list = byYear.get(y);
    if (list) list.push(p);
    else byYear.set(y, [p]);
    const f = firstSeen.get(p.artist);
    if (!f || p.ts < f) firstSeen.set(p.artist, p.ts);
    if (!earliest || p.ts < earliest) earliest = p.ts;
  }

  const years: YearSummary[] = [...byYear]
    .map(([year, ps]) => ({ year, plays: ps.length, eligible: ps.length >= MIN_PLAYS }))
    .sort((a, b) => b.year - a.year);
  const stats = new Map<number, YearStats>();
  for (const { year, eligible } of years) {
    if (!eligible) continue;
    // Data that starts inside this year (or only a few months before it) can't tell "new this year" from "new to the export".
    const coversPriorYears = earliest! < new Date(year, 0, 1) && (opts.lifetime || earliest! <= new Date(year - 1, 0, 1));
    const raw = plays.filter((p) => localYear(p.ts) === year);
    stats.set(year, yearStats(year, byYear.get(year)!, raw, firstSeen, coversPriorYears));
  }
  return { years, stats };
}
