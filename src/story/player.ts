import { gsap } from 'gsap';
import { mixQueue } from '../audio/mix';
import { findPreview as itunes } from '../audio/previews';
import { createSfx, type Sfx } from '../audio/sfx';
import type { Soundtrack } from '../audio/soundtrack';
import { beatTime, playBeats, prefersReducedMotion } from '../journey/beats';
import { HOOKS } from '../journey/hooks';
import { isPlayable, STATIONS } from '../journey/stations';
import { runTransition } from '../journey/transitions';
import type { YearStats, YearSummary } from '../types';
import { createFrame } from './frame';
import { createControls } from './controls';
import { createGuide } from './guide';
import { createHaptics, type Haptics } from './haptics';
import { createHint } from './hint';
import { createRouteMap } from './routemap';
import { createSeason } from './season';
import { createSign } from './sign';
import { TOUCH } from '../touch';
import type { TouchKit } from '../touch/kit';
import { loadWorldFonts } from '../style/fonts';
import { readingHoldMs } from './pacing';
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
/** Travel that makes a press a swipe, and the finger movement that rules out a hold (alive spec §4). */
const SWIPE_PX = 40;
const SLOP_PX = 10;
const INTERACTIVE = 'button, a, input, label, [data-touch]';

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
    /** Test seam: build the haptics. */
    makeHaptics?: (o: { canBuzz: () => boolean }) => Haptics;
  },
) {
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
  // The hold is a budget that pausing freezes (alive spec §3): set on arrival, spent while running.
  let holdLeft = 0;
  let holdStarted = 0;
  let pressTimer: ReturnType<typeof setTimeout> | undefined;
  let held = false;
  let downX: number | undefined;
  let downY = 0;
  let dragX = 0;
  let dragY = 0;
  let alive = true;
  let world = opts.world ?? null;
  const lookup = opts.findPreview ?? ((a: string, t: string) => itunes(a, t));
  // Accents only once sound is unlocked, never muted, never with reduced motion (art spec §8).
  const canPlay = () => !!opts.soundtrack?.unlocked && !opts.soundtrack.muted && !reduced;
  const sfx = (opts.makeSfx ?? createSfx)({ canPlay });
  // Haptics share sound's rules: only after the unlocking tap, never muted, never with reduced motion.
  const haptics = (opts.makeHaptics ?? createHaptics)({ canBuzz: canPlay });
  /** Arrival sound: the temple bell at the last station, the station chime everywhere else. */
  const arrivalSound = (id: string) => (id === 'kanji' ? sfx.bell() : sfx.chime());

  // The non-stop mix (alive spec §2): when a preview ends the next one starts; a station's own song moves the mix there.
  const queue = opts.ctx.stats ? mixQueue(opts.ctx.stats) : [];
  const same = (a: { artist?: string; name: string }, b: { artist?: string; name: string }) => a.name === b.name && a.artist === b.artist;
  let mixAt = -1;
  let cueId = 0;
  let cuePending = false; // a station's song is being looked up: it wins over the mix
  let musicOn = false; // a song is playing (or was asked to) and hasn't ended
  const playUrl = (url: string) => {
    musicOn = true;
    opts.soundtrack!.play(url);
  };

  /** Start this station's song, if it has one. The lookup is never awaited: the ride doesn't wait on the network. */
  const cue = (i: number) => {
    const s = STATIONS[i];
    if (!s.song || !opts.soundtrack) return;
    const track = opts.ctx.stats?.soundtrack?.[s.song];
    const id = ++cueId;
    // No song to switch to: keep whatever plays, or start the mix if nothing does — never silence it.
    if (!track?.artist) return void (musicOn || mixNext());
    mixAt = queue.findIndex((q) => same(q, track));
    cuePending = true;
    lookup(track.artist, track.name).then((url) => {
      if (!alive || cueId !== id) return;
      cuePending = false;
      if (url) playUrl(url);
      else if (!musicOn) void mixNext();
    });
  };

  /** Next playable song in the mix; each entry is tried at most once, so an offline ride goes quiet instead of looping. */
  const mixNext = async () => {
    if (cuePending) return; // the station's song is on its way
    const id = cueId;
    for (let tries = 0; tries < queue.length; tries++) {
      mixAt = (mixAt + 1) % queue.length;
      const t = queue[mixAt];
      const url = await lookup(t.artist!, t.name);
      if (!alive || cueId !== id || cuePending) return; // a station cue took over meanwhile
      if (url) return playUrl(url);
    }
  };
  opts.soundtrack?.onEnded?.(() => {
    musicOn = false;
    void mixNext();
  });

  root.classList.add('story');
  root.classList.toggle('reduced', reduced);
  root.classList.toggle('world-on', !!world);
  // Guide, ticket (and the app's mute button) share one dock in the band reserved below the frame: nothing covers a slide.
  const dock = document.createElement('div');
  dock.className = 'dock';
  dock.append(guide.el, ticket.el);
  const controls = createControls({ prev: () => nav(-1), next: () => nav(1), toggle: () => (paused ? api.resume() : api.pause()) });
  const stamp = Object.assign(document.createElement('div'), { className: 'paused-stamp', textContent: '一時停止 · paused' });
  root.replaceChildren(route.el, frame.el, controls.el, dock);
  const season = createSeason(root, reduced);
  const hint = createHint();
  let hinted = hint.el.hidden;
  const unhint = () => {
    if (hinted) return;
    hinted = true;
    hint.dismiss();
  };

  /** The card's reveals are done: its world's idle loop takes over (never under reduced motion). */
  const settle = (el: HTMLElement) => void (reduced || el.classList.add('idle'));

  const animating = () => !!master && master.progress() < 1;

  // Touch interactions in use (counted); reset per card so a stale release can't unfreeze the next one.
  let busy = 0;
  let cardGen = 0;

  const armHold = () => {
    clearTimeout(holdTimer);
    if (paused || busy > 0 || STATIONS[index].waitForInput) return;
    holdStarted = Date.now();
    holdTimer = setTimeout(() => {
      holdTimer = undefined;
      step(1);
    }, holdLeft);
  };
  /** Stop the hold's clock, keeping what's left of it. */
  const freezeHold = () => {
    if (holdTimer === undefined) return;
    clearTimeout(holdTimer);
    holdTimer = undefined;
    holdLeft = Math.max(0, holdLeft - (Date.now() - holdStarted));
  };

  /** A song picked by touch: same guards as a station cue, so a pending mix or cue lookup can't override it. */
  const playTrack = async (t: { name: string; artist?: string }) => {
    if (!opts.soundtrack || !t.artist) return false;
    const id = ++cueId;
    cuePending = false; // the dropped cue would have cleared it
    const url = await lookup(t.artist, t.name);
    if (!alive || cueId !== id) return false;
    if (!url) {
      if (!musicOn) void mixNext(); // the aborted mix lookup must not leave the ride silent
      return false;
    }
    playUrl(url);
    return true;
  };

  const touchKit = (stats: YearStats): TouchKit => {
    const gen = cardGen;
    return {
      stats,
      reduced,
      busy() {
        busy++;
        freezeHold();
        let released = false;
        return () => {
          if (released || gen !== cardGen) return;
          released = true;
          if (--busy === 0 && !paused && !animating()) armHold();
        };
      },
      playTrack,
      sfx,
      buzz: (p) => haptics.buzz(p),
      mark(target) {
        target.setAttribute('data-touch', '');
        target.insertAdjacentHTML('beforeend', '<i class="touch-dot" aria-hidden="true"></i>');
      },
      dur: (s) => (reduced ? 0 : s),
    };
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
    holdTimer = undefined; // the new card's hold hasn't started: a pause before it must not spend it
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
    busy = 0;
    cardGen++;
    // A broken touch interaction must never cost the card.
    if (opts.ctx.stats) try { TOUCH[s.id]?.(el, touchKit(opts.ctx.stats)); } catch { /* card stays as built */ }
    holdLeft = opts.holdMs ?? readingHoldMs(el);
    route.set(i);
    season.set(s.act);
    if (s.id === 'departure' && !hinted) frame.el.append(hint.el);
    else hint.el.remove(); // the hint belongs to the departure board, never to the ride
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
      settle(el);
      return armHold();
    }

    const tl = gsap.timeline({ paused: true, onComplete: () => (settle(el), armHold()) });
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
    at(trans.duration(), () => {
      arrivalSound(s.id);
      haptics.buzz(20);
    });
    // A tap of the finger on each stamp and drop; the gacha SSR gets its own pattern (data-haptic="ssr").
    for (const b of el.querySelectorAll<HTMLElement>('[data-fx~="stamp"], [data-fx~="drop"]')) {
      at(beatsAt + beatTime(el, b, reduced), () => haptics.buzz(b.dataset.haptic === 'ssr' ? [15, 40, 15] : 10));
    }
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
    if ((e.target as Element).closest('[data-touch]')) for (const d of current?.querySelectorAll('.touch-dot') ?? []) d.remove();
    if ((e.target as Element).closest(INTERACTIVE)) return;
    downX = e.clientX;
    downY = e.clientY;
    dragX = dragY = 0;
    held = false;
    pressTimer = setTimeout(() => {
      held = true;
      api.pause();
    }, HOLD_PRESS_MS);
  };
  // While a finger drags, the card follows it a little (0.2×) so a swipe feels physical.
  const onMove = (e: MouseEvent) => {
    if (downX === undefined) return;
    dragX = e.clientX - downX;
    dragY = e.clientY - downY;
    if (Math.hypot(dragX, dragY) > SLOP_PX) clearTimeout(pressTimer); // a moving finger is not a hold
    if (Math.abs(dragX) > Math.abs(dragY)) gsap.set(frame.stage, { x: dragX * 0.2 });
  };
  const springBack = () => gsap.to(frame.stage, { x: 0, duration: reduced ? 0 : 0.2, ease: 'power2.out' });
  /** One gesture, one meaning, decided on release: a swipe (> 40 px), a hold (paused while down), else a tap. */
  const onUp = (e: MouseEvent) => {
    opts.soundtrack?.unlock(); // any tap is a gesture the browser accepts for sound
    sfx.unlock();
    unhint(); // any first touch — the card, a control, a year — shows the rider already knows
    if (downX === undefined) return;
    clearTimeout(pressTimer);
    const x = downX;
    downX = undefined;
    springBack();
    const swiped = Math.hypot(dragX, dragY) > SWIPE_PX;
    if (held) {
      api.resume(); // a press that turned into a swipe is a swipe, never a stuck pause
      if (!swiped) return;
    }
    e.preventDefault();
    if (swiped) {
      if (Math.abs(dragX) >= Math.abs(dragY)) return nav(dragX < 0 ? 1 : -1);
      if (dragY > 0) api.pause();
      return;
    }
    if (Math.hypot(dragX, dragY) > SLOP_PX) return; // an abandoned swipe: the card springs back, nothing else
    const width = root.getBoundingClientRect().width || window.innerWidth;
    nav(x < width / 3 ? -1 : 1);
  };
  // A touch pan or a release outside the page cancels the gesture: never leave the story stuck on pause.
  const onCancel = () => {
    if (downX === undefined) return;
    clearTimeout(pressTimer);
    downX = undefined;
    springBack();
    if (held) api.resume();
  };
  const onKey = (e: KeyboardEvent) => {
    opts.soundtrack?.unlock();
    sfx.unlock();
    unhint();
    if (e.key === 'ArrowRight') nav(1);
    else if (e.key === 'ArrowLeft') nav(-1);
    else if (e.key === ' ' && !(e.target as Element | null)?.closest?.(INTERACTIVE)) (paused ? api.resume() : api.pause()); // a focused button handles its own Space
  };

  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointercancel', onCancel);
  root.addEventListener('pointerleave', onCancel);
  document.addEventListener('keydown', onKey);

  const api = {
    next: () => nav(1),
    prev: () => nav(-1),
    pause: () => {
      paused = true;
      controls.setPaused(true);
      frame.el.append(stamp);
      master?.pause();
      freezeHold();
      opts.soundtrack?.pause();
      world?.pause();
    },
    resume: () => {
      paused = false;
      controls.setPaused(false);
      stamp.remove();
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
      root.removeEventListener('pointermove', onMove);
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
