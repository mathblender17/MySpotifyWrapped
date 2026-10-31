export type FeelSfx = { clack(): void; slam(): void; tick(): void; dispose(): void };

/** Task 3 replaces this no-op with the synth. */
export function createFeelSfx(_opts: { canPlay: () => boolean; makeContext?: () => AudioContext }): FeelSfx {
  return { clack() {}, slam() {}, tick() {}, dispose() {} };
}
