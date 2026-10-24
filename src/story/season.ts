export type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';

// The ride runs through one year: spring departure → summer hype → autumn looking back → New Year's snow.
const BY_ACT: Record<1 | 2 | 3 | 4, SeasonName> = { 1: 'spring', 2: 'summer', 3: 'autumn', 4: 'winter' };
const PARTICLE: Record<SeasonName, string> = { spring: '🌸', summer: '·', autumn: '🍁', winter: '❄' };
const COUNT = 14;

export const seasonFor = (act: 1 | 2 | 3 | 4): SeasonName => BY_ACT[act];

export function createSeason(root: HTMLElement, reduced: boolean) {
  const fx = document.createElement('div');
  fx.className = 'season-fx';
  fx.setAttribute('aria-hidden', 'true');
  root.prepend(fx);
  let current: SeasonName | undefined;

  return {
    set(act: 1 | 2 | 3 | 4) {
      const s = seasonFor(act);
      if (s === current) return;
      if (current) root.classList.remove(`season-${current}`);
      root.classList.add(`season-${s}`);
      current = s;
      if (reduced) return;
      fx.replaceChildren(
        ...Array.from({ length: COUNT }, (_, i) => {
          const p = document.createElement('i');
          p.textContent = PARTICLE[s];
          // Deterministic spread: no randomness needed for a drifting background.
          p.style.left = `${(i * 37) % 100}%`;
          p.style.animationDelay = `${-((i * 1.7) % 9)}s`;
          p.style.animationDuration = `${8 + (i % 5)}s`;
          return p;
        }),
      );
    },
    destroy: () => fx.remove(),
  };
}
