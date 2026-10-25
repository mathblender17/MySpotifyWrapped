import type { Slide } from '../story/player';
import { amountCnt, fmt, slide } from './fmt';
import './worlds/c.css';

// World C (mega type): the days count is the whole poster, cropped at the edge, swelling out of the station sign.
// The gate tunnel itself lives in the 3D district; "one gate for every day" keeps its meaning here in words.
export const torii: Slide = ({ stats }) => {
  const s = stats!;
  const days = s.daysListened!;
  const marquee = `千本鳥居 · ${s.year} · `.repeat(4);
  return slide('tor', `<div class="sun"></div>
    <div class="marq" data-crop data-beat="1">${marquee}</div>
    <b class="hero" data-crop data-beat="2" data-fx="grow count" data-count="${days}" data-suffix="">${fmt(days)}</b>
    <div class="s" data-beat="3">days you listened in ${s.year}<br><small>one gate for every one of them</small></div>
    <div class="band" data-beat="4">${amountCnt(4, s)}</div>
    <div class="ft" data-beat="5"><b>千本鳥居</b> one gate, every day</div>`);
};
