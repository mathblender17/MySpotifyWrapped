import { unzipSync } from 'fflate';
import type { Play } from '../types';
import { parseAccount } from './account';
import { detect } from './detect';
import { parseExtended } from './extended';

export type InFile = { name: string; bytes: Uint8Array };
export type Loaded = { plays: Play[]; problems: string[]; lifetime: boolean };

type Entry = InFile & { zip?: string };

/** Expand zips into their JSON entries. Inside a zip, everything that isn't JSON (PDFs, __MACOSX forks) is expected noise. */
function expand(files: InFile[], problems: string[]): Entry[] {
  const out: Entry[] = [];
  for (const f of files) {
    if (!f.name.toLowerCase().endsWith('.zip')) {
      if (!f.name.toLowerCase().endsWith('.pdf')) out.push(f);
      continue;
    }
    let entries: Record<string, Uint8Array>;
    try {
      entries = unzipSync(f.bytes);
    } catch {
      problems.push(`${f.name}: couldn't be opened — skipped`);
      continue;
    }
    for (const [path, bytes] of Object.entries(entries)) {
      if (path.endsWith('/') || path.startsWith('__MACOSX/') || !path.toLowerCase().endsWith('.json')) continue;
      out.push({ name: path.split('/').pop()!, bytes, zip: f.name });
    }
  }
  return out;
}

export function loadFiles(files: InFile[], onProgress?: (done: number, total: number) => void): Loaded {
  const problems: string[] = [];
  const entries = expand(files, problems);
  const decoder = new TextDecoder();
  const parsed: { file: Entry; kind: 'extended' | 'account'; plays: Play[] }[] = [];
  const zipsWithHistory = new Set<string>();

  entries.forEach((f, i) => {
    // Loose files get a reason when skipped; a zip's non-history files (Payments, Identity…) are expected and skipped quietly.
    const report = (why: string) => !f.zip && problems.push(`${f.name}: ${why} — skipped`);
    if (!f.name.toLowerCase().endsWith('.json')) report('not JSON');
    else {
      let json: unknown;
      try {
        json = JSON.parse(decoder.decode(f.bytes));
      } catch {
        report("couldn't be read");
      }
      if (json !== undefined) {
        const d = detect(json);
        if (d.kind === 'other') report(d.label);
        else {
          parsed.push({ file: f, kind: d.kind, plays: d.kind === 'extended' ? parseExtended(json as unknown[]) : parseAccount(json as unknown[]) });
          if (f.zip) zipsWithHistory.add(f.zip);
        }
      }
    }
    onProgress?.(i + 1, entries.length);
  });

  for (const f of files) {
    if (f.name.toLowerCase().endsWith('.zip') && !zipsWithHistory.has(f.name) && !problems.some((p) => p.startsWith(`${f.name}:`))) {
      problems.push(`${f.name}: no listening history found inside — skipped`);
    }
  }

  // Both exports overlap for the last year but can't be matched play-for-play (minute vs second precision, names vs URIs),
  // so when the extended history is present it wins outright.
  const hasExtended = parsed.some((p) => p.kind === 'extended');
  const seen = new Set<string>();
  const plays: Play[] = [];
  for (const { file, kind, plays: ps } of parsed) {
    if (hasExtended && kind === 'account') {
      problems.push(`${file.name}: already covered by your extended history — skipped`);
      continue;
    }
    for (const p of ps) {
      const key = p.ts.getTime() + p.trackKey;
      if (seen.has(key)) continue;
      seen.add(key);
      plays.push(p);
    }
  }
  return { plays, problems, lifetime: hasExtended };
}
