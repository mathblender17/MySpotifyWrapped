import { describe, expect, test } from 'vitest';
import { fortune, kanji, personality, traits } from '../../src/stats/readings';
import { p } from './p';

describe('personality', () => {
  test('the trait furthest past its threshold wins', () => {
    expect(personality({ loyalty: 0.3, variety: 0.3 }).id).toBe('devotee'); // 0.3/0.15=2.0 beats 0.3/0.25=1.2
  });

  test('no trait past its threshold is balanced', () => {
    expect(personality({}).id).toBe('balanced');
    expect(personality({ variety: 0.1 })).toEqual({ id: 'balanced', name: 'The Balanced', jp: '中庸', line: 'A little of everything, perfectly measured.' });
  });
});

describe('fortune', () => {
  test.each([
    [0.5, '大吉'], [0.36, '中吉'], [0.2, '小吉'], [0.1, '吉'], [0.01, '末吉'], [0, '凶'],
  ])('novelty %f draws %s', (novelty, jp) => {
    expect(fortune({ novelty }).jp).toBe(jp);
  });

  test('unknown novelty draws 吉', () => {
    expect(fortune({})).toEqual({ jp: '吉', en: 'Blessing' });
  });
});

test('kanji is personality × peak season', () => {
  expect(kanji('nightowl', 'summer')).toEqual({ kanji: '夜', meaning: 'night' });
  expect(kanji('balanced', 'winter')).toEqual({ kanji: '静', meaning: 'calm' });
});

describe('traits', () => {
  const firstSeen = new Map([['Old', new Date('2023-01-01T00:00')], ['Fresh', new Date('2025-02-01T00:00')]]);
  const year = [
    p('2025-02-01T23:30', 'Fresh', 'a', 60_000, true),
    p('2025-02-02T04:00', 'Old', 'b', 60_000, false),
    p('2025-02-03T12:00', 'Old', 'b', 60_000, false),
    p('2025-02-04T12:00', 'Old', 'c', 60_000, false),
  ];

  test('computes each trait from the year', () => {
    expect(traits(year, firstSeen, true, 0.75)).toEqual({ variety: 0.5, loyalty: 0.75, novelty: 0.25, nightOwl: 0.25, skipRate: 0.25 });
  });

  test('novelty is unknowable without earlier years of data', () => {
    expect(traits(year, firstSeen, false, 0.75).novelty).toBeUndefined();
  });

  test('skipRate is undefined when the source has no skip info', () => {
    expect(traits([p('2025-02-03T12:00', 'Old')], firstSeen, true, 1).skipRate).toBeUndefined();
  });
});
