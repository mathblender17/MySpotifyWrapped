import type { Slide } from '../story/player';
import { esc, slide } from './fmt';

const FILLS = ['#fff', '#f6c35a', '#7bd67b', '#ff9aa8', '#9ad6ff'];

export const bento: Slide = ({ stats }) => {
  const g = stats!.genreShares!;
  const top = g.slice(0, 4);
  const other = 1 - top.reduce((a, x) => a + x.share, 0);
  const cells = [...top, ...(other > 0.005 ? [{ genre: 'other', share: other }] : [])]
    .map((x, i) => `<div class="c${i ? '' : ' rice'}" style="background:${FILLS[i]}">${i ? '' : '<i></i>'}${esc(x.genre.toUpperCase())}<b>${Math.round(x.share * 100)}%</b></div>`)
    .join('');
  return slide('ben', `<div class="hd">あなたの音楽弁当</div><div class="box">${cells}</div><div class="ft">your year, packed by genre</div>`);
};
