import { expect, test } from 'vitest';
import { countWords, readingHoldMs } from '../../src/story/pacing';

test('words: latin words count one each, CJK runs count a word per two characters', () => {
  expect(countWords('top 5 songs')).toBe(3);
  expect(countWords('今年の漢字')).toBe(3);
  expect(countWords('')).toBe(0);
});

test('the hold is 3 s plus 250 ms a word, kept between 6 and 10 s', () => {
  const card = (words: number) => Object.assign(document.createElement('div'), { textContent: Array(words).fill('w').join(' ') });
  expect(readingHoldMs(card(0))).toBe(6000);
  expect(readingHoldMs(card(20))).toBe(8000);
  expect(readingHoldMs(card(100))).toBe(10000);
});
