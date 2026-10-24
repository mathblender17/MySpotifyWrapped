import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  test: {
    environment: 'jsdom',
    // Spotify timestamps are UTC; a non-UTC zone makes the local-time conversion observable in tests.
    env: { TZ: 'Asia/Tokyo' },
  },
});
