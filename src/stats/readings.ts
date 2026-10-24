import type { Fortune, KanjiReading, Personality, PersonalityId, Play, Season, Traits } from '../types';
import { valueOf } from './basics';

export function traits(yearPlays: Play[], firstSeen: Map<string, Date>, coversPriorYears: boolean, topArtistShare: number): Traits {
  const n = yearPlays.length;
  const year = yearPlays[0]?.ts.getFullYear();
  const withSkip = yearPlays.filter((p) => p.skipped !== undefined);
  return {
    variety: new Set(yearPlays.map((p) => p.artist)).size / n,
    loyalty: topArtistShare,
    novelty: coversPriorYears
      ? valueOf(yearPlays.filter((p) => firstSeen.get(p.artist)?.getFullYear() === year)) / valueOf(yearPlays)
      : undefined,
    nightOwl: yearPlays.filter((p) => p.ts.getHours() >= 22 || p.ts.getHours() < 4).length / n,
    skipRate: withSkip.length ? withSkip.filter((p) => p.skipped).length / withSkip.length : undefined,
  };
}

const PERSONALITIES: [keyof Traits, number, Personality][] = [
  ['variety', 0.25, { id: 'explorer', name: 'The Explorer', jp: '冒険家', line: 'You never played the same corner of music twice.' }],
  ['loyalty', 0.15, { id: 'devotee', name: 'The Devotee', jp: '推し一筋', line: 'One artist had your whole heart.' }],
  ['novelty', 0.4, { id: 'trendsetter', name: 'The Trendsetter', jp: '先取り', line: "Most of your year was artists you'd only just met." }],
  ['nightOwl', 0.3, { id: 'nightowl', name: 'The Night Owl', jp: '夜行性', line: 'Your best listening happened after 10 PM.' }],
  ['skipRate', 0.3, { id: 'surfer', name: 'The Channel Surfer', jp: '気まぐれ', line: 'Skip, skip, skip, then love.' }],
];
const BALANCED: Personality = { id: 'balanced', name: 'The Balanced', jp: '中庸', line: 'A little of everything, perfectly measured.' };

export function personality(t: Traits): Personality {
  let best: { score: number; p: Personality } | undefined;
  for (const [trait, threshold, p] of PERSONALITIES) {
    const v = t[trait];
    if (v === undefined) continue;
    const score = v / threshold;
    if (score >= 1 && (!best || score > best.score)) best = { score, p };
  }
  return best?.p ?? BALANCED;
}

export function fortune(t: Traits): Fortune {
  const v = t.novelty;
  if (v === undefined) return { jp: '吉', en: 'Blessing' };
  if (v >= 0.5) return { jp: '大吉', en: 'Great blessing' };
  if (v >= 0.35) return { jp: '中吉', en: 'Middle blessing' };
  if (v >= 0.2) return { jp: '小吉', en: 'Small blessing' };
  if (v >= 0.1) return { jp: '吉', en: 'Blessing' };
  if (v > 0) return { jp: '末吉', en: 'Future blessing' };
  return { jp: '凶', en: 'Curse' };
}

const KANJI: Record<PersonalityId, Record<Season, [string, string]>> = {
  explorer: { spring: ['旅', 'journey'], summer: ['冒', 'adventure'], autumn: ['探', 'search'], winter: ['道', 'path'] },
  devotee: { spring: ['愛', 'love'], summer: ['熱', 'heat'], autumn: ['縁', 'bond'], winter: ['絆', 'ties'] },
  trendsetter: { spring: ['芽', 'sprout'], summer: ['閃', 'flash'], autumn: ['新', 'new'], winter: ['先', 'ahead'] },
  nightowl: { spring: ['夢', 'dream'], summer: ['夜', 'night'], autumn: ['月', 'moon'], winter: ['星', 'star'] },
  surfer: { spring: ['風', 'wind'], summer: ['波', 'wave'], autumn: ['変', 'change'], winter: ['跳', 'leap'] },
  balanced: { spring: ['和', 'harmony'], summer: ['陽', 'sun'], autumn: ['実', 'fruit'], winter: ['静', 'calm'] },
};

export function kanji(p: PersonalityId, peak: Season): KanjiReading {
  const [k, meaning] = KANJI[p][peak];
  return { kanji: k, meaning };
}
