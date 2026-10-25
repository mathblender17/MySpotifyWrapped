export type Haptics = { buzz(p: number | number[]): void };

/** Short vibrations on arrivals and stamps (alive spec §4). Android only: iOS has no web vibration, so it's a no-op there. */
export function createHaptics(o: { canBuzz: () => boolean; vibrate?: (p: number | number[]) => boolean }): Haptics {
  const vibrate = 'vibrate' in o ? o.vibrate : typeof navigator !== 'undefined' && navigator.vibrate ? navigator.vibrate.bind(navigator) : undefined;
  return {
    buzz(p) {
      if (vibrate && o.canBuzz()) vibrate(p);
    },
  };
}
