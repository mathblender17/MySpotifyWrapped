# 音楽電車 Ongaku Densha: UX Experience Spec (Feel, Story, Return)

**Date:** 2026-11-01 · **Status:** awaiting review · **Builds on:** [2026-10-25-alive-ride-design.md](2026-10-25-alive-ride-design.md) (controls, swipe, haptics, touch cards, on `main`) and [2026-10-25-art-direction-design.md](2026-10-25-art-direction-design.md)

## 1. Why

The ride works, looks the part and is tested on a phone. The owner wants the experience itself to be out of this world: a recap that feels like a physical object, tells a story, and gives people a reason to come back at any time of year.

Figma is off the table (its free tool limit blocks any work, and the owner won't pay). A Penpot mock-up showed the second problem with design tools: a clickable mock-up only turns pages. It can't drag, tilt, vibrate, play sound or use real data, which is where the experience lives. So the experience is designed and tested **in code, on a phone**, the way people did before design tools: storyboard on paper, then a playable prototype, then a verdict.

## 2. Method: the UX lab

1. **Storyboard sheet per idea.** A short text file in `docs/ux/experiments/`: what the rider does, what the screen does, what they should feel, what real data it uses, and what it costs (CPU, battery, size). A weak idea is cut here.
2. **The lab route.** Opening the app with `?lab=1` lists the experiments. Each is its own file in `src/lab/`, runs on demo data and uses the same engine, kit and styles as the ride, so a winner moves into the ride without a rewrite. The lab is a normal part of the build on `main`; only the URL flag shows it.
3. **The phone test loop.** Build an experiment, publish, the owner plays it on a phone, scores it, and it is kept, tuned or killed. Scores go in `docs/ux/scorecard.md` with the date and device.
4. **Score.** Three numbers per experiment, 0 to 3 each: **goosebumps** (did it feel special), **clarity** (did they know what to do without being told), **speed** (did it stay smooth). Keep an experiment when goosebumps is at least 2 and clarity and speed are at least 2.

### Guardrails (never bend)

- Real numbers only; a beat with no data behind it doesn't appear.
- Reduced motion, mute and a "no vibration" state are respected everywhere.
- Every tap target is at least 48 px; nothing the rider needs sits in the control strip.
- A mid-range phone stays at 60 frames per second; an experiment that drops below that is tuned or cut.
- Nothing about the rider's listening leaves their device. The only network call stays the artist and song name to find a preview.
- No Spotify name or logo anywhere.
- Anything not finished says "in development" in the UI.

## 3. Layer 1: Feel (the ride is a physical object)

Eight experiments. Each is built in the lab first.

| # | Experiment | What it is |
|---|---|---|
| F1 | **Momentum train** | A swipe carries the ride with inertia: a flick rattles through stations, a slow drag scrubs. It settles into each stop on a spring with a rail "clack" (sound, plus vibration on Android) |
| F2 | **Tilt world** | The art layers of each scene shift with the phone's tilt, so the paper-cut depth becomes real parallax. iOS asks a one-time permission on the first tap; without it the scene is still |
| F3 | **Stamp punch** | On the ticket, press and hold: vibration ramps while it charges; on release the stamp slams down with an ink splat and a small screen shake |
| F4 | **Sound beds** | Each world gets a short ambience synthesised in the browser (wind at the torii, the konbini door chime, the gacha crank ratchet), ducked under the song mix. No sound files |
| F5 | **Heavy numbers** | Hero numbers tick up with an overshoot and settle with a bounce when the phone is tilted |
| F6 | **Pull the cord** | Pulling down rings a "next stop" bell; the first and last stops stretch like elastic |
| F7 | **Speed from the finger** | Swipe speed drives speed lines and camera shake |
| F8 | **One gesture grammar** | Tap pokes, hold charges, flick moves, shake surprises, the same on every card; riders learn by doing |

**Notes:** iPhones can't vibrate from a web page, so sound and motion carry those moments on iOS. All motion, tilt and sound switch off under reduced motion, and sound under mute.

## 4. Layer 2: Story (the ride has a plot)

| # | Experiment | What it is |
|---|---|---|
| S1 | **The conductor** | The gyaru guide comments on what the rider really did. Each line is chosen by a rule on the data and fires only when it holds |
| S2 | **Plot twists** | Surprise beats computed from the history: biggest obsession day, the song never skipped and the artist always skipped, the artist who came back after a year away, the longest daily streak |
| S3 | **Boarding ritual** | The rider punches the ticket to start; every arrival stamps it; the final ticket is unique, with the kanji of the year |
| S4 | **Passengers** | Small figures in the train windows stand for the top artists, so the carriage is a diorama you look into |
| S5 | **Easter eggs** | Hidden touches: tap the torii seven times, hold Fuji, ride after midnight for different lighting |
| S6 | **Personalised endings** | The last scene follows the listening type: a night owl's dawn, an explorer's open road, a loyalist's home station |
| S7 | **Chapters** | Four acts with title cards, as in the art direction |

**Data rules:** twists need the full extended history. With a smaller export a twist that can't be computed is skipped, never replaced by a made-up one. Private-session plays are excluded. Demo data shows a clearly labelled sample story. The statistics follow [docs/data/extended-history-catalogue.md](../../data/extended-history-catalogue.md).

## 5. Layer 3: Return (a reason to ride again)

| # | Experiment | What it is |
|---|---|---|
| R1 | **Rides for any period** | A ride menu: this year, this season, last 30 days, on this day. Short periods give shorter rides of about five stops |
| R2 | **Ticket book** | An album stored on the phone: tickets, stamps and past rides, with seasonal ticket designs and stamp sets to complete. Only totals are kept (minutes, plays, top artist), never the listening data |
| R3 | **Live sky** | The world matches the real time of day and season |
| R4 | **Share cards** | A vertical card (kanji plus a mini ticket) saved as an image, drawn on the device. This is the announced "share feature"; it ships after Feel and Story |
| R5 | **Friend duet** | Two riders swap a short code of totals, and the ride shows where their tastes overlap. Last, and only if the other layers land |
| R6 | **Feels like an app** | Installable to the home screen and works offline. No notifications; a quiet "new month ready" badge appears on return |

**Privacy:** the ticket book and share codes carry totals only. A share code never contains song names beyond the top few the rider chose to show. Everything is stored in the browser and can be cleared in one tap.

## 6. Build split

| Plan | Delivers | Ends with |
|---|---|---|
| **UX Plan 1: Lab and Feel** | The `?lab=1` shell, scorecard, and F1 to F8 as experiments, then winners moved into the ride | A phone test and scores |
| **UX Plan 2: Story** | S1 to S7, the data rules and the story engine | A phone test and scores |
| **UX Plan 3: Return** | R1 to R6 | A phone test and scores |

Each plan is written and approved on its own, after the previous one is scored.

## 7. What stays the same

The art direction, stations and order, stats, the 3D world, the touch interactions, the music mix, the data sources and every earlier constraint. This spec adds layers; it replaces none.

## 8. Acceptance

- **Lab:** `?lab=1` lists every experiment; each runs on demo data and works on a phone with touch only.
- **Scores:** every experiment that reaches the ride has a scorecard line with goosebumps, clarity and speed all at least 2.
- **Performance:** no kept experiment drops a mid-range phone below 60 frames per second in the ride.
- **Accessibility:** reduced motion, mute and no-vibration each switch their features off; every control stays at least 48 px.
- **Data:** a story beat or ride never shows a number the data doesn't support; the ticket book and share codes contain totals only.
- **Tests:** all existing tests stay green; each new behaviour gets a test.
- **Owner check:** a phone test after each plan.

## 9. Risks

- **Too much at once.** Mitigation: three plans, each ending in a score, and the lab makes it cheap to kill an idea.
- **Phone limits.** iPhones don't vibrate and need a permission for tilt; low-end phones may not hold 60 frames. Mitigation: every experiment has a sound-and-motion fallback and a performance check before it is kept.
- **Data-gated story.** Plot twists need the full history, so a smaller export gets a plainer story. Mitigation: skip, never fake, and say what a fuller export would add.
- **Scope creep from the share and duet ideas.** Mitigation: both come last and are marked "in development" in the UI until real.
- **A long ride.** More beats lengthen the ride. Mitigation: the existing hold-time rules stay, and any beat can be skipped with Next.
