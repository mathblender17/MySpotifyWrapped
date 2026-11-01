import { gsap } from 'gsap';
import type { Experiment } from '../types';

const TARGET = 28613; // demo minutes
const COUNT_S = 1.4;
const BACK = 2.2; // how far the count overshoots
const BOUNCE_AT = 0.4; // tilt change that shakes the digits loose

/** The shown value `u` (0..1) of the way through the count: back-out easing, so it overshoots the target then settles. */
export function countAt(target: number, u: number): number {
  const t = u - 1;
  return target * (1 + (BACK + 1) * t * t * t + BACK * t * t);
}

const tweens = new WeakMap<HTMLElement, gsap.core.Tween>();
/** Finish the count at once (tests, and anything that cannot wait on frames). */
export function settleFor(stage: HTMLElement): void {
  tweens.get(stage)?.progress(1);
}

/** F5 Heavy numbers (ux spec §3): the hero number has weight. It overshoots, and a tilt jolts the digits. */
export const f5: Experiment = {
  id: 'f5-heavy',
  layer: 'feel',
  title: 'F5 · Heavy numbers',
  blurb: 'Tap the number to recount it. Tilt the phone sharply and the digits bounce.',
  mount(stage, kit) {
    stage.style.cssText += ';display:grid;place-items:center;text-align:center';
    const wrap = document.createElement('div');
    const label = document.createElement('p');
    label.style.cssText = 'margin:0 0 6px;font:800 12px Archivo,sans-serif;letter-spacing:.3em;color:#f2c14e';
    label.textContent = 'MINUTES · 分 (DEMO)';
    const num = document.createElement('div');
    num.className = 'f5-num';
    num.style.cssText = "font:400 72px 'Dela Gothic One',sans-serif;color:#fff;text-shadow:0 6px 0 #7a1a0c,0 12px 20px #0008;touch-action:none;user-select:none;min-height:96px";
    const hint = document.createElement('p');
    hint.style.cssText = 'margin:14px 0 0;font-size:13px;color:#fff;opacity:.8';
    hint.textContent = kit.reduced ? 'Motion is off: the number is shown as it is.' : 'Tap to recount · tilt to bounce';
    wrap.append(label, num, hint);
    stage.append(wrap);

    const show = (v: number) => {
      num.textContent = Math.max(0, Math.round(v)).toLocaleString('en-US');
    };
    if (kit.reduced) {
      show(TARGET);
      return;
    }

    const counter = { u: 0 };
    const run = () => {
      tweens.get(stage)?.kill();
      counter.u = 0;
      show(0);
      tweens.set(stage, gsap.to(counter, { u: 1, duration: COUNT_S, ease: 'none', onUpdate: () => show(countAt(TARGET, counter.u)) }));
    };
    run();

    let asked = false;
    num.addEventListener('click', () => {
      if (!asked) {
        asked = true;
        void kit.tilt.request(); // iOS only allows the permission prompt inside a tap
      }
      run();
    });

    let last: number | undefined;
    let bounces = 0;
    const off = kit.tilt.on((_x, y) => {
      if (last !== undefined && Math.abs(y - last) > BOUNCE_AT) {
        bounces++;
        num.dataset.bounces = String(bounces);
        gsap.fromTo(num, { y: -22 }, { y: 0, duration: 0.7, ease: 'elastic.out(1,0.4)' });
      }
      last = y;
    });

    kit.onLeave(() => {
      off();
      tweens.get(stage)?.kill();
      gsap.killTweensOf(num);
    });
  },
};
