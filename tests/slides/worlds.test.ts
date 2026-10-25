import { readFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { departure } from '../../src/slides/departure';
import { sumo } from '../../src/slides/sumo';
import { gacha } from '../../src/slides/gacha';
import { fuji } from '../../src/slides/fuji';
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
