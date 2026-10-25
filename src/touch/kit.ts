import type { Sfx } from '../audio/sfx';
import type { Ranked, YearStats } from '../types';

/** What a station's touch interaction may use; the player owns all of it (hold, music, sound, haptics). */
export type TouchKit = {
  stats: YearStats;
  reduced: boolean;
  /** The dock ticket (outside the card): the kanji station lets a tap flip it. */
  ticket: { el: HTMLElement; flip(): void };
  /** Freeze the card's hold until the returned release is called (counted: overlapping uses nest). */
  busy(): () => void;
  /** Play a track's preview over the mix; resolves true when a preview was found and started. */
  playTrack(t: Ranked): Promise<boolean>;
  sfx: Sfx;
  buzz(p: number | number[]): void;
  /** Make `target` touchable: data-touch, a pulsing dot, never a ride gesture. */
  mark(target: Element): void;
  /** Seconds → 0 under reduced motion. */
  dur(s: number): number;
  /** Run `fn` when the card is left (before the next card is built, or on destroy); cleanup for listeners. */
  onLeave(fn: () => void): void;
};
