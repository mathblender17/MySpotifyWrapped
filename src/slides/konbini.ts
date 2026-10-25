import { photoCredit } from '../art/credits';
import type { Slide } from '../story/player';
import { amountCnt, esc, fmt, slide } from './fmt';
import './worlds/b.css';

// World B (neon riso night): a receipt printed in two off-register inks over a duotoned Kabukicho at 23:59.
export const konbini: Slide = ({ stats }) => {
  const s = stats!;
  const rows = s.topTracks!.map((t) => `<div class="r"><span class="nm clip">${esc(t.name)}</span><span>${t.plays !== undefined ? `×${fmt(t.plays)}` : ''}</span></div>`).join('');
  return slide('kon', `<div class="photo"></div><div class="duo"></div><div class="dots"></div>
    <div class="shop" data-beat="1">コンビニ</div>
    <div class="rc">
      <div class="h" data-beat="1">♪ YOUR YEAR MART ♪<br>${s.year}/12/31 23:59</div>
      <div class="rows" data-beat="2" data-fx="type">${rows}</div>
      <div class="by" data-beat="4">top 5 songs · ${s.year}</div>
      <div class="bc" data-beat="4">またのご来店を<br>||||| ||| |||| ||</div>
    </div>
    <div class="tot" data-beat="3"><small>合計 · TOTAL</small><b class="hero">${amountCnt(3, s)}</b></div>
    ${photoCredit()}`, { dark: true });
};
