import type { BedKind } from '../../audio/beds';
import type { Experiment } from '../types';

const BEDS: { kind: BedKind; jp: string; en: string; note: string; color: string }[] = [
  { kind: 'wind', jp: '鳥居', en: 'Torii · wind', note: 'a slow breeze through the gates', color: '#ff6a44' },
  { kind: 'chime', jp: 'コンビニ', en: 'Konbini · door chime', note: 'three notes, every few seconds', color: '#2fd3e6' },
  { kind: 'ratchet', jp: 'ガチャ', en: 'Gacha · crank', note: 'a ratchet, then a pause', color: '#f2c14e' },
];

/** F4 Sound beds (ux spec §3): each world gets a short synthesised ambience, one at a time. */
export const f4: Experiment = {
  id: 'f4-beds',
  layer: 'feel',
  title: 'F4 · Sound beds',
  blurb: 'Tap a world to hear its ambience. Tap it again to stop. All synthesised, no files.',
  mount(stage, kit) {
    stage.style.cssText += ';display:flex;flex-direction:column;justify-content:center;gap:14px;padding:16px';
    const style = document.createElement('style');
    style.textContent =
      '@keyframes f4-bar{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}' +
      '.f4-bar{display:inline-block;width:5px;height:22px;margin-left:3px;border-radius:3px;background:currentColor;transform-origin:bottom;transform:scaleY(.25)}' +
      '.f4-btn.on .f4-bar{animation:f4-bar .8s ease-in-out infinite}.f4-btn.on .f4-bar:nth-child(2){animation-delay:.15s}.f4-btn.on .f4-bar:nth-child(3){animation-delay:.3s}';
    stage.append(style);

    let current: BedKind | null = null;
    const buttons = new Map<BedKind, HTMLButtonElement>();
    const paint = () => buttons.forEach((b, k) => b.classList.toggle('on', k === current));

    for (const bed of BEDS) {
      const b = document.createElement('button');
      b.className = 'f4-btn';
      b.dataset.bed = bed.kind;
      b.disabled = kit.reduced;
      b.style.cssText = `min-height:84px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 20px;border-radius:26px;border:2px solid #fff8;background:linear-gradient(${bed.color},#0b0f2b);color:#fff;box-shadow:0 8px 0 #0008;font:900 16px 'Zen Maru Gothic',sans-serif;text-align:left`;
      b.innerHTML =
        `<span><span style="display:block;font:800 22px 'Shippori Mincho',serif">${bed.jp}</span>${bed.en}<small style="display:block;font-weight:500;opacity:.8">${bed.note}</small></span>` +
        '<span aria-hidden="true"><i class="f4-bar"></i><i class="f4-bar"></i><i class="f4-bar"></i></span>';
      b.addEventListener('click', () => {
        if (kit.reduced) return;
        if (current === bed.kind) {
          kit.beds.stop();
          current = null;
        } else {
          kit.beds.start(bed.kind);
          current = bed.kind;
        }
        paint();
      });
      buttons.set(bed.kind, b);
      stage.append(b);
    }
    const note = document.createElement('p');
    note.style.cssText = 'margin:0;text-align:center;font-size:13px;color:#fff;opacity:.8';
    note.textContent = kit.reduced ? 'Sound is off (reduced motion).' : 'Sound starts after your first tap. Android also buzzes elsewhere in the lab.';
    stage.append(note);

    kit.onLeave(() => {
      kit.beds.stop();
      current = null;
    });
  },
};
