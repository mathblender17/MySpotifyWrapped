import { gsap } from 'gsap';
import { HOOKS } from '../journey/hooks';

const PER_CHAR = 0.04;

/** The gyaru guide only exists as her flip phone: a bar at the bottom that texts the next station's hook. */
export function createGuide() {
  const el = document.createElement('div');
  el.className = 'guide';
  el.innerHTML = `<div class="scr"><div class="h">✉ ﾒｰﾙ · ぁたし</div><div class="jp"></div><div class="en"></div></div>`;
  const jp = el.querySelector<HTMLElement>('.jp')!;
  const en = el.querySelector<HTMLElement>('.en')!;

  return {
    el,
    say(id: string): gsap.core.Timeline {
      const tl = gsap.timeline({ paused: true });
      const hook = HOOKS[id];
      jp.textContent = '';
      en.textContent = '';
      if (!hook) return tl;
      const o = { n: 0 };
      tl.to(o, {
        n: hook.jp.length,
        duration: hook.jp.length * PER_CHAR,
        ease: 'none',
        onUpdate: () => void (jp.textContent = [...hook.jp].slice(0, Math.round(o.n)).join('')),
      });
      tl.call(() => void (en.textContent = hook.en));
      tl.fromTo(en, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      return tl;
    },
    clear() {
      jp.textContent = '';
      en.textContent = '';
    },
  };
}
