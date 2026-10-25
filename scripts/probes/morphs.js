// Rides the demo and logs, per arrival, which morph pieces appeared (clone, tease card, pixel blocks, neon, ink blot)
// and what the stage held when the station was left (settled: exactly one slide, nothing else).
(async () => {
  const t0 = performance.now();
  const seen = {};
  let last;
  let stageNow = '';
  const errors = [];
  addEventListener('error', (e) => errors.push(String(e.message)));
  const PIECES = { clone: '.cut-clone', tease: '.tx-overlay.tease', pix: '.pix', neon: '.neon, .neon-a, .neon-b', ink: '.ink-blot' };
  while (performance.now() - t0 < 80000) {
    await new Promise((r) => setTimeout(r, 30));
    const sign = document.querySelector('.sign .os b')?.textContent;
    if (sign !== last) {
      if (last) seen[last].settled = stageNow; // what was on stage just before the next arrival began
      last = sign;
      seen[sign] = { pieces: [] };
    }
    for (const [k, sel] of Object.entries(PIECES)) if (document.querySelector(sel) && !seen[sign].pieces.includes(k)) seen[sign].pieces.push(k);
    stageNow = [...document.querySelectorAll('.stage > *')].map((e) => String(e.className.baseVal ?? e.className)).join(' | ');
    if (sign === '13' && document.querySelector('.ticket.final')) break;
  }
  await new Promise((r) => setTimeout(r, 1500));
  if (last) seen[last].settled = [...document.querySelectorAll('.stage > *')].map((e) => String(e.className)).join(' | ');
  return { seen, errors };
})()
