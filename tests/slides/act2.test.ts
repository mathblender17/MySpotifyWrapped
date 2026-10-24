import { expect, test } from 'vitest';
import { sumo } from '../../src/slides/sumo';
import { idol } from '../../src/slides/idol';
import { konbini } from '../../src/slides/konbini';
import { gacha } from '../../src/slides/gacha';
import { ctx, hasPink, STATS } from './fixture';

test('sumo: top 5 artists in rank order with sumo ranks', () => {
  const el = sumo(ctx());
  const names = STATS.topArtists.map((a) => a.name);
  const t = el.textContent!;
  const positions = names.map((n) => t.indexOf(n));
  expect(positions.every((p) => p >= 0)).toBe(true);
  expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  expect(t).toContain('横綱');
});

test('idol: #1 artist and their share of the year', () => {
  const t = idol(ctx()).textContent!;
  expect(t).toContain('Aoi Kaze');
  expect(t).toContain('14%');
});

test('idol: share is simply omitted when unknown', () => {
  const t = idol(ctx({ stats: { ...STATS, topArtistShare: undefined } })).textContent!;
  expect(t).toContain('Aoi Kaze');
  expect(t).not.toContain('%');
});

test('konbini: a receipt of the top 5 songs with play counts and the year total', () => {
  const t = konbini(ctx()).textContent!;
  for (const tr of STATS.topTracks) expect(t).toContain(tr.name);
  expect(t).toContain('×336');
  expect(t).toContain('28,243');
});

test('gacha: the #1 song and its artist', () => {
  const t = gacha(ctx()).textContent!;
  expect(t).toContain('Signal Neon');
  expect(t).toContain('Aoi Kaze');
});

test('a hostile artist name renders as text, not markup', () => {
  const evil = '<img src=x onerror=alert(1)>';
  const stats = { ...STATS, topArtists: [{ name: evil, plays: 1, minutes: 1 }, ...STATS.topArtists.slice(1)] };
  const el = sumo(ctx({ stats }));
  expect(el.querySelector('img')).toBeNull();
  expect(el.textContent).toContain(evil);
});

test('every act-2 slide carries gyaru pink', () => {
  for (const s of [sumo, idol, konbini, gacha]) expect(hasPink(s(ctx()))).toBe(true);
});

test.each([
  [2025, '令和7年'], [2019, '令和元年'], [2018, '平成30年'], [2015, '平成27年'],
])('sumo: %i is written as %s', (year, era) => {
  expect(sumo(ctx({ stats: { ...STATS, year } })).textContent).toContain(era);
});
