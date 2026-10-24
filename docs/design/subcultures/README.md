# Subculture theme exploration

Brainstorm log for the Japan theme. Each subculture is a slide style paired with the Wrapped stat it naturally fits. Open the HTML files in a browser. They're standalone, and you can click cards to highlight them.

| File | What |
|---|---|
| [round-0-first-directions.html](round-0-first-directions.html) | First 3 directions (Gyaru Deco, Shibuya Neon, Tabloid Manga). Rejected as not unique enough. |
| [round-1-gallery.html](round-1-gallery.html) | 20 subcultures across street, nightlife, everyday, sports/school, anime/games |
| [round-2-gallery.html](round-2-gallery.html) | 24 more: Harajuku, Shōwa retro, konbini/daily life, traditional, TV/otaku |
| [round-3-classic-japan.html](round-3-classic-japan.html) | 24 classic stereotypes: warriors/legends, postcard Japan, food, modern Tokyo |

## Core concept

**One story that tours Japan.** Each slide lives in a different subculture. Three.js carries the camera between worlds like a train ride, and gyaru "garble" (keitai gyaru-moji) is the connecting voice.

## Picks so far

Round 1, picked 2026-10-24:

| Subculture | Stat it carries |
|---|---|
| Ganguro / Yamanba (reverse gyaru) | Top genre |
| Keitai deco-mail (gyaru-moji) | Stats as text messages (the garbled voice) |
| Dekotora / Bosozoku | Loudest month |
| Idol / oshi-katsu | Most-replayed artist |
| Kōhaku year-end song battle | Top-2 artist showdown |
| Train / densha | Year picker (each year is a station) |
| TV weather / sakura forecast | Seasonal moods |
| Omikuji fortune slip | Listening personality and next-year fortune |
| Sumo banzuke | Artist rankings |
| Kōshien high-school baseball | Month-by-month genre battle |
| Shōnen manga | Top songs as a reader-poll ranking |
| JRPG status screen | Listener level and genres learned |
| Gacha pull | #1 song reveal |

Round 2, picked 2026-10-24:

| Subculture | Stat it carries |
|---|---|
| Super Sentai hero team | Top 5 artists as a squad (user note: "IFF", meaning unclear, to confirm) |
| Akihabara maid café | #1 artist reveal (omurice message) |
| Fighting game VS screen | This year vs last year |
| Kanji of the Year | Your year in one kanji |
| Kintsugi | A song you came back to after years. **Note: needs more organic, natural-looking cracks** |
| Summer matsuri | Song of the summer |
| Gashapon capsule toys | New artists discovered |
| Bento box | Genre breakdown |
| Vending machine | Genre mix as drinks |
| Konbini receipt | Top songs with play counts |
| Station stamp rally | Genres collected over the year |
| City-pop vinyl + obi | Oldest song / decades mix |
| Yankii / Sukeban | Obscurity score |
| Purikura photo strip | #1 song per season |

Round 3, picked 2026-10-24:

| Subculture | Stat it carries |
|---|---|
| Samurai scroll | Most-devoted song |
| Kaiju attack | The song that took over your year |
| Mecha cockpit HUD | Sync rate with #1 artist |
| Daruma doll | Milestones (e.g. the day you hit 10k minutes) |
| Mt. Fuji postcard | Peak week |
| Torii gate tunnel | Total days listened |
| Zen rock garden | Calmest listening moments |
| Kyoto maiko / geisha | Albums played front to back |
| Maneki-neko | Lucky discovery that became a top song |
| Senbazuru (1,000 cranes) | Liked-songs milestone |
| Izakaya | Friday-night / weekend sound |
| Kaiten conveyor sushi | Heavy-rotation songs and total tracks |
| Shibuya scramble | How common or rare your taste is |
| Shinkansen | Fastest-rising artist |
| Capsule hotel | Sleep / late-night listening |
| Salaryman commute | Commute listening |
| Haiku | Your year as a 5-7-5 verse |
| Taiko drums | Average tempo / energy |

**Total picked: 45 subcultures** (13 + 14 + 18).

## Story structure (approved 2026-10-24)

**Fixed main story plus extras.** Visual: [main-story.html](main-story.html)

| # | Slide | Stat |
|---|---|---|
| 1 | Train / densha | Opening: pick your year's station, the train departs |
| 2 | Torii gate tunnel | Days listened + total minutes |
| 3 | Bento box | Genre breakdown |
| 4 | Ganguro | Top genre |
| 5 | Sumo banzuke | Top 5 artists |
| 6 | Idol / oshi-katsu | #1 artist and devotion |
| 7 | Konbini receipt | Top 5 songs with play counts |
| 8 | Gacha pull | #1 song reveal |
| 9 | Weather / sakura | What you played each season |
| 10 | Mt. Fuji | Peak week |
| 11 | Shinkansen | Fastest-rising artist |
| 12 | Omikuji | Personality + next-year fortune |
| 13 | Kanji of the Year | Final share card |

- **Narrator:** keitai deco-mail gyaru-moji captions on every slide (not a separate slide).
- **All Years story anchors:** fighting-game VS, kintsugi, city pop, daruma, senbazuru.
- **Extras:** the other picks become optional "Tour more of Japan" bonus slides.

## Journey system (approved 2026-10-24)

See [../journey-storyboard.html](../journey-storyboard.html). It's one train ride through one year in Japan (spring → New Year's midnight), across 4 acts and 13 stations. It has 5 connecting threads (train line, seasons, gyaru guide, your soundtrack, stamped ticket) and 5 transition types (ride, match cut, phone interrupt, tease→reveal, breather).

## Data caveats (to settle in the spec)

Some mockup stats aren't in the user's own data. Before a slide relies on one, the spec must name its source or drop it:

- **Tempo/BPM, "bass-heavy", energy** (taiko, ramen): Spotify's audio-features API is closed to new apps. Needs another source (e.g. a third-party API) or the slide gets cut.
- **"X million others had the same #1"** (Shibuya scramble), **"0.4% of listeners know them"** (yankii): needs global data. Artist popularity/follower counts from the Web API are a possible proxy.
- **Saved/liked songs** (ninja, 1,000 cranes): in the account-data export (`YourLibrary.json`), not the streaming history.
- **Genres**: not in streaming history. Fetch per artist from the Web API.

## Open questions

- "Weibo culture": guessed visual kei, not confirmed.
- "Attracting culture": guessed idol / oshi-katsu, not confirmed.
