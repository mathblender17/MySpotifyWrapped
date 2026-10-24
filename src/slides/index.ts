import type { Slide } from '../story/player';
import { bento } from './bento';
import { departure } from './departure';
import { fuji } from './fuji';
import { gacha } from './gacha';
import { ganguro } from './ganguro';
import { idol } from './idol';
import { kanji } from './kanji';
import { konbini } from './konbini';
import { omikuji } from './omikuji';
import { shinkansen } from './shinkansen';
import { sumo } from './sumo';
import { torii } from './torii';
import { weather } from './weather';

export const slides: Record<string, Slide> = {
  departure, torii, bento, ganguro, sumo, idol, konbini, gacha, weather, fuji, shinkansen, omikuji, kanji,
};
