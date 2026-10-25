import type { Slide } from '../story/player';
import { esc, slide } from './fmt';
import './worlds/k.css';

const typed = (s: string) => [...s].map((c) => `<i>${esc(c)}</i>`).join('');

// World K (JRPG pixel): the #1 song is the SSR pull, announced in blue menu windows over a dithered sunset.
export const gacha: Slide = ({ stats }) => {
  const t = stats!.topTracks![0];
  return slide('gac', `<div class="k-sky"></div><div class="k-sun"></div><div class="k-mt"></div>
    <div class="lv" data-beat="1">✦ 確定演出 ✦</div>
    <div class="k-win card" data-beat="3" data-fx="stamp" data-sfx="blip" data-haptic="ssr">
      <div class="ssr">★ SSR GET! ★</div>
      <div class="k-song" data-beat="4">${esc(t.name)}</div>
      <div class="ar" data-beat="4">${esc(t.artist ?? '')}</div>
      <div class="st" data-beat="5" data-fx="type"><i>★</i><i>★</i><i>★</i><i>★</i><i>★</i></div>
    </div>
    <div class="k-win msg" data-beat="6" data-fx="type" data-sfx="blip"><i class="cur">▶ </i><i>${esc(t.name)}</i><i> を</i><br>${typed('　てにいれた!')}</div>
    <div class="lb" data-beat="6">YOUR #1 SONG OF ${stats!.year}</div>
    <div class="k-scan"></div>
    <div class="flash" data-beat="2" data-fx="flash"></div>`, { dark: true });
};
