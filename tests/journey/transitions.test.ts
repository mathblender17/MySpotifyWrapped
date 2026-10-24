import { beforeEach, expect, test } from 'vitest';
import { runTransition } from '../../src/journey/transitions';
import type { Transition } from '../../src/journey/stations';

let stage: HTMLElement;
const slideEl = (cls: string, inner = '') => Object.assign(document.createElement('div'), { className: `ph ${cls}`, innerHTML: inner });
const hook = { jp: 'ちょ待って、1位のジャンルゎ…!!', en: 'Wait wait' };

beforeEach(() => {
  stage = document.createElement('div');
  document.body.replaceChildren(stage);
});

const TYPES: Transition[] = ['title', 'ride', 'cut', 'baton', 'phone', 'tease', 'breather'];

test.each(TYPES)('%s leaves only the incoming slide, fully visible', (type) => {
  const out = slideEl('tor', '<div class="g"></div>');
  stage.append(out);
  const inEl = slideEl('ben', '<div class="box"></div>');
  const tl = runTransition(type, out, inEl, { stage, cut: { from: '.tor .g', to: '.ben .box' }, hook });
  tl.progress(1);
  expect([...stage.children]).toEqual([inEl]);
  expect(inEl.style.opacity).toBe('1');
});

test('a cut whose source is missing (neighbour passed through) falls back to a ride', () => {
  const ride = runTransition('ride', slideEl('a'), slideEl('b'), { stage }).duration();
  const out = slideEl('tor');
  stage.append(out);
  const cut = runTransition('cut', out, slideEl('sumo'), { stage, cut: { from: '.tor .g', to: '.ben .box' } });
  expect(cut.duration()).toBe(ride);
});

test('a cut with no outgoing slide also falls back to a ride', () => {
  const ride = runTransition('ride', null, slideEl('b'), { stage }).duration();
  expect(runTransition('cut', null, slideEl('ben', '<div class="box"></div>'), { stage, cut: { from: '.tor .g', to: '.ben .box' } }).duration()).toBe(ride);
});

test('a real cut morphs a clone of the source shape', () => {
  const out = slideEl('tor', '<div class="g"></div>');
  stage.append(out);
  const tl = runTransition('cut', out, slideEl('ben', '<div class="box"></div>'), { stage, cut: { from: '.tor .g', to: '.ben .box' } });
  tl.progress(0.5);
  expect(stage.querySelector('.cut-clone')).not.toBeNull();
});

test('the phone slam shows the hook mid-transition', () => {
  const out = slideEl('ben');
  stage.append(out);
  const tl = runTransition('phone', out, slideEl('gan'), { stage, hook });
  tl.progress(0.5);
  expect(stage.textContent).toContain(hook.jp);
});

test.each(TYPES)('reduced motion turns %s into a 0.2s crossfade', (type) => {
  const out = slideEl('tor', '<div class="g"></div>');
  stage.append(out);
  const tl = runTransition(type, out, slideEl('ben', '<div class="box"></div>'), { stage, hook, reduced: true, cut: { from: '.tor .g', to: '.ben .box' } });
  expect(tl.duration()).toBeCloseTo(0.2);
});
