import type { Slide } from '../story/player';
import { amountCnt, cnt, slide } from './fmt';

export const torii: Slide = ({ stats }) => {
  const s = stats!;
  // Nearest (biggest) gate last, so the tunnel builds towards you.
  const gates = [0, 1, 2, 3, 4]
    .map((i) => `<div class="g" data-beat="${5 - i}" style="top:${26 + i * 34}px;width:${190 - i * 34}px;height:${330 - i * 58}px;opacity:${1 - i * 0.15}"></div>`)
    .join('');
  return slide('tor', `${gates}
    <div class="tx">
      <div class="k" data-beat="6" data-fx="stamp">千本鳥居</div>
      <div class="big">${cnt(7, s.daysListened!)}</div>
      <div class="s" data-beat="7">days you listened in ${s.year}<br>one gate for every one of them</div>
      <div class="amt">${amountCnt(8, s)}</div>
    </div>`);
};
