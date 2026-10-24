import type { Slide } from '../story/player';
import { esc, slide } from './fmt';
import './worlds/d.css';

const RANKS = ['横綱', '大関', '関脇', '小結', '前頭'];

// Reiwa began May 2019; a listening year is labelled by the era it mostly falls in.
const era = (y: number) => (y >= 2019 ? `令和${y === 2019 ? '元' : y - 2018}年` : `平成${y - 1988}年`);

// Long names step down a size, then wrap anywhere (CSS), so the splash never overflows.
const size = (name: string) => ([...name].length > 24 ? ' l3' : [...name].length > 12 ? ' l2' : '');

// World D (shōnen manga): a page of panels. DOM is in rank order (#1 first, for screen readers); the grid places
// the Yokozuna splash at the foot of the page. Beats count up from the lowest rank, the splash held back for last.
export const sumo: Slide = ({ stats }) => {
  const list = stats!.topArtists!;
  const n = list.length;
  const cap = (i: number) =>
    `<div class="cap" data-beat="${n + 1 - i}" data-fx="stamp"><span class="rk">${RANKS[i]}</span><span class="an">${esc(list[i].name)}</span></div>`;
  const panel = (cls: string, from: number) =>
    list.length > from ? `<div class="pnl ${cls}">${[from, from + 1].filter((i) => i < n).map(cap).join('')}</div>` : '';
  const y = list[0];
  return slide('sumo', `
    <div class="pnl p1 tone" data-beat="1"><div class="bub">${era(stats!.year)} 番付<br>発表〜!!</div></div>
    <div class="pnl splash" data-beat="${n + 1}" data-fx="hide stamp" data-sfx="don">
      <span class="badge">横綱</span><span class="nm fit${size(y.name)}">${esc(y.name)}</span><span class="don">ドン</span>
    </div>
    ${panel('pa tone', 1)}${panel('pb tone', 3)}
    <div class="ft" data-beat="1">your artist banzuke · ${stats!.year}</div>`);
};
