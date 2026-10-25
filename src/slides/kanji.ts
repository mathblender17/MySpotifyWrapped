import type { Slide } from '../story/player';
import { amount, esc, slide } from './fmt';
import './worlds/c.css';

// Worlds C + F, the share card: the year's kanji as mega type on the flat field, under the wayfinding band.
export const kanji: Slide = ({ stats }) => {
  const s = stats!;
  return slide('kj', `<div class="band" data-beat="1">今年の漢字 · ${s.year}</div>
    <div class="hero" data-crop data-beat="2" data-fx="brush">${esc(s.kanji!.kanji)}</div>
    <div class="mn" data-beat="3">${esc(s.kanji!.meaning)}</div>
    <div class="sum" data-beat="4" data-fx="type">
      <div><span>listened</span><b class="clip">${amount(s)}</b></div>
      <div><span>#1 artist</span><b class="clip">${esc(s.topArtists![0].name)}</b></div>
      <div><span>#1 song</span><b class="clip">${esc(s.topTracks![0].name)}</b></div>
    </div>
    <div class="hk">音楽<br>電車</div>`);
};
