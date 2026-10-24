import type { Slide } from '../story/player';
import { esc, slide } from './fmt';

const RANKS = ['横綱', '大関', '関脇', '小結', '前頭'];

// Reiwa began May 2019; a listening year is labelled by the era it mostly falls in.
const era = (y: number) => (y >= 2019 ? `令和${y === 2019 ? '元' : y - 2018}年` : `平成${y - 1988}年`);

export const sumo: Slide = ({ stats }) => {
  const list = stats!.topArtists!;
  // DOM in rank order (CSS lays columns right-to-left); beats count up from the lowest rank, yokozuna held back for last.
  const cols = list
    .map((a, i) => {
      const beat = i === 0 ? list.length + 1 : list.length + 1 - i;
      const fx = i === 0 ? 'hide stamp' : 'stamp';
      return `<div class="${i ? '' : 'y'}" data-beat="${beat}" data-fx="${fx}"><span class="rk">${RANKS[i]}</span> ${esc(a.name)}</div>`;
    })
    .join('');
  return slide('sumo', `<div class="hd" data-beat="1">${era(stats!.year)} 番付</div><div class="cols">${cols}</div><div class="ft" data-beat="1">your artist banzuke · ${stats!.year}</div>`);
};
