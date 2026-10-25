import { afterEach, expect, test, vi } from 'vitest';
import { createHint } from '../../src/story/hint';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

test('the hint shows on the first ride only and goes on the first tap', () => {
  const h = createHint();
  expect(h.el.hidden).toBe(false);
  expect(h.el.textContent).toContain('タップ or スワイプ');
  expect(h.el.textContent).toContain('tap or swipe');
  h.dismiss();
  expect(h.el.isConnected).toBe(false);
  expect(createHint().el.hidden).toBe(true);
});

test('the hint still dismisses when storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  const h = createHint();
  document.body.append(h.el);
  expect(() => h.dismiss()).not.toThrow();
  expect(h.el.isConnected).toBe(false);
});
