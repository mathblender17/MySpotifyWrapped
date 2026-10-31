import type { Sfx } from '../audio/sfx';
import type { FeelSfx } from '../audio/feelsfx';
import type { Beds } from '../audio/beds';
import type { Tilt } from '../feel/tilt';

/** What an experiment may use. Every effect is a no-op under reduced motion, mute, or before the first tap. */
export type LabKit = {
  reduced: boolean;
  /** Vibration pattern (ms); Android only. */
  buzz(p: number | number[]): void;
  /** The ride's existing synth accents. */
  sfx: Sfx;
  /** Feel-layer sounds (clack, slam, tick). */
  fx: FeelSfx;
  /** Looping ambience (wind, chime, ratchet). */
  beds: Beds;
  /** Phone tilt, normalised to -1..1. */
  tilt: Tilt;
  /** Run `fn` when the experiment is closed. */
  onLeave(fn: () => void): void;
};

export type Experiment = {
  id: string;
  layer: 'feel' | 'story' | 'return';
  title: string;
  blurb: string;
  mount(stage: HTMLElement, kit: LabKit): void;
};

/** A kit plus its teardown: `leave()` runs every onLeave callback and stops sound, beds and tilt. */
export type MadeKit = LabKit & { leave(): void };
