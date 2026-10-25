# Alive Plan A: The Ride Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the ride feel alive on a phone:
- music that never stops;
- cards that stay up long enough to read and keep moving while they're up;
- visible controls, swipe, a first-ride hint and haptics.

**Architecture:**
- **Music.** The soundtrack gets an "ended" hook. The player owns a mix queue built from the year's stats, and steps through it whenever a preview ends.
- **Pacing.** A pure module computes each card's hold from its word count. The player tracks the time left in a hold, so pausing doesn't restart it.
- **Idle loops.** These are CSS, switched on by an `idle` class the player adds once a card's beats finish.
- **Phone UI.** Controls, hint and haptics are small story modules, like `sign.ts` and `guide.ts`. Swipe lives in the player's existing pointer handler.

**Tech Stack:** Vite 8, TypeScript, GSAP 3.15, Vitest 5 + jsdom.

**Spec:** [docs/superpowers/specs/2026-10-25-alive-ride-design.md](../specs/2026-10-25-alive-ride-design.md), §2–§4 and §8. §5 (touch) is Plan B.

## Global Constraints

- Beat gap is `0.6` s.
- `hold = clamp(3 s + 0.25 s × words, 6 s, 10 s)`, measured from the card's last beat.
- The hold freezes while a finger is down, while paused, and (in Plan B) while an interaction is in use. It continues afterwards; it never restarts.
- A swipe counts at > 40 px of travel, and the dominant axis decides its direction. While dragging, the card follows the finger at 0.2×.
- Control buttons are ≥ 48 px with an `aria-label` and a visible focus ring, styled as F signs: white circle, `#00a7db` ring.
- Haptics:
  - 10 ms on each `stamp` or `drop` beat;
  - 20 ms on arrival;
  - `[15, 40, 15]` on the gacha SSR.
  - Never under reduced motion, never while muted.
- The hint key is `localStorage` `ongaku:hinted`. Its copy is 「タップ or スワイプ → tap or swipe」.
- Reduced motion: no idle loops, no haptics, no music.
- Only the artist and track name leave the device.
- No Spotify branding. Real numbers only.

## Review Focus

1. **Every mix preview fails to resolve** (offline): the queue must try each entry once, then stop quietly. No loop of requests, no thrown error.
2. **A station song arrives while a mix preview is still being looked up:** the late lookup must not override the station's song.
3. **Swipe vs tap vs hold on the same pointer:** a slow 50 px drag must be a swipe, not a hold-pause followed by a tap.
4. **Pausing mid-hold then resuming:** the card must move on after the remaining time, not after a fresh full hold and not instantly.
5. **The control strip on a 375×667 phone** must not overlap the scaled card, and the guide and ticket must stay legible.

---

### Task 1: Soundtrack "ended" hook

**Files:**
- Modify: `src/audio/soundtrack.ts`
- Test: `tests/audio/soundtrack.test.ts`

**Interfaces:**
- Produces: `Soundtrack.onEnded(cb: () => void): void`.
  - The callback fires when the currently playing song finishes on its own.
  - It doesn't fire after `stop()`, after a `pause()`, or when a song is faded out because another one started.

- [ ] **Step 1: Write the failing tests.** In `FakeAudio`, add `onended: (() => void) | null = null` and an `end()` helper that sets `paused = true` and calls `onended?.()`.
  - `test('onEnded fires when the playing song finishes by itself')`: play a url, unlock, end that player, and expect the callback to have been called once.
  - `test('onEnded does not fire for a song that was faded out or stopped')`: play `a`, play `b`, advance 1000 ms, then end `a`'s player: the callback is not called. Then `stop()` and end `b`'s player: still not called.
- [ ] **Step 2: Run the tests to make sure they fail.** Run: `npx vitest run tests/audio/soundtrack.test.ts`. Expected: the 2 new tests FAIL.
- [ ] **Step 3: Implement.** Set `p.onended` on both players. Fire the stored callback only when `p === playing?.el`.
- [ ] **Step 4: Run the tests to make sure they pass.** Same command; all pass.
- [ ] **Step 5: Commit** with the message `feat(audio): soundtrack reports when a song ends`.

### Task 2: The mix queue

**Files:**
- Create: `src/audio/mix.ts`
- Modify: `src/story/player.ts` (`cue`, plus a new `mixNext`)
- Test: `tests/audio/mix.test.ts`, `tests/story/player.test.ts`

**Interfaces:**
- Consumes: `Soundtrack.onEnded` from Task 1.
- Produces: `mixQueue(stats: YearStats): Ranked[]`. It returns `topTracks` (in order), then `soundtrack.topArtistTrack`, then `soundtrack.riserTrack`. It drops entries without an `artist` and duplicates by lowercased `artist + name`.

- [ ] **Step 1: Write the failing tests.**
  - In `tests/audio/mix.test.ts`, `test('the mix is the top tracks, then the top artist and riser songs, without duplicates')`: use the slides fixture `STATS`, with `soundtrack.topArtistTrack` set equal to `topTracks[0]` and `riserTrack` set to a new track. Expect 6 entries; the last is the riser track.
  - In `tests/story/player.test.ts`, pass a fake soundtrack that records `play(url)` calls and exposes `onEnded`, and a `findPreview` that resolves `url-<track name>`:
    - `test('when a preview ends the next song in the mix plays')`: start, unlock, flush promises, fire ended, and expect the next queue entry's url.
    - `test('a song that has no preview is skipped, and an all-missing mix goes quiet')`: `findPreview` returns undefined for one track, so its url is never played. When every lookup returns undefined, ending the song makes at most `queue.length` lookups and plays nothing.
    - `test('a station song wins over a late mix lookup')`: end a song so a mix lookup is pending, step to idol, then resolve the lookup. The last `play` is the idol station's url.
- [ ] **Step 2: Run the tests to make sure they fail.** Run: `npx vitest run tests/audio/mix.test.ts tests/story/player.test.ts`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - In `mix.ts`, implement `mixQueue`.
  - In `player.ts`:
    - Keep `mixAt` (an index into the queue) and a `cueId` counter.
    - `cue(i)` sets `mixAt` to the station song's index in the queue (−1 if it isn't there) and bumps `cueId`.
    - `mixNext()` tries `queue[mixAt+1…]` with wrap-around, at most `queue.length` lookups. It plays the first url found, but only if `cueId` hasn't changed since it started.
    - Register `opts.soundtrack.onEnded(mixNext)` once.
- [ ] **Step 4: Run the tests to make sure they pass.** Same command, then `npx vitest run` → all green.
- [ ] **Step 5: Commit** with the message `feat(audio): the ride plays your top songs as a non-stop mix`.

### Task 3: Reading-time pacing

**Files:**
- Create: `src/story/pacing.ts`
- Modify: `src/journey/beats.ts` (`GAP`), `src/story/player.ts` (`armHold`, `pause`/`resume`)
- Test: `tests/story/pacing.test.ts`, `tests/story/player.test.ts`, `tests/journey/beats.test.ts`

**Interfaces:**
- Produces:
  - `countWords(text: string): number`. Latin and number tokens count one each (split on whitespace); each run of CJK characters (`\p{Script=Han}`, Hiragana, Katakana) counts `ceil(length / 2)`.
  - `readingHoldMs(el: HTMLElement): number` = `clamp(3000 + 250 × countWords(el.textContent), 6000, 10000)`.
- `createStory`'s existing `holdMs` option stays as a test seam. When it's given, it's used as-is. When it isn't, the hold is `readingHoldMs(current)`.

- [ ] **Step 1: Write the failing tests.**
  - `test('words: latin words count one each, CJK runs count a word per two characters')`: `countWords('top 5 songs')` = 3; `countWords('今年の漢字')` = 3; `countWords('')` = 0.
  - `test('the hold is 3 s plus 250 ms a word, kept between 6 and 10 s')`: 0 words → 6000; 20 words → 8000; 100 words → 10000.
  - `test('beat groups are 0.6 s apart')`: `beatTime` of the 3rd group = 1.2.
  - `test('without holdMs a card holds for its reading time')`: a slide with 20 words moves on after 8000 ms, not at 7900.
  - `test('pausing mid-hold keeps the time left')`: holdMs 3000. Advance 2000, pause, advance 10000 (still here), resume, advance 900 (still here), advance 200 (moved on).
- [ ] **Step 2: Run the tests to make sure they fail.** Run: `npx vitest run tests/story/pacing.test.ts tests/story/player.test.ts tests/journey/beats.test.ts`. Expected: the new tests FAIL. Note which existing tests now fail on the new 0.6 s gap.
- [ ] **Step 3: Implement.**
  - Write `pacing.ts`.
  - Change `GAP` to `0.6`.
  - In `player.ts`, keep `holdLeft` and `holdStarted`. `armHold` starts a timeout for `holdLeft`, which is set fresh on each arrival. `pause` subtracts the elapsed time from `holdLeft`. `resume` re-arms with what's left.
  - Update the existing tests that hard-code the 0.35 s gap or the 2500 ms default to use the new values. Each such edit gets a one-line comment in the test.
- [ ] **Step 4: Run the tests to make sure they pass.** Run: `npx vitest run` → all green.
- [ ] **Step 5: Commit** with the message `feat(story): cards hold for their reading time; pause keeps the time left`.

### Task 4: Idle loops

**Files:**
- Modify: `src/story/player.ts` (add the `idle` class)
- Modify: `src/slides/worlds/{f,c,j,g,d,q,b,k,o,i,l}.css` (one `@keyframes` loop each)
- Modify: `src/story/story.css` (switch off under `.reduced`)
- Test: `tests/story/player.test.ts`, `tests/slides/worlds.test.ts`

**Interfaces:**
- The player adds class `idle` to the current slide when its timeline completes, and straight away on an instant (back) arrival. It never adds it when `reduced`.
- Each world's CSS animates only `.ph.<cls>.idle <element>` selectors.

**The loop for each world.** Each loop targets a decorative element, never body text:

| World | Element | Loop |
|---|---|---|
| F | LED rows | scroll |
| C | `.sun` | scale 1 → 1.03, 4 s alternate |
| J | `.photo` | background-position pan, 20 s |
| G | stars | twinkle; chrome text `background-position` sweep, 6 s |
| D | screentone layer | background-position drift, 12 s |
| Q | cover lines | brightness 1 → 1.15, 3 s |
| B | the two duotone layers | translate ±1 px, 2 s steps |
| K | `.cur` | blink, 1 s steps(2); dither twinkle |
| O | `.sun` | translate ±1 px, 3 s |
| I | ink | `filter: blur(0 → 0.6px)`, 5 s alternate |
| L | `.sky` | background-position churn, 16 s |

- [ ] **Step 1: Write the failing tests.**
  - `test('a card gets the idle class once its beats finish, never with reduced motion')`.
  - In `worlds.test.ts`, `test('every world has an idle loop and stops it under reduced motion')`: each world CSS file contains `.idle` and `@keyframes`, and `story.css` contains a `.reduced` rule that sets `animation: none` on `.ph.idle *`.
- [ ] **Step 2: Run the tests to make sure they fail.** Run: `npx vitest run tests/story/player.test.ts tests/slides/worlds.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the class toggle and the 11 loops.
- [ ] **Step 4: Run the tests to make sure they pass, then look at the result.**
  - Run `npx vitest run` → green.
  - Take two screenshots of the same station 1 s apart with `node scripts/shot.mjs` for C, K and I, and confirm the loop moves and no text shifts.
- [ ] **Step 5: Commit** with the message `feat(worlds): each world keeps a quiet idle loop while you read`.

### Task 5: Control strip

**Files:**
- Create: `src/story/controls.ts`
- Modify: `src/story/player.ts` (mount it in a new `.controls-row`; pass `prev`/`next`/`toggle`; show the paused stamp)
- Modify: `src/story/frame.ts` (bottom reserve 84 → 140)
- Modify: `src/main.ts` (the mute button moves into the controls row)
- Modify: `src/story/story.css`
- Test: `tests/story/controls.test.ts`, `tests/story/player.test.ts`

**Interfaces:**
- Produces: `createControls(on: { prev(): void; next(): void; toggle(): void }): { el: HTMLElement; setPaused(p: boolean): void }`.
  - `el` is `div.controls` holding three `button`s with `aria-label`s `Back`, `Pause`/`Play` and `Next`.
  - The middle button's label and glyph follow `setPaused`.
- The player's `api.pause()` and `api.resume()` call `controls.setPaused`. While paused, the stage carries `div.paused-stamp` with the text `一時停止 · paused`.

**Ruling (made in the plan):**
- **Where the controls go.** The controls get their own row above the dock instead of squeezing into it. At 375 px, a guide, a ticket and four buttons in one row would leave the guide about 120 px wide. So the frame's bottom reserve grows by 56 px.
- **The mute button** joins the controls row, since it's a control.

- [ ] **Step 1: Write the failing tests.**
  - `test('controls: back, pause and next buttons with labels; the middle one flips to Play when paused')`.
  - In the player, `test('the control buttons move, pause and resume the story and never count as a tap on the card')`: clicking Next moves on exactly one station; clicking Pause shows the paused stamp, and clicking again hides it.
- [ ] **Step 2: Run the tests to make sure they fail.** Run: `npx vitest run tests/story/controls.test.ts tests/story/player.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Write the controls and the row.
  - Style the buttons: 48 px; white fill; 4 px `#00a7db` ring; `:focus-visible` outline 3 px `#ff2d95`.
  - Change the frame reserve to `56 + 140`.
  - Make `main.ts` insert the mute button into `.controls`.
- [ ] **Step 4: Run the tests and check the layout.**
  - Run `npx vitest run` → green.
  - Write `scripts/probes/controls.js`. It reports the control strip's rect, the stage's rect and whether they overlap, and checks every button is ≥ 48 px.
  - Run it at 375×667 and 390×844 with `node scripts/probe.mjs`. Expected: no overlap, every button ≥ 48.
  - Take a screenshot at 375×667.
- [ ] **Step 5: Commit** with the message `feat(story): visible back, pause and next controls for phones`.

### Task 6: Swipe and the first-ride hint

**Files:**
- Create: `src/story/hint.ts`
- Modify: `src/story/player.ts` (pointer handler)
- Modify: `src/story/story.css` (`touch-action: none` on `.story`; hint styles)
- Test: `tests/story/player.test.ts`, `tests/story/hint.test.ts`

**Interfaces:**
- Produces: `createHint(): { el: HTMLElement; dismiss(): void }`.
  - On the first call ever, `el` shows 「タップ or スワイプ → tap or swipe」 with a sliding finger.
  - On later calls, `el` is empty and hidden.
  - `dismiss()` writes `ongaku:hinted=1` (inside try/catch) and removes the hint.
- In the player, the hint is mounted on the departure arrival and dismissed on the first tap, swipe or key.

**How the pointer handler decides.** It decides once per gesture, in this order:
1. The target is a control or `INTERACTIVE`: ignore.
2. Travel > 40 px: a swipe.
   - Horizontal: left = `nav(1)`, right = `nav(-1)`.
   - Down: `api.pause()`.
   - A swipe cancels the press timer and never toggles a hold.
3. A press held > 200 ms without passing 40 px: a hold.
4. Otherwise: a tap (the existing thirds rule).

While dragging, `gsap.set(frame.stage, { x: dx * 0.2 })`. On release it springs back to `x: 0`; the duration is 0 when reduced.

- [ ] **Step 1: Write the failing tests.**
  - `test('swipe left moves on, swipe right goes back, swipe down pauses')`.
  - `test('a slow 50 px drag is a swipe, not a hold-pause')`: pointerdown, wait 300 ms while moving to dx −50, then pointerup. The story moved on and isn't paused.
  - `test('a 30 px drag is a tap, and the card springs back')`.
  - `test('the hint shows on the first ride only and goes on the first tap')`.
  - `test('the hint still dismisses when storage is unavailable')`: stub `localStorage.setItem` to throw.
- [ ] **Step 2: Run the tests to make sure they fail.** Run: `npx vitest run tests/story/player.test.ts tests/story/hint.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the hint, `pointermove` tracking and the decision order above.
- [ ] **Step 4: Run the tests to make sure they pass.** Run: `npx vitest run` → green.
- [ ] **Step 5: Commit** with the message `feat(story): swipe between cards; first-ride hint`.

### Task 7: Haptics

**Files:**
- Create: `src/story/haptics.ts`
- Modify: `src/story/player.ts`, `src/slides/gacha.ts` (`data-haptic="ssr"` on `.k-win.card`)
- Test: `tests/story/haptics.test.ts`, `tests/story/player.test.ts`

**Interfaces:**
- Produces: `createHaptics(o: { canBuzz: () => boolean; vibrate?: (p: number | number[]) => boolean }): { buzz(p: number | number[]): void }`.
  - It calls `o.vibrate ?? navigator.vibrate?.bind(navigator)` only when `canBuzz()` is true.
  - It does nothing where `vibrate` is missing (iOS).
- In the player:
  - `canBuzz = () => !reduced && !opts.soundtrack?.muted`. The haptics are unlocked by the same tap as sound.
  - On arrival: `buzz(20)`, at the same `at()` as the arrival sound.
  - For each `[data-fx~=stamp]` and `[data-fx~=drop]` element: `buzz(10)` at its beat time.
  - For `[data-haptic=ssr]`: `buzz([15, 40, 15])` instead.
  - None of these fire while `skipping`.

- [ ] **Step 1: Write the failing tests.**
  - `test('haptics buzz only when allowed and supported')`.
  - In the player, `test('arrival buzzes 20 ms and each stamp 10 ms; nothing when muted or reduced or skipped')`, using an injected `makeHaptics` seam that mirrors `makeSfx`.
- [ ] **Step 2: Run the tests to make sure they fail.** Run: `npx vitest run tests/story/haptics.test.ts tests/story/player.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests to make sure they pass.** Run: `npx vitest run` → green.
- [ ] **Step 5: Commit** with the message `feat(story): haptic taps on arrivals and stamps (Android)`.

### Task 8: Ride and review

**Files:**
- Create: `scripts/probes/silence.js`
- Modify: `docs/design/art-direction/built/*.png` (reshoot)

- [ ] **Step 1: Check for silence.** Write `scripts/probes/silence.js`. It stubs `findPreview` to 30 s silent data URLs, shortened to 3 s through `?previewSeconds=3`. That needs a DEV-only route param, added to `src/route.ts` with a test: the param is ignored outside DEV.

  The probe rides 13 stations by auto-advance and records the gaps between one song ending and the next starting. Expected: max gap ≤ 2 s.
- [ ] **Step 2: Check the timings.** On every station, the hold measured in the page falls within 6–10 s.
- [ ] **Step 3: Check reduced motion** (`&reduced=1`): no `.idle` classes, no `navigator.vibrate` calls (stubbed and counted), no audio play.
- [ ] **Step 4: Run the existing probes.**
  - `scripts/probes/long-names.js` on all 13 stations: 0/0. The frame got smaller (Task 5), so long names may now wrap.
  - `scripts/probes/controls.js` at both phone sizes: no overlap.
- [ ] **Step 5: Reshoot all 13 stations** into `docs/design/art-direction/built/` at 390×844, and look at them for anything the smaller frame broke. Fix the top issues.
- [ ] **Step 6: Build.** Run `npm run build` and record the bundle sizes in the ledger.
- [ ] **Step 7: Commit** with the message `fix: polish from the alive-ride review`, then run task-done 8.
