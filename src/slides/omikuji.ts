import type { Slide } from '../story/player';
import { esc, slide } from './fmt';

export const omikuji: Slide = ({ stats }) => {
  const p = stats!.personality!;
  const f = stats!.fortune!;
  return slide('omi', `<div class="slip">
    <div class="hd">音楽みくじ · ${stats!.year}</div>
    <div class="kk">${esc(f.jp)}</div>
    <div class="en">${esc(f.en)}</div>
    <div class="pj">${esc(p.jp)}</div>
    <div class="pn">${esc(p.name)}</div>
    <div class="ln">${esc(p.line)}</div>
  </div>`);
};
