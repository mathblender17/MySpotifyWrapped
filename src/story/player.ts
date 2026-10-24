import { isPlayable, STATIONS } from '../journey/stations';
import type { YearStats, YearSummary } from '../types';
import { createFrame } from './frame';
import { routeMap } from './routemap';
import './story.css';

export type SlideContext = { stats?: YearStats; years: YearSummary[]; onPickYear: (y: number) => void };
export type Slide = (ctx: SlideContext) => HTMLElement;

const HOLD_MS = 200;
const INTERACTIVE = 'button, a, input, label';

export function createStory(
  root: HTMLElement,
  opts: { slides: Record<string, Slide>; ctx: SlideContext; startAt?: number; autoAdvanceMs?: number },
) {
  const autoMs = opts.autoAdvanceMs ?? 8000;
  const playable = STATIONS.map((s) => isPlayable(s, opts.ctx.stats));
  const frame = createFrame();
  let index = -1;
  let paused = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let held = false;
  let downX: number | undefined;

  root.classList.add('story');

  const arm = () => {
    clearTimeout(timer);
    if (!paused && !STATIONS[index].waitForInput) timer = setTimeout(api.next, autoMs);
  };

  const show = (i: number) => {
    index = i;
    const s = STATIONS[i];
    frame.el.replaceChildren(opts.slides[s.id](opts.ctx));
    root.replaceChildren(routeMap(STATIONS, i, playable), frame.el);
    arm();
  };

  const step = (dir: 1 | -1) => {
    for (let i = index + dir; i >= 0 && i < STATIONS.length; i += dir) if (playable[i]) return show(i);
  };

  const onDown = (e: MouseEvent) => {
    if ((e.target as Element).closest(INTERACTIVE)) return;
    downX = e.clientX;
    held = false;
    holdTimer = setTimeout(() => {
      held = true;
      api.pause();
    }, HOLD_MS);
  };
  const onUp = (e: MouseEvent) => {
    if (downX === undefined) return;
    clearTimeout(holdTimer);
    const x = downX;
    downX = undefined;
    if (held) return api.resume();
    const width = root.getBoundingClientRect().width || window.innerWidth;
    if (x < width / 3) api.prev();
    else api.next();
    e.preventDefault();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') api.next();
    else if (e.key === 'ArrowLeft') api.prev();
    else if (e.key === ' ') (paused ? api.resume() : api.pause());
  };

  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointerup', onUp);
  document.addEventListener('keydown', onKey);

  const api = {
    next: () => step(1),
    prev: () => step(-1),
    pause: () => {
      paused = true;
      clearTimeout(timer);
    },
    resume: () => {
      paused = false;
      arm();
    },
    destroy: () => {
      clearTimeout(timer);
      clearTimeout(holdTimer);
      frame.destroy();
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointerup', onUp);
      document.removeEventListener('keydown', onKey);
    },
    get index() {
      return index;
    },
  };

  const start = opts.startAt ?? 0;
  if (playable[start]) show(start);
  else {
    index = start;
    step(1);
  }
  return api;
}
