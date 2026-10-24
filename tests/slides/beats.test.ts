import { expect, test } from 'vitest';
import { slides } from '../../src/slides';
import { playBeats } from '../../src/journey/beats';
import { ctx, STATS } from './fixture';

const beatsOf = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-beat]')];

test.each(Object.keys(slides))('%s plays in at least two beats', (id) => {
  const groups = new Set(beatsOf(slides[id](ctx())).map((b) => b.dataset.beat));
  expect(groups.size).toBeGreaterThanOrEqual(2);
});

test('sumo holds the yokozuna back for last', () => {
  const el = slides.sumo(ctx());
  const max = Math.max(...beatsOf(el).map((b) => Number(b.dataset.beat)));
  const yokozuna = beatsOf(el).find((b) => b.textContent!.includes('横綱'))!;
  expect(Number(yokozuna.dataset.beat)).toBe(max);
  expect(yokozuna.dataset.fx).toContain('hide');
});

test.each([
  ['torii', STATS.daysListened],
  ['torii', STATS.minutes],
  ['konbini', STATS.minutes],
  ['idol', STATS.topArtists[0].plays],
  ['fuji', STATS.peakWeek.value],
])('%s counts up to %i', (id, value) => {
  const counts = beatsOf(slides[id](ctx())).filter((b) => b.dataset.fx?.includes('count')).map((b) => Number(b.dataset.count));
  expect(counts).toContain(value);
});

test.each(Object.keys(slides))('%s still shows every stat once its beats have played', (id) => {
  // Whitespace-only nodes between blocks don't render; compare the visible characters.
  const norm = (s: string) => s.replace(/\s+/g, '');
  const fresh = norm(slides[id](ctx()).textContent!);
  const el = slides[id](ctx());
  playBeats(el).progress(1);
  expect(norm(el.textContent!)).toBe(fresh);
});
