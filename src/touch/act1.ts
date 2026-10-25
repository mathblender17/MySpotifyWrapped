import { gsap } from 'gsap';
import { fmt } from '../slides/fmt';
import { setCount } from '../journey/beats';
import type { TouchKit } from './kit';

/** Torii: tap the days number to recount it from 0; the minutes band flips to hours and back. */
export function torii(el: HTMLElement, kit: TouchKit): void {
  const hero = el.querySelector<HTMLElement>('.hero');
  const band = el.querySelector<HTMLElement>('.band');
  const days = kit.stats.daysListened;
  if (!hero || days === undefined) return;
  const minutes = kit.stats.minutes;
  const orig = band?.innerHTML ?? '';
  let hours = false;
  let tween: gsap.core.Tween | undefined;
  kit.mark(hero);
  hero.addEventListener('click', () => {
    const o = { v: 0 };
    tween?.kill();
    tween = gsap.to(o, { v: days, duration: kit.dur(1.2), ease: 'power2.out', onUpdate: () => { setCount(hero, fmt(o.v)); }, onComplete: () => { setCount(hero, fmt(days)); } });
    if (band && minutes !== undefined) {
      hours = !hours;
      band.innerHTML = hours ? `${fmt(Math.round(minutes / 60))} hours` : orig;
    }
  });
}

/** Departure: eligible years are already buttons; add a press buzz. */
export function departure(el: HTMLElement, kit: TouchKit): void {
  el.querySelectorAll('button.row').forEach((b) => b.addEventListener('pointerdown', () => kit.buzz(10)));
}
