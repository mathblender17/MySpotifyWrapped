export type BedKind = 'wind' | 'chime' | 'ratchet';
export type Beds = { start(kind: BedKind): void; stop(): void; readonly playing: BedKind | null; dispose(): void };

/** Task 6 replaces this no-op with the synth. */
export function createBeds(_o: { canPlay: () => boolean; makeContext?: () => AudioContext }): Beds {
  return { start() {}, stop() {}, playing: null, dispose() {} };
}
