import { fmt, plays } from '../slides/fmt';
import type { TouchKit } from './kit';

/** Sumo: tap a rank panel to blow it up with its first artist's minutes (or plays); one panel zoomed at a time. */
export function sumo(el: HTMLElement, kit: TouchKit): void {
  const list = kit.stats.topArtists;
  if (!list) return;
  let open: { pnl: HTMLElement; release: () => void } | undefined;
  const close = () => { open?.pnl.classList.remove('zoom'); open?.release(); open = undefined; };
  for (const [sel, i] of [['.pa', 1], ['.pb', 3]] as const) {
    const pnl = el.querySelector<HTMLElement>(sel);
    const a = list[i];
    if (!pnl || !a || (a.minutes === undefined && a.plays === undefined)) continue;
    const badge = document.createElement('b');
    badge.className = 'mins';
    badge.textContent = a.minutes !== undefined ? `${fmt(a.minutes)} min` : plays(a.plays!);
    pnl.append(badge);
    if (kit.reduced) pnl.style.transition = 'none';
    kit.mark(pnl);
    pnl.addEventListener('click', () => {
      const same = open?.pnl === pnl;
      close();
      if (same) return;
      pnl.classList.add('zoom');
      open = { pnl, release: kit.busy() };
      kit.sfx.don();
      kit.buzz(10);
    });
  }
}
