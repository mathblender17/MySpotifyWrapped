export type Score = { id: string; goosebumps: 0 | 1 | 2 | 3; clarity: 0 | 1 | 2 | 3; speed: 0 | 1 | 2 | 3; note: string };

const KEY = 'ongaku:lab-scores';
const memory: Record<string, Score> = {};

const store = (): Storage | undefined => {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
};

/** Saved scores; falls back to this session's memory when storage is blocked. */
export function loadScores(st: Storage | undefined = store()): Record<string, Score> {
  try {
    const raw = st?.getItem(KEY);
    return raw ? { ...(JSON.parse(raw) as Record<string, Score>), ...memory } : { ...memory };
  } catch {
    return { ...memory };
  }
}

/** false when the score could not be written to storage (it is still kept for this session). */
export function saveScore(s: Score, st: Storage | undefined = store()): boolean {
  memory[s.id] = s;
  try {
    const all = { ...(JSON.parse(st?.getItem(KEY) ?? '{}') as Record<string, Score>), [s.id]: s };
    st!.setItem(KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

/** keep: all three at least 2; kill: no goosebumps at all; otherwise tune (plan ruling: the spec leaves "kill" undefined). */
export function verdict(s: Score): 'keep' | 'tune' | 'kill' {
  if (s.goosebumps === 0) return 'kill';
  return s.goosebumps >= 2 && s.clarity >= 2 && s.speed >= 2 ? 'keep' : 'tune';
}

export function toMarkdown(scores: Record<string, Score>, meta: { device: string; date: string }): string {
  const rows = Object.values(scores).map((s) => `| ${s.id} | ${s.goosebumps} | ${s.clarity} | ${s.speed} | ${verdict(s)} |${s.note ? ' ' + s.note.replace(/\|/g, '/') : ''}`);
  return [`Device: ${meta.device} · Date: ${meta.date}`, '', '| experiment | goosebumps | clarity | speed | verdict | note |', '|---|---|---|---|---|---|', ...rows, ''].join('\n');
}
