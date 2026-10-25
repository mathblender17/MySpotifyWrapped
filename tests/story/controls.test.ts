import { expect, test, vi } from 'vitest';
import { createControls } from '../../src/story/controls';

test('controls: back, pause and next buttons with labels; the middle one flips to Play when paused', () => {
  const on = { prev: vi.fn(), next: vi.fn(), toggle: vi.fn() };
  const c = createControls(on);
  const btns = [...c.el.querySelectorAll('button')];
  expect(btns.map((b) => b.getAttribute('aria-label'))).toEqual(['Back', 'Pause', 'Next']);
  btns[0].click();
  btns[1].click();
  btns[2].click();
  expect([on.prev.mock.calls.length, on.toggle.mock.calls.length, on.next.mock.calls.length]).toEqual([1, 1, 1]);
  c.setPaused(true);
  expect(btns[1].getAttribute('aria-label')).toBe('Play');
  c.setPaused(false);
  expect(btns[1].getAttribute('aria-label')).toBe('Pause');
});
