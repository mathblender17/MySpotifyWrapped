import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { makeKit } from '../../src/lab/kit';

let vibrate: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vibrate = vi.fn(() => true);
  Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
});
afterEach(() => {
  localStorage.removeItem('ongaku:muted');
  Reflect.deleteProperty(navigator, 'vibrate');
});

test('the ride mute (ongaku:muted = 1) silences the lab vibration', () => {
  localStorage.setItem('ongaku:muted', '1');
  const kit = makeKit({ reduced: false, unlocked: () => true });
  kit.buzz(20);
  expect(vibrate).not.toHaveBeenCalled();
});

test('without the mute the lab vibrates once unlocked', () => {
  localStorage.setItem('ongaku:muted', '0');
  const kit = makeKit({ reduced: false, unlocked: () => true });
  kit.buzz(20);
  expect(vibrate).toHaveBeenCalledWith(20);
});

test('a throwing localStorage does not break the kit', () => {
  const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  const kit = makeKit({ reduced: false, unlocked: () => true });
  expect(() => kit.buzz(20)).not.toThrow();
  spy.mockRestore();
});
