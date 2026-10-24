import type { Slide } from '../story/player';
import { esc, fmt, slide } from './fmt';

export const departure: Slide = (ctx) => {
  const el = slide('dep', `
    <div class="hd"><span>発車案内</span><span>DEPARTURES</span></div>
    <div class="board"></div>
    <div class="ft">Pick your year's train ▶<br><span>乗る年を選んでね ☆</span></div>`);
  const board = el.querySelector('.board')!;
  for (const y of ctx.years) {
    const row = document.createElement(y.eligible ? 'button' : 'div');
    row.className = y.eligible ? 'row' : 'row off';
    row.innerHTML = y.eligible
      ? `<span class="ty">普通</span><span class="yr">${esc(y.year)}</span><span class="pl">${fmt(y.plays)} plays</span><span class="go">▶</span>`
      : `<span class="ty">運休</span><span class="yr">${esc(y.year)}</span><span class="pl">only ${fmt(y.plays)} plays</span>`;
    if (y.eligible) row.addEventListener('click', () => ctx.onPickYear(y.year));
    board.append(row);
  }
  return el;
};
