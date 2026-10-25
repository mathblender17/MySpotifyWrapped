import type { YearStats } from '../types';
import '../style/tokens.css';
import './slides.css';

export const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');

export const plays = (n: number): string => `${fmt(n)} ${n === 1 ? 'play' : 'plays'}`;

/** Names come from user-supplied files: escape everything that goes into innerHTML. */
export const esc = (s: string | number): string =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Minutes when the source has durations, otherwise plays — never a guessed conversion. */
export const amount = (s: Pick<YearStats, 'minutes' | 'plays'>, n?: { minutes?: number; plays?: number }): string => {
  const src = n ?? s;
  return src.minutes !== undefined ? `${fmt(src.minutes)} min` : plays(src.plays ?? 0);
};

/** A number that counts up on its beat; its resting text is the final value, so it reads right with or without animation. */
export const cnt = (beat: number, n: number, suffix = ''): string =>
  `<span data-beat="${beat}" data-fx="count" data-count="${n}" data-suffix="${esc(suffix)}">${fmt(n)}${esc(suffix)}</span>`;

/** `amount()` as a counting span: minutes when known, otherwise plays. */
export const amountCnt = (beat: number, s: Pick<YearStats, 'minutes' | 'plays'>, n?: { minutes?: number; plays?: number }): string => {
  const src = n ?? s;
  return src.minutes !== undefined ? cnt(beat, src.minutes, ' min') : cnt(beat, src.plays ?? 0, src.plays === 1 ? ' play' : ' plays');
};

export function slide(cls: string, html: string, opts: { dark?: boolean } = {}): HTMLElement {
  const el = document.createElement('div');
  el.className = `ph ${cls} grain${opts.dark ? ' dark' : ''}`;
  el.innerHTML = html;
  return el;
}
