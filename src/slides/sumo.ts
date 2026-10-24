import type { Slide } from '../story/player';
import { esc, slide } from './fmt';

const RANKS = ['横綱', '大関', '関脇', '小結', '前頭'];

// Reiwa began May 2019; a listening year is labelled by the era it mostly falls in.
const era = (y: number) => (y >= 2019 ? `令和${y === 2019 ? '元' : y - 2018}年` : `平成${y - 1988}年`);

export const sumo: Slide = ({ stats }) => {
  // DOM in rank order; CSS lays the columns right-to-left like a real banzuke.
  const cols = stats!.topArtists!.map((a, i) => `<div class="${i ? '' : 'y'}"><span class="rk">${RANKS[i]}</span> ${esc(a.name)}</div>`).join('');
  return slide('sumo', `<div class="hd">${era(stats!.year)} 番付</div><div class="cols">${cols}</div><div class="ft">your artist banzuke · ${stats!.year}</div>`);
};
