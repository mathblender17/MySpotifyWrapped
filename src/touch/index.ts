import type { TouchKit } from './kit';

/** Per-station touch interactions, keyed by station id: attach(card, kit) runs once the card is built. */
export const TOUCH: Partial<Record<string, (el: HTMLElement, kit: TouchKit) => void>> = {};
