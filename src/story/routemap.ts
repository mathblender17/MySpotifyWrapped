import type { Station } from '../journey/stations';

/** The progress bar is a train line: every station is a stop, pass-throughs are marked 通過 like an express skipping a platform. */
export function routeMap(stations: Station[], current: number, playable: boolean[]): HTMLElement {
  const ol = document.createElement('ol');
  ol.className = 'routemap';
  ol.setAttribute('aria-label', `Stop ${current + 1} of ${stations.length}`);
  stations.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'stop' + (i === current ? ' current' : '') + (i < current ? ' done' : '') + (playable[i] ? '' : ' pass');
    li.innerHTML = `<span class="n">${s.n}</span><span class="nm">${s.nameJp}</span>`;
    if (!playable[i]) {
      li.title = s.lockedHint ?? 'Unlock with your full listening export';
      li.insertAdjacentHTML('beforeend', '<span class="lock">通過🔒</span>');
    }
    ol.append(li);
  });
  return ol;
}
