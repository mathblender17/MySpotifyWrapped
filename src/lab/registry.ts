import type { Experiment } from './types';
import { check } from './experiments/check';
import { f1 } from './experiments/f1-momentum';
import { f2 } from './experiments/f2-tilt';
import { f3 } from './experiments/f3-stamp';
import { f4 } from './experiments/f4-beds';
import { f5 } from './experiments/f5-heavy';
import { f7 } from './experiments/f7-speed';

export const EXPERIMENTS: Experiment[] = [check, f1, f2, f3, f4, f5, f7];
