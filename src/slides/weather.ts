import type { Slide } from '../story/player';
import type { Season } from '../types';
import { esc, slide } from './fmt';

const CELLS: [Season, string, string][] = [['spring', '春', '🌸'], ['summer', '夏', '☀'], ['autumn', '秋', '🍁'], ['winter', '冬', '❄']];

export const weather: Slide = ({ stats }) => {
  const cells = CELLS.map(([k, jp, icon]) => {
    const name = stats!.seasons![k].topArtist?.name;
    return `<div><span class="jp">${jp}</span><b>${icon}</b><span class="nm">${name ? esc(name) : '—'}</span></div>`;
  }).join('');
  return slide('wx', `<span class="bar">♪ 音楽天気予報 · ${stats!.year}</span>
    <div class="map"><div class="isl" style="width:40px;height:30px;top:6px;right:26px"></div><div class="isl" style="width:70px;height:36px;top:40px;right:52px;transform:rotate(-30deg)"></div><div class="isl" style="width:40px;height:26px;top:82px;left:40px"></div></div>
    <div class="fc">${cells}</div>
    <div class="ft">your #1 artist, season by season</div>`);
};
