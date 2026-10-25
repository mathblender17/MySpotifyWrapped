/** Words a reader has to get through: latin/number tokens count one each; a run of Japanese counts a word per two characters. */
export function countWords(text: string): number {
  let n = 0;
  for (const tok of text.split(/\s+/)) {
    if (!tok) continue;
    const cjk = tok.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]+/gu) ?? [];
    const rest = tok.replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]+/gu, ' ').trim();
    n += cjk.reduce((s, run) => s + Math.ceil(run.length / 2), 0) + (rest ? rest.split(' ').filter(Boolean).length : 0);
  }
  return n;
}

/** How long a card holds after its last beat (alive spec §3): 3 s plus 0.25 s a word, between 6 and 10 s. */
export function readingHoldMs(el: HTMLElement): number {
  return Math.min(10_000, Math.max(6_000, 3_000 + 250 * countWords(el.textContent ?? '')));
}
