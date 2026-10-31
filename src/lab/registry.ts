import type { Experiment } from './types';
import { check } from './experiments/check';
import { f1 } from './experiments/f1-momentum';
import { f2 } from './experiments/f2-tilt';

export const EXPERIMENTS: Experiment[] = [check, f1, f2];
