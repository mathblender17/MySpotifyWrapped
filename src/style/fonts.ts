import type { World } from '../journey/stations';

// Accent faces per world (art spec §5). The core faces are in index.html; these load only when a station is near.
// Google Fonts already serves CJK families in unicode-range slices, so the browser fetches only the glyphs a page uses
// (&text= subsetting would break on the rider's own artist and song names).
export const WORLD_FONTS: Record<World, string[]> = {
  F: [],
  C: [],
  J: [],
  G: ['Rampart+One'],
  D: ['Reggae+One'],
  Q: ['Rampart+One', 'Hachi+Maru+Pop'],
  B: ['Anton'],
  K: ['Press+Start+2P'],
  O: ['Bebas+Neue'],
  I: ['Shippori+Mincho:wght@800', 'Yuji+Syuku'],
  L: ['Reggae+One'],
};


export function loadWorldFonts(w: World): void {
  const families = WORLD_FONTS[w];
  if (!families.length || document.head.querySelector(`link[data-world="${w}"]`)) return;
  const link = Object.assign(document.createElement('link'), {
    rel: 'stylesheet',
    href: `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`,
  });
  link.dataset.world = w;
  document.head.append(link);
}
