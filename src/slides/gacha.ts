import type { Slide } from '../story/player';
import { esc, slide } from './fmt';

export const gacha: Slide = ({ stats }) => {
  const t = stats!.topTracks![0];
  return slide('gac', `<div class="lb" data-beat="1">✦ 確定演出 ✦</div>
    <div class="card" data-beat="3" data-fx="stamp"><div><div class="ssr">SSR</div><div class="nm" data-beat="4">${esc(t.name)}</div><div class="ar" data-beat="4">${esc(t.artist ?? '')}</div><div class="st" data-beat="5" data-fx="type"><i>★</i><i>★</i><i>★</i><i>★</i><i>★</i></div></div></div>
    <div class="lb" data-beat="5">YOUR #1 SONG OF ${stats!.year}</div>
    <div class="flash" data-beat="2" data-fx="flash"></div>`);
};
