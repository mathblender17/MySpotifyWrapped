const FADE_MS = 1000;
const STEP_MS = 50;
const MUTE_KEY = 'ongaku:muted';
// 44-byte silent WAV: lets unlock() play() each player inside the rider's tap, which is what iOS needs to allow it later.
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

export type Soundtrack = {
  unlock(): void;
  play(url?: string): void;
  mute(on: boolean): void;
  stop(): void;
  pause(): void;
  resume(): void;
  /** Called when the playing song finishes on its own (not when faded out, paused or stopped). */
  onEnded(cb: () => void): void;
  readonly muted: boolean;
  /** True once a tap has unlocked sound (browsers refuse audio before a gesture). */
  readonly unlocked: boolean;
};

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Two persistent players crossfading: the rider's own songs carry over from station to station.
 * Where volume is read-only (iOS Safari) songs swap instead of fading; mute always uses `muted`.
 */
export function createSoundtrack(make: () => HTMLAudioElement = () => new Audio()): Soundtrack {
  const players = [make(), make()];
  const volumeWorks = (() => {
    const p = players[0];
    p.volume = 0.5;
    const ok = p.volume === 0.5;
    p.volume = 1;
    return ok;
  })();
  let unlocked = false;
  let muted = readMuted();
  let wanted: string | undefined;
  let playing: { el: HTMLAudioElement; url: string } | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let ended: (() => void) | undefined;
  for (const p of players) {
    p.muted = muted;
    p.onended = () => {
      if (p !== playing?.el) return;
      playing = undefined; // finished: the same song may be asked for again
      ended?.();
    };
  }

  const fadeTo = (incoming?: HTMLAudioElement) => {
    clearInterval(timer);
    const outs = players.filter((p) => p !== incoming && !p.paused);
    if (!volumeWorks) {
      for (const p of outs) p.pause();
      return;
    }
    const startVols = outs.map((a) => a.volume);
    let t = 0;
    timer = setInterval(() => {
      t = Math.min(1, t + STEP_MS / FADE_MS);
      outs.forEach((a, i) => (a.volume = startVols[i] * (1 - t)));
      if (incoming) incoming.volume = t;
      if (t >= 1) {
        clearInterval(timer);
        for (const a of outs) a.pause();
      }
    }, STEP_MS);
  };

  const start = (url: string | undefined) => {
    if (!url) {
      fadeTo();
      playing = undefined;
      return;
    }
    const el = playing?.el === players[0] ? players[1] : players[0];
    el.pause();
    el.src = url;
    el.volume = volumeWorks ? 0 : 1;
    el.play()?.catch(() => {}); // autoplay refusal: stay silent rather than break the ride
    fadeTo(el);
    playing = { el, url };
  };

  return {
    unlock() {
      if (unlocked) return;
      unlocked = true;
      for (const p of players) {
        if (!p.src) p.src = SILENT;
        p.play()?.catch(() => {});
        p.pause();
      }
      start(wanted);
    },
    play(url) {
      if (url === wanted && (playing?.url === url || !unlocked)) return;
      wanted = url;
      if (unlocked) start(url);
    },
    mute(on) {
      muted = on;
      try {
        localStorage.setItem(MUTE_KEY, on ? '1' : '0');
      } catch {
        // private mode: mute still works for this visit
      }
      for (const p of players) p.muted = on;
    },
    stop() {
      clearInterval(timer);
      for (const p of players) p.pause();
      playing = undefined;
      wanted = undefined;
    },
    pause() {
      clearInterval(timer);
      for (const p of players) p.pause();
    },
    resume() {
      if (!playing) return;
      playing.el.volume = 1;
      playing.el.play()?.catch(() => {});
    },
    onEnded(cb) {
      ended = cb;
    },
    get muted() {
      return muted;
    },
    get unlocked() {
      return unlocked;
    },
  };
}
