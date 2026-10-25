// Layout check for the phone control strip: it must not overlap the card or the dock, and every button is ≥ 48 px.
(async () => {
  await new Promise((r) => setTimeout(r, 4000));
  const box = (s) => document.querySelector(s)?.getBoundingClientRect();
  const hit = (a, b) => !!a && !!b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const card = box('.frame'), strip = box('.controls'), dock = box('.dock'), route = box('.route') ?? box('.routemap');
  const small = [...document.querySelectorAll('.controls button')].map((b) => b.getBoundingClientRect()).filter((r) => r.width < 48 || r.height < 48).length;
  return {
    view: `${innerWidth}x${innerHeight}`,
    card: card && [Math.round(card.top), Math.round(card.bottom), Math.round(card.width)],
    strip: strip && [Math.round(strip.top), Math.round(strip.bottom)],
    dock: dock && [Math.round(dock.top), Math.round(dock.bottom)],
    overlapCard: hit(card, strip), overlapDock: hit(strip, dock), buttons: document.querySelectorAll('.controls button').length, small,
  };
})()
