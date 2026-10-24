# Ongaku Densha Phase 2a (The Journey, Flat) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Phase-1 tap-through slides into a journey that flows. Each station plays in beats; stations connect through rides, match cuts, phone interrupts and teases; the gyaru guide, the season shift, the stamped ticket and your soundtrack run through all of it. Still flat 2D: the Three.js world comes in Phase 2b, behind this.

**Architecture:**
- **Beats are declarative.** Slides mark elements with `data-beat` (order) and `data-fx` (how it enters). One `playBeats()` turns those marks into a GSAP timeline. Slides stay plain functions.
- **Transitions are a small table:** `runTransition(type, out, in, ctx)` returns a GSAP timeline per type. Match cuts read selector pairs from the station list.
- **The player runs** transition → beats → hold, then advances. A tap mid-animation finishes it; a tap on a finished station moves on.

**Tech Stack:** Phase 1 stack + GSAP 3 (`gsap`). Audio is plain `HTMLAudioElement` ×2 crossfading. Previews come from the iTunes Search API, checked 2026-10-24: browser fetch works, 30 s `.m4a` loads.

**Spec:** [docs/superpowers/specs/2026-10-24-ongaku-densha-design.md](../specs/2026-10-24-ongaku-densha-design.md) §6 (journey), §8 (look/voice), §10 (audio). Storyboard: [docs/design/journey-storyboard.html](../../design/journey-storyboard.html).

**Branch:** `phase-2a-journey` (from `phase-1-data-core`).

## Global Constraints

- Every Phase 1 constraint still holds: real numbers only, files stay on device, no Spotify name or logo, `#ff2d95` on every station.
- `prefers-reduced-motion: reduce`: every transition becomes a 200 ms crossfade, beats show instantly, and there are no particles.
- Station hold after its beats finish is `2500` ms. The earlier 8000 ms flat timer goes away.
- Taps: mid-transition or mid-beats, a tap **finishes** the animation instantly. On a finished station, right = next and left = previous. Previous never plays a transition (instant cut).
- Hold-to-pause pauses the running timeline and the music.
- Sound starts only after a user gesture: picking a year on the departure board is that gesture. A mute toggle is always visible.
- Only artist and track names go to iTunes. Nothing else leaves the device.
- Text from data is always escaped (`esc()`), including the hook lines once a name is interpolated.

## Review Focus

1. **A match cut whose neighbour was passed through** (e.g. torii → sumo because bento is 通過). Expected: it falls back to a ride and never animates from a missing element (test in Task 4).
2. **Tapping repeatedly during a transition.** Expected: the transition finishes, no double-advance, and no orphaned outgoing slide stays in the DOM (test in Task 5).
3. **iTunes returns nothing, the wrong artist, or the network fails.** Expected: that station is silent, the previous song fades out, and the story never waits on the network (test in Task 7).
4. **Reduced motion.** Expected: the whole story is usable, with no movement beyond fades (test in Tasks 1 and 4).
5. **Leaving and re-entering a story** (pick another year). Expected: the old timelines, timers and audio stop, so there's no music from the previous ride (test in Task 7).

---

## File Structure

```
src/journey/beats.ts        playBeats(el) → timeline from data-beat/data-fx
src/journey/transitions.ts  runTransition(type, out, in, opts) → timeline
src/journey/hooks.ts        HOOKS: station id → { jp, en }
src/journey/stations.ts     + cut selector pairs, song choice per station
src/story/guide.ts          the gyaru phone bar (shows the hook)
src/story/ticket.ts         the ticket that gets stamped per station
src/story/season.ts         act → season class + particle layer
src/story/player.ts         orchestration: transition → beats → hold
src/audio/previews.ts       findPreview(artist, track) via iTunes, cached
src/audio/soundtrack.ts     two-player crossfade, mute, stop
src/slides/*.ts             add data-beat/data-fx marks
src/stats/index.ts          + soundtrack picks in YearStats
```

---

### Task 1: Beat runner

**Files:**
- Create: `src/journey/beats.ts`
- Modify: `package.json` (`npm i gsap`)
- Test: `tests/journey/beats.test.ts`

**Interfaces:**
- Produces: `playBeats(root: HTMLElement, opts?: { reduced?: boolean }): gsap.core.Timeline` (paused, not yet played) and `prefersReducedMotion(): boolean`. It's true for the `(prefers-reduced-motion: reduce)` media query **or** a `?reduced=1` URL parameter, which Task 8 uses for testing; test both.

**Beat marks:**
- `data-beat="N"`: elements sharing N start together; groups play in ascending N, 0.35 s apart.
- `data-fx` values:

| fx | Effect |
|---|---|
| `rise` (default) | y 24 → 0, opacity 0 → 1, 0.5 s |
| `stamp` | scale 2.2 → 1, rotation −12 → 0, opacity 0 → 1, 0.35 s, `back.out` |
| `drop` | y −60 → 0, 0.5 s, `bounce.out` |
| `type` | children appear one at a time, 0.12 s each (receipt rows) |
| `count` | text counts from 0 to `data-count`, formatted with `fmt()`, 1.2 s, `power2.out`; a `data-suffix` is appended |
| `flash` | white overlay from opacity 1 to 0, 0.6 s (gacha) |
| `hide` | starts hidden and stays hidden until the group's turn (Yokozuna slot) |

- [ ] **Step 1: Write the tests** (jsdom; drive with `tl.progress(1)`)
  - After `progress(1)`, every `[data-beat]` element has opacity `'1'`.
  - A `count` element with `data-count="28243"` and `data-suffix=" min"` ends with text `'28,243 min'`.
  - At `progress(0)`, group 2 is still opacity `'0'`. Groups play in numeric, not string, order (beat 10 after beat 2).
  - `playBeats(el, {reduced:true}).duration()` is `0` and everything is visible.
  - An element with no `data-beat` is untouched.
- [ ] **Step 2:** Run `npx vitest run tests/journey/beats.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement with `gsap.timeline({paused:true})`, adding each group at `index * 0.35`.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(journey): declarative beat runner`.

---

### Task 2: Choreograph all 13 slides

**Files:**
- Modify: `src/slides/*.ts` (13 files), `src/slides/slides.css` (gacha flash overlay, gate stagger)
- Test: `tests/slides/beats.test.ts`

Choreography follows the storyboard. Beat numbers are listed in order:

| Station | Beats |
|---|---|
| departure | 1 header `rise`; 2 board rows `type`; 3 footer `rise` |
| torii | 1–5 gates `rise` (one beat each, nearest gate last); 6 `千本鳥居` `stamp`; 7 days `count`; 8 minutes pill `count` |
| bento | 1 header; 2 box `drop`; 3 each cell's % `count` |
| ganguro | 1 hair `stamp`; 2 eyes `rise`; 3 genre `stamp` |
| sumo | 1 header; 2 前頭 → 3 小結 → 4 関脇 → 5 大関, each `stamp`; 6 横綱 `hide`+`stamp` (last, held back) |
| idol | 1 photo `drop`; 2 name `stamp`; 3 penlights `rise`; 4 plays/minutes `count` |
| konbini | 1 header; 2 rows `type`; 3 total `count`; 4 barcode `rise` |
| gacha | 1 label; 2 `flash`; 3 card `stamp`; 4 song name `rise`; 5 stars `type` |
| weather | 1 bar; 2 map `rise`; 3 the four seasons `type` |
| fuji | 1 title; 2 mountain `rise`; 3 peak dot `stamp`; 4 caption with value `count` |
| shinkansen | 1 title; 2 train `rise` (from x 200, `power4.out`); 3 artist `stamp`; 4 line `rise` |
| omikuji | 1 slip `drop`; 2 fortune `stamp`; 3 personality `rise` |
| kanji | 1 header; 2 kanji `stamp`; 3 meaning `rise`; 4 summary rows `type` |

- [ ] **Step 1: Write the tests** (render each slide with the Phase-1 `ctx()` fixture)
  - Every slide has at least 2 distinct beat groups.
  - The sumo `横綱` element has the highest beat number and `data-fx` containing `hide`.
  - Every visible number that is a stat (torii days and minutes, konbini total, idol plays, fuji value) is a `count` whose `data-count` equals the fixture value.
  - After `playBeats(slide).progress(1)`, the textContent still contains every value the Phase-1 slide tests assert (Phase-1 slide tests stay green).
- [ ] **Step 2:** Run `npx vitest run tests/slides`. Expected: FAIL on the beat assertions.
- [ ] **Step 3:** Add the marks. Change markup only where an element needs its own wrapper to be a beat.
- [ ] **Step 4:** Run `npx vitest run`. Expected: all PASS.
- [ ] **Step 5:** Commit with `feat(slides): choreograph beats per storyboard`.

---

### Task 3: Hooks and the gyaru guide

**Files:**
- Create: `src/journey/hooks.ts`, `src/story/guide.ts`
- Modify: `src/story/story.css`
- Test: `tests/story/guide.test.ts`

**Interfaces:**
- Produces: `HOOKS: Record<string, { jp: string; en: string }>` and `createGuide(): { el: HTMLElement; say(id: string): gsap.core.Timeline; clear(): void }`

**Copy** (written directly in gyaru-moji; a `garble()` function isn't needed for fixed lines):

| id | jp | en |
|---|---|---|
| departure | 乗った?? ぃくょ〜☆ | On board?? Let's gooo |
| torii | まずゎ… ぁんたが聴ぃた日数ねっ | First up… the days you listened |
| bento | ぉ弁当の中身、見ちゃぉ♡ | Let's peek inside your music bento |
| ganguro | ちょ待って、1位のジャンルゎ…!! | Wait wait, your #1 genre is…!! |
| sumo | 番付発表〜!! 横綱ゎまだ秘密 | The rankings! Grand champion stays secret |
| idol | 横綱ゎ… ぁんたの推しでしょ? | The champion… it's your oshi, right? |
| konbini | 深夜のコンビニでレシート出たょ | 2 AM konbini, here's your receipt |
| gacha | 1回引けるょ… SSRきて〜!! | One pull… come on, SSR!! |
| weather | ちょっと休憩〜 季節ふりかぇろ | Little break~ let's look back at the seasons |
| fuji | ぃちばん高ぃとこ、どこだった? | Where was your highest peak? |
| shinkansen | この子、速すぎ…!! | This one rose way too fast…!! |
| omikuji | ぉみくじ引こ♡ 来年の運勢ゎ… | Draw a fortune♡ next year's luck… |
| kanji | 今年の漢字… せーのっ!! | Your kanji of the year… ready, set!! |

**Guide:** a flip-phone bar fixed at the bottom of the story (outside the scaled frame), styled like the keitai mockup (pink body, dark screen, DotGothic16). `say(id)` types the jp line at 0.04 s per character, then fades in the en subtitle underneath.

- [ ] **Step 1: Write the tests**
  - `HOOKS` has exactly the 13 station ids.
  - After `say('sumo').progress(1)`, the guide's text contains both lines.
  - `say('unknown')` produces an empty, zero-length timeline and doesn't throw.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(story): gyaru guide and hook lines`.

---

### Task 4: Transitions

**Files:**
- Create: `src/journey/transitions.ts`
- Modify: `src/journey/stations.ts` (add `cut?: { from: string; to: string }`), `src/story/story.css`
- Test: `tests/journey/transitions.test.ts`

**Interfaces:**
- Consumes: `Station`, `Transition` (Phase 1), `createGuide` (Task 3)
- Produces: `runTransition(type: Transition, out: HTMLElement | null, inEl: HTMLElement, o: { stage: HTMLElement; cut?: {from: string; to: string}; hook?: {jp: string; en: string}; reduced?: boolean }): gsap.core.Timeline`

`stage` is the frame. Both slides are absolutely stacked inside it during the transition, and `out` is removed when the timeline completes.

**Types:**

| type | Effect | Duration |
|---|---|---|
| `title` | inEl fades in | 0.4 s |
| `ride` | out slides x 0 → −100% and in slides 100% → 0, with a speed-lines overlay (`.speed`, repeating-linear-gradient, opacity pulse) | 0.9 s |
| `cut` | Clone `out.querySelector(cut.from)` at its frame position, then tween the clone's box to `inEl.querySelector(cut.to)`'s box while out fades and in fades in; remove the clone. Box positions are read with `getBoundingClientRect()` and divided by the frame's scale | 0.8 s |
| `baton` | same as `cut` (konbini lottery ticket → gacha card) | 0.8 s |
| `phone` | A big flip phone (`.bigphone`) slams up over `out` (y 100% → 0, `back.out`) showing `hook.jp`, jitters (x ±6px, 6 repeats, 0.04 s); then out is removed, the phone drops away and `in` is revealed | 1.4 s |
| `tease` | Black card with `hook.en` typed out, held 0.6 s, then fades to `in` | 1.4 s |
| `breather` | out fades; a "train window" panel (`.window`) scrolls a horizon strip for 2.2 s with no data; then `in` fades in | 2.8 s |

**Cut pairs** go on the stations list:

| Station | cut |
|---|---|
| bento | `{ from: '.tor .g:last-of-type', to: '.ben .box' }` (gate beam → bento lid) |
| konbini | `{ from: '.idol .pen', to: '.kon .rc' }` (penlights → konbini lights) |
| gacha | `{ from: '.kon .bc', to: '.gac .card' }` (receipt lottery → gacha card) |
| shinkansen | `{ from: '.fuji svg', to: '.shk .nose' }` (slope → nose) |

**Fallback rule:** `cut`/`baton` falls back to `ride` when `out` is null or either selector finds nothing (Review Focus 1). With `reduced`, every type is a 0.2 s crossfade.

- [ ] **Step 1: Write the tests**
  - For each type, after `progress(1)` the stage contains only `inEl` (out removed, no clones, no overlays) and `inEl` opacity is `'1'`.
  - `cut` with a missing selector has the same duration as `ride` (fallback).
  - `phone` puts `hook.jp` into the DOM during the run (progress 0.5).
  - Reduced: every type's duration is `0.2`.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(journey): ride, match cut, phone, tease, breather transitions`.

---

### Task 5: Player orchestration

**Files:**
- Modify: `src/story/player.ts`, `tests/story/player.test.ts`

**Interfaces:**
- Consumes: `playBeats`, `runTransition`, `createGuide`, `HOOKS`
- `createStory` keeps its signature. `autoAdvanceMs` is replaced by `holdMs` (default `2500`). It gains `reduced?: boolean`, which defaults to `prefersReducedMotion()`.

**Flow on `next()` to station S:**
1. `guide.say(S.id)` (skipped when S's transition is `phone` or `tease`, which show the hook themselves)
2. `runTransition(S.transitionIn, current, newSlide, …)`
3. `playBeats(newSlide)`
4. After `holdMs`, auto-advance (unless `waitForInput`)

These play as one master timeline. `prev()` shows the previous playable station instantly, fully built (beats at progress 1, no transition).

**Taps:** while the master timeline is active, a tap calls `master.progress(1)` and nothing else. A tap after it finished navigates. Hold pauses the master timeline and the hold timer.

- [ ] **Step 1: Update and extend the tests**
  - Existing tests switch to `holdMs` and advance timers past the master duration. For stub slides with no beats, the duration is that of the transition.
  - The first tap during a transition finishes it: `index` unchanged, only one slide in the frame.
  - A second tap moves to the next station.
  - Ten rapid taps during a transition move at most one station and leave exactly one slide in the frame (Review Focus 2).
  - `prev()` lands with every beat visible.
  - Hold pauses (master `.paused()` is true); release resumes.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx vitest run`. Expected: all PASS.
- [ ] **Step 5:** Commit with `feat(story): transition → beats → hold orchestration`.

---

### Task 6: Season shift, train on the route map, stamped ticket

**Files:**
- Create: `src/story/season.ts`, `src/story/ticket.ts`
- Modify: `src/story/player.ts`, `src/story/routemap.ts`, `src/story/story.css`
- Test: `tests/story/journey-threads.test.ts`

**Interfaces:**
- Produces:
  - `seasonFor(act: 1|2|3|4): 'spring'|'summer'|'autumn'|'winter'`
  - `createSeason(root): { set(act): void; destroy(): void }`
  - `createTicket(stations: Station[], playable: boolean[]): { el; stamp(index): gsap.core.Timeline; finale(): gsap.core.Timeline }`

**Seasons:**
- The story root gets a `season-<name>` class. The background gradient tweens per season (CSS transition, 1.2 s):

| Season | Gradient |
|---|---|
| spring | `#ffd6e8 → #2a1030` |
| summer | `#ff9a3d → #2a0d00` |
| autumn | `#b8461f → #1c0a04` |
| winter | `#1a1f4a → #05060f` |

- The particle layer is 14 `<i>` with CSS keyframes: 🌸 fall (spring), shimmer dots rise (summer), 🍁 fall-and-spin (autumn), ❄ fall (winter). There are none when reduced.

**Route map:** a 🚃 marker moves along the line to the current stop (left %, CSS transition 0.9 s).

**Ticket:**
- A small paper ticket (kippu) pinned top-right below the route map, with 13 slots.
- `stamp(i)` fires on arriving at each playable station: a red circle with the station's `nameJp` first character, `stamp` fx.
- Passed-through stations print `通過`.
- On the `kanji` station, `finale()` moves the ticket into the lower half of the screen beside the kanji card, at full size.

- [ ] **Step 1: Write the tests**
  - `seasonFor` returns spring, summer, autumn, winter for acts 1–4.
  - Arriving at sumo (act 2) sets `season-summer` on the root.
  - After riding torii → sumo → idol, the ticket shows 4 stamps (departure + 3), and the bento and ganguro slots read `通過`.
  - The route map's train marker sits at the current stop's index.
  - Reduced motion leaves the particle layer empty.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(story): seasons, route-map train, stamped ticket`.

---

### Task 7: Soundtrack

**Files:**
- Create: `src/audio/previews.ts`, `src/audio/soundtrack.ts`
- Modify: `src/types.ts`, `src/stats/index.ts`, `src/journey/stations.ts`, `src/story/player.ts`, `src/main.ts`
- Test: `tests/audio/previews.test.ts`, `tests/audio/soundtrack.test.ts`, plus one case in `tests/stats/index.test.ts`

**Interfaces:**
- `YearStats.soundtrack?: { top?: Ranked; topArtistTrack?: Ranked; riserTrack?: Ranked }`
  - `top` = topTracks[0]
  - `topArtistTrack` = the #1 artist's most-played track
  - `riserTrack` = the riser's most-played track this year
- `Station.song?: 'top' | 'topArtistTrack' | 'riserTrack'`. A station without `song` keeps the current music playing.
  - departure, torii, gacha, kanji → `top`
  - idol → `topArtistTrack`
  - shinkansen → `riserTrack`
- `findPreview(artist: string, track: string, fetcher = fetch): Promise<string | undefined>`
  - GET `https://itunes.apple.com/search?term=<encodeURIComponent(artist + ' ' + track)>&entity=song&limit=5`
  - Pick the first result whose `artistName` (case-insensitive) contains or equals `artist`. Otherwise `undefined`.
  - Cache by `artist\0track` in a module Map. Any network or JSON error resolves `undefined`.
- `createSoundtrack(make = () => new Audio()): { unlock(): void; play(url?: string): void; mute(on: boolean): void; stop(): void; pause(): void; resume(): void; readonly muted: boolean }`. Before `unlock()`, `play()` only remembers the URL; `unlock()` starts it.
  - Two players. `play(url)` crossfades over 1.0 s (volume tweens) to `url`. `play(undefined)` fades the current song to silence.
  - The player only starts after `unlock()`, which is called from the year pick (the gesture).

**Wiring:**
- The player calls `soundtrack.play(url)` when entering a station that has a `song`. It resolves the URL with `findPreview` but **never awaits it before the transition**: if the lookup resolves later and the rider is still on that station, it starts then.
- `destroy()` calls `soundtrack.stop()`.
- Mute is a 🔊/🔇 button in the guide bar. It persists in `localStorage`, wrapped in try/catch.

**Demo:** demo artists are fictional, so every lookup misses and the demo is silent (see the open question).

- [ ] **Step 1: Write the tests**
  - `findPreview` with a fake fetcher returning a matching result gives its `previewUrl`.
  - A non-matching artist gives `undefined`.
  - A rejected fetch gives `undefined`.
  - A second call with the same pair doesn't fetch again.
  - `soundtrack`: `play(a)` then `play(b)` leaves player A fading to 0 and B at volume 1 after fake timers advance (fake Audio objects).
  - `stop()` pauses both players.
  - `mute(true)` sets both volumes to 0 and is remembered.
  - Stats: demo 2025 `soundtrack.riserTrack.artist` is `'Hoshino Rei'`, and `topArtistTrack.artist` equals `topArtists[0].name`.
  - Player: destroying a story calls `stop()` on its soundtrack (Review Focus 5).
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx vitest run`. Expected: all PASS.
- [ ] **Step 5:** Commit with `feat(audio): iTunes previews with crossfading soundtrack`.

---

### Task 8: Ride it in the browser

- [ ] Run the dev server and ride the demo from the departure board to the kanji card at 375×812, without tapping (auto-advance only). Check each transition type appears where the storyboard says.
- [ ] Ride again tapping fast. Check there's no stuck overlay, no double slide, and the ticket stamps line up with the stations.
- [ ] Load the test ZIP made of real-artist plays (generated into `.superpowers/`, git-ignored) and confirm music starts after the year pick, crossfades at idol and shinkansen, and mute works.
- [ ] Emulate reduced motion (DevTools rendering setting, or `matchMedia` override via a query param `?reduced=1` that `prefersReducedMotion()` also honours). Check the story is fades only.
- [ ] Check the console has no errors. Then `npm run build`.
- [ ] Commit any fixes with `fix: polish from ride-through`.

## Open question for the project owner

**The demo is silent:** its artists are fictional, so iTunes finds nothing. Should the demo switch to real artists, so first-time visitors hear music? Real artists would mean invented listening numbers attached to real people's names, inside an obviously labelled demo. Until you decide, the demo stays fictional and silent.
