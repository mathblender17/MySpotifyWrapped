import type { Slide } from '../story/player';
import { esc, slide } from './fmt';

const RANKS = ['横綱', '大関', '関脇', '小結', '前頭'];

export const sumo: Slide = ({ stats }) => {
  // DOM in rank order; CSS lays the columns right-to-left like a real banzuke.
  const cols = stats!.topArtists!.map((a, i) => `<div class="${i ? '' : 'y'}"><span class="rk">${RANKS[i]}</span> ${esc(a.name)}</div>`).join('');
  return slide('sumo', `<div class="hd">令和${stats!.year - 2018}年 番付</div><div class="cols">${cols}</div><div class="ft">your artist banzuke · ${stats!.year}</div>`);
};
