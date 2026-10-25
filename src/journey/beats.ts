import { gsap } from 'gsap';
import { fmt } from '../slides/fmt';

const GAP = 0.35;

export function prefersReducedMotion(): boolean {
  if (new URLSearchParams(location.search).get('reduced') === '1') return true;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const countText = (el: HTMLElement, n: number) => `${fmt(n)}${el.dataset.suffix ?? ''}`;

/** Add one element's entrance at `at`. Every fx ends with the element visible, except `flash` (an overlay that fades away). */
function enter(tl: gsap.core.Timeline, el: HTMLElement, at: number) {
  const fx = (el.dataset.fx ?? 'rise').split(' ');
  if (fx.includes('flash')) {
    tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: 0.6, ease: 'power2.in' }, at);
    return;
  }
  if (fx.includes('type')) {
    tl.set(el, { opacity: 1 }, at);
    tl.fromTo([...el.children], { opacity: 0 }, { opacity: 1, duration: 0.01, stagger: 0.12 }, at);
    return;
  }
  // grow: the element swells out of its top-left corner (torii's count grows out of the docked station sign).
  const grow = () => tl.fromTo(el, { scale: 0.12, transformOrigin: '0% 0%', opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'expo.out' }, at);
  if (fx.includes('count')) {
    const target = Number(el.dataset.count);
    const o = { n: 0 };
    el.textContent = countText(el, 0);
    if (fx.includes('grow')) grow();
    else tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2 }, at);
    tl.to(o, { n: target, duration: 1.2, ease: 'power2.out', onUpdate: () => void (el.textContent = countText(el, o.n)) }, at);
    return;
  }
  if (fx.includes('grow')) grow();
  else if (fx.includes('stamp')) tl.fromTo(el, { opacity: 0, scale: 2.2, rotation: -12 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.35, ease: 'back.out(2)' }, at);
  else if (fx.includes('zoom')) tl.fromTo(el, { opacity: 0, x: 200 }, { opacity: 1, x: 0, duration: 0.7, ease: 'power4.out' }, at);
  else if (fx.includes('drop')) tl.fromTo(el, { opacity: 0, y: -60 }, { opacity: 1, y: 0, duration: 0.5, ease: 'bounce.out' }, at);
  else tl.fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, at);
}

/** When `el`'s beat group starts in playBeats(root)'s timeline, in seconds (everything is at 0 when reduced). */
export function beatTime(root: HTMLElement, el: HTMLElement, reduced = false): number {
  if (reduced) return 0;
  const order = [...new Set([...root.querySelectorAll<HTMLElement>('[data-beat]')].map((b) => Number(b.dataset.beat)))].sort((a, b) => a - b);
  return Math.max(0, order.indexOf(Number(el.dataset.beat))) * GAP;
}

/** Turn a slide's data-beat / data-fx marks into a paused timeline: groups play in numeric order, GAP seconds apart. */
export function playBeats(root: HTMLElement, opts: { reduced?: boolean } = {}): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });
  const groups = new Map<number, HTMLElement[]>();
  for (const el of root.querySelectorAll<HTMLElement>('[data-beat]')) {
    const n = Number(el.dataset.beat);
    groups.set(n, [...(groups.get(n) ?? []), el]);
  }
  const order = [...groups.keys()].sort((a, b) => a - b);

  if (opts.reduced) {
    for (const n of order) {
      for (const el of groups.get(n)!) {
        if (el.dataset.fx?.includes('flash')) tl.set(el, { opacity: 0 }, 0);
        else tl.set([el, ...(el.dataset.fx?.includes('type') ? el.children : [])], { opacity: 1 }, 0);
        if (el.dataset.fx?.includes('count')) el.textContent = countText(el, Number(el.dataset.count));
      }
    }
    return tl;
  }

  order.forEach((n, i) => {
    for (const el of groups.get(n)!) enter(tl, el, i * GAP);
  });
  return tl;
}
