# 音楽電車 Ongaku Densha: Design Spec

**Date:** 2026-10-24 · **Status:** awaiting review · **Repo:** mathblender17/MySpotifyWrapped

## 1. What and why

A browser-based, Spotify-Wrapped-quality story of a person's listening, told as **one train ride through one year in Japan**. Built with Three.js. Real stats only. It starts as a personal project, with the goal of going viral and adding more themes later.

**Success criteria**
- Someone seeing a share image can't tell it apart from a big-budget Wrapped in polish.
- Every number shown is computed from the user's own data. No invented or estimated stat is ever displayed as real.
- Instant to try (demo in 0 s), and it gets deeper as better data arrives.
- Smooth on a mid-range phone.

**Not Spotify branded.** It has no Spotify name or logo anywhere in the product. "Works with your Spotify data" is the most it says.

## 2. Decisions log

| Decision | Choice |
|---|---|
| Story shape | Year picker + an All Years story |
| Theme | 45 Japanese subcultures, picked across 3 rounds ([docs/design/subcultures](../../design/subcultures/README.md)) |
| Structure | Fixed 13-station main story + optional extras |
| Journey | One train ride, spring → New Year's midnight ([storyboard](../../design/journey-storyboard.html)) |
| 3D approach | One persistent Three.js world, with HTML/CSS slides on top |
| Data | Instant-first tiers that upgrade later (section 4) |
| Genres / popularity | Last.fm API |
| Language | English stats; Japanese as texture with English subtitles |
| Name | 音楽電車 ONGAKU DENSHA (working name) |

## 3. Scope and phases

Each phase gets its own implementation plan and ships something usable.

| Phase | Delivers |
|---|---|
| **1. Data core** | Adapters (demo, account export, extended export), `stats/`, a basic 2D slide for each of the 13 stations, the route-map progress bar and tap controls. A working (flat) story with real numbers. |
| **2. World + journey** | The Three.js world, the camera on rails, the season dial, the 5 transition types, the gyaru guide, the ticket, the soundtrack. |
| **3. Reach** | Share export, Last.fm username tier, Spotify login tier, Last.fm genre enrichment, GitHub Pages deploy. |
| **4. Depth** | All Years story, extras ("Tour more of Japan"), more themes. |

Out of scope for now: accounts, a backend, server-side storage, podcasts/audiobooks, non-Spotify sources other than Last.fm.

## 4. Data sources

All sources reduce to one shape. Facts are as of Oct 2026; Spotify's API was locked down in Nov 2024, May 2025 and Feb 2026.

| Tier | Adapter | Wait | Output | Notes |
|---|---|---|---|---|
| 0 | `demo` | 0 s | `Play[]` | A bundled, realistic, hand-made sample year. It's always available and is the default dev data. |
| 1 | `spotifyLogin` | 0 s | `Rankings` + last 50 plays | PKCE auth, no backend. Dev mode allows **5 allowlisted users** and the app owner needs **Premium**, which the project owner doesn't have yet, so this tier is optional. No genres, popularity, audio features or previews are available to new apps. |
| 1b | `lastfm` | 0 s | `Play[]` (no duration) | Public username, `user.getRecentTracks`, paginated. No user cap. |
| 2 | `accountExport` | ~days | `Play[]` | Past ~12 months. The file shape must be confirmed against a real export when it arrives. |
| 3 | `extendedExport` | ~weeks | `Play[]` | Lifetime. `Streaming_History_Audio_*.json`, with `ts` (UTC), `ms_played`, track/artist/album names, `spotify_track_uri`, `skipped`, `reason_end`, `shuffle`, `offline`. |

Files are accepted as a ZIP or as loose JSON. Parsing happens in a Web Worker. **Files never leave the device.**

### Normalized types

```ts
type Play = {
  ts: Date;                 // converted from UTC to the browser's local time zone
  track: string; artist: string; album?: string;
  msPlayed?: number;        // missing for Last.fm
  skipped?: boolean;        // extended export only
  trackKey: string;         // lowercased artist+track, or the Spotify URI when present
};
type Rankings = { // spotifyLogin only
  topArtists: Record<'short'|'medium'|'long', string[]>;
  topTracks:  Record<'short'|'medium'|'long', {track: string; artist: string}[]>;
};
```

**Qualifying play:** `msPlayed ≥ 30_000` (Spotify's own threshold). Last.fm scrobbles already apply a similar rule, so every scrobble counts.

**Time zone:** plays are shown in the viewer's current browser time zone. This is a known limitation for people who listened while travelling.

## 5. Stats (`stats/`)

These are pure functions: `Play[] → YearStats` per calendar year, plus `AllYears`. Every field is **either real or `undefined`**, never a guess. When there's no duration data, minute-based fields are `undefined` and the plays-based twin is used and labeled "plays".

| Field | Definition |
|---|---|
| `plays` | Count of qualifying plays |
| `minutes` | Σ msPlayed / 60000, rounded. Undefined without durations |
| `daysListened` | Distinct local dates with ≥ 1 qualifying play |
| `topArtists[5]`, `topTracks[5]` | Ranked by minutes, or by plays when there are no durations. Each includes plays and minutes |
| `topArtistShare` | The #1 artist's share of the year's minutes or plays |
| `seasons` | Spring Mar–May, Summer Jun–Aug, Autumn Sep–Nov, Winter = Jan, Feb and Dec of the same calendar year. Each has its top track, top artist and top genre |
| `weekly[]`, `peakWeek` | Minutes (or plays) per ISO week; the week with the highest total |
| `fastestRiser` | Among artists whose first play is this year and who are in the final top 10, the one with the fewest days from first play to entering the running top 5. If none qualifies: the biggest rank climb from the year's first half to its second half (minimum 20 plays). For `spotifyLogin`: the biggest climb from long-term to short-term rank |
| `genreShares`, `topGenre` | The top 200 artists' minutes, weighted by the artist's Last.fm top tag (from a curated genre allow-list, so a tag like "seen live" is ignored). Undefined if enrichment fails |
| `traits` | variety = unique artists / plays · loyalty = topArtistShare · novelty = share from artists first played this year · nightOwl = share of plays from 22:00–04:00 · skipRate (extended only) |
| `personality`, `fortune`, `kanji` | Deterministic mappings from `traits` using curated tables (about 8 personalities, 大吉…凶, about 30 kanji). They're presented as playful readings, not claims |

**From `Rankings` (login tier):** `topArtists`/`topTracks` come from the `long` range (ranks only, with plays and minutes undefined). `genreShares` are weighted by rank (rank 1 = 50 points … rank 50 = 1). `traits` use proxies: variety = 1 − overlap between the short-term and long-term top artists; novelty = share of short-term top artists missing from the long-term list. `loyalty` and `nightOwl` are undefined, and the personality table must cope with them being missing. Fields that depend on plays (`plays`, `daysListened`, `seasons`, `weekly`) are undefined.

**Year eligibility:** a year appears on the departure board only if it has ≥ 50 qualifying plays. Otherwise it's greyed out with its play count.

## 6. The journey (`journey/`)

Stations are **data**: `{ id, needs: (keyof YearStats)[], trackPos, act, hook, slide, song, transitionIn }`. A station whose `needs` aren't all present is a **pass-through (通過)**: the express doesn't stop there, and the route map shows 🔒 "unlock with your export".

| # | Station | Act / season | Needs | Transition in | Song |
|---|---|---|---|---|---|
| 1 | Train departure board | 1 Departure / spring morning | years | (title) | #1 track, muffled |
| 2 | Torii gate tunnel | 1 | plays, daysListened (shows minutes when present) | RIDE | swell |
| 3 | Bento box | 1 | genreShares | MATCH CUT (gate beam → bento lid) | n/a |
| 4 | Ganguro | 1 | topGenre | PHONE (guide hijacks) | top-genre track |
| 5 | Sumo banzuke (#5→#2, Yokozuna hidden) | 2 The Hype / summer | topArtists | RIDE | n/a |
| 6 | Idol / oshi | 2 | topArtists (shows topArtistShare when present) | TEASE→REVEAL | #1 artist's top track |
| 7 | Konbini receipt | 2 | topTracks | MATCH CUT (penlights → konbini lights) | n/a |
| 8 | Gacha SSR | 2 | topTracks | BATON (receipt lottery ticket → gacha) | #1 track, chorus at reveal |
| 9 | TV weather / sakura | 3 Looking Back / autumn | seasons | BREATHER, then RIDE | n/a |
| 10 | Mt. Fuji (silhouette = weekly graph) | 3 | weekly, peakWeek | RIDE | n/a |
| 11 | Shinkansen | 3 | fastestRiser | MATCH CUT (slope → nose) | riser's top track |
| 12 | Omikuji | 4 New Year / midnight snow | personality, fortune | RIDE | n/a |
| 13 | Kanji of the Year + stamped ticket | 4 | kanji, topArtists, topTracks | TEASE→REVEAL (joya no kane bells) | #1 track, final chorus |

On `spotifyLogin`, stations 2, 9 and 10 are pass-throughs (their plays-based needs are undefined), and 6 and 7 show ranks without counts. That makes 10 of 13 stations.

`needs` lists only fields the station can't play without. Optional fields (minutes, shares) are shown when present.

**Five threads** run through every station: the route map (progress), the season dial (plot), the gyaru guide (voice), your soundtrack (feeling), and the stamped ticket (baton → share card).

**Controls:** tap right for next, tap left for back, hold to pause, auto-advance after about 8 s per station. Each station plays in beats: hook → transition → slide enters → stat beats → hold, on a GSAP timeline.

## 7. The world (`world/`)

- One `WebGLRenderer`, one scene, and one camera riding a `CatmullRomCurve3` track. Each district sits beside the track at its station.
- A stylized low-poly look built in code, with no large model downloads. Repeated objects (torii, lanterns, penlights, particles) are each one `InstancedMesh`.
- The **season dial** (0–1, tied to progress) blends the sky gradient, fog, light color and particle type (sakura → heat haze → momiji leaves → snow).
- Districts are built just before arrival and disposed after leaving.
- Pixel density is capped at 2x. If fps stays below 45, quality steps down (particles, then bloom). Bloom is only used on neon and the gacha effect.
- With `prefers-reduced-motion`, rides become crossfades. Without WebGL, each station gets a 2D CSS background (the Phase-1 slides).

## 8. Look and voice (`slides/`)

- **Fixed frame:** a 9:16 safe area, the route map at the top, the guide's phone bar at the bottom, and the ticket in a corner. Big numbers always use Dela Gothic One with tabular digits.
- **Type:** Dela Gothic One, Zen Maru Gothic and DotGothic16, plus at most one accent font per station. Japanese fonts are subset to only the glyphs used. All fonts are OFL (Google Fonts).
- **Color:** a palette per act (spring pink, summer orange, autumn rust, winter navy). Every station includes gyaru pink `#ff2d95`.
- **The gyaru guide** appears only through a flip phone: deco texts, stickers and kaomoji. Her lines are per-station templates filled from stats. A `garble()` function makes the gyaru-moji (ゎ ぁ ょ, half-width katakana), and English subtitles sit underneath.
- Each slide keeps the style of its approved mockup in `docs/design/subcultures`. The kintsugi cracks must look organic (a user note).

## 9. Sharing (`share/`)

- Every station has a share action that renders a 1080×1920 PNG: a WebGL frame (rendered to a target) composited with the slide's DOM rendered to canvas.
- On mobile it uses `navigator.share({files})`; otherwise it downloads.
- The hero card is station 13 (kanji + stamped ticket). Every image carries the site URL stamp.

## 10. Audio

- 30-second previews come from the **iTunes Search API** (no key needed).
- One `AudioContext`, two players crossfading. The "tap to board" on station 1 is the first tap that unlocks sound.
- If a song isn't found, an ambient sound plays instead (station chime, cicadas, temple bell).

## 11. Failures

| Case | Behavior |
|---|---|
| Wrong or corrupt file | Explains what file it is and which one to pick. Other valid files still load |
| Very large history | Worker plus progress bar. Streams one file at a time |
| Last.fm down / rate-limited / unknown artist | Genre stations pass through. Retried next visit (cache in IndexedDB) |
| No preview | Ambient sound |
| Slow device / no WebGL | Quality steps down, then the 2D fallback |
| Login fails / user not allowlisted | Message, then a fallback to demo, Last.fm or upload |
| Thin year | Greyed out on the departure board |

## 12. Privacy

Listening data stays in the browser (memory plus an optional IndexedDB cache with a "forget my data" button). The only outbound requests are artist names to Last.fm and song names to iTunes. Real exports used as test fixtures go under `fixtures/private/`, which is git-ignored.

## 13. Testing

- **`stats/`** (Vitest): hand-written fixtures with known answers covering the 30 s filter, minutes, days, top-N ties, ISO-week and year boundaries, UTC→local conversion, seasons, fastest-riser rules (both paths), and missing-duration behavior.
- **Adapters:** fixtures shaped like real export, Last.fm and login responses. The real export is checked locally only.
- **Journey integrity:** every station's `needs` are valid `YearStats` keys, every `transitionIn` is a known type, and `trackPos` values increase.
- **Visual:** a dev route `?station=N&data=demo` jumps straight to any station. Each station is checked at phone and desktop sizes.

## 14. Stack

Vite, TypeScript, Three.js, GSAP, Vitest, and `fflate` (ZIP). DOM to canvas uses a small library chosen during Phase 3. Deployed to GitHub Pages by a GitHub Action. No backend.

## 15. Open items and risks

1. **iTunes Search API:** confirm CORS from the browser, current rate limits and terms for preview playback **before Phase 2 audio**. Fallback: ambient sound only.
2. **Last.fm API key in the client:** standard practice for read-only keys, but check the terms and rate limit (Phase 3). If the key gets abused, a tiny proxy is the fallback.
3. **Account-export file shape:** confirm against the real file when it arrives.
4. **Spotify login tier** needs a Premium owner. It's optional and can be built last.
5. **Trademark:** no Spotify marks. The "Wrapped" wording is avoided in the product UI.
6. **Personality, fortune and kanji tables** need copywriting. Draft them in Phase 1, tune them in Phase 2.
7. **Unconfirmed user terms:** "Weibo culture" (guessed visual kei), "attracting culture" (guessed idol), and "IFF" on Super Sentai.
