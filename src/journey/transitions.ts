import { gsap } from 'gsap';
import { DESIGN_W } from '../story/frame';
import type { Transition } from './stations';

export type TransitionOpts = {
  stage: HTMLElement;
  cut?: { from: string; to: string };
  hook?: { jp: string; en: string };
  reduced?: boolean;
  /** The 3D world behind the story, and the stations we're moving between. */
  world?: { travel(from: number, to: number, seconds: number): gsap.core.Timeline };
  from?: number;
  to?: number;
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
    if (out) tl.set(out, { opacity: 0 }, 0.8);
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
