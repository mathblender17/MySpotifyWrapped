export type Tilt = {
  readonly state: 'idle' | 'running' | 'denied' | 'unsupported';
  request(): Promise<boolean>;
  stop(): void;
  on(fn: (x: number, y: number) => void): () => void;
};

/** Task 4 replaces this no-op with the DeviceOrientation wrapper. */
export function createTilt(_o: { reduced: boolean }): Tilt {
  return { state: 'unsupported', request: async () => false, stop() {}, on: () => () => {} };
}
