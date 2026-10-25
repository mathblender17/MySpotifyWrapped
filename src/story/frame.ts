// Slides are laid out at the mockups' design size and scaled as a whole, so every station keeps its approved proportions.
export const DESIGN_W = 210;
export const DESIGN_H = 373;

/** The frame scales as one: `stage` holds the slides (transitions own it), anchors like the station sign sit beside it. */
export function createFrame(): { el: HTMLElement; stage: HTMLElement; destroy(): void } {
  const el = document.createElement('div');
  el.className = 'frame';
  const stage = document.createElement('div');
  stage.className = 'stage';
  el.append(stage);
  const fit = () => {
    // Route map above (56px); control strip and guide phone below (56 + 84px).
    const k = Math.min(window.innerWidth / DESIGN_W, (window.innerHeight - 56 - 140) / DESIGN_H);
    el.style.transform = `translate(-50%, -50%) scale(${k})`;
  };
  fit();
  window.addEventListener('resize', fit);
  return { el, stage, destroy: () => window.removeEventListener('resize', fit) };
}
