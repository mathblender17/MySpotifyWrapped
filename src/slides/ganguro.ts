import type { Slide } from '../story/player';
import { esc, slide } from './fmt';

export const ganguro: Slide = ({ stats }) =>
  slide('gan', `<div class="hair"></div>
    <div class="t">ガングロ ✦ 渋谷センター街</div>
    <div class="sp"></div>
    <div class="eye"><i></i><i></i></div>
    <div class="big">TOP GENRE<br><span>${esc(stats!.topGenre!.toUpperCase())}</span></div>
    <div class="lips"></div>`);
