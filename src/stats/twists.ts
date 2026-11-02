import type { Play } from '../types';
import { localDay } from './basics';

export type Twist =
  | { kind: 'streak'; days: number }
  | { kind: 'obsession'; artist: string; day: string; plays: number }
  | { kind: 'comeback'; artist: string; awayDays: number; plays: number };

const MIN_STREAK = 7;
const MIN_OBSESSION = 10;
const MIN_COMEBACK_PLAYS = 10;
const AWAY_DAYS = 365;
const DAY_MS = 86_400_000;

/**
 * Surprise beats computed from the history (ux spec S2). Each rule returns nothing unless the data really holds it.
 * `before` is the rider's earlier history; pass it only when it really covers earlier years, otherwise no comeback is claimed.
 */
export function computeTwists(ps: Play[], before?: Play[]): Twist[] {
  const out: Twist[] = [];

  const dayKeys = [...new Set(ps.map((p) => localDay(p.ts)))].sort();
  let best = 0;
  let run = 0;
  let prev: number | undefined;
  for (const k of dayKeys) {
    const t = Date.parse(`${k}T12:00:00Z`);
    run = prev !== undefined && Math.round((t - prev) / DAY_MS) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  if (best >= MIN_STREAK) out.push({ kind: 'streak', days: best });

  const perDay = new Map<string, { artist: string; day: string; plays: number }>();
  for (const p of ps) {
    const day = localDay(p.ts);
    const key = `${day}|${p.artist}`;
    const row = perDay.get(key);
    if (row) row.plays++;
    else perDay.set(key, { artist: p.artist, day, plays: 1 });
  }
  const top = [...perDay.values()].sort((a, b) => b.plays - a.plays || (a.day < b.day ? -1 : 1))[0];
  if (top && top.plays >= MIN_OBSESSION) out.push({ kind: 'obsession', ...top });

  if (before?.length) {
    const lastBefore = new Map<string, number>();
    for (const p of before) lastBefore.set(p.artist, Math.max(lastBefore.get(p.artist) ?? 0, p.ts.getTime()));
    const now = new Map<string, { first: number; plays: number }>();
    for (const p of ps) {
      const r = now.get(p.artist);
      if (r) {
        r.first = Math.min(r.first, p.ts.getTime());
        r.plays++;
      } else now.set(p.artist, { first: p.ts.getTime(), plays: 1 });
    }
    let pick: Twist | undefined;
    for (const [artist, { first, plays }] of now) {
      const last = lastBefore.get(artist);
      if (last === undefined || plays < MIN_COMEBACK_PLAYS) continue;
      const awayDays = Math.round((first - last) / DAY_MS);
      if (awayDays >= AWAY_DAYS && (!pick || awayDays > (pick as { awayDays: number }).awayDays)) pick = { kind: 'comeback', artist, awayDays, plays };
    }
    if (pick) out.push(pick);
  }
  return out;
}
