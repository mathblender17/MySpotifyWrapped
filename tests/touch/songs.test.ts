import { expect, test } from 'vitest';
import { gsap } from 'gsap';
import { idol } from '../../src/slides/idol';
import { konbini } from '../../src/slides/konbini';
import { TOUCH } from '../../src/touch';
import type { TouchKit } from '../../src/touch/kit';
import { ctx, STATS } from '../slides/fixture';

const fake = (stats = STATS, found: (t: { name: string }) => boolean = () => true) => {
  const log = { busy: 0, release: 0, played: [] as string[], marked: [] as Element[] };
  const kit = {
    stats, reduced: false,
    busy: () => { log.busy++; return () => { log.release++; }; },
    playTrack: async (t: { name: string }) => { log.played.push(t.name); return found(t); },
    sfx: {}, buzz: () => {}, mark: (e: Element) => { log.marked.push(e); }, dur: (s: number) => s,
  } as unknown as TouchKit;
  return { kit, log };
};
const settle = () => new Promise((r) => setTimeout(r, 0));
const withTrack = (artist?: string) => ({ ...STATS, soundtrack: { topArtistTrack: { name: 'Oshi Song', ...(artist ? { artist } : {}) } } }) as never;

test("oshi: tapping the cover plays the #1 artist's song and shows now playing", async () => {
  const stats = withTrack('Aoi Kaze');
  const el = idol(ctx({ stats }));
  const { kit, log } = fake(stats);
  TOUCH.idol!(el, kit);
  const cover = el.querySelector<HTMLElement>('.cover')!;
  expect(log.marked).toEqual([cover]);
  cover.click();
  expect(log.busy).toBe(1);
  await settle();
  expect(log.played).toEqual(['Oshi Song']);
  expect(log.release).toBe(1);
  expect(el.querySelector('.now')!.textContent).toBe('♪ now playing');
  expect(cover.contains(el.querySelector('.now'))).toBe(false);
  gsap.globalTimeline.totalTime(gsap.globalTimeline.totalTime() + 3);
  expect(el.querySelector('.now')).toBeNull();
});

test('oshi: no artist song → no mark', () => {
  for (const stats of [withTrack(), STATS]) {
    const el = idol(ctx({ stats }));
    const { kit, log } = fake(stats);
    TOUCH.idol!(el, kit);
    expect(log.marked).toEqual([]);
  }
});

test('konbini: each tap plays the next song on the receipt and stamps its line', async () => {
  const el = konbini(ctx());
  const { kit, log } = fake();
  TOUCH.konbini!(el, kit);
  const rc = el.querySelector<HTMLElement>('.rc')!;
  expect(log.marked).toEqual([rc]);
  const rows = [...el.querySelectorAll<HTMLElement>('.r')];
  for (let i = 0; i < 6; i++) {
    rc.click();
    await settle();
    expect(log.played[i]).toBe(STATS.topTracks[i % 5].name);
    expect(el.querySelectorAll('.r.now').length).toBe(1);
    expect(rows[i % 5].classList.contains('now')).toBe(true);
    expect(rows[i % 5].querySelector('.now, b')?.textContent ?? rows[i % 5].textContent).toContain('再生中');
  }
  expect(log.busy).toBe(6);
  expect(log.release).toBe(6);
});

test('konbini: a song with no preview leaves the line unstamped and the next tap moves on', async () => {
  const el = konbini(ctx());
  const { kit, log } = fake(STATS, (t) => t.name !== STATS.topTracks[1].name);
  TOUCH.konbini!(el, kit);
  const rc = el.querySelector<HTMLElement>('.rc')!;
  rc.click(); await settle();
  rc.click(); await settle();
  expect(el.querySelectorAll('.r.now').length).toBe(0);
  rc.click(); await settle();
  expect(log.played[2]).toBe(STATS.topTracks[2].name);
  expect(el.querySelectorAll('.r.now').length).toBe(1);
  expect(log.release).toBe(3);
});

test('konbini: no track has an artist → no mark', () => {
  const stats = { ...STATS, topTracks: STATS.topTracks.map((t) => ({ name: t.name })) } as never;
  const { kit, log } = fake(stats);
  TOUCH.konbini!(konbini(ctx({ stats })), kit);
  expect(log.marked).toEqual([]);
});

test('oshi: the now-playing sticker lasts 2.5 s even under reduced motion', async () => {
  const stats = withTrack('Aoi Kaze');
  const el = idol(ctx({ stats }));
  const { kit } = fake(stats);
  TOUCH.idol!(el, { ...kit, reduced: true, dur: () => 0 } as TouchKit);
  el.querySelector<HTMLElement>('.cover')!.click();
  await settle();
  const g = gsap.globalTimeline;
  g.totalTime(g.totalTime() + 1);
  expect(el.querySelector('.now')).not.toBeNull();
  g.totalTime(g.totalTime() + 2);
  expect(el.querySelector('.now')).toBeNull();
});
