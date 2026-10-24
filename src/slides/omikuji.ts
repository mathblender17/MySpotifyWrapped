import type { Slide } from '../story/player';
import { esc, slide } from './fmt';

export const omikuji: Slide = ({ stats }) => {
  const p = stats!.personality!;
  const f = stats!.fortune!;
  return slide('omi', `<div class="slip" data-beat="1" data-fx="drop">
    <div class="hd">音楽みくじ · ${stats!.year}</div>
    <div class="kk" data-beat="2" data-fx="stamp">${esc(f.jp)}</div>
    <div class="en" data-beat="2">${esc(f.en)}</div>
    <div class="pj" data-beat="3">${esc(p.jp)}</div>
    <div class="pn" data-beat="3">${esc(p.name)}</div>
    <div class="ln" data-beat="4">${esc(p.line)}</div>
  </div>`);
};
