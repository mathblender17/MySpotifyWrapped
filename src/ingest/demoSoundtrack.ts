import type { Dataset, Ranked } from '../types';

// The demo's artists are fictional, so it has no songs of its own to preview. It rides to real Japanese tracks
// chosen for the journey's mood — background music only; no slide ever shows these as the demo's stats.
export const DEMO_SOUNDTRACK: { top: Ranked; topArtistTrack: Ranked; riserTrack: Ranked } = {
  top: { name: 'Mayonaka no Door', artist: 'Miki Matsubara' }, // city-pop night train: departure → kanji
  topArtistTrack: { name: 'Idol', artist: 'YOASOBI' }, // the idol station
  riserTrack: { name: 'Shinunoga E-Wa', artist: 'Fujii Kaze' }, // the shinkansen's fast riser
};

export function withDemoSoundtrack(ds: Dataset): Dataset {
  for (const s of ds.stats.values()) s.soundtrack = DEMO_SOUNDTRACK;
  return ds;
}
