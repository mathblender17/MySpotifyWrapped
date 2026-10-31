import { expect, test } from 'vitest';
import { BELL, chargePattern, CLACK, SLAM } from '../../src/feel/patterns';

test('constants are the exact arrays', () => {
  expect(CLACK).toEqual([18]);
  expect(SLAM).toEqual([40, 20, 15]);
  expect(BELL).toEqual([30, 60, 30]);
});

test('chargePattern pulses grow, pauses shrink, and the total is near the charge time', () => {
  const p = chargePattern(600);
  const pulses = p.filter((_, i) => i % 2 === 0);
  const pauses = p.filter((_, i) => i % 2 === 1);
  for (let i = 1; i < pulses.length; i++) expect(pulses[i]).toBeGreaterThanOrEqual(pulses[i - 1]);
  for (let i = 1; i < pauses.length; i++) expect(pauses[i]).toBeLessThanOrEqual(pauses[i - 1]);
  const sum = p.reduce((a, b) => a + b, 0);
  expect(Math.abs(sum - 600)).toBeLessThanOrEqual(60);
  expect(p.length).toBeLessThanOrEqual(30);
  expect(p.every((n) => n > 0)).toBe(true);
});

test('chargePattern never exceeds 30 entries however long the charge', () => {
  expect(chargePattern(5000).length).toBeLessThanOrEqual(30);
});

test('chargePattern of 0 or less is empty', () => {
  expect(chargePattern(0)).toEqual([]);
  expect(chargePattern(-10)).toEqual([]);
});

test('a very short charge is still one pulse and one pause', () => {
  expect(chargePattern(30).length).toBe(2);
});
