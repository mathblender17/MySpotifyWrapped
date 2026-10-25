import { expect, test } from 'vitest';
import { weather } from '../../src/slides/weather';
import { fuji } from '../../src/slides/fuji';
import { shinkansen } from '../../src/slides/shinkansen';
import { omikuji } from '../../src/slides/omikuji';
import { kanji } from '../../src/slides/kanji';
import { slides } from '../../src/slides';
import { STATIONS } from '../../src/journey/stations';
import { ctx, hasPink, STATS } from './fixture';

test('weather: each season’s top artist', () => {
  const t = weather(ctx()).textContent!;
  for (const n of ['Aoi Kaze', 'Hoshino Rei', 'Sora Takeda', 'Yuki Tsuki']) expect(t).toContain(n);
});

test('weather: an empty season says so instead of inventing a name', () => {
  const seasons = { ...STATS.seasons, autumn: { value: 0 } };
  expect(weather(ctx({ stats: { ...STATS, seasons } })).textContent).toContain('—');
});

test('fuji: the mountain is the weekly graph, the summit is the peak week', () => {
  const el = fuji(ctx());
  expect(el.querySelector('svg polygon')).not.toBeNull();
  expect(el.textContent).toContain('Mar 10');
  expect(el.textContent).toContain('1,411');
});

test('shinkansen: race wording for the race path', () => {
  const t = shinkansen(ctx()).textContent!;
  expect(t).toContain('Hoshino Rei');
  expect(t).toContain('0 → top 5 in 105 days');
});

test('shinkansen: an artist who hit the top 5 on the first day reads "in 1 day", never "0 days"', () => {
  const race = (days: number) => shinkansen(ctx({ stats: { ...STATS, fastestRiser: { artist: 'Binge', via: 'race', days } } })).textContent!;
  expect(race(0)).toContain('0 → top 5 in 1 day');
  expect(race(0)).not.toContain('0 days');
  expect(race(1)).toContain('0 → top 5 in 1 day');
  expect(race(1)).not.toContain('1 days');
});

test('shinkansen: climb wording for the halves path', () => {
  const t = shinkansen(ctx({ stats: { ...STATS, fastestRiser: { artist: 'Late', via: 'halves', climb: 7 } } })).textContent!;
  expect(t).toContain('up 7 places');
});

test('omikuji: fortune and personality', () => {
  const t = omikuji(ctx()).textContent!;
  expect(t).toContain('末吉');
  expect(t).toContain('The Night Owl');
  expect(t).toContain('Your best listening happened after 10 PM.');
});

test('kanji: the share card summarises the year', () => {
  const t = kanji(ctx()).textContent!;
  for (const v of ['夜', 'night', '28,243', 'Aoi Kaze', 'Signal Neon']) expect(t).toContain(v);
});

test('the slide registry covers exactly the 13 stations', () => {
  expect(Object.keys(slides).sort()).toEqual(STATIONS.map((s) => s.id).sort());
});

test('every act-3/4 slide carries gyaru pink', () => {
  for (const s of [weather, fuji, shinkansen, omikuji, kanji]) expect(hasPink(s(ctx()))).toBe(true);
});
