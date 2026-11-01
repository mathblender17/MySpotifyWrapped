import { gsap } from 'gsap';
import { classify, type Gesture, type PointSample } from '../../feel/pointer';
import type { Experiment } from '../types';

const NAMES: Record<Gesture['kind'] | 'shake', { jp: string; en: string }> = {
  tap: { jp: '突く', en: 'poke' },
  hold: { jp: '溜める', en: 'charge' },
  flick: { jp: '弾く', en: 'flick' },
  pull: { jp: '引く', en: 'pull' },
  drag: { jp: '滑らす', en: 'drag' },
  shake: { jp: '振る', en: 'shake' },
};
const SHAKE_G = 15; // acceleration (m/s²) that counts as a hard sample
const CONFETTI = 12;

/** F8 One gesture grammar (ux spec §3): tap pokes, hold charges, flick moves, shake surprises. The same everywhere. */
export const f8: Experiment = {
  id: 'f8-grammar',
  layer: 'feel',
  title: 'F8 · One gesture grammar',
  blurb: 'Tap, hold, flick, shake. The card names what you did.',
  mount(stage, kit) {
    stage.style.cssText += ';display:grid;place-items:center';
    const card = document.createElement('div');
    card.className = 'f8-card';
    card.style.cssText = 'position:relative;width:min(260px,70%);aspect-ratio:1;border-radius:32px;background:linear-gradient(#ff6a44,#c92a10);border:3px solid #fff8;box-shadow:0 10px 0 #8f1e0c,0 18px 28px #0009;display:grid;place-items:center;touch-action:none;user-select:none';
    const ring = document.createElement('div');
    ring.className = 'f8-ring';
    ring.style.cssText = 'position:absolute;inset:-14px;border-radius:40px;border:4px solid #f2c14e;opacity:0;pointer-events:none';
    const label = document.createElement('div');
    label.className = 'f8-label';
    label.style.cssText = "text-align:center;font:800 34px 'Shippori Mincho',serif;color:#fff";
    label.innerHTML = '<span class="f8-jp">?</span><small class="f8-en" style="display:block;font:800 13px Archivo,sans-serif;letter-spacing:.3em">TRY IT</small>';
    card.append(ring, label);
    const hint = document.createElement('p');
    hint.style.cssText = 'position:absolute;left:12px;right:12px;bottom:16px;margin:0;text-align:center;font-size:13px;color:#fff;opacity:.8';
    hint.textContent = kit.reduced ? 'Motion is off: the card only names the gesture.' : 'Tap · hold · flick · shake the phone';
    stage.append(card, hint);

    const name = (kind: Gesture['kind'] | 'shake') => {
      label.dataset.kind = kind;
      (label.querySelector('.f8-jp') as HTMLElement).textContent = NAMES[kind].jp;
      (label.querySelector('.f8-en') as HTMLElement).textContent = NAMES[kind].en.toUpperCase();
    };

    let samples: PointSample[] = [];
    let asked = false;
    const down = (e: PointerEvent) => {
      samples = [{ t: e.timeStamp, x: e.clientX, y: e.clientY }];
    };
    const move = (e: PointerEvent) => {
      if (samples.length) samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    };
    const up = (e: PointerEvent) => {
      if (!samples.length) return;
      samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
      if (!asked && !kit.reduced) {
        asked = true;
        // iOS reliably allows the permission prompt on release (a finished tap); a refusal is not an error
        const dm = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
        void Promise.resolve(dm?.requestPermission?.()).catch(() => {});
      }
      const g = classify(samples);
      samples = [];
      name(g.kind);
      if (kit.reduced) return;
      if (g.kind === 'tap') {
        gsap.fromTo(card, { scale: 0.92 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' });
      } else if (g.kind === 'hold') {
        ring.dataset.grown = '1';
        gsap.fromTo(ring, { opacity: 1, scale: 0.8 }, { opacity: 0, scale: 1.1, duration: 0.6 });
      } else if (g.kind === 'flick') {
        card.dataset.slid = '1';
        const dir = g.dir === 'left' ? -1 : 1;
        gsap.fromTo(card, { x: 0 }, { x: dir * 220, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' });
      }
    };
    card.addEventListener('pointerdown', down);
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerup', up);
    const cancel = () => (samples = []);
    card.addEventListener('pointercancel', cancel);

    let hard = 0;
    const motion = (e: Event) => {
      const a = (e as unknown as { acceleration?: { x: number | null; y: number | null; z: number | null } }).acceleration;
      const mag = a ? Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) : 0;
      hard = mag > SHAKE_G ? hard + 1 : 0;
      if (hard === 2) {
        name('shake');
        for (let i = 0; i < CONFETTI; i++) {
          const c = document.createElement('i');
          c.className = 'f8-confetti';
          c.style.cssText = `position:absolute;left:50%;top:50%;width:10px;height:10px;border-radius:2px;background:hsl(${(i * 31) % 360} 90% 60%);pointer-events:none`;
          stage.append(c);
          const ang = (i / CONFETTI) * Math.PI * 2;
          gsap.to(c, { x: Math.cos(ang) * 140, y: Math.sin(ang) * 140, rotation: 360, opacity: 0, duration: 0.8, ease: 'power3.out', onComplete: () => c.remove() });
        }
      }
    };
    if (!kit.reduced) window.addEventListener('devicemotion', motion);

    kit.onLeave(() => {
      card.removeEventListener('pointerdown', down);
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerup', up);
      card.removeEventListener('pointercancel', cancel);
      window.removeEventListener('devicemotion', motion);
      gsap.killTweensOf([card, ring]);
      stage.querySelectorAll('.f8-confetti').forEach((c) => {
        gsap.killTweensOf(c);
        c.remove();
      });
    });
  },
};
