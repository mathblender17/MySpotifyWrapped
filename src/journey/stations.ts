import type { YearStats } from '../types';

export type Transition = 'title' | 'ride' | 'cut' | 'phone' | 'tease' | 'baton' | 'breather';

export type Station = {
  id: string;
  n: number;
  act: 1 | 2 | 3 | 4;
  nameJp: string;
  nameEn: string;
  /** Fields the station can't play without; optional extras are shown when present. */
  needs: (keyof YearStats)[];
  transitionIn: Transition;
  waitForInput?: boolean;
  /** Why the station is passed through, when it isn't "your data doesn't cover it". */
  lockedHint?: string;
  /** Match cut: the shape at `from` in the previous slide becomes `to` in this one. */
  cut?: { from: string; to: string };
};

const GENRES_LATER = 'Genres arrive in a later update';

// The approved storyboard (docs/design/journey-storyboard.html), spec §6.
export const STATIONS: Station[] = [
  { id: 'departure', n: 1, act: 1, nameJp: '出発', nameEn: 'Departure', needs: [], transitionIn: 'title', waitForInput: true },
  { id: 'torii', n: 2, act: 1, nameJp: '鳥居', nameEn: 'Torii Gates', needs: ['plays', 'daysListened'], transitionIn: 'ride' },
  { id: 'bento', n: 3, act: 1, nameJp: '弁当', nameEn: 'Bento', needs: ['genreShares'], transitionIn: 'cut', lockedHint: GENRES_LATER, cut: { from: '.tor .g', to: '.ben .box' } },
  { id: 'ganguro', n: 4, act: 1, nameJp: 'ガングロ', nameEn: 'Ganguro', needs: ['topGenre'], transitionIn: 'phone', lockedHint: GENRES_LATER },
  { id: 'sumo', n: 5, act: 2, nameJp: '番付', nameEn: 'Banzuke', needs: ['topArtists'], transitionIn: 'ride' },
  { id: 'idol', n: 6, act: 2, nameJp: '推し', nameEn: 'Oshi', needs: ['topArtists'], transitionIn: 'tease' },
  { id: 'konbini', n: 7, act: 2, nameJp: 'コンビニ', nameEn: 'Konbini', needs: ['topTracks'], transitionIn: 'cut', cut: { from: '.idol .pen', to: '.kon .rc' } },
  { id: 'gacha', n: 8, act: 2, nameJp: 'ガチャ', nameEn: 'Gacha', needs: ['topTracks'], transitionIn: 'baton', cut: { from: '.kon .bc', to: '.gac .card' } },
  { id: 'weather', n: 9, act: 3, nameJp: '天気', nameEn: 'Forecast', needs: ['seasons'], transitionIn: 'breather' },
  { id: 'fuji', n: 10, act: 3, nameJp: '富士', nameEn: 'Fuji', needs: ['weekly', 'peakWeek'], transitionIn: 'ride' },
  { id: 'shinkansen', n: 11, act: 3, nameJp: '新幹線', nameEn: 'Shinkansen', needs: ['fastestRiser'], transitionIn: 'cut', cut: { from: '.fuji svg', to: '.shk .nose' } },
  { id: 'omikuji', n: 12, act: 4, nameJp: 'おみくじ', nameEn: 'Omikuji', needs: ['personality', 'fortune'], transitionIn: 'ride' },
  { id: 'kanji', n: 13, act: 4, nameJp: '今年の漢字', nameEn: 'Kanji of the Year', needs: ['kanji', 'topArtists', 'topTracks'], transitionIn: 'tease' },
];

export function isPlayable(s: Station, stats: YearStats | undefined): boolean {
  return s.needs.every((k) => {
    const v = stats?.[k];
    return v !== undefined && (!Array.isArray(v) || v.length > 0);
  });
}
