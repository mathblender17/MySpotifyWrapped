import type { Station } from '../journey/stations';

/** The progress bar is a train line: every station is a stop, pass-throughs are marked 通過 like an express skipping a platform. */
export function createRouteMap(stations: Station[], playable: boolean[]) {
  const el = document.createElement('div');
  el.className = 'routewrap';
  const ol = document.createElement('ol');
  ol.className = 'routemap';
  const stops = stations.map((s, i) => {
    const li = document.createElement('li');
    li.className = 'stop' + (playable[i] ? '' : ' pass');
    li.innerHTML = `<span class="n">${s.n}</span><span class="nm">${s.nameJp}</span>`;
    if (!playable[i]) {
      li.title = s.lockedHint ?? 'Unlock with your full listening export';
      li.insertAdjacentHTML('beforeend', '<span class="lock">通過🔒</span>');
    }
    ol.append(li);
    return li;
  });
  const marker = document.createElement('span');
  marker.className = 'train-marker';
  marker.textContent = '🚃';
  marker.setAttribute('aria-hidden', 'true');
  el.append(ol, marker);

  return {
    el,
    set(current: number) {
      ol.setAttribute('aria-label', `Stop ${current + 1} of ${stations.length}`);
      stops.forEach((li, i) => {
        li.classList.toggle('current', i === current);
        li.classList.toggle('done', i < current);
      });
      marker.style.left = `${(current / (stations.length - 1)) * 100}%`;
    },
  };
}
