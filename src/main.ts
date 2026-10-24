import { gsap } from 'gsap';
import { createSoundtrack } from './audio/soundtrack';
import { withTimeout } from './timeout';
import { prefersReducedMotion } from './journey/beats';
import { STATIONS } from './journey/stations';
import { makeDemoPlays } from './ingest/demo';
import { loadInWorker } from './ingest/loadInWorker';
import { parseRoute } from './route';
import { esc, plays as nPlays } from './slides/fmt';
import { slides } from './slides';
import { computeAllYears } from './stats';
import { createStory } from './story/player';
import type { Dataset, Play } from './types';
import './app.css';

const app = document.querySelector<HTMLElement>('#app')!;
let current: { destroy(): void } | undefined;
let loadToken = 0;
const soundtrack = createSoundtrack();
// Keep animation on real time: on a slow or throttled device GSAP would otherwise play in slow motion
// and drift out of sync with the music.
gsap.ticker.lagSmoothing(0);

function landing(note?: string) {
  app.innerHTML = `
    <main class="landing">
      <p class="kicker">♪ 音楽電車 · ONGAKU DENSHA ♪</p>
      <h1>Your year in music,<br>as a train ride<br>through Japan.</h1>
      <button class="demo" type="button">Try the demo ▶</button>
      <label class="drop">
        <input type="file" multiple accept=".zip,.json,application/zip,application/json" hidden>
        <b>Drop your listening-history ZIP or JSON files</b>
        <span>They never leave your device.</span>
      </label>
      <div class="status" role="status"></div>
      ${note ? `<div class="note">${note}<button type="button" class="x" aria-label="Dismiss">×</button></div>` : ''}
    </main>`;
  app.querySelector('.demo')!.addEventListener('click', () => start(makeDemoPlays(), [], true));
  app.querySelector('.note .x')?.addEventListener('click', (e) => (e.currentTarget as HTMLElement).parentElement!.remove());
  const drop = app.querySelector<HTMLElement>('.drop')!;
  const input = drop.querySelector('input')!;
  input.addEventListener('change', () => input.files?.length && load([...input.files]));
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    if (e.dataTransfer?.files.length) load([...e.dataTransfer.files]);
  });
}

async function load(files: File[]) {
  const token = ++loadToken;
  const status = app.querySelector<HTMLElement>('.status')!;
  status.innerHTML = '<progress max="1" value="0"></progress> Reading your files…';
  try {
    const { plays, problems, lifetime } = await loadInWorker(files, (done, total) => {
      const bar = status.querySelector('progress');
      if (bar) bar.value = done / total;
    });
    // The rider may have started the demo while the files were parsing; don't hijack that ride.
    if (token === loadToken && !current) start(plays, problems, lifetime);
  } catch (err) {
    if (token === loadToken && !current) landing(`Couldn't read those files: ${esc((err as Error).message)}`);
  }
}

function problemsNote(problems: string[]) {
  return problems.length ? `Skipped some files:<ul>${problems.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : undefined;
}

function start(plays: Play[], problems: string[], lifetime: boolean, at?: { station?: number; year?: number }) {
  const ds = computeAllYears(plays, { lifetime });
  if (!ds.stats.size) {
    const counts = ds.years.map((y) => `${y.year}: ${nPlays(y.plays)}`).join(', ') || 'no songs found';
    const why = `No year has enough listening yet (needs 50+ plays of 30 seconds or more). Found ${esc(counts)}.`;
    return landing([why, problemsNote(problems)].filter(Boolean).join('<br>'));
  }
  const firstYear = at?.year && ds.stats.has(at.year) ? at.year : ds.years.find((y) => y.eligible)!.year;
  ride(ds, firstYear, at?.station ? at.station - 1 : 0, problemsNote(problems)).catch(rideFailed);
}

/** The 3D world (three.js) is only fetched once a ride starts, so the landing page stays light. */
async function makeWorld(container: HTMLElement, onLost: () => void, stillWanted: () => boolean) {
  // A stalled or failed download (bad mobile network) must never hold the ride: after 3 s, ride the flat journey.
  const mod = await withTimeout(import('./world/world'), 3000, null);
  if (!mod || !stillWanted()) return null;
  return mod.createWorld(container, { reduced: prefersReducedMotion(), stationIds: STATIONS.map((s) => s.id), onLost });
}

const rideFailed = (err: unknown) => {
  current?.destroy();
  current = undefined;
  landing(`Couldn't start the ride: ${esc(String((err as Error)?.message ?? err))}`);
};

let rideToken = 0;
async function ride(ds: Dataset, year: number, startAt: number, note?: string) {
  const token = ++rideToken;
  current?.destroy();
  current = undefined;
  app.replaceChildren();
  const backdrop = document.createElement('div');
  backdrop.className = 'world';
  const root = document.createElement('div');
  root.innerHTML = '<p class="boarding">乗車中… boarding</p>';
  app.append(backdrop, root);
  let story: ReturnType<typeof createStory> | undefined;
  const world = await makeWorld(backdrop, () => story?.dropWorld(), () => token === rideToken);
  if (token !== rideToken) return void world?.destroy(); // a newer ride started while three.js loaded
  if (import.meta.env.DEV) Object.assign(window, { __world: world }); // for in-page checks; stripped from builds
  story = createStory(root, {
    slides,
    startAt,
    soundtrack,
    world,
    ctx: {
      stats: ds.stats.get(year),
      years: ds.years,
      onPickYear: (y) => {
        soundtrack.unlock(); // the year pick is the tap browsers require before sound
        ride(ds, y, 1).catch(rideFailed);
      },
    },
  });
  current = story;
  const mute = document.createElement('button');
  mute.type = 'button';
  mute.className = 'mute';
  const label = () => {
    mute.textContent = soundtrack.muted ? '🔇' : '🔊';
    mute.setAttribute('aria-label', soundtrack.muted ? 'Unmute' : 'Mute');
  };
  label();
  mute.addEventListener('click', () => {
    soundtrack.mute(!soundtrack.muted);
    label();
  });
  const dock = root.querySelector('.dock');
  if (dock) dock.insertBefore(mute, dock.lastElementChild);
  else root.append(mute);
  if (note) {
    const n = document.createElement('div');
    n.className = 'note floating';
    n.innerHTML = `${note}<button type="button" class="x" aria-label="Dismiss">×</button>`;
    n.querySelector('.x')!.addEventListener('click', () => n.remove());
    n.addEventListener('pointerdown', (e) => e.stopPropagation());
    app.append(n);
  }
}

const route = parseRoute(location.search);
if (route.world && import.meta.env.DEV) previewWorld(route.station ?? 1); // dev-only district preview
else if (route.data === 'demo') start(makeDemoPlays(), [], true, route);
else landing();

/** Dev: one district in the 3D world, no slides — for looking at and measuring the art. */
async function previewWorld(station: number) {
  const { createWorld } = await import('./world/world');
  const { STATIONS } = await import('./journey/stations');
  app.innerHTML = '<div class="world" style="position:fixed;inset:0"></div>';
  const w = createWorld(app.firstElementChild as HTMLElement, { reduced: false, stationIds: STATIONS.map((s) => s.id) });
  if (!w) return void (app.textContent = 'WebGL unavailable');
  w.jump(station - 1);
  w.setSeason((STATIONS[station - 1].act - 1) / 3);
  Object.assign(window, { __world: w });
}
