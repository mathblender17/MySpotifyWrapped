import type { Slide } from '../story/player';
import { esc, slide } from './fmt';
import './worlds/g.css';

// Long genres step down a size, then wrap anywhere, so the chrome type never leaves the slide.
const size = (s: string) => ([...s].length > 24 ? ' l3' : [...s].length > 12 ? ' l2' : '');

// World G (Y2K keitai chrome): the top genre in holographic bubble type, a flip-phone sticker, glitter.
export const ganguro: Slide = ({ stats }) => {
  const genre = stats!.topGenre!.toUpperCase();
  const share = stats!.genreShares?.[0]?.share;
  const pct = share === undefined ? undefined : Math.round(share * 100);
  return slide('gan', `<i class="star s1">✦</i><i class="star s2">✦</i><i class="star s3">✧</i>
    <div class="tag" data-beat="1">TOP GENRE ✦</div>
    <div class="phone" data-beat="1"><div>ｷﾀ━━!! ☆<br>渋谷センター街</div></div>
    <div class="nm fit${size(genre)}" data-beat="2" data-fx="stamp">${esc(genre)}</div>
    ${pct === undefined ? '' : `<div class="hero" data-beat="3" data-fx="count" data-count="${pct}" data-suffix="%">${pct}%</div>`}
    <div class="ft" data-beat="4">♡ ガングロ ✦ #1 genre · ${stats!.year}</div>`);
};
