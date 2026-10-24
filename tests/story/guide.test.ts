import { expect, test } from 'vitest';
import { HOOKS } from '../../src/journey/hooks';
import { STATIONS } from '../../src/journey/stations';
import { createGuide } from '../../src/story/guide';

test('every station has a hook, and only stations do', () => {
  expect(Object.keys(HOOKS).sort()).toEqual(STATIONS.map((s) => s.id).sort());
});

test('the guide texts the hook, then its English subtitle', () => {
  const g = createGuide();
  g.say('sumo').progress(1);
  expect(g.el.textContent).toContain(HOOKS.sumo.jp);
  expect(g.el.textContent).toContain(HOOKS.sumo.en);
});

test('the guide types: halfway through, only part of the line is shown', () => {
  const g = createGuide();
  const tl = g.say('sumo');
  tl.progress(0.3);
  const shown = g.el.querySelector('.jp')!.textContent!;
  expect(shown.length).toBeGreaterThan(0);
  expect(shown.length).toBeLessThan(HOOKS.sumo.jp.length);
});

test('an unknown station says nothing and does not throw', () => {
  const g = createGuide();
  const tl = g.say('nope');
  expect(tl.duration()).toBe(0);
  expect(g.el.querySelector('.jp')!.textContent).toBe('');
});
