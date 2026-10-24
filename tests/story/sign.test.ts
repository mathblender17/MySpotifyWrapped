import { expect, test } from 'vitest';
import { STATIONS } from '../../src/journey/stations';
import { createSign } from '../../src/story/sign';

test('the sign names the station in the F language, in its accent', () => {
  const sign = createSign();
  const tl = sign.show(STATIONS[4]);
  const t = sign.el.textContent!;
  for (const s of ['OS', '05', '番付', 'Banzuke']) expect(t).toContain(s);
  expect(sign.el.style.getPropertyValue('--sign-accent')).toBe('#e60033');
  expect(tl.duration()).toBeCloseTo(0.45);
});

test('a long English name gets the shrink-to-fit class', () => {
  const sign = createSign();
  sign.show({ ...STATIONS[4], nameEn: 'A'.repeat(40) });
  expect(sign.el.classList.contains('long')).toBe(true);
  sign.show(STATIONS[4]);
  expect(sign.el.classList.contains('long')).toBe(false);
});

test('docking takes 0.25 s; reduced motion is instant', () => {
  expect(createSign().dock().duration()).toBeCloseTo(0.25);
  const r = createSign(true);
  expect(r.show(STATIONS[0]).duration()).toBe(0);
  expect(r.dock().duration()).toBe(0);
});
