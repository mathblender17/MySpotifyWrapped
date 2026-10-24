import { beforeEach, describe, expect, test } from 'vitest';
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

describe('pixel wipe into the gacha (morph pixelate)', () => {
  const cut = { from: '.kon .bc', to: '.gac .card' };
  const pair = () => {
    const out = slideEl('kon', '<div class="bc"></div>');
    stage.append(out);
    return { out, inEl: slideEl('gac', '<div class="card"></div>') };
  };

  test('lasts 1.0 s and covers the stage with a 12×21 block grid at the midpoint', () => {
    const { out, inEl } = pair();
    const tl = runTransition('baton', out, inEl, { stage, cut, morph: 'pixelate' });
    expect(tl.duration()).toBeCloseTo(1.0);
    tl.progress(0.5);
    expect(stage.querySelectorAll('.pix')).toHaveLength(252);
  });

  test('leaves only the incoming slide', () => {
    const { out, inEl } = pair();
    const tl = runTransition('baton', out, inEl, { stage, cut, morph: 'pixelate' });
    tl.progress(1);
    expect([...stage.children]).toEqual([inEl]);
    expect(inEl.style.opacity).toBe('1');
  });

  test('without the receipt stub it falls back to a ride', () => {
    const ride = runTransition('ride', slideEl('a'), slideEl('b'), { stage }).duration();
    const out = slideEl('tor');
    stage.append(out);
    expect(runTransition('baton', out, slideEl('gac'), { stage, cut, morph: 'pixelate' }).duration()).toBe(ride);
  });

  test('reduced motion is the 0.2 s crossfade', () => {
    const { out, inEl } = pair();
    expect(runTransition('baton', out, inEl, { stage, cut, morph: 'pixelate', reduced: true }).duration()).toBeCloseTo(0.2);
  });
});
