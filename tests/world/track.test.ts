import { expect, test } from 'vitest';
import { stationT, trackFrame } from '../../src/world/track';

test('stations sit along the track in order, first at the start and last at the end', () => {
  const ts = Array.from({ length: 13 }, (_, i) => stationT(i));
  expect(ts[0]).toBe(0);
  expect(ts[12]).toBe(1);
  for (let i = 1; i < 13; i++) expect(ts[i]).toBeGreaterThan(ts[i - 1]);
});

test('the camera rides 2.2 above the rail and looks ahead', () => {
  for (const t of [0, 0.5, 1]) {
    const { pos, look } = trackFrame(t);
    expect(pos.y).toBeCloseTo(2.2, 5);
    expect(pos.distanceTo(look)).toBeGreaterThan(0.1);
  }
  const a = trackFrame(0.3);
  const b = trackFrame(0.31);
  // looking roughly the way the train moves
  expect(a.look.clone().sub(a.pos).dot(b.pos.clone().sub(a.pos))).toBeGreaterThan(0);
});
