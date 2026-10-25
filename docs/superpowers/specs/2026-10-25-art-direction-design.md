# 音楽電車 Ongaku Densha: Art Direction Spec (Look & Feel Polish)

**Date:** 2026-10-25 · **Status:** awaiting review · **Builds on:** [2026-10-24-ongaku-densha-design.md](2026-10-24-ongaku-densha-design.md) (Phases 1, 2a and 2b, all on `main`)

## 1. Why

The ride works and is smooth on a real phone, but it looks basic: flat colour, one font per slide, simple shapes. It needs to look like a big-budget campaign before anything gets shared publicly (Phase 3). This spec replaces the mockup look with a deliberate art direction. Data, journey, timing and the 3D engine stay as they are.

Exploration log: [docs/design/art-direction/](../../design/art-direction/README.md) (19 directions, 11 picked).

## 2. The principle: one system, a world per station

Each station looks like a different world, the way stops on a train line do. The ride stays **one designed thing** because:

1. **Anchors never change** (§3): the route map, the ticket, the guide's phone, the station sign and the hero-number face.
2. **Every arrival follows the same ritual** (§4).
3. **Style changes only happen in motion:** during a 3D ride, or as a **morph** where one style transforms into the next (§6). Never mid-slide.
4. **Acts group styles by energy** (§7), following the seasons the ride already has.
5. **One shared texture and a few sound accents** (§8).

## 3. The anchors (identical on every station)

| Anchor | Rule |
|---|---|
| Route map + 🚃 | As built in 2b, restyled in the **F wayfinding** language: line colour `#00a7db`, white number circles with thick line-colour rings, Archivo Black numerals |
| Station sign | New component. On arrival, an F-style sign shows the station number circle (`OS 01`…`OS 13`), the kanji name and the English name. Its shape is fixed; only its accent colour takes the station's style accent |
| Hero numbers | Each station's one hero stat (the number the station is about) is set in **Dela Gothic One**, tabular, at least 30% of the slide width, and may crop at the slide edge (the **C** rule). Secondary numbers use the world's own type. No other face for hero numbers |
| Ticket | Stays in the dock. Restyled as an F-style kippu: line-colour band, stamps in the station's accent |
| Gyaru guide phone | Unchanged in role. Restyled with a chrome edge from **G**; the jp text keeps gyaru-moji |
| Palette core | paper `#f4efe6`, ink `#111111`, signal red `#e60012`, gyaru pink `#ff2d95` (pink appears on every station, as now) |
| Texture | One shared print grain (SVG noise) on every slide: `multiply` at 0.35 on light grounds, `screen` at 0.18 on dark |

## 4. The arrival ritual (every station)

These beats run in order on the existing master timeline, and every station follows them:

1. **Transition in** (ride / morph / phone / tease, §6).
2. **Station sign** slides in from the top. 0.45 s, `power3.out`.
3. **World reveal:** the slide's background art and its style elements. 0.4–0.8 s.
4. **Stat beats:** the existing `data-beat` choreography, with hero numbers counting up in Dela Gothic One.
5. **Hold:** 2.5 s, as now.

The sign stays docked at the top-left of the slide, small, while the stats play.

## 5. Station → world

Station **subjects and stats do not change**: sumo is still the top-5 banzuke, gacha is still the #1-song reveal. Only the visual world changes.

| # | Station | World | Key treatment | Real imagery |
|---|---|---|---|---|
| 1 | Departure | **F** wayfinding | white board, line strip, LED departure rows, number circles | — |
| 2 | Torii · days & minutes | **C** mega type | flat field (vermilion `#ff3b1f` / navy `#0b1640` / cream `#ffe9c9`), rising-sun disc, the days count as cropped mega type, minutes on a tilted band | — |
| 3 | Bento · genre mix | **J** sports paper | cream newsprint, blue masthead, genres as a league table with red vertical headline, halftone | `kabukicho.jpg` crowd crop, halftoned |
| 4 | Ganguro · top genre | **G** Y2K chrome | holographic pastel field, chrome bubble type for the genre, glitter stars, flip-phone sticker | — |
| 5 | Sumo · top 5 | **D** manga | B/W panels with screentone; ranks #5→#2 in panels, the Yokozuna as a splash panel with ドン; one spot red | `manga.jpg` (Hokusai Manga) panel crops |
| 6 | Idol · #1 artist | **Q** gyaru magazine | ぎゃる masthead, cover lines in fighting colours, the artist as the cover star, sticker price box | `kabukicho.jpg` as cover photo |
| 7 | Konbini · top songs | **B** neon riso | duotone night photo (pink × blue), halftone, the receipt printed in two off-register inks | `kabukicho.jpg` duotoned |
| 8 | Gacha · #1 song | **K** JRPG pixel | dithered sunset, blue menu windows, "SSR obtained!" box, CRT scanlines | — |
| 9 | Weather · seasons | **O** 60s modernism | cream field, one red sun that moves through four positions (one per season), Bebas Neue labels | — |
| 10 | Fuji · peak week | **I** sumi ink | rice paper, the weekly graph drawn as a brushed ink mountain, red seal on the peak week | — |
| 11 | Shinkansen · riser | **L** kaiju poster | painted sunset sky, giant silhouette over a city, slanted brush title "〇〇 大襲来!!", credits strip | — |
| 12 | Omikuji · fortune | **I** sumi ink | the slip as calligraphy on paper, ensō around the fortune | — |
| 13 | Kanji share card | **C** + **F** | mega kanji on a flat field, the fully stamped F-ticket beside it: the hero share image | — |

**Style accents:**

| World | Accent |
|---|---|
| F | `#00a7db` |
| C | `#ff3b1f` |
| J | `#e60012` |
| G | `#b48cff` |
| D | `#e60033` |
| Q | `#ff2d95` |
| B | `#3cf6ff` |
| K | `#ffe36b` |
| O | `#c8102e` |
| I | `#c8102e` |
| L | `#ff7a2b` |

**Faces:** Dela Gothic One and Zen Kaku Gothic New are core. Each world may add **one** accent face:

| World | Accent face |
|---|---|
| F | Archivo Black |
| B | Anton |
| G | Rampart One |
| I | Shippori Mincho / Yuji Syuku |
| K | Press Start 2P / DotGothic16 |
| L | Reggae One |
| O | Bebas Neue |
| Q | Rampart One + Hachi Maru Pop |

Japanese fonts are subset to the glyphs used (`&text=` on Google Fonts).

## 6. How worlds change: transition devices

The existing `transitionIn` types stay. **Rides** carry style changes through the 3D world. Where there's no ride, a **morph** is a new transition type: a shared element turns from the old style into the new one.

| From → to | Existing type | Device |
|---|---|---|
| 1 F → 2 C | ride | The 3D ride. On arrival, the station sign's number circle zooms to fill the screen and becomes C's mega days count |
| 2 C → 3 J | cut | **morph `shrink-to-headline`:** the mega number shrinks and lands as the newspaper's headline while the paper unfolds |
| 3 J → 4 G | phone | The phone slam stays, with the phone already chrome. The newspaper is crumpled away |
| 4 G → 5 D | ride | The 3D ride |
| 5 D → 6 Q | tease | **morph `panel-to-cover`:** the Yokozuna splash panel scales up and becomes the magazine cover photo; the masthead drops in |
| 6 Q → 7 B | cut | **morph `neon-takeover`:** the cover's neon background floods the screen and splits into two riso inks |
| 7 B → 8 K | baton | **morph `pixelate`:** the receipt's lottery stub pixelates (mosaic steps 2→24 px) and resolves into the gacha window |
| 8 K → 9 O | breather | The 3D breather ride. On arrival, pixels resolve into one perfect red sun |
| 9 O → 10 I | ride | The 3D ride. On arrival, the sun drains from red to ink and becomes a brushed circle |
| 10 I → 11 L | cut | **morph `ink-to-beast`:** an ink splash grows and becomes the kaiju silhouette |
| 11 L → 12 I | ride | The 3D ride |
| 12 I → 13 C+F | tease | The bells (as now) → the mega kanji brushes on → the ticket flies in |

**When stations are passed through** (bento/ganguro without genres), the next arrival falls back to a ride. Morph types reuse 2a's fallback rule: if either shared element is missing, ride. **Reduced motion:** every morph becomes the 0.2 s crossfade.

## 7. Acts and the 3D world

| Act | Season | Worlds | Energy | 3D world tint |
|---|---|---|---|---|
| 1 Departure | spring | F, C, J, G | bright, daytime, loud | spring sky as now; districts gain the F line colour on signage |
| 2 The Hype | summer night | D, Q, B, K | loudest, building to the gacha | sky shifts to summer **night** (deep navy + neon accents) for this act |
| 3 Looking back | autumn | O, I, L | graphic → calm → a final jolt | autumn dusk, as now |
| 4 New Year | winter | I, C+F | quiet, then the share card | New Year night, as now |

The only change to `seasonLook` is that act 2's stop becomes summer night: sky `#141a4a` → `#ff7a8a` horizon, fog `#2a1f4a`, light `#ffd1e8`, particle `haze` tinted pink. Everything else in 2b stays.

## 8. Texture and sound accents

**Grain:** one `.grain` overlay class shared by all slides (§3).

**Sound accents** are synthesised with Web Audio, so there are no audio files or licences. They play only when sound is unlocked and not muted, at −18 dB under the music, and never with reduced motion:

| Sound | When |
|---|---|
| Station chime (two-tone, 0.6 s) | every arrival, on the station sign |
| ドン thump | the manga Yokozuna splash |
| Pixel blip | each K window |
| Temple bell | station 13, as part of the existing bells |

## 9. Imagery and credits

- Images live in `public/art/` (copied from `docs/design/art-direction/img/`).
- They're served as optimised WebP at 1080 px wide, ≤ 200 KB each, and lazy-loaded per station.
- `kabukicho.jpg` is **CC BY-SA 4.0**: credit it visibly ("Photo: Basile Morin, CC BY-SA 4.0") on every station that uses it, in a small caption inside the slide. Altered versions (duotone, halftone) remain CC BY-SA.
- The CC0 and public-domain works get credited anyway, on a credits line on the landing page.
- No found picture is presented as the user's or an artist's photo.

## 10. What stays the same

- Stats and their definitions.
- The 13-station order.
- Timings (except the new sign beat, +0.45 s per station).
- Controls, audio and the soundtrack, the 3D engine and districts, the data sources.
- Every Phase 1/2 constraint: real numbers only, files stay on device, no Spotify branding, reduced motion, etc.

## 11. Build split

| Plan | Delivers |
|---|---|
| **Art Plan 1: System + proof** | Anchors (§3), arrival ritual (§4), shared grain, sound accents, act-2 night sky, and **four stations** in contrasting worlds: 1 Departure (F), 5 Sumo (D), 8 Gacha (K), 10 Fuji (I). Includes the gacha arrival's morph `pixelate`, which pixelates the current konbini slide's lottery stub, so it doesn't need world B yet. Ends with a review against the mockups |
| **Art Plan 2: The rest** | Stations 2, 3, 4, 6, 7, 9, 11, 12, 13, plus the remaining morphs (`shrink-to-headline`, `panel-to-cover`, `neon-takeover`, `ink-to-beast`) and the image pipeline for the found pictures |

## 12. Acceptance

- Each built station is screenshotted with headless Chrome at 390×844 and placed next to its mockup in `docs/design/art-direction/`. Composition, type, palette and texture must match the mockup's intent.
- The existing behaviour tests stay green. Each new slide keeps its "still shows every stat" test, so data stays correct whatever the styling.
- Morphs follow the 2a transition contract (only the incoming slide is left, no overlays), with reduced motion at 0.2 s.
- One real-phone ride after each plan (the owner's check).

## 13. Risks

- **Font weight:** up to 9 web fonts. Mitigation: subset with `&text=`, load each world's accent face only when its station is near, and fall back to the core faces.
- **Image weight:** WebP, lazy-loaded, ≤ 200 KB each.
- **Coherence:** 11 worlds is a lot. Plan 1's four contrasting stations exist to prove the anchors hold them together before the rest is built. If they don't, the fallback is to drop to the 5–6 strongest worlds.
