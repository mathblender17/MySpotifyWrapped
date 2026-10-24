import type { Slide } from '../story/player';
import { esc, slide } from './fmt';

export const gacha: Slide = ({ stats }) => {
  const t = stats!.topTracks![0];
  return slide('gac', `<div class="lb">✦ 確定演出 ✦</div>
    <div class="card"><div><div class="ssr">SSR</div><div class="nm">${esc(t.name)}</div><div class="ar">${esc(t.artist ?? '')}</div><div class="st">★★★★★</div></div></div>
    <div class="lb">YOUR #1 SONG OF ${stats!.year}</div>`);
};
