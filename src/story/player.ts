import { gsap } from 'gsap';
import { playBeats, prefersReducedMotion } from '../journey/beats';
import { HOOKS } from '../journey/hooks';
import { isPlayable, STATIONS } from '../journey/stations';
import { runTransition } from '../journey/transitions';
import type { YearStats, YearSummary } from '../types';
import { createFrame } from './frame';
import { createGuide } from './guide';
import { routeMap } from './routemap';
import './story.css';

export type SlideContext = { stats?: YearStats; years: YearSummary[]; onPickYear: (y: number) => void };
export type Slide = (ctx: SlideContext) => HTMLElement;

const HOLD_PRESS_MS = 200;
const INTERACTIVE = 'button, a, input, label';

export function createStory(
  root: HTMLElement,
  opts: { slides: Record<string, Slide>; ctx: SlideContext; startAt?: number; holdMs?: number; reduced?: boolean },
) {
  const holdMs = opts.holdMs ?? 2500;
  const reduced = opts.reduced ?? prefersReducedMotion();
  const playable = STATIONS.map((s) => isPlayable(s, opts.ctx.stats));
  const frame = createFrame();
  const guide = createGuide();
  const mapSlot = document.createElement('div');
  let index = -1;
  let current: HTMLElement | null = null;
  let master: gsap.core.Timeline | undefined;
  let paused = false;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let pressTimer: ReturnType<typeof setTimeout> | undefined;
  let held = false;
  let downX: number | undefined;

  root.classList.add('story');
  root.replaceChildren(mapSlot, frame.el, guide.el);

  const animating = () => !!master && master.progress() < 1;

  const armHold = () => {
    clearTimeout(holdTimer);
    if (!paused && !STATIONS[index].waitForInput) holdTimer = setTimeout(() => step(1), holdMs);
  };

  const finish = () => {
    master?.progress(1);
    master = undefined;
  };

  /** Arrive at station i: animated (transition → beats → hold) going forward, instant going back. */
  const show = (i: number, animate: boolean) => {
    finish();
    clearTimeout(holdTimer);
    index = i;
    const s = STATIONS[i];
    const el = opts.slides[s.id](opts.ctx);
    mapSlot.replaceChildren(routeMap(STATIONS, i, playable));
    const beats = playBeats(el, { reduced });

    if (!animate) {
      current?.remove();
      frame.el.replaceChildren(el);
      beats.progress(1);
      guide.say(s.id).progress(1);
      current = el;
      return armHold();
    }

    const tl = gsap.timeline({ paused: true, onComplete: armHold });
    const selfHooked = s.transitionIn === 'phone' || s.transitionIn === 'tease';
    if (!selfHooked) tl.add(guide.say(s.id).paused(false), 0);
    else guide.clear();
    const trans = runTransition(s.transitionIn, current, el, { stage: frame.el, cut: s.cut, hook: HOOKS[s.id], reduced }).paused(false);
    tl.add(trans, 0);
    tl.add(beats.paused(false), trans.duration());
    current = el;
    master = tl;
    if (!paused) tl.play();
  };

  const step = (dir: 1 | -1) => {
    for (let i = index + dir; i >= 0 && i < STATIONS.length; i += dir) if (playable[i]) return show(i, dir === 1);
  };

  /** One input, one action: finish what's animating, otherwise move. */
  const nav = (dir: 1 | -1) => (animating() ? finish() : step(dir));

  const onDown = (e: MouseEvent) => {
    if ((e.target as Element).closest(INTERACTIVE)) return;
    downX = e.clientX;
    held = false;
    pressTimer = setTimeout(() => {
      held = true;
      api.pause();
    }, HOLD_PRESS_MS);
  };
  const onUp = (e: MouseEvent) => {
    if (downX === undefined) return;
    clearTimeout(pressTimer);
    const x = downX;
    downX = undefined;
    if (held) return api.resume();
    const width = root.getBoundingClientRect().width || window.innerWidth;
    nav(x < width / 3 ? -1 : 1);
    e.preventDefault();
  };
  // A touch pan or a release outside the page cancels the gesture: never leave the story stuck on pause.
  const onCancel = () => {
    if (downX === undefined) return;
    clearTimeout(pressTimer);
    downX = undefined;
    if (held) api.resume();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') nav(1);
    else if (e.key === 'ArrowLeft') nav(-1);
    else if (e.key === ' ') (paused ? api.resume() : api.pause());
  };

  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onCancel);
  root.addEventListener('pointerleave', onCancel);
  document.addEventListener('keydown', onKey);

  const api = {
    next: () => nav(1),
    prev: () => nav(-1),
    pause: () => {
      paused = true;
      master?.pause();
      clearTimeout(holdTimer);
    },
    resume: () => {
      paused = false;
      if (animating()) master!.play();
      else armHold();
    },
    destroy: () => {
      master?.kill();
      clearTimeout(holdTimer);
      clearTimeout(pressTimer);
      frame.destroy();
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointercancel', onCancel);
      root.removeEventListener('pointerleave', onCancel);
      document.removeEventListener('keydown', onKey);
    },
    get index() {
      return index;
    },
  };

  const start = opts.startAt ?? 0;
  if (playable[start]) show(start, true);
  else {
    index = start;
    step(1);
  }
  return api;
}
