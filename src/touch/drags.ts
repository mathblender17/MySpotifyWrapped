import { gsap } from 'gsap';
import type { TouchKit } from './kit';
import { fmt } from '../slides/fmt';
import { fujiStep, weekDate } from '../slides/fuji';

const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;

/** Wire a captured drag: busy for exactly one take; `move` gets design-px coords relative to `slide`. */
function drag(target: HTMLElement, slide: HTMLElement, kit: TouchKit, move: (x: number, y: number) => void, up?: () => void): void {
  let release: (() => void) | undefined;
  const at = (e: PointerEvent) => {
    const r = slide.getBoundingClientRect();
    const k = r.width / 210 || 1; // jsdom has no layout
    move((e.clientX - r.left) / k, (e.clientY - r.top) / k);
  };
  const end = () => { if (release) { release(); release = undefined; up?.(); } };
  target.addEventListener('pointerdown', (e) => {
    release ??= kit.busy();
    try { target.setPointerCapture?.(e.pointerId); } catch { /* synthetic pointer */ }
    at(e);
  });
  target.addEventListener('pointermove', (e) => { if (release) at(e); });
  target.addEventListener('pointerup', end);
  target.addEventListener('pointercancel', end);
}

/** Forecast: drag the sun through the four seasons; it snaps to the nearest and that cell shows its value. */
export function weather(el: HTMLElement, kit: TouchKit): void {
  const sun = el.querySelector<HTMLElement>('.sun');
  const cells = [...el.querySelectorAll<HTMLElement>('.ss')];
  const n = (sun?.dataset.path ?? '').split(',').map(Number);
  const seasons = kit.stats.seasons;
  if (!sun || !seasons || cells.length !== 4 || n.length !== 8 || n.some(Number.isNaN)) return;
  const pts = [0, 2, 4, 6].map((i) => [n[i], n[i + 1]] as const);
  const [x0, x1] = [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))];
  const [y0, y1] = [Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1]))];
  const unit = kit.stats.minutes !== undefined ? ' min' : ' plays';
  const vals = cells.map((c) => { const v = document.createElement('span'); v.className = 'val'; c.append(v); return v; });
  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
  let near = 0;
  kit.mark(sun);
  drag(sun, el, kit, (px, py) => {
    // The sun is 100 design px wide: its x/y is the top-left, so centre it under the finger.
    const x = clamp(px - 50, x0, x1), y = clamp(py - 50, y0, y1);
    gsap.set(sun, { x, y });
    near = pts.reduce((b, p, i) => (Math.hypot(p[0] - x, p[1] - y) < Math.hypot(pts[b][0] - x, pts[b][1] - y) ? i : b), 0);
    cells.forEach((c, i) => c.classList.toggle('on', i === near));
    vals[near].textContent = fmt(seasons[SEASONS[near]].value) + unit;
  }, () => {
    const d = kit.dur(0.25);
    if (d > 0) gsap.to(sun, { x: pts[near][0], y: pts[near][1], duration: d, ease: 'power2.out' });
    else gsap.set(sun, { x: pts[near][0], y: pts[near][1] });
  });
}

/** Fuji: drag along the ridge; an ink marker follows to the nearest week and tells its date and listening. */
export function fuji(el: HTMLElement, kit: TouchKit): void {
  const svg = el.querySelector<SVGElement>('svg');
  const weekly = kit.stats.weekly;
  if (!svg || !weekly || weekly.length < 2) return;
  const step = fujiStep(weekly.length);
  const unit = kit.stats.minutes !== undefined ? ' min' : ' plays';
  let marker: HTMLElement | undefined;
  let label: HTMLElement;
  kit.mark(svg);
  drag(svg as unknown as HTMLElement, el, kit, (px) => {
    if (!marker) {
      marker = document.createElement('i');
      marker.className = 'marker';
      label = document.createElement('b');
      marker.append(label);
      el.append(marker);
    }
    const i = Math.min(weekly.length - 1, Math.max(0, Math.round((px - 16) / step)));
    marker.style.left = `${16 + i * step}px`;
    label.className = i > weekly.length / 2 ? 'r' : '';
    label.textContent = `week of ${weekDate(weekly[i].start)} · ${fmt(weekly[i].value)}${unit}`;
  });
}
