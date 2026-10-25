import { readdirSync, readFileSync, statSync } from 'node:fs';
import { expect, test } from 'vitest';
import { creditsLine, photoCredit } from '../../src/art/credits';
import { slides } from '../../src/slides';
import { playBeats } from '../../src/journey/beats';
import { ctx } from '../slides/fixture';

const PHOTO = 'Photo: Basile Morin, CC BY-SA 4.0';
const worlds = readdirSync('src/slides/worlds').map((f) => readFileSync(`src/slides/worlds/${f}`, 'utf8'));

test('the landing credits line names every found picture and links the CC BY-SA licence', () => {
  const el = Object.assign(document.createElement('div'), { innerHTML: creditsLine() });
  expect(el.textContent).toContain('Hokusai');
  expect(el.textContent).toContain('Basile Morin');
  expect(el.querySelector('a[href="https://creativecommons.org/licenses/by-sa/4.0/"]')).not.toBeNull();
  expect(el.querySelector('a[href="https://commons.wikimedia.org/w/index.php?curid=81420139"]')).not.toBeNull();
  expect(el.textContent).toMatch(/adapted.*shared under CC BY-SA 4\.0/);
});

test('the photo credit is plain, visible text outside any beat', () => {
  const el = Object.assign(document.createElement('div'), { innerHTML: photoCredit() });
  expect(el.textContent).toBe(PHOTO);
  expect(el.querySelector('[data-beat]')).toBeNull();
});

test('every slide that shows the Kabukicho photo carries its credit, even after the beats (reduced or finished)', () => {
  // The classes whose rules use the picture, e.g. ".idol .cover" → slide class "idol".
  const using = new Set(worlds.flatMap((css) => css.split('}').filter((r) => r.includes('kabukicho.webp')).map((r) => r.trim().match(/^\.(\S+)/)![1])));
  for (const [id, make] of Object.entries(slides)) {
    const el = make(ctx());
    if (![...using].some((c) => el.classList.contains(c))) continue;
    playBeats(el, { reduced: true }).progress(1);
    const credit = el.querySelector<HTMLElement>('.credit');
    expect(credit?.textContent, id).toBe(PHOTO);
    expect(credit!.closest('[data-beat]'), id).toBeNull();
    expect(credit!.parentElement, id).toBe(el); // at the slide's root: a filtered parent would trap it under the grain
  }
});

test('every rule that uses the picture also paints a colour, so the slide reads without it', () => {
  for (const css of worlds)
    for (const rule of css.split('}').filter((r) => r.includes('kabukicho.webp')))
      expect(rule).toMatch(/background-color|,\s*(#[0-9a-f]{3,8}|linear-gradient|radial-gradient)/i);
});

test('the picture is a WebP of at most 200 KB', () => {
  expect(statSync('public/art/kabukicho.webp').size).toBeLessThanOrEqual(200 * 1024);
});
