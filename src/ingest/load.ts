import { unzipSync } from 'fflate';
import type { Play } from '../types';
import { parseAccount } from './account';
import { detect } from './detect';
import { parseExtended } from './extended';

export type InFile = { name: string; bytes: Uint8Array };
export type Loaded = { plays: Play[]; problems: string[] };

/** Expand zips into their entries; folders and Spotify's ReadMe PDFs are dropped silently. */
function expand(files: InFile[]): InFile[] {
  const out: InFile[] = [];
  for (const f of files) {
    if (!f.name.toLowerCase().endsWith('.zip')) {
      out.push(f);
      continue;
    }
    for (const [path, bytes] of Object.entries(unzipSync(f.bytes))) {
      if (path.endsWith('/')) continue;
      out.push({ name: path.split('/').pop()!, bytes });
    }
  }
  return out.filter((f) => !f.name.toLowerCase().endsWith('.pdf'));
}

export function loadFiles(files: InFile[], onProgress?: (done: number, total: number) => void): Loaded {
  const entries = expand(files);
  const problems: string[] = [];
  const seen = new Set<string>();
  const plays: Play[] = [];
  const decoder = new TextDecoder();

  entries.forEach((f, i) => {
    if (!f.name.toLowerCase().endsWith('.json')) {
      problems.push(`${f.name}: not JSON — skipped`);
    } else {
      let json: unknown;
      try {
        json = JSON.parse(decoder.decode(f.bytes));
      } catch {
        problems.push(`${f.name}: couldn't be read — skipped`);
      }
      if (json !== undefined) {
        const d = detect(json);
        if (d.kind === 'other') problems.push(`${f.name}: ${d.label} — skipped`);
        const parsed = d.kind === 'extended' ? parseExtended(json as unknown[]) : d.kind === 'account' ? parseAccount(json as unknown[]) : [];
        for (const p of parsed) {
          const key = p.ts.getTime() + p.trackKey;
          if (seen.has(key)) continue;
          seen.add(key);
          plays.push(p);
        }
      }
    }
    onProgress?.(i + 1, entries.length);
  });

  return { plays, problems };
}
