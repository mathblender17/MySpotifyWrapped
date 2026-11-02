import { HOOKS } from '../journey/hooks';
import type { YearStats } from '../types';
import type { Twist } from '../stats/twists';

type Line = { jp: string; en: string };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Which station each twist is told at, and the line the guide texts for it (ux spec S1, S2). */
const TELL: Record<Twist['kind'], { at: string; line: (t: never) => Line }> = {
  streak: {
    at: 'torii',
    line: (t: Extract<Twist, { kind: 'streak' }>) => ({ jp: `${t.days}日れんぞく!! 毎日聴ぃてたの?`, en: `${t.days} days in a row. Every single day?` }),
  },
  obsession: {
    at: 'fuji',
    line: (t: Extract<Twist, { kind: 'obsession' }>) => {
      const [, m, d] = t.day.split('-').map(Number);
      return { jp: `${m}月${d}日… ${t.artist}ばっかり${t.plays}回!!`, en: `${MONTHS[m - 1]} ${d}: ${t.plays} plays of ${t.artist} in one day` };
    },
  },
  comeback: {
    at: 'idol',
    line: (t: Extract<Twist, { kind: 'comeback' }>) => {
      const months = Math.floor(t.awayDays / 30.44);
      return { jp: `${t.artist}、ぉかぇり♡ ${months}ヶ月ぶり!!`, en: `${t.artist} is back after ${months} months away` };
    },
  },
};

/** The guide's line for a station: a twist the data really holds if this station tells one, else the written hook. */
export function lineFor(id: string, stats: YearStats | undefined): Line {
  for (const t of stats?.twists ?? []) {
    const tell = TELL[t.kind];
    if (tell.at === id) return tell.line(t as never);
  }
  return HOOKS[id];
}
