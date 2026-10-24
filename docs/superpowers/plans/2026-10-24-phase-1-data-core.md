# Ongaku Densha Phase 1 (Data Core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working flat (2D) 13-station story that shows real numbers from a Spotify export or the demo data, with a route-map progress bar and story-style tap controls.

**Architecture:** Adapters turn source files into one `Play[]` shape, parsed in a Web Worker. Pure `stats/` functions turn `Play[]` into one `YearStats` per year. A data-driven station list decides which stations play and which pass through (通過). Each station is a function `Slide(ctx) → HTMLElement`, styled by porting the approved mockup CSS. Each slide is laid out at a fixed 210×373 design size and scaled to fit the screen.

**Tech Stack:** Vite 8, TypeScript, Vitest 5 + jsdom, fflate. Node 24 (installed). No Three.js or GSAP yet; those arrive in Phase 2.

**Spec:** [docs/superpowers/specs/2026-10-24-ongaku-densha-design.md](../specs/2026-10-24-ongaku-densha-design.md). Mockups: `docs/design/subcultures/*.html`.

## Global Constraints

- No Spotify name or logo anywhere in the product UI. The word "Wrapped" is not used in the UI.
- Every number on screen comes from `YearStats` / `YearSummary`. No invented or estimated values. A field without data is `undefined`.
- Qualifying play: `msPlayed >= 30_000`, or `msPlayed === undefined`.
- A year is eligible if it has `>= 50` qualifying plays.
- Auto-advance: `8000` ms per station.
- Slides are 9:16, with a design size of 210×373 CSS px, scaled to fit the viewport.
- Stats and key lines are in English. Japanese is decorative texture.
- Gyaru pink `#ff2d95` appears on every station.
- Fonts come only from Google Fonts (OFL).
- Listening files never leave the device. There are no network calls in Phase 1 except Google Fonts.
- Real exports live only in `fixtures/private/` (git-ignored). Never commit them.
- Tests run with `TZ=Asia/Tokyo` so the UTC→local conversion is actually exercised.

## Review Focus

1. **Account export covers only ~12 months.** The first year looks like "everything is new", which inflates novelty and the riser. Expected: a year that starts on or before the dataset's earliest play gets `novelty` undefined and uses the halves fallback for the riser (test in Task 7).
2. **Wrong file dropped** (playlists, library, a podcast history, random JSON, a non-JSON file). Expected: a plain-English message naming what it looks like, and the valid files still load (test in Task 2).
3. **UTC timestamps near midnight on New Year's Eve.** Expected: a play is assigned to the local year/day, not the UTC one (test in Task 5).
4. **Ties in top lists.** Expected: a stable order by value desc, then plays desc, then name asc, never a random order (test in Task 5).
5. **Taps on interactive elements** (year buttons on the departure board). Expected: the button works, and the story doesn't also advance (test in Task 11).

---

## File Structure

```
index.html                     app entry, Google Fonts link
vite.config.ts                 Vite + Vitest config (jsdom, TZ)
src/main.ts                    app shell: landing, loading, story wiring
src/route.ts                   dev-route query parser
src/types.ts                   Play, Ranked, YearStats, YearSummary, Season, Traits…
src/ingest/detect.ts           identify a parsed JSON file → kind + human label
src/ingest/extended.ts         extended export JSON → Play[]
src/ingest/account.ts          account export JSON → Play[]
src/ingest/load.ts             File[] (zip or json) → {plays, problems}
src/ingest/worker.ts           Web Worker around load.ts
src/ingest/demo.ts             seeded realistic demo Play[]
src/stats/basics.ts            qualify, local date helpers, totals, top lists
src/stats/time.ts              seasons, weekly, peak week
src/stats/riser.ts             fastest riser
src/stats/readings.ts          traits → personality, fortune, kanji
src/stats/index.ts             computeAllYears
src/journey/stations.ts        station list, isPlayable
src/story/player.ts            story controller + controls
src/story/routemap.ts          route map progress bar
src/story/frame.ts             9:16 scaled frame
src/slides/*.ts                one file per station (13)
src/slides/slides.css          styles ported from the mockups
tests/**/*.test.ts             mirrors src
fixtures/                      tiny hand-written JSON fixtures
```

---

### Task 1: Scaffold and types

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.ts`, `src/types.ts`, `tests/smoke.test.ts`

**Interfaces:**
- Produces (in `src/types.ts`, used by every later task):

```ts
export type Play = { ts: Date; track: string; artist: string; album?: string;
  msPlayed?: number; skipped?: boolean; trackKey: string };
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Ranked = { name: string; artist?: string; plays?: number; minutes?: number };
export type Traits = { variety?: number; loyalty?: number; novelty?: number; nightOwl?: number; skipRate?: number };
export type PersonalityId = 'explorer' | 'devotee' | 'trendsetter' | 'nightowl' | 'surfer' | 'balanced';
export type Personality = { id: PersonalityId; name: string; jp: string; line: string };
export type Fortune = { jp: '大吉'|'中吉'|'小吉'|'吉'|'末吉'|'凶'; en: string };
export type KanjiReading = { kanji: string; meaning: string };
export type SeasonStat = { value: number; topTrack?: Ranked; topArtist?: Ranked; topGenre?: string };
export type YearStats = {
  year: number;
  plays?: number; minutes?: number; daysListened?: number;
  topArtists?: Ranked[]; topTracks?: Ranked[]; topArtistShare?: number;
  seasons?: Record<Season, SeasonStat>;
  weekly?: { start: string; value: number }[];   // start = local Monday 'YYYY-MM-DD'
  peakWeek?: { start: string; value: number };
  fastestRiser?: { artist: string; via: 'race' | 'halves'; days?: number; climb?: number };
  genreShares?: { genre: string; share: number }[]; topGenre?: string;  // Phase 3 fills these
  traits?: Traits; personality?: Personality; fortune?: Fortune; kanji?: KanjiReading;
};
export type YearSummary = { year: number; plays: number; eligible: boolean };
export type Dataset = { years: YearSummary[]; stats: Map<number, YearStats> };
```

- [ ] **Step 1:** `npm init -y`, then `npm i -D vite vitest jsdom typescript` and `npm i fflate`. Add scripts: `"dev": "vite"`, `"build": "tsc --noEmit && vite build"`, `"test": "vitest run"`.
- [ ] **Step 2:** In `vite.config.ts`, set `test: { environment: 'jsdom', env: { TZ: 'Asia/Tokyo' } }` and `base: './'`. Use a strict `tsconfig.json` (`"strict": true`, `"lib": ["ES2022","DOM","WebWorker"]`, `"types": ["vite/client"]`).
- [ ] **Step 3: Write `tests/smoke.test.ts`:** `expect(new Date('2024-12-31T16:00:00Z').getFullYear()).toBe(2025)`. This proves the TZ setting is applied.
- [ ] **Step 4:** Run `npm test`. Expected: 1 passed. Run `npm run build`. Expected: no errors.
- [ ] **Step 5:** `index.html` has `<div id="app">` and the Google Fonts `<link>` copied from `docs/design/subcultures/round-1-gallery.html` line 1. `src/main.ts` renders the text "音楽電車 ONGAKU DENSHA". Check `npm run dev` shows it.
- [ ] **Step 6:** Commit with `chore: scaffold vite + vitest + types`.

---

### Task 2: File detection and JSON adapters

**Files:**
- Create: `src/ingest/detect.ts`, `src/ingest/extended.ts`, `src/ingest/account.ts`
- Create fixtures: `fixtures/extended.json` (6 rows, including 1 podcast row with null track and 1 row with `ms_played: 12000`), `fixtures/account.json` (4 rows)
- Test: `tests/ingest/adapters.test.ts`

**Interfaces:**
- Produces:
  - `detect(json: unknown): { kind: 'extended' | 'account' | 'other'; label: string }`
  - `parseExtended(rows: unknown[]): Play[]`
  - `parseAccount(rows: unknown[]): Play[]`

**Source shapes:**
- Extended rows: `ts` (ISO UTC), `ms_played`, `master_metadata_track_name`, `master_metadata_album_artist_name`, `master_metadata_album_album_name`, `spotify_track_uri`, `skipped`.
- Account rows: `endTime` (`"YYYY-MM-DD HH:mm"`, UTC), `artistName`, `trackName`, `msPlayed`. **Confirm this against the real file when it arrives (spec §15.3).**

- [ ] **Step 1: Write the tests**
  - `parseExtended(fixture)` returns 5 plays (the podcast row is dropped; the short play is **kept**, because filtering happens in stats). `trackKey` equals `spotify_track_uri`. `ts` equals `new Date(row.ts)`.
  - `parseAccount(fixture)` parses `endTime` `'2024-12-31 16:00'` to `Date.UTC(2024,11,31,16,0)`. `trackKey` is `'artist\u0000track'`, lowercased.
  - `detect` returns `{kind:'extended'}` for an array with `ts` + `ms_played`, and `{kind:'account'}` for `endTime` + `msPlayed` + `trackName`.
  - `detect` returns `other` with these labels:
    - object with `playlists` → `"your playlists file"`
    - object with `tracks` → `"your library file"`
    - an array whose rows have `episodeName` → `"your podcast history"`
    - anything else → `"not a listening-history file"`
- [ ] **Step 2:** Run `npx vitest run tests/ingest/adapters.test.ts`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement the three modules. Skip rows that lack a track or artist name, and skip rows whose date doesn't parse. Never throw on a bad row.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(ingest): detect files, parse extended and account exports`.

---

### Task 3: Loader (ZIP + multiple files) and worker

**Files:**
- Create: `src/ingest/load.ts`, `src/ingest/worker.ts`
- Test: `tests/ingest/load.test.ts`

**Interfaces:**
- Consumes: `detect`, `parseExtended`, `parseAccount` (Task 2)
- Produces:
  - `loadFiles(files: {name: string; bytes: Uint8Array}[], onProgress?: (done: number, total: number) => void): { plays: Play[]; problems: string[] }`
  - `loadInWorker(files: File[], onProgress?): Promise<{plays: Play[]; problems: string[]}>` (in `worker.ts`, used from main; Dates are rebuilt from numbers after `postMessage`)

- [ ] **Step 1: Write the tests**
  - A ZIP built in the test with `fflate.zipSync`, containing the extended fixture, `Playlist1.json` and `notes.txt`, gives 5 plays and `problems` equal to `['Playlist1.json: your playlists file — skipped', 'notes.txt: not JSON — skipped']`.
  - Two loose JSON files load together and the plays are concatenated.
  - A JSON file containing `{]` gives a problem `'<name>: couldn't be read — skipped'`, and the other files still load.
  - The same play present in both files (same `ts` + `trackKey`) is kept once.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement `loadFiles` with `fflate.unzipSync` for `.zip`. Parse `.json` entries. Ignore folder entries and `.pdf` files (Spotify's ReadMeFirst) without reporting them. Report any other non-JSON file as `'<name>: not JSON — skipped'`. Decode with `TextDecoder`. Call `onProgress` once per file. Dedupe by `ts.getTime() + trackKey`. `worker.ts` posts `{type:'progress'|'done'}` messages, and `loadInWorker` wraps it in `new Worker(new URL('./worker.ts', import.meta.url), {type:'module'})`.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(ingest): zip/multi-file loader with worker`.

---

### Task 4: Demo data

**Files:**
- Create: `src/ingest/demo.ts`
- Test: `tests/ingest/demo.test.ts`

**Interfaces:**
- Produces: `makeDemoPlays(): Play[]`. It's deterministic, covers years 2024 and 2025, and every `msPlayed` is defined.

**Generator parameters** (seeded PRNG, mulberry32 with seed `20251231`):
- 120 fictional artists with Japanese-flavored names (no real artists), 6 tracks each.
- Artist popularity follows a Zipf distribution with exponent 1.1.
- About 9,000 plays in 2025 and about 4,000 in 2024.
- Play times weighted toward 07–09 h and 20–01 h. Track length is 150–260 s. 12% of plays are skips at 5–29 s.
- One artist (`'Hoshino Rei'`) has no 2024 plays, first appears 2025-05-03, and grows fast enough to be the race riser.

- [ ] **Step 1: Write the tests**
  - Two calls give equal output.
  - The 2025 play count is between 8,000 and 10,000.
  - There's no play for `'Hoshino Rei'` before `2025-05-03` (local).
  - Both years have at least 50 plays of 30 s or more. The riser outcome is checked in Task 9.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement `makeDemoPlays`.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(ingest): seeded demo dataset`.

---

### Task 5: Basic stats

**Files:**
- Create: `src/stats/basics.ts`
- Test: `tests/stats/basics.test.ts` (hand-written `Play[]` built inline with a `p(isoUtc, artist, track, ms?)` helper)

**Interfaces:**
- Produces:
  - `qualifying(plays: Play[]): Play[]`
  - `localYear(d: Date): number`
  - `localDay(d: Date): string` (`'YYYY-MM-DD'`, local)
  - `totals(plays: Play[]): { plays: number; minutes?: number; daysListened: number }`
  - `topN(plays: Play[], by: 'artist' | 'track', n: number): Ranked[]`
  - `hasDurations(plays: Play[]): boolean`

- [ ] **Step 1: Write the tests**
  - `qualifying` drops 29,999 ms and keeps 30,000 ms and undefined.
  - A play at `'2024-12-31T16:00:00Z'` has `localYear` 2025 and `localDay` `'2025-01-01'` (Review Focus 3).
  - `totals` of three 60,000 ms plays on two local days gives `{plays:3, minutes:3, daysListened:2}`. If one play has no `msPlayed`, `minutes` is `undefined`.
  - `topN` ranks by minutes when durations exist, otherwise by plays. Ties break by plays desc, then name asc (Review Focus 4). Track entries have `artist` set. Each entry carries both `plays` and `minutes` (minutes rounded).
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement. Minutes are `Math.round(Σms / 60000)`. Group tracks by `trackKey`, and use the most recent play's `track`/`artist` for display.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(stats): totals and top lists`.

---

### Task 6: Seasons, weekly and peak week

**Files:**
- Create: `src/stats/time.ts`
- Test: `tests/stats/time.test.ts`

**Interfaces:**
- Consumes: `topN`, `localDay`, `hasDurations` (Task 5)
- Produces:
  - `seasonOf(d: Date): Season`
  - `seasons(plays: Play[]): Record<Season, SeasonStat>`
  - `weekly(plays: Play[]): { start: string; value: number }[]`
  - `peakWeek(w: {start: string; value: number}[]): {start: string; value: number} | undefined`

- [ ] **Step 1: Write the tests**
  - Local months 3–5 are spring, 6–8 summer, 9–11 autumn, and 1, 2, 12 winter (spec §5).
  - `seasons` gives each season its `value` (minutes, or plays without durations) and its `topTrack`/`topArtist` from `topN(...,1)`. A season with no plays gets `{value: 0}`.
  - `weekly` keys a play on Wednesday 2025-03-05 (local) to `'2025-03-03'`. Weeks are sorted ascending, and weeks with no plays inside the span are included with value 0.
  - `peakWeek` returns the max, with the earliest week winning ties, and `undefined` for an empty input.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(stats): seasons and weekly peak`.

---

### Task 7: Fastest riser

**Files:**
- Create: `src/stats/riser.ts`
- Test: `tests/stats/riser.test.ts`

**Interfaces:**
- Consumes: `topN`, `hasDurations` (Task 5)
- Produces: `fastestRiser(yearPlays: Play[], firstSeen: Map<string, Date>, coversPriorYears: boolean): YearStats['fastestRiser']`
  - `firstSeen` holds each artist's earliest play across **all** data.
  - `coversPriorYears` is true when the dataset's earliest play is before Jan 1 of this year (local).

**Rule (spec §5):**
1. **Race path** (only when `coversPriorYears`). Candidates are artists that are in the year's final top 10 and whose `firstSeen` falls in this year. Walk the year's plays in time order, keeping cumulative value per artist. A candidate "enters the top 5" at the first play after which fewer than 5 other artists have a strictly greater cumulative value. `days` is the number of whole local days from first play to entry. Pick the fewest days, breaking ties by the higher final rank. Only rank-check on a candidate's own plays (an O(artists) count), so a large history stays fast.
2. **Halves fallback.** Among artists with at least 20 plays in the year, rank by value in local months 1–6 against months 7–12. An artist missing from the first half gets rank (count + 1). `climb = rankH1 − rankH2`. Pick the max climb if it's above 0, breaking ties by name asc.
3. Otherwise return `undefined`.

- [ ] **Step 1: Write the tests**
  - Race: a fixture where `'New'` debuts 2025-03-01 and passes the 5th artist on 2025-03-11 gives `{artist:'New', via:'race', days:10}`.
  - With `coversPriorYears=false` and the same data, the result is `via:'halves'` (Review Focus 1).
  - Halves: an artist ranked 8 in H1 and 1 in H2 gives `climb: 7`.
  - Nothing qualifies → `undefined`.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(stats): fastest riser (race + halves)`.

---

### Task 8: Traits and readings

**Files:**
- Create: `src/stats/readings.ts`
- Test: `tests/stats/readings.test.ts`

**Interfaces:**
- Produces:
  - `traits(yearPlays: Play[], firstSeen: Map<string, Date>, coversPriorYears: boolean, topArtistShare: number): Traits`
  - `personality(t: Traits): Personality`
  - `fortune(t: Traits): Fortune`
  - `kanji(p: PersonalityId, peak: Season): KanjiReading`

**Trait definitions (spec §5):**

| Trait | Definition |
|---|---|
| `variety` | unique artists / plays |
| `loyalty` | `topArtistShare` |
| `novelty` | share of the value from artists whose `firstSeen` is in this year. `undefined` unless `coversPriorYears` |
| `nightOwl` | share of plays with local hour ≥ 22 or < 4 |
| `skipRate` | share with `skipped === true`. `undefined` if no play has a `skipped` field |

**Personality:** score each defined trait as `value / threshold` and pick the highest score that is ≥ 1. Otherwise the personality is `balanced`.

| Trait | Threshold | id | name | jp | line |
|---|---|---|---|---|---|
| variety | 0.25 | explorer | The Explorer | 冒険家 | You never played the same corner of music twice. |
| loyalty | 0.15 | devotee | The Devotee | 推し一筋 | One artist had your whole heart. |
| novelty | 0.40 | trendsetter | The Trendsetter | 先取り | Most of your year was artists you'd only just met. |
| nightOwl | 0.30 | nightowl | The Night Owl | 夜行性 | Your best listening happened after 10 PM. |
| skipRate | 0.30 | surfer | The Channel Surfer | 気まぐれ | Skip, skip, skip, then love. |
| (none) | n/a | balanced | The Balanced | 中庸 | A little of everything, perfectly measured. |

**Fortune** (by novelty):

| Novelty | jp | en |
|---|---|---|
| ≥ 0.5 | 大吉 | Great blessing |
| ≥ 0.35 | 中吉 | Middle blessing |
| ≥ 0.2 | 小吉 | Small blessing |
| ≥ 0.1 | 吉 | Blessing |
| > 0 | 末吉 | Future blessing |
| 0 | 凶 | Curse |
| `undefined` | 吉 | Blessing |

**Kanji** (personality × peak season, where peak season is the one with the highest `value`, with ties going to the earliest of spring/summer/autumn/winter):

| | spring | summer | autumn | winter |
|---|---|---|---|---|
| explorer | 旅 journey | 冒 adventure | 探 search | 道 path |
| devotee | 愛 love | 熱 heat | 縁 bond | 絆 ties |
| trendsetter | 芽 sprout | 閃 flash | 新 new | 先 ahead |
| nightowl | 夢 dream | 夜 night | 月 moon | 星 star |
| surfer | 風 wind | 波 wave | 変 change | 跳 leap |
| balanced | 和 harmony | 陽 sun | 実 fruit | 静 calm |

- [ ] **Step 1: Write the tests**
  - `personality({loyalty:0.3, variety:0.3})` is `devotee` (2.0 beats 1.2).
  - `personality({})` is `balanced`.
  - `fortune({novelty:0.36}).jp` is `'中吉'`, and `fortune({}).jp` is `'吉'`.
  - `kanji('nightowl','summer').kanji` is `'夜'`.
  - `traits` with `coversPriorYears=false` has `novelty` undefined.
  - `nightOwl` counts a play at local 23:30 and not one at 04:00.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement, with the tables above as constants.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(stats): traits, personality, fortune, kanji`.

---

### Task 9: computeAllYears

**Files:**
- Create: `src/stats/index.ts`
- Test: `tests/stats/index.test.ts`

**Interfaces:**
- Consumes: Tasks 5–8
- Produces: `computeAllYears(plays: Play[]): Dataset`
  - `years` lists every local year with plays (newest first), with `eligible = qualifying plays >= 50`.
  - `stats` holds a `YearStats` for **eligible** years only, with `topArtists`/`topTracks` n=5, `topArtistShare` = #1 value / year total value, and the `kanji` peak taken from `seasons`. Genre fields stay undefined in Phase 1.

- [ ] **Step 1: Write the tests**
  - Using `makeDemoPlays()`: 2025 and 2024 are both eligible. `stats.get(2025)!.fastestRiser!.artist` is `'Hoshino Rei'` with `via 'race'`. 2024 has `novelty` undefined (earliest data). `topArtists` has length 5.
  - A dataset of 40 plays gives `years[0].eligible === false` and no stats entry.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement. Compute `firstSeen` and the earliest play once over the qualifying plays.
- [ ] **Step 4:** Run it. Expected: PASS. Then run `npm test`, and all tests should pass.
- [ ] **Step 5:** Commit with `feat(stats): computeAllYears`.

---

### Task 10: Stations and playability

**Files:**
- Create: `src/journey/stations.ts`
- Test: `tests/journey/stations.test.ts`

**Interfaces:**
- Consumes: `YearStats`; slide functions (Tasks 12–14) are referenced by id.
- Produces:

```ts
export type Transition = 'title' | 'ride' | 'cut' | 'phone' | 'tease' | 'baton' | 'breather';
export type Station = { id: string; n: number; act: 1|2|3|4; nameJp: string; nameEn: string;
  needs: (keyof YearStats)[]; transitionIn: Transition; waitForInput?: boolean };
export const STATIONS: Station[];
export function isPlayable(s: Station, stats: YearStats | undefined): boolean;
```

- `STATIONS` holds the 13 rows from spec §6, in order:
  1. `departure`: needs `[]`, `waitForInput: true`
  2. `torii`: `plays`, `daysListened`
  3. `bento`: `genreShares`
  4. `ganguro`: `topGenre`
  5. `sumo`: `topArtists`
  6. `idol`: `topArtists`
  7. `konbini`: `topTracks`
  8. `gacha`: `topTracks`
  9. `weather`: `seasons`
  10. `fuji`: `weekly`, `peakWeek`
  11. `shinkansen`: `fastestRiser`
  12. `omikuji`: `personality`, `fortune`
  13. `kanji`: `kanji`, `topArtists`, `topTracks`

  The `transitionIn` values follow spec §6. Use `'cut'` for match cuts, and `'breather'` for station 9.
- `isPlayable`: every need is defined, and arrays are non-empty.

- [ ] **Step 1: Write the tests**
  - There are 13 stations with `n` going 1…13 in order.
  - Every `needs` key is a real `YearStats` key. Check this against a `keyof` list built from a full sample object in the test, typed `Required<YearStats>`, so a renamed field breaks the build.
  - With the demo 2025 stats, `bento` and `ganguro` are **not** playable (no genres in Phase 1) and the other 11 are playable.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(journey): station list and playability`.

---

### Task 11: Story player, route map and frame

**Files:**
- Create: `src/story/player.ts`, `src/story/routemap.ts`, `src/story/frame.ts`, `src/story/story.css`
- Test: `tests/story/player.test.ts` (jsdom, `vi.useFakeTimers()`)

**Interfaces:**
- Consumes: `STATIONS`, `isPlayable` (Task 10)
- Produces:

```ts
export type SlideContext = { stats?: YearStats; years: YearSummary[]; onPickYear: (y: number) => void };
export type Slide = (ctx: SlideContext) => HTMLElement;
export function createStory(root: HTMLElement, opts: {
  slides: Record<string, Slide>; ctx: SlideContext; startAt?: number; autoAdvanceMs?: number;
}): { next(): void; prev(): void; pause(): void; resume(): void; destroy(): void; readonly index: number };
```

- **Playback order** is the playable stations only. `index` is the station's `n − 1` in `STATIONS`.
- **Route map** shows all 13 stops. Pass-through stops show `通過` and 🔒 and have `title="Unlock with your full listening export"`. The current stop has class `current`.
- **Frame:** a 210×373 box scaled with `transform: scale(min(innerWidth/210, innerHeight/373))`, centered, and updated on `resize`.
- **Controls:**
  - A pointer up within 200 ms is a tap: tap x < ⅓ width → `prev`, otherwise `next`.
  - A press of 200 ms or more pauses, and releasing resumes.
  - `ArrowRight`/`ArrowLeft`/`Space` (pause toggle) work from the keyboard.
  - Pointer events whose target is inside `button, a, input, label` are ignored by the story controls.
  - Auto-advance happens every `autoAdvanceMs` (default 8000), except on `waitForInput` stations.

- [ ] **Step 1: Write the tests**
  - After `createStory` at `startAt: 1` with demo ctx, advancing timers by 8000 moves `index` from 1 (torii) to 4 (sumo), skipping bento and ganguro.
  - The route map has 13 stops, with 2 containing `通過`.
  - On `departure` (index 0), advancing timers by 20000 leaves `index` at 0.
  - The real slides don't exist yet (Tasks 12–14), so use stub slides: `Object.fromEntries(STATIONS.map(s => [s.id, () => Object.assign(document.createElement('div'), {id: s.id})]))`, with one stub containing a `<button>` for the button test.
  - A tap on the left third calls `prev`.
  - A `pointerdown`/`pointerup` on a `<button>` inside the slide doesn't change `index` (Review Focus 5).
  - Holding (pointerdown, then advancing 300 ms, then 8000 ms) doesn't advance.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement. On each station change, clear the old slide and append `slides[id](ctx)` into the frame.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(story): player, route map, scaled frame`.

---

### Tasks 12–14: Slides

**Common rules for all slides:**
- Each slide is `export const <id>: Slide` in `src/slides/<id>.ts`. It returns a `div.ph.<mockup-class>` built from the matching mockup markup (find the `data-choice` id in `docs/design/subcultures/round-*.html`), with the placeholder numbers and names replaced by `ctx.stats` values.
- Copy the mockup's CSS rules for that class into `src/slides/slides.css`, including the `.ph` base from round-1.
- Use `fmt(n) = n.toLocaleString('en-US')` and put it in `src/slides/fmt.ts`.
- Show minutes when they're defined, otherwise plays labeled "plays".
- Ensure `#ff2d95` appears somewhere on each slide.
- Remove the mockup's `onclick="toggleSelect"`.
- **Test each slide:** render it with a hand-built `YearStats` fixture (`tests/slides/fixture.ts`, a full object including genres) and assert the textContent includes the listed values.
- **Visual check:** each slide is checked in the browser through the dev route from Task 15 before its task is committed (`?data=demo&station=<n>`).

### Task 12: Act 1 slides

**Files:** `src/slides/departure.ts`, `torii.ts`, `bento.ts`, `ganguro.ts`, `fmt.ts`, `slides.css`; test: `tests/slides/act1.test.ts`

| Slide | Mockup | Binds | Test asserts |
|---|---|---|---|
| departure | train (round 1), restyled as an LED departure board listing all `ctx.years` | One `<button>` per eligible year showing `year` and `fmt(plays)` plays. Ineligible years are a greyed `<div>` with plays. Click → `ctx.onPickYear(year)` | 2 buttons for demo years; clicking 2025 calls `onPickYear(2025)` |
| torii | torii (round 3) | `daysListened` gates text, minutes/plays | includes `fmt(daysListened)` and the minutes value |
| bento | bento (round 2) | top 4 `genreShares` as % (rest as "OTHER") | includes the first genre and its rounded % |
| ganguro | ganguro (round 1) | `topGenre` | includes `topGenre` upper-cased |

- [ ] Write the tests → run (FAIL) → implement → run (PASS) → visual check → commit with `feat(slides): act 1`.

### Task 13: Act 2 slides

**Files:** `src/slides/sumo.ts`, `idol.ts`, `konbini.ts`, `gacha.ts`; test: `tests/slides/act2.test.ts`

| Slide | Mockup | Binds | Test asserts |
|---|---|---|---|
| sumo | sumo (round 1) | `topArtists[0..4]` as 横綱 / 大関 / 関脇 / 小結 / 前頭 | all 5 names, in order |
| idol | idol (round 1) | `topArtists[0]`, plays, `topArtistShare` as % when defined | name and `Math.round(share*100)+'%'` |
| konbini | konbini (round 2) | `topTracks` rows `name ×plays`, total = year minutes/plays | 5 track names and the total |
| gacha | gacha (round 1) | `topTracks[0].name` and artist | the track name |

- [ ] Write the tests → run (FAIL) → implement → run (PASS) → visual check → commit with `feat(slides): act 2`.

### Task 14: Act 3–4 slides

**Files:** `src/slides/weather.ts`, `fuji.ts`, `shinkansen.ts`, `omikuji.ts`, `kanji.ts`, `index.ts` (the `slides` record of all 13 by id); test: `tests/slides/act34.test.ts`

| Slide | Mockup | Binds | Test asserts |
|---|---|---|---|
| weather | weather (round 1) | 4 season cells (春 夏 秋 冬), each showing `topArtist.name` | all 4 season top artists |
| fuji | fuji (round 3) | An SVG mountain whose top edge is the `weekly` values (normalized polyline), with the peak marked and `peakWeek.start` plus its value | `peakWeek.start` and the value |
| shinkansen | shinkansen (round 3) | riser artist, plus `days` ("0 → top 5 in N days") or `climb` ("up N places") | artist and the race wording |
| omikuji | omikuji (round 1) | `fortune.jp` (vertical), `personality.name`, `jp`, `line` | `fortune.jp` and `personality.name` |
| kanji | kanji (round 2) | `kanji.kanji`, `kanji.meaning`, minutes/plays, #1 artist, #1 track | all 5 values |

- [ ] Write the tests (also check that `slides` has exactly the 13 `STATIONS` ids) → run (FAIL) → implement → run (PASS) → visual check → commit with `feat(slides): acts 3-4`.

---

### Task 15: App shell and dev route

**Files:**
- Modify: `src/main.ts`, `index.html`
- Create: `src/route.ts` (`parseRoute`, kept apart so tests don't boot the app), `src/app.css`
- Test: `tests/route.test.ts`

**Interfaces:**
- Consumes: `loadInWorker`, `makeDemoPlays`, `computeAllYears`, `createStory`, `slides`

**Flow:**
1. **Landing:** the title 音楽電車 ONGAKU DENSHA, a **"Try the demo"** button, and a **file picker / drop zone** ("Drop your listening-history ZIP or JSON files. They never leave your device.").
2. **Loading:** a progress bar from `onProgress`, then `computeAllYears`.
3. **No eligible year:** a message naming the year counts, plus the `problems` list. Otherwise the story starts at `departure`. `onPickYear` rebuilds ctx with that year's stats and continues to the next playable station after `departure`.
4. **Problems** (skipped files) show as a dismissible note on the landing/story.
5. **Dev route:** `?data=demo&station=N&year=YYYY` skips the landing and opens straight at station N.

- [ ] **Step 1: Write the tests**
  - `parseRoute('?data=demo&station=7&year=2025')` returns `{data:'demo', station:7, year:2025}`.
  - It returns `{}` for no query.
  - `station=99` is ignored.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement `parseRoute(search: string): {data?: 'demo'; station?: number; year?: number}` in `src/route.ts` (`station` is accepted only in 1–13), then the flow above in `src/main.ts`.
- [ ] **Step 4:** Run `npm test`. All tests should pass. Then run `npm run build`. Expected: success.
- [ ] **Step 5: Browser check**
  - Run `npm run dev`. Run the demo through all 11 playable stations at a 375×812 viewport and at desktop size.
  - Drop `fixtures/extended.json` and confirm the "no eligible year" message.
  - Drop a ZIP with a playlists file and confirm the skipped-file note.
  - If the real export has arrived: drop it, and confirm the numbers look plausible against the Spotify app.
- [ ] **Step 6:** Commit with `feat: landing, loading, story wiring, dev route`.
