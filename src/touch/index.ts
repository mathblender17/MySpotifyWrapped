import type { TouchKit } from './kit';
import { departure, torii } from './act1';
import { sumo } from './sumo';
import { weather, fuji } from './drags';
import { idol, konbini } from './songs';
import { gacha, shinkansen, omikuji } from './reveals';

/** Per-station touch interactions, keyed by station id: attach(card, kit) runs once the card is built. */
export const TOUCH: Partial<Record<string, (el: HTMLElement, kit: TouchKit) => void>> = { torii, sumo, departure, idol, konbini, gacha, shinkansen, omikuji, weather, fuji };
