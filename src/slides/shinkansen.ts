import type { Slide } from '../story/player';
import { esc, slide } from './fmt';
import './worlds/l.css';

const size = (s: string) => ([...s].length > 20 ? ' l3' : [...s].length > 10 ? ' l2' : '');
const BEAST = `<svg class="beast" viewBox="0 0 120 150" aria-hidden="true"><path d="M60 8c14 0 24 10 24 24 0 6-2 10-4 14 10 4 18 14 20 28l8-4-2 12 10 2-10 8c-2 18-10 34-20 46H34C24 126 18 110 18 92l-10-6 10-4c0-14 6-26 16-32-2-4-4-8-4-14C30 20 44 8 60 8z" fill="#1a1410"/><circle cx="70" cy="28" r="4" fill="#ff2d95"/><path d="M40 6l6 10 4-12 6 10 4-12 6 12 6-10 2 12" stroke="#1a1410" stroke-width="5" fill="none"/></svg>`;

// World L (Shōwa kaiju poster): the year's fastest riser is the monster storming the city.
export const shinkansen: Slide = ({ stats }) => {
  const r = stats!.fastestRiser!;
  const line = r.via === 'race'
    ? `0 → top 5 in <b class="hero">${r.days}</b> days`
    : `up <b class="hero">${r.climb}</b> places in the second half of ${stats!.year}`;
  return slide('shk', `<div class="sky"></div>
    <div class="beastwrap" data-beat="2" data-fx="zoom">${BEAST}</div><div class="city"></div>
    <div class="t" data-beat="1">FASTEST RISING</div>
    <div class="title fit${size(r.artist)}" data-beat="3" data-fx="stamp">${esc(r.artist)}<br>大襲来!!</div>
    <div class="s" data-beat="4">${line}</div>
    <div class="credits" data-beat="4">音楽電車映画 · ${stats!.year} · 総天然色</div>`);
};
