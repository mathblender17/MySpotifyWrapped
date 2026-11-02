export type PointSample = { t: number; x: number; y: number }; // t in ms

/** Pointer speed in px/s over the last `windowMs` (needs at least the last two samples). */
export function velocity(samples: PointSample[], windowMs = 100): { vx: number; vy: number } {
  if (samples.length < 2) return { vx: 0, vy: 0 };
  const last = samples[samples.length - 1];
  let first = samples[samples.length - 2];
  for (let i = samples.length - 2; i >= 0 && last.t - samples[i].t <= windowMs; i--) first = samples[i];
  const dt = last.t - first.t;
  if (dt <= 0) return { vx: 0, vy: 0 };
  return { vx: ((last.x - first.x) / dt) * 1000, vy: ((last.y - first.y) / dt) * 1000 };
}

export type Gesture = { kind: 'tap' | 'hold' | 'flick' | 'pull' | 'drag'; dir?: 'left' | 'right' | 'up' | 'down'; speed: number };

/**
 * The one gesture grammar (ux spec §3 F8): tap pokes, hold charges, flick moves, a downward pull rings the cord,
 * anything slower is a plain drag.
 */
export function classify(samples: PointSample[], o: { holdMs?: number; tapSlop?: number; flickSpeed?: number } = {}): Gesture {
  const { holdMs = 300, tapSlop = 10, flickSpeed = 600 } = o;
  if (samples.length < 2) return { kind: 'tap', speed: 0 };
  const a = samples[0];
  const b = samples[samples.length - 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.hypot(dx, dy) < tapSlop) return { kind: b.t - a.t < holdMs ? 'tap' : 'hold', speed: 0 };
  const v = velocity(samples);
  const speed = Math.hypot(v.vx, v.vy);
  const vertical = Math.abs(dy) > Math.abs(dx);
  if (vertical && dy > 0) return { kind: 'pull', dir: 'down', speed };
  const dir = vertical ? 'up' : dx > 0 ? 'right' : 'left';
  return { kind: speed >= flickSpeed ? 'flick' : 'drag', dir, speed };
}
