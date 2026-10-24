import { expect, test } from 'vitest';
import { parseRoute } from '../src/route';

test('reads the dev shortcut', () => {
  expect(parseRoute('?data=demo&station=7&year=2025')).toEqual({ data: 'demo', station: 7, year: 2025 });
});

test('no query, no route', () => {
  expect(parseRoute('')).toEqual({});
});

test('ignores stations outside 1–13 and unknown data sources', () => {
  expect(parseRoute('?data=evil&station=99&year=abc')).toEqual({});
  expect(parseRoute('?station=0')).toEqual({});
});

test('world preview: ?world=1&station=N opens the 3D district alone', () => {
  expect(parseRoute('?world=1&station=10')).toEqual({ world: true, station: 10 });
});
