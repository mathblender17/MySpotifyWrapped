import { gsap } from 'gsap';
import type { Ranked } from '../types';
import type { TouchKit } from './kit';

/** Hold the card busy while a preview lookup is pending; one release, found or not (or on a throw). */
const lookup = async (kit: TouchKit, t: Ranked): Promise<boolean> => {
  const release = kit.busy();
  try { return await kit.playTrack(t); } catch { return false; } finally { release(); }
};

/** Oshi: tap the cover to hear the #1 artist's top song, with a "now playing" sticker. */
export function idol(el: HTMLElement, kit: TouchKit): void {
  const t = kit.stats.soundtrack?.topArtistTrack;
  const cover = el.querySelector<HTMLElement>('.cover');
  if (!t?.artist || !cover) return;
  kit.mark(cover);
  let pending = false;
  cover.addEventListener('click', async () => {
    if (pending) return;
    pending = true;
    const ok = await lookup(kit, t);
    pending = false;
    if (!ok) return;
    el.querySelector('.now')?.remove();
    const s = document.createElement('div');
    s.className = 'now';
    s.textContent = '♪ now playing';
    el.append(s);
    gsap.delayedCall(kit.dur(2.5), () => s.remove());
  });
}

/** Konbini: tap the receipt to hear its songs in turn (those with an artist), stamping the playing line 再生中. */
export function konbini(el: HTMLElement, kit: TouchKit): void {
  const rc = el.querySelector<HTMLElement>('.rc');
  const rows = el.querySelectorAll<HTMLElement>('.rows .r');
  const idx = (kit.stats.topTracks ?? []).flatMap((t, i) => (t.artist && rows[i] ? [i] : []));
  if (!rc || !idx.length) return;
  kit.mark(rc);
  let n = 0;
  let pending = false;
  rc.addEventListener('click', async () => {
    if (pending) return;
    pending = true;
    const i = idx[n++ % idx.length];
    const ok = await lookup(kit, kit.stats.topTracks![i]);
    pending = false;
    el.querySelector('.r.now')?.classList.remove('now');
    el.querySelector('.r .stamp')?.remove();
    if (!ok) return;
    const s = document.createElement('b');
    s.className = 'stamp';
    s.textContent = '再生中';
    rows[i].classList.add('now');
    rows[i].append(s);
  });
}
