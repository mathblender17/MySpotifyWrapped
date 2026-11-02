import { execSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';

// The commit this build was made from, shown on the landing page so a phone can prove which version it runs.
const build = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
})();

export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(build) },
  test: {
    environment: 'jsdom',
    // Spotify timestamps are UTC; a non-UTC zone makes the local-time conversion observable in tests.
    env: { TZ: 'Asia/Tokyo' },
  },
});
