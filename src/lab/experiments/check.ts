import type { Experiment } from '../types';

/** The lab's own sanity check: prints the pointer position and whether motion is off. */
export const check: Experiment = {
  id: 'check',
  layer: 'feel',
  title: 'Lab check',
  blurb: 'Touch anywhere: shows the pointer and whether motion is off.',
  mount(stage, kit) {
    const out = document.createElement('p');
    out.className = 'lab-check';
    out.textContent = kit.reduced ? 'Motion is off. Touch to see the pointer.' : 'Touch anywhere.';
    stage.append(out);
    const move = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      out.textContent = `x ${Math.round(e.clientX - r.left)} · y ${Math.round(e.clientY - r.top)}`;
    };
    stage.addEventListener('pointermove', move);
    kit.onLeave(() => stage.removeEventListener('pointermove', move));
  },
};
