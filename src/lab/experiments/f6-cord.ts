import { BELL } from '../../feel/patterns';
import { rubber, stepSpring } from '../../feel/physics';
import type { Experiment } from '../types';

const LIMIT = 140; // the most the cord stretches, px
const RING_AT = 90; // pull at least this far (raw finger travel) and let go to ring
const CORD = 120; // resting cord length, px

const rests = new WeakMap<HTMLElement, () => void>();
/** Jump the cord back to rest at once (tests, and anything that cannot wait on frames). */
export function settleFor(stage: HTMLElement): void {
  rests.get(stage)?.();
}

/** F6 Pull the cord (ux spec §3): pull down and let go to ring the "next stop" bell. */
export const f6: Experiment = {
  id: 'f6-cord',
  layer: 'feel',
  title: 'F6 · Pull the cord',
  blurb: 'Pull the tassel down and let go. Far enough rings the bell; short springs back.',
  mount(stage, kit) {
    stage.style.cssText += ';display:flex;justify-content:center';
    const line = document.createElement('div');
    line.className = 'f6-line';
    line.style.cssText = `position:absolute;top:0;width:4px;height:${CORD}px;background:linear-gradient(#f2c14e,#c8102e);border-radius:2px`;
    const tassel = document.createElement('div');
    tassel.className = 'f6-tassel';
    tassel.dataset.pull = '0';
    tassel.setAttribute('role', 'button');
    tassel.setAttribute('aria-label', 'Pull the cord');
    tassel.style.cssText = `position:absolute;top:${CORD - 4}px;width:56px;height:56px;margin-left:-26px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff6a44,#8f1e0c);border:3px solid #f2c14e;box-shadow:0 8px 14px #0009;touch-action:none`;
    const label = document.createElement('div');
    label.className = 'f6-label';
    label.style.cssText = "display:none;position:absolute;left:0;right:0;top:48%;text-align:center;font:800 40px 'Shippori Mincho',serif;color:#fff;text-shadow:0 4px 0 #7a1a0c";
    label.innerHTML = '次は…<small style="display:block;font:800 14px Archivo,sans-serif;letter-spacing:.3em;color:#f2c14e">NEXT STOP</small>';
    const hint = document.createElement('p');
    hint.style.cssText = 'position:absolute;left:12px;right:12px;bottom:16px;margin:0;text-align:center;font-size:13px;color:#fff;opacity:.8';
    hint.textContent = kit.reduced ? 'Motion is off: tap the tassel.' : 'Pull the tassel down, then let go.';
    stage.append(line, tassel, label, hint);
    line.style.left = tassel.style.left = '50%';

    const show = (on: boolean) => {
      label.style.display = on ? '' : 'none';
    };
    const place = (pull: number) => {
      tassel.dataset.pull = pull.toFixed(1);
      tassel.style.transform = `translateY(${pull}px)`;
      line.style.height = `${CORD + pull}px`;
    };

    if (kit.reduced) {
      tassel.addEventListener('click', () => show(true));
      return;
    }

    let startY: number | undefined;
    let frame = 0;
    const stopSpring = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };
    rests.set(stage, () => {
      stopSpring();
      place(0);
    });
    const springBack = () => {
      let s = { x: Number(tassel.dataset.pull), v: 0 };
      let last = performance.now();
      const tick = (now: number) => {
        s = stepSpring(s, 0, Math.min(0.05, (now - last) / 1000));
        last = now;
        if (Math.abs(s.x) < 0.5 && Math.abs(s.v) < 5) {
          place(0);
          frame = 0;
          return;
        }
        place(s.x);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    const down = (e: PointerEvent) => {
      stopSpring();
      show(false);
      startY = e.clientY;
      try {
        tassel.setPointerCapture?.(e.pointerId);
      } catch {
        // synthetic pointers cannot always be captured
      }
    };
    const move = (e: PointerEvent) => {
      if (startY === undefined) return;
      place(rubber(Math.max(0, e.clientY - startY), LIMIT));
    };
    const up = (e: PointerEvent) => {
      if (startY === undefined) return;
      const pulled = e.clientY - startY;
      startY = undefined;
      if (pulled >= RING_AT) {
        kit.sfx.bell();
        kit.buzz(BELL);
        show(true);
      }
      springBack();
    };

    tassel.addEventListener('pointerdown', down);
    tassel.addEventListener('pointermove', move);
    tassel.addEventListener('pointerup', up);
    tassel.addEventListener('pointercancel', up);
    kit.onLeave(() => {
      tassel.removeEventListener('pointerdown', down);
      tassel.removeEventListener('pointermove', move);
      tassel.removeEventListener('pointerup', up);
      tassel.removeEventListener('pointercancel', up);
      stopSpring();
    });
  },
};
