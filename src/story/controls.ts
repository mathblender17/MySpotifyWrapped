/** The phone control strip (alive spec §4): Back · Pause/Play · Next as F wayfinding signs. */
export function createControls(on: { prev(): void; next(): void; toggle(): void }): { el: HTMLElement; setPaused(p: boolean): void } {
  const el = document.createElement('div');
  el.className = 'controls';
  const button = (label: string, glyph: string, fn: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.textContent = glyph;
    b.addEventListener('click', fn);
    return b;
  };
  const toggle = button('Pause', '❚❚', on.toggle);
  toggle.className = 'toggle';
  el.append(button('Back', '◀', on.prev), toggle, button('Next', '▶', on.next));
  return {
    el,
    setPaused(p) {
      toggle.setAttribute('aria-label', p ? 'Play' : 'Pause');
      toggle.textContent = p ? '▶' : '❚❚';
    },
  };
}
