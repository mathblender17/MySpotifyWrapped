# UX Plan 1: The Lab and the Feel Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `?lab=1` UX lab and the eight Feel experiments (F1 to F8) as playable, scoreable prototypes the owner tests on a phone.

**Architecture:** A lab shell (list, play view, scorecard) is loaded by dynamic import only when `?lab=1` is in the URL, so the ride is untouched. Experiments are self-contained files that mount into a stage element using a small `LabKit` (reduced motion, vibration, sound, tilt). The reusable maths (velocity, gestures, springs, rubber-banding, tilt normalising, haptic patterns) lives in pure functions under `src/feel/` with unit tests; the browser-facing parts (tilt, sound beds, feel sounds) are thin wrappers over fakeable APIs.

**Tech Stack:** TypeScript, Vite 8, GSAP 3.15, Web Audio, DeviceOrientation, Vibration API, Vitest + jsdom.

**Spec:** [docs/superpowers/specs/2026-11-01-ux-experience-design.md](../specs/2026-11-01-ux-experience-design.md) (sections 2 and 3 are binding for this plan).

## Global Constraints

- The ride is untouched: no existing file's behaviour changes. The only edits to existing files are `src/route.ts` (adds `lab`) and `src/main.ts` (dynamic import behind the flag). The `Sfx` type in `src/audio/sfx.ts` is not modified (existing tests build literal fakes of it); new sounds go in a separate `FeelSfx`.
- Reduced motion (`prefersReducedMotion()` from `src/journey/beats.ts`), mute and no-vibration switch off all motion, tilt, sound and vibration in every experiment; each still shows a usable still state.
- Every tap target at least 48 px; nothing important in the bottom 140 px of the lab stage (the lab's own footer lives there).
- Sound is synthesised in the browser: no audio files. Sound and vibration only after the first user gesture in the lab.
- Real data only: experiments use demo/sample content and say so; nothing reads or sends the rider's listening files.
- No Spotify name or logo. Anything unfinished says "in development" in the UI.
- Some files are CRLF (e.g. `src/story/player.ts`, `src/main.ts` may be mixed). Never convert a whole file's line endings; match the lines you edit.
- Score rule: `keep` when goosebumps, clarity and speed are all at least 2; `kill` when goosebumps is 0; otherwise `tune` (ruling: the spec says "kept, tuned or killed" without defining kill).
- The lab ends at "built, scored on the owner's phone". Moving winners into the ride is a follow-up plan written after the scores exist, not part of this plan.

## Review Focus

- **iPhone and denied permissions:** no vibration, no tilt permission, or a denied prompt: every experiment still works with touch or a pointer fallback and throws nothing.
- **Reduced motion on:** no animation, sound or vibration runs; the experiment shows its still state and says motion is off.
- **Storage blocked:** `localStorage` throwing must not break the lab; scores stay in memory for the session and the UI says they won't be saved.
- **Audio blocked or missing:** no Web Audio, or a context that cannot start: silent, no exception, no half-playing loop left running after leaving the experiment.
- **The ride is unaffected:** without `?lab=1` no lab code is fetched or run, and the build size of the main chunk does not grow.

---

## File structure

| File | Responsibility |
|---|---|
| `src/route.ts` (modify) | Adds `lab?: true` for `?lab=1` |
| `src/main.ts` (modify) | `if (route.lab) import('./lab/lab').then(m => m.mountLab(app))` before the landing |
| `src/feel/pointer.ts` | `PointSample`, `velocity`, `classify` (gesture grammar) |
| `src/feel/physics.ts` | `stepSpring`, `projectFling`, `snapIndex`, `rubber`, `speedLines`, `shakeFor` |
| `src/feel/patterns.ts` | Haptic patterns: `chargePattern`, `CLACK`, `SLAM`, `BELL` |
| `src/feel/tilt.ts` | `normalizeTilt`, `createTilt` |
| `src/audio/feelsfx.ts` | `createFeelSfx`: `clack`, `slam`, `tick` |
| `src/audio/beds.ts` | `createBeds`: `wind`, `chime`, `ratchet` loops |
| `src/lab/types.ts` | `Experiment`, `LabKit` |
| `src/lab/scorecard.ts` | `Score`, `loadScores`, `saveScore`, `verdict`, `toMarkdown` |
| `src/lab/kit.ts` | `makeKit(opts)`: builds a `LabKit` |
| `src/lab/lab.ts` + `src/lab/lab.css` | `mountLab`: list, play view, score sheet, copy scorecard |
| `src/lab/registry.ts` | `EXPERIMENTS` array |
| `src/lab/experiments/*.ts` | One file per experiment (`check`, `f1-momentum`, ... `f8-grammar`) |
| `docs/ux/scorecard.md`, `docs/ux/experiments/*.md` | The scorecard and the storyboard sheets |
| `tests/lab/fakeKit.ts` | Shared test helper `fakeKit()` |
| `scripts/probes/lab.js` | Phone-size probe over every experiment |

---

### Task 1: Lab shell, scorecard and the route flag

**Files:**
- Create: `src/lab/types.ts`, `src/lab/scorecard.ts`, `src/lab/kit.ts`, `src/lab/lab.ts`, `src/lab/lab.css`, `src/lab/registry.ts`, `src/lab/experiments/check.ts`, `docs/ux/scorecard.md`, `tests/lab/fakeKit.ts`, `tests/lab/scorecard.test.ts`, `tests/lab/lab.test.ts`
- Modify: `src/route.ts`, `src/main.ts`, `tests/route.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // src/lab/types.ts
  export type LabKit = {
    reduced: boolean;
    buzz(p: number | number[]): void;      // no-op when reduced, muted or unsupported
    sfx: Sfx;                               // existing synth accents (src/audio/sfx.ts)
    fx: FeelSfx;                            // Task 3 (stub type declared here as an import)
    beds: Beds;                             // Task 6
    tilt: Tilt;                             // Task 4
    onLeave(fn: () => void): void;
  };
  export type Experiment = { id: string; layer: 'feel' | 'story' | 'return'; title: string; blurb: string; mount(stage: HTMLElement, kit: LabKit): void };
  // src/lab/scorecard.ts
  export type Score = { id: string; goosebumps: 0|1|2|3; clarity: 0|1|2|3; speed: 0|1|2|3; note: string };
  export function loadScores(store?: Storage): Record<string, Score>;
  export function saveScore(s: Score, store?: Storage): boolean;   // false when storage is unavailable (kept in memory)
  export function verdict(s: Score): 'keep' | 'tune' | 'kill';
  export function toMarkdown(scores: Record<string, Score>, meta: { device: string; date: string }): string;
  // src/lab/lab.ts
  export function mountLab(app: HTMLElement, o?: { makeKit?: (reduced: boolean) => LabKit; store?: Storage }): void;
  ```
- Because Tasks 3, 4 and 6 own `FeelSfx`, `Tilt` and `Beds`, this task also creates `src/audio/feelsfx.ts`, `src/feel/tilt.ts` and `src/audio/beds.ts` containing only the exact type each later task defines plus a no-op factory (`createFeelSfx`, `createTilt`, `createBeds`) so `types.ts` and `kit.ts` compile. Tasks 3, 4 and 6 replace the no-op bodies with the real implementations and add their tests.

- [ ] **Step 1: Route test.** In `tests/route.test.ts` add `test('?lab=1 sets lab', ...)`: `parseRoute('?lab=1')` equals `{ lab: true }`; `parseRoute('?lab=0')` and `parseRoute('')` have no `lab` key.
- [ ] **Step 2: Scorecard tests** (`tests/lab/scorecard.test.ts`):
  - `verdict keeps when all three are at least 2`: `{goosebumps:2,clarity:2,speed:3}` → `keep`.
  - `verdict tunes when any is below 2 but goosebumps is above 0`: `{1,3,3}` → `tune`.
  - `verdict kills when goosebumps is 0`: `{0,3,3}` → `kill`.
  - `saveScore then loadScores round-trips through a Storage`: use a `Map`-backed fake `Storage`; after `saveScore(s, fake)` returns `true`, `loadScores(fake)[s.id]` deep-equals `s`.
  - `a throwing Storage returns false and loadScores returns {}`: fake whose `getItem`/`setItem` throw.
  - `toMarkdown lists one row per score with its verdict`: contains `| f1-momentum | 3 | 2 | 2 | keep |`, the device and the date.
- [ ] **Step 3: Lab test** (`tests/lab/lab.test.ts`, jsdom, `fakeKit` from `tests/lab/fakeKit.ts`): 
  - `the list shows every registered experiment and opens one on tap`: mount with a fake `makeKit`; each registry id appears as a button; clicking the `check` button mounts it into `.lab-stage` and shows the title.
  - `leaving an experiment runs its onLeave callbacks`: the `check` experiment registers a cleanup via `kit.onLeave`; clicking Back calls it exactly once.
  - `the score sheet saves a score and shows its verdict`: open `check`, tap Score, press 3 on goosebumps, 2 on clarity, 2 on speed, Save; the list shows `keep` beside it.
  - `location.hash opens that experiment directly`: with `location.hash = '#check'` before mounting, the play view is shown.
  - `a throwing store shows "not saved" and still works`.
- [ ] **Step 4: Run** `npx vitest run tests/route.test.ts tests/lab` → FAIL (modules missing).
- [ ] **Step 5: Implement.** `src/route.ts` adds `lab?: true` and `if (q.get('lab') === '1') r.lab = true`. `scorecard.ts` as specified; storage key `ongaku:lab-scores`; every storage access in try/catch. `kit.ts`: `makeKit({ reduced, unlocked: () => boolean })` returns a `LabKit` whose `canPlay = () => unlocked() && !reduced`; `buzz` uses `createHaptics` (`src/story/haptics.ts`) with `canBuzz: canPlay`; `sfx` is `createSfx({ canPlay })`; `fx`, `beds`, `tilt` come from Tasks 3, 4 and 6 (until they exist, `kit.ts` builds them from the minimal stubs declared in this task); `onLeave` collects callbacks that `kit.leave()` runs. `lab.ts`: list view (a heading "UX lab · 開発中 in development", one button per experiment showing title, layer, blurb and its verdict if scored, and a "Copy scorecard" button that writes `toMarkdown(...)` with `navigator.userAgent` and today's date to the clipboard), play view (`.lab-stage` filling the screen above a footer with Back and Score buttons), score sheet (three rows of four 48 px buttons 0 to 3, a note field, Save), hash deep-link, and a first-`pointerdown` listener that flips `unlocked` and calls `sfx.unlock()`. `lab.css`: dark night background, the lacquer/enamel look from the ride's `.controls` where it can be reused, all targets at least 48 px, `touch-action: none` on `.lab-stage`. `experiments/check.ts`: a stage that prints pointer coordinates and the kit's `reduced` flag (id `check`, layer `feel`). `registry.ts`: `export const EXPERIMENTS: Experiment[] = [check]`. `src/main.ts`: before the landing/route logic, `if (route.lab) { import('./lab/lab').then((m) => m.mountLab(app)); } else if (...)` keeping the existing branches intact. `docs/ux/scorecard.md`: a table header (`| experiment | goosebumps | clarity | speed | verdict | device | date |`) and a note on how to paste the "Copy scorecard" output.
- [ ] **Step 6: Run** `npx vitest run` and `npx tsc --noEmit` → PASS.
- [ ] **Step 7: Commit** `feat(lab): ?lab=1 shell, scorecard and the check experiment`.

---

### Task 2: Pointer maths: velocity and the gesture grammar

**Files:**
- Create: `src/feel/pointer.ts`, `tests/feel/pointer.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type PointSample = { t: number; x: number; y: number };               // t in ms
  export function velocity(samples: PointSample[], windowMs?: number): { vx: number; vy: number };   // px/s over the last windowMs (default 100)
  export type Gesture = { kind: 'tap' | 'hold' | 'flick' | 'pull' | 'drag'; dir?: 'left' | 'right' | 'up' | 'down'; speed: number };
  export function classify(samples: PointSample[], o?: { holdMs?: number; tapSlop?: number; flickSpeed?: number }): Gesture;
  ```
  Rules (defaults `holdMs` 300, `tapSlop` 10 px, `flickSpeed` 600 px/s): travel under `tapSlop` → `tap` if shorter than `holdMs`, else `hold`. Otherwise `speed` is the magnitude of `velocity` over the last 100 ms. A mostly-downward move (dy dominant and positive) → `pull`. Else speed at least `flickSpeed` → `flick` with `dir` by the dominant axis; slower → `drag`. Fewer than two samples → `tap` with speed 0.

- [ ] **Step 1: Tests.**
  - `velocity of a steady 1 px/ms move is 1000 px/s`: samples `(0,0,0) (50,50,0) (100,100,0)` → `vx` 1000 (±1), `vy` 0.
  - `velocity ignores samples older than the window`: a slow start then a fast last 100 ms reports the fast speed.
  - `fewer than two samples give 0`.
  - `a short quick touch is a tap`; `a long still touch is a hold`; `a 5 px wobble is still a tap`.
  - `a fast leftward move is a flick with dir left`; `a slow rightward move is a drag`; `a downward move is a pull`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `pointer.ts` (pure, no DOM). **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(feel): pointer velocity and the gesture grammar`.

---

### Task 3: Spring and fling maths, feel sounds, and F1 Momentum train

**Files:**
- Create: `src/feel/physics.ts`, `src/audio/feelsfx.ts`, `src/lab/experiments/f1-momentum.ts`, `docs/ux/experiments/F1-momentum.md`, `tests/feel/physics.test.ts`, `tests/audio/feelsfx.test.ts`, `tests/lab/f1.test.ts`
- Modify: `src/lab/registry.ts` (add `f1`), `src/lab/kit.ts` (use the real `createFeelSfx`)

**Interfaces:**
- Consumes: `classify`, `velocity`, `PointSample` (Task 2); `LabKit`, `Experiment` (Task 1); `STATIONS` from `src/journey/stations.ts` (13 stations, `nameJp`).
- Produces (`physics.ts`, pure):
  ```ts
  export function stepSpring(s: { x: number; v: number }, target: number, dt: number, o?: { stiffness?: number; damping?: number }): { x: number; v: number };  // defaults 200, 24
  export function projectFling(pos: number, vel: number, decel?: number): number;   // rest point; default decel 3000 px/s²
  export function snapIndex(x: number, count: number, width: number): number;       // nearest card index, clamped 0..count-1; x is the scroll offset (0 at card 0)
  export function rubber(distance: number, limit: number): number;                  // 0 at 0, rises with resistance, never exceeds limit
  export function speedLines(speed: number): number;                                // 0 under 300 px/s, rising to a max of 24
  export function shakeFor(speed: number): number;                                  // px amplitude: 0 under 600 px/s, max 6
  ```
  Produces (`feelsfx.ts`): `export type FeelSfx = { clack(): void; slam(): void; tick(): void; dispose(): void }` and `createFeelSfx(opts: { canPlay: () => boolean; makeContext?: () => AudioContext }): FeelSfx`, built like `createSfx` (no context until `canPlay()`; every call a no-op when not allowed or Web Audio is missing). `clack` is a 25 ms filtered noise click plus a 140 Hz thump; `slam` a 90 ms noise burst plus a falling 90 to 40 Hz tone; `tick` a 20 ms square blip at 1800 Hz at half peak. Peak stays at the same −18 dB level as `src/audio/sfx.ts`.

- [ ] **Step 1: Physics tests** (`tests/feel/physics.test.ts`):
  - `stepSpring converges to the target within 0.5 px in under 1.2 s`: simulate at dt 1/60 from `x:0,v:0` to target 300.
  - `stepSpring with a strong initial velocity overshoots then settles`.
  - `projectFling returns the rest point under constant deceleration`: `projectFling(100, 1000)` = `100 + 1000²/(2·3000)`; a negative velocity goes left.
  - `snapIndex rounds to the nearest card and clamps`: width 390, `snapIndex(200, 13, 390)` = 1; `snapIndex(-50,…)` = 0; `snapIndex(99999,…)` = 12.
  - `rubber is 0 at 0, increasing, and never exceeds the limit`.
  - `speedLines is 0 below 300, grows, and caps at 24`; `shakeFor is 0 below 600 and caps at 6`.
- [ ] **Step 2: FeelSfx tests** (reuse the fake-context shape from `tests/audio/sfx.test.ts`): `makes no AudioContext while sound is not allowed`; `clack, slam and tick each build nodes once allowed`; `a context that throws on construction stays silent without throwing`; `dispose closes the context`.
- [ ] **Step 3: F1 test** (`tests/lab/f1.test.ts`, `fakeKit`): 
  - `mounts 13 station cards in a strip`.
  - `a fast leftward flick ends on a later card than a slow drag of the same distance`: dispatch pointer events with controlled `timeStamp`s (the experiment reads `event.timeStamp`), run the experiment's `settle()` hook to completion, and compare the resting `data-index`.
  - `crossing a station fires clack and a vibration once per card crossed`: `kit.fx.clack` and `kit.buzz` call counts equal the number of cards passed.
  - `under reduced motion the strip jumps to the nearest card with no clack`.
  - `leaving removes the pointer listeners and cancels the animation frame`.
- [ ] **Step 4: Run** → FAIL. **Step 5: Implement.** `physics.ts` and `feelsfx.ts` as specified. `f1-momentum.ts`: a horizontal strip of 13 cards (station number, `nameJp`, accent colour from `STATIONS`), pointer events with `setPointerCapture`; during a drag the strip follows the finger with `rubber` at the two ends; on release compute `target = snapIndex(projectFling(x, vx), 13, width) * width` and animate with `stepSpring` in `requestAnimationFrame`; each time the resting-index crossing changes during the animation call `kit.fx.clack()` and `kit.buzz(CLACK)` (import `CLACK` from `src/feel/patterns.ts`; this task creates that file with just `export const CLACK = [18]` and Task 5 adds the rest). Export `settleFor(stage: HTMLElement): void` from the experiment file; it runs the current animation to completion synchronously, and the tests call it instead of waiting on frames. Reduced motion: no animation, no sound, jump to nearest. `kit.onLeave` cancels the frame and removes listeners. Storyboard sheet: the five fields from spec section 2 (action, response, feeling, data, cost).
- [ ] **Step 6: Run** `npx vitest run` and `npx tsc --noEmit` → PASS. **Step 7: Commit** `feat(feel): spring physics, feel sounds and F1 momentum train`.

---

### Task 4: Tilt and F2 Tilt world

**Files:**
- Create: `src/feel/tilt.ts`, `src/lab/experiments/f2-tilt.ts`, `docs/ux/experiments/F2-tilt.md`, `tests/feel/tilt.test.ts`, `tests/lab/f2.test.ts`
- Modify: `src/lab/registry.ts`, `src/lab/kit.ts` (use the real `createTilt`)

**Interfaces:**
- Produces:
  ```ts
  export function normalizeTilt(gamma: number, beta: number): { x: number; y: number };   // each −1..1; gamma ±30° → ±1; beta measured from a 45° holding angle, ±30° → ±1; clamped
  export type Tilt = { readonly state: 'idle' | 'running' | 'denied' | 'unsupported'; request(): Promise<boolean>; stop(): void; on(fn: (x: number, y: number) => void): () => void };
  export function createTilt(o: { reduced: boolean; win?: Pick<Window, 'addEventListener' | 'removeEventListener'>; permission?: () => Promise<'granted' | 'denied'> | undefined }): Tilt;
  ```
  `request()` must be called inside a tap (iOS). With `reduced` true, `state` is `unsupported` and `request()` resolves `false`. If `permission` returns a promise, await it (iOS); `denied` → state `denied`, resolves `false`. Otherwise start listening to `deviceorientation` on `win` (default `window`); the first event with non-null `gamma` and `beta` sets `running`; if no event arrives within 1500 ms state becomes `unsupported`. Smoothing: low-pass `0.15`. `stop()` removes the listener.

- [ ] **Step 1: Tilt tests.**
  - `normalizeTilt maps ±30° to ±1, centres a 45° beta at 0 and clamps`.
  - `reduced motion makes request resolve false and state unsupported`.
  - `a denied permission resolves false and sets denied`.
  - `a granted permission starts listening and emits normalised, smoothed values` (fake `win` records the handler; fire two events; the emitted values rise toward the target but stay below it on the first event).
  - `no events within 1500 ms sets unsupported` (fake timers).
  - `stop removes the listener and on() returns an unsubscribe`.
- [ ] **Step 2: F2 tests** (`fakeKit` with a controllable `tilt`):
  - `mounts four depth layers`; `each layer moves by depth × tilt`: emitting `(1, 0)` shifts the layers' `translateX` in increasing magnitude from sky to foreground.
  - `without tilt the layers follow a pointer drag instead` (desktop and denied fallback).
  - `an "Enable tilt" button calls kit.tilt.request inside the tap`.
  - `reduced motion shows the still scene and a note "motion is off"`.
  - `leaving unsubscribes and stops tilt`.
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement.** `f2-tilt.ts`: four stacked divs (sky gradient, Fuji, hills with a torii, foreground with a train) using CSS gradients and clip-paths in the colours of `docs/design` (night indigo, vermilion, washi), depths `[0.2, 0.5, 0.8, 1.2]` × 14 px amplitude; `gsap.quickTo` for smoothing; Enable tilt button (48 px) in the top area of the stage. **Step 5: Run** `npx vitest run` and `npx tsc --noEmit` → PASS. **Step 6: Commit** `feat(feel): tilt and F2 tilt world`.

---

### Task 5: Haptic patterns and F3 Stamp punch

**Files:**
- Create: `src/lab/experiments/f3-stamp.ts`, `docs/ux/experiments/F3-stamp.md`, `tests/feel/patterns.test.ts`, `tests/lab/f3.test.ts`
- Modify: `src/feel/patterns.ts` (created in Task 3), `src/lab/registry.ts`

**Interfaces:**
- Produces (`patterns.ts`): `export const CLACK = [18]; export const SLAM = [40, 20, 15]; export const BELL = [30, 60, 30]; export function chargePattern(ms: number): number[]`. `chargePattern` returns alternating vibrate/pause durations (vibrate first) whose pulses grow from 10 ms to 40 ms and pauses shrink from 40 ms to 10 ms, with a total length within 60 ms of `ms` and at most 30 entries.

- [ ] **Step 1: Pattern tests.** `chargePattern(600)`: pulses (even indices) are non-decreasing; pauses (odd indices) non-increasing; sum within 600 ± 60; length ≤ 30; every entry > 0; `chargePattern(0)` is `[]`; constants are the exact arrays above.
- [ ] **Step 2: F3 tests.**
  - `pointer down starts the charge: kit.buzz is called with a chargePattern and the stamp scales down`.
  - `release after at least 400 ms slams: fx.slam, buzz(SLAM), an ink splat of 8 elements, a stamped mark on the ticket`.
  - `a release before 400 ms is only a tap poke (small pulse, no splat, no stamp)`.
  - `cancelling the pointer (pointercancel) aborts the charge and calls navigator.vibrate(0) through kit.buzz(0)`.
  - `reduced motion stamps instantly with no splat, sound or vibration`.
  - `leaving cancels a running charge and removes the splat elements`.
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement.** `f3-stamp.ts`: a washi ticket with a dashed empty circle; hold anywhere on the ticket. While held: call `kit.buzz(chargePattern(600))` once at the start, ring fills over 600 ms with GSAP, stamp scales 1 → 0.85. On release at or after 400 ms: slam (scale 1.3 → 1 with `power4.in` over 90 ms), 8 ink circles flying out and fading, a 120 ms `shakeFor`-style stage shake of 4 px (skipped when reduced), `kit.fx.slam()`, `kit.buzz(SLAM)`, the stamp stays on the ticket showing the kanji `乗`. The hold timer uses `event.timeStamp`. **Step 5: Run** `npx vitest run` and `npx tsc --noEmit` → PASS. **Step 6: Commit** `feat(feel): haptic patterns and F3 stamp punch`.

---

### Task 6: Sound beds and F4 Sound beds

**Files:**
- Create: `src/audio/beds.ts`, `src/lab/experiments/f4-beds.ts`, `docs/ux/experiments/F4-beds.md`, `tests/audio/beds.test.ts`, `tests/lab/f4.test.ts`
- Modify: `src/lab/registry.ts`, `src/lab/kit.ts` (use the real `createBeds`)

**Interfaces:**
- Produces:
  ```ts
  export type BedKind = 'wind' | 'chime' | 'ratchet';
  export type Beds = { start(kind: BedKind): void; stop(): void; readonly playing: BedKind | null; dispose(): void };
  export function createBeds(o: { canPlay: () => boolean; makeContext?: () => AudioContext }): Beds;
  ```
  Behaviour: only one bed plays at a time (`start` stops the previous). `wind`: looped filtered noise (a 2 s noise buffer, `loop = true`, low-pass at 400 Hz with a slow 0.15 Hz gain wobble, peak 0.06). `chime`: every 2600 ms a three-note arpeggio (`880, 660, 990` Hz sine, 0.25 s each, peak 0.08). `ratchet`: a `tick` click every 90 ms for 8 clicks then a 700 ms rest, repeating (peak 0.08). Peaks stay under the −18 dB ceiling used by `src/audio/sfx.ts` (0.125). `stop()` clears timers and disconnects/stops nodes. Nothing is created while `canPlay()` is false; `start` while not allowed leaves `playing` null.

- [ ] **Step 1: Beds tests** (fake context + fake timers):
  - `start while sound is not allowed makes no context and playing stays null`.
  - `start('wind') makes one looping buffer source and sets playing`.
  - `start('chime') schedules three oscillators immediately and again after 2600 ms`.
  - `start('ratchet') schedules 8 clicks per cycle`.
  - `starting a second bed stops the first (its timers no longer fire)`.
  - `stop clears timers: advancing time creates no more nodes` and `playing` is null.
  - `no peak gain exceeds 0.125`.
  - `a context that throws on construction stays silent`.
- [ ] **Step 2: F4 tests.** `shows three bed buttons (torii wind, konbini chime, gacha ratchet)`; `tapping one calls kit.beds.start with its kind and highlights it; tapping it again calls stop`; `each button is at least 48 px tall`; `leaving calls kit.beds.stop`; `reduced motion disables the buttons and says sound is off`.
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement** `beds.ts` and `f4-beds.ts` (three large lacquer buttons with animated level bars driven by CSS, no audio analysis needed). **Step 5: Run** `npx vitest run` and `npx tsc --noEmit` → PASS. **Step 6: Commit** `feat(feel): sound beds and F4`.

---

### Task 7: F5 Heavy numbers and F7 Speed from the finger

**Files:**
- Create: `src/lab/experiments/f5-heavy.ts`, `src/lab/experiments/f7-speed.ts`, `docs/ux/experiments/F5-heavy.md`, `docs/ux/experiments/F7-speed.md`, `tests/lab/f5.test.ts`, `tests/lab/f7.test.ts`
- Modify: `src/lab/registry.ts`

**Interfaces:**
- Consumes: `speedLines`, `shakeFor` (Task 3), `velocity` (Task 2), `kit.tilt` (Task 4).
- Produces: two `Experiment`s with ids `f5-heavy` and `f7-speed`.

- [ ] **Step 1: F5 tests.**
  - `the number counts from 0 to its target with an overshoot above the target before settling` (sample the displayed value across fake-timed frames: the maximum exceeds the target and the final value equals it).
  - `a tap recounts from 0`.
  - `a tilt change larger than 0.4 triggers a bounce` (the digits' container gets a bounce animation once; a change under 0.4 does nothing).
  - `reduced motion shows the final number immediately and never bounces`.
  - `leaving unsubscribes from tilt and kills tweens`.
- [ ] **Step 2: F7 tests.**
  - `a fast swipe shows more speed lines than a slow one` (read the element count; uses `speedLines`).
  - `a fast swipe shakes the stage by at most shakeFor(speed) px; a slow one does not shake`.
  - `lines and shake fade out within 600 ms after release`.
  - `reduced motion shows a static "motion is off" note and no lines`.
  - `leaving removes the lines`.
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement.** `f5-heavy.ts`: a Dela Gothic One hero number (use a demo value such as `28613` with a "demo" tag) counted with `gsap` ease `back.out(2.2)` over 1.4 s; tilt bounce uses a small `y` spring on the digits; tap recount. `f7-speed.ts`: a night-sky stage; on pointer move, speed from `velocity` of the last samples; draw up to `speedLines(speed)` horizontal streak divs (reusing a pool of 24), set stage `translate` jitter within `shakeFor(speed)`, and fade out on release. **Step 5: Run** `npx vitest run` and `npx tsc --noEmit` → PASS. **Step 6: Commit** `feat(feel): F5 heavy numbers and F7 speed from the finger`.

---

### Task 8: F6 Pull the cord and F8 One gesture grammar

**Files:**
- Create: `src/lab/experiments/f6-cord.ts`, `src/lab/experiments/f8-grammar.ts`, `docs/ux/experiments/F6-cord.md`, `docs/ux/experiments/F8-grammar.md`, `tests/lab/f6.test.ts`, `tests/lab/f8.test.ts`
- Modify: `src/lab/registry.ts`

**Interfaces:**
- Consumes: `rubber`, `stepSpring` (Task 3), `classify` (Task 2), `kit.sfx.bell` (existing), `BELL` (Task 5).
- Produces: `Experiment`s `f6-cord` and `f8-grammar`.

- [ ] **Step 1: F6 tests.**
  - `dragging the cord down moves it by rubber(distance, 140), never beyond 140 px`.
  - `releasing past 90 px rings: sfx.bell and buzz(BELL) once, and the "next stop" label appears`.
  - `releasing before 90 px springs back without ringing`.
  - `the cord's end is at least 48 px wide`.
  - `reduced motion: a tap on the cord rings the bell label with no motion, sound or vibration`.
  - `leaving removes listeners and cancels the frame`.
- [ ] **Step 2: F8 tests** (drive pointer events with controlled timestamps):
  - `tap shows "poke"`, `hold at least 300 ms shows "charge" and a growing ring`, `fast horizontal move shows "flick" and slides the card away then back`, `a shake (devicemotion with acceleration above 15 for two samples) shows "shake" with a confetti burst`.
  - `the label always matches classify's result for the same samples`.
  - `devicemotion is optional: with no DeviceMotionEvent the first three gestures still work`.
  - `reduced motion shows the label only, with no ring growth, slide or confetti`.
  - `leaving removes the devicemotion and pointer listeners`.
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement.** `f6-cord.ts`: a hanging cord with a tassel at the top of the stage; drag down with rubber-banding, ring on release past 90 px, spring back with `stepSpring`; label "次は… NEXT STOP". `f8-grammar.ts`: one lacquer card; classify on pointerup and show the gesture's name in kanji and English (突く poke, 溜める charge, 弾く flick, 振る shake); the shake uses `devicemotion` (iOS permission requested with the first tap if `DeviceMotionEvent.requestPermission` exists, same tap-only rule as Task 4). **Step 5: Run** `npx vitest run` and `npx tsc --noEmit` → PASS. **Step 6: Commit** `feat(feel): F6 pull the cord and F8 gesture grammar`.

---

### Task 9: Ride and review

**Files:**
- Create: `scripts/probes/lab.js`
- Modify: `docs/ux/scorecard.md` (add the eight experiment rows, blank scores)

- [ ] **Step 1: Write the probe.** `scripts/probes/lab.js`, run at 375×667 with `?lab=1#<id>` for each experiment in the registry (read the ids from the list page): it waits for `.lab-stage`; fails on any uncaught error or `console.error`; checks every `button, [role=button]` in the page is at least 48×48 CSS px; checks `.lab-stage` has `touch-action: none`; checks nothing but the footer sits in the bottom 140 px; presses Back and checks the list returns. Expected: every experiment passes.
- [ ] **Step 2: Reduced-motion check.** With `&reduced=1`, open each experiment, run a pointer interaction, and assert no sound/vibration calls (stub `navigator.vibrate` and count) and that no GSAP tween is left running (`gsap.globalTimeline.getChildren().length` is 0 after 100 ms).
- [ ] **Step 3: The ride is unaffected.** Run the existing probes (`long-names`, `controls`, `silence`) and expect their earlier results (0/0, no overlaps, max gap ≤ 2 s). Run `npm run build`, compare the main chunk size with `main` (the lab must be a separate chunk) and record both in the report.
- [ ] **Step 4: Storyboard sheets.** Check that `docs/ux/experiments/F1…F8` each have the five fields (action, response, feeling, data, cost) and list the demo data they use.
- [ ] **Step 5: Full run.** `npx vitest run`, `npx tsc --noEmit`, `npm run build` all pass.
- [ ] **Step 6: Commit** `docs(lab): probe, scorecard rows and review fixes`. Then push the `ux-plan-1` branch (do not merge). The owner opens `<site>/?lab=1` on a phone from the branch preview or a local network dev server and scores the eight experiments.
