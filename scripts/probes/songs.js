// Oshi (?station=6&previews=silent): unlock sound, tap the cover, log every media element's play/pause/ended events, so
// the gap between the tapped clip ending and the mix coming back (a 'playing' event) can be read off. Spec: <= 2 s.
(async () => {
  const t0 = performance.now();
  const now = () => Math.round(performance.now() - t0);
  const ev = [];
  const id = new WeakMap();
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...a) {
    if (!id.has(this)) {
      id.set(this, id.size);
      for (const k of ['playing', 'pause', 'ended']) this.addEventListener(k, () => this.src.length > 200 && ev.push([now(), id.get(this), k]));
    }
    return play.apply(this, a);
  };
  while (!document.querySelector('.story')) await new Promise((r) => setTimeout(r, 50));
  const story = document.querySelector('.story');
  story.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
  await new Promise((r) => setTimeout(r, 300));
  story.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 10, clientY: 10 }));
  while (!document.querySelector('.stage .ph.idle [data-touch]')) await new Promise((r) => setTimeout(r, 50));
  await new Promise((r) => setTimeout(r, 500));
  const tap = now();
  document.querySelector('[data-touch]').click();
  let sticker;
  for (let i = 0; i < 70; i++) { await new Promise((r) => setTimeout(r, 100)); if (sticker === undefined && document.querySelector('.now')) sticker = now() - tap; }
  return { tap, stickerAfterMs: sticker, ev };
})()
