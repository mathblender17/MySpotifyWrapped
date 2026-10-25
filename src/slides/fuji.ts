import type { Slide } from '../story/player';
import { cnt, slide } from './fmt';
import './worlds/i.css';

const W = 178;
const H = 150;
const TOP = 104; // the mountain's top edge in the slide, design px
let uid = 0;

// World I (sumi ink): the year's weekly listening is brushed as Fuji; the peak week carries the red seal.
export const fuji: Slide = ({ stats }) => {
  const w = stats!.weekly!;
  const peak = stats!.peakWeek!;
  const max = Math.max(1, peak.value);
  const step = w.length > 1 ? W / (w.length - 1) : 0;
  // The mountain's ridge is the year's weekly listening, so the summit really is the peak week.
  const pts = w.map((x, i) => `${(i * step).toFixed(1)},${(H - (x.value / max) * (H - 10)).toFixed(1)}`);
  const pi = w.findIndex((x) => x.start === peak.start);
  const date = new Date(peak.start + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const unit = stats!.minutes !== undefined ? 'min' : 'plays';
  const poly = `0,${H} ${pts.join(' ')} ${W},${H}`;
  // Two slides can be on stage during a transition: SVG ids must not clash.
  const id = ++uid;
  // Arrival (art spec §6, O → I): the weather's red sun drains into an ink ensō behind the title.
  return slide('fuji', `<i class="enso" data-beat="1" data-fx="drain"></i><div class="v" data-beat="1">富士</div>
    <div class="t" data-beat="1">peak listening</div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" data-beat="2" style="top:${TOP}px">
      <defs>
        <filter id="brush-${id}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter>
        <linearGradient id="snow-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0.2" stop-color="#f3eee2"/><stop offset="0.23" stop-color="#141414"/></linearGradient>
      </defs>
      <polygon class="wash" points="${poly}" transform="translate(4 4)"/>
      <polygon class="ink" points="${poly}" fill="url(#snow-${id})" filter="url(#brush-${id})"/>
    </svg>
    <i class="seal" data-beat="3" data-fx="stamp" style="left:${(16 + pi * step - 12).toFixed(1)}px;top:${TOP + 10 - 16}px">頂</i>
    <div class="bt" data-beat="4">頂上 · your peak week <i>♪</i><br><span class="d">week of ${date}</span></div>
    <div class="num" data-beat="4"><b class="hero">${cnt(4, peak.value)}</b><span class="u">${unit}</span></div>`);
};
