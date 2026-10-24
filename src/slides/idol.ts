import type { Slide } from '../story/player';
import { amount, esc, fmt, slide } from './fmt';

const PENS = ['#ff2d95', '#ffe600', '#3cf6ff', '#7a5cff', '#58ff7a'];

export const idol: Slide = ({ stats }) => {
  const a = stats!.topArtists![0];
  const share = stats!.topArtistShare;
  return slide('idol', `
    <div class="c">♡ 今年の推し ♡</div>
    <div class="ch"><div class="pic"></div><div class="sig">${esc(a.name)} ♡</div></div>
    <div class="oshi">${esc(a.name)}</div>
    <div class="st">${a.plays !== undefined ? `推し活 ${fmt(a.plays)}回 · ` : ''}${amount(stats!, a)}${share !== undefined ? `<br>${Math.round(share * 100)}% of your whole year` : ''}</div>
    <div class="pen">${PENS.map((c) => `<i style="background:${c};color:${c}"></i>`).join('')}</div>`);
};
