import { gsap } from 'gsap';
import type { TouchKit } from './kit';

/** Bento: tap the league table to lift its rows in turn, the lifted row's bar full width with its share. */
export function bento(el: HTMLElement, kit: TouchKit): void {
  const box = el.querySelector<HTMLElement>('.box');
  const rows = [...(box?.querySelectorAll<HTMLElement>('.row') ?? [])];
  if (!box || !rows.length || !kit.stats.genreShares?.length) return;
  kit.mark(box);
  let n = 0;
  box.addEventListener('click', () => {
    el.querySelector('.row.lift')?.classList.remove('lift');
    rows[n++ % rows.length].classList.add('lift');
  });
}

/** Kanji: the dock ticket becomes touchable; a tap turns it over to the ride date and stamp count (and back). */
export function kanji(_el: HTMLElement, kit: TouchKit): void {
  const t = kit.ticket.el;
  kit.mark(t);
  const tap = () => {
    kit.ticket.flip();
    const release = kit.busy();
    if (kit.dur(0.5) === 0) return release();
    gsap.delayedCall(kit.dur(0.5), release);
  };
  t.addEventListener('click', tap);
  kit.onLeave(() => {
    t.removeEventListener('click', tap);
    t.removeAttribute('data-touch');
    t.querySelector('.touch-dot')?.remove();
    t.classList.remove('flipped');
  });
}
