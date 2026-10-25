import { gsap } from 'gsap';
import { DESIGN_H, DESIGN_W } from '../story/frame';
import type { Transition } from './stations';

/** Art spec §6 morphs: pixelate, shrink-to-headline, panel-to-cover, neon-takeover, ink-to-beast. */
export type Morph = 'pixelate' | 'shrink' | 'cover' | 'neon' | 'ink';

export type TransitionOpts = {
  stage: HTMLElement;
  cut?: { from: string; to: string };
  hook?: { jp: string; en: string };
  reduced?: boolean;
  /** The 3D world behind the story, and the stations we're moving between. */
  world?: { travel(from: number, to: number, seconds: number): gsap.core.Timeline };
  from?: number;
  to?: number;
  /** A style morph on arrival (art spec §6). Falls back to a ride when its source shape is missing. */
  morph?: Morph;
};

const WORLD_RIDE = 1.6;
const WORLD_BREATHER = 2.6;

const overlay = (stage: HTMLElement, cls: string, html = '') => {
  const el = Object.assign(document.createElement('div'), { className: `tx-overlay ${cls}`, innerHTML: html });
  stage.append(el);
  return el;
};

/** Position of `el` inside the scaled stage, in design pixels. */
function boxIn(stage: HTMLElement, el: Element) {
  const s = stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const k = s.width / DESIGN_W || 1;
  return { left: (r.left - s.left) / k, top: (r.top - s.top) / k, width: r.width / k, height: r.height / k };
}

const PIX_COLS = 12;
const PIX_ROWS = 21;
const PIX_COLORS = ['#2b1a6b', '#5b2a8a', '#b4447e', '#ff8a5b', '#ffd36b']; // world K's dithered sunset

/** Same order every time: a seeded shuffle (LCG), so the wipe is deterministic. */
function shuffled<T>(items: T[], seed = 7): T[] {
  const a = [...items];
  let x = seed;
  for (let i = a.length - 1; i > 0; i--) {
    x = (x * 1103515245 + 12345) % 2147483648;
    const j = x % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pixel wipe into world K: blocks in K's palette cover the old slide (0.5 s), the slides swap under them, the blocks
 * clear in reverse (0.5 s). A block wipe, not a true mosaic: CSS can't mosaic arbitrary DOM, and SVG filters on HTML
 * are unreliable on iOS Safari.
 */
function pixelWipe(tl: gsap.core.Timeline, out: HTMLElement, inEl: HTMLElement, stage: HTMLElement) {
  const grid = overlay(stage, 'pixwipe');
  const blocks = Array.from({ length: PIX_COLS * PIX_ROWS }, (_, i) => {
    const b = document.createElement('i');
    b.className = 'pix';
    b.style.cssText = `left:${((i % PIX_COLS) * 100) / PIX_COLS}%;top:${(Math.floor(i / PIX_COLS) * 100) / PIX_ROWS}%;background:${PIX_COLORS[(i * 7) % PIX_COLORS.length]};opacity:0`;
    return b;
  });
  grid.append(...blocks);
  const order = shuffled(blocks);
  const step = 0.5 / order.length;
  tl.set(inEl, { opacity: 0 }, 0);
  tl.to(order, { opacity: 1, duration: 0, stagger: step }, 0);
  tl.set(out, { opacity: 0 }, 0.5);
  tl.set(inEl, { opacity: 1 }, 0.5);
  tl.to([...order].reverse(), { opacity: 0, duration: 0, stagger: step }, 0.5);
  tl.set({}, {}, 1.0);
  return [grid];
}

/**
 * A flight morph: a clone of `from` lands on `to`'s box with one uniform scale (so a big number's text shrinks into a
 * headline without distorting, a panel grows into a cover). The clone flies inside a host carrying the source slide's
 * class, so the slide's own CSS (`.tor .hero`, `.sumo .splash`) still styles it. Hidden until `at`; 0.8 s from `at`.
 */
function flight(tl: gsap.core.Timeline, out: HTMLElement, inEl: HTMLElement, stage: HTMLElement, from: Element, to: Element, at = 0) {
  const a = boxIn(stage, from);
  const b = boxIn(stage, to);
  const host = document.createElement('div');
  host.className = [...out.classList].filter((c) => c !== 'ph' && c !== 'grain' && c !== 'dark').concat('cut-host').join(' ');
  const clone = from.cloneNode(true) as HTMLElement;
  clone.classList.add('cut-clone');
  Object.assign(clone.style, { position: 'absolute', margin: '0', left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, transformOrigin: '0 0', opacity: '1' });
  host.append(clone);
  stage.append(host);
  const k = a.width && a.height ? Math.min(b.width / a.width, b.height / a.height) : 1;
  tl.set(host, { opacity: 0 }, 0);
  tl.set(host, { opacity: 1 }, at);
  tl.to(out, { opacity: 0, duration: 0.3 }, at);
  tl.fromTo(inEl, { opacity: 0 }, { opacity: 1, duration: 0.4 }, at + 0.4);
  tl.fromTo(
    clone,
    { x: 0, y: 0, scale: 1 },
    { x: b.left + (b.width - a.width * k) / 2 - a.left, y: b.top + (b.height - a.height * k) / 2 - a.top, scale: k, duration: 0.6, ease: 'power3.inOut' },
    at,
  );
  tl.to(clone, { opacity: 0, duration: 0.2 }, at + 0.6);
  return [host];
}

/** Neon takeover (Q → B): the cover's neon floods the screen pink, the slides swap under it, and it splits into the
 * two riso inks (pink, navy) sliding apart. 0.8 s. */
function neon(tl: gsap.core.Timeline, out: HTMLElement, inEl: HTMLElement, stage: HTMLElement) {
  const flood = overlay(stage, 'neon');
  const a = overlay(stage, 'neon-a');
  const b = overlay(stage, 'neon-b');
  tl.set(inEl, { opacity: 0 }, 0);
  tl.set([a, b], { opacity: 0 }, 0);
  tl.fromTo(flood, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.in' }, 0);
  tl.set(out, { opacity: 0 }, 0.3);
  tl.set(inEl, { opacity: 1 }, 0.3);
  tl.set(flood, { opacity: 0 }, 0.3);
  tl.set([a, b], { opacity: 1 }, 0.3);
  tl.to(a, { xPercent: -100, duration: 0.5, ease: 'power3.in' }, 0.3);
  tl.to(b, { xPercent: 100, duration: 0.5, ease: 'power3.in' }, 0.3);
  return [flood, a, b];
}

const BLOT = 40; // the ink blot's base size, design px

/** Ink to beast (I → L): an ink blot grows from Fuji's summit to cover the stage, the slides swap under it, and it
 * shrinks into the kaiju's silhouette. 0.9 s. */
function ink(tl: gsap.core.Timeline, out: HTMLElement, inEl: HTMLElement, stage: HTMLElement, from: Element, to: Element) {
  const a = boxIn(stage, from);
  const b = boxIn(stage, to);
  const blot = overlay(stage, 'ink-blot');
  const cx = a.left + a.width / 2 - BLOT / 2; // the summit: top centre of the mountain
  const cy = a.top - BLOT / 2;
  Object.assign(blot.style, { inset: 'auto', left: `${cx}px`, top: `${cy}px`, width: `${BLOT}px`, height: `${BLOT}px` });
  // Cover the farthest stage corner from the blot's centre; the rough brush edge dips to ~80% of the circle.
  const [ox, oy] = [cx + BLOT / 2, cy + BLOT / 2];
  const reach = Math.max(...[[0, 0], [DESIGN_W, 0], [0, DESIGN_H], [DESIGN_W, DESIGN_H]].map(([x, y]) => Math.hypot(x - ox, y - oy)));
  const fill = (reach / 0.8) / (BLOT / 2);
  tl.set(inEl, { opacity: 0 }, 0);
  tl.fromTo(blot, { scale: 0.2 }, { scale: fill, duration: 0.45, ease: 'power2.in' }, 0);
  tl.set(out, { opacity: 0 }, 0.45);
  tl.set(inEl, { opacity: 1 }, 0.45);
  const to2 = { x: b.left + b.width / 2 - BLOT / 2 - cx, y: b.top + b.height / 2 - BLOT / 2 - cy, scale: Math.max(b.width, b.height) / BLOT || 1 };
  tl.to(blot, { ...to2, duration: 0.35, ease: 'power3.out' }, 0.45);
  tl.to(blot, { opacity: 0, duration: 0.1 }, 0.8);
  return [blot];
}

/** With a world, a ride hands the screen over: the card flies off, the train travels, the next card drops in. */
function worldRide(tl: gsap.core.Timeline, out: HTMLElement | null, inEl: HTMLElement, travel: gsap.core.Timeline) {
  if (out) tl.to(out, { scale: 0.7, yPercent: -120, opacity: 0, duration: 0.4, ease: 'power2.in' }, 0);
  tl.set(inEl, { opacity: 0 }, 0);
  tl.add(travel, 0.4);
  tl.fromTo(inEl, { yPercent: -60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.4)' }, 0.4 + travel.duration());
  return [];
}

function ride(tl: gsap.core.Timeline, out: HTMLElement | null, inEl: HTMLElement, stage: HTMLElement) {
  const speed = overlay(stage, 'speed');
  tl.fromTo(speed, { opacity: 0 }, { opacity: 1, duration: 0.3, yoyo: true, repeat: 1 }, 0);
  if (out) tl.to(out, { xPercent: -100, duration: 0.9, ease: 'power3.inOut' }, 0);
  tl.fromTo(inEl, { xPercent: 100 }, { xPercent: 0, duration: 0.9, ease: 'power3.inOut' }, 0);
  return [speed];
}

/**
 * Build the move from `out` to `inEl` inside `stage` as a paused timeline. `inEl` is added at once (starting hidden or
 * off-stage); when the timeline completes only `inEl` is left — out, clones and overlays are removed.
 */
export function runTransition(type: Transition, out: HTMLElement | null, inEl: HTMLElement, o: TransitionOpts): gsap.core.Timeline {
  const { stage } = o;
  const tl = gsap.timeline({ paused: true });
  const moving = !!o.world && o.from !== undefined && o.to !== undefined && o.from !== o.to;
  const travel = (s: number) => o.world!.travel(o.from!, o.to!, s).paused(false);
  const anyRide = () => (moving ? worldRide(tl, out, inEl, travel(WORLD_RIDE)) : ride(tl, out, inEl, stage));
  let parallel = moving; // most types glide the camera alongside; world rides and breathers own the travel
  stage.append(inEl);
  tl.set(inEl, { opacity: 1 }, 0);
  let extras: Element[] = [];

  if (o.reduced) {
    tl.fromTo(inEl, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0);
    if (out) tl.to(out, { opacity: 0, duration: 0.2 }, 0);
    if (moving) tl.add(travel(0.2), 0);
    parallel = false;
  } else if (o.morph) {
    const from = out && o.cut ? out.querySelector(o.cut.from) : null;
    const to = o.cut ? inEl.querySelector(o.cut.to) : null;
    if (!from || (o.morph !== 'pixelate' && !to)) {
      // The station before may have been passed through: no shape to carry over, so just ride.
      extras = anyRide();
      parallel = false;
    } else if (o.morph === 'pixelate') extras = pixelWipe(tl, out!, inEl, stage);
    else if (o.morph === 'shrink') extras = flight(tl, out!, inEl, stage, from, to!);
    else if (o.morph === 'neon') extras = neon(tl, out!, inEl, stage);
    else if (o.morph === 'ink') extras = ink(tl, out!, inEl, stage, from, to!);
    else {
      // cover: the tease card holds the hook, then the splash panel flies onto the magazine cover.
      const card = overlay(stage, 'tease', `<p></p>`);
      card.querySelector('p')!.textContent = o.hook?.en ?? '';
      tl.fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0);
      tl.set(out, { opacity: 0 }, 0.3);
      tl.set(inEl, { opacity: 0 }, 0);
      tl.to(card, { opacity: 0, duration: 0.3 }, 0.6);
      extras = [card, ...flight(tl, out!, inEl, stage, from, to!, 0.6)];
    }
  } else if (type === 'title') {
    tl.fromTo(inEl, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0);
  } else if (type === 'cut' || type === 'baton') {
    const from = out && o.cut ? out.querySelector(o.cut.from) : null;
    const to = o.cut ? inEl.querySelector(o.cut.to) : null;
    if (!from || !to) {
      // The station before this one may have been passed through: no shape to carry over, so just ride.
      extras = anyRide();
      parallel = false;
    } else {
      const a = boxIn(stage, from);
      const b = boxIn(stage, to);
      const clone = from.cloneNode(true) as HTMLElement;
      clone.classList.add('cut-clone');
      Object.assign(clone.style, { position: 'absolute', margin: '0', left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, zIndex: '5' });
      stage.append(clone);
      extras = [clone];
      tl.fromTo(inEl, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.4);
      tl.to(out, { opacity: 0, duration: 0.3 }, 0);
      tl.to(clone, { left: b.left, top: b.top, width: b.width, height: b.height, duration: 0.6, ease: 'power3.inOut' }, 0.1);
      tl.to(clone, { opacity: 0, duration: 0.2 }, 0.6);
    }
  } else if (type === 'phone') {
    const phone = overlay(stage, 'bigphone', `<div class="scr"><div class="h">✉ 新着ﾒｰﾙ</div><div class="jp"></div></div>`);
    phone.querySelector('.jp')!.textContent = o.hook?.jp ?? '';
    extras = [phone];
    tl.fromTo(inEl, { opacity: 0 }, { opacity: 0, duration: 0 }, 0);
    tl.fromTo(phone, { yPercent: 110 }, { yPercent: 0, duration: 0.4, ease: 'back.out(1.6)' }, 0);
    tl.to(phone, { x: 6, duration: 0.04, repeat: 6, yoyo: true }, 0.45);
    // The old page is crumpled away behind the phone (art spec §6: J → G).
    if (out) tl.to(out, { scale: 0.2, rotation: 25, opacity: 0, duration: 0.35, ease: 'power2.in' }, 0.45);
    tl.set(inEl, { opacity: 1 }, 0.8);
    tl.to(phone, { yPercent: 110, duration: 0.5, ease: 'power3.in' }, 0.9);
  } else if (type === 'tease') {
    const card = overlay(stage, 'tease', `<p></p>`);
    card.querySelector('p')!.textContent = o.hook?.en ?? '';
    extras = [card];
    tl.fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0);
    if (out) tl.set(out, { opacity: 0 }, 0.3);
    tl.fromTo(inEl, { opacity: 0 }, { opacity: 1, duration: 0.01 }, 0.9);
    tl.to(card, { opacity: 0, duration: 0.5 }, 0.9);
  } else if (type === 'breather' && moving) {
    if (out) tl.to(out, { opacity: 0, duration: 0.3 }, 0);
    tl.set(inEl, { opacity: 0 }, 0);
    tl.add(travel(WORLD_BREATHER), 0.3);
    tl.fromTo(inEl, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.3 + WORLD_BREATHER);
    parallel = false;
  } else if (type === 'breather') {
    const win = overlay(stage, 'window', '<div class="horizon"></div>');
    extras = [win];
    if (out) tl.to(out, { opacity: 0, duration: 0.3 }, 0);
    tl.fromTo(win, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0);
    tl.fromTo(win.firstElementChild, { backgroundPositionX: '0px' }, { backgroundPositionX: '-600px', duration: 2.2, ease: 'none' }, 0.3);
    tl.fromTo(inEl, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 2.5);
    tl.to(win, { opacity: 0, duration: 0.3 }, 2.5);
  } else {
    extras = anyRide();
    parallel = false;
  }

  if (parallel) tl.add(travel(Math.max(0.4, tl.duration())), 0);

  tl.call(() => {
    out?.remove();
    for (const e of extras) e.remove();
    gsap.set(inEl, { clearProps: 'transform' });
  });
  return tl;
}
