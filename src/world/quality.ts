const HITCH_MS = 250; // a single frame this long is a tab switch or GC pause, not a slow device

/**
 * Watches frame times in windows; a window averaging over budget steps quality down one level (never back up):
 * 1 = fewer particles, 2 = pixel ratio 1.
 */
export function createQuality(onStep: (level: 1 | 2) => void, windowMs = 2000, budgetMs = 22) {
  let level: 0 | 1 | 2 = 0;
  let elapsed = 0;
  let frames = 0;
  return {
    frame(dtMs: number) {
      if (level === 2 || dtMs > HITCH_MS) return;
      elapsed += dtMs;
      frames++;
      if (elapsed < windowMs) return;
      const avg = elapsed / frames;
      elapsed = 0;
      frames = 0;
      if (avg > budgetMs) {
        level = (level + 1) as 1 | 2;
        onStep(level);
      }
    },
    get level() {
      return level;
    },
  };
}
