import type { Slide } from '../story/player';
import { amount, fmt, slide } from './fmt';

export const torii: Slide = ({ stats }) => {
  const s = stats!;
  const gates = [0, 1, 2, 3, 4].map((i) => `<div class="g" style="top:${26 + i * 34}px;width:${190 - i * 34}px;height:${330 - i * 58}px;opacity:${1 - i * 0.15}"></div>`).join('');
  return slide('tor', `${gates}
    <div class="tx">
      <div class="k">千本鳥居</div>
      <div class="big">${fmt(s.daysListened!)}</div>
      <div class="s">days you listened in ${s.year}<br>one gate for every one of them</div>
      <div class="amt">${amount(s)}</div>
    </div>`);
};
