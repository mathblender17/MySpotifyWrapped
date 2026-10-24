import type { Slide } from '../story/player';
import { amount, esc, slide } from './fmt';

export const kanji: Slide = ({ stats }) => {
  const s = stats!;
  return slide('kj', `<div class="hd" data-beat="1">今年の漢字 · ${s.year}</div>
    <div class="big" data-beat="2" data-fx="stamp">${esc(s.kanji!.kanji)}</div>
    <div class="mn" data-beat="3">${esc(s.kanji!.meaning)}</div>
    <div class="sum" data-beat="4" data-fx="type">
      <div><span>listened</span><b>${amount(s)}</b></div>
      <div><span>#1 artist</span><b>${esc(s.topArtists![0].name)}</b></div>
      <div><span>#1 song</span><b>${esc(s.topTracks![0].name)}</b></div>
    </div>
    <div class="hk">音楽<br>電車</div>`);
};
