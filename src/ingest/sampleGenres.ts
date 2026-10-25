import type { Dataset } from '../types';

// Dev-only: fixed sample shares so the genre stations can be previewed before real genres exist. Never used in builds.
const SAMPLE = [
  { genre: 'city pop', share: 0.42 },
  { genre: 'j-rock', share: 0.23 },
  { genre: 'hip-hop', share: 0.15 },
  { genre: 'lo-fi', share: 0.1 },
  { genre: 'jazz', share: 0.1 },
];

export function withSampleGenres(ds: Dataset): Dataset {
  const stats = new Map([...ds.stats].map(([y, s]) => [y, { ...s, genreShares: SAMPLE.map((g) => ({ ...g })), topGenre: SAMPLE[0].genre }]));
  return { ...ds, stats };
}
