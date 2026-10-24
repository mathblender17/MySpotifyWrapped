import type { Slide } from '../story/player';
import { esc, slide } from './fmt';

export const shinkansen: Slide = ({ stats }) => {
  const r = stats!.fastestRiser!;
  const line = r.via === 'race' ? `0 → top 5 in ${r.days} days` : `up ${r.climb} places in the second half of ${stats!.year}`;
  return slide('shk', `<div class="t" data-beat="1">FASTEST<br>RISING</div>
    <div class="train" data-beat="2" data-fx="zoom"><div class="nose"></div><div class="win"></div></div>
    <div class="nm" data-beat="3" data-fx="stamp">${esc(r.artist)}</div>
    <div class="s" data-beat="4">${line}</div>`);
};
