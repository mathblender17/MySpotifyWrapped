import type { Slide } from '../story/player';
import { esc, slide } from './fmt';

export const shinkansen: Slide = ({ stats }) => {
  const r = stats!.fastestRiser!;
  const line = r.via === 'race' ? `0 → top 5 in ${r.days} days` : `up ${r.climb} places in the second half of ${stats!.year}`;
  return slide('shk', `<div class="t">FASTEST<br>RISING</div>
    <div class="nose"></div><div class="win"></div>
    <div class="nm">${esc(r.artist)}</div>
    <div class="s">${line}</div>`);
};
