import { gsap } from 'gsap';
import { findPreview as itunes } from '../audio/previews';
import { createSfx, type Sfx } from '../audio/sfx';
import type { Soundtrack } from '../audio/soundtrack';
import { beatTime, playBeats, prefersReducedMotion } from '../journey/beats';
import { HOOKS } from '../journey/hooks';
import { isPlayable, STATIONS } from '../journey/stations';
import { runTransition } from '../journey/transitions';
import type { YearStats, YearSummary } from '../types';
import { createFrame } from './frame';
import { createGuide } from './guide';
import { createRouteMap } from './routemap';
import { createSeason } from './season';
import { createSign } from './sign';
import { loadWorldFonts } from '../style/fonts';
import { createTicket } from './ticket';
import './story.css';

export type SlideContext = { stats?: YearStats; years: YearSummary[]; onPickYear: (y: number) => void };
export type Slide = (ctx: SlideContext) => HTMLElement;

/** What the story needs from the 3D world (src/world): kept minimal so the story runs fine without one. */
export type StoryWorld = {
  travel(from: number, to: number, seconds: number): gsap.core.Timeline;
  jump(i: number): void;
  setSeason(dial: number): void;
  pause(): void;
  resume(): void;
  destroy(): void;
};

const HOLD_PRESS_MS = 200;
const INTERACTIVE = 'button, a, input, label';

export function createStory(
  root: HTMLElement,
  opts: {
    slides: Record<string, Slide>;
    ctx: SlideContext;
    startAt?: number;
    holdMs?: number;
    reduced?: boolean;
    soundtrack?: Soundtrack;
    findPreview?: (artist: string, track: string) => Promise<string | undefined>;
    world?: StoryWorld | null;
    /** Test seam: build the sound accents. */
    makeSfx?: (o: { canPlay: () => boolean }) => Sfx;
  },
) {
  const holdMs = opts.holdMs ?? 2500;
  const reduced = opts.reduced ?? prefersReducedMotion();
  const playable = STATIONS.map((s) => isPlayable(s, opts.ctx.stats));
  const frame = createFrame();
  const guide = createGuide();
  const route = createRouteMap(STATIONS, playable);
  const ticket = createTicket(STATIONS, playable, reduced);
  const sign = createSign(reduced);
  frame.el.append(sign.el);
  let index = -1;
  let current: HTMLElement | null = null;
  let master: gsap.core.Timeline | undefined;
  let paused = false;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let pressTimer: ReturnType<typeof setTimeout> | undefined;
  let held = false;
  let downX: number | undefined;
  let alive = true;
  let world = opts.world ?? null;
  const lookup = opts.findPreview ?? ((a: string, t: string) => itunes(a, t));
  // Accents only once sound is unlocked, never muted, never with reduced motion (art spec §8).
  const canPlay = () => !!opts.soundtrack?.unlocked && !opts.soundtrack.muted && !reduced;
  const sfx = (opts.makeSfx ?? createSfx)({ canPlay });
  /** Arrival sound: the temple bell at the last station, the station chime everywhere else. */
  const arrivalSound = (id: string) => (id === 'kanji' ? sfx.bell() : sfx.chime());

  /** Start this station's song, if it has one. The lookup is never awaited: the ride doesn't wait on the network. */
  const cue = (i: number) => {
    const s = STATIONS[i];
    if (!s.song || !opts.soundtrack) return;
    const track = opts.ctx.stats?.soundtrack?.[s.song];
    if (!track?.artist) return opts.soundtrack.play(undefined);
    lookup(track.artist, track.name).then((url) => {
      if (alive && index === i) opts.soundtrack!.play(url);
    });
  };

  root.classList.add('story');
  root.classList.toggle('reduced', reduced);
  root.classList.toggle('world-on', !!world);
  // Guide, ticket (and the app's mute button) share one dock in the band reserved below the frame: nothing covers a slide.
  const dock = document.createElement('div');
  dock.className = 'dock';
  dock.append(guide.el, ticket.el);
  root.replaceChildren(route.el, frame.el, dock);
  const season = createSeason(root, reduced);

  const animating = () => !!master && master.progress() < 1;

  const armHold = () => {
    clearTimeout(holdTimer);
    if (!paused && !STATIONS[index].waitForInput) holdTimer = setTimeout(() => step(1), holdMs);
  };

  let skipping = false;
  const finish = () => {
    skipping = true; // jumping to the end fires every queued call: keep the sounds out of it
    master?.progress(1);
    skipping = false;
    master = undefined;
  };

  /** Arrive at station i: animated (transition → beats → hold) going forward, instant going back. */
  const show = (i: number, animate: boolean) => {
    finish();
    clearTimeout(holdTimer);
    const from = index;
    index = i;
    const s = STATIONS[i];
    world?.setSeason((s.act - 1) / 3);
    // First stop or going back: the camera is simply there.
    if (from < 0 || !animate) world?.jump(i);
    // Fonts for this world and the next stop's, so the next arrival doesn't flash a fallback face.
    loadWorldFonts(s.world);
    const next = playable.findIndex((p, n) => p && n > i);
    if (next > 0) loadWorldFonts(STATIONS[next].world);
    const el = opts.slides[s.id](opts.ctx);
    route.set(i);
    season.set(s.act);
    cue(i);
    if (!animate) {
      current?.remove();
      frame.stage.replaceChildren(el);
      sign.show(s).progress(1);
      sign.dock().progress(1);
      playBeats(el, { reduced }).progress(1);
      guide.say(s.id).progress(1);
      ticket.stamp(i, s.accent).progress(1);
      if (s.id === 'kanji') ticket.finale().progress(1);
      current = el;
      return armHold();
    }

    const tl = gsap.timeline({ paused: true, onComplete: armHold });
    const at = (t: number, fn: () => void) => tl.call(() => void (skipping || fn()), undefined, t);
    const selfHooked = s.transitionIn === 'phone' || s.transitionIn === 'tease';
    if (!selfHooked) tl.add(guide.say(s.id).paused(false), 0);
    else guide.clear();
    // Build the transition first: beats render their start state at once (scaled, offset), and a match cut must
    // measure its target where it will come to rest.
    const trans = runTransition(s.transitionIn, current, el, {
      stage: frame.stage,
      cut: s.cut,
      morph: s.morph,
      hook: HOOKS[s.id],
      reduced,
      world: world ?? undefined,
      from: from < 0 ? undefined : from,
      to: i,
    }).paused(false);
    const beats = playBeats(el, { reduced });
    // The arrival ritual (art spec §4): transition → station sign → dock → stat beats.
    const signIn = sign.show(s);
    const signDock = sign.dock();
    tl.add(trans, 0);
    // The phone and tease show the hook themselves; once they're gone the guide's phone picks it up, never blank.
    if (selfHooked) tl.add(guide.say(s.id).paused(false), trans.duration());
    tl.add(signIn.paused(false), trans.duration());
    tl.add(ticket.stamp(i, s.accent).paused(false), trans.duration());
    tl.add(signDock.paused(false), trans.duration() + signIn.duration());
    const beatsAt = trans.duration() + signIn.duration() + signDock.duration();
    tl.add(beats.paused(false), beatsAt);
    at(trans.duration(), () => arrivalSound(s.id));
    // Beat-bound accents (ドン, pixel blips) are marked in the slide with data-sfx.
    for (const b of el.querySelectorAll<HTMLElement>('[data-sfx]')) {
      const name = b.dataset.sfx as 'don' | 'blip';
      at(beatsAt + beatTime(el, b, reduced), () => sfx[name]?.());
    }
    if (s.id === 'kanji') tl.add(ticket.finale().paused(false));
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
    opts.soundtrack?.unlock(); // any tap is a gesture the browser accepts for sound
    sfx.unlock();
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
    opts.soundtrack?.unlock();
    sfx.unlock();
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
      opts.soundtrack?.pause();
      world?.pause();
    },
    resume: () => {
      paused = false;
      opts.soundtrack?.resume();
      world?.resume();
      if (animating()) master!.play();
      else armHold();
    },
    destroy: () => {
      alive = false;
      opts.soundtrack?.stop();
      sfx.dispose();
      world?.destroy();
      world = null;
      master?.kill();
      clearTimeout(holdTimer);
      clearTimeout(pressTimer);
      frame.destroy();
      season.destroy();
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointercancel', onCancel);
      root.removeEventListener('pointerleave', onCancel);
      document.removeEventListener('keydown', onKey);
    },
    /** The 3D world is gone (e.g. WebGL context lost): finish the ride without it. */
    dropWorld() {
      world?.destroy();
      world = null;
      root.classList.remove('world-on');
    },
    get index() {
      return index;
    },
  };

  const start = opts.startAt ?? 0;
  // Stations before the starting stop were already ridden through (e.g. the departure board before a year pick).
  for (let i = 0; i < start; i++) ticket.stamp(i, STATIONS[i].accent).progress(1);
  if (playable[start]) show(start, true);
  else {
    index = start;
    step(1);
  }
  return api;
}
