import { readFileSync } from 'node:fs';
import { beforeEach, expect, test } from 'vitest';
import { loadWorldFonts } from '../../src/style/fonts';

const links = () => [...document.head.querySelectorAll<HTMLLinkElement>('link[data-world]')];
beforeEach(() => links().forEach((l) => l.remove()));

test("a world's accent fonts load once, on demand", () => {
  loadWorldFonts('K');
  loadWorldFonts('K');
  expect(links()).toHaveLength(1);
  expect(links()[0].href).toContain('Press+Start+2P');
  expect(links()[0].href).toContain('display=swap');
});

test('worlds with no accent face add nothing', () => {
  loadWorldFonts('C');
  loadWorldFonts('J');
  expect(links()).toHaveLength(0);
});

test('the page itself only loads the core faces', () => {
  const html = readFileSync('index.html', 'utf8');
  for (const f of ['Bebas', 'Anton', 'Rampart', 'Hachi+Maru', 'Press+Start', 'Reggae', 'Shippori']) expect(html, f).not.toContain(f);
  for (const f of ['Dela+Gothic+One', 'Zen+Kaku+Gothic+New', 'DotGothic16', 'Yuji+Syuku', 'Archivo+Black']) expect(html, f).toContain(f);
});
