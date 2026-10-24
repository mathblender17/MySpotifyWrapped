const FADE_MS = 1000;
const STEP_MS = 50;
const MUTE_KEY = 'ongaku:muted';

export type Soundtrack = {
  unlock(): void;
  play(url?: string): void;
  mute(on: boolean): void;
  stop(): void;
  pause(): void;
  resume(): void;
  readonly muted: boolean;
};

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Two players crossfading: the rider's own songs carry over from station to station. */
export function createSoundtrack(make: () => HTMLAudioElement = () => new Audio()): Soundtrack {
  let unlocked = false;
  let muted = readMuted();
  let wanted: string | undefined;
  let playing: { el: HTMLAudioElement; url: string } | undefined;
  let fading: HTMLAudioElement[] = [];
  let timer: ReturnType<typeof setInterval> | undefined;
  const level = () => (muted ? 0 : 1);

  const fadeTo = (incoming?: HTMLAudioElement) => {
    clearInterval(timer);
    const outs = [...fading, ...(playing ? [playing.el] : [])].filter((a) => a !== incoming);
    const startVols = outs.map((a) => a.volume);
    fading = outs;
    let t = 0;
    timer = setInterval(() => {
      t = Math.min(1, t + STEP_MS / FADE_MS);
      outs.forEach((a, i) => (a.volume = startVols[i] * (1 - t)));
      if (incoming) incoming.volume = level() * t;
      if (t >= 1) {
        clearInterval(timer);
        for (const a of outs) {
          a.volume = 0;
          a.pause();
        }
        fading = [];
      }
    }, STEP_MS);
  };

  const start = (url: string | undefined) => {
    if (!url) {
      fadeTo();
      playing = undefined;
      return;
    }
    const el = make();
    el.src = url;
    el.volume = 0;
    el.play()?.catch(() => {}); // autoplay refusal: stay silent rather than break the ride
    fadeTo(el);
    playing = { el, url };
  };

  return {
    unlock() {
      if (unlocked) return;
      unlocked = true;
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
      if (playing) playing.el.volume = level();
      for (const a of fading) a.volume = 0;
    },
    stop() {
      clearInterval(timer);
      for (const a of [...fading, ...(playing ? [playing.el] : [])]) a.pause();
      fading = [];
      playing = undefined;
      wanted = undefined;
    },
    pause() {
      playing?.el.pause();
    },
    resume() {
      playing?.el.play()?.catch(() => {});
    },
    get muted() {
      return muted;
    },
  };
}
