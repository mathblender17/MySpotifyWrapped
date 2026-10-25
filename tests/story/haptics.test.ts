import { expect, test, vi } from 'vitest';
import { createHaptics } from '../../src/story/haptics';

test('haptics buzz only when allowed and supported', () => {
  const vibrate = vi.fn(() => true);
  let allowed = true;
  const h = createHaptics({ canBuzz: () => allowed, vibrate });
  h.buzz(10);
  allowed = false;
  h.buzz(20);
  expect(vibrate.mock.calls).toEqual([[10]]);
  // No vibrate at all (iOS): nothing happens, nothing throws.
  expect(() => createHaptics({ canBuzz: () => true, vibrate: undefined }).buzz(10)).not.toThrow();
});
