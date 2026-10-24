import { readFileSync } from 'node:fs';
import type { SlideContext } from '../../src/story/player';

const CSS = readFileSync('src/slides/slides.css', 'utf8').toLowerCase();

/** Gyaru pink is a spec constant on every station: true if the slide's own CSS rules (or markup) use it. */
export function hasPink(el: HTMLElement): boolean {
  const cls = el.className.split(' ').find((c) => c !== 'ph')!;
  const rules = CSS.split('}').filter((r) => r.trim().startsWith(`.${cls}`));
  return rules.some((r) => r.includes('#ff2d95')) || el.outerHTML.toLowerCase().includes('#ff2d95');
}
import type { YearStats } from '../../src/types';

const r = (name: string, minutes: number, plays: number, artist?: string) => ({ name, minutes, plays, ...(artist ? { artist } : {}) });

export const STATS: Required<YearStats> = {
  year: 2025,
  plays: 8406,
  minutes: 28243,
  daysListened: 341,
  topArtists: [r('Aoi Kaze', 3826, 980), r('Yuki Tsuki', 2542, 700), r('Hoshino Rei', 2377, 650), r('Haru Akagi', 1870, 500), r('Ren Sakura', 1669, 450)],
  topTracks: [r('Signal Neon', 1100, 336, 'Aoi Kaze'), r('Velvet Ghost', 980, 297, 'Yuki Tsuki'), r('Last Train', 960, 290, 'Hoshino Rei'), r('Paper Crane', 900, 280, 'Haru Akagi'), r('Static Bloom', 870, 270, 'Ren Sakura')],
  topArtistShare: 0.135,
  seasons: {
    spring: { value: 8000, topArtist: r('Aoi Kaze', 900, 200), topTrack: r('Signal Neon', 300, 80, 'Aoi Kaze') },
    summer: { value: 7000, topArtist: r('Hoshino Rei', 800, 180), topTrack: r('Last Train', 300, 80, 'Hoshino Rei') },
    autumn: { value: 6500, topArtist: r('Sora Takeda', 700, 160), topTrack: r('Moon Echo', 300, 80, 'Sora Takeda') },
    winter: { value: 6700, topArtist: r('Yuki Tsuki', 750, 170), topTrack: r('Velvet Ghost', 300, 80, 'Yuki Tsuki') },
  },
  weekly: [{ start: '2025-03-03', value: 500 }, { start: '2025-03-10', value: 1411 }, { start: '2025-03-17', value: 600 }],
  peakWeek: { start: '2025-03-10', value: 1411 },
  fastestRiser: { artist: 'Hoshino Rei', via: 'race', days: 105 },
  genreShares: [{ genre: 'city pop', share: 0.42 }, { genre: 'hip-hop', share: 0.23 }, { genre: 'j-rock', share: 0.15 }, { genre: 'lo-fi', share: 0.1 }, { genre: 'jazz', share: 0.1 }],
  topGenre: 'city pop',
  traits: { variety: 0.02, loyalty: 0.135, novelty: 0.06, nightOwl: 0.28, skipRate: 0.11 },
  personality: { id: 'nightowl', name: 'The Night Owl', jp: '夜行性', line: 'Your best listening happened after 10 PM.' },
  fortune: { jp: '末吉', en: 'Future blessing' },
  kanji: { kanji: '夜', meaning: 'night' },
  soundtrack: {},
};

export const ctx = (over: Partial<SlideContext> = {}): SlideContext => ({
  stats: STATS,
  years: [{ year: 2025, plays: 8406, eligible: true }, { year: 2024, plays: 3900, eligible: true }, { year: 2019, plays: 12, eligible: false }],
  onPickYear: () => {},
  ...over,
});
