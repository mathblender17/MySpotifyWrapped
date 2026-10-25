import { photoCredit } from '../art/credits';
import type { Slide } from '../story/player';
import { amountCnt, cnt, esc, slide } from './fmt';
import './worlds/q.css';

const size = (s: string) => ([...s].length > 24 ? ' l3' : [...s].length > 12 ? ' l2' : '');

// World Q (gyaru magazine): a cover of the city at night, the #1 artist set in its cover lines. The photo is
// Kabukicho, never presented as the artist.
export const idol: Slide = ({ stats }) => {
  const a = stats!.topArtists![0];
  const share = stats!.topArtistShare;
  return slide('idol', `<div class="cover"></div>${photoCredit()}
    <div class="mast" data-beat="1">ぎゃる</div>
    <div class="issue" data-beat="1">${stats!.year} 推し号</div>
    <div class="cl cl1" data-beat="2">♡ 今年の推し ♡</div>
    <div class="cl oshi fit${size(a.name)}" data-beat="2" data-fx="stamp">${esc(a.name)}</div>
    ${share !== undefined ? `<div class="cl cl2" data-beat="3">${Math.round(share * 100)}% of your whole year</div>` : ''}
    ${a.plays !== undefined ? `<div class="cl cl4" data-beat="4">推し活 ${cnt(4, a.plays, '回')}</div>` : ''}
    <div class="price" data-beat="5"><small>with your #1</small><b class="hero">${amountCnt(5, stats!, a)}</b></div>`, { dark: true });
};
