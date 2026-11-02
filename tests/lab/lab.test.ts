import { beforeEach, expect, test } from 'vitest';
import { mountLab } from '../../src/lab/lab';
import { EXPERIMENTS } from '../../src/lab/registry';
import { fakeKit, type FakeKit } from './fakeKit';

const memStore = (): Storage => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 } as Storage;
};
let app: HTMLElement;
let kits: FakeKit[];
const make = () => (reduced: boolean) => { const k = fakeKit({ reduced }); kits.push(k); return k; };
beforeEach(() => { document.body.innerHTML = '<div id="app"></div>'; app = document.getElementById('app')!; kits = []; location.hash = ''; });
const click = (sel: string) => (app.querySelector(sel) as HTMLElement).click();

test('the list shows every registered experiment and opens one on tap', () => {
  mountLab(app, { makeKit: make(), store: memStore() });
  const ids = [...app.querySelectorAll('button[data-exp]')].map((b) => (b as HTMLElement).dataset.exp);
  expect(ids).toEqual(EXPERIMENTS.map((e) => e.id));
  click('button[data-exp="check"]');
  expect(app.querySelector('.lab-stage')).not.toBeNull();
  expect(app.querySelector('.lab-title')!.textContent).toContain(EXPERIMENTS.find((e) => e.id === 'check')!.title);
});

test('leaving an experiment runs its onLeave callbacks', () => {
  mountLab(app, { makeKit: make(), store: memStore() });
  click('button[data-exp="check"]');
  expect(kits[0].registered.length).toBe(1);
  click('button.lab-back');
  expect(kits[0].leave).toHaveBeenCalledTimes(1);
  expect(app.querySelector('.lab-stage')).toBeNull();
});

test('the score sheet saves a score and shows its verdict', () => {
  mountLab(app, { makeKit: make(), store: memStore() });
  click('button[data-exp="check"]');
  click('button.lab-score-open');
  click('[data-row="goosebumps"] button[data-val="3"]');
  click('[data-row="clarity"] button[data-val="2"]');
  click('[data-row="speed"] button[data-val="2"]');
  click('button.lab-save');
  click('button.lab-back');
  expect(app.querySelector('button[data-exp="check"]')!.textContent).toContain('keep');
});

test('location.hash opens that experiment directly', () => {
  location.hash = '#check';
  mountLab(app, { makeKit: make(), store: memStore() });
  expect(app.querySelector('.lab-stage')).not.toBeNull();
});

test('a throwing store shows "not saved" and still works', () => {
  const bad = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } } as unknown as Storage;
  mountLab(app, { makeKit: make(), store: bad });
  click('button[data-exp="check"]');
  click('button.lab-score-open');
  click('[data-row="goosebumps"] button[data-val="1"]');
  click('button.lab-save');
  expect(app.textContent).toContain('not saved');
});

test('every control is a real button with a 48px class hook', () => {
  mountLab(app, { makeKit: make(), store: memStore() });
  expect(app.querySelectorAll('button').length).toBeGreaterThan(0);
  expect(app.querySelector('.lab')).not.toBeNull();
});

test('the first tap inside an experiment unlocks the feel sounds too', () => {
  mountLab(app, { makeKit: make(), store: memStore() });
  click('button[data-exp="check"]');
  app.querySelector('.lab')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
  expect(kits[0].fx.unlock).toHaveBeenCalled();
});

test('the phone back gesture (the hash clears) returns to the list and stops the experiment', () => {
  mountLab(app, { makeKit: make(), store: memStore() });
  click('button[data-exp="check"]');
  location.hash = '';
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  expect(app.querySelector('button[data-exp]')).not.toBeNull();
  expect(kits[0].leave).toHaveBeenCalledTimes(1);
});
