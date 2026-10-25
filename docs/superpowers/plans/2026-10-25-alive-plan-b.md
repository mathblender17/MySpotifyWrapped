# Alive Plan B: Touch the Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give stations one touch interaction each, made from the year's real data.

**Architecture:**
- **A touch kit.** The player gives each station a small kit with five tools:
  - freeze the hold while in use;
  - play a song over the mix;
  - sound accents;
  - haptics;
  - mark a touchable element.
- **One registry.** A registry in `src/touch/` maps station ids to `attach(el, kit)` functions. The player calls the right one after building a slide.
- **Gestures.** Touchable elements count as interactive, so they never navigate or swipe the ride. Each interaction animates with GSAP; under reduced motion, every duration is 0.

**Tech Stack:** Vite 8, TypeScript, GSAP 3.15, Vitest 5 + jsdom.

**Spec:** [docs/superpowers/specs/2026-10-25-alive-ride-design.md](../specs/2026-10-25-alive-ride-design.md) §5, with §2 for songs played by touch and §8 for acceptance.

## Global Constraints

- One interaction per station, using only that station's real data. Bento's only works when genres exist.
- **Discoverability:** a small pulsing dot marks the touchable element and goes away after the first touch on that card.
- **Hold:** freezes while an interaction is in use, then continues; it never restarts.
- **Targets:** at least 48 CSS px on screen. At the 375×667 scale (k ≈ 1.26), that is ≥ 38 design px.
- **Placement:** targets sit inside the card, away from the control strip.
- **Reduced motion:** the interaction still works; its animation is instant.
- **Fallback:** if an interaction can't run (missing data), the card behaves as today.
- **Songs played by touch** play over the mix. When one ends, the mix resumes with its next track (§2). A pending mix lookup never overrides it.
- **Network:** only the artist and track name leave the device.

## Review Focus

1. **Touch vs ride gestures:** a tap or drag on a touchable element must never navigate, swipe or pause the ride. A tap next to it must still navigate.
2. **Hold accounting:** an interaction that starts and ends during the arrival animation, or while paused, must not lose or double the hold. Two quick touches must not leave the hold frozen.
3. **Missing data:** missing data for a station's interaction (no `plays`, no `weekly`, a track without `artist`, no genres) shows the card exactly as today. No dot, no throw.
4. **Leaving mid-interaction:** a touched song, then Next straight away. The next station's song (or the mix) takes over, and nothing touched keeps playing over it.
5. **Drag interactions on iOS Safari** (weather sun, Fuji ridge) need `touch-action: none` on the target. Otherwise the page or the swipe takes the gesture.

## Rulings made in this plan

- **Ganguro has no interaction in this plan.** Spec §5 says the flip phone opens to "the top genre's #1 artist". `YearStats` has no genre → artist link until the Last.fm enrichment exists. It's added with that work. Cost: one station without touch until then.
- **Konbini and Bento use the whole receipt or table as one target.** Their rows are about 14 design px tall, far below 48 px. Each tap acts on the next row in turn (1 → 5, then wraps). Cost: you can't pick a row directly.
- **Omikuji gets a new omikuji box element** (`.kuji`, 44×44 design px) as its tap target. The slide has no box today.
- **Kanji's target is the dock ticket**, which lives outside the slide. The kit can mark it, since the player owns the ticket.

---

### Task 1: The touch kit and player wiring

**Files:**
- Create: `src/touch/kit.ts`, `src/touch/index.ts`
- Modify: `src/story/player.ts`, `src/story/story.css`
- Test: `tests/touch/kit.test.ts`, `tests/story/player.test.ts`

**Interfaces:**
- Produces, in `src/touch/kit.ts`:

  ```ts
  export type TouchKit = {
    stats: YearStats;
    reduced: boolean;
    /** Freeze the card's hold until the returned release is called (counted: overlapping uses nest). */
    busy(): () => void;
    /** Play a track's preview over the mix; resolves true when a preview was found and started. */
    playTrack(t: Ranked): Promise<boolean>;
    sfx: Sfx;
    buzz(p: number | number[]): void;
    /** Make `target` touchable: data-touch, a pulsing dot, never a ride gesture. */
    mark(target: Element): void;
    /** Seconds → 0 under reduced motion. */
    dur(s: number): number;
  };
  ```

- Produces, in `src/touch/index.ts`: `export const TOUCH: Partial<Record<string, (el: HTMLElement, kit: TouchKit) => void>>`. It starts empty; Tasks 2–6 fill it.
- **Player changes:**
  - `INTERACTIVE` gains `[data-touch]`.
  - After building a slide, the player calls `TOUCH[s.id]?.(el, kit)`.
  - The kit's `busy()` increments a counter and calls `freezeHold()`. Release decrements it, and when the counter reaches 0 and the story isn't paused, it re-arms the hold with what's left.
  - `armHold` doesn't arm while busy > 0.
  - `playTrack` shares the station cue's guard. It bumps `cueId`, so a pending mix lookup can't override it, and it sets `musicOn`.
- **The dot:** `mark()` appends `<i class="touch-dot" aria-hidden="true">` inside the target. The first `pointerdown` on any `[data-touch]` in the card removes every `.touch-dot` in that card.

- [ ] **Step 1: Write the failing tests.**
  - `test('a marked element is interactive: tapping it never moves the ride, tapping beside it still does')`
  - `test('busy freezes the hold and release continues it; nested uses need both releases')`: holdMs 3000. Advance 1000, take `r1 = busy()` and `r2 = busy()`, advance 10000 (still here), call `r1()`, advance 10000 (still here), call `r2()`, then expect the ride to move on within 2100 ms.
  - `test('the first touch removes the card\'s dots')`
  - `test('playTrack plays over the mix and a late mix lookup does not override it')`
  - `test('a station without a touch entry, or whose attach throws, still shows its card')`: `TOUCH.sumo` throws; the card renders and holds as usual. The player wraps `attach` in try/catch.
- [ ] **Step 2: Run the tests to make sure they fail.** Run: `npx vitest run tests/touch tests/story/player.test.ts`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** the kit, the registry and the player wiring. Add CSS:
  - `.touch-dot`: a 10 px `#ff2d95` dot at the target's top-right, with a 1.2 s scale pulse (off under `.reduced`).
  - `[data-touch] { cursor: pointer; touch-action: none; }`
- [ ] **Step 4: Run the tests to make sure they pass.** Run `npx vitest run` → green. Run `npx tsc --noEmit -p .` → 0 errors.
- [ ] **Step 5: Commit** with the message `feat(touch): touch kit — interactive marks, hold freeze, songs over the mix`.

### Task 2: Simple taps (Torii, Sumo, Departure)

**Files:**
- Create: `src/touch/act1.ts` (torii, departure) and `src/touch/sumo.ts`
- Modify: `src/touch/index.ts`, `src/slides/worlds/c.css`, `src/slides/worlds/d.css`, `src/slides/worlds/f.css`
- Test: `tests/touch/simple.test.ts`

**Interfaces:**
- Consumes: `TouchKit` and `TOUCH` from Task 1.
- **Torii:** marks `.hero`. A tap re-runs the count from 0 to `daysListened` over `dur(1.2)`, and toggles `.band` between minutes and hours (`fmt(Math.round(min / 60))` + ` hours`). It does nothing to `.band` when `minutes` is undefined.
- **Sumo:** marks `.pa` and `.pb` (each about 90×60 design px).
  - A tap adds `.zoom` to that panel: scale to fill the panel row, with the minutes of that panel's first artist (or plays, when there are no minutes) stamped in a `.mins` badge.
  - It plays `sfx.don()` and `buzz(10)`.
  - A second tap, or a tap on the other panel, un-zooms.
  - The kit is busy while a panel is zoomed.
- **Departure:** year buttons get `:active` press styling (CSS only) and `buzz(10)` on `pointerdown`. They're already buttons, so `mark()` isn't used.

- [ ] **Step 1: Write the failing tests.**
  - `test('torii: tapping the number recounts it and flips the band between minutes and hours')`
  - `test('torii: no minutes → the band never flips')`
  - `test('sumo: tapping a rank panel zooms it with that artist\'s minutes and a ドン; tapping again closes it')`, using a fake kit that records `sfx.don`, `busy` and release calls.
  - `test('departure: pressing an eligible year buzzes')`
- [ ] **Step 2: Run the tests to make sure they fail.** Run: `npx vitest run tests/touch/simple.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the three interactions and their CSS.
- [ ] **Step 4: Run the tests to make sure they pass.** Run `npx vitest run` → green.
- [ ] **Step 5: Commit** with the message `feat(touch): torii recount, sumo panel zoom, departure press`.

### Task 3: Songs (Oshi, Konbini)

**Files:**
- Create: `src/touch/songs.ts`
- Modify: `src/touch/index.ts`, `src/slides/worlds/q.css`, `src/slides/worlds/b.css`
- Test: `tests/touch/songs.test.ts`

**Interfaces:**
- **Oshi:** marks `.cover`.
  - A tap calls `playTrack(stats.soundtrack.topArtistTrack)`. On `true`, it shows a `.now` sticker "♪ now playing" for `dur(2.5)` s.
  - If `topArtistTrack` is missing or has no `artist`, the cover isn't marked.
- **Konbini:** marks `.rc` (the whole receipt).
  - Each tap plays the next of `topTracks` (1 → 5, then wraps), and stamps that line's `.r` with a `.now` 再生中 mark. Only one line is stamped at a time.
  - Tracks without an `artist` are skipped.
  - If no track has an artist, the receipt isn't marked.

- [ ] **Step 1: Write the failing tests.**
  - `test('oshi: tapping the cover plays the #1 artist\'s song and shows now playing')`
  - `test('oshi: no artist song → no mark')`
  - `test('konbini: each tap plays the next song on the receipt and stamps its line')`
  - `test('konbini: a song with no preview leaves the line unstamped and the next tap moves on')`
- [ ] **Step 2: Run the tests to make sure they fail.** Run: `npx vitest run tests/touch/songs.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests to make sure they pass.** Run `npx vitest run` → green.
- [ ] **Step 5: Commit** with the message `feat(touch): play your oshi's song and receipt songs by touch`.

### Task 4: Reveals (Gacha, Shinkansen, Omikuji)

**Files:**
- Create: `src/touch/reveals.ts`
- Modify: `src/touch/index.ts`, `src/audio/sfx.ts` (add `rumble()`), `src/slides/omikuji.ts` (`.kuji` box), and `src/slides/worlds/{k,l,i}.css`
- Test: `tests/touch/reveals.test.ts`, `tests/audio/sfx.test.ts`

**Interfaces:**
- **New sound:** `Sfx.rumble(): void`. A low noise burst: a 60 Hz sine plus filtered noise, 0.8 s, with the same −18 dB level and `canPlay` rule as the other accents.
- **Gacha:** marks `.k-win.card`. Each tap pulls the next of `topTracks[1..4]`:
  - The card content swaps to that song, artist and a rarity label: `SR`, `R`, `R`, `N` for #2–#5.
  - It plays `sfx.blip()` and `buzz(10)`.
  - After #5, the next tap returns to the SSR (#1).
  - It doesn't mark the card when fewer than 2 tracks exist.
- **Shinkansen:** marks `.beastwrap`. A tap:
  - shakes the beast (x ±4 design px, 6 cycles over `dur(0.5)`);
  - plays `sfx.rumble()` and `buzz([30, 30, 30])`;
  - calls `playTrack(stats.soundtrack.riserTrack)` when one exists.
- **Omikuji:** the slide gains `<div class="kuji" aria-hidden="true">` with an SVG hexagonal box, 44×44 design px, at the top-left under `.hd`. The touch marks `.kuji`. A tap:
  - shakes the box;
  - drops a slip that pops out to show `.hero` (the same fortune);
  - re-runs the `.hero` stamp at `dur(0.35)`;
  - plays `buzz(10)`.

  **Shaking the phone** is optional and happens on the first tap:
  - If `DeviceMotionEvent.requestPermission` exists (iOS), the first tap asks for it.
  - Once motion is allowed, a shake with `|acceleration| > 15` for 2 samples does the same as a tap. It has a 1.5 s cooldown.
  - The listener is removed when the card leaves. The kit gains `onLeave(fn)`; add it to `TouchKit` in this task, called by the player before the next `show`.

- [ ] **Step 1: Write the failing tests.**
  - `test('gacha: taps pull #2–#5 with SR, R, R, N, then back to the SSR')`
  - `test('gacha: one track → no mark')`
  - `test('shinkansen: tapping the beast rumbles and plays the riser\'s song')`
  - `test('omikuji: tapping the box shakes the same fortune out again')`
  - `test('omikuji: a shake past the threshold acts like a tap; the listener goes when the card leaves')`, using a stubbed `devicemotion` event.
  - In `sfx.test.ts`: `test('rumble only plays when allowed')`.
- [ ] **Step 2: Run the tests to make sure they fail.** Run: `npx vitest run tests/touch/reveals.test.ts tests/audio/sfx.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests to make sure they pass.** Run `npx vitest run` → green.
- [ ] **Step 5: Commit** with the message `feat(touch): gacha re-pulls, the kaiju roars, omikuji shakes`.

### Task 5: Drags (Forecast, Fuji)

**Files:**
- Create: `src/touch/drags.ts`
- Modify: `src/touch/index.ts`, `src/slides/worlds/o.css`, `src/slides/worlds/i.css`
- Test: `tests/touch/drags.test.ts`

**Interfaces:**
- **Forecast:** marks `.sun`.
  - Dragging moves the sun along the four orbit points in its `data-path` (pairs 1–4, one per season). On release it snaps to the nearest point.
  - At each stop, that season's `.ss` cell gets `.on`, and a `.val` line in the cell shows `fmt(value)` + the unit (the same unit the card's hero uses).
  - The kit is busy from `pointerdown` to `pointerup`.
  - The sun's GSAP `x`/`y` are set directly (it was orbited with x/y).
- **Fuji:** marks the `svg`.
  - Dragging along it moves a `.marker` (a vertical ink line, plus a label). The x position maps to week `i = round((x − 16) / step)`, using the same `step` the slide used; export `fujiStep(weeks: number): number` from `src/slides/fuji.ts` for this.
  - The label shows `week of <date>` and `fmt(value)` + the unit.
  - The peak's `.seal` stays.
  - Busy from down to up.
  - It doesn't mark when `weekly` has fewer than 2 weeks.
- Both set `touch-action: none` on their target (from `[data-touch]`) and use `setPointerCapture`.

- [ ] **Step 1: Write the failing tests.**
  - `test('forecast: dragging the sun snaps to the nearest season and shows its value')`
  - `test('forecast: release resumes the hold')`
  - `test('fuji: dragging maps x to the right week and shows its value')`
  - `test('fuji: one week → no mark')`
- [ ] **Step 2: Run the tests to make sure they fail.** Run: `npx vitest run tests/touch/drags.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests to make sure they pass.** Run `npx vitest run` → green.
- [ ] **Step 5: Commit** with the message `feat(touch): drag the sun through the seasons and along the Fuji ridge`.

### Task 6: Bento and the Kanji ticket

**Files:**
- Create: `src/touch/finale.ts`
- Modify: `src/touch/index.ts`, `src/story/ticket.ts` (a back face), `src/story/player.ts` (give the kit `ticket`), and `src/slides/worlds/j.css`, `src/story/story.css`
- Test: `tests/touch/finale.test.ts`, `tests/story/ticket.test.ts` (create it if it doesn't exist)

**Interfaces:**
- **Bento:** marks `.box` (the league table).
  - Each tap lifts the next `.row` in turn (1 → last, then wraps): `.row.lift`, which raises it 4 design px with a shadow and widens its bar to 100% of the column, showing `pct%`.
  - Only one row is lifted at a time.
  - It doesn't mark when there are no rows.
- **Kanji:** the kit gains `ticket: { el: HTMLElement; flip(): void }`. On kanji, the touch marks `ticket.el`.
  - A tap flips the ticket with a Y rotation over `dur(0.5)`, to a back face.
  - The back face shows the ride date (`new Date().toLocaleDateString()` in the rider's locale) and the count of stations stamped (`n / 13`).
  - Another tap flips it back.
  - `createTicket` builds the back face once (`.ticket .back`, hidden until `.flipped`).

- [ ] **Step 1: Write the failing tests.**
  - `test('bento: each tap lifts the next row and shows its share')`
  - `test('bento: no genres → the card is today\'s pass-through (no mark, no throw)')`
  - `test('kanji: tapping the ticket flips it to the ride date and stamp count, and back')`
- [ ] **Step 2: Run the tests to make sure they fail.** Run: `npx vitest run tests/touch/finale.test.ts tests/story/ticket.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests to make sure they pass.** Run `npx vitest run` → green.
- [ ] **Step 5: Commit** with the message `feat(touch): lift the genre table rows; flip the finale ticket`.

### Task 7: Ride and review

**Files:**
- Create: `scripts/probes/touch.js`
- Modify: `docs/design/art-direction/built/*.png` (reshoot)

- [ ] **Step 1: Write the probe.** `scripts/probes/touch.js`, run per station at 375×667 with `?genres=sample`:
  - waits for the card;
  - reports the marked targets' on-screen sizes (each must be ≥ 48 px in both directions, except Kanji's ticket, which is 84 px already);
  - checks no target overlaps `.controls`;
  - checks dots are present before the first touch;
  - dispatches a pointerdown and pointerup on the target, and checks the story index didn't change and the dots are gone.

  Expected: every station except Ganguro passes.
- [ ] **Step 2: Check reduced motion.** With `&reduced=1`, the touch on every station still runs, and no GSAP tween longer than 0 is left running.
- [ ] **Step 3: Check the songs.** With `&previews=silent`, tap Oshi's cover; when the clip ends, the mix resumes within 2 s.
- [ ] **Step 4: Run the existing probes.** Long-names: 0/0. Controls: no overlaps. Silence ride: max gap ≤ 2 s.
- [ ] **Step 5: Reshoot** all stations, look for anything the dots or new elements broke, and fix the top issues.
- [ ] **Step 6: Build.** Run `npm run build` and record the sizes.
- [ ] **Step 7: Commit** with the message `fix: polish from the touch review`.
