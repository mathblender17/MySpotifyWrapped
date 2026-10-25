import type { TouchKit } from './kit';
import { departure, torii } from './act1';
import { sumo } from './sumo';
import { idol, konbini } from './songs';

/** Per-station touch interactions, keyed by station id: attach(card, kit) runs once the card is built. */
export const TOUCH: Partial<Record<string, (el: HTMLElement, kit: TouchKit) => void>> = { torii, sumo, departure, idol, konbini };
