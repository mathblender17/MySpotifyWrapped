# Ongaku Densha Phase 2b (The 3D World) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put one persistent Three.js "Japan" behind the Phase-2a journey. The camera rides a train track from district to district; the season, sky and particles change with the story. Rides become real train rides you watch happen.

**Architecture:**
- **The world is a separate unit.** `src/world/` owns renderer, scene, camera, track, season dial and districts. It knows nothing about slides.
- **The player tells the world where to be:** `world.travel(from, to)` returns a GSAP timeline that the player adds to the master timeline; `world.jump(i)` is for going back.
- **Slides stay HTML on top.**
- If WebGL is missing, `createWorld` returns `null` and the app runs exactly as Phase 2a.

**Tech Stack:** Phase 2a + `three@0.186` (ES modules, tree-shaken). No model files; every object is built in code.

**Spec:** [docs/superpowers/specs/2026-10-24-ongaku-densha-design.md](../specs/2026-10-24-ongaku-densha-design.md) §7 (world), §6 (journey). Storyboard: [docs/design/journey-storyboard.html](../../design/journey-storyboard.html).

**Branch:** `phase-2b-world` (from `main` at `2f69f79`).

## Key UX decision: when you see the world

On a phone the 9:16 slide fills almost the whole width, so a world that only sits *behind* the slide would barely show. So:

- **Rides reveal the world.** On a `ride` transition the outgoing slide shrinks into a card and flies off. The camera then travels the track for **1.6 s** at full screen (the district passing by, the season changing), and the incoming slide drops in at the next station.
- **The breather is the world:** the train-window overlay from 2a is replaced by 2.6 s of real travel.
- **Slides become glass.** Each slide's background is drawn at 88% opacity with a 6 px backdrop blur, so the current district glows through at the edges.
- Cuts, phone slams and teases stay fast HTML moments; the camera glides to the next station behind them.

## Global Constraints

- Every Phase 1/2a constraint still holds (real numbers only, files stay on device, no Spotify branding, `#ff2d95`, reduced motion, taps, sound unlock).
- **Pixel ratio:** `min(devicePixelRatio, 2)`.
- **Adaptive quality:**
  - Average frame time over 2 s above 22 ms (below ~45 fps) → step 1: particles halved, bloom off.
  - Still slow → step 2: pixel ratio 1.
  - Never steps back up within a session.
- **No downloaded models or textures:** geometry, colours and gradients only. The three.js chunk is lazy-loaded (`import()`), so the landing page stays light.
- **Rendering stops** while the story is paused, the tab is hidden, or the story is destroyed (`renderer.setAnimationLoop(null)`), and resumes on return.
- **Reduced motion:** the camera never travels. It cuts to each station, rides use the 2a crossfade, and there are no particles.
- **No WebGL** (context creation fails): the 2a experience runs unchanged, with no error shown.

## Review Focus

1. **WebGL context lost mid-ride** (mobile Safari does this under memory pressure). Expected: the story keeps going on the 2a fallback, and no exceptions loop (test in Task 1).
2. **Rapid taps during a 1.6 s world ride.** Expected: the first tap snaps the camera to the destination; nothing is left half-built (test in Task 5).
3. **Picking another year.** Expected: the old world is disposed (geometries, materials, renderer, listeners); there's no second canvas and no growing GPU memory (test in Task 1/3).
4. **Very small or very wide screens.** Expected: the camera's aspect follows resize, and slide glass still lines up with the frame (test in Task 1).
5. **Going back across several districts.** Expected: the camera jumps; districts outside the window are disposed and rebuilt on demand (test in Task 3).

---

## File Structure

```
src/world/world.ts       createWorld(container, opts) → World | null; render loop, resize, context loss
src/world/track.ts       the track spline + station positions
src/world/season.ts      season dial: sky, fog, light, particles
src/world/districts.ts   district registry + lazy build/dispose window
src/world/kit.ts         small low-poly builders (torii, lantern, box building, cone, viaduct…)
src/world/quality.ts     frame-time monitor → quality steps
src/story/player.ts      + world.travel / world.jump in the master timeline
src/journey/transitions.ts  ride: card fly-off / drop-in around the world ride; breather uses world
src/slides/slides.css    glass backgrounds
src/main.ts              lazy-load the world, pass it to createStory
```

---

### Task 1: World core: renderer, camera, track, lifecycle

**Files:**
- Create: `src/world/world.ts`, `src/world/track.ts`
- Modify: `package.json` (`npm i three`, `npm i -D @types/three`)
- Test: `tests/world/track.test.ts`, `tests/world/world.test.ts`

**Interfaces:**

```ts
// track.ts
export const TRACK_POINTS: [number, number, number][];   // control points, ~14, gently curving, y = 0
export function stationT(i: number): number;              // 0..1 along the curve for station i (0..12), strictly increasing
export function trackFrame(t: number): { pos: THREE.Vector3; look: THREE.Vector3 }; // camera eye 2.2 above rail, looking 0.02 ahead

// world.ts
export type World = {
  travel(from: number, to: number, seconds: number): gsap.core.Timeline; // paused; moves camera stationT(from)→stationT(to)
  jump(i: number): void;
  setSeason(dial: number): void;     // 0 spring … 1 New Year
  pause(): void; resume(): void;
  destroy(): void;
  readonly canvas: HTMLCanvasElement;
};
export function createWorld(container: HTMLElement, opts: {
  reduced: boolean;
  onLost?: () => void;
  makeRenderer?: (canvas: HTMLCanvasElement) => THREE.WebGLRenderer;
}): World | null;
```

- `createWorld` returns `null` if the renderer throws, or if `canvas.getContext('webgl2')` is null.
- On `webglcontextlost`, it calls `opts.onLost?.()` once and stops rendering. The player then drops the world and continues the 2a way.
- From Task 3 on, `travel(from, to)` and `jump(i)` also call the district window's `focus(to)` at their start, so the destination district exists before the camera arrives.
- `travel` with `reduced` sets the camera at the destination and returns a 0-duration timeline.

- [ ] **Step 1: Write the tests**
  - `stationT` is strictly increasing over 0–12, with `stationT(0) === 0` and `stationT(12) === 1`.
  - `trackFrame(t).pos.y` is about 2.2, and `look` is ahead of `pos` along the curve.
  - `createWorld` with a `makeRenderer` that throws returns `null`.
  - With a fake renderer object (records `setSize`, `setPixelRatio`, `setAnimationLoop`, `dispose`):
    - `travel(1, 4, 1.6)` has duration 1.6, and `progress(1)` puts the camera at `trackFrame(stationT(4)).pos`;
    - `destroy()` calls `dispose`, sets the animation loop to null, removes the canvas, and removes the resize listener (a resize after destroy doesn't call `setSize`);
    - the context-lost event calls `onLost` once;
    - a resize updates `camera.aspect`.
- [ ] **Step 2:** Run `npx vitest run tests/world`. Expected: FAIL.
- [ ] **Step 3:** Implement. `PerspectiveCamera(55)`. The render loop goes through `renderer.setAnimationLoop`. `pause`/`resume` toggle the loop. `document.visibilitychange` pauses while hidden.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(world): renderer, track and lifecycle`.

---

### Task 2: Season dial

**Files:**
- Create: `src/world/season.ts`
- Test: `tests/world/season.test.ts`

**Interfaces:**
- `export function seasonLook(dial: number): { sky: [string, string]; fog: string; light: string; particle: 'sakura'|'haze'|'leaf'|'snow'; density: number }`
- `export function createSeasonFx(scene, opts: { reduced: boolean; count: number }): { set(dial: number): void; tick(dt: number): void; setCount(n: number): void; dispose(): void }`

**Stops** (dial = (act − 1) / 3; colours blend linearly between stops; the particle type switches at the midpoint between stops):

| dial | sky top → bottom | fog | light | particle |
|---|---|---|---|---|
| 0 (spring) | `#ffd6e8` → `#ffeef5` | `#f7d9e6` | `#fff1f6` | sakura (pink quads) |
| 0.33 (summer) | `#ff9a3d` → `#ffe2a8` | `#ffcf8f` | `#fff3d6` | haze (rising pale dots) |
| 0.66 (autumn) | `#b8461f` → `#f4a261` | `#c9734a` | `#ffd7b0` | leaf (orange quads, spin) |
| 1 (New Year) | `#0d1030` → `#1a1f4a` | `#141838` | `#9fb4ff` | snow (white dots) |

- The sky is a large back-sided sphere with a two-colour vertical gradient (`ShaderMaterial`, 2 uniforms).
- Particles are one `THREE.Points` of `count` (default 600), wrapped in a box around the camera.

- [ ] **Step 1: Write the tests**
  - `seasonLook(0).particle` is `'sakura'` and `seasonLook(1).sky[0]` is `'#0d1030'`.
  - `seasonLook(0.165).fog` is the midpoint blend of spring and summer (compare as hex).
  - `createSeasonFx` with `reduced:true` adds no `Points` to the scene.
  - `setCount(300)` halves the points' draw range.
  - `dispose` disposes the geometry and material.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(world): season dial`.

---

### Task 3: District registry and lazy window

**Files:**
- Create: `src/world/districts.ts`, `src/world/kit.ts`
- Test: `tests/world/districts.test.ts`

**Interfaces:**
- `export type District = (at: THREE.Vector3, along: THREE.Vector3) => THREE.Group` (builds beside the track at a station; `along` is the track direction)
- `export const DISTRICTS: Record<string, District>`
- `export function createDistrictWindow(scene: THREE.Scene, stationIds: string[]): { focus(i: number): void; dispose(): void; readonly built: number[] }`
  - Keeps stations `i-1, i, i+1` built and disposes the rest (all geometries and materials in the group).

**Kit** (`kit.ts`), small builders returning meshes with flat `MeshLambertMaterial` colours:
- `torii(color)`
- `lantern(color)` (emissive)
- `building(w, h, d, color, windowsColor?)`
- `sign(text?)` (a coloured quad, emissive)
- `cone(r, h, color, capColor?)` (Fuji)
- `viaduct(len)`
- `stall(color)`
- `ring(r)` (dohyō)
- `instanced(geo, mat, matrices)`
- `stars(n)`

Shared geometries are cached and reused; materials are cached by colour.

- [ ] **Step 1: Write the tests**
  - `DISTRICTS` has a builder for each of the 13 station ids.
  - Each builder returns a `Group` with at least one `Mesh` or `InstancedMesh`.
  - `focus(5)` builds exactly 4, 5, 6.
  - `focus(9)` then builds 8, 9, 10 and disposes 4, 5, 6 (spy on `geometry.dispose`/`material.dispose`, or check that the window's tracked groups are removed from the scene).
  - `focus(0)` builds 0 and 1 only.
  - After `dispose()` the scene has no district groups.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement the registry with simple placeholder builders (one kit piece each) so the tests pass. Real art comes in Task 4.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(world): district registry with lazy build/dispose`.

---

### Task 4: Build the 13 districts

**Files:**
- Modify: `src/world/districts.ts`

Each district is a low-poly scene beside the track, about 40 units long, using the kit:

| Station | District |
|---|---|
| departure | Station platform: long grey slab, roof on posts, orange LED board quad, line-colour stripe, vending machines (boxes, emissive fronts) |
| torii | Tunnel of 60 instanced vermilion torii over the track, hillside cones |
| bento | Lacquered red box building with a white "rice" roof, noren quads |
| ganguro | Shibuya street: tall buildings with emissive pink/cyan signs, a crossing of white stripes |
| sumo | Arena: square roof on posts over a sand-coloured `ring`, hanging tassels (4 coloured cylinders) |
| idol | Stage: truss frame, 200 instanced penlight sticks in 5 colours, spotlights (cones, additive) |
| konbini | Corner store: white box, green/orange stripe, bright emissive glass front, lone streetlight |
| gacha | Arcade: rows of capsule machines (box + sphere dome), neon sign quads |
| weather | Countryside: rice-field planes, rolling hills, a TV-tower lattice |
| fuji | Big snow-capped `cone` on the horizon, lake plane, cherry trees (cone + sphere) |
| shinkansen | Elevated `viaduct` along the track; the camera passes over it, poles and wires |
| omikuji | Shrine: torii, haiden roof, ema rack, stone lanterns |
| kanji | Temple bell tower (bonshō cylinder under a roof), snow-covered ground, 108 small lanterns |

- [ ] **Step 1:** Implement each district using the kit. Keep every district under 300 draw-call-equivalent objects (instancing for repeats).
- [ ] **Step 2:** Run `npx vitest run tests/world`. Expected: PASS (Task-3 tests still hold).
- [ ] **Step 3: Browser check** with a dev route `?world=1&station=N`, a world-only view with no slides, that frames each district. Look at all 13. Record per-district `renderer.info.render.calls` and `triangles` in the ledger. Calls must be ≤ 150.
- [ ] **Step 4:** Commit with `feat(world): build the 13 districts`.

---

### Task 5: Player integration: the world ride

**Files:**
- Modify: `src/story/player.ts`, `src/journey/transitions.ts`, `src/slides/slides.css`, `src/story/story.css`, `src/main.ts`
- Test: `tests/story/world-ride.test.ts`

**Interfaces:**
- `createStory` opts gain `world?: World | null`.
- `TransitionOpts` gains `world?: { travel(from, to, s): gsap.core.Timeline }` plus `from`/`to` indices.

**Behaviour:**

| Transition | With a world |
|---|---|
| `ride` | (1) `out` scales to 0.7 and flies up and out (0.4 s); (2) `world.travel(from, to, 1.6)`; (3) `in` drops from above to rest (0.5 s). Total 2.5 s. Without a world, unchanged 2a ride |
| `breather` | `out` fades (0.3 s), `world.travel(from, to, 2.6)`, `in` fades in (0.3 s). The 2a window overlay is not used |
| `cut` / `baton` / `phone` / `tease` / `title` | Unchanged, plus `world.travel(from, to, duration)` in parallel, so the camera arrives as the slide does |
| `prev` (back) | `world.jump(i)` |

- Every arrival calls `world.setSeason((act − 1) / 3)`.
- `pause`/`resume`/`destroy` pass through to the world.
- An `onLost` callback sets `world = null` for the rest of the story.

**Glass slides:** every `.ph` background colour gets 88% alpha and `backdrop-filter: blur(6px)`, so the world glows through. The landing page is unaffected.

**main.ts:**
- `const { createWorld } = await import('./world/world')` once a ride starts. The landing page doesn't load three.
- A full-screen `.world` container is placed behind the story.
- On year pick or `ride()` restart, the old world is destroyed before the new one is created.

- [ ] **Step 1: Write the tests** (fake world recording calls; GSAP driven like the player tests)
  - A ride from torii to sumo calls `travel(1, 4, 1.6)`, and the master timeline is about 0.9 s longer than without a world.
  - Back calls `jump`.
  - Arriving at sumo calls `setSeason(1/3)`.
  - Destroying the story calls `world.destroy`.
  - `onLost` mid-ride: the ride still completes and later stations don't call `travel`.
  - A tap mid-ride finishes it: the world's travel timeline is at progress 1 and only one slide is in the frame.
  - Breather calls `travel` with 2.6 and creates no `.window` overlay.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx vitest run`. Expected: all PASS.
- [ ] **Step 5:** Commit with `feat(story): ride through the 3D world`.

---

### Task 6: Adaptive quality

**Files:**
- Create: `src/world/quality.ts`
- Modify: `src/world/world.ts`
- Test: `tests/world/quality.test.ts`

**Interfaces:**
- `createQuality(onStep: (level: 1 | 2) => void, windowMs = 2000, budgetMs = 22): { frame(dtMs: number): void; readonly level: 0 | 1 | 2 }`
  - Steps up at most once per window and never comes back down.
- The world wires level 1 to `seasonFx.setCount(count / 2)` and level 2 to `renderer.setPixelRatio(1)`.

- [ ] **Step 1: Write the tests**
  - Frames averaging 16 ms keep level 0.
  - A 2 s window averaging 30 ms gives level 1.
  - Another slow window gives level 2.
  - Further slow windows stay at 2.
  - Fast frames after a step don't step back.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit with `feat(world): adaptive quality`.

---

### Task 7: Ride it

- [ ] Ride the demo end to end at 375×812 and at desktop size, with auto-advance only.
  - Log from inside the page each `travel` call, season changes, and quality level.
  - Check the camera arrives at every station, rides show the world for their full 1.6 s, and the breather is a real ride.
- [ ] Measure `renderer.info.render.calls`/`triangles` along the ride (≤ 150 calls everywhere) and record them.
  - The preview pane is throttled to ~2 fps, so frame timing measured there is not meaningful: say so, and ask the owner to ride once on a real phone.
- [ ] Context-loss drill: call `WEBGL_lose_context.loseContext()` mid-ride. The story continues on the 2a path and the console shows no error loop.
- [ ] Reduced motion (`?reduced=1`): the camera cuts, there are no particles, and no travel.
- [ ] Year re-pick: still exactly one `<canvas>`, and the old world was destroyed (log).
- [ ] Bundle: the landing page's JS doesn't include three. The world chunk is loaded on ride start (check `dist/assets` names and sizes after `npm run build`).
- [ ] Commit fixes with `fix: polish from 3D ride-through`.
