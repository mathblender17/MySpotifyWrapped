// Alive spec §8: ride hands-free with ?previews=silent (3 s clips) and measure (a) gaps between one clip ending and the
// next starting, (b) each card's hold: from its .idle class (beats done) until the route map moves on.
(async () => {
  const t0 = performance.now();
  const now = () => Math.round(performance.now() - t0);
  const clips = new WeakSet();
  let lastEnd, playing = 0;
  const gaps = [];
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...a) {
    if (!clips.has(this)) {
      clips.add(this);
      this.addEventListener('playing', () => {
        if (this.src.length < 200) return; // the 44-byte unlock blip, not a song
        playing++;
        if (lastEnd !== undefined) gaps.push(now() - lastEnd);
        lastEnd = undefined;
      });
      this.addEventListener('ended', () => (lastEnd = now()));
    }
    return play.apply(this, a);
  };
  // Sound unlocks on the rider's first gesture: press and release on the story itself, held long enough to be a
  // hold (so it pauses and resumes rather than navigating).
  while (!document.querySelector('.story')) await new Promise((r) => setTimeout(r, 50));
  const story = document.querySelector('.story');
  story.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
  await new Promise((r) => setTimeout(r, 300));
  story.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 10, clientY: 10 }));
  const holds = {};
  let cur, idleAt, old; // `old`: the card on stage when the route moved (it stays, idle, through the ride)
  while (now() < 170000) {
    await new Promise((r) => setTimeout(r, 50));
    const ph = document.querySelector('.stage .ph');
    const stop = [...document.querySelectorAll('.routemap .stop')].findIndex((li) => li.classList.contains('current'));
    const id = `${stop}`;
    if (id !== cur) {
      if (cur && idleAt !== undefined) holds[cur] = now() - idleAt;
      cur = id;
      idleAt = undefined;
      old = ph;
    }
    if (ph && ph !== old && ph.classList.contains('idle') && idleAt === undefined) idleAt = now();
    if (id === '12' && idleAt !== undefined && now() - idleAt > 1000) break;
  }
  return { playing, maxGap: Math.max(0, ...gaps), gaps: gaps.length, holds };
})()
