import type { Play, Season, SeasonStat } from '../types';
import { localDay, topN, valueOf } from './basics';

const SEASON_BY_MONTH: Season[] = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];

export const seasonOf = (d: Date): Season => SEASON_BY_MONTH[d.getMonth()];

export function seasons(plays: Play[]): Record<Season, SeasonStat> {
  const out = {} as Record<Season, SeasonStat>;
  for (const s of ['spring', 'summer', 'autumn', 'winter'] as const) {
    const ps = plays.filter((p) => seasonOf(p.ts) === s);
    out[s] = ps.length
      ? { value: Math.round(valueOf(ps)), topTrack: topN(ps, 'track', 1)[0], topArtist: topN(ps, 'artist', 1)[0] }
      : { value: 0 };
  }
  return out;
}

function mondayOf(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

/** Value per local Monday-started week, continuous from the first to the last week with plays. */
export function weekly(plays: Play[]): { start: string; value: number }[] {
  if (!plays.length) return [];
  const buckets = new Map<string, Play[]>();
  for (const p of plays) {
    const k = localDay(mondayOf(p.ts));
    const b = buckets.get(k);
    if (b) b.push(p);
    else buckets.set(k, [p]);
  }
  // reduce, not Math.min(...spread): spreading 500k timestamps overflows the call stack.
  let min = Infinity;
  let max = -Infinity;
  for (const p of plays) {
    const t = p.ts.getTime();
    if (t < min) min = t;
    if (t > max) max = t;
  }
  const last = mondayOf(new Date(max));
  const out: { start: string; value: number }[] = [];
  for (const d = mondayOf(new Date(min)); d <= last; d.setDate(d.getDate() + 7)) {
    const b = buckets.get(localDay(d));
    out.push({ start: localDay(d), value: b ? Math.round(valueOf(b)) : 0 });
  }
  return out;
}

export function peakWeek(w: { start: string; value: number }[]): { start: string; value: number } | undefined {
  return w.reduce<{ start: string; value: number } | undefined>((best, x) => (!best || x.value > best.value ? x : best), undefined);
}
