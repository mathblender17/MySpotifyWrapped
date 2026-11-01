import { vi } from 'vitest';
import type { LabKit, MadeKit } from '../../src/lab/types';

/** `leave` is a vi.fn at runtime, so tests may assert on it. */
export type FakeKit = MadeKit & { registered: (() => void)[] };

/** A LabKit whose every effect is a spy; `leave` runs the registered cleanups. */
export function fakeKit(over: Partial<LabKit> = {}): FakeKit {
  const registered: (() => void)[] = [];
  const leave = vi.fn(() => registered.splice(0).forEach((f) => f()));
  const kit = {
    reduced: false,
    buzz: vi.fn(),
    sfx: { unlock: vi.fn(), chime: vi.fn(), don: vi.fn(), blip: vi.fn(), bell: vi.fn(), rumble: vi.fn(), dispose: vi.fn() },
    fx: { clack: vi.fn(), slam: vi.fn(), tick: vi.fn(), unlock: vi.fn(), dispose: vi.fn() },
    beds: { start: vi.fn(), stop: vi.fn(), playing: null, dispose: vi.fn() },
    tilt: { state: 'idle' as const, request: vi.fn(async () => true), stop: vi.fn(), on: vi.fn(() => () => {}) },
    onLeave: (fn: () => void) => { registered.push(fn); },
    ...over,
    leave,
    registered,
  };
  return kit as FakeKit;
}
