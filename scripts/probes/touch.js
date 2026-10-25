// Touch check for one station (?station=N): target sizes (>= 48 px both ways), no overlap with .controls, dots before the
// first touch (all visible on the card), then a pointerdown/up on each target leaves the story where it was and removes the dots.
// With ?reduced=1 it also lists any GSAP tween longer than 0 still running after the touch.
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const stop = () => [...document.querySelectorAll('.routemap .stop')].findIndex((li) => li.classList.contains('current'));
  for (let i = 0; i < 160 && !document.querySelector('[data-touch]'); i++) await wait(50);
  for (let i = 0; i < 200 && !/reduced=1/.test(location.search) && !document.querySelector('.stage .ph.idle'); i++) await wait(50); // beats done: nothing is mid-grow (reduced has no beats; waiting there lets the ride advance)
  await wait(/reduced=1/.test(location.search) ? 1500 : 300); // reduced: let the 0.3 s card fade finish first
  const targets = [...document.querySelectorAll('[data-touch]')];
  if (!targets.length) return { station: stop() + 1, targets: 0, pass: false, note: 'no [data-touch]' };
  const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const strip = document.querySelector('.controls')?.getBoundingClientRect();
  const sizes = targets.map((t) => { const r = t.getBoundingClientRect(); return [t.className || t.tagName, Math.round(r.width), Math.round(r.height)]; });
  const small = sizes.filter((s) => s[1] < 48 || s[2] < 48);
  const overlapsControls = strip ? targets.filter((t) => hit(t.getBoundingClientRect(), strip)).length : 0;
  const dotsBefore = document.querySelectorAll('.touch-dot').length;
  const frame = document.querySelector('.frame').getBoundingClientRect();
  const hidden = [...document.querySelectorAll('.touch-dot')].filter((d) => { const r = d.getBoundingClientRect(); return !r.width || (!d.closest('.dock') && (r.left < frame.left || r.right > frame.right || r.top < frame.top || r.bottom > frame.bottom)); }).length; // empty or off the card (the final ticket sits in the dock, outside it)
  const before = stop();
  for (const t of targets) {
    const r = t.getBoundingClientRect();
    const init = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, isPrimary: true };
    t.dispatchEvent(new PointerEvent('pointerdown', init));
    t.dispatchEvent(new PointerEvent('pointerup', init));
  }
  await wait(400);
  const out = { station: before + 1, targets: sizes, small: small.length, overlapsControls, dotsBefore, hidden, dotsAfter: document.querySelectorAll('.touch-dot').length, moved: stop() !== before };
  out.pass = !out.small && !overlapsControls && !hidden && dotsBefore >= targets.length && !out.dotsAfter && !out.moved;
  if (/reduced=1/.test(location.search)) {
    const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /deps\/gsap\.js/.test(n));
    const { gsap } = await import(url);
    out.running = gsap.globalTimeline.getChildren(true, true, false).filter((c) => c.isActive() && c.duration() > 0).map((c) => [c.duration(), c.targets ? c.targets().map((t) => t.className || t.tagName) : 'timeline']);
    out.pass = out.pass && !out.running.length;
  }
  return out;
})()
