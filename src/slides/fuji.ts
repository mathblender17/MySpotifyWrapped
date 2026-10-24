import type { Slide } from '../story/player';
import { cnt, slide } from './fmt';

const W = 178;
const H = 150;

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
  return slide('fuji', `<div class="t" data-beat="1">PEAK<br>LISTENING</div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" data-beat="2">
      <defs><linearGradient id="snow" x1="0" y1="0" x2="0" y2="1"><stop offset="0.22" stop-color="#fff"/><stop offset="0.24" stop-color="#3a5a9a"/></linearGradient></defs>
      <polygon points="0,${H} ${pts.join(' ')} ${W},${H}" fill="url(#snow)"/>
    </svg>
    <i class="peak" data-beat="3" data-fx="stamp" style="left:${(16 + pi * step - 4).toFixed(1)}px"></i>
    <div class="bt" data-beat="4">頂上 · your peak week<br><b>week of ${date}</b> · ${cnt(4, peak.value, ` ${unit}`)}</div>`);
};
