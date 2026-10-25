import { afterEach, expect, test, vi } from 'vitest';
import { playBeats, prefersReducedMotion } from '../../src/journey/beats';

const html = (s: string) => {
  const el = document.createElement('div');
  el.innerHTML = s;
  return el;
};

afterEach(() => vi.unstubAllGlobals());

test('every beat element ends fully visible', () => {
  const el = html('<p data-beat="1">a</p><p data-beat="2" data-fx="stamp">b</p><p data-beat="3" data-fx="drop">c</p>');
  playBeats(el).progress(1);
  for (const p of el.querySelectorAll<HTMLElement>('[data-beat]')) expect(p.style.opacity).toBe('1');
});

test('count ends on the formatted value with its suffix', () => {
  const el = html('<b data-beat="1" data-fx="count" data-count="28243" data-suffix=" min">0</b>');
  playBeats(el).progress(1);
  expect(el.querySelector('b')!.textContent).toBe('28,243 min');
});

test('later groups are still hidden at the start, and groups order numerically', () => {
  const el = html('<p id="ten" data-beat="10">x</p><p id="two" data-beat="2">y</p>');
  const tl = playBeats(el);
  tl.progress(0);
  expect((el.querySelector('#ten') as HTMLElement).style.opacity).toBe('0');
  // beat 2 must finish before beat 10 starts
  tl.progress(0.45);
  expect(Number((el.querySelector('#two') as HTMLElement).style.opacity)).toBeGreaterThan(Number((el.querySelector('#ten') as HTMLElement).style.opacity));
});

test('type reveals children one by one', () => {
  const el = html('<div data-beat="1" data-fx="type"><i>1</i><i>2</i><i>3</i></div>');
  const tl = playBeats(el);
  tl.progress(0);
  expect((el.querySelectorAll('i')[2] as HTMLElement).style.opacity).toBe('0');
  tl.progress(1);
  expect((el.querySelectorAll('i')[2] as HTMLElement).style.opacity).toBe('1');
});

test('reduced motion: zero duration, everything visible', () => {
  const el = html('<p data-beat="1">a</p><b data-beat="2" data-fx="count" data-count="5">0</b>');
  const tl = playBeats(el, { reduced: true });
  expect(tl.duration()).toBe(0);
  tl.progress(1);
  expect(el.querySelector('b')!.textContent).toBe('5');
  expect((el.querySelector('p') as HTMLElement).style.opacity).toBe('1');
});

test('elements without data-beat are untouched', () => {
  const el = html('<p id="plain">a</p><p data-beat="1">b</p>');
  playBeats(el).progress(1);
  expect((el.querySelector('#plain') as HTMLElement).style.opacity).toBe('');
});

test('prefersReducedMotion honours the media query and ?reduced=1', () => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') }));
  expect(prefersReducedMotion()).toBe(true);
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  expect(prefersReducedMotion()).toBe(false);
  history.replaceState(null, '', '/?reduced=1');
  expect(prefersReducedMotion()).toBe(true);
  history.replaceState(null, '', '/');
});

test('grow swells an element from a corner to full size; with count it still ends on the value', () => {
  const el = html('<b data-beat="1" data-fx="grow count" data-count="341" data-suffix="">0</b>');
  const tl = playBeats(el);
  tl.progress(0.02);
  const b = el.querySelector('b')!;
  expect(Number(b.style.transform.match(/scale\(([\d.]+)/)?.[1] ?? 1)).toBeLessThan(0.5);
  tl.progress(1);
  expect(b.style.opacity).toBe('1');
  expect(b.style.transform).not.toMatch(/scale\(0/);
  expect(b.textContent).toBe('341');
});

test('grow is instant under reduced motion', () => {
  const el = html('<b data-beat="1" data-fx="grow">x</b>');
  playBeats(el, { reduced: true }).progress(1);
  expect(el.querySelector('b')!.style.opacity).toBe('1');
});
