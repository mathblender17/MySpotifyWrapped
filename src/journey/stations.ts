import type { YearStats } from '../types';
import type { Morph } from './transitions';

export type Transition = 'title' | 'ride' | 'cut' | 'phone' | 'tease' | 'baton' | 'breather';

/** Art worlds (art-direction spec §5): each station is styled as one of these. */
export type World = 'F' | 'C' | 'J' | 'G' | 'D' | 'Q' | 'B' | 'K' | 'O' | 'I' | 'L';

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
  /** Which song starts here; stations without one keep the current song playing. */
  song?: 'top' | 'topArtistTrack' | 'riserTrack';
  world: World;
  /** Arrival morph (art spec §6), used when its source shape is on screen. */
  morph?: Morph;
  /** The world's accent: colours the station sign and this station's ticket stamp. */
  accent: string;
};

const GENRES_LATER = 'Genres arrive in a later update';

// The approved storyboard (docs/design/journey-storyboard.html), spec §6.
export const STATIONS: Station[] = [
  { id: 'departure', n: 1, act: 1, nameJp: '出発', nameEn: 'Departure', needs: [], transitionIn: 'title', waitForInput: true, song: 'top', world: 'F', accent: '#00a7db' },
  { id: 'torii', n: 2, act: 1, nameJp: '鳥居', nameEn: 'Torii Gates', needs: ['plays', 'daysListened'], transitionIn: 'ride', song: 'top', world: 'C', accent: '#ff3b1f' },
  { id: 'bento', n: 3, act: 1, nameJp: '弁当', nameEn: 'Bento', needs: ['genreShares'], transitionIn: 'cut', lockedHint: GENRES_LATER, cut: { from: '.tor .hero', to: '.ben .h1' }, morph: 'shrink', world: 'J', accent: '#e60012' },
  { id: 'ganguro', n: 4, act: 1, nameJp: 'ガングロ', nameEn: 'Ganguro', needs: ['topGenre'], transitionIn: 'phone', lockedHint: GENRES_LATER, world: 'G', accent: '#b48cff' },
  { id: 'sumo', n: 5, act: 2, nameJp: '番付', nameEn: 'Banzuke', needs: ['topArtists'], transitionIn: 'ride', world: 'D', accent: '#e60033' },
  { id: 'idol', n: 6, act: 2, nameJp: '推し', nameEn: 'Oshi', needs: ['topArtists'], transitionIn: 'tease', song: 'topArtistTrack', cut: { from: '.sumo .splash', to: '.idol .cover' }, morph: 'cover', world: 'Q', accent: '#ff2d95' },
  { id: 'konbini', n: 7, act: 2, nameJp: 'コンビニ', nameEn: 'Konbini', needs: ['topTracks'], transitionIn: 'cut', cut: { from: '.idol .cover', to: '.kon .rc' }, world: 'B', accent: '#3cf6ff' },
  { id: 'gacha', n: 8, act: 2, nameJp: 'ガチャ', nameEn: 'Gacha', needs: ['topTracks'], transitionIn: 'baton', song: 'top', cut: { from: '.kon .bc', to: '.gac .card' }, morph: 'pixelate', world: 'K', accent: '#ffe36b' },
  { id: 'weather', n: 9, act: 3, nameJp: '天気', nameEn: 'Forecast', needs: ['seasons'], transitionIn: 'breather', world: 'O', accent: '#c8102e' },
  { id: 'fuji', n: 10, act: 3, nameJp: '富士', nameEn: 'Fuji', needs: ['weekly', 'peakWeek'], transitionIn: 'ride', world: 'I', accent: '#c8102e' },
  { id: 'shinkansen', n: 11, act: 3, nameJp: '新幹線', nameEn: 'Shinkansen', needs: ['fastestRiser'], transitionIn: 'cut', song: 'riserTrack', cut: { from: '.fuji svg', to: '.shk .beast' }, world: 'L', accent: '#ff7a2b' },
  { id: 'omikuji', n: 12, act: 4, nameJp: 'おみくじ', nameEn: 'Omikuji', needs: ['personality', 'fortune'], transitionIn: 'ride', world: 'I', accent: '#c8102e' },
  { id: 'kanji', n: 13, act: 4, nameJp: '今年の漢字', nameEn: 'Kanji of the Year', needs: ['kanji', 'topArtists', 'topTracks'], transitionIn: 'tease', song: 'top', world: 'C', accent: '#ff3b1f' },
];

export function isPlayable(s: Station, stats: YearStats | undefined): boolean {
  return s.needs.every((k) => {
    const v = stats?.[k];
    return v !== undefined && (!Array.isArray(v) || v.length > 0);
  });
}
