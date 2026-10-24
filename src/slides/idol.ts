import type { Slide } from '../story/player';
import { amountCnt, cnt, esc, slide } from './fmt';

const PENS = ['#ff2d95', '#ffe600', '#3cf6ff', '#7a5cff', '#58ff7a'];

export const idol: Slide = ({ stats }) => {
  const a = stats!.topArtists![0];
  const share = stats!.topArtistShare;
  return slide('idol', `
    <div class="c" data-beat="1">♡ 今年の推し ♡</div>
    <div class="ch" data-beat="1" data-fx="drop"><div class="pic"></div><div class="sig">${esc(a.name)} ♡</div></div>
    <div class="oshi" data-beat="2" data-fx="stamp">${esc(a.name)}</div>
    <div class="st">${a.plays !== undefined ? `推し活 ${cnt(4, a.plays, '回')} · ` : ''}${amountCnt(4, stats!, a)}${share !== undefined ? `<br><span data-beat="5">${Math.round(share * 100)}% of your whole year</span>` : ''}</div>
    <div class="pen" data-beat="3">${PENS.map((c) => `<i style="background:${c};color:${c}"></i>`).join('')}</div>`);
};
