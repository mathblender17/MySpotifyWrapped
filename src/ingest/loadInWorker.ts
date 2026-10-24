import type { Play } from '../types';
import type { Loaded } from './load';

/** Parse dropped files off the main thread so a 10-year history doesn't freeze the page. */
export async function loadInWorker(files: File[], onProgress?: (done: number, total: number) => void): Promise<Loaded> {
  const payload = await Promise.all(files.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })));
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || 'Could not read the files'));
    };
    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'progress') return onProgress?.(msg.done, msg.total);
      worker.terminate();
      const plays: Play[] = msg.plays.map((p: Play & { ts: number }) => ({ ...p, ts: new Date(p.ts) }));
      resolve({ plays, problems: msg.problems, lifetime: msg.lifetime });
    };
    worker.postMessage(payload);
  });
}
