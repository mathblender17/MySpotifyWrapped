import { beforeEach, describe, expect, test } from 'vitest';
import { gsap } from 'gsap';
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

test('the phone slam crumples the old page away', () => {
  const out = slideEl('ben');
  stage.append(out);
  const tl = runTransition('phone', out, slideEl('gan'), { stage, hook });
  tl.progress(0.95);
  expect(gsap.getProperty(out, 'scale')).toBeCloseTo(0.2);
  expect(Number(gsap.getProperty(out, 'opacity'))).toBe(0);
});

describe('flight morphs: shrink-to-headline and panel-to-cover', () => {
  const shrinkCut = { from: '.tor .hero', to: '.ben .h1' };
  const coverCut = { from: '.sumo .splash', to: '.idol .cover' };
  const toriiOut = () => { const o = slideEl('tor', '<b class="hero">341</b>'); stage.append(o); return o; };

  const rect = (el: Element, left: number, top: number, width: number, height: number) =>
    (el.getBoundingClientRect = () => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} }));

  test('shrink scales a clone of the big number down into the headline (text shrinks, not its box)', () => {
    const out = toriiOut();
    const inEl = slideEl('ben', '<div class="h1">首位</div>');
    rect(stage, 0, 0, 210, 373);
    rect(out.querySelector('.hero')!, 0, 60, 200, 100);
    rect(inEl.querySelector('.h1')!, 160, 30, 40, 120);
    const tl = runTransition('cut', out, inEl, { stage, cut: shrinkCut, morph: 'shrink' });
    tl.progress(0.74);
    const clone = stage.querySelector<HTMLElement>('.cut-clone')!;
    expect(clone.style.width).toBe('200px');
    expect(Number(gsap.getProperty(clone, 'scaleX'))).toBeCloseTo(0.2, 1);
    expect(Number(gsap.getProperty(clone, 'x'))).toBeCloseTo(160, 0);
  });

  test('shrink takes 0.8 s and leaves only the new slide', () => {
    const inEl = slideEl('ben', '<div class="h1">首位</div>');
    const tl = runTransition('cut', toriiOut(), inEl, { stage, cut: shrinkCut, morph: 'shrink' });
    expect(tl.duration()).toBeCloseTo(0.8);
    tl.progress(0.5);
    expect(stage.querySelector('.cut-clone')).not.toBeNull();
    tl.progress(1);
    expect([...stage.children]).toEqual([inEl]);
  });

  test('cover holds the tease card, then flies the splash panel onto the cover (1.4 s)', () => {
    const out = slideEl('sumo', '<div class="splash">横綱</div>');
    stage.append(out);
    const inEl = slideEl('idol', '<div class="cover"></div>');
    const tl = runTransition('tease', out, inEl, { stage, cut: coverCut, morph: 'cover', hook });
    expect(tl.duration()).toBeCloseTo(1.4);
    tl.progress(0.2);
    expect(stage.textContent).toContain(hook.en);
    tl.progress(0.75);
    expect(stage.querySelector('.cut-clone')).not.toBeNull();
    tl.progress(1);
    expect([...stage.children]).toEqual([inEl]);
  });

  test.each([['shrink', shrinkCut], ['cover', coverCut]] as const)('%s without its source shape falls back to a ride', (morph, cut) => {
    const ride = runTransition('ride', slideEl('a'), slideEl('b'), { stage }).duration();
    const out = slideEl('wx');
    stage.append(out);
    expect(runTransition('cut', out, slideEl('ben', '<div class="h1"></div><div class="cover"></div>'), { stage, cut, morph }).duration()).toBe(ride);
  });

  test('reduced motion is the 0.2 s crossfade', () => {
    expect(runTransition('cut', toriiOut(), slideEl('ben', '<div class="h1"></div>'), { stage, cut: shrinkCut, morph: 'shrink', reduced: true }).duration()).toBeCloseTo(0.2);
  });
});
