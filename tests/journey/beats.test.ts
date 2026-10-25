import { afterEach, expect, test, vi } from 'vitest';
import { gsap } from 'gsap';
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

test('steps snaps an element up in pixel steps; orbit walks it through its path, one point per following beat', () => {
  const el = html('<b data-beat="2" data-fx="steps orbit" data-path="0,100,40,0,80,20,90,100">o</b><i data-beat="3">a</i><i data-beat="4">b</i><i data-beat="5">c</i><i data-beat="6">d</i>');
  const tl = playBeats(el);
  const sun = el.querySelector('b')!;
  tl.progress(0.001);
  expect(gsap.getProperty(sun, 'x')).toBe(0);
  expect(gsap.getProperty(sun, 'y')).toBe(100);
  tl.progress(1);
  expect(gsap.getProperty(sun, 'x')).toBe(90);
  expect(gsap.getProperty(sun, 'y')).toBe(100);
  expect(sun.style.opacity).toBe('1');
});

test('orbit under reduced motion lands on the last point at once', () => {
  const el = html('<b data-beat="1" data-fx="steps orbit" data-path="0,0,10,10,20,20,30,40">o</b>');
  playBeats(el, { reduced: true }).progress(1);
  expect(gsap.getProperty(el.querySelector('b')!, 'x')).toBe(30);
  expect(gsap.getProperty(el.querySelector('b')!, 'y')).toBe(40);
});

test('drain turns a solid red sun into an ink ring', () => {
  const el = html('<b data-beat="1" data-fx="drain">o</b>');
  playBeats(el).progress(1);
  const b = el.querySelector('b')!;
  expect(b.style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(b.style.borderColor).toBe('rgb(20, 20, 20)');
});

test('brush wipes an element on from left to right, and is instant when reduced', () => {
  const el = html('<b data-beat="1" data-fx="brush">夜</b>');
  const tl = playBeats(el);
  tl.progress(0.3);
  const b = el.querySelector('b')!;
  expect(b.style.clipPath).toMatch(/inset\(0(px)? [1-9]/);
  tl.progress(1);
  expect(b.style.clipPath).toBe(''); // cleared at the end, so the text-shadow isn't clipped
  const r = html('<b data-beat="1" data-fx="brush">夜</b>');
  playBeats(r, { reduced: true }).progress(1);
  expect(r.querySelector('b')!.style.opacity).toBe('1');
});

test('beat groups are 0.6 s apart', async () => {
  const { beatTime } = await import('../../src/journey/beats');
  const root = document.createElement('div');
  root.innerHTML = '<b data-beat="1"></b><b data-beat="2"></b><b data-beat="3" id="third"></b>';
  expect(beatTime(root, root.querySelector('#third')!)).toBeCloseTo(1.2);
});
