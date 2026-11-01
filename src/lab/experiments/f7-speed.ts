import { gsap } from 'gsap';
import { shakeFor, speedLines } from '../../feel/physics';
import { velocity, type PointSample } from '../../feel/pointer';
import type { Experiment } from '../types';

const POOL = 24;
const FADE_S = 0.5;

const fades = new WeakMap<HTMLElement, gsap.core.Tween>();
/** Finish the fade-out at once (tests). */
export function settleFor(stage: HTMLElement): void {
  fades.get(stage)?.progress(1);
}

/** F7 Speed from the finger (ux spec §3): swipe speed drives speed lines and a camera shake. */
export const f7: Experiment = {
  id: 'f7-speed',
  layer: 'feel',
  title: 'F7 · Speed from the finger',
  blurb: 'Swipe across the sky. The faster you go, the more streaks and the harder the world shakes.',
  mount(stage, kit) {
    stage.style.cssText += ';background:linear-gradient(#070a24,#5b2470);touch-action:none';
    const note = document.createElement('p');
    note.style.cssText = 'position:absolute;left:12px;right:12px;top:12px;margin:0;text-align:center;font-size:13px;color:#fff;opacity:.85;pointer-events:none';
    stage.append(note);
    if (kit.reduced) {
      note.textContent = 'Motion is off: speed lines and shake are disabled.';
      return;
    }
    note.textContent = 'Swipe fast, then slow.';

    const lines: HTMLElement[] = [];
    for (let i = 0; i < POOL; i++) {
      const l = document.createElement('i');
      l.className = 'f7-line';
      const w = 40 + ((i * 37) % 90);
      l.style.cssText = `position:absolute;left:${(i * 53) % 90}%;top:${(i / POOL) * 96 + 2}%;width:${w}px;height:2px;border-radius:2px;background:#fff;opacity:.7;display:none;pointer-events:none`;
      lines.push(l);
      stage.append(l);
    }

    let samples: PointSample[] = [];
    const clear = () => {
      lines.forEach((l) => (l.style.display = 'none'));
      stage.style.transform = '';
      stage.dataset.shake = '0';
    };
    clear();

    const down = (e: PointerEvent) => {
      fades.get(stage)?.kill();
      lines.forEach((l) => (l.style.opacity = '.7'));
      clear();
      samples = [{ t: e.timeStamp, x: e.clientX, y: e.clientY }];
      try {
        stage.setPointerCapture?.(e.pointerId);
      } catch {
        // some browsers refuse capture for synthetic pointers
      }
    };
    const move = (e: PointerEvent) => {
      if (!samples.length) return;
      samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
      if (samples.length > 8) samples.shift();
      const v = velocity(samples);
      const speed = Math.hypot(v.vx, v.vy);
      const n = speedLines(speed);
      lines.forEach((l, i) => (l.style.display = i < n ? '' : 'none'));
      const amp = shakeFor(speed);
      stage.dataset.shake = amp.toFixed(2);
      stage.style.transform = amp > 0 ? `translate(${((Math.random() - 0.5) * 2 * amp).toFixed(2)}px,${((Math.random() - 0.5) * 2 * amp).toFixed(2)}px)` : '';
    };
    const up = () => {
      if (!samples.length) return;
      samples = [];
      stage.style.transform = '';
      fades.set(stage, gsap.to(lines, { opacity: 0, duration: FADE_S, onComplete: clear }));
    };

    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    kit.onLeave(() => {
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointercancel', up);
      fades.get(stage)?.kill();
      gsap.killTweensOf(lines);
      lines.forEach((l) => l.remove());
      stage.style.transform = '';
    });
  },
};
