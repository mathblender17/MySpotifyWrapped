import { photoCredit } from '../art/credits';
import type { Slide } from '../story/player';
import { cnt, esc, slide } from './fmt';
import './worlds/j.css';

// World J (sports newspaper): the year's genres as a league table; the leader gets the red vertical headline.
export const bento: Slide = ({ stats }) => {
  const g = stats!.genreShares!;
  const top = g.slice(0, 4);
  const other = 1 - top.reduce((a, x) => a + x.share, 0);
  const rows = [...top, ...(other > 0.005 ? [{ genre: 'other', share: other }] : [])]
    .map((x, i) => {
      const pct = Math.round(x.share * 100);
      return `<div class="row"><span class="rk">${i + 1}</span><span class="gn clip">${esc(x.genre.toUpperCase())}</span><span class="bar"><i style="width:${pct}%" data-pct="${pct}%"></i></span><b>${cnt(3, pct, '%')}</b></div>`;
    })
    .join('');
  const lead = g[0];
  return slide('ben', `<div class="mast" data-beat="1"><span>音楽スポーツ</span><small>${stats!.year} · GENRE LEAGUE</small></div>
    <div class="h1" data-beat="2" data-fx="stamp">首位独走!!</div>
    <div class="kick" data-beat="2">TOP GENRE</div>
    <div class="h3 fit" data-beat="2">${esc(lead.genre.toUpperCase())}</div>
    <div class="hero" data-beat="3" data-fx="count" data-count="${Math.round(lead.share * 100)}" data-suffix="%">${Math.round(lead.share * 100)}%</div>
    <div class="box" data-beat="3">${rows}</div>
    <div class="photo"></div><div class="ht"></div>${photoCredit()}
    <div class="ft" data-beat="4">your year, packed by genre</div>`);
};
