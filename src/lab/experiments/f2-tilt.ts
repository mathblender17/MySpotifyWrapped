import type { Experiment } from '../types';

const AMPLITUDE = 14; // px at depth 1 and full tilt
// Back to front: night sky, Fuji, hills with a torii, the train in the foreground.
const LAYERS: { depth: number; svg: string }[] = [
  { depth: 0.2, svg: '<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070a24"/><stop offset=".6" stop-color="#5b2470"/><stop offset="1" stop-color="#ff8f5a"/></linearGradient></defs><rect width="400" height="520" fill="url(#s)"/><circle cx="270" cy="250" r="70" fill="#e8391d"/>' },
  { depth: 0.5, svg: '<path d="M-20 400 L130 250 Q200 160 270 250 L420 400 V520 H-20Z" fill="#3a3f8f"/><path d="M200 175 L170 225 L190 215 L200 235 L215 212 L232 224Z" fill="#f4ede0"/>' },
  { depth: 0.8, svg: '<path d="M-20 400 Q100 340 200 380 T420 370 V520 H-20Z" fill="#1a1f5c"/><g fill="#e8391d"><rect x="52" y="320" width="8" height="68"/><rect x="92" y="320" width="8" height="68"/><rect x="46" y="336" width="60" height="7"/><path d="M38 322 Q76 312 114 322 L112 310 Q76 300 40 310Z"/></g>' },
  { depth: 1.2, svg: '<path d="M-20 460 Q100 430 200 450 T420 440 V520 H-20Z" fill="#0c1030"/><rect x="30" y="418" width="340" height="30" rx="14" fill="#fff"/><rect x="30" y="436" width="340" height="5" fill="#2fd3e6"/>' },
];

/** F2 Tilt world (ux spec §3): the paper-cut layers shift with the phone's tilt, or with a finger where there is no tilt. */
export const f2: Experiment = {
  id: 'f2-tilt',
  layer: 'feel',
  title: 'F2 · Tilt world',
  blurb: 'Tilt your phone and the layers slide at different speeds. No tilt? Drag a finger across the scene.',
  mount(stage, kit) {
    stage.style.overflow = 'hidden';
    const els = LAYERS.map((l) => {
      const d = document.createElement('div');
      d.className = 'f2-layer';
      d.dataset.depth = String(l.depth);
      d.style.cssText = 'position:absolute;inset:-6% -10%;will-change:transform;transform:translate3d(0,0,0)';
      d.innerHTML = `<svg viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">${l.svg}</svg>`;
      stage.append(d);
      return d;
    });
    const apply = (x: number, y: number) => {
      if (kit.reduced) return;
      els.forEach((d, i) => {
        const k = LAYERS[i].depth * AMPLITUDE;
        d.style.transform = `translate3d(${(-x * k).toFixed(2)}px,${(-y * k * 0.6).toFixed(2)}px,0)`;
      });
    };

    const note = document.createElement('p');
    note.className = 'f2-note';
    note.style.cssText = 'position:absolute;left:12px;right:12px;top:12px;margin:0;font-size:13px;color:#fff;text-shadow:0 1px 4px #000a;text-align:center';
    stage.append(note);

    if (kit.reduced) {
      note.textContent = 'Tilt is off: motion is off, so the scene stays still.';
      return;
    }
    note.textContent = 'Tilt your phone, or drag a finger.';

    const off = kit.tilt.on(apply);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'f2-enable';
    btn.textContent = 'Enable tilt';
    btn.style.cssText = 'position:absolute;left:50%;top:48px;transform:translateX(-50%);min-height:48px;padding:0 22px;border-radius:24px;border:2px solid #fff8;background:linear-gradient(#ff6a44,#c92a10);color:#fff;font:900 16px sans-serif;z-index:2';
    btn.addEventListener('click', () => {
      kit.tilt.request().then((ok) => {
        note.textContent = ok ? 'Tilt is on.' : 'No tilt on this device: drag a finger instead.';
        if (ok) btn.remove();
      });
    });
    stage.append(btn);

    // The fallback: a finger stands in for the tilt (desktop, denied permission, or no sensor).
    let startX = 0;
    let startY = 0;
    let down = false;
    const pd = (e: PointerEvent) => {
      down = true;
      startX = e.clientX;
      startY = e.clientY;
    };
    const pm = (e: PointerEvent) => {
      if (!down) return;
      apply(Math.max(-1, Math.min(1, (e.clientX - startX) / 100)), Math.max(-1, Math.min(1, (e.clientY - startY) / 100)));
    };
    const pu = () => {
      down = false;
      apply(0, 0);
    };
    stage.addEventListener('pointerdown', pd);
    stage.addEventListener('pointermove', pm);
    stage.addEventListener('pointerup', pu);
    stage.addEventListener('pointercancel', pu);
    kit.onLeave(() => {
      off();
      kit.tilt.stop();
      stage.removeEventListener('pointerdown', pd);
      stage.removeEventListener('pointermove', pm);
      stage.removeEventListener('pointerup', pu);
      stage.removeEventListener('pointercancel', pu);
    });
  },
};
