// Turns your real extended-history ZIP into public/my-ride.json: only artist, track, end time, ms played and skipped.
// Never written: IP, platform/device, country, URIs, albums, podcasts, private-session plays.
// Usage: node scripts/strip-history.mjs fixtures/private/my_spotify_data.zip
import { readFileSync, writeFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';

const zip = unzipSync(new Uint8Array(readFileSync(process.argv[2] ?? 'fixtures/private/my_spotify_data.zip')));
const artists = [], artistIx = new Map(), tracks = [], trackIx = new Map(), plays = [], seen = new Set();
for (const [name, bytes] of Object.entries(zip)) {
  if (!/Streaming_History_Audio_.*\.json$/.test(name)) continue;
  for (const r of JSON.parse(strFromU8(bytes))) {
    const track = r.master_metadata_track_name, artist = r.master_metadata_album_artist_name;
    const t = Math.floor(new Date(r.ts).getTime() / 1000);
    if (typeof track !== 'string' || typeof artist !== 'string' || !(t > 0) || !(r.ms_played > 0) || r.incognito_mode) continue;
    const dup = `${t}|${r.spotify_track_uri}`;
    if (seen.has(dup)) continue;
    seen.add(dup);
    if (!artistIx.has(artist)) artistIx.set(artist, artists.push(artist) - 1);
    const key = r.spotify_track_uri ?? `${artist}\0${track}`;
    if (!trackIx.has(key)) trackIx.set(key, tracks.push([artistIx.get(artist), track]) - 1);
    plays.push([t, trackIx.get(key), r.ms_played, r.skipped === true ? 1 : 0]);
  }
}
plays.sort((a, b) => a[0] - b[0]);
writeFileSync('public/my-ride.json', JSON.stringify({ v: 1, artists, tracks, plays }));
console.log(`${plays.length} plays, ${tracks.length} tracks, ${artists.length} artists`);
