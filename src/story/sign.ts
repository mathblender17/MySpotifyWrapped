import { gsap } from 'gsap';
import type { Station } from '../journey/stations';

/** The station sign (art spec §3–4): an F-style plate that announces each arrival, then docks as a corner badge. */
export function createSign(reduced = false) {
  const el = document.createElement('div');
  el.className = 'sign';
  el.innerHTML = `<div class="os"><i>OS</i><b></b></div><div class="nm"><b></b><i></i></div>`;
  const num = el.querySelector('.os b')!;
  const jp = el.querySelector('.nm b')!;
  const en = el.querySelector('.nm i')!;
  return {
    el,
    show(s: Station): gsap.core.Timeline {
      num.textContent = String(s.n).padStart(2, '0');
      jp.textContent = s.nameJp;
      en.textContent = s.nameEn;
      el.style.setProperty('--sign-accent', s.accent);
      el.classList.toggle('long', s.nameEn.length > 14);
      const tl = gsap.timeline({ paused: true });
      tl.call(() => el.classList.remove('docked'), undefined, 0);
      if (reduced) return tl.set(el, { y: 0, opacity: 1 }, 0);
      return tl.fromTo(el, { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }, 0);
    },
    dock(): gsap.core.Timeline {
      const tl = gsap.timeline({ paused: true });
      tl.call(() => el.classList.add('docked'), undefined, 0);
      // The class carries the docked layout; its CSS transition does the motion, so the timeline only holds the time.
      if (!reduced) tl.to({}, { duration: 0.25 }, 0);
      return tl;
    },
  };
}
