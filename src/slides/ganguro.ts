import type { Slide } from '../story/player';
import { esc, slide } from './fmt';

export const ganguro: Slide = ({ stats }) =>
  slide('gan', `<div class="hair" data-beat="1" data-fx="stamp"></div>
    <div class="t" data-beat="1">ガングロ ✦ 渋谷センター街</div>
    <div class="sp"></div>
    <div class="eye" data-beat="2"><i></i><i></i></div>
    <div class="big" data-beat="3" data-fx="stamp">TOP GENRE<br><span>${esc(stats!.topGenre!.toUpperCase())}</span></div>
    <div class="lips" data-beat="4"></div>`);
