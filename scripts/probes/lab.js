// Phone-size check of the UX lab: opens every experiment from the list and checks it.
// Run at 375x667: node scripts/probe.mjs "http://localhost:5191/?lab=1" scripts/probes/lab.js 1500 375 667
// Add &reduced=1 to the URL to check reduced motion: no vibration and no AudioContext may be created.
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errors = [];
  window.addEventListener('error', (e) => errors.push(String(e.message)));
  window.addEventListener('unhandledrejection', (e) => errors.push('rejection: ' + e.reason));
  const origError = console.error;
  console.error = (...a) => { errors.push('console.error: ' + a.join(' ')); origError(...a); };
  let vibrations = 0;
  navigator.vibrate = () => { vibrations++; return true; };
  let contexts = 0;
  const RealCtx = window.AudioContext;
  if (RealCtx) window.AudioContext = function (...a) { contexts++; return new RealCtx(...a); };

  const ids = [...document.querySelectorAll('[data-exp]')].map((b) => b.dataset.exp);
  const reduced = new URLSearchParams(location.search).get('reduced') === '1';
  const results = [];
  for (const id of ids) {
    const r = { id, problems: [] };
    document.querySelector(`[data-exp="${id}"]`).click();
    await wait(300);
    const stage = document.querySelector('.lab-stage');
    if (!stage) { r.problems.push('no .lab-stage'); results.push(r); continue; }
    if (getComputedStyle(stage).touchAction !== 'none') r.problems.push('stage touch-action is not none');
    // every button at least 48x48 CSS px
    for (const b of document.querySelectorAll('.lab button, .lab [role=button]')) {
      const q = b.getBoundingClientRect();
      if (q.width === 0 && q.height === 0) continue; // not shown
      if (q.width < 48 || q.height < 48) r.problems.push(`small target ${b.className || b.tagName} ${Math.round(q.width)}x${Math.round(q.height)}`);
    }
    // nothing the rider needs sits in the bottom 140 px except the lab footer
    for (const b of stage.querySelectorAll('button, [role=button]')) {
      const q = b.getBoundingClientRect();
      if (q.height > 0 && q.top + q.height / 2 > innerHeight - 140) r.problems.push(`control in the footer zone: ${b.className || b.tagName}`);
    }
    // a short drag and a tap across the stage
    const q = stage.getBoundingClientRect();
    const fire = (type, x, y) => stage.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true, cancelable: true }));
    const cx = q.left + q.width / 2;
    fire('pointerdown', cx, q.top + 60); await wait(16);
    fire('pointermove', cx + 80, q.top + 120); await wait(16);
    fire('pointermove', cx + 160, q.top + 200); await wait(16);
    fire('pointerup', cx + 160, q.top + 200); await wait(120);
    if (reduced && (vibrations > 0 || contexts > 0)) r.problems.push(`reduced motion made ${vibrations} vibrations and ${contexts} audio contexts`);
    document.querySelector('.lab-back')?.click();
    await wait(150);
    if (!document.querySelector('[data-exp]')) r.problems.push('Back did not return to the list');
    results.push(r);
  }
  return {
    view: `${innerWidth}x${innerHeight}`, reduced, experiments: ids.length, errors,
    vibrations, contexts, failing: results.filter((r) => r.problems.length), allPass: !errors.length && results.every((r) => !r.problems.length),
  };
})()
