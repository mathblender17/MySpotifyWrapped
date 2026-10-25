import { expect, test, vi } from 'vitest';

// Record what the match-cut target looks like at the moment the transition measures it.
const seen: string[] = [];
vi.mock('../../src/journey/transitions', async (orig) => {
  const real = (await orig()) as typeof import('../../src/journey/transitions');
  return {
    runTransition: (type: never, out: HTMLElement | null, inEl: HTMLElement, o: { cut?: { to: string } }) => {
      const to = o.cut ? inEl.querySelector<HTMLElement>(o.cut.to) : null;
      if (to) seen.push(to.style.transform || 'none');
      return real.runTransition(type, out, inEl, o as never);
    },
  };
});

const { createStory } = await import('../../src/story/player');
const { slides } = await import('../../src/slides');
const { STATS, ctx } = await import('../slides/fixture');

test('a match cut measures its target in its resting place, before the beats move it', () => {
  const root = document.createElement('div');
  document.body.append(root);
  const s = createStory(root, { slides, ctx: ctx({ stats: STATS }), startAt: 6, reduced: false }); // konbini
  s.next(); // finish
  s.next(); // baton → gacha (.gac .card has a stamp beat: scale 2.2, rotate -12)
  s.destroy();
  expect(seen.length).toBeGreaterThan(0);
  expect(seen.at(-1)).toBe('none');
});

test('with no genres, torii rides straight to sumo: no clone or overlay is left behind', () => {
  const root = document.createElement('div');
  document.body.append(root);
  const stats = { ...STATS, genreShares: undefined, topGenre: undefined };
  const s = createStory(root, { slides, ctx: ctx({ stats }), startAt: 1, reduced: false });
  s.next(); // finish torii
  s.next(); // ride to sumo (bento and ganguro are passed through)
  expect(s.index).toBe(4);
  expect(root.querySelector('.cut-clone')).toBeNull();
  s.next(); // finish
  expect(root.querySelectorAll('.stage > *')).toHaveLength(1);
  s.destroy();
  root.remove();
});
