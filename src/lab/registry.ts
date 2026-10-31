import type { Experiment } from './types';
import { check } from './experiments/check';
import { f1 } from './experiments/f1-momentum';

export const EXPERIMENTS: Experiment[] = [check, f1];
