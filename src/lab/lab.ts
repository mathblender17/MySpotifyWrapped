import './lab.css';
import { prefersReducedMotion } from '../journey/beats';
import { EXPERIMENTS } from './registry';
import { loadScores, saveScore, toMarkdown, verdict, type Score } from './scorecard';
import { makeKit } from './kit';
import type { Experiment, MadeKit } from './types';

const ROWS = ['goosebumps', 'clarity', 'speed'] as const;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
  const n = document.createElement(tag);
  n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

/** The UX lab (ux spec §2): a list of playable experiments, a stage, and a score sheet. */
export function mountLab(app: HTMLElement, o: { makeKit?: (reduced: boolean) => MadeKit; store?: Storage } = {}) {
  let unlocked = false;
  const reduced = prefersReducedMotion();
  const build = o.makeKit ?? ((r: boolean) => makeKit({ reduced: r, unlocked: () => unlocked }));
  let kit: MadeKit | undefined;
  const root = el('div', 'lab');
  app.replaceChildren(root);
  // The first tap unlocks sound and vibration (iOS needs a gesture to start audio).
  root.addEventListener(
    'pointerdown',
    () => {
      unlocked = true;
      kit?.sfx.unlock();
    },
    true,
  );

  const leave = () => {
    kit?.leave();
    kit = undefined;
  };

  const showList = () => {
    leave();
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    const scores = loadScores(o.store);
    root.replaceChildren();
    root.append(el('h1', 'lab-head', 'UX lab · 開発中 in development'));
    root.append(el('p', 'lab-sub', 'Play each one on your phone, then tap Score.'));
    for (const e of EXPERIMENTS) {
      const b = el('button', 'lab-item');
      b.type = 'button';
      b.dataset.exp = e.id;
      const s = scores[e.id];
      b.append(el('b', 'lab-item-title', e.title), el('span', 'lab-item-blurb', e.blurb), el('i', 'lab-item-layer', `${e.layer}${s ? ' · ' + verdict(s) : ''}`));
      b.addEventListener('click', () => open(e));
      root.append(b);
    }
    const copy = el('button', 'lab-copy', 'Copy scorecard');
    copy.type = 'button';
    const out = el('textarea', 'lab-export');
    out.hidden = true;
    copy.addEventListener('click', () => {
      const md = toMarkdown(loadScores(o.store), { device: navigator.userAgent, date: new Date().toISOString().slice(0, 10) });
      out.value = md;
      if (!navigator.clipboard) {
        out.hidden = false; // no clipboard access: show the text to copy by hand
        return;
      }
      navigator.clipboard.writeText(md).then(
        () => (copy.textContent = 'Copied'),
        () => (out.hidden = false),
      );
    });
    root.append(copy, out);
  };

  const sheet = (e: Experiment, note: HTMLElement) => {
    const prev = loadScores(o.store)[e.id];
    const vals: Record<(typeof ROWS)[number], 0 | 1 | 2 | 3> = { goosebumps: prev?.goosebumps ?? 0, clarity: prev?.clarity ?? 0, speed: prev?.speed ?? 0 };
    const box = el('div', 'lab-sheet');
    for (const r of ROWS) {
      const row = el('div', 'lab-row');
      row.dataset.row = r;
      row.append(el('span', 'lab-row-name', r));
      for (const v of [0, 1, 2, 3] as const) {
        const b = el('button', 'lab-val' + (vals[r] === v ? ' on' : ''), String(v));
        b.type = 'button';
        b.dataset.val = String(v);
        b.addEventListener('click', () => {
          vals[r] = v;
          row.querySelectorAll('.lab-val').forEach((x) => x.classList.toggle('on', (x as HTMLElement).dataset.val === String(v)));
        });
        row.append(b);
      }
      box.append(row);
    }
    const text = el('input', 'lab-text');
    text.placeholder = 'note (optional)';
    text.value = prev?.note ?? '';
    const save = el('button', 'lab-save', 'Save');
    save.type = 'button';
    save.addEventListener('click', () => {
      const s: Score = { id: e.id, ...vals, note: text.value };
      const ok = saveScore(s, o.store);
      note.textContent = ok ? `Saved · ${verdict(s)}` : 'Scores are not saved on this phone (storage is blocked); kept until you close the page.';
      box.remove();
    });
    box.append(text, save);
    return box;
  };

  const open = (e: Experiment) => {
    leave();
    location.hash = e.id;
    kit = build(reduced);
    root.replaceChildren();
    const top = el('div', 'lab-top');
    top.append(el('b', 'lab-title', e.title));
    const stage = el('div', 'lab-stage');
    const note = el('p', 'lab-note');
    const foot = el('div', 'lab-foot');
    const back = el('button', 'lab-back', '← Back');
    back.type = 'button';
    back.addEventListener('click', showList);
    const sc = el('button', 'lab-score-open', 'Score');
    sc.type = 'button';
    sc.addEventListener('click', () => {
      if (!root.querySelector('.lab-sheet')) root.append(sheet(e, note));
    });
    foot.append(back, sc, note);
    root.append(top, stage, foot);
    e.mount(stage, kit);
  };

  const first = EXPERIMENTS.find((e) => e.id === location.hash.slice(1));
  if (first) open(first);
  else showList();
}
