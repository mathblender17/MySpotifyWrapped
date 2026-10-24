// Slides are laid out at the mockups' design size and scaled as a whole, so every station keeps its approved proportions.
export const DESIGN_W = 210;
export const DESIGN_H = 373;

export function createFrame(): { el: HTMLElement; destroy(): void } {
  const el = document.createElement('div');
  el.className = 'frame';
  const fit = () => {
    // Route map above (56px), guide phone below (84px).
    const k = Math.min(window.innerWidth / DESIGN_W, (window.innerHeight - 56 - 84) / DESIGN_H);
    el.style.transform = `translate(-50%, -50%) scale(${k})`;
  };
  fit();
  window.addEventListener('resize', fit);
  return { el, destroy: () => window.removeEventListener('resize', fit) };
}
