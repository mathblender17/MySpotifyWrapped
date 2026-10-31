/** One spring step (semi-implicit Euler, substepped so a 60 fps frame stays stable). Defaults give a slight overshoot. */
export function stepSpring(
  s: { x: number; v: number },
  target: number,
  dt: number,
  o: { stiffness?: number; damping?: number } = {},
): { x: number; v: number } {
  const k = o.stiffness ?? 200;
  const c = o.damping ?? 24;
  const n = Math.max(1, Math.ceil(dt / 0.004));
  const h = dt / n;
  let { x, v } = s;
  for (let i = 0; i < n; i++) {
    v += (-k * (x - target) - c * v) * h;
    x += v * h;
  }
  return { x, v };
}

/** Where a fling at `vel` px/s from `pos` would stop under constant deceleration. */
export function projectFling(pos: number, vel: number, decel = 3000): number {
  return pos + Math.sign(vel) * ((vel * vel) / (2 * decel));
}

/** The nearest card to a scroll offset, clamped to the strip. */
export function snapIndex(x: number, count: number, width: number): number {
  return Math.min(count - 1, Math.max(0, Math.round(x / width)));
}

/** Resistance past an edge: follows the finger at first, then gives less and less; never beyond `limit`. */
export function rubber(distance: number, limit: number): number {
  if (distance < 0) return -rubber(-distance, limit);
  return limit * (1 - Math.exp(-distance / limit));
}

/** How many speed lines to draw for a finger speed in px/s (none under 300, at most 24). */
export function speedLines(speed: number): number {
  return speed < 300 ? 0 : Math.min(24, Math.round((speed - 300) / 100));
}

/** Screen-shake amplitude in px for a finger speed in px/s (none under 600, at most 6). */
export function shakeFor(speed: number): number {
  return speed < 600 ? 0 : Math.min(6, (speed - 600) / 400);
}
