import type { Slide } from '../story/player';
import { amountCnt, esc, fmt, slide } from './fmt';

export const konbini: Slide = ({ stats }) => {
  const s = stats!;
  const rows = s.topTracks!.map((t) => `<div class="r"><span>${esc(t.name)}</span><span>${t.plays !== undefined ? `×${fmt(t.plays)}` : ''}</span></div>`).join('');
  return slide('kon', `<div class="rc">
    <div class="h" data-beat="1">♪ YOUR YEAR MART ♪<br>${s.year}/12/31 23:59</div>
    <div class="rows" data-beat="2" data-fx="type">${rows}</div>
    <div class="tot r" data-beat="3"><span>合計</span>${amountCnt(3, s)}</div>
    <div class="by" data-beat="4">top 5 songs · ${s.year}</div>
    <div class="bc" data-beat="4">またのご来店を<br>||||| ||| |||| ||</div>
  </div>`);
};
