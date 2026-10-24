import type { Slide } from '../story/player';
import { esc, plays, slide } from './fmt';
import './worlds/f.css';

// World F (station wayfinding): the departure board is a platform sign, each year a train on its own platform.
export const departure: Slide = (ctx) => {
  const el = slide('dep', `
    <div class="bar"></div>
    <div class="hd" data-beat="1"><div><b class="jp">出発</b><span class="en">DEPARTURES</span></div><div class="os"><small>OS</small><b>01</b></div></div>
    <div class="board" data-beat="2" data-fx="type"></div>
    <div class="ft" data-beat="3"><span class="led">乗る年を選んでね <i>☆</i></span><span class="pk">Pick your year's train ▶</span></div>`);
  const board = el.querySelector('.board')!;
  for (const y of ctx.years) {
    const row = document.createElement(y.eligible ? 'button' : 'div');
    row.className = y.eligible ? 'row' : 'row off';
    row.innerHTML = y.eligible
      ? `<span class="ty">普通</span><span class="yr">${esc(y.year)}</span><span class="pl clip">${plays(y.plays)}</span><span class="go">▶</span>`
      : `<span class="ty">運休</span><span class="yr">${esc(y.year)}</span><span class="pl clip">only ${plays(y.plays)}</span>`;
    if (y.eligible) row.addEventListener('click', () => ctx.onPickYear(y.year));
    board.append(row);
  }
  return el;
};
