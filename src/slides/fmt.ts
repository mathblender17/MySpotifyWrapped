import type { YearStats } from '../types';
import './slides.css';

export const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');

/** Names come from user-supplied files: escape everything that goes into innerHTML. */
export const esc = (s: string | number): string =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Minutes when the source has durations, otherwise plays — never a guessed conversion. */
export const amount = (s: Pick<YearStats, 'minutes' | 'plays'>, n?: { minutes?: number; plays?: number }): string => {
  const src = n ?? s;
  return src.minutes !== undefined ? `${fmt(src.minutes)} min` : `${fmt(src.plays ?? 0)} plays`;
};

export function slide(cls: string, html: string): HTMLElement {
  const el = document.createElement('div');
  el.className = `ph ${cls}`;
  el.innerHTML = html;
  return el;
}
