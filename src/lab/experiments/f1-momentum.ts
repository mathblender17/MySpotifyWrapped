import { CLACK } from '../../feel/patterns';
import { projectFling, rubber, snapIndex, stepSpring } from '../../feel/physics';
import { velocity, type PointSample } from '../../feel/pointer';
import { STATIONS } from '../../journey/stations';
import type { Experiment } from '../types';

const COUNT = STATIONS.length;
const EDGE = 90; // px of give past the first and last card
const settlers = new WeakMap<HTMLElement, () => void>();

/** Test hook: run the stage's current animation to its end without waiting on frames. */
export function settleFor(stage: HTMLElement): void {
  settlers.get(stage)?.();
}

/** F1 Momentum train (ux spec §3): a swipe carries the ride with inertia and settles into each stop with a clack. */
export const f1: Experiment = {
  id: 'f1-momentum',
  layer: 'feel',
  title: 'F1 · Momentum train',
  blurb: 'Flick to rattle through stations; drag slowly to scrub. It settles on a spring with a rail clack.',
  mount(stage, kit) {
    const width = () => stage.getBoundingClientRect().width || 390;
    const strip = document.createElement('div');
    strip.className = 'f1-strip';
    strip.dataset.index = '0';
    strip.style.cssText = 'display:flex;height:100%;touch-action:none;will-change:transform';
    STATIONS.forEach((s, i) => {
      const card = document.createElement('div');
      card.className = 'f1-card';
      card.style.cssText = `flex:0 0 100%;display:grid;place-content:center;text-align:center;background:linear-gradient(${s.accent}55,#0b0f2b);`;
      card.innerHTML = `<b style="font:900 72px 'Dela Gothic One',sans-serif">${i + 1}</b><span style="font:900 28px 'Zen Maru Gothic',sans-serif">${s.nameJp}</span><i style="font-size:12px;letter-spacing:.2em;opacity:.7">${s.nameEn.toUpperCase()}</i>`;
      strip.append(card);
    });
    stage.append(strip);

    let x = 0;
    let v = 0;
    let target = 0;
    let lastIdx = 0;
    let dragging = false;
    let raf = 0;
    let prev = 0;
    let startClient = 0;
    let startX = 0;
    let samples: PointSample[] = [];
    let live = true;

    const maxX = () => (COUNT - 1) * width();
    const render = () => {
      strip.style.transform = `translate3d(${-x}px,0,0)`;
    };
    const idxNow = () => snapIndex(x, COUNT, width());
    const crossed = () => {
      const i = idxNow();
      if (i !== lastIdx) {
        lastIdx = i;
        strip.dataset.index = String(i);
        if (!kit.reduced) {
          kit.fx.clack();
          kit.buzz(CLACK);
        }
      }
    };
    const stepOnce = (dt: number) => {
      const s = stepSpring({ x, v }, target, dt);
      x = s.x;
      v = s.v;
      crossed();
      render();
      if (Math.abs(x - target) < 0.5 && Math.abs(v) < 5) {
        x = target;
        v = 0;
        render();
        return true;
      }
      return false;
    };
    const frame = (now: number) => {
      raf = 0;
      if (!live) return;
      const dt = Math.min(0.032, (now - prev) / 1000 || 1 / 60);
      prev = now;
      if (!stepOnce(dt)) raf = requestAnimationFrame(frame);
    };
    settlers.set(stage, () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      for (let i = 0; i < 900 && !stepOnce(1 / 60); i++);
    });

    const down = (e: PointerEvent) => {
      if (!live) return;
      dragging = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      try {
        strip.setPointerCapture?.(e.pointerId); // capture on the element that listens, or move and up never arrive
      } catch {
        // pointer capture is a nicety; the strip still follows the finger without it
      }
      startClient = e.clientX;
      startX = x;
      v = 0;
      samples = [{ t: e.timeStamp, x: e.clientX, y: e.clientY }];
    };
    const move = (e: PointerEvent) => {
      if (!live || !dragging) return;
      samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
      const raw = startX - (e.clientX - startClient);
      x = raw < 0 ? -rubber(-raw, EDGE) : raw > maxX() ? maxX() + rubber(raw - maxX(), EDGE) : raw;
      crossed();
      render();
    };
    const up = (e: PointerEvent) => {
      if (!live || !dragging) return;
      dragging = false;
      samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
      if (kit.reduced) {
        x = snapIndex(x, COUNT, width()) * width();
        lastIdx = idxNow();
        strip.dataset.index = String(lastIdx);
        render();
        return;
      }
      v = -velocity(samples).vx;
      target = snapIndex(projectFling(x, v), COUNT, width()) * width();
      prev = performance.now();
      raf = requestAnimationFrame(frame);
    };
    strip.addEventListener('pointerdown', down);
    strip.addEventListener('pointermove', move);
    strip.addEventListener('pointerup', up);
    strip.addEventListener('pointercancel', up);
    kit.onLeave(() => {
      live = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      strip.removeEventListener('pointerdown', down);
      strip.removeEventListener('pointermove', move);
      strip.removeEventListener('pointerup', up);
      strip.removeEventListener('pointercancel', up);
      settlers.delete(stage);
    });
  },
};
