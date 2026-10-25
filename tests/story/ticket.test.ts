import { expect, test } from 'vitest';
import { createTicket } from '../../src/story/ticket';
import { STATIONS } from '../../src/journey/stations';

test('the ticket has one hidden back face, flip() toggles .flipped and fills the date and stamps at flip time', () => {
  const t = createTicket(STATIONS, STATIONS.map(() => true), true);
  expect(t.el.querySelectorAll('.back')).toHaveLength(1);
  expect(t.el.querySelector('.back')!.textContent).toBe('');
  t.el.querySelectorAll('.slot').forEach((s, i) => i < 2 && s.classList.add('on'));
  t.flip();
  expect(t.el.classList.contains('flipped')).toBe(true);
  expect(t.el.querySelector('.back')!.textContent).toContain('2 / 13');
  t.flip();
  expect(t.el.classList.contains('flipped')).toBe(false);
});
