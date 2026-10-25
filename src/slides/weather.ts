import type { Slide } from '../story/player';
import type { Season } from '../types';
import { cnt, esc, slide } from './fmt';
import './worlds/o.css';

const CELLS: [Season, string, string][] = [['spring', '春', 'SPRING'], ['summer', '夏', 'SUMMER'], ['autumn', '秋', 'AUTUMN'], ['winter', '冬', 'WINTER']];
// The sun's position (design px) as each season arrives: low left → high → high right → low right.
const PATH = [6, 112, 48, 36, 88, 52, 94, 118];

// World O (1960s modernism): one red sun crossing a cream sky, a season per beat, its #1 artist beneath.
export const weather: Slide = ({ stats }) => {
  const seasons = stats!.seasons!;
  const cells = CELLS.map(([k, jp, en], i) => {
    const name = seasons[k].topArtist?.name;
    return `<div class="ss" data-beat="${3 + i}"><span class="lb">${en} · ${jp}</span><span class="nm fit">${name ? esc(name) : '—'}</span></div>`;
  }).join('');
  const [loudKey, loud] = CELLS.map(([k, , en]) => [en, seasons[k].value] as const).reduce((a, b) => (b[1] > a[1] ? b : a));
  const unit = stats!.minutes !== undefined ? ' min' : ' plays';
  return slide('wx', `<div class="sun" data-beat="2" data-fx="steps orbit" data-path="${PATH.join(',')}"></div>
    <div class="low"><div class="grid">${cells}</div>
    <div class="loud" data-beat="7"><small>your loudest season · ${loudKey}</small><b class="hero">${cnt(7, loud, unit)}</b></div></div>
    <div class="ft" data-beat="1">音楽天気予報 · ${stats!.year}</div>`);
};
