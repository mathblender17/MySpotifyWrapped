# Extended Streaming History: what's in it, what we can infer

Source: the Spotify "Extended streaming history" package. Checked against Spotify's
*Understanding your data* page, the ReadMe PDF in the ZIP, and a real export
profiled locally on 2026-10-25. No personal values are recorded here.

## The package

- `Streaming_History_Audio_<year>[_n].json`: one array per year. A big year is split into `_1`, `_2`…
- `Streaming_History_Video_<year>.json`: video podcasts. Same fields; music fields are null.
- `ReadMeFirst_ExtendedStreamingHistory.pdf`: field definitions in 60 languages.
- It covers the account's whole lifetime, unlike the account-data export, which covers one year.

## Fields

The 23 keys in a real row, against the 21 in the ReadMe:

| Field | What it is | App uses it | Notes from a real export |
|---|---|---|---|
| `ts` | UTC time the stream **ended** | yes | ISO `2026-10-23T12:51:18Z`, not the ReadMe's `YYYY-MM-DD hh:mm:ss`. Start ≈ `ts − ms_played` |
| `platform` | device / OS string | no | Free text that changes format over the years: `android`, `Windows 10 (10.0.19043; x64)`, `Android OS 8.1.0 API 27 (samsung, SM-G615F)`, `Partner SCEI sony_tv;ps4;…`, `web_player …`. Device **model** is sometimes included |
| `ms_played` | how long it played | yes | 0 for ~2% of rows. The median song play is ~2.9 min, and 30% of plays are under 30 s |
| `conn_country` | country code | no | `ZZ` = unknown |
| `ip_addr` | IP address | **no, never** | Named `ip_addr_decrypted` in the ReadMe. Thousands of distinct values. Sensitive: never read, store or send |
| `username` / `user_agent_decrypted` | — | — | In the ReadMe but **absent** from real rows |
| `master_metadata_track_name` | song title | yes | null on podcast rows |
| `master_metadata_album_artist_name` | artist | yes | This is the *album* artist: features don't count, compilations may say "Various Artists" |
| `master_metadata_album_album_name` | album | kept, unused | |
| `spotify_track_uri` | `spotify:track:<id>` | yes (as the key) | Stable ID: the same song across renames and re-releases |
| `episode_name`, `episode_show_name`, `spotify_episode_uri` | podcast episode / show / ID | no | Podcast rows are dropped today |
| `audiobook_title`, `audiobook_uri`, `audiobook_chapter_uri`, `audiobook_chapter_title` | audiobooks | no | Present as keys even when always null. Not in the ReadMe |
| `reason_start` | why it started | no | `trackdone` (auto-next), `fwdbtn`, `backbtn`, `clickrow` (picked from a list), `playbtn`, `appload`, `remote` (Connect), `trackerror`, `interrupted`, `unknown` |
| `reason_end` | why it ended | no | `trackdone` (finished), `fwdbtn` (skipped forward), `backbtn`, `endplay` (stopped / picked something else), `logout`, `remote`, `trackerror`, `unexpected-exit`, `unexpected-exit-while-paused`, `unknown` |
| `shuffle` | shuffle on | no | |
| `skipped` | skipped to the next song | yes | **Always false in older years** (about 2019–2021 in the profiled export): not recorded then. Use `reason_end = fwdbtn` as the skip signal for every year |
| `offline` | played offline | no | Sometimes null |
| `offline_timestamp` | when offline mode was used | no | Unix time, **milliseconds** in recent rows. About half the rows have it, offline or not |
| `incognito_mode` | private session | no | Respect it: see below |

## What we can extract directly

- **Volume:** plays, minutes, active days, per year / month / week / day / hour (all after converting to the listener's local time).
- **Rankings:** artists, tracks and albums by minutes or plays, for any period.
- **Lifetime:** first-ever play of any song or artist, years with an artist, the biggest day ever, the longest daily streak.
- **Devices:** phone vs computer vs console, and how that changed over the years.
- **Podcasts and video:** shows, episodes and hours.
- **Behaviour:** shuffle share, skip share, songs finished vs abandoned, offline and private-session plays.

## What we can infer (derived)

| Inference | How |
|---|---|
| **Sessions** | Gap > 30 min between plays starts a new session. Gives session count, median length and the longest session |
| **Intent: chosen vs served** | `reason_start ∈ {clickrow, playbtn}` = you picked it; `trackdone` = autoplay / playlist flow. "You choose 17% of what you play" |
| **Patience / attention span** | Share of songs that end `trackdone`; median seconds before a `fwdbtn` |
| **The song you can't skip** | Highest finish rate among tracks with ≥ N plays |
| **The artist you skip most** | Highest `fwdbtn` rate with ≥ 50 plays (an honest, playful stat) |
| **Obsession days** | One track played most times in one day |
| **Discovery curve** | New artists and new tracks per year (first-ever play). Shows exploring years vs comfort years |
| **Loyalty / "years together"** | Date you first heard this year's #1 artist |
| **Comebacks** | An artist with a gap of ≥ 1 year, then back in the top 20 |
| **Era shifts** | Top genre / language / artist per year as a timeline (genres need Last.fm) |
| **Clock** | Hour × weekday heatmap; night-owl share; "your listening peaks at 7 PM" |
| **Moving through life** | Device change over the years (an old phone retired, a PS4 era, a laptop era). Commute/home patterns from the hours |
| **Lifetime totals** | Hours since the first play; "that's N days of music" |
| **Language mix** | From the scripts in titles (Latin / Japanese / Devanagari / Georgian…). No API needed. Rough, since titles are often romanised |
| **Shuffle personality** | Shuffle share over the years (e.g. 11% → 88%) |

## Not in this package

- **Genres, popularity, audio features:** need Last.fm (genres) or other APIs.
- **Song length:** only `ms_played`, so "% of the song heard" needs a lookup. `trackdone` is the proxy.
- **Playlists, library, follows, searches, Wrapped data, inferences:** these come in the separate **Account data** package (still pending).
- **Song start time:** only end time, so start ≈ `ts − ms_played`.
- **Time zone:** `ts` is UTC. Convert with the browser's zone, the same assumption the app already makes.

## Rules for using it

- Drop `ip_addr`, `platform` model strings and `offline_timestamp` at parse time. Nothing derived from an IP (city, travel) is ever inferred or shown.
- Private-session plays (`incognito_mode: true`) were private on purpose. Exclude them from everything shown or shared (they're a tiny share).
- Plays under 30 s don't count as plays (Spotify's own threshold, already in the app). They still count for skip and attention stats.
- 0-ms rows and the few exact-duplicate `(ts, uri)` rows are noise: drop them.
