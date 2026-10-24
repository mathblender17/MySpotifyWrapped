/// <reference lib="webworker" />
import { loadFiles, type InFile } from './load';

self.onmessage = (e: MessageEvent<InFile[]>) => {
  const { plays, problems, lifetime } = loadFiles(e.data, (done, total) => self.postMessage({ type: 'progress', done, total }));
  // Dates don't survive structured clone as Date in every engine path we rely on; send epoch ms.
  self.postMessage({ type: 'done', plays: plays.map((p) => ({ ...p, ts: p.ts.getTime() })), problems, lifetime });
};
