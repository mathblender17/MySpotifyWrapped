// Renders every slide at design size with 40-character names, songs and genres, and reports, per slide:
// overflow — text cut off (past the slide, or clipped by a box without an ellipsis/line clamp);
// overlap  — two text blocks drawn on top of each other. Mega type meant to crop carries data-crop.
(async () => {
  const { slides } = await import('/src/slides/index.ts');
  const { makeDemoPlays } = await import('/src/ingest/demo.ts');
  const { computeAllYears } = await import('/src/stats/index.ts');
  const { withSampleGenres } = await import('/src/ingest/sampleGenres.ts');
  const ds = withSampleGenres(computeAllYears(makeDemoPlays(), { lifetime: true }));
  const st = ds.stats.get(2025);
  const L = (s) => (s + ' ' + 'Long Name Overflow Test Xx').padEnd(40, 'x').slice(0, 40);
  const long = {
    ...st,
    topArtists: st.topArtists.map((a) => ({ ...a, name: L(a.name) })),
    topTracks: st.topTracks.map((t) => ({ ...t, name: L(t.name), artist: L(t.artist ?? '') })),
    seasons: Object.fromEntries(Object.entries(st.seasons).map(([k, v]) => [k, { ...v, topArtist: v.topArtist && { ...v.topArtist, name: L(v.topArtist.name) } }])),
    fastestRiser: { ...st.fastestRiser, artist: L(st.fastestRiser.artist) },
    genreShares: st.genreShares.map((g) => ({ ...g, genre: L(g.genre) })),
    topGenre: L(st.topGenre),
  };
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:0;top:0;z-index:99;background:#fff';
  document.body.replaceChildren(host);
  await document.fonts.ready;
  const out = {};
  for (const [id, make] of Object.entries(slides)) {
    const el = make({ stats: long, years: ds.years.map((y) => ({ ...y })), onPickYear() {} });
    host.replaceChildren(el);
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(r));
    const box = el.getBoundingClientRect();
    const texts = [...el.querySelectorAll('*')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && !e.closest('[data-crop]'));
    let overflow = 0;
    for (const e of texts) {
      const r = e.getBoundingClientRect();
      if (!r.width) continue;
      if (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1) { overflow++; continue; }
      for (let a = e; a && a !== el; a = a.parentElement) {
        const cs = getComputedStyle(a);
        const clips = cs.overflow !== 'visible' || cs.overflowX !== 'visible';
        const intended = cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none';
        if (!clips) continue;
        // This element's own text box is cut by the nearest clipping box (an ellipsis or line clamp is intended).
        const c = a.getBoundingClientRect();
        const cut = r.left < c.left - 1 || r.right > c.right + 1 || r.top < c.top - 1 || r.bottom > c.bottom + 1 || (e === a && (a.scrollWidth > a.clientWidth + 1 || a.scrollHeight > a.clientHeight + 1));
        if (cut && !intended) overflow++;
        break;
      }
    }
    const blocks = [...el.querySelectorAll('[data-beat]')].filter((b) => b.textContent.trim() && getComputedStyle(b).opacity !== '0' && !b.dataset.fx?.includes('flash'));
    let overlap = 0;
    for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
      const [a, b] = [blocks[i], blocks[j]];
      if (a.contains(b) || b.contains(a)) continue;
      const p = a.getBoundingClientRect(), q = b.getBoundingClientRect();
      const w = Math.min(p.right, q.right) - Math.max(p.left, q.left), h = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
      if (w > 2 && h > 2) overlap++;
    }
    out[id] = { overflow, overlap };
  }
  return out;
})()
