import { createSfx } from '../audio/sfx';
import { createFeelSfx } from '../audio/feelsfx';
import { createBeds } from '../audio/beds';
import { createTilt } from '../feel/tilt';
import { createHaptics } from '../story/haptics';
import type { MadeKit } from './types';

/**
 * Builds the kit an experiment plays with. Sound and vibration run only after the first tap (`unlocked`) and never
 * under reduced motion, the same rule the ride uses (alive spec §4).
 */
export function makeKit(o: { reduced: boolean; unlocked: () => boolean }): MadeKit {
  const canPlay = () => o.unlocked() && !o.reduced;
  const haptics = createHaptics({ canBuzz: canPlay });
  const sfx = createSfx({ canPlay });
  const fx = createFeelSfx({ canPlay });
  const beds = createBeds({ canPlay });
  const tilt = createTilt({ reduced: o.reduced });
  const cleanups: (() => void)[] = [];
  return {
    reduced: o.reduced,
    buzz: (p) => haptics.buzz(p),
    sfx,
    fx,
    beds,
    tilt,
    onLeave: (fn) => void cleanups.push(fn),
    leave() {
      for (const fn of cleanups.splice(0)) {
        try {
          fn();
        } catch {
          // one broken cleanup must not leave the others running
        }
      }
      beds.stop();
      tilt.stop();
      beds.dispose();
      fx.dispose();
      sfx.dispose();
    },
  };
}
