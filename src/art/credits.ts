// Found pictures and their credits (docs/design/art-direction/img/credits.json). The Kabukicho photo is CC BY-SA 4.0:
// credited visibly wherever it is shown, and altered versions (duotone, halftone) stay under the same licence.
export const CREDITS = [
  { file: 'manga.webp', required: false, html: '<i>Hokusai Manga</i> vol. 5, Katsushika Hokusai (public domain)' },
  {
    file: 'kabukicho.webp',
    required: true,
    html: '<a href="https://commons.wikimedia.org/w/index.php?curid=81420139" target="_blank" rel="noopener"><i>Kabukicho red gate and colorful neon street signs at night</i></a>, Basile Morin, via Wikimedia Commons; adapted (recoloured, halftoned) and shared under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>',
  },
];

/** The landing page's credits line for every found picture the ride uses. */
export const creditsLine = (): string => `Pictures: ${CREDITS.map((c) => c.html).join(' · ')}`;

/** The caption every slide showing the Kabukicho photo carries. Never behind a beat, so it is always visible. */
export const photoCredit = (): string => '<small class="credit">Photo: Basile Morin, CC BY-SA 4.0</small>';
