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
  app.querySelector('.demo')!.addEventListener('click', () => start(makeDemoPlays(), []));
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
  const status = app.querySelector<HTMLElement>('.status')!;
  status.innerHTML = '<progress max="1" value="0"></progress> Reading your files…';
  try {
    const { plays, problems } = await loadInWorker(files, (done, total) => {
      status.querySelector('progress')!.value = done / total;
    });
    start(plays, problems);
  } catch (err) {
    landing(`Couldn't read those files: ${esc((err as Error).message)}`);
  }
}

function problemsNote(problems: string[]) {
  return problems.length ? `Skipped some files:<ul>${problems.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : undefined;
}

function start(plays: Play[], problems: string[], at?: { station?: number; year?: number }) {
  const ds = computeAllYears(plays);
  if (!ds.stats.size) {
    const counts = ds.years.map((y) => `${y.year}: ${nPlays(y.plays)}`).join(', ') || 'no songs found';
    const why = `No year has enough listening yet (needs 50+ plays of 30 seconds or more). Found ${esc(counts)}.`;
    return landing([why, problemsNote(problems)].filter(Boolean).join('<br>'));
  }
  const firstYear = at?.year && ds.stats.has(at.year) ? at.year : ds.years.find((y) => y.eligible)!.year;
  ride(ds, firstYear, at?.station ? at.station - 1 : 0, problemsNote(problems));
}

function ride(ds: Dataset, year: number, startAt: number, note?: string) {
  app.replaceChildren();
  const root = document.createElement('div');
  app.append(root);
  const story = createStory(root, {
    slides,
    startAt,
    ctx: {
      stats: ds.stats.get(year),
      years: ds.years,
      onPickYear: (y) => {
        story.destroy();
        ride(ds, y, 1);
      },
    },
  });
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
if (route.data === 'demo') start(makeDemoPlays(), [], route);
else landing();
