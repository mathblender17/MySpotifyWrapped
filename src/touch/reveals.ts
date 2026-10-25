import { gsap } from 'gsap';
import type { TouchKit } from './kit';

/** Gacha: tap the SSR card to re-pull #2–#5 (SR, R, R, N), then back to the original SSR. */
export function gacha(el: HTMLElement, kit: TouchKit): void {
  const tracks = (kit.stats.topTracks ?? []).slice(0, 5);
  const card = el.querySelector<HTMLElement>('.k-win.card');
  const f = ['.ssr', '.k-song', '.ar'].map((s) => card?.querySelector<HTMLElement>(s));
  if (tracks.length < 2 || !card || f.some((x) => !x)) return;
  const [rar, song, ar] = f as HTMLElement[];
  const orig = f.map((x) => x!.textContent);
  const labels = ['SSR', 'SR', 'R', 'R', 'N'];
  kit.mark(card);
  let n = 0;
  card.addEventListener('click', () => {
    n = (n + 1) % tracks.length;
    if (n === 0) [rar.textContent, song.textContent, ar.textContent] = orig;
    else [rar.textContent, song.textContent, ar.textContent] = [labels[n], tracks[n].name, tracks[n].artist ?? ''];
    kit.sfx.blip();
    kit.buzz(10);
  });
}

/** A busy take per call: a re-tap ends the previous take and kills its animation; each take releases exactly once. */
const retakeable = (kit: TouchKit, kill: () => void) => {
  let done: (() => void) | undefined;
  return (anim: (end: () => void) => void) => {
    done?.();
    kill();
    const release = kit.busy();
    let ended = false;
    const end = () => { if (!ended) { ended = true; release(); } };
    done = end;
    anim(end);
  };
};

/** Shinkansen: tap the kaiju to shake it, rumble, and hear the riser's song. */
export function shinkansen(el: HTMLElement, kit: TouchKit): void {
  const beast = el.querySelector<HTMLElement>('.beastwrap');
  if (!beast) return;
  const riser = kit.stats.soundtrack?.riserTrack;
  kit.mark(beast);
  let flash: ReturnType<typeof setTimeout> | undefined;
  const take = retakeable(kit, () => { clearTimeout(flash); beast.classList.remove('rumbling'); gsap.killTweensOf(beast, 'x'); gsap.set(beast, { x: 0 }); });
  beast.addEventListener('click', () => {
    take((end) => {
      const d = kit.dur(0.5);
      if (d > 0) gsap.to(beast, { keyframes: { x: [4, -4, 4, -4, 4, -4, 4, -4, 4, -4, 4, -4, 0] }, duration: d, ease: 'none', onComplete: end });
      else { beast.classList.add('rumbling'); flash = setTimeout(() => { beast.classList.remove('rumbling'); end(); }, 600); } // reduced: no tween, a brief held pose
    });
    kit.sfx.rumble();
    kit.buzz([30, 30, 30]);
    if (riser) void kit.playTrack(riser).catch(() => {});
  });
}

/** Omikuji: tap the box (or shake the phone) to draw the same fortune again with a fresh stamp. */
export function omikuji(el: HTMLElement, kit: TouchKit): void {
  const kuji = el.querySelector<HTMLElement>('.kuji');
  const hero = el.querySelector<HTMLElement>('.hero');
  if (!kuji || !hero) return;
  kit.mark(kuji);
  const slip = document.createElement('i');
  slip.className = 'slip';
  kuji.append(slip);
  let flash: ReturnType<typeof setTimeout> | undefined;
  const take = retakeable(kit, () => { clearTimeout(flash); gsap.killTweensOf([kuji, slip, hero]); gsap.set(kuji, { x: 0 }); gsap.set(slip, { y: 0, opacity: 0 }); });
  let last = -Infinity;
  const draw = () => {
    last = Date.now();
    kit.buzz(10);
    take((end) => {
      if (kit.dur(1) === 0) { // reduced: show the slip at its end state, then put it away
        gsap.set(hero, { opacity: 1, scale: 1, rotation: 0 });
        gsap.set(slip, { y: 30, opacity: 1 });
        flash = setTimeout(() => { gsap.set(slip, { y: 0, opacity: 0 }); end(); }, 1500);
        return;
      }
      gsap.timeline({ onComplete: end })
        .to(kuji, { keyframes: { x: [3, -3, 3, -3, 3, -3, 0] }, duration: 0.4, ease: 'none' })
        .fromTo(slip, { y: 0, opacity: 1 }, { y: 30, duration: 0.3, ease: 'power2.out' })
        .fromTo(hero, { opacity: 0, scale: 2.2, rotation: -12 }, { opacity: 1, scale: 1, rotation: 0, duration: kit.dur(0.35), ease: 'back.out(2)' })
        .to(slip, { opacity: 0, duration: 0.2 });
    });
  };
  let asked = false;
  kuji.addEventListener('click', () => {
    if (!asked) {
      asked = true;
      // iOS only: motion needs a permission asked inside a tap; a refusal just leaves the tap.
      const dm = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
      try { void dm?.requestPermission?.().catch(() => {}); } catch { /* tap only */ }
    }
    draw();
  });
  let hard = 0;
  const onMotion = (e: Event) => {
    const a = (e as DeviceMotionEvent).acceleration;
    if (!a) return;
    hard = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) > 15 ? hard + 1 : 0;
    if (hard >= 2 && Date.now() - last > 1500) { hard = 0; draw(); }
  };
  window.addEventListener('devicemotion', onMotion);
  kit.onLeave(() => window.removeEventListener('devicemotion', onMotion));
}
