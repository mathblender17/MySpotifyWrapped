import { gsap } from 'gsap';
import type { Station } from '../journey/stations';

/** WCAG relative luminance of a #rrggbb colour. */
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** The paper kippu you carry: each station you stop at stamps it; passed stations print 通過. It ends as part of the share card. */
export function createTicket(stations: Station[], playable: boolean[], reduced = false) {
  const el = document.createElement('div');
  el.className = 'ticket';
  el.innerHTML = `<div class="tt">音楽電車 乗車券</div><div class="slots"></div><div class="back"></div>`;
  const slots = stations.map((s, i) => {
    const slot = document.createElement('span');
    slot.className = 'slot';
    slot.textContent = playable[i] ? '' : '通過';
    slot.dataset.mark = [...s.nameJp][0];
    return slot;
  });
  el.querySelector('.slots')!.append(...slots);
  const back = el.querySelector('.back')!;

  return {
    el,
    /** Stamp station i's slot, inked in that station's accent. */
    stamp(i: number, accent?: string): gsap.core.Timeline {
      const tl = gsap.timeline({ paused: true });
      const slot = slots[i];
      if (!slot || slot.classList.contains('on') || !playable[i]) return tl;
      tl.call(() => {
        slot.classList.add('on');
        if (accent) {
          slot.style.color = accent;
          slot.classList.toggle('light', luminance(accent) > 0.6); // pale accents read in ink, not on cream
        }
        slot.textContent = slot.dataset.mark!;
      });
      if (!reduced) tl.fromTo(slot, { scale: 2.4, rotation: -20, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.3, ease: 'back.out(2)' });
      return tl;
    },
    /** Turn the ticket over (Y rotation by CSS); the back shows today's date and how many stops are stamped, read now. */
    flip() {
      const on = !el.classList.contains('flipped');
      el.style.setProperty('--flip', reduced ? '0s' : '0.5s');
      if (on) back.innerHTML = `<b>${new Date().toLocaleDateString()}</b><span>${slots.filter((s) => s.classList.contains('on')).length} / ${stations.length}</span>`;
      el.classList.toggle('flipped', on);
    },
    finale(): gsap.core.Timeline {
      const tl = gsap.timeline({ paused: true });
      tl.call(() => el.classList.add('final'));
      return tl;
    },
  };
}
