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
      if (reduced) return tl.set(el, { x: 0, y: 0, scale: 1, opacity: 1 }, 0);
      return tl.fromTo(el, { x: 0, y: -40, scale: 1, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }, 0);
    },
    dock(): gsap.core.Timeline {
      const tl = gsap.timeline({ paused: true });
      tl.call(() => el.classList.add('docked'), undefined, 0);
      // GSAP owns the sign's transform (it writes inline translate/scale), so the dock motion is a GSAP tween too.
      const docked = { x: -14, y: -14, scale: 0.6 };
      return reduced ? tl.set(el, docked, 0) : tl.to(el, { ...docked, duration: 0.25, ease: 'power2.out' }, 0);
    },
  };
}
