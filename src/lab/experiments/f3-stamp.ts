import { gsap } from 'gsap';
import { chargePattern, SLAM } from '../../feel/patterns';
import type { Experiment } from '../types';

const CHARGE_MS = 600;
const SLAM_AT = 400; // a hold shorter than this is only a poke
const SPLATS = 8;

/** F3 Stamp punch (ux spec §3): press and hold the ticket to charge, release to slam the stamp down. */
export const f3: Experiment = {
  id: 'f3-stamp',
  layer: 'feel',
  title: 'F3 · Stamp punch',
  blurb: 'Press and hold the ticket. The buzz builds; let go and the stamp slams down with an ink splat.',
  mount(stage, kit) {
    stage.style.cssText += ';display:grid;place-items:center';
    const ticket = document.createElement('div');
    ticket.className = 'f3-ticket';
    ticket.style.cssText = 'position:relative;width:min(300px,84%);aspect-ratio:300/190;border-radius:12px;background:#f6efd9;color:#0b0f2b;box-shadow:0 18px 30px #0008;touch-action:none;overflow:visible';
    ticket.innerHTML =
      '<div style="height:26px;background:#00a7db;border-radius:12px 12px 0 0;color:#fff;font:900 12px sans-serif;display:flex;align-items:center;padding:0 12px;letter-spacing:.1em">音楽電車 · 乗車券</div>' +
      '<div class="f3-slot" style="position:absolute;left:50%;top:58%;width:96px;height:96px;margin:-48px 0 0 -48px;border-radius:50%;border:3px dashed #e8391d88"></div>' +
      '<div class="f3-ring" style="position:absolute;left:50%;top:58%;width:96px;height:96px;margin:-48px 0 0 -48px;border-radius:50%;border:4px solid #e8391d;opacity:0;transform:scale(0.4)"></div>';
    stage.append(ticket);
    const hintEl = document.createElement('p');
    hintEl.style.cssText = 'position:absolute;left:0;right:0;bottom:16px;margin:0;text-align:center;font-size:13px;color:#fff;opacity:.8';
    hintEl.textContent = kit.reduced ? 'Motion is off: tap to stamp.' : 'Press and hold, then let go.';
    stage.append(hintEl);
    const ring = ticket.querySelector('.f3-ring') as HTMLElement;
    const slot = ticket.querySelector('.f3-slot') as HTMLElement;

    let live = true;
    let downAt = -1;
    let charge: gsap.core.Tween | undefined;
    const splats: HTMLElement[] = [];

    const clearSplats = () => {
      splats.splice(0).forEach((s) => {
        gsap.killTweensOf(s);
        s.remove();
      });
    };
    const resetRing = () => {
      charge?.kill();
      charge = undefined;
      gsap.set(ring, { opacity: 0, scale: 0.4 });
    };
    const stamp = () => {
      ticket.querySelector('.f3-mark')?.remove();
      const mark = document.createElement('div');
      mark.className = 'f3-mark';
      mark.textContent = '乗';
      mark.style.cssText = 'position:absolute;left:50%;top:58%;width:92px;height:92px;margin:-46px 0 0 -46px;border-radius:50%;border:4px solid #e8391d;color:#e8391d;display:grid;place-items:center;font:800 52px "Shippori Mincho",serif;transform:rotate(-12deg);opacity:.92';
      ticket.append(mark);
      slot.style.opacity = '0';
      return mark;
    };
    const splat = () => {
      clearSplats();
      for (let i = 0; i < SPLATS; i++) {
        const d = document.createElement('i');
        d.className = 'f3-splat';
        d.style.cssText = 'position:absolute;left:50%;top:58%;width:12px;height:12px;margin:-6px;border-radius:50%;background:#e8391d;pointer-events:none';
        ticket.append(d);
        splats.push(d);
        const a = (i / SPLATS) * Math.PI * 2;
        gsap.to(d, { x: Math.cos(a) * 90, y: Math.sin(a) * 90, opacity: 0, scale: 0.3, duration: 0.5, ease: 'power3.out', onComplete: () => d.remove() });
      }
    };

    const down = (e: PointerEvent) => {
      if (!live) return;
      downAt = e.timeStamp;
      if (kit.reduced) return;
      kit.buzz(chargePattern(CHARGE_MS));
      charge = gsap.to(ring, { opacity: 1, scale: 1, duration: CHARGE_MS / 1000, ease: 'power1.in' });
      gsap.to(ticket, { scale: 0.96, duration: CHARGE_MS / 1000, ease: 'power1.in' });
    };
    const up = (e: PointerEvent) => {
      if (!live || downAt < 0) return;
      const held = e.timeStamp - downAt;
      downAt = -1;
      if (kit.reduced) {
        stamp();
        return;
      }
      resetRing();
      kit.buzz(0); // stop the rising buzz
      if (held < SLAM_AT) {
        gsap.to(ticket, { scale: 1, duration: 0.15 });
        kit.buzz([10]);
        return;
      }
      kit.fx.slam();
      kit.buzz(SLAM);
      const mark = stamp();
      gsap.fromTo(mark, { scale: 1.3 }, { scale: 1, duration: 0.09, ease: 'power4.in' });
      gsap.fromTo(ticket, { scale: 0.96 }, { scale: 1, duration: 0.2, ease: 'elastic.out(1,0.5)' });
      gsap.fromTo(stage, { x: -4 }, { x: 0, duration: 0.12, ease: 'elastic.out(1,0.3)' });
      splat();
    };
    const cancel = () => {
      if (!live || downAt < 0) return;
      downAt = -1;
      resetRing();
      kit.buzz(0);
      gsap.to(ticket, { scale: 1, duration: 0.15 });
    };
    ticket.addEventListener('pointerdown', down);
    ticket.addEventListener('pointerup', up);
    ticket.addEventListener('pointercancel', cancel);
    kit.onLeave(() => {
      live = false;
      charge?.kill();
      gsap.killTweensOf([ring, ticket, stage]);
      clearSplats();
      ticket.removeEventListener('pointerdown', down);
      ticket.removeEventListener('pointerup', up);
      ticket.removeEventListener('pointercancel', cancel);
    });
  },
};
