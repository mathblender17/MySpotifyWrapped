import { expect, test } from 'vitest';

test('tests run in a non-UTC zone so UTC→local conversion is exercised', () => {
  expect(new Date('2024-12-31T16:00:00Z').getFullYear()).toBe(2025);
});
