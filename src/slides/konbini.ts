import type { Slide } from '../story/player';
import { amount, esc, fmt, slide } from './fmt';

export const konbini: Slide = ({ stats }) => {
  const s = stats!;
  const rows = s.topTracks!.map((t) => `<div class="r"><span>${esc(t.name)}</span><span>${t.plays !== undefined ? `×${fmt(t.plays)}` : ''}</span></div>`).join('');
  return slide('kon', `<div class="rc">
    <div class="h">♪ YOUR YEAR MART ♪<br>${s.year}/12/31 23:59</div>
    ${rows}
    <div class="tot r"><span>合計</span><span>${amount(s)}</span></div>
    <div class="by">top 5 songs · ${s.year}</div>
    <div class="bc">またのご来店を<br>||||| ||| |||| ||</div>
  </div>`);
};
