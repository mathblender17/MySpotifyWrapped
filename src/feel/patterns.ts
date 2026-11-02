/** A rail clack as the train settles into a station (ms). */
export const CLACK = [18];
/** The stamp landing: a hard hit, a pause, a small rebound. */
export const SLAM = [40, 20, 15];
/** The temple bell: strike, ring, fade. */
export const BELL = [30, 60, 30];

/**
 * A rising buzz for a press-and-hold: vibrate/pause pairs (vibrate first) whose pulses grow from 10 to 40 ms while the
 * pauses shrink from 40 to 10 ms, so it feels like it is building. Each pair is 50 ms; at most 15 pairs (30 entries).
 */
export function chargePattern(ms: number): number[] {
  if (ms <= 0) return [];
  const pairs = Math.min(15, Math.max(1, Math.round(ms / 50)));
  const out: number[] = [];
  for (let i = 0; i < pairs; i++) {
    const t = pairs === 1 ? 0 : i / (pairs - 1);
    out.push(Math.round(10 + 30 * t), Math.round(40 - 30 * t));
  }
  return out;
}
