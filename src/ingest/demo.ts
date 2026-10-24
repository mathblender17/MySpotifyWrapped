import type { Play } from '../types';

// Fictional artists only: the demo is shown publicly and must not pass off invented numbers for real people.
const GIVEN = ['Aoi', 'Ren', 'Yuki', 'Haru', 'Sora', 'Mio', 'Kaito', 'Nana', 'Riku', 'Emi', 'Taiga', 'Hana'];
const FAMILY = ['Kaze', 'Mori', 'Takeda', 'Sakura', 'Kuro', 'Umi', 'Tsuki', 'Ishida', 'Neon', 'Akagi'];
const WORDS = ['Neon', 'Rain', 'Last', 'Train', 'Paper', 'Crane', 'Summer', 'Ghost', 'Midnight', 'Konbini', 'Sakura', 'Static',
  'Signal', 'Shibuya', 'Moon', 'Arcade', 'Lantern', 'Echo', 'Velvet', 'Tokyo', 'Drift', 'Gold', 'Cassette', 'Bloom'];
const RISER = 'Hoshino Rei';
const SEASONS = 4;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(rng: () => number, weights: number[]): number {
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) if ((r -= weights[i]) < 0) return i;
  return weights.length - 1;
}

// Commute mornings and late nights are heavy, the small hours nearly silent.
const HOUR_WEIGHTS = Array.from({ length: 24 }, (_, h) =>
  (h >= 7 && h <= 9) || h >= 20 || h === 0 ? 3 : h >= 2 && h <= 5 ? 0.2 : 1);

/** A deterministic, realistic two-year listening history (2024 light, 2025 heavy) for demos and dev. */
export function makeDemoPlays(): Play[] {
  const rng = mulberry32(20251231);
  const artists: string[] = [];
  for (let i = 0; artists.length < 119; i++) {
    const name = `${GIVEN[i % GIVEN.length]} ${FAMILY[Math.floor(i / GIVEN.length) % FAMILY.length]}`;
    if (name !== RISER && !artists.includes(name)) artists.push(name);
  }
  artists.push(RISER);
  const riserIdx = artists.length - 1;
  const tracks = artists.map(() =>
    Array.from({ length: 6 }, () => `${WORDS[Math.floor(rng() * WORDS.length)]} ${WORDS[Math.floor(rng() * WORDS.length)]}`));
  const favSeason = artists.map(() => Math.floor(rng() * SEASONS));
  const zipf = artists.map((_, i) => 1 / (i + 1) ** 1.1);
  const riserStart = new Date(2025, 4, 3);

  const plays: Play[] = [];
  for (const [year, perDay] of [[2024, 11], [2025, 25]] as const) {
    for (let d = new Date(year, 0, 1); d.getFullYear() === year; d.setDate(d.getDate() + 1)) {
      const season = Math.floor(((d.getMonth() + 10) % 12) / 3); // Dec–Feb → 3, Mar–May → 0 …
      const hotWeek = year === 2025 && d.getMonth() === 2 && d.getDate() >= 10 && d.getDate() <= 16;
      const count = Math.round(perDay * (0.5 + rng()) * (hotWeek ? 2.2 : 1));
      const daysSinceRiser = (d.getTime() - riserStart.getTime()) / 86_400_000;
      const weights = zipf.map((w, i) => {
        if (i === riserIdx) return daysSinceRiser >= 0 ? Math.min(0.6, 0.03 * (daysSinceRiser + 1)) : 0;
        return i < 20 && favSeason[i] === season ? w * 2.5 : w;
      });
      for (let n = 0; n < count; n++) {
        const a = pickWeighted(rng, weights);
        const t = Math.floor(rng() * 6);
        const ts = new Date(d);
        ts.setHours(pickWeighted(rng, HOUR_WEIGHTS), Math.floor(rng() * 60), Math.floor(rng() * 60));
        const skipped = rng() < 0.12;
        plays.push({
          ts,
          track: tracks[a][t],
          artist: artists[a],
          msPlayed: skipped ? 5000 + Math.floor(rng() * 24_000) : 150_000 + Math.floor(rng() * 110_000),
          skipped,
          trackKey: `demo:${a}:${t}`,
        });
      }
    }
  }
  return plays.sort((a, b) => a.ts.getTime() - b.ts.getTime());
}
