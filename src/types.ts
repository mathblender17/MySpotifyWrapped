export type Play = {
  ts: Date;
  track: string;
  artist: string;
  album?: string;
  msPlayed?: number;
  skipped?: boolean;
  trackKey: string;
};

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type Ranked = { name: string; artist?: string; plays?: number; minutes?: number };

export type Traits = {
  variety?: number;
  loyalty?: number;
  novelty?: number;
  nightOwl?: number;
  skipRate?: number;
};

export type PersonalityId = 'explorer' | 'devotee' | 'trendsetter' | 'nightowl' | 'surfer' | 'balanced';
export type Personality = { id: PersonalityId; name: string; jp: string; line: string };
export type Fortune = { jp: '大吉' | '中吉' | '小吉' | '吉' | '末吉' | '凶'; en: string };
export type KanjiReading = { kanji: string; meaning: string };

export type SeasonStat = { value: number; topTrack?: Ranked; topArtist?: Ranked; topGenre?: string };

export type YearStats = {
  year: number;
  plays?: number;
  minutes?: number;
  daysListened?: number;
  topArtists?: Ranked[];
  topTracks?: Ranked[];
  topArtistShare?: number;
  seasons?: Record<Season, SeasonStat>;
  weekly?: { start: string; value: number }[];
  peakWeek?: { start: string; value: number };
  fastestRiser?: { artist: string; via: 'race' | 'halves'; days?: number; climb?: number };
  genreShares?: { genre: string; share: number }[];
  topGenre?: string;
  traits?: Traits;
  personality?: Personality;
  fortune?: Fortune;
  kanji?: KanjiReading;
  /** Songs the story plays: the #1 song, the #1 artist's most-played song, the riser's most-played song. */
  soundtrack?: { top?: Ranked; topArtistTrack?: Ranked; riserTrack?: Ranked };
};

export type YearSummary = { year: number; plays: number; eligible: boolean };
export type Dataset = { years: YearSummary[]; stats: Map<number, YearStats> };
