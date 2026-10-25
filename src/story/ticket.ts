import { gsap } from 'gsap';
import type { Station } from '../journey/stations';

/** The paper kippu you carry: each station you stop at stamps it; passed stations print 通過. It ends as part of the share card. */
export function createTicket(stations: Station[], playable: boolean[], reduced = false) {
  const el = document.createElement('div');
  el.className = 'ticket';
  el.innerHTML = `<div class="tt">音楽電車 乗車券</div><div class="slots"></div>`;
  const slots = stations.map((s, i) => {
    const slot = document.createElement('span');
    slot.className = 'slot';
    slot.textContent = playable[i] ? '' : '通過';
    slot.dataset.mark = [...s.nameJp][0];
    return slot;
  });
  el.querySelector('.slots')!.append(...slots);

  return {
    el,
    /** Stamp station i's slot, inked in that station's accent. */
    stamp(i: number, accent?: string): gsap.core.Timeline {
      const tl = gsap.timeline({ paused: true });
      const slot = slots[i];
      if (!slot || slot.classList.contains('on') || !playable[i]) return tl;
      tl.call(() => {
        slot.classList.add('on');
        if (accent) slot.style.color = accent;
        slot.textContent = slot.dataset.mark!;
      });
      if (!reduced) tl.fromTo(slot, { scale: 2.4, rotation: -20, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.3, ease: 'back.out(2)' });
      return tl;
    },
    finale(): gsap.core.Timeline {
      const tl = gsap.timeline({ paused: true });
      tl.call(() => el.classList.add('final'));
      return tl;
    },
  };
}
