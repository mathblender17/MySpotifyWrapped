const KEY = 'ongaku:hinted';

const seen = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

/** First-ride hint (alive spec §4): shown once per device, gone on the first tap, swipe or key. */
export function createHint(): { el: HTMLElement; dismiss(): void } {
  const el = document.createElement('div');
  el.className = 'hint';
  el.setAttribute('role', 'note');
  if (seen()) el.hidden = true;
  else el.innerHTML = '<span class="finger" aria-hidden="true">👆</span><b>タップ or スワイプ</b> → tap or swipe';
  return {
    el,
    dismiss() {
      try {
        localStorage.setItem(KEY, '1');
      } catch {
        // storage blocked: the hint simply shows again next visit
      }
      el.remove();
    },
  };
}
