import { expect, test } from 'vitest';
import { loadScores, saveScore, toMarkdown, verdict, type Score } from '../../src/lab/scorecard';

const memStore = (): Storage => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 } as Storage;
};
const throwing = (): Storage => ({ getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } }) as unknown as Storage;
const s = (g: Score['goosebumps'], c: Score['clarity'], sp: Score['speed'], id = 'f1-momentum'): Score => ({ id, goosebumps: g, clarity: c, speed: sp, note: '' });

test('verdict keeps when all three are at least 2', () => expect(verdict(s(2, 2, 3))).toBe('keep'));
test('verdict tunes when any is below 2 but goosebumps is above 0', () => expect(verdict(s(1, 3, 3))).toBe('tune'));
test('verdict kills when goosebumps is 0', () => expect(verdict(s(0, 3, 3))).toBe('kill'));

test('saveScore then loadScores round-trips through a Storage', () => {
  const st = memStore();
  const sc = s(3, 2, 2);
  expect(saveScore(sc, st)).toBe(true);
  expect(loadScores(st)[sc.id]).toEqual(sc);
});

test('a throwing Storage returns false but the score stays in memory for the session', () => {
  const st = throwing();
  const sc = s(3, 3, 3, 'blocked-exp');
  expect(saveScore(sc, st)).toBe(false);
  expect(loadScores(st)['blocked-exp']).toEqual(sc);
});

test('toMarkdown lists one row per score with its verdict', () => {
  const md = toMarkdown({ 'f1-momentum': s(3, 2, 2) }, { device: 'Pixel 7', date: '2026-11-02' });
  expect(md).toContain('| f1-momentum | 3 | 2 | 2 | keep |');
  expect(md).toContain('Pixel 7');
  expect(md).toContain('2026-11-02');
});
