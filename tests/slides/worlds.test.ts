import { readFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { departure } from '../../src/slides/departure';
import { sumo } from '../../src/slides/sumo';
import { gacha } from '../../src/slides/gacha';
import { fuji } from '../../src/slides/fuji';
import { torii } from '../../src/slides/torii';
import { bento } from '../../src/slides/bento';
import { ganguro } from '../../src/slides/ganguro';
import { idol } from '../../src/slides/idol';
import { konbini } from '../../src/slides/konbini';
import { weather } from '../../src/slides/weather';
import { shinkansen } from '../../src/slides/shinkansen';
import { ctx, STATS } from './fixture';

const css = (w: string) => readFileSync(`src/slides/worlds/${w}.css`, 'utf8');

test('F departure: a platform sign with 出発 and the OS 01 number circle', () => {
  const el = departure(ctx());
  expect(el.textContent).toContain('出発');
  expect(el.querySelector('.os')!.textContent).toContain('01');
  expect(el.textContent).toContain('乗る年を選んでね');
});

test('F departure: year rows are still buttons that pick the year', () => {
  const onPickYear = vi.fn();
  const el = departure(ctx({ onPickYear }));
  const rows = el.querySelectorAll<HTMLButtonElement>('button.row');
  expect(rows).toHaveLength(2);
  rows[1].click();
  expect(onPickYear).toHaveBeenCalledWith(2024);
});

test('F departure: a huge play count stays on one line with an ellipsis', () => {
  const el = departure(ctx({ years: [{ year: 2025, plays: 123456789, eligible: true }] }));
  expect(el.querySelector('.row .pl')!.classList.contains('clip')).toBe(true);
  expect(css('f')).toMatch(/\.clip\s*{[^}]*white-space:\s*nowrap[^}]*text-overflow:\s*ellipsis/);
});

test('D sumo: a manga page — top panel, rank captions, Yokozuna splash last', () => {
  const el = sumo(ctx());
  expect(el.querySelector('.p1')).not.toBeNull();
  expect(el.querySelectorAll('.cap')).toHaveLength(4);
  const splash = el.querySelector<HTMLElement>('.splash')!;
  expect(splash.textContent).toContain('横綱');
  expect(splash.textContent).toContain(STATS.topArtists[0].name);
  expect(splash.textContent).toContain('ドン');
  const beats = [...el.querySelectorAll<HTMLElement>('[data-beat]')].map((b) => Number(b.dataset.beat));
  expect(Number(splash.dataset.beat)).toBe(Math.max(...beats));
  expect(splash.dataset.fx).toContain('hide');
});

test('D sumo: a long name in the splash is set to fit', () => {
  const long = 'X'.repeat(40);
  const el = sumo(ctx({ stats: { ...STATS, topArtists: [{ ...STATS.topArtists[0], name: long }, ...STATS.topArtists.slice(1)] } }));
  const nm = el.querySelector('.splash .nm')!;
  expect(nm.classList.contains('fit')).toBe(true);
  expect(nm.classList.contains('l3')).toBe(true);
  expect(css('d')).toMatch(/\.fit\s*{[^}]*overflow-wrap:\s*anywhere/);
});

test('D sumo: the top panel is screentone even if the scan fails to load', () => {
  expect(sumo(ctx()).querySelector('.p1')!.classList.contains('tone')).toBe(true);
  expect(css('d')).toMatch(/\.tone\s*{[^}]*radial-gradient/);
});

test('K gacha: a JRPG window with the #1 song, CRT scanlines and the flash', () => {
  const el = gacha(ctx());
  const t = el.textContent!;
  expect(t).toContain(STATS.topTracks[0].name);
  expect(t).toContain(STATS.topTracks[0].artist!);
  expect(t).toContain('SSR GET!');
  expect(el.querySelectorAll('.k-win').length).toBeGreaterThanOrEqual(2);
  expect(el.querySelector('.k-scan')).not.toBeNull();
  expect(el.querySelector('[data-fx~="flash"]')).not.toBeNull();
  expect(el.classList.contains('dark')).toBe(true);
});

test('K gacha: a long song name wraps inside the window', () => {
  expect(css('k')).toMatch(/\.k-song\s*{[^}]*overflow-wrap:\s*anywhere/);
});

test('I fuji: the weekly graph is a brushed ink mountain with a red seal on the peak', () => {
  const el = fuji(ctx());
  expect(el.textContent).toContain('Mar 10');
  expect(el.textContent).toContain('1,411');
  expect(el.textContent).toContain('富士');
  const ridge = el.querySelector('svg polygon.ink')!;
  expect(ridge.getAttribute('filter')).toMatch(/^url\(#brush-/);
  expect(el.querySelector('svg polygon.wash')).not.toBeNull();
  expect(el.querySelector('.seal')!.textContent).toBe('頂');
  expect(el.querySelector('.hero')!.textContent).toContain('1,411');
});

test('I fuji: two renders never share a filter id', () => {
  const id = (el: HTMLElement) => el.querySelector('filter')!.id;
  expect(id(fuji(ctx()))).not.toBe(id(fuji(ctx())));
});

test('C torii: the days count is cropped mega type that grows out of the station sign', () => {
  const el = torii(ctx());
  const hero = el.querySelector<HTMLElement>('.hero')!;
  expect(hero.textContent).toBe('341');
  expect(hero.dataset.fx).toContain('grow');
  expect(hero.dataset.fx).toContain('count');
  expect(hero.hasAttribute('data-crop')).toBe(true);
  expect(el.textContent).toContain('28,243');
  expect(el.querySelector('.g')).toBeNull(); // the gate tunnel lives in the 3D district now
  expect(css('c')).toMatch(/\.tor \.hero\s*{[^}]*var\(--face-num\)/);
});

test('J bento: a sports-paper league table of genres under a red vertical headline', () => {
  const el = bento(ctx());
  for (const g of STATS.genreShares.slice(0, 4)) { // top four; the rest fold into "other", as before
    expect(el.textContent).toContain(g.genre.toUpperCase());
    expect(el.textContent).toContain(`${Math.round(g.share * 100)}%`);
  }
  expect(el.querySelector('.h1')).not.toBeNull();
  expect(el.querySelector('.box .row')).not.toBeNull(); // the table keeps class box (the cut target)
  expect(el.querySelector('.h3')!.classList.contains('fit')).toBe(true);
  expect(el.querySelector('.hero')!.textContent).toBe('42%');
  expect(el.querySelector('.photo')).not.toBeNull();
  expect(el.querySelector('.credit')).not.toBeNull();
});

test('G ganguro: the top genre in chrome type, its share as the hero only when shares exist', () => {
  const el = ganguro(ctx());
  expect(el.textContent).toContain('CITY POP');
  expect(el.querySelector('.hero')!.textContent).toBe('42%');
  const bare = ganguro(ctx({ stats: { ...STATS, genreShares: undefined } }));
  expect(bare.querySelector('.hero')).toBeNull(); // no number is invented
  expect(bare.textContent).toContain('CITY POP');
});

test('G ganguro: a long genre steps down to the smallest size', () => {
  const el = ganguro(ctx({ stats: { ...STATS, topGenre: 'x'.repeat(40) } }));
  expect(el.querySelector('.nm')!.classList.contains('l3')).toBe(true);
});

test('Q idol: a gyaru magazine cover of the city, the #1 artist in the cover lines', () => {
  const el = idol(ctx());
  const t = el.textContent!;
  const a = STATS.topArtists[0];
  expect(t).toContain(a.name);
  expect(t).toContain('14%');
  expect(t).toContain('980');
  expect(t).toContain('3,826');
  expect(el.querySelector('.cover .credit')).not.toBeNull();
  expect(el.querySelector('.oshi')!.classList.contains('fit')).toBe(true);
  expect(el.querySelector('.hero')!.textContent).toContain('3,826');
});

test('B konbini: a riso receipt over the duotone night; the total is the hero; the stub stays for the pixel wipe', () => {
  const el = konbini(ctx());
  for (const tr of STATS.topTracks) expect(el.textContent).toContain(tr.name);
  expect(el.querySelector('.kon .rc')).not.toBeNull();
  expect(el.querySelector('.kon .bc')).not.toBeNull();
  expect(el.querySelector('.hero')!.textContent).toContain('28,243');
  expect(el.classList.contains('dark')).toBe(true);
  expect(el.querySelector('.credit')).not.toBeNull();
  expect(el.querySelector('.r .nm')!.classList.contains('clip')).toBe(true);
});

test('O weather: one red sun steps through the four seasons; the loudest season is the hero', () => {
  const el = weather(ctx());
  for (const n of ['Aoi Kaze', 'Hoshino Rei', 'Sora Takeda', 'Yuki Tsuki']) expect(el.textContent).toContain(n);
  const sun = el.querySelector<HTMLElement>('.sun')!;
  expect(sun.dataset.fx).toBe('steps orbit');
  expect(sun.dataset.path!.split(',')).toHaveLength(8);
  expect(el.querySelector('.hero')!.textContent).toContain('8,000');
  expect(el.textContent).toContain('SPRING');
});

test('I fuji: its arrival starts as the red sun draining into an ink ensō', () => {
  const el = fuji(ctx());
  const enso = el.querySelector<HTMLElement>('.enso')!;
  const lowest = Math.min(...[...el.querySelectorAll<HTMLElement>('[data-beat]')].map((b) => Number(b.dataset.beat)));
  expect(Number(enso.dataset.beat)).toBe(lowest);
  expect(enso.dataset.fx).toBe('drain');
});

test('L shinkansen: a kaiju poster; the beast is the ink-morph target; the days are the hero', () => {
  const el = shinkansen(ctx());
  expect(el.textContent).toContain('Hoshino Rei');
  expect(el.textContent).toContain('0 → top 5 in 105 days');
  expect(el.querySelector('.beast')).not.toBeNull();
  expect(el.querySelector('.hero')!.textContent).toBe('105');
  const climb = shinkansen(ctx({ stats: { ...STATS, fastestRiser: { artist: 'Late', via: 'halves', climb: 7 } } }));
  expect(climb.querySelector('.hero')!.textContent).toBe('7');
  const long = shinkansen(ctx({ stats: { ...STATS, fastestRiser: { artist: 'y'.repeat(40), via: 'race', days: 9 } } }));
  expect(long.querySelector('.title')!.classList.contains('l3')).toBe(true);
});
