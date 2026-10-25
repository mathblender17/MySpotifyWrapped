# 音楽電車 Ongaku Densha: Alive Ride Spec (Music, Pacing, Phone Controls, Touch)

**Date:** 2026-10-25 · **Status:** awaiting review · **Builds on:** [2026-10-25-art-direction-design.md](2026-10-25-art-direction-design.md) (Art Plans 1 and 2, on `main`)

## 1. Why

After riding the finished art direction on a phone, the owner reported four problems:

1. **The music stops.** One song plays, then silence for a long stretch.
2. **Cards go too fast to read.**
3. **Cards are static** once they've appeared.
4. **Phones need visible, touchable UI.** This matters most.

The art direction stays as it is. The partial current year (2026) stays pickable; there is no later year to wait for.

### Causes found in the code

| Problem | Cause |
|---|---|
| Music stops | Songs are 30 s iTunes previews with no loop and no queue. Only stations 1, 6, 8, 11 and 13 start a song, so the ride goes silent after 30 s until the next of those stations |
| Too fast | Beats appear 0.35 s apart, then the card holds for a fixed 2.5 s. A text-heavy card is fully visible for about 3 s |
| Static | Every card animates in, then freezes for the whole hold |
| No phone UI | Navigation is invisible: tap zones (left third = back) and hold to pause. Nothing on a card can be touched except Departure's year rows |

## 2. Music: a non-stop mix

- **The mix queue.** Build a queue from the year's top 5 tracks plus `soundtrack.topArtistTrack` and `soundtrack.riserTrack`, without duplicates, in that order.
- **When a preview ends,** the next playable one in the queue crossfades in, using the existing 1 s fade. After the end of the queue, it wraps back to the start.
- **Stations with a `song`** (departure, torii, idol, gacha, shinkansen, kanji) switch to their song on arrival, as now. The mix carries on from the queue entry after that song.
- **Missing previews.** A track iTunes can't find is skipped. If no preview is found at all, the ride stays silent, as now.
- **Unchanged:** mute, pause/resume, iOS volume handling, and reduced motion (no music) work exactly as today.
- **Touch-played songs** (§5) play over the mix. When one ends, the mix resumes with its next track.

## 3. Pacing and cards that stay alive

- **Beat spacing:** `GAP` goes from 0.35 s to 0.6 s.
- **The hold is reading time.** It starts after the card's last beat:
  `hold = clamp(3 s + 0.25 s × words visible on the card, 6 s, 10 s)`.
  Words are counted from the slide's text at arrival.
- **The hold freezes** while a finger is on the card, while an interaction (§5) is in use, and while paused. It doesn't restart when the freeze ends; it continues.
- **Moving on sooner:** Next, a swipe or a tap still advances straight away.
- **Idle loops.** After a card's reveals finish, its world runs one quiet loop until the card leaves:

| World | Idle loop |
|---|---|
| F | The LED departure rows scroll |
| C | The sun disc slowly breathes (scale 1 → 1.03) |
| J | The halftone photo pans slowly |
| G | Glitter stars twinkle; the chrome sheen sweeps |
| D | The screentone drifts |
| Q | Cover lines shimmer |
| B | The two riso inks shift slightly out of register and back |
| K | Pixels twinkle; the cursor ▶ blinks |
| O | The sun hums: a 1 px wobble |
| I | The ink slowly bleeds (blur 0 → 0.6 px) |
| L | Sky clouds churn |

The loops are subtle: they never move text a reader is reading. They stop when the card leaves, and they don't run under reduced motion.

## 4. Phone controls

### Control strip

- **Placement:** a control strip in the dock band below the frame, beside the guide's phone, the ticket and the mute button. It never covers the card.
- **Buttons:** ◀ Back · ⏸/▶ Pause-Play · Next ▶. Each is a ≥ 48 px tap target, styled as an F wayfinding sign: a white circle with a thick `#00a7db` ring.
- **Accessibility:** every button has an `aria-label` and a visible focus ring.
- **While paused:** the timeline and hold freeze, the music fades out, and a 一時停止 · paused stamp appears on the card.
- **Tap zones stay:** tap the left third = back, the rest = forward, press and hold = pause. Taps on buttons or touchable elements (§5) never navigate.
- **Keyboard:** ← and → navigate, space pauses.

### First-ride hint

- On the first ride only, Departure shows 「タップ or スワイプ → tap or swipe」 with a finger icon sliding left.
- It hides on the first tap or swipe.
- It's remembered in `localStorage` (`ongaku:hinted`). If storage fails, it shows once per visit.

### Swipe

| Gesture | Action |
|---|---|
| Left | Next card |
| Right | Previous card |
| Down | Pause |

- A swipe counts after the finger travels more than 40 px, with the dominant axis deciding the direction.
- While dragging, the card follows the finger at 0.2× and snaps back if released before 40 px.
- Uses pointer events; the stage sets `touch-action: none`.

### Haptics

| When | Vibration |
|---|---|
| Each `stamp` or `drop` beat | 10 ms |
| Arriving at a station | 20 ms |
| Gacha SSR | [15, 40, 15] |

- Uses `navigator.vibrate`, which only Android supports; iPhones get no vibration.
- Haptics are off under reduced motion and while muted (the mute button silences sound and vibration together).

## 5. Touch the card

Each station gets one interaction made from its real data.

**Shared rules:**
- **Discoverability:** a small pulsing dot marks the touchable element and disappears after the first touch on that card.
- **Hold:** the hold freezes during use.
- **Size and placement:** each target is at least 48 px and sits in the middle of the card, away from the control strip.
- **Reduced motion:** the interaction still works; its animation becomes instant.
- **Fallback:** if an interaction can't run, the card behaves as today.

| # | Station | Touch | Result |
|---|---|---|---|
| 1 | Departure | Tap a year row | Picks the year (exists). Adds a press state and haptic |
| 2 | Torii | Tap the hero number | Recounts from 0; the minutes band toggles between minutes and hours |
| 3 | Bento | Tap a genre row | The row lifts out and shows its share as a bar *(only with genres)* |
| 4 | Ganguro | Tap the flip phone | Flips open to the top genre's #1 artist *(only with genres)* |
| 5 | Sumo | Tap a rank panel | Zooms that panel to a splash with the artist's minutes; ドン thump |
| 6 | Oshi | Tap the cover | Plays `topArtistTrack`; sticker "♪ now playing" |
| 7 | Konbini | Tap a receipt line | Plays that track; the line gets a 再生中 stamp |
| 8 | Gacha | Tap the machine | Pulls again: reveals tracks #2–#5 one at a time with rarities SR, R, R, N |
| 9 | Forecast | Drag the sun | Snaps across the four seasons; each stop shows that season's top artist and value |
| 10 | Fuji | Drag along the ridge | The marker follows and shows that week's start date and value; the peak keeps its seal |
| 11 | Shinkansen | Tap the beast | Shakes, plays a synthesised rumble, and plays `riserTrack` |
| 12 | Omikuji | Tap the box (shake as a bonus) | The slip shakes out. Always the same fortune, since it's computed from the data |
| 13 | Kanji | Tap the ticket | Flips to show every stamp and the ride date |

**Notes:**
- **Shake** uses `devicemotion`. iOS asks for permission on the first tap, and tapping always works on its own.
- **Bento and Ganguro** only show their interactions when genres exist.

## 6. Build split

| Plan | Delivers |
|---|---|
| **Alive Plan A: the ride** | §2 music mix, §3 pacing and idle loops, §4 controls, hint, swipe and haptics. Ends with a phone ride by the owner |
| **Alive Plan B: touch** | §5, all 13 interactions |

## 7. What stays the same

- The art direction, stats, station order, transitions and morphs, the 3D world, and data sources.
- Every earlier constraint: real numbers only, files stay on the device, no Spotify branding, reduced motion respected.
- Only the artist and track name leave the device, for iTunes lookups.

## 8. Acceptance

- **Music:** a full ride on demo data never has more than 2 s of silence while unmuted and unlocked, with mocked previews that each last 30 s.
- **Reading time:** on every station, the hold is between 6 and 10 s and grows with word count.
- **Controls:** Back, Pause and Next work by touch, mouse and keyboard; swipes left, right and down behave as specified; nothing in the control strip overlaps the card at 375×667 or 390×844.
- **Reduced motion:** no idle loops, no haptics, no music, and interactions are instant.
- **Tests:** all existing behaviour tests stay green; each new behaviour gets a test.
- **Owner check:** a phone ride after each plan.

## 9. Risks

- **Longer ride.** At about 8 s per card plus transitions, a ride takes about 2–2.5 minutes. Mitigation: swipe and Next are always available, and the hold is capped at 10 s.
- **Gesture conflicts.** Taps, swipes, press-and-hold and touchable elements all share one surface. Mitigation: one pointer handler decides in this order: control or touchable element, then swipe (> 40 px), then hold (> 200 ms), then tap.
- **iOS limits.** No vibration, and shake needs a permission prompt. Both are optional by design.
