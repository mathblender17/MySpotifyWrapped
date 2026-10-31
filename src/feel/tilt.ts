const clamp = (n: number) => Math.max(-1, Math.min(1, n));

/** Device angles to -1..1: gamma (left/right) ±30°, beta (front/back) ±30° around a 45° holding angle. */
export function normalizeTilt(gamma: number, beta: number): { x: number; y: number } {
  return { x: clamp(gamma / 30), y: clamp((beta - 45) / 30) };
}

export type Tilt = {
  readonly state: 'idle' | 'running' | 'denied' | 'unsupported';
  /** Call inside a tap: iOS only shows its motion permission prompt from a gesture. */
  request(): Promise<boolean>;
  stop(): void;
  on(fn: (x: number, y: number) => void): () => void;
};

type Win = Pick<Window, 'addEventListener' | 'removeEventListener'>;
const SMOOTH = 0.15;
const WAIT_MS = 1500;

/**
 * Phone tilt as a small stream (ux spec §3 F2). Off under reduced motion; asks iOS for permission when needed;
 * gives up (`unsupported`) when no usable reading arrives, so a desktop never waits on it.
 */
export function createTilt(o: { reduced: boolean; win?: Win; permission?: () => Promise<'granted' | 'denied'> | undefined }): Tilt {
  const win: Win | undefined = o.win ?? (typeof window === 'undefined' ? undefined : window);
  const subs = new Set<(x: number, y: number) => void>();
  let state: Tilt['state'] = o.reduced ? 'unsupported' : 'idle';
  let handler: ((e: Event) => void) | undefined;
  let sx = 0;
  let sy = 0;

  const ask = (): Promise<'granted' | 'denied'> | undefined => {
    if (o.permission) return o.permission();
    const doe = (globalThis as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    return typeof doe?.requestPermission === 'function' ? doe.requestPermission().then((r) => (r === 'granted' ? 'granted' : 'denied')) : undefined;
  };
  const detach = () => {
    if (handler) win?.removeEventListener('deviceorientation', handler);
    handler = undefined;
  };

  return {
    get state() {
      return state;
    },
    async request() {
      if (o.reduced || !win) {
        state = 'unsupported';
        return false;
      }
      if (state === 'running') return true;
      const asked = ask();
      if (asked) {
        let r: 'granted' | 'denied';
        try {
          r = await asked;
        } catch {
          r = 'denied';
        }
        if (r !== 'granted') {
          state = 'denied';
          return false;
        }
      }
      return new Promise<boolean>((resolve) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        handler = (e) => {
          const { gamma, beta } = e as DeviceOrientationEvent;
          if (gamma == null || beta == null) return;
          if (state !== 'running') {
            state = 'running';
            if (timer) clearTimeout(timer);
            resolve(true);
          }
          const t = normalizeTilt(gamma, beta);
          sx += (t.x - sx) * SMOOTH;
          sy += (t.y - sy) * SMOOTH;
          subs.forEach((fn) => fn(sx, sy));
        };
        win.addEventListener('deviceorientation', handler);
        timer = setTimeout(() => {
          if (state !== 'running') {
            detach();
            state = 'unsupported';
            resolve(false);
          }
        }, WAIT_MS);
      });
    },
    stop() {
      detach();
      if (state === 'running') state = 'idle';
    },
    on(fn) {
      subs.add(fn);
      return () => void subs.delete(fn);
    },
  };
}
